/**
 * The Git tools panel: branch, working-tree changes, and a commit entry.
 *
 * This is the capability the Harness itself does not ship, completed over the
 * `/dcode` host channel. It stays deliberately small — status, diff, commit —
 * because anything wider (push, rebase, history rewriting) belongs in a real
 * git client, not in a panel beside a conversation.
 * @module @dsh-portable/dcode-ui/client/git/GitPanel
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IconBranchOutline16, IconChevronDownOutline14, IconChevronRightOutline14,
  IconCodeOutline16, IconFolderClose16, IconFolderOpen16, IconFolderOpenOutline16,
  IconRefreshOutline14, IconSearchOutline16, IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useT } from '../state/i18n.ts'
import { useRuntime } from '../state/runtime.ts'
import { useWorkspaceGroups } from '../state/hooks.ts'
import { Button, DiffCount, EmptyState, IconButton, Popover, Spinner, ui } from '../shell/ui.tsx'
import { useGitStatus } from './useGit.ts'
import {
  buildFileTree, filterGitFiles, flattenFileTree, virtualRange,
  type FileTreeNode, type GitStatusFilter,
} from './fileTree.ts'
import type { GitFileChange } from '../rpc.ts'
import type { DiffTarget } from '../state/navigation.ts'
import css from './GitPanel.module.css'

/** Props of the git panel. */
export interface GitPanelProps {
  readonly cwd: string | undefined
  readonly sessionId: SessionId | undefined
  /** Path currently shown in the diff viewer. */
  readonly selected: DiffTarget | undefined
  readonly onOpenDiff: (path: string, staged: boolean) => void
}

/** Colour class for a porcelain status letter. */
function codeClass(file: GitFileChange): string {
  if (file.status === 'untracked') return css.codeUntracked
  if (file.status === 'added') return css.codeAdded
  if (file.status === 'deleted') return css.codeRemoved
  return ''
}

/** Single-letter status mark for a changed file. */
function codeMark(file: GitFileChange): string {
  switch (file.status) {
    case 'untracked': return 'U'
    case 'added': return 'A'
    case 'deleted': return 'D'
    case 'renamed': return 'R'
    case 'conflicted': return '!'
    default: return 'M'
  }
}

/** Localized accessible name for a porcelain status. */
function statusLabel(file: GitFileChange, t: ReturnType<typeof useT>): string {
  switch (file.status) {
    case 'untracked': return t('git.status.untracked')
    case 'added': return t('git.status.added')
    case 'deleted': return t('git.status.deleted')
    case 'renamed': return t('git.status.renamed')
    case 'conflicted': return t('git.status.conflicted')
    default: return t('git.status.modified')
  }
}

const TREE_ROW_HEIGHT = 34
const TREE_MAX_HEIGHT = 280
const LARGE_DIRECTORY_SIZE = 24
const EMPTY_FILES: readonly GitFileChange[] = []
const STATUS_FILTER_KEYS = {
  all: 'git.filterAll',
  modified: 'git.status.modified',
  added: 'git.status.added',
  deleted: 'git.status.deleted',
  renamed: 'git.status.renamed',
  conflicted: 'git.status.conflicted',
  untracked: 'git.status.untracked',
} as const

