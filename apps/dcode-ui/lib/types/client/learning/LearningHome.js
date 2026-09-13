import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Learning mode as a focused workbench surface.
 *
 * This page owns the learning entry points and the list of existing learning
 * sessions. Materials are attached from the conversation when the learner
 * chooses the material flow; there is no separate library surface.
 * @module @dsh-portable/dcode-ui/client/learning/LearningHome
 */
import { useCallback, useMemo, useState } from 'react';
import { IconChevronLeftOutline14, IconGoalOutline16, IconQuestionOutline14, IconSkillOutline16, IconSparkle16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useAsync, useSessionList } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { EmptyState } from "../shell/ui.js";
import css from './LearningHome.module.css';
/** The agent preset installed by the Interactive Learning pack. */
const LEARNING_PRESET = 'learning';
const MODES = [
    { id: 'concept', titleKey: 'learning.concept', bodyKey: 'learning.conceptBody' },
    { id: 'problem', titleKey: 'learning.problem', bodyKey: 'learning.problemBody' },
    { id: 'material', titleKey: 'learning.material', bodyKey: 'learning.materialBody' },
];
/** Learning entry points and the current learning-session list. */
export function LearningHome({ navigation, cwd, sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const list = useSessionList();
    const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
    const learningAvailable = roster.value?.ok === true
        && roster.value.value.presets.some(preset => preset.id === LEARNING_PRESET);
    const [section, setSection] = useState('start');
    const [starting, setStarting] = useState(false);
    const [failure, setFailure] = useState();
    const learningSessions = useMemo(() => list.ids
        .map(id => list.byId[id])
        .filter((summary) => (summary !== undefined
        && summary.projectionValues?.agentPreset === LEARNING_PRESET)), [list]);
    const start = useCallback((mode) => {
        const nav = runtime.navigation;
        if (nav === undefined || starting || !learningAvailable)
            return;
        setStarting(true);
        setFailure(undefined);
        void (async () => {
            try {
                const workspace = runtime.workspaces.list.getSnapshot().items
                    .find(item => item.path === cwd);
                const target = workspace === undefined
                    ? sessionId
                    : await nav.connectWorkspace(workspace.workspaceId);
                if (target === undefined) {
                    setFailure(t('learning.needsWorkspace'));
                    return;
                }
                const selected = await runtime.remote.agentPresets.select(target, LEARNING_PRESET);
                if (!selected.ok) {
                    setFailure(selected.error.message);
                    return;
                }
                runtime.sessions.open(target);
                navigation.show('session');
                const opening = mode.id === 'concept'
                    ? t('learning.concept')
                    : mode.id === 'problem' ? t('learning.problem') : t('learning.material');
                const face = runtime.binding(target)?.session;
                if (face !== undefined) {
                    const handle = face.beginSubmission({ mode: 'queue', text: opening, attachments: [] });
                    const sent = await face.prompt([{ type: 'text', text: opening }], 'queue', undefined, handle.requestId);
                    if (!sent.ok) {
                        handle.abandon();
                        setFailure(sent.error.message);
                    }
                }
            }
            catch (cause) {
                setFailure(cause instanceof Error ? cause.message : String(cause));
            }
            finally {
                setStarting(false);
            }
        })();
    }, [cwd, learningAvailable, navigation, runtime, sessionId, starting, t]);
    return (_jsxs("div", { className: css.surface, children: [_jsxs("nav", { className: css.rail, "aria-label": t('learning.title'), children: [_jsxs("button", { type: "button", className: css.back, onClick: () => { navigation.show('session'); }, children: [_jsx(IconChevronLeftOutline14, {}), t('nav.backToWorkspace')] }), [
                        ['start', t('learning.title')],
                        ['current', t('learning.current')],
                    ].map(([id, label]) => (_jsx("button", { type: "button", className: `${css.railItem} ${section === id ? css.railItemActive : ''}`, onClick: () => { setSection(id); }, "aria-current": section === id ? 'page' : undefined, children: label }, id)))] }), _jsx("div", { className: css.body, children: _jsx("div", { className: css.inner, children: section === 'start'
                        ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: css.title, children: t('learning.title') }), _jsx("p", { className: css.subtitle, children: t('learning.subtitle') })] }), _jsx("div", { className: css.grid, children: MODES.map(mode => (_jsxs("button", { type: "button", className: css.mode, disabled: starting || !learningAvailable || runtime.navigation === undefined, onClick: () => { start(mode); }, children: [_jsxs("span", { className: css.modeTitle, children: [mode.id === 'concept'
                                                        ? _jsx(IconSparkle16, {})
                                                        : mode.id === 'problem' ? _jsx(IconQuestionOutline14, { size: 16 }) : _jsx(IconSkillOutline16, {}), t(mode.titleKey)] }), _jsx("span", { className: css.modeBody, children: t(mode.bodyKey) })] }, mode.id))) }), failure === undefined ? null : _jsx("p", { className: css.note, role: "alert", children: failure }), !learningAvailable && !roster.loading ? _jsx("p", { className: css.note, role: "status", children: t('learning.unavailable') }) : null, cwd === undefined ? _jsx("p", { className: css.note, children: t('learning.needsWorkspace') }) : null] }))
                        : (_jsxs(_Fragment, { children: [_jsx("div", { className: css.title, children: t('learning.current') }), learningSessions.length === 0
                                    ? _jsx(EmptyState, { children: t('learning.currentNone') })
                                    : learningSessions.map(summary => (_jsxs("button", { type: "button", className: css.sessionRow, onClick: () => {
                                            runtime.sessions.open(summary.id);
                                            navigation.show('session');
                                        }, children: [_jsx(IconGoalOutline16, {}), _jsx("span", { className: css.sessionTitle, children: summary.displayTitle }), _jsx("span", { className: css.note, children: summary.cwd })] }, summary.id)))] })) }) })] }));
}
//# sourceMappingURL=LearningHome.js.map