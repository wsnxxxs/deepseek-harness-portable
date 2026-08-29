import { useEffect, useId, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useProjectionValue } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useModalFocus } from './use-modal-focus.ts'
import css from './ContextMeter.module.css'

interface ContextPressure {
  readonly pressureTokens?: number
  readonly projectedTokens?: number
  readonly contextWindow?: number
}

interface ContextBreakdown {
  readonly systemTokens: number
  readonly toolsTokens: number
  readonly messageTokens: number
}

function formatTokens(value: number): string {
  if (value < 1_000) return String(Math.round(value))
  if (value < 1_000_000) return `${String(Math.round(value / 100) / 10)}K`
  return `${String(Math.round(value / 100_000) / 10)}M`
}

/** Compact context usage affordance beside the composer send control. */
export function ContextMeter({ sessionId }: { sessionId: SessionId | undefined }) {
  const t = useT()
  const pressure = useProjectionValue<ContextPressure>(sessionId, 'contextPressure')
  const breakdown = useProjectionValue<ContextBreakdown>(sessionId, 'contextBreakdown')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const panelId = useId()
  const titleId = useId()
  const used = pressure?.projectedTokens ?? pressure?.pressureTokens
  const capacity = pressure?.contextWindow
  const percent = used === undefined || capacity === undefined || capacity <= 0
    ? undefined
    : Math.min(100, Math.round(used / capacity * 100))

  useModalFocus(open, panelRef, { onClose: () => { setOpen(false) } })

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) === true) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => { document.removeEventListener('pointerdown', onPointerDown) }
  }, [open])

  useEffect(() => {
    if (percent === undefined && open) setOpen(false)
  }, [open, percent])

  if (percent === undefined || used === undefined || capacity === undefined) return null
  const label = t('context.aria', { percent: `${String(percent)}%` })
  const totalBreakdown = breakdown === undefined
    ? 0
    : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens
  const rows = breakdown === undefined || totalBreakdown === 0
    ? []
    : [
      { key: 'context.system', value: breakdown.systemTokens, className: css.system },
      { key: 'context.tools', value: breakdown.toolsTokens, className: css.tools },
      { key: 'context.messages', value: breakdown.messageTokens, className: css.messages },
    ]

  return (
    <span ref={rootRef} className={css.root}>
      <button
        type="button"
        className={css.trigger}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => { setOpen(value => !value) }}
      >
        <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden>
          <circle className={css.track} cx="7" cy="7" r="5.5" />
          <circle
            className={css.fill}
            cx="7"
            cy="7"
            r="5.5"
            strokeDasharray={`${String(2 * Math.PI * 5.5 * percent / 100)} ${String(2 * Math.PI * 5.5)}`}
            transform="rotate(-90 7 7)"
          />
        </svg>
      </button>
      {open
        ? (
          <div
            ref={panelRef}
            id={panelId}
            className={css.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
          >
            <div className={css.header} id={titleId}>
              <span>{t('context.used')}</span>
              <b>{percent}%</b>
              <span className={css.figures}>{t('context.tokens', { used: formatTokens(used), total: formatTokens(capacity) })}</span>
            </div>
            <div className={css.bar} aria-hidden>
              {rows.length === 0
                ? <span className={css.segment} style={{ width: `${String(percent)}%` }} />
                : rows.map(row => (
                  <span
                    key={row.key}
                    className={`${css.segment} ${row.className}`}
                    style={{ width: `${String(percent * row.value / totalBreakdown)}%` }}
                  />
                ))}
            </div>
            {rows.length === 0
              ? null
              : (
                <dl className={css.rows}>
                  {rows.map(row => (
                    <div className={css.row} key={row.key}>
                      <dt><span className={`${css.swatch} ${row.className}`} aria-hidden />{t(row.key as 'context.system' | 'context.tools' | 'context.messages')}</dt>
                      <dd>{formatTokens(row.value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
          </div>
        )
        : null}
    </span>
  )
}
