/**
 * The pptx parser. A deck's own structure is already the structure a learner
 * navigates — one slide is one section — so this reads the slide order from the
 * presentation part rather than guessing it from file names, and keeps the
 * title placeholder as the section heading.
 *
 * Written here rather than delegated: every general-purpose office extractor
 * flattens a deck to running text, which destroys exactly the slide-as-section
 * boundary the teaching layer anchors to.
 * @module @dsh-portable/interactive-learning/src/ingest/pptx
 */
import { listZipEntries, readZipEntry, readZipText, ZipFormatError } from "./zip.js";
import { quoteHashOf, } from "./types.js";
const NUMERIC_ENTITY = /&#(x?)([0-9a-fA-F]+);/g;
const NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};
/** Decode the XML entities OOXML actually emits. */
function decodeXml(value) {
    return value
        .replace(NUMERIC_ENTITY, (_match, hex, digits) => String.fromCodePoint(Number.parseInt(digits, hex === '' ? 10 : 16)))
        .replace(/&(amp|lt|gt|quot|apos);/g, (_match, name) => NAMED_ENTITIES[name] ?? _match);
}
const SHAPE = /<p:sp\b[\s\S]*?<\/p:sp>/g;
const PARAGRAPH = /<a:p\b[\s\S]*?<\/a:p>|<a:p\b[^>]*\/>/g;
const TEXT_RUN = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g;
const TITLE_PLACEHOLDER = /<p:ph\b[^>]*\btype="(title|ctrTitle)"/;
const SLIDE_ID = /<p:sldId\b[^>]*\br:id="([^"]+)"/g;
const RELATIONSHIP = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g;
/** Text of one `<a:p>`, with runs joined and whitespace collapsed. */
function paragraphText(xml) {
    const runs = [];
    for (const match of xml.matchAll(TEXT_RUN))
        runs.push(decodeXml(match[1] ?? ''));
    return runs.join('').replace(/\s+/gu, ' ').trim();
}
/** Every non-empty paragraph of one shape, in order. */
function shapeParagraphs(xml) {
    const paragraphs = [];
    for (const match of xml.matchAll(PARAGRAPH)) {
        const text = paragraphText(match[0]);
        if (text !== '')
            paragraphs.push(text);
    }
    return paragraphs;
}
/**
 * Resolve slide parts in presentation order, falling back to a numeric filename
 * sort when the presentation part cannot be read.
 * @param bytes - The pptx archive.
 * @returns archive-relative slide part paths, in reading order.
 */
function slideOrder(bytes) {
    const available = new Set(listZipEntries(bytes)
        .map(entry => entry.name)
        .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)));
    const presentation = readZipText(bytes, 'ppt/presentation.xml');
    const rels = readZipText(bytes, 'ppt/_rels/presentation.xml.rels');
    if (presentation !== undefined && rels !== undefined) {
        const targets = new Map();
        for (const match of rels.matchAll(RELATIONSHIP)) {
            targets.set(match[1] ?? '', (match[2] ?? '').replace(/^\.\.\//, '').replace(/^\//, ''));
        }
        const ordered = [];
        for (const match of presentation.matchAll(SLIDE_ID)) {
            const target = targets.get(match[1] ?? '');
            const name = target === undefined ? undefined : `ppt/${target}`;
            if (name !== undefined && available.has(name))
                ordered.push(name);
        }
        // Trust the declared order only when it accounts for every slide present.
        if (ordered.length === available.size)
            return ordered;
    }
    return [...available].sort((left, right) => Number.parseInt(/(\d+)/.exec(left)?.[1] ?? '0', 10)
        - Number.parseInt(/(\d+)/.exec(right)?.[1] ?? '0', 10));
}
/** Speaker notes for slide `n`, when the deck carries them. */
function notesFor(bytes, parts, slidePath) {
    const number = /(\d+)/.exec(slidePath)?.[1];
    if (number === undefined)
        return '';
    const entry = parts.get(`ppt/notesSlides/notesSlide${number}.xml`);
    if (entry === undefined)
        return '';
    try {
        return shapeParagraphs(readZipEntry(bytes, entry).toString('utf8')).join('\n');
    }
    catch {
        // Notes are supplementary; a corrupt notes part must never fail its slide.
        return '';
    }
}
/**
 * Parse a pptx deck into blocks: one slide is one level-2 section, the title
 * placeholder is its heading, remaining shapes are its body, speaker notes are
 * a caption.
 * @param bytes - The pptx archive.
 * @param options - Source identity and display title.
 * @returns the parsed source, with a degradation entry for every text-free slide.
 */
export function parsePptxSource(bytes, options) {
    const { sourceId, title } = options;
    const degradation = [];
    const blocks = [];
    let slides = [];
    let parts = new Map();
    try {
        parts = new Map(listZipEntries(bytes).map(entry => [entry.name, entry]));
        slides = slideOrder(bytes);
    }
    catch (cause) {
        if (!(cause instanceof ZipFormatError))
            throw cause;
        return {
            sourceId,
            title,
            parser: 'pptx@1',
            blocks: [],
            degradation: [{ kind: 'unsupported-format', extension: 'pptx' }],
        };
    }
    const headingPath = [title];
    blocks.push({
        kind: 'heading',
        level: 1,
        text: title,
        anchor: { sourceId, headingPath: [title], quoteHash: quoteHashOf(title) },
    });
    const imageOnly = [];
    for (const [index, slidePath] of slides.entries()) {
        const page = index + 1;
        const part = parts.get(slidePath);
        if (part === undefined)
            continue;
        let xml;
        try {
            xml = readZipEntry(bytes, part).toString('utf8');
        }
        catch (cause) {
            if (!(cause instanceof ZipFormatError))
                throw cause;
            degradation.push({
                kind: 'truncated',
                afterPage: page - 1,
                reason: cause.message,
            });
            break;
        }
        const shapes = [...xml.matchAll(SHAPE)].map(match => match[0]);
        const titleShape = shapes.find(shape => TITLE_PLACEHOLDER.test(shape));
        const heading = titleShape === undefined ? '' : shapeParagraphs(titleShape).join(' ');
        const label = heading === '' ? `Slide ${page}` : heading;
        const chain = [...headingPath, label];
        blocks.push({
            kind: 'heading',
            level: 2,
            text: label,
            anchor: { sourceId, headingPath: chain, page, quoteHash: quoteHashOf(label) },
        });
        const body = [];
        for (const shape of shapes) {
            if (shape === titleShape)
                continue;
            body.push(...shapeParagraphs(shape));
        }
        if (body.length === 0 && heading === '') {
            // A slide whose only content is a picture is a real coverage hole, not an
            // empty slide: say so rather than letting the map imply it was read.
            imageOnly.push(page);
        }
        for (const paragraph of body) {
            blocks.push({
                kind: body.length > 1 ? 'list' : 'paragraph',
                text: paragraph,
                anchor: { sourceId, headingPath: chain, page, quoteHash: quoteHashOf(paragraph) },
            });
        }
        const notes = notesFor(bytes, parts, slidePath);
        if (notes !== '') {
            blocks.push({
                kind: 'caption',
                text: notes,
                anchor: { sourceId, headingPath: chain, page, quoteHash: quoteHashOf(notes) },
            });
        }
    }
    if (imageOnly.length > 0)
        degradation.push({ kind: 'image-only-pages', pages: imageOnly });
    if (slides.length === 0) {
        degradation.push({ kind: 'empty-source', reason: 'the deck declares no slides' });
    }
    return { sourceId, title, parser: 'pptx@1', blocks, degradation };
}
//# sourceMappingURL=pptx.js.map