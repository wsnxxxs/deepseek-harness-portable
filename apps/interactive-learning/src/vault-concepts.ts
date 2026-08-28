/**
 * The vault panel's concept and review face — the first writes the panel makes.
 *
 * Four operations, and the shape of each one is the rule it enforces:
 *
 * - `concepts/save` takes a BODY and nothing else. Every prose field a card has
 *   (`label`, `explanation`, `misconceptions`, `unverifiedTransfer`,
 *   `relatedConcepts`) is derived from that body by `parseCard`, and the typed
 *   frontmatter is carried across untouched. The endpoint therefore has no
 *   parameter that could change mastery, due, or anchors — the rule is in the
 *   signature, not in a validation branch someone can forget.
 * - `concepts/rate` runs the existing `nextReviewSchedule`. A rating is a
 *   scheduling signal, never mastery evidence: `'revealed'` deliberately
 *   produces no schedule at all, so failing to recall a card leaves it due.
 * - `concepts/defer` moves `due` and NOTHING else. Deferring is not a review,
 *   so it must not touch `intervalDays` or `lastReviewedAt` — otherwise pushing
 *   a card back a day would quietly corrupt its spacing.
 * - `concepts/correct` is the one manual mastery outlet, and it only goes DOWN.
 *   It writes `masteryBasis: 'user-correction'`, which is the single basis
 *   `mergeConcept` accepts a regression from.
 *
 * The correction has to write BOTH the card file and `.learning/memory.json`.
 * `readLearnerMemoryWithCards` overlays a card's schedule and anchors onto the
 * memory record but deliberately not its mastery — typed state is the domain
 * record's to own — so a card-only write would be silently reverted on the next
 * prompt assembly. That asymmetry is the whole reason this module exists rather
 * than the panel calling `concept-cards.ts` directly.
 * @module @dsh-portable/interactive-learning/src/vault-concepts
 */

import { readFile, writeFile } from 'node:fs/promises'
import {
  conceptRecordFromCard,
  dateKey,
  isConceptDue,
  nextReviewSchedule,
  readConceptCard,
  readConceptCards,
  renderConceptCard,
  reviewIntervalDays,
  updateConceptCardSchedule,
  type ConceptCard,
  type ConceptCardRating,
} from './concept-cards.ts'
import { upsertLearnerConcept } from './learner-memory.ts'
import type { LearnerMastery } from './learner-state.ts'
import { vaultRelative, type TopicVault } from './topic-vault.ts'

/** Longest card body the panel may write; a card is a note, not a document. */
export const MAX_CARD_BODY_CHARS = 8_000

/** Furthest a review may be pushed back in one action. */
export const MAX_DEFER_DAYS = 365

/** Mastery ladder, lowest first. Mirrors `learner-memory.ts`; only walked downward here. */
const MASTERY_LADDER: readonly LearnerMastery[] = ['unseen', 'emerging', 'transfer']

/** One card as the panel lists it. */
export interface PanelConcept {
  conceptSlug: string
  label: string
  mastery: LearnerMastery
  masteryBasis: string
  due: string | null
  intervalDays: number
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
  anchors: readonly string[]
  staleAnchors: readonly string[]
  explanation: string
  misconceptions: readonly string[]
  unverifiedTransfer: string
  relatedConcepts: readonly string[]
  /** Vault-relative path, shown so a person can open the file themselves. */
  path: string
  /** The editable Markdown after the frontmatter. */
  body: string
  /** `due` is today or earlier. */
  due_now: boolean
}

/** The concept list plus the counts the rail badge needs. */
export interface PanelConceptList {
  status: 'ok'
  concepts: readonly PanelConcept[]
  due: number
  stale: number
}

