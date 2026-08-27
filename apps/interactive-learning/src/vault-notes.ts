/**
 * The vault panel's notes store — the fourth pain point's backend.
 *
 * `notes/` has existed since `ensureVaultLayout` first created it and nothing
 * in this repository has ever written to it. This module is that writer, and
 * it also holds the 待确认概念卡 inbox, because an inbox entry is not a
 * different kind of object from a note: both are prose a learner chose to keep,
 * and both belong in a file they can open in any editor. One `kind` field in
 * the frontmatter is the whole difference.
 *
 * Keeping the inbox in `notes/` rather than in a `.learning/*.json` ledger is
 * deliberate. A JSON staging area would be a second, invisible store whose
 * contents a person could neither read nor edit outside this panel — exactly
 * the failure the vault exists to fix. It also keeps the inbox out of
 * `concepts/`, which matters more: `readConceptCards` walks that directory, so
 * a draft parked there would enter the model's study map as a real card and
 * quietly defeat the evidence gate.
 *
 * That gate is the rule this module enforces, and it enforces it by NOT having
 * a way to break it. Nothing here creates a concept card. `promoteNote`
 * succeeds only when a card for that concept ALREADY exists — meaning the
 * learner demonstrated a correct, independent transfer in a teaching session
 * and `saveConceptCard` wrote it — and all promotion then does is attach the
 * kept prose to that card as one more observation. A note whose concept has no
 * card answers `gate-blocked`, forever if need be. Mastery comes from evidence;
 * the panel's job is to hold the draft until the evidence exists.
 * @module @dsh-portable/interactive-learning/src/vault-notes
 */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import {
  dateKey,
  labelFromBody,
  parseMarkdownFrontmatter,
  readConceptCard,
  yamlString,
} from './concept-cards.ts'
import { slugify } from './ingest/types.ts'
import { saveConceptBody, type PanelConcept } from './vault-concepts.ts'
import { vaultRelative, type TopicVault } from './topic-vault.ts'

/**
 * What a kept file is.
 *
 * `pending-concept` is a claim about where the prose is HEADED, never about
 * what it already is: a pending note has no mastery, no schedule and no place
 * in the review deck until a real card exists for its concept.
 */
export type NoteKind = 'note' | 'pending-concept'

/** Whether a pending note's concept has a card yet; `null` for a plain note. */
export type NoteGate = 'blocked' | 'ready' | null

/** Longest note body the panel may write. Prose, not a corpus. */
export const MAX_NOTE_BODY_CHARS = 20_000

/** Longest title; the heading line of the body. */
export const MAX_NOTE_TITLE_CHARS = 160

/** Notes read in one listing, so a vault someone dumped a folder into stays usable. */
export const MAX_NOTES = 200

/** Excerpt length in a listing row. */
const MAX_NOTE_EXCERPT_CHARS = 220

const NOTE_KINDS: ReadonlySet<string> = new Set<NoteKind>(['note', 'pending-concept'])

/** One note as the panel lists it. */
export interface PanelNote {
  noteSlug: string
  kind: NoteKind
  title: string
  /** The editable Markdown, heading included. */
  body: string
  /** First prose line, for a listing row that is not yet open. */
  excerpt: string
  /** Vault-relative, shown so a person can open the file themselves. */
  path: string
  /** Concept this draft is aimed at; `null` on a plain note. */
  conceptSlug: string | null
  /**
   * Whether that concept already has a card.
   *
   * `ready` does NOT mean "this note earned a card" — it means a card exists,
   * so the kept prose has somewhere to land. Nothing in this module can move a
   * note from `blocked` to `ready`; only a teaching session can.
   */
  gate: NoteGate
  /** Where the prose came from, when it was kept off a message. */
  sourceSessionId: string | null
  sourceMessageId: string | null
  /** Concept card this note was merged into, once it has been. */
  promotedTo: string | null
  createdAt: string
  updatedAt: string
}

