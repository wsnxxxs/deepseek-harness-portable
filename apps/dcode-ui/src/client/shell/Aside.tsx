/**
 * The floating right card: Git changes, Goal and Progress, command output, and
 * selected subagent details.
 *
 * Goal is the host-computed `goal` projection — the same value the official
 * goal bar renders — and Progress is the session's own todo list, folded from
 * the `todo_write` calls in the transcript. Neither is workbench state: close
 * the window and reopen it in the classic UI and the same facts are there.
 * @module @dsh-portable/dcode-ui/client/shell/Aside
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  IconChecklistOutline14, IconCheckOutline14, IconChevronRightOutline14, IconCloseOutline16,
  IconGoalOutline16, IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { TodoItem } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useChatSnapshot, useObservable, useProjectionValue, useTrajectorySnapshot } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import {
  adjacentAsideTab, orderedAsideTabs, useNavigation,
  type AsideTab, type NavigationStore, type TaskContext,
} from '../state/navigation.ts'
import { useRuntime } from '../state/runtime.ts'
import { GitPanel } from '../git/GitPanel.tsx'
import { DiffViewer } from '../git/DiffViewer.tsx'
import { Button, CopyButton, EmptyState, Pill, Spinner, ui } from './ui.tsx'
import { formatToolDuration, latestTodos, parseArgs, resultText, summarizeTool, toolDurationMs } from '../chat/tools.ts'
import { AnsiOutput, OutputToolbar } from '../chat/AnsiOutput.tsx'
import { stripAnsi } from '../chat/ansi.ts'
import { SubagentDetailPanel, SubagentsPanel, type SubagentChildEntry } from './AgentInspector.tsx'
import css from './Aside.module.css'

/** Props of the floating right card. */
export interface AsideProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
  readonly context: TaskContext
  readonly onOpenSubagentConversation: (parentSessionId: SessionId, entry: SubagentChildEntry) => void
}

/** The goal projection's shape, read structurally to avoid a package edge. */
interface GoalProjectionView {
  readonly goal: { readonly id: string; readonly revision: number; readonly objective: string; readonly phase: string }
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
  const runtime = useRuntime()
  const t = useT()
  const goal = useProjectionValue<GoalProjectionView | null>(sessionId, 'goal')
  const projectedTodos = useProjectionValue<readonly TodoItem[] | null>(sessionId, 'todos')
  const chat = useChatSnapshot(sessionId)
  const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat])
  const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? []
  const done = todos.filter(todo => todo.status === 'completed').length
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [goalBusy, setGoalBusy] = useState(false)
  const [goalError, setGoalError] = useState<string | undefined>()

  useEffect(() => {
    if (editingGoal && goal?.goal.objective !== undefined) setGoalDraft(goal.goal.objective)
  }, [editingGoal, goal?.goal.objective])

  const goals = runtime.goals
  const goalRef = goal == null ? undefined : { id: goal.goal.id, revision: goal.goal.revision }
  const goalActionDisabled = goalBusy || sessionId === undefined || goals === undefined || goalRef === undefined

  const runGoal = useCallback(async (action: () => Promise<{ ok: boolean; error?: { message: string } }>): Promise<void> => {
    if (goalBusy) return
    setGoalBusy(true)
    setGoalError(undefined)
    try {
      const result = await action()
      if (!result.ok) setGoalError(result.error?.message ?? t('common.error'))
      else setEditingGoal(false)
    } catch (cause: unknown) {
      setGoalError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setGoalBusy(false)
    }
  }, [goalBusy, t])

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
              {editingGoal
                ? (
                  <>
                    <textarea
                      className={css.goalInput}
                      rows={3}
                      value={goalDraft}
                      disabled={goalBusy}
                      aria-label={t('goal.edit')}
                      onChange={event => { setGoalDraft(event.target.value); setGoalError(undefined) }}
                      onKeyDown={event => {
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          setEditingGoal(false)
                        }
                      }}
                    />
                    <div className={css.goalActions}>
                      <Button disabled={goalActionDisabled || goalDraft.trim() === ''} onClick={() => {
                        const ref = goalRef
                        if (ref === undefined || goals === undefined || sessionId === undefined) return
                        void runGoal(() => goals.edit(sessionId, ref, { objective: goalDraft.trim() }))
                      }}>{t('common.save')}</Button>
                      <Button disabled={goalBusy} onClick={() => { setEditingGoal(false); setGoalError(undefined) }}>{t('common.cancel')}</Button>
                    </div>
                  </>
                )
                : (
                  <div className={css.goalText}>
                    {goal.goal.objective}
                    <div className={css.goalMeta}>
                      {done}/{todos.length || '—'} · {t('goal.rounds', { count: goal.roundsStarted })}
                    </div>
                  </div>
                )}
              {editingGoal ? null : (
                <div className={css.goalActions}>
                  {/* Pause and Resume are one seat showing whichever move the
                      goal's phase allows. Only Resume used to be here, which
                      left a running goal with no way to stop it from the panel
                      that owns it — the Host has offered `pause` all along. A
                      completed goal gets neither: there is nothing to suspend. */}
                  {goal.goal.phase === 'completed'
                    ? null
                    : (
                      <Button disabled={goalActionDisabled} onClick={() => {
                        if (goalRef === undefined || goals === undefined || sessionId === undefined) return
                        void runGoal(() => (goal.goal.phase === 'paused'
                          ? goals.resume(sessionId, goalRef)
                          : goals.pause(sessionId, goalRef)))
                      }}>{goal.goal.phase === 'paused' ? t('goal.resume') : t('goal.pause')}</Button>
                    )}
                  <Button disabled={goalActionDisabled} onClick={() => { setEditingGoal(true) }}>{t('goal.edit')}</Button>
                  <Button disabled={goalActionDisabled} onClick={() => {
                    if (goalRef === undefined || goals === undefined || sessionId === undefined) return
                    void runGoal(() => goals.clear(sessionId, goalRef))
                  }}>{t('goal.clear')}</Button>
                </div>
              )}
              {goalError === undefined ? null : <div className={css.goalError} role="alert">{goalError}</div>}
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

