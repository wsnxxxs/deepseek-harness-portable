/** The readable plan proposal surface used by the conversation and review flow. */
import type { ReactNode } from 'react';
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
export interface ProposedPlanParts {
    readonly before: string;
    readonly plan: string;
    readonly after: string;
    readonly partial: boolean;
}
/** Extract the structured plan envelope used by planning agents. */
export declare function extractProposedPlan(text: string, allowPartial?: boolean): ProposedPlanParts | undefined;
/** Pull the first H1 out as the proposal headline, matching the source UI. */
export declare function splitPlanTitle(markdown: string, fallback: string): {
    title: string;
    body: string;
};
interface PlanPreviewCardProps {
    readonly sessionId?: SessionId;
    readonly markdown: string;
    readonly labels: MarkdownLabels;
    readonly partial?: boolean;
    /** Review cards already have an authoritative pending interaction. */
    readonly current?: boolean;
    readonly actionsEnabled?: boolean;
    readonly footer?: ReactNode;
    readonly showStatus?: boolean;
    readonly ariaLabel?: string;
}
/** A compact, glass version of the plan proposal shown in the conversation. */
export declare function PlanPreviewCard(props: PlanPreviewCardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=PlanPreview.d.ts.map