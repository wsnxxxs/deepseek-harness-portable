import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** The compact live plan card shown above the composer. */
import { useMemo, useState } from 'react';
import { IconCheckOutline14, IconChevronDownOutline14, IconChevronRightOutline14, IconChecklistOutline14, IconListPenOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useChatSnapshot, useProjectionValue, useTrajectorySnapshot } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { EMPTY_TRAJECTORY_SNAPSHOT } from "../state/runtime.js";
import { latestTodos } from "../chat/tools.js";
import { Spinner } from "./ui.js";
import css from './PlanCard.module.css';
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
function StatusMark({ status }) {
    if (status === 'completed') {
        return _jsx("span", { className: `${css.mark} ${css.markDone}`, "aria-hidden": true, children: _jsx(IconCheckOutline14, {}) });
    }
    if (status === 'in_progress') {
        return _jsx("span", { className: `${css.mark} ${css.markActive}`, "aria-hidden": true, children: _jsx(Spinner, {}) });
    }
    return _jsx("span", { className: `${css.mark} ${css.markPending}`, "aria-hidden": true });
}
/** Render the current `todos` projection with a transcript replay fallback. */
export function PlanCard({ sessionId, open = true, navigation }) {
    const t = useT();
    const projectedTodos = useProjectionValue(sessionId, 'todos');
    const chat = useChatSnapshot(sessionId);
    const trajectory = useTrajectorySnapshot(sessionId);
    const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
    const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? [];
    const traceRows = useMemo(() => buildTraceRows(trajectory ?? EMPTY_TRAJECTORY_SNAPSHOT, t), [trajectory, t]);
    const [collapsed, setCollapsed] = useState(false);
    if (!open || (todos.length === 0 && traceRows.length === 0))
        return null;
    const completed = todos.filter(todo => todo.status === 'completed').length;
    const running = trajectory?.runningCalls.length ?? 0;
    return (_jsx("div", { className: css.dock, children: _jsxs("section", { className: css.card, "data-testid": "dcode-plan-card", "aria-label": todos.length > 0 ? t('plan.title') : t('trace.title'), children: [_jsxs("button", { type: "button", className: css.header, "aria-expanded": !collapsed, onClick: () => { setCollapsed(value => !value); }, children: [_jsx("span", { className: css.icon, "aria-hidden": true, children: _jsx(IconChecklistOutline14, { size: 16 }) }), _jsx("span", { className: css.title, children: todos.length > 0 ? t('plan.title') : t('trace.title') }), _jsx("span", { className: css.progress, children: todos.length > 0
                                ? t('plan.progress', { done: completed, total: todos.length })
                                : t('trace.stats', { events: trajectory?.eventNodes.length ?? 0, requests: trajectory?.requests.length ?? 0 }) }), _jsx("span", { className: css.chevron, "aria-hidden": true, children: collapsed ? _jsx(IconChevronRightOutline14, {}) : _jsx(IconChevronDownOutline14, {}) })] }), !collapsed && todos.length > 0
                    ? (_jsx("ul", { className: css.list, children: todos.map((todo, index) => (_jsxs("li", { className: css.item, "data-status": todo.status, children: [_jsx(StatusMark, { status: todo.status }), _jsx("span", { className: css.content, children: todo.content })] }, `${String(index)}:${todo.content}`))) }))
                    : null, !collapsed && traceRows.length > 0
                    ? (_jsxs("section", { className: css.trace, "aria-label": t('trace.title'), children: [_jsxs("div", { className: css.traceHeader, children: [_jsxs("span", { className: css.traceTitle, children: [_jsx(IconListPenOutline16, { size: 14 }), t('trace.title')] }), _jsxs("span", { className: css.traceStats, children: [t('trace.stats', { events: trajectory?.eventNodes.length ?? 0, requests: trajectory?.requests.length ?? 0 }), running > 0 ? ` · ${t('trace.runningCount', { count: running })}` : ''] })] }), _jsx("ul", { className: css.traceList, children: traceRows.map(row => (_jsx("li", { className: css.traceItem, "data-status": row.status, children: row.callId === undefined || navigation === undefined
                                        ? (_jsxs("div", { className: css.traceRow, children: [_jsx("span", { className: css.traceDot, "aria-hidden": true }), _jsx("span", { className: css.traceLabel, children: row.label }), row.detail === undefined ? null : _jsx("span", { className: css.traceDetail, children: row.detail })] }))
                                        : (_jsxs("button", { type: "button", className: css.traceRow, title: t('trace.inspect'), onClick: () => { navigation.inspect(row.callId); }, children: [_jsx("span", { className: css.traceDot, "aria-hidden": true }), _jsx("span", { className: css.traceLabel, children: row.label }), row.detail === undefined ? null : _jsx("span", { className: css.traceDetail, children: row.detail })] })) }, row.id))) })] }))
                    : null] }) }));
}
//# sourceMappingURL=PlanCard.js.map