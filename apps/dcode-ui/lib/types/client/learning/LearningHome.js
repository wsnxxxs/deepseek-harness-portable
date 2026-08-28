import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Learning mode as a first-class surface.
 *
 * Everything here drives the Interactive Learning pack this distribution
 * already ships: starting a session selects its `learning` agent preset and
 * sends the pack's own opening prompt, and the library, concept cards, notes
 * and visuals are the pack's own `VaultLibrary` reading the same
 * `/interactive-learning` channel the classic UI's views read. No learning
 * state or backend is duplicated here — this module is navigation and framing
 * around capabilities that already exist.
 * @module @dsh-portable/dcode-ui/client/learning/LearningHome
 */
import { useCallback, useMemo, useState } from 'react';
import { IconChevronLeftOutline14, IconGoalOutline16, IconQuestionOutline14, IconSkillOutline16, IconSparkle16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { VaultLibrary } from '@dsh-portable/interactive-learning/client';
import { useRuntime } from "../state/runtime.js";
import { useSessionList } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import { EmptyState } from "../shell/ui.js";
import css from './LearningHome.module.css';
/** The agent preset the Interactive Learning pack installs. */
const LEARNING_PRESET = 'learning';
const MODES = [
    { id: 'concept', titleKey: 'learning.concept', bodyKey: 'learning.conceptBody' },
    { id: 'problem', titleKey: 'learning.problem', bodyKey: 'learning.problemBody' },
    { id: 'material', titleKey: 'learning.material', bodyKey: 'learning.materialBody' },
];
/** Learning entry points, the current learning session, and the vault. */
export function LearningHome({ navigation, cwd, sessionId }) {
    const runtime = useRuntime();
    const t = useT();
    const list = useSessionList();
    const [section, setSection] = useState('start');
    const [starting, setStarting] = useState(false);
    const [failure, setFailure] = useState(undefined);
    // Learning sessions are the ones whose durable agent preset is the pack's,
    // exactly the fact the classic UI's tab gate reads.
    const learningSessions = useMemo(() => list.ids
        .map(id => list.byId[id])
        .filter((summary) => summary !== undefined
        && summary.projectionValues?.agentPreset === LEARNING_PRESET), [list]);
    const start = useCallback((mode) => {
        const nav = runtime.navigation;
        if (nav === undefined)
            return;
        setStarting(true);
        setFailure(undefined);
        void (async () => {
            try {
                // Reuse-or-create a blank session in the current workspace, then put it
                // on the learning preset. Both steps are the Host's own verbs.
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
                // The pack routes on the learner's own words; these open the mode it
                // should teach in rather than pre-empting the topic.
                const opening = mode.id === 'concept'
                    ? t('learning.concept')
                    : mode.id === 'problem' ? t('learning.problem') : t('learning.material');
                const face = runtime.binding(target)?.session;
                if (face !== undefined) {
                    const handle = face.beginSubmission({ text: opening, images: [] });
                    await face.prompt([{ type: 'text', text: opening }], 'queue', undefined, handle.requestId);
                }
            }
            catch (cause) {
                setFailure(cause instanceof Error ? cause.message : String(cause));
            }
            finally {
                setStarting(false);
            }
        })();
    }, [runtime, navigation, cwd, sessionId, t]);
    const sections = [
        { id: 'start', label: t('learning.title') },
        { id: 'current', label: t('learning.current') },
        { id: 'library', label: t('learning.library'), group: t('settings.group.data') },
        { id: 'concepts', label: t('learning.cards') },
        { id: 'notes', label: t('learning.notes') },
        { id: 'visuals', label: t('learning.visuals') },
    ];
    return (_jsxs("div", { className: css.surface, children: [_jsxs("nav", { className: css.rail, "aria-label": t('learning.title'), children: [_jsxs("button", { type: "button", className: css.back, onClick: () => { navigation.show('session'); }, children: [_jsx(IconChevronLeftOutline14, {}), t('nav.backToWorkspace')] }), sections.map(entry => (_jsxs("div", { children: [entry.group === undefined ? null : _jsx("div", { className: css.railGroup, children: entry.group }), _jsx("button", { type: "button", className: `${css.railItem} ${section === entry.id ? css.railItemActive : ''}`, onClick: () => { setSection(entry.id); }, children: entry.label })] }, entry.id)))] }), _jsx("div", { className: css.body, children: _jsxs("div", { className: css.inner, children: [section === 'start'
                            ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: css.title, children: t('learning.title') }), _jsx("p", { className: css.subtitle, children: t('learning.subtitle') })] }), _jsx("div", { className: css.grid, children: MODES.map(mode => (_jsxs("button", { type: "button", className: css.mode, disabled: starting || runtime.navigation === undefined, onClick: () => { start(mode); }, children: [_jsxs("span", { className: css.modeTitle, children: [mode.id === 'concept'
                                                            ? _jsx(IconSparkle16, {})
                                                            : mode.id === 'problem' ? _jsx(IconQuestionOutline14, { size: 16 }) : _jsx(IconSkillOutline16, {}), t(mode.titleKey)] }), _jsx("span", { className: css.modeBody, children: t(mode.bodyKey) })] }, mode.id))) }), failure === undefined ? null : _jsx("p", { className: css.note, children: failure }), cwd === undefined ? _jsx("p", { className: css.note, children: t('learning.needsWorkspace') }) : null] }))
                            : null, section === 'current'
                            ? (_jsxs(_Fragment, { children: [_jsx("div", { className: css.title, children: t('learning.current') }), learningSessions.length === 0
                                        ? _jsx(EmptyState, { children: t('learning.currentNone') })
                                        : learningSessions.map(summary => (_jsxs("button", { type: "button", className: css.sessionRow, onClick: () => {
                                                runtime.sessions.open(summary.id);
                                                navigation.show('session');
                                            }, children: [_jsx(IconGoalOutline16, {}), _jsx("span", { className: css.sessionTitle, children: summary.displayTitle }), _jsx("span", { className: css.note, children: summary.cwd })] }, summary.id)))] }))
                            : null, section === 'library' || section === 'concepts' || section === 'notes' || section === 'visuals'
                            ? (_jsxs(_Fragment, { children: [_jsx("div", { className: css.title, children: section === 'library'
                                            ? t('learning.library')
                                            : section === 'concepts' ? t('learning.cards') : section === 'notes' ? t('learning.notes') : t('learning.visuals') }), cwd === undefined
                                        ? _jsx(EmptyState, { children: t('learning.needsWorkspace') })
                                        : (_jsx("div", { className: css.library, children: _jsx(VaultLibrary, { cwd: cwd, call: runtime.learningCall, t: runtime.learningT, embedded: true }) }))] }))
                            : null] }) })] }));
}
//# sourceMappingURL=LearningHome.js.map