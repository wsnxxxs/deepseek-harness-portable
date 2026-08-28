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

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  IconApiOutline14, IconBrowseOutline16, IconChevronLeftOutline14,
  IconCodeOutline16, IconCordisPluginOutline14, IconDataOutline16,
  IconFollowsystemOutline16, IconListPenOutline16, IconSettingsOutline16,
  IconSkillOutline16, IconSparkle16, IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useAsync, useSessionList } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import { useNavigation, type NavigationStore, type SettingsSection } from '../state/navigation.ts'
import { Button, EmptyState, Spinner } from '../shell/ui.tsx'
import { ThemeSwitch } from '../shell/ThemeSwitch.tsx'
import type { DcodeKey } from '../locales.ts'
import { aggregateUsage, formatPercent, formatTokenCount, summarizeUsage } from './usage.ts'
import { SelectMenu } from './SelectMenu.tsx'
import { PluginSettingsSection } from './PluginSettingsSection.tsx'
import css from './SettingsSurface.module.css'
import type {
  CredentialInfo, JsonValue, LlmConfigurableProvider, LlmProviderInfo,
  ModelCatalog, SettingsNamespaceView, SettingsPathOpView,
} from '@deepseek-ai/dsh-api-remotes/client'
import type { DcodeRuntime } from '../state/runtime.ts'

/** Props of the settings surface. */
export interface SettingsSurfaceProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
}

/** Rail layout: the four DSH settings pages visible in the workbench. */
const RAIL: readonly { group: DcodeKey; items: readonly { id: SettingsSection; label: DcodeKey }[] }[] = [
  {
    group: 'settings.group.basics',
    items: [
      { id: 'general', label: 'settings.general' },
      { id: 'models', label: 'settings.models' },
    ],
  },
  {
    group: 'settings.group.agent',
    items: [
      { id: 'plugins', label: 'settings.plugins' },
      { id: 'agentPresets', label: 'settings.agentPresets' },
      { id: 'skills', label: 'settings.skills' },
      { id: 'commands', label: 'settings.commands' },
      { id: 'subagents', label: 'settings.subagents' },
      { id: 'mcp', label: 'settings.mcp' },
    ],
  },
  {
    group: 'settings.group.data',
    items: [
      { id: 'usage', label: 'settings.usage' },
    ],
  },
]

