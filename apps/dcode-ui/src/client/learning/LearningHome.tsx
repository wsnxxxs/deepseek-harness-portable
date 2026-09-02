/**
 * Learning mode as a focused workbench surface.
 *
 * This page owns the learning entry points and the list of existing learning
 * sessions. Materials are attached from the conversation when the learner
 * chooses the material flow; there is no separate library surface.
 * @module @dsh-portable/dcode-ui/client/learning/LearningHome
 */

import { useCallback, useMemo, useState } from 'react'
import {
  IconChevronLeftOutline14, IconGoalOutline16, IconQuestionOutline14,
  IconSkillOutline16, IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useSessionList } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { EmptyState } from '../shell/ui.tsx'
import css from './LearningHome.module.css'

/** The agent preset installed by the Interactive Learning pack. */
const LEARNING_PRESET = 'learning'

type LearningSection = 'start' | 'current'

/** Props of the learning surface. */
export interface LearningHomeProps {
  readonly navigation: NavigationStore
  readonly cwd: string | undefined
  readonly sessionId: SessionId | undefined
}

interface LearningMode {
  readonly id: 'concept' | 'problem' | 'material'
  readonly titleKey: 'learning.concept' | 'learning.problem' | 'learning.material'
  readonly bodyKey: 'learning.conceptBody' | 'learning.problemBody' | 'learning.materialBody'
}

const MODES: readonly LearningMode[] = [
  { id: 'concept', titleKey: 'learning.concept', bodyKey: 'learning.conceptBody' },
  { id: 'problem', titleKey: 'learning.problem', bodyKey: 'learning.problemBody' },
  { id: 'material', titleKey: 'learning.material', bodyKey: 'learning.materialBody' },
]

/** Learning entry points and the current learning-session list. */
export function LearningHome({ navigation, cwd, sessionId }: LearningHomeProps) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const [section, setSection] = useState<LearningSection>('start')
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<string | undefined>()

  const learningSessions = useMemo(
    () => list.ids
      .map(id => list.byId[id])
      .filter((summary): summary is NonNullable<typeof summary> => (
        summary !== undefined
        && (summary.projectionValues as { agentPreset?: unknown } | undefined)?.agentPreset === LEARNING_PRESET
      )),
    [list],
  )

  const start = useCallback((mode: LearningMode) => {
    const nav = runtime.navigation
    if (nav === undefined || starting) return
    setStarting(true)
    setFailure(undefined)
    void (async () => {
      try {
        const workspace = runtime.workspaces.list.getSnapshot().items
          .find(item => item.path === cwd)
        const target = workspace === undefined
          ? sessionId
          : await nav.connectWorkspace(workspace.workspaceId)
        if (target === undefined) {
          setFailure(t('learning.needsWorkspace'))
          return
        }
        const selected = await runtime.remote.agentPresets.select(target, LEARNING_PRESET)
        if (!selected.ok) {
          setFailure(selected.error.message)
          return
        }
        runtime.sessions.open(target)
        navigation.show('session')
        const opening = mode.id === 'concept'
          ? t('learning.concept')
          : mode.id === 'problem' ? t('learning.problem') : t('learning.material')
        const face = runtime.binding(target)?.session
        if (face !== undefined) {
          const handle = face.beginSubmission({ mode: 'queue', text: opening, images: [] })
          const sent = await face.prompt([{ type: 'text', text: opening }], 'queue', undefined, handle.requestId)
          if (!sent.ok) {
            handle.abandon()
            setFailure(sent.error.message)
          }
        }
      } catch (cause) {
        setFailure(cause instanceof Error ? cause.message : String(cause))
      } finally {
        setStarting(false)
      }
    })()
  }, [cwd, navigation, runtime, sessionId, starting, t])

  return (
    <div className={css.surface}>
      <nav className={css.rail} aria-label={t('learning.title')}>
        <button type="button" className={css.back} onClick={() => { navigation.show('session') }}>
          <IconChevronLeftOutline14 />
          {t('nav.backToWorkspace')}
        </button>
        {([
          ['start', t('learning.title')],
          ['current', t('learning.current')],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${css.railItem} ${section === id ? css.railItemActive : ''}`}
            onClick={() => { setSection(id) }}
            aria-current={section === id ? 'page' : undefined}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className={css.body}>
        <div className={css.inner}>
          {section === 'start'
            ? (
              <>
                <div>
                  <div className={css.title}>{t('learning.title')}</div>
                  <p className={css.subtitle}>{t('learning.subtitle')}</p>
                </div>
                <div className={css.grid}>
                  {MODES.map(mode => (
                    <button
                      key={mode.id}
                      type="button"
                      className={css.mode}
                      disabled={starting || runtime.navigation === undefined}
                      onClick={() => { start(mode) }}
                    >
                      <span className={css.modeTitle}>
                        {mode.id === 'concept'
                          ? <IconSparkle16 />
                          : mode.id === 'problem' ? <IconQuestionOutline14 size={16} /> : <IconSkillOutline16 />}
                        {t(mode.titleKey)}
                      </span>
                      <span className={css.modeBody}>{t(mode.bodyKey)}</span>
                    </button>
                  ))}
                </div>
                {failure === undefined ? null : <p className={css.note} role="alert">{failure}</p>}
                {cwd === undefined ? <p className={css.note}>{t('learning.needsWorkspace')}</p> : null}
              </>
            )
            : (
              <>
                <div className={css.title}>{t('learning.current')}</div>
                {learningSessions.length === 0
                  ? <EmptyState>{t('learning.currentNone')}</EmptyState>
                  : learningSessions.map(summary => (
                    <button
                      key={summary.id}
                      type="button"
                      className={css.sessionRow}
                      onClick={() => {
                        runtime.sessions.open(summary.id)
                        navigation.show('session')
                      }}
                    >
                      <IconGoalOutline16 />
                      <span className={css.sessionTitle}>{summary.displayTitle}</span>
                      <span className={css.note}>{summary.cwd}</span>
                    </button>
                  ))}
              </>
            )}
        </div>
      </div>
    </div>
  )
}
