/** `sequence_buffer`: discrete slots, pointers and ranges with local step playback. */
import { useMemo, useState, type CSSProperties } from 'react'
import { formatNumber, toneAt } from '../core/format.ts'
import { useVisualLabels } from '../core/labels.ts'
import { EmptyFigure, FigureViewport, SelectionSurface, SequenceController } from '../core/shell-parts.tsx'
import type { RendererProps, SequenceBufferContent } from '../core/types.ts'
import { elementState } from '../state/visual-state.ts'
import shell from '../styles/shell.module.css'
import css from '../styles/sequence-buffer.module.css'

type Selection = { id: string; label: string; detail?: string; kind: string }

function displayValue(value: SequenceBufferContent['slots'][number]['value']): string {
  if (value === null) return '∅'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return formatNumber(value)
  return value
}

function steppedContent(content: SequenceBufferContent, stepIndex: number) {
  const slotValues = new Map(content.slots.map(slot => [slot.id, slot.value]))
  const pointerIndexes = new Map((content.pointers ?? []).map(pointer => [pointer.id, pointer.index]))
  const rangeBounds = new Map((content.ranges ?? []).map(range => [range.id, { start: range.start, end: range.end }]))
  for (const step of (content.steps ?? []).slice(0, stepIndex + 1)) {
    for (const snapshot of step.slots ?? []) {
      if (snapshot.value !== undefined) slotValues.set(snapshot.slotId, snapshot.value)
    }
    for (const snapshot of step.pointers ?? []) pointerIndexes.set(snapshot.pointerId, snapshot.index)
    for (const snapshot of step.ranges ?? []) rangeBounds.set(snapshot.rangeId, { start: snapshot.start, end: snapshot.end })
  }
  return { slotValues, pointerIndexes, rangeBounds }
}

export function SequenceBufferRenderer({ content, focus }: RendererProps<SequenceBufferContent>) {
  const labels = useVisualLabels()
  const [stepIndex, setStepIndex] = useState(0)
  const [selected, setSelected] = useState<Selection>()
  const slots = useMemo(() => [...content.slots].sort((left, right) => left.index - right.index), [content.slots])
  const slotOrder = useMemo(() => new Map(slots.map((slot, index) => [slot.index, index + 1])), [slots])
  const current = steppedContent(content, stepIndex)
  const gridStyle = { '--buffer-columns': String(Math.max(1, slots.length)) } as CSSProperties
  const steps = content.steps ?? []
  const sequence = useMemo(() => ({
    initialFrameId: steps[0]?.id,
    frames: steps.map(step => ({ id: step.id, label: step.label, description: step.description, focusIds: [] })),
  }), [steps])

  const columnAt = (index: number): number => slotOrder.get(index) ?? Math.max(1, Math.min(slots.length, index + 1))

  // An accepted payload with nothing in it says so, rather than presenting an
  // empty frame that reads as a broken renderer.
  if (slots.length === 0) return <EmptyFigure />

  return (
    <div className={shell.rendererStack}>
      {steps.length < 2 ? null : (
        <SequenceController sequence={sequence} frameIndex={stepIndex} onFrameChange={setStepIndex} />
      )}
      <FigureViewport className={css.bufferViewport} role="group" aria-label={labels.sequenceBufferLabel}>
        <div className={css.buffer} style={gridStyle}>
          {(content.ranges ?? []).map((range, rangeIndex) => {
            const bounds = current.rangeBounds.get(range.id) ?? range
            const start = columnAt(Math.min(bounds.start, bounds.end))
            const end = columnAt(Math.max(bounds.start, bounds.end))
            return (
              <button
                key={range.id}
                type="button"
                className={css.range}
                style={{ gridColumn: `${String(start)} / span ${String(Math.max(1, end - start + 1))}`, gridRow: String(rangeIndex + 1) }}
                data-tone={toneAt(range.tone, rangeIndex)}
                data-visual-id={range.id}
                data-visual-state={selected?.id === range.id ? 'selected' : elementState(range.id, focus)}
                onClick={() => setSelected({ id: range.id, label: range.label, detail: `${String(bounds.start)} … ${String(bounds.end)}`, kind: labels.sequenceBufferRangeKind })}
              >
                <span>{range.label}</span><small>{bounds.start}…{bounds.end}</small>
              </button>
            )
          })}
          <div className={css.slotGrid} style={gridStyle}>
            {slots.map((slot, index) => {
              const value = current.slotValues.has(slot.id)
                ? current.slotValues.get(slot.id) ?? null
                : slot.value
              return (
                <button
                  key={slot.id}
                  type="button"
                  className={css.slot}
                  data-tone={toneAt(slot.tone, index)}
                  data-visual-id={slot.id}
                  data-visual-state={selected?.id === slot.id ? 'selected' : elementState(slot.id, focus)}
                  data-missing={value === null || undefined}
                  onClick={() => setSelected({ id: slot.id, label: slot.label ?? `[${String(slot.index)}]`, detail: displayValue(value), kind: labels.sequenceBufferSlotKind })}
                >
                  <small>{slot.label}</small>
                  <strong>{displayValue(value)}</strong>
                  <span>{slot.index}</span>
                </button>
              )
            })}
          </div>
          <div className={css.pointerGrid} style={gridStyle}>
            {(content.pointers ?? []).map((pointer, pointerIndex) => {
              const index = current.pointerIndexes.get(pointer.id) ?? pointer.index
              return (
                <button
                  key={pointer.id}
                  type="button"
                  className={css.pointer}
                  style={{ gridColumn: columnAt(index), gridRow: String(pointerIndex + 1) }}
                  data-tone={toneAt(pointer.tone, pointerIndex)}
                  data-visual-id={pointer.id}
                  data-visual-state={selected?.id === pointer.id ? 'selected' : elementState(pointer.id, focus)}
                  onClick={() => setSelected({ id: pointer.id, label: pointer.label, detail: `index ${String(index)}`, kind: labels.sequenceBufferPointerKind })}
                >
                  <i aria-hidden="true">↑</i><span>{pointer.label}</span><small>{index}</small>
                </button>
              )
            })}
          </div>
        </div>
      </FigureViewport>
      <SelectionSurface hint={labels.sequenceBufferInteractionHint} selected={selected} onClose={() => setSelected(undefined)} />
    </div>
  )
}
