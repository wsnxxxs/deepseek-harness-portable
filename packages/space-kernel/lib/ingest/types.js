/**
 * The parsed-source vocabulary shared by every material parser. Types plus the
 * small pure helpers that derive stable identity (slug, quote hash) from block
 * text; no I/O and no parser-specific knowledge lives here.
 *
 * The central rule this file encodes: a source that could only be read in part
 * reports {@link ParseDegradation} as DATA, never as a log line. Downstream
 * teaching policy renders it, so "only part of this source is readable" becomes
 * something the model is told rather than something it must infer.
 * @module @dsh-portable/interactive-learning/src/ingest/types
 */
import { createHash } from 'node:crypto';
/** Structure-file protocol tag; bumped only on a breaking structure change. */
export const SOURCE_STRUCTURE_PROTOCOL = 'dsh-learning-structure@1';
/** Vault manifest protocol tag. */
export const VAULT_MANIFEST_PROTOCOL = 'dsh-learning-vault@1';
/** Library/Space manifest protocol tag. The legacy vault manifest stays readable. */
export const SPACE_MANIFEST_PROTOCOL = 'dsh-learning-space@2';
const SLUG_STRIP = /[^\p{Letter}\p{Number}]+/gu;
const MAX_SLUG_LENGTH = 64;
/**
 * Derive a filesystem- and anchor-safe slug. Letters and numbers of any script
 * survive (CJK headings must stay readable), everything else becomes a hyphen.
 * @param value - Raw label or filename.
 * @param fallback - Slug used when `value` carries no letters or numbers.
 * @returns the slug, never empty and never longer than 64 characters.
 */
export function slugify(value, fallback = 'source') {
    const slug = value
        .normalize('NFKC')
        .toLowerCase()
        .replace(SLUG_STRIP, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/g, '');
    return slug === '' ? fallback : slug;
}
const QUOTE_SAMPLE_LENGTH = 160;
const QUOTE_HASH_LENGTH = 16;
/** Collapse whitespace so a reflowed line still hashes to the same identity. */
export function normalizeQuote(text) {
    return text.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}
/**
 * Identity of a block's opening text, used to re-anchor a note after the source
 * is replaced by an edited edition.
 * @param text - The block's text.
 * @returns 16 lowercase hex characters.
 */
export function quoteHashOf(text) {
    const sample = normalizeQuote(text).slice(0, QUOTE_SAMPLE_LENGTH);
    return createHash('sha256').update(sample, 'utf8').digest('hex').slice(0, QUOTE_HASH_LENGTH);
}
/** SHA-256 of a source's original bytes; the skip-if-unchanged identity. */
export function contentHashOf(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}
/**
 * Section id derived from the heading chain, so an id survives page renumbering
 * and stays readable in a note's `anchors` list.
 * @param headingPath - Heading chain, outermost first.
 * @returns slug chain joined by `/`, or `''` for the document root.
 */
export function sectionIdOf(headingPath) {
    return headingPath.map(part => slugify(part, 'section')).join('/');
}
/** Human-readable anchor text, the form that reaches `sourceAnchors`. */
export function formatAnchor(anchor) {
    const path = anchor.headingPath.join(' › ');
    const location = path === '' ? anchor.sourceId : `${anchor.sourceId}#${path}`;
    return anchor.page === undefined ? location : `${location} (p.${anchor.page})`;
}
//# sourceMappingURL=types.js.map