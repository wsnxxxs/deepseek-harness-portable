/**
 * Runtime grounding check for `study_map`.
 *
 * A study map is the one visual that claims to describe a person's own source.
 * Until now its `sections[].anchor` was free text, so "Chapter 9" could be
 * emitted for a document that has eight chapters and nothing would notice — the
 * prohibition existed only as a sentence in a reference file with no executor.
 *
 * Inside a learning vault the parse is available, so the claim becomes checkable
 * and this module refuses the map instead of rendering it. The refusal names the
 * real sections, which is what lets the model fix the map on the next step
 * rather than guess again.
 * @module @dsh-portable/interactive-learning/src/material-validation
 */
import type { LearningStudyMapV4 } from './protocol-current.ts';
import { type TopicVault } from './topic-vault.ts';
/** One reason a study map was refused. */
export interface StudyMapViolation {
    /** Payload path, in the same spelling the protocol validator uses. */
    path: string;
    detail: string;
}
/**
 * Check one study map against the vault's parsed structures.
 *
 * @param vault - The vault this session runs in.
 * @param content - The study-map payload, already schema-valid.
 * @returns every violation found; empty means the map is grounded.
 */
export declare function validateStudyMapAgainstVault(vault: TopicVault, content: LearningStudyMapV4): Promise<readonly StudyMapViolation[]>;
/** Render violations as the message the refusing tool result carries. */
export declare function formatStudyMapViolations(violations: readonly StudyMapViolation[]): string;
//# sourceMappingURL=material-validation.d.ts.map