import { deflateRawSync } from 'node:zlib'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  deriveStructure,
  emitSource,
  parseSource,
  reanchor,
  renderExtractedMarkdown,
  sectionIdOf,
  slugify,
} from '../src/ingest/index.ts'
import { describeDegradation, ingestDirectory, ingestSource } from '../src/ingest/pipeline.ts'
import { listZipEntries, readZipText } from '../src/ingest/zip.ts'
import {
  VaultContainmentError,
  containedPath,
  ensureVaultLayout,
  isVaultRoot,
  readAllStructures,
  readManifest,
  readStructure,
  resolveTopicVault,
  type TopicVault,
} from '../src/topic-vault.ts'

/** Build a stored-or-deflated zip so the OOXML parsers can be tested for real. */
function makeZip(files: readonly { name: string; content: string }[]): Uint8Array {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8')
    const raw = Buffer.from(file.content, 'utf8')
    const compressed = deflateRawSync(raw)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    locals.push(local, name, compressed)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(8, 10)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, name)
    offset += local.length + name.length + compressed.length
  }
  const centralBytes = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(files.length, 8)
  eocd.writeUInt16LE(files.length, 10)
  eocd.writeUInt32LE(centralBytes.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBytes, eocd])
}

const MARKDOWN = [
  '# 深度学习导论',
  '',
  '这是导言段落。',
  '',
  '## 第2章 反向传播',
  '',
  '链式法则是核心。',
  '',
  '```python',
  'def backward(x):',
  '    return x',
  '```',
  '',
  '### 2.1 梯度消失',
  '',
  '深层网络会出现梯度消失。',
  '',
].join('\n')

describe('text-family parsing', () => {
  it('keeps the heading chain and derives stable section ids from markdown', async () => {
    const parsed = await parseSource(Buffer.from(MARKDOWN, 'utf8'), 'dl-notes.md')
    expect(parsed.parser).toBe('markdown@1')
    const structure = deriveStructure(parsed, 'extracted/dl-notes.md')
    const labels = structure.sections.map(section => section.label)
    expect(labels).toEqual(['深度学习导论', '第2章 反向传播', '2.1 梯度消失'])

    const deepest = structure.sections.at(-1)!
    expect(deepest.level).toBe(3)
    expect(deepest.headingPath).toEqual(['深度学习导论', '第2章 反向传播', '2.1 梯度消失'])
    expect(deepest.parentId).toBe(sectionIdOf(['深度学习导论', '第2章 反向传播']))
    // CJK survives slugification: an anchor a person cannot read is not an anchor.
    expect(deepest.id).toContain('梯度消失')
  })

  it('records a section extent that slices the right lines of the emitted file', async () => {
    const parsed = await parseSource(Buffer.from(MARKDOWN, 'utf8'), 'dl-notes.md')
    const { markdown, structure } = emitSource(parsed, 'extracted/dl-notes.md')
    const lines = markdown.split('\n')
    for (const section of structure.sections) {
      expect(lines[section.line - 1]).toContain(section.label)
      expect(section.endLine).toBeGreaterThan(section.line)
    }
    const chapter = structure.sections.find(section => section.label === '第2章 反向传播')!
    const body = lines.slice(chapter.line - 1, chapter.endLine - 1).join('\n')
    expect(body).toContain('链式法则是核心。')
    // Its own body only: the child section is read through the child.
    expect(body).not.toContain('深层网络会出现梯度消失。')
  })

  it('preserves fenced code verbatim in the extracted markdown', async () => {
    const parsed = await parseSource(Buffer.from(MARKDOWN, 'utf8'), 'dl-notes.md')
    const rendered = renderExtractedMarkdown(parsed)
    expect(rendered).toContain('```python')
    expect(rendered).toContain('def backward(x):')
    expect(rendered).toContain('dsh-learning:source id=dl-notes')
  })

  it('recovers chapter headings from unstructured plain text', async () => {
    const text = ['前言段落。', '', '第3章 作用域', '', '闭包捕获的是变量绑定。', '', '3.2 闭包', '', '细节。'].join('\n')
    const parsed = await parseSource(Buffer.from(text, 'utf8'), 'js-guide.txt')
    const structure = deriveStructure(parsed, 'extracted/js-guide.md')
    const labels = structure.sections.map(section => section.label)
    expect(labels).toContain('第3章 作用域')
    expect(labels).toContain('3.2 闭包')
  })

  it('turns top-level code symbols into sections', async () => {
    const code = ['export function alpha() {', '  return 1', '}', '', 'export class Beta {}'].join('\n')
    const parsed = await parseSource(Buffer.from(code, 'utf8'), 'sample.ts')
    const structure = deriveStructure(parsed, 'extracted/sample.md')
    expect(structure.sections.map(section => section.label)).toEqual(['sample', 'alpha', 'Beta'])
  })

  it('decodes a UTF-16 file written by a Windows editor', async () => {
    const bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('# 标题\n\n正文', 'utf16le')])
    const parsed = await parseSource(bytes, 'utf16.md')
    expect(parsed.blocks.some(block => block.text === '标题')).toBe(true)
  })

  it('reports an empty source as degradation instead of failing', async () => {
    const parsed = await parseSource(Buffer.from('   \n\n', 'utf8'), 'blank.txt')
    expect(parsed.degradation).toContainEqual({ kind: 'empty-source', reason: 'the file decoded to no text' })
  })

  it('reports an unknown extension as unsupported rather than throwing', async () => {
    const parsed = await parseSource(Buffer.from('binary'), 'archive.tar.gz')
    expect(parsed.degradation).toEqual([{ kind: 'unsupported-format', extension: 'gz' }])
  })
})

