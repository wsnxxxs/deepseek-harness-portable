/**
 * Host-side Cordis plugin for the mission dossier.
 *
 * Two halves, and the split is the point:
 *
 * - **Model side.** Three read-only tools, registered per agent, so a crew can
 *   ground its work in what the operator attached and cite the exact passage.
 * - **Operator side.** A `/crew-dossier` RPC channel that the DCode Agent
 *   Inspector drives. Attaching a source is the ONLY write, and it happens
 *   here on a path the Host builds.
 *
 * That asymmetry is deliberate. A space is trustworthy because nothing the
 * model controls decides what goes into it or where; giving the model an attach
 * tool would trade that away for convenience it does not need.
 * @module @dsh-portable/crew-dossier
 */
import type { Context } from '@deepseek-ai/cordis';
export { DOSSIER_DIRECTORY, MAX_HITS, MAX_HIT_CHARS, MAX_READ_CHARS, describeUnread, dossierMap, dossierRead, dossierSearch, openDossier, startDossier, type DossierPassage, type DossierSource, } from './dossier.ts';
export { registerDossierTools, type DossierToolContext } from './tools.ts';
/** Stable Cordis plugin name. */
export declare const name = "crew-dossier";
/** RPC channel the Dossier panel calls. */
export declare const DOSSIER_CHANNEL = "/crew-dossier";
/** Endpoints that channel serves. */
export declare const DOSSIER_ENDPOINTS: readonly ["summary", "attach", "search", "read"];
/** One endpoint name. */
export type DossierEndpoint = typeof DOSSIER_ENDPOINTS[number];
/** Narrow an untrusted endpoint string. */
export declare function isDossierEndpoint(value: string): value is DossierEndpoint;
/**
 * Uniform envelope, matching this distribution's other private channels.
 *
 * `details` is NOT optional decoration. A Connection handler's return value is
 * the wire `result` verbatim — `rpc-host.ts` passes it straight to
 * `fullResponse` without wrapping — and the browser parser rejects a failure
 * whose `error.details` is not an object, throwing
 * `connection: invalid server-response failure` instead of resolving `ok:
 * false`. A failure without it does not reach the panel as a failure; it
 * reaches it as an exception. `@dsh-portable/dcode-ui`'s Git channel carries
 * the same field for the same reason.
 */
export type DossierResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
        details: Record<string, unknown>;
    };
};
/**
 * Serve one dossier endpoint.
 *
 * `cwd` comes from the caller because a dossier belongs to a workspace, and the
 * browser knows which mission it is showing. Every path below it is built by the
 * kernel and contained, so a caller cannot address anything outside the space.
 * @param endpoint - endpoint name, already narrowed.
 * @param payload - the request body.
 * @returns the envelope the panel renders.
 */
export declare function handleDossierEndpoint(endpoint: DossierEndpoint, payload: unknown): Promise<DossierResult<unknown>>;
/**
 * Mount the dossier: the operator channel, the model tools, and the re-anchor
 * pass that keeps existing citations pointing at the right place after a source
 * is re-imported.
 * @param ctx - the injecting cordis context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map