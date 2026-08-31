import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The Metis-shaped Crew workspace.
 *
 * Crew keeps its domain-specific board, roster and dossier, but presents them
 * through the same information architecture as Metis: a conversation rail,
 * a chat-first centre and an Inspector that can be opened without leaving the
 * current thread.
 * @module @dsh-portable/crew-ui/client/shell/MissionControl
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { IconCloseOutline16, IconFolderOpen16, IconListPenOutline16, IconPanelLeftOutline16, IconSparkle16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useBoard, leadSessionId } from "../state/board.js";
import { useMissionPreset } from "../state/mission-preset.js";
import { useRuntime } from "../state/runtime.js";
import { MissionRail } from "./MissionRail.js";
import { RosterPanel } from "./RosterPanel.js";
import { BriefView } from "./BriefView.js";
import { ThreadView } from "./ThreadView.js";
import { LeadComposer } from "./LeadComposer.js";
import { CrewSettings } from "./CrewSettings.js";
import { DossierPanel } from "./DossierPanel.js";
import { BoardView } from "../board/BoardView.js";
import css from './MissionControl.module.css';
/** The Inspector's durable sections. */
const INSPECTOR_TABS = ['crew', 'board', 'brief', 'dossier'];
/** The whole Crew surface. */
export function MissionControl() {
    const runtime = useRuntime();
    const { t, uiModeT } = runtime;
    const [railOpen, setRailOpen] = useState(true);
    const [inspectorOpen, setInspectorOpen] = useState(true);
    const [inspectorTab, setInspectorTab] = useState('crew');
    const [settingsOpen, setSettingsOpen] = useState(false);
    const list = useSyncExternalStore(runtime.sessions.list.subscribe, runtime.sessions.list.getSnapshot, runtime.sessions.list.getSnapshot);
    const sessionId = list.current;
    const summary = sessionId === undefined ? undefined : list.byId[sessionId];
    const board = useBoard(sessionId);
    const members = board.view?.members ?? [];
    // Switching missions should land the Inspector on its most useful view. The
    // thread itself stays the centre, so a selection never throws away context.
    useEffect(() => { setInspectorTab('crew'); }, [sessionId]);
    const mission = useMissionPreset(sessionId, summary);
    const newMission = useCallback(() => { mission.start(); }, [mission]);
    const openWorkspace = useCallback(() => {
        const navigation = runtime.navigation;
        if (navigation === undefined)
            return;
        void navigation.pickDirectory()
            .then(async (path) => {
            if (path === null)
                return;
            const workspace = await runtime.workspaces.create({ path });
            mission.start(workspace.workspaceId);
        })
            .catch(() => {
            // The native chooser is optional. Existing workspaces and New mission
            // remain usable when the host has no directory picker.
        });
    }, [mission, runtime]);
    const openMember = useCallback(async (member) => {
        if (member.role !== 'teammate' || sessionId === undefined)
            return;
        const parentSessionId = leadSessionId(runtime.sessions, sessionId);
        await runtime.sessions.refreshSubagents(parentSessionId);
        runtime.sessions.openSubagent({
            parentSessionId,
            childSessionId: member.id,
            mode: 'continuable',
        });
        setInspectorTab('crew');
    }, [runtime, sessionId]);
    const selectMission = useCallback((id) => {
        runtime.sessions.open(id);
    }, [runtime]);
    // The preset is a durable session projection. It is shown as a small header
    // status, not as a second selector that could disagree with the Host.
    const presetId = useMemo(() => summary?.projectionValues?.agentPreset ?? undefined, [summary]);
    const workspaceLabel = summary?.cwd === undefined || summary.cwd === ''
        ? undefined
        : summary.cwd.split(/[\\/]/).filter(Boolean).at(-1);
    return (_jsxs("div", { className: css.root, children: [_jsxs("div", { className: css.workspace, children: [railOpen
                        ? (_jsx("aside", { className: css.rail, children: _jsx(MissionRail, { collapsed: false, currentSessionId: sessionId, onSelect: selectMission, onNewMission: newMission, onOpenWorkspace: openWorkspace, onCollapse: () => { setRailOpen(false); }, onOpenSettings: () => { setSettingsOpen(true); } }) }))
                        : null, _jsxs("main", { className: css.center, children: [_jsxs("header", { className: css.chatHeader, children: [_jsxs("div", { className: css.headerLeft, children: [!railOpen
                                                ? (_jsx("button", { type: "button", className: css.iconButton, "aria-label": t('nav.expand'), onClick: () => { setRailOpen(true); }, children: _jsx(IconPanelLeftOutline16, {}) }))
                                                : null, _jsx("span", { className: css.agentMark, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsxs("div", { className: css.headerCopy, children: [_jsx("h1", { className: css.title, children: summary?.displayTitle ?? t('app.title') }), _jsx("span", { className: css.subtitle, children: uiModeT('mode.crew') })] })] }), _jsxs("div", { className: css.headerUtilities, children: [workspaceLabel === undefined
                                                ? null
                                                : (_jsxs("span", { className: css.workspaceChip, title: summary?.cwd, children: [_jsx(IconFolderOpen16, {}), workspaceLabel] })), _jsx("button", { type: "button", className: css.iconButton, "aria-label": inspectorOpen ? t('inspector.close') : t('inspector.open'), "aria-pressed": inspectorOpen, onClick: () => { setInspectorOpen(open => !open); }, children: _jsx(IconListPenOutline16, {}) })] })] }), mission.error === undefined
                                ? null
                                : (_jsxs("div", { className: css.missionAlert, role: "alert", children: [_jsx("span", { children: t('nav.missionPresetFailed', { reason: mission.error }) }), _jsx("button", { type: "button", onClick: mission.dismiss, children: t('board.dismiss') })] })), _jsxs("div", { className: css.centerBody, children: [sessionId === undefined
                                        ? (_jsxs("div", { className: css.home, children: [_jsx("span", { className: css.homeMark, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsx("h2", { children: t('thread.empty') }), _jsx("p", { children: t('thread.emptyBody') }), _jsx("button", { type: "button", className: css.primaryAction, onClick: newMission, children: t('nav.newMission') })] }))
                                        : _jsx(ThreadView, { sessionId: sessionId }), sessionId === undefined ? null : _jsx(LeadComposer, { sessionId: sessionId })] })] }), inspectorOpen
                        ? (_jsxs("aside", { className: css.inspector, "aria-label": t('inspector.title'), children: [_jsxs("header", { className: css.inspectorHead, children: [_jsx("h2", { className: css.inspectorTitle, children: t('inspector.title') }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": t('inspector.close'), onClick: () => { setInspectorOpen(false); }, children: _jsx(IconCloseOutline16, {}) })] }), _jsx("nav", { className: css.inspectorTabs, role: "tablist", "aria-label": t('inspector.title'), children: INSPECTOR_TABS.map(id => (_jsx("button", { type: "button", role: "tab", "aria-selected": inspectorTab === id, className: `${css.inspectorTab} ${inspectorTab === id ? css.inspectorTabActive : ''}`, onClick: () => { setInspectorTab(id); }, children: t(`tab.${id}`) }, id))) }), _jsx("div", { className: css.inspectorBody, children: inspectorTab === 'crew'
                                        ? (_jsx(RosterPanel, { members: members, currentSessionId: sessionId, onOpenMember: (member) => { void openMember(member); } }))
                                        : inspectorTab === 'board'
                                            ? _jsx(BoardView, { board: board, members: members })
                                            : inspectorTab === 'brief'
                                                ? _jsx(BriefView, { view: board.view, presetId: presetId, cwd: summary?.cwd })
                                                : _jsx(DossierPanel, { cwd: summary?.cwd }) })] }))
                        : null] }), settingsOpen ? _jsx(CrewSettings, { onClose: () => { setSettingsOpen(false); } }) : null] }));
}
//# sourceMappingURL=MissionControl.js.map