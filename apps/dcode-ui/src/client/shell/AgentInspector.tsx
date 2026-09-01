/**
 * DCode-native Inspector content for the DCode workbench.
 *
 * The component hierarchy follows the DCode Plan / Subagents stack, but each
 * row is backed by an existing DSH source: projections, Session Controller
 * catalogs, and the child conversation feed.
 * @module @dsh-portable/dcode-ui/client/shell/AgentInspector
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  IconCheckOutline14, IconChevronLeftOutline14,
  IconChevronRightOutline14, IconCloseOutline16, IconRefreshOutline14,
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
import { formatToolDuration, messageText, resultText } from '../chat/tools.ts'
import { Transcript } from '../chat/Transcript.tsx'
import { Button, CopyButton, EmptyState, IconButton, Pill, Spinner, ui } from './ui.tsx'
import { useModalFocus } from './use-modal-focus.ts'
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

/** Centered full-session reader opened over the workbench. */
export function SubagentConversationDialog({
  parentSessionId,
  entry,
  navigation,
  onClose,
}: {
  readonly parentSessionId: SessionId
  readonly entry: SubagentChildEntry
  readonly navigation: NavigationStore
  readonly onClose: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const list = useSessionList()
  const session = useSessionSnapshot(entry.id)
  const chat = useChatSnapshot(entry.id)
  const blank = useConversationBlank(entry.id)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()
  const address = useMemo(() => ({
    parentSessionId,
    childSessionId: entry.id,
    mode: entry.mode,
  } as const), [entry.id, entry.mode, parentSessionId])
  const [openFailure, setOpenFailure] = useState<string>()
  const parentCwd = list.byId[parentSessionId]?.cwd
  const cwd = list.byId[entry.id]?.cwd ?? parentCwd
  const running = entry.activity === 'running' || session?.running === true
  const log = useMemo(() => childLog(chat?.legacy.nodes ?? [], entry), [chat?.legacy.nodes, entry])
  const transcriptReady = session?.openState === 'open' && chat !== undefined
  const transcriptError = openFailure
    ?? (session?.openState === 'error' ? session.openError?.message ?? t('common.error') : undefined)

  useModalFocus(true, panelRef, { initialFocusRef: closeRef, onClose })

  useLayoutEffect(() => {
    setOpenFailure(undefined)
    try {
      runtime.sessions.openSubagent(address)
    } catch (cause: unknown) {
      setOpenFailure(cause instanceof Error ? cause.message : String(cause))
    }
  }, [address, runtime])

  return (
    <div className={css.conversationOverlay} role="presentation">
      <div className={css.conversationMask} aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        className={css.conversationPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className={css.conversationHeader}>
          <div className={css.conversationTitleCopy}>
            <div className={css.conversationEyebrow}>{t('agents.openFull')}</div>
            <h2 id={titleId}>{entryLabel(entry)}</h2>
            <span className={css.conversationMeta}>
              {running ? t('agents.running') : t('agents.inactive')}
              <span aria-hidden>·</span>
              {entry.mode === 'continuable' ? t('agents.continuable') : t('agents.oneShot')}
            </span>
          </div>
          <div className={css.conversationActions}>
            <CopyButton text={log} label={t('agents.copyLog')} copiedLabel={t('agents.copied')} />
            <button ref={closeRef} type="button" className={css.conversationClose} onClick={onClose} aria-label={t('common.close')}>
              <IconCloseOutline16 />
            </button>
          </div>
        </header>
        <div className={css.conversationBody}>
          {transcriptError !== undefined
            ? <EmptyState>{transcriptError}</EmptyState>
            : !transcriptReady
              ? <EmptyState><Spinner size="md" />{t('chat.loading')}</EmptyState>
              : <Transcript navigation={navigation} sessionId={entry.id} cwd={cwd} blank={blank} />}
        </div>
      </div>
    </div>
  )
}

/** Detailed child view, following DCode's back / copy-log / transcript pattern. */
export function SubagentDetailPanel({
  parentSessionId,
  entry,
  navigation,
  onBack,
  onOpenFull,
}: {
  readonly parentSessionId: SessionId
  readonly entry: SubagentChildEntry
  readonly navigation: NavigationStore
  readonly onBack: () => void
  readonly onOpenFull: () => void
}) {
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
  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => { setNow(Date.now()) }, 1000)
    return () => { window.clearInterval(timer) }
  }, [running])

  const log = useMemo(() => childLog(chat?.legacy.nodes ?? [], entry), [chat?.legacy.nodes, entry])
  const task = useMemo(() => childTask(chat?.legacy.nodes ?? [], entryLabel(entry)), [chat?.legacy.nodes, entry])
  const error = session?.lastAgentError
  const transcriptError = session?.openState === 'error'
    ? session.openError?.message ?? t('common.error')
    : undefined
  const transcriptReady = session?.openState === 'open' && chat !== undefined

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
      <div className={css.childTranscript}>
        {transcriptError !== undefined
          ? <EmptyState>{transcriptError}</EmptyState>
          : !transcriptReady
            ? <EmptyState><Spinner size="sm" />{t('chat.loading')}</EmptyState>
            : <Transcript navigation={navigation} sessionId={entry.id} cwd={cwd} blank={blank} compact />}
      </div>
      <Button primary onClick={onOpenFull}>{t('agents.openFull')}</Button>
    </div>
  )
}
