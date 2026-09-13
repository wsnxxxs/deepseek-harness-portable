import { registerRpc } from '@dsh-portable/connection-rpc';
import { isPortablePluginEndpoint, PORTABLE_PLUGIN_ENDPOINTS } from "./host/contract.js";
import { defaultDeps, handlePortablePluginEndpoint } from "./host/rpc.js";
export { PORTABLE_PLUGINS_CHANNEL, PORTABLE_PLUGIN_ENDPOINTS, isPortablePluginEndpoint, } from "./host/contract.js";
export { PORTABLE_SCOPE, composeRows, nextPreferences, portablePreferences, toggleOutcome, } from "./host/registry.js";
export { defaultDeps, handlePortablePluginEndpoint, listPortablePlugins, packageFactsFrom, setPortablePluginEnabled, } from "./host/rpc.js";
/** Stable Cordis plugin name. */
export const name = 'plugin-manager';
/**
 * Services this plugin cannot work without.
 *
 * `loader` is the roster itself and `connection` is the carrier the settings
 * tab calls over; cordis holds the body until both publish, so the channel is
 * never claimed against a half-built context.
 */
export const inject = ['connection', 'webServer', 'loader'];
/** The minimum RPC face this plugin needs off the Connection service. */
/**
 * Claim the `/portable-plugins` channel.
 * @param ctx - the injecting cordis context.
 */
export function apply(ctx) {
    const loader = ctx.get('loader');
    if (loader === undefined)
        return;
    // Resolved once: the profile directory and the installation's module graph
    // do not move while the process runs, and the Loader roster is read live on
    // every call.
    const deps = defaultDeps(loader, import.meta.url);
    ctx.effect(() => registerRpc(ctx, 'portable-plugins', PORTABLE_PLUGIN_ENDPOINTS, (endpoint, payload) => Promise.resolve(isPortablePluginEndpoint(endpoint)
        ? handlePortablePluginEndpoint(endpoint, payload, deps)
        : {
            ok: false,
            error: {
                code: 'bad-request',
                message: 'unknown /portable-plugins RPC endpoint',
                details: { endpoint },
            },
        })), 'plugin-manager: /portable-plugins channel');
}
//# sourceMappingURL=index.js.map