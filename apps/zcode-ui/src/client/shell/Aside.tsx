/**
 * The right column: Git changes, Goal and Progress, and the details of
 * whatever the operator last clicked.
 *
 * Goal is the host-computed `goal` projection — the same value the official
 * goal bar renders — and Progress is the session's own todo list, folded from
 * the `todo_write` calls in the transcript. Neither is workbench state: close
 * the window and reopen it in the classic UI and the same facts are there.
 * @module @dsh-portable/zcode-ui/client/shell/Aside
 */

import { useMemo, useState } from 'react'
import {
  IconChecklistOutline14, IconCheckOutline14, IconGoalOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationNode, ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import { useAsync, useChatSnapshot, useProjectionValue } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useNavigation, type AsideTab, type DiffTarget, type NavigationStore } from '../state/navigation.ts'
import { useRuntime } from '../state/runtime.ts'
import { GitPanel } from '../git/GitPanel.tsx'
import { DiffViewer } from '../git/DiffViewer.tsx'
import { EmptyState, Pill, Spinner, ui } from './ui.tsx'
import { parseArgs, resultText, summarizeTool } from '../chat/tools.ts'
import { AnsiOutput, OutputToolbar } from '../chat/AnsiOutput.tsx'
import css from './Aside.module.css'

/** Props of the right column. */
export interface AsideProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
}

/** One todo row, as the `todo_write` tool records it. */
interface TodoRow {
  readonly content: string
  readonly status: 'pending' | 'in_progress' | 'completed'
}

/** The goal projection's shape, read structurally to avoid a package edge. */
interface GoalProjectionView {
  readonly goal: { readonly objective: string; readonly phase: string }
  readonly roundsStarted: number
  readonly updatedAt: number
}

/** Walk a tool block and its children depth-first. */
function* walkCalls(block: ToolCallBlock): Generator<ToolCallBlock> {
  yield block
  for (const child of block.subCalls) yield* walkCalls(child)
}

/**
 * The session's current plan: the newest `todo_write` argument list.
 *
 * Reading the arguments rather than the result is deliberate — the tool
 * records the whole list on every write, so the last call is the whole plan
 * even when earlier ones fell outside the loaded history window.
 */
function latestTodos(nodes: readonly ConversationNode[]): readonly TodoRow[] {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index]
    if (node?.kind !== 'tool-result') continue
    for (const block of walkCalls(node as ToolCallBlock)) {
      const name = 'isError' in block ? block.call?.name : block.name
      if (name !== 'todo_write') continue
      const argsRaw = 'isError' in block ? block.call?.argsRaw : block.argsRaw
      const todos = parseArgs(argsRaw).todos
      if (!Array.isArray(todos)) continue
      return todos.filter((row): row is TodoRow =>
        typeof row === 'object' && row !== null
        && typeof (row as TodoRow).content === 'string')
    }
  }
  return []
}

/** Goal and Progress. */
function GoalPanel({ sessionId }: { sessionId: SessionId | undefined }) {
  const t = useT()
  const goal = useProjectionValue<GoalProjectionView | null>(sessionId, 'goal')
  const chat = useChatSnapshot(sessionId)
  const todos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat])
  const done = todos.filter(todo => todo.status === 'completed').length

  return (
    <>
      <section className={css.section}>
        <header className={css.sectionHead}>
          <IconGoalOutline16 />
          <span className={ui.grow}>{t('goal.title')}</span>
          {goal == null
            ? null
            : (
              <Pill>
                {goal.goal.phase === 'completed'
                  ? t('goal.complete')
                  : goal.goal.phase === 'paused' ? t('goal.paused') : t('goal.active')}
              </Pill>
            )}
        </header>
        {goal == null
          ? <EmptyState>{t('goal.none')}</EmptyState>
          : (
            <div className={css.goal}>
              <div className={css.goalText}>
                {goal.goal.objective}
                <div className={css.goalMeta}>
                  {done}/{todos.length || '—'} · {goal.roundsStarted} rounds
                </div>
              </div>
            </div>
          )}
      </section>

      <section className={css.section}>
        <header className={css.sectionHead}>
          <IconChecklistOutline14 />
          <span className={ui.grow}>{t('progress.title')}</span>
          {todos.length === 0 ? null : <Pill>{done}/{todos.length}</Pill>}
        </header>
        {todos.length === 0
          ? <EmptyState>{t('progress.none')}</EmptyState>
          : todos.map((todo, index) => (
            <div
              key={`${String(index)}:${todo.content}`}
              className={`${css.step} ${todo.status === 'completed' ? css.stepDone : ''} ${todo.status === 'in_progress' ? css.stepActive : ''}`}
            >
              <span className={`${css.stepMark} ${todo.status === 'completed' ? css.stepMarkDone : ''}`} aria-hidden>
                {todo.status === 'completed' ? <IconCheckOutline14 /> : todo.status === 'in_progress' ? '◐' : '○'}
              </span>
              <span>{todo.content}</span>
            </div>
          ))}
      </section>
    </>
  )
}

