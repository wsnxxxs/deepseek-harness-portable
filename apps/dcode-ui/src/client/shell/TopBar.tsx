/**
 * The top bar: what is being worked on, where, and on which branch — plus
 * Session sharing and the inspector toggle.
 *
 * Every value is read live: the title comes from the Session Controller's
 * display title, the workspace from the durable registry, and the branch from
 * the same git read the Changes panel uses.
 * @module @dsh-portable/dcode-ui/client/shell/TopBar
 */

import { useMemo, useSyncExternalStore } from 'react'
import {
  IconBranchOutline16, IconChevronDownOutline14, IconFolderOpen16, IconFolderOpenOutline16,
  IconPanelLeftOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime, type SessionLogDownloadState } from '../state/runtime.ts'
import { useSessionList, useWorkspaceGroups } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useNavigation, type NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import { IconButton, Popover, ui } from './ui.tsx'
import css from './TopBar.module.css'
import { TopBarDownloadIcon, TopBarListIcon } from './TopBarIcons.tsx'

const EMPTY_SESSION_LOG_STATE: SessionLogDownloadState = { bySession: {} }
const EMPTY_SUBSCRIBE = (_listener: () => void): (() => void) => () => {}
const EMPTY_SNAPSHOT = (): SessionLogDownloadState => EMPTY_SESSION_LOG_STATE

/** Props of the top bar. */
export interface TopBarProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
}

/** Task context, the left session rail toggle, sharing, and inspector control. */
export function TopBar({ navigation, sessionId, cwd }: TopBarProps) {
  const runtime = useRuntime()
  const t = useT()
  const state = useNavigation(navigation)
  const list = useSessionList()
  const { groups } = useWorkspaceGroups()
  const git = useGitStatus(cwd, sessionId)
  const sessionLogDownload = runtime.sessionLogDownload
  const sessionLogState = useSyncExternalStore(
    sessionLogDownload?.store.subscribe ?? EMPTY_SUBSCRIBE,
    sessionLogDownload?.store.getSnapshot ?? EMPTY_SNAPSHOT,
    sessionLogDownload?.store.getSnapshot ?? EMPTY_SNAPSHOT,
  )

  const title = sessionId === undefined ? undefined : list.byId[sessionId]?.displayTitle
  const workspace = useMemo(
    () => groups.find(group => group.path === cwd) ?? groups.find(group => group.sessions.some(row => row.id === sessionId)),
    [groups, cwd, sessionId],
  )

  const dirty = (git.status?.files.length ?? 0) > 0
  // While the first read is outstanding the chip shows nothing rather than
  // asserting "not a repository" about a directory it has not looked at yet.
  const branchLabel = git.pending
    ? undefined
    : git.status?.repository === true
      ? (git.status.branch ?? (git.status.detached ? 'HEAD' : t('top.branch')))
      : t('top.noRepository')

  const shareEntry = sessionId === undefined
    ? undefined
    : sessionLogState.bySession[String(sessionId)]
  const shareStatus = shareEntry?.status
  const shareBusy = shareStatus === 'downloading'
  const shareLabel = shareBusy
    ? t('top.sharePreparing')
    : shareStatus === 'success'
      ? t('top.shareStarted')
      : shareStatus === 'error'
        ? t('top.shareFailed')
        : t('top.share')
  const shareTooltip = shareEntry?.error ?? (
    shareBusy
      ? t('top.sharePreparing')
      : shareStatus === 'success'
        ? t('top.shareStarted')
        : shareStatus === 'error'
          ? t('top.shareFailed')
          : t('top.shareTooltip')
  )
  const shareClass = shareStatus === 'success'
    ? css.shareSuccess
    : shareStatus === 'error' ? css.shareError : ''

  return (
    <header className={css.bar}>
      <IconButton
        label={state.railOpen ? t('nav.collapse') : t('nav.expand')}
        active={state.railOpen}
        onClick={() => { navigation.toggleRail() }}
      >
        <IconPanelLeftOutline16 />
      </IconButton>
      <span
        className={`${css.title} ${title === undefined ? css.titleMuted : ''}`}
        title={title}
      >
        {title ?? t('top.noSession')}
      </span>

      {workspace === undefined
        ? null
        : (
          <Popover
            label={t('top.workspaceMenu')}
            placement="down"
            triggerClassName={css.workspaceTrigger}
            trigger={(
              <>
                <IconFolderOpenOutline16 />
                <span className={css.chipLabel}>{workspace.title}</span>
                <IconChevronDownOutline14 />
              </>
            )}
            rows={groups.map(group => ({
              id: String(group.workspaceId),
              label: group.title,
              detail: group.path,
              icon: <IconFolderOpen16 />,
              active: group.workspaceId === workspace.workspaceId,
              onSelect: () => { runtime.navigation?.startSession(group.workspaceId) },
            }))}
          />
        )}

      {cwd === undefined || branchLabel === undefined
        ? null
        : (
          <button
            type="button"
            className={`${css.chip} ${dirty ? css.dirty : ''}`}
            title={branchLabel}
            onClick={() => { navigation.openAside('changes') }}
          >
            <IconBranchOutline16 />
            <span className={css.chipLabel}>{branchLabel}</span>
          </button>
        )}

      <span className={css.divider} aria-hidden />
      <div className={css.actions}>
        <button
          type="button"
          className={`${css.shareButton} ${shareClass} ${ui.tooltipTarget}`}
          aria-label={shareTooltip}
          aria-busy={shareBusy}
          data-tooltip={shareTooltip}
          disabled={sessionId === undefined || sessionLogDownload === undefined || shareBusy}
          onClick={() => {
            if (sessionId !== undefined && sessionLogDownload !== undefined) {
              void sessionLogDownload.download(sessionId)
            }
          }}
        >
          <TopBarDownloadIcon size={14} />
          <span className={css.shareLabel}>{shareLabel}</span>
        </button>
        <div className={css.layoutGroup} role="group" aria-label={t('top.layout')}>
          <IconButton
            label={t('top.toggleSummary')}
            className={css.layoutButton}
            active={state.summaryOpen}
            onClick={() => { navigation.toggleSummary() }}
          >
            <TopBarListIcon size={16} />
          </IconButton>
          <IconButton
            label={t('top.togglePreview')}
            className={css.layoutButton}
            active={state.asideOpen}
            onClick={() => { navigation.toggleAside() }}
          >
            <IconPanelLeftOutline16 className={ui.mirrored} size={14} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
