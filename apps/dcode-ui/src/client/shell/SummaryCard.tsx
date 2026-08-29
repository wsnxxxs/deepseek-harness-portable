/**
 * The environment summary: what this task is working on, at a glance.
 *
 * A card the top bar summons and dismisses, anchored under its own control at
 * the right of the conversation column — deliberately not the preview
 * sidebar, which is where the same facts are worked rather than read. Every
 * row is the digest of one panel and opens it: the change counts open
 * Changes, the goal opens Goal.
 *
 * Nothing here is state of its own. The counts come from the same git read
 * the Changes panel uses, the goal from the host projection the official goal
 * bar renders, and the workspace from the durable registry.
 * @module @dsh-portable/dcode-ui/client/shell/SummaryCard
 */

import { useMemo } from 'react'
import {
  IconBranchOutline16, IconChecklistOutline14, IconChevronRightOutline14, IconCodeOutline16,
  IconCloseOutline16, IconFolderOpenOutline16, IconGoalOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TodoItem } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useChatSnapshot, useProjectionValue, useWorkspaceGroups } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import { latestTodos } from '../chat/tools.ts'
import { ui } from './ui.tsx'
import css from './SummaryCard.module.css'

/** Props of the summary card. */
export interface SummaryCardProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
  /** Top-bar controlled visibility. */
  readonly open: boolean
}

/** The goal projection's shape, read structurally to avoid a package edge. */
interface GoalProjectionView {
  readonly goal: { readonly objective: string; readonly phase: string }
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
export function SummaryCard({ navigation, sessionId, cwd, open }: SummaryCardProps) {
  const t = useT()
  const { groups } = useWorkspaceGroups()
  const git = useGitStatus(cwd, sessionId)
  const goal = useProjectionValue<GoalProjectionView | null>(sessionId, 'goal')
  const projectedTodos = useProjectionValue<readonly TodoItem[] | null>(sessionId, 'todos')
  const chat = useChatSnapshot(sessionId)
  const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat])
  const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? []

  const workspace = useMemo(
    () => groups.find(group => group.path === cwd)
      ?? groups.find(group => group.sessions.some(row => row.id === sessionId)),
    [groups, cwd, sessionId],
  )

  if (!open) return null

  const status = git.status
  const repository = status?.repository === true
  const dirty = (status?.files.length ?? 0) > 0
  const done = todos.filter(todo => todo.status === 'completed').length
  const objective = goal?.goal.objective

  return (
    <section className={css.card} aria-label={t('summary.title')}>
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
    </section>
  )
}
