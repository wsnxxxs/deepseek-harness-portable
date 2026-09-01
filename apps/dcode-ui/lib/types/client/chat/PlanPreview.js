import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** The readable plan proposal surface used by the conversation and review flow. */
import { useCallback, useId, useState } from 'react';
import { FishLogo, IconChevronDownOutline14, IconEditOutline16, IconLightOutline16, IconPlayOutline16, MarkdownText, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useProjectionValue, useSessionSnapshot } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { Button, Spinner } from "../shell/ui.js";
import css from './PlanPreview.module.css';
const OPEN_TAG = '<proposed_plan>';
const CLOSE_TAG = '</proposed_plan>';
/** Find a tag without treating the assistant's case choice as visible text. */
function tagIndex(source, tag, from = 0) {
    return source.toLocaleLowerCase().indexOf(tag, from);
}
/** Extract the structured plan envelope used by planning agents. */
export function extractProposedPlan(text, allowPartial = false) {
    const source = String(text || '');
    const open = tagIndex(source, OPEN_TAG);
    if (open < 0 || tagIndex(source, OPEN_TAG, open + OPEN_TAG.length) >= 0)
        return undefined;
    const contentStart = open + OPEN_TAG.length;
    const close = tagIndex(source, CLOSE_TAG, contentStart);
    const trailingClose = close < 0 ? -1 : tagIndex(source, CLOSE_TAG, close + CLOSE_TAG.length);
    if (trailingClose >= 0 || (close < 0 && !allowPartial))
        return undefined;
    if (close < 0) {
        return {
            before: source.slice(0, open).trim(),
            plan: source.slice(contentStart).trim(),
            after: '',
            partial: true,
        };
    }
    return {
        before: source.slice(0, open).trim(),
        plan: source.slice(contentStart, close).trim(),
        after: source.slice(close + CLOSE_TAG.length).trim(),
        partial: false,
    };
}
/** Pull the first H1 out as the proposal headline, matching the source UI. */
export function splitPlanTitle(markdown, fallback) {
    const lines = String(markdown || '').split(/\r?\n/);
    const headingIndex = lines.findIndex(line => /^#\s+\S/.test(line.trim()));
    if (headingIndex < 0)
        return { title: fallback, body: markdown.trim() };
    const title = lines[headingIndex].trim().replace(/^#\s+/, '').trim();
    lines.splice(headingIndex, 1);
    return { title, body: lines.join('\n').trim() };
}
async function promptSession(session, text) {
    const handle = session.beginSubmission({ text, images: [] });
    try {
        const result = await session.prompt([{ type: 'text', text }], 'queue', undefined, handle.requestId);
        if (!result.ok) {
            handle.abandon();
            throw new Error(result.error.message);
        }
    }
    catch (cause) {
        handle.abandon();
        throw cause;
    }
}
/** A compact, glass version of the plan proposal shown in the conversation. */
export function PlanPreviewCard(props) {
    const t = useT();
    const runtime = useRuntime();
    const session = useSessionSnapshot(props.sessionId);
    const projectedPlan = useProjectionValue(props.sessionId, 'plan');
    const [expanded, setExpanded] = useState(false);
    const [editing, setEditing] = useState(false);
    const [refinement, setRefinement] = useState('');
    const [actionBusy, setActionBusy] = useState();
    const [error, setError] = useState();
    const contentId = useId();
    const refinementId = useId();
    const partial = props.partial === true;
    const projectedCurrent = projectedPlan?.active === true || projectedPlan?.pending === true;
    const planTransitioning = projectedPlan?.pending === true;
    const current = props.current ?? projectedCurrent;
    const { title, body } = splitPlanTitle(props.markdown, t('plan.title'));
    const canAct = props.sessionId !== undefined
        && current
        && !partial
        && !planTransitioning
        && props.actionsEnabled !== false
        && session?.running !== true
        && props.footer === undefined;
    const runAction = useCallback(async (kind, request) => {
        const sessionId = props.sessionId;
        if (!canAct || sessionId === undefined || actionBusy !== undefined)
            return;
        const face = runtime.binding(sessionId)?.session;
        if (face === undefined) {
            setError(t('plan.actionUnavailable'));
            return;
        }
        setActionBusy(kind);
        setError(undefined);
        try {
            if (kind === 'execute') {
                const command = await face.command('/plan off');
                if (!command.ok)
                    throw new Error(command.error.message);
                if (!command.value.matched)
                    throw new Error(t('plan.actionUnavailable'));
                await promptSession(face, t('plan.executePrompt'));
            }
            else {
                const value = request?.trim() ?? '';
                if (value === '')
                    return;
                await promptSession(face, t('plan.refinePrompt', { request: value }));
                setRefinement('');
                setEditing(false);
            }
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
        }
        finally {
            setActionBusy(undefined);
        }
    }, [actionBusy, canAct, props.sessionId, runtime, t]);
    const submitRefinement = () => {
        void runAction('refine', refinement);
    };
    const reviewFooter = props.footer;
    return (_jsxs("div", { className: css.wrapper, "data-plan-preview": "", "data-plan-current": current ? 'true' : 'false', "data-plan-partial": partial ? 'true' : 'false', children: [_jsxs("section", { className: css.card, "aria-label": props.ariaLabel ?? t('plan.title'), children: [_jsxs("header", { className: css.header, children: [_jsx("span", { className: css.kickerIcon, "aria-hidden": true, children: _jsx(IconLightOutline16, {}) }), _jsx("span", { className: css.kicker, children: partial ? t('plan.drafting') : current ? t('plan.current') : t('plan.title') }), _jsx("button", { type: "button", className: css.expandButton, "aria-label": expanded ? t('plan.collapse') : t('plan.expand'), "aria-expanded": expanded, "aria-controls": contentId, onClick: () => { setExpanded(value => !value); }, children: _jsx(IconChevronDownOutline14, { className: expanded ? css.expandIconOpen : undefined }) })] }), _jsxs("div", { className: css.previewRegion, children: [_jsxs("div", { id: contentId, className: `${css.body} ${expanded ? css.bodyExpanded : ''}`, children: [_jsx("h2", { className: css.title, children: title }), body === '' && partial
                                        ? (_jsxs("div", { className: css.preparing, role: "status", children: [_jsx("span", { className: css.preparingDot, "aria-hidden": true }), t('plan.preparing')] }))
                                        : body === ''
                                            ? null
                                            : _jsx("div", { className: css.markdown, children: _jsx(MarkdownText, { text: body, labels: props.labels, streaming: partial }) })] }), !expanded && body !== '' ? _jsx("div", { className: css.fade, "aria-hidden": true }) : null] }), reviewFooter !== undefined
                        ? _jsx("footer", { className: css.footer, children: reviewFooter })
                        : current && !partial
                            ? (_jsxs("footer", { className: css.footer, children: [editing
                                        ? (_jsxs("div", { className: css.editor, children: [_jsx("label", { className: css.visuallyHidden, htmlFor: refinementId, children: t('plan.modifyPlaceholder') }), _jsx("textarea", { id: refinementId, className: css.editorInput, value: refinement, rows: 2, autoFocus: true, placeholder: t('plan.modifyPlaceholder'), disabled: !canAct || actionBusy !== undefined, onChange: event => { setRefinement(event.target.value); setError(undefined); }, onKeyDown: event => {
                                                        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                                                            event.preventDefault();
                                                            submitRefinement();
                                                        }
                                                    } }), _jsxs("div", { className: css.editorActions, children: [_jsx(Button, { disabled: actionBusy !== undefined, onClick: () => { setEditing(false); setRefinement(''); setError(undefined); }, children: t('common.cancel') }), _jsx(Button, { primary: true, disabled: !canAct || actionBusy !== undefined || refinement.trim() === '', onClick: submitRefinement, children: actionBusy === 'refine' ? _jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), t('plan.submitting')] }) : t('plan.sendModification') })] })] }))
                                        : (_jsxs("div", { className: css.actions, children: [_jsxs(Button, { className: css.modifyButton, disabled: !canAct || actionBusy !== undefined, title: t('plan.modifyDescription'), onClick: () => { setEditing(true); setError(undefined); }, children: [_jsx(IconEditOutline16, {}), t('plan.modify')] }), _jsxs(Button, { className: css.executeButton, primary: true, disabled: !canAct || actionBusy !== undefined, title: t('plan.executeDescription'), onClick: () => { void runAction('execute'); }, children: [actionBusy === 'execute' ? _jsx(Spinner, { size: "sm" }) : _jsx(IconPlayOutline16, {}), t('plan.execute')] })] })), error === undefined ? null : _jsx("div", { className: css.error, role: "alert", children: error })] }))
                            : null] }), props.showStatus === true
                ? (_jsxs("div", { className: css.status, role: "status", "aria-live": "polite", children: [_jsx("span", { className: css.statusMark, "aria-hidden": true, children: _jsx(FishLogo, { size: 24 }) }), _jsx("span", { children: partial ? t('plan.statusDrafting') : t('plan.statusReady') })] }))
                : null] }));
}
//# sourceMappingURL=PlanPreview.js.map