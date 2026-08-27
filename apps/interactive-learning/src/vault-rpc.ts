/**
 * The vault panel's host face: read-only queries over one topic vault.
 *
 * Every endpoint here is a thin wrapper over machinery that already exists —
 * `readManifest`, `readAllStructures`, `readConceptCards`, the retrieval
 * scorer. Nothing in this module calls a model, and nothing in it writes: the
 * panel's S1 surface is a window onto the folder, so a bug here can lose a
 * query result but never a learner's file.
 *
 * Containment is enforced the same way the model-facing tools enforce it —
 * every path is resolved through {@link containedPath} — even though the caller
 * is the app's own UI rather than the model. The panel passes a `cwd` that came
 * from the session list, and a session's cwd is not something this module gets
 * to trust blindly.
 * @module @dsh-portable/interactive-learning/src/vault-rpc
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { isConceptDue, readConceptCards, type ConceptCardRating } from './concept-cards.ts'
import { excerptAround, keyPhrases, matchedTerms } from './material-retrieval.ts'
import {
  correctConcept,
  deferConcept,
  listConcepts,
  rateConcept,
  readConceptFile,
  reviewQueue,
  saveConceptBody,
  type PanelConcept,
} from './vault-concepts.ts'
import {
  deleteNote,
  listNotes,
  promoteNote,
  readNote,
  saveNote,
  type NoteKind,
  type PanelNote,
} from './vault-notes.ts'
import {
  materialRouteInfo,
  reparsePages,
  MAX_REPARSE_PAGES,
  type MaterialRouteInfo,
  type ReparseResult,
} from './material-vision.ts'
import type { ParseDegradation, SourceSection, SourceStructure } from './ingest/types.ts'
import {
  containedPath,
  readAllStructures,
  readManifest,
  resolveTopicVault,
  vaultRelative,
  VaultContainmentError,
  type TopicVault,
} from './topic-vault.ts'

/** Wire protocol tag; bumped only on a breaking panel-payload change. */
export const VAULT_RPC_PROTOCOL = 'dsh-learning/vault@1' as const

/**
 * Endpoints this router owns.
 *
 * `vault/*` reads the folder; `concepts/*` is the only group that writes, and
 * every one of its writes is a direct consequence of a button a person pressed.
 */
export const VAULT_RPC_ENDPOINTS = [
  'vault/probe',
  'vault/summary',
  'vault/sources',
  'vault/read',
  'vault/search',
  'concepts/list',
  'concepts/review',
  'concepts/rate',
  'concepts/defer',
  'concepts/correct',
  'concepts/save',
  'concepts/file',
  'notes/list',
  'notes/read',
  'notes/save',
  'notes/promote',
  'notes/delete',
  'vault/roster',
  'material/route-info',
  'material/reparse-pages',
] as const

export type VaultRpcEndpoint = typeof VAULT_RPC_ENDPOINTS[number]

/** Longest body one `vault/read` returns; the panel drills down for more. */
export const MAX_PANEL_READ_CHARS = 12_000

/** Longest excerpt per search hit. */
export const MAX_PANEL_EXCERPT_CHARS = 220

/** Hits returned per group, so one enormous source cannot crowd out the rest. */
export const MAX_PANEL_HITS = 20

/**
 * Every answer shape the panel branches on.
 *
 * `no-vault` is deliberately distinct from `empty`: "this folder is not a
 * learning vault" and "this vault holds nothing yet" lead to different screens,
 * and collapsing them is how an empty state ends up lying.
 */
export type VaultStatus =
  | 'ok' | 'no-vault' | 'empty' | 'unknown-source' | 'unknown-section' | 'unknown-concept'
  | 'unknown-note' | 'not-pending' | 'gate-blocked'

/** Note kinds the panel may write; the closed set `saveNote` accepts. */
export const NOTE_KINDS: readonly NoteKind[] = ['note', 'pending-concept']

function isNoteKind(value: string | undefined): value is NoteKind {
  return value !== undefined && (NOTE_KINDS as readonly string[]).includes(value)
}

/** A note write answers with the note, or says which note was missing. */
function answerNote(note: PanelNote | undefined): RpcAnswer<unknown> {
  return note === undefined
    ? { ok: true, value: { status: 'unknown-note', protocol: VAULT_RPC_PROTOCOL } }
    : { ok: true, value: { status: 'ok', protocol: VAULT_RPC_PROTOCOL, note } }
}

