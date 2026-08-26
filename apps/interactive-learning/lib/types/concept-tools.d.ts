/** Model-facing gates for saving and reviewing user-approved concept cards. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type ToolRuntime } from '@deepseek-ai/dsh-tools';
import type { LearnerState } from './learner-state.ts';
export declare const CONCEPT_TOOL_NAMES: readonly ["learning_concept_propose", "learning_concept_recall"];
export type ConceptToolContext = Context & {
    tools: ToolRuntime;
    learningActivities: {
        learnerState(agent: Agent): LearnerState;
    };
};
/** Register the host-mediated concept-card tools. */
export declare function registerConceptTools(ctx: ConceptToolContext): void;
//# sourceMappingURL=concept-tools.d.ts.map