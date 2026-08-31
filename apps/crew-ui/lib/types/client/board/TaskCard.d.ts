/**
 * One task on the board.
 *
 * The card shows the three things a shared board has that a todo list does not,
 * and shows them without being asked: what the task waits on, what it will
 * write, and whether that write scope collides with another task in flight.
 * The host computes the collision (`writeScopeWarnings`) and refuses nothing —
 * it is advice, and advice the operator can act on is worth surfacing at the
 * task rather than in a log.
 * @module @dsh-portable/crew-ui/client/board/TaskCard
 */
import type { TeamMemberView, TeamTaskAction, TeamTaskView } from '@deepseek-ai/dsh-experimental-agent-team/client';
/** Extra fields an action carries. */
export type TaskActionExtra = {
    readonly owner?: string;
};
/** Props of one task card. */
export interface TaskCardProps {
    readonly task: TeamTaskView;
    /** Every task, so blockers can be named rather than shown as ids. */
    readonly tasks: readonly TeamTaskView[];
    readonly members: readonly TeamMemberView[];
    /** A write on this task is outstanding; its own controls are disabled. */
    readonly busy: boolean;
    onEdit(): void;
    onAction(action: TeamTaskAction, extra?: TaskActionExtra): void;
}
/** A single board task with its dependency, scope and ownership state. */
export declare function TaskCard({ task, tasks, members, busy, onEdit, onAction }: TaskCardProps): import("react").JSX.Element;
//# sourceMappingURL=TaskCard.d.ts.map