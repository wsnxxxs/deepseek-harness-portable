/**
 * React bindings over the DSH observables the workbench reads.
 *
 * Every hook here is a thin `useSyncExternalStore` over a store the Host
 * already owns — there is no mirrored copy of the session list, the
 * transcript or a projection anywhere in this package. Selector variants
 * exist so a panel re-renders on the fact it reads rather than on every frame
 * of a streaming turn.
 * @module @dsh-portable/dcode-ui/client/state/hooks
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { EMPTY_TRAJECTORY_SNAPSHOT, useRuntime, } from "./runtime.js";
/**
 * Subscribe to one DSH observable.
 * @param source - the observable, or undefined while none is resolvable.
 * @param fallback - snapshot used while the source is absent.
 * @returns the current snapshot.
 */
export function useObservable(source, fallback) {
    const subscribe = useCallback((listener) => (source === undefined ? () => { } : source.subscribe(listener)), [source]);
    const snapshot = useCallback(() => (source === undefined ? fallback : source.getSnapshot()), [source, fallback]);
    return useSyncExternalStore(subscribe, snapshot, snapshot);
}
/**
 * Subscribe to a derived slice of an observable.
 *
 * The selector runs on every notification but the component re-renders only
 * when the selected value changes by `Object.is`, which is what keeps the
 * left rail still while a turn streams into the transcript.
 * @param source - the observable, or undefined while none is resolvable.
 * @param fallback - snapshot used while the source is absent.
 * @param select - pure projection of the snapshot.
 * @returns the selected value.
 */
export function useObservableSelector(source, fallback, select) {
    const selectRef = useRef(select);
    selectRef.current = select;
    const subscribe = useCallback((listener) => (source === undefined ? () => { } : source.subscribe(listener)), [source]);
    const lastRef = useRef(undefined);
    const snapshot = useCallback(() => {
        const input = source === undefined ? fallback : source.getSnapshot();
        const last = lastRef.current;
        if (last !== undefined && Object.is(last.input, input))
            return last.output;
        const output = selectRef.current(input);
        // Reuse the previous output when the projection is value-identical, so a
        // reference-fresh upstream snapshot does not force a render.
        if (last !== undefined && Object.is(last.output, output)) {
            lastRef.current = { input, output: last.output };
            return last.output;
        }
        lastRef.current = { input, output };
        return output;
    }, [source, fallback]);
    return useSyncExternalStore(subscribe, snapshot, snapshot);
}
const EMPTY_SESSION_LIST = {
    ids: [], byId: {}, current: undefined, phase: 'pending', state: 'idle', error: null,
    subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
};
const EMPTY_PENDING_INTERACTIONS = new Map();
const EMPTY_INPUT_STATE = {
    draft: '',
    imageIds: [],
    draftRev: 0,
    phase: 'plain',
    occurrences: [],
    queue: [],
};
/** The shared Conversation input machine plus its current draft state. */
export function useSessionInput(sessionId) {
    const runtime = useRuntime();
    const input = useMemo(() => (sessionId === undefined ? undefined : runtime.input(sessionId)), [runtime, sessionId]);
    const state = useObservable(input?.state, EMPTY_INPUT_STATE);
    return { input, state };
}
/** Narrow the shared pending-interaction roster to the ask-user-question face. */
function questionInteraction(value) {
    if (value === undefined || !('questions' in value) || !Array.isArray(value.questions))
        return undefined;
    if (typeof value.answer !== 'function')
        return undefined;
    if (typeof value.cancel !== 'function')
        return undefined;
    return value;
}
/** The Session Controller's list and current selection. */
export function useSessionList() {
    const runtime = useRuntime();
    return useObservable(runtime.sessions.list, EMPTY_SESSION_LIST);
}
/** The id of the selected session, or undefined in the no-session state. */
export function useCurrentSessionId() {
    const runtime = useRuntime();
    return useObservableSelector(runtime.sessions.list, EMPTY_SESSION_LIST, state => state.current);
}
/** The current session's pending ask-user-question or plan-review request. */
export function usePendingQuestion(sessionId) {
    const runtime = useRuntime();
    return useObservableSelector(runtime.pendingInteractions, EMPTY_PENDING_INTERACTIONS, snapshot => questionInteraction(sessionId === undefined ? undefined : snapshot.get(sessionId)));
}
const EMPTY_WORKSPACES = {
    items: [], order: [], archivedSessionIds: [], state: 'idle', phase: 'loading', error: null,
};
/** The durable workspace registry. */
export function useWorkspaces() {
    const runtime = useRuntime();
    return useObservable(runtime.workspaces.list, EMPTY_WORKSPACES);
}
/**
 * One session's lifecycle snapshot.
 * @param sessionId - session to observe; undefined yields undefined.
 */
export function useSessionSnapshot(sessionId) {
    const runtime = useRuntime();
    const source = useMemo(() => {
        if (sessionId === undefined)
            return undefined;
        const face = runtime.binding(sessionId)?.session;
        if (face === undefined)
            return undefined;
        return {
            getSnapshot: () => face.getSnapshot(),
            subscribe: (listener) => face.subscribe(listener),
        };
    }, [runtime, sessionId]);
    const snapshot = useObservable(source, undefined);
    return source === undefined ? undefined : snapshot;
}
/**
 * One session's assembled Chat transcript.
 * @param sessionId - session to observe; undefined yields undefined.
 */
