/**
 * The desktop/web UI-mode vocabulary, shared by every switch entry point.
 *
 * Two front ends run inside one browser page over one DSH Runtime: the
 * official DSH UI (`ui-layout`'s AppFrame in the built-in `root` slot) and
 * this distribution's modern workbench. Switching is a slot re-registration,
 * never a Runtime restart, so both surfaces keep reading the same Session,
 * Workspace, Conversation and Settings state.
 *
 * This module is deliberately dependency-free: the Electron main process
 * (CommonJS), the DSH host plugin, and the browser bundle all resolve the
 * same constants, so a mode string cannot drift between the menu, the tray,
 * the desktop config file and the URL.
 * @module @dsh-portable/dcode-ui/ui-mode
 */
/** One selectable front end. */
export type UiMode = 'dcode' | 'official';
/** Every selectable front end, in presentation order. */
export declare const UI_MODES: readonly UiMode[];
/**
 * The mode a surface without an explicit preference adopts. The modern
 * workbench is the default; the official UI is never removed, only unselected.
 */
export declare const DEFAULT_UI_MODE: UiMode;
/** URL query parameter carrying an explicit mode (`?view=dcode`, `?view=official`). */
export declare const UI_MODE_QUERY_PARAM: "view";
/** `localStorage` key holding the browser-side preference. */
export declare const UI_MODE_STORAGE_KEY: "dsh.portable.uiMode";
/** Desktop config field mirroring the preference for the next cold launch. */
export declare const UI_MODE_CONFIG_FIELD: "uiMode";
/** Renderer global the Electron preload installs to bridge desktop switch entries. */
export declare const UI_MODE_BRIDGE_GLOBAL: "__DSH_UI_MODE_BRIDGE__";
/** Window event the bridge dispatches when a desktop entry requests a mode. */
export declare const UI_MODE_EVENT: "dsh:ui-mode";
/**
 * Narrow an untrusted value to a {@link UiMode}.
 * @param value - candidate from a URL, storage, config file or IPC message.
 * @returns the mode, or undefined when the value names none.
 */
export declare function asUiMode(value: unknown): UiMode | undefined;
/**
 * Resolve a mode from the first candidate that names one.
 * @param candidates - preference sources in descending priority.
 * @returns the winning mode, or {@link DEFAULT_UI_MODE} when none applies.
 */
export declare function resolveUiMode(...candidates: readonly unknown[]): UiMode;
/**
 * The other mode — what a toggle entry switches to.
 * @param mode - current mode.
 * @returns the mode a toggle selects.
 */
export declare function otherUiMode(mode: UiMode): UiMode;
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
export declare function withUiModeParam(url: string, mode: UiMode, base?: string): string;
/**
 * Read the mode named by a URL's query string.
 * @param search - `location.search` or an equivalent query string.
 * @returns the requested mode, or undefined when the parameter is absent or unknown.
 */
export declare function uiModeFromSearch(search: string): UiMode | undefined;
//# sourceMappingURL=ui-mode.d.ts.map