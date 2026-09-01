/**
 * The workbench frame.
 *
 * Registered into DSH's built-in `root` slot, so while the modern surface is
 * active it owns the whole page and the official three-column frame stands
 * aside. Everything below reads Host state through {@link useRuntime}; the
 * only state this component owns is which panel is showing.
 * @module @dsh-portable/dcode-ui/client/shell/Workbench
 */

import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type {
  CSSProperties, ErrorInfo, KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent, ReactNode,
} from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { dcodeScope } from '../tokens.ts'
import {
  compactOverlayOf, useNavigation, type CompactOverlay, type NavigationStore,
  type TaskContext,
} from '../state/navigation.ts'
import {
  useConversationBlank, useCurrentSessionId, usePendingApproval, usePendingQuestion, useProjectionValue,
  useWorkspaceGroups,
} from '../state/hooks.ts'
import { useRuntime } from '../state/runtime.ts'
import { useLayoutSize } from '../state/layout.ts'
import {
  clampRailWidth, RAIL_WIDTH, readRailWidth, writeRailWidth,
} from '../state/rail-width.ts'
import {
  clampAsideWidth, ASIDE_WIDTH, readAsideWidth, writeAsideWidth,
} from '../state/aside-width.ts'
import { useT } from '../state/i18n.ts'
import type { Translate } from '../locales.ts'
import { ACRYLIC_ATTRIBUTE } from '../theme.ts'
import { useAppearance } from './ThemeSwitch.tsx'
import { TopBar } from './TopBar.tsx'
import { LeftRail } from './LeftRail.tsx'
import { Aside } from './Aside.tsx'
import { SubagentConversationDialog, type SubagentChildEntry } from './AgentInspector.tsx'
import { SummaryCard } from './SummaryCard.tsx'
import { Composer } from './Composer.tsx'
import type { ModelSelectHandle } from './ModelSelect.tsx'
import { PlanCard } from './PlanCard.tsx'
import { QuestionComposer } from './QuestionComposer.tsx'
import { ApprovalCard } from './ApprovalCard.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { DirectoryPicker } from './DirectoryPicker.tsx'
import { Button, EmptyState } from './ui.tsx'
import { Transcript } from '../chat/Transcript.tsx'
import { ResourceLibraryHome } from '../library/ResourceLibraryHome.tsx'
import { PluginsHome } from '../plugins/PluginsHome.tsx'
import { SettingsSurface } from '../settings/SettingsSurface.tsx'
import { useModelReadiness, type ModelReadiness } from '../settings/readiness.ts'
import { useGitStatus } from '../git/useGit.ts'
import css from './Workbench.module.css'

/** Props of the workbench root. */
export interface WorkbenchProps {
  /** The view-state store shared with the keyboard layer and the palette. */
  readonly navigation: NavigationStore
}

const COMPACT_OVERLAY_HISTORY_KEY = '__dcodeCompactOverlay'

function historyOverlay(value: unknown): CompactOverlay | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const overlay = (value as Record<string, unknown>)[COMPACT_OVERLAY_HISTORY_KEY]
  return overlay === 'rail' || overlay === 'aside' || overlay === 'summary' ? overlay : undefined
}

function historyStateWithOverlay(overlay: CompactOverlay): Record<string, unknown> {
  const current = typeof history.state === 'object' && history.state !== null
    ? history.state as Record<string, unknown>
    : {}
  return { ...current, [COMPACT_OVERLAY_HISTORY_KEY]: overlay }
}

interface GoalProjectionView {
  readonly goal: { readonly phase: string }
}

interface FullSubagentConversation {
  readonly parentSessionId: SessionId
  readonly entry: SubagentChildEntry
}

/** Keep a settings initialization failure local to the replaceable surface. */
class SettingsBoundary extends Component<{
  readonly children: ReactNode
  readonly onBack: () => void
  readonly resetKey: string
  readonly t: Translate
}, { error?: string }> {
  state: { error?: string } = {}

  static getDerivedStateFromError(error: unknown): { error: string } {
    return { error: error instanceof Error ? error.message : String(error) }
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo): void {
    // The fallback below owns recovery; individual settings services retain
    // responsibility for their own diagnostics.
  }

  componentDidUpdate(previous: Readonly<{ resetKey: string }>): void {
    if (previous.resetKey !== this.props.resetKey && this.state.error !== undefined) {
      this.setState({ error: undefined })
    }
  }

  render(): ReactNode {
    if (this.state.error === undefined) return this.props.children
    return (
      <div className={css.surfaceFailure} role="alert">
        <EmptyState>
          <span>{this.props.t('settings.loadFailed', { error: this.state.error })}</span>
          <div className={css.surfaceFailureActions}>
            <Button onClick={this.props.onBack}>{this.props.t('nav.backToWorkspace')}</Button>
            <Button primary onClick={() => { this.setState({ error: undefined }) }}>
              {this.props.t('common.retry')}
            </Button>
          </div>
        </EmptyState>
      </div>
    )
  }
}

