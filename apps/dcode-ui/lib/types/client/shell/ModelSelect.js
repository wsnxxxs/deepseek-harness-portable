import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ModelSelect: two-level model and reasoning level selection for the composer.
 *
 * Implements the Figma 496:26454 MenuDropdown architecture:
 * - Root pane: 'Model' and 'Effort' drill-down rows
 * - Model pane: Provider-grouped model list with sticky headers and checkmark
 * - Effort pane: Reasoning effort levels for the current model
 * - Trigger: Model name + reasoning effort in caption tone with flip chevron
 *
 * @module @dsh-portable/dcode-ui/client/shell/ModelSelect
 */
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, } from 'react';
import { IconCheckOutline16, IconChevronDownOutline14, IconChevronRightOutline14, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useAsync, useProjectionValue } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import css from './ModelSelect.module.css';
function cx(...classes) {
    return classes.filter(Boolean).join(' ');
}
export const ModelSelect = forwardRef(function ModelSelect({ sessionId, disabled }, ref) {
    const runtime = useRuntime();
    const t = useT();
    const id = useId();
    const selection = useProjectionValue(sessionId, 'modelSelection');
    const [open, setOpen] = useState(false);
    const [pane, setPane] = useState('root');
    const [selecting, setSelecting] = useState(false);
    const [selectError, setSelectError] = useState(null);
    const [refreshIndex, setRefreshIndex] = useState(0);
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const itemRefs = useRef([]);
    const catalog = useAsync(async () => await runtime.remote.session.modelCatalog(), [runtime, refreshIndex]);
    const reload = useCallback(() => {
        setRefreshIndex(i => i + 1);
    }, []);
    const groups = useMemo(() => (catalog.value?.ok === true ? catalog.value.value.groups : []), [catalog.value]);
    const failures = useMemo(() => (catalog.value?.ok === true ? catalog.value.value.failures ?? [] : []), [catalog.value]);
    const choices = useMemo(() => groups.flatMap(group => group.models.map(model => ({ group, model }))), [groups]);
    const current = selection?.next ?? selection?.lastUsed ?? (catalog.value?.ok === true ? catalog.value.value.default : undefined);
    const currentChoice = useMemo(() => {
        if (current === undefined)
            return undefined;
        return choices.find(c => c.group.id === current.provider && c.model.id === current.model);
    }, [choices, current]);
    const reasoning = currentChoice?.model.reasoning;
    const effectiveEffort = current?.reasoningEffort ?? reasoning?.defaultEffort;
    const effortLabel = reasoning === undefined
        ? undefined
        : effectiveEffort === undefined
            ? t('composer.effortDefault')
            : reasoning.efforts.find(level => level.id === effectiveEffort)?.name ?? effectiveEffort;
    const effortChoices = useMemo(() => {
        if (reasoning === undefined)
            return [];
        return [
            ...reasoning.defaultEffort === undefined
                ? [{ key: 'provider-default', effort: undefined, label: t('composer.effortDefault') }]
                : [],
            ...reasoning.efforts.map(effort => ({
                key: `effort:${effort.id}`,
                effort: effort.id,
                label: effort.name,
            })),
        ];
    }, [reasoning, t]);
    const show = () => {
        setPane('root');
        setOpen(true);
        setSelectError(null);
        reload();
    };
    const close = useCallback((restoreFocus = false) => {
        setOpen(false);
        setPane('root');
        setSelectError(null);
        if (restoreFocus) {
            queueMicrotask(() => { triggerRef.current?.focus(); });
        }
    }, []);
    useImperativeHandle(ref, () => ({ open: () => { show(); } }), []);
    useEffect(() => {
        if (!open)
            return undefined;
        const closeOutside = (event) => {
            if (!rootRef.current?.contains(event.target))
                close();
        };
        document.addEventListener('mousedown', closeOutside);
        return () => { document.removeEventListener('mousedown', closeOutside); };
    }, [close, open]);
    const moveFocus = (offset) => {
        const items = itemRefs.current.filter((item) => item !== null);
        if (items.length === 0)
            return;
        const active = items.findIndex(item => item === document.activeElement);
        const next = (Math.max(active, 0) + offset + items.length) % items.length;
        items[next]?.focus();
    };
    const onRootKeyDown = (event) => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            if (pane !== 'root')
                setPane('root');
            else
                close(true);
            return;
        }
        if (!open)
            return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            moveFocus(event.key === 'ArrowDown' ? 1 : -1);
        }
    };
    const onBlur = (event) => {
        if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget))
            return;
        close();
    };
    const chooseModel = (provider, model) => {
        if (sessionId === undefined)
            return;
        if (current?.provider === provider && current?.model === model) {
            close(true);
            return;
        }
        setSelecting(true);
        setSelectError(null);
        void runtime.remote.session.selectModel({
            sessionId,
            provider,
            model,
        }).then((result) => {
            setSelecting(false);
            if (!result.ok) {
                setSelectError(result.error.message);
            }
            else {
                close(true);
            }
        }).catch((err) => {
            setSelecting(false);
            setSelectError(err instanceof Error ? err.message : String(err));
        });
    };
    const chooseEffort = (effort) => {
        if (sessionId === undefined || current === undefined)
            return;
        if (effectiveEffort === effort) {
            close(true);
            return;
        }
        setSelecting(true);
        setSelectError(null);
        void runtime.remote.session.selectModel({
            sessionId,
            provider: current.provider,
            model: current.model,
            ...(effort === undefined ? {} : { reasoningEffort: effort }),
        }).then((result) => {
            setSelecting(false);
            if (!result.ok) {
                setSelectError(result.error.message);
            }
            else {
                close(true);
            }
        }).catch((err) => {
            setSelecting(false);
            setSelectError(err instanceof Error ? err.message : String(err));
        });
    };
    const waiting = current === undefined && catalog.loading;
    const modelLabel = waiting
        ? t('composer.modelLoading')
        : currentChoice?.model.name
            ?? (current === undefined ? t('composer.selectModel') : `${current.provider}/${current.model}`);
    const triggerLabel = effortLabel === undefined ? modelLabel : `${modelLabel} · ${effortLabel}`;
    itemRefs.current = [];
    let itemIndex = 0;
    const itemRef = () => {
        const at = itemIndex++;
        return (node) => { itemRefs.current[at] = node; };
    };
    return (_jsxs("div", { ref: rootRef, className: css.root, onKeyDown: onRootKeyDown, onBlur: onBlur, children: [_jsxs("button", { ref: triggerRef, type: "button", className: css.trigger, "aria-label": triggerLabel, "aria-haspopup": "menu", "aria-expanded": open, "aria-controls": open ? `${id}-menu` : undefined, title: triggerLabel, disabled: disabled || sessionId === undefined, onClick: () => {
                    if (open) {
                        close();
                    }
                    else {
                        show();
                    }
                }, children: [_jsx("span", { className: css.triggerLabel, children: modelLabel }), effortLabel !== undefined && _jsx("span", { className: css.triggerEffort, children: effortLabel }), _jsx(IconChevronDownOutline14, { className: cx(css.chevron, open && css.chevronOpen) })] }), open && (_jsxs("div", { id: `${id}-menu`, className: css.menu, role: "menu", "aria-label": t('composer.modelAria'), "aria-busy": catalog.loading || selecting, children: [selectError !== null && (_jsx("div", { className: css.error, children: _jsx("span", { children: t('composer.modelError', { message: selectError }) }) })), pane === 'root' && (_jsxs(_Fragment, { children: [_jsxs("button", { ref: itemRef(), type: "button", role: "menuitem", className: css.cell, onClick: () => { setPane('model'); }, children: [_jsx("span", { className: css.cellLabel, children: t('composer.model') }), _jsx("span", { className: css.cellValue, children: modelLabel }), _jsx(IconChevronRightOutline14, { className: css.cellChevron })] }), reasoning !== undefined && (_jsxs("button", { ref: itemRef(), type: "button", role: "menuitem", className: css.cell, onClick: () => { setPane('effort'); }, children: [_jsx("span", { className: css.cellLabel, children: t('composer.effort') }), _jsx("span", { className: css.cellValue, children: effortLabel }), _jsx(IconChevronRightOutline14, { className: css.cellChevron })] }))] })), pane === 'model' && (_jsxs(_Fragment, { children: [catalog.loading && (_jsx("div", { className: css.status, children: t('composer.modelLoading') })), catalog.value?.ok === false && (_jsxs("div", { className: css.error, children: [_jsx("span", { children: t('composer.modelError', { message: catalog.value.error.message }) }), _jsx("button", { type: "button", className: css.retry, onClick: reload, children: t('common.retry') })] })), failures.map(failure => (_jsxs("div", { className: css.warning, children: [_jsx("span", { children: t('composer.modelWarning', { name: failure.name, message: failure.message }) }), _jsx("button", { type: "button", className: css.retry, onClick: reload, children: t('common.retry') })] }, failure.id))), _jsx("div", { className: cx(css.groups, 'scrollable'), children: groups.map((group) => {
                                    const headingId = `${id}-${group.id}`;
                                    return (_jsxs("section", { role: "group", "aria-labelledby": headingId, className: css.group, children: [_jsx("div", { className: css.groupTitle, id: headingId, children: group.name }), group.models.map((model) => {
                                                const selected = current?.provider === group.id && current?.model === model.id;
                                                return (_jsxs("button", { ref: itemRef(), type: "button", role: "menuitemradio", "aria-checked": selected, className: cx(css.option, selected && css.selected), title: model.name, disabled: selecting, onClick: () => { chooseModel(group.id, model.id); }, children: [_jsx("span", { className: css.optionCopy, children: _jsx("span", { className: css.modelName, children: model.name }) }), _jsx("span", { className: css.check, children: selected ? _jsx(IconCheckOutline16, {}) : null })] }, model.id));
                                            })] }, group.id));
                                }) }), !catalog.loading && catalog.value?.ok === true && groups.length === 0 && (_jsx("div", { className: css.empty, children: t('composer.modelEmpty') }))] })), pane === 'effort' && (_jsx(_Fragment, { children: effortChoices.length === 0
                            ? _jsx("div", { className: css.empty, children: t('composer.effortEmpty') })
                            : effortChoices.map(level => {
                                const selected = effectiveEffort === level.effort;
                                return (_jsxs("button", { ref: itemRef(), type: "button", role: "menuitemradio", "aria-checked": selected, className: cx(css.option, selected && css.selected), disabled: selecting, onClick: () => { chooseEffort(level.effort); }, children: [_jsx("span", { className: css.optionCopy, children: _jsx("span", { className: css.modelName, children: level.label }) }), _jsx("span", { className: css.check, children: selected ? _jsx(IconCheckOutline16, {}) : null })] }, level.key));
                            }) }))] }))] }));
});
//# sourceMappingURL=ModelSelect.js.map