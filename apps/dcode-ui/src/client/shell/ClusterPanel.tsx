/** DCode's Cluster workbench: durable roster and shared task board. */

import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  IconCheckOutline14, IconChevronRightOutline14, IconPlusOutline16, IconRefreshOutline14,
  IconUserOutline16, IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  TeamMemberView, TeamTaskAction, TeamTaskId, TeamTaskMutationResult, TeamTaskView, TeamView,
  UpdateTeamTaskRequest,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client'
import { useAsync } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useRuntime, type DcodeClusterRemote } from '../state/runtime.ts'
import { EmptyState, Pill, Spinner, ui } from './ui.tsx'
import css from './ClusterPanel.module.css'

interface TaskDraft {
  subject: string
  description: string
  blockers: string
  scopes: string
}

const EMPTY_DRAFT: TaskDraft = { subject: '', description: '', blockers: '', scopes: '' }

type MemberStatusKey =
  | 'cluster.status.running'
  | 'cluster.status.idle'
  | 'cluster.status.inactive'
  | 'cluster.status.provisioning'
  | 'cluster.status.failed'

type TaskStatusKey =
  | 'cluster.task.pending'
  | 'cluster.task.inProgress'
  | 'cluster.task.completed'

function memberStatusKey(status: TeamMemberView['status']): MemberStatusKey {
  switch (status) {
    case 'running': return 'cluster.status.running'
    case 'idle': return 'cluster.status.idle'
    case 'inactive': return 'cluster.status.inactive'
    case 'provisioning': return 'cluster.status.provisioning'
    case 'failed': return 'cluster.status.failed'
  }
}

function taskStatusKey(status: TeamTaskView['status']): TaskStatusKey {
  switch (status) {
    case 'pending': return 'cluster.task.pending'
    case 'in_progress': return 'cluster.task.inProgress'
    case 'completed': return 'cluster.task.completed'
    /* Deleted task tombstones are not included by the Team view. */
    case 'deleted': return 'cluster.task.completed'
  }
}

function csvItems(value: string): string[] {
  return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))]
}

function rootSessionId(runtime: ReturnType<typeof useRuntime>, sessionId: SessionId): SessionId {
  let current = sessionId
  const visited = new Set<SessionId>()
  while (!visited.has(current)) {
    visited.add(current)
    const parent = runtime.sessions.binding(current)?.session.getSnapshot().subagent?.address?.parentSessionId
    if (parent === undefined) return current
    current = parent
  }
  return current
}

function mutationError(result: RemoteResult<TeamTaskMutationResult>): string | undefined {
  if (!result.ok) return result.error.message
  if (!result.value.ok) return result.value.error.message
  return undefined
}

function memberTree(members: readonly TeamMemberView[]): readonly { member: TeamMemberView; depth: number }[] {
  return members.map(member => ({ member, depth: member.role === 'lead' ? 0 : 1 }))
}

