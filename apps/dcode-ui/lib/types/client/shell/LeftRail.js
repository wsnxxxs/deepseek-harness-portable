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
import { Button as PrimitiveButton, IconArchiveOutline20, IconCordisPluginOutline14, IconChevronDownOutline14, IconChevronRightOutline14, IconEllipsisOutline16, IconNewChatOutline16, IconSparkle16, IconTrashOutline16, Modal, relativeTime, } from '@deepseek-ai/dsh-client-ui-primitives';
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
/** The compact outline language used by the account menu. */
function AccountGlyph({ children }) {
    return (_jsx("svg", { "aria-hidden": "true", viewBox: "0 0 20 20", width: "18", height: "18", fill: "none", stroke: "currentColor", strokeWidth: "1.55", strokeLinecap: "round", strokeLinejoin: "round", children: children }));
}
function AccountUserGlyph() {
    return (_jsxs(AccountGlyph, { children: [_jsx("circle", { cx: "10", cy: "7.1", r: "2.55" }), _jsx("path", { d: "M4.9 16.2c.55-2.35 2.35-3.6 5.1-3.6s4.55 1.25 5.1 3.6" })] }));
}
function AccountSettingsGlyph() {
    return (_jsxs(AccountGlyph, { children: [_jsx("circle", { cx: "10", cy: "10", r: "2.45" }), _jsx("path", { d: "M10 2.9v1.55M10 15.55v1.55M2.9 10h1.55M15.55 10h1.55M4.98 4.98l1.1 1.1M13.92 13.92l1.1 1.1M15.02 4.98l-1.1 1.1M6.08 13.92l-1.1 1.1" }), _jsx("path", { d: "M12.2 3.45l.55 1.55 1.5.65 1.5-.5 1.1 1.1-.5 1.5.65 1.5 1.55.55v1.55l-1.55.55-.65 1.5.5 1.5-1.1 1.1-1.5-.5-1.5.65-.55 1.55H10" })] }));
}
function AccountUsageGlyph() {
    return (_jsxs(AccountGlyph, { children: [_jsx("ellipse", { cx: "8.2", cy: "4.6", rx: "4.55", ry: "2" }), _jsx("path", { d: "M3.65 4.6v4.25c0 1.1 2.05 2 4.55 2s4.55-.9 4.55-2V4.6" }), _jsx("path", { d: "M3.65 8.85v4.25c0 1.1 2.05 2 4.55 2s4.55-.9 4.55-2V8.85" }), _jsx("path", { d: "M15.2 11.1v4.2M13.1 13.2h4.2" })] }));
}
function AccountPluginsGlyph() {
    return (_jsxs(AccountGlyph, { children: [_jsx("circle", { cx: "10", cy: "3.8", r: "1", fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: "10", cy: "16.2", r: "1", fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: "3.8", cy: "10", r: "1", fill: "currentColor", stroke: "none" }), _jsx("circle", { cx: "16.2", cy: "10", r: "1", fill: "currentColor", stroke: "none" }), _jsx("path", { d: "M6.2 6.2l1.55 1.55M12.25 12.25l1.55 1.55M13.8 6.2l-1.55 1.55M7.75 12.25L6.2 13.8" }), _jsx("circle", { cx: "10", cy: "10", r: "2.1" })] }));
}
function AccountExternalGlyph() {
    return (_jsxs(AccountGlyph, { children: [_jsx("path", { d: "M5.2 14.8L15.9 4.1M10.1 4.1h5.8v5.8" }), _jsx("path", { d: "M14.5 12.6v2.7c0 .55-.45 1-1 1H5.1c-.55 0-1-.45-1-1V6.9c0-.55.45-1 1-1h2.7" })] }));
}
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
                        : _jsx(EmptyState, { children: t('nav.noTasks') })] }), _jsx("div", { className: css.foot, children: _jsx(Popover, { label: t('account.menu'), placement: "up", align: "start", style: { flex: 1 }, triggerClassName: css.accountTrigger, trigger: (_jsxs(_Fragment, { children: [_jsx("span", { className: css.avatar, "aria-hidden": true, children: _jsx(AccountUserGlyph, {}) }), _jsx("span", { className: css.footName, children: t('app.title') })] })), rows: [
                        {
                            id: 'settings',
                            label: t('nav.settings'),
                            icon: _jsx(AccountSettingsGlyph, {}),
                            onSelect: () => { navigation.openSettings('general'); },
                        },
                        {
                            id: 'usage',
                            label: t('account.usage'),
                            icon: _jsx(AccountUsageGlyph, {}),
                            onSelect: () => { navigation.openSettings('usage'); },
                        },
                        {
                            id: 'plugins',
                            label: t('nav.plugins'),
                            icon: _jsx(AccountPluginsGlyph, {}),
                            onSelect: () => { navigation.openSettings('plugins'); },
                        },
                        {
                            id: 'official',
                            label: t('top.officialUi'),
                            icon: _jsx(AccountExternalGlyph, {}),
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