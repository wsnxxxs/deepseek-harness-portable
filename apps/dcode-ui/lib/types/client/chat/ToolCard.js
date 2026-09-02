import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * One tool execution, closed to a single line.
 *
 * A card head answers "what did it just do" without scrolling; expanding it
 * reveals the arguments and the full output, and nested Code Dispatch calls
 * render as their own cards inside their parent. The card is the same for a
 * running and a settled call, so a call does not jump position when it
 * completes.
 * @module @dsh-portable/dcode-ui/client/chat/ToolCard
 */
import { useEffect, useId, useRef, useState } from 'react';
import { IconBrowseOutline16, IconChecklistOutline14, IconChevronRightOutline14, IconCodeOutline16, IconEditOutline16, IconSearchOutline16, IconSkillOutline16, IconSparkle16, IconUserOutline16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { shimmerActive, Spinner, ui } from "../shell/ui.js";
import { AnsiOutput, OutputToolbar } from "./AnsiOutput.js";
import { formatToolDuration, resultText, summarizeTool, toolChangeStats, toolDurationMs } from "./tools.js";
import css from './ToolCard.module.css';
/** Glyph per card-head vocabulary word. */
function Glyph({ kind }) {
    switch (kind) {
        case 'run': return _jsx(IconCodeOutline16, {});
        case 'read': return _jsx(IconBrowseOutline16, {});
        case 'write':
        case 'edit': return _jsx(IconEditOutline16, {});
        case 'search': return _jsx(IconSearchOutline16, {});
        case 'web': return _jsx(IconBrowseOutline16, {});
        case 'agent': return _jsx(IconUserOutline16, {});
        case 'memory': return _jsx(IconSparkle16, {});
        case 'plan': return _jsx(IconChecklistOutline14, { size: 16 });
        case 'skill': return _jsx(IconSkillOutline16, {});
        default: return _jsx(IconSparkle16, {});
    }
}
/** Whether a block is a settled result rather than a still-running call. */
function isSettled(block) {
    return 'isError' in block;
}
/** A compact, expandable tool-execution card. */
export function ToolCard({ block, activity = false }) {
    const t = useT();
    const settled = isSettled(block);
    const name = settled ? block.call?.name ?? 'tool' : block.name;
    const argsRaw = settled ? block.call?.argsRaw : block.argsRaw;
    const summary = summarizeTool(name, argsRaw);
    const [open, setOpen] = useState(() => !activity && settled && (block.isError || summary.mutating));
    const contentId = useId();
    // Wrap is per card and per session: an operator reading a wide table turns
    // it off once, and the next card they open is a stack trace that wants it on.
    const [wrap, setWrap] = useState(true);
    const startedAt = useRef(block.time);
    const [now, setNow] = useState(Date.now);
    const failed = settled && block.isError;
    const output = settled ? resultText(block.content) : '';
    const duration = settled
        ? toolDurationMs(block)
        : Math.max(0, now - startedAt.current);
    const changes = settled && summary.mutating ? toolChangeStats(block) : undefined;
    const emphasized = summary.mutating || summary.kind === 'run';
    useEffect(() => {
        if (settled)
            return undefined;
        const timer = window.setInterval(() => { setNow(Date.now()); }, 1000);
        return () => { window.clearInterval(timer); };
    }, [settled]);
    useEffect(() => {
        if (failed)
            setOpen(true);
    }, [failed]);
    const verb = failed
        ? t('chat.failed')
        : settled
            ? t('chat.ran')
            : t('chat.running');
    return (_jsxs("div", { className: css.group, "data-tool-call-id": block.callId, "data-tool-view": activity ? 'activity' : 'card', children: [_jsxs("div", { className: `${css.card} ${activity ? css.activityCard : ''} ${emphasized ? css.cardEmphasized : ''}`, children: [_jsx("div", { className: `${css.head} ${activity ? css.activityHead : ''} ${ui.cardHeader} ${shimmerActive(!settled)}`, children: _jsxs("button", { type: "button", className: css.headMain, "aria-expanded": open, "aria-controls": contentId, onClick: () => { setOpen(value => !value); }, children: [_jsx("span", { className: `${css.glyph} ${!settled ? css.runningGlyph : ''} ${failed ? css.error : ''}`, "aria-hidden": true, children: settled ? failed ? _jsx(IconWarningOutline16, {}) : _jsx(Glyph, { kind: summary.kind }) : _jsx(Spinner, {}) }), _jsx("span", { className: `${css.verb} ${failed ? css.error : ''}`, children: activity ? t('chat.activity.toolCall') : verb }), activity ? _jsx("span", { className: css.activityName, children: name }) : null, _jsx("span", { className: css.detail, children: summary.detail === '' ? activity ? '' : name : summary.detail }), changes === undefined
                                    ? null
                                    : (_jsxs("span", { className: css.changes, "aria-label": `${changes.additions} lines added, ${changes.deletions} lines removed`, children: [_jsxs("span", { className: css.additions, children: ["+", changes.additions] }), _jsxs("span", { className: css.deletions, children: ["\u2212", changes.deletions] })] })), duration === undefined
                                    ? null
                                    : _jsxs("span", { className: css.duration, children: [formatToolDuration(duration), settled ? '' : '…'] }), _jsx(IconChevronRightOutline14, { className: `${css.chevron} ${open ? css.chevronOpen : ''}` })] }) }), _jsx("div", { className: `${css.disclosure} ${open ? css.disclosureOpen : ''}`, "aria-hidden": !open, children: _jsx("div", { className: css.disclosureClip, children: _jsxs("div", { className: css.body, id: contentId, children: [argsRaw === undefined || argsRaw.trim() === ''
                                        ? null
                                        : (_jsxs(_Fragment, { children: [_jsx("span", { className: css.bodyLabel, children: t('details.arguments') }), _jsx("pre", { className: css.output, tabIndex: 0, role: "region", "aria-label": t('details.arguments'), children: argsRaw })] })), settled
                                        ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: css.bodyRow, children: [_jsx("span", { className: css.bodyLabel, children: t('details.output') }), duration === undefined ? null : _jsx("span", { className: css.toolbarDuration, children: formatToolDuration(duration) }), output === '' ? null : _jsx(OutputToolbar, { text: output, wrap: wrap, onWrap: setWrap })] }), output === ''
                                                    ? _jsx("pre", { className: css.output, tabIndex: 0, role: "region", "aria-label": t('details.output'), children: "\u2014" })
                                                    : (_jsx(AnsiOutput, { text: output, wrap: wrap, className: failed ? css.error : undefined }))] }))
                                        : null] }) }) })] }), block.subCalls.length === 0
                ? null
                : (_jsx("div", { className: css.children, children: block.subCalls.map(child => (_jsx(ToolCard, { block: child, activity: activity }, child.callId))) }))] }));
}
//# sourceMappingURL=ToolCard.js.map