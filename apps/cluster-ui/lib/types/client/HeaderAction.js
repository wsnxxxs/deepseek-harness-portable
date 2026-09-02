import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Cluster mode's seat in the official DSH conversation header.
 *
 * This is what makes the plugin stand on its own. The published service lets a
 * workbench place the panel wherever its own layout wants it; this entry needs
 * no such cooperation, so an assembly with nothing but the official UI still
 * gets the roster and the shared task board.
 *
 * The seat owns only the disclosure — whether there is a Team worth offering,
 * the trigger, the anchored sheet, and dismissal. Everything inside it is the
 * same {@link ClusterPanel} the service publishes, so the two placements can
 * never drift apart.
 * @module @dsh-portable/cluster-ui/client/HeaderAction
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useAsync } from "./deps.js";
import { clusterScope } from "./tokens.js";
import css from './HeaderAction.module.css';
/** Disclose the Cluster roster and task board from the conversation header. */
export function ClusterHeaderAction({ sessionId, Panel, hasTeam, t }) {
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const triggerRef = useRef(null);
    const team = useAsync(async (signal) => {
        signal.throwIfAborted();
        return await hasTeam(sessionId);
    }, [hasTeam, sessionId]);
    const close = useCallback((restoreFocus = false) => {
        setOpen(false);
        if (restoreFocus)
            triggerRef.current?.focus();
    }, []);
    // A session switch is a different Team; collapsing avoids showing one
    // Team's board under another conversation's header for a frame.
    useEffect(() => { setOpen(false); }, [sessionId]);
    useEffect(() => {
        if (!open)
            return undefined;
        const onPointerDown = (event) => {
            if (event.target instanceof Node && anchorRef.current?.contains(event.target) === true)
                return;
            close();
        };
        const onKeyDown = (event) => {
            if (event.key !== 'Escape')
                return;
            event.preventDefault();
            close(true);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [close, open]);
    // A failed probe reads the same as no Team: the seat is an affordance, and
    // an unreachable Host has louder places to say so than this header.
    if (team.value !== true)
        return null;
    return (_jsxs("div", { className: css.anchor, ref: anchorRef, ...clusterScope, children: [_jsx("button", { ref: triggerRef, type: "button", className: `${css.trigger} ${open ? css.triggerOpen : ''}`, "aria-haspopup": "dialog", "aria-expanded": open, "aria-label": t('title'), title: t('title'), onClick: () => { setOpen(value => !value); }, children: _jsx(IconUserOutline16, {}) }), open
                ? (_jsx("div", { className: css.sheet, role: "dialog", "aria-label": t('title'), children: _jsx(Panel, { sessionId: sessionId }) }))
                : null] }));
}
//# sourceMappingURL=HeaderAction.js.map