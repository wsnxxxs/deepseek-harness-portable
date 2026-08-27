/**
 * The parsed-source vocabulary shared by every material parser. Types plus the
 * small pure helpers that derive stable identity (slug, quote hash) from block
 * text; no I/O and no parser-specific knowledge lives here.
 *
 * The central rule this file encodes: a source that could only be read in part
 * reports {@link ParseDegradation} as DATA, never as a log line. Downstream
 * teaching policy renders it, so "only part of this source is readable" becomes
 * something the model is told rather than something it must infer.
 * @module @dsh-portable/interactive-learning/src/ingest/types
 */

import { createHash } from 'node:crypto'

/** Structure-file protocol tag; bumped only on a breaking structure change. */
export const SOURCE_STRUCTURE_PROTOCOL = 'dsh-learning-structure@1' as const

/** Vault manifest protocol tag. */
export const VAULT_MANIFEST_PROTOCOL = 'dsh-learning-vault@1' as const

/** Every block kind a parser may emit. Anything finer degrades to `paragraph`. */
export type ParsedBlockKind = 'heading' | 'paragraph' | 'code' | 'table' | 'list' | 'caption'

/**
 * Where one block came from, in terms a human can verify against the original.
 * `headingPath` is the authoritative anchor; `page` is an additional locator
 * only for formats that have pages (pdf) or slides (pptx).
 */
export interface SourceAnchor {
  /** Stable id of the source within its vault. */
  sourceId: string
  /** Heading chain from the document root, outermost first. */
  headingPath: readonly string[]
  /** 1-based page (pdf) or slide (pptx) number; absent for paged-less formats. */
  page?: number
  /** Identity of the block's opening text, for re-anchoring after a reimport. */
  quoteHash: string
}

/** One extracted block of a source, in document order. */
export interface ParsedBlock {
  kind: ParsedBlockKind
  /** Heading depth 1..6; present only when `kind === 'heading'`. */
  level?: number
  text: string
  anchor: SourceAnchor
  /** Fenced-code language when known. */
  lang?: string
}

/**
 * A part of the source that was NOT faithfully read. Reported as data so the
 * teaching layer can state the real coverage boundary instead of implying the
 * whole source was understood.
 */
export type ParseDegradation =
  | { kind: 'image-only-pages'; pages: readonly number[] }
  | { kind: 'multi-column-guess'; pages: readonly number[] }
  | { kind: 'formula-dropped'; count: number }
  | { kind: 'truncated'; afterPage: number; reason: string }
  | { kind: 'unsupported-format'; extension: string }
  | { kind: 'parser-unavailable'; extension: string; module: string }
  | { kind: 'empty-source'; reason: string }

/** A parser's complete output for one source file. */
export interface ParsedSource {
  sourceId: string
  title: string
  /** Parser identity and version, e.g. `pdf@1`; recorded so a parser upgrade forces a rebuild. */
  parser: string
  blocks: readonly ParsedBlock[]
  degradation: readonly ParseDegradation[]
}

/** One navigable section of a source, derived from headings only. */
export interface SourceSection {
  /** Stable, path-derived id, unique within the source. */
  id: string
  label: string
  /** Heading depth 1..6. */
  level: number
  headingPath: readonly string[]
  page?: number
  parentId?: string
  /** Characters of body text under this section, excluding descendants. */
  charCount: number
  /**
   * Identity of this section's OPENING BODY TEXT — not of its heading.
   *
   * Re-anchoring exists for the case where a new edition retitles a section, so
   * hashing the title would defeat the whole mechanism: it changes precisely
   * when the recovery is needed. A section with no body of its own falls back to
   * its heading, which is the best identity available.
   */
  quoteHash: string
  /** 1-based line of this heading in the extracted markdown. */
  line: number
  /**
   * 1-based line just past this section's own body, before the next heading at
   * any depth. Body reads slice `[line, endLine)`; descendants are read through
   * their own sections, which is what keeps progressive disclosure the default.
   */
  endLine: number
}

