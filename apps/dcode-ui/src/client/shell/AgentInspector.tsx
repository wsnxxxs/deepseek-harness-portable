/**
 * DCode-native Inspector content for the DCode workbench.
 *
 * The component hierarchy follows the DCode Files Changed / Plan / Subagents
 * stack, but each row is backed by an existing DSH source: Git status,
 * projections, Session Controller catalogs, and the child conversation feed.
 * @module @dsh-portable/dcode-ui/client/shell/AgentInspector
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  IconCheckOutline14, IconChevronLeftOutline14,
  IconChevronRightOutline14, IconCodeOutline16, IconRefreshOutline14,
  IconSparkle16, IconUserOutline16, IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SubagentCatalogSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import { useChatSnapshot, useConversationBlank, useProjectionValue, useSessionList, useSessionSnapshot } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useRuntime } from '../state/runtime.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import type { GitFileChange } from '../rpc.ts'
import { formatToolDuration, messageText, resultText } from '../chat/tools.ts'
import { Transcript } from '../chat/Transcript.tsx'
import { Button, CopyButton, EmptyState, IconButton, Pill, Spinner, ui } from './ui.tsx'
import css from './AgentInspector.module.css'

type CatalogEntry = SubagentCatalogSnapshot['entries'][number]
export type SubagentChildEntry = Extract<CatalogEntry, { kind: 'child' }>

interface TimingProjection {
  readonly settledMs: number
  readonly active?: { readonly since: number; readonly through: number }
}

function elapsedMs(timing: TimingProjection | undefined, activity: 'running' | 'inactive', now: number): number | undefined {
  if (timing === undefined) return undefined
  if (timing.active === undefined) return timing.settledMs
  return timing.settledMs + Math.max(0, (activity === 'running' ? now : timing.active.through) - timing.active.since)
}

function entryLabel(entry: SubagentChildEntry): string {
  return entry.label?.trim() || String(entry.id)
}

function fileStatusMark(file: GitFileChange): string {
  switch (file.status) {
    case 'added': return 'A'
    case 'deleted': return 'D'
    case 'renamed': return 'R'
    case 'untracked': return 'U'
    case 'conflicted': return '!'
    default: return 'M'
  }
}

/** DCode's compact Files Changed section, using the DCode Git host channel. */
export function ChangedFilesOverview({
  cwd,
  sessionId,
  onOpenDiff,
}: {
  readonly cwd: string | undefined
  readonly sessionId: SessionId | undefined
  readonly onOpenDiff: (path: string, staged: boolean) => void
}) {
  const t = useT()
  const git = useGitStatus(cwd, sessionId)
  const [open, setOpen] = useState(true)
  const files = git.status?.files ?? []
  const totals = git.status === undefined ? undefined : `${git.status.insertions}+ / ${git.status.deletions}-`

  return (
    <section className={css.section}>
      <button type="button" className={css.sectionToggle} aria-expanded={open} onClick={() => { setOpen(value => !value) }}>
        <IconChevronRightOutline14 className={open ? css.chevronOpen : undefined} />
        <IconCodeOutline16 />
        <span className={ui.grow}>{t('git.changes')}</span>
        {totals === undefined ? null : <span className={css.sectionMeta}>{totals}</span>}
        <Pill>{files.length}</Pill>
      </button>
      {open
        ? (
          <div className={css.fileList}>
            {git.pending
              ? <EmptyState><Spinner size="sm" /></EmptyState>
              : git.error !== undefined
                ? <EmptyState>{git.error}</EmptyState>
                : files.length === 0
                  ? <EmptyState>{t('git.clean')}</EmptyState>
                  : files.map(file => (
                    <button
                      key={`${String(file.staged)}:${file.path}`}
                      type="button"
                      className={css.fileRow}
                      title={file.path}
                      onClick={() => { onOpenDiff(file.path, file.staged) }}
                    >
                      <span className={`${css.fileMark} ${file.status === 'deleted' ? css.fileMarkRemoved : file.status === 'added' || file.status === 'untracked' ? css.fileMarkAdded : ''}`} aria-hidden>{fileStatusMark(file)}</span>
                      <span className={css.fileCopy}>
                        <span className={css.fileName}>{file.path.split('/').pop() ?? file.path}</span>
                        <span className={css.filePath}>{file.path}</span>
                      </span>
                      {file.insertions === 0 && file.deletions === 0
                        ? null
                        : <span className={css.fileStats}><span>+{file.insertions}</span><span>−{file.deletions}</span></span>}
                    </button>
                  ))}
            {git.status?.truncated === true ? <div className={css.truncated}>{t('git.truncated')}</div> : null}
          </div>
        )
        : null}
    </section>
  )
}

