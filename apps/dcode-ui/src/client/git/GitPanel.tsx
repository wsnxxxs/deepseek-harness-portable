/**
 * The Git tools panel: branch, working-tree changes, and a commit entry.
 *
 * This is the capability the Harness itself does not ship, completed over the
 * `/dcode` host channel. It stays deliberately small — status, diff, commit —
 * because anything wider (push, rebase, history rewriting) belongs in a real
 * git client, not in a panel beside a conversation.
 * @module @dsh-portable/dcode-ui/client/git/GitPanel
 */

import { useCallback, useEffect, useState } from 'react'
import {
  IconBranchOutline16, IconChevronDownOutline14, IconFolderOpenOutline16,
  IconRefreshOutline14, IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useT } from '../state/i18n.ts'
import { useRuntime } from '../state/runtime.ts'
import { useWorkspaceGroups } from '../state/hooks.ts'
import { Button, DiffCount, EmptyState, IconButton, Popover, Spinner, ui } from '../shell/ui.tsx'
import { useGitStatus } from './useGit.ts'
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

interface FileTreeNode {
  readonly name: string
  readonly path: string
  readonly file?: GitFileChange
  readonly children: readonly FileTreeNode[]
}

/** Build a stable directory-first tree from repository-relative paths. */
function fileTree(files: readonly GitFileChange[]): readonly FileTreeNode[] {
  interface MutableNode { name: string; path: string; file?: GitFileChange; children: Map<string, MutableNode> }
  const root = new Map<string, MutableNode>()
  for (const file of files) {
    let level = root
    let path = ''
    const parts = file.path.split('/').filter(Boolean)
    parts.forEach((name, index) => {
      path = path === '' ? name : `${path}/${name}`
      let node = level.get(name)
      if (node === undefined) {
        node = { name, path, children: new Map() }
        level.set(name, node)
      }
      if (index === parts.length - 1) node.file = file
      level = node.children
    })
  }
  const freeze = (nodes: Map<string, MutableNode>): readonly FileTreeNode[] => [...nodes.values()]
    .sort((left, right) => Number(left.file !== undefined) - Number(right.file !== undefined) || left.name.localeCompare(right.name))
    .map(node => ({ ...node, children: freeze(node.children) }))
  return freeze(root)
}

function FileTree({
  files, staged, selected, onOpenDiff, onToggle, statsLabel, fileStatusLabel, actionLabel, collapsed, mutation,
}: {
  readonly files: readonly GitFileChange[]
  readonly staged: boolean
  readonly selected: DiffTarget | undefined
  readonly onOpenDiff: (path: string, staged: boolean) => void
  readonly onToggle: (file: GitFileChange, staged: boolean) => void
  readonly statsLabel: (file: GitFileChange) => string
  readonly fileStatusLabel: (file: GitFileChange) => string
  readonly actionLabel: (file: GitFileChange, staged: boolean) => string
  readonly collapsed: boolean
  readonly mutation: ReturnType<typeof useGitStatus>['mutation']
}) {
  const row = (file: GitFileChange, name: string, depth?: number): React.ReactNode => {
    const conflicted = file.status === 'conflicted'
    const pending = mutation?.kind === (staged ? 'unstage' : 'stage') && mutation.paths.includes(file.path)
    return (
      <div
        key={`${file.code}:${file.path}:${String(staged)}`}
        className={`${css.file} ${selected?.path === file.path && selected.staged === staged ? css.fileActive : ''}`}
        style={depth === undefined ? undefined : { paddingLeft: `${String(depth * 12 + 8)}px` }}
      >
        <button type="button" className={css.fileOpen} onClick={() => { onOpenDiff(file.path, staged) }} title={file.path}>
          <span className={`${css.code} ${codeClass(file)}`} aria-label={fileStatusLabel(file)}>{codeMark(file)}</span>
          <span className={css.path}><bdi>{name}</bdi></span>
          <span className={css.lineBadge} aria-label={statsLabel(file)}>
            <span className={css.badgeAdded}>+{file.insertions}</span>
            <span className={css.badgeRemoved}>-{file.deletions}</span>
          </span>
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
  const render = (nodes: readonly FileTreeNode[], depth = 0): React.ReactNode => nodes.map((node) => {
    if (node.file === undefined) {
      return (
        <div key={node.path} className={css.directoryGroup}>
          <div className={css.directory} style={{ paddingLeft: `${String(depth * 12 + 8)}px` }}>
            <span className={css.directoryChevron} aria-hidden>⌄</span>
            <span title={node.path}>{node.name}</span>
          </div>
          {render(node.children, depth + 1)}
        </div>
      )
    }
    return row(node.file, node.name, depth)
  })
  if (collapsed) {
    return <>{files.map(file => row(file, file.path))}</>
  }
  return <>{render(fileTree(files))}</>
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
  const [filter, setFilter] = useState<'all' | 'modified' | 'untracked'>('all')
  const [foldersCollapsed, setFoldersCollapsed] = useState(false)

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
  const visibleFiles = status.files.filter(file => filter === 'all'
    || (filter === 'untracked' ? file.status === 'untracked' : file.status !== 'untracked'))
  const stagedFiles = status.files.filter(file => file.staged)
  const unstagedFiles = status.files.filter(file => !file.staged)
  const visibleStagedFiles = visibleFiles.filter(file => file.staged)
  const visibleUnstagedFiles = visibleFiles.filter(file => !file.staged)
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
    allFiles: readonly GitFileChange[],
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
            disabled={committing || git.mutation !== undefined || allFiles.every(file => file.status === 'conflicted')}
            onClick={() => { toggleStage(allFiles, staged) }}
          >
            {git.mutation?.kind === (staged ? 'unstage' : 'stage') && git.mutation.paths.length > 1
              ? t(staged ? 'git.unstaging' : 'git.staging')
              : t(staged ? 'git.unstageAll' : 'git.stageAll')}
          </button>
        </div>
        <div className={css.files} role="tree">
          <FileTree
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
            collapsed={foldersCollapsed}
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
        <span className={css.filters} role="group" aria-label={t('git.filterChangedFiles')}>
          {(['all', 'modified', 'untracked'] as const).map(value => (
            <button key={value} type="button" className={filter === value ? css.filterActive : ''} aria-pressed={filter === value} onClick={() => { setFilter(value) }}>
              {t(value === 'all' ? 'git.filterAll' : value === 'modified' ? 'git.filterModified' : 'git.filterUntracked')}
              <span>{value === 'all' ? status.files.length : status.files.filter(file => value === 'untracked' ? file.status === 'untracked' : file.status !== 'untracked').length}</span>
            </button>
          ))}
        </span>
        <button type="button" className={css.collapseFolders} aria-pressed={foldersCollapsed} onClick={() => { setFoldersCollapsed(value => !value) }} title={t('git.toggleTree')}>
          {foldersCollapsed ? t('git.tree') : t('git.collapse')}
        </button>
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
            {fileGroup(t('git.staged'), visibleStagedFiles, stagedFiles, true)}
            {fileGroup(t('git.unstaged'), visibleUnstagedFiles, unstagedFiles, false)}
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