/**
 * The derived structure of one source: the SINGLE source of truth for section
 * ids, anchors, and `study_map` validation. Rebuilt from the original bytes; it
 * is a cache, never a user asset.
 */
export interface SourceStructure {
  protocol: typeof SOURCE_STRUCTURE_PROTOCOL
  sourceId: string
  title: string
  parser: string
  /** Vault-relative path of the extracted markdown. */
  extractedPath: string
  sections: readonly SourceSection[]
  degradation: readonly ParseDegradation[]
  totalChars: number
}

/** One ingested source as recorded in the vault manifest. */
export interface SourceManifestEntry {
  sourceId: string
  title: string
  originalName: string
  /** Canonical path of the dropped file, used to distinguish same-named sources. */
  originPath?: string
  /** Vault-relative path of the untouched original. */
  sourcePath: string
  /** Vault-relative path of the extracted markdown. */
  extractedPath: string
  /** Vault-relative path of the structure JSON. */
  structurePath: string
  /** SHA-256 of the original bytes; identity for the skip-if-unchanged rule. */
  contentHash: string
  parser: string
  bytes: number
  ingestedAt: string
  degradation: readonly ParseDegradation[]
  /** Pages a vision model re-read after the parser reported them unreadable. */
  reparsed?: {
    pages: readonly number[]
    /** `provider/model` that read them. */
    via: string
    at: string
  }
}

/** `.learning/manifest.json`: the vault's own record of what it holds. */
export interface VaultManifest {
  protocol: typeof VAULT_MANIFEST_PROTOCOL
  /**
   * Topic name recorded at creation. The workspace registry's title outranks it
   * when one is composed — that is the name a person edits in the sidebar — and
   * the directory's own name is the last fallback.
   */
  title?: string
  createdAt: string
  updatedAt: string
  sources: readonly SourceManifestEntry[]
}

const SLUG_STRIP = /[^\p{Letter}\p{Number}]+/gu
const MAX_SLUG_LENGTH = 64

/**
 * Derive a filesystem- and anchor-safe slug. Letters and numbers of any script
 * survive (CJK headings must stay readable), everything else becomes a hyphen.
 * @param value - Raw label or filename.
 * @param fallback - Slug used when `value` carries no letters or numbers.
 * @returns the slug, never empty and never longer than 64 characters.
 */
export function slugify(value: string, fallback = 'source'): string {
  const slug = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(SLUG_STRIP, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')
  return slug === '' ? fallback : slug
}

const QUOTE_SAMPLE_LENGTH = 160
const QUOTE_HASH_LENGTH = 16

/** Collapse whitespace so a reflowed line still hashes to the same identity. */
export function normalizeQuote(text: string): string {
  return text.normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

/**
 * Identity of a block's opening text, used to re-anchor a note after the source
 * is replaced by an edited edition.
 * @param text - The block's text.
 * @returns 16 lowercase hex characters.
 */
export function quoteHashOf(text: string): string {
  const sample = normalizeQuote(text).slice(0, QUOTE_SAMPLE_LENGTH)
  return createHash('sha256').update(sample, 'utf8').digest('hex').slice(0, QUOTE_HASH_LENGTH)
}

/** SHA-256 of a source's original bytes; the skip-if-unchanged identity. */
export function contentHashOf(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Section id derived from the heading chain, so an id survives page renumbering
 * and stays readable in a note's `anchors` list.
 * @param headingPath - Heading chain, outermost first.
 * @returns slug chain joined by `/`, or `''` for the document root.
 */
export function sectionIdOf(headingPath: readonly string[]): string {
  return headingPath.map(part => slugify(part, 'section')).join('/')
}

/** Human-readable anchor text, the form that reaches `sourceAnchors`. */
export function formatAnchor(anchor: SourceAnchor): string {
  const path = anchor.headingPath.join(' › ')
  const location = path === '' ? anchor.sourceId : `${anchor.sourceId}#${path}`
  return anchor.page === undefined ? location : `${location} (p.${anchor.page})`
}
