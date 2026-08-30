import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Workbench atoms.
 *
 * Deliberately thin: the shared component library (`ui-primitives`) is a
 * platform module and already supplies markdown, code, diff, terminal and
 * icon rendering. What it does not supply is this surface's compact chrome —
 * the card, the popover menu and the two button weights — so only those live
 * here.
 * @module @dsh-portable/dcode-ui/client/shell/ui
 */
import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import { IconCheckOutline14, IconCheckOutline16, IconCopyOutline16, writeClipboard, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './ui.module.css';
/** Class names other modules compose against (they own their own layout). */
export const ui = css;
/** The shared material-glint class for live Tool and Thinking surfaces. */
export function shimmerActive(active = true) {
    return active ? css.shimmerActive : '';
}
/** A square control that carries an icon and an accessible name. */
export function IconButton(props) {
    return (_jsx("button", { type: "button", className: `${css.iconButton} ${css.tooltipTarget} ${props.active === true ? css.iconButtonActive : ''} ${props.className ?? ''}`, "aria-label": props.label, "aria-pressed": props.active, "data-tooltip": props.label, "data-tooltip-align": props.tooltipAlign === 'right' ? 'right' : undefined, "data-dcode-focus-target": props.dataFocusTarget, disabled: props.disabled, onClick: props.onClick, children: props.children }));
}
/** A labelled control. */
export function Button(props) {
    return (_jsx("button", { type: "button", className: `${css.button} ${props.primary === true ? css.buttonPrimary : ''} ${props.className ?? ''}`, disabled: props.disabled, autoFocus: props.autoFocus, title: props.title, "aria-label": props.ariaLabel, "aria-expanded": props.ariaExpanded, "aria-controls": props.ariaControls, onClick: props.onClick, children: props.children }));
}
/** A compact status chip. */
export function Pill(props) {
    return _jsx("span", { className: `${css.pill} ${props.className ?? ''}`, title: props.title, children: props.children });
}
/** An added/removed line-count pair, hidden when both are zero. */
export function DiffCount(props) {
    if (props.insertions === 0 && props.deletions === 0)
        return null;
    return (_jsxs("span", { className: css.mono, children: [props.insertions > 0 ? _jsxs("span", { className: css.added, children: ["+", props.insertions] }) : null, props.insertions > 0 && props.deletions > 0 ? ' ' : null, props.deletions > 0 ? _jsxs("span", { className: css.removed, children: ["-", props.deletions] }) : null] }));
}
/**
 * A button that opens an anchored menu.
 *
 * Dismissal is owned here (outside pointer, Escape, and selection) so no
 * caller has to repeat it, and the menu is rendered inside the anchor so it
 * inherits the workbench token scope.
 */
export function Popover(props) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const triggerRef = useRef(null);
    const rowRefs = useRef({});
    const [active, setActive] = useState(0);
    const menuId = useId();
    const rows = props.rows ?? [];
    const firstEnabled = useCallback((from, direction) => {
        for (let index = from; index >= 0 && index < rows.length; index += direction) {
            if (rows[index]?.disabled !== true)
                return index;
        }
        return -1;
    }, [rows]);
    const close = useCallback((restoreFocus = false) => {
        setOpen(false);
        if (restoreFocus)
            triggerRef.current?.focus();
    }, []);
    useEffect(() => {
        if (!open)
            return undefined;
        const onPointerDown = (event) => {
            if (event.target instanceof Node && anchorRef.current?.contains(event.target) === true)
                return;
            close();
        };
        const onKeyDown = (event) => {
            if (!(event.target instanceof Node) || anchorRef.current?.contains(event.target) !== true)
                return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close(true);
                return;
            }
            if (rows.length === 0)
                return;
            if (event.key === 'Enter' || event.key === ' ') {
                const row = rows[active];
                if (row === undefined || row.disabled === true)
                    return;
                event.preventDefault();
                row.onSelect?.();
                close(true);
                return;
            }
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp'
                && event.key !== 'Home' && event.key !== 'End')
                return;
            event.preventDefault();
            const next = event.key === 'Home'
                ? firstEnabled(0, 1)
                : event.key === 'End'
                    ? firstEnabled(rows.length - 1, -1)
                    : firstEnabled(active + (event.key === 'ArrowDown' ? 1 : -1), event.key === 'ArrowDown' ? 1 : -1);
            if (next >= 0)
                setActive(next);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [active, close, firstEnabled, open, rows]);
    useEffect(() => {
        if (!open)
            return;
        setActive(firstEnabled(0, 1));
    }, [firstEnabled, open]);
    useEffect(() => {
        if (open && active >= 0)
            rowRefs.current[active]?.focus();
    }, [active, open]);
    const select = useCallback((row) => {
        if (row.disabled === true)
            return;
        row.onSelect?.();
        close(true);
    }, [close]);
    let lastGroup;
    return (_jsxs("div", { className: css.popoverAnchor, ref: anchorRef, style: props.style, children: [_jsx("button", { ref: triggerRef, type: "button", className: `${css.iconButton} ${open ? css.iconButtonActive : ''} ${props.triggerClassName ?? ''}`, "aria-haspopup": "menu", "aria-expanded": open, "aria-controls": open ? menuId : undefined, "aria-label": props.label, title: props.label, disabled: props.disabled, onClick: () => { setOpen(value => !value); }, children: props.trigger }), open
                ? (_jsxs("div", { id: menuId, role: "menu", className: `${css.popover} ${props.placement === 'down' ? css.popoverDown : css.popoverUp} ${props.align === 'end' ? css.popoverRight : ''} ${props.popoverClassName ?? ''}`, children: [props.children, rows.map((row, index) => {
                            const heading = row.group !== undefined && row.group !== lastGroup
                                ? _jsx("div", { className: css.menuLabel, children: row.group })
                                : null;
                            lastGroup = row.group;
                            return (_jsxs(Fragment, { children: [heading, _jsxs("button", { ref: (node) => { rowRefs.current[index] = node; }, type: "button", role: "menuitem", disabled: row.disabled, tabIndex: index === active ? 0 : -1, className: `${css.menuItem} ${row.active === true ? css.menuItemActive : ''} ${row.danger === true ? css.menuItemDanger : ''}`, onClick: () => { select(row); }, children: [row.icon === undefined ? null : _jsx("span", { className: css.menuIcon, children: row.icon }), _jsxs("span", { className: `${css.grow} ${css.menuContent}`, children: [row.label, row.detail === undefined ? null : _jsx("span", { className: css.menuDetail, children: row.detail })] }), row.active === true ? _jsx(IconCheckOutline14, {}) : null] })] }, row.id));
                        })] }))
                : null] }));
}
/** A centred explanatory state for an empty or unavailable panel. */
export function EmptyState(props) {
    return _jsx("div", { className: css.empty, children: props.children });
}
/** An indeterminate progress mark. */
export function Spinner(props = {}) {
    return _jsx("span", { className: `${css.spinner} ${props.size === 'sm' ? css.spinnerSmall : ''}`, "aria-hidden": true });
}
/** Shared clipboard action with consistent transient success feedback. */
export function CopyButton(props) {
    const [copied, setCopied] = useState(false);
    const copy = useCallback(() => {
        if (copied)
            return;
        void writeClipboard(props.text).then((ok) => {
            if (!ok)
                return;
            setCopied(true);
            window.setTimeout(() => { setCopied(false); }, 1500);
        });
    }, [copied, props.text]);
    return (_jsxs(_Fragment, { children: [_jsx(IconButton, { label: copied ? props.copiedLabel : props.label, className: props.className, onClick: copy, children: copied ? _jsx(IconCheckOutline16, {}) : _jsx(IconCopyOutline16, {}) }), copied ? _jsx("span", { className: css.visuallyHidden, role: "status", children: props.copiedLabel }) : null] }));
}
//# sourceMappingURL=ui.js.map