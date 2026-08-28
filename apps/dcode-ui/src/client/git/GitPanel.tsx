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
  IconRefreshOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useT } from '../state/i18n.ts'
import { useRuntime } from '../state/runtime.ts'
import { useWorkspaceGroups } from '../state/hooks.ts'
import { Button, DiffCount, EmptyState, IconButton, Popover, Spinner, ui } from '../shell/ui.tsx'
import { useGitStatus } from './useGit.ts'
import type { GitFileChange } from '../rpc.ts'
import css from './GitPanel.module.css'

/** Props of the git panel. */
export interface GitPanelProps {
  readonly cwd: string | undefined
  readonly sessionId: SessionId | undefined
  /** Path currently shown in the diff viewer. */
  readonly selected: string | undefined
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
          <div className={css.files}>
            {status.files.map(file => (
              <button
                key={`${file.code}:${file.path}`}
                type="button"
                className={`${css.file} ${selected === file.path ? css.fileActive : ''}`}
                onClick={() => { onOpenDiff(file.path, file.staged) }}
                title={file.path}
              >
                <span className={`${css.code} ${codeClass(file)}`} aria-hidden>{codeMark(file)}</span>
                <span className={css.path}><bdi>{file.path}</bdi></span>
                <DiffCount insertions={file.insertions} deletions={file.deletions} />
              </button>
            ))}
          </div>
        )}

      <div className={css.commit}>
        <textarea
          className={css.input}
          rows={2}
          value={message}
          placeholder={t('git.commitPlaceholder')}
          onChange={event => { setMessage(event.target.value) }}
        />
        <div className={css.actions}>
          <Button
            primary
            disabled={committing || message.trim() === '' || status.files.length === 0}
            onClick={commit}
          >
            {committing ? t('git.committing') : t('git.commit')}
          </Button>
          {note === undefined
            ? null
            : <span className={`${css.note} ${note.error ? css.noteError : ''}`}>{note.text}</span>}
        </div>
      </div>
    </div>
  )
}
