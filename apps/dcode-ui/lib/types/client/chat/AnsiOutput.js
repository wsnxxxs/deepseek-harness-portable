import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Terminal output, rendered.
 *
 * A tool's stdout arrives as bytes a terminal would have interpreted, so this
 * interprets them: colour, weight and underline become styling, and the
 * carriage returns behind every progress bar collapse to their last frame.
 * Output with no escapes in it takes a fast path to a single text node — the
 * common case must not pay for the uncommon one.
 * @module @dsh-portable/dcode-ui/client/chat/AnsiOutput
 */
import { useMemo } from 'react';
import { useT } from "../state/i18n.js";
import { hasAnsi, parseAnsi, stripAnsi } from "./ansi.js";
import { CopyButton } from "../shell/ui.js";
import css from './AnsiOutput.module.css';
/** Inline style for one span; colours are data, so they cannot be classes. */
function spanStyle(span) {
    const style = {};
    if (span.fg !== undefined)
        style.color = span.fg;
    if (span.bg !== undefined)
        style.background = span.bg;
    if (span.bold === true)
        style.fontWeight = 'var(--zx-weight-semibold)';
    if (span.dim === true)
        style.opacity = 0.65;
    if (span.italic === true)
        style.fontStyle = 'italic';
    if (span.underline === true || span.strike === true) {
        style.textDecorationLine = span.underline === true && span.strike === true
            ? 'underline line-through'
            : span.underline === true ? 'underline' : 'line-through';
    }
    return Object.keys(style).length === 0 ? undefined : style;
}
/** Styled terminal output. */
export function AnsiOutput({ text, wrap, className }) {
    const t = useT();
    const styled = hasAnsi(text);
    const document = useMemo(() => (styled ? parseAnsi(text) : undefined), [styled, text]);
    const body = document === undefined
        ? text
        : document.lines.map((spans, lineIndex) => (
        // eslint-disable-next-line react/no-array-index-key -- line order is the identity
        _jsxs("span", { children: [spans.map((span, spanIndex) => (_jsx("span", { style: spanStyle(span), children: span.text }, spanIndex))), lineIndex === document.lines.length - 1 ? null : '\n'] }, lineIndex)));
    return (_jsxs("pre", { className: `${css.output} ${wrap ? css.wrap : css.nowrap} ${className ?? ''}`, tabIndex: 0, role: "region", "aria-label": t('details.output'), children: [body, document?.truncated === true ? _jsx("span", { className: css.truncated, children: `\n${t('chat.outputTruncated')}` }) : null] }));
}
/**
 * Copy and wrap controls for one output block.
 *
 * Copy takes the *stripped* text: what reaches the clipboard is what the
 * operator can read on screen, not the escape sequences behind it.
 */
export function OutputToolbar({ text, wrap, onWrap }) {
    const t = useT();
    return (_jsxs("span", { className: css.toolbar, children: [_jsx("button", { type: "button", className: `${css.action} ${wrap ? css.actionOn : ''}`, "aria-pressed": wrap, onClick: () => { onWrap(!wrap); }, children: t('chat.wrap') }), _jsx(CopyButton, { text: stripAnsi(text), label: t('common.copy'), copiedLabel: t('common.copied') })] }));
}
//# sourceMappingURL=AnsiOutput.js.map