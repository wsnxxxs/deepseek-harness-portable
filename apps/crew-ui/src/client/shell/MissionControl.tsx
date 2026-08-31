/**
 * The Metis-shaped Crew workspace.
 *
 * Crew keeps its domain-specific board, roster and dossier, but presents them
 * through the same information architecture as Metis: a conversation rail,
 * a chat-first centre and an Inspector that can be opened without leaving the
 * current thread.
 * @module @dsh-portable/crew-ui/client/shell/MissionControl
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  IconCloseOutline16,
  IconFolderOpen16,
  IconListPenOutline16,
  IconPanelLeftOutline16,
  IconSparkle16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useBoard, leadSessionId } from '../state/board.ts'
import { useMissionPreset } from '../state/mission-preset.ts'
import { useRuntime } from '../state/runtime.ts'
import { MissionRail } from './MissionRail.tsx'
import { RosterPanel } from './RosterPanel.tsx'
import { BriefView } from './BriefView.tsx'
import { ThreadView } from './ThreadView.tsx'
import { LeadComposer } from './LeadComposer.tsx'
import { CrewSettings } from './CrewSettings.tsx'
import { DossierPanel } from './DossierPanel.tsx'
import { BoardView } from '../board/BoardView.tsx'
import css from './MissionControl.module.css'

/** The Inspector's durable sections. */
const INSPECTOR_TABS = ['crew', 'board', 'brief', 'dossier'] as const

/** One Inspector section. */
type InspectorTab = typeof INSPECTOR_TABS[number]

