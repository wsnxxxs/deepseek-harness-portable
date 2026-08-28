/**
 * The top bar: what is being worked on, where, and on which branch — plus the
 * command entry and the two panel toggles.
 *
 * Every value is read live: the title comes from the Session Controller's
 * display title, the workspace from the durable registry, and the branch from
 * the same git read the Changes panel uses.
 * @module @dsh-portable/dcode-ui/client/shell/TopBar
 */

import { useMemo } from 'react'
import {
  IconBranchOutline16, IconDarkOutline16, IconEllipsisOutline16,
  IconFolderOpenOutline16, IconLightOutline16, IconPanelLeftOutline16,
  IconSearchOutline16, IconSettingsOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useSessionList, useWorkspaceGroups } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useNavigation, type NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import { IconButton, Popover, ui } from './ui.tsx'
import { themeMenuRows, useAppearance } from './ThemeSwitch.tsx'
import css from './TopBar.module.css'

/** Props of the top bar. */
export interface TopBarProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
}

/** Task, workspace, branch and the surface controls. */
export function TopBar({ navigation, sessionId, cwd }: TopBarProps) {
  const runtime = useRuntime()
  const t = useT()
  const state = useNavigation(navigation)
  const list = useSessionList()
  const { groups } = useWorkspaceGroups()
  const git = useGitStatus(cwd, sessionId)
  const appearance = useAppearance()

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
          <button
            type="button"
            className={css.chip}
            title={workspace.path}
            onClick={() => { runtime.navigation?.startSession(workspace.workspaceId) }}
          >
            <IconFolderOpenOutline16 />
            <span className={css.chipLabel}>{workspace.title}</span>
          </button>
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

      <IconButton label={t('nav.commandPalette')} onClick={() => { navigation.togglePalette(true) }}>
        <IconSearchOutline16 />
      </IconButton>
      {/* The theme control sits in the bar, not only in settings: it is the
          one appearance choice an operator makes on impulse, when the room
          light changes rather than when they are configuring anything. */}
      <Popover
        label={t('theme.toggle')}
        placement="down"
        align="end"
        disabled={!appearance.canSet}
        trigger={(
          <span className={css.themeGlyph} aria-hidden>
            {appearance.scheme === 'dark' ? <IconDarkOutline16 /> : <IconLightOutline16 />}
          </span>
        )}
        rows={themeMenuRows(t, appearance.preference, appearance.set)}
      />
      <IconButton label={t('nav.settings')} onClick={() => { navigation.openSettings('general') }}>
        <IconSettingsOutline16 />
      </IconButton>
      <IconButton
        label={t('top.toggleAside')}
        active={state.asideOpen}
        onClick={() => { navigation.toggleAside() }}
      >
        <IconPanelLeftOutline16 className={ui.mirrored} />
      </IconButton>
      <Popover
        label={t('top.moreActions')}
        placement="down"
        align="end"
        trigger={<IconEllipsisOutline16 />}
        rows={[
          { id: 'settings', label: t('nav.settings'), onSelect: () => { navigation.openSettings('general') } },
          {
            id: 'official',
            label: t('top.officialUi'),
            detail: t('settings.modeOfficialBody'),
            onSelect: () => { runtime.mode.set('official') },
          },
        ]}
      />
    </header>
  )
}
