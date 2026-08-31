/**
 * The mission board: loading, live refresh, and compare-and-set mutation.
 *
 * The board is a SHARED artifact. The Lead writes tasks through its Team tools
 * and the operator writes them through this surface, against the same durable
 * records, so the two must not be modelled as "what the agent did" plus a
 * read-out. Three properties follow, and each is implemented here rather than
 * in a component:
 *
 * - **Every write is compare-and-set.** A task carries a `revision`; the host
 *   rejects an update derived from a stale copy with `team-task-conflict`.
 *   That is the case where the agent moved the task while the operator was
 *   typing, and it is common rather than exotic, so it is handled by reloading
 *   and telling the operator — never by retrying blind.
 * - **Refresh is push-triggered, not polled.** Team changes are durable session
 *   events, so the session snapshot advances whenever the board does.
 *   Subscribing to it and re-reading the authoritative view gives live updates
 *   without a timer and without a second source of truth.
 * - **A superseded read never lands.** Switching missions mid-flight, or a
 *   refresh overtaken by a mutation's own reload, must not repaint the board
 *   with an older answer; a generation counter drops those.
 * - **Transport failure is a failure like any other.** A Remote call resolves
 *   `ok: false` for a refusal the Host reasoned about, but REJECTS when the
 *   connection itself is gone. Both arms have to reach the same error line:
 *   an uncaught rejection would leave the board spinning on its first load, a
 *   click silently doing nothing, and nothing at all in the panel to say why.
 * @module @dsh-portable/crew-ui/client/state/board
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRuntime } from "./runtime.js";
/** Render a Remote failure the way every official surface does. */
export function failureText(error) {
    return `${error.message} (${error.code})`;
}
/**
 * Render a thrown transport failure in the same shape as a Remote refusal.
 *
 * A dropped Host connection arrives as a rejection rather than an `ok: false`
 * envelope, and an operator reading the board should not have to tell the two
 * apart to understand that the board is not current.
 * @param error - whatever the rejected call threw.
 * @returns the message the error line shows.
 */
export function transportText(error) {
    return failureText({
        code: 'transport-failed',
        message: error instanceof Error ? error.message : String(error),
    });
}
/** Board columns, in the order work moves through them. */
export const BOARD_COLUMNS = ['pending', 'in_progress', 'completed'];
/** Group tasks into board columns, dropping the deleted tombstones. */
export function groupTasks(tasks) {
    const grouped = { pending: [], in_progress: [], completed: [] };
    for (const task of tasks) {
        if (task.status === 'deleted')
            continue;
        grouped[task.status].push(task);
    }
    // Within a column, work that nothing blocks comes first: that is the order an
    // operator scans for "what can start now".
    for (const column of BOARD_COLUMNS) {
        grouped[column].sort((left, right) => Number(right.ready) - Number(left.ready));
    }
    return grouped;
}
/**
 * Subjects of the tasks a task waits on, for a legible dependency chip.
 * @param task - the blocked task.
 * @param tasks - every task on the board.
 * @returns one label per blocker, falling back to the raw id when the blocker
 *   is gone — a dangling dependency is worth showing, not hiding.
 */
export function blockerLabels(task, tasks) {
    return task.blockedBy.map((id) => {
        const blocker = tasks.find(candidate => candidate.id === id);
        return blocker === undefined ? String(id) : blocker.subject;
    });
}
/**
 * Resolve the session that OWNS the board.
 *
 * A teammate's session is a member of its Lead's team, and the board belongs to
 * the Lead. Opening a teammate and seeing an empty board would be wrong, so
 * every board call is addressed to the parent when there is one.
 * @param sessions - the session controller.
 * @param sessionId - the session currently in view.
 * @returns the Lead's session id.
 */
export function leadSessionId(sessions, sessionId) {
    return sessions.subagentAddress(sessionId)?.parentSessionId ?? sessionId;
}
/**
 * Drive one mission's board.
 * @param sessionId - the session in view; a teammate resolves to its Lead.
 * @returns the board state and its mutation entry points.
 */
