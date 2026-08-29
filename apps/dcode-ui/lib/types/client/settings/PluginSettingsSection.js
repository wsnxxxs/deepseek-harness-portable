import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** DCode-owned plugin settings over the existing settings and inventory remotes. */
import { useId, useMemo, useRef, useState } from 'react';
import { useAsync } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { Button, EmptyState, Spinner, ui } from "../shell/ui.js";
import css from './SettingsSurface.module.css';
function objectValue(source) {
    return typeof source === 'object' && source !== null && !Array.isArray(source)
        ? source
        : {};
}
function hasField(source, key) {
    return Object.hasOwn(objectValue(source), key);
}
function fieldValue(source, key) {
    return objectValue(source)[key];
}
function fieldText(source, key) {
    const value = fieldValue(source, key);
    return typeof value === 'number' || typeof value === 'string' ? String(value) : '';
}
function modelKey(provider, model) {
    return `${provider}\0${model}`;
}
async function loadPluginSettings(runtime, includeSettings) {
    const inventoryPromise = runtime.remote.pluginInventory.list();
    if (!includeSettings) {
        const inventory = await inventoryPromise;
        if (!inventory.ok)
            throw new Error(inventory.error.message);
        return { settings: undefined, inventory: inventory.value, catalog: undefined, credential: undefined };
    }
    const [inventory, settings, catalog] = await Promise.all([
        inventoryPromise,
        runtime.remote.settings.describe(),
        runtime.remote.session.modelCatalog(),
    ]);
    if (!inventory.ok)
        throw new Error(inventory.error.message);
    if (!settings.ok)
        throw new Error(settings.error.message);
    const webSearch = settings.value.namespaces.find(namespace => namespace.ns === 'web-search-deepseek');
    const credentialRef = typeof fieldValue(webSearch?.value, 'apiKeyEnv') === 'string'
        && String(fieldValue(webSearch?.value, 'apiKeyEnv')).length > 0
        ? String(fieldValue(webSearch?.value, 'apiKeyEnv'))
        : 'DEEPSEEK_API_KEY';
    let credential;
    let credentialError;
    try {
        const described = await runtime.remote.credentials.describe([credentialRef]);
        if (described.ok)
            credential = described.value[credentialRef];
        else
            credentialError = described.error.message;
    }
    catch (cause) {
        credentialError = cause instanceof Error ? cause.message : String(cause);
    }
    return {
        settings: { writable: settings.value.writable, namespaces: settings.value.namespaces },
        inventory: inventory.value,
        catalog: catalog.ok ? catalog.value : undefined,
        credential,
        ...credentialError === undefined ? {} : { credentialError },
    };
}
function PluginSettingsCard(props) {
    const runtime = useRuntime();
    const t = useT();
    const user = objectValue(props.namespace.user);
    const [draft, setDraft] = useState(() => Object.fromEntries(props.fields.map(field => [field.key, fieldText(props.namespace.value, field.key)])));
    const [resetFields, setResetFields] = useState(() => new Set());
    const [credentialDraft, setCredentialDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState();
    const credentialWritable = props.credential?.writable !== false;
    const canSave = props.writable || (props.credentialLabel !== undefined && credentialWritable);
    const dirty = props.fields.some(field => {
        if (resetFields.has(field.key))
            return hasField(user, field.key);
        const text = draft[field.key] ?? '';
        const stored = fieldValue(user, field.key);
        const effective = fieldValue(props.namespace.value, field.key);
        if (text.trim() === '')
            return hasField(user, field.key);
        const parsed = field.type === 'number' ? Number(text) : text.trim();
        const valid = field.type === 'number' ? Number.isFinite(parsed) : true;
        return valid && JSON.stringify(parsed) !== JSON.stringify(stored)
            && !(stored === undefined && JSON.stringify(parsed) === JSON.stringify(effective));
    }) || credentialDraft.trim().length > 0;
    const save = async () => {
        if (!canSave || saving || !dirty)
            return;
        setSaving(true);
        setError(undefined);
        try {
            const ops = [];
            for (const field of props.fields) {
                const text = draft[field.key]?.trim() ?? '';
                if (resetFields.has(field.key)) {
                    if (hasField(user, field.key))
                        ops.push({ op: 'unset', path: [field.key] });
                    continue;
                }
                if (text === '') {
                    if (hasField(user, field.key))
                        ops.push({ op: 'unset', path: [field.key] });
                    continue;
                }
                const next = field.type === 'number' ? Number(text) : text;
                if (field.type === 'number' && !Number.isFinite(next)) {
                    throw new Error(t('settings.plugins.invalidNumber'));
                }
                const stored = fieldValue(user, field.key);
                const effective = fieldValue(props.namespace.value, field.key);
                if (JSON.stringify(next) === JSON.stringify(stored))
                    continue;
                if (stored === undefined && JSON.stringify(next) === JSON.stringify(effective))
                    continue;
                ops.push({ op: 'set', path: [field.key], value: next });
            }
            if (props.writable && ops.length > 0) {
                const response = await runtime.remote.settings.mutate(props.namespace.ns, ops, props.namespace.revision);
                if (!response.ok)
                    throw new Error(response.error.message);
            }
            if (credentialDraft.trim() !== '') {
                const ref = typeof fieldValue(props.namespace.value, 'apiKeyEnv') === 'string'
                    && String(fieldValue(props.namespace.value, 'apiKeyEnv')).length > 0
                    ? String(fieldValue(props.namespace.value, 'apiKeyEnv'))
                    : 'DEEPSEEK_API_KEY';
                const response = await runtime.remote.credentials.set(ref, credentialDraft.trim());
                if (!response.ok)
                    throw new Error(response.error.message);
            }
            props.onReload();
            setCredentialDraft('');
            setResetFields(new Set());
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("section", { className: css.pluginCard, children: [_jsxs("header", { className: `${css.pluginCardHeader} ${ui.cardHeader}`, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: props.title }), _jsx("div", { className: css.rowBody, children: props.description })] }), props.writable ? _jsx("span", { className: css.badge, children: props.namespace.applies }) : _jsx("span", { className: css.badge, children: t('common.readOnly') })] }), _jsxs("div", { className: css.pluginCardBody, children: [props.credentialLabel === undefined ? null : (_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: props.credentialLabel }), _jsx("input", { className: css.fieldInput, type: "password", autoComplete: "off", value: credentialDraft, placeholder: props.credential?.configured === true ? t('settings.plugins.keyConfiguredHint') : t('settings.plugins.keyPlaceholder'), disabled: saving || !credentialWritable, onChange: event => { setCredentialDraft(event.target.value); } }), _jsx("span", { className: css.fieldHint, children: props.credential?.configured === true ? t('settings.plugins.keyConfigured') : props.credentialHint })] })), props.fields.map(field => (_jsxs("label", { className: css.field, children: [_jsxs("span", { className: css.fieldMeta, children: [_jsx("span", { className: css.fieldLabel, children: field.label }), hasField(user, field.key) && !resetFields.has(field.key)
                                        ? _jsx(Button, { className: css.resetButton, onClick: () => { setResetFields(previous => new Set([...previous, field.key])); setDraft(previous => ({ ...previous, [field.key]: fieldText(props.namespace.base, field.key) })); }, disabled: saving || !props.writable, children: t('settings.plugins.reset') })
                                        : null] }), _jsx("input", { className: css.fieldInput, type: field.type === 'number' ? 'number' : 'text', value: draft[field.key] ?? '', placeholder: fieldText(props.namespace.base, field.key) || t('settings.plugins.defaultValue'), disabled: saving || !props.writable, onChange: event => {
                                    setResetFields(previous => {
                                        const next = new Set(previous);
                                        next.delete(field.key);
                                        return next;
                                    });
                                    setDraft(previous => ({ ...previous, [field.key]: event.target.value }));
                                } }), _jsx("span", { className: css.fieldHint, children: field.hint })] }, field.key))), error === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: error }), _jsxs("div", { className: css.editorActions, children: [_jsx(Button, { onClick: () => { setDraft(Object.fromEntries(props.fields.map(field => [field.key, fieldText(props.namespace.value, field.key)]))); setResetFields(new Set()); setCredentialDraft(''); setError(undefined); }, disabled: saving || !dirty, children: t('settings.plugins.discard') }), _jsx(Button, { primary: true, onClick: () => { void save(); }, disabled: saving || !canSave || !dirty, children: saving ? t('settings.plugins.saving') : t('settings.plugins.save') })] })] })] }));
}
function VisionBridgeCard(props) {
    const runtime = useRuntime();
    const t = useT();
    const effectiveEnabled = typeof fieldValue(props.namespace.value, 'enabled') === 'boolean'
        ? fieldValue(props.namespace.value, 'enabled')
        : true;
    const effectiveModel = fieldText(props.namespace.value, 'model').trim();
    const [enabled, setEnabled] = useState(effectiveEnabled);
    const [model, setModel] = useState(effectiveModel);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState();
    const dirty = enabled !== effectiveEnabled || model.trim() !== effectiveModel;
    const routeKind = !enabled ? 'disabled' : model.trim() === '' ? 'auto' : 'pinned';
    const routeClass = routeKind === 'disabled'
        ? css.visionRouteDisabled
        : routeKind === 'auto'
            ? css.visionRouteAuto
            : css.visionRoutePinned;
    const routeLabel = routeKind === 'disabled'
        ? t('settings.plugins.visionRouteDisabled')
        : routeKind === 'auto'
            ? t('settings.plugins.visionRouteAutomatic')
            : t('settings.plugins.visionRoutePinned');
    const save = () => {
        if (!props.writable || saving || !dirty)
            return;
        setSaving(true);
        setError(undefined);
        const ops = [];
        if (enabled !== effectiveEnabled)
            ops.push({ op: 'set', path: ['enabled'], value: enabled });
        if (model.trim() !== effectiveModel)
            ops.push({ op: 'set', path: ['model'], value: model.trim() });
        void runtime.remote.settings.mutate(props.namespace.ns, ops, props.namespace.revision)
            .then((result) => {
            if (!result.ok)
                throw new Error(result.error.message);
            props.onReload();
        })
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setSaving(false); });
    };
    return (_jsxs("section", { className: css.pluginCard, children: [_jsxs("header", { className: `${css.pluginCardHeader} ${ui.cardHeader}`, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: t('settings.plugins.visionTitle') }), _jsx("div", { className: css.rowBody, children: t('settings.plugins.visionDescription') })] }), props.writable ? _jsx("span", { className: css.badge, children: props.namespace.applies }) : _jsx("span", { className: css.badge, children: t('common.readOnly') })] }), _jsxs("div", { className: css.pluginCardBody, children: [_jsxs("div", { className: css.visionRoute + ' ' + routeClass, role: "status", "aria-live": "polite", children: [_jsx("span", { className: css.statusDot, "aria-hidden": "true" }), _jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: routeLabel }), _jsx("div", { className: css.rowBody, children: model.trim() === '' ? t('settings.plugins.visionRouteAutomaticHint') : model.trim() })] })] }), _jsx("div", { className: css.notice, children: t('settings.plugins.visionSharedProvider') }), _jsxs("div", { className: css.switchRow, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: t('settings.plugins.visionEnabled') }), _jsx("div", { className: css.rowBody, children: t('settings.plugins.visionEnabledHint') })] }), _jsx("button", { type: "button", role: "switch", "aria-label": t('settings.plugins.visionEnabled'), "aria-checked": enabled, className: css.switch + ' ' + (enabled ? css.switchOn : ''), disabled: saving || !props.writable, onClick: () => { setEnabled(value => !value); }, children: _jsx("span", { className: css.switchThumb }) })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.plugins.visionModel') }), _jsx("input", { className: css.fieldInput, type: "text", value: model, placeholder: t('settings.plugins.visionModelPlaceholder'), disabled: saving || !props.writable, onChange: event => { setModel(event.target.value); } }), _jsx("span", { className: css.fieldHint, children: t('settings.plugins.visionModelHint') })] }), model.trim() !== '' ? _jsx(Button, { className: css.resetButton, onClick: () => { setModel(''); }, disabled: saving || !props.writable, children: t('settings.plugins.visionUseAutomatic') }) : null, error === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: error }), _jsxs("div", { className: css.editorActions, children: [_jsx(Button, { onClick: () => { setEnabled(effectiveEnabled); setModel(effectiveModel); setError(undefined); }, disabled: saving || !dirty, children: t('settings.plugins.discard') }), _jsx(Button, { primary: true, onClick: save, disabled: saving || !props.writable || !dirty, children: saving ? t('settings.plugins.saving') : t('settings.plugins.save') })] })] })] }));
}
function SubagentModelCard(props) {
    const runtime = useRuntime();
    const t = useT();
    const initialRoutes = Array.isArray(fieldValue(props.namespace.value, 'allowedModels'))
        ? fieldValue(props.namespace.value, 'allowedModels')
        : [];
    const [enabled, setEnabled] = useState(() => fieldValue(props.namespace.value, 'enabled') === true);
    const [selected, setSelected] = useState(() => new Set(initialRoutes.flatMap(route => typeof route.provider === 'string' && typeof route.model === 'string' ? [modelKey(route.provider, route.model)] : [])));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState();
    const candidates = useMemo(() => {
        const rows = props.catalog?.groups.flatMap(group => group.models.map(model => ({
            key: modelKey(group.id, model.id), provider: group.id, providerName: group.name, model: model.id, name: model.name,
        }))) ?? [];
        const known = new Set(rows.map(row => row.key));
        return [...rows, ...initialRoutes.flatMap(route => {
                if (typeof route.provider !== 'string' || typeof route.model !== 'string')
                    return [];
                const key = modelKey(route.provider, route.model);
                return known.has(key) ? [] : [{ key, provider: route.provider, providerName: route.provider, model: route.model, name: route.model }];
            })];
    }, [initialRoutes, props.catalog]);
    const dirty = enabled !== (fieldValue(props.namespace.value, 'enabled') === true)
        || candidates.some(candidate => selected.has(candidate.key) !== initialRoutes.some(route => route.provider === candidate.provider && route.model === candidate.model));
    const save = () => {
        if (!props.writable || saving || !dirty)
            return;
        if (enabled && selected.size === 0) {
            setError(t('settings.plugins.subagentModelSelectionRequired'));
            return;
        }
        setSaving(true);
        setError(undefined);
        const allowedModels = candidates
            .filter(candidate => selected.has(candidate.key))
            .map(candidate => ({ provider: candidate.provider, model: candidate.model }));
        void runtime.remote.settings.mutate(props.namespace.ns, [
            { op: 'set', path: ['enabled'], value: enabled },
            { op: 'set', path: ['allowedModels'], value: allowedModels },
        ], props.namespace.revision)
            .then((result) => {
            if (!result.ok)
                throw new Error(result.error.message);
            props.onReload();
        })
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setSaving(false); });
    };
    return (_jsxs("section", { className: css.pluginCard, children: [_jsxs("header", { className: `${css.pluginCardHeader} ${ui.cardHeader}`, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: t('settings.plugins.subagentModelSelectionTitle') }), _jsx("div", { className: css.rowBody, children: t('settings.plugins.subagentModelSelectionDescription') })] }), !props.writable ? _jsx("span", { className: css.badge, children: t('common.readOnly') }) : null] }), _jsxs("div", { className: css.pluginCardBody, children: [_jsxs("div", { className: css.switchRow, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.plugins.subagentModelSelectionToggle') }), _jsx("button", { type: "button", role: "switch", "aria-label": t('settings.plugins.subagentModelSelectionToggle'), "aria-checked": enabled, className: `${css.switch} ${enabled ? css.switchOn : ''}`, disabled: saving || !props.writable, onClick: () => { setEnabled(value => !value); }, children: _jsx("span", { className: css.switchThumb }) })] }), _jsx("p", { className: css.fieldHint, children: t(enabled ? 'settings.plugins.subagentModelSelectionChoose' : 'settings.plugins.subagentModelSelectionOff') }), enabled
                        ? (_jsxs("fieldset", { className: css.modelList, children: [_jsx("legend", { className: css.fieldLabel, children: t('settings.plugins.subagentModelSelectionAllowed') }), candidates.length === 0
                                    ? _jsx("span", { className: css.fieldHint, children: t('settings.plugins.subagentModelSelectionEmpty') })
                                    : candidates.map(candidate => (_jsxs("label", { className: css.modelOption, children: [_jsx("input", { type: "checkbox", checked: selected.has(candidate.key), disabled: saving || !props.writable, onChange: () => { setSelected(previous => { const next = new Set(previous); if (next.has(candidate.key))
                                                    next.delete(candidate.key);
                                                else
                                                    next.add(candidate.key); return next; }); } }), _jsxs("span", { className: css.rowText, children: [_jsx("span", { className: css.rowTitle, children: candidate.name }), _jsx("span", { className: css.modelRoute, children: `${candidate.providerName} · ${candidate.provider}/${candidate.model}` })] })] }, candidate.key)))] }))
                        : null, props.catalog === undefined && enabled ? _jsx("div", { className: css.notice, children: t('settings.plugins.subagentModelSelectionLoadFailed') }) : null, error === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: error }), _jsxs("div", { className: css.editorActions, children: [_jsx(Button, { onClick: () => { setEnabled(fieldValue(props.namespace.value, 'enabled') === true); setSelected(new Set(initialRoutes.flatMap(route => typeof route.provider === 'string' && typeof route.model === 'string' ? [modelKey(route.provider, route.model)] : []))); setError(undefined); }, disabled: saving || !dirty, children: t('settings.plugins.discard') }), _jsx(Button, { primary: true, onClick: save, disabled: saving || !props.writable || !dirty, children: saving ? t('settings.plugins.saving') : t('settings.plugins.save') })] })] })] }));
}
function PluginConfigSection(props) {
    const t = useT();
    const namespaces = props.data.settings?.namespaces ?? [];
    const find = (ns) => namespaces.find(namespace => namespace.ns === ns);
    const cards = [];
    const vision = find('vision');
    if (vision !== undefined)
        cards.push(_jsx(VisionBridgeCard, { namespace: vision, writable: props.data.settings?.writable === true, onReload: props.onReload }, vision.ns));
    const shell = find('shell');
    if (shell !== undefined)
        cards.push(_jsx(PluginSettingsCard, { namespace: shell, writable: props.data.settings?.writable === true, title: t('settings.plugins.shellTitle'), description: t('settings.plugins.shellDescription'), fields: [{ key: 'timeoutMs', label: t('settings.plugins.shellTimeout'), hint: t('settings.plugins.shellTimeoutHint'), type: 'number' }, { key: 'maxOutputBytes', label: t('settings.plugins.shellOutput'), hint: t('settings.plugins.shellOutputHint'), type: 'number' }], onReload: props.onReload }, shell.ns));
    const agentLoop = find('agent-loop');
    if (agentLoop !== undefined)
        cards.push(_jsx(PluginSettingsCard, { namespace: agentLoop, writable: props.data.settings?.writable === true, title: t('settings.plugins.agentLoopTitle'), description: t('settings.plugins.agentLoopDescription'), fields: [{ key: 'maxParallelToolCalls', label: t('settings.plugins.agentLoopParallel'), hint: t('settings.plugins.agentLoopParallelHint'), type: 'number' }], onReload: props.onReload }, agentLoop.ns));
    const webSearch = find('web-search-deepseek');
    if (webSearch !== undefined)
        cards.push(_jsx(PluginSettingsCard, { namespace: webSearch, writable: props.data.settings?.writable === true, title: t('settings.plugins.webSearchTitle'), description: t('settings.plugins.webSearchDescription'), credential: props.data.credential, credentialLabel: t('settings.plugins.webSearchApiKey'), credentialHint: t('settings.plugins.webSearchApiKeyHint'), fields: [{ key: 'baseURL', label: t('settings.plugins.webSearchBaseUrl'), hint: t('settings.plugins.webSearchBaseUrlHint'), type: 'text' }, { key: 'maxUses', label: t('settings.plugins.webSearchMaxUses'), hint: t('settings.plugins.webSearchMaxUsesHint'), type: 'number' }], onReload: props.onReload }, webSearch.ns));
    const subagent = find('subagent-model-selection');
    if (subagent !== undefined)
        cards.push(_jsx(SubagentModelCard, { namespace: subagent, writable: props.data.settings?.writable === true, catalog: props.data.catalog, onReload: props.onReload }, subagent.ns));
    return (_jsxs("div", { className: css.pluginConfigList, children: [props.data.credentialError === undefined ? null : _jsx("div", { className: css.notice, role: "alert", children: `${t('settings.plugins.credentialWarning')}: ${props.data.credentialError}` }), cards.length === 0 ? _jsx(EmptyState, { children: t('settings.plugins.emptyConfig') }) : cards] }));
}
function PluginInventory(props) {
    const t = useT();
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState();
    const entries = props.data.inventory.entries.filter(entry => !props.mcpOnly || /mcp/i.test(entry.moduleName));
    const filtered = entries.filter(entry => `${entry.moduleName} ${entry.entryId}`.toLowerCase().includes(query.trim().toLowerCase()));
    return (_jsxs("div", { className: css.pluginInventory, children: [_jsx("input", { className: css.search, type: "search", value: query, placeholder: t('settings.plugins.search'), "aria-label": t('settings.plugins.search'), onChange: event => { setQuery(event.target.value); } }), _jsxs("div", { className: css.inventoryHeading, children: [_jsx("span", { className: css.sectionTitle, children: t('settings.plugins.inventoryTitle') }), _jsx("span", { className: css.badge, children: filtered.length })] }), filtered.length === 0 ? _jsx(EmptyState, { children: t('settings.plugins.emptyInventory') }) : (_jsx("div", { className: css.card, children: filtered.map(entry => {
                    const open = expanded === entry.entryId;
                    return (_jsxs("div", { className: css.inventoryRow, children: [_jsxs("button", { type: "button", className: css.inventoryButton, "aria-expanded": open, "aria-controls": `plugin-entry-${entry.entryId}`, onClick: () => { setExpanded(current => current === entry.entryId ? undefined : entry.entryId); }, children: [_jsxs("span", { className: css.rowText, children: [_jsx("span", { className: css.rowTitle, children: entry.moduleName }), _jsx("span", { className: css.rowBody, children: entry.enabled ? entry.fiberPhase ?? t('settings.plugins.unobserved') : t('settings.plugins.disabled') })] }), _jsx("span", { className: css.badge, children: entry.enabled ? t('settings.plugins.enabled') : t('settings.plugins.disabled') })] }), open ? _jsx("code", { id: `plugin-entry-${entry.entryId}`, className: css.inventoryDetails, children: entry.entryId }) : null] }, entry.entryId));
                }) }))] }));
}
/** Plugins page with DCode tabs, local token styling, and writable host settings. */
export function PluginSettingsSection({ mcpOnly = false }) {
    const runtime = useRuntime();
    const t = useT();
    const data = useAsync(async () => await loadPluginSettings(runtime, !mcpOnly), [runtime, mcpOnly]);
    const [tab, setTab] = useState(mcpOnly ? 'inventory' : 'config');
    const tabPrefix = useId();
    const tabRefs = useRef({ config: null, inventory: null });
    const tabs = [
        { id: 'config', label: t('settings.plugins.configTab') },
        { id: 'inventory', label: t('settings.plugins.inventoryTab') },
    ];
    const moveTab = (event, index) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End')
            return;
        event.preventDefault();
        const next = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        const nextTab = tabs[next];
        if (nextTab === undefined)
            return;
        setTab(nextTab.id);
        tabRefs.current[nextTab.id]?.focus();
    };
    if (data.loading && data.value === undefined)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (data.error !== undefined && data.value === undefined)
        return _jsx(EmptyState, { children: data.error });
    if (data.value === undefined)
        return _jsx(EmptyState, { children: t('common.error') });
    const value = data.value;
    return (_jsxs("section", { className: css.section, children: [_jsx("span", { className: css.sectionTitle, children: mcpOnly ? t('settings.mcp') : t('plugins.section.settings') }), _jsx("p", { className: css.sectionBody, children: mcpOnly ? t('settings.plugins.mcpBody') : t('settings.pluginsBody') }), !mcpOnly ? (_jsx("div", { className: css.pluginTabs, role: "tablist", "aria-label": t('settings.plugins.tabs'), children: tabs.map((entry, index) => (_jsx("button", { ref: element => { tabRefs.current[entry.id] = element; }, id: `${tabPrefix}-${entry.id}`, type: "button", role: "tab", "aria-selected": tab === entry.id, "aria-controls": `${tabPrefix}-panel`, tabIndex: tab === entry.id ? 0 : -1, className: `${css.pluginTab} ${tab === entry.id ? css.pluginTabActive : ''}`, onClick: () => { setTab(entry.id); }, onKeyDown: event => { moveTab(event, index); }, children: entry.label }, entry.id))) })) : null, _jsx("div", { id: `${tabPrefix}-panel`, role: "tabpanel", tabIndex: 0, "aria-labelledby": mcpOnly ? undefined : `${tabPrefix}-${tab}`, children: !mcpOnly && tab === 'config' ? _jsx(PluginConfigSection, { data: value, onReload: data.reload }) : _jsx(PluginInventory, { data: value, mcpOnly: mcpOnly }) })] }));
}
//# sourceMappingURL=PluginSettingsSection.js.map