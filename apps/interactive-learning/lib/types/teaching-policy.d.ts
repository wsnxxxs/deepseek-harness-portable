/**
 * Compact standing policy for the Learning preset.
 *
 * The core is injected for every Learning request. Graded-work and visual
 * construction rules are conditional additions so ordinary turns do not pay
 * for details they cannot use. `LEARNING_TEACHING_POLICY` remains an alias
 * for callers that only need the standing layer.
 *
 * Intent classification is deliberately absent. The Host classifies the turn
 * and ships the conclusion in `learning:turn-route`; a low-confidence turn
 * additionally gets `LEARN_INTENT_MODEL_GUIDANCE`, which is the same boundary
 * in more detail. Restating it here made the standing layer ask every turn for
 * a classification the turn context had already supplied, and doubled the
 * guidance on exactly the low-confidence turns that can least afford it.
 */
export type LearningPolicyRoute = 'calibrate' | 'teach-minimum' | 'overview' | 'direct' | 'continue';
export interface LearningPolicyContext {
    /** The request is inside an observable graded/submitted context. */
    graded?: boolean;
    /** A native learning visual is available and was selected for this route. */
    visual?: boolean;
    route?: LearningPolicyRoute;
    /** Add short Chinese scaffolding templates when the turn is Chinese/mixed. */
    language?: 'en' | 'zh' | 'mixed';
    /** The session runs in a learning folder that holds parsed material. */
    material?: boolean;
    /** The learning folder contains at least one user-approved concept card. */
    concepts?: boolean;
    /** The session runs inside a learning folder at all, cards or not. */
    vault?: boolean;
}
export declare const LEARNING_TEACHING_POLICY_CORE: string;
/** Inject only when the turn is known to be assessed or submitted. */
export declare const LEARNING_GRADED_POLICY: string;
/** Inject only when a visual route has actually been selected. */
export declare const LEARNING_VISUAL_POLICY: string;
/**
 * Inject only when the session runs in a learning folder holding parsed
 * material. Nothing here restates or weakens the core policy's existing ban on
 * inventing source anchors; it names the tools that make the ban checkable and
 * the coverage boundary the parse actually reports.
 */
export declare const LEARNING_MATERIAL_POLICY: string;
/**
 * Inject whenever a learning folder exists. Saving a card needs only a vault;
 * gating this with the review layer hid the save path from every session that
 * had not saved a card yet, which is exactly the session where a learner asks.
 */
export declare const LEARNING_CONCEPT_SAVE_POLICY: string;
/** Inject only when this vault has a real, user-approved card to review. */
export declare const LEARNING_REVIEW_POLICY: string;
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