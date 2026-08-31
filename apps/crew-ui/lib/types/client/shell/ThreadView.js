import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The chat-first conversation body.
 *
 * The Host still owns the conversation projection. This component only maps
 * that projection to Metis' visual rhythm: a centred message lane, right-sided
 * user bubbles, assistant turns, and compact work rows between answers.
 * @module @dsh-portable/crew-ui/client/shell/ThreadView
 */
import { useMemo, useSyncExternalStore } from 'react';
import { IconChecklistOutline14, IconSparkle16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { foldThread } from "../state/thread.js";
import { useRuntime } from "../state/runtime.js";
import css from './ThreadView.module.css';
/** The conversation log for one session. */
export function ThreadView({ sessionId }) {
    const runtime = useRuntime();
    const { t } = runtime;
    const source = useMemo(() => {
        if (sessionId === undefined)
            return undefined;
        return runtime.chatFeed(sessionId);
    }, [runtime, sessionId]);
    const snapshot = useSyncExternalStore(source?.subscribe ?? (() => () => { }), source?.getSnapshot ?? (() => undefined), source?.getSnapshot ?? (() => undefined));
    const entries = useMemo(() => (snapshot === undefined ? [] : foldThread(snapshot.legacy.nodes)), [snapshot]);
    if (entries.length === 0) {
        return (_jsxs("div", { className: css.empty, children: [_jsx("span", { className: css.emptyMark, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsx("h2", { children: t('thread.empty') }), _jsx("p", { children: t('thread.emptyBody') })] }));
    }
    return (_jsx("div", { className: css.root, children: _jsx("ol", { className: css.lane, children: entries.map(entry => (_jsx("li", { className: css.entry, children: entry.kind === 'said'
                    ? entry.who === 'user'
                        ? (_jsx("article", { className: css.userTurn, children: _jsx("p", { className: css.userBubble, children: entry.text }) }))
                        : (_jsxs("article", { className: css.agentTurn, children: [_jsxs("header", { className: css.agentHeader, children: [_jsx("span", { className: css.agentAvatar, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsx("span", { children: t('thread.lead') })] }), _jsx("p", { className: css.agentText, children: entry.text })] }))
                    : entry.kind === 'work'
                        ? (_jsxs("div", { className: css.work, children: [_jsx("span", { className: css.workIcon, "aria-hidden": true, children: _jsx(IconChecklistOutline14, {}) }), _jsx("span", { children: t('thread.work', { count: entry.count }) })] }))
                        : (_jsxs("div", { className: css.note, role: "status", children: [_jsx(IconWarningOutline16, {}), _jsx("span", { children: entry.text })] })) }, entry.id))) }) }));
}
//# sourceMappingURL=ThreadView.js.map