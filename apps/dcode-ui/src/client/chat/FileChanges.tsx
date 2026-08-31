/**
 * The file-change summary card that closes a turn.
 *
 * It lists exactly the paths that turn's settled write/edit calls touched,
 * annotates each with the line counts from the working-tree status, opens the
 * diff viewer on click, and offers the one destructive action the workbench
 * has: undoing that turn's edits.
 *
 * Undo is deliberately narrow. It restores tracked files from HEAD and moves
 * untracked ones into `.dsh/dcode-undo/<timestamp>/` rather than deleting
 * them, so a mistaken undo is recoverable from the operator's own directory.
 * @module @dsh-portable/dcode-ui/client/chat/FileChanges
 */

import { useCallback, useMemo, useState } from 'react'
import { IconEditOutline16, IconRefreshOutline14, RiskConfirmation } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import { DiffCount, Spinner, ui } from '../shell/ui.tsx'
import type { GitStatus } from '../rpc.ts'
import css from './FileChanges.module.css'

/** Props of the turn file-change card. */
export interface FileChangesProps {
  /** Paths this turn wrote, in first-touch order. */
  readonly paths: readonly string[]
  /** The workspace directory the paths are relative to. */
  readonly cwd: string | undefined
  /** Working-tree status, used for the per-file line counts. */
  readonly status: GitStatus | undefined
  /** Open the diff viewer on one path. */
  readonly onOpenDiff: (path: string) => void
  /** Re-read the working tree after an undo. */
  readonly onChanged: () => void
}

interface UndoNote {
  readonly text: string
  readonly kind: 'success' | 'error'
}

/** Split a path into its directory prefix and file name for two-tone display. */
function splitPath(path: string): { dir: string; name: string } {
  const normalized = path.split('\\').join('/')
  const index = normalized.lastIndexOf('/')
  return index === -1
    ? { dir: '', name: normalized }
    : { dir: normalized.slice(0, index + 1), name: normalized.slice(index + 1) }
}

/**
 * Normalize a turn path to the repository-relative form git status reports.
 *
 * Git status rows and every `/dcode` path are root-relative, while a tool's
 * recorded path is absolute or relative to the session cwd; when the workspace
 * is a repository subdirectory the naive string-crop of the cwd prefix
 * produces the wrong file and zero line counts.
 */