function WindowedFileTree({
  files, staged, selected, onOpenDiff, onToggle, onToggleDirectory, expandedDirectories,
  query, statsLabel, fileStatusLabel, actionLabel, mutation,
}: {
  readonly files: readonly GitFileChange[]
  readonly staged: boolean
  readonly selected: DiffTarget | undefined
  readonly onOpenDiff: (path: string, staged: boolean) => void
  readonly onToggle: (file: GitFileChange, staged: boolean) => void
  readonly statsLabel: (file: GitFileChange) => string
  readonly fileStatusLabel: (file: GitFileChange) => string
  readonly actionLabel: (file: GitFileChange, staged: boolean) => string
  readonly onToggleDirectory: (key: string, expanded: boolean) => void
  readonly expandedDirectories: ReadonlyMap<string, boolean>
  readonly query: string
  readonly mutation: ReturnType<typeof useGitStatus>['mutation']
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const viewportRef = useRef<HTMLDivElement>(null)
  const lastScrolledSelection = useRef<string | undefined>(undefined)
  const tree = useMemo(() => buildFileTree(files), [files])
  const selectedPath = selected?.staged === staged ? selected.path : undefined
  const rows = useMemo(() => flattenFileTree(tree, (node: FileTreeNode) => {
    if (query.trim() !== '') return true
    const override = expandedDirectories.get(`${String(staged)}:${node.path}`)
    if (override !== undefined) return override
    if (selectedPath !== undefined && (selectedPath === node.path || selectedPath.startsWith(`${node.path}/`))) return true
    return node.fileCount < LARGE_DIRECTORY_SIZE
  }), [tree, query, selectedPath, expandedDirectories, staged])
  const height = Math.min(TREE_MAX_HEIGHT, rows.length * TREE_ROW_HEIGHT)
  const range = virtualRange(rows.length, scrollTop, height, TREE_ROW_HEIGHT)

  useEffect(() => {
    if (selectedPath === undefined) {
      lastScrolledSelection.current = undefined
      return
    }
    const selectionKey = `${String(staged)}:${selectedPath}`
    if (lastScrolledSelection.current === selectionKey) return
    const index = rows.findIndex(row => row.kind === 'file' && row.path === selectedPath)
    if (index < 0) return
    const next = Math.max(0, index * TREE_ROW_HEIGHT - Math.floor(height / 2))
    if (viewportRef.current !== null) viewportRef.current.scrollTop = next
    setScrollTop(next)
    lastScrolledSelection.current = selectionKey
  }, [selectedPath, rows, height, staged])

  const fileRow = (file: GitFileChange, name: string, depth: number): React.ReactNode => {
    const conflicted = file.status === 'conflicted'
    const pending = mutation?.kind === (staged ? 'unstage' : 'stage') && mutation.paths.includes(file.path)
    const hasStats = file.insertions !== 0 || file.deletions !== 0
    return (
      <div
        className={`${css.file} ${selected?.path === file.path && selected.staged === staged ? css.fileActive : ''}`}
        style={{ paddingLeft: `${String(depth * 12 + 8)}px` }}
        role="treeitem"
        aria-selected={selected?.path === file.path && selected.staged === staged}
      >
        <button type="button" className={css.fileOpen} onClick={() => { onOpenDiff(file.path, staged) }} title={file.path}>
          <span className={css.fileIcon} aria-hidden><IconCodeOutline16 /></span>
          <span className={`${css.code} ${codeClass(file)}`} aria-label={fileStatusLabel(file)}>{codeMark(file)}</span>
          <span className={css.pathText}>
            <span className={css.path}><bdi>{name}</bdi></span>
            <span className={css.pathDetail}><bdi>{file.path}</bdi></span>
          </span>
          {hasStats
            ? <span className={css.lineBadge} aria-label={statsLabel(file)}>
                {file.insertions === 0 ? null : <span className={css.badgeAdded}>+{file.insertions}</span>}
                {file.deletions === 0 ? null : <span className={css.badgeRemoved}>-{file.deletions}</span>}
              </span>
            : null}
        </button>
        <button
          type="button"
          className={css.fileAction}
          aria-label={actionLabel(file, staged)}
          title={actionLabel(file, staged)}
          disabled={conflicted || mutation !== undefined}
          onClick={() => { onToggle(file, staged) }}
        >
          {pending ? <Spinner /> : staged ? '−' : '+'}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={viewportRef}
      className={css.treeViewport}
      style={{ height }}
      role="tree"
      onScroll={(event) => { setScrollTop(event.currentTarget.scrollTop) }}
    >
      <div className={css.treeCanvas} style={{ height: rows.length * TREE_ROW_HEIGHT }}>
        {rows.slice(range.start, range.end).map((row, offset) => (
          <div
            key={`${row.kind}:${row.path}`}
            className={css.virtualRow}
            style={{ height: TREE_ROW_HEIGHT, transform: `translateY(${String((range.start + offset) * TREE_ROW_HEIGHT)}px)` }}
          >
            {row.file !== undefined
              ? fileRow(row.file, row.name, row.depth)
              : (
                <button
                  type="button"
                  className={css.directory}
                  style={{ paddingLeft: `${String(row.depth * 12 + 8)}px` }}
                  title={row.path}
                  role="treeitem"
                  aria-expanded={row.expanded}
                  onClick={() => {
                    if (query.trim() === '') onToggleDirectory(`${String(staged)}:${row.path}`, !(row.expanded ?? false))
                  }}
                >
                  <span className={css.directoryChevron} aria-hidden>
                    {row.expanded ? <IconChevronDownOutline14 /> : <IconChevronRightOutline14 />}
                  </span>
                  <span className={css.directoryIcon} aria-hidden>
                    {row.expanded ? <IconFolderOpen16 /> : <IconFolderClose16 />}
                  </span>
                  <span className={css.pathText}>
                    <span className={css.path}>{row.name}</span>
                    <span className={css.pathDetail}>{row.path}</span>
                  </span>
                  <span className={css.directoryCount}>{row.fileCount}</span>
                </button>
              )}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Branch, changed files and the commit entry. */
export function GitPanel({ cwd, sessionId, selected, onOpenDiff }: GitPanelProps) {
  const runtime = useRuntime()
  const t = useT()
  const { groups } = useWorkspaceGroups()
  const git = useGitStatus(cwd, sessionId)
  const [message, setMessage] = useState('')
  const [committing, setCommitting] = useState(false)
  const [note, setNote] = useState<{ text: string; error: boolean } | undefined>(undefined)
  const [branches, setBranches] = useState<readonly { name: string; current: boolean }[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<GitStatusFilter>('all')
  const [expandedDirectories, setExpandedDirectories] = useState<ReadonlyMap<string, boolean>>(() => new Map())
  const statusFiles = git.status?.files ?? EMPTY_FILES
  const stagedFiles = useMemo(() => statusFiles.filter(file => file.staged), [statusFiles])
  const unstagedFiles = useMemo(() => statusFiles.filter(file => !file.staged), [statusFiles])
  const visibleFiles = useMemo(() => filterGitFiles(statusFiles, query, filter), [statusFiles, query, filter])
  const visibleStagedFiles = useMemo(() => visibleFiles.filter(file => file.staged), [visibleFiles])
  const visibleUnstagedFiles = useMemo(() => visibleFiles.filter(file => !file.staged), [visibleFiles])

  useEffect(() => {
    setExpandedDirectories(new Map())
    setQuery('')
    setFilter('all')
  }, [cwd])

  const toggleStage = useCallback((files: readonly GitFileChange[], staged: boolean) => {
    const paths = files.filter(file => file.status !== 'conflicted').map(file => file.path)
    if (paths.length === 0) return
    setNote(undefined)
    void (staged ? git.unstage(paths) : git.stage(paths)).then((error) => {
      if (error !== undefined) setNote({ text: error, error: true })
    })
  }, [git])

  // The branch list is read once per workspace and refreshed with the status,
  // so opening the menu costs nothing.
  useEffect(() => {
    if (cwd === undefined) {
      setBranches([])
      return undefined
    }
    let live = true
    void runtime.git.branches(cwd).then((result) => {
      if (live && result.ok) setBranches(result.value.branches)
      if (live && !result.ok) setNote({ text: result.error.message, error: true })
    }).catch((cause: unknown) => {
      if (live) setNote({ text: cause instanceof Error ? cause.message : String(cause), error: true })
    })
    return () => { live = false }
  }, [runtime, cwd, git.status])

  const commit = useCallback(() => {
    if (cwd === undefined) return
    setCommitting(true)
    setNote(undefined)
    void runtime.git.commit(cwd, message).then((result) => {
      setCommitting(false)
      if (!result.ok) {
        setNote({ text: result.error.message, error: true })
        return
      }
      if (!result.value.committed) {
        setNote({
          text: result.value.reason === 'nothing-staged' ? t('git.nothingStaged') : result.value.reason ?? t('common.error'),
          error: true,
        })
        return
      }
      setMessage('')
      setNote({ text: t('git.committed', { commit: result.value.commit ?? '' }), error: false })
    }).catch((cause: unknown) => {
      setNote({ text: cause instanceof Error ? cause.message : String(cause), error: true })
    }).finally(() => {
      setCommitting(false)
      git.refresh()
    })
  }, [runtime, cwd, message, git, t])

  if (git.unavailable) return <EmptyState>{t('git.unavailable')}</EmptyState>
  if (cwd === undefined) return <EmptyState>{t('chat.empty.noWorkspace')}</EmptyState>
  if (git.pending) return <EmptyState><Spinner /></EmptyState>
  if (git.error !== undefined) return <EmptyState>{git.error}</EmptyState>
  if (git.status === undefined) return <EmptyState>{t('common.error')}</EmptyState>
  if (!git.status.repository) return <EmptyState>{t('git.notRepository')}</EmptyState>

  const status = git.status
  const workspace = groups.find(group => group.path === cwd)
  const suggestedMessage = (() => {
    const files = status.files
    if (files.length === 0) return ''
    const scope = files.length === 1 ? files[0]?.path.split('/').pop() ?? 'workspace' : `${String(files.length)} files`
    const onlyDocs = files.every(file => /(?:^|\/)(?:docs?|README)|\.md$/i.test(file.path))
    const onlyTests = files.every(file => /(?:test|spec)\.[^.]+$/i.test(file.path))
    const verb = onlyDocs ? 'docs' : onlyTests ? 'test' : files.some(file => file.status === 'added') ? 'feat' : 'chore'
    return `${verb}: update ${scope}`
  })()

  const commitSummary = stagedFiles.slice(0, 2).map(file => file.path.split('/').pop() ?? file.path).join(', ')
    + (stagedFiles.length > 2 ? ` +${String(stagedFiles.length - 2)}` : '')

  const fileGroup = (
    label: string,
    files: readonly GitFileChange[],
    staged: boolean,
  ) => files.length === 0
    ? null
    : (
      <section className={css.fileGroup} aria-label={label}>
        <div className={css.groupHead}>
          <span>{label} <span className={css.groupCount}>{files.length}</span></span>
          <button
            type="button"
            className={css.groupAction}
            disabled={committing || git.mutation !== undefined || files.every(file => file.status === 'conflicted')}
            onClick={() => { toggleStage(files, staged) }}
          >
            {git.mutation?.kind === (staged ? 'unstage' : 'stage') && git.mutation.paths.length > 1
              ? t(staged ? 'git.unstaging' : 'git.staging')
              : t(staged ? 'git.unstageAll' : 'git.stageAll')}
          </button>
        </div>
        <div className={css.files}>
          <WindowedFileTree
            files={files}
            staged={staged}
            selected={selected}
            onOpenDiff={onOpenDiff}
            onToggle={(file, isStaged) => { toggleStage([file], isStaged) }}
            statsLabel={file => t('git.fileStats', { insertions: file.insertions, deletions: file.deletions })}
            fileStatusLabel={file => statusLabel(file, t)}
            actionLabel={(file, isStaged) => file.status === 'conflicted'
              ? t('git.conflictCannotStage')
              : t(isStaged ? 'git.unstageFile' : 'git.stageFile', { path: file.path })}
            query={query}
            expandedDirectories={expandedDirectories}
            onToggleDirectory={(key, expanded) => {
              setExpandedDirectories(current => new Map(current).set(key, expanded))
            }}
            mutation={git.mutation}
          />
        </div>
      </section>
    )

  return (
    <div className={css.panel}>
      <div className={css.head}>
        <span className={ui.grow}>{t('git.title')}</span>
        <IconButton label={t('git.refresh')} onClick={git.refresh}>
          {git.loading ? <Spinner /> : <IconRefreshOutline14 />}
        </IconButton>
      </div>

      <div className={css.summary}>
        <span className={css.summaryLabel}>{t('git.changes')}</span>
        <DiffCount insertions={status.insertions} deletions={status.deletions} />
      </div>

      {git.mutation === undefined
        ? null
        : <div className={css.pending} role="status">{t(git.mutation.kind === 'stage' ? 'git.stagingCount' : 'git.unstagingCount', { count: git.mutation.paths.length })}</div>}

      <div className={css.fileToolbar}>
        <label className={css.searchBox}>
          <span className={css.searchIcon} aria-hidden><IconSearchOutline16 /></span>
          <input
            type="search"
            value={query}
            aria-label={t('git.searchFiles')}
            placeholder={t('git.searchFiles')}
            onChange={event => { setQuery(event.target.value) }}
          />
        </label>
        <label className={css.statusFilter}>
          <span>{t('git.filterStatus')}</span>
          <select value={filter} onChange={event => { setFilter(event.target.value as GitStatusFilter) }}>
            {(['all', 'modified', 'added', 'deleted', 'renamed', 'conflicted', 'untracked'] as const).map(value => (
              <option key={value} value={value}>
                {t(STATUS_FILTER_KEYS[value])} ({value === 'all' ? status.files.length : status.files.filter(file => file.status === value).length})
              </option>
            ))}
          </select>
        </label>
      </div>

      <Popover
        label={t('workspace.select')}
        placement="down"
        trigger={
          <>
            <IconFolderOpenOutline16 />
            <span>{workspace?.title ?? cwd.split(/[\\/\\]/).filter(Boolean).pop() ?? cwd}</span>
            <IconChevronDownOutline14 />
          </>
        }
        rows={groups.map(group => ({
          id: String(group.workspaceId),
          label: group.title,
          detail: group.path,
          icon: <IconFolderOpenOutline16 />,
          active: group.workspaceId === workspace?.workspaceId,
          onSelect: () => { runtime.navigation?.startSession(group.workspaceId) },
        }))}
        triggerClassName={css.workspaceRow}
      />

      <div className={css.branchRow}>
        <Popover
          label={t('git.branches')}
          placement="down"
          trigger={
            <>
              <IconBranchOutline16 />
              <span>{status.branch ?? 'HEAD'}</span>
            </>
          }
          children={<div className={ui.menuLabel}>{t('git.branchReadOnly')}</div>}
          rows={branches.map(branch => ({
            id: branch.name,
            label: branch.name,
            detail: branch.current ? t('git.currentBranch') : undefined,
            disabled: true,
            active: branch.current,
          }))}
          triggerClassName={css.branchRow}
        />
        {status.ahead > 0 ? <span>{t('git.ahead', { count: status.ahead })}</span> : null}
        {status.behind > 0 ? <span>{t('git.behind', { count: status.behind })}</span> : null}
      </div>

      {status.files.length === 0
        ? <EmptyState>{t('git.clean')}</EmptyState>
        : (
          <div className={css.fileGroups}>
            {fileGroup(t('git.staged'), visibleStagedFiles, true)}
            {fileGroup(t('git.unstaged'), visibleUnstagedFiles, false)}
            {visibleFiles.length === 0 ? <EmptyState>{t('git.noMatchingFiles')}</EmptyState> : null}
          </div>
        )}

      <div className={css.commit}>
        <div className={stagedFiles.length === 0 ? css.commitBlocked : css.commitSummary} role="status">
          {stagedFiles.length === 0
            ? t('git.commitBlocked')
            : t('git.commitSummary', { count: stagedFiles.length, summary: commitSummary })}
        </div>
        <div className={css.commitInputRow}>
          <textarea
            className={css.input}
            rows={2}
            value={message}
            aria-label={t('git.commitPlaceholder')}
            placeholder={t('git.commitPlaceholder')}
            onChange={event => { setMessage(event.target.value) }}
          />
          <button type="button" className={css.suggest} disabled={suggestedMessage === '' || message.trim() !== ''} onClick={() => { setMessage(current => current.trim() === '' ? suggestedMessage : current) }} title={t('git.suggestCommit')} aria-label={t('git.suggestCommit')}><IconSparkle16 /></button>
        </div>
        <div className={css.actions}>
          <Button
            primary
            disabled={committing || git.mutation !== undefined || message.trim() === '' || stagedFiles.length === 0}
            onClick={commit}
          >
            {committing ? t('git.committing') : t('git.commit')}
          </Button>
          {note === undefined
            ? null
            : <span className={`${css.note} ${note.error ? css.noteError : ''}`} role={note.error ? 'alert' : 'status'}>{note.text}</span>}
        </div>
      </div>
    </div>
  )
}
