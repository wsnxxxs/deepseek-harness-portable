/**
 * The docx parser, reading `word/document.xml` through the shared zip reader.
 *
 * No conversion dependency: a docx heading is a paragraph carrying a `Heading n`
 * style or an outline level, and that is exactly the signal the structure layer
 * needs. Routing through an HTML converter would add a dependency to a portable
 * build only to re-derive the same levels from generated markup.
 *
 * docx has no pages — pagination is a rendering decision made by the word
 * processor, not a property of the file — so blocks from this parser carry a
 * heading path and no page number, and the map must not imply otherwise.
 * @module @dsh-portable/interactive-learning/src/ingest/docx
 */

import { readZipText, ZipFormatError } from './zip.ts'
import {
  quoteHashOf,
  type ParsedBlock,
  type ParsedBlockKind,
  type ParsedSource,
  type ParseDegradation,
} from './types.ts'

const NUMERIC_ENTITY = /&#(x?)([0-9a-fA-F]+);/g
const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
}

function decodeXml(value: string): string {
  return value
    .replace(NUMERIC_ENTITY, (_match, hex: string, digits: string) =>
      String.fromCodePoint(Number.parseInt(digits, hex === '' ? 10 : 16)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_match, name: string) => NAMED_ENTITIES[name] ?? _match)
}

/**
 * Extent of the element opening at `start`, honoring nesting so a table inside a
 * table is consumed whole.
 * @returns the index just past the element's closing tag, or `-1` when unclosed.
 */
function elementEnd(xml: string, start: number, tag: string): number {
  const selfClosing = /^<[^>]*\/>/.exec(xml.slice(start))
  if (selfClosing !== null) return start + selfClosing[0].length
  const open = new RegExp(`<${tag}(?=[\\s>])`, 'g')
  const close = new RegExp(`</${tag}>`, 'g')
  let depth = 0
  let cursor = start
  for (;;) {
    open.lastIndex = cursor
    close.lastIndex = cursor
    const nextOpen = open.exec(xml)
    const nextClose = close.exec(xml)
    if (nextClose === null) return -1
    if (nextOpen !== null && nextOpen.index < nextClose.index) {
      depth += 1
      cursor = nextOpen.index + 1
      continue
    }
    depth -= 1
    cursor = nextClose.index + nextClose[0].length
    if (depth === 0) return cursor
  }
}

const TEXT_RUN = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:br\b[^>]*\/?>/g

/** Text of one paragraph, with tabs and breaks preserved as whitespace. */
function paragraphText(xml: string): string {
  let text = ''
  for (const match of xml.matchAll(TEXT_RUN)) {
    if (match[1] !== undefined) text += decodeXml(match[1])
    else if (match[0].startsWith('<w:br')) text += '\n'
    else text += ' '
  }
  return text.replace(/[ \t]+/gu, ' ').replace(/\s*\n\s*/gu, '\n').trim()
}

const PARAGRAPH_STYLE = /<w:pStyle\b[^>]*\bw:val="([^"]*)"/
const OUTLINE_LEVEL = /<w:outlineLvl\b[^>]*\bw:val="(\d+)"/
const HEADING_STYLE = /^(?:heading|berschrift|titre|t[íi]tulo|заголовок|見出し|제목|标题|標題)\s*([1-9])$/i
const TITLE_STYLE = /^(?:title|標題|标题)$/i

/** Heading depth this paragraph declares, or `undefined` for body text. */
function headingLevel(xml: string): number | undefined {
  const style = PARAGRAPH_STYLE.exec(xml)?.[1] ?? ''
  const named = HEADING_STYLE.exec(style.replace(/\s+/gu, ''))
  if (named !== null) return Math.min(Number.parseInt(named[1] ?? '1', 10) + 1, 6)
  if (TITLE_STYLE.test(style)) return 1
  const outline = OUTLINE_LEVEL.exec(xml)?.[1]
  if (outline !== undefined) {
    const level = Number.parseInt(outline, 10)
    // `9` is Word's "body text" sentinel, not a ninth heading level.
    if (level >= 0 && level <= 5) return level + 2
  }
  return undefined
}