/** The note list plus the counts the rail and the pending group need. */
export interface PanelNoteList {
  status: 'ok'
  notes: readonly PanelNote[]
  /** Notes whose kind is `pending-concept`, promoted or not. */
  pending: number
  /** Pending notes still waiting on the gate. */
  blocked: number
}

/** The answer shape every note write returns. */
export type NoteWriteStatus = 'ok' | 'unknown-note' | 'not-pending' | 'gate-blocked'

function notePathOf(vault: TopicVault, noteSlug: string): string {
  return join(vault.notes, `${slugify(noteSlug, 'note')}.md`)
}

function clean(value: string, limit: number): string {
  return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/gu, ' ').trim().slice(0, limit)
}

function kindOf(value: string | null | undefined): NoteKind {
  return NOTE_KINDS.has(value ?? '') ? value as NoteKind : 'note'
}

/**
 * The first line of prose under the heading, collapsed.
 *
 * Deliberately skips the heading rather than slicing the raw body: a listing
 * row already shows the title, and an excerpt that repeats it tells a person
 * nothing about which note this is.
 */
function excerptOf(body: string): string {
  const prose = body
    .split('\n')
    .filter(line => !/^#{1,6}\s/u.test(line) && line.trim() !== '')
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim()
  return prose.length > MAX_NOTE_EXCERPT_CHARS
    ? `${prose.slice(0, MAX_NOTE_EXCERPT_CHARS)}…`
    : prose
}

/** Give a body a level-1 heading when it has none, so title and file agree. */
function withHeading(body: string, title: string): string {
  const trimmed = body.trim()
  if (labelFromBody(trimmed) !== '') return trimmed
  const heading = clean(title, MAX_NOTE_TITLE_CHARS)
  if (heading === '') return trimmed
  return trimmed === '' ? `# ${heading}` : `# ${heading}\n\n${trimmed}`
}

function frontmatter(note: Omit<PanelNote, 'gate' | 'excerpt' | 'path' | 'title'>): string {
  const lines = [
    '---',
    `id: ${yamlString(note.noteSlug)}`,
    `kind: ${note.kind}`,
    `concept: ${note.conceptSlug === null ? 'null' : yamlString(note.conceptSlug)}`,
    `promoted_to: ${note.promotedTo === null ? 'null' : yamlString(note.promotedTo)}`,
    `source_session: ${note.sourceSessionId === null ? 'null' : yamlString(note.sourceSessionId)}`,
    `source_message: ${note.sourceMessageId === null ? 'null' : yamlString(note.sourceMessageId)}`,
    `created_at: ${yamlString(note.createdAt)}`,
    `updated_at: ${yamlString(note.updatedAt)}`,
    '---',
  ]
  return `${lines.join('\n')}\n\n`
}

/** Serialize one note back to its file. */
export function renderNote(note: PanelNote): string {
  return `${frontmatter(note)}${note.body.trim()}\n`
}

/**
 * Read one note file.
 *
 * A file with no frontmatter is a note, not an error. `notes/` is a folder in
 * someone's own vault and they are entitled to drop a Markdown file into it by
 * hand; refusing to list what a person can plainly see would make the panel
 * less trustworthy than their file manager.
 */
function parseNote(raw: string, path: string, vault: TopicVault): PanelNote {
  const fileSlug = basename(path, '.md')
  const parsed = parseMarkdownFrontmatter(raw)
  const body = (parsed?.body ?? raw.replace(/\r\n/gu, '\n')).trim()
  const epoch = new Date(0).toISOString()
  const conceptField = parsed?.fields.get('concept') ?? null
  const kind = kindOf(parsed?.fields.get('kind'))
  return {
    noteSlug: slugify(parsed?.fields.get('id') ?? fileSlug, fileSlug),
    kind,
    title: labelFromBody(body) || fileSlug,
    body,
    excerpt: excerptOf(body),
    path: vaultRelative(vault, path),
    // A `pending-concept` with no concept recorded is aimed at nothing, so it
    // is carried as a plain note rather than shown as permanently blocked.
    conceptSlug: kind === 'pending-concept' && conceptField !== null ? conceptField : null,
    gate: null,
    sourceSessionId: parsed?.fields.get('source_session') ?? null,
    sourceMessageId: parsed?.fields.get('source_message') ?? null,
    promotedTo: parsed?.fields.get('promoted_to') ?? null,
    createdAt: parsed?.fields.get('created_at') ?? epoch,
    updatedAt: parsed?.fields.get('updated_at') ?? epoch,
  }
}

/** Resolve the gate for one note by asking whether its card exists yet. */
async function gated(vault: TopicVault, note: PanelNote): Promise<PanelNote> {
  if (note.conceptSlug === null) return note
  const card = await readConceptCard(vault, note.conceptSlug)
  return { ...note, gate: card === undefined ? 'blocked' : 'ready' }
}

/** Read one note, gate resolved. */
export async function readNote(
  vault: TopicVault,
  noteSlug: string,
): Promise<PanelNote | undefined> {
  const path = notePathOf(vault, noteSlug)
  try {
    return await gated(vault, parseNote(await readFile(path, 'utf8'), path, vault))
  } catch {
    return undefined
  }
}

async function noteFileNames(vault: TopicVault): Promise<readonly string[]> {
  try {
    return (await readdir(vault.notes)).filter(name => name.endsWith('.md')).sort()
  } catch {
    return []
  }
}

/**
 * Every note, blocked drafts first.
 *
 * Ordering mirrors the concept list's: the rows that need a decision outrank
 * the rows that only need reading. A blocked draft is the one thing in this
 * section a person may have forgotten about, so it leads; after that, most
 * recently touched first, because notes have no due date to sort by.
 */
export async function listNotes(vault: TopicVault): Promise<PanelNoteList> {
  const notes: PanelNote[] = []
  for (const name of (await noteFileNames(vault)).slice(0, MAX_NOTES)) {
    const path = join(vault.notes, name)
    try {
      notes.push(await gated(vault, parseNote(await readFile(path, 'utf8'), path, vault)))
    } catch {
      // One unreadable file must not take the section down with it.
    }
  }
  notes.sort((left, right) => {
    const rank = (note: PanelNote): number => (note.gate === 'blocked' ? 0 : note.gate === 'ready' ? 1 : 2)
    const difference = rank(left) - rank(right)
    if (difference !== 0) return difference
    return right.updatedAt.localeCompare(left.updatedAt)
  })
  return {
    status: 'ok',
    notes,
    pending: notes.filter(note => note.kind === 'pending-concept').length,
    blocked: notes.filter(note => note.gate === 'blocked').length,
  }
}

/** Fields a caller may set on a note. Everything else is derived or system-owned. */
export interface NoteInput {
  /** Existing note to overwrite; omitted to create one. */
  noteSlug?: string
  /** Used for the slug and, when the body has no heading, as the heading. */
  title?: string
  body: string
  kind?: NoteKind
  /** Concept this draft is aimed at; only meaningful for `pending-concept`. */
  conceptSlug?: string
  sourceSessionId?: string
  sourceMessageId?: string
}

/** A slug not already taken, so keeping two messages under one title cannot clobber. */
async function freeSlug(vault: TopicVault, base: string): Promise<string> {
  const taken = new Set((await noteFileNames(vault)).map(name => basename(name, '.md')))
  if (!taken.has(base)) return base
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${String(suffix)}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${String(Date.now())}`
}

/**
 * Create or overwrite one note.
 *
 * The signature is the rule, as it is for `concepts/save`: there is no mastery,
 * due, interval or anchor parameter, because a note has none of those. What a
 * note can carry beyond its prose is provenance — which session and message it
 * was kept from — and that is written once, at creation, and never editable.
 * @param vault - The vault holding the note.
 * @param input - Prose plus, on creation, kind and provenance.
 * @param now - Injected clock.
 * @returns the saved note, gate resolved.
 */
export async function saveNote(
  vault: TopicVault,
  input: NoteInput,
  now = new Date(),
): Promise<PanelNote> {
  const existing = input.noteSlug === undefined ? undefined : await readNote(vault, input.noteSlug)
  const title = clean(input.title ?? '', MAX_NOTE_TITLE_CHARS)
  const body = withHeading(clean(input.body, MAX_NOTE_BODY_CHARS), title)
  const noteSlug = existing?.noteSlug
    ?? await freeSlug(vault, slugify(title || labelFromBody(body) || 'note', 'note'))
  const kind = input.kind ?? existing?.kind ?? 'note'
  const conceptSlug = kind === 'pending-concept'
    ? (input.conceptSlug === undefined
        ? existing?.conceptSlug ?? slugify(title || labelFromBody(body) || noteSlug, 'concept')
        : slugify(input.conceptSlug, 'concept'))
    : null
  const next: PanelNote = {
    noteSlug,
    kind,
    title: labelFromBody(body) || noteSlug,
    body,
    excerpt: excerptOf(body),
    path: vaultRelative(vault, notePathOf(vault, noteSlug)),
    conceptSlug,
    gate: null,
    // Provenance is write-once: an edit may not relabel where the prose came
    // from, which is what makes the attribution worth anything at all.
    sourceSessionId: existing?.sourceSessionId ?? input.sourceSessionId ?? null,
    sourceMessageId: existing?.sourceMessageId ?? input.sourceMessageId ?? null,
    promotedTo: existing?.promotedTo ?? null,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  }
  await mkdir(vault.notes, { recursive: true })
  await writeFile(notePathOf(vault, noteSlug), renderNote(next), 'utf8')
  return await gated(vault, next)
}

/** Delete one note file. The only destructive action the panel offers. */
export async function deleteNote(vault: TopicVault, noteSlug: string): Promise<boolean> {
  const note = await readNote(vault, noteSlug)
  if (note === undefined) return false
  await rm(notePathOf(vault, noteSlug), { force: true })
  return true
}

/** What promotion answers with; `concept` is present only on success. */
export interface NotePromotion {
  status: NoteWriteStatus
  note?: PanelNote
  concept?: PanelConcept
}

/**
 * Attach one pending note's prose to the concept card it was aimed at.
 *
 * This is NOT card creation and cannot become it. The card must already exist,
 * which means a teaching session already observed a correct, independent
 * transfer of that concept and `saveConceptCard` wrote the file. Promotion only
 * appends the kept prose to that card as a dated observation — the same shape
 * `appendObservation` uses — and flips the note to a plain note pointing at it.
 *
 * When no such card exists the answer is `gate-blocked` and NOTHING is written.
 * There is no force parameter, no override and no admin path: a promotion that
 * could conjure a card would make the mastery ladder a self-report, which is
 * the exact failure the gate exists to prevent.
 */
export async function promoteNote(
  vault: TopicVault,
  noteSlug: string,
  now = new Date(),
): Promise<NotePromotion> {
  const note = await readNote(vault, noteSlug)
  if (note === undefined) return { status: 'unknown-note' }
  if (note.kind !== 'pending-concept' || note.conceptSlug === null) return { status: 'not-pending', note }
  const card = await readConceptCard(vault, note.conceptSlug)
  if (card === undefined) return { status: 'gate-blocked', note }

  const prose = note.body.split('\n').filter(line => !/^#\s/u.test(line)).join('\n').trim()
  const merged = `${card.body.trimEnd()}\n\n## 从笔记并入（${dateKey(now)}）\n${prose}\n`
  const concept = await saveConceptBody(vault, note.conceptSlug, merged, now)
  if (concept === undefined) return { status: 'gate-blocked', note }

  const promoted: PanelNote = {
    ...note,
    kind: 'note',
    conceptSlug: null,
    gate: null,
    promotedTo: card.conceptSlug,
    updatedAt: now.toISOString(),
  }
  await writeFile(notePathOf(vault, note.noteSlug), renderNote(promoted), 'utf8')
  return { status: 'ok', note: promoted, concept }
}
