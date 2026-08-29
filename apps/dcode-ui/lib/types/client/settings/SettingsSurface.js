import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { IconApiOutline14, IconBrowseOutline16, IconChevronLeftOutline14, IconCodeOutline16, IconCordisPluginOutline14, IconDataOutline16, IconFollowsystemOutline16, IconListPenOutline16, IconSettingsOutline16, IconSkillOutline16, IconSparkle16, IconUserOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useAsync, useSessionList } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { Button, EmptyState, Spinner } from "../shell/ui.js";
import { ThemeSwitch } from "../shell/ThemeSwitch.js";
import { aggregateUsage, formatPercent, formatTokenCount, summarizeUsage } from "./usage.js";
import { SelectMenu } from "./SelectMenu.js";
import { PluginSettingsSection } from "./PluginSettingsSection.js";
import css from './SettingsSurface.module.css';
/** Rail layout: the four DSH settings pages visible in the workbench. */
const RAIL = [
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
            { id: 'agentPresets', label: 'settings.agentPresets' },
            { id: 'skills', label: 'settings.skills' },
            { id: 'commands', label: 'settings.commands' },
        ],
    },
    {
        group: 'settings.group.data',
        items: [
            { id: 'usage', label: 'settings.usage' },
        ],
    },
];
/** A titled block with an explanatory line. */
function Section(props) {
    return (_jsxs("section", { className: css.section, children: [_jsx("span", { className: css.sectionTitle, children: props.title }), props.body === undefined ? null : _jsx("p", { className: css.sectionBody, children: props.body }), props.children] }));
}
/** One settings row: label, explanation, and a control. */
function Row(props) {
    return (_jsxs("div", { className: css.row, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: props.title }), props.body === undefined ? null : _jsx("div", { className: css.rowBody, children: props.body })] }), props.control] }));
}
/** The front-end switch, one of the workbench's four switch entry points. */
function InterfaceSection() {
    const runtime = useRuntime();
    const t = useT();
    const mode = useSyncExternalStore(runtime.mode.subscribe, runtime.mode.get, runtime.mode.get);
    return (_jsx(Section, { title: t('settings.interface'), body: t('settings.interfaceBody'), children: _jsxs("div", { className: css.choice, children: [_jsxs("button", { type: "button", className: `${css.option} ${mode === 'official' ? css.optionActive : ''}`, onClick: () => { runtime.mode.set('official'); }, children: [_jsxs("span", { className: css.optionTitle, children: [_jsx(IconSettingsOutline16, {}), t('settings.modeOfficial')] }), _jsx("span", { className: css.rowBody, children: t('settings.modeOfficialBody') })] }), _jsxs("button", { type: "button", className: `${css.option} ${mode === 'dcode' ? css.optionActive : ''}`, onClick: () => { runtime.mode.set('dcode'); }, children: [_jsxs("span", { className: css.optionTitle, children: [_jsx(IconSparkle16, {}), t('settings.modeWorkbench')] }), _jsx("span", { className: css.rowBody, children: t('settings.modeWorkbenchBody') })] })] }) }));
}
/** Language, appearance, busy Enter, and the front-end switch. */
function GeneralSection() {
    const runtime = useRuntime();
    const t = useT();
    const locale = useSyncExternalStore(runtime.locale.subscribe, runtime.locale.getSnapshot, runtime.locale.getSnapshot);
    const busyEnter = useSyncExternalStore(runtime.busyEnter.subscribe, runtime.busyEnter.getSnapshot, runtime.busyEnter.getSnapshot);
    const theme = runtime.theme;
    // ThemeRuntime emits one revision for both palette and font-size writes.
    // The appearance store carries that notification while remaining optional.
    const themeKey = () => {
        const current = theme?.getTheme();
        return current === undefined
            ? ''
            : [
                current.preference ?? '', current.fontSize, current.active.id,
                ...(current.themes ?? []).map(entry => entry.id),
            ].join(':');
    };
    const themeState = useSyncExternalStore(runtime.appearance.subscribe, themeKey, themeKey);
    const snapshot = useMemo(() => theme?.getTheme(), [theme, themeState]);
    // Anything a plugin registered beyond the two built-in palettes.
    const custom = (snapshot?.themes ?? []).filter(entry => entry.id !== 'light' && entry.id !== 'dark');
    const localeOptions = locale.locales.length === 0
        ? [{ id: locale.active, label: locale.active }]
        : locale.locales;
    return (_jsxs(_Fragment, { children: [_jsx(Section, { title: t('settings.language'), children: _jsx("div", { className: css.card, children: _jsx(Row, { title: t('settings.language'), control: (_jsx(SelectMenu, { value: locale.active, ariaLabel: t('settings.language'), options: localeOptions.map(option => ({ id: option.id, label: option.label })), disabled: localeOptions.length <= 1, onChange: (value) => { runtime.locale.set(value); } })) }) }) }), _jsx(Section, { title: t('settings.appearance'), children: _jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.theme'), control: _jsx(ThemeSwitch, {}) }), custom.length === 0
                            ? null
                            : (_jsx(Row, { title: t('settings.themeCustom'), control: (_jsx(SelectMenu, { value: snapshot?.preference ?? snapshot?.active.id ?? 'system', ariaLabel: t('settings.themeCustom'), options: [
                                        { id: 'system', label: t('theme.system') },
                                        ...(snapshot?.themes ?? []).map(entry => ({ id: entry.id, label: entry.id })),
                                    ], onChange: (value) => { theme?.setTheme?.(value); } })) })), _jsx(Row, { title: t('settings.fontSize'), control: theme?.setFontSize === undefined
                                ? _jsx("span", { className: css.badge, children: snapshot?.fontSize ?? '—' })
                                : (_jsxs("span", { className: css.stepper, children: [_jsx("button", { type: "button", className: css.stepperButton, "aria-label": `${t('settings.fontSize')} −`, disabled: (snapshot?.fontSize ?? 14) <= 11, onClick: () => { theme.setFontSize?.(Math.max(11, (snapshot?.fontSize ?? 14) - 1)); }, children: "\u2212" }), _jsx("span", { className: css.stepperValue, children: snapshot?.fontSize ?? 14 }), _jsx("button", { type: "button", className: css.stepperButton, "aria-label": `${t('settings.fontSize')} +`, disabled: (snapshot?.fontSize ?? 14) >= 22, onClick: () => { theme.setFontSize?.(Math.min(22, (snapshot?.fontSize ?? 14) + 1)); }, children: "+" })] })) })] }) }), _jsx(Section, { title: t('settings.busyEnter'), body: t('settings.busyEnterBody'), children: _jsx("div", { className: css.card, children: _jsx(Row, { title: t('settings.busyEnter'), control: (_jsx(SelectMenu, { value: busyEnter, ariaLabel: t('settings.busyEnter'), options: [
                                { id: 'queue', label: t('settings.busyEnter.queue') },
                                { id: 'steer', label: t('settings.busyEnter.steer') },
                            ], disabled: !runtime.busyEnter.writable, onChange: (value) => { runtime.busyEnter.set(value); } })) }) }) }), _jsx(InterfaceSection, {})] }));
}
function objectAt(source, path) {
    let current = source;
    for (const key of path) {
        if (typeof current !== 'object' || current === null || Array.isArray(current))
            return undefined;
        current = current[key];
    }
    return typeof current === 'object' && current !== null && !Array.isArray(current)
        ? current
        : undefined;
}
function valueAt(source, path) {
    let current = source;
    for (const key of path) {
        if (typeof current !== 'object' || current === null || Array.isArray(current))
            return undefined;
        current = current[key];
    }
    return current;
}
function stringAt(source, path) {
    const value = valueAt(source, path);
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}
function modelCredentialRef(provider, profile) {
    const named = stringAt(profile, ['apiKeyEnv']);
    return named ?? `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`;
}
function modelProviderRows(registered, configurable, namespaces, credentials) {
    const active = new Set(registered.map(provider => provider.id));
    const declared = new Set(configurable.map(provider => provider.provider));
    const rows = configurable.map((provider) => {
        const namespace = namespaces.find(view => view.ns === provider.settingsNs);
        const profile = objectAt(namespace?.value, provider.settingsPath);
        const userProfile = objectAt(namespace?.user, provider.settingsPath);
        const credentialRef = modelCredentialRef(provider.provider, profile);
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
        };
    });
    for (const provider of registered) {
        if (declared.has(provider.id))
            continue;
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
        });
    }
    return rows;
}
async function loadModelSettings(runtime) {
    const [catalog, registered, configurable, described] = await Promise.all([
        runtime.remote.session.modelCatalog(),
        runtime.remote.llm.listProviders(),
        runtime.remote.llm.listConfigurableProviders(),
        runtime.remote.settings.describe(),
    ]);
    if (!catalog.ok)
        throw new Error(catalog.error.message);
    if (!registered.ok)
        throw new Error(registered.error.message);
    if (!configurable.ok)
        throw new Error(configurable.error.message);
    if (!described.ok)
        throw new Error(described.error.message);
    const refs = [...new Set([
            ...configurable.value.map(provider => {
                const namespace = described.value.namespaces.find(view => view.ns === provider.settingsNs);
                return modelCredentialRef(provider.provider, objectAt(namespace?.value, provider.settingsPath));
            }),
            ...registered.value
                .filter(provider => !configurable.value.some(candidate => candidate.provider === provider.id))
                .map(provider => modelCredentialRef(provider.id, undefined)),
        ])];
    let credentials = {};
    let credentialError;
    if (refs.length > 0) {
        try {
            const response = await runtime.remote.credentials.describe(refs);
            if (response.ok)
                credentials = response.value;
            else
                credentialError = response.error.message;
        }
        catch (cause) {
            credentialError = cause instanceof Error ? cause.message : String(cause);
        }
    }
    return {
        catalog: catalog.value,
        providers: modelProviderRows(registered.value, configurable.value, described.value.namespaces, credentials),
        writable: described.value.writable,
        hasDocument: described.value.hasDocument,
        ...credentialError === undefined ? {} : { credentialError },
    };
}
function ModelProviderCard(props) {
    const runtime = useRuntime();
    const t = useT();
    const [open, setOpen] = useState(false);
    const [baseURL, setBaseURL] = useState(() => stringAt(props.row.profile, ['baseURL']) ?? '');
    const [apiKey, setApiKey] = useState('');
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState();
    const profileEditable = props.writable && props.row.namespace !== undefined && props.row.settingsNs !== '';
    const keyEditable = props.row.credential?.writable !== false;
    const editable = profileEditable || keyEditable;
    useEffect(() => {
        if (open)
            return;
        setBaseURL(stringAt(props.row.profile, ['baseURL']) ?? '');
        setApiKey('');
        setFailure(undefined);
    }, [open, props.row.profile]);
    const save = async () => {
        if (busy || !editable)
            return;
        setBusy(true);
        setFailure(undefined);
        try {
            const namespace = props.row.namespace;
            const ops = [];
            if (profileEditable && namespace !== undefined) {
                const storedBaseURL = stringAt(valueAt(namespace.user, [...props.row.settingsPath, 'baseURL']), []);
                const effectiveBaseURL = stringAt(props.row.profile, ['baseURL']);
                const nextBaseURL = baseURL.trim();
                if (nextBaseURL.length === 0) {
                    if (storedBaseURL !== undefined)
                        ops.push({ op: 'unset', path: [...props.row.settingsPath, 'baseURL'] });
                }
                else if (nextBaseURL !== storedBaseURL && !(storedBaseURL === undefined && nextBaseURL === effectiveBaseURL)) {
                    ops.push({
                        op: 'set',
                        path: [...props.row.settingsPath, 'baseURL'],
                        value: nextBaseURL,
                    });
                }
                if (props.row.settingsNs === 'llm-pi-ai'
                    && stringAt(props.row.profile, ['apiKeyEnv']) === undefined
                    && apiKey.trim().length > 0) {
                    ops.push({
                        op: 'set',
                        path: [...props.row.settingsPath, 'apiKeyEnv'],
                        value: props.row.credentialRef,
                    });
                }
                if (ops.length > 0) {
                    const response = await runtime.remote.settings.mutate(props.row.settingsNs, ops, namespace.revision);
                    if (!response.ok)
                        throw new Error(response.error.message);
                }
            }
            if (apiKey.trim().length > 0) {
                const response = await runtime.remote.credentials.set(props.row.credentialRef, apiKey.trim());
                if (!response.ok)
                    throw new Error(response.error.message);
            }
            if (ops.length === 0 && apiKey.trim().length === 0) {
                setOpen(false);
                return;
            }
            setOpen(false);
            props.onReload();
        }
        catch (cause) {
            setFailure(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const credentialConfigured = props.row.credential?.configured === true;
    const credentialDeclared = stringAt(props.row.profile, ['apiKeyEnv']) !== undefined;
    const statusLabel = credentialConfigured
        ? t('settings.models.keyConfigured')
        : credentialDeclared
            ? t('settings.models.keyMissing')
            : props.row.profile === undefined
                ? t('settings.models.notConfigured')
                : t('settings.models.keyNotRequired');
    const statusClass = credentialConfigured
        ? css.statusDotGood
        : credentialDeclared
            ? css.statusDotMissing
            : css.statusDotNeutral;
    return (_jsxs("div", { className: css.providerCard, children: [_jsxs("div", { className: css.providerHead, children: [_jsx("span", { className: `${css.statusDot} ${statusClass}`, "aria-label": statusLabel, title: statusLabel }), _jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: props.row.name }), _jsxs("div", { className: css.rowBody, children: [props.row.id, props.row.active ? '' : ` · ${t('settings.models.inactive')}`] })] }), editable
                        ? _jsx(Button, { onClick: () => { setOpen(value => !value); setFailure(undefined); }, children: open ? t('common.close') : t('common.edit') })
                        : _jsx("span", { className: css.badge, children: t('common.readOnly') })] }), open
                ? (_jsxs("div", { className: css.providerEditor, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.apiKey') }), _jsx("input", { className: css.fieldInput, type: "password", autoComplete: "off", value: apiKey, placeholder: props.row.credential?.configured === true ? t('settings.models.keyConfiguredHint') : t('settings.models.keyPlaceholder'), disabled: busy || !keyEditable, onChange: event => { setApiKey(event.target.value); } })] }), profileEditable
                            ? (_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.baseURL') }), _jsx("input", { className: css.fieldInput, type: "url", value: baseURL, placeholder: t('settings.models.baseURLPlaceholder'), disabled: busy, onChange: event => { setBaseURL(event.target.value); } })] }))
                            : null, failure === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: failure }), _jsxs("div", { className: css.editorActions, children: [_jsx(Button, { onClick: () => { setOpen(false); }, disabled: busy, children: t('common.cancel') }), _jsx(Button, { primary: true, onClick: () => { void save(); }, disabled: busy, children: busy ? t('common.saving') : t('common.save') })] })] }))
                : null] }));
}
/** Provider routes, catalog, and the editable credential/profile controls. */
function ModelsSection() {
    const runtime = useRuntime();
    const t = useT();
    const models = useAsync(async () => await loadModelSettings(runtime), [runtime]);
    if (models.loading && models.value === undefined)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (models.error !== undefined && models.value === undefined)
        return _jsx(EmptyState, { children: models.error });
    if (models.value === undefined)
        return _jsx(EmptyState, { children: t('common.error') });
    const value = models.value;
    const providerName = (providerId) => value.catalog.groups.find(group => group.id === providerId)?.name
        ?? value.catalog.failures.find(failure => failure.id === providerId)?.name
        ?? providerId;
    const defaultGroup = value.catalog.groups.find(group => group.id === value.catalog.default.provider
        && group.models.some(model => model.id === value.catalog.default.model));
    const defaultModel = defaultGroup?.models.find(model => model.id === value.catalog.default.model);
    return (_jsxs(Section, { title: t('settings.models'), body: t('settings.modelsBody'), children: [_jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.models.default'), body: defaultGroup?.name ?? providerName(value.catalog.default.provider), control: _jsx("span", { children: defaultModel?.name ?? t('common.none') }) }), _jsx(Row, { title: t('settings.models.routable'), control: (_jsx("span", { className: css.rowMono, children: value.catalog.routableProviders.map(providerName).join(', ') || t('common.none') })) })] }), value.credentialError === undefined ? null : _jsx("div", { className: css.notice, children: `${t('settings.models.credentialWarning')}: ${value.credentialError}` }), _jsx("div", { className: css.providerList, children: value.providers.map(row => _jsx(ModelProviderCard, { row: row, writable: value.writable, onReload: models.reload }, row.id)) }), value.catalog.groups.map(group => (_jsxs("div", { className: css.card, children: [_jsx(Row, { title: group.name, control: _jsx("span", { className: css.badge, children: group.models.length }) }), group.models.map(model => (_jsx(Row, { title: model.name, body: model.description }, model.id)))] }, group.id))), value.catalog.failures.length === 0
                ? null
                : (_jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.models.failures') }), value.catalog.failures.map(failure => (_jsx(Row, { title: failure.name, body: failure.message }, failure.id)))] })), value.hasDocument
                ? _jsx(Button, { onClick: () => { void runtime.remote.settings.openSettingsDocument(); }, children: t('settings.openOfficialSettings') })
                : null] }));
}
/** Human-invocable skills visible to the current session. */
function SkillsSection({ sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const [query, setQuery] = useState('');
    const skills = useAsync(async () => (sessionId === undefined ? undefined : await runtime.remote.skills.list({ sessionId })), [runtime, sessionId]);
    const rows = useMemo(() => {
        const list = skills.value?.ok === true ? skills.value.value.skills : [];
        const needle = query.trim().toLowerCase();
        return needle === ''
            ? list
            : list.filter(skill => skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle));
    }, [skills.value, query]);
    if (sessionId === undefined)
        return _jsx(EmptyState, { children: t('composer.needsSession') });
    if (skills.loading)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (skills.error !== undefined)
        return _jsx(EmptyState, { children: skills.error });
    if (skills.value?.ok === false)
        return _jsx(EmptyState, { children: skills.value.error.message });
    return (_jsxs(Section, { title: t('settings.skills'), body: t('settings.count', { count: rows.length }), children: [_jsx("input", { className: css.search, value: query, placeholder: t('common.search'), onChange: event => { setQuery(event.target.value); } }), rows.length === 0
                ? _jsx(EmptyState, { children: t('composer.noSkills') })
                : (_jsx("div", { className: css.card, children: rows.map(skill => (_jsx(Row, { title: `/${skill.name}`, body: skill.whenToUse ?? skill.description, control: skill.modelInvocable ? _jsx("span", { className: css.badge, children: "model" }) : undefined }, skill.name))) }))] }));
}
/** Slash commands registered for the current session. */
function CommandsSection({ sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const commands = useAsync(async () => (sessionId === undefined ? undefined : await runtime.remote.commands.list(sessionId)), [runtime, sessionId]);
    if (sessionId === undefined)
        return _jsx(EmptyState, { children: t('composer.needsSession') });
    if (commands.loading)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (commands.error !== undefined)
        return _jsx(EmptyState, { children: commands.error });
    if (commands.value?.ok === false)
        return _jsx(EmptyState, { children: commands.value.error.message });
    const rows = commands.value?.ok === true ? commands.value.value : [];
    return (_jsx(Section, { title: t('settings.commands'), body: t('settings.count', { count: rows.length }), children: rows.length === 0
            ? _jsx(EmptyState, { children: t('settings.empty') })
            : (_jsx("div", { className: css.card, children: rows.map(command => (_jsx(Row, { title: `/${command.name}`, body: command.description }, command.name))) })) }));
}
/**
 * The Loader's live plugin inventory.
 *
 * MCP servers are Loader entries like any other plugin, so the MCP section is
 * the same inventory filtered by module specifier rather than a second source
 * of truth.
 */
function PluginsSection({ mcpOnly }) {
    const runtime = useRuntime();
    const t = useT();
    const inventory = useAsync(async () => await runtime.remote.pluginInventory.list(), [runtime]);
    if (inventory.loading)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    // A refused or failed read is reported: "0 entries" would claim the Loader
    // has no plugins, which is a different and wrong statement.
    if (inventory.error !== undefined)
        return _jsx(EmptyState, { children: inventory.error });
    if (inventory.value?.ok === false)
        return _jsx(EmptyState, { children: inventory.value.error.message });
    const entries = inventory.value?.ok === true ? inventory.value.value.entries : [];
    const rows = mcpOnly ? entries.filter(entry => /mcp/i.test(entry.moduleName)) : entries;
    return (_jsx(Section, { title: mcpOnly ? t('settings.mcp') : t('settings.plugins'), body: t('settings.count', { count: rows.length }), children: rows.length === 0
            ? _jsx(EmptyState, { children: t('settings.empty') })
            : (_jsx("div", { className: css.card, children: rows.map(entry => (_jsx(Row, { title: entry.moduleName, body: entry.enabled ? entry.fiberPhase ?? 'active' : 'disabled', control: _jsx("span", { className: css.badge, children: entry.fiberPhase ?? '—' }) }, entry.entryId))) })) }));
}
/** Persist the default preset through the same settings namespace as DSH. */
async function saveDefaultPreset(runtime, id) {
    try {
        const result = await runtime.remote.settings.update('agent-presets', { default: id }, undefined);
        return result.ok ? undefined : result.error.message;
    }
    catch (cause) {
        return cause instanceof Error ? cause.message : String(cause);
    }
}
/** The Host's current Agent preset roster. */
function AgentPresetsSection() {
    const runtime = useRuntime();
    const t = useT();
    const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
    const opener = useAsync(async () => await runtime.remote.settings.canOpenAgentPresetDirectory(), [runtime]);
    const [selectedDefault, setSelectedDefault] = useState();
    const [savingDefault, setSavingDefault] = useState(false);
    const [defaultError, setDefaultError] = useState();
    const [dialog, setDialog] = useState();
    const [copyId, setCopyId] = useState('');
    const [copyName, setCopyName] = useState('');
    const [viewContent, setViewContent] = useState();
    const [revealedPaths, setRevealedPaths] = useState({});
    const [dialogBusy, setDialogBusy] = useState(false);
    const [dialogError, setDialogError] = useState();
    const presets = roster.value?.ok === true ? roster.value.value.presets : [];
    const hostDefault = presets.find(preset => preset.isDefault)?.id;
    const defaultId = selectedDefault ?? hostDefault ?? presets[0]?.id ?? '';
    const authorable = roster.value?.ok === true && roster.value.value.authorable;
    const canOpenDirectory = opener.value?.ok === true && opener.value.value;
    useEffect(() => {
        if (hostDefault !== undefined) {
            setSelectedDefault(hostDefault);
            return;
        }
        if (selectedDefault !== undefined && !presets.some(preset => preset.id === selectedDefault)) {
            setSelectedDefault(undefined);
        }
    }, [hostDefault, presets, selectedDefault]);
    useEffect(() => {
        if (dialog === undefined)
            return undefined;
        const onKeyDown = (event) => {
            if (event.key !== 'Escape' || dialogBusy)
                return;
            setDialog(undefined);
            setDialogError(undefined);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [dialog, dialogBusy]);
    const saveDefault = useCallback((id) => {
        if (id === defaultId || savingDefault)
            return;
        const previous = defaultId;
        setSelectedDefault(id);
        setSavingDefault(true);
        setDefaultError(undefined);
        void saveDefaultPreset(runtime, id)
            .then((failure) => {
            if (failure === undefined) {
                roster.reload();
                return;
            }
            setSelectedDefault(previous);
            setDefaultError(failure);
        })
            .catch((cause) => {
            setSelectedDefault(previous);
            setDefaultError(cause instanceof Error ? cause.message : String(cause));
        })
            .finally(() => { setSavingDefault(false); });
    }, [defaultId, roster, runtime.remote.settings, savingDefault]);
    const closeDialog = (force = false) => {
        if (dialogBusy && !force)
            return;
        setDialog(undefined);
        setDialogError(undefined);
        setViewContent(undefined);
    };
    const beginCopy = (from) => {
        setCopyId('');
        setCopyName('');
        setDialogError(undefined);
        setDialog({ kind: 'copy', from });
    };
    const viewPreset = (id) => {
        setDialogError(undefined);
        setViewContent(undefined);
        setDialog({ kind: 'view', id });
        setDialogBusy(true);
        void runtime.remote.agentPresets.read(id)
            .then((result) => {
            if (!result.ok) {
                setDialogError(result.error.message);
                return;
            }
            setViewContent(result.value.content);
        })
            .catch((cause) => { setDialogError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setDialogBusy(false); });
    };
    const openPresetLocation = (id) => {
        setDialogError(undefined);
        void runtime.remote.settings.openAgentPresetDirectory(id)
            .then((result) => {
            if (!result.ok) {
                setDialogError(result.error.message);
                return;
            }
            const value = result.value;
            if (typeof value.path === 'string') {
                setRevealedPaths(previous => ({ ...previous, [id]: value.path }));
            }
        })
            .catch((cause) => { setDialogError(cause instanceof Error ? cause.message : String(cause)); });
    };
    const confirmCopy = () => {
        if (dialog?.kind !== 'copy' || dialogBusy)
            return;
        const id = copyId.trim();
        if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
            setDialogError(t('settings.agentPresets.idInvalid'));
            return;
        }
        if (presets.some(preset => preset.id === id)) {
            setDialogError(t('settings.agentPresets.idTaken'));
            return;
        }
        setDialogBusy(true);
        setDialogError(undefined);
        void runtime.remote.agentPresets.copy(dialog.from, id, copyName.trim() === '' ? undefined : copyName.trim())
            .then((result) => {
            if (!result.ok) {
                setDialogError(result.error.message);
                return;
            }
            closeDialog(true);
            roster.reload();
            openPresetLocation(id);
        })
            .catch((cause) => { setDialogError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setDialogBusy(false); });
    };
    const confirmDelete = () => {
        if (dialog?.kind !== 'delete' || dialogBusy)
            return;
        setDialogBusy(true);
        setDialogError(undefined);
        void runtime.remote.agentPresets.deletePreset(dialog.id)
            .then((result) => {
            if (!result.ok) {
                setDialogError(result.error.message);
                return;
            }
            closeDialog(true);
            setSelectedDefault(undefined);
            roster.reload();
        })
            .catch((cause) => { setDialogError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setDialogBusy(false); });
    };
    if (roster.loading)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (roster.error !== undefined)
        return _jsx(EmptyState, { children: roster.error });
    if (roster.value?.ok === false)
        return _jsx(EmptyState, { children: roster.value.error.message });
    return (_jsxs(Section, { title: t('settings.agentPresets'), body: t('settings.agentPresetsBody'), children: [presets.length === 0
                ? _jsx(EmptyState, { children: t('settings.empty') })
                : (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.agentPresetsDefault'), body: t('settings.agentPresetsDefaultBody'), control: (_jsx(SelectMenu, { value: defaultId, ariaLabel: t('settings.agentPresetsDefault'), options: presets.map(preset => ({
                                            id: preset.id,
                                            label: preset.name ?? preset.id,
                                            detail: preset.broken,
                                            disabled: preset.broken !== undefined,
                                        })), disabled: savingDefault || presets.length < 2, onChange: saveDefault })) }), defaultError === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: defaultError })] }), _jsx("div", { className: css.card, children: presets.map(preset => (_jsx(Row, { title: preset.name ?? preset.id, body: [preset.description, preset.broken].filter(Boolean).join(' · '), control: (_jsxs("div", { className: css.presetActions, children: [preset.id === defaultId ? _jsx("span", { className: css.badge, children: t('settings.models.default') }) : null, preset.trust === 'system' && preset.broken === undefined
                                            ? _jsx(Button, { onClick: () => { viewPreset(preset.id); }, children: t('settings.agentPresets.view') })
                                            : null, authorable && preset.broken === undefined
                                            ? _jsx(Button, { onClick: () => { beginCopy(preset.id); }, children: t('settings.agentPresets.copy') })
                                            : null, preset.trust === 'user'
                                            ? (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: () => { openPresetLocation(preset.id); }, children: canOpenDirectory ? t('settings.agentPresets.openLocation') : t('settings.agentPresets.showLocation') }), _jsx(Button, { onClick: () => { setDialogError(undefined); setDialog({ kind: 'delete', id: preset.id }); }, children: t('settings.agentPresets.delete') })] }))
                                            : null] })) }, preset.id))) })] })), dialog === undefined
                ? null
                : (_jsx("div", { className: css.dialogBackdrop, role: "presentation", onMouseDown: (event) => { if (event.target === event.currentTarget)
                        closeDialog(); }, children: _jsx("div", { className: css.dialog, role: "dialog", "aria-modal": "true", "aria-labelledby": "dcode-settings-dialog-title", children: dialog.kind === 'copy'
                            ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dialogHeader, children: [_jsx("div", { id: "dcode-settings-dialog-title", className: css.dialogTitle, children: t('settings.agentPresets.copyTitle') }), _jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.close') })] }), _jsx("p", { className: css.dialogBody, children: t('settings.agentPresets.copyBody') }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.agentPresets.id') }), _jsx("input", { className: css.fieldInput, autoFocus: true, value: copyId, placeholder: "my-agent", disabled: dialogBusy, onChange: event => { setCopyId(event.target.value); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.agentPresets.name') }), _jsx("input", { className: css.fieldInput, value: copyName, placeholder: t('settings.agentPresets.namePlaceholder'), disabled: dialogBusy, onChange: event => { setCopyName(event.target.value); } })] }), dialogError === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: dialogError }), _jsxs("div", { className: css.dialogActions, children: [_jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.cancel') }), _jsx(Button, { primary: true, onClick: confirmCopy, disabled: dialogBusy, children: dialogBusy ? t('common.saving') : t('settings.agentPresets.copy') })] })] }))
                            : dialog.kind === 'view'
                                ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dialogHeader, children: [_jsx("div", { id: "dcode-settings-dialog-title", className: css.dialogTitle, children: t('settings.agentPresets.view') }), _jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.close') })] }), dialogBusy ? _jsx(EmptyState, { children: _jsx(Spinner, {}) }) : viewContent === undefined ? _jsx("div", { className: css.inlineError, role: "alert", children: dialogError ?? t('common.error') }) : _jsx("pre", { className: css.viewerCode, children: viewContent })] }))
                                : (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dialogHeader, children: [_jsx("div", { id: "dcode-settings-dialog-title", className: css.dialogTitle, children: t('settings.agentPresets.deleteTitle') }), _jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.close') })] }), _jsx("p", { className: css.dialogBody, children: t('settings.agentPresets.deleteBody') }), dialogError === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: dialogError }), _jsxs("div", { className: css.dialogActions, children: [_jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.cancel') }), _jsx(Button, { primary: true, onClick: confirmDelete, disabled: dialogBusy, children: dialogBusy ? t('common.saving') : t('settings.agentPresets.delete') })] })] })) }) })), Object.entries(revealedPaths).map(([id, path]) => (_jsxs("div", { className: css.revealedPath, children: [_jsx("span", { children: `${id}: ` }), _jsx("code", { children: path })] }, id)))] }));
}
/** Direct subagents of the current session. */
function SubagentsSection({ sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const catalog = useAsync(async (signal) => (sessionId === undefined ? undefined : await runtime.remote.subagents.list(sessionId, signal)), [runtime, sessionId]);
    if (sessionId === undefined)
        return _jsx(EmptyState, { children: t('composer.needsSession') });
    if (catalog.loading)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (catalog.error !== undefined)
        return _jsx(EmptyState, { children: catalog.error });
    if (catalog.value?.ok === false)
        return _jsx(EmptyState, { children: catalog.value.error.message });
    const members = catalog.value?.ok === true
        ? catalog.value.value.members ?? []
        : [];
    return (_jsx(Section, { title: t('settings.subagents'), body: t('settings.count', { count: members.length }), children: members.length === 0
            ? _jsx(EmptyState, { children: t('settings.empty') })
            : (_jsx("div", { className: css.card, children: members.map(member => (_jsx(Row, { title: member.name ?? member.childSessionId, body: member.status }, member.childSessionId))) })) }));
}
/**
 * Registered settings namespaces, filtered to those a section is about.
 *
 * Editing arbitrary namespaces needs the schema-driven form the classic
 * surface owns; this panel is a live read plus the door to that editor, which
 * is honest about what it does rather than pretending to be a second editor.
 */
function NamespaceSection({ title, body, match }) {
    const runtime = useRuntime();
    const t = useT();
    const described = useAsync(async () => await runtime.remote.settings.describe(), [runtime]);
    const namespaces = described.value?.ok === true
        ? described.value.value.namespaces.filter(view => match.test(view.ns))
        : [];
    const openDocument = useCallback(() => {
        void runtime.remote.settings.openSettingsDocument();
    }, [runtime]);
    return (_jsxs(Section, { title: title, body: body, children: [described.loading ? _jsx(EmptyState, { children: _jsx(Spinner, {}) }) : null, described.error !== undefined ? _jsx(EmptyState, { children: described.error }) : null, described.value?.ok === false ? _jsx(EmptyState, { children: described.value.error.message }) : null, namespaces.length === 0 && !described.loading && described.error === undefined
                ? _jsx(EmptyState, { children: t('settings.empty') })
                : (_jsx("div", { className: css.card, children: namespaces.map(view => (_jsx(Row, { title: view.ns, body: `${t('settings.namespace')} · ${view.applies}`, control: _jsx("span", { className: css.rowMono, children: JSON.stringify(view.value) }) }, view.ns))) })), described.value?.ok === true && described.value.value.hasDocument
                ? _jsx(Button, { onClick: openDocument, children: t('settings.openOfficialSettings') })
                : null] }));
}
function UsageMetric(props) {
    return (_jsxs("div", { className: css.usageMetric, children: [_jsx("span", { className: css.usageMetricTitle, children: props.title }), _jsx("strong", { className: css.usageMetricValue, children: props.value })] }));
}
function UsageSection() {
    const t = useT();
    const list = useSessionList();
    const totals = useMemo(() => summarizeUsage(aggregateUsage(list)), [list]);
    if (list.phase === 'pending') {
        return (_jsx(Section, { title: t('settings.usage'), body: t('settings.usageBody'), children: _jsx("div", { className: css.card, children: _jsx("div", { className: css.usageStatus, children: t('settings.usageLoading') }) }) }));
    }
    return (_jsxs(Section, { title: t('settings.usage'), body: t('settings.usageBody'), children: [_jsxs("div", { className: css.usageTotal, children: [_jsx("span", { className: css.usageTotalTitle, children: t('settings.usageTotal') }), _jsx("strong", { className: css.usageTotalValue, children: formatTokenCount(totals.totalTokens) }), _jsx("span", { className: css.usageTotalScope, children: t('settings.usageScope', {
                            sessions: formatTokenCount(totals.sessions),
                            usageSessions: formatTokenCount(totals.usageSessions),
                        }) })] }), _jsxs("div", { className: css.usageGrid, children: [_jsx(UsageMetric, { title: t('settings.usageInput'), value: formatTokenCount(totals.promptTokens) }), _jsx(UsageMetric, { title: t('settings.usageOutput'), value: formatTokenCount(totals.outputTokens) }), _jsx(UsageMetric, { title: t('settings.usageCacheRead'), value: formatTokenCount(totals.cacheReadTokens) }), _jsx(UsageMetric, { title: t('settings.usageCacheWrite'), value: formatTokenCount(totals.cacheWriteTokens) })] }), _jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.usageSessions'), control: _jsx("span", { className: css.rowMono, children: formatTokenCount(totals.sessions) }) }), _jsx(Row, { title: t('settings.usageTurns'), control: _jsx("span", { className: css.rowMono, children: totals.hasStats ? formatTokenCount(totals.turns) : '—' }) }), _jsx(Row, { title: t('settings.usageSteps'), control: _jsx("span", { className: css.rowMono, children: totals.hasStats ? formatTokenCount(totals.steps) : '—' }) }), _jsx(Row, { title: t('settings.usageCacheHit'), control: _jsx("span", { className: css.rowMono, children: totals.cacheHit === null ? '—' : formatPercent(totals.cacheHit) }) })] }), !totals.hasUsage ? _jsx("div", { className: css.usageEmpty, children: t('settings.usageEmpty') }) : null] }));
}
/** The settings rail and the selected section. */
export function SettingsSurface({ navigation, sessionId, renderSection }) {
    const t = useT();
    const state = useNavigation(navigation);
    const icons = {
        general: _jsx(IconSettingsOutline16, {}),
        models: _jsx(IconApiOutline14, { size: 16 }),
        browser: _jsx(IconBrowseOutline16, {}),
        computer: _jsx(IconCodeOutline16, {}),
        memory: _jsx(IconDataOutline16, {}),
        subagents: _jsx(IconUserOutline16, {}),
        plugins: _jsx(IconCordisPluginOutline14, { size: 16 }),
        mcp: _jsx(IconApiOutline14, { size: 16 }),
        agentPresets: _jsx(IconSparkle16, {}),
        skills: _jsx(IconSkillOutline16, {}),
        commands: _jsx(IconListPenOutline16, {}),
        usage: _jsx(IconDataOutline16, {}),
    };
    const official = (id, fallback) => renderSection === undefined
        ? fallback
        : (_jsx("div", { className: css.officialSection, "data-dcode-settings-section": id, children: renderSection('settings.section', { close: () => { navigation.show('session'); } }, { only: id }) }));
    const body = () => {
        switch (state.settingsSection) {
            case 'general':
            case 'appearance': return _jsx(GeneralSection, {});
            case 'models': return official('models', _jsx(ModelsSection, {}));
            case 'skills': return _jsx(SkillsSection, { sessionId: sessionId });
            case 'commands': return _jsx(CommandsSection, { sessionId: sessionId });
            case 'plugins': return official('plugins', _jsx(PluginSettingsSection, {}));
            case 'mcp': return _jsx(PluginSettingsSection, { mcpOnly: true });
            case 'agentPresets': return official('agent-presets', _jsx(AgentPresetsSection, {}));
            case 'subagents': return _jsx(SubagentsSection, { sessionId: sessionId });
            case 'usage': return _jsx(UsageSection, {});
            case 'memory':
                return _jsx(NamespaceSection, { title: t('settings.memory'), body: t('settings.memoryBody'), match: /memor|context|compaction/i });
            case 'browser':
                return _jsx(NamespaceSection, { title: t('settings.browser'), body: t('settings.browserBody'), match: /browser|web|vision/i });
            case 'computer':
                return _jsx(NamespaceSection, { title: t('settings.computer'), body: t('settings.computerBody'), match: /shell|terminal|sandbox|permission/i });
            default:
                return _jsx(GeneralSection, {});
        }
    };
    return (_jsxs("div", { className: css.surface, children: [_jsxs("nav", { className: css.rail, "aria-label": t('settings.title'), children: [_jsxs("button", { type: "button", className: css.back, onClick: () => { navigation.show('session'); }, children: [_jsx(IconChevronLeftOutline14, {}), t('nav.backToWorkspace')] }), RAIL.map(group => (_jsxs("div", { children: [_jsx("div", { className: css.group, children: t(group.group) }), group.items.map(item => (_jsxs("button", { type: "button", className: `${css.item} ${state.settingsSection === item.id ? css.itemActive : ''}`, onClick: () => { navigation.openSettings(item.id); }, children: [icons[item.id] ?? _jsx(IconFollowsystemOutline16, {}), t(item.label)] }, item.id)))] }, group.group)))] }), _jsx("div", { className: css.body, children: _jsxs("div", { className: css.inner, children: [_jsx("div", { className: css.title, children: t('settings.title') }), body()] }) })] }));
}
//# sourceMappingURL=SettingsSurface.js.map