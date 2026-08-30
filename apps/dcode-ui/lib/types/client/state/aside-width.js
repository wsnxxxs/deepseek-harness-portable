/** Persisted geometry for the workbench's preview sidebar (aside). */
/** Default and supported preview sidebar widths, in CSS pixels. */
export const ASIDE_WIDTH = {
    default: 320,
    min: 260,
    max: 800,
};
/** Browser preference used across workbench launches. */
export const ASIDE_WIDTH_STORAGE_KEY = 'dcode.asideWidth';
/** Keep an arbitrary width inside the supported preview sidebar range. */
export function clampAsideWidth(width) {
    if (!Number.isFinite(width))
        return ASIDE_WIDTH.default;
    return Math.min(ASIDE_WIDTH.max, Math.max(ASIDE_WIDTH.min, Math.round(width)));
}
/** Read the last preview sidebar width, falling back when storage is unavailable. */
export function readAsideWidth() {
    try {
        const stored = globalThis.localStorage?.getItem(ASIDE_WIDTH_STORAGE_KEY);
        return stored === null || stored === undefined
            ? ASIDE_WIDTH.default
            : clampAsideWidth(Number(stored));
    }
    catch {
        return ASIDE_WIDTH.default;
    }
}
/** Save a preview sidebar width without making storage availability affect resizing. */
export function writeAsideWidth(width) {
    try {
        globalThis.localStorage?.setItem(ASIDE_WIDTH_STORAGE_KEY, String(clampAsideWidth(width)));
    }
    catch {
        // The current launch remains resizable in storage-denied browser profiles.
    }
}
//# sourceMappingURL=aside-width.js.map