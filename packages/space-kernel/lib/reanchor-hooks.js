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
const hooks = new Set();
/**
 * Register a consumer to be re-anchored on every re-ingest.
 * @param hook - the consumer's re-anchor pass.
 * @returns a disposer; registering the same hook twice keeps one entry.
 */
export function registerReanchorHook(hook) {
    hooks.add(hook);
    return () => { hooks.delete(hook); };
}
/** The empty total, so a space with no consumers still reports a receipt. */
export function emptyReanchorOutcome() {
    return { moved: 0, unchanged: 0, stale: 0, recovered: 0 };
}
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
export async function runReanchorHooks(vault, previous, next) {
    const total = emptyReanchorOutcome();
    for (const hook of hooks) {
        const outcome = await hook(vault, previous, next);
        total.moved += outcome.moved;
        total.unchanged += outcome.unchanged;
        total.stale += outcome.stale;
        total.recovered += outcome.recovered;
    }
    return total;
}
//# sourceMappingURL=reanchor-hooks.js.map