/**
 * The mission brief.
 *
 * What the board cannot show at a glance: how far the mission has got, which
 * mode it runs under, and every write-scope conflict on the board collected in
 * one place rather than one warning per card.
 *
 * The mode is a LABEL, never a picker. `AgentPresets.select` refuses once a
 * session has taken a turn, so a running mission keeps the composition it began
 * with; offering a control that would be rejected is worse than stating the
 * rule, which is what the line under it does.
 * @module @dsh-portable/crew-ui/client/shell/BriefView
 */

import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import { useRuntime } from '../state/runtime.ts'
import css from './BriefView.module.css'

/** One write-scope conflict, attributed to the task that reported it. */
interface Conflict {
  readonly subject: string
  readonly warning: string
}

/** Props of the brief. */
export interface BriefViewProps {
  readonly view: TeamView | undefined
  /** The preset this mission started with, when known. */
  readonly presetId: string | undefined
  /** Working directory of the mission, when the session carries one. */
  readonly cwd: string | undefined
}

/** The mission summary tab. */
export function BriefView({ view, presetId, cwd }: BriefViewProps) {
  const { t } = useRuntime()
  const tasks = (view?.tasks ?? []).filter(task => task.status !== 'deleted')
  const done = tasks.filter(task => task.status === 'completed').length
  const conflicts: Conflict[] = tasks.flatMap(task => (
    task.writeScopeWarnings.map(warning => ({ subject: task.subject, warning }))
  ))

  return (
    <div className={css.root}>
      <h2 className={css.title}>{t('brief.title')}</h2>

      <dl className={css.facts}>
        <div className={css.fact}>
          <dt>{t('brief.mode')}</dt>
          <dd>{presetId ?? '—'}</dd>
        </div>
        <div className={css.fact}>
          <dt>{t('brief.workspace')}</dt>
          <dd className={css.path}>{cwd ?? '—'}</dd>
        </div>
        <div className={css.fact}>
          <dt>{t('brief.tasks')}</dt>
          <dd>{t('brief.tasksValue', { done, total: tasks.length })}</dd>
        </div>
        <div className={css.fact}>
          <dt>{t('brief.crew')}</dt>
          <dd>{t('brief.crewValue', { count: view?.members.length ?? 0 })}</dd>
        </div>
      </dl>

      <p className={css.note}>{t('brief.locked')}</p>

      <section className={css.section}>
        <h3 className={css.sectionTitle}>{t('brief.warnings')}</h3>
        {conflicts.length === 0
          ? <p className={css.empty}>{t('brief.noWarnings')}</p>
          : (
            <ul className={css.conflicts}>
              {conflicts.map(conflict => (
                <li key={`${conflict.subject}:${conflict.warning}`} className={css.conflict}>
                  <span className={css.conflictTask}>{conflict.subject}</span>
                  <span className={css.conflictBody}>{conflict.warning}</span>
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  )
}
