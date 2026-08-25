import { f as RESPONSE_PROTOCOL_V2 } from "./protocol-current-nKmbv-Ul.js";
import { t as LearningProtocolError } from "./protocol-errors-Dbse7E4h.js";
import { i as learningWaitQuestionId, n as encodeLearningWaitDetail } from "./host-transport-B4sQooBx.js";
import { i as parseLearningResponseV2, n as parseLearningActivityV2 } from "./legacy-protocol-D0FKF_Kz.js";
import { randomUUID } from "node:crypto";
import { UserQuestionError } from "@deepseek-ai/dsh-user-questions";
//#region lib/types/legacy-gate.js
/**
* Compatibility-only Question/Reveal coordinator.
*
* V2 is retained for pending waits and replay of older Clients. Keeping its
* lesson state, receipt fence, call deduplication, and user-question wait in
* this module lets the ordinary Host entry load none of that machinery until
* a caller actually invokes presentQuestion/presentReveal/presentGate.
*/
var LegacyGateWaitAbort = class extends Error {
	reason;
	constructor(reason) {
		super(reason);
		this.reason = reason;
		this.name = "LegacyGateWaitAbort";
	}
};
function trimOldest(values, limit = 1024) {
	if (values.size <= limit) return;
	const oldest = values.keys().next().value;
	if (oldest !== void 0) values.delete(oldest);
}
/** Lazy compatibility coordinator for the retired V2 Question/Reveal path. */
var LegacyLearningGate = class {
	host;
	lessons = /* @__PURE__ */ new Map();
	receipts = /* @__PURE__ */ new Map();
	gateCalls = /* @__PURE__ */ new Map();
	pendingActivities = /* @__PURE__ */ new Map();
	disposed = false;
	constructor(host) {
		this.host = host;
	}
	get pendingCount() {
		return this.pendingActivities.size;
	}
	/** Abort waits and release all V2-only state when the owning Broker dies. */
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		for (const [controller, state] of this.pendingActivities) {
			state.reason = "plugin-disposed";
			controller.abort(new LegacyGateWaitAbort(state.reason));
		}
		this.pendingActivities.clear();
		this.lessons.clear();
		this.receipts.clear();
		this.gateCalls.clear();
	}
	async present(request) {
		const callKey = request.callId === void 0 || request.agent === void 0 ? void 0 : `${String(request.agent.session.id)}:${request.callId}`;
		const prior = callKey === void 0 ? void 0 : this.gateCalls.get(callKey);
		if (prior !== void 0) return prior;
		const pending = this.presentOnce(request);
		if (callKey !== void 0) {
			this.gateCalls.set(callKey, pending);
			trimOldest(this.gateCalls);
		}
		try {
			return await pending;
		} catch (cause) {
			if (callKey !== void 0) this.gateCalls.delete(callKey);
			throw cause;
		}
	}
	async presentOnce(request) {
		const activity = parseLearningActivityV2(request.activity);
		const activityId = randomUUID();
		const waitId = randomUUID();
		const sessionId = request.agent === void 0 ? "" : String(request.agent.session.id);
		let lessonToken;
		let roundToken;
		let lesson;
		if (activity.phase === "question") {
			if (activity.lessonToken === void 0) {
				if (activity.seq !== 0) throw new LearningProtocolError(["a new lesson must start with activity.seq 0"]);
				for (const [tokenValue, active] of this.lessons) if (active.sessionId === sessionId) this.lessons.delete(tokenValue);
				lessonToken = randomUUID();
				roundToken = randomUUID();
				if (sessionId !== "") {
					lesson = {
						sessionId,
						lessonToken,
						roundToken,
						seq: activity.seq,
						status: "question-pending"
					};
					this.lessons.set(lessonToken, lesson);
				}
			} else {
				lessonToken = activity.lessonToken;
				lesson = this.lessons.get(lessonToken);
				if (lesson === void 0) throw new LearningProtocolError(["activity.lessonToken is not active"]);
				if (lesson.sessionId !== sessionId) throw new LearningProtocolError(["activity.lessonToken belongs to another session"]);
				if (lesson.status !== "ready-question") throw new LearningProtocolError(["the previous reveal must resolve before the next question"]);
				if (activity.seq !== lesson.seq + 1) throw new LearningProtocolError(["activity.seq must advance by exactly one"]);
				roundToken = randomUUID();
				lesson.seq = activity.seq;
				lesson.roundToken = roundToken;
				lesson.status = "question-pending";
			}
		} else {
			lessonToken = activity.lessonToken;
			roundToken = activity.roundToken;
			lesson = this.lessons.get(lessonToken);
			if (lesson === void 0) throw new LearningProtocolError(["activity.lessonToken is not active"]);
			if (lesson.sessionId !== sessionId) throw new LearningProtocolError(["activity.lessonToken belongs to another session"]);
			if (lesson.status !== "awaiting-reveal") throw new LearningProtocolError(["reveal is not valid in the current lesson state"]);
			if (lesson.seq !== activity.seq) throw new LearningProtocolError(["activity.seq does not match the answered question"]);
			if (lesson.roundToken !== roundToken) throw new LearningProtocolError(["activity.roundToken does not match the answered question"]);
			lesson.status = "reveal-pending";
		}
		const eventBase = {
			phase: activity.phase,
			activityId,
			lessonToken,
			roundToken,
			seq: activity.seq,
			...request.callId === void 0 ? {} : { callId: request.callId }
		};
		if (activity.phase === "reveal" || activity.lessonToken !== void 0) this.host.emit({
			name: "learning.model.next_step_started",
			...eventBase
		});
		this.host.emit({
			name: "learning.call.args_completed",
			...eventBase
		});
		this.host.emit({
			name: "learning.protocol.validated",
			...eventBase
		});
		const fallback = (reason, action = "skip") => activity.phase === "question" ? {
			protocol: RESPONSE_PROTOCOL_V2,
			phase: "question",
			activityId,
			lessonToken,
			roundToken,
			seq: activity.seq,
			action,
			receiptId: randomUUID(),
			interactionState: {
				reason,
				fallbackMarkdown: activity.fallbackMarkdown
			}
		} : {
			protocol: RESPONSE_PROTOCOL_V2,
			phase: "reveal",
			activityId,
			lessonToken,
			roundToken,
			seq: activity.seq,
			action,
			animation: { completed: false },
			receiptId: randomUUID(),
			interactionState: {
				reason,
				fallbackMarkdown: activity.fallbackMarkdown
			}
		};
		let result;
		if (!this.host.hasRichClient()) result = fallback("client-capability-unavailable");
		else if (request.agent === void 0) result = fallback("agent-context-unavailable");
		else {
			const timeoutMs = request.timeoutMs ?? this.host.defaultTimeoutMs;
			if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) result = fallback("client-response-timeout");
			else try {
				result = await this.waitForResponse({
					request,
					activity,
					activityId,
					waitId,
					lessonToken,
					roundToken,
					eventBase,
					timeoutMs
				});
			} catch (cause) {
				this.lessons.delete(lessonToken);
				throw cause;
			}
		}
		if (lesson !== void 0) {
			if (result.action === "cancel" || result.action === "skip") this.lessons.delete(lessonToken);
			else if (activity.phase === "question") lesson.status = "awaiting-reveal";
			else lesson.status = "ready-question";
		}
		this.host.emit({
			name: "learning.wait.resolved",
			...eventBase
		});
		return result;
	}
	async waitForResponse(input) {
		const { request, activity, activityId, waitId, lessonToken, roundToken, eventBase, timeoutMs } = input;
		const controller = new AbortController();
		const state = {};
		this.pendingActivities.set(controller, state);
		const abortFromSession = () => {
			state.reason = "session-aborted";
			controller.abort(new LegacyGateWaitAbort(state.reason));
		};
		if (request.signal?.aborted === true) abortFromSession();
		else request.signal?.addEventListener("abort", abortFromSession, { once: true });
		const timer = setTimeout(() => {
			state.reason = "client-response-timeout";
			controller.abort(new LegacyGateWaitAbort(state.reason));
		}, timeoutMs);
		timer.unref?.();
		const fallback = (reason, action = "skip") => activity.phase === "question" ? {
			protocol: RESPONSE_PROTOCOL_V2,
			phase: "question",
			activityId,
			lessonToken,
			roundToken,
			seq: activity.seq,
			action,
			receiptId: randomUUID(),
			interactionState: {
				reason,
				fallbackMarkdown: activity.fallbackMarkdown
			}
		} : {
			protocol: RESPONSE_PROTOCOL_V2,
			phase: "reveal",
			activityId,
			lessonToken,
			roundToken,
			seq: activity.seq,
			action,
			animation: { completed: false },
			receiptId: randomUUID(),
			interactionState: {
				reason,
				fallbackMarkdown: activity.fallbackMarkdown
			}
		};
		try {
			const ask = this.host.ctx.userQuestions.ask({
				questions: [{
					id: learningWaitQuestionId(waitId),
					question: activity.phase === "question" ? activity.prompt : "Review this reveal, then continue.",
					detail: encodeLearningWaitDetail({
						waitId,
						activityId,
						lessonToken,
						roundToken,
						seq: activity.seq,
						phase: activity.phase,
						activity,
						...request.callId === void 0 ? {} : { callId: request.callId }
					})
				}],
				agent: request.agent,
				signal: controller.signal
			});
			this.host.emit({
				name: "learning.wait.registered",
				...eventBase
			});
			if (activity.phase === "reveal") this.host.emit({
				name: "learning.reveal.received",
				...eventBase
			});
			const aborted = new Promise((_resolve, reject) => {
				if (controller.signal.aborted) reject(controller.signal.reason);
				else controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
			});
			const custom = (await Promise.race([ask, aborted])).answers[0]?.custom?.trim();
			let response;
			if (custom === void 0 || custom === "") response = fallback("user-skipped");
			else {
				let decoded;
				try {
					decoded = JSON.parse(custom);
				} catch {
					decoded = void 0;
				}
				if (typeof decoded === "object" && decoded !== null && decoded.protocol === "dsh-learning/response@2") response = parseLearningResponseV2(decoded, {
					activityId,
					phase: activity.phase,
					lessonToken,
					roundToken,
					seq: activity.seq
				});
				else if (activity.phase === "question") response = {
					protocol: RESPONSE_PROTOCOL_V2,
					phase: "question",
					activityId,
					lessonToken,
					roundToken,
					seq: activity.seq,
					action: "submit",
					answer: { text: custom },
					receiptId: randomUUID(),
					interactionState: { renderer: "markdown-fallback" }
				};
				else response = fallback("rich-client-required");
			}
			const prior = this.receipts.get(response.receiptId);
			if (prior !== void 0) {
				if (JSON.stringify(prior) !== JSON.stringify(response)) throw new LearningProtocolError(["response.receiptId was reused for different content"]);
				response = prior;
			} else {
				this.receipts.set(response.receiptId, response);
				trimOldest(this.receipts);
			}
			if (activity.phase === "question" && response.action === "submit") this.host.emit({
				name: "learning.answer.accepted",
				...eventBase
			});
			else if (activity.phase === "reveal" && response.action === "continue") this.host.emit({
				name: "learning.continue.accepted",
				...eventBase
			});
			return response;
		} catch (cause) {
			if (cause instanceof LearningProtocolError) throw cause;
			if (cause instanceof LegacyGateWaitAbort) return fallback(cause.reason, cause.reason === "client-response-timeout" ? "skip" : "cancel");
			const code = cause instanceof UserQuestionError ? cause.code : void 0;
			if (code === "ASK_CANCELLED") return fallback("user-cancelled", "cancel");
			if (code === "ASK_ABORTED") {
				const reason = state.reason ?? "session-aborted";
				return fallback(reason, reason === "client-response-timeout" ? "skip" : "cancel");
			}
			if (code === "NO_PROVIDER" || code === "DELEGATED_CALLER" || code === "CALLER_NOT_LIVE") return fallback(code.toLowerCase());
			throw cause;
		} finally {
			clearTimeout(timer);
			request.signal?.removeEventListener("abort", abortFromSession);
			this.pendingActivities.delete(controller);
		}
	}
};
//#endregion
export { LegacyLearningGate };
