/** DCode-owned plugin settings over the existing settings and inventory remotes. */

import { useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type {
  CredentialInfo, ModelCatalog, SettingsNamespaceView, SettingsPathOpView,
  PluginInventorySnapshot,
} from '@deepseek-ai/dsh-api-remotes/client'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { DcodeRuntime } from '../state/runtime.ts'
import { useAsync } from '../state/hooks.ts'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import { Button, EmptyState, Spinner, ui } from '../shell/ui.tsx'
import { createMarketClient, type InstalledPlugin, type InstalledSnapshot } from '../plugins/market.ts'
import { useOperations } from '../plugins/useJob.ts'
import css from './SettingsSurface.module.css'

type PluginFieldType = 'number' | 'text'

interface PluginField {
  readonly key: string
  readonly label: string
  readonly hint: string
  readonly type: PluginFieldType
}

interface PluginSettingsData {
  readonly settings: {
    readonly writable: boolean
    readonly namespaces: readonly SettingsNamespaceView[]
  } | undefined
  readonly inventory: PluginInventorySnapshot
  readonly catalog: ModelCatalog | undefined
  readonly credential: CredentialInfo | undefined
  readonly credentialError?: string
}

function objectValue(source: unknown): Record<string, unknown> {
  return typeof source === 'object' && source !== null && !Array.isArray(source)
    ? source as Record<string, unknown>
    : {}
}

function hasField(source: unknown, key: string): boolean {
  return Object.hasOwn(objectValue(source), key)
}

function fieldValue(source: unknown, key: string): unknown {
  return objectValue(source)[key]
}

function fieldText(source: unknown, key: string): string {
  const value = fieldValue(source, key)
  return typeof value === 'number' || typeof value === 'string' ? String(value) : ''
}

function modelKey(provider: string, model: string): string {
  return `${provider}\0${model}`
}

async function loadPluginSettings(
  runtime: DcodeRuntime,
  includeSettings: boolean,
): Promise<PluginSettingsData> {
  const inventoryPromise = runtime.remote.pluginInventory.list()
  if (!includeSettings) {
    const inventory = await inventoryPromise
    if (!inventory.ok) throw new Error(inventory.error.message)
    return { settings: undefined, inventory: inventory.value, catalog: undefined, credential: undefined }
  }
  const [inventory, settings, catalog] = await Promise.all([
    inventoryPromise,
    runtime.remote.settings.describe(),
    runtime.remote.session.modelCatalog(),
  ])
  if (!inventory.ok) throw new Error(inventory.error.message)
  if (!settings.ok) throw new Error(settings.error.message)
  const webSearch = settings.value.namespaces.find(namespace => namespace.ns === 'web-search-deepseek')
  const credentialRef = typeof fieldValue(webSearch?.value, 'apiKeyEnv') === 'string'
    && String(fieldValue(webSearch?.value, 'apiKeyEnv')).length > 0
    ? String(fieldValue(webSearch?.value, 'apiKeyEnv'))
    : 'DEEPSEEK_API_KEY'
  let credential: CredentialInfo | undefined
  let credentialError: string | undefined
  try {
    const described = await runtime.remote.credentials.describe([credentialRef])
    if (described.ok) credential = described.value[credentialRef]
    else credentialError = described.error.message
  } catch (cause: unknown) {
    credentialError = cause instanceof Error ? cause.message : String(cause)
  }
  return {
    settings: { writable: settings.value.writable, namespaces: settings.value.namespaces },
    inventory: inventory.value,
    catalog: catalog.ok ? catalog.value : undefined,
    credential,
    ...credentialError === undefined ? {} : { credentialError },
  }
}

function PluginSettingsCard(props: {
  namespace: SettingsNamespaceView
  writable: boolean
  title: string
  description: string
  fields: readonly PluginField[]
  credential?: CredentialInfo
  credentialLabel?: string
  credentialHint?: string
  onReload: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const user = objectValue(props.namespace.user)
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(
    props.fields.map(field => [field.key, fieldText(props.namespace.value, field.key)]),
  ))
  const [resetFields, setResetFields] = useState<ReadonlySet<string>>(() => new Set())
  const [credentialDraft, setCredentialDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const credentialWritable = props.credential?.writable !== false
  const canSave = props.writable || (props.credentialLabel !== undefined && credentialWritable)

  const dirty = props.fields.some(field => {
    if (resetFields.has(field.key)) return hasField(user, field.key)
    const text = draft[field.key] ?? ''
    const stored = fieldValue(user, field.key)
    const effective = fieldValue(props.namespace.value, field.key)
    if (text.trim() === '') return hasField(user, field.key)
    const parsed = field.type === 'number' ? Number(text) : text.trim()
    const valid = field.type === 'number' ? Number.isFinite(parsed) : true
    return valid && JSON.stringify(parsed) !== JSON.stringify(stored)
      && !(stored === undefined && JSON.stringify(parsed) === JSON.stringify(effective))
  }) || credentialDraft.trim().length > 0

  const save = async (): Promise<void> => {
    if (!canSave || saving || !dirty) return
    setSaving(true)
    setError(undefined)
    try {
      const ops: SettingsPathOpView[] = []
      for (const field of props.fields) {
        const text = draft[field.key]?.trim() ?? ''
        if (resetFields.has(field.key)) {
          if (hasField(user, field.key)) ops.push({ op: 'unset', path: [field.key] })
          continue
        }
        if (text === '') {
          if (hasField(user, field.key)) ops.push({ op: 'unset', path: [field.key] })
          continue
        }
        const next: unknown = field.type === 'number' ? Number(text) : text
        if (field.type === 'number' && !Number.isFinite(next)) {
          throw new Error(t('settings.plugins.invalidNumber'))
        }
        const stored = fieldValue(user, field.key)
        const effective = fieldValue(props.namespace.value, field.key)
        if (JSON.stringify(next) === JSON.stringify(stored)) continue
        if (stored === undefined && JSON.stringify(next) === JSON.stringify(effective)) continue
        ops.push({ op: 'set', path: [field.key], value: next as JsonValue })
      }
      if (props.writable && ops.length > 0) {
        const response = await runtime.remote.settings.mutate(props.namespace.ns, ops, props.namespace.revision)
        if (!response.ok) throw new Error(response.error.message)
      }
      if (credentialDraft.trim() !== '') {
        const ref = typeof fieldValue(props.namespace.value, 'apiKeyEnv') === 'string'
          && String(fieldValue(props.namespace.value, 'apiKeyEnv')).length > 0
          ? String(fieldValue(props.namespace.value, 'apiKeyEnv'))
          : 'DEEPSEEK_API_KEY'
        const response = await runtime.remote.credentials.set(ref, credentialDraft.trim())
        if (!response.ok) throw new Error(response.error.message)
      }
      props.onReload()
      setCredentialDraft('')
      setResetFields(new Set())
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={css.pluginCard}>
      <header className={`${css.pluginCardHeader} ${ui.cardHeader}`}>
        <div className={css.rowText}>
          <h3 className={css.rowTitle}>{props.title}</h3>
          <div className={css.rowBody}>{props.description}</div>
        </div>
        {props.writable ? <span className={css.badge}>{props.namespace.applies}</span> : <span className={css.badge}>{t('common.readOnly')}</span>}
      </header>
      <div className={css.pluginCardBody}>
        {props.credentialLabel === undefined ? null : (
          <label className={css.field}>
            <span className={css.fieldLabel}>{props.credentialLabel}</span>
            <input
              className={css.fieldInput}
              type="password"
              autoComplete="off"
              value={credentialDraft}
              placeholder={props.credential?.configured === true ? t('settings.plugins.keyConfiguredHint') : t('settings.plugins.keyPlaceholder')}
              disabled={saving || !credentialWritable}
              onChange={event => { setCredentialDraft(event.target.value) }}
            />
            <span className={css.fieldHint}>{props.credential?.configured === true ? t('settings.plugins.keyConfigured') : props.credentialHint}</span>
          </label>
        )}
        {props.fields.map(field => (
          <label className={css.field} key={field.key}>
            <span className={css.fieldMeta}>
              <span className={css.fieldLabel}>{field.label}</span>
              {hasField(user, field.key) && !resetFields.has(field.key)
                ? <Button className={css.resetButton} onClick={() => { setResetFields(previous => new Set([...previous, field.key])); setDraft(previous => ({ ...previous, [field.key]: fieldText(props.namespace.base, field.key) })) }} disabled={saving || !props.writable}>{t('settings.plugins.reset')}</Button>
                : null}
            </span>
            <input
              className={css.fieldInput}
              type={field.type === 'number' ? 'number' : 'text'}
              value={draft[field.key] ?? ''}
              placeholder={fieldText(props.namespace.base, field.key) || t('settings.plugins.defaultValue')}
              disabled={saving || !props.writable}
              onChange={event => {
                setResetFields(previous => {
                  const next = new Set(previous)
                  next.delete(field.key)
                  return next
                })
                setDraft(previous => ({ ...previous, [field.key]: event.target.value }))
              }}
            />
            <span className={css.fieldHint}>{field.hint}</span>
          </label>
        ))}
        {error === undefined ? null : <div className={css.inlineError} role="alert">{error}</div>}
        <div className={css.editorActions}>
          <Button onClick={() => { setDraft(Object.fromEntries(props.fields.map(field => [field.key, fieldText(props.namespace.value, field.key)]))); setResetFields(new Set()); setCredentialDraft(''); setError(undefined) }} disabled={saving || !dirty}>{t('settings.plugins.discard')}</Button>
          <Button primary onClick={() => { void save() }} disabled={saving || !canSave || !dirty}>{saving ? t('settings.plugins.saving') : t('settings.plugins.save')}</Button>
        </div>
      </div>
    </section>
  )
}

function VisionBridgeCard(props: {
  namespace: SettingsNamespaceView
  writable: boolean
  onReload: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const effectiveEnabled = typeof fieldValue(props.namespace.value, 'enabled') === 'boolean'
    ? fieldValue(props.namespace.value, 'enabled') as boolean
    : true
  const effectiveModel = fieldText(props.namespace.value, 'model').trim()
  const [enabled, setEnabled] = useState(effectiveEnabled)
  const [model, setModel] = useState(effectiveModel)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const dirty = enabled !== effectiveEnabled || model.trim() !== effectiveModel
  const routeKind = !enabled ? 'disabled' : model.trim() === '' ? 'auto' : 'pinned'
  const routeClass = routeKind === 'disabled'
    ? css.visionRouteDisabled
    : routeKind === 'auto'
      ? css.visionRouteAuto
      : css.visionRoutePinned
  const routeLabel = routeKind === 'disabled'
    ? t('settings.plugins.visionRouteDisabled')
    : routeKind === 'auto'
      ? t('settings.plugins.visionRouteAutomatic')
      : t('settings.plugins.visionRoutePinned')

  const save = (): void => {
    if (!props.writable || saving || !dirty) return
    setSaving(true)
    setError(undefined)
    const ops: SettingsPathOpView[] = []
    if (enabled !== effectiveEnabled) ops.push({ op: 'set', path: ['enabled'], value: enabled })
    if (model.trim() !== effectiveModel) ops.push({ op: 'set', path: ['model'], value: model.trim() as JsonValue })
    void runtime.remote.settings.mutate(props.namespace.ns, ops, props.namespace.revision)
      .then((result) => {
        if (!result.ok) throw new Error(result.error.message)
        props.onReload()
      })
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setSaving(false) })
  }

  return (
    <section className={css.pluginCard}>
      <header className={`${css.pluginCardHeader} ${ui.cardHeader}`}>
        <div className={css.rowText}>
          <h3 className={css.rowTitle}>{t('settings.plugins.visionTitle')}</h3>
          <div className={css.rowBody}>{t('settings.plugins.visionDescription')}</div>
        </div>
        {props.writable ? <span className={css.badge}>{props.namespace.applies}</span> : <span className={css.badge}>{t('common.readOnly')}</span>}
      </header>
      <div className={css.pluginCardBody}>
        <div className={css.visionRoute + ' ' + routeClass} role="status" aria-live="polite">
          <span className={css.statusDot} aria-hidden="true" />
          <div className={css.rowText}>
            <div className={css.rowTitle}>{routeLabel}</div>
            <div className={css.rowBody}>{model.trim() === '' ? t('settings.plugins.visionRouteAutomaticHint') : model.trim()}</div>
          </div>
        </div>
        <div className={css.notice}>{t('settings.plugins.visionSharedProvider')}</div>
        <div className={css.switchRow}>
          <div className={css.rowText}>
            <div className={css.rowTitle}>{t('settings.plugins.visionEnabled')}</div>
            <div className={css.rowBody}>{t('settings.plugins.visionEnabledHint')}</div>
          </div>
          <button type="button" role="switch" aria-label={t('settings.plugins.visionEnabled')} aria-checked={enabled} className={css.switch + ' ' + (enabled ? css.switchOn : '')} disabled={saving || !props.writable} onClick={() => { setEnabled(value => !value) }}>
            <span className={css.switchThumb} />
          </button>
        </div>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('settings.plugins.visionModel')}</span>
          <input className={css.fieldInput} type="text" value={model} placeholder={t('settings.plugins.visionModelPlaceholder')} disabled={saving || !props.writable} onChange={event => { setModel(event.target.value) }} />
          <span className={css.fieldHint}>{t('settings.plugins.visionModelHint')}</span>
        </label>
        {model.trim() !== '' ? <Button className={css.resetButton} onClick={() => { setModel('') }} disabled={saving || !props.writable}>{t('settings.plugins.visionUseAutomatic')}</Button> : null}
        {error === undefined ? null : <div className={css.inlineError} role="alert">{error}</div>}
        <div className={css.editorActions}>
          <Button onClick={() => { setEnabled(effectiveEnabled); setModel(effectiveModel); setError(undefined) }} disabled={saving || !dirty}>{t('settings.plugins.discard')}</Button>
          <Button primary onClick={save} disabled={saving || !props.writable || !dirty}>{saving ? t('settings.plugins.saving') : t('settings.plugins.save')}</Button>
        </div>
      </div>
    </section>
  )
}

function SubagentModelCard(props: {
  namespace: SettingsNamespaceView
  writable: boolean
  catalog: ModelCatalog | undefined
  onReload: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const initialRoutes = Array.isArray(fieldValue(props.namespace.value, 'allowedModels'))
    ? fieldValue(props.namespace.value, 'allowedModels') as { provider?: unknown; model?: unknown }[]
    : []
  const [enabled, setEnabled] = useState(() => fieldValue(props.namespace.value, 'enabled') === true)
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initialRoutes.flatMap(route => typeof route.provider === 'string' && typeof route.model === 'string' ? [modelKey(route.provider, route.model)] : [])))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const candidates = useMemo(() => {
    const rows = props.catalog?.groups.flatMap(group => group.models.map(model => ({
      key: modelKey(group.id, model.id), provider: group.id, providerName: group.name, model: model.id, name: model.name,
    }))) ?? []
    const known = new Set(rows.map(row => row.key))
    return [...rows, ...initialRoutes.flatMap(route => {
      if (typeof route.provider !== 'string' || typeof route.model !== 'string') return []
      const key = modelKey(route.provider, route.model)
      return known.has(key) ? [] : [{ key, provider: route.provider, providerName: route.provider, model: route.model, name: route.model }]
    })]
  }, [initialRoutes, props.catalog])
  const dirty = enabled !== (fieldValue(props.namespace.value, 'enabled') === true)
    || candidates.some(candidate => selected.has(candidate.key) !== initialRoutes.some(route => route.provider === candidate.provider && route.model === candidate.model))
  const save = (): void => {
    if (!props.writable || saving || !dirty) return
    if (enabled && selected.size === 0) {
      setError(t('settings.plugins.subagentModelSelectionRequired'))
      return
    }
    setSaving(true)
    setError(undefined)
    const allowedModels = candidates
      .filter(candidate => selected.has(candidate.key))
      .map(candidate => ({ provider: candidate.provider, model: candidate.model }))
    void runtime.remote.settings.mutate(props.namespace.ns, [
      { op: 'set', path: ['enabled'], value: enabled },
      { op: 'set', path: ['allowedModels'], value: allowedModels as JsonValue },
    ], props.namespace.revision)
      .then((result) => {
        if (!result.ok) throw new Error(result.error.message)
        props.onReload()
      })
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setSaving(false) })
  }

  return (
    <section className={css.pluginCard}>
      <header className={`${css.pluginCardHeader} ${ui.cardHeader}`}>
        <div className={css.rowText}>
          <h3 className={css.rowTitle}>{t('settings.plugins.subagentModelSelectionTitle')}</h3>
          <div className={css.rowBody}>{t('settings.plugins.subagentModelSelectionDescription')}</div>
        </div>
        {!props.writable ? <span className={css.badge}>{t('common.readOnly')}</span> : null}
      </header>
      <div className={css.pluginCardBody}>
        <div className={css.switchRow}>
          <span className={css.fieldLabel}>{t('settings.plugins.subagentModelSelectionToggle')}</span>
          <button type="button" role="switch" aria-label={t('settings.plugins.subagentModelSelectionToggle')} aria-checked={enabled} className={`${css.switch} ${enabled ? css.switchOn : ''}`} disabled={saving || !props.writable} onClick={() => { setEnabled(value => !value) }}>
            <span className={css.switchThumb} />
          </button>
        </div>
        <p className={css.fieldHint}>{t(enabled ? 'settings.plugins.subagentModelSelectionChoose' : 'settings.plugins.subagentModelSelectionOff')}</p>
        {enabled
          ? (
            <fieldset className={css.modelList}>
              <legend className={css.fieldLabel}>{t('settings.plugins.subagentModelSelectionAllowed')}</legend>
              {candidates.length === 0
                ? <span className={css.fieldHint}>{t('settings.plugins.subagentModelSelectionEmpty')}</span>
                : candidates.map(candidate => (
                  <label className={css.modelOption} key={candidate.key}>
                    <input type="checkbox" checked={selected.has(candidate.key)} disabled={saving || !props.writable} onChange={() => { setSelected(previous => { const next = new Set(previous); if (next.has(candidate.key)) next.delete(candidate.key); else next.add(candidate.key); return next }) }} />
                    <span className={css.rowText}><span className={css.rowTitle}>{candidate.name}</span><span className={css.modelRoute}>{`${candidate.providerName} · ${candidate.provider}/${candidate.model}`}</span></span>
                  </label>
                ))}
            </fieldset>
          )
          : null}
        {props.catalog === undefined && enabled ? <div className={css.notice}>{t('settings.plugins.subagentModelSelectionLoadFailed')}</div> : null}
        {error === undefined ? null : <div className={css.inlineError} role="alert">{error}</div>}
        <div className={css.editorActions}>
          <Button onClick={() => { setEnabled(fieldValue(props.namespace.value, 'enabled') === true); setSelected(new Set(initialRoutes.flatMap(route => typeof route.provider === 'string' && typeof route.model === 'string' ? [modelKey(route.provider, route.model)] : []))); setError(undefined) }} disabled={saving || !dirty}>{t('settings.plugins.discard')}</Button>
          <Button primary onClick={save} disabled={saving || !props.writable || !dirty}>{saving ? t('settings.plugins.saving') : t('settings.plugins.save')}</Button>
        </div>
      </div>
    </section>
  )
}

