import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { ingestSource } from '../src/ingest/pipeline.ts'
import { readManifest, readStructure, ensureVaultLayout, upsertManifestEntry, type TopicVault } from '../src/topic-vault.ts'
import { conceptCardPathOf, renderConceptCard, readConceptCard } from '../src/concept-cards.ts'
import {
  blocksForPage,
  imageCapability,
  imageOnlyPages,
  materialRouteInfo,
  reparsePages,
  spliceRecoveredPages,
  MAX_REPARSE_PAGES,
  REPARSE_HEADING_SUFFIX,
  type ReparseDeps,
} from '../src/material-vision.ts'
import { formatSectionAnchor } from '../src/material-anchor.ts'
import type { ParsedBlock, ParsedSource } from '../src/ingest/types.ts'

const NOW = new Date('2026-08-27T09:00:00.000Z')
const FIXTURE = join(import.meta.dirname, 'fixtures', 'sample-guide.pdf')

let directory: string
let vault: TopicVault

/**
 * A Host context with exactly the three services this module reads.
 * @param options - `image` declares the active model's modality; `answer` is what it replies.
 */
function hostContext(options: {
  image?: 'declared' | 'denied' | 'undeclared'
  answer?: string
  finish?: string
  llm?: boolean
  route?: boolean
  metrics?: { catalog: number; stream: number }
} = {}): Context {
  const modality = options.image ?? 'declared'
  const llm = {
    listProviders: () => [{ id: 'mock' }],
    listModels: async () => {
      if (options.metrics !== undefined) options.metrics.catalog += 1
      return [{
      provider: 'mock',
      id: 'mock-model',
      name: 'Mock',
      ...(modality === 'undeclared' ? {} : { inputModalities: modality === 'declared' ? ['image', 'text'] : ['text'] }),
      }]
    },
    stream: () => (async function* () {
      if (options.metrics !== undefined) options.metrics.stream += 1
      yield { type: 'text-delta', index: 0, text: options.answer ?? '## 图 3.1\n\n这一页写着卷积定理的证明。' }
      yield { type: 'finish', reason: { kind: options.finish ?? 'stop' } }
    })(),
  }
  const attachments = {
    saveImages: async (images: readonly { data: Uint8Array }[]) =>
      images.map(image => ({ kind: 'image', bytes: image.data.byteLength })),
  }
  const agentDefaultModel = { currentSelection: () => ({ provider: 'mock', model: 'mock-model' }) }
  return {
    get(name: string) {
      if (name === 'llm') return options.llm === false ? undefined : llm
      if (name === 'attachments') return attachments
      if (name === 'agentDefaultModel') return options.route === false ? undefined : agentDefaultModel
      return undefined
    },
  } as unknown as Context
}

/** Deps that pretend Poppler is installed and hand back a one-byte PNG. */
function fakeRender(): ReparseDeps {
  return {
    findRenderer: async () => 'pdftoppm',
    renderPage: async () => {
      const scratch = await mkdtemp(join(tmpdir(), 'dsh-page-'))
      const imagePath = join(scratch, 'page.png')
      await writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
      return { directory: scratch, imagePath }
    },
  }
}

function block(page: number | undefined, text: string): ParsedBlock {
  return {
    kind: 'paragraph',
    text,
    anchor: { sourceId: 's', headingPath: ['S'], quoteHash: text, ...(page === undefined ? {} : { page }) },
  }
}

function parsedWith(blocks: ParsedBlock[], pages: number[] = []): ParsedSource {
  return {
    sourceId: 's',
    title: 'S',
    parser: 'pdf@2',
    blocks,
    degradation: pages.length === 0 ? [] : [{ kind: 'image-only-pages', pages }],
  }
}

