/**
 * Host-side Cordis plugin entrypoint for @dsh-portable/crew-ui.
 *
 * Mission Control is browser-side in substance. Everything it shows already has
 * a Host owner: sessions, workspaces and conversations come from their
 * controllers, and the task board comes from the `agentTeams` service that
 * `apps/runtime/src/packaged-bin.ts` mounts on the host plane — deliberately
 * NOT from this package, because the Gateway resolves that Remote receiver from
 * the host context and a surface-owned copy would be a second source of truth.
 *
 * This half exists because a client bundle is served through the client module
 * system only for a package that is a row in the plugin graph, so the package
 * needs a host entry to be that row.
 * @module @dsh-portable/crew-ui
 */
import type { Context } from '@deepseek-ai/cordis';
/** Stable Cordis plugin name. */
export declare const name = "crew-ui";
/**
 * Claim nothing on the host.
 * @param _ctx - the injecting cordis context, unused.
 */
export declare function apply(_ctx: Context): void;
//# sourceMappingURL=index.d.ts.map