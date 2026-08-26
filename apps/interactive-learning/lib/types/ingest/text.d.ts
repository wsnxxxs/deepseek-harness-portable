/**
 * The text-family parsers: markdown, plain text, and source code. These need no
 * dependency and are the reference implementation of the block contract — the
 * binary parsers (pdf/docx/pptx) normalize into the same shape.
 * @module @dsh-portable/interactive-learning/src/ingest/text
 */
import { type ParsedBlock, type ParsedSource } from './types.ts';
/** Extensions the markdown parser owns. */
export declare const MARKDOWN_EXTENSIONS: readonly string[];
/** Extensions the plain-text parser owns. */
export declare const PLAIN_TEXT_EXTENSIONS: readonly string[];
/** Extensions read as source code: each top-level symbol becomes a section. */
export declare const CODE_EXTENSIONS: readonly string[];
/**
 * Parse markdown into blocks, preserving the heading chain, fenced code, tables,
 * and lists. Front matter is skipped: a vault note's own frontmatter is metadata
 * about the note, never teaching content.
 * @param text - The markdown document.
 * @param sourceId - Stable source id for anchors.
 * @param title - Document title used when the file opens without a heading.
 * @returns blocks in document order.
 */
export declare function parseMarkdownBlocks(text: string, sourceId: string, title: string): readonly ParsedBlock[];
/**
 * Parse plain text, recovering chapter-style headings by convention.
 * @param text - The document.
 * @param sourceId - Stable source id for anchors.
 * @param title - Title used to open the document.
 * @returns blocks in document order.
 */
export declare function parsePlainTextBlocks(text: string, sourceId: string, title: string): readonly ParsedBlock[];
/**
 * Parse source code so each top-level symbol becomes its own section. The body
 * stays verbatim inside code blocks: a learner reading code needs the code, not
 * a paraphrase of it.
 * @param text - The file's content.
 * @param sourceId - Stable source id for anchors.
 * @param title - File name used to open the document.
 * @param lang - Fence language recorded on every code block.
 * @returns blocks in document order.
 */
export declare function parseCodeBlocks(text: string, sourceId: string, title: string, lang: string): readonly ParsedBlock[];
/**
 * Parse one text-family source into the shared block contract.
 * @param text - Decoded file content.
 * @param options - Source identity plus the lowercase extension without a dot.
 * @returns the parsed source, including any degradation observed.
 */
export declare function parseTextSource(text: string, options: {
    sourceId: string;
    title: string;
    extension: string;
}): ParsedSource;
//# sourceMappingURL=text.d.ts.map