/** Ingest the fixture; returns undefined when the optional pdf parser is absent. */
async function seedFixture(): Promise<string | undefined> {
  const result = await ingestSource(vault, FIXTURE)
  if (result.status !== 'ingested') return undefined
  const manifest = await readManifest(vault)
  const entry = manifest.sources.find(source => source.sourceId === result.sourceId)
  const unreadable = entry?.degradation.some(item => item.kind === 'image-only-pages') ?? false
  return unreadable ? result.sourceId : undefined
}

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'dsh-vision-'))
  vault = await ensureVaultLayout(directory, '傅里叶')
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('reading a model’s declared capability', () => {
  const catalog = [
    { provider: 'a', id: 'seeing', name: 'Seeing', inputModalities: ['text', 'image'] as const },
    { provider: 'a', id: 'blind', name: 'Blind', inputModalities: ['text'] as const },
    { provider: 'a', id: 'quiet', name: 'Quiet' },
  ]

  it('reads a declared image modality as supported', () => {
    expect(imageCapability({ provider: 'a', model: 'seeing' }, catalog)).toBe('supported')
  })

  it('reads a declared list without image as an actual denial', () => {
    expect(imageCapability({ provider: 'a', model: 'blind' }, catalog)).toBe('unsupported')
  })

  it('reads an absent declaration as unknown rather than as a denial', () => {
    expect(imageCapability({ provider: 'a', model: 'quiet' }, catalog)).toBe('unknown')
  })

  it('reads a model missing from the catalog as unknown', () => {
    expect(imageCapability({ provider: 'z', model: 'ghost' }, catalog)).toBe('unknown')
  })
})

describe('degradation reading', () => {
  it('collects and sorts every image-only page across entries', () => {
    expect(imageOnlyPages([
      { kind: 'image-only-pages', pages: [7, 3] },
      { kind: 'formula-dropped', count: 2 },
      { kind: 'image-only-pages', pages: [3, 1] },
    ])).toEqual([1, 3, 7])
  })

  it('answers empty for a source with no image-only pages', () => {
    expect(imageOnlyPages([{ kind: 'formula-dropped', count: 2 }])).toEqual([])
  })
})

describe('turning recovered text into blocks', () => {
  it('marks the page heading so every anchor derived from it carries the marker', () => {
    const [heading] = blocksForPage('s', '教程', 3, '正文。')
    expect(heading?.text).toBe(`第 3 页${REPARSE_HEADING_SUFFIX}`)
    expect(heading?.anchor.page).toBe(3)
  })

  it('keeps every block on the page it came from', () => {
    const blocks = blocksForPage('s', '教程', 4, '第一段。\n\n第二段。')
    expect(blocks.every(item => item.anchor.page === 4)).toBe(true)
  })

  it('recognizes the model’s own headings and nests them under the page', () => {
    const blocks = blocksForPage('s', '教程', 2, '## 图 2.1\n\n说明。')
    const heading = blocks.find(item => item.text === '图 2.1')
    expect(heading?.kind).toBe('heading')
    expect(heading?.anchor.headingPath).toEqual(['教程', `第 2 页${REPARSE_HEADING_SUFFIX}`, '图 2.1'])
  })

  it('keeps a Markdown table as a table block', () => {
    const blocks = blocksForPage('s', '教程', 2, '| a | b |\n| - | - |')
    expect(blocks.at(-1)?.kind).toBe('table')
  })

  it('drops blank chunks rather than emitting empty blocks', () => {
    expect(blocksForPage('s', '教程', 2, '\n\n  \n\n')).toHaveLength(1)
  })
})

