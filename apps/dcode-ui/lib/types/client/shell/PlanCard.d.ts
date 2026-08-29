/** The compact live plan card shown above the composer. */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { NavigationStore } from '../state/navigation.ts';
export interface PlanCardProps {
    readonly sessionId: SessionId | undefined;
    /** Top-bar controlled visibility of the pinned summary. */
    readonly open?: boolean;
    /** Opens the real tool detail when a trace row is selected. */
    readonly navigation?: NavigationStore;
}
/** Render the current `todos` projection with a transcript replay fallback. */
export declare function PlanCard({ sessionId, open, navigation }: PlanCardProps): import("react").JSX.Element | null;
//# sourceMappingURL=PlanCard.d.ts.map