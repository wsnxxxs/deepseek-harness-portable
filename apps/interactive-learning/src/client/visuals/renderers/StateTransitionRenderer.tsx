/**
 * `state_transition`: a state machine whose current state is visible.
 *
 * This is intentionally a small diagram renderer.  States and transitions
 * remain real, keyboard reachable marks, while trigger/guard/action are kept
 * on the transition so the learner can inspect the rule without leaving the
 * figure.  The renderer also understands the common `nodes`/`edges` aliases;
 * that makes hand-written examples easy to migrate from a node-link payload.
 */
import { useId, useMemo, useState } from 'react'
import { labelTemplate, useVisualLabels } from '../core/labels.ts'
import { EmptyFigure, FigureViewport, SelectionSurface, StateLegend } from '../core/shell-parts.tsx'
import { toneAt } from '../core/format.ts'
import { DEFAULT_TONES, type RendererProps, type StateTransitionContent } from '../core/types.ts'
import { elementState, type VisualFocus } from '../state/visual-state.ts'
import { useContainerWidth, useRovingFocus } from '../state/hooks.ts'
import { measureText, wrapLabel } from '../layout/text-metrics.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/process.module.css'

type ProcessRendererProps<T> = Omit<RendererProps<never>, 'content'> & { content: T }

type StateTransitionState = StateTransitionContent['states'][number]
type StateTransitionEdge = StateTransitionContent['transitions'][number]
type StateTransitionStep = NonNullable<StateTransitionContent['steps']>[number]

interface Selected {
  label: string
  detail?: string
  kind: string
  tone?: ReturnType<typeof toneAt>
}

interface StateBox {
  x: number
  y: number
  width: number
  height: number
}

const STATE_WIDTH = 150
const STATE_HEIGHT = 60
const STATE_GAP = 112
const SIDE_PADDING = 28
const ROW_HEIGHT = 122
/**
 * Headroom above the first row for the labels that sit there.
 *
 * A same-row pair with a return edge puts its caption at `startY - 36`, and a
 * two-line caption is 40 tall, so on the first row the chip reached about 16px
 * above the canvas and was cut off by the frame — taking the transition's
 * trigger condition with it, which is the part of a state diagram a learner
 * most needs to read.
 */
const TOP_LABEL_BAND = 40

function transitionLabelLayout(label: string): { width: number; height: number; lines: string[] } {
  const lines = wrapLabel(label, { fontSize: 13, maxWidth: 220, maxLines: 2 }).lines
  return {
    width: Math.min(244, Math.max(92, Math.max(...lines.map(line => measureText(line, 13)), 0) + 22)),
    height: lines.length > 1 ? 40 : 30,
    lines,
  }
}

function edgeFrom(edge: StateTransitionEdge): string {
  return edge.from
}

function edgeTo(edge: StateTransitionEdge): string {
  return edge.to
}

function stateDetail(state: StateTransitionState): string | undefined {
  return state.detail
}

function edgeDetail(edge: StateTransitionEdge): string | undefined {
  const parts = [
    `Trigger: ${edge.trigger}`,
    edge.guard === undefined ? undefined : `Guard: ${edge.guard}`,
    edge.action === undefined ? undefined : `Action: ${edge.action}`,
    edge.detail,
  ].filter((part): part is string => part !== undefined && part.length > 0)
  return parts.length === 0 ? undefined : parts.join(' · ')
}

function edgeCaption(edge: StateTransitionEdge): string {
  const trigger = edge.trigger
  const guard = edge.guard === undefined ? undefined : `[${edge.guard}]`
  const action = edge.action === undefined ? undefined : `/ ${edge.action}`
  return [trigger, guard, action].filter((part): part is string => part !== undefined && part.length > 0).join(' ')
}

function orderedStates(content: StateTransitionContent): StateTransitionState[] {
  const states = [...content.states]
  return states.sort((left, right) => {
    const leftInitial = left.initial === true ? 0 : 1
    const rightInitial = right.initial === true ? 0 : 1
    return leftInitial - rightInitial
  })
}

