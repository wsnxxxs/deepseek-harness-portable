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
import { useEffect, useState } from 'react';
/**
 * Inclusive lower bound of each class, in CSS pixels of the frame's width.
 *
 * `medium` is the width at which the rail can dock without squeezing the
 * conversation below a readable column; `wide` is the width at which the
 * details card also fits beside it, in the gutter the reading measure leaves
 * rather than on top of the text.
 */
export const LAYOUT_BREAKPOINTS = {
    medium: 900,
    wide: 1400,
};
/** Fallback class for a frame that has not been measured yet. */
const UNMEASURED = 'medium';
/**
 * Classify a frame width.
 * @param width - the frame's width in CSS pixels.
 * @returns the class that width falls in; a non-finite or absent measurement
 * falls back to the middle class rather than collapsing the panels.
 */
export function resolveLayoutSize(width) {
    if (!Number.isFinite(width) || width <= 0)
        return UNMEASURED;
    if (width >= LAYOUT_BREAKPOINTS.wide)
        return 'wide';
    if (width >= LAYOUT_BREAKPOINTS.medium)
        return 'medium';
    return 'compact';
}
/**
 * What each class opens on its own.
 *
 * Compact hands the whole frame to the conversation and leaves both panels to
 * be summoned; medium docks the rail; wide adds the details card. These are
 * defaults, not rules — the operator's own toggles win until the class
 * changes underneath them.
 */
export const LAYOUT_FIT = {
    compact: { railOpen: false, asideOpen: false },
    medium: { railOpen: true, asideOpen: false },
    wide: { railOpen: true, asideOpen: true },
};
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
export function fitPanels(size, current) {
    if (size === 'compact') {
        return { railOpen: false, asideOpen: false, railPinned: false, asidePinned: false };
    }
    const fit = LAYOUT_FIT[size];
    return {
        railOpen: current.railPinned ? current.railOpen : fit.railOpen,
        asideOpen: current.asidePinned ? current.asideOpen : fit.asideOpen,
        railPinned: current.railPinned,
        asidePinned: current.asidePinned,
    };
}
/**
 * The class to start in before the frame has been measured.
 * @returns the class the window suggests, or the unmeasured fallback off-DOM.
 */
export function initialLayoutSize() {
    if (typeof window === 'undefined')
        return UNMEASURED;
    return resolveLayoutSize(window.innerWidth);
}
/**
 * Width of an element as the observer reported it.
 * @param entry - one resize record.
 * @returns the border-box inline size, falling back to the content rect on an
 * engine that does not report box sizes.
 */
function inlineSizeOf(entry) {
    const box = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : undefined;
    return box?.inlineSize ?? entry.contentRect.width;
}
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
export function useLayoutSize(node) {
    const [size, setSize] = useState(initialLayoutSize);
    useEffect(() => {
        if (node === null)
            return undefined;
        if (typeof ResizeObserver === 'undefined') {
            // No observer: the window is the only width signal available, and on
            // this shell the frame spans it.
            const onResize = () => { setSize(resolveLayoutSize(node.clientWidth || window.innerWidth)); };
            onResize();
            window.addEventListener('resize', onResize);
            return () => { window.removeEventListener('resize', onResize); };
        }
        const observer = new ResizeObserver((entries) => {
            const entry = entries[entries.length - 1];
            if (entry !== undefined)
                setSize(resolveLayoutSize(inlineSizeOf(entry)));
        });
        observer.observe(node);
        return () => { observer.disconnect(); };
    }, [node]);
    return size;
}
//# sourceMappingURL=layout.js.map