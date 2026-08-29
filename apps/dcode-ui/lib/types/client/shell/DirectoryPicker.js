import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The workbench's directory browser.
 *
 * DSH offers two picking backends behind one Remote: a native chooser (the
 * desktop shell) and a host-listed browse (every surface). The official UI
 * selects between them by which package occupies its directory-flow slot —
 * a slot the workbench's own frame does not declare, so it makes the same
 * choice explicitly: try the native chooser first, and browse when there
 * isn't one. That keeps "Open workspace" working identically in the packaged
 * desktop app and in a plain browser tab.
 * @module @dsh-portable/dcode-ui/client/shell/DirectoryPicker
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconCloseOutline16, IconFolderClose16, IconFolderOpenOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { Button, IconButton, Spinner } from "./ui.js";
import { useModalFocus } from "./use-modal-focus.js";
import css from './DirectoryPicker.module.css';
/** A modal directory browser over the host's listing Remote. */
export function DirectoryPicker({ onPicked, onCancel }) {
    const runtime = useRuntime();
    const t = useT();
    const [listing, setListing] = useState(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(undefined);
    const [target, setTarget] = useState(undefined);
    const panelRef = useRef(null);
    const browse = useCallback((path) => {
        const navigation = runtime.navigation;
        if (navigation === undefined) {
            setError('workspace navigation is unavailable on this connection');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(undefined);
        void navigation.listDirectory(path)
            .then((next) => {
            setListing(next);
            setTarget(next.path);
            setLoading(false);
        })
            .catch((cause) => {
            setError(cause instanceof Error ? cause.message : String(cause));
            setLoading(false);
        });
    }, [runtime]);
    useEffect(() => { browse(undefined); }, [browse]);
    useModalFocus(true, panelRef, { onClose: onCancel });
    return (_jsx("div", { className: css.backdrop, role: "presentation", onPointerDown: (event) => { if (event.target === event.currentTarget)
            onCancel(); }, children: _jsxs("div", { ref: panelRef, className: css.panel, role: "dialog", "aria-modal": "true", "aria-label": t('nav.openWorkspace'), tabIndex: -1, children: [_jsxs("header", { className: css.head, children: [_jsx(IconFolderOpenOutline16, {}), _jsx("span", { className: css.title, children: t('nav.openWorkspace') }), _jsx(IconButton, { label: t('common.close'), onClick: onCancel, children: _jsx(IconCloseOutline16, {}) })] }), listing === undefined
                    ? null
                    : (_jsx("div", { className: css.crumbs, children: listing.crumbs.map(crumb => (_jsx("button", { type: "button", className: css.crumb, onClick: () => { browse(crumb.path); }, children: crumb.name }, crumb.path))) })), _jsxs("div", { className: css.list, role: "region", "aria-label": t('directory.contents'), tabIndex: 0, children: [loading ? _jsx("div", { className: css.empty, children: _jsx(Spinner, {}) }) : null, !loading && listing !== undefined && listing.entries.length === 0
                            ? _jsx("div", { className: css.empty, children: t('directory.empty') })
                            : null, listing?.entries.map(entry => (_jsxs("button", { type: "button", className: `${css.row} ${entry.hidden ? css.rowHidden : ''}`, onClick: () => { browse(entry.path); }, title: entry.path, children: [_jsx(IconFolderClose16, {}), _jsx("span", { className: css.name, children: entry.name })] }, entry.path)))] }), error === undefined ? null : _jsx("div", { className: css.error, role: "alert", children: error }), _jsxs("footer", { className: css.foot, children: [_jsx("span", { className: css.path, title: target, children: _jsx("bdi", { children: target ?? '' }) }), _jsx(Button, { onClick: onCancel, children: t('common.cancel') }), _jsx(Button, { primary: true, disabled: target === undefined, onClick: () => { if (target !== undefined)
                                onPicked(target); }, children: t('directory.open') })] })] }) }));
}
//# sourceMappingURL=DirectoryPicker.js.map