/**
 * Small pre-routing classifier for the Learning preset.
 *
 * It answers one narrow question: is the user asking to build understanding,
 * or asking for a different kind of help? Teaching route selection happens
 * after this boundary. The classifier is deliberately evidence-based; it does
 * not infer a learner level from topic vocabulary.
 */
export declare const LEARN_INTENT: "learn";
export type LearnIntent = typeof LEARN_INTENT | 'not-learn';
/**
 * Confidence is about the classifier's boundary decision, not the learner's
 * knowledge.  A low-confidence result is a useful hint, but the model may
 * reclassify it from the user's actual words.
 */
export type LearnIntentConfidence = 'high' | 'medium' | 'low';
export type LearnTrigger = 'explicit-learning' | 'definition' | 'bare-concept' | 'confusion-repair' | 'learning-path' | 'conceptual-question' | 'explicit-overview' | 'current-topic' | 'resource-creation' | 'coding-task' | 'calculation-task' | 'factual-lookup' | 'troubleshooting-task' | 'translation-task' | 'news-request' | 'current-fact-lookup' | 'resource-recommendation' | 'opinion-judgment' | 'unknown';
export interface LearnIntentDecision {
    intent: LearnIntent;
    trigger: LearnTrigger;
    confidence: LearnIntentConfidence;
    /** A short stable explanation for tests and route diagnostics, not a model profile. */
    reason: string;
}
export type LearnIntentRuleKind = 'trigger' | 'dont-trigger';
/**
 * Natural-language rule inventory.  These descriptions are the source a
 * maintainer reviews when changing the boundary; they are deliberately not
 * used to generate regular expressions.
 */
export declare const LEARN_INTENT_NATURAL_LANGUAGE_RULES: {
    readonly trigger: readonly ["Explicitly teach, explain, understand, ELI5, or learn a concept.", "Ask what a concept means, why/how a mechanism works, or how concepts differ.", "Report persistent confusion, forgetting, rustiness, or a need for a refresher.", "Ask for prerequisites, a learning path, an overview of a current/contested topic, or a study artifact.", "Give only a short concept name when the likely goal is to build understanding."];
    readonly dontTrigger: readonly ["Ask to implement, write, debug, calculate, translate, rewrite, or troubleshoot a concrete task.", "Ask for a stable/current fact, a latest-news update, a resource recommendation, or an opinion/verdict.", "Use a study-artifact word to ask for software rather than a learning resource.", "Negate the learning request itself (for example, “do not explain this”) while asking for another task."];
};
/**
 * Explicit precedence table for the classifier's hand-written if/else order.
 * Lower priority number wins. Exclusions intentionally precede broad learning
 * words, while a clear request to learn a mechanism precedes an ambiguous
 * implementation verb when no concrete code context is present.
 */
