import { jsx as _jsx } from "react/jsx-runtime";
/**
 * The composer's click path to a file or folder reference.
 *
 * The official composer already knows how to reference workspace files: typing
 * `@` opens the harness's own reference menu, with directory drill-down, quoted
 * paths, chips, and model serialization. What it has no *click* path to is that
 * menu. The `+` at the head of the same row is upstream's **command** launcher
 * — it seeds the `/` source alone — so an operator who has not learned the `@`
 * syntax has no way in, and the composer's own placeholder is the only thing
 * that ever mentions it.
 *
 * This button is that way in. It reimplements no file discovery: it opens the
 * very same `@` menu, at the end of the draft, through the trigger pipeline's
 * own `toggleSource`. Candidates, drill-down, insertion, and serialization all
 * stay upstream's.
 * @module @dsh-portable/composer-attach/client/AttachButton
 */
import { useEffect } from 'react';
import { ReferenceIcon, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { documentEndSpan } from "./caret.js";
import css from './AttachButton.module.css';
/** Keep the composer focused so the menu opens over a live editor. */
function keepFocus(event) {
    event.preventDefault();
}
/** The attach control, rendered in the composer tool row. */
export function ComposerAttachButton(props) {
    const input = props.useInput(state => state);
    const { t, reportSpan } = props;
    const span = documentEndSpan(input.draft, input.occurrences, input.draftRev);
    // Republished on every input revision, so a popup opened from the `+` menu
    // settles against the same document the operator was looking at.
    useEffect(() => reportSpan(span), [reportSpan, span.start, span.end, span.draftRev]);
    // The editor refuses a reference insert outside these two phases, so a
    // button that could only open a menu with nowhere to put its answer stays
    // inert rather than opening one.
    const ready = input.phase === 'plain' || input.phase === 'claimed';
    return (_jsx(Tooltip, { label: t('attach.label'), side: "top", delayMs: 500, children: _jsx("button", { type: "button", className: css.attach, "aria-label": t('attach.label'), "aria-haspopup": "menu", disabled: !ready, onMouseDown: keepFocus, onClick: () => {
                props.openReferences(span, input.draft.trim() === '' ? 'leading' : 'inline');
            }, children: _jsx(ReferenceIcon, { kind: "file", size: 16 }) }) }));
}
//# sourceMappingURL=AttachButton.js.map