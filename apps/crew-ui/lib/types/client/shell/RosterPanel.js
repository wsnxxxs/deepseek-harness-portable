import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import css from './RosterPanel.module.css';
/** Copy key for one member status. */
function statusKey(status) {
    switch (status) {
        case 'running': return 'roster.status.running';
        case 'idle': return 'roster.status.idle';
        case 'inactive': return 'roster.status.inactive';
        case 'provisioning': return 'roster.status.provisioning';
        case 'failed': return 'roster.status.failed';
    }
}
/** The right-hand crew roster. */
export function RosterPanel({ members, currentSessionId, onOpenMember }) {
    const { t } = useRuntime();
    const teammates = members.filter(member => member.role === 'teammate');
    return (_jsxs("aside", { className: css.root, "aria-label": t('roster.title'), children: [_jsx("header", { className: css.head, children: _jsx("h2", { className: css.title, children: t('roster.title') }) }), _jsx("ul", { className: css.list, children: members.map(member => (_jsxs("li", { children: [_jsxs("button", { type: "button", className: `${css.row} ${member.id === currentSessionId ? css.rowActive : ''}`, 
                            // A Lead has no separate thread to open: its conversation is the
                            // mission's own, already one tab away.
                            disabled: member.role === 'lead', onClick: () => { onOpenMember(member); }, children: [_jsx("span", { className: css.avatar, "aria-hidden": true, children: _jsx(IconUserOutline16, {}) }), _jsxs("span", { className: css.memberCopy, children: [_jsx("span", { className: css.name, children: member.name }), _jsx("span", { className: css.role, children: member.role === 'lead' ? t('roster.lead') : t(statusKey(member.status)) })] }), _jsx("span", { className: css.status, "data-status": member.status, "aria-hidden": true })] }), member.description === undefined || member.description === ''
                            ? null
                            : _jsx("p", { className: css.description, children: member.description }), member.diagnostics.map(diagnostic => (_jsx("p", { className: css.diagnostic, children: diagnostic }, diagnostic)))] }, member.id))) }), teammates.length === 0
                ? (_jsxs("div", { className: css.empty, children: [_jsx("p", { className: css.emptyTitle, children: t('roster.empty') }), _jsx("p", { className: css.emptyBody, children: t('roster.emptyBody') })] }))
                : null] }));
}
//# sourceMappingURL=RosterPanel.js.map