function ReadinessCard(props: {
  readonly hasWorkspace: boolean
  readonly hasSession: boolean
  readonly model: ModelReadiness
  readonly onOpenWorkspace: () => void
  readonly onNewTask: () => void
  readonly onSelectModel: () => void
  readonly onConfigureProvider: () => void
  readonly t: Translate
}) {
  const complete = [
    props.hasWorkspace,
    props.hasSession,
    props.model.model === 'ready',
    props.model.credential === 'ready',
  ].filter(Boolean).length
  const missing = [
    !props.hasWorkspace
      ? { label: props.t('readiness.workspace'), action: props.t('readiness.openWorkspace'), onClick: props.onOpenWorkspace }
      : undefined,
    props.hasWorkspace && !props.hasSession
      ? { label: props.t('readiness.session'), action: props.t('readiness.newTask'), onClick: props.onNewTask }
      : undefined,
    props.hasSession && props.model.model === 'missing'
      ? { label: props.t('readiness.model'), action: props.t('readiness.selectModel'), onClick: props.onSelectModel }
      : undefined,
    props.model.model === 'ready' && props.model.credential === 'missing'
      ? { label: props.t('readiness.credential', { provider: props.model.provider ?? '' }), action: props.t('readiness.configureKey'), onClick: props.onConfigureProvider }
      : undefined,
  ].filter((item): item is { label: string; action: string; onClick: () => void } => item !== undefined)
  if (missing.length === 0) return null
  return (
    <div className={css.readiness} aria-label={props.t('readiness.title')}>
      <div className={css.readinessSummary}>
        <span className={css.readinessCheck} aria-hidden>✓</span>
        <span>{props.t('readiness.complete', { count: complete, total: 4 })}</span>
      </div>
      {missing.map(item => (
        <div className={css.readinessItem} key={item.label}>
          <span>{item.label}</span>
          <Button onClick={item.onClick}>{item.action}</Button>
        </div>
      ))}
    </div>
  )
}

/**
 * Resolve the working directory of the current session, which every
 * workspace-scoped panel (git, files) is addressed by.
 * @param sessionId - current session.
 * @returns the absolute directory, or undefined for a session without one.
 */
function useCurrentCwd(sessionId: SessionId | undefined): string | undefined {
  const runtime = useRuntime()
  const { groups } = useWorkspaceGroups()
  return useMemo(() => {
    if (sessionId === undefined) return undefined
    const summary = runtime.sessions.list.getSnapshot().byId[sessionId]
    if (summary?.cwd !== undefined && summary.cwd !== '') return summary.cwd
    // A session whose summary has not carried a cwd yet still belongs to a
    // workspace; the registry path is the same directory.
    return groups.find(group => group.sessions.some(row => row.id === sessionId))?.path
  }, [runtime, sessionId, groups])
}

