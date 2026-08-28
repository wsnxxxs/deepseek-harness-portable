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
import { Button as PrimitiveButton, IconArchiveOutline20, IconCordisPluginOutline14, IconChevronDownOutline14, IconChevronRightOutline14, IconDataOutline16, IconEllipsisOutline16, IconNewChatOutline16, IconRightUpOutline16, IconSettingsOutline16, IconSparkle16, IconTrashOutline16, IconUserOutline16, Modal, relativeTime, } from '@deepseek-ai/dsh-client-ui-primitives';
import { commandShortcut } from "../platform.js";
import { useRuntime } from "../state/runtime.js";
import { useSessionList, useWorkspaceGroups } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { EmptyState, Popover, ui } from "./ui.js";
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
/** The task action, scrollable navigation/tree, and account foot. */
export function LeftRail({ navigation, onNewTask }) {
    const runtime = useRuntime();
    const t = useT();
    const state = useNavigation(navigation);
    const list = useSessionList();
    const { groups, ungrouped } = useWorkspaceGroups();
    const age = useAge();
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [deleteTarget, setDeleteTarget] = useState();
    const [deleting, setDeleting] = useState(false);
    const toggleGroup = useCallback((id) => {
        setCollapsed((previous) => {
            const next = new Set(previous);
            if (!next.delete(id))
                next.add(id);
            return next;
        });
    }, []);
    const hasRows = useMemo(() => ungrouped.length > 0 || groups.some(group => group.sessions.length > 0), [groups, ungrouped]);
    return (_jsxs("nav", { className: css.rail, "aria-label": t('app.title'), children: [_jsx("div", { className: css.top, children: _jsxs("button", { type: "button", className: css.action, onClick: onNewTask, children: [_jsx(IconNewChatOutline16, {}), _jsx("span", { className: ui.grow, children: t('nav.newTask') }), _jsx("span", { className: css.shortcut, children: commandShortcut('N') })] }) }), _jsxs("div", { className: `${css.tree} ${ui.scroll}`, children: [_jsxs("div", { className: css.treeActions, children: [_jsxs("button", { type: "button", className: `${css.action} ${state.view === 'settings' && state.settingsSection === 'plugins' ? css.actionActive : ''}`, onClick: () => { navigation.openSettings('plugins'); }, children: [_jsx(IconCordisPluginOutline14, { size: 16 }), _jsx("span", { className: ui.grow, children: t('nav.plugins') })] }), _jsxs("button", { type: "button", className: `${css.action} ${state.view === 'learning' ? css.actionActive : ''}`, onClick: () => { navigation.show('learning'); }, children: [_jsx(IconSparkle16, {}), _jsx("span", { className: ui.grow, children: t('nav.learning') })] })] }), hasRows
                        ? (_jsxs(_Fragment, { children: [groups.map(group => (_jsxs("div", { className: css.group, children: [_jsxs("button", { type: "button", className: css.groupHeader, onClick: () => { toggleGroup(group.workspaceId); }, title: group.path, children: [collapsed.has(group.workspaceId) ? _jsx(IconChevronRightOutline14, {}) : _jsx(IconChevronDownOutline14, {}), _jsx("span", { className: css.groupName, children: group.title })] }), collapsed.has(group.workspaceId)
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
                        : _jsx(EmptyState, { children: t('nav.noTasks') })] }), _jsx("div", { className: css.foot, children: _jsx(Popover, { label: t('account.menu'), placement: "up", align: "start", style: { flex: 1 }, triggerClassName: css.accountTrigger, trigger: (_jsxs(_Fragment, { children: [_jsx("span", { className: css.avatar, "aria-hidden": true, children: _jsx(IconUserOutline16, {}) }), _jsx("span", { className: css.footName, children: t('app.title') })] })), rows: [
                        {
                            id: 'settings',
                            label: t('nav.settings'),
                            icon: _jsx(IconSettingsOutline16, {}),
                            onSelect: () => { navigation.openSettings('general'); },
                        },
                        {
                            id: 'usage',
                            label: t('account.usage'),
                            icon: _jsx(IconDataOutline16, {}),
                            onSelect: () => { navigation.openSettings('usage'); },
                        },
                        {
                            id: 'plugins',
                            label: t('nav.plugins'),
                            icon: _jsx(IconCordisPluginOutline14, { size: 16 }),
                            onSelect: () => { navigation.openSettings('plugins'); },
                        },
                        {
                            id: 'official',
                            label: t('top.officialUi'),
                            icon: _jsx(IconRightUpOutline16, {}),
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
                            }, children: t('session.delete') })] })) })] }));
}
//# sourceMappingURL=LeftRail.js.map