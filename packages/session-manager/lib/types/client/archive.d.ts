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
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client';
import type { WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Host-owned mutations the hosting surface routes to the official services. */
export interface ArchiveActions {
    /** Return one session to the sidebar (Workspace Controller). */
    readonly restore: (id: SessionId) => Promise<void>;
    /** Delete one session permanently (Session Controller). */
    readonly remove: (id: SessionId) => Promise<void>;
}
/** The state a surface renders and the callbacks it binds to its controls. */
export interface ArchiveModel {
    /** Archived sessions, newest activity first. */
    readonly rows: readonly SessionSummary[];
    /** True while either controller snapshot is still loading. */
    readonly loading: boolean;
    /** The session a mutation is currently running for, if any. */
    readonly busyId: SessionId | undefined;
    /** True while any mutation is in flight; every control disables on it. */
    readonly busy: boolean;
    /** The row whose delete confirmation is open, if any. */
    readonly deleteTarget: SessionSummary | undefined;
    /** The last failure message, cleared when a new attempt starts. */
    readonly error: string | undefined;
    /** Restore one row. */
    readonly restore: (id: SessionId) => void;
    /** Open the delete confirmation for one row. */
    readonly requestDelete: (session: SessionSummary) => void;
    /** Dismiss the delete confirmation without deleting. */
    readonly cancelDelete: () => void;
    /** Delete the confirmed row. */
    readonly confirmDelete: () => void;
}
/**
 * Derive the archive page's state from the two official snapshots.
 * @param sessions - Session Controller list snapshot.
 * @param workspaces - Workspace Controller snapshot carrying the archive set.
 * @param actions - Host mutations supplied by the hosting surface.
 * @returns the rows to render and the callbacks the controls bind to.
 */
export declare function useArchivedChats(sessions: SessionListState, workspaces: WorkspaceSnapshot, actions: ArchiveActions): ArchiveModel;
//# sourceMappingURL=archive.d.ts.map