function PluginConfigSection(props: { data: PluginSettingsData; onReload: () => void }): ReactNode {
  const t = useT()
  const namespaces = props.data.settings?.namespaces ?? []
  const find = (ns: string): SettingsNamespaceView | undefined => namespaces.find(namespace => namespace.ns === ns)
  const cards: ReactNode[] = []
  const vision = find('vision')
  if (vision !== undefined) cards.push(<VisionBridgeCard key={vision.ns} namespace={vision} writable={props.data.settings?.writable === true} onReload={props.onReload} />)
  const shell = find('shell')
  if (shell !== undefined) cards.push(<PluginSettingsCard key={shell.ns} namespace={shell} writable={props.data.settings?.writable === true} title={t('settings.plugins.shellTitle')} description={t('settings.plugins.shellDescription')} fields={[{ key: 'timeoutMs', label: t('settings.plugins.shellTimeout'), hint: t('settings.plugins.shellTimeoutHint'), type: 'number' }, { key: 'maxOutputBytes', label: t('settings.plugins.shellOutput'), hint: t('settings.plugins.shellOutputHint'), type: 'number' }]} onReload={props.onReload} />)
  const agentLoop = find('agent-loop')
  if (agentLoop !== undefined) cards.push(<PluginSettingsCard key={agentLoop.ns} namespace={agentLoop} writable={props.data.settings?.writable === true} title={t('settings.plugins.agentLoopTitle')} description={t('settings.plugins.agentLoopDescription')} fields={[{ key: 'maxParallelToolCalls', label: t('settings.plugins.agentLoopParallel'), hint: t('settings.plugins.agentLoopParallelHint'), type: 'number' }]} onReload={props.onReload} />)
  const webSearch = find('web-search-deepseek')
  if (webSearch !== undefined) cards.push(<PluginSettingsCard key={webSearch.ns} namespace={webSearch} writable={props.data.settings?.writable === true} title={t('settings.plugins.webSearchTitle')} description={t('settings.plugins.webSearchDescription')} credential={props.data.credential} credentialLabel={t('settings.plugins.webSearchApiKey')} credentialHint={t('settings.plugins.webSearchApiKeyHint')} fields={[{ key: 'baseURL', label: t('settings.plugins.webSearchBaseUrl'), hint: t('settings.plugins.webSearchBaseUrlHint'), type: 'text' }, { key: 'maxUses', label: t('settings.plugins.webSearchMaxUses'), hint: t('settings.plugins.webSearchMaxUsesHint'), type: 'number' }]} onReload={props.onReload} />)
  const subagent = find('subagent-model-selection')
  if (subagent !== undefined) cards.push(<SubagentModelCard key={subagent.ns} namespace={subagent} writable={props.data.settings?.writable === true} catalog={props.data.catalog} onReload={props.onReload} />)
  return (
    <div className={css.pluginConfigList}>
      {props.data.credentialError === undefined ? null : <div className={css.notice} role="alert">{`${t('settings.plugins.credentialWarning')}: ${props.data.credentialError}`}</div>}
      {cards.length === 0 ? <EmptyState>{t('settings.plugins.emptyConfig')}</EmptyState> : cards}
    </div>
  )
}

