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
import { normalizeQuote } from "./ingest/types.js";
/** Separator between the heading levels of a rendered anchor. */
export const ANCHOR_PATH_SEPARATOR = ' › ';
/**
 * Render the anchor text for one section: `sourceId#a › b › c (p.N)`.
 *
 * Human-readable on purpose — this string ends up in a learner's own notes and
 * in `LearnerState.sourceAnchors`, where an opaque id would be useless.
 */
export function formatSectionAnchor(sourceId, section) {
    return formatAnchorTarget({
        sourceId,
        sectionId: section.id,
        label: section.label,
        headingPath: section.headingPath,
        ...(section.page === undefined ? {} : { page: section.page }),
    });
}
/**
 * Whether two string lists are equal — a heading chain against another, or one
 * anchor list against another.
 *
 * Compared element by element rather than through a joined key: a separator is
 * either a character the strings could contain (ambiguous) or a control
 * character embedded in source (fragile), and neither is worth it here.
 */
export function sameStringList(left, right) {
    return left.length === right.length && left.every((part, index) => part === right[index]);
}
/** Reduce a parsed structure to its resolvable targets. */
export function anchorTargetsOf(structure) {
    return structure.sections.map(section => ({
        sourceId: structure.sourceId,
        sectionId: section.id,
        label: section.label,
        headingPath: section.headingPath,
        ...(section.page === undefined ? {} : { page: section.page }),
    }));
}
/** Render the canonical anchor for a reduced target. */
export function formatAnchorTarget(target) {
    const path = target.headingPath.join(ANCHOR_PATH_SEPARATOR);
    const base = path === '' ? target.sourceId : `${target.sourceId}#${path}`;
    return target.page === undefined ? base : `${base} (p.${target.page})`;
}
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
export function resolveAnchorTarget(anchor, targets) {
    const normalized = normalizeQuote(anchor);
    if (normalized === '')
        return undefined;
    const parsed = parseAnchorText(normalized);
    const sourceId = parsed.sourceId?.toLowerCase();
    let best;
    let bestLength = 0;
    for (const target of targets) {
        if (sourceId !== undefined && normalizeQuote(target.sourceId).toLowerCase() !== sourceId)
            continue;
        if (parsed.page !== undefined && target.page !== parsed.page)
            continue;
        const candidates = [
            target.sectionId,
            normalizeQuote(target.headingPath.join(ANCHOR_PATH_SEPARATOR)),
            normalizeQuote(target.label),
        ].filter(value => value !== '' && normalized.includes(value));
        const length = Math.max(0, ...candidates.map(value => value.length));
        if (length > bestLength) {
            best = target;
            bestLength = length;
        }
    }
    return best;
}
/** The page an anchor names, when it names one. */
export function anchorPage(anchor) {
    const match = /\(\s*pp?\.\s*(\d+)\s*\)/iu.exec(anchor);
    return match === null ? undefined : Number.parseInt(match[1] ?? '', 10);
}
/**
 * Take an anchor apart. The inverse of {@link formatSectionAnchor}, and lenient:
 * an anchor a person typed by hand into their own notes still yields whatever
 * heading path it does carry.
 */
export function parseAnchorText(anchor) {
    const page = anchorPage(anchor);
    const withoutPage = anchor.replace(/\(\s*pp?\.\s*[\d\s–—-]+\)\s*$/iu, '').trim();
    const hash = withoutPage.indexOf('#');
    const sourceId = hash < 0 ? undefined : withoutPage.slice(0, hash).trim();
    const path = hash < 0 ? withoutPage : withoutPage.slice(hash + 1);
    const headingPath = path
        .split(ANCHOR_PATH_SEPARATOR)
        .map(part => part.trim())
        .filter(part => part !== '');
    return {
        ...(sourceId === undefined || sourceId === '' ? {} : { sourceId }),
        headingPath,
        ...(page === undefined ? {} : { page }),
    };
}
/**
 * Section references the assistant text may make. These are the shapes a reader
 * recognizes as a citation — a chapter, a numbered section, or a page — and
 * therefore the shapes a model invents when it has not read the source.
 */
const SECTION_MENTION = [
    /第\s*([〇一二三四五六七八九十百零\d]+)\s*[章节節]/gu,
    /\b(?:chapter|section)\s+(\d+(?:\.\d+)*)/giu,
    /\bpp?\.\s*(\d+)(?:\s*[-–—]\s*(\d+))?/giu,
    /\b第\s*(\d+)\s*[页頁]/gu,
];
/** Every section-like reference in one block of text, in order, deduplicated. */
export function sectionMentions(text) {
    const found = [];
    for (const pattern of SECTION_MENTION) {
        for (const match of text.matchAll(pattern)) {
            const mention = match[0].trim();
            if (!found.includes(mention))
                found.push(mention);
        }
    }
    return found;
}
/** Whether a section or page reference corresponds to something parsed. */
export function mentionSupported(mention, targets) {
    const normalized = normalizeQuote(mention).toLowerCase();
    const pageRange = /p{1,2}\.\s*(\d+)(?:\s*[-–—]\s*(\d+))?/iu.exec(normalized);
    const chinesePage = /第\s*(\d+)\s*[页頁]/u.exec(normalized);
    if (pageRange !== null || chinesePage !== null) {
        const start = Number.parseInt(pageRange?.[1] ?? chinesePage?.[1] ?? '', 10);
        const end = Number.parseInt(pageRange?.[2] ?? String(start), 10);
        return [start, end].every(page => targets.some(target => target.page === page));
    }
    return targets.some(target => {
        const label = normalizeQuote(target.label).toLowerCase();
        if (label === '')
            return false;
        if (label.includes(normalized) || normalized.includes(label))
            return true;
        return target.headingPath.some(part => normalizeQuote(part).toLowerCase().includes(normalized));
    });
}
//# sourceMappingURL=material-anchor.js.map