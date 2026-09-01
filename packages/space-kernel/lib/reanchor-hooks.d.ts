/**
 * Consumers that must be re-anchored when a source is re-ingested.
 *
 * Re-anchoring is a kernel concern: when a source changes, every quote that
 * pointed into it has to be moved, marked stale, or recovered. WHAT holds those
 * quotes is not — concept cards belong to the teaching pack, dossier citations
 * to the crew surface, and the kernel must not import either.
 *
 * The ingest pipeline therefore calls whatever has registered here. A consumer
 * registers once when its plugin starts and its outcome is folded into the
 * receipt the operator sees, so a re-import still reports one honest total
 * rather than one per subsystem.
 * @module @dsh-portable/space-kernel/reanchor-hooks
 */
import type { SourceStructure } from './ingest/types.ts';
import type { ReanchorOutcome } from './material-reanchor.ts';
import type { TopicVault } from './topic-vault.ts';
/**
 * Re-anchor one consumer's stored quotes against a re-ingested source.
 * @param vault - the space being re-ingested into.
 * @param previous - the structure being superseded, or undefined for a first import.
 * @param next - the structure that replaces it.
 * @returns how many anchors moved, stayed, went stale, or were recovered.
 */
export type ReanchorHook = (vault: TopicVault, previous: SourceStructure | undefined, next: SourceStructure) => Promise<ReanchorOutcome>;
/**
 * Register a consumer to be re-anchored on every re-ingest.
 * @param hook - the consumer's re-anchor pass.
 * @returns a disposer; registering the same hook twice keeps one entry.
 */
export declare function registerReanchorHook(hook: ReanchorHook): () => void;
/** The empty total, so a space with no consumers still reports a receipt. */
export declare function emptyReanchorOutcome(): ReanchorOutcome;
/**
 * Run every registered consumer and sum their outcomes.
 *
 * Hooks run in registration order rather than concurrently: they write into the
 * same space, and a deterministic order keeps a re-import's receipt reproducible.
 * @param vault - the space being re-ingested into.
 * @param previous - the superseded structure, when there is one.
 * @param next - the replacing structure.
 * @returns the combined outcome.
 */
export declare function runReanchorHooks(vault: TopicVault, previous: SourceStructure | undefined, next: SourceStructure): Promise<ReanchorOutcome>;
//# sourceMappingURL=reanchor-hooks.d.ts.map