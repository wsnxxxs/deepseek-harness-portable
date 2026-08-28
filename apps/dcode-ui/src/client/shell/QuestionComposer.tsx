/** Codex-style composer takeover for ask-user-question and plan review waits. */

import { useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import {
  IconCheckOutline14, IconChevronLeftOutline14, IconChevronRightOutline14,
  IconChecklistOutline14, IconCloseOutline16, IconEditOutline16,
  IconQuestionOutline14, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  DcodePendingInteraction, DcodeQuestionAnswer, DcodeQuestionItem,
} from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import { Button, Spinner } from './ui.tsx'
import css from './QuestionComposer.module.css'

interface DraftAnswer {
  readonly selected: readonly string[]
  readonly custom: string
  readonly skipped: boolean
}

interface PlanReview {
  readonly id: string
  readonly question: string
  readonly plan: string
  readonly approve: { readonly label: string; readonly description?: string }
  readonly decline?: { readonly label: string; readonly description?: string }
}

/** Keep the wire label intact while making the recommendation badge readable. */
function parseRecommendedLabel(label: string): { label: string; recommended: boolean } {
  const suffix = /\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i
  return suffix.test(label)
    ? { label: label.replace(suffix, ''), recommended: true }
    : { label, recommended: false }
}

/** The plan-review presentation is valid only when two buttons can answer it. */
function planReviewOf(questions: readonly DcodeQuestionItem[]): PlanReview | undefined {
  if (questions.length !== 1) return undefined
  const question = questions[0]
  if (question === undefined || question.intent?.kind !== 'plan-review' || question.detail === undefined) {
    return undefined
  }
  if (question.multiSelect === true) return undefined
  const options = question.options ?? []
  if (options.length > 2) return undefined
  const approve = options.find(option => option.label === question.intent?.approve)
  if (approve === undefined) return undefined
  const decline = options.find(option => option.label !== approve.label)
  return {
    id: question.id,
    question: question.question,
    plan: question.detail,
    approve,
    ...(decline === undefined ? {} : { decline }),
  }
}

function answerable(draft: DraftAnswer): boolean {
  return draft.selected.length > 0 || draft.custom.trim() !== ''
}

function completed(draft: DraftAnswer): boolean {
  return answerable(draft) || draft.skipped
}

function isComposing(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
  return event.nativeEvent.isComposing
}

function answerPayload(
  questions: readonly DcodeQuestionItem[],
  drafts: readonly DraftAnswer[],
): DcodeQuestionAnswer {
  return {
    answers: questions.map((question, index) => {
      const draft = drafts[index] ?? { selected: [], custom: '', skipped: true }
      if (draft.skipped) return { id: question.id, selected: [] }
      const custom = draft.custom.trim()
      return {
        id: question.id,
        selected: custom === '' || question.multiSelect === true ? [...draft.selected] : [],
        ...(custom === '' ? {} : { custom }),
      }
    }),
  }
}

/** The generic multi-step question card. */
function QuestionFlow({ pending }: { pending: DcodePendingInteraction }) {
  const t = useT()
  const questions = pending.questions
  const labels = useMemo<MarkdownLabels>(() => ({
    code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
    footnotes: t('details.title'),
  }), [t])
  const [index, setIndex] = useState(0)
  const [drafts, setDrafts] = useState<DraftAnswer[]>(() => questions.map(() => ({
    selected: [], custom: '', skipped: false,
  })))
  const [busy, setBusy] = useState<'answer' | 'cancel' | null>(null)
  const [error, setError] = useState<string | undefined>()
  const question = questions[index]

  const updateDraft = (update: (draft: DraftAnswer) => DraftAnswer): void => {
    setDrafts(current => current.map((draft, draftIndex) => draftIndex === index ? update(draft) : draft))
    setError(undefined)
  }

  const submit = (values: readonly DraftAnswer[]): void => {
    const missing = values.findIndex(draft => !completed(draft))
    if (missing >= 0) {
      setIndex(missing)
      setError(t('question.errorIncomplete'))
      return
    }
    setBusy('answer')
    setError(undefined)
    void pending.answer(answerPayload(questions, values)).catch((cause: unknown) => {
      setBusy(null)
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }

  const cancel = (): void => {
    setBusy('cancel')
    setError(undefined)
    void pending.cancel().catch((cause: unknown) => {
      setBusy(null)
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }

  if (question === undefined) return null
  const draft = drafts[index] ?? { selected: [], custom: '', skipped: false }
  const hasOptions = (question.options?.length ?? 0) > 0

  const choose = (label: string): void => {
    updateDraft(current => question.multiSelect === true
      ? {
        ...current,
        selected: current.selected.includes(label)
          ? current.selected.filter(item => item !== label)
          : [...current.selected, label],
        skipped: false,
      }
      : { selected: [label], custom: '', skipped: false })
    if (question.multiSelect !== true && index < questions.length - 1) setIndex(index + 1)
  }

  const continueFlow = (): void => {
    if (!answerable(draft)) {
      setError(t('question.errorUnanswered'))
      return
    }
    if (index < questions.length - 1) {
      setIndex(index + 1)
      setError(undefined)
      return
    }
    submit(drafts)
  }

  const skip = (): void => {
    const nextDrafts = drafts.map((value, draftIndex) => draftIndex === index
      ? { selected: [], custom: '', skipped: true }
      : value)
    setDrafts(nextDrafts)
    setError(undefined)
    if (index < questions.length - 1) {
      setIndex(index + 1)
      return
    }
    submit(nextDrafts)
  }

  const changeCustom = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    const value = event.target.value
    updateDraft(current => ({
      ...current,
      selected: question.multiSelect === true ? current.selected : [],
      custom: value,
      skipped: false,
    }))
  }

  const continueFromCustom = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey || isComposing(event)) return
    event.preventDefault()
    continueFlow()
  }

  return (
    <div className={css.frame} data-question-key={pending.key}>
      <section className={css.card} aria-labelledby={`question-${pending.key}-${String(index)}`}>
        <header className={css.header}>
          <span className={css.kicker}>
            <IconQuestionOutline14 />
            {question.header ?? t('question.title')}
          </span>
          <div className={css.headerActions}>
            <span className={css.counter}>{index + 1} / {questions.length}</span>
            <button
              type="button"
              className={css.iconButton}
              aria-label={t('question.cancel')}
              title={t('question.cancel')}
              disabled={busy !== null}
              onClick={cancel}
            >
              <IconCloseOutline16 />
            </button>
          </div>
        </header>

        <div className={css.body}>
          <h2 className={css.title} id={`question-${pending.key}-${String(index)}`}>
            {question.question}
          </h2>
          {question.detail === undefined ? null : (
            <div className={css.detail}>
              <MarkdownText text={question.detail} labels={labels} />
            </div>
          )}
          <div className={css.options} role={question.multiSelect === true ? 'group' : 'radiogroup'}>
            {(question.options ?? []).map((option, optionIndex) => {
              const selected = draft.selected.includes(option.label)
              const display = parseRecommendedLabel(option.label)
              return (
                <button
                  type="button"
                  key={`${option.label}-${String(optionIndex)}`}
                  className={`${css.option} ${selected ? css.optionSelected : ''}`}
                  role={question.multiSelect === true ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  disabled={busy !== null}
                  onClick={() => { choose(option.label) }}
                >
                  <span className={question.multiSelect === true
                    ? `${css.checkbox} ${selected ? css.checkboxSelected : ''}`
                    : `${css.radio} ${selected ? css.radioSelected : ''}`} aria-hidden>
                    {selected && <IconCheckOutline14 size={12} />}
                  </span>
                  <span className={css.optionCopy}>
                    <span className={css.optionLabel}>{display.label}</span>
                    {display.recommended ? <span className={css.badge}>{t('question.recommended')}</span> : null}
                    {option.description === undefined ? null : (
                      <span className={css.description}>{option.description}</span>
                    )}
                  </span>
                </button>
              )
            })}
            {hasOptions ? (
              <label className={`${css.customRow} ${draft.custom !== '' ? css.customRowActive : ''}`}>
                <span className={question.multiSelect === true
                  ? `${css.checkbox} ${draft.custom !== '' ? css.checkboxSelected : ''}`
                  : css.customIcon} aria-hidden>
                  {question.multiSelect === true
                    ? draft.custom !== '' && <IconCheckOutline14 size={12} />
                    : <IconEditOutline16 size={14} />}
                </span>
                <textarea
                  className={css.customInput}
                  rows={1}
                  value={draft.custom}
                  disabled={busy !== null}
                  placeholder={t('question.custom')}
                  onChange={changeCustom}
                  onKeyDown={continueFromCustom}
                />
              </label>
            ) : (
              <textarea
                autoFocus
                className={css.freeInput}
                rows={2}
                value={draft.custom}
                disabled={busy !== null}
                placeholder={t('question.custom')}
                onChange={changeCustom}
                onKeyDown={continueFromCustom}
              />
            )}
          </div>
        </div>

        <footer className={css.footer}>
          <div className={css.pager}>
            <button
              type="button"
              className={css.iconButton}
              aria-label={t('question.previous')}
              disabled={index === 0 || busy !== null}
              onClick={() => { setIndex(value => value - 1); setError(undefined) }}
            >
              <IconChevronLeftOutline14 />
            </button>
            <button
              type="button"
              className={css.iconButton}
              aria-label={t('question.next')}
              disabled={index === questions.length - 1 || busy !== null}
              onClick={() => { setIndex(value => value + 1); setError(undefined) }}
            >
              <IconChevronRightOutline14 />
            </button>
          </div>
          <div className={css.feedback} role="status">{error}</div>
          <div className={css.footerActions}>
            <Button disabled={busy !== null} onClick={skip}>{t('question.skip')}</Button>
            <Button primary disabled={busy !== null || !answerable(draft)} onClick={continueFlow}>
              {busy === 'answer' ? <><Spinner />{t('question.submitting')}</> : index === questions.length - 1 ? t('question.submit') : t('question.continue')}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}

/** The plan-review approval card supplied by the same pending question wire. */
function PlanReviewCard({ pending, review }: { pending: DcodePendingInteraction; review: PlanReview }) {
  const t = useT()
  const labels = useMemo<MarkdownLabels>(() => ({
    code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
    footnotes: t('details.title'),
  }), [t])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const settle = (send: () => Promise<void>): void => {
    setBusy(true)
    setError(undefined)
    void send().catch((cause: unknown) => {
      setBusy(false)
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }

  return (
    <div className={css.frame} data-plan-review-key={pending.key}>
      <section className={`${css.card} ${css.reviewCard}`} aria-label={review.question}>
        <header className={css.reviewHeader}>
          <span className={css.kicker}><IconChecklistOutline14 />{t('question.planReview')}</span>
        </header>
        <div className={css.reviewBody}>
          <h2 className={css.title}>{review.question}</h2>
          <div className={css.plan}>
            <MarkdownText text={review.plan} labels={labels} />
          </div>
        </div>
        <footer className={css.reviewFooter}>
          <div className={css.feedback} role="status">{error}</div>
          <div className={css.footerActions}>
            <Button disabled={busy} onClick={() => { settle(() => pending.cancel()) }}>
              {t('question.discuss')}
            </Button>
            {review.decline === undefined ? null : (
              <Button
                disabled={busy}
                title={review.decline.description}
                onClick={() => { settle(() => pending.answer({ answers: [{ id: review.id, selected: [review.decline!.label] }] })) }}
              >
                {t('question.decline')}
              </Button>
            )}
            <Button
              primary
              disabled={busy}
              title={review.approve.description}
              onClick={() => { settle(() => pending.answer({ answers: [{ id: review.id, selected: [review.approve.label] }] })) }}
            >
              {busy ? <><Spinner />{t('question.submitting')}</> : t('question.approve')}
            </Button>
          </div>
        </footer>
      </section>
    </div>
  )
}

/** Route the pending request to the plan-review or generic question surface. */
export function QuestionComposer({ pending }: { pending: DcodePendingInteraction }) {
  const review = useMemo(() => planReviewOf(pending.questions), [pending])
  return review === undefined
    ? <QuestionFlow key={pending.key} pending={pending} />
    : <PlanReviewCard key={pending.key} pending={pending} review={review} />
}
