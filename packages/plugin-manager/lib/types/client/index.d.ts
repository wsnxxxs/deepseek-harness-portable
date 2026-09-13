/**
 * Browser entry for built-in feature management.
 *
 * The official settings panel has a Plugins section with an extension seat
 * (`settings.plugins.tab`), and upstream's own tab there is read-only. This
 * plugin adds the one page this distribution owes its operators: the feature
 * packages that ship *inside* the application, and a switch for each.
 *
 * It deliberately does not duplicate the marketplace's Installed tab, which is
 * about third-party packages — their versions, updates and uninstalls. A
 * built-in has none of those verbs. What it has is an on/off preference the
 * runtime reads when it composes the profile, which is exactly what this page
 * edits.
 * @module @dsh-portable/plugin-manager/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type PluginManagerKey } from './locales.ts';
export { PortablePluginsTab } from './PortablePluginsTab.tsx';
export type { PortablePluginsTabInjected, PortablePluginsTabProps } from './PortablePluginsTab.tsx';
export { createPortablePluginApi, type PortablePluginApi, type RpcCarrier, } from './rpc.ts';
export { PLUGIN_MANAGER_NS, en, zh, type PluginManagerKey, type PluginManagerTranslate, } from './locales.ts';
export type { PortablePluginList, PortablePluginResult, PortablePluginRow, PortablePluginToggle, } from '../host/contract.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Copy for the built-in features settings tab. */
        portablePlugins: PluginManagerKey;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "plugin-manager-client";
/**
 * Services this plugin cannot register without.
 *
 * `connection` is the RPC carrier the page calls the host over. It is injected
 * rather than probed so the tab never mounts against a context whose carrier
 * has not published yet; a deployment with no carrier at all still gets the
 * page, which explains itself instead of failing.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map