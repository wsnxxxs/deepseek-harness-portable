import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The floating right card: Git changes, Goal and Progress, command output, and
 * selected subagent details.
 *
 * Goal is the host-computed `goal` projection — the same value the official
 * goal bar renders — and Progress is the session's own todo list, folded from
 * the `todo_write` calls in the transcript. Neither is workbench state: close
 * the window and reopen it in the classic UI and the same facts are there.
 * @module @dsh-portable/dcode-ui/client/shell/Aside
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { IconChecklistOutline14, IconCheckOutline14, IconChevronRightOutline14, IconCloseOutline16, IconGoalOutline16, IconWarningOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useChatSnapshot, useProjectionValue, useTrajectorySnapshot } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { adjacentAsideTab, orderedAsideTabs, useNavigation, } from "../state/navigation.js";
import { useRuntime } from "../state/runtime.js";
import { GitPanel } from "../git/GitPanel.js";
import { DiffViewer } from "../git/DiffViewer.js";
import { Button, CopyButton, EmptyState, Pill, Spinner, ui } from "./ui.js";
import { formatToolDuration, latestTodos, parseArgs, resultText, summarizeTool, toolDurationMs } from "../chat/tools.js";
import { AnsiOutput, OutputToolbar } from "../chat/AnsiOutput.js";
import { stripAnsi } from "../chat/ansi.js";
import { SubagentDetailPanel, SubagentsPanel } from "./AgentInspector.js";
import { ClusterPanel } from "./ClusterPanel.js";
import css from './Aside.module.css';
/** Walk a tool block and its children depth-first. */
function* walkCalls(block) {
    yield block;
    for (const child of block.subCalls)
        yield* walkCalls(child);
}
/**
 * The session's current plan: the newest `todo_write` argument list.
 *
 * Reading the arguments rather than the result is deliberate — the tool
 * records the whole list on every write, so the last call is the whole plan
 * even when earlier ones fell outside the loaded history window.
 */
