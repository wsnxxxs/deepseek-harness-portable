/** `causal_loop`: signed, delayed links and named reinforcing/balancing loops. */
import { useId, useMemo, useState } from 'react'
import { labelTemplate, useVisualLabels } from '../core/labels.ts'
import { EmptyFigure, FigureViewport, SelectionSurface, StateLegend } from '../core/shell-parts.tsx'
import { toneAt } from '../core/format.ts'
import { DEFAULT_TONES, type CausalLoopContent, type RendererProps } from '../core/types.ts'
import { elementState } from '../state/visual-state.ts'
import { useContainerWidth, useRovingFocus } from '../state/hooks.ts'
import { measureText, wrapLabel } from '../layout/text-metrics.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/process.module.css'

type ProcessRendererProps<T> = Omit<RendererProps<never>, 'content'> & { content: T }

type CausalVariable = CausalLoopContent['variables'][number]
type CausalLink = CausalLoopContent['links'][number]
type CausalLoop = NonNullable<CausalLoopContent['loops']>[number]

interface Selected {
  id: string
  label: string
  detail?: string
  kind: string
  tone?: ReturnType<typeof toneAt>
}

interface Position { x: number; y: number }

/** Height of the loop badge chip, shared by its placement search and its rect. */
const LOOP_BADGE_HEIGHT = 32

interface VariableBox {
  width: number
  height: number
  lines: string[]
}

function computeVariableBox(label: string): VariableBox {
  const wrapped = wrapLabel(label, { fontSize: 13, maxWidth: 124, maxLines: 2 })
  const maxLineWidth = Math.max(...wrapped.lines.map(line => measureText(line, 13)), 0)
  const width = Math.max(104, Math.min(168, maxLineWidth + 28))
  const height = wrapped.lines.length > 1 ? 52 : 40
  return { width, height, lines: wrapped.lines }
}

function variablePosition(index: number, count: number, width: number, height: number): Position {
  if (count <= 1) return { x: width / 2, y: height / 2 + 10 }
  const radiusX = Math.min(width * 0.38, Math.max(145, count * 32))
  const radiusY = Math.min(height * 0.31, Math.max(90, count * 24))
  const angle = -Math.PI / 2 + index * (Math.PI * 2 / count)
  return { x: width / 2 + Math.cos(angle) * radiusX, y: height / 2 + 10 + Math.sin(angle) * radiusY }
}

function boxBoundary(from: Position, to: Position, box: VariableBox): Position {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const scale = 1 / Math.max(Math.abs(dx) / (box.width / 2), Math.abs(dy) / (box.height / 2), 1)
  return { x: from.x + dx * scale, y: from.y + dy * scale }
}

function polaritySymbol(polarity: string): string {
  return polarity === 'negative' || polarity === '-' ? '−' : '+'
}

function loopKind(type: string): 'reinforcing' | 'balancing' {
  return type === 'balancing' || type === 'B' ? 'balancing' : 'reinforcing'
}

function linkDetail(link: CausalLink, variables: ReadonlyMap<string, CausalVariable>): string {
  const from = variables.get(link.from)?.label ?? link.from
  const to = variables.get(link.to)?.label ?? link.to
  const delay = link.delay === undefined ? undefined : `Delay: ${link.delay}`
  return [from, `→ ${to}`, link.polarity, delay, link.detail].filter((part): part is string => part !== undefined && part.length > 0).join(' · ')
}

