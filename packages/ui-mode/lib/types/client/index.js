/**
 * Browser entry for the shared UI-mode vocabulary.
 *
 * This plugin renders no surface of its own. It exists so that the things
 * every surface needs in common have exactly one owner:
 *
 * - the `ctx.uiMode` SERVICE, which is one instance for the whole page even
 *   when each surface plugin is separately bundled;
 * - the interface SWITCH in the official General settings page, which must be
 *   one row listing every surface — not one row per surface that registers it,
 *   and not a row that disappears with the surface that owned it.
 *
 * Surfaces declare the `uiMode` Cordis injection, which delays their plugin
 * body until this owner has published the service.
 * @module @dsh-portable/ui-mode/client
 */
import { UiModeService } from "./service.js";
import { UI_MODE_NS, en, zh } from "./locales.js";
import { InterfaceSettingsSection } from "./InterfaceSettingsSection.js";
export { createUiModeStore, readBridge, } from "./store.js";
export { InterfaceSettingsSection } from "./InterfaceSettingsSection.js";
export { MODE_COPY, UI_MODE_NS, en, zh } from "./locales.js";
export { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam, } from "../ui-mode.js";
/** Stable Cordis plugin name. */
export const name = 'ui-mode-client';
/**
 * `slots` and `locale` are the whole dependency set: this plugin contributes
 * one settings row and nothing else. It deliberately does NOT inject any
 * surface package — the vocabulary must load even when every extension surface
 * fails to, so that the official UI still offers a way back.
 */
export const inject = ['slots', 'locale'];
/**
 * Order of the interface row in the official General settings page.
 *
 * Appearance is 10; the interface a window shows is the same kind of decision
 * one step out, so it sits directly beneath it.
 */
const SETTINGS_GENERAL_ITEM_ORDER = 10.5;
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(UI_MODE_NS, { zh, en }), 'ui-mode: dictionaries');
    const mode = new UiModeService(ctx);
    // `settings.general.item` joins the existing General page instead of adding a
    // top-level settings section, and `slots.inject` rather than a bare register
    // because a renderer epoch change must re-run the contribution rather than
    // silently drop it.
    ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'portable-interface',
        order: SETTINGS_GENERAL_ITEM_ORDER,
        locale: UI_MODE_NS,
        inject: () => ({ mode }),
    }, InterfaceSettingsSection));
}
//# sourceMappingURL=index.js.map