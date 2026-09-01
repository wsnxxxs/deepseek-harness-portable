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
import { FishLogo, IconBranchOutline16, IconCheckOutline16, IconChevronRightOutline14, IconCloseFill14, IconCloseOutline16, IconDislikeOutline16, IconEditOutline16, IconLikeOutline16, IconSearchOutline16, IconSendOutline14, IconSparkle16, IconThinkOutline14, IconTrashOutline16, IconWarningOutline16, MarkdownText, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useChatSnapshot, useSessionSnapshot } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useGitStatus } from "../git/useGit.js";
import { Button, CopyButton, IconButton, shimmerActive, Spinner } from "../shell/ui.js";
import { useModalFocus } from "../shell/use-modal-focus.js";
import { MessageNavRail } from "../shell/MessageNavRail.js";
import { ToolCard } from "./ToolCard.js";
import { FileChanges } from "./FileChanges.js";
import { extractProposedPlan, PlanPreviewCard } from "./PlanPreview.js";
import { useMessageFeedback } from "./message-feedback.js";
import { aggregateToolActivity, changedPaths, formatToolDuration, messageText, splitTurns, } from "./tools.js";
import css from './Transcript.module.css';
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
function compactTokens(count) {
    if (count < 1000)
        return String(count);
    if (count < 1_000_000)
        return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`;
    return `${(count / 1_000_000).toFixed(1)}m`;
}
/** Running reasoning stays visible; completed reasoning folds into a one-line row. */
function Reasoning(props) {
    const t = useT();
    const [open, setOpen] = useState(props.streaming);
    const panelId = useId();
    const startedAt = useRef(Date.now());
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!props.streaming)
            return undefined;
        const update = () => { setElapsed(Math.max(0, Date.now() - startedAt.current)); };
        update();
        const timer = window.setInterval(update, 1000);
        return () => { window.clearInterval(timer); };
    }, [props.streaming]);
    useEffect(() => {
        if (props.streaming)
            setOpen(true);
    }, [props.streaming]);
    const seconds = Math.max(0, Math.round((props.streaming ? elapsed : props.durationMs ?? 0) / 1000));
    const title = props.streaming
        ? t('chat.thinkingProgress', { seconds })
        : props.tokenCount === undefined
            ? t('chat.thoughtFor', { seconds })
            : `${t('chat.thoughtFor', { seconds })} · ${t('chat.tokens', { count: compactTokens(props.tokenCount) })}`;
    return (_jsxs("div", { className: `${css.reasoning} ${props.streaming ? css.reasoningStreaming : ''} ${shimmerActive(props.streaming)}`, children: [_jsxs("button", { type: "button", className: css.reasoningHead, "aria-expanded": open, "aria-controls": panelId, disabled: props.streaming, onClick: () => { setOpen(value => !value); }, children: [_jsx("span", { className: css.reasoningIcon, "aria-hidden": true, children: _jsx(IconThinkOutline14, {}) }), _jsx("span", { className: css.reasoningTitle, children: title }), props.streaming
                        ? null
                        : _jsx(IconChevronRightOutline14, { className: `${css.reasoningChevron} ${open ? css.reasoningChevronOpen : ''}` })] }), _jsx("div", { className: `${css.reasoningDisclosure} ${open ? css.reasoningDisclosureOpen : ''}`, children: _jsx("div", { className: css.reasoningBody, id: panelId, role: "region", children: _jsx(MarkdownText, { text: props.text, streaming: props.streaming, labels: props.labels }) }) })] }));
}
/** Lightweight waiting row before the first assistant delta arrives. */
function ThinkingStatus() {
    const t = useT();
    const startedAt = useRef(Date.now());
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const timer = window.setInterval(() => {
            setSeconds(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
        }, 1000);
        return () => { window.clearInterval(timer); };
    }, []);
    return (_jsx("div", { className: `${css.reasoning} ${css.reasoningStreaming} ${shimmerActive()}`, role: "status", "aria-live": "polite", children: _jsxs("div", { className: css.reasoningHead, children: [_jsx("span", { className: css.reasoningIcon, "aria-hidden": true, children: _jsx(IconThinkOutline14, {}) }), _jsx("span", { className: css.reasoningTitle, children: t('chat.thinkingProgress', { seconds }) })] }) }));
}
/** A compact disclosure for a consecutive run of successful read/search calls. */
function ToolActivityGroup(props) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const contentId = useId();
    const summary = [
        props.group.memoryCount === 0 ? undefined : t(props.group.memoryCount === 1 ? 'chat.toolActivity.memoryOne' : 'chat.toolActivity.memoryMany', { count: props.group.memoryCount }),
        props.group.readCount === 0 ? undefined : t(props.group.readCount === 1 ? 'chat.toolActivity.readOne' : 'chat.toolActivity.readMany', { count: props.group.readCount }),
        props.group.searchCount === 0 ? undefined : t(props.group.searchCount === 1 ? 'chat.toolActivity.searchOne' : 'chat.toolActivity.searchMany', { count: props.group.searchCount }),
    ].filter((part) => part !== undefined).join(' · ');
    return (_jsxs("div", { className: css.toolActivity, children: [_jsxs("button", { type: "button", className: css.toolActivityHead, "aria-expanded": open, "aria-controls": contentId, onClick: () => { setOpen(value => !value); }, children: [_jsx("span", { className: css.toolActivityIcon, "aria-hidden": true, children: props.group.memoryCount > 0 && props.group.readCount === 0 && props.group.searchCount === 0
                            ? _jsx(IconSparkle16, {})
                            : _jsx(IconSearchOutline16, {}) }), _jsx("span", { className: css.toolActivitySummary, children: summary }), props.group.durationMs === undefined
                        ? null
                        : _jsxs("span", { className: css.toolActivityDuration, children: ["\u00B7 ", formatToolDuration(props.group.durationMs)] }), _jsx(IconChevronRightOutline14, { className: `${css.toolActivityChevron} ${open ? css.toolActivityChevronOpen : ''}` })] }), _jsx("div", { className: `${css.toolActivityDisclosure} ${open ? css.toolActivityDisclosureOpen : ''}`, "aria-hidden": !open, children: _jsx("div", { className: css.toolActivityClip, children: _jsx("div", { className: css.toolActivityItems, id: contentId, children: props.group.blocks.map(block => (_jsx(ToolCard, { block: block }, block.callId))) }) }) })] }));
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
/** Render official alpha.2 image attachments without changing the DCode layout. */
function MessageAttachments(props) {
    const images = [...(props.images ?? [])];
    for (const block of props.content ?? []) {
        const candidate = block;
        if (candidate.type === 'image' && candidate.attachment !== undefined) {
            images.push(candidate.attachment);
        }
    }
    if (images.length === 0 && (props.previews?.length ?? 0) === 0)
        return null;
    return (_jsxs("div", { className: css.messageAttachments, children: [props.previews?.map((image, index) => (_jsx(ImageLightbox, { src: image.previewUrl, alt: image.name ?? 'image' }, `${image.previewUrl}:${String(index)}`))), images.map((attachment, index) => (_jsx(DurableImage, { sessionId: props.sessionId, attachment: attachment }, `${attachment.attachmentId}:${String(index)}`)))] }));
}
/** A user bubble can carry text, images, or an image-only prompt. */
function UserBubble(props) {
    const text = messageText(props.content);
    return (_jsxs("div", { className: `${css.user} ${props.className ?? ''}`, children: [text === '' ? null : _jsx("div", { children: text }), _jsx(MessageAttachments, { sessionId: props.sessionId, content: props.content })] }));
}
/** One assistant message's visible blocks. Tool calls render as their own cards. */
function AssistantBlocks(props) {
    return (_jsx("div", { className: css.blockGap, children: props.blocks.map((block, index) => {
            if (block.kind === 'text') {
                const proposedPlan = extractProposedPlan(block.text, props.streaming);
                if (proposedPlan !== undefined) {
                    return (_jsxs("div", { className: css.proposalBlock, children: [proposedPlan.before === ''
                                ? null
                                : _jsx("div", { className: css.assistant, children: _jsx(MarkdownText, { text: proposedPlan.before, streaming: props.streaming, labels: props.labels }) }), _jsx(PlanPreviewCard, { sessionId: props.sessionId, markdown: proposedPlan.plan, partial: proposedPlan.partial, labels: props.labels, showStatus: true }), proposedPlan.after === ''
                                ? null
                                : _jsx("div", { className: css.assistant, children: _jsx(MarkdownText, { text: proposedPlan.after, streaming: props.streaming, labels: props.labels }) })] }, index));
                }
                return (_jsx("div", { className: css.assistant, children: _jsx(MarkdownText, { text: block.text, streaming: props.streaming, labels: props.labels }) }, index));
            }
            if (block.kind === 'reasoning') {
                return (_jsx(Reasoning, { text: block.text, streaming: props.streaming, durationMs: props.durationMs, tokenCount: props.tokenCount, labels: props.labels }, index));
            }
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
function assistantTokenCount(node) {
    const usage = node.usage;
    return usage?.totalTokens ?? usage?.total_tokens;
}
function assistantDurationMs(node) {
    const start = node.timing?.stepStartTime;
    return start === null || start === undefined ? undefined : Math.max(0, node.timing.completedTime - start);
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
    const [noteOpen, setNoteOpen] = useState(false);
    const [noteDraft, setNoteDraft] = useState('');
    const [noteBusy, setNoteBusy] = useState(false);
    const [noteError, setNoteError] = useState(undefined);
    const text = assistantText(props.node.blocks);
    const messageId = props.node.messageId;
    const item = messageId === undefined ? undefined : props.feedback.items.get(messageId);
    const pending = messageId === undefined ? false : props.feedback.pending.has(messageId);
    useEffect(() => {
        if (noteOpen) {
            setNoteDraft(item?.note ?? '');
            setNoteError(undefined);
        }
    }, [noteOpen, item?.note]);
    const saveNote = useCallback(() => {
        if (messageId === undefined || item?.rating === undefined)
            return;
        setNoteBusy(true);
        setNoteError(undefined);
        void props.feedback.saveNote(messageId, item.rating, noteDraft).then((failure) => {
            if (failure !== undefined)
                setNoteError(failure);
            else {
                setNoteOpen(false);
                setNoteDraft('');
            }
        }).finally(() => { setNoteBusy(false); });
    }, [item?.rating, messageId, noteDraft, props.feedback]);
    const clearSavedNote = useCallback(() => {
        if (messageId === undefined)
            return;
        setNoteBusy(true);
        setNoteError(undefined);
        void props.feedback.clearNote(messageId).then((failure) => {
            if (failure !== undefined)
                setNoteError(failure);
            else {
                setNoteOpen(false);
                setNoteDraft('');
            }
        }).finally(() => { setNoteBusy(false); });
    }, [messageId, props.feedback]);
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
            props.onBranched();
            runtime.sessions.open(child);
        }
        catch (cause) {
            setBranchError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBranching(false);
        }
    }, [branching, props.node.seq, props.onBranched, props.sessionId, runtime]);
    const rate = useCallback((rating) => {
        if (messageId === undefined)
            return;
        setFeedbackError(undefined);
        void props.feedback.toggle(messageId, rating).then((failure) => {
            if (failure !== undefined)
                setFeedbackError(failure);
        });
    }, [messageId, props.feedback]);
    return (_jsxs("div", { className: css.messageActions, children: [_jsxs("span", { className: css.messageActionGroup, children: [text === '' ? null : (_jsx(CopyButton, { text: text, label: t('chat.message.copy'), copiedLabel: t('chat.message.copied'), className: css.messageAction })), props.feedback.enabled && messageId !== undefined
                        ? (_jsxs("span", { style: { display: 'contents' }, onPointerEnter: props.feedback.ensure, onFocusCapture: props.feedback.ensure, children: [_jsx(IconButton, { label: t('chat.feedback.positive'), className: css.messageAction, active: item?.rating === 'positive', disabled: pending, onClick: () => { rate('positive'); }, children: _jsx(IconLikeOutline16, {}) }), _jsx(IconButton, { label: t('chat.feedback.negative'), className: css.messageAction, active: item?.rating === 'negative', disabled: pending, onClick: () => { rate('negative'); }, children: _jsx(IconDislikeOutline16, {}) }), _jsx(IconButton, { label: item?.note === undefined || item.note === '' ? t('chat.feedback.note') : t('chat.feedback.noteEdit'), className: css.messageAction, active: noteOpen, disabled: pending || item?.rating === undefined, onClick: () => { setNoteOpen(value => !value); }, children: _jsx(IconEditOutline16, {}) })] }))
                        : null] }), noteOpen && messageId !== undefined ? (_jsxs("span", { className: css.noteEditor, children: [_jsx("textarea", { className: css.noteInput, rows: 2, value: noteDraft, disabled: noteBusy, placeholder: t('chat.feedback.notePlaceholder'), "aria-label": t('chat.feedback.note'), onChange: event => { setNoteDraft(event.target.value); setNoteError(undefined); }, onKeyDown: event => {
                            if (event.key === 'Escape') {
                                event.preventDefault();
                                setNoteOpen(false);
                            }
                            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                saveNote();
                            }
                        } }), _jsxs("span", { className: css.noteActions, children: [item?.note === undefined || item.note === '' ? null : (_jsx(Button, { disabled: noteBusy, onClick: clearSavedNote, children: t('chat.feedback.noteRemove') })), _jsx(Button, { disabled: noteBusy, onClick: () => { setNoteOpen(false); setNoteError(undefined); }, children: t('chat.feedback.noteCancel') }), _jsx(Button, { primary: true, disabled: noteBusy, onClick: saveNote, children: noteBusy ? t('common.saving') : t('chat.feedback.noteSave') })] }), noteError === undefined ? null : _jsx("span", { className: css.actionError, role: "alert", children: t('chat.feedback.failed', { error: noteError }) })] })) : null, _jsx("span", { className: `${css.messageActionGroup} ${css.branchActionGroup}`, children: _jsx(IconButton, { label: branching ? t('chat.message.branching') : t('chat.message.branch'), className: css.messageAction, disabled: branching, onClick: () => { void branch(); }, children: branching ? _jsx(Spinner, { size: "sm" }) : _jsx(IconBranchOutline16, {}) }) }), branchError === undefined ? null : _jsx("span", { className: css.actionError, role: "alert", children: t('chat.message.branchFailed', { error: branchError }) }), feedbackError === undefined ? null : _jsx("span", { className: css.actionError, role: "alert", children: t('chat.feedback.failed', { error: feedbackError }) })] }));
}
/** Render one conversation node. */
function Node(props) {
    const t = useT();
    const { node } = props;
    switch (node.kind) {
        case 'user':
            return _jsx(UserBubble, { sessionId: props.sessionId, content: node.content, className: props.highlighted === true ? css.turnLeadHighlight : undefined });
        case 'steering':
            return _jsx(UserBubble, { sessionId: props.sessionId, content: node.content, className: `${css.steering} ${props.highlighted === true ? css.turnLeadHighlight : ''}` });
        case 'assistant':
            return (_jsxs("div", { children: [_jsx(AssistantBlocks, { sessionId: props.sessionId, blocks: node.blocks, streaming: false, labels: props.labels, durationMs: assistantDurationMs(node), tokenCount: assistantTokenCount(node) }), _jsx(AssistantActions, { sessionId: props.sessionId, node: node, feedback: props.feedback, onBranched: props.onBranched }), _jsx(Stats, { node: node })] }));
        case 'tool-result':
            return _jsx(ToolCard, { block: node });
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
    const original = props.item.text ?? props.item.preview;
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
    return (_jsxs("div", { className: `${css.user} ${props.item.placement === 'steering' ? css.steering : css.queuedPrompt} ${css.queueRow}`, children: [_jsx("span", { className: css.stats, children: t('chat.queued') }), editing
                ? (_jsx("input", { className: css.queueEditor, value: draft, "aria-label": t('chat.editQueued'), autoFocus: true, onChange: event => { setDraft(event.target.value); }, onKeyDown: event => {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setDraft(original);
                            setError(undefined);
                            setEditing(false);
                        }
                        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            if (draft.trim() !== '')
                                void apply({ kind: 'edit', content: [{ type: 'text', text: draft.trim() }] });
                        }
                    } }))
                : _jsx("span", { className: css.queuePreview, children: props.item.text ?? props.item.preview }), _jsx("div", { className: css.queueActions, children: editing
                    ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.saveQueued'), disabled: busy || draft.trim() === '', onClick: () => { void apply({ kind: 'edit', content: [{ type: 'text', text: draft.trim() }] }); }, children: _jsx(IconCheckOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.cancelQueuedEdit'), disabled: busy, onClick: () => {
                                    setDraft(original);
                                    setError(undefined);
                                    setEditing(false);
                                }, children: _jsx(IconCloseOutline16, {}) })] }))
                    : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.editQueued'), title: editable ? undefined : t('chat.editQueuedUnsupported'), disabled: busy || !editable, onClick: () => {
                                    if (!editable)
                                        return;
                                    setDraft(original);
                                    setError(undefined);
                                    setEditing(true);
                                }, children: _jsx(IconEditOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.removeQueued'), disabled: busy, onClick: () => { void apply({ kind: 'remove' }); }, children: _jsx(IconTrashOutline16, {}) }), _jsx("button", { type: "button", className: css.queueAction, "aria-label": t('chat.steerQueued'), title: props.running ? undefined : t('chat.steerQueuedUnavailable'), disabled: busy || !props.running || props.item.placement !== 'queued', onClick: () => { void apply({ kind: 'steer' }); }, children: _jsx(IconSendOutline14, {}) })] })) }), error === undefined ? null : _jsx("span", { className: css.queueError, role: "alert", children: error })] }));
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
export function Transcript({ navigation, sessionId, cwd, blank, compact = false }) {
    const runtime = useRuntime();
    const t = useT();
    const chat = useChatSnapshot(sessionId);
    const session = useSessionSnapshot(sessionId);
    const git = useGitStatus(cwd, sessionId);
    const feedback = useMessageFeedback(runtime.messageFeedback, sessionId);
    const scrollerRef = useRef(null);
    const pinnedRef = useRef(true);
    const highlightTimerRef = useRef(undefined);
    const [highlightedTurn, setHighlightedTurn] = useState(undefined);
    const [branchCreated, setBranchCreated] = useState(false);
    const [showScrollLatest, setShowScrollLatest] = useState(false);
    const emptyHero = (_jsx("div", { className: `${css.hero} ${css.heroBlank}`, children: _jsxs("div", { className: css.heroHeadline, children: [_jsx("span", { className: css.heroFishHitbox, children: _jsx(FishLogo, { size: 34, className: css.heroFish }) }), _jsx("span", { className: css.heroGreeting, children: t(dynamicGreetingKey()) })] }) }));
    const labels = useMemo(() => ({
        code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
        footnotes: t('details.title'),
    }), [t]);
    const nodes = chat?.legacy.nodes ?? [];
    const partial = chat?.legacy.partial ?? null;
    const runningCalls = chat?.legacy.runningCalls ?? [];
    const turns = useMemo(() => splitTurns(nodes), [nodes]);
    const queued = useMemo(() => (session?.queue ?? []).filter(item => item.placement !== 'context'), [session?.queue]);
    const navigateToTurn = useCallback((index) => {
        // Opt out of bottom pinning before smooth scrolling begins, otherwise a
        // streaming layout update can pull the selected turn back out of view.
        pinnedRef.current = false;
        setHighlightedTurn(index);
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = window.setTimeout(() => { setHighlightedTurn(undefined); }, 1600);
        const target = scrollerRef.current?.querySelector(`[data-turn-index="${String(index)}"]`);
        target?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start',
        });
    }, []);
    useEffect(() => () => { window.clearTimeout(highlightTimerRef.current); }, []);
    useEffect(() => {
        if (!branchCreated)
            return undefined;
        const timer = window.setTimeout(() => { setBranchCreated(false); }, 2400);
        return () => { window.clearTimeout(timer); };
    }, [branchCreated]);
    // Stick to the bottom while the operator is already there; a deliberate
    // scroll up during a streaming answer is never yanked back down.
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller === null)
            return undefined;
        const onScroll = () => {
            const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
            const pinned = distance < 80;
            pinnedRef.current = pinned;
            setShowScrollLatest(!pinned);
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
    useLayoutEffect(() => {
        pinnedRef.current = true;
        setShowScrollLatest(false);
        const scroller = scrollerRef.current;
        if (scroller !== null)
            scroller.scrollTop = scroller.scrollHeight;
    }, [sessionId]);
    const scrollToLatest = useCallback(() => {
        const scroller = scrollerRef.current;
        if (scroller === null)
            return;
        pinnedRef.current = true;
        setShowScrollLatest(false);
        scroller.scrollTo({
            top: scroller.scrollHeight,
            behavior: 'auto',
        });
    }, []);
    if (sessionId === undefined) {
        return emptyHero;
    }
    if (chat === undefined && !blank) {
        return _jsxs("div", { className: css.loadingState, role: "status", children: [_jsx(Spinner, { size: "sm" }), t('chat.loading')] });
    }
    return (_jsxs("div", { className: css.scroller, ref: scrollerRef, tabIndex: 0, role: "region", "aria-label": t('chat.transcript'), children: [blank
                ? emptyHero
                : (_jsxs(_Fragment, { children: [compact ? null : _jsx(MessageNavRail, { nodes: nodes, scrollerRef: scrollerRef, onNavigate: navigateToTurn }), _jsxs("div", { className: css.flow, children: [feedback.error === undefined ? null : (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, role: "alert", children: [_jsx(IconWarningOutline16, {}), t('chat.feedback.failed', { error: feedback.error })] })), session?.hasMore === true
                                    ? (_jsx(Button, { className: css.loadOlder, disabled: session.loadingOlder, onClick: () => { void runtime.binding(sessionId)?.session.loadOlder(); }, children: session.loadingOlder ? t('chat.loading') : t('chat.loadOlder') }))
                                    : null, turns.map((turn, turnIndex) => {
                                    const paths = changedPaths(turn);
                                    const items = aggregateToolActivity(turn);
                                    const last = turnIndex === turns.length - 1;
                                    const firstUserIndex = items.findIndex(item => item.kind === 'user' || item.kind === 'steering');
                                    return (_jsxs("div", { className: css.turn, "data-turn-index": turnIndex, children: [items.map((item, itemIndex) => {
                                                if (item.kind === 'tool-activity') {
                                                    return (_jsx(ToolActivityGroup, { group: item }, `tool-activity:${item.blocks[0]?.callId ?? 'empty'}`));
                                                }
                                                return (_jsx(Node, { sessionId: sessionId, node: item, labels: labels, feedback: feedback, highlighted: highlightedTurn === turnIndex && itemIndex === firstUserIndex, onBranched: () => { setBranchCreated(true); } }, `${item.kind}:${String(item.seq)}`));
                                            }), paths.length > 0 && (!last || session?.running !== true)
                                                ? (_jsx(FileChanges, { paths: paths, cwd: cwd, status: git.status, onOpenDiff: path => { navigation.openDiff(path); }, onChanged: git.refresh }))
                                                : null] }, turn[0]?.seq ?? turnIndex));
                                }), runningCalls.map(call => (_jsx(ToolCard, { block: call }, call.callId))), partial === null
                                    ? null
                                    : (_jsxs("div", { children: [_jsx(AssistantBlocks, { sessionId: sessionId, blocks: partial.blocks, streaming: true, labels: labels }), _jsx("span", { className: css.streamingDot, role: "status", "aria-label": t('chat.thinking') })] })), session?.running === true && partial === null && runningCalls.length === 0
                                    ? _jsx(ThinkingStatus, {})
                                    : null, session?.pendingSubmissions.map(submission => (_jsx(PendingSubmissionBubble, { sessionId: sessionId, submission: submission }, submission.requestId))), queued.length === 0
                                    ? null
                                    : queued.map(item => (_jsx(QueuedMessageRow, { sessionId: sessionId, item: item, running: session?.running === true }, item.id))), session?.lastAgentError === null || session?.lastAgentError === undefined
                                    ? null
                                    : (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, role: "alert", children: [_jsx(IconWarningOutline16, {}), session.lastAgentError] }))] }), showScrollLatest
                            ? (_jsxs("button", { type: "button", className: css.scrollLatest, onClick: scrollToLatest, children: [_jsx(IconChevronRightOutline14, { className: css.scrollLatestIcon }), t('chat.scrollLatest')] }))
                            : null] })), branchCreated
                ? _jsx("div", { className: css.branchToast, role: "status", children: t('chat.message.branchCreated') })
                : null] }));
}
//# sourceMappingURL=Transcript.js.map