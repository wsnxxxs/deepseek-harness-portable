/** `scene_2d`: geometry, vectors, fields and annotated schematics on axes. */
import { useId, useMemo, useState } from 'react'
import { labelTemplate, useVisualLabels } from '../core/labels.ts'
import { EmptyFigure, FigureViewport, SelectionSurface } from '../core/shell-parts.tsx'
import { formatNumber, ticks, toneAt } from '../core/format.ts'
import { DEFAULT_TONES, type RendererProps, type Scene2DContent, type SelectedItem } from '../core/types.ts'
import { elementState } from '../state/visual-state.ts'
import { useContainerWidth, useRovingFocus } from '../state/hooks.ts'
import { chartGeometry, scaleX, scaleY } from '../layout/chart-geometry.ts'
import { measureText, wrapLabel } from '../layout/text-metrics.ts'
import { polygonLabelAnchor, type LabelRect } from '../layout/scene-labels.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/plot.module.css'

/**
 * Place a segment or arrow label clear of its own line.
 *
 * A flat vertical offset drops the label onto whatever else crosses the middle
 * of the figure — in a parallelogram construction the resultant's label, the
 * shape's label and a declared text anchor all landed on the same few pixels.
 * Offsetting along the segment's normal separates them by construction.
 */
function segmentLabelAnchor(x1: number, y1: number, x2: number, y2: number): { x: number; y: number } {
  const length = Math.hypot(x2 - x1, y2 - y1) || 1
  const normalX = -(y2 - y1) / length
  const normalY = (x2 - x1) / length
  // Prefer the side that reads as "above" the line.
  const direction = normalY > 0 ? -1 : 1
  return {
    x: (x1 + x2) / 2 + normalX * 13 * direction,
    y: (y1 + y2) / 2 + normalY * 13 * direction,
  }
}

function midpointTicks(majorTicks: readonly number[], minimum: number, maximum: number): number[] {
  return majorTicks.slice(1).map((value, index) => {
    const previous = majorTicks[index] ?? value
    return (previous + value) / 2
  }).filter(value => value > minimum && value < maximum)
}

function sceneLabelLines(text: string | undefined): string[] {
  return text === undefined ? [] : wrapLabel(text, { fontSize: 13, maxWidth: 136, maxLines: 2 }).lines
}

function sceneElementBounds(
  element: Scene2DContent['elements'][number],
  content: Scene2DContent,
  geometry: ReturnType<typeof chartGeometry>,
): LabelRect {
  const x = (value: number): number => scaleX(value, content.xAxis, geometry)
  const y = (value: number): number => scaleY(value, content.yAxis, geometry)
  if (element.type === 'point') {
    const cx = x(element.x)
    const cy = y(element.y)
    const radius = element.size ?? 6
    return { x1: cx - radius, y1: cy - radius, x2: cx + radius, y2: cy + radius }
  }
  if (element.type === 'segment' || element.type === 'arrow') {
    const x1 = x(element.x1)
    const y1 = y(element.y1)
    const x2 = x(element.x2)
    const y2 = y(element.y2)
    return { x1: Math.min(x1, x2) - 4, y1: Math.min(y1, y2) - 4, x2: Math.max(x1, x2) + 4, y2: Math.max(y1, y2) + 4 }
  }
  if (element.type === 'circle') {
    const cx = x(element.cx)
    const cy = y(element.cy)
    const rx = Math.abs(x(element.cx + element.r) - cx)
    const ry = Math.abs(y(element.cy + element.r) - cy)
    return { x1: cx - rx, y1: cy - ry, x2: cx + rx, y2: cy + ry }
  }
  if (element.type === 'rect') {
    const x1 = x(element.x)
    const x2 = x(element.x + element.width)
    const y1 = y(element.y)
    const y2 = y(element.y + element.height)
    return { x1: Math.min(x1, x2), y1: Math.min(y1, y2), x2: Math.max(x1, x2), y2: Math.max(y1, y2) }
  }
  if (element.type === 'polygon') {
    const points = element.points.map(point => ({ x: x(point.x), y: y(point.y) }))
    return {
      x1: Math.min(...points.map(point => point.x)),
      y1: Math.min(...points.map(point => point.y)),
      x2: Math.max(...points.map(point => point.x)),
      y2: Math.max(...points.map(point => point.y)),
    }
  }
  if (element.type !== 'label') return { x1: 0, y1: 0, x2: 0, y2: 0 }
  const cx = x(element.x)
  const cy = y(element.y)
  const halfWidth = (measureText(element.text, 12) + 8) / 2
  return { x1: cx - halfWidth, y1: cy - 9, x2: cx + halfWidth, y2: cy + 9 }
}