function repoRelative(path: string, cwd: string | undefined, root: string | undefined): string {
  const normalized = path.split('\\').join('/').replace(/^\.\//, '')
  const r = root === undefined ? undefined : root.split('\\').join('/').replace(/\/$/, '')
  if (r !== undefined && normalized.startsWith(r + '/')) return normalized.slice(r.length + 1)
  if (cwd === undefined) return normalized
  const c = cwd.split('\\').join('/').replace(/\/$/, '')
  const absolute = normalized.startsWith(c + '/') ? normalized : `${c}/${normalized}`
  return r !== undefined && absolute.startsWith(r + '/')
    ? absolute.slice(r.length + 1)
    : absolute.startsWith(c + '/') ? absolute.slice(c.length + 1) : normalized
}

/** Exact-match a normalized path against a repository-relative status row. */
function countsFor(status: GitStatus | undefined, path: string): { insertions: number; deletions: number } {
  const row = status?.files.find(file => file.path.split('\\').join('/') === path)
  return { insertions: row?.insertions ?? 0, deletions: row?.deletions ?? 0 }
}

/** The turn's changed-file summary with its undo action. */
export function FileChanges({ paths, cwd, status, onOpenDiff, onChanged }: FileChangesProps) {
  const runtime = useRuntime()
  const t = useT()
  const [undoing, setUndoing] = useState(false)
  const [note, setNote] = useState<UndoNote | undefined>(undefined)
  const [confirmingUndo, setConfirmingUndo] = useState(false)
  const [acknowledgedUndo, setAcknowledgedUndo] = useState(false)

  const gitPath = useCallback(
    (path: string) => repoRelative(path, cwd, status?.root),
    [cwd, status?.root],
  )

  const totals = useMemo(() => paths.reduce(
    (sum, path) => {
      const counts = countsFor(status, gitPath(path))
      return { insertions: sum.insertions + counts.insertions, deletions: sum.deletions + counts.deletions }
    },
    { insertions: 0, deletions: 0 },
  ), [paths, status, gitPath])

  const undo = useCallback(() => {
    if (cwd === undefined) return
    setUndoing(true)
    setNote(undefined)
    const targets = paths.map(path => gitPath(path))
    void runtime.git.undo(cwd, targets).then((result) => {
      if (!result.ok) {
        setNote({ text: result.error.message, kind: 'error' })
        return
      }
      const reverted = result.value.outcomes.filter(outcome => outcome.result !== 'skipped')
      const quarantined = result.value.outcomes.filter(outcome => outcome.result === 'quarantined')
      setNote({
        text: quarantined.length === 0
          ? t('changes.undone', { count: reverted.length })
          : `${t('changes.undone', { count: reverted.length })} · ${quarantined.map(o => o.movedTo ?? o.path).join(', ')}`,
        kind: 'success',
      })
      onChanged()
    }).catch((cause: unknown) => {
      setNote({ text: cause instanceof Error ? cause.message : String(cause), kind: 'error' })
    }).finally(() => { setUndoing(false) })
  }, [runtime, cwd, gitPath, onChanged, t])

  if (paths.length === 0) return null

  return (
    <section className={css.card}>
      <header className={`${css.head} ${ui.cardHeader}`}>
        <span className={css.title}>{t('changes.count', { count: paths.length })}</span>
        <DiffCount insertions={totals.insertions} deletions={totals.deletions} />
        <button
          type="button"
          className={css.undo}
          disabled={undoing || cwd === undefined || !runtime.git.available}
          onClick={() => {
            setAcknowledgedUndo(false)
            setConfirmingUndo(true)
          }}
          title={t('changes.undo')}
        >
          {undoing ? <Spinner /> : <IconRefreshOutline14 />}
          {undoing ? t('changes.undoing') : t('changes.undo')}
        </button>
      </header>
      {paths.map((path) => {
        const { dir, name } = splitPath(path)
        const target = gitPath(path)
        const counts = countsFor(status, target)
        return (
          <button
            key={path}
            type="button"
            className={css.row}
            onClick={() => { onOpenDiff(target) }}
            title={path}
          >
            <IconEditOutline16 />
            {/* `direction: rtl` keeps the file name visible when a long path
                is truncated; the bidi isolate keeps the text itself in order. */}
            <span className={css.path}><bdi>{dir === '' ? '' : <span className={css.dir}>{dir}</span>}{name}</bdi></span>
            <DiffCount insertions={counts.insertions} deletions={counts.deletions} />
          </button>
        )
      })}
      {note === undefined
        ? null
        : <p className={`${css.note} ${note.kind === 'error' ? css.noteError : ''}`} role={note.kind === 'error' ? 'alert' : 'status'}>{note.text}</p>}
      <RiskConfirmation
        open={confirmingUndo}
        title={t('changes.undoConfirmTitle')}
        description={t('changes.undoConfirmBody')}
        acknowledgeLabel={t('changes.undoConfirmAcknowledge')}
        cancelLabel={t('common.cancel')}
        closeLabel={t('common.close')}
        confirmLabel={t('changes.undo')}
        acknowledged={acknowledgedUndo}
        disabled={undoing}
        onAcknowledgedChange={setAcknowledgedUndo}
        onCancel={() => {
          setAcknowledgedUndo(false)
          setConfirmingUndo(false)
        }}
        onConfirm={() => {
          if (!acknowledgedUndo) return
          setAcknowledgedUndo(false)
          setConfirmingUndo(false)
          undo()
        }}
      />
    </section>
  )
}
