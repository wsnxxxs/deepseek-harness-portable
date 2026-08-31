/**
 * The browser-side owner of the active UI mode.
 *
 * One store arbitrates every switch entry point — the URL parameter, the
 * in-page settings panels of every surface, the Electron application menu, the
 * tray menu, and the keyboard shortcut. A switch is a slot re-registration
 * inside the live page: the DSH Runtime, the Host connection, the Session list
 * and every open Conversation stay exactly as they were.
 *
 * Resolution order at boot, highest first:
 * 1. `?view=` on the page URL — the reproducible entry a desktop shell or a
 *    copied link can force.
 * 2. `localStorage` — the last switch made in this browser profile.
 * 3. The desktop bridge's reported config value — what the Electron shell
 *    persisted for the next cold launch.
 * 4. {@link DEFAULT_UI_MODE}.
 *
 * The Cordis client plugin owns one store and publishes it as `ctx.uiMode`.
 * Alternate surfaces consume that service instead of relying on this module's
 * identity: independently bundled plugins can otherwise instantiate separate
 * stores and disagree inside one page.
 * @module @dsh-portable/ui-mode/client/store
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
/** Observable current mode shared by every switch entry point. */
export interface UiModeController {
    /** Current mode. */
    get(): UiMode;
    /**
     * Switch surfaces. Idempotent: selecting the active mode is a no-op, so a
     * menu retick or an echoed desktop message cannot cause a remount.
     * @param mode - mode to activate.
     * @param origin - who asked; a `desktop` switch is not echoed back to the shell.
     */
    set(mode: UiMode, origin?: 'page' | 'desktop'): void;
    /**
     * Advance to the next surface in presentation order, wrapping.
     * @param direction - `1` for the next surface, `-1` for the previous.
     */
    cycle(direction?: 1 | -1): void;
    /**
     * Observe changes.
     * @param listener - called after the mode changed.
     * @returns unsubscribe.
     */
    subscribe(listener: (mode: UiMode) => void): () => void;
}
/** Store owned by the UI-mode service or a standalone test caller. */
export interface UiModeStore extends UiModeController {
    /** Release the window and bridge listeners this store installed. */
    dispose(): void;
}
/**
 * Create a standalone mode store and wire every external entry point.
 *
 * Plugin code consumes `ctx.uiMode`; this factory exists for the owning service
 * and tests that need an isolated instance.
 * @returns the store; the caller owns {@link UiModeStore.dispose}.
 */
export declare function createUiModeStore(): UiModeStore;
export { DEFAULT_UI_MODE, UI_MODE_EVENT };
//# sourceMappingURL=store.d.ts.map