type CommandStatus = 'running' | 'success' | 'failed'

interface CommandExit {
  readonly output: string
  readonly label: string
  readonly failed: boolean
}

/** Recover the exit marker emitted by the shipped bash/pwsh tools. */
function commandExit(
  text: string,
  isError: boolean,
  defaultZero: boolean,
  background: boolean,
  t: ReturnType<typeof useT>,
): CommandExit {
  if (isError) return { output: text, label: t('aside.commandToolFailed'), failed: true }
  if (background) return { output: text, label: t('aside.commandBackground'), failed: false }
  const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text)
  if (signal?.[1] !== undefined) {
    return { output: text.slice(0, signal.index), label: t('aside.commandSignal', { signal: signal[1] }), failed: true }
  }
  const exit = /\n\[exit code: (\d+)\]$/.exec(text)
  if (exit?.[1] === undefined && !defaultZero) {
    return { output: text, label: t('aside.commandCompleted'), failed: false }
  }
  const code = exit?.[1] === undefined ? 0 : Number(exit[1])
  return {
    output: exit === null ? text : text.slice(0, exit.index),
    label: t('aside.commandExit', { code }),
    failed: code !== 0,
  }
}

/** One command invocation; it keeps its own disclosure and wrap preference. */
function CommandOutputEntry({ block, onLocated }: { block: ToolCallBlock; onLocated: () => void }) {
  const t = useT()
  const settled = 'isError' in block
  const name = settled ? block.call?.name ?? 'tool' : block.name
  const argsRaw = settled ? block.call?.argsRaw : block.argsRaw
  const summary = summarizeTool(name, argsRaw)
  const args = parseArgs(argsRaw)
  const commandArgument = [args.command, args.input, args.script]
    .find((value): value is string => typeof value === 'string' && value.trim() !== '')
  const command = commandArgument ?? (summary.detail || name)
  const result = settled
    ? commandExit(
        resultText(block.content),
        block.isError,
        name === 'bash' || name === 'pwsh' || name === 'powershell',
        args.run_in_background === true,
        t,
      )
    : { output: '', label: t('aside.commandPending'), failed: false }
  const status: CommandStatus = settled ? result.failed ? 'failed' : 'success' : 'running'
  const [open, setOpen] = useState(() => status === 'failed')
  const [wrap, setWrap] = useState(true)
  const contentId = useId()
  const startedAt = useRef(block.time)
  const [now, setNow] = useState(Date.now)
  const duration = settled ? toolDurationMs(block) : Math.max(0, now - startedAt.current)
  const plainOutput = stripAnsi(result.output.slice(0, 4096)).trim()
  const outputSummary = plainOutput === ''
    ? t('aside.commandNoOutput')
    : plainOutput.split(/\r?\n/, 1)[0]?.trim() || t('aside.commandNoOutput')

  useEffect(() => {
    if (settled) return undefined
    const timer = window.setInterval(() => { setNow(Date.now()) }, 1000)
    return () => { window.clearInterval(timer) }
  }, [settled])

  useEffect(() => {
    if (status === 'failed') setOpen(true)
  }, [status])

  const locate = (): void => {
    const target = [...document.querySelectorAll<HTMLElement>('[data-tool-call-id]')]
      .find(element => element.dataset.toolCallId === block.callId)
    if (target === undefined) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
    onLocated()
  }

  return (
    <article className={css.commandEntry} data-status={status}>
      <div className={css.commandEntryHead}>
        <button type="button" className={css.commandLocate} onClick={locate} title={t('aside.commandLocate')}>
          <span className={css.commandStatusIcon} aria-hidden>
            {status === 'running'
              ? <Spinner size="sm" />
              : status === 'failed' ? <IconWarningOutline16 /> : <IconCheckOutline14 size={16} />}
          </span>
          <span className={css.commandIdentity}>
            <code className={css.commandText} title={command}>{command}</code>
            <span className={css.commandSummary} title={outputSummary}>{outputSummary}</span>
          </span>
        </button>
        <CopyButton text={command} label={t('aside.commandCopy')} copiedLabel={t('common.copied')} />
        <button
          type="button"
          className={css.commandExpand}
          aria-expanded={open}
          aria-controls={contentId}
          aria-label={open ? t('aside.commandCollapse') : t('aside.commandExpand')}
          onClick={() => { setOpen(value => !value) }}
        >
          <IconChevronRightOutline14 className={open ? css.commandChevronOpen : undefined} />
        </button>
      </div>
      <div className={css.commandMeta} role="status">
        <span className={css.commandStatusText}>
          {status === 'running'
            ? t('aside.commandRunning')
            : status === 'failed' ? t('aside.commandFailed') : t('aside.commandSuccess')}
        </span>
        <span>{duration === undefined ? t('aside.commandDurationUnknown') : formatToolDuration(duration)}</span>
        <span>{result.label}</span>
      </div>
      {open
        ? (
          <div className={css.commandBody} id={contentId}>
            <div className={css.commandOutputHead}>
              <span>{t('details.output')}</span>
              {result.output === '' ? null : <OutputToolbar text={result.output} wrap={wrap} onWrap={setWrap} />}
            </div>
            {settled
              ? result.output === ''
                ? <EmptyState>{t('aside.commandNoOutput')}</EmptyState>
                : <AnsiOutput text={result.output} wrap={wrap} className={status === 'failed' ? css.commandFailedOutput : undefined} />
              : <EmptyState><Spinner size="sm" /> {t('aside.commandWaitingOutput')}</EmptyState>}
          </div>
        )
        : null}
    </article>
  )
}

