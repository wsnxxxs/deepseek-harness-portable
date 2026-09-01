/**
 * Moved to `@dsh-portable/space-kernel`, except the pass over learner memory.
 *
 * Moving a quote onto a rebuilt structure is kernel work. WHICH records hold
 * quotes is not: learner memory is this pack's own, so that pass lives in
 * `./learning-reanchor.ts` and reaches the ingest pipeline as a registered
 * hook. Both halves are re-exported here so existing callers are unchanged.
 * @module @dsh-portable/interactive-learning/material-reanchor
 */

export { describeReanchor, reanchorAnchorLists, type ReanchorOutcome } from '@dsh-portable/space-kernel'
export { reanchorVaultMemory } from './learning-reanchor.ts'
