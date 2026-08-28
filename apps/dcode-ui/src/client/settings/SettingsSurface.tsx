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
import css from './SettingsSurface.module.css'

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

/** Provider routes and the model catalogue the composer selects from. */
function ModelsSection() {
  const runtime = useRuntime()
  const t = useT()
  const catalog = useAsync(async () => await runtime.remote.session.modelCatalog(), [runtime])

  if (catalog.loading) return <EmptyState><Spinner /></EmptyState>
  if (catalog.value?.ok !== true) {
    return <EmptyState>{catalog.error ?? (catalog.value?.ok === false ? catalog.value.error.message : t('common.error'))}</EmptyState>
  }
  const value = catalog.value.value
  const providerName = (providerId: string): string =>
    value.groups.find(group => group.id === providerId)?.name
      ?? value.failures.find(failure => failure.id === providerId)?.name
      ?? providerId
  const defaultGroup = value.groups.find(group =>
    group.id === value.default.provider
    && group.models.some(model => model.id === value.default.model))
  const defaultModel = defaultGroup?.models.find(model => model.id === value.default.model)

  return (
    <Section title={t('settings.models')}>
      <div className={css.card}>
        <Row
          title={t('settings.models.default')}
          body={defaultGroup?.name ?? providerName(value.default.provider)}
          control={<span>{defaultModel?.name ?? t('common.none')}</span>}
        />
        <Row
          title={t('settings.models.routable')}
          control={(
            <span className={css.rowMono}>
              {value.routableProviders.map(providerName).join(', ') || t('common.none')}
            </span>
          )}
        />
      </div>
      {value.groups.map(group => (
        <div className={css.card} key={group.id}>
          <Row title={group.name} control={<span className={css.badge}>{group.models.length}</span>} />
          {group.models.map(model => (
            <Row
              key={model.id}
              title={model.name}
              body={model.description}
            />
          ))}
        </div>
      ))}
      {value.failures.length === 0
        ? null
        : (
          <div className={css.card}>
            <Row title={t('settings.models.failures')} />
            {value.failures.map(failure => (
              <Row key={failure.id} title={failure.name} body={failure.message} />
            ))}
          </div>
        )}
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
  const [selectedDefault, setSelectedDefault] = useState<string | undefined>()
  const [savingDefault, setSavingDefault] = useState(false)
  const [defaultError, setDefaultError] = useState<string | undefined>()
  const presets = roster.value?.ok === true ? roster.value.value.presets : []
  const hostDefault = presets.find(preset => preset.isDefault)?.id
  const defaultId = selectedDefault ?? hostDefault ?? presets[0]?.id ?? ''

  useEffect(() => {
    if (hostDefault !== undefined) setSelectedDefault(hostDefault)
  }, [hostDefault])

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
                  control={preset.id === defaultId
                    ? <span className={css.badge}>{t('settings.models.default')}</span>
                    : undefined}
                />
              ))}
            </div>
          </>
        )}
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
      case 'plugins': return <PluginsSection mcpOnly={false} />
      case 'mcp': return <PluginsSection mcpOnly />
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
