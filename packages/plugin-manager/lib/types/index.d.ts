/**
 * Host half of `@dsh-portable/plugin-manager`.
 *
 * This distribution ships a handful of feature packages the Loader mounts as
 * rows of the composed `web` profile. Managing them — seeing what is there and
 * switching one off — used to be possible only through a patched build of the
 * third-party `dsh-plugin-marketplace`. That is the wrong owner twice over: the
 * capability disappears entirely when the marketplace is not installed, and it
 * disappears silently when the operator takes the marketplace's own update
 * offer, because a newer upstream build has no idea these packages exist.
 *
 * So the distribution owns it. This half claims the `/portable-plugins`
 * Connection channel, reads the built-in rows straight off the running Loader,
 * and records the enable/disable preference in the same web-profile manifest
 * key `apps/runtime` reads when it composes the profile.
 * @module @dsh-portable/plugin-manager
 */
import type { Context } from '@deepseek-ai/cordis';
export { PORTABLE_PLUGINS_CHANNEL, PORTABLE_PLUGIN_ENDPOINTS, isPortablePluginEndpoint, type PortablePluginEndpoint, type PortablePluginErrorCode, type PortablePluginList, type PortablePluginResult, type PortablePluginRow, type PortablePluginToggle, } from './host/contract.ts';
export { PORTABLE_SCOPE, composeRows, nextPreferences, portablePreferences, toggleOutcome, type LoaderEntryView, type PackageFacts, type PortablePreferences, } from './host/registry.ts';
export { defaultDeps, handlePortablePluginEndpoint, listPortablePlugins, packageFactsFrom, setPortablePluginEnabled, type PluginLoaderView, type PortablePluginDeps, } from './host/rpc.ts';
/** Stable Cordis plugin name. */
export declare const name = "plugin-manager";
/**
 * Services this plugin cannot work without.
 *
 * `loader` is the roster itself and `connection` is the carrier the settings
 * tab calls over; cordis holds the body until both publish, so the channel is
 * never claimed against a half-built context.
 */
export declare const inject: string[];
/** The minimum RPC face this plugin needs off the Connection service. */
/**
 * Claim the `/portable-plugins` channel.
 * @param ctx - the injecting cordis context.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map