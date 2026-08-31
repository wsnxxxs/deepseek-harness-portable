/**
 * The Metis-style conversation rail.
 *
 * Mission summaries remain the source of truth, while the presentation adds
 * the search, new-chat and settings affordances that make the rail feel like a
 * persistent workspace rather than a board index.
 * @module @dsh-portable/crew-ui/client/shell/MissionRail
 */

import { useMemo, useState, useSyncExternalStore } from 'react'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  IconFolderOpen16,
  IconNewChatOutline16,
  IconPanelLeftOutline16,
  IconPlusOutline16,
  IconSearchOutline16,
  IconSettingsOutline16,
  IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import css from './MissionRail.module.css'

/** Props of the mission rail. */
export interface MissionRailProps {
  readonly collapsed: boolean
  readonly currentSessionId: SessionId | undefined
  onSelect(sessionId: SessionId): void
  onNewMission(): void
  onOpenWorkspace(): void
  onCollapse(): void
  onOpenSettings(): void
}

/** One mission row as the rail needs it. */
interface MissionRow {
  readonly id: SessionId
  readonly title: string
}

/** The left conversation rail. */
export function MissionRail({
  collapsed,
  currentSessionId,
  onSelect,
  onNewMission,
  onOpenWorkspace,
  onCollapse,
  onOpenSettings,
}: MissionRailProps) {
  const runtime = useRuntime()
  const { t } = runtime
  const [query, setQuery] = useState('')
  const list = useSyncExternalStore(
    runtime.sessions.list.subscribe,
    runtime.sessions.list.getSnapshot,
    runtime.sessions.list.getSnapshot,
  )

  const missions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return list.ids
      .map((id): SessionSummary | undefined => list.byId[id])
      .filter((summary): summary is SessionSummary => summary !== undefined)
      // A teammate belongs to its mission's Inspector, not beside it. A blank
      // session is shown only while it is current, matching the official rail.
      .filter(summary => summary.origin !== 'subagent' && (!summary.blank || summary.id === currentSessionId))
      .map(summary => ({
        id: summary.id,
        title: summary.displayTitle !== '' ? summary.displayTitle : t('nav.untitled'),
      }))
      .filter(mission => needle === '' || mission.title.toLocaleLowerCase().includes(needle))
  }, [currentSessionId, list, query, t])

  if (collapsed) {
    return (
      <nav className={`${css.root} ${css.collapsed}`} aria-label={t('nav.missions')}>
        <button
          type="button"
          className={css.compactAction}
          title={t('nav.newMission')}
          aria-label={t('nav.newMission')}
          onClick={onNewMission}
        >
          <IconNewChatOutline16 />
        </button>
      </nav>
    )
  }

  return (
    <nav className={css.root} aria-label={t('nav.missions')}>
      <header className={css.head}>
        <button
          type="button"
          className={css.iconButton}
          title={t('nav.collapse')}
          aria-label={t('nav.collapse')}
          onClick={onCollapse}
        >
          <IconPanelLeftOutline16 />
        </button>
        <span className={css.brand}>
          <IconSparkle16 />
          <span>{t('app.title')}</span>
        </span>
        <button
          type="button"
          className={css.iconButton}
          title={t('nav.newMission')}
          aria-label={t('nav.newMission')}
          onClick={onNewMission}
        >
          <IconNewChatOutline16 />
        </button>
      </header>

      <label className={css.search}>
        <IconSearchOutline16 />
        <input
          value={query}
          placeholder={t('nav.searchPlaceholder')}
          aria-label={t('nav.searchPlaceholder')}
          onChange={(event) => { setQuery(event.target.value) }}
        />
      </label>

      <div className={css.sectionHead}>
        <span>{t('nav.missions')}</span>
        <button
          type="button"
          className={css.sectionAction}
          title={t('nav.openWorkspace')}
          aria-label={t('nav.openWorkspace')}
          onClick={onOpenWorkspace}
        >
          <IconPlusOutline16 />
        </button>
      </div>

      <ul className={css.list}>
        {missions.map(mission => (
          <li key={mission.id}>
            <button
              type="button"
              className={`${css.row} ${mission.id === currentSessionId ? css.rowActive : ''}`}
              aria-current={mission.id === currentSessionId ? 'true' : undefined}
              onClick={() => { onSelect(mission.id) }}
            >
              <span className={css.rowIcon} aria-hidden><IconSparkle16 /></span>
              <span className={css.rowTitle}>{mission.title}</span>
            </button>
          </li>
        ))}
      </ul>

      {missions.length === 0
        ? (
          <div className={css.empty}>
            <p className={css.emptyTitle}>{query.trim() === '' ? t('nav.noMissions') : t('nav.noSearchResults')}</p>
            <p className={css.emptyBody}>{query.trim() === '' ? t('nav.noMissionsBody') : t('nav.noSearchResultsBody')}</p>
            {query.trim() === ''
              ? (
                <button type="button" className={css.workspaceAction} onClick={onOpenWorkspace}>
                  <IconFolderOpen16 />
                  <span>{t('nav.openWorkspace')}</span>
                </button>
              )
              : null}
          </div>
        )
        : null}

      <footer className={css.footer}>
        <button type="button" className={css.footerAction} onClick={onOpenWorkspace}>
          <IconFolderOpen16 />
          <span>{t('nav.openWorkspace')}</span>
        </button>
        <button type="button" className={css.footerAction} onClick={onOpenSettings}>
          <IconSettingsOutline16 />
          <span>{t('settings.title')}</span>
        </button>
      </footer>
    </nav>
  )
}
