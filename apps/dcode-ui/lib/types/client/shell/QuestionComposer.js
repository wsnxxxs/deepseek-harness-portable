import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Codex-style composer takeover for ask-user-question and plan review waits. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconCheckOutline14, IconChevronLeftOutline14, IconChevronRightOutline14, IconChecklistOutline14, IconCloseOutline16, IconEditOutline16, IconQuestionOutline14, MarkdownText, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useT } from "../state/i18n.js";
import { Button, Spinner } from "./ui.js";
import css from './QuestionComposer.module.css';
/** Keep the wire label intact while making the recommendation badge readable. */
function parseRecommendedLabel(label) {
    const suffix = /\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i;
    return suffix.test(label)
        ? { label: label.replace(suffix, ''), recommended: true }
        : { label, recommended: false };
}
/** The plan-review presentation is valid only when two buttons can answer it. */
function planReviewOf(questions) {
    if (questions.length !== 1)
        return undefined;
    const question = questions[0];
    if (question === undefined || question.intent?.kind !== 'plan-review' || question.detail === undefined) {
        return undefined;
    }
    if (question.multiSelect === true)
        return undefined;
    const options = question.options ?? [];
    if (options.length > 2)
        return undefined;
    const approve = options.find(option => option.label === question.intent?.approve);
    if (approve === undefined)
        return undefined;
    const decline = options.find(option => option.label !== approve.label);
    return {
        id: question.id,
        question: question.question,
        plan: question.detail,
        approve,
        ...(decline === undefined ? {} : { decline }),
    };
}
function answerable(draft) {
    return draft.selected.length > 0 || draft.custom.trim() !== '';
}
function completed(draft) {
    return answerable(draft) || draft.skipped;
}
function isComposing(event) {
    return event.nativeEvent.isComposing;
}
function answerPayload(questions, drafts) {
    return {
        answers: questions.map((question, index) => {
            const draft = drafts[index] ?? { selected: [], custom: '', skipped: true };
            if (draft.skipped)
                return { id: question.id, selected: [] };
            const custom = draft.custom.trim();
            return {
                id: question.id,
                selected: custom === '' || question.multiSelect === true ? [...draft.selected] : [],
                ...(custom === '' ? {} : { custom }),
            };
        }),
    };
}
/** The generic multi-step question card. */
function QuestionFlow({ pending }) {
    const t = useT();
    const questions = pending.questions;
    const labels = useMemo(() => ({
        code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
        footnotes: t('details.title'),
    }), [t]);
    const [index, setIndex] = useState(0);
    const [drafts, setDrafts] = useState(() => questions.map(() => ({
        selected: [], custom: '', skipped: false,
    })));
    const [busy, setBusy] = useState(null);
    const [error, setError] = useState();
    const optionRefs = useRef({});
    const question = questions[index];
    const hasOptions = (question?.options?.length ?? 0) > 0;
    useEffect(() => {
        if (hasOptions)
            optionRefs.current[0]?.focus();
    }, [index, pending.key]);
    const updateDraft = (update) => {
        setDrafts(current => current.map((draft, draftIndex) => draftIndex === index ? update(draft) : draft));
        setError(undefined);
    };
    const submit = (values) => {
        const missing = values.findIndex(draft => !completed(draft));
        if (missing >= 0) {
            setIndex(missing);
            setError(t('question.errorIncomplete'));
            return;
        }
        setBusy('answer');
        setError(undefined);
        void pending.answer(answerPayload(questions, values)).catch((cause) => {
            setBusy(null);
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    };
    const cancel = () => {
        setBusy('cancel');
        setError(undefined);
        void pending.cancel().catch((cause) => {
            setBusy(null);
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    };
    if (question === undefined)
        return null;
    const draft = drafts[index] ?? { selected: [], custom: '', skipped: false };
    const choose = (label) => {
        updateDraft(current => question.multiSelect === true
            ? {
                ...current,
                selected: current.selected.includes(label)
                    ? current.selected.filter(item => item !== label)
                    : [...current.selected, label],
                skipped: false,
            }
            : { selected: [label], custom: '', skipped: false });
        if (question.multiSelect !== true && index < questions.length - 1)
            setIndex(index + 1);
    };
    const continueFlow = () => {
        if (!answerable(draft)) {
            setError(t('question.errorUnanswered'));
            return;
        }
        if (index < questions.length - 1) {
            setIndex(index + 1);
            setError(undefined);
            return;
        }
        submit(drafts);
    };
    const skip = () => {
        const nextDrafts = drafts.map((value, draftIndex) => draftIndex === index
            ? { selected: [], custom: '', skipped: true }
            : value);
        setDrafts(nextDrafts);
        setError(undefined);
        if (index < questions.length - 1) {
            setIndex(index + 1);
            return;
        }
        submit(nextDrafts);
    };
    const changeCustom = (event) => {
        const value = event.target.value;
        updateDraft(current => ({
            ...current,
            selected: question.multiSelect === true ? current.selected : [],
            custom: value,
            skipped: false,
        }));
    };
    const continueFromCustom = (event) => {
        if (event.key !== 'Enter' || event.shiftKey || isComposing(event))
            return;
        event.preventDefault();
        continueFlow();
    };
    const moveOption = (event, optionIndex) => {
        if (question.multiSelect === true)
            return;
        const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1
            : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
        if (direction === 0)
            return;
        event.preventDefault();
        const count = question.options?.length ?? 0;
        const next = (optionIndex + direction + count) % count;
        optionRefs.current[next]?.focus();
    };
    const selectedOptionIndex = question.options?.findIndex(option => draft.selected.includes(option.label)) ?? -1;
    return (_jsx("div", { className: css.frame, "data-question-key": pending.key, children: _jsxs("section", { className: css.card, "aria-labelledby": `question-${pending.key}-${String(index)}`, children: [_jsxs("header", { className: css.header, children: [_jsxs("span", { className: css.kicker, children: [_jsx(IconQuestionOutline14, {}), question.header ?? t('question.title')] }), _jsxs("div", { className: css.headerActions, children: [_jsxs("span", { className: css.counter, children: [index + 1, " / ", questions.length] }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": t('question.cancel'), title: t('question.cancel'), disabled: busy !== null, onClick: cancel, children: _jsx(IconCloseOutline16, {}) })] })] }), _jsxs("div", { className: css.body, children: [_jsx("h2", { className: css.title, id: `question-${pending.key}-${String(index)}`, children: question.question }), question.detail === undefined ? null : (_jsx("div", { className: css.detail, children: _jsx(MarkdownText, { text: question.detail, labels: labels }) })), _jsxs("div", { className: css.options, children: [_jsx("div", { className: css.optionGroup, role: question.multiSelect === true ? 'group' : 'radiogroup', "aria-label": question.question, children: (question.options ?? []).map((option, optionIndex) => {
                                        const selected = draft.selected.includes(option.label);
                                        const display = parseRecommendedLabel(option.label);
                                        return (_jsxs("button", { ref: (node) => { optionRefs.current[optionIndex] = node; }, type: "button", className: `${css.option} ${selected ? css.optionSelected : ''}`, role: question.multiSelect === true ? 'checkbox' : 'radio', "aria-checked": selected, tabIndex: question.multiSelect === true
                                                || (selectedOptionIndex >= 0 ? selected : optionIndex === 0) ? 0 : -1, disabled: busy !== null, onClick: () => { choose(option.label); }, onKeyDown: event => { moveOption(event, optionIndex); }, children: [_jsx("span", { className: question.multiSelect === true
                                                        ? `${css.checkbox} ${selected ? css.checkboxSelected : ''}`
                                                        : `${css.radio} ${selected ? css.radioSelected : ''}`, "aria-hidden": true, children: selected && _jsx(IconCheckOutline14, { size: 12 }) }), _jsxs("span", { className: css.optionCopy, children: [_jsx("span", { className: css.optionLabel, children: display.label }), display.recommended ? _jsx("span", { className: css.badge, children: t('question.recommended') }) : null, option.description === undefined ? null : (_jsx("span", { className: css.description, children: option.description }))] })] }, `${option.label}-${String(optionIndex)}`));
                                    }) }), hasOptions ? (_jsxs("label", { className: `${css.customRow} ${draft.custom !== '' ? css.customRowActive : ''}`, children: [_jsx("span", { className: question.multiSelect === true
                                                ? `${css.checkbox} ${draft.custom !== '' ? css.checkboxSelected : ''}`
                                                : css.customIcon, "aria-hidden": true, children: question.multiSelect === true
                                                ? draft.custom !== '' && _jsx(IconCheckOutline14, { size: 12 })
                                                : _jsx(IconEditOutline16, { size: 14 }) }), _jsx("textarea", { className: css.customInput, rows: 1, value: draft.custom, disabled: busy !== null, placeholder: t('question.custom'), "aria-label": t('question.custom'), onChange: changeCustom, onKeyDown: continueFromCustom })] })) : (_jsx("textarea", { autoFocus: true, className: css.freeInput, rows: 2, value: draft.custom, disabled: busy !== null, placeholder: t('question.custom'), "aria-label": t('question.custom'), onChange: changeCustom, onKeyDown: continueFromCustom }))] })] }), _jsxs("footer", { className: css.footer, children: [_jsxs("div", { className: css.pager, children: [_jsx("button", { type: "button", className: css.iconButton, "aria-label": t('question.previous'), disabled: index === 0 || busy !== null, onClick: () => { setIndex(value => value - 1); setError(undefined); }, children: _jsx(IconChevronLeftOutline14, {}) }), _jsx("button", { type: "button", className: css.iconButton, "aria-label": t('question.next'), disabled: index === questions.length - 1 || busy !== null, onClick: () => { setIndex(value => value + 1); setError(undefined); }, children: _jsx(IconChevronRightOutline14, {}) })] }), _jsx("div", { className: css.feedback, role: "alert", children: error }), _jsxs("div", { className: css.footerActions, children: [_jsx(Button, { disabled: busy !== null, onClick: skip, children: t('question.skip') }), _jsx(Button, { primary: true, disabled: busy !== null || !answerable(draft), onClick: continueFlow, children: busy === 'answer' ? _jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), t('question.submitting')] }) : index === questions.length - 1 ? t('question.submit') : t('question.continue') })] })] })] }) }));
}
/** The plan-review approval card supplied by the same pending question wire. */
function PlanReviewCard({ pending, review }) {
    const t = useT();
    const labels = useMemo(() => ({
        code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
        footnotes: t('details.title'),
    }), [t]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState();
    const settle = (send) => {
        setBusy(true);
        setError(undefined);
        void send().catch((cause) => {
            setBusy(false);
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    };
    return (_jsx("div", { className: css.frame, "data-plan-review-key": pending.key, children: _jsxs("section", { className: `${css.card} ${css.reviewCard}`, "aria-label": review.question, children: [_jsx("header", { className: css.reviewHeader, children: _jsxs("span", { className: css.kicker, children: [_jsx(IconChecklistOutline14, {}), t('question.planReview')] }) }), _jsxs("div", { className: css.reviewBody, children: [_jsx("h2", { className: css.title, children: review.question }), _jsx("div", { className: css.plan, children: _jsx(MarkdownText, { text: review.plan, labels: labels }) })] }), _jsxs("footer", { className: css.reviewFooter, children: [_jsx("div", { className: css.feedback, role: "alert", children: error }), _jsxs("div", { className: css.footerActions, children: [_jsx(Button, { disabled: busy, onClick: () => { settle(() => pending.cancel()); }, children: t('question.discuss') }), review.decline === undefined ? null : (_jsx(Button, { disabled: busy, title: review.decline.description, onClick: () => { settle(() => pending.answer({ answers: [{ id: review.id, selected: [review.decline.label] }] })); }, children: t('question.decline') })), _jsx(Button, { primary: true, autoFocus: true, disabled: busy, title: review.approve.description, onClick: () => { settle(() => pending.answer({ answers: [{ id: review.id, selected: [review.approve.label] }] })); }, children: busy ? _jsxs(_Fragment, { children: [_jsx(Spinner, { size: "sm" }), t('question.submitting')] }) : t('question.approve') })] })] })] }) }));
}
/** Route the pending request to the plan-review or generic question surface. */
export function QuestionComposer({ pending }) {
    const review = useMemo(() => planReviewOf(pending.questions), [pending]);
    return review === undefined
        ? _jsx(QuestionFlow, { pending: pending }, pending.key)
        : _jsx(PlanReviewCard, { pending: pending, review: review }, pending.key);
}
//# sourceMappingURL=QuestionComposer.js.map