/** A titled block with an explanatory line. */
function Section(props: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <section className={css.section}>
      <span className={css.sectionTitle}>{props.title}</span>
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

/** The front-end switch, one of the workbench's four switch entry points. */
function InterfaceSection() {
  const runtime = useRuntime()
  const t = useT()
  const mode = useSyncExternalStore(runtime.mode.subscribe, runtime.mode.get, runtime.mode.get)
  return (
    <Section title={t('settings.interface')} body={t('settings.interfaceBody')}>
      {/* Official first, then the workbench — the same order the classic
          settings row and the desktop menus use. */}
      <div className={css.choice}>
        <button
          type="button"
          className={`${css.option} ${mode === 'official' ? css.optionActive : ''}`}
          onClick={() => { runtime.mode.set('official') }}
        >
          <span className={css.optionTitle}><IconSettingsOutline16 />{t('settings.modeOfficial')}</span>
          <span className={css.rowBody}>{t('settings.modeOfficialBody')}</span>
        </button>
        <button
          type="button"
          className={`${css.option} ${mode === 'dcode' ? css.optionActive : ''}`}
          onClick={() => { runtime.mode.set('dcode') }}
        >
          <span className={css.optionTitle}><IconSparkle16 />{t('settings.modeWorkbench')}</span>
          <span className={css.rowBody}>{t('settings.modeWorkbenchBody')}</span>
        </button>
      </div>
    </Section>
  )
}

/** Language, appearance, busy Enter, and the front-end switch. */
function GeneralSection() {
  const runtime = useRuntime()
  const t = useT()
  const locale = useSyncExternalStore(
    runtime.locale.subscribe,
    runtime.locale.getSnapshot,
    runtime.locale.getSnapshot,
  )
  const busyEnter = useSyncExternalStore(
    runtime.busyEnter.subscribe,
    runtime.busyEnter.getSnapshot,
    runtime.busyEnter.getSnapshot,
  )
  const theme = runtime.theme
  // ThemeRuntime emits one revision for both palette and font-size writes.
  // The appearance store carries that notification while remaining optional.
  const themeKey = (): string => {
    const current = theme?.getTheme()
    return current === undefined
      ? ''
      : [
        current.preference ?? '', current.fontSize, current.active.id,
        ...(current.themes ?? []).map(entry => entry.id),
      ].join(':')
  }
  const themeState = useSyncExternalStore(
    runtime.appearance.subscribe,
    themeKey,
    themeKey,
  )
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
          <Row
            title={t('settings.fontSize')}
            control={theme?.setFontSize === undefined
              ? <span className={css.badge}>{snapshot?.fontSize ?? '—'}</span>
              : (
                <span className={css.stepper}>
                  <button
                    type="button"
                    className={css.stepperButton}
                    aria-label={`${t('settings.fontSize')} −`}
                    disabled={(snapshot?.fontSize ?? 14) <= 11}
                    onClick={() => { theme.setFontSize?.(Math.max(11, (snapshot?.fontSize ?? 14) - 1)) }}
                  >−</button>
                  <span className={css.stepperValue}>{snapshot?.fontSize ?? 14}</span>
                  <button
                    type="button"
                    className={css.stepperButton}
                    aria-label={`${t('settings.fontSize')} +`}
                    disabled={(snapshot?.fontSize ?? 14) >= 22}
                    onClick={() => { theme.setFontSize?.(Math.min(22, (snapshot?.fontSize ?? 14) + 1)) }}
                  >+</button>
                </span>
              )}
          />
        </div>
      </Section>
      <Section title={t('settings.busyEnter')} body={t('settings.busyEnterBody')}>
        <div className={css.card}>
          <Row
            title={t('settings.busyEnter')}
            control={(
              <SelectMenu
                value={busyEnter}
                ariaLabel={t('settings.busyEnter')}
                options={[
                  { id: 'queue', label: t('settings.busyEnter.queue') },
                  { id: 'steer', label: t('settings.busyEnter.steer') },
                ]}
                disabled={!runtime.busyEnter.writable}
                onChange={(value) => { runtime.busyEnter.set(value as 'queue' | 'steer') }}
              />
            )}
          />
        </div>
      </Section>
      <InterfaceSection />
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

interface ModelProviderRow {
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
  readonly declared?: boolean
}

interface ModelSettingsData {
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

async function loadModelSettings(runtime: DcodeRuntime): Promise<ModelSettingsData> {
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
    ),
    writable: described.value.writable,
    hasDocument: described.value.hasDocument,
    ...credentialError === undefined ? {} : { credentialError },
  }
}

function ModelProviderCard(props: {
  row: ModelProviderRow
  writable: boolean
  onReload: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [baseURL, setBaseURL] = useState(() => stringAt(props.row.profile, ['baseURL']) ?? '')
  const [apiKey, setApiKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | undefined>()
  const profileEditable = props.writable && props.row.namespace !== undefined && props.row.settingsNs !== ''
  const keyEditable = props.row.credential?.writable !== false
  const editable = profileEditable || keyEditable

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
        return
      }
      setOpen(false)
      props.onReload()
    } catch (cause: unknown) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const credentialConfigured = props.row.credential?.configured === true
  const credentialDeclared = stringAt(props.row.profile, ['apiKeyEnv']) !== undefined
  const statusLabel = credentialConfigured
    ? t('settings.models.keyConfigured')
    : credentialDeclared
      ? t('settings.models.keyMissing')
      : props.row.profile === undefined
        ? t('settings.models.notConfigured')
        : t('settings.models.keyNotRequired')
  const statusClass = credentialConfigured
    ? css.statusDotGood
    : credentialDeclared
      ? css.statusDotMissing
      : css.statusDotNeutral

  return (
    <div className={css.providerCard}>
      <div className={css.providerHead}>
        <span className={`${css.statusDot} ${statusClass}`} aria-label={statusLabel} title={statusLabel} />
        <div className={css.rowText}>
          <div className={css.rowTitle}>{props.row.name}</div>
          <div className={css.rowBody}>{props.row.id}{props.row.active ? '' : ` · ${t('settings.models.inactive')}`}</div>
        </div>
        {editable
          ? <Button onClick={() => { setOpen(value => !value); setFailure(undefined) }}>{open ? t('common.close') : t('common.edit')}</Button>
          : <span className={css.badge}>{t('common.readOnly')}</span>}
      </div>
      {open
        ? (
          <div className={css.providerEditor}>
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
              <Button onClick={() => { setOpen(false) }} disabled={busy}>{t('common.cancel')}</Button>
              <Button primary onClick={() => { void save() }} disabled={busy}>{busy ? t('common.saving') : t('common.save')}</Button>
            </div>
          </div>
        )
        : null}
    </div>
  )
}

/** Provider routes, catalog, and the editable credential/profile controls. */
function ModelsSection() {
  const runtime = useRuntime()
  const t = useT()
  const models = useAsync(async () => await loadModelSettings(runtime), [runtime])

  if (models.loading && models.value === undefined) return <EmptyState><Spinner /></EmptyState>
  if (models.error !== undefined && models.value === undefined) return <EmptyState>{models.error}</EmptyState>
  if (models.value === undefined) return <EmptyState>{t('common.error')}</EmptyState>
  const value = models.value
  const providerName = (providerId: string): string =>
    value.catalog.groups.find(group => group.id === providerId)?.name
      ?? value.catalog.failures.find(failure => failure.id === providerId)?.name
      ?? providerId
  const defaultGroup = value.catalog.groups.find(group =>
    group.id === value.catalog.default.provider
    && group.models.some(model => model.id === value.catalog.default.model))
  const defaultModel = defaultGroup?.models.find(model => model.id === value.catalog.default.model)

  return (
    <Section title={t('settings.models')} body={t('settings.modelsBody')}>
      <div className={css.card}>
        <Row
          title={t('settings.models.default')}
          body={defaultGroup?.name ?? providerName(value.catalog.default.provider)}
          control={<span>{defaultModel?.name ?? t('common.none')}</span>}
        />
        <Row
          title={t('settings.models.routable')}
          control={(
            <span className={css.rowMono}>
              {value.catalog.routableProviders.map(providerName).join(', ') || t('common.none')}
            </span>
          )}
        />
      </div>
      {value.credentialError === undefined ? null : <div className={css.notice}>{`${t('settings.models.credentialWarning')}: ${value.credentialError}`}</div>}
      <div className={css.providerList}>
        {value.providers.map(row => <ModelProviderCard key={row.id} row={row} writable={value.writable} onReload={models.reload} />)}
      </div>
      {value.catalog.groups.map(group => (
        <div className={css.card} key={group.id}>
          <Row title={group.name} control={<span className={css.badge}>{group.models.length}</span>} />
          {group.models.map(model => (
            <Row key={model.id} title={model.name} body={model.description} />
          ))}
        </div>
      ))}
      {value.catalog.failures.length === 0
        ? null
        : (
          <div className={css.card}>
            <Row title={t('settings.models.failures')} />
            {value.catalog.failures.map(failure => (
              <Row key={failure.id} title={failure.name} body={failure.message} />
            ))}
          </div>
        )}
      {value.hasDocument
        ? <Button onClick={() => { void runtime.remote.settings.openSettingsDocument() }}>{t('settings.openOfficialSettings')}</Button>
        : null}
    </Section>
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
        onChange={event => { setQuery(event.target.value) }}
      />
      {rows.length === 0
        ? <EmptyState>{t('composer.noSkills')}</EmptyState>
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
        ? <EmptyState>{t('settings.empty')}</EmptyState>
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

/**
 * The Loader's live plugin inventory.
 *
 * MCP servers are Loader entries like any other plugin, so the MCP section is
 * the same inventory filtered by module specifier rather than a second source
 * of truth.
 */
function PluginsSection({ mcpOnly }: { mcpOnly: boolean }) {
  const runtime = useRuntime()
  const t = useT()
  const inventory = useAsync(async () => await runtime.remote.pluginInventory.list(), [runtime])

  if (inventory.loading) return <EmptyState><Spinner /></EmptyState>
  // A refused or failed read is reported: "0 entries" would claim the Loader
  // has no plugins, which is a different and wrong statement.
  if (inventory.error !== undefined) return <EmptyState>{inventory.error}</EmptyState>
  if (inventory.value?.ok === false) return <EmptyState>{inventory.value.error.message}</EmptyState>
  const entries = inventory.value?.ok === true ? inventory.value.value.entries : []
  const rows = mcpOnly ? entries.filter(entry => /mcp/i.test(entry.moduleName)) : entries

  return (
    <Section title={mcpOnly ? t('settings.mcp') : t('settings.plugins')} body={t('settings.count', { count: rows.length })}>
      {rows.length === 0
        ? <EmptyState>{t('settings.empty')}</EmptyState>
        : (
          <div className={css.card}>
            {rows.map(entry => (
              <Row
                key={entry.entryId}
                title={entry.moduleName}
                body={entry.enabled ? entry.fiberPhase ?? 'active' : 'disabled'}
                control={<span className={css.badge}>{entry.fiberPhase ?? '—'}</span>}
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

  useEffect(() => {
    if (dialog === undefined) return undefined
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || dialogBusy) return
      setDialog(undefined)
      setDialogError(undefined)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [dialog, dialogBusy])

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
        ? <EmptyState>{t('settings.empty')}</EmptyState>
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
          <div className={css.dialogBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
            <div className={css.dialog} role="dialog" aria-modal="true" aria-labelledby="dcode-settings-dialog-title">
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
                      {dialogBusy ? <EmptyState><Spinner /></EmptyState> : viewContent === undefined ? <div className={css.inlineError} role="alert">{dialogError ?? t('common.error')}</div> : <pre className={css.viewerCode}>{viewContent}</pre>}
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
  const members = catalog.value?.ok === true
    ? (catalog.value.value as { members?: readonly { childSessionId: string; name?: string; status?: string }[] }).members ?? []
    : []

  return (
    <Section title={t('settings.subagents')} body={t('settings.count', { count: members.length })}>
      {members.length === 0
        ? <EmptyState>{t('settings.empty')}</EmptyState>
        : (
          <div className={css.card}>
            {members.map(member => (
              <Row
                key={member.childSessionId}
                title={member.name ?? member.childSessionId}
                body={member.status}
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
      {described.loading ? <EmptyState><Spinner /></EmptyState> : null}
      {described.error !== undefined ? <EmptyState>{described.error}</EmptyState> : null}
      {described.value?.ok === false ? <EmptyState>{described.value.error.message}</EmptyState> : null}
      {namespaces.length === 0 && !described.loading && described.error === undefined
        ? <EmptyState>{t('settings.empty')}</EmptyState>
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
          <div className={css.usageStatus}>{t('settings.usageLoading')}</div>
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

/** The settings rail and the selected section. */
export function SettingsSurface({ navigation, sessionId }: SettingsSurfaceProps) {
  const t = useT()
  const state = useNavigation(navigation)

  const icons: Partial<Record<SettingsSection, React.ReactNode>> = {
    general: <IconSettingsOutline16 />,
    models: <IconApiOutline14 size={16} />,
    browser: <IconBrowseOutline16 />,
    computer: <IconCodeOutline16 />,
    memory: <IconDataOutline16 />,
    subagents: <IconUserOutline16 />,
    plugins: <IconCordisPluginOutline14 size={16} />,
    mcp: <IconApiOutline14 size={16} />,
    agentPresets: <IconSparkle16 />,
    skills: <IconSkillOutline16 />,
    commands: <IconListPenOutline16 />,
    usage: <IconDataOutline16 />,
  }

  const body = (): React.ReactNode => {
    switch (state.settingsSection) {
      case 'general':
      case 'appearance': return <GeneralSection />
      case 'models': return <ModelsSection />
      case 'skills': return <SkillsSection sessionId={sessionId} />
      case 'commands': return <CommandsSection sessionId={sessionId} />
      case 'plugins': return <PluginSettingsSection />
      case 'mcp': return <PluginSettingsSection mcpOnly />
      case 'agentPresets': return <AgentPresetsSection />
      case 'subagents': return <SubagentsSection sessionId={sessionId} />
      case 'usage': return <UsageSection />
      case 'memory':
        return <NamespaceSection title={t('settings.memory')} body={t('settings.memoryBody')} match={/memor|context|compaction/i} />
      case 'browser':
        return <NamespaceSection title={t('settings.browser')} body={t('settings.browserBody')} match={/browser|web|vision/i} />
      case 'computer':
        return <NamespaceSection title={t('settings.computer')} body={t('settings.computerBody')} match={/shell|terminal|sandbox|permission/i} />
      default:
        return <GeneralSection />
    }
  }

  return (
    <div className={css.surface}>
      <nav className={css.rail} aria-label={t('settings.title')}>
        <button type="button" className={css.back} onClick={() => { navigation.show('session') }}>
          <IconChevronLeftOutline14 />
          {t('nav.backToWorkspace')}
        </button>
        {RAIL.map(group => (
          <div key={group.group}>
            <div className={css.group}>{t(group.group)}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                type="button"
                className={`${css.item} ${state.settingsSection === item.id ? css.itemActive : ''}`}
                onClick={() => { navigation.openSettings(item.id) }}
              >
                {icons[item.id] ?? <IconFollowsystemOutline16 />}
                {t(item.label)}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className={css.body}>
        <div className={css.inner}>
          <div className={css.title}>{t('settings.title')}</div>
          {body()}
        </div>
      </div>
    </div>
  )
}
