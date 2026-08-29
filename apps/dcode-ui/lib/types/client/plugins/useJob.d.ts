/**
 * Install, update, enable and uninstall as one tracked operation per plugin.
 *
 * Every mutating marketplace route answers the same two ways: an async Host
 * hands back a job id to poll, an older synchronous one answers the outcome
 * directly. Callers should not care which, so both shapes settle into the
 * same {@link Operation} here, keyed by whatever the caller identifies the row
 * by — a repository name in the catalogue, a package name in the inventory.
 *
 * Polling lives with the operation rather than with the card so a row that
 * scrolls out of view, or a section the operator switches away from, keeps its
 * install running; the intervals are owned by this hook and cleared when the
 * surface unmounts.
 * @module @dsh-portable/dcode-ui/client/plugins/useJob
 */
import type { InstallJob, MarketClient, MarketResult } from './market.ts';
/** Where one tracked operation has got to. */
export type OperationStatus = 'running' | 'done' | 'failed';
/** One mutating call in flight, or its outcome. */
export interface Operation {
    readonly status: OperationStatus;
    /** Live progress, present only while an async Host is working. */
    readonly job: InstallJob | undefined;
    readonly jobId: string | undefined;
    readonly error: string | undefined;
    /** Installer output, kept after a failure so the reason stays readable. */
    readonly output: string;
}
/** The operation table and the two verbs that drive it. */
export interface OperationRunner {
    readonly operations: Readonly<Record<string, Operation>>;
    /**
     * Run one mutating call and track it to completion.
     * @param key - the row this operation belongs to.
     * @param call - the marketplace verb, already bound to its arguments.
     * @param onSuccess - run once the operation has succeeded.
     */
    start(key: string, call: () => Promise<MarketResult<string | undefined>>, onSuccess?: () => void): void;
    /** Ask the Host to abort a running job. */
    cancel(key: string): void;
}
/**
 * Track marketplace operations for one surface.
 * @param client - the marketplace client.
 * @returns the operation table and its verbs.
 */
export declare function useOperations(client: MarketClient): OperationRunner;
//# sourceMappingURL=useJob.d.ts.map