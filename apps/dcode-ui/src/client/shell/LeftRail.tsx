/**
 * The left rail: the primary task action, the workspace/task tree, and the
 * account foot.
 *
 * The tree is the Session Controller's list grouped by the durable Workspace
 * registry — the same two stores the official sidebar reads — so a task
 * started in either surface appears in both.
 * @module @dsh-portable/dcode-ui/client/shell/LeftRail
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Button as PrimitiveButton, IconArchiveOutline20, IconCordisPluginOutline14,
  IconChevronDownOutline14, IconChevronRightOutline14,
  IconEditOutline16, IconEllipsisOutline16, IconFolderClose16,
  IconBrowseOutline16, IconFolderOpen16, IconNewChatOutline16,
  IconSearchOutline16, IconSettingsOutline16, IconSparkle16, IconTrashOutline16,
  relativeTime,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import { commandShortcut } from '../platform.ts'
import { useRuntime } from '../state/runtime.ts'
import { useSessionList, useWorkspaceGroups, type WorkspaceGroup } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useNavigation, type NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import { EmptyState, FocusingModal, IconButton, Popover, ui } from './ui.tsx'
import css from './LeftRail.module.css'

/** Props of the left rail. */
export interface LeftRailProps {
  readonly navigation: NavigationStore
  readonly onNewTask: (workspaceId?: string) => void
}

/** Suffix per relative-time bucket; `now` shows the bare word. */
const AGE_SUFFIX: Record<string, string> = {
  minutes: 'm', hours: 'h', days: 'd', months: 'mo', years: 'y',
}

/** Compact relative age of a session's last update. */
function useAge(): (updatedAt: number) => string {
  return useCallback((updatedAt: number) => {
    const { unit, n } = relativeTime(updatedAt, Date.now())
    if (unit === 'now') return '·'
    return `${String(n)}${AGE_SUFFIX[unit] ?? ''}`
  }, [])
}