/** Cluster mode's durable orchestration inspector. */
export function ClusterPanel({ sessionId }: { readonly sessionId: SessionId | undefined }) {
  const runtime = useRuntime()
  const t = useT()
  const cluster = runtime.cluster
  const leadId = sessionId === undefined ? undefined : rootSessionId(runtime, sessionId)
  const [open, setOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT)
  const [editing, setEditing] = useState<TeamTaskId | undefined>()
  const [editDraft, setEditDraft] = useState<TaskDraft>(EMPTY_DRAFT)
  const [busyTask, setBusyTask] = useState<string | undefined>()
  const [operationError, setOperationError] = useState<string | undefined>()

  const loaded = useAsync(async (signal): Promise<TeamView | undefined> => {
    if (cluster === undefined || leadId === undefined) return undefined
    signal.throwIfAborted()
    const result = await cluster.view(leadId)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }, [cluster, leadId])

  useEffect(() => {
    if (!open || cluster === undefined || leadId === undefined) return undefined
    const timer = window.setInterval(() => { loaded.reload() }, 5000)
    return () => { window.clearInterval(timer) }
  }, [cluster, leadId, loaded.reload, open])

  const updateTask = useCallback(async (
    task: TeamTaskView,
    change: Omit<UpdateTeamTaskRequest, 'taskId' | 'expectedRevision'>,
  ): Promise<TeamTaskView | undefined> => {
    if (cluster === undefined || leadId === undefined) return undefined
    setBusyTask(task.id)
    setOperationError(undefined)
    try {
      const result = await cluster.updateTask(leadId, {
        taskId: task.id,
        expectedRevision: task.revision,
        ...change,
      })
      const failure = mutationError(result)
      if (failure !== undefined) {
        setOperationError(failure)
        loaded.reload()
        return undefined
      }
      loaded.reload()
      if (!result.ok || !result.value.ok) return undefined
      return result.value.value
    } catch (cause: unknown) {
      setOperationError(cause instanceof Error ? cause.message : String(cause))
      return undefined
    } finally {
      setBusyTask(undefined)
    }
  }, [cluster, leadId, loaded.reload])

  const createTask = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (cluster === undefined || leadId === undefined) return
    const subject = draft.subject.trim()
    const description = draft.description.trim()
    if (subject === '' || description === '') return
    setBusyTask('create')
    setOperationError(undefined)
    try {
      const result = await cluster.createTask(leadId, {
        subject,
        description,
        blockedBy: csvItems(draft.blockers) as TeamTaskId[],
        writeScopes: csvItems(draft.scopes),
      })
      const failure = mutationError(result)
      if (failure !== undefined) {
        setOperationError(failure)
        return
      }
      setDraft(EMPTY_DRAFT)
      setCreating(false)
      loaded.reload()
    } catch (cause: unknown) {
      setOperationError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusyTask(undefined)
    }
  }, [cluster, draft, leadId, loaded.reload])

  const openMember = useCallback(async (member: TeamMemberView): Promise<void> => {
    if (member.role === 'lead' || member.status === 'failed' || member.status === 'provisioning') return
    const parentSessionId = leadId
    if (parentSessionId === undefined) return
    try {
      await runtime.sessions.refreshSubagents(parentSessionId)
      runtime.sessions.openSubagent({ parentSessionId, childSessionId: member.id, mode: 'continuable' })
    } catch (cause: unknown) {
      setOperationError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [leadId, runtime])

  const beginEdit = (task: TeamTaskView): void => {
    setEditing(task.id)
    setEditDraft({
      subject: task.subject,
      description: task.description,
      blockers: task.blockedBy.join(', '),
      scopes: task.writeScopes.join(', '),
    })
  }

  if (cluster === undefined) return null

  const view = loaded.value
  const members = view?.members ?? []
  const tasks = view?.tasks ?? []
  const running = members.filter(member => member.status === 'running').length
  const completed = tasks.filter(task => task.status === 'completed').length
  const rows = memberTree(members)

  return (
    <section className={css.section} data-cluster-panel>
      <div className={css.sectionHeader}>
        <button
          type="button"
          className={css.sectionToggle}
          aria-expanded={open}
          onClick={() => { setOpen(value => !value) }}
        >
          <IconChevronRightOutline14 className={open ? css.chevronOpen : undefined} />
          <IconUserOutline16 />
          <span className={ui.grow}>{t('cluster.title')}</span>
          {running === 0 ? null : <span className={css.runningPill}>{t('cluster.running', { count: running })}</span>}
          <Pill>{members.length}</Pill>
        </button>
        <button type="button" className={css.refreshButton} aria-label={t('cluster.refresh')} title={t('cluster.refresh')} onClick={() => { loaded.reload() }}>
          <IconRefreshOutline14 />
        </button>
      </div>
      {open
        ? (
          <div className={css.content}>
            <div className={css.summary}>
              <span><strong>{members.length}</strong> {t('cluster.members')}</span>
              <span><strong>{completed}/{tasks.length}</strong> {t('cluster.taskProgress')}</span>
            </div>
            {operationError !== undefined && <div className={css.error} role="alert"><IconWarningOutline16 />{operationError}</div>}
            {loaded.error !== undefined && <div className={css.error} role="alert"><IconWarningOutline16 />{loaded.error}</div>}
            {loaded.loading && view === undefined
              ? <EmptyState><Spinner size="sm" /> {t('cluster.loading')}</EmptyState>
              : view === undefined
                ? <EmptyState>{t('cluster.empty')}</EmptyState>
                : (
                  <>
                    <section className={css.subsection}>
                      <header className={css.subsectionHeader}><span>{t('cluster.roster')}</span><Pill>{members.length}</Pill></header>
                      <div className={css.memberList}>
                        {rows.map(({ member, depth }) => {
                          const canOpen = member.role !== 'lead'
                            && member.status !== 'failed'
                            && member.status !== 'provisioning'
                          const role = member.role === 'lead' ? t('cluster.roleLead') : t('cluster.roleTeammate')
                          return (
                            <button
                              key={member.id}
                              type="button"
                              className={css.memberRow}
                              style={{ paddingLeft: `${8 + depth * 14}px` }}
                              disabled={!canOpen}
                              onClick={() => { void openMember(member) }}
                              title={canOpen ? t('cluster.openMember') : undefined}
                            >
                              <span className={css.statusDot} data-status={member.status} aria-hidden />
                              <span className={css.memberCopy}>
                                <span className={css.memberName}>{member.name}</span>
                                <span className={css.memberMeta}>{role} · {t(memberStatusKey(member.status))}{member.model === undefined ? '' : ` · ${member.model}`}</span>
                                {member.diagnostics.map(diagnostic => <span key={diagnostic} className={css.diagnostic}>{diagnostic}</span>)}
                              </span>
                              {canOpen ? <IconChevronRightOutline14 className={css.rowChevron} /> : null}
                            </button>
                          )
                        })}
                      </div>
                    </section>

                    <section className={css.subsection}>
                      <div className={css.subsectionHeader}>
                        <span>{t('cluster.tasks')}</span>
                        <span className={ui.grow} />
                        <button type="button" className={css.addButton} onClick={() => { setCreating(value => !value) }}>
                          <IconPlusOutline16 size={13} /> {t('cluster.addTask')}
                        </button>
                      </div>
                      {creating && (
                        <TaskForm
                          draft={draft}
                          setDraft={setDraft}
                          pending={busyTask === 'create'}
                          onSave={event => { void createTask(event) }}
                          onCancel={() => { setCreating(false) }}
                          t={t}
                        />
                      )}
                      {tasks.length === 0 && !creating && <EmptyState>{t('cluster.noTasks')}</EmptyState>}
                      <div className={css.taskList}>
                        {tasks.map(task => editing === task.id
                          ? (
                            <TaskForm
                              key={task.id}
                              draft={editDraft}
                              setDraft={setEditDraft}
                              pending={busyTask === task.id}
                              onSave={event => {
                                event.preventDefault()
                                void updateTask(task, {
                                  action: 'edit',
                                  subject: editDraft.subject.trim(),
                                  description: editDraft.description.trim(),
                                  writeScopes: csvItems(editDraft.scopes),
                                }).then(updated => { if (updated !== undefined) setEditing(undefined) })
                              }}
                              onCancel={() => { setEditing(undefined) }}
                              t={t}
                              editMode
                            />
                          )
                          : (
                            <TaskCard
                              key={task.id}
                              task={task}
                               assignable={members.filter(member => member.status !== 'failed' && member.status !== 'provisioning')}
                              busy={busyTask === task.id}
                              onEdit={() => { beginEdit(task) }}
                              onAction={(action, owner) => {
                                void updateTask(task, {
                                  action,
                                  ...owner === undefined || owner === '' ? {} : { owner },
                                })
                              }}
                              t={t}
                            />
                          ))}
                      </div>
                    </section>

                  </>
                )}
          </div>
        )
        : null}
    </section>
  )
}

function TaskForm({
  draft, setDraft, pending, onSave, onCancel, t, editMode = false,
}: {
  draft: TaskDraft
  setDraft: (draft: TaskDraft) => void
  pending: boolean
  onSave: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  t: ReturnType<typeof useT>
  editMode?: boolean
}) {
  const field = (key: keyof TaskDraft, value: string): void => { setDraft({ ...draft, [key]: value }) }
  return (
    <form className={css.taskForm} onSubmit={onSave}>
      <input value={draft.subject} placeholder={t('cluster.subject')} disabled={pending} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('subject', event.target.value) }} />
      <textarea value={draft.description} placeholder={t('cluster.description')} disabled={pending} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { field('description', event.target.value) }} />
      {editMode ? null : <input value={draft.blockers} placeholder={t('cluster.blockers')} disabled={pending} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('blockers', event.target.value) }} />}
      <input value={draft.scopes} placeholder={t('cluster.scopes')} disabled={pending} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('scopes', event.target.value) }} />
      <div className={css.formActions}>
        <button type="submit" className={css.primaryAction} disabled={pending || draft.subject.trim() === '' || draft.description.trim() === ''}>{pending ? t('common.saving') : t('common.save')}</button>
        <button type="button" className={css.taskAction} disabled={pending} onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </form>
  )
}