export function useBoard(sessionId) {
    const runtime = useRuntime();
    const [view, setView] = useState(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(undefined);
    const [pending, setPending] = useState(() => new Set());
    const lead = useMemo(() => (sessionId === undefined ? undefined : leadSessionId(runtime.sessions, sessionId)), [runtime, sessionId]);
    // Identifies the mission a response belongs to, and the read that is current.
    // Both are refs because a settling promise must compare against the value at
    // resolution time, not the one captured when it was created.
    const leadRef = useRef(lead);
    leadRef.current = lead;
    const generation = useRef(0);
    const read = useCallback(async (first) => {
        const target = leadRef.current;
        if (target === undefined)
            return;
        const mine = ++generation.current;
        if (first)
            setLoading(true);
        let result;
        try {
            result = await runtime.teams.view(target);
        }
        catch (error) {
            // Without this the first load never clears `loading` and the rejection
            // escapes into the console: the board would sit on its spinner for as
            // long as the operator left it there.
            if (leadRef.current !== target || generation.current !== mine)
                return;
            setLoading(false);
            setError(transportText(error));
            return;
        }
        // A mission switch or a newer read makes this answer stale; landing it
        // would repaint the board with another mission's tasks.
        if (leadRef.current !== target || generation.current !== mine)
            return;
        setLoading(false);
        if (result.ok) {
            setView(result.value);
            setError(undefined);
            return;
        }
        setError(failureText(result.error));
    }, [runtime]);
    // Reset on mission change, then load. Resetting rather than keeping the old
    // view is deliberate: a board from another mission is worse than a blank one.
    useEffect(() => {
        generation.current += 1;
        setView(undefined);
        setError(undefined);
        setPending(new Set());
        if (lead === undefined) {
            setLoading(false);
            return;
        }
        void read(true);
    }, [lead, read]);
    // Live updates. Team changes are durable session events, so the session
    // snapshot advances exactly when the board does; re-reading the authoritative
    // view on that signal keeps one source of truth and needs no timer.
    useEffect(() => {
        if (lead === undefined)
            return undefined;
        const binding = runtime.sessions.binding(lead);
        if (binding === undefined)
            return undefined;
        let queued;
        const stop = binding.session.subscribe(() => {
            // One burst of events (a teammate claiming, working and completing)
            // should cost one read, not one per record.
            if (queued !== undefined)
                return;
            queued = setTimeout(() => {
                queued = undefined;
                void read(false);
            }, 120);
        });
        return () => {
            if (queued !== undefined)
                clearTimeout(queued);
            stop();
        };
    }, [lead, read, runtime]);
    const settle = useCallback(async (key, operation) => {
        const target = leadRef.current;
        if (target === undefined)
            return undefined;
        // A read in flight would land after this write and show the pre-write
        // board; discard it and let the reload below be the next truth.
        generation.current += 1;
        setPending(current => new Set(current).add(key));
        try {
            let result;
            try {
                result = await operation(target);
            }
            catch (error) {
                // The write may or may not have landed. Nothing is patched from the
                // request, and no reload is attempted: the connection that just failed
                // is the one a reload would use, so it would only overwrite this
                // message with the same one. The board keeps the last view it read,
                // which is the honest thing to leave on screen — the error line says
                // it is no longer known to be current.
                if (leadRef.current !== target)
                    return undefined;
                setError(transportText(error));
                return undefined;
            }
            if (leadRef.current !== target)
                return undefined;
            if (!result.ok) {
                setError(failureText(result.error));
                return undefined;
            }
            if (!result.value.ok) {
                // A conflict means the agent changed this task first. Reload so the
                // operator retries against what is actually there.
                if (result.value.error.code === 'team-task-conflict')
                    await read(false);
                if (leadRef.current !== target)
                    return undefined;
                setError(failureText(result.value.error));
                return undefined;
            }
            setError(undefined);
            await read(false);
            return leadRef.current === target ? result.value.value : undefined;
        }
        finally {
            if (leadRef.current === target) {
                setPending((current) => {
                    const next = new Set(current);
                    next.delete(key);
                    return next;
                });
            }
        }
    }, [read]);
    const create = useCallback(async (request) => settle('create', target => runtime.teams.createTask(target, request)), [runtime, settle]);
    const update = useCallback(async (request) => settle(String(request.taskId), target => runtime.teams.updateTask(target, request)), [runtime, settle]);
    return {
        view,
        loading,
        error,
        pending,
        refresh: useCallback(async () => { await read(false); }, [read]),
        create,
        update,
        dismissError: useCallback(() => { setError(undefined); }, []),
    };
}
//# sourceMappingURL=board.js.map