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
import { fitPanels, initialLayoutSize, LAYOUT_FIT, readContextPanelPreference, writeContextPanelPreference, } from "./layout.js";
/** Stable visual and keyboard order of the preview-panel tabs. */
export const ASIDE_TABS = ['changes', 'terminal', 'goal', 'details'];
/** Highest-priority automatic context signal, if the task has one. */
export function primaryAsideTab(context) {
    if (context.hasError)
        return 'details';
    if (context.hasChanges)
        return 'changes';
    if (context.goalActive)
        return 'goal';
    return undefined;
}
/** Put the most actionable context first while retaining every existing tab. */
export function orderedAsideTabs(context) {
    const priority = [];
    if (context.hasError)
        priority.push('details');
    if (context.hasChanges)
        priority.push('changes');
    if (context.goalActive)
        priority.push('goal');
    return [...new Set([...priority, ...ASIDE_TABS])];
}
/** Resolve the next preview tab, wrapping seamlessly at either edge. */
export function adjacentAsideTab(tab, direction, tabs = ASIDE_TABS) {
    const index = tabs.indexOf(tab);
    return tabs[(index + direction + tabs.length) % tabs.length] ?? 'changes';
}
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
    asidePreferredOpen: undefined,
    workspace: undefined,
    settingsSection: 'general',
    settingsProvider: undefined,
    diff: undefined,
    inspectedCallId: undefined,
};
/** Resolve the active compact overlay; docked layouts have no overlay. */
export function compactOverlayOf(state) {
    if (state.layout !== 'compact')
        return undefined;
    if (state.summaryOpen)
        return 'summary';
    if (state.asideOpen)
        return 'aside';
    if (state.railOpen)
        return 'rail';
    return undefined;
}
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
    const compactOverlayPatch = (overlay) => {
        if (state.layout !== 'compact')
            return {};
        return {
            railOpen: overlay === 'rail',
            asideOpen: overlay === 'aside',
            summaryOpen: overlay === 'summary',
        };
    };
    const patch = (next) => {
        const merged = { ...state, ...next };
        if (Object.keys(next).every(key => Object.is(state[key], merged[key])))
            return;
        state = merged;
        emit();
    };
    const rememberAside = (open) => {
        if (state.layout === 'compact')
            return {};
        writeContextPanelPreference(state.workspace, open);
        return { asidePinned: true, asidePreferredOpen: open };
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
        show: view => { patch({ view, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false, asideOpen: false, summaryOpen: false } : {}) }); },
        openSettings: section => { patch({ view: 'settings', settingsSection: section, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false, asideOpen: false, summaryOpen: false } : {}) }); },
        openProviderSettings: provider => { patch({ view: 'settings', settingsSection: 'models', settingsProvider: provider, paletteOpen: false, ...(state.layout === 'compact' ? { railOpen: false, asideOpen: false, summaryOpen: false } : {}) }); },
        // Picking a row in the summary card is a navigation, so the card gives
        // way to the panel it just sent the operator to.
        openAside: tab => { patch({ aside: tab, asideOpen: true, summaryOpen: false, ...compactOverlayPatch('aside'), ...rememberAside(true) }); },
        setWorkspace: workspace => {
            if (state.workspace === workspace)
                return;
            const preferred = readContextPanelPreference(workspace);
            patch({
                workspace,
                asideOpen: state.layout === 'compact' ? false : preferred ?? false,
                asidePinned: preferred !== undefined,
                asidePreferredOpen: preferred,
                diff: undefined,
                inspectedCallId: undefined,
            });
        },
        openDiff: (path, staged = false) => {
            patch({ diff: { path, staged }, aside: 'changes', asideOpen: true, ...compactOverlayPatch('aside'), ...rememberAside(true) });
        },
        closeDiff: () => { patch({ diff: undefined }); },
        inspect: callId => {
            patch({ inspectedCallId: callId, aside: 'details', asideOpen: true, ...compactOverlayPatch('aside'), ...rememberAside(true) });
        },
        togglePalette: open => { patch({ paletteOpen: open ?? !state.paletteOpen }); },
        toggleRail: () => {
            const open = !state.railOpen;
            patch({ railOpen: open, ...(open ? compactOverlayPatch('rail') : {}), ...pin('railPinned') });
        },
        toggleAside: () => {
            const open = !state.asideOpen;
            patch({ asideOpen: open, ...(open ? compactOverlayPatch('aside') : {}), ...rememberAside(open) });
        },
        toggleSummary: open => {
            const next = open ?? !state.summaryOpen;
            patch({ summaryOpen: next, ...(next ? compactOverlayPatch('summary') : {}) });
        },
        openCompactOverlay: overlay => { patch(compactOverlayPatch(overlay)); },
        closeCompactOverlay: () => {
            if (state.layout === 'compact')
                patch({ railOpen: false, asideOpen: false, summaryOpen: false });
        },
        fit: size => {
            if (state.layout === size)
                return;
            const fitted = fitPanels(size, state);
            patch({
                layout: size,
                ...fitted,
                asideOpen: size === 'compact' ? false : state.asidePreferredOpen ?? false,
                asidePinned: state.asidePreferredOpen !== undefined,
            });
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