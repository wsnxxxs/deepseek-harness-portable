/**
 * ANSI escape-sequence reader for tool output.
 *
 * Agents run real programs, and real programs write colour. Without a reader
 * their output arrives as `ESC[32m` litter in the middle of the text; with
 * one it arrives as the log the operator would have seen in their own
 * terminal. This is deliberately a *reader*, not a terminal: no cursor
 * addressing, no scroll region, no alternate screen. What it does model is
 * the small part of a terminal that changes what the bytes mean — SGR styling
 * and the carriage return every progress bar is built on.
 *
 * Everything else it recognises, it discards, which is the point: an
 * unrecognised sequence left in the stream is worse than no colour at all.
 *
 * One pass, no backtracking, no per-character allocation: a run of text
 * between two escapes is sliced once and appended to the open span when its
 * style has not changed.
 * @module @dsh-portable/dcode-ui/client/chat/ansi
 */
/** SGR state, resolved to CSS values. */
interface Style {
    fg?: string;
    bg?: string;
    bold?: boolean;
    dim?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    inverse?: boolean;
}
/** One styled run of text inside a line. */
export interface AnsiSpan extends Style {
    readonly text: string;
}
/** A parsed output: styled lines, and whether the reader stopped early. */
export interface AnsiDocument {
    readonly lines: readonly (readonly AnsiSpan[])[];
    /** True when a limit cut the text short; the caller should say so. */
    readonly truncated: boolean;
}
/** Reader bounds. Both default generously; both exist to bound the DOM. */
export interface AnsiLimits {
    /** Stop after this many lines. */
    readonly maxLines?: number;
    /** Stop after this many characters of visible text. */
    readonly maxChars?: number;
}
/**
 * Whether a string carries anything this reader would change.
 *
 * The fast path exists for the common case: most tool output is plain, and
 * plain text should reach the DOM as one text node, not as a span list.
 * @param text - candidate output.
 * @returns true when parsing would do something.
 */
export declare function hasAnsi(text: string): boolean;
/**
 * One of the 256 xterm colours.
 *
 * The first sixteen stay themeable palette references; the cube and the
 * greyscale ramp carry their own absolute values, exactly as a terminal
 * would render them.
 * @param index - colour index 0..255.
 * @returns a CSS colour value.
 */
export declare function xtermColor(index: number): string;
/**
 * Apply one SGR parameter list to a style.
 * @param style - the style in force.
 * @param params - parameters between `ESC[` and `m`.
 * @returns the resulting style; the input is not mutated.
 */
export declare function applySgr(style: Style, params: readonly string[]): Style;
/**
 * Read text with escape sequences into styled lines.
 *
 * A carriage return clears the line written so far, which is how progress
 * bars, spinners and download counters collapse to their final frame instead
 * of stacking one row per redraw.
 * @param text - raw tool output.
 * @param limits - reader bounds; see {@link AnsiLimits}.
 * @returns the styled lines and whether a limit stopped the read.
 */
export declare function parseAnsi(text: string, limits?: AnsiLimits): AnsiDocument;
/**
 * The visible text, with every escape sequence resolved away.
 *
 * Used for copy: what lands on the clipboard is what the operator can read,
 * including the collapse of redrawn progress lines.
 * @param text - raw tool output.
 * @returns plain text.
 */
export declare function stripAnsi(text: string): string;
export {};
//# sourceMappingURL=ansi.d.ts.map