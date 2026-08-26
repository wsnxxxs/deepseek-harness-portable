/**
 * Geometry for the two-set Venn figure in `relation`.
 *
 * The figure used to be the last fixed canvas in the plugin: `viewBox="0 0 520
 * 180"`, circles pinned at cx 195 and 325 with r 78, and item rows written at
 * x 157 / 260 / 363 on a `68 + index * 17` ladder. Two things followed from
 * that, and neither was visible in the numbers themselves.
 *
 * The centres sat 130 apart with radii of 78, so the intersection lens was
 * 26px wide — while shared items were wrapped to 82px and drawn centred in it.
 * Every shared label overflowed the lens it was supposed to be inside, which
 * is the one thing the diagram exists to show.
 *
 * And the items were set at 10px. The type ramp puts the reading floor at 11px
 * and CJK labels inside figures at 13px, so a Chinese label — the common case
 * here — was drawn three steps below the size the rest of the plugin agrees is
 * legible.
 *
 * So the geometry is derived from the labels instead: each zone is measured,
 * the lens is made wide enough for what goes in it, and the radius is whatever
 * holds the taller of the two exclusive stacks.
 */
import { wrapLabel, type WrappedLabel } from './text-metrics.ts'

/** Item labels inside a figure are CJK-first, so they start at the 13px floor. */
export const VENN_FONT_SIZE = 13
export const VENN_LINE_HEIGHT = 19
/** Beyond this a zone stops listing and counts the remainder instead. */
export const VENN_MAX_ITEMS = 4

const LABEL_BAND = 30
const MARGIN = 14
const MIN_LENS = 58
const MIN_EXCLUSIVE = 76

export interface VennZoneLine {
  itemId: string
  text: string
}

export interface VennZone {
  /** Centre of the zone, in figure coordinates. */
  x: number
  lines: VennZoneLine[]
  /** Items the zone had no room to name. */
  overflow: number
  /** Baseline of the first line. */
  firstBaseline: number
}

export interface VennLayout {
  width: number
  height: number
  radius: number
  centreY: number
  leftCx: number
  rightCx: number
  labelY: number
  left: VennZone
  right: VennZone
  shared: VennZone
}

interface VennItem {
  id: string
  label: string
}

function zoneLines(items: readonly VennItem[], maxWidth: number): { lines: VennZoneLine[]; overflow: number; width: number } {
  const visible = items.slice(0, VENN_MAX_ITEMS)
  const lines: VennZoneLine[] = []
  let width = 0
  for (const item of visible) {
    const wrapped: WrappedLabel = wrapLabel(item.label, { fontSize: VENN_FONT_SIZE, maxWidth, maxLines: 2 })
    width = Math.max(width, wrapped.width)
    for (const text of wrapped.lines) lines.push({ itemId: item.id, text })
  }
  return { lines, overflow: items.length - visible.length, width }
}

/**
 * Size the figure around what each zone actually has to hold.
 *
 * `available` is the width the container can give the figure; the layout uses
 * it as a ceiling for wrapping, never as the canvas size, so a narrow column
 * produces a narrower figure rather than a clipped one.
 */
export function vennLayout(
  leftItems: readonly VennItem[],
  rightItems: readonly VennItem[],
  sharedItems: readonly VennItem[],
  available = 520,
): VennLayout {
  const ceiling = Math.max(260, Math.min(available, 640))
  const exclusiveCeiling = Math.max(MIN_EXCLUSIVE, ceiling * 0.26)
  const sharedCeiling = Math.max(MIN_LENS, ceiling * 0.2)

  const left = zoneLines(leftItems, exclusiveCeiling)
  const right = zoneLines(rightItems, exclusiveCeiling)
  const shared = zoneLines(sharedItems, sharedCeiling)

  const lens = Math.max(MIN_LENS, shared.width + 18)
  const exclusiveWidth = Math.max(MIN_EXCLUSIVE, left.width, right.width) + 20

  // The radius has to hold both the widest exclusive stack and the tallest one.
  const tallest = Math.max(left.lines.length, right.lines.length, shared.lines.length)
  const byHeight = (tallest * VENN_LINE_HEIGHT) / 2 + 26
  const radius = Math.max(66, byHeight, (exclusiveWidth + lens) / 2)

  // Centres this far apart leave an intersection exactly `lens` wide, and stay
  // far enough apart that neither circle swallows the other.
  const separation = Math.max(radius * 0.85, 2 * radius - lens)
  const leftCx = MARGIN + radius
  const rightCx = leftCx + separation
  const centreY = LABEL_BAND + radius
  const width = rightCx + radius + MARGIN
  const height = centreY + radius + MARGIN

  const position = (zone: { lines: VennZoneLine[]; overflow: number }, x: number): VennZone => ({
    x,
    lines: zone.lines,
    overflow: zone.overflow,
    // Centre the stack on the circle's own centre line.
    firstBaseline: centreY - ((zone.lines.length + (zone.overflow > 0 ? 1 : 0) - 1) * VENN_LINE_HEIGHT) / 2,
  })

  return {
    width: Math.round(width),
    height: Math.round(height),
    radius: Math.round(radius),
    centreY: Math.round(centreY),
    leftCx: Math.round(leftCx),
    rightCx: Math.round(rightCx),
    labelY: Math.round(LABEL_BAND - 8),
    // The three regions, taken straight off the circles: left-exclusive spans
    // [leftCx - r, rightCx - r], the lens spans [rightCx - r, leftCx + r], and
    // right-exclusive spans [leftCx + r, rightCx + r]. Each zone is centred in
    // its own span, so a label sits inside the region it belongs to.
    left: position(left, Math.round((leftCx + rightCx) / 2 - radius)),
    right: position(right, Math.round((leftCx + rightCx) / 2 + radius)),
    shared: position(shared, Math.round((leftCx + rightCx) / 2)),
  }
}
