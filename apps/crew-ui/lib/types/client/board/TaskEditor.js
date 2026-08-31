import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The create/edit form for one task.
 *
 * The same form serves both, because the fields are the same and an operator
 * who has written one task should not have to learn a second layout to change
 * it. Save stays disabled until the two fields the host requires are non-empty,
 * so an invalid write is never sent for the host to reject.
 * @module @dsh-portable/crew-ui/client/board/TaskEditor
 */
import { useState } from 'react';
import { useRuntime } from "../state/runtime.js";
import css from './TaskEditor.module.css';
const EMPTY = { subject: '', description: '', blockers: '', scopes: '' };
/** Create or edit one board task. */
export function TaskEditor({ task, busy, onCancel, onSubmit }) {
    const { t } = useRuntime();
    const [draft, setDraft] = useState(() => (task === undefined
        ? EMPTY
        : {
            subject: task.subject,
            description: task.description,
            blockers: task.blockedBy.join(', '),
            scopes: task.writeScopes.join(', '),
        }));
    const patch = (part) => { setDraft(current => ({ ...current, ...part })); };
    const complete = draft.subject.trim() !== '' && draft.description.trim() !== '';
    return (_jsxs("form", { className: css.root, onSubmit: (event) => {
            event.preventDefault();
            if (!complete || busy)
                return;
            void onSubmit(draft);
        }, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.label, children: t('task.subject') }), _jsx("input", { className: css.input, value: draft.subject, placeholder: t('task.subjectPlaceholder'), disabled: busy, autoFocus: true, onChange: (event) => { patch({ subject: event.target.value }); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.label, children: t('task.description') }), _jsx("textarea", { className: css.textarea, value: draft.description, placeholder: t('task.descriptionPlaceholder'), rows: 3, disabled: busy, onChange: (event) => { patch({ description: event.target.value }); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.label, children: t('task.blockers') }), _jsx("input", { className: css.input, value: draft.blockers, placeholder: t('task.blockersPlaceholder'), disabled: busy, onChange: (event) => { patch({ blockers: event.target.value }); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.label, children: t('task.scopes') }), _jsx("input", { className: css.input, value: draft.scopes, placeholder: t('task.scopesPlaceholder'), disabled: busy, onChange: (event) => { patch({ scopes: event.target.value }); } })] }), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", disabled: busy, onClick: onCancel, children: t('task.cancel') }), _jsx("button", { type: "submit", className: css.primary, disabled: busy || !complete, children: t('task.save') })] })] }));
}
//# sourceMappingURL=TaskEditor.js.map