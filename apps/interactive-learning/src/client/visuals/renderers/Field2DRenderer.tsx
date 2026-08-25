/** `field_2d`: scalar heatmaps and contours with optional vector arrows. */
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { compileMathExpression } from '../../../math-expression.ts'
import { formatNumber, interpolate, normalizedPosition, ticks } from '../core/format.ts'
import { FigureViewport } from '../core/shell-parts.tsx'
import type { ChartGeometry, Field2DContent, RendererProps } from '../core/types.ts'
import { chartGeometry } from '../layout/chart-geometry.ts'
import { useContainerWidth } from '../state/hooks.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/field-2d.module.css'

interface NumberGrid {
  columns: number
  rows: number
  values: number[]
}

interface VectorGrid {
  columns: number
  rows: number
  u: number[]
  v: number[]
}

interface Probe {
  x: number
  y: number
}

interface GridPoint {
  x: number
  y: number
  value: number
}

function sampleCount(value: number | undefined): number {
  return Math.max(2, Math.min(32, value ?? 15))
}

function scalarGrid(content: Field2DContent): NumberGrid | undefined {
  const scalar = content.scalar
  if (scalar?.samples !== undefined) return { ...scalar.samples, values: [...scalar.samples.values] }
  if (scalar?.expression === undefined) return undefined
  const columns = sampleCount(content.xAxis.samples)
  const rows = sampleCount(content.yAxis.samples)
  const evaluate = compileMathExpression(scalar.expression)
  const values = Array.from({ length: rows }).flatMap((_, row) => Array.from({ length: columns }, (_unused, column) => {
    const x = interpolate(content.xAxis.min, content.xAxis.max, column / Math.max(1, columns - 1))
    const y = interpolate(content.yAxis.min, content.yAxis.max, row / Math.max(1, rows - 1))
    return evaluate({ x, y })
  }))
  return { columns, rows, values }
}

function vectorGrid(content: Field2DContent): VectorGrid | undefined {
  const vector = content.vector
  if (vector?.samples !== undefined) return { ...vector.samples, u: [...vector.samples.u], v: [...vector.samples.v] }
  if (vector?.expression === undefined) return undefined
  const columns = sampleCount(content.xAxis.samples)
  const rows = sampleCount(content.yAxis.samples)
  const u = compileMathExpression(vector.expression.u)
  const v = compileMathExpression(vector.expression.v)
  const bindings = Array.from({ length: rows }).flatMap((_, row) => Array.from({ length: columns }, (_unused, column) => ({
    x: interpolate(content.xAxis.min, content.xAxis.max, column / Math.max(1, columns - 1)),
    y: interpolate(content.yAxis.min, content.yAxis.max, row / Math.max(1, rows - 1)),
  })))
  return { columns, rows, u: bindings.map(u), v: bindings.map(v) }
}

function scaleBounds(content: Field2DContent, grid: NumberGrid | undefined): { min: number; max: number } | undefined {
  if (grid === undefined) return undefined
  const finite = grid.values.filter(Number.isFinite)
  if (finite.length === 0) return undefined
  let min = content.scalar?.min ?? Math.min(...finite)
  let max = content.scalar?.max ?? Math.max(...finite)
  if (min === max) {
    const padding = Math.max(1, Math.abs(min) * 0.08)
    min -= padding
    max += padding
  }
  return { min, max }
}

function fieldColor(value: number, min: number, max: number): string {
  if (!Number.isFinite(value)) return 'transparent'
  const ratio = normalizedPosition(value, min, max)
  return `hsl(${String(Math.round(235 - ratio * 220))} 72% ${String(Math.round(52 + Math.abs(ratio - 0.5) * 8))}%)`
}

