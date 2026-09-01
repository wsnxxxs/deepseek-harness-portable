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
var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
import { quoteHashOf, } from "./types.js";
/**
 * The specifier is held in a variable so neither the type checker nor the
 * bundler resolves it at build time: `unpdf` is an optional dependency, and a
 * build without it must still compile and still ingest text and markdown.
 */
const UNPDF_SPECIFIER = 'unpdf';
let unpdfModule;
/** Load `unpdf` once, or report that this build cannot read pdf. */
async function loadUnpdf() {
    unpdfModule ??= import(__rewriteRelativeImportExtension(UNPDF_SPECIFIER))
        .then(module => module)
        .catch(() => undefined);
    return await unpdfModule;
}
const MATH_FONT = /CMMI|CMSY|CMEX|MSAM|MSBM|STIXMath|Math|Symbol/i;
/** Bump when the extracted structure changes so existing sources rebuild. */
const PDF_PARSER = 'pdf@2';
/** Below this, a page carries no recoverable prose and is almost certainly an image. */
const MIN_PAGE_CHARS = 24;
/** A heading's font must exceed body text by this factor. */
const HEADING_SIZE_RATIO = 1.15;
const MAX_HEADING_CHARS = 90;
const Y_TOLERANCE = 2.5;
/** Group text items into visual lines by their baseline. */
function linesOf(items) {
    const rows = [];
    for (const item of items) {
        const text = item.str ?? '';
        if (text.trim() === '')
            continue;
        const transform = item.transform ?? [];
        const y = Number(transform[5] ?? 0);
        const x = Number(transform[4] ?? 0);
        const size = Number(item.height ?? transform[3] ?? 0) || 0;
        const row = rows.find(candidate => Math.abs(candidate.y - y) <= Y_TOLERANCE);
        if (row === undefined) {
            rows.push({ y, x, size, parts: [text] });
            continue;
        }
        row.parts.push(text);
        row.size = Math.max(row.size, size);
        row.x = Math.min(row.x, x);
    }
    return rows
        .sort((left, right) => right.y - left.y)
        .map(row => ({ text: row.parts.join('').replace(/\s+/gu, ' ').trim(), size: row.size, x: row.x }))
        .filter(line => line.text !== '');
}
/** The document's dominant body font size, weighted by how much text uses it. */
function bodySize(lines) {
    const weight = new Map();
    for (const line of lines) {
        const bucket = Math.round(line.size * 2) / 2;
        weight.set(bucket, (weight.get(bucket) ?? 0) + line.text.length);
    }
    let best = 0;
    let bestWeight = -1;
    for (const [size, total] of weight) {
        if (total > bestWeight) {
            best = size;
            bestWeight = total;
        }
    }
    return best;
}
const NUMBERED_HEADING = [
    /^第\s*[〇一二三四五六七八九十百零\d]+\s*[章节節篇讲講课課]/,
    /^(?:chapter|section|part|lesson|unit|appendix)\s+[\divxlcIVXLC]+\b/i,
    /^\d{1,2}(?:\.\d{1,2}){0,3}\s+\S/,
];
/** Depth implied by a dotted section number, so `3.2` nests under `3`. */
function numberedDepth(text) {
    const dotted = /^(\d{1,2}(?:\.\d{1,2}){0,3})\s+\S/.exec(text);
    if (dotted === null)
        return undefined;
    return Math.min((dotted[1] ?? '').split('.').length + 1, 6);
}
/** Reject symbol-heavy formula fragments when using font size as a heading hint. */
function isUsableHeadingText(text) {
    const normalized = text.trim();
    if (normalized.length < 2)
        return false;
    if (/^(?:undefined|null)$/iu.test(normalized))
        return false;
    if (/^(?:https?:\/\/|www\.|by\s*:|[•▪*\-]|\[\d+\])/iu.test(normalized))
        return false;
    if (/(?:cricos|copyright|own work|derivative work|curid=)/iu.test(normalized))
        return false;
    const readable = normalized.match(/[\p{Letter}\p{Number}\s]/gu)?.length ?? 0;
    return readable >= 2 && readable / normalized.length >= 0.6;
}
/**
 * Whether two well-separated horizontal bands hold the page's lines, which
 * means the reading order recovered here is probably wrong.
 */
