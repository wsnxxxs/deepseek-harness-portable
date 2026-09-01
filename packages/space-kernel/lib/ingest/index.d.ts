/**
 * Parser dispatch: bytes plus a file name become one {@link ParsedSource}.
 *
 * Every parser resolves its own unreadable cases into {@link ParseDegradation}
 * rather than throwing, so an unsupported or damaged source degrades to "this
 * part could not be read" instead of failing the ingest and leaving the learner
 * with nothing.
 * @module @dsh-portable/interactive-learning/src/ingest
 */
import { type ParsedSource } from './types.ts';
export * from './types.ts';
export { renderExtractedMarkdown, emitSource, deriveStructure, reanchor, PAGE_MARKER, type EmittedSource, } from './markdown.ts';
export { parseTextSource, MARKDOWN_EXTENSIONS, PLAIN_TEXT_EXTENSIONS, CODE_EXTENSIONS } from './text.ts';
/** Every extension the ingest pipeline can read today. */
export declare const SUPPORTED_EXTENSIONS: readonly string[];
/** The lowercase extension of a file name, without the dot. */
export declare function extensionOf(fileName: string): string;
/** Display title for a source: its file name without the extension. */
export declare function titleOf(fileName: string): string;
/**
 * Decode a text file, honoring the byte-order marks a Windows editor writes.
 * @param bytes - The file's bytes.
 * @returns the decoded text, without its BOM.
 */
export declare function decodeText(bytes: Uint8Array): string;
/**
 * Parse one source file into blocks.
 * @param bytes - The file's bytes.
 * @param fileName - Original file name; its extension selects the parser.
 * @param sourceId - Stable id for this source within its vault; derived from the
 * file name when omitted.
 * @returns the parsed source.
 */
export declare function parseSource(bytes: Uint8Array, fileName: string, sourceId?: string): Promise<ParsedSource>;
//# sourceMappingURL=index.d.ts.map