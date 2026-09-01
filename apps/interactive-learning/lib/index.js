import { i as __reExport, n as types_exports, r as __exportAll, t as material_anchor_exports } from "./material-anchor-ChboTkkx.js";
import { _ as reduceLearnerState, a as LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL, b as resetLearnerState, c as LEARNING_CHECKPOINT_METRIC_STATUSES, d as MAX_FAILED_MOVES, f as createInitialLearnerState, g as parseLearnerStateSnapshotEvent, h as hydrateLearnerStateSnapshot, i as LEARNER_STATE_SESSION_EVENT_TYPE, l as LEARNING_SEGMENT_EVENT_PROTOCOL, m as foldLearnerStateSession, n as LEARNER_STATE_EVENT_PROTOCOL, o as LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE, p as createLearnerStateSnapshotEvent, r as LEARNER_STATE_PROTOCOL, s as LEARNING_CHECKPOINT_METRIC_KINDS, t as DEFAULT_TRANSCRIPT_TOKEN_BUDGET, u as LEARNING_SEGMENT_SESSION_EVENT_TYPE, v as registerLearningSessionEventType, x as serializeLearnerStateSnapshot, y as renderLearnerStateTranscript } from "./learner-state-BiBCCaLg.js";
import { t as registerInteractiveLearningSessionCompatibility } from "./bootstrap-CTHy9zCQ.js";
import { $ as parseMarkdownFrontmatter, A as describeReanchor, B as lexical_exports, C as mentionedPaths, Ct as LEARN_INTENT, D as TeachingPlanner, Dt as classifyLearnIntent, Et as LEARN_INTENT_RULES, F as excerptAround, G as conceptCardDraftFromState, H as MAX_CONCEPT_CARDS, I as executeRetrievalPlan, J as dateKey, K as conceptCardPathOf, L as keyPhrases, M as reanchorVaultMemory, N as DEFAULT_RETRIEVAL_BUDGET_CHARS, O as retrieve, Ot as isLearnIntent, P as RETRIEVAL_INTENTS, Q as nextReviewSchedule, R as matchedTerms, S as sectionAnchor, St as LEARNING_INTENT_ROUTING_GUIDANCE, T as syncMentionedMaterial, Tt as LEARN_INTENT_NATURAL_LANGUAGE_RULES, U as MAX_REVIEW_INTERVAL_DAYS, V as INITIAL_REVIEW_INTERVAL_DAYS, W as buildConceptStudyMap, X as isConceptDue, Y as hasFreshIndependentTransfer, Z as labelFromBody, _ as MATERIAL_TOOL_NAMES, _t as readLearnerMemory, a as LEARNING_REVIEW_POLICY, at as renderConceptCard, b as MAX_SEARCH_MATCHES, bt as writeLearnerMemory, c as LEARNING_VISUAL_POLICY, ct as updateConceptCardAnchors, d as routeLearningTurn, dt as LEARNER_MEMORY_PROTOCOL, et as readConceptCard, f as CONCEPT_TOOL_NAMES, ft as MAX_RENDERED_CONCEPTS, g as validateStudyMapAgainstVault, gt as parseLearnerConceptRecord, h as formatStudyMapViolations, ht as memoryPathOf, i as LEARNING_MATERIAL_POLICY, it as recallCardIdOf, j as reanchorAnchorLists, k as pipeline_exports, kt as isLearningBoundary, l as buildLearningTeachingPolicy, lt as updateConceptCardSchedule, mt as conceptRecordFromState, n as LEARNING_CONCEPT_SAVE_POLICY, nt as readLearnerMemoryWithCards, o as LEARNING_TEACHING_POLICY, ot as reviewIntervalDays, p as registerConceptTools, pt as MAX_STORED_CONCEPTS, q as conceptRecordFromCard, r as LEARNING_GRADED_POLICY, rt as reanchorConceptCards, s as LEARNING_TEACHING_POLICY_CORE, st as saveConceptCard, t as LEARNING_CHINESE_TEMPLATES, tt as readConceptCards, u as routeLearningRequest, ut as yamlString, v as MAX_MAP_SECTIONS, vt as renderLearnerMemory, w as parseFileMentions, wt as LEARN_INTENT_MODEL_GUIDANCE, x as registerMaterialTools, xt as topic_vault_exports, y as MAX_READ_CHARS, yt as upsertLearnerConcept, z as planRetrieval } from "./teaching-policy-BezN_TGy.js";
import { c as parseLearningCheckpointResultV1, h as CHECKPOINT_RESULT_PROTOCOL, l as parseLearningCheckpointV1, p as LearningProtocolError, t as CHECKPOINT_TRANSPORT_PROTOCOL, u as parseLearningRecallFeedbackV1 } from "./protocol-current-Cyp6-wYL.js";
import { createHash, randomUUID } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
import { UserQuestionError } from "@deepseek-ai/dsh-user-questions";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";
//#region lib/types/host-transport.js
/**
* Host-only transport writers.
*
* The renderer still owns the synchronous legacy transport decoders in
* `transport.ts`. The broker only needs to write current wait projections;
* keeping those writers here prevents the host entry from eagerly importing
* the retired V1/V2 activity parsers.
*/
const MARKER_SUFFIX = "-->";
const CHECKPOINT_WAIT_MARKER_PREFIX = "<!--dsh-learning/checkpoint-wait@1:";
const CHECKPOINT_WAIT_QUESTION_ID_PREFIX = "dsh-learning/checkpoint-wait@1:";
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function encodeBase64Url(value) {
	const bytes = new TextEncoder().encode(value);
	let result = "";
	for (let index = 0; index < bytes.length; index += 3) {
		const a = bytes[index];
		const b = bytes[index + 1];
		const c = bytes[index + 2];
		const triple = a << 16 | (b ?? 0) << 8 | (c ?? 0);
		result += BASE64URL[triple >> 18 & 63];
		result += BASE64URL[triple >> 12 & 63];
		if (b !== void 0) result += BASE64URL[triple >> 6 & 63];
		if (c !== void 0) result += BASE64URL[triple & 63];
	}
	return result;
}
function opaqueToken(value) {
	return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}
