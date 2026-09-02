/**
 * Cluster mode's durable orchestration inspector: who is on the team, and
 * what the team has agreed to do.
 *
 * The component is deliberately host-agnostic. It reads the Team Remote and
 * the bound dictionary through {@link useDeps} and nothing else — no cordis
 * context, no host surface's runtime provider, no ambient theme object — so
 * the same element renders in the official conversation header and inside a
 * workbench that adopts the published service.
 * @module @dsh-portable/cluster-ui/client/ClusterPanel
 */

import {
  createElement, useCallback, useEffect, useState,
  type ChangeEvent, type FormEvent, type FunctionComponent, type ReactNode,
} from 'react'
import {
  IconCheckOutline14, IconChevronRightOutline14, IconPlusOutline16, IconRefreshOutline14,
  IconUserOutline16, IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type {
  TeamMemberView, TeamTaskAction, TeamTaskId, TeamTaskView, TeamView, UpdateTeamTaskRequest,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { ClusterPanelProps } from '../contract.ts'
import type { Translate } from './locales.ts'
import { ClusterDepsProvider, useAsync, useDeps, useT, type ClusterDeps } from './deps.ts'
import {
  canOpenMember, csvItems, EMPTY_DRAFT, memberStatusKey, memberTree, mutationError, taskStatusKey,
  type TaskDraft,
} from './model.ts'
import { clusterScope } from './tokens.ts'
import css from './ClusterPanel.module.css'

/** How often an open panel re-reads the roster and board, in milliseconds. */
const POLL_INTERVAL_MS = 5000

/** A centred explanatory state for an empty or unavailable board. */
function EmptyState({ children }: { readonly children: ReactNode }) {
  return <div className={css.empty}>{children}</div>
}

/** A compact count chip. */
function Pill({ children }: { readonly children: ReactNode }) {
  return <span className={css.pill}>{children}</span>
}

/** An indeterminate progress mark. */
function Spinner() {
  return <span className={css.spinner} aria-hidden />
}

/**
 * Close the panel over its dependencies once, at plugin-apply time.
 *
 * A host surface receives the result and mounts it like any other component.
 * Binding the provider here rather than asking each host to wrap the panel is
 * what keeps the contract at one prop: whichever tree the element lands in,
 * the dependencies travel with it.
 * @param deps - the Team face and bound dictionary resolved by the plugin body.
 * @returns the mountable panel published on the Cluster service.
 */
export function createClusterPanel(deps: ClusterDeps): FunctionComponent<ClusterPanelProps> {
  return function HostedClusterPanel(props: ClusterPanelProps) {
    return createElement(ClusterDepsProvider, { value: deps }, createElement(ClusterPanel, props))
  }
}

/** The roster and shared task board of one Team. */
export function ClusterPanel({ sessionId }: ClusterPanelProps) {
  const { actions } = useDeps()
  const t = useT()
  const leadId = sessionId as SessionId | undefined
  const [open, setOpen] = useState(true)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<TaskDraft>(EMPTY_DRAFT)
  const [editing, setEditing] = useState<TeamTaskId | undefined>()
  const [editDraft, setEditDraft] = useState<TaskDraft>(EMPTY_DRAFT)
  const [busyTask, setBusyTask] = useState<string | undefined>()
  const [operationError, setOperationError] = useState<string | undefined>()

  const loaded = useAsync(async (signal): Promise<TeamView | undefined> => {
    if (leadId === undefined) return undefined
    signal.throwIfAborted()
    const result = await actions.view(leadId)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }, [actions, leadId])

  useEffect(() => {
    if (!open || leadId === undefined) return undefined
    const timer = window.setInterval(() => { loaded.reload() }, POLL_INTERVAL_MS)
    return () => { window.clearInterval(timer) }
  }, [leadId, loaded.reload, open])

  const updateTask = useCallback(async (
    task: TeamTaskView,
    change: Omit<UpdateTeamTaskRequest, 'taskId' | 'expectedRevision'>,
  ): Promise<TeamTaskView | undefined> => {
    if (leadId === undefined) return undefined
    setBusyTask(task.id)
    setOperationError(undefined)
    try {
      const result = await actions.updateTask(leadId, {
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
  }, [actions, leadId, loaded.reload])

  const createTask = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (leadId === undefined) return
    const subject = draft.subject.trim()
    const description = draft.description.trim()
    if (subject === '' || description === '') return
    setBusyTask('create')
    setOperationError(undefined)
    try {
      const result = await actions.createTask(leadId, {
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
  }, [actions, draft, leadId, loaded.reload])

  const openMember = useCallback(async (member: TeamMemberView): Promise<void> => {
    if (!canOpenMember(member) || leadId === undefined) return
    try {
      await actions.openMember(leadId, member)
    } catch (cause: unknown) {
      setOperationError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [actions, leadId])

  const beginEdit = (task: TeamTaskView): void => {
    setEditing(task.id)
    setEditDraft({
      subject: task.subject,
      description: task.description,
      blockers: task.blockedBy.join(', '),
      scopes: task.writeScopes.join(', '),
    })
  }

  const view = loaded.value
  const members = view?.members ?? []
  const tasks = view?.tasks ?? []
  const running = members.filter(member => member.status === 'running').length
  const completed = tasks.filter(task => task.status === 'completed').length
  const rows = memberTree(members)

  return (
    <section className={css.section} {...clusterScope} data-cluster-panel>
      <div className={css.sectionHeader}>
        <button
          type="button"
          className={css.sectionToggle}
          aria-expanded={open}
          onClick={() => { setOpen(value => !value) }}
        >
          <IconChevronRightOutline14 className={open ? css.chevronOpen : undefined} />
          <IconUserOutline16 />
          <span className={css.grow}>{t('title')}</span>
          {running === 0 ? null : <span className={css.runningPill}>{t('running', { count: running })}</span>}
          <Pill>{members.length}</Pill>
        </button>
        <button type="button" className={css.refreshButton} aria-label={t('refresh')} title={t('refresh')} onClick={() => { loaded.reload() }}>
          <IconRefreshOutline14 />
        </button>
      </div>
      {open
        ? (
          <div className={css.content}>
            <div className={css.summary}>
              <span><strong>{members.length}</strong> {t('members')}</span>
              <span><strong>{completed}/{tasks.length}</strong> {t('taskProgress')}</span>
            </div>
            {operationError !== undefined && <div className={css.error} role="alert"><IconWarningOutline16 />{operationError}</div>}
            {loaded.error !== undefined && <div className={css.error} role="alert"><IconWarningOutline16 />{loaded.error}</div>}
            {loaded.loading && view === undefined
              ? <EmptyState><Spinner /> {t('loading')}</EmptyState>
              : view === undefined
                ? <EmptyState>{t('empty')}</EmptyState>
                : (
                  <>
                    <section className={css.subsection}>
                      <header className={css.subsectionHeader}><span>{t('roster')}</span><Pill>{members.length}</Pill></header>
                      <div className={css.memberList}>
                        {rows.map(({ member, depth }) => {
                          const canOpen = canOpenMember(member)
                          const role = member.role === 'lead' ? t('roleLead') : t('roleTeammate')
                          return (
                            <button
                              key={member.id}
                              type="button"
                              className={css.memberRow}
                              style={{ paddingLeft: `${8 + depth * 14}px` }}
                              disabled={!canOpen}
                              onClick={() => { void openMember(member) }}
                              title={canOpen ? t('openMember') : undefined}
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
                        <span>{t('tasks')}</span>
                        <span className={css.grow} />
                        <button type="button" className={css.addButton} onClick={() => { setCreating(value => !value) }}>
                          <IconPlusOutline16 size={13} /> {t('addTask')}
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
                      {tasks.length === 0 && !creating && <EmptyState>{t('noTasks')}</EmptyState>}
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
  t: Translate
  editMode?: boolean
}) {
  const field = (key: keyof TaskDraft, value: string): void => { setDraft({ ...draft, [key]: value }) }
  return (
    <form className={css.taskForm} onSubmit={onSave}>
      <input value={draft.subject} placeholder={t('subject')} disabled={pending} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('subject', event.target.value) }} />
      <textarea value={draft.description} placeholder={t('description')} disabled={pending} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => { field('description', event.target.value) }} />
      {editMode ? null : <input value={draft.blockers} placeholder={t('blockers')} disabled={pending} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('blockers', event.target.value) }} />}
      <input value={draft.scopes} placeholder={t('scopes')} disabled={pending} onChange={(event: ChangeEvent<HTMLInputElement>) => { field('scopes', event.target.value) }} />
      <div className={css.formActions}>
        <button type="submit" className={css.primaryAction} disabled={pending || draft.subject.trim() === '' || draft.description.trim() === ''}>{pending ? t('action.saving') : t('action.save')}</button>
        <button type="button" className={css.taskAction} disabled={pending} onClick={onCancel}>{t('action.cancel')}</button>
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
  t: Translate
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
        <span>{task.ownerName ?? t('unassigned')}</span>
        {task.status === 'pending' ? <span className={task.ready ? css.ready : css.blocked}>{task.ready ? t('ready') : t('blocked')}</span> : null}
        {task.blockedBy.length > 0 ? <span>{t('blockedBy')}: {task.blockedBy.join(', ')}</span> : null}
        {task.writeScopes.length > 0 ? <span>{t('scopes')}: {task.writeScopes.join(', ')}</span> : null}
      </div>
      {task.writeScopeWarnings.map(warning => <div key={warning} className={css.warning}><IconWarningOutline16 />{warning}</div>)}
      <div className={css.taskControls}>
        <label className={css.ownerControl}>
          <span>{t('owner')}</span>
          <select
            value={task.ownerName ?? ''}
            disabled={busy || task.status === 'completed'}
            onChange={event => { onAction('reassign', event.target.value) }}
          >
            <option value="">{t('unassigned')}</option>
            {assignable.map(member => <option key={member.id} value={member.name}>{member.name}</option>)}
          </select>
        </label>
        <button type="button" className={css.taskAction} disabled={busy} onClick={onEdit}>{t('action.edit')}</button>
        {task.status === 'pending' && task.ready
          ? <button type="button" className={css.primaryAction} disabled={busy} onClick={() => { onAction('claim') }}>{t('claim')}</button>
          : null}
        {task.status === 'in_progress' && ownerIsLead
          ? (
            <>
              <button type="button" className={css.primaryAction} disabled={busy} onClick={() => { onAction('complete') }}><IconCheckOutline14 /> {t('complete')}</button>
              <button type="button" className={css.taskAction} disabled={busy} onClick={() => { onAction('release') }}>{t('release')}</button>
            </>
          )
          : null}
        {task.status === 'completed'
          ? <button type="button" className={css.taskAction} disabled={busy} onClick={() => { onAction('reopen') }}>{t('reopen')}</button>
          : null}
        <button type="button" className={css.dangerAction} disabled={busy} onClick={() => { onAction('delete') }}>{t('delete')}</button>
      </div>
    </article>
  )
}
