/** Diff review for one working-tree file, in unified or side-by-side form. */
import { useMemo, useState } from 'react'
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { useT } from '../state/i18n.ts'
import { useRuntime } from '../state/runtime.ts'
import { useAsync } from '../state/hooks.ts'
import { CopyButton, EmptyState, IconButton, Spinner } from '../shell/ui.tsx'
import { parsePatch, type DiffLine } from './patch.ts'
import css from './DiffViewer.module.css'

export interface DiffViewerProps { readonly cwd: string; readonly path: string; readonly staged: boolean; readonly onClose: () => void }
interface DiffHunk { readonly header: DiffLine; readonly lines: readonly DiffLine[]; readonly patch: string }

function patchHunks(patch: string): readonly DiffHunk[] {
  const parsed = parsePatch(patch); const raw = patch.split('\n'); const first = raw.findIndex(line => line.startsWith('@@ '))
  if (first < 0) return []
  const prelude = raw.slice(0, first); const rawHunks: string[][] = []
  for (const line of raw.slice(first)) { if (line.startsWith('@@ ')) rawHunks.push([]); rawHunks.at(-1)?.push(line) }
  const hunks: DiffHunk[] = []; let current: { header: DiffLine; lines: DiffLine[] } | undefined
  for (const line of parsed) {
    if (line.kind === 'hunk') {
      if (current !== undefined) hunks.push({ ...current, patch: [...prelude, ...(rawHunks[hunks.length] ?? [])].join('\n') })
      current = { header: line, lines: [] }
    } else current?.lines.push(line)
  }
  if (current !== undefined) hunks.push({ ...current, patch: [...prelude, ...(rawHunks[hunks.length] ?? [])].join('\n') })
  return hunks
}

function DiffRow({ line }: { readonly line: DiffLine }) {
  return <div className={`${css.line} ${line.kind === 'add' ? css.added : ''} ${line.kind === 'remove' ? css.removed : ''} ${line.kind === 'meta' ? css.meta : ''}`}>
    <span className={css.gutter} aria-hidden><span className={css.lineNo}>{line.oldNo ?? ''}</span><span className={css.lineNo}>{line.newNo ?? ''}</span></span>
    <span className={css.sign} aria-hidden>{line.kind === 'add' ? '+' : line.kind === 'remove' ? '-' : ' '}</span><span className={css.text}>{line.text}</span>
  </div>
}

function splitRows(lines: readonly DiffLine[]): readonly { left?: DiffLine; right?: DiffLine }[] {
  const rows: Array<{ left?: DiffLine; right?: DiffLine }> = []
  for (let index = 0; index < lines.length;) {
    if (lines[index]?.kind !== 'remove' && lines[index]?.kind !== 'add') { const line = lines[index++]; if (line !== undefined) rows.push({ left: line, right: line }); continue }
    const removed: DiffLine[] = []; const added: DiffLine[] = []
    while (lines[index]?.kind === 'remove') removed.push(lines[index++] as DiffLine)
    while (lines[index]?.kind === 'add') added.push(lines[index++] as DiffLine)
    for (let offset = 0; offset < Math.max(removed.length, added.length); offset += 1) rows.push({ left: removed[offset], right: added[offset] })
  }
  return rows
}

function SplitHunk({ lines }: { readonly lines: readonly DiffLine[] }) {
  return <div className={css.splitGrid}>{splitRows(lines).map((row, index) => <div className={css.splitPair} key={index}>
    <div className={`${css.splitLine} ${row.left?.kind === 'remove' ? css.removed : ''}`}><span className={css.splitNo}>{row.left?.oldNo ?? ''}</span><span className={css.splitText}>{row.left?.text ?? ''}</span></div>
    <div className={`${css.splitLine} ${row.right?.kind === 'add' ? css.added : ''}`}><span className={css.splitNo}>{row.right?.newNo ?? ''}</span><span className={css.splitText}>{row.right?.text ?? ''}</span></div>
  </div>)}</div>
}

