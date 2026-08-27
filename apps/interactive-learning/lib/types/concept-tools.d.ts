/** Model-facing gates for saving and reviewing user-approved concept cards. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type ToolRuntime } from '@deepseek-ai/dsh-tools';
import type { LearnerState } from './learner-state.ts';
import type { LearningRecallDeckV4 } from './protocol-current.ts';
import { type TopicVault } from './topic-vault.ts';
export declare const CONCEPT_TOOL_NAMES: readonly ["learning_concept_propose", "learning_concept_recall"];
export type ConceptToolContext = Context & {
    tools: ToolRuntime;
    learningActivities: {
        learnerState(agent: Agent): LearnerState;
    };
};
/** Check that a generated recall deck still represents saved card content. */
export declare function validateRecallDeckAgainstVault(vault: TopicVault, deck: LearningRecallDeckV4): Promise<readonly string[]>;
/** Register the host-mediated concept-card tools. */
export declare function registerConceptTools(ctx: ConceptToolContext): void;
//# sourceMappingURL=concept-tools.d.ts.map