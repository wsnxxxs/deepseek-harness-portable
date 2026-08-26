import { S as serializeLearnerStateSnapshot, _ as parseLearnerStateSnapshotEvent, a as LEARNER_STATE_SESSION_EVENT_TYPE, b as renderLearnerStateTranscript, c as LEARNING_CHECKPOINT_METRIC_KINDS, d as LEARNING_SEGMENT_SESSION_EVENT_TYPE, f as MAX_FAILED_MOVES, g as hydrateLearnerStateSnapshot, h as foldLearnerStateSession, i as LEARNER_STATE_PROTOCOL, l as LEARNING_CHECKPOINT_METRIC_STATUSES, m as createLearnerStateSnapshotEvent, n as DEFAULT_TRANSCRIPT_TOKEN_BUDGET, o as LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL, p as createInitialLearnerState, r as LEARNER_STATE_EVENT_PROTOCOL, s as LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE, t as registerInteractiveLearningSessionCompatibility, u as LEARNING_SEGMENT_EVENT_PROTOCOL, v as reduceLearnerState, x as resetLearnerState, y as registerLearningSessionEventType } from "./bootstrap-BWi6OfwS.js";
import { $ as reviewIntervalDays, A as describeDegradation, At as writeManifest, B as buildConceptStudyMap, Bt as classifyLearnIntent, C as syncMentionedMaterial, Ct as readManifest, D as keyPhrases, Dt as upsertManifestEntry, E as executeRetrievalPlan, Et as structurePathOf, F as extensionOf, Ft as LEARNING_INTENT_POLICY, G as isConceptDue, H as conceptCardPathOf, Ht as isLearningBoundary, I as parseSource, It as LEARN_INTENT, J as readConceptCards, K as nextReviewSchedule, L as titleOf, Lt as LEARN_INTENT_MODEL_GUIDANCE, M as ingestSource, Mt as emitSource, N as isSupportedSource, Nt as reanchor, O as planRetrieval, Ot as vaultFromRoot, P as SUPPORTED_EXTENSIONS, Pt as renderExtractedMarkdown, Q as renderConceptCard, R as INITIAL_REVIEW_INTERVAL_DAYS, Rt as LEARN_INTENT_NATURAL_LANGUAGE_RULES, S as parseFileMentions, St as readAllStructures, T as RETRIEVAL_INTENTS, Tt as resolveTopicVault, U as conceptRecordFromCard, V as conceptCardDraftFromState, Vt as isLearnIntent, W as hasFreshIndependentTransfer, X as reanchorConceptCards, Y as readLearnerMemoryWithCards, Z as recallCardIdOf, _ as MAX_READ_CHARS, _t as VAULT_MANIFEST_PATH, a as LEARNING_TEACHING_POLICY, at as reanchorVaultMemory, b as sectionAnchor, bt as ensureVaultLayout, c as buildLearningTeachingPolicy, ct as MAX_STORED_CONCEPTS, d as CONCEPT_TOOL_NAMES, dt as parseLearnerConceptRecord, et as saveConceptCard, f as registerConceptTools, ft as readLearnerMemory, g as MAX_MAP_SECTIONS, gt as VAULT_DIRECTORIES, h as MATERIAL_TOOL_NAMES, ht as writeLearnerMemory, i as LEARNING_REVIEW_POLICY, it as reanchorAnchorLists, j as ingestDirectory, jt as deriveStructure, k as MAX_SOURCE_BYTES, kt as vaultRelative, l as routeLearningRequest, lt as conceptRecordFromState, m as validateStudyMapAgainstVault, mt as upsertLearnerConcept, n as LEARNING_GRADED_POLICY, nt as updateConceptCardSchedule, o as LEARNING_TEACHING_POLICY_CORE, ot as LEARNER_MEMORY_PROTOCOL, p as formatStudyMapViolations, pt as renderLearnerMemory, q as readConceptCard, r as LEARNING_MATERIAL_POLICY, rt as describeReanchor, s as LEARNING_VISUAL_POLICY, st as MAX_RENDERED_CONCEPTS, t as LEARNING_CHINESE_TEMPLATES, tt as updateConceptCardAnchors, u as routeLearningTurn, ut as memoryPathOf, v as MAX_SEARCH_MATCHES, vt as VaultContainmentError, w as DEFAULT_RETRIEVAL_BUDGET_CHARS, wt as readStructure, x as mentionedPaths, xt as isVaultRoot, y as registerMaterialTools, yt as containedPath, z as MAX_CONCEPT_CARDS, zt as LEARN_INTENT_RULES } from "./teaching-policy-BF6x7Sfr.js";
import { E as CHECKPOINT_RESULT_PROTOCOL, b as parseLearningRecallFeedbackV1, d as RESPONSE_PROTOCOL, v as parseLearningCheckpointResultV1, y as parseLearningCheckpointV1 } from "./protocol-current-CVgOF60h.js";
import { t as LearningProtocolError } from "./protocol-errors-Dbse7E4h.js";
import { r as learningCheckpointQuestionId, t as encodeLearningCheckpointDetail } from "./host-transport-DG7rmn_s.js";
import { _ as slugify, a as formatSectionAnchor, c as resolveAnchorTarget, d as SOURCE_STRUCTURE_PROTOCOL, f as VAULT_MANIFEST_PROTOCOL, g as sectionIdOf, l as sameStringList, n as anchorPage, o as mentionSupported, r as anchorTargetsOf, s as parseAnchorText, t as ANCHOR_PATH_SEPARATOR, u as sectionMentions } from "./material-anchor-GE7zenuO.js";
import { createHash, randomUUID } from "node:crypto";
import { Service } from "@deepseek-ai/cordis";
import { UserQuestionError } from "@deepseek-ai/dsh-user-questions";
//#region lib/types/broker.js
registerInteractiveLearningSessionCompatibility();
const INTERACTIVE_LEARNING_PACKAGE = "@dsh-portable/interactive-learning";
const DEFAULT_LEARNING_WAIT_TIMEOUT_MS = 3e5;
var LearningWaitAbort = class extends Error {
	reason;
	constructor(reason) {
		super(reason);
		this.reason = reason;
		this.name = "LearningWaitAbort";
	}
};
function fallback(activityId, activity, reason) {
	return {
		protocol: RESPONSE_PROTOCOL,
		activityId,
		action: "skip",
		interactionState: {
			reason,
			fallbackMarkdown: activity.fallbackMarkdown
		}
	};
}
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
	legacyGate;
	legacyGatePromise;
	checkpointCalls = /* @__PURE__ */ new Map();
	checkpointReceipts = /* @__PURE__ */ new Map();
	pendingCheckpointSessions = /* @__PURE__ */ new Map();
	pendingCheckpointWaits = /* @__PURE__ */ new Map();
	/** Current Host agent for the session-scoped Client recall bridge. */
	activeAgents = /* @__PURE__ */ new Map();
	learnerStates = /* @__PURE__ */ new Map();
	observers = /* @__PURE__ */ new Set();
	disposed = false;
	constructor(ctx) {
		super(ctx, "learningActivities");
		ctx.effect(() => () => {
			this.disposed = true;
			this.legacyGate?.dispose();
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
		return this.pendingActivities.size + (this.legacyGate?.pendingCount ?? 0);
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
		const event = request.action === "correct" ? {
			type: "state_corrected",
			correction: request.correction,
			observation: request.observation
		} : request.event;
		const state = reduceLearnerState(current, event);
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
	/** Load the retired Question/Reveal coordinator only when its API is used. */
	async getLegacyGate() {
		if (this.legacyGate !== void 0) return this.legacyGate;
		if (this.legacyGatePromise !== void 0) return this.legacyGatePromise;
		this.legacyGatePromise = import("./legacy-gate-YGZdx5qv.js").then(({ LegacyLearningGate }) => {
			const gate = new LegacyLearningGate({
				ctx: this.ctx,
				defaultTimeoutMs: DEFAULT_LEARNING_WAIT_TIMEOUT_MS,
				hasRichClient: () => this.hasRichClient(),
				emit: (event) => this.emit(event)
			});
			this.legacyGate = gate;
			if (this.disposed) gate.dispose();
			return gate;
		});
		return this.legacyGatePromise;
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
		if (feedback.status !== "revealed") this.persistRecallReview(active.agent, feedback).catch((cause) => {
			this.ctx.logger.warn(`recall review schedule was not persisted: ${String(cause)}`);
		});
		return {
			status: "recorded",
			observationId
		};
	}
	async persistRecallReview(agent, feedback) {
		const vault = await resolveTopicVault(this.ctx, agent.session.header.cwd);
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
	async presentQuestion(request) {
		return this.presentGate(request);
	}
	async presentReveal(request) {
		return this.presentGate(request);
	}
	/** V2 live path: one call owns exactly one durable Question or Reveal wait. */
	async presentGate(request) {
		return (await this.getLegacyGate()).present(request);
	}
	/** @deprecated V1 is accepted only for static legacy replay/fallback. */
	async present(request) {
		const { parseLearningActivity } = await import("./legacy-protocol-HNUHA_ju.js");
		const activity = parseLearningActivity(request.activity);
		return fallback(randomUUID(), activity, "legacy-replay-only");
	}
};
//#endregion
//#region lib/types/index.js
/** Host entry: one non-model-facing Learning Activity broker service. */
registerInteractiveLearningSessionCompatibility();
//#endregion
export { ANCHOR_PATH_SEPARATOR, CONCEPT_TOOL_NAMES, DEFAULT_RETRIEVAL_BUDGET_CHARS, DEFAULT_TRANSCRIPT_TOKEN_BUDGET, INITIAL_REVIEW_INTERVAL_DAYS, LEARNER_MEMORY_PROTOCOL, LEARNER_STATE_EVENT_PROTOCOL, LEARNER_STATE_PROTOCOL, LEARNER_STATE_SESSION_EVENT_TYPE, LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL, LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE, LEARNING_CHECKPOINT_METRIC_KINDS, LEARNING_CHECKPOINT_METRIC_STATUSES, LEARNING_CHINESE_TEMPLATES, LEARNING_GRADED_POLICY, LEARNING_INTENT_POLICY, LEARNING_MATERIAL_POLICY, LEARNING_REVIEW_POLICY, LEARNING_SEGMENT_EVENT_PROTOCOL, LEARNING_SEGMENT_SESSION_EVENT_TYPE, LEARNING_TEACHING_POLICY, LEARNING_TEACHING_POLICY_CORE, LEARNING_VISUAL_POLICY, LEARN_INTENT, LEARN_INTENT_MODEL_GUIDANCE, LEARN_INTENT_NATURAL_LANGUAGE_RULES, LEARN_INTENT_RULES, LearningActivityBroker, LearningActivityBroker as default, MATERIAL_TOOL_NAMES, MAX_CONCEPT_CARDS, MAX_FAILED_MOVES, MAX_MAP_SECTIONS, MAX_READ_CHARS, MAX_RENDERED_CONCEPTS, MAX_SEARCH_MATCHES, MAX_SOURCE_BYTES, MAX_STORED_CONCEPTS, RETRIEVAL_INTENTS, SOURCE_STRUCTURE_PROTOCOL, SUPPORTED_EXTENSIONS, VAULT_DIRECTORIES, VAULT_MANIFEST_PATH, VAULT_MANIFEST_PROTOCOL, VaultContainmentError, anchorPage, anchorTargetsOf, buildConceptStudyMap, buildLearningTeachingPolicy, classifyLearnIntent, conceptCardDraftFromState, conceptCardPathOf, conceptRecordFromCard, conceptRecordFromState, containedPath, createInitialLearnerState, createLearnerStateSnapshotEvent, deriveStructure, describeDegradation, describeReanchor, emitSource, ensureVaultLayout, executeRetrievalPlan, extensionOf, foldLearnerStateSession, formatSectionAnchor, formatStudyMapViolations, hasFreshIndependentTransfer, hydrateLearnerStateSnapshot, ingestDirectory, ingestSource, isConceptDue, isLearnIntent, isLearningBoundary, isSupportedSource, isVaultRoot, keyPhrases, memoryPathOf, mentionSupported, mentionedPaths, nextReviewSchedule, parseAnchorText, parseFileMentions, parseLearnerConceptRecord, parseLearnerStateSnapshotEvent, parseSource, planRetrieval, readAllStructures, readConceptCard, readConceptCards, readLearnerMemory, readLearnerMemoryWithCards, readManifest, readStructure, reanchor, reanchorAnchorLists, reanchorConceptCards, reanchorVaultMemory, recallCardIdOf, reduceLearnerState, registerConceptTools, registerInteractiveLearningSessionCompatibility, registerLearningSessionEventType, registerMaterialTools, renderConceptCard, renderExtractedMarkdown, renderLearnerMemory, renderLearnerStateTranscript, resetLearnerState, resolveAnchorTarget, resolveTopicVault, reviewIntervalDays, routeLearningRequest, routeLearningTurn, sameStringList, saveConceptCard, sectionAnchor, sectionIdOf, sectionMentions, serializeLearnerStateSnapshot, slugify, structurePathOf, syncMentionedMaterial, titleOf, updateConceptCardAnchors, updateConceptCardSchedule, upsertLearnerConcept, upsertManifestEntry, validateStudyMapAgainstVault, vaultFromRoot, vaultRelative, writeLearnerMemory, writeManifest };