describe('zip reader', () => {
  it('round-trips deflated members', () => {
    const zip = makeZip([{ name: 'a/b.xml', content: '<x>hello</x>' }])
    expect(listZipEntries(zip).map(entry => entry.name)).toEqual(['a/b.xml'])
    expect(readZipText(zip, 'a/b.xml')).toBe('<x>hello</x>')
  })
})

const DOCX_DOCUMENT = `<?xml version="1.0"?>
<w:document xmlns:w="x"><w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>第1章 概述</w:t></w:r></w:p>
<w:p><w:r><w:t>这是</w:t></w:r><w:r><w:t>正文。</w:t></w:r></w:p>
<w:p><w:pPr><w:outlineLvl w:val="1"/></w:pPr><w:r><w:t>1.2 细节</w:t></w:r></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr><w:r><w:t>要点一</w:t></w:r></w:p>
<w:tbl><w:tr><w:tc><w:p><w:r><w:t>左</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>右</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
</w:body></w:document>`

describe('docx parsing', () => {
  it('reads heading styles, outline levels, lists, and tables', async () => {
    const zip = makeZip([{ name: 'word/document.xml', content: DOCX_DOCUMENT }])
    const parsed = await parseSource(zip, 'report.docx')
    expect(parsed.parser).toBe('docx@1')
    const structure = deriveStructure(parsed, 'extracted/report.md')
    expect(structure.sections.map(section => section.label)).toEqual(['report', '第1章 概述', '1.2 细节'])
    expect(parsed.blocks.some(block => block.kind === 'list' && block.text === '要点一')).toBe(true)
    expect(parsed.blocks.some(block => block.kind === 'table' && block.text.includes('| 左 | 右 |'))).toBe(true)
    // Runs split mid-sentence by the editor must rejoin, not stay fragmented.
    expect(parsed.blocks.some(block => block.text === '这是正文。')).toBe(true)
  })

  it('carries no page numbers, because docx has no pages', async () => {
    const zip = makeZip([{ name: 'word/document.xml', content: DOCX_DOCUMENT }])
    const parsed = await parseSource(zip, 'report.docx')
    expect(parsed.blocks.every(block => block.anchor.page === undefined)).toBe(true)
  })

  it('degrades a non-zip payload instead of throwing', async () => {
    const parsed = await parseSource(Buffer.from('not a zip at all'), 'broken.docx')
    expect(parsed.degradation).toEqual([{ kind: 'unsupported-format', extension: 'docx' }])
  })
})

function slide(title: string, body: readonly string[]): string {
  const bodyShape = body.length === 0
    ? ''
    : `<p:sp><p:txBody>${body.map(line => `<a:p><a:r><a:t>${line}</a:t></a:r></a:p>`).join('')}</p:txBody></p:sp>`
  return `<p:sld xmlns:p="x" xmlns:a="y"><p:cSld><p:spTree>`
    + `<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>`
    + `<p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp>`
    + `${bodyShape}</p:spTree></p:cSld></p:sld>`
}

