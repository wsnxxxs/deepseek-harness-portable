/**
 * The left rail: the primary task action, the workspace/task tree, and the
 * account foot.
 *
 * The tree is the Session Controller's list grouped by the durable Workspace
 * registry — the same two stores the official sidebar reads — so a task
 * started in either surface appears in both.
 * @module @dsh-portable/zcode-ui/client/shell/LeftRail
 */

import { useCallback, useMemo, useState } from 'react'
import {
  Button as PrimitiveButton, IconArchiveOutline20, IconCordisPluginOutline14,
  IconChevronDownOutline14, IconChevronRightOutline14, IconDataOutline16,
  IconEllipsisOutline16, IconNewChatOutline16,
  IconRightUpOutline16, IconSettingsOutline16, IconSparkle16, IconTrashOutline16,
  IconUserOutline16, Modal, relativeTime,
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
              <span className={css.avatar} aria-hidden><IconUserOutline16 /></span>
              <span className={css.footName}>{t('app.title')}</span>
            </>
          )}
          rows={[
            {
              id: 'settings',
              label: t('nav.settings'),
              icon: <IconSettingsOutline16 />,
              onSelect: () => { navigation.openSettings('general') },
            },
            {
              id: 'usage',
              label: t('account.usage'),
              icon: <IconDataOutline16 />,
              onSelect: () => { navigation.openSettings('usage') },
            },
            {
              id: 'plugins',
              label: t('nav.plugins'),
              icon: <IconCordisPluginOutline14 size={16} />,
              onSelect: () => { navigation.openSettings('plugins') },
            },
            {
              id: 'official',
              label: t('top.officialUi'),
              icon: <IconRightUpOutline16 />,
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
