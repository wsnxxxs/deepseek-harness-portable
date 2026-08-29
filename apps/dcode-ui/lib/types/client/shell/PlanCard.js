import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** The compact live plan card shown above the composer. */
import { useId, useMemo, useState } from 'react';
import { IconCheckOutline14, IconChevronDownOutline14, IconChevronRightOutline14, IconChecklistOutline14, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useChatSnapshot, useProjectionValue } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { latestTodos } from "../chat/tools.js";
import { Spinner, ui } from "./ui.js";
import css from './PlanCard.module.css';
function StatusMark({ status }) {
    if (status === 'completed') {
        return _jsx("span", { className: `${css.mark} ${css.markDone}`, "aria-hidden": true, children: _jsx(IconCheckOutline14, {}) });
    }
    if (status === 'in_progress') {
        return _jsx("span", { className: `${css.mark} ${css.markActive}`, "aria-hidden": true, children: _jsx(Spinner, { size: "sm" }) });
    }
    return _jsx("span", { className: `${css.mark} ${css.markPending}`, "aria-hidden": true });
}
/** Render the current `todos` projection with a transcript replay fallback. */
export function PlanCard({ sessionId, open = true }) {
    const t = useT();
    const projectedTodos = useProjectionValue(sessionId, 'todos');
    const chat = useChatSnapshot(sessionId);
    const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
    const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? [];
    const [collapsed, setCollapsed] = useState(false);
    const contentId = useId();
    if (!open || todos.length === 0)
        return null;
    const completed = todos.filter(todo => todo.status === 'completed').length;
    return (_jsx("div", { className: css.dock, children: _jsxs("section", { className: css.card, "data-testid": "dcode-plan-card", "aria-label": t('plan.title'), children: [_jsxs("button", { type: "button", className: `${css.header} ${ui.cardHeader}`, "aria-expanded": !collapsed, "aria-controls": contentId, onClick: () => { setCollapsed(value => !value); }, children: [_jsx("span", { className: css.icon, "aria-hidden": true, children: _jsx(IconChecklistOutline14, { size: 16 }) }), _jsx("span", { className: css.title, children: t('plan.title') }), _jsx("span", { className: css.progress, children: t('plan.progress', { done: completed, total: todos.length }) }), _jsx("span", { className: css.chevron, "aria-hidden": true, children: collapsed ? _jsx(IconChevronRightOutline14, {}) : _jsx(IconChevronDownOutline14, {}) })] }), !collapsed
                    ? (_jsx("div", { id: contentId, children: _jsx("ul", { className: css.list, children: todos.map((todo, index) => (_jsxs("li", { className: css.item, "data-status": todo.status, children: [_jsx(StatusMark, { status: todo.status }), _jsx("span", { className: css.content, children: todo.content })] }, `${String(index)}:${todo.content}`))) }) }))
                    : null] }) }));
}
//# sourceMappingURL=PlanCard.js.map