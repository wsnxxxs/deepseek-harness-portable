import { i as __reExport, r as __exportAll, t as material_anchor_exports } from "./material-anchor-ChboTkkx.js";
import { _ as reduceLearnerState, a as LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL, b as resetLearnerState, c as LEARNING_CHECKPOINT_METRIC_STATUSES, d as MAX_FAILED_MOVES, f as createInitialLearnerState, g as parseLearnerStateSnapshotEvent, h as hydrateLearnerStateSnapshot, i as LEARNER_STATE_SESSION_EVENT_TYPE, l as LEARNING_SEGMENT_EVENT_PROTOCOL, m as foldLearnerStateSession, n as LEARNER_STATE_EVENT_PROTOCOL, o as LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE, p as createLearnerStateSnapshotEvent, r as LEARNER_STATE_PROTOCOL, s as LEARNING_CHECKPOINT_METRIC_KINDS, t as DEFAULT_TRANSCRIPT_TOKEN_BUDGET, u as LEARNING_SEGMENT_SESSION_EVENT_TYPE, v as registerLearningSessionEventType, x as serializeLearnerStateSnapshot, y as renderLearnerStateTranscript } from "./learner-state-CA63fLIw.js";
import { t as registerInteractiveLearningSessionCompatibility } from "./bootstrap-D-0vNanD.js";
import { $ as recallCardIdOf, A as RETRIEVAL_INTENTS, B as MAX_CONCEPT_CARDS, C as mentionedPaths, Ct as isLearningBoundary, D as TeachingPlanner, F as reanchorAnchorLists, G as conceptRecordFromCard, H as buildConceptStudyMap, I as reanchorVaultMemory, J as nextReviewSchedule, K as hasFreshIndependentTransfer, L as pipeline_exports, M as keyPhrases, N as planRetrieval, O as retrieve, P as describeReanchor, Q as reanchorConceptCards, R as lexical_exports, S as sectionAnchor, St as isLearnIntent, T as syncMentionedMaterial, U as conceptCardDraftFromState, V as MAX_REVIEW_INTERVAL_DAYS, W as conceptCardPathOf, X as readConceptCards, Y as readConceptCard, Z as readLearnerMemoryWithCards, _ as MATERIAL_TOOL_NAMES, _t as LEARN_INTENT, a as LEARNING_REVIEW_POLICY, at as LEARNER_MEMORY_PROTOCOL, b as MAX_SEARCH_MATCHES, bt as LEARN_INTENT_RULES, c as LEARNING_VISUAL_POLICY, ct as conceptRecordFromState, d as routeLearningTurn, dt as readLearnerMemory, et as renderConceptCard, f as CONCEPT_TOOL_NAMES, ft as renderLearnerMemory, g as validateStudyMapAgainstVault, gt as LEARNING_INTENT_ROUTING_GUIDANCE, h as formatStudyMapViolations, ht as topic_vault_exports, i as LEARNING_MATERIAL_POLICY, it as updateConceptCardSchedule, j as executeRetrievalPlan, k as DEFAULT_RETRIEVAL_BUDGET_CHARS, l as buildLearningTeachingPolicy, lt as memoryPathOf, mt as writeLearnerMemory, n as LEARNING_CONCEPT_SAVE_POLICY, nt as saveConceptCard, o as LEARNING_TEACHING_POLICY, ot as MAX_RENDERED_CONCEPTS, p as registerConceptTools, pt as upsertLearnerConcept, q as isConceptDue, r as LEARNING_GRADED_POLICY, rt as updateConceptCardAnchors, s as LEARNING_TEACHING_POLICY_CORE, st as MAX_STORED_CONCEPTS, t as LEARNING_CHINESE_TEMPLATES, tt as reviewIntervalDays, u as routeLearningRequest, ut as parseLearnerConceptRecord, v as MAX_MAP_SECTIONS, vt as LEARN_INTENT_MODEL_GUIDANCE, w as parseFileMentions, x as registerMaterialTools, xt as classifyLearnIntent, y as MAX_READ_CHARS, yt as LEARN_INTENT_NATURAL_LANGUAGE_RULES, z as INITIAL_REVIEW_INTERVAL_DAYS } from "./teaching-policy-DfQIYCoR.js";
import { c as parseLearningCheckpointResultV1, h as CHECKPOINT_RESULT_PROTOCOL, l as parseLearningCheckpointV1, p as LearningProtocolError, t as CHECKPOINT_TRANSPORT_PROTOCOL, u as parseLearningRecallFeedbackV1 } from "./protocol-current-Cyp6-wYL.js";
import { createHash, randomUUID } from "node:crypto";
import { registerRpc } from "@dsh-portable/connection-rpc";
import { Service } from "@deepseek-ai/cordis";
import { UserQuestionError } from "@deepseek-ai/dsh-user-questions";
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
	for (const event of session.snapshotEvents()) {
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
	const events = session.snapshotEvents();
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const event = events[index];
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
		ctx.inject(["connection", "webServer"], (connectionCtx) => {
			connectionCtx.effect(() => registerRpc(connectionCtx, "interactive-learning", ["recall/feedback"], async (endpoint, payload) => {
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
			}), "interactive-learning: recall feedback rpc");
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
		if (current?.session === session && current.eventCount === session.snapshotEvents().length) return current.state;
		const state = foldLearnerStateSession(sessionId, session.snapshotEvents());
		this.learnerStates.set(sessionId, {
			session,
			eventCount: session.snapshotEvents().length,
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
		const prior = [...session.snapshotEvents()].reverse().find((event) => event.type === LEARNING_SEGMENT_SESSION_EVENT_TYPE);
		if (prior?.type === "learning/segment" && prior.data.protocol === "dsh-learning/segment@1" && prior.data.segment === segment && prior.data.turn === resolvedTurn) return;
		session.append(LEARNING_SEGMENT_SESSION_EVENT_TYPE, {
			protocol: LEARNING_SEGMENT_EVENT_PROTOCOL,
			route: "learn",
			segment,
			turn: resolvedTurn
		});
		const current = this.learnerStates.get(String(session.id));
		if (current?.session === session) current.eventCount = session.snapshotEvents().length;
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
		const anchorEvent = [...agent.session.snapshotEvents()].reverse().find((event) => event.type === LEARNING_SEGMENT_SESSION_EVENT_TYPE);
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
		session.append(LEARNER_STATE_SESSION_EVENT_TYPE, createLearnerStateSnapshotEvent(state, reason));
		this.learnerStates.set(String(session.id), {
			session,
			eventCount: session.snapshotEvents().length,
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
		});
		const current = this.learnerStates.get(String(agent.session.id));
		if (current?.session === agent.session) current.eventCount = agent.session.snapshotEvents().length;
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
//#region lib/types/ingest/index.js
var ingest_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_ingest_index from "@dsh-portable/space-kernel/ingest/index";
__reExport(ingest_exports, import__dsh_portable_space_kernel_ingest_index);
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
