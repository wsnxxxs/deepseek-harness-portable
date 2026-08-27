/**
 * The vault panel's concept list, card editor and review deck.
 *
 * The editor's shape is the rule from the design doc made structural: the only
 * writable control is one textarea over the card's Markdown body, because every
 * prose field is derived from that body. Mastery, due, interval and anchors are
 * rendered as read-only facts with the two narrow manual outlets beside them —
 * "I didn't actually understand this" (down only) and "defer" (due only).
 *
 * Reviewing is local. Rating a card rewrites one date in the frontmatter; no
 * turn is created and no token is spent, which is the point of moving review
 * out of the conversation in the first place.
 * @module @dsh-portable/interactive-learning/src/client/VaultConcepts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './VaultView.module.css'

type Translate = PropsLocale<'interactive-learning'>['t']

/** One card, as `vault-concepts.ts` projects it. */
export interface Concept {
  conceptSlug: string
  label: string
  mastery: 'unseen' | 'emerging' | 'transfer'
  masteryBasis: string
  due: string | null
  intervalDays: number
  lastReviewedAt: string | null
  anchors: string[]
  staleAnchors: string[]
  explanation: string
  misconceptions: string[]
  unverifiedTransfer: string
  relatedConcepts: string[]
  path: string
  body: string
  due_now: boolean
}

export interface ConceptList { status: string; concepts: Concept[]; due: number; stale: number }

/** One host call, already unwrapped from the `{ ok, value }` envelope. */
export type Ask = <T>(endpoint: string, payload?: Record<string, unknown>) => Promise<T | undefined>

const MASTERY_LABEL = {
  unseen: 'vaultMasteryUnseen',
  emerging: 'vaultMasteryEmerging',
  transfer: 'vaultMasteryTransfer',
} as const

const MASTERY_CLASS = {
  unseen: css.masteryUnseen,
  emerging: css.masteryEmerging,
  transfer: css.masteryTransfer,
} as const

const RATINGS = [
  { rating: 'revealed', label: 'vaultRateRevealed' },
  { rating: 'review', label: 'vaultRateReview' },
  { rating: 'mastered', label: 'vaultRateMastered' },
] as const

function day(value: string | null): string {
  return value === null ? '' : value.slice(0, 10)
}

/** The card's schedule in one line: state, interval, and last review. */
function Schedule({ concept, t }: { concept: Concept; t: Translate }) {
  return (
    <ul className={css.counts}>
      <li className={MASTERY_CLASS[concept.mastery]}>
        {t(MASTERY_LABEL[concept.mastery])}
        <span className={css.basis}>
          {concept.masteryBasis === 'user-correction' ? t('vaultBasisCorrected') : t('vaultBasisEvidence')}
        </span>
      </li>
      <li className={concept.due_now ? css.countDue : css.count}>
        {concept.due === null
          ? t('vaultNoDue')
          : concept.due_now ? t('vaultDueToday') : t('vaultDueOn', { date: concept.due })}
      </li>
      <li className={css.count}>{t('vaultInterval', { days: String(concept.intervalDays) })}</li>
      <li className={css.count}>
        {concept.lastReviewedAt === null
          ? t('vaultNeverReviewed')
          : t('vaultLastReviewed', { date: day(concept.lastReviewedAt) })}
      </li>
    </ul>
  )
}

/** Citations, with the stale ones separated rather than quietly mixed in. */
function Anchors({ concept, t }: { concept: Concept; t: Translate }) {
  if (concept.anchors.length === 0 && concept.staleAnchors.length === 0) return null
  return (
    <div className={css.anchorRow}>
      {concept.anchors.length > 0 && (
        <ul className={css.chips}>
          <li className={css.chipLabel}>{t('vaultAnchors')}</li>
          {concept.anchors.map(anchor => <li key={anchor} className={css.chipAnchor}>{anchor}</li>)}
        </ul>
      )}
      {concept.staleAnchors.length > 0 && (
        <>
          <ul className={css.chips}>
            <li className={css.chipLabel}>{t('vaultStaleAnchors')}</li>
            {concept.staleAnchors.map(anchor => <li key={anchor} className={css.chipStale}>{anchor}</li>)}
          </ul>
          <p className={css.staleNote}>{t('vaultStaleWarning')}</p>
        </>
      )}
    </div>
  )
}

/**
 * One card, expandable into its editor.
 *
 * The system fields sit ABOVE the textarea and outside it, so the split between
 * "your words" and "the system's record" is visible before anyone starts typing
 * rather than explained after they try.
 */
