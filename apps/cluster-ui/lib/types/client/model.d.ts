/**
 * Everything about Cluster mode that is a decision rather than a rendering.
 *
 * The panel below is a view: it turns the values this module produces into
 * markup and hands operator gestures back to the Remote. Keeping the status
 * mapping, the roster shape, the comma-separated field parsing and the
 * two-carrier failure unwrapping here means each of them is reachable from a
 * plain `node --test` without a DOM, and that the panel has no branch a test
 * cannot reach.
 * @module @dsh-portable/cluster-ui/client/model
 */
import type { TeamMemberView, TeamTaskMutationResult, TeamTaskView, TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client';
import type { ClusterKey } from './locales.ts';
/** The editable fields of one shared task, as typed by the operator. */
export interface TaskDraft {
    readonly subject: string;
    readonly description: string;
    readonly blockers: string;
    readonly scopes: string;
}
/** A cleared form. */
export declare const EMPTY_DRAFT: TaskDraft;
/**
 * Split one comma-separated field into distinct, trimmed, non-empty items.
 * @param value - raw field text.
 * @returns the items, in first-seen order and without duplicates.
 */
export declare function csvItems(value: string): string[];
/**
 * Dictionary key naming one teammate's lifecycle state.
 * @param status - roster status from the Team view.
 */
export declare function memberStatusKey(status: TeamMemberView['status']): ClusterKey;
/**
 * Dictionary key naming one shared task's lifecycle state.
 * @param status - task status from the Team view.
 */
export declare function taskStatusKey(status: TeamTaskView['status']): ClusterKey;
/**
 * Whether a Team view is worth offering a surface of its own.
 *
 * Every session has a Team view — a solo session answers with a roster of one
 * and an empty board — so "the call succeeded" is not the same question as
 * "there is something here". A Team becomes real the moment it has a second
 * member or a single shared task, and it stays real afterwards because a
 * completed board keeps its tasks.
 * @param view - the roster and task board as read.
 */
export declare function isTeamWorthShowing(view: TeamView): boolean;
/** Whether a teammate row can be opened as its own conversation. */
export declare function canOpenMember(member: TeamMemberView): boolean;
/**
 * The roster as indented rows: the lead at the root, teammates one step in.
 *
 * The Team roster is one level deep by construction — a teammate's own
 * teammates belong to that teammate's Team, not to this one — so the depth is
 * derived from the role rather than walked.
 * @param members - roster from the Team view.
 */
export declare function memberTree(members: readonly TeamMemberView[]): readonly {
    readonly member: TeamMemberView;
    readonly depth: number;
}[];
/** The two-carrier result shape a task mutation answers with. */
export type MutationCarrier = {
    readonly ok: false;
    readonly error: {
        readonly message: string;
    };
} | {
    readonly ok: true;
    readonly value: TeamTaskMutationResult;
};
/**
 * Reduce both failure carriers to one message.
 *
 * A task mutation can fail twice over: the Remote call itself can fail, and a
 * call that succeeded can carry a Team rejection (a stale revision, a scope
 * conflict). Both are the same thing to an operator, and neither may be
 * mistaken for success.
 * @param result - the Remote result of a task mutation.
 * @returns the failure message, or undefined when the mutation was applied.
 */
export declare function mutationError(result: MutationCarrier): string | undefined;
/**
 * Walk to the session that owns the Team.
 *
 * A Team is addressed by its lead, so a panel opened on a teammate's own
 * conversation must ask about the ancestor instead. The parent lookup is a
 * parameter so this walk is testable and so the panel is not the thing that
 * knows how a subagent address is spelled.
 * @param sessionId - the session the operator is looking at.
 * @param parentOf - resolves one session's parent, or undefined at the root.
 * @returns the root session id; the input itself when it has no parent.
 */
export declare function rootSessionId(sessionId: string, parentOf: (id: string) => string | undefined): string;
/**
 * Interpolate `{name}` placeholders in a dictionary template.
 * @param template - the resolved copy.
 * @param params - substitutions; an unknown placeholder is left in place.
 */
export declare function interpolate(template: string, params?: Record<string, string | number>): string;
//# sourceMappingURL=model.d.ts.map