/** Session-scoped message feedback state for the DCode transcript. */
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
const EMPTY_ITEMS = new Map();
const EMPTY_PENDING = new Set();
const EMPTY_VIEW = Object.freeze({ status: 'cold', items: new Map(), error: null });
const subscribeEmpty = () => () => { };
const readEmpty = () => EMPTY_VIEW;
/**
 * Bind one stable official feedback slot face and Session to the transcript.
 * Loading remains cold until a feedback control is focused/hovered or clicked.
 */
export function useMessageFeedback(provider, sessionId) {
    const sessionEntry = useMemo(() => (provider === undefined || sessionId === undefined
        ? undefined
        : provider.for(sessionId)), [provider, sessionId]);
    const source = sessionEntry?.hooks.feedback;
    const view = useSyncExternalStore(source?.subscribe ?? subscribeEmpty, source?.getSnapshot ?? readEmpty, source?.getSnapshot ?? readEmpty);
    const ownerRef = useRef({ entry: sessionEntry, items: new Set() });
    if (ownerRef.current.entry !== sessionEntry) {
        ownerRef.current = { entry: sessionEntry, items: new Set() };
    }
    const [, redrawPending] = useState(0);
    const ensure = useCallback(() => {
        if (sessionEntry !== undefined)
            void sessionEntry.ensure();
    }, [sessionEntry]);
    const toggle = useCallback(async (messageId, rating) => {
        if (sessionEntry === undefined)
            return undefined;
        const owner = ownerRef.current;
        if (owner.entry !== sessionEntry || owner.items.has(messageId))
            return undefined;
        owner.items.add(messageId);
        redrawPending(value => value + 1);
        const result = await sessionEntry.toggle(messageId, rating);
        // A Session switch replaces the owner synchronously. A late result from
        // the old controller must neither clear the new Session's pending state
        // nor surface its error there.
        if (ownerRef.current !== owner)
            return undefined;
        owner.items.delete(messageId);
        redrawPending(value => value + 1);
        return result.ok ? undefined : result.error.message;
    }, [sessionEntry]);
    const mutate = useCallback(async (messageId, run) => {
        if (sessionEntry === undefined)
            return undefined;
        const owner = ownerRef.current;
        if (owner.entry !== sessionEntry || owner.items.has(messageId))
            return undefined;
        owner.items.add(messageId);
        redrawPending(value => value + 1);
        const result = await run(sessionEntry);
        if (ownerRef.current !== owner)
            return undefined;
        owner.items.delete(messageId);
        redrawPending(value => value + 1);
        return result.ok ? undefined : result.error.message;
    }, [sessionEntry]);
    const saveNote = useCallback(async (messageId, rating, note) => {
        return await mutate(messageId, current => current.rate(messageId, rating, note));
    }, [mutate]);
    const clearNote = useCallback(async (messageId) => {
        return await mutate(messageId, current => current.clearNote(messageId));
    }, [mutate]);
    return {
        enabled: sessionEntry !== undefined,
        items: sessionEntry === undefined ? EMPTY_ITEMS : view.items,
        pending: ownerRef.current.items.size === 0 ? EMPTY_PENDING : ownerRef.current.items,
        error: view.error ?? undefined,
        ensure,
        toggle,
        saveNote,
        clearNote,
    };
}
//# sourceMappingURL=message-feedback.js.map