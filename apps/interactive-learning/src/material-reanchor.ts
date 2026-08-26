/**
 * Re-anchoring: what happens to a learner's stored citations when the source
 * they cite is replaced by a new edition.
 *
 * The two halves of a vault have different lifetimes. `extracted/` and
 * `.learning/structure/` are caches and are rebuilt wholesale on reimport;
 * learner memory is a user asset and must survive. This module is the bridge: it
 * moves each stored anchor onto the rebuilt structure, and when an anchor no
 * longer corresponds to anything, marks it stale rather than quietly keeping a
 * page number that now points somewhere else.
 *
 * Resolution order is heading path, then the opening-text hash recorded by the
 * PREVIOUS parse. The hash is what recovers a section that was merely retitled —
 * which is the common case for a second edition, and the case where silently
 * dropping the citation would cost the learner the most.
 * @module @dsh-portable/interactive-learning/src/material-reanchor
 */

import { reanchor } from './ingest/markdown.ts'
import type { SourceStructure } from './ingest/types.ts'
import { formatSectionAnchor, parseAnchorText, sameStringList } from './material-anchor.ts'
import {
  readLearnerMemory,
  writeLearnerMemory,
  type LearnerConceptRecord,
} from './learner-memory.ts'
import type { TopicVault } from './topic-vault.ts'

/** What one re-anchor pass did. */
export interface ReanchorOutcome {
  /** Anchors whose text changed because the section moved or was renumbered. */
  moved: number
  /** Anchors that resolved unchanged. */
  unchanged: number
  /** Anchors that no longer correspond to any section. */
  stale: number
  /** Anchors previously marked stale that resolve again. */
  recovered: number
}

const EMPTY_OUTCOME: ReanchorOutcome = { moved: 0, unchanged: 0, stale: 0, recovered: 0 }

/** Whether an anchor belongs to the source being rebuilt. */
function belongsTo(anchor: string, sourceId: string): boolean {
  const parsed = parseAnchorText(anchor)
  return parsed.sourceId === sourceId
}

/**
 * Resolve one stored anchor against the rebuilt structure.
 * @returns the new anchor text, or `undefined` when nothing matches.
 */
function moveAnchor(
  anchor: string,
  previous: SourceStructure | undefined,
  next: SourceStructure,
): string | undefined {
  const { headingPath } = parseAnchorText(anchor)
  if (headingPath.length === 0) return undefined
  // Only the previous parse knows what this passage opened with. Without it
  // there is no body identity to match on, so an empty hash is passed and
  // resolution falls back to the heading chain alone; deriving a hash from the
  // heading would compare a title against a body and could never match.
  const priorHash = previous?.sections
    .find(section => sameStringList(section.headingPath, headingPath))?.quoteHash ?? ''
  const section = reanchor(headingPath, priorHash, next)
  return section === undefined ? undefined : formatSectionAnchor(next.sourceId, section)
}

/** Re-anchor one pair of active/stale citation lists against a rebuilt source. */
export function reanchorAnchorLists(
  currentAnchors: readonly string[],
  currentStaleAnchors: readonly string[],
  previous: SourceStructure | undefined,
  next: SourceStructure,
): {
  anchors: readonly string[]
  staleAnchors: readonly string[]
  outcome: ReanchorOutcome
  changed: boolean
} {
  const outcome = { ...EMPTY_OUTCOME }
  const anchors: string[] = []
  const stale: string[] = []

  for (const anchor of currentAnchors) {
    if (!belongsTo(anchor, next.sourceId)) {
      anchors.push(anchor)
      continue
    }
    const moved = moveAnchor(anchor, previous, next)
    if (moved === undefined) {
      stale.push(anchor)
      outcome.stale += 1
      continue
    }
    anchors.push(moved)
    if (moved === anchor) outcome.unchanged += 1
    else outcome.moved += 1
  }

  // A section that comes back in a later edition should stop being marked stale.
  for (const anchor of currentStaleAnchors) {
    if (!belongsTo(anchor, next.sourceId)) {
      stale.push(anchor)
      continue
    }
    const moved = moveAnchor(anchor, previous, next)
    if (moved === undefined) {
      stale.push(anchor)
      continue
    }
    if (!anchors.includes(moved)) anchors.push(moved)
    outcome.recovered += 1
  }

  const staleAnchors = [...new Set(stale)]
  return {
    anchors,
    staleAnchors,
    outcome,
    changed: !sameStringList(anchors, currentAnchors)
      || !sameStringList(staleAnchors, currentStaleAnchors),
  }
}

/** Re-anchor one concept record; returns the record and what changed. */
function reanchorConcept(
  concept: LearnerConceptRecord,
  previous: SourceStructure | undefined,
  next: SourceStructure,
): { concept: LearnerConceptRecord; outcome: ReanchorOutcome } {
  const result = reanchorAnchorLists(concept.anchors, concept.staleAnchors, previous, next)
  return {
    concept: result.changed
      ? { ...concept, anchors: result.anchors, staleAnchors: result.staleAnchors }
      : concept,
    outcome: result.outcome,
  }
}

/**
 * Move every stored citation for one source onto its rebuilt structure.
 *
 * Called by the ingest pipeline after a source is re-parsed. Writes only when
 * something actually changed, so a routine reingest of unchanged material costs
 * nothing.
 * @param vault - The vault whose memory holds the citations.
 * @param previous - The structure recorded before this reimport, when there was one.
 * @param next - The freshly derived structure.
 * @returns the totals across every concept.
 */
export async function reanchorVaultMemory(
  vault: TopicVault,
  previous: SourceStructure | undefined,
  next: SourceStructure,
): Promise<ReanchorOutcome> {
  const memory = await readLearnerMemory(vault)
  if (memory.concepts.length === 0) return { ...EMPTY_OUTCOME }

  const total = { ...EMPTY_OUTCOME }
  const concepts: LearnerConceptRecord[] = []
  let changed = false
  for (const concept of memory.concepts) {
    const result = reanchorConcept(concept, previous, next)
    concepts.push(result.concept)
    if (result.concept !== concept) changed = true
    total.moved += result.outcome.moved
    total.unchanged += result.outcome.unchanged
    total.stale += result.outcome.stale
    total.recovered += result.outcome.recovered
  }
  if (changed) await writeLearnerMemory(vault, { ...memory, concepts })
  return total
}

/** A sentence describing a re-anchor pass, or `''` when nothing moved. */
export function describeReanchor(outcome: ReanchorOutcome, sourceTitle: string): string {
  const parts: string[] = []
  if (outcome.moved > 0) parts.push(`${outcome.moved} citation(s) moved to their new location`)
  if (outcome.recovered > 0) parts.push(`${outcome.recovered} earlier citation(s) resolve again`)
  if (outcome.stale > 0) {
    parts.push(`${outcome.stale} citation(s) no longer exist and are marked stale`)
  }
  return parts.length === 0 ? '' : `${sourceTitle}: ${parts.join('; ')}.`
}
