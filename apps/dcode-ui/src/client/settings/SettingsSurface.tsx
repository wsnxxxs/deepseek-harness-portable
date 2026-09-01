/**
 * The settings surface.
 *
 * Sections read the Host's own controllers — the settings registry, the model
 * catalogue, the skill and command lists, the plugin inventory — so nothing
 * here is a second copy of configuration. Where this distribution has no
 * bespoke editor for a namespace, the section shows the registry's live
 * values and points at the classic settings surface, which is never removed.
 *
 * The Interface section is the workbench's own: it is one of the four switch
 * entry points between the modern and classic front ends.
 * @module @dsh-portable/dcode-ui/client/settings/SettingsSurface
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  IconAgentPresetOutline16, IconCloseOutline16, IconDatabaseOutline16, IconDataOutline16,
  IconPersonalizationOutline16, IconPlusOutline16,
  IconQuestionOutline14, IconSearchOutline16, IconSettingsOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useAsync, useSessionList } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useNavigation, type NavigationStore, type SettingsSection } from '../state/navigation.ts'
import { Button, EmptyState, Spinner, ui } from '../shell/ui.tsx'
import { useModalFocus } from '../shell/use-modal-focus.ts'
import { ThemeSwitch, useAppearance } from '../shell/ThemeSwitch.tsx'
import { UiModeSwitch } from '../shell/UiModeSwitch.tsx'
import type { DcodeKey } from '../locales.ts'
import { aggregateUsage, formatPercent, formatTokenCount, summarizeUsage } from './usage.ts'
import { UsageCards, usageCardStyles } from './UsageCards.tsx'
import usageCardClasses from './UsageCards.module.css'

import { SelectMenu } from './SelectMenu.tsx'
import { PluginSettingsSection } from './PluginSettingsSection.tsx'
import { AgentWorkflowSection } from './AgentWorkflowSection.tsx'
import {
  providerReadiness, providerRemovable, visibleProviderRows,
  type ProviderReadiness, type ProviderReadinessFacts,
} from './provider-readiness.ts'
import css from './SettingsSurface.module.css'
import type {
  CredentialInfo, LlmConfigurableProvider, LlmProviderInfo,
  ModelCatalog, SettingsNamespaceView, SettingsPathOpView,
} from '@deepseek-ai/dsh-api-remotes/client'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { DcodeRuntime } from '../state/runtime.ts'

/** Props of the settings surface. */
export interface SettingsSurfaceProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
}

/** Settings sections shown in the DCode settings rail. */
type SettingsNavSection = 'general' | 'models' | 'plugins' | 'agentPresets' | 'data' | 'about'

const RAIL: readonly { id: SettingsNavSection; label: DcodeKey }[] = [
  // Keep this order and wording aligned with the official DSH SettingsRoot.
  { id: 'general', label: 'settings.general' },
  { id: 'models', label: 'settings.modelsNav' },
  { id: 'plugins', label: 'settings.pluginsNav' },
  { id: 'agentPresets', label: 'settings.agentPresets' },
  { id: 'about', label: 'settings.about' },
]

/** A titled block with an explanatory line. */
function Section(props: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <section className={css.section}>
      <h2 className={css.sectionTitle}>{props.title}</h2>
      {props.body === undefined ? null : <p className={css.sectionBody}>{props.body}</p>}
      {props.children}
    </section>
  )
}

