/**
 * Browser entry for Cluster mode.
 *
 * The plugin does three things, in one lifecycle:
 *
 * - it mounts the generated Team Remote namespace, which is what turns a host
 *   with the `agent-team` row into a page that can answer `agentTeams.*`;
 * - it publishes {@link ClusterService} so any surface can mount the roster
 *   and shared task board without depending on this package;
 * - it seats the same panel in the official conversation header, so an
 *   assembly with no custom surface at all still has Cluster mode.
 *
 * ## Why the registration is shaped this way
 *
 * Cordis refuses `ctx.remote.<ns>` from a context that did not inject that
 * namespace, and the Team namespace does not exist until `$mount` resolves —
 * so it cannot be named in {@link inject}, which is evaluated before the body
 * runs. The mount therefore happens inside an effect, and everything that
 * needs the namespace is built inside `ctx.inject(['remote.agentTeams'], …)`.
 * That nesting is also the disposal order: unloading this plugin disposes the
 * surfaces first and the Remote namespace second, never the other way round.
 *
 * The service is published from that inner scope on purpose. Its existence is
 * then evidence rather than a claim: a host reading `ctx.get('cluster')` and
 * finding a value knows the Team namespace answered on this page, and a
 * withdrawal of the namespace withdraws the panel from every host at once.
 *
 * Nothing here knows which surfaces exist. Hosts read the service; they are
 * never injected, imported or announced to.
 * @module @dsh-portable/cluster-ui/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type ClusterKey } from './locales.ts';
import { ClusterService } from './service.ts';
export { CLUSTER_SERVICE, type ClusterPanelProps, type ClusterSurface } from '../contract.ts';
export { ClusterService } from './service.ts';
export { ClusterPanel, createClusterPanel } from './ClusterPanel.tsx';
export { ClusterHeaderAction, type ClusterHeaderInjected } from './HeaderAction.tsx';
export { CLUSTER_NS, en, zh, type ClusterKey } from './locales.ts';
export type { ClusterActions, ClusterDeps } from './deps.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The one Cluster surface for this browser page, when the Team Remote answered. */
        cluster: ClusterService;
    }
}
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Cluster mode's own copy. */
        cluster: ClusterKey;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "cluster-ui";
/**
 * Services this plugin cannot register without.
 *
 * `remote.agentTeams` is deliberately absent: the namespace is contributed by
 * this plugin's own `$mount` call and cannot be a precondition of the body
 * that performs it. It is injected in the inner scope instead.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map