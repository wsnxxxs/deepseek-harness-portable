import type { Context } from '@deepseek-ai/cordis';
/** Exact plugin routes on the official authenticated API carrier. The shared
 * RPC interceptor belongs to Gateway; extensions register their own routes. */
export declare function registerRpc(ctx: Context, prefix: string, endpoints: readonly string[], handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<unknown>): () => Promise<void>;
