import { useEffect } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { IconCheckOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { projectLearningNotes, routeProgress } from './LearningNotes.tsx'
import { LEARNING_PRESET_ID } from './vault-gate.ts'
import type { LearningLocaleKey } from './locales.ts'
import { learningScope } from './tokens.ts'
import css from './LearningSurface.module.css'

type LearningSurfaceProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'interactive-learning'>

const QUICK_STARTS = [
  { key: 'learningStartConcept', prompt: 'learningStartConceptPrompt' },
  { key: 'learningStartQuestion', prompt: 'learningStartQuestionPrompt' },
  { key: 'learningStartMaterial', prompt: 'learningStartMaterialPrompt' },
  { key: 'learningStartCheck', prompt: 'learningStartCheckPrompt' },
] as const

/** Learner-facing labels for the active tool, never the raw tool payload. */
const PROGRESS_LABELS = {
  learning_state_update: 'learningProgressState',
  learning_material_map: 'learningProgressMaterialMap',
  learning_material_read: 'learningProgressMaterialRead',
  learning_material_search: 'learningProgressMaterialSearch',
  learning_material_recall: 'learningProgressMaterialRecall',
  learning_concept_recall: 'learningProgressConceptRecall',
  learning_concept_propose: 'learningProgressConceptPropose',
  learning_visual_select: 'learningProgressVisualSelect',
  learning_checkpoint_select: 'learningProgressCheckpointSelect',
  learning_visual: 'learningProgressVisual',
  learning_checkpoint: 'learningProgressCheckpoint',
  learning_activity: 'learningProgressActivity',
  learning_question: 'learningProgressQuestion',
  learning_reveal: 'learningProgressReveal',
} as const satisfies Record<string, LearningLocaleKey>

function progressStatus(
  session: LearningSurfaceProps['session'],
  t: LearningSurfaceProps['t'],
): string {
  if (!session.running) return t('learningProgressDone')
  const activeCall = session.runningCalls[session.runningCalls.length - 1]
  if (activeCall === undefined) return t('learningProgressOrient')
  const progressKey = (PROGRESS_LABELS as Record<string, LearningLocaleKey>)[activeCall.name]
  return t(progressKey ?? 'learningProgressWorking')
}

function LearningProgress({ session, t }: Pick<LearningSurfaceProps, 'session' | 't'>) {
  const notes = projectLearningNotes(session)
  if (!session.running && !notes.visible) return null

  const evidence = notes.evidence.slice(-3)
  const route = notes.visible
    ? routeProgress(notes, t)
    : t('learningProgressRoutePending')

  return (
    <section className={css.progress} {...learningScope} data-learning-progress>
      <details className={css.progressDetails}>
        <summary className={css.progressSummary}>
          <span
            className={css.progressMark}
            data-state={session.running ? 'running' : 'done'}
            aria-hidden
          />
          <span className={css.progressTitle}>{t('learningProgressTitle')}</span>
          <span className={css.progressStatus} data-state={session.running ? 'running' : 'done'}>
            {progressStatus(session, t)}
          </span>
        </summary>
        <div className={css.progressBody}>
          <p className={css.progressIntro}>{t('learningProgressBody')}</p>
          <dl className={css.progressFacts}>
            <div className={css.progressFact}>
              <dt>{t('learningProgressGoal')}</dt>
              <dd>{notes.goal ?? t('learningProgressGoalPending')}</dd>
            </div>
            <div className={css.progressFact}>
              <dt>{t('learningProgressRoute')}</dt>
              <dd>{route}</dd>
            </div>
            <div className={css.progressFact}>
              <dt>{t('learningProgressEvidence')}</dt>
              <dd>
                {evidence.length === 0
                  ? t('learningProgressEvidencePending')
                  : <ul className={css.progressEvidence}>{evidence.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}
              </dd>
            </div>
          </dl>
          <p className={css.progressHint}>{t('learningProgressTrajectory')}</p>
        </div>
      </details>
    </section>
  )
}

/** The learner-facing entry card and the presentation boundary for a learning session. */
export function LearningSurface({
  session,
  input,
  inputActions,
  sessionId,
  useSessions,
  t,
}: LearningSurfaceProps) {
  const isLearningSession = useSessions(state => state.byId[sessionId]?.agentPreset === LEARNING_PRESET_ID)

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    if (isLearningSession) root.dataset.learningSurface = 'true'
    else delete root.dataset.learningSurface
    return () => {
      if (root.dataset.learningSurface === 'true') delete root.dataset.learningSurface
    }
  }, [isLearningSession])

  if (!isLearningSession) return null
  if (!session.blank) return <LearningProgress session={session} t={t} />

  const disabled = session.removed || session.running || input.phase !== 'plain'
  return (
    <section className={css.root} {...learningScope} data-learning-onboarding>
      <div className={css.header}>
        <p className={css.eyebrow}>{t('learningStartEyebrow')}</p>
        <h1>{t('learningStartTitle')}</h1>
        <p className={css.subtitle}>{t('learningStartSubtitle')}</p>
      </div>

      <ul className={css.promises}>
        <li><span className={css.promiseIcon} aria-hidden><IconCheckOutline16 size={14} /></span>{t('learningStartPromise1')}</li>
        <li><span className={css.promiseIcon} aria-hidden><IconCheckOutline16 size={14} /></span>{t('learningStartPromise2')}</li>
        <li><span className={css.promiseIcon} aria-hidden><IconCheckOutline16 size={14} /></span>{t('learningStartPromise3')}</li>
      </ul>

      <div className={css.quickStart}>
        <p className={css.quickLabel}>{t('learningStartQuickLabel')}</p>
        <div className={css.choices}>
          {QUICK_STARTS.map(({ key, prompt }) => (
            <button
              key={key}
              type="button"
              disabled={disabled}
              data-learning-start-choice={key}
              onClick={() => inputActions.setDraft(t(prompt))}
            >{t(key)}</button>
          ))}
        </div>
      </div>

      <p className={css.example}>{t('learningStartExample')}</p>
    </section>
  )
}
