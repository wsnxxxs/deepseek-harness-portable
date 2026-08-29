/** Persisted geometry for the workbench's session sidebar. */

/** Default and supported sidebar widths, in CSS pixels. */
export const RAIL_WIDTH = {
  default: 240,
  min: 200,
  max: 420,
} as const

/** Browser preference used across workbench launches. */
export const RAIL_WIDTH_STORAGE_KEY = 'dcode.railWidth'

/** Keep an arbitrary width inside the supported sidebar range. */
export function clampRailWidth(width: number): number {
  if (!Number.isFinite(width)) return RAIL_WIDTH.default
  return Math.min(RAIL_WIDTH.max, Math.max(RAIL_WIDTH.min, Math.round(width)))
}

/** Read the last sidebar width, falling back when storage is unavailable. */
export function readRailWidth(): number {
  try {
    const stored = globalThis.localStorage?.getItem(RAIL_WIDTH_STORAGE_KEY)
    return stored === null || stored === undefined
      ? RAIL_WIDTH.default
      : clampRailWidth(Number(stored))
  } catch {
    return RAIL_WIDTH.default
  }
}

/** Save a sidebar width without making storage availability affect resizing. */
export function writeRailWidth(width: number): void {
  try {
    globalThis.localStorage?.setItem(RAIL_WIDTH_STORAGE_KEY, String(clampRailWidth(width)))
  } catch {
    // The current launch remains resizable in storage-denied browser profiles.
  }
}