describe('pptx parsing', () => {
  const deck = () => makeZip([
    {
      name: 'ppt/presentation.xml',
      content: '<p:presentation xmlns:p="x"><p:sldIdLst>'
        + '<p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId1"/>'
        + '</p:sldIdLst></p:presentation>',
    },
    {
      name: 'ppt/_rels/presentation.xml.rels',
      content: '<Relationships>'
        + '<Relationship Id="rId1" Target="slides/slide1.xml"/>'
        + '<Relationship Id="rId2" Target="slides/slide2.xml"/>'
        + '</Relationships>',
    },
    { name: 'ppt/slides/slide1.xml', content: slide('第二张', ['要点 A', '要点 B']) },
    { name: 'ppt/slides/slide2.xml', content: slide('第一张', ['开场']) },
    { name: 'ppt/notesSlides/notesSlide2.xml', content: slide('notes', ['讲稿内容']) },
  ])

  it('follows the declared slide order rather than the file names', async () => {
    const parsed = await parseSource(deck(), 'lecture.pptx')
    const structure = deriveStructure(parsed, 'extracted/lecture.md')
    expect(structure.sections.map(section => section.label)).toEqual(['lecture', '第一张', '第二张'])
    // Slide 2 is declared first, so it must anchor to page 1.
    expect(structure.sections[1]?.page).toBe(1)
  })

  it('keeps speaker notes as a caption block', async () => {
    const parsed = await parseSource(deck(), 'lecture.pptx')
    expect(parsed.blocks.some(block => block.kind === 'caption' && block.text.includes('讲稿内容'))).toBe(true)
  })

  it('reports a picture-only slide as an unread page', async () => {
    const zip = makeZip([
      { name: 'ppt/slides/slide1.xml', content: '<p:sld xmlns:p="x" xmlns:a="y"><p:sp></p:sp></p:sld>' },
    ])
    const parsed = await parseSource(zip, 'photos.pptx')
    expect(parsed.degradation).toContainEqual({ kind: 'image-only-pages', pages: [1] })
  })
})

describe('pdf parsing', () => {
  it('never claims to have read a pdf it could not open', async () => {
    const parsed = await parseSource(Buffer.from('%PDF-1.7'), 'paper.pdf')
    expect(parsed.parser).toBe('pdf@2')
    expect(parsed.blocks).toEqual([])
    const [first] = parsed.degradation
    expect(first?.kind === 'parser-unavailable' || first?.kind === 'unsupported-format').toBe(true)
  })

  it('recovers headings, pages, and the unread page from a real pdf', async () => {
    const bytes = await readFile(join(import.meta.dirname, 'fixtures', 'sample-guide.pdf'))
    const parsed = await parseSource(bytes, 'sample-guide.pdf')
    if (parsed.degradation.some(item => item.kind === 'parser-unavailable')) {
      // A build without the optional `unpdf` still ships; it must say so rather
      // than produce empty sections that look like a source with no chapters.
      expect(parsed.blocks).toEqual([])
      return
    }

    const structure = deriveStructure(parsed, 'extracted/sample-guide.md')
    const headings = structure.sections.map(section => `${section.level}|${section.label}|${section.page}`)
    // Heading levels come from font-size clustering: 22pt outranks 16pt.
    expect(headings).toContain('2|Chapter 3 Scope|1')
    expect(headings).toContain('3|3.2 Closures|2')
    // The third page carries only a rectangle, so it is reported, not skipped.
    expect(parsed.degradation).toContainEqual({ kind: 'image-only-pages', pages: [3] })
    expect(structure.sections.some(section => section.page === 3 && section.label === '第 3 页')).toBe(true)
    expect(renderExtractedMarkdown(parsed)).toContain('<!-- p.2 -->')
  })
})

