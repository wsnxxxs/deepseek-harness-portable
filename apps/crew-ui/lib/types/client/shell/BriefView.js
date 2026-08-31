import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRuntime } from "../state/runtime.js";
import css from './BriefView.module.css';
/** The mission summary tab. */
export function BriefView({ view, presetId, cwd }) {
    const { t } = useRuntime();
    const tasks = (view?.tasks ?? []).filter(task => task.status !== 'deleted');
    const done = tasks.filter(task => task.status === 'completed').length;
    const conflicts = tasks.flatMap(task => (task.writeScopeWarnings.map(warning => ({ subject: task.subject, warning }))));
    return (_jsxs("div", { className: css.root, children: [_jsx("h2", { className: css.title, children: t('brief.title') }), _jsxs("dl", { className: css.facts, children: [_jsxs("div", { className: css.fact, children: [_jsx("dt", { children: t('brief.mode') }), _jsx("dd", { children: presetId ?? '—' })] }), _jsxs("div", { className: css.fact, children: [_jsx("dt", { children: t('brief.workspace') }), _jsx("dd", { className: css.path, children: cwd ?? '—' })] }), _jsxs("div", { className: css.fact, children: [_jsx("dt", { children: t('brief.tasks') }), _jsx("dd", { children: t('brief.tasksValue', { done, total: tasks.length }) })] }), _jsxs("div", { className: css.fact, children: [_jsx("dt", { children: t('brief.crew') }), _jsx("dd", { children: t('brief.crewValue', { count: view?.members.length ?? 0 }) })] })] }), _jsx("p", { className: css.note, children: t('brief.locked') }), _jsxs("section", { className: css.section, children: [_jsx("h3", { className: css.sectionTitle, children: t('brief.warnings') }), conflicts.length === 0
                        ? _jsx("p", { className: css.empty, children: t('brief.noWarnings') })
                        : (_jsx("ul", { className: css.conflicts, children: conflicts.map(conflict => (_jsxs("li", { className: css.conflict, children: [_jsx("span", { className: css.conflictTask, children: conflict.subject }), _jsx("span", { className: css.conflictBody, children: conflict.warning })] }, `${conflict.subject}:${conflict.warning}`))) }))] })] }));
}
//# sourceMappingURL=BriefView.js.map