describe('splicing recovered pages into a parse', () => {
  it('lands a page after the last block at or below it', () => {
    const parsed = parsedWith([block(1, 'one'), block(2, 'two'), block(4, 'four')], [3])
    const merged = spliceRecoveredPages(parsed, new Map([[3, [block(3, 'three')]]]))
    expect(merged.blocks.map(item => item.text)).toEqual(['one', 'two', 'three', 'four'])
  })

  it('lands a first page ahead of everything', () => {
    const parsed = parsedWith([block(2, 'two'), block(3, 'three')], [1])
    const merged = spliceRecoveredPages(parsed, new Map([[1, [block(1, 'one')]]]))
    expect(merged.blocks.map(item => item.text)).toEqual(['one', 'two', 'three'])
  })

  it('keeps two recovered pages in order when both are spliced', () => {
    const parsed = parsedWith([block(1, 'one'), block(5, 'five')], [2, 4])
    const merged = spliceRecoveredPages(parsed, new Map([
      [2, [block(2, 'two')]],
      [4, [block(4, 'four')]],
    ]))
    expect(merged.blocks.map(item => item.text)).toEqual(['one', 'two', 'four', 'five'])
  })

  it('drops the pages it recovered from the degradation entry', () => {
    const parsed = parsedWith([block(1, 'one')], [2, 3])
    const merged = spliceRecoveredPages(parsed, new Map([[2, [block(2, 'two')]]]))
    expect(merged.degradation).toEqual([{ kind: 'image-only-pages', pages: [3] }])
  })

  it('removes the entry entirely when every page is recovered', () => {
    const parsed = parsedWith([block(1, 'one')], [2])
    const merged = spliceRecoveredPages(parsed, new Map([[2, [block(2, 'two')]]]))
    expect(merged.degradation).toEqual([])
  })

  it('leaves other degradation kinds untouched', () => {
    const parsed: ParsedSource = {
      ...parsedWith([block(1, 'one')], [2]),
      degradation: [{ kind: 'image-only-pages', pages: [2] }, { kind: 'formula-dropped', count: 9 }],
    }
    const merged = spliceRecoveredPages(parsed, new Map([[2, [block(2, 'two')]]]))
    expect(merged.degradation).toEqual([{ kind: 'formula-dropped', count: 9 }])
  })

  it('is a no-op when nothing was recovered', () => {
    const parsed = parsedWith([block(1, 'one')], [2])
    expect(spliceRecoveredPages(parsed, new Map())).toBe(parsed)
  })
})

describe('route reporting', () => {
  it('reports native-image for a model that declares it, and names the model', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const info = await materialRouteInfo(hostContext(), vault, sourceId, fakeRender())
    expect(info.status).toBe('ok')
    expect(info.route).toBe('native-image')
    expect(info.model).toBe('mock/mock-model')
    expect(info.pages).toEqual([3])
    expect(info.spendsTokens).toBe(true)
  })

  it('queries the model catalog but never generates while reporting the route', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const metrics = { catalog: 0, stream: 0 }
    const info = await materialRouteInfo(hostContext({ metrics }), vault, sourceId, fakeRender())
    expect(info.route).toBe('native-image')
    expect(metrics.catalog).toBeGreaterThan(0)
    expect(metrics.stream).toBe(0)
  })

  it('prefers the current session route over the global default', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const base = hostContext()
    const sessionCtx = {
      ...base,
      agent: {
        options: { provider: 'global', model: 'global-model' },
        session: {
          header: { cwd: vault.root },
          requestHeader: () => ({ config: { provider: 'session', model: 'session-model' } }),
        },
      },
    } as unknown as Context
    const info = await materialRouteInfo(sessionCtx, vault, sourceId, fakeRender())
    expect(info.model).toBe('session/session-model')
  })

  it('refuses a model that declares no image input, and says it costs nothing', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const info = await materialRouteInfo(hostContext({ image: 'denied' }), vault, sourceId, fakeRender())
    expect(info.route).toBe('text-only-model')
    expect(info.spendsTokens).toBe(false)
  })

  it('separates an undeclared capability from a denial', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const info = await materialRouteInfo(hostContext({ image: 'undeclared' }), vault, sourceId, fakeRender())
    expect(info.route).toBe('unknown-capability')
    expect(info.spendsTokens).toBe(true)
  })

  it('reports a missing rasterizer before it looks at any model', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const info = await materialRouteInfo(
      hostContext(),
      vault,
      sourceId,
      { findRenderer: async () => undefined },
    )
    expect(info.route).toBe('renderer-missing')
    expect(info.model).toBeNull()
  })

  it('reports no-route when nothing has selected a model', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const info = await materialRouteInfo(hostContext({ route: false }), vault, sourceId, fakeRender())
    expect(info.route).toBe('no-route')
  })

  it('says there is nothing to do for a source with no unread pages', async () => {
    await writeFile(join(vault.sources, 'notes.md'), '# 甲\n\n正文。\n', 'utf8')
    const ingested = await ingestSource(vault, join(vault.sources, 'notes.md'))
    const info = await materialRouteInfo(hostContext(), vault, ingested.sourceId, fakeRender())
    expect(info.status === 'not-pdf' || info.status === 'nothing-to-reparse').toBe(true)
  })

  it('reports an unknown source rather than throwing', async () => {
    const info = await materialRouteInfo(hostContext(), vault, '不存在', fakeRender())
    expect(info.status).toBe('unknown-source')
    expect(info.pages).toEqual([])
  })
})

