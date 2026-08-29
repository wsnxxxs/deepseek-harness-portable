import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { IconCheckOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './ui.module.css';
/** Class names other modules compose against (they own their own layout). */
export const ui = css;
/** A bordered card with an optional header row. */
export function Card(props) {
    return (_jsxs("section", { className: `${css.card} ${props.className ?? ''}`, children: [props.title === undefined && props.actions === undefined
                ? null
                : (_jsxs("header", { className: css.cardHeader, children: [_jsx("span", { className: css.grow, children: props.title }), props.actions] })), props.children] }));
}
/** A panel section heading with optional trailing controls. */
export function SectionTitle(props) {
    return (_jsxs("div", { className: css.sectionTitle, children: [_jsx("span", { children: props.children }), props.actions] }));
}
/** A square control that carries an icon and an accessible name. */
export function IconButton(props) {
    return (_jsx("button", { type: "button", className: `${css.iconButton} ${css.tooltipTarget} ${props.active === true ? css.iconButtonActive : ''} ${props.className ?? ''}`, "aria-label": props.label, "aria-pressed": props.active, "data-tooltip": props.label, disabled: props.disabled, onClick: props.onClick, children: props.children }));
}
/** A labelled control. */
export function Button(props) {
    return (_jsx("button", { type: "button", className: `${css.button} ${props.primary === true ? css.buttonPrimary : ''} ${props.className ?? ''}`, disabled: props.disabled, title: props.title, onClick: props.onClick, children: props.children }));
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
    const menuId = useId();
    useEffect(() => {
        if (!open)
            return undefined;
        const onPointerDown = (event) => {
            if (anchorRef.current?.contains(event.target) === true)
                return;
            setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key !== 'Escape')
                return;
            event.stopPropagation();
            setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [open]);
    const select = useCallback((row) => {
        if (row.disabled === true)
            return;
        setOpen(false);
        row.onSelect?.();
    }, []);
    let lastGroup;
    return (_jsxs("div", { className: css.popoverAnchor, ref: anchorRef, style: props.style, children: [_jsx("button", { type: "button", className: `${css.iconButton} ${open ? css.iconButtonActive : ''} ${props.triggerClassName ?? ''}`, "aria-haspopup": "menu", "aria-expanded": open, "aria-controls": open ? menuId : undefined, "aria-label": props.label, title: props.label, disabled: props.disabled, onClick: () => { setOpen(value => !value); }, children: props.trigger }), open
                ? (_jsxs("div", { id: menuId, role: "menu", className: `${css.popover} ${props.placement === 'down' ? css.popoverDown : css.popoverUp} ${props.align === 'end' ? css.popoverRight : ''} ${props.popoverClassName ?? ''}`, children: [props.children, props.rows?.map((row) => {
                            const heading = row.group !== undefined && row.group !== lastGroup
                                ? _jsx("div", { className: css.menuLabel, children: row.group })
                                : null;
                            lastGroup = row.group;
                            return (_jsxs(Fragment, { children: [heading, _jsxs("button", { type: "button", role: "menuitem", disabled: row.disabled, className: `${css.menuItem} ${row.active === true ? css.menuItemActive : ''} ${row.danger === true ? css.menuItemDanger : ''}`, onClick: () => { select(row); }, children: [row.icon === undefined ? null : _jsx("span", { className: css.menuIcon, children: row.icon }), _jsxs("span", { className: `${css.grow} ${css.menuContent}`, children: [row.label, row.detail === undefined ? null : _jsx("span", { className: css.menuDetail, children: row.detail })] }), row.active === true ? _jsx(IconCheckOutline14, {}) : null] })] }, row.id));
                        })] }))
                : null] }));
}
/** A centred explanatory state for an empty or unavailable panel. */
export function EmptyState(props) {
    return _jsx("div", { className: css.empty, children: props.children });
}
/** An indeterminate progress mark. */
export function Spinner() {
    return _jsx("span", { className: css.spinner, "aria-hidden": true });
}
//# sourceMappingURL=ui.js.map