export declare const LEARN_INTENT_RULES: readonly [{
    readonly id: "translation-task";
    readonly kind: "dont-trigger";
    readonly trigger: "translation-task";
    readonly priority: 10;
    readonly conflict: "wins over every learning cue";
}, {
    readonly id: "resource-recommendation";
    readonly kind: "dont-trigger";
    readonly trigger: "resource-recommendation";
    readonly priority: 20;
    readonly conflict: "wins unless a study artifact is explicitly requested";
}, {
    readonly id: "resource-software-task";
    readonly kind: "dont-trigger";
    readonly trigger: "coding-task";
    readonly priority: 30;
    readonly conflict: "wins over resource-creation words";
}, {
    readonly id: "resource-creation";
    readonly kind: "trigger";
    readonly trigger: "resource-creation";
    readonly priority: 40;
    readonly conflict: "wins over broad learning words unless negated or software-shaped";
}, {
    readonly id: "coding-task";
    readonly kind: "dont-trigger";
    readonly trigger: "coding-task";
    readonly priority: 50;
    readonly conflict: "wins when concrete code context is present";
}, {
    readonly id: "calculation-task";
    readonly kind: "dont-trigger";
    readonly trigger: "calculation-task";
    readonly priority: 60;
    readonly conflict: "wins unless explicit learning language is the only request";
}, {
    readonly id: "troubleshooting-task";
    readonly kind: "dont-trigger";
    readonly trigger: "troubleshooting-task";
    readonly priority: 70;
    readonly conflict: "wins for personal failures/problems";
}, {
    readonly id: "negated-learning";
    readonly kind: "dont-trigger";
    readonly trigger: "unknown";
    readonly priority: 80;
    readonly conflict: "wins when the learning request itself is negated";
}, {
    readonly id: "current-survey";
    readonly kind: "trigger";
    readonly trigger: "current-topic";
    readonly priority: 90;
    readonly conflict: "current structured survey before current-value lookup";
}, {
    readonly id: "current-fact-lookup";
    readonly kind: "dont-trigger";
    readonly trigger: "current-fact-lookup";
    readonly priority: 100;
    readonly conflict: "wins for a requested current value";
}, {
    readonly id: "factual-lookup";
    readonly kind: "dont-trigger";
    readonly trigger: "factual-lookup";
    readonly priority: 110;
    readonly conflict: "wins for a stable factual value";
}, {
    readonly id: "news-request";
    readonly kind: "dont-trigger";
    readonly trigger: "news-request";
    readonly priority: 120;
    readonly conflict: "wins for latest/breaking updates";
}, {
    readonly id: "opinion-judgment";
    readonly kind: "dont-trigger";
    readonly trigger: "opinion-judgment";
    readonly priority: 130;
    readonly conflict: "wins for a verdict or personal take";
}, {
    readonly id: "acknowledgement";
    readonly kind: "dont-trigger";
    readonly trigger: "unknown";
    readonly priority: 140;
    readonly conflict: "does not open a new learning segment";
}, {
    readonly id: "small-talk";
    readonly kind: "dont-trigger";
    readonly trigger: "unknown";
    readonly priority: 141;
    readonly conflict: "does not open or continue a learning segment";
}, {
    readonly id: "confusion-repair";
    readonly kind: "trigger";
    readonly trigger: "confusion-repair";
    readonly priority: 150;
    readonly conflict: "wins over broad question wording";
}, {
    readonly id: "learning-path";
    readonly kind: "trigger";
    readonly trigger: "learning-path";
    readonly priority: 160;
    readonly conflict: "wins over generic how-to wording";
}, {
    readonly id: "definition";
    readonly kind: "trigger";
    readonly trigger: "definition";
    readonly priority: 170;
    readonly conflict: "wins over generic conceptual wording";
}, {
    readonly id: "current-conceptual";
    readonly kind: "trigger";
    readonly trigger: "current-topic";
    readonly priority: 180;
    readonly conflict: "current conceptual explanation after stable definition checks";
}, {
    readonly id: "explicit-overview";
    readonly kind: "trigger";
    readonly trigger: "explicit-overview";
    readonly priority: 190;
    readonly conflict: "wins when a structured overview is explicitly requested";
}, {
    readonly id: "explicit-learning";
    readonly kind: "trigger";
    readonly trigger: "explicit-learning";
    readonly priority: 200;
    readonly conflict: "wins over ambiguous verbs without concrete task context";
}, {
    readonly id: "conceptual-question";
    readonly kind: "trigger";
    readonly trigger: "conceptual-question";
    readonly priority: 210;
    readonly conflict: "wins for mechanism/cause/contrast questions";
}, {
    readonly id: "bare-concept";
    readonly kind: "trigger";
    readonly trigger: "bare-concept";
    readonly priority: 220;
    readonly conflict: "fallback; low confidence because the desired help shape is unknown";
}];
export type LearnIntentRuleId = typeof LEARN_INTENT_RULES[number]['id'];
export declare const LEARN_INTENT_MODEL_GUIDANCE: string;
/** Classify the first-turn request before choosing a teaching route. */
export declare function classifyLearnIntent(input: string): LearnIntentDecision;
export declare function isLearnIntent(input: string): boolean;
/** Whether a message explicitly closes or switches away from a learning segment. */
export declare function isLearningBoundary(input: string): boolean;
/** Compact standing text; detailed diagnosis and moves stay in references. */
export declare const LEARNING_INTENT_POLICY: string;
//# sourceMappingURL=learn-intent.d.ts.map