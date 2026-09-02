/**
 * Client entry: the composer takeover, the replayable keyed tool renderers, the
 * current-session learning progress view.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export { subscribeLearningUiLifecycle, type LearningUiLifecycleEvent } from './lifecycle.ts';
export declare const LEARNING_TOOL_VIEW_KEYS: readonly ["learning_visual", "learning_checkpoint", "learning_state_update"];
/** Learner-state writes are internal bookkeeping and never produce a card. */
export declare function LearningStateUpdateToolView(): null;
export declare const name = "interactive-learning-client";
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map