function pathLeaf(path: string | undefined): string | undefined {
  if (path === undefined || path.trim() === '') return undefined
  const normalized = path.replace(/[\\/]+$/, '')
  const leaf = normalized.slice(Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/')) + 1)
  return leaf === '' ? undefined : leaf
}

/** One session row. */
function SessionRow(props: {
  session: SessionSummary
  current: boolean
  onOpen: () => void
  onArchive: () => void
  onDelete: () => void
  onRename: () => void
  age: string
}) {
  const { session, current } = props
  const t = useT()
  const stateLabel = session.running
    ? t('nav.running')
    : session.completed === true ? t('nav.completed') : t('nav.idle')
  return (
    <div className={`${css.rowShell} ${current ? css.rowShellActive : ''}`}>
      <button
        type="button"
        className={css.row}
        onClick={props.onOpen}
        title={session.displayTitle}
        data-session-id={session.id}
        aria-current={current ? 'true' : undefined}
      >
        <span className={css.rowAvatar} aria-hidden>
          <IconSparkle16 />
          <span className={`${css.rowPresence} ${session.running ? css.dotRunning : session.completed === true ? css.dotDone : ''}`} />
        </span>
        <span className={ui.visuallyHidden}>{stateLabel}</span>
        <span className={css.rowCopy}>
          <span className={css.rowTitle}>{session.displayTitle}</span>
          <span className={css.rowSubtitle}>{pathLeaf(session.cwd) ?? stateLabel}</span>
        </span>
        <span className={css.rowTime}>{props.age}</span>
      </button>
      <Popover
        label={t('top.moreActions')}
        placement="down"
        align="end"
        triggerClassName={css.rowMenu}
        trigger={<IconEllipsisOutline16 />}
        rows={[
          {
            id: 'rename',
            label: t('common.edit'),
            icon: <IconEditOutline16 />,
            onSelect: props.onRename,
          },
          {
            id: 'archive',
            label: t('session.archive'),
            icon: <IconArchiveOutline20 size={16} />,
            onSelect: props.onArchive,
          },
          {
            id: 'delete',
            label: t('session.delete'),
            icon: <IconTrashOutline16 />,
            danger: true,
            onSelect: props.onDelete,
          },
        ]}
      />
    </div>
  )
}

/** One project-folder header with collapse, create, rename and remove actions. */
function WorkspaceRow(props: {
  group: WorkspaceGroup
  collapsed: boolean
  onToggle: () => void
  onNewTask: () => void
  onRename: () => void
  onRemove: () => void
}) {
  const { group, collapsed } = props
  const t = useT()
  const refreshSessionId = group.sessions.find(session => session.running)?.id ?? group.sessions[0]?.id
  const git = useGitStatus(group.path, refreshSessionId)
  const gitStatus = git.status?.repository === true ? git.status : undefined
  const dirty = (gitStatus?.files.length ?? 0) > 0
  const branch = gitStatus?.branch ?? (gitStatus?.detached === true ? 'HEAD' : undefined)
  return (
    <div className={css.groupHeaderShell}>
      <button
        type="button"
        className={css.groupHeader}
        onClick={props.onToggle}
        title={group.path}
      >
        {collapsed ? <IconChevronRightOutline14 /> : <IconChevronDownOutline14 />}
        {collapsed ? <IconFolderClose16 /> : <IconFolderOpen16 />}
        <span className={css.groupName}>{group.title}</span>
        {branch === undefined
          ? null
          : (
            <span className={css.branchBadge} title={`${branch} · ${dirty ? t('git.changes') : t('git.clean')}`}>
              <span className={`${css.gitDot} ${dirty ? css.gitDotDirty : css.gitDotClean}`} aria-hidden />
              <span className={css.branchName}>{branch}</span>
            </span>
          )}
      </button>
      <div className={css.groupActions}>
        <Popover
          label={t('workspace.actions')}
          placement="down"
          align="end"
          triggerClassName={css.groupAction}
          trigger={<IconEllipsisOutline16 />}
          rows={[
            {
              id: 'rename',
              label: t('workspace.rename'),
              icon: <IconEditOutline16 />,
              onSelect: props.onRename,
            },
            {
              id: 'remove',
              label: t('workspace.remove'),
              icon: <IconTrashOutline16 />,
              danger: true,
              onSelect: props.onRemove,
            },
          ]}
        />
        <IconButton
          label={t('workspace.newTask')}
          className={css.groupAction}
          onClick={props.onNewTask}
        >
          <IconNewChatOutline16 />
        </IconButton>
      </div>
    </div>
  )
}

/** The task action, scrollable navigation/tree, and account foot. */
export function LeftRail({ navigation, onNewTask }: LeftRailProps) {
  const runtime = useRuntime()
  const t = useT()
  const state = useNavigation(navigation)
  const list = useSessionList()
  const { groups, ungrouped } = useWorkspaceGroups()
  const age = useAge()
  const searchRef = useRef<HTMLInputElement | null>(null)
  const treeRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => {
    try {
      const raw = localStorage.getItem('dcode.rail.collapsed')
      if (raw === null) return new Set()
      const parsed: unknown = JSON.parse(raw)
      return new Set(Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [])
    } catch {
      return new Set()
    }
  })
  const [sessionRenameTarget, setSessionRenameTarget] = useState<SessionSummary | undefined>()
  const [sessionRenameDraft, setSessionRenameDraft] = useState('')
  const [sessionRenaming, setSessionRenaming] = useState(false)
  const [sessionRenameError, setSessionRenameError] = useState<string | undefined>()
  const [renameTarget, setRenameTarget] = useState<WorkspaceGroup | undefined>()
  const [renameDraft, setRenameDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameError, setRenameError] = useState<string | undefined>()
  const [removeTarget, setRemoveTarget] = useState<WorkspaceGroup | undefined>()
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | undefined>()
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | undefined>()

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('dcode.rail.collapsed', JSON.stringify([...collapsed]))
    } catch {
      // Storage unavailable: the collapse state simply does not survive a reload.
    }
  }, [collapsed])

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredGroups = useMemo(() => groups.map((group) => {
    if (normalizedQuery === '') return group
    const groupMatches = `${group.title}\n${group.path}`.toLocaleLowerCase().includes(normalizedQuery)
    return {
      ...group,
      sessions: groupMatches
        ? group.sessions
        : group.sessions.filter(session => `${session.displayTitle}\n${session.cwd ?? group.path}`.toLocaleLowerCase().includes(normalizedQuery)),
    }
  }).filter(group => normalizedQuery === '' || group.sessions.length > 0
    || `${group.title}\n${group.path}`.toLocaleLowerCase().includes(normalizedQuery)), [groups, normalizedQuery])
  const filteredUngrouped = useMemo(() => normalizedQuery === ''
    ? ungrouped
    : ungrouped.filter(session => `${session.displayTitle}\n${session.cwd ?? ''}`.toLocaleLowerCase().includes(normalizedQuery)),
  [normalizedQuery, ungrouped])
  const hasRows = filteredGroups.length > 0 || filteredUngrouped.length > 0
  const visibleSessions = useMemo(() => [
    ...filteredGroups.flatMap(group => collapsed.has(group.workspaceId) ? [] : group.sessions),
    ...filteredUngrouped,
  ], [collapsed, filteredGroups, filteredUngrouped])

  const openSession = useCallback((session: SessionSummary, focus = false) => {
    navigation.show('session')
    runtime.sessions.open(session.id)
    if (!focus) return
    window.requestAnimationFrame(() => {
      const rows = treeRef.current?.querySelectorAll<HTMLButtonElement>('[data-session-id]') ?? []
      for (const row of rows) if (row.dataset.sessionId === session.id) row.focus()
    })
  }, [navigation, runtime])

  const moveSession = useCallback((direction: 1 | -1, fromSearch = false) => {
    if (visibleSessions.length === 0) return
    const currentIndex = visibleSessions.findIndex(session => session.id === list.current)
    const nextIndex = fromSearch
      ? (direction === 1 ? 0 : visibleSessions.length - 1)
      : Math.max(0, Math.min(visibleSessions.length - 1, (currentIndex < 0 ? (direction === 1 ? -1 : visibleSessions.length) : currentIndex) + direction))
    const session = visibleSessions[nextIndex]
    if (session !== undefined) openSession(session, true)
  }, [list.current, openSession, visibleSessions])

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent): void => {
      const target = event.target
      const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable)
      const findShortcut = event.key.toLocaleLowerCase() === 'f' && (event.metaKey || event.ctrlKey)
      const slashShortcut = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !editable
      if (!findShortcut && !slashShortcut) return
      event.preventDefault()
      searchRef.current?.focus()
      searchRef.current?.select()
    }
    document.addEventListener('keydown', focusSearch)
    return () => { document.removeEventListener('keydown', focusSearch) }
  }, [])

  const openSessionRename = useCallback((session: SessionSummary) => {
    setSessionRenameTarget(session)
    setSessionRenameDraft(session.displayTitle)
    setSessionRenameError(undefined)
  }, [])

  const confirmSessionRename = useCallback(() => {
    const target = sessionRenameTarget
    const title = sessionRenameDraft.trim()
    if (target === undefined || title === '' || title === target.displayTitle || sessionRenaming) return
    const session = runtime.binding(target.id)?.session
    if (session === undefined) {
      setSessionRenameError(t('common.error'))
      return
    }
    setSessionRenaming(true)
    setSessionRenameError(undefined)
    void session.rename(title).then((result) => {
      if (result.ok) setSessionRenameTarget(undefined)
      else if ('error' in result) setSessionRenameError(result.error.message)
    }).catch((cause: unknown) => {
      setSessionRenameError(cause instanceof Error ? cause.message : String(cause))
    }).finally(() => { setSessionRenaming(false) })
  }, [runtime, sessionRenameDraft, sessionRenameTarget, sessionRenaming, t])

  const openRename = useCallback((group: WorkspaceGroup) => {
    setRenameTarget(group)
    setRenameDraft(group.title)
    setRenameError(undefined)
  }, [])

  const closeRename = useCallback(() => {
    if (renaming) return
    setRenameTarget(undefined)
    setRenameError(undefined)
  }, [renaming])

  const confirmRename = useCallback(() => {
    const target = renameTarget
    const title = renameDraft.trim()
    if (target === undefined || renaming || title === '' || title === target.title) return
    setRenaming(true)
    setRenameError(undefined)
    void runtime.workspaces.rename(target.workspaceId, title)
      .then(() => { setRenameTarget(undefined) })
      .catch((cause: unknown) => {
        setRenameError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => { setRenaming(false) })
  }, [renameDraft, renameTarget, renaming, runtime])

  const openRemove = useCallback((group: WorkspaceGroup) => {
    setRemoveTarget(group)
    setRemoveError(undefined)
  }, [])

  const closeRemove = useCallback(() => {
    if (removing) return
    setRemoveTarget(undefined)
    setRemoveError(undefined)
  }, [removing])

  const confirmRemove = useCallback(() => {
    const target = removeTarget
    if (target === undefined || removing) return
    setRemoving(true)
    setRemoveError(undefined)
    void runtime.workspaces.delete(target.workspaceId)
      .then(() => { setRemoveTarget(undefined) })
      .catch((cause: unknown) => {
        setRemoveError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => { setRemoving(false) })
  }, [removing, removeTarget, runtime])

  const openDelete = useCallback((session: SessionSummary) => {
    setDeleteTarget(session)
    setDeleteError(undefined)
  }, [])

  const closeDelete = useCallback(() => {
    if (deleting) return
    setDeleteTarget(undefined)
    setDeleteError(undefined)
  }, [deleting])

  const confirmDelete = useCallback(() => {
    const target = deleteTarget
    if (target === undefined || deleting) return
    setDeleting(true)
    setDeleteError(undefined)
    void runtime.sessions.delete(target.id)
      .then(() => {
        if (runtime.sessions.list.getSnapshot().current === target.id) runtime.sessions.clear()
        setDeleteTarget(undefined)
      })
      .catch((cause: unknown) => {
        setDeleteError(cause instanceof Error ? cause.message : t('session.deleteFailed', { error: String(cause) }))
      })
      .finally(() => { setDeleting(false) })
  }, [deleteTarget, deleting, runtime, t])

  return (
    <nav className={css.rail} aria-label={t('app.title')}>
      {/* Only search and the primary action are pinned. Everything else —
          the two library entries and the task tree — belongs to one scroll,
          so a long task list can reclaim the rail's whole height instead of
          squeezing itself under a growing block of chrome. */}
      <div className={css.top}>
        <div className={css.brand}>
          <span className={css.brandMark} aria-hidden><IconSparkle16 /></span>
          <span className={css.brandCopy}>
            <strong>DCode</strong>
            <span>{t('nav.agentWorkspace')}</span>
          </span>
        </div>
        <label className={css.searchField}>
          <IconSearchOutline16 />
          <input
            ref={searchRef}
            type="search"
            className={css.searchInput}
            value={query}
            placeholder={t('common.search')}
            aria-label={t('common.search')}
            onChange={event => { setQuery(event.target.value) }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && query !== '') {
                event.preventDefault()
                setQuery('')
              } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                moveSession(event.key === 'ArrowDown' ? 1 : -1, true)
              }
            }}
          />
          <span className={css.searchShortcut}>/</span>
        </label>
        <button type="button" className={css.action} onClick={() => { onNewTask() }}>
          <IconNewChatOutline16 />
          <span className={ui.grow}>{t('nav.newTask')}</span>
          <span className={css.shortcut}>{commandShortcut('N')}</span>
        </button>
      </div>

      <div
        ref={treeRef}
        className={`${css.tree} ${ui.scroll}`}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
          event.preventDefault()
          moveSession(event.key === 'ArrowDown' ? 1 : -1)
        }}
      >
        <div className={css.treeActions}>
          <button
            type="button"
            className={`${css.action} ${state.view === 'plugins' ? css.actionActive : ''}`}
            onClick={() => { navigation.show('plugins') }}
          >
            <IconCordisPluginOutline14 size={16} />
            <span className={ui.grow}>{t('nav.plugins')}</span>
          </button>
          <button
            type="button"
            className={`${css.action} ${state.view === 'library' || state.view === 'learning' ? css.actionActive : ''}`}
            onClick={() => { navigation.show('library') }}
          >
            <IconBrowseOutline16 />
            <span className={ui.grow}>{t('nav.library')}</span>
          </button>
        </div>
        {hasRows ? <div className={css.sectionLabel}>{t('nav.conversations')}</div> : null}
        {hasRows ? <div className={css.treeDivider} aria-hidden /> : null}
        {hasRows
          ? (
            <>
              {filteredGroups.map(group => (
                <div className={css.group} key={group.workspaceId}>
                  <WorkspaceRow
                    group={group}
                    collapsed={collapsed.has(group.workspaceId)}
                    onToggle={() => { toggleGroup(group.workspaceId) }}
                    onNewTask={() => { onNewTask(group.workspaceId) }}
                    onRename={() => { openRename(group) }}
                    onRemove={() => { openRemove(group) }}
                  />
                  {collapsed.has(group.workspaceId)
                    ? null
                    : group.sessions.map(session => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        current={session.id === list.current}
                        age={age(session.updatedAt)}
                        onOpen={() => { openSession(session) }}
                        onRename={() => { openSessionRename(session) }}
                        onArchive={() => { void runtime.workspaces.archiveSession(session.id) }}
                        onDelete={() => { openDelete(session) }}
                      />
                    ))}
                </div>
              ))}
              {filteredUngrouped.length === 0
                ? null
                : (
                  <div className={css.group}>
                    <div className={css.groupHeader}>
                      <span className={css.groupName}>{t('nav.ungrouped')}</span>
                    </div>
                    {filteredUngrouped.map(session => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        current={session.id === list.current}
                        age={age(session.updatedAt)}
                        onOpen={() => { openSession(session) }}
                        onRename={() => { openSessionRename(session) }}
                        onArchive={() => { void runtime.workspaces.archiveSession(session.id) }}
                        onDelete={() => { openDelete(session) }}
                      />
                    ))}
                  </div>
                )}
            </>
          )
          : <EmptyState>{t('nav.noTasks')}</EmptyState>}
      </div>

      <div className={css.foot}>
        <button
          type="button"
          className={`${css.settingsTrigger} ${state.view === 'settings' ? css.settingsTriggerActive : ''}`}
          onClick={() => { navigation.openSettings('general') }}
        >
          <IconSettingsOutline16 />
          <span>{t('nav.settings')}</span>
        </button>
      </div>
      <FocusingModal
        open={sessionRenameTarget !== undefined}
        onClose={() => { if (!sessionRenaming) setSessionRenameTarget(undefined) }}
        title={t('common.edit')}
        closeLabel={t('common.close')}
        footer={(
          <>
            <PrimitiveButton variant="outline" disabled={sessionRenaming} onClick={() => { setSessionRenameTarget(undefined) }}>
              {t('common.cancel')}
            </PrimitiveButton>
            <PrimitiveButton
              variant="outline"
              disabled={sessionRenaming || sessionRenameDraft.trim() === '' || sessionRenameDraft.trim() === sessionRenameTarget?.displayTitle}
              onClick={confirmSessionRename}
            >
              {sessionRenaming ? t('common.saving') : t('common.save')}
            </PrimitiveButton>
          </>
        )}
      >
        <input
          className={css.workspaceInput}
          value={sessionRenameDraft}
          aria-label={t('common.edit')}
          autoFocus
          disabled={sessionRenaming}
          onChange={event => { setSessionRenameDraft(event.target.value); setSessionRenameError(undefined) }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            confirmSessionRename()
          }}
        />
        {sessionRenameError === undefined ? null : <div className={css.workspaceError} role="alert">{sessionRenameError}</div>}
      </FocusingModal>
      <FocusingModal
        open={renameTarget !== undefined}
        onClose={closeRename}
        title={t('workspace.renameTitle')}
        closeLabel={t('common.close')}
        footer={(
          <>
            <PrimitiveButton variant="outline" disabled={renaming} onClick={closeRename}>
              {t('common.cancel')}
            </PrimitiveButton>
            <PrimitiveButton
              variant="outline"
              disabled={renaming || renameDraft.trim() === '' || renameTarget === undefined || renameDraft.trim() === renameTarget.title}
              onClick={confirmRename}
            >
              {t('workspace.rename')}
            </PrimitiveButton>
          </>
        )}
      >
        <input
          className={css.workspaceInput}
          value={renameDraft}
          aria-label={t('workspace.name')}
          autoFocus
          disabled={renaming}
          onChange={event => { setRenameDraft(event.target.value); setRenameError(undefined) }}
          onKeyDown={event => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            confirmRename()
          }}
        />
        {renameError === undefined ? null : <div className={css.workspaceError} role="alert">{renameError}</div>}
      </FocusingModal>
      <FocusingModal
        open={removeTarget !== undefined}
        onClose={closeRemove}
        title={t('workspace.removeTitle')}
        closeLabel={t('common.close')}
        description={removeTarget === undefined ? undefined : t('workspace.removeBody', { name: removeTarget.title })}
        footer={(
          <>
            <PrimitiveButton variant="outline" disabled={removing} onClick={closeRemove}>
              {t('common.cancel')}
            </PrimitiveButton>
            <PrimitiveButton
              variant="outline"
              className={css.deleteConfirm}
              disabled={removing}
              onClick={confirmRemove}
            >
              {t('workspace.remove')}
            </PrimitiveButton>
          </>
        )}
      >
        {removing ? <div className={css.workspaceStatus} role="status">{t('workspace.removePending')}</div> : null}
        {removeError === undefined ? null : <div className={css.workspaceError} role="alert">{removeError}</div>}
      </FocusingModal>
      <FocusingModal
        open={deleteTarget !== undefined}
        onClose={closeDelete}
        title={t('session.deleteTitle')}
        closeLabel={t('common.close')}
        description={t('session.deleteBody')}
        footer={(
          <>
            <PrimitiveButton variant="outline" disabled={deleting} onClick={closeDelete}>
              {t('common.cancel')}
            </PrimitiveButton>
            <PrimitiveButton
              variant="outline"
              className={css.deleteConfirm}
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? t('common.saving') : t('session.delete')}
            </PrimitiveButton>
          </>
        )}
      >
        {deleting ? <div className={css.workspaceStatus} role="status">{t('common.saving')}</div> : null}
        {deleteError === undefined ? null : <div className={css.workspaceError} role="alert">{deleteError}</div>}
      </FocusingModal>
    </nav>
  )
}