function TaskCard({
  task, assignable, busy, onEdit, onAction, t,
}: {
  task: TeamTaskView
  assignable: readonly TeamMemberView[]
  busy: boolean
  onEdit: () => void
  onAction: (action: TeamTaskAction, owner?: string) => void
  t: ReturnType<typeof useT>
}) {
  const ownerIsLead = task.ownerName === 'lead'
  return (
    <article className={css.taskCard}>
      <div className={css.taskHeading}>
        <strong>{task.subject}</strong>
        <span className={css.taskStatus} data-status={task.status}>{t(taskStatusKey(task.status))}</span>
      </div>
      <p className={css.taskDescription}>{task.description}</p>
      <div className={css.taskMeta}>
        <code>{task.id}</code>
        <span>{task.ownerName ?? t('cluster.unassigned')}</span>
        {task.status === 'pending' ? <span className={task.ready ? css.ready : css.blocked}>{task.ready ? t('cluster.ready') : t('cluster.blocked')}</span> : null}
        {task.blockedBy.length > 0 ? <span>{t('cluster.blockedBy')}: {task.blockedBy.join(', ')}</span> : null}
        {task.writeScopes.length > 0 ? <span>{t('cluster.scopes')}: {task.writeScopes.join(', ')}</span> : null}
      </div>
      {task.writeScopeWarnings.map(warning => <div key={warning} className={css.warning}><IconWarningOutline16 />{warning}</div>)}
      <div className={css.taskControls}>
        <label className={css.ownerControl}>
          <span>{t('cluster.owner')}</span>
          <select
            value={task.ownerName ?? ''}
            disabled={busy || task.status === 'completed'}
            onChange={event => { onAction('reassign', event.target.value) }}
          >
            <option value="">{t('cluster.unassigned')}</option>
            {assignable.map(member => <option key={member.id} value={member.name}>{member.name}</option>)}
          </select>
        </label>
        <button type="button" className={css.taskAction} disabled={busy} onClick={onEdit}>{t('common.edit')}</button>
        {task.status === 'pending' && task.ready
          ? <button type="button" className={css.primaryAction} disabled={busy} onClick={() => { onAction('claim') }}>{t('cluster.claim')}</button>
          : null}
        {task.status === 'in_progress' && ownerIsLead
          ? (
            <>
              <button type="button" className={css.primaryAction} disabled={busy} onClick={() => { onAction('complete') }}><IconCheckOutline14 /> {t('cluster.complete')}</button>
              <button type="button" className={css.taskAction} disabled={busy} onClick={() => { onAction('release') }}>{t('cluster.release')}</button>
            </>
          )
          : null}
        {task.status === 'completed'
          ? <button type="button" className={css.taskAction} disabled={busy} onClick={() => { onAction('reopen') }}>{t('cluster.reopen')}</button>
          : null}
        <button type="button" className={css.dangerAction} disabled={busy} onClick={() => { onAction('delete') }}>{t('cluster.delete')}</button>
      </div>
    </article>
  )
}
