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
import { IconAgentPresetOutline16, IconChevronDownOutline14, IconCloseFill14, IconPaperclipOutline16, IconPlusOutline16, IconSendOutline16, IconStopFill16, RiskConfirmation, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useAsync, useObservable, useProjectionValue, useSessionInput, useSessionList, useSessionSnapshot, } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { Popover } from "./ui.js";
import { ModelSelect } from "./ModelSelect.js";
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
        case 'crew': return t('composer.mode.crew');
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
/** Shield variants make the active access level legible without relying on color. */
function permissionIcon(value) {
    return (_jsxs("svg", { viewBox: "0 0 16 16", fill: "none", "aria-hidden": true, children: [_jsx("path", { d: "M8 1.5 13 3.4v3.8c0 3.1-1.9 5.8-5 7.3-3.1-1.5-5-4.2-5-7.3V3.4z", stroke: "currentColor", strokeWidth: "1.35", strokeLinejoin: "round" }), value === 'read-only' ? _jsx("path", { d: "m5.5 7.8 1.5 1.5 3.4-3.4", stroke: "currentColor", strokeWidth: "1.35", strokeLinecap: "round", strokeLinejoin: "round" }) : null, value === 'workspace-write' ? _jsx("path", { d: "m5.5 9.9.3-1.7 3.7-3.7 1.2 1.2L7 9.4z", stroke: "currentColor", strokeWidth: "1.15", strokeLinecap: "round", strokeLinejoin: "round" }) : null, value === FULL_ACCESS_PERMISSION ? _jsx("path", { d: "M8 5v3.5m0 2v.1", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }) : null] }));
}
/** Cmd/Ctrl+Enter flips the configured busy behavior. */
function oppositeBusyEnter(value) {
    return value === 'queue' ? 'steer' : 'queue';
}
/** Draft text per session, so switching tasks does not lose an unsent prompt. */
const drafts = new Map();
/** A leading, argument-free slash token is eligible for command completion. */
function slashQuery(value) {
    const match = /^\/([^\s]*)$/.exec(value);
    return match?.[1]?.toLocaleLowerCase();
}
/** Canonical `@[label](dsh-session:<id>)` mention the host session-reference resolver accepts. */
function sessionMention(label, id) {
    const escaped = label.replace(/[\\\]]/g, match => `\\${match}`);
    const payload = JSON.stringify(id);
    const bytes = new TextEncoder().encode(payload);
    let binary = '';
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    const base64 = window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `@[${escaped}](dsh-session:${base64})`;
}
function fileSize(bytes) {
    if (bytes < 1_024)
        return `${String(bytes)} B`;
    if (bytes < 1_024 * 1_024)
        return `${(bytes / 1_024).toFixed(1)} KB`;
    return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
}
/** The unfinished @ token immediately before the caret, if one exists. */
function referenceQuery(value, caret) {
    const match = /(?:^|\s)@([^\s@]*)$/.exec(value.slice(0, caret));
    return match?.[1];
}
/** Resolve a selected or dropped local path through the desktop bridge. */
function filePathInfo(file) {
    const desktop = globalThis.deepSeekDesktop;
    const resolved = desktop?.getPathInfoForFile?.(file);
    if (resolved?.path !== undefined && resolved.path !== '')
        return resolved;
    const relativePath = file.webkitRelativePath;
    return relativePath === undefined || relativePath === ''
        ? undefined
        : { path: relativePath, isDirectory: false };
}
function fileMention(info) {
    const path = info.isDirectory && !/[\\/]$/.test(info.path) ? `${info.path}/` : info.path;
    return /\s/.test(path) ? `@"${path}"` : `@${path}`;
}
function fileKind(name) {
    const extension = name.split('.').pop()?.toLocaleLowerCase();
    if (extension !== undefined && ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension))
        return 'archive';
    if (extension !== undefined && ['js', 'jsx', 'ts', 'tsx', 'json', 'css', 'html', 'py', 'rs', 'go'].includes(extension))
        return 'code';
    if (extension !== undefined && ['pdf', 'doc', 'docx', 'md', 'txt', 'rtf'].includes(extension))
        return 'document';
    return 'generic';
}
/** Small, dependency-free file glyphs keep non-image attachments recognizable. */
function FileGlyph({ name }) {
    const kind = fileKind(name);
    return (_jsx("span", { className: `${css.fileGlyph} ${css[`fileGlyph_${kind}`]}`, "aria-hidden": true, children: _jsxs("svg", { viewBox: "0 0 16 16", children: [_jsx("path", { d: "M4 1.75h5l3 3V14.25H4z" }), _jsx("path", { d: "M9 1.75v3h3" }), kind === 'archive' ? _jsx("path", { d: "M7 4h2M7 6h2M7 8h2M7 10h2" }) : null, kind === 'code' ? _jsx("path", { d: "m7 7-2 1.5L7 10m2-3 2 1.5L9 10" }) : null, kind === 'document' ? _jsx("path", { d: "M6 7h4M6 9h4M6 11h3" }) : null, kind === 'generic' ? _jsx("path", { d: "M6 8h4M6 10h4" }) : null] }) }));
}
/** The DCode attachment strip: compact previews, with the same token rhythm as the composer. */
function AttachmentRail(props) {
    if (props.attachments.length === 0)
        return null;
    return (_jsx("div", { className: css.attachmentRail, "aria-label": props.t('composer.attachments'), children: props.attachments.map(attachment => (_jsxs("div", { className: css.attachment, children: [attachment.kind === 'image'
                    ? _jsx("img", { className: css.attachmentPreview, src: attachment.previewUrl, alt: attachment.file.name || props.t('composer.attachmentFile') })
                    : (_jsxs("span", { className: css.attachmentFile, title: attachment.file.name, children: [_jsx(FileGlyph, { name: attachment.file.name }), _jsx("span", { children: attachment.file.name || props.t('composer.attachmentFile') })] })), _jsx("span", { className: css.attachmentMeta, children: fileSize(attachment.file.size) }), _jsx("button", { type: "button", className: css.attachmentRemove, "aria-label": `${props.t('composer.removeAttachment')}: ${attachment.file.name || props.t('composer.attachmentFile')}`, disabled: props.disabled, onClick: () => { props.onRemove(attachment.id); }, children: _jsx(IconCloseFill14, {}) })] }, attachment.id))) }));
}
/** Prompt entry and the session controls. */
export function Composer({ sessionId, blank, cwd, onOpenWorkspace, readiness, onSelectModel, onConfigureProvider, modelSelectRef, onReferenceQueryChange }) {
    const runtime = useRuntime();
    const t = useT();
    const session = useSessionSnapshot(sessionId);
    const { input, state: inputState } = useSessionInput(sessionId);
    const permissions = useProjectionValue(sessionId, 'permissions');
    const agentPreset = useProjectionValue(sessionId, 'agentPreset');
    const busyEnter = useObservable(runtime.busyEnter, 'queue');
    const [fallbackDraft, setFallbackDraft] = useState('');
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState(undefined);
    const [readinessIssue, setReadinessIssue] = useState();
    const [dragActive, setDragActive] = useState(false);
    const [commandIndex, setCommandIndex] = useState(0);
    const [commandMenuDismissed, setCommandMenuDismissed] = useState(false);
    const [activeReferenceQuery, setActiveReferenceQuery] = useState(undefined);
    const [referenceIndex, setReferenceIndex] = useState(0);
    const [referenceFiles, setReferenceFiles] = useState([]);
    const [contextPills, setContextPills] = useState([]);
    const [queueEditing, setQueueEditing] = useState(false);
    const [queueDraft, setQueueDraft] = useState('');
    const [queueBusy, setQueueBusy] = useState(false);
    const [confirmingFullAccess, setConfirmingFullAccess] = useState(false);
    const [acknowledgedFullAccess, setAcknowledgedFullAccess] = useState(false);
    const inputRef = useRef(null);
    const shellRef = useRef(null);
    const attachmentInputRef = useRef(null);
    const conversation = runtime.conversation;
    const draft = input === undefined ? fallbackDraft : inputState.draft;
    const attachments = useMemo(() => conversation?.draftImages(inputState.imageIds) ?? [], [conversation, inputState.imageIds]);
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
        setReadinessIssue(undefined);
        setActiveReferenceQuery(undefined);
        setContextPills([]);
        setQueueEditing(false);
        previousSession.current = sessionId;
    }, [sessionId]);
    useEffect(() => {
        if (readinessIssue === 'model' && readiness?.model === 'ready')
            setReadinessIssue(undefined);
        if (readinessIssue === 'credential' && readiness?.credential === 'ready')
            setReadinessIssue(undefined);
    }, [readiness, readinessIssue]);
    useEffect(() => {
        onReferenceQueryChange?.(activeReferenceQuery);
    }, [activeReferenceQuery, onReferenceQueryChange]);
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
    const presets = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
    const commandCatalog = useAsync(async () => (sessionId === undefined ? undefined : await runtime.remote.commands.list(sessionId)), [runtime, sessionId]);
    const skillCatalog = useAsync(async () => (sessionId === undefined ? undefined : await runtime.remote.skills.list({ sessionId }, new AbortController().signal)), [runtime, sessionId]);
    const running = session?.running === true;
    const roster = presets.value?.ok === true ? presets.value.value.presets : [];
    const currentPreset = agentPreset ?? roster.find(preset => preset.isDefault)?.id ?? roster[0]?.id;
    const blankSession = (blank ?? session?.blank ?? false) && !running;
    const commandQuery = slashQuery(draft);
    const commands = commandCatalog.value?.ok === true ? commandCatalog.value.value : [];
    const commandMatches = useMemo(() => {
        if (commandQuery === undefined)
            return [];
        return commands
            .filter(command => command.name.toLocaleLowerCase().includes(commandQuery))
            .sort((left, right) => {
            const leftPrefix = left.name.toLocaleLowerCase().startsWith(commandQuery);
            const rightPrefix = right.name.toLocaleLowerCase().startsWith(commandQuery);
            if (leftPrefix !== rightPrefix)
                return leftPrefix ? -1 : 1;
            return left.name.localeCompare(right.name);
        });
    }, [commandQuery, commands]);
    const commandMenuOpen = focused && !commandMenuDismissed && commandMatches.length > 0;
    useEffect(() => {
        if (sessionId === undefined || activeReferenceQuery === undefined) {
            setReferenceFiles([]);
            return undefined;
        }
        const controller = new AbortController();
        void runtime.remote.fileReferences.list(sessionId, activeReferenceQuery, controller.signal).then((result) => {
            if (result.ok)
                setReferenceFiles(result.value);
        }).catch(() => { setReferenceFiles([]); });
        return () => { controller.abort(); };
    }, [activeReferenceQuery, runtime, sessionId]);
    const sessionList = useSessionList();
    const referenceItems = useMemo(() => {
        if (activeReferenceQuery === undefined)
            return [];
        const query = activeReferenceQuery.toLocaleLowerCase();
        const sessionItems = sessionList.ids
            .filter(id => id !== sessionId)
            .map(id => sessionList.byId[id])
            .filter((row) => row !== undefined)
            .filter(row => row.displayTitle.toLocaleLowerCase().includes(query))
            .slice(0, 6)
            .map(row => ({
            id: `session:${row.id}`,
            kind: 'session',
            label: row.displayTitle,
            detail: t('composer.referenceSession'),
            value: sessionMention(row.displayTitle, row.id),
        }));
        const files = referenceFiles.slice(0, 12).map(file => {
            const path = file.kind === 'directory' ? `${file.path.replace(/\/$/, '')}/` : file.path;
            const mention = /\s/.test(path) ? `@"${path}"` : `@${path}`;
            return {
                id: `file:${path}`,
                kind: 'file',
                label: path,
                detail: t(file.kind === 'directory' ? 'composer.referenceDirectory' : 'composer.referenceFile'),
                value: mention,
            };
        });
        const skills = skillCatalog.value?.ok === true ? skillCatalog.value.value.skills : [];
        const skillItems = skills
            .filter(skill => skill.name.toLocaleLowerCase().includes(query))
            .slice(0, 8)
            .map(skill => ({ id: `skill:${skill.name}`, kind: 'skill', label: skill.name, detail: skill.description, value: `/${skill.name}` }));
        const commandItems = commands
            .filter(command => command.name.toLocaleLowerCase().includes(query))
            .slice(0, 8)
            .map(command => ({ id: `command:${command.name}`, kind: 'command', label: command.name, detail: command.description, value: `/${command.name}` }));
        return [...sessionItems, ...files, ...skillItems, ...commandItems];
    }, [activeReferenceQuery, commands, referenceFiles, sessionId, sessionList, skillCatalog.value, t]);
    const referenceMenuOpen = focused && activeReferenceQuery !== undefined && referenceItems.length > 0;
    useEffect(() => {
        setCommandIndex(0);
    }, [commandQuery, sessionId]);
    useEffect(() => { setReferenceIndex(0); }, [activeReferenceQuery, sessionId]);
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
        setCommandMenuDismissed(false);
        if (input === undefined)
            setFallbackDraft(value);
        else
            input.setDraft(value);
    }, [input]);
    const captureReference = useCallback((value, caret) => {
        setActiveReferenceQuery(referenceQuery(value, caret ?? value.length));
    }, []);
    const chooseReference = useCallback((item) => {
        const textarea = inputRef.current;
        const caret = textarea?.selectionStart ?? draft.length;
        const query = referenceQuery(draft, caret);
        if (query === undefined)
            return;
        const start = caret - query.length - 1;
        const next = `${draft.slice(0, start)}${item.value} ${draft.slice(caret)}`;
        updateDraft(next);
        setContextPills(current => current.some(pill => pill.id === item.id) ? current : [...current, item]);
        setActiveReferenceQuery(undefined);
        requestAnimationFrame(() => {
            const target = inputRef.current;
            if (target === null)
                return;
            const nextCaret = start + item.value.length + 1;
            target.focus();
            target.setSelectionRange(nextCaret, nextCaret);
        });
    }, [draft, updateDraft]);
    const removeContextPill = useCallback((pill) => {
        const index = draft.indexOf(pill.value);
        if (index >= 0) {
            const end = index + pill.value.length + (draft[index + pill.value.length] === ' ' ? 1 : 0);
            updateDraft(`${draft.slice(0, index)}${draft.slice(end)}`);
        }
        setContextPills(current => current.filter(candidate => candidate.id !== pill.id));
        requestAnimationFrame(() => { inputRef.current?.focus(); });
    }, [draft, updateDraft]);
    const completeCommand = useCallback((command) => {
        updateDraft(`/${command.name}${command.input === undefined ? '' : ' '}`);
        setCommandMenuDismissed(true);
        requestAnimationFrame(() => {
            const textarea = inputRef.current;
            if (textarea === null)
                return;
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });
    }, [updateDraft]);
    const addRows = useMemo(() => [
        {
            id: 'files-and-folders',
            group: t('composer.add'),
            label: t('composer.filesAndFolders'),
            icon: _jsx(IconPaperclipOutline16, {}),
            onSelect: () => { attachmentInputRef.current?.click(); },
        },
        ...commands.map(command => ({
            id: `command:${command.name}`,
            group: t('composer.commandList'),
            label: (_jsxs("span", { className: css.addCommandLabel, children: [_jsx("span", { className: css.addCommandName, children: command.name }), _jsx("span", { className: css.addCommandDescription, children: command.description })] })),
            onSelect: () => { completeCommand(command); },
        })),
    ], [commands, completeCommand, t]);
    const addAttachments = useCallback((files) => {
        if (files.length === 0)
            return;
        if (input === undefined || conversation === undefined) {
            setError(t('composer.attachmentsUnavailable'));
            return;
        }
        try {
            const created = conversation.createDraftImages(files);
            const accepted = input.addImages(created.map(attachment => attachment.id));
            if (!accepted) {
                conversation.releaseDraftImages(created);
                setError(t('composer.attachmentsBusy'));
                return;
            }
            setError(undefined);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
    }, [conversation, input, t]);
    const addSelectedFiles = useCallback((files) => {
        if (files.length === 0)
            return;
        const entries = files.map(file => ({ file, info: filePathInfo(file) }));
        const pathEntries = entries.filter((entry) => entry.info !== undefined);
        const imageFallbacks = entries
            .filter(entry => entry.info === undefined && entry.file.type.startsWith('image/'))
            .map(entry => entry.file);
        const unresolvedFiles = entries.filter(entry => entry.info === undefined && !entry.file.type.startsWith('image/'));
        if (imageFallbacks.length > 0)
            addAttachments(imageFallbacks);
        if (pathEntries.length === 0) {
            if (unresolvedFiles.length > 0)
                setError(t('composer.filePathUnavailable'));
            return;
        }
        const existing = new Set(contextPills.map(pill => pill.value));
        const selected = pathEntries
            .map(entry => {
            const value = fileMention(entry.info);
            return {
                id: `selected-file:${entry.info.path}`,
                kind: 'file',
                label: entry.info.path,
                detail: t(entry.info.isDirectory ? 'composer.referenceDirectory' : 'composer.referenceFile'),
                value,
            };
        })
            .filter(item => {
            if (existing.has(item.value))
                return false;
            existing.add(item.value);
            return true;
        });
        if (selected.length === 0) {
            if (unresolvedFiles.length > 0)
                setError(t('composer.filePathUnavailable'));
            return;
        }
        const textarea = inputRef.current;
        const caret = textarea?.selectionStart ?? draft.length;
        const before = draft.slice(0, caret);
        const after = draft.slice(caret);
        const prefix = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
        const inserted = selected.map(item => item.value).join(' ');
        const suffix = after.length === 0 || !/^\s/.test(after) ? ' ' : '';
        updateDraft(`${before}${prefix}${inserted}${suffix}${after}`);
        setContextPills(current => [
            ...current,
            ...selected.filter(item => !current.some(pill => pill.value === item.value)),
        ]);
        setActiveReferenceQuery(undefined);
        if (unresolvedFiles.length > 0)
            setError(t('composer.filePathUnavailable'));
        else
            setError(undefined);
        requestAnimationFrame(() => {
            const target = inputRef.current;
            if (target === null)
                return;
            const nextCaret = caret + prefix.length + inserted.length + suffix.length;
            target.focus();
            target.setSelectionRange(nextCaret, nextCaret);
        });
    }, [addAttachments, contextPills, draft, t, updateDraft]);
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
        addSelectedFiles(Array.from(event.dataTransfer.files));
    }, [addSelectedFiles]);
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
                icon,
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
        if (!text.startsWith('/') && readiness?.model === 'missing') {
            setReadinessIssue('model');
            return;
        }
        if (!text.startsWith('/') && readiness?.credential === 'missing') {
            setReadinessIssue('credential');
            return;
        }
        if (input !== undefined) {
            setError(undefined);
            setActiveReferenceQuery(undefined);
            input.submit(mode);
            return;
        }
        const face = runtime.binding(sessionId)?.session;
        if (face === undefined)
            return;
        setFallbackDraft('');
        drafts.delete(sessionId);
        setError(undefined);
        setActiveReferenceQuery(undefined);
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
    }, [draft, input, inputState.imageIds, readiness, runtime, sessionId]);
    const stop = useCallback(() => {
        if (sessionId === undefined)
            return;
        void runtime.binding(sessionId)?.session.cancel();
    }, [runtime, sessionId]);
    const onKeyDown = useCallback((event) => {
        if (referenceMenuOpen) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                setReferenceIndex(index => (index + direction + referenceItems.length) % referenceItems.length);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                setActiveReferenceQuery(undefined);
                return;
            }
            if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
                if (event.nativeEvent.isComposing)
                    return;
                event.preventDefault();
                const item = referenceItems[referenceIndex];
                if (item !== undefined)
                    chooseReference(item);
                return;
            }
        }
        if (event.key === 'Backspace' && contextPills.length > 0 && draft.trim() === contextPills.at(-1)?.value) {
            event.preventDefault();
            const pill = contextPills.at(-1);
            if (pill !== undefined)
                removeContextPill(pill);
            return;
        }
        if (commandMenuOpen) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                setCommandIndex(index => (index + direction + commandMatches.length) % commandMatches.length);
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                setCommandMenuDismissed(true);
                return;
            }
            if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
                if (event.nativeEvent.isComposing)
                    return;
                event.preventDefault();
                const command = commandMatches[commandIndex];
                if (command !== undefined)
                    completeCommand(command);
                return;
            }
        }
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
    }, [busyEnter, chooseReference, commandIndex, commandMatches, commandMenuOpen, completeCommand, contextPills, draft, referenceIndex, referenceItems, referenceMenuOpen, removeContextPill, running, send]);
    const disabled = sessionId === undefined;
    const compact = draft.trim() === '' && attachments.length === 0 && error === undefined;
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
    const queued = useMemo(() => (session?.queue ?? []).filter(item => item.placement === 'queued'), [session?.queue]);
    const firstQueued = queued[0];
    const updateQueued = (action) => {
        if (sessionId === undefined || firstQueued === undefined || queueBusy)
            return;
        const face = runtime.binding(sessionId)?.session;
        if (face === undefined)
            return;
        setQueueBusy(true);
        void face.updateQueue(firstQueued.id, action).then((result) => {
            if (!result.ok)
                setError(result.error.message);
            else
                setQueueEditing(false);
        }).catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setQueueBusy(false); });
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dock, children: [blank && sessionId !== undefined
                        ? (_jsxs("div", { className: css.headerRow, children: [cwd === undefined
                                    ? (_jsx("button", { type: "button", className: css.projectChip, onClick: onOpenWorkspace, children: _jsx("span", { children: t('nav.openWorkspace') }) }))
                                    : null, _jsx(Popover, { label: t('composer.mode'), disabled: modeRows.length === 0, triggerClassName: css.headerChip, trigger: (_jsxs("span", { className: css.headerChipContent, children: [_jsx(IconAgentPresetOutline16, {}), _jsx("span", { children: currentPresetLabel }), _jsx(IconChevronDownOutline14, {})] })), rows: modeRows })] }))
                        : null, running && queued.length > 0
                        ? (_jsxs("div", { className: css.queueBanner, role: "status", children: [_jsxs("span", { className: css.queueCount, children: [t('chat.queued'), ": ", queued.length] }), queueEditing
                                    ? (_jsx("input", { className: css.queueEdit, value: queueDraft, autoFocus: true, "aria-label": t('chat.editQueued'), onChange: event => { setQueueDraft(event.target.value); }, onKeyDown: event => {
                                            if (event.key === 'Escape')
                                                setQueueEditing(false);
                                            if (event.key === 'Enter' && queueDraft.trim() !== '')
                                                updateQueued({ kind: 'edit', content: [{ type: 'text', text: queueDraft.trim() }] });
                                        } }))
                                    : _jsx("span", { className: css.queuePreview, children: firstQueued?.text ?? firstQueued?.preview }), _jsxs("span", { className: css.queueButtons, children: [queueEditing
                                            ? _jsx("button", { type: "button", disabled: queueBusy || queueDraft.trim() === '', onClick: () => { updateQueued({ kind: 'edit', content: [{ type: 'text', text: queueDraft.trim() }] }); }, children: t('chat.saveQueued') })
                                            : _jsx("button", { type: "button", disabled: queueBusy || firstQueued?.text === null, onClick: () => { setQueueDraft(firstQueued?.text ?? firstQueued?.preview ?? ''); setQueueEditing(true); }, children: t('chat.editQueued') }), _jsx("button", { type: "button", disabled: queueBusy, onClick: () => { updateQueued({ kind: 'remove' }); }, children: t('chat.removeQueued') }), _jsx("button", { type: "button", disabled: queueBusy || firstQueued?.placement !== 'queued', onClick: () => { updateQueued({ kind: 'steer' }); }, children: t('chat.steerQueued') })] })] }))
                        : null, _jsxs("div", { ref: shellRef, className: `${css.shell} ${compact ? css.shellCompact : css.shellExpanded} ${focused ? css.shellFocused : ''} ${activeReferenceQuery === undefined ? '' : css.referenceActive} ${dragActive ? css.dropActive : ''}`, onDragEnter: event => {
                            if (event.dataTransfer.types.includes('Files'))
                                setDragActive(true);
                        }, onDragOver: event => {
                            if (event.dataTransfer.types.includes('Files'))
                                event.preventDefault();
                        }, onDragLeave: event => {
                            if (!event.currentTarget.contains(event.relatedTarget))
                                setDragActive(false);
                        }, onDrop: onDrop, children: [dragActive
                                ? (_jsxs("div", { className: css.dropOverlay, role: "status", children: [_jsx("span", { className: css.dropIcon, children: _jsx(IconPaperclipOutline16, {}) }), _jsx("strong", { children: t('composer.dropFiles') }), _jsx("span", { children: t('composer.dropFilesHint') })] }))
                                : null, _jsxs("div", { className: css.inputArea, children: [referenceMenuOpen
                                        ? (_jsx("div", { id: "composer-reference-list", className: css.referenceMenu, role: "listbox", "aria-label": t('composer.contextReferences'), children: referenceItems.map((item, index) => {
                                                const previous = referenceItems[index - 1];
                                                return (_jsxs("div", { className: css.referenceRow, children: [previous?.kind === item.kind
                                                            ? null
                                                            : _jsx("div", { className: css.referenceGroup, children: item.kind === 'file' ? t('composer.workspaceFiles') : item.kind === 'session' ? t('composer.referenceSessions') : item.kind === 'skill' ? t('composer.skills') : t('composer.commands') }), _jsxs("button", { type: "button", id: `composer-reference-${String(index)}`, className: `${css.referenceOption} ${index === referenceIndex ? css.referenceOptionActive : ''}`, role: "option", "aria-selected": index === referenceIndex, onMouseEnter: () => { setReferenceIndex(index); }, onMouseDown: event => { event.preventDefault(); }, onClick: () => { chooseReference(item); }, children: [_jsx("span", { className: css.referenceKind, "aria-hidden": true, children: item.kind === 'file' ? '▧' : item.kind === 'session' ? '◎' : item.kind === 'skill' ? '✦' : '/' }), _jsx("span", { className: css.referenceLabel, children: item.label }), item.detail === undefined ? null : _jsx("span", { className: css.referenceDetail, children: item.detail })] })] }, item.id));
                                            }) }))
                                        : null, commandMenuOpen
                                        ? (_jsxs("div", { id: "composer-command-list", className: css.commandMenu, role: "listbox", "aria-label": t('composer.commands'), children: [_jsx("div", { className: css.commandMenuTitle, children: t('composer.commands') }), commandMatches.map((command, index) => (_jsxs("button", { type: "button", id: `composer-command-${command.name}`, className: `${css.commandOption} ${index === commandIndex ? css.commandOptionActive : ''}`, role: "option", "aria-selected": index === commandIndex, onMouseEnter: () => { setCommandIndex(index); }, onMouseDown: event => { event.preventDefault(); }, onClick: () => { completeCommand(command); }, children: [_jsxs("span", { className: css.commandName, children: ["/", command.name] }), _jsx("span", { className: css.commandDescription, children: command.description }), command.input === undefined ? null : _jsx("span", { className: css.commandHint, children: command.input.hint })] }, command.name)))] }))
                                        : null, contextPills.length === 0
                                        ? null
                                        : (_jsx("div", { className: css.contextPills, "aria-label": t('composer.selectedContext'), children: contextPills.map(pill => (_jsxs("span", { className: css.contextPill, children: [_jsx("span", { "aria-hidden": true, children: pill.kind === 'file' ? '▧' : pill.kind === 'session' ? '◎' : pill.kind === 'skill' ? '✦' : '/' }), _jsx("span", { children: pill.label }), _jsx("button", { type: "button", "aria-label": t('composer.removeContext', { name: pill.label }), onClick: () => { removeContextPill(pill); }, children: _jsx(IconCloseFill14, {}) })] }, pill.id))) })), _jsx("textarea", { ref: inputRef, className: css.input, rows: 1, value: draft, disabled: disabled, placeholder: disabled
                                            ? t('composer.needsSession')
                                            : t('composer.placeholder'), onChange: event => {
                                            updateDraft(event.target.value);
                                            captureReference(event.target.value, event.target.selectionStart);
                                        }, onSelect: event => { captureReference(event.currentTarget.value, event.currentTarget.selectionStart); }, onKeyDown: onKeyDown, onPaste: onPaste, "aria-label": t('composer.placeholder'), "aria-autocomplete": "list", "aria-expanded": referenceMenuOpen || commandMenuOpen, "aria-controls": referenceMenuOpen ? 'composer-reference-list' : commandMenuOpen ? 'composer-command-list' : undefined, "aria-activedescendant": referenceMenuOpen
                                            ? `composer-reference-${String(referenceIndex)}`
                                            : commandMenuOpen ? `composer-command-${commandMatches[commandIndex]?.name ?? ''}` : undefined, onFocus: () => { setFocused(true); }, onBlur: () => { setFocused(false); } }), _jsx(AttachmentRail, { attachments: attachments, disabled: disabled || inputState.phase !== 'plain', onRemove: removeAttachment, t: t })] }), _jsx("input", { ref: attachmentInputRef, className: css.fileInput, type: "file", multiple: true, "aria-hidden": "true", tabIndex: -1, onChange: event => {
                                    addSelectedFiles(Array.from(event.currentTarget.files ?? []));
                                    event.currentTarget.value = '';
                                } }), readinessIssue === undefined
                                ? null
                                : (_jsxs("div", { className: css.readinessIssue, role: "alert", children: [_jsx("span", { children: readinessIssue === 'model' ? t('readiness.inlineModel') : t('readiness.inlineCredential') }), _jsx("button", { type: "button", onClick: readinessIssue === 'model' ? onSelectModel : onConfigureProvider, children: readinessIssue === 'model' ? t('readiness.selectModel') : t('readiness.configureKey') })] })), error === undefined ? null : _jsx("div", { className: css.error, role: "alert", children: error }), _jsxs("div", { className: css.controls, children: [_jsxs("div", { className: css.leadingControls, children: [_jsx(Popover, { label: t('composer.add'), disabled: disabled, triggerClassName: css.addButton, popoverClassName: css.addMenu, trigger: _jsx(IconPlusOutline16, {}), rows: addRows }), _jsx(Popover, { label: confirmingFullAccess ? t('composer.permission.confirmTitle') : t('composer.permission'), disabled: permissionRows.length === 0 || confirmingFullAccess, triggerClassName: `${css.controlTrigger} ${css.securityPermission} ${permissionTriggerClass}`, popoverClassName: css.permissionMenu, trigger: _jsxs("span", { className: css.control, children: [permissionIcon(permissions?.currentValue ?? ''), _jsx("span", { className: css.controlLabel, children: currentPermissionLabel }), _jsx(IconChevronDownOutline14, { className: css.controlChevron })] }), rows: permissionRows })] }), _jsxs("div", { className: css.trailingControls, "data-dcode-model-select": "", children: [_jsx(ModelSelect, { ref: modelSelectRef, sessionId: sessionId, disabled: disabled }), running
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