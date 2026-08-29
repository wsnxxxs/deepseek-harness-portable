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
import { useId, useState } from 'react';
import { IconBrowseOutline16, IconChecklistOutline14, IconChevronRightOutline14, IconCodeOutline16, IconEditOutline16, IconSearchOutline16, IconSkillOutline16, IconSparkle16, IconUserOutline16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { Spinner, ui } from "../shell/ui.js";
import { AnsiOutput, OutputToolbar } from "./AnsiOutput.js";
import { resultText, summarizeTool } from "./tools.js";
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
export function ToolCard({ block, onInspect }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const contentId = useId();
    // Wrap is per card and per session: an operator reading a wide table turns
    // it off once, and the next card they open is a stack trace that wants it on.
    const [wrap, setWrap] = useState(true);
    const settled = isSettled(block);
    const name = settled ? block.call?.name ?? 'tool' : block.name;
    const argsRaw = settled ? block.call?.argsRaw : block.argsRaw;
    const summary = summarizeTool(name, argsRaw);
    const failed = settled && block.isError;
    const output = settled ? resultText(block.content) : '';
    const verb = failed
        ? t('chat.failed')
        : settled
            ? t('chat.ran')
            : t('chat.running');
    return (_jsxs("div", { className: css.group, children: [_jsxs("div", { className: css.card, children: [_jsxs("button", { type: "button", className: `${css.head} ${ui.cardHeader}`, "aria-expanded": open, "aria-controls": contentId, onClick: () => {
                            setOpen(value => !value);
                            onInspect?.(block.callId);
                        }, children: [_jsx("span", { className: `${css.glyph} ${failed ? css.error : ''}`, "aria-hidden": true, children: settled ? failed ? _jsx(IconWarningOutline16, {}) : _jsx(Glyph, { kind: summary.kind }) : _jsx(Spinner, {}) }), _jsx("span", { className: `${css.verb} ${failed ? css.error : ''}`, children: verb }), _jsx("span", { className: css.detail, children: summary.detail === '' ? name : summary.detail }), _jsx(IconChevronRightOutline14, { className: `${css.chevron} ${open ? css.chevronOpen : ''}` })] }), open
                        ? (_jsxs("div", { className: css.body, id: contentId, children: [argsRaw === undefined || argsRaw.trim() === ''
                                    ? null
                                    : (_jsxs(_Fragment, { children: [_jsx("span", { className: css.bodyLabel, children: t('details.arguments') }), _jsx("pre", { className: css.output, tabIndex: 0, role: "region", "aria-label": t('details.arguments'), children: argsRaw })] })), settled
                                    ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: css.bodyRow, children: [_jsx("span", { className: css.bodyLabel, children: t('details.output') }), output === '' ? null : _jsx(OutputToolbar, { text: output, wrap: wrap, onWrap: setWrap })] }), output === ''
                                                ? _jsx("pre", { className: css.output, tabIndex: 0, role: "region", "aria-label": t('details.output'), children: "\u2014" })
                                                : (_jsx(AnsiOutput, { text: output, wrap: wrap, className: failed ? css.error : undefined }))] }))
                                    : null] }))
                        : null] }), block.subCalls.length === 0
                ? null
                : (_jsx("div", { className: css.children, children: block.subCalls.map(child => (_jsx(ToolCard, { block: child, onInspect: onInspect }, child.callId))) }))] }));
}
//# sourceMappingURL=ToolCard.js.map