function SubagentRow({
  entry,
  selected,
  onSelect,
}: {
  readonly entry: SubagentChildEntry
  readonly selected: boolean
  readonly onSelect: () => void
}) {
  const t = useT()
  const session = useSessionSnapshot(entry.id)
  const timing = useProjectionValue<TimingProjection>(entry.id, 'subagentTiming')
  const [now, setNow] = useState(Date.now)
  const running = entry.activity === 'running' || session?.running === true
  const duration = elapsedMs(timing, running ? 'running' : 'inactive', now)

  useEffect(() => {
    if (!running || timing?.active === undefined) return undefined
    const timer = window.setInterval(() => { setNow(Date.now()) }, 1000)
    return () => { window.clearInterval(timer) }
  }, [running, timing?.active])

  return (
    <button type="button" className={`${css.agentRow} ${selected ? css.agentRowActive : ''}`} onClick={onSelect} title={t('agents.open')}>
      <span className={`${css.agentStatus} ${running ? css.agentStatusRunning : css.agentStatusIdle}`} aria-hidden>
        {running ? <Spinner size="sm" /> : session?.lastAgentError ? <IconWarningOutline16 /> : <IconCheckOutline14 />}
      </span>
      <span className={css.agentCopy}>
        <span className={css.agentName}>{entryLabel(entry)}</span>
        <span className={css.agentMeta}>
          {running ? t('agents.running') : session?.lastAgentError ? t('agents.executionError') : t('agents.inactive')}
          <span aria-hidden>·</span>
          {entry.mode === 'continuable' ? t('agents.continuable') : t('agents.oneShot')}
          {entry.hasChildren ? <><span aria-hidden>·</span>{t('agents.children', { count: 1 })}</> : null}
        </span>
      </span>
      {duration === undefined ? null : <span className={css.agentDuration}>{formatToolDuration(duration)}</span>}
      <IconChevronRightOutline14 className={css.rowChevron} />
    </button>
  )
}