const ROW = /<w:tr(?=[\s>])/g

/** Render one table as pipe rows so the extracted markdown stays greppable. */
function tableText(xml: string): string {
  const rows: string[] = []
  for (const match of xml.matchAll(ROW)) {
    const end = elementEnd(xml, match.index, 'w:tr')
    if (end < 0) break
    const row = xml.slice(match.index, end)
    const cells: string[] = []
    const cellPattern = /<w:tc(?=[\s>])/g
    for (const cell of row.matchAll(cellPattern)) {
      const cellEnd = elementEnd(row, cell.index, 'w:tc')
      if (cellEnd < 0) break
      cells.push(paragraphText(row.slice(cell.index, cellEnd)).replace(/\n/gu, ' ').replace(/\|/gu, '\\|'))
    }
    if (cells.length > 0) rows.push(`| ${cells.join(' | ')} |`)
  }
  return rows.join('\n')
}

/**
 * Parse a docx into blocks, using declared heading styles and outline levels for
 * the section chain.
 * @param bytes - The docx archive.
 * @param options - Source identity and display title.
 * @returns the parsed source, with degradation reported rather than thrown.
 */
export function parseDocxSource(
  bytes: Uint8Array,
  options: { sourceId: string; title: string },
): ParsedSource {
  const { sourceId, title } = options
  let document: string | undefined
  try {
    document = readZipText(bytes, 'word/document.xml')
  } catch (cause) {
    if (!(cause instanceof ZipFormatError)) throw cause
    return {
      sourceId,
      title,
      parser: 'docx@1',
      blocks: [],
      degradation: [{ kind: 'unsupported-format', extension: 'docx' }],
    }
  }
  if (document === undefined) {
    return {
      sourceId,
      title,
      parser: 'docx@1',
      blocks: [],
      degradation: [{ kind: 'unsupported-format', extension: 'docx' }],
    }
  }

  const bodyStart = document.indexOf('<w:body')
  const body = bodyStart < 0 ? document : document.slice(bodyStart)
  const blocks: ParsedBlock[] = []
  const headingPath: string[] = [title]
  blocks.push({
    kind: 'heading',
    level: 1,
    text: title,
    anchor: { sourceId, headingPath: [title], quoteHash: quoteHashOf(title) },
  })

  const push = (kind: ParsedBlockKind, text: string, level?: number): void => {
    if (text.trim() === '') return
    blocks.push({
      kind,
      ...(level === undefined ? {} : { level }),
      text,
      anchor: { sourceId, headingPath: [...headingPath], quoteHash: quoteHashOf(text) },
    })
  }

  const element = /<w:(p|tbl)(?=[\s>])/g
  let cursor = 0
  let paragraphs = 0
  for (;;) {
    element.lastIndex = cursor
    const match = element.exec(body)
    if (match === null) break
    const tag = `w:${match[1] ?? 'p'}`
    const end = elementEnd(body, match.index, tag)
    if (end < 0) break
    const xml = body.slice(match.index, end)
    cursor = end

    if (tag === 'w:tbl') {
      push('table', tableText(xml))
      continue
    }
    paragraphs += 1
    const text = paragraphText(xml)
    if (text === '') continue
    const level = headingLevel(xml)
    if (level === undefined) {
      push(xml.includes('<w:numPr') ? 'list' : 'paragraph', text)
      continue
    }
    const depth = Math.max(level, 2)
    headingPath.splice(depth - 1)
    while (headingPath.length < depth - 1) headingPath.push('')
    headingPath.push(text)
    blocks.push({
      kind: 'heading',
      level: depth,
      text,
      anchor: { sourceId, headingPath: [...headingPath], quoteHash: quoteHashOf(text) },
    })
  }

  const degradation: ParseDegradation[] = []
  if (paragraphs === 0) {
    degradation.push({ kind: 'empty-source', reason: 'the document body holds no paragraphs' })
  }
  return { sourceId, title, parser: 'docx@1', blocks, degradation }
}
