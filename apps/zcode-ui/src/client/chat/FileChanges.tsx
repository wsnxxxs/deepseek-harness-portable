/**
 * The file-change summary card that closes a turn.
 *
 * It lists exactly the paths that turn's settled write/edit calls touched,
 * annotates each with the line counts from the working-tree status, opens the
 * diff viewer on click, and offers the one destructive action the workbench
 * has: undoing that turn's edits.
 *
 * Undo is deliberately narrow. It restores tracked files from HEAD and moves
 * untracked ones into `.dsh/zcode-undo/<timestamp>/` rather than deleting
 * them, so a mistaken undo is recoverable from the operator's own directory.
 * @module @dsh-portable/zcode-ui/client/chat/FileChanges
 */

import { useCallback, useMemo, useState } from 'react'
import { IconEditOutline16, IconRefreshOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import { DiffCount, Spinner } from '../shell/ui.tsx'
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

/** Split a path into its directory prefix and file name for two-tone display. */
function splitPath(path: string): { dir: string; name: string } {
  const normalized = path.split('\\').join('/')
  const index = normalized.lastIndexOf('/')
  return index === -1
    ? { dir: '', name: normalized }
    : { dir: normalized.slice(0, index + 1), name: normalized.slice(index + 1) }
}

/** Normalize a turn path to the repository-relative form used by git status. */
function relativePath(path: string, cwd: string | undefined): string {
  const normalized = path.split('\\').join('/').replace(/^\.\//, '')
  if (cwd === undefined) return normalized
  const root = cwd.split('\\').join('/').replace(/\/$/, '')
  return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized
}

/** Exact-match a turn path against a repository-relative status row. */
function countsFor(status: GitStatus | undefined, path: string, cwd: string | undefined): { insertions: number; deletions: number } {
  const normalized = relativePath(path, cwd)
  const row = status?.files.find(file => file.path.split('\\').join('/') === normalized)
  return { insertions: row?.insertions ?? 0, deletions: row?.deletions ?? 0 }
}

/** The turn's changed-file summary with its undo action. */
export function FileChanges({ paths, cwd, status, onOpenDiff, onChanged }: FileChangesProps) {
  const runtime = useRuntime()
  const t = useT()
  const [undoing, setUndoing] = useState(false)
  const [note, setNote] = useState<string | undefined>(undefined)

  const totals = useMemo(() => paths.reduce(
    (sum, path) => {
      const counts = countsFor(status, path, cwd)
      return { insertions: sum.insertions + counts.insertions, deletions: sum.deletions + counts.deletions }
    },
    { insertions: 0, deletions: 0 },
  ), [paths, status, cwd])

  const undo = useCallback(() => {
    if (cwd === undefined) return
    setUndoing(true)
    setNote(undefined)
    void runtime.git.undo(cwd, paths).then((result) => {
      setUndoing(false)
      if (!result.ok) {
        setNote(result.error.message)
        return
      }
      const reverted = result.value.outcomes.filter(outcome => outcome.result !== 'skipped')
      const quarantined = result.value.outcomes.filter(outcome => outcome.result === 'quarantined')
      setNote(quarantined.length === 0
        ? t('changes.undone', { count: reverted.length })
        : `${t('changes.undone', { count: reverted.length })} · ${quarantined.map(o => o.movedTo ?? o.path).join(', ')}`)
      onChanged()
    })
  }, [runtime, cwd, paths, onChanged, t])

  if (paths.length === 0) return null

  return (
    <section className={css.card}>
      <header className={css.head}>
        <span className={css.title}>{t('changes.count', { count: paths.length })}</span>
        <DiffCount insertions={totals.insertions} deletions={totals.deletions} />
        <button
          type="button"
          className={css.undo}
          disabled={undoing || cwd === undefined || !runtime.git.available}
          onClick={undo}
          title={t('changes.undo')}
        >
          {undoing ? <Spinner /> : <IconRefreshOutline14 />}
          {undoing ? t('changes.undoing') : t('changes.undo')}
        </button>
      </header>
      {paths.map((path) => {
        const { dir, name } = splitPath(path)
        const counts = countsFor(status, path, cwd)
        return (
          <button
            key={path}
            type="button"
            className={css.row}
            onClick={() => { onOpenDiff(path) }}
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
      {note === undefined ? null : <p className={css.note}>{note}</p>}
    </section>
  )
}
