import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Unified Agent and workflow settings for the DCode workbench. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAsync, useObservable, useProjectionValue, useSessionList, useSessionSnapshot } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { Button, EmptyState, Spinner } from "../shell/ui.js";
import { SelectMenu } from "./SelectMenu.js";
import css from './SettingsSurface.module.css';
const BUILTIN_MODE_IDS = ['minimal', 'standard', 'ptc', 'crew'];
const MEMORY_ENABLED_KEY = 'dcode.memory.enabled';
function objectValue(source) {
    return typeof source === 'object' && source !== null && !Array.isArray(source)
        ? source
        : {};
}
function valueOf(namespace, key) {
    return objectValue(namespace?.value)[key];
}
function numberOf(namespace, key, fallback) {
    const value = valueOf(namespace, key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
function booleanOf(namespace, key, fallback) {
    const value = valueOf(namespace, key);
    return typeof value === 'boolean' ? value : fallback;
}
function namespaceOf(namespaces, name) {
    return namespaces.find(namespace => namespace.ns === name);
}
function Section(props) {
    return (_jsxs("section", { className: css.section, children: [_jsx("h2", { className: css.sectionTitle, children: props.title }), props.body === undefined ? null : _jsx("p", { className: css.sectionBody, children: props.body }), props.children] }));
}
function SettingRow(props) {
    return (_jsxs("div", { className: css.row, children: [_jsxs("div", { className: css.rowText, children: [_jsx("div", { className: css.rowTitle, children: props.title }), props.body === undefined ? null : _jsx("div", { className: css.rowBody, children: props.body })] }), props.control] }));
}
function Toggle(props) {
    return (_jsx("button", { type: "button", className: `${css.switch} ${props.checked ? css.switchOn : ''}`, "aria-label": props.label, "aria-pressed": props.checked, disabled: props.disabled, onClick: () => { props.onChange(!props.checked); }, children: _jsx("span", { className: css.switchThumb }) }));
}
function modeBody(id, t) {
    switch (id) {
        case 'minimal': return t('settings.mode.minimalBody');
        case 'standard': return t('settings.mode.standardBody');
        case 'ptc': return t('settings.mode.ptcBody');
        case 'crew': return t('settings.mode.crewBody');
        default: return t('settings.mode.customBody');
    }
}
function modeName(id, fallback, t) {
    switch (id) {
        case 'minimal': return t('composer.mode.minimal');
        case 'standard': return t('composer.mode.standard');
        case 'ptc': return t('composer.mode.ptc');
        case 'crew': return t('composer.mode.crew');
        default: return fallback;
    }
}
async function updateNamespace(runtime, namespace, patch, unavailableMessage) {
    if (namespace === undefined)
        throw new Error(unavailableMessage);
    const result = await runtime.remote.settings.update(namespace.ns, patch, namespace.revision);
    if (!result.ok)
        throw new Error(result.error.message);
}
function memoryEnabledFromStorage() {
    if (typeof window === 'undefined')
        return true;
    try {
        const stored = window.localStorage.getItem(MEMORY_ENABLED_KEY);
        return stored === null ? true : stored === 'true';
    }
    catch {
        return true;
    }
}
function MemorySection({ enabled, onEnabledChange, sessionId, }) {
    const runtime = useRuntime();
    const t = useT();
    const sessionList = useSessionList();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [memoryState, setMemoryState] = useState();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState();
    const abortRef = useRef();
    const currentCwd = sessionId === undefined ? undefined : sessionList.byId[sessionId]?.cwd;
    useEffect(() => () => { abortRef.current?.abort(); }, []);
    useEffect(() => {
        let active = true;
        void runtime.memory.state(currentCwd).then(response => {
            if (!active || !response.ok)
                return;
            setMemoryState(response.value);
            onEnabledChange(response.value.enabled);
        });
        return () => { active = false; };
    }, [currentCwd, onEnabledChange, runtime.memory]);
    const search = useCallback(async () => {
        const text = query.trim();
        if (!enabled || text === '' || busy)
            return;
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setBusy(true);
        setError(undefined);
        try {
            const response = runtime.memory.available
                ? await runtime.memory.search(text, currentCwd)
                : undefined;
            if (controller.signal.aborted)
                return;
            if (response !== undefined) {
                if (!response.ok)
                    throw new Error(response.error.message);
                setMemoryState(response.value.state);
                setResults(response.value.items.map(item => ({
                    sessionId: item.sourceSessionIds[0] ?? item.id,
                    snippet: item.snippet,
                    recordId: item.id,
                })));
            }
            else {
                const history = await runtime.sessions.search(text, controller.signal);
                if (!history.ok)
                    throw new Error(history.error.message);
                setResults(history.value.items.map(item => ({ sessionId: item.sessionId, snippet: item.snippet })));
            }
        }
        catch (cause) {
            if (!controller.signal.aborted) {
                setError(cause instanceof Error ? cause.message : String(cause));
            }
        }
        finally {
            if (abortRef.current === controller)
                setBusy(false);
        }
    }, [busy, currentCwd, enabled, query, runtime]);
    const refresh = useCallback(() => {
        if (!enabled || busy)
            return;
        setBusy(true);
        setError(undefined);
        void (async () => {
            if (runtime.memory.available) {
                const response = await runtime.memory.run(currentCwd);
                if (!response.ok)
                    throw new Error(response.error.message);
                setMemoryState(response.value);
                setResults([]);
            }
            else {
                await runtime.sessions.refresh();
            }
        })().catch((cause) => {
            setError(cause instanceof Error ? cause.message : String(cause));
        }).finally(() => { setBusy(false); });
    }, [busy, currentCwd, enabled, runtime]);
    const changeEnabled = useCallback((value) => {
        onEnabledChange(value);
        if (!runtime.memory.available)
            return;
        setError(undefined);
        void runtime.memory.setEnabled(value).then(response => {
            if (!response.ok)
                throw new Error(response.error.message);
            setMemoryState(response.value);
        }).catch((cause) => {
            onEnabledChange(!value);
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    }, [onEnabledChange, runtime.memory]);
    const reset = useCallback(() => {
        abortRef.current?.abort();
        setError(undefined);
        if (!runtime.memory.available) {
            setQuery('');
            setResults([]);
            return;
        }
        setBusy(true);
        void runtime.memory.reset().then(response => {
            if (!response.ok)
                throw new Error(response.error.message);
            setMemoryState(response.value);
            setQuery('');
            setResults([]);
        }).catch((cause) => {
            setError(cause instanceof Error ? cause.message : String(cause));
        }).finally(() => { setBusy(false); });
    }, [runtime.memory]);
    const resultTitle = useCallback((result) => {
        const summary = sessionList.byId[result.sessionId];
        return summary?.displayTitle ?? result.sessionId;
    }, [sessionList.byId]);
    const resultCount = memoryState === undefined ? results.length : memoryState.globalCount + memoryState.projectCount;
    const lastRun = memoryState?.lastRunAt === undefined ? '—' : new Date(memoryState.lastRunAt).toLocaleString();
    const method = memoryState?.lastExtractionMethod === 'heuristic'
        ? t('settings.memoryMethodHeuristic')
        : t('settings.memoryMethodHistory');
    return (_jsxs(Section, { title: t('settings.memory'), body: t('settings.memoryBody'), children: [_jsx("div", { className: css.card, children: _jsx(SettingRow, { title: t('settings.memoryToggle'), body: t('settings.memoryToggleBody'), control: _jsx(Toggle, { checked: enabled, disabled: busy, label: t('settings.memoryToggle'), onChange: changeEnabled }) }) }), _jsxs("div", { className: css.memoryCard, children: [_jsx("div", { className: css.memoryStatus, children: memoryState?.phase === 'extracting' ? t('settings.memoryExtracting') : enabled ? t('settings.memoryConnected') : t('settings.memoryDisabled') }), _jsxs("div", { className: css.memoryToolbar, children: [_jsx("input", { className: css.search, value: query, placeholder: t('settings.memorySearchPlaceholder'), "aria-label": t('settings.memorySearchPlaceholder'), disabled: !enabled || busy, onChange: event => { setQuery(event.target.value); }, onKeyDown: event => { if (event.key === 'Enter')
                                    void search(); } }), _jsx(Button, { onClick: () => { void search(); }, disabled: !enabled || busy || query.trim() === '', children: busy ? t('settings.memorySearching') : t('settings.memorySearch') }), _jsx(Button, { onClick: refresh, disabled: !enabled || busy, children: t('settings.memoryRunNow') })] }), memoryState?.phase === 'extracting' && memoryState.extractingTotal !== undefined
                        ? _jsx("div", { className: css.memoryProgress, children: t('settings.memoryProgress', { processed: memoryState.extractingProcessed ?? 0, total: memoryState.extractingTotal }) })
                        : null, _jsxs("div", { className: css.memoryStats, children: [_jsxs("div", { className: css.memoryStat, children: [_jsx("span", { children: t('settings.memoryRecords') }), _jsx("strong", { children: resultCount })] }), _jsxs("div", { className: css.memoryStat, children: [_jsx("span", { children: t('settings.memoryPending') }), _jsx("strong", { children: memoryState?.pendingJobs ?? (busy ? 1 : 0) })] }), _jsxs("div", { className: css.memoryStat, children: [_jsx("span", { children: t('settings.memoryLastRun') }), _jsx("strong", { children: lastRun })] }), _jsxs("div", { className: css.memoryStat, children: [_jsx("span", { children: t('settings.memoryMethod') }), _jsx("strong", { children: method })] })] }), error === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: error }), results.length === 0
                        ? _jsx("div", { className: css.memoryEmpty, children: enabled ? t('settings.memoryEmpty') : t('settings.memoryDisabledBody') })
                        : (_jsx("div", { className: css.memoryResults, children: results.map((result, index) => (_jsxs("div", { className: css.memoryResult, children: [_jsx("strong", { children: resultTitle(result) }), _jsx("span", { children: result.snippet })] }, `${result.recordId ?? result.sessionId}:${index}`))) })), _jsxs("div", { className: css.memoryFooter, children: [_jsx("span", { children: t('settings.memoryHistoryNote') }), _jsx(Button, { onClick: reset, disabled: busy || (query === '' && results.length === 0 && resultCount === 0), children: t('settings.memoryReset') })] })] })] }));
}
/** One page for mode selection, Agent composition, and execution workflow. */
export function AgentWorkflowSection({ sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
    const described = useAsync(async () => await runtime.remote.settings.describe(), [runtime]);
    const commands = useAsync(async () => (sessionId === undefined ? undefined : await runtime.remote.commands.list(sessionId)), [runtime, sessionId]);
    const session = useSessionSnapshot(sessionId);
    const activePreset = useProjectionValue(sessionId, 'agentPreset');
    const busyEnter = useObservable(runtime.busyEnter, 'queue');
    const [selectedMode, setSelectedMode] = useState();
    const [modeBusy, setModeBusy] = useState(false);
    const [actionBusy, setActionBusy] = useState();
    const [error, setError] = useState();
    const [customParallel, setCustomParallel] = useState('');
    const [memoryEnabled, setMemoryEnabled] = useState(memoryEnabledFromStorage);
    const presets = roster.value?.ok === true ? roster.value.value.presets : [];
    const hostDefault = presets.find(preset => preset.isDefault)?.id;
    const defaultMode = selectedMode ?? hostDefault ?? presets[0]?.id ?? 'standard';
    const currentMode = activePreset ?? defaultMode;
    const namespaces = described.value?.ok === true ? described.value.value.namespaces : [];
    const settingsWritable = described.value?.ok === true && described.value.value.writable;
    const loop = namespaceOf(namespaces, 'agent-loop');
    const retry = namespaceOf(namespaces, 'llm-retry');
    const compaction = namespaceOf(namespaces, 'compaction');
    const maxParallel = numberOf(loop, 'maxParallelToolCalls', 10);
    const steeringMode = valueOf(loop, 'steeringMode') === 'one-at-a-time' ? 'one-at-a-time' : 'all';
    const followUpMode = valueOf(loop, 'followUpMode') === 'all' ? 'all' : 'one-at-a-time';
    const strategy = maxParallel >= 200 ? 'wide' : maxParallel <= 6 ? 'tokensaver' : 'custom';
    const autoRetry = booleanOf(retry, 'enabled', true);
    const autoCompaction = booleanOf(compaction, 'auto', true);
    const compactAvailable = commands.value?.ok === true
        && commands.value.value.some(command => command.name === 'compact');
    const currentPresetRow = presets.find(preset => preset.id === currentMode);
    const settingsReadOnly = described.value?.ok === true && !described.value.value.writable;
    useEffect(() => {
        if (hostDefault !== undefined)
            setSelectedMode(hostDefault);
    }, [hostDefault]);
    useEffect(() => {
        if (strategy === 'custom')
            setCustomParallel(String(maxParallel));
    }, [maxParallel, strategy]);
    const reloadSettings = useCallback(() => {
        described.reload();
        roster.reload();
    }, [described, roster]);
    const selectMode = useCallback((id) => {
        if (modeBusy || settingsReadOnly || id === defaultMode)
            return;
        const preset = presets.find(item => item.id === id);
        if (preset?.broken !== undefined)
            return;
        const previous = defaultMode;
        setSelectedMode(id);
        setModeBusy(true);
        setError(undefined);
        void (async () => {
            const defaultResult = await runtime.remote.settings.update('agent-presets', { default: id }, undefined);
            if (!defaultResult.ok)
                throw new Error(defaultResult.error.message);
            if (sessionId !== undefined && session?.blank === true && session.running !== true) {
                const result = await runtime.remote.agentPresets.select(sessionId, id);
                if (!result.ok)
                    throw new Error(result.error.message);
            }
            reloadSettings();
        })().catch((cause) => {
            setSelectedMode(previous);
            setError(cause instanceof Error ? cause.message : String(cause));
        }).finally(() => { setModeBusy(false); });
    }, [defaultMode, modeBusy, presets, reloadSettings, runtime, session, sessionId, settingsReadOnly]);
    const saveNamespace = useCallback((key, namespace, patch) => {
        if (!settingsWritable || actionBusy !== undefined)
            return;
        setActionBusy(key);
        setError(undefined);
        void updateNamespace(runtime, namespace, patch, t('settings.agentWorkflowSettingUnavailable'))
            .then(reloadSettings)
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setActionBusy(undefined); });
    }, [actionBusy, reloadSettings, runtime, settingsWritable, t]);
    const selectStrategy = useCallback((value) => {
        if (value === 'tokensaver')
            saveNamespace('parallel', loop, { maxParallelToolCalls: 6 });
        if (value === 'wide')
            saveNamespace('parallel', loop, { maxParallelToolCalls: 200 });
        if (value === 'custom')
            setCustomParallel(String(maxParallel));
    }, [loop, maxParallel, saveNamespace]);
    const saveCustomParallel = useCallback(() => {
        const value = Number(customParallel);
        if (!Number.isInteger(value) || value < 1) {
            setError(t('settings.agentWorkflowParallelInvalid'));
            return;
        }
        saveNamespace('parallel', loop, { maxParallelToolCalls: value });
    }, [customParallel, loop, saveNamespace, t]);
    const selectFollowUp = useCallback((value) => {
        const next = value === 'all' ? 'all' : 'one-at-a-time';
        saveNamespace('follow-up', loop, { followUpMode: next });
    }, [loop, saveNamespace]);
    const compactNow = useCallback(() => {
        if (sessionId === undefined || !compactAvailable || actionBusy !== undefined)
            return;
        setActionBusy('compact');
        setError(undefined);
        void runtime.remote.commands.execute(sessionId, '/compact', [])
            .then(result => { if (!result.ok)
            throw new Error(result.error.message); })
            .catch((cause) => { setError(cause instanceof Error ? cause.message : String(cause)); })
            .finally(() => { setActionBusy(undefined); });
    }, [actionBusy, compactAvailable, runtime, sessionId]);
    const setMemory = useCallback((value) => {
        setMemoryEnabled(value);
        if (typeof window === 'undefined')
            return;
        try {
            window.localStorage.setItem(MEMORY_ENABLED_KEY, String(value));
        }
        catch { /* unavailable in embedded previews */ }
    }, []);
    const modeRows = useMemo(() => {
        const builtin = BUILTIN_MODE_IDS
            .map(id => presets.find(preset => preset.id === id))
            .filter((preset) => preset !== undefined);
        const custom = presets.filter(preset => !BUILTIN_MODE_IDS.includes(preset.id));
        return [...builtin, ...custom];
    }, [presets]);
    return (_jsxs(_Fragment, { children: [_jsxs(Section, { title: t('settings.agentWorkflowModesTitle'), body: t('settings.agentWorkflowBody'), children: [roster.loading
                        ? _jsx("div", { className: css.card, children: _jsx(EmptyState, { children: _jsx(Spinner, {}) }) })
                        : roster.error !== undefined
                            ? _jsx("div", { className: css.card, children: _jsx(EmptyState, { children: roster.error }) })
                            : roster.value?.ok === false
                                ? _jsx("div", { className: css.card, children: _jsx(EmptyState, { children: roster.value.error.message }) })
                                : (_jsx("div", { className: css.modeGrid, role: "list", "aria-label": t('settings.agentWorkflowModes'), children: modeRows.map(preset => {
                                        const selected = currentMode === preset.id;
                                        return (_jsxs("button", { type: "button", className: `${css.modeCard} ${selected ? css.modeCardActive : ''}`, "aria-pressed": selected, disabled: modeBusy || settingsReadOnly || preset.broken !== undefined, onClick: () => { selectMode(preset.id); }, children: [_jsxs("span", { className: css.modeCardHead, children: [_jsx("strong", { children: modeName(preset.id, preset.name ?? preset.id, t) }), selected ? _jsx("span", { className: css.badge, children: t('settings.modeActive') }) : null] }), _jsx("span", { className: css.modeCardBody, children: modeBody(preset.id, t) }), preset.broken === undefined ? null : _jsx("span", { className: css.modeCardError, children: preset.broken })] }, preset.id));
                                    }) })), error === undefined ? null : _jsx("div", { className: css.inlineError, role: "alert", children: error })] }), _jsx(Section, { title: t('settings.agentWorkflowControls'), body: t('settings.agentWorkflowControlsBody'), children: _jsxs("div", { className: css.card, children: [_jsx(SettingRow, { title: t('settings.agentWorkflowConcurrency'), body: t('settings.agentWorkflowConcurrencyBody'), control: (_jsxs("div", { className: css.controlStack, children: [_jsx(SelectMenu, { value: strategy, ariaLabel: t('settings.agentWorkflowConcurrency'), options: [
                                            { id: 'tokensaver', label: t('settings.agentWorkflowConcurrencyTokenSaver') },
                                            { id: 'wide', label: t('settings.agentWorkflowConcurrencyWide') },
                                            { id: 'custom', label: t('settings.agentWorkflowConcurrencyCustom') },
                                        ], disabled: loop === undefined || !settingsWritable || actionBusy !== undefined, onChange: selectStrategy }), strategy === 'custom'
                                        ? (_jsx("input", { className: css.number, type: "number", min: 1, value: customParallel, "aria-label": t('settings.agentWorkflowConcurrencyCustom'), disabled: loop === undefined || !settingsWritable || actionBusy !== undefined, onChange: event => { setCustomParallel(event.target.value); }, onBlur: saveCustomParallel, onKeyDown: event => { if (event.key === 'Enter')
                                                saveCustomParallel(); } }))
                                        : null] })) }), _jsx(SettingRow, { title: t('settings.agentWorkflowSteering'), body: t('settings.agentWorkflowSteeringBody'), control: (_jsx(SelectMenu, { value: steeringMode, ariaLabel: t('settings.agentWorkflowSteering'), options: [
                                    { id: 'one-at-a-time', label: t('settings.agentWorkflowSteeringOne') },
                                    { id: 'all', label: t('settings.agentWorkflowSteeringAll') },
                                ], disabled: loop === undefined || !settingsWritable || actionBusy !== undefined, onChange: value => { saveNamespace('steering', loop, { steeringMode: value === 'all' ? 'all' : 'one-at-a-time' }); } })) }), _jsx(SettingRow, { title: t('settings.agentWorkflowFollowUp'), body: t('settings.agentWorkflowFollowUpBody'), control: (_jsx(SelectMenu, { value: followUpMode, ariaLabel: t('settings.agentWorkflowFollowUp'), options: [
                                    { id: 'one-at-a-time', label: t('settings.agentWorkflowFollowUpOne') },
                                    { id: 'all', label: t('settings.agentWorkflowFollowUpAll') },
                                ], disabled: loop === undefined || !settingsWritable || actionBusy !== undefined, onChange: selectFollowUp })) }), _jsx(SettingRow, { title: t('settings.busyEnter'), body: t('settings.busyEnterBody'), control: (_jsx(SelectMenu, { value: busyEnter, ariaLabel: t('settings.busyEnter'), options: [
                                    { id: 'queue', label: t('settings.busyEnter.queue') },
                                    { id: 'steer', label: t('settings.busyEnter.steer') },
                                ], disabled: !runtime.busyEnter.writable, onChange: value => { runtime.busyEnter.set(value); } })) }), _jsx(SettingRow, { title: t('settings.agentWorkflowRetry'), body: t('settings.agentWorkflowRetryBody'), control: _jsx(Toggle, { checked: autoRetry, disabled: retry === undefined || !settingsWritable || actionBusy !== undefined, label: t('settings.agentWorkflowRetry'), onChange: value => { saveNamespace('retry', retry, { enabled: value }); } }) })] }) }), _jsx(Section, { title: t('settings.agentWorkflowCompaction'), body: t('settings.agentWorkflowCompactionBody'), children: _jsxs("div", { className: css.card, children: [_jsx(SettingRow, { title: t('settings.agentWorkflowAutoCompaction'), body: t('settings.agentWorkflowAutoCompactionBody'), control: _jsx(Toggle, { checked: autoCompaction, disabled: compaction === undefined || !settingsWritable || actionBusy !== undefined, label: t('settings.agentWorkflowAutoCompaction'), onChange: value => { saveNamespace('compaction', compaction, { auto: value }); } }) }), _jsx(SettingRow, { title: t('settings.agentWorkflowCompactNow'), body: t('settings.agentWorkflowCompactNowBody'), control: _jsx(Button, { onClick: compactNow, disabled: !compactAvailable || session?.running === true || actionBusy !== undefined, children: actionBusy === 'compact' ? t('settings.agentWorkflowCompacting') : t('settings.agentWorkflowCompactNow') }) })] }) }), _jsx(MemorySection, { enabled: memoryEnabled, onEnabledChange: setMemory, sessionId: sessionId }), _jsx(Section, { title: t('settings.agentWorkflowComposition'), body: t('settings.agentWorkflowCompositionBody'), children: _jsxs("div", { className: css.card, children: [_jsx(SettingRow, { title: t('settings.agentWorkflowPrompt'), body: t('settings.agentWorkflowPromptBody'), control: _jsx("span", { className: css.badge, children: modeName(currentMode, currentPresetRow?.name ?? currentMode, t) }) }), _jsx(SettingRow, { title: t('settings.agentWorkflowTools'), body: t('settings.agentWorkflowToolsBody'), control: _jsx("span", { className: css.rowMono, children: currentMode === 'crew' ? t('settings.agentWorkflowToolsCluster') : t('settings.agentWorkflowToolsStandard') }) }), _jsx(SettingRow, { title: t('settings.agentWorkflowGovernance'), body: t('settings.agentWorkflowGovernanceBody'), control: _jsx("span", { className: css.rowMono, children: currentMode === 'crew' ? t('settings.agentWorkflowGovernanceCluster') : t('settings.agentWorkflowGovernanceDefault') }) })] }) }), described.loading ? _jsx("div", { className: css.settingsLoading, children: _jsx(Spinner, {}) }) : null] }));
}
//# sourceMappingURL=AgentWorkflowSection.js.map