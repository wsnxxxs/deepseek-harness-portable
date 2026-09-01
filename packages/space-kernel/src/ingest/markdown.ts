/**
 * The emitter: one {@link ParsedSource} becomes the extracted markdown a learner
 * (and `grep`) can read, plus the {@link SourceStructure} that is the single
 * source of truth for section ids and anchors.
 *
 * Nothing here consults a model. Every section id, label, and page marker is
 * derived from the parse, which is what makes a hallucinated chapter detectable
 * rather than merely discouraged.
 * @module @dsh-portable/interactive-learning/src/ingest/markdown
 */

import {
  SOURCE_STRUCTURE_PROTOCOL,
  quoteHashOf,
  sectionIdOf,
  type ParsedBlock,
  type ParsedSource,
  type SourceSection,
  type SourceStructure,
} from './types.ts'

/** Marker opening every extracted file; also the reimport provenance record. */
export const EXTRACTED_HEADER = 'dsh-learning:source'

/** Page markers are `<!-- p.N -->` on their own line. */
export const PAGE_MARKER = /^<!--\s*p\.(\d+)\s*-->$/

function escapeAttribute(value: string): string {
  return value.replace(/["\\]/gu, '\\$&').replace(/\s+/gu, ' ').trim()
}

/** The rendered markdown plus the line each heading block landed on. */
interface RenderedSource {
  markdown: string
  /** 1-based line per heading block, in the order the headings were emitted. */
  headingLines: readonly number[]
  totalLines: number
}

/**
 * Render the extracted markdown, recording where each heading landed.
 *
 * Line positions are captured during rendering rather than recovered afterwards
 * so the structure can never disagree with the file it describes — a section
 * whose recorded line points at the wrong text would make every read from it
 * quote the wrong passage.
 */
function renderSource(source: ParsedSource): RenderedSource {
  const lines: string[] = [
    `<!-- ${EXTRACTED_HEADER} id=${source.sourceId} title="${escapeAttribute(source.title)}" parser=${source.parser} -->`,
    '',
  ]
  const headingLines: number[] = []
  let page: number | undefined
  // Every push is exactly one physical line: block text may span several, and a
  // recorded line that counted a multi-line block as one would put every later
  // section's extent off by the difference.
  for (const block of source.blocks) {
    if (block.anchor.page !== undefined && block.anchor.page !== page) {
      page = block.anchor.page
      lines.push(`<!-- p.${page} -->`)
    }
    switch (block.kind) {
      case 'heading':
        headingLines.push(lines.length + 1)
        lines.push(`${'#'.repeat(block.level ?? 1)} ${block.text}`, '')
        break
      case 'code':
        lines.push(`\`\`\`${block.lang ?? ''}`, ...block.text.split('\n'), '```', '')
        break
      case 'caption':
        lines.push(...block.text.split('\n').map(line => `> ${line}`), '')
        break
      default:
        lines.push(...block.text.split('\n'), '')
    }
  }
  return { markdown: `${lines.join('\n')}\n`, headingLines, totalLines: lines.length }
}

/**
 * Render the extracted markdown for one parsed source.
 * @param source - The parse result.
 * @returns markdown text, ending with a newline.
 */
export function renderExtractedMarkdown(source: ParsedSource): string {
  return renderSource(source).markdown
}

/** The extracted markdown and its structure, produced together. */
export interface EmittedSource {
  markdown: string
  structure: SourceStructure
}

/**
 * Emit both artifacts of one parse in a single pass.
 *
 * This is the ingest pipeline's entry point: rendering and structure derivation
 * share the line positions, so the two files written to a vault always agree.
 * @param source - The parse result.
 * @param extractedPath - Vault-relative path the markdown will be written to.
 */
export function emitSource(source: ParsedSource, extractedPath: string): EmittedSource {
  const rendered = renderSource(source)
  return {
    markdown: rendered.markdown,
    structure: deriveStructure(source, extractedPath, rendered),
  }
}

/**
 * Derive the navigable structure from a parse.
 *
 * Section ids come from the heading chain, so they survive repagination; a
 * duplicate chain (two chapters genuinely titled the same) is disambiguated by
 * an ordinal suffix rather than silently collapsed, because two sections
 * sharing one id would make every anchor into either of them ambiguous.
 * @param source - The parse result.
 * @param extractedPath - Vault-relative path of the emitted markdown.
 * @returns the structure record written to `.learning/structure/`.
 */
export function deriveStructure(
  source: ParsedSource,
  extractedPath: string,
  rendered: { headingLines: readonly number[]; totalLines: number } = renderSource(source),
): SourceStructure {
  const sections: SourceSection[] = []
  const taken = new Map<string, number>()
  const idByChain = new Map<string, string>()
  let current: SourceSection | undefined
  let totalChars = 0
  let headingIndex = 0

  for (const block of source.blocks) {
    if (block.kind !== 'heading') {
      totalChars += block.text.length
      if (current !== undefined) {
        // The first body block under a heading becomes the section's identity;
        // later blocks only extend its size.
        const opening = current.charCount === 0
          ? { quoteHash: block.anchor.quoteHash }
          : {}
        current = { ...current, ...opening, charCount: current.charCount + block.text.length }
        sections[sections.length - 1] = current
      }
      continue
    }
    const line = rendered.headingLines[headingIndex] ?? 1
    headingIndex += 1
    // Each heading closes the previous section's own body; descendants are read
    // through their own sections rather than folded into an ancestor's extent.
    if (current !== undefined) {
      current = { ...current, endLine: line }
      sections[sections.length - 1] = current
    }
    const chain = block.anchor.headingPath
    const base = sectionIdOf(chain)
    const used = taken.get(base) ?? 0
    taken.set(base, used + 1)
    const id = used === 0 ? base : `${base}~${used + 1}`
    idByChain.set(chain.join('\u0000'), id)
    const parentChain = chain.slice(0, -1)
    const parentId = parentChain.length === 0
      ? undefined
      : idByChain.get(parentChain.join('\u0000'))
    current = {
      id,
      label: block.text,
      level: block.level ?? 1,
      headingPath: [...chain],
      ...(block.anchor.page === undefined ? {} : { page: block.anchor.page }),
      ...(parentId === undefined ? {} : { parentId }),
      charCount: 0,
      quoteHash: block.anchor.quoteHash,
      line,
      endLine: rendered.totalLines + 1,
    }
    sections.push(current)
    totalChars += block.text.length
  }

  return {
    protocol: SOURCE_STRUCTURE_PROTOCOL,
    sourceId: source.sourceId,
    title: source.title,
    parser: source.parser,
    extractedPath,
    sections,
    degradation: source.degradation,
    totalChars,
  }
}

/**
 * Re-anchor one stored anchor against a rebuilt structure, the reimport path.
 *
 * Two resolutions, in order. The heading chain is what a person actually wrote
 * down, so it wins when the section kept its title. The quote hash — the
 * identity of the section's opening BODY text — is what recovers a section that
 * a new edition retitled, which is the case the heading chain cannot survive.
 *
 * Nothing matching is reported as `undefined` so the caller can mark the anchor
 * stale; silently keeping the old page number would assert a location that no
 * longer exists.
 * @param headingPath - The stored heading chain.
 * @param quoteHash - The opening-body identity recorded by the previous parse.
 * @param structure - The freshly derived structure.
 * @returns the matching section, or `undefined` when the anchor is now stale.
 */
export function reanchor(
  headingPath: readonly string[],
  quoteHash: string,
  structure: SourceStructure,
): SourceSection | undefined {
  const key = headingPath.join('\u0000')
  const exact = structure.sections.find(section => section.headingPath.join('\u0000') === key)
  if (exact !== undefined) return exact
  if (quoteHash === '') return undefined
  return structure.sections.find(section => section.quoteHash === quoteHash)
}
