import { useEffect, useRef } from 'react';
const FOCUSABLE = [
    'a[href]',
    'button:not(:disabled)',
    'input:not(:disabled)',
    'select:not(:disabled)',
    'textarea:not(:disabled)',
    '[tabindex]:not([tabindex="-1"])',
].join(',');
/** Focus the first control in a modal, trap Tab, and restore the opener. */
export function useModalFocus(open, panelRef, options = {}) {
    const returnFocus = useRef(null);
    const wasOpen = useRef(false);
    const onCloseRef = useRef(options.onClose);
    const initialFocusRef = useRef(options.initialFocusRef);
    onCloseRef.current = options.onClose;
    initialFocusRef.current = options.initialFocusRef;
    useEffect(() => {
        const restore = () => {
            const target = returnFocus.current;
            returnFocus.current = null;
            if (target !== null && target.isConnected)
                target.focus();
        };
        if (!open) {
            if (wasOpen.current) {
                wasOpen.current = false;
                restore();
            }
            return undefined;
        }
        wasOpen.current = true;
        returnFocus.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const panel = panelRef.current;
        const initial = initialFocusRef.current?.current;
        const focusables = panel === null ? [] : Array.from(panel.querySelectorAll(FOCUSABLE));
        (initial ?? focusables[0] ?? panel)?.focus();
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                onCloseRef.current?.();
                return;
            }
            if (event.key !== 'Tab' || panel === null)
                return;
            const current = Array.from(panel.querySelectorAll(FOCUSABLE));
            if (current.length === 0) {
                event.preventDefault();
                panel.focus();
                return;
            }
            const first = current[0];
            const last = current[current.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            }
            else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            if (wasOpen.current)
                restore();
        };
    }, [open, panelRef]);
}
//# sourceMappingURL=use-modal-focus.js.map