function layoutStates(states: readonly StateTransitionState[], width: number): { width: number; height: number; boxes: Map<string, StateBox> } {
  const perRow = Math.max(1, Math.floor((Math.max(width, 360) - SIDE_PADDING * 2 + STATE_GAP) / (STATE_WIDTH + STATE_GAP)))
  const rows = Math.max(1, Math.ceil(states.length / perRow))
  const canvasWidth = Math.max(Math.max(width, 360), SIDE_PADDING * 2 + perRow * STATE_WIDTH + (perRow - 1) * STATE_GAP)
  const canvasHeight = SIDE_PADDING * 2 + TOP_LABEL_BAND + rows * STATE_HEIGHT + (rows - 1) * (ROW_HEIGHT - STATE_HEIGHT)
  const boxes = new Map<string, StateBox>()
  states.forEach((state, index) => {
    const row = Math.floor(index / perRow)
    const column = index % perRow
    const rowCount = Math.min(perRow, states.length - row * perRow)
    const rowWidth = rowCount * STATE_WIDTH + Math.max(0, rowCount - 1) * STATE_GAP
    const start = (canvasWidth - rowWidth) / 2
    boxes.set(state.id, {
      x: start + column * (STATE_WIDTH + STATE_GAP) + STATE_WIDTH / 2,
      y: SIDE_PADDING + TOP_LABEL_BAND + row * ROW_HEIGHT + STATE_HEIGHT / 2,
      width: STATE_WIDTH,
      height: STATE_HEIGHT,
    })
  })
  return { width: canvasWidth, height: canvasHeight, boxes }
}

function stateVisualState(id: string, focus: VisualFocus, currentStateId: string | undefined, related: string[] = []) {
  if (focus.active) return elementState(id, focus, related)
  return id === currentStateId ? 'current' : 'overview'
}

