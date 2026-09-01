/**
 * Typed browser face of the `/dcode` channel.
 *
 * The host half answers with the `{ ok, value } | { ok, error }` envelope, so
 * this module's job is to keep every caller off `unknown` and to turn a
 * transport rejection into the same envelope a business refusal produces —
 * a Git panel must degrade to an explanatory empty state, never to a crash.
 * @module @dsh-portable/dcode-ui/client/rpc
 */
import type { DcodeResult } from '../host/rpc.ts';
import type { DcodeMemorySearchValue, DcodeMemoryState } from '../host/memory.ts';
import type { GitBranch, GitCommitResult, GitDiff, GitRestoreOutcome, GitStageResult, GitStatus } from '../host/git.ts';
export type { GitBranch, GitCommitResult, GitDiff, GitFileChange, GitRestoreOutcome, GitStageResult, GitStatus } from '../host/git.ts';
export type { DcodeMemoryRecord, DcodeMemorySearchValue, DcodeMemoryState } from '../host/memory.ts';
/** The Connection RPC face this module needs. */
export interface RpcCarrier {
    rpc: {
        call(channel: string, endpoint: string, payload: unknown): Promise<unknown>;
    };
}
/** One bounded file read for the details pane. */
export interface FileRead {
    readonly path: string;
    readonly size: number;
    readonly truncated: boolean;
    readonly binary: boolean;
    readonly text: string;
}
/** The workbench's Git and file capabilities. */
export interface DcodeApi {
    /** Whether a Connection carrier was available when the client was created. */
    readonly available: boolean;
    status(cwd: string): Promise<DcodeResult<GitStatus>>;
    diff(cwd: string, path: string, staged?: boolean): Promise<DcodeResult<GitDiff>>;
    branches(cwd: string): Promise<DcodeResult<{
        branches: readonly GitBranch[];
    }>>;
    stage(cwd: string, paths: readonly string[]): Promise<DcodeResult<GitStageResult>>;
    unstage(cwd: string, paths: readonly string[]): Promise<DcodeResult<GitStageResult>>;
    commit(cwd: string, message: string): Promise<DcodeResult<GitCommitResult>>;
    undo(cwd: string, paths: readonly string[]): Promise<DcodeResult<{
        outcomes: readonly GitRestoreOutcome[];
    }>>;
    undoHunk(cwd: string, path: string, patch: string, staged?: boolean): Promise<DcodeResult<{
        outcomes: readonly GitRestoreOutcome[];
    }>>;
    readFile(cwd: string, path: string): Promise<DcodeResult<FileRead>>;
}
/** Durable Agent memory controls exposed by the Host channel. */
export interface DcodeMemoryApi {
    readonly available: boolean;
    state(cwd?: string): Promise<DcodeResult<DcodeMemoryState>>;
    search(query: string, cwd?: string): Promise<DcodeResult<DcodeMemorySearchValue>>;
    run(cwd?: string): Promise<DcodeResult<DcodeMemoryState>>;
    abort(): Promise<DcodeResult<DcodeMemoryState>>;
    setEnabled(enabled: boolean): Promise<DcodeResult<DcodeMemoryState>>;
    reset(): Promise<DcodeResult<DcodeMemoryState>>;
    forget(id: string): Promise<DcodeResult<DcodeMemoryState>>;
}
/**
 * Build the channel client.
 * @param carrier - the Connection service, absent on a page without one.
 * @returns a client that refuses every call when no carrier exists.
 */
export declare function createDcodeApi(carrier: RpcCarrier | undefined): DcodeApi;
/** Build the durable-memory client face over the same trusted channel. */
export declare function createDcodeMemoryApi(carrier: RpcCarrier | undefined): DcodeMemoryApi;
/**
 * The learning channel's browser face, reused verbatim from the existing
 * Interactive Learning host broker: the workbench's learning surfaces call
 * the very same endpoints the official UI's learning views call, so there is
 * exactly one learning backend and one vault state.
 * @param carrier - the Connection service.
 * @returns an endpoint caller, or one that rejects when no carrier exists.
 */
export declare function createLearningCall(carrier: RpcCarrier | undefined): (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>;
//# sourceMappingURL=rpc.d.ts.map