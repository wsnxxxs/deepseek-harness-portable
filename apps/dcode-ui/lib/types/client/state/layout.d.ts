/**
 * Width classes the workbench frame lays itself out against.
 *
 * The frame has three panels competing for one row — the session rail, the
 * conversation column and the floating details card — and which of them fit
 * is a question about the frame's own width, not the viewport's: the surface
 * is mounted into a host slot, and on the desktop shell that slot is the
 * window, but nothing in this package may assume it.
 *
 * So the class is resolved from a measured element, and everything that
 * branches on it — the panel fit below, the drawer treatment in the frame's
 * stylesheet, the top bar's condensed chrome — reads the one class rather
 * than repeating a breakpoint of its own.
 * @module @dsh-portable/dcode-ui/client/state/layout
 */
/** How much room the frame has, in the classes the layout branches on. */
export type LayoutSize = 'compact' | 'medium' | 'wide';
/**
 * Inclusive lower bound of each class, in CSS pixels of the frame's width.
 *
 * `medium` is the width at which the rail can dock without squeezing the
 * conversation below a readable column; `wide` is the width at which the
 * details card also fits beside it, in the gutter the reading measure leaves
 * rather than on top of the text.
 */
export declare const LAYOUT_BREAKPOINTS: {
    readonly medium: 900;
    readonly wide: 1400;
};
/**
 * Classify a frame width.
 * @param width - the frame's width in CSS pixels.
 * @returns the class that width falls in; a non-finite or absent measurement
 * falls back to the middle class rather than collapsing the panels.
 */
export declare function resolveLayoutSize(width: number): LayoutSize;
/** Whether each panel is showing. */
export interface PanelFit {
    readonly railOpen: boolean;
    readonly asideOpen: boolean;
}
/**
 * What each class opens on its own.
 *
 * Compact hands the whole frame to the conversation and leaves both panels to
 * be summoned; medium docks the rail; wide adds the details card. These are
 * defaults, not rules — the operator's own toggles win until the class
 * changes underneath them.
 */
export declare const LAYOUT_FIT: Record<LayoutSize, PanelFit>;
/** A panel pair and whether the operator has overridden either one. */
export interface PanelState extends PanelFit {
    readonly railPinned: boolean;
    readonly asidePinned: boolean;
}
/**
 * Re-fit the panels when the frame crosses into another width class.
 *
 * Width decides until the operator does: a panel they have not touched at
 * this width follows the class default, and one they have toggled keeps the
 * value they gave it. Compact is the exception — under {@link
 * LAYOUT_BREAKPOINTS}.medium there is no room to hold a panel open over the
 * conversation, so entering it closes both and forgets the pins, which is
 * also what makes widening back out restore the defaults.
 * @param size - the class the frame has just entered.
 * @param current - the panels as they stand.
 * @returns the panels as the new class wants them.
 */
export declare function fitPanels(size: LayoutSize, current: PanelState): PanelState;
/**
 * The class to start in before the frame has been measured.
 * @returns the class the window suggests, or the unmeasured fallback off-DOM.
 */
export declare function initialLayoutSize(): LayoutSize;
/**
 * Track the width class of one element.
 *
 * Observing the element rather than listening for window resizes is what
 * makes the surface adapt to a pane that changes width without the window
 * doing so — a devtools split, a host sidebar, a zoom change. The observer
 * delivers an initial record on subscribe, so the first class is measured
 * rather than assumed.
 * @param node - the frame element, or null before it mounts.
 * @returns the current class.
 */
export declare function useLayoutSize(node: HTMLElement | null): LayoutSize;
//# sourceMappingURL=layout.d.ts.map