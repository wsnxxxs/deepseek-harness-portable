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
import agentTeamsRemote from '@deepseek-ai/dsh-experimental-agent-team/remote';
import { createClusterActions } from "./actions.js";
import { bindTranslate } from "./deps.js";
import { ClusterHeaderAction } from "./HeaderAction.js";
import { isTeamWorthShowing } from "./model.js";
import { CLUSTER_NS, en, zh } from "./locales.js";
import { ClusterService } from "./service.js";
export { CLUSTER_SERVICE } from "../contract.js";
export { ClusterService } from "./service.js";
export { ClusterPanel, createClusterPanel } from "./ClusterPanel.js";
export { ClusterHeaderAction } from "./HeaderAction.js";
export { CLUSTER_NS, en, zh } from "./locales.js";
/** Stable Cordis plugin name. */
export const name = 'cluster-ui';
/**
 * Services this plugin cannot register without.
 *
 * `remote.agentTeams` is deliberately absent: the namespace is contributed by
 * this plugin's own `$mount` call and cannot be a precondition of the body
 * that performs it. It is injected in the inner scope instead.
 */
export const inject = ['slots', 'locale', 'sessions', 'remote'];
/**
 * Order of the Cluster entry among the conversation header's actions.
 *
 * Upstream's own Agent Teams action, where an assembly ships it, takes 20.
 * Sitting after it keeps both readable in the rare assembly that has the two.
 */
const HEADER_ACTION_ORDER = 24;
/**
 * Publish the Cluster surface and its official-UI seat.
 * @param scope - a client context scoped inside the `remote.agentTeams` injection.
 */
function registerSurfaces(scope) {
    const deps = {
        actions: createClusterActions(scope),
        t: bindTranslate(scope.locale.bind(CLUSTER_NS)),
    };
    const cluster = new ClusterService(scope, deps);
    // Built once. The slot calls `inject` per render occurrence, and a fresh
    // object each time would change the component's props identity every frame.
    const header = {
        Panel: cluster.Panel,
        hasTeam: async (sessionId) => {
            const result = await cluster.actions.view(sessionId);
            return result.ok && isTeamWorthShowing(result.value);
        },
    };
    // `slots.inject` rather than a bare register: `conversation.session.header.
    // actions` is declared by ui-conversation's own registration, so this waits
    // for that declaration instead of throwing in an assembly that loads this
    // plugin first, and a renderer epoch change re-runs the contribution rather
    // than silently dropping it.
    scope.slots.inject('conversation.session.header.actions', () => scope.slots.register({
        name: 'conversation.session.header.actions',
        id: 'cluster',
        order: HEADER_ACTION_ORDER,
        locale: CLUSTER_NS,
        inject: () => header,
    }, ClusterHeaderAction));
}
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(CLUSTER_NS, { zh, en }), 'cluster-ui: dictionaries');
    ctx.effect(async () => {
        let disposeRemote;
        try {
            disposeRemote = await ctx.remote.$mount(agentTeamsRemote);
        }
        catch (cause) {
            // An assembly whose host never mounted the Agent Teams row cannot answer
            // `agentTeams.*`. That is a deployment shape, not a fault of this page:
            // leaving the service unpublished is exactly the degradation every host
            // already handles, so it is reported once and the plugin stays loaded
            // and inert rather than failing its fiber.
            ctx.logger.warn('cluster-ui: the Agent Teams Remote namespace is unavailable; Cluster mode stays hidden');
            ctx.logger.warn(cause);
            return () => { };
        }
        const surfaces = ctx.inject(['remote.agentTeams', 'sessions', 'slots', 'locale'], registerSurfaces);
        try {
            await surfaces;
        }
        catch (error) {
            await surfaces.dispose();
            await disposeRemote();
            throw error;
        }
        return async () => {
            await surfaces.dispose();
            await disposeRemote();
        };
    }, 'cluster-ui: team remote and surfaces');
}
//# sourceMappingURL=index.js.map