/** Goal and Progress. */
function GoalPanel({ sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const goal = useProjectionValue(sessionId, 'goal');
    const projectedTodos = useProjectionValue(sessionId, 'todos');
    const chat = useChatSnapshot(sessionId);
    const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
    const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? [];
    const done = todos.filter(todo => todo.status === 'completed').length;
    const [editingGoal, setEditingGoal] = useState(false);
    const [goalDraft, setGoalDraft] = useState('');
    const [goalBusy, setGoalBusy] = useState(false);
    const [goalError, setGoalError] = useState();
    useEffect(() => {
        if (editingGoal && goal?.goal.objective !== undefined)
            setGoalDraft(goal.goal.objective);
    }, [editingGoal, goal?.goal.objective]);
    const goals = runtime.goals;
    const goalRef = goal == null ? undefined : { id: goal.goal.id, revision: goal.goal.revision };
    const goalActionDisabled = goalBusy || sessionId === undefined || goals === undefined || goalRef === undefined;
    const runGoal = useCallback(async (action) => {
        if (goalBusy)
            return;
        setGoalBusy(true);
        setGoalError(undefined);
        try {
            const result = await action();
            if (!result.ok)
                setGoalError(result.error?.message ?? t('common.error'));
            else
                setEditingGoal(false);
        }
        catch (cause) {
            setGoalError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setGoalBusy(false);
        }
    }, [goalBusy, t]);
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx(IconGoalOutline16, {}), _jsx("span", { className: ui.grow, children: t('goal.title') }), goal == null
                                ? null
                                : (_jsx(Pill, { children: goal.goal.phase === 'completed'
                                        ? t('goal.complete')
                                        : goal.goal.phase === 'paused' ? t('goal.paused') : t('goal.active') }))] }), goal == null
                        ? _jsx(EmptyState, { children: t('goal.none') })
                        : (_jsxs("div", { className: css.goal, children: [editingGoal
                                    ? (_jsxs(_Fragment, { children: [_jsx("textarea", { className: css.goalInput, rows: 3, value: goalDraft, disabled: goalBusy, "aria-label": t('goal.edit'), onChange: event => { setGoalDraft(event.target.value); setGoalError(undefined); }, onKeyDown: event => {
                                                    if (event.key === 'Escape') {
                                                        event.preventDefault();
                                                        setEditingGoal(false);
                                                    }
                                                } }), _jsxs("div", { className: css.goalActions, children: [_jsx(Button, { disabled: goalActionDisabled || goalDraft.trim() === '', onClick: () => {
                                                            const ref = goalRef;
                                                            if (ref === undefined || goals === undefined || sessionId === undefined)
                                                                return;
                                                            void runGoal(() => goals.edit(sessionId, ref, { objective: goalDraft.trim() }));
                                                        }, children: t('common.save') }), _jsx(Button, { disabled: goalBusy, onClick: () => { setEditingGoal(false); setGoalError(undefined); }, children: t('common.cancel') })] })] }))
                                    : (_jsxs("div", { className: css.goalText, children: [goal.goal.objective, _jsxs("div", { className: css.goalMeta, children: [done, "/", todos.length || '—', " \u00B7 ", t('goal.rounds', { count: goal.roundsStarted })] })] })), editingGoal ? null : (_jsxs("div", { className: css.goalActions, children: [goal.goal.phase === 'completed'
                                            ? null
                                            : (_jsx(Button, { disabled: goalActionDisabled, onClick: () => {
                                                    if (goalRef === undefined || goals === undefined || sessionId === undefined)
                                                        return;
                                                    void runGoal(() => (goal.goal.phase === 'paused'
                                                        ? goals.resume(sessionId, goalRef)
                                                        : goals.pause(sessionId, goalRef)));
                                                }, children: goal.goal.phase === 'paused' ? t('goal.resume') : t('goal.pause') })), _jsx(Button, { disabled: goalActionDisabled, onClick: () => { setEditingGoal(true); }, children: t('goal.edit') }), _jsx(Button, { disabled: goalActionDisabled, onClick: () => {
                                                if (goalRef === undefined || goals === undefined || sessionId === undefined)
                                                    return;
                                                void runGoal(() => goals.clear(sessionId, goalRef));
                                            }, children: t('goal.clear') })] })), goalError === undefined ? null : _jsx("div", { className: css.goalError, role: "alert", children: goalError })] }))] }), _jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx(IconChecklistOutline14, {}), _jsx("span", { className: ui.grow, children: t('progress.title') }), todos.length === 0 ? null : _jsxs(Pill, { children: [done, "/", todos.length] })] }), todos.length === 0
                        ? _jsx(EmptyState, { children: t('progress.none') })
                        : todos.map((todo, index) => (_jsxs("div", { className: `${css.step} ${todo.status === 'completed' ? css.stepDone : ''} ${todo.status === 'in_progress' ? css.stepActive : ''}`, children: [_jsx("span", { className: `${css.stepMark} ${todo.status === 'completed' ? css.stepMarkDone : ''}`, "aria-hidden": true, children: todo.status === 'completed'
                                        ? _jsx(IconCheckOutline14, {})
                                        : todo.status === 'in_progress'
                                            ? _jsx("span", { className: css.stepProgress, "aria-hidden": true })
                                            : _jsx("span", { className: css.stepPending, "aria-hidden": true }) }), _jsx("span", { children: todo.content })] }, `${String(index)}:${todo.content}`)))] })] }));
}
/** Recover the exit marker emitted by the shipped bash/pwsh tools. */
function commandExit(text, isError, defaultZero, background, t) {
    if (isError)
        return { output: text, label: t('aside.commandToolFailed'), failed: true };
    if (background)
        return { output: text, label: t('aside.commandBackground'), failed: false };
    const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text);
    if (signal?.[1] !== undefined) {
        return { output: text.slice(0, signal.index), label: t('aside.commandSignal', { signal: signal[1] }), failed: true };
    }
    const exit = /\n\[exit code: (\d+)\]$/.exec(text);
    if (exit?.[1] === undefined && !defaultZero) {
        return { output: text, label: t('aside.commandCompleted'), failed: false };
    }
    const code = exit?.[1] === undefined ? 0 : Number(exit[1]);
    return {
        output: exit === null ? text : text.slice(0, exit.index),
        label: t('aside.commandExit', { code }),
        failed: code !== 0,
    };
}
/** One command invocation; it keeps its own disclosure and wrap preference. */
function CommandOutputEntry({ block, onLocated }) {
    const t = useT();
    const settled = 'isError' in block;
    const name = settled ? block.call?.name ?? 'tool' : block.name;
    const argsRaw = settled ? block.call?.argsRaw : block.argsRaw;
    const summary = summarizeTool(name, argsRaw);
    const args = parseArgs(argsRaw);
    const commandArgument = [args.command, args.input, args.script]
        .find((value) => typeof value === 'string' && value.trim() !== '');
    const command = commandArgument ?? (summary.detail || name);
    const result = settled
        ? commandExit(resultText(block.content), block.isError, name === 'bash' || name === 'pwsh' || name === 'powershell', args.run_in_background === true, t)
        : { output: '', label: t('aside.commandPending'), failed: false };
    const status = settled ? result.failed ? 'failed' : 'success' : 'running';
    const [open, setOpen] = useState(() => status === 'failed');
    const [wrap, setWrap] = useState(true);
    const contentId = useId();
    const startedAt = useRef(block.time);
    const [now, setNow] = useState(Date.now);
    const duration = settled ? toolDurationMs(block) : Math.max(0, now - startedAt.current);
    const plainOutput = stripAnsi(result.output.slice(0, 4096)).trim();
    const outputSummary = plainOutput === ''
        ? t('aside.commandNoOutput')
        : plainOutput.split(/\r?\n/, 1)[0]?.trim() || t('aside.commandNoOutput');
    useEffect(() => {
        if (settled)
            return undefined;
        const timer = window.setInterval(() => { setNow(Date.now()); }, 1000);
        return () => { window.clearInterval(timer); };
    }, [settled]);
    useEffect(() => {
        if (status === 'failed')
            setOpen(true);
    }, [status]);
    const locate = () => {
        const target = [...document.querySelectorAll('[data-tool-call-id]')]
            .find(element => element.dataset.toolCallId === block.callId);
        if (target === undefined)
            return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.querySelector('button')?.focus({ preventScroll: true });
        onLocated();
    };
    return (_jsxs("article", { className: css.commandEntry, "data-status": status, children: [_jsxs("div", { className: css.commandEntryHead, children: [_jsxs("button", { type: "button", className: css.commandLocate, onClick: locate, title: t('aside.commandLocate'), children: [_jsx("span", { className: css.commandStatusIcon, "aria-hidden": true, children: status === 'running'
                                    ? _jsx(Spinner, { size: "sm" })
                                    : status === 'failed' ? _jsx(IconWarningOutline16, {}) : _jsx(IconCheckOutline14, { size: 16 }) }), _jsxs("span", { className: css.commandIdentity, children: [_jsx("code", { className: css.commandText, title: command, children: command }), _jsx("span", { className: css.commandSummary, title: outputSummary, children: outputSummary })] })] }), _jsx(CopyButton, { text: command, label: t('aside.commandCopy'), copiedLabel: t('common.copied') }), _jsx("button", { type: "button", className: css.commandExpand, "aria-expanded": open, "aria-controls": contentId, "aria-label": open ? t('aside.commandCollapse') : t('aside.commandExpand'), onClick: () => { setOpen(value => !value); }, children: _jsx(IconChevronRightOutline14, { className: open ? css.commandChevronOpen : undefined }) })] }), _jsxs("div", { className: css.commandMeta, role: "status", children: [_jsx("span", { className: css.commandStatusText, children: status === 'running'
                            ? t('aside.commandRunning')
                            : status === 'failed' ? t('aside.commandFailed') : t('aside.commandSuccess') }), _jsx("span", { children: duration === undefined ? t('aside.commandDurationUnknown') : formatToolDuration(duration) }), _jsx("span", { children: result.label })] }), open
                ? (_jsxs("div", { className: css.commandBody, id: contentId, children: [_jsxs("div", { className: css.commandOutputHead, children: [_jsx("span", { children: t('details.output') }), result.output === '' ? null : _jsx(OutputToolbar, { text: result.output, wrap: wrap, onWrap: setWrap })] }), settled
                            ? result.output === ''
                                ? _jsx(EmptyState, { children: t('aside.commandNoOutput') })
                                : _jsx(AnsiOutput, { text: result.output, wrap: wrap, className: status === 'failed' ? css.commandFailedOutput : undefined })
                            : _jsxs(EmptyState, { children: [_jsx(Spinner, { size: "sm" }), " ", t('aside.commandWaitingOutput')] })] }))
                : null] }));
}
/** Persistent per-invocation command output from the current session ledger. */
function CommandOutputPanel({ sessionId, onLocated }) {
    const t = useT();
    const chat = useChatSnapshot(sessionId);
    const trajectory = useTrajectorySnapshot(sessionId);
    const commands = useMemo(() => {
        const nodes = trajectory === undefined || trajectory.eventNodes.length === 0
            ? chat?.legacy.nodes ?? []
            : trajectory.eventNodes;
        const running = trajectory === undefined || trajectory.runningCalls.length === 0
            ? chat?.legacy.runningCalls ?? []
            : trajectory.runningCalls;
        const calls = [];
        const seen = new Set();
        const admit = (block) => {
            if (seen.has(block.callId))
                return;
            const name = 'isError' in block ? block.call?.name ?? '' : block.name;
            const argsRaw = 'isError' in block ? block.call?.argsRaw : block.argsRaw;
            if (summarizeTool(name, argsRaw).kind !== 'run')
                return;
            seen.add(block.callId);
            calls.push(block);
        };
        for (const node of nodes) {
            if (node.kind !== 'tool-result')
                continue;
            for (const block of walkCalls(node))
                admit(block);
        }
        for (const root of running) {
            for (const block of walkCalls(root))
                admit(block);
        }
        return calls;
    }, [chat, trajectory]);
    return (_jsxs("section", { className: `${css.section} ${css.commandOutputSection}`, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx("span", { className: ui.grow, children: t('aside.commandOutput') }), commands.length === 0 ? null : _jsx(Pill, { children: commands.length })] }), commands.length === 0
                ? _jsx(EmptyState, { children: t('aside.commandOutputEmpty') })
                : _jsx("div", { className: css.commandList, children: commands.map(block => _jsx(CommandOutputEntry, { block: block, onLocated: onLocated }, block.callId)) })] }));
}
/** The docked preview sidebar with its content views. */
export function Aside({ navigation, sessionId, cwd, context, onOpenSubagentConversation }) {
    const runtime = useRuntime();
    const t = useT();
    const state = useNavigation(navigation);
    const selectedPreset = useProjectionValue(sessionId, 'agentPreset');
    const [selectedSubagent, setSelectedSubagent] = useState();
    const tabPrefix = useId();
    const tabRefs = useRef({ changes: null, terminal: null, goal: null });
    useEffect(() => { setSelectedSubagent(undefined); }, [sessionId]);
    const labels = {
        changes: t('git.changes'),
        terminal: t('aside.commandOutput'),
        goal: t('aside.inspector'),
    };
    const tabOrder = orderedAsideTabs(context);
    const tabs = tabOrder.map(id => ({ id, label: labels[id] }));
    const panelId = `${tabPrefix}-panel`;
    const moveTab = (event, index) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End')
            return;
        event.preventDefault();
        const next = event.key === 'Home'
            ? tabOrder[0]
            : event.key === 'End'
                ? tabOrder[tabOrder.length - 1]
                : adjacentAsideTab(tabs[index]?.id ?? state.aside, event.key === 'ArrowRight' ? 1 : -1, tabOrder);
        if (next === undefined)
            return;
        navigation.openAside(next);
        tabRefs.current[next]?.focus();
    };
    return (_jsxs("aside", { className: css.aside, "aria-label": t('aside.title'), children: [_jsxs("header", { className: `${css.header} ${ui.cardHeader}`, children: [_jsx("span", { className: css.headerTitle, children: t('aside.title') }), _jsx("button", { type: "button", className: css.headerClose, "aria-label": t('aside.close'), onClick: () => { navigation.toggleAside(); }, children: _jsx(IconCloseOutline16, {}) })] }), _jsxs("div", { className: css.tabs, role: "tablist", "aria-label": t('aside.title'), children: [tabs.map((tab, index) => (_jsx("button", { ref: element => { tabRefs.current[tab.id] = element; }, type: "button", role: "tab", id: `${tabPrefix}-${tab.id}`, "aria-selected": state.aside === tab.id, "aria-controls": panelId, tabIndex: state.aside === tab.id ? 0 : -1, className: `${css.tab} ${state.aside === tab.id ? css.tabActive : ''}`, onClick: () => { navigation.openAside(tab.id); }, onKeyDown: event => { moveTab(event, index); }, children: tab.label }, tab.id))), _jsx("span", { className: css.tabIndicator, style: { transform: `translateX(${String(tabOrder.indexOf(state.aside) * 100)}%)` }, "aria-hidden": true })] }), _jsxs("div", { id: panelId, className: css.body, role: "tabpanel", tabIndex: 0, "aria-labelledby": `${tabPrefix}-${state.aside}`, "aria-label": tabs.find(tab => tab.id === state.aside)?.label, children: [state.aside === 'changes'
                        ? (_jsxs("div", { className: css.reviewLayout, children: [_jsx(GitPanel, { cwd: cwd, sessionId: sessionId, selected: state.diff, onOpenDiff: (path, staged) => { navigation.openDiff(path, staged); } }), state.diff === undefined || cwd === undefined
                                    ? null
                                    : (_jsx(DiffViewer, { cwd: cwd, path: state.diff.path, staged: state.diff.staged, onClose: () => { navigation.closeDiff(); } }))] }))
                        : null, state.aside === 'terminal'
                        ? _jsx(CommandOutputPanel, { sessionId: sessionId, onLocated: () => { navigation.closeCompactOverlay(); } })
                        : null, state.aside === 'goal'
                        ? selectedSubagent === undefined || sessionId === undefined
                            ? (_jsxs(_Fragment, { children: [selectedPreset === 'crew' && runtime.cluster !== undefined
                                        ? _jsx(ClusterPanel, { sessionId: sessionId })
                                        : null, _jsx(GoalPanel, { sessionId: sessionId }), _jsx(SubagentsPanel, { sessionId: sessionId, onSelect: setSelectedSubagent })] }))
                            : (_jsx(SubagentDetailPanel, { parentSessionId: sessionId, entry: selectedSubagent, navigation: navigation, onBack: () => { setSelectedSubagent(undefined); }, onOpenFull: () => { onOpenSubagentConversation(sessionId, selectedSubagent); } }))
                        : null] })] }));
}
//# sourceMappingURL=Aside.js.map