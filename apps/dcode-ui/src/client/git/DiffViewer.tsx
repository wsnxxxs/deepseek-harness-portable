/**
 * Unified-diff viewer for one working-tree file.
 *
 * The patch comes from git itself, so what the panel shows is exactly what a
 * commit would record. Rendering is line-based rather than word-based: at the
 * width of a side panel a word-level diff is noise, and the old/new line
 * numbers are the thing an operator actually cross-references against an
 * editor. The patch reader itself lives in {@link module:.../git/patch}.
 * @module @dsh-portable/dcode-ui/client/git/DiffViewer
 */

import { useMemo } from 'react'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { useT } from '../state/i18n.ts'
import { useRuntime } from '../state/runtime.ts'
import { useAsync } from '../state/hooks.ts'
import { DiffCount, EmptyState, IconButton, Spinner } from '../shell/ui.tsx'
import { parsePatch } from './patch.ts'
import css from './DiffViewer.module.css'

/** Props of the diff viewer. */
export interface DiffViewerProps {
  readonly cwd: string
  readonly path: string
  readonly staged: boolean
  readonly onClose: () => void
}

/** One file's diff, read on demand. */
export function DiffViewer({ cwd, path, staged, onClose }: DiffViewerProps) {
  const runtime = useRuntime()
  const t = useT()
  const { value, loading, error } = useAsync(
    async () => await runtime.git.diff(cwd, path, staged),
    [runtime, cwd, path, staged],
  )

  const lines = useMemo(
    () => (value?.ok === true ? parsePatch(value.value.patch) : []),
    [value],
  )

  return (
    <div className={css.viewer}>
      <div className={css.head}>
        <span className={css.path} title={path}><bdi>{path}</bdi></span>
        {value?.ok === true
          ? <DiffCount insertions={value.value.insertions} deletions={value.value.deletions} />
          : null}
        <IconButton label={t('common.close')} onClick={onClose}>
          <IconCloseOutline16 />
        </IconButton>
      </div>

      {loading ? <EmptyState><Spinner /></EmptyState> : null}
      {error !== undefined ? <EmptyState>{error}</EmptyState> : null}
      {value?.ok === false ? <EmptyState>{value.error.message}</EmptyState> : null}
      {value?.ok === true && value.value.binary ? <EmptyState>{t('git.binary')}</EmptyState> : null}
      {value?.ok === true && !value.value.binary && lines.length === 0
        ? <EmptyState>{t('git.noDiff')}</EmptyState>
        : null}

      {lines.length === 0
        ? null
        : (
          <div className={css.body}>
            {lines.map((line, index) => (line.kind === 'hunk'
              ? (
                <div className={`${css.line} ${css.hunk}`} key={index}>
                  <span className={css.range}>{line.range}</span>
                  {line.section === undefined || line.section === ''
                    ? null
                    : <span className={css.section}>{line.section}</span>}
                </div>
              )
              : (
                <div
                  key={index}
                  className={`${css.line} ${line.kind === 'add' ? css.added : ''} ${line.kind === 'remove' ? css.removed : ''} ${line.kind === 'meta' ? css.meta : ''}`}
                >
                  {/* Numbers and sign are furniture, not content: a copy of a
                      selected range must paste as source, not as a diff. */}
                  <span className={css.gutter} aria-hidden>
                    <span className={css.lineNo}>{line.oldNo ?? ''}</span>
                    <span className={css.lineNo}>{line.newNo ?? ''}</span>
                  </span>
                  <span className={css.sign} aria-hidden>
                    {line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}
                  </span>
                  <span className={css.text}>{line.text}</span>
                </div>
              )))}
          </div>
        )}

      {value?.ok === true && value.value.truncated
        ? <p className={css.note}>{t('git.truncated')}</p>
        : null}
    </div>
  )
}
