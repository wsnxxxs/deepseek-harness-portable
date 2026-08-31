import { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam } from "./ui-mode.js";
//#region lib/types/index.js
/** Stable Cordis plugin name. */
const name = "ui-mode";
/**
* Claim nothing on the host.
* @param _ctx - the injecting cordis context, unused.
*/
function apply(_ctx) {}
//#endregion
export { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, apply, asUiMode, cycleUiMode, name, resolveUiMode, uiModeFromSearch, withUiModeParam };
