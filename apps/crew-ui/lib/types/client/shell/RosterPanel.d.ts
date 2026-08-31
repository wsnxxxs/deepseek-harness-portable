/**
 * The crew roster.
 *
 * Isomorphic to the official `details` region. Two sources are merged here on
 * purpose:
 *
 * - membership, names and roles come from the durable Team view, so a teammate
 *   that is not currently loaded still appears with its queued work intact;
 * - liveness comes from the Session controller, because "is this member running
 *   right now" is not a durable fact and the log does not carry it.
 *
 * A member row opens that member's own thread. Recursion is the point: a
 * teammate's conversation is a conversation like any other, so it is reached
 * the same way rather than rendered as a nested summary.
 * @module @dsh-portable/crew-ui/client/shell/RosterPanel
 */
import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Props of the roster. */
export interface RosterPanelProps {
    readonly members: readonly TeamMemberView[];
    readonly currentSessionId: SessionId | undefined;
    onOpenMember(member: TeamMemberView): void;
}
/** The right-hand crew roster. */
export declare function RosterPanel({ members, currentSessionId, onOpenMember }: RosterPanelProps): import("react").JSX.Element;
//# sourceMappingURL=RosterPanel.d.ts.map