/**
 * The docx parser, reading `word/document.xml` through the shared zip reader.
 *
 * No conversion dependency: a docx heading is a paragraph carrying a `Heading n`
 * style or an outline level, and that is exactly the signal the structure layer
 * needs. Routing through an HTML converter would add a dependency to a portable
 * build only to re-derive the same levels from generated markup.
 *
 * docx has no pages — pagination is a rendering decision made by the word
 * processor, not a property of the file — so blocks from this parser carry a
 * heading path and no page number, and the map must not imply otherwise.
 * @module @dsh-portable/interactive-learning/src/ingest/docx
 */
import { type ParsedSource } from './types.ts';
/**
 * Parse a docx into blocks, using declared heading styles and outline levels for
 * the section chain.
 * @param bytes - The docx archive.
 * @param options - Source identity and display title.
 * @returns the parsed source, with degradation reported rather than thrown.
 */
export declare function parseDocxSource(bytes: Uint8Array, options: {
    sourceId: string;
    title: string;
}): ParsedSource;
//# sourceMappingURL=docx.d.ts.map