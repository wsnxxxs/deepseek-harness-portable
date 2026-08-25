import { m as TRANSPORT_PROTOCOL_V2, r as CHECKPOINT_TRANSPORT_PROTOCOL } from "./protocol-current-nKmbv-Ul.js";
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
const WAIT_MARKER_PREFIX = "<!--dsh-learning/wait@2:";
const WAIT_QUESTION_ID_PREFIX = "dsh-learning/wait@2:";
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
/** A V2 wait id contains one opaque reference and no teaching payload. */
function learningWaitQuestionId(waitId) {
	if (!opaqueToken(waitId)) throw new Error("waitId must be a URL-safe opaque token");
	return `${WAIT_QUESTION_ID_PREFIX}${waitId}`;
}
/** A checkpoint question id contains one opaque lookup token. */
function learningCheckpointQuestionId(waitId) {
	if (!opaqueToken(waitId)) throw new Error("waitId must be a URL-safe opaque token");
	return `${CHECKPOINT_WAIT_QUESTION_ID_PREFIX}${waitId}`;
}
/**
* Persist the current V2 phase projection. `presentGateOnce` has already
* parsed the activity, so this writer intentionally performs only the phase
* and token consistency checks needed for the envelope.
*/
function encodeLearningWaitDetail(input) {
	const envelope = {
		transport: TRANSPORT_PROTOCOL_V2,
		...input
	};
	const activity = envelope.activity;
	if (activity.phase !== envelope.phase || activity.seq !== envelope.seq) throw new Error("wait projection phase/seq mismatch");
	if (activity.phase === "reveal" && (activity.lessonToken !== envelope.lessonToken || activity.roundToken !== envelope.roundToken)) throw new Error("wait projection token mismatch");
	if (activity.phase === "question" && activity.lessonToken !== void 0 && activity.lessonToken !== envelope.lessonToken) throw new Error("wait projection token mismatch");
	return `${WAIT_MARKER_PREFIX}${encodeBase64Url(JSON.stringify(envelope))}${MARKER_SUFFIX}\n${activity.fallbackMarkdown}`;
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
export { learningWaitQuestionId as i, encodeLearningWaitDetail as n, learningCheckpointQuestionId as r, encodeLearningCheckpointDetail as t };
