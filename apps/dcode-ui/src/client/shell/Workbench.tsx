/**
 * The workbench frame.
 *
 * Registered into DSH's built-in `root` slot, so while the modern surface is
 * active it owns the whole page and the official three-column frame stands
 * aside. Everything below reads Host state through {@link useRuntime}; the
 * only state this component owns is which panel is showing.
 * @module @dsh-portable/dcode-ui/client/shell/Workbench
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { dcodeScope } from '../tokens.ts'
import { useNavigation, type NavigationStore } from '../state/navigation.ts'
import {
  useConversationBlank, useCurrentSessionId, usePendingQuestion, useWorkspaceGroups,
} from '../state/hooks.ts'
import { useRuntime } from '../state/runtime.ts'
import { ACRYLIC_ATTRIBUTE } from '../theme.ts'
import { useAppearance } from './ThemeSwitch.tsx'
import { TopBar } from './TopBar.tsx'
import { LeftRail } from './LeftRail.tsx'
import { Aside } from './Aside.tsx'
import { Composer } from './Composer.tsx'
import { PlanCard } from './PlanCard.tsx'
import { QuestionComposer } from './QuestionComposer.tsx'
import { CommandPalette } from './CommandPalette.tsx'
import { DirectoryPicker } from './DirectoryPicker.tsx'
import { Transcript } from '../chat/Transcript.tsx'
import { LearningHome } from '../learning/LearningHome.tsx'
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
  const state = useNavigation(navigation)
  const sessionId = useCurrentSessionId()
  const pendingQuestion = usePendingQuestion(sessionId)
  const cwd = useCurrentCwd(sessionId)
  const blank = useConversationBlank(sessionId)
  const { scheme } = useAppearance()
  const [browsing, setBrowsing] = useState(false)

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
        if (navigation.getSnapshot().paletteOpen) navigation.togglePalette(false)
        else if (navigation.getSnapshot().diff !== undefined) navigation.closeDiff()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [navigation, newTask, openWorkspace])

  const fullSurface = state.view !== 'session'

  return (
    <div
      className={css.root}
      {...dcodeScope}
      data-dcode-scheme={scheme}
      {...(acrylic ? { [ACRYLIC_ATTRIBUTE]: '' } : {})}
    >
      {fullSurface
        ? (
          <div className={css.surface}>
            {state.view === 'learning'
              ? <LearningHome navigation={navigation} cwd={cwd} sessionId={sessionId} />
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
            <div className={`${css.rail} ${state.railOpen ? '' : css.railCollapsed}`}>
              <LeftRail
                navigation={navigation}
                onNewTask={newTask}
                onOpenWorkspace={openWorkspace}
              />
            </div>
            <div className={`${css.center} ${blank ? css.centerBlank : ''}`}>
              <TopBar navigation={navigation} sessionId={sessionId} cwd={cwd} />
              <Transcript
                navigation={navigation}
                sessionId={sessionId}
                cwd={cwd}
                blank={blank}
              />
              <PlanCard key={sessionId} sessionId={sessionId} open={state.summaryOpen} navigation={navigation} />
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