function ConceptCard({
  concept, ask, onChanged, t,
}: {
  concept: Concept
  ask: Ask
  onChanged: (next: Concept) => void
  t: Translate
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(concept.body)
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<string | undefined>(undefined)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const [deferDays, setDeferDays] = useState('7')

  useEffect(() => { setDraft(concept.body) }, [concept.body])

  const apply = useCallback(async (
    endpoint: string,
    payload: Record<string, unknown>,
    after?: (next: Concept) => void,
  ) => {
    setBusy(true)
    setNotice('')
    setFailure('')
    try {
      const answer = await ask<{ status: string; concept?: Concept }>(endpoint, {
        conceptSlug: concept.conceptSlug,
        ...payload,
      })
      if (answer?.status !== 'ok' || answer.concept === undefined) {
        setFailure(t('vaultFailed'))
        return
      }
      onChanged(answer.concept)
      after?.(answer.concept)
    } catch {
      setFailure(t('vaultFailed'))
    } finally {
      setBusy(false)
    }
  }, [ask, concept.conceptSlug, onChanged, t])

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <h3 className={css.cardTitle}>{concept.label}</h3>
        <span className={css.metaRight}>
          <code className={css.path}>{concept.path}</code>
        </span>
      </header>

      <Schedule concept={concept} t={t} />

      {concept.explanation !== '' && !editing && (
        <blockquote className={css.explanation}>{concept.explanation}</blockquote>
      )}

      <Anchors concept={concept} t={t} />

      {editing
        ? (
          <>
            <p className={css.systemNote}>{t('vaultSystemFieldsNote')}</p>
            <textarea
              className={css.editor}
              value={draft}
              rows={Math.min(24, Math.max(8, draft.split('\n').length + 2))}
              aria-label={t('vaultEdit')}
              onChange={(event) => { setDraft(event.target.value) }}
            />
            <div className={css.actions}>
              <button
                type="button"
                className={css.buttonPrimary}
                disabled={busy}
                onClick={() => {
                  void apply('concepts/save', { body: draft }, () => { setEditing(false) })
                }}
              >
                {busy ? t('vaultSaving') : t('vaultSave')}
              </button>
              <button
                type="button"
                className={css.button}
                onClick={() => { setDraft(concept.body); setEditing(false) }}
              >
                {t('vaultCancel')}
              </button>
            </div>
          </>
        )
        : (
          <div className={css.actions}>
            <button type="button" className={css.button} onClick={() => { setEditing(true) }}>
              {t('vaultEdit')}
            </button>
            <button
              type="button"
              className={css.button}
              onClick={() => {
                if (file !== undefined) { setFile(undefined); return }
                void (async () => {
                  const answer = await ask<{ status: string; text?: string }>('concepts/file', {
                    conceptSlug: concept.conceptSlug,
                  })
                  if (answer?.status === 'ok') {
                    setFile(answer.text ?? '')
                    setFailure('')
                  } else {
                    setFailure(t('vaultFailed'))
                  }
                })().catch(() => {
                  setFailure(t('vaultFailed'))
                })
              }}
            >
              {file === undefined ? t('vaultOpenFile') : t('vaultCloseFile')}
            </button>
            <span className={css.deferGroup}>
              <input
                type="number"
                min={1}
                max={365}
                className={css.deferInput}
                value={deferDays}
                aria-label={t('vaultDeferDays')}
                onChange={(event) => { setDeferDays(event.target.value) }}
              />
              <button
                type="button"
                className={css.button}
                disabled={busy}
                onClick={() => {
                  const days = Number(deferDays)
                  if (!Number.isFinite(days) || days < 1) {
                    setFailure(t('vaultFailed'))
                    return
                  }
                  void apply('concepts/defer', { days }, (next) => {
                    setNotice(t('vaultReviewNextDue', { date: next.due ?? '' }))
                  })
                }}
              >
                {t('vaultDefer')}
              </button>
            </span>
            <button
              type="button"
              className={css.buttonCorrect}
              disabled={busy || concept.mastery === 'unseen'}
              title={t('vaultCorrectHint')}
              onClick={() => {
                void apply('concepts/correct', {}, (next) => {
                  setNotice(t('vaultCorrectDone', { mastery: t(MASTERY_LABEL[next.mastery]) }))
                })
              }}
            >
              {t('vaultCorrect')}
            </button>
          </div>
        )}

      {!editing && <p className={css.hint}>{t('vaultDeferHint')}</p>}
      {notice !== '' && <p className={css.notice}>{notice}</p>}
      {failure !== '' && <p className={css.staleNote} role="alert">{failure}</p>}
      {file !== undefined && <pre className={css.readingBody}>{file}</pre>}
    </section>
  )
}

/** The concept list. */
export function ConceptsSection({
  list, ask, onChanged, t,
}: {
  list: ConceptList | undefined
  ask: Ask
  onChanged: (next: Concept) => void
  t: Translate
}) {
  if (list === undefined) return <div className={css.state}>{t('vaultLoading')}</div>
  if (list.concepts.length === 0) {
    return (
      <div className={css.state}>
        <p className={css.stateTitle}>{t('vaultConceptsEmptyTitle')}</p>
        <p className={css.stateBody}>{t('vaultConceptsEmptyBody')}</p>
      </div>
    )
  }
  return (
    <div className={css.sources}>
      {list.concepts.map(concept => (
        <ConceptCard
          key={concept.conceptSlug}
          concept={concept}
          ask={ask}
          onChanged={onChanged}
          t={t}
        />
      ))}
    </div>
  )
}

