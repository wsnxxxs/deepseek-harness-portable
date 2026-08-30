/** Persisted geometry for the workbench's preview sidebar (aside). */
/** Default and supported preview sidebar widths, in CSS pixels. */
export declare const ASIDE_WIDTH: {
    readonly default: 320;
    readonly min: 260;
    readonly max: 800;
};
/** Browser preference used across workbench launches. */
export declare const ASIDE_WIDTH_STORAGE_KEY = "dcode.asideWidth";
/** Keep an arbitrary width inside the supported preview sidebar range. */
export declare function clampAsideWidth(width: number): number;
/** Read the last preview sidebar width, falling back when storage is unavailable. */
export declare function readAsideWidth(): number;
/** Save a preview sidebar width without making storage availability affect resizing. */
export declare function writeAsideWidth(width: number): void;
//# sourceMappingURL=aside-width.d.ts.map