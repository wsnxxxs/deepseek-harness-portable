/** `timeline`: chronologies, phases and eras, horizontal or vertical. */
import { useMemo, useState, type CSSProperties } from 'react'
import { useVisualLabels } from '../core/labels.ts'
import { SelectionSurface } from '../core/shell-parts.tsx'
import { toneAt } from '../core/format.ts'
import type { RendererProps, TimelineContent } from '../core/types.ts'
import { elementState } from '../state/visual-state.ts'
import { useContainerWidth } from '../state/hooks.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/timeline.module.css'

type Selection = { label: string; detail?: string; kind: string }

/** Vertical distance from the axis to the top of an upper-row event card. */
const CARD_OFFSET = 72
/** Card width (128px) plus a small breathing room between neighbouring cards. */
const MIN_EVENT_GAP = 140
const AXIS_INSET = 66

/** One non-overlapping horizontal lane per era (the protocol caps eras at 8). */
export function timelineEraTop(index: number): number {
  return 14 + index * 28
}

function timelinePosition(event: TimelineContent['events'][number], index: number, count: number): number {
  if (event.position !== undefined) return Math.max(0, Math.min(1, event.position))
  return count <= 1 ? 0.5 : index / (count - 1)
}

interface TimelineEventLayout {
  width: number
  positions: number[]
}

/**
 * Resolve explicit positions that are too close to hold two event cards.
 *
 * The protocol's normalized positions are useful for showing long gaps, but
 * they can legitimately put several milestones in the same small interval.
 * Leaving those values untouched makes the fixed-width cards paint on top of
 * each other. We preserve the order and spread only colliding centres; the
 * canvas grows when the spread cannot fit, so the axis and era spans remain
 * honest and the viewport can scroll on a narrow surface.
 */
export function timelineEventLayout(
  content: TimelineContent,
  containerWidth: number,
): TimelineEventLayout {
  const count = content.events.length
  const minimumWidth = AXIS_INSET * 2 + Math.max(0, count - 1) * MIN_EVENT_GAP
  const baseWidth = Math.max(minimumWidth, Math.floor(containerWidth) - 2)
  if (count === 0) return { width: baseWidth, positions: [] }

  const raw = content.events.map((event, index) => (
    AXIS_INSET + timelinePosition(event, index, count) * (baseWidth - AXIS_INSET * 2)
  ))
  const ordered = raw
    .map((position, index) => ({ position, index }))
    .sort((a, b) => a.position - b.position || a.index - b.index)
  const resolved = new Array<number>(count)
  let previous = AXIS_INSET
  for (const [orderIndex, item] of ordered.entries()) {
    const position = orderIndex === 0
      ? Math.max(AXIS_INSET, item.position)
      : Math.max(item.position, previous + MIN_EVENT_GAP)
    resolved[item.index] = position
    previous = position
  }

  const width = baseWidth
  // A collision cluster near the right edge is shifted as one unit. The
  // minimum canvas width above guarantees enough room for every card plus the
  // gap, so this never clips the first card or changes the order.
  const overflow = Math.max(0, previous - (width - AXIS_INSET))
  if (overflow > 0) {
    for (let index = 0; index < resolved.length; index += 1) {
      resolved[index] = Math.max(AXIS_INSET, (resolved[index] ?? AXIS_INSET) - overflow)
    }
  }
  return { width, positions: resolved.map(position => position ?? AXIS_INSET) }
}

