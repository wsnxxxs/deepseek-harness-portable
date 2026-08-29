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
import { useCallback, useMemo, useState } from 'react';
import { Button as PrimitiveButton, IconApiOutline14, IconArchiveOutline20, IconCordisPluginOutline14, IconChevronDownOutline14, IconChevronRightOutline14, IconDataOutline16, IconLinkOutline16, IconEditOutline16, IconEllipsisOutline16, IconFolderClose16, IconFolderOpen16, IconFolderOpenOutline16, IconNewChatOutline16, IconSettingsOutline16, IconSparkle16, IconTrashOutline16, BrandWordmark, Modal, relativeTime, } from '@deepseek-ai/dsh-client-ui-primitives';
import { commandShortcut } from "../platform.js";
import { useRuntime } from "../state/runtime.js";
import { useSessionList, useWorkspaceGroups } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { EmptyState, IconButton, Popover, ui } from "./ui.js";
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
/** One session row. */
function SessionRow(props) {
    const { session, current } = props;
    const t = useT();
    return (_jsxs("div", { className: css.rowShell, children: [_jsxs("button", { type: "button", className: `${css.row} ${current ? css.rowActive : ''}`, onClick: props.onOpen, title: session.displayTitle, children: [session.running
                        ? _jsx("span", { className: `${css.dot} ${css.dotRunning}`, "aria-hidden": true })
                        : session.completed === true
                            ? _jsx("span", { className: `${css.dot} ${css.dotDone}`, "aria-hidden": true })
                            : _jsx("span", { className: css.dot, "aria-hidden": true }), _jsx("span", { className: css.rowTitle, children: session.displayTitle }), _jsx("span", { className: css.rowTime, children: props.age })] }), _jsx(Popover, { label: t('top.moreActions'), placement: "down", align: "end", triggerClassName: css.rowMenu, trigger: _jsx(IconEllipsisOutline16, {}), rows: [
                    {
                        id: 'archive',
                        label: t('session.archive'),
                        icon: _jsx(IconArchiveOutline20, { size: 16 }),
                        onSelect: props.onArchive,
                    },
                    {
                        id: 'delete',
                        label: t('session.delete'),
                        icon: _jsx(IconTrashOutline16, {}),
                        danger: true,
                        onSelect: props.onDelete,
                    },
                ] })] }));
}
/** One project-folder header with collapse, create, rename and remove actions. */
function WorkspaceRow(props) {
    const { group, collapsed } = props;
    const t = useT();
    return (_jsxs("div", { className: css.groupHeaderShell, children: [_jsxs("button", { type: "button", className: css.groupHeader, onClick: props.onToggle, title: group.path, children: [collapsed ? _jsx(IconChevronRightOutline14, {}) : _jsx(IconChevronDownOutline14, {}), collapsed ? _jsx(IconFolderClose16, {}) : _jsx(IconFolderOpen16, {}), _jsx("span", { className: css.groupName, children: group.title })] }), _jsxs("div", { className: css.groupActions, children: [_jsx(Popover, { label: t('workspace.actions'), placement: "down", align: "end", triggerClassName: css.groupAction, trigger: _jsx(IconEllipsisOutline16, {}), rows: [
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
export function LeftRail({ navigation, onNewTask, onOpenWorkspace }) {
    const runtime = useRuntime();
    const t = useT();
    const state = useNavigation(navigation);
    const list = useSessionList();
    const { groups, ungrouped } = useWorkspaceGroups();
    const age = useAge();
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [deleteTarget, setDeleteTarget] = useState();
    const [deleting, setDeleting] = useState(false);
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
    const hasRows = useMemo(() => groups.length > 0 || ungrouped.length > 0, [groups, ungrouped]);
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
    return (_jsxs("nav", { className: css.rail, "aria-label": t('app.title'), children: [_jsx("div", { className: css.top, children: _jsxs("button", { type: "button", className: css.action, onClick: () => { onNewTask(); }, children: [_jsx(IconNewChatOutline16, {}), _jsx("span", { className: ui.grow, children: t('nav.newTask') }), _jsx("span", { className: css.shortcut, children: commandShortcut('N') })] }) }), _jsxs("div", { className: `${css.tree} ${ui.scroll}`, children: [_jsxs("div", { className: css.treeActions, children: [_jsxs("button", { type: "button", className: css.action, onClick: onOpenWorkspace, children: [_jsx(IconFolderOpenOutline16, {}), _jsx("span", { className: ui.grow, children: t('nav.openWorkspace') }), _jsx("span", { className: css.shortcut, children: commandShortcut('O') })] }), _jsxs("button", { type: "button", className: `${css.action} ${state.view === 'plugins' ? css.actionActive : ''}`, onClick: () => { navigation.show('plugins'); }, children: [_jsx(IconCordisPluginOutline14, { size: 16 }), _jsx("span", { className: ui.grow, children: t('nav.plugins') })] }), _jsxs("button", { type: "button", className: `${css.action} ${state.view === 'learning' ? css.actionActive : ''}`, onClick: () => { navigation.show('learning'); }, children: [_jsx(IconSparkle16, {}), _jsx("span", { className: ui.grow, children: t('nav.learning') })] })] }), hasRows ? _jsx("div", { className: css.treeDivider, "aria-hidden": true }) : null, hasRows
                        ? (_jsxs(_Fragment, { children: [groups.map(group => (_jsxs("div", { className: css.group, children: [_jsx(WorkspaceRow, { group: group, collapsed: collapsed.has(group.workspaceId), onToggle: () => { toggleGroup(group.workspaceId); }, onNewTask: () => { onNewTask(group.workspaceId); }, onRename: () => { openRename(group); }, onRemove: () => { openRemove(group); } }), collapsed.has(group.workspaceId)
                                            ? null
                                            : group.sessions.map(session => (_jsx(SessionRow, { session: session, current: session.id === list.current, age: age(session.updatedAt), onOpen: () => {
                                                    navigation.show('session');
                                                    runtime.sessions.open(session.id);
                                                }, onArchive: () => { void runtime.navigation?.archiveSession(session.id); }, onDelete: () => { setDeleteTarget(session); } }, session.id)))] }, group.workspaceId))), ungrouped.length === 0
                                    ? null
                                    : (_jsxs("div", { className: css.group, children: [_jsx("div", { className: css.groupHeader, children: _jsx("span", { className: css.groupName, children: t('nav.ungrouped') }) }), ungrouped.map(session => (_jsx(SessionRow, { session: session, current: session.id === list.current, age: age(session.updatedAt), onOpen: () => {
                                                    navigation.show('session');
                                                    runtime.sessions.open(session.id);
                                                }, onArchive: () => { void runtime.navigation?.archiveSession(session.id); }, onDelete: () => { setDeleteTarget(session); } }, session.id)))] }))] }))
                        : _jsx(EmptyState, { children: t('nav.noTasks') })] }), _jsx("div", { className: css.foot, children: _jsx(Popover, { label: t('account.menu'), placement: "up", align: "start", style: { flex: 1 }, triggerClassName: css.accountTrigger, trigger: (_jsx(BrandWordmark, { size: 24 })), rows: [
                        {
                            id: 'settings',
                            label: t('nav.settings'),
                            icon: _jsx(IconSettingsOutline16, { size: 18 }),
                            onSelect: () => { navigation.openSettings('general'); },
                        },
                        {
                            id: 'usage',
                            label: t('account.usage'),
                            icon: _jsx(IconDataOutline16, { size: 18 }),
                            onSelect: () => { navigation.openSettings('usage'); },
                        },
                        {
                            id: 'models',
                            label: t('settings.models'),
                            icon: _jsx(IconApiOutline14, { size: 18 }),
                            onSelect: () => { navigation.openSettings('models'); },
                        },
                        {
                            id: 'plugins',
                            label: t('nav.plugins'),
                            icon: _jsx(IconCordisPluginOutline14, { size: 18 }),
                            onSelect: () => { navigation.show('plugins'); },
                        },
                        {
                            id: 'agent-presets',
                            label: t('settings.agentPresets'),
                            icon: _jsx(IconSparkle16, {}),
                            onSelect: () => { navigation.openSettings('agentPresets'); },
                        },
                        {
                            id: 'official',
                            label: t('top.officialUi'),
                            icon: _jsx(IconLinkOutline16, { size: 18 }),
                            onSelect: () => { runtime.mode.set('official'); },
                        },
                    ] }) }), _jsx(Modal, { open: deleteTarget !== undefined, onClose: () => { if (!deleting)
                    setDeleteTarget(undefined); }, title: t('session.deleteTitle'), closeLabel: t('common.close'), description: t('session.deleteBody'), footer: (_jsxs(_Fragment, { children: [_jsx(PrimitiveButton, { variant: "outline", autoFocus: true, disabled: deleting, onClick: () => { if (!deleting)
                                setDeleteTarget(undefined); }, children: t('common.cancel') }), _jsx(PrimitiveButton, { variant: "outline", className: css.deleteConfirm, disabled: deleting, onClick: () => {
                                const target = deleteTarget;
                                if (target === undefined || deleting)
                                    return;
                                setDeleting(true);
                                void runtime.sessions.delete(target.id)
                                    .then(() => { setDeleteTarget(undefined); })
                                    .catch(() => { })
                                    .finally(() => { setDeleting(false); });
                            }, children: t('session.delete') })] })) }), _jsxs(Modal, { open: renameTarget !== undefined, onClose: closeRename, title: t('workspace.renameTitle'), closeLabel: t('common.close'), footer: (_jsxs(_Fragment, { children: [_jsx(PrimitiveButton, { variant: "outline", disabled: renaming, onClick: closeRename, children: t('common.cancel') }), _jsx(PrimitiveButton, { variant: "outline", disabled: renaming || renameDraft.trim() === '' || renameTarget === undefined || renameDraft.trim() === renameTarget.title, onClick: confirmRename, children: t('workspace.rename') })] })), children: [_jsx("input", { className: css.workspaceInput, value: renameDraft, "aria-label": t('workspace.name'), autoFocus: true, disabled: renaming, onChange: event => { setRenameDraft(event.target.value); setRenameError(undefined); }, onKeyDown: event => {
                            if (event.key !== 'Enter')
                                return;
                            event.preventDefault();
                            confirmRename();
                        } }), renameError === undefined ? null : _jsx("div", { className: css.workspaceError, role: "alert", children: renameError })] }), _jsxs(Modal, { open: removeTarget !== undefined, onClose: closeRemove, title: t('workspace.removeTitle'), closeLabel: t('common.close'), description: removeTarget === undefined ? undefined : t('workspace.removeBody', { name: removeTarget.title }), footer: (_jsxs(_Fragment, { children: [_jsx(PrimitiveButton, { variant: "outline", disabled: removing, onClick: closeRemove, children: t('common.cancel') }), _jsx(PrimitiveButton, { variant: "outline", className: css.deleteConfirm, disabled: removing, onClick: confirmRemove, children: t('workspace.remove') })] })), children: [removing ? _jsx("div", { className: css.workspaceStatus, role: "status", children: t('workspace.removePending') }) : null, removeError === undefined ? null : _jsx("div", { className: css.workspaceError, role: "alert", children: removeError })] })] }));
}
//# sourceMappingURL=LeftRail.js.map