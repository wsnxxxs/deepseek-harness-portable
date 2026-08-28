import { useEffect } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { LEARNING_PRESET_ID } from './vault-gate.ts'
import { learningScope } from './tokens.ts'
import css from './LearningSurface.module.css'

type LearningSurfaceProps = PropsRuntime<'conversation.input.dock'> & PropsLocale<'interactive-learning'>

const QUICK_STARTS = [
  { key: 'learningStartConcept', prompt: 'learningStartConceptPrompt' },
  { key: 'learningStartQuestion', prompt: 'learningStartQuestionPrompt' },
  { key: 'learningStartMaterial', prompt: 'learningStartMaterialPrompt' },
] as const

/** The learner-facing quick-start row and the presentation boundary for a learning session. */
export function LearningSurface({
  session,
  input,
  inputActions,
  sessionId,
  useSessions,
  t,
}: LearningSurfaceProps) {
  const isLearningSession = useSessions(state => {
    const row = state.byId[sessionId]
    return row?.projectionValues?.agentPreset === LEARNING_PRESET_ID
      || (row as { agentPreset?: unknown } | undefined)?.agentPreset === LEARNING_PRESET_ID
  })

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
    </section>
  )
}
