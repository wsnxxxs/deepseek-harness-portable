/**
 * Workbench-local view state.
 *
 * Strictly presentation: which top-level surface is showing, which aside tab
 * is selected, whether the palette is open, which file the diff viewer is
 * looking at. Nothing here duplicates a Host fact — the current session, the
 * workspace registry and the transcript all stay with their owning services.
 *
 * It is an external store rather than component state so the keyboard layer
 * and the command palette can drive navigation without threading callbacks
 * through the tree, and so a surface switch does not lose the operator's
 * place in the panels.
 * @module @dsh-portable/dcode-ui/client/state/navigation
 */
import { useSyncExternalStore } from 'react';
const INITIAL = {
    view: 'session',
    aside: 'changes',
    asideOpen: true,
    railOpen: true,
    paletteOpen: false,
    settingsSection: 'general',
    diff: undefined,
    inspectedCallId: undefined,
};
/**
 * Create the workbench's view-state store.
 * @returns a store shared by the tree, the keyboard layer and the palette.
 */
export function createNavigationStore() {
    let state = INITIAL;
    const listeners = new Set();
    const emit = () => { for (const listener of [...listeners])
        listener(); };
    const patch = (next) => {
        const merged = { ...state, ...next };
        if (Object.keys(next).every(key => Object.is(state[key], merged[key])))
            return;
        state = merged;
        emit();
    };
    return {
        getSnapshot: () => state,
        subscribe: (listener) => {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        patch,
        show: view => { patch({ view, paletteOpen: false }); },
        openSettings: section => { patch({ view: 'settings', settingsSection: section, paletteOpen: false }); },
        openAside: tab => { patch({ aside: tab, asideOpen: true }); },
        openDiff: (path, staged = false) => { patch({ diff: { path, staged }, aside: 'changes', asideOpen: true }); },
        closeDiff: () => { patch({ diff: undefined }); },
        inspect: callId => { patch({ inspectedCallId: callId, aside: 'details', asideOpen: true }); },
        togglePalette: open => { patch({ paletteOpen: open ?? !state.paletteOpen }); },
        toggleRail: () => { patch({ railOpen: !state.railOpen }); },
        toggleAside: () => { patch({ asideOpen: !state.asideOpen }); },
    };
}
/**
 * Read the view state.
 * @param store - the workbench store.
 * @returns the current state.
 */
export function useNavigation(store) {
    return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
//# sourceMappingURL=navigation.js.map