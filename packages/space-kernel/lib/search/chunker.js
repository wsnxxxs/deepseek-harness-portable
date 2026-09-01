/** Chunk the parsed section bodies into bounded, citeable retrieval units. */
import { formatSectionAnchor } from "../material-anchor.js";
export const DEFAULT_CHUNK_TARGET_CHARS = 1_000;
export const DEFAULT_CHUNK_OVERLAP = 0.15;
function sectionBody(lines, section) {
    return lines
        .slice(section.line, Math.max(section.line, section.endLine - 1))
        .join('\n')
        .replace(/^<!--\s*p\.\d+\s*-->$/gmu, '')
        .trim();
}
function isBoundary(text, index) {
    const previous = text[index - 1];
    const beforePrevious = text[index - 2];
    return previous === '\n' || previous === '。' || previous === '！' || previous === '？'
        || previous === '.' || previous === '!' || previous === '?' || previous === ';' || previous === '；'
        || previous === ':' || previous === '：' || previous === '、'
        || (previous === ' ' && beforePrevious !== undefined);
}
/** Pick a human-readable cut near the requested size, with a hard upper bound. */
function cutAt(text, start, target, max) {
    const desired = Math.min(start + target, text.length);
    if (desired >= text.length)
        return text.length;
    const minimum = Math.min(start + Math.max(120, Math.floor(target * 0.55)), desired);
    for (let index = desired; index >= minimum; index -= 1) {
        if (isBoundary(text, index))
            return index;
    }
    return Math.min(start + max, text.length);
}
function chunksForSection(structure, section, lines, ordStart, target, overlap) {
    const body = sectionBody(lines, section);
    const text = body === '' ? section.label : `${section.label}\n${body}`;
    const overlapChars = Math.max(0, Math.min(target - 1, Math.round(target * overlap)));
    const chunks = [];
    let start = 0;
    let ord = ordStart;
    while (start < text.length) {
        const end = cutAt(text, start, target, Math.max(target, Math.ceil(target * 1.2)));
        const chunkText = text.slice(start, end).trim();
        if (chunkText !== '') {
            chunks.push({
                chunkId: `${structure.sourceId}:${section.id}:ch${String(ord).padStart(4, '0')}`,
                sourceId: structure.sourceId,
                sectionId: section.id,
                ord,
                anchor: formatSectionAnchor(structure.sourceId, section),
                quoteHash: section.quoteHash,
                ...(section.page === undefined ? {} : { page: section.page }),
                text: chunkText,
            });
            ord += 1;
        }
        if (end >= text.length)
            break;
        const next = Math.max(start + 1, end - overlapChars);
        start = next >= end ? end : next;
    }
    return chunks;
}
/**
 * Build chunks without crossing section boundaries. The input is the extracted
 * markdown split into physical lines, so anchors continue to resolve against
 * the existing structure file.
 */
export function chunkSource(structure, lines, options = {}) {
    const target = Math.max(1, Math.floor(options.targetChars ?? DEFAULT_CHUNK_TARGET_CHARS));
    const overlap = Math.max(0, Math.min(0.5, options.overlap ?? DEFAULT_CHUNK_OVERLAP));
    const chunks = [];
    let ord = 0;
    for (const section of structure.sections) {
        const sectionChunks = chunksForSection(structure, section, lines, ord, target, overlap);
        chunks.push(...sectionChunks);
        ord += sectionChunks.length;
    }
    return chunks;
}
//# sourceMappingURL=chunker.js.map