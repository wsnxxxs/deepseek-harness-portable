import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The workbench frame.
 *
 * Registered into DSH's built-in `root` slot, so while the modern surface is
 * active it owns the whole page and the official three-column frame stands
 * aside. Everything below reads Host state through {@link useRuntime}; the
 * only state this component owns is which panel is showing.
 * @module @dsh-portable/dcode-ui/client/shell/Workbench
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { dcodeScope } from "../tokens.js";
import { useNavigation } from "../state/navigation.js";
import { useConversationBlank, useCurrentSessionId, useWorkspaceGroups } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { ACRYLIC_ATTRIBUTE } from "../theme.js";
import { useAppearance } from "./ThemeSwitch.js";
import { TopBar } from "./TopBar.js";
import { LeftRail } from "./LeftRail.js";
import { Aside } from "./Aside.js";
import { Composer } from "./Composer.js";
import { CommandPalette } from "./CommandPalette.js";
import { DirectoryPicker } from "./DirectoryPicker.js";
import { Transcript } from "../chat/Transcript.js";
import { LearningHome } from "../learning/LearningHome.js";
import { SettingsSurface } from "../settings/SettingsSurface.js";
import css from './Workbench.module.css';
/**
 * Resolve the working directory of the current session, which every
 * workspace-scoped panel (git, files) is addressed by.
 * @param sessionId - current session.
 * @returns the absolute directory, or undefined for a session without one.
 */
function useCurrentCwd(sessionId) {
    const runtime = useRuntime();
    const { groups } = useWorkspaceGroups();
    return useMemo(() => {
        if (sessionId === undefined)
            return undefined;
        const summary = runtime.sessions.list.getSnapshot().byId[sessionId];
        if (summary?.cwd !== undefined && summary.cwd !== '')
            return summary.cwd;
        // A session whose summary has not carried a cwd yet still belongs to a
        // workspace; the registry path is the same directory.
        return groups.find(group => group.sessions.some(row => row.id === sessionId))?.path;
    }, [runtime, sessionId, groups]);
}
/** The whole modern surface. */
export function Workbench({ navigation }) {
    const runtime = useRuntime();
    const state = useNavigation(navigation);
    const sessionId = useCurrentSessionId();
    const cwd = useCurrentCwd(sessionId);
    const blank = useConversationBlank(sessionId);
    const { scheme } = useAppearance();
    const [browsing, setBrowsing] = useState(false);
    // A native backdrop only shows through a transparent document, and the
    // desktop shell paints an opaque page ground of its own. Clearing it is
    // scoped to this component's lifetime, so the official interface — which
    // has no translucent surfaces — gets its opaque ground back the moment the
    // operator switches away.
    const acrylic = runtime.appearance.material !== 'none';
    useEffect(() => {
        if (!acrylic || typeof document === 'undefined')
            return undefined;
        const roots = [document.documentElement, document.body];
        for (const node of roots)
            node.setAttribute(ACRYLIC_ATTRIBUTE, '');
        return () => { for (const node of roots)
            node.removeAttribute(ACRYLIC_ATTRIBUTE); };
    }, [acrylic]);
    const newTask = useCallback(() => {
        navigation.show('session');
        runtime.navigation?.startSession();
    }, [navigation, runtime]);
    const adoptWorkspace = useCallback(async (path) => {
        const nav = runtime.navigation;
        if (nav === undefined)
            return;
        const workspace = await runtime.workspaces.create({ path });
        navigation.show('session');
        nav.startSession(workspace.workspaceId);
    }, [navigation, runtime]);
    const openWorkspace = useCallback(() => {
        const nav = runtime.navigation;
        if (nav === undefined)
            return;
        // The native chooser first: on the desktop shell it is the right dialog,
        // and it is the only one that can reach a directory outside the host's
        // browsable roots. A surface without one falls through to the in-app
        // browser rather than failing silently.
        void nav.pickDirectory()
            .then(async (path) => {
            if (path === null)
                return;
            await adoptWorkspace(path);
        })
            .catch(() => { setBrowsing(true); });
    }, [runtime, adoptWorkspace]);
    // The global keyboard layer. Registered on the document so it works while
    // focus is inside the composer, and scoped to this surface's lifetime.
    useEffect(() => {
        const onKeyDown = (event) => {
            const meta = event.metaKey || event.ctrlKey;
            if (meta && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                navigation.togglePalette();
                return;
            }
            if (meta && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                newTask();
                return;
            }
            if (meta && event.key.toLowerCase() === 'o') {
                event.preventDefault();
                openWorkspace();
                return;
            }
            if (meta && event.key.toLowerCase() === 'b') {
                event.preventDefault();
                navigation.toggleRail();
                return;
            }
            if (event.key === 'Escape') {
                if (navigation.getSnapshot().paletteOpen)
                    navigation.togglePalette(false);
                else if (navigation.getSnapshot().diff !== undefined)
                    navigation.closeDiff();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [navigation, newTask, openWorkspace]);
    const fullSurface = state.view !== 'session';
    return (_jsxs("div", { className: css.root, ...dcodeScope, "data-dcode-scheme": scheme, ...(acrylic ? { [ACRYLIC_ATTRIBUTE]: '' } : {}), children: [fullSurface
                ? (_jsx("div", { className: css.surface, children: state.view === 'learning'
                        ? _jsx(LearningHome, { navigation: navigation, cwd: cwd, sessionId: sessionId })
                        : _jsx(SettingsSurface, { navigation: navigation, sessionId: sessionId }) }))
                : (_jsxs(_Fragment, { children: [_jsx("div", { className: `${css.rail} ${state.railOpen ? '' : css.railCollapsed}`, children: _jsx(LeftRail, { navigation: navigation, onNewTask: newTask }) }), _jsxs("div", { className: `${css.center} ${blank ? css.centerBlank : ''}`, children: [_jsx(TopBar, { navigation: navigation, sessionId: sessionId, cwd: cwd }), _jsx(Transcript, { navigation: navigation, sessionId: sessionId, cwd: cwd, blank: blank, onNewTask: newTask }), _jsx(Composer, { sessionId: sessionId, blank: blank, cwd: cwd, onOpenWorkspace: openWorkspace }), _jsx("div", { className: css.filler, "aria-hidden": true })] }), _jsx("div", { className: `${css.aside} ${state.asideOpen ? '' : css.asideCollapsed}`, children: _jsx(Aside, { navigation: navigation, sessionId: sessionId, cwd: cwd }) })] })), state.paletteOpen
                ? (_jsx(CommandPalette, { navigation: navigation, onNewTask: newTask, onOpenWorkspace: openWorkspace }))
                : null, browsing
                ? (_jsx(DirectoryPicker, { onPicked: (path) => {
                        setBrowsing(false);
                        void adoptWorkspace(path);
                    }, onCancel: () => { setBrowsing(false); } }))
                : null] }));
}
//# sourceMappingURL=Workbench.js.map