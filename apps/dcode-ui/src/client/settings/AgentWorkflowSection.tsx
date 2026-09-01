/** Unified Agent and workflow settings for the DCode workbench. */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import { useAsync, useObservable, useProjectionValue, useSessionList, useSessionSnapshot } from '../state/hooks.ts'
import { useRuntime, type DcodeRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import type { DcodeMemoryState } from '../rpc.ts'
import { Button, EmptyState, Spinner } from '../shell/ui.tsx'
import { SelectMenu } from './SelectMenu.tsx'
import css from './SettingsSurface.module.css'

interface PlanProjectionView {
  readonly active: boolean
  readonly pending: boolean
}

type FollowUpMode = 'one-at-a-time' | 'all'

const BUILTIN_MODE_IDS = ['minimal', 'standard', 'ptc', 'crew'] as const
const MEMORY_ENABLED_KEY = 'dcode.memory.enabled'

function objectValue(source: unknown): Record<string, unknown> {
  return typeof source === 'object' && source !== null && !Array.isArray(source)
    ? source as Record<string, unknown>
    : {}
}

function valueOf(namespace: SettingsNamespaceView | undefined, key: string): unknown {
  return objectValue(namespace?.value)[key]
}

function numberOf(namespace: SettingsNamespaceView | undefined, key: string, fallback: number): number {
  const value = valueOf(namespace, key)
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function booleanOf(namespace: SettingsNamespaceView | undefined, key: string, fallback: boolean): boolean {
  const value = valueOf(namespace, key)
  return typeof value === 'boolean' ? value : fallback
}

function namespaceOf(namespaces: readonly SettingsNamespaceView[], name: string): SettingsNamespaceView | undefined {
  return namespaces.find(namespace => namespace.ns === name)
}

function Section(props: { title: string; body?: string; children?: ReactNode }) {
  return (
    <section className={css.section}>
      <h2 className={css.sectionTitle}>{props.title}</h2>
      {props.body === undefined ? null : <p className={css.sectionBody}>{props.body}</p>}
      {props.children}
    </section>
  )
}

function SettingRow(props: { title: string; body?: string; control?: ReactNode }) {
  return (
    <div className={css.row}>
      <div className={css.rowText}>
        <div className={css.rowTitle}>{props.title}</div>
        {props.body === undefined ? null : <div className={css.rowBody}>{props.body}</div>}
      </div>
      {props.control}
    </div>
  )
}

function Toggle(props: { checked: boolean; disabled?: boolean; label: string; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className={`${css.switch} ${props.checked ? css.switchOn : ''}`}
      aria-label={props.label}
      aria-pressed={props.checked}
      disabled={props.disabled}
      onClick={() => { props.onChange(!props.checked) }}
    >
      <span className={css.switchThumb} />
    </button>
  )
}

function modeBody(id: string, t: ReturnType<typeof useT>): string {
  switch (id) {
    case 'minimal': return t('settings.mode.minimalBody')
    case 'standard': return t('settings.mode.standardBody')
    case 'ptc': return t('settings.mode.ptcBody')
    case 'crew': return t('settings.mode.crewBody')
    default: return t('settings.mode.customBody')
  }
}

function modeName(id: string, fallback: string, t: ReturnType<typeof useT>): string {
  switch (id) {
    case 'minimal': return t('composer.mode.minimal')
    case 'standard': return t('composer.mode.standard')
    case 'ptc': return t('composer.mode.ptc')
    case 'crew': return t('composer.mode.crew')
    default: return fallback
  }
}

async function updateNamespace(
  runtime: DcodeRuntime,
  namespace: SettingsNamespaceView | undefined,
  patch: Record<string, boolean | number | string>,
  unavailableMessage: string,
): Promise<void> {
  if (namespace === undefined) throw new Error(unavailableMessage)
  const result = await runtime.remote.settings.update(namespace.ns, patch, namespace.revision)
  if (!result.ok) throw new Error(result.error.message)
}

function memoryEnabledFromStorage(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(MEMORY_ENABLED_KEY)
    return stored === null ? true : stored === 'true'
  } catch {
    return true
  }
}

interface MemoryResultItem {
  readonly sessionId: string
  readonly snippet: string
  readonly recordId?: string
}

function MemorySection({
  enabled,
  onEnabledChange,
  sessionId,
}: {
  enabled: boolean
  onEnabledChange: (value: boolean) => void
  sessionId: SessionId | undefined
}) {
  const runtime = useRuntime()
  const t = useT()
  const sessionList = useSessionList()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly MemoryResultItem[]>([])
  const [memoryState, setMemoryState] = useState<DcodeMemoryState | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const abortRef = useRef<AbortController | undefined>()
  const currentCwd = sessionId === undefined ? undefined : sessionList.byId[sessionId]?.cwd

  useEffect(() => () => { abortRef.current?.abort() }, [])

  useEffect(() => {
    let active = true
    void runtime.memory.state(currentCwd).then(response => {
      if (!active || !response.ok) return
      setMemoryState(response.value)
      onEnabledChange(response.value.enabled)
    })
    return () => { active = false }
  }, [currentCwd, onEnabledChange, runtime.memory])

  const search = useCallback(async (): Promise<void> => {
    const text = query.trim()
    if (!enabled || text === '' || busy) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setBusy(true)
    setError(undefined)
    try {
      const response = runtime.memory.available
        ? await runtime.memory.search(text, currentCwd)
        : undefined
      if (controller.signal.aborted) return
      if (response !== undefined) {
        if (!response.ok) throw new Error(response.error.message)
        setMemoryState(response.value.state)
        setResults(response.value.items.map(item => ({
          sessionId: item.sourceSessionIds[0] ?? item.id,
          snippet: item.snippet,
          recordId: item.id,
        })))
      } else {
        const history = await runtime.sessions.search(text, controller.signal)
        if (!history.ok) throw new Error(history.error.message)
        setResults(history.value.items.map(item => ({ sessionId: item.sessionId, snippet: item.snippet })))
      }
    } catch (cause: unknown) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    } finally {
      if (abortRef.current === controller) setBusy(false)
    }
  }, [busy, currentCwd, enabled, query, runtime])

  const refresh = useCallback((): void => {
    if (!enabled || busy) return
    setBusy(true)
    setError(undefined)
    void (async () => {
      if (runtime.memory.available) {
        const response = await runtime.memory.run(currentCwd)
        if (!response.ok) throw new Error(response.error.message)
        setMemoryState(response.value)
        setResults([])
      } else {
        await runtime.sessions.refresh()
      }
    })().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    }).finally(() => { setBusy(false) })
  }, [busy, currentCwd, enabled, runtime])

  const changeEnabled = useCallback((value: boolean): void => {
    onEnabledChange(value)
    if (!runtime.memory.available) return
    setError(undefined)
    void runtime.memory.setEnabled(value).then(response => {
      if (!response.ok) throw new Error(response.error.message)
      setMemoryState(response.value)
    }).catch((cause: unknown) => {
      onEnabledChange(!value)
      setError(cause instanceof Error ? cause.message : String(cause))
    })
  }, [onEnabledChange, runtime.memory])

  const reset = useCallback((): void => {
    abortRef.current?.abort()
    setError(undefined)
    if (!runtime.memory.available) {
      setQuery('')
      setResults([])
      return
    }
    setBusy(true)
    void runtime.memory.reset().then(response => {
      if (!response.ok) throw new Error(response.error.message)
      setMemoryState(response.value)
      setQuery('')
      setResults([])
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : String(cause))
    }).finally(() => { setBusy(false) })
  }, [runtime.memory])

  const resultTitle = useCallback((result: MemoryResultItem): string => {
    const summary: SessionSummary | undefined = sessionList.byId[result.sessionId as SessionId]
    return summary?.displayTitle ?? result.sessionId
  }, [sessionList.byId])

  const resultCount = memoryState === undefined ? results.length : memoryState.globalCount + memoryState.projectCount
  const lastRun = memoryState?.lastRunAt === undefined ? '—' : new Date(memoryState.lastRunAt).toLocaleString()
  const method = memoryState?.lastExtractionMethod === 'heuristic'
    ? t('settings.memoryMethodHeuristic')
    : t('settings.memoryMethodHistory')

  return (
    <Section title={t('settings.memory')} body={t('settings.memoryBody')}>
      <div className={css.card}>
        <SettingRow
          title={t('settings.memoryToggle')}
          body={t('settings.memoryToggleBody')}
          control={<Toggle checked={enabled} disabled={busy} label={t('settings.memoryToggle')} onChange={changeEnabled} />}
        />
      </div>
      <div className={css.memoryCard}>
        <div className={css.memoryStatus}>
          {memoryState?.phase === 'extracting' ? t('settings.memoryExtracting') : enabled ? t('settings.memoryConnected') : t('settings.memoryDisabled')}
        </div>
        <div className={css.memoryToolbar}>
          <input
            className={css.search}
            value={query}
            placeholder={t('settings.memorySearchPlaceholder')}
            aria-label={t('settings.memorySearchPlaceholder')}
            disabled={!enabled || busy}
            onChange={event => { setQuery(event.target.value) }}
            onKeyDown={event => { if (event.key === 'Enter') void search() }}
          />
          <Button onClick={() => { void search() }} disabled={!enabled || busy || query.trim() === ''}>
            {busy ? t('settings.memorySearching') : t('settings.memorySearch')}
          </Button>
          <Button onClick={refresh} disabled={!enabled || busy}>{t('settings.memoryRunNow')}</Button>
        </div>
        {memoryState?.phase === 'extracting' && memoryState.extractingTotal !== undefined
          ? <div className={css.memoryProgress}>{t('settings.memoryProgress', { processed: memoryState.extractingProcessed ?? 0, total: memoryState.extractingTotal })}</div>
          : null}
        <div className={css.memoryStats}>
          <div className={css.memoryStat}><span>{t('settings.memoryRecords')}</span><strong>{resultCount}</strong></div>
          <div className={css.memoryStat}><span>{t('settings.memoryPending')}</span><strong>{memoryState?.pendingJobs ?? (busy ? 1 : 0)}</strong></div>
          <div className={css.memoryStat}><span>{t('settings.memoryLastRun')}</span><strong>{lastRun}</strong></div>
          <div className={css.memoryStat}><span>{t('settings.memoryMethod')}</span><strong>{method}</strong></div>
        </div>
        {error === undefined ? null : <div className={css.inlineError} role="alert">{error}</div>}
        {results.length === 0
          ? <div className={css.memoryEmpty}>{enabled ? t('settings.memoryEmpty') : t('settings.memoryDisabledBody')}</div>
          : (
            <div className={css.memoryResults}>
              {results.map((result, index) => (
                <div className={css.memoryResult} key={`${result.recordId ?? result.sessionId}:${index}`}>
                  <strong>{resultTitle(result)}</strong>
                  <span>{result.snippet}</span>
                </div>
              ))}
            </div>
          )}
        <div className={css.memoryFooter}>
          <span>{t('settings.memoryHistoryNote')}</span>
          <Button onClick={reset} disabled={busy || (query === '' && results.length === 0 && resultCount === 0)}>{t('settings.memoryReset')}</Button>
        </div>
      </div>
    </Section>
  )
}