/** Ratings the review deck may send; the closed set `nextReviewSchedule` accepts. */
export const CONCEPT_RATINGS: readonly ConceptCardRating[] = ['revealed', 'review', 'mastered']

function isRating(value: string | undefined): value is ConceptCardRating {
  return value !== undefined && (CONCEPT_RATINGS as readonly string[]).includes(value)
}

/** A concept write answers with the card, or says which card was missing. */
function answerConcept(concept: PanelConcept | undefined): RpcAnswer<unknown> {
  return concept === undefined
    ? { ok: true, value: { status: 'unknown-concept', protocol: VAULT_RPC_PROTOCOL } }
    : { ok: true, value: { status: 'ok', protocol: VAULT_RPC_PROTOCOL, concept } }
}

/** One source as the panel lists it. */
export interface PanelSource {
  sourceId: string
  title: string
  originalName: string
  parser: string
  bytes: number
  ingestedAt: string
  /** Vault-relative, shown so a person can find the file themselves. */
  sourcePath: string
  extractedPath: string
  totalChars: number
  sectionCount: number
  /**
   * Highest page number any section carries, or `0` for a format without pages.
   *
   * A LOWER BOUND on the document's length, not the page count: the parsers do
   * not persist `numPages`, so claiming "47 of 51 pages" here would be inventing
   * the denominator. The panel therefore reports what was read and lists the
   * degradation pages exactly, and never renders a percentage.
   */
  lastPage: number
  degradation: readonly ParseDegradation[]
  sections: readonly PanelSection[]
}

/** One section of the structure tree, flattened in document order. */
export interface PanelSection {
  id: string
  label: string
  level: number
  page?: number
  charCount: number
  /** True when a degradation entry names a page inside this section's span. */
  degraded: boolean
}

/** Counts for the panel header. */
export interface VaultSummary {
  status: VaultStatus
  protocol: typeof VAULT_RPC_PROTOCOL
  title: string
  /** Absolute path; the panel shows it verbatim as the "this is your folder" proof. */
  root: string
  sources: number
  concepts: number
  notes: number
  /** Notes still waiting on the concept gate; the inbox badge. */
  pendingNotes: number
  /** Concept cards whose `due` is today or earlier. */
  due: number
  /** Sources carrying at least one degradation entry. */
  degradedSources: number
}

/** One search hit, in any of the three groups. */
export interface PanelHit {
  /** `extracted/<slug>.md`, `concepts/<slug>.md`, or `notes/<name>.md`. */
  path: string
  title: string
  /** Section label for material hits; absent for concepts and notes. */
  section?: string
  sourceId?: string
  sectionId?: string
  page?: number
  excerpt: string
  /** Distinct query terms this hit matched; also the ranking key. */
  matched: readonly string[]
}

/** Grouped search results. Groups stay separate so one cannot bury another. */
export interface PanelSearchResult {
  status: VaultStatus
  protocol: typeof VAULT_RPC_PROTOCOL
  /** The terms the scorer actually used, so a zero-hit query is explainable. */
  terms: readonly string[]
  material: readonly PanelHit[]
  concepts: readonly PanelHit[]
  notes: readonly PanelHit[]
}

/** One section's body, resolved from its anchor rather than a line range. */
export interface PanelRead {
  status: VaultStatus
  protocol: typeof VAULT_RPC_PROTOCOL
  sourceId: string
  sectionId: string
  title: string
  label: string
  headingPath: readonly string[]
  page?: number
  body: string
  /** True when the body was cut at {@link MAX_PANEL_READ_CHARS}. */
  truncated: boolean
  /** Immediate children, so the panel can drill down instead of dumping a chapter. */
  children: readonly PanelSection[]
}

interface RpcOk<T> { ok: true; value: T }
interface RpcFail { ok: false; error: { code: string; message: string; details: { issues: readonly unknown[] } } }
type RpcAnswer<T> = RpcOk<T> | RpcFail