function pointFor(grid: NumberGrid, column: number, row: number, content: Field2DContent, geometry: ChartGeometry): GridPoint {
  const xValue = interpolate(content.xAxis.min, content.xAxis.max, column / Math.max(1, grid.columns - 1))
  const yValue = interpolate(content.yAxis.min, content.yAxis.max, row / Math.max(1, grid.rows - 1))
  return {
    x: geometry.left + normalizedPosition(xValue, content.xAxis.min, content.xAxis.max) * geometry.plotWidth,
    y: geometry.top + (1 - normalizedPosition(yValue, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight,
    value: grid.values[row * grid.columns + column] ?? Number.NaN,
  }
}

function crossing(left: GridPoint, right: GridPoint, level: number): { x: number; y: number } | undefined {
  if (!Number.isFinite(left.value) || !Number.isFinite(right.value) || left.value === right.value) return undefined
  if ((left.value < level && right.value < level) || (left.value > level && right.value > level)) return undefined
  const ratio = (level - left.value) / (right.value - left.value)
  if (ratio < 0 || ratio > 1) return undefined
  return { x: left.x + (right.x - left.x) * ratio, y: left.y + (right.y - left.y) * ratio }
}

function contourPaths(grid: NumberGrid, content: Field2DContent, geometry: ChartGeometry, levels: readonly number[]): string[] {
  const paths: string[] = []
  for (const level of levels) {
    const commands: string[] = []
    for (let row = 0; row < grid.rows - 1; row += 1) {
      for (let column = 0; column < grid.columns - 1; column += 1) {
        const bottomLeft = pointFor(grid, column, row, content, geometry)
        const bottomRight = pointFor(grid, column + 1, row, content, geometry)
        const topRight = pointFor(grid, column + 1, row + 1, content, geometry)
        const topLeft = pointFor(grid, column, row + 1, content, geometry)
        const intersections = [
          crossing(bottomLeft, bottomRight, level),
          crossing(bottomRight, topRight, level),
          crossing(topRight, topLeft, level),
          crossing(topLeft, bottomLeft, level),
        ].filter((point): point is { x: number; y: number } => point !== undefined)
        if (intersections.length === 2) {
          commands.push(`M${intersections[0]!.x.toFixed(2)},${intersections[0]!.y.toFixed(2)}L${intersections[1]!.x.toFixed(2)},${intersections[1]!.y.toFixed(2)}`)
        } else if (intersections.length === 4) {
          commands.push(`M${intersections[0]!.x.toFixed(2)},${intersections[0]!.y.toFixed(2)}L${intersections[1]!.x.toFixed(2)},${intersections[1]!.y.toFixed(2)}`)
          commands.push(`M${intersections[2]!.x.toFixed(2)},${intersections[2]!.y.toFixed(2)}L${intersections[3]!.x.toFixed(2)},${intersections[3]!.y.toFixed(2)}`)
        }
      }
    }
    paths.push(commands.join(''))
  }
  return paths
}

function nearestScalar(grid: NumberGrid | undefined, content: Field2DContent, probe: Probe): number | undefined {
  if (grid === undefined) return undefined
  const column = Math.round(normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * (grid.columns - 1))
  const row = Math.round(normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max) * (grid.rows - 1))
  const value = grid.values[row * grid.columns + column]
  return value !== undefined && Number.isFinite(value) ? value : undefined
}

function nearestVector(grid: VectorGrid | undefined, content: Field2DContent, probe: Probe): { u: number; v: number } | undefined {
  if (grid === undefined) return undefined
  const column = Math.round(normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * (grid.columns - 1))
  const row = Math.round(normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max) * (grid.rows - 1))
  const index = row * grid.columns + column
  const u = grid.u[index]
  const v = grid.v[index]
  return u !== undefined && v !== undefined && Number.isFinite(u) && Number.isFinite(v) ? { u, v } : undefined
}

