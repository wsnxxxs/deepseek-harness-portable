/**
 * The create/edit form for one task.
 *
 * The same form serves both, because the fields are the same and an operator
 * who has written one task should not have to learn a second layout to change
 * it. Save stays disabled until the two fields the host requires are non-empty,
 * so an invalid write is never sent for the host to reject.
 * @module @dsh-portable/crew-ui/client/board/TaskEditor
 */

import { useState } from 'react'
import type { TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { useRuntime } from '../state/runtime.ts'
import css from './TaskEditor.module.css'

/** The editable shape of a task, as typed rather than as stored. */
export interface TaskDraft {
  readonly subject: string
  readonly description: string
  /** Comma-separated task ids. */
  readonly blockers: string
  /** Comma-separated paths. */
  readonly scopes: string
}

const EMPTY: TaskDraft = { subject: '', description: '', blockers: '', scopes: '' }

/** Props of the task form. */
export interface TaskEditorProps {
  /** Existing task when editing; omitted when creating. */
  readonly task?: TeamTaskView
  /** A write is outstanding. */
  readonly busy: boolean
  onCancel(): void
  onSubmit(draft: TaskDraft): Promise<void> | void
}

/** Create or edit one board task. */
export function TaskEditor({ task, busy, onCancel, onSubmit }: TaskEditorProps) {
  const { t } = useRuntime()
  const [draft, setDraft] = useState<TaskDraft>(() => (
    task === undefined
      ? EMPTY
      : {
        subject: task.subject,
        description: task.description,
        blockers: task.blockedBy.join(', '),
        scopes: task.writeScopes.join(', '),
      }
  ))

  const patch = (part: Partial<TaskDraft>): void => { setDraft(current => ({ ...current, ...part })) }
  const complete = draft.subject.trim() !== '' && draft.description.trim() !== ''

  return (
    <form
      className={css.root}
      onSubmit={(event) => {
        event.preventDefault()
        if (!complete || busy) return
        void onSubmit(draft)
      }}
    >
      <label className={css.field}>
        <span className={css.label}>{t('task.subject')}</span>
        <input
          className={css.input}
          value={draft.subject}
          placeholder={t('task.subjectPlaceholder')}
          disabled={busy}
          autoFocus
          onChange={(event) => { patch({ subject: event.target.value }) }}
        />
      </label>

      <label className={css.field}>
        <span className={css.label}>{t('task.description')}</span>
        <textarea
          className={css.textarea}
          value={draft.description}
          placeholder={t('task.descriptionPlaceholder')}
          rows={3}
          disabled={busy}
          onChange={(event) => { patch({ description: event.target.value }) }}
        />
      </label>

      <label className={css.field}>
        <span className={css.label}>{t('task.blockers')}</span>
        <input
          className={css.input}
          value={draft.blockers}
          placeholder={t('task.blockersPlaceholder')}
          disabled={busy}
          onChange={(event) => { patch({ blockers: event.target.value }) }}
        />
      </label>

      <label className={css.field}>
        <span className={css.label}>{t('task.scopes')}</span>
        <input
          className={css.input}
          value={draft.scopes}
          placeholder={t('task.scopesPlaceholder')}
          disabled={busy}
          onChange={(event) => { patch({ scopes: event.target.value }) }}
        />
      </label>

      <div className={css.actions}>
        <button type="button" disabled={busy} onClick={onCancel}>{t('task.cancel')}</button>
        <button type="submit" className={css.primary} disabled={busy || !complete}>{t('task.save')}</button>
      </div>
    </form>
  )
}
