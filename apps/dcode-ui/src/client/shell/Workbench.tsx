/**
 * The workbench frame.
 *
 * Registered into DSH's built-in `root` slot, so while the modern surface is
 * active it owns the whole page and the official three-column frame stands
 * aside. Everything below reads Host state through {@link useRuntime}; the
 * only state this component owns is which panel is showing.
 * @module @dsh-portable/dcode-ui/client/shell/Workbench
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { dcodeScope } from '../tokens.ts'
import { useNavigation, type NavigationStore } from '../state/navigation.ts'
import {
  useConversationBlank, useCurrentSessionId, usePendingQuestion, useWorkspaceGroups,
} from '../state/hooks.ts'
import { useRuntime } from '../state/runtime.ts'
import { useLayoutSize } from '../state/layout.ts'
import {
  clampRailWidth, RAIL_WIDTH, readRailWidth, writeRailWidth,
} from '../state/rail-width.ts'
import { useT } from '../state/i18n.ts'
import { ACRYLIC_ATTRIBUTE } from '../theme.ts'
import { useAppearance } from './ThemeSwitch.tsx'
import { TopBar } from './TopBar.tsx'
import { LeftRail } from './LeftRail.tsx'
import { Aside } from './Aside.tsx'
import { SummaryCard } from './SummaryCard.tsx'
import { Composer } from './Composer.tsx'
import { PlanCard } from './PlanCard.tsx'
import { QuestionComposer } from './QuestionComposer.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { DirectoryPicker } from './DirectoryPicker.tsx'
import { Transcript } from '../chat/Transcript.tsx'
import { LearningHome } from '../learning/LearningHome.tsx'
import { PluginsHome } from '../plugins/PluginsHome.tsx'
import { SettingsSurface } from '../settings/SettingsSurface.tsx'
import css from './Workbench.module.css'

/** Props of the workbench root. */
export interface WorkbenchProps {
  /** The view-state store shared with the keyboard layer and the palette. */
  readonly navigation: NavigationStore
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
  const sessionId = useCurrentSessionId()
  const pendingQuestion = usePendingQuestion(sessionId)
  const cwd = useCurrentCwd(sessionId)
  const blank = useConversationBlank(sessionId)
  const { scheme } = useAppearance()
  const [browsing, setBrowsing] = useState(false)
  const [railWidth, setRailWidth] = useState(readRailWidth)
  const [railResizing, setRailResizing] = useState(false)
  const railDrag = useRef<{ pointerId: number, startX: number, startWidth: number, width: number }>()

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

  const restoreOverlayFocus = useCallback((target: 'rail' | 'aside' | 'summary') => {
    window.requestAnimationFrame(() => {
      frame?.querySelector<HTMLElement>(`[data-dcode-focus-target="${target}"]`)?.focus()
    })
  }, [frame])

  // A native backdrop only shows through a transparent document, and the
  // desktop shell paints an opaque page ground of its own. Clearing it is
  // scoped to this component's lifetime, so the official interface — which
  // has no translucent surfaces — gets its opaque ground back the moment the
  // operator switches away.
  const acrylic = runtime.appearance.material !== 'none'
  useEffect(() => {
    if (!acrylic || typeof document === 'undefined') return undefined
    const roots = [document.documentElement, document.body]
    for (const node of roots) node.setAttribute(ACRYLIC_ATTRIBUTE, '')
    return () => { for (const node of roots) node.removeAttribute(ACRYLIC_ATTRIBUTE) }
  }, [acrylic])

  // Portaled DSH menus render under body. Give that portal the same DCode
  // token scope while the workbench owns the page so official setting rows
  // keep the glass treatment instead of falling back to a separate surface.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    document.body.setAttribute('data-dcode-scope', '')
    document.body.setAttribute('data-dcode-scheme', scheme)
    return () => {
      document.body.removeAttribute('data-dcode-scope')
      document.body.removeAttribute('data-dcode-scheme')
    }
  }, [scheme])

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

  // The global keyboard layer. Registered on the document so it works while
  // focus is inside the composer, and scoped to this surface's lifetime.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
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
        else if (snapshot.summaryOpen) {
          navigation.toggleSummary(false)
          restoreOverlayFocus('summary')
        } else if (snapshot.diff !== undefined) {
          navigation.closeDiff()
          restoreOverlayFocus('aside')
        } else if (snapshot.layout === 'compact' && snapshot.railOpen) {
          navigation.closeRail()
          restoreOverlayFocus('rail')
        } else if (snapshot.layout === 'compact' && snapshot.asideOpen) {
          navigation.toggleAside()
          restoreOverlayFocus('aside')
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [navigation, newTask, openWorkspace, restoreOverlayFocus])

  const fullSurface = state.view !== 'session'
  // Compact holds both side panels over the conversation instead of beside
  // it, so there they need a scrim to dismiss against.
  const drawer = state.layout === 'compact' && (state.railOpen || state.asideOpen)

  return (
    <div
      ref={setFrame}
      className={css.root}
      {...dcodeScope}
      data-dcode-scheme={scheme}
      data-dcode-layout={state.layout}
      data-rail-resizing={railResizing ? '' : undefined}
      style={{ '--zx-rail-width': `${railWidth}px` } as CSSProperties}
      {...(acrylic ? { [ACRYLIC_ATTRIBUTE]: '' } : {})}
    >
      {fullSurface
        ? (
          <div className={css.surface}>
            {state.view === 'learning'
              ? <LearningHome navigation={navigation} cwd={cwd} sessionId={sessionId} />
              : state.view === 'plugins'
                ? <PluginsHome navigation={navigation} />
                : (
                  <SettingsSurface
                    navigation={navigation}
                    sessionId={sessionId}
                  />
                )}
          </div>
        )
        : (
          <>
            {drawer
              ? (
                <div
                  className={css.scrim}
                  role="presentation"
                  onClick={() => {
                    if (state.railOpen) navigation.closeRail()
                    if (state.asideOpen) navigation.toggleAside()
                  }}
                />
              )
              : null}
            <div className={`${css.rail} ${state.railOpen ? '' : css.railCollapsed}`}>
              <LeftRail
                navigation={navigation}
                onNewTask={newTask}
                onOpenWorkspace={openWorkspace}
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
              <TopBar navigation={navigation} sessionId={sessionId} cwd={cwd} />
              <SummaryCard
                navigation={navigation}
                sessionId={sessionId}
                cwd={cwd}
                open={state.summaryOpen}
              />
              <Transcript
                navigation={navigation}
                sessionId={sessionId}
                cwd={cwd}
                blank={blank}
              />
              {/* Content-driven: the plan card only appears while the task has
                  a plan; trace activity lives in the environment summary. */}
              <PlanCard key={sessionId} sessionId={sessionId} />
              {pendingQuestion === undefined
                ? (
                  <Composer
                    sessionId={sessionId}
                    blank={blank}
                    cwd={cwd}
                    onOpenWorkspace={openWorkspace}
                  />
                )
                : <QuestionComposer pending={pendingQuestion} />}
              {/* Balances the transcript's share of the free height while the
                  conversation is blank; inert otherwise. Kept after the
                  composer so the phase change never remounts it. */}
              <div className={css.filler} aria-hidden />
            </div>
            <div className={`${css.aside} ${state.asideOpen ? '' : css.asideCollapsed}`}>
              <Aside navigation={navigation} sessionId={sessionId} cwd={cwd} />
            </div>
          </>
        )}
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
    </div>
  )
}
