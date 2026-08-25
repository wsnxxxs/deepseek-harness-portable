/**
 * Compatibility-only V1/V2 validators.
 *
 * This module intentionally owns a small copy of the retired wire validators
 * instead of re-exporting them from `protocol.ts`. The broker reaches it via
 * `import()` only when replaying an old activity or handling the retired V2
 * Question/Reveal gate; the current visual/checkpoint path remains on the
 * eager protocol chunk.
 */
import type { ExpectedLearningResponseV2, LearningActivityV1, LearningActivityV2, LearningResponseV1, LearningResponseV2 } from './protocol-current.ts';
/** Validate a retired V1 activity used only by replay/fallback. */
export declare function parseLearningActivity(value: unknown): LearningActivityV1;
/** Validate a retired V1 Client response. */
export declare function parseLearningResponse(value: unknown, expectedActivityId?: string): LearningResponseV1;
/** Validate a retired Question or Reveal activity. */
export declare function parseLearningActivityV2(value: unknown): LearningActivityV2;
/** Validate a retired phase-bound Client receipt. */
export declare function parseLearningResponseV2(value: unknown, expected?: ExpectedLearningResponseV2): LearningResponseV2;
//# sourceMappingURL=legacy-protocol.d.ts.map