/** The whole Crew surface. */
export function MissionControl() {
  const runtime = useRuntime()
  const { t, uiModeT } = runtime
  const [railOpen, setRailOpen] = useState(true)
  const [inspectorOpen, setInspectorOpen] = useState(true)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('crew')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const list = useSyncExternalStore(
    runtime.sessions.list.subscribe,
    runtime.sessions.list.getSnapshot,
    runtime.sessions.list.getSnapshot,
  )
  const sessionId = list.current
  const summary = sessionId === undefined ? undefined : list.byId[sessionId]

  const board = useBoard(sessionId)
  const members: readonly TeamMemberView[] = board.view?.members ?? []

  // Switching missions should land the Inspector on its most useful view. The
  // thread itself stays the centre, so a selection never throws away context.
  useEffect(() => { setInspectorTab('crew') }, [sessionId])

  const mission = useMissionPreset(sessionId, summary)

  const newMission = useCallback(() => { mission.start() }, [mission])

  const openWorkspace = useCallback(() => {
    const navigation = runtime.navigation
    if (navigation === undefined) return
    void navigation.pickDirectory()
      .then(async (path) => {
        if (path === null) return
        const workspace = await runtime.workspaces.create({ path })
        mission.start(workspace.workspaceId)
      })
      .catch(() => {
        // The native chooser is optional. Existing workspaces and New mission
        // remain usable when the host has no directory picker.
      })
  }, [mission, runtime])

  const openMember = useCallback(async (member: TeamMemberView) => {
    if (member.role !== 'teammate' || sessionId === undefined) return
    const parentSessionId = leadSessionId(runtime.sessions, sessionId)
    await runtime.sessions.refreshSubagents(parentSessionId)
    runtime.sessions.openSubagent({
      parentSessionId,
      childSessionId: member.id,
      mode: 'continuable',
    })
    setInspectorTab('crew')
  }, [runtime, sessionId])

  const selectMission = useCallback((id: SessionId) => {
    runtime.sessions.open(id)
  }, [runtime])

  // The preset is a durable session projection. It is shown as a small header
  // status, not as a second selector that could disagree with the Host.
  const presetId = useMemo(() => summary?.projectionValues?.agentPreset ?? undefined, [summary])
  const workspaceLabel = summary?.cwd === undefined || summary.cwd === ''
    ? undefined
    : summary.cwd.split(/[\\/]/).filter(Boolean).at(-1)

  return (
    <div className={css.root}>
      <div className={css.workspace}>
        {railOpen
          ? (
            <aside className={css.rail}>
              <MissionRail
                collapsed={false}
                currentSessionId={sessionId}
                onSelect={selectMission}
                onNewMission={newMission}
                onOpenWorkspace={openWorkspace}
                onCollapse={() => { setRailOpen(false) }}
                onOpenSettings={() => { setSettingsOpen(true) }}
              />
            </aside>
          )
          : null}

        <main className={css.center}>
          <header className={css.chatHeader}>
            <div className={css.headerLeft}>
              {!railOpen
                ? (
                  <button
                    type="button"
                    className={css.iconButton}
                    aria-label={t('nav.expand')}
                    onClick={() => { setRailOpen(true) }}
                  >
                    <IconPanelLeftOutline16 />
                  </button>
                )
                : null}
              <span className={css.agentMark} aria-hidden>
                <IconSparkle16 />
              </span>
              <div className={css.headerCopy}>
                <h1 className={css.title}>
                  {summary?.displayTitle ?? t('app.title')}
                </h1>
                <span className={css.subtitle}>{uiModeT('mode.crew')}</span>
              </div>
            </div>

            <div className={css.headerUtilities}>
              {workspaceLabel === undefined
                ? null
                : (
                  <span className={css.workspaceChip} title={summary?.cwd}>
                    <IconFolderOpen16 />
                    {workspaceLabel}
                  </span>
                )}
              <button
                type="button"
                className={css.iconButton}
                aria-label={inspectorOpen ? t('inspector.close') : t('inspector.open')}
                aria-pressed={inspectorOpen}
                onClick={() => { setInspectorOpen(open => !open) }}
              >
                <IconListPenOutline16 />
              </button>
            </div>
          </header>

          {mission.error === undefined
            ? null
            : (
              <div className={css.missionAlert} role="alert">
                <span>{t('nav.missionPresetFailed', { reason: mission.error })}</span>
                <button type="button" onClick={mission.dismiss}>{t('board.dismiss')}</button>
              </div>
            )}

          <div className={css.centerBody}>
            {sessionId === undefined
              ? (
                <div className={css.home}>
                  <span className={css.homeMark} aria-hidden><IconSparkle16 /></span>
                  <h2>{t('thread.empty')}</h2>
                  <p>{t('thread.emptyBody')}</p>
                  <button type="button" className={css.primaryAction} onClick={newMission}>
                    {t('nav.newMission')}
                  </button>
                </div>
              )
              : <ThreadView sessionId={sessionId} />}

            {sessionId === undefined ? null : <LeadComposer sessionId={sessionId} />}
          </div>
        </main>

        {inspectorOpen
          ? (
            <aside className={css.inspector} aria-label={t('inspector.title')}>
              <header className={css.inspectorHead}>
                <h2 className={css.inspectorTitle}>{t('inspector.title')}</h2>
                <button
                  type="button"
                  className={css.iconButton}
                  aria-label={t('inspector.close')}
                  onClick={() => { setInspectorOpen(false) }}
                >
                  <IconCloseOutline16 />
                </button>
              </header>

              <nav className={css.inspectorTabs} role="tablist" aria-label={t('inspector.title')}>
                {INSPECTOR_TABS.map(id => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={inspectorTab === id}
                    className={`${css.inspectorTab} ${inspectorTab === id ? css.inspectorTabActive : ''}`}
                    onClick={() => { setInspectorTab(id) }}
                  >
                    {t(`tab.${id}`)}
                  </button>
                ))}
              </nav>

              <div className={css.inspectorBody}>
                {inspectorTab === 'crew'
                  ? (
                    <RosterPanel
                      members={members}
                      currentSessionId={sessionId}
                      onOpenMember={(member) => { void openMember(member) }}
                    />
                  )
                  : inspectorTab === 'board'
                    ? <BoardView board={board} members={members} />
                    : inspectorTab === 'brief'
                      ? <BriefView view={board.view} presetId={presetId} cwd={summary?.cwd} />
                      : <DossierPanel cwd={summary?.cwd} />}
              </div>
            </aside>
          )
          : null}
      </div>

      {settingsOpen ? <CrewSettings onClose={() => { setSettingsOpen(false) }} /> : null}
    </div>
  )
}