/** Arguments and output of the tool call the operator last opened. */
function DetailsPanel({
  sessionId,
  callId,
  cwd,
  diff,
}: {
  sessionId: SessionId | undefined
  callId: string | undefined
  cwd: string | undefined
  diff: DiffTarget | undefined
}) {
  const runtime = useRuntime()
  const t = useT()
  const chat = useChatSnapshot(sessionId)
  const [wrap, setWrap] = useState(true)

  const block = useMemo(() => {
    if (callId === undefined) return undefined
    for (const node of chat?.legacy.nodes ?? []) {
      if (node.kind !== 'tool-result') continue
      for (const candidate of walkCalls(node as ToolCallBlock)) {
        if (candidate.callId === callId) return candidate
      }
    }
    for (const running of chat?.legacy.runningCalls ?? []) {
      for (const candidate of walkCalls(running)) {
        if (candidate.callId === callId) return candidate
      }
    }
    return undefined
  }, [chat, callId])

  const filePath = block === undefined ? diff?.path : undefined
  const fileRead = useAsync(
    async () => {
      if (cwd === undefined || filePath === undefined) return undefined
      return {
        cwd,
        path: filePath,
        result: await runtime.git.readFile(cwd, filePath),
      }
    },
    [runtime, cwd, filePath],
  )
  // Keep a previous file from appearing while a changed target is loading.
  const loadedFile = fileRead.value
  const currentFile = loadedFile !== undefined && loadedFile.cwd === cwd && loadedFile.path === filePath
    ? loadedFile.result
    : undefined

  if (block === undefined) {
    if (diff === undefined) return <EmptyState>{t('details.none')}</EmptyState>
    if (fileRead.loading) return <EmptyState><Spinner /></EmptyState>
    if (fileRead.error !== undefined) return <EmptyState>{fileRead.error}</EmptyState>
    if (currentFile === undefined) return <EmptyState>{t('common.error')}</EmptyState>
    if (currentFile.ok === false) return <EmptyState>{currentFile.error.message || t('common.error')}</EmptyState>

    return (
      <section className={css.section}>
        <header className={css.sectionHead}>
          <span className={ui.grow}>{t('details.file')}</span>
          <span className={css.fileMeta}>{currentFile.value.size} B</span>
        </header>
        <div className={css.filePath} title={currentFile.value.path}><bdi>{currentFile.value.path}</bdi></div>
        <div className={css.fileMeta}>
          {currentFile.value.binary ? <Pill>{t('git.binary')}</Pill> : null}
          {currentFile.value.truncated ? <Pill>{t('git.truncated')}</Pill> : null}
        </div>
        {currentFile.value.binary
          ? <EmptyState>{t('git.binary')}</EmptyState>
          : <pre className={css.pre}>{currentFile.value.text}</pre>}
      </section>
    )
  }

  const settled = 'isError' in block
  const name = settled ? block.call?.name ?? 'tool' : block.name
  const argsRaw = settled ? block.call?.argsRaw : block.argsRaw
  const summary = summarizeTool(name, argsRaw)
  const output = settled ? resultText(block.content) : ''

  return (
    <section className={css.section}>
      <header className={css.sectionHead}>
        <span className={ui.grow}>{name}</span>
        <Pill>{summary.kind}</Pill>
      </header>
      <div className={css.detailBlock}>
        <span className={css.detailLabel}>{t('details.arguments')}</span>
        <pre className={css.pre}>{argsRaw ?? '—'}</pre>
      </div>
      {settled
        ? (
          <div className={css.detailBlock}>
            <span className={css.detailRow}>
              <span className={css.detailLabel}>{t('details.output')}</span>
              {output === '' ? null : <OutputToolbar text={output} wrap={wrap} onWrap={setWrap} />}
            </span>
            {output === ''
              ? <pre className={css.pre}>—</pre>
              : <AnsiOutput text={output} wrap={wrap} />}
          </div>
        )
        : null}
    </section>
  )
}

/** The right column with its three tabs. */
export function Aside({ navigation, sessionId, cwd }: AsideProps) {
  const t = useT()
  const state = useNavigation(navigation)

  const tabs: readonly { id: AsideTab; label: string }[] = [
    { id: 'changes', label: t('git.changes') },
    { id: 'goal', label: t('goal.title') },
    { id: 'details', label: t('details.title') },
  ]

  return (
    <aside className={css.aside} aria-label={t('details.title')}>
      <div className={css.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`${css.tab} ${state.aside === tab.id ? css.tabActive : ''}`}
            onClick={() => { navigation.openAside(tab.id) }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={css.body}>
        {state.aside === 'changes'
          ? (
            <>
              <GitPanel
                cwd={cwd}
                sessionId={sessionId}
                selected={state.diff?.path}
                onOpenDiff={(path, staged) => { navigation.openDiff(path, staged) }}
              />
              {state.diff === undefined || cwd === undefined
                ? null
                : (
                  <DiffViewer
                    cwd={cwd}
                    path={state.diff.path}
                    staged={state.diff.staged}
                    onClose={() => { navigation.closeDiff() }}
                  />
                )}
            </>
          )
          : null}
        {state.aside === 'goal' ? <GoalPanel sessionId={sessionId} /> : null}
        {state.aside === 'details'
          ? <DetailsPanel sessionId={sessionId} callId={state.inspectedCallId} cwd={cwd} diff={state.diff} />
          : null}
      </div>
    </aside>
  )
}
