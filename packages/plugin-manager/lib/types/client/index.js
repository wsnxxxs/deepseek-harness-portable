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
import { PortablePluginsTab } from "./PortablePluginsTab.js";
import { createPortablePluginApi } from "./rpc.js";
import { PLUGIN_MANAGER_NS, en, zh } from "./locales.js";
export { PortablePluginsTab } from "./PortablePluginsTab.js";
export { createPortablePluginApi, } from "./rpc.js";
export { PLUGIN_MANAGER_NS, en, zh, } from "./locales.js";
/** Stable Cordis plugin name. */
export const name = 'plugin-manager-client';
/**
 * Services this plugin cannot register without.
 *
 * `connection` is the RPC carrier the page calls the host over. It is injected
 * rather than probed so the tab never mounts against a context whose carrier
 * has not published yet; a deployment with no carrier at all still gets the
 * page, which explains itself instead of failing.
 */
export const inject = ['slots', 'locale', 'connection'];
/**
 * Order within the official Plugins section.
 *
 * Upstream's configuration page is 0 and the marketplace's own tabs are 5 and
 * 6, so 3 puts the harness's own features between "how the shipped plugins are
 * configured" and "what was installed from outside".
 */
const PLUGINS_TAB_ORDER = 3;
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(PLUGIN_MANAGER_NS, { zh, en }), 'plugin-manager: dictionaries');
    const t = ctx.locale.bind(PLUGIN_MANAGER_NS);
    // Built once: the carrier lives as long as the client context, and the face
    // holds no per-call state.
    const api = createPortablePluginApi(ctx.get('connection'));
    const injected = () => ({ api });
    // `slots.inject` rather than a bare register: the Plugins section belongs to
    // `ui-settings-plugins`, which may activate after this plugin, and a renderer
    // epoch change must re-run the contribution instead of dropping it.
    ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
        name: 'settings.plugins.tab',
        id: 'portable-builtins',
        order: PLUGINS_TAB_ORDER,
        label: () => t('tab'),
        locale: PLUGIN_MANAGER_NS,
        inject: injected,
    }, PortablePluginsTab));
}
//# sourceMappingURL=index.js.map