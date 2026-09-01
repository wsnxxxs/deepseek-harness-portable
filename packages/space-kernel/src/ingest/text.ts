/**
 * The text-family parsers: markdown, plain text, and source code. These need no
 * dependency and are the reference implementation of the block contract — the
 * binary parsers (pdf/docx/pptx) normalize into the same shape.
 * @module @dsh-portable/interactive-learning/src/ingest/text
 */

import {
  quoteHashOf,
  type ParsedBlock,
  type ParsedBlockKind,
  type ParsedSource,
  type ParseDegradation,
  type SourceAnchor,
} from './types.ts'

/** Extensions the markdown parser owns. */
export const MARKDOWN_EXTENSIONS: readonly string[] = ['md', 'markdown', 'mdx', 'mdown']

/** Extensions the plain-text parser owns. */
export const PLAIN_TEXT_EXTENSIONS: readonly string[] = ['txt', 'text', 'rst', 'org', 'log', 'csv', 'tsv']

/** Extensions read as source code: each top-level symbol becomes a section. */
export const CODE_EXTENSIONS: readonly string[] = [
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'mts', 'cts',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'h', 'cc', 'cpp', 'hpp',
  'cs', 'php', 'scala', 'sh', 'bash', 'zsh', 'sql', 'lua', 'r', 'jl', 'hs', 'ml',
  'json', 'yaml', 'yml', 'toml', 'ini', 'html', 'css', 'scss',
]

/** Builder that keeps the heading chain consistent across emitted blocks. */
class BlockBuilder {
  private readonly blocks: ParsedBlock[] = []
  private headingPath: string[] = []

  constructor(private readonly sourceId: string) {}

  private anchor(text: string, page?: number): SourceAnchor {
    return {
      sourceId: this.sourceId,
      headingPath: [...this.headingPath],
      ...(page === undefined ? {} : { page }),
      quoteHash: quoteHashOf(text),
    }
  }

  /** Open a heading at `level`, truncating any deeper chain first. */
  heading(text: string, level: number, page?: number): void {
    const depth = Math.min(Math.max(level, 1), 6)
    this.headingPath = this.headingPath.slice(0, depth - 1)
    // A jump from h1 straight to h3 would otherwise leave a hole in the chain.
    while (this.headingPath.length < depth - 1) this.headingPath.push('')
    this.headingPath.push(text)
    this.blocks.push({ kind: 'heading', level: depth, text, anchor: this.anchor(text, page) })
  }

  /** Append a non-heading block; empty text is dropped. */
  body(kind: ParsedBlockKind, text: string, page?: number, lang?: string): void {
    const trimmed = text.trim()
    if (trimmed === '') return
    this.blocks.push({
      kind,
      text: trimmed,
      anchor: this.anchor(trimmed, page),
      ...(lang === undefined || lang === '' ? {} : { lang }),
    })
  }

  done(): readonly ParsedBlock[] {
    return this.blocks
  }
}

