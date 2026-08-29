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
import { fitPanels, initialLayoutSize, LAYOUT_FIT } from "./layout.js";
const INITIAL_LAYOUT = initialLayoutSize();
const INITIAL = {
    view: 'session',
    aside: 'changes',
    asideOpen: LAYOUT_FIT[INITIAL_LAYOUT].asideOpen,
    // A card the operator summons, never something the frame opens for them.
    summaryOpen: false,
    railOpen: LAYOUT_FIT[INITIAL_LAYOUT].railOpen,
    paletteOpen: false,
    layout: INITIAL_LAYOUT,
    railPinned: false,
    asidePinned: false,
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
    /**
     * Record that a panel was moved by hand, where that says anything.
     * @param key - the pin to set.
     * @returns the patch fragment, empty while the frame is compact.
     */
    const pin = (key) => (state.layout === 'compact' ? {} : { [key]: true });
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
        // The compact drawer floats over the conversation, so every rail entry
        // that changes what is showing behind it also dismisses it.
        show: view => { patch({ view, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false } : {}) }); },
        openSettings: section => { patch({ view: 'settings', settingsSection: section, paletteOpen: false }); },
        // Picking a row in the summary card is a navigation, so the card gives
        // way to the panel it just sent the operator to.
        openAside: tab => { patch({ aside: tab, asideOpen: true, summaryOpen: false, ...pin('asidePinned') }); },
        openDiff: (path, staged = false) => {
            patch({ diff: { path, staged }, aside: 'changes', asideOpen: true, ...pin('asidePinned') });
        },
        closeDiff: () => { patch({ diff: undefined }); },
        inspect: callId => {
            patch({ inspectedCallId: callId, aside: 'details', asideOpen: true, ...pin('asidePinned') });
        },
        togglePalette: open => { patch({ paletteOpen: open ?? !state.paletteOpen }); },
        toggleRail: () => { patch({ railOpen: !state.railOpen, ...pin('railPinned') }); },
        closeRail: () => { patch({ railOpen: false, ...pin('railPinned') }); },
        toggleAside: () => { patch({ asideOpen: !state.asideOpen, ...pin('asidePinned') }); },
        toggleSummary: open => { patch({ summaryOpen: open ?? !state.summaryOpen }); },
        fit: size => {
            if (state.layout === size)
                return;
            patch({ layout: size, ...fitPanels(size, state) });
        },
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