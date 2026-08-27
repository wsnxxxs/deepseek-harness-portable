/**
 * Cross-session learner memory, keyed by (vault, concept) instead of by session.
 *
 * The existing durability mechanism is not replaced. A full learner-state
 * snapshot still rides the session log and is folded back on load, which is what
 * survives refresh, resume, compaction, and fork. What was missing is only a key
 * that outlives one session — so this module writes a SECOND, bounded projection
 * per concept and reads it back when a later session opens the same vault.
 *
 * It lives in the vault rather than in harness storage so the whole promise of
 * the design holds literally: everything a person's learning produced is in one
 * folder they own, and deleting the folder deletes all of it. Note that
 * `.learning/memory.json` is the one file under `.learning/` that is NOT
 * rebuildable — the structure cache beside it is.
 * @module @dsh-portable/interactive-learning/src/learner-memory
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { slugify } from './ingest/types.ts'
import {
  anchorTargetsOf,
  formatAnchorTarget,
  parseAnchorText,
  resolveAnchorTarget,
} from './material-anchor.ts'
import type {
  LearnerGap,
  LearnerMastery,
  LearnerMasteryBasis,
  LearnerPhase,
  LearnerState,
} from './learner-state.ts'
import { readAllStructures, type TopicVault } from './topic-vault.ts'

/** Memory-file protocol tag; bumped only on a breaking record change. */
export const LEARNER_MEMORY_PROTOCOL = 'dsh-learning-memory@1' as const

/** Concepts rendered into one prompt injection. */
export const MAX_RENDERED_CONCEPTS = 12
/** Maximum characters rendered into one prompt injection. */
export const MAX_RENDERED_MEMORY_CHARS = 4000
/** Concepts retained on disk before the least recently touched are dropped. */
export const MAX_STORED_CONCEPTS = 500
/** Anchors and misconceptions retained per concept. */
const MAX_LIST_ITEMS = 6

/** One concept's durable learning record within a vault. */
export interface LearnerConceptRecord {
  conceptSlug: string
  label: string
  mastery: LearnerMastery
  masteryBasis: LearnerMasteryBasis
  phase: LearnerPhase
  gap: LearnerGap
  misconceptions: readonly string[]
  anchors: readonly string[]
  /**
   * Anchors that no longer resolve after the source was replaced. Kept rather
   * than dropped: the learner wrote a note against that passage, and silently
   * deleting the citation would hide that their material moved under it.
   */
  staleAnchors: readonly string[]
  /** How many observed evidence items backed the mastery value when stored. */
  evidenceCount: number
  /** ISO-8601 review date; `null` until scheduling is enabled. */
  due: string | null
  /** Current review interval in days, when this concept has a saved card. */
  reviewIntervalDays?: number
  /** Last learner-owned review rating, when one exists. */
  lastReviewedAt?: string | null
  updatedAt: string
  /** Sessions this concept was learned in, newest first, for lineage lookups. */
  sessionIds: readonly string[]
}

/** The vault's whole learner memory. */
export interface LearnerMemory {
  protocol: typeof LEARNER_MEMORY_PROTOCOL
  concepts: readonly LearnerConceptRecord[]
}

const EMPTY: LearnerMemory = { protocol: LEARNER_MEMORY_PROTOCOL, concepts: [] }

const MASTERY: ReadonlySet<string> = new Set<LearnerMastery>(['unseen', 'emerging', 'transfer'])
const MASTERY_BASIS: ReadonlySet<string> = new Set<LearnerMasteryBasis>(['evidence', 'user-correction'])
const PHASES: ReadonlySet<string> = new Set<LearnerPhase>([
  'orient', 'teach', 'practice', 'repair', 'transfer', 'complete',
])
const GAPS: ReadonlySet<string> = new Set<LearnerGap>([
  'concept', 'procedure', 'notation', 'task-model', 'prerequisite', 'unknown',
])

function stringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map(item => item.trim())
    .slice(0, MAX_LIST_ITEMS)
}

/**
 * Validate one stored record.
 *
 * Hand-written rather than schema-driven, matching `learner-state.ts`: the vault
 * is a folder a person can edit, so a malformed record must be dropped quietly
 * rather than fail the session that opened it.
 * @returns the record, or `undefined` when it is not usable.
 */
