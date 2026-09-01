/**
 * The `/dcode` RPC surface: the capabilities the modern workbench needs that
 * DSH itself does not own — working-tree status, file diffs, a narrow commit
 * path, per-turn undo, and bounded file reads for the details pane.
 *
 * Endpoint answers use the same `{ ok, value } | { ok, error }` envelope the
 * rest of this distribution's Connection RPC uses, so a client never has to
 * distinguish a business refusal from a transport failure by exception type.
 * @module @dsh-portable/dcode-ui/host/rpc
 */
import type { DcodeMemoryService } from './memory.ts';
/** Every endpoint this channel answers. */
export declare const DCODE_ENDPOINTS: readonly ["git/status", "git/diff", "git/branches", "git/stage", "git/unstage", "git/commit", "git/undo", "file/read", "memory/state", "memory/search", "memory/run", "memory/abort", "memory/reset", "memory/set-enabled", "memory/forget"];
/** One endpoint name. */
export type DcodeEndpoint = (typeof DCODE_ENDPOINTS)[number];
/** RPC channel this plugin answers on. */
export declare const DCODE_CHANNEL = "/dcode";
/** Stable business failure codes. */
export type DcodeErrorCode = 'bad-request' | 'not-a-repository' | 'git-failed' | 'memory-failed' | 'too-large' | 'unavailable';
/** Success or refusal, mirroring the Connection RPC envelope. */
export type DcodeResult<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: {
        readonly code: DcodeErrorCode;
        readonly message: string;
        readonly details: Record<string, unknown>;
    };
};
/**
 * Whether a value names an endpoint this channel answers.
 * @param value - endpoint string from the wire.
 */
export declare function isDcodeEndpoint(value: unknown): value is DcodeEndpoint;
/**
 * Answer one `/dcode` endpoint.
 *
 * Payload shape failures are `bad-request`; a directory outside a repository
 * is `not-a-repository`; anything git itself refused is `git-failed` with
 * git's own trimmed message.
 * @param endpoint - endpoint name, already known to be one of {@link DCODE_ENDPOINTS}.
 * @param payload - untrusted wire payload.
 * @returns the endpoint's envelope.
 */
export declare function handleDcodeEndpoint(endpoint: DcodeEndpoint, payload: unknown, memory?: DcodeMemoryService): Promise<DcodeResult<unknown>>;
//# sourceMappingURL=rpc.d.ts.map