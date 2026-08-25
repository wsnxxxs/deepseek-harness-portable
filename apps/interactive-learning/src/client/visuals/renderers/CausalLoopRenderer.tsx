/** `causal_loop`: signed, delayed links and named reinforcing/balancing loops. */
import { useId, useMemo, useState } from 'react'
import { SelectionSurface, StateLegend } from '../core/shell-parts.tsx'
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

  const loopBoxes = useMemo(() => new Map(loops.map((loop, loopIndex) => {
    const loopVars = loop.linkIds.flatMap(linkId => {
      const link = linkById.get(linkId)
      return link ? [link.from, link.to] : []
    })
    const uniqueVars = [...new Set(loopVars)]
    const pts = uniqueVars.map(id => positions.get(id)).filter(Boolean) as Position[]
    const cx = pts.length > 0 ? pts.reduce((sum, p) => sum + p.x, 0) / pts.length : width / 2 + (loopIndex - (loops.length - 1) / 2) * 140
    const cy = pts.length > 0 ? pts.reduce((sum, p) => sum + p.y, 0) / pts.length : height / 2 + 10
    const kind = loopKind(loop.type)
    const labelText = `${kind === 'reinforcing' ? '↻ R' : '↺ B'} · ${loop.label}`
    const labelWidth = Math.max(114, measureText(labelText, 12) + 26)
    return [loop.id, { cx, cy, labelText, labelWidth }] as const
  })), [height, linkById, loops, positions, width])

  const selectVariable = (variable: CausalVariable): void => setSelected({ id: variable.id, label: variable.label, detail: variable.detail, kind: 'Variable', tone: toneAt(variable.tone) })
  const selectLink = (link: CausalLink): void => setSelected({ id: link.id, label: link.label ?? `${polaritySymbol(link.polarity)} ${variableById.get(link.to)?.label ?? link.to}`, detail: linkDetail(link, variableById), kind: 'Causal link', tone: toneAt(link.tone) })
  const selectLoop = (loop: CausalLoop): void => {
    const kind = loopKind(loop.type)
    const linksInLoop = loop.linkIds.map(id => linkById.get(id)?.label ?? id).join(' → ')
    setSelected({ id: loop.id, label: `${kind === 'reinforcing' ? 'R' : 'B'} · ${loop.label}`, detail: loop.detail ?? linksInLoop, kind: kind === 'reinforcing' ? 'Reinforcing loop' : 'Balancing loop', tone: toneAt(loop.tone) })
  }
  const summary = `Causal loop diagram with ${variables.length} variables, ${links.length} signed links and ${loops.length} named loops.`
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

  return (
    <div className={shell.rendererStack}>
      <div className={css.processViewport} ref={viewportRef}>
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
                  aria-label={`${kind === 'reinforcing' ? 'Reinforcing' : 'Balancing'} loop: ${loop.label}`}
                  onClick={() => selectLoop(loop)}
                  {...roving.itemProps(loop.id, () => selectLoop(loop))}
                  transform={`translate(${box.cx} ${box.cy})`}
                >
                  <g className={css.causalLoopBadge} data-loop-kind={kind}>
                    <rect x={-box.labelWidth / 2} y="-16" width={box.labelWidth} height="32" rx="16" />
                    <text x="0" y="1" textAnchor="middle" dominantBaseline="middle">{box.labelText}</text>
                  </g>
                </g>
              )
            })}
          </g>

          {/* Links */}
          <g>
            {links.map((link, index) => {
              const from = positions.get(link.from)
              const to = positions.get(link.to)
              const fromBox = boxByVarId.get(link.from) ?? { width: 120, height: 42, lines: [] }
              const toBox = boxByVarId.get(link.to) ?? { width: 120, height: 42, lines: [] }
              if (from === undefined || to === undefined) return null
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
              const path = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
              const tone = toneAt(link.tone, index)
              const isLinkInSelectedLoop = selected?.id !== undefined && loops.some(l => l.id === selected.id && l.linkIds.includes(link.id))
              const state = focus.active ? elementState(link.id, focus, [link.from, link.to]) : (selected?.id === link.id || isLinkInSelectedLoop ? 'selected' : 'overview')
              const delay = link.delay === undefined ? undefined : link.delay > 0 ? `+${link.delay}` : 'delay'

              // Curve parametric evaluation
              const tMid = 0.5
              const midCurveX = (1 - tMid) * (1 - tMid) * start.x + 2 * (1 - tMid) * tMid * controlX + tMid * tMid * end.x
              const midCurveY = (1 - tMid) * (1 - tMid) * start.y + 2 * (1 - tMid) * tMid * controlY + tMid * tMid * end.y
              const signX = midCurveX + normalX * 12
              const signY = midCurveY + normalY * 12
              // Keep the three annotation types in separate lanes. The
              // signed marker stays close to the link while delay and a long
              // label get deterministic breathing room in dense feedback
              // diagrams.
              const annotationLane = (index % 5) - 2
              const labelLines = link.label === undefined ? [] : wrapLabel(link.label, { fontSize: 11, maxWidth: 150, maxLines: 2 }).lines
              const labelWidth = labelLines.length === 0 ? 0 : Math.max(...labelLines.map(line => measureText(line, 11))) + 12
              const labelHeight = labelLines.length > 1 ? 30 : 18
              const baseLabelX = signX + normalX * 28
              const baseLabelY = signY + normalY * 28 + annotationLane * 24
              let labelX = baseLabelX
              let labelY = baseLabelY
              if (link.label !== undefined) {
                for (let attempt = 0; attempt < 8; attempt += 1) {
                  const offset = attempt === 0 ? 0 : Math.ceil(attempt / 2) * 30 * (attempt % 2 === 1 ? 1 : -1)
                  const candidateY = baseLabelY + offset
                  const collision = placedCausalLabels.some(previous => Math.abs(previous.x - baseLabelX) < (previous.width + labelWidth) / 2 + 8 && Math.abs(previous.y - candidateY) < (previous.height + labelHeight) / 2 + 6)
                  if (!collision) {
                    labelX = baseLabelX
                    labelY = candidateY
                    break
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
                  aria-label={`${polaritySymbol(link.polarity)} link: ${linkDetail(link, variableById)}`}
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
                  aria-label={`Variable: ${variable.label}`}
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
      </div>
      <StateLegend states={legendStates} />
      <div className={shell.srOnly}>
        <p>{summary}</p>
        <ul>
          {variables.map(variable => <li key={variable.id}>{variable.label}{variable.detail === undefined ? '' : `: ${variable.detail}`}</li>)}
          {links.map(link => <li key={link.id}>{linkDetail(link, variableById)}</li>)}
          {loops.map(loop => <li key={loop.id}>{loopKind(loop.type) === 'reinforcing' ? 'R' : 'B'} · {loop.label}</li>)}
        </ul>
      </div>
      <SelectionSurface hint="Select a variable, signed link or loop to inspect the feedback relationship." selected={selected} onClose={() => setSelected(undefined)} />
    </div>
  )
}
