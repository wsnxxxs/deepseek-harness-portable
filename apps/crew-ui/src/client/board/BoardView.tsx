/**
 * The mission board.
 *
 * This is Mission Control's landing surface, and the reason the surface exists:
 * the board is a shared human/agent artifact, so the operator gets the same
 * verbs the Lead has — create, edit, assign, complete, reopen, release, delete
 * — rather than a rendering of what the agent decided.
 *
 * Three columns, in the order work moves through them. Within a column the
 * unblocked tasks come first, because "what can start now" is the question a
 * board is scanned for.
 * @module @dsh-portable/crew-ui/client/board/BoardView
 */

import { useState } from 'react'
import type { TeamMemberView, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { BOARD_COLUMNS, groupTasks, type BoardState } from '../state/board.ts'
import { useRuntime } from '../state/runtime.ts'
import { TaskCard } from './TaskCard.tsx'
import { TaskEditor, type TaskDraft } from './TaskEditor.tsx'
import css from './BoardView.module.css'

/** Props of the board. */
export interface BoardViewProps {
  /** The live board. */
  readonly board: BoardState
  /** Roster, for the assignment menu. */
  readonly members: readonly TeamMemberView[]
}

/** Split a comma-separated field into distinct, non-empty entries. */
function items(value: string): string[] {
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]
}

/** The three-column mission board. */
export function BoardView({ board, members }: BoardViewProps) {
  const { t } = useRuntime()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<string | undefined>(undefined)

  const tasks = board.view?.tasks ?? []
  const columns = groupTasks(tasks)

  const submitCreate = async (draft: TaskDraft): Promise<void> => {
    const created = await board.create({
      subject: draft.subject.trim(),
      description: draft.description.trim(),
      blockedBy: items(draft.blockers) as TeamTaskView['blockedBy'],
      writeScopes: items(draft.scopes),
    })
    if (created !== undefined) setCreating(false)
  }

  const submitEdit = async (task: TeamTaskView, draft: TaskDraft): Promise<void> => {
    const edited = await board.update({
      taskId: task.id,
      expectedRevision: task.revision,
      action: 'edit',
      subject: draft.subject.trim(),
      description: draft.description.trim(),
      writeScopes: items(draft.scopes),
    })
    if (edited === undefined) return

    // Dependencies are a separate action, and the host revision has already
    // advanced past the edit; sending the stale one would be a self-inflicted
    // conflict. Skip the second write entirely when nothing changed.
    const blockedBy = items(draft.blockers) as TeamTaskView['blockedBy']
    const unchanged = blockedBy.length === edited.blockedBy.length
      && blockedBy.every((id, index) => id === edited.blockedBy[index])
    if (unchanged) {
      setEditing(undefined)
      return
    }
    const settled = await board.update({
      taskId: task.id,
      expectedRevision: edited.revision,
      action: 'set_dependencies',
      blockedBy,
    })
    if (settled !== undefined) setEditing(undefined)
  }

  if (board.loading && board.view === undefined) {
    return <p className={css.notice}>{t('board.loading')}</p>
  }

  return (
    <div className={css.root}>
      {board.error !== undefined
        ? (
          <div className={css.error} role="alert">
            <span>{board.error}</span>
            <div className={css.errorActions}>
              <button type="button" onClick={() => { void board.refresh() }}>{t('board.retry')}</button>
              <button type="button" onClick={board.dismissError}>{t('board.dismiss')}</button>
            </div>
          </div>
        )
        : null}

      <div className={css.columns}>
        {BOARD_COLUMNS.map(column => (
          <section key={column} className={css.column} aria-label={t(`board.${column}`)}>
            <header className={css.columnHead}>
              <h2 className={css.columnTitle}>{t(`board.${column}`)}</h2>
              <span className={css.columnCount}>{columns[column].length}</span>
              {column === 'pending'
                ? (
                  <button
                    type="button"
                    className={css.add}
                    onClick={() => { setCreating(true) }}
                    disabled={board.view === undefined}
                  >
                    {t('board.addTask')}
                  </button>
                )
                : null}
            </header>

            <div className={css.stack}>
              {column === 'pending' && creating
                ? (
                  <TaskEditor
                    busy={board.pending.has('create')}
                    onCancel={() => { setCreating(false) }}
                    onSubmit={submitCreate}
                  />
                )
                : null}

              {columns[column].map(task => (
                editing === task.id
                  ? (
                    <TaskEditor
                      key={task.id}
                      task={task}
                      busy={board.pending.has(task.id)}
                      onCancel={() => { setEditing(undefined) }}
                      onSubmit={draft => submitEdit(task, draft)}
                    />
                  )
                  : (
                    <TaskCard
                      key={task.id}
                      task={task}
                      tasks={tasks}
                      members={members}
                      busy={board.pending.has(task.id)}
                      onEdit={() => { setEditing(task.id) }}
                      onAction={(action, extra) => {
                        void board.update({
                          taskId: task.id,
                          expectedRevision: task.revision,
                          action,
                          ...extra,
                        })
                      }}
                    />
                  )
              ))}

              {columns[column].length === 0 && !(column === 'pending' && creating)
                ? (
                  <p className={css.empty}>
                    {column === 'pending' ? t('board.emptyPending') : t('board.empty')}
                  </p>
                )
                : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
