import { t as LearningProtocolError } from "./protocol-errors-Dbse7E4h.js";
//#region lib/types/legacy-protocol.js
/**
* Compatibility-only V1/V2 validators.
*
* This module intentionally owns a small copy of the retired wire validators
* instead of re-exporting them from `protocol.ts`. The broker reaches it via
* `import()` only when replaying an old activity or handling the retired V2
* Question/Reveal gate; the current visual/checkpoint path remains on the
* eager protocol chunk.
*/
const ACTIVITY_PROTOCOL = "dsh-learning/activity@1";
const RESPONSE_PROTOCOL = "dsh-learning/response@1";
const ACTIVITY_PROTOCOL_V2 = "dsh-learning/activity@2";
const RESPONSE_PROTOCOL_V2 = "dsh-learning/response@2";
const MAX_ACTIVITY_BYTES = 65536;
const MAX_RESPONSE_BYTES = 32768;
const ACTIVITY_KINDS = [
	"parameter_explorer",
	"process_stepper",
	"structure_compare"
];
const MATH_BINARY = /* @__PURE__ */ new Set([
	"add",
	"sub",
	"mul",
	"div",
	"pow",
	"min",
	"max"
]);
const MATH_UNARY = /* @__PURE__ */ new Set([
	"abs",
	"neg",
	"exp",
	"log",
	"sqrt",
	"sigmoid",
	"tanh",
	"relu",
	"leaky_relu",
	"step",
	"normpdf"
]);
function record(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function onlyKeys(value, allowed, path, issues) {
	for (const key of Object.keys(value)) if (!allowed.includes(key)) issues.push(`${path}.${key} is not supported`);
}
function text(value, path, issues, max = 8e3) {
	if (typeof value !== "string" || value.trim() === "") {
		issues.push(`${path} must be a non-empty string`);
		return false;
	}
	if (value.length > max) issues.push(`${path} exceeds ${String(max)} characters`);
	return true;
}
function finite(value, path, issues) {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		issues.push(`${path} must be a finite number`);
		return false;
	}
	return true;
}
function integer(value, path, issues, min = 0) {
	if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
		issues.push(`${path} must be an integer >= ${String(min)}`);
		return false;
	}
	return true;
}
function token(value, path, issues) {
	if (typeof value !== "string" || value.length < 1 || value.length > 128 || !/^[A-Za-z0-9_-]+$/.test(value)) {
		issues.push(`${path} must be an opaque token of 1 to 128 URL-safe characters`);
		return false;
	}
	return true;
}
function id(value, path, issues) {
	if (typeof value !== "string" || !/^[a-z][a-z0-9_-]{0,31}$/.test(value)) {
		issues.push(`${path} must match ^[a-z][a-z0-9_-]{0,31}$`);
		return false;
	}
	return true;
}
function uniqueIds(values, path, issues) {
	const seen = /* @__PURE__ */ new Set();
	for (const [index, value] of values.entries()) {
		if (typeof value.id !== "string") continue;
		if (seen.has(value.id)) issues.push(`${path}[${String(index)}].id duplicates ${value.id}`);
		seen.add(value.id);
	}
}
function jsonBytes(value) {
	try {
		return new TextEncoder().encode(JSON.stringify(value)).byteLength;
	} catch {
		return;
	}
}
function validateJson(value, path, issues, depth = 0) {
	if (depth > 12) {
		issues.push(`${path} exceeds JSON depth 12`);
		return;
	}
	if (value === null || typeof value === "string" || typeof value === "boolean") return;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) issues.push(`${path} must contain finite numbers`);
		return;
	}
	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) validateJson(item, `${path}[${String(index)}]`, issues, depth + 1);
		return;
	}
	if (!record(value)) {
		issues.push(`${path} must be lossless JSON`);
		return;
	}
	for (const [key, item] of Object.entries(value)) validateJson(item, `${path}.${key}`, issues, depth + 1);
}
function validateMath(value, parameterIds, path, issues, depth = 1) {
	if (depth > 8) {
		issues.push(`${path} exceeds AST depth 8`);
		return;
	}
	if (!record(value) || typeof value.op !== "string") {
		issues.push(`${path} must be a mathematical AST node`);
		return;
	}
	if (value.op === "constant") {
		onlyKeys(value, ["op", "value"], path, issues);
		finite(value.value, `${path}.value`, issues);
		return;
	}
	if (value.op === "variable") {
		onlyKeys(value, ["op", "name"], path, issues);
		if (typeof value.name !== "string" || !parameterIds.has(value.name) && value.name !== "x") issues.push(`${path}.name must be x or a declared parameter id`);
		return;
	}
	if (MATH_BINARY.has(value.op)) {
		onlyKeys(value, [
			"op",
			"left",
			"right"
		], path, issues);
		validateMath(value.left, parameterIds, `${path}.left`, issues, depth + 1);
		validateMath(value.right, parameterIds, `${path}.right`, issues, depth + 1);
		return;
	}
	if (MATH_UNARY.has(value.op)) {
		onlyKeys(value, ["op", "value"], path, issues);
		validateMath(value.value, parameterIds, `${path}.value`, issues, depth + 1);
		return;
	}
	issues.push(`${path}.op is unknown`);
}
function validateV1Payload(kind, payload, issues) {
	if (!record(payload)) {
		issues.push("activity.payload must be an object");
		return;
	}
	if (kind === "parameter_explorer") {
		onlyKeys(payload, [
			"parameters",
			"xAxis",
			"curves",
			"question"
		], "activity.payload", issues);
		if (!Array.isArray(payload.parameters) || payload.parameters.length < 1 || payload.parameters.length > 2) issues.push("activity.payload.parameters must contain 1 or 2 parameters");
		const parameters = Array.isArray(payload.parameters) ? payload.parameters.filter(record) : [];
		uniqueIds(parameters, "activity.payload.parameters", issues);
		for (const [index, parameter] of parameters.entries()) {
			const path = `activity.payload.parameters[${String(index)}]`;
			id(parameter.id, `${path}.id`, issues);
			text(parameter.label, `${path}.label`, issues, 120);
			finite(parameter.min, `${path}.min`, issues);
			finite(parameter.max, `${path}.max`, issues);
			finite(parameter.step, `${path}.step`, issues);
			finite(parameter.initial, `${path}.initial`, issues);
		}
		if (!record(payload.xAxis)) issues.push("activity.payload.xAxis must be an object");
		else {
			finite(payload.xAxis.min, "activity.payload.xAxis.min", issues);
			finite(payload.xAxis.max, "activity.payload.xAxis.max", issues);
		}
		const parameterIds = new Set(parameters.map((item) => typeof item.id === "string" ? item.id : ""));
		if (!Array.isArray(payload.curves) || payload.curves.length < 1 || payload.curves.length > 3) issues.push("activity.payload.curves must contain 1 to 3 curves");
		else {
			const curves = payload.curves.filter(record);
			uniqueIds(curves, "activity.payload.curves", issues);
			for (const [index, curve] of curves.entries()) {
				const path = `activity.payload.curves[${String(index)}]`;
				id(curve.id, `${path}.id`, issues);
				text(curve.label, `${path}.label`, issues, 120);
				validateMath(curve.expression, parameterIds, `${path}.expression`, issues);
			}
		}
	} else if (kind === "process_stepper") {
		onlyKeys(payload, ["steps", "question"], "activity.payload", issues);
		if (!Array.isArray(payload.steps) || payload.steps.length < 2 || payload.steps.length > 12) issues.push("activity.payload.steps must contain 2 to 12 steps");
		else {
			const steps = payload.steps.filter(record);
			uniqueIds(steps, "activity.payload.steps", issues);
			for (const [index, step] of steps.entries()) {
				const path = `activity.payload.steps[${String(index)}]`;
				id(step.id, `${path}.id`, issues);
				text(step.title, `${path}.title`, issues, 200);
				text(step.content, `${path}.content`, issues, 4e3);
			}
		}
	} else if (kind === "structure_compare") {
		onlyKeys(payload, [
			"left",
			"right",
			"alignments",
			"question"
		], "activity.payload", issues);
		for (const side of ["left", "right"]) {
			const value = payload[side];
			if (!record(value)) {
				issues.push(`activity.payload.${side} must be an object`);
				continue;
			}
			text(value.title, `activity.payload.${side}.title`, issues, 200);
			if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 20) issues.push(`activity.payload.${side}.items must contain 1 to 20 items`);
			else {
				const items = value.items.filter(record);
				uniqueIds(items, `activity.payload.${side}.items`, issues);
				for (const [index, item] of items.entries()) {
					id(item.id, `activity.payload.${side}.items[${String(index)}].id`, issues);
					text(item.label, `activity.payload.${side}.items[${String(index)}].label`, issues, 500);
				}
			}
		}
		if (!Array.isArray(payload.alignments) || payload.alignments.length < 1 || payload.alignments.length > 24) issues.push("activity.payload.alignments must contain 1 to 24 rows");
	}
}
/** Validate a retired V1 activity used only by replay/fallback. */
function parseLearningActivity(value) {
	const issues = [];
	const bytes = jsonBytes(value);
	if (bytes === void 0) issues.push("activity must be serializable JSON");
	else if (bytes > MAX_ACTIVITY_BYTES) issues.push(`activity exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
	if (!record(value)) throw new LearningProtocolError([...issues, "activity must be an object"]);
	onlyKeys(value, [
		"protocol",
		"kind",
		"title",
		"objective",
		"prompt",
		"scaffold",
		"payload",
		"fallbackMarkdown"
	], "activity", issues);
	if (value.protocol !== ACTIVITY_PROTOCOL) issues.push(`activity.protocol must be ${ACTIVITY_PROTOCOL}`);
	if (!ACTIVITY_KINDS.includes(value.kind)) issues.push("activity.kind is unknown");
	text(value.title, "activity.title", issues, 200);
	text(value.objective, "activity.objective", issues, 1e3);
	text(value.prompt, "activity.prompt", issues, 2e3);
	if (value.scaffold !== void 0) text(value.scaffold, "activity.scaffold", issues, 4e3);
	text(value.fallbackMarkdown, "activity.fallbackMarkdown", issues, 16e3);
	validateV1Payload(value.kind, value.payload, issues);
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
/** Validate a retired V1 Client response. */
function parseLearningResponse(value, expectedActivityId) {
	const issues = [];
	const bytes = jsonBytes(value);
	if (bytes === void 0) issues.push("response must be serializable JSON");
	else if (bytes > MAX_RESPONSE_BYTES) issues.push(`response exceeds ${String(MAX_RESPONSE_BYTES)} bytes`);
	if (!record(value)) throw new LearningProtocolError([...issues, "response must be an object"]);
	onlyKeys(value, [
		"protocol",
		"activityId",
		"action",
		"answer",
		"interactionState"
	], "response", issues);
	if (value.protocol !== RESPONSE_PROTOCOL) issues.push(`response.protocol must be ${RESPONSE_PROTOCOL}`);
	if (typeof value.activityId !== "string" || value.activityId === "") issues.push("response.activityId must be a non-empty string");
	if (expectedActivityId !== void 0 && value.activityId !== expectedActivityId) issues.push("response.activityId does not match the pending activity");
	if (value.action !== "submit" && value.action !== "skip" && value.action !== "cancel") issues.push("response.action is unknown");
	if (value.answer !== void 0) validateJson(value.answer, "response.answer", issues);
	if (value.interactionState !== void 0) validateJson(value.interactionState, "response.interactionState", issues);
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
function validateFocus(value, issues) {
	if (!record(value)) {
		issues.push("activity.focus must be an object");
		return;
	}
	onlyKeys(value, ["title", "progress"], "activity.focus", issues);
	text(value.title, "activity.focus.title", issues, 200);
	if (value.progress !== void 0) {
		if (!record(value.progress)) issues.push("activity.focus.progress must be an object");
		else {
			integer(value.progress.current, "activity.focus.progress.current", issues, 1);
			if (value.progress.total !== void 0) integer(value.progress.total, "activity.focus.progress.total", issues, 1);
		}
	}
}
function validateInput(value, issues) {
	if (!record(value)) {
		issues.push("activity.input must be an object");
		return;
	}
	if (value.kind === "single_choice") {
		onlyKeys(value, ["kind", "options"], "activity.input", issues);
		if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 8) {
			issues.push("activity.input.options must contain 2 to 8 options");
			return;
		}
		const options = value.options.filter(record);
		uniqueIds(options, "activity.input.options", issues);
		for (const [index, option] of options.entries()) {
			id(option.id, `activity.input.options[${String(index)}].id`, issues);
			text(option.label, `activity.input.options[${String(index)}].label`, issues, 500);
		}
	} else if (value.kind === "short_text") {
		onlyKeys(value, [
			"kind",
			"placeholder",
			"maxLength"
		], "activity.input", issues);
		if (value.placeholder !== void 0) text(value.placeholder, "activity.input.placeholder", issues, 500);
		if (value.maxLength !== void 0) integer(value.maxLength, "activity.input.maxLength", issues, 1);
	} else if (value.kind === "number") {
		onlyKeys(value, [
			"kind",
			"min",
			"max",
			"step"
		], "activity.input", issues);
		finite(value.min, "activity.input.min", issues);
		finite(value.max, "activity.input.max", issues);
		finite(value.step, "activity.input.step", issues);
	} else issues.push("activity.input.kind is unknown");
}
function validateFrame(value, path, issues) {
	if (!record(value)) {
		issues.push(`${path} must be an object`);
		return;
	}
	onlyKeys(value, [
		"id",
		"title",
		"content"
	], path, issues);
	id(value.id, `${path}.id`, issues);
	text(value.title, `${path}.title`, issues, 200);
	if (value.content !== void 0) text(value.content, `${path}.content`, issues, 4e3);
}
function validateVisual(value, phase, issues) {
	const path = "activity.visual";
	if (!record(value)) {
		issues.push(`${path} must be an object`);
		return;
	}
	if (value.kind === "process") {
		if (phase === "question") {
			onlyKeys(value, ["kind", "frame"], path, issues);
			validateFrame(value.frame, `${path}.frame`, issues);
		} else {
			onlyKeys(value, [
				"kind",
				"before",
				"after"
			], path, issues);
			validateFrame(value.before, `${path}.before`, issues);
			validateFrame(value.after, `${path}.after`, issues);
		}
	} else if (value.kind === "parameter" || value.kind === "structure") {
		const required = value.kind === "parameter" ? [
			"parameters",
			"xAxis",
			"curves"
		] : [
			"left",
			"right",
			"alignments"
		];
		for (const key of required) if (!(key in value)) issues.push(`${path}.${key} is required`);
	} else issues.push(`${path}.kind is unknown`);
}
/** Validate a retired Question or Reveal activity. */
function parseLearningActivityV2(value) {
	const issues = [];
	const bytes = jsonBytes(value);
	if (bytes === void 0) issues.push("activity must be serializable JSON");
	else if (bytes > MAX_ACTIVITY_BYTES) issues.push(`activity exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
	if (!record(value)) throw new LearningProtocolError([...issues, "activity must be an object"]);
	if (value.protocol !== ACTIVITY_PROTOCOL_V2) issues.push(`activity.protocol must be ${ACTIVITY_PROTOCOL_V2}`);
	if (value.phase === "question") {
		onlyKeys(value, [
			"protocol",
			"phase",
			"lessonToken",
			"seq",
			"focus",
			"prompt",
			"scaffold",
			"input",
			"visual",
			"fallbackMarkdown"
		], "activity", issues);
		if (value.lessonToken !== void 0) token(value.lessonToken, "activity.lessonToken", issues);
		integer(value.seq, "activity.seq", issues);
		validateFocus(value.focus, issues);
		text(value.prompt, "activity.prompt", issues, 2e3);
		if (value.scaffold !== void 0) text(value.scaffold, "activity.scaffold", issues, 4e3);
		validateInput(value.input, issues);
		if (value.visual !== void 0) validateVisual(value.visual, "question", issues);
		text(value.fallbackMarkdown, "activity.fallbackMarkdown", issues, 16e3);
	} else if (value.phase === "reveal") {
		onlyKeys(value, [
			"protocol",
			"phase",
			"lessonToken",
			"roundToken",
			"seq",
			"focus",
			"feedback",
			"visual",
			"animation",
			"advance",
			"fallbackMarkdown"
		], "activity", issues);
		token(value.lessonToken, "activity.lessonToken", issues);
		token(value.roundToken, "activity.roundToken", issues);
		integer(value.seq, "activity.seq", issues);
		validateFocus(value.focus, issues);
		if (!record(value.feedback)) issues.push("activity.feedback must be an object");
		else {
			onlyKeys(value.feedback, [
				"verdict",
				"learnerEcho",
				"explanation",
				"answer"
			], "activity.feedback", issues);
			if (value.feedback.verdict !== void 0 && ![
				"correct",
				"partial",
				"misconception",
				"neutral"
			].includes(value.feedback.verdict)) issues.push("activity.feedback.verdict is unknown");
			if (value.feedback.learnerEcho !== void 0) text(value.feedback.learnerEcho, "activity.feedback.learnerEcho", issues, 2e3);
			text(value.feedback.explanation, "activity.feedback.explanation", issues, 8e3);
			if (value.feedback.answer !== void 0) text(value.feedback.answer, "activity.feedback.answer", issues, 4e3);
		}
		if (value.visual !== void 0) validateVisual(value.visual, "reveal", issues);
		if (!record(value.animation)) issues.push("activity.animation must be an object");
		else {
			onlyKeys(value.animation, [
				"kind",
				"preferredDurationMs",
				"reducedMotion"
			], "activity.animation", issues);
			if (![
				"draw",
				"morph",
				"highlight",
				"step_complete"
			].includes(value.animation.kind)) issues.push("activity.animation.kind is unknown");
			if (value.animation.preferredDurationMs !== void 0) integer(value.animation.preferredDurationMs, "activity.animation.preferredDurationMs", issues);
			if (value.animation.reducedMotion !== "commit-final-state") issues.push("activity.animation.reducedMotion must be commit-final-state");
		}
		if (!record(value.advance)) issues.push("activity.advance must be an object");
		else {
			onlyKeys(value.advance, ["mode", "label"], "activity.advance", issues);
			if (value.advance.mode !== "user-after-animation") issues.push("activity.advance.mode must be user-after-animation");
			if (value.advance.label !== void 0) text(value.advance.label, "activity.advance.label", issues, 120);
		}
		text(value.fallbackMarkdown, "activity.fallbackMarkdown", issues, 16e3);
	} else issues.push("activity.phase must be question or reveal");
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
/** Validate a retired phase-bound Client receipt. */
function parseLearningResponseV2(value, expected = {}) {
	const issues = [];
	const bytes = jsonBytes(value);
	if (bytes === void 0) issues.push("response must be serializable JSON");
	else if (bytes > MAX_RESPONSE_BYTES) issues.push(`response exceeds ${String(MAX_RESPONSE_BYTES)} bytes`);
	if (!record(value)) throw new LearningProtocolError([...issues, "response must be an object"]);
	if (value.phase === "question") {
		onlyKeys(value, [
			"protocol",
			"phase",
			"activityId",
			"lessonToken",
			"roundToken",
			"seq",
			"action",
			"answer",
			"receiptId",
			"interactionState"
		], "response", issues);
		if (![
			"submit",
			"skip",
			"cancel"
		].includes(value.action)) issues.push("response.action is unknown");
		if (value.answer !== void 0) validateJson(value.answer, "response.answer", issues);
	} else if (value.phase === "reveal") {
		onlyKeys(value, [
			"protocol",
			"phase",
			"activityId",
			"lessonToken",
			"roundToken",
			"seq",
			"action",
			"animation",
			"receiptId",
			"interactionState"
		], "response", issues);
		if (![
			"continue",
			"skip",
			"cancel"
		].includes(value.action)) issues.push("response.action is unknown");
		if (!record(value.animation)) issues.push("response.animation must be an object");
		else {
			onlyKeys(value.animation, [
				"completed",
				"skipped",
				"reducedMotion",
				"error"
			], "response.animation", issues);
			if (typeof value.animation.completed !== "boolean") issues.push("response.animation.completed must be boolean");
			if (value.action === "continue" && value.animation.completed !== true) issues.push("response.animation.completed must be true before continue");
		}
	} else issues.push("response.phase must be question or reveal");
	if (value.protocol !== RESPONSE_PROTOCOL_V2) issues.push(`response.protocol must be ${RESPONSE_PROTOCOL_V2}`);
	token(value.activityId, "response.activityId", issues);
	token(value.lessonToken, "response.lessonToken", issues);
	token(value.roundToken, "response.roundToken", issues);
	integer(value.seq, "response.seq", issues);
	token(value.receiptId, "response.receiptId", issues);
	if (value.interactionState !== void 0) validateJson(value.interactionState, "response.interactionState", issues);
	for (const [key, expectedValue] of Object.entries(expected)) if (expectedValue !== void 0 && value[key] !== expectedValue) issues.push(`response.${key} does not match the pending activity`);
	if (issues.length > 0) throw new LearningProtocolError(issues);
	return value;
}
//#endregion
export { parseLearningResponseV2 as i, parseLearningActivityV2 as n, parseLearningResponse as r, parseLearningActivity as t };
