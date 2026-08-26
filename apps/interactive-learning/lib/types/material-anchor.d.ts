/**
 * Anchor resolution: the single implementation shared by the runtime check and
 * the offline metric.
 *
 * That sharing is the point. `learning_visual` refuses a study map whose anchors
 * do not resolve, and `eval-material` measures anchor precision on a recorded
 * trajectory; if those two used different resolvers, the metric would stop
 * describing the thing the product actually enforces.
 * @module @dsh-portable/interactive-learning/src/material-anchor
 */
import { type SourceSection, type SourceStructure } from './ingest/types.ts';
/** One resolvable location: a parsed section reduced to its identity. */
export interface AnchorTarget {
    sourceId: string;
    sectionId: string;
    label: string;
    headingPath: readonly string[];
    page?: number;
}
/** Separator between the heading levels of a rendered anchor. */
export declare const ANCHOR_PATH_SEPARATOR = " \u203A ";
/**
 * Render the anchor text for one section: `sourceId#a › b › c (p.N)`.
 *
 * Human-readable on purpose — this string ends up in a learner's own notes and
 * in `LearnerState.sourceAnchors`, where an opaque id would be useless.
 */
export declare function formatSectionAnchor(sourceId: string, section: SourceSection): string;
/**
 * Whether two string lists are equal — a heading chain against another, or one
 * anchor list against another.
 *
 * Compared element by element rather than through a joined key: a separator is
 * either a character the strings could contain (ambiguous) or a control
 * character embedded in source (fragile), and neither is worth it here.
 */
export declare function sameStringList(left: readonly string[], right: readonly string[]): boolean;
/** Reduce a parsed structure to its resolvable targets. */
export declare function anchorTargetsOf(structure: SourceStructure): readonly AnchorTarget[];
/** Render the canonical anchor for a reduced target. */
export declare function formatAnchorTarget(target: AnchorTarget): string;
/**
 * The section an anchor names.
 *
 * Resolution is by longest match, not first match: an anchor naming
 * `第3章 › 3.2 闭包` contains its parent's label too, and choosing the parent
 * would attribute a claim to the wrong section's text.
 * @param anchor - Anchor text, in any of the forms this module renders.
 * @param targets - Candidate sections, usually from {@link anchorTargetsOf}.
 * @returns the matched target, or `undefined` when nothing matches.
 */
export declare function resolveAnchorTarget<T extends AnchorTarget>(anchor: string, targets: readonly T[]): T | undefined;
/** The page an anchor names, when it names one. */
export declare function anchorPage(anchor: string): number | undefined;
/** An anchor taken apart into the pieces a reimport needs. */
export interface ParsedAnchor {
    /** Source id, when the anchor carries one. */
    sourceId?: string;
    headingPath: readonly string[];
    page?: number;
}
/**
 * Take an anchor apart. The inverse of {@link formatSectionAnchor}, and lenient:
 * an anchor a person typed by hand into their own notes still yields whatever
 * heading path it does carry.
 */
export declare function parseAnchorText(anchor: string): ParsedAnchor;
/** Every section-like reference in one block of text, in order, deduplicated. */
export declare function sectionMentions(text: string): readonly string[];
/** Whether a section or page reference corresponds to something parsed. */
export declare function mentionSupported(mention: string, targets: readonly AnchorTarget[]): boolean;
//# sourceMappingURL=material-anchor.d.ts.map