/** One settings row: label, explanation, and a control. */
function Row(props: { title: string; body?: string; control?: React.ReactNode }) {
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

interface ClientBuildInfo {
  readonly version: string | undefined
  readonly commit: string | undefined
  readonly dirty: boolean
}

/** Read the same public build metadata used by the shared DSH client shell. */
function clientBuildInfo(): ClientBuildInfo {
  const version = process.env.DSH_CLIENT_VERSION?.trim() || undefined
  const commit = process.env.DSH_CLIENT_COMMIT_HASH?.trim() || undefined
  return {
    version,
    commit,
    dirty: process.env.DSH_CLIENT_GIT_DIRTY === 'true',
  }
}

/** Product identity and build metadata for the DCode settings rail. */
function AboutSection() {
  const t = useT()
  const build = clientBuildInfo()

  return (
    <Section title={t('settings.about')} body={t('settings.aboutBody')}>
      <div className={css.aboutHero}>
        <div className={css.aboutIcon} aria-hidden="true"><IconQuestionOutline14 size={18} /></div>
        <div className={css.aboutCopy}>
          <h3 className={css.aboutName}>{t('settings.aboutProduct')}</h3>
          <p className={css.aboutDescription}>{t('settings.aboutDescription')}</p>
        </div>
      </div>
      <div className={css.card}>
        <Row
          title={t('settings.aboutVersion')}
          body={t('settings.aboutVersionBody')}
          control={<span className={css.rowMono}>{build.version === undefined ? t('settings.aboutVersionDevelopment') : `v${build.version}`}</span>}
        />
        {build.commit === undefined ? null : (
          <Row
            title={t('settings.aboutCommit')}
            control={<span className={css.rowMono}>{build.commit}</span>}
          />
        )}
        {build.commit === undefined ? null : (
          <Row
            title={t('settings.aboutBuild')}
            control={(
              <span className={`${css.badge} ${build.dirty ? css.aboutStatusDirty : css.aboutStatusClean}`}>
                {build.dirty ? t('settings.aboutBuildDirty') : t('settings.aboutBuildClean')}
              </span>
            )}
          />
        )}
      </div>
    </Section>
  )
}

/** Language, appearance, and the front-end switch. */
function GeneralSection() {
  const runtime = useRuntime()
  const t = useT()
  const uiModeT = runtime.uiModeT
  const locale = useSyncExternalStore(
    runtime.locale.subscribe,
    runtime.locale.getSnapshot,
    runtime.locale.getSnapshot,
  )
  const theme = runtime.theme
  // ThemeRuntime emits one revision for both palette and font-size writes.
  // The appearance store carries that notification while remaining optional.
  const themeKey = useCallback((): string => {
    const current = theme?.getTheme()
    return current === undefined
      ? ''
      : [
        current.preference ?? '', current.fontSize, current.active.id,
        ...(current.themes ?? []).map(entry => entry.id),
      ].join(':')
  }, [theme])
  const themeState = useSyncExternalStore(
    runtime.appearance.subscribe,
    themeKey,
    themeKey,
  )
  const { fontSize, setFontSize, canSetFontSize } = useAppearance()
  const snapshot = useMemo(() => theme?.getTheme(), [theme, themeState])
  // Anything a plugin registered beyond the two built-in palettes.
  const custom = (snapshot?.themes ?? []).filter(entry => entry.id !== 'light' && entry.id !== 'dark')
  const localeOptions = locale.locales.length === 0
    ? [{ id: locale.active, label: locale.active }]
    : locale.locales

  return (
    <>
      <Section title={t('settings.language')}>
        <div className={css.card}>
          <Row
            title={t('settings.language')}
            control={(
              <SelectMenu
                value={locale.active}
                ariaLabel={t('settings.language')}
                options={localeOptions.map(option => ({ id: option.id, label: option.label }))}
                disabled={localeOptions.length <= 1}
                onChange={(value) => { runtime.locale.set(value) }}
              />
            )}
          />
        </div>
      </Section>
      <Section title={t('settings.appearance')}>
        <div className={css.card}>
          <Row title={t('settings.theme')} control={<ThemeSwitch />} />
          {/* Only shown once something has registered a theme beyond the two
              built-ins: a select listing exactly "light" and "dark" would say
              nothing the segmented control above does not already say. */}
          {custom.length === 0
            ? null
            : (
              <Row
                title={t('settings.themeCustom')}
                control={(
                  <SelectMenu
                    value={snapshot?.preference ?? snapshot?.active.id ?? 'system'}
                    ariaLabel={t('settings.themeCustom')}
                    options={[
                      { id: 'system', label: t('theme.system') },
                      ...(snapshot?.themes ?? []).map(entry => ({ id: entry.id, label: entry.id })),
                    ]}
                    onChange={(value) => { theme?.setTheme?.(value) }}
                  />
                )}
              />
            )}
          {/* Copy comes from the ui-mode dictionary, like the switch itself:
              the roster of surfaces is not the workbench's to describe. */}
          <Row
            title={uiModeT('interface')}
            body={uiModeT('interface.body')}
            control={<UiModeSwitch />}
          />
          <Row
            title={t('settings.fontSize')}
            control={!canSetFontSize
              ? <span className={css.badge}>{fontSize}</span>
              : (
                <span className={css.stepper}>
                  <button
                    type="button"
                    className={css.stepperButton}
                    aria-label={`${t('settings.fontSize')} −`}
                    disabled={fontSize <= 11}
                    onClick={() => { setFontSize(Math.max(11, fontSize - 1)) }}
                  >−</button>
                  <span className={css.stepperValue}>{fontSize}</span>
                  <button
                    type="button"
                    className={css.stepperButton}
                    aria-label={`${t('settings.fontSize')} +`}
                    disabled={fontSize >= 22}
                    onClick={() => { setFontSize(Math.min(22, fontSize + 1)) }}
                  >+</button>
                </span>
              )}
          />
        </div>
      </Section>
    </>
  )
}

function objectAt(source: unknown, path: readonly string[]): Record<string, unknown> | undefined {
  let current: unknown = source
  for (const key of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'object' && current !== null && !Array.isArray(current)
    ? current as Record<string, unknown>
    : undefined
}

function valueAt(source: unknown, path: readonly string[]): unknown {
  let current: unknown = source
  for (const key of path) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

function stringAt(source: unknown, path: readonly string[]): string | undefined {
  const value = valueAt(source, path)
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function modelCredentialRef(provider: string, profile: Record<string, unknown> | undefined): string {
  const named = stringAt(profile, ['apiKeyEnv'])
  return named ?? `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
}

function providerOptionLabel(row: Pick<ModelProviderRow, 'id' | 'name'>): string {
  if (row.name.trim().toLowerCase() !== row.id.toLowerCase()) return row.name
  const acronyms = new Map([['ai', 'AI'], ['api', 'API'], ['aws', 'AWS'], ['gcp', 'GCP'], ['ibm', 'IBM'], ['openai', 'OpenAI']])
  return row.id.split('-').map(part => acronyms.get(part) ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
}

export interface ModelProviderRow {
  readonly id: string
  readonly name: string
  readonly active: boolean
  readonly settingsNs: string
  readonly settingsPath: readonly string[]
  readonly namespace: SettingsNamespaceView | undefined
  readonly profile: Record<string, unknown> | undefined
  readonly userProfile: Record<string, unknown> | undefined
  readonly credentialRef: string
  readonly credential: CredentialInfo | undefined
  readonly credentialError?: string
  readonly providerError?: string
  readonly declared?: boolean
}

export interface ModelSettingsData {
  readonly catalog: ModelCatalog
  readonly providers: readonly ModelProviderRow[]
  readonly writable: boolean
  readonly hasDocument: boolean
  readonly credentialError?: string
}

function modelProviderRows(
  registered: readonly LlmProviderInfo[],
  configurable: readonly LlmConfigurableProvider[],
  namespaces: readonly SettingsNamespaceView[],
  credentials: Readonly<Record<string, CredentialInfo>>,
): ModelProviderRow[] {
  const active = new Set(registered.map(provider => provider.id))
  const declared = new Set(configurable.map(provider => provider.provider))
  const rows = configurable.map((provider) => {
    const namespace = namespaces.find(view => view.ns === provider.settingsNs)
    const profile = objectAt(namespace?.value, provider.settingsPath)
    const userProfile = objectAt(namespace?.user, provider.settingsPath)
    const credentialRef = modelCredentialRef(provider.provider, profile)
    return {
      id: provider.provider,
      name: provider.displayName,
      active: active.has(provider.provider),
      settingsNs: provider.settingsNs,
      settingsPath: provider.settingsPath,
      namespace,
      profile,
      userProfile,
      credentialRef,
      credential: credentials[credentialRef],
      ...provider.declared === undefined ? {} : { declared: provider.declared },
    }
  })
  for (const provider of registered) {
    if (declared.has(provider.id)) continue
    rows.push({
      id: provider.id,
      name: provider.name,
      active: true,
      settingsNs: '',
      settingsPath: [],
      namespace: undefined,
      profile: undefined,
      userProfile: undefined,
      credentialRef: modelCredentialRef(provider.id, undefined),
      credential: credentials[modelCredentialRef(provider.id, undefined)],
    })
  }
  return rows
}

export async function loadModelSettings(runtime: DcodeRuntime): Promise<ModelSettingsData> {
  const [catalog, registered, configurable, described] = await Promise.all([
    runtime.remote.session.modelCatalog(),
    runtime.remote.llm.listProviders(),
    runtime.remote.llm.listConfigurableProviders(),
    runtime.remote.settings.describe(),
  ])
  if (!catalog.ok) throw new Error(catalog.error.message)
  if (!registered.ok) throw new Error(registered.error.message)
  if (!configurable.ok) throw new Error(configurable.error.message)
  if (!described.ok) throw new Error(described.error.message)
  const refs = [...new Set([
    ...configurable.value.map(provider => {
      const namespace = described.value.namespaces.find(view => view.ns === provider.settingsNs)
      return modelCredentialRef(provider.provider, objectAt(namespace?.value, provider.settingsPath))
    }),
    ...registered.value
      .filter(provider => !configurable.value.some(candidate => candidate.provider === provider.id))
      .map(provider => modelCredentialRef(provider.id, undefined)),
  ])]
  let credentials: Readonly<Record<string, CredentialInfo>> = {}
  let credentialError: string | undefined
  if (refs.length > 0) {
    try {
      const response = await runtime.remote.credentials.describe(refs)
      if (response.ok) credentials = response.value
      else credentialError = response.error.message
    } catch (cause: unknown) {
      credentialError = cause instanceof Error ? cause.message : String(cause)
    }
  }
  return {
    catalog: catalog.value,
    providers: modelProviderRows(
      registered.value,
      configurable.value,
      described.value.namespaces,
      credentials,
    ).map(row => {
      const failure = catalog.value.failures.find(candidate => candidate.id === row.id)
      return {
        ...row,
        ...credentialError === undefined ? {} : { credentialError },
        ...failure === undefined ? {} : { providerError: failure.message },
      }
    }),
    writable: described.value.writable,
    hasDocument: described.value.hasDocument,
    ...credentialError === undefined ? {} : { credentialError },
  }
}

function providerReadinessLabel(readiness: ProviderReadiness, t: ReturnType<typeof useT>): string {
  switch (readiness.reason) {
    case 'missing-api-key': return t('settings.models.keyMissing')
    case 'not-configured': return t('settings.models.notConfigured')
    case 'credential-configured': return t('settings.models.keyConfigured')
    case 'key-not-required': return t('settings.models.keyNotRequired')
    case 'credential-error': return readiness.detail === undefined
      ? t('settings.models.credentialErrorUnknown')
      : t('settings.models.credentialError', { error: readiness.detail })
    case 'provider-error': return t('settings.models.providerError', { error: readiness.detail ?? t('common.error') })
    case 'configuration-error': return readiness.detail === undefined
      ? t('settings.models.configurationErrorUnknown')
      : t('settings.models.configurationError', { error: readiness.detail })
  }
}

function ModelProviderCard(props: {
  row: ModelProviderRow
  writable: boolean
  onReload: () => void
  initiallyOpen?: boolean
  onClose?: () => void
  onSaved?: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const [open, setOpen] = useState(props.initiallyOpen === true)
  const [baseURL, setBaseURL] = useState(() => stringAt(props.row.profile, ['baseURL']) ?? '')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | undefined>()
  const [deleting, setDeleting] = useState(false)
  const profileEditable = props.writable && props.row.namespace !== undefined && props.row.settingsNs !== ''
  const keyEditable = props.row.credential?.writable !== false
  const editable = profileEditable || keyEditable
  const removable = profileEditable && providerRemovable(props.row)

  useEffect(() => {
    if (open) return
    setBaseURL(stringAt(props.row.profile, ['baseURL']) ?? '')
    setApiKey('')
    setFailure(undefined)
  }, [open, props.row.profile])

  const save = async (): Promise<void> => {
    if (busy || !editable) return
    setBusy(true)
    setFailure(undefined)
    try {
      const namespace = props.row.namespace
      const ops: SettingsPathOpView[] = []
      if (profileEditable && namespace !== undefined) {
        const storedBaseURL = stringAt(valueAt(namespace.user, [...props.row.settingsPath, 'baseURL']), [])
        const effectiveBaseURL = stringAt(props.row.profile, ['baseURL'])
        const nextBaseURL = baseURL.trim()
        if (nextBaseURL.length === 0) {
          if (storedBaseURL !== undefined) ops.push({ op: 'unset', path: [...props.row.settingsPath, 'baseURL'] })
        } else if (nextBaseURL !== storedBaseURL && !(storedBaseURL === undefined && nextBaseURL === effectiveBaseURL)) {
          ops.push({
            op: 'set',
            path: [...props.row.settingsPath, 'baseURL'],
            value: nextBaseURL as JsonValue,
          })
        }
        if (props.row.settingsNs === 'llm-pi-ai'
          && stringAt(props.row.profile, ['apiKeyEnv']) === undefined
          && apiKey.trim().length > 0) {
          ops.push({
            op: 'set',
            path: [...props.row.settingsPath, 'apiKeyEnv'],
            value: props.row.credentialRef as JsonValue,
          })
        }
        if (ops.length > 0) {
          const response = await runtime.remote.settings.mutate(
            props.row.settingsNs,
            ops,
            namespace.revision,
          )
          if (!response.ok) throw new Error(response.error.message)
        }
      }
      if (apiKey.trim().length > 0) {
        const response = await runtime.remote.credentials.set(props.row.credentialRef, apiKey.trim())
        if (!response.ok) throw new Error(response.error.message)
      }
      if (ops.length === 0 && apiKey.trim().length === 0) {
        setOpen(false)
        props.onClose?.()
        return
      }
      setOpen(false)
      props.onReload()
      props.onSaved?.()
    } catch (cause: unknown) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (): Promise<void> => {
    if (deleting || !removable) return
    if (!window.confirm(t('settings.models.deleteConfirm', { name: props.row.name }))) return
    setDeleting(true)
    setFailure(undefined)
    try {
      if (props.row.credential?.configured === true) {
        const credential = await runtime.remote.credentials.unset(props.row.credentialRef)
        if (!credential.ok) throw new Error(credential.error.message)
      }
      const response = await runtime.remote.settings.mutate(
        props.row.settingsNs,
        [{ op: 'unset', path: [...props.row.settingsPath] }],
        undefined,
      )
      if (!response.ok) throw new Error(response.error.message)
      props.onReload()
    } catch (cause: unknown) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setDeleting(false)
    }
  }

  const requiresApiKey = props.row.settingsNs === ''
    ? false
    : props.row.profile === undefined
      ? undefined
      : stringAt(props.row.profile, ['apiKeyEnv']) !== undefined
  const readinessFacts: ProviderReadinessFacts = {
    active: props.row.active,
    configured: props.row.profile !== undefined || props.row.settingsNs === '',
    requiresApiKey,
    credential: props.row.credential,
    ...props.row.credentialError === undefined ? {} : { credentialError: props.row.credentialError },
    ...props.row.providerError === undefined ? {} : { providerError: props.row.providerError },
    ...failure === undefined ? {} : { configurationError: failure },
  }
  const readiness = providerReadiness(readinessFacts)
  const statusLabel = providerReadinessLabel(readiness, t)
  const statusClass = readiness.kind === 'ready'
    ? css.statusDotGood
    : readiness.kind === 'unconfigured'
      ? css.statusDotMissing
      : readiness.kind === 'error'
        ? css.statusDotError
        : css.statusDotNeutral
  const editorId = `dcode-provider-editor-${props.row.id.replace(/[^a-z0-9_-]/gi, '-')}`
  const closeEditor = (): void => {
    setOpen(false)
    props.onClose?.()
  }

  return (
    <div className={css.providerCard}>
      <div className={`${css.providerHead} ${ui.cardHeader}`}>
        <span className={`${css.statusDot} ${statusClass}`} role="img" aria-label={statusLabel} title={statusLabel} />
        <span className={css.providerStatusText}>{statusLabel}</span>
        <div className={css.rowText}>
          <div className={css.providerIdentity}>
            <h3 className={css.rowTitle}>{props.row.name}</h3>
            {props.row.declared === true ? <span className={css.providerTag}>{t('settings.models.customTag')}</span> : null}
          </div>
          <div className={css.rowBody}>{props.row.id}</div>
        </div>
        <div className={css.providerActions}>
          {editable && !open
            ? <Button
              ariaExpanded={false}
              ariaControls={editorId}
              onClick={() => {
                setOpen(true)
                setFailure(undefined)
              }}
            >{t('common.edit')}</Button>
            : editable ? null : <span className={css.badge}>{t('common.readOnly')}</span>}
          {removable
            ? <button type="button" className={css.dangerButton} disabled={deleting} onClick={() => { void remove() }}>
              {deleting ? t('settings.models.deleting') : t('settings.models.delete')}
            </button>
            : null}
        </div>
      </div>
      {open
        ? (
          <div
            className={css.providerEditor}
            id={editorId}
            role="group"
            aria-label={props.row.name}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') return
              event.preventDefault()
              event.stopPropagation()
              closeEditor()
            }}
          >
            <div className={css.providerEditorStatus} role="status" aria-label={statusLabel} title={statusLabel}>
              <span className={`${css.statusDot} ${statusClass}`} aria-hidden="true" />
              <span>{statusLabel}</span>
            </div>
            <label className={css.field}>
              <span className={css.fieldLabel}>{t('settings.models.apiKey')}</span>
              <input
                className={css.fieldInput}
                type="password"
                autoComplete="off"
                value={apiKey}
                placeholder={props.row.credential?.configured === true ? t('settings.models.keyConfiguredHint') : t('settings.models.keyPlaceholder')}
                disabled={busy || !keyEditable}
                onChange={event => { setApiKey(event.target.value) }}
              />
            </label>
            {profileEditable
              ? (
                <label className={css.field}>
                  <span className={css.fieldLabel}>{t('settings.models.baseURL')}</span>
                  <input
                    className={css.fieldInput}
                    type="url"
                    value={baseURL}
                    placeholder={t('settings.models.baseURLPlaceholder')}
                    disabled={busy}
                    onChange={event => { setBaseURL(event.target.value) }}
                  />
                </label>
              )
              : null}
            {failure === undefined ? null : <div className={css.inlineError} role="alert">{failure}</div>}
            <div className={css.editorActions}>
              <Button onClick={closeEditor} disabled={busy}>{t('common.cancel')}</Button>
              <Button primary onClick={() => { void save() }} disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
            </div>
          </div>
        )
        : null}
    </div>
  )
}

const CUSTOM_PROVIDER_NS = 'llm-pi-ai'
const CUSTOM_PROVIDER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/** Compact creator for an OpenAI/Anthropic-compatible custom endpoint. */
function CustomProviderForm(props: {
  rows: readonly ModelProviderRow[]
  writable: boolean
  onCreated: () => void
  onCancel: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const namespace = props.rows.find(row => row.settingsNs === CUSTOM_PROVIDER_NS)?.namespace
  const [name, setName] = useState('')
  const [route, setRoute] = useState('')
  const [routeTouched, setRouteTouched] = useState(false)
  const [baseURL, setBaseURL] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [protocol, setProtocol] = useState('openai-completions')
  const [modelText, setModelText] = useState('')
  const [busy, setBusy] = useState(false)
  const [committed, setCommitted] = useState(false)
  const [failure, setFailure] = useState<string | undefined>()

  const modelIds = [...new Set(modelText.split(/[\n,]+/).map(value => value.trim()).filter(Boolean))]
  const invalidRoute = route.length > 0 && !CUSTOM_PROVIDER_ID.test(route)
  const routeTaken = props.rows.some(row => row.id === route)
  const disabled = busy || !props.writable || namespace === undefined

  const create = async (): Promise<void> => {
    if (disabled || invalidRoute || routeTaken || route.length === 0 || name.trim().length === 0
      || baseURL.trim().length === 0 || modelIds.length === 0) return
    setBusy(true)
    setFailure(undefined)
    const credentialRef = modelCredentialRef(route, undefined)
    try {
      if (!committed) {
        const profile = {
          displayName: name.trim(),
          api: protocol,
          baseURL: baseURL.trim(),
          models: modelIds.map(id => ({ id })),
          ...apiKey.trim().length === 0 ? {} : { apiKeyEnv: credentialRef },
        }
        const response = await runtime.remote.settings.mutate(
          CUSTOM_PROVIDER_NS,
          [{ op: 'set', path: ['providers', route], value: profile as JsonValue }],
          namespace?.revision,
        )
        if (!response.ok) throw new Error(response.error.message)
        setCommitted(true)
      }
      if (apiKey.trim().length > 0) {
        const response = await runtime.remote.credentials.set(credentialRef, apiKey.trim())
        if (!response.ok) throw new Error(response.error.message)
      }
      props.onCreated()
    } catch (cause: unknown) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={css.customProviderForm}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        event.stopPropagation()
        props.onCancel()
      }}
    >
      <div className={css.formGrid}>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('settings.models.providerName')}</span>
          <input className={css.fieldInput} value={name} disabled={disabled || committed} onChange={(event) => {
            const next = event.target.value
            setName(next)
            if (!routeTouched) setRoute(next.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
          }} />
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('settings.models.providerId')}</span>
          <input className={css.fieldInput} value={route} disabled={disabled || committed} onChange={(event) => { setRouteTouched(true); setRoute(event.target.value) }} />
          {invalidRoute ? <span className={css.fieldError}>{t('settings.models.providerIdInvalid')}</span> : null}
          {routeTaken ? <span className={css.fieldError}>{t('settings.models.providerIdTaken')}</span> : null}
        </label>
        <label className={`${css.field} ${css.formWide}`}>
          <span className={css.fieldLabel}>{t('settings.models.baseURL')}</span>
          <input className={css.fieldInput} type="url" value={baseURL} disabled={disabled || committed} placeholder={t('settings.models.baseURLPlaceholder')} onChange={event => { setBaseURL(event.target.value) }} />
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('settings.models.protocol')}</span>
          <select className={css.fieldInput} value={protocol} disabled={disabled || committed} onChange={event => { setProtocol(event.target.value) }}>
            <option value="openai-completions">OpenAI Chat Completions</option>
            <option value="openai-responses">OpenAI Responses</option>
            <option value="anthropic-messages">Anthropic Messages</option>
          </select>
        </label>
        <label className={css.field}>
          <span className={css.fieldLabel}>{t('settings.models.apiKey')}</span>
          <input className={css.fieldInput} type="password" autoComplete="off" value={apiKey} disabled={busy || !props.writable} placeholder={t('settings.models.keyPlaceholder')} onChange={event => { setApiKey(event.target.value) }} />
        </label>
        <label className={`${css.field} ${css.formWide}`}>
          <span className={css.fieldLabel}>{t('settings.models.modelList')}</span>
          <textarea className={css.fieldTextarea} value={modelText} disabled={disabled || committed} placeholder={t('settings.models.modelListPlaceholder')} onChange={event => { setModelText(event.target.value) }} />
          <span className={css.fieldHint}>{t('settings.models.modelListHint')}</span>
        </label>
      </div>
      {namespace === undefined ? <div className={css.inlineError}>{t('settings.models.customUnavailable')}</div> : null}
      {failure === undefined ? null : <div className={css.inlineError} role="alert">{failure}</div>}
      <div className={css.editorActions}>
        <Button disabled={busy} onClick={props.onCancel}>{t('common.cancel')}</Button>
        <Button primary disabled={disabled || invalidRoute || routeTaken || route.length === 0 || name.trim().length === 0 || baseURL.trim().length === 0 || modelIds.length === 0} onClick={() => { void create() }}>
          {busy ? t('common.saving') : t('settings.models.add')}
        </Button>
      </div>
    </div>
  )
}

/** Provider routes, catalog, and the editable credential/profile controls. */
function ModelsSection(props: { focusedProvider?: string; onFocusedProviderSaved?: () => void }) {
  const runtime = useRuntime()
  const t = useT()
  const models = useAsync(async () => await loadModelSettings(runtime), [runtime])
  const [addingProvider, setAddingProvider] = useState<string | undefined>()
  const [addingCustom, setAddingCustom] = useState(false)

  if (models.loading && models.value === undefined) return <EmptyState><Spinner /></EmptyState>
  if (models.error !== undefined && models.value === undefined) return <EmptyState>{models.error}</EmptyState>
  if (models.value === undefined) return <EmptyState>{t('common.error')}</EmptyState>
  const value = models.value
  const providers = visibleProviderRows(value.providers)
  const configured = providers.filter(row => row.credential?.configured === true || row.active)
  const addable = providers.filter(row =>
    row.credential?.configured !== true && !row.active && row.settingsNs !== '')
  const draft = addingProvider === undefined
    ? undefined
    : addable.find(row => row.id === addingProvider)
  const focused = props.focusedProvider === undefined
    ? undefined
    : providers.find(row => row.id === props.focusedProvider)
  const visible = focused === undefined
    ? configured
    : [focused, ...configured.filter(row => row.id !== focused.id)]

  return (
    <>
      <section className={`${css.section} ${css.modelsSection}`}>
        <div className={css.modelsHeader}>
          <div>
            <h2 className={css.modelsTitle}>{t('settings.models')}</h2>
            <p className={css.sectionBody}>{t('settings.modelsBody')}</p>
          </div>
          {value.hasDocument
            ? <Button onClick={() => { void runtime.remote.settings.openSettingsDocument() }}>{t('settings.openOfficialSettings')}</Button>
            : null}
        </div>
        {value.credentialError === undefined ? null : <div className={css.notice}>{`${t('settings.models.credentialWarning')}: ${value.credentialError}`}</div>}
        <div className={css.providerList}>
          {visible.map(row => (
            <ModelProviderCard
              key={row.id}
              row={row}
              writable={value.writable}
              initiallyOpen={row.id === props.focusedProvider}
              onReload={models.reload}
              onSaved={row.id === props.focusedProvider ? props.onFocusedProviderSaved : undefined}
            />
          ))}
          {visible.length === 0 ? <div className={css.modelsEmpty}>{t('settings.models.empty')}</div> : null}
        </div>
        {draft === undefined ? null : (
          <ModelProviderCard
            key={`add-${draft.id}`}
            row={draft}
            writable={value.writable}
            initiallyOpen
            onReload={models.reload}
            onClose={() => { setAddingProvider(undefined) }}
          />
        )}
        {addingCustom
          ? <CustomProviderForm
            rows={value.providers}
            writable={value.writable}
            onCancel={() => { setAddingCustom(false) }}
            onCreated={() => { setAddingCustom(false); models.reload() }}
          />
          : null}
        {draft === undefined && !addingCustom
          ? (
            <div className={css.addActions}>
              <div className={css.addSelect}>
                <SelectMenu
                  value=""
                  ariaLabel={t('settings.models.addProvider')}
                  placeholder={<><IconPlusOutline16 />{t('settings.models.addProvider')}</>}
                  disabled={!value.writable || addable.length === 0}
                  options={addable.map(row => ({ id: row.id, label: providerOptionLabel(row), detail: row.id }))}
                  onChange={(provider) => { setAddingProvider(provider); setAddingCustom(false) }}
                />
              </div>
              <button type="button" className={css.addButton} disabled={!value.writable} onClick={() => { setAddingCustom(true); setAddingProvider(undefined) }}>
                <IconPlusOutline16 />{t('settings.models.addCustomProvider')}
              </button>
            </div>
          )
          : null}
        {value.catalog.failures.length === 0 ? null : (
          <details className={css.modelFailures}>
            <summary>{t('settings.models.failures')} ({value.catalog.failures.length})</summary>
            {value.catalog.failures.map(failure => <p key={failure.id}>{failure.name}: {failure.message}</p>)}
          </details>
        )}
      </section>
      <UsageSection />
    </>
  )
}

/** Human-invocable skills visible to the current session. */
function SkillsSection({ sessionId }: { sessionId: SessionId | undefined }) {
  const runtime = useRuntime()
  const t = useT()
  const [query, setQuery] = useState('')
  const skills = useAsync(
    async () => (sessionId === undefined ? undefined : await runtime.remote.skills.list({ sessionId })),
    [runtime, sessionId],
  )

  const rows = useMemo(() => {
    const list = skills.value?.ok === true ? skills.value.value.skills : []
    const needle = query.trim().toLowerCase()
    return needle === ''
      ? list
      : list.filter(skill =>
        skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle))
  }, [skills.value, query])

  if (sessionId === undefined) return <EmptyState>{t('composer.needsSession')}</EmptyState>
  if (skills.loading) return <EmptyState><Spinner /></EmptyState>
  if (skills.error !== undefined) return <EmptyState>{skills.error}</EmptyState>
  if (skills.value?.ok === false) return <EmptyState>{skills.value.error.message}</EmptyState>

  return (
    <Section title={t('settings.skills')} body={t('settings.count', { count: rows.length })}>
      <input
        className={css.search}
        value={query}
        placeholder={t('common.search')}
        aria-label={t('common.search')}
        onChange={event => { setQuery(event.target.value) }}
      />
      {rows.length === 0
        ? <EmptyState>{t('settings.skillsEmpty')}</EmptyState>
        : (
          <div className={css.card}>
            {rows.map(skill => (
              <Row
                key={skill.name}
                title={`/${skill.name}`}
                body={skill.whenToUse ?? skill.description}
                control={skill.modelInvocable ? <span className={css.badge}>model</span> : undefined}
              />
            ))}
          </div>
        )}
    </Section>
  )
}

/** Slash commands registered for the current session. */
function CommandsSection({ sessionId }: { sessionId: SessionId | undefined }) {
  const runtime = useRuntime()
  const t = useT()
  const commands = useAsync(
    async () => (sessionId === undefined ? undefined : await runtime.remote.commands.list(sessionId)),
    [runtime, sessionId],
  )

  if (sessionId === undefined) return <EmptyState>{t('composer.needsSession')}</EmptyState>
  if (commands.loading) return <EmptyState><Spinner /></EmptyState>
  if (commands.error !== undefined) return <EmptyState>{commands.error}</EmptyState>
  if (commands.value?.ok === false) return <EmptyState>{commands.value.error.message}</EmptyState>
  const rows = commands.value?.ok === true ? commands.value.value : []

  return (
    <Section title={t('settings.commands')} body={t('settings.count', { count: rows.length })}>
      {rows.length === 0
        ? <EmptyState>{t('settings.commandsEmpty')}</EmptyState>
        : (
          <div className={css.card}>
            {rows.map(command => (
              <Row
                key={command.name}
                title={`/${command.name}`}
                body={(command as { description?: string }).description}
              />
            ))}
          </div>
        )}
    </Section>
  )
}

/** Persist the default preset through the same settings namespace as DSH. */
async function saveDefaultPreset(
  runtime: ReturnType<typeof useRuntime>,
  id: string,
): Promise<string | undefined> {
  try {
    const result = await runtime.remote.settings.update('agent-presets', { default: id }, undefined)
    return result.ok ? undefined : result.error.message
  } catch (cause: unknown) {
    return cause instanceof Error ? cause.message : String(cause)
  }
}

/** The Host's current Agent preset roster. */
function AgentPresetsSection() {
  const runtime = useRuntime()
  const t = useT()
  const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime])
  const opener = useAsync(async () => await runtime.remote.settings.canOpenAgentPresetDirectory(), [runtime])
  const [selectedDefault, setSelectedDefault] = useState<string | undefined>()
  const [savingDefault, setSavingDefault] = useState(false)
  const [defaultError, setDefaultError] = useState<string | undefined>()
  const [dialog, setDialog] = useState<
    | { kind: 'copy'; from: string }
    | { kind: 'view'; id: string }
    | { kind: 'delete'; id: string }
    | undefined
  >()
  const [copyId, setCopyId] = useState('')
  const [copyName, setCopyName] = useState('')
  const [viewContent, setViewContent] = useState<string | undefined>()
  const [revealedPaths, setRevealedPaths] = useState<Record<string, string>>({})
  const [dialogBusy, setDialogBusy] = useState(false)
  const [dialogError, setDialogError] = useState<string | undefined>()
  const presets = roster.value?.ok === true ? roster.value.value.presets : []
  const hostDefault = presets.find(preset => preset.isDefault)?.id
  const defaultId = selectedDefault ?? hostDefault ?? presets[0]?.id ?? ''
  const authorable = roster.value?.ok === true && roster.value.value.authorable
  const canOpenDirectory = opener.value?.ok === true && opener.value.value

  useEffect(() => {
    if (hostDefault !== undefined) {
      setSelectedDefault(hostDefault)
      return
    }
    if (selectedDefault !== undefined && !presets.some(preset => preset.id === selectedDefault)) {
      setSelectedDefault(undefined)
    }
  }, [hostDefault, presets, selectedDefault])

  const saveDefault = useCallback((id: string) => {
    if (id === defaultId || savingDefault) return
    const previous = defaultId
    setSelectedDefault(id)
    setSavingDefault(true)
    setDefaultError(undefined)
    void saveDefaultPreset(runtime, id)
      .then((failure) => {
        if (failure === undefined) {
          roster.reload()
          return
        }
        setSelectedDefault(previous)
        setDefaultError(failure)
      })
      .catch((cause: unknown) => {
        setSelectedDefault(previous)
        setDefaultError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => { setSavingDefault(false) })
  }, [defaultId, roster, runtime.remote.settings, savingDefault])

  const closeDialog = (force = false): void => {
    if (dialogBusy && !force) return
    setDialog(undefined)
    setDialogError(undefined)
    setViewContent(undefined)
  }

  const dialogRef = useRef<HTMLDivElement | null>(null)
  useModalFocus(dialog !== undefined, dialogRef, { onClose: () => { closeDialog() } })

  const beginCopy = (from: string): void => {
    setCopyId('')
    setCopyName('')
    setDialogError(undefined)
    setDialog({ kind: 'copy', from })
  }

  const viewPreset = (id: string): void => {
    setDialogError(undefined)
    setViewContent(undefined)
    setDialog({ kind: 'view', id })
    setDialogBusy(true)
    void runtime.remote.agentPresets.read(id)
      .then((result) => {
        if (!result.ok) {
          setDialogError(result.error.message)
          return
        }
        setViewContent(result.value.content)
      })
      .catch((cause: unknown) => { setDialogError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setDialogBusy(false) })
  }

  const openPresetLocation = (id: string): void => {
    setDialogError(undefined)
    void runtime.remote.settings.openAgentPresetDirectory(id)
      .then((result) => {
        if (!result.ok) {
          setDialogError(result.error.message)
          return
        }
        const value = result.value as { readonly opened?: boolean; readonly path?: string }
        if (typeof value.path === 'string') {
          setRevealedPaths(previous => ({ ...previous, [id]: value.path as string }))
        }
      })
      .catch((cause: unknown) => { setDialogError(cause instanceof Error ? cause.message : String(cause)) })
  }

  const confirmCopy = (): void => {
    if (dialog?.kind !== 'copy' || dialogBusy) return
    const id = copyId.trim()
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      setDialogError(t('settings.agentPresets.idInvalid'))
      return
    }
    if (presets.some(preset => preset.id === id)) {
      setDialogError(t('settings.agentPresets.idTaken'))
      return
    }
    setDialogBusy(true)
    setDialogError(undefined)
    void runtime.remote.agentPresets.copy(dialog.from, id, copyName.trim() === '' ? undefined : copyName.trim())
      .then((result) => {
        if (!result.ok) {
          setDialogError(result.error.message)
          return
        }
        closeDialog(true)
        roster.reload()
        openPresetLocation(id)
      })
      .catch((cause: unknown) => { setDialogError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setDialogBusy(false) })
  }

  const confirmDelete = (): void => {
    if (dialog?.kind !== 'delete' || dialogBusy) return
    setDialogBusy(true)
    setDialogError(undefined)
    void runtime.remote.agentPresets.deletePreset(dialog.id)
      .then((result) => {
        if (!result.ok) {
          setDialogError(result.error.message)
          return
        }
        closeDialog(true)
        setSelectedDefault(undefined)
        roster.reload()
      })
      .catch((cause: unknown) => { setDialogError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setDialogBusy(false) })
  }

  if (roster.loading) return <EmptyState><Spinner /></EmptyState>
  if (roster.error !== undefined) return <EmptyState>{roster.error}</EmptyState>
  if (roster.value?.ok === false) return <EmptyState>{roster.value.error.message}</EmptyState>

  return (
    <Section title={t('settings.agentPresets')} body={t('settings.agentPresetsBody')}>
      {presets.length === 0
        ? <EmptyState>{t('settings.presetsEmpty')}</EmptyState>
        : (
          <>
            <div className={css.card}>
              <Row
                title={t('settings.agentPresetsDefault')}
                body={t('settings.agentPresetsDefaultBody')}
                control={(
                  <SelectMenu
                    value={defaultId}
                    ariaLabel={t('settings.agentPresetsDefault')}
                    options={presets.map(preset => ({
                      id: preset.id,
                      label: preset.name ?? preset.id,
                      detail: preset.broken,
                      disabled: preset.broken !== undefined,
                    }))}
                    disabled={savingDefault || presets.length < 2}
                    onChange={saveDefault}
                  />
                )}
              />
              {defaultError === undefined ? null : <div className={css.inlineError} role="alert">{defaultError}</div>}
            </div>
            <div className={css.card}>
              {presets.map(preset => (
                <Row
                  key={preset.id}
                  title={preset.name ?? preset.id}
                  body={[preset.description, preset.broken].filter(Boolean).join(' · ')}
                  control={(
                    <div className={css.presetActions}>
                      {preset.id === defaultId ? <span className={css.badge}>{t('settings.models.default')}</span> : null}
                      {preset.trust === 'system' && preset.broken === undefined
                        ? <Button onClick={() => { viewPreset(preset.id) }}>{t('settings.agentPresets.view')}</Button>
                        : null}
                      {authorable && preset.broken === undefined
                        ? <Button onClick={() => { beginCopy(preset.id) }}>{t('settings.agentPresets.copy')}</Button>
                        : null}
                      {preset.trust === 'user'
                        ? (
                          <>
                            <Button onClick={() => { openPresetLocation(preset.id) }}>{canOpenDirectory ? t('settings.agentPresets.openLocation') : t('settings.agentPresets.showLocation')}</Button>
                            <Button onClick={() => { setDialogError(undefined); setDialog({ kind: 'delete', id: preset.id }) }}>{t('settings.agentPresets.delete')}</Button>
                          </>
                        )
                        : null}
                    </div>
                  )}
                />
              ))}
            </div>
          </>
        )}
      {dialog === undefined
        ? null
        : (
          <div className={css.dialogBackdrop} role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
            <div ref={dialogRef} className={css.dialog} role="dialog" aria-modal="true" aria-labelledby="dcode-settings-dialog-title" tabIndex={-1}>
              {dialog.kind === 'copy'
                ? (
                  <>
                    <div className={css.dialogHeader}>
                      <div id="dcode-settings-dialog-title" className={css.dialogTitle}>{t('settings.agentPresets.copyTitle')}</div>
                      <Button onClick={closeDialog} disabled={dialogBusy}>{t('common.close')}</Button>
                    </div>
                    <p className={css.dialogBody}>{t('settings.agentPresets.copyBody')}</p>
                    <label className={css.field}>
                      <span className={css.fieldLabel}>{t('settings.agentPresets.id')}</span>
                      <input className={css.fieldInput} autoFocus value={copyId} placeholder="my-agent" disabled={dialogBusy} onChange={event => { setCopyId(event.target.value) }} />
                    </label>
                    <label className={css.field}>
                      <span className={css.fieldLabel}>{t('settings.agentPresets.name')}</span>
                      <input className={css.fieldInput} value={copyName} placeholder={t('settings.agentPresets.namePlaceholder')} disabled={dialogBusy} onChange={event => { setCopyName(event.target.value) }} />
                    </label>
                    {dialogError === undefined ? null : <div className={css.inlineError} role="alert">{dialogError}</div>}
                    <div className={css.dialogActions}>
                      <Button onClick={closeDialog} disabled={dialogBusy}>{t('common.cancel')}</Button>
                      <Button primary onClick={confirmCopy} disabled={dialogBusy}>{dialogBusy ? t('common.saving') : t('settings.agentPresets.copy')}</Button>
                    </div>
                  </>
                )
                : dialog.kind === 'view'
                  ? (
                    <>
                      <div className={css.dialogHeader}>
                        <div id="dcode-settings-dialog-title" className={css.dialogTitle}>{t('settings.agentPresets.view')}</div>
                        <Button onClick={closeDialog} disabled={dialogBusy}>{t('common.close')}</Button>
                      </div>
                      {dialogBusy ? <EmptyState><Spinner /></EmptyState> : viewContent === undefined ? <div className={css.inlineError} role="alert">{dialogError ?? t('common.error')}</div> : <pre className={css.viewerCode} tabIndex={0} role="region" aria-label={t('settings.agentPresets.view')}>{viewContent}</pre>}
                    </>
                  )
                  : (
                    <>
                      <div className={css.dialogHeader}>
                        <div id="dcode-settings-dialog-title" className={css.dialogTitle}>{t('settings.agentPresets.deleteTitle')}</div>
                        <Button onClick={closeDialog} disabled={dialogBusy}>{t('common.close')}</Button>
                      </div>
                      <p className={css.dialogBody}>{t('settings.agentPresets.deleteBody')}</p>
                      {dialogError === undefined ? null : <div className={css.inlineError} role="alert">{dialogError}</div>}
                      <div className={css.dialogActions}>
                        <Button onClick={closeDialog} disabled={dialogBusy}>{t('common.cancel')}</Button>
                        <Button primary onClick={confirmDelete} disabled={dialogBusy}>{dialogBusy ? t('common.saving') : t('settings.agentPresets.delete')}</Button>
                      </div>
                    </>
                  )}
            </div>
          </div>
        )}
      {Object.entries(revealedPaths).map(([id, path]) => (
        <div className={css.revealedPath} key={id}>
          <span>{`${id}: `}</span><code>{path}</code>
        </div>
      ))}
    </Section>
  )
}

/** Direct subagents of the current session. */
function SubagentsSection({ sessionId }: { sessionId: SessionId | undefined }) {
  const runtime = useRuntime()
  const t = useT()
  const catalog = useAsync(
    async (signal) => (sessionId === undefined ? undefined : await runtime.remote.subagents.list(sessionId, signal)),
    [runtime, sessionId],
  )

  if (sessionId === undefined) return <EmptyState>{t('composer.needsSession')}</EmptyState>
  if (catalog.loading) return <EmptyState><Spinner /></EmptyState>
  if (catalog.error !== undefined) return <EmptyState>{catalog.error}</EmptyState>
  if (catalog.value?.ok === false) return <EmptyState>{catalog.value.error.message}</EmptyState>
  const entries = catalog.value?.ok === true
    ? catalog.value.value.entries
    : []

  return (
    <Section title={t('settings.subagents')} body={t('settings.count', { count: entries.length })}>
      {entries.length === 0
        ? <EmptyState>{t('settings.subagentsEmpty')}</EmptyState>
        : (
          <div className={css.card}>
            {entries.map(entry => (
              <Row
                key={entry.id}
                title={entry.kind === 'child' ? entry.label ?? entry.id : entry.id}
                body={entry.kind === 'child'
                  ? `${entry.activity} · ${entry.mode}`
                  : entry.reason}
              />
            ))}
          </div>
        )}
    </Section>
  )
}

/**
 * Registered settings namespaces, filtered to those a section is about.
 *
 * Editing arbitrary namespaces needs the schema-driven form the classic
 * surface owns; this panel is a live read plus the door to that editor, which
 * is honest about what it does rather than pretending to be a second editor.
 */
function NamespaceSection({ title, body, match }: { title: string; body: string; match: RegExp }) {
  const runtime = useRuntime()
  const t = useT()
  const described = useAsync(async () => await runtime.remote.settings.describe(), [runtime])

  const namespaces = described.value?.ok === true
    ? described.value.value.namespaces.filter(view => match.test(view.ns))
    : []

  const openDocument = useCallback(() => {
    void runtime.remote.settings.openSettingsDocument()
  }, [runtime])

  return (
    <Section title={title} body={body}>
      {described.loading
        ? <EmptyState><Spinner /></EmptyState>
        : described.error !== undefined
          ? <div role="alert"><EmptyState>{described.error}</EmptyState></div>
          : described.value?.ok === false
            ? <div role="alert"><EmptyState>{described.value.error.message}</EmptyState></div>
            : namespaces.length === 0
              ? <EmptyState>{t('settings.namespaceEmpty')}</EmptyState>
              : (
                <div className={css.card}>
                  {namespaces.map(view => (
                    <Row
                      key={view.ns}
                      title={view.ns}
                      body={`${t('settings.namespace')} · ${view.applies}`}
                      control={<span className={css.rowMono}>{JSON.stringify(view.value)}</span>}
                    />
                  ))}
                </div>
              )}
      {described.value?.ok === true && described.value.value.hasDocument
        ? <Button onClick={openDocument}>{t('settings.openOfficialSettings')}</Button>
        : null}
    </Section>
  )
}

/** Workbench face of the shared statistics card; see UsageCards.module.css. */
const usageCardCss = usageCardStyles(usageCardClasses)

function UsageMetric(props: { title: string; value: string }) {
  return (
    <div className={css.usageMetric}>
      <span className={css.usageMetricTitle}>{props.title}</span>
      <strong className={css.usageMetricValue}>{props.value}</strong>
    </div>
  )
}

function UsageSection() {
  const t = useT()
  const list = useSessionList()

  const totals = useMemo(() => summarizeUsage(aggregateUsage(list)), [list])

  if (list.phase === 'pending') {
    return (
      <Section title={t('settings.usage')} body={t('settings.usageBody')}>
        <div className={css.card}>
          <div className={css.usageStatus} role="status">{t('settings.usageLoading')}</div>
        </div>
      </Section>
    )
  }

  return (
    <Section title={t('settings.usage')} body={t('settings.usageBody')}>
      <div className={css.usageTotal}>
        <span className={css.usageTotalTitle}>{t('settings.usageTotal')}</span>
        <strong className={css.usageTotalValue}>{formatTokenCount(totals.totalTokens)}</strong>
        <span className={css.usageTotalScope}>
          {t('settings.usageScope', {
            sessions: formatTokenCount(totals.sessions),
            usageSessions: formatTokenCount(totals.usageSessions),
          })}
        </span>
      </div>
      <UsageCards list={list} t={t} styles={usageCardCss} />
      <div className={css.usageGrid}>
        <UsageMetric
          title={t('settings.usageInput')}
          value={formatTokenCount(totals.promptTokens)}
        />
        <UsageMetric
          title={t('settings.usageOutput')}
          value={formatTokenCount(totals.outputTokens)}
        />
        <UsageMetric
          title={t('settings.usageCacheRead')}
          value={formatTokenCount(totals.cacheReadTokens)}
        />
        <UsageMetric
          title={t('settings.usageCacheWrite')}
          value={formatTokenCount(totals.cacheWriteTokens)}
        />
      </div>
      <div className={css.card}>
        <Row
          title={t('settings.usageSessions')}
          control={<span className={css.rowMono}>{formatTokenCount(totals.sessions)}</span>}
        />
        <Row
          title={t('settings.usageTurns')}
          control={<span className={css.rowMono}>{totals.hasStats ? formatTokenCount(totals.turns) : '—'}</span>}
        />
        <Row
          title={t('settings.usageSteps')}
          control={<span className={css.rowMono}>{totals.hasStats ? formatTokenCount(totals.steps) : '—'}</span>}
        />
        <Row
          title={t('settings.usageCacheHit')}
          control={<span className={css.rowMono}>{totals.cacheHit === null ? '—' : formatPercent(totals.cacheHit)}</span>}
        />
      </div>
      {!totals.hasUsage ? <div className={css.usageEmpty}>{t('settings.usageEmpty')}</div> : null}
    </Section>
  )
}

/** Map direct actions to the official-first navigation groups shown by the modal. */
function settingsNavSection(section: SettingsSection): SettingsNavSection {
  switch (section) {
    case 'models': return 'models'
    case 'plugins':
    case 'mcp': return 'plugins'
    case 'agentWorkflow':
    case 'agentPresets':
    case 'memory':
    case 'subagents': return 'agentPresets'
    case 'data':
    case 'skills':
    case 'commands':
    case 'usage': return 'data'
    case 'about': return 'about'
    case 'general':
    case 'appearance': return 'general'
  }
}

/** The title shown in the modal content header for a selected page. */
function settingsTitleKey(section: SettingsSection): DcodeKey {
  switch (section) {
    case 'models': return 'settings.modelsNav'
    case 'plugins':
    case 'mcp': return 'settings.pluginsNav'
    case 'agentWorkflow':
    case 'agentPresets':
    case 'memory':
    case 'subagents': return 'settings.agentPresets'
    case 'data':
    case 'skills':
    case 'commands':
    case 'usage': return 'settings.dataAndAbout'
    case 'about': return 'settings.about'
    case 'general':
    case 'appearance': return 'settings.general'
  }
}

/** Skills, commands, and usage records grouped under one DCode-only data page. */
function DataSection({ sessionId }: { sessionId: SessionId | undefined }) {
  return (
    <>
      <SkillsSection sessionId={sessionId} />
      <CommandsSection sessionId={sessionId} />
      <UsageSection />
    </>
  )
}

/** The settings rail and the selected section. */
export function SettingsSurface({ navigation, sessionId }: SettingsSurfaceProps) {
  const t = useT()
  const state = useNavigation(navigation)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => () => { navigation.patch({ settingsProvider: undefined }) }, [navigation])
  const close = useCallback(() => { navigation.show('session') }, [navigation])
  useModalFocus(true, panelRef, { initialFocusRef: closeRef, onClose: close })

  const icons: Record<SettingsNavSection, React.ReactNode> = {
    general: <IconSettingsOutline16 />,
    models: <IconDataOutline16 />,
    plugins: <IconPersonalizationOutline16 />,
    agentPresets: <IconAgentPresetOutline16 />,
    data: <IconDatabaseOutline16 />,
    about: <IconQuestionOutline14 />,
  }

  const activeNav = settingsNavSection(state.settingsSection)
  const visibleRail = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (needle === '') return RAIL
    return RAIL.filter(item => t(item.label).toLocaleLowerCase().includes(needle))
  }, [query, t])

  // `settings.section` is declared by the official settings shell, and a slot
  // has exactly one declarer, so the workbench cannot own a renderSlot for it.
  // Every page below is therefore DCode's own implementation.
  const body = (): React.ReactNode => {
    switch (state.settingsSection) {
      case 'general':
      case 'appearance': return <GeneralSection />
      case 'models': return (
        <ModelsSection
          focusedProvider={state.settingsProvider}
          onFocusedProviderSaved={state.settingsProvider === undefined ? undefined : () => { navigation.show('session') }}
        />
      )
      case 'skills': return <SkillsSection sessionId={sessionId} />
      case 'commands': return <CommandsSection sessionId={sessionId} />
      case 'plugins': return <PluginSettingsSection />
      case 'mcp': return <PluginSettingsSection mcpOnly />
      case 'data': return <DataSection sessionId={sessionId} />
      case 'agentPresets': return (
        <>
          <AgentWorkflowSection sessionId={sessionId} />
          <AgentPresetsSection />
          <SubagentsSection sessionId={sessionId} />
        </>
      )
      case 'agentWorkflow': return <AgentWorkflowSection sessionId={sessionId} />
      case 'subagents': return <SubagentsSection sessionId={sessionId} />
      case 'usage': return <UsageSection />
      case 'about': return <AboutSection />
      case 'memory':
        return <NamespaceSection title={t('settings.memory')} body={t('settings.memoryBody')} match={/memor|context|compaction/i} />
      default:
        return <GeneralSection />
    }
  }

  return (
    <div className={css.overlay} role="presentation">
      <div className={css.mask} aria-hidden="true" onClick={close} />
      <div
        ref={panelRef}
        className={css.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dcode-settings-dialog-title"
        tabIndex={-1}
      >
        <nav className={css.rail} aria-label={t('settings.title')}>
          <h1 className={css.railTitle} id="dcode-settings-dialog-title">{t('settings.title')}</h1>
          <label className={css.searchShell}>
            <IconSearchOutline16 className={css.searchIcon} />
            <input
              className={css.search}
              type="search"
              value={query}
              placeholder={t('settings.search')}
              aria-label={t('settings.search')}
              onChange={event => { setQuery(event.target.value) }}
            />
          </label>
          <div className={css.navList}>
            {visibleRail.map(item => (
              <button
                key={item.id}
                type="button"
                className={`${css.item} ${activeNav === item.id ? css.itemActive : ''}`}
                aria-current={activeNav === item.id ? 'page' : undefined}
                onClick={() => { setQuery(''); navigation.openSettings(item.id) }}
              >
                {icons[item.id]}
                {t(item.label)}
              </button>
            ))}
          </div>
          {visibleRail.length === 0 ? <p className={css.searchEmpty}>{t('settings.searchEmpty')}</p> : null}
        </nav>
        <main className={css.content}>
          <header className={css.header}>
            <h2 className={css.title}>{t(settingsTitleKey(state.settingsSection))}</h2>
            <button ref={closeRef} type="button" className={css.close} onClick={close} aria-label={t('common.close')}>
              <IconCloseOutline16 size={14} />
            </button>
          </header>
          <div className={css.body}>
            <div className={css.inner}>{body()}</div>
          </div>
        </main>
      </div>
    </div>
  )
}