export function Scene2DRenderer({ content, focus }: RendererProps<Scene2DContent>) {
  const labels = useVisualLabels()
  const id = useId()
  const [viewportRef, containerWidth] = useContainerWidth()
  const geometry = useMemo(() => chartGeometry(containerWidth), [containerWidth])
  const [selected, setSelected] = useState<SelectedItem | undefined>()
  const xTicks = useMemo(() => ticks(content.xAxis.min, content.xAxis.max), [content.xAxis.max, content.xAxis.min])
  const yTicks = useMemo(() => ticks(content.yAxis.min, content.yAxis.max), [content.yAxis.max, content.yAxis.min])
  const xMinorTicks = useMemo(() => midpointTicks(xTicks, content.xAxis.min, content.xAxis.max), [content.xAxis.max, content.xAxis.min, xTicks])
  const yMinorTicks = useMemo(() => midpointTicks(yTicks, content.yAxis.min, content.yAxis.max), [content.yAxis.max, content.yAxis.min, yTicks])
  const elementBounds = useMemo(
    () => new Map(content.elements.map(element => [element.id, sceneElementBounds(element, content, geometry)])),
    [content, geometry],
  )
  const zeroX = content.xAxis.min <= 0 && content.xAxis.max >= 0 ? scaleX(0, content.xAxis, geometry) : undefined
  const zeroY = content.yAxis.min <= 0 && content.yAxis.max >= 0 ? scaleY(0, content.yAxis, geometry) : undefined

  const rovingIds = useMemo(() => content.elements.map(element => element.id), [content.elements])
  const roving = useRovingFocus(rovingIds)

  const selectElement = (element: Scene2DContent['elements'][number], tone: string): void => setSelected({
    id: element.id,
    label: element.type === 'label' ? element.text : element.label ?? labelTemplate(labels.elementFallback, { id: element.id }),
    detail: element.detail,
    kind: 'element',
    tone: toneAt(tone),
  })

  // An accepted payload with nothing in it says so, rather than presenting an
  // empty frame that reads as a broken renderer.
  if (content.elements.length === 0) return <EmptyFigure />

  return (
    <div className={shell.rendererStack}>
      <FigureViewport viewportRef={viewportRef}>
        <svg
          ref={roving.containerRef}
          className={css.sceneSvg}
          width={geometry.width}
          height={geometry.height}
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          role="group"
          aria-label={labelTemplate(labels.sceneSummary, {
            elements: content.elements.length,
            labels: content.elements.map(element => element.type === 'label' ? element.text : element.label).filter(Boolean).join(', '),
          })}
        >
          <defs>
            <clipPath id={`${id}-scene-clip`}>
              <rect x={geometry.left} y={geometry.top} width={geometry.plotWidth} height={geometry.plotHeight} />
            </clipPath>
            {DEFAULT_TONES.map(tone => (
              <marker key={tone} id={`${id}-scene-arrow-${tone}`} className={css.arrowMarker} data-tone={tone} markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L9,4.5 L0,9 z" />
              </marker>
            ))}
          </defs>
          <rect className={css.plotFrame} x={geometry.left} y={geometry.top} width={geometry.plotWidth} height={geometry.plotHeight} />
          {content.grid !== true ? null : yMinorTicks.map(value => <line key={`my-${String(value)}`} className={css.minorGridLine} x1={geometry.left} x2={geometry.left + geometry.plotWidth} y1={scaleY(value, content.yAxis, geometry)} y2={scaleY(value, content.yAxis, geometry)} />)}
          {content.grid !== true ? null : xMinorTicks.map(value => <line key={`mx-${String(value)}`} className={css.minorGridLine} x1={scaleX(value, content.xAxis, geometry)} x2={scaleX(value, content.xAxis, geometry)} y1={geometry.top} y2={geometry.top + geometry.plotHeight} />)}
          {content.grid !== true ? null : yTicks.map(value => <line key={`gy-${String(value)}`} className={css.gridLine} x1={geometry.left} x2={geometry.left + geometry.plotWidth} y1={scaleY(value, content.yAxis, geometry)} y2={scaleY(value, content.yAxis, geometry)} />)}
          {content.grid !== true ? null : xTicks.map(value => <line key={`gx-${String(value)}`} className={css.gridLine} x1={scaleX(value, content.xAxis, geometry)} x2={scaleX(value, content.xAxis, geometry)} y1={geometry.top} y2={geometry.top + geometry.plotHeight} />)}
          {zeroX === undefined ? null : <line className={css.zeroAxis} x1={zeroX} x2={zeroX} y1={geometry.top} y2={geometry.top + geometry.plotHeight} />}
          {zeroY === undefined ? null : <line className={css.zeroAxis} x1={geometry.left} x2={geometry.left + geometry.plotWidth} y1={zeroY} y2={zeroY} />}
          {zeroX === undefined || zeroY === undefined ? null : <g className={css.originMarker} aria-hidden="true"><circle cx={zeroX} cy={zeroY} r="3.5" /><text x={zeroX + 7} y={zeroY - 7}>O</text></g>}
          {yTicks.map(value => <text key={`yt-${String(value)}`} className={css.tickLabel} x={geometry.left - 9} y={scaleY(value, content.yAxis, geometry)} textAnchor="end" dominantBaseline="middle">{formatNumber(value)}</text>)}
          {xTicks.map(value => <text key={`xt-${String(value)}`} className={css.tickLabel} x={scaleX(value, content.xAxis, geometry)} y={geometry.top + geometry.plotHeight + 19} textAnchor="middle">{formatNumber(value)}</text>)}
          <g clipPath={`url(#${id}-scene-clip)`}>
            {content.elements.map((element, index) => {
              const tone = toneAt(element.tone, index)
              const common = {
                className: css.sceneElement,
                'data-tone': tone,
                'data-visual-state': selected?.id === element.id ? 'selected' : elementState(element.id, focus),
                'data-selected': selected?.id === element.id || undefined,
                'data-visual-id': element.id,
                'data-element-type': element.type,
                role: 'button',
                'aria-label': `${element.type === 'label' ? element.text : element.label ?? element.type}${element.detail === undefined ? '' : `。${element.detail}`}`,
                onClick: () => selectElement(element, tone),
                ...roving.itemProps(element.id, () => selectElement(element, tone)),
              } as const
              if (element.type === 'point') {
                const x = scaleX(element.x, content.xAxis, geometry)
                const y = scaleY(element.y, content.yAxis, geometry)
                return <g key={element.id} {...common}><circle className={css.scenePoint} cx={x} cy={y} r={element.size ?? 6} />{element.label === undefined ? null : <text className={css.shapeLabel} x={x + 10} y={y - 10}>{sceneLabelLines(element.label).map((line, lineIndex) => <tspan key={lineIndex} x={x + 10} dy={lineIndex === 0 ? '0' : '1.1em'}>{line}</tspan>)}</text>}</g>
              }
              if (element.type === 'segment' || element.type === 'arrow') {
                const x1 = scaleX(element.x1, content.xAxis, geometry)
                const y1 = scaleY(element.y1, content.yAxis, geometry)
                const x2 = scaleX(element.x2, content.xAxis, geometry)
                const y2 = scaleY(element.y2, content.yAxis, geometry)
                return <g key={element.id} {...common} data-stroke={element.stroke ?? 'solid'}><line className={css.sceneLine} x1={x1} y1={y1} x2={x2} y2={y2} markerEnd={element.type === 'arrow' ? `url(#${id}-scene-arrow-${tone})` : undefined} /><line className={css.sceneHit} x1={x1} y1={y1} x2={x2} y2={y2} />{element.label === undefined ? null : (() => {
                  const anchor = segmentLabelAnchor(x1, y1, x2, y2)
                  return <text className={css.shapeLabel} x={anchor.x} y={anchor.y} textAnchor="middle" dominantBaseline="middle">{sceneLabelLines(element.label).map((line, lineIndex) => <tspan key={lineIndex} x={anchor.x} dy={lineIndex === 0 ? (sceneLabelLines(element.label).length > 1 ? '-0.55em' : '0.34em') : '1.1em'}>{line}</tspan>)}</text>
                })()}</g>
              }
              if (element.type === 'circle') {
                const cx = scaleX(element.cx, content.xAxis, geometry)
                const cy = scaleY(element.cy, content.yAxis, geometry)
                const rx = Math.abs(scaleX(element.cx + element.r, content.xAxis, geometry) - cx)
                const ry = Math.abs(scaleY(element.cy + element.r, content.yAxis, geometry) - cy)
                return <g key={element.id} {...common}><ellipse className={css.sceneShape} cx={cx} cy={cy} rx={rx} ry={ry} />{element.label === undefined ? null : <text className={css.shapeLabel} x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">{sceneLabelLines(element.label).map((line, lineIndex) => <tspan key={lineIndex} x={cx} dy={lineIndex === 0 ? (sceneLabelLines(element.label).length > 1 ? '-0.55em' : '0.34em') : '1.1em'}>{line}</tspan>)}</text>}</g>
              }
              if (element.type === 'rect') {
                const x = scaleX(element.x, content.xAxis, geometry)
                const y = scaleY(element.y + element.height, content.yAxis, geometry)
                const width = Math.abs(scaleX(element.x + element.width, content.xAxis, geometry) - x)
                const height = Math.abs(scaleY(element.y, content.yAxis, geometry) - y)
                return <g key={element.id} {...common}><rect className={css.sceneShape} x={x} y={y} width={width} height={height} rx="3" />{element.label === undefined ? null : <text className={css.shapeLabel} x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle">{sceneLabelLines(element.label).map((line, lineIndex) => <tspan key={lineIndex} x={x + width / 2} dy={lineIndex === 0 ? (sceneLabelLines(element.label).length > 1 ? '-0.55em' : '0.34em') : '1.1em'}>{line}</tspan>)}</text>}</g>
              }
              if (element.type === 'polygon') {
                const pixelPoints = element.points.map(point => ({ x: scaleX(point.x, content.xAxis, geometry), y: scaleY(point.y, content.yAxis, geometry) }))
                const points = pixelPoints.map(point => `${point.x},${point.y}`).join(' ')
                const anchor = element.label === undefined ? undefined : polygonLabelAnchor(
                  pixelPoints,
                  element.label,
                  content.elements
                    .filter(other => other.id !== element.id)
                    .map(other => elementBounds.get(other.id))
                    .filter((bounds): bounds is LabelRect => bounds !== undefined),
                  { left: geometry.left, right: geometry.left + geometry.plotWidth, top: geometry.top, bottom: geometry.top + geometry.plotHeight },
                )
                return <g key={element.id} {...common}><polygon className={css.sceneShape} points={points} />{anchor === undefined ? null : <text className={css.shapeLabel} x={anchor.x} y={anchor.y} textAnchor="middle" dominantBaseline="middle">{sceneLabelLines(element.label).map((line, lineIndex) => <tspan key={lineIndex} x={anchor.x} dy={lineIndex === 0 ? (sceneLabelLines(element.label).length > 1 ? '-0.55em' : '0.34em') : '1.1em'}>{line}</tspan>)}</text>}</g>
              }
              if (element.type === 'label') return <g key={element.id} {...common}><text className={css.sceneText} x={scaleX(element.x, content.xAxis, geometry)} y={scaleY(element.y, content.yAxis, geometry)} textAnchor="middle" dominantBaseline="middle">{element.text}</text></g>
              return null
            })}
          </g>
          <text className={css.axisLabel} x={geometry.left + geometry.plotWidth / 2} y={geometry.height - 6} textAnchor="middle">{content.xAxis.label ?? 'x'}</text>
          <text className={css.axisLabel} x="14" y={geometry.top + geometry.plotHeight / 2} textAnchor="middle" transform={`rotate(-90 14 ${geometry.top + geometry.plotHeight / 2})`}>{content.yAxis.label ?? 'y'}</text>
        </svg>
      </FigureViewport>
      <SelectionSurface
        hint={labels.sceneInteractionHint}
        selected={selected}
        kindLabel={labels.elementKind}
        onClose={() => setSelected(undefined)}
      />
    </div>
  )
}
