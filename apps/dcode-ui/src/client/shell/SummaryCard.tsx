/**
 * The environment summary: what this task is working on, at a glance.
 *
 * A card the top bar summons and dismisses, anchored under its own control at
 * the right of the conversation column — deliberately not the preview
 * sidebar, which is where the same facts are worked rather than read. Every
 * environment row is the digest of one panel and opens it: the change counts
 * open Changes, the goal opens Goal. Recent trace activity follows those rows
 * so it stays available without occupying a second floating card.
 *
 * Nothing here is state of its own. The counts come from the same git read
 * the Changes panel uses, the goal from the host projection the official goal
 * bar renders, and the workspace from the durable registry.
 * @module @dsh-portable/dcode-ui/client/shell/SummaryCard
 */

import { useEffect, useMemo, useRef } from 'react'
import {
  IconBranchOutline16, IconChecklistOutline14, IconChevronRightOutline14, IconCodeOutline16,
  IconCloseOutline16, IconFolderOpenOutline16, IconGoalOutline16, IconListPenOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TodoItem } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client'
import { useChatSnapshot, useProjectionValue, useTrajectorySnapshot, useWorkspaceGroups } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { Translate } from '../locales.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { EMPTY_TRAJECTORY_SNAPSHOT } from '../state/runtime.ts'
import { useGitStatus } from '../git/useGit.ts'
import { latestTodos } from '../chat/tools.ts'
import { ui } from './ui.tsx'
import { useModalFocus } from './use-modal-focus.ts'
import css from './SummaryCard.module.css'

/** Props of the summary card. */
export interface SummaryCardProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
  /** Top-bar controlled visibility. */
  readonly open: boolean
  /** Compact summaries are modal bottom sheets rather than anchored cards. */
  readonly compact: boolean
}

/** The goal projection's shape, read structurally to avoid a package edge. */
interface GoalProjectionView {
  readonly goal: { readonly objective: string; readonly phase: string }
}

type TraceStatus = 'running' | 'done' | 'failed'

interface TraceRow {
  readonly id: string
  readonly label: string
  readonly detail?: string
  readonly callId?: string
  readonly status?: TraceStatus
}

/** Build the small trace ledger from the same snapshot as DSH's full view. */
function buildTraceRows(snapshot: TrajectorySnapshot, t: Translate): readonly TraceRow[] {
  const rows: TraceRow[] = snapshot.eventNodes.map((node) => {
    switch (node.kind) {
      case 'user':
        return { id: `event:${node.seq}`, label: t('trace.user') }
      case 'assistant': {
        const call = node.blocks.find(block => block.kind === 'tool-call')
        return {
          id: `event:${node.seq}`,
          label: call?.kind === 'tool-call' ? call.name : t('trace.assistant'),
          callId: call?.kind === 'tool-call' ? call.callId : undefined,
        }
      }
      case 'steering':
        return { id: `event:${node.seq}`, label: t('trace.steering') }
      case 'context':
        return { id: `event:${node.seq}`, label: t('trace.context') }
      case 'model-retry':
        return { id: `event:${node.seq}`, label: t('trace.retry'), detail: node.retryState }
      case 'turn-error':
        return { id: `event:${node.seq}`, label: t('trace.error'), detail: node.message, status: 'failed' }
      case 'turn-max-tokens':
        return { id: `event:${node.seq}`, label: t('trace.limit') }
      case 'tool-result':
        return {
          id: `event:${node.seq}`,
          label: node.call?.name ?? t('trace.tool'),
          detail: node.isError ? t('trace.failed') : t('trace.done'),
          callId: node.callId,
          status: node.isError ? 'failed' : 'done',
        }
      case 'command':
        return {
          id: `event:${node.seq}`,
          label: node.name ?? t('trace.command'),
          detail: node.outcome?.kind === 'error' ? t('trace.failed') : node.outcome === null ? t('trace.active') : t('trace.done'),
          status: node.outcome?.kind === 'error' ? 'failed' : node.outcome === null ? 'running' : 'done',
        }
      case 'compaction':
        return { id: `event:${node.seq}`, label: t('trace.compaction') }
      case 'unknown':
        return { id: `event:${node.seq}`, label: node.type || t('trace.unknown') }
    }
  })

  const seenCalls = new Set(rows.flatMap(row => row.callId === undefined ? [] : [row.callId]))
  for (const call of snapshot.runningCalls) {
    if (seenCalls.has(call.callId)) continue
    rows.push({
      id: `running:${call.callId}`,
      label: call.name,
      detail: t('trace.active'),
      callId: call.callId,
      status: 'running',
    })
  }
  if (snapshot.partial !== null) {
    rows.push({ id: 'partial', label: t('trace.assistant'), detail: t('trace.active'), status: 'running' })
  }
  return rows.slice(-8)
}

