/**
 * The left rail: the primary task action, the workspace/task tree, and the
 * account foot.
 *
 * The tree is the Session Controller's list grouped by the durable Workspace
 * registry — the same two stores the official sidebar reads — so a task
 * started in either surface appears in both.
 * @module @dsh-portable/dcode-ui/client/shell/LeftRail
 */

import { type ReactNode, useCallback, useMemo, useState } from 'react'
import {
  Button as PrimitiveButton, IconArchiveOutline20, IconCordisPluginOutline14,
  IconChevronDownOutline14, IconChevronRightOutline14,
  IconEllipsisOutline16, IconNewChatOutline16,
  IconSparkle16, IconTrashOutline16, Modal, relativeTime,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import { commandShortcut } from '../platform.ts'
import { useRuntime } from '../state/runtime.ts'
import { useSessionList, useWorkspaceGroups } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useNavigation, type NavigationStore } from '../state/navigation.ts'
import { EmptyState, Popover, ui } from './ui.tsx'
import css from './LeftRail.module.css'

/** Props of the left rail. */
export interface LeftRailProps {
  readonly navigation: NavigationStore
  readonly onNewTask: () => void
}

/** Suffix per relative-time bucket; `now` shows the bare word. */
const AGE_SUFFIX: Record<string, string> = {
  minutes: 'm', hours: 'h', days: 'd', months: 'mo', years: 'y',
}

