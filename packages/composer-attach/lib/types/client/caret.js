/**
 * Where a launcher-opened `@` menu should insert.
 *
 * The trigger pipeline speaks *detect* coordinates: every reference chip counts
 * as exactly one character (U+FFFC), because a chip is opaque to trigger
 * detection. `InputState.draft` is the other projection — the clipboard one,
 * where a chip expands to its full `@path/to/file` text. The two lengths differ
 * as soon as the draft holds a chip, and a span in the wrong coordinate space
 * fails the editor's span guard, so the insert silently does nothing.
 *
 * `InputState` publishes each chip's clipboard offset and length, which is all
 * the arithmetic below needs. The composer keyboard's own `caretSpan()` would
 * answer this directly, but it is package-internal to the conversation UI and
 * never crosses a plugin boundary — and its documented fallback for an absent
 * selection is exactly the collapsed document-end span computed here.
 * @module @dsh-portable/composer-attach/client/caret
 */
/**
 * Length of the composer document in detect coordinates.
 * @param draft - the clipboard-text projection (`InputState.draft`).
 * @param occurrences - the draft's reference chips (`InputState.occurrences`).
 * @returns the detect-projection length.
 */
export function detectLength(draft, occurrences) {
    let length = draft.length;
    for (const occurrence of occurrences)
        length -= occurrence.length - 1;
    return length;
}
/**
 * The collapsed insertion span a composer entry hands to the trigger pipeline.
 * @param draft - the clipboard-text projection.
 * @param occurrences - the draft's reference chips.
 * @param draftRev - the input machine's revision, stamped for pick-time CAS.
 * @returns a collapsed span at the end of the document.
 */
export function documentEndSpan(draft, occurrences, draftRev) {
    const end = detectLength(draft, occurrences);
    return { start: end, end, draftRev };
}
//# sourceMappingURL=caret.js.map