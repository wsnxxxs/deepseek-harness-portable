import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * DCode-native Inspector content for the DCode workbench.
 *
 * The component hierarchy follows the DCode Plan / Subagents stack, but each
 * row is backed by an existing DSH source: projections, Session Controller
 * catalogs, and the child conversation feed.
 * @module @dsh-portable/dcode-ui/client/shell/AgentInspector
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconCheckOutline14, IconChevronLeftOutline14, IconChevronRightOutline14, IconCloseOutline16, IconRefreshOutline14, IconSparkle16, IconUserOutline16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useChatSnapshot, useConversationBlank, useProjectionValue, useSessionList, useSessionSnapshot } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useRuntime } from "../state/runtime.js";
import { formatToolDuration, messageText, resultText } from "../chat/tools.js";
import { Transcript } from "../chat/Transcript.js";
import { Button, CopyButton, EmptyState, IconButton, Pill, Spinner, ui } from "./ui.js";
import { useModalFocus } from "./use-modal-focus.js";
import css from './AgentInspector.module.css';
function elapsedMs(timing, activity, now) {
    if (timing === undefined)
        return undefined;
    if (timing.active === undefined)
        return timing.settledMs;
    return timing.settledMs + Math.max(0, (activity === 'running' ? now : timing.active.through) - timing.active.since);
}
function entryLabel(entry) {
    return entry.label?.trim() || String(entry.id);
}
function SubagentRow({ entry, selected, onSelect, }) {
    const t = useT();
    const session = useSessionSnapshot(entry.id);
    const timing = useProjectionValue(entry.id, 'subagentTiming');
    const [now, setNow] = useState(Date.now);
    const running = entry.activity === 'running' || session?.running === true;
    const duration = elapsedMs(timing, running ? 'running' : 'inactive', now);
    useEffect(() => {
        if (!running || timing?.active === undefined)
            return undefined;
        const timer = window.setInterval(() => { setNow(Date.now()); }, 1000);
        return () => { window.clearInterval(timer); };
    }, [running, timing?.active]);
    return (_jsxs("button", { type: "button", className: `${css.agentRow} ${selected ? css.agentRowActive : ''}`, onClick: onSelect, title: t('agents.open'), children: [_jsx("span", { className: `${css.agentStatus} ${running ? css.agentStatusRunning : css.agentStatusIdle}`, "aria-hidden": true, children: running ? _jsx(Spinner, { size: "sm" }) : session?.lastAgentError ? _jsx(IconWarningOutline16, {}) : _jsx(IconCheckOutline14, {}) }), _jsxs("span", { className: css.agentCopy, children: [_jsx("span", { className: css.agentName, children: entryLabel(entry) }), _jsxs("span", { className: css.agentMeta, children: [running ? t('agents.running') : session?.lastAgentError ? t('agents.executionError') : t('agents.inactive'), _jsx("span", { "aria-hidden": true, children: "\u00B7" }), entry.mode === 'continuable' ? t('agents.continuable') : t('agents.oneShot'), entry.hasChildren ? _jsxs(_Fragment, { children: [_jsx("span", { "aria-hidden": true, children: "\u00B7" }), t('agents.children', { count: 1 })] }) : null] })] }), duration === undefined ? null : _jsx("span", { className: css.agentDuration, children: formatToolDuration(duration) }), _jsx(IconChevronRightOutline14, { className: css.rowChevron })] }));
}
/** DCode's Subagents section over Session Controller's live direct-child catalog. */
export function SubagentsPanel({ sessionId, selectedId, onSelect, }) {
    const runtime = useRuntime();
    const t = useT();
    const list = useSessionList();
    const [open, setOpen] = useState(true);
    const catalog = sessionId === undefined ? undefined : list.subagentsByParent[sessionId];
    useEffect(() => {
        if (sessionId === undefined)
            return undefined;
        runtime.sessions.setSubagentCatalogOpen(sessionId, true);
        return () => { runtime.sessions.setSubagentCatalogOpen(sessionId, false); };
    }, [runtime, sessionId]);
    const refresh = useCallback(() => {
        if (sessionId !== undefined)
            void runtime.sessions.refreshSubagents(sessionId);
    }, [runtime, sessionId]);
    const entries = catalog?.entries ?? [];
    const children = entries.filter((entry) => entry.kind === 'child');
    const diagnostics = entries.filter(entry => entry.kind === 'diagnostic');
    const running = children.filter(entry => entry.activity === 'running').length;
    return (_jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHeader, children: [_jsxs("button", { type: "button", className: css.sectionToggle, "aria-expanded": open, onClick: () => { setOpen(value => !value); }, children: [_jsx(IconChevronRightOutline14, { className: open ? css.chevronOpen : undefined }), _jsx(IconUserOutline16, {}), _jsx("span", { className: ui.grow, children: t('agents.title') }), running === 0 ? null : _jsxs("span", { className: css.runningPill, children: [t('agents.running'), " ", running] }), _jsx(Pill, { children: children.length })] }), _jsx(IconButton, { label: t('agents.refresh'), className: css.refreshButton, onClick: refresh, children: _jsx(IconRefreshOutline14, {}) })] }), open
                ? (_jsx("div", { className: css.agentList, children: sessionId === undefined
                        ? _jsx(EmptyState, { children: t('composer.needsSession') })
                        : catalog === undefined || catalog.state === 'loading' && catalog.entries.length === 0
                            ? _jsx(EmptyState, { children: _jsx(Spinner, { size: "sm" }) })
                            : catalog.state === 'error'
                                ? _jsx(EmptyState, { children: catalog.error?.message ?? t('common.error') })
                                : children.length === 0 && diagnostics.length === 0
                                    ? _jsx(EmptyState, { children: t('agents.emptyBody') })
                                    : (_jsxs(_Fragment, { children: [children.map(entry => (_jsx(SubagentRow, { entry: entry, selected: entry.id === selectedId, onSelect: () => { onSelect(entry); } }, entry.id))), diagnostics.map(entry => (_jsxs("div", { className: css.diagnosticRow, children: [_jsx(IconWarningOutline16, {}), _jsx("span", { children: t('agents.diagnostic', { reason: entry.reason }) })] }, entry.id)))] })) }))
                : null] }));
}
function nodeLogText(node) {
    const raw = node;
    if (Array.isArray(raw.content)) {
        const text = node.kind === 'tool-result' ? resultText(raw.content) : messageText(raw.content);
        if (text !== '')
            return text;
    }
    if (raw.call?.name !== undefined)
        return `${raw.call.name} ${raw.call.argsRaw ?? ''}`.trim();
    return JSON.stringify(node);
}
function childLog(nodes, entry) {
    const rows = nodes.map(node => `${node.kind}: ${nodeLogText(node)}`);
    return rows.length === 0
        ? `${entryLabel(entry)}\n${entry.mode === 'continuable' ? 'continuable' : 'one-shot'}`
        : rows.join('\n\n');
}
function childTask(nodes, fallback) {
    for (const node of nodes) {
        if (node.kind !== 'user' && node.kind !== 'steering')
            continue;
        const raw = node;
        const text = Array.isArray(raw.content) ? messageText(raw.content).trim() : '';
        if (text !== '')
            return text;
    }
    return fallback;
}
/** Centered full-session reader opened over the workbench. */
export function SubagentConversationDialog({ parentSessionId, entry, navigation, onClose, }) {
    const runtime = useRuntime();
    const t = useT();
    const list = useSessionList();
    const session = useSessionSnapshot(entry.id);
    const chat = useChatSnapshot(entry.id);
    const blank = useConversationBlank(entry.id);
    const panelRef = useRef(null);
    const closeRef = useRef(null);
    const titleId = useId();
    const address = useMemo(() => ({
        parentSessionId,
        childSessionId: entry.id,
        mode: entry.mode,
    }), [entry.id, entry.mode, parentSessionId]);
    const [openFailure, setOpenFailure] = useState();
    const parentCwd = list.byId[parentSessionId]?.cwd;
    const cwd = list.byId[entry.id]?.cwd ?? parentCwd;
    const running = entry.activity === 'running' || session?.running === true;
    const log = useMemo(() => childLog(chat?.legacy.nodes ?? [], entry), [chat?.legacy.nodes, entry]);
    const transcriptReady = session?.openState === 'open' && chat !== undefined;
    const transcriptError = openFailure
        ?? (session?.openState === 'error' ? session.openError?.message ?? t('common.error') : undefined);
    useModalFocus(true, panelRef, { initialFocusRef: closeRef, onClose });
    useLayoutEffect(() => {
        setOpenFailure(undefined);
        try {
            runtime.sessions.openSubagent(address);
        }
        catch (cause) {
            setOpenFailure(cause instanceof Error ? cause.message : String(cause));
        }
    }, [address, runtime]);
    return (_jsxs("div", { className: css.conversationOverlay, role: "presentation", children: [_jsx("div", { className: css.conversationMask, "aria-hidden": "true", onClick: onClose }), _jsxs("div", { ref: panelRef, className: css.conversationPanel, role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, tabIndex: -1, children: [_jsxs("header", { className: css.conversationHeader, children: [_jsxs("div", { className: css.conversationTitleCopy, children: [_jsx("div", { className: css.conversationEyebrow, children: t('agents.openFull') }), _jsx("h2", { id: titleId, children: entryLabel(entry) }), _jsxs("span", { className: css.conversationMeta, children: [running ? t('agents.running') : t('agents.inactive'), _jsx("span", { "aria-hidden": true, children: "\u00B7" }), entry.mode === 'continuable' ? t('agents.continuable') : t('agents.oneShot')] })] }), _jsxs("div", { className: css.conversationActions, children: [_jsx(CopyButton, { text: log, label: t('agents.copyLog'), copiedLabel: t('agents.copied') }), _jsx("button", { ref: closeRef, type: "button", className: css.conversationClose, onClick: onClose, "aria-label": t('common.close'), children: _jsx(IconCloseOutline16, {}) })] })] }), _jsx("div", { className: css.conversationBody, children: transcriptError !== undefined
                            ? _jsx(EmptyState, { children: transcriptError })
                            : !transcriptReady
                                ? _jsxs(EmptyState, { children: [_jsx(Spinner, { size: "md" }), t('chat.loading')] })
                                : _jsx(Transcript, { navigation: navigation, sessionId: entry.id, cwd: cwd, blank: blank }) })] })] }));
}
/** Detailed child view, following DCode's back / copy-log / transcript pattern. */
export function SubagentDetailPanel({ parentSessionId, entry, navigation, onBack, onOpenFull, }) {
    const t = useT();
    const list = useSessionList();
    const session = useSessionSnapshot(entry.id);
    const chat = useChatSnapshot(entry.id);
    const blank = useConversationBlank(entry.id);
    const parentCwd = list.byId[parentSessionId]?.cwd;
    const cwd = list.byId[entry.id]?.cwd ?? parentCwd;
    const [now, setNow] = useState(Date.now);
    const timing = useProjectionValue(entry.id, 'subagentTiming');
    const running = entry.activity === 'running' || session?.running === true;
    const duration = elapsedMs(timing, running ? 'running' : 'inactive', now);
    useEffect(() => {
        if (!running)
            return undefined;
        const timer = window.setInterval(() => { setNow(Date.now()); }, 1000);
        return () => { window.clearInterval(timer); };
    }, [running]);
    const log = useMemo(() => childLog(chat?.legacy.nodes ?? [], entry), [chat?.legacy.nodes, entry]);
    const task = useMemo(() => childTask(chat?.legacy.nodes ?? [], entryLabel(entry)), [chat?.legacy.nodes, entry]);
    const error = session?.lastAgentError;
    const transcriptError = session?.openState === 'error'
        ? session.openError?.message ?? t('common.error')
        : undefined;
    const transcriptReady = session?.openState === 'open' && chat !== undefined;
    return (_jsxs("div", { className: css.detail, children: [_jsxs("header", { className: css.detailHeader, children: [_jsxs("button", { type: "button", className: css.backButton, onClick: onBack, children: [_jsx(IconChevronLeftOutline14, {}), _jsx("span", { children: t('agents.back') })] }), _jsxs("span", { className: css.detailStatus, "data-running": running ? '' : undefined, children: [running ? _jsx(Spinner, { size: "sm" }) : error ? _jsx(IconWarningOutline16, {}) : _jsx(IconCheckOutline14, {}), running ? t('agents.running') : error ? t('agents.executionError') : t('agents.inactive')] })] }), _jsxs("div", { className: css.detailHeading, children: [_jsx("span", { className: css.detailAvatar, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsxs("div", { className: css.detailTitleCopy, children: [_jsx("h3", { children: entryLabel(entry) }), _jsxs("span", { children: [entry.mode === 'continuable' ? t('agents.continuable') : t('agents.oneShot'), duration === undefined ? '' : ` · ${formatToolDuration(duration)}`] })] }), _jsx(CopyButton, { text: log, label: t('agents.copyLog'), copiedLabel: t('agents.copied') })] }), _jsxs("section", { className: css.taskBubble, children: [_jsx("span", { className: css.taskLabel, children: t('agents.task') }), _jsx("span", { children: task })] }), error === undefined ? null : _jsxs("div", { className: css.detailError, role: "alert", children: [_jsx(IconWarningOutline16, {}), error] }), _jsx("div", { className: css.childTranscript, children: transcriptError !== undefined
                    ? _jsx(EmptyState, { children: transcriptError })
                    : !transcriptReady
                        ? _jsxs(EmptyState, { children: [_jsx(Spinner, { size: "sm" }), t('chat.loading')] })
                        : _jsx(Transcript, { navigation: navigation, sessionId: entry.id, cwd: cwd, blank: blank, compact: true }) }), _jsx(Button, { primary: true, onClick: onOpenFull, children: t('agents.openFull') })] }));
}
//# sourceMappingURL=AgentInspector.js.map