describe('vault layout and ingest', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-learning-vault-'))
    vault = await ensureVaultLayout(root, '深度学习')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('marks a directory as a vault and is idempotent', async () => {
    expect(await isVaultRoot(root)).toBe(true)
    const before = await readManifest(vault)
    await ensureVaultLayout(root)
    expect((await readManifest(vault)).createdAt).toBe(before.createdAt)
  })

  it('ingests a source into extracted markdown plus a structure record', async () => {
    const input = join(root, 'dl-notes.md')
    await writeFile(input, MARKDOWN, 'utf8')

    const result = await ingestSource(vault, input)
    expect(result.status).toBe('ingested')
    expect(result.entry?.parser).toBe('markdown@1')

    const extracted = await readFile(join(vault.extracted, 'dl-notes.md'), 'utf8')
    expect(extracted).toContain('## 第2章 反向传播')

    const structure = await readStructure(vault, 'dl-notes')
    expect(structure?.sections.map(section => section.label)).toContain('2.1 梯度消失')
    expect((await readManifest(vault)).sources).toHaveLength(1)
  })

  it('skips a re-drop of identical bytes', async () => {
    const input = join(root, 'dl-notes.md')
    await writeFile(input, MARKDOWN, 'utf8')
    await ingestSource(vault, input)
    expect((await ingestSource(vault, input)).status).toBe('unchanged')
  })

  it('rebuilds when the material actually changes', async () => {
    const input = join(root, 'dl-notes.md')
    await writeFile(input, MARKDOWN, 'utf8')
    await ingestSource(vault, input)
    await writeFile(input, `${MARKDOWN}\n## 第3章 优化\n\n新内容。\n`, 'utf8')
    const second = await ingestSource(vault, input)
    expect(second.status).toBe('ingested')
    expect(second.structure?.sections.map(section => section.label)).toContain('第3章 优化')
    // A rebuild replaces the entry rather than appending a duplicate source.
    expect((await readManifest(vault)).sources).toHaveLength(1)
  })

  it('keeps different same-named files as separate sources', async () => {
    const first = join(root, 'first', 'guide.md')
    const second = join(root, 'second', 'guide.md')
    await mkdir(join(root, 'first'), { recursive: true })
    await mkdir(join(root, 'second'), { recursive: true })
    await writeFile(first, '# First guide\n\nfirst body\n', 'utf8')
    await writeFile(second, '# Second guide\n\nsecond body\n', 'utf8')

    const firstResult = await ingestSource(vault, first)
    const secondResult = await ingestSource(vault, second)

    expect(firstResult.sourceId).toBe('guide')
    expect(secondResult.sourceId).toBe('guide-2')
    const manifest = await readManifest(vault)
    expect(manifest.sources).toHaveLength(2)
    expect(new Set(manifest.sources.map(entry => entry.sourcePath)).size).toBe(2)
    expect((await readAllStructures(vault)).map(structure => structure.sourceId).sort())
      .toEqual(['guide', 'guide-2'])
  })

  it('reports an unsupported drop without writing anything', async () => {
    const input = join(root, 'movie.mp4')
    await writeFile(input, 'not material', 'utf8')
    const result = await ingestSource(vault, input)
    expect(result.status).toBe('unsupported')
    expect(await readAllStructures(vault)).toEqual([])
  })

  it('ingests a dropped folder shallowly and reports every entry', async () => {
    const folder = join(root, 'readings')
    await mkdir(join(folder, 'nested'), { recursive: true })
    await writeFile(join(folder, 'one.md'), '# One\n\nbody\n', 'utf8')
    await writeFile(join(folder, 'two.txt'), 'plain text body', 'utf8')
    await writeFile(join(folder, 'skip.bin'), 'x', 'utf8')
    await writeFile(join(folder, 'nested', 'deep.md'), '# Deep\n', 'utf8')

    const results = await ingestDirectory(vault, folder)
    expect(results.map(result => result.status).sort()).toEqual(['ingested', 'ingested', 'unsupported'])
    expect((await readAllStructures(vault)).map(structure => structure.sourceId).sort())
      .toEqual(['one', 'two'])
  })

  it('states the coverage boundary for a partially readable source', async () => {
    const input = join(root, 'scan.pptx')
    await writeFile(input, makeZip([
      { name: 'ppt/slides/slide1.xml', content: '<p:sld xmlns:p="x" xmlns:a="y"><p:sp></p:sp></p:sld>' },
    ]))
    const result = await ingestSource(vault, input)
    expect(describeDegradation(result)).toContain('pages 1')
    expect(describeDegradation(result)).toContain('not read')
  })

  it('turns a damaged deflated docx into a parser degradation', async () => {
    const bytes = Buffer.from(makeZip([
      { name: 'word/document.xml', content: '<w:document><w:body><w:p>text</w:p></w:body></w:document>' },
    ]))
    const centralOffset = bytes.readUInt32LE(bytes.length - 22 + 16)
    bytes.writeUInt32LE(1, centralOffset + 20)

    const parsed = await parseSource(bytes, 'broken.docx')
    expect(parsed.degradation).toContainEqual({ kind: 'unsupported-format', extension: 'docx' })
  })

  it('formats contiguous unread pages as a range', () => {
    const sentence = describeDegradation({
      status: 'ingested',
      sourceId: 's',
      title: 'Scan',
      entry: {
        sourceId: 's', title: 'Scan', originalName: 's.pdf', sourcePath: '', extractedPath: '',
        structurePath: '', contentHash: '', parser: 'pdf@1', bytes: 0, ingestedAt: '',
        degradation: [{ kind: 'image-only-pages', pages: [12, 13, 14, 15, 20] }],
      },
    })
    expect(sentence).toContain('12–15, 20')
  })
})

