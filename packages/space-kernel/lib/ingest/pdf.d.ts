/**
 * The pdf parser. Text is recovered through `unpdf`'s pdf.js document proxy
 * rather than a flat text dump, because the per-item font size is what lets a
 * chapter heading be told apart from a paragraph — and a source whose sections
 * are guessed wrong produces anchors that point at the wrong place.
 *
 * The dependency is imported lazily and its absence is reported as a
 * {@link ParseDegradation} rather than thrown: a portable build that shipped
 * without it must still ingest text and markdown.
 * @module @dsh-portable/interactive-learning/src/ingest/pdf
 */
import { type ParsedSource } from './types.ts';
/**
 * Parse a pdf into blocks, recovering sections from font size and from the
 * document's own chapter numbering. When a page has no reliable heading, it
 * remains navigable as a page section instead of disappearing into its neighbour.
 * @param bytes - The pdf file.
 * @param options - Source identity and display title.
 * @returns the parsed source; an unreadable or dependency-less build yields no
 * blocks and one explanatory degradation entry.
 */
export declare function parsePdfSource(bytes: Uint8Array, options: {
    sourceId: string;
    title: string;
}): Promise<ParsedSource>;
//# sourceMappingURL=pdf.d.ts.map