export function parseLearnerConceptRecord(value: unknown): LearnerConceptRecord | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  const conceptSlug = typeof record.conceptSlug === 'string' ? record.conceptSlug.trim() : ''
  const label = typeof record.label === 'string' ? record.label.trim() : ''
  if (conceptSlug === '' || label === '') return undefined
  if (!MASTERY.has(record.mastery as string)) return undefined
  return {
    conceptSlug,
    label,
    mastery: record.mastery as LearnerMastery,
    masteryBasis: MASTERY_BASIS.has(record.masteryBasis as string)
      ? record.masteryBasis as LearnerMasteryBasis
      : 'evidence',
    phase: PHASES.has(record.phase as string) ? record.phase as LearnerPhase : 'orient',
    gap: GAPS.has(record.gap as string) ? record.gap as LearnerGap : 'unknown',
    misconceptions: stringList(record.misconceptions),
    anchors: stringList(record.anchors),
    staleAnchors: stringList(record.staleAnchors),
    evidenceCount: Number.isSafeInteger(record.evidenceCount) && (record.evidenceCount as number) >= 0
      ? record.evidenceCount as number
      : 0,
    due: typeof record.due === 'string' && record.due !== '' ? record.due : null,
    ...(Number.isSafeInteger(record.reviewIntervalDays) && (record.reviewIntervalDays as number) > 0
      ? { reviewIntervalDays: record.reviewIntervalDays as number }
      : {}),
    ...(record.lastReviewedAt === null || typeof record.lastReviewedAt === 'string'
      ? { lastReviewedAt: record.lastReviewedAt as string | null }
      : {}),
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : new Date(0).toISOString(),
    sessionIds: stringList(record.sessionIds),
  }
}

/** Absolute path of a vault's memory file. */
export function memoryPathOf(vault: TopicVault): string {
  return join(vault.internal, 'memory.json')
}

/**
 * Read a vault's learner memory.
 * @returns the memory, or an empty one when absent or damaged.
 */
export async function readLearnerMemory(vault: TopicVault): Promise<LearnerMemory> {
  try {
    const parsed = JSON.parse(await readFile(memoryPathOf(vault), 'utf8')) as LearnerMemory
    if (parsed?.protocol !== LEARNER_MEMORY_PROTOCOL || !Array.isArray(parsed.concepts)) return EMPTY
    const concepts = parsed.concepts
      .map(parseLearnerConceptRecord)
      .filter((record): record is LearnerConceptRecord => record !== undefined)
    return { protocol: LEARNER_MEMORY_PROTOCOL, concepts }
  } catch {
    return EMPTY
  }
}

/** Write a vault's learner memory, newest first and bounded. */
export async function writeLearnerMemory(vault: TopicVault, memory: LearnerMemory): Promise<void> {
  await mkdir(vault.internal, { recursive: true })
  const concepts = [...memory.concepts]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_STORED_CONCEPTS)
  const next: LearnerMemory = { protocol: LEARNER_MEMORY_PROTOCOL, concepts }
  await writeFile(memoryPathOf(vault), `${JSON.stringify(next, undefined, 2)}\n`, 'utf8')
}

/**
 * Merge one concept record into a vault's memory.
 *
 * Mastery never silently regresses: a stored `transfer` stays unless the new
 * record is an explicit user correction. A later session that opens on an
 * orientation turn must not erase evidence an earlier session actually observed.
 * @param vault - The vault holding the memory.
 * @param record - The record to merge.
 * @returns the memory after the merge.
 */
export async function upsertLearnerConcept(
  vault: TopicVault,
  record: LearnerConceptRecord,
): Promise<LearnerMemory> {
  const anchors = await canonicalizeMaterialAnchors(vault, record.anchors)
  const nextRecord = anchors === record.anchors ? record : { ...record, anchors }
  const memory = await readLearnerMemory(vault)
  const previous = memory.concepts.find(candidate => candidate.conceptSlug === nextRecord.conceptSlug)
  const merged = previous === undefined ? nextRecord : mergeConcept(previous, nextRecord)
  const concepts = [
    merged,
    ...memory.concepts.filter(candidate => candidate.conceptSlug !== nextRecord.conceptSlug),
  ]
  const next: LearnerMemory = { protocol: LEARNER_MEMORY_PROTOCOL, concepts }
  await writeLearnerMemory(vault, next)
  return next
}

