/**
 * The sequential colour scale `field_2d` reads a scalar through.
 *
 * The previous scale swept hue from 235° to 15° and varied lightness by ±4%:
 * blue, cyan, green, yellow, red at essentially one weight. Three things were
 * wrong with it, and all three are about the reading rather than the look.
 *
 * Measured, its L* ran 40.3 → 79.5 → 77.9 → 85.2 → 57.7 — three reversals. So
 * two different values mapped to the same lightness (the value at 11% of the
 * range and the maximum came out 0.9 apart), which means the maximum of a
 * field was indistinguishable from a low value in greyscale, on a monochrome
 * display, and for a learner reading by brightness rather than hue.
 *
 * It also invented structure. A hue sweep crosses cyan and yellow, where the
 * eye resolves far more difference per unit of data than it does inside the
 * long green stretch, so a smooth gradient acquired bands the data does not
 * have — the learner reads a boundary where there is only a colour-space
 * artefact.
 *
 * Viridis fixes both: lightness is strictly monotonic across the whole range
 * (14.9 → 90.9), perceived difference is close to proportional to the data
 * difference, and it stays legible under the common forms of colour blindness.
 * The legend gradient is generated from these same stops rather than restated
 * in CSS, so the swatch cannot drift away from the field it explains.
 */

/** Viridis, sampled at ten evenly spaced stops. */
const VIRIDIS: readonly (readonly [number, number, number])[] = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
]

function channel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/**
 * The colour a normalised position in the scale is drawn at.
 *
 * `ratio` is clamped to 0–1; a non-finite ratio yields `transparent` so a hole
 * in a sampled grid reads as absent rather than as the bottom of the scale.
 */
export function colormapAt(ratio: number): string {
  if (!Number.isFinite(ratio)) return 'transparent'
  const clamped = Math.max(0, Math.min(1, ratio))
  const scaled = clamped * (VIRIDIS.length - 1)
  const index = Math.min(VIRIDIS.length - 2, Math.floor(scaled))
  const local = scaled - index
  const from = VIRIDIS[index] ?? VIRIDIS[0]!
  const to = VIRIDIS[index + 1] ?? from
  const red = channel(from[0] + (to[0] - from[0]) * local)
  const green = channel(from[1] + (to[1] - from[1]) * local)
  const blue = channel(from[2] + (to[2] - from[2]) * local)
  return `rgb(${String(red)} ${String(green)} ${String(blue)})`
}

/** The same scale as a CSS gradient, for the legend that explains it. */
export function colormapGradient(angle = '90deg'): string {
  const stops = VIRIDIS.map((_, index) => {
    const ratio = index / (VIRIDIS.length - 1)
    return `${colormapAt(ratio)} ${String(Math.round(ratio * 100))}%`
  })
  return `linear-gradient(${angle}, ${stops.join(', ')})`
}

/** Stop count, exported so a test can assert the scale is sampled, not guessed. */
export const COLORMAP_STOPS = VIRIDIS.length
