import { createHash } from "node:crypto";
//#region lib/types/ingest/types.js
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
/** Structure-file protocol tag; bumped only on a breaking structure change. */
const SOURCE_STRUCTURE_PROTOCOL = "dsh-learning-structure@1";
/** Vault manifest protocol tag. */
const VAULT_MANIFEST_PROTOCOL = "dsh-learning-vault@1";
/** Library/Space manifest protocol tag. The legacy vault manifest stays readable. */
const SPACE_MANIFEST_PROTOCOL = "dsh-learning-space@2";
const SLUG_STRIP = /[^\p{Letter}\p{Number}]+/gu;
const MAX_SLUG_LENGTH = 64;
/**
* Derive a filesystem- and anchor-safe slug. Letters and numbers of any script
* survive (CJK headings must stay readable), everything else becomes a hyphen.
* @param value - Raw label or filename.
* @param fallback - Slug used when `value` carries no letters or numbers.
* @returns the slug, never empty and never longer than 64 characters.
*/
function slugify(value, fallback = "source") {
	const slug = value.normalize("NFKC").toLowerCase().replace(SLUG_STRIP, "-").replace(/^-+|-+$/g, "").slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
	return slug === "" ? fallback : slug;
}
const QUOTE_SAMPLE_LENGTH = 160;
const QUOTE_HASH_LENGTH = 16;
/** Collapse whitespace so a reflowed line still hashes to the same identity. */
function normalizeQuote(text) {
	return text.normalize("NFKC").replace(/\s+/gu, " ").trim();
}
/**
* Identity of a block's opening text, used to re-anchor a note after the source
* is replaced by an edited edition.
* @param text - The block's text.
* @returns 16 lowercase hex characters.
*/
function quoteHashOf(text) {
	const sample = normalizeQuote(text).slice(0, QUOTE_SAMPLE_LENGTH);
	return createHash("sha256").update(sample, "utf8").digest("hex").slice(0, QUOTE_HASH_LENGTH);
}
/** SHA-256 of a source's original bytes; the skip-if-unchanged identity. */
function contentHashOf(bytes) {
	return createHash("sha256").update(bytes).digest("hex");
}
/**
* Section id derived from the heading chain, so an id survives page renumbering
* and stays readable in a note's `anchors` list.
* @param headingPath - Heading chain, outermost first.
* @returns slug chain joined by `/`, or `''` for the document root.
*/
function sectionIdOf(headingPath) {
	return headingPath.map((part) => slugify(part, "section")).join("/");
}
//#endregion
//#region lib/types/material-anchor.js
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
/** Separator between the heading levels of a rendered anchor. */
const ANCHOR_PATH_SEPARATOR = " › ";
/**
* Render the anchor text for one section: `sourceId#a › b › c (p.N)`.
*
* Human-readable on purpose — this string ends up in a learner's own notes and
* in `LearnerState.sourceAnchors`, where an opaque id would be useless.
*/
function formatSectionAnchor(sourceId, section) {
	return formatAnchorTarget({
		sourceId,
		sectionId: section.id,
		label: section.label,
		headingPath: section.headingPath,
		...section.page === void 0 ? {} : { page: section.page }
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
function sameStringList(left, right) {
	return left.length === right.length && left.every((part, index) => part === right[index]);
}
/** Reduce a parsed structure to its resolvable targets. */
function anchorTargetsOf(structure) {
	return structure.sections.map((section) => ({
		sourceId: structure.sourceId,
		sectionId: section.id,
		label: section.label,
		headingPath: section.headingPath,
		...section.page === void 0 ? {} : { page: section.page }
	}));
}
/** Render the canonical anchor for a reduced target. */
function formatAnchorTarget(target) {
	const path = target.headingPath.join(ANCHOR_PATH_SEPARATOR);
	const base = path === "" ? target.sourceId : `${target.sourceId}#${path}`;
	return target.page === void 0 ? base : `${base} (p.${target.page})`;
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
function resolveAnchorTarget(anchor, targets) {
	const normalized = normalizeQuote(anchor);
	if (normalized === "") return void 0;
	const parsed = parseAnchorText(normalized);
	const sourceId = parsed.sourceId?.toLowerCase();
	let best;
	let bestLength = 0;
	for (const target of targets) {
		if (sourceId !== void 0 && normalizeQuote(target.sourceId).toLowerCase() !== sourceId) continue;
		if (parsed.page !== void 0 && target.page !== parsed.page) continue;
		const candidates = [
			target.sectionId,
			normalizeQuote(target.headingPath.join(ANCHOR_PATH_SEPARATOR)),
			normalizeQuote(target.label)
		].filter((value) => value !== "" && normalized.includes(value));
		const length = Math.max(0, ...candidates.map((value) => value.length));
		if (length > bestLength) {
			best = target;
			bestLength = length;
		}
	}
	return best;
}
/** The page an anchor names, when it names one. */
function anchorPage(anchor) {
	const match = /\(\s*pp?\.\s*(\d+)\s*\)/iu.exec(anchor);
	return match === null ? void 0 : Number.parseInt(match[1] ?? "", 10);
}
/**
* Take an anchor apart. The inverse of {@link formatSectionAnchor}, and lenient:
* an anchor a person typed by hand into their own notes still yields whatever
* heading path it does carry.
*/
function parseAnchorText(anchor) {
	const page = anchorPage(anchor);
	const withoutPage = anchor.replace(/\(\s*pp?\.\s*[\d\s–—-]+\)\s*$/iu, "").trim();
	const hash = withoutPage.indexOf("#");
	const sourceId = hash < 0 ? void 0 : withoutPage.slice(0, hash).trim();
	const headingPath = (hash < 0 ? withoutPage : withoutPage.slice(hash + 1)).split(ANCHOR_PATH_SEPARATOR).map((part) => part.trim()).filter((part) => part !== "");
	return {
		...sourceId === void 0 || sourceId === "" ? {} : { sourceId },
		headingPath,
		...page === void 0 ? {} : { page }
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
	/\b第\s*(\d+)\s*[页頁]/gu
];
/** Every section-like reference in one block of text, in order, deduplicated. */
function sectionMentions(text) {
	const found = [];
	for (const pattern of SECTION_MENTION) for (const match of text.matchAll(pattern)) {
		const mention = match[0].trim();
		if (!found.includes(mention)) found.push(mention);
	}
	return found;
}
/** Whether a section or page reference corresponds to something parsed. */
function mentionSupported(mention, targets) {
	const normalized = normalizeQuote(mention).toLowerCase();
	const pageRange = /p{1,2}\.\s*(\d+)(?:\s*[-–—]\s*(\d+))?/iu.exec(normalized);
	const chinesePage = /第\s*(\d+)\s*[页頁]/u.exec(normalized);
	if (pageRange !== null || chinesePage !== null) {
		const start = Number.parseInt(pageRange?.[1] ?? chinesePage?.[1] ?? "", 10);
		return [start, Number.parseInt(pageRange?.[2] ?? String(start), 10)].every((page) => targets.some((target) => target.page === page));
	}
	return targets.some((target) => {
		const label = normalizeQuote(target.label).toLowerCase();
		if (label === "") return false;
		if (label.includes(normalized) || normalized.includes(label)) return true;
		return target.headingPath.some((part) => normalizeQuote(part).toLowerCase().includes(normalized));
	});
}
//#endregion
export { sectionIdOf as _, formatSectionAnchor as a, resolveAnchorTarget as c, SOURCE_STRUCTURE_PROTOCOL as d, SPACE_MANIFEST_PROTOCOL as f, quoteHashOf as g, normalizeQuote as h, formatAnchorTarget as i, sameStringList as l, contentHashOf as m, anchorPage as n, mentionSupported as o, VAULT_MANIFEST_PROTOCOL as p, anchorTargetsOf as r, parseAnchorText as s, ANCHOR_PATH_SEPARATOR as t, sectionMentions as u, slugify as v };
