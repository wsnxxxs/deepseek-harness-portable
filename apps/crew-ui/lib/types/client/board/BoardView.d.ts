/**
 * The mission board.
 *
 * This is Mission Control's landing surface, and the reason the surface exists:
 * the board is a shared human/agent artifact, so the operator gets the same
 * verbs the Lead has — create, edit, assign, complete, reopen, release, delete
 * — rather than a rendering of what the agent decided.
 *
 * Three columns, in the order work moves through them. Within a column the
 * unblocked tasks come first, because "what can start now" is the question a
 * board is scanned for.
 * @module @dsh-portable/crew-ui/client/board/BoardView
 */
import type { TeamMemberView } from '@deepseek-ai/dsh-experimental-agent-team/client';
import { type BoardState } from '../state/board.ts';
/** Props of the board. */
export interface BoardViewProps {
    /** The live board. */
    readonly board: BoardState;
    /** Roster, for the assignment menu. */
    readonly members: readonly TeamMemberView[];
}
/** The three-column mission board. */
export declare function BoardView({ board, members }: BoardViewProps): import("react").JSX.Element;
//# sourceMappingURL=BoardView.d.ts.map