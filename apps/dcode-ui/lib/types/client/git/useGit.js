/**
 * Working-tree status for the panels that show it.
 *
 * Three surfaces read this at once — the top bar's branch chip, the Changes
 * panel, and every turn's file-change card — so the read is shared per
 * workspace rather than issued per component: one `git status` subprocess
 * answers all of them, and they cannot disagree about the branch.
 *
 * It is refreshed on the events that actually change a work tree: the end of
 * an agent turn, an explicit refresh, a commit, an undo, and the window
 * regaining focus. There is no polling loop — a workbench left open on a quiet
 * workspace issues no git processes at all.
 * @module @dsh-portable/dcode-ui/client/git/useGit
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useRuntime } from "../state/runtime.js";
import { useSessionSnapshot } from "../state/hooks.js";
const EMPTY = { status: undefined, loading: false, pending: true, error: undefined };
/** One record per workspace directory, shared by every consumer of that directory. */
const records = new Map();
function recordFor(cwd) {
    const existing = records.get(cwd);
    if (existing !== undefined)
        return existing;
    const created = {
        status: undefined,
        pending: true,
        error: undefined,
        inflight: undefined,
        wanted: false,
        cleanupTimer: undefined,
        listeners: new Set(),
        snapshot: { status: undefined, loading: true, pending: true, error: undefined },
    };
    records.set(cwd, created);
    return created;
}
function publish(record) {
    record.snapshot = {
        status: record.status,
        loading: record.inflight !== undefined,
        pending: record.pending,
        error: record.error,
    };
    for (const listener of [...record.listeners])
        listener();
}
/**
 * Read one workspace's status, collapsing concurrent callers onto one request.
 * @param runtime - the workbench runtime carrying the `/dcode` client.
 * @param cwd - absolute workspace directory.
 * @param force - start a fresh read even when one already answered.
 */
function load(runtime, cwd, force) {
    const record = recordFor(cwd);
    if (record.inflight !== undefined) {
        if (force)
            record.wanted = true;
        return;
    }
    if (!force && !record.pending)
        return;
    record.inflight = runtime.git.status(cwd).then((result) => {
        if (result.ok) {
            record.status = result.value;
            record.error = undefined;
        }
        else {
            record.status = undefined;
            record.error = result.error.message;
        }
    }).catch((cause) => {
        record.status = undefined;
        record.error = cause instanceof Error ? cause.message : String(cause);
    }).finally(() => {
        const wanted = record.wanted;
        record.wanted = false;
        record.inflight = undefined;
        record.pending = false;
        publish(record);
        if (wanted)
            load(runtime, cwd, true);
    });
    publish(record);
}
/**
 * Read one workspace's git status.
 * @param cwd - absolute workspace directory, or undefined with no session selected.
 * @param sessionId - session whose turn boundaries trigger a refresh.
 */
export function useGitStatus(cwd, sessionId) {
    const runtime = useRuntime();
    const session = useSessionSnapshot(sessionId);
    const [mutation, setMutation] = useState(undefined);
    const mutationRef = useRef(undefined);
    const record = useMemo(() => cwd === undefined ? undefined : recordFor(cwd), [cwd]);
    const subscribe = useCallback((listener) => {
        if (cwd === undefined || record === undefined)
            return () => { };
        if (record.cleanupTimer !== undefined) {
            clearTimeout(record.cleanupTimer);
            record.cleanupTimer = undefined;
        }
        record.listeners.add(listener);
        return () => {
            record.listeners.delete(listener);
            if (record.listeners.size > 0)
                return;
            // Keep a recently visited workspace warm. Switching back should not
            // flash pending or immediately issue another git process.
            record.cleanupTimer = setTimeout(() => {
                record.cleanupTimer = undefined;
                if (record.listeners.size === 0 && record.inflight === undefined)
                    records.delete(cwd);
            }, 30_000);
        };
    }, [cwd, record]);
    const getSnapshot = useCallback(() => record?.snapshot ?? EMPTY, [record]);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const refresh = useCallback(() => {
        if (cwd !== undefined)
            load(runtime, cwd, true);
    }, [runtime, cwd]);
    const mutate = useCallback(async (kind, paths) => {
        if (cwd === undefined)
            return 'no workspace selected';
        if (mutationRef.current !== undefined)
            return 'another Git operation is already running';
        const next = { kind, paths: [...paths] };
        mutationRef.current = next;
        setMutation(next);
        try {
            const result = kind === 'stage'
                ? await runtime.git.stage(cwd, paths)
                : await runtime.git.unstage(cwd, paths);
            return result.ok ? undefined : result.error.message;
        }
        catch (cause) {
            return cause instanceof Error ? cause.message : String(cause);
        }
        finally {
            load(runtime, cwd, true);
            mutationRef.current = undefined;
            setMutation(undefined);
        }
    }, [runtime, cwd]);
    const stage = useCallback(async (paths) => await mutate('stage', paths), [mutate]);
    const unstage = useCallback(async (paths) => await mutate('unstage', paths), [mutate]);
    useEffect(() => {
        mutationRef.current = undefined;
        setMutation(undefined);
    }, [cwd]);
    // First read for a workspace nobody has looked at yet.
    useEffect(() => {
        if (cwd !== undefined)
            load(runtime, cwd, false);
    }, [runtime, cwd]);
    // A turn that just finished is the moment the work tree most likely changed.
    const running = session?.running ?? false;
    const previousRunning = useRef(running);
    useEffect(() => {
        if (previousRunning.current && !running)
            refresh();
        previousRunning.current = running;
    }, [running, refresh]);
    // A workspace edited outside the app (an editor, a terminal) shows up when
    // the operator comes back to the window.
    useEffect(() => {
        if (cwd === undefined)
            return undefined;
        const onFocus = () => { refresh(); };
        globalThis.addEventListener?.('focus', onFocus);
        return () => { globalThis.removeEventListener?.('focus', onFocus); };
    }, [cwd, refresh]);
    return useMemo(() => ({ ...snapshot, unavailable: !runtime.git.available, refresh, mutation, stage, unstage }), [snapshot, runtime, refresh, mutation, stage, unstage]);
}
//# sourceMappingURL=useGit.js.map