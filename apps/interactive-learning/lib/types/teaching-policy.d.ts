export type LearningPolicyRoute = 'calibrate' | 'teach-minimum' | 'overview' | 'direct' | 'continue';
export interface LearningPolicyContext {
    /** The request is inside an observable graded/submitted context. */
    graded?: boolean;
    /** A native learning visual is available and was selected for this route. */
    visual?: boolean;
    route?: LearningPolicyRoute;
    /** Add short Chinese scaffolding templates when the turn is Chinese/mixed. */
    language?: 'en' | 'zh' | 'mixed';
}
export declare const LEARNING_TEACHING_POLICY_CORE: string;
/** Inject only when the turn is known to be assessed or submitted. */
export declare const LEARNING_GRADED_POLICY: string;
/** Inject only when a visual route has actually been selected. */
export declare const LEARNING_VISUAL_POLICY: string;
/** Short templates make the standing/tool prompt usable for Chinese turns. */
export declare const LEARNING_CHINESE_TEMPLATES: string;
/**
 * Build the prompt layers for a particular turn. The caller decides when a
 * graded flag or native visual is observable; this helper does not infer it.
 */
export declare function buildLearningTeachingPolicy(context?: LearningPolicyContext): string;
/** Backwards-compatible standing-layer name used by existing agent wiring. */
export declare const LEARNING_TEACHING_POLICY: string;
//# sourceMappingURL=teaching-policy.d.ts.map