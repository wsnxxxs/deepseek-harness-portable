import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconThinkOutline14, IconWarningOutline16, MarkdownText, } from '@deepseek-ai/dsh-client-ui-primitives';
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
/** One assistant message's visible blocks. Tool calls render as their own cards. */
function AssistantBlocks(props) {
    return (_jsx("div", { className: css.blockGap, children: props.blocks.map((block, index) => {
            if (block.kind === 'text') {
                return (_jsx("div", { className: css.assistant, children: _jsx(MarkdownText, { text: block.text, streaming: props.streaming, labels: props.labels }) }, index));
            }
            if (block.kind === 'reasoning')
                return _jsx(Reasoning, { text: block.text }, index);
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
            return _jsx("div", { className: css.user, children: messageText(node.content) });
        case 'steering':
            return _jsx("div", { className: `${css.user} ${css.steering}`, children: messageText(node.content) });
        case 'assistant':
            return (_jsxs("div", { children: [_jsx(AssistantBlocks, { blocks: node.blocks, streaming: false, labels: props.labels }), _jsx(Stats, { node: node })] }));
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
                            return (_jsxs("div", { className: css.turn, children: [turn.map(node => (_jsx(Node, { node: node, labels: labels, onInspect: callId => { navigation.inspect(callId); } }, `${node.kind}:${String(node.seq)}`))), paths.length > 0 && (!last || session?.running !== true)
                                        ? (_jsx(FileChanges, { paths: paths, cwd: cwd, status: git.status, onOpenDiff: path => { navigation.openDiff(path); }, onChanged: git.refresh }))
                                        : null] }, turn[0]?.seq ?? turnIndex));
                        }), runningCalls.map(call => (_jsx(ToolCard, { block: call, onInspect: callId => { navigation.inspect(callId); } }, call.callId))), partial === null
                            ? null
                            : (_jsxs("div", { children: [_jsx(AssistantBlocks, { blocks: partial.blocks, streaming: true, labels: labels }), _jsx("span", { className: css.streamingDot, "aria-label": t('chat.thinking') })] })), session?.running === true && partial === null && runningCalls.length === 0
                            ? _jsxs("div", { className: css.stats, children: [t('chat.thinking'), _jsx("span", { className: css.streamingDot })] })
                            : null, session?.queue.length === 0
                            ? null
                            : session?.queue.map(item => (_jsxs("div", { className: `${css.user} ${css.steering}`, children: [_jsx("span", { className: css.stats, children: t('chat.queued') }), item.text ?? item.preview] }, item.id))), session?.lastAgentError === null || session?.lastAgentError === undefined
                            ? null
                            : (_jsxs("div", { className: `${css.notice} ${css.noticeError}`, children: [_jsx(IconWarningOutline16, {}), session.lastAgentError] }))] })), chat === undefined && !blank ? _jsx(EmptyState, { children: t('chat.loading') }) : null] }));
}
//# sourceMappingURL=Transcript.js.map