export function DiffViewer({ cwd, path, staged, onClose }: DiffViewerProps) {
  const runtime = useRuntime(); const t = useT(); const [mode, setMode] = useState<'unified' | 'split'>('unified')
  const [reverting, setReverting] = useState<string>(); const [note, setNote] = useState<string>()
  const diff = useAsync(async () => await runtime.git.diff(cwd, path, staged), [runtime, cwd, path, staged])
  const hunks = useMemo(() => diff.value?.ok === true ? patchHunks(diff.value.value.patch) : [], [diff.value])
  const pathParts = useMemo(() => path.split(/[\\/]/).filter(Boolean), [path])
  const revert = (hunk: DiffHunk): void => {
    if (reverting !== undefined) return
    setReverting(hunk.header.range); setNote(undefined)
    void runtime.git.undoHunk(cwd, path, hunk.patch, staged).then((result) => { if (!result.ok) setNote(result.error.message); else diff.reload() })
      .catch((cause: unknown) => { setNote(cause instanceof Error ? cause.message : String(cause)) }).finally(() => { setReverting(undefined) })
  }
  return <div className={css.viewer}>
    <div className={css.head}><nav className={css.breadcrumbs} title={path} aria-label={t('git.filePath')}>{pathParts.map((part, index) => <span className={css.crumb} key={`${String(index)}:${part}`}>{index === 0 ? null : <span className={css.separator} aria-hidden>/</span>}<bdi className={index === pathParts.length - 1 ? css.fileName : undefined}>{part}</bdi></span>)}</nav><CopyButton text={path} label={t('git.copyPath')} copiedLabel={t('git.pathCopied')} /><IconButton label={t('common.close')} onClick={onClose}><IconCloseOutline16 /></IconButton></div>
    <div className={css.reviewBar}>{diff.value?.ok === true ? <span className={css.diffSummary}><span className={css.summaryAdded}>+{diff.value.value.insertions}</span><span className={css.summaryRemoved}>-{diff.value.value.deletions}</span></span> : null}<span className={css.modeSwitch} role="group" aria-label={t('git.diffMode')}><button type="button" className={mode === 'unified' ? css.modeActive : ''} onClick={() => { setMode('unified') }}>{t('git.unified')}</button><button type="button" className={mode === 'split' ? css.modeActive : ''} onClick={() => { setMode('split') }}>{t('git.split')}</button></span></div>
    {diff.loading ? <EmptyState><Spinner /></EmptyState> : null}{diff.error !== undefined ? <EmptyState>{diff.error}</EmptyState> : null}{diff.value?.ok === false ? <EmptyState>{diff.value.error.message}</EmptyState> : null}{diff.value?.ok === true && diff.value.value.binary ? <EmptyState>{t('git.binary')}</EmptyState> : null}{diff.value?.ok === true && !diff.value.value.binary && hunks.length === 0 ? <EmptyState>{t('git.noDiff')}</EmptyState> : null}
    {hunks.length > 0 ? <div className={`${css.body} ${mode === 'split' ? css.splitBody : ''}`}>{hunks.map((hunk, index) => <section className={css.hunkBlock} key={`${hunk.header.range ?? ''}:${String(index)}`}><div className={`${css.line} ${css.hunk}`}><span className={css.range}>{hunk.header.range}</span><span className={css.section}>{hunk.header.section}</span><span className={css.hunkActions}><CopyButton text={hunk.patch} label={t('git.copyHunk')} copiedLabel={t('common.copied')} /><button type="button" disabled={reverting !== undefined} onClick={() => { revert(hunk) }}>{reverting === hunk.header.range ? t('git.revertingHunk') : t('git.revertHunk')}</button></span></div>{mode === 'unified' ? hunk.lines.map((line, lineIndex) => <DiffRow line={line} key={lineIndex} />) : <SplitHunk lines={hunk.lines} />}</section>)}</div> : null}
    {note === undefined ? null : <p className={css.errorNote} role="alert">{note}</p>}{diff.value?.ok === true && diff.value.value.truncated ? <p className={css.note}>{t('git.truncated')}</p> : null}
  </div>
}
