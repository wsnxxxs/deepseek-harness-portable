import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The environment summary: what this task is working on, at a glance.
 *
 * A card the top bar summons and dismisses, anchored under its own control at
 * the right of the conversation column — deliberately not the preview
 * sidebar, which is where the same facts are worked rather than read. Every
 * row is the digest of one panel and opens it: the change counts open
 * Changes, the goal opens Goal.
 *
 * Nothing here is state of its own. The counts come from the same git read
 * the Changes panel uses, the goal from the host projection the official goal
 * bar renders, and the workspace from the durable registry.
 * @module @dsh-portable/dcode-ui/client/shell/SummaryCard
 */
import { useMemo } from 'react';
import { IconBranchOutline16, IconChecklistOutline14, IconChevronRightOutline14, IconCodeOutline16, IconCloseOutline16, IconFolderOpenOutline16, IconGoalOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useChatSnapshot, useProjectionValue, useWorkspaceGroups } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useGitStatus } from "../git/useGit.js";
import { latestTodos } from "../chat/tools.js";
import { ui } from "./ui.js";
import css from './SummaryCard.module.css';
/** One digest line: an icon, what it is, and the value it stands for. */
function Row(props) {
    const body = (_jsxs(_Fragment, { children: [_jsx("span", { className: css.rowIcon, "aria-hidden": true, children: props.icon }), _jsx("span", { className: css.rowLabel, children: props.label }), _jsx("span", { className: css.rowValue, children: props.value }), props.onOpen === undefined
                ? null
                : _jsx("span", { className: css.rowChevron, "aria-hidden": true, children: _jsx(IconChevronRightOutline14, {}) })] }));
    if (props.onOpen === undefined) {
        return _jsx("div", { className: css.row, title: props.title, role: props.ariaLabel === undefined ? undefined : 'note', tabIndex: props.ariaLabel === undefined ? undefined : 0, "aria-label": props.ariaLabel, children: body });
    }
    return (_jsx("button", { type: "button", className: `${css.row} ${css.rowAction}`, title: props.title, onClick: props.onOpen, children: body }));
}
/** The environment digest, or null while the top bar keeps it closed. */
export function SummaryCard({ navigation, sessionId, cwd, open }) {
    const t = useT();
    const { groups } = useWorkspaceGroups();
    const git = useGitStatus(cwd, sessionId);
    const goal = useProjectionValue(sessionId, 'goal');
    const projectedTodos = useProjectionValue(sessionId, 'todos');
    const chat = useChatSnapshot(sessionId);
    const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
    const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? [];
    const workspace = useMemo(() => groups.find(group => group.path === cwd)
        ?? groups.find(group => group.sessions.some(row => row.id === sessionId)), [groups, cwd, sessionId]);
    if (!open)
        return null;
    const status = git.status;
    const repository = status?.repository === true;
    const dirty = (status?.files.length ?? 0) > 0;
    const done = todos.filter(todo => todo.status === 'completed').length;
    const objective = goal?.goal.objective;
    return (_jsxs("section", { className: css.card, "aria-label": t('summary.title'), children: [_jsxs("header", { className: `${css.header} ${ui.cardHeader}`, children: [_jsx("span", { className: css.title, children: t('summary.title') }), _jsx("button", { type: "button", className: css.close, "aria-label": t('summary.close'), onClick: () => { navigation.toggleSummary(false); }, children: _jsx(IconCloseOutline16, {}) })] }), workspace === undefined && !repository
                ? _jsx("p", { className: css.empty, children: t('chat.empty.noWorkspace') })
                : (_jsxs("div", { className: css.rows, children: [_jsx(Row, { icon: _jsx(IconCodeOutline16, {}), label: t('git.changes'), title: t('summary.openChanges'), value: !repository
                                ? _jsx("span", { className: css.muted, children: t('top.noRepository') })
                                : dirty
                                    ? (_jsxs("span", { className: css.counts, children: [_jsxs("span", { className: css.added, children: ["+", status?.insertions ?? 0] }), _jsxs("span", { className: css.removed, children: ["-", status?.deletions ?? 0] })] }))
                                    : _jsx("span", { className: css.muted, children: t('git.clean') }), onOpen: () => { navigation.openAside('changes'); } }), workspace === undefined
                            ? null
                            : (_jsx(Row, { icon: _jsx(IconFolderOpenOutline16, {}), label: t('summary.local'), title: workspace.path, ariaLabel: workspace.path, value: _jsx("span", { className: css.truncate, children: workspace.title }) })), !repository
                            ? null
                            : (_jsx(Row, { icon: _jsx(IconBranchOutline16, {}), label: t('top.branch'), value: (_jsx("span", { className: css.truncate, children: status?.branch ?? (status?.detached === true ? 'HEAD' : t('top.branch')) })) })), objective === undefined || objective === ''
                            ? null
                            : (_jsx(Row, { icon: _jsx(IconGoalOutline16, {}), label: t('goal.title'), title: objective, value: _jsx("span", { className: css.truncate, children: objective }), onOpen: () => { navigation.openAside('goal'); } })), todos.length === 0
                            ? null
                            : (_jsx(Row, { icon: _jsx(IconChecklistOutline14, { size: 16 }), label: t('plan.title'), value: t('plan.progress', { done, total: todos.length }), onOpen: () => { navigation.openAside('goal'); } }))] }))] }));
}
//# sourceMappingURL=SummaryCard.js.map