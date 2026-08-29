/** General retrieval facade; the existing teaching planner remains one mode. */
import { executeRetrievalPlan, type RetrievalResult } from '../material-retrieval.ts';
import { type LearnerState } from '../learner-state.ts';
import type { Space } from '../space/index.ts';
export type RetrievalPlanner = 'ad-hoc' | 'teaching' | 'artifact';
/** Named value for callers that want to inject the existing teaching planner. */
export declare const TeachingPlanner: RetrievalPlanner;
export interface RetrieveRequest {
    space: Space;
    query?: string;
    scope?: readonly string[];
    budgetChars?: number;
    planner?: RetrievalPlanner;
    preferAnchors?: readonly string[];
    state?: LearnerState;
    sessionQuery?: Parameters<typeof executeRetrievalPlan>[3];
}
/** Retrieve from a Space using ad-hoc, teaching, or future artifact planning. */
export declare function retrieve(request: RetrieveRequest): Promise<RetrievalResult>;
export type { RetrievalPlan, RetrievalResult } from '../material-retrieval.ts';
//# sourceMappingURL=index.d.ts.map