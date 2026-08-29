/** The compact live plan card shown above the composer. */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
export interface PlanCardProps {
    readonly sessionId: SessionId | undefined;
    /** Parent-controlled visibility for surfaces that temporarily hide plans. */
    readonly open?: boolean;
}
/** Render the current `todos` projection with a transcript replay fallback. */
export declare function PlanCard({ sessionId, open }: PlanCardProps): import("react").JSX.Element | null;
//# sourceMappingURL=PlanCard.d.ts.map