import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The conversation column.
 *
 * Nodes come from the Chat target the official UI assembles — the very same
 * `ConversationNode` stream, projections and streaming partial — so a session
 * opened in one surface and continued in the other shows one history. What
 * differs is the presentation: a compact tool card per call, a file-change
 * summary closing each turn, and a reading column instead of a full-width
 * flow.
 * @module @dsh-portable/dcode-ui/client/chat/Transcript
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconCheckOutline16, IconCloseOutline16, IconDownloadOutline16, IconEditOutline16, IconPaperclipOutline16, IconSendOutline14, IconThinkOutline14, IconTrashOutline16, IconWarningOutline16, MarkdownText, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useChatSnapshot, useSessionSnapshot } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useGitStatus } from "../git/useGit.js";
import { Button, EmptyState } from "../shell/ui.js";
import { ToolCard } from "./ToolCard.js";
import { FileChanges } from "./FileChanges.js";
import { changedPaths, messageText, splitTurns } from "./tools.js";
import css from './Transcript.module.css';
/** Reasoning text, folded by default. */
function Reasoning({ text }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: css.reasoning, children: [_jsxs("button", { type: "button", className: css.reasoningHead, onClick: () => { setOpen(value => !value); }, children: [_jsx(IconThinkOutline14, {}), t('chat.reasoning'), _jsx("span", { "aria-hidden": true, children: open ? '▾' : '▸' })] }), open ? _jsx("div", { children: text }) : null] }));
}
/** Session-authorized image display; the Conversation assembly owns its URL cache. */
function DurableImage(props) {
    const runtime = useRuntime();
    const [src, setSrc] = useState(() => runtime.media?.peekImageUrl(props.sessionId, props.attachment));
    useEffect(() => {
        let live = true;
        const media = runtime.media;
        const cached = media?.peekImageUrl(props.sessionId, props.attachment);
        if (cached !== undefined) {
            setSrc(cached);
            return () => { live = false; };
        }
        if (media === undefined)
            return () => { live = false; };
        void media.imageUrl(props.sessionId, props.attachment).then(value => { if (live)
            setSrc(value); }, () => undefined);
        return () => { live = false; };
    }, [props.attachment, props.sessionId, runtime]);
    return src === undefined
        ? _jsx("span", { className: css.attachmentPlaceholder, children: props.attachment.name ?? 'image' })
        : _jsx("img", { className: css.messageImage, src: src, alt: props.attachment.name ?? 'image' });
}
/** One durable file reference which can be downloaded from the same session. */
function DurableFile(props) {
    const runtime = useRuntime();
    const label = props.attachment.name ?? 'attachment';
    return (_jsxs("button", { type: "button", className: css.fileAttachment, title: label, onClick: () => { void runtime.media?.downloadFile(props.sessionId, props.attachment); }, disabled: runtime.media === undefined, children: [_jsx(IconPaperclipOutline16, {}), _jsx("span", { children: label }), _jsx(IconDownloadOutline16, {})] }));
}
/** Render message attachments without changing the DCode message layout. */
function MessageAttachments(props) {
    const images = [...(props.images ?? [])];
    const files = [];
    for (const block of props.content ?? []) {
        const candidate = block;
        if (candidate.type === 'image' && candidate.attachment !== undefined) {
            images.push(candidate.attachment);
        }
        else if (candidate.type === 'file' && candidate.attachment !== undefined) {
            files.push(candidate.attachment);
        }
    }
    if (images.length === 0 && files.length === 0 && (props.previews?.length ?? 0) === 0)
        return null;
    return (_jsxs("div", { className: css.messageAttachments, children: [props.previews?.map((image, index) => (_jsx("img", { className: css.messageImage, src: image.previewUrl, alt: image.name ?? 'image' }, `${image.previewUrl}:${String(index)}`))), images.map((attachment, index) => (_jsx(DurableImage, { sessionId: props.sessionId, attachment: attachment }, `${attachment.attachmentId}:${String(index)}`))), files.map((attachment, index) => (_jsx(DurableFile, { sessionId: props.sessionId, attachment: attachment }, `${attachment.attachmentId}:${String(index)}`)))] }));
}
/** A user bubble can carry text, images, files, or an image-only prompt. */
function UserBubble(props) {
    const text = messageText(props.content);
    return (_jsxs("div", { className: `${css.user} ${props.className ?? ''}`, children: [text === '' ? null : _jsx("div", { children: text }), _jsx(MessageAttachments, { sessionId: props.sessionId, content: props.content })] }));
}
/** One assistant message's visible blocks. Tool calls render as their own cards. */
function AssistantBlocks(props) {
    return (_jsx("div", { className: css.blockGap, children: props.blocks.map((block, index) => {
            if (block.kind === 'text') {
                return (_jsx("div", { className: css.assistant, children: _jsx(MarkdownText, { text: block.text, streaming: props.streaming, labels: props.labels }) }, index));
            }
            if (block.kind === 'reasoning')
                return _jsx(Reasoning, { text: block.text }, index);
            if (block.kind === 'image') {
                return (_jsx(MessageAttachments, { sessionId: props.sessionId, images: [block.attachment] }, index));
            }
            // Tool calls are rendered from the paired result nodes, which carry the
            // output; an unpaired call is covered by `runningCalls` below.
            return null;
        }) }));
}
/** Token accounting shown under a finished assistant message. */
function Stats({ node }) {
    const t = useT();
    const usage = node.usage;
    const total = usage?.totalTokens ?? usage?.total_tokens;
    const model = node.provenance?.model;
    if (total === undefined && model === undefined)
        return null;
    return (_jsxs("div", { className: css.stats, children: [model === undefined ? null : _jsx("span", { children: model }), total === undefined ? null : _jsx("span", { children: t('chat.tokens', { count: total }) }), node.interrupted === true ? _jsx("span", { children: t('chat.interrupted') }) : null] }));
}
/** Render one conversation node. */
function Node(props) {
    const t = useT();
    const { node } = props;
    switch (node.kind) {
        case 'user':
            return _jsx(UserBubble, { sessionId: props.sessionId, content: node.content });
        case 'steering':
            return _jsx(UserBubble, { sessionId: props.sessionId, content: node.content, className: css.steering });
        case 'assistant':
            return (_jsxs("div", { children: [_jsx(AssistantBlocks, { sessionId: props.sessionId, blocks: node.blocks, streaming: false, labels: props.labels }), _jsx(Stats, { node: node })] }));
        case 'tool-result':
            return _jsx(ToolCard, { block: node, onInspect: props.onInspect });
        case 'command':
            return (_jsxs("div", { className: css.notice, children: [_jsx("span", { children: t('chat.command') }), _jsxs("code", { children: ["/", node.name ?? '…', node.args === null || node.args === undefined ? '' : ` ${node.args}`] })] }));
        case 'context':
            return (_jsx("div", { className: css.divider, children: t('chat.context') }));
        case 'compaction':
            return _jsx("div", { className: css.divider, children: t('chat.compaction') });
        case 'model-retry':
            return _jsxs("div", { className: `${css.notice} ${css.noticeWarn}`, children: [_jsx(IconWarningOutline16, {}), t('chat.retry')] });
        case 'turn-max-tokens':
            return _jsxs("div", { className: `${css.notice} ${css.noticeWarn}`, children: [_jsx(IconWarningOutline16, {}), t('chat.maxTokens')] });
        case 'turn-error':
            return (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, children: [_jsx(IconWarningOutline16, {}), node.message === '' ? node.code ?? t('common.error') : node.message] }));
        default:
            return null;
    }
}
/** Queue controls mirror the host queue verbs instead of treating queued text as static output. */
function QueuedMessageRow(props) {
    const runtime = useRuntime();
    const t = useT();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(props.item.text ?? props.item.preview);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState();
    const editable = props.item.text !== null;
    useEffect(() => {
        if (!editing)
            setDraft(props.item.text ?? props.item.preview);
        if (!editable)
            setEditing(false);
    }, [editable, editing, props.item.preview, props.item.text]);
    const apply = useCallback(async (action) => {
        const session = runtime.binding(props.sessionId)?.session;
        if (session === undefined || busy)
            return;
        setBusy(true);
        setError(undefined);
        try {
            const result = await session.updateQueue(props.item.id, action);
            if (!result.ok)
                throw new Error(result.error.message);
            if (action.kind === 'edit')
                setEditing(false);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBusy(false);
        }
    }, [busy, props.item.id, props.sessionId, runtime]);
    return (_jsxs("div", { className: `${css.user} ${css.steering} ${css.queueRow}`, children: [_jsx("span", { className: css.stats, children: t('chat.queued') }), editing
                ? (_jsx("input", { className: css.queueEditor, value: draft, "aria-label": t('chat.editQueued'), autoFocus: true, onChange: event => { setDraft(event.target.value); }, onKeyDown: event => {
                        if (event.key === 'Escape')
                            setEditing(false);
                        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            if (draft.trim() !== '')
                                void apply({ kind: 'edit', content: [{ type: 'text', text: draft.trim() }] });
                        }
                    } }))
                : _jsx("span", { className: css.queuePreview, children: props.item.text ?? props.item.preview }), _jsx("div", { className: css.queueActions, children: editing
                    ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.saveQueued'), disabled: busy || draft.trim() === '', onClick: () => { void apply({ kind: 'edit', content: [{ type: 'text', text: draft.trim() }] }); }, children: _jsx(IconCheckOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.cancelQueuedEdit'), disabled: busy, onClick: () => { setEditing(false); }, children: _jsx(IconCloseOutline16, {}) })] }))
                    : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.editQueued'), title: editable ? undefined : t('chat.editQueuedUnsupported'), disabled: busy || !editable, onClick: () => { if (editable)
                                    setEditing(true); }, children: _jsx(IconEditOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.removeQueued'), disabled: busy, onClick: () => { void apply({ kind: 'remove' }); }, children: _jsx(IconTrashOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.steerQueued'), title: props.running ? undefined : t('chat.steerQueuedUnavailable'), disabled: busy || !props.running || props.item.placement !== 'queued', onClick: () => { void apply({ kind: 'steer' }); }, children: _jsx(IconSendOutline14, {}) })] })) }), error === undefined ? null : _jsx("span", { className: css.queueError, children: error })] }));
}
/** Local submission echo shown while attachment admission is still in flight. */
function PendingSubmissionBubble(props) {
    return (_jsxs("div", { className: css.user, children: [props.submission.text === '' ? null : _jsx("div", { children: props.submission.text }), _jsx(MessageAttachments, { sessionId: props.sessionId, previews: props.submission.images })] }));
}
function dynamicGreetingKey() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12)
        return 'chat.empty.morning';
    if (hour >= 12 && hour < 18)
        return 'chat.empty.afternoon';
    return 'chat.empty.evening';
}
/** The scrolling conversation, its turn summaries and its streaming tail. */
export function Transcript({ navigation, sessionId, cwd, blank }) {
    const runtime = useRuntime();
    const t = useT();
    const chat = useChatSnapshot(sessionId);
    const session = useSessionSnapshot(sessionId);
    const git = useGitStatus(cwd, sessionId);
    const scrollerRef = useRef(null);
    const pinnedRef = useRef(true);
    const labels = useMemo(() => ({
        code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
        footnotes: t('details.title'),
    }), [t]);
    const nodes = chat?.legacy.nodes ?? [];
    const partial = chat?.legacy.partial ?? null;
    const runningCalls = chat?.legacy.runningCalls ?? [];
    const turns = useMemo(() => splitTurns(nodes), [nodes]);
    // Stick to the bottom while the operator is already there; a deliberate
    // scroll up during a streaming answer is never yanked back down.
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller === null)
            return undefined;
        const onScroll = () => {
            const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
            pinnedRef.current = distance < 80;
        };
        scroller.addEventListener('scroll', onScroll, { passive: true });
        return () => { scroller.removeEventListener('scroll', onScroll); };
    }, []);
    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller === null || !pinnedRef.current)
            return;
        scroller.scrollTop = scroller.scrollHeight;
    }, [nodes, partial, runningCalls.length, sessionId]);
    // A session switch starts pinned to the newest message again.
    useEffect(() => { pinnedRef.current = true; }, [sessionId]);
    if (sessionId === undefined) {
        // Keep the greeting, but remove the extra prompt and shortcut button.
        return (_jsx("div", { className: `${css.hero} ${css.heroBlank}`, children: _jsx("span", { className: css.heroGreeting, children: t(dynamicGreetingKey()) }) }));
    }
    return (_jsxs("div", { className: css.scroller, ref: scrollerRef, children: [blank
                ? (
                // Bottom-aligned rather than centred: the frame is already holding
                // this column and the composer on one centre line, so the greeting
                // belongs directly above the input, not in the middle of its own half.
                _jsxs("div", { className: `${css.hero} ${css.heroBlank}`, children: [_jsx("span", { className: css.heroGreeting, children: t(dynamicGreetingKey()) }), _jsx("p", { className: css.heroBody, children: cwd === undefined ? t('chat.empty.noWorkspace') : t('chat.empty.body', { cwd }) })] }))
                : (_jsxs("div", { className: css.flow, children: [session?.hasMore === true
                            ? (_jsx(Button, { className: css.loadOlder, disabled: session.loadingOlder, onClick: () => { void runtime.binding(sessionId)?.session.loadOlder(); }, children: session.loadingOlder ? t('chat.loading') : t('chat.loadOlder') }))
                            : null, turns.map((turn, turnIndex) => {
                            const paths = changedPaths(turn);
                            const last = turnIndex === turns.length - 1;
                            return (_jsxs("div", { className: css.turn, children: [turn.map(node => (_jsx(Node, { sessionId: sessionId, node: node, labels: labels, onInspect: callId => { navigation.inspect(callId); } }, `${node.kind}:${String(node.seq)}`))), paths.length > 0 && (!last || session?.running !== true)
                                        ? (_jsx(FileChanges, { paths: paths, cwd: cwd, status: git.status, onOpenDiff: path => { navigation.openDiff(path); }, onChanged: git.refresh }))
                                        : null] }, turn[0]?.seq ?? turnIndex));
                        }), runningCalls.map(call => (_jsx(ToolCard, { block: call, onInspect: callId => { navigation.inspect(callId); } }, call.callId))), partial === null
                            ? null
                            : (_jsxs("div", { children: [_jsx(AssistantBlocks, { sessionId: sessionId, blocks: partial.blocks, streaming: true, labels: labels }), _jsx("span", { className: css.streamingDot, "aria-label": t('chat.thinking') })] })), session?.running === true && partial === null && runningCalls.length === 0
                            ? _jsxs("div", { className: css.stats, children: [t('chat.thinking'), _jsx("span", { className: css.streamingDot })] })
                            : null, session?.pendingSubmissions.map(submission => (_jsx(PendingSubmissionBubble, { sessionId: sessionId, submission: submission }, submission.requestId))), session?.queue.length === 0
                            ? null
                            : session?.queue.map(item => (_jsx(QueuedMessageRow, { sessionId: sessionId, item: item, running: session.running }, item.id))), session?.lastAgentError === null || session?.lastAgentError === undefined
                            ? null
                            : (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, children: [_jsx(IconWarningOutline16, {}), session.lastAgentError] }))] })), chat === undefined && !blank ? _jsx(EmptyState, { children: t('chat.loading') }) : null] }));
}
//# sourceMappingURL=Transcript.js.map