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
import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { dcodeScope } from "../tokens.js";
import { compactOverlayOf, useNavigation, } from "../state/navigation.js";
import { useConversationBlank, useCurrentSessionId, usePendingQuestion, useProjectionValue, useTrajectorySnapshot, useWorkspaceGroups, } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { useLayoutSize } from "../state/layout.js";
import { clampRailWidth, RAIL_WIDTH, readRailWidth, writeRailWidth, } from "../state/rail-width.js";
import { clampAsideWidth, ASIDE_WIDTH, readAsideWidth, writeAsideWidth, } from "../state/aside-width.js";
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
import { Button, EmptyState } from "./ui.js";
import { Transcript } from "../chat/Transcript.js";
import { LearningHome } from "../learning/LearningHome.js";
import { PluginsHome } from "../plugins/PluginsHome.js";
import { SettingsSurface } from "../settings/SettingsSurface.js";
import { useModelReadiness } from "../settings/readiness.js";
import { useGitStatus } from "../git/useGit.js";
import css from './Workbench.module.css';
const COMPACT_OVERLAY_HISTORY_KEY = '__dcodeCompactOverlay';
function historyOverlay(value) {
    if (typeof value !== 'object' || value === null)
        return undefined;
    const overlay = value[COMPACT_OVERLAY_HISTORY_KEY];
    return overlay === 'rail' || overlay === 'aside' || overlay === 'summary' ? overlay : undefined;
}
function historyStateWithOverlay(overlay) {
    const current = typeof history.state === 'object' && history.state !== null
        ? history.state
        : {};
    return { ...current, [COMPACT_OVERLAY_HISTORY_KEY]: overlay };
}
function failedCallIn(block) {
    for (let index = block.subCalls.length - 1; index >= 0; index -= 1) {
        const failed = failedCallIn(block.subCalls[index]);
        if (failed !== undefined)
            return failed;
    }
    return 'isError' in block && block.isError ? block.callId : undefined;
}
/** Most recent failure that the Details panel can inspect. */
function latestFailure(nodes) {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (node?.kind === 'tool-result') {
            const callId = failedCallIn(node);
            if (callId !== undefined)
                return { hasError: true, callId };
        }
    }
    return { hasError: false };
}
/** Keep a settings initialization failure local to the replaceable surface. */
class SettingsBoundary extends Component {
    state = {};
    static getDerivedStateFromError(error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
    componentDidCatch(_error, _info) {
        // The fallback below owns recovery; individual settings services retain
        // responsibility for their own diagnostics.
    }
    componentDidUpdate(previous) {
        if (previous.resetKey !== this.props.resetKey && this.state.error !== undefined) {
            this.setState({ error: undefined });
        }
    }
    render() {
        if (this.state.error === undefined)
            return this.props.children;
        return (_jsx("div", { className: css.surfaceFailure, role: "alert", children: _jsxs(EmptyState, { children: [_jsx("span", { children: this.props.t('settings.loadFailed', { error: this.state.error }) }), _jsxs("div", { className: css.surfaceFailureActions, children: [_jsx(Button, { onClick: this.props.onBack, children: this.props.t('nav.backToWorkspace') }), _jsx(Button, { primary: true, onClick: () => { this.setState({ error: undefined }); }, children: this.props.t('common.retry') })] })] }) }));
    }
}
function ReadinessCard(props) {
    const complete = [
        props.hasWorkspace,
        props.hasSession,
        props.model.model === 'ready',
        props.model.credential === 'ready',
    ].filter(Boolean).length;
    const missing = [
        !props.hasWorkspace
            ? { label: props.t('readiness.workspace'), action: props.t('readiness.openWorkspace'), onClick: props.onOpenWorkspace }
            : undefined,
        props.hasWorkspace && !props.hasSession
            ? { label: props.t('readiness.session'), action: props.t('readiness.newTask'), onClick: props.onNewTask }
            : undefined,
        props.hasSession && props.model.model === 'missing'
            ? { label: props.t('readiness.model'), action: props.t('readiness.selectModel'), onClick: props.onSelectModel }
            : undefined,
        props.model.model === 'ready' && props.model.credential === 'missing'
            ? { label: props.t('readiness.credential', { provider: props.model.provider ?? '' }), action: props.t('readiness.configureKey'), onClick: props.onConfigureProvider }
            : undefined,
    ].filter((item) => item !== undefined);
    if (missing.length === 0)
        return null;
    return (_jsxs("div", { className: css.readiness, "aria-label": props.t('readiness.title'), children: [_jsxs("div", { className: css.readinessSummary, children: [_jsx("span", { className: css.readinessCheck, "aria-hidden": true, children: "\u2713" }), _jsx("span", { children: props.t('readiness.complete', { count: complete, total: 4 }) })] }), missing.map(item => (_jsxs("div", { className: css.readinessItem, children: [_jsx("span", { children: item.label }), _jsx(Button, { onClick: item.onClick, children: item.action })] }, item.label)))] }));
}
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
    const compactOverlay = compactOverlayOf(state);
    const sessionId = useCurrentSessionId();
    const pendingQuestion = usePendingQuestion(sessionId);
    const cwd = useCurrentCwd(sessionId);
    const blank = useConversationBlank(sessionId);
    const git = useGitStatus(cwd, sessionId);
    const trajectory = useTrajectorySnapshot(sessionId);
    const goal = useProjectionValue(sessionId, 'goal');
    const modelReadiness = useModelReadiness(sessionId);
    const { groups } = useWorkspaceGroups();
    const { scheme, fontSize } = useAppearance();
    const [browsing, setBrowsing] = useState(false);
    const [railWidth, setRailWidth] = useState(readRailWidth);
    const [railResizing, setRailResizing] = useState(false);
    const railDrag = useRef();
    const [asideWidth, setAsideWidth] = useState(readAsideWidth);
    const [asideResizing, setAsideResizing] = useState(false);
    const asideDrag = useRef();
    const taskContext = useMemo(() => {
        const failure = latestFailure(trajectory?.eventNodes ?? []);
        return {
            hasChanges: (git.status?.files.length ?? 0) > 0,
            hasError: failure.hasError,
            goalActive: goal != null && goal.goal.phase !== 'completed' && goal.goal.phase !== 'paused',
            failedCallId: failure.callId,
        };
    }, [git.status, goal, trajectory]);
    useEffect(() => { navigation.setWorkspace(cwd); }, [cwd, navigation]);
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
    const resizeAside = useCallback((width, persist = false) => {
        const next = clampAsideWidth(width);
        setAsideWidth(next);
        if (persist)
            writeAsideWidth(next);
        return next;
    }, []);
    const startAsideResize = useCallback((event) => {
        if (event.button !== 0)
            return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        asideDrag.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: asideWidth,
            width: asideWidth,
        };
        setAsideResizing(true);
    }, [asideWidth]);
    const moveAsideResize = useCallback((event) => {
        const drag = asideDrag.current;
        if (drag === undefined || drag.pointerId !== event.pointerId)
            return;
        drag.width = resizeAside(drag.startWidth + drag.startX - event.clientX);
    }, [resizeAside]);
    const finishAsideResize = useCallback((event) => {
        const drag = asideDrag.current;
        if (drag === undefined || drag.pointerId !== event.pointerId)
            return;
        writeAsideWidth(drag.width);
        asideDrag.current = undefined;
        setAsideResizing(false);
    }, []);
    const resizeAsideWithKeyboard = useCallback((event) => {
        let next;
        const step = event.shiftKey ? 24 : 8;
        if (event.key === 'ArrowLeft')
            next = asideWidth + step;
        if (event.key === 'ArrowRight')
            next = asideWidth - step;
        if (event.key === 'Home')
            next = ASIDE_WIDTH.min;
        if (event.key === 'End')
            next = ASIDE_WIDTH.max;
        if (next === undefined)
            return;
        event.preventDefault();
        resizeAside(next, true);
    }, [asideWidth, resizeAside]);
    const restoreOverlayFocus = useCallback((target) => {
        window.requestAnimationFrame(() => {
            frame?.querySelector(`[data-dcode-focus-target="${target}"]`)?.focus();
        });
    }, [frame]);
    const dismissCompactOverlay = useCallback(() => {
        const overlay = compactOverlayOf(navigation.getSnapshot());
        navigation.closeCompactOverlay();
        if (overlay !== undefined)
            restoreOverlayFocus(overlay);
    }, [navigation, restoreOverlayFocus]);
    // A compact overlay owns one same-URL history entry. Browser Back therefore
    // dismisses it before it can leave the workbench; closing it through its
    // button, scrim, or Escape consumes that entry in the same way. Replacing
    // the marker when overlays switch keeps the mutually-exclusive hand-off to
    // a single history step, and Forward can restore the marked overlay.
    const previousCompactOverlay = useRef();
    const overlayFromPopState = useRef(false);
    const programmaticHistoryBack = useRef(false);
    const compactOverlayRef = useRef(compactOverlay);
    compactOverlayRef.current = compactOverlay;
    useEffect(() => {
        const onPopState = (event) => {
            if (programmaticHistoryBack.current) {
                programmaticHistoryBack.current = false;
                return;
            }
            const current = compactOverlayRef.current;
            if (current !== undefined) {
                overlayFromPopState.current = true;
                dismissCompactOverlay();
                return;
            }
            const forwardOverlay = historyOverlay(event.state);
            if (forwardOverlay !== undefined && navigation.getSnapshot().layout === 'compact') {
                overlayFromPopState.current = true;
                navigation.openCompactOverlay(forwardOverlay);
            }
        };
        window.addEventListener('popstate', onPopState);
        return () => {
            window.removeEventListener('popstate', onPopState);
            if (historyOverlay(history.state) !== undefined) {
                const next = { ...history.state };
                delete next[COMPACT_OVERLAY_HISTORY_KEY];
                history.replaceState(next, '');
            }
        };
    }, [dismissCompactOverlay, navigation]);
    useEffect(() => {
        const previous = previousCompactOverlay.current;
        previousCompactOverlay.current = compactOverlay;
        if (previous === compactOverlay)
            return;
        if (compactOverlay !== undefined) {
            if (overlayFromPopState.current) {
                overlayFromPopState.current = false;
                return;
            }
            if (previous === undefined)
                history.pushState(historyStateWithOverlay(compactOverlay), '');
            else
                history.replaceState(historyStateWithOverlay(compactOverlay), '');
            return;
        }
        if (previous !== undefined) {
            if (overlayFromPopState.current) {
                overlayFromPopState.current = false;
            }
            else if (historyOverlay(history.state) !== undefined) {
                programmaticHistoryBack.current = true;
                history.back();
            }
        }
    }, [compactOverlay]);
    // A native backdrop only shows through a transparent document, and the
    // desktop shell paints an opaque page ground of its own. Clearing it is
    // scoped to this component's lifetime, so the official interface — which
    // has no translucent surfaces — gets its opaque ground back the moment the
    // operator switches away.
    const nativeMaterial = runtime.appearance.material !== 'none';
    useLayoutEffect(() => {
        if (!nativeMaterial || typeof document === 'undefined')
            return undefined;
        document.documentElement.setAttribute(ACRYLIC_ATTRIBUTE, '');
        return () => { document.documentElement.removeAttribute(ACRYLIC_ATTRIBUTE); };
    }, [nativeMaterial]);
    // Portaled DSH menus render under body. Give that portal the same DCode
    // token scope while the workbench owns the page so official setting rows
    // keep the glass treatment instead of falling back to a separate surface.
    useEffect(() => {
        if (typeof document === 'undefined')
            return undefined;
        document.body.setAttribute('data-dcode-scope', '');
        document.body.setAttribute('data-dcode-scheme', scheme);
        document.body.setAttribute(ACRYLIC_ATTRIBUTE, '');
        document.body.style.setProperty('--dsh-content-font-size', `${fontSize}px`);
        document.body.style.setProperty('--zx-font-size-base', `${fontSize}px`);
        return () => {
            document.body.removeAttribute('data-dcode-scope');
            document.body.removeAttribute('data-dcode-scheme');
            document.body.removeAttribute(ACRYLIC_ATTRIBUTE);
            document.body.style.removeProperty('--zx-font-size-base');
        };
    }, [scheme, fontSize]);
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
    const selectModel = useCallback(() => {
        frame?.querySelector('[data-dcode-model-select] button[aria-haspopup]')?.click();
    }, [frame]);
    const configureProvider = useCallback(() => {
        if (modelReadiness.provider !== undefined)
            navigation.openProviderSettings(modelReadiness.provider);
    }, [modelReadiness.provider, navigation]);
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
                else if (compactOverlayOf(snapshot) !== undefined)
                    dismissCompactOverlay();
                else if (snapshot.summaryOpen) {
                    navigation.toggleSummary(false);
                    restoreOverlayFocus('summary');
                }
                else if (snapshot.diff !== undefined) {
                    navigation.closeDiff();
                    restoreOverlayFocus('aside');
                }
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [dismissCompactOverlay, navigation, newTask, openWorkspace, restoreOverlayFocus]);
    const fullSurface = state.view !== 'session';
    // Compact holds both side panels over the conversation instead of beside
    // it, so there they need a scrim to dismiss against.
    const overlayOpen = compactOverlay !== undefined;
    return (_jsxs("div", { ref: setFrame, className: css.root, ...dcodeScope, "data-dcode-scheme": scheme, "data-dcode-layout": state.layout, "data-rail-resizing": railResizing ? '' : undefined, "data-aside-resizing": asideResizing ? '' : undefined, style: {
            '--zx-rail-width': `${railWidth}px`,
            '--zx-aside-width': `${asideWidth}px`,
            '--zx-font-size-base': `${fontSize}px`,
            '--dsh-content-font-size': `${fontSize}px`,
        }, [ACRYLIC_ATTRIBUTE]: '', children: [fullSurface
                ? (_jsx("div", { className: css.surface, children: state.view === 'learning'
                        ? _jsx(LearningHome, { navigation: navigation, cwd: cwd, sessionId: sessionId })
                        : state.view === 'plugins'
                            ? _jsx(PluginsHome, { navigation: navigation })
                            : (_jsx(SettingsBoundary, { resetKey: state.settingsSection, t: t, onBack: () => { navigation.show('session'); }, children: _jsx(SettingsSurface, { navigation: navigation, sessionId: sessionId }) })) }))
                : (_jsxs(_Fragment, { children: [overlayOpen
                            ? (_jsx("div", { className: css.scrim, role: "presentation", onClick: dismissCompactOverlay }))
                            : null, _jsxs("div", { className: `${css.rail} ${state.railOpen ? '' : css.railCollapsed}`, children: [_jsx(LeftRail, { navigation: navigation, onNewTask: newTask }), state.railOpen && state.layout !== 'compact'
                                    ? (_jsx("div", { className: css.railResizeHandle, role: "separator", "aria-label": t('nav.resize'), "aria-orientation": "vertical", "aria-valuemin": RAIL_WIDTH.min, "aria-valuemax": RAIL_WIDTH.max, "aria-valuenow": railWidth, tabIndex: 0, onPointerDown: startRailResize, onPointerMove: moveRailResize, onPointerUp: finishRailResize, onPointerCancel: finishRailResize, onKeyDown: resizeRailWithKeyboard, onDoubleClick: () => { resizeRail(RAIL_WIDTH.default, true); } }))
                                    : null] }), _jsxs("div", { className: `${css.center} ${blank ? css.centerBlank : ''}`, children: [_jsx(TopBar, { navigation: navigation, sessionId: sessionId, cwd: cwd, context: taskContext }), _jsx(SummaryCard, { navigation: navigation, sessionId: sessionId, cwd: cwd, open: state.summaryOpen, compact: state.layout === 'compact' }), _jsx(Transcript, { navigation: navigation, sessionId: sessionId, cwd: cwd, blank: blank, compact: state.layout === 'compact' }), _jsxs("div", { className: css.composerSeat, children: [_jsx(PlanCard, { sessionId: sessionId }, sessionId), blank
                                            ? (_jsx(ReadinessCard, { hasWorkspace: groups.length > 0, hasSession: sessionId !== undefined, model: modelReadiness, onOpenWorkspace: openWorkspace, onNewTask: () => { newTask(groups[0]?.workspaceId); }, onSelectModel: selectModel, onConfigureProvider: configureProvider, t: t }))
                                            : null, pendingQuestion === undefined
                                            ? (_jsx(Composer, { sessionId: sessionId, blank: blank, cwd: cwd, onOpenWorkspace: openWorkspace, readiness: modelReadiness, onSelectModel: selectModel, onConfigureProvider: configureProvider }))
                                            : _jsx(QuestionComposer, { pending: pendingQuestion })] }), _jsx("div", { className: css.filler, "aria-hidden": true })] }), _jsxs("div", { className: `${css.aside} ${state.asideOpen ? '' : css.asideCollapsed}`, children: [state.asideOpen && state.layout !== 'compact'
                                    ? (_jsx("div", { className: css.asideResizeHandle, role: "separator", "aria-label": t('nav.resize'), "aria-orientation": "vertical", "aria-valuemin": ASIDE_WIDTH.min, "aria-valuemax": ASIDE_WIDTH.max, "aria-valuenow": asideWidth, tabIndex: 0, onPointerDown: startAsideResize, onPointerMove: moveAsideResize, onPointerUp: finishAsideResize, onPointerCancel: finishAsideResize, onKeyDown: resizeAsideWithKeyboard, onDoubleClick: () => { resizeAside(ASIDE_WIDTH.default, true); } }))
                                    : null, _jsx(Aside, { navigation: navigation, sessionId: sessionId, cwd: cwd, context: taskContext })] })] })), state.paletteOpen
                ? (_jsx(CommandPalette, { navigation: navigation, onNewTask: newTask, onOpenWorkspace: openWorkspace }))
                : null, browsing
                ? (_jsx(DirectoryPicker, { onPicked: (path) => {
                        setBrowsing(false);
                        void adoptWorkspace(path);
                    }, onCancel: () => { setBrowsing(false); } }))
                : null] }));
}
//# sourceMappingURL=Workbench.js.map