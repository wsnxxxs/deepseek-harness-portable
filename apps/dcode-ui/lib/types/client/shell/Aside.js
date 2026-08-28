import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The right column: Git changes, Goal and Progress, and the details of
 * whatever the operator last clicked.
 *
 * Goal is the host-computed `goal` projection — the same value the official
 * goal bar renders — and Progress is the session's own todo list, folded from
 * the `todo_write` calls in the transcript. Neither is workbench state: close
 * the window and reopen it in the classic UI and the same facts are there.
 * @module @dsh-portable/dcode-ui/client/shell/Aside
 */
import { useMemo, useState } from 'react';
import { IconChecklistOutline14, IconCheckOutline14, IconGoalOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useAsync, useChatSnapshot, useProjectionValue } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { useNavigation } from "../state/navigation.js";
import { useRuntime } from "../state/runtime.js";
import { GitPanel } from "../git/GitPanel.js";
import { DiffViewer } from "../git/DiffViewer.js";
import { EmptyState, Pill, Spinner, ui } from "./ui.js";
import { parseArgs, resultText, summarizeTool } from "../chat/tools.js";
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
function latestTodos(nodes) {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (node?.kind !== 'tool-result')
            continue;
        for (const block of walkCalls(node)) {
            const name = 'isError' in block ? block.call?.name : block.name;
            if (name !== 'todo_write')
                continue;
            const argsRaw = 'isError' in block ? block.call?.argsRaw : block.argsRaw;
            const todos = parseArgs(argsRaw).todos;
            if (!Array.isArray(todos))
                continue;
            return todos.filter((row) => typeof row === 'object' && row !== null
                && typeof row.content === 'string');
        }
    }
    return [];
}
/** Goal and Progress. */
function GoalPanel({ sessionId }) {
    const t = useT();
    const goal = useProjectionValue(sessionId, 'goal');
    const chat = useChatSnapshot(sessionId);
    const todos = useMemo(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
    const done = todos.filter(todo => todo.status === 'completed').length;
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx(IconGoalOutline16, {}), _jsx("span", { className: ui.grow, children: t('goal.title') }), goal == null
                                ? null
                                : (_jsx(Pill, { children: goal.goal.phase === 'completed'
                                        ? t('goal.complete')
                                        : goal.goal.phase === 'paused' ? t('goal.paused') : t('goal.active') }))] }), goal == null
                        ? _jsx(EmptyState, { children: t('goal.none') })
                        : (_jsx("div", { className: css.goal, children: _jsxs("div", { className: css.goalText, children: [goal.goal.objective, _jsxs("div", { className: css.goalMeta, children: [done, "/", todos.length || '—', " \u00B7 ", goal.roundsStarted, " rounds"] })] }) }))] }), _jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx(IconChecklistOutline14, {}), _jsx("span", { className: ui.grow, children: t('progress.title') }), todos.length === 0 ? null : _jsxs(Pill, { children: [done, "/", todos.length] })] }), todos.length === 0
                        ? _jsx(EmptyState, { children: t('progress.none') })
                        : todos.map((todo, index) => (_jsxs("div", { className: `${css.step} ${todo.status === 'completed' ? css.stepDone : ''} ${todo.status === 'in_progress' ? css.stepActive : ''}`, children: [_jsx("span", { className: `${css.stepMark} ${todo.status === 'completed' ? css.stepMarkDone : ''}`, "aria-hidden": true, children: todo.status === 'completed' ? _jsx(IconCheckOutline14, {}) : todo.status === 'in_progress' ? '◐' : '○' }), _jsx("span", { children: todo.content })] }, `${String(index)}:${todo.content}`)))] })] }));
}
/** Arguments and output of the tool call the operator last opened. */
function DetailsPanel({ sessionId, callId, cwd, diff, }) {
    const runtime = useRuntime();
    const t = useT();
    const chat = useChatSnapshot(sessionId);
    const [wrap, setWrap] = useState(true);
    const block = useMemo(() => {
        if (callId === undefined)
            return undefined;
        for (const node of chat?.legacy.nodes ?? []) {
            if (node.kind !== 'tool-result')
                continue;
            for (const candidate of walkCalls(node)) {
                if (candidate.callId === callId)
                    return candidate;
            }
        }
        for (const running of chat?.legacy.runningCalls ?? []) {
            for (const candidate of walkCalls(running)) {
                if (candidate.callId === callId)
                    return candidate;
            }
        }
        return undefined;
    }, [chat, callId]);
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
                    : _jsx("pre", { className: css.pre, children: currentFile.value.text })] }));
    }
    const settled = 'isError' in block;
    const name = settled ? block.call?.name ?? 'tool' : block.name;
    const argsRaw = settled ? block.call?.argsRaw : block.argsRaw;
    const summary = summarizeTool(name, argsRaw);
    const output = settled ? resultText(block.content) : '';
    return (_jsxs("section", { className: css.section, children: [_jsxs("header", { className: css.sectionHead, children: [_jsx("span", { className: ui.grow, children: name }), _jsx(Pill, { children: summary.kind })] }), _jsxs("div", { className: css.detailBlock, children: [_jsx("span", { className: css.detailLabel, children: t('details.arguments') }), _jsx("pre", { className: css.pre, children: argsRaw ?? '—' })] }), settled
                ? (_jsxs("div", { className: css.detailBlock, children: [_jsxs("span", { className: css.detailRow, children: [_jsx("span", { className: css.detailLabel, children: t('details.output') }), output === '' ? null : _jsx(OutputToolbar, { text: output, wrap: wrap, onWrap: setWrap })] }), output === ''
                            ? _jsx("pre", { className: css.pre, children: "\u2014" })
                            : _jsx(AnsiOutput, { text: output, wrap: wrap })] }))
                : null] }));
}
/** The right column with its three tabs. */
export function Aside({ navigation, sessionId, cwd }) {
    const t = useT();
    const state = useNavigation(navigation);
    const tabs = [
        { id: 'changes', label: t('git.changes') },
        { id: 'goal', label: t('goal.title') },
        { id: 'details', label: t('details.title') },
    ];
    return (_jsxs("aside", { className: css.aside, "aria-label": t('details.title'), children: [_jsx("div", { className: css.tabs, children: tabs.map(tab => (_jsx("button", { type: "button", className: `${css.tab} ${state.aside === tab.id ? css.tabActive : ''}`, onClick: () => { navigation.openAside(tab.id); }, children: tab.label }, tab.id))) }), _jsxs("div", { className: css.body, children: [state.aside === 'changes'
                        ? (_jsxs(_Fragment, { children: [_jsx(GitPanel, { cwd: cwd, sessionId: sessionId, selected: state.diff?.path, onOpenDiff: (path, staged) => { navigation.openDiff(path, staged); } }), state.diff === undefined || cwd === undefined
                                    ? null
                                    : (_jsx(DiffViewer, { cwd: cwd, path: state.diff.path, staged: state.diff.staged, onClose: () => { navigation.closeDiff(); } }))] }))
                        : null, state.aside === 'goal' ? _jsx(GoalPanel, { sessionId: sessionId }) : null, state.aside === 'details'
                        ? _jsx(DetailsPanel, { sessionId: sessionId, callId: state.inspectedCallId, cwd: cwd, diff: state.diff })
                        : null] })] }));
}
//# sourceMappingURL=Aside.js.map