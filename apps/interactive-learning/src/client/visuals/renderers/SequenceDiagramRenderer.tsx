/** `sequence_diagram`: participants, lifelines and ordered messages. */
import { useId, useMemo, useState } from 'react'
import { SelectionSurface, StateLegend } from '../core/shell-parts.tsx'
import { toneAt } from '../core/format.ts'
import { DEFAULT_TONES, type RendererProps, type SequenceDiagramContent } from '../core/types.ts'
import { elementState } from '../state/visual-state.ts'
import { useContainerWidth, useRovingFocus } from '../state/hooks.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/process.module.css'

type ProcessRendererProps<T> = Omit<RendererProps<never>, 'content'> & { content: T }

type SequenceParticipant = SequenceDiagramContent['participants'][number]
type SequenceMessage = SequenceDiagramContent['messages'][number]

interface Selected {
  label: string
  detail?: string
  kind: string
  tone?: ReturnType<typeof toneAt>
}

const CARD_WIDTH = 128
const CARD_HEIGHT = 42
const MIN_ACTOR_GAP = 174
const SIDE_MARGIN = CARD_WIDTH / 2 + 8
const TOP = 18
const LIFELINE_TOP = 74
const MESSAGE_TOP = 108
const MESSAGE_GAP = 68

function messageLabelWidth(label: string): number {
  return Math.min(250, Math.max(72, label.length * 7 + 24))
}

function messageDetail(message: SequenceMessage, participants: ReadonlyMap<string, SequenceParticipant>): string {
  const from = participants.get(message.from)?.label ?? message.from
  const to = participants.get(message.to)?.label ?? message.to
  const route = `${from} → ${to}`
  return [route, message.type, message.detail].filter((part): part is string => part !== undefined && part.length > 0).join(' · ')
}

