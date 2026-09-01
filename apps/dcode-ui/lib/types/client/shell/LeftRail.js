import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The left rail: the primary task action, the workspace/task tree, and the
 * account foot.
 *
 * The tree is the Session Controller's list grouped by the durable Workspace
 * registry — the same two stores the official sidebar reads — so a task
 * started in either surface appears in both.
 * @module @dsh-portable/dcode-ui/client/shell/LeftRail
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button as PrimitiveButton, IconArchiveOutline20, IconCordisPluginOutline14, IconChevronDownOutline14, IconChevronRightOutline14, IconEditOutline16, IconEllipsisOutline16, IconFolderClose16, IconBrowseOutline16, IconFolderOpen16, IconNewChatOutline16, IconSearchOutline16, IconSettingsOutline16, IconSparkle16, IconTrashOutline16, relativeTime, } from '@deepseek-ai/dsh-client-ui-primitives';
import { commandShortcut } from "../platform.js";
import { useRuntime } from "../state/runtime.js";
import { useSessionList, useWorkspaceGroups } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { useGitStatus } from "../git/useGit.js";
import { EmptyState, FocusingModal, IconButton, Popover, ui } from "./ui.js";
import css from './LeftRail.module.css';
/** Suffix per relative-time bucket; `now` shows the bare word. */
const AGE_SUFFIX = {
    minutes: 'm', hours: 'h', days: 'd', months: 'mo', years: 'y',
};
/** Compact relative age of a session's last update. */
function useAge() {
    return useCallback((updatedAt) => {
        const { unit, n } = relativeTime(updatedAt, Date.now());
        if (unit === 'now')
            return '·';
        return `${String(n)}${AGE_SUFFIX[unit] ?? ''}`;
    }, []);
}
function pathLeaf(path) {
    if (path === undefined || path.trim() === '')
        return undefined;
    const normalized = path.replace(/[\\/]+$/, '');
    const leaf = normalized.slice(Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/')) + 1);
    return leaf === '' ? undefined : leaf;
}
/** One session row. */
function SessionRow(props) {
    const { session, current } = props;
    const t = useT();
    const stateLabel = session.running
        ? t('nav.running')
        : session.completed === true ? t('nav.completed') : t('nav.idle');
    return (_jsxs("div", { className: `${css.rowShell} ${current ? css.rowShellActive : ''}`, children: [_jsxs("button", { type: "button", className: css.row, onClick: props.onOpen, title: session.displayTitle, "data-session-id": session.id, "aria-current": current ? 'true' : undefined, children: [_jsxs("span", { className: css.rowAvatar, "aria-hidden": true, children: [_jsx(IconSparkle16, {}), _jsx("span", { className: `${css.rowPresence} ${session.running ? css.dotRunning : session.completed === true ? css.dotDone : ''}` })] }), _jsx("span", { className: ui.visuallyHidden, children: stateLabel }), _jsxs("span", { className: css.rowCopy, children: [_jsx("span", { className: css.rowTitle, children: session.displayTitle }), _jsx("span", { className: css.rowSubtitle, children: pathLeaf(session.cwd) ?? stateLabel })] }), _jsx("span", { className: css.rowTime, children: props.age })] }), _jsx(Popover, { label: t('top.moreActions'), placement: "down", align: "end", triggerClassName: css.rowMenu, trigger: _jsx(IconEllipsisOutline16, {}), rows: [
                    {
                        id: 'rename',
                        label: t('common.edit'),
                        icon: _jsx(IconEditOutline16, {}),
                        onSelect: props.onRename,
                    },
                    {
                        id: 'archive',
                        label: t('session.archive'),
                        icon: _jsx(IconArchiveOutline20, { size: 16 }),
                        onSelect: props.onArchive,
                    },
                ] })] }));
}
/** One project-folder header with collapse, create, rename and remove actions. */
function WorkspaceRow(props) {
    const { group, collapsed } = props;
    const t = useT();
    const refreshSessionId = group.sessions.find(session => session.running)?.id ?? group.sessions[0]?.id;
    const git = useGitStatus(group.path, refreshSessionId);
    const gitStatus = git.status?.repository === true ? git.status : undefined;
    const dirty = (gitStatus?.files.length ?? 0) > 0;
    const branch = gitStatus?.branch ?? (gitStatus?.detached === true ? 'HEAD' : undefined);
    return (_jsxs("div", { className: css.groupHeaderShell, children: [_jsxs("button", { type: "button", className: css.groupHeader, onClick: props.onToggle, title: group.path, children: [collapsed ? _jsx(IconChevronRightOutline14, {}) : _jsx(IconChevronDownOutline14, {}), collapsed ? _jsx(IconFolderClose16, {}) : _jsx(IconFolderOpen16, {}), _jsx("span", { className: css.groupName, children: group.title }), branch === undefined
                        ? null
                        : (_jsxs("span", { className: css.branchBadge, title: `${branch} · ${dirty ? t('git.changes') : t('git.clean')}`, children: [_jsx("span", { className: `${css.gitDot} ${dirty ? css.gitDotDirty : css.gitDotClean}`, "aria-hidden": true }), _jsx("span", { className: css.branchName, children: branch })] }))] }), _jsxs("div", { className: css.groupActions, children: [_jsx(Popover, { label: t('workspace.actions'), placement: "down", align: "end", triggerClassName: css.groupAction, trigger: _jsx(IconEllipsisOutline16, {}), rows: [
                            {
                                id: 'rename',
                                label: t('workspace.rename'),
                                icon: _jsx(IconEditOutline16, {}),
                                onSelect: props.onRename,
                            },
                            {
                                id: 'remove',
                                label: t('workspace.remove'),
                                icon: _jsx(IconTrashOutline16, {}),
                                danger: true,
                                onSelect: props.onRemove,
                            },
                        ] }), _jsx(IconButton, { label: t('workspace.newTask'), className: css.groupAction, onClick: props.onNewTask, children: _jsx(IconNewChatOutline16, {}) })] })] }));
}
/** The task action, scrollable navigation/tree, and account foot. */
export function LeftRail({ navigation, onNewTask }) {
    const runtime = useRuntime();
    const t = useT();
    const state = useNavigation(navigation);
    const list = useSessionList();
    const { groups, ungrouped } = useWorkspaceGroups();
    const age = useAge();
    const searchRef = useRef(null);
    const treeRef = useRef(null);
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState(() => {
        try {
            const raw = localStorage.getItem('dcode.rail.collapsed');
            if (raw === null)
                return new Set();
            const parsed = JSON.parse(raw);
            return new Set(Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === 'string') : []);
        }
        catch {
            return new Set();
        }
    });
    const [sessionRenameTarget, setSessionRenameTarget] = useState();
    const [sessionRenameDraft, setSessionRenameDraft] = useState('');
    const [sessionRenaming, setSessionRenaming] = useState(false);
    const [sessionRenameError, setSessionRenameError] = useState();
    const [renameTarget, setRenameTarget] = useState();
    const [renameDraft, setRenameDraft] = useState('');
    const [renaming, setRenaming] = useState(false);
    const [renameError, setRenameError] = useState();
    const [removeTarget, setRemoveTarget] = useState();
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState();
    const toggleGroup = useCallback((id) => {
        setCollapsed((previous) => {
            const next = new Set(previous);
            if (!next.delete(id))
                next.add(id);
            return next;
        });
    }, []);
    useEffect(() => {
        try {
            localStorage.setItem('dcode.rail.collapsed', JSON.stringify([...collapsed]));
        }
        catch {
            // Storage unavailable: the collapse state simply does not survive a reload.
        }
    }, [collapsed]);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filteredGroups = useMemo(() => groups.map((group) => {
        if (normalizedQuery === '')
            return group;
        const groupMatches = `${group.title}\n${group.path}`.toLocaleLowerCase().includes(normalizedQuery);
        return {
            ...group,
            sessions: groupMatches
                ? group.sessions
                : group.sessions.filter(session => `${session.displayTitle}\n${session.cwd ?? group.path}`.toLocaleLowerCase().includes(normalizedQuery)),
        };
    }).filter(group => normalizedQuery === '' || group.sessions.length > 0
        || `${group.title}\n${group.path}`.toLocaleLowerCase().includes(normalizedQuery)), [groups, normalizedQuery]);
    const filteredUngrouped = useMemo(() => normalizedQuery === ''
        ? ungrouped
        : ungrouped.filter(session => `${session.displayTitle}\n${session.cwd ?? ''}`.toLocaleLowerCase().includes(normalizedQuery)), [normalizedQuery, ungrouped]);
    const hasRows = filteredGroups.length > 0 || filteredUngrouped.length > 0;
    const visibleSessions = useMemo(() => [
        ...filteredGroups.flatMap(group => collapsed.has(group.workspaceId) ? [] : group.sessions),
        ...filteredUngrouped,
    ], [collapsed, filteredGroups, filteredUngrouped]);
    const openSession = useCallback((session, focus = false) => {
        navigation.show('session');
        runtime.sessions.open(session.id);
        if (!focus)
            return;
        window.requestAnimationFrame(() => {
            const rows = treeRef.current?.querySelectorAll('[data-session-id]') ?? [];
            for (const row of rows)
                if (row.dataset.sessionId === session.id)
                    row.focus();
        });
    }, [navigation, runtime]);
    const moveSession = useCallback((direction, fromSearch = false) => {
        if (visibleSessions.length === 0)
            return;
        const currentIndex = visibleSessions.findIndex(session => session.id === list.current);
        const nextIndex = fromSearch
            ? (direction === 1 ? 0 : visibleSessions.length - 1)
            : Math.max(0, Math.min(visibleSessions.length - 1, (currentIndex < 0 ? (direction === 1 ? -1 : visibleSessions.length) : currentIndex) + direction));
        const session = visibleSessions[nextIndex];
        if (session !== undefined)
            openSession(session, true);
    }, [list.current, openSession, visibleSessions]);
    useEffect(() => {
        const focusSearch = (event) => {
            const target = event.target;
            const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
                || (target instanceof HTMLElement && target.isContentEditable);
            const findShortcut = event.key.toLocaleLowerCase() === 'f' && (event.metaKey || event.ctrlKey);
            const slashShortcut = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !editable;
            if (!findShortcut && !slashShortcut)
                return;
            event.preventDefault();
            searchRef.current?.focus();
            searchRef.current?.select();
        };
        document.addEventListener('keydown', focusSearch);
        return () => { document.removeEventListener('keydown', focusSearch); };
    }, []);
    const openSessionRename = useCallback((session) => {
        setSessionRenameTarget(session);
        setSessionRenameDraft(session.displayTitle);
        setSessionRenameError(undefined);
    }, []);
    const confirmSessionRename = useCallback(() => {
        const target = sessionRenameTarget;
        const title = sessionRenameDraft.trim();
        if (target === undefined || title === '' || title === target.displayTitle || sessionRenaming)
            return;
        const session = runtime.binding(target.id)?.session;
        if (session === undefined) {
            setSessionRenameError(t('common.error'));
            return;
        }
        setSessionRenaming(true);
        setSessionRenameError(undefined);
        void session.rename(title).then((result) => {
            if (result.ok)
                setSessionRenameTarget(undefined);
            else if ('error' in result)
                setSessionRenameError(result.error.message);
        }).catch((cause) => {
            setSessionRenameError(cause instanceof Error ? cause.message : String(cause));
        }).finally(() => { setSessionRenaming(false); });
    }, [runtime, sessionRenameDraft, sessionRenameTarget, sessionRenaming, t]);
    const openRename = useCallback((group) => {
        setRenameTarget(group);
        setRenameDraft(group.title);
        setRenameError(undefined);
    }, []);
    const closeRename = useCallback(() => {
        if (renaming)
            return;
        setRenameTarget(undefined);
        setRenameError(undefined);
    }, [renaming]);
    const confirmRename = useCallback(() => {
        const target = renameTarget;
        const title = renameDraft.trim();
        if (target === undefined || renaming || title === '' || title === target.title)
            return;
        setRenaming(true);
        setRenameError(undefined);
        void runtime.workspaces.rename(target.workspaceId, title)
            .then(() => { setRenameTarget(undefined); })
            .catch((cause) => {
            setRenameError(cause instanceof Error ? cause.message : String(cause));
        })
            .finally(() => { setRenaming(false); });
    }, [renameDraft, renameTarget, renaming, runtime]);
    const openRemove = useCallback((group) => {
        setRemoveTarget(group);
        setRemoveError(undefined);
    }, []);
    const closeRemove = useCallback(() => {
        if (removing)
            return;
        setRemoveTarget(undefined);
        setRemoveError(undefined);
    }, [removing]);
    const confirmRemove = useCallback(() => {
        const target = removeTarget;
        if (target === undefined || removing)
            return;
        setRemoving(true);
        setRemoveError(undefined);
        void runtime.workspaces.delete(target.workspaceId)
            .then(() => { setRemoveTarget(undefined); })
            .catch((cause) => {
            setRemoveError(cause instanceof Error ? cause.message : String(cause));
        })
            .finally(() => { setRemoving(false); });
    }, [removing, removeTarget, runtime]);
    return (_jsxs("nav", { className: css.rail, "aria-label": t('app.title'), children: [_jsxs("div", { className: css.top, children: [_jsxs("div", { className: css.brand, children: [_jsx("span", { className: css.brandMark, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsxs("span", { className: css.brandCopy, children: [_jsx("strong", { children: "DCode" }), _jsx("span", { children: t('nav.agentWorkspace') })] })] }), _jsxs("label", { className: css.searchField, children: [_jsx(IconSearchOutline16, {}), _jsx("input", { ref: searchRef, type: "search", className: css.searchInput, value: query, placeholder: t('common.search'), "aria-label": t('common.search'), onChange: event => { setQuery(event.target.value); }, onKeyDown: (event) => {
                                    if (event.key === 'Escape' && query !== '') {
                                        event.preventDefault();
                                        setQuery('');
                                    }
                                    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                                        event.preventDefault();
                                        moveSession(event.key === 'ArrowDown' ? 1 : -1, true);
                                    }
                                } }), _jsx("span", { className: css.searchShortcut, children: "/" })] }), _jsxs("button", { type: "button", className: css.action, onClick: () => { onNewTask(); }, children: [_jsx(IconNewChatOutline16, {}), _jsx("span", { className: ui.grow, children: t('nav.newTask') }), _jsx("span", { className: css.shortcut, children: commandShortcut('N') })] })] }), _jsxs("div", { ref: treeRef, className: `${css.tree} ${ui.scroll}`, onKeyDown: (event) => {
                    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
                        return;
                    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
                        return;
                    event.preventDefault();
                    moveSession(event.key === 'ArrowDown' ? 1 : -1);
                }, children: [_jsxs("div", { className: css.treeActions, children: [_jsxs("button", { type: "button", className: `${css.action} ${state.view === 'plugins' ? css.actionActive : ''}`, onClick: () => { navigation.show('plugins'); }, children: [_jsx(IconCordisPluginOutline14, { size: 16 }), _jsx("span", { className: ui.grow, children: t('nav.plugins') })] }), _jsxs("button", { type: "button", className: `${css.action} ${state.view === 'library' || state.view === 'learning' ? css.actionActive : ''}`, onClick: () => { navigation.show('library'); }, children: [_jsx(IconBrowseOutline16, {}), _jsx("span", { className: ui.grow, children: t('nav.library') })] })] }), hasRows ? _jsx("div", { className: css.sectionLabel, children: t('nav.conversations') }) : null, hasRows ? _jsx("div", { className: css.treeDivider, "aria-hidden": true }) : null, hasRows
                        ? (_jsxs(_Fragment, { children: [filteredGroups.map(group => (_jsxs("div", { className: css.group, children: [_jsx(WorkspaceRow, { group: group, collapsed: collapsed.has(group.workspaceId), onToggle: () => { toggleGroup(group.workspaceId); }, onNewTask: () => { onNewTask(group.workspaceId); }, onRename: () => { openRename(group); }, onRemove: () => { openRemove(group); } }), collapsed.has(group.workspaceId)
                                            ? null
                                            : group.sessions.map(session => (_jsx(SessionRow, { session: session, current: session.id === list.current, age: age(session.updatedAt), onOpen: () => { openSession(session); }, onRename: () => { openSessionRename(session); }, onArchive: () => { void runtime.navigation?.archiveSession(session.id); } }, session.id)))] }, group.workspaceId))), filteredUngrouped.length === 0
                                    ? null
                                    : (_jsxs("div", { className: css.group, children: [_jsx("div", { className: css.groupHeader, children: _jsx("span", { className: css.groupName, children: t('nav.ungrouped') }) }), filteredUngrouped.map(session => (_jsx(SessionRow, { session: session, current: session.id === list.current, age: age(session.updatedAt), onOpen: () => { openSession(session); }, onRename: () => { openSessionRename(session); }, onArchive: () => { void runtime.navigation?.archiveSession(session.id); } }, session.id)))] }))] }))
                        : _jsx(EmptyState, { children: t('nav.noTasks') })] }), _jsx("div", { className: css.foot, children: _jsxs("button", { type: "button", className: `${css.settingsTrigger} ${state.view === 'settings' ? css.settingsTriggerActive : ''}`, onClick: () => { navigation.openSettings('general'); }, children: [_jsx(IconSettingsOutline16, {}), _jsx("span", { children: t('nav.settings') })] }) }), _jsxs(FocusingModal, { open: sessionRenameTarget !== undefined, onClose: () => { if (!sessionRenaming)
                    setSessionRenameTarget(undefined); }, title: t('common.edit'), closeLabel: t('common.close'), footer: (_jsxs(_Fragment, { children: [_jsx(PrimitiveButton, { variant: "outline", disabled: sessionRenaming, onClick: () => { setSessionRenameTarget(undefined); }, children: t('common.cancel') }), _jsx(PrimitiveButton, { variant: "outline", disabled: sessionRenaming || sessionRenameDraft.trim() === '' || sessionRenameDraft.trim() === sessionRenameTarget?.displayTitle, onClick: confirmSessionRename, children: sessionRenaming ? t('common.saving') : t('common.save') })] })), children: [_jsx("input", { className: css.workspaceInput, value: sessionRenameDraft, "aria-label": t('common.edit'), autoFocus: true, disabled: sessionRenaming, onChange: event => { setSessionRenameDraft(event.target.value); setSessionRenameError(undefined); }, onKeyDown: (event) => {
                            if (event.key !== 'Enter')
                                return;
                            event.preventDefault();
                            confirmSessionRename();
                        } }), sessionRenameError === undefined ? null : _jsx("div", { className: css.workspaceError, role: "alert", children: sessionRenameError })] }), _jsxs(FocusingModal, { open: renameTarget !== undefined, onClose: closeRename, title: t('workspace.renameTitle'), closeLabel: t('common.close'), footer: (_jsxs(_Fragment, { children: [_jsx(PrimitiveButton, { variant: "outline", disabled: renaming, onClick: closeRename, children: t('common.cancel') }), _jsx(PrimitiveButton, { variant: "outline", disabled: renaming || renameDraft.trim() === '' || renameTarget === undefined || renameDraft.trim() === renameTarget.title, onClick: confirmRename, children: t('workspace.rename') })] })), children: [_jsx("input", { className: css.workspaceInput, value: renameDraft, "aria-label": t('workspace.name'), autoFocus: true, disabled: renaming, onChange: event => { setRenameDraft(event.target.value); setRenameError(undefined); }, onKeyDown: event => {
                            if (event.key !== 'Enter')
                                return;
                            event.preventDefault();
                            confirmRename();
                        } }), renameError === undefined ? null : _jsx("div", { className: css.workspaceError, role: "alert", children: renameError })] }), _jsxs(FocusingModal, { open: removeTarget !== undefined, onClose: closeRemove, title: t('workspace.removeTitle'), closeLabel: t('common.close'), description: removeTarget === undefined ? undefined : t('workspace.removeBody', { name: removeTarget.title }), footer: (_jsxs(_Fragment, { children: [_jsx(PrimitiveButton, { variant: "outline", disabled: removing, onClick: closeRemove, children: t('common.cancel') }), _jsx(PrimitiveButton, { variant: "outline", className: css.deleteConfirm, disabled: removing, onClick: confirmRemove, children: t('workspace.remove') })] })), children: [removing ? _jsx("div", { className: css.workspaceStatus, role: "status", children: t('workspace.removePending') }) : null, removeError === undefined ? null : _jsx("div", { className: css.workspaceError, role: "alert", children: removeError })] })] }));
}
//# sourceMappingURL=LeftRail.js.map