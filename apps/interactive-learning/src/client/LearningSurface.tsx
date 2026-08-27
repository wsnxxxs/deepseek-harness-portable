import { useEffect } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { IconCheckOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { LEARNING_PRESET_ID } from './vault-gate.ts'
import { learningScope } from './tokens.ts'
import css from './LearningSurface.module.css'

type LearningSurfaceProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'interactive-learning'>

const QUICK_STARTS = [
  { key: 'learningStartConcept', prompt: 'learningStartConceptPrompt' },
  { key: 'learningStartQuestion', prompt: 'learningStartQuestionPrompt' },
  { key: 'learningStartMaterial', prompt: 'learningStartMaterialPrompt' },
  { key: 'learningStartCheck', prompt: 'learningStartCheckPrompt' },
] as const

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

  if (!isLearningSession || !session.blank) return null

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
