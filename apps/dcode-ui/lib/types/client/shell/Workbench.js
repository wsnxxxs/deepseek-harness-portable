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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dcodeScope } from "../tokens.js";
import { useNavigation } from "../state/navigation.js";
import { useConversationBlank, useCurrentSessionId, usePendingQuestion, useWorkspaceGroups, } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { useLayoutSize } from "../state/layout.js";
import { clampRailWidth, RAIL_WIDTH, readRailWidth, writeRailWidth, } from "../state/rail-width.js";
import { useT } from "../state/i18n.js";
import { ACRYLIC_ATTRIBUTE } from "../theme.js";
import { useAppearance } from "./ThemeSwitch.js";
import { TopBar } from "./TopBar.js";
import { LeftRail } from "./LeftRail.js";
import { Aside } from "./Aside.js";
import { SummaryCard } from "./SummaryCard.js";
import { Composer } from "./Composer.js";
import { PlanCard } from "./PlanCard.js";
import { QuestionComposer } from "./QuestionComposer.js";
import { CommandPalette } from "./CommandPalette.js";
import { DirectoryPicker } from "./DirectoryPicker.js";
import { Transcript } from "../chat/Transcript.js";
import { LearningHome } from "../learning/LearningHome.js";
import { PluginsHome } from "../plugins/PluginsHome.js";
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
    const t = useT();
    const state = useNavigation(navigation);
    const sessionId = useCurrentSessionId();
    const pendingQuestion = usePendingQuestion(sessionId);
    const cwd = useCurrentCwd(sessionId);
    const blank = useConversationBlank(sessionId);
    const { scheme } = useAppearance();
    const [browsing, setBrowsing] = useState(false);
    const [railWidth, setRailWidth] = useState(readRailWidth);
    const [railResizing, setRailResizing] = useState(false);
    const railDrag = useRef();
    // The frame fits itself to its own width rather than the window's: it is
    // mounted into a host slot, and how much room that slot has is a fact only
    // the element can report. The class it lands in drives both the panels
    // (through the store, so an operator's toggle is not fought over) and the
    // stylesheet, which reads it off the root as a data attribute.
    const [frame, setFrame] = useState(null);
    const size = useLayoutSize(frame);
    useEffect(() => { navigation.fit(size); }, [navigation, size]);
    const resizeRail = useCallback((width, persist = false) => {
        const next = clampRailWidth(width);
        setRailWidth(next);
        if (persist)
            writeRailWidth(next);
        return next;
    }, []);
    const startRailResize = useCallback((event) => {
        if (event.button !== 0)
            return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        railDrag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: railWidth,
            width: railWidth,
        };
        setRailResizing(true);
    }, [railWidth]);
    const moveRailResize = useCallback((event) => {
        const drag = railDrag.current;
        if (drag === undefined || drag.pointerId !== event.pointerId)
            return;
        drag.width = resizeRail(drag.startWidth + event.clientX - drag.startX);
    }, [resizeRail]);
    const finishRailResize = useCallback((event) => {
        const drag = railDrag.current;
        if (drag === undefined || drag.pointerId !== event.pointerId)
            return;
        writeRailWidth(drag.width);
        railDrag.current = undefined;
        setRailResizing(false);
    }, []);
    const resizeRailWithKeyboard = useCallback((event) => {
        let next;
        const step = event.shiftKey ? 24 : 8;
        if (event.key === 'ArrowLeft')
            next = railWidth - step;
        if (event.key === 'ArrowRight')
            next = railWidth + step;
        if (event.key === 'Home')
            next = RAIL_WIDTH.min;
        if (event.key === 'End')
            next = RAIL_WIDTH.max;
        if (next === undefined)
            return;
        event.preventDefault();
        resizeRail(next, true);
    }, [railWidth, resizeRail]);
    const restoreOverlayFocus = useCallback((target) => {
        window.requestAnimationFrame(() => {
            frame?.querySelector(`[data-dcode-focus-target="${target}"]`)?.focus();
        });
    }, [frame]);
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
    // Portaled DSH menus render under body. Give that portal the same DCode
    // token scope while the workbench owns the page so official setting rows
    // keep the glass treatment instead of falling back to a separate surface.
    useEffect(() => {
        if (typeof document === 'undefined')
            return undefined;
        document.body.setAttribute('data-dcode-scope', '');
        document.body.setAttribute('data-dcode-scheme', scheme);
        return () => {
            document.body.removeAttribute('data-dcode-scope');
            document.body.removeAttribute('data-dcode-scheme');
        };
    }, [scheme]);
    const newTask = useCallback((workspaceId) => {
        navigation.show('session');
        runtime.navigation?.startSession(workspaceId);
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
            if (navigation.getSnapshot().paletteOpen)
                return;
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
            if (meta && event.altKey && event.key.toLowerCase() === 'b') {
                event.preventDefault();
                navigation.toggleAside();
                return;
            }
            if (meta && event.key.toLowerCase() === 'b') {
                event.preventDefault();
                navigation.toggleRail();
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                const snapshot = navigation.getSnapshot();
                if (snapshot.paletteOpen)
                    navigation.togglePalette(false);
                else if (snapshot.summaryOpen) {
                    navigation.toggleSummary(false);
                    restoreOverlayFocus('summary');
                }
                else if (snapshot.diff !== undefined) {
                    navigation.closeDiff();
                    restoreOverlayFocus('aside');
                }
                else if (snapshot.layout === 'compact' && snapshot.railOpen) {
                    navigation.closeRail();
                    restoreOverlayFocus('rail');
                }
                else if (snapshot.layout === 'compact' && snapshot.asideOpen) {
                    navigation.toggleAside();
                    restoreOverlayFocus('aside');
                }
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [navigation, newTask, openWorkspace, restoreOverlayFocus]);
    const fullSurface = state.view !== 'session';
    // Compact holds both side panels over the conversation instead of beside
    // it, so there they need a scrim to dismiss against.
    const drawer = state.layout === 'compact' && (state.railOpen || state.asideOpen);
    return (_jsxs("div", { ref: setFrame, className: css.root, ...dcodeScope, "data-dcode-scheme": scheme, "data-dcode-layout": state.layout, "data-rail-resizing": railResizing ? '' : undefined, style: { '--zx-rail-width': `${railWidth}px` }, ...(acrylic ? { [ACRYLIC_ATTRIBUTE]: '' } : {}), children: [fullSurface
                ? (_jsx("div", { className: css.surface, children: state.view === 'learning'
                        ? _jsx(LearningHome, { navigation: navigation, cwd: cwd, sessionId: sessionId })
                        : state.view === 'plugins'
                            ? _jsx(PluginsHome, { navigation: navigation })
                            : (_jsx(SettingsSurface, { navigation: navigation, sessionId: sessionId })) }))
                : (_jsxs(_Fragment, { children: [drawer
                            ? (_jsx("div", { className: css.scrim, role: "presentation", onClick: () => {
                                    if (state.railOpen)
                                        navigation.closeRail();
                                    if (state.asideOpen)
                                        navigation.toggleAside();
                                } }))
                            : null, _jsxs("div", { className: `${css.rail} ${state.railOpen ? '' : css.railCollapsed}`, children: [_jsx(LeftRail, { navigation: navigation, onNewTask: newTask, onOpenWorkspace: openWorkspace }), state.railOpen && state.layout !== 'compact'
                                    ? (_jsx("div", { className: css.railResizeHandle, role: "separator", "aria-label": t('nav.resize'), "aria-orientation": "vertical", "aria-valuemin": RAIL_WIDTH.min, "aria-valuemax": RAIL_WIDTH.max, "aria-valuenow": railWidth, tabIndex: 0, onPointerDown: startRailResize, onPointerMove: moveRailResize, onPointerUp: finishRailResize, onPointerCancel: finishRailResize, onKeyDown: resizeRailWithKeyboard, onDoubleClick: () => { resizeRail(RAIL_WIDTH.default, true); } }))
                                    : null] }), _jsxs("div", { className: `${css.center} ${blank ? css.centerBlank : ''}`, children: [_jsx(TopBar, { navigation: navigation, sessionId: sessionId, cwd: cwd }), _jsx(SummaryCard, { navigation: navigation, sessionId: sessionId, cwd: cwd, open: state.summaryOpen }), _jsx(Transcript, { navigation: navigation, sessionId: sessionId, cwd: cwd, blank: blank }), _jsx(PlanCard, { sessionId: sessionId }, sessionId), pendingQuestion === undefined
                                    ? (_jsx(Composer, { sessionId: sessionId, blank: blank, cwd: cwd, onOpenWorkspace: openWorkspace }))
                                    : _jsx(QuestionComposer, { pending: pendingQuestion }), _jsx("div", { className: css.filler, "aria-hidden": true })] }), _jsx("div", { className: `${css.aside} ${state.asideOpen ? '' : css.asideCollapsed}`, children: _jsx(Aside, { navigation: navigation, sessionId: sessionId, cwd: cwd }) })] })), state.paletteOpen
                ? (_jsx(CommandPalette, { navigation: navigation, onNewTask: newTask, onOpenWorkspace: openWorkspace }))
                : null, browsing
                ? (_jsx(DirectoryPicker, { onPicked: (path) => {
                        setBrowsing(false);
                        void adoptWorkspace(path);
                    }, onCancel: () => { setBrowsing(false); } }))
                : null] }));
}
//# sourceMappingURL=Workbench.js.map