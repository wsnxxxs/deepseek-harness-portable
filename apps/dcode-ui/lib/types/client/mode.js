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
import { DEFAULT_UI_MODE, UI_MODE_BRIDGE_GLOBAL, UI_MODE_EVENT, UI_MODE_STORAGE_KEY, asUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam, } from "../ui-mode.js";
/** Read the preload-installed bridge, if this page runs inside the desktop shell. */
export function readBridge() {
    const bridge = globalThis[UI_MODE_BRIDGE_GLOBAL];
    return typeof bridge === 'object' && bridge !== null ? bridge : undefined;
}
/** Read the stored preference, tolerating a storage-denied browser profile. */
function readStored() {
    try {
        return asUiMode(globalThis.localStorage?.getItem(UI_MODE_STORAGE_KEY));
    }
    catch {
        // Private-mode or policy-blocked storage: the URL and the bridge still decide.
        return undefined;
    }
}
/** Persist the preference, tolerating a storage-denied browser profile. */
function writeStored(mode) {
    try {
        globalThis.localStorage?.setItem(UI_MODE_STORAGE_KEY, mode);
    }
    catch {
        // A page that cannot persist still switches; only the next reload forgets.
    }
}
/**
 * Reflect the active mode in the address bar without navigating.
 *
 * This is what makes a reload reproduce the surface the operator was looking
 * at, and what makes `?view=official` a real entry point rather than a
 * boot-only flag.
 */
function writeLocation(mode) {
    const history = globalThis.history;
    const location = globalThis.location;
    if (history === undefined || location === undefined || typeof history.replaceState !== 'function')
        return;
    try {
        const next = withUiModeParam(location.href, mode);
        if (next !== location.href)
            history.replaceState(history.state, '', next);
    }
    catch {
        // A non-URL document base (about:blank in a test harness) simply keeps its address.
    }
}
/**
 * Create the page's single mode store and wire every external entry point.
 *
 * @returns the store; the caller owns {@link UiModeStore.dispose}.
 */
export function createUiModeStore() {
    const bridge = readBridge();
    let current = resolveUiMode(uiModeFromSearch(globalThis.location?.search ?? ''), readStored(), bridge?.configured);
    const listeners = new Set();
    const disposers = [];
    // The URL is normalized once at boot so the first paint and a reload agree,
    // even when the mode came from storage or the desktop config.
    writeLocation(current);
    const apply = (next, origin) => {
        if (next === current)
            return;
        current = next;
        writeStored(next);
        writeLocation(next);
        if (origin === 'page')
            bridge?.setMode?.(next);
        for (const listener of [...listeners])
            listener(next);
    };
    if (typeof bridge?.onMode === 'function') {
        disposers.push(bridge.onMode(mode => { apply(resolveUiMode(mode), 'desktop'); }));
    }
    // Window-event entry: the fallback path for a desktop build whose preload
    // predates the bridge, and the seam a settings panel in either surface uses
    // without importing this module.
    const onWindowEvent = (event) => {
        const detail = event.detail;
        const requested = asUiMode(typeof detail === 'string' ? detail : detail?.mode);
        if (requested !== undefined)
            apply(requested, 'page');
    };
    globalThis.addEventListener?.(UI_MODE_EVENT, onWindowEvent);
    disposers.push(() => { globalThis.removeEventListener?.(UI_MODE_EVENT, onWindowEvent); });
    // Cross-tab agreement: a second window of the same origin follows a switch.
    const onStorage = (event) => {
        if (event.key !== UI_MODE_STORAGE_KEY)
            return;
        const requested = asUiMode(event.newValue);
        if (requested !== undefined)
            apply(requested, 'desktop');
    };
    globalThis.addEventListener?.('storage', onStorage);
    disposers.push(() => { globalThis.removeEventListener?.('storage', onStorage); });
    return {
        get: () => current,
        set: (mode, origin = 'page') => { apply(mode, origin); },
        toggle: () => { apply(current === 'dcode' ? 'official' : 'dcode', 'page'); },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        dispose: () => {
            for (const dispose of disposers.splice(0))
                dispose();
            listeners.clear();
        },
    };
}
export { DEFAULT_UI_MODE, UI_MODE_EVENT };
//# sourceMappingURL=mode.js.map