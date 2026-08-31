/**
 * The resource library home.
 *
 * A resource library is the place where a person finds and reuses material;
 * learning is one way to work with that material, not the identity of the
 * library itself. The page therefore owns the cross-space overview and the
 * hand-off into a learning session, while the Interactive Learning pack keeps
 * owning the material, notes, concept cards and review surfaces.
 * @module @dsh-portable/dcode-ui/client/library/ResourceLibraryHome
 */

import { Component, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import {
  IconBrowseOutline16, IconChevronLeftOutline14, IconGoalOutline16,
  IconListPenOutline16, IconQuestionOutline14, IconSkillOutline16,
  IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { VaultLibrary } from '@dsh-portable/interactive-learning/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useSessionList, useWorkspaces } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import type { Translate } from '../locales.ts'
import { Button, EmptyState } from '../shell/ui.tsx'
import css from './ResourceLibraryHome.module.css'

/** The agent preset the Interactive Learning pack installs. */
const LEARNING_PRESET = 'learning'

/** The three meaningful surfaces inside a resource library. */
type LibrarySection = 'overview' | 'materials' | 'learning'

/** Props of the resource library surface. */
export interface ResourceLibraryHomeProps {
  readonly navigation: NavigationStore
  readonly cwd: string | undefined
  readonly sessionId: SessionId | undefined
  /** Open the host workspace chooser when the library has no usable target. */
  readonly onOpenWorkspace?: () => void
}

/** A vault as projected by the existing roster endpoint. */
export interface ResourceSpace {
  readonly cwd: string
  readonly title: string
  readonly root: string
  readonly sources: number
  readonly concepts: number
  readonly notes: number
  readonly due: number
  readonly blocked: number
}

interface ResourceRoster { vaults: readonly ResourceSpace[] }
interface RosterState {
  readonly phase: 'loading' | 'ready' | 'error'
  readonly spaces: readonly ResourceSpace[]
  readonly error?: string
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

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function rosterFrom(answer: unknown): ResourceRoster {
  const outer = record(answer)
  if (outer?.ok !== true) {
    const error = record(outer?.error)
    throw new Error(typeof error?.message === 'string' ? error.message : 'resource roster unavailable')
  }
  const value = record(outer.value)
  if (value === undefined || !Array.isArray(value.vaults)) {
    throw new Error('resource roster returned an invalid response')
  }
  const vaults = value.vaults.filter((item): item is ResourceSpace => {
    const space = record(item)
    return typeof space?.cwd === 'string'
      && typeof space.title === 'string'
      && typeof space.root === 'string'
      && typeof space.sources === 'number'
      && typeof space.concepts === 'number'
      && typeof space.notes === 'number'
      && typeof space.due === 'number'
      && typeof space.blocked === 'number'
  })
  return { vaults }
}

/** Candidate folders are supplied by the client so the Host never enumerates unrelated directories. */
export function resourceCandidates(
  cwd: string | undefined,
  workspacePaths: readonly string[],
  sessionCwds: readonly (string | undefined)[],
): readonly string[] {
  const result: string[] = []
  const seen = new Set<string>()
  const add = (path: string | undefined) => {
    if (path === undefined || path.trim() === '' || seen.has(path)) return
    seen.add(path)
    result.push(path)
  }
  add(cwd)
  for (const path of workspacePaths) add(path)
  for (const path of sessionCwds) add(path)
  return result.slice(0, 24)
}

/** Resolve the total numbers shown on the overview from the spaces already loaded. */
export function resourceTotals(spaces: readonly ResourceSpace[]) {
  return spaces.reduce((totals, space) => ({
    sources: totals.sources + space.sources,
    notes: totals.notes + space.notes,
    concepts: totals.concepts + space.concepts,
    due: totals.due + space.due,
  }), { sources: 0, notes: 0, concepts: 0, due: 0 })
}

function pathLeaf(path: string): string {
  const normalized = path.replace(/[\\/]+$/, '')
  return normalized.slice(Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/')) + 1) || path
}

function LibraryBoundary({ children, t }: { children: ReactNode; t: Translate }) {
  return (
    <Boundary t={t}>
      <Suspense fallback={<div className={css.loading} role="status">{t('library.loading')}</div>}>
        {children}
      </Suspense>
    </Boundary>
  )
}

class Boundary extends Component<{ children: ReactNode; t: Translate }, { error?: string }> {
  state: { error?: string } = {}

  static getDerivedStateFromError(error: unknown): { error: string } {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // The page owns the recovery copy; the pack owns its own diagnostics.
  }

  render(): ReactNode {
    return this.state.error === undefined
      ? this.props.children
      : <div className={css.libraryFailure} role="alert">{this.props.t('library.error')}</div>
  }
}

function StatCard({ label, value, hint, due = false }: {
  label: string
  value: number
  hint: string
  due?: boolean
}) {
  return (
    <div className={`${css.statCard} ${due ? css.statCardDue : ''}`}>
      <span className={css.statLabel}>{label}</span>
      <strong className={css.statValue}>{String(value)}</strong>
      <span className={css.statHint}>{hint}</span>
    </div>
  )
}

function SpaceCard({
  space, onOpen, t,
}: {
  space: ResourceSpace
  onOpen: () => void
  t: Translate
}) {
  return (
    <button type="button" className={css.spaceCard} onClick={onOpen}>
      <span className={css.spaceIcon} aria-hidden><IconBrowseOutline16 /></span>
      <span className={css.spaceCopy}>
        <strong className={css.spaceName}>{space.title}</strong>
        <span className={css.spacePath}>{space.root || pathLeaf(space.cwd)}</span>
        <span className={css.spaceMeta}>
          {t('library.spaceStats', {
            sources: String(space.sources),
            notes: String(space.notes),
            concepts: String(space.concepts),
          })}
        </span>
      </span>
      <span className={css.spaceArrow} aria-hidden>→</span>
    </button>
  )
}

/** The shared home for material management and learning entry points. */
export function ResourceLibraryHome({ navigation, cwd, sessionId, onOpenWorkspace }: ResourceLibraryHomeProps) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const workspaces = useWorkspaces()
  const [section, setSection] = useState<LibrarySection>('overview')
  const [selectedCwd, setSelectedCwd] = useState<string | undefined>(cwd)
  const [reloads, setReloads] = useState(0)
  const [starting, setStarting] = useState(false)
  const [failure, setFailure] = useState('')
  const [roster, setRoster] = useState<RosterState>({ phase: 'loading', spaces: [] })

  const candidates = useMemo(() => resourceCandidates(
    cwd,
    workspaces.items.map(item => item.path),
    list.ids.map(id => list.byId[id]?.cwd),
  ), [cwd, list.byId, list.ids, workspaces.items])
  const candidateKey = candidates.join('|')

  useEffect(() => {
    if (candidates.length === 0) {
      setRoster({ phase: 'ready', spaces: [] })
      return
    }
    let cancelled = false
    setRoster(previous => ({ ...previous, phase: 'loading', error: undefined }))
    void runtime.learningCall('vault/roster', { cwds: candidates })
      .then(answer => {
        if (cancelled) return
        setRoster({ phase: 'ready', spaces: rosterFrom(answer).vaults })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setRoster({
          phase: 'error',
          spaces: [],
          error: cause instanceof Error ? cause.message : String(cause),
        })
      })
    return () => { cancelled = true }
  }, [candidateKey, candidates, reloads, runtime.learningCall])

  const spaces = roster.spaces
  const selectedSpace = spaces.find(space => space.cwd === selectedCwd) ?? spaces.find(space => space.cwd === cwd) ?? spaces[0]
  const totals = useMemo(() => resourceTotals(spaces), [spaces])

  useEffect(() => {
    setSelectedCwd(current => spaces.some(space => space.cwd === current)
      ? current
      : spaces.find(space => space.cwd === cwd)?.cwd
        ?? spaces[0]?.cwd
        ?? workspaces.items.find(item => item.path === current)?.path
        ?? workspaces.items[0]?.path
        ?? cwd)
  }, [cwd, spaces, workspaces.items])

  const learningSessions = useMemo(
    () => list.ids
      .map(id => list.byId[id])
      .filter((summary): summary is NonNullable<typeof summary> =>
        summary !== undefined
        && (summary.projectionValues as { agentPreset?: unknown } | undefined)?.agentPreset === LEARNING_PRESET),
    [list.byId, list.ids],
  )

  /** Open an existing task in a space, or create a task under that workspace. */
  const openSpaceSession = useCallback((space: ResourceSpace | undefined): boolean => {
    const targetCwd = space?.cwd ?? selectedCwd ?? cwd ?? workspaces.items[0]?.path
    const current = sessionId === undefined ? undefined : list.byId[sessionId]
    if (current?.cwd === targetCwd) {
      runtime.sessions.open(current.id)
      navigation.show('session')
      return true
    }
    const existing = list.ids
      .map(id => list.byId[id])
      .find(summary => summary?.cwd === targetCwd)
    if (existing !== undefined) {
      runtime.sessions.open(existing.id)
      navigation.show('session')
      return true
    }
    const workspace = workspaces.items.find(item => item.path === targetCwd)
    if (workspace !== undefined && runtime.navigation !== undefined) {
      navigation.show('session')
      runtime.navigation.startSession(workspace.workspaceId)
      return true
    }
    if (sessionId !== undefined) {
      runtime.sessions.open(sessionId)
      navigation.show('session')
      return true
    }
    return false
  }, [cwd, list.byId, list.ids, navigation, runtime, selectedCwd, sessionId, workspaces.items])

  /** Add material through an ordinary conversation, keeping learning optional. */
  const openMaterialIntake = useCallback(() => {
    if (openSpaceSession(selectedSpace)) return
    onOpenWorkspace?.()
  }, [onOpenWorkspace, openSpaceSession, selectedSpace])

  const startLearning = useCallback((mode: LearningMode) => {
    const nav = runtime.navigation
    if (nav === undefined) return
    setStarting(true)
    setFailure('')
    void (async () => {
      try {
        const targetCwd = selectedSpace?.cwd ?? selectedCwd ?? cwd
        const workspace = workspaces.items.find(item => item.path === targetCwd)
        const existing = list.ids
          .map(id => list.byId[id])
          .find(summary => summary?.cwd === targetCwd)
        const target = workspace !== undefined
          ? await nav.connectWorkspace(workspace.workspaceId)
          : existing?.id ?? (targetCwd === cwd ? sessionId : undefined)
        if (target === undefined) {
          setFailure(t('library.needsWorkspace'))
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
          const handle = face.beginSubmission({ text: opening, images: [] })
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
  }, [cwd, list.byId, list.ids, navigation, runtime, selectedCwd, selectedSpace, sessionId, t, workspaces.items])

  const sectionEntries: readonly { id: LibrarySection; label: string }[] = [
    { id: 'overview', label: t('library.overview') },
    { id: 'materials', label: t('library.materials') },
    { id: 'learning', label: t('library.learning') },
  ]

  const pageHeading = section === 'overview'
    ? t('library.overview')
    : section === 'materials' ? t('library.materials') : t('library.learning')

  return (
    <div className={css.surface}>
      <nav className={css.rail} aria-label={t('library.title')}>
        <button type="button" className={css.back} onClick={() => { navigation.show('session') }}>
          <IconChevronLeftOutline14 />
          {t('nav.backToWorkspace')}
        </button>
        <div className={css.railBrand}>
          <span className={css.railMark} aria-hidden><IconBrowseOutline16 /></span>
          <span>
            <strong>{t('library.title')}</strong>
            <small>{t('library.railSubtitle')}</small>
          </span>
        </div>

        <div className={css.railGroup}>
          <span className={css.railLabel}>{t('library.title')}</span>
          {sectionEntries.map(entry => (
            <button
              key={entry.id}
              type="button"
              className={`${css.railItem} ${section === entry.id ? css.railItemActive : ''}`}
              aria-current={section === entry.id ? 'page' : undefined}
              onClick={() => { setSection(entry.id) }}
            >
              {entry.id === 'overview' && <IconBrowseOutline16 />}
              {entry.id === 'materials' && <IconListPenOutline16 />}
              {entry.id === 'learning' && <IconSparkle16 />}
              <span>{entry.label}</span>
              {entry.id === 'learning' && totals.due > 0 && <b className={css.railBadge}>{totals.due}</b>}
            </button>
          ))}
        </div>

        {spaces.length > 0 && (
          <div className={css.railGroup}>
            <span className={css.railLabel}>{t('library.spaces')}</span>
            <div className={css.spaceRailList}>
              {spaces.map(space => (
                <button
                  key={space.cwd}
                  type="button"
                  className={`${css.spaceRailItem} ${selectedSpace?.cwd === space.cwd ? css.spaceRailItemActive : ''}`}
                  aria-current={selectedSpace?.cwd === space.cwd ? 'true' : undefined}
                  onClick={() => { setSelectedCwd(space.cwd); setSection('materials') }}
                  title={space.root || space.cwd}
                >
                  <span className={css.spaceRailDot} aria-hidden />
                  <span>{space.title}</span>
                  {space.due > 0 && <b className={css.railBadge}>{space.due}</b>}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <main className={css.body}>
        <div className={css.inner}>
          <header className={css.pageHead}>
            <div>
              <span className={css.eyebrow}>{t('library.eyebrow')}</span>
              <h1 className={css.title}>{pageHeading}</h1>
              <p className={css.subtitle}>{t('library.subtitle')}</p>
            </div>
            {(spaces.length > 0 || workspaces.items.length > 0) && (
              <label className={css.selector}>
                <span>{t('library.selectedSpace')}</span>
                <select
                  value={selectedCwd ?? ''}
                  aria-label={t('library.chooseSpace')}
                  onChange={event => { setSelectedCwd(event.target.value) }}
                >
                  {spaces.length > 0
                    ? spaces.map(space => <option key={space.cwd} value={space.cwd}>{space.title}</option>)
                    : workspaces.items.map(item => <option key={item.path} value={item.path}>{item.title}</option>)}
                </select>
              </label>
            )}
          </header>

          {section === 'overview' && (
            <div className={css.overview}>
              {roster.phase === 'error'
                ? (
                  <div className={css.stateCard} role="alert">
                    <strong>{t('library.loadFailed')}</strong>
                    <span>{t('library.loadFailedBody')}</span>
                    <Button onClick={() => { setReloads(value => value + 1) }}>{t('library.retry')}</Button>
                  </div>
                )
                : spaces.length === 0 && roster.phase !== 'loading'
                  ? (
                    <div className={css.emptyCard}>
                      <span className={css.emptyIcon} aria-hidden><IconBrowseOutline16 /></span>
                      <h2>{t('library.emptyTitle')}</h2>
                      <p>{t('library.emptyBody')}</p>
                      <Button primary onClick={openMaterialIntake} disabled={runtime.navigation === undefined && onOpenWorkspace === undefined}>
                        {t('library.addMaterial')}
                      </Button>
                    </div>
                  )
                  : (
                    <>
                      <div className={css.stats} aria-label={t('library.statsLabel')}>
                        <StatCard label={t('library.sources')} value={totals.sources} hint={t('library.sourcesHint')} />
                        <StatCard label={t('library.notes')} value={totals.notes} hint={t('library.notesHint')} />
                        <StatCard label={t('library.concepts')} value={totals.concepts} hint={t('library.conceptsHint')} />
                        <StatCard label={t('library.due')} value={totals.due} hint={t('library.dueHint')} due={totals.due > 0} />
                      </div>
                      <section className={css.sectionBlock}>
                        <div className={css.sectionHeading}>
                          <div>
                            <h2>{t('library.spaces')}</h2>
                            <p>{t('library.spacesBody')}</p>
                          </div>
                          <span className={css.sectionCount}>{spaces.length}</span>
                        </div>
                        <div className={css.spaceGrid}>
                          {spaces.map(space => (
                            <SpaceCard
                              key={space.cwd}
                              space={space}
                              t={t}
                              onOpen={() => { setSelectedCwd(space.cwd); setSection('materials') }}
                            />
                          ))}
                        </div>
                      </section>
                      <section className={css.learningCallout}>
                        <span className={css.calloutIcon} aria-hidden><IconSparkle16 /></span>
                        <div className={css.calloutCopy}>
                          <strong>{t('library.learningCalloutTitle')}</strong>
                          <p>{t('library.learningCalloutBody')}</p>
                        </div>
                        <Button onClick={() => { setSection('learning') }}>{t('library.openLearning')}</Button>
                      </section>
                    </>
                  )}
              {roster.phase === 'loading' && <p className={css.loading}>{t('library.loading')}</p>}
            </div>
          )}

          {section === 'materials' && (
            <div className={css.materials}>
              {selectedSpace === undefined
                ? (
                  <div className={css.emptyCard}>
                    <span className={css.emptyIcon} aria-hidden><IconBrowseOutline16 /></span>
                    <h2>{t('library.noSpaceTitle')}</h2>
                    <p>{t('library.noSpaceBody')}</p>
                    <Button primary onClick={openMaterialIntake} disabled={runtime.navigation === undefined && onOpenWorkspace === undefined}>
                      {t('library.addMaterial')}
                    </Button>
                  </div>
                )
                : (
                  <>
                    <div className={css.materialToolbar}>
                      <div>
                        <h2>{selectedSpace.title}</h2>
                        <p>{t('library.materialToolbarBody', { path: selectedSpace.root || selectedSpace.cwd })}</p>
                      </div>
                      <Button primary onClick={openMaterialIntake} disabled={runtime.navigation === undefined && onOpenWorkspace === undefined}>
                        {t('library.addMaterial')}
                      </Button>
                    </div>
                    <div className={css.libraryShell}>
                      <LibraryBoundary t={t}>
                        <VaultLibrary
                          cwd={selectedSpace.cwd}
                          call={runtime.learningCall}
                          t={runtime.learningT}
                          embedded
                          onClose={() => { openSpaceSession(selectedSpace) }}
                        />
                      </LibraryBoundary>
                    </div>
                  </>
                )}
            </div>
          )}

          {section === 'learning' && (
            <div className={css.learning}>
              <section className={css.learningIntro}>
                <div className={css.learningIntroIcon} aria-hidden><IconSparkle16 /></div>
                <div>
                  <span className={css.eyebrow}>{t('library.learningEyebrow')}</span>
                  <p>{t('library.learningBody')}</p>
                  {selectedSpace !== undefined && <small>{t('library.learningContext', { name: selectedSpace.title })}</small>}
                </div>
              </section>
              <div className={css.modeGrid}>
                {MODES.map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    className={css.mode}
                    disabled={starting || runtime.navigation === undefined}
                    onClick={() => { startLearning(mode) }}
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
              {failure !== '' && <p className={css.failure} role="alert">{failure}</p>}
              {cwd === undefined && <p className={css.note}>{t('library.needsWorkspace')}</p>}

              <section className={css.sectionBlock}>
                <div className={css.sectionHeading}>
                  <div>
                    <h2>{t('library.current')}</h2>
                    <p>{t('library.currentBody')}</p>
                  </div>
                  <span className={css.sectionCount}>{learningSessions.length}</span>
                </div>
                {learningSessions.length === 0
                  ? <EmptyState>{t('library.currentNone')}</EmptyState>
                  : (
                    <div className={css.sessionList}>
                      {learningSessions.map(summary => (
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
                          <span className={css.sessionCopy}>
                            <strong className={css.sessionTitle}>{summary.displayTitle}</strong>
                            <small className={css.sessionMeta}>{summary.cwd ?? t('library.noPath')}</small>
                          </span>
                          <span className={css.sessionArrow} aria-hidden>→</span>
                        </button>
                      ))}
                    </div>
                  )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
