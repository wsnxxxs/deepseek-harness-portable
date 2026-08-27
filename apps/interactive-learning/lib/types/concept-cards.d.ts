/** User-approved concept cards and their small review schedule. */
import { type ReanchorOutcome } from './material-reanchor.ts';
import { type LearnerConceptRecord, type LearnerMemory } from './learner-memory.ts';
import { type SourceStructure } from './ingest/types.ts';
import type { LearnerEvidence, LearnerMastery, LearnerMasteryBasis, LearnerState } from './learner-state.ts';
import type { LearningStudyMapV4 } from './protocol-current.ts';
import type { TopicVault } from './topic-vault.ts';
export declare const MAX_CONCEPT_CARDS = 48;
export declare const INITIAL_REVIEW_INTERVAL_DAYS = 3;
export type ConceptCardRating = 'revealed' | 'mastered' | 'review';
export interface ConceptCardDraft {
    conceptSlug: string;
    label: string;
    mastery: LearnerMastery;
    masteryBasis: LearnerMasteryBasis;
    due: string;
    intervalDays: number;
    anchors: readonly string[];
    staleAnchors: readonly string[];
    explanation: string;
    misconceptions: readonly string[];
    unverifiedTransfer: string;
    relatedConcepts: readonly string[];
}
export type ConceptCard = Omit<ConceptCardDraft, 'due'> & {
    due: string | null;
    lastReviewedAt: string | null;
    createdAt: string;
    updatedAt: string;
    /** Markdown after the YAML frontmatter, retained when the card is updated. */
    body: string;
    path: string;
};
export interface ConceptCardSchedule {
    due: string;
    intervalDays: number;
    lastReviewedAt: string;
}
export declare function dateKey(now?: Date): string;
export declare function isConceptDue(due: string | null | undefined, now?: Date): boolean;
/** Build the actual saved-card view used by the second `study_map` mode. */
export declare function buildConceptStudyMap(vault: TopicVault, goal?: string, now?: Date): Promise<LearningStudyMapV4>;
/** The small, deterministic schedule used for the first review after a card is saved. */
export declare function reviewIntervalDays(mastery: LearnerMastery, independence?: LearnerEvidence['independence']): number;
/** Apply one learner-owned rating without pretending the rating is mastery evidence. */
export declare function nextReviewSchedule(card: Pick<ConceptCard, 'intervalDays' | 'mastery'>, rating: ConceptCardRating, now?: Date): ConceptCardSchedule | undefined;
/** D1's gate: only a correct, independent, fresh transfer can create a card. */
export declare function hasFreshIndependentTransfer(state: LearnerState): boolean;
/** Quote one scalar for the frontmatter writers; shared with the notes store. */
export declare function yamlString(value: string): string;
export declare function renderConceptCard(value: ConceptCardDraft | ConceptCard, now?: Date): string;
export declare function conceptCardPathOf(vault: TopicVault, conceptSlug: string): string;
export interface ParsedMarkdownCard {
    fields: Map<string, string | null>;
    lists: Map<string, string[]>;
    body: string;
}
export declare function parseMarkdownFrontmatter(raw: string): ParsedMarkdownCard | undefined;
export declare function labelFromBody(body: string): string;
export declare function readConceptCard(vault: TopicVault, conceptSlug: string): Promise<ConceptCard | undefined>;
export declare function readConceptCards(vault: TopicVault): Promise<readonly ConceptCard[]>;
export declare function saveConceptCard(vault: TopicVault, draft: ConceptCardDraft, now?: Date): Promise<ConceptCard>;
export declare function updateConceptCardSchedule(vault: TopicVault, conceptSlug: string, schedule: ConceptCardSchedule): Promise<ConceptCard | undefined>;
export declare function updateConceptCardAnchors(vault: TopicVault, conceptSlug: string, anchors: readonly string[], staleAnchors: readonly string[]): Promise<ConceptCard | undefined>;
export declare function conceptRecordFromCard(card: ConceptCard): LearnerConceptRecord;
/** Merge user-approved cards into the machine memory only for prompt/UI reads. */
export declare function readLearnerMemoryWithCards(vault: TopicVault): Promise<LearnerMemory>;
export declare function conceptCardDraftFromState(state: LearnerState, options?: {
    explanation?: string;
    unverifiedTransfer?: string;
    relatedConcepts?: readonly string[];
}, now?: Date): ConceptCardDraft | undefined;
export declare function recallCardIdOf(conceptSlug: string): string;
/** Re-anchor durable cards when an imported source is rebuilt. */
export declare function reanchorConceptCards(vault: TopicVault, previous: SourceStructure | undefined, next: SourceStructure): Promise<ReanchorOutcome>;
//# sourceMappingURL=concept-cards.d.ts.map