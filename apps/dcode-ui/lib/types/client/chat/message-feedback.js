/** Session-scoped message feedback state for the DCode transcript. */
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { MessageFeedbackController, } from '@deepseek-ai/dsh-client-ui-message-feedback/client';
const EMPTY_ITEMS = new Map();
const EMPTY_PENDING = new Set();
const EMPTY_VIEW = Object.freeze({ status: 'cold', items: new Map(), error: null });
const subscribeEmpty = () => () => { };
const readEmpty = () => EMPTY_VIEW;
/**
 * Bind one stable Remote namespace and Session to the official controller.
 * Loading remains cold until a feedback control is focused/hovered or clicked.
 */
export function useMessageFeedback(remote, sessionId) {
    const controller = useMemo(() => (remote === undefined || sessionId === undefined
        ? undefined
        : new MessageFeedbackController(remote, sessionId)), [remote, sessionId]);
    const view = useSyncExternalStore(controller?.subscribe ?? subscribeEmpty, controller?.getSnapshot ?? readEmpty, controller?.getSnapshot ?? readEmpty);
    const ownerRef = useRef({ controller, items: new Set() });
    if (ownerRef.current.controller !== controller) {
        ownerRef.current = { controller, items: new Set() };
    }
    const [, redrawPending] = useState(0);
    const ensure = useCallback(() => {
        if (controller !== undefined)
            void controller.ensure();
    }, [controller]);
    const toggle = useCallback(async (messageId, rating) => {
        if (controller === undefined)
            return undefined;
        const owner = ownerRef.current;
        if (owner.controller !== controller || owner.items.has(messageId))
            return undefined;
        owner.items.add(messageId);
        redrawPending(value => value + 1);
        const result = await controller.toggle(messageId, rating);
        // A Session switch replaces the owner synchronously. A late result from
        // the old controller must neither clear the new Session's pending state
        // nor surface its error there.
        if (ownerRef.current !== owner)
            return undefined;
        owner.items.delete(messageId);
        redrawPending(value => value + 1);
        return result.ok ? undefined : result.error.message;
    }, [controller]);
    return {
        enabled: remote !== undefined,
        items: controller === undefined ? EMPTY_ITEMS : view.items,
        pending: ownerRef.current.items.size === 0 ? EMPTY_PENDING : ownerRef.current.items,
        error: view.error ?? undefined,
        ensure,
        toggle,
    };
}
//# sourceMappingURL=message-feedback.js.map