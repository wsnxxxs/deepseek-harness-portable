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
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { IconAgentPresetOutline16, IconArchiveOutline20, IconCloseOutline16, IconDatabaseOutline16, IconDataOutline16, IconPersonalizationOutline16, IconPlusOutline16, IconQuestionOutline14, IconSearchOutline16, IconSettingsOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useAsync, useSessionList, useWorkspaces } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { Button, EmptyState, FocusingModal, Spinner, ui } from "../shell/ui.js";
import { useModalFocus } from "../shell/use-modal-focus.js";
import { ThemeSwitch, useAppearance } from "../shell/ThemeSwitch.js";
import { UiModeSwitch } from "../shell/UiModeSwitch.js";
import { aggregateUsage, formatPercent, formatTokenCount, summarizeUsage } from "./usage.js";
import { UsageCards, usageCardStyles } from "./UsageCards.js";
import usageCardClasses from './UsageCards.module.css';
import { SelectMenu } from "./SelectMenu.js";
import { PluginSettingsSection } from "./PluginSettingsSection.js";
import { AgentWorkflowSection } from "./AgentWorkflowSection.js";
import { providerReadiness, providerRemovable, visibleProviderRows, } from "./provider-readiness.js";
import css from './SettingsSurface.module.css';
const RAIL = [
    // Keep this order and wording aligned with the official DSH SettingsRoot.
    { id: 'general', label: 'settings.general' },
    { id: 'models', label: 'settings.modelsNav' },
    { id: 'plugins', label: 'settings.pluginsNav' },
    { id: 'agentPresets', label: 'settings.agentPresets' },
    { id: 'archivedChats', label: 'settings.archivedChats' },
    { id: 'about', label: 'settings.about' },
];
/** A titled block with an explanatory line. */
function Section(props) {
    return (_jsxs("section", { className: css.section, children: [_jsx("h2", { className: css.sectionTitle, children: props.title }), props.body === undefined ? null : _jsx("p", { className: css.sectionBody, children: props.body }), props.children] }));
}
/** One settings row: label, explanation, and a control. */
function Row(props) {
    return (_jsxs("div", { className: css.row, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: props.title }), props.body === undefined ? null : _jsx("div", { className: css.rowBody, children: props.body })] }), props.control] }));
}
/** Read the same public build metadata used by the shared DSH client shell. */
function clientBuildInfo() {
    const version = process.env.DSH_CLIENT_VERSION?.trim() || undefined;
    const commit = process.env.DSH_CLIENT_COMMIT_HASH?.trim() || undefined;
    return {
        version,
        commit,
        dirty: process.env.DSH_CLIENT_GIT_DIRTY === 'true',
    };
}
/** Product identity and build metadata for the DCode settings rail. */
function AboutSection() {
    const t = useT();
    const build = clientBuildInfo();
    return (_jsxs(Section, { title: t('settings.about'), body: t('settings.aboutBody'), children: [_jsxs("div", { className: css.aboutHero, children: [_jsx("div", { className: css.aboutIcon, "aria-hidden": "true", children: _jsx(IconQuestionOutline14, { size: 18 }) }), _jsxs("div", { className: css.aboutCopy, children: [_jsx("h3", { className: css.aboutName, children: t('settings.aboutProduct') }), _jsx("p", { className: css.aboutDescription, children: t('settings.aboutDescription') })] })] }), _jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.aboutVersion'), body: t('settings.aboutVersionBody'), control: _jsx("span", { className: css.rowMono, children: build.version === undefined ? t('settings.aboutVersionDevelopment') : `v${build.version}` }) }), build.commit === undefined ? null : (_jsx(Row, { title: t('settings.aboutCommit'), control: _jsx("span", { className: css.rowMono, children: build.commit }) })), build.commit === undefined ? null : (_jsx(Row, { title: t('settings.aboutBuild'), control: (_jsx("span", { className: `${css.badge} ${build.dirty ? css.aboutStatusDirty : css.aboutStatusClean}`, children: build.dirty ? t('settings.aboutBuildDirty') : t('settings.aboutBuildClean') })) }))] })] }));
}
/** Language, appearance, and the front-end switch. */
function GeneralSection() {
    const runtime = useRuntime();
    const t = useT();
    const uiModeT = runtime.uiModeT;
    const locale = useSyncExternalStore(runtime.locale.subscribe, runtime.locale.getSnapshot, runtime.locale.getSnapshot);
    const theme = runtime.theme;
    // ThemeRuntime emits one revision for both palette and font-size writes.
    // The appearance store carries that notification while remaining optional.
    const themeKey = useCallback(() => {
        const current = theme?.getTheme();
        return current === undefined
            ? ''
            : [
                current.preference ?? '', current.fontSize, current.active.id,
                ...(current.themes ?? []).map(entry => entry.id),
            ].join(':');
    }, [theme]);
    const themeState = useSyncExternalStore(runtime.appearance.subscribe, themeKey, themeKey);
    const { fontSize, setFontSize, canSetFontSize } = useAppearance();
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
                                    ], onChange: (value) => { theme?.setTheme?.(value); } })) })), _jsx(Row, { title: uiModeT('interface'), body: uiModeT('interface.body'), control: _jsx(UiModeSwitch, {}) }), _jsx(Row, { title: t('settings.fontSize'), control: !canSetFontSize
                                ? _jsx("span", { className: css.badge, children: fontSize })
                                : (_jsxs("span", { className: css.stepper, children: [_jsx("button", { type: "button", className: css.stepperButton, "aria-label": `${t('settings.fontSize')} −`, disabled: fontSize <= 11, onClick: () => { setFontSize(Math.max(11, fontSize - 1)); }, children: "\u2212" }), _jsx("span", { className: css.stepperValue, children: fontSize }), _jsx("button", { type: "button", className: css.stepperButton, "aria-label": `${t('settings.fontSize')} +`, disabled: fontSize >= 22, onClick: () => { setFontSize(Math.min(22, fontSize + 1)); }, children: "+" })] })) })] }) })] }));
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
function providerOptionLabel(row) {
    if (row.name.trim().toLowerCase() !== row.id.toLowerCase())
        return row.name;
    const acronyms = new Map([['ai', 'AI'], ['api', 'API'], ['aws', 'AWS'], ['gcp', 'GCP'], ['ibm', 'IBM'], ['openai', 'OpenAI']]);
    return row.id.split('-').map(part => acronyms.get(part) ?? `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ');
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
export async function loadModelSettings(runtime) {
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
        providers: modelProviderRows(registered.value, configurable.value, described.value.namespaces, credentials).map(row => {
            const failure = catalog.value.failures.find(candidate => candidate.id === row.id);
            return {
                ...row,
                ...credentialError === undefined ? {} : { credentialError },
                ...failure === undefined ? {} : { providerError: failure.message },
            };
        }),
        writable: described.value.writable,
        hasDocument: described.value.hasDocument,
        ...credentialError === undefined ? {} : { credentialError },
    };
}
function providerReadinessLabel(readiness, t) {
    switch (readiness.reason) {
        case 'missing-api-key': return t('settings.models.keyMissing');
        case 'not-configured': return t('settings.models.notConfigured');
        case 'credential-configured': return t('settings.models.keyConfigured');
        case 'key-not-required': return t('settings.models.keyNotRequired');
        case 'credential-error': return readiness.detail === undefined
            ? t('settings.models.credentialErrorUnknown')
            : t('settings.models.credentialError', { error: readiness.detail });
        case 'provider-error': return t('settings.models.providerError', { error: readiness.detail ?? t('common.error') });
        case 'configuration-error': return readiness.detail === undefined
            ? t('settings.models.configurationErrorUnknown')
            : t('settings.models.configurationError', { error: readiness.detail });
    }
}
function ModelProviderCard(props) {
    const runtime = useRuntime();
    const t = useT();
    const [open, setOpen] = useState(props.initiallyOpen === true);
    const [baseURL, setBaseURL] = useState(() => stringAt(props.row.profile, ['baseURL']) ?? '');
    const [apiKey, setApiKey] = useState('');
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState();
    const [deleting, setDeleting] = useState(false);
    const profileEditable = props.writable && props.row.namespace !== undefined && props.row.settingsNs !== '';
    const keyEditable = props.row.credential?.writable !== false;
    const editable = profileEditable || keyEditable;
    const removable = profileEditable && providerRemovable(props.row);
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
                props.onClose?.();
                return;
            }
            setOpen(false);
            props.onReload();
            props.onSaved?.();
        }
        catch (cause) {
            setFailure(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (deleting || !removable)
            return;
        if (!window.confirm(t('settings.models.deleteConfirm', { name: props.row.name })))
            return;
        setDeleting(true);
        setFailure(undefined);
        try {
            if (props.row.credential?.configured === true) {
                const credential = await runtime.remote.credentials.unset(props.row.credentialRef);
                if (!credential.ok)
                    throw new Error(credential.error.message);
            }
            const response = await runtime.remote.settings.mutate(props.row.settingsNs, [{ op: 'unset', path: [...props.row.settingsPath] }], undefined);
            if (!response.ok)
                throw new Error(response.error.message);
            props.onReload();
        }
        catch (cause) {
            setFailure(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setDeleting(false);
        }
    };
    const requiresApiKey = props.row.settingsNs === ''
        ? false
        : props.row.profile === undefined
            ? undefined
            : stringAt(props.row.profile, ['apiKeyEnv']) !== undefined;
    const readinessFacts = {
        active: props.row.active,
        configured: props.row.profile !== undefined || props.row.settingsNs === '',
        requiresApiKey,
        credential: props.row.credential,
        ...props.row.credentialError === undefined ? {} : { credentialError: props.row.credentialError },
        ...props.row.providerError === undefined ? {} : { providerError: props.row.providerError },
        ...failure === undefined ? {} : { configurationError: failure },
    };
    const readiness = providerReadiness(readinessFacts);
    const statusLabel = providerReadinessLabel(readiness, t);
    const statusClass = readiness.kind === 'ready'
        ? css.statusDotGood
        : readiness.kind === 'unconfigured'
            ? css.statusDotMissing
            : readiness.kind === 'error'
                ? css.statusDotError
                : css.statusDotNeutral;
    const editorId = `dcode-provider-editor-${props.row.id.replace(/[^a-z0-9_-]/gi, '-')}`;
    const closeEditor = () => {
        setOpen(false);
        props.onClose?.();
    };
    return (_jsxs("div", { className: css.providerCard, children: [_jsxs("div", { className: `${css.providerHead} ${ui.cardHeader}`, children: [_jsx("span", { className: `${css.statusDot} ${statusClass}`, role: "img", "aria-label": statusLabel, title: statusLabel }), _jsx("span", { className: css.providerStatusText, children: statusLabel }), _jsxs("div", { className: css.rowText, children: [_jsxs("div", { className: css.providerIdentity, children: [_jsx("h3", { className: css.rowTitle, children: props.row.name }), props.row.declared === true ? _jsx("span", { className: css.providerTag, children: t('settings.models.customTag') }) : null] }), _jsx("div", { className: css.rowBody, children: props.row.id })] }), _jsxs("div", { className: css.providerActions, children: [editable && !open
                                ? _jsx(Button, { ariaExpanded: false, ariaControls: editorId, onClick: () => {
                                        setOpen(true);
                                        setFailure(undefined);
                                    }, children: t('common.edit') })
                                : editable ? null : _jsx("span", { className: css.badge, children: t('common.readOnly') }), removable
                                ? _jsx("button", { type: "button", className: css.dangerButton, disabled: deleting, onClick: () => { void remove(); }, children: deleting ? t('settings.models.deleting') : t('settings.models.delete') })
                                : null] })] }), open
                ? (_jsxs("div", { className: css.providerEditor, id: editorId, role: "group", "aria-label": props.row.name, onKeyDown: (event) => {
                        if (event.key !== 'Escape')
                            return;
                        event.preventDefault();
                        event.stopPropagation();
                        closeEditor();
                    }, children: [_jsxs("div", { className: css.providerEditorStatus, role: "status", "aria-label": statusLabel, title: statusLabel, children: [_jsx("span", { className: `${css.statusDot} ${statusClass}`, "aria-hidden": "true" }), _jsx("span", { children: statusLabel })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.apiKey') }), _jsx("input", { className: css.fieldInput, type: "password", autoComplete: "off", value: apiKey, placeholder: props.row.credential?.configured === true ? t('settings.models.keyConfiguredHint') : t('settings.models.keyPlaceholder'), disabled: busy || !keyEditable, onChange: event => { setApiKey(event.target.value); } })] }), profileEditable
                            ? (_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.baseURL') }), _jsx("input", { className: css.fieldInput, type: "url", value: baseURL, placeholder: t('settings.models.baseURLPlaceholder'), disabled: busy, onChange: event => { setBaseURL(event.target.value); } })] }))
                            : null, failure === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: failure }), _jsxs("div", { className: css.editorActions, children: [_jsx(Button, { onClick: closeEditor, disabled: busy, children: t('common.cancel') }), _jsx(Button, { primary: true, onClick: () => { void save(); }, disabled: busy, children: busy ? t('common.saving') : t('common.save') })] })] }))
                : null] }));
}
const CUSTOM_PROVIDER_NS = 'llm-pi-ai';
const CUSTOM_PROVIDER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/** Compact creator for an OpenAI/Anthropic-compatible custom endpoint. */
function CustomProviderForm(props) {
    const runtime = useRuntime();
    const t = useT();
    const namespace = props.rows.find(row => row.settingsNs === CUSTOM_PROVIDER_NS)?.namespace;
    const [name, setName] = useState('');
    const [route, setRoute] = useState('');
    const [routeTouched, setRouteTouched] = useState(false);
    const [baseURL, setBaseURL] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [protocol, setProtocol] = useState('openai-completions');
    const [modelText, setModelText] = useState('');
    const [busy, setBusy] = useState(false);
    const [committed, setCommitted] = useState(false);
    const [failure, setFailure] = useState();
    const modelIds = [...new Set(modelText.split(/[\n,]+/).map(value => value.trim()).filter(Boolean))];
    const invalidRoute = route.length > 0 && !CUSTOM_PROVIDER_ID.test(route);
    const routeTaken = props.rows.some(row => row.id === route);
    const disabled = busy || !props.writable || namespace === undefined;
    const create = async () => {
        if (disabled || invalidRoute || routeTaken || route.length === 0 || name.trim().length === 0
            || baseURL.trim().length === 0 || modelIds.length === 0)
            return;
        setBusy(true);
        setFailure(undefined);
        const credentialRef = modelCredentialRef(route, undefined);
        try {
            if (!committed) {
                const profile = {
                    displayName: name.trim(),
                    api: protocol,
                    baseURL: baseURL.trim(),
                    models: modelIds.map(id => ({ id })),
                    ...apiKey.trim().length === 0 ? {} : { apiKeyEnv: credentialRef },
                };
                const response = await runtime.remote.settings.mutate(CUSTOM_PROVIDER_NS, [{ op: 'set', path: ['providers', route], value: profile }], namespace?.revision);
                if (!response.ok)
                    throw new Error(response.error.message);
                setCommitted(true);
            }
            if (apiKey.trim().length > 0) {
                const response = await runtime.remote.credentials.set(credentialRef, apiKey.trim());
                if (!response.ok)
                    throw new Error(response.error.message);
            }
            props.onCreated();
        }
        catch (cause) {
            setFailure(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsxs("div", { className: css.customProviderForm, onKeyDown: (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            event.stopPropagation();
            props.onCancel();
        }, children: [_jsxs("div", { className: css.formGrid, children: [_jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.providerName') }), _jsx("input", { className: css.fieldInput, value: name, disabled: disabled || committed, onChange: (event) => {
                                    const next = event.target.value;
                                    setName(next);
                                    if (!routeTouched)
                                        setRoute(next.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                                } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.providerId') }), _jsx("input", { className: css.fieldInput, value: route, disabled: disabled || committed, onChange: (event) => { setRouteTouched(true); setRoute(event.target.value); } }), invalidRoute ? _jsx("span", { className: css.fieldError, children: t('settings.models.providerIdInvalid') }) : null, routeTaken ? _jsx("span", { className: css.fieldError, children: t('settings.models.providerIdTaken') }) : null] }), _jsxs("label", { className: `${css.field} ${css.formWide}`, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.baseURL') }), _jsx("input", { className: css.fieldInput, type: "url", value: baseURL, disabled: disabled || committed, placeholder: t('settings.models.baseURLPlaceholder'), onChange: event => { setBaseURL(event.target.value); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.protocol') }), _jsxs("select", { className: css.fieldInput, value: protocol, disabled: disabled || committed, onChange: event => { setProtocol(event.target.value); }, children: [_jsx("option", { value: "openai-completions", children: "OpenAI Chat Completions" }), _jsx("option", { value: "openai-responses", children: "OpenAI Responses" }), _jsx("option", { value: "anthropic-messages", children: "Anthropic Messages" })] })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.apiKey') }), _jsx("input", { className: css.fieldInput, type: "password", autoComplete: "off", value: apiKey, disabled: busy || !props.writable, placeholder: t('settings.models.keyPlaceholder'), onChange: event => { setApiKey(event.target.value); } })] }), _jsxs("label", { className: `${css.field} ${css.formWide}`, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.models.modelList') }), _jsx("textarea", { className: css.fieldTextarea, value: modelText, disabled: disabled || committed, placeholder: t('settings.models.modelListPlaceholder'), onChange: event => { setModelText(event.target.value); } }), _jsx("span", { className: css.fieldHint, children: t('settings.models.modelListHint') })] })] }), namespace === undefined ? _jsx("div", { className: css.inlineError, children: t('settings.models.customUnavailable') }) : null, failure === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: failure }), _jsxs("div", { className: css.editorActions, children: [_jsx(Button, { disabled: busy, onClick: props.onCancel, children: t('common.cancel') }), _jsx(Button, { primary: true, disabled: disabled || invalidRoute || routeTaken || route.length === 0 || name.trim().length === 0 || baseURL.trim().length === 0 || modelIds.length === 0, onClick: () => { void create(); }, children: busy ? t('common.saving') : t('settings.models.add') })] })] }));
}
/** Provider routes, catalog, and the editable credential/profile controls. */
function ModelsSection(props) {
    const runtime = useRuntime();
    const t = useT();
    const models = useAsync(async () => await loadModelSettings(runtime), [runtime]);
    const [addingProvider, setAddingProvider] = useState();
    const [addingCustom, setAddingCustom] = useState(false);
    if (models.loading && models.value === undefined)
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    if (models.error !== undefined && models.value === undefined)
        return _jsx(EmptyState, { children: models.error });
    if (models.value === undefined)
        return _jsx(EmptyState, { children: t('common.error') });
    const value = models.value;
    const providers = visibleProviderRows(value.providers);
    const configured = providers.filter(row => row.credential?.configured === true || row.active);
    const addable = providers.filter(row => row.credential?.configured !== true && !row.active && row.settingsNs !== '');
    const draft = addingProvider === undefined
        ? undefined
        : addable.find(row => row.id === addingProvider);
    const focused = props.focusedProvider === undefined
        ? undefined
        : providers.find(row => row.id === props.focusedProvider);
    const visible = focused === undefined
        ? configured
        : [focused, ...configured.filter(row => row.id !== focused.id)];
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: `${css.section} ${css.modelsSection}`, children: [_jsxs("div", { className: css.modelsHeader, children: [_jsxs("div", { children: [_jsx("h2", { className: css.modelsTitle, children: t('settings.models') }), _jsx("p", { className: css.sectionBody, children: t('settings.modelsBody') })] }), value.hasDocument
                                ? _jsx(Button, { onClick: () => { void runtime.remote.settings.openSettingsDocument(); }, children: t('settings.openOfficialSettings') })
                                : null] }), value.credentialError === undefined ? null : _jsx("div", { className: css.notice, children: `${t('settings.models.credentialWarning')}: ${value.credentialError}` }), _jsxs("div", { className: css.providerList, children: [visible.map(row => (_jsx(ModelProviderCard, { row: row, writable: value.writable, initiallyOpen: row.id === props.focusedProvider, onReload: models.reload, onSaved: row.id === props.focusedProvider ? props.onFocusedProviderSaved : undefined }, row.id))), visible.length === 0 ? _jsx("div", { className: css.modelsEmpty, children: t('settings.models.empty') }) : null] }), draft === undefined ? null : (_jsx(ModelProviderCard, { row: draft, writable: value.writable, initiallyOpen: true, onReload: models.reload, onClose: () => { setAddingProvider(undefined); } }, `add-${draft.id}`)), addingCustom
                        ? _jsx(CustomProviderForm, { rows: value.providers, writable: value.writable, onCancel: () => { setAddingCustom(false); }, onCreated: () => { setAddingCustom(false); models.reload(); } })
                        : null, draft === undefined && !addingCustom
                        ? (_jsxs("div", { className: css.addActions, children: [_jsx("div", { className: css.addSelect, children: _jsx(SelectMenu, { value: "", ariaLabel: t('settings.models.addProvider'), placeholder: _jsxs(_Fragment, { children: [_jsx(IconPlusOutline16, {}), t('settings.models.addProvider')] }), disabled: !value.writable || addable.length === 0, options: addable.map(row => ({ id: row.id, label: providerOptionLabel(row), detail: row.id })), onChange: (provider) => { setAddingProvider(provider); setAddingCustom(false); } }) }), _jsxs("button", { type: "button", className: css.addButton, disabled: !value.writable, onClick: () => { setAddingCustom(true); setAddingProvider(undefined); }, children: [_jsx(IconPlusOutline16, {}), t('settings.models.addCustomProvider')] })] }))
                        : null, value.catalog.failures.length === 0 ? null : (_jsxs("details", { className: css.modelFailures, children: [_jsxs("summary", { children: [t('settings.models.failures'), " (", value.catalog.failures.length, ")"] }), value.catalog.failures.map(failure => _jsxs("p", { children: [failure.name, ": ", failure.message] }, failure.id))] }))] }), _jsx(UsageSection, {})] }));
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
    return (_jsxs(Section, { title: t('settings.skills'), body: t('settings.count', { count: rows.length }), children: [_jsx("input", { className: css.search, value: query, placeholder: t('common.search'), "aria-label": t('common.search'), onChange: event => { setQuery(event.target.value); } }), rows.length === 0
                ? _jsx(EmptyState, { children: t('settings.skillsEmpty') })
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
            ? _jsx(EmptyState, { children: t('settings.commandsEmpty') })
            : (_jsx("div", { className: css.card, children: rows.map(command => (_jsx(Row, { title: `/${command.name}`, body: command.description }, command.name))) })) }));
}
/** Manage conversations hidden by the registry-global archive set. */
function ArchivedChatsSection({ navigation }) {
    const runtime = useRuntime();
    const t = useT();
    const sessions = useSessionList();
    const workspaces = useWorkspaces();
    const [busyId, setBusyId] = useState();
    const [deleteTarget, setDeleteTarget] = useState();
    const [error, setError] = useState();
    const rows = useMemo(() => workspaces.archivedSessionIds
        .map(id => sessions.byId[id] ?? {
        id,
        displayTitle: id,
        running: false,
        blank: false,
        updatedAt: 0,
    })
        .sort((left, right) => right.updatedAt - left.updatedAt), [sessions.byId, workspaces.archivedSessionIds]);
    const restore = useCallback((id) => {
        if (busyId !== undefined)
            return;
        setBusyId(id);
        setError(undefined);
        void runtime.workspaces.unarchiveSession(id)
            .then(() => {
            if (runtime.sessions.list.getSnapshot().byId[id] !== undefined) {
                runtime.sessions.open(id);
                navigation.show('session');
            }
        })
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setBusyId(undefined); });
    }, [busyId, navigation, runtime]);
    const closeDelete = useCallback(() => {
        if (busyId !== undefined)
            return;
        setDeleteTarget(undefined);
        setError(undefined);
    }, [busyId]);
    const confirmDelete = useCallback(() => {
        const target = deleteTarget;
        if (target === undefined || busyId !== undefined)
            return;
        setBusyId(target.id);
        setError(undefined);
        void runtime.sessions.delete(target.id)
            .then(() => {
            if (runtime.sessions.list.getSnapshot().current === target.id)
                runtime.sessions.clear();
            setDeleteTarget(undefined);
        })
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setBusyId(undefined); });
    }, [busyId, deleteTarget, runtime]);
    return (_jsxs(Section, { title: t('settings.archivedChats'), body: t('settings.archivedChatsBody'), children: [workspaces.phase !== 'ready' || sessions.phase !== 'ready'
                ? _jsx(EmptyState, { children: _jsx(Spinner, {}) })
                : rows.length === 0
                    ? _jsx(EmptyState, { children: t('settings.archivedChatsEmpty') })
                    : (_jsx("div", { className: css.card, children: rows.map(session => (_jsx(Row, { title: session.displayTitle, body: session.cwd ?? t('settings.archivedChats'), control: (_jsxs("div", { className: css.presetActions, children: [_jsx(Button, { disabled: busyId !== undefined, onClick: () => { restore(session.id); }, children: busyId === session.id ? t('common.saving') : t('settings.archivedChatsRestore') }), _jsx("button", { type: "button", className: css.dangerButton, disabled: busyId !== undefined, onClick: () => { setError(undefined); setDeleteTarget(session); }, children: t('settings.archivedChatsDelete') })] })) }, session.id))) })), error === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: error }), _jsx(FocusingModal, { open: deleteTarget !== undefined, onClose: closeDelete, title: t('settings.archivedChatsDeleteTitle'), closeLabel: t('common.close'), description: t('settings.archivedChatsDeleteBody'), footer: (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: closeDelete, disabled: busyId !== undefined, children: t('common.cancel') }), _jsx("button", { type: "button", className: css.dangerButton, disabled: busyId !== undefined, onClick: confirmDelete, children: busyId === undefined ? t('settings.archivedChatsDelete') : t('common.saving') })] })), children: _jsx("div", { className: css.rowTitle, children: deleteTarget?.displayTitle }) })] }));
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
    const dialogRef = useRef(null);
    useModalFocus(dialog !== undefined, dialogRef, { onClose: () => { closeDialog(); } });
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
                ? _jsx(EmptyState, { children: t('settings.presetsEmpty') })
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
                : (_jsx("div", { className: css.dialogBackdrop, role: "presentation", onPointerDown: (event) => { if (event.target === event.currentTarget)
                        closeDialog(); }, children: _jsx("div", { ref: dialogRef, className: css.dialog, role: "dialog", "aria-modal": "true", "aria-labelledby": "dcode-settings-dialog-title", tabIndex: -1, children: dialog.kind === 'copy'
                            ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dialogHeader, children: [_jsx("div", { id: "dcode-settings-dialog-title", className: css.dialogTitle, children: t('settings.agentPresets.copyTitle') }), _jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.close') })] }), _jsx("p", { className: css.dialogBody, children: t('settings.agentPresets.copyBody') }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.agentPresets.id') }), _jsx("input", { className: css.fieldInput, autoFocus: true, value: copyId, placeholder: "my-agent", disabled: dialogBusy, onChange: event => { setCopyId(event.target.value); } })] }), _jsxs("label", { className: css.field, children: [_jsx("span", { className: css.fieldLabel, children: t('settings.agentPresets.name') }), _jsx("input", { className: css.fieldInput, value: copyName, placeholder: t('settings.agentPresets.namePlaceholder'), disabled: dialogBusy, onChange: event => { setCopyName(event.target.value); } })] }), dialogError === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: dialogError }), _jsxs("div", { className: css.dialogActions, children: [_jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.cancel') }), _jsx(Button, { primary: true, onClick: confirmCopy, disabled: dialogBusy, children: dialogBusy ? t('common.saving') : t('settings.agentPresets.copy') })] })] }))
                            : dialog.kind === 'view'
                                ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dialogHeader, children: [_jsx("div", { id: "dcode-settings-dialog-title", className: css.dialogTitle, children: t('settings.agentPresets.view') }), _jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.close') })] }), dialogBusy ? _jsx(EmptyState, { children: _jsx(Spinner, {}) }) : viewContent === undefined ? _jsx("div", { className: css.inlineError, role: "alert", children: dialogError ?? t('common.error') }) : _jsx("pre", { className: css.viewerCode, tabIndex: 0, role: "region", "aria-label": t('settings.agentPresets.view'), children: viewContent })] }))
                                : (_jsxs(_Fragment, { children: [_jsxs("div", { className: css.dialogHeader, children: [_jsx("div", { id: "dcode-settings-dialog-title", className: css.dialogTitle, children: t('settings.agentPresets.deleteTitle') }), _jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.close') })] }), _jsx("p", { className: css.dialogBody, children: t('settings.agentPresets.deleteBody') }), dialogError === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: dialogError }), _jsxs("div", { className: css.dialogActions, children: [_jsx(Button, { onClick: closeDialog, disabled: dialogBusy, children: t('common.cancel') }), _jsx(Button, { primary: true, onClick: confirmDelete, disabled: dialogBusy, children: dialogBusy ? t('common.saving') : t('settings.agentPresets.delete') })] })] })) }) })), Object.entries(revealedPaths).map(([id, path]) => (_jsxs("div", { className: css.revealedPath, children: [_jsx("span", { children: `${id}: ` }), _jsx("code", { children: path })] }, id)))] }));
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
    return (_jsxs(Section, { title: title, body: body, children: [described.loading
                ? _jsx(EmptyState, { children: _jsx(Spinner, {}) })
                : described.error !== undefined
                    ? _jsx("div", { role: "alert", children: _jsx(EmptyState, { children: described.error }) })
                    : described.value?.ok === false
                        ? _jsx("div", { role: "alert", children: _jsx(EmptyState, { children: described.value.error.message }) })
                        : namespaces.length === 0
                            ? _jsx(EmptyState, { children: t('settings.namespaceEmpty') })
                            : (_jsx("div", { className: css.card, children: namespaces.map(view => (_jsx(Row, { title: view.ns, body: `${t('settings.namespace')} · ${view.applies}`, control: _jsx("span", { className: css.rowMono, children: JSON.stringify(view.value) }) }, view.ns))) })), described.value?.ok === true && described.value.value.hasDocument
                ? _jsx(Button, { onClick: openDocument, children: t('settings.openOfficialSettings') })
                : null] }));
}
/** Workbench face of the shared statistics card; see UsageCards.module.css. */
const usageCardCss = usageCardStyles(usageCardClasses);
function UsageMetric(props) {
    return (_jsxs("div", { className: css.usageMetric, children: [_jsx("span", { className: css.usageMetricTitle, children: props.title }), _jsx("strong", { className: css.usageMetricValue, children: props.value })] }));
}
function UsageSection() {
    const t = useT();
    const list = useSessionList();
    const totals = useMemo(() => summarizeUsage(aggregateUsage(list)), [list]);
    if (list.phase === 'pending') {
        return (_jsx(Section, { title: t('settings.usage'), body: t('settings.usageBody'), children: _jsx("div", { className: css.card, children: _jsx("div", { className: css.usageStatus, role: "status", children: t('settings.usageLoading') }) }) }));
    }
    return (_jsxs(Section, { title: t('settings.usage'), body: t('settings.usageBody'), children: [_jsxs("div", { className: css.usageTotal, children: [_jsx("span", { className: css.usageTotalTitle, children: t('settings.usageTotal') }), _jsx("strong", { className: css.usageTotalValue, children: formatTokenCount(totals.totalTokens) }), _jsx("span", { className: css.usageTotalScope, children: t('settings.usageScope', {
                            sessions: formatTokenCount(totals.sessions),
                            usageSessions: formatTokenCount(totals.usageSessions),
                        }) })] }), _jsx(UsageCards, { list: list, t: t, styles: usageCardCss }), _jsxs("div", { className: css.usageGrid, children: [_jsx(UsageMetric, { title: t('settings.usageInput'), value: formatTokenCount(totals.promptTokens) }), _jsx(UsageMetric, { title: t('settings.usageOutput'), value: formatTokenCount(totals.outputTokens) }), _jsx(UsageMetric, { title: t('settings.usageCacheRead'), value: formatTokenCount(totals.cacheReadTokens) }), _jsx(UsageMetric, { title: t('settings.usageCacheWrite'), value: formatTokenCount(totals.cacheWriteTokens) })] }), _jsxs("div", { className: css.card, children: [_jsx(Row, { title: t('settings.usageSessions'), control: _jsx("span", { className: css.rowMono, children: formatTokenCount(totals.sessions) }) }), _jsx(Row, { title: t('settings.usageTurns'), control: _jsx("span", { className: css.rowMono, children: totals.hasStats ? formatTokenCount(totals.turns) : '—' }) }), _jsx(Row, { title: t('settings.usageSteps'), control: _jsx("span", { className: css.rowMono, children: totals.hasStats ? formatTokenCount(totals.steps) : '—' }) }), _jsx(Row, { title: t('settings.usageCacheHit'), control: _jsx("span", { className: css.rowMono, children: totals.cacheHit === null ? '—' : formatPercent(totals.cacheHit) }) })] }), !totals.hasUsage ? _jsx("div", { className: css.usageEmpty, children: t('settings.usageEmpty') }) : null] }));
}
/** Map direct actions to the official-first navigation groups shown by the modal. */
function settingsNavSection(section) {
    switch (section) {
        case 'models': return 'models';
        case 'plugins':
        case 'mcp': return 'plugins';
        case 'agentWorkflow':
        case 'agentPresets':
        case 'memory':
            return 'agentPresets';
        case 'data':
        case 'skills':
        case 'commands':
        case 'usage': return 'data';
        case 'archivedChats': return 'archivedChats';
        case 'about': return 'about';
        case 'general':
        case 'appearance': return 'general';
    }
}
/** The title shown in the modal content header for a selected page. */
function settingsTitleKey(section) {
    switch (section) {
        case 'models': return 'settings.modelsNav';
        case 'plugins':
        case 'mcp': return 'settings.pluginsNav';
        case 'agentWorkflow':
        case 'agentPresets':
        case 'memory':
            return 'settings.agentPresets';
        case 'data':
        case 'skills':
        case 'commands':
        case 'usage': return 'settings.dataAndAbout';
        case 'archivedChats': return 'settings.archivedChats';
        case 'about': return 'settings.about';
        case 'general':
        case 'appearance': return 'settings.general';
    }
}
/** Skills, commands, and usage records grouped under one DCode-only data page. */
function DataSection({ sessionId }) {
    return (_jsxs(_Fragment, { children: [_jsx(SkillsSection, { sessionId: sessionId }), _jsx(CommandsSection, { sessionId: sessionId }), _jsx(UsageSection, {})] }));
}
/** The settings rail and the selected section. */
export function SettingsSurface({ navigation, sessionId }) {
    const t = useT();
    const state = useNavigation(navigation);
    const panelRef = useRef(null);
    const closeRef = useRef(null);
    const [query, setQuery] = useState('');
    useEffect(() => () => { navigation.patch({ settingsProvider: undefined }); }, [navigation]);
    const close = useCallback(() => { navigation.show('session'); }, [navigation]);
    useModalFocus(true, panelRef, { initialFocusRef: closeRef, onClose: close });
    const icons = {
        general: _jsx(IconSettingsOutline16, {}),
        models: _jsx(IconDataOutline16, {}),
        plugins: _jsx(IconPersonalizationOutline16, {}),
        agentPresets: _jsx(IconAgentPresetOutline16, {}),
        data: _jsx(IconDatabaseOutline16, {}),
        archivedChats: _jsx(IconArchiveOutline20, { size: 16 }),
        about: _jsx(IconQuestionOutline14, {}),
    };
    const activeNav = settingsNavSection(state.settingsSection);
    const visibleRail = useMemo(() => {
        const needle = query.trim().toLocaleLowerCase();
        if (needle === '')
            return RAIL;
        return RAIL.filter(item => t(item.label).toLocaleLowerCase().includes(needle));
    }, [query, t]);
    // `settings.section` is declared by the official settings shell, and a slot
    // has exactly one declarer, so the workbench cannot own a renderSlot for it.
    // Every page below is therefore DCode's own implementation.
    const body = () => {
        switch (state.settingsSection) {
            case 'general':
            case 'appearance': return _jsx(GeneralSection, {});
            case 'models': return (_jsx(ModelsSection, { focusedProvider: state.settingsProvider, onFocusedProviderSaved: state.settingsProvider === undefined ? undefined : () => { navigation.show('session'); } }));
            case 'skills': return _jsx(SkillsSection, { sessionId: sessionId });
            case 'commands': return _jsx(CommandsSection, { sessionId: sessionId });
            case 'plugins': return _jsx(PluginSettingsSection, {});
            case 'mcp': return _jsx(PluginSettingsSection, { mcpOnly: true });
            case 'data': return _jsx(DataSection, { sessionId: sessionId });
            case 'agentPresets': return (_jsxs(_Fragment, { children: [_jsx(AgentWorkflowSection, { sessionId: sessionId }), _jsx(AgentPresetsSection, {})] }));
            case 'agentWorkflow': return _jsx(AgentWorkflowSection, { sessionId: sessionId });
            case 'usage': return _jsx(UsageSection, {});
            case 'archivedChats': return _jsx(ArchivedChatsSection, { navigation: navigation });
            case 'about': return _jsx(AboutSection, {});
            case 'memory':
                return _jsx(NamespaceSection, { title: t('settings.memory'), body: t('settings.memoryBody'), match: /memor|context|compaction/i });
            default:
                return _jsx(GeneralSection, {});
        }
    };
    return (_jsxs("div", { className: css.overlay, role: "presentation", children: [_jsx("div", { className: css.mask, "aria-hidden": "true", onClick: close }), _jsxs("div", { ref: panelRef, className: css.panel, role: "dialog", "aria-modal": "true", "aria-labelledby": "dcode-settings-dialog-title", tabIndex: -1, children: [_jsxs("nav", { className: css.rail, "aria-label": t('settings.title'), children: [_jsx("h1", { className: css.railTitle, id: "dcode-settings-dialog-title", children: t('settings.title') }), _jsxs("label", { className: css.searchShell, children: [_jsx(IconSearchOutline16, { className: css.searchIcon }), _jsx("input", { className: css.search, type: "search", value: query, placeholder: t('settings.search'), "aria-label": t('settings.search'), onChange: event => { setQuery(event.target.value); } })] }), _jsx("div", { className: css.navList, children: visibleRail.map(item => (_jsxs("button", { type: "button", className: `${css.item} ${activeNav === item.id ? css.itemActive : ''}`, "aria-current": activeNav === item.id ? 'page' : undefined, onClick: () => { setQuery(''); navigation.openSettings(item.id); }, children: [icons[item.id], t(item.label)] }, item.id))) }), visibleRail.length === 0 ? _jsx("p", { className: css.searchEmpty, children: t('settings.searchEmpty') }) : null] }), _jsxs("main", { className: css.content, children: [_jsxs("header", { className: css.header, children: [_jsx("h2", { className: css.title, children: t(settingsTitleKey(state.settingsSection)) }), _jsx("button", { ref: closeRef, type: "button", className: css.close, onClick: close, "aria-label": t('common.close'), children: _jsx(IconCloseOutline16, { size: 14 }) })] }), _jsx("div", { className: css.body, children: _jsx("div", { className: css.inner, children: body() }) })] })] })] }));
}
//# sourceMappingURL=SettingsSurface.js.map