export function TimelineRenderer({ content, focus }: RendererProps<TimelineContent>) {
  const labels = useVisualLabels()
  const [viewportRef, containerWidth] = useContainerWidth()
  const [selected, setSelected] = useState<Selection | undefined>()
  const eras = content.eras ?? []
  const eventIndex = useMemo(() => new Map(content.events.map((event, index) => [event.id, index])), [content.events])
  const selectEvent = (event: TimelineContent['events'][number]): void => setSelected({ label: `${event.time} · ${event.label}`, detail: event.detail, kind: labels.timelineEventKind })
  const selectEra = (era: NonNullable<TimelineContent['eras']>[number]): void => setSelected({ label: era.label, detail: era.detail, kind: labels.timelineEraKind })

  // A narrow container gets the vertical form: a horizontal axis at that width
  // is a scroll gesture per event, which is not a timeline any more.
  const vertical = (content.orientation ?? 'horizontal') === 'vertical' || containerWidth < 420

  if (vertical) {
    return (
      <div className={shell.rendererStack} role="group" aria-label={labels.timelineLabel}>
        {eras.length === 0 ? null : (
          <div className={css.timelineEraChips} role="group" aria-label={labels.timelineEraKind}>
            {eras.map((era, index) => (
              <button key={era.id} type="button" className={`${shell.control} ${css.eraChip}`} data-tone={toneAt(era.tone, index)} data-visual-state={elementState(era.id, focus)} data-visual-id={era.id} onClick={() => selectEra(era)}>
                <strong>{era.label}</strong>
                <span>{content.events[eventIndex.get(era.startEventId) ?? 0]?.time} – {content.events[eventIndex.get(era.endEventId) ?? 0]?.time}</span>
              </button>
            ))}
          </div>
        )}
        <ol className={css.timelineVertical}>
          {content.events.map((event, index) => (
            <li key={event.id} data-tone={toneAt(event.tone, index)} data-visual-state={elementState(event.id, focus)} data-visual-id={event.id}>
              <button type="button" className={`${shell.control} ${css.verticalEvent}`} onClick={() => selectEvent(event)}>
                <span>{event.time}</span><strong>{event.label}</strong>
                {event.detail === undefined ? null : <small>{event.detail}</small>}
              </button>
            </li>
          ))}
        </ol>
        <SelectionSurface hint={labels.timelineInteractionHint} selected={selected} onClose={() => setSelected(undefined)} />
      </div>
    )
  }

  const eventLayout = timelineEventLayout(content, containerWidth)
  const width = eventLayout.width
  // The era lane is laid out first, then the axis is pushed far enough down
  // that the upper row of event cards clears it. Deriving the axis from a
  // constant instead put a two-row era lane underneath the first event card.
  // The protocol permits eight eras. Give each one its own compact lane;
  // wrapping with `index % 4` painted eras 5–8 directly over eras 1–4.
  const eraRows = eras.length
  const eraLaneBottom = eras.length === 0 ? 0 : 14 + (eraRows - 1) * 28 + 26
  const axisY = Math.max(90, eraLaneBottom + 8 + CARD_OFFSET)
  const height = axisY + 130
  const eventX = (_event: TimelineContent['events'][number], index: number): number => eventLayout.positions[index] ?? AXIS_INSET
  return (
    <div className={shell.rendererStack} role="group" aria-label={labels.timelineLabel}>
      <div className={shell.viewport} ref={viewportRef}>
        <div className={css.timelineCanvas} style={{ width, height }}>
          {eras.map((era, index) => {
            const startIndex = eventIndex.get(era.startEventId) ?? 0
            const endIndex = eventIndex.get(era.endEventId) ?? startIndex
            const start = eventX(content.events[startIndex] as TimelineContent['events'][number], startIndex)
            const end = eventX(content.events[endIndex] as TimelineContent['events'][number], endIndex)
            return (
              <button
                key={era.id}
                type="button"
                className={css.timelineEra}
                data-tone={toneAt(era.tone, index)}
                data-visual-state={elementState(era.id, focus)}
                data-visual-id={era.id}
                style={{ left: Math.min(start, end), top: timelineEraTop(index), width: Math.max(48, Math.abs(end - start)) } as CSSProperties}
                onClick={() => selectEra(era)}
              >{era.label}</button>
            )
          })}
          <div className={css.timelineAxis} style={{ top: axisY }} aria-hidden="true" />
          {content.events.map((event, index) => (
            <button
              key={event.id}
              type="button"
              className={css.timelineEvent}
              data-tone={toneAt(event.tone, index)}
              data-side={index % 2 === 0 ? 'top' : 'bottom'}
              data-visual-state={elementState(event.id, focus)}
              data-visual-id={event.id}
              style={{ left: eventX(event, index), top: index % 2 === 0 ? axisY - CARD_OFFSET : axisY + 24 } as CSSProperties}
              onClick={() => selectEvent(event)}
            >
              <span>{event.time}</span><strong>{event.label}</strong>
            </button>
          ))}
        </div>
      </div>
      <SelectionSurface hint={labels.timelineInteractionHint} selected={selected} onClose={() => setSelected(undefined)} />
    </div>
  )
}
