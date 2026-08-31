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
    /**
     * Report which surfaces this page can actually render.
     *
     * Only the page knows: availability is a property of which client plugins
     * loaded, which the Electron main process never sees. Without this report the
     * application and tray menus would keep offering a surface the in-page switch
     * has already greyed out, and the more prominent of the two pickers would be
     * the one telling the operator the wrong thing.
     */
    setAvailable?: (modes: readonly UiMode[]) => void;
}
/** Read the preload-installed bridge, if this page runs inside the desktop shell. */
export declare function readBridge(): UiModeBridge | undefined;
/** Observable current mode shared by every switch entry point. */
export interface UiModeController {
    /** Current mode. */
    get(): UiMode;
    /**
     * Whether a surface capable of rendering this mode is present in this build.
     *
     * `official` is always available: it is upstream's own shell, and it is what
     * renders whenever no extension surface has claimed `root`. Every other mode
     * is available only once its surface has announced itself, so a build that
     * ships without a surface — or one whose runtime row the Host disabled
     * because a capability it needs is missing — reports the mode as
     * unavailable rather than offering a choice that lands on the official UI
     * with no explanation.
     * @param mode - the mode to test.
     * @returns true when selecting it would actually show that surface.
     */
    available(mode: UiMode): boolean;
    /**
     * Declare that this page can render one mode.
     *
     * Called by a surface's plugin body, which runs only when every service that
     * surface injects resolved. Announcing is therefore evidence rather than a
     * claim: a surface that could not load never announces, and the switch says
     * so instead of silently doing nothing.
     * @param mode - the mode this caller renders.
     * @returns a disposer withdrawing the announcement.
     */
    announce(mode: UiMode): () => void;
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
     *
     * Fires for an availability change as well as a mode change, so a switch
     * rendered before its surfaces finished loading repaints when they arrive.
     * @param listener - called after the mode or the available set changed.
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