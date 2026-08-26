/**
 * The emitter: one {@link ParsedSource} becomes the extracted markdown a learner
 * (and `grep`) can read, plus the {@link SourceStructure} that is the single
 * source of truth for section ids and anchors.
 *
 * Nothing here consults a model. Every section id, label, and page marker is
 * derived from the parse, which is what makes a hallucinated chapter detectable
 * rather than merely discouraged.
 * @module @dsh-portable/interactive-learning/src/ingest/markdown
 */
import { type ParsedSource, type SourceSection, type SourceStructure } from './types.ts';
/** Marker opening every extracted file; also the reimport provenance record. */
export declare const EXTRACTED_HEADER = "dsh-learning:source";
/** Page markers are `<!-- p.N -->` on their own line. */
export declare const PAGE_MARKER: RegExp;
/**
 * Render the extracted markdown for one parsed source.
 * @param source - The parse result.
 * @returns markdown text, ending with a newline.
 */
export declare function renderExtractedMarkdown(source: ParsedSource): string;
/** The extracted markdown and its structure, produced together. */
export interface EmittedSource {
    markdown: string;
    structure: SourceStructure;
}
/**
 * Emit both artifacts of one parse in a single pass.
 *
 * This is the ingest pipeline's entry point: rendering and structure derivation
 * share the line positions, so the two files written to a vault always agree.
 * @param source - The parse result.
 * @param extractedPath - Vault-relative path the markdown will be written to.
 */
export declare function emitSource(source: ParsedSource, extractedPath: string): EmittedSource;
/**
 * Derive the navigable structure from a parse.
 *
 * Section ids come from the heading chain, so they survive repagination; a
 * duplicate chain (two chapters genuinely titled the same) is disambiguated by
 * an ordinal suffix rather than silently collapsed, because two sections
 * sharing one id would make every anchor into either of them ambiguous.
 * @param source - The parse result.
 * @param extractedPath - Vault-relative path of the emitted markdown.
 * @returns the structure record written to `.learning/structure/`.
 */
export declare function deriveStructure(source: ParsedSource, extractedPath: string, rendered?: {
    headingLines: readonly number[];
    totalLines: number;
}): SourceStructure;
/**
 * Re-anchor one stored anchor against a rebuilt structure, the reimport path.
 *
 * Two resolutions, in order. The heading chain is what a person actually wrote
 * down, so it wins when the section kept its title. The quote hash — the
 * identity of the section's opening BODY text — is what recovers a section that
 * a new edition retitled, which is the case the heading chain cannot survive.
 *
 * Nothing matching is reported as `undefined` so the caller can mark the anchor
 * stale; silently keeping the old page number would assert a location that no
 * longer exists.
 * @param headingPath - The stored heading chain.
 * @param quoteHash - The opening-body identity recorded by the previous parse.
 * @param structure - The freshly derived structure.
 * @returns the matching section, or `undefined` when the anchor is now stale.
 */
export declare function reanchor(headingPath: readonly string[], quoteHash: string, structure: SourceStructure): SourceSection | undefined;
//# sourceMappingURL=markdown.d.ts.map