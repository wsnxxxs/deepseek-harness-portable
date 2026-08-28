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
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { IconApiOutline14, IconBrowseOutline16, IconChevronLeftOutline14, IconCodeOutline16, IconCordisPluginOutline14, IconDataOutline16, IconFollowsystemOutline16, IconListPenOutline16, IconSettingsOutline16, IconSkillOutline16, IconSparkle16, IconUserOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useAsync, useSessionList } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { Button, EmptyState, Spinner } from "../shell/ui.js";
import { ThemeSwitch } from "../shell/ThemeSwitch.js";
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
            { id: 'plugins', label: 'settings.plugins' },
            { id: 'agentPresets', label: 'settings.agentPresets' },
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
    return (_jsxs(_Fragment, { children: [_jsx(Section, { title: t('settings.language'), children: _jsx("div", { className: css.card, children: _jsx(Row, { title: t('settings.language'), control: (_jsx("select", { className: css.select, "aria-label": t('settings.language'), value: locale.active, disabled: localeOptions.length <= 1, onChange: (event) => { runtime.locale.set(event.target.value); }, children: localeOptions.map(option => (_jsx("option", { value: option.id, children: option.label }, option.id))) })) }) }) }), _jsx(Section, { title: t('settings.appearance'), children: _jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.theme'), control: _jsx(ThemeSwitch, {}) }), custom.length === 0
                            ? null
                            : (_jsx(Row, { title: t('settings.themeCustom'), control: (_jsxs("select", { className: css.select, value: snapshot?.preference ?? snapshot?.active.id ?? 'system', onChange: (event) => { theme?.setTheme?.(event.target.value); }, children: [_jsx("option", { value: "system", children: t('theme.system') }), (snapshot?.themes ?? []).map(entry => (_jsx("option", { value: entry.id, children: entry.id }, entry.id)))] })) })), _jsx(Row, { title: t('settings.fontSize'), control: theme?.setFontSize === undefined
                                ? _jsx("span", { className: css.badge, children: snapshot?.fontSize ?? '—' })
                                : (_jsx("input", { className: css.number, type: "number", min: 11, max: 22, value: snapshot?.fontSize ?? 14, disabled: theme?.setFontSize === undefined, onChange: (event) => { theme.setFontSize?.(Number(event.target.value)); } })) })] }) }), _jsx(Section, { title: t('settings.busyEnter'), body: t('settings.busyEnterBody'), children: _jsx("div", { className: css.card, children: _jsx(Row, { title: t('settings.busyEnter'), control: (_jsxs("select", { className: css.select, "aria-label": t('settings.busyEnter'), value: busyEnter, disabled: !runtime.busyEnter.writable, onChange: (event) => { runtime.busyEnter.set(event.target.value); }, children: [_jsx("option", { value: "queue", children: t('settings.busyEnter.queue') }), _jsx("option", { value: "steer", children: t('settings.busyEnter.steer') })] })) }) }) }), _jsx(InterfaceSection, {})] }));
}
/** Provider routes and the model catalogue the composer selects from. */
function ModelsSection() {
    const runtime = useRuntime();
    const t = useT();
    const catalog = useAsync(async () => await runtime.remote.session.modelCatalog(), [runtime]);
    if (catalog.loading)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (catalog.value?.ok !== true) {
        return _jsx(EmptyState, { children: catalog.error ?? (catalog.value?.ok === false ? catalog.value.error.message : t('common.error')) });
    }
    const value = catalog.value.value;
    const providerName = (providerId) => value.groups.find(group => group.id === providerId)?.name
        ?? value.failures.find(failure => failure.id === providerId)?.name
        ?? providerId;
    const defaultGroup = value.groups.find(group => group.id === value.default.provider
        && group.models.some(model => model.id === value.default.model));
    const defaultModel = defaultGroup?.models.find(model => model.id === value.default.model);
    return (_jsxs(Section, { title: t('settings.models'), children: [_jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.models.default'), body: defaultGroup?.name ?? providerName(value.default.provider), control: _jsx("span", { children: defaultModel?.name ?? t('common.none') }) }), _jsx(Row, { title: t('settings.models.routable'), control: (_jsx("span", { className: css.rowMono, children: value.routableProviders.map(providerName).join(', ') || t('common.none') })) })] }), value.groups.map(group => (_jsxs("div", { className: css.card, children: [_jsx(Row, { title: group.name, control: _jsx("span", { className: css.badge, children: group.models.length }) }), group.models.map(model => (_jsx(Row, { title: model.name, body: model.description }, model.id)))] }, group.id))), value.failures.length === 0
                ? null
                : (_jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.models.failures') }), value.failures.map(failure => (_jsx(Row, { title: failure.name, body: failure.message }, failure.id)))] }))] }));
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
/** The Host's current Agent preset roster. */
function AgentPresetsSection() {
    const runtime = useRuntime();
    const t = useT();
    const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
    if (roster.loading)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (roster.error !== undefined)
        return _jsx(EmptyState, { children: roster.error });
    if (roster.value?.ok === false)
        return _jsx(EmptyState, { children: roster.value.error.message });
    const presets = roster.value?.ok === true ? roster.value.value.presets : [];
    return (_jsx(Section, { title: t('settings.agentPresets'), body: t('settings.agentPresetsBody'), children: presets.length === 0
            ? _jsx(EmptyState, { children: t('settings.empty') })
            : (_jsx("div", { className: css.card, children: presets.map(preset => (_jsx(Row, { title: preset.name ?? preset.id, body: [preset.description, preset.broken].filter(Boolean).join(' · '), control: preset.isDefault
                        ? _jsx("span", { className: css.badge, children: t('settings.models.default') })
                        : undefined }, preset.id))) })) }));
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
/** Token accounting aggregated from the Session list's durable projections. */
function UsageSection() {
    const t = useT();
    const list = useSessionList();
    const totals = useMemo(() => {
        let turns = 0;
        let tokens = 0;
        let hasStats = false;
        let hasUsage = false;
        for (const id of list.ids) {
            const projections = list.byId[id]?.projectionValues;
            const stats = projections?.sessionStats;
            if (stats !== undefined) {
                hasStats = true;
                turns += stats.turns ?? 0;
            }
            const usage = projections?.tokenUsage;
            if (usage !== undefined) {
                hasUsage = true;
                tokens += (usage.uncachedInputTokens ?? 0)
                    + (usage.outputTokens ?? 0)
                    + (usage.cacheReadTokens ?? 0)
                    + (usage.cacheWriteTokens ?? 0);
            }
        }
        return { turns, tokens, hasStats, hasUsage };
    }, [list]);
    return (_jsx(Section, { title: t('settings.usage'), body: t('settings.usageBody'), children: _jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.usageTurns'), control: _jsx("span", { className: css.rowMono, children: totals.hasStats ? totals.turns : '—' }) }), _jsx(Row, { title: t('settings.usageTokens'), control: _jsx("span", { className: css.rowMono, children: totals.hasUsage ? totals.tokens : '—' }) })] }) }));
}
/** The settings rail and the selected section. */
export function SettingsSurface({ navigation, sessionId }) {
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
    const body = () => {
        switch (state.settingsSection) {
            case 'general':
            case 'appearance': return _jsx(GeneralSection, {});
            case 'models': return _jsx(ModelsSection, {});
            case 'skills': return _jsx(SkillsSection, { sessionId: sessionId });
            case 'commands': return _jsx(CommandsSection, { sessionId: sessionId });
            case 'plugins': return _jsx(PluginsSection, { mcpOnly: false });
            case 'mcp': return _jsx(PluginsSection, { mcpOnly: true });
            case 'agentPresets': return _jsx(AgentPresetsSection, {});
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