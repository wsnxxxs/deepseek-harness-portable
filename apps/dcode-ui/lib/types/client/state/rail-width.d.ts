/** Persisted geometry for the workbench's session sidebar. */
/** Default and supported sidebar widths, in CSS pixels. */
export declare const RAIL_WIDTH: {
    readonly default: 240;
    readonly min: 200;
    readonly max: 420;
};
/** Browser preference used across workbench launches. */
export declare const RAIL_WIDTH_STORAGE_KEY = "dcode.railWidth";
/** Keep an arbitrary width inside the supported sidebar range. */
export declare function clampRailWidth(width: number): number;
/** Read the last sidebar width, falling back when storage is unavailable. */
export declare function readRailWidth(): number;
/** Save a sidebar width without making storage availability affect resizing. */
export declare function writeRailWidth(width: number): void;
//# sourceMappingURL=rail-width.d.ts.map