export function CausalLoopRenderer({ content, focus }: ProcessRendererProps<CausalLoopContent>) {
  const labels = useVisualLabels()
  const diagramId = useId()
  const [viewportRef, containerWidth] = useContainerWidth()
  const [selected, setSelected] = useState<Selected | undefined>()
  const variables = content.variables
  const links = content.links
  const loops = content.loops ?? []
  const variableById = useMemo(() => new Map(variables.map(variable => [variable.id, variable])), [variables])
  const boxByVarId = useMemo(() => new Map(variables.map(variable => [variable.id, computeVariableBox(variable.label)])), [variables])
  const width = Math.max(560, containerWidth, 36 + loops.length * 168)
  const height = Math.max(340, 170 + Math.min(170, Math.max(100, variables.length * 24)) * 2)
  const positions = useMemo(() => new Map(variables.map((variable, index) => [variable.id, variablePosition(index, variables.length, width, height)])), [height, variables, width])
  const linkById = useMemo(() => new Map(links.map(link => [link.id, link])), [links])
  const rovingIds = useMemo(() => [...loops.map(loop => loop.id), ...variables.map(variable => variable.id), ...links.map(link => link.id)], [links, loops, variables])
  const roving = useRovingFocus(rovingIds)

  /**
   * A loop badge starts at the centroid of the variables it runs through, and
   * is then pushed off whatever it landed on.
   *
   * The centroid alone is where the badge wants to be and rarely where it can
   * be: a four-variable ring puts its centre exactly on the node in the middle
   * of the figure, and two loops sharing most of their variables put both
   * badges in the same place. Both cases covered a node label with a chip.
   *
   * The search is the one the link labels already use — try the wanted spot,
   * then rings of increasing radius, and take the first that clears the node
   * boxes and the badges already placed.
   */
  /**
   * Where each link runs, and where its signed marker sits.
   *
   * This used to be computed inline while rendering, which meant the loop
   * badge placement below could not see it: badges were positioned without
   * knowing where the polarity glyphs would land, and a glyph would come to
   * rest on top of a badge's text. None of it depends on selection or focus,
   * so it belongs in a memo both passes can read.
   */
  const linkGeometry = useMemo(() => new Map(links.flatMap((link, index) => {
    const from = positions.get(link.from)
    const to = positions.get(link.to)
    const fromBox = boxByVarId.get(link.from) ?? { width: 120, height: 42, lines: [] }
    const toBox = boxByVarId.get(link.to) ?? { width: 120, height: 42, lines: [] }
    if (from === undefined || to === undefined) return []
    const start = boxBoundary(from, to, fromBox)
    const end = boxBoundary(to, from, toBox)
    const midX = (start.x + end.x) / 2
    const midY = (start.y + end.y) / 2
    const hasReverse = links.some(other => other.id !== link.id && other.from === link.to && other.to === link.from)
    const curve = hasReverse ? 38 : ((index % 3) - 1) * 16
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.max(1, Math.hypot(dx, dy))
    const normalX = -dy / length
    const normalY = dx / length
    const controlX = midX + normalX * curve
    const controlY = midY + normalY * curve
    const midCurveX = 0.25 * start.x + 0.5 * controlX + 0.25 * end.x
    const midCurveY = 0.25 * start.y + 0.5 * controlY + 0.25 * end.y
    const annotationLane = (index % 5) - 2
    const signX = midCurveX + normalX * 12
    const signY = midCurveY + normalY * 12
    return [[link.id, {
      path: `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
      normalX,
      normalY,
      annotationLane,
      signX,
      signY,
      /** Where the glyph is actually drawn, once its lane offset is applied. */
      markX: signX + normalX * annotationLane * 14,
      markY: signY + normalY * annotationLane * 14,
      /** And where the delay chip goes, for links that declare one. */
      delay: link.delay === undefined ? undefined : {
        x: signX + 34 + normalX * annotationLane * 10,
        y: signY - 25 + normalY * annotationLane * 10,
      },
    }] as const]
  })), [boxByVarId, links, positions])

  const loopBoxes = useMemo(() => {
    const nodeObstacles = [
      ...variables.flatMap(variable => {
        const position = positions.get(variable.id)
        const box = boxByVarId.get(variable.id)
        return position === undefined || box === undefined
          ? []
          : [{ x: position.x, y: position.y, width: box.width + 12, height: box.height + 12 }]
      }),
      // The signed markers and delay chips are small but they sit exactly where
      // a badge wants to be, and either one over a loop name costs more than
      // moving the badge.
      ...[...linkGeometry.values()].map(geometry => ({
        x: geometry.markX, y: geometry.markY, width: 26, height: 26,
      })),
      ...[...linkGeometry.values()].flatMap(geometry => (
        geometry.delay === undefined ? [] : [{ x: geometry.delay.x, y: geometry.delay.y, width: 46, height: 24 }]
      )),
    ]
    const placed: Array<{ x: number; y: number; width: number; height: number }> = []
    const clears = (x: number, y: number, w: number, h: number): boolean =>
      [...nodeObstacles, ...placed].every(other => (
        Math.abs(other.x - x) > (other.width + w) / 2 || Math.abs(other.y - y) > (other.height + h) / 2
      ))

    return new Map(loops.map((loop, loopIndex) => {
      const loopVars = loop.linkIds.flatMap(linkId => {
        const link = linkById.get(linkId)
        return link ? [link.from, link.to] : []
      })
      const uniqueVars = [...new Set(loopVars)]
      const pts = uniqueVars.map(id => positions.get(id)).filter(Boolean) as Position[]
      const wantedX = pts.length > 0 ? pts.reduce((sum, p) => sum + p.x, 0) / pts.length : width / 2 + (loopIndex - (loops.length - 1) / 2) * 140
      const wantedY = pts.length > 0 ? pts.reduce((sum, p) => sum + p.y, 0) / pts.length : height / 2 + 10
      const kind = loopKind(loop.type)
      const labelText = `${kind === 'reinforcing' ? '↻ R' : '↺ B'} · ${loop.label}`
      const labelWidth = Math.max(114, measureText(labelText, 12) + 26)

      let cx = wantedX
      let cy = wantedY
      if (!clears(cx, cy, labelWidth, LOOP_BADGE_HEIGHT)) {
        search: for (const radius of [34, 52, 70, 92, 116]) {
          for (const angle of [90, 270, 45, 135, 225, 315, 0, 180]) {
            const radians = (angle * Math.PI) / 180
            const candidateX = wantedX + Math.cos(radians) * radius
            const candidateY = wantedY + Math.sin(radians) * radius
            // Never push a badge outside the frame to escape a node.
            if (candidateX - labelWidth / 2 < 8 || candidateX + labelWidth / 2 > width - 8) continue
            if (candidateY - LOOP_BADGE_HEIGHT / 2 < 8 || candidateY + LOOP_BADGE_HEIGHT / 2 > height - 8) continue
            if (!clears(candidateX, candidateY, labelWidth, LOOP_BADGE_HEIGHT)) continue
            cx = candidateX
            cy = candidateY
            break search
          }
        }
      }
      placed.push({ x: cx, y: cy, width: labelWidth, height: LOOP_BADGE_HEIGHT })
      return [loop.id, { cx, cy, labelText, labelWidth }] as const
    }))
  }, [boxByVarId, height, linkById, linkGeometry, loops, positions, variables, width])

  const selectVariable = (variable: CausalVariable): void => setSelected({ id: variable.id, label: variable.label, detail: variable.detail, kind: labels.causalVariableKind, tone: toneAt(variable.tone) })
  const selectLink = (link: CausalLink): void => setSelected({ id: link.id, label: link.label ?? `${polaritySymbol(link.polarity)} ${variableById.get(link.to)?.label ?? link.to}`, detail: linkDetail(link, variableById), kind: labels.causalLinkKind, tone: toneAt(link.tone) })
  const selectLoop = (loop: CausalLoop): void => {
    const kind = loopKind(loop.type)
    const linksInLoop = loop.linkIds.map(id => linkById.get(id)?.label ?? id).join(' → ')
    setSelected({ id: loop.id, label: `${kind === 'reinforcing' ? 'R' : 'B'} · ${loop.label}`, detail: loop.detail ?? linksInLoop, kind: kind === 'reinforcing' ? labels.causalReinforcingKind : labels.causalBalancingKind, tone: toneAt(loop.tone) })
  }
  const summary = labelTemplate(labels.causalLoopSummary, { variables: variables.length, links: links.length, loops: loops.length })
  const legendStates = useMemo(
    () => focus.active ? [...variables, ...links, ...loops].map(item => elementState(item.id, focus)) : [],
    [focus, links, loops, variables],
  )
  const placedCausalLabels: Array<{ x: number; y: number; width: number; height: number }> = [
    ...[...loopBoxes.values()].map(box => ({ x: box.cx, y: box.cy, width: box.labelWidth, height: 32 })),
    ...variables.flatMap(variable => {
      const position = positions.get(variable.id)
      const box = boxByVarId.get(variable.id)
      return position === undefined || box === undefined ? [] : [{ x: position.x, y: position.y, width: box.width + 10, height: box.height + 10 }]
    }),
  ]

  // An accepted payload with nothing in it says so, rather than presenting an
  // empty frame that reads as a broken renderer.
  if (variables.length === 0) return <EmptyFigure />

  return (
    <div className={shell.rendererStack}>
      <FigureViewport viewportRef={viewportRef}>
        <svg
          ref={roving.containerRef}
          className={css.processSvg}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label={summary}
        >
          <defs>
            {DEFAULT_TONES.map(tone => (
              <marker key={tone} id={`${diagramId}-${tone}`} className={css.causalArrow} data-tone={tone} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" />
              </marker>
            ))}
          </defs>

          {/* Loop Centroid Badges */}
          <g>
            {loops.map((loop, index) => {
              const kind = loopKind(loop.type)
              const tone = toneAt(loop.tone, index)
              const box = loopBoxes.get(loop.id) ?? { cx: width / 2, cy: height / 2 + 10, labelText: loop.label, labelWidth: 120 }
              const isSelected = selected?.id === loop.id
              const state = focus.active ? elementState(loop.id, focus, loop.linkIds) : (isSelected ? 'selected' : 'overview')
              return (
                <g
                  key={loop.id}
                  className={css.causalLoop}
                  data-tone={tone}
                  data-visual-id={loop.id}
                  data-visual-state={state}
                  role="button"
                  aria-label={`${kind === 'reinforcing' ? labels.causalReinforcingKind : labels.causalBalancingKind}: ${loop.label}`}
                  onClick={() => selectLoop(loop)}
                  {...roving.itemProps(loop.id, () => selectLoop(loop))}
                  transform={`translate(${box.cx} ${box.cy})`}
                >
                  <g className={css.causalLoopBadge} data-loop-kind={kind}>
                    <rect x={-box.labelWidth / 2} y={-LOOP_BADGE_HEIGHT / 2} width={box.labelWidth} height={LOOP_BADGE_HEIGHT} rx={LOOP_BADGE_HEIGHT / 2} />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="middle">{box.labelText}</text>
                  </g>
                </g>
              )
            })}
          </g>

          {/* Links */}
          <g>
            {links.map((link, index) => {
              const geometry = linkGeometry.get(link.id)
              if (geometry === undefined) return null
              // Keep the three annotation types in separate lanes. The signed
              // marker stays close to the link while delay and a long label get
              // deterministic breathing room in dense feedback diagrams.
              const { path, normalX, normalY, annotationLane, signX, signY } = geometry
              const tone = toneAt(link.tone, index)
              const isLinkInSelectedLoop = selected?.id !== undefined && loops.some(l => l.id === selected.id && l.linkIds.includes(link.id))
              const state = focus.active ? elementState(link.id, focus, [link.from, link.to]) : (selected?.id === link.id || isLinkInSelectedLoop ? 'selected' : 'overview')
              const delay = link.delay === undefined ? undefined : link.delay > 0 ? `+${link.delay}` : 'delay'
              const labelLines = link.label === undefined ? [] : wrapLabel(link.label, { fontSize: 13, maxWidth: 150, maxLines: 2 }).lines
              const labelWidth = labelLines.length === 0 ? 0 : Math.max(...labelLines.map(line => measureText(line, 13))) + 14
              const labelHeight = labelLines.length > 1 ? 36 : 22
              const baseLabelX = signX + normalX * 28
              const baseLabelY = signY + normalY * 28 + annotationLane * 24
              let labelX = baseLabelX
              let labelY = baseLabelY
              if (link.label !== undefined) {
                // The search used to move the chip vertically only, so a label
                // boxed in above and below settled on top of whatever was
                // already there — most visibly a loop badge. Sliding sideways
                // as well gives it somewhere to go before it gives up.
                const clear = (x: number, y: number): boolean => !placedCausalLabels.some(previous => (
                  Math.abs(previous.x - x) < (previous.width + labelWidth) / 2 + 8
                  && Math.abs(previous.y - y) < (previous.height + labelHeight) / 2 + 6
                ))
                search: for (const dy of [0, 30, -30, 60, -60, 90, -90]) {
                  for (const dx of [0, 34, -34, 68, -68]) {
                    if (!clear(baseLabelX + dx, baseLabelY + dy)) continue
                    labelX = baseLabelX + dx
                    labelY = baseLabelY + dy
                    break search
                  }
                }
                placedCausalLabels.push({ x: labelX, y: labelY, width: labelWidth, height: labelHeight })
              }

              return (
                <g
                  key={link.id}
                  className={css.causalLink}
                  data-tone={tone}
                  data-visual-id={link.id}
                  data-visual-state={state}
                  role="button"
                  aria-label={`${polaritySymbol(link.polarity)} ${labels.causalLinkKind}: ${linkDetail(link, variableById)}`}
                  onClick={() => selectLink(link)}
                  {...roving.itemProps(link.id, () => selectLink(link))}
                >
                  <path className={css.causalLinkPath} d={path} markerEnd={`url(#${diagramId}-${tone})`} />
                  <path className={css.causalLinkHit} d={path} />
                  <g className={css.causalSign} transform={`translate(${signX + normalX * annotationLane * 14} ${signY + normalY * annotationLane * 14})`}>
                    <rect x="-12" y="-12" width="24" height="24" rx="12" />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="middle">{polaritySymbol(link.polarity)}</text>
                  </g>
                  {delay === undefined ? null : (
                    <g className={css.causalDelay} transform={`translate(${signX + 34 + normalX * annotationLane * 10} ${signY - 25 + normalY * annotationLane * 10})`}>
                      <rect x="-18" y="-11" width="36" height="22" rx="8" />
                      <text x="0" y="1" textAnchor="middle" dominantBaseline="middle">⏱ {delay}</text>
                    </g>
                  )}
                  {link.label === undefined ? null : (
                    <g className={css.causalLabelGroup} transform={`translate(${labelX} ${labelY})`}>
                      <rect x={-labelWidth / 2} y={-labelHeight / 2} width={labelWidth} height={labelHeight} rx="4" className={css.causalLabelBg} />
                      <text className={css.causalLinkLabel} textAnchor="middle" dominantBaseline="middle">
                        {labelLines.map((line, lineIndex) => <tspan key={lineIndex} x="0" dy={lineIndex === 0 ? (labelLines.length > 1 ? '-0.55em' : '0.34em') : '1.1em'}>{line}</tspan>)}
                      </text>
                    </g>
                  )}
                  {link.label === undefined ? null : <title>{link.label}</title>}
                </g>
              )
            })}
          </g>

          {/* Variables */}
          <g>
            {variables.map((variable, index) => {
              const position = positions.get(variable.id)
              if (position === undefined) return null
              const tone = toneAt(variable.tone, index)
              const box = boxByVarId.get(variable.id) ?? { width: 120, height: 42, lines: [variable.label] }
              const isVarInSelectedLoop = selected?.id !== undefined && loops.some(l => l.id === selected.id && l.linkIds.some(lid => {
                const link = linkById.get(lid)
                return link && (link.from === variable.id || link.to === variable.id)
              }))
              const state = focus.active ? elementState(variable.id, focus) : (selected?.id === variable.id || isVarInSelectedLoop ? 'selected' : 'overview')
              return (
                <g
                  key={variable.id}
                  className={css.causalVariable}
                  transform={`translate(${position.x} ${position.y})`}
                  data-tone={tone}
                  data-visual-id={variable.id}
                  data-visual-state={state}
                  role="button"
                  aria-label={`${labels.causalVariableKind}: ${variable.label}`}
                  onClick={() => selectVariable(variable)}
                  {...roving.itemProps(variable.id, () => selectVariable(variable))}
                >
                  <rect className={css.causalVariableShape} x={-box.width / 2} y={-box.height / 2} width={box.width} height={box.height} rx="12" />
                  <text className={css.causalVariableLabel} textAnchor="middle">
                    {box.lines.map((line, lineIndex) => (
                      <tspan key={lineIndex} x="0" dy={lineIndex === 0 ? (box.lines.length > 1 ? "-0.28em" : "0.34em") : "1.25em"}>{line}</tspan>
                    ))}
                  </text>
                  {variable.detail === undefined ? null : <title>{variable.detail}</title>}
                </g>
              )
            })}
          </g>
        </svg>
      </FigureViewport>
      <StateLegend states={legendStates} />
      <div className={shell.srOnly}>
        <p>{summary}</p>
        <ul>
          {variables.map(variable => <li key={variable.id}>{variable.label}{variable.detail === undefined ? '' : `: ${variable.detail}`}</li>)}
          {links.map(link => <li key={link.id}>{linkDetail(link, variableById)}</li>)}
          {loops.map(loop => <li key={loop.id}>{loopKind(loop.type) === 'reinforcing' ? 'R' : 'B'} · {loop.label}</li>)}
        </ul>
      </div>
      <SelectionSurface hint={labels.causalLoopInteractionHint} selected={selected} onClose={() => setSelected(undefined)} />
    </div>
  )
}
