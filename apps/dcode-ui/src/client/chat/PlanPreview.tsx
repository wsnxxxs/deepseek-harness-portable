/** The readable plan proposal surface used by the conversation and review flow. */

import { useCallback, useId, useState } from 'react'
import type { ReactNode } from 'react'
import {
  FishLogo, IconChevronDownOutline14, IconEditOutline16, IconLightOutline16,
  IconPlayOutline16, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionFace } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useProjectionValue, useSessionSnapshot } from '../state/hooks.ts'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import { Button, Spinner } from '../shell/ui.tsx'
import css from './PlanPreview.module.css'

const OPEN_TAG = '<proposed_plan>'
const CLOSE_TAG = '</proposed_plan>'

export interface ProposedPlanParts {
  readonly before: string
  readonly plan: string
  readonly after: string
  readonly partial: boolean
}

/** Find a tag without treating the assistant's case choice as visible text. */
function tagIndex(source: string, tag: string, from = 0): number {
  return source.toLocaleLowerCase().indexOf(tag, from)
}

/** Extract the structured plan envelope used by planning agents. */
export function extractProposedPlan(text: string, allowPartial = false): ProposedPlanParts | undefined {
  const source = String(text || '')
  const open = tagIndex(source, OPEN_TAG)
  if (open < 0 || tagIndex(source, OPEN_TAG, open + OPEN_TAG.length) >= 0) return undefined
  const contentStart = open + OPEN_TAG.length
  const close = tagIndex(source, CLOSE_TAG, contentStart)
  const trailingClose = close < 0 ? -1 : tagIndex(source, CLOSE_TAG, close + CLOSE_TAG.length)
  if (trailingClose >= 0 || (close < 0 && !allowPartial)) return undefined
  if (close < 0) {
    return {
      before: source.slice(0, open).trim(),
      plan: source.slice(contentStart).trim(),
      after: '',
      partial: true,
    }
  }
  return {
    before: source.slice(0, open).trim(),
    plan: source.slice(contentStart, close).trim(),
    after: source.slice(close + CLOSE_TAG.length).trim(),
    partial: false,
  }
}

