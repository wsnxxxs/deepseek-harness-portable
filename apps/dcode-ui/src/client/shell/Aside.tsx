/**
 * The floating right card: Git changes, Goal and Progress, and the details of
 * whatever the operator last clicked.
 *
 * Goal is the host-computed `goal` projection — the same value the official
 * goal bar renders — and Progress is the session's own todo list, folded from
 * the `todo_write` calls in the transcript. Neither is workbench state: close
 * the window and reopen it in the classic UI and the same facts are there.
 * @module @dsh-portable/dcode-ui/client/shell/Aside
 */

import { useId, useMemo, useRef, useState } from 'react'
import {
  IconChecklistOutline14, IconCheckOutline14, IconCloseOutline16, IconGoalOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationNode, ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { TodoItem } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useAsync, useChatSnapshot, useProjectionValue, useTrajectorySnapshot } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import {
  adjacentAsideTab, ASIDE_TABS, useNavigation,
  type AsideTab, type DiffTarget, type NavigationStore,
} from '../state/navigation.ts'
import { useRuntime } from '../state/runtime.ts'
import { GitPanel } from '../git/GitPanel.tsx'
import { DiffViewer } from '../git/DiffViewer.tsx'
import { EmptyState, Pill, Spinner, ui } from './ui.tsx'
import { latestTodos, resultText, summarizeTool } from '../chat/tools.ts'
import { AnsiOutput, OutputToolbar } from '../chat/AnsiOutput.tsx'
import css from './Aside.module.css'

/** Props of the floating right card. */
export interface AsideProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
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
/** Goal and Progress. */
function GoalPanel({ sessionId }: { sessionId: SessionId | undefined }) {
  const t = useT()
  const goal = useProjectionValue<GoalProjectionView | null>(sessionId, 'goal')
  const projectedTodos = useProjectionValue<readonly TodoItem[] | null>(sessionId, 'todos')
  const chat = useChatSnapshot(sessionId)
  const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat])
  const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? []
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
                {todo.status === 'completed'
                  ? <IconCheckOutline14 />
                  : todo.status === 'in_progress'
                    ? <span className={css.stepProgress} aria-hidden />
                    : <span className={css.stepPending} aria-hidden />}
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
  const trajectory = useTrajectorySnapshot(sessionId)
  const [wrap, setWrap] = useState(true)

  const block = useMemo(() => {
    if (callId === undefined) return undefined
    const nodes = trajectory === undefined || trajectory.eventNodes.length === 0
      ? chat?.legacy.nodes ?? []
      : trajectory.eventNodes
    for (const node of nodes) {
      if (node.kind !== 'tool-result') continue
      for (const candidate of walkCalls(node as ToolCallBlock)) {
        if (candidate.callId === callId) return candidate
      }
    }
    const runningCalls = trajectory === undefined || trajectory.runningCalls.length === 0
      ? chat?.legacy.runningCalls ?? []
      : trajectory.runningCalls
    for (const running of runningCalls) {
      for (const candidate of walkCalls(running)) {
        if (candidate.callId === callId) return candidate
      }
    }
    return undefined
  }, [chat, trajectory, callId])

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
          : <pre className={css.pre} tabIndex={0} role="region" aria-label={t('details.file')}>{currentFile.value.text}</pre>}
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
        <pre className={css.pre} tabIndex={0} role="region" aria-label={t('details.arguments')}>{argsRaw ?? '—'}</pre>
      </div>
      {settled
        ? (
          <div className={css.detailBlock}>
            <span className={css.detailRow}>
              <span className={css.detailLabel}>{t('details.output')}</span>
              {output === '' ? null : <OutputToolbar text={output} wrap={wrap} onWrap={setWrap} />}
            </span>
            {output === ''
              ? <pre className={css.pre} tabIndex={0} role="region" aria-label={t('details.output')}>—</pre>
              : <AnsiOutput text={output} wrap={wrap} />}
          </div>
        )
        : null}
    </section>
  )
}

/** The docked preview sidebar with its three content views. */
export function Aside({ navigation, sessionId, cwd }: AsideProps) {
  const t = useT()
  const state = useNavigation(navigation)
  const tabPrefix = useId()
  const tabRefs = useRef<Record<AsideTab, HTMLButtonElement | null>>({ changes: null, goal: null, details: null })

  const labels: Record<AsideTab, string> = {
    changes: t('git.changes'),
    goal: t('goal.title'),
    details: t('details.title'),
  }
  const tabs = ASIDE_TABS.map(id => ({ id, label: labels[id] }))
  const panelId = `${tabPrefix}-panel`
  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next = event.key === 'Home'
      ? ASIDE_TABS[0]
      : event.key === 'End'
        ? ASIDE_TABS[ASIDE_TABS.length - 1]
        : adjacentAsideTab(tabs[index]?.id ?? state.aside, event.key === 'ArrowRight' ? 1 : -1)
    if (next === undefined) return
    navigation.openAside(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <aside className={css.aside} aria-label={t('details.title')}>
      <header className={`${css.header} ${ui.cardHeader}`}>
        <span className={css.headerTitle}>{t('aside.title')}</span>
        <button
          type="button"
          className={css.headerClose}
          aria-label={t('aside.close')}
          onClick={() => { navigation.toggleAside() }}
        >
          <IconCloseOutline16 />
        </button>
      </header>
      <div className={css.tabs} role="tablist" aria-label={t('aside.title')}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={element => { tabRefs.current[tab.id] = element }}
            type="button"
            role="tab"
            id={`${tabPrefix}-${tab.id}`}
            aria-selected={state.aside === tab.id}
            aria-controls={panelId}
            tabIndex={state.aside === tab.id ? 0 : -1}
            className={`${css.tab} ${state.aside === tab.id ? css.tabActive : ''}`}
            onClick={() => { navigation.openAside(tab.id) }}
            onKeyDown={event => { moveTab(event, index) }}
          >
            {tab.label}
          </button>
        ))}
        <span
          className={css.tabIndicator}
          style={{ transform: `translateX(${String(ASIDE_TABS.indexOf(state.aside) * 100)}%)` }}
          aria-hidden
        />
      </div>
      <div
        id={panelId}
        className={css.body}
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={`${tabPrefix}-${state.aside}`}
        aria-label={tabs.find(tab => tab.id === state.aside)?.label}
      >
        {state.aside === 'changes'
          ? (
            <>
              <GitPanel
                cwd={cwd}
                sessionId={sessionId}
                selected={state.diff}
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
