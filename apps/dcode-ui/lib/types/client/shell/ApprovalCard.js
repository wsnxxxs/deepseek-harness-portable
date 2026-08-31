import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The permission-approval card: the composer seat for one pending Host
 * permission request.
 *
 * DSH's own approval plugin publishes each waiting Host request into the
 * shared Session pending-interaction roster; DCode renders that value here
 * because the custom composer replaces the official composer seat that the
 * approval slot chain would otherwise take over. The decision is transient:
 * allow-once or reject, never a persistent permission grant.
 * @module @dsh-portable/dcode-ui/client/shell/ApprovalCard
 */
import { useState } from 'react';
import { useT } from "../state/i18n.js";
import { Button, Spinner } from "./ui.js";
import css from './QuestionComposer.module.css';
/** Small inline shield so the card is recognizable without color alone. */
function ShieldIcon() {
    return (_jsxs("svg", { viewBox: "0 0 16 16", width: "14", height: "14", fill: "none", "aria-hidden": true, children: [_jsx("path", { d: "M8 1.5 13 3.4v3.8c0 3.1-1.9 5.8-5 7.3-3.1-1.5-5-4.2-5-7.3V3.4z", stroke: "currentColor", strokeWidth: "1.35", strokeLinejoin: "round" }), _jsx("path", { d: "m5.8 7.9 1.4 1.4 3-3", stroke: "currentColor", strokeWidth: "1.35", strokeLinecap: "round", strokeLinejoin: "round" })] }));
}
/** Composer takeover for one waiting Host approval request. */
export function ApprovalCard({ pending }) {
    const t = useT();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState();
    const settle = (outcome) => {
        if (busy)
            return;
        setBusy(true);
        setError(undefined);
        void pending.answer(outcome).catch((cause) => {
            setBusy(false);
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    };
    return (_jsx("div", { className: css.frame, "data-approval-key": pending.key, children: _jsxs("section", { className: `${css.card} ${css.reviewCard}`, "aria-label": t('approval.title'), children: [_jsx("header", { className: css.reviewHeader, children: _jsxs("span", { className: css.kicker, children: [_jsx(ShieldIcon, {}), t('approval.title')] }) }), _jsxs("div", { className: css.reviewBody, children: [_jsx("div", { className: css.approvalHeadline, children: pending.reason ?? t('approval.escalation', { toolName: pending.toolName }) }), _jsx("div", { className: css.approvalMeta, children: t('approval.tool', { toolName: pending.toolName }) })] }), _jsxs("footer", { className: css.reviewFooter, children: [_jsx("div", { className: css.feedback, role: "alert", children: error }), _jsxs("div", { className: css.footerActions, children: [_jsx(Button, { disabled: busy, onClick: () => { settle('rejected'); }, children: t('approval.reject') }), _jsx(Button, { primary: true, autoFocus: true, disabled: busy, onClick: () => { settle('allowed-once'); }, children: busy ? _jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), t('question.submitting')] }) : t('approval.allowOnce') })] })] })] }) }));
}
//# sourceMappingURL=ApprovalCard.js.map