function looksMultiColumn(lines, width) {
    if (lines.length < 12 || width <= 0)
        return false;
    const left = lines.filter(line => line.x < width * 0.45).length;
    const right = lines.filter(line => line.x > width * 0.55).length;
    const middle = lines.filter(line => line.x >= width * 0.45 && line.x <= width * 0.55).length;
    return left >= 4 && right >= 4 && middle <= Math.max(1, Math.floor(lines.length * 0.1));
}
/**
 * Parse a pdf into blocks, recovering sections from font size and from the
 * document's own chapter numbering. When a page has no reliable heading, it
 * remains navigable as a page section instead of disappearing into its neighbour.
 * @param bytes - The pdf file.
 * @param options - Source identity and display title.
 * @returns the parsed source; an unreadable or dependency-less build yields no
 * blocks and one explanatory degradation entry.
 */
export async function parsePdfSource(bytes, options) {
    const { sourceId, title } = options;
    const unpdf = await loadUnpdf();
    if (unpdf === undefined) {
        return {
            sourceId,
            title,
            parser: PDF_PARSER,
            blocks: [],
            degradation: [{ kind: 'parser-unavailable', extension: 'pdf', module: 'unpdf' }],
        };
    }
    let document;
    try {
        // `unpdf` rejects a Node Buffer by name, and `readFile` returns one — so the
        // bytes are copied into a plain Uint8Array over their own ArrayBuffer.
        const plain = bytes instanceof Uint8Array && bytes.constructor === Uint8Array
            ? bytes
            : Uint8Array.from(bytes);
        document = await unpdf.getDocumentProxy(plain);
    }
    catch {
        return {
            sourceId,
            title,
            parser: PDF_PARSER,
            blocks: [],
            degradation: [{ kind: 'unsupported-format', extension: 'pdf' }],
        };
    }
    const pages = [];
    const imageOnly = [];
    const multiColumn = [];
    let truncated;
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        try {
            const page = await document.getPage(pageNumber);
            const content = await page.getTextContent();
            const lines = linesOf(content.items);
            const width = page.getViewport({ scale: 1 }).width;
            const mathRuns = content.items.filter(item => MATH_FONT.test(item.fontName ?? '')).length;
            pages.push({ lines, width, mathRuns });
            const chars = lines.reduce((total, line) => total + line.text.length, 0);
            if (chars < MIN_PAGE_CHARS)
                imageOnly.push(pageNumber);
            if (looksMultiColumn(lines, width))
                multiColumn.push(pageNumber);
        }
        catch (cause) {
            // Stop at the first unreadable page rather than silently skipping pages:
            // a gap in the middle would make every later anchor claim a coverage the
            // extraction does not have.
            truncated = {
                kind: 'truncated',
                afterPage: pageNumber - 1,
                reason: cause instanceof Error ? cause.message : 'the page could not be read',
            };
            break;
        }
    }
    const allLines = pages.flatMap(page => page.lines);
    const body = bodySize(allLines);
    const headingSizes = [...new Set(allLines
            .filter(line => line.size > body * HEADING_SIZE_RATIO && line.text.length <= MAX_HEADING_CHARS)
            .map(line => Math.round(line.size * 2) / 2))].sort((left, right) => right - left).slice(0, 4);
    // Repeated short lines are normally a deck's header, footer, or attribution,
    // not a new concept. Do not let a large footer become 40 fake sections.
    const lineFrequency = new Map();
    for (const line of allLines) {
        const normalized = line.text.replace(/\s+/gu, ' ').trim();
        lineFrequency.set(normalized, (lineFrequency.get(normalized) ?? 0) + 1);
    }
    const repeatedLines = new Set([...lineFrequency.entries()]
        .filter(([, count]) => count >= 3)
        .map(([text]) => text));
    const isRepeatedLine = (line) => repeatedLines.has(line.text.replace(/\s+/gu, ' ').trim());
    const headingLevelOf = (line) => {
        if (isRepeatedLine(line) || !isUsableHeadingText(line.text))
            return undefined;
        const bySize = headingSizes.indexOf(Math.round(line.size * 2) / 2);
        const numbered = NUMBERED_HEADING.some(pattern => pattern.test(line.text))
            && line.text.length <= MAX_HEADING_CHARS;
        if (numbered)
            return numberedDepth(line.text) ?? 2;
        if (bySize < 0)
            return undefined;
        return Math.min(bySize + 2, 6);
    };
    const pageLabelOf = (pageNumber, lines) => {
        const candidate = lines.find(line => !isRepeatedLine(line)
            && isUsableHeadingText(line.text)
            && line.text.length <= MAX_HEADING_CHARS
            && line.size > body * HEADING_SIZE_RATIO);
        return candidate?.text ?? `第 ${pageNumber} 页`;
    };
    const blocks = [];
    const headingPath = [title];
    blocks.push({
        kind: 'heading',
        level: 1,
        text: title,
        anchor: { sourceId, headingPath: [title], page: 1, quoteHash: quoteHashOf(title) },
    });
    let paragraph = [];
    const flush = (page) => {
        if (paragraph.length === 0)
            return;
        const text = paragraph.join(' ').replace(/\s+/gu, ' ').trim();
        paragraph = [];
        if (text === '')
            return;
        blocks.push({
            kind: 'paragraph',
            text,
            anchor: { sourceId, headingPath: [...headingPath], page, quoteHash: quoteHashOf(text) },
        });
    };
    for (const [index, page] of pages.entries()) {
        const pageNumber = index + 1;
        const pageHasHeading = page.lines.some(line => headingLevelOf(line) !== undefined);
        const syntheticLabel = pageNumber > 1 && !pageHasHeading ? pageLabelOf(pageNumber, page.lines) : undefined;
        const syntheticIndex = syntheticLabel === undefined
            ? -1
            : page.lines.findIndex(line => line.text === syntheticLabel);
        if (syntheticLabel !== undefined) {
            flush(pageNumber);
            headingPath.splice(1);
            headingPath.push(syntheticLabel);
            blocks.push({
                kind: 'heading',
                level: 2,
                text: syntheticLabel,
                anchor: {
                    sourceId,
                    headingPath: [...headingPath],
                    page: pageNumber,
                    quoteHash: quoteHashOf(syntheticLabel),
                },
            });
        }
        for (const [lineIndex, line] of page.lines.entries()) {
            if (lineIndex === syntheticIndex)
                continue;
            const level = headingLevelOf(line);
            if (level === undefined) {
                paragraph.push(line.text);
                continue;
            }
            flush(pageNumber);
            headingPath.splice(level - 1);
            while (headingPath.length < level - 1)
                headingPath.push('');
            headingPath.push(line.text);
            blocks.push({
                kind: 'heading',
                level,
                text: line.text,
                anchor: {
                    sourceId,
                    headingPath: [...headingPath],
                    page: pageNumber,
                    quoteHash: quoteHashOf(line.text),
                },
            });
        }
        flush(pageNumber);
    }
    const degradation = [];
    if (imageOnly.length > 0)
        degradation.push({ kind: 'image-only-pages', pages: imageOnly });
    if (multiColumn.length > 0)
        degradation.push({ kind: 'multi-column-guess', pages: multiColumn });
    const mathRuns = pages.reduce((total, page) => total + page.mathRuns, 0);
    if (mathRuns > 0)
        degradation.push({ kind: 'formula-dropped', count: mathRuns });
    if (truncated !== undefined)
        degradation.push(truncated);
    if (allLines.length === 0 && truncated === undefined) {
        degradation.push({ kind: 'empty-source', reason: 'the pdf carries no extractable text layer' });
    }
    return { sourceId, title, parser: PDF_PARSER, blocks, degradation };
}
//# sourceMappingURL=pdf.js.map