/** One page for mode selection, Agent composition, and execution workflow. */
export function AgentWorkflowSection({ sessionId }: { sessionId: SessionId | undefined }) {
  const runtime = useRuntime()
  const t = useT()
  const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime])
  const described = useAsync(async () => await runtime.remote.settings.describe(), [runtime])
  const commands = useAsync(
    async () => (sessionId === undefined ? undefined : await runtime.remote.commands.list(sessionId)),
    [runtime, sessionId],
  )
  const session = useSessionSnapshot(sessionId)
  const activePreset = useProjectionValue<string | null>(sessionId, 'agentPreset')
  const plan = useProjectionValue<PlanProjectionView>(sessionId, 'plan')
  const busyEnter = useObservable(runtime.busyEnter, 'queue')
  const [selectedMode, setSelectedMode] = useState<string | undefined>()
  const [modeBusy, setModeBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [customParallel, setCustomParallel] = useState('')
  const [memoryEnabled, setMemoryEnabled] = useState(memoryEnabledFromStorage)

  const presets = roster.value?.ok === true ? roster.value.value.presets : []
  const hostDefault = presets.find(preset => preset.isDefault)?.id
  const defaultMode = selectedMode ?? hostDefault ?? presets[0]?.id ?? 'standard'
  const currentMode = activePreset ?? defaultMode
  const namespaces = described.value?.ok === true ? described.value.value.namespaces : []
  const settingsWritable = described.value?.ok === true && described.value.value.writable
  const loop = namespaceOf(namespaces, 'agent-loop')
  const retry = namespaceOf(namespaces, 'llm-retry')
  const compaction = namespaceOf(namespaces, 'compaction')
  const maxParallel = numberOf(loop, 'maxParallelToolCalls', 10)
  const steeringMode = valueOf(loop, 'steeringMode') === 'one-at-a-time' ? 'one-at-a-time' : 'all'
  const followUpMode = valueOf(loop, 'followUpMode') === 'all' ? 'all' : 'one-at-a-time'
  const strategy = maxParallel >= 200 ? 'wide' : maxParallel <= 6 ? 'tokensaver' : 'custom'
  const collaborationMode = plan === undefined ? 'build' : plan.pending ? (plan.active ? 'build' : 'plan') : plan.active ? 'plan' : 'build'
  const autoRetry = booleanOf(retry, 'enabled', true)
  const autoCompaction = booleanOf(compaction, 'auto', true)
  const compactAvailable = commands.value?.ok === true
    && commands.value.value.some(command => command.name === 'compact')
  const currentPresetRow = presets.find(preset => preset.id === currentMode)
  const settingsReadOnly = described.value?.ok === true && !described.value.value.writable

  useEffect(() => {
    if (hostDefault !== undefined) setSelectedMode(hostDefault)
  }, [hostDefault])

  useEffect(() => {
    if (strategy === 'custom') setCustomParallel(String(maxParallel))
  }, [maxParallel, strategy])

  const reloadSettings = useCallback(() => {
    described.reload()
    roster.reload()
  }, [described, roster])

  const selectMode = useCallback((id: string): void => {
    if (modeBusy || settingsReadOnly || id === defaultMode) return
    const preset = presets.find(item => item.id === id)
    if (preset?.broken !== undefined) return
    const previous = defaultMode
    setSelectedMode(id)
    setModeBusy(true)
    setError(undefined)
    void (async () => {
      const defaultResult = await runtime.remote.settings.update('agent-presets', { default: id }, undefined)
      if (!defaultResult.ok) throw new Error(defaultResult.error.message)
      if (sessionId !== undefined && session?.blank === true && session.running !== true) {
        const result = await runtime.remote.agentPresets.select(sessionId, id)
        if (!result.ok) throw new Error(result.error.message)
      }
      reloadSettings()
    })().catch((cause: unknown) => {
      setSelectedMode(previous)
      setError(cause instanceof Error ? cause.message : String(cause))
    }).finally(() => { setModeBusy(false) })
  }, [defaultMode, modeBusy, presets, reloadSettings, runtime, session, sessionId, settingsReadOnly])

  const saveNamespace = useCallback((key: string, namespace: SettingsNamespaceView | undefined, patch: Record<string, boolean | number | string>): void => {
    if (!settingsWritable || actionBusy !== undefined) return
    setActionBusy(key)
    setError(undefined)
    void updateNamespace(runtime, namespace, patch, t('settings.agentWorkflowSettingUnavailable'))
      .then(reloadSettings)
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setActionBusy(undefined) })
  }, [actionBusy, reloadSettings, runtime, settingsWritable, t])

  const selectCollaboration = useCallback((value: string): void => {
    if (sessionId === undefined || plan === undefined || actionBusy !== undefined) return
    const active = value === 'plan'
    const current = plan.pending ? !plan.active : plan.active
    if (active === current) return
    setActionBusy('collaboration')
    setError(undefined)
    void runtime.remote.commands.execute(sessionId, active ? '/plan' : '/plan off', [])
      .then(result => { if (!result.ok) throw new Error(result.error.message) })
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setActionBusy(undefined) })
  }, [actionBusy, plan, runtime, sessionId])

  const selectStrategy = useCallback((value: string): void => {
    if (value === 'tokensaver') saveNamespace('parallel', loop, { maxParallelToolCalls: 6 })
    if (value === 'wide') saveNamespace('parallel', loop, { maxParallelToolCalls: 200 })
    if (value === 'custom') setCustomParallel(String(maxParallel))
  }, [loop, maxParallel, saveNamespace])

  const saveCustomParallel = useCallback((): void => {
    const value = Number(customParallel)
    if (!Number.isInteger(value) || value < 1) {
      setError(t('settings.agentWorkflowParallelInvalid'))
      return
    }
    saveNamespace('parallel', loop, { maxParallelToolCalls: value })
  }, [customParallel, loop, saveNamespace, t])

  const selectFollowUp = useCallback((value: string): void => {
    const next: FollowUpMode = value === 'all' ? 'all' : 'one-at-a-time'
    saveNamespace('follow-up', loop, { followUpMode: next })
  }, [loop, saveNamespace])

  const compactNow = useCallback((): void => {
    if (sessionId === undefined || !compactAvailable || actionBusy !== undefined) return
    setActionBusy('compact')
    setError(undefined)
    void runtime.remote.commands.execute(sessionId, '/compact', [])
      .then(result => { if (!result.ok) throw new Error(result.error.message) })
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setActionBusy(undefined) })
  }, [actionBusy, compactAvailable, runtime, sessionId])

  const setMemory = useCallback((value: boolean): void => {
    setMemoryEnabled(value)
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(MEMORY_ENABLED_KEY, String(value)) } catch { /* unavailable in embedded previews */ }
  }, [])

  const modeRows = useMemo(() => {
    const builtin = BUILTIN_MODE_IDS
      .map(id => presets.find(preset => preset.id === id))
      .filter((preset): preset is (typeof presets)[number] => preset !== undefined)
    const custom = presets.filter(preset => !BUILTIN_MODE_IDS.includes(preset.id as (typeof BUILTIN_MODE_IDS)[number]))
    return [...builtin, ...custom]
  }, [presets])

  return (
    <>
      <Section title={t('settings.agentWorkflow')} body={t('settings.agentWorkflowBody')}>
        {roster.loading
          ? <div className={css.card}><EmptyState><Spinner /></EmptyState></div>
          : roster.error !== undefined
            ? <div className={css.card}><EmptyState>{roster.error}</EmptyState></div>
            : roster.value?.ok === false
              ? <div className={css.card}><EmptyState>{roster.value.error.message}</EmptyState></div>
              : (
                <div className={css.modeGrid} role="list" aria-label={t('settings.agentWorkflowModes')}>
                  {modeRows.map(preset => {
                    const selected = currentMode === preset.id
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        className={`${css.modeCard} ${selected ? css.modeCardActive : ''}`}
                        aria-pressed={selected}
                        disabled={modeBusy || settingsReadOnly || preset.broken !== undefined}
                        onClick={() => { selectMode(preset.id) }}
                      >
                        <span className={css.modeCardHead}>
                          <strong>{modeName(preset.id, preset.name ?? preset.id, t)}</strong>
                          {selected ? <span className={css.badge}>{t('settings.modeActive')}</span> : null}
                        </span>
                        <span className={css.modeCardBody}>{modeBody(preset.id, t)}</span>
                        {preset.broken === undefined ? null : <span className={css.modeCardError}>{preset.broken}</span>}
                      </button>
                    )
                  })}
                </div>
              )}
        {error === undefined ? null : <div className={css.inlineError} role="alert">{error}</div>}
      </Section>

      <Section title={t('settings.agentWorkflowControls')} body={t('settings.agentWorkflowControlsBody')}>
        <div className={css.card}>
          <SettingRow
            title={t('settings.agentWorkflowCollaboration')}
            body={t('settings.agentWorkflowCollaborationBody')}
            control={(
              <SelectMenu
                value={collaborationMode}
                ariaLabel={t('settings.agentWorkflowCollaboration')}
                options={[
                  { id: 'plan', label: t('composer.mode.plan') },
                  { id: 'build', label: t('composer.mode.build') },
                ]}
                disabled={sessionId === undefined || plan === undefined || actionBusy !== undefined}
                onChange={selectCollaboration}
              />
            )}
          />
          <SettingRow
            title={t('settings.agentWorkflowConcurrency')}
            body={t('settings.agentWorkflowConcurrencyBody')}
            control={(
              <div className={css.controlStack}>
                <SelectMenu
                  value={strategy}
                  ariaLabel={t('settings.agentWorkflowConcurrency')}
                  options={[
                    { id: 'tokensaver', label: t('settings.agentWorkflowConcurrencyTokenSaver') },
                    { id: 'wide', label: t('settings.agentWorkflowConcurrencyWide') },
                    { id: 'custom', label: t('settings.agentWorkflowConcurrencyCustom') },
                  ]}
                  disabled={loop === undefined || !settingsWritable || actionBusy !== undefined}
                  onChange={selectStrategy}
                />
                {strategy === 'custom'
                  ? (
                    <input
                      className={css.number}
                      type="number"
                      min={1}
                      value={customParallel}
                      aria-label={t('settings.agentWorkflowConcurrencyCustom')}
                      disabled={loop === undefined || !settingsWritable || actionBusy !== undefined}
                      onChange={event => { setCustomParallel(event.target.value) }}
                      onBlur={saveCustomParallel}
                      onKeyDown={event => { if (event.key === 'Enter') saveCustomParallel() }}
                    />
                  )
                  : null}
              </div>
            )}
          />
          <SettingRow
            title={t('settings.agentWorkflowSteering')}
            body={t('settings.agentWorkflowSteeringBody')}
            control={(
              <SelectMenu
                value={steeringMode}
                ariaLabel={t('settings.agentWorkflowSteering')}
                options={[
                  { id: 'one-at-a-time', label: t('settings.agentWorkflowSteeringOne') },
                  { id: 'all', label: t('settings.agentWorkflowSteeringAll') },
                ]}
                disabled={loop === undefined || !settingsWritable || actionBusy !== undefined}
                onChange={value => { saveNamespace('steering', loop, { steeringMode: value === 'all' ? 'all' : 'one-at-a-time' }) }}
              />
            )}
          />
          <SettingRow
            title={t('settings.agentWorkflowFollowUp')}
            body={t('settings.agentWorkflowFollowUpBody')}
            control={(
              <SelectMenu
                value={followUpMode}
                ariaLabel={t('settings.agentWorkflowFollowUp')}
                options={[
                  { id: 'one-at-a-time', label: t('settings.agentWorkflowFollowUpOne') },
                  { id: 'all', label: t('settings.agentWorkflowFollowUpAll') },
                ]}
                disabled={loop === undefined || !settingsWritable || actionBusy !== undefined}
                onChange={selectFollowUp}
              />
            )}
          />
          <SettingRow
            title={t('settings.busyEnter')}
            body={t('settings.busyEnterBody')}
            control={(
              <SelectMenu
                value={busyEnter}
                ariaLabel={t('settings.busyEnter')}
                options={[
                  { id: 'queue', label: t('settings.busyEnter.queue') },
                  { id: 'steer', label: t('settings.busyEnter.steer') },
                ]}
                disabled={!runtime.busyEnter.writable}
                onChange={value => { runtime.busyEnter.set(value as 'queue' | 'steer') }}
              />
            )}
          />
          <SettingRow
            title={t('settings.agentWorkflowRetry')}
            body={t('settings.agentWorkflowRetryBody')}
            control={<Toggle checked={autoRetry} disabled={retry === undefined || !settingsWritable || actionBusy !== undefined} label={t('settings.agentWorkflowRetry')} onChange={value => { saveNamespace('retry', retry, { enabled: value }) }} />}
          />
        </div>
      </Section>

      <Section title={t('settings.agentWorkflowCompaction')} body={t('settings.agentWorkflowCompactionBody')}>
        <div className={css.card}>
          <SettingRow
            title={t('settings.agentWorkflowAutoCompaction')}
            body={t('settings.agentWorkflowAutoCompactionBody')}
            control={<Toggle checked={autoCompaction} disabled={compaction === undefined || !settingsWritable || actionBusy !== undefined} label={t('settings.agentWorkflowAutoCompaction')} onChange={value => { saveNamespace('compaction', compaction, { auto: value }) }} />}
          />
          <SettingRow
            title={t('settings.agentWorkflowCompactNow')}
            body={t('settings.agentWorkflowCompactNowBody')}
            control={<Button onClick={compactNow} disabled={!compactAvailable || session?.running === true || actionBusy !== undefined}>{actionBusy === 'compact' ? t('settings.agentWorkflowCompacting') : t('settings.agentWorkflowCompactNow')}</Button>}
          />
        </div>
      </Section>

      <MemorySection enabled={memoryEnabled} onEnabledChange={setMemory} sessionId={sessionId} />

      <Section title={t('settings.agentWorkflowComposition')} body={t('settings.agentWorkflowCompositionBody')}>
        <div className={css.card}>
          <SettingRow
            title={t('settings.agentWorkflowPrompt')}
            body={t('settings.agentWorkflowPromptBody')}
            control={<span className={css.badge}>{modeName(currentMode, currentPresetRow?.name ?? currentMode, t)}</span>}
          />
          <SettingRow
            title={t('settings.agentWorkflowTools')}
            body={t('settings.agentWorkflowToolsBody')}
            control={<span className={css.rowMono}>{currentMode === 'crew' ? t('settings.agentWorkflowToolsCluster') : t('settings.agentWorkflowToolsStandard')}</span>}
          />
          <SettingRow
            title={t('settings.agentWorkflowGovernance')}
            body={t('settings.agentWorkflowGovernanceBody')}
            control={<span className={css.rowMono}>{currentMode === 'crew' ? t('settings.agentWorkflowGovernanceCluster') : t('settings.agentWorkflowGovernanceDefault')}</span>}
          />
        </div>
      </Section>

      {described.loading ? <div className={css.settingsLoading}><Spinner /></div> : null}
    </>
  )
}
