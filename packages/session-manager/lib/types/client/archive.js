/**
 * The archived-conversation fold, without a surface.
 *
 * Both front ends manage the SAME archive set: the Workspace Controller's
 * `archivedSessionIds`, joined against the Session Controller's list. Nothing
 * here owns a copy of either — the rows are derived on read, and restore and
 * delete are the Host calls the caller supplies. What this module owns is the
 * part that is genuinely shared and genuinely easy to get wrong: joining an
 * archived id whose summary has not loaded, ordering by recency, serializing
 * one in-flight mutation at a time, and holding the pending delete target.
 *
 * Markup stays with each surface. The official settings shell and the
 * workbench sit in different token domains and use different primitives, so a
 * shared component would have to abstract over both; a shared hook does not.
 * @module @dsh-portable/session-manager/client/archive
 */
import { useMemo, useState } from 'react';
/** A summary stand-in for an archived id whose real summary has not arrived. */
function placeholder(id) {
    return { id, displayTitle: id, running: false, blank: false, updatedAt: 0 };
}
/** Message text for a rejected mutation. */
function describe(cause) {
    return cause instanceof Error ? cause.message : String(cause);
}
/**
 * Derive the archive page's state from the two official snapshots.
 * @param sessions - Session Controller list snapshot.
 * @param workspaces - Workspace Controller snapshot carrying the archive set.
 * @param actions - Host mutations supplied by the hosting surface.
 * @returns the rows to render and the callbacks the controls bind to.
 */
export function useArchivedChats(sessions, workspaces, actions) {
    const [busyId, setBusyId] = useState();
    const [deleteTarget, setDeleteTarget] = useState();
    const [error, setError] = useState();
    // An id in the archive set whose summary has not loaded still gets a row:
    // hiding it would make the page disagree with the Host about what is
    // archived, and the row is what the operator uses to restore it.
    const rows = useMemo(() => workspaces.archivedSessionIds
        .map(id => sessions.byId[id] ?? placeholder(id))
        .sort((left, right) => right.updatedAt - left.updatedAt), [sessions.byId, workspaces.archivedSessionIds]);
    // Plain closures: the surfaces below bind them straight to onClick, and
    // `actions` is a fresh literal on every render anyway, so memoizing them
    // would claim a stability none of them has.
    const restore = (id) => {
        if (busyId !== undefined)
            return;
        setBusyId(id);
        setError(undefined);
        void actions.restore(id)
            .catch((cause) => { setError(describe(cause)); })
            .finally(() => { setBusyId(undefined); });
    };
    const requestDelete = (session) => {
        setError(undefined);
        setDeleteTarget(session);
    };
    const cancelDelete = () => {
        if (busyId !== undefined)
            return;
        setDeleteTarget(undefined);
        setError(undefined);
    };
    const confirmDelete = () => {
        const target = deleteTarget;
        if (target === undefined || busyId !== undefined)
            return;
        setBusyId(target.id);
        setError(undefined);
        void actions.remove(target.id)
            .then(() => { setDeleteTarget(undefined); })
            .catch((cause) => { setError(describe(cause)); })
            .finally(() => { setBusyId(undefined); });
    };
    return {
        rows,
        loading: workspaces.phase !== 'ready' || sessions.phase !== 'ready',
        busyId,
        busy: busyId !== undefined,
        deleteTarget,
        error,
        restore,
        requestDelete,
        cancelDelete,
        confirmDelete,
    };
}
//# sourceMappingURL=archive.js.map