function boundedTransportIdentity(value) {
	return typeof value === "string" && value.length >= 1 && value.length <= 512 && value.trim() === value && !/[\u0000-\u001F\u007F]/.test(value);
}
function assertCheckpointEnvelopeInput(input) {
	if (!boundedTransportIdentity(input.sessionId)) throw new Error("sessionId must be a non-empty bounded transport identity");
	if (!boundedTransportIdentity(input.callId)) throw new Error("callId must be a non-empty bounded transport identity");
	if (!opaqueToken(input.waitId)) throw new Error("waitId must be a URL-safe opaque token");
	if (!opaqueToken(input.checkpointId)) throw new Error("checkpointId must be a URL-safe opaque token");
}
/** A checkpoint question id contains one opaque lookup token. */
function learningCheckpointQuestionId(waitId) {
	if (!opaqueToken(waitId)) throw new Error("waitId must be a URL-safe opaque token");
	return `${CHECKPOINT_WAIT_QUESTION_ID_PREFIX}${waitId}`;
}
/** Persist one answer-free checkpoint projection for refresh recovery. */
function encodeLearningCheckpointDetail(input) {
	assertCheckpointEnvelopeInput(input);
	const envelope = {
		transport: CHECKPOINT_TRANSPORT_PROTOCOL,
		...input
	};
	return `${CHECKPOINT_WAIT_MARKER_PREFIX}${encodeBase64Url(JSON.stringify(envelope))}${MARKER_SUFFIX}\n${input.checkpoint.fallbackMarkdown}`;
}
//#endregion
//#region lib/types/vault-concepts.js
/**
* The vault panel's concept and review face — the first writes the panel makes.
*
* Four operations, and the shape of each one is the rule it enforces:
*
* - `concepts/save` takes a BODY and nothing else. Every prose field a card has
*   (`label`, `explanation`, `misconceptions`, `unverifiedTransfer`,
*   `relatedConcepts`) is derived from that body by `parseCard`, and the typed
*   frontmatter is carried across untouched. The endpoint therefore has no
*   parameter that could change mastery, due, or anchors — the rule is in the
*   signature, not in a validation branch someone can forget.
* - `concepts/rate` runs the existing `nextReviewSchedule`. A rating is a
*   scheduling signal, never mastery evidence: `'revealed'` deliberately
*   produces no schedule at all, so failing to recall a card leaves it due.
* - `concepts/defer` moves `due` and NOTHING else. Deferring is not a review,
*   so it must not touch `intervalDays` or `lastReviewedAt` — otherwise pushing
*   a card back a day would quietly corrupt its spacing.
* - `concepts/correct` is the one manual mastery outlet, and it only goes DOWN.
*   It writes `masteryBasis: 'user-correction'`, which is the single basis
*   `mergeConcept` accepts a regression from.
*
* The correction has to write BOTH the card file and `.learning/memory.json`.
* `readLearnerMemoryWithCards` overlays a card's schedule and anchors onto the
* memory record but deliberately not its mastery — typed state is the domain
* record's to own — so a card-only write would be silently reverted on the next
* prompt assembly. That asymmetry is the whole reason this module exists rather
* than the panel calling `concept-cards.ts` directly.
* @module @dsh-portable/interactive-learning/src/vault-concepts
*/
/** Longest card body the panel may write; a card is a note, not a document. */
const MAX_CARD_BODY_CHARS = 8e3;
/** Mastery ladder, lowest first. Mirrors `learner-memory.ts`; only walked downward here. */
const MASTERY_LADDER = [
	"unseen",
	"emerging",
	"transfer"
];
function panelConcept(vault, card, now) {
	return {
		conceptSlug: card.conceptSlug,
		label: card.label,
		mastery: card.mastery,
		masteryBasis: card.masteryBasis,
		due: card.due,
		intervalDays: card.intervalDays,
		lastReviewedAt: card.lastReviewedAt,
		createdAt: card.createdAt,
		updatedAt: card.updatedAt,
		anchors: card.anchors,
		staleAnchors: card.staleAnchors,
		explanation: card.explanation,
		misconceptions: card.misconceptions,
		unverifiedTransfer: card.unverifiedTransfer,
		relatedConcepts: card.relatedConcepts,
		path: (0, topic_vault_exports.vaultRelative)(vault, card.path),
		body: card.body,
		due_now: isConceptDue(card.due, now)
	};
}
/**
* Every card, due ones first.
*
* Ordering is the panel's only editorial act here: a stale anchor outranks a due
* date, because a card citing material that no longer exists is wrong in a way
* no amount of reviewing fixes.
*/
async function listConcepts(vault, now = /* @__PURE__ */ new Date()) {
	const concepts = (await readConceptCards(vault)).map((card) => panelConcept(vault, card, now)).sort((left, right) => {
		const rank = (concept) => concept.staleAnchors.length > 0 ? 0 : concept.due_now ? 1 : 2;
		const difference = rank(left) - rank(right);
		if (difference !== 0) return difference;
		return (left.due ?? "9999-12-31").localeCompare(right.due ?? "9999-12-31");
	});
	return {
		status: "ok",
		concepts,
		due: concepts.filter((concept) => concept.due_now).length,
		stale: concepts.filter((concept) => concept.staleAnchors.length > 0).length
	};
}
/** The due queue, in the order the review deck should present it. */
async function reviewQueue(vault, now = /* @__PURE__ */ new Date()) {
	const all = await listConcepts(vault, now);
	const concepts = all.concepts.filter((concept) => concept.due_now);
	return {
		status: "ok",
		concepts,
		due: concepts.length,
		stale: all.stale
	};
}
/**
* Replace one card's prose, keeping every typed field exactly as it was.
*
* Rewritten through `renderConceptCard` rather than a text splice so the
* frontmatter is re-serialized from the parsed card: a person who hand-edited
* `mastery` into something invalid gets it normalized here rather than carried
* forward, and the file keeps one canonical shape.
* @param vault - The vault holding the card.
* @param conceptSlug - The card's slug (its filename, and the memory key).
* @param body - New Markdown body, frontmatter excluded.
* @returns the reparsed card, or `undefined` when no such card exists.
*/
async function saveConceptBody(vault, conceptSlug, body, now = /* @__PURE__ */ new Date()) {
	const card = await readConceptCard(vault, conceptSlug);
	if (card === void 0) return void 0;
	const next = {
		...card,
		body: body.slice(0, MAX_CARD_BODY_CHARS).trimEnd(),
		updatedAt: now.toISOString()
	};
	await writeFile(card.path, renderConceptCard(next, now), "utf8");
	const saved = await readConceptCard(vault, conceptSlug);
	return saved === void 0 ? void 0 : panelConcept(vault, saved, now);
}
/**
* Record one review rating.
*
* No token is spent and no turn is created: the rating moves `due` in the
* frontmatter and nothing else. It is still projected into learner memory so
* the next teaching session knows the card was reviewed — but as SCHEDULE, not
* as evidence, which is why mastery is carried across untouched.
*/
async function rateConcept(vault, conceptSlug, rating, now = /* @__PURE__ */ new Date()) {
	const card = await readConceptCard(vault, conceptSlug);
	if (card === void 0) return void 0;
	const schedule = nextReviewSchedule(card, rating, now);
	if (schedule === void 0) return panelConcept(vault, card, now);
	const updated = await updateConceptCardSchedule(vault, conceptSlug, schedule);
	if (updated === void 0) return void 0;
	await upsertLearnerConcept(vault, conceptRecordFromCard(updated));
	return panelConcept(vault, updated, now);
}
function addDays(now, days) {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)).toISOString().slice(0, 10);
}
/**
* Push one card's next review back without calling it a review.
*
* `intervalDays` and `lastReviewedAt` are deliberately untouched. Deferring is
* "not today", not "I got this right"; folding it into the spacing would let a
* busy week silently inflate every interval in the vault.
* @param days - Whole days from today, 1..{@link MAX_DEFER_DAYS}.
*/
async function deferConcept(vault, conceptSlug, days, now = /* @__PURE__ */ new Date()) {
	const card = await readConceptCard(vault, conceptSlug);
	if (card === void 0) return void 0;
	const bounded = Math.min(Math.max(Math.floor(days), 1), 365);
	const next = {
		...card,
		due: addDays(now, bounded),
		updatedAt: now.toISOString()
	};
	await writeFile(card.path, renderConceptCard(next, now), "utf8");
	await upsertLearnerConcept(vault, conceptRecordFromCard(next));
	return panelConcept(vault, next, now);
}
/** One step down the ladder; `unseen` is the floor. */
function loweredMastery(mastery) {
	const index = MASTERY_LADDER.indexOf(mastery);
	return MASTERY_LADDER[Math.max(0, index - 1)] ?? "unseen";
}
/**
* "I didn't actually understand this" — the only manual mastery outlet.
*
* One step DOWN only. Mastery is the conclusion of observed evidence, so the
* panel offers no way to raise it: a person who wants a higher mastery has to
* demonstrate it in a teaching session, which is the entire point of basing it
* on evidence rather than self-report.
*
* The write lands in two places on purpose. The card file keeps the frontmatter
* a person sees in Obsidian honest, and `memory.json` is what the next prompt
* assembly actually reads — `readLearnerMemoryWithCards` does not overlay
* mastery from the card, so writing only the file would be reverted.
* `masteryBasis: 'user-correction'` is what makes `mergeConcept` accept the
* regression instead of restoring the higher value.
*
* The schedule is reset alongside it: an interval that doubled on the strength
* of a mastery the learner just disowned is not a spacing worth keeping.
*/
async function correctConcept(vault, conceptSlug, now = /* @__PURE__ */ new Date()) {
	const card = await readConceptCard(vault, conceptSlug);
	if (card === void 0) return void 0;
	const mastery = loweredMastery(card.mastery);
	const next = {
		...card,
		mastery,
		masteryBasis: "user-correction",
		due: dateKey(now),
		intervalDays: reviewIntervalDays(mastery),
		updatedAt: now.toISOString()
	};
	await writeFile(card.path, renderConceptCard(next, now), "utf8");
	await upsertLearnerConcept(vault, {
		...conceptRecordFromCard(next),
		masteryBasis: "user-correction"
	});
	return panelConcept(vault, next, now);
}
/** Read one card's raw file, for the editor's "show me the whole file" affordance. */
async function readConceptFile(vault, conceptSlug) {
	const card = await readConceptCard(vault, conceptSlug);
	if (card === void 0) return void 0;
	try {
		return {
			path: (0, topic_vault_exports.vaultRelative)(vault, card.path),
			text: await readFile(card.path, "utf8")
		};
	} catch {
		return;
	}
}
//#endregion
//#region lib/types/vault-notes.js
/**
* The vault panel's notes store — the fourth pain point's backend.
*
* `notes/` has existed since `ensureVaultLayout` first created it and nothing
* in this repository has ever written to it. This module is that writer, and
* it also holds the 待确认概念卡 inbox, because an inbox entry is not a
* different kind of object from a note: both are prose a learner chose to keep,
* and both belong in a file they can open in any editor. One `kind` field in
* the frontmatter is the whole difference.
*
* Keeping the inbox in `notes/` rather than in a `.learning/*.json` ledger is
* deliberate. A JSON staging area would be a second, invisible store whose
* contents a person could neither read nor edit outside this panel — exactly
* the failure the vault exists to fix. It also keeps the inbox out of
* `concepts/`, which matters more: `readConceptCards` walks that directory, so
* a draft parked there would enter the model's study map as a real card and
* quietly defeat the evidence gate.
*
* That gate is the rule this module enforces, and it enforces it by NOT having
* a way to break it. Nothing here creates a concept card. `promoteNote`
* succeeds only when a card for that concept ALREADY exists — meaning the
* learner demonstrated a correct, independent transfer in a teaching session
* and `saveConceptCard` wrote it — and all promotion then does is attach the
* kept prose to that card as one more observation. A note whose concept has no
* card answers `gate-blocked`, forever if need be. Mastery comes from evidence;
* the panel's job is to hold the draft until the evidence exists.
* @module @dsh-portable/interactive-learning/src/vault-notes
*/
/** Longest note body the panel may write. Prose, not a corpus. */
const MAX_NOTE_BODY_CHARS = 2e4;
/** Excerpt length in a listing row. */
const MAX_NOTE_EXCERPT_CHARS = 220;
const NOTE_KINDS$1 = /* @__PURE__ */ new Set(["note", "pending-concept"]);
function notePathOf(vault, noteSlug) {
	return join(vault.notes, `${(0, types_exports.slugify)(noteSlug, "note")}.md`);
}
function clean(value, limit) {
	return value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/gu, " ").trim().slice(0, limit);
}
function kindOf(value) {
	return NOTE_KINDS$1.has(value ?? "") ? value : "note";
}
/**
* The first line of prose under the heading, collapsed.
*
* Deliberately skips the heading rather than slicing the raw body: a listing
* row already shows the title, and an excerpt that repeats it tells a person
* nothing about which note this is.
*/
function excerptOf(body) {
	const prose = body.split("\n").filter((line) => !/^#{1,6}\s/u.test(line) && line.trim() !== "").join(" ").replace(/\s+/gu, " ").trim();
	return prose.length > MAX_NOTE_EXCERPT_CHARS ? `${prose.slice(0, MAX_NOTE_EXCERPT_CHARS)}…` : prose;
}
/** Give a body a level-1 heading when it has none, so title and file agree. */
function withHeading(body, title) {
	const trimmed = body.trim();
	if (labelFromBody(trimmed) !== "") return trimmed;
	const heading = clean(title, 160);
	if (heading === "") return trimmed;
	return trimmed === "" ? `# ${heading}` : `# ${heading}\n\n${trimmed}`;
}
function frontmatter(note) {
	return `${[
		"---",
		`id: ${yamlString(note.noteSlug)}`,
		`kind: ${note.kind}`,
		`concept: ${note.conceptSlug === null ? "null" : yamlString(note.conceptSlug)}`,
		`promoted_to: ${note.promotedTo === null ? "null" : yamlString(note.promotedTo)}`,
		`source_session: ${note.sourceSessionId === null ? "null" : yamlString(note.sourceSessionId)}`,
		`source_message: ${note.sourceMessageId === null ? "null" : yamlString(note.sourceMessageId)}`,
		`created_at: ${yamlString(note.createdAt)}`,
		`updated_at: ${yamlString(note.updatedAt)}`,
		"---"
	].join("\n")}\n\n`;
}
/** Serialize one note back to its file. */
function renderNote(note) {
	return `${frontmatter(note)}${note.body.trim()}\n`;
}
/**
* Read one note file.
*
* A file with no frontmatter is a note, not an error. `notes/` is a folder in
* someone's own vault and they are entitled to drop a Markdown file into it by
* hand; refusing to list what a person can plainly see would make the panel
* less trustworthy than their file manager.
*/
function parseNote(raw, path, vault) {
	const fileSlug = basename(path, ".md");
	const parsed = parseMarkdownFrontmatter(raw);
	const body = (parsed?.body ?? raw.replace(/\r\n/gu, "\n")).trim();
	const epoch = (/* @__PURE__ */ new Date(0)).toISOString();
	const conceptField = parsed?.fields.get("concept") ?? null;
	const kind = kindOf(parsed?.fields.get("kind"));
	return {
		noteSlug: (0, types_exports.slugify)(parsed?.fields.get("id") ?? fileSlug, fileSlug),
		kind,
		title: labelFromBody(body) || fileSlug,
		body,
		excerpt: excerptOf(body),
		path: (0, topic_vault_exports.vaultRelative)(vault, path),
		conceptSlug: kind === "pending-concept" && conceptField !== null ? conceptField : null,
		gate: null,
		sourceSessionId: parsed?.fields.get("source_session") ?? null,
		sourceMessageId: parsed?.fields.get("source_message") ?? null,
		promotedTo: parsed?.fields.get("promoted_to") ?? null,
		createdAt: parsed?.fields.get("created_at") ?? epoch,
		updatedAt: parsed?.fields.get("updated_at") ?? epoch
	};
}
/** Resolve the gate for one note by asking whether its card exists yet. */
async function gated(vault, note) {
	if (note.conceptSlug === null) return note;
	const card = await readConceptCard(vault, note.conceptSlug);
	return {
		...note,
		gate: card === void 0 ? "blocked" : "ready"
	};
}
/** Read one note, gate resolved. */
async function readNote(vault, noteSlug) {
	const path = notePathOf(vault, noteSlug);
	try {
		return await gated(vault, parseNote(await readFile(path, "utf8"), path, vault));
	} catch {
		return;
	}
}
async function noteFileNames(vault) {
	try {
		return (await readdir(vault.notes)).filter((name) => name.endsWith(".md")).sort();
	} catch {
		return [];
	}
}
/**
* Every note, blocked drafts first.
*
* Ordering mirrors the concept list's: the rows that need a decision outrank
* the rows that only need reading. A blocked draft is the one thing in this
* section a person may have forgotten about, so it leads; after that, most
* recently touched first, because notes have no due date to sort by.
*/
async function listNotes(vault) {
	const notes = [];
	for (const name of (await noteFileNames(vault)).slice(0, 200)) {
		const path = join(vault.notes, name);
		try {
			notes.push(await gated(vault, parseNote(await readFile(path, "utf8"), path, vault)));
		} catch {}
	}
	notes.sort((left, right) => {
		const rank = (note) => note.gate === "blocked" ? 0 : note.gate === "ready" ? 1 : 2;
		const difference = rank(left) - rank(right);
		if (difference !== 0) return difference;
		return right.updatedAt.localeCompare(left.updatedAt);
	});
	return {
		status: "ok",
		notes,
		pending: notes.filter((note) => note.kind === "pending-concept").length,
		blocked: notes.filter((note) => note.gate === "blocked").length
	};
}
/** A slug not already taken, so keeping two messages under one title cannot clobber. */
async function freeSlug(vault, base) {
	const taken = new Set((await noteFileNames(vault)).map((name) => basename(name, ".md")));
	if (!taken.has(base)) return base;
	for (let suffix = 2; suffix < 1e3; suffix += 1) {
		const candidate = `${base}-${String(suffix)}`;
		if (!taken.has(candidate)) return candidate;
	}
	return `${base}-${String(Date.now())}`;
}
/**
* Create or overwrite one note.
*
* The signature is the rule, as it is for `concepts/save`: there is no mastery,
* due, interval or anchor parameter, because a note has none of those. What a
* note can carry beyond its prose is provenance — which session and message it
* was kept from — and that is written once, at creation, and never editable.
* @param vault - The vault holding the note.
* @param input - Prose plus, on creation, kind and provenance.
* @param now - Injected clock.
* @returns the saved note, gate resolved.
*/
async function saveNote(vault, input, now = /* @__PURE__ */ new Date()) {
	const existing = input.noteSlug === void 0 ? void 0 : await readNote(vault, input.noteSlug);
	const title = clean(input.title ?? "", 160);
	const body = withHeading(clean(input.body, MAX_NOTE_BODY_CHARS), title);
	const noteSlug = existing?.noteSlug ?? await freeSlug(vault, (0, types_exports.slugify)(title || labelFromBody(body) || "note", "note"));
	const kind = input.kind ?? existing?.kind ?? "note";
	const conceptSlug = kind === "pending-concept" ? input.conceptSlug === void 0 ? existing?.conceptSlug ?? (0, types_exports.slugify)(title || labelFromBody(body) || noteSlug, "concept") : (0, types_exports.slugify)(input.conceptSlug, "concept") : null;
	const next = {
		noteSlug,
		kind,
		title: labelFromBody(body) || noteSlug,
		body,
		excerpt: excerptOf(body),
		path: (0, topic_vault_exports.vaultRelative)(vault, notePathOf(vault, noteSlug)),
		conceptSlug,
		gate: null,
		sourceSessionId: existing?.sourceSessionId ?? input.sourceSessionId ?? null,
		sourceMessageId: existing?.sourceMessageId ?? input.sourceMessageId ?? null,
		promotedTo: existing?.promotedTo ?? null,
		createdAt: existing?.createdAt ?? now.toISOString(),
		updatedAt: now.toISOString()
	};
	await mkdir(vault.notes, { recursive: true });
	await writeFile(notePathOf(vault, noteSlug), renderNote(next), "utf8");
	return await gated(vault, next);
}
/** Delete one note file. The only destructive action the panel offers. */
async function deleteNote(vault, noteSlug) {
	if (await readNote(vault, noteSlug) === void 0) return false;
	await rm(notePathOf(vault, noteSlug), { force: true });
	return true;
}
/**
* Attach one pending note's prose to the concept card it was aimed at.
*
* This is NOT card creation and cannot become it. The card must already exist,
* which means a teaching session already observed a correct, independent
* transfer of that concept and `saveConceptCard` wrote the file. Promotion only
* appends the kept prose to that card as a dated observation — the same shape
* `appendObservation` uses — and flips the note to a plain note pointing at it.
*
* When no such card exists the answer is `gate-blocked` and NOTHING is written.
* There is no force parameter, no override and no admin path: a promotion that
* could conjure a card would make the mastery ladder a self-report, which is
* the exact failure the gate exists to prevent.
*/
async function promoteNote(vault, noteSlug, now = /* @__PURE__ */ new Date()) {
	const note = await readNote(vault, noteSlug);
	if (note === void 0) return { status: "unknown-note" };
	if (note.kind !== "pending-concept" || note.conceptSlug === null) return {
		status: "not-pending",
		note
	};
	const card = await readConceptCard(vault, note.conceptSlug);
	if (card === void 0) return {
		status: "gate-blocked",
		note
	};
	const prose = note.body.split("\n").filter((line) => !/^#\s/u.test(line)).join("\n").trim();
	const merged = `${card.body.trimEnd()}\n\n## 从笔记并入（${dateKey(now)}）\n${prose}\n`;
	const concept = await saveConceptBody(vault, note.conceptSlug, merged, now);
	if (concept === void 0) return {
		status: "gate-blocked",
		note
	};
	const promoted = {
		...note,
		kind: "note",
		conceptSlug: null,
		gate: null,
		promotedTo: card.conceptSlug,
		updatedAt: now.toISOString()
	};
	await writeFile(notePathOf(vault, note.noteSlug), renderNote(promoted), "utf8");
	return {
		status: "ok",
		note: promoted,
		concept
	};
}
//#endregion
//#region lib/types/ingest/markdown.js
var markdown_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_ingest_markdown from "@dsh-portable/space-kernel/ingest/markdown";
__reExport(markdown_exports, import__dsh_portable_space_kernel_ingest_markdown);
//#endregion
//#region lib/types/ingest/index.js
var ingest_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_ingest_index from "@dsh-portable/space-kernel/ingest/index";
__reExport(ingest_exports, import__dsh_portable_space_kernel_ingest_index);
//#endregion
//#region lib/types/ingest/text.js
var text_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_ingest_text from "@dsh-portable/space-kernel/ingest/text";
__reExport(text_exports, import__dsh_portable_space_kernel_ingest_text);
//#endregion
//#region lib/types/material-vision.js
/**
* Re-reading image-only PDF pages with a model — the panel's only paid action.
*
* Every other endpoint in this app's panel surface reads or writes local files.
* This one spends tokens, and the whole module is shaped around making that
* fact checkable BEFORE anyone commits to it: {@link materialRouteInfo} answers
* "what would happen and who would read it" without generating model output
* (it may query the provider/model catalog), and
* {@link reparsePages} is the only function here that reaches a provider.
*
* Route selection restates the rule the Vision Bridge uses rather than
* importing it. A multimodal active model reads the page ITSELF — there is no
* bridge hop, no second model, and no separate bill. Only a model that has
* explicitly declared it does not accept images is refused, and it is refused
* rather than silently rerouted: this pack cannot see or configure another
* pack's fallback model, so quietly spending money on a model the person did
* not choose would be worse than saying "switch your model".
*
* The duplication is deliberate. `vision-bridge` is a separately installable
* experience pack; importing it here would make each pack require the other's
* install to type-check. What is duplicated is small and stable: the
* three-state modality reading, and the two Poppler binaries.
*
* Writes go back through the ORDINARY ingest pipeline. The recovered text is
* spliced into the parse as blocks, and `emitSource` re-derives the markdown
* and the structure from scratch — so section ids, quote hashes and line
* numbers stay exactly what a normal import would have produced, and
* re-anchoring runs on the result the same way `ingestSource` runs it. Nothing
* here hand-edits `extracted/`.
* @module @dsh-portable/interactive-learning/src/material-vision
*/
const execFileAsync = promisify(execFile);
/** Rasterizers this module knows how to drive; the first one present wins. */
const PDF_RENDERERS = ["pdftoppm", "pdftocairo"];
/** Render resolution. Matches the Vision Bridge so a page reads the same either way. */
const PDF_RENDER_DPI = 144;
const PDF_RENDER_TIMEOUT_MS = 3e4;
/** Longest recovered text kept per page. */
const MAX_PAGE_TEXT_CHARS = 12e3;
const MODEL_TIMEOUT_MS = 12e4;
/** Marker appended to a recovered page's heading, so a citation carries it too. */
const REPARSE_HEADING_SUFFIX = "（视觉重读）";
function isRecord$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function routeFrom(value) {
	if (!isRecord$1(value) || typeof value.provider !== "string" || typeof value.model !== "string") return void 0;
	if (value.provider.trim() === "" || value.model.trim() === "") return void 0;
	return {
		provider: value.provider,
		model: value.model
	};
}
function contextMember(ctx, name) {
	try {
		const service = ctx.get(name);
		if (service !== void 0) return service;
	} catch {}
	try {
		return ctx[name];
	} catch {
		return;
	}
}
function routeFromSession(session) {
	if (session === void 0) return void 0;
	try {
		const headerRoute = routeFrom(session.requestHeader?.()?.config);
		if (headerRoute !== void 0) return headerRoute;
	} catch {}
	try {
		const contextRoute = routeFrom(session.requestContext?.());
		if (contextRoute !== void 0) return contextRoute;
	} catch {}
	return routeFrom(session.modelSelection) ?? routeFrom(session.selectedModel);
}
function routeFromAgent(agent) {
	if (agent === void 0) return void 0;
	return routeFromSession(agent.session) ?? routeFrom(agent.options);
}
function identityOf(value) {
	const id = value.id ?? ("header" in value ? value.header?.id : void 0);
	return typeof id === "string" && id !== "" ? id : void 0;
}
function sameCwd(value, cwd) {
	if (cwd === void 0) return true;
	if (value === void 0) return false;
	try {
		return resolve(value) === resolve(cwd);
	} catch {
		return value === cwd;
	}
}
function sessionCwd(session) {
	const cwd = session?.header?.cwd;
	return typeof cwd === "string" && cwd !== "" ? cwd : void 0;
}
/** Find the route belonging to the session behind a panel request. */
function sessionModelRoute(ctx, selector) {
	const requestedId = selector.sessionId?.trim();
	const cwd = selector.cwd;
	const agents = contextMember(ctx, "agents");
	const sessions = contextMember(ctx, "sessions");
	if (requestedId !== void 0 && requestedId !== "") {
		const explicitAgent = agents?.get?.(requestedId);
		if (explicitAgent !== void 0) return {
			route: routeFromAgent(explicitAgent),
			matched: true
		};
		const explicitSession = sessions?.get?.(requestedId);
		if (explicitSession !== void 0) return {
			route: routeFromSession(explicitSession),
			matched: true
		};
	}
	const candidates = [];
	const contextualAgent = contextMember(ctx, "agent");
	if (contextualAgent !== void 0) candidates.push(contextualAgent);
	try {
		const initiator = agents?.currentInitiator?.();
		if (initiator !== void 0 && !candidates.includes(initiator)) candidates.push(initiator);
	} catch {}
	try {
		for (const agent of [...agents?.list?.() ?? []].reverse()) if (!candidates.includes(agent)) candidates.push(agent);
	} catch {}
	for (const [index, agent] of candidates.entries()) {
		const id = identityOf(agent);
		const agentCwd = sessionCwd(agent.session);
		if (requestedId !== void 0 && requestedId !== "" && id !== requestedId) continue;
		if (!(index === 0 && contextualAgent === agent) && !sameCwd(agentCwd, cwd)) continue;
		return {
			route: routeFromAgent(agent),
			matched: true
		};
	}
	try {
		const sessionCandidates = [...sessions?.list?.() ?? []].reverse();
		for (const session of sessionCandidates) {
			const id = identityOf(session);
			if (requestedId !== void 0 && requestedId !== "" && id !== requestedId) continue;
			if (!sameCwd(sessionCwd(session), cwd)) continue;
			return {
				route: routeFromSession(session),
				matched: true
			};
		}
	} catch {}
	return { matched: false };
}
/**
* The route the panel would use.
*
* Prefer the live session route used by the conversation. The global default is
* only a compatibility fallback for a direct, agentless call with no session
* registry; it must not override a session's logged or selected model.
*/
function panelModelRoute(ctx, selector = {}) {
	const session = sessionModelRoute(ctx, selector);
	if (session.matched) return session.route;
	const defaultModel = ctx.get("agentDefaultModel");
	return defaultModel?.currentSelection === void 0 ? void 0 : routeFrom(defaultModel.currentSelection());
}
/** Every model the configured providers report; a provider that cannot list is skipped. */
async function modelCatalog(llm) {
	const catalog = [];
	for (const provider of llm.listProviders()) try {
		catalog.push(...await llm.listModels(provider.id));
	} catch {
		continue;
	}
	return catalog;
}
/**
* Three-state image capability, matching the kernel's own convention.
*
* An ABSENT `inputModalities` means unknown; a present list without `image`
* means the model actively declares it does not accept one. Treating absence as
* a denial would lock out every provider that has not filled the field in.
*/
function imageCapability(route, catalog) {
	const entry = catalog.find((model) => model.provider === route.provider && model.id === route.model);
	if (entry?.inputModalities === void 0) return "unknown";
	return entry.inputModalities.includes("image") ? "supported" : "unsupported";
}
/** The first rasterizer on PATH, or `undefined` when neither is installed. */
async function findPdfRenderer() {
	for (const renderer of PDF_RENDERERS) try {
		await execFileAsync(renderer, ["-v"], {
			windowsHide: true,
			timeout: 5e3,
			maxBuffer: 64 * 1024
		});
		return renderer;
	} catch (cause) {
		if (isRecord$1(cause) && cause.code === "ENOENT") continue;
		return renderer;
	}
}
/** Rasterize one page to PNG in a fresh temp directory the caller must remove. */
async function renderPdfPage(renderer, filePath, page, signal) {
	const directory = await mkdtemp(join(tmpdir(), "dsh-learning-page-"));
	const outputBase = join(directory, "page");
	try {
		await execFileAsync(renderer, [
			"-png",
			"-singlefile",
			"-f",
			String(page),
			"-l",
			String(page),
			"-r",
			String(PDF_RENDER_DPI),
			filePath,
			outputBase
		], {
			windowsHide: true,
			timeout: PDF_RENDER_TIMEOUT_MS,
			signal,
			maxBuffer: 1024 * 1024
		});
		const imagePath = `${outputBase}.png`;
		if (!(await stat(imagePath)).isFile()) throw new Error(`${renderer} produced no image for page ${String(page)}`);
		return {
			directory,
			imagePath
		};
	} catch (cause) {
		await rm(directory, {
			recursive: true,
			force: true
		});
		throw cause;
	}
}
/** Pages one degradation set reports as image-only. */
function imageOnlyPages(degradation) {
	const pages = /* @__PURE__ */ new Set();
	for (const item of degradation) if (item.kind === "image-only-pages") for (const page of item.pages) pages.add(page);
	return [...pages].sort((left, right) => left - right);
}
/**
* Report the route without generating anything.
*
* Every branch here is answered from local state — the manifest, the file
* system, and a provider catalog lookup. `listModels` may refresh/query that
* catalog, but this function never calls `stream` and therefore spends no
* generation tokens. That distinction is what makes it safe for the panel to
* call before the person confirms a paid re-read.
*/
async function materialRouteInfo(ctx, vault, sourceId, deps = {}) {
	const entry = (await (0, topic_vault_exports.readManifest)(vault)).sources.find((source) => source.sourceId === sourceId);
	const blank = {
		status: "ok",
		route: "no-route",
		model: null,
		pages: [],
		reparsed: [],
		spendsTokens: false,
		renderer: null
	};
	if (entry === void 0) return {
		...blank,
		status: "unknown-source"
	};
	const already = entry.reparsed?.pages ?? [];
	const pending = imageOnlyPages(entry.degradation).filter((page) => !already.includes(page));
	const shaped = {
		...blank,
		pages: pending,
		reparsed: already
	};
	if (extname(entry.originalName).toLowerCase() !== ".pdf") return {
		...shaped,
		status: "not-pdf"
	};
	if (pending.length === 0) return {
		...shaped,
		status: "nothing-to-reparse"
	};
	try {
		if (!(await stat(join(vault.root, entry.sourcePath))).isFile()) return {
			...shaped,
			status: "source-file-missing"
		};
	} catch {
		return {
			...shaped,
			status: "source-file-missing"
		};
	}
	const renderer = await (deps.findRenderer ?? findPdfRenderer)();
	if (renderer === void 0) return {
		...shaped,
		route: "renderer-missing"
	};
	const llm = ctx.get("llm");
	const route = panelModelRoute(ctx, {
		sessionId: deps.sessionId,
		cwd: deps.cwd ?? vault.root
	});
	if (llm === void 0 || route === void 0) return {
		...shaped,
		renderer,
		route: "no-route"
	};
	const capability = imageCapability(route, await modelCatalog(llm));
	const kind = capability === "supported" ? "native-image" : capability === "unsupported" ? "text-only-model" : "unknown-capability";
	return {
		...shaped,
		renderer,
		route: kind,
		model: `${route.provider}/${route.model}`,
		spendsTokens: kind !== "text-only-model"
	};
}
/** Instruction for the page read. Extraction, not description, and no invention. */
const PAGE_EXTRACTION_INSTRUCTION = [
	"This image is one page of a document whose text layer could not be extracted.",
	"Transcribe the page as Markdown: headings as headings, paragraphs as paragraphs,",
	"tables as Markdown tables, formulas as LaTeX between $ delimiters.",
	"Transcribe only what is legible. Do not summarize, do not explain,",
	"and do not supply anything the page does not show — write [无法辨认] where text is unreadable."
].join(" ");
async function readOnePage(llm, attachments, route, imagePath, signal) {
	let attachment;
	try {
		const [saved] = await attachments.saveImages([{
			data: await readFile(imagePath),
			mediaType: "image/png",
			name: basename(imagePath)
		}]);
		if (saved === void 0) return {
			ok: false,
			message: "the attachment store committed no reference"
		};
		attachment = saved;
	} catch (cause) {
		return {
			ok: false,
			message: cause instanceof Error ? cause.message : String(cause)
		};
	}
	const controller = new AbortController();
	const timer = setTimeout(() => {
		controller.abort();
	}, MODEL_TIMEOUT_MS);
	const onAbort = () => {
		controller.abort();
	};
	signal?.addEventListener("abort", onAbort, { once: true });
	try {
		const options = {
			provider: route.provider,
			model: route.model,
			messages: [createUserMessage({
				content: [{
					type: "text",
					text: PAGE_EXTRACTION_INSTRUCTION
				}, {
					type: "image",
					attachment
				}],
				source: {
					kind: "plugin",
					plugin: "interactive-learning-material-vision"
				}
			})],
			temperature: 0,
			signal: controller.signal
		};
		const assembler = new BlockAssembler();
		for await (const chunk of llm.stream(options)) assembler.push(chunk);
		if (assembler.finish.kind !== "stop") return {
			ok: false,
			message: `the model stopped with ${assembler.finish.kind}`
		};
		return {
			ok: true,
			text: assembler.blocks().filter((block) => block.type === "text").map((block) => block.text).join("").trim().slice(0, MAX_PAGE_TEXT_CHARS)
		};
	} catch (cause) {
		return {
			ok: false,
			message: cause instanceof Error ? cause.message : String(cause)
		};
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener("abort", onAbort);
	}
}
/** Turn one page's recovered Markdown into blocks the emitter understands. */
function blocksForPage(sourceId, title, page, markdown) {
	const label = `第 ${String(page)} 页${REPARSE_HEADING_SUFFIX}`;
	const headingPath = [title, label];
	const blocks = [{
		kind: "heading",
		level: 2,
		text: label,
		anchor: {
			sourceId,
			headingPath: [...headingPath],
			page,
			quoteHash: (0, types_exports.quoteHashOf)(label)
		}
	}];
	for (const chunk of markdown.split(/\n{2,}/u)) {
		const text = chunk.trim();
		if (text === "") continue;
		const heading = /^(#{1,6})\s+(.+)$/u.exec(text);
		if (heading !== null) {
			const inner = heading[2].trim();
			if (isPageHeading(inner, page)) continue;
			blocks.push({
				kind: "heading",
				level: Math.min(6, Math.max(3, heading[1].length)),
				text: inner,
				anchor: {
					sourceId,
					headingPath: [...headingPath, inner],
					page,
					quoteHash: (0, types_exports.quoteHashOf)(inner)
				}
			});
			continue;
		}
		blocks.push({
			kind: text.startsWith("|") ? "table" : "paragraph",
			text,
			anchor: {
				sourceId,
				headingPath: [...headingPath],
				page,
				quoteHash: (0, types_exports.quoteHashOf)(text)
			}
		});
	}
	return blocks;
}
/** Whether a heading is the synthetic or canonical title for one page. */
function isPageHeading(text, page) {
	const normalized = text.trim().replace(/\s+/gu, "");
	return normalized === `第${String(page)}页` || normalized === `第${String(page)}页（视觉重读）`;
}
/** Read the emitted extraction so a later batch starts with earlier recovery. */
async function currentExtraction(vault, entry) {
	if ((entry.reparsed?.pages.length ?? 0) === 0) return void 0;
	const structure = await (0, topic_vault_exports.readStructure)(vault, entry.sourceId);
	if (structure === void 0) return void 0;
	try {
		const parsed = (0, text_exports.parseMarkdownBlocks)((await readFile(join(vault.root, entry.extractedPath), "utf8")).split(/\r?\n/u).filter((line) => {
			const trimmed = line.trim();
			return !trimmed.startsWith(`<!-- ${markdown_exports.EXTRACTED_HEADER}`) && !markdown_exports.PAGE_MARKER.test(trimmed);
		}).join("\n"), entry.sourceId, entry.title);
		const sections = structure.sections;
		const blocks = parsed.map((block) => {
			const section = sections.find((candidate) => candidate.headingPath.join("\0") === block.anchor.headingPath.join("\0"));
			if (section?.page === void 0) return block;
			return {
				...block,
				anchor: {
					...block.anchor,
					page: section.page
				}
			};
		});
		return {
			sourceId: entry.sourceId,
			title: entry.title,
			parser: entry.parser,
			blocks,
			degradation: entry.degradation
		};
	} catch {
		return;
	}
}
/**
* Splice recovered pages into a parse, in document order.
*
* Each page's blocks land after the last existing block whose page is at or
* below it, which is where the page's own content would have been had the
* parser been able to read it. Blocks with no page (formats without them) never
* match, so this is a no-op for anything but a paged source.
*/
function spliceRecoveredPages(parsed, recovered) {
	if (recovered.size === 0) return parsed;
	const recoveredPages = new Set(recovered.keys());
	const blocks = parsed.blocks.filter((block) => block.kind !== "heading" || block.anchor.page === void 0 || !recoveredPages.has(block.anchor.page) || !isPageHeading(block.text, block.anchor.page));
	for (const page of [...recovered.keys()].sort((left, right) => right - left)) {
		const additions = recovered.get(page) ?? [];
		let at = blocks.length;
		for (let index = blocks.length - 1; index >= 0; index -= 1) {
			const at_page = blocks[index]?.anchor.page;
			if (at_page !== void 0 && at_page <= page) {
				at = index + 1;
				break;
			}
			if (index === 0) at = 0;
		}
		blocks.splice(at, 0, ...additions);
	}
	const pages = new Set(recovered.keys());
	const degradation = [];
	for (const item of parsed.degradation) {
		if (item.kind !== "image-only-pages") {
			degradation.push(item);
			continue;
		}
		const remaining = item.pages.filter((page) => !pages.has(page));
		if (remaining.length > 0) degradation.push({
			kind: "image-only-pages",
			pages: remaining
		});
	}
	return {
		...parsed,
		blocks,
		degradation
	};
}
/**
* Re-read image-only pages with the active model and write the result back.
*
* The ONLY function in this app's panel surface that calls a provider. It
* refuses before spending anything when the route says it should: a text-only
* model, a missing rasterizer, or a source that is not a PDF all return without
* a single request.
*
* A page that fails is reported and skipped, not fatal. Recovering four pages
* out of six and saying so is strictly better than discarding four pages of
* paid-for text because the fifth timed out.
* @param ctx - Host context, for `llm`, `attachments` and the model selection.
* @param vault - The vault holding the source.
* @param sourceId - Manifest id of the source to re-read.
* @param requested - Pages to re-read; defaults to every pending image-only page.
* @param now - Injected clock.
* @returns per-page outcomes and the re-anchoring summary.
*/
async function reparsePages(ctx, vault, sourceId, requested, now = /* @__PURE__ */ new Date(), signal, deps = {}) {
	const info = await materialRouteInfo(ctx, vault, sourceId, deps);
	const head = {
		route: info.route,
		model: info.model,
		pages: [],
		recovered: []
	};
	if (info.status !== "ok") return {
		...head,
		status: info.status
	};
	if (info.route === "renderer-missing" || info.route === "no-route" || info.route === "text-only-model") return {
		...head,
		status: info.route
	};
	const entry = (await (0, topic_vault_exports.readManifest)(vault)).sources.find((source) => source.sourceId === sourceId);
	const wanted = (requested === void 0 || requested.length === 0 ? info.pages : info.pages.filter((page) => requested.includes(page))).slice(0, 8);
	if (wanted.length === 0) return {
		...head,
		status: "nothing-to-reparse"
	};
	const llm = ctx.get("llm");
	const attachments = ctx.get("attachments");
	const route = panelModelRoute(ctx, {
		sessionId: deps.sessionId,
		cwd: deps.cwd ?? vault.root
	});
	if (llm === void 0 || attachments === void 0 || route === void 0) return {
		...head,
		status: "no-route",
		route: "no-route"
	};
	const sourceFile = join(vault.root, entry.sourcePath);
	const outcomes = [];
	const recovered = /* @__PURE__ */ new Map();
	for (const page of wanted) {
		let rendered;
		try {
			rendered = await (deps.renderPage ?? renderPdfPage)(info.renderer, sourceFile, page, signal);
		} catch (cause) {
			outcomes.push({
				page,
				status: "render-failed",
				chars: 0,
				message: cause instanceof Error ? cause.message : String(cause)
			});
			continue;
		}
		try {
			const answer = await readOnePage(llm, attachments, route, rendered.imagePath, signal);
			if (!answer.ok) {
				outcomes.push({
					page,
					status: "model-failed",
					chars: 0,
					message: answer.message
				});
				continue;
			}
			if (answer.text === "") {
				outcomes.push({
					page,
					status: "empty",
					chars: 0
				});
				continue;
			}
			recovered.set(page, blocksForPage(sourceId, entry.title, page, answer.text));
			outcomes.push({
				page,
				status: "ok",
				chars: answer.text.length
			});
		} finally {
			await rm(rendered.directory, {
				recursive: true,
				force: true
			});
		}
	}
	if (recovered.size === 0) return {
		...head,
		status: "ok",
		pages: outcomes,
		recovered: []
	};
	const merged = spliceRecoveredPages({
		...await currentExtraction(vault, entry) ?? await (async () => {
			return await (0, ingest_exports.parseSource)(await readFile(sourceFile), entry.originalName, sourceId);
		})(),
		degradation: entry.degradation
	}, recovered);
	const extractedAbsolute = join(vault.root, entry.extractedPath);
	const { markdown, structure } = (0, markdown_exports.emitSource)(merged, entry.extractedPath);
	const superseded = await (0, topic_vault_exports.readStructure)(vault, sourceId);
	await writeFile(extractedAbsolute, markdown, "utf8");
	await writeFile((0, topic_vault_exports.structurePathOf)(vault, sourceId), `${JSON.stringify(structure, void 0, 2)}\n`, "utf8");
	const pages = [.../* @__PURE__ */ new Set([...entry.reparsed?.pages ?? [], ...recovered.keys()])].sort((left, right) => left - right);
	await (0, topic_vault_exports.upsertManifestEntry)(vault, {
		...entry,
		degradation: merged.degradation,
		structurePath: (0, topic_vault_exports.vaultRelative)(vault, (0, topic_vault_exports.structurePathOf)(vault, sourceId)),
		reparsed: {
			pages,
			via: `${route.provider}/${route.model}`,
			at: now.toISOString()
		}
	});
	const memory = await reanchorVaultMemory(vault, superseded, structure);
	const cards = await reanchorConceptCards(vault, superseded, structure);
	return {
		...head,
		status: "ok",
		pages: outcomes,
		recovered: [...recovered.keys()].sort((left, right) => left - right),
		reanchored: {
			moved: memory.moved + cards.moved,
			stale: memory.stale + cards.stale,
			recovered: memory.recovered + cards.recovered
		}
	};
}
//#endregion
//#region lib/types/vault-rpc.js
/**
* The vault panel's host face: read-only queries over one topic vault.
*
* Every endpoint here is a thin wrapper over machinery that already exists —
* `readManifest`, `readAllStructures`, `readConceptCards`, the retrieval
* scorer. Nothing in this module calls a model, and nothing in it writes: the
* panel's S1 surface is a window onto the folder, so a bug here can lose a
* query result but never a learner's file.
*
* Containment is enforced the same way the model-facing tools enforce it —
* every path is resolved through {@link containedPath} — even though the caller
* is the app's own UI rather than the model. The panel passes a `cwd` that came
* from the session list, and a session's cwd is not something this module gets
* to trust blindly.
* @module @dsh-portable/interactive-learning/src/vault-rpc
*/
/** Wire protocol tag; bumped only on a breaking panel-payload change. */
const VAULT_RPC_PROTOCOL = "dsh-learning/vault@2";
/**
* Endpoints this router owns.
*
* `vault/*` reads the folder; `space/scope` and the existing concepts/notes
* endpoints are the explicit writes, each caused by a panel action.
*/
const VAULT_RPC_ENDPOINTS = [
	"vault/probe",
	"vault/summary",
	"vault/sources",
	"vault/read",
	"vault/search",
	"space/scope",
	"concepts/list",
	"concepts/review",
	"concepts/rate",
	"concepts/defer",
	"concepts/correct",
	"concepts/save",
	"concepts/file",
	"notes/list",
	"notes/read",
	"notes/save",
	"notes/promote",
	"notes/delete",
	"vault/roster",
	"material/route-info",
	"material/reparse-pages"
];
/** Longest body one `vault/read` returns; the panel drills down for more. */
const MAX_PANEL_READ_CHARS = 12e3;
/** Note kinds the panel may write; the closed set `saveNote` accepts. */
const NOTE_KINDS = ["note", "pending-concept"];
function isNoteKind(value) {
	return value !== void 0 && NOTE_KINDS.includes(value);
}
/** A note write answers with the note, or says which note was missing. */
function answerNote(note) {
	return note === void 0 ? {
		ok: true,
		value: {
			status: "unknown-note",
			protocol: VAULT_RPC_PROTOCOL
		}
	} : {
		ok: true,
		value: {
			status: "ok",
			protocol: VAULT_RPC_PROTOCOL,
			note
		}
	};
}
/** Ratings the review deck may send; the closed set `nextReviewSchedule` accepts. */
const CONCEPT_RATINGS = [
	"revealed",
	"review",
	"mastered"
];
function isRating(value) {
	return value !== void 0 && CONCEPT_RATINGS.includes(value);
}
/** A concept write answers with the card, or says which card was missing. */
function answerConcept(concept) {
	return concept === void 0 ? {
		ok: true,
		value: {
			status: "unknown-concept",
			protocol: VAULT_RPC_PROTOCOL
		}
	} : {
		ok: true,
		value: {
			status: "ok",
			protocol: VAULT_RPC_PROTOCOL,
			concept
		}
	};
}
function fail(code, message) {
	return {
		ok: false,
		error: {
			code,
			message,
			details: { issues: [] }
		}
	};
}
function record(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function text(value) {
	return typeof value === "string" && value.trim() !== "" ? value.trim() : void 0;
}
/**
* Pages a source's degradation entries name, as a flat set.
*
* `formula-dropped` carries no page, so a source can be degraded without any
* section being marked — which is correct: the panel still shows the chip.
*/
function degradedPages(degradation) {
	const pages = /* @__PURE__ */ new Set();
	for (const item of degradation) if (item.kind === "image-only-pages" || item.kind === "multi-column-guess") for (const page of item.pages) pages.add(page);
	return pages;
}
/**
* Whether a degraded page falls inside one section's page span.
*
* The span runs from this section's page up to (not including) the page of the
* next section that declares one. A source with no page numbers never marks a
* section, which is right: there is nothing to point at.
*/
function sectionSpanDegraded(sections, index, pages) {
	const from = sections[index]?.page;
	if (from === void 0 || pages.size === 0) return false;
	let until = Number.POSITIVE_INFINITY;
	for (let next = index + 1; next < sections.length; next += 1) {
		const page = sections[next]?.page;
		if (page !== void 0 && page > from) {
			until = page;
			break;
		}
	}
	for (const page of pages) if (page >= from && page < until) return true;
	return false;
}
function panelSections(structure) {
	const pages = degradedPages(structure.degradation);
	return structure.sections.map((section, index) => ({
		id: section.id,
		label: section.label,
		level: section.level,
		...section.page === void 0 ? {} : { page: section.page },
		charCount: section.charCount,
		degraded: sectionSpanDegraded(structure.sections, index, pages)
	}));
}
function lastPageOf(structure) {
	let last = 0;
	for (const section of structure.sections) if (section.page !== void 0 && section.page > last) last = section.page;
	for (const item of structure.degradation) {
		if (item.kind === "image-only-pages" || item.kind === "multi-column-guess") {
			for (const page of item.pages) if (page > last) last = page;
		}
		if (item.kind === "truncated" && item.afterPage > last) last = item.afterPage;
	}
	return last;
}
/** Body lines of one section, excluding descendants (the `[line, endLine)` span). */
function sectionBody(lines, section) {
	return lines.slice(section.line, Math.max(section.line, section.endLine - 1)).join("\n").replace(/^<!--\s*p\.\d+\s*-->$/gmu, "").trim();
}
async function extractedLines(vault, structure) {
	return (await readFile(await (0, topic_vault_exports.containedPath)(vault, structure.extractedPath), "utf8")).split("\n");
}
/**
* Vault stats for a set of candidate folders.
*
* The CLIENT supplies the folders, deduped from its own session list, rather
* than the Host enumerating workspaces. Every path therefore already came from
* a session the app is showing, and each one is still resolved through
* {@link resolveTopicVault} — so this endpoint opens no directory the panel's
* other reads could not already open. A folder that is not a vault is omitted
* rather than reported: the sidebar lists learning topics, and a roster full of
* "not a vault" rows would be a list of the person's unrelated code projects.
*/
async function vaultRoster(ctx, cwds) {
	const seen = /* @__PURE__ */ new Set();
	const vaults = [];
	for (const cwd of cwds.slice(0, 24)) {
		if (seen.has(cwd)) continue;
		seen.add(cwd);
		let vault;
		try {
			vault = await (0, topic_vault_exports.resolveTopicVault)(ctx, cwd);
		} catch {
			continue;
		}
		if (vault === void 0) continue;
		const [summary, notes] = await Promise.all([vaultSummary(vault), listNotes(vault)]);
		vaults.push({
			cwd,
			title: vault.title,
			root: vault.root,
			sources: summary.sources,
			concepts: summary.concepts,
			notes: notes.notes.length,
			due: summary.due,
			blocked: notes.blocked
		});
	}
	vaults.sort((left, right) => right.due - left.due || left.title.localeCompare(right.title));
	return {
		status: "ok",
		protocol: VAULT_RPC_PROTOCOL,
		vaults,
		due: vaults.reduce((total, vault) => total + vault.due, 0)
	};
}
/** Vault resolution shared by every endpoint; `undefined` means "not a vault". */
async function vaultAt(ctx, payload) {
	const cwd = text(record(payload)?.cwd);
	return cwd === void 0 ? void 0 : await (0, topic_vault_exports.resolveTopicVault)(ctx, cwd);
}
/** Counts for the panel header. */
async function vaultSummary(vault) {
	const [manifest, cards, notes] = await Promise.all([
		(0, topic_vault_exports.readManifest)(vault),
		readConceptCards(vault),
		listNotes(vault)
	]);
	return {
		status: manifest.sources.length === 0 && cards.length === 0 && notes.notes.length === 0 ? "empty" : "ok",
		protocol: VAULT_RPC_PROTOCOL,
		title: vault.title,
		root: vault.root,
		sources: manifest.sources.length,
		concepts: cards.length,
		notes: notes.notes.length,
		pendingNotes: notes.blocked,
		due: cards.filter((card) => isConceptDue(card.due)).length,
		degradedSources: manifest.sources.filter((entry) => entry.degradation.length > 0).length
	};
}
/**
* Every source with its structure tree.
*
* Manifest and structure are joined here rather than in the client: the
* manifest owns provenance (hash, parser, when) and the structure owns shape,
* and a panel row needs both. A manifest entry whose structure file is missing
* is still listed — with no sections — because hiding it would hide exactly the
* case a person needs to see.
*/
async function vaultSources(vault) {
	const [manifest, structures] = await Promise.all([(0, topic_vault_exports.readManifest)(vault), (0, topic_vault_exports.readAllStructures)(vault)]);
	const byId = new Map(structures.map((structure) => [structure.sourceId, structure]));
	const selectedSourceIds = await (0, topic_vault_exports.activeSourceIds)(vault);
	const selected = new Set(selectedSourceIds);
	const sources = manifest.sources.map((entry) => {
		const structure = byId.get(entry.sourceId);
		return {
			sourceId: entry.sourceId,
			title: entry.title,
			originalName: entry.originalName,
			parser: entry.parser,
			bytes: entry.bytes,
			ingestedAt: entry.ingestedAt,
			sourcePath: entry.sourcePath,
			extractedPath: entry.extractedPath,
			totalChars: structure?.totalChars ?? 0,
			sectionCount: structure?.sections.length ?? 0,
			lastPage: structure === void 0 ? 0 : lastPageOf(structure),
			degradation: entry.degradation,
			sections: structure === void 0 ? [] : panelSections(structure),
			active: selected.has(entry.sourceId)
		};
	});
	return {
		status: sources.length === 0 ? "empty" : "ok",
		protocol: VAULT_RPC_PROTOCOL,
		sources,
		activeSourceIds: manifest.activeSourceIds === void 0 || manifest.activeSourceIds === null ? null : selectedSourceIds
	};
}
/** Read or update the Space's explicit grounding scope. */
async function spaceScope(vault, requestedSourceIds) {
	const manifest = await (0, topic_vault_exports.readManifest)(vault);
	const sourceIds = manifest.sources.map((entry) => entry.sourceId);
	const selectedSourceIds = requestedSourceIds === void 0 ? await (0, topic_vault_exports.activeSourceIds)(vault) : requestedSourceIds === null ? sourceIds : [...new Set(requestedSourceIds)].filter((sourceId) => sourceIds.includes(sourceId));
	const active = requestedSourceIds === void 0 ? manifest.activeSourceIds === void 0 || manifest.activeSourceIds === null ? null : selectedSourceIds : requestedSourceIds === null || selectedSourceIds.length === sourceIds.length ? null : selectedSourceIds;
	if (requestedSourceIds !== void 0) await (0, topic_vault_exports.writeManifest)(vault, {
		...manifest,
		activeSourceIds: active
	});
	return {
		status: "ok",
		protocol: VAULT_RPC_PROTOCOL,
		activeSourceIds: active,
		selectedSourceIds: active === null ? sourceIds : selectedSourceIds,
		sourceIds
	};
}
/** One section's own body plus its immediate children. */
async function vaultRead(vault, sourceId, sectionId) {
	const structure = (await (0, topic_vault_exports.readAllStructures)(vault)).find((candidate) => candidate.sourceId === sourceId);
	if (structure === void 0) return {
		status: "unknown-source",
		protocol: VAULT_RPC_PROTOCOL
	};
	const index = structure.sections.findIndex((section) => section.id === sectionId);
	const section = structure.sections[index];
	if (section === void 0) return {
		status: "unknown-section",
		protocol: VAULT_RPC_PROTOCOL
	};
	const raw = sectionBody(await extractedLines(vault, structure), section);
	const pages = degradedPages(structure.degradation);
	const children = [];
	for (let next = index + 1; next < structure.sections.length; next += 1) {
		const candidate = structure.sections[next];
		if (candidate === void 0 || candidate.level <= section.level) break;
		if (candidate.level !== section.level + 1) continue;
		children.push({
			id: candidate.id,
			label: candidate.label,
			level: candidate.level,
			...candidate.page === void 0 ? {} : { page: candidate.page },
			charCount: candidate.charCount,
			degraded: sectionSpanDegraded(structure.sections, next, pages)
		});
	}
	return {
		status: "ok",
		protocol: VAULT_RPC_PROTOCOL,
		sourceId,
		sectionId,
		title: structure.title,
		label: section.label,
		headingPath: section.headingPath,
		...section.page === void 0 ? {} : { page: section.page },
		body: raw.slice(0, MAX_PANEL_READ_CHARS),
		truncated: raw.length > MAX_PANEL_READ_CHARS,
		children
	};
}
/**
* Free-text search over material, concept cards, and notes.
*
* Material ranking uses the same chunk/BM25 index as model retrieval, while
* concepts and notes retain their small literal matcher. No model call or
* network is involved.
*/
async function vaultSearch(vault, query) {
	const terms = keyPhrases(query);
	const empty = {
		status: "ok",
		protocol: VAULT_RPC_PROTOCOL,
		terms,
		material: [],
		concepts: [],
		notes: []
	};
	if (terms.length === 0) return empty;
	const material = [];
	const selectedSourceIds = await (0, topic_vault_exports.activeSourceIds)(vault);
	const structures = await (0, topic_vault_exports.readAllStructures)(vault);
	const bySource = new Map(structures.map((structure) => [structure.sourceId, structure]));
	const index = await (0, lexical_exports.ensureLexicalIndex)(vault);
	const chunksBySource = /* @__PURE__ */ new Map();
	for (const hit of (0, lexical_exports.searchLexicalIndex)(index, terms, {
		sourceIds: selectedSourceIds,
		limit: 20
	})) {
		const structure = bySource.get(hit.sourceId);
		if (structure === void 0) continue;
		let chunks = chunksBySource.get(hit.sourceId);
		if (chunks === void 0) {
			chunks = await (0, lexical_exports.readSourceChunks)(vault, hit.sourceId);
			chunksBySource.set(hit.sourceId, chunks);
		}
		const chunk = chunks.find((candidate) => candidate.chunkId === hit.chunkId);
		const section = structure.sections.find((candidate) => candidate.id === hit.sectionId);
		if (chunk === void 0 || section === void 0) continue;
		material.push({
			path: structure.extractedPath,
			title: structure.title,
			section: section.label,
			sourceId: structure.sourceId,
			sectionId: section.id,
			...section.page === void 0 ? {} : { page: section.page },
			excerpt: excerptAround(chunk.text, hit.matchedTerms, 220),
			matched: [...hit.matchedTerms],
			score: hit.score
		});
	}
	const concepts = [];
	for (const card of await readConceptCards(vault)) {
		const haystack = [
			card.label,
			card.explanation,
			...card.misconceptions,
			card.unverifiedTransfer
		].join("\n");
		const matched = matchedTerms(haystack, terms);
		if (matched.length === 0) continue;
		concepts.push({
			path: (0, topic_vault_exports.vaultRelative)(vault, card.path),
			title: card.label,
			excerpt: excerptAround(card.explanation === "" ? haystack : card.explanation, matched, 220),
			matched,
			score: matched.length
		});
	}
	const notes = [];
	for (const note of (await listNotes(vault)).notes) {
		const matched = matchedTerms(`${note.title}
${note.body}`, terms);
		if (matched.length === 0) continue;
		notes.push({
			path: note.path,
			title: note.title,
			excerpt: excerptAround(note.body, matched, 220),
			matched,
			score: matched.length
		});
	}
	const rank = (hits) => hits.sort((left, right) => right.score - left.score).slice(0, 20);
	return {
		...empty,
		activeSourceIds: selectedSourceIds,
		material: rank(material).map(({ score: _score, ...hit }) => hit),
		concepts: rank(concepts).map(({ score: _score, ...hit }) => hit),
		notes: rank(notes).map(({ score: _score, ...hit }) => hit)
	};
}
/** Whether an endpoint name belongs to this router. */
function isVaultEndpoint(endpoint) {
	return VAULT_RPC_ENDPOINTS.includes(endpoint);
}
/**
* Dispatch one panel query.
*
* Returns the Connection RPC envelope directly so the broker can forward it
* unchanged. A folder that is not a vault answers `{ status: 'no-vault' }` with
* `ok: true` — it is a legitimate answer to a legitimate question (the gate asks
* it on every session switch), not a transport failure.
* @param ctx - Host context, used only to resolve the workspace registry title.
* @param endpoint - One of {@link VAULT_RPC_ENDPOINTS}.
* @param payload - `{ cwd }` plus per-endpoint fields.
* @returns the RPC envelope.
*/
async function handleVaultEndpoint(ctx, endpoint, payload) {
	const fields = record(payload);
	if (fields === void 0) return fail("bad-request", "vault RPC requires an object payload");
	try {
		if (endpoint === "vault/roster") {
			const listed = Array.isArray(fields.cwds) ? fields.cwds.filter((value) => typeof value === "string" && value.trim() !== "") : [];
			const own = text(fields.cwd);
			return {
				ok: true,
				value: await vaultRoster(ctx, own === void 0 ? listed : [own, ...listed])
			};
		}
		if (text(fields.cwd) === void 0) return fail("bad-request", "vault RPC requires a non-empty cwd");
		const vault = await vaultAt(ctx, payload);
		if (endpoint === "vault/probe") return {
			ok: true,
			value: {
				protocol: VAULT_RPC_PROTOCOL,
				vault: vault !== void 0
			}
		};
		if (vault === void 0) return {
			ok: true,
			value: {
				status: "no-vault",
				protocol: VAULT_RPC_PROTOCOL
			}
		};
		switch (endpoint) {
			case "vault/summary": return {
				ok: true,
				value: await vaultSummary(vault)
			};
			case "vault/sources": return {
				ok: true,
				value: await vaultSources(vault)
			};
			case "vault/read": {
				const sourceId = text(fields.sourceId);
				const sectionId = text(fields.sectionId);
				if (sourceId === void 0 || sectionId === void 0) return fail("bad-request", "vault/read requires sourceId and sectionId");
				return {
					ok: true,
					value: await vaultRead(vault, sourceId, sectionId)
				};
			}
			case "vault/search": return {
				ok: true,
				value: await vaultSearch(vault, text(fields.query) ?? "")
			};
			case "space/scope":
				if (fields.sourceIds !== void 0 && fields.sourceIds !== null && !Array.isArray(fields.sourceIds)) return fail("bad-request", "space/scope sourceIds must be an array or null");
				return {
					ok: true,
					value: await spaceScope(vault, fields.sourceIds === null ? null : fields.sourceIds === void 0 ? void 0 : fields.sourceIds.filter((value) => typeof value === "string"))
				};
			case "concepts/list": return {
				ok: true,
				value: await listConcepts(vault)
			};
			case "concepts/review": return {
				ok: true,
				value: await reviewQueue(vault)
			};
			case "concepts/rate": {
				const slug = text(fields.conceptSlug);
				const rating = text(fields.rating);
				if (slug === void 0 || !isRating(rating)) return fail("bad-request", `concepts/rate requires conceptSlug and one of ${CONCEPT_RATINGS.join(", ")}`);
				return answerConcept(await rateConcept(vault, slug, rating));
			}
			case "concepts/defer": {
				const slug = text(fields.conceptSlug);
				const days = Number(fields.days);
				if (slug === void 0 || !Number.isFinite(days) || days < 1) return fail("bad-request", "concepts/defer requires conceptSlug and a positive day count");
				return answerConcept(await deferConcept(vault, slug, days));
			}
			case "concepts/correct": {
				const slug = text(fields.conceptSlug);
				if (slug === void 0) return fail("bad-request", "concepts/correct requires conceptSlug");
				return answerConcept(await correctConcept(vault, slug));
			}
			case "concepts/save": {
				const slug = text(fields.conceptSlug);
				const body = typeof fields.body === "string" ? fields.body : void 0;
				if (slug === void 0 || body === void 0) return fail("bad-request", "concepts/save requires conceptSlug and body");
				return answerConcept(await saveConceptBody(vault, slug, body));
			}
			case "concepts/file": {
				const slug = text(fields.conceptSlug);
				if (slug === void 0) return fail("bad-request", "concepts/file requires conceptSlug");
				const file = await readConceptFile(vault, slug);
				return file === void 0 ? {
					ok: true,
					value: {
						status: "unknown-concept",
						protocol: VAULT_RPC_PROTOCOL
					}
				} : {
					ok: true,
					value: {
						status: "ok",
						protocol: VAULT_RPC_PROTOCOL,
						...file
					}
				};
			}
			case "notes/list": return {
				ok: true,
				value: {
					protocol: VAULT_RPC_PROTOCOL,
					...await listNotes(vault)
				}
			};
			case "notes/read": {
				const slug = text(fields.noteSlug);
				if (slug === void 0) return fail("bad-request", "notes/read requires noteSlug");
				return answerNote(await readNote(vault, slug));
			}
			case "notes/save": {
				const body = typeof fields.body === "string" ? fields.body : void 0;
				if (body === void 0) return fail("bad-request", "notes/save requires body");
				let kind;
				const kindText = text(fields.kind);
				if (kindText !== void 0) {
					if (!isNoteKind(kindText)) return fail("bad-request", `notes/save kind must be one of ${NOTE_KINDS.join(", ")}`);
					kind = kindText;
				}
				const noteSlug = text(fields.noteSlug);
				const title = text(fields.title);
				const conceptSlug = text(fields.conceptSlug);
				const sessionId = text(fields.sessionId);
				const messageId = text(fields.messageId);
				return answerNote(await saveNote(vault, {
					...noteSlug === void 0 ? {} : { noteSlug },
					...title === void 0 ? {} : { title },
					...kind === void 0 ? {} : { kind },
					...conceptSlug === void 0 ? {} : { conceptSlug },
					...sessionId === void 0 ? {} : { sourceSessionId: sessionId },
					...messageId === void 0 ? {} : { sourceMessageId: messageId },
					body
				}));
			}
			case "notes/promote": {
				const slug = text(fields.noteSlug);
				if (slug === void 0) return fail("bad-request", "notes/promote requires noteSlug");
				const promotion = await promoteNote(vault, slug);
				return {
					ok: true,
					value: {
						protocol: VAULT_RPC_PROTOCOL,
						...promotion
					}
				};
			}
			case "material/route-info": {
				const sourceId = text(fields.sourceId);
				if (sourceId === void 0) return fail("bad-request", "material/route-info requires sourceId");
				const info = await materialRouteInfo(ctx, vault, sourceId, {
					cwd: text(fields.cwd),
					sessionId: text(fields.sessionId)
				});
				return {
					ok: true,
					value: {
						protocol: VAULT_RPC_PROTOCOL,
						...info
					}
				};
			}
			case "material/reparse-pages": {
				const sourceId = text(fields.sourceId);
				if (sourceId === void 0) return fail("bad-request", "material/reparse-pages requires sourceId");
				const result = await reparsePages(ctx, vault, sourceId, Array.isArray(fields.pages) ? fields.pages.filter((value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0).slice(0, 8) : void 0, void 0, void 0, {
					cwd: text(fields.cwd),
					sessionId: text(fields.sessionId)
				});
				return {
					ok: true,
					value: {
						protocol: VAULT_RPC_PROTOCOL,
						...result
					}
				};
			}
			case "notes/delete": {
				const slug = text(fields.noteSlug);
				if (slug === void 0) return fail("bad-request", "notes/delete requires noteSlug");
				return {
					ok: true,
					value: {
						protocol: VAULT_RPC_PROTOCOL,
						status: await deleteNote(vault, slug) ? "ok" : "unknown-note",
						noteSlug: slug
					}
				};
			}
		}
	} catch (cause) {
		if (cause instanceof topic_vault_exports.VaultContainmentError) return fail("forbidden", cause.message);
		return fail("internal", cause instanceof Error ? cause.message : String(cause));
	}
}
//#endregion
//#region lib/types/broker.js
registerInteractiveLearningSessionCompatibility();
const INTERACTIVE_LEARNING_PACKAGE = "@dsh-portable/interactive-learning";
var LearningWaitAbort = class extends Error {
	reason;
	constructor(reason) {
		super(reason);
		this.reason = reason;
		this.name = "LearningWaitAbort";
	}
};
function boundedIdentity(value, label) {
	if (typeof value !== "string" || value.length < 1 || value.length > 512 || value.trim() !== value || /[\u0000-\u001F\u007F]/.test(value)) throw new LearningProtocolError([`${label} must be a non-empty bounded identity`]);
	return value;
}
function trimOldest(values, limit = 1024) {
	if (values.size <= limit) return;
	const oldest = values.keys().next().value;
	if (oldest !== void 0) values.delete(oldest);
}
function pedagogicalStateFingerprint(state) {
	const { revision: _revision, appliedEventIds: _appliedEventIds, ...pedagogicalState } = state;
	return JSON.stringify(pedagogicalState);
}
function learnerObservationId(prefix, ...parts) {
	return `${prefix}:${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;
}
/**
* A stale state-tool call may still be safe to apply when it is one additive
* observation. Corrections, resets, and replacement-style route/list writes
* remain strict CAS operations because replaying them could overwrite newer
* learner state.
*/
function isSafeStaleLearnerStateUpdate(event) {
	switch (event.type) {
		case "prior_knowledge_observed": return event.level === void 0 && event.items !== void 0 && event.mode !== "replace";
		case "source_anchors_observed": return event.mode !== "replace";
		default: return false;
	}
}
function snapshotCheckpoint(value) {
	const parsed = parseLearningCheckpointV1(value);
	return {
		protocol: parsed.protocol,
		kind: parsed.kind,
		prompt: parsed.prompt,
		...parsed.context === void 0 ? {} : { context: parsed.context },
		expectedEvidence: parsed.expectedEvidence,
		...parsed.options === void 0 ? {} : { options: parsed.options.map((option) => ({
			id: option.id,
			label: option.label
		})) },
		fallbackMarkdown: parsed.fallbackMarkdown
	};
}
function normalizeCheckpointResult(result) {
	if (result.status === "skipped") return {
		protocol: result.protocol,
		checkpointId: result.checkpointId,
		status: "skipped",
		...result.reason === void 0 ? {} : { reason: result.reason },
		receiptId: result.receiptId
	};
	if (result.status === "cancelled") return {
		protocol: result.protocol,
		checkpointId: result.checkpointId,
		status: "cancelled",
		...result.reason === void 0 ? {} : { reason: result.reason },
		receiptId: result.receiptId
	};
	const response = "text" in result.response ? { text: result.response.text } : "optionId" in result.response ? { optionId: result.response.optionId } : { number: result.response.number };
	return {
		protocol: result.protocol,
		checkpointId: result.checkpointId,
		status: "submitted",
		response,
		receiptId: result.receiptId
	};
}
function checkpointFallbackResult(checkpointId, outcome) {
	return {
		protocol: CHECKPOINT_RESULT_PROTOCOL,
		checkpointId,
		...outcome,
		receiptId: randomUUID()
	};
}
function checkpointFallbackSubmission(checkpoint, checkpointId, custom) {
	let response;
	if (checkpoint.kind === "single_choice") {
		const byId = checkpoint.options?.find((candidate) => candidate.id === custom);
		const normalizeLabel = (value) => value.normalize("NFKC").replace(/\s+/gu, " ").trim().toLowerCase();
		const normalizedCustom = normalizeLabel(custom);
		const byLabel = checkpoint.options?.filter((candidate) => normalizeLabel(candidate.label) === normalizedCustom) ?? [];
		const option = byId ?? (byLabel.length === 1 ? byLabel[0] : void 0);
		if (option !== void 0) response = { optionId: option.id };
	} else if (checkpoint.kind === "numeric") {
		const number = Number(custom);
		if (Number.isFinite(number)) response = { number };
	} else response = { text: custom };
	if (response === void 0) return void 0;
	return normalizeCheckpointResult(parseLearningCheckpointResultV1({
		protocol: CHECKPOINT_RESULT_PROTOCOL,
		checkpointId,
		status: "submitted",
		response,
		receiptId: randomUUID()
	}, {
		checkpointId,
		checkpoint
	}));
}
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
/**
* Session events carry turn boundaries separately from `user/message`. Keep
* evidence tied to a turn that actually contained a direct human message;
* injected plugin context and assistant/tool messages never qualify.
*/
function realUserTurns(session) {
	const turns = /* @__PURE__ */ new Set();
	let openTurn;
	for (const event of session.events) {
		if (event.type === "turn/start") {
			const turn = event.data.turn;
			openTurn = Number.isSafeInteger(turn) && turn >= 0 ? turn : void 0;
			continue;
		}
		if (event.type === "user/message") {
			if (openTurn !== void 0 && event.data.source.kind === "user") turns.add(openTurn);
			continue;
		}
		if (event.type === "turn/end" && openTurn === event.data.turn) openTurn = void 0;
	}
	return turns;
}
function assertRealUserTurn(session, turn) {
	if (!Number.isSafeInteger(turn) || turn < 0) throw new TypeError("learner evidence requires a non-negative observation.turn");
	if (!realUserTurns(session).has(turn)) throw new TypeError(`observation.turn ${String(turn)} is not a real user turn in this session`);
	return turn;
}
function assertTurnNumber(turn) {
	if (!Number.isSafeInteger(turn) || turn < 0) throw new TypeError("learning segment anchor requires a non-negative turn");
	return turn;
}
function latestRealUserTurn(session) {
	const turns = realUserTurns(session);
	return turns.size === 0 ? void 0 : Math.max(...turns);
}
function emptyCheckpointAggregate() {
	return {
		usageCount: 0,
		kindCounts: Object.fromEntries(LEARNING_CHECKPOINT_METRIC_KINDS.map((kind) => [kind, 0])),
		terminalCounts: Object.fromEntries(LEARNING_CHECKPOINT_METRIC_STATUSES.map((status) => [status, 0])),
		draftRecovery: {
			attempts: 0,
			hits: 0
		}
	};
}
function cloneCheckpointAggregate(value) {
	return {
		usageCount: value.usageCount,
		kindCounts: { ...value.kindCounts },
		terminalCounts: { ...value.terminalCounts },
		draftRecovery: { ...value.draftRecovery }
	};
}
function latestCheckpointAggregate(session) {
	for (let index = session.events.length - 1; index >= 0; index -= 1) {
		const event = session.events[index];
		if (event?.type !== "learning/checkpoint-metrics" || !isRecord(event.data)) continue;
		const data = event.data;
		if (data.protocol !== "dsh-learning/checkpoint-metrics@1" || !isRecord(data.aggregate)) continue;
		const aggregate = data.aggregate;
		if (typeof aggregate.usageCount !== "number" || !isRecord(aggregate.kindCounts) || !isRecord(aggregate.terminalCounts) || !isRecord(aggregate.draftRecovery)) continue;
		return {
			usageCount: aggregate.usageCount,
			kindCounts: {
				...emptyCheckpointAggregate().kindCounts,
				...aggregate.kindCounts
			},
			terminalCounts: {
				...emptyCheckpointAggregate().terminalCounts,
				...aggregate.terminalCounts
			},
			draftRecovery: {
				attempts: Number(aggregate.draftRecovery.attempts ?? 0),
				hits: Number(aggregate.draftRecovery.hits ?? 0)
			}
		};
	}
	return emptyCheckpointAggregate();
}
/** Host-side V2 Question/Reveal coordinator; V1 is replay-only. */
var LearningActivityBroker = class extends Service {
	static inject = ["userQuestions"];
	pendingActivities = /* @__PURE__ */ new Map();
	checkpointCalls = /* @__PURE__ */ new Map();
	checkpointReceipts = /* @__PURE__ */ new Map();
	pendingCheckpointSessions = /* @__PURE__ */ new Map();
	pendingCheckpointWaits = /* @__PURE__ */ new Map();
	/** Current Host agent for the session-scoped Client recall bridge. */
	activeAgents = /* @__PURE__ */ new Map();
	learnerStates = /* @__PURE__ */ new Map();
	turnLocales = /* @__PURE__ */ new WeakMap();
	observers = /* @__PURE__ */ new Set();
	disposed = false;
	constructor(ctx) {
		super(ctx, "learningActivities");
		ctx.effect(() => () => {
			this.disposed = true;
			for (const [controller, state] of this.pendingActivities) {
				state.reason = "plugin-disposed";
				controller.abort(new LearningWaitAbort(state.reason));
			}
			this.pendingActivities.clear();
			this.checkpointCalls.clear();
			this.checkpointReceipts.clear();
			this.pendingCheckpointSessions.clear();
			this.pendingCheckpointWaits.clear();
			this.activeAgents.clear();
			this.learnerStates.clear();
			this.observers.clear();
		}, "interactive-learning: abort pending activities");
		ctx.on("agent/disposed", ({ agent }) => {
			this.abortPendingCheckpointSession(agent.session);
			this.dropLearnerState(agent.session);
		});
		ctx.on("session/disposed", (session) => {
			this.abortPendingCheckpointSession(session);
			this.dropLearnerState(session);
		});
		ctx.inject(["connection"], (connectionCtx) => {
			const connection = connectionCtx.get("connection");
			if (connection === void 0) return;
			connectionCtx.effect(() => connection.rpc.handle("/interactive-learning", async (endpoint, payload) => {
				if (isVaultEndpoint(endpoint)) return handleVaultEndpoint(this.ctx, endpoint, payload);
				if (endpoint !== "recall/feedback") return {
					ok: false,
					error: {
						code: "bad-request",
						message: "unknown interactive-learning RPC endpoint",
						details: { issues: [] }
					}
				};
				try {
					const feedback = parseLearningRecallFeedbackV1(payload);
					return {
						ok: true,
						value: this.recordRecallFeedback(feedback)
					};
				} catch (cause) {
					return {
						ok: false,
						error: {
							code: "bad-request",
							message: cause instanceof Error ? cause.message : String(cause),
							details: { issues: [] }
						}
					};
				}
			}, { authority: "trusted-host" }), "interactive-learning: recall feedback rpc");
		});
	}
	/** Diagnostics/test seam; no activity payloads or learner answers are exposed. */
	get pendingCount() {
		return this.pendingActivities.size;
	}
	/** Diagnostics/test seam; state content remains private to its session. */
	get learnerStateCacheSize() {
		return this.learnerStates.size;
	}
	/** Diagnostics/test seam; counts only, never checkpoint or learner content. */
	get checkpointCacheSize() {
		return this.checkpointCalls.size + this.checkpointReceipts.size + this.pendingCheckpointSessions.size + this.pendingCheckpointWaits.size;
	}
	/** Whether this composition can render Learning visuals and checkpoints. */
	get richClientAvailable() {
		return this.hasRichClient();
	}
	/**
	* Record the language of the turn being served, for Host-side tools that
	* write text a learner reads. Set from the claimed user message.
	* @param agent - The agent whose turn this is.
	* @param locale - The language that turn was written in.
	*/
	setTurnLocale(agent, locale) {
		this.turnLocales.set(agent, locale);
	}
	/** The language of the current turn, or undefined before one is claimed. */
	turnLocale(agent) {
		return this.turnLocales.get(agent);
	}
	/** Fold the latest durable full snapshot for this exact live session. */
	learnerState(agent) {
		const session = agent.session;
		const sessionId = String(session.id);
		const current = this.learnerStates.get(sessionId);
		if (current?.session === session && current.eventCount === session.events.length) return current.state;
		const state = foldLearnerStateSession(sessionId, session.events);
		this.learnerStates.set(sessionId, {
			session,
			eventCount: session.events.length,
			state
		});
		return state;
	}
	/** Render only the bounded, model-facing projection of the current state. */
	learnerStateTranscript(agent, maxTokens = 300) {
		return renderLearnerStateTranscript(this.learnerState(agent), { maxTokens });
	}
	/** Read the answer-free checkpoint aggregate for one session. */
	checkpointMetrics(agent) {
		return cloneCheckpointAggregate(latestCheckpointAggregate(agent.session));
	}
	/**
	* Host-side route hook. The caller writes the already-classified active or
	* closed boundary as a session-local, identity-free anchor, so refresh can
	* restore the route without relying on a model-written `goal`.
	*/
	recordLearningSegmentAnchor(agent, turn, segment = "active") {
		if (this.disposed) return;
		const session = agent.session;
		const resolvedTurn = turn === void 0 ? assertRealUserTurn(session, latestRealUserTurn(session)) : assertTurnNumber(turn);
		const prior = [...session.events].reverse().find((event) => event.type === LEARNING_SEGMENT_SESSION_EVENT_TYPE);
		if (prior?.type === "learning/segment" && prior.data.protocol === "dsh-learning/segment@1" && prior.data.segment === segment && prior.data.turn === resolvedTurn) return;
		session.append(LEARNING_SEGMENT_SESSION_EVENT_TYPE, {
			protocol: LEARNING_SEGMENT_EVENT_PROTOCOL,
			route: "learn",
			segment,
			turn: resolvedTurn
		}, { ignorable: true });
		const current = this.learnerStates.get(String(session.id));
		if (current?.session === session) current.eventCount = session.events.length;
	}
	/**
	* Whether the latest host route anchor still denotes an active learning
	* segment. An anchor survives a refresh, but it is retired once the learner
	* has moved more than one real user turn past it without another learn
	* anchor. The one-turn allowance covers the user message currently being
	* claimed by the loop; injected context never advances this sequence.
	*/
	learningSegmentActive(agent) {
		const state = this.learnerState(agent);
		if (state.phase === "complete" || state.nextMove === "complete") return false;
		const anchorEvent = [...agent.session.events].reverse().find((event) => event.type === LEARNING_SEGMENT_SESSION_EVENT_TYPE);
		if (anchorEvent === void 0 || !isRecord(anchorEvent.data)) return false;
		const anchor = anchorEvent.data;
		if (anchor.protocol !== "dsh-learning/segment@1" || anchor.route !== "learn" || anchor.segment !== "active" || !Number.isSafeInteger(anchor.turn) || anchor.turn < 0) return false;
		const turns = realUserTurns(agent.session);
		const anchorTurn = anchor.turn;
		if (!turns.has(anchorTurn)) return false;
		return [...turns].filter((turn) => turn > anchorTurn).length <= 1;
	}
	/** CAS mutation used exclusively by the internal, immediate state tool.
	* Exact replays and a small set of additive observations may rebase once;
	* replacement, correction, and reset operations remain strict CAS writes.
	*/
	updateLearnerState(request) {
		let current = this.learnerState(request.agent);
		if (request.action === "update" && request.event.type === "learner_evidence_observed") assertRealUserTurn(request.agent.session, request.event.observation.turn);
		if (request.action === "correct" && request.correction.evidence !== void 0) assertRealUserTurn(request.agent.session, request.observation.turn);
		if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) throw new TypeError("expectedRevision must be a non-negative safe integer");
		if (current.revision !== request.expectedRevision) {
			if (request.action === "update" && current.appliedEventIds.some((item) => item.id === request.event.observation.id)) {
				if (reduceLearnerState(current, request.event) === current) return {
					status: "updated",
					revision: current.revision
				};
			}
			if (request.action === "update" && isSafeStaleLearnerStateUpdate(request.event)) {
				const rebased = reduceLearnerState(current, request.event);
				if (pedagogicalStateFingerprint(rebased) === pedagogicalStateFingerprint(current)) throw new Error("learning_state_update requires a substantive observable state change");
				this.appendLearnerState(request.agent, rebased, "update");
				return {
					status: "updated",
					revision: rebased.revision
				};
			}
			throw new Error(`Learner state revision changed: expected ${request.expectedRevision}, current ${current.revision}`);
		}
		if (request.action === "reset") {
			this.abortPendingCheckpointSession(request.agent.session);
			const state = resetLearnerState(current);
			this.appendLearnerState(request.agent, state, "reset");
			return {
				status: "reset",
				revision: state.revision
			};
		}
		const state = reduceLearnerState(current, request.action === "correct" ? {
			type: "state_corrected",
			correction: request.correction,
			observation: request.observation
		} : request.event);
		if (state === current) return {
			status: request.action === "correct" ? "corrected" : "updated",
			revision: current.revision
		};
		if (pedagogicalStateFingerprint(state) === pedagogicalStateFingerprint(current)) throw new Error("learning_state_update requires a substantive observable state change");
		this.appendLearnerState(request.agent, state, request.action === "correct" ? "correction" : "update");
		return {
			status: request.action === "correct" ? "corrected" : "updated",
			revision: state.revision
		};
	}
	/** Subscribe to answer-free lifecycle metadata. */
	observe(listener) {
		this.observers.add(listener);
		return () => this.observers.delete(listener);
	}
	/** Answer-free ingress for stream/UI/kernel instrumentation outside this service. */
	reportLifecycle(event) {
		this.emit(event);
	}
	emit(event) {
		const observed = {
			...event,
			at: Date.now()
		};
		for (const listener of this.observers) try {
			listener(observed);
		} catch {}
	}
	/** Whether this Web composition advertises the matching Client bundle. */
	hasRichClient() {
		return this.ctx.get("clientModules")?.graph().entries.some((entry) => entry.id === INTERACTIVE_LEARNING_PACKAGE) === true;
	}
	dropLearnerState(session) {
		const sessionId = String(session.id);
		if (this.activeAgents.get(sessionId)?.session === session) this.activeAgents.delete(sessionId);
		if (this.learnerStates.get(sessionId)?.session === session) this.learnerStates.delete(sessionId);
		for (const [key, record] of this.checkpointCalls) if (record.session === session) this.checkpointCalls.delete(key);
		for (const [key, record] of this.checkpointReceipts) if (record.session === session) this.checkpointReceipts.delete(key);
		if (this.pendingCheckpointWaits.get(sessionId)?.session === session) {
			this.pendingCheckpointWaits.delete(sessionId);
			this.pendingCheckpointSessions.delete(sessionId);
		}
	}
	abortPendingCheckpointSession(session) {
		const sessionId = String(session.id);
		const pending = this.pendingCheckpointWaits.get(sessionId);
		if (pending === void 0 || pending.session !== session) return;
		const { controller } = pending;
		const state = this.pendingActivities.get(controller);
		if (state !== void 0) state.reason = "session-aborted";
		controller.abort(new LearningWaitAbort("session-aborted"));
		this.pendingCheckpointWaits.delete(sessionId);
		this.pendingCheckpointSessions.delete(sessionId);
		this.pendingActivities.delete(controller);
	}
	appendLearnerState(agent, state, reason) {
		const session = agent.session;
		session.append(LEARNER_STATE_SESSION_EVENT_TYPE, createLearnerStateSnapshotEvent(state, reason), { ignorable: true });
		this.learnerStates.set(String(session.id), {
			session,
			eventCount: session.events.length,
			state
		});
	}
	recordCheckpointMetrics(agent, kind, status, draftRecovered) {
		if (!LEARNING_CHECKPOINT_METRIC_KINDS.includes(kind) || !LEARNING_CHECKPOINT_METRIC_STATUSES.includes(status)) return;
		const aggregate = latestCheckpointAggregate(agent.session);
		aggregate.usageCount += 1;
		aggregate.kindCounts[kind] += 1;
		aggregate.terminalCounts[status] += 1;
		if (draftRecovered !== void 0) {
			aggregate.draftRecovery.attempts += 1;
			if (draftRecovered) aggregate.draftRecovery.hits += 1;
		}
		agent.session.append(LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE, {
			protocol: LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL,
			aggregate
		}, { ignorable: true });
		const current = this.learnerStates.get(String(agent.session.id));
		if (current?.session === agent.session) current.eventCount = agent.session.events.length;
	}
	recordAutomaticEvents(agent, events) {
		try {
			let state = this.learnerState(agent);
			for (const event of events) {
				if (event.type === "learner_evidence_observed") assertRealUserTurn(agent.session, event.observation.turn);
				state = reduceLearnerState(state, event);
			}
			if (state !== this.learnerState(agent)) this.appendLearnerState(agent, state, "update");
		} catch (cause) {
			this.ctx.logger.warn(`learning state observation was not recorded: ${String(cause)}`);
		}
	}
	/**
	* Record the concrete assistant move without adding another user wait.
	*
	* A composition with no Learning Client renders nothing, so the move never
	* happened: claiming it would both mislead the next teaching step and write
	* a false observation into the session's pedagogical state.
	*
	* @returns whether the learner can actually see this visual.
	*/
	recordVisual(agent, callId) {
		const stableCallId = boundedIdentity(callId, "callId");
		if (!this.hasRichClient()) return "unavailable";
		if (agent === void 0) return "ready";
		this.activeAgents.set(String(agent.session.id), {
			agent,
			session: agent.session
		});
		this.recordAutomaticEvents(agent, [{
			type: "assistant_move_observed",
			move: "visual",
			observation: {
				id: learnerObservationId("visual", String(agent.session.id), stableCallId),
				source: "assistant-output",
				summary: "The assistant rendered one non-blocking semantic visual."
			},
			moveFingerprint: `visual:${stableCallId}`
		}]);
		return "ready";
	}
	/**
	* Record an explicit RecallDeck self-rating as low-confidence, unknown
	* evidence. A self-rating is useful review intent, but it is not proof of
	* correctness, independence, or transfer mastery.
	*/
	recordRecallFeedback(feedback) {
		if (this.disposed) return {
			status: "ignored",
			reason: "session-unavailable"
		};
		let active = this.activeAgents.get(feedback.sessionId);
		if (active === void 0) {
			const recovered = this.ctx.get("agents")?.get(feedback.sessionId);
			if (recovered !== void 0) {
				active = {
					agent: recovered,
					session: recovered.session
				};
				this.activeAgents.set(feedback.sessionId, active);
			}
		}
		if (active === void 0 || String(active.session.id) !== feedback.sessionId) return {
			status: "ignored",
			reason: "session-unavailable"
		};
		const observationId = learnerObservationId("recall", feedback.sessionId, feedback.callId, feedback.cardId, feedback.status);
		const summary = feedback.status === "revealed" ? `Recall card ${feedback.cardId} answer was revealed; no correctness was established.` : `Recall card ${feedback.cardId} marked ${feedback.status}; self-rating is unverified.`;
		const turn = latestRealUserTurn(active.session);
		this.recordAutomaticEvents(active.agent, [{
			type: "learner_evidence_observed",
			evidence: {
				kind: "attempt",
				summary,
				confidence: "low",
				correctness: "unknown",
				independence: "unknown"
			},
			observation: {
				id: observationId,
				source: "learner-action",
				summary,
				...turn === void 0 ? {} : { turn }
			}
		}]);
		this.persistRecallReview(active.agent, feedback).catch((cause) => {
			this.ctx.logger.warn(`recall review schedule was not persisted: ${String(cause)}`);
		});
		return {
			status: "recorded",
			observationId
		};
	}
	async persistRecallReview(agent, feedback) {
		const vault = await (0, topic_vault_exports.resolveTopicVault)(this.ctx, agent.session.header.cwd);
		if (vault === void 0) return;
		const card = (await readConceptCards(vault)).find((candidate) => recallCardIdOf(candidate.conceptSlug) === feedback.cardId);
		if (card === void 0) return;
		const schedule = nextReviewSchedule(card, feedback.status);
		if (schedule === void 0) return;
		const updated = await updateConceptCardSchedule(vault, card.conceptSlug, schedule);
		if (updated === void 0) return;
		const record = (await readLearnerMemory(vault)).concepts.find((candidate) => candidate.conceptSlug === card.conceptSlug);
		if (record !== void 0) await upsertLearnerConcept(vault, {
			...record,
			due: updated.due,
			reviewIntervalDays: updated.intervalDays,
			lastReviewedAt: updated.lastReviewedAt
		});
	}
	recordCheckpointOutcome(request, result, fence) {
		const agent = request.agent;
		if (agent === void 0 || fence === void 0 || this.disposed) return;
		this.recordCheckpointMetrics(agent, request.checkpoint.kind, result.status, request.draftRecovered);
		try {
			if (this.ctx.get("agents")?.get(agent.id) !== agent || agent.session !== fence.session) return;
			if (this.learnerState(agent).revision !== fence.revision) return;
		} catch (cause) {
			this.ctx.logger.warn(`learning checkpoint state fence could not be verified: ${String(cause)}`);
			return;
		}
		const observationBase = learnerObservationId("checkpoint", String(agent.session.id), request.callId, result.status);
		const events = [];
		if (result.status === "submitted") events.push({
			type: "learner_evidence_observed",
			evidence: request.checkpoint.expectedEvidence === "transfer" ? {
				kind: "transfer",
				transferContext: "unknown",
				summary: "Submitted a transfer response to the optional checkpoint.",
				confidence: "low",
				correctness: "unknown",
				independence: "unknown"
			} : {
				kind: request.checkpoint.expectedEvidence,
				summary: `Submitted a ${request.checkpoint.expectedEvidence} response to the optional checkpoint.`,
				confidence: "low",
				correctness: "unknown",
				independence: "unknown"
			},
			observation: {
				id: `${observationBase}:evidence`,
				source: "learner-action",
				summary: `The learner submitted the requested ${request.checkpoint.expectedEvidence} response.`,
				turn: latestRealUserTurn(agent.session)
			}
		});
		const outcomeReason = result.status === "submitted" ? void 0 : result.reason;
		events.push({
			type: "assistant_move_observed",
			move: "checkpoint",
			observation: {
				id: `${observationBase}:move`,
				source: "assistant-output",
				summary: outcomeReason === void 0 ? `The optional checkpoint ended ${result.status}; continue in ordinary conversation.` : `The optional checkpoint ended ${result.status} (${outcomeReason}); continue in ordinary conversation.`
			},
			moveFingerprint: `checkpoint:${request.callId}:${result.status}:${outcomeReason ?? "legacy"}`
		});
		this.recordAutomaticEvents(agent, events);
	}
	/** Optional V4.1 path: one answer-free checkpoint, independent of V2 lessons. */
	async presentCheckpoint(request) {
		const checkpoint = snapshotCheckpoint(request.checkpoint);
		const sessionId = request.agent === void 0 ? "" : String(request.agent.session.id);
		const callId = boundedIdentity(request.callId, "callId");
		const callKey = sessionId === "" ? void 0 : JSON.stringify([sessionId, callId]);
		const fingerprint = JSON.stringify(checkpoint);
		let prior = callKey === void 0 ? void 0 : this.checkpointCalls.get(callKey);
		if (prior !== void 0 && prior.session !== request.agent?.session) {
			this.checkpointCalls.delete(callKey);
			prior = void 0;
		}
		if (prior !== void 0) {
			if (prior.fingerprint !== fingerprint) throw new LearningProtocolError(["checkpoint callId was replayed with different content"]);
			return prior.result;
		}
		const normalizedRequest = {
			...request,
			checkpoint,
			callId
		};
		const stateFence = request.agent === void 0 ? void 0 : {
			session: request.agent.session,
			revision: this.learnerState(request.agent).revision
		};
		const result = this.presentCheckpointOnce(normalizedRequest, sessionId, callKey).then((outcome) => {
			this.recordCheckpointOutcome(normalizedRequest, outcome, stateFence);
			return outcome;
		});
		if (callKey !== void 0) {
			this.checkpointCalls.set(callKey, {
				fingerprint,
				session: request.agent.session,
				result
			});
			trimOldest(this.checkpointCalls);
		}
		try {
			return await result;
		} catch (cause) {
			if (callKey !== void 0 && this.checkpointCalls.get(callKey)?.result === result) this.checkpointCalls.delete(callKey);
			throw cause;
		}
	}
	async presentCheckpointOnce(request, sessionId, callKey) {
		const checkpointId = randomUUID();
		const fallback = (outcome) => checkpointFallbackResult(checkpointId, outcome);
		if (!this.hasRichClient()) return fallback({
			status: "skipped",
			reason: "client-unavailable"
		});
		if (request.agent === void 0 || sessionId === "" || callKey === void 0) return fallback({
			status: "skipped",
			reason: "host-unavailable"
		});
		const timeoutMs = request.timeoutMs ?? 3e5;
		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return fallback({
			status: "skipped",
			reason: "host-unavailable"
		});
		const activeCall = this.pendingCheckpointSessions.get(sessionId);
		if (activeCall !== void 0 && activeCall !== callKey) throw new LearningProtocolError(["a session may have at most one pending learning checkpoint"]);
		this.pendingCheckpointSessions.set(sessionId, callKey);
		try {
			return await this.waitForCheckpoint({
				request,
				checkpointId,
				sessionId,
				timeoutMs
			});
		} finally {
			if (this.pendingCheckpointSessions.get(sessionId) === callKey) this.pendingCheckpointSessions.delete(sessionId);
		}
	}
	async waitForCheckpoint(input) {
		const { request, checkpointId, sessionId, timeoutMs } = input;
		const checkpoint = request.checkpoint;
		const waitId = randomUUID();
		const controller = new AbortController();
		const state = {};
		this.pendingActivities.set(controller, state);
		this.pendingCheckpointWaits.set(sessionId, {
			session: request.agent.session,
			controller
		});
		const abortFromSession = () => {
			state.reason = "session-aborted";
			controller.abort(new LearningWaitAbort(state.reason));
		};
		if (request.signal?.aborted === true) abortFromSession();
		else request.signal?.addEventListener("abort", abortFromSession, { once: true });
		const timer = setTimeout(() => {
			state.reason = "client-response-timeout";
			controller.abort(new LearningWaitAbort(state.reason));
		}, timeoutMs);
		timer.unref?.();
		const fallback = (outcome) => checkpointFallbackResult(checkpointId, outcome);
		try {
			const ask = this.ctx.userQuestions.ask({
				questions: [{
					id: learningCheckpointQuestionId(waitId),
					question: checkpoint.prompt,
					detail: encodeLearningCheckpointDetail({
						sessionId,
						callId: request.callId,
						waitId,
						checkpointId,
						checkpoint
					}),
					...checkpoint.kind === "single_choice" ? { options: checkpoint.options?.map((option) => ({ label: option.label })) } : {}
				}],
				agent: request.agent,
				signal: controller.signal
			});
			const aborted = new Promise((_resolve, reject) => {
				if (controller.signal.aborted) reject(controller.signal.reason);
				else controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
			});
			const custom = (await Promise.race([ask, aborted])).answers[0]?.custom?.trim();
			let result;
			if (custom !== void 0 && custom !== "") {
				let decoded;
				try {
					decoded = JSON.parse(custom);
				} catch {
					decoded = void 0;
				}
				const envelope = isRecord(decoded) ? decoded : void 0;
				const hasCheckpointEnvelope = envelope !== void 0 && Object.hasOwn(envelope, "checkpointResult");
				const wrappedResult = hasCheckpointEnvelope && isRecord(envelope?.checkpointResult) ? envelope.checkpointResult : decoded;
				if (envelope !== void 0 && isRecord(envelope.clientMeta) && typeof envelope.clientMeta.draftRecovered === "boolean") request.draftRecovered = envelope.clientMeta.draftRecovered;
				if (isRecord(wrappedResult) && wrappedResult.protocol === "dsh-learning/checkpoint-result@1") result = normalizeCheckpointResult(parseLearningCheckpointResultV1(wrappedResult, {
					checkpointId,
					checkpoint
				}));
				else result = (hasCheckpointEnvelope ? void 0 : checkpointFallbackSubmission(checkpoint, checkpointId, custom)) ?? fallback({
					status: "skipped",
					reason: "provider-failure"
				});
			} else result = fallback({
				status: "skipped",
				reason: "provider-failure"
			});
			return this.acceptCheckpointReceipt(request.agent.session, result);
		} catch (cause) {
			if (cause instanceof LearningProtocolError) throw cause;
			if (cause instanceof LearningWaitAbort) return cause.reason === "client-response-timeout" ? fallback({
				status: "skipped",
				reason: "client-response-timeout"
			}) : fallback({
				status: "cancelled",
				reason: cause.reason
			});
			const code = cause instanceof UserQuestionError ? cause.code : void 0;
			if (code === "ASK_CANCELLED") return fallback({
				status: "cancelled",
				reason: "learner-cancelled"
			});
			if (code === "ASK_ABORTED") {
				const reason = state.reason ?? "session-aborted";
				return reason === "client-response-timeout" ? fallback({
					status: "skipped",
					reason: "client-response-timeout"
				}) : fallback({
					status: "cancelled",
					reason
				});
			}
			if (code === "NO_PROVIDER" || code === "DELEGATED_CALLER" || code === "CALLER_NOT_LIVE") return fallback({
				status: "skipped",
				reason: "provider-failure"
			});
			this.ctx.logger.warn(`learning checkpoint provider failed; continuing ordinary conversation: ${String(cause)}`);
			return fallback({
				status: "skipped",
				reason: "provider-failure"
			});
		} finally {
			clearTimeout(timer);
			request.signal?.removeEventListener("abort", abortFromSession);
			this.pendingActivities.delete(controller);
			if (this.pendingCheckpointWaits.get(sessionId)?.controller === controller) this.pendingCheckpointWaits.delete(sessionId);
		}
	}
	acceptCheckpointReceipt(session, result) {
		const key = JSON.stringify([String(session.id), result.receiptId]);
		let prior = this.checkpointReceipts.get(key);
		if (prior !== void 0 && prior.session !== session) {
			this.checkpointReceipts.delete(key);
			prior = void 0;
		}
		if (prior !== void 0) {
			if (JSON.stringify(prior.result) !== JSON.stringify(result)) throw new LearningProtocolError(["checkpointResult.receiptId was reused for different content"]);
			return prior.result;
		}
		this.checkpointReceipts.set(key, {
			session,
			result
		});
		trimOldest(this.checkpointReceipts);
		return result;
	}
};
//#endregion
//#region lib/types/space/index.js
var space_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_space_index from "@dsh-portable/space-kernel/space/index";
__reExport(space_exports, import__dsh_portable_space_kernel_space_index);
//#endregion
//#region lib/types/ingest/provider.js
var provider_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_ingest_provider from "@dsh-portable/space-kernel/ingest/provider";
__reExport(provider_exports, import__dsh_portable_space_kernel_ingest_provider);
//#endregion
//#region lib/types/index/chunker.js
var chunker_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_search_chunker from "@dsh-portable/space-kernel/search/chunker";
__reExport(chunker_exports, import__dsh_portable_space_kernel_search_chunker);
//#endregion
//#region lib/types/index.js
/** Host entry: one non-model-facing Learning Activity broker service. */
registerInteractiveLearningSessionCompatibility();
//#endregion
var ANCHOR_PATH_SEPARATOR = material_anchor_exports.ANCHOR_PATH_SEPARATOR;
var DEFAULT_CHUNK_OVERLAP = chunker_exports.DEFAULT_CHUNK_OVERLAP;
var DEFAULT_CHUNK_TARGET_CHARS = chunker_exports.DEFAULT_CHUNK_TARGET_CHARS;
var LEXICAL_INDEX_PROTOCOL = lexical_exports.LEXICAL_INDEX_PROTOCOL;
var MAX_SOURCE_BYTES = pipeline_exports.MAX_SOURCE_BYTES;
var SOURCE_PROVIDERS = provider_exports.SOURCE_PROVIDERS;
var SOURCE_STRUCTURE_PROTOCOL = ingest_exports.SOURCE_STRUCTURE_PROTOCOL;
var SPACE_MANIFEST_PROTOCOL = ingest_exports.SPACE_MANIFEST_PROTOCOL;
var SPACE_MANIFEST_RELATIVE_PATH = space_exports.SPACE_MANIFEST_RELATIVE_PATH;
var SUPPORTED_EXTENSIONS = ingest_exports.SUPPORTED_EXTENSIONS;
var VAULT_DIRECTORIES = topic_vault_exports.VAULT_DIRECTORIES;
var VAULT_MANIFEST_PATH = topic_vault_exports.VAULT_MANIFEST_PATH;
var VAULT_MANIFEST_PROTOCOL = ingest_exports.VAULT_MANIFEST_PROTOCOL;
var VaultContainmentError = topic_vault_exports.VaultContainmentError;
var activeSourceIds = topic_vault_exports.activeSourceIds;
var anchorPage = material_anchor_exports.anchorPage;
var anchorTargetsOf = material_anchor_exports.anchorTargetsOf;
var buildLexicalIndex = lexical_exports.buildLexicalIndex;
var chunkSource = chunker_exports.chunkSource;
var chunksPathOf = topic_vault_exports.chunksPathOf;
var containedPath = topic_vault_exports.containedPath;
var deriveStructure = ingest_exports.deriveStructure;
var describeDegradation = pipeline_exports.describeDegradation;
var effectiveSourceIds = space_exports.effectiveSourceIds;
var emitSource = ingest_exports.emitSource;
var ensureLexicalIndex = lexical_exports.ensureLexicalIndex;
var ensureSpaceManifest = space_exports.ensureSpaceManifest;
var ensureVaultLayout = topic_vault_exports.ensureVaultLayout;
var extensionOf = ingest_exports.extensionOf;
var fileProvider = provider_exports.fileProvider;
var formatSectionAnchor = material_anchor_exports.formatSectionAnchor;
var ingestDirectory = pipeline_exports.ingestDirectory;
var ingestSource = pipeline_exports.ingestSource;
var isSupportedSource = pipeline_exports.isSupportedSource;
var isVaultRoot = topic_vault_exports.isVaultRoot;
var lexicalIndexPathOf = lexical_exports.lexicalIndexPathOf;
var mentionSupported = material_anchor_exports.mentionSupported;
var parseAnchorText = material_anchor_exports.parseAnchorText;
var parseSource = ingest_exports.parseSource;
var readAllStructures = topic_vault_exports.readAllStructures;
var readManifest = topic_vault_exports.readManifest;
var readSourceChunks = lexical_exports.readSourceChunks;
var readSpaceManifest = space_exports.readSpaceManifest;
var readStructure = topic_vault_exports.readStructure;
var reanchor = ingest_exports.reanchor;
var renderExtractedMarkdown = ingest_exports.renderExtractedMarkdown;
var resolveAnchorTarget = material_anchor_exports.resolveAnchorTarget;
var resolveTopicVault = topic_vault_exports.resolveTopicVault;
var sameStringList = material_anchor_exports.sameStringList;
var searchLexicalIndex = lexical_exports.searchLexicalIndex;
var sectionIdOf = ingest_exports.sectionIdOf;
var sectionMentions = material_anchor_exports.sectionMentions;
var slugify = ingest_exports.slugify;
var structurePathOf = topic_vault_exports.structurePathOf;
var titleOf = ingest_exports.titleOf;
var tokenize = lexical_exports.tokenize;
var updateLexicalIndex = lexical_exports.updateLexicalIndex;
var upsertManifestEntry = topic_vault_exports.upsertManifestEntry;
var vaultFromRoot = topic_vault_exports.vaultFromRoot;
var vaultRelative = topic_vault_exports.vaultRelative;
var writeManifest = topic_vault_exports.writeManifest;
var writeSourceChunks = lexical_exports.writeSourceChunks;
var writeSpaceManifest = space_exports.writeSpaceManifest;
export { ANCHOR_PATH_SEPARATOR, CONCEPT_TOOL_NAMES, DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_TARGET_CHARS, DEFAULT_RETRIEVAL_BUDGET_CHARS, DEFAULT_TRANSCRIPT_TOKEN_BUDGET, INITIAL_REVIEW_INTERVAL_DAYS, LEARNER_MEMORY_PROTOCOL, LEARNER_STATE_EVENT_PROTOCOL, LEARNER_STATE_PROTOCOL, LEARNER_STATE_SESSION_EVENT_TYPE, LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL, LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE, LEARNING_CHECKPOINT_METRIC_KINDS, LEARNING_CHECKPOINT_METRIC_STATUSES, LEARNING_CHINESE_TEMPLATES, LEARNING_CONCEPT_SAVE_POLICY, LEARNING_GRADED_POLICY, LEARNING_INTENT_ROUTING_GUIDANCE, LEARNING_MATERIAL_POLICY, LEARNING_REVIEW_POLICY, LEARNING_SEGMENT_EVENT_PROTOCOL, LEARNING_SEGMENT_SESSION_EVENT_TYPE, LEARNING_TEACHING_POLICY, LEARNING_TEACHING_POLICY_CORE, LEARNING_VISUAL_POLICY, LEARN_INTENT, LEARN_INTENT_MODEL_GUIDANCE, LEARN_INTENT_NATURAL_LANGUAGE_RULES, LEARN_INTENT_RULES, LEXICAL_INDEX_PROTOCOL, LearningActivityBroker, LearningActivityBroker as default, MATERIAL_TOOL_NAMES, MAX_CONCEPT_CARDS, MAX_FAILED_MOVES, MAX_MAP_SECTIONS, MAX_READ_CHARS, MAX_RENDERED_CONCEPTS, MAX_REVIEW_INTERVAL_DAYS, MAX_SEARCH_MATCHES, MAX_SOURCE_BYTES, MAX_STORED_CONCEPTS, RETRIEVAL_INTENTS, SOURCE_PROVIDERS, SOURCE_STRUCTURE_PROTOCOL, SPACE_MANIFEST_PROTOCOL, SPACE_MANIFEST_RELATIVE_PATH, SUPPORTED_EXTENSIONS, TeachingPlanner, VAULT_DIRECTORIES, VAULT_MANIFEST_PATH, VAULT_MANIFEST_PROTOCOL, VaultContainmentError, activeSourceIds, anchorPage, anchorTargetsOf, buildConceptStudyMap, buildLearningTeachingPolicy, buildLexicalIndex, chunkSource, chunksPathOf, classifyLearnIntent, conceptCardDraftFromState, conceptCardPathOf, conceptRecordFromCard, conceptRecordFromState, containedPath, createInitialLearnerState, createLearnerStateSnapshotEvent, deriveStructure, describeDegradation, describeReanchor, effectiveSourceIds, emitSource, ensureLexicalIndex, ensureSpaceManifest, ensureVaultLayout, executeRetrievalPlan, extensionOf, fileProvider, foldLearnerStateSession, formatSectionAnchor, formatStudyMapViolations, hasFreshIndependentTransfer, hydrateLearnerStateSnapshot, ingestDirectory, ingestSource, isConceptDue, isLearnIntent, isLearningBoundary, isSupportedSource, isVaultRoot, keyPhrases, lexicalIndexPathOf, memoryPathOf, mentionSupported, mentionedPaths, nextReviewSchedule, parseAnchorText, parseFileMentions, parseLearnerConceptRecord, parseLearnerStateSnapshotEvent, parseSource, planRetrieval, readAllStructures, readConceptCard, readConceptCards, readLearnerMemory, readLearnerMemoryWithCards, readManifest, readSourceChunks, readSpaceManifest, readStructure, reanchor, reanchorAnchorLists, reanchorConceptCards, reanchorVaultMemory, recallCardIdOf, reduceLearnerState, registerConceptTools, registerInteractiveLearningSessionCompatibility, registerLearningSessionEventType, registerMaterialTools, renderConceptCard, renderExtractedMarkdown, renderLearnerMemory, renderLearnerStateTranscript, resetLearnerState, resolveAnchorTarget, resolveTopicVault, retrieve, reviewIntervalDays, routeLearningRequest, routeLearningTurn, sameStringList, saveConceptCard, searchLexicalIndex, sectionAnchor, sectionIdOf, sectionMentions, serializeLearnerStateSnapshot, slugify, structurePathOf, syncMentionedMaterial, titleOf, tokenize, updateConceptCardAnchors, updateConceptCardSchedule, updateLexicalIndex, upsertLearnerConcept, upsertManifestEntry, validateStudyMapAgainstVault, vaultFromRoot, vaultRelative, writeLearnerMemory, writeManifest, writeSourceChunks, writeSpaceManifest };