/** DCode's Subagents section over Session Controller's live direct-child catalog. */
export function SubagentsPanel({
  sessionId,
  selectedId,
  onSelect,
}: {
  readonly sessionId: SessionId | undefined
  readonly selectedId?: SessionId
  readonly onSelect: (entry: SubagentChildEntry) => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const [open, setOpen] = useState(true)
  const catalog = sessionId === undefined ? undefined : list.subagentsByParent[sessionId]

  useEffect(() => {
    if (sessionId === undefined) return undefined
    runtime.sessions.setSubagentCatalogOpen(sessionId, true)
    return () => { runtime.sessions.setSubagentCatalogOpen(sessionId, false) }
  }, [runtime, sessionId])

  const refresh = useCallback(() => {
    if (sessionId !== undefined) void runtime.sessions.refreshSubagents(sessionId)
  }, [runtime, sessionId])
  const entries = catalog?.entries ?? []
  const children = entries.filter((entry): entry is SubagentChildEntry => entry.kind === 'child')
  const diagnostics = entries.filter(entry => entry.kind === 'diagnostic')
  const running = children.filter(entry => entry.activity === 'running').length

  return (
    <section className={css.section}>
      <div className={css.sectionHeader}>
        <button type="button" className={css.sectionToggle} aria-expanded={open} onClick={() => { setOpen(value => !value) }}>
          <IconChevronRightOutline14 className={open ? css.chevronOpen : undefined} />
          <IconUserOutline16 />
          <span className={ui.grow}>{t('agents.title')}</span>
          {running === 0 ? null : <span className={css.runningPill}>{t('agents.running')} {running}</span>}
          <Pill>{children.length}</Pill>
        </button>
        <IconButton label={t('agents.refresh')} className={css.refreshButton} onClick={refresh}>
          <IconRefreshOutline14 />
        </IconButton>
      </div>
      {open
        ? (
          <div className={css.agentList}>
            {sessionId === undefined
              ? <EmptyState>{t('composer.needsSession')}</EmptyState>
              : catalog === undefined || catalog.state === 'loading' && catalog.entries.length === 0
                ? <EmptyState><Spinner size="sm" /></EmptyState>
                : catalog.state === 'error'
                  ? <EmptyState>{catalog.error?.message ?? t('common.error')}</EmptyState>
                  : children.length === 0 && diagnostics.length === 0
                    ? <EmptyState>{t('agents.emptyBody')}</EmptyState>
                    : (
                      <>
                        {children.map(entry => (
                          <SubagentRow
                            key={entry.id}
                            entry={entry}
                            selected={entry.id === selectedId}
                            onSelect={() => { onSelect(entry) }}
                          />
                        ))}
                        {diagnostics.map(entry => (
                          <div key={entry.id} className={css.diagnosticRow}>
                            <IconWarningOutline16 />
                            <span>{t('agents.diagnostic', { reason: entry.reason })}</span>
                          </div>
                        ))}
                      </>
                    )}
          </div>
        )
        : null}
    </section>
  )
}

function nodeLogText(node: ConversationNode): string {
  const raw = node as unknown as { readonly content?: readonly ContentBlock[]; readonly call?: { readonly name?: string; readonly argsRaw?: string }; readonly isError?: boolean }
  if (Array.isArray(raw.content)) {
    const text = node.kind === 'tool-result' ? resultText(raw.content) : messageText(raw.content)
    if (text !== '') return text
  }
  if (raw.call?.name !== undefined) return `${raw.call.name} ${raw.call.argsRaw ?? ''}`.trim()
  return JSON.stringify(node)
}

function childLog(nodes: readonly ConversationNode[], entry: SubagentChildEntry): string {
  const rows = nodes.map(node => `${node.kind}: ${nodeLogText(node)}`)
  return rows.length === 0
    ? `${entryLabel(entry)}\n${entry.mode === 'continuable' ? 'continuable' : 'one-shot'}`
    : rows.join('\n\n')
}

function childTask(nodes: readonly ConversationNode[], fallback: string): string {
  for (const node of nodes) {
    if (node.kind !== 'user' && node.kind !== 'steering') continue
    const raw = node as unknown as { readonly content?: readonly ContentBlock[] }
    const text = Array.isArray(raw.content) ? messageText(raw.content).trim() : ''
    if (text !== '') return text
  }
  return fallback
}

/** Detailed child view, following DCode's back / copy-log / transcript pattern. */
export function SubagentDetailPanel({
  parentSessionId,
  entry,
  navigation,
  onBack,
}: {
  readonly parentSessionId: SessionId
  readonly entry: SubagentChildEntry
  readonly navigation: NavigationStore
  readonly onBack: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const session = useSessionSnapshot(entry.id)
  const chat = useChatSnapshot(entry.id)
  const blank = useConversationBlank(entry.id)
  const parentCwd = list.byId[parentSessionId]?.cwd
  const cwd = list.byId[entry.id]?.cwd ?? parentCwd
  const [now, setNow] = useState(Date.now)
  const timing = useProjectionValue<TimingProjection>(entry.id, 'subagentTiming')
  const running = entry.activity === 'running' || session?.running === true
  const duration = elapsedMs(timing, running ? 'running' : 'inactive', now)
  const address = {
    parentSessionId,
    childSessionId: entry.id,
    mode: entry.mode,
  } as const

  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => { setNow(Date.now()) }, 1000)
    return () => { window.clearInterval(timer) }
  }, [running])

  const openFull = useCallback(() => {
    runtime.sessions.openSubagent(address)
  }, [address, runtime])
  const log = useMemo(() => childLog(chat?.legacy.nodes ?? [], entry), [chat?.legacy.nodes, entry])
  const task = useMemo(() => childTask(chat?.legacy.nodes ?? [], entryLabel(entry)), [chat?.legacy.nodes, entry])
  const error = session?.lastAgentError

  return (
    <div className={css.detail}>
      <header className={css.detailHeader}>
        <button type="button" className={css.backButton} onClick={onBack}>
          <IconChevronLeftOutline14 />
          <span>{t('agents.back')}</span>
        </button>
        <span className={css.detailStatus} data-running={running ? '' : undefined}>
          {running ? <Spinner size="sm" /> : error ? <IconWarningOutline16 /> : <IconCheckOutline14 />}
          {running ? t('agents.running') : error ? t('agents.executionError') : t('agents.inactive')}
        </span>
      </header>
      <div className={css.detailHeading}>
        <span className={css.detailAvatar} aria-hidden><IconSparkle16 /></span>
        <div className={css.detailTitleCopy}>
          <h3>{entryLabel(entry)}</h3>
          <span>{entry.mode === 'continuable' ? t('agents.continuable') : t('agents.oneShot')}{duration === undefined ? '' : ` · ${formatToolDuration(duration)}`}</span>
        </div>
        <CopyButton text={log} label={t('agents.copyLog')} copiedLabel={t('agents.copied')} />
      </div>
      <section className={css.taskBubble}>
        <span className={css.taskLabel}>{t('agents.task')}</span>
        <span>{task}</span>
      </section>
      {error === undefined ? null : <div className={css.detailError} role="alert"><IconWarningOutline16 />{error}</div>}
      {runtime.binding(entry.id) === undefined
        ? <EmptyState>{t('agents.noTranscript')}</EmptyState>
        : (
          <div className={css.childTranscript}>
            <Transcript navigation={navigation} sessionId={entry.id} cwd={cwd} blank={blank} compact />
          </div>
        )}
      <Button primary onClick={openFull}>{t('agents.openFull')}</Button>
    </div>
  )
}
