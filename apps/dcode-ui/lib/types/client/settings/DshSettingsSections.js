import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * DCode adapters for the DSH-owned settings domains.
 *
 * The business controllers stay the DSH source of truth. DCode supplies the
 * page shell, token scope, and the small amount of React wiring needed to
 * mount those controllers in its own workbench settings surface.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { ModelsSection as DshModelsSection } from '@deepseek-ai/dsh-client-ui-settings-models/src/client/ModelsSection.tsx';
import { createSettingsSchemaOperations } from '@deepseek-ai/dsh-client-ui-settings-models/src/client/schema-operations.ts';
import { ModelsSettingsStore, } from '@deepseek-ai/dsh-client-ui-settings-models/src/client/store.ts';
import { en as modelsEn, zh as modelsZh, } from '@deepseek-ai/dsh-client-ui-settings-models/src/client/locales.ts';
import { AgentPresetSection } from '@deepseek-ai/dsh-client-ui-agent-preset/src/client/AgentPresetSection.tsx';
import { AgentPresetSectionController, } from '@deepseek-ai/dsh-client-ui-agent-preset/src/client/section-store.ts';
import { en as agentPresetEn, zh as agentPresetZh, } from '@deepseek-ai/dsh-client-ui-agent-preset/src/client/locales.ts';
import { useAsync } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { EmptyState, Spinner } from "../shell/ui.js";
import css from './SettingsSurface.module.css';
const EMPTY_MODEL_STATE = {
    status: 'idle',
    error: null,
    credentialError: null,
    writable: false,
    rows: [],
    namespaces: new Map(),
};
const EMPTY_AGENT_PRESET_STATE = {
    status: 'idle',
    error: null,
    authorable: false,
    hasDocument: false,
    rows: [],
    copy: null,
    view: null,
    pendingDelete: null,
    deleting: false,
    revealedPaths: {},
};
const EMPTY_SUBSCRIBE = () => () => { };
const emptyModelSnapshot = () => EMPTY_MODEL_STATE;
const emptyAgentPresetSnapshot = () => EMPTY_AGENT_PRESET_STATE;
function useRuntimeLocaleId() {
    const runtime = useRuntime();
    return useSyncExternalStore(runtime.locale.subscribe, () => runtime.locale.getSnapshot().active, () => runtime.locale.getSnapshot().active);
}
function dictionaryT(dictionary) {
    return key => dictionary[key] ?? key;
}
/** The complete DSH provider editor mounted inside DCode's model page. */
export function ModelsSection() {
    const runtime = useRuntime();
    const localeId = useRuntimeLocaleId();
    const adapter = useMemo(() => {
        const schemaService = runtime.settings.schema;
        const describe = runtime.settings.describe;
        if (schemaService === undefined || describe === undefined)
            return undefined;
        const schema = createSettingsSchemaOperations(schemaService);
        const api = {
            credentials: runtime.remote.credentials,
            llm: runtime.remote.llm,
            settings: runtime.remote.settings,
        };
        const controller = new ModelsSettingsStore(api, schema, describe);
        return { api, controller, schema };
    }, [runtime]);
    const store = adapter?.controller.store;
    const state = useSyncExternalStore(store?.subscribe ?? EMPTY_SUBSCRIBE, store?.getSnapshot ?? emptyModelSnapshot, store?.getSnapshot ?? emptyModelSnapshot);
    useEffect(() => {
        if (adapter === undefined)
            return undefined;
        void adapter.controller.load();
        const refresh = () => { void adapter.controller.load(); };
        const disposers = [
            runtime.remote.$on('settings/document-updated', refresh),
            runtime.remote.$on('credentials/reference-updated', refresh),
            runtime.remote.$on('llm/adapters-updated', refresh),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, [adapter, runtime.remote]);
    if (adapter === undefined)
        return _jsx(CatalogModelsSection, {});
    if (state.status === 'idle' || state.status === 'loading') {
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    }
    const dictionary = localeId.toLowerCase().startsWith('zh') ? modelsZh : modelsEn;
    const t = dictionaryT(dictionary);
    // The parent subscribes to the controller so the official business view can
    // remain a pure renderer. This also keeps its state update inside DCode's
    // existing settings surface rather than creating a second page store.
    const useSnapshot = (selector) => selector(state);
    return (_jsx("div", { className: css.officialSection, children: _jsx(DshModelsSection, { controller: adapter.controller, useSnapshot: useSnapshot, api: adapter.api, schema: adapter.schema, t: t, renderSlot: () => null }) }));
}
/** The trimmed-assembly fallback retained for deployments without settings. */
function CatalogModelsSection() {
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
    return (_jsxs("section", { className: css.section, children: [_jsx("span", { className: css.sectionTitle, children: t('settings.models') }), _jsxs("div", { className: css.card, children: [_jsxs("div", { className: css.row, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: t('settings.models.default') }), _jsx("div", { className: css.rowBody, children: defaultGroup?.name ?? providerName(value.default.provider) })] }), _jsx("span", { children: defaultModel?.name ?? t('common.none') })] }), _jsxs("div", { className: css.row, children: [_jsx("div", { className: css.rowText, children: _jsx("div", { className: css.rowTitle, children: t('settings.models.routable') }) }), _jsx("span", { className: css.rowMono, children: value.routableProviders.map(providerName).join(', ') || t('common.none') })] })] }), value.groups.map(group => (_jsxs("div", { className: css.card, children: [_jsxs("div", { className: css.row, children: [_jsx("div", { className: css.rowText, children: _jsx("div", { className: css.rowTitle, children: group.name }) }), _jsx("span", { className: css.badge, children: group.models.length })] }), group.models.map(model => _jsx("div", { className: css.row, children: _jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: model.name }), _jsx("div", { className: css.rowBody, children: model.description })] }) }, model.id))] }, group.id)))] }));
}
/** The complete DSH Agent preset management page inside DCode settings. */
export function AgentPresetsSection({ navigation }) {
    const runtime = useRuntime();
    const localeId = useRuntimeLocaleId();
    const controller = useMemo(() => new AgentPresetSectionController(runtime.remote), [runtime]);
    const state = useSyncExternalStore(controller.store.subscribe, controller.store.getSnapshot, controller.store.getSnapshot);
    const load = useCallback(() => controller.load(), [controller]);
    useEffect(() => {
        void controller.load();
        const refresh = (namespace) => {
            if (namespace === 'agent-presets')
                void controller.load();
        };
        const disposers = [
            runtime.remote.$on('settings/document-updated', refresh),
        ];
        return () => { for (const dispose of disposers)
            dispose(); };
    }, [controller, runtime.remote]);
    if (state.status === 'idle')
        return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
    const dictionary = localeId.toLowerCase().startsWith('zh') ? agentPresetZh : agentPresetEn;
    const t = dictionaryT(dictionary);
    const useAgentPresetSection = (selector) => selector(state);
    const useSessions = (selector) => selector(runtime.sessions.list.getSnapshot());
    const useSessionPendingInteraction = (selector) => selector(runtime.pendingInteractions?.getSnapshot() ?? new Map());
    const useWorkspaces = (selector) => selector(runtime.workspaces.list.getSnapshot());
    return (_jsx("div", { className: css.officialSection, children: _jsx(AgentPresetSection, { useAgentPresetSection: useAgentPresetSection, load: load, view: id => controller.view(id), closeView: () => { controller.closeView(); }, beginCopy: id => { controller.beginCopy(id); }, cancelCopy: () => { controller.cancelCopy(); }, setCopyId: id => { controller.setCopyId(id); }, setCopyName: name => { controller.setCopyName(name); }, confirmCopy: () => controller.confirmCopy(), openLocation: id => controller.openLocation(id), confirmDelete: id => { controller.confirmDelete(id); }, remove: () => controller.remove(), makeDefault: id => controller.makeDefault(id), close: () => { navigation.show('session'); }, useSessions: useSessions, useSessionPendingInteraction: useSessionPendingInteraction, useWorkspaces: useWorkspaces, t: t }) }));
}
//# sourceMappingURL=DshSettingsSections.js.map