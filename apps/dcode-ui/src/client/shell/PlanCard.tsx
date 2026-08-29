/** The compact live plan card shown above the composer. */

import { useId, useMemo, useState } from 'react'
import {
  IconCheckOutline14, IconChevronDownOutline14, IconChevronRightOutline14,
  IconChecklistOutline14, IconListPenOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { TodoItem } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useChatSnapshot, useProjectionValue, useTrajectorySnapshot } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { Translate } from '../locales.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { EMPTY_TRAJECTORY_SNAPSHOT } from '../state/runtime.ts'
import { latestTodos } from '../chat/tools.ts'
import { Spinner, ui } from './ui.tsx'
import css from './PlanCard.module.css'

export interface PlanCardProps {
  readonly sessionId: SessionId | undefined
  /** Top-bar controlled visibility of the pinned summary. */
  readonly open?: boolean
  /** Opens the real tool detail when a trace row is selected. */
  readonly navigation?: NavigationStore
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

function StatusMark({ status }: { status: TodoItem['status'] }) {
  if (status === 'completed') {
    return <span className={`${css.mark} ${css.markDone}`} aria-hidden><IconCheckOutline14 /></span>
  }
  if (status === 'in_progress') {
    return <span className={`${css.mark} ${css.markActive}`} aria-hidden><Spinner size="sm" /></span>
  }
  return <span className={`${css.mark} ${css.markPending}`} aria-hidden />
}

/** Render the current `todos` projection with a transcript replay fallback. */
export function PlanCard({ sessionId, open = true, navigation }: PlanCardProps) {
  const t = useT()
  const projectedTodos = useProjectionValue<readonly TodoItem[] | null>(sessionId, 'todos')
  const chat = useChatSnapshot(sessionId)
  const trajectory = useTrajectorySnapshot(sessionId)
  const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat])
  const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? []
  const traceRows = useMemo(
    () => buildTraceRows(trajectory ?? EMPTY_TRAJECTORY_SNAPSHOT, t),
    [trajectory, t],
  )
  const [collapsed, setCollapsed] = useState(false)
  const contentId = useId()

  if (!open || (todos.length === 0 && traceRows.length === 0)) return null

  const completed = todos.filter(todo => todo.status === 'completed').length
  const running = trajectory?.runningCalls.length ?? 0
  return (
    <div className={css.dock}>
      <section className={css.card} data-testid="dcode-plan-card" aria-label={todos.length > 0 ? t('plan.title') : t('trace.title')}>
        <button
          type="button"
          className={`${css.header} ${ui.cardHeader}`}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => { setCollapsed(value => !value) }}
        >
          <span className={css.icon} aria-hidden><IconChecklistOutline14 size={16} /></span>
          <span className={css.title}>{todos.length > 0 ? t('plan.title') : t('trace.title')}</span>
          <span className={css.progress}>
            {todos.length > 0
              ? t('plan.progress', { done: completed, total: todos.length })
              : t('trace.stats', { events: trajectory?.eventNodes.length ?? 0, requests: trajectory?.requests.length ?? 0 })}
          </span>
          <span className={css.chevron} aria-hidden>
            {collapsed ? <IconChevronRightOutline14 /> : <IconChevronDownOutline14 />}
          </span>
        </button>
        {!collapsed ? <div id={contentId}>
          {todos.length > 0
          ? (
            <ul className={css.list}>
              {todos.map((todo, index) => (
                <li key={`${String(index)}:${todo.content}`} className={css.item} data-status={todo.status}>
                  <StatusMark status={todo.status} />
                  <span className={css.content}>{todo.content}</span>
                </li>
              ))}
            </ul>
          )
          : null}
        {!collapsed && traceRows.length > 0
          ? (
            <section className={css.trace} aria-label={t('trace.title')}>
              <div className={css.traceHeader}>
                <span className={css.traceTitle}><IconListPenOutline16 size={14} />{t('trace.title')}</span>
                <span className={css.traceStats}>
                  {t('trace.stats', { events: trajectory?.eventNodes.length ?? 0, requests: trajectory?.requests.length ?? 0 })}
                  {running > 0 ? ` · ${t('trace.runningCount', { count: running })}` : ''}
                </span>
              </div>
              <ul className={css.traceList}>
                {traceRows.map(row => (
                  <li key={row.id} className={css.traceItem} data-status={row.status}>
                    {row.callId === undefined || navigation === undefined
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
                          onClick={() => { navigation.inspect(row.callId) }}
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
          )
          : null}
        </div> : null}
      </section>
    </div>
  )
}
