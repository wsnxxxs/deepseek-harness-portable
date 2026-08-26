/**
 * Re-anchoring: what happens to a learner's stored citations when the source
 * they cite is replaced by a new edition.
 *
 * The two halves of a vault have different lifetimes. `extracted/` and
 * `.learning/structure/` are caches and are rebuilt wholesale on reimport;
 * learner memory is a user asset and must survive. This module is the bridge: it
 * moves each stored anchor onto the rebuilt structure, and when an anchor no
 * longer corresponds to anything, marks it stale rather than quietly keeping a
 * page number that now points somewhere else.
 *
 * Resolution order is heading path, then the opening-text hash recorded by the
 * PREVIOUS parse. The hash is what recovers a section that was merely retitled —
 * which is the common case for a second edition, and the case where silently
 * dropping the citation would cost the learner the most.
 * @module @dsh-portable/interactive-learning/src/material-reanchor
 */
import type { SourceStructure } from './ingest/types.ts';
import type { TopicVault } from './topic-vault.ts';
/** What one re-anchor pass did. */
export interface ReanchorOutcome {
    /** Anchors whose text changed because the section moved or was renumbered. */
    moved: number;
    /** Anchors that resolved unchanged. */
    unchanged: number;
    /** Anchors that no longer correspond to any section. */
    stale: number;
    /** Anchors previously marked stale that resolve again. */
    recovered: number;
}
/**
 * Move every stored citation for one source onto its rebuilt structure.
 *
 * Called by the ingest pipeline after a source is re-parsed. Writes only when
 * something actually changed, so a routine reingest of unchanged material costs
 * nothing.
 * @param vault - The vault whose memory holds the citations.
 * @param previous - The structure recorded before this reimport, when there was one.
 * @param next - The freshly derived structure.
 * @returns the totals across every concept.
 */
export declare function reanchorVaultMemory(vault: TopicVault, previous: SourceStructure | undefined, next: SourceStructure): Promise<ReanchorOutcome>;
/** A sentence describing a re-anchor pass, or `''` when nothing moved. */
export declare function describeReanchor(outcome: ReanchorOutcome, sourceTitle: string): string;
//# sourceMappingURL=material-reanchor.d.ts.map