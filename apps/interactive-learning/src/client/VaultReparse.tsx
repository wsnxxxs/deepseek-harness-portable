/**
 * The re-read control — the one place in this panel that spends money.
 *
 * Everything else under 学习库 is local file I/O by default. This control is
 * the explicit exception, so it is built to be unmistakable rather than
 * convenient:
 *
 * - It is OUTLINED in the accent, never filled. Filled buttons in this panel
 *   mean "commits locally"; the outline plus the 「调用模型」 marker is the
 *   whole visual vocabulary for "this leaves your machine".
 * - It names the exact model that will read the pages, and how many pages, in
 *   the button's own label. Not in a tooltip and not after the click.
 * - It asks {@link materialRouteInfo} first, which costs nothing, so all four
 *   reasons a re-read cannot happen are stated BEFORE anyone commits: a
 *   text-only model, no rasterizer, no model selected, or nothing left to read.
 *
 * A text-only model is a refusal, not a silent reroute. This pack cannot see
 * another pack's fallback configuration, so the honest answer is to name the
 * model and say to switch it.
 * @module @dsh-portable/interactive-learning/src/client/VaultReparse
 */

import { useCallback, useEffect, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { Ask } from './VaultConcepts.tsx'
import css from './VaultView.module.css'

type Translate = PropsLocale<'interactive-learning'>['t']

/** The route report, as `material-vision.ts` projects it. */
export interface RouteInfo {
  status: string
  route: 'native-image' | 'text-only-model' | 'unknown-capability' | 'renderer-missing' | 'no-route'
  model: string | null
  pages: number[]
  reparsed: number[]
  spendsTokens: boolean
  renderer: string | null
}

/** One page's outcome from a re-read. */
export interface ReparsedPage {
  page: number
  status: 'ok' | 'render-failed' | 'model-failed' | 'empty'
  chars: number
  message?: string
}

export interface ReparseResult {
  status: string
  route: string
  model: string | null
  pages: ReparsedPage[]
  recovered: number[]
  reanchored?: { moved: number; stale: number; recovered: number }
}

const PAGE_STATUS_LABEL = {
  ok: 'vaultReparsePageOk',
  empty: 'vaultReparsePageEmpty',
  'model-failed': 'vaultReparsePageModelFailed',
  'render-failed': 'vaultReparsePageRenderFailed',
} as const

function pageList(pages: readonly number[]): string {
  return pages.map(page => String(page)).join(', ')
}

/**
 * Why a re-read is unavailable, in a sentence a person can act on.
 *
 * Each branch names the specific thing to change — the model, the missing
 * package, the selection — because "unavailable" alone would make the feature
 * look broken rather than blocked.
 */
function blockedText(info: RouteInfo, t: Translate): string {
  if (info.status === 'not-pdf') return t('vaultReparseNotPdf')
  if (info.status === 'source-file-missing') return t('vaultReparseSourceGone')
  if (info.route === 'renderer-missing') return t('vaultReparseNoRenderer')
  if (info.route === 'no-route') return t('vaultReparseNoModel')
  if (info.route === 'text-only-model') return t('vaultReparseTextOnly', { model: info.model ?? '' })
  return ''
}

/**
 * The control, mounted under a degraded source.
 *
 * The route is fetched when the panel opens the control, not on every render:
 * it reads the provider catalog and probes for a rasterizer, and neither is
 * work worth repeating while somebody scrolls.
 */
export function ReparseControl({
  sourceId, sessionId, degraded, ask, onDone, t,
}: {
  sourceId: string
  /** Session identity lets the host resolve the model selected for this session. */
  sessionId?: string
  /** Whether the source still reports unreadable pages. */
  degraded: boolean
  ask: Ask
  /** Called after a re-read that actually wrote something, so the panel reloads. */
  onDone: () => void
  t: Translate
}) {
  const [info, setInfo] = useState<RouteInfo | undefined>(undefined)
  const [asked, setAsked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ReparseResult | undefined>(undefined)
  const [failure, setFailure] = useState('')

  useEffect(() => {
    if (!asked) return
    let cancelled = false
    void (async () => {
      try {
        const answer = await ask<RouteInfo>('material/route-info', {
          sourceId,
          ...(sessionId === undefined ? {} : { sessionId }),
        })
        if (answer === undefined) throw new Error(t('vaultFailed'))
        if (!cancelled) setInfo(answer)
      } catch {
        if (!cancelled) setFailure(t('vaultFailed'))
      }
    })()
    return () => { cancelled = true }
  }, [ask, asked, sessionId, sourceId, t])

  const run = useCallback(() => {
    setBusy(true)
    setFailure('')
    void (async () => {
      try {
        const answer = await ask<ReparseResult>('material/reparse-pages', {
          sourceId,
          ...(sessionId === undefined ? {} : { sessionId }),
        })
        if (answer === undefined) throw new Error(t('vaultFailed'))
        setResult(answer)
        if (answer.recovered.length > 0) onDone()
      } catch (cause) {
        setFailure(cause instanceof Error ? cause.message : t('vaultFailed'))
      } finally {
        setBusy(false)
      }
    })()
  }, [ask, onDone, sessionId, sourceId, t])

  if (!degraded && result === undefined) return null

  if (!asked) {
    return (
      <button type="button" className={css.button} onClick={() => { setFailure(''); setAsked(true) }}>
        {t('vaultReparseOffer')}
      </button>
    )
  }

  if (info === undefined) {
    return failure === ''
      ? <p className={css.hint}>{t('vaultLoading')}</p>
      : <p className={css.staleNote} role="alert">{failure}</p>
  }

  const blocked = blockedText(info, t)
  const runnable = blocked === '' && info.pages.length > 0

  return (
    <div className={css.reparse}>
      {runnable && (
        <>
          <div className={css.actions}>
            <button type="button" className={css.buttonSpend} disabled={busy} onClick={run}>
              {busy
                ? t('vaultReparseRunning', { count: String(info.pages.length) })
                : t('vaultReparseRun', { count: String(info.pages.length), model: info.model ?? '' })}
            </button>
            <span className={css.spendMark}>{t('vaultCallsModel')}</span>
          </div>
          <p className={css.hint}>
            {t('vaultReparseExplain', { pages: pageList(info.pages), model: info.model ?? '' })}
          </p>
          {info.route === 'unknown-capability' && (
            <p className={css.staleNote}>{t('vaultReparseUnknownCapability', { model: info.model ?? '' })}</p>
          )}
        </>
      )}

      {blocked !== '' && <p className={css.staleNote}>{blocked}</p>}
      {blocked === '' && info.pages.length === 0 && (
        <p className={css.hint}>{t('vaultReparseNothing')}</p>
      )}
      {info.reparsed.length > 0 && (
        <p className={css.systemNote}>
          {t('vaultReparseAlready', { pages: pageList(info.reparsed) })}
        </p>
      )}

      {result !== undefined && (
        <div className={css.group}>
          <p className={result.recovered.length > 0 ? css.notice : css.staleNote}>
            {result.recovered.length > 0
              ? t('vaultReparseDone', { count: String(result.recovered.length) })
              : t('vaultReparseNoneRecovered')}
          </p>
          <ul className={css.chips}>
            {result.pages.map(page => (
              <li
                key={page.page}
                className={page.status === 'ok' ? css.chipAnchor : css.chipWarn}
                title={page.message ?? ''}
              >
                {t(PAGE_STATUS_LABEL[page.status], { page: String(page.page) })}
              </li>
            ))}
          </ul>
          {result.reanchored !== undefined && result.reanchored.stale > 0 && (
            <p className={css.staleNote}>
              {t('vaultReparseStale', { count: String(result.reanchored.stale) })}
            </p>
          )}
        </div>
      )}
      {failure !== '' && <p className={css.staleNote} role="alert">{failure}</p>}
    </div>
  )
}