/** Persistent per-invocation command output from the current session ledger. */
function CommandOutputPanel({ sessionId, onLocated }: { sessionId: SessionId | undefined; onLocated: () => void }) {
  const t = useT()
  const chat = useChatSnapshot(sessionId)
  const trajectory = useTrajectorySnapshot(sessionId)
  const commands = useMemo(() => {
    const nodes = trajectory === undefined || trajectory.eventNodes.length === 0
      ? chat?.legacy.nodes ?? []
      : trajectory.eventNodes
    const running = trajectory === undefined || trajectory.runningCalls.length === 0
      ? chat?.legacy.runningCalls ?? []
      : trajectory.runningCalls
    const calls: ToolCallBlock[] = []
    const seen = new Set<string>()
    const admit = (block: ToolCallBlock): void => {
      if (seen.has(block.callId)) return
      const name = 'isError' in block ? block.call?.name ?? '' : block.name
      const argsRaw = 'isError' in block ? block.call?.argsRaw : block.argsRaw
      if (summarizeTool(name, argsRaw).kind !== 'run') return
      seen.add(block.callId)
      calls.push(block)
    }
    for (const node of nodes) {
      if (node.kind !== 'tool-result') continue
      for (const block of walkCalls(node as ToolCallBlock)) admit(block)
    }
    for (const root of running) {
      for (const block of walkCalls(root)) admit(block)
    }
    return calls
  }, [chat, trajectory])

  return (
    <section className={`${css.section} ${css.commandOutputSection}`}>
      <header className={css.sectionHead}>
        <span className={ui.grow}>{t('aside.commandOutput')}</span>
        {commands.length === 0 ? null : <Pill>{commands.length}</Pill>}
      </header>
      {commands.length === 0
        ? <EmptyState>{t('aside.commandOutputEmpty')}</EmptyState>
        : <div className={css.commandList}>{commands.map(block => <CommandOutputEntry key={block.callId} block={block} onLocated={onLocated} />)}</div>}
    </section>
  )
}