export function StateTransitionRenderer({ content, focus }: ProcessRendererProps<StateTransitionContent>) {
  const labels = useVisualLabels()
  const diagramId = useId()
  const [viewportRef, containerWidth] = useContainerWidth()
  const [selected, setSelected] = useState<Selected | undefined>()
  const [activeStepId, setActiveStepId] = useState<string | undefined>(content.steps?.[0]?.id)
  const states = useMemo(() => orderedStates(content), [content])
  const transitions = useMemo(
    () => [...content.transitions],
    [content],
  )
  const layout = useMemo(() => layoutStates(states, containerWidth), [containerWidth, states])
  const stateById = useMemo(() => new Map(states.map(state => [state.id, state])), [states])
  const currentStateId = content.steps?.find(step => step.id === activeStepId)?.currentStateId
  const currentTransitionId = content.steps?.find(step => step.id === activeStepId)?.transitionId
  const initialStateId = states.find(state => state.initial === true)?.id
  const terminalIds = useMemo(() => new Set(states.filter(state => state.final === true).map(state => state.id)), [states])
  const rovingIds = useMemo(() => [...states.map(state => state.id), ...transitions.map(edge => edge.id)], [states, transitions])
  const roving = useRovingFocus(rovingIds)
  const selectState = (state: StateTransitionState): void => setSelected({
    label: state.label,
    detail: stateDetail(state),
    kind: state.id === initialStateId || state.initial === true ? labels.stateInitialKind : terminalIds.has(state.id) ? labels.stateTerminalKind : labels.stateKind,
    tone: toneAt(state.tone),
  })
  const selectTransition = (edge: StateTransitionEdge): void => {
    const from = stateById.get(edgeFrom(edge) ?? '')?.label ?? edgeFrom(edge) ?? labels.stateKind
    const to = stateById.get(edgeTo(edge) ?? '')?.label ?? edgeTo(edge) ?? labels.stateKind
    setSelected({
      label: edgeCaption(edge) || `${from} → ${to}`,
      detail: edgeDetail(edge) ?? `${from} → ${to}`,
      kind: labels.transitionKind,
      tone: toneAt(edge.tone),
    })
  }
  const summary = labelTemplate(labels.stateTransitionSummary, { states: states.length, transitions: transitions.length })
  const legendStates = useMemo(
    () => focus.active ? states.map(state => stateVisualState(state.id, focus, currentStateId)) : [],
    [currentStateId, focus, states],
  )

  // An accepted payload with nothing in it says so, rather than presenting an
  // empty frame that reads as a broken renderer.
  if (states.length === 0) return <EmptyFigure />

  return (
    <div className={shell.rendererStack}>
      <FigureViewport viewportRef={viewportRef}>
        <svg
          ref={roving.containerRef}
          className={css.processSvg}
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="group"
          aria-label={summary}
        >
          <defs>
            {DEFAULT_TONES.map(tone => (
              <marker key={tone} id={`${diagramId}-${tone}`} className={css.processArrow} data-tone={tone} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" />
              </marker>
            ))}
          </defs>

          <g className={css.transitionLayer}>
            {transitions.map((edge, index) => {
              const from = layout.boxes.get(edgeFrom(edge) ?? '')
              const to = layout.boxes.get(edgeTo(edge) ?? '')
              if (from === undefined || to === undefined) return null
              const sameRow = Math.abs(from.y - to.y) < 1
              const hasReverse = transitions.some(other => other.id !== edge.id && edgeFrom(other) === edgeTo(edge) && edgeTo(other) === edgeFrom(edge))
              const isForward = to.x >= from.x

              const caption = edgeCaption(edge)
              const labelLayout = transitionLabelLayout(caption)
              let path = ''
              let labelX = (from.x + to.x) / 2
              let labelY = (from.y + to.y) / 2

              if (sameRow) {
                if (isForward) {
                  const startX = from.x + from.width / 2
                  const endX = to.x - to.width / 2
                  const startY = from.y
                  const endY = to.y
                  if (hasReverse) {
                    const curveY = startY - 26
                    path = `M ${startX} ${startY} Q ${(startX + endX) / 2} ${curveY} ${endX} ${endY}`
                    labelX = (startX + endX) / 2
                    labelY = from.y - from.height / 2 - labelLayout.height / 2 - 6
                  } else {
                    path = `M ${startX} ${startY} L ${endX} ${endY}`
                    labelX = (startX + endX) / 2
                    labelY = from.y - from.height / 2 - labelLayout.height / 2 - 6
                  }
                } else {
                  // Backward return on same row
                  const startX = from.x - from.width / 2
                  const endX = to.x + to.width / 2
                  const startY = from.y
                  const endY = to.y
                  const curveY = startY + 36
                  path = `M ${startX} ${startY} Q ${(startX + endX) / 2} ${curveY} ${endX} ${endY}`
                  labelX = (startX + endX) / 2
                  labelY = from.y + from.height / 2 + labelLayout.height / 2 + 6
                }
              } else {
                // Cross row
                const startX = isForward ? from.x + from.width / 2 : from.x
                const endX = isForward ? to.x - to.width / 2 : to.x
                const startY = from.y + from.height / 2
                const endY = to.y - to.height / 2
                const direction = isForward ? 1 : -1
                path = `M ${startX} ${startY} C ${startX + direction * 50} ${startY + 24}, ${endX - direction * 50} ${endY - 24}, ${endX} ${endY}`
                labelX = (startX + endX) / 2
                labelY = (startY + endY) / 2
              }

              const state = focus.active
                ? elementState(edge.id, focus, [edgeFrom(edge), edgeTo(edge)])
                : edge.id === currentTransitionId ? 'current' : 'overview'
              const tone = toneAt(edge.tone, index)
              // Lanes only shift a cross-row caption; a same-row one is already
              // parked outside the boxes and must not be nudged back into them.
              if (!sameRow) labelY += ((index % 3) - 1) * 14
              // Whatever the lane offsets add up to, the chip stays inside the frame.
              labelY = Math.max(labelLayout.height / 2 + 4, Math.min(layout.height - labelLayout.height / 2 - 4, labelY))
              return (
                <g
                  key={edge.id}
                  className={css.transitionGroup}
                  data-tone={tone}
                  data-visual-id={edge.id}
                  data-visual-state={state}
                  role="button"
                  aria-label={`${labels.transitionKind} ${caption || `${edgeFrom(edge)} → ${edgeTo(edge)}`}`}
                  onClick={() => selectTransition(edge)}
                  {...roving.itemProps(edge.id, () => selectTransition(edge))}
                >
                  <path className={css.transitionLine} d={path} markerEnd={`url(#${diagramId}-${tone})`} />
                  <path className={css.transitionHit} d={path} />
                  {caption === '' ? null : (
                    <g className={css.transitionLabel} transform={`translate(${labelX} ${labelY})`}>
                      <rect x={-labelLayout.width / 2} y={-labelLayout.height / 2} width={labelLayout.width} height={labelLayout.height} rx="9" />
                      <text textAnchor="middle" dominantBaseline="middle">
                        {labelLayout.lines.map((line, lineIndex) => <tspan key={lineIndex} x="0" dy={lineIndex === 0 ? (labelLayout.lines.length > 1 ? '-0.55em' : '0.34em') : '1.1em'}>{line}</tspan>)}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>

          <g>
            {states.map((state, index) => {
              const box = layout.boxes.get(state.id)
              if (box === undefined) return null
              const tone = toneAt(state.tone, index)
              const related = transitions.flatMap(edge => edgeFrom(edge) === state.id ? [edgeTo(edge)] : edgeTo(edge) === state.id ? [edgeFrom(edge)] : [])
              const isCurrent = state.id === currentStateId
              const visualState = isCurrent ? 'current' : stateVisualState(state.id, focus, currentStateId, related)
              const isInitial = state.id === initialStateId || state.initial === true
              const isTerminal = terminalIds.has(state.id)
              return (
                <g
                  key={state.id}
                  className={css.stateGroup}
                  transform={`translate(${box.x} ${box.y})`}
                  data-tone={tone}
                  data-visual-id={state.id}
                  data-visual-state={selected?.label === state.label ? 'selected' : visualState}
                  data-initial={isInitial || undefined}
                  data-terminal={isTerminal || undefined}
                  aria-current={isCurrent ? 'step' : undefined}
                  role="button"
                  aria-label={`${state.label}${state.detail === undefined ? '' : `${labels.sentenceSeparator}${state.detail}`}`}
                  onClick={() => selectState(state)}
                  {...roving.itemProps(state.id, () => selectState(state))}
                >
                  <rect className={css.stateRing} x={-box.width / 2 - 4} y={-box.height / 2 - 4} width={box.width + 8} height={box.height + 8} rx="14" />
                  <rect className={css.stateShape} x={-box.width / 2} y={-box.height / 2} width={box.width} height={box.height} rx="12" />
                  {isCurrent ? <path className={css.currentStateMarker} d={`M 0 ${-box.height / 2 - 16} l -7 8 h 14 z`} /> : null}
                  {!isTerminal ? null : (
                    <rect x={-box.width / 2 + 4} y={-box.height / 2 + 4} width={box.width - 8} height={box.height - 8} rx="8" fill="none" stroke="var(--visual-tone)" strokeWidth="1.2" opacity="0.75" />
                  )}
                  <text className={css.stateLabel} textAnchor="middle" dominantBaseline="middle">{state.label}</text>
                  {!isInitial ? null : (
                    <g className={css.stateMarker} transform={`translate(${-box.width / 2 - 18} 0)`}>
                      <circle cx="-6" cy="0" r="4" fill="var(--visual-tone)" />
                      <line x1="-2" y1="0" x2="10" y2="0" stroke="var(--visual-tone)" strokeWidth="1.8" markerEnd={`url(#${diagramId}-${tone})`} />
                    </g>
                  )}
                  {state.detail === undefined ? null : <title>{state.detail}</title>}
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
          {states.map(state => <li key={state.id}>{state.label}{state.detail === undefined ? '' : `: ${state.detail}`}</li>)}
          {transitions.map(edge => <li key={edge.id}>{edgeCaption(edge) || edge.id}{edgeDetail(edge) === undefined ? '' : `: ${edgeDetail(edge)}`}</li>)}
        </ul>
      </div>
      <SelectionSurface hint={labels.stateTransitionInteractionHint} selected={selected} onClose={() => setSelected(undefined)} />
      {content.steps === undefined || content.steps.length === 0 ? null : (
        <ol className={css.processSteps} aria-label={labels.stateTransitionStepsLabel}>
          {content.steps.map(step => {
            const active = focus.active ? focus.currentIds.has(step.currentStateId) : step.id === activeStepId
            return <li key={step.id} data-active={active || undefined}><button type="button" className={`${shell.control} ${css.stepButton}`} onClick={() => setActiveStepId(step.id)}><strong>{step.label}</strong>{step.description === undefined ? null : <span>{step.description}</span>}</button></li>
          })}
        </ol>
      )}
    </div>
  )
}
