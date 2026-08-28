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
/** Props of the output block. */
export interface AnsiOutputProps {
    readonly text: string;
    /** Soft-wrap long lines instead of scrolling them horizontally. */
    readonly wrap: boolean;
    /** Extra class, so a caller can mark the block as failed output. */
    readonly className?: string;
}
/** Styled terminal output. */
export declare function AnsiOutput({ text, wrap, className }: AnsiOutputProps): import("react").JSX.Element;
/** Props of the output toolbar. */
export interface OutputToolbarProps {
    readonly text: string;
    readonly wrap: boolean;
    readonly onWrap: (wrap: boolean) => void;
}
/**
 * Copy and wrap controls for one output block.
 *
 * Copy takes the *stripped* text: what reaches the clipboard is what the
 * operator can read on screen, not the escape sequences behind it.
 */
export declare function OutputToolbar({ text, wrap, onWrap }: OutputToolbarProps): import("react").JSX.Element;
//# sourceMappingURL=AnsiOutput.d.ts.map