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
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { CreateTeamTaskRequest, TeamTaskId, TeamTaskView, TeamView, UpdateTeamTaskRequest } from '@deepseek-ai/dsh-experimental-agent-team/client';
/** Render a Remote failure the way every official surface does. */
export declare function failureText(error: {
    readonly code: string;
    readonly message: string;
}): string;
/**
 * Render a thrown transport failure in the same shape as a Remote refusal.
 *
 * A dropped Host connection arrives as a rejection rather than an `ok: false`
 * envelope, and an operator reading the board should not have to tell the two
 * apart to understand that the board is not current.
 * @param error - whatever the rejected call threw.
 * @returns the message the error line shows.
 */
export declare function transportText(error: unknown): string;
/** Board columns, in the order work moves through them. */
export declare const BOARD_COLUMNS: readonly ["pending", "in_progress", "completed"];
/** One board column. */
export type BoardColumn = typeof BOARD_COLUMNS[number];
/** What the board surface reads. */
export interface BoardState {
    /** Latest authoritative view, or undefined before the first load settles. */
    readonly view: TeamView | undefined;
    /** True only while the FIRST load of this mission is outstanding. */
    readonly loading: boolean;
    /** Last failure, already formatted for display. */
    readonly error: string | undefined;
    /** Task ids with an outstanding write; their own controls are disabled. */
    readonly pending: ReadonlySet<string>;
    /** Re-read the authoritative view. */
    refresh(): Promise<void>;
    /** Create a task. Resolves to the created task, or undefined when refused. */
    create(request: CreateTeamTaskRequest): Promise<TeamTaskView | undefined>;
    /** Apply one compare-and-set action to a task. */
    update(request: UpdateTeamTaskRequest): Promise<TeamTaskView | undefined>;
    /** Clear the visible error without touching the board. */
    dismissError(): void;
}
/** Group tasks into board columns, dropping the deleted tombstones. */
export declare function groupTasks(tasks: readonly TeamTaskView[]): Record<BoardColumn, TeamTaskView[]>;
/**
 * Subjects of the tasks a task waits on, for a legible dependency chip.
 * @param task - the blocked task.
 * @param tasks - every task on the board.
 * @returns one label per blocker, falling back to the raw id when the blocker
 *   is gone — a dangling dependency is worth showing, not hiding.
 */
export declare function blockerLabels(task: TeamTaskView, tasks: readonly TeamTaskView[]): string[];
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
export declare function leadSessionId(sessions: ISessions, sessionId: SessionId): SessionId;
/**
 * Drive one mission's board.
 * @param sessionId - the session in view; a teammate resolves to its Lead.
 * @returns the board state and its mutation entry points.
 */
export declare function useBoard(sessionId: SessionId | undefined): BoardState;
export type { TeamTaskId, TeamTaskView, TeamView };
//# sourceMappingURL=board.d.ts.map