const MASTERY_ORDER: readonly LearnerMastery[] = ['unseen', 'emerging', 'transfer']

/** Keep material anchors canonical when a live state still carries an old edition. */
async function canonicalizeMaterialAnchors(
  vault: TopicVault,
  anchors: readonly string[],
): Promise<readonly string[]> {
  const structures = await readAllStructures(vault)
  const targets = structures.flatMap(anchorTargetsOf)
  if (targets.length === 0) return anchors
  const sourceIds = new Set(targets.map(target => target.sourceId))
  return anchors
    .map(anchor => {
      const sourceId = parseAnchorText(anchor).sourceId
      if (sourceId === undefined || !sourceIds.has(sourceId)) return anchor
      const target = resolveAnchorTarget(anchor, targets)
      return target === undefined ? undefined : formatAnchorTarget(target)
    })
    .filter((anchor): anchor is string => anchor !== undefined)
}

function mergeConcept(previous: LearnerConceptRecord, next: LearnerConceptRecord): LearnerConceptRecord {
  const regressing = MASTERY_ORDER.indexOf(next.mastery) < MASTERY_ORDER.indexOf(previous.mastery)
  const mastery = regressing && next.masteryBasis !== 'user-correction' ? previous.mastery : next.mastery
  const sessionIds = [...new Set([...next.sessionIds, ...previous.sessionIds])].slice(0, MAX_LIST_ITEMS)
  const staleAnchors = new Set([...next.staleAnchors, ...previous.staleAnchors])
  const anchors = [...new Set([...next.anchors, ...previous.anchors])]
    .filter(anchor => !staleAnchors.has(anchor))
  const activeAnchors = new Set(anchors)
  return {
    ...next,
    mastery,
    masteryBasis: mastery === next.mastery ? next.masteryBasis : previous.masteryBasis,
    evidenceCount: Math.max(previous.evidenceCount, next.evidenceCount),
    misconceptions: [...new Set([...next.misconceptions, ...previous.misconceptions])].slice(0, MAX_LIST_ITEMS),
    anchors: anchors.slice(0, MAX_LIST_ITEMS),
    // A stale anchor that resolves again on a later ingest stops being stale.
    staleAnchors: [...staleAnchors]
      .filter(anchor => !activeAnchors.has(anchor))
      .slice(0, MAX_LIST_ITEMS),
    due: next.due ?? previous.due,
    reviewIntervalDays: next.reviewIntervalDays ?? previous.reviewIntervalDays,
    lastReviewedAt: next.lastReviewedAt ?? previous.lastReviewedAt,
    sessionIds,
  }
}

/**
 * Project a live learner state into a durable concept record.
 *
 * A state with no goal is not a concept anyone can look up later, so it produces
 * nothing rather than an unnamed record.
 * @param state - The current learner state.
 * @param sessionId - The session that produced it.
 * @returns the record, or `undefined` when there is nothing worth storing.
 */
export function conceptRecordFromState(
  state: LearnerState,
  sessionId: string,
): LearnerConceptRecord | undefined {
  const label = state.goal?.trim() ?? ''
  if (label === '') return undefined
  if (state.mastery === 'unseen' && state.evidence.length === 0) return undefined
  return {
    conceptSlug: slugify(label, 'concept'),
    label,
    mastery: state.mastery,
    masteryBasis: state.masteryBasis,
    phase: state.phase,
    gap: state.gap,
    misconceptions: state.misconceptions.slice(0, MAX_LIST_ITEMS),
    anchors: state.sourceAnchors.slice(0, MAX_LIST_ITEMS),
    staleAnchors: [],
    evidenceCount: state.evidence.length,
    due: null,
    updatedAt: new Date().toISOString(),
    sessionIds: [sessionId],
  }
}

