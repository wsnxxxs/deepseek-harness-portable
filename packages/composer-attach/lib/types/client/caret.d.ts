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
/** The clipboard-projection extent of one reference chip. */
export interface ChipExtent {
    /** Length in the clipboard projection; one character in the detect projection. */
    readonly length: number;
}
/**
 * Length of the composer document in detect coordinates.
 * @param draft - the clipboard-text projection (`InputState.draft`).
 * @param occurrences - the draft's reference chips (`InputState.occurrences`).
 * @returns the detect-projection length.
 */
export declare function detectLength(draft: string, occurrences: readonly ChipExtent[]): number;
/** A collapsed insertion point in the composer's detect projection. */
export interface AttachSpan {
    readonly start: number;
    readonly end: number;
    /** The input machine's revision, stamped so the editor can CAS the edit. */
    readonly draftRev: number;
}
/**
 * The collapsed insertion span a composer entry hands to the trigger pipeline.
 * @param draft - the clipboard-text projection.
 * @param occurrences - the draft's reference chips.
 * @param draftRev - the input machine's revision, stamped for pick-time CAS.
 * @returns a collapsed span at the end of the document.
 */
export declare function documentEndSpan(draft: string, occurrences: readonly ChipExtent[], draftRev: number): AttachSpan;
//# sourceMappingURL=caret.d.ts.map