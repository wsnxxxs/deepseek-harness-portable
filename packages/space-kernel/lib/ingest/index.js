/**
 * Parser dispatch: bytes plus a file name become one {@link ParsedSource}.
 *
 * Every parser resolves its own unreadable cases into {@link ParseDegradation}
 * rather than throwing, so an unsupported or damaged source degrades to "this
 * part could not be read" instead of failing the ingest and leaving the learner
 * with nothing.
 * @module @dsh-portable/interactive-learning/src/ingest
 */
import { parseDocxSource } from "./docx.js";
import { parsePdfSource } from "./pdf.js";
import { parsePptxSource } from "./pptx.js";
import { CODE_EXTENSIONS, MARKDOWN_EXTENSIONS, PLAIN_TEXT_EXTENSIONS, parseTextSource, } from "./text.js";
import { slugify } from "./types.js";
export * from "./types.js";
export { renderExtractedMarkdown, emitSource, deriveStructure, reanchor, PAGE_MARKER, } from "./markdown.js";
export { parseTextSource, MARKDOWN_EXTENSIONS, PLAIN_TEXT_EXTENSIONS, CODE_EXTENSIONS } from "./text.js";
/** Every extension the ingest pipeline can read today. */
export const SUPPORTED_EXTENSIONS = [
    ...MARKDOWN_EXTENSIONS,
    ...PLAIN_TEXT_EXTENSIONS,
    ...CODE_EXTENSIONS,
    'pdf',
    'docx',
    'pptx',
];
/** The lowercase extension of a file name, without the dot. */
export function extensionOf(fileName) {
    const dot = fileName.lastIndexOf('.');
    return dot < 0 ? '' : fileName.slice(dot + 1).toLowerCase();
}
/** Display title for a source: its file name without the extension. */
export function titleOf(fileName) {
    const base = fileName.replace(/^.*[\\/]/u, '');
    const dot = base.lastIndexOf('.');
    const stem = dot <= 0 ? base : base.slice(0, dot);
    return stem.replace(/[_-]+/gu, ' ').trim() || base;
}
const BOM_UTF8 = [0xef, 0xbb, 0xbf];
/**
 * Decode a text file, honoring the byte-order marks a Windows editor writes.
 * @param bytes - The file's bytes.
 * @returns the decoded text, without its BOM.
 */
export function decodeText(bytes) {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(bytes.subarray(2));
    }
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    }
    const start = BOM_UTF8.every((byte, index) => bytes[index] === byte) ? 3 : 0;
    return new TextDecoder('utf-8').decode(bytes.subarray(start));
}
/**
 * Parse one source file into blocks.
 * @param bytes - The file's bytes.
 * @param fileName - Original file name; its extension selects the parser.
 * @param sourceId - Stable id for this source within its vault; derived from the
 * file name when omitted.
 * @returns the parsed source.
 */
export async function parseSource(bytes, fileName, sourceId = slugify(titleOf(fileName))) {
    const extension = extensionOf(fileName);
    const title = titleOf(fileName);
    if (extension === 'pdf')
        return await parsePdfSource(bytes, { sourceId, title });
    if (extension === 'docx')
        return parseDocxSource(bytes, { sourceId, title });
    if (extension === 'pptx')
        return parsePptxSource(bytes, { sourceId, title });
    if (MARKDOWN_EXTENSIONS.includes(extension)
        || PLAIN_TEXT_EXTENSIONS.includes(extension)
        || CODE_EXTENSIONS.includes(extension)) {
        return parseTextSource(decodeText(bytes), { sourceId, title, extension });
    }
    return {
        sourceId,
        title,
        parser: 'none@1',
        blocks: [],
        degradation: [{ kind: 'unsupported-format', extension: extension === '' ? '(none)' : extension }],
    };
}
//# sourceMappingURL=index.js.map