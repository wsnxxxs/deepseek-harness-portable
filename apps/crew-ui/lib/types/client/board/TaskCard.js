import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { blockerLabels } from "../state/board.js";
import { useRuntime } from "../state/runtime.js";
import css from './TaskCard.module.css';
/** A single board task with its dependency, scope and ownership state. */
export function TaskCard({ task, tasks, members, busy, onEdit, onAction }) {
    const { t } = useRuntime();
    const blockers = blockerLabels(task, tasks);
    const assignable = members.filter(member => member.status !== 'failed' && member.status !== 'provisioning');
    return (_jsxs("article", { className: `${css.root} ${busy ? css.busy : ''}`, "data-status": task.status, children: [_jsx("h3", { className: css.subject, children: task.subject }), task.description === '' ? null : _jsx("p", { className: css.description, children: task.description }), _jsxs("div", { className: css.meta, children: [task.status === 'pending'
                        ? (_jsx("span", { className: task.ready ? css.ready : css.blocked, children: task.ready ? t('board.ready') : t('board.blocked') }))
                        : null, _jsx("span", { className: css.owner, children: task.ownerName === undefined ? t('board.unowned') : task.ownerName })] }), blockers.length > 0
                ? (_jsxs("p", { className: css.chips, children: [_jsx("span", { className: css.chipLabel, children: t('board.blockedBy') }), blockers.map(label => _jsx("span", { className: css.chip, children: label }, label))] }))
                : null, task.writeScopes.length > 0
                ? (_jsxs("p", { className: css.chips, children: [_jsx("span", { className: css.chipLabel, children: t('board.scopes') }), task.writeScopes.map(scope => _jsx("span", { className: css.scope, children: scope }, scope))] }))
                : null, task.writeScopeWarnings.map(warning => (_jsxs("p", { className: css.warning, children: [_jsx("span", { className: css.warningLabel, children: t('board.conflict') }), warning] }, warning))), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", disabled: busy, onClick: onEdit, children: t('task.edit') }), task.status === 'completed'
                        ? _jsx("button", { type: "button", disabled: busy, onClick: () => { onAction('reopen'); }, children: t('task.reopen') })
                        : _jsx("button", { type: "button", disabled: busy, onClick: () => { onAction('complete'); }, children: t('task.complete') }), task.ownerName === undefined
                        ? null
                        : _jsx("button", { type: "button", disabled: busy, onClick: () => { onAction('release'); }, children: t('task.release') }), _jsxs("label", { className: css.assign, children: [_jsx("span", { className: css.assignLabel, children: t('task.assign') }), _jsxs("select", { value: task.ownerName ?? '', disabled: busy, onChange: (event) => {
                                    const owner = event.target.value;
                                    // The board models "nobody" as releasing rather than as an owner
                                    // named empty string, so the two verbs stay distinct on the host.
                                    if (owner === '')
                                        onAction('release');
                                    else
                                        onAction('reassign', { owner });
                                }, children: [_jsx("option", { value: "", children: t('task.assignNobody') }), assignable.map(member => _jsx("option", { value: member.name, children: member.name }, member.id))] })] }), _jsx("button", { type: "button", className: css.destructive, disabled: busy, onClick: () => { onAction('delete'); }, children: t('task.delete') })] })] }));
}
//# sourceMappingURL=TaskCard.js.map