export function SequenceDiagramRenderer({ content, focus }: ProcessRendererProps<SequenceDiagramContent>) {
  const diagramId = useId()
  const [viewportRef, containerWidth] = useContainerWidth()
  const [selected, setSelected] = useState<Selected | undefined>()
  const participants = content.participants
  const messages = content.messages
  const participantById = useMemo(() => new Map(participants.map(participant => [participant.id, participant])), [participants])
  const width = Math.max(520, containerWidth, SIDE_MARGIN * 2 + Math.max(0, participants.length - 1) * MIN_ACTOR_GAP)
  const actorGap = participants.length <= 1 ? 0 : (width - SIDE_MARGIN * 2) / (participants.length - 1)
  const height = Math.max(150, MESSAGE_TOP + messages.length * MESSAGE_GAP + 36)
  const participantX = (index: number): number => participants.length <= 1 ? width / 2 : SIDE_MARGIN + index * actorGap
  const participantIndex = useMemo(() => new Map(participants.map((participant, index) => [participant.id, index])), [participants])
  const rovingIds = useMemo(() => [...participants.map(participant => participant.id), ...messages.map(message => message.id)], [messages, participants])
  const roving = useRovingFocus(rovingIds)
  const selectParticipant = (participant: SequenceParticipant): void => setSelected({
    label: participant.label,
    detail: participant.detail,
    kind: 'Participant',
    tone: toneAt(participant.tone),
  })
  const selectMessage = (message: SequenceMessage): void => setSelected({
    label: message.label,
    detail: messageDetail(message, participantById),
    kind: 'Message',
    tone: toneAt(message.tone),
  })
  const summary = `Sequence diagram with ${participants.length} participants and ${messages.length} messages.`
  const legendStates = useMemo(
    () => focus.active ? [...participants, ...messages].map(item => elementState(item.id, focus)) : [],
    [focus, messages, participants],
  )

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
              <marker key={tone} id={`${diagramId}-${tone}`} className={css.diagramArrow} data-tone={tone} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,4 L0,8 z" />
              </marker>
            ))}
          </defs>

          <g aria-hidden="true">
            {participants.map((participant, index) => {
              const x = participantX(index)
              const tone = toneAt(participant.tone, index)
              return <line key={participant.id} className={css.lifeline} data-tone={tone} x1={x} y1={LIFELINE_TOP} x2={x} y2={height - 18} />
            })}
          </g>

          {/* Activation Bars */}
          <g aria-hidden="true">
            {messages.map((message, index) => {
              const toIndex = participantIndex.get(message.to)
              if (toIndex === undefined) return null
              const x = participantX(toIndex)
              const y = MESSAGE_TOP + index * MESSAGE_GAP
              const tone = toneAt(message.tone, index)
              return (
                <rect
                  key={`act-${message.id}`}
                  className={css.activation}
                  data-tone={tone}
                  x={x - 6}
                  y={y - 8}
                  width="12"
                  height="36"
                  rx="4"
                />
              )
            })}
          </g>

          <g>
            {messages.map((message, index) => {
              const fromIndex = participantIndex.get(message.from)
              const toIndex = participantIndex.get(message.to)
              if (fromIndex === undefined || toIndex === undefined) return null
              const fromX = participantX(fromIndex)
              const toX = participantX(toIndex)
              const y = MESSAGE_TOP + index * MESSAGE_GAP
              const tone = toneAt(message.tone, index)
              const state = focus.active ? elementState(message.id, focus, [message.from, message.to]) : 'overview'
              const self = message.type === 'self' || message.from === message.to
              const startX = self ? fromX : fromX
              const endX = self ? fromX : toX
              const selfRadius = Math.min(84, Math.max(36, actorGap * 0.42))
              const path = self
                ? `M ${fromX} ${y} C ${fromX + selfRadius} ${y - 24}, ${fromX + selfRadius} ${y + 26}, ${fromX} ${y + 28}`
                : `M ${startX} ${y} L ${endX} ${y}`
              const labelX = self ? fromX + selfRadius + 8 : (fromX + toX) / 2
              const labelY = self ? y - 14 : y - 12
              const boxWidth = messageLabelWidth(message.label)
              return (
                <g
                  key={message.id}
                  className={css.messageGroup}
                  data-tone={tone}
                  data-message-type={message.type}
                  data-visual-id={message.id}
                  data-visual-state={state}
                  role="button"
                  aria-label={`Message ${message.label}: ${messageDetail(message, participantById)}`}
                  onClick={() => selectMessage(message)}
                  {...roving.itemProps(message.id, () => selectMessage(message))}
                >
                  <path className={css.messageLine} d={path} markerEnd={`url(#${diagramId}-${tone})`} />
                  <path className={css.messageHit} d={path} />
                  <g className={css.messageLabel} transform={`translate(${labelX} ${labelY})`}>
                    <rect x={-boxWidth / 2} y="-13" width={boxWidth} height="26" rx="9" />
                    <text textAnchor="middle" dominantBaseline="middle">{message.label}</text>
                  </g>
                  {message.detail === undefined ? null : <title>{message.detail}</title>}
                </g>
              )
            })}
          </g>

          <g>
            {participants.map((participant, index) => {
              const x = participantX(index)
              const tone = toneAt(participant.tone, index)
              const state = focus.active ? elementState(participant.id, focus) : 'overview'
              return (
                <g
                  key={participant.id}
                  className={css.participantGroup}
                  transform={`translate(${x} ${TOP + CARD_HEIGHT / 2})`}
                  data-tone={tone}
                  data-visual-id={participant.id}
                  data-visual-state={selected?.label === participant.label ? 'selected' : state}
                  role="button"
                  aria-label={`Participant: ${participant.label}`}
                  onClick={() => selectParticipant(participant)}
                  {...roving.itemProps(participant.id, () => selectParticipant(participant))}
                >
                  <rect className={css.participantCard} x={-CARD_WIDTH / 2} y={-CARD_HEIGHT / 2} width={CARD_WIDTH} height={CARD_HEIGHT} rx="11" />
                  <text className={css.participantLabel} textAnchor="middle" dominantBaseline="middle">{participant.label}</text>
                  {participant.detail === undefined ? null : <title>{participant.detail}</title>}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <StateLegend states={legendStates} />
      <div className={shell.srOnly}>
        <p>{summary}</p>
        <ol>
          {messages.map(message => <li key={message.id}>{messageDetail(message, participantById)}: {message.label}</li>)}
        </ol>
      </div>
      <SelectionSurface hint="Select a participant or message to inspect the interaction." selected={selected} onClose={() => setSelected(undefined)} />
    </div>
  )
}
