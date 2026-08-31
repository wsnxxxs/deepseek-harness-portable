//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
//#region lib/types/ui-mode.js
var import_ui_mode_contract = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	/**
	* Dependency-free UI-mode contract shared by browser and Electron CJS entry points.
	*
	* `UI_MODES` is PRESENTATION ORDER, not a pair. Every switch surface — the two
	* in-page settings panels, the application menu, the tray menu, and the
	* command palette — renders this list in this order, so a mode never appears
	* in a different position depending on where it is offered. Adding a surface
	* means adding one entry here and its copy; nothing else enumerates modes.
	*
	* The official interface is listed first because it is the one surface that is
	* always present: the extension surfaces shadow it, and any of them failing to
	* load leaves it rendering. `DEFAULT_UI_MODE` is a separate decision.
	*/
	const UI_MODES = Object.freeze([
		"official",
		"dcode",
		"crew"
	]);
	function normalizeUiMode(value) {
		return UI_MODES.includes(value) ? value : void 0;
	}
	function withUiModeParam(url, mode, base) {
		const parsed = base === void 0 ? new URL(url) : new URL(url, base);
		parsed.searchParams.set("view", mode);
		return parsed.toString();
	}
	module.exports = Object.freeze({
		UI_MODES,
		DEFAULT_UI_MODE: "dcode",
		UI_MODE_QUERY_PARAM: "view",
		UI_MODE_STORAGE_KEY: "dsh.portable.uiMode",
		UI_MODE_CONFIG_FIELD: "uiMode",
		UI_MODE_BRIDGE_GLOBAL: "__DSH_UI_MODE_BRIDGE__",
		UI_MODE_EVENT: "dsh:ui-mode",
		UI_MODE_IPC_CHANNEL: "desktop:ui-mode",
		normalizeUiMode,
		withUiModeParam
	});
})))(), 1);
/** Every selectable front end, in presentation order. */
const UI_MODES = import_ui_mode_contract.default.UI_MODES;
/**
* The mode a surface without an explicit preference adopts. The workbench is
* the default; no surface is ever removed by selecting another, only unselected.
*/
const DEFAULT_UI_MODE = import_ui_mode_contract.default.DEFAULT_UI_MODE;
/** URL query parameter carrying an explicit mode (`?view=dcode`). */
const UI_MODE_QUERY_PARAM = import_ui_mode_contract.default.UI_MODE_QUERY_PARAM;
/** `localStorage` key holding the browser-side preference. */
const UI_MODE_STORAGE_KEY = import_ui_mode_contract.default.UI_MODE_STORAGE_KEY;
/** Desktop config field mirroring the preference for the next cold launch. */
const UI_MODE_CONFIG_FIELD = import_ui_mode_contract.default.UI_MODE_CONFIG_FIELD;
/** Renderer global the Electron preload installs to bridge desktop switch entries. */
const UI_MODE_BRIDGE_GLOBAL = import_ui_mode_contract.default.UI_MODE_BRIDGE_GLOBAL;
/** Window event the bridge dispatches when a desktop entry requests a mode. */
const UI_MODE_EVENT = import_ui_mode_contract.default.UI_MODE_EVENT;
/**
* Narrow an untrusted value to a {@link UiMode}.
* @param value - candidate from a URL, storage, config file or IPC message.
* @returns the mode, or undefined when the value names none.
*/
function asUiMode(value) {
	return import_ui_mode_contract.default.normalizeUiMode(value);
}
/**
* Resolve a mode from the first candidate that names one.
* @param candidates - preference sources in descending priority.
* @returns the winning mode, or {@link DEFAULT_UI_MODE} when none applies.
*/
function resolveUiMode(...candidates) {
	for (const candidate of candidates) {
		const mode = asUiMode(candidate);
		if (mode !== void 0) return mode;
	}
	return DEFAULT_UI_MODE;
}
/**
* The next mode in presentation order — what a cycling entry switches to.
*
* This replaced a two-mode `otherUiMode`. A keyboard shortcut or a menu
* accelerator has no list to choose from, so it needs a total order rather
* than an opposite; wrapping keeps every surface reachable from every other.
* @param mode - current mode.
* @param direction - `1` for the next surface, `-1` for the previous.
* @returns the mode a cycling entry selects.
*/
function cycleUiMode(mode, direction = 1) {
	const index = UI_MODES.indexOf(mode);
	if (index < 0) return DEFAULT_UI_MODE;
	return UI_MODES[(index + direction + UI_MODES.length) % UI_MODES.length];
}
/**
* Rewrite a page URL so a cold reload boots the given mode.
*
* Used by the desktop shell when it loads the harness URL, and by the browser
* half when it records the live switch in the address bar. The parameter is
* always written explicitly (never dropped for the default) so a reload of a
* copied URL is reproducible.
* @param url - absolute or relative URL to rewrite.
* @param mode - mode the reloaded page must adopt.
* @param base - base for relative inputs; required in non-browser callers.
* @returns the rewritten URL string, preserving every other query parameter.
*/
function withUiModeParam(url, mode, base) {
	return import_ui_mode_contract.default.withUiModeParam(url, mode, base);
}
/**
* Read the mode named by a URL's query string.
* @param search - `location.search` or an equivalent query string.
* @returns the requested mode, or undefined when the parameter is absent or unknown.
*/
function uiModeFromSearch(search) {
	return asUiMode(new URLSearchParams(search).get(UI_MODE_QUERY_PARAM));
}
//#endregion
export { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam };
