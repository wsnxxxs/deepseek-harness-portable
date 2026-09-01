/**
 * DCode's resource-library launcher.
 *
 * The library content and its settings-style dialog belong to the Interactive
 * Learning client package. DCode only supplies its own workspace/session
 * candidates and the small hand-off actions needed when a person has not
 * opened a resource space yet. The official DSH sidebar entry uses the same
 * dialog and the same VaultLibrary underneath it.
 * @module @dsh-portable/dcode-ui/client/library/ResourceLibraryHome
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  VaultLibraryDialog,
  type VaultLibraryTopic,
} from '@dsh-portable/interactive-learning/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useSessionList, useWorkspaces } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import css from './ResourceLibraryHome.module.css'

/** Props of the resource-library launcher. */
export interface ResourceLibraryHomeProps {
  readonly navigation: NavigationStore
  readonly cwd: string | undefined
  readonly sessionId: SessionId | undefined
  /** Open the host workspace chooser when the library has no usable target. */
  readonly onOpenWorkspace?: () => void
}

/** A resource space as projected by the existing roster endpoint. */
export interface ResourceSpace extends VaultLibraryTopic {
  readonly root: string
  readonly sources: number
  readonly concepts: number
  readonly notes: number
  readonly blocked: number
}

interface ResourceRoster { vaults: readonly ResourceSpace[] }
interface RosterState {
  readonly phase: 'loading' | 'ready' | 'error'
  readonly spaces: readonly ResourceSpace[]
  readonly error?: string
}

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

/** Keep this projection exported for consumers that used the former overview. */
export function resourceTotals(spaces: readonly ResourceSpace[]) {
  return spaces.reduce((totals, space) => ({
    sources: totals.sources + space.sources,
    notes: totals.notes + space.notes,
    concepts: totals.concepts + space.concepts,
    due: totals.due + space.due,
  }), { sources: 0, notes: 0, concepts: 0, due: 0 })
}

function StatusContent({
  title, body, busy = false, action, primary = false,
}: {
  title?: string
  body?: string
  busy?: boolean
  action?: { label: string; onClick: () => void; disabled?: boolean }
  primary?: boolean
}): ReactNode {
  return (
    <div className={css.status} role={busy ? 'status' : undefined} aria-busy={busy || undefined}>
      {title !== undefined && <p className={css.statusTitle}>{title}</p>}
      {body !== undefined && <p className={css.statusBody}>{body}</p>}
      {action !== undefined && (
        <div className={css.statusActions}>
          <button
            type="button"
            className={`${css.statusAction} ${primary ? css.statusActionPrimary : ''}`}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  )
}

/** Open an existing task in a space, or create a task under that workspace. */
function useOpenSpaceSession({
  navigation, runtime, list, workspaces, cwd, sessionId, selectedCwd,
}: {
  navigation: NavigationStore
  runtime: ReturnType<typeof useRuntime>
  list: ReturnType<typeof useSessionList>
  workspaces: ReturnType<typeof useWorkspaces>
  cwd: string | undefined
  sessionId: SessionId | undefined
  selectedCwd: string | undefined
}) {
  return useCallback((space: ResourceSpace | undefined): boolean => {
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
}

/** The shared home for the official and DCode library content. */
export function ResourceLibraryHome({ navigation, cwd, sessionId, onOpenWorkspace }: ResourceLibraryHomeProps) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const workspaces = useWorkspaces()
  const [selectedCwd, setSelectedCwd] = useState<string | undefined>(cwd)
  const [reloads, setReloads] = useState(0)
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
  const selectedSpace = spaces.find(space => space.cwd === selectedCwd)
    ?? spaces.find(space => space.cwd === cwd)
    ?? spaces[0]

  useEffect(() => {
    setSelectedCwd(current => spaces.some(space => space.cwd === current)
      ? current
      : spaces.find(space => space.cwd === cwd)?.cwd
        ?? spaces[0]?.cwd
        ?? cwd)
  }, [cwd, spaces])

  const openSpaceSession = useOpenSpaceSession({
    navigation, runtime, list, workspaces, cwd, sessionId, selectedCwd,
  })

  const openMaterialIntake = useCallback(() => {
    if (openSpaceSession(selectedSpace)) return
    onOpenWorkspace?.()
  }, [onOpenWorkspace, openSpaceSession, selectedSpace])

  const close = useCallback(() => { navigation.show('session') }, [navigation])
  const canOpenWorkspace = runtime.navigation !== undefined || onOpenWorkspace !== undefined
  const dialogContent = roster.phase === 'loading'
    ? <StatusContent body={t('library.loading')} busy />
    : roster.phase === 'error'
      ? (
        <StatusContent
          title={t('library.loadFailed')}
          body={t('library.loadFailedBody')}
          action={{ label: t('library.retry'), onClick: () => { setReloads(value => value + 1) } }}
        />
      )
      : spaces.length === 0
        ? (
          <StatusContent
            title={t('library.emptyTitle')}
            body={t('library.emptyBody')}
            action={{ label: t('library.addMaterial'), onClick: openMaterialIntake, disabled: !canOpenWorkspace }}
            primary
          />
        )
        : undefined

  return (
    <VaultLibraryDialog
      open
      title={t('library.title')}
      topics={spaces}
      selectedCwd={selectedSpace?.cwd}
      call={selectedSpace === undefined ? undefined : runtime.learningCall}
      t={runtime.learningT}
      onSelectCwd={(next) => { setSelectedCwd(next) }}
      onClose={close}
      content={dialogContent}
    />
  )
}
