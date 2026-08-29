import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The top bar: what is being worked on, where, and on which branch — plus
 * Session sharing and the inspector toggle.
 *
 * Every value is read live: the title comes from the Session Controller's
 * display title, the workspace from the durable registry, and the branch from
 * the same git read the Changes panel uses.
 * @module @dsh-portable/dcode-ui/client/shell/TopBar
 */
import { useMemo, useSyncExternalStore } from 'react';
import { IconBranchOutline16, IconChevronDownOutline14, IconFolderOpen16, IconFolderOpenOutline16, IconPanelLeftOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useSessionList, useWorkspaceGroups } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { useGitStatus } from "../git/useGit.js";
import { IconButton, Popover, ui } from "./ui.js";
import css from './TopBar.module.css';
import { TopBarDownloadIcon, TopBarListIcon } from "./TopBarIcons.js";
const EMPTY_SESSION_LOG_STATE = { bySession: {} };
const EMPTY_SUBSCRIBE = (_listener) => () => { };
const EMPTY_SNAPSHOT = () => EMPTY_SESSION_LOG_STATE;
/** Task context, the left session rail toggle, sharing, and inspector control. */
export function TopBar({ navigation, sessionId, cwd }) {
    const runtime = useRuntime();
    const t = useT();
    const state = useNavigation(navigation);
    const list = useSessionList();
    const { groups } = useWorkspaceGroups();
    const git = useGitStatus(cwd, sessionId);
    const sessionLogDownload = runtime.sessionLogDownload;
    const sessionLogState = useSyncExternalStore(sessionLogDownload?.store.subscribe ?? EMPTY_SUBSCRIBE, sessionLogDownload?.store.getSnapshot ?? EMPTY_SNAPSHOT, sessionLogDownload?.store.getSnapshot ?? EMPTY_SNAPSHOT);
    const title = sessionId === undefined ? undefined : list.byId[sessionId]?.displayTitle;
    const workspace = useMemo(() => groups.find(group => group.path === cwd) ?? groups.find(group => group.sessions.some(row => row.id === sessionId)), [groups, cwd, sessionId]);
    const dirty = (git.status?.files.length ?? 0) > 0;
    // While the first read is outstanding the chip shows nothing rather than
    // asserting "not a repository" about a directory it has not looked at yet.
    const branchLabel = git.pending
        ? undefined
        : git.status?.repository === true
            ? (git.status.branch ?? (git.status.detached ? 'HEAD' : t('top.branch')))
            : t('top.noRepository');
    const shareEntry = sessionId === undefined
        ? undefined
        : sessionLogState.bySession[String(sessionId)];
    const shareStatus = shareEntry?.status;
    const shareBusy = shareStatus === 'downloading';
    const shareLabel = shareBusy
        ? t('top.sharePreparing')
        : shareStatus === 'success'
            ? t('top.shareStarted')
            : shareStatus === 'error'
                ? t('top.shareFailed')
                : t('top.share');
    const shareTooltip = shareEntry?.error ?? (shareBusy
        ? t('top.sharePreparing')
        : shareStatus === 'success'
            ? t('top.shareStarted')
            : shareStatus === 'error'
                ? t('top.shareFailed')
                : t('top.shareTooltip'));
    const shareClass = shareStatus === 'success'
        ? css.shareSuccess
        : shareStatus === 'error' ? css.shareError : '';
    return (_jsxs("header", { className: css.bar, children: [_jsx(IconButton, { label: state.railOpen ? t('nav.collapse') : t('nav.expand'), active: state.railOpen, dataFocusTarget: "rail", onClick: () => { navigation.toggleRail(); }, children: _jsx(IconPanelLeftOutline16, {}) }), _jsx("span", { className: `${css.title} ${title === undefined ? css.titleMuted : ''}`, title: title, children: title ?? t('top.noSession') }), workspace === undefined
                ? null
                : (_jsx(Popover, { label: t('top.workspaceMenu'), placement: "down", triggerClassName: css.workspaceTrigger, trigger: (_jsxs(_Fragment, { children: [_jsx(IconFolderOpenOutline16, {}), _jsx("span", { className: css.chipLabel, children: workspace.title }), _jsx(IconChevronDownOutline14, {})] })), rows: groups.map(group => ({
                        id: String(group.workspaceId),
                        label: group.title,
                        detail: group.path,
                        icon: _jsx(IconFolderOpen16, {}),
                        active: group.workspaceId === workspace.workspaceId,
                        onSelect: () => { runtime.navigation?.startSession(group.workspaceId); },
                    })) })), cwd === undefined || branchLabel === undefined
                ? null
                : (_jsxs("button", { type: "button", className: `${css.chip} ${dirty ? css.dirty : ''}`, title: branchLabel, onClick: () => { navigation.openAside('changes'); }, children: [_jsx(IconBranchOutline16, {}), _jsx("span", { className: css.chipLabel, children: branchLabel })] })), _jsx("span", { className: css.divider, "aria-hidden": true }), _jsxs("div", { className: css.actions, children: [_jsxs("button", { type: "button", className: `${css.shareButton} ${shareClass} ${ui.tooltipTarget}`, "aria-label": shareTooltip, "aria-busy": shareBusy, "data-tooltip": shareTooltip, disabled: sessionId === undefined || sessionLogDownload === undefined || shareBusy, onClick: () => {
                            if (sessionId !== undefined && sessionLogDownload !== undefined) {
                                void sessionLogDownload.download(sessionId);
                            }
                        }, children: [_jsx(TopBarDownloadIcon, { size: 14 }), _jsx("span", { className: css.shareLabel, children: shareLabel })] }), _jsxs("div", { className: css.layoutGroup, role: "group", "aria-label": t('top.layout'), children: [_jsx(IconButton, { label: t('top.toggleSummary'), className: css.layoutButton, active: state.summaryOpen, dataFocusTarget: "summary", onClick: () => { navigation.toggleSummary(); }, children: _jsx(TopBarListIcon, { size: 16 }) }), _jsx(IconButton, { label: t('top.togglePreview'), className: css.layoutButton, active: state.asideOpen, dataFocusTarget: "aside", onClick: () => { navigation.toggleAside(); }, children: _jsx(IconPanelLeftOutline16, { className: ui.mirrored, size: 14 }) })] })] })] }));
}
//# sourceMappingURL=TopBar.js.map