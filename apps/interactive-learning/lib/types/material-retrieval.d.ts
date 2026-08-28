/**
 * State-driven retrieval: the learner's state decides what to look for, not the
 * learner's question.
 *
 * Every other retrieval interface in this space takes a query string. This one
 * takes none. `LearnerGap`, `currentMisconception`, `failedMoves`, and `phase`
 * are already maintained by the teaching loop, and they say something a question
 * does not: WHY the next passage is needed. "The learner believes closures
 * capture values" calls for counter-evidence; "the worked example already
 * failed" calls for a different example, not the same one again.
 *
 * `planRetrieval` is therefore a pure function over state, which makes retrieval
 * quality a deterministic property that can be unit-tested rather than a matter
 * of prompt luck.
 * @module @dsh-portable/interactive-learning/src/material-retrieval
 */
import type { LearnerState } from './learner-state.ts';
import { type TopicVault } from './topic-vault.ts';
/**
 * Why the next passage is being retrieved. A closed set: each member names a
 * teaching situation the state can actually distinguish, and each maps to a
 * different thing to look for in the material.
 */
export declare const RETRIEVAL_INTENTS: readonly ["counter-evidence", "second-example", "prerequisite-backfill", "notation-decode", "transfer-context", "verbatim-anchor"];
export type RetrievalIntent = typeof RETRIEVAL_INTENTS[number];
/** What to retrieve, and why. Derived entirely from learner state. */
export interface RetrievalPlan {
    intent: RetrievalIntent;
    /** The state fields that selected this intent, for the tool result and tests. */
    rationale: string;
    /** Literal phrases to look for; derived from state, never model-supplied. */
    terms: readonly string[];
    /** Anchors already cited this session, preferred when ranking. */
    preferredAnchors: readonly string[];
    /** Whether what the learner said in earlier sessions changes the next move. */
    includeLearnerPrior: boolean;
    /** Characters of material this plan may spend. */
    budgetChars: number;
}
/** Default per-turn material budget; matches the eval's budget metric. */
export declare const DEFAULT_RETRIEVAL_BUDGET_CHARS = 4000;
/**
 * Extract literal phrases worth searching for from a piece of learner-state
 * prose.
 *
 * The two scripts need different handling because a term has to be a SUBSTRING
 * of the source to match anything. Latin text splits on whitespace and each word
 * is already the right size. CJK has no word boundary, and taking a contiguous
 * run whole produces a ten-character phrase that will never appear verbatim — so
 * runs are split on grammatical particles, short compounds are kept as they are,
 * and an over-long compound falls back to character bigrams.
 *
 * The bigrams are deliberately noisy. Most match nothing and therefore score
 * nothing, while the real compounds inside the run do match; since ranking
 * counts DISTINCT matched terms, the noise costs precision in the term list but
 * not in the ranking.
 * @param text - Goal, misconception, or similar state prose.
 * @returns bounded, deduplicated phrases, most specific first.
 */
export declare function keyPhrases(text: string): readonly string[];
/**
 * Derive what to retrieve from the current learner state.
 *
 * Precedence is deliberate and ordered by how much the situation constrains the
 * answer: a live misconception needs contradicting evidence before anything
 * else, a failed example needs a different one, and only when nothing more
 * specific applies does this fall back to finding where the material states the
 * goal.
 *
 * `focus` is the exception to that ordering. State is an inference about what
 * the learner needs; a phrase they typed is not. When one is supplied it leads
 * the search and can plan a retrieval on its own, so a learner who names a
 * section gets it even in a session whose state is still empty.
 * @param state - The current learner state.
 * @param budgetChars - Material budget for this turn.
 * @param focus - The learner's own words about what to find, when they said.
 * @returns the plan, or `undefined` when neither state nor focus says anything.
 */
export declare function planRetrieval(state: LearnerState, budgetChars?: number, focus?: string): RetrievalPlan | undefined;
/** One retrieved passage, ready to cite. */
export interface RetrievedPassage {
    sourceId: string;
    sectionId: string;
    label: string;
    anchor: string;
    page?: number;
    text: string;
    matchedTerms: readonly string[];
}
/** One thing the learner said about this concept in an earlier session. */
export interface LearnerPriorExcerpt {
    sessionId: string;
    when: string;
    text: string;
}
/** What one retrieval produced. */
export interface RetrievalResult {
    plan: RetrievalPlan;
    passages: readonly RetrievedPassage[];
    learnerPrior: readonly LearnerPriorExcerpt[];
    /** Characters of material text in `passages`; the budget metric's input. */
    usedChars: number;
}
/** Return the supplied terms that occur in a body, preserving their order. */
export declare function matchedTerms(body: string, terms: string | readonly string[]): readonly string[];
/** Excerpt around the first matched term, bounded. */
export declare function excerptAround(body: string, matched: string | readonly string[], limit: number): string;
/** The session-query reads this module uses; opportunistic, never required. */
interface SessionQueryLike {
    filterEvents(sessionId: string, filters: readonly ({
        kind: 'type';
        values: readonly string[];
    } | {
        kind: 'text';
        text: string;
    })[]): Promise<readonly {
        seq: number;
        time: number;
        text: string;
    }[]>;
}
/**
 * Execute one plan against a vault.
 * @param vault - The vault to retrieve from.
 * @param plan - The plan from {@link planRetrieval}.
 * @param state - The state the plan came from, for the learner-prior leg.
 * @param sessionQuery - Optional `ctx.sessionQuery`.
 * @returns the passages, bounded by the plan's budget.
 */
export declare function executeRetrievalPlan(vault: TopicVault, plan: RetrievalPlan, state: LearnerState, sessionQuery?: SessionQueryLike): Promise<RetrievalResult>;
export {};
//# sourceMappingURL=material-retrieval.d.ts.map