/** Pull the first H1 out as the proposal headline, matching the source UI. */
export function splitPlanTitle(markdown: string, fallback: string): { title: string; body: string } {
  const lines = String(markdown || '').split(/\r?\n/)
  const headingIndex = lines.findIndex(line => /^#\s+\S/.test(line.trim()))
  if (headingIndex < 0) return { title: fallback, body: markdown.trim() }
  const title = lines[headingIndex]!.trim().replace(/^#\s+/, '').trim()
  lines.splice(headingIndex, 1)
  return { title, body: lines.join('\n').trim() }
}

interface PlanProjectionView {
  readonly active?: boolean
  readonly pending?: boolean
}

interface PlanPreviewCardProps {
  readonly sessionId?: SessionId
  readonly markdown: string
  readonly labels: MarkdownLabels
  readonly partial?: boolean
  /** Review cards already have an authoritative pending interaction. */
  readonly current?: boolean
  readonly actionsEnabled?: boolean
  readonly footer?: ReactNode
  readonly showStatus?: boolean
  readonly ariaLabel?: string
}

async function promptSession(session: SessionFace, text: string): Promise<void> {
  const handle = session.beginSubmission({ text, images: [] })
  try {
    const result = await session.prompt([{ type: 'text', text }], 'queue', undefined, handle.requestId)
    if (!result.ok) {
      handle.abandon()
      throw new Error(result.error.message)
    }
  } catch (cause: unknown) {
    handle.abandon()
    throw cause
  }
}

/** A compact, glass version of the plan proposal shown in the conversation. */
export function PlanPreviewCard(props: PlanPreviewCardProps) {
  const t = useT()
  const runtime = useRuntime()
  const session = useSessionSnapshot(props.sessionId)
  const projectedPlan = useProjectionValue<PlanProjectionView | null>(props.sessionId, 'plan')
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [refinement, setRefinement] = useState('')
  const [actionBusy, setActionBusy] = useState<'execute' | 'refine' | undefined>()
  const [error, setError] = useState<string | undefined>()
  const contentId = useId()
  const refinementId = useId()
  const partial = props.partial === true
  const projectedCurrent = projectedPlan?.active === true || projectedPlan?.pending === true
  const planTransitioning = projectedPlan?.pending === true
  const current = props.current ?? projectedCurrent
  const { title, body } = splitPlanTitle(props.markdown, t('plan.title'))
  const canAct = props.sessionId !== undefined
    && current
    && !partial
    && !planTransitioning
    && props.actionsEnabled !== false
    && session?.running !== true
    && props.footer === undefined

  const runAction = useCallback(async (kind: 'execute' | 'refine', request?: string): Promise<void> => {
    const sessionId = props.sessionId
    if (!canAct || sessionId === undefined || actionBusy !== undefined) return
    const face = runtime.binding(sessionId)?.session
    if (face === undefined) {
      setError(t('plan.actionUnavailable'))
      return
    }
    setActionBusy(kind)
    setError(undefined)
    try {
      if (kind === 'execute') {
        const command = await face.command('/plan off')
        if (!command.ok) throw new Error(command.error.message)
        if (!command.value.matched) throw new Error(t('plan.actionUnavailable'))
        await promptSession(face, t('plan.executePrompt'))
      } else {
        const value = request?.trim() ?? ''
        if (value === '') return
        await promptSession(face, t('plan.refinePrompt', { request: value }))
        setRefinement('')
        setEditing(false)
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setActionBusy(undefined)
    }
  }, [actionBusy, canAct, props.sessionId, runtime, t])

  const submitRefinement = (): void => {
    void runAction('refine', refinement)
  }

  const reviewFooter = props.footer
  return (
    <div className={css.wrapper} data-plan-preview="" data-plan-current={current ? 'true' : 'false'} data-plan-partial={partial ? 'true' : 'false'}>
      <section className={css.card} aria-label={props.ariaLabel ?? t('plan.title')}>
        <header className={css.header}>
          <span className={css.kickerIcon} aria-hidden><IconLightOutline16 /></span>
          <span className={css.kicker}>{partial ? t('plan.drafting') : current ? t('plan.current') : t('plan.title')}</span>
          <button
            type="button"
            className={css.expandButton}
            aria-label={expanded ? t('plan.collapse') : t('plan.expand')}
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => { setExpanded(value => !value) }}
          >
            <IconChevronDownOutline14 className={expanded ? css.expandIconOpen : undefined} />
          </button>
        </header>

        <div className={css.previewRegion}>
          <div id={contentId} className={`${css.body} ${expanded ? css.bodyExpanded : ''}`}>
            <h2 className={css.title}>{title}</h2>
            {body === '' && partial
              ? (
                <div className={css.preparing} role="status">
                  <span className={css.preparingDot} aria-hidden />
                  {t('plan.preparing')}
                </div>
              )
              : body === ''
                ? null
                : <div className={css.markdown}><MarkdownText text={body} labels={props.labels} streaming={partial} /></div>}
          </div>
          {!expanded && body !== '' ? <div className={css.fade} aria-hidden /> : null}
        </div>

        {reviewFooter !== undefined
          ? <footer className={css.footer}>{reviewFooter}</footer>
          : current && !partial
            ? (
              <footer className={css.footer}>
                {editing
                  ? (
                    <div className={css.editor}>
                      <label className={css.visuallyHidden} htmlFor={refinementId}>{t('plan.modifyPlaceholder')}</label>
                      <textarea
                        id={refinementId}
                        className={css.editorInput}
                        value={refinement}
                        rows={2}
                        autoFocus
                        placeholder={t('plan.modifyPlaceholder')}
                        disabled={!canAct || actionBusy !== undefined}
                        onChange={event => { setRefinement(event.target.value); setError(undefined) }}
                        onKeyDown={event => {
                          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                            event.preventDefault()
                            submitRefinement()
                          }
                        }}
                      />
                      <div className={css.editorActions}>
                        <Button disabled={actionBusy !== undefined} onClick={() => { setEditing(false); setRefinement(''); setError(undefined) }}>
                          {t('common.cancel')}
                        </Button>
                        <Button primary disabled={!canAct || actionBusy !== undefined || refinement.trim() === ''} onClick={submitRefinement}>
                          {actionBusy === 'refine' ? <><Spinner size="sm" />{t('plan.submitting')}</> : t('plan.sendModification')}
                        </Button>
                      </div>
                    </div>
                  )
                  : (
                    <div className={css.actions}>
                      <Button
                        className={css.modifyButton}
                        disabled={!canAct || actionBusy !== undefined}
                        title={t('plan.modifyDescription')}
                        onClick={() => { setEditing(true); setError(undefined) }}
                      >
                        <IconEditOutline16 />
                        {t('plan.modify')}
                      </Button>
                      <Button
                        className={css.executeButton}
                        primary
                        disabled={!canAct || actionBusy !== undefined}
                        title={t('plan.executeDescription')}
                        onClick={() => { void runAction('execute') }}
                      >
                        {actionBusy === 'execute' ? <Spinner size="sm" /> : <IconPlayOutline16 />}
                        {t('plan.execute')}
                      </Button>
                    </div>
                  )}
                {error === undefined ? null : <div className={css.error} role="alert">{error}</div>}
              </footer>
            )
            : null}
      </section>

      {props.showStatus === true
        ? (
          <div className={css.status} role="status" aria-live="polite">
            <span className={css.statusMark} aria-hidden><FishLogo size={24} /></span>
            <span>{partial ? t('plan.statusDrafting') : t('plan.statusReady')}</span>
          </div>
        )
        : null}
    </div>
  )
}