/** One digest line: an icon, what it is, and the value it stands for. */
function Row(props: {
  icon: ReactNode
  label: string
  value: ReactNode
  title?: string
  ariaLabel?: string
  onOpen?: () => void
}) {
  const body = (
    <>
      <span className={css.rowIcon} aria-hidden>{props.icon}</span>
      <span className={css.rowLabel}>{props.label}</span>
      <span className={css.rowValue}>{props.value}</span>
      {props.onOpen === undefined
        ? null
        : <span className={css.rowChevron} aria-hidden><IconChevronRightOutline14 /></span>}
    </>
  )
  if (props.onOpen === undefined) {
    return <div className={css.row} title={props.title} role={props.ariaLabel === undefined ? undefined : 'note'} tabIndex={props.ariaLabel === undefined ? undefined : 0} aria-label={props.ariaLabel}>{body}</div>
  }
  return (
    <button type="button" className={`${css.row} ${css.rowAction}`} title={props.title} onClick={props.onOpen}>
      {body}
    </button>
  )
}

/** The environment digest, or null while the top bar keeps it closed. */
export function SummaryCard({ navigation, sessionId, cwd, open, compact }: SummaryCardProps) {
  const cardRef = useRef<HTMLElement>(null)
  const t = useT()
  const { groups } = useWorkspaceGroups()
  const git = useGitStatus(cwd, sessionId)
  const goal = useProjectionValue<GoalProjectionView | null>(sessionId, 'goal')
  const projectedTodos = useProjectionValue<readonly TodoItem[] | null>(sessionId, 'todos')
  const chat = useChatSnapshot(sessionId)
  const trajectory = useTrajectorySnapshot(sessionId)
  const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat])
  const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? []
  const traceRows = useMemo(
    () => buildTraceRows(trajectory ?? EMPTY_TRAJECTORY_SNAPSHOT, t),
    [trajectory, t],
  )

  const workspace = useMemo(
    () => groups.find(group => group.path === cwd)
      ?? groups.find(group => group.sessions.some(row => row.id === sessionId)),
    [groups, cwd, sessionId],
  )

  useModalFocus(open && compact, cardRef, { onClose: () => { navigation.toggleSummary(false) } })

  useEffect(() => {
    if (!open || compact) return undefined

    const onDocumentPointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (target instanceof Node && cardRef.current?.contains(target) === true) return
      if (target instanceof Element
        && target.closest('[data-dcode-focus-target="summary"]') !== null) return
      navigation.toggleSummary(false)
    }
    const onDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      navigation.toggleSummary(false)
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[data-dcode-focus-target="summary"]')?.focus()
      })
    }

    document.addEventListener('pointerdown', onDocumentPointerDown)
    document.addEventListener('keydown', onDocumentKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onDocumentPointerDown)
      document.removeEventListener('keydown', onDocumentKeyDown, true)
    }
  }, [compact, navigation, open])

  if (!open) return null

  const status = git.status
  const repository = status?.repository === true
  const dirty = (status?.files.length ?? 0) > 0
  const done = todos.filter(todo => todo.status === 'completed').length
  const objective = goal?.goal.objective
  const running = trajectory?.runningCalls.length ?? 0

  return (
    <section
      ref={cardRef}
      className={css.card}
      aria-label={t('summary.title')}
      aria-modal={compact ? true : undefined}
      role={compact ? 'dialog' : undefined}
      tabIndex={compact ? -1 : undefined}
    >
      <header className={`${css.header} ${ui.cardHeader}`}>
        <span className={css.title}>{t('summary.title')}</span>
        <button
          type="button"
          className={css.close}
          aria-label={t('summary.close')}
          onClick={() => { navigation.toggleSummary(false) }}
        >
          <IconCloseOutline16 />
        </button>
      </header>

      {workspace === undefined && !repository
        ? <p className={css.empty}>{t('chat.empty.noWorkspace')}</p>
        : (
          <div className={css.rows}>
            <Row
              icon={<IconCodeOutline16 />}
              label={t('git.changes')}
              title={t('summary.openChanges')}
              value={!repository
                ? <span className={css.muted}>{t('top.noRepository')}</span>
                : dirty
                  ? (
                    <span className={css.counts}>
                      <span className={css.added}>+{status?.insertions ?? 0}</span>
                      <span className={css.removed}>-{status?.deletions ?? 0}</span>
                    </span>
                  )
                  : <span className={css.muted}>{t('git.clean')}</span>}
              onOpen={() => { navigation.openAside('changes') }}
            />
            {workspace === undefined
              ? null
              : (
                <Row
                  icon={<IconFolderOpenOutline16 />}
                  label={t('summary.local')}
                  title={workspace.path}
                  ariaLabel={workspace.path}
                  value={<span className={css.truncate}>{workspace.title}</span>}
                />
              )}
            {!repository
              ? null
              : (
                <Row
                  icon={<IconBranchOutline16 />}
                  label={t('top.branch')}
                  value={(
                    <span className={css.truncate}>
                      {status?.branch ?? (status?.detached === true ? 'HEAD' : t('top.branch'))}
                    </span>
                  )}
                />
              )}
            {objective === undefined || objective === ''
              ? null
              : (
                <Row
                  icon={<IconGoalOutline16 />}
                  label={t('goal.title')}
                  title={objective}
                  value={<span className={css.truncate}>{objective}</span>}
                  onOpen={() => { navigation.openAside('goal') }}
                />
              )}
            {todos.length === 0
              ? null
              : (
                <Row
                  icon={<IconChecklistOutline14 size={16} />}
                  label={t('plan.title')}
                  value={t('plan.progress', { done, total: todos.length })}
                  onOpen={() => { navigation.openAside('goal') }}
                />
              )}
          </div>
        )}
      {traceRows.length === 0
        ? null
        : (
          <section className={css.trace} aria-label={t('trace.title')}>
            <div className={css.traceHeader}>
              <span className={css.traceTitle}><IconListPenOutline16 size={14} />{t('trace.title')}</span>
              <span className={css.traceStats}>
                {t('trace.stats', {
                  events: trajectory?.eventNodes.length ?? 0,
                  requests: trajectory?.requests.length ?? 0,
                })}
                {running > 0 ? ` · ${t('trace.runningCount', { count: running })}` : ''}
              </span>
            </div>
            <ul className={css.traceList}>
              {traceRows.map(row => (
                <li key={row.id} className={css.traceItem} data-status={row.status}>
                  {row.callId === undefined
                    ? (
                      <div className={css.traceRow}>
                        <span className={css.traceDot} aria-hidden />
                        <span className={css.traceLabel}>{row.label}</span>
                        {row.detail === undefined ? null : <span className={css.traceDetail}>{row.detail}</span>}
                      </div>
                    )
                    : (
                      <button
                        type="button"
                        className={css.traceRow}
                        title={t('trace.inspect')}
                        onClick={() => {
                          navigation.toggleSummary(false)
                          navigation.inspect(row.callId)
                        }}
                      >
                        <span className={css.traceDot} aria-hidden />
                        <span className={css.traceLabel}>{row.label}</span>
                        {row.detail === undefined ? null : <span className={css.traceDetail}>{row.detail}</span>}
                      </button>
                    )}
                </li>
              ))}
            </ul>
          </section>
        )}
    </section>
  )
}
