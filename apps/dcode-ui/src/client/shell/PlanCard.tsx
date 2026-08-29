/** The compact live plan card shown above the composer. */

import { useId, useMemo, useState } from 'react'
import {
  IconCheckOutline14, IconChevronDownOutline14, IconChevronRightOutline14,
  IconChecklistOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { TodoItem } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useChatSnapshot, useProjectionValue } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { latestTodos } from '../chat/tools.ts'
import { Spinner, ui } from './ui.tsx'
import css from './PlanCard.module.css'

export interface PlanCardProps {
  readonly sessionId: SessionId | undefined
  /** Parent-controlled visibility for surfaces that temporarily hide plans. */
  readonly open?: boolean
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
export function PlanCard({ sessionId, open = true }: PlanCardProps) {
  const t = useT()
  const projectedTodos = useProjectionValue<readonly TodoItem[] | null>(sessionId, 'todos')
  const chat = useChatSnapshot(sessionId)
  const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat])
  const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? []
  const [collapsed, setCollapsed] = useState(false)
  const contentId = useId()

  if (!open || todos.length === 0) return null

  const completed = todos.filter(todo => todo.status === 'completed').length
  return (
    <div className={css.dock}>
      <section className={css.card} data-testid="dcode-plan-card" aria-label={t('plan.title')}>
        <button
          type="button"
          className={`${css.header} ${ui.cardHeader}`}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          onClick={() => { setCollapsed(value => !value) }}
        >
          <span className={css.icon} aria-hidden><IconChecklistOutline14 size={16} /></span>
          <span className={css.title}>{t('plan.title')}</span>
          <span className={css.progress}>
            {t('plan.progress', { done: completed, total: todos.length })}
          </span>
          <span className={css.chevron} aria-hidden>
            {collapsed ? <IconChevronRightOutline14 /> : <IconChevronDownOutline14 />}
          </span>
        </button>
        {!collapsed
          ? (
            <div id={contentId}>
              <ul className={css.list}>
                {todos.map((todo, index) => (
                  <li key={`${String(index)}:${todo.content}`} className={css.item} data-status={todo.status}>
                    <StatusMark status={todo.status} />
                    <span className={css.content}>{todo.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}
      </section>
    </div>
  )
}