const ATX_HEADING = /^(#{1,6})\s+(.*?)\s*#*$/
const SETEXT_UNDERLINE = /^(=+|-{2,})\s*$/
const FENCE_OPEN = /^\s{0,3}(```+|~~~+)\s*([\w+-]*)/
const TABLE_ROW = /^\s{0,3}\|.*\|\s*$/
const LIST_ITEM = /^\s{0,3}([-*+]|\d{1,3}[.)])\s+/

/**
 * Parse markdown into blocks, preserving the heading chain, fenced code, tables,
 * and lists. Front matter is skipped: a vault note's own frontmatter is metadata
 * about the note, never teaching content.
 * @param text - The markdown document.
 * @param sourceId - Stable source id for anchors.
 * @param title - Document title used when the file opens without a heading.
 * @returns blocks in document order.
 */
export function parseMarkdownBlocks(text: string, sourceId: string, title: string): readonly ParsedBlock[] {
  const builder = new BlockBuilder(sourceId)
  const lines = text.split(/\r?\n/)
  let index = 0

  if (lines[0]?.trim() === '---') {
    const end = lines.indexOf('---', 1)
    if (end > 0) index = end + 1
  }

  let paragraph: string[] = []
  const flush = (): void => {
    if (paragraph.length === 0) return
    const joined = paragraph.join('\n')
    builder.body(LIST_ITEM.test(paragraph[0] ?? '') ? 'list' : 'paragraph', joined)
    paragraph = []
  }

  let opened = false
  for (; index < lines.length; index += 1) {
    const line = lines[index] ?? ''

    const fence = FENCE_OPEN.exec(line)
    if (fence !== undefined && fence !== null) {
      flush()
      const marker = fence[1] ?? '```'
      const lang = fence[2] ?? ''
      const body: string[] = []
      index += 1
      for (; index < lines.length; index += 1) {
        const inner = lines[index] ?? ''
        if (inner.trimStart().startsWith(marker.slice(0, 3))) break
        body.push(inner)
      }
      builder.body('code', body.join('\n'), undefined, lang)
      continue
    }

    const atx = ATX_HEADING.exec(line)
    if (atx !== null) {
      flush()
      builder.heading((atx[2] ?? '').trim(), (atx[1] ?? '#').length)
      opened = true
      continue
    }

    const next = lines[index + 1] ?? ''
    if (line.trim() !== '' && SETEXT_UNDERLINE.test(next) && paragraph.length === 0) {
      flush()
      builder.heading(line.trim(), next.trimStart().startsWith('=') ? 1 : 2)
      opened = true
      index += 1
      continue
    }

    if (TABLE_ROW.test(line)) {
      flush()
      const rows: string[] = []
      for (; index < lines.length && TABLE_ROW.test(lines[index] ?? ''); index += 1) {
        rows.push(lines[index] ?? '')
      }
      index -= 1
      builder.body('table', rows.join('\n'))
      continue
    }

    if (line.trim() === '') {
      flush()
      continue
    }

    if (!opened && paragraph.length === 0) {
      // Content before any heading still needs a chain, so the file's own title
      // opens the document rather than leaving orphan blocks at the root.
      builder.heading(title, 1)
      opened = true
    }
    paragraph.push(line)
  }
  flush()
  return builder.done()
}

const CHAPTER_HEADING = [
  /^\s*第\s*[〇一二三四五六七八九十百零\d]+\s*[章节節篇讲講课課]\s*[:：、.]?\s*(.*)$/,
  /^\s*(?:chapter|section|part|lesson|unit|appendix)\s+[\divxlcIVXLC]+\s*[:.\-—]?\s*(.*)$/i,
  /^\s*\d{1,2}(?:\.\d{1,2}){0,3}\s+(\S.*)$/,
]

const MAX_HEADING_LENGTH = 80

/** Whether a plain-text line reads as a heading rather than as prose. */
function plainTextHeading(line: string, next: string): { text: string; level: number } | undefined {
  const trimmed = line.trim()
  if (trimmed === '' || trimmed.length > MAX_HEADING_LENGTH) return undefined
  for (const [depth, pattern] of CHAPTER_HEADING.entries()) {
    const match = pattern.exec(trimmed)
    if (match === null) continue
    // A numbered pattern's depth follows its dotted segments; `3.2` is deeper
    // than `3`, which is what a textbook's own numbering already asserts.
    const level = depth === 2 ? Math.min((trimmed.match(/\./g)?.length ?? 0) + 1, 6) : depth + 1
    return { text: trimmed, level }
  }
  // An all-caps or underlined short line followed by a blank is a heading by
  // typographic convention, and getting this wrong only costs one extra section.
  if (next.trim() === '' && /^[^\p{Lowercase_Letter}]+$/u.test(trimmed) && /\p{Letter}/u.test(trimmed)) {
    return { text: trimmed, level: 2 }
  }
  return undefined
}

