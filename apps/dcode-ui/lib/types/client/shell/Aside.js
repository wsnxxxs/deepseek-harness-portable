import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The floating right card: Git changes, Goal and Progress, and the details of
 * whatever the operator last clicked.
 *
 * Goal is the host-computed `goal` projection — the same value the official
 * goal bar renders — and Progress is the session's own todo list, folded from
 * the `todo_write` calls in the transcript. Neither is workbench state: close
 * the window and reopen it in the classic UI and the same facts are there.
 * @module @dsh-portable/dcode-ui/client/shell/Aside
 */
import { useId, useMemo, useRef, useState } from 'react';
import { IconChecklistOutline14, IconCheckOutline14, IconCloseOutline16, IconGoalOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useAsync, useChatSnapshot, useProjectionValue, useTrajectorySnapshot } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { useRuntime } from "../state/runtime.js";
import { GitPanel } from "../git/GitPanel.js";
import { DiffViewer } from "../git/DiffViewer.js";
import { EmptyState, Pill, Spinner, ui } from "./ui.js";
import { latestTodos, resultText, summarizeTool } from "../chat/tools.js";
import { AnsiOutput, OutputToolbar } from "../chat/AnsiOutput.js";
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
    const t = useT();
    const goal = useProjectionValue(sessionId, 'goal');
    const projectedTodos = useProjectionValue(sessionId, 'todos');
    const chat = useChatSnapshot(sessionId);
    const fallbackTodos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
    const todos = projectedTodos === undefined ? fallbackTodos : projectedTodos ?? [];
    const done = todos.filter(todo => todo.status === 'completed').length;
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx(IconGoalOutline16, {}), _jsx("span", { className: ui.grow, children: t('goal.title') }), goal == null
                                ? null
                                : (_jsx(Pill, { children: goal.goal.phase === 'completed'
                                        ? t('goal.complete')
                                        : goal.goal.phase === 'paused' ? t('goal.paused') : t('goal.active') }))] }), goal == null
                        ? _jsx(EmptyState, { children: t('goal.none') })
                        : (_jsx("div", { className: css.goal, children: _jsxs("div", { className: css.goalText, children: [goal.goal.objective, _jsxs("div", { className: css.goalMeta, children: [done, "/", todos.length || '—', " \u00B7 ", goal.roundsStarted, " rounds"] })] }) }))] }), _jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx(IconChecklistOutline14, {}), _jsx("span", { className: ui.grow, children: t('progress.title') }), todos.length === 0 ? null : _jsxs(Pill, { children: [done, "/", todos.length] })] }), todos.length === 0
                        ? _jsx(EmptyState, { children: t('progress.none') })
                        : todos.map((todo, index) => (_jsxs("div", { className: `${css.step} ${todo.status === 'completed' ? css.stepDone : ''} ${todo.status === 'in_progress' ? css.stepActive : ''}`, children: [_jsx("span", { className: `${css.stepMark} ${todo.status === 'completed' ? css.stepMarkDone : ''}`, "aria-hidden": true, children: todo.status === 'completed'
                                        ? _jsx(IconCheckOutline14, {})
                                        : todo.status === 'in_progress'
                                            ? _jsx("span", { className: css.stepProgress, "aria-hidden": true })
                                            : _jsx("span", { className: css.stepPending, "aria-hidden": true }) }), _jsx("span", { children: todo.content })] }, `${String(index)}:${todo.content}`)))] })] }));
}
/** Arguments and output of the tool call the operator last opened. */
function DetailsPanel({ sessionId, callId, cwd, diff, }) {
    const runtime = useRuntime();
    const t = useT();
    const chat = useChatSnapshot(sessionId);
    const trajectory = useTrajectorySnapshot(sessionId);
    const [wrap, setWrap] = useState(true);
    const block = useMemo(() => {
        if (callId === undefined)
            return undefined;
        const nodes = trajectory === undefined || trajectory.eventNodes.length === 0
            ? chat?.legacy.nodes ?? []
            : trajectory.eventNodes;
        for (const node of nodes) {
            if (node.kind !== 'tool-result')
                continue;
            for (const candidate of walkCalls(node)) {
                if (candidate.callId === callId)
                    return candidate;
            }
        }
        const runningCalls = trajectory === undefined || trajectory.runningCalls.length === 0
            ? chat?.legacy.runningCalls ?? []
            : trajectory.runningCalls;
        for (const running of runningCalls) {
            for (const candidate of walkCalls(running)) {
                if (candidate.callId === callId)
                    return candidate;
            }
        }
        return undefined;
    }, [chat, trajectory, callId]);
    const filePath = block === undefined ? diff?.path : undefined;
    const fileRead = useAsync(async () => {
        if (cwd === undefined || filePath === undefined)
            return undefined;
        return {
            cwd,
            path: filePath,
            result: await runtime.git.readFile(cwd, filePath),
        };
    }, [runtime, cwd, filePath]);
    // Keep a previous file from appearing while a changed target is loading.
    const loadedFile = fileRead.value;
    const currentFile = loadedFile !== undefined && loadedFile.cwd === cwd && loadedFile.path === filePath
        ? loadedFile.result
        : undefined;
    if (block === undefined) {
        if (diff === undefined)
            return _jsx(EmptyState, { children: t('details.none') });
        if (fileRead.loading)
            return _jsx(EmptyState, { children: _jsx(Spinner, {}) });
        if (fileRead.error !== undefined)
            return _jsx(EmptyState, { children: fileRead.error });
        if (currentFile === undefined)
            return _jsx(EmptyState, { children: t('common.error') });
        if (currentFile.ok === false)
            return _jsx(EmptyState, { children: currentFile.error.message || t('common.error') });
        return (_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx("span", { className: ui.grow, children: t('details.file') }), _jsxs("span", { className: css.fileMeta, children: [currentFile.value.size, " B"] })] }), _jsx("div", { className: css.filePath, title: currentFile.value.path, children: _jsx("bdi", { children: currentFile.value.path }) }), _jsxs("div", { className: css.fileMeta, children: [currentFile.value.binary ? _jsx(Pill, { children: t('git.binary') }) : null, currentFile.value.truncated ? _jsx(Pill, { children: t('git.truncated') }) : null] }), currentFile.value.binary
                    ? _jsx(EmptyState, { children: t('git.binary') })
                    : _jsx("pre", { className: css.pre, tabIndex: 0, role: "region", "aria-label": t('details.file'), children: currentFile.value.text })] }));
    }
    const settled = 'isError' in block;
    const name = settled ? block.call?.name ?? 'tool' : block.name;
    const argsRaw = settled ? block.call?.argsRaw : block.argsRaw;
    const summary = summarizeTool(name, argsRaw);
    const output = settled ? resultText(block.content) : '';
    return (_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx("span", { className: ui.grow, children: name }), _jsx(Pill, { children: summary.kind })] }), _jsxs("div", { className: css.detailBlock, children: [_jsx("span", { className: css.detailLabel, children: t('details.arguments') }), _jsx("pre", { className: css.pre, tabIndex: 0, role: "region", "aria-label": t('details.arguments'), children: argsRaw ?? '—' })] }), settled
                ? (_jsxs("div", { className: css.detailBlock, children: [_jsxs("span", { className: css.detailRow, children: [_jsx("span", { className: css.detailLabel, children: t('details.output') }), output === '' ? null : _jsx(OutputToolbar, { text: output, wrap: wrap, onWrap: setWrap })] }), output === ''
                            ? _jsx("pre", { className: css.pre, tabIndex: 0, role: "region", "aria-label": t('details.output'), children: "\u2014" })
                            : _jsx(AnsiOutput, { text: output, wrap: wrap })] }))
                : null] }));
}
/** The docked preview sidebar with its three content views. */
export function Aside({ navigation, sessionId, cwd }) {
    const t = useT();
    const state = useNavigation(navigation);
    const tabPrefix = useId();
    const tabRefs = useRef({ changes: null, goal: null, details: null });
    const tabs = [
        { id: 'changes', label: t('git.changes') },
        { id: 'goal', label: t('goal.title') },
        { id: 'details', label: t('details.title') },
    ];
    const panelId = `${tabPrefix}-panel`;
    const moveTab = (event, index) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End')
            return;
        event.preventDefault();
        const next = event.key === 'Home'
            ? 0
            : event.key === 'End'
                ? tabs.length - 1
                : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        const tab = tabs[next];
        if (tab === undefined)
            return;
        navigation.openAside(tab.id);
        tabRefs.current[tab.id]?.focus();
    };
    return (_jsxs("aside", { className: css.aside, "aria-label": t('details.title'), children: [_jsxs("header", { className: `${css.header} ${ui.cardHeader}`, children: [_jsx("span", { className: css.headerTitle, children: t('aside.title') }), _jsx("button", { type: "button", className: css.headerClose, "aria-label": t('aside.close'), onClick: () => { navigation.toggleAside(); }, children: _jsx(IconCloseOutline16, {}) })] }), _jsx("div", { className: css.tabs, role: "tablist", "aria-label": t('aside.title'), children: tabs.map((tab, index) => (_jsx("button", { ref: element => { tabRefs.current[tab.id] = element; }, type: "button", role: "tab", id: `${tabPrefix}-${tab.id}`, "aria-selected": state.aside === tab.id, "aria-controls": panelId, tabIndex: state.aside === tab.id ? 0 : -1, className: `${css.tab} ${state.aside === tab.id ? css.tabActive : ''}`, onClick: () => { navigation.openAside(tab.id); }, onKeyDown: event => { moveTab(event, index); }, children: tab.label }, tab.id))) }), _jsxs("div", { id: panelId, className: css.body, role: "tabpanel", tabIndex: 0, "aria-labelledby": `${tabPrefix}-${state.aside}`, "aria-label": tabs.find(tab => tab.id === state.aside)?.label, children: [state.aside === 'changes'
                        ? (_jsxs(_Fragment, { children: [_jsx(GitPanel, { cwd: cwd, sessionId: sessionId, selected: state.diff?.path, onOpenDiff: (path, staged) => { navigation.openDiff(path, staged); } }), state.diff === undefined || cwd === undefined
                                    ? null
                                    : (_jsx(DiffViewer, { cwd: cwd, path: state.diff.path, staged: state.diff.staged, onClose: () => { navigation.closeDiff(); } }))] }))
                        : null, state.aside === 'goal' ? _jsx(GoalPanel, { sessionId: sessionId }) : null, state.aside === 'details'
                        ? _jsx(DetailsPanel, { sessionId: sessionId, callId: state.inspectedCallId, cwd: cwd, diff: state.diff })
                        : null] })] }));
}
//# sourceMappingURL=Aside.js.map