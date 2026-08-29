import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The composer: prompt entry plus the four session controls the operator
 * changes most — agent mode, model, reasoning depth, and permission mode.
 *
 * Every control writes through the Host's own path, never a local mirror:
 * the model and reasoning effort go through `session/selectModel`, the
 * permission mode executes the `/permission` command the official chip
 * executes. The result is that both surfaces read the same projections
 * afterwards.
 * @module @dsh-portable/dcode-ui/client/shell/Composer
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconAgentPresetOutline16, IconCheckOutline16, IconChevronDownOutline14, IconCloseFill14, IconEditOutline16, IconFolderOpenOutline16, IconPaperclipOutline16, IconSendOutline16, IconStopFill16, IconThinkOutline16, IconWarningOutline16, RiskConfirmation, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useAsync, useObservable, useProjectionValue, useSessionInput, useSessionSnapshot, useWorkspaceGroups, } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { Popover } from "./ui.js";
import { ContextMeter } from "./ContextMeter.js";
import css from './Composer.module.css';
/** Permission value that requires an explicit user acknowledgement. */
const FULL_ACCESS_PERMISSION = 'danger-full-access';
/** Built-in preset labels are translated; user-authored rows use their roster metadata. */
function modeLabel(id, fallback, t) {
    switch (id) {
        case 'standard': return t('composer.mode.standard');
        case 'ptc': return t('composer.mode.ptc');
        case 'minimal': return t('composer.mode.minimal');
        case 'cordis': return t('composer.mode.cordis');
        default: return fallback;
    }
}
/** Known permission values have product copy; unfamiliar host values keep their published name. */
function permissionLabel(value, name, t) {
    switch (value) {
        case 'read-only': return t('composer.permission.readOnly');
        case 'workspace-write': return t('composer.permission.workspaceWrite');
        case FULL_ACCESS_PERMISSION: return t('composer.permission.fullAccess');
        default: return name;
    }
}
/** Use the primitive glyphs already shared by the client UI for permission rows. */
function permissionIcon(value) {
    switch (value) {
        case 'read-only': return _jsx(IconCheckOutline16, {});
        case 'workspace-write': return _jsx(IconEditOutline16, {});
        case FULL_ACCESS_PERMISSION: return _jsx(IconWarningOutline16, {});
        default: return undefined;
    }
}
/** Cmd/Ctrl+Enter flips the configured busy behavior. */
function oppositeBusyEnter(value) {
    return value === 'queue' ? 'steer' : 'queue';
}
/** Draft text per session, so switching tasks does not lose an unsent prompt. */
const drafts = new Map();
function fileSize(bytes) {
    if (bytes < 1_024)
        return `${String(bytes)} B`;
    if (bytes < 1_024 * 1_024)
        return `${(bytes / 1_024).toFixed(1)} KB`;
    return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
}
/** The DCode attachment strip: compact previews, with the same token rhythm as the composer. */
function AttachmentRail(props) {
    if (props.attachments.length === 0)
        return null;
    return (_jsx("div", { className: css.attachmentRail, "aria-label": props.t('composer.attachments'), children: props.attachments.map(attachment => (_jsxs("div", { className: css.attachment, children: [attachment.kind === 'image'
                    ? _jsx("img", { className: css.attachmentPreview, src: attachment.previewUrl, alt: attachment.file.name || props.t('composer.attachmentFile') })
                    : (_jsxs("span", { className: css.attachmentFile, title: attachment.file.name, children: [_jsx(IconPaperclipOutline16, {}), _jsx("span", { children: attachment.file.name || props.t('composer.attachmentFile') })] })), _jsx("span", { className: css.attachmentMeta, children: fileSize(attachment.file.size) }), _jsx("button", { type: "button", className: css.attachmentRemove, "aria-label": `${props.t('composer.removeAttachment')}: ${attachment.file.name || props.t('composer.attachmentFile')}`, disabled: props.disabled, onClick: () => { props.onRemove(attachment.id); }, children: _jsx(IconCloseFill14, {}) })] }, attachment.id))) }));
}
/** Prompt entry and the session controls. */
export function Composer({ sessionId, blank, cwd, onOpenWorkspace }) {
    const runtime = useRuntime();
    const t = useT();
    const session = useSessionSnapshot(sessionId);
    const { input, state: inputState } = useSessionInput(sessionId);
    const permissions = useProjectionValue(sessionId, 'permissions');
    const selection = useProjectionValue(sessionId, 'modelSelection');
    const agentPreset = useProjectionValue(sessionId, 'agentPreset');
    const busyEnter = useObservable(runtime.busyEnter, 'queue');
    const [fallbackDraft, setFallbackDraft] = useState('');
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState(undefined);
    const [dragActive, setDragActive] = useState(false);
    const [confirmingFullAccess, setConfirmingFullAccess] = useState(false);
    const [acknowledgedFullAccess, setAcknowledgedFullAccess] = useState(false);
    const inputRef = useRef(null);
    const shellRef = useRef(null);
    const attachmentInputRef = useRef(null);
    const conversation = runtime.conversation;
    const draft = input === undefined ? fallbackDraft : inputState.draft;
    const attachments = useMemo(() => conversation?.draftAttachmentsFor(inputState.imageIds) ?? [], [conversation, inputState.imageIds]);
    // Restore this session's draft on a task switch, and persist the outgoing one.
    const previousSession = useRef(undefined);
    const fallbackDraftRef = useRef(fallbackDraft);
    const inputRefForDraft = useRef(input);
    fallbackDraftRef.current = fallbackDraft;
    inputRefForDraft.current = input;
    useEffect(() => {
        const outgoing = previousSession.current;
        if (outgoing !== undefined && inputRefForDraft.current === undefined) {
            drafts.set(outgoing, fallbackDraftRef.current);
        }
        setFallbackDraft(sessionId === undefined ? '' : drafts.get(sessionId) ?? '');
        setError(undefined);
        previousSession.current = sessionId;
    }, [sessionId]);
    useEffect(() => {
        if (sessionId !== undefined && input === undefined)
            drafts.set(sessionId, fallbackDraft);
    }, [fallbackDraft, input, sessionId]);
    // Grow with content up to the stylesheet's cap. The card's width decides how
    // many lines the draft wraps to, so observe the card itself rather than only
    // the viewport — the center column can resize when either side rail changes.
    useEffect(() => {
        const input = inputRef.current;
        const shell = shellRef.current;
        if (input === null || shell === null)
            return undefined;
        const fit = () => {
            input.style.height = 'auto';
            input.style.height = `${String(input.scrollHeight)}px`;
        };
        fit();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', fit);
            return () => { window.removeEventListener('resize', fit); };
        }
        const observer = new ResizeObserver(fit);
        observer.observe(shell);
        return () => { observer.disconnect(); };
    }, [draft]);
    const catalog = useAsync(async () => await runtime.remote.session.modelCatalog(), [runtime]);
    const presets = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
    const running = session?.running === true;
    const current = selection?.next ?? selection?.lastUsed ?? undefined;
    const roster = presets.value?.ok === true ? presets.value.value.presets : [];
    const currentPreset = agentPreset ?? roster.find(preset => preset.isDefault)?.id ?? roster[0]?.id;
    const blankSession = (blank ?? session?.blank ?? false) && !running;
    const currentModel = useMemo(() => {
        if (catalog.value?.ok !== true)
            return undefined;
        for (const group of catalog.value.value.groups) {
            const model = group.models.find(row => row.id === current?.model && group.id === current.provider);
            if (model !== undefined)
                return { group, model };
        }
        return undefined;
    }, [catalog.value, current]);
    const selectModel = useCallback((provider, model, reasoningEffort) => {
        if (sessionId === undefined)
            return;
        void runtime.remote.session.selectModel({
            sessionId,
            provider,
            model,
            ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
        });
    }, [runtime, sessionId]);
    const modelRows = useMemo(() => {
        if (catalog.value?.ok !== true)
            return [];
        return catalog.value.value.groups.flatMap(group => group.models.map(model => ({
            id: `${group.id}/${model.id}`,
            label: model.name,
            detail: group.name,
            group: group.name,
            active: group.id === current?.provider && model.id === current.model,
            onSelect: () => { selectModel(group.id, model.id); },
        })));
    }, [catalog.value, current, selectModel]);
    const reasoningRows = useMemo(() => {
        const efforts = currentModel?.model.reasoning?.efforts ?? [];
        if (efforts.length === 0 || current === undefined)
            return [];
        return efforts.map(effort => ({
            id: effort.id,
            label: effort.name,
            detail: effort.description,
            active: effort.id === current.reasoningEffort,
            onSelect: () => { selectModel(current.provider, current.model, effort.id); },
        }));
    }, [currentModel, current, selectModel]);
    const selectPermission = useCallback((value) => {
        if (sessionId === undefined)
            return;
        void runtime.remote.commands.execute(sessionId, `/permission ${value}`, [])
            .then((result) => {
            if (!result.ok)
                setError(result.error.message);
        })
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); });
    }, [runtime, sessionId]);
    const selectPreset = useCallback((id) => {
        if (sessionId === undefined || !blankSession)
            return;
        void runtime.remote.agentPresets.select(sessionId, id)
            .then((result) => {
            if (!result.ok)
                setError(result.error.message);
        })
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); });
    }, [blankSession, runtime, sessionId]);
    const updateDraft = useCallback((value) => {
        if (input === undefined)
            setFallbackDraft(value);
        else
            input.setDraft(value);
    }, [input]);
    const addAttachments = useCallback((files) => {
        if (files.length === 0)
            return;
        if (input === undefined || conversation === undefined) {
            setError(t('composer.attachmentsUnavailable'));
            return;
        }
        try {
            const created = conversation.createDraftAttachments(files);
            const accepted = input.addImages(created.map(attachment => attachment.id));
            if (!accepted) {
                conversation.releaseDraftAttachments(created);
                setError(t('composer.attachmentsBusy'));
                return;
            }
            setError(undefined);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
    }, [conversation, input, t]);
    const onPaste = useCallback((event) => {
        const files = [];
        for (const item of Array.from(event.clipboardData.items)) {
            if (!item.type.startsWith('image/'))
                continue;
            const file = item.getAsFile();
            if (file !== null)
                files.push(file);
        }
        if (files.length === 0)
            return;
        event.preventDefault();
        addAttachments(files);
    }, [addAttachments]);
    const onDrop = useCallback((event) => {
        event.preventDefault();
        setDragActive(false);
        addAttachments(Array.from(event.dataTransfer.files));
    }, [addAttachments]);
    const removeAttachment = useCallback((id) => {
        if (input === undefined || conversation === undefined)
            return;
        input.removeImage(id);
        // A busy input refuses removal so the preview must remain owned by the
        // conversation service. Release only after the state accepted the edit.
        if (!input.state.getSnapshot().imageIds.includes(id))
            conversation.releaseDraftImage(id);
    }, [conversation, input]);
    const permissionRows = useMemo(() => {
        if (permissions === undefined || sessionId === undefined)
            return [];
        return permissions.options.filter(option => option.value !== 'custom').map(option => {
            const icon = permissionIcon(option.value);
            return {
                id: option.value,
                label: permissionLabel(option.value, option.name, t),
                detail: option.description,
                ...(icon === undefined ? {} : { icon }),
                active: option.value === permissions.currentValue,
                danger: option.value === FULL_ACCESS_PERMISSION,
                onSelect: () => {
                    if (option.value === permissions.currentValue)
                        return;
                    if (option.value === FULL_ACCESS_PERMISSION) {
                        setAcknowledgedFullAccess(false);
                        setConfirmingFullAccess(true);
                        return;
                    }
                    selectPermission(option.value);
                },
            };
        });
    }, [permissions, selectPermission, sessionId, t]);
    const modeRows = useMemo(() => roster.map(preset => ({
        id: preset.id,
        label: modeLabel(preset.id, preset.name ?? preset.id, t),
        detail: preset.broken ?? preset.description,
        active: preset.id === currentPreset,
        disabled: preset.broken !== undefined,
        icon: _jsx(IconAgentPresetOutline16, {}),
        onSelect: () => {
            if (preset.id !== currentPreset)
                selectPreset(preset.id);
        },
    })), [currentPreset, roster, selectPreset, t]);
    const send = useCallback((mode) => {
        if (sessionId === undefined)
            return;
        const text = draft.trim();
        if (text === '' && inputState.imageIds.length === 0)
            return;
        if (input !== undefined) {
            setError(undefined);
            input.submit(mode);
            return;
        }
        const face = runtime.binding(sessionId)?.session;
        if (face === undefined)
            return;
        setFallbackDraft('');
        drafts.delete(sessionId);
        setError(undefined);
        // A leading slash is a command line, not a prompt: routing it through the
        // commands Remote keeps the host's command lifecycle and catalog intact.
        if (text.startsWith('/')) {
            void face.command(text).then((result) => {
                if (!result.ok)
                    setError(result.error.message);
                else if (!result.value.matched)
                    setError(`unknown command: ${text.split(' ')[0] ?? text}`);
            });
            return;
        }
        const handle = face.beginSubmission({ text, images: [] });
        void face.prompt([{ type: 'text', text }], mode, undefined, handle.requestId)
            .then((result) => {
            if (!result.ok)
                setError(result.error.message);
        })
            .catch((cause) => {
            handle.abandon();
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    }, [draft, input, inputState.imageIds, runtime, sessionId]);
    const stop = useCallback(() => {
        if (sessionId === undefined)
            return;
        void runtime.binding(sessionId)?.session.cancel();
    }, [runtime, sessionId]);
    const onKeyDown = useCallback((event) => {
        if (event.key !== 'Enter' || event.shiftKey)
            return;
        if (event.nativeEvent.isComposing)
            return;
        event.preventDefault();
        const accelerated = event.metaKey || event.ctrlKey;
        const mode = !running
            ? 'queue'
            : accelerated ? oppositeBusyEnter(busyEnter) : busyEnter;
        send(mode);
    }, [busyEnter, running, send]);
    const { groups } = useWorkspaceGroups();
    const workspaceTitle = useMemo(() => {
        if (cwd !== undefined) {
            const match = groups.find(group => group.path === cwd);
            if (match)
                return match.title;
            return cwd.split(/[\\/]/).filter(Boolean).pop() || cwd;
        }
        return undefined;
    }, [groups, cwd]);
    const disabled = sessionId === undefined;
    const currentPermission = permissions?.options.find(option => option.value === permissions.currentValue);
    const currentPermissionLabel = currentPermission === undefined
        ? t('composer.permission')
        : permissionLabel(currentPermission.value, currentPermission.name, t);
    const currentPresetRow = roster.find(preset => preset.id === currentPreset);
    const currentPresetLabel = currentPreset === undefined
        ? t('composer.mode')
        : modeLabel(currentPreset, currentPresetRow?.name ?? t('composer.mode'), t);
    const permissionTriggerClass = currentPermission?.value === FULL_ACCESS_PERMISSION
        ? css.permissionDanger
        : currentPermission?.value === 'workspace-write'
            ? css.permissionWrite
            : css.permissionRead;
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dock, children: [blank && sessionId !== undefined
                        ? (_jsx("div", { className: css.headerRow, children: _jsxs("button", { type: "button", className: css.projectChip, onClick: onOpenWorkspace, title: cwd, children: [_jsx(IconFolderOpenOutline16, {}), _jsx("span", { children: workspaceTitle ?? t('nav.openWorkspace') }), _jsx(IconChevronDownOutline14, {})] }) }))
                        : null, _jsxs("div", { ref: shellRef, className: `${css.shell} ${focused ? css.shellFocused : ''} ${dragActive ? css.dropActive : ''}`, onDragEnter: event => {
                            if (event.dataTransfer.types.includes('Files'))
                                setDragActive(true);
                        }, onDragOver: event => {
                            if (event.dataTransfer.types.includes('Files'))
                                event.preventDefault();
                        }, onDragLeave: event => {
                            if (!event.currentTarget.contains(event.relatedTarget))
                                setDragActive(false);
                        }, onDrop: onDrop, children: [dragActive
                                ? (_jsxs("div", { className: css.dropOverlay, role: "status", children: [_jsx("strong", { children: t('composer.dropFiles') }), _jsx("span", { children: t('composer.dropFilesHint') })] }))
                                : null, _jsxs("div", { className: css.inputArea, children: [_jsx("textarea", { ref: inputRef, className: css.input, rows: 1, value: draft, disabled: disabled, placeholder: disabled
                                            ? t('composer.needsSession')
                                            : running ? t('composer.placeholderRunning') : t('composer.placeholder'), onChange: event => { updateDraft(event.target.value); }, onKeyDown: onKeyDown, onPaste: onPaste, "aria-label": t('composer.placeholder'), onFocus: () => { setFocused(true); }, onBlur: () => { setFocused(false); } }), _jsx(AttachmentRail, { attachments: attachments, disabled: disabled || inputState.phase !== 'plain', onRemove: removeAttachment, t: t })] }), _jsx("input", { ref: attachmentInputRef, className: css.fileInput, type: "file", multiple: true, "aria-hidden": "true", tabIndex: -1, onChange: event => {
                                    addAttachments(Array.from(event.currentTarget.files ?? []));
                                    event.currentTarget.value = '';
                                } }), error === undefined ? null : _jsx("div", { className: css.error, role: "alert", children: error }), _jsxs("div", { className: css.controls, children: [_jsxs("div", { className: css.leadingControls, children: [_jsx("button", { type: "button", className: css.attachButton, "aria-label": t('composer.addAttachment'), title: t('composer.addAttachment'), disabled: disabled || input === undefined, onClick: () => { attachmentInputRef.current?.click(); }, children: _jsx(IconPaperclipOutline16, {}) }), _jsx(Popover, { label: confirmingFullAccess ? t('composer.permission.confirmTitle') : t('composer.permission'), disabled: permissionRows.length === 0 || confirmingFullAccess, triggerClassName: `${css.controlTrigger} ${permissionTriggerClass}`, popoverClassName: css.permissionMenu, trigger: _jsxs("span", { className: css.control, children: [permissionIcon(permissions?.currentValue ?? ''), _jsx("span", { className: css.controlLabel, children: currentPermissionLabel }), _jsx(IconChevronDownOutline14, { className: css.controlChevron })] }), rows: permissionRows }), _jsx(Popover, { label: blankSession ? t('composer.mode') : t('composer.modeLocked'), disabled: !blankSession || sessionId === undefined || modeRows.length === 0, triggerClassName: `${css.controlTrigger} ${css.modeTrigger}`, trigger: _jsxs("span", { className: css.control, children: [_jsx(IconAgentPresetOutline16, {}), _jsx("span", { className: css.controlLabel, children: currentPresetLabel }), _jsx(IconChevronDownOutline14, { className: css.controlChevron })] }), rows: modeRows })] }), _jsxs("div", { className: css.trailingControls, children: [_jsx(Popover, { label: t('composer.model'), disabled: modelRows.length === 0, align: "end", triggerClassName: `${css.controlTrigger} ${css.modelTrigger}`, popoverClassName: css.modelMenu, trigger: _jsxs("span", { className: css.control, children: [_jsx("span", { className: css.controlLabel, children: currentModel === undefined
                                                                ? t('composer.model')
                                                                : `${currentModel.model.name} · ${currentModel.group.name}` }), _jsx(IconChevronDownOutline14, { className: css.controlChevron })] }), rows: modelRows }), _jsx(Popover, { label: t('composer.reasoning'), disabled: reasoningRows.length === 0, align: "end", triggerClassName: `${css.controlTrigger} ${css.reasoningTrigger}`, trigger: _jsxs("span", { className: css.control, children: [_jsx(IconThinkOutline16, {}), _jsx("span", { className: css.controlLabel, children: reasoningRows.find(row => row.active)?.label ?? t('composer.reasoningDefault') }), _jsx(IconChevronDownOutline14, { className: css.controlChevron })] }), rows: reasoningRows }), _jsx(ContextMeter, { sessionId: sessionId }), running
                                                ? (_jsx("button", { type: "button", className: `${css.send} ${css.stop}`, onClick: stop, "aria-label": t('composer.stop'), children: _jsx(IconStopFill16, {}) }))
                                                : (_jsx("button", { type: "button", className: css.send, onClick: () => { send('queue'); }, disabled: disabled || (draft.trim() === '' && inputState.imageIds.length === 0), "aria-label": t('composer.send'), children: _jsx(IconSendOutline16, {}) }))] })] })] })] }), _jsx(RiskConfirmation, { open: confirmingFullAccess, title: t('composer.permission.confirmTitle'), description: t('composer.permission.confirmBody'), acknowledgeLabel: t('composer.permission.confirmAcknowledge'), cancelLabel: t('common.cancel'), closeLabel: t('common.close'), confirmLabel: t('composer.permission.confirm'), acknowledged: acknowledgedFullAccess, onAcknowledgedChange: setAcknowledgedFullAccess, onCancel: () => {
                    setAcknowledgedFullAccess(false);
                    setConfirmingFullAccess(false);
                }, onConfirm: () => {
                    if (!acknowledgedFullAccess)
                        return;
                    setAcknowledgedFullAccess(false);
                    setConfirmingFullAccess(false);
                    selectPermission(FULL_ACCESS_PERMISSION);
                } })] }));
}
//# sourceMappingURL=Composer.js.map