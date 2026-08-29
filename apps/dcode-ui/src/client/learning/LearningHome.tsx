/**
 * Learning mode as a first-class surface.
 *
 * Everything here drives the Interactive Learning pack this distribution
 * already ships: starting a session selects its `learning` agent preset and
 * sends the pack's own opening prompt, and the library, concept cards, notes
 * and visuals are the pack's own `VaultLibrary` reading the same
 * `/interactive-learning` channel the classic UI's views read. No learning
 * state or backend is duplicated here — this module is navigation and framing
 * around capabilities that already exist.
 * @module @dsh-portable/dcode-ui/client/learning/LearningHome
 */

import { Component, Suspense, useCallback, useMemo, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  IconChevronLeftOutline14, IconGoalOutline16, IconQuestionOutline14,
  IconSkillOutline16, IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { VaultLibrary } from '@dsh-portable/interactive-learning/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useSessionList } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import type { Translate } from '../locales.ts'
import { EmptyState } from '../shell/ui.tsx'
import css from './LearningHome.module.css'

/** The agent preset the Interactive Learning pack installs. */
const LEARNING_PRESET = 'learning'

/** Sections of the learning surface. */
type LearningSection = 'start' | 'current' | 'library' | 'notes' | 'concepts' | 'visuals'

/** Props of the learning surface. */
export interface LearningHomeProps {
  readonly navigation: NavigationStore
  readonly cwd: string | undefined
  readonly sessionId: SessionId | undefined
}

/** One way into a learning session, with the prompt that opens it. */
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

class LearningBoundary extends Component<{ children: ReactNode; t: Translate }, { error?: string }> {
  state: { error?: string } = {}

  static getDerivedStateFromError(error: unknown): { error: string } {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // The visible fallback is the recovery surface; no duplicate logging is
    // needed here because the pack owns its own diagnostics.
  }

  render(): ReactNode {
    return this.state.error === undefined
      ? this.props.children
      : (
        <div role="alert">
          <EmptyState>{this.props.t('learning.error', { error: this.state.error })}</EmptyState>
        </div>
      )
  }
}

/** Learning entry points, the current learning session, and the vault. */
export function LearningHome({ navigation, cwd, sessionId }: LearningHomeProps) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const [section, setSection] = useState<LearningSection>('start')
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState<string | undefined>(undefined)

  // Learning sessions are the ones whose durable agent preset is the pack's,
  // exactly the fact the classic UI's tab gate reads.
  const learningSessions = useMemo(
    () => list.ids
      .map(id => list.byId[id])
      .filter((summary): summary is NonNullable<typeof summary> =>
        summary !== undefined
        && (summary.projectionValues as { agentPreset?: unknown } | undefined)?.agentPreset === LEARNING_PRESET),
    [list],
  )

  const start = useCallback((mode: LearningMode) => {
    const nav = runtime.navigation
    if (nav === undefined) return
    setStarting(true)
    setFailure(undefined)
    void (async () => {
      try {
        // Reuse-or-create a blank session in the current workspace, then put it
        // on the learning preset. Both steps are the Host's own verbs.
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
        // The pack routes on the learner's own words; these open the mode it
        // should teach in rather than pre-empting the topic.
        const opening = mode.id === 'concept'
          ? t('learning.concept')
          : mode.id === 'problem' ? t('learning.problem') : t('learning.material')
        const face = runtime.binding(target)?.session
        if (face !== undefined) {
          const handle = face.beginSubmission({ text: opening, images: [] })
          await face.prompt([{ type: 'text', text: opening }], 'queue', undefined, handle.requestId)
        }
      } catch (cause) {
        setFailure(cause instanceof Error ? cause.message : String(cause))
      } finally {
        setStarting(false)
      }
    })()
  }, [runtime, navigation, cwd, sessionId, t])

  const sections: readonly { id: LearningSection; label: string; group?: string }[] = [
    { id: 'start', label: t('learning.title') },
    { id: 'current', label: t('learning.current') },
    { id: 'library', label: t('learning.library'), group: t('settings.group.data') },
    { id: 'concepts', label: t('learning.cards') },
    { id: 'notes', label: t('learning.notes') },
    { id: 'visuals', label: t('learning.visuals') },
  ]

  return (
    <div className={css.surface}>
      <nav className={css.rail} aria-label={t('learning.title')}>
        <button type="button" className={css.back} onClick={() => { navigation.show('session') }}>
          <IconChevronLeftOutline14 />
          {t('nav.backToWorkspace')}
        </button>
        {sections.map(entry => (
          <div key={entry.id}>
            {entry.group === undefined ? null : <div className={css.railGroup}>{entry.group}</div>}
            <button
              type="button"
              className={`${css.railItem} ${section === entry.id ? css.railItemActive : ''}`}
              onClick={() => { setSection(entry.id) }}
              aria-current={section === entry.id ? 'page' : undefined}
            >
              {entry.label}
            </button>
          </div>
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
            : null}

          {section === 'current'
            ? (
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
            )
            : null}

          {section === 'library' || section === 'concepts' || section === 'notes' || section === 'visuals'
            ? (
              <>
                <div className={css.title}>
                  {section === 'library'
                    ? t('learning.library')
                    : section === 'concepts' ? t('learning.cards') : section === 'notes' ? t('learning.notes') : t('learning.visuals')}
                </div>
                {cwd === undefined
                  ? <EmptyState>{t('learning.needsWorkspace')}</EmptyState>
                  : (
                    <div className={css.library}>
                      {/* The pack's own library surface, driven by the same
                          `/interactive-learning` endpoints the classic UI uses. */}
                      <LearningBoundary t={t}>
                        <Suspense fallback={<div role="status"><EmptyState>{t('learning.loading')}</EmptyState></div>}>
                          <VaultLibrary cwd={cwd} call={runtime.learningCall} t={runtime.learningT} embedded />
                        </Suspense>
                      </LearningBoundary>
                    </div>
                  )}
              </>
            )
            : null}
        </div>
      </div>
    </div>
  )
}
