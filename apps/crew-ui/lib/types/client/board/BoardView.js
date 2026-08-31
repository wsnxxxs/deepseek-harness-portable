import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The mission board.
 *
 * This is Mission Control's landing surface, and the reason the surface exists:
 * the board is a shared human/agent artifact, so the operator gets the same
 * verbs the Lead has — create, edit, assign, complete, reopen, release, delete
 * — rather than a rendering of what the agent decided.
 *
 * Three columns, in the order work moves through them. Within a column the
 * unblocked tasks come first, because "what can start now" is the question a
 * board is scanned for.
 * @module @dsh-portable/crew-ui/client/board/BoardView
 */
import { useState } from 'react';
import { BOARD_COLUMNS, groupTasks } from "../state/board.js";
import { useRuntime } from "../state/runtime.js";
import { TaskCard } from "./TaskCard.js";
import { TaskEditor } from "./TaskEditor.js";
import css from './BoardView.module.css';
/** Split a comma-separated field into distinct, non-empty entries. */
function items(value) {
    return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
}
/** The three-column mission board. */
export function BoardView({ board, members }) {
    const { t } = useRuntime();
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(undefined);
    const tasks = board.view?.tasks ?? [];
    const columns = groupTasks(tasks);
    const submitCreate = async (draft) => {
        const created = await board.create({
            subject: draft.subject.trim(),
            description: draft.description.trim(),
            blockedBy: items(draft.blockers),
            writeScopes: items(draft.scopes),
        });
        if (created !== undefined)
            setCreating(false);
    };
    const submitEdit = async (task, draft) => {
        const edited = await board.update({
            taskId: task.id,
            expectedRevision: task.revision,
            action: 'edit',
            subject: draft.subject.trim(),
            description: draft.description.trim(),
            writeScopes: items(draft.scopes),
        });
        if (edited === undefined)
            return;
        // Dependencies are a separate action, and the host revision has already
        // advanced past the edit; sending the stale one would be a self-inflicted
        // conflict. Skip the second write entirely when nothing changed.
        const blockedBy = items(draft.blockers);
        const unchanged = blockedBy.length === edited.blockedBy.length
            && blockedBy.every((id, index) => id === edited.blockedBy[index]);
        if (unchanged) {
            setEditing(undefined);
            return;
        }
        const settled = await board.update({
            taskId: task.id,
            expectedRevision: edited.revision,
            action: 'set_dependencies',
            blockedBy,
        });
        if (settled !== undefined)
            setEditing(undefined);
    };
    if (board.loading && board.view === undefined) {
        return _jsx("p", { className: css.notice, children: t('board.loading') });
    }
    return (_jsxs("div", { className: css.root, children: [board.error !== undefined
                ? (_jsxs("div", { className: css.error, role: "alert", children: [_jsx("span", { children: board.error }), _jsxs("div", { className: css.errorActions, children: [_jsx("button", { type: "button", onClick: () => { void board.refresh(); }, children: t('board.retry') }), _jsx("button", { type: "button", onClick: board.dismissError, children: t('board.dismiss') })] })] }))
                : null, _jsx("div", { className: css.columns, children: BOARD_COLUMNS.map(column => (_jsxs("section", { className: css.column, "aria-label": t(`board.${column}`), children: [_jsxs("header", { className: css.columnHead, children: [_jsx("h2", { className: css.columnTitle, children: t(`board.${column}`) }), _jsx("span", { className: css.columnCount, children: columns[column].length }), column === 'pending'
                                    ? (_jsx("button", { type: "button", className: css.add, onClick: () => { setCreating(true); }, disabled: board.view === undefined, children: t('board.addTask') }))
                                    : null] }), _jsxs("div", { className: css.stack, children: [column === 'pending' && creating
                                    ? (_jsx(TaskEditor, { busy: board.pending.has('create'), onCancel: () => { setCreating(false); }, onSubmit: submitCreate }))
                                    : null, columns[column].map(task => (editing === task.id
                                    ? (_jsx(TaskEditor, { task: task, busy: board.pending.has(task.id), onCancel: () => { setEditing(undefined); }, onSubmit: draft => submitEdit(task, draft) }, task.id))
                                    : (_jsx(TaskCard, { task: task, tasks: tasks, members: members, busy: board.pending.has(task.id), onEdit: () => { setEditing(task.id); }, onAction: (action, extra) => {
                                            void board.update({
                                                taskId: task.id,
                                                expectedRevision: task.revision,
                                                action,
                                                ...extra,
                                            });
                                        } }, task.id)))), columns[column].length === 0 && !(column === 'pending' && creating)
                                    ? (_jsx("p", { className: css.empty, children: column === 'pending' ? t('board.emptyPending') : t('board.empty') }))
                                    : null] })] }, column))) })] }));
}
//# sourceMappingURL=BoardView.js.map