/**
 * One task on the board.
 *
 * The card shows the three things a shared board has that a todo list does not,
 * and shows them without being asked: what the task waits on, what it will
 * write, and whether that write scope collides with another task in flight.
 * The host computes the collision (`writeScopeWarnings`) and refuses nothing —
 * it is advice, and advice the operator can act on is worth surfacing at the
 * task rather than in a log.
 * @module @dsh-portable/crew-ui/client/board/TaskCard
 */

import type { TeamMemberView, TeamTaskAction, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { blockerLabels } from '../state/board.ts'
import { useRuntime } from '../state/runtime.ts'
import css from './TaskCard.module.css'

/** Extra fields an action carries. */
export type TaskActionExtra = { readonly owner?: string }

/** Props of one task card. */
export interface TaskCardProps {
  readonly task: TeamTaskView
  /** Every task, so blockers can be named rather than shown as ids. */
  readonly tasks: readonly TeamTaskView[]
  readonly members: readonly TeamMemberView[]
  /** A write on this task is outstanding; its own controls are disabled. */
  readonly busy: boolean
  onEdit(): void
  onAction(action: TeamTaskAction, extra?: TaskActionExtra): void
}

/** A single board task with its dependency, scope and ownership state. */
export function TaskCard({ task, tasks, members, busy, onEdit, onAction }: TaskCardProps) {
  const { t } = useRuntime()
  const blockers = blockerLabels(task, tasks)
  const assignable = members.filter(member => member.status !== 'failed' && member.status !== 'provisioning')

  return (
    <article className={`${css.root} ${busy ? css.busy : ''}`} data-status={task.status}>
      <h3 className={css.subject}>{task.subject}</h3>
      {task.description === '' ? null : <p className={css.description}>{task.description}</p>}

      <div className={css.meta}>
        {/* Readiness is the board's own judgement, not a status the agent set,
            so it reads as a state rather than as a label someone chose. */}
        {task.status === 'pending'
          ? (
            <span className={task.ready ? css.ready : css.blocked}>
              {task.ready ? t('board.ready') : t('board.blocked')}
            </span>
          )
          : null}
        <span className={css.owner}>
          {task.ownerName === undefined ? t('board.unowned') : task.ownerName}
        </span>
      </div>

      {blockers.length > 0
        ? (
          <p className={css.chips}>
            <span className={css.chipLabel}>{t('board.blockedBy')}</span>
            {blockers.map(label => <span key={label} className={css.chip}>{label}</span>)}
          </p>
        )
        : null}

      {task.writeScopes.length > 0
        ? (
          <p className={css.chips}>
            <span className={css.chipLabel}>{t('board.scopes')}</span>
            {task.writeScopes.map(scope => <span key={scope} className={css.scope}>{scope}</span>)}
          </p>
        )
        : null}

      {task.writeScopeWarnings.map(warning => (
        <p key={warning} className={css.warning}>
          <span className={css.warningLabel}>{t('board.conflict')}</span>
          {warning}
        </p>
      ))}

      <div className={css.actions}>
        <button type="button" disabled={busy} onClick={onEdit}>{t('task.edit')}</button>
        {task.status === 'completed'
          ? <button type="button" disabled={busy} onClick={() => { onAction('reopen') }}>{t('task.reopen')}</button>
          : <button type="button" disabled={busy} onClick={() => { onAction('complete') }}>{t('task.complete')}</button>}
        {task.ownerName === undefined
          ? null
          : <button type="button" disabled={busy} onClick={() => { onAction('release') }}>{t('task.release')}</button>}
        <label className={css.assign}>
          <span className={css.assignLabel}>{t('task.assign')}</span>
          <select
            value={task.ownerName ?? ''}
            disabled={busy}
            onChange={(event) => {
              const owner = event.target.value
              // The board models "nobody" as releasing rather than as an owner
              // named empty string, so the two verbs stay distinct on the host.
              if (owner === '') onAction('release')
              else onAction('reassign', { owner })
            }}
          >
            <option value="">{t('task.assignNobody')}</option>
            {assignable.map(member => <option key={member.id} value={member.name}>{member.name}</option>)}
          </select>
        </label>
        <button
          type="button"
          className={css.destructive}
          disabled={busy}
          onClick={() => { onAction('delete') }}
        >
          {t('task.delete')}
        </button>
      </div>
    </article>
  )
}
