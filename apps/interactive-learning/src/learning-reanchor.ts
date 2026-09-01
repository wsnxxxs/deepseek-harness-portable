/**
 * Re-anchoring the teaching pack's own stored citations.
 *
 * Moving a quote onto a rebuilt structure is kernel work and lives in
 * `@dsh-portable/space-kernel`. WHAT holds the quotes is not: learner memory is
 * this pack's record, so the pass over it belongs here and is contributed to
 * the ingest pipeline through {@link registerReanchorHook} rather than being
 * imported by it.
 * @module @dsh-portable/interactive-learning/learning-reanchor
 */

import {
  reanchorAnchorLists,
  registerReanchorHook,
  type ReanchorOutcome,
  type SourceStructure,
  type TopicVault,
} from '@dsh-portable/space-kernel'
import { reanchorConceptCards } from './concept-cards.ts'
import {
  readLearnerMemory,
  writeLearnerMemory,
  type LearnerConceptRecord,
} from './learner-memory.ts'

/** The zero total, returned when a space holds no learner memory yet. */
const EMPTY_OUTCOME: ReanchorOutcome = { moved: 0, unchanged: 0, stale: 0, recovered: 0 }

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

// Enrolling this pack's records is a property of the pack being LOADED, not of
// its Cordis plugin being mounted, and the distinction is deliberate. The
// ingest pipeline is used directly by callers that never mount the plugin —
// the pack's own tests among them — and a re-import that silently skipped
// re-anchoring would leave stored citations pointing at the old structure.
// Binding registration to `apply` would make correctness depend on which entry
// point happened to run.
//
// The disposer is therefore discarded on purpose. What makes that safe is that
// neither hook holds plugin state or a captured context: both take the space
// they operate on as an argument and read only records that space itself
// holds, so a hook handed a dossier — or any space with no learner memory and
// no concept cards — reads nothing and returns the empty outcome. That is a
// property the tests pin, not a coincidence to rely on.
//
// Registration is idempotent, so a second import of this module does not
// double-count a re-anchor pass.
registerReanchorHook(reanchorVaultMemory)
registerReanchorHook(reanchorConceptCards)