describe('re-reading pages', () => {
  it('writes the recovered text into the extracted markdown, marked as re-read', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return

    const result = await reparsePages(hostContext(), vault, sourceId, undefined, NOW, undefined, fakeRender())
    expect(result.status).toBe('ok')
    expect(result.recovered).toEqual([3])

    const manifest = await readManifest(vault)
    const entry = manifest.sources.find(source => source.sourceId === sourceId)!
    const markdown = await readFile(join(vault.root, entry.extractedPath), 'utf8')
    expect(markdown).toContain(`第 3 页${REPARSE_HEADING_SUFFIX}`)
    expect(markdown).toContain('这一页写着卷积定理的证明。')
  })

  it('accumulates pages across batches and removes the duplicate placeholder title', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const seeded = (await readManifest(vault)).sources.find(source => source.sourceId === sourceId)!
    await upsertManifestEntry(vault, {
      ...seeded,
      degradation: [{ kind: 'image-only-pages', pages: [3, 4] }],
    })

    await reparsePages(
      hostContext({ answer: '# 第 3 页\n\nP3 recovered.' }),
      vault,
      sourceId,
      [3],
      NOW,
      undefined,
      fakeRender(),
    )
    await reparsePages(
      hostContext({ answer: '# 第 4 页\n\nP4 recovered.' }),
      vault,
      sourceId,
      [4],
      NOW,
      undefined,
      fakeRender(),
    )

    const manifest = await readManifest(vault)
    const entry = manifest.sources.find(source => source.sourceId === sourceId)!
    expect(entry.reparsed?.pages).toEqual([3, 4])
    expect(entry.degradation.some(item => item.kind === 'image-only-pages')).toBe(false)
    const structure = await readStructure(vault, sourceId)
    const markdown = await readFile(join(vault.root, entry.extractedPath), 'utf8')
    expect(markdown).toContain('P3 recovered.')
    expect(markdown).toContain('P4 recovered.')
    expect(markdown.match(/^## 第 3 页（视觉重读）$/gmu)).toHaveLength(1)
    expect(markdown).not.toMatch(/^## 第 3 页$/mu)
    for (const page of [3, 4]) {
      const section = structure?.sections.find(item => item.label === `第 ${page} 页${REPARSE_HEADING_SUFFIX}`)
      expect(section).toBeDefined()
      expect(markdown.split('\n')[section!.line - 1]).toContain(section!.label)
    }
  })

  it('clears the degradation entry it recovered', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    await reparsePages(hostContext(), vault, sourceId, undefined, NOW, undefined, fakeRender())
    const manifest = await readManifest(vault)
    const entry = manifest.sources.find(source => source.sourceId === sourceId)!
    expect(entry.degradation.some(item => item.kind === 'image-only-pages')).toBe(false)
  })

  it('records who read the page, without touching the parser identity', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const before = (await readManifest(vault)).sources.find(source => source.sourceId === sourceId)!

    await reparsePages(hostContext(), vault, sourceId, undefined, NOW, undefined, fakeRender())
    const after = (await readManifest(vault)).sources.find(source => source.sourceId === sourceId)!
    expect(after.reparsed).toEqual({ pages: [3], via: 'mock/mock-model', at: NOW.toISOString() })
    // The parser field is half the skip-if-unchanged identity: tagging it would
    // make the next mention of this file rebuild and destroy the recovery.
    expect(after.parser).toBe(before.parser)
    expect(after.contentHash).toBe(before.contentHash)
  })

  it('leaves the recovery in place when the same file is re-ingested unchanged', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    await reparsePages(hostContext(), vault, sourceId, undefined, NOW, undefined, fakeRender())

    const again = await ingestSource(vault, FIXTURE)
    expect(again.status).toBe('unchanged')
    const entry = (await readManifest(vault)).sources.find(source => source.sourceId === sourceId)!
    expect(entry.reparsed?.pages).toEqual([3])
  })

  it('rebuilds the structure file so it still describes the markdown beside it', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    await reparsePages(hostContext(), vault, sourceId, undefined, NOW, undefined, fakeRender())

    const structure = await readStructure(vault, sourceId)
    const section = structure?.sections.find(item => item.label === `第 3 页${REPARSE_HEADING_SUFFIX}`)
    expect(section).toBeDefined()
    const markdown = (await readFile(join(vault.root, structure!.extractedPath), 'utf8')).split('\n')
    expect(markdown[section!.line - 1]).toContain(`第 3 页${REPARSE_HEADING_SUFFIX}`)
  })

  it('spends nothing and writes nothing for a text-only model', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const before = await readFile(join(vault.extracted, `${sourceId}.md`), 'utf8')

    const result = await reparsePages(
      hostContext({ image: 'denied' }), vault, sourceId, undefined, NOW, undefined, fakeRender(),
    )
    expect(result.status).toBe('text-only-model')
    expect(result.recovered).toEqual([])
    expect(await readFile(join(vault.extracted, `${sourceId}.md`), 'utf8')).toBe(before)
  })

  it('writes nothing when no rasterizer is installed', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const result = await reparsePages(
      hostContext(), vault, sourceId, undefined, NOW, undefined, { findRenderer: async () => undefined },
    )
    expect(result.status).toBe('renderer-missing')
    expect(result.recovered).toEqual([])
  })

  it('does not replace a known gap with an empty section when the model returns nothing', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return

    const result = await reparsePages(
      hostContext({ answer: '   ' }), vault, sourceId, undefined, NOW, undefined, fakeRender(),
    )
    expect(result.status).toBe('ok')
    expect(result.recovered).toEqual([])
    expect(result.pages[0]?.status).toBe('empty')
    const entry = (await readManifest(vault)).sources.find(source => source.sourceId === sourceId)!
    expect(entry.degradation).toContainEqual({ kind: 'image-only-pages', pages: [3] })
  })

  it('reports a model failure per page rather than failing the whole call', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const result = await reparsePages(
      hostContext({ finish: 'error' }), vault, sourceId, undefined, NOW, undefined, fakeRender(),
    )
    expect(result.status).toBe('ok')
    expect(result.pages[0]?.status).toBe('model-failed')
    expect(result.recovered).toEqual([])
  })

  it('reports a render failure per page rather than failing the whole call', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const result = await reparsePages(hostContext(), vault, sourceId, undefined, NOW, undefined, {
      findRenderer: async () => 'pdftoppm',
      renderPage: async () => { throw new Error('poppler exploded') },
    })
    expect(result.pages[0]).toMatchObject({ status: 'render-failed', page: 3 })
    expect(result.recovered).toEqual([])
  })

  it('ignores a requested page the parser never called unreadable', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const result = await reparsePages(hostContext(), vault, sourceId, [1, 2], NOW, undefined, fakeRender())
    expect(result.status).toBe('nothing-to-reparse')
    expect(result.recovered).toEqual([])
  })

  it('caps one call at a bounded number of model round trips', () => {
    expect(MAX_REPARSE_PAGES).toBeLessThanOrEqual(8)
  })

  it('re-anchors concept cards that cited a section the re-emit moved', async () => {
    const sourceId = await seedFixture()
    if (sourceId === undefined) return
    const structure = await readStructure(vault, sourceId)
    const cited = structure?.sections.find(section => section.page === 1 && section.level > 1)
    if (cited === undefined) return

    // Through `formatSectionAnchor`, not hand-built: anchors resolve on the
    // HEADING CHAIN parsed out of the text, so a string carrying a section id
    // would correctly be reported stale and prove nothing.
    const anchor = formatSectionAnchor(sourceId, cited)
    await writeFile(conceptCardPathOf(vault, '卷积'), renderConceptCard({
      conceptSlug: '卷积',
      label: '卷积',
      mastery: 'transfer',
      masteryBasis: 'evidence',
      due: '2026-08-25',
      intervalDays: 4,
      anchors: [anchor],
      staleAnchors: [],
      explanation: '滑窗求和。',
      misconceptions: [],
      unverifiedTransfer: '',
      relatedConcepts: [],
    }, NOW), 'utf8')

    const result = await reparsePages(hostContext(), vault, sourceId, undefined, NOW, undefined, fakeRender())
    expect(result.status).toBe('ok')
    expect(result.reanchored).toBeDefined()
    // A section the recovery did not touch must not be reported stale.
    const card = await readConceptCard(vault, '卷积')
    expect(card?.staleAnchors).toEqual([])
  })
})
