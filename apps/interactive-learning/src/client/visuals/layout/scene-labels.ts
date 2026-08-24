/** Small geometry helpers for labels that sit outside scene_2d shapes. */
import { measureText } from './text-metrics.ts'
import type { Point } from '../core/types.ts'

export interface LabelRect {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface LabelBounds {
  left: number
  right: number
  top: number
  bottom: number
}

const LABEL_FONT_SIZE = 12
const LABEL_LINE_HEIGHT = 17
const LABEL_GAP = 12

const labelRect = (center: Point, text: string): LabelRect => {
  const width = measureText(text, LABEL_FONT_SIZE) + 8
  const height = LABEL_LINE_HEIGHT
  return {
    x1: center.x - width / 2,
    y1: center.y - height / 2,
    x2: center.x + width / 2,
    y2: center.y + height / 2,
  }
}

function overlapArea(a: LabelRect, b: LabelRect): number {
  return Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1))
    * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1))
}

function outsideArea(rect: LabelRect, bounds: LabelBounds): number {
  return Math.max(0, bounds.left - rect.x1)
    + Math.max(0, rect.x2 - bounds.right)
    + Math.max(0, bounds.top - rect.y1)
    + Math.max(0, rect.y2 - bounds.bottom)
}

/**
 * Pick a polygon label position that has room around nearby geometry.
 *
 * The old fixed `centroid + 18px` rule only worked when the space below every
 * polygon was empty. Candidates are tried above and below the shape first,
 * then at the sides and finally inside it. A small overlap score keeps the
 * helper deterministic while allowing a tight scene to remain labelled.
 */
export function polygonLabelAnchor(
  points: readonly Point[],
  text: string,
  occupied: readonly LabelRect[],
  bounds: LabelBounds,
): Point {
  if (points.length === 0) return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 }
  const minX = Math.min(...points.map(point => point.x))
  const maxX = Math.max(...points.map(point => point.x))
  const minY = Math.min(...points.map(point => point.y))
  const maxY = Math.max(...points.map(point => point.y))
  const center = points.reduce((total, point) => ({ x: total.x + point.x / points.length, y: total.y + point.y / points.length }), { x: 0, y: 0 })
  const halfLabelWidth = (measureText(text, LABEL_FONT_SIZE) + 8) / 2
  const clampX = (x: number): number => Math.max(bounds.left + halfLabelWidth, Math.min(bounds.right - halfLabelWidth, x))
  const candidates: Point[] = [
    { x: clampX(center.x), y: maxY + LABEL_GAP + LABEL_LINE_HEIGHT / 2 },
    { x: clampX(center.x), y: minY - LABEL_GAP - LABEL_LINE_HEIGHT / 2 },
    { x: clampX(maxX + LABEL_GAP + halfLabelWidth), y: center.y },
    { x: clampX(minX - LABEL_GAP - halfLabelWidth), y: center.y },
    { x: clampX(center.x), y: center.y },
  ]
  let best = candidates[candidates.length - 1] as Point
  let bestScore = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    const rect = labelRect(candidate, text)
    // Leaving the plot is more disruptive than sharing a few pixels with a
    // nearby line, so keep a strong but finite penalty instead of rejecting a
    // label outright at the edge of a scene.
    const score = outsideArea(rect, bounds) * 100 + occupied.reduce((total, other) => total + overlapArea(rect, other), 0)
    if (score < bestScore) {
      best = candidate
      bestScore = score
      if (score === 0) break
    }
  }
  return best
}