function fail(code: string, message: string): RpcFail {
  return { ok: false, error: { code, message, details: { issues: [] } } }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

/**
 * Pages a source's degradation entries name, as a flat set.
 *
 * `formula-dropped` carries no page, so a source can be degraded without any
 * section being marked — which is correct: the panel still shows the chip.
 */
function degradedPages(degradation: readonly ParseDegradation[]): ReadonlySet<number> {
  const pages = new Set<number>()
  for (const item of degradation) {
    if (item.kind === 'image-only-pages' || item.kind === 'multi-column-guess') {
      for (const page of item.pages) pages.add(page)
    }
  }
  return pages
}

/**
 * Whether a degraded page falls inside one section's page span.
 *
 * The span runs from this section's page up to (not including) the page of the
 * next section that declares one. A source with no page numbers never marks a
 * section, which is right: there is nothing to point at.
 */
function sectionSpanDegraded(
  sections: readonly SourceSection[],
  index: number,
  pages: ReadonlySet<number>,
): boolean {
  const from = sections[index]?.page
  if (from === undefined || pages.size === 0) return false
  let until = Number.POSITIVE_INFINITY
  for (let next = index + 1; next < sections.length; next += 1) {
    const page = sections[next]?.page
    if (page !== undefined && page > from) { until = page; break }
  }
  for (const page of pages) {
    if (page >= from && page < until) return true
  }
  return false
}

function panelSections(structure: SourceStructure): readonly PanelSection[] {
  const pages = degradedPages(structure.degradation)
  return structure.sections.map((section, index) => ({
    id: section.id,
    label: section.label,
    level: section.level,
    ...(section.page === undefined ? {} : { page: section.page }),
    charCount: section.charCount,
    degraded: sectionSpanDegraded(structure.sections, index, pages),
  }))
}

function lastPageOf(structure: SourceStructure): number {
  let last = 0
  for (const section of structure.sections) {
    if (section.page !== undefined && section.page > last) last = section.page
  }
  for (const item of structure.degradation) {
    if (item.kind === 'image-only-pages' || item.kind === 'multi-column-guess') {
      for (const page of item.pages) if (page > last) last = page
    }
    if (item.kind === 'truncated' && item.afterPage > last) last = item.afterPage
  }
  return last
}

/** Body lines of one section, excluding descendants (the `[line, endLine)` span). */
function sectionBody(lines: readonly string[], section: SourceSection): string {
  return lines
    .slice(section.line, Math.max(section.line, section.endLine - 1))
    .join('\n')
    // Page markers are machine anchors, not prose; the panel renders the page
    // number as a chip instead of leaving `<!-- p.42 -->` in the reading text.
    .replace(/^<!--\s*p\.\d+\s*-->$/gmu, '')
    .trim()
}

async function extractedLines(vault: TopicVault, structure: SourceStructure): Promise<readonly string[]> {
  const path = await containedPath(vault, structure.extractedPath)
  return (await readFile(path, 'utf8')).split('\n')
}

/** Directory listing that treats "not there" as "nothing in it". */
async function markdownNames(directory: string): Promise<readonly string[]> {
  try {
    return (await readdir(directory)).filter(name => name.endsWith('.md')).sort()
  } catch {
    return []
  }
}

/** Rosters read at most this many candidate folders in one call. */
export const MAX_ROSTER_CWDS = 24

/** One vault as the out-of-session sidebar entry lists it. */
export interface RosterVault {
  cwd: string
  title: string
  root: string
  sources: number
  concepts: number
  notes: number
  /** Concept cards due today or earlier. */
  due: number
  /** Pending drafts still waiting on the concept gate. */
  blocked: number
}

/** The whole roster plus the one number the sidebar badges. */
export interface VaultRoster {
  status: 'ok'
  protocol: typeof VAULT_RPC_PROTOCOL
  vaults: readonly RosterVault[]
  /** Cards due across every vault; the badge. */
  due: number
}

/**
 * Vault stats for a set of candidate folders.
 *
 * The CLIENT supplies the folders, deduped from its own session list, rather
 * than the Host enumerating workspaces. Every path therefore already came from
 * a session the app is showing, and each one is still resolved through
 * {@link resolveTopicVault} — so this endpoint opens no directory the panel's
 * other reads could not already open. A folder that is not a vault is omitted
 * rather than reported: the sidebar lists learning topics, and a roster full of
 * "not a vault" rows would be a list of the person's unrelated code projects.
 */
export async function vaultRoster(
  ctx: Context,
  cwds: readonly string[],
): Promise<VaultRoster> {
  const seen = new Set<string>()
  const vaults: RosterVault[] = []
  for (const cwd of cwds.slice(0, MAX_ROSTER_CWDS)) {
    if (seen.has(cwd)) continue
    seen.add(cwd)
    let vault: TopicVault | undefined
    try {
      vault = await resolveTopicVault(ctx, cwd)
    } catch {
      // A folder that has been deleted or become unreadable since the session
      // list was published is skipped, never fatal for the whole roster.
      continue
    }
    if (vault === undefined) continue
    const [summary, notes] = await Promise.all([vaultSummary(vault), listNotes(vault)])
    vaults.push({
      cwd,
      title: vault.title,
      root: vault.root,
      sources: summary.sources,
      concepts: summary.concepts,
      notes: notes.notes.length,
      due: summary.due,
      blocked: notes.blocked,
    })
  }
  vaults.sort((left, right) => right.due - left.due || left.title.localeCompare(right.title))
  return {
    status: 'ok',
    protocol: VAULT_RPC_PROTOCOL,
    vaults,
    due: vaults.reduce((total, vault) => total + vault.due, 0),
  }
}

/** Vault resolution shared by every endpoint; `undefined` means "not a vault". */
async function vaultAt(ctx: Context, payload: unknown): Promise<TopicVault | undefined> {
  const cwd = text(record(payload)?.cwd)
  return cwd === undefined ? undefined : await resolveTopicVault(ctx, cwd)
}

/** Counts for the panel header. */
export async function vaultSummary(vault: TopicVault): Promise<VaultSummary> {
  const [manifest, cards, notes] = await Promise.all([
    readManifest(vault),
    readConceptCards(vault),
    listNotes(vault),
  ])
  return {
    status: manifest.sources.length === 0 && cards.length === 0 && notes.notes.length === 0 ? 'empty' : 'ok',
    protocol: VAULT_RPC_PROTOCOL,
    title: vault.title,
    root: vault.root,
    sources: manifest.sources.length,
    concepts: cards.length,
    notes: notes.notes.length,
    pendingNotes: notes.blocked,
    due: cards.filter(card => isConceptDue(card.due)).length,
    degradedSources: manifest.sources.filter(entry => entry.degradation.length > 0).length,
  }
}

/**
 * Every source with its structure tree.
 *
 * Manifest and structure are joined here rather than in the client: the
 * manifest owns provenance (hash, parser, when) and the structure owns shape,
 * and a panel row needs both. A manifest entry whose structure file is missing
 * is still listed — with no sections — because hiding it would hide exactly the
 * case a person needs to see.
 */
export async function vaultSources(vault: TopicVault): Promise<{
  status: VaultStatus
  protocol: typeof VAULT_RPC_PROTOCOL
  sources: readonly PanelSource[]
}> {
  const [manifest, structures] = await Promise.all([readManifest(vault), readAllStructures(vault)])
  const byId = new Map(structures.map(structure => [structure.sourceId, structure]))
  const sources = manifest.sources.map((entry): PanelSource => {
    const structure = byId.get(entry.sourceId)
    return {
      sourceId: entry.sourceId,
      title: entry.title,
      originalName: entry.originalName,
      parser: entry.parser,
      bytes: entry.bytes,
      ingestedAt: entry.ingestedAt,
      sourcePath: entry.sourcePath,
      extractedPath: entry.extractedPath,
      totalChars: structure?.totalChars ?? 0,
      sectionCount: structure?.sections.length ?? 0,
      lastPage: structure === undefined ? 0 : lastPageOf(structure),
      degradation: entry.degradation,
      sections: structure === undefined ? [] : panelSections(structure),
    }
  })
  return {
    status: sources.length === 0 ? 'empty' : 'ok',
    protocol: VAULT_RPC_PROTOCOL,
    sources,
  }
}

/** One section's own body plus its immediate children. */
export async function vaultRead(
  vault: TopicVault,
  sourceId: string,
  sectionId: string,
): Promise<PanelRead | { status: VaultStatus; protocol: typeof VAULT_RPC_PROTOCOL }> {
  const structures = await readAllStructures(vault)
  const structure = structures.find(candidate => candidate.sourceId === sourceId)
  if (structure === undefined) return { status: 'unknown-source', protocol: VAULT_RPC_PROTOCOL }
  const index = structure.sections.findIndex(section => section.id === sectionId)
  const section = structure.sections[index]
  if (section === undefined) return { status: 'unknown-section', protocol: VAULT_RPC_PROTOCOL }

  const lines = await extractedLines(vault, structure)
  const raw = sectionBody(lines, section)
  const pages = degradedPages(structure.degradation)
  const children: PanelSection[] = []
  for (let next = index + 1; next < structure.sections.length; next += 1) {
    const candidate = structure.sections[next]
    if (candidate === undefined || candidate.level <= section.level) break
    if (candidate.level !== section.level + 1) continue
    children.push({
      id: candidate.id,
      label: candidate.label,
      level: candidate.level,
      ...(candidate.page === undefined ? {} : { page: candidate.page }),
      charCount: candidate.charCount,
      degraded: sectionSpanDegraded(structure.sections, next, pages),
    })
  }

  return {
    status: 'ok',
    protocol: VAULT_RPC_PROTOCOL,
    sourceId,
    sectionId,
    title: structure.title,
    label: section.label,
    headingPath: section.headingPath,
    ...(section.page === undefined ? {} : { page: section.page }),
    body: raw.slice(0, MAX_PANEL_READ_CHARS),
    truncated: raw.length > MAX_PANEL_READ_CHARS,
    children,
  }
}

/**
 * Free-text search over material, concept cards, and notes.
 *
 * Ranking is {@link matchedTerms} — the same distinct-term count the model's
 * retrieval uses — over {@link keyPhrases} of the query, so what a person finds
 * here is exactly what the model can reach. No model call, no index, no network.
 */
export async function vaultSearch(vault: TopicVault, query: string): Promise<PanelSearchResult> {
  const terms = keyPhrases(query)
  const empty: PanelSearchResult = {
    status: 'ok', protocol: VAULT_RPC_PROTOCOL, terms, material: [], concepts: [], notes: [],
  }
  if (terms.length === 0) return empty

  const material: (PanelHit & { score: number })[] = []
  for (const structure of await readAllStructures(vault)) {
    let lines: readonly string[]
    try {
      lines = await extractedLines(vault, structure)
    } catch {
      // A structure whose extracted markdown was deleted by hand is skipped,
      // never fatal: tolerating hand-edited folders is the price of the format.
      continue
    }
    for (const section of structure.sections) {
      const body = sectionBody(lines, section)
      const matched = matchedTerms(`${section.label}\n${body}`, terms)
      if (matched.length === 0) continue
      material.push({
        path: structure.extractedPath,
        title: structure.title,
        section: section.label,
        sourceId: structure.sourceId,
        sectionId: section.id,
        ...(section.page === undefined ? {} : { page: section.page }),
        excerpt: excerptAround(body, matched, MAX_PANEL_EXCERPT_CHARS),
        matched,
        score: matched.length,
      })
    }
  }

  const concepts: (PanelHit & { score: number })[] = []
  for (const card of await readConceptCards(vault)) {
    const haystack = [card.label, card.explanation, ...card.misconceptions, card.unverifiedTransfer].join('\n')
    const matched = matchedTerms(haystack, terms)
    if (matched.length === 0) continue
    concepts.push({
      path: vaultRelative(vault, card.path),
      title: card.label,
      excerpt: excerptAround(card.explanation === '' ? haystack : card.explanation, matched, MAX_PANEL_EXCERPT_CHARS),
      matched,
      score: matched.length,
    })
  }

  const notes: (PanelHit & { score: number })[] = []
  // Through the notes store rather than raw file reads: searching the raw file
  // would match a note's own frontmatter, so a query for "concept" would hit
  // every pending draft on the word in its `kind:` line rather than its prose.
  for (const note of (await listNotes(vault)).notes) {
    const matched = matchedTerms(`${note.title}
${note.body}`, terms)
    if (matched.length === 0) continue
    notes.push({
      path: note.path,
      title: note.title,
      excerpt: excerptAround(note.body, matched, MAX_PANEL_EXCERPT_CHARS),
      matched,
      score: matched.length,
    })
  }

  const rank = <T extends { score: number }>(hits: T[]): T[] =>
    hits.sort((left, right) => right.score - left.score).slice(0, MAX_PANEL_HITS)

  return {
    ...empty,
    material: rank(material).map(({ score: _score, ...hit }) => hit),
    concepts: rank(concepts).map(({ score: _score, ...hit }) => hit),
    notes: rank(notes).map(({ score: _score, ...hit }) => hit),
  }
}

/** Whether an endpoint name belongs to this router. */
export function isVaultEndpoint(endpoint: string): endpoint is VaultRpcEndpoint {
  return (VAULT_RPC_ENDPOINTS as readonly string[]).includes(endpoint)
}

/**
 * Dispatch one panel query.
 *
 * Returns the Connection RPC envelope directly so the broker can forward it
 * unchanged. A folder that is not a vault answers `{ status: 'no-vault' }` with
 * `ok: true` — it is a legitimate answer to a legitimate question (the gate asks
 * it on every session switch), not a transport failure.
 * @param ctx - Host context, used only to resolve the workspace registry title.
 * @param endpoint - One of {@link VAULT_RPC_ENDPOINTS}.
 * @param payload - `{ cwd }` plus per-endpoint fields.
 * @returns the RPC envelope.
 */
export async function handleVaultEndpoint(
  ctx: Context,
  endpoint: VaultRpcEndpoint,
  payload: unknown,
): Promise<RpcAnswer<unknown>> {
  const fields = record(payload)
  if (fields === undefined) return fail('bad-request', 'vault RPC requires an object payload')
  try {
    // `vault/roster` is the one endpoint with no folder of its own: the sidebar
    // entry lives outside every session, so it asks about a LIST of candidate
    // folders and may legitimately supply no `cwd` at all.
    if (endpoint === 'vault/roster') {
      const listed = Array.isArray(fields.cwds)
        ? fields.cwds.filter((value): value is string => typeof value === 'string' && value.trim() !== '')
        : []
      const own = text(fields.cwd)
      // The caller's own folder leads, so a person standing in a vault sees it
      // first whether or not the client remembered to include it.
      return { ok: true, value: await vaultRoster(ctx, own === undefined ? listed : [own, ...listed]) }
    }
    if (text(fields.cwd) === undefined) {
      return fail('bad-request', 'vault RPC requires a non-empty cwd')
    }
    const vault = await vaultAt(ctx, payload)
    if (endpoint === 'vault/probe') {
      return { ok: true, value: { protocol: VAULT_RPC_PROTOCOL, vault: vault !== undefined } }
    }
    if (vault === undefined) {
      return { ok: true, value: { status: 'no-vault', protocol: VAULT_RPC_PROTOCOL } }
    }
    switch (endpoint) {
      case 'vault/summary':
        return { ok: true, value: await vaultSummary(vault) }
      case 'vault/sources':
        return { ok: true, value: await vaultSources(vault) }
      case 'vault/read': {
        const sourceId = text(fields.sourceId)
        const sectionId = text(fields.sectionId)
        if (sourceId === undefined || sectionId === undefined) {
          return fail('bad-request', 'vault/read requires sourceId and sectionId')
        }
        return { ok: true, value: await vaultRead(vault, sourceId, sectionId) }
      }
      case 'vault/search':
        return { ok: true, value: await vaultSearch(vault, text(fields.query) ?? '') }
      case 'concepts/list':
        return { ok: true, value: await listConcepts(vault) }
      case 'concepts/review':
        return { ok: true, value: await reviewQueue(vault) }
      case 'concepts/rate': {
        const slug = text(fields.conceptSlug)
        const rating = text(fields.rating)
        if (slug === undefined || !isRating(rating)) {
          return fail('bad-request', `concepts/rate requires conceptSlug and one of ${CONCEPT_RATINGS.join(', ')}`)
        }
        return answerConcept(await rateConcept(vault, slug, rating))
      }
      case 'concepts/defer': {
        const slug = text(fields.conceptSlug)
        const days = Number(fields.days)
        if (slug === undefined || !Number.isFinite(days) || days < 1) {
          return fail('bad-request', 'concepts/defer requires conceptSlug and a positive day count')
        }
        return answerConcept(await deferConcept(vault, slug, days))
      }
      case 'concepts/correct': {
        const slug = text(fields.conceptSlug)
        if (slug === undefined) return fail('bad-request', 'concepts/correct requires conceptSlug')
        return answerConcept(await correctConcept(vault, slug))
      }
      case 'concepts/save': {
        const slug = text(fields.conceptSlug)
        // The body may legitimately be emptied; only its absence is a fault.
        const body = typeof fields.body === 'string' ? fields.body : undefined
        if (slug === undefined || body === undefined) {
          return fail('bad-request', 'concepts/save requires conceptSlug and body')
        }
        return answerConcept(await saveConceptBody(vault, slug, body))
      }
      case 'concepts/file': {
        const slug = text(fields.conceptSlug)
        if (slug === undefined) return fail('bad-request', 'concepts/file requires conceptSlug')
        const file = await readConceptFile(vault, slug)
        return file === undefined
          ? { ok: true, value: { status: 'unknown-concept', protocol: VAULT_RPC_PROTOCOL } }
          : { ok: true, value: { status: 'ok', protocol: VAULT_RPC_PROTOCOL, ...file } }
      }
      case 'notes/list':
        return { ok: true, value: { protocol: VAULT_RPC_PROTOCOL, ...await listNotes(vault) } }
      case 'notes/read': {
        const slug = text(fields.noteSlug)
        if (slug === undefined) return fail('bad-request', 'notes/read requires noteSlug')
        return answerNote(await readNote(vault, slug))
      }
      case 'notes/save': {
        // An emptied body is a legitimate edit; only its absence is a fault.
        const body = typeof fields.body === 'string' ? fields.body : undefined
        if (body === undefined) return fail('bad-request', 'notes/save requires body')
        let kind: NoteKind | undefined
        const kindText = text(fields.kind)
        if (kindText !== undefined) {
          if (!isNoteKind(kindText)) {
            return fail('bad-request', `notes/save kind must be one of ${NOTE_KINDS.join(', ')}`)
          }
          kind = kindText
        }
        const noteSlug = text(fields.noteSlug)
        const title = text(fields.title)
        const conceptSlug = text(fields.conceptSlug)
        const sessionId = text(fields.sessionId)
        const messageId = text(fields.messageId)
        return answerNote(await saveNote(vault, {
          ...(noteSlug === undefined ? {} : { noteSlug }),
          ...(title === undefined ? {} : { title }),
          ...(kind === undefined ? {} : { kind }),
          ...(conceptSlug === undefined ? {} : { conceptSlug }),
          ...(sessionId === undefined ? {} : { sourceSessionId: sessionId }),
          ...(messageId === undefined ? {} : { sourceMessageId: messageId }),
          body,
        }))
      }
      case 'notes/promote': {
        const slug = text(fields.noteSlug)
        if (slug === undefined) return fail('bad-request', 'notes/promote requires noteSlug')
        const promotion = await promoteNote(vault, slug)
        // The blocked answer carries the note anyway: the panel has to be able
        // to say WHICH concept is still missing a card, not just that one is.
        return { ok: true, value: { protocol: VAULT_RPC_PROTOCOL, ...promotion } }
      }
      case 'material/route-info': {
        const sourceId = text(fields.sourceId)
        if (sourceId === undefined) return fail('bad-request', 'material/route-info requires sourceId')
        const info: MaterialRouteInfo = await materialRouteInfo(ctx, vault, sourceId, {
          cwd: text(fields.cwd),
          sessionId: text(fields.sessionId),
        })
        return { ok: true, value: { protocol: VAULT_RPC_PROTOCOL, ...info } }
      }
      case 'material/reparse-pages': {
        const sourceId = text(fields.sourceId)
        if (sourceId === undefined) return fail('bad-request', 'material/reparse-pages requires sourceId')
        const pages = Array.isArray(fields.pages)
          ? fields.pages
            .filter((value): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
            .slice(0, MAX_REPARSE_PAGES)
          : undefined
        // The one endpoint in this router that can spend money. It re-checks
        // the route itself rather than trusting a `route-info` the panel may
        // have fetched minutes ago against a since-changed model selection.
        const result: ReparseResult = await reparsePages(
          ctx,
          vault,
          sourceId,
          pages,
          undefined,
          undefined,
          { cwd: text(fields.cwd), sessionId: text(fields.sessionId) },
        )
        return { ok: true, value: { protocol: VAULT_RPC_PROTOCOL, ...result } }
      }
      case 'notes/delete': {
        const slug = text(fields.noteSlug)
        if (slug === undefined) return fail('bad-request', 'notes/delete requires noteSlug')
        return {
          ok: true,
          value: {
            protocol: VAULT_RPC_PROTOCOL,
            status: await deleteNote(vault, slug) ? 'ok' : 'unknown-note',
            noteSlug: slug,
          },
        }
      }
    }
  } catch (cause) {
    if (cause instanceof VaultContainmentError) {
      return fail('forbidden', cause.message)
    }
    return fail('internal', cause instanceof Error ? cause.message : String(cause))
  }
}