/**
 * Render the memory as a bounded prompt block.
 *
 * Explicitly framed as prior sessions' observations, not as current fact: the
 * standing policy already forbids inventing learner evidence, and memory read
 * back from disk is exactly the kind of input that could be mistaken for
 * something observed this turn.
 * @param memory - The vault's memory.
 * @param options - Vault title and how many concepts to render.
 * @returns the prompt block, or `''` when the memory is empty.
 */
export function renderLearnerMemory(
  memory: LearnerMemory,
  options: {
    title: string
    limit?: number
    goal?: string
    maxChars?: number
  } = { title: 'this topic' },
): string {
  if (memory.concepts.length === 0) return ''
  const limit = options.limit ?? MAX_RENDERED_CONCEPTS
  const maxChars = Math.max(1, options.maxChars ?? MAX_RENDERED_MEMORY_CHARS)
  const today = new Date().toISOString().slice(0, 10)
  const goal = options.goal?.trim() ?? ''
  const ordered = [...memory.concepts].sort((left, right) => {
    const byRelevance = memoryRelevance(right, goal, today) - memoryRelevance(left, goal, today)
    if (byRelevance !== 0) return byRelevance
    const byDue = (left.due ?? '9999').localeCompare(right.due ?? '9999')
    return byDue !== 0 ? byDue : right.updatedAt.localeCompare(left.updatedAt)
  })
  const shown = ordered.slice(0, limit)
  const lines = [
    `## Prior learning in ${options.title}`,
    'Observed in EARLIER sessions, not this turn. Treat each as a revisable prior:'
    + ' confirm with a fresh observation before relying on it, and never cite it as evidence the learner produced now.',
  ]
  let renderedChars = lines[0].length + lines[1].length + 1
  let renderedCount = 0
  for (const concept of shown) {
    const parts = [`${boundedText(concept.label, 160)} — ${concept.mastery}`]
    if (concept.due !== null) {
      parts.push(concept.due.slice(0, 10) <= today
        ? 'DUE for review'
        : `next review: ${concept.due.slice(0, 10)}`)
    }
    if (concept.masteryBasis === 'user-correction') parts.push('(learner-corrected)')
    if (concept.gap !== 'unknown') parts.push(`open gap: ${concept.gap}`)
    if (concept.misconceptions.length > 0) {
      parts.push(`past misconception: ${boundedText(concept.misconceptions[0]!, 240)}`)
    }
    if (concept.anchors.length > 0) {
      parts.push(`anchors: ${concept.anchors.slice(0, 2).map(anchor => boundedText(anchor, 180)).join('; ')}`)
    }
    if (concept.staleAnchors.length > 0) {
      parts.push(`${concept.staleAnchors.length} earlier citation(s) no longer exist in the current material`)
    }
    const line = `- ${parts.join('. ')}.`
    if (renderedChars + line.length + 1 > maxChars) break
    lines.push(line)
    renderedChars += line.length + 1
    renderedCount += 1
  }
  if (ordered.length > renderedCount) {
    const omitted = `- …and ${ordered.length - renderedCount} more concepts in this folder.`
    if (renderedChars + omitted.length + 1 <= maxChars) lines.push(omitted)
  }
  return lines.join('\n').slice(0, maxChars)
}

function boundedText(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length <= maxChars ? normalized : `${normalized.slice(0, maxChars - 1)}…`
}

function memoryRelevance(
  concept: LearnerConceptRecord,
  goal: string,
  today: string,
): number {
  const haystack = `${concept.label} ${concept.conceptSlug}`.toLocaleLowerCase()
  const normalizedGoal = goal.toLocaleLowerCase()
  let score = 0
  if (normalizedGoal !== '' && (haystack.includes(normalizedGoal) || normalizedGoal.includes(haystack))) {
    score += 12
  }
  if (normalizedGoal !== '') {
    const terms = normalizedGoal.match(/[\p{Script=Han}]|[A-Za-z0-9][A-Za-z0-9_-]*/gu) ?? []
    score += terms.filter(term => term.length > 1 && haystack.includes(term)).length * 3
  }
  if (concept.due !== null) score += concept.due.slice(0, 10) <= today ? 4 : 2
  if (concept.gap !== 'unknown') score += 1
  return score
}
