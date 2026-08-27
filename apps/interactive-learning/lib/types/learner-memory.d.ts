/**
 * Cross-session learner memory, keyed by (vault, concept) instead of by session.
 *
 * The existing durability mechanism is not replaced. A full learner-state
 * snapshot still rides the session log and is folded back on load, which is what
 * survives refresh, resume, compaction, and fork. What was missing is only a key
 * that outlives one session — so this module writes a SECOND, bounded projection
 * per concept and reads it back when a later session opens the same vault.
 *
 * It lives in the vault rather than in harness storage so the whole promise of
 * the design holds literally: everything a person's learning produced is in one
 * folder they own, and deleting the folder deletes all of it. Note that
 * `.learning/memory.json` is the one file under `.learning/` that is NOT
 * rebuildable — the structure cache beside it is.
 * @module @dsh-portable/interactive-learning/src/learner-memory
 */
import type { LearnerGap, LearnerMastery, LearnerMasteryBasis, LearnerPhase, LearnerState } from './learner-state.ts';
import { type TopicVault } from './topic-vault.ts';
/** Memory-file protocol tag; bumped only on a breaking record change. */
export declare const LEARNER_MEMORY_PROTOCOL: "dsh-learning-memory@1";
/** Concepts rendered into one prompt injection. */
export declare const MAX_RENDERED_CONCEPTS = 12;
/** Maximum characters rendered into one prompt injection. */
export declare const MAX_RENDERED_MEMORY_CHARS = 4000;
/** Concepts retained on disk before the least recently touched are dropped. */
export declare const MAX_STORED_CONCEPTS = 500;
/** One concept's durable learning record within a vault. */
export interface LearnerConceptRecord {
    conceptSlug: string;
    label: string;
    mastery: LearnerMastery;
    masteryBasis: LearnerMasteryBasis;
    phase: LearnerPhase;
    gap: LearnerGap;
    misconceptions: readonly string[];
    anchors: readonly string[];
    /**
     * Anchors that no longer resolve after the source was replaced. Kept rather
     * than dropped: the learner wrote a note against that passage, and silently
     * deleting the citation would hide that their material moved under it.
     */
    staleAnchors: readonly string[];
    /** How many observed evidence items backed the mastery value when stored. */
    evidenceCount: number;
    /** ISO-8601 review date; `null` until scheduling is enabled. */
    due: string | null;
    /** Current review interval in days, when this concept has a saved card. */
    reviewIntervalDays?: number;
    /** Last learner-owned review rating, when one exists. */
    lastReviewedAt?: string | null;
    updatedAt: string;
    /** Sessions this concept was learned in, newest first, for lineage lookups. */
    sessionIds: readonly string[];
}
/** The vault's whole learner memory. */
export interface LearnerMemory {
    protocol: typeof LEARNER_MEMORY_PROTOCOL;
    concepts: readonly LearnerConceptRecord[];
}
/**
 * Validate one stored record.
 *
 * Hand-written rather than schema-driven, matching `learner-state.ts`: the vault
 * is a folder a person can edit, so a malformed record must be dropped quietly
 * rather than fail the session that opened it.
 * @returns the record, or `undefined` when it is not usable.
 */
export declare function parseLearnerConceptRecord(value: unknown): LearnerConceptRecord | undefined;
/** Absolute path of a vault's memory file. */
export declare function memoryPathOf(vault: TopicVault): string;
/**
 * Read a vault's learner memory.
 * @returns the memory, or an empty one when absent or damaged.
 */
export declare function readLearnerMemory(vault: TopicVault): Promise<LearnerMemory>;
/** Write a vault's learner memory, newest first and bounded. */
export declare function writeLearnerMemory(vault: TopicVault, memory: LearnerMemory): Promise<void>;
/**
 * Merge one concept record into a vault's memory.
 *
 * Mastery never silently regresses: a stored `transfer` stays unless the new
 * record is an explicit user correction. A later session that opens on an
 * orientation turn must not erase evidence an earlier session actually observed.
 * @param vault - The vault holding the memory.
 * @param record - The record to merge.
 * @returns the memory after the merge.
 */
export declare function upsertLearnerConcept(vault: TopicVault, record: LearnerConceptRecord): Promise<LearnerMemory>;
/**
 * Project a live learner state into a durable concept record.
 *
 * A state with no goal is not a concept anyone can look up later, so it produces
 * nothing rather than an unnamed record.
 * @param state - The current learner state.
 * @param sessionId - The session that produced it.
 * @returns the record, or `undefined` when there is nothing worth storing.
 */
export declare function conceptRecordFromState(state: LearnerState, sessionId: string): LearnerConceptRecord | undefined;
/**
 * Render the memory as a bounded prompt block.
 *
 * Explicitly framed as prior sessions' observations, not as current fact: the
 * standing policy already forbids inventing learner evidence, and memory read
 * back from disk is exactly the kind of input that could be mistaken for
 * something observed this turn.
 * @param memory - The vault's memory.
 * @param options - Vault title and how many concepts to render.
 * @returns the prompt block, or `''` when the memory is empty.
 */
export declare function renderLearnerMemory(memory: LearnerMemory, options?: {
    title: string;
    limit?: number;
    goal?: string;
    maxChars?: number;
}): string;
//# sourceMappingURL=learner-memory.d.ts.map