type InventoryEntry = PluginInventorySnapshot['entries'][number]

interface PresentedInventoryEntry {
  readonly entry: InventoryEntry
  readonly name: string
  readonly description: string
  readonly status: string
  readonly marketPlugin: InstalledPlugin | undefined
}

const INVENTORY_ROW_HEIGHT = 92
const INVENTORY_VIEWPORT_HEIGHT = 460
const INVENTORY_OVERSCAN = 4

function inventoryName(moduleName: string): string {
  const packageName = moduleName.split('/').filter(Boolean).at(-1) ?? moduleName
  const clean = packageName
    .replace(/\.(?:mjs|cjs|js|ts)$/iu, '')
    .replace(/^(?:dsh|plugin|extension)-/iu, '')
  return clean
    .split(/[-_]+/u)
    .filter(Boolean)
    .map(word => word.length <= 4 && word === word.toLowerCase() ? word.toUpperCase() : `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ') || moduleName
}

function isUserExtension(entry: InventoryEntry): boolean {
  const moduleName = entry.moduleName.toLowerCase()
  if (moduleName.includes('mcp')) return true
  return !moduleName.startsWith('@deepseek-ai/')
    && !moduleName.startsWith('@dsh-portable/')
    && !moduleName.startsWith('cordis:')
}

function packageName(moduleName: string): string {
  const parts = moduleName.replaceAll('\\', '/').split('/').filter(Boolean)
  if (parts[0]?.startsWith('@')) return parts.slice(0, 2).join('/')
  return parts[0] ?? moduleName
}

function findMarketPlugin(moduleName: string, snapshot: InstalledSnapshot | undefined): InstalledPlugin | undefined {
  if (snapshot === undefined) return undefined
  return snapshot.plugins.find(plugin => plugin.name === moduleName)
    ?? snapshot.plugins.find(plugin => packageName(plugin.name) === packageName(moduleName))
}

function inventoryDescription(moduleName: string, name: string, t: ReturnType<typeof useT>): string {
  const normalized = moduleName.toLowerCase()
  if (normalized.includes('mcp')) return t('settings.plugins.descriptionMcp')
  if (/(?:^|[-/])tool(?:[-/]|$)/u.test(normalized)) return t('settings.plugins.descriptionTool', { name })
  if (/(?:ui|client|renderer|surface)/u.test(normalized)) return t('settings.plugins.descriptionInterface', { name })
  if (/(?:provider|model|llm)/u.test(normalized)) return t('settings.plugins.descriptionProvider', { name })
  if (/(?:plugin|extension)/u.test(normalized)) return t('settings.plugins.descriptionExtension', { name })
  return t('settings.plugins.descriptionRuntime', { name })
}

function inventoryStatus(entry: InventoryEntry, t: ReturnType<typeof useT>): string {
  if (!entry.enabled) return t('settings.plugins.disabled')
  switch (entry.fiberPhase) {
    case 'active': return t('settings.plugins.statusReady')
    case 'pending':
    case 'loading': return t('settings.plugins.statusStarting')
    case 'failed': return t('settings.plugins.statusFailed')
    case 'unloading': return t('settings.plugins.statusStopping')
    default: return t('settings.plugins.statusNotRunning')
  }
}

function VirtualInventoryList(props: {
  entries: readonly PresentedInventoryEntry[]
  action?: (entry: PresentedInventoryEntry) => ReactNode
}): ReactNode {
  const [scrollTop, setScrollTop] = useState(0)
  const shouldWindow = props.entries.length > 40
  const start = shouldWindow
    ? Math.max(0, Math.floor(scrollTop / INVENTORY_ROW_HEIGHT) - INVENTORY_OVERSCAN)
    : 0
  const visibleCount = shouldWindow
    ? Math.ceil(INVENTORY_VIEWPORT_HEIGHT / INVENTORY_ROW_HEIGHT) + INVENTORY_OVERSCAN * 2
    : props.entries.length
  const end = Math.min(props.entries.length, start + visibleCount)
  const visible = props.entries.slice(start, end)
  const topSpace = shouldWindow ? start * INVENTORY_ROW_HEIGHT : 0
  const bottomSpace = shouldWindow ? (props.entries.length - end) * INVENTORY_ROW_HEIGHT : 0

  return (
    <div
      className={`${css.card} ${shouldWindow ? css.inventoryViewport : ''}`}
      role="list"
      onScroll={shouldWindow ? event => { setScrollTop(event.currentTarget.scrollTop) } : undefined}
    >
      {topSpace > 0 ? <div aria-hidden="true" style={{ height: topSpace }} /> : null}
      {visible.map(row => (
        <div
          className={css.inventoryRow}
          key={row.entry.entryId}
          role="listitem"
          aria-label={`${row.name}, ${row.status}`}
        >
          <div className={css.inventoryMain}>
            <div className={css.inventoryCopy}>
              <span className={css.rowTitle}>{row.name}</span>
              <span className={css.rowBody}>{row.description}</span>
              <code className={css.inventoryId} title={row.entry.entryId}>{row.entry.moduleName}</code>
            </div>
            <div className={css.inventoryActions}>
              {props.action?.(row)}
              <span className={css.inventoryStatus}>{row.status}</span>
            </div>
          </div>
        </div>
      ))}
      {bottomSpace > 0 ? <div aria-hidden="true" style={{ height: bottomSpace }} /> : null}
    </div>
  )
}

function PluginInventory(props: { data: PluginSettingsData; mcpOnly: boolean; onReload: () => void }): ReactNode {
  const t = useT()
  const [query, setQuery] = useState('')
  const [runtimeOpen, setRuntimeOpen] = useState(false)
  const [uninstallTarget, setUninstallTarget] = useState<string | undefined>()
  const marketClient = useMemo(() => createMarketClient(), [])
  const market = useAsync(
    async (signal) => props.mcpOnly ? undefined : await marketClient.installed(signal),
    [marketClient, props.mcpOnly],
  )
  const { operations, start } = useOperations(marketClient)
  const marketSnapshot = market.value?.ok === true ? market.value.value : undefined
  const entries = useMemo(() => props.data.inventory.entries
    .filter(entry => !props.mcpOnly || /mcp/i.test(entry.moduleName))
    .map(entry => {
      const name = inventoryName(entry.moduleName)
      return {
        entry,
        name,
        description: inventoryDescription(entry.moduleName, name, t),
        status: inventoryStatus(entry, t),
        marketPlugin: findMarketPlugin(entry.moduleName, marketSnapshot),
      }
    }), [marketSnapshot, props.data.inventory.entries, props.mcpOnly, t])
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = useMemo(() => entries.filter(row => `${row.name} ${row.entry.moduleName} ${row.entry.entryId} ${row.description}`
    .toLowerCase()
    .includes(normalizedQuery)), [entries, normalizedQuery])
  const extensions = filtered.filter(row => isUserExtension(row.entry))
  const runtimeModules = filtered.filter(row => !isUserExtension(row.entry))
  const reload = (): void => {
    props.onReload()
    market.reload()
  }
  const extensionAction = (row: PresentedInventoryEntry): ReactNode => {
    const plugin = row.marketPlugin
    if (plugin === undefined || marketSnapshot?.self?.name === plugin.name) return null
    const operation = operations[plugin.name]
    const busy = operation?.status === 'running'
    const confirm = uninstallTarget === plugin.name
    return (
      <Button
        className={css.dangerButton}
        disabled={busy}
        onClick={() => {
          if (!confirm) {
            setUninstallTarget(plugin.name)
            return
          }
          setUninstallTarget(undefined)
          start(plugin.name, () => marketClient.uninstall(plugin.name), reload)
        }}
      >
        {busy ? t('plugins.working') : confirm ? t('plugins.confirmUninstall') : t('plugins.uninstall')}
      </Button>
    )
  }
  return (
    <div className={css.pluginInventory}>
      <input className={css.search} type="search" value={query} placeholder={t('settings.plugins.search')} aria-label={t('settings.plugins.search')} onChange={event => { const next = event.target.value; setQuery(next); if (next.trim() !== '') setRuntimeOpen(true) }} />
      <div className={css.inventoryHeading}><h3 className={css.sectionTitle}>{t('settings.plugins.extensionsTitle')}</h3><span className={css.badge}>{extensions.length}</span></div>
      <p className={css.inventoryIntro}>{t('settings.plugins.extensionsBody')}</p>
      {!props.mcpOnly && extensions.length > 0 && market.value?.ok === false
        ? <div className={css.notice} role="status">{t('settings.plugins.marketUnavailable')}</div>
        : null}
      {extensions.length === 0 ? <EmptyState>{t(normalizedQuery === '' ? 'settings.plugins.emptyExtensions' : 'settings.plugins.emptyInventory')}</EmptyState> : <VirtualInventoryList key={`extensions-${normalizedQuery}`} entries={extensions} action={extensionAction} />}
      {!props.mcpOnly ? (
        <details className={css.runtimeModules} open={runtimeOpen} onToggle={event => { setRuntimeOpen(event.currentTarget.open) }}>
          <summary
            className={css.runtimeSummary}
            aria-label={`${t('settings.plugins.runtimeTitle')}, ${String(runtimeModules.length)}`}
            aria-expanded={runtimeOpen}
          >
            <span><span className={css.runtimeTitle}>{t('settings.plugins.runtimeTitle')}</span><span className={css.runtimeHint}>{t('settings.plugins.runtimeBody')}</span></span>
            <span className={css.badge}>{runtimeModules.length}</span>
          </summary>
          <div className={css.runtimeContent}>
            {runtimeModules.length === 0 ? <EmptyState>{t('settings.plugins.emptyRuntime')}</EmptyState> : <VirtualInventoryList key={`runtime-${normalizedQuery}`} entries={runtimeModules} />}
          </div>
        </details>
      ) : null}
    </div>
  )
}

/** Plugins page with DCode tabs, local token styling, and writable host settings. */
export function PluginSettingsSection({ mcpOnly = false }: { mcpOnly?: boolean }): ReactNode {
  const runtime = useRuntime()
  const t = useT()
  const data = useAsync(async () => await loadPluginSettings(runtime, !mcpOnly), [runtime, mcpOnly])
  const [tab, setTab] = useState<'config' | 'inventory'>(mcpOnly ? 'inventory' : 'config')
  const tabPrefix = useId()
  const tabRefs = useRef<Record<'config' | 'inventory', HTMLButtonElement | null>>({ config: null, inventory: null })
  const tabs: readonly { id: 'config' | 'inventory'; label: string }[] = [
    { id: 'config', label: t('settings.plugins.configTab') },
    { id: 'inventory', label: t('settings.plugins.extensionsTab') },
  ]
  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
    event.preventDefault()
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    const nextTab = tabs[next]
    if (nextTab === undefined) return
    setTab(nextTab.id)
    tabRefs.current[nextTab.id]?.focus()
  }

  if (data.loading && data.value === undefined) return <EmptyState><Spinner /></EmptyState>
  if (data.error !== undefined && data.value === undefined) return <EmptyState>{data.error}</EmptyState>
  if (data.value === undefined) return <EmptyState>{t('common.error')}</EmptyState>
  const value = data.value
  return (
    <section className={css.section}>
      <h2 className={css.sectionTitle}>{mcpOnly ? t('settings.mcp') : t('plugins.section.settings')}</h2>
      <p className={css.sectionBody}>{mcpOnly ? t('settings.plugins.mcpBody') : t('settings.pluginsBody')}</p>
      {!mcpOnly ? (
        <div className={css.pluginTabs} role="tablist" aria-label={t('settings.plugins.tabs')}>
          {tabs.map((entry, index) => (
            <button
              key={entry.id}
              ref={element => { tabRefs.current[entry.id] = element }}
              id={`${tabPrefix}-${entry.id}`}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              aria-controls={`${tabPrefix}-panel`}
              tabIndex={tab === entry.id ? 0 : -1}
              className={`${css.pluginTab} ${tab === entry.id ? css.pluginTabActive : ''}`}
              onClick={() => { setTab(entry.id) }}
              onKeyDown={event => { moveTab(event, index) }}
            >{entry.label}</button>
          ))}
        </div>
      ) : null}
      <div
        id={`${tabPrefix}-panel`}
        role="tabpanel"
        tabIndex={0}
        aria-labelledby={mcpOnly ? undefined : `${tabPrefix}-${tab}`}
      >
        {!mcpOnly && tab === 'config' ? <PluginConfigSection data={value} onReload={data.reload} /> : <PluginInventory data={value} mcpOnly={mcpOnly} onReload={data.reload} />}
      </div>
    </section>
  )
}
