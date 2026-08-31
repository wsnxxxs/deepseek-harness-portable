/**
 * Host-side Cordis plugin entrypoint for @dsh-portable/ui-mode.
 *
 * The package is browser-side in substance: the mode is a property of one open
 * page, not of the Runtime, and nothing on the host needs to know which surface
 * a browser is rendering. This half exists because a client bundle is served
 * through the client module system only for a package that is a row in the
 * plugin graph, so the package needs a host entry to be that row.
 *
 * It therefore registers nothing. The vocabulary is re-exported here so host
 * code and the Electron shell can import mode names from the same module the
 * browser uses.
 * @module @dsh-portable/ui-mode
 */

import type { Context } from '@deepseek-ai/cordis'

export {
  DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT,
  UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode,
  uiModeFromSearch, withUiModeParam, type UiMode,
} from './ui-mode.ts'

/** Stable Cordis plugin name. */
export const name = 'ui-mode'

/**
 * Claim nothing on the host.
 * @param _ctx - the injecting cordis context, unused.
 */
export function apply(_ctx: Context): void {
  // Intentionally empty: see the module doc.
}
