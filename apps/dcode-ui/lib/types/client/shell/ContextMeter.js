import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useId, useRef, useState } from 'react';
import { useProjectionValue } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useModalFocus } from "./use-modal-focus.js";
import css from './ContextMeter.module.css';
function formatTokens(value) {
    if (value < 1_000)
        return String(Math.round(value));
    if (value < 1_000_000)
        return `${String(Math.round(value / 100) / 10)}K`;
    return `${String(Math.round(value / 100_000) / 10)}M`;
}
/** Compact context usage affordance beside the composer send control. */
export function ContextMeter({ sessionId }) {
    const t = useT();
    const pressure = useProjectionValue(sessionId, 'contextPressure');
    const breakdown = useProjectionValue(sessionId, 'contextBreakdown');
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const panelRef = useRef(null);
    const panelId = useId();
    const titleId = useId();
    const used = pressure?.projectedTokens ?? pressure?.pressureTokens;
    const capacity = pressure?.contextWindow;
    const percent = used === undefined || capacity === undefined || capacity <= 0
        ? undefined
        : Math.min(100, Math.round(used / capacity * 100));
    useModalFocus(open, panelRef, { onClose: () => { setOpen(false); } });
    useEffect(() => {
        if (!open)
            return undefined;
        const onPointerDown = (event) => {
            if (event.target instanceof Node && rootRef.current?.contains(event.target) === true)
                return;
            setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => { document.removeEventListener('pointerdown', onPointerDown); };
    }, [open]);
    useEffect(() => {
        if (percent === undefined && open)
            setOpen(false);
    }, [open, percent]);
    if (percent === undefined || used === undefined || capacity === undefined)
        return null;
    const label = t('context.aria', { percent: `${String(percent)}%` });
    const totalBreakdown = breakdown === undefined
        ? 0
        : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
    const rows = breakdown === undefined || totalBreakdown === 0
        ? []
        : [
            { key: 'context.system', value: breakdown.systemTokens, className: css.system },
            { key: 'context.tools', value: breakdown.toolsTokens, className: css.tools },
            { key: 'context.messages', value: breakdown.messageTokens, className: css.messages },
        ];
    return (_jsxs("span", { ref: rootRef, className: css.root, children: [_jsx("button", { type: "button", className: css.trigger, "aria-label": label, "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": open ? panelId : undefined, onClick: () => { setOpen(value => !value); }, children: _jsxs("svg", { viewBox: "0 0 14 14", width: "14", height: "14", "aria-hidden": true, children: [_jsx("circle", { className: css.track, cx: "7", cy: "7", r: "5.5" }), _jsx("circle", { className: css.fill, cx: "7", cy: "7", r: "5.5", strokeDasharray: `${String(2 * Math.PI * 5.5 * percent / 100)} ${String(2 * Math.PI * 5.5)}`, transform: "rotate(-90 7 7)" })] }) }), open
                ? (_jsxs("div", { ref: panelRef, id: panelId, className: css.panel, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, tabIndex: -1, children: [_jsxs("div", { className: css.header, id: titleId, children: [_jsx("span", { children: t('context.used') }), _jsxs("b", { children: [percent, "%"] }), _jsx("span", { className: css.figures, children: t('context.tokens', { used: formatTokens(used), total: formatTokens(capacity) }) })] }), _jsx("div", { className: css.bar, "aria-hidden": true, children: rows.length === 0
                                ? _jsx("span", { className: css.segment, style: { width: `${String(percent)}%` } })
                                : rows.map(row => (_jsx("span", { className: `${css.segment} ${row.className}`, style: { width: `${String(percent * row.value / totalBreakdown)}%` } }, row.key))) }), rows.length === 0
                            ? null
                            : (_jsx("dl", { className: css.rows, children: rows.map(row => (_jsxs("div", { className: css.row, children: [_jsxs("dt", { children: [_jsx("span", { className: `${css.swatch} ${row.className}`, "aria-hidden": true }), t(row.key)] }), _jsxs("dd", { children: ["~", formatTokens(row.value)] })] }, row.key))) }))] }))
                : null] }));
}
//# sourceMappingURL=ContextMeter.js.map