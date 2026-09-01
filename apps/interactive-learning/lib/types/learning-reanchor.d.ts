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
import { type ReanchorOutcome, type SourceStructure, type TopicVault } from '@dsh-portable/space-kernel';
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
export declare function reanchorVaultMemory(vault: TopicVault, previous: SourceStructure | undefined, next: SourceStructure): Promise<ReanchorOutcome>;
//# sourceMappingURL=learning-reanchor.d.ts.map