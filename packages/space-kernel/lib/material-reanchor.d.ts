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
/** Re-anchor one pair of active/stale citation lists against a rebuilt source. */
export declare function reanchorAnchorLists(currentAnchors: readonly string[], currentStaleAnchors: readonly string[], previous: SourceStructure | undefined, next: SourceStructure): {
    anchors: readonly string[];
    staleAnchors: readonly string[];
    outcome: ReanchorOutcome;
    changed: boolean;
};
/** A sentence describing a re-anchor pass, or `''` when nothing moved. */
export declare function describeReanchor(outcome: ReanchorOutcome, sourceTitle: string): string;
//# sourceMappingURL=material-reanchor.d.ts.map