export function Field2DRenderer({ content }: RendererProps<Field2DContent>) {
  const id = useId()
  const [viewportRef, width] = useContainerWidth()
  const geometry = useMemo(() => chartGeometry(width), [width])
  const scalar = useMemo(() => scalarGrid(content), [content])
  const vector = useMemo(() => vectorGrid(content), [content])
  const bounds = useMemo(() => scaleBounds(content, scalar), [content, scalar])
  const [probe, setProbe] = useState<Probe>()
  const xTicks = useMemo(() => ticks(content.xAxis.min, content.xAxis.max), [content.xAxis.max, content.xAxis.min])
  const yTicks = useMemo(() => ticks(content.yAxis.min, content.yAxis.max), [content.yAxis.max, content.yAxis.min])
  const levels = bounds === undefined ? [] : Array.from({ length: 5 }, (_, index) => interpolate(bounds.min, bounds.max, (index + 1) / 6))
  const contours = useMemo(
    () => scalar === undefined ? [] : contourPaths(scalar, content, geometry, levels),
    [content, geometry, levels.join('\u0000'), scalar],
  )
  const vectorMagnitude = vector === undefined ? 0 : Math.max(0, ...vector.u.map((u, index) => Math.hypot(u, vector.v[index] ?? 0)).filter(Number.isFinite))
  const probeScalar = probe === undefined ? undefined : nearestScalar(scalar, content, probe)
  const probeVector = probe === undefined ? undefined : nearestVector(vector, content, probe)
  const probeText = probe === undefined ? '在场中移动指针或使用方向键读取坐标。' : [
    `x ${formatNumber(probe.x)}`,
    `y ${formatNumber(probe.y)}`,
    ...(probeScalar === undefined ? [] : [`值 ${formatNumber(probeScalar)}`]),
    ...(probeVector === undefined ? [] : [`向量 (${formatNumber(probeVector.u)}, ${formatNumber(probeVector.v)})`]),
  ].join('，')

  const moveProbe = (event: PointerEvent<SVGSVGElement>): void => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    const px = (event.clientX - rect.left) * (geometry.width / rect.width)
    const py = (event.clientY - rect.top) * (geometry.height / rect.height)
    if (px < geometry.left - 4 || px > geometry.left + geometry.plotWidth + 4 || py < geometry.top - 4 || py > geometry.top + geometry.plotHeight + 4) {
      setProbe(undefined)
      return
    }
    const xRatio = normalizedPosition(px, geometry.left, geometry.left + geometry.plotWidth)
    const yRatio = 1 - normalizedPosition(py, geometry.top, geometry.top + geometry.plotHeight)
    setProbe({
      x: interpolate(content.xAxis.min, content.xAxis.max, xRatio),
      y: interpolate(content.yAxis.min, content.yAxis.max, yRatio),
    })
  }

  const keyProbe = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === 'Escape') { setProbe(undefined); return }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') {
      setProbe({ x: (content.xAxis.min + content.xAxis.max) / 2, y: (content.yAxis.min + content.yAxis.max) / 2 })
      return
    }
    const current = probe ?? { x: (content.xAxis.min + content.xAxis.max) / 2, y: (content.yAxis.min + content.yAxis.max) / 2 }
    const columns = Math.max(2, scalar?.columns ?? vector?.columns ?? sampleCount(content.xAxis.samples))
    const rows = Math.max(2, scalar?.rows ?? vector?.rows ?? sampleCount(content.yAxis.samples))
    const dx = (content.xAxis.max - content.xAxis.min) / (columns - 1)
    const dy = (content.yAxis.max - content.yAxis.min) / (rows - 1)
    setProbe({
      x: Math.max(content.xAxis.min, Math.min(content.xAxis.max, current.x + (event.key === 'ArrowRight' ? dx : event.key === 'ArrowLeft' ? -dx : 0))),
      y: Math.max(content.yAxis.min, Math.min(content.yAxis.max, current.y + (event.key === 'ArrowUp' ? dy : event.key === 'ArrowDown' ? -dy : 0))),
    })
  }

  return (
    <div className={shell.rendererStack}>
      <FigureViewport viewportRef={viewportRef}>
        <svg
          className={css.field}
          width={geometry.width}
          height={geometry.height}
          viewBox={`0 0 ${String(geometry.width)} ${String(geometry.height)}`}
          role="img"
          tabIndex={0}
          aria-label={probeText}
          onPointerMove={moveProbe}
          onKeyDown={keyProbe}
        >
          <defs>
            <clipPath id={`${id}-field-clip`}><rect x={geometry.left} y={geometry.top} width={geometry.plotWidth} height={geometry.plotHeight} /></clipPath>
            <marker id={`${id}-field-arrow`} className={css.arrowHead} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L7,3.5 L0,7 z" />
            </marker>
          </defs>
          <rect className={css.frame} x={geometry.left} y={geometry.top} width={geometry.plotWidth} height={geometry.plotHeight} />
          <g clipPath={`url(#${id}-field-clip)`}>
            {scalar === undefined || bounds === undefined ? null : scalar.values.map((value, index) => {
              const column = index % scalar.columns
              const row = Math.floor(index / scalar.columns)
              const cellWidth = geometry.plotWidth / scalar.columns
              const cellHeight = geometry.plotHeight / scalar.rows
              return <rect key={`heat-${String(index)}`} className={css.heatCell} x={geometry.left + column * cellWidth} y={geometry.top + (scalar.rows - row - 1) * cellHeight} width={cellWidth + 0.5} height={cellHeight + 0.5} fill={fieldColor(value, bounds.min, bounds.max)} />
            })}
            {contours.map((path, index) => <path key={`contour-${String(index)}`} className={css.contour} d={path} />)}
            {vector === undefined ? null : vector.u.map((u, index) => {
              const v = vector.v[index] ?? Number.NaN
              if (!Number.isFinite(u) || !Number.isFinite(v)) return null
              const column = index % vector.columns
              const row = Math.floor(index / vector.columns)
              const x = geometry.left + (column / Math.max(1, vector.columns - 1)) * geometry.plotWidth
              const y = geometry.top + (1 - row / Math.max(1, vector.rows - 1)) * geometry.plotHeight
              const magnitude = Math.hypot(u, v)
              if (magnitude === 0 || vectorMagnitude === 0) return <circle key={`vector-${String(index)}`} className={css.zeroVector} cx={x} cy={y} r="1.8" />
              const cell = Math.min(geometry.plotWidth / Math.max(2, vector.columns), geometry.plotHeight / Math.max(2, vector.rows))
              const length = Math.max(4, (magnitude / vectorMagnitude) * cell * 0.56)
              const dx = (u / magnitude) * length / 2
              const dy = -(v / magnitude) * length / 2
              return <line key={`vector-${String(index)}`} className={css.vector} x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} markerEnd={`url(#${id}-field-arrow)`} />
            })}
            {probe === undefined ? null : (
              <g className={css.probe}>
                <line x1={geometry.left} x2={geometry.left + geometry.plotWidth} y1={geometry.top + (1 - normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight} y2={geometry.top + (1 - normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight} />
                <line y1={geometry.top} y2={geometry.top + geometry.plotHeight} x1={geometry.left + normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * geometry.plotWidth} x2={geometry.left + normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * geometry.plotWidth} />
              </g>
            )}
          </g>
          {xTicks.map(value => <text key={`x-${String(value)}`} className={css.tick} x={geometry.left + normalizedPosition(value, content.xAxis.min, content.xAxis.max) * geometry.plotWidth} y={geometry.top + geometry.plotHeight + 19} textAnchor="middle">{formatNumber(value)}</text>)}
          {yTicks.map(value => <text key={`y-${String(value)}`} className={css.tick} x={geometry.left - 9} y={geometry.top + (1 - normalizedPosition(value, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight} textAnchor="end" dominantBaseline="middle">{formatNumber(value)}</text>)}
          {content.xAxis.label === undefined ? null : <text className={css.axisLabel} x={geometry.left + geometry.plotWidth / 2} y={geometry.height - 8} textAnchor="middle">{content.xAxis.label}</text>}
          {content.yAxis.label === undefined ? null : <text className={css.axisLabel} x={13} y={geometry.top + geometry.plotHeight / 2} textAnchor="middle" transform={`rotate(-90 13 ${String(geometry.top + geometry.plotHeight / 2)})`}>{content.yAxis.label}</text>}
        </svg>
      </FigureViewport>
      <div className={css.readout}>
        {bounds === undefined ? null : <div className={css.legend}><span>{formatNumber(bounds.min)}</span><i aria-hidden="true" /><span>{formatNumber(bounds.max)}</span></div>}
        {vector === undefined ? null : <span>最大向量模：{formatNumber(vectorMagnitude)}</span>}
        <output role="status" aria-live="polite">{probeText}</output>
      </div>
    </div>
  )
}
