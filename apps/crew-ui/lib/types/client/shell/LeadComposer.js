import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The Metis-style composer for the mission's current thread.
 *
 * Draft and submission still belong to DSH's Conversation input service. The
 * richer shell is presentation only, which keeps a draft intact when the
 * operator moves between Crew and another surface.
 * @module @dsh-portable/crew-ui/client/shell/LeadComposer
 */
import { useSyncExternalStore } from 'react';
import { IconAgentPresetOutline16, IconPaperclipOutline16, IconPlusOutline16, IconSendOutline14, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import css from './LeadComposer.module.css';
/** Send a message to the session in view. */
export function LeadComposer({ sessionId }) {
    const runtime = useRuntime();
    const { t } = runtime;
    const input = runtime.input(sessionId);
    const state = useSyncExternalStore(input?.subscribe ?? (() => () => { }), input?.getSnapshot ?? (() => undefined), input?.getSnapshot ?? (() => undefined));
    // Without the Conversation service there is nothing to type into; showing a
    // dead box would be worse than showing none.
    if (input === undefined)
        return null;
    const text = state?.text ?? '';
    const busy = state?.busy === true;
    const submit = () => {
        if (busy || text.trim() === '')
            return;
        void input.submit();
    };
    const onKeyDown = (event) => {
        // Enter sends, Shift+Enter breaks the line: the same contract the official
        // composer uses, so muscle memory carries across surfaces.
        if (event.key !== 'Enter' || event.shiftKey)
            return;
        event.preventDefault();
        submit();
    };
    return (_jsx("div", { className: css.root, children: _jsxs("div", { className: css.card, children: [_jsx("textarea", { className: css.input, value: text, rows: 3, placeholder: t('thread.placeholder'), "aria-label": t('thread.placeholder'), onChange: (event) => { input.setText(event.target.value); }, onKeyDown: onKeyDown }), _jsxs("div", { className: css.toolbar, children: [_jsx("button", { type: "button", className: css.toolButton, disabled: true, title: t('thread.addContext'), "aria-label": t('thread.addContext'), children: _jsx(IconPlusOutline16, {}) }), _jsx("button", { type: "button", className: css.toolButton, disabled: true, title: t('thread.attach'), "aria-label": t('thread.attach'), children: _jsx(IconPaperclipOutline16, {}) }), _jsxs("span", { className: css.presetChip, children: [_jsx(IconAgentPresetOutline16, {}), t('thread.lead')] }), _jsx("span", { className: css.hint, children: t('thread.composerHint') }), _jsx("button", { type: "button", className: css.send, disabled: busy || text.trim() === '', "aria-label": t('thread.send'), title: t('thread.send'), onClick: submit, children: _jsx(IconSendOutline14, {}) })] })] }) }));
}
//# sourceMappingURL=LeadComposer.js.map