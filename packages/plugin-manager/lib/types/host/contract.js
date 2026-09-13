/**
 * The `/portable-plugins` channel contract. Types and endpoint names only, so
 * the browser half can be typed against it without importing host code.
 * @module @dsh-portable/plugin-manager/host/contract
 */
/** Connection RPC channel this plugin claims. */
export const PORTABLE_PLUGINS_CHANNEL = '/portable-plugins';
/** Every endpoint of the channel. */
export const PORTABLE_PLUGIN_ENDPOINTS = ['list', 'set-enabled'];
/**
 * Narrow an endpoint name arriving off the wire.
 * @param value - the endpoint the caller asked for.
 * @returns whether it is one this channel serves.
 */
export function isPortablePluginEndpoint(value) {
    return PORTABLE_PLUGIN_ENDPOINTS.includes(value);
}
//# sourceMappingURL=contract.js.map