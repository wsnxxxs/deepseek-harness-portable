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
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconBranchOutline16, IconCheckOutline16, IconCloseFill14, IconCloseOutline16, IconDislikeOutline16, IconDownloadOutline16, IconEditOutline16, IconLikeOutline16, IconPaperclipOutline16, IconSendOutline14, IconThinkOutline14, IconTrashOutline16, IconWarningOutline16, MarkdownText, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useChatSnapshot, useSessionSnapshot } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useGitStatus } from "../git/useGit.js";
import { Button, CopyButton, Spinner } from "../shell/ui.js";
import { useModalFocus } from "../shell/use-modal-focus.js";
import { ToolCard } from "./ToolCard.js";
import { FileChanges } from "./FileChanges.js";
import { changedPaths, messageText, splitTurns } from "./tools.js";
import css from './Transcript.module.css';
function feedbackError(error) {
    return new Error(error?.message ?? error?.code ?? 'feedback request failed');
}
/** Read and mutate the durable feedback sidecar shared by assistant rows. */
function useMessageFeedback(sessionId) {
    const runtime = useRuntime();
    const remote = runtime.remote.messageFeedback;
    const [items, setItems] = useState(() => new Map());
    const [pending, setPending] = useState(() => new Set());
    const [error, setError] = useState(undefined);
    const itemsRef = useRef(new Map());
    const pendingRef = useRef(new Set());
    useEffect(() => {
        let live = true;
        const empty = new Map();
        itemsRef.current = empty;
        setItems(empty);
        setError(undefined);
        if (sessionId === undefined || remote === undefined)
            return () => { live = false; };
        void remote.list({ sessionId }).then((carried) => {
            if (!live)
                return;
            if (!carried.ok)
                throw feedbackError(carried.error);
            const result = carried.value;
            if (!result.ok)
                throw feedbackError(result.error);
            const next = new Map(result.value.items.map(item => [item.messageId, item]));
            itemsRef.current = next;
            setItems(next);
        }).catch((cause) => {
            if (!live)
                return;
            setError(cause instanceof Error ? cause.message : String(cause));
        });
        return () => { live = false; };
    }, [remote, sessionId]);
    const toggle = useCallback(async (messageId, rating) => {
        if (sessionId === undefined || remote === undefined || pendingRef.current.has(messageId))
            return undefined;
        pendingRef.current.add(messageId);
        setPending(new Set(pendingRef.current));
        setError(undefined);
        const current = itemsRef.current.get(messageId);
        try {
            if (current?.rating === rating) {
                const carried = await remote.delete({ sessionId, messageId, ifVersion: current.version });
                if (!carried.ok)
                    throw feedbackError(carried.error);
                if (!carried.value.ok)
                    throw feedbackError(carried.value.error);
                const next = new Map(itemsRef.current);
                next.delete(messageId);
                itemsRef.current = next;
                setItems(next);
            }
            else {
                const carried = await remote.put({
                    sessionId,
                    messageId,
                    rating,
                    ifVersion: current?.version ?? null,
                });
                if (!carried.ok)
                    throw feedbackError(carried.error);
                if (!carried.value.ok)
                    throw feedbackError(carried.value.error);
                const next = new Map(itemsRef.current);
                next.set(messageId, carried.value.value);
                itemsRef.current = next;
                setItems(next);
            }
            return undefined;
        }
        catch (cause) {
            return cause instanceof Error ? cause.message : String(cause);
        }
        finally {
            pendingRef.current.delete(messageId);
            setPending(new Set(pendingRef.current));
        }
    }, [remote, sessionId]);
    return { enabled: remote !== undefined, items, pending, error, toggle };
}
/** Click-to-expand image viewer for durable and local message images. */
function ImageLightbox(props) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const close = useCallback(() => { setOpen(false); }, []);
    useModalFocus(open, panelRef, { onClose: close });
    return (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: css.imageButton, "aria-label": t('chat.image.open'), onClick: () => { setOpen(true); }, children: _jsx("img", { className: css.messageImage, src: props.src, alt: props.alt }) }), open
                ? createPortal(_jsx("div", { className: css.lightboxBackdrop, onPointerDown: event => { if (event.target === event.currentTarget)
                        close(); }, children: _jsxs("div", { ref: panelRef, className: css.lightbox, role: "dialog", "aria-modal": "true", "aria-label": props.alt, tabIndex: -1, children: [_jsx("button", { type: "button", className: css.lightboxClose, "aria-label": t('chat.image.close'), onClick: close, children: _jsx(IconCloseFill14, {}) }), _jsx("img", { className: css.lightboxImage, src: props.src, alt: props.alt })] }) }), document.body)
                : null] }));
}
/** Reasoning text, folded by default. */
function Reasoning({ text }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const panelId = useId();
    return (_jsxs("div", { className: css.reasoning, children: [_jsxs("button", { type: "button", className: css.reasoningHead, "aria-expanded": open, "aria-controls": panelId, onClick: () => { setOpen(value => !value); }, children: [_jsx(IconThinkOutline14, {}), t('chat.reasoning'), _jsx("span", { "aria-hidden": true, children: open ? '▾' : '▸' })] }), open ? _jsx("div", { id: panelId, role: "region", children: text }) : null] }));
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
        : _jsx(ImageLightbox, { src: src, alt: props.attachment.name ?? 'image' });
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
    return (_jsxs("div", { className: css.messageAttachments, children: [props.previews?.map((image, index) => (_jsx(ImageLightbox, { src: image.previewUrl, alt: image.name ?? 'image' }, `${image.previewUrl}:${String(index)}`))), images.map((attachment, index) => (_jsx(DurableImage, { sessionId: props.sessionId, attachment: attachment }, `${attachment.attachmentId}:${String(index)}`))), files.map((attachment, index) => (_jsx(DurableFile, { sessionId: props.sessionId, attachment: attachment }, `${attachment.attachmentId}:${String(index)}`)))] }));
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
    return (_jsxs("div", { className: css.stats, role: "status", "aria-live": "polite", children: [model === undefined ? null : _jsx("span", { children: model }), total === undefined ? null : _jsx("span", { children: t('chat.tokens', { count: total }) }), node.interrupted === true ? _jsx("span", { children: t('chat.interrupted') }) : null] }));
}
function assistantText(blocks) {
    return blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('');
}
/** Copy, feedback, and branch actions for one settled assistant answer. */
function AssistantActions(props) {
    const runtime = useRuntime();
    const t = useT();
    const [branching, setBranching] = useState(false);
    const [branchError, setBranchError] = useState(undefined);
    const [feedbackError, setFeedbackError] = useState(undefined);
    const text = assistantText(props.node.blocks);
    const messageId = props.node.messageId === undefined ? undefined : String(props.node.messageId);
    const item = messageId === undefined ? undefined : props.feedback.items.get(messageId);
    const pending = messageId === undefined ? false : props.feedback.pending.has(messageId);
    const branch = useCallback(async () => {
        if (branching)
            return;
        setBranching(true);
        setBranchError(undefined);
        try {
            const child = await runtime.sessions.fork({
                sessionId: props.sessionId,
                atSeq: props.node.seq,
                increaseTitle: true,
            });
            runtime.sessions.open(child);
        }
        catch (cause) {
            setBranchError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBranching(false);
        }
    }, [branching, props.node.seq, props.sessionId, runtime]);
    const rate = useCallback((rating) => {
        if (messageId === undefined)
            return;
        setFeedbackError(undefined);
        void props.feedback.toggle(messageId, rating).then((failure) => {
            if (failure !== undefined)
                setFeedbackError(failure);
        });
    }, [messageId, props.feedback]);
    return (_jsxs("div", { className: css.messageActions, children: [text === '' ? null : (_jsx(CopyButton, { text: text, label: t('chat.message.copy'), copiedLabel: t('chat.message.copied'), className: css.messageAction })), props.feedback.enabled && messageId !== undefined
                ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: `${css.messageAction} ${item?.rating === 'positive' ? css.messageActionActive : ''}`, "aria-label": t('chat.feedback.positive'), "aria-pressed": item?.rating === 'positive', disabled: pending, onClick: () => { rate('positive'); }, children: _jsx(IconLikeOutline16, {}) }), _jsx("button", { type: "button", className: `${css.messageAction} ${item?.rating === 'negative' ? css.messageActionActive : ''}`, "aria-label": t('chat.feedback.negative'), "aria-pressed": item?.rating === 'negative', disabled: pending, onClick: () => { rate('negative'); }, children: _jsx(IconDislikeOutline16, {}) })] }))
                : null, _jsx("button", { type: "button", className: css.messageAction, "aria-label": t('chat.message.branch'), disabled: branching, onClick: () => { void branch(); }, children: branching ? _jsx(Spinner, { size: "sm" }) : _jsx(IconBranchOutline16, {}) }), branchError === undefined ? null : _jsx("span", { className: css.actionError, role: "alert", children: t('chat.message.branchFailed', { error: branchError }) }), feedbackError === undefined ? null : _jsx("span", { className: css.actionError, role: "alert", children: t('chat.feedback.failed', { error: feedbackError }) })] }));
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
            return (_jsxs("div", { children: [_jsx(AssistantBlocks, { sessionId: props.sessionId, blocks: node.blocks, streaming: false, labels: props.labels }), _jsx(AssistantActions, { sessionId: props.sessionId, node: node, feedback: props.feedback }), _jsx(Stats, { node: node })] }));
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
            return (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, role: "alert", children: [_jsx(IconWarningOutline16, {}), node.message === '' ? node.code ?? t('common.error') : node.message] }));
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
                                    setEditing(true); }, children: _jsx(IconEditOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.removeQueued'), disabled: busy, onClick: () => { void apply({ kind: 'remove' }); }, children: _jsx(IconTrashOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.steerQueued'), title: props.running ? undefined : t('chat.steerQueuedUnavailable'), disabled: busy || !props.running || props.item.placement !== 'queued', onClick: () => { void apply({ kind: 'steer' }); }, children: _jsx(IconSendOutline14, {}) })] })) }), error === undefined ? null : _jsx("span", { className: css.queueError, role: "alert", children: error })] }));
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
/** Compact index for jumping between loaded conversation turns. */
function TurnNavigator(props) {
    const t = useT();
    const [active, setActive] = useState(0);
    if (props.turns.length < 2)
        return null;
    return (_jsx("nav", { className: css.turnNavigator, "aria-label": t('chat.turnNavigation.label'), children: props.turns.map((_turn, index) => (_jsx("button", { type: "button", className: css.turnButton, "aria-label": t('chat.turnNavigation.turn', { count: index + 1 }), "aria-current": active === index ? 'true' : undefined, onClick: () => {
                const target = props.scrollerRef.current?.querySelector(`[data-turn-index="${String(index)}"]`);
                target?.scrollIntoView({
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                    block: 'start',
                });
                setActive(index);
            }, children: index + 1 }, index))) }));
}
/** The scrolling conversation, its turn summaries and its streaming tail. */
export function Transcript({ navigation, sessionId, cwd, blank }) {
    const runtime = useRuntime();
    const t = useT();
    const chat = useChatSnapshot(sessionId);
    const session = useSessionSnapshot(sessionId);
    const git = useGitStatus(cwd, sessionId);
    const feedback = useMessageFeedback(sessionId);
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
    if (chat === undefined && !blank) {
        return _jsxs("div", { className: css.loadingState, role: "status", children: [_jsx(Spinner, { size: "sm" }), t('chat.loading')] });
    }
    return (_jsx("div", { className: css.scroller, ref: scrollerRef, tabIndex: 0, role: "region", "aria-label": t('chat.transcript'), children: blank
            ? (
            // Bottom-aligned rather than centred: the frame is already holding
            // this column and the composer on one centre line, so the greeting
            // belongs directly above the input, not in the middle of its own half.
            _jsxs("div", { className: `${css.hero} ${css.heroBlank}`, children: [_jsx("span", { className: css.heroGreeting, children: t(dynamicGreetingKey()) }), _jsx("p", { className: css.heroBody, children: cwd === undefined ? t('chat.empty.noWorkspace') : t('chat.empty.body', { cwd }) })] }))
            : (_jsxs(_Fragment, { children: [_jsx(TurnNavigator, { turns: turns, scrollerRef: scrollerRef }), _jsxs("div", { className: css.flow, children: [feedback.error === undefined ? null : (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, role: "alert", children: [_jsx(IconWarningOutline16, {}), t('chat.feedback.failed', { error: feedback.error })] })), session?.hasMore === true
                                ? (_jsx(Button, { className: css.loadOlder, disabled: session.loadingOlder, onClick: () => { void runtime.binding(sessionId)?.session.loadOlder(); }, children: session.loadingOlder ? t('chat.loading') : t('chat.loadOlder') }))
                                : null, turns.map((turn, turnIndex) => {
                                const paths = changedPaths(turn);
                                const last = turnIndex === turns.length - 1;
                                return (_jsxs("div", { className: css.turn, "data-turn-index": turnIndex, children: [turn.map(node => (_jsx(Node, { sessionId: sessionId, node: node, labels: labels, onInspect: callId => { navigation.inspect(callId); }, feedback: feedback }, `${node.kind}:${String(node.seq)}`))), paths.length > 0 && (!last || session?.running !== true)
                                            ? (_jsx(FileChanges, { paths: paths, cwd: cwd, status: git.status, onOpenDiff: path => { navigation.openDiff(path); }, onChanged: git.refresh }))
                                            : null] }, turn[0]?.seq ?? turnIndex));
                            }), runningCalls.map(call => (_jsx(ToolCard, { block: call, onInspect: callId => { navigation.inspect(callId); } }, call.callId))), partial === null
                                ? null
                                : (_jsxs("div", { children: [_jsx(AssistantBlocks, { sessionId: sessionId, blocks: partial.blocks, streaming: true, labels: labels }), _jsx("span", { className: css.streamingDot, role: "status", "aria-label": t('chat.thinking') })] })), session?.running === true && partial === null && runningCalls.length === 0
                                ? _jsxs("div", { className: css.stats, role: "status", "aria-live": "polite", children: [t('chat.thinking'), _jsx("span", { className: css.streamingDot })] })
                                : null, session?.pendingSubmissions.map(submission => (_jsx(PendingSubmissionBubble, { sessionId: sessionId, submission: submission }, submission.requestId))), session?.queue.length === 0
                                ? null
                                : session?.queue.map(item => (_jsx(QueuedMessageRow, { sessionId: sessionId, item: item, running: session.running }, item.id))), session?.lastAgentError === null || session?.lastAgentError === undefined
                                ? null
                                : (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, role: "alert", children: [_jsx(IconWarningOutline16, {}), session.lastAgentError] }))] })] })) }));
}
//# sourceMappingURL=Transcript.js.map