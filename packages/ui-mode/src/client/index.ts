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

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only imports pull the declaration merges (ctx.slots, ctx.locale, the
// SlotMap keys) into this compilation unit without adding a runtime edge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-general/client'
import { UiModeService } from './service.ts'
import { UI_MODE_NS, en, zh, type UiModeKey } from './locales.ts'
import { InterfaceSettingsSection } from './InterfaceSettingsSection.tsx'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The one active-interface controller for this browser page. */
    uiMode: UiModeService
  }
}

export {
  createUiModeStore, readBridge,
  type UiModeBridge, type UiModeController, type UiModeStore,
} from './store.ts'
export { InterfaceSettingsSection } from './InterfaceSettingsSection.tsx'
export { MODE_COPY, UI_MODE_NS, en, zh, type UiModeKey } from './locales.ts'
export {
  DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT,
  UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode,
  uiModeFromSearch, withUiModeParam, type UiMode,
} from '../ui-mode.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The interface switch's own copy. */
    uiMode: UiModeKey
  }
}

/** Stable Cordis plugin name. */
export const name = 'ui-mode-client'

/**
 * `slots` and `locale` are the whole dependency set: this plugin contributes
 * one settings row and nothing else. It deliberately does NOT inject any
 * surface package — the vocabulary must load even when every extension surface
 * fails to, so that the official UI still offers a way back.
 */
export const inject = ['slots', 'locale']

/**
 * Order of the interface row in the official General settings page.
 *
 * Appearance is 10; the interface a window shows is the same kind of decision
 * one step out, so it sits directly beneath it.
 */
const SETTINGS_GENERAL_ITEM_ORDER = 10.5

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(UI_MODE_NS, { zh, en }), 'ui-mode: dictionaries')

  const mode = new UiModeService(ctx)

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
  }, InterfaceSettingsSection))
}
