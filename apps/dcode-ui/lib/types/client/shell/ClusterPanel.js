import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** DCode's Cluster workbench: durable roster and shared task board. */
import { useCallback, useEffect, useState } from 'react';
import { IconCheckOutline14, IconChevronRightOutline14, IconPlusOutline16, IconRefreshOutline14, IconUserOutline16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useAsync } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useRuntime } from "../state/runtime.js";
import { EmptyState, Pill, Spinner, ui } from "./ui.js";
import css from './ClusterPanel.module.css';
const EMPTY_DRAFT = { subject: '', description: '', blockers: '', scopes: '' };
function memberStatusKey(status) {
    switch (status) {
        case 'running': return 'cluster.status.running';
        case 'idle': return 'cluster.status.idle';
        case 'inactive': return 'cluster.status.inactive';
        case 'provisioning': return 'cluster.status.provisioning';
        case 'failed': return 'cluster.status.failed';
    }
}
function taskStatusKey(status) {
    switch (status) {
        case 'pending': return 'cluster.task.pending';
        case 'in_progress': return 'cluster.task.inProgress';
        case 'completed': return 'cluster.task.completed';
        /* Deleted task tombstones are not included by the Team view. */
        case 'deleted': return 'cluster.task.completed';
    }
}
function csvItems(value) {
    return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))];
}
function rootSessionId(runtime, sessionId) {
    let current = sessionId;
    const visited = new Set();
    while (!visited.has(current)) {
        visited.add(current);
        const parent = runtime.sessions.binding(current)?.session.getSnapshot().subagent?.address?.parentSessionId;
        if (parent === undefined)
            return current;
        current = parent;
    }
    return current;
}
function mutationError(result) {
    if (!result.ok)
        return result.error.message;
    if (!result.value.ok)
        return result.value.error.message;
    return undefined;
}
function memberTree(members) {
    return members.map(member => ({ member, depth: member.role === 'lead' ? 0 : 1 }));
}
/** Cluster mode's durable orchestration inspector. */
export function ClusterPanel({ sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const cluster = runtime.cluster;
    const leadId = sessionId === undefined ? undefined : rootSessionId(runtime, sessionId);
    const [open, setOpen] = useState(true);
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState(EMPTY_DRAFT);
    const [editing, setEditing] = useState();
    const [editDraft, setEditDraft] = useState(EMPTY_DRAFT);
    const [busyTask, setBusyTask] = useState();
    const [operationError, setOperationError] = useState();
    const loaded = useAsync(async (signal) => {
        if (cluster === undefined || leadId === undefined)
            return undefined;
        signal.throwIfAborted();
        const result = await cluster.view(leadId);
        if (!result.ok)
            throw new Error(result.error.message);
        return result.value;
    }, [cluster, leadId]);
    useEffect(() => {
        if (!open || cluster === undefined || leadId === undefined)
            return undefined;
        const timer = window.setInterval(() => { loaded.reload(); }, 5000);
        return () => { window.clearInterval(timer); };
    }, [cluster, leadId, loaded.reload, open]);
    const updateTask = useCallback(async (task, change) => {
        if (cluster === undefined || leadId === undefined)
            return undefined;
        setBusyTask(task.id);
        setOperationError(undefined);
        try {
            const result = await cluster.updateTask(leadId, {
                taskId: task.id,
                expectedRevision: task.revision,
                ...change,
            });
            const failure = mutationError(result);
            if (failure !== undefined) {
                setOperationError(failure);
                loaded.reload();
                return undefined;
            }
            loaded.reload();
            if (!result.ok || !result.value.ok)
                return undefined;
            return result.value.value;
        }
        catch (cause) {
            setOperationError(cause instanceof Error ? cause.message : String(cause));
            return undefined;
        }
        finally {
            setBusyTask(undefined);
        }
    }, [cluster, leadId, loaded.reload]);
    const createTask = useCallback(async (event) => {
        event.preventDefault();
        if (cluster === undefined || leadId === undefined)
            return;
        const subject = draft.subject.trim();
        const description = draft.description.trim();
        if (subject === '' || description === '')
            return;
        setBusyTask('create');
        setOperationError(undefined);
        try {
            const result = await cluster.createTask(leadId, {
                subject,
                description,
                blockedBy: csvItems(draft.blockers),
                writeScopes: csvItems(draft.scopes),
            });
            const failure = mutationError(result);
            if (failure !== undefined) {
                setOperationError(failure);
                return;
            }
            setDraft(EMPTY_DRAFT);
            setCreating(false);
            loaded.reload();
        }
        catch (cause) {
            setOperationError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBusyTask(undefined);
        }
    }, [cluster, draft, leadId, loaded.reload]);
    const openMember = useCallback(async (member) => {
        if (member.role === 'lead' || member.status === 'failed' || member.status === 'provisioning')
            return;
        const parentSessionId = leadId;
        if (parentSessionId === undefined)
            return;
        try {
            await runtime.sessions.refreshSubagents(parentSessionId);
            runtime.sessions.openSubagent({ parentSessionId, childSessionId: member.id, mode: 'continuable' });
        }
        catch (cause) {
            setOperationError(cause instanceof Error ? cause.message : String(cause));
        }
    }, [leadId, runtime]);
    const beginEdit = (task) => {
        setEditing(task.id);
        setEditDraft({
            subject: task.subject,
            description: task.description,
            blockers: task.blockedBy.join(', '),
            scopes: task.writeScopes.join(', '),
        });
    };
    if (cluster === undefined)
        return null;
    const view = loaded.value;
    const members = view?.members ?? [];
    const tasks = view?.tasks ?? [];
    const running = members.filter(member => member.status === 'running').length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const rows = memberTree(members);
    return (_jsxs("section", { className: css.section, "data-cluster-panel": true, children: [_jsxs("div", { className: css.sectionHeader, children: [_jsxs("button", { type: "button", className: css.sectionToggle, "aria-expanded": open, onClick: () => { setOpen(value => !value); }, children: [_jsx(IconChevronRightOutline14, { className: open ? css.chevronOpen : undefined }), _jsx(IconUserOutline16, {}), _jsx("span", { className: ui.grow, children: t('cluster.title') }), running === 0 ? null : _jsx("span", { className: css.runningPill, children: t('cluster.running', { count: running }) }), _jsx(Pill, { children: members.length })] }), _jsx("button", { type: "button", className: css.refreshButton, "aria-label": t('cluster.refresh'), title: t('cluster.refresh'), onClick: () => { loaded.reload(); }, children: _jsx(IconRefreshOutline14, {}) })] }), open
                ? (_jsxs("div", { className: css.content, children: [_jsxs("div", { className: css.summary, children: [_jsxs("span", { children: [_jsx("strong", { children: members.length }), " ", t('cluster.members')] }), _jsxs("span", { children: [_jsxs("strong", { children: [completed, "/", tasks.length] }), " ", t('cluster.taskProgress')] })] }), operationError !== undefined && _jsxs("div", { className: css.error, role: "alert", children: [_jsx(IconWarningOutline16, {}), operationError] }), loaded.error !== undefined && _jsxs("div", { className: css.error, role: "alert", children: [_jsx(IconWarningOutline16, {}), loaded.error] }), loaded.loading && view === undefined
                            ? _jsxs(EmptyState, { children: [_jsx(Spinner, { size: "sm" }), " ", t('cluster.loading')] })
                            : view === undefined
                                ? _jsx(EmptyState, { children: t('cluster.empty') })
                                : (_jsxs(_Fragment, { children: [_jsxs("section", { className: css.subsection, children: [_jsxs("header", { className: css.subsectionHeader, children: [_jsx("span", { children: t('cluster.roster') }), _jsx(Pill, { children: members.length })] }), _jsx("div", { className: css.memberList, children: rows.map(({ member, depth }) => {
                                                        const canOpen = member.role !== 'lead'
                                                            && member.status !== 'failed'
                                                            && member.status !== 'provisioning';
                                                        const role = member.role === 'lead' ? t('cluster.roleLead') : t('cluster.roleTeammate');
                                                        return (_jsxs("button", { type: "button", className: css.memberRow, style: { paddingLeft: `${8 + depth * 14}px` }, disabled: !canOpen, onClick: () => { void openMember(member); }, title: canOpen ? t('cluster.openMember') : undefined, children: [_jsx("span", { className: css.statusDot, "data-status": member.status, "aria-hidden": true }), _jsxs("span", { className: css.memberCopy, children: [_jsx("span", { className: css.memberName, children: member.name }), _jsxs("span", { className: css.memberMeta, children: [role, " \u00B7 ", t(memberStatusKey(member.status)), member.model === undefined ? '' : ` · ${member.model}`] }), member.diagnostics.map(diagnostic => _jsx("span", { className: css.diagnostic, children: diagnostic }, diagnostic))] }), canOpen ? _jsx(IconChevronRightOutline14, { className: css.rowChevron }) : null] }, member.id));
                                                    }) })] }), _jsxs("section", { className: css.subsection, children: [_jsxs("div", { className: css.subsectionHeader, children: [_jsx("span", { children: t('cluster.tasks') }), _jsx("span", { className: ui.grow }), _jsxs("button", { type: "button", className: css.addButton, onClick: () => { setCreating(value => !value); }, children: [_jsx(IconPlusOutline16, { size: 13 }), " ", t('cluster.addTask')] })] }), creating && (_jsx(TaskForm, { draft: draft, setDraft: setDraft, pending: busyTask === 'create', onSave: event => { void createTask(event); }, onCancel: () => { setCreating(false); }, t: t })), tasks.length === 0 && !creating && _jsx(EmptyState, { children: t('cluster.noTasks') }), _jsx("div", { className: css.taskList, children: tasks.map(task => editing === task.id
                                                        ? (_jsx(TaskForm, { draft: editDraft, setDraft: setEditDraft, pending: busyTask === task.id, onSave: event => {
                                                                event.preventDefault();
                                                                void updateTask(task, {
                                                                    action: 'edit',
                                                                    subject: editDraft.subject.trim(),
                                                                    description: editDraft.description.trim(),
                                                                    writeScopes: csvItems(editDraft.scopes),
                                                                }).then(updated => { if (updated !== undefined)
                                                                    setEditing(undefined); });
                                                            }, onCancel: () => { setEditing(undefined); }, t: t, editMode: true }, task.id))
                                                        : (_jsx(TaskCard, { task: task, assignable: members.filter(member => member.status !== 'failed' && member.status !== 'provisioning'), busy: busyTask === task.id, onEdit: () => { beginEdit(task); }, onAction: (action, owner) => {
                                                                void updateTask(task, {
                                                                    action,
                                                                    ...owner === undefined || owner === '' ? {} : { owner },
                                                                });
                                                            }, t: t }, task.id))) })] })] }))] }))
                : null] }));
}
function TaskForm({ draft, setDraft, pending, onSave, onCancel, t, editMode = false, }) {
    const field = (key, value) => { setDraft({ ...draft, [key]: value }); };
    return (_jsxs("form", { className: css.taskForm, onSubmit: onSave, children: [_jsx("input", { value: draft.subject, placeholder: t('cluster.subject'), disabled: pending, onChange: (event) => { field('subject', event.target.value); } }), _jsx("textarea", { value: draft.description, placeholder: t('cluster.description'), disabled: pending, onChange: (event) => { field('description', event.target.value); } }), editMode ? null : _jsx("input", { value: draft.blockers, placeholder: t('cluster.blockers'), disabled: pending, onChange: (event) => { field('blockers', event.target.value); } }), _jsx("input", { value: draft.scopes, placeholder: t('cluster.scopes'), disabled: pending, onChange: (event) => { field('scopes', event.target.value); } }), _jsxs("div", { className: css.formActions, children: [_jsx("button", { type: "submit", className: css.primaryAction, disabled: pending || draft.subject.trim() === '' || draft.description.trim() === '', children: pending ? t('common.saving') : t('common.save') }), _jsx("button", { type: "button", className: css.taskAction, disabled: pending, onClick: onCancel, children: t('common.cancel') })] })] }));
}
function TaskCard({ task, assignable, busy, onEdit, onAction, t, }) {
    const ownerIsLead = task.ownerName === 'lead';
    return (_jsxs("article", { className: css.taskCard, children: [_jsxs("div", { className: css.taskHeading, children: [_jsx("strong", { children: task.subject }), _jsx("span", { className: css.taskStatus, "data-status": task.status, children: t(taskStatusKey(task.status)) })] }), _jsx("p", { className: css.taskDescription, children: task.description }), _jsxs("div", { className: css.taskMeta, children: [_jsx("code", { children: task.id }), _jsx("span", { children: task.ownerName ?? t('cluster.unassigned') }), task.status === 'pending' ? _jsx("span", { className: task.ready ? css.ready : css.blocked, children: task.ready ? t('cluster.ready') : t('cluster.blocked') }) : null, task.blockedBy.length > 0 ? _jsxs("span", { children: [t('cluster.blockedBy'), ": ", task.blockedBy.join(', ')] }) : null, task.writeScopes.length > 0 ? _jsxs("span", { children: [t('cluster.scopes'), ": ", task.writeScopes.join(', ')] }) : null] }), task.writeScopeWarnings.map(warning => _jsxs("div", { className: css.warning, children: [_jsx(IconWarningOutline16, {}), warning] }, warning)), _jsxs("div", { className: css.taskControls, children: [_jsxs("label", { className: css.ownerControl, children: [_jsx("span", { children: t('cluster.owner') }), _jsxs("select", { value: task.ownerName ?? '', disabled: busy || task.status === 'completed', onChange: event => { onAction('reassign', event.target.value); }, children: [_jsx("option", { value: "", children: t('cluster.unassigned') }), assignable.map(member => _jsx("option", { value: member.name, children: member.name }, member.id))] })] }), _jsx("button", { type: "button", className: css.taskAction, disabled: busy, onClick: onEdit, children: t('common.edit') }), task.status === 'pending' && task.ready
                        ? _jsx("button", { type: "button", className: css.primaryAction, disabled: busy, onClick: () => { onAction('claim'); }, children: t('cluster.claim') })
                        : null, task.status === 'in_progress' && ownerIsLead
                        ? (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: css.primaryAction, disabled: busy, onClick: () => { onAction('complete'); }, children: [_jsx(IconCheckOutline14, {}), " ", t('cluster.complete')] }), _jsx("button", { type: "button", className: css.taskAction, disabled: busy, onClick: () => { onAction('release'); }, children: t('cluster.release') })] }))
                        : null, task.status === 'completed'
                        ? _jsx("button", { type: "button", className: css.taskAction, disabled: busy, onClick: () => { onAction('reopen'); }, children: t('cluster.reopen') })
                        : null, _jsx("button", { type: "button", className: css.dangerAction, disabled: busy, onClick: () => { onAction('delete'); }, children: t('cluster.delete') })] })] }));
}
//# sourceMappingURL=ClusterPanel.js.map