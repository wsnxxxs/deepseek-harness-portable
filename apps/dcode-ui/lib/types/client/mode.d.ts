/**
 * The browser-side owner of the active UI mode.
 *
 * One store arbitrates every switch entry point — the URL parameter, the
 * in-page settings panels of both surfaces, the Electron application menu,
 * the tray menu, and the keyboard shortcut. A switch is a slot
 * re-registration inside the live page: the DSH Runtime, the Host connection,
 * the Session list and every open Conversation stay exactly as they were.
 *
 * Resolution order at boot, highest first:
 * 1. `?view=` on the page URL — the reproducible entry a desktop shell or a
 *    copied link can force.
 * 2. `localStorage` — the last switch made in this browser profile.
 * 3. The desktop bridge's reported config value — what the Electron shell
 *    persisted for the next cold launch.
 * 4. {@link DEFAULT_UI_MODE}.
 * @module @dsh-portable/dcode-ui/client/mode
 */
import { DEFAULT_UI_MODE, UI_MODE_EVENT, type UiMode } from '../ui-mode.ts';
export type { UiMode } from '../ui-mode.ts';
/**
 * The renderer face the Electron preload installs. Every member is optional:
 * the same bundle serves the browser surface, where no bridge exists at all.
 */
export interface UiModeBridge {
    /** Mode the desktop config recorded for this launch. */
    readonly configured?: UiMode | string;
    /** Report a switch so the desktop shell can persist it and retick its menus. */
    setMode?: (mode: UiMode) => void;
    /** Subscribe to desktop-initiated switches; returns an unsubscribe. */
    onMode?: (listener: (mode: UiMode) => void) => () => void;
}
/** Read the preload-installed bridge, if this page runs inside the desktop shell. */
export declare function readBridge(): UiModeBridge | undefined;
/** Observable current mode with one setter shared by every entry point. */
export interface UiModeStore {
    /** Current mode. */
    get(): UiMode;
    /**
     * Switch surfaces. Idempotent: selecting the active mode is a no-op, so a
     * menu retick or an echoed desktop message cannot cause a remount.
     * @param mode - mode to activate.
     * @param origin - who asked; a `desktop` switch is not echoed back to the shell.
     */
    set(mode: UiMode, origin?: 'page' | 'desktop'): void;
    /** Switch to the mode that is not active. */
    toggle(): void;
    /**
     * Observe changes.
     * @param listener - called after the mode changed.
     * @returns unsubscribe.
     */
    subscribe(listener: (mode: UiMode) => void): () => void;
    /** Release the window and bridge listeners this store installed. */
    dispose(): void;
}
/**
 * Create the page's single mode store and wire every external entry point.
 *
 * @returns the store; the caller owns {@link UiModeStore.dispose}.
 */
export declare function createUiModeStore(): UiModeStore;
export { DEFAULT_UI_MODE, UI_MODE_EVENT };
//# sourceMappingURL=mode.d.ts.map