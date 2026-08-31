/**
 * The permission-approval card: the composer seat for one pending Host
 * permission request.
 *
 * DSH's own approval plugin publishes each waiting Host request into the
 * shared Session pending-interaction roster; DCode renders that value here
 * because the custom composer replaces the official composer seat that the
 * approval slot chain would otherwise take over. The decision is transient:
 * allow-once or reject, never a persistent permission grant.
 * @module @dsh-portable/dcode-ui/client/shell/ApprovalCard
 */

import { useState } from 'react'
import type { DcodePendingApproval } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import { Button, Spinner } from './ui.tsx'
import css from './QuestionComposer.module.css'

/** Small inline shield so the card is recognizable without color alone. */
function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden>
      <path d="M8 1.5 13 3.4v3.8c0 3.1-1.9 5.8-5 7.3-3.1-1.5-5-4.2-5-7.3V3.4z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="m5.8 7.9 1.4 1.4 3-3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Composer takeover for one waiting Host approval request. */
export function ApprovalCard({ pending }: { pending: DcodePendingApproval }) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const settle = (outcome: 'allowed-once' | 'rejected'): void => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    void pending.answer(outcome).catch((cause: unknown) => {
      setBusy(false)
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }

  return (
    <div className={css.frame} data-approval-key={pending.key}>
      <section className={`${css.card} ${css.reviewCard}`} aria-label={t('approval.title')}>
        <header className={css.reviewHeader}>
          <span className={css.kicker}><ShieldIcon />{t('approval.title')}</span>
        </header>
        <div className={css.reviewBody}>
          <div className={css.approvalHeadline}>
            {pending.reason ?? t('approval.escalation', { toolName: pending.toolName })}
          </div>
          <div className={css.approvalMeta}>{t('approval.tool', { toolName: pending.toolName })}</div>
        </div>
        <footer className={css.reviewFooter}>
          <div className={css.feedback} role="alert">{error}</div>
          <div className={css.footerActions}>
            <Button disabled={busy} onClick={() => { settle('rejected') }}>{t('approval.reject')}</Button>
            <Button primary autoFocus disabled={busy} onClick={() => { settle('allowed-once') }}>
              {busy ? <><Spinner size="sm" />{t('question.submitting')}</> : t('approval.allowOnce')}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}