/** The compact outline language used by the account menu. */
function AccountGlyph({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

function AccountUserGlyph() {
  return (
    <AccountGlyph>
      <circle cx="10" cy="7.1" r="2.55" />
      <path d="M4.9 16.2c.55-2.35 2.35-3.6 5.1-3.6s4.55 1.25 5.1 3.6" />
    </AccountGlyph>
  )
}

function AccountSettingsGlyph() {
  return (
    <AccountGlyph>
      <circle cx="10" cy="10" r="2.45" />
      <path d="M10 2.9v1.55M10 15.55v1.55M2.9 10h1.55M15.55 10h1.55M4.98 4.98l1.1 1.1M13.92 13.92l1.1 1.1M15.02 4.98l-1.1 1.1M6.08 13.92l-1.1 1.1" />
      <path d="M12.2 3.45l.55 1.55 1.5.65 1.5-.5 1.1 1.1-.5 1.5.65 1.5 1.55.55v1.55l-1.55.55-.65 1.5.5 1.5-1.1 1.1-1.5-.5-1.5.65-.55 1.55H10" />
    </AccountGlyph>
  )
}

function AccountUsageGlyph() {
  return (
    <AccountGlyph>
      <ellipse cx="8.2" cy="4.6" rx="4.55" ry="2" />
      <path d="M3.65 4.6v4.25c0 1.1 2.05 2 4.55 2s4.55-.9 4.55-2V4.6" />
      <path d="M3.65 8.85v4.25c0 1.1 2.05 2 4.55 2s4.55-.9 4.55-2V8.85" />
      <path d="M15.2 11.1v4.2M13.1 13.2h4.2" />
    </AccountGlyph>
  )
}

function AccountPluginsGlyph() {
  return (
    <AccountGlyph>
      <circle cx="10" cy="3.8" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="16.2" r="1" fill="currentColor" stroke="none" />
      <circle cx="3.8" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="10" r="1" fill="currentColor" stroke="none" />
      <path d="M6.2 6.2l1.55 1.55M12.25 12.25l1.55 1.55M13.8 6.2l-1.55 1.55M7.75 12.25L6.2 13.8" />
      <circle cx="10" cy="10" r="2.1" />
    </AccountGlyph>
  )
}

function AccountExternalGlyph() {
  return (
    <AccountGlyph>
      <path d="M5.2 14.8L15.9 4.1M10.1 4.1h5.8v5.8" />
      <path d="M14.5 12.6v2.7c0 .55-.45 1-1 1H5.1c-.55 0-1-.45-1-1V6.9c0-.55.45-1 1-1h2.7" />
    </AccountGlyph>
  )
}

/** Compact relative age of a session's last update. */
function useAge(): (updatedAt: number) => string {
  return useCallback((updatedAt: number) => {
    const { unit, n } = relativeTime(updatedAt, Date.now())
    if (unit === 'now') return '·'
    return `${String(n)}${AGE_SUFFIX[unit] ?? ''}`
  }, [])
}

/** One session row. */
function SessionRow(props: {
  session: SessionSummary
  current: boolean
  onOpen: () => void
  onArchive: () => void
  onDelete: () => void
  age: string
}) {
  const { session, current } = props
  const t = useT()
  return (
    <div className={css.rowShell}>
      <button
        type="button"
        className={`${css.row} ${current ? css.rowActive : ''}`}
        onClick={props.onOpen}
        title={session.displayTitle}
      >
        {session.running
          ? <span className={`${css.dot} ${css.dotRunning}`} aria-hidden />
          : session.completed === true
            ? <span className={`${css.dot} ${css.dotDone}`} aria-hidden />
            : <span className={css.dot} aria-hidden />}
        <span className={css.rowTitle}>{session.displayTitle}</span>
        <span className={css.rowTime}>{props.age}</span>
      </button>
      <Popover
        label={t('top.moreActions')}
        placement="down"
        align="end"
        triggerClassName={css.rowMenu}
        trigger={<IconEllipsisOutline16 />}
        rows={[
          {
            id: 'archive',
            label: t('session.archive'),
            icon: <IconArchiveOutline20 size={16} />,
            onSelect: props.onArchive,
          },
          {
            id: 'delete',
            label: t('session.delete'),
            icon: <IconTrashOutline16 />,
            danger: true,
            onSelect: props.onDelete,
          },
        ]}
      />
    </div>
  )
}

/** The task action, scrollable navigation/tree, and account foot. */
export function LeftRail({ navigation, onNewTask }: LeftRailProps) {
  const runtime = useRuntime()
  const t = useT()
  const state = useNavigation(navigation)
  const list = useSessionList()
  const { groups, ungrouped } = useWorkspaceGroups()
  const age = useAge()
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | undefined>()
  const [deleting, setDeleting] = useState(false)

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }, [])

  const hasRows = useMemo(
    () => ungrouped.length > 0 || groups.some(group => group.sessions.length > 0),
    [groups, ungrouped],
  )

  return (
    <nav className={css.rail} aria-label={t('app.title')}>
      <div className={css.top}>
        <button type="button" className={css.action} onClick={onNewTask}>
          <IconNewChatOutline16 />
          <span className={ui.grow}>{t('nav.newTask')}</span>
          <span className={css.shortcut}>{commandShortcut('N')}</span>
        </button>
      </div>

      <div className={`${css.tree} ${ui.scroll}`}>
        <div className={css.treeActions}>
          <button
            type="button"
            className={`${css.action} ${state.view === 'settings' && state.settingsSection === 'plugins' ? css.actionActive : ''}`}
            onClick={() => { navigation.openSettings('plugins') }}
          >
            <IconCordisPluginOutline14 size={16} />
            <span className={ui.grow}>{t('nav.plugins')}</span>
          </button>
          <button
            type="button"
            className={`${css.action} ${state.view === 'learning' ? css.actionActive : ''}`}
            onClick={() => { navigation.show('learning') }}
          >
            <IconSparkle16 />
            <span className={ui.grow}>{t('nav.learning')}</span>
          </button>
        </div>
        {hasRows
          ? (
            <>
              {groups.map(group => (
                <div className={css.group} key={group.workspaceId}>
                  <button
                    type="button"
                    className={css.groupHeader}
                    onClick={() => { toggleGroup(group.workspaceId) }}
                    title={group.path}
                  >
                    {collapsed.has(group.workspaceId) ? <IconChevronRightOutline14 /> : <IconChevronDownOutline14 />}
                    <span className={css.groupName}>{group.title}</span>
                  </button>
                  {collapsed.has(group.workspaceId)
                    ? null
                    : group.sessions.map(session => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        current={session.id === list.current}
                        age={age(session.updatedAt)}
                        onOpen={() => {
                          navigation.show('session')
                          runtime.sessions.open(session.id)
                        }}
                        onArchive={() => { void runtime.navigation?.archiveSession(session.id) }}
                        onDelete={() => { setDeleteTarget(session) }}
                      />
                    ))}
                </div>
              ))}
              {ungrouped.length === 0
                ? null
                : (
                  <div className={css.group}>
                    <div className={css.groupHeader}>
                      <span className={css.groupName}>{t('nav.ungrouped')}</span>
                    </div>
                    {ungrouped.map(session => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        current={session.id === list.current}
                        age={age(session.updatedAt)}
                        onOpen={() => {
                          navigation.show('session')
                          runtime.sessions.open(session.id)
                        }}
                        onArchive={() => { void runtime.navigation?.archiveSession(session.id) }}
                        onDelete={() => { setDeleteTarget(session) }}
                      />
                    ))}
                  </div>
                )}
            </>
          )
          : <EmptyState>{t('nav.noTasks')}</EmptyState>}
      </div>

      <div className={css.foot}>
        <Popover
          label={t('account.menu')}
          placement="up"
          align="start"
          style={{ flex: 1 }}
          triggerClassName={css.accountTrigger}
          trigger={(
            <>
              <span className={css.avatar} aria-hidden><AccountUserGlyph /></span>
              <span className={css.footName}>{t('app.title')}</span>
            </>
          )}
          rows={[
            {
              id: 'settings',
              label: t('nav.settings'),
              icon: <AccountSettingsGlyph />,
              onSelect: () => { navigation.openSettings('general') },
            },
            {
              id: 'usage',
              label: t('account.usage'),
              icon: <AccountUsageGlyph />,
              onSelect: () => { navigation.openSettings('usage') },
            },
            {
              id: 'plugins',
              label: t('nav.plugins'),
              icon: <AccountPluginsGlyph />,
              onSelect: () => { navigation.openSettings('plugins') },
            },
            {
              id: 'official',
              label: t('top.officialUi'),
              icon: <AccountExternalGlyph />,
              onSelect: () => { runtime.mode.set('official') },
            },
          ]}
        />
      </div>
      <Modal
        open={deleteTarget !== undefined}
        onClose={() => { if (!deleting) setDeleteTarget(undefined) }}
        title={t('session.deleteTitle')}
        closeLabel={t('common.close')}
        description={t('session.deleteBody')}
        footer={(
          <>
            <PrimitiveButton
              variant="outline"
              autoFocus
              disabled={deleting}
              onClick={() => { if (!deleting) setDeleteTarget(undefined) }}
            >
              {t('common.cancel')}
            </PrimitiveButton>
            <PrimitiveButton
              variant="outline"
              className={css.deleteConfirm}
              disabled={deleting}
              onClick={() => {
                const target = deleteTarget
                if (target === undefined || deleting) return
                setDeleting(true)
                void runtime.sessions.delete(target.id)
                  .then(() => { setDeleteTarget(undefined) })
                  .catch(() => {})
                  .finally(() => { setDeleting(false) })
              }}
            >
              {t('session.delete')}
            </PrimitiveButton>
          </>
        )}
      />
    </nav>
  )
}
