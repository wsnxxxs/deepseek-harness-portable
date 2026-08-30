import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The environment summary: what this task is working on, at a glance.
 *
 * A card the top bar summons and dismisses, anchored under its own control at
 * the right of the conversation column — deliberately not the preview
 * sidebar, which is where the same facts are worked rather than read. Every
 * environment row is the digest of one panel and opens it: the change counts
 * open Changes, the goal opens Goal. Recent trace activity follows those rows
 * so it stays available without occupying a second floating card.
 *
 * Nothing here is state of its own. The counts come from the same git read
 * the Changes panel uses, the goal from the host projection the official goal
 * bar renders, and the workspace from the durable registry.
 * @module @dsh-portable/dcode-ui/client/shell/SummaryCard
 */
import { useEffect, useMemo, useRef } from 'react';
import { IconBranchOutline16, IconChecklistOutline14, IconChevronRightOutline14, IconCodeOutline16, IconCloseOutline16, IconFolderOpenOutline16, IconGoalOutline16, IconListPenOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useChatSnapshot, useProjectionValue, useTrajectorySnapshot, useWorkspaceGroups } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { EMPTY_TRAJECTORY_SNAPSHOT } from "../state/runtime.js";
import { useGitStatus } from "../git/useGit.js";
import { latestTodos } from "../chat/tools.js";
import { ui } from "./ui.js";
import { useModalFocus } from "./use-modal-focus.js";
import css from './SummaryCard.module.css';
/** Build the small trace ledger from the same snapshot as DSH's full view. */
function buildTraceRows(snapshot, t) {
    const rows = snapshot.eventNodes.map((node) => {
        switch (node.kind) {
            case 'user':
                return { id: `event:${node.seq}`, label: t('trace.user') };
            case 'assistant': {
                const call = node.blocks.find(block => block.kind === 'tool-call');
                return {
                    id: `event:${node.seq}`,
                    label: call?.kind === 'tool-call' ? call.name : t('trace.assistant'),
                    callId: call?.kind === 'tool-call' ? call.callId : undefined,
                };
            }
            case 'steering':
                return { id: `event:${node.seq}`, label: t('trace.steering') };
            case 'context':
                return { id: `event:${node.seq}`, label: t('trace.context') };
            case 'model-retry':
                return { id: `event:${node.seq}`, label: t('trace.retry'), detail: node.retryState };
            case 'turn-error':
                return { id: `event:${node.seq}`, label: t('trace.error'), detail: node.message, status: 'failed' };
            case 'turn-max-tokens':
                return { id: `event:${node.seq}`, label: t('trace.limit') };
            case 'tool-result':
                return {
                    id: `event:${node.seq}`,
                    label: node.call?.name ?? t('trace.tool'),
                    detail: node.isError ? t('trace.failed') : t('trace.done'),
                    callId: node.callId,
                    status: node.isError ? 'failed' : 'done',
                };
            case 'command':
                return {
                    id: `event:${node.seq}`,
                    label: node.name ?? t('trace.command'),
                    detail: node.outcome?.kind === 'error' ? t('trace.failed') : node.outcome === null ? t('trace.active') : t('trace.done'),
                    status: node.outcome?.kind === 'error' ? 'failed' : node.outcome === null ? 'running' : 'done',
                };
            case 'compaction':
                return { id: `event:${node.seq}`, label: t('trace.compaction') };
            case 'unknown':
                return { id: `event:${node.seq}`, label: node.type || t('trace.unknown') };
        }
    });
    const seenCalls = new Set(rows.flatMap(row => row.callId === undefined ? [] : [row.callId]));
    for (const call of snapshot.runningCalls) {
        if (seenCalls.has(call.callId))
            continue;
        rows.push({
            id: `running:${call.callId}`,
            label: call.name,
            detail: t('trace.active'),
            callId: call.callId,
            status: 'running',
        });
    }
    if (snapshot.partial !== null) {
        rows.push({ id: 'partial', label: t('trace.assistant'), detail: t('trace.active'), status: 'running' });
    }
    return rows.slice(-8);
}
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
export function SummaryCard({ navigation, sessionId, cwd, open, compact }) {
    const cardRef = useRef(null);
    const t = useT();
    const { groups } = useWorkspaceGroups();
    const git = useGitStatus(cwd, sessionId);
    const goal = useProjectionValue(sessionId, 'goal');
    const projectedTodos = useProjectionValue(sessionId, 'todos');
    const chat = useChatSnapshot(sessionId);
    const trajectory = useTrajectorySnapshot(sessionId);
    const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
    const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? [];
    const traceRows = useMemo(() => buildTraceRows(trajectory ?? EMPTY_TRAJECTORY_SNAPSHOT, t), [trajectory, t]);
    const workspace = useMemo(() => groups.find(group => group.path === cwd)
        ?? groups.find(group => group.sessions.some(row => row.id === sessionId)), [groups, cwd, sessionId]);
    useModalFocus(open && compact, cardRef, { onClose: () => { navigation.toggleSummary(false); } });
    useEffect(() => {
        if (!open || compact)
            return undefined;
        const onDocumentPointerDown = (event) => {
            const target = event.target;
            if (target instanceof Node && cardRef.current?.contains(target) === true)
                return;
            if (target instanceof Element
                && target.closest('[data-dcode-focus-target="summary"]') !== null)
                return;
            navigation.toggleSummary(false);
        };
        const onDocumentKeyDown = (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            event.stopImmediatePropagation();
            navigation.toggleSummary(false);
            window.requestAnimationFrame(() => {
                document.querySelector('[data-dcode-focus-target="summary"]')?.focus();
            });
        };
        document.addEventListener('pointerdown', onDocumentPointerDown);
        document.addEventListener('keydown', onDocumentKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onDocumentPointerDown);
            document.removeEventListener('keydown', onDocumentKeyDown, true);
        };
    }, [compact, navigation, open]);
    if (!open)
        return null;
    const status = git.status;
    const repository = status?.repository === true;
    const dirty = (status?.files.length ?? 0) > 0;
    const done = todos.filter(todo => todo.status === 'completed').length;
    const objective = goal?.goal.objective;
    const running = trajectory?.runningCalls.length ?? 0;
    return (_jsxs("section", { ref: cardRef, className: css.card, "aria-label": t('summary.title'), "aria-modal": compact ? true : undefined, role: compact ? 'dialog' : undefined, tabIndex: compact ? -1 : undefined, children: [_jsxs("header", { className: `${css.header} ${ui.cardHeader}`, children: [_jsx("span", { className: css.title, children: t('summary.title') }), _jsx("button", { type: "button", className: css.close, "aria-label": t('summary.close'), onClick: () => { navigation.toggleSummary(false); }, children: _jsx(IconCloseOutline16, {}) })] }), workspace === undefined && !repository
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
                            : (_jsx(Row, { icon: _jsx(IconChecklistOutline14, { size: 16 }), label: t('plan.title'), value: t('plan.progress', { done, total: todos.length }), onOpen: () => { navigation.openAside('goal'); } }))] })), traceRows.length === 0
                ? null
                : (_jsxs("section", { className: css.trace, "aria-label": t('trace.title'), children: [_jsxs("div", { className: css.traceHeader, children: [_jsxs("span", { className: css.traceTitle, children: [_jsx(IconListPenOutline16, { size: 14 }), t('trace.title')] }), _jsxs("span", { className: css.traceStats, children: [t('trace.stats', {
                                            events: trajectory?.eventNodes.length ?? 0,
                                            requests: trajectory?.requests.length ?? 0,
                                        }), running > 0 ? ` · ${t('trace.runningCount', { count: running })}` : ''] })] }), _jsx("ul", { className: css.traceList, children: traceRows.map(row => (_jsx("li", { className: css.traceItem, "data-status": row.status, children: row.callId === undefined
                                    ? (_jsxs("div", { className: css.traceRow, children: [_jsx("span", { className: css.traceDot, "aria-hidden": true }), _jsx("span", { className: css.traceLabel, children: row.label }), row.detail === undefined ? null : _jsx("span", { className: css.traceDetail, children: row.detail })] }))
                                    : (_jsxs("button", { type: "button", className: css.traceRow, title: t('trace.inspect'), onClick: () => {
                                            navigation.toggleSummary(false);
                                            navigation.inspect(row.callId);
                                        }, children: [_jsx("span", { className: css.traceDot, "aria-hidden": true }), _jsx("span", { className: css.traceLabel, children: row.label }), row.detail === undefined ? null : _jsx("span", { className: css.traceDetail, children: row.detail })] })) }, row.id))) })] }))] }));
}
//# sourceMappingURL=SummaryCard.js.map