import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { useArchivedChats } from "./archive.js";
import css from './ArchivedChatsSection.module.css';
/** The archive page, one row per archived conversation. */
export function ArchivedChatsSection(props) {
    const sessions = props.useSessions(state => state);
    const workspaces = props.useWorkspaces(state => state);
    const { t, close } = props;
    const model = useArchivedChats(sessions, workspaces, {
        // Restoring is the one flow that leaves settings: the point of restoring a
        // conversation is to continue it, and the sidebar behind the panel is not
        // visible while the panel is open.
        restore: async (id) => {
            await props.restore(id);
            if (sessions.byId[id] !== undefined) {
                props.open(id);
                close();
            }
        },
        remove: async (id) => {
            await props.remove(id);
            if (sessions.current === id)
                props.clear();
        },
    });
    return (_jsxs("section", { className: css.root, children: [_jsx("h2", { className: css.title, children: t('archive.title') }), _jsx("p", { className: css.lead, children: t('archive.body') }), model.loading
                ? null
                : model.rows.length === 0
                    ? _jsx("div", { className: css.empty, children: t('archive.empty') })
                    : (_jsx("ul", { className: css.list, children: model.rows.map(session => (_jsxs("li", { className: css.row, children: [_jsxs("div", { className: css.rowText, children: [_jsx("span", { className: css.rowTitle, children: session.displayTitle }), session.cwd === undefined ? null : _jsx("span", { className: css.rowBody, children: session.cwd })] }), _jsxs("div", { className: css.rowActions, children: [_jsx(Button, { size: "sm", disabled: model.busy, onClick: () => { model.restore(session.id); }, children: model.busyId === session.id ? t('archive.working') : t('archive.restore') }), _jsx("button", { type: "button", className: css.danger, disabled: model.busy, onClick: () => { model.requestDelete(session); }, children: t('archive.delete') })] })] }, session.id))) })), model.error === undefined ? null : _jsx("div", { className: css.error, role: "alert", children: model.error }), _jsx(Modal, { open: model.deleteTarget !== undefined, onClose: model.cancelDelete, title: t('archive.deleteTitle'), closeLabel: t('archive.close'), description: t('archive.deleteBody'), footer: (_jsxs(_Fragment, { children: [_jsx(Button, { disabled: model.busy, onClick: model.cancelDelete, children: t('archive.cancel') }), _jsx("button", { type: "button", className: css.danger, disabled: model.busy, onClick: model.confirmDelete, children: model.busy ? t('archive.working') : t('archive.delete') })] })), children: _jsx("div", { className: css.rowTitle, children: model.deleteTarget?.displayTitle }) })] }));
}
//# sourceMappingURL=ArchivedChatsSection.js.map