function panelConcept(vault: TopicVault, card: ConceptCard, now: Date): PanelConcept {
  return {
    conceptSlug: card.conceptSlug,
    label: card.label,
    mastery: card.mastery,
    masteryBasis: card.masteryBasis,
    due: card.due,
    intervalDays: card.intervalDays,
    lastReviewedAt: card.lastReviewedAt,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
    anchors: card.anchors,
    staleAnchors: card.staleAnchors,
    explanation: card.explanation,
    misconceptions: card.misconceptions,
    unverifiedTransfer: card.unverifiedTransfer,
    relatedConcepts: card.relatedConcepts,
    path: vaultRelative(vault, card.path),
    body: card.body,
    due_now: isConceptDue(card.due, now),
  }
}

/**
 * Every card, due ones first.
 *
 * Ordering is the panel's only editorial act here: a stale anchor outranks a due
 * date, because a card citing material that no longer exists is wrong in a way
 * no amount of reviewing fixes.
 */
export async function listConcepts(vault: TopicVault, now = new Date()): Promise<PanelConceptList> {
  const cards = await readConceptCards(vault)
  const concepts = cards
    .map(card => panelConcept(vault, card, now))
    .sort((left, right) => {
      const rank = (concept: PanelConcept): number =>
        concept.staleAnchors.length > 0 ? 0 : concept.due_now ? 1 : 2
      const difference = rank(left) - rank(right)
      if (difference !== 0) return difference
      return (left.due ?? '9999-12-31').localeCompare(right.due ?? '9999-12-31')
    })
  return {
    status: 'ok',
    concepts,
    due: concepts.filter(concept => concept.due_now).length,
    stale: concepts.filter(concept => concept.staleAnchors.length > 0).length,
  }
}

/** The due queue, in the order the review deck should present it. */
export async function reviewQueue(vault: TopicVault, now = new Date()): Promise<PanelConceptList> {
  const all = await listConcepts(vault, now)
  const concepts = all.concepts.filter(concept => concept.due_now)
  return { status: 'ok', concepts, due: concepts.length, stale: all.stale }
}

/**
 * Replace one card's prose, keeping every typed field exactly as it was.
 *
 * Rewritten through `renderConceptCard` rather than a text splice so the
 * frontmatter is re-serialized from the parsed card: a person who hand-edited
 * `mastery` into something invalid gets it normalized here rather than carried
 * forward, and the file keeps one canonical shape.
 * @param vault - The vault holding the card.
 * @param conceptSlug - The card's slug (its filename, and the memory key).
 * @param body - New Markdown body, frontmatter excluded.
 * @returns the reparsed card, or `undefined` when no such card exists.
 */
export async function saveConceptBody(
  vault: TopicVault,
  conceptSlug: string,
  body: string,
  now = new Date(),
): Promise<PanelConcept | undefined> {
  const card = await readConceptCard(vault, conceptSlug)
  if (card === undefined) return undefined
  const next: ConceptCard = {
    ...card,
    body: body.slice(0, MAX_CARD_BODY_CHARS).trimEnd(),
    updatedAt: now.toISOString(),
  }
  await writeFile(card.path, renderConceptCard(next, now), 'utf8')
  // Reparsed rather than returned from `next`: the prose fields are DERIVED
  // from the body, so the caller must see what the body actually says now, not
  // what the pre-edit card said.
  const saved = await readConceptCard(vault, conceptSlug)
  return saved === undefined ? undefined : panelConcept(vault, saved, now)
}

/**
 * Record one review rating.
 *
 * No token is spent and no turn is created: the rating moves `due` in the
 * frontmatter and nothing else. It is still projected into learner memory so
 * the next teaching session knows the card was reviewed — but as SCHEDULE, not
 * as evidence, which is why mastery is carried across untouched.
 */
export async function rateConcept(
  vault: TopicVault,
  conceptSlug: string,
  rating: ConceptCardRating,
  now = new Date(),
): Promise<PanelConcept | undefined> {
  const card = await readConceptCard(vault, conceptSlug)
  if (card === undefined) return undefined
  const schedule = nextReviewSchedule(card, rating, now)
  if (schedule === undefined) {
    // A 'revealed' card at the initial interval has nothing to reschedule.
    // Leaving it due is the point: it comes back in this same session's queue.
    return panelConcept(vault, card, now)
  }
  const updated = await updateConceptCardSchedule(vault, conceptSlug, schedule)
  if (updated === undefined) return undefined
  await upsertLearnerConcept(vault, conceptRecordFromCard(updated))
  return panelConcept(vault, updated, now)
}

function addDays(now: Date, days: number): string {
  const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
  return value.toISOString().slice(0, 10)
}

/**
 * Push one card's next review back without calling it a review.
 *
 * `intervalDays` and `lastReviewedAt` are deliberately untouched. Deferring is
 * "not today", not "I got this right"; folding it into the spacing would let a
 * busy week silently inflate every interval in the vault.
 * @param days - Whole days from today, 1..{@link MAX_DEFER_DAYS}.
 */
export async function deferConcept(
  vault: TopicVault,
  conceptSlug: string,
  days: number,
  now = new Date(),
): Promise<PanelConcept | undefined> {
  const card = await readConceptCard(vault, conceptSlug)
  if (card === undefined) return undefined
  const bounded = Math.min(Math.max(Math.floor(days), 1), MAX_DEFER_DAYS)
  const next: ConceptCard = {
    ...card,
    due: addDays(now, bounded),
    updatedAt: now.toISOString(),
  }
  await writeFile(card.path, renderConceptCard(next, now), 'utf8')
  await upsertLearnerConcept(vault, conceptRecordFromCard(next))
  return panelConcept(vault, next, now)
}

/** One step down the ladder; `unseen` is the floor. */
export function loweredMastery(mastery: LearnerMastery): LearnerMastery {
  const index = MASTERY_LADDER.indexOf(mastery)
  return MASTERY_LADDER[Math.max(0, index - 1)] ?? 'unseen'
}

/**
 * "I didn't actually understand this" — the only manual mastery outlet.
 *
 * One step DOWN only. Mastery is the conclusion of observed evidence, so the
 * panel offers no way to raise it: a person who wants a higher mastery has to
 * demonstrate it in a teaching session, which is the entire point of basing it
 * on evidence rather than self-report.
 *
 * The write lands in two places on purpose. The card file keeps the frontmatter
 * a person sees in Obsidian honest, and `memory.json` is what the next prompt
 * assembly actually reads — `readLearnerMemoryWithCards` does not overlay
 * mastery from the card, so writing only the file would be reverted.
 * `masteryBasis: 'user-correction'` is what makes `mergeConcept` accept the
 * regression instead of restoring the higher value.
 *
 * The schedule is reset alongside it: an interval that doubled on the strength
 * of a mastery the learner just disowned is not a spacing worth keeping.
 */
export async function correctConcept(
  vault: TopicVault,
  conceptSlug: string,
  now = new Date(),
): Promise<PanelConcept | undefined> {
  const card = await readConceptCard(vault, conceptSlug)
  if (card === undefined) return undefined
  const mastery = loweredMastery(card.mastery)
  const next: ConceptCard = {
    ...card,
    mastery,
    masteryBasis: 'user-correction',
    due: dateKey(now),
    intervalDays: reviewIntervalDays(mastery),
    updatedAt: now.toISOString(),
  }
  await writeFile(card.path, renderConceptCard(next, now), 'utf8')
  await upsertLearnerConcept(vault, {
    ...conceptRecordFromCard(next),
    masteryBasis: 'user-correction',
  })
  return panelConcept(vault, next, now)
}

/** Read one card's raw file, for the editor's "show me the whole file" affordance. */
export async function readConceptFile(
  vault: TopicVault,
  conceptSlug: string,
): Promise<{ path: string; text: string } | undefined> {
  const card = await readConceptCard(vault, conceptSlug)
  if (card === undefined) return undefined
  try {
    return { path: vaultRelative(vault, card.path), text: await readFile(card.path, 'utf8') }
  } catch {
    return undefined
  }
}