describe('vault containment', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-learning-fence-'))
    vault = await ensureVaultLayout(root)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('resolves a vault-relative path', async () => {
    const resolved = await containedPath(vault, 'extracted/x.md')
    expect(resolved.startsWith(vault.root)).toBe(true)
  })

  it('refuses to escape through a traversal', async () => {
    await expect(containedPath(vault, '../../etc/passwd')).rejects.toBeInstanceOf(VaultContainmentError)
  })

  it('refuses an unrelated absolute path', async () => {
    await expect(containedPath(vault, tmpdir())).rejects.toBeInstanceOf(VaultContainmentError)
  })

  it('refuses a NUL-injected path', async () => {
    await expect(containedPath(vault, 'extracted/x\0.md')).rejects.toBeInstanceOf(VaultContainmentError)
  })

  it('does not read a structure file outside the vault', async () => {
    const outsideName = basename(root) + '-structure-escape'
    const outsidePath = join(root, '..', outsideName + '.json')
    await writeFile(outsidePath, JSON.stringify({ sections: [] }), 'utf8')
    try {
      expect(await readStructure(vault, '../../../' + outsideName)).toBeUndefined()
    } finally {
      await rm(outsidePath, { force: true })
    }
  })
})

describe('topic vault resolution', () => {
  it('is undefined for a directory that is not a vault', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'dsh-plain-'))
    try {
      const ctx = { get: () => undefined } as never
      expect(await resolveTopicVault(ctx, plain)).toBeUndefined()
    } finally {
      await rm(plain, { recursive: true, force: true })
    }
  })

  it('resolves a vault without a workspace registry composed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-vault-'))
    try {
      await ensureVaultLayout(root, 'Topic')
      const ctx = { get: () => undefined } as never
      const resolved = await resolveTopicVault(ctx, root)
      expect(resolved?.title).toBeDefined()
      expect(resolved?.workspaceId).toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('re-anchoring after a reimport', () => {
  it('follows a heading chain that survived, and falls back to the quote', async () => {
    const first = await parseSource(Buffer.from(MARKDOWN, 'utf8'), 'dl.md')
    const rebuilt = deriveStructure(
      await parseSource(Buffer.from(MARKDOWN.replace('深度学习导论', '深度学习导论（第二版）'), 'utf8'), 'dl.md'),
      'extracted/dl.md',
    )
    const chapter = deriveStructure(first, 'extracted/dl.md').sections
      .find(section => section.label === '第2章 反向传播')!

    // The chain changed at the root, so the quote hash is what recovers it.
    expect(reanchor(chapter.headingPath, chapter.quoteHash, rebuilt)?.label).toBe('第2章 反向传播')
  })

  it('reports a vanished section as stale rather than guessing', async () => {
    const rebuilt = deriveStructure(
      await parseSource(Buffer.from('# 只剩这一节\n\n正文\n', 'utf8'), 'dl.md'),
      'extracted/dl.md',
    )
    expect(reanchor(['某章', '已删除的一节'], slugify('gone'), rebuilt)).toBeUndefined()
  })
})