/** The whole modern surface. */
export function Workbench({ navigation }: WorkbenchProps) {
  const runtime = useRuntime()
  const t = useT()
  const state = useNavigation(navigation)
  const compactOverlay = compactOverlayOf(state)
  const sessionId = useCurrentSessionId()
  const pendingQuestion = usePendingQuestion(sessionId)
  const pendingApproval = usePendingApproval(sessionId)
  const cwd = useCurrentCwd(sessionId)
  const blank = useConversationBlank(sessionId)
  const git = useGitStatus(cwd, sessionId)
  const goal = useProjectionValue<GoalProjectionView | null>(sessionId, 'goal')
  const modelReadiness = useModelReadiness(sessionId)
  const { groups } = useWorkspaceGroups()
  const { scheme, fontSize } = useAppearance()
  const [browsing, setBrowsing] = useState(false)
  const [fullSubagentConversation, setFullSubagentConversation] = useState<FullSubagentConversation>()
  const [railWidth, setRailWidth] = useState(readRailWidth)
  const [railResizing, setRailResizing] = useState(false)
  const railDrag = useRef<{ pointerId: number, startX: number, startWidth: number, width: number }>()

  const [asideWidth, setAsideWidth] = useState(readAsideWidth)
  const [asideResizing, setAsideResizing] = useState(false)
  const asideDrag = useRef<{ pointerId: number, startX: number, startWidth: number, width: number }>()

  const modelSelectRef = useRef<ModelSelectHandle>(null)

  const taskContext = useMemo<TaskContext>(() => {
    return {
      hasChanges: (git.status?.files.length ?? 0) > 0,
      goalActive: goal != null && goal.goal.phase !== 'completed' && goal.goal.phase !== 'paused',
    }
  }, [git.status, goal])

  const openSubagentConversation = useCallback((parentSessionId: SessionId, entry: SubagentChildEntry) => {
    setFullSubagentConversation({ parentSessionId, entry })
  }, [])

  const closeSubagentConversation = useCallback(() => {
    const opened = fullSubagentConversation
    setFullSubagentConversation(undefined)
    if (opened === undefined || runtime.sessions.list.getSnapshot().current !== opened.entry.id) return
    runtime.sessions.open(opened.parentSessionId)
  }, [fullSubagentConversation, runtime])

  useEffect(() => { navigation.setWorkspace(cwd) }, [cwd, navigation])

  // The frame fits itself to its own width rather than the window's: it is
  // mounted into a host slot, and how much room that slot has is a fact only
  // the element can report. The class it lands in drives both the panels
  // (through the store, so an operator's toggle is not fought over) and the
  // stylesheet, which reads it off the root as a data attribute.
  const [frame, setFrame] = useState<HTMLDivElement | null>(null)
  const size = useLayoutSize(frame)
  useEffect(() => { navigation.fit(size) }, [navigation, size])

  const resizeRail = useCallback((width: number, persist = false) => {
    const next = clampRailWidth(width)
    setRailWidth(next)
    if (persist) writeRailWidth(next)
    return next
  }, [])

  const startRailResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    railDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: railWidth,
      width: railWidth,
    }
    setRailResizing(true)
  }, [railWidth])

  const moveRailResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = railDrag.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    drag.width = resizeRail(drag.startWidth + event.clientX - drag.startX)
  }, [resizeRail])

  const finishRailResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = railDrag.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    writeRailWidth(drag.width)
    railDrag.current = undefined
    setRailResizing(false)
  }, [])

  const resizeRailWithKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    let next: number | undefined
    const step = event.shiftKey ? 24 : 8
    if (event.key === 'ArrowLeft') next = railWidth - step
    if (event.key === 'ArrowRight') next = railWidth + step
    if (event.key === 'Home') next = RAIL_WIDTH.min
    if (event.key === 'End') next = RAIL_WIDTH.max
    if (next === undefined) return
    event.preventDefault()
    resizeRail(next, true)
  }, [railWidth, resizeRail])

  const resizeAside = useCallback((width: number, persist = false) => {
    const next = clampAsideWidth(width)
    setAsideWidth(next)
    if (persist) writeAsideWidth(next)
    return next
  }, [])

  const startAsideResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    asideDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: asideWidth,
      width: asideWidth,
    }
    setAsideResizing(true)
  }, [asideWidth])

  const moveAsideResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = asideDrag.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    drag.width = resizeAside(drag.startWidth + drag.startX - event.clientX)
  }, [resizeAside])

  const finishAsideResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = asideDrag.current
    if (drag === undefined || drag.pointerId !== event.pointerId) return
    writeAsideWidth(drag.width)
    asideDrag.current = undefined
    setAsideResizing(false)
  }, [])

  const resizeAsideWithKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    let next: number | undefined
    const step = event.shiftKey ? 24 : 8
    if (event.key === 'ArrowLeft') next = asideWidth + step
    if (event.key === 'ArrowRight') next = asideWidth - step
    if (event.key === 'Home') next = ASIDE_WIDTH.min
    if (event.key === 'End') next = ASIDE_WIDTH.max
    if (next === undefined) return
    event.preventDefault()
    resizeAside(next, true)
  }, [asideWidth, resizeAside])

  const restoreOverlayFocus = useCallback((target: 'rail' | 'aside' | 'summary') => {
    window.requestAnimationFrame(() => {
      frame?.querySelector<HTMLElement>(`[data-dcode-focus-target="${target}"]`)?.focus()
    })
  }, [frame])

  const dismissCompactOverlay = useCallback(() => {
    const overlay = compactOverlayOf(navigation.getSnapshot())
    navigation.closeCompactOverlay()
    if (overlay !== undefined) restoreOverlayFocus(overlay)
  }, [navigation, restoreOverlayFocus])

  // A compact overlay owns one same-URL history entry. Browser Back therefore
  // dismisses it before it can leave the workbench; closing it through its
  // button, scrim, or Escape consumes that entry in the same way. Replacing
  // the marker when overlays switch keeps the mutually-exclusive hand-off to
  // a single history step, and Forward can restore the marked overlay.
  const previousCompactOverlay = useRef<CompactOverlay>()
  const overlayFromPopState = useRef(false)
  const programmaticHistoryBack = useRef(false)
  const compactOverlayRef = useRef(compactOverlay)
  compactOverlayRef.current = compactOverlay

  useEffect(() => {
    const onPopState = (event: PopStateEvent): void => {
      if (programmaticHistoryBack.current) {
        programmaticHistoryBack.current = false
        return
      }
      const current = compactOverlayRef.current
      if (current !== undefined) {
        overlayFromPopState.current = true
        dismissCompactOverlay()
        return
      }
      const forwardOverlay = historyOverlay(event.state)
      if (forwardOverlay !== undefined && navigation.getSnapshot().layout === 'compact') {
        overlayFromPopState.current = true
        navigation.openCompactOverlay(forwardOverlay)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      if (historyOverlay(history.state) !== undefined) {
        const next = { ...(history.state as Record<string, unknown>) }
        delete next[COMPACT_OVERLAY_HISTORY_KEY]
        history.replaceState(next, '')
      }
    }
  }, [dismissCompactOverlay, navigation])

  useEffect(() => {
    const previous = previousCompactOverlay.current
    previousCompactOverlay.current = compactOverlay
    if (previous === compactOverlay) return

    if (compactOverlay !== undefined) {
      if (overlayFromPopState.current) {
        overlayFromPopState.current = false
        return
      }
      if (previous === undefined) history.pushState(historyStateWithOverlay(compactOverlay), '')
      else history.replaceState(historyStateWithOverlay(compactOverlay), '')
      return
    }

    if (previous !== undefined) {
      if (overlayFromPopState.current) {
        overlayFromPopState.current = false
      } else if (historyOverlay(history.state) !== undefined) {
        programmaticHistoryBack.current = true
        history.back()
      }
    }
  }, [compactOverlay])

  // A native backdrop only shows through a transparent document, and the
  // desktop shell paints an opaque page ground of its own. Clearing it is
  // scoped to this component's lifetime, so the official interface — which
  // has no translucent surfaces — gets its opaque ground back the moment the
  // operator switches away.
  const nativeMaterial = runtime.appearance.material !== 'none'
  useLayoutEffect(() => {
    if (!nativeMaterial || typeof document === 'undefined') return undefined
    document.documentElement.setAttribute(ACRYLIC_ATTRIBUTE, '')
    return () => { document.documentElement.removeAttribute(ACRYLIC_ATTRIBUTE) }
  }, [nativeMaterial])

  // Portaled DSH menus render under body. Give that portal the same DCode
  // token scope while the workbench owns the page so official setting rows
  // keep the glass treatment instead of falling back to a separate surface.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.body.setAttribute('data-dcode-scope', '')
    document.body.setAttribute('data-dcode-scheme', scheme)
    document.body.setAttribute(ACRYLIC_ATTRIBUTE, '')
    document.body.style.setProperty('--dsh-content-font-size', `${fontSize}px`)
    document.body.style.setProperty('--zx-font-size-base', `${fontSize}px`)
    return () => {
      document.body.removeAttribute('data-dcode-scope')
      document.body.removeAttribute('data-dcode-scheme')
      document.body.removeAttribute(ACRYLIC_ATTRIBUTE)
      document.body.style.removeProperty('--zx-font-size-base')
    }
  }, [scheme, fontSize])

  const newTask = useCallback((workspaceId?: string) => {
    navigation.show('session')
    runtime.navigation?.startSession(workspaceId)
  }, [navigation, runtime])

  const adoptWorkspace = useCallback(async (path: string) => {
    const nav = runtime.navigation
    if (nav === undefined) return
    const workspace = await runtime.workspaces.create({ path })
    navigation.show('session')
    nav.startSession(workspace.workspaceId)
  }, [navigation, runtime])

  const openWorkspace = useCallback(() => {
    const nav = runtime.navigation
    if (nav === undefined) return
    // The native chooser first: on the desktop shell it is the right dialog,
    // and it is the only one that can reach a directory outside the host's
    // browsable roots. A surface without one falls through to the in-app
    // browser rather than failing silently.
    void nav.pickDirectory()
      .then(async (path) => {
        if (path === null) return
        await adoptWorkspace(path)
      })
      .catch(() => { setBrowsing(true) })
  }, [runtime, adoptWorkspace])

  const selectModel = useCallback(() => {
    modelSelectRef.current?.open()
  }, [])

  const configureProvider = useCallback(() => {
    if (modelReadiness.provider !== undefined) navigation.openProviderSettings(modelReadiness.provider)
  }, [modelReadiness.provider, navigation])

  // The global keyboard layer. Registered on the document so it works while
  // focus is inside the composer, and scoped to this surface's lifetime.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      // A modal owns the keyboard while it is open: its own Escape closes it,
      // and the global shortcuts must not fire a workspace action behind it.
      if (document.querySelector('[role="dialog"]') !== null) return
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigation.togglePalette()
        return
      }
      if (navigation.getSnapshot().paletteOpen) return
      if (meta && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        newTask()
        return
      }
      if (meta && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        openWorkspace()
        return
      }
      if (meta && event.altKey && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        navigation.toggleAside()
        return
      }
      if (meta && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        navigation.toggleRail()
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        const snapshot = navigation.getSnapshot()
        if (snapshot.paletteOpen) navigation.togglePalette(false)
        else if (compactOverlayOf(snapshot) !== undefined) dismissCompactOverlay()
        else if (snapshot.summaryOpen) {
          navigation.toggleSummary(false)
          restoreOverlayFocus('summary')
        } else if (snapshot.diff !== undefined) {
          navigation.closeDiff()
          restoreOverlayFocus('aside')
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [dismissCompactOverlay, navigation, newTask, openWorkspace, restoreOverlayFocus])

  // Plugins is the only full-frame surface. Settings and the resource library
  // are modal cards over the workspace so the operator can return without
  // losing the current task context.
  const fullSurface = state.view === 'plugins'
  // Compact holds both side panels over the conversation instead of beside
  // it, so there they need a scrim to dismiss against.
  const overlayOpen = compactOverlay !== undefined

  return (
    <div
      ref={setFrame}
      className={css.root}
      {...dcodeScope}
      data-dcode-scheme={scheme}
      data-dcode-layout={state.layout}
      data-rail-resizing={railResizing ? '' : undefined}
      data-aside-resizing={asideResizing ? '' : undefined}
      style={{
        '--zx-rail-width': `${railWidth}px`,
        '--zx-aside-width': `${asideWidth}px`,
        '--zx-font-size-base': `${fontSize}px`,
        '--dsh-content-font-size': `${fontSize}px`,
      } as CSSProperties}
      {...{ [ACRYLIC_ATTRIBUTE]: '' }}
    >
      {fullSurface
        ? (
          <div className={css.surface}>
            <PluginsHome navigation={navigation} />
          </div>
        )
        : (
          <>
            {overlayOpen
              ? (
                <div
                  className={css.scrim}
                  role="presentation"
                  onClick={dismissCompactOverlay}
                />
              )
              : null}
            <div className={`${css.rail} ${state.railOpen ? '' : css.railCollapsed}`}>
              <LeftRail
                navigation={navigation}
                onNewTask={newTask}
              />
              {state.railOpen && state.layout !== 'compact'
                ? (
                  <div
                    className={css.railResizeHandle}
                    role="separator"
                    aria-label={t('nav.resize')}
                    aria-orientation="vertical"
                    aria-valuemin={RAIL_WIDTH.min}
                    aria-valuemax={RAIL_WIDTH.max}
                    aria-valuenow={railWidth}
                    tabIndex={0}
                    onPointerDown={startRailResize}
                    onPointerMove={moveRailResize}
                    onPointerUp={finishRailResize}
                    onPointerCancel={finishRailResize}
                    onKeyDown={resizeRailWithKeyboard}
                    onDoubleClick={() => { resizeRail(RAIL_WIDTH.default, true) }}
                  />
                )
                : null}
            </div>
            <div className={`${css.center} ${blank ? css.centerBlank : ''}`}>
              <TopBar navigation={navigation} sessionId={sessionId} cwd={cwd} context={taskContext} />
              <SummaryCard
                navigation={navigation}
                sessionId={sessionId}
                cwd={cwd}
                open={state.summaryOpen}
                compact={state.layout === 'compact'}
              />
              {fullSubagentConversation === undefined
                ? (
                  <Transcript
                    navigation={navigation}
                    sessionId={sessionId}
                    cwd={cwd}
                    blank={blank}
                    compact={state.layout === 'compact'}
                  />
                )
                : null}
              {/* The composer seat is the plan card's anchor. The card is
                  absolutely positioned above this wrapper, so it floats over
                  the transcript instead of shortening its scroll viewport. */}
              <div className={css.composerSeat}>
                <PlanCard key={sessionId} sessionId={sessionId} />
                {blank
                  ? (
                    <ReadinessCard
                      hasWorkspace={groups.length > 0}
                      hasSession={sessionId !== undefined}
                      model={modelReadiness}
                      onOpenWorkspace={openWorkspace}
                      onNewTask={() => { newTask(groups[0]?.workspaceId) }}
                      onSelectModel={selectModel}
                      onConfigureProvider={configureProvider}
                      t={t}
                    />
                  )
                  : null}
                {pendingApproval !== undefined
                  ? <ApprovalCard pending={pendingApproval} />
                  : pendingQuestion === undefined
                  ? (
                    <Composer
                      sessionId={sessionId}
                      blank={blank}
                      cwd={cwd}
                      onOpenWorkspace={openWorkspace}
                      readiness={modelReadiness}
                      onSelectModel={selectModel}
                      onConfigureProvider={configureProvider}
                      modelSelectRef={modelSelectRef}
                    />
                  )
                  : <QuestionComposer pending={pendingQuestion} />}
              </div>
              {/* Balances the transcript's share of the free height while the
                  conversation is blank; inert otherwise. Kept after the
                  composer so the phase change never remounts it. */}
              <div className={css.filler} aria-hidden />
            </div>
            <div className={`${css.aside} ${state.asideOpen ? '' : css.asideCollapsed}`}>
              {state.asideOpen && state.layout !== 'compact'
                ? (
                  <div
                    className={css.asideResizeHandle}
                    role="separator"
                    aria-label={t('nav.resize')}
                    aria-orientation="vertical"
                    aria-valuemin={ASIDE_WIDTH.min}
                    aria-valuemax={ASIDE_WIDTH.max}
                    aria-valuenow={asideWidth}
                    tabIndex={0}
                    onPointerDown={startAsideResize}
                    onPointerMove={moveAsideResize}
                    onPointerUp={finishAsideResize}
                    onPointerCancel={finishAsideResize}
                    onKeyDown={resizeAsideWithKeyboard}
                    onDoubleClick={() => { resizeAside(ASIDE_WIDTH.default, true) }}
                  />
                )
                : null}
              <Aside
                navigation={navigation}
                sessionId={sessionId}
                cwd={cwd}
                context={taskContext}
                onOpenSubagentConversation={openSubagentConversation}
              />
            </div>
          </>
        )}
      {state.view === 'library' || state.view === 'learning'
        ? (
          <ResourceLibraryHome
            navigation={navigation}
            cwd={cwd}
            sessionId={sessionId}
            onOpenWorkspace={openWorkspace}
          />
        )
        : null}
      {state.view === 'settings'
        ? (
          <SettingsBoundary
            resetKey={state.settingsSection}
            t={t}
            onBack={() => { navigation.show('session') }}
          >
            <SettingsSurface
              navigation={navigation}
              sessionId={sessionId}
            />
          </SettingsBoundary>
        )
        : null}
      {state.paletteOpen
        ? (
          <CommandPalette
            navigation={navigation}
            onNewTask={newTask}
            onOpenWorkspace={openWorkspace}
          />
        )
        : null}
      {browsing
        ? (
          <DirectoryPicker
            onPicked={(path) => {
              setBrowsing(false)
              void adoptWorkspace(path)
            }}
            onCancel={() => { setBrowsing(false) }}
          />
        )
        : null}
      {fullSubagentConversation === undefined
        ? null
        : (
          <SubagentConversationDialog
            parentSessionId={fullSubagentConversation.parentSessionId}
            entry={fullSubagentConversation.entry}
            navigation={navigation}
            onClose={closeSubagentConversation}
          />
        )}
    </div>
  )
}