/** The docked preview sidebar with its content views. */
export function Aside({ navigation, sessionId, cwd, context, onOpenSubagentConversation }: AsideProps) {
  const runtime = useRuntime()
  const t = useT()
  const state = useNavigation(navigation)
  const selectedPreset = useProjectionValue<string | null>(sessionId, 'agentPreset')
  // Cluster mode is an optional plugin, and the aside is the one place the
  // workbench offers it a seat. Observed rather than read once, so a plugin
  // that finishes loading after the workbench mounted still appears.
  const cluster = useObservable(runtime.cluster, undefined)
  const [selectedSubagent, setSelectedSubagent] = useState<SubagentChildEntry | undefined>()
  const tabPrefix = useId()
  const tabRefs = useRef<Record<AsideTab, HTMLButtonElement | null>>({ changes: null, terminal: null, goal: null })

  useEffect(() => { setSelectedSubagent(undefined) }, [sessionId])

  const labels: Record<AsideTab, string> = {
    changes: t('git.changes'),
    terminal: t('aside.commandOutput'),
    goal: t('aside.inspector'),
  }
  const tabOrder = orderedAsideTabs(context)
  const tabs = tabOrder.map(id => ({ id, label: labels[id] }))
  const panelId = `${tabPrefix}-panel`
  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next = event.key === 'Home'
      ? tabOrder[0]
      : event.key === 'End'
        ? tabOrder[tabOrder.length - 1]
        : adjacentAsideTab(tabs[index]?.id ?? state.aside, event.key === 'ArrowRight' ? 1 : -1, tabOrder)
    if (next === undefined) return
    navigation.openAside(next)
    tabRefs.current[next]?.focus()
  }

  return (
    <aside className={css.aside} aria-label={t('aside.title')}>
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
          style={{ transform: `translateX(${String(tabOrder.indexOf(state.aside) * 100)}%)` }}
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
            <div className={css.reviewLayout}>
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
            </div>
          )
          : null}
        {state.aside === 'terminal'
          ? <CommandOutputPanel sessionId={sessionId} onLocated={() => { navigation.closeCompactOverlay() }} />
          : null}
        {state.aside === 'goal'
          ? selectedSubagent === undefined || sessionId === undefined
            ? (
              <>
                {selectedPreset === 'crew' && cluster !== undefined
                  ? <cluster.Panel sessionId={sessionId} />
                  : null}
                <GoalPanel sessionId={sessionId} />
                <SubagentsPanel
                  sessionId={sessionId}
                  onSelect={setSelectedSubagent}
                />
              </>
            )
            : (
              <SubagentDetailPanel
                parentSessionId={sessionId}
                entry={selectedSubagent}
                navigation={navigation}
                onBack={() => { setSelectedSubagent(undefined) }}
                onOpenFull={() => { onOpenSubagentConversation(sessionId, selectedSubagent) }}
              />
            )
          : null}
      </div>
    </aside>
  )
}