/**
 * The review deck.
 *
 * The queue is a local working order, seeded from the due list when the section
 * opens rather than recomputed per render: a card rated `mastered` stops being
 * due immediately, and a live filter would make it vanish from under the
 * person's cursor mid-session.
 *
 * A card the learner could not recall goes to the BACK of that order instead of
 * being dropped. `revealed` deliberately writes no schedule on the Host, so the
 * card is still due — a deck that moved past it would be telling the learner
 * "today is finished" about a card they just failed to recall.
 */
export function ReviewSection({
  list, ask, onChanged, t,
}: {
  list: ConceptList | undefined
  ask: Ask
  onChanged: (next: Concept) => void
  t: Translate
}) {
  const queue = useMemo(() => list?.concepts ?? [], [list])
  const [order, setOrder] = useState<readonly Concept[]>(queue)
  const [settled, setSettled] = useState(0)
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [failure, setFailure] = useState('')
  /** Cards completed in this mounted review session must not be re-added when
   * the parent folds the latest card back into its queue prop. */
  const settledSlugs = useRef<Set<string>>(new Set())

  useEffect(() => {
    setOrder(current => {
      const incoming = new Map(queue.map(item => [item.conceptSlug, item]))
      const next = current
        .filter(item => !settledSlugs.current.has(item.conceptSlug))
        .map(item => incoming.get(item.conceptSlug) ?? item)
      const present = new Set(next.map(item => item.conceptSlug))
      for (const item of queue) {
        if (!settledSlugs.current.has(item.conceptSlug) && !present.has(item.conceptSlug)) {
          next.push(item)
          present.add(item.conceptSlug)
        }
      }
      return next
    })
  }, [queue])

  if (list === undefined) return <div className={css.state}>{t('vaultLoading')}</div>

  const concept = order[0]
  if (concept === undefined) {
    return (
      <div className={css.state}>
        <p className={css.stateTitle}>
          {queue.length === 0 ? t('vaultReviewEmptyTitle') : t('vaultReviewDone')}
        </p>
        <p className={css.stateBody}>{t('vaultReviewEmptyBody')}</p>
      </div>
    )
  }

  const rate = (rating: string): void => {
    setBusy(true)
    setOutcome('')
    setFailure('')
    const slug = concept.conceptSlug
    void (async () => {
      try {
        const answer = await ask<{ status: string; concept?: Concept }>('concepts/rate', {
          conceptSlug: slug,
          rating,
        })
        const rated = answer?.status === 'ok' ? answer.concept : undefined
        if (rated === undefined) {
          setFailure(t('vaultFailed'))
          return
        }
        if (rating !== 'revealed') settledSlugs.current.add(slug)
        onChanged(rated)
        setOutcome(rating === 'revealed'
          ? t('vaultRateRevealedHint')
          : t('vaultReviewNextDue', { date: rated.due ?? '' }))
        setShown(false)
        setOrder(current => {
          const rest = current.filter(item => item.conceptSlug !== slug)
          // Back of the line, not out of it: the card is still due.
          return rating === 'revealed' ? [...rest, rated] : rest
        })
        if (rating !== 'revealed') setSettled(value => value + 1)
      } catch {
        setFailure(t('vaultFailed'))
      } finally {
        setBusy(false)
      }
    })()
  }

  return (
    <div className={css.deck}>
      <p className={css.deckProgress}>
        {t('vaultReviewProgress', { current: String(settled + 1), total: String(queue.length) })}
      </p>
      <section className={css.deckCard}>
        <ul className={css.counts}>
          <li className={MASTERY_CLASS[concept.mastery]}>{t(MASTERY_LABEL[concept.mastery])}</li>
          {concept.anchors.slice(0, 2).map(anchor => (
            <li key={anchor} className={css.chipAnchor}>{anchor}</li>
          ))}
        </ul>
        <h3 className={css.deckLabel}>{concept.label}</h3>
        <p className={css.deckPrompt}>{t('vaultReviewPrompt')}</p>

        {shown
          ? (
            <>
              <blockquote className={css.explanation}>{concept.explanation}</blockquote>
              {concept.misconceptions.length > 0 && (
                <ul className={css.chips}>
                  {concept.misconceptions.map(item => (
                    <li key={item} className={css.chipWarn}>{item}</li>
                  ))}
                </ul>
              )}
              <div className={css.actions}>
                {RATINGS.map(entry => (
                  <button
                    key={entry.rating}
                    type="button"
                    className={entry.rating === 'mastered' ? css.buttonPrimary : css.button}
                    disabled={busy}
                    onClick={() => { rate(entry.rating) }}
                  >
                    {t(entry.label)}
                  </button>
                ))}
              </div>
            </>
          )
          : (
            <div className={css.actions}>
              <button type="button" className={css.button} onClick={() => { setShown(true) }}>
                {t('vaultReviewShow')}
              </button>
            </div>
          )}
      </section>
      {outcome !== '' && <p className={css.notice}>{outcome}</p>}
      {failure !== '' && <p className={css.staleNote} role="alert">{failure}</p>}
      <p className={css.local}>{t('vaultLocalOnly')}</p>
    </div>
  )
}
