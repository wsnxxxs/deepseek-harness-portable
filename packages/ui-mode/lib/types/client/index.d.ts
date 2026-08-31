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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { UiModeService } from './service.ts';
import { type UiModeKey } from './locales.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The one active-interface controller for this browser page. */
        uiMode: UiModeService;
    }
}
export { createUiModeStore, readBridge, type UiModeBridge, type UiModeController, type UiModeStore, } from './store.ts';
export { InterfaceSettingsSection } from './InterfaceSettingsSection.tsx';
export { MODE_COPY, UI_MODE_NS, en, zh, type UiModeKey } from './locales.ts';
export { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam, type UiMode, } from '../ui-mode.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The interface switch's own copy. */
        uiMode: UiModeKey;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "ui-mode-client";
/**
 * `slots` and `locale` are the whole dependency set: this plugin contributes
 * one settings row and nothing else. It deliberately does NOT inject any
 * surface package — the vocabulary must load even when every extension surface
 * fails to, so that the official UI still offers a way back.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map