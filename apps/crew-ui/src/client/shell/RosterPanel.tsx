/**
 * The crew roster.
 *
 * Isomorphic to the official `details` region. Two sources are merged here on
 * purpose:
 *
 * - membership, names and roles come from the durable Team view, so a teammate
 *   that is not currently loaded still appears with its queued work intact;
 * - liveness comes from the Session controller, because "is this member running
 *   right now" is not a durable fact and the log does not carry it.
 *
 * A member row opens that member's own thread. Recursion is the point: a
 * teammate's conversation is a conversation like any other, so it is reached
 * the same way rather than rendered as a nested summary.
 * @module @dsh-portable/crew-ui/client/shell/RosterPanel
 */

import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import type { CrewKey } from '../locales.ts'
import css from './RosterPanel.module.css'

/** Props of the roster. */
export interface RosterPanelProps {
  readonly members: readonly TeamMemberView[]
  readonly currentSessionId: SessionId | undefined
  onOpenMember(member: TeamMemberView): void
}

/** Copy key for one member status. */
function statusKey(status: TeamMemberView['status']): CrewKey {
  switch (status) {
    case 'running': return 'roster.status.running'
    case 'idle': return 'roster.status.idle'
    case 'inactive': return 'roster.status.inactive'
    case 'provisioning': return 'roster.status.provisioning'
    case 'failed': return 'roster.status.failed'
  }
}

/** The right-hand crew roster. */
export function RosterPanel({ members, currentSessionId, onOpenMember }: RosterPanelProps) {
  const { t } = useRuntime()
  const teammates = members.filter(member => member.role === 'teammate')

  return (
    <aside className={css.root} aria-label={t('roster.title')}>
      <header className={css.head}>
        <h2 className={css.title}>{t('roster.title')}</h2>
      </header>

      <ul className={css.list}>
        {members.map(member => (
          <li key={member.id}>
            <button
              type="button"
              className={`${css.row} ${member.id === currentSessionId ? css.rowActive : ''}`}
              // A Lead has no separate thread to open: its conversation is the
              // mission's own, already one tab away.
              disabled={member.role === 'lead'}
              onClick={() => { onOpenMember(member) }}
            >
              <span className={css.avatar} aria-hidden><IconUserOutline16 /></span>
              <span className={css.memberCopy}>
                <span className={css.name}>{member.name}</span>
                <span className={css.role}>
                  {member.role === 'lead' ? t('roster.lead') : t(statusKey(member.status))}
                </span>
              </span>
              <span className={css.status} data-status={member.status} aria-hidden />
            </button>
            {member.description === undefined || member.description === ''
              ? null
              : <p className={css.description}>{member.description}</p>}
            {member.diagnostics.map(diagnostic => (
              <p key={diagnostic} className={css.diagnostic}>{diagnostic}</p>
            ))}
          </li>
        ))}
      </ul>

      {teammates.length === 0
        ? (
          <div className={css.empty}>
            <p className={css.emptyTitle}>{t('roster.empty')}</p>
            <p className={css.emptyBody}>{t('roster.emptyBody')}</p>
          </div>
        )
        : null}
    </aside>
  )
}