/**
 * Parse plain text, recovering chapter-style headings by convention.
 * @param text - The document.
 * @param sourceId - Stable source id for anchors.
 * @param title - Title used to open the document.
 * @returns blocks in document order.
 */
export function parsePlainTextBlocks(text: string, sourceId: string, title: string): readonly ParsedBlock[] {
  const builder = new BlockBuilder(sourceId)
  builder.heading(title, 1)
  const lines = text.split(/\r?\n/)
  let paragraph: string[] = []
  const flush = (): void => {
    if (paragraph.length === 0) return
    builder.body('paragraph', paragraph.join('\n'))
    paragraph = []
  }
  for (const [index, raw] of lines.entries()) {
    const line = raw ?? ''
    const heading = plainTextHeading(line, lines[index + 1] ?? '')
    if (heading !== undefined) {
      flush()
      builder.heading(heading.text, Math.max(heading.level, 2))
      continue
    }
    if (line.trim() === '') {
      flush()
      continue
    }
    paragraph.push(line)
  }
  flush()
  return builder.done()
}

const TOP_LEVEL_SYMBOL = new RegExp(
  [
    String.raw`^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z_$][\w$]*)`,
    String.raw`^(?:def|class)\s+([A-Za-z_][\w]*)`,
    String.raw`^(?:func|type|var|const)\s+\(?[^)]*\)?\s*([A-Za-z_][\w]*)`,
    String.raw`^(?:pub\s+)?(?:fn|struct|impl|trait|enum|mod)\s+([A-Za-z_][\w]*)`,
    String.raw`^(?:public|private|protected|static|final|abstract|\s)*(?:class|interface|enum|record)\s+([A-Za-z_][\w]*)`,
  ].join('|'),
)

/**
 * Parse source code so each top-level symbol becomes its own section. The body
 * stays verbatim inside code blocks: a learner reading code needs the code, not
 * a paraphrase of it.
 * @param text - The file's content.
 * @param sourceId - Stable source id for anchors.
 * @param title - File name used to open the document.
 * @param lang - Fence language recorded on every code block.
 * @returns blocks in document order.
 */
export function parseCodeBlocks(
  text: string,
  sourceId: string,
  title: string,
  lang: string,
): readonly ParsedBlock[] {
  const builder = new BlockBuilder(sourceId)
  builder.heading(title, 1)
  const lines = text.split(/\r?\n/)
  let segment: string[] = []
  const flush = (): void => {
    if (segment.length === 0) return
    builder.body('code', segment.join('\n'), undefined, lang)
    segment = []
  }
  for (const raw of lines) {
    const line = raw ?? ''
    const symbol = TOP_LEVEL_SYMBOL.exec(line)
    if (symbol !== null) {
      const name = symbol.slice(1).find(value => value !== undefined)
      if (name !== undefined) {
        flush()
        builder.heading(name, 2)
      }
    }
    segment.push(line)
  }
  flush()
  return builder.done()
}

/**
 * Parse one text-family source into the shared block contract.
 * @param text - Decoded file content.
 * @param options - Source identity plus the lowercase extension without a dot.
 * @returns the parsed source, including any degradation observed.
 */
export function parseTextSource(
  text: string,
  options: { sourceId: string; title: string; extension: string },
): ParsedSource {
  const { sourceId, title, extension } = options
  const degradation: ParseDegradation[] = []
  if (text.trim() === '') {
    degradation.push({ kind: 'empty-source', reason: 'the file decoded to no text' })
  }
  const blocks = MARKDOWN_EXTENSIONS.includes(extension)
    ? parseMarkdownBlocks(text, sourceId, title)
    : CODE_EXTENSIONS.includes(extension)
      ? parseCodeBlocks(text, sourceId, title, extension)
      : parsePlainTextBlocks(text, sourceId, title)
  const parser = MARKDOWN_EXTENSIONS.includes(extension)
    ? 'markdown@1'
    : CODE_EXTENSIONS.includes(extension) ? 'code@1' : 'text@1'
  return { sourceId, title, parser, blocks, degradation }
}