export function useChatSnapshot(sessionId) {
    const runtime = useRuntime();
    const source = useMemo(() => (sessionId === undefined ? undefined : runtime.chatFeed(sessionId)), [runtime, sessionId]);
    const snapshot = useObservable(source, undefined);
    return source === undefined ? undefined : snapshot;
}
/**
 * One session's assembled DSH Trajectory ledger.
 *
 * This is the same target consumed by the official Trajectory view. DCode only
 * selects a compact subset for its summary and leaves the full records to the
 * existing details and diff surfaces.
 * @param sessionId - session to observe.
 */
export function useTrajectorySnapshot(sessionId) {
    const runtime = useRuntime();
    const source = useMemo(() => (sessionId === undefined ? undefined : runtime.trajectoryFeed(sessionId)), [runtime, sessionId]);
    const snapshot = useObservable(source, EMPTY_TRAJECTORY_SNAPSHOT);
    return source === undefined ? undefined : snapshot;
}
/**
 * Whether the conversation has nothing in it yet — no settled node, no
 * streaming partial, no call in flight.
 *
 * This is the layout's phase gate: a blank conversation centres the greeting
 * and the composer the way the official surface does, and the first arriving
 * node drops the composer to its dock. A session whose chat has not loaded
 * yet is *not* blank, so an existing conversation never flashes the greeting
 * on its way in.
 * @param sessionId - session to inspect, or undefined for no session at all.
 * @returns true while there is nothing to show.
 */
export function useConversationBlank(sessionId) {
    const chat = useChatSnapshot(sessionId);
    if (sessionId === undefined)
        return true;
    if (chat === undefined)
        return false;
    return chat.legacy.nodes.length === 0
        && chat.legacy.partial === null
        && chat.legacy.runningCalls.length === 0;
}
/**
 * One host-computed projection of a session (`goal`, `plan`, `permissions`,
 * `modelSelection`, …). The projection face is identity-stable per key, so a
 * capability the Host does not publish simply reads `undefined` forever
 * rather than throwing.
 * @param sessionId - session to observe.
 * @param key - projection key.
 */
export function useProjectionValue(sessionId, key) {
    const runtime = useRuntime();
    const source = useMemo(() => {
        if (sessionId === undefined)
            return undefined;
        const face = runtime.binding(sessionId)?.session.projections.faceOf(key);
        if (face === undefined)
            return undefined;
        return {
            getSnapshot: () => face.getSnapshot(),
            subscribe: (listener) => face.subscribe(listener),
        };
    }, [runtime, sessionId, key]);
    return useObservable(source, undefined);
}
/**
 * Group the session list by workspace for the left rail.
 *
 * Blank sessions are hidden unless they are the current selection — the same
 * rule the official sidebar applies, so switching surfaces does not change
 * which rows exist.
 */
export function useWorkspaceGroups() {
    const list = useSessionList();
    const workspaces = useWorkspaces();
    return useMemo(() => {
        const archived = new Set(workspaces.archivedSessionIds);
        const visible = (summary) => summary !== undefined
            && summary.origin !== 'subagent'
            && !archived.has(summary.id)
            && (!summary.blank || summary.id === list.current);
        const claimed = new Set();
        const groups = workspaces.items.map((workspace) => {
            const sessions = workspace.sessionIds
                .map((id) => {
                claimed.add(id);
                return list.byId[id];
            })
                .filter(visible);
            return {
                workspaceId: workspace.workspaceId,
                title: workspace.title,
                path: workspace.path,
                sessions,
            };
        });
        const ungrouped = list.ids
            .filter(id => !claimed.has(id))
            .map(id => list.byId[id])
            .filter(visible);
        return { groups, ungrouped };
    }, [list, workspaces]);
}
/**
 * Run an async read whenever its inputs change, with the in-flight answer of a
 * superseded run discarded.
 * @param load - the read; receives an abort signal.
 * @param deps - dependency list, as for `useEffect`.
 * @returns the latest value, a loading flag, a failure message, and a manual reload.
 */
export function useAsync(load, deps) {
    const [state, setState] = useState({ value: undefined, loading: true, error: undefined });
    const [nonce, setNonce] = useState(0);
    const loadRef = useRef(load);
    loadRef.current = load;
    useEffect(() => {
        const controller = new AbortController();
        let live = true;
        setState(previous => ({ ...previous, loading: true, error: undefined }));
        loadRef.current(controller.signal).then((value) => { if (live)
            setState({ value, loading: false, error: undefined }); }, (cause) => {
            if (!live)
                return;
            setState({ value: undefined, loading: false, error: cause instanceof Error ? cause.message : String(cause) });
        });
        return () => {
            live = false;
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the dependency list
    }, [...deps, nonce]);
    const reload = useCallback(() => { setNonce(value => value + 1); }, []);
    return { ...state, reload };
}
//# sourceMappingURL=hooks.js.map