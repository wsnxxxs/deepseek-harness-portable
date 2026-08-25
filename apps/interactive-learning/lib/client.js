window.__ModuleLoader__.load({
	id: "@dsh-portable/interactive-learning",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/protocol.ts
		/** Versioned, declarative protocol shared by the Host, Agent, and Client. */
		const ACTIVITY_PROTOCOL = "dsh-learning/activity@1";
		const RESPONSE_PROTOCOL = "dsh-learning/response@1";
		const TRANSPORT_PROTOCOL = "dsh-learning/transport@1";
		const ACTIVITY_PROTOCOL_V2 = "dsh-learning/activity@2";
		const RESPONSE_PROTOCOL_V2 = "dsh-learning/response@2";
		const TRANSPORT_PROTOCOL_V2 = "dsh-learning/wait@2";
		const VISUAL_PROTOCOL_V3 = "dsh-learning/visual@3";
		const VISUAL_RESULT_PROTOCOL_V3 = "dsh-learning/visual-result@3";
		const VISUAL_PROTOCOL_V4 = "dsh-learning/visual@4";
		const VISUAL_RESULT_PROTOCOL_V4 = "dsh-learning/visual-result@4";
		const CHECKPOINT_PROTOCOL = "dsh-learning/checkpoint@1";
		const CHECKPOINT_RESULT_PROTOCOL = "dsh-learning/checkpoint-result@1";
		const CHECKPOINT_TRANSPORT_PROTOCOL = "dsh-learning/checkpoint-wait@1";
		const LEARNING_CHECKPOINT_KINDS = [
			"free_text",
			"single_choice",
			"numeric",
			"prediction",
			"code_slot"
		];
		const LEARNING_CHECKPOINT_EVIDENCE_KINDS = [
			"attempt",
			"prediction",
			"explanation",
			"contrast",
			"transfer"
		];
		const LEARNING_VISUAL_KINDS_V4 = [
			"plot",
			"node_link",
			"scene_2d",
			"relation",
			"timeline",
			"formula_steps",
			"study_map",
			"recall_deck",
			"data_table",
			"state_transition",
			"sequence_buffer",
			"sequence_diagram",
			"code_trace",
			"field_2d",
			"causal_loop"
		];
		const LEARNING_ACTIVITY_KINDS = [
			"parameter_explorer",
			"process_stepper",
			"structure_compare"
		];
		const MAX_ACTIVITY_BYTES = 65536;
		const MAX_RESPONSE_BYTES = 32768;
		const MATH_BINARY_OPERATORS = [
			"add",
			"sub",
			"mul",
			"div",
			"pow",
			"min",
			"max"
		];
		const MATH_UNARY_OPERATORS = [
			"neg",
			"abs",
			"sqrt",
			"sin",
			"cos",
			"tan",
			"atan",
			"exp",
			"log",
			"sigmoid",
			"relu",
			"leaky_relu",
			"step",
			"normpdf",
			"floor",
			"ceil"
		];
		const LEARNING_VISUAL_STATUSES = ["ready", "unavailable"];
		/** A stable, actionable protocol rejection surfaced to the tool call. */
		var LearningProtocolError = class extends Error {
			issues;
			code = "INVALID_LEARNING_ACTIVITY";
			constructor(issues) {
				super(`Invalid Learning Activity: ${issues.join("; ")}`);
				this.issues = issues;
				this.name = "LearningProtocolError";
			}
		};
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
		function validateJson(value, path, issues) {
			const stack = [{
				value,
				path,
				depth: 0
			}];
			let nodes = 0;
			while (stack.length > 0) {
				const current = stack.pop();
				nodes += 1;
				if (nodes > 512) {
					issues.push(`${path} exceeds 512 JSON nodes`);
					return false;
				}
				if (current.depth > 12) {
					issues.push(`${current.path} exceeds JSON depth 12`);
					return false;
				}
				const item = current.value;
				if (item === null || typeof item === "string" || typeof item === "boolean") continue;
				if (typeof item === "number") {
					if (!Number.isFinite(item)) issues.push(`${current.path} must contain finite numbers`);
					continue;
				}
				if (Array.isArray(item)) {
					for (let index = item.length - 1; index >= 0; index -= 1) stack.push({
						value: item[index],
						path: `${current.path}[${String(index)}]`,
						depth: current.depth + 1
					});
					continue;
				}
				if (record(item)) {
					for (const [key, child] of Object.entries(item)) stack.push({
						value: child,
						path: `${current.path}.${key}`,
						depth: current.depth + 1
					});
					continue;
				}
				issues.push(`${current.path} must be lossless JSON`);
			}
			return issues.length === 0;
		}
		function validateMath(value, parameterIds, path, issues, allowX = true, maxDepth = 8) {
			const binary = new Set(MATH_BINARY_OPERATORS);
			const unary = new Set(MATH_UNARY_OPERATORS);
			const stack = [{
				value,
				path,
				depth: 1
			}];
			let nodes = 0;
			while (stack.length > 0) {
				const node = stack.pop();
				nodes += 1;
				if (nodes > 64) {
					issues.push(`${path} exceeds ${String(64)} AST nodes`);
					return;
				}
				if (node.depth > maxDepth) {
					issues.push(`${node.path} exceeds AST depth ${String(maxDepth)}`);
					return;
				}
				if (!record(node.value) || typeof node.value.op !== "string") {
					issues.push(`${node.path} must be a mathematical AST node`);
					continue;
				}
				const expression = node.value;
				const op = expression.op;
				if (op === "constant") {
					onlyKeys(expression, ["op", "value"], node.path, issues);
					if (finite(expression.value, `${node.path}.value`, issues) && Math.abs(expression.value) > 0xe8d4a51000) issues.push(`${node.path}.value exceeds the numeric limit`);
				} else if (op === "variable") {
					onlyKeys(expression, ["op", "name"], node.path, issues);
					if (typeof expression.name !== "string" || !parameterIds.has(expression.name) && !(allowX && expression.name === "x")) issues.push(`${node.path}.name must be ${allowX ? "x or " : ""}a declared parameter id`);
				} else if (binary.has(op)) {
					onlyKeys(expression, [
						"op",
						"left",
						"right"
					], node.path, issues);
					stack.push({
						value: expression.right,
						path: `${node.path}.right`,
						depth: node.depth + 1
					}, {
						value: expression.left,
						path: `${node.path}.left`,
						depth: node.depth + 1
					});
				} else if (unary.has(op)) {
					onlyKeys(expression, ["op", "value"], node.path, issues);
					stack.push({
						value: expression.value,
						path: `${node.path}.value`,
						depth: node.depth + 1
					});
				} else issues.push(`${node.path}.op is unknown`);
			}
		}
		function validateParameterExplorer(payload, issues) {
			if (!record(payload)) {
				issues.push("activity.payload must be an object");
				return;
			}
			onlyKeys(payload, [
				"parameters",
				"xAxis",
				"curves",
				"question"
			], "activity.payload", issues);
			if (!Array.isArray(payload.parameters) || payload.parameters.length < 1 || payload.parameters.length > 2) {
				issues.push("activity.payload.parameters must contain 1 or 2 parameters");
				return;
			}
			const parameters = payload.parameters.filter(record);
			if (parameters.length !== payload.parameters.length) issues.push("activity.payload.parameters entries must be objects");
			uniqueIds(parameters, "activity.payload.parameters", issues);
			for (const [index, parameter] of parameters.entries()) {
				const path = `activity.payload.parameters[${String(index)}]`;
				onlyKeys(parameter, [
					"id",
					"label",
					"min",
					"max",
					"step",
					"initial"
				], path, issues);
				id(parameter.id, `${path}.id`, issues);
				text(parameter.label, `${path}.label`, issues, 120);
				const min = parameter.min;
				const max = parameter.max;
				const step = parameter.step;
				const initial = parameter.initial;
				const minOk = finite(min, `${path}.min`, issues);
				const maxOk = finite(max, `${path}.max`, issues);
				const stepOk = finite(step, `${path}.step`, issues);
				const initialOk = finite(initial, `${path}.initial`, issues);
				if (minOk && maxOk && min >= max) issues.push(`${path}.min must be less than max`);
				if (stepOk && step <= 0) issues.push(`${path}.step must be positive`);
				if (minOk && maxOk && stepOk && step > max - min) issues.push(`${path}.step must not exceed the parameter range`);
				if (minOk && maxOk && initialOk && (initial < min || initial > max)) issues.push(`${path}.initial must be inside the parameter range`);
			}
			if (!record(payload.xAxis)) issues.push("activity.payload.xAxis must be an object");
			else {
				onlyKeys(payload.xAxis, [
					"label",
					"min",
					"max",
					"samples"
				], "activity.payload.xAxis", issues);
				if (payload.xAxis.label !== void 0) text(payload.xAxis.label, "activity.payload.xAxis.label", issues, 120);
				const xMin = payload.xAxis.min;
				const xMax = payload.xAxis.max;
				const samples = payload.xAxis.samples;
				const minOk = finite(xMin, "activity.payload.xAxis.min", issues);
				const maxOk = finite(xMax, "activity.payload.xAxis.max", issues);
				if (minOk && maxOk && xMin >= xMax) issues.push("activity.payload.xAxis.min must be less than max");
				if (samples !== void 0 && (typeof samples !== "number" || !Number.isInteger(samples) || samples < 16 || samples > 256)) issues.push("activity.payload.xAxis.samples must be an integer from 16 to 256");
			}
			if (!Array.isArray(payload.curves) || payload.curves.length < 1 || payload.curves.length > 3) issues.push("activity.payload.curves must contain 1 to 3 curves");
			else {
				const curves = payload.curves.filter(record);
				if (curves.length !== payload.curves.length) issues.push("activity.payload.curves entries must be objects");
				uniqueIds(curves, "activity.payload.curves", issues);
				const parameterIds = new Set(parameters.map((item) => typeof item.id === "string" ? item.id : ""));
				for (const [index, curve] of curves.entries()) {
					const path = `activity.payload.curves[${String(index)}]`;
					onlyKeys(curve, [
						"id",
						"label",
						"expression"
					], path, issues);
					id(curve.id, `${path}.id`, issues);
					text(curve.label, `${path}.label`, issues, 120);
					validateMath(curve.expression, parameterIds, `${path}.expression`, issues);
				}
			}
			if (payload.question !== void 0) text(payload.question, "activity.payload.question", issues, 2e3);
		}
		function validateProcessStepper(payload, issues) {
			if (!record(payload)) {
				issues.push("activity.payload must be an object");
				return;
			}
			onlyKeys(payload, ["steps", "question"], "activity.payload", issues);
			if (!Array.isArray(payload.steps) || payload.steps.length < 2 || payload.steps.length > 12) {
				issues.push("activity.payload.steps must contain 2 to 12 steps");
				return;
			}
			const steps = payload.steps.filter(record);
			if (steps.length !== payload.steps.length) issues.push("activity.payload.steps entries must be objects");
			uniqueIds(steps, "activity.payload.steps", issues);
			for (const [index, step] of steps.entries()) {
				const path = `activity.payload.steps[${String(index)}]`;
				onlyKeys(step, [
					"id",
					"title",
					"content",
					"checkpoint"
				], path, issues);
				id(step.id, `${path}.id`, issues);
				text(step.title, `${path}.title`, issues, 200);
				text(step.content, `${path}.content`, issues, 4e3);
				if (step.checkpoint !== void 0) {
					if (!record(step.checkpoint)) issues.push(`${path}.checkpoint must be an object`);
					else {
						onlyKeys(step.checkpoint, ["question", "options"], `${path}.checkpoint`, issues);
						text(step.checkpoint.question, `${path}.checkpoint.question`, issues, 2e3);
						if (step.checkpoint.options !== void 0) {
							if (!Array.isArray(step.checkpoint.options) || step.checkpoint.options.length < 2 || step.checkpoint.options.length > 6 || !step.checkpoint.options.every((option) => typeof option === "string" && option.trim() !== "")) issues.push(`${path}.checkpoint.options must contain 2 to 6 non-empty strings`);
						}
					}
				}
			}
			if (payload.question !== void 0) text(payload.question, "activity.payload.question", issues, 2e3);
		}
		function validateStructureSide(value, path, issues) {
			if (!record(value)) {
				issues.push(`${path} must be an object`);
				return [];
			}
			onlyKeys(value, ["title", "items"], path, issues);
			text(value.title, `${path}.title`, issues, 200);
			if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 20) {
				issues.push(`${path}.items must contain 1 to 20 items`);
				return [];
			}
			const items = value.items.filter(record);
			if (items.length !== value.items.length) issues.push(`${path}.items entries must be objects`);
			uniqueIds(items, `${path}.items`, issues);
			for (const [index, item] of items.entries()) {
				const itemPath = `${path}.items[${String(index)}]`;
				onlyKeys(item, [
					"id",
					"label",
					"detail"
				], itemPath, issues);
				id(item.id, `${itemPath}.id`, issues);
				text(item.label, `${itemPath}.label`, issues, 500);
				if (item.detail !== void 0) text(item.detail, `${itemPath}.detail`, issues, 2e3);
			}
			return items;
		}
		function validateStructureCompare(payload, issues) {
			if (!record(payload)) {
				issues.push("activity.payload must be an object");
				return;
			}
			onlyKeys(payload, [
				"left",
				"right",
				"alignments",
				"question"
			], "activity.payload", issues);
			const left = validateStructureSide(payload.left, "activity.payload.left", issues);
			const right = validateStructureSide(payload.right, "activity.payload.right", issues);
			const leftIds = new Set(left.map((item) => typeof item.id === "string" ? item.id : ""));
			const rightIds = new Set(right.map((item) => typeof item.id === "string" ? item.id : ""));
			if (!Array.isArray(payload.alignments) || payload.alignments.length < 1 || payload.alignments.length > 24) issues.push("activity.payload.alignments must contain 1 to 24 rows");
			else {
				const alignments = payload.alignments.filter(record);
				if (alignments.length !== payload.alignments.length) issues.push("activity.payload.alignments entries must be objects");
				uniqueIds(alignments, "activity.payload.alignments", issues);
				for (const [index, alignment] of alignments.entries()) {
					const path = `activity.payload.alignments[${String(index)}]`;
					onlyKeys(alignment, [
						"id",
						"leftId",
						"rightId",
						"prompt"
					], path, issues);
					id(alignment.id, `${path}.id`, issues);
					if (alignment.leftId === void 0 && alignment.rightId === void 0) issues.push(`${path} must reference at least one side`);
					if (alignment.leftId !== void 0 && (typeof alignment.leftId !== "string" || !leftIds.has(alignment.leftId))) issues.push(`${path}.leftId must reference a left item`);
					if (alignment.rightId !== void 0 && (typeof alignment.rightId !== "string" || !rightIds.has(alignment.rightId))) issues.push(`${path}.rightId must reference a right item`);
					if (alignment.prompt !== void 0) text(alignment.prompt, `${path}.prompt`, issues, 1e3);
				}
			}
			if (payload.question !== void 0) text(payload.question, "activity.payload.question", issues, 2e3);
		}
		/** Validate and narrow an untrusted model-provided activity. */
		function parseLearningActivity(value) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("activity must be serializable JSON");
			else if (bytes > 65536) issues.push(`activity exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
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
			if (value.protocol !== "dsh-learning/activity@1") issues.push(`activity.protocol must be ${ACTIVITY_PROTOCOL}`);
			if (!LEARNING_ACTIVITY_KINDS.includes(value.kind)) issues.push("activity.kind is unknown");
			text(value.title, "activity.title", issues, 200);
			text(value.objective, "activity.objective", issues, 1e3);
			text(value.prompt, "activity.prompt", issues, 2e3);
			if (value.scaffold !== void 0) text(value.scaffold, "activity.scaffold", issues, 4e3);
			text(value.fallbackMarkdown, "activity.fallbackMarkdown", issues, 16e3);
			if (value.kind === "parameter_explorer") validateParameterExplorer(value.payload, issues);
			else if (value.kind === "process_stepper") validateProcessStepper(value.payload, issues);
			else if (value.kind === "structure_compare") validateStructureCompare(value.payload, issues);
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
		}
		/** Validate and narrow a Client response before it returns to the model. */
		function parseLearningResponse(value, expectedActivityId) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("response must be serializable JSON");
			else if (bytes > 32768) issues.push(`response exceeds ${String(MAX_RESPONSE_BYTES)} bytes`);
			if (!record(value)) throw new LearningProtocolError([...issues, "response must be an object"]);
			onlyKeys(value, [
				"protocol",
				"activityId",
				"action",
				"answer",
				"interactionState"
			], "response", issues);
			if (value.protocol !== "dsh-learning/response@1") issues.push(`response.protocol must be ${RESPONSE_PROTOCOL}`);
			if (typeof value.activityId !== "string" || value.activityId === "") issues.push("response.activityId must be a non-empty string");
			if (expectedActivityId !== void 0 && value.activityId !== expectedActivityId) issues.push("response.activityId does not match the pending activity");
			if (value.action !== "submit" && value.action !== "skip" && value.action !== "cancel") issues.push("response.action is unknown");
			if (value.answer !== void 0) validateJson(value.answer, "response.answer", issues);
			if (value.interactionState !== void 0) validateJson(value.interactionState, "response.interactionState", issues);
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
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
		function validateFocusV2(value, path, issues) {
			if (!record(value)) {
				issues.push(`${path} must be an object`);
				return;
			}
			onlyKeys(value, ["title", "progress"], path, issues);
			text(value.title, `${path}.title`, issues, 200);
			if (value.progress !== void 0) {
				if (!record(value.progress)) issues.push(`${path}.progress must be an object`);
				else {
					onlyKeys(value.progress, ["current", "total"], `${path}.progress`, issues);
					const currentOk = integer(value.progress.current, `${path}.progress.current`, issues, 1);
					const totalOk = value.progress.total === void 0 ? false : integer(value.progress.total, `${path}.progress.total`, issues, 1);
					if (currentOk && totalOk && value.progress.current > value.progress.total) issues.push(`${path}.progress.current must not exceed total`);
				}
			}
		}
		function validateInputV2(value, issues) {
			const path = "activity.input";
			if (!record(value)) {
				issues.push(`${path} must be an object`);
				return;
			}
			if (value.kind === "single_choice") {
				onlyKeys(value, ["kind", "options"], path, issues);
				if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 8) {
					issues.push(`${path}.options must contain 2 to 8 options`);
					return;
				}
				const options = value.options.filter(record);
				if (options.length !== value.options.length) issues.push(`${path}.options entries must be objects`);
				uniqueIds(options, `${path}.options`, issues);
				for (const [index, option] of options.entries()) {
					const optionPath = `${path}.options[${String(index)}]`;
					onlyKeys(option, ["id", "label"], optionPath, issues);
					id(option.id, `${optionPath}.id`, issues);
					text(option.label, `${optionPath}.label`, issues, 500);
				}
			} else if (value.kind === "short_text") {
				onlyKeys(value, [
					"kind",
					"placeholder",
					"maxLength"
				], path, issues);
				if (value.placeholder !== void 0) text(value.placeholder, `${path}.placeholder`, issues, 500);
				if (value.maxLength !== void 0 && (!integer(value.maxLength, `${path}.maxLength`, issues, 1) || value.maxLength > 8e3)) issues.push(`${path}.maxLength must not exceed 8000`);
			} else if (value.kind === "number") {
				onlyKeys(value, [
					"kind",
					"min",
					"max",
					"step"
				], path, issues);
				const minOk = value.min === void 0 ? false : finite(value.min, `${path}.min`, issues);
				const maxOk = value.max === void 0 ? false : finite(value.max, `${path}.max`, issues);
				const stepOk = value.step === void 0 ? false : finite(value.step, `${path}.step`, issues);
				if (minOk && maxOk && value.min >= value.max) issues.push(`${path}.min must be less than max`);
				if (stepOk && value.step <= 0) issues.push(`${path}.step must be positive`);
			} else issues.push(`${path}.kind is unknown`);
		}
		function validateFrameV2(value, path, issues) {
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
		function validateParameterVisualV2(value, path, issues, reveal) {
			onlyKeys(value, reveal ? [
				"kind",
				"parameters",
				"xAxis",
				"curves",
				"emphasis"
			] : [
				"kind",
				"parameters",
				"xAxis",
				"curves"
			], path, issues);
			validateParameterExplorer({
				parameters: value.parameters,
				xAxis: value.xAxis,
				curves: value.curves
			}, issues);
			if (reveal && value.emphasis !== void 0) text(value.emphasis, `${path}.emphasis`, issues, 2e3);
		}
		function validateStructureVisualV2(value, path, issues, reveal) {
			onlyKeys(value, reveal ? [
				"kind",
				"left",
				"right",
				"alignments",
				"emphasisAlignmentIds"
			] : [
				"kind",
				"left",
				"right",
				"alignments"
			], path, issues);
			validateStructureCompare({
				left: value.left,
				right: value.right,
				alignments: value.alignments
			}, issues);
			if (reveal && value.emphasisAlignmentIds !== void 0) {
				if (!Array.isArray(value.emphasisAlignmentIds) || !value.emphasisAlignmentIds.every((item) => typeof item === "string")) issues.push(`${path}.emphasisAlignmentIds must be an array of ids`);
			}
		}
		function validateVisualV2(value, phase, issues) {
			const path = "activity.visual";
			if (!record(value)) {
				issues.push(`${path} must be an object`);
				return;
			}
			if (value.kind === "process") {
				if (phase === "question") {
					onlyKeys(value, ["kind", "frame"], path, issues);
					validateFrameV2(value.frame, `${path}.frame`, issues);
				} else {
					onlyKeys(value, [
						"kind",
						"before",
						"after"
					], path, issues);
					validateFrameV2(value.before, `${path}.before`, issues);
					validateFrameV2(value.after, `${path}.after`, issues);
				}
			} else if (value.kind === "parameter") validateParameterVisualV2(value, path, issues, phase === "reveal");
			else if (value.kind === "structure") validateStructureVisualV2(value, path, issues, phase === "reveal");
			else issues.push(`${path}.kind is unknown`);
		}
		/** Strict live protocol. V1 is intentionally parsed separately for legacy replay only. */
		function parseLearningActivityV2(value) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("activity must be serializable JSON");
			else if (bytes > 65536) issues.push(`activity exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
			if (!record(value)) throw new LearningProtocolError([...issues, "activity must be an object"]);
			if (value.protocol !== "dsh-learning/activity@2") issues.push(`activity.protocol must be ${ACTIVITY_PROTOCOL_V2}`);
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
				validateFocusV2(value.focus, "activity.focus", issues);
				text(value.prompt, "activity.prompt", issues, 2e3);
				if (value.scaffold !== void 0) text(value.scaffold, "activity.scaffold", issues, 4e3);
				validateInputV2(value.input, issues);
				if (value.visual !== void 0) validateVisualV2(value.visual, "question", issues);
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
				validateFocusV2(value.focus, "activity.focus", issues);
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
				if (value.visual !== void 0) validateVisualV2(value.visual, "reveal", issues);
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
					if (value.animation.preferredDurationMs !== void 0 && (!integer(value.animation.preferredDurationMs, "activity.animation.preferredDurationMs", issues, 0) || value.animation.preferredDurationMs > 1e4)) issues.push("activity.animation.preferredDurationMs must not exceed 10000");
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
		/** Validate a phase-bound Client receipt before the Broker changes lesson state. */
		function parseLearningResponseV2(value, expected = {}) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("response must be serializable JSON");
			else if (bytes > 32768) issues.push(`response exceeds ${String(MAX_RESPONSE_BYTES)} bytes`);
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
					if (value.animation.skipped !== void 0 && typeof value.animation.skipped !== "boolean") issues.push("response.animation.skipped must be boolean");
					if (value.animation.reducedMotion !== void 0 && typeof value.animation.reducedMotion !== "boolean") issues.push("response.animation.reducedMotion must be boolean");
					if (value.animation.error !== void 0 && typeof value.animation.error !== "string") issues.push("response.animation.error must be a string");
					if (value.action === "continue" && value.animation.completed !== true) issues.push("response.animation.completed must be true before continue");
				}
			} else issues.push("response.phase must be question or reveal");
			if (value.protocol !== "dsh-learning/response@2") issues.push(`response.protocol must be ${RESPONSE_PROTOCOL_V2}`);
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
		const CHECKPOINT_RAW_HTML = /<(?:!DOCTYPE\b|!--|\/?[A-Za-z][^<>]*>)/i;
		const CHECKPOINT_LEAKAGE_COPY = /\b(?:correct\s+answer|model\s+answer|answer\s+key|(?:the\s+)?answer\s*(?:is|was|[:：])|solution\s*[:：]|expected\s+(?:answer|response|result)\s*[:：]|grading\s+rubric|scoring\s+rubric|future\s+(?:step|question)|next\s+question\s*:)|(?:正确|标准|参考|模型)(?:答案|解答)|标准解\s*[:：]?|(?:答案|解答)\s*[:：]|答案(?:是|为)|评分(?:标准|细则)|下一(?:步|题|个问题)|后续步骤|未来步骤/iu;
		/** Canonical fail-closed predicate shared by protocol parsing and Client fallback extraction. */
		function isLearningCheckpointDisplayTextSafe(value) {
			return !CHECKPOINT_RAW_HTML.test(value) && !CHECKPOINT_LEAKAGE_COPY.test(value);
		}
		function checkpointDisplayText(value, path, issues, max) {
			const valid = text(value, path, issues, max);
			if (valid && !isLearningCheckpointDisplayTextSafe(value)) {
				issues.push(`${path} must not contain raw HTML, an answer key, scoring rubric, or future-step copy`);
				return false;
			}
			return valid;
		}
		/** Strict, answer-free protocol for one optional learner checkpoint. */
		function parseLearningCheckpointV1(value) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("checkpoint must be serializable JSON");
			else if (bytes > 65536) issues.push(`checkpoint exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
			if (!record(value)) throw new LearningProtocolError([...issues, "checkpoint must be an object"]);
			onlyKeys(value, [
				"protocol",
				"kind",
				"prompt",
				"context",
				"expectedEvidence",
				"options",
				"fallbackMarkdown"
			], "checkpoint", issues);
			if (value.protocol !== "dsh-learning/checkpoint@1") issues.push(`checkpoint.protocol must be ${CHECKPOINT_PROTOCOL}`);
			if (!LEARNING_CHECKPOINT_KINDS.includes(value.kind)) issues.push(`checkpoint.kind must be one of ${LEARNING_CHECKPOINT_KINDS.join(", ")}`);
			checkpointDisplayText(value.prompt, "checkpoint.prompt", issues, 2e3);
			if (value.context !== void 0) checkpointDisplayText(value.context, "checkpoint.context", issues, 4e3);
			if (!LEARNING_CHECKPOINT_EVIDENCE_KINDS.includes(value.expectedEvidence)) issues.push(`checkpoint.expectedEvidence must be one of ${LEARNING_CHECKPOINT_EVIDENCE_KINDS.join(", ")}`);
			checkpointDisplayText(value.fallbackMarkdown, "checkpoint.fallbackMarkdown", issues, 8e3);
			if (value.kind === "single_choice") {
				if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 8) issues.push("checkpoint.options must contain 2 to 8 options for single_choice");
				else {
					const options = value.options.filter(record);
					if (options.length !== value.options.length) issues.push("checkpoint.options entries must be objects");
					uniqueIds(options, "checkpoint.options", issues);
					for (const [index, option] of options.entries()) {
						const path = `checkpoint.options[${String(index)}]`;
						onlyKeys(option, ["id", "label"], path, issues);
						id(option.id, `${path}.id`, issues);
						checkpointDisplayText(option.label, `${path}.label`, issues, 500);
					}
				}
			} else if (value.options !== void 0) issues.push("checkpoint.options is supported only for single_choice");
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
		}
		/** Validate one phase-bound checkpoint receipt before the Host accepts it. */
		function parseLearningCheckpointResultV1(value, expected = {}) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("checkpoint result must be serializable JSON");
			else if (bytes > 32768) issues.push(`checkpoint result exceeds ${String(MAX_RESPONSE_BYTES)} bytes`);
			if (!record(value)) throw new LearningProtocolError([...issues, "checkpoint result must be an object"]);
			const submitted = value.status === "submitted";
			onlyKeys(value, submitted ? [
				"protocol",
				"checkpointId",
				"status",
				"response",
				"receiptId"
			] : [
				"protocol",
				"checkpointId",
				"status",
				"reason",
				"receiptId"
			], "checkpointResult", issues);
			if (value.protocol !== "dsh-learning/checkpoint-result@1") issues.push(`checkpointResult.protocol must be ${CHECKPOINT_RESULT_PROTOCOL}`);
			token(value.checkpointId, "checkpointResult.checkpointId", issues);
			token(value.receiptId, "checkpointResult.receiptId", issues);
			if (![
				"submitted",
				"skipped",
				"cancelled"
			].includes(value.status)) issues.push("checkpointResult.status must be submitted, skipped, or cancelled");
			if (value.reason !== void 0 && typeof value.reason !== "string") issues.push("checkpointResult.reason must be a string");
			else if (value.status === "skipped" && value.reason !== void 0 && ![
				"learner-skipped",
				"client-unavailable",
				"client-response-timeout",
				"host-unavailable",
				"provider-failure"
			].includes(value.reason)) issues.push("checkpointResult.reason is not valid for skipped status");
			else if (value.status === "cancelled" && value.reason !== void 0 && ![
				"learner-cancelled",
				"session-aborted",
				"plugin-disposed"
			].includes(value.reason)) issues.push("checkpointResult.reason is not valid for cancelled status");
			else if (value.status === "submitted" && value.reason !== void 0) issues.push("checkpointResult.reason is allowed only for skipped or cancelled status");
			if (expected.checkpointId !== void 0 && value.checkpointId !== expected.checkpointId) issues.push("checkpointResult.checkpointId does not match the pending checkpoint");
			let checkpoint;
			if (expected.checkpoint !== void 0) try {
				checkpoint = parseLearningCheckpointV1(expected.checkpoint);
			} catch (cause) {
				if (cause instanceof LearningProtocolError) issues.push(...cause.issues.map((issue) => `expected ${issue}`));
				else throw cause;
			}
			if (submitted) {
				if (!record(value.response)) issues.push("checkpointResult.response must be an object when submitted");
				else {
					const response = value.response;
					const responsePath = "checkpointResult.response";
					const expectedKind = checkpoint?.kind;
					const shape = expectedKind === "single_choice" ? "optionId" : expectedKind === "numeric" ? "number" : expectedKind === void 0 ? void 0 : "text";
					if (shape === "optionId" || shape === void 0 && Object.hasOwn(response, "optionId")) {
						onlyKeys(response, ["optionId"], responsePath, issues);
						if (id(response.optionId, `${responsePath}.optionId`, issues) && checkpoint?.options !== void 0 && !checkpoint.options.some((option) => option.id === response.optionId)) issues.push(`${responsePath}.optionId must reference a declared checkpoint option`);
					} else if (shape === "number" || shape === void 0 && Object.hasOwn(response, "number")) {
						onlyKeys(response, ["number"], responsePath, issues);
						finite(response.number, `${responsePath}.number`, issues);
					} else if (shape === "text" || shape === void 0 && Object.hasOwn(response, "text")) {
						onlyKeys(response, ["text"], responsePath, issues);
						text(response.text, `${responsePath}.text`, issues, expectedKind === "code_slot" ? 16e3 : 8e3);
					} else {
						issues.push(`${responsePath} must contain exactly one of text, optionId, or number`);
						onlyKeys(response, [], responsePath, issues);
					}
				}
			} else if (value.response !== void 0) issues.push("checkpointResult.response is allowed only when status is submitted");
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
		}
		const VISUAL_TONES_V3 = /* @__PURE__ */ new Set([
			"blue",
			"green",
			"red",
			"orange",
			"purple",
			"gray"
		]);
		const VISUAL_STROKES_V3 = /* @__PURE__ */ new Set([
			"solid",
			"dashed",
			"dotted"
		]);
		function validateVisualAxisV3(value, path, issues, samplesAllowed) {
			if (!record(value)) {
				issues.push(`${path} must be an object`);
				return;
			}
			onlyKeys(value, samplesAllowed ? [
				"label",
				"min",
				"max",
				"samples"
			] : [
				"label",
				"min",
				"max"
			], path, issues);
			if (value.label !== void 0) text(value.label, `${path}.label`, issues, 120);
			const minOk = finite(value.min, `${path}.min`, issues);
			const maxOk = finite(value.max, `${path}.max`, issues);
			if (minOk && maxOk && value.min >= value.max) issues.push(`${path}.min must be less than max`);
			if (samplesAllowed && value.samples !== void 0 && (!integer(value.samples, `${path}.samples`, issues, 24) || value.samples > 256)) issues.push(`${path}.samples must be an integer from 24 to 256`);
		}
		function validateVisualParametersV3(value, issues) {
			const path = "visual.parameters";
			if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
				issues.push(`${path} must contain 1 to 3 parameters`);
				return [];
			}
			const parameters = value.filter(record);
			if (parameters.length !== value.length) issues.push(`${path} entries must be objects`);
			uniqueIds(parameters, path, issues);
			for (const [index, parameter] of parameters.entries()) {
				const itemPath = `${path}[${String(index)}]`;
				onlyKeys(parameter, [
					"id",
					"label",
					"min",
					"max",
					"step",
					"initial"
				], itemPath, issues);
				id(parameter.id, `${itemPath}.id`, issues);
				if (parameter.id === "x") issues.push(`${itemPath}.id must not use the reserved x-axis variable`);
				text(parameter.label, `${itemPath}.label`, issues, 120);
				const minOk = finite(parameter.min, `${itemPath}.min`, issues);
				const maxOk = finite(parameter.max, `${itemPath}.max`, issues);
				const stepOk = finite(parameter.step, `${itemPath}.step`, issues);
				const initialOk = finite(parameter.initial, `${itemPath}.initial`, issues);
				if (minOk && maxOk && parameter.min >= parameter.max) issues.push(`${itemPath}.min must be less than max`);
				if (stepOk && parameter.step <= 0) issues.push(`${itemPath}.step must be positive`);
				if (minOk && maxOk && stepOk && parameter.step > parameter.max - parameter.min) issues.push(`${itemPath}.step must not exceed the parameter range`);
				if (minOk && maxOk && initialOk && (parameter.initial < parameter.min || parameter.initial > parameter.max)) issues.push(`${itemPath}.initial must be inside the parameter range`);
			}
			return parameters;
		}
		/** Validate the preferred, non-blocking visual protocol. */
		function parseLearningVisualV3(value) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("visual must be serializable JSON");
			else if (bytes > 65536) issues.push(`visual exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
			if (!record(value)) throw new LearningProtocolError([...issues, "visual must be an object"]);
			onlyKeys(value, [
				"protocol",
				"kind",
				"title",
				"description",
				"parameters",
				"xAxis",
				"yAxis",
				"series",
				"metrics"
			], "visual", issues);
			if (value.protocol !== "dsh-learning/visual@3") issues.push(`visual.protocol must be ${VISUAL_PROTOCOL_V3}`);
			if (value.kind !== "parameter_chart") issues.push("visual.kind must be parameter_chart");
			text(value.title, "visual.title", issues, 200);
			if (value.description !== void 0) text(value.description, "visual.description", issues, 1e3);
			const parameters = validateVisualParametersV3(value.parameters, issues);
			const parameterIds = new Set(parameters.flatMap((parameter) => typeof parameter.id === "string" ? [parameter.id] : []));
			validateVisualAxisV3(value.xAxis, "visual.xAxis", issues, true);
			validateVisualAxisV3(value.yAxis, "visual.yAxis", issues, false);
			if (!Array.isArray(value.series) || value.series.length < 1 || value.series.length > 8) issues.push("visual.series must contain 1 to 8 series");
			else {
				const series = value.series.filter(record);
				if (series.length !== value.series.length) issues.push("visual.series entries must be objects");
				uniqueIds(series, "visual.series", issues);
				let curveCount = 0;
				for (const [index, item] of series.entries()) {
					const path = `visual.series[${String(index)}]`;
					id(item.id, `${path}.id`, issues);
					text(item.label, `${path}.label`, issues, 160);
					if (item.tone !== void 0 && !VISUAL_TONES_V3.has(item.tone)) issues.push(`${path}.tone is unknown`);
					if (item.type === "curve") {
						curveCount += 1;
						onlyKeys(item, [
							"type",
							"id",
							"label",
							"expression",
							"tone",
							"stroke"
						], path, issues);
						if (item.stroke !== void 0 && !VISUAL_STROKES_V3.has(item.stroke)) issues.push(`${path}.stroke is unknown`);
						validateMath(item.expression, parameterIds, `${path}.expression`, issues, true, 4);
					} else if (item.type === "points") {
						onlyKeys(item, [
							"type",
							"id",
							"label",
							"points",
							"tone"
						], path, issues);
						if (!Array.isArray(item.points) || item.points.length < 1 || item.points.length > 128) {
							issues.push(`${path}.points must contain 1 to 128 points`);
							continue;
						}
						for (const [pointIndex, point] of item.points.entries()) {
							const pointPath = `${path}.points[${String(pointIndex)}]`;
							if (!record(point)) {
								issues.push(`${pointPath} must be an object`);
								continue;
							}
							onlyKeys(point, [
								"x",
								"y",
								"label"
							], pointPath, issues);
							finite(point.x, `${pointPath}.x`, issues);
							finite(point.y, `${pointPath}.y`, issues);
							if (point.label !== void 0) text(point.label, `${pointPath}.label`, issues, 160);
						}
					} else issues.push(`${path}.type must be curve or points`);
				}
				if (curveCount === 0) issues.push("visual.series must contain at least one curve");
			}
			if (value.metrics !== void 0) {
				if (!Array.isArray(value.metrics) || value.metrics.length > 4) issues.push("visual.metrics must contain at most 4 metrics");
				else {
					const metrics = value.metrics.filter(record);
					if (metrics.length !== value.metrics.length) issues.push("visual.metrics entries must be objects");
					uniqueIds(metrics, "visual.metrics", issues);
					for (const [index, metric] of metrics.entries()) {
						const path = `visual.metrics[${String(index)}]`;
						onlyKeys(metric, [
							"id",
							"label",
							"expression",
							"digits",
							"suffix"
						], path, issues);
						id(metric.id, `${path}.id`, issues);
						text(metric.label, `${path}.label`, issues, 160);
						validateMath(metric.expression, parameterIds, `${path}.expression`, issues, false, 4);
						if (metric.digits !== void 0 && (!integer(metric.digits, `${path}.digits`, issues) || metric.digits > 6)) issues.push(`${path}.digits must be an integer from 0 to 6`);
						if (metric.suffix !== void 0) text(metric.suffix, `${path}.suffix`, issues, 80);
					}
				}
			}
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
		}
		function validateVisualToneV4(value, path, issues) {
			if (value !== void 0 && !VISUAL_TONES_V3.has(value)) issues.push(`${path} is unknown`);
		}
		function validateVisualStrokeV4(value, path, issues) {
			if (value !== void 0 && !VISUAL_STROKES_V3.has(value)) issues.push(`${path} is unknown`);
		}
		function registerVisualIdV4(ids, value, path, issues) {
			if (typeof value !== "string") return;
			if (ids.has(value)) issues.push(`${path} duplicates visual id ${value}`);
			else ids.add(value);
		}
		function validateVisualParametersV4(value, issues) {
			const path = "visual.content.parameters";
			if (value === void 0) return [];
			if (!Array.isArray(value) || value.length > 3) {
				issues.push(`${path} must contain at most 3 parameters`);
				return [];
			}
			const parameters = value.filter(record);
			if (parameters.length !== value.length) issues.push(`${path} entries must be objects`);
			uniqueIds(parameters, path, issues);
			for (const [index, parameter] of parameters.entries()) {
				const itemPath = `${path}[${String(index)}]`;
				onlyKeys(parameter, [
					"id",
					"label",
					"min",
					"max",
					"step",
					"initial"
				], itemPath, issues);
				id(parameter.id, `${itemPath}.id`, issues);
				if (parameter.id === "x") issues.push(`${itemPath}.id must not use the reserved x-axis variable`);
				text(parameter.label, `${itemPath}.label`, issues, 120);
				const minOk = finite(parameter.min, `${itemPath}.min`, issues);
				const maxOk = finite(parameter.max, `${itemPath}.max`, issues);
				const stepOk = finite(parameter.step, `${itemPath}.step`, issues);
				const initialOk = finite(parameter.initial, `${itemPath}.initial`, issues);
				if (minOk && maxOk && parameter.min >= parameter.max) issues.push(`${itemPath}.min must be less than max`);
				if (stepOk && parameter.step <= 0) issues.push(`${itemPath}.step must be positive`);
				if (minOk && maxOk && stepOk && parameter.step > parameter.max - parameter.min) issues.push(`${itemPath}.step must not exceed the parameter range`);
				if (minOk && maxOk && initialOk && (parameter.initial < parameter.min || parameter.initial > parameter.max)) issues.push(`${itemPath}.initial must be inside the parameter range`);
			}
			return parameters;
		}
		function validateVisualPointsV4(value, path, issues, maximum = 256) {
			if (!Array.isArray(value) || value.length < 1 || value.length > maximum) {
				issues.push(`${path} must contain 1 to ${String(maximum)} points`);
				return;
			}
			for (const [index, point] of value.entries()) {
				const pointPath = `${path}[${String(index)}]`;
				if (!record(point)) {
					issues.push(`${pointPath} must be an object`);
					continue;
				}
				onlyKeys(point, [
					"x",
					"y",
					"label"
				], pointPath, issues);
				finite(point.x, `${pointPath}.x`, issues);
				finite(point.y, `${pointPath}.y`, issues);
				if (point.label !== void 0) text(point.label, `${pointPath}.label`, issues, 160);
			}
		}
		function validateVisualMetricsV4(value, parameterIds, issues) {
			if (value === void 0) return [];
			if (!Array.isArray(value) || value.length > 4) {
				issues.push("visual.content.metrics must contain at most 4 metrics");
				return [];
			}
			const metrics = value.filter(record);
			if (metrics.length !== value.length) issues.push("visual.content.metrics entries must be objects");
			uniqueIds(metrics, "visual.content.metrics", issues);
			for (const [index, metric] of metrics.entries()) {
				const path = `visual.content.metrics[${String(index)}]`;
				onlyKeys(metric, [
					"id",
					"label",
					"expression",
					"digits",
					"suffix"
				], path, issues);
				id(metric.id, `${path}.id`, issues);
				text(metric.label, `${path}.label`, issues, 160);
				validateMath(metric.expression, parameterIds, `${path}.expression`, issues, false, 4);
				if (metric.digits !== void 0 && (!integer(metric.digits, `${path}.digits`, issues) || metric.digits > 6)) issues.push(`${path}.digits must be an integer from 0 to 6`);
				if (metric.suffix !== void 0) text(metric.suffix, `${path}.suffix`, issues, 80);
			}
			return metrics;
		}
		function validatePlotV4(value, issues) {
			const ids = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"parameters",
				"xAxis",
				"yAxis",
				"series",
				"metrics"
			], "visual.content", issues);
			const parameters = validateVisualParametersV4(value.parameters, issues);
			const parameterIds = new Set(parameters.flatMap((parameter) => typeof parameter.id === "string" ? [parameter.id] : []));
			for (const parameterId of parameterIds) registerVisualIdV4(ids, parameterId, "visual.content.parameters", issues);
			validateVisualAxisV3(value.xAxis, "visual.content.xAxis", issues, true);
			validateVisualAxisV3(value.yAxis, "visual.content.yAxis", issues, false);
			if (!Array.isArray(value.series) || value.series.length < 1 || value.series.length > 8) issues.push("visual.content.series must contain 1 to 8 series");
			else {
				const series = value.series.filter(record);
				if (series.length !== value.series.length) issues.push("visual.content.series entries must be objects");
				uniqueIds(series, "visual.content.series", issues);
				for (const [index, item] of series.entries()) {
					const path = `visual.content.series[${String(index)}]`;
					if (id(item.id, `${path}.id`, issues)) registerVisualIdV4(ids, item.id, `${path}.id`, issues);
					text(item.label, `${path}.label`, issues, 160);
					validateVisualToneV4(item.tone, `${path}.tone`, issues);
					if (item.type === "curve") {
						onlyKeys(item, [
							"type",
							"id",
							"label",
							"expression",
							"tone",
							"stroke"
						], path, issues);
						validateVisualStrokeV4(item.stroke, `${path}.stroke`, issues);
						validateMath(item.expression, parameterIds, `${path}.expression`, issues, true, 4);
					} else if (item.type === "points" || item.type === "bars") {
						onlyKeys(item, [
							"type",
							"id",
							"label",
							"points",
							"tone"
						], path, issues);
						validateVisualPointsV4(item.points, `${path}.points`, issues, item.type === "bars" ? 64 : 256);
					} else if (item.type === "line") {
						onlyKeys(item, [
							"type",
							"id",
							"label",
							"points",
							"tone",
							"stroke"
						], path, issues);
						validateVisualStrokeV4(item.stroke, `${path}.stroke`, issues);
						validateVisualPointsV4(item.points, `${path}.points`, issues);
					} else issues.push(`${path}.type must be curve, points, line, or bars`);
				}
			}
			const metrics = validateVisualMetricsV4(value.metrics, parameterIds, issues);
			for (const [index, metric] of metrics.entries()) if (typeof metric.id === "string") registerVisualIdV4(ids, metric.id, `visual.content.metrics[${String(index)}].id`, issues);
			return ids;
		}
		function validateNodeLinkV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"layout",
				"groups",
				"nodes",
				"edges"
			], "visual.content", issues);
			if (![
				"layered",
				"hierarchy",
				"radial"
			].includes(value.layout)) issues.push("visual.content.layout must be layered, hierarchy, or radial");
			let groups = [];
			if (value.groups !== void 0) {
				if (!Array.isArray(value.groups) || value.groups.length < 1 || value.groups.length > 12) issues.push("visual.content.groups must contain 1 to 12 groups");
				else {
					groups = value.groups.filter(record);
					if (groups.length !== value.groups.length) issues.push("visual.content.groups entries must be objects");
					uniqueIds(groups, "visual.content.groups", issues);
					for (const [index, group] of groups.entries()) {
						const path = `visual.content.groups[${String(index)}]`;
						onlyKeys(group, ["id", "label"], path, issues);
						if (id(group.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, group.id, `${path}.id`, issues);
						text(group.label, `${path}.label`, issues, 120);
					}
				}
			}
			const groupIds = new Set(groups.flatMap((group) => typeof group.id === "string" ? [group.id] : []));
			let nodes = [];
			if (!Array.isArray(value.nodes) || value.nodes.length < 2 || value.nodes.length > 48) issues.push("visual.content.nodes must contain 2 to 48 nodes");
			else {
				nodes = value.nodes.filter(record);
				if (nodes.length !== value.nodes.length) issues.push("visual.content.nodes entries must be objects");
				uniqueIds(nodes, "visual.content.nodes", issues);
				for (const [index, node] of nodes.entries()) {
					const path = `visual.content.nodes[${String(index)}]`;
					onlyKeys(node, [
						"id",
						"label",
						"detail",
						"group",
						"tone"
					], path, issues);
					if (id(node.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, node.id, `${path}.id`, issues);
					text(node.label, `${path}.label`, issues, 120);
					if (node.detail !== void 0) text(node.detail, `${path}.detail`, issues, 1e3);
					if (node.group !== void 0 && (typeof node.group !== "string" || !groupIds.has(node.group))) issues.push(`${path}.group must reference a declared group`);
					validateVisualToneV4(node.tone, `${path}.tone`, issues);
				}
			}
			if (value.layout === "layered" && (groups.length === 0 || nodes.some((node) => typeof node.group !== "string"))) issues.push("visual.content layered layouts require groups and a group on every node");
			const nodeIds = new Set(nodes.flatMap((node) => typeof node.id === "string" ? [node.id] : []));
			if (!Array.isArray(value.edges) || value.edges.length < 1 || value.edges.length > 160) issues.push("visual.content.edges must contain 1 to 160 edges");
			else {
				const edges = value.edges.filter(record);
				if (edges.length !== value.edges.length) issues.push("visual.content.edges entries must be objects");
				uniqueIds(edges, "visual.content.edges", issues);
				for (const [index, edge] of edges.entries()) {
					const path = `visual.content.edges[${String(index)}]`;
					onlyKeys(edge, [
						"id",
						"from",
						"to",
						"label",
						"detail",
						"tone",
						"stroke",
						"directed"
					], path, issues);
					if (id(edge.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, edge.id, `${path}.id`, issues);
					if (typeof edge.from !== "string" || !nodeIds.has(edge.from)) issues.push(`${path}.from must reference a declared node`);
					if (typeof edge.to !== "string" || !nodeIds.has(edge.to)) issues.push(`${path}.to must reference a declared node`);
					if (edge.label !== void 0) text(edge.label, `${path}.label`, issues, 120);
					if (edge.detail !== void 0) text(edge.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(edge.tone, `${path}.tone`, issues);
					validateVisualStrokeV4(edge.stroke, `${path}.stroke`, issues);
					if (edge.directed !== void 0 && typeof edge.directed !== "boolean") issues.push(`${path}.directed must be a boolean`);
				}
			}
			return focusIds;
		}
		function validateSceneElementBaseV4(element, path, allowed, issues) {
			onlyKeys(element, [
				"type",
				"id",
				"label",
				"detail",
				"tone",
				...allowed
			], path, issues);
			id(element.id, `${path}.id`, issues);
			if (element.label !== void 0) text(element.label, `${path}.label`, issues, 120);
			if (element.detail !== void 0) text(element.detail, `${path}.detail`, issues, 1e3);
			validateVisualToneV4(element.tone, `${path}.tone`, issues);
		}
		function validateScene2DV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"xAxis",
				"yAxis",
				"grid",
				"elements"
			], "visual.content", issues);
			validateVisualAxisV3(value.xAxis, "visual.content.xAxis", issues, false);
			validateVisualAxisV3(value.yAxis, "visual.content.yAxis", issues, false);
			if (value.grid !== void 0 && typeof value.grid !== "boolean") issues.push("visual.content.grid must be a boolean");
			if (!Array.isArray(value.elements) || value.elements.length < 1 || value.elements.length > 64) {
				issues.push("visual.content.elements must contain 1 to 64 elements");
				return focusIds;
			}
			const elements = value.elements.filter(record);
			if (elements.length !== value.elements.length) issues.push("visual.content.elements entries must be objects");
			uniqueIds(elements, "visual.content.elements", issues);
			for (const [index, element] of elements.entries()) {
				const path = `visual.content.elements[${String(index)}]`;
				registerVisualIdV4(focusIds, element.id, `${path}.id`, issues);
				if (element.type === "point") {
					validateSceneElementBaseV4(element, path, [
						"x",
						"y",
						"size"
					], issues);
					finite(element.x, `${path}.x`, issues);
					finite(element.y, `${path}.y`, issues);
					if (element.size !== void 0 && finite(element.size, `${path}.size`, issues) && (element.size <= 0 || element.size > 64)) issues.push(`${path}.size must be greater than 0 and at most 64`);
				} else if (element.type === "segment" || element.type === "arrow") {
					validateSceneElementBaseV4(element, path, [
						"x1",
						"y1",
						"x2",
						"y2",
						"stroke"
					], issues);
					finite(element.x1, `${path}.x1`, issues);
					finite(element.y1, `${path}.y1`, issues);
					finite(element.x2, `${path}.x2`, issues);
					finite(element.y2, `${path}.y2`, issues);
					validateVisualStrokeV4(element.stroke, `${path}.stroke`, issues);
				} else if (element.type === "circle") {
					validateSceneElementBaseV4(element, path, [
						"cx",
						"cy",
						"r"
					], issues);
					finite(element.cx, `${path}.cx`, issues);
					finite(element.cy, `${path}.cy`, issues);
					if (finite(element.r, `${path}.r`, issues) && element.r <= 0) issues.push(`${path}.r must be positive`);
				} else if (element.type === "rect") {
					validateSceneElementBaseV4(element, path, [
						"x",
						"y",
						"width",
						"height"
					], issues);
					finite(element.x, `${path}.x`, issues);
					finite(element.y, `${path}.y`, issues);
					if (finite(element.width, `${path}.width`, issues) && element.width <= 0) issues.push(`${path}.width must be positive`);
					if (finite(element.height, `${path}.height`, issues) && element.height <= 0) issues.push(`${path}.height must be positive`);
				} else if (element.type === "polygon") {
					validateSceneElementBaseV4(element, path, ["points"], issues);
					if (!Array.isArray(element.points) || element.points.length < 3 || element.points.length > 24) issues.push(`${path}.points must contain 3 to 24 points`);
					else for (const [pointIndex, point] of element.points.entries()) {
						const pointPath = `${path}.points[${String(pointIndex)}]`;
						if (!record(point)) {
							issues.push(`${pointPath} must be an object`);
							continue;
						}
						onlyKeys(point, ["x", "y"], pointPath, issues);
						finite(point.x, `${pointPath}.x`, issues);
						finite(point.y, `${pointPath}.y`, issues);
					}
				} else if (element.type === "label") {
					validateSceneElementBaseV4(element, path, [
						"x",
						"y",
						"text"
					], issues);
					finite(element.x, `${path}.x`, issues);
					finite(element.y, `${path}.y`, issues);
					text(element.text, `${path}.text`, issues, 240);
				} else issues.push(`${path}.type must be point, segment, arrow, circle, rect, polygon, or label`);
			}
			return focusIds;
		}
		function validateRelationSubjectsV4(value, path, issues) {
			if (!Array.isArray(value) || value.length < 2 || value.length > 4) {
				issues.push(`${path} must contain 2 to 4 subjects`);
				return [];
			}
			const subjects = value.filter(record);
			if (subjects.length !== value.length) issues.push(`${path} entries must be objects`);
			uniqueIds(subjects, path, issues);
			for (const [index, subject] of subjects.entries()) {
				const itemPath = `${path}[${String(index)}]`;
				onlyKeys(subject, [
					"id",
					"label",
					"detail",
					"tone"
				], itemPath, issues);
				id(subject.id, `${itemPath}.id`, issues);
				text(subject.label, `${itemPath}.label`, issues, 120);
				if (subject.detail !== void 0) text(subject.detail, `${itemPath}.detail`, issues, 1e3);
				validateVisualToneV4(subject.tone, `${itemPath}.tone`, issues);
			}
			return subjects;
		}
		function validateRelationAxisV4(value, path, issues) {
			if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
				issues.push(`${path} must contain 1 to 10 items`);
				return [];
			}
			const items = value.filter(record);
			if (items.length !== value.length) issues.push(`${path} entries must be objects`);
			uniqueIds(items, path, issues);
			for (const [index, item] of items.entries()) {
				const itemPath = `${path}[${String(index)}]`;
				onlyKeys(item, ["id", "label"], itemPath, issues);
				id(item.id, `${itemPath}.id`, issues);
				text(item.label, `${itemPath}.label`, issues, 120);
			}
			return items;
		}
		function validateRelationV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			if (value.variant === "comparison") {
				onlyKeys(value, [
					"kind",
					"variant",
					"subjects",
					"rows"
				], "visual.content", issues);
				const subjects = validateRelationSubjectsV4(value.subjects, "visual.content.subjects", issues);
				const subjectIds = new Set(subjects.flatMap((subject) => typeof subject.id === "string" ? [subject.id] : []));
				for (const subjectId of subjectIds) registerVisualIdV4(focusIds, subjectId, "visual.content.subjects", issues);
				if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 16) {
					issues.push("visual.content.rows must contain 1 to 16 comparison rows");
					return focusIds;
				}
				const rows = value.rows.filter(record);
				if (rows.length !== value.rows.length) issues.push("visual.content.rows entries must be objects");
				uniqueIds(rows, "visual.content.rows", issues);
				for (const [index, row] of rows.entries()) {
					const path = `visual.content.rows[${String(index)}]`;
					onlyKeys(row, [
						"id",
						"label",
						"cells",
						"detail"
					], path, issues);
					if (id(row.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, row.id, `${path}.id`, issues);
					text(row.label, `${path}.label`, issues, 120);
					if (row.detail !== void 0) text(row.detail, `${path}.detail`, issues, 1e3);
					if (!Array.isArray(row.cells) || row.cells.length < 1 || row.cells.length > 4) {
						issues.push(`${path}.cells must contain 1 to 4 cells`);
						continue;
					}
					const seenSubjects = /* @__PURE__ */ new Set();
					for (const [cellIndex, cell] of row.cells.entries()) {
						const cellPath = `${path}.cells[${String(cellIndex)}]`;
						if (!record(cell)) {
							issues.push(`${cellPath} must be an object`);
							continue;
						}
						onlyKeys(cell, [
							"subjectId",
							"value",
							"tone"
						], cellPath, issues);
						if (typeof cell.subjectId !== "string" || !subjectIds.has(cell.subjectId)) issues.push(`${cellPath}.subjectId must reference a declared subject`);
						else if (seenSubjects.has(cell.subjectId)) issues.push(`${cellPath}.subjectId duplicates ${cell.subjectId}`);
						else seenSubjects.add(cell.subjectId);
						text(cell.value, `${cellPath}.value`, issues, 500);
						validateVisualToneV4(cell.tone, `${cellPath}.tone`, issues);
					}
				}
			} else if (value.variant === "matrix") {
				onlyKeys(value, [
					"kind",
					"variant",
					"rows",
					"columns",
					"cells"
				], "visual.content", issues);
				const rows = validateRelationAxisV4(value.rows, "visual.content.rows", issues);
				const columns = validateRelationAxisV4(value.columns, "visual.content.columns", issues);
				const rowIds = new Set(rows.flatMap((row) => typeof row.id === "string" ? [row.id] : []));
				const columnIds = new Set(columns.flatMap((column) => typeof column.id === "string" ? [column.id] : []));
				for (const rowId of rowIds) registerVisualIdV4(focusIds, rowId, "visual.content.rows", issues);
				for (const columnId of columnIds) registerVisualIdV4(focusIds, columnId, "visual.content.columns", issues);
				if (!Array.isArray(value.cells) || value.cells.length < 1 || value.cells.length > 64) {
					issues.push("visual.content.cells must contain 1 to 64 matrix cells");
					return focusIds;
				}
				const cells = value.cells.filter(record);
				if (cells.length !== value.cells.length) issues.push("visual.content.cells entries must be objects");
				uniqueIds(cells, "visual.content.cells", issues);
				const coordinates = /* @__PURE__ */ new Set();
				for (const [index, cell] of cells.entries()) {
					const path = `visual.content.cells[${String(index)}]`;
					onlyKeys(cell, [
						"id",
						"rowId",
						"columnId",
						"label",
						"detail",
						"tone"
					], path, issues);
					if (id(cell.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, cell.id, `${path}.id`, issues);
					if (typeof cell.rowId !== "string" || !rowIds.has(cell.rowId)) issues.push(`${path}.rowId must reference a declared row`);
					if (typeof cell.columnId !== "string" || !columnIds.has(cell.columnId)) issues.push(`${path}.columnId must reference a declared column`);
					if (typeof cell.rowId === "string" && typeof cell.columnId === "string") {
						const coordinate = `${cell.rowId}\u0000${cell.columnId}`;
						if (coordinates.has(coordinate)) issues.push(`${path} duplicates a matrix coordinate`);
						coordinates.add(coordinate);
					}
					text(cell.label, `${path}.label`, issues, 240);
					if (cell.detail !== void 0) text(cell.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(cell.tone, `${path}.tone`, issues);
				}
			} else if (value.variant === "sets") {
				onlyKeys(value, [
					"kind",
					"variant",
					"sets",
					"items"
				], "visual.content", issues);
				const sets = validateRelationSubjectsV4(value.sets, "visual.content.sets", issues);
				if (sets.length > 3) issues.push("visual.content.sets must contain at most 3 sets");
				const setIds = new Set(sets.flatMap((item) => typeof item.id === "string" ? [item.id] : []));
				for (const setId of setIds) registerVisualIdV4(focusIds, setId, "visual.content.sets", issues);
				if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 24) {
					issues.push("visual.content.items must contain 1 to 24 set items");
					return focusIds;
				}
				const items = value.items.filter(record);
				if (items.length !== value.items.length) issues.push("visual.content.items entries must be objects");
				uniqueIds(items, "visual.content.items", issues);
				for (const [index, item] of items.entries()) {
					const path = `visual.content.items[${String(index)}]`;
					onlyKeys(item, [
						"id",
						"label",
						"setIds",
						"detail"
					], path, issues);
					if (id(item.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, item.id, `${path}.id`, issues);
					text(item.label, `${path}.label`, issues, 120);
					if (item.detail !== void 0) text(item.detail, `${path}.detail`, issues, 1e3);
					if (!Array.isArray(item.setIds) || item.setIds.length < 1 || item.setIds.length > 3) issues.push(`${path}.setIds must contain 1 to 3 set ids`);
					else {
						const memberships = /* @__PURE__ */ new Set();
						for (const setId of item.setIds) if (typeof setId !== "string" || !setIds.has(setId)) issues.push(`${path}.setIds must reference declared sets`);
						else if (memberships.has(setId)) issues.push(`${path}.setIds duplicates ${setId}`);
						else memberships.add(setId);
					}
				}
			} else issues.push("visual.content.variant must be comparison, matrix, or sets");
			return focusIds;
		}
		function validateTimelineV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"orientation",
				"events",
				"eras"
			], "visual.content", issues);
			if (value.orientation !== void 0 && value.orientation !== "horizontal" && value.orientation !== "vertical") issues.push("visual.content.orientation must be horizontal or vertical");
			let events = [];
			if (!Array.isArray(value.events) || value.events.length < 2 || value.events.length > 32) issues.push("visual.content.events must contain 2 to 32 events");
			else {
				events = value.events.filter(record);
				if (events.length !== value.events.length) issues.push("visual.content.events entries must be objects");
				uniqueIds(events, "visual.content.events", issues);
				const hasPositions = events.filter((event) => event.position !== void 0).length;
				if (hasPositions !== 0 && hasPositions !== events.length) issues.push("visual.content.events.position must be provided for every event or omitted for every event");
				let previousPosition = -1;
				for (const [index, event] of events.entries()) {
					const path = `visual.content.events[${String(index)}]`;
					onlyKeys(event, [
						"id",
						"time",
						"label",
						"detail",
						"position",
						"tone"
					], path, issues);
					if (id(event.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, event.id, `${path}.id`, issues);
					text(event.time, `${path}.time`, issues, 80);
					text(event.label, `${path}.label`, issues, 160);
					if (event.detail !== void 0) text(event.detail, `${path}.detail`, issues, 1500);
					if (event.position !== void 0 && finite(event.position, `${path}.position`, issues)) {
						const position = event.position;
						if (position < 0 || position > 1) issues.push(`${path}.position must be from 0 to 1`);
						if (position <= previousPosition) issues.push(`${path}.position must be greater than the preceding event position`);
						previousPosition = position;
					}
					validateVisualToneV4(event.tone, `${path}.tone`, issues);
				}
			}
			const eventIds = new Set(events.flatMap((event) => typeof event.id === "string" ? [event.id] : []));
			const eventIndexes = new Map(events.flatMap((event, index) => typeof event.id === "string" ? [[event.id, index]] : []));
			if (value.eras !== void 0) {
				if (!Array.isArray(value.eras) || value.eras.length < 1 || value.eras.length > 8) issues.push("visual.content.eras must contain 1 to 8 eras");
				else {
					const eras = value.eras.filter(record);
					if (eras.length !== value.eras.length) issues.push("visual.content.eras entries must be objects");
					uniqueIds(eras, "visual.content.eras", issues);
					for (const [index, era] of eras.entries()) {
						const path = `visual.content.eras[${String(index)}]`;
						onlyKeys(era, [
							"id",
							"label",
							"startEventId",
							"endEventId",
							"detail",
							"tone"
						], path, issues);
						if (id(era.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, era.id, `${path}.id`, issues);
						text(era.label, `${path}.label`, issues, 120);
						if (typeof era.startEventId !== "string" || !eventIds.has(era.startEventId)) issues.push(`${path}.startEventId must reference a declared event`);
						if (typeof era.endEventId !== "string" || !eventIds.has(era.endEventId)) issues.push(`${path}.endEventId must reference a declared event`);
						if (typeof era.startEventId === "string" && typeof era.endEventId === "string") {
							const startIndex = eventIndexes.get(era.startEventId);
							const endIndex = eventIndexes.get(era.endEventId);
							if (startIndex !== void 0 && endIndex !== void 0 && startIndex > endIndex) issues.push(`${path}.startEventId must not occur after endEventId`);
						}
						if (era.detail !== void 0) text(era.detail, `${path}.detail`, issues, 1e3);
						validateVisualToneV4(era.tone, `${path}.tone`, issues);
					}
				}
			}
			return focusIds;
		}
		function validateFormulaStepsV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"notation",
				"steps",
				"conclusion"
			], "visual.content", issues);
			if (value.notation !== void 0) text(value.notation, "visual.content.notation", issues, 300);
			if (value.conclusion !== void 0) text(value.conclusion, "visual.content.conclusion", issues, 1e3);
			if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) {
				issues.push("visual.content.steps must contain 2 to 16 formula steps");
				return focusIds;
			}
			const steps = value.steps.filter(record);
			if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
			uniqueIds(steps, "visual.content.steps", issues);
			for (const [index, step] of steps.entries()) {
				const path = `visual.content.steps[${String(index)}]`;
				onlyKeys(step, [
					"id",
					"expression",
					"label",
					"rule",
					"detail",
					"tone"
				], path, issues);
				if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
				text(step.expression, `${path}.expression`, issues, 500);
				if (step.label !== void 0) text(step.label, `${path}.label`, issues, 120);
				if (step.rule !== void 0) text(step.rule, `${path}.rule`, issues, 240);
				if (step.detail !== void 0) text(step.detail, `${path}.detail`, issues, 1500);
				validateVisualToneV4(step.tone, `${path}.tone`, issues);
			}
			return focusIds;
		}
		function validateStudyMapV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"sourceLabel",
				"goal",
				"sections",
				"concepts"
			], "visual.content", issues);
			text(value.sourceLabel, "visual.content.sourceLabel", issues, 240);
			if (value.goal !== void 0) text(value.goal, "visual.content.goal", issues, 600);
			let sections = [];
			if (!Array.isArray(value.sections) || value.sections.length < 1 || value.sections.length > 16) issues.push("visual.content.sections must contain 1 to 16 sections");
			else {
				sections = value.sections.filter(record);
				if (sections.length !== value.sections.length) issues.push("visual.content.sections entries must be objects");
				uniqueIds(sections, "visual.content.sections", issues);
				for (const [index, section] of sections.entries()) {
					const path = `visual.content.sections[${String(index)}]`;
					onlyKeys(section, [
						"id",
						"label",
						"anchor",
						"summary"
					], path, issues);
					if (id(section.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, section.id, `${path}.id`, issues);
					text(section.label, `${path}.label`, issues, 160);
					if (section.anchor !== void 0) text(section.anchor, `${path}.anchor`, issues, 160);
					if (section.summary !== void 0) text(section.summary, `${path}.summary`, issues, 1e3);
				}
			}
			const sectionIds = new Set(sections.flatMap((section) => typeof section.id === "string" ? [section.id] : []));
			let concepts = [];
			if (!Array.isArray(value.concepts) || value.concepts.length < 1 || value.concepts.length > 48) issues.push("visual.content.concepts must contain 1 to 48 concepts");
			else {
				concepts = value.concepts.filter(record);
				if (concepts.length !== value.concepts.length) issues.push("visual.content.concepts entries must be objects");
				uniqueIds(concepts, "visual.content.concepts", issues);
				for (const [index, concept] of concepts.entries()) {
					const path = `visual.content.concepts[${String(index)}]`;
					onlyKeys(concept, [
						"id",
						"label",
						"sectionId",
						"detail",
						"prerequisiteIds",
						"role",
						"tone"
					], path, issues);
					if (id(concept.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, concept.id, `${path}.id`, issues);
					text(concept.label, `${path}.label`, issues, 160);
					if (typeof concept.sectionId !== "string" || !sectionIds.has(concept.sectionId)) issues.push(`${path}.sectionId must reference a declared section`);
					if (concept.detail !== void 0) text(concept.detail, `${path}.detail`, issues, 1500);
					if (concept.role !== void 0 && ![
						"foundation",
						"core",
						"extension",
						"practice"
					].includes(concept.role)) issues.push(`${path}.role must be foundation, core, extension, or practice`);
					validateVisualToneV4(concept.tone, `${path}.tone`, issues);
				}
			}
			const conceptIds = new Set(concepts.flatMap((concept) => typeof concept.id === "string" ? [concept.id] : []));
			const prerequisiteGraph = /* @__PURE__ */ new Map();
			for (const [index, concept] of concepts.entries()) {
				if (concept.prerequisiteIds === void 0) continue;
				const path = `visual.content.concepts[${String(index)}].prerequisiteIds`;
				if (!Array.isArray(concept.prerequisiteIds) || concept.prerequisiteIds.length > 8) {
					issues.push(`${path} must contain at most 8 concept ids`);
					continue;
				}
				const seen = /* @__PURE__ */ new Set();
				for (const prerequisiteId of concept.prerequisiteIds) if (typeof prerequisiteId !== "string" || !conceptIds.has(prerequisiteId)) issues.push(`${path} must reference declared concepts`);
				else if (prerequisiteId === concept.id) issues.push(`${path} must not reference its own concept`);
				else if (seen.has(prerequisiteId)) issues.push(`${path} duplicates ${prerequisiteId}`);
				else seen.add(prerequisiteId);
				if (typeof concept.id === "string") prerequisiteGraph.set(concept.id, [...seen]);
			}
			const visited = /* @__PURE__ */ new Set();
			const visiting = /* @__PURE__ */ new Set();
			const visit = (conceptId) => {
				if (visiting.has(conceptId)) return true;
				if (visited.has(conceptId)) return false;
				visiting.add(conceptId);
				const cyclic = (prerequisiteGraph.get(conceptId) ?? []).some(visit);
				visiting.delete(conceptId);
				visited.add(conceptId);
				return cyclic;
			};
			if ([...conceptIds].some(visit)) issues.push("visual.content.concepts prerequisiteIds must not contain a cycle");
			return focusIds;
		}
		function validateRecallDeckV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"instructions",
				"cards"
			], "visual.content", issues);
			if (value.instructions !== void 0) text(value.instructions, "visual.content.instructions", issues, 600);
			if (!Array.isArray(value.cards) || value.cards.length < 2 || value.cards.length > 32) {
				issues.push("visual.content.cards must contain 2 to 32 cards");
				return focusIds;
			}
			const cards = value.cards.filter(record);
			if (cards.length !== value.cards.length) issues.push("visual.content.cards entries must be objects");
			uniqueIds(cards, "visual.content.cards", issues);
			for (const [index, card] of cards.entries()) {
				const path = `visual.content.cards[${String(index)}]`;
				onlyKeys(card, [
					"id",
					"prompt",
					"answer",
					"hint",
					"tags"
				], path, issues);
				if (id(card.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, card.id, `${path}.id`, issues);
				text(card.prompt, `${path}.prompt`, issues, 1e3);
				text(card.answer, `${path}.answer`, issues, 2e3);
				if (card.hint !== void 0) text(card.hint, `${path}.hint`, issues, 800);
				if (card.tags !== void 0) {
					if (!Array.isArray(card.tags) || card.tags.length > 6) issues.push(`${path}.tags must contain at most 6 labels`);
					else {
						const seen = /* @__PURE__ */ new Set();
						for (const [tagIndex, tag] of card.tags.entries()) if (text(tag, `${path}.tags[${String(tagIndex)}]`, issues, 80) && typeof tag === "string") {
							if (seen.has(tag)) issues.push(`${path}.tags duplicates ${tag}`);
							else seen.add(tag);
						}
					}
				}
			}
			return focusIds;
		}
		function validateTableValueV4(value, path, issues) {
			if (value === null || typeof value === "string" || typeof value === "boolean") return true;
			if (typeof value === "number" && Number.isFinite(value)) return true;
			issues.push(`${path} must be a string, number, boolean, or null`);
			return false;
		}
		function validateDataTableV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"columns",
				"rows",
				"outlierIds",
				"initialSort",
				"initialFilter",
				"chart"
			], "visual.content", issues);
			let columns = [];
			if (!Array.isArray(value.columns) || value.columns.length < 1 || value.columns.length > 24) issues.push("visual.content.columns must contain 1 to 24 columns");
			else {
				columns = value.columns.filter(record);
				if (columns.length !== value.columns.length) issues.push("visual.content.columns entries must be objects");
				uniqueIds(columns, "visual.content.columns", issues);
				for (const [index, column] of columns.entries()) {
					const path = `visual.content.columns[${String(index)}]`;
					onlyKeys(column, [
						"id",
						"label",
						"type",
						"unit"
					], path, issues);
					if (id(column.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, column.id, `${path}.id`, issues);
					text(column.label, `${path}.label`, issues, 160);
					if (![
						"string",
						"number",
						"boolean",
						"date"
					].includes(column.type)) issues.push(`${path}.type must be string, number, boolean, or date`);
					if (column.unit !== void 0) text(column.unit, `${path}.unit`, issues, 80);
				}
			}
			const columnIds = new Set(columns.flatMap((column) => typeof column.id === "string" ? [column.id] : []));
			const columnTypes = new Map(columns.flatMap((column) => typeof column.id === "string" && typeof column.type === "string" ? [[column.id, column.type]] : []));
			let rows = [];
			if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 128) issues.push("visual.content.rows must contain 1 to 128 rows");
			else {
				rows = value.rows.filter(record);
				if (rows.length !== value.rows.length) issues.push("visual.content.rows entries must be objects");
				uniqueIds(rows, "visual.content.rows", issues);
				for (const [index, row] of rows.entries()) {
					const path = `visual.content.rows[${String(index)}]`;
					onlyKeys(row, [
						"id",
						"cells",
						"detail"
					], path, issues);
					if (id(row.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, row.id, `${path}.id`, issues);
					if (row.detail !== void 0) text(row.detail, `${path}.detail`, issues, 1e3);
					if (!Array.isArray(row.cells) || row.cells.length < 1 || row.cells.length > 24) {
						issues.push(`${path}.cells must contain 1 to 24 cells`);
						continue;
					}
					const seen = /* @__PURE__ */ new Set();
					for (const [cellIndex, cell] of row.cells.entries()) {
						const cellPath = `${path}.cells[${String(cellIndex)}]`;
						if (!record(cell)) {
							issues.push(`${cellPath} must be an object`);
							continue;
						}
						onlyKeys(cell, ["columnId", "value"], cellPath, issues);
						if (typeof cell.columnId !== "string" || !columnIds.has(cell.columnId)) issues.push(`${cellPath}.columnId must reference a declared column`);
						else if (seen.has(cell.columnId)) issues.push(`${cellPath}.columnId duplicates ${cell.columnId}`);
						else seen.add(cell.columnId);
						const valueOk = validateTableValueV4(cell.value, `${cellPath}.value`, issues);
						const expected = typeof cell.columnId === "string" ? columnTypes.get(cell.columnId) : void 0;
						if (valueOk && cell.value !== null && expected !== void 0 && (expected === "number" && typeof cell.value !== "number" || expected === "boolean" && typeof cell.value !== "boolean" || (expected === "string" || expected === "date") && typeof cell.value !== "string")) issues.push(`${cellPath}.value does not match column type ${expected}`);
					}
				}
			}
			const rowIds = new Set(rows.flatMap((row) => typeof row.id === "string" ? [row.id] : []));
			if (value.outlierIds !== void 0) {
				if (!Array.isArray(value.outlierIds) || value.outlierIds.length > 32) issues.push("visual.content.outlierIds must contain at most 32 row ids");
				else {
					const seen = /* @__PURE__ */ new Set();
					for (const [index, rowId] of value.outlierIds.entries()) {
						const path = `visual.content.outlierIds[${String(index)}]`;
						if (typeof rowId !== "string" || !rowIds.has(rowId)) issues.push(`${path} must reference a declared row`);
						else if (seen.has(rowId)) issues.push(`${path} duplicates ${rowId}`);
						else seen.add(rowId);
					}
				}
			}
			const validateColumnRef = (candidate, path) => {
				if (typeof candidate !== "string" || !columnIds.has(candidate)) issues.push(`${path} must reference a declared column`);
			};
			if (value.initialSort !== void 0) {
				if (!record(value.initialSort)) issues.push("visual.content.initialSort must be an object");
				else {
					onlyKeys(value.initialSort, ["columnId", "direction"], "visual.content.initialSort", issues);
					validateColumnRef(value.initialSort.columnId, "visual.content.initialSort.columnId");
					if (value.initialSort.direction !== "asc" && value.initialSort.direction !== "desc") issues.push("visual.content.initialSort.direction must be asc or desc");
				}
			}
			if (value.initialFilter !== void 0) {
				if (!record(value.initialFilter)) issues.push("visual.content.initialFilter must be an object");
				else {
					onlyKeys(value.initialFilter, [
						"columnId",
						"operator",
						"value"
					], "visual.content.initialFilter", issues);
					validateColumnRef(value.initialFilter.columnId, "visual.content.initialFilter.columnId");
					if (![
						"equals",
						"not_equals",
						"contains",
						"gt",
						"gte",
						"lt",
						"lte"
					].includes(value.initialFilter.operator)) issues.push("visual.content.initialFilter.operator is unknown");
					validateTableValueV4(value.initialFilter.value, "visual.content.initialFilter.value", issues);
				}
			}
			if (value.chart !== void 0) {
				if (!record(value.chart)) issues.push("visual.content.chart must be an object");
				else {
					onlyKeys(value.chart, [
						"type",
						"xColumnId",
						"yColumnId",
						"seriesColumnId"
					], "visual.content.chart", issues);
					if (![
						"line",
						"bar",
						"scatter"
					].includes(value.chart.type)) issues.push("visual.content.chart.type is unknown");
					validateColumnRef(value.chart.xColumnId, "visual.content.chart.xColumnId");
					validateColumnRef(value.chart.yColumnId, "visual.content.chart.yColumnId");
					if (value.chart.seriesColumnId !== void 0) validateColumnRef(value.chart.seriesColumnId, "visual.content.chart.seriesColumnId");
				}
			}
			return focusIds;
		}
		function validateStateTransitionV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"states",
				"transitions",
				"steps"
			], "visual.content", issues);
			let states = [];
			if (!Array.isArray(value.states) || value.states.length < 2 || value.states.length > 32) issues.push("visual.content.states must contain 2 to 32 states");
			else {
				states = value.states.filter(record);
				if (states.length !== value.states.length) issues.push("visual.content.states entries must be objects");
				uniqueIds(states, "visual.content.states", issues);
				for (const [index, state] of states.entries()) {
					const path = `visual.content.states[${String(index)}]`;
					onlyKeys(state, [
						"id",
						"label",
						"detail",
						"tone",
						"initial",
						"final"
					], path, issues);
					if (id(state.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, state.id, `${path}.id`, issues);
					text(state.label, `${path}.label`, issues, 160);
					if (state.detail !== void 0) text(state.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(state.tone, `${path}.tone`, issues);
					if (state.initial !== void 0 && typeof state.initial !== "boolean") issues.push(`${path}.initial must be a boolean`);
					if (state.final !== void 0 && typeof state.final !== "boolean") issues.push(`${path}.final must be a boolean`);
				}
			}
			const stateIds = new Set(states.flatMap((state) => typeof state.id === "string" ? [state.id] : []));
			let transitions = [];
			if (!Array.isArray(value.transitions) || value.transitions.length < 1 || value.transitions.length > 96) issues.push("visual.content.transitions must contain 1 to 96 transitions");
			else {
				transitions = value.transitions.filter(record);
				if (transitions.length !== value.transitions.length) issues.push("visual.content.transitions entries must be objects");
				uniqueIds(transitions, "visual.content.transitions", issues);
				for (const [index, transition] of transitions.entries()) {
					const path = `visual.content.transitions[${String(index)}]`;
					onlyKeys(transition, [
						"id",
						"from",
						"to",
						"trigger",
						"guard",
						"action",
						"detail",
						"tone"
					], path, issues);
					if (id(transition.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, transition.id, `${path}.id`, issues);
					if (typeof transition.from !== "string" || !stateIds.has(transition.from)) issues.push(`${path}.from must reference a declared state`);
					if (typeof transition.to !== "string" || !stateIds.has(transition.to)) issues.push(`${path}.to must reference a declared state`);
					text(transition.trigger, `${path}.trigger`, issues, 240);
					if (transition.guard !== void 0) text(transition.guard, `${path}.guard`, issues, 500);
					if (transition.action !== void 0) text(transition.action, `${path}.action`, issues, 500);
					if (transition.detail !== void 0) text(transition.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(transition.tone, `${path}.tone`, issues);
				}
			}
			const transitionIds = new Set(transitions.flatMap((transition) => typeof transition.id === "string" ? [transition.id] : []));
			if (value.steps !== void 0) {
				if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) issues.push("visual.content.steps must contain 2 to 16 steps");
				else {
					const steps = value.steps.filter(record);
					if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
					uniqueIds(steps, "visual.content.steps", issues);
					for (const [index, step] of steps.entries()) {
						const path = `visual.content.steps[${String(index)}]`;
						onlyKeys(step, [
							"id",
							"label",
							"currentStateId",
							"transitionId",
							"description"
						], path, issues);
						if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
						text(step.label, `${path}.label`, issues, 160);
						if (typeof step.currentStateId !== "string" || !stateIds.has(step.currentStateId)) issues.push(`${path}.currentStateId must reference a declared state`);
						if (step.transitionId !== void 0 && (typeof step.transitionId !== "string" || !transitionIds.has(step.transitionId))) issues.push(`${path}.transitionId must reference a declared transition`);
						if (step.description !== void 0) text(step.description, `${path}.description`, issues, 1e3);
					}
				}
			}
			return focusIds;
		}
		function validateSequenceBufferV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"slots",
				"pointers",
				"ranges",
				"steps"
			], "visual.content", issues);
			let slots = [];
			if (!Array.isArray(value.slots) || value.slots.length < 1 || value.slots.length > 128) issues.push("visual.content.slots must contain 1 to 128 slots");
			else {
				slots = value.slots.filter(record);
				if (slots.length !== value.slots.length) issues.push("visual.content.slots entries must be objects");
				uniqueIds(slots, "visual.content.slots", issues);
				const indexes = /* @__PURE__ */ new Set();
				for (const [index, slot] of slots.entries()) {
					const path = `visual.content.slots[${String(index)}]`;
					onlyKeys(slot, [
						"id",
						"index",
						"value",
						"label",
						"tone"
					], path, issues);
					if (id(slot.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, slot.id, `${path}.id`, issues);
					if (!integer(slot.index, `${path}.index`, issues)) continue;
					if (indexes.has(slot.index)) issues.push(`${path}.index duplicates ${String(slot.index)}`);
					indexes.add(slot.index);
					validateTableValueV4(slot.value, `${path}.value`, issues);
					if (slot.label !== void 0) text(slot.label, `${path}.label`, issues, 120);
					validateVisualToneV4(slot.tone, `${path}.tone`, issues);
				}
			}
			const slotIds = new Set(slots.flatMap((slot) => typeof slot.id === "string" ? [slot.id] : []));
			const slotIndexes = new Set(slots.flatMap((slot) => typeof slot.index === "number" && Number.isInteger(slot.index) ? [slot.index] : []));
			const maxIndex = slots.reduce((max, slot) => typeof slot.index === "number" ? Math.max(max, slot.index) : max, -1);
			let pointers = [];
			if (value.pointers !== void 0) {
				if (!Array.isArray(value.pointers) || value.pointers.length < 1 || value.pointers.length > 8) issues.push("visual.content.pointers must contain 1 to 8 pointers");
				else {
					pointers = value.pointers.filter(record);
					if (pointers.length !== value.pointers.length) issues.push("visual.content.pointers entries must be objects");
					uniqueIds(pointers, "visual.content.pointers", issues);
					for (const [index, pointer] of pointers.entries()) {
						const path = `visual.content.pointers[${String(index)}]`;
						onlyKeys(pointer, [
							"id",
							"label",
							"index",
							"tone"
						], path, issues);
						if (id(pointer.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, pointer.id, `${path}.id`, issues);
						text(pointer.label, `${path}.label`, issues, 120);
						if (integer(pointer.index, `${path}.index`, issues) && pointer.index > maxIndex + 1) issues.push(`${path}.index must point within the buffer`);
						validateVisualToneV4(pointer.tone, `${path}.tone`, issues);
					}
				}
			}
			const pointerIds = new Set(pointers.flatMap((pointer) => typeof pointer.id === "string" ? [pointer.id] : []));
			let ranges = [];
			if (value.ranges !== void 0) {
				if (!Array.isArray(value.ranges) || value.ranges.length < 1 || value.ranges.length > 8) issues.push("visual.content.ranges must contain 1 to 8 ranges");
				else {
					ranges = value.ranges.filter(record);
					if (ranges.length !== value.ranges.length) issues.push("visual.content.ranges entries must be objects");
					uniqueIds(ranges, "visual.content.ranges", issues);
					for (const [index, range] of ranges.entries()) {
						const path = `visual.content.ranges[${String(index)}]`;
						onlyKeys(range, [
							"id",
							"label",
							"start",
							"end",
							"tone"
						], path, issues);
						if (id(range.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, range.id, `${path}.id`, issues);
						text(range.label, `${path}.label`, issues, 120);
						const startOk = integer(range.start, `${path}.start`, issues);
						const endOk = integer(range.end, `${path}.end`, issues);
						if (startOk && !slotIndexes.has(range.start)) issues.push(`${path}.start must reference a declared slot index`);
						if (endOk && !slotIndexes.has(range.end)) issues.push(`${path}.end must reference a declared slot index`);
						if (startOk && endOk && range.start > range.end) issues.push(`${path}.start must not exceed end`);
						validateVisualToneV4(range.tone, `${path}.tone`, issues);
					}
				}
			}
			const rangeIds = new Set(ranges.flatMap((range) => typeof range.id === "string" ? [range.id] : []));
			if (value.steps !== void 0) {
				if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) issues.push("visual.content.steps must contain 2 to 16 snapshots");
				else {
					const steps = value.steps.filter(record);
					if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
					uniqueIds(steps, "visual.content.steps", issues);
					for (const [index, step] of steps.entries()) {
						const path = `visual.content.steps[${String(index)}]`;
						onlyKeys(step, [
							"id",
							"label",
							"description",
							"slots",
							"pointers",
							"ranges"
						], path, issues);
						if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
						text(step.label, `${path}.label`, issues, 160);
						if (step.description !== void 0) text(step.description, `${path}.description`, issues, 1e3);
						if (step.slots !== void 0) {
							if (!Array.isArray(step.slots) || step.slots.length > 128) issues.push(`${path}.slots must contain at most 128 snapshots`);
							else for (const [snapshotIndex, snapshot] of step.slots.entries()) {
								const snapshotPath = `${path}.slots[${String(snapshotIndex)}]`;
								if (!record(snapshot)) {
									issues.push(`${snapshotPath} must be an object`);
									continue;
								}
								onlyKeys(snapshot, ["slotId", "value"], snapshotPath, issues);
								if (typeof snapshot.slotId !== "string" || !slotIds.has(snapshot.slotId)) issues.push(`${snapshotPath}.slotId must reference a declared slot`);
								if (snapshot.value !== void 0) validateTableValueV4(snapshot.value, `${snapshotPath}.value`, issues);
							}
						}
						if (step.pointers !== void 0) {
							if (!Array.isArray(step.pointers) || step.pointers.length > 8) issues.push(`${path}.pointers must contain at most 8 snapshots`);
							else for (const [snapshotIndex, snapshot] of step.pointers.entries()) {
								const snapshotPath = `${path}.pointers[${String(snapshotIndex)}]`;
								if (!record(snapshot)) {
									issues.push(`${snapshotPath} must be an object`);
									continue;
								}
								onlyKeys(snapshot, ["pointerId", "index"], snapshotPath, issues);
								if (typeof snapshot.pointerId !== "string" || !pointerIds.has(snapshot.pointerId)) issues.push(`${snapshotPath}.pointerId must reference a declared pointer`);
								if (integer(snapshot.index, `${snapshotPath}.index`, issues) && snapshot.index > maxIndex + 1) issues.push(`${snapshotPath}.index must point within the buffer`);
							}
						}
						if (step.ranges !== void 0) {
							if (!Array.isArray(step.ranges) || step.ranges.length > 8) issues.push(`${path}.ranges must contain at most 8 snapshots`);
							else for (const [snapshotIndex, snapshot] of step.ranges.entries()) {
								const snapshotPath = `${path}.ranges[${String(snapshotIndex)}]`;
								if (!record(snapshot)) {
									issues.push(`${snapshotPath} must be an object`);
									continue;
								}
								onlyKeys(snapshot, [
									"rangeId",
									"start",
									"end"
								], snapshotPath, issues);
								if (typeof snapshot.rangeId !== "string" || !rangeIds.has(snapshot.rangeId)) issues.push(`${snapshotPath}.rangeId must reference a declared range`);
								const startOk = integer(snapshot.start, `${snapshotPath}.start`, issues);
								const endOk = integer(snapshot.end, `${snapshotPath}.end`, issues);
								if (startOk && !slotIndexes.has(snapshot.start)) issues.push(`${snapshotPath}.start must reference a declared slot index`);
								if (endOk && !slotIndexes.has(snapshot.end)) issues.push(`${snapshotPath}.end must reference a declared slot index`);
								if (startOk && endOk && snapshot.start > snapshot.end) issues.push(`${snapshotPath}.start must not exceed end`);
							}
						}
					}
				}
			}
			return focusIds;
		}
		function validateSequenceDiagramV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"participants",
				"messages"
			], "visual.content", issues);
			let participants = [];
			if (!Array.isArray(value.participants) || value.participants.length < 2 || value.participants.length > 16) issues.push("visual.content.participants must contain 2 to 16 participants");
			else {
				participants = value.participants.filter(record);
				if (participants.length !== value.participants.length) issues.push("visual.content.participants entries must be objects");
				uniqueIds(participants, "visual.content.participants", issues);
				for (const [index, participant] of participants.entries()) {
					const path = `visual.content.participants[${String(index)}]`;
					onlyKeys(participant, [
						"id",
						"label",
						"detail",
						"tone"
					], path, issues);
					if (id(participant.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, participant.id, `${path}.id`, issues);
					text(participant.label, `${path}.label`, issues, 160);
					if (participant.detail !== void 0) text(participant.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(participant.tone, `${path}.tone`, issues);
				}
			}
			const participantIds = new Set(participants.flatMap((participant) => typeof participant.id === "string" ? [participant.id] : []));
			if (!Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 96) issues.push("visual.content.messages must contain 1 to 96 messages");
			else {
				const messages = value.messages.filter(record);
				if (messages.length !== value.messages.length) issues.push("visual.content.messages entries must be objects");
				uniqueIds(messages, "visual.content.messages", issues);
				for (const [index, message] of messages.entries()) {
					const path = `visual.content.messages[${String(index)}]`;
					onlyKeys(message, [
						"id",
						"from",
						"to",
						"label",
						"type",
						"detail",
						"tone"
					], path, issues);
					if (id(message.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, message.id, `${path}.id`, issues);
					if (typeof message.from !== "string" || !participantIds.has(message.from)) issues.push(`${path}.from must reference a declared participant`);
					if (typeof message.to !== "string" || !participantIds.has(message.to)) issues.push(`${path}.to must reference a declared participant`);
					text(message.label, `${path}.label`, issues, 240);
					if (![
						"sync",
						"async",
						"return",
						"self"
					].includes(message.type)) issues.push(`${path}.type must be sync, async, return, or self`);
					if (message.type === "self" && message.from !== message.to) issues.push(`${path}.self messages must have matching from and to participants`);
					if (message.detail !== void 0) text(message.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(message.tone, `${path}.tone`, issues);
				}
			}
			return focusIds;
		}
		function validateCodeTraceV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"language",
				"code",
				"lines",
				"steps"
			], "visual.content", issues);
			text(value.language, "visual.content.language", issues, 40);
			text(value.code, "visual.content.code", issues, 24e3);
			const lineNumbers = /* @__PURE__ */ new Set();
			if (!Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 256) issues.push("visual.content.lines must contain 1 to 256 lines");
			else {
				const lines = value.lines.filter(record);
				if (lines.length !== value.lines.length) issues.push("visual.content.lines entries must be objects");
				let previousLine = -1;
				for (const [index, line] of lines.entries()) {
					const path = `visual.content.lines[${String(index)}]`;
					onlyKeys(line, ["number", "text"], path, issues);
					if (integer(line.number, `${path}.number`, issues)) {
						lineNumbers.add(line.number);
						if (line.number <= previousLine) issues.push(`${path}.number must increase in source order`);
						previousLine = line.number;
					}
					if (typeof line.text !== "string") issues.push(`${path}.text must be a string`);
					else if (line.text.length > 1e3) issues.push(`${path}.text exceeds 1000 characters`);
				}
			}
			if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 32) issues.push("visual.content.steps must contain 2 to 32 execution steps");
			else {
				const steps = value.steps.filter(record);
				if (steps.length !== value.steps.length) issues.push("visual.content.steps entries must be objects");
				uniqueIds(steps, "visual.content.steps", issues);
				for (const [index, step] of steps.entries()) {
					const path = `visual.content.steps[${String(index)}]`;
					onlyKeys(step, [
						"id",
						"label",
						"currentLine",
						"variables",
						"stack",
						"output",
						"description"
					], path, issues);
					if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues);
					text(step.label, `${path}.label`, issues, 160);
					if (integer(step.currentLine, `${path}.currentLine`, issues) && !lineNumbers.has(step.currentLine)) issues.push(`${path}.currentLine must reference a declared source line`);
					if (!Array.isArray(step.variables) || step.variables.length > 32) issues.push(`${path}.variables must contain at most 32 variables`);
					else {
						const variables = step.variables.filter(record);
						if (variables.length !== step.variables.length) issues.push(`${path}.variables entries must be objects`);
						const names = /* @__PURE__ */ new Set();
						for (const [variableIndex, variable] of variables.entries()) {
							const variablePath = `${path}.variables[${String(variableIndex)}]`;
							onlyKeys(variable, [
								"name",
								"value",
								"type"
							], variablePath, issues);
							if (typeof variable.name !== "string" || variable.name.trim() === "") issues.push(`${variablePath}.name must be a non-empty string`);
							else if (names.has(variable.name)) issues.push(`${variablePath}.name duplicates ${variable.name}`);
							else names.add(variable.name);
							validateTableValueV4(variable.value, `${variablePath}.value`, issues);
							if (variable.type !== void 0) text(variable.type, `${variablePath}.type`, issues, 80);
						}
					}
					if (!Array.isArray(step.stack) || step.stack.length > 16) issues.push(`${path}.stack must contain at most 16 frames`);
					else {
						const stack = step.stack.filter(record);
						if (stack.length !== step.stack.length) issues.push(`${path}.stack entries must be objects`);
						uniqueIds(stack, `${path}.stack`, issues);
						for (const [frameIndex, frame] of stack.entries()) {
							const framePath = `${path}.stack[${String(frameIndex)}]`;
							onlyKeys(frame, [
								"id",
								"function",
								"line"
							], framePath, issues);
							id(frame.id, `${framePath}.id`, issues);
							text(frame.function, `${framePath}.function`, issues, 160);
							if (frame.line !== void 0 && integer(frame.line, `${framePath}.line`, issues) && !lineNumbers.has(frame.line)) issues.push(`${framePath}.line must reference a declared source line`);
						}
					}
					if (step.output !== void 0 && typeof step.output !== "string") issues.push(`${path}.output must be a string`);
					else if (step.output !== void 0 && step.output.length > 4e3) issues.push(`${path}.output exceeds 4000 characters`);
					if (step.description !== void 0) text(step.description, `${path}.description`, issues, 1e3);
				}
			}
			return focusIds;
		}
		function validateFieldGridV4(value, path, issues, components) {
			if (!record(value)) {
				issues.push(`${path} must be an object`);
				return;
			}
			onlyKeys(value, components === "scalar" ? [
				"columns",
				"rows",
				"values"
			] : [
				"columns",
				"rows",
				"u",
				"v"
			], path, issues);
			const columnsOk = integer(value.columns, `${path}.columns`, issues, 2) && value.columns <= 64;
			const rowsOk = integer(value.rows, `${path}.rows`, issues, 2) && value.rows <= 64;
			const expected = columnsOk && rowsOk ? value.columns * value.rows : void 0;
			if (components === "scalar") {
				if (!Array.isArray(value.values) || value.values.length < 1 || value.values.length > 4096) issues.push(`${path}.values must contain sampled values`);
				else {
					if (expected !== void 0 && value.values.length !== expected) issues.push(`${path}.values length must equal rows * columns`);
					for (const [index, sample] of value.values.entries()) finite(sample, `${path}.values[${String(index)}]`, issues);
				}
			} else for (const component of ["u", "v"]) {
				const samples = value[component];
				if (!Array.isArray(samples) || samples.length < 1 || samples.length > 4096) issues.push(`${path}.${component} must contain sampled values`);
				else {
					if (expected !== void 0 && samples.length !== expected) issues.push(`${path}.${component} length must equal rows * columns`);
					for (const [index, sample] of samples.entries()) finite(sample, `${path}.${component}[${String(index)}]`, issues);
				}
			}
		}
		function validateFieldAxisV4(value, path, issues) {
			if (!record(value)) {
				issues.push(`${path} must be an object`);
				return;
			}
			onlyKeys(value, [
				"label",
				"min",
				"max",
				"samples"
			], path, issues);
			if (value.label !== void 0) text(value.label, `${path}.label`, issues, 120);
			const minOk = finite(value.min, `${path}.min`, issues);
			const maxOk = finite(value.max, `${path}.max`, issues);
			if (minOk && maxOk && value.min >= value.max) issues.push(`${path}.min must be less than max`);
			if (value.samples !== void 0 && (!integer(value.samples, `${path}.samples`, issues, 2) || value.samples > 64)) issues.push(`${path}.samples must be an integer from 2 to 64`);
		}
		function validateField2DV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"xAxis",
				"yAxis",
				"scalar",
				"vector"
			], "visual.content", issues);
			validateFieldAxisV4(value.xAxis, "visual.content.xAxis", issues);
			validateFieldAxisV4(value.yAxis, "visual.content.yAxis", issues);
			if (value.scalar === void 0 && value.vector === void 0) issues.push("visual.content must provide scalar or vector data");
			const fieldVariables = /* @__PURE__ */ new Set(["y"]);
			if (value.scalar !== void 0) {
				if (!record(value.scalar)) issues.push("visual.content.scalar must be an object");
				else {
					onlyKeys(value.scalar, [
						"samples",
						"expression",
						"min",
						"max"
					], "visual.content.scalar", issues);
					if (value.scalar.samples === void 0 && value.scalar.expression === void 0) issues.push("visual.content.scalar must provide samples or expression");
					if (value.scalar.samples !== void 0) validateFieldGridV4(value.scalar.samples, "visual.content.scalar.samples", issues, "scalar");
					if (value.scalar.expression !== void 0) validateMath(value.scalar.expression, fieldVariables, "visual.content.scalar.expression", issues, true, 4);
					const minOk = value.scalar.min === void 0 ? false : finite(value.scalar.min, "visual.content.scalar.min", issues);
					const maxOk = value.scalar.max === void 0 ? false : finite(value.scalar.max, "visual.content.scalar.max", issues);
					if (minOk && maxOk && value.scalar.min >= value.scalar.max) issues.push("visual.content.scalar.min must be less than max");
				}
			}
			if (value.vector !== void 0) {
				if (!record(value.vector)) issues.push("visual.content.vector must be an object");
				else {
					onlyKeys(value.vector, ["samples", "expression"], "visual.content.vector", issues);
					if (value.vector.samples === void 0 && value.vector.expression === void 0) issues.push("visual.content.vector must provide samples or expression");
					if (value.vector.samples !== void 0) validateFieldGridV4(value.vector.samples, "visual.content.vector.samples", issues, "vector");
					if (value.vector.expression !== void 0) {
						if (!record(value.vector.expression)) issues.push("visual.content.vector.expression must be an object");
						else {
							onlyKeys(value.vector.expression, ["u", "v"], "visual.content.vector.expression", issues);
							validateMath(value.vector.expression.u, fieldVariables, "visual.content.vector.expression.u", issues, true, 4);
							validateMath(value.vector.expression.v, fieldVariables, "visual.content.vector.expression.v", issues, true, 4);
						}
					}
				}
			}
			return focusIds;
		}
		function validateCausalLoopV4(value, issues) {
			const focusIds = /* @__PURE__ */ new Set();
			onlyKeys(value, [
				"kind",
				"variables",
				"links",
				"loops"
			], "visual.content", issues);
			let variables = [];
			if (!Array.isArray(value.variables) || value.variables.length < 2 || value.variables.length > 32) issues.push("visual.content.variables must contain 2 to 32 variables");
			else {
				variables = value.variables.filter(record);
				if (variables.length !== value.variables.length) issues.push("visual.content.variables entries must be objects");
				uniqueIds(variables, "visual.content.variables", issues);
				for (const [index, variable] of variables.entries()) {
					const path = `visual.content.variables[${String(index)}]`;
					onlyKeys(variable, [
						"id",
						"label",
						"detail",
						"tone"
					], path, issues);
					if (id(variable.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, variable.id, `${path}.id`, issues);
					text(variable.label, `${path}.label`, issues, 160);
					if (variable.detail !== void 0) text(variable.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(variable.tone, `${path}.tone`, issues);
				}
			}
			const variableIds = new Set(variables.flatMap((variable) => typeof variable.id === "string" ? [variable.id] : []));
			let links = [];
			if (!Array.isArray(value.links) || value.links.length < 1 || value.links.length > 96) issues.push("visual.content.links must contain 1 to 96 links");
			else {
				links = value.links.filter(record);
				if (links.length !== value.links.length) issues.push("visual.content.links entries must be objects");
				uniqueIds(links, "visual.content.links", issues);
				for (const [index, link] of links.entries()) {
					const path = `visual.content.links[${String(index)}]`;
					onlyKeys(link, [
						"id",
						"from",
						"to",
						"polarity",
						"delay",
						"label",
						"detail",
						"tone"
					], path, issues);
					if (id(link.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, link.id, `${path}.id`, issues);
					if (typeof link.from !== "string" || !variableIds.has(link.from)) issues.push(`${path}.from must reference a declared variable`);
					if (typeof link.to !== "string" || !variableIds.has(link.to)) issues.push(`${path}.to must reference a declared variable`);
					if (link.polarity !== "positive" && link.polarity !== "negative") issues.push(`${path}.polarity must be positive or negative`);
					if (link.delay !== void 0 && (typeof link.delay !== "number" || !Number.isFinite(link.delay) || link.delay < 0)) issues.push(`${path}.delay must be a non-negative finite number`);
					if (link.label !== void 0) text(link.label, `${path}.label`, issues, 160);
					if (link.detail !== void 0) text(link.detail, `${path}.detail`, issues, 1e3);
					validateVisualToneV4(link.tone, `${path}.tone`, issues);
				}
			}
			const linkIds = new Set(links.flatMap((link) => typeof link.id === "string" ? [link.id] : []));
			if (value.loops !== void 0) {
				if (!Array.isArray(value.loops) || value.loops.length < 1 || value.loops.length > 12) issues.push("visual.content.loops must contain 1 to 12 loops");
				else {
					const loops = value.loops.filter(record);
					if (loops.length !== value.loops.length) issues.push("visual.content.loops entries must be objects");
					uniqueIds(loops, "visual.content.loops", issues);
					for (const [index, loop] of loops.entries()) {
						const path = `visual.content.loops[${String(index)}]`;
						onlyKeys(loop, [
							"id",
							"label",
							"type",
							"linkIds",
							"detail",
							"tone"
						], path, issues);
						if (id(loop.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, loop.id, `${path}.id`, issues);
						text(loop.label, `${path}.label`, issues, 160);
						if (loop.type !== "reinforcing" && loop.type !== "balancing") issues.push(`${path}.type must be reinforcing or balancing`);
						if (!Array.isArray(loop.linkIds) || loop.linkIds.length < 1 || loop.linkIds.length > 96) issues.push(`${path}.linkIds must contain 1 to 96 link ids`);
						else {
							const seen = /* @__PURE__ */ new Set();
							for (const [linkIndex, linkId] of loop.linkIds.entries()) {
								const linkPath = `${path}.linkIds[${String(linkIndex)}]`;
								if (typeof linkId !== "string" || !linkIds.has(linkId)) issues.push(`${linkPath} must reference a declared link`);
								else if (seen.has(linkId)) issues.push(`${linkPath} duplicates ${linkId}`);
								else seen.add(linkId);
							}
						}
						if (loop.detail !== void 0) text(loop.detail, `${path}.detail`, issues, 1e3);
						validateVisualToneV4(loop.tone, `${path}.tone`, issues);
					}
				}
			}
			return focusIds;
		}
		function validateVisualSequenceV4(value, focusIds, issues) {
			if (value === void 0) return;
			if (!record(value)) {
				issues.push("visual.sequence must be an object");
				return;
			}
			onlyKeys(value, ["initialFrameId", "frames"], "visual.sequence", issues);
			if (!Array.isArray(value.frames) || value.frames.length < 2 || value.frames.length > 12) {
				issues.push("visual.sequence.frames must contain 2 to 12 frames");
				return;
			}
			const frames = value.frames.filter(record);
			if (frames.length !== value.frames.length) issues.push("visual.sequence.frames entries must be objects");
			uniqueIds(frames, "visual.sequence.frames", issues);
			const frameIds = /* @__PURE__ */ new Set();
			for (const [index, frame] of frames.entries()) {
				const path = `visual.sequence.frames[${String(index)}]`;
				onlyKeys(frame, [
					"id",
					"label",
					"description",
					"focusIds"
				], path, issues);
				if (id(frame.id, `${path}.id`, issues)) frameIds.add(frame.id);
				text(frame.label, `${path}.label`, issues, 120);
				if (frame.description !== void 0) text(frame.description, `${path}.description`, issues, 1e3);
				if (!Array.isArray(frame.focusIds) || frame.focusIds.length > 64) {
					issues.push(`${path}.focusIds must contain at most 64 ids`);
					continue;
				}
				const seen = /* @__PURE__ */ new Set();
				for (const [focusIndex, focusId] of frame.focusIds.entries()) if (typeof focusId !== "string" || !focusIds.has(focusId)) issues.push(`${path}.focusIds[${String(focusIndex)}] must reference visual content`);
				else if (seen.has(focusId)) issues.push(`${path}.focusIds duplicates ${focusId}`);
				else seen.add(focusId);
			}
			if (value.initialFrameId !== void 0 && (typeof value.initialFrameId !== "string" || !frameIds.has(value.initialFrameId))) issues.push("visual.sequence.initialFrameId must reference a declared frame");
		}
		/** Validate the semantic, model-facing visual protocol while retaining V3 replay separately. */
		function parseLearningVisualV4(value) {
			const issues = [];
			const bytes = jsonBytes(value);
			if (bytes === void 0) issues.push("visual must be serializable JSON");
			else if (bytes > 65536) issues.push(`visual exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`);
			if (!record(value)) throw new LearningProtocolError([...issues, "visual must be an object"]);
			onlyKeys(value, [
				"protocol",
				"title",
				"description",
				"content",
				"sequence",
				"fallbackMarkdown"
			], "visual", issues);
			if (value.protocol !== "dsh-learning/visual@4") issues.push(`visual.protocol must be ${VISUAL_PROTOCOL_V4}`);
			text(value.title, "visual.title", issues, 200);
			if (value.description !== void 0) text(value.description, "visual.description", issues, 1e3);
			if (value.fallbackMarkdown !== void 0) text(value.fallbackMarkdown, "visual.fallbackMarkdown", issues, 8e3);
			let focusIds = /* @__PURE__ */ new Set();
			if (!record(value.content)) issues.push("visual.content must be an object");
			else if (value.content.kind === "plot") focusIds = validatePlotV4(value.content, issues);
			else if (value.content.kind === "node_link") focusIds = validateNodeLinkV4(value.content, issues);
			else if (value.content.kind === "scene_2d") focusIds = validateScene2DV4(value.content, issues);
			else if (value.content.kind === "relation") focusIds = validateRelationV4(value.content, issues);
			else if (value.content.kind === "timeline") focusIds = validateTimelineV4(value.content, issues);
			else if (value.content.kind === "formula_steps") focusIds = validateFormulaStepsV4(value.content, issues);
			else if (value.content.kind === "study_map") focusIds = validateStudyMapV4(value.content, issues);
			else if (value.content.kind === "recall_deck") focusIds = validateRecallDeckV4(value.content, issues);
			else if (value.content.kind === "data_table") focusIds = validateDataTableV4(value.content, issues);
			else if (value.content.kind === "state_transition") focusIds = validateStateTransitionV4(value.content, issues);
			else if (value.content.kind === "sequence_buffer") focusIds = validateSequenceBufferV4(value.content, issues);
			else if (value.content.kind === "sequence_diagram") focusIds = validateSequenceDiagramV4(value.content, issues);
			else if (value.content.kind === "code_trace") focusIds = validateCodeTraceV4(value.content, issues);
			else if (value.content.kind === "field_2d") focusIds = validateField2DV4(value.content, issues);
			else if (value.content.kind === "causal_loop") focusIds = validateCausalLoopV4(value.content, issues);
			else issues.push(`visual.content.kind must be one of ${LEARNING_VISUAL_KINDS_V4.join(", ")}`);
			validateVisualSequenceV4(value.sequence, focusIds, issues);
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
		}
		function parseLearningVisualResultV4(value) {
			const issues = [];
			if (!record(value)) throw new LearningProtocolError(["visual result must be an object"]);
			onlyKeys(value, ["protocol", "status"], "visualResult", issues);
			if (value.protocol !== "dsh-learning/visual-result@4") issues.push(`visualResult.protocol must be ${VISUAL_RESULT_PROTOCOL_V4}`);
			if (!LEARNING_VISUAL_STATUSES.includes(value.status)) issues.push(`visualResult.status must be one of ${LEARNING_VISUAL_STATUSES.join(", ")}`);
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
		}
		function parseLearningVisualResultV3(value) {
			const issues = [];
			if (!record(value)) throw new LearningProtocolError(["visual result must be an object"]);
			onlyKeys(value, ["protocol", "status"], "visualResult", issues);
			if (value.protocol !== "dsh-learning/visual-result@3") issues.push(`visualResult.protocol must be ${VISUAL_RESULT_PROTOCOL_V3}`);
			if (value.status !== "ready") issues.push("visualResult.status must be ready");
			if (issues.length > 0) throw new LearningProtocolError(issues);
			return value;
		}
		//#endregion
		//#region src/transport.ts
		const MARKER_PREFIX = "<!--dsh-learning/transport@1:";
		const MARKER_SUFFIX = "-->";
		const QUESTION_ID_PREFIX = "dsh-learning/transport@1:";
		const WAIT_MARKER_PREFIX = "<!--dsh-learning/wait@2:";
		const WAIT_QUESTION_ID_PREFIX = "dsh-learning/wait@2:";
		const CHECKPOINT_WAIT_MARKER_PREFIX = "<!--dsh-learning/checkpoint-wait@1:";
		const CHECKPOINT_WAIT_QUESTION_ID_PREFIX = "dsh-learning/checkpoint-wait@1:";
		const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
		const MAX_CHECKPOINT_ENVELOPE_BASE64_CHARS = Math.ceil(98304);
		function decodeBase64Url(value) {
			if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return void 0;
			const bytes = [];
			for (let index = 0; index < value.length; index += 4) {
				const a = BASE64URL.indexOf(value[index]);
				const b = BASE64URL.indexOf(value[index + 1]);
				const c = value[index + 2] === void 0 ? 0 : BASE64URL.indexOf(value[index + 2]);
				const d = value[index + 3] === void 0 ? 0 : BASE64URL.indexOf(value[index + 3]);
				if (a < 0 || b < 0 || c < 0 || d < 0) return void 0;
				const triple = a << 18 | b << 12 | c << 6 | d;
				bytes.push(triple >> 16 & 255);
				if (value[index + 2] !== void 0) bytes.push(triple >> 8 & 255);
				if (value[index + 3] !== void 0) bytes.push(triple & 255);
			}
			try {
				return new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
			} catch {
				return;
			}
		}
		function decodeEnvelope(value) {
			const json = decodeBase64Url(value);
			if (json === void 0) return void 0;
			try {
				const parsed = JSON.parse(json);
				if (parsed.transport !== "dsh-learning/transport@1" || typeof parsed.activityId !== "string" || parsed.activityId === "") return void 0;
				return {
					transport: TRANSPORT_PROTOCOL,
					activityId: parsed.activityId,
					activity: parseLearningActivity(parsed.activity)
				};
			} catch {
				return;
			}
		}
		/** Decode and revalidate a package-owned question id. */
		function decodeLearningQuestionId(value) {
			if (typeof value !== "string" || !value.startsWith(QUESTION_ID_PREFIX)) return void 0;
			return decodeEnvelope(value.slice(25));
		}
		/** Decode and revalidate a package-owned question detail; ordinary questions return undefined. */
		function decodeLearningDetail(detail) {
			if (typeof detail !== "string" || !detail.startsWith(MARKER_PREFIX)) return void 0;
			const end = detail.indexOf(MARKER_SUFFIX, 29);
			if (end < 0) return void 0;
			return decodeEnvelope(detail.slice(29, end));
		}
		/** V2 ids contain only an opaque reference, never the phase payload. */
		function learningWaitQuestionId(waitId) {
			if (!/^[A-Za-z0-9_-]{1,128}$/.test(waitId)) throw new Error("waitId must be a URL-safe opaque token");
			return `${WAIT_QUESTION_ID_PREFIX}${waitId}`;
		}
		function decodeLearningWaitQuestionId(value) {
			if (typeof value !== "string" || !value.startsWith(WAIT_QUESTION_ID_PREFIX)) return void 0;
			const waitId = value.slice(20);
			return /^[A-Za-z0-9_-]{1,128}$/.test(waitId) ? waitId : void 0;
		}
		function decodeLearningWaitDetail(detail) {
			if (typeof detail !== "string" || !detail.startsWith(WAIT_MARKER_PREFIX)) return void 0;
			const end = detail.indexOf(MARKER_SUFFIX, 24);
			if (end < 0) return void 0;
			const json = decodeBase64Url(detail.slice(24, end));
			if (json === void 0) return void 0;
			try {
				const parsed = JSON.parse(json);
				if (parsed.transport !== "dsh-learning/wait@2" || typeof parsed.waitId !== "string" || decodeLearningWaitQuestionId(learningWaitQuestionId(parsed.waitId)) === void 0 || typeof parsed.activityId !== "string" || parsed.activityId === "" || parsed.callId !== void 0 && (typeof parsed.callId !== "string" || parsed.callId === "") || typeof parsed.lessonToken !== "string" || parsed.lessonToken === "" || typeof parsed.roundToken !== "string" || parsed.roundToken === "" || typeof parsed.seq !== "number" || !Number.isInteger(parsed.seq) || parsed.seq < 0 || parsed.phase !== "question" && parsed.phase !== "reveal") return void 0;
				const activity = parseLearningActivityV2(parsed.activity);
				if (activity.phase !== parsed.phase || activity.seq !== parsed.seq) return void 0;
				if (activity.phase === "reveal" && (activity.lessonToken !== parsed.lessonToken || activity.roundToken !== parsed.roundToken)) return void 0;
				if (activity.phase === "question" && activity.lessonToken !== void 0 && activity.lessonToken !== parsed.lessonToken) return void 0;
				return {
					transport: TRANSPORT_PROTOCOL_V2,
					waitId: parsed.waitId,
					activityId: parsed.activityId,
					...parsed.callId === void 0 ? {} : { callId: parsed.callId },
					lessonToken: parsed.lessonToken,
					roundToken: parsed.roundToken,
					seq: parsed.seq,
					phase: parsed.phase,
					activity
				};
			} catch {
				return;
			}
		}
		function opaqueToken(value) {
			return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
		}
		function boundedTransportIdentity(value) {
			return typeof value === "string" && value.length >= 1 && value.length <= 512 && value.trim() === value && !/[\u0000-\u001F\u007F]/.test(value);
		}
		function onlyEnvelopeKeys(value, allowed) {
			return Object.keys(value).every((key) => allowed.includes(key));
		}
		function decodeLearningCheckpointQuestionId(value) {
			if (typeof value !== "string" || !value.startsWith(CHECKPOINT_WAIT_QUESTION_ID_PREFIX)) return void 0;
			const waitId = value.slice(31);
			return opaqueToken(waitId) ? waitId : void 0;
		}
		/** Decode and fully revalidate a package-owned checkpoint wait projection. */
		function decodeLearningCheckpointDetail(detail) {
			if (typeof detail !== "string" || !detail.startsWith(CHECKPOINT_WAIT_MARKER_PREFIX)) return void 0;
			const end = detail.indexOf(MARKER_SUFFIX, 35);
			if (end < 0) return void 0;
			const encoded = detail.slice(35, end);
			if (encoded.length < 1 || encoded.length > MAX_CHECKPOINT_ENVELOPE_BASE64_CHARS) return void 0;
			const json = decodeBase64Url(encoded);
			if (json === void 0) return void 0;
			try {
				const parsed = JSON.parse(json);
				if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return void 0;
				const envelope = parsed;
				if (!onlyEnvelopeKeys(envelope, [
					"transport",
					"sessionId",
					"callId",
					"waitId",
					"checkpointId",
					"checkpoint"
				])) return void 0;
				if (envelope.transport !== "dsh-learning/checkpoint-wait@1" || !boundedTransportIdentity(envelope.sessionId) || !boundedTransportIdentity(envelope.callId) || !opaqueToken(envelope.waitId) || !opaqueToken(envelope.checkpointId)) return void 0;
				const checkpoint = parseLearningCheckpointV1(envelope.checkpoint);
				return {
					transport: CHECKPOINT_TRANSPORT_PROTOCOL,
					sessionId: envelope.sessionId,
					callId: envelope.callId,
					waitId: envelope.waitId,
					checkpointId: envelope.checkpointId,
					checkpoint
				};
			} catch {
				return;
			}
		}
		//#endregion
		//#region \0dsh-css:src/client/LearningActivity.module.css.mjs
		const css$14 = "._7ar4Xq_inlineActivity{gap:var(--lx-space-xl);min-width:0;color:var(--lx-label-primary);font-size:var(--lx-text-md);flex-direction:column;line-height:28px;display:flex}._7ar4Xq_scaffold{color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);align-self:flex-start}._7ar4Xq_scaffold summary{cursor:pointer}._7ar4Xq_activityActions{align-items:center;gap:var(--lx-space-lg);font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm);margin-top:-6px;display:flex}._7ar4Xq_error{color:var(--lx-label-error);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);margin:0}._7ar4Xq_activityContent,._7ar4Xq_controls,._7ar4Xq_answerField,._7ar4Xq_stepFocus,._7ar4Xq_prediction{flex-direction:column;display:flex}._7ar4Xq_activityContent{gap:var(--lx-space-xl)}._7ar4Xq_prompt{color:var(--lx-label-primary);font-size:var(--lx-text-md);margin:0;font-weight:400;line-height:28px}._7ar4Xq_explorer{gap:var(--lx-space-xl);flex-direction:column;min-width:0;display:flex}._7ar4Xq_controls{gap:var(--lx-space-lg) var(--lx-space-3xl);grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));display:grid}._7ar4Xq_rangeField{min-width:0;color:var(--lx-label-secondary);font-size:var(--lx-text-sm)}._7ar4Xq_rangeHeader{justify-content:space-between;align-items:baseline;gap:var(--lx-space-lg);margin-bottom:6px;display:flex}._7ar4Xq_rangeHeader label{color:var(--lx-label-primary);font-weight:500}._7ar4Xq_rangeHeader output{color:var(--lx-accent);font-size:var(--lx-text-base);font-variant-numeric:tabular-nums;font-weight:650}._7ar4Xq_rangeControl{grid-template-rows:30px 16px;grid-template-columns:28px minmax(0,1fr) 28px;align-items:center;column-gap:9px;display:grid}._7ar4Xq_stepButton{appearance:none;border:1px solid var(--lx-border-strong);border-radius:var(--lx-radius-xs);width:28px;height:28px;color:var(--lx-label-secondary);font:inherit;font-size:var(--lx-text-lg);line-height:var(--lx-leading-lg);cursor:pointer;background:0 0;padding:0}._7ar4Xq_stepButton:hover:not(:disabled){border-color:var(--lx-accent);color:var(--lx-accent)}._7ar4Xq_stepButton:disabled{cursor:default;opacity:.35}._7ar4Xq_rangeInput{appearance:none;border-radius:var(--lx-radius-pill);background:linear-gradient(to right, var(--lx-border-strongest) 0 var(--range-low), var(--lx-accent) var(--range-low) var(--range-high), var(--lx-border-strongest) var(--range-high) 100%);cursor:pointer;width:100%;height:4px}._7ar4Xq_rangeInput:disabled{cursor:default;opacity:.55}._7ar4Xq_rangeInput::-webkit-slider-runnable-track{border-radius:var(--lx-radius-pill);background:0 0;height:4px}._7ar4Xq_rangeInput::-webkit-slider-thumb{appearance:none;border:3px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--lx-accent);width:16px;height:16px;box-shadow:0 0 0 1px var(--lx-accent);margin-top:-6px}._7ar4Xq_rangeInput::-moz-range-track{border-radius:var(--lx-radius-pill);background:0 0;height:4px}._7ar4Xq_rangeInput::-moz-range-thumb{border:3px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--lx-accent);width:10px;height:10px;box-shadow:0 0 0 1px var(--lx-accent)}._7ar4Xq_rangeEnds{color:var(--lx-label-tertiary);font-size:var(--lx-text-2xs);font-variant-numeric:tabular-nums;line-height:var(--lx-leading-2xs);grid-column:2;justify-content:space-between;display:flex;position:relative}._7ar4Xq_rangeZero{position:absolute;transform:translate(-50%)}._7ar4Xq_chartRegion{min-width:0}._7ar4Xq_chart{width:100%;height:auto;display:block;overflow:visible}._7ar4Xq_plotFrame{fill:var(--lx-surface-base);stroke:var(--lx-border-strong);stroke-width:1px;vector-effect:non-scaling-stroke}._7ar4Xq_gridLine{stroke:var(--lx-border-subtle);stroke-width:1px;vector-effect:non-scaling-stroke}._7ar4Xq_zeroAxis{stroke:var(--lx-border-strongest);stroke-width:1.25px}._7ar4Xq_tickLabel{fill:var(--lx-label-tertiary);font-size:var(--lx-text-2xs);font-variant-numeric:tabular-nums}._7ar4Xq_axisLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-xs);font-weight:500}._7ar4Xq_curve{fill:none;stroke:var(--lx-accent);stroke-width:3px;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}._7ar4Xq_curve[data-curve=\"1\"]{stroke:var(--lx-success);stroke-dasharray:9 5}._7ar4Xq_curve[data-curve=\"2\"]{stroke:var(--lx-warn);stroke-dasharray:2 6}._7ar4Xq_legend{gap:var(--lx-space-sm) var(--lx-space-lg);color:var(--lx-label-secondary);font-size:var(--lx-text-xs);flex-wrap:wrap;margin:0 0 5px 64px;padding:0;list-style:none;display:flex}._7ar4Xq_legend li:before{content:\"\";border-top:3px solid var(--lx-accent);vertical-align:middle;width:18px;height:0;margin-right:5px;display:inline-block}._7ar4Xq_legend li[data-curve=\"1\"]:before{border-top-color:var(--lx-success);border-top-style:dashed}._7ar4Xq_legend li[data-curve=\"2\"]:before{border-top-color:var(--lx-warn);border-top-style:dotted}._7ar4Xq_answerField{gap:var(--lx-space-xs);color:var(--lx-label-secondary);font-size:var(--lx-text-sm)}._7ar4Xq_answerField textarea{box-sizing:border-box;resize:vertical;border:0;border-bottom:1px solid var(--lx-border-default);min-height:52px;padding:var(--lx-space-xs) 0;color:var(--lx-label-primary);font:inherit;background:0 0;border-radius:0;line-height:1.5}._7ar4Xq_primaryRow,._7ar4Xq_navigation{gap:var(--lx-space-sm);display:flex}._7ar4Xq_primaryRow{justify-content:flex-start}._7ar4Xq_navigation{justify-content:space-between}._7ar4Xq_primaryButton,._7ar4Xq_ghostButton,._7ar4Xq_revealButton,._7ar4Xq_textButton{min-height:var(--lx-control-height-md);appearance:none;border-radius:var(--lx-radius-sm);padding:var(--lx-control-padding-md);font:inherit;font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);cursor:pointer;transition:background var(--lx-motion-fast) var(--lx-easing), border-color var(--lx-motion-fast) var(--lx-easing), color var(--lx-motion-fast) var(--lx-easing);justify-content:center;align-items:center;display:inline-flex}._7ar4Xq_primaryButton:hover:not(:disabled),._7ar4Xq_revealButton:hover:not(:disabled){background:color-mix(in srgb, var(--lx-accent) 88%, var(--lx-label-primary))}._7ar4Xq_ghostButton:hover:not(:disabled),._7ar4Xq_textButton:hover:not(:disabled){border-color:var(--lx-accent);color:var(--lx-accent)}._7ar4Xq_primaryButton,._7ar4Xq_revealButton{border:1px solid var(--lx-accent);background:var(--lx-accent);color:var(--lx-label-on-accent,white)}._7ar4Xq_ghostButton{border:1px solid var(--lx-border-default);color:var(--lx-label-secondary);background:0 0}._7ar4Xq_textButton{color:var(--lx-label-tertiary);background:0 0;border:1px solid #0000}._7ar4Xq_primaryButton:disabled,._7ar4Xq_ghostButton:disabled,._7ar4Xq_revealButton:disabled,._7ar4Xq_textButton:disabled{cursor:default;opacity:var(--lx-control-disabled-opacity)}._7ar4Xq_stepMeta{color:var(--lx-label-tertiary);font-size:var(--lx-text-xs);justify-content:space-between;align-items:center;display:flex}._7ar4Xq_processMap{grid-template-columns:repeat(var(--process-step-count), minmax(0, 1fr));margin:0;padding:0;list-style:none;display:grid}._7ar4Xq_processStep{min-width:0;position:relative}._7ar4Xq_processStep:not(:last-child):after{z-index:0;background:var(--lx-border-default);content:\"\";height:2px;position:absolute;top:13px;left:calc(50% + 16px);right:calc(16px - 50%)}._7ar4Xq_processStep[data-connector-complete]:after{background:var(--lx-accent)}._7ar4Xq_processStepButton{z-index:1;align-items:center;gap:var(--lx-space-xs);width:100%;min-width:0;padding:0 var(--lx-space-2xs);color:var(--lx-label-tertiary);text-align:center;font:inherit;font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);cursor:pointer;background:0 0;border:0;flex-direction:column;display:flex;position:relative}._7ar4Xq_processStepButton:disabled{cursor:default}._7ar4Xq_processNode{box-sizing:border-box;border:1px solid var(--lx-border-strongest);border-radius:var(--lx-radius-circle);background:var(--lx-surface-base);width:28px;height:28px;color:var(--lx-label-tertiary);font-size:var(--lx-text-xs);font-variant-numeric:tabular-nums;place-items:center;line-height:1;display:grid}._7ar4Xq_processTitle{-webkit-line-clamp:2;-webkit-box-orient:vertical;min-width:0;display:-webkit-box;overflow:hidden}._7ar4Xq_processStep[data-state=current] ._7ar4Xq_processNode{border-color:var(--lx-accent);background:var(--lx-accent-soft);color:var(--lx-accent)}._7ar4Xq_processStep[data-state=current] ._7ar4Xq_processTitle{color:var(--lx-label-primary);font-weight:500}._7ar4Xq_processStep[data-state=complete] ._7ar4Xq_processNode{border-color:var(--lx-accent);background:var(--lx-accent);color:var(--lx-label-inverted)}._7ar4Xq_processStep[data-state=complete] ._7ar4Xq_processTitle{color:var(--lx-label-secondary)}._7ar4Xq_processMapVertical{grid-template-columns:1fr}._7ar4Xq_processMapVertical ._7ar4Xq_processStep:not(:last-child):after{width:2px;height:auto;inset:29px auto -1px 13px}._7ar4Xq_processMapVertical ._7ar4Xq_processStepButton{align-items:flex-start;gap:var(--lx-space-md);padding:var(--lx-space-2xs) 0 var(--lx-space-md);text-align:left;flex-direction:row}._7ar4Xq_processMapVertical ._7ar4Xq_processNode{flex:none}._7ar4Xq_processMapVertical ._7ar4Xq_processTitle{-webkit-line-clamp:3;padding-top:4px}._7ar4Xq_stepFocus{gap:var(--lx-space-lg);border-left:2px solid var(--lx-accent);padding-left:16px}._7ar4Xq_stepFocus h3,._7ar4Xq_prediction p{margin:0}._7ar4Xq_stepFocus h3{color:var(--lx-label-primary);font-size:var(--lx-text-md);font-weight:500;line-height:var(--lx-leading-md)}._7ar4Xq_stepFocus>._7ar4Xq_revealButton{align-self:flex-start}._7ar4Xq_prediction{gap:var(--lx-space-md);border:0;margin:0;padding:0}._7ar4Xq_prediction legend{color:var(--lx-accent);font-size:var(--lx-text-xs);margin-bottom:8px;font-weight:500}._7ar4Xq_prediction textarea{box-sizing:border-box;resize:vertical;border:0;border-bottom:1px solid var(--lx-border-default);min-height:52px;padding:var(--lx-space-xs) 0;color:var(--lx-label-primary);font:inherit;background:0 0}._7ar4Xq_predictionOptions{grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:0 18px;display:grid}._7ar4Xq_option{gap:var(--lx-space-sm);border-bottom:1px solid var(--lx-border-subtle);padding:var(--lx-space-sm) 0;color:var(--lx-label-secondary);cursor:pointer;align-items:flex-start;display:flex}._7ar4Xq_option[data-selected]{color:var(--lx-label-primary)}._7ar4Xq_option input{accent-color:var(--lx-accent);margin-top:3px}._7ar4Xq_revealed{color:var(--lx-label-secondary);line-height:1.6}._7ar4Xq_compareHeader,._7ar4Xq_compareRow{grid-template-columns:minmax(0,1fr) minmax(16px,36px) 24px minmax(16px,36px) minmax(0,1fr);align-items:center;display:grid}._7ar4Xq_compareHeader{color:var(--lx-label-secondary);font-size:var(--lx-text-sm);padding-bottom:4px}._7ar4Xq_compareHeader strong{min-width:0;font-weight:500}._7ar4Xq_compareHeader strong[data-side=left]{text-align:right;grid-column:1}._7ar4Xq_compareHeader strong[data-side=right]{text-align:left;grid-column:5}._7ar4Xq_compareHeaderLink{color:var(--lx-label-tertiary);text-align:center;grid-column:3}._7ar4Xq_compareRows{min-width:0}._7ar4Xq_compareRow{min-width:0;padding:var(--lx-space-lg) 0;cursor:pointer;background:0 0;position:relative}._7ar4Xq_compareRow+._7ar4Xq_compareRow{border-top:1px solid var(--lx-border-default)}._7ar4Xq_compareLine{background:var(--lx-border-strong);height:1px}._7ar4Xq_compareRow[data-selected] ._7ar4Xq_compareLine{background:var(--lx-accent);height:2px}._7ar4Xq_compareSelector{place-items:center;display:grid}._7ar4Xq_compareSelector input{width:16px;height:16px;accent-color:var(--lx-accent);margin:0}._7ar4Xq_compareItem{min-width:0;padding:0 var(--lx-space-xs);color:var(--lx-label-primary);font-size:var(--lx-text-sm);line-height:1.5}._7ar4Xq_compareItem[data-side=left]{text-align:right}._7ar4Xq_compareItem[data-side=right]{text-align:left}._7ar4Xq_compareItem strong{font-weight:500}._7ar4Xq_compareRow[data-selected] ._7ar4Xq_compareItem strong{color:var(--lx-accent)}._7ar4Xq_compareItem p{color:var(--lx-label-tertiary);margin:4px 0 0}._7ar4Xq_emptyCell{padding:0 var(--lx-space-xs);color:var(--lx-label-tertiary)}._7ar4Xq_emptyCell[data-side=left]{text-align:right}._7ar4Xq_emptyCell[data-side=right]{text-align:left}._7ar4Xq_rowPrompt{max-width:80%;color:var(--lx-label-tertiary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs);text-align:center;grid-column:1/6;justify-self:center;margin-top:6px}._7ar4Xq_inlineStatus{align-items:center;gap:var(--lx-space-sm);width:max-content;max-width:100%;color:var(--lx-label-tertiary);text-align:left;font:inherit;font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);background:0 0;border:0;margin:0;padding:0;display:flex}._7ar4Xq_runningDot{border-radius:var(--lx-radius-circle);background:var(--lx-accent);flex:none;width:6px;height:6px;animation:1.2s ease-in-out infinite _7ar4Xq_pulse}._7ar4Xq_skeletonLine{border-radius:var(--lx-radius-pill);background:var(--lx-border-default);width:64px;height:6px;animation:1.2s ease-in-out infinite _7ar4Xq_skeletonPulse}._7ar4Xq_inlineResult{align-items:baseline;gap:var(--lx-space-sm);color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);flex-wrap:wrap;margin:0;display:flex}._7ar4Xq_inlineFallback{gap:var(--lx-space-xs);border-left:2px solid var(--lx-danger);border-radius:0 var(--lx-radius-sm) var(--lx-radius-sm) 0;padding:var(--lx-space-md) var(--lx-space-lg);background:color-mix(in srgb, var(--lx-danger) 6%, transparent);flex-direction:column;display:flex}._7ar4Xq_fallbackReason{color:var(--lx-label-tertiary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);overflow-wrap:anywhere;margin:0}._7ar4Xq_fallbackText{color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base)}._7ar4Xq_resultMark{color:var(--lx-success)}._7ar4Xq_errorMark{color:var(--lx-label-error)}._7ar4Xq_resultEvidence{color:var(--lx-label-secondary);font-variant-numeric:tabular-nums}._7ar4Xq_resultAnswer{color:var(--lx-label-tertiary)}._7ar4Xq_legacyReveal{gap:var(--lx-space-2xs);color:var(--lx-label-secondary);font-size:var(--lx-text-base);line-height:var(--lx-leading-md);display:grid}._7ar4Xq_legacyReveal strong{color:var(--lx-label-primary);font-weight:550}._7ar4Xq_srOnly{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}._7ar4Xq_checkpoint{gap:var(--lx-space-lg);min-width:0;margin:var(--lx-space-sm) 0 var(--lx-space-xl);border:var(--lx-card-border);border-radius:var(--lx-card-radius);padding:var(--lx-card-padding);background:var(--lx-card-background);color:var(--lx-label-primary);box-shadow:var(--lx-shadow-lg);flex-direction:column;display:flex;container:_7ar4Xq_learning-checkpoint/inline-size}._7ar4Xq_checkpointHeader,._7ar4Xq_checkpointForm,._7ar4Xq_checkpointField{flex-direction:column;min-width:0;display:flex}._7ar4Xq_checkpointHeader{gap:var(--lx-space-xs)}._7ar4Xq_checkpointForm{gap:var(--lx-space-md)}._7ar4Xq_checkpointField{gap:var(--lx-space-xs);color:var(--lx-label-secondary);font-size:var(--lx-text-sm)}._7ar4Xq_checkpointEyebrow{border-radius:var(--lx-radius-pill);width:max-content;padding:var(--lx-space-3xs) var(--lx-space-sm);background:var(--lx-accent-soft);color:var(--lx-accent);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);letter-spacing:var(--lx-tracking-eyebrow);line-height:var(--lx-leading-xs)}._7ar4Xq_checkpointHeader h2{font-size:var(--lx-text-lg);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-lg);margin:0}._7ar4Xq_checkpointHeader p{color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);margin:0}._7ar4Xq_checkpointInput{box-sizing:border-box;resize:vertical;border:1px solid var(--lx-border-default);border-radius:var(--lx-radius-sm);width:100%;min-height:36px;padding:var(--lx-space-sm) var(--lx-space-md);color:var(--lx-label-primary);font:inherit;background:0 0;line-height:1.5}._7ar4Xq_checkpointCode{font-family:var(--lx-font-mono)}._7ar4Xq_checkpointChoices{gap:var(--lx-space-xs);border:0;margin:0;padding:0;display:grid}._7ar4Xq_checkpointChoices legend{color:var(--lx-label-secondary);font-size:var(--lx-text-sm);margin-bottom:3px;padding:0}._7ar4Xq_checkpointOption{align-items:flex-start;gap:var(--lx-space-sm);color:var(--lx-label-primary);font-size:var(--lx-text-base);line-height:var(--lx-leading-base);cursor:pointer;display:flex}._7ar4Xq_checkpointOption input{accent-color:var(--lx-accent);margin:4px 0 0}._7ar4Xq_checkpointActions{align-items:center;gap:var(--lx-space-sm);flex-wrap:wrap;display:flex}@container _7ar4Xq_learning-checkpoint (width<=340px){._7ar4Xq_checkpointActions>button{flex:auto}._7ar4Xq_checkpointActions>._7ar4Xq_textButton{flex-basis:100%}}._7ar4Xq_checkpointHint{color:var(--lx-label-tertiary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-xs);margin:0}._7ar4Xq_learningVisual{gap:var(--lx-space-lg);min-width:0;color:var(--lx-label-primary);flex-direction:column;margin:4px 0 10px;display:flex}._7ar4Xq_visualDescription,._7ar4Xq_visualTextFallback{color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);margin:0}._7ar4Xq_visualControls{gap:var(--lx-space-lg) 28px;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));display:grid}._7ar4Xq_visualRange{gap:var(--lx-space-3xs);cursor:pointer;grid-template-rows:auto 18px 14px;min-width:0;display:grid}._7ar4Xq_visualRangeHeader{justify-content:space-between;align-items:baseline;gap:var(--lx-space-lg);min-width:0;color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm);display:flex}._7ar4Xq_visualRangeHeader output{color:var(--lx-accent);font-size:var(--lx-text-sm);font-variant-numeric:tabular-nums;font-weight:600}._7ar4Xq_visualRange input{appearance:none;border-radius:var(--lx-radius-pill);background:linear-gradient(to right, var(--lx-accent) 0 var(--visual-range-progress), var(--lx-border-default) var(--visual-range-progress) 100%);cursor:pointer;align-self:center;width:100%;height:4px}._7ar4Xq_visualRange input::-webkit-slider-runnable-track{border-radius:var(--lx-radius-pill);background:0 0;height:4px}._7ar4Xq_visualRange input::-webkit-slider-thumb{appearance:none;border:3px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--lx-accent);width:16px;height:16px;box-shadow:0 0 0 1px var(--lx-accent);margin-top:-6px}._7ar4Xq_visualRange input::-moz-range-track{border-radius:var(--lx-radius-pill);background:0 0;height:4px}._7ar4Xq_visualRange input::-moz-range-thumb{border:3px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--lx-accent);width:10px;height:10px;box-shadow:0 0 0 1px var(--lx-accent)}._7ar4Xq_visualRangeEnds{color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums;line-height:var(--lx-leading-micro);justify-content:space-between;display:flex}._7ar4Xq_visualMetrics{gap:var(--lx-space-sm) var(--lx-space-2xl);color:var(--lx-label-tertiary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm);flex-wrap:wrap;display:flex}._7ar4Xq_visualMetrics>span{align-items:baseline;gap:var(--lx-space-sm);display:inline-flex}._7ar4Xq_visualMetrics output{color:var(--lx-accent);font-variant-numeric:tabular-nums;font-weight:550}._7ar4Xq_visualChartRegion{min-width:0}._7ar4Xq_visualLegend{gap:var(--lx-space-sm) var(--lx-space-xl);color:var(--lx-label-secondary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-xs);flex-wrap:wrap;margin:3px 0 0 64px;padding:0;list-style:none;display:flex}._7ar4Xq_visualLegend li{--visual-tone:var(--lx-accent);align-items:center;gap:var(--lx-space-xs);display:inline-flex}._7ar4Xq_visualLegend li>span{border-top:2.5px solid var(--visual-tone);width:18px;height:0;display:inline-block}._7ar4Xq_visualLegend li[data-series-type=points]>span{border-radius:var(--lx-radius-circle);background:var(--visual-tone);border:0;width:8px;height:8px}._7ar4Xq_visualLegend li[data-stroke=dashed]>span{border-top-style:dashed}._7ar4Xq_visualLegend li[data-stroke=dotted]>span{border-top-style:dotted}._7ar4Xq_visualChart{width:100%;height:auto;display:block;overflow:visible}._7ar4Xq_visualPlot{fill:var(--lx-surface-card);stroke:var(--lx-border-default);stroke-width:1px;vector-effect:non-scaling-stroke}._7ar4Xq_visualGrid{stroke:var(--lx-border-subtle);stroke-width:1px;vector-effect:non-scaling-stroke}._7ar4Xq_visualTick{fill:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums}._7ar4Xq_visualAxisLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-2xs)}._7ar4Xq_visualCurve{--visual-tone:var(--lx-accent);fill:none;stroke:var(--visual-tone);stroke-width:2.5px;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}._7ar4Xq_visualCurve[data-stroke=dashed]{stroke-dasharray:8 5}._7ar4Xq_visualCurve[data-stroke=dotted]{stroke-dasharray:2 5}._7ar4Xq_visualPoint{--visual-tone:var(--lx-accent);fill:var(--visual-tone);stroke:var(--lx-surface-base);stroke-width:1.5px;vector-effect:non-scaling-stroke}._7ar4Xq_round{gap:var(--lx-space-lg);min-width:0;color:var(--lx-label-primary);flex-direction:column;display:flex}._7ar4Xq_roundHeader{gap:var(--lx-space-2xs);flex-direction:column;display:flex}._7ar4Xq_roundHeader span{color:var(--lx-label-tertiary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm)}._7ar4Xq_roundHeader h2,._7ar4Xq_roundProcess h3,._7ar4Xq_roundStructure h3,._7ar4Xq_roundFeedback p{margin:0}._7ar4Xq_roundHeader h2{font-size:var(--lx-text-lg);font-weight:500;line-height:var(--lx-leading-lg)}._7ar4Xq_roundProcess{gap:var(--lx-space-md);border-left:2px solid var(--lx-accent);padding:var(--lx-space-md) 0 var(--lx-space-md) var(--lx-space-lg);grid-template-columns:30px minmax(0,1fr);display:grid}._7ar4Xq_roundNode{border:1px solid var(--lx-accent);border-radius:var(--lx-radius-circle);width:28px;height:28px;color:var(--lx-accent);font-size:var(--lx-text-xs);place-items:center;display:grid}._7ar4Xq_roundProcess[data-final] ._7ar4Xq_roundNode{background:var(--lx-accent);color:var(--lx-label-inverted)}._7ar4Xq_roundParameter,._7ar4Xq_roundParameterValues,._7ar4Xq_roundCurveList{gap:var(--lx-space-sm);flex-wrap:wrap;display:flex}._7ar4Xq_roundParameter{flex-direction:column}._7ar4Xq_roundParameterValues span,._7ar4Xq_roundCurveList span{border:1px solid var(--lx-border-default);border-radius:var(--lx-radius-pill);padding:var(--lx-space-2xs) var(--lx-space-md);color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm)}._7ar4Xq_roundStructure{gap:var(--lx-space-sm) var(--lx-space-lg);grid-template-columns:repeat(2,minmax(0,1fr));display:grid}._7ar4Xq_roundStructure h3{font-size:var(--lx-text-sm);font-weight:500}._7ar4Xq_roundAlignment{gap:var(--lx-space-sm);border-top:1px solid var(--lx-border-default);padding:var(--lx-space-sm) 0;color:var(--lx-label-secondary);font-size:var(--lx-text-sm);cursor:pointer;grid-column:1/3;grid-template-columns:20px 1fr 1fr;display:grid}._7ar4Xq_roundAlignment input{accent-color:var(--lx-accent);margin-top:3px}._7ar4Xq_roundAlignment small{color:var(--lx-label-tertiary);grid-column:2/4}._7ar4Xq_roundAlignment[data-selected]{color:var(--lx-accent)}._7ar4Xq_roundFeedback{gap:var(--lx-space-sm);color:var(--lx-label-secondary);display:grid}._7ar4Xq_completedRound{min-width:0}._7ar4Xq_revealTransition{animation:.7s both _7ar4Xq_revealCurrentFrame}._7ar4Xq_round[data-round-state=completed] ._7ar4Xq_revealTransition,._7ar4Xq_round[data-round-state=ready_to_continue] ._7ar4Xq_revealTransition,._7ar4Xq_round[data-round-state=ack_submitting] ._7ar4Xq_revealTransition{animation:none}@keyframes _7ar4Xq_revealCurrentFrame{0%{opacity:.45;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes _7ar4Xq_pulse{0%,to{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}@keyframes _7ar4Xq_skeletonPulse{0%,to{opacity:.35}50%{opacity:.75}}@media (width<=560px){._7ar4Xq_processMap{grid-template-columns:1fr}._7ar4Xq_processMap ._7ar4Xq_processStep:not(:last-child):after{width:2px;height:auto;inset:29px auto -1px 13px}._7ar4Xq_processMap ._7ar4Xq_processStepButton{align-items:flex-start;gap:var(--lx-space-md);padding:var(--lx-space-2xs) 0 var(--lx-space-md);text-align:left;flex-direction:row}._7ar4Xq_processMap ._7ar4Xq_processNode{flex:none}._7ar4Xq_processMap ._7ar4Xq_processTitle{-webkit-line-clamp:3;padding-top:4px}._7ar4Xq_compareHeader,._7ar4Xq_compareRow{grid-template-columns:minmax(0,1fr) 12px 22px 12px minmax(0,1fr)}._7ar4Xq_rowPrompt{max-width:100%}}@media (width<=420px){._7ar4Xq_legend{margin-left:56px}._7ar4Xq_visualLegend{margin-left:54px}._7ar4Xq_stepFocus{padding-left:12px}}@media (prefers-reduced-motion:reduce){._7ar4Xq_runningDot,._7ar4Xq_skeletonLine,._7ar4Xq_revealTransition{animation:none}}";
		const tagId$14 = "@dsh-portable/interactive-learning/LearningActivity.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$14) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$14;
			tag.textContent = css$14;
			document.head.appendChild(tag);
		}
		var LearningActivity_module_css_default = {
			"activityActions": "_7ar4Xq_activityActions",
			"activityContent": "_7ar4Xq_activityContent",
			"answerField": "_7ar4Xq_answerField",
			"axisLabel": "_7ar4Xq_axisLabel",
			"chart": "_7ar4Xq_chart",
			"chartRegion": "_7ar4Xq_chartRegion",
			"checkpoint": "_7ar4Xq_checkpoint",
			"checkpointActions": "_7ar4Xq_checkpointActions",
			"checkpointChoices": "_7ar4Xq_checkpointChoices",
			"checkpointCode": "_7ar4Xq_checkpointCode",
			"checkpointEyebrow": "_7ar4Xq_checkpointEyebrow",
			"checkpointField": "_7ar4Xq_checkpointField",
			"checkpointForm": "_7ar4Xq_checkpointForm",
			"checkpointHeader": "_7ar4Xq_checkpointHeader",
			"checkpointHint": "_7ar4Xq_checkpointHint",
			"checkpointInput": "_7ar4Xq_checkpointInput",
			"checkpointOption": "_7ar4Xq_checkpointOption",
			"compareHeader": "_7ar4Xq_compareHeader",
			"compareHeaderLink": "_7ar4Xq_compareHeaderLink",
			"compareItem": "_7ar4Xq_compareItem",
			"compareLine": "_7ar4Xq_compareLine",
			"compareRow": "_7ar4Xq_compareRow",
			"compareRows": "_7ar4Xq_compareRows",
			"compareSelector": "_7ar4Xq_compareSelector",
			"completedRound": "_7ar4Xq_completedRound",
			"controls": "_7ar4Xq_controls",
			"curve": "_7ar4Xq_curve",
			"emptyCell": "_7ar4Xq_emptyCell",
			"error": "_7ar4Xq_error",
			"errorMark": "_7ar4Xq_errorMark",
			"explorer": "_7ar4Xq_explorer",
			"fallbackReason": "_7ar4Xq_fallbackReason",
			"fallbackText": "_7ar4Xq_fallbackText",
			"ghostButton": "_7ar4Xq_ghostButton",
			"gridLine": "_7ar4Xq_gridLine",
			"inlineActivity": "_7ar4Xq_inlineActivity",
			"inlineFallback": "_7ar4Xq_inlineFallback",
			"inlineResult": "_7ar4Xq_inlineResult",
			"inlineStatus": "_7ar4Xq_inlineStatus",
			"learning-checkpoint": "_7ar4Xq_learning-checkpoint",
			"learningVisual": "_7ar4Xq_learningVisual",
			"legacyReveal": "_7ar4Xq_legacyReveal",
			"legend": "_7ar4Xq_legend",
			"navigation": "_7ar4Xq_navigation",
			"option": "_7ar4Xq_option",
			"plotFrame": "_7ar4Xq_plotFrame",
			"prediction": "_7ar4Xq_prediction",
			"predictionOptions": "_7ar4Xq_predictionOptions",
			"primaryButton": "_7ar4Xq_primaryButton",
			"primaryRow": "_7ar4Xq_primaryRow",
			"processMap": "_7ar4Xq_processMap",
			"processMapVertical": "_7ar4Xq_processMapVertical",
			"processNode": "_7ar4Xq_processNode",
			"processStep": "_7ar4Xq_processStep",
			"processStepButton": "_7ar4Xq_processStepButton",
			"processTitle": "_7ar4Xq_processTitle",
			"prompt": "_7ar4Xq_prompt",
			"pulse": "_7ar4Xq_pulse",
			"rangeControl": "_7ar4Xq_rangeControl",
			"rangeEnds": "_7ar4Xq_rangeEnds",
			"rangeField": "_7ar4Xq_rangeField",
			"rangeHeader": "_7ar4Xq_rangeHeader",
			"rangeInput": "_7ar4Xq_rangeInput",
			"rangeZero": "_7ar4Xq_rangeZero",
			"resultAnswer": "_7ar4Xq_resultAnswer",
			"resultEvidence": "_7ar4Xq_resultEvidence",
			"resultMark": "_7ar4Xq_resultMark",
			"revealButton": "_7ar4Xq_revealButton",
			"revealCurrentFrame": "_7ar4Xq_revealCurrentFrame",
			"revealTransition": "_7ar4Xq_revealTransition",
			"revealed": "_7ar4Xq_revealed",
			"round": "_7ar4Xq_round",
			"roundAlignment": "_7ar4Xq_roundAlignment",
			"roundCurveList": "_7ar4Xq_roundCurveList",
			"roundFeedback": "_7ar4Xq_roundFeedback",
			"roundHeader": "_7ar4Xq_roundHeader",
			"roundNode": "_7ar4Xq_roundNode",
			"roundParameter": "_7ar4Xq_roundParameter",
			"roundParameterValues": "_7ar4Xq_roundParameterValues",
			"roundProcess": "_7ar4Xq_roundProcess",
			"roundStructure": "_7ar4Xq_roundStructure",
			"rowPrompt": "_7ar4Xq_rowPrompt",
			"runningDot": "_7ar4Xq_runningDot",
			"scaffold": "_7ar4Xq_scaffold",
			"skeletonLine": "_7ar4Xq_skeletonLine",
			"skeletonPulse": "_7ar4Xq_skeletonPulse",
			"srOnly": "_7ar4Xq_srOnly",
			"stepButton": "_7ar4Xq_stepButton",
			"stepFocus": "_7ar4Xq_stepFocus",
			"stepMeta": "_7ar4Xq_stepMeta",
			"textButton": "_7ar4Xq_textButton",
			"tickLabel": "_7ar4Xq_tickLabel",
			"visualAxisLabel": "_7ar4Xq_visualAxisLabel",
			"visualChart": "_7ar4Xq_visualChart",
			"visualChartRegion": "_7ar4Xq_visualChartRegion",
			"visualControls": "_7ar4Xq_visualControls",
			"visualCurve": "_7ar4Xq_visualCurve",
			"visualDescription": "_7ar4Xq_visualDescription",
			"visualGrid": "_7ar4Xq_visualGrid",
			"visualLegend": "_7ar4Xq_visualLegend",
			"visualMetrics": "_7ar4Xq_visualMetrics",
			"visualPlot": "_7ar4Xq_visualPlot",
			"visualPoint": "_7ar4Xq_visualPoint",
			"visualRange": "_7ar4Xq_visualRange",
			"visualRangeEnds": "_7ar4Xq_visualRangeEnds",
			"visualRangeHeader": "_7ar4Xq_visualRangeHeader",
			"visualTextFallback": "_7ar4Xq_visualTextFallback",
			"visualTick": "_7ar4Xq_visualTick",
			"zeroAxis": "_7ar4Xq_zeroAxis"
		};
		//#endregion
		//#region \0dsh-css:src/client/tokens.module.css.mjs
		const css$13 = "[data-learning-scope]{--lx-text-micro:11px;--lx-leading-micro:16px;--lx-text-2xs:12px;--lx-leading-2xs:17px;--lx-text-xs:13px;--lx-leading-xs:20px;--lx-text-sm:14px;--lx-leading-sm:21px;--lx-text-base:15px;--lx-leading-base:23px;--lx-text-md:16px;--lx-leading-md:25px;--lx-text-lg:18px;--lx-leading-lg:27px;--lx-text-xl:clamp(18px, 4cqi, 22px);--lx-leading-xl:1.5;--lx-text-formula:clamp(16px, 3cqi, 20px);--lx-leading-formula:27px;--lx-weight-regular:400;--lx-weight-medium:550;--lx-weight-strong:650;--lx-tracking-eyebrow:.08em;--lx-font-mono:var(--dsw-font-mono,ui-monospace, SFMono-Regular, Consolas, monospace);--lx-space-3xs:2px;--lx-space-2xs:4px;--lx-space-xs:6px;--lx-space-sm:8px;--lx-space-md:10px;--lx-space-lg:12px;--lx-space-xl:16px;--lx-space-2xl:20px;--lx-space-3xl:24px;--lx-radius-xs:6px;--lx-radius-sm:8px;--lx-radius-md:10px;--lx-radius-lg:12px;--lx-radius-xl:16px;--lx-radius-pill:999px;--lx-radius-circle:50%;--lx-host-bg:var(--dsw-alias-bg-layer-1,Canvas);--lx-host-label:var(--dsw-alias-label-primary,CanvasText);--lx-host-accent:var(--dsw-alias-state-business-primary,var(--dsw-alias-brand-primary,#2f73ea));--lx-host-accent-soft:var(--dsw-alias-state-business-tertiary,color-mix(in srgb, var(--lx-host-accent) 14%, transparent));--lx-surface-base:var(--lx-host-bg);--lx-surface-card:color-mix(in srgb, var(--lx-host-bg) 96%, transparent);--lx-surface-raised:color-mix(in srgb, var(--lx-host-bg) 88%, var(--lx-host-label) 3%);--lx-surface-sunken:color-mix(in srgb, var(--lx-host-label) 3.5%, var(--lx-host-bg));--lx-surface-accent:color-mix(in srgb, var(--lx-host-accent-soft) 30%, transparent);--lx-border-subtle:var(--dsw-alias-border-l1,color-mix(in srgb, var(--lx-host-label) 12%, transparent));--lx-border-default:var(--dsw-alias-border-l2,color-mix(in srgb, var(--lx-host-label) 18%, transparent));--lx-border-strong:var(--dsw-alias-border-l3,color-mix(in srgb, var(--lx-host-label) 28%, transparent));--lx-border-strongest:var(--dsw-alias-border-l4,color-mix(in srgb, var(--lx-host-label) 38%, transparent));--lx-label-primary:var(--lx-host-label);--lx-label-secondary:var(--dsw-alias-label-secondary,color-mix(in srgb, var(--lx-host-label) 76%, transparent));--lx-label-tertiary:var(--dsw-alias-label-tertiary,color-mix(in srgb, var(--lx-host-label) 58%, transparent));--lx-label-on-accent:var(--dsw-alias-label-on-primary,white);--lx-accent:var(--lx-host-accent);--lx-accent-soft:var(--lx-host-accent-soft);--lx-success:var(--dsw-alias-state-success-primary,#2f9e5f);--lx-warn:var(--dsw-alias-state-warn-primary,#d1741f);--lx-danger:var(--dsw-alias-state-error-primary,#df4f4f);--lx-label-error:var(--dsw-alias-label-error,var(--lx-danger));--lx-label-inverted:var(--dsw-alias-label-primary-inverted,var(--lx-surface-base));--lx-card-border:1px solid var(--lx-border-default);--lx-card-radius:var(--lx-radius-xl);--lx-card-padding:clamp(16px, 2.8cqi, 22px);--lx-card-background:var(--lx-surface-card);--lx-shadow-sm:0 1px 3px color-mix(in srgb, var(--lx-host-label) 6%, transparent), 0 1px 2px color-mix(in srgb, var(--lx-host-label) 4%, transparent);--lx-shadow-md:0 4px 12px -2px color-mix(in srgb, var(--lx-host-label) 8%, transparent), 0 2px 6px -1px color-mix(in srgb, var(--lx-host-label) 4%, transparent);--lx-shadow-lg:0 10px 24px -4px color-mix(in srgb, var(--lx-host-label) 10%, transparent), 0 4px 10px -2px color-mix(in srgb, var(--lx-host-label) 5%, transparent);--lx-focus-color:var(--lx-accent);--lx-focus-width:2px;--lx-focus-offset:3px;--lx-control-height-sm:30px;--lx-control-height-md:34px;--lx-control-padding-sm:var(--lx-space-2xs) var(--lx-space-md);--lx-control-padding-md:var(--lx-space-xs) var(--lx-space-lg);--lx-control-disabled-opacity:.42;--lx-motion-fast:.14s;--lx-motion-base:.2s;--lx-easing:cubic-bezier(.16, 1, .3, 1);--lx-spring-easing:cubic-bezier(.16, 1, .3, 1);--lx-tone-blue:var(--lx-accent);--lx-tone-green:var(--lx-success);--lx-tone-red:var(--lx-danger);--lx-tone-orange:var(--lx-warn);--lx-tone-purple:color-mix(in srgb, var(--lx-accent) 58%, var(--lx-danger));--lx-tone-gray:var(--dsw-alias-label-tertiary,color-mix(in srgb, var(--lx-host-label) 58%, transparent));--visual-tone:var(--lx-tone-blue);--visual-tone-glow:color-mix(in srgb, var(--visual-tone) 24%, transparent);--lx-vs-alpha:1;--lx-vs-ring:0;--lx-vs-lift:0}[data-learning-scope] [data-visual-state]{--lx-vs-alpha:1;--lx-vs-ring:0;--lx-vs-lift:0}[data-learning-scope] [data-visual-state=current]{--lx-vs-alpha:1;--lx-vs-ring:1;--lx-vs-lift:1}[data-learning-scope] [data-visual-state=selected]{--lx-vs-alpha:1;--lx-vs-ring:1}[data-learning-scope] [data-visual-state=related]{--lx-vs-alpha:.92}[data-learning-scope] [data-visual-state=visited]{--lx-vs-alpha:.78}[data-learning-scope] [data-visual-state=context]{--lx-vs-alpha:.62}[data-learning-scope] [data-visual-state=inactive]{--lx-vs-alpha:.55}[data-learning-scope] [data-visual-state=disabled]{--lx-vs-alpha:.38;pointer-events:none}[data-learning-scope] [data-tone=blue]{--visual-tone:var(--lx-tone-blue)}[data-learning-scope] [data-tone=green]{--visual-tone:var(--lx-tone-green)}[data-learning-scope] [data-tone=red]{--visual-tone:var(--lx-tone-red)}[data-learning-scope] [data-tone=orange]{--visual-tone:var(--lx-tone-orange)}[data-learning-scope] [data-tone=purple]{--visual-tone:var(--lx-tone-purple)}[data-learning-scope] [data-tone=gray]{--visual-tone:var(--lx-tone-gray)}[data-learning-scope] :focus-visible{outline:var(--lx-focus-width) solid var(--lx-focus-color);outline-offset:var(--lx-focus-offset)}@media (prefers-reduced-motion:reduce){[data-learning-scope]{--lx-motion-fast:0s;--lx-motion-base:0s}}@media (forced-colors:active){[data-learning-scope] [data-visual-state],[data-learning-scope] [data-visual-state=disabled]{--lx-vs-alpha:1}}";
		const tagId$13 = "@dsh-portable/interactive-learning/tokens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$13) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$13;
			tag.textContent = css$13;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/tokens.ts
		const learningScope = { "data-learning-scope": "" };
		//#endregion
		//#region src/client/ActivityFrame.tsx
		function ActivityFrame({ activityId, activity, busy, error, children, onSkip, onCancel, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: LearningActivity_module_css_default.inlineActivity,
				...learningScope,
				"aria-label": activity.title,
				"data-learning-activity": activity.kind,
				"data-learning-activity-id": activityId,
				"data-learning-surface": "inline",
				children: [
					children,
					activity.scaffold === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: LearningActivity_module_css_default.scaffold,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("scaffold") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: activity.scaffold })]
					}),
					error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.error,
						role: "alert",
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LearningActivity_module_css_default.activityActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.textButton,
							type: "button",
							disabled: busy,
							onClick: onSkip,
							children: t("skip")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.textButton,
							type: "button",
							disabled: busy,
							onClick: onCancel,
							children: t("cancel")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/math-expression.ts
		/**
		* Compile a closed AST into a small closure tree once, so sampling a curve
		* does not repeatedly dispatch through every AST node. This intentionally
		* uses ordinary closures instead of `new Function`: the model payload remains
		* data-only while the hot render path still gets one function call per sample.
		*/
		function compileMathExpression(expression) {
			switch (expression.op) {
				case "constant": return () => expression.value;
				case "variable": return (bindings) => bindings[expression.name] ?? NaN;
				case "add": {
					const left = compileMathExpression(expression.left);
					const right = compileMathExpression(expression.right);
					return (bindings) => left(bindings) + right(bindings);
				}
				case "sub": {
					const left = compileMathExpression(expression.left);
					const right = compileMathExpression(expression.right);
					return (bindings) => left(bindings) - right(bindings);
				}
				case "mul": {
					const left = compileMathExpression(expression.left);
					const right = compileMathExpression(expression.right);
					return (bindings) => left(bindings) * right(bindings);
				}
				case "div": {
					const left = compileMathExpression(expression.left);
					const right = compileMathExpression(expression.right);
					return (bindings) => left(bindings) / right(bindings);
				}
				case "pow": {
					const left = compileMathExpression(expression.left);
					const right = compileMathExpression(expression.right);
					return (bindings) => left(bindings) ** right(bindings);
				}
				case "min": {
					const left = compileMathExpression(expression.left);
					const right = compileMathExpression(expression.right);
					return (bindings) => Math.min(left(bindings), right(bindings));
				}
				case "max": {
					const left = compileMathExpression(expression.left);
					const right = compileMathExpression(expression.right);
					return (bindings) => Math.max(left(bindings), right(bindings));
				}
				case "neg": {
					const value = compileMathExpression(expression.value);
					return (bindings) => -value(bindings);
				}
				case "abs": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.abs(value(bindings));
				}
				case "sqrt": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.sqrt(value(bindings));
				}
				case "sin": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.sin(value(bindings));
				}
				case "cos": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.cos(value(bindings));
				}
				case "tan": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.tan(value(bindings));
				}
				case "atan": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.atan(value(bindings));
				}
				case "exp": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.exp(value(bindings));
				}
				case "log": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.log(value(bindings));
				}
				case "sigmoid": {
					const value = compileMathExpression(expression.value);
					return (bindings) => {
						const result = value(bindings);
						if (result >= 0) return 1 / (1 + Math.exp(-result));
						const exponential = Math.exp(result);
						return exponential / (1 + exponential);
					};
				}
				case "relu": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.max(0, value(bindings));
				}
				case "leaky_relu": {
					const value = compileMathExpression(expression.value);
					return (bindings) => {
						const result = value(bindings);
						return result >= 0 ? result : result * .01;
					};
				}
				case "step": {
					const value = compileMathExpression(expression.value);
					return (bindings) => value(bindings) >= 0 ? 1 : 0;
				}
				case "normpdf": {
					const value = compileMathExpression(expression.value);
					return (bindings) => {
						const result = value(bindings);
						return Math.exp(-.5 * result * result) / Math.sqrt(2 * Math.PI);
					};
				}
				case "floor": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.floor(value(bindings));
				}
				case "ceil": {
					const value = compileMathExpression(expression.value);
					return (bindings) => Math.ceil(value(bindings));
				}
			}
		}
		/**
		* Evaluate the protocol's closed mathematical AST. The protocol validator
		* bounds its depth and node count; this evaluator never executes source text.
		*/
		function evaluateMathExpression(expression, bindings) {
			switch (expression.op) {
				case "constant": return expression.value;
				case "variable": return bindings[expression.name] ?? NaN;
				case "add": return evaluateMathExpression(expression.left, bindings) + evaluateMathExpression(expression.right, bindings);
				case "sub": return evaluateMathExpression(expression.left, bindings) - evaluateMathExpression(expression.right, bindings);
				case "mul": return evaluateMathExpression(expression.left, bindings) * evaluateMathExpression(expression.right, bindings);
				case "div": return evaluateMathExpression(expression.left, bindings) / evaluateMathExpression(expression.right, bindings);
				case "pow": return evaluateMathExpression(expression.left, bindings) ** evaluateMathExpression(expression.right, bindings);
				case "min": return Math.min(evaluateMathExpression(expression.left, bindings), evaluateMathExpression(expression.right, bindings));
				case "max": return Math.max(evaluateMathExpression(expression.left, bindings), evaluateMathExpression(expression.right, bindings));
				case "neg": return -evaluateMathExpression(expression.value, bindings);
				case "abs": return Math.abs(evaluateMathExpression(expression.value, bindings));
				case "sqrt": return Math.sqrt(evaluateMathExpression(expression.value, bindings));
				case "sin": return Math.sin(evaluateMathExpression(expression.value, bindings));
				case "cos": return Math.cos(evaluateMathExpression(expression.value, bindings));
				case "tan": return Math.tan(evaluateMathExpression(expression.value, bindings));
				case "atan": return Math.atan(evaluateMathExpression(expression.value, bindings));
				case "exp": return Math.exp(evaluateMathExpression(expression.value, bindings));
				case "log": return Math.log(evaluateMathExpression(expression.value, bindings));
				case "sigmoid": {
					const value = evaluateMathExpression(expression.value, bindings);
					if (value >= 0) return 1 / (1 + Math.exp(-value));
					const exponential = Math.exp(value);
					return exponential / (1 + exponential);
				}
				case "relu": return Math.max(0, evaluateMathExpression(expression.value, bindings));
				case "leaky_relu": {
					const value = evaluateMathExpression(expression.value, bindings);
					return value >= 0 ? value : value * .01;
				}
				case "step": return evaluateMathExpression(expression.value, bindings) >= 0 ? 1 : 0;
				case "normpdf": {
					const value = evaluateMathExpression(expression.value, bindings);
					return Math.exp(-.5 * value * value) / Math.sqrt(2 * Math.PI);
				}
				case "floor": return Math.floor(evaluateMathExpression(expression.value, bindings));
				case "ceil": return Math.ceil(evaluateMathExpression(expression.value, bindings));
			}
		}
		//#endregion
		//#region src/client/ParameterExplorer.tsx
		const MAX_RENDERABLE_VALUE = 0xe8d4a51000;
		const MAX_PARAMETER_DOMAIN_SAMPLES = 33;
		function formatNumber$2(value) {
			return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));
		}
		function uniqueNumbers(values) {
			return [...new Set(values.map((value) => Number(value.toPrecision(12))))];
		}
		function parameterCandidates(parameter) {
			const discreteSteps = Math.max(1, Math.ceil((parameter.max - parameter.min) / parameter.step));
			const sampleCount = Math.min(discreteSteps + 1, MAX_PARAMETER_DOMAIN_SAMPLES);
			return uniqueNumbers([
				...Array.from({ length: sampleCount }, (_, index) => {
					const stepIndex = sampleCount === 1 ? 0 : Math.round(index * discreteSteps / (sampleCount - 1));
					return Math.min(parameter.max, parameter.min + stepIndex * parameter.step);
				}),
				parameter.min,
				parameter.max,
				parameter.initial,
				...parameter.min <= 0 && parameter.max >= 0 ? [0] : []
			]);
		}
		function parameterStates(payload) {
			return payload.parameters.reduce((states, parameter) => {
				const candidates = parameterCandidates(parameter);
				return states.flatMap((state) => candidates.map((value) => ({
					...state,
					[parameter.id]: value
				})));
			}, [{}]);
		}
		function niceStep$2(rawStep) {
			if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
			const power = 10 ** Math.floor(Math.log10(rawStep));
			const normalized = rawStep / power;
			return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
		}
		function paddedYDomain(min, max) {
			if (min === max) {
				const radius = Math.max(Math.abs(min) * .2, 1);
				return {
					min: min - radius,
					max: max + radius
				};
			}
			const span = max - min;
			const padding = span * .08;
			const step = niceStep$2((span + padding * 2) / 5);
			let domainMin = Math.floor((min - padding) / step) * step;
			let domainMax = Math.ceil((max + padding) / step) * step;
			if (domainMin === domainMax) {
				domainMin -= step;
				domainMax += step;
			}
			return {
				min: domainMin,
				max: domainMax
			};
		}
		function stableYDomain(payload) {
			const samples = Math.min(payload.xAxis.samples ?? 96, 96);
			let min = 0;
			let max = 0;
			let found = false;
			for (const values of parameterStates(payload)) for (let index = 0; index < samples; index += 1) {
				const x = payload.xAxis.min + (payload.xAxis.max - payload.xAxis.min) * index / (samples - 1);
				for (const curve of payload.curves) {
					const y = evaluateMathExpression(curve.expression, {
						...values,
						x
					});
					if (!Number.isFinite(y) || Math.abs(y) > MAX_RENDERABLE_VALUE) continue;
					min = found ? Math.min(min, y) : Math.min(0, y);
					max = found ? Math.max(max, y) : Math.max(0, y);
					found = true;
				}
			}
			if (!found) return {
				min: -1,
				max: 1
			};
			return paddedYDomain(min, max);
		}
		function yDomainForState(payload, values, stable) {
			const samples = payload.xAxis.samples ?? 96;
			let min = stable.min;
			let max = stable.max;
			let expanded = false;
			for (let index = 0; index < samples; index += 1) {
				const x = payload.xAxis.min + (payload.xAxis.max - payload.xAxis.min) * index / (samples - 1);
				for (const curve of payload.curves) {
					const y = evaluateMathExpression(curve.expression, {
						...values,
						x
					});
					if (!Number.isFinite(y) || Math.abs(y) > MAX_RENDERABLE_VALUE) continue;
					if (y < min) {
						min = y;
						expanded = true;
					}
					if (y > max) {
						max = y;
						expanded = true;
					}
				}
			}
			return expanded ? paddedYDomain(min, max) : stable;
		}
		function ticksFor(domain, targetCount = 5) {
			const step = niceStep$2((domain.max - domain.min) / targetCount);
			const first = Math.ceil(domain.min / step) * step;
			const ticks = [];
			for (let value = first; value <= domain.max + step * 1e-8; value += step) ticks.push(Number(value.toPrecision(12)));
			return ticks;
		}
		function chartGeometry$1(width) {
			const safeWidth = Math.max(280, Math.round(width));
			const height = safeWidth < 480 ? 260 : 300;
			const left = safeWidth < 360 ? 56 : 64;
			const right = 18;
			const top = 18;
			const bottom = 40;
			return {
				width: safeWidth,
				height,
				left,
				right,
				top,
				bottom,
				plotWidth: safeWidth - left - right,
				plotHeight: height - top - bottom
			};
		}
		function scaleX$2(value, domain, geometry) {
			return geometry.left + (value - domain.min) / (domain.max - domain.min) * geometry.plotWidth;
		}
		function scaleY$2(value, domain, geometry) {
			return geometry.top + (domain.max - value) / (domain.max - domain.min) * geometry.plotHeight;
		}
		function pathsFor(payload, values, yDomain, geometry) {
			const samples = payload.xAxis.samples ?? 96;
			const xDomain = {
				min: payload.xAxis.min,
				max: payload.xAxis.max
			};
			const series = payload.curves.map(() => []);
			for (let index = 0; index < samples; index += 1) {
				const x = payload.xAxis.min + (payload.xAxis.max - payload.xAxis.min) * index / (samples - 1);
				for (const [curveIndex, curve] of payload.curves.entries()) series[curveIndex]?.push({
					x,
					y: evaluateMathExpression(curve.expression, {
						...values,
						x
					})
				});
			}
			return series.map((points) => {
				let open = false;
				let previousY = null;
				return points.map((point) => {
					if (!Number.isFinite(point.y) || Math.abs(point.y) > MAX_RENDERABLE_VALUE) {
						open = false;
						previousY = null;
						return "";
					}
					const px = scaleX$2(point.x, xDomain, geometry);
					const py = scaleY$2(point.y, yDomain, geometry);
					if (previousY !== null && Math.abs(py - previousY) > geometry.plotHeight * 1.5) open = false;
					const command = open ? "L" : "M";
					open = true;
					previousY = py;
					return `${command}${px.toFixed(2)},${py.toFixed(2)}`;
				}).filter(Boolean).join(" ");
			});
		}
		function rangeStyle$1(parameter, value) {
			const span = parameter.max - parameter.min;
			const valuePercent = (value - parameter.min) / span * 100;
			const anchorPercent = ((parameter.min <= 0 && parameter.max >= 0 ? 0 : parameter.min) - parameter.min) / span * 100;
			return {
				"--range-low": `${Math.min(valuePercent, anchorPercent)}%`,
				"--range-high": `${Math.max(valuePercent, anchorPercent)}%`
			};
		}
		function shiftedValue(parameter, current, direction) {
			const shifted = current + parameter.step * direction;
			const clamped = Math.min(parameter.max, Math.max(parameter.min, shifted));
			return Number(clamped.toPrecision(12));
		}
		/** V2 current-frame parameter visual. It deliberately owns no teaching prompt or answer. */
		function ParameterRoundVisual({ payload, disabled, t }) {
			const chartId = (0, react.useId)();
			const [values, setValues] = (0, react.useState)(() => Object.fromEntries(payload.parameters.map((parameter) => [parameter.id, parameter.initial])));
			const fullPayload = payload;
			const stableDomain = (0, react.useMemo)(() => stableYDomain(fullPayload), [fullPayload]);
			const yDomain = (0, react.useMemo)(() => yDomainForState(fullPayload, values, stableDomain), [
				fullPayload,
				stableDomain,
				values
			]);
			const geometry = (0, react.useMemo)(() => chartGeometry$1(640), []);
			const paths = (0, react.useMemo)(() => pathsFor(fullPayload, values, yDomain, geometry), [
				fullPayload,
				geometry,
				values,
				yDomain
			]);
			const description = t("chartDescription", {
				parameters: payload.parameters.map((parameter) => `${parameter.label} ${formatNumber$2(values[parameter.id] ?? parameter.initial)}`).join("; "),
				xAxis: `${payload.xAxis.label ?? "x"} ${formatNumber$2(payload.xAxis.min)}–${formatNumber$2(payload.xAxis.max)}`,
				yAxis: `y ${formatNumber$2(yDomain.min)}–${formatNumber$2(yDomain.max)}`,
				curves: payload.curves.map((curve) => curve.label).join("; ")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LearningActivity_module_css_default.explorer,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: LearningActivity_module_css_default.controls,
					children: payload.parameters.map((parameter) => {
						const value = values[parameter.id] ?? parameter.initial;
						const inputId = `${chartId}-${parameter.id}`;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LearningActivity_module_css_default.rangeField,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LearningActivity_module_css_default.rangeHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									htmlFor: inputId,
									children: parameter.label
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("output", {
									htmlFor: inputId,
									"aria-live": "polite",
									children: formatNumber$2(value)
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: inputId,
								className: LearningActivity_module_css_default.rangeInput,
								style: rangeStyle$1(parameter, value),
								type: "range",
								min: parameter.min,
								max: parameter.max,
								step: parameter.step,
								value,
								disabled,
								onChange: (event) => setValues((current) => ({
									...current,
									[parameter.id]: Number(event.target.value)
								}))
							})]
						}, parameter.id);
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: LearningActivity_module_css_default.chartRegion,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: LearningActivity_module_css_default.legend,
						children: payload.curves.map((curve, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							"data-curve": index,
							children: curve.label
						}, curve.id))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						className: LearningActivity_module_css_default.chart,
						viewBox: `0 0 ${geometry.width} ${geometry.height}`,
						role: "img",
						"aria-labelledby": `${chartId}-title ${chartId}-description`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", {
								id: `${chartId}-title`,
								children: t("chartLabel")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("desc", {
								id: `${chartId}-description`,
								children: description
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								className: LearningActivity_module_css_default.plotFrame,
								x: geometry.left,
								y: geometry.top,
								width: geometry.plotWidth,
								height: geometry.plotHeight,
								rx: "6"
							}),
							paths.map((path, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								className: LearningActivity_module_css_default.curve,
								"data-curve": index,
								d: path
							}, payload.curves[index]?.id))
						]
					})]
				})]
			});
		}
		function ParameterExplorer({ activity, busy, onSubmit, t }) {
			const payload = activity.payload;
			const chartId = (0, react.useId)();
			const chartContainer = (0, react.useRef)(null);
			const [chartWidth, setChartWidth] = (0, react.useState)(640);
			const [values, setValues] = (0, react.useState)(() => Object.fromEntries(payload.parameters.map((parameter) => [parameter.id, parameter.initial])));
			const [answer, setAnswer] = (0, react.useState)("");
			const stableDomain = (0, react.useMemo)(() => stableYDomain(payload), [payload]);
			const yDomain = (0, react.useMemo)(() => yDomainForState(payload, values, stableDomain), [
				payload,
				stableDomain,
				values
			]);
			const geometry = (0, react.useMemo)(() => chartGeometry$1(chartWidth), [chartWidth]);
			const xDomain = (0, react.useMemo)(() => ({
				min: payload.xAxis.min,
				max: payload.xAxis.max
			}), [payload.xAxis.max, payload.xAxis.min]);
			const xTicks = (0, react.useMemo)(() => ticksFor(xDomain), [xDomain]);
			const yTicks = (0, react.useMemo)(() => ticksFor(yDomain), [yDomain]);
			const paths = (0, react.useMemo)(() => pathsFor(payload, values, yDomain, geometry), [
				geometry,
				payload,
				values,
				yDomain
			]);
			const chartDescription = t("chartDescription", {
				parameters: payload.parameters.map((parameter) => `${parameter.label} ${formatNumber$2(values[parameter.id] ?? parameter.initial)} (${formatNumber$2(parameter.min)}–${formatNumber$2(parameter.max)})`).join("; "),
				xAxis: `${payload.xAxis.label ?? "x"} ${formatNumber$2(xDomain.min)}–${formatNumber$2(xDomain.max)}`,
				yAxis: `y ${formatNumber$2(yDomain.min)}–${formatNumber$2(yDomain.max)}`,
				curves: payload.curves.map((curve) => curve.label).join("; ")
			});
			(0, react.useEffect)(() => {
				const container = chartContainer.current;
				if (!container) return;
				const updateWidth = (width) => {
					if (width >= 280) setChartWidth((current) => Math.abs(current - width) < 1 ? current : width);
				};
				updateWidth(container.getBoundingClientRect().width);
				if (typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver((entries) => {
					const entry = entries[0];
					if (entry) updateWidth(entry.contentRect.width);
				});
				observer.observe(container);
				return () => observer.disconnect();
			}, []);
			const setParameter = (parameter, value) => {
				setValues((current) => ({
					...current,
					[parameter.id]: value
				}));
			};
			const submit = () => {
				const parameters = { ...values };
				onSubmit({
					answer: {
						parameters,
						explanation: answer.trim()
					},
					interactionState: { parameters }
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LearningActivity_module_css_default.activityContent,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.prompt,
						children: payload.question ?? activity.prompt
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LearningActivity_module_css_default.explorer,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LearningActivity_module_css_default.controls,
							children: payload.parameters.map((parameter) => {
								const value = values[parameter.id] ?? parameter.initial;
								const inputId = `${chartId}-${parameter.id}`;
								const zeroPercent = (0 - parameter.min) / (parameter.max - parameter.min) * 100;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: LearningActivity_module_css_default.rangeField,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: LearningActivity_module_css_default.rangeHeader,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: inputId,
											children: parameter.label
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("output", {
											htmlFor: inputId,
											"aria-live": "polite",
											children: formatNumber$2(value)
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: LearningActivity_module_css_default.rangeControl,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: LearningActivity_module_css_default.stepButton,
												type: "button",
												disabled: busy || value <= parameter.min,
												"aria-label": t("decreaseParameter", { label: parameter.label }),
												onClick: () => setParameter(parameter, shiftedValue(parameter, value, -1)),
												children: "−"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												id: inputId,
												className: LearningActivity_module_css_default.rangeInput,
												style: rangeStyle$1(parameter, value),
												type: "range",
												min: parameter.min,
												max: parameter.max,
												step: parameter.step,
												value,
												disabled: busy,
												"aria-valuetext": formatNumber$2(value),
												onChange: (event) => setParameter(parameter, Number(event.target.value))
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: LearningActivity_module_css_default.stepButton,
												type: "button",
												disabled: busy || value >= parameter.max,
												"aria-label": t("increaseParameter", { label: parameter.label }),
												onClick: () => setParameter(parameter, shiftedValue(parameter, value, 1)),
												children: "+"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: LearningActivity_module_css_default.rangeEnds,
												"aria-hidden": "true",
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber$2(parameter.min) }),
													parameter.min < 0 && parameter.max > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: LearningActivity_module_css_default.rangeZero,
														style: { left: `${zeroPercent}%` },
														children: "0"
													}) : null,
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber$2(parameter.max) })
												]
											})
										]
									})]
								}, parameter.id);
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LearningActivity_module_css_default.chartRegion,
							ref: chartContainer,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: LearningActivity_module_css_default.legend,
								children: payload.curves.map((curve, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									"data-curve": index,
									children: curve.label
								}, curve.id))
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								className: LearningActivity_module_css_default.chart,
								viewBox: `0 0 ${geometry.width} ${geometry.height}`,
								role: "img",
								"aria-labelledby": `${chartId}-title ${chartId}-description`,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", {
										id: `${chartId}-title`,
										children: t("chartLabel")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("desc", {
										id: `${chartId}-description`,
										children: chartDescription
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
										id: `${chartId}-clip`,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											x: geometry.left,
											y: geometry.top,
											width: geometry.plotWidth,
											height: geometry.plotHeight
										})
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
										className: LearningActivity_module_css_default.plotFrame,
										x: geometry.left,
										y: geometry.top,
										width: geometry.plotWidth,
										height: geometry.plotHeight,
										rx: "6"
									}),
									yTicks.map((tick) => {
										const y = scaleY$2(tick, yDomain, geometry);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											className: tick === 0 ? `${LearningActivity_module_css_default.gridLine} ${LearningActivity_module_css_default.zeroAxis}` : LearningActivity_module_css_default.gridLine,
											x1: geometry.left,
											x2: geometry.left + geometry.plotWidth,
											y1: y,
											y2: y
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											className: LearningActivity_module_css_default.tickLabel,
											x: geometry.left - 9,
											y,
											textAnchor: "end",
											dominantBaseline: "middle",
											children: formatNumber$2(tick)
										})] }, `y-${tick}`);
									}),
									xTicks.map((tick) => {
										const x = scaleX$2(tick, xDomain, geometry);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											className: tick === 0 ? `${LearningActivity_module_css_default.gridLine} ${LearningActivity_module_css_default.zeroAxis}` : LearningActivity_module_css_default.gridLine,
											x1: x,
											x2: x,
											y1: geometry.top,
											y2: geometry.top + geometry.plotHeight
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											className: LearningActivity_module_css_default.tickLabel,
											x,
											y: geometry.top + geometry.plotHeight + 20,
											textAnchor: "middle",
											children: formatNumber$2(tick)
										})] }, `x-${tick}`);
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: LearningActivity_module_css_default.axisLabel,
										"data-axis": "y",
										x: geometry.left,
										y: geometry.top - 7,
										textAnchor: "start",
										children: "y"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: LearningActivity_module_css_default.axisLabel,
										"data-axis": "x",
										x: geometry.left + geometry.plotWidth,
										y: geometry.height - 5,
										textAnchor: "end",
										children: payload.xAxis.label ?? "x"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
										clipPath: `url(#${chartId}-clip)`,
										children: paths.map((path, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
											className: LearningActivity_module_css_default.curve,
											"data-curve": index,
											d: path
										}, payload.curves[index]?.id))
									})
								]
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: LearningActivity_module_css_default.answerField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("answer") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: answer,
							disabled: busy,
							placeholder: t("answerPlaceholder"),
							onChange: (event) => setAnswer(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LearningActivity_module_css_default.primaryRow,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.primaryButton,
							type: "button",
							disabled: busy || answer.trim() === "",
							onClick: submit,
							children: busy ? t("submitting") : t("submit")
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/ProcessStepper.tsx
		function ProcessStepper({ activity, busy, onSubmit, t }) {
			const { steps } = activity.payload;
			const headingId = (0, react.useId)();
			const [index, setIndex] = (0, react.useState)(0);
			const [furthest, setFurthest] = (0, react.useState)(0);
			const [answers, setAnswers] = (0, react.useState)({});
			const [revealed, setRevealed] = (0, react.useState)(() => new Set(steps.filter((step) => step.checkpoint === void 0).map((step) => step.id)));
			const step = steps[index];
			const isRevealed = revealed.has(step.id);
			const prediction = answers[step.id] ?? "";
			const canReveal = step.checkpoint === void 0 || prediction.trim() !== "";
			const reveal = () => setRevealed((current) => /* @__PURE__ */ new Set([...current, step.id]));
			const restart = () => {
				setIndex(0);
				setFurthest(0);
				setAnswers({});
				setRevealed(new Set(steps.filter((item) => item.checkpoint === void 0).map((item) => item.id)));
			};
			const advance = () => {
				const next = Math.min(index + 1, steps.length - 1);
				setIndex(next);
				setFurthest((current) => Math.max(current, next));
			};
			const submit = () => {
				onSubmit({
					answer: { checkpoints: steps.filter((item) => item.checkpoint !== void 0).map((item) => ({
						stepId: item.id,
						answer: answers[item.id] ?? ""
					})) },
					interactionState: {
						currentStep: index,
						revealed: [...revealed]
					}
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LearningActivity_module_css_default.activityContent,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.prompt,
						children: activity.payload.question ?? activity.prompt
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LearningActivity_module_css_default.stepMeta,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("step", {
							current: index + 1,
							total: steps.length
						}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.textButton,
							type: "button",
							disabled: busy,
							onClick: restart,
							children: t("restart")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: `${LearningActivity_module_css_default.processMap} ${steps.length > 6 ? LearningActivity_module_css_default.processMapVertical : ""}`,
						style: { "--process-step-count": steps.length },
						"aria-label": t("processMap"),
						"data-process-map": "true",
						children: steps.map((item, itemIndex) => {
							const state = itemIndex === index ? "current" : itemIndex <= furthest ? "complete" : "upcoming";
							const connectorComplete = itemIndex < furthest || itemIndex === index && revealed.has(item.id);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
								className: LearningActivity_module_css_default.processStep,
								"data-state": state,
								"data-connector-complete": connectorComplete || void 0,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									className: LearningActivity_module_css_default.processStepButton,
									type: "button",
									disabled: busy || itemIndex > furthest,
									"aria-current": itemIndex === index ? "step" : void 0,
									onClick: () => setIndex(itemIndex),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: LearningActivity_module_css_default.processNode,
										"aria-hidden": "true",
										children: state === "complete" ? "✓" : itemIndex + 1
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: LearningActivity_module_css_default.processTitle,
										children: item.title
									})]
								})
							}, item.id);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: LearningActivity_module_css_default.stepFocus,
						"aria-labelledby": headingId,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								id: headingId,
								children: step.title
							}),
							step.checkpoint === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
								className: LearningActivity_module_css_default.prediction,
								disabled: busy || isRevealed,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: t("predict") }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: step.checkpoint.question }),
									step.checkpoint.options === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										"aria-label": step.checkpoint.question,
										value: prediction,
										onChange: (event) => setAnswers((current) => ({
											...current,
											[step.id]: event.target.value
										}))
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: LearningActivity_module_css_default.predictionOptions,
										children: step.checkpoint.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
											className: LearningActivity_module_css_default.option,
											"data-selected": prediction === option || void 0,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												type: "radio",
												name: `prediction-${step.id}`,
												value: option,
												checked: prediction === option,
												onChange: () => setAnswers((current) => ({
													...current,
													[step.id]: option
												}))
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option })]
										}, option))
									})
								]
							}),
							!isRevealed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: LearningActivity_module_css_default.revealButton,
								type: "button",
								disabled: busy || !canReveal,
								onClick: reveal,
								children: t("reveal")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: LearningActivity_module_css_default.revealed,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: step.content })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LearningActivity_module_css_default.navigation,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.ghostButton,
							type: "button",
							disabled: busy || index === 0,
							onClick: () => setIndex((current) => current - 1),
							children: t("previous")
						}), index < steps.length - 1 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.primaryButton,
							type: "button",
							disabled: busy || !isRevealed,
							onClick: advance,
							children: t("next")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.primaryButton,
							type: "button",
							disabled: busy || !isRevealed,
							onClick: submit,
							children: busy ? t("submitting") : t("submit")
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/StructureCompare.tsx
		function Item({ item, side }) {
			if (item === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: LearningActivity_module_css_default.emptyCell,
				"data-side": side,
				children: "—"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LearningActivity_module_css_default.compareItem,
				"data-side": side,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: item.label }), item.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: item.detail })]
			});
		}
		function StructureCompare({ activity, busy, onSubmit, t }) {
			const payload = activity.payload;
			const [selected, setSelected] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [answer, setAnswer] = (0, react.useState)("");
			const left = new Map(payload.left.items.map((item) => [item.id, item]));
			const right = new Map(payload.right.items.map((item) => [item.id, item]));
			const toggle = (id) => setSelected((current) => {
				const next = new Set(current);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			});
			const submit = () => {
				const selectedDifferences = [...selected];
				onSubmit({
					answer: {
						selectedDifferences,
						explanation: answer.trim()
					},
					interactionState: { selectedDifferences }
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LearningActivity_module_css_default.activityContent,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.prompt,
						children: payload.question ?? activity.prompt
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LearningActivity_module_css_default.compareHeader,
						"aria-hidden": "true",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								"data-side": "left",
								children: payload.left.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LearningActivity_module_css_default.compareHeaderLink,
								children: "↔"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								"data-side": "right",
								children: payload.right.title
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LearningActivity_module_css_default.compareRows,
						role: "group",
						"aria-label": t("compareMap"),
						"data-structure-map": "true",
						children: payload.alignments.map((alignment) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: LearningActivity_module_css_default.compareRow,
							"data-alignment-id": alignment.id,
							"data-selected": selected.has(alignment.id) || void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Item, {
									item: alignment.leftId === void 0 ? void 0 : left.get(alignment.leftId),
									side: "left"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LearningActivity_module_css_default.compareLine,
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LearningActivity_module_css_default.compareSelector,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: selected.has(alignment.id),
										disabled: busy,
										"aria-label": alignment.prompt ?? alignment.id,
										onChange: () => toggle(alignment.id)
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LearningActivity_module_css_default.compareLine,
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Item, {
									item: alignment.rightId === void 0 ? void 0 : right.get(alignment.rightId),
									side: "right"
								}),
								alignment.prompt === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LearningActivity_module_css_default.rowPrompt,
									children: alignment.prompt
								})
							]
						}, alignment.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: LearningActivity_module_css_default.answerField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("answer") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: answer,
							disabled: busy,
							placeholder: t("answerPlaceholder"),
							onChange: (event) => setAnswer(event.target.value)
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LearningActivity_module_css_default.primaryRow,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.primaryButton,
							type: "button",
							disabled: busy || selected.size === 0 || answer.trim() === "",
							onClick: submit,
							children: busy ? t("submitting") : t("submit")
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/ActivityRenderer.tsx
		/**
		* Dispatch table for trusted, package-supplied React components. Extending the
		* protocol means registering another compiled component here, never accepting
		* model-provided HTML or JavaScript.
		*/
		var ActivityRendererRegistry = class {
			#renderers = /* @__PURE__ */ new Map();
			register(kind, renderer) {
				if (this.#renderers.has(kind)) throw new Error(`learning renderer already registered: ${kind}`);
				this.#renderers.set(kind, renderer);
				return () => {
					if (this.#renderers.get(kind) === renderer) this.#renderers.delete(kind);
				};
			}
			resolve(kind) {
				return this.#renderers.get(kind);
			}
			kinds() {
				return [...this.#renderers.keys()];
			}
		};
		const activityRendererRegistry = new ActivityRendererRegistry();
		activityRendererRegistry.register("parameter_explorer", ParameterExplorer);
		activityRendererRegistry.register("process_stepper", ProcessStepper);
		activityRendererRegistry.register("structure_compare", StructureCompare);
		function ActivityRenderer(props) {
			const Renderer = activityRendererRegistry.resolve(props.activity.kind);
			return Renderer === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Renderer, { ...props });
		}
		//#endregion
		//#region src/client/roundState.ts
		function initialRoundState(phase, completed = false) {
			if (completed) return {
				status: "completed",
				error: null
			};
			return {
				status: phase === "question" ? "awaiting_input" : "animating",
				error: null
			};
		}
		/**
		* The round lifecycle is deliberately explicit. UI animation events may move a
		* reveal to `ready_to_continue`, but only the Host response acknowledgement can
		* mark it completed.
		*/
		function roundReducer(state, event) {
			switch (event.type) {
				case "SUBMIT_ANSWER": return state.status === "awaiting_input" ? {
					status: "submitting_answer",
					error: null
				} : state;
				case "ANSWER_ACCEPTED": return state.status === "submitting_answer" ? {
					status: "answer_accepted",
					error: null
				} : state;
				case "WAIT_FOR_REVEAL": return state.status === "answer_accepted" ? {
					status: "awaiting_model_reveal",
					error: null
				} : state;
				case "START_REVEAL": return state.status === "awaiting_model_reveal" ? {
					status: "animating",
					error: null
				} : state;
				case "ANIMATION_FINISHED": return state.status === "animating" ? {
					status: "ready_to_continue",
					error: null
				} : state;
				case "SUBMIT_CONTINUE": return state.status === "ready_to_continue" ? {
					status: "ack_submitting",
					error: null
				} : state;
				case "ACK_ACCEPTED": return state.status === "ack_submitting" ? {
					status: "completed",
					error: null
				} : state;
				case "SUBMISSION_FAILED":
					if (state.status === "submitting_answer") return {
						status: "awaiting_input",
						error: event.message
					};
					if (state.status === "ack_submitting") return {
						status: "ready_to_continue",
						error: event.message
					};
					return state;
			}
		}
		//#endregion
		//#region src/client/lifecycle.ts
		const listeners = /* @__PURE__ */ new Set();
		/**
		* Per-call dedup keys, bounded so a long session cannot grow this module-level
		* set without limit. Insertion order is eviction order: the oldest calls in a
		* conversation are also the ones that can no longer emit a first event.
		*/
		const MAX_TRACKED_CALLS = 512;
		const emittedCallEvents = /* @__PURE__ */ new Set();
		function subscribeLearningUiLifecycle(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
		function emitLearningUiLifecycle(event) {
			const projected = {
				...event,
				at: Date.now()
			};
			for (const listener of listeners) listener(projected);
		}
		function emitLearningCallLifecycle(name, projection) {
			if (projection.callId === void 0) return;
			const key = `${name}:${projection.callId}`;
			if (emittedCallEvents.has(key)) return;
			emittedCallEvents.add(key);
			while (emittedCallEvents.size > MAX_TRACKED_CALLS) {
				const oldest = emittedCallEvents.values().next().value;
				if (oldest === void 0) break;
				emittedCallEvents.delete(oldest);
			}
			emitLearningUiLifecycle({
				name,
				...projection
			});
		}
		//#endregion
		//#region src/client/RoundActivity.tsx
		function readStoredRound(storageKey) {
			if (storageKey === void 0 || typeof sessionStorage === "undefined") return {};
			try {
				return JSON.parse(sessionStorage.getItem(`dsh-learning/round@2:${storageKey}`) ?? "{}");
			} catch {
				return {};
			}
		}
		function writeStoredRound(storageKey, update) {
			if (storageKey === void 0 || typeof sessionStorage === "undefined") return;
			const key = `dsh-learning/round@2:${storageKey}`;
			sessionStorage.setItem(key, JSON.stringify({
				...readStoredRound(storageKey),
				...update
			}));
		}
		function ProcessVisual({ activity, final }) {
			if (activity.visual?.kind !== "process") return null;
			const frame = activity.phase === "question" ? activity.visual.frame : final ? activity.visual.after : activity.visual.before;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: LearningActivity_module_css_default.roundProcess,
				"data-final": final || void 0,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: LearningActivity_module_css_default.roundNode,
					children: activity.seq + 1
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: frame.title }), frame.content === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: frame.content })] })]
			});
		}
		function ParameterVisual({ activity, t }) {
			if (activity.visual?.kind !== "parameter") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ParameterRoundVisual, {
				payload: activity.visual,
				disabled: activity.phase === "reveal",
				t
			});
		}
		function StructureVisual({ activity }) {
			if (activity.visual?.kind !== "structure") return null;
			const [selected, setSelected] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const left = new Map(activity.visual.left.items.map((item) => [item.id, item]));
			const right = new Map(activity.visual.right.items.map((item) => [item.id, item]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: LearningActivity_module_css_default.roundStructure,
				"aria-label": `${activity.visual.left.title} / ${activity.visual.right.title}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: activity.visual.left.title }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", { children: activity.visual.right.title }),
					activity.visual.alignments.map((alignment) => {
						const leftItem = alignment.leftId === void 0 ? void 0 : left.get(alignment.leftId);
						const rightItem = alignment.rightId === void 0 ? void 0 : right.get(alignment.rightId);
						const label = alignment.prompt ?? `${leftItem?.label ?? "—"} / ${rightItem?.label ?? "—"}`;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: LearningActivity_module_css_default.roundAlignment,
							"data-selected": selected.has(alignment.id) || void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: selected.has(alignment.id),
									disabled: activity.phase === "reveal",
									onChange: () => setSelected((current) => {
										const next = new Set(current);
										if (next.has(alignment.id)) next.delete(alignment.id);
										else next.add(alignment.id);
										return next;
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: leftItem?.label ?? "—" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: rightItem?.label ?? "—" }),
								alignment.prompt === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: label })
							]
						}, alignment.id);
					})
				]
			});
		}
		function CurrentVisual({ activity, final, t }) {
			if (activity.visual === void 0) return null;
			if (activity.visual.kind === "process") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProcessVisual, {
				activity,
				final
			});
			if (activity.visual.kind === "parameter") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ParameterVisual, {
				activity,
				t
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StructureVisual, { activity });
		}
		function QuestionInput({ activity, disabled, answer, setAnswer }) {
			if (activity.input.kind === "single_choice") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
				className: LearningActivity_module_css_default.prediction,
				disabled,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: activity.prompt }), activity.input.options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					className: LearningActivity_module_css_default.option,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "radio",
						name: `learning-round-${activity.seq}`,
						value: option.id,
						checked: answer === option.id,
						onChange: () => setAnswer(option.id)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option.label })]
				}, option.id))]
			});
			if (activity.input.kind === "number") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: LearningActivity_module_css_default.answerField,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: activity.prompt }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "number",
					value: answer,
					min: activity.input.min,
					max: activity.input.max,
					step: activity.input.step,
					disabled,
					onChange: (event) => setAnswer(event.target.value)
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				className: LearningActivity_module_css_default.answerField,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: activity.prompt }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					value: answer,
					placeholder: activity.input.placeholder,
					maxLength: activity.input.maxLength,
					disabled,
					onChange: (event) => setAnswer(event.target.value)
				})]
			});
		}
		function RoundActivity({ activity, completed = false, initialAnswer, storageKey, t, onSubmitAnswer, onContinue, onCancel }) {
			const stored = (0, react.useRef)(readStoredRound(storageKey)).current;
			const [state, dispatch] = (0, react.useReducer)(roundReducer, void 0, () => {
				if (completed || stored.completed === true) return initialRoundState(activity.phase, true);
				if (activity.phase === "reveal" && stored.animationComplete === true) return {
					status: "ready_to_continue",
					error: null
				};
				return initialRoundState(activity.phase);
			});
			const [answer, setAnswer] = (0, react.useState)(() => stored.draft ?? (typeof initialAnswer === "string" || typeof initialAnswer === "number" ? String(initialAnswer) : ""));
			const ackStarted = (0, react.useRef)(false);
			const cancelStarted = (0, react.useRef)(false);
			const lifecycleStarted = (0, react.useRef)(false);
			const revealElement = (0, react.useRef)(null);
			const reducedMotion = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			(0, react.useEffect)(() => {
				emitLearningUiLifecycle({
					name: "learning.ui.presented",
					phase: activity.phase,
					seq: activity.seq,
					storageKey
				});
			}, [
				activity.phase,
				activity.seq,
				storageKey
			]);
			(0, react.useEffect)(() => {
				if (activity.phase === "reveal" && state.status === "animating" && !lifecycleStarted.current) {
					lifecycleStarted.current = true;
					emitLearningUiLifecycle({
						name: "learning.animation.started",
						phase: activity.phase,
						seq: activity.seq,
						storageKey
					});
				}
			}, [
				activity.phase,
				activity.seq,
				state.status,
				storageKey
			]);
			(0, react.useEffect)(() => {
				if (activity.phase === "reveal" && state.status === "animating" && reducedMotion) {
					emitLearningUiLifecycle({
						name: "learning.animation.finished",
						phase: activity.phase,
						seq: activity.seq,
						storageKey
					});
					writeStoredRound(storageKey, { animationComplete: true });
					dispatch({ type: "ANIMATION_FINISHED" });
				}
			}, [
				activity.phase,
				activity.seq,
				reducedMotion,
				state.status,
				storageKey
			]);
			(0, react.useEffect)(() => {
				if (activity.phase === "question" && state.status === "awaiting_input") writeStoredRound(storageKey, { draft: answer });
			}, [
				activity.phase,
				answer,
				state.status,
				storageKey
			]);
			(0, react.useEffect)(() => {
				if (activity.phase === "reveal" && state.status === "ready_to_continue") writeStoredRound(storageKey, { animationComplete: true });
				if (state.status === "completed") writeStoredRound(storageKey, { completed: true });
			}, [
				activity.phase,
				state.status,
				storageKey
			]);
			const finishAnimation = () => {
				if (state.status === "animating") {
					emitLearningUiLifecycle({
						name: "learning.animation.finished",
						phase: activity.phase,
						seq: activity.seq,
						storageKey
					});
					writeStoredRound(storageKey, { animationComplete: true });
					dispatch({ type: "ANIMATION_FINISHED" });
				}
			};
			(0, react.useEffect)(() => {
				const element = revealElement.current;
				if (element === null || activity.phase !== "reveal" || state.status !== "animating") return;
				element.addEventListener("animationend", finishAnimation);
				return () => element.removeEventListener("animationend", finishAnimation);
			}, [
				activity.phase,
				state.status,
				storageKey
			]);
			const submitAnswer = () => {
				if (activity.phase !== "question" || onSubmitAnswer === void 0 || answer.trim() === "") return;
				dispatch({ type: "SUBMIT_ANSWER" });
				const value = activity.input.kind === "number" ? Number(answer) : answer;
				onSubmitAnswer(value, { answer: value }).then(() => {
					dispatch({ type: "ANSWER_ACCEPTED" });
					dispatch({ type: "WAIT_FOR_REVEAL" });
				}).catch((cause) => dispatch({
					type: "SUBMISSION_FAILED",
					message: cause instanceof Error ? cause.message : String(cause)
				}));
			};
			const submitContinue = () => {
				if (activity.phase !== "reveal" || onContinue === void 0 || state.status !== "ready_to_continue" || ackStarted.current) return;
				ackStarted.current = true;
				dispatch({ type: "SUBMIT_CONTINUE" });
				onContinue({
					completed: true,
					reducedMotion: reducedMotion || void 0
				}).then(() => {
					dispatch({ type: "ACK_ACCEPTED" });
					emitLearningUiLifecycle({
						name: "learning.continue.accepted",
						phase: activity.phase,
						seq: activity.seq,
						storageKey
					});
				}).catch((cause) => dispatch({
					type: "SUBMISSION_FAILED",
					message: cause instanceof Error ? cause.message : String(cause)
				})).finally(() => {
					ackStarted.current = false;
				});
			};
			const final = activity.phase === "reveal" && state.status !== "animating";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: LearningActivity_module_css_default.round,
				...learningScope,
				"data-round-state": state.status,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: LearningActivity_module_css_default.roundHeader,
						children: [activity.focus.progress === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("roundProgress", {
							current: activity.focus.progress.current,
							total: activity.focus.progress.total ?? "?"
						}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: activity.focus.title })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: revealElement,
						className: activity.phase === "reveal" ? LearningActivity_module_css_default.revealTransition : void 0,
						"data-reveal-transition": activity.phase === "reveal" || void 0,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CurrentVisual, {
							activity,
							final,
							t
						})
					}),
					activity.phase === "question" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuestionInput, {
							activity,
							disabled: state.status !== "awaiting_input",
							answer,
							setAnswer
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: LearningActivity_module_css_default.primaryButton,
							type: "button",
							disabled: state.status !== "awaiting_input" || answer.trim() === "",
							onClick: submitAnswer,
							children: state.status === "submitting_answer" ? t("submitting") : t("submitAnswer")
						}),
						state.status === "awaiting_model_reveal" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							role: "status",
							children: t("awaitingReveal")
						}) : null
					] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: LearningActivity_module_css_default.roundFeedback,
						"data-verdict": activity.feedback.verdict,
						children: [
							activity.feedback.learnerEcho === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: activity.feedback.learnerEcho }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: activity.feedback.explanation }),
							activity.feedback.answer === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: activity.feedback.answer })
						]
					}), state.status === "completed" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: LearningActivity_module_css_default.primaryButton,
						type: "button",
						disabled: state.status !== "ready_to_continue",
						onClick: submitContinue,
						children: activity.advance.label ?? t("continue")
					})] }),
					state.error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.error,
						role: "alert",
						children: state.error
					}),
					state.status === "completed" || onCancel === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: LearningActivity_module_css_default.textButton,
						type: "button",
						disabled: cancelStarted.current || state.status === "submitting_answer" || state.status === "ack_submitting",
						onClick: () => {
							if (cancelStarted.current) return;
							cancelStarted.current = true;
							onCancel().catch((cause) => dispatch({
								type: "SUBMISSION_FAILED",
								message: cause instanceof Error ? cause.message : String(cause)
							})).finally(() => {
								cancelStarted.current = false;
							});
						},
						children: t("cancel")
					})
				]
			});
		}
		//#endregion
		//#region src/client/LearningCheckpoint.tsx
		const STORAGE_PREFIX = "dsh-learning/checkpoint@1:";
		/**
		* The header names the thinking the learner is being asked for.
		*
		* The payload already carries which cognitive move this checkpoint wants, and
		* showing it tells the learner how to engage. A generic "checkpoint" label
		* would instead narrate the teaching machinery, which the standing policy
		* rules out for ordinary turns.
		*/
		const EVIDENCE_LABEL_KEYS = {
			attempt: "checkpointEvidenceAttempt",
			prediction: "checkpointEvidencePrediction",
			explanation: "checkpointEvidenceExplanation",
			contrast: "checkpointEvidenceContrast",
			transfer: "checkpointEvidenceTransfer"
		};
		function readDraft(storageKey) {
			try {
				return sessionStorage.getItem(`${STORAGE_PREFIX}${storageKey}`) ?? "";
			} catch {
				return "";
			}
		}
		function writeDraft(storageKey, draft) {
			try {
				const key = `${STORAGE_PREFIX}${storageKey}`;
				if (draft === "") sessionStorage.removeItem(key);
				else sessionStorage.setItem(key, draft);
			} catch {}
		}
		/** A compact, answer-free gate for one learner contribution. */
		function LearningCheckpoint({ checkpoint, storageKey, busy, error, onSubmit, onSkip, onCancel, t }) {
			const headingId = (0, react.useId)();
			const inputId = (0, react.useId)();
			const contextId = (0, react.useId)();
			const hintId = (0, react.useId)();
			const [draft, setDraft] = (0, react.useState)(() => readDraft(storageKey));
			(0, react.useEffect)(() => {
				setDraft(readDraft(storageKey));
			}, [storageKey]);
			(0, react.useEffect)(() => {
				writeDraft(storageKey, draft);
			}, [draft, storageKey]);
			const trimmed = draft.trim();
			const numeric = Number(trimmed);
			const selectedOption = checkpoint.options?.some((option) => option.id === draft) ?? false;
			const isTextCheckpoint = checkpoint.kind === "free_text" || checkpoint.kind === "prediction" || checkpoint.kind === "code_slot";
			const canSubmit = checkpoint.kind === "single_choice" ? selectedOption : checkpoint.kind === "numeric" ? trimmed !== "" && Number.isFinite(numeric) : trimmed !== "";
			const finish = async (action) => {
				try {
					await action();
					writeDraft(storageKey, "");
				} catch {}
			};
			const submit = async () => {
				if (busy || !canSubmit) return;
				const response = checkpoint.kind === "single_choice" ? { optionId: draft } : checkpoint.kind === "numeric" ? { number: numeric } : { text: draft };
				await finish(() => onSubmit(response));
			};
			const onFormSubmit = (event) => {
				event.preventDefault();
				submit();
			};
			const onTextKeyDown = (event) => {
				if (event.key !== "Enter" || !event.ctrlKey && !event.metaKey) return;
				event.preventDefault();
				submit();
			};
			const inputLabel = checkpoint.kind === "free_text" ? t("checkpointFreeTextLabel") : checkpoint.kind === "prediction" ? t("checkpointPredictionLabel") : checkpoint.kind === "code_slot" ? t("checkpointCodeLabel") : checkpoint.kind === "numeric" ? t("checkpointNumericLabel") : t("checkpointChoiceLabel");
			const describedBy = [checkpoint.context === void 0 ? void 0 : contextId, isTextCheckpoint ? hintId : void 0].filter((value) => value !== void 0).join(" ");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: LearningActivity_module_css_default.checkpoint,
				...learningScope,
				"data-learning-checkpoint": checkpoint.kind,
				"aria-labelledby": headingId,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: LearningActivity_module_css_default.checkpointHeader,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LearningActivity_module_css_default.checkpointEyebrow,
							"data-learning-evidence": checkpoint.expectedEvidence,
							children: t(EVIDENCE_LABEL_KEYS[checkpoint.expectedEvidence] ?? "checkpointEyebrow")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							id: headingId,
							children: checkpoint.prompt
						}),
						checkpoint.context === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							id: contextId,
							children: checkpoint.context
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					className: LearningActivity_module_css_default.checkpointForm,
					onSubmit: onFormSubmit,
					children: [
						checkpoint.kind === "single_choice" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							className: LearningActivity_module_css_default.checkpointChoices,
							"aria-describedby": describedBy,
							disabled: busy,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", { children: inputLabel }), checkpoint.options?.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: LearningActivity_module_css_default.checkpointOption,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "radio",
									name: `${inputId}-choice`,
									value: option.id,
									checked: draft === option.id,
									onChange: () => setDraft(option.id)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option.label })]
							}, option.id))]
						}) : checkpoint.kind === "numeric" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: LearningActivity_module_css_default.checkpointField,
							htmlFor: inputId,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: inputLabel }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: inputId,
								className: LearningActivity_module_css_default.checkpointInput,
								type: "number",
								step: "any",
								value: draft,
								disabled: busy,
								"aria-describedby": describedBy,
								onChange: (event) => setDraft(event.currentTarget.value)
							})]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: LearningActivity_module_css_default.checkpointField,
							htmlFor: inputId,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: inputLabel }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								id: inputId,
								className: `${LearningActivity_module_css_default.checkpointInput} ${checkpoint.kind === "code_slot" ? LearningActivity_module_css_default.checkpointCode : ""}`,
								value: draft,
								disabled: busy,
								maxLength: checkpoint.kind === "code_slot" ? 16e3 : 8e3,
								rows: checkpoint.kind === "code_slot" ? 5 : 3,
								"aria-describedby": describedBy,
								onChange: (event) => setDraft(event.currentTarget.value),
								onKeyDown: onTextKeyDown
							})]
						}),
						isTextCheckpoint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: LearningActivity_module_css_default.checkpointHint,
							id: hintId,
							children: t("checkpointKeyboardHint")
						}) : null,
						error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: LearningActivity_module_css_default.error,
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LearningActivity_module_css_default.checkpointActions,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: LearningActivity_module_css_default.primaryButton,
									type: "submit",
									disabled: busy || !canSubmit,
									children: busy ? t("submitting") : t("submit")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: LearningActivity_module_css_default.ghostButton,
									type: "button",
									disabled: busy,
									onClick: () => void finish(onSkip),
									children: t("skip")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									className: LearningActivity_module_css_default.textButton,
									type: "button",
									disabled: busy,
									onClick: () => void finish(onCancel),
									children: t("cancel")
								})
							]
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/LearningComposer.tsx
		function envelopeOf(wait) {
			if (wait.payload.questions.length !== 1) return void 0;
			const question = wait.payload.questions[0];
			if (question === void 0) return void 0;
			const checkpoint = decodeLearningCheckpointDetail(question.detail);
			if (checkpoint !== void 0 && decodeLearningCheckpointQuestionId(question.id) === checkpoint.waitId) return checkpoint;
			const v2 = decodeLearningWaitDetail(question.detail);
			if (v2 !== void 0 && decodeLearningWaitQuestionId(question.id) === v2.waitId) return v2;
			return decodeLearningQuestionId(question.id) ?? decodeLearningDetail(question.detail);
		}
		/** Pure composer-chain selector: only package-owned question envelopes are claimed. */
		function selectLearningActivity({ interactions, session }) {
			const currentSessionId = session?.sessionId;
			for (const interaction of interactions) {
				if (interaction.kind !== "question") continue;
				const wait = interaction;
				if (currentSessionId === void 0 || String(wait.sessionId) !== String(currentSessionId)) continue;
				const envelope = envelopeOf(wait);
				if (envelope === void 0) continue;
				if ("checkpoint" in envelope && envelope.sessionId !== String(currentSessionId)) continue;
				return wait;
			}
			return null;
		}
		function LearningComposer({ matched, t }) {
			return null;
		}
		function LearningInteraction({ matched, t }) {
			const envelope = (0, react.useMemo)(() => envelopeOf(matched), [matched]);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const responseInFlight = (0, react.useRef)(null);
			if (envelope === void 0) return null;
			const send = (response) => {
				if (responseInFlight.current !== null) return responseInFlight.current;
				const question = matched.payload.questions[0];
				if (question === void 0) return Promise.resolve();
				const pending = Promise.resolve().then(async () => {
					setBusy(true);
					setError(null);
					const accepted = await matched.respond({
						ok: true,
						value: {
							sessionId: matched.sessionId,
							answer: { answers: [{
								id: question.id,
								selected: [],
								custom: JSON.stringify(response)
							}] }
						}
					});
					if (!accepted.accepted) throw new Error(accepted.reason);
				}).catch((cause) => {
					responseInFlight.current = null;
					setBusy(false);
					setError(t("error", { message: cause instanceof Error ? cause.message : String(cause) }));
					throw cause;
				});
				responseInFlight.current = pending;
				return pending;
			};
			if ("checkpoint" in envelope) {
				if (envelope.sessionId !== String(matched.sessionId)) return null;
				const common = {
					protocol: CHECKPOINT_RESULT_PROTOCOL,
					checkpointId: envelope.checkpointId,
					receiptId: `receipt_${envelope.waitId}`
				};
				const submit = async (response) => {
					await send({
						...common,
						status: "submitted",
						response
					});
				};
				const skip = async () => {
					await send({
						...common,
						status: "skipped",
						reason: "learner-skipped"
					});
				};
				const cancel = async () => {
					await send({
						...common,
						status: "cancelled",
						reason: "learner-cancelled"
					});
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningCheckpoint, {
					checkpoint: envelope.checkpoint,
					storageKey: envelope.waitId,
					busy,
					error,
					onSubmit: submit,
					onSkip: skip,
					onCancel: cancel,
					t
				});
			}
			if ("waitId" in envelope) {
				const stableReceiptId = `receipt_${envelope.waitId}`;
				const common = {
					protocol: RESPONSE_PROTOCOL_V2,
					activityId: envelope.activityId,
					lessonToken: envelope.lessonToken,
					roundToken: envelope.roundToken,
					seq: envelope.seq
				};
				const storageKey = `${envelope.waitId}:${envelope.activityId}:${envelope.phase}:${envelope.seq}`;
				const submitAnswer = async (answer, interactionState) => {
					await send({
						...common,
						phase: "question",
						action: "submit",
						answer,
						interactionState,
						receiptId: stableReceiptId
					});
				};
				const continueReveal = async (animation) => {
					await send({
						...common,
						phase: "reveal",
						action: "continue",
						animation,
						receiptId: stableReceiptId
					});
				};
				const cancelRound = async () => {
					await send(envelope.phase === "question" ? {
						...common,
						phase: "question",
						action: "cancel",
						receiptId: stableReceiptId
					} : {
						...common,
						phase: "reveal",
						action: "cancel",
						animation: { completed: false },
						receiptId: stableReceiptId
					});
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RoundActivity, {
					activity: envelope.activity,
					storageKey,
					onSubmitAnswer: envelope.phase === "question" ? submitAnswer : void 0,
					onContinue: envelope.phase === "reveal" ? continueReveal : void 0,
					onCancel: cancelRound,
					t
				});
			}
			const respond = (response) => {
				if (matched.payload.questions[0] === void 0) return;
				setBusy(true);
				setError(null);
				send(response).catch(() => {});
			};
			const submit = ({ answer, interactionState }) => respond({
				protocol: RESPONSE_PROTOCOL,
				activityId: envelope.activityId,
				action: "submit",
				answer,
				interactionState
			});
			const skip = () => respond({
				protocol: RESPONSE_PROTOCOL,
				activityId: envelope.activityId,
				action: "skip"
			});
			const cancel = () => {
				setBusy(true);
				setError(null);
				matched.respond({
					ok: false,
					error: {
						code: "cancelled",
						message: "the learner cancelled this activity",
						details: {}
					}
				}).then((receipt) => {
					if (!receipt.accepted) throw new Error(receipt.reason);
				}).catch((cause) => {
					setBusy(false);
					setError(t("error", { message: cause instanceof Error ? cause.message : String(cause) }));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityFrame, {
				activityId: envelope.activityId,
				activity: envelope.activity,
				busy,
				error,
				onSkip: skip,
				onCancel: cancel,
				t,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ActivityRenderer, {
					activity: envelope.activity,
					busy,
					onSubmit: submit,
					t
				})
			}, matched.key);
		}
		//#endregion
		//#region src/client/LearningVisual.tsx
		const DEFAULT_TONES$1 = [
			"blue",
			"red",
			"green",
			"orange",
			"purple",
			"gray"
		];
		function formatNumber$1(value, digits) {
			if (!Number.isFinite(value)) return "—";
			if (digits !== void 0) return value.toFixed(digits);
			if (Number.isInteger(value)) return String(value);
			return String(Number(value.toPrecision(6)));
		}
		function niceStep$1(rawStep) {
			if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
			const power = 10 ** Math.floor(Math.log10(rawStep));
			const normalized = rawStep / power;
			return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
		}
		function normalizedPosition$1(value, min, max) {
			const span = max - min;
			if (Number.isFinite(span) && span > 0) return (value - min) / span;
			const scale = Math.max(Math.abs(value), Math.abs(min), Math.abs(max));
			if (!Number.isFinite(scale) || scale === 0) return 0;
			return (value / scale - min / scale) / (max / scale - min / scale);
		}
		function interpolate$1(min, max, ratio) {
			if (ratio <= 0) return min;
			if (ratio >= 1) return max;
			return min * (1 - ratio) + max * ratio;
		}
		function ticks$1(min, max, target = 6) {
			const step = niceStep$1(max / target - min / target);
			const first = Math.ceil(min / step) * step;
			if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(first)) return [min, max];
			const result = [];
			const limit = Math.max(4, target * 4);
			let previous;
			for (let index = 0; index < limit; index += 1) {
				const value = first + step * index;
				if (!Number.isFinite(value) || value > max) break;
				if (value === previous) break;
				result.push(Number(value.toPrecision(12)));
				previous = value;
			}
			return result.length > 0 ? result : [min, max];
		}
		function geometryFor(width) {
			const safeWidth = Math.max(300, Math.round(width));
			const compact = safeWidth < 520;
			const height = compact ? 270 : 330;
			const left = compact ? 54 : 64;
			const right = 18;
			const top = 18;
			const bottom = compact ? 48 : 54;
			return {
				width: safeWidth,
				height,
				left,
				right,
				top,
				bottom,
				plotWidth: safeWidth - left - right,
				plotHeight: height - top - bottom
			};
		}
		function scaleX$1(value, visual, geometry) {
			return geometry.left + normalizedPosition$1(value, visual.xAxis.min, visual.xAxis.max) * geometry.plotWidth;
		}
		function scaleY$1(value, visual, geometry) {
			return geometry.top + (1 - normalizedPosition$1(value, visual.yAxis.min, visual.yAxis.max)) * geometry.plotHeight;
		}
		function curvePath$1(curve, visual, values, geometry) {
			const samples = visual.xAxis.samples ?? 128;
			const commands = [];
			let drawing = false;
			let previousY;
			for (let index = 0; index < samples; index += 1) {
				const x = interpolate$1(visual.xAxis.min, visual.xAxis.max, index / Math.max(1, samples - 1));
				const y = evaluateMathExpression(curve.expression, {
					...values,
					x
				});
				if (!Number.isFinite(y) || Math.abs(y) > 0xe8d4a51000) {
					drawing = false;
					previousY = void 0;
					continue;
				}
				const px = scaleX$1(x, visual, geometry);
				const py = scaleY$1(y, visual, geometry);
				if (previousY !== void 0 && Math.abs(previousY - py) > geometry.plotHeight * 2) drawing = false;
				commands.push(`${drawing ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`);
				drawing = true;
				previousY = py;
			}
			return commands.join(" ");
		}
		function toneOf(series, index) {
			return series.tone ?? DEFAULT_TONES$1[index % DEFAULT_TONES$1.length] ?? "blue";
		}
		function rangeStyle(parameter, value) {
			return { "--visual-range-progress": `${normalizedPosition$1(value, parameter.min, parameter.max) * 100}%` };
		}
		function initialValues(visual, storageKey) {
			const defaults = Object.fromEntries(visual.parameters.map((parameter) => [parameter.id, parameter.initial]));
			if (storageKey === void 0 || typeof sessionStorage === "undefined") return defaults;
			try {
				const stored = JSON.parse(sessionStorage.getItem(`dsh-learning/visual@3:${storageKey}`) ?? "{}");
				for (const parameter of visual.parameters) {
					const candidate = stored[parameter.id];
					if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= parameter.min && candidate <= parameter.max) defaults[parameter.id] = candidate;
				}
			} catch {}
			return defaults;
		}
		function LearningVisual({ visual, storageKey }) {
			const chartId = (0, react.useId)();
			const chartContainer = (0, react.useRef)(null);
			const [chartWidth, setChartWidth] = (0, react.useState)(760);
			const [values, setValues] = (0, react.useState)(() => initialValues(visual, storageKey));
			const geometry = (0, react.useMemo)(() => geometryFor(chartWidth), [chartWidth]);
			const xTicks = (0, react.useMemo)(() => ticks$1(visual.xAxis.min, visual.xAxis.max), [visual.xAxis.max, visual.xAxis.min]);
			const yTicks = (0, react.useMemo)(() => ticks$1(visual.yAxis.min, visual.yAxis.max), [visual.yAxis.max, visual.yAxis.min]);
			const curves = (0, react.useMemo)(() => visual.series.flatMap((series, index) => series.type === "curve" ? [{
				series,
				index,
				path: curvePath$1(series, visual, values, geometry)
			}] : []), [
				geometry,
				values,
				visual
			]);
			(0, react.useEffect)(() => {
				const container = chartContainer.current;
				if (container === null) return;
				const update = (width) => {
					if (width >= 280) setChartWidth((current) => Math.abs(current - width) < 1 ? current : width);
				};
				update(container.getBoundingClientRect().width);
				if (typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver((entries) => {
					const entry = entries[0];
					if (entry !== void 0) update(entry.contentRect.width);
				});
				observer.observe(container);
				return () => observer.disconnect();
			}, []);
			(0, react.useEffect)(() => {
				if (storageKey === void 0 || typeof sessionStorage === "undefined") return;
				try {
					sessionStorage.setItem(`dsh-learning/visual@3:${storageKey}`, JSON.stringify(values));
				} catch {}
			}, [storageKey, values]);
			const description = [
				visual.description,
				visual.parameters.map((parameter) => `${parameter.label} ${formatNumber$1(values[parameter.id] ?? parameter.initial)}`).join(", "),
				`${visual.xAxis.label ?? "x"} ${formatNumber$1(visual.xAxis.min)} to ${formatNumber$1(visual.xAxis.max)}`,
				`${visual.yAxis.label ?? "y"} ${formatNumber$1(visual.yAxis.min)} to ${formatNumber$1(visual.yAxis.max)}`,
				visual.series.map((series) => series.label).join(", ")
			].filter(Boolean).join(". ");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: LearningActivity_module_css_default.learningVisual,
				...learningScope,
				"data-learning-visual": "parameter_chart",
				"aria-labelledby": `${chartId}-title`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: LearningActivity_module_css_default.srOnly,
						id: `${chartId}-title`,
						children: visual.title
					}),
					visual.description === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.visualDescription,
						children: visual.description
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LearningActivity_module_css_default.visualControls,
						children: visual.parameters.map((parameter) => {
							const value = values[parameter.id] ?? parameter.initial;
							const inputId = `${chartId}-${parameter.id}`;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: LearningActivity_module_css_default.visualRange,
								htmlFor: inputId,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: LearningActivity_module_css_default.visualRangeHeader,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: parameter.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("output", {
											htmlFor: inputId,
											"aria-live": "polite",
											children: formatNumber$1(value)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: inputId,
										type: "range",
										min: parameter.min,
										max: parameter.max,
										step: parameter.step,
										value,
										"aria-label": parameter.label,
										style: rangeStyle(parameter, value),
										onChange: (event) => setValues((current) => ({
											...current,
											[parameter.id]: Number(event.target.value)
										}))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: LearningActivity_module_css_default.visualRangeEnds,
										"aria-hidden": "true",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber$1(parameter.min) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber$1(parameter.max) })]
									})
								]
							}, parameter.id);
						})
					}),
					visual.metrics === void 0 || visual.metrics.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LearningActivity_module_css_default.visualMetrics,
						children: visual.metrics.map((metric) => {
							const value = evaluateMathExpression(metric.expression, values);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: metric.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("output", { children: [formatNumber$1(value, metric.digits), metric.suffix ?? ""] })] }, metric.id);
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LearningActivity_module_css_default.visualChartRegion,
						ref: chartContainer,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							className: LearningActivity_module_css_default.visualChart,
							viewBox: `0 0 ${geometry.width} ${geometry.height}`,
							role: "img",
							"aria-labelledby": `${chartId}-title`,
							"aria-describedby": `${chartId}-description`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("desc", {
									id: `${chartId}-description`,
									children: description
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
									id: `${chartId}-clip`,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
										x: geometry.left,
										y: geometry.top,
										width: geometry.plotWidth,
										height: geometry.plotHeight
									})
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									className: LearningActivity_module_css_default.visualPlot,
									x: geometry.left,
									y: geometry.top,
									width: geometry.plotWidth,
									height: geometry.plotHeight
								}),
								yTicks.map((value) => {
									const y = scaleY$1(value, visual, geometry);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
										className: LearningActivity_module_css_default.visualGrid,
										x1: geometry.left,
										x2: geometry.left + geometry.plotWidth,
										y1: y,
										y2: y
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: LearningActivity_module_css_default.visualTick,
										x: geometry.left - 9,
										y,
										textAnchor: "end",
										dominantBaseline: "middle",
										children: formatNumber$1(value)
									})] }, `y-${String(value)}`);
								}),
								xTicks.map((value) => {
									const x = scaleX$1(value, visual, geometry);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
										className: LearningActivity_module_css_default.visualGrid,
										x1: x,
										x2: x,
										y1: geometry.top,
										y2: geometry.top + geometry.plotHeight
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: LearningActivity_module_css_default.visualTick,
										x,
										y: geometry.top + geometry.plotHeight + 21,
										textAnchor: "middle",
										children: formatNumber$1(value)
									})] }, `x-${String(value)}`);
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
									clipPath: `url(#${chartId}-clip)`,
									children: [curves.map(({ series, index, path }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
										className: LearningActivity_module_css_default.visualCurve,
										"data-tone": toneOf(series, index),
										"data-stroke": series.stroke ?? "solid",
										d: path
									}, series.id)), visual.series.map((series, index) => series.type !== "points" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
										"data-series": series.id,
										children: series.points.map((point, pointIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
											className: LearningActivity_module_css_default.visualPoint,
											"data-tone": toneOf(series, index),
											cx: scaleX$1(point.x, visual, geometry),
											cy: scaleY$1(point.y, visual, geometry),
											r: "5.5",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: point.label ?? `${series.label}: (${formatNumber$1(point.x)}, ${formatNumber$1(point.y)})` })
										}, `${series.id}-${String(pointIndex)}`))
									}, series.id))]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									className: LearningActivity_module_css_default.visualAxisLabel,
									x: geometry.left + geometry.plotWidth / 2,
									y: geometry.height - 5,
									textAnchor: "middle",
									children: visual.xAxis.label ?? "x"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									className: LearningActivity_module_css_default.visualAxisLabel,
									x: 15,
									y: geometry.top + geometry.plotHeight / 2,
									textAnchor: "middle",
									transform: `rotate(-90 15 ${geometry.top + geometry.plotHeight / 2})`,
									children: visual.yAxis.label ?? "y"
								})
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: LearningActivity_module_css_default.visualLegend,
							"aria-label": visual.title,
							children: visual.series.map((series, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								"data-series-type": series.type,
								"data-tone": toneOf(series, index),
								"data-stroke": series.type === "curve" ? series.stroke ?? "solid" : void 0,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true" }), series.label]
							}, series.id))
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/visuals/core/labels.ts
		/**
		* Every model-independent string the visual@4 renderers show.
		*
		* The Host supplies these through the plugin locale; the defaults here keep the
		* renderers usable in isolation (tests, the browser fixture) without forking the
		* wording.
		*/
		const DEFAULT_LABELS = {
			eyebrow: "交互可视化",
			errorTitle: "视觉组件暂时无法显示",
			errorContinue: "你仍可继续阅读上下文。",
			sequenceLabel: "视觉讲解步骤",
			previousStep: "上一步",
			nextStep: "下一步",
			reset: "重置",
			chartProbeHint: "图表，按左右方向键开始探查数值",
			metricsLabel: "当前指标",
			legendLabel: "图例与系列显示",
			plotInteractionHint: "鼠标移入图表可探查数值；键盘聚焦图表后可用 ← → 移动。",
			noValuesInRange: "当前坐标范围内没有可显示的数值。",
			seriesOutOfRange: "不在范围内",
			nodeLinkSummary: "{nodes} 个节点，{edges} 条连线。",
			connection: "{from} 到 {to}",
			layerLabel: "第 {index} 层",
			edgeLabel: "连线",
			nodeLinkInteractionHint: "选择节点或连线查看解释；键盘按 Tab 进入图形，再用 ← → 移动、Enter 选择。",
			nodeKind: "节点",
			edgeKind: "连线",
			noDetail: "暂无补充说明。",
			closeDetail: "关闭详细说明",
			elementFallback: "图元 {id}",
			sceneSummary: "二维场景，{elements} 个图元。{labels}",
			sceneInteractionHint: "选择图中的点、线或形状查看说明；键盘按 Tab 进入图形，再用 ← → 移动、Enter 选择。",
			elementKind: "图元",
			comparisonCaption: "特征对比表",
			comparisonDimension: "对比维度",
			comparisonSubject: "对比对象",
			comparisonInteractionHint: "按行阅读可对比同一维度；选择表头可查看补充说明。",
			matrixCaption: "关系矩阵",
			matrixAxes: "行 ↓ / 列 →",
			noRelation: "无关系",
			matrixInteractionHint: "从行与列的交点读取关系；选择单元格可查看细节。",
			setsLabel: "集合关系图",
			noExclusiveItems: "无独有项",
			intersections: "交集 / 共有",
			uncategorized: "未归类",
			setsInteractionHint: "单一归属项在各集合内，多重归属项在交集区。",
			timelineLabel: "时间线",
			timelineEventKind: "事件",
			timelineEraKind: "时期",
			timelineInteractionHint: "选择事件或时期可查看补充说明。",
			formulaLabel: "公式推导",
			formulaProgress: "第 {current} / {total} 步",
			formulaRule: "规则",
			formulaConclusion: "结论",
			revealNextFormulaStep: "显示下一步",
			formulaComplete: "推导已完成",
			formulaInteractionHint: "先预测下一步，再逐步揭示变形规则。",
			studySource: "学习来源",
			studyGoal: "学习目标",
			studySections: "来源章节",
			studyConcepts: "本节概念",
			studyAnchor: "位置",
			studySummary: "摘要",
			prerequisite: "前置概念",
			noPrerequisite: "无",
			roleFoundation: "基础",
			roleCore: "核心",
			roleExtension: "拓展",
			rolePractice: "练习",
			studyInteractionHint: "按来源章节导览，选择概念查看作用、前置关系与详细说明。",
			recallDeckLabel: "回忆卡组",
			recallProgress: "第 {current} / {total} 张",
			recallPrompt: "问题",
			recallHint: "提示",
			recallAnswer: "答案",
			showHint: "查看提示",
			showAnswer: "显示答案",
			previousCard: "上一张",
			nextCard: "下一张",
			resetDeck: "重置卡组",
			mastered: "已掌握",
			reviewAgain: "待复习",
			unrated: "未标记",
			recallStatus: "掌握 {mastered} · 待复习 {review}",
			recallInteractionHint: "先在心中回答，再查看提示和答案，最后标记掌握状态。",
			stepOfTotal: "第 {current} / {total} 步",
			emptyVisual: "这张图目前没有可显示的内容。",
			graphLegendLabel: "图形状态说明",
			stateCurrent: "当前重点",
			stateRelated: "相关路径",
			stateContext: "其余结构",
			stateVisited: "已讲过"
		};
		const VisualLabelsContext = (0, react.createContext)(DEFAULT_LABELS);
		const VisualLabelsProvider = VisualLabelsContext.Provider;
		function useVisualLabels() {
			return (0, react.useContext)(VisualLabelsContext);
		}
		/** Fill `{name}` placeholders, leaving unknown ones untouched. */
		function labelTemplate(template, values) {
			return template.replace(/\{([a-z]+)\}/gi, (match, key) => values[key] === void 0 ? match : String(values[key]));
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/shell.module.css.mjs
		const css$12 = ".h8ir_G_visualShell{--visual-tone:var(--lx-accent);gap:var(--lx-space-lg);min-width:0;margin:var(--lx-space-sm) 0 var(--lx-space-xl);border:var(--lx-card-border);border-radius:var(--lx-card-radius);padding:var(--lx-card-padding);background:var(--lx-card-background);color:var(--lx-label-primary);box-shadow:var(--lx-shadow-md);transition:box-shadow var(--lx-motion-base) var(--lx-easing);flex-direction:column;display:flex;container:h8ir_G_learning-visual-v4/inline-size}.h8ir_G_visualHeader{gap:var(--lx-space-2xs) var(--lx-space-md);flex-wrap:wrap;align-items:baseline;min-width:0;display:flex}.h8ir_G_visualEyebrow{border:1px solid color-mix(in srgb, var(--lx-accent) 24%, transparent);border-radius:var(--lx-radius-pill);padding:var(--lx-space-3xs) var(--lx-space-sm);background:color-mix(in srgb, var(--lx-accent-soft) 55%, transparent);color:var(--lx-accent);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);letter-spacing:var(--lx-tracking-eyebrow);line-height:var(--lx-leading-micro);box-shadow:0 1px 2px color-mix(in srgb, var(--lx-accent) 12%, transparent);flex:none}.h8ir_G_visualHeader h3{min-width:0;font-size:var(--lx-text-lg);font-weight:var(--lx-weight-strong);letter-spacing:-.01em;line-height:var(--lx-leading-lg);flex:12ch;margin:0}.h8ir_G_visualHeader p{margin:var(--lx-space-2xs) 0 0;color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);flex:100%}.h8ir_G_srOnly{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}.h8ir_G_errorFallback{gap:var(--lx-space-2xs);border-left:3px solid var(--lx-danger);padding:var(--lx-space-md) var(--lx-space-lg);background:color-mix(in srgb, var(--lx-danger) 8%, transparent);color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);display:grid}.h8ir_G_errorFallback strong{color:var(--lx-label-error)}.h8ir_G_errorFallback pre{max-height:240px;margin:var(--lx-space-xs) 0 0;white-space:pre-wrap;font:inherit;overflow:auto}.h8ir_G_emptyState{gap:var(--lx-space-2xs);border:1px dashed var(--lx-border-strong);border-radius:var(--lx-radius-lg);padding:var(--lx-space-2xl) var(--lx-space-lg);color:var(--lx-label-secondary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-base);text-align:center;display:grid}.h8ir_G_control{min-height:var(--lx-control-height-sm);justify-content:center;align-items:center;gap:var(--lx-space-xs);appearance:none;border:1px solid var(--lx-border-default);border-radius:var(--lx-radius-sm);padding:var(--lx-control-padding-sm);background:var(--lx-surface-base);color:var(--lx-label-primary);font:inherit;font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs);cursor:pointer;transition:background-color var(--lx-motion-fast) var(--lx-easing), border-color var(--lx-motion-fast) var(--lx-easing), color var(--lx-motion-fast) var(--lx-easing);display:inline-flex}.h8ir_G_control:hover:not(:disabled){border-color:var(--lx-border-strong);background:color-mix(in srgb, var(--lx-accent) 8%, var(--lx-surface-base));color:var(--lx-label-primary)}.h8ir_G_control:active:not(:disabled){border-color:var(--lx-accent);background:color-mix(in srgb, var(--lx-accent) 14%, var(--lx-surface-base))}.h8ir_G_control:disabled{border-color:var(--lx-border-subtle);color:var(--lx-label-tertiary);opacity:var(--lx-control-disabled-opacity);cursor:not-allowed}.h8ir_G_controlPrimary{min-height:var(--lx-control-height-md);border-color:var(--lx-accent);background:var(--lx-accent);color:var(--lx-label-on-accent);font-weight:var(--lx-weight-medium)}.h8ir_G_controlPrimary:hover:not(:disabled){border-color:color-mix(in srgb, var(--lx-accent) 84%, var(--lx-label-primary));background:color-mix(in srgb, var(--lx-accent) 84%, var(--lx-label-primary));color:var(--lx-label-on-accent)}.h8ir_G_controlPrimary:active:not(:disabled){background:color-mix(in srgb, var(--lx-accent) 72%, var(--lx-label-primary))}.h8ir_G_controlQuiet{color:var(--lx-label-secondary);background:0 0;border-color:#0000}.h8ir_G_controlQuiet:hover:not(:disabled){border-color:var(--lx-border-default);background:color-mix(in srgb, var(--lx-accent) 7%, transparent)}.h8ir_G_controlToned{border-color:color-mix(in srgb, var(--visual-tone) 32%, var(--lx-border-subtle));background:color-mix(in srgb, var(--visual-tone) 9%, var(--lx-surface-base));color:var(--lx-label-primary)}.h8ir_G_controlToned:hover:not(:disabled){border-color:var(--visual-tone);background:color-mix(in srgb, var(--visual-tone) 16%, var(--lx-surface-base))}.h8ir_G_controlRow{gap:var(--lx-space-sm);flex-wrap:wrap;display:flex}.h8ir_G_closeButton{border-radius:var(--lx-radius-xs);width:28px;height:28px;min-height:28px;font-size:var(--lx-text-md);padding:0;line-height:1}.h8ir_G_sequence{gap:var(--lx-space-sm) var(--lx-space-lg);border:1px solid color-mix(in srgb, var(--lx-accent) 22%, var(--lx-border-default));border-radius:var(--lx-radius-lg);min-width:0;padding:var(--lx-space-md) var(--lx-space-lg);background:linear-gradient(135deg, color-mix(in srgb, var(--lx-accent-soft) 48%, transparent), color-mix(in srgb, var(--lx-surface-base) 80%, transparent));box-shadow:0 2px 8px -2px color-mix(in srgb, var(--lx-accent) 8%, transparent);grid-template-columns:minmax(0,1fr) auto;align-items:center;display:grid}.h8ir_G_sequenceText{gap:var(--lx-space-3xs) var(--lx-space-md);grid-template-columns:auto minmax(0,1fr);align-items:baseline;min-width:0;display:grid}.h8ir_G_sequenceText>span{color:var(--lx-accent);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums;font-weight:var(--lx-weight-strong);letter-spacing:.04em}.h8ir_G_sequenceText strong{min-width:0;color:var(--lx-label-primary);font-size:var(--lx-text-sm);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-sm);overflow-wrap:anywhere}.h8ir_G_sequenceText p{margin:var(--lx-space-3xs) 0 0;color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);grid-column:1/-1}.h8ir_G_sequenceActions{gap:var(--lx-space-xs);flex:none;display:flex}.h8ir_G_sequenceActions .h8ir_G_control{padding:var(--lx-control-padding-md)}.h8ir_G_sequenceRail{gap:var(--lx-space-2xs);flex-wrap:wrap;grid-column:1/-1;margin:0;padding:0;list-style:none;display:flex}.h8ir_G_sequenceRail button{appearance:none;border-radius:var(--lx-radius-pill);background:color-mix(in srgb, var(--lx-accent) 20%, var(--lx-border-default));cursor:pointer;width:100%;min-width:18px;height:6px;transition:background-color var(--lx-motion-fast) var(--lx-easing), transform var(--lx-motion-fast) var(--lx-easing);border:0;padding:0;display:block}.h8ir_G_sequenceRail li{flex:1 1 0;min-width:18px}.h8ir_G_sequenceRail button:hover{background:color-mix(in srgb, var(--lx-accent) 50%, transparent);transform:scaleY(1.2)}.h8ir_G_sequenceRail button[data-visual-state=visited]{background:color-mix(in srgb, var(--lx-accent) 64%, transparent)}.h8ir_G_sequenceRail button[data-visual-state=current]{background:var(--lx-accent);box-shadow:0 0 8px var(--lx-accent)}.h8ir_G_selectionSlot{min-height:var(--lx-control-height-md);align-content:center;display:grid}.h8ir_G_interactionHint{color:var(--lx-label-tertiary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs);margin:0}.h8ir_G_detailPanel{gap:var(--lx-space-3xs) var(--lx-space-sm);border:1px solid color-mix(in srgb, var(--visual-tone) 32%, var(--lx-border-subtle));border-left:3.5px solid var(--visual-tone);border-radius:var(--lx-radius-md);padding:var(--lx-space-sm) var(--lx-space-md);background:color-mix(in srgb, var(--visual-tone) 7%, var(--lx-surface-base));box-shadow:var(--lx-shadow-sm), 0 0 12px color-mix(in srgb, var(--visual-tone) 10%, transparent);transition:border-color var(--lx-motion-fast) var(--lx-easing);grid-template-columns:auto minmax(0,1fr) 28px;align-items:baseline;display:grid}.h8ir_G_detailPanel>span{color:var(--visual-tone);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-xs);letter-spacing:.03em}.h8ir_G_detailPanel>strong{min-width:0;color:var(--lx-label-primary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-sm);overflow-wrap:anywhere}.h8ir_G_detailPanel>p{margin:var(--lx-space-3xs) 0 0;color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);grid-column:1/3}.h8ir_G_detailPanel>button{grid-area:1/3/3;align-self:start}.h8ir_G_rendererStack{gap:var(--lx-space-lg);flex-direction:column;min-width:0;display:flex}.h8ir_G_viewport{overscroll-behavior-inline:contain;border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-lg);background:var(--lx-surface-sunken);min-width:0;box-shadow:inset 0 1px 3px color-mix(in srgb, var(--lx-host-label) 3%, transparent);scrollbar-width:thin;position:relative;overflow-x:auto}.h8ir_G_viewport>svg{touch-action:pan-y;max-width:none;margin:0 auto;display:block;overflow:visible}.h8ir_G_stateLegend{gap:var(--lx-space-xs) var(--lx-space-lg);color:var(--lx-label-secondary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro);flex-wrap:wrap;margin:0;display:flex}.h8ir_G_stateLegend>span{align-items:center;gap:var(--lx-space-xs);display:inline-flex}.h8ir_G_stateLegend i{border-radius:var(--lx-radius-pill);background:var(--lx-label-tertiary);width:16px;height:3px;opacity:var(--lx-vs-alpha);transition:background-color var(--lx-motion-fast) var(--lx-easing)}.h8ir_G_stateLegend>span[data-visual-state=current] i{background:var(--lx-accent);height:5px;box-shadow:0 0 6px var(--lx-accent)}@container h8ir_G_learning-visual-v4 (width<=560px){.h8ir_G_visualShell{gap:var(--lx-space-md);border-radius:var(--lx-radius-lg);padding:var(--lx-space-lg)}.h8ir_G_visualHeader h3{font-size:var(--lx-text-md);flex-basis:100%}.h8ir_G_sequence{grid-template-columns:minmax(0,1fr)}.h8ir_G_sequenceActions{justify-content:stretch}.h8ir_G_sequenceActions .h8ir_G_control{flex:1}.h8ir_G_sequenceActions .h8ir_G_control:last-child{flex:none}}@container h8ir_G_learning-visual-v4 (width<=360px){.h8ir_G_sequenceActions .h8ir_G_control>span:not([aria-hidden]){display:none}.h8ir_G_detailPanel{grid-template-columns:minmax(0,1fr) 28px}.h8ir_G_detailPanel>span,.h8ir_G_detailPanel>strong,.h8ir_G_detailPanel>p{grid-column:1}.h8ir_G_detailPanel>button{grid-column:2}}";
		const tagId$12 = "@dsh-portable/interactive-learning/shell.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$12) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$12;
			tag.textContent = css$12;
			document.head.appendChild(tag);
		}
		var shell_module_css_default = {
			"closeButton": "h8ir_G_closeButton",
			"control": "h8ir_G_control",
			"controlPrimary": "h8ir_G_controlPrimary",
			"controlQuiet": "h8ir_G_controlQuiet",
			"controlRow": "h8ir_G_controlRow",
			"controlToned": "h8ir_G_controlToned",
			"detailPanel": "h8ir_G_detailPanel",
			"emptyState": "h8ir_G_emptyState",
			"errorFallback": "h8ir_G_errorFallback",
			"interactionHint": "h8ir_G_interactionHint",
			"learning-visual-v4": "h8ir_G_learning-visual-v4",
			"rendererStack": "h8ir_G_rendererStack",
			"selectionSlot": "h8ir_G_selectionSlot",
			"sequence": "h8ir_G_sequence",
			"sequenceActions": "h8ir_G_sequenceActions",
			"sequenceRail": "h8ir_G_sequenceRail",
			"sequenceText": "h8ir_G_sequenceText",
			"srOnly": "h8ir_G_srOnly",
			"stateLegend": "h8ir_G_stateLegend",
			"viewport": "h8ir_G_viewport",
			"visualEyebrow": "h8ir_G_visualEyebrow",
			"visualHeader": "h8ir_G_visualHeader",
			"visualShell": "h8ir_G_visualShell"
		};
		//#endregion
		//#region src/client/visuals/core/shell-parts.tsx
		/**
		* The chrome shared by all eight renderers: the error boundary, the sequence
		* controller, the selection surface, the figure viewport and the state legend.
		*
		* Every renderer composes these rather than restating them, so the heading
		* hierarchy, control shapes, empty and error surfaces, keyboard behaviour and
		* responsive rules are the same wherever a learner meets them.
		*/
		var VisualErrorBoundary = class extends react.Component {
			state = {};
			static getDerivedStateFromError(error) {
				return { error };
			}
			componentDidCatch(error, info) {
				console.error("Learning visual renderer failed", error, info);
			}
			render() {
				if (this.state.error === void 0) return this.props.children;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: shell_module_css_default.errorFallback,
					role: "alert",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: this.props.labels.errorTitle }), this.props.fallbackMarkdown === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: this.props.labels.errorContinue }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", { children: this.props.fallbackMarkdown })]
				});
			}
		};
		function SequenceController({ sequence, frameIndex, onFrameChange }) {
			const labels = useVisualLabels();
			const frame = sequence.frames[frameIndex];
			const initialIndex = Math.max(0, sequence.frames.findIndex((item) => item.id === sequence.initialFrameId));
			const move = (delta) => {
				onFrameChange(Math.max(0, Math.min(sequence.frames.length - 1, frameIndex + delta)));
			};
			const onKeyDown = (event) => {
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					move(-1);
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					move(1);
				} else if (event.key === "Home") {
					event.preventDefault();
					onFrameChange(0);
				} else if (event.key === "End") {
					event.preventDefault();
					onFrameChange(sequence.frames.length - 1);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.sequence,
				role: "group",
				onKeyDown,
				"aria-label": labels.sequenceLabel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shell_module_css_default.sequenceText,
						"aria-live": "polite",
						"aria-atomic": "true",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								frameIndex + 1,
								" / ",
								sequence.frames.length
							] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: frame?.label }),
							frame?.description === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: frame.description })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shell_module_css_default.sequenceActions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => move(-1),
								disabled: frameIndex === 0,
								"aria-label": labels.previousStep,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									children: "←"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.previousStep })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => move(1),
								disabled: frameIndex >= sequence.frames.length - 1,
								"aria-label": labels.nextStep,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.nextStep }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									"aria-hidden": "true",
									children: "→"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => onFrameChange(initialIndex),
								disabled: frameIndex === initialIndex,
								children: labels.reset
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: shell_module_css_default.sequenceRail,
						children: sequence.frames.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							"data-visual-state": index === frameIndex ? "current" : index < frameIndex ? "visited" : "context",
							"aria-current": index === frameIndex ? "step" : void 0,
							"aria-label": `${labelTemplate(labels.stepOfTotal, {
								current: index + 1,
								total: sequence.frames.length
							})}: ${item.label}`,
							onClick: () => onFrameChange(index)
						}) }, item.id))
					})
				]
			});
		}
		/**
		* The hint and the selection detail share one slot.
		*
		* Selecting a mark used to swap a one-line hint for a three-line panel, which
		* moved the figure under the learner's pointer. The slot reserves the taller of
		* the two instead.
		*/
		function SelectionSurface({ hint, selected, kindLabel, onClose }) {
			const labels = useVisualLabels();
			if (selected === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shell_module_css_default.selectionSlot,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: shell_module_css_default.interactionHint,
					children: hint
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shell_module_css_default.selectionSlot,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
					className: shell_module_css_default.detailPanel,
					"data-tone": selected.tone,
					"aria-live": "polite",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: kindLabel ?? selected.kind }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: selected.label }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: selected.detail ?? labels.noDetail }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: `${shell_module_css_default.control} ${shell_module_css_default.closeButton}`,
							onClick: onClose,
							"aria-label": labels.closeDetail,
							children: "×"
						})
					]
				})
			});
		}
		/** The scrollable frame a measured SVG figure is drawn into. */
		function FigureViewport({ viewportRef, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: shell_module_css_default.viewport,
				ref: viewportRef,
				children
			});
		}
		/** Names the emphasis states a figure is currently using, in words. */
		function StateLegend({ states }) {
			const labels = useVisualLabels();
			const naming = {
				current: labels.stateCurrent,
				related: labels.stateRelated,
				visited: labels.stateVisited,
				context: labels.stateContext,
				inactive: labels.stateContext
			};
			const shown = [...new Set(states)].filter((state) => naming[state] !== void 0);
			if (shown.length < 2) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: shell_module_css_default.stateLegend,
				"aria-label": labels.graphLegendLabel,
				children: shown.map((state) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					"data-visual-state": state,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { "aria-hidden": "true" }), naming[state]]
				}, state))
			});
		}
		function EmptyFigure({ message }) {
			const labels = useVisualLabels();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: shell_module_css_default.emptyState,
				role: "note",
				children: message ?? labels.emptyVisual
			});
		}
		//#endregion
		//#region src/client/visuals/state/visual-state.ts
		function visualFocus(currentIds, visitedIds = []) {
			const current = new Set(currentIds);
			return {
				currentIds: current,
				visitedIds: new Set([...visitedIds].filter((id) => !current.has(id))),
				active: current.size > 0
			};
		}
		/**
		* Resolve one element's state.
		*
		* `relatedIds` are the ids that make this element part of the current story
		* without being its subject: the group a node belongs to, the endpoints of a
		* focused edge, the section a concept sits in.
		*/
		function elementState(id, focus, relatedIds = []) {
			if (!focus.active) return "overview";
			if (focus.currentIds.has(id)) return "current";
			if (relatedIds.some((related) => related !== void 0 && focus.currentIds.has(related))) return "related";
			if (focus.visitedIds.has(id)) return "visited";
			return "context";
		}
		//#endregion
		//#region src/client/visuals/core/types.ts
		const DEFAULT_TONES = [
			"blue",
			"red",
			"green",
			"orange",
			"purple",
			"gray"
		];
		//#endregion
		//#region src/client/visuals/core/format.ts
		function formatNumber(value, digits) {
			if (!Number.isFinite(value)) return "—";
			if (digits !== void 0) return value.toFixed(digits);
			if (Number.isInteger(value)) return String(value);
			return String(Number(value.toPrecision(6)));
		}
		function normalizedPosition(value, min, max) {
			if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
			return Math.max(0, Math.min(1, (value - min) / (max - min)));
		}
		function interpolate(min, max, ratio) {
			return min + (max - min) * Math.max(0, Math.min(1, ratio));
		}
		function niceStep(rawStep) {
			if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;
			const power = 10 ** Math.floor(Math.log10(rawStep));
			const normalized = rawStep / power;
			return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * power;
		}
		function ticks(min, max, target = 6) {
			const step = niceStep((max - min) / target);
			const first = Math.ceil(min / step) * step;
			const values = [];
			for (let value = first, index = 0; value <= max && index < target * 4; value += step, index += 1) values.push(Number(value.toPrecision(12)));
			return values.length > 0 ? values : [min, max];
		}
		function toneAt(tone, index = 0) {
			if (tone === "blue" || tone === "green" || tone === "red" || tone === "orange" || tone === "purple" || tone === "gray") return tone;
			return DEFAULT_TONES[index % DEFAULT_TONES.length] ?? "blue";
		}
		function activateWithKeyboard(event, action) {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			action();
		}
		/**
		* Normalise a model-written expression into display math.
		*
		* The payload carries LaTeX without delimiters, but models routinely emit the
		* Unicode form of the same symbols; rewriting them keeps a valid derivation
		* from rendering as literal text.
		*/
		function displayMath(expression) {
			const value = expression.trim().replaceAll("′", "'").replaceAll("−", "-").replaceAll("²", "^{2}").replaceAll("³", "^{3}").replaceAll("→", "\\to ").replaceAll("≤", "\\le ").replaceAll("≥", "\\ge ").replaceAll("≠", "\\ne ").replaceAll("×", "\\times ").replaceAll("÷", "\\div ").replaceAll("∞", "\\infty ").replace(/\blim\s*\[([^\]]+)\]/g, "\\lim_{$1}");
			if (value.startsWith("$$") && value.endsWith("$$") || value.startsWith("\\[") && value.endsWith("\\]")) return value;
			return `$$\n${value}\n$$`;
		}
		//#endregion
		//#region src/client/visuals/state/hooks.ts
		/** Interaction hooks shared by the figure renderers. */
		/**
		* Roving tabindex over the interactive items of one figure.
		*
		* A node_link visual may declare 48 nodes and 160 edges, and a scene_2d up to
		* 64 elements. Leaving every item in the tab order turns one inline diagram
		* into a 200-stop detour that a keyboard user has to walk through to reach the
		* rest of the conversation. The figure is a single tab stop instead: arrow
		* keys, Home and End move between its items, Enter and Space select one.
		*/
		function useRovingFocus(ids) {
			const containerRef = (0, react.useRef)(null);
			const [focusedId, setFocusedId] = (0, react.useState)();
			const active = focusedId !== void 0 && ids.includes(focusedId) ? focusedId : ids[0];
			const focusAt = (index) => {
				const next = ids[Math.max(0, Math.min(ids.length - 1, index))];
				if (next === void 0) return;
				setFocusedId(next);
				for (const item of containerRef.current?.querySelectorAll("[data-roving-id]") ?? []) if (item.dataset.rovingId === next) {
					item.focus();
					return;
				}
			};
			const itemProps = (id, activate) => ({
				tabIndex: id === active ? 0 : -1,
				"data-roving-id": id,
				onFocus: () => setFocusedId(id),
				onKeyDown: (event) => {
					const index = ids.indexOf(id);
					if (event.key === "ArrowRight" || event.key === "ArrowDown") {
						event.preventDefault();
						focusAt(index + 1);
					} else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
						event.preventDefault();
						focusAt(index - 1);
					} else if (event.key === "Home") {
						event.preventDefault();
						focusAt(0);
					} else if (event.key === "End") {
						event.preventDefault();
						focusAt(ids.length - 1);
					} else activateWithKeyboard(event, activate);
				}
			});
			return {
				containerRef,
				itemProps
			};
		}
		/**
		* Track the usable inline size of a figure's viewport.
		*
		* Layout is derived from the measured width, so the default has to be a
		* plausible conversation column rather than zero: a zero reading means "not
		* laid out yet" and must not collapse the figure before the observer fires.
		*/
		function useContainerWidth(minimum = 260) {
			const ref = (0, react.useRef)(null);
			const [width, setWidth] = (0, react.useState)(680);
			(0, react.useEffect)(() => {
				const element = ref.current;
				if (element === null) return;
				const update = (measured) => {
					if (measured <= 0) return;
					const next = Math.max(minimum, measured);
					setWidth((current) => Math.abs(current - next) < 1 ? current : next);
				};
				update(element.getBoundingClientRect().width);
				if (typeof ResizeObserver === "undefined") return;
				const observer = new ResizeObserver((entries) => {
					const entry = entries[0];
					if (entry !== void 0) update(entry.contentRect.width);
				});
				observer.observe(element);
				return () => observer.disconnect();
			}, [minimum]);
			return [ref, width];
		}
		function chartGeometry(containerWidth, minWidth = 320) {
			const width = Math.max(minWidth, Math.round(containerWidth));
			const height = Math.round(Math.max(260, Math.min(400, width * .56)));
			const left = width < 420 ? 46 : 56;
			const right = 18;
			const top = 20;
			const bottom = width < 420 ? 46 : 52;
			return {
				width,
				height,
				left,
				right,
				top,
				bottom,
				plotWidth: width - left - right,
				plotHeight: height - top - bottom
			};
		}
		function scaleX(value, axis, geometry) {
			return geometry.left + normalizedPosition(value, axis.min, axis.max) * geometry.plotWidth;
		}
		function scaleY(value, axis, geometry) {
			return geometry.top + (1 - normalizedPosition(value, axis.min, axis.max)) * geometry.plotHeight;
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/plot.module.css.mjs
		const css$11 = ".sAv75W_plotSvg,.sAv75W_sceneSvg{touch-action:pan-y;max-width:none;display:block;overflow:visible}.sAv75W_parameterGrid{gap:var(--lx-space-lg) var(--lx-space-3xl);grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));display:grid}.sAv75W_parameter{grid-template-rows:auto 20px var(--lx-leading-micro);gap:var(--lx-space-3xs);cursor:pointer;min-width:0;opacity:var(--lx-vs-alpha);display:grid}.sAv75W_parameterHeader{justify-content:space-between;align-items:baseline;gap:var(--lx-space-lg);min-width:0;color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm);display:flex}.sAv75W_parameterHeader output{color:var(--lx-accent);font-size:var(--lx-text-sm);font-variant-numeric:tabular-nums;font-weight:var(--lx-weight-strong)}.sAv75W_parameter input{appearance:none;border-radius:var(--lx-radius-pill);background:linear-gradient(to right, var(--lx-accent) 0 var(--range-progress), var(--lx-border-default) var(--range-progress) 100%);cursor:pointer;align-self:center;width:100%;height:4px}.sAv75W_parameter input::-webkit-slider-runnable-track{background:0 0;height:4px}.sAv75W_parameter input::-moz-range-track{background:0 0;height:4px}.sAv75W_parameter input::-webkit-slider-thumb{appearance:none;border:3px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--lx-accent);width:17px;height:17px;box-shadow:0 0 0 1px var(--lx-accent);margin-top:-6.5px}.sAv75W_parameter input::-moz-range-thumb{border:3px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--lx-accent);width:11px;height:11px;box-shadow:0 0 0 1px var(--lx-accent)}.sAv75W_parameterEnds{color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums;line-height:var(--lx-leading-micro);justify-content:space-between;display:flex}.sAv75W_metrics{gap:var(--lx-space-sm);grid-template-columns:repeat(auto-fit,minmax(128px,1fr));margin:0;display:grid}.sAv75W_metrics>div{gap:var(--lx-space-3xs);border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-sm);min-width:0;padding:var(--lx-space-sm) var(--lx-space-md);background:var(--lx-surface-sunken);opacity:var(--lx-vs-alpha);display:grid}.sAv75W_metrics dt{color:var(--lx-label-secondary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.sAv75W_metrics dd{color:var(--lx-accent);font-size:var(--lx-text-md);font-variant-numeric:tabular-nums;font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-base);margin:0}.sAv75W_plotFrame{fill:var(--lx-surface-base);stroke:var(--lx-border-default);stroke-width:1px;vector-effect:non-scaling-stroke}.sAv75W_gridLine{stroke:var(--lx-border-subtle);stroke-width:1px;vector-effect:non-scaling-stroke}.sAv75W_minorGridLine{stroke:color-mix(in srgb, var(--lx-border-subtle) 60%, transparent);stroke-width:.7px;stroke-dasharray:2 4;vector-effect:non-scaling-stroke}.sAv75W_zeroAxis{stroke:var(--lx-border-strongest);stroke-width:1.4px;vector-effect:non-scaling-stroke}.sAv75W_originMarker circle{fill:var(--lx-label-primary);stroke:var(--lx-surface-base);stroke-width:1.5px}.sAv75W_originMarker text{fill:var(--lx-label-secondary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong)}.sAv75W_tickLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums}.sAv75W_axisLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-medium)}.sAv75W_seriesArea{opacity:var(--lx-vs-alpha);pointer-events:none;transition:opacity var(--lx-motion-base) var(--lx-easing)}.sAv75W_seriesLine{fill:none;stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:calc(2.5px + var(--lx-vs-ring) * .9px);stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;filter:drop-shadow(0 1px 2px color-mix(in srgb, var(--visual-tone) 25%, transparent));transition:stroke-opacity var(--lx-motion-base) var(--lx-easing), stroke-width var(--lx-motion-base) var(--lx-easing)}.sAv75W_seriesPoint,.sAv75W_probePoint{fill:var(--visual-tone);fill-opacity:var(--lx-vs-alpha);stroke:var(--lx-surface-base);stroke-width:2px;vector-effect:non-scaling-stroke;transition:r var(--lx-motion-fast) var(--lx-easing)}.sAv75W_probePoint{filter:drop-shadow(0 0 4px var(--visual-tone))}.sAv75W_seriesBar{fill:color-mix(in srgb, var(--visual-tone) 65%, transparent);fill-opacity:var(--lx-vs-alpha);stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:1px;vector-effect:non-scaling-stroke;transition:fill-opacity var(--lx-motion-fast) var(--lx-easing)}.sAv75W_probeLine{stroke:color-mix(in srgb, var(--lx-label-primary) 60%, transparent);stroke-width:1.2px;stroke-dasharray:4 4;pointer-events:none;vector-effect:non-scaling-stroke}.sAv75W_probeCard{top:var(--lx-space-sm);right:var(--lx-space-sm);z-index:3;gap:var(--lx-space-3xs);border:1px solid color-mix(in srgb, var(--lx-accent) 26%, var(--lx-border-strong));border-radius:var(--lx-radius-sm);width:max-content;max-width:220px;padding:var(--lx-space-xs) var(--lx-space-sm);background:var(--lx-surface-base);box-shadow:var(--lx-shadow-md), 0 0 10px color-mix(in srgb, var(--lx-accent) 12%, transparent);color:var(--lx-label-secondary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro);pointer-events:none;backdrop-filter:blur(8px);display:grid;position:absolute}.sAv75W_probeCard strong{color:var(--lx-label-primary);font-size:var(--lx-text-2xs)}.sAv75W_probeCard span:before{border-radius:var(--lx-radius-circle);background:var(--visual-tone);width:6px;height:6px;box-shadow:0 0 4px var(--visual-tone);content:\"\";margin-right:5px;display:inline-block}.sAv75W_emptyPlotNotice{border:1px dashed var(--lx-border-strong);border-radius:var(--lx-radius-md);width:max-content;max-width:min(92%,320px);padding:var(--lx-space-sm) var(--lx-space-lg);background:var(--lx-surface-base);color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);text-align:center;pointer-events:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.sAv75W_seriesToggles{gap:var(--lx-space-sm);flex-wrap:wrap;display:flex}.sAv75W_seriesToggle{border-radius:var(--lx-radius-pill);padding:var(--lx-space-2xs) var(--lx-space-md)}.sAv75W_seriesToggle>span{border-top:2.5px solid var(--visual-tone);width:18px;height:0;display:inline-block}.sAv75W_seriesToggle[data-series-type=points]>span{border-radius:var(--lx-radius-circle);background:var(--visual-tone);border:0;width:8px;height:8px}.sAv75W_seriesToggle[data-series-type=bars]>span{background:color-mix(in srgb, var(--visual-tone) 72%, transparent);border:0;border-radius:1px;width:9px;height:10px}.sAv75W_seriesToggle[data-stroke=dashed]>span{border-top-style:dashed}.sAv75W_seriesToggle[data-stroke=dotted]>span{border-top-style:dotted}.sAv75W_seriesToggle[aria-pressed=false]{color:var(--lx-label-tertiary);text-decoration:line-through}.sAv75W_seriesToggle[aria-pressed=false]>span{opacity:.55}.sAv75W_seriesToggle[data-empty]{border-style:dashed}.sAv75W_seriesToggle[data-empty]>small{color:var(--lx-label-tertiary);font-size:var(--lx-text-micro)}.sAv75W_sceneElement{cursor:pointer}.sAv75W_sceneLine{stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:calc(2.2px + var(--lx-vs-ring) * .8px);stroke-linecap:round;vector-effect:non-scaling-stroke;transition:stroke-width var(--lx-motion-fast) var(--lx-easing), stroke-opacity var(--lx-motion-fast) var(--lx-easing)}.sAv75W_sceneHit{fill:none;stroke:#0000;stroke-width:14px;pointer-events:stroke;vector-effect:non-scaling-stroke}.sAv75W_scenePoint{fill:var(--visual-tone);fill-opacity:var(--lx-vs-alpha);stroke:var(--lx-surface-base);stroke-width:2px;filter:drop-shadow(0 0 3px color-mix(in srgb, var(--visual-tone) 45%, transparent));vector-effect:non-scaling-stroke;transition:transform var(--lx-motion-fast) var(--lx-easing)}.sAv75W_sceneShape{fill:color-mix(in srgb, var(--visual-tone) 13%, transparent);fill-opacity:var(--lx-vs-alpha);stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:2px;vector-effect:non-scaling-stroke;transition:fill var(--lx-motion-fast) var(--lx-easing), stroke-width var(--lx-motion-fast) var(--lx-easing)}.sAv75W_sceneElement:hover .sAv75W_sceneShape,.sAv75W_sceneElement:focus-visible .sAv75W_sceneShape,.sAv75W_sceneElement[data-selected] .sAv75W_sceneShape{fill:color-mix(in srgb, var(--visual-tone) 24%, transparent);fill-opacity:1;stroke-opacity:1;stroke-width:2.8px;filter:drop-shadow(0 0 6px color-mix(in srgb, var(--visual-tone) 30%, transparent))}.sAv75W_sceneElement:hover .sAv75W_sceneLine,.sAv75W_sceneElement:focus-visible .sAv75W_sceneLine,.sAv75W_sceneElement[data-selected] .sAv75W_sceneLine{stroke-opacity:1;stroke-width:3.2px;filter:drop-shadow(0 0 4px var(--visual-tone))}.sAv75W_sceneText,.sAv75W_shapeLabel{fill:var(--lx-label-primary);stroke:var(--lx-surface-base);stroke-width:3px;paint-order:stroke;font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-medium);opacity:var(--lx-vs-alpha);pointer-events:none}.sAv75W_shapeLabel{fill:var(--visual-tone);font-weight:var(--lx-weight-strong)}.sAv75W_arrowMarker path{fill:var(--visual-tone);fill-opacity:var(--lx-vs-alpha)}@media (prefers-reduced-motion:reduce){.sAv75W_seriesArea,.sAv75W_seriesLine,.sAv75W_probeCard{transition:none}}";
		const tagId$11 = "@dsh-portable/interactive-learning/plot.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$11) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$11;
			tag.textContent = css$11;
			document.head.appendChild(tag);
		}
		var plot_module_css_default = {
			"arrowMarker": "sAv75W_arrowMarker",
			"axisLabel": "sAv75W_axisLabel",
			"emptyPlotNotice": "sAv75W_emptyPlotNotice",
			"gridLine": "sAv75W_gridLine",
			"metrics": "sAv75W_metrics",
			"minorGridLine": "sAv75W_minorGridLine",
			"originMarker": "sAv75W_originMarker",
			"parameter": "sAv75W_parameter",
			"parameterEnds": "sAv75W_parameterEnds",
			"parameterGrid": "sAv75W_parameterGrid",
			"parameterHeader": "sAv75W_parameterHeader",
			"plotFrame": "sAv75W_plotFrame",
			"plotSvg": "sAv75W_plotSvg",
			"probeCard": "sAv75W_probeCard",
			"probeLine": "sAv75W_probeLine",
			"probePoint": "sAv75W_probePoint",
			"sceneElement": "sAv75W_sceneElement",
			"sceneHit": "sAv75W_sceneHit",
			"sceneLine": "sAv75W_sceneLine",
			"scenePoint": "sAv75W_scenePoint",
			"sceneShape": "sAv75W_sceneShape",
			"sceneSvg": "sAv75W_sceneSvg",
			"sceneText": "sAv75W_sceneText",
			"seriesArea": "sAv75W_seriesArea",
			"seriesBar": "sAv75W_seriesBar",
			"seriesLine": "sAv75W_seriesLine",
			"seriesPoint": "sAv75W_seriesPoint",
			"seriesToggle": "sAv75W_seriesToggle",
			"seriesToggles": "sAv75W_seriesToggles",
			"shapeLabel": "sAv75W_shapeLabel",
			"tickLabel": "sAv75W_tickLabel",
			"zeroAxis": "sAv75W_zeroAxis"
		};
		//#endregion
		//#region src/client/visuals/renderers/PlotRenderer.tsx
		/** `plot`: quantitative relationships on axes, with optional live parameters. */
		function initialParameterValues(content, storageKey) {
			const parameters = content.parameters ?? [];
			const values = Object.fromEntries(parameters.map((parameter) => [parameter.id, parameter.initial]));
			if (storageKey === void 0 || typeof sessionStorage === "undefined") return values;
			try {
				const stored = JSON.parse(sessionStorage.getItem(`dsh-learning/visual@4:${storageKey}`) ?? "{}");
				for (const parameter of parameters) {
					const candidate = stored[parameter.id];
					if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= parameter.min && candidate <= parameter.max) values[parameter.id] = candidate;
				}
			} catch {}
			return values;
		}
		/**
		* Sample one curve into a path, and report whether any sample is actually
		* visible inside the declared axes.
		*
		* A schema-valid curve can still produce nothing to look at: `log` or `sqrt`
		* over a negative domain yields no finite value, and a curve whose outputs sit
		* far outside the declared y range is drawn entirely outside the clip. Both
		* would otherwise leave the learner staring at an empty frame.
		*/
		function plotCurveRender(series, content, values, geometry, yAxis, evaluate) {
			const samples = content.xAxis.samples ?? 160;
			const commands = [];
			const segments = [];
			let currentSegment = [];
			let drawing = false;
			let previousY;
			let visible = false;
			for (let index = 0; index < samples; index += 1) {
				const x = interpolate(content.xAxis.min, content.xAxis.max, index / Math.max(1, samples - 1));
				const y = evaluate({
					...values,
					x
				});
				if (!Number.isFinite(y) || Math.abs(y) > 0xe8d4a51000) {
					if (currentSegment.length > 0) segments.push(currentSegment);
					currentSegment = [];
					drawing = false;
					previousY = void 0;
					continue;
				}
				if (y >= yAxis.min && y <= yAxis.max) visible = true;
				const px = scaleX(x, content.xAxis, geometry);
				const py = scaleY(y, yAxis, geometry);
				if (previousY !== void 0 && Math.abs(previousY - py) > geometry.plotHeight * 2) {
					if (currentSegment.length > 0) segments.push(currentSegment);
					currentSegment = [];
					drawing = false;
				}
				commands.push(`${drawing ? "L" : "M"}${px.toFixed(2)},${py.toFixed(2)}`);
				currentSegment.push({
					px,
					py
				});
				drawing = true;
				previousY = py;
			}
			if (currentSegment.length > 0) segments.push(currentSegment);
			const zeroY = scaleY(Math.max(yAxis.min, Math.min(yAxis.max, 0)), yAxis, geometry);
			const areaPath = segments.filter((segment) => segment.length > 1).map((segment) => {
				const segmentCommands = segment.map((point, index) => `${index === 0 ? "M" : "L"}${point.px.toFixed(2)},${point.py.toFixed(2)}`);
				const first = segment[0];
				const last = segment[segment.length - 1];
				return `${segmentCommands.join(" ")} L ${last.px.toFixed(2)},${zeroY.toFixed(2)} L ${first.px.toFixed(2)},${zeroY.toFixed(2)} Z`;
			}).join(" ") || void 0;
			return {
				path: commands.join(" "),
				areaPath,
				visible
			};
		}
		/** Whether any declared point of a plotted series falls inside both axes. */
		function pointsVisible(points, content, yAxis) {
			return points.some((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= content.xAxis.min && point.x <= content.xAxis.max && point.y >= yAxis.min && point.y <= yAxis.max);
		}
		function pointsPath(points, content, geometry, yAxis) {
			return points.map((point, index) => `${index === 0 ? "M" : "L"}${scaleX(point.x, content.xAxis, geometry).toFixed(2)},${scaleY(point.y, yAxis, geometry).toFixed(2)}`).join(" ");
		}
		function nearestPoint(points, x) {
			let nearest;
			for (const point of points) if (nearest === void 0 || Math.abs(point.x - x) < Math.abs(nearest.x - x)) nearest = point;
			return nearest;
		}
		/** Keep the declared y range as the default, but reveal values that move
		* outside it while a live parameter changes. A cap avoids a single
		* asymptote flattening the entire chart. */
		const AUTO_FIT_VALUE_LIMIT = 1e9;
		function autoFitYAxis(content, values, compiledCurves) {
			const samples = [];
			for (const series of content.series) if (series.type === "curve" && (content.parameters?.length ?? 0) > 0) {
				const evaluate = compiledCurves.get(series.id);
				if (evaluate === void 0) continue;
				const count = content.xAxis.samples ?? 160;
				for (let index = 0; index < count; index += 1) {
					const x = interpolate(content.xAxis.min, content.xAxis.max, index / Math.max(1, count - 1));
					const y = evaluate({
						...values,
						x
					});
					if (Number.isFinite(y) && Math.abs(y) <= AUTO_FIT_VALUE_LIMIT) samples.push(y);
				}
			}
			if (samples.length === 0) return content.yAxis;
			const minimum = Math.min(content.yAxis.min, ...samples);
			const maximum = Math.max(content.yAxis.max, ...samples);
			if (minimum >= content.yAxis.min && maximum <= content.yAxis.max) return content.yAxis;
			const span = Math.max(Number.EPSILON, maximum - minimum);
			const padding = Math.max(Number.EPSILON, span * .08);
			return {
				...content.yAxis,
				min: minimum - padding,
				max: maximum + padding
			};
		}
		function interpolatedLineValue(points, x) {
			const sorted = [...points].sort((left, right) => left.x - right.x);
			const first = sorted[0];
			const last = sorted[sorted.length - 1];
			if (first === void 0 || last === void 0) return void 0;
			if (x <= first.x) return first.y;
			if (x >= last.x) return last.y;
			for (let index = 1; index < sorted.length; index += 1) {
				const previous = sorted[index - 1];
				const current = sorted[index];
				if (previous === void 0 || current === void 0) continue;
				if (x <= current.x) {
					const span = current.x - previous.x;
					return span === 0 ? current.y : previous.y + (current.y - previous.y) * ((x - previous.x) / span);
				}
			}
			return last.y;
		}
		function PlotRenderer({ content, focus, storageKey }) {
			const labels = useVisualLabels();
			const id = (0, react.useId)();
			const [viewportRef, containerWidth] = useContainerWidth();
			const geometry = (0, react.useMemo)(() => chartGeometry(containerWidth), [containerWidth]);
			const [values, setValues] = (0, react.useState)(() => initialParameterValues(content, storageKey));
			const [hiddenSeries, setHiddenSeries] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [probeX, setProbeX] = (0, react.useState)();
			const compiledCurves = (0, react.useMemo)(() => new Map(content.series.flatMap((series) => series.type === "curve" ? [[series.id, compileMathExpression(series.expression)]] : [])), [content.series]);
			const compiledMetrics = (0, react.useMemo)(() => new Map((content.metrics ?? []).map((metric) => [metric.id, compileMathExpression(metric.expression)])), [content.metrics]);
			const viewYAxis = (0, react.useMemo)(() => autoFitYAxis(content, values, compiledCurves), [
				compiledCurves,
				content,
				values
			]);
			const xTicks = (0, react.useMemo)(() => ticks(content.xAxis.min, content.xAxis.max), [content.xAxis.max, content.xAxis.min]);
			const yTicks = (0, react.useMemo)(() => ticks(viewYAxis.min, viewYAxis.max), [viewYAxis.max, viewYAxis.min]);
			const parameters = content.parameters ?? [];
			(0, react.useEffect)(() => {
				if (storageKey === void 0 || typeof sessionStorage === "undefined") return;
				try {
					sessionStorage.setItem(`dsh-learning/visual@4:${storageKey}`, JSON.stringify(values));
				} catch {}
			}, [storageKey, values]);
			const renders = (0, react.useMemo)(() => new Map(content.series.map((series) => [series.id, series.type === "curve" ? plotCurveRender(series, content, values, geometry, viewYAxis, compiledCurves.get(series.id) ?? ((bindings) => evaluateMathExpression(series.expression, bindings))) : {
				path: void 0,
				areaPath: void 0,
				visible: pointsVisible(series.points, content, viewYAxis)
			}])), [
				compiledCurves,
				content,
				geometry,
				values,
				viewYAxis
			]);
			const visibleSeries = content.series.filter((series) => !hiddenSeries.has(series.id));
			const emptySeriesIds = new Set(content.series.filter((series) => renders.get(series.id)?.visible !== true).map((series) => series.id));
			const nothingToSee = visibleSeries.length > 0 && visibleSeries.every((series) => emptySeriesIds.has(series.id));
			const probeValues = probeX === void 0 ? [] : visibleSeries.flatMap((series) => {
				if (series.type === "curve") {
					const y = compiledCurves.get(series.id)?.({
						...values,
						x: probeX
					});
					return y === void 0 || !Number.isFinite(y) ? [] : [{
						id: series.id,
						label: series.label,
						x: probeX,
						y,
						tone: series.tone
					}];
				}
				if (series.type === "line") {
					const y = interpolatedLineValue(series.points, probeX);
					return y === void 0 || !Number.isFinite(y) ? [] : [{
						id: series.id,
						label: series.label,
						x: probeX,
						y,
						tone: series.tone
					}];
				}
				const nearest = nearestPoint(series.points, probeX);
				return nearest === void 0 || !Number.isFinite(nearest.y) ? [] : [{
					id: series.id,
					label: series.label,
					x: nearest.x,
					y: nearest.y,
					tone: series.tone,
					discrete: true
				}];
			});
			const chartDescription = `${content.xAxis.label ?? "x"} ${formatNumber(content.xAxis.min)}–${formatNumber(content.xAxis.max)}; ${viewYAxis.label ?? "y"} ${formatNumber(viewYAxis.min)}–${formatNumber(viewYAxis.max)}; ${content.series.map((series) => series.label).join(", ")}${nothingToSee ? `. ${labels.noValuesInRange}` : ""}`;
			const probeDescription = probeX === void 0 ? `${labels.chartProbeHint}. ${chartDescription}` : `x ${formatNumber(probeX)}。${probeValues.map((item) => `${item.label}${item.discrete ? `（最近点 x ${formatNumber(item.x)}）` : ""} ${formatNumber(item.y)}`).join("，")}`;
			const updateProbeFromPointer = (event) => {
				const rect = event.currentTarget.getBoundingClientRect();
				const viewX = (event.clientX - rect.left) / rect.width * geometry.width;
				const viewY = (event.clientY - rect.top) / rect.height * geometry.height;
				if (viewX < geometry.left - 4 || viewX > geometry.left + geometry.plotWidth + 4 || viewY < geometry.top - 4 || viewY > geometry.top + geometry.plotHeight + 4) {
					setProbeX(void 0);
					return;
				}
				const ratio = Math.max(0, Math.min(1, (viewX - geometry.left) / geometry.plotWidth));
				setProbeX(interpolate(content.xAxis.min, content.xAxis.max, ratio));
			};
			const moveProbe = (event) => {
				const step = (content.xAxis.max - content.xAxis.min) / 50;
				if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
					event.preventDefault();
					const current = probeX ?? (content.xAxis.min + content.xAxis.max) / 2;
					setProbeX(Math.max(content.xAxis.min, Math.min(content.xAxis.max, current + (event.key === "ArrowLeft" ? -step : step))));
				} else if (event.key === "Home") {
					event.preventDefault();
					setProbeX(content.xAxis.min);
				} else if (event.key === "End") {
					event.preventDefault();
					setProbeX(content.xAxis.max);
				} else if (event.key === "Escape") setProbeX(void 0);
			};
			const toggleSeries = (seriesId) => {
				setHiddenSeries((current) => {
					const next = new Set(current);
					if (next.has(seriesId)) next.delete(seriesId);
					else next.add(seriesId);
					return next;
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					parameters.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: plot_module_css_default.parameterGrid,
						children: parameters.map((parameter) => {
							const value = values[parameter.id] ?? parameter.initial;
							const inputId = `${id}-${parameter.id}`;
							const progress = normalizedPosition(value, parameter.min, parameter.max) * 100;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: plot_module_css_default.parameter,
								htmlFor: inputId,
								"data-visual-id": parameter.id,
								"data-visual-state": elementState(parameter.id, focus),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: plot_module_css_default.parameterHeader,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: parameter.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("output", {
											htmlFor: inputId,
											children: formatNumber(value)
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										id: inputId,
										type: "range",
										min: parameter.min,
										max: parameter.max,
										step: parameter.step,
										value,
										style: { "--range-progress": `${progress}%` },
										onChange: (event) => setValues((current) => ({
											...current,
											[parameter.id]: Number(event.target.value)
										}))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: plot_module_css_default.parameterEnds,
										"aria-hidden": "true",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber(parameter.min) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber(parameter.max) })]
									})
								]
							}, parameter.id);
						})
					}),
					content.metrics === void 0 || content.metrics.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
						className: plot_module_css_default.metrics,
						"aria-label": labels.metricsLabel,
						children: content.metrics.map((metric) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							"data-visual-id": metric.id,
							"data-visual-state": elementState(metric.id, focus),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: metric.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dd", { children: [formatNumber(compiledMetrics.get(metric.id)?.(values) ?? evaluateMathExpression(metric.expression, values), metric.digits), metric.suffix ?? ""] })]
						}, metric.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(FigureViewport, {
						viewportRef,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								className: plot_module_css_default.plotSvg,
								width: geometry.width,
								height: geometry.height,
								viewBox: `0 0 ${geometry.width} ${geometry.height}`,
								role: "img",
								tabIndex: 0,
								"aria-label": probeDescription,
								onPointerMove: updateProbeFromPointer,
								onPointerLeave: () => setProbeX(void 0),
								onKeyDown: moveProbe,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
										id: `${id}-plot-clip`,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											x: geometry.left,
											y: geometry.top,
											width: geometry.plotWidth,
											height: geometry.plotHeight
										})
									}), DEFAULT_TONES.map((tone) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
										id: `${id}-area-${tone}`,
										x1: "0",
										y1: "0",
										x2: "0",
										y2: "1",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
												offset: "0%",
												stopColor: `var(--lx-tone-${tone})`,
												stopOpacity: "0.2"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
												offset: "85%",
												stopColor: `var(--lx-tone-${tone})`,
												stopOpacity: "0.03"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
												offset: "100%",
												stopColor: `var(--lx-tone-${tone})`,
												stopOpacity: "0"
											})
										]
									}, tone))] }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
										className: plot_module_css_default.plotFrame,
										x: geometry.left,
										y: geometry.top,
										width: geometry.plotWidth,
										height: geometry.plotHeight,
										rx: "6"
									}),
									yTicks.map((value) => {
										const y = scaleY(value, viewYAxis, geometry);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											className: plot_module_css_default.gridLine,
											x1: geometry.left,
											x2: geometry.left + geometry.plotWidth,
											y1: y,
											y2: y
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											className: plot_module_css_default.tickLabel,
											x: geometry.left - 9,
											y,
											textAnchor: "end",
											dominantBaseline: "middle",
											children: formatNumber(value)
										})] }, `y-${String(value)}`);
									}),
									xTicks.map((value) => {
										const x = scaleX(value, content.xAxis, geometry);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											className: plot_module_css_default.gridLine,
											x1: x,
											x2: x,
											y1: geometry.top,
											y2: geometry.top + geometry.plotHeight
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											className: plot_module_css_default.tickLabel,
											x,
											y: geometry.top + geometry.plotHeight + 19,
											textAnchor: "middle",
											children: formatNumber(value)
										})] }, `x-${String(value)}`);
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										clipPath: `url(#${id}-plot-clip)`,
										children: [
											content.series.map((series, seriesIndex) => {
												if (hiddenSeries.has(series.id) || series.type !== "curve") return null;
												const tone = toneAt(series.tone, seriesIndex);
												const state = elementState(series.id, focus);
												const render = renders.get(series.id);
												if (!render?.areaPath) return null;
												return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													className: plot_module_css_default.seriesArea,
													"data-tone": tone,
													"data-visual-state": state,
													"data-visual-id": series.id,
													fill: `url(#${id}-area-${tone})`,
													d: render.areaPath
												}, `area-${series.id}`);
											}),
											content.series.map((series, seriesIndex) => {
												if (hiddenSeries.has(series.id)) return null;
												const tone = toneAt(series.tone, seriesIndex);
												const state = elementState(series.id, focus);
												if (series.type === "curve") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													className: plot_module_css_default.seriesLine,
													"data-tone": tone,
													"data-visual-state": state,
													"data-visual-id": series.id,
													"data-stroke": series.stroke ?? "solid",
													d: renders.get(series.id)?.path
												}, series.id);
												if (series.type === "line") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													className: plot_module_css_default.seriesLine,
													"data-tone": tone,
													"data-visual-state": state,
													"data-visual-id": series.id,
													"data-stroke": series.stroke ?? "solid",
													d: pointsPath(series.points, content, geometry, viewYAxis)
												}, series.id);
												if (series.type === "bars") {
													const sortedXs = series.points.map((point) => scaleX(point.x, content.xAxis, geometry)).sort((a, b) => a - b);
													const smallestGap = sortedXs.slice(1).reduce((gap, x, index) => Math.min(gap, x - (sortedXs[index] ?? x)), geometry.plotWidth / Math.max(1, sortedXs.length));
													const barWidth = Math.max(6, Math.min(44, smallestGap * .68));
													const zeroY = scaleY(Math.max(viewYAxis.min, Math.min(viewYAxis.max, 0)), viewYAxis, geometry);
													return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
														"data-visual-id": series.id,
														"data-visual-state": state,
														children: series.points.map((point, pointIndex) => {
															const x = scaleX(point.x, content.xAxis, geometry);
															const y = scaleY(point.y, viewYAxis, geometry);
															return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
																className: plot_module_css_default.seriesBar,
																"data-tone": tone,
																x: x - barWidth / 2,
																y: Math.min(y, zeroY),
																width: barWidth,
																height: Math.max(1, Math.abs(zeroY - y)),
																rx: "2",
																children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: point.label ?? `${series.label}: ${formatNumber(point.y)}` })
															}, `${series.id}-${String(pointIndex)}`);
														})
													}, series.id);
												}
												return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
													"data-visual-id": series.id,
													"data-visual-state": state,
													children: series.points.map((point, pointIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
														className: plot_module_css_default.seriesPoint,
														"data-tone": tone,
														cx: scaleX(point.x, content.xAxis, geometry),
														cy: scaleY(point.y, viewYAxis, geometry),
														r: "5",
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: point.label ?? `${series.label}: (${formatNumber(point.x)}, ${formatNumber(point.y)})` })
													}, `${series.id}-${String(pointIndex)}`))
												}, series.id);
											}),
											probeX === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
												className: plot_module_css_default.probeLine,
												x1: scaleX(probeX, content.xAxis, geometry),
												x2: scaleX(probeX, content.xAxis, geometry),
												y1: geometry.top,
												y2: geometry.top + geometry.plotHeight
											}),
											probeX === void 0 ? null : probeValues.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
												className: plot_module_css_default.probePoint,
												"data-tone": toneAt(item.tone, index),
												cx: scaleX(item.x, content.xAxis, geometry),
												cy: scaleY(item.y, viewYAxis, geometry),
												r: "5.5"
											}, item.id))
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: plot_module_css_default.axisLabel,
										x: geometry.left + geometry.plotWidth / 2,
										y: geometry.height - 6,
										textAnchor: "middle",
										children: content.xAxis.label ?? "x"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: plot_module_css_default.axisLabel,
										x: "14",
										y: geometry.top + geometry.plotHeight / 2,
										textAnchor: "middle",
										transform: `rotate(-90 14 ${geometry.top + geometry.plotHeight / 2})`,
										children: viewYAxis.label ?? "y"
									})
								]
							}),
							!nothingToSee ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: plot_module_css_default.emptyPlotNotice,
								role: "note",
								children: labels.noValuesInRange
							}),
							probeX === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: plot_module_css_default.probeCard,
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("strong", { children: ["x = ", formatNumber(probeX)] }), probeValues.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									"data-tone": toneAt(item.tone, index),
									children: [
										item.label,
										item.discrete ? ` · x=${formatNumber(item.x)}` : "",
										": ",
										formatNumber(item.y)
									]
								}, item.id))]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: shell_module_css_default.srOnly,
						role: "status",
						"aria-live": "polite",
						children: probeX === void 0 ? "" : probeDescription
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: plot_module_css_default.seriesToggles,
						role: "group",
						"aria-label": labels.legendLabel,
						children: content.series.map((series, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${shell_module_css_default.control} ${plot_module_css_default.seriesToggle}`,
							"aria-pressed": !hiddenSeries.has(series.id),
							"data-tone": toneAt(series.tone, index),
							"data-series-type": series.type,
							"data-stroke": "stroke" in series ? series.stroke ?? "solid" : void 0,
							"data-empty": emptySeriesIds.has(series.id) || void 0,
							title: emptySeriesIds.has(series.id) ? labels.seriesOutOfRange : void 0,
							onClick: () => toggleSeries(series.id),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true" }),
								series.label,
								!emptySeriesIds.has(series.id) ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: labels.seriesOutOfRange })
							]
						}, series.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shell_module_css_default.selectionSlot,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: shell_module_css_default.interactionHint,
							children: labels.plotInteractionHint
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/visuals/state/graph-state.ts
		/** Above this node count a figure is dense enough for a fourth, quieter tier. */
		const DENSE_GRAPH_NODES = 26;
		function graphEmphasis(content, focus) {
			if (!focus.active) return {
				state: () => "overview",
				active: false
			};
			const nodeIds = new Set(content.nodes.map((node) => node.id));
			const incoming = /* @__PURE__ */ new Map();
			const outgoing = /* @__PURE__ */ new Map();
			for (const edge of content.edges) {
				incoming.set(edge.to, [...incoming.get(edge.to) ?? [], {
					edgeId: edge.id,
					from: edge.from
				}]);
				outgoing.set(edge.from, [...outgoing.get(edge.from) ?? [], {
					edgeId: edge.id,
					to: edge.to
				}]);
			}
			const related = /* @__PURE__ */ new Set();
			const seedNodes = [];
			for (const id of focus.currentIds) if (nodeIds.has(id)) seedNodes.push(id);
			for (const edge of content.edges) {
				if (!focus.currentIds.has(edge.id)) continue;
				related.add(edge.from);
				related.add(edge.to);
				seedNodes.push(edge.from);
			}
			for (const node of content.nodes) {
				if (node.group !== void 0 && focus.currentIds.has(node.group)) {
					related.add(node.id);
					seedNodes.push(node.id);
				}
				if (focus.currentIds.has(node.id) && node.group !== void 0) related.add(node.group);
			}
			const visitedAncestors = /* @__PURE__ */ new Set();
			const queue = [...seedNodes];
			while (queue.length > 0) {
				const current = queue.shift();
				if (current === void 0 || visitedAncestors.has(current)) continue;
				visitedAncestors.add(current);
				for (const step of incoming.get(current) ?? []) {
					related.add(step.edgeId);
					related.add(step.from);
					queue.push(step.from);
				}
			}
			for (const id of focus.currentIds) for (const step of outgoing.get(id) ?? []) {
				related.add(step.edgeId);
				related.add(step.to);
			}
			const dense = content.nodes.length > DENSE_GRAPH_NODES;
			return {
				active: true,
				state: (id) => {
					if (focus.currentIds.has(id)) return "current";
					if (related.has(id)) return "related";
					if (focus.visitedIds.has(id)) return "visited";
					return dense ? "inactive" : "context";
				}
			};
		}
		//#endregion
		//#region src/client/visuals/layout/text-metrics.ts
		/**
		* Label measurement for SVG figures.
		*
		* Node boxes used to be fixed 29px-radius circles holding 10px text, which
		* meant a four-character Chinese label filled the circle edge to edge and a
		* longer one simply overflowed it. Sizing a node needs the label's real extent,
		* and `measureText` is not available during the first layout pass (or in the
		* test environment), so widths are estimated per script instead: CJK, fullwidth
		* punctuation and emoji occupy roughly one em, Latin roughly 0.55em, and digits
		* and spaces slightly less.
		*/
		const WIDE_CHARACTER = /[\u1100-\u115F\u2E80-\uA4CF\uA960-\uA97F\uAC00-\uD7A3\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;
		const THIN_CHARACTER = /[\s.,:;!|'`()[\]{}\-ilj]/;
		/** Estimated advance width of one character at the given font size. */
		function characterWidth(character, fontSize) {
			if (WIDE_CHARACTER.test(character)) return fontSize;
			if (THIN_CHARACTER.test(character)) return fontSize * .32;
			if (/[0-9]/.test(character)) return fontSize * .56;
			if (/[A-Z]/.test(character)) return fontSize * .66;
			return fontSize * .55;
		}
		/** Estimated rendered width of a whole string. */
		function measureText(text, fontSize) {
			let width = 0;
			for (const character of text) width += characterWidth(character, fontSize);
			return width;
		}
		function greedyWrap(text, { fontSize, maxWidth, maxLines = 3 }) {
			const source = text.trim();
			if (source === "") return {
				lines: [""],
				width: 0,
				truncated: false
			};
			if (measureText(source, fontSize) <= maxWidth) return {
				lines: [source],
				width: measureText(source, fontSize),
				truncated: false
			};
			const lines = [];
			let line = "";
			let lineWidth = 0;
			let lastBreak = -1;
			const flush = () => {
				lines.push(line);
				line = "";
				lineWidth = 0;
				lastBreak = -1;
			};
			for (const character of source) {
				const width = characterWidth(character, fontSize);
				if (lineWidth + width > maxWidth && line !== "") {
					if (lastBreak > 0 && !WIDE_CHARACTER.test(character)) {
						const carry = line.slice(lastBreak).trimStart();
						line = line.slice(0, lastBreak).trimEnd();
						flush();
						line = carry;
						lineWidth = measureText(carry, fontSize);
					} else flush();
					if (lines.length >= maxLines) break;
				}
				if (/[\s-]/.test(character)) lastBreak = line.length;
				line += character;
				lineWidth += width;
			}
			if (line !== "" && lines.length < maxLines) lines.push(line);
			const truncated = lines.join("").length < source.length;
			if (truncated) {
				const last = lines[lines.length - 1] ?? "";
				lines[lines.length - 1] = `${last.slice(0, Math.max(1, last.length - 1))}…`;
			}
			return {
				lines,
				width: Math.max(...lines.map((entry) => measureText(entry, fontSize))),
				truncated
			};
		}
		/**
		* Wrap a label to at most `maxLines`, breaking between CJK characters and at
		* spaces or hyphens for Latin text. The final line is ellipsised rather than
		* clipped, and the untruncated text always remains the accessible name.
		*
		* Filling each line to the limit before starting the next one produces
		* “算出每个候选词的概” over “率”: a box as wide as the limit for a label that
		* would read better as two half lines, and — on an edge label — a column gap
		* opened to hold a width the text does not need. The greedy pass decides how
		* many lines the label takes; the same pass is then re-run against the average
		* line width to distribute the text evenly over them.
		*/
		function wrapLabel(text, options) {
			const greedy = greedyWrap(text, options);
			if (greedy.lines.length < 2 || greedy.truncated) return greedy;
			const average = measureText(text.trim(), options.fontSize) / greedy.lines.length;
			for (const slack of [
				1,
				1.08,
				1.16,
				1.24
			]) {
				const width = Math.min(options.maxWidth, average * slack + options.fontSize * .5);
				const balanced = greedyWrap(text, {
					...options,
					maxWidth: width
				});
				if (!balanced.truncated && balanced.lines.length === greedy.lines.length) return balanced;
			}
			return greedy;
		}
		/** Two lines of this width read faster than one long line across a diagram. */
		const EDGE_LABEL_MAX_WIDTH = 118;
		const EDGE_LABEL_MAX_LINES = 2;
		function edgeLabelBox(label) {
			const wrapped = wrapLabel(label, {
				fontSize: 12,
				maxWidth: EDGE_LABEL_MAX_WIDTH,
				maxLines: EDGE_LABEL_MAX_LINES
			});
			return {
				lines: wrapped.lines,
				width: Math.round(wrapped.width + 14),
				height: wrapped.lines.length * 15 + 6,
				truncated: wrapped.truncated
			};
		}
		/** Corner radius that reads as a capsule for one line and a chip for two. */
		function edgeLabelRadius(box) {
			return box.lines.length === 1 ? box.height / 2 : 8;
		}
		const NODE_MAX_TEXT_WIDTH = 124;
		const NODE_MIN_WIDTH = 66;
		const NODE_MIN_HEIGHT = 36;
		const NODE_LINE_HEIGHT$1 = 17;
		const CANVAS_PADDING = 14;
		const HEADER_HEIGHT = 28;
		const SIBLING_GAP = 22;
		const MAIN_GAP_MIN = 58;
		const MAIN_GAP_BASE = 78;
		const MAIN_GAP_MAX = 196;
		/** Distance from the content to the first return lane, and between lanes. */
		const LANE_GAP = 34;
		const LANE_STEP = 30;
		/** Text below this scale stops being comfortably readable, so we scroll instead. */
		const MINIMUM_FIT_SCALE = .82;
		/** Group nodes into the bands the layout draws: declared groups, else levels. */
		function graphLayers(content) {
			if (content.groups !== void 0 && content.groups.length > 0) {
				const grouped = content.groups.map((group) => ({
					id: group.id,
					label: group.label,
					nodes: content.nodes.filter((node) => node.group === group.id)
				})).filter((layer) => layer.nodes.length > 0);
				const knownGroups = new Set(content.groups.map((group) => group.id));
				const ungrouped = content.nodes.filter((node) => node.group === void 0 || !knownGroups.has(node.group));
				if (ungrouped.length > 0) grouped.push({
					id: "ungrouped",
					label: void 0,
					nodes: ungrouped
				});
				return grouped;
			}
			const incoming = new Map(content.nodes.map((node) => [node.id, 0]));
			const outgoing = new Map(content.nodes.map((node) => [node.id, []]));
			const parents = new Map(content.nodes.map((node) => [node.id, []]));
			for (const edge of content.edges) {
				incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
				outgoing.get(edge.from)?.push(edge.to);
				parents.get(edge.to)?.push(edge.from);
			}
			const levels = new Map(content.nodes.map((node) => [node.id, 0]));
			const queue = content.nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
			const visited = /* @__PURE__ */ new Set();
			while (queue.length > 0) {
				const current = queue.shift();
				if (current === void 0) break;
				visited.add(current);
				for (const target of outgoing.get(current) ?? []) {
					levels.set(target, Math.max(levels.get(target) ?? 0, (levels.get(current) ?? 0) + 1));
					incoming.set(target, (incoming.get(target) ?? 1) - 1);
					if (incoming.get(target) === 0) queue.push(target);
				}
			}
			for (const node of content.nodes) {
				if (visited.has(node.id)) continue;
				const settled = (parents.get(node.id) ?? []).filter((parent) => visited.has(parent));
				visited.add(node.id);
				levels.set(node.id, Math.max(0, ...settled.map((parent) => (levels.get(parent) ?? 0) + 1)));
				const walk = [node.id];
				while (walk.length > 0) {
					const current = walk.shift();
					if (current === void 0) break;
					for (const target of outgoing.get(current) ?? []) {
						if (visited.has(target)) continue;
						visited.add(target);
						levels.set(target, (levels.get(current) ?? 0) + 1);
						walk.push(target);
					}
				}
			}
			const levelCount = Math.max(0, ...levels.values()) + 1;
			return Array.from({ length: levelCount }, (_, index) => ({
				id: `layer-${String(index)}`,
				label: void 0,
				nodes: content.nodes.filter((node) => levels.get(node.id) === index)
			})).filter((layer) => layer.nodes.length > 0);
		}
		/** Size one node box around its wrapped label. */
		function nodeBox(node) {
			const wrapped = wrapLabel(node.label, {
				fontSize: 13,
				maxWidth: NODE_MAX_TEXT_WIDTH
			});
			const width = Math.max(NODE_MIN_WIDTH, Math.round(wrapped.width + 30));
			const height = Math.max(NODE_MIN_HEIGHT, wrapped.lines.length * NODE_LINE_HEIGHT$1 + 20);
			return {
				id: node.id,
				width,
				height,
				cornerRadius: wrapped.lines.length === 1 ? height / 2 : 12,
				lines: wrapped.lines,
				truncated: wrapped.truncated
			};
		}
		function fitScale(width, containerWidth) {
			if (containerWidth <= 0 || width <= containerWidth) return 1;
			return Math.max(MINIMUM_FIT_SCALE, containerWidth / width);
		}
		function finish(layout, containerWidth) {
			const scale = fitScale(layout.width, containerWidth);
			return {
				...layout,
				scale,
				renderWidth: Math.round(layout.width * scale),
				renderHeight: Math.round(layout.height * scale)
			};
		}
		function radialLayout(content, containerWidth, boxes) {
			const sizes = [...boxes.values()];
			const widest = Math.max(...sizes.map((box) => box.width));
			const tallest = Math.max(...sizes.map((box) => box.height));
			const count = Math.max(1, content.nodes.length);
			const radius = Math.max(96, count * (widest + SIBLING_GAP) / (2 * Math.PI));
			const width = Math.round(radius * 2 + widest + 28);
			const height = Math.round(radius * 2 + tallest + 28);
			const centerX = width / 2;
			const centerY = height / 2;
			const positioned = /* @__PURE__ */ new Map();
			content.nodes.forEach((node, index) => {
				const angle = -Math.PI / 2 + index / count * Math.PI * 2;
				const box = boxes.get(node.id);
				if (box === void 0) return;
				positioned.set(node.id, {
					...box,
					x: centerX + Math.cos(angle) * radius,
					y: centerY + Math.sin(angle) * radius
				});
			});
			return finish({
				width,
				height,
				nodes: positioned,
				layers: [],
				orientation: "radial",
				showHeaders: false,
				layerIndex: /* @__PURE__ */ new Map(),
				feedbackLanes: /* @__PURE__ */ new Map()
			}, containerWidth);
		}
		/**
		* Reserve the space the edges need before the nodes are placed.
		*
		* Without this pass the gaps are constants and the labels are laid on top of
		* whatever those constants happened to leave over — which is how a five-edge
		* diagram ended up with every chip across a node box or another chip.
		*/
		function planGaps(content, layerIndex, layerCount, vertical) {
			const mainGaps = Array.from({ length: Math.max(0, layerCount - 1) }, () => 0);
			const siblingGaps = Array.from({ length: layerCount }, () => SIBLING_GAP);
			const feedback = [];
			let laneLabel = 0;
			for (const edge of content.edges) {
				const from = layerIndex.get(edge.from);
				const to = layerIndex.get(edge.to);
				if (from === void 0 || to === void 0) continue;
				const box = edge.label === void 0 ? void 0 : edgeLabelBox(edge.label);
				if (to < from) {
					feedback.push(edge.id);
					if (box !== void 0) laneLabel = Math.max(laneLabel, vertical ? box.width : box.height);
					continue;
				}
				if (box === void 0) continue;
				if (to === from) {
					siblingGaps[from] = Math.max(siblingGaps[from] ?? SIBLING_GAP, (vertical ? box.width : box.height) + 22);
					continue;
				}
				const gap = Math.min(from, mainGaps.length - 1);
				if (gap >= 0) mainGaps[gap] = Math.max(mainGaps[gap] ?? 0, (vertical ? box.height : box.width) + 22);
			}
			return {
				mainGaps,
				siblingGaps,
				feedback,
				laneSpace: feedback.length === 0 ? 0 : LANE_GAP + (Math.min(feedback.length, 3) - 1) * LANE_STEP + laneLabel / 2 + 10
			};
		}
		function graphLayout(content, containerWidth) {
			const boxes = new Map(content.nodes.map((node) => [node.id, nodeBox(node)]));
			if (content.layout === "radial") return radialLayout(content, containerWidth, boxes);
			const layers = graphLayers(content);
			const showHeaders = layers.length > 1 && content.groups !== void 0 && content.groups.length > 0;
			const headerSpace = showHeaders ? HEADER_HEIGHT : 0;
			const vertical = content.layout === "hierarchy";
			const positioned = /* @__PURE__ */ new Map();
			const layerIndex = /* @__PURE__ */ new Map();
			layers.forEach((layer, index) => {
				for (const node of layer.nodes) layerIndex.set(node.id, index);
			});
			const plan = planGaps(content, layerIndex, layers.length, vertical);
			const mainExtent = layers.map((layer) => Math.max(...layer.nodes.map((node) => (vertical ? boxes.get(node.id)?.height : boxes.get(node.id)?.width) ?? 0)));
			const crossExtent = layers.map((layer, index) => layer.nodes.reduce((total, node, position) => {
				const box = boxes.get(node.id);
				return total + ((vertical ? box?.width : box?.height) ?? 0) + (position === 0 ? 0 : plan.siblingGaps[index] ?? SIBLING_GAP);
			}, 0));
			const crossContent = Math.max(...crossExtent);
			const mainContent = mainExtent.reduce((total, size) => total + size, 0);
			const gapCount = Math.max(0, layers.length - 1);
			let mainGap = Math.min(MAIN_GAP_MAX, Math.max(vertical ? Math.max(MAIN_GAP_MIN, Math.round(MAIN_GAP_BASE * .72)) : MAIN_GAP_BASE, ...plan.mainGaps));
			const mainSpan = (gap) => 28 + mainContent + gapCount * gap;
			let width = vertical ? 28 + crossContent + plan.laneSpace : mainSpan(mainGap);
			if (!vertical && gapCount > 0 && width < containerWidth) {
				mainGap = Math.min(MAIN_GAP_MAX, mainGap + (containerWidth - width) / gapCount);
				width = mainSpan(mainGap);
			}
			if (vertical && width < containerWidth) width = Math.min(containerWidth, width + 28);
			const height = vertical ? 28 + headerSpace + mainContent + gapCount * mainGap : 28 + headerSpace + crossContent + plan.laneSpace;
			const mainStart = CANVAS_PADDING + (vertical ? headerSpace : 0);
			const crossStart = CANVAS_PADDING + (vertical ? 0 : headerSpace);
			const crossTrack = (vertical ? width : height) - crossStart - CANVAS_PADDING - plan.laneSpace;
			const bands = [];
			let mainCursor = mainStart;
			layers.forEach((layer, index) => {
				const mainSize = mainExtent[index] ?? 0;
				const crossSize = crossExtent[index] ?? 0;
				const siblingGap = plan.siblingGaps[index] ?? SIBLING_GAP;
				let crossCursor = crossStart + Math.max(0, (crossTrack - crossSize) / 2);
				for (const node of layer.nodes) {
					const box = boxes.get(node.id);
					if (box === void 0) continue;
					const crossOwn = vertical ? box.width : box.height;
					positioned.set(node.id, {
						...box,
						x: vertical ? crossCursor + crossOwn / 2 : mainCursor + mainSize / 2,
						y: vertical ? mainCursor + mainSize / 2 : crossCursor + crossOwn / 2
					});
					crossCursor += crossOwn + siblingGap;
				}
				bands.push({
					id: layer.id,
					label: layer.label,
					nodes: layer.nodes,
					headerX: vertical ? CANVAS_PADDING : mainCursor + mainSize / 2,
					headerY: vertical ? mainCursor - 12 : 27,
					headerAnchor: vertical ? "start" : "middle",
					band: vertical ? {
						x: CANVAS_PADDING / 2,
						y: mainCursor - 9,
						width: Math.max(0, width - CANVAS_PADDING),
						height: mainSize + 18
					} : {
						x: mainCursor - 11,
						y: crossStart - 9,
						width: mainSize + 22,
						height: Math.max(0, crossTrack + 18)
					}
				});
				mainCursor += mainSize + mainGap;
			});
			const contentEnd = crossStart + crossTrack;
			const feedbackLanes = new Map(plan.feedback.map((edgeId, index) => [edgeId, contentEnd + LANE_GAP + Math.min(index, 2) * LANE_STEP]));
			return finish({
				width: Math.round(width),
				height: Math.round(height),
				nodes: positioned,
				layers: bands,
				orientation: vertical ? "vertical" : "horizontal",
				showHeaders,
				layerIndex,
				feedbackLanes
			}, containerWidth);
		}
		/** Where a straight line towards `towards` leaves the border of `box`. */
		function boxAnchor(box, towards, inset = 0) {
			const dx = towards.x - box.x;
			const dy = towards.y - box.y;
			if (dx === 0 && dy === 0) return {
				x: box.x,
				y: box.y
			};
			const halfWidth = box.width / 2 + inset;
			const halfHeight = box.height / 2 + inset;
			const scale = Math.min(dx === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dx), dy === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dy));
			return {
				x: box.x + dx * scale,
				y: box.y + dy * scale
			};
		}
		//#endregion
		//#region src/client/visuals/layout/graph-edges.ts
		/** Positions along the curve to try, nearest the middle first. */
		const SLIDE = [
			.5,
			.42,
			.58,
			.34,
			.66
		];
		/** Then the same positions lifted off the curve, alternating sides. */
		const LIFT = [
			0,
			-16,
			16,
			-30,
			30
		];
		const NODE_CLEARANCE = 5;
		const LABEL_CLEARANCE = 4;
		/** Distance the arrowhead needs between the curve's end and the target box. */
		const ARROW_INSET = 6;
		const fixed = (value) => value.toFixed(1);
		function pointOnCurve({ p0, p1, p2, p3 }, t) {
			const u = 1 - t;
			const a = u * u * u;
			const b = 3 * u * u * t;
			const c = 3 * u * t * t;
			const d = t * t * t;
			return {
				x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
				y: a * p0.y + b * p1.y + c * p2.y + d * p3.y
			};
		}
		/** Unit normal of the curve at `t`, used to lift a label clear of its own line. */
		function normalOnCurve({ p0, p1, p2, p3 }, t) {
			const u = 1 - t;
			const x = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
			const y = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
			const length = Math.hypot(x, y);
			if (length === 0) return {
				x: 0,
				y: -1
			};
			return {
				x: -y / length,
				y: x / length
			};
		}
		function curvePath(curve) {
			const { p0, p1, p2, p3 } = curve;
			return `M${fixed(p0.x)},${fixed(p0.y)} C${fixed(p1.x)},${fixed(p1.y)} ${fixed(p2.x)},${fixed(p2.y)} ${fixed(p3.x)},${fixed(p3.y)}`;
		}
		/**
		* Control coordinate whose curve reaches `lane` at its midpoint.
		*
		* A cubic with both controls at L passes through `(a + b) / 8 + 0.75 · L`, so
		* putting the controls on the lane would leave the arc well short of it.
		*/
		function laneControl(a, b, lane) {
			return (lane - (a + b) / 8) / .75;
		}
		function feedbackCurve(from, to, lane, vertical) {
			if (vertical) {
				const p0 = {
					x: from.x + from.width / 2,
					y: from.y
				};
				const p3 = {
					x: to.x + to.width / 2 + ARROW_INSET,
					y: to.y
				};
				const control = laneControl(p0.x, p3.x, lane);
				return {
					p0,
					p1: {
						x: control,
						y: p0.y
					},
					p2: {
						x: control,
						y: p3.y
					},
					p3
				};
			}
			const p0 = {
				x: from.x,
				y: from.y + from.height / 2
			};
			const p3 = {
				x: to.x,
				y: to.y + to.height / 2 + ARROW_INSET
			};
			const control = laneControl(p0.y, p3.y, lane);
			return {
				p0,
				p1: {
					x: p0.x,
					y: control
				},
				p2: {
					x: p3.x,
					y: control
				},
				p3
			};
		}
		function flowCurve(from, to, orientation) {
			const p0 = boxAnchor(from, {
				x: to.x,
				y: to.y
			}, 1);
			const p3 = boxAnchor(to, {
				x: from.x,
				y: from.y
			}, ARROW_INSET);
			if (orientation === "horizontal") {
				const middle = (p0.x + p3.x) / 2;
				return {
					p0,
					p1: {
						x: middle,
						y: p0.y
					},
					p2: {
						x: middle,
						y: p3.y
					},
					p3
				};
			}
			if (orientation === "vertical") {
				const middle = (p0.y + p3.y) / 2;
				return {
					p0,
					p1: {
						x: p0.x,
						y: middle
					},
					p2: {
						x: p3.x,
						y: middle
					},
					p3
				};
			}
			return {
				p0,
				p1: {
					x: p0.x + (p3.x - p0.x) / 3,
					y: p0.y + (p3.y - p0.y) / 3
				},
				p2: {
					x: p0.x + (p3.x - p0.x) * 2 / 3,
					y: p0.y + (p3.y - p0.y) * 2 / 3
				},
				p3
			};
		}
		const boxRect = (box) => ({
			x1: box.x - box.width / 2,
			y1: box.y - box.height / 2,
			x2: box.x + box.width / 2,
			y2: box.y + box.height / 2
		});
		const chipRect = (center, box) => ({
			x1: center.x - box.width / 2,
			y1: center.y - box.height / 2,
			x2: center.x + box.width / 2,
			y2: center.y + box.height / 2
		});
		function overlapArea$1(a, b, margin) {
			const x = Math.min(a.x2 + margin, b.x2) - Math.max(a.x1 - margin, b.x1);
			const y = Math.min(a.y2 + margin, b.y2) - Math.max(a.y1 - margin, b.y1);
			return x <= 0 || y <= 0 ? 0 : x * y;
		}
		/** How far a chip at this position sticks out of the canvas. */
		function outsideCanvas(rect, layout) {
			return Math.max(0, -rect.x1) + Math.max(0, rect.x2 - layout.width) + Math.max(0, -rect.y1) + Math.max(0, rect.y2 - layout.height);
		}
		function placeLabel(curve, box, layout, nodes, placed) {
			let fallback;
			for (const lift of LIFT) for (const slide of SLIDE) {
				const base = pointOnCurve(curve, slide);
				const normal = lift === 0 ? {
					x: 0,
					y: 0
				} : normalOnCurve(curve, slide);
				const point = {
					x: base.x + normal.x * lift,
					y: base.y + normal.y * lift
				};
				const rect = chipRect(point, box);
				let cost = outsideCanvas(rect, layout) * 4;
				for (const node of nodes) cost += overlapArea$1(rect, node, NODE_CLEARANCE);
				for (const other of placed) cost += overlapArea$1(rect, other, LABEL_CLEARANCE);
				if (cost === 0) return {
					...box,
					x: point.x,
					y: point.y,
					crowded: false
				};
				if (fallback === void 0 || cost < fallback.cost) fallback = {
					point,
					cost
				};
			}
			const point = fallback?.point ?? pointOnCurve(curve, .5);
			return {
				...box,
				x: point.x,
				y: point.y,
				crowded: true
			};
		}
		/**
		* Route every edge and place every label, in one pass so that each label knows
		* about the ones already placed.
		*/
		function edgeRoutes(content, layout) {
			const routes = /* @__PURE__ */ new Map();
			const nodes = [...layout.nodes.values()].map(boxRect);
			const placed = [];
			const vertical = layout.orientation === "vertical";
			for (const edge of content.edges) {
				const from = layout.nodes.get(edge.from);
				const to = layout.nodes.get(edge.to);
				if (from === void 0 || to === void 0) continue;
				const lane = layout.feedbackLanes.get(edge.id);
				const curve = lane === void 0 ? flowCurve(from, to, layout.orientation) : feedbackCurve(from, to, lane, vertical);
				const route = {
					path: curvePath(curve),
					end: curve.p3
				};
				if (edge.label !== void 0) {
					const label = placeLabel(curve, edgeLabelBox(edge.label), layout, nodes, placed);
					route.label = label;
					if (!label.crowded) placed.push(chipRect({
						x: label.x,
						y: label.y
					}, label));
				}
				routes.set(edge.id, route);
			}
			return routes;
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/graph.module.css.mjs
		const css$10 = ".HtX4sa_graphSvg{touch-action:pan-y;max-width:none;display:block;overflow:visible}.HtX4sa_layerBand rect{fill:color-mix(in srgb, var(--lx-label-primary) 6%, var(--lx-surface-base));stroke:color-mix(in srgb, var(--lx-border-default) 82%, transparent);stroke-width:1px;vector-effect:non-scaling-stroke}.HtX4sa_layerLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-strong);letter-spacing:.02em;opacity:var(--lx-vs-alpha)}.HtX4sa_edgeGroup,.HtX4sa_nodeGroup{cursor:pointer}.HtX4sa_edgeVisible{fill:none;stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:calc(1.7px + var(--lx-vs-ring) * 1.1px);stroke-linecap:round;vector-effect:non-scaling-stroke;transition:stroke-opacity var(--lx-motion-base) var(--lx-easing), stroke-width var(--lx-motion-base) var(--lx-easing)}.HtX4sa_edgeHit{fill:none;stroke:#0000;stroke-width:14px;pointer-events:stroke;vector-effect:non-scaling-stroke}.HtX4sa_edgeGroup:hover .HtX4sa_edgeVisible,.HtX4sa_edgeGroup:focus-visible .HtX4sa_edgeVisible,.HtX4sa_edgeGroup[data-selected] .HtX4sa_edgeVisible,.HtX4sa_edgeGroup[data-connected] .HtX4sa_edgeVisible{stroke-opacity:1;stroke-width:3px;filter:drop-shadow(0 0 3px var(--visual-tone))}.HtX4sa_edgeGroup[data-dimmed] .HtX4sa_edgeVisible{stroke:color-mix(in srgb, var(--lx-border-strong) 72%, var(--lx-surface-base));stroke-width:1.2px}.HtX4sa_edgeGroup[data-dimmed] .HtX4sa_edgeLabel{visibility:hidden}.HtX4sa_edgeGroup[data-connected] .HtX4sa_edgeLabel,.HtX4sa_edgeGroup[data-selected] .HtX4sa_edgeLabel{opacity:1}.HtX4sa_arrowMarker path{fill:var(--visual-tone);fill-opacity:var(--lx-vs-alpha)}.HtX4sa_edgeLabel rect{fill:var(--lx-surface-base);stroke:color-mix(in srgb, var(--visual-tone) 26%, var(--lx-border-subtle));stroke-width:1px;vector-effect:non-scaling-stroke;opacity:var(--lx-vs-alpha)}.HtX4sa_edgeLabel text{fill:var(--lx-label-primary);font-weight:var(--lx-weight-medium);opacity:var(--lx-vs-alpha)}.HtX4sa_edgeLabel{pointer-events:none;transition:opacity var(--lx-motion-fast) var(--lx-easing)}.HtX4sa_edgeTooltip{pointer-events:none;opacity:0;visibility:hidden;transition:opacity var(--lx-motion-fast) var(--lx-easing)}.HtX4sa_edgeTooltip rect{fill:var(--lx-surface-base);stroke:var(--visual-tone);stroke-width:1.2px;vector-effect:non-scaling-stroke}.HtX4sa_edgeTooltip text{fill:var(--lx-label-primary);font-weight:var(--lx-weight-medium)}.HtX4sa_graphSvg[data-dense-edges] .HtX4sa_edgeLabel,.HtX4sa_edgeGroup[data-crowded] .HtX4sa_edgeLabel{opacity:0}.HtX4sa_graphSvg[data-dense-edges] .HtX4sa_edgeGroup:hover .HtX4sa_edgeTooltip,.HtX4sa_graphSvg[data-dense-edges] .HtX4sa_edgeGroup:focus-visible .HtX4sa_edgeTooltip{opacity:1;visibility:visible}.HtX4sa_edgeGroup[data-crowded]:hover .HtX4sa_edgeLabel,.HtX4sa_edgeGroup[data-crowded]:focus-visible .HtX4sa_edgeLabel,.HtX4sa_edgeGroup[data-crowded][data-selected] .HtX4sa_edgeLabel,.HtX4sa_edgeGroup[data-crowded][data-visual-state=current] .HtX4sa_edgeLabel{opacity:1}.HtX4sa_nodeShape{fill:color-mix(in srgb, var(--visual-tone) 12%, var(--lx-surface-base));fill-opacity:var(--lx-vs-alpha);stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:calc(1.6px + var(--lx-vs-ring) * 1.2px);vector-effect:non-scaling-stroke;transition:fill-opacity var(--lx-motion-base) var(--lx-easing), stroke-opacity var(--lx-motion-base) var(--lx-easing), stroke-width var(--lx-motion-base) var(--lx-easing)}.HtX4sa_nodeRing{fill:none;stroke:var(--visual-tone);stroke-width:2px;stroke-opacity:calc(var(--lx-vs-ring) * .34);vector-effect:non-scaling-stroke;transition:stroke-opacity var(--lx-motion-base) var(--lx-easing)}.HtX4sa_nodeLabel{fill:var(--lx-label-primary);font-weight:var(--lx-weight-medium);opacity:var(--lx-vs-alpha);pointer-events:none}.HtX4sa_nodeGroup[data-visual-state=current] .HtX4sa_nodeLabel,.HtX4sa_nodeGroup[data-visual-state=selected] .HtX4sa_nodeLabel{font-weight:var(--lx-weight-strong)}.HtX4sa_nodeGroup:hover .HtX4sa_nodeShape,.HtX4sa_nodeGroup:focus-visible .HtX4sa_nodeShape,.HtX4sa_nodeGroup[data-selected] .HtX4sa_nodeShape{fill:color-mix(in srgb, var(--visual-tone) 22%, var(--lx-surface-base));fill-opacity:1;stroke-opacity:1;stroke-width:2.6px}.HtX4sa_nodeGroup[data-selected] .HtX4sa_nodeRing{stroke-opacity:.5}[data-stroke=dashed] .HtX4sa_edgeVisible{stroke-dasharray:9 6}[data-stroke=dotted] .HtX4sa_edgeVisible{stroke-dasharray:2 6}@media (prefers-reduced-motion:reduce){.HtX4sa_edgeVisible,.HtX4sa_edgeLabel,.HtX4sa_nodeShape,.HtX4sa_nodeRing{transition:none}}@media (forced-colors:active){.HtX4sa_nodeShape{fill:canvas;stroke:canvastext}.HtX4sa_edgeVisible{stroke:canvastext}.HtX4sa_nodeGroup[data-visual-state=current] .HtX4sa_nodeShape,.HtX4sa_nodeGroup[data-selected] .HtX4sa_nodeShape{fill:highlight}}";
		const tagId$10 = "@dsh-portable/interactive-learning/graph.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$10) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$10;
			tag.textContent = css$10;
			document.head.appendChild(tag);
		}
		var graph_module_css_default = {
			"arrowMarker": "HtX4sa_arrowMarker",
			"edgeGroup": "HtX4sa_edgeGroup",
			"edgeHit": "HtX4sa_edgeHit",
			"edgeLabel": "HtX4sa_edgeLabel",
			"edgeTooltip": "HtX4sa_edgeTooltip",
			"edgeVisible": "HtX4sa_edgeVisible",
			"graphSvg": "HtX4sa_graphSvg",
			"layerBand": "HtX4sa_layerBand",
			"layerLabel": "HtX4sa_layerLabel",
			"nodeGroup": "HtX4sa_nodeGroup",
			"nodeLabel": "HtX4sa_nodeLabel",
			"nodeRing": "HtX4sa_nodeRing",
			"nodeShape": "HtX4sa_nodeShape"
		};
		//#endregion
		//#region src/client/visuals/renderers/NodeLinkRenderer.tsx
		/**
		* `node_link`: topologies, trees, dependency and process graphs.
		*
		* Three things changed relative to the first implementation, all of them
		* visible in the five-node decision tree that prompted them.
		*
		* 1. Geometry comes from the content (see `layout/graph-layout.ts`) instead of
		*    a fixed 560×390 canvas with 29px circles, so a small tree is compact and a
		*    long Chinese label gets a box that fits it.
		* 2. Emphasis is ranked (see `state/graph-state.ts`) instead of binary, and is
		*    applied once per mark, so the branch a frame is not about stays readable
		*    rather than being drawn at a tenth of full strength.
		* 3. The layer headings, edge labels and node labels are real type at 12–13px,
		*    not 10px furniture.
		*
		* Edges are routed and their labels placed in `layout/graph-edges.ts`, which
		* owns the return lane a backwards edge takes and the search that keeps a chip
		* off the node boxes and off the other chips.
		*/
		/** Above this, drawing every edge label at once turns the figure into noise. */
		const DENSE_EDGE_COUNT = 12;
		const NODE_LINE_HEIGHT = 17;
		function NodeLinkRenderer({ content, focus }) {
			const labels = useVisualLabels();
			const id = (0, react.useId)();
			const [viewportRef, containerWidth] = useContainerWidth();
			const layout = (0, react.useMemo)(() => graphLayout(content, containerWidth), [containerWidth, content]);
			const routes = (0, react.useMemo)(() => edgeRoutes(content, layout), [content, layout]);
			const emphasis = (0, react.useMemo)(() => graphEmphasis(content, focus), [content, focus]);
			const [selected, setSelected] = (0, react.useState)();
			const [hoveredNodeId, setHoveredNodeId] = (0, react.useState)();
			const nodeById = (0, react.useMemo)(() => new Map(content.nodes.map((node) => [node.id, node])), [content.nodes]);
			const selectNode = (node, tone) => setSelected({
				id: node.id,
				label: node.label,
				detail: node.detail,
				kind: "node",
				tone: toneAt(tone)
			});
			const selectEdge = (edge, tone) => setSelected({
				id: edge.id,
				label: edge.label ?? `${nodeById.get(edge.from)?.label ?? edge.from} → ${nodeById.get(edge.to)?.label ?? edge.to}`,
				detail: edge.detail,
				kind: "edge",
				tone: toneAt(tone)
			});
			const summary = labelTemplate(labels.nodeLinkSummary, {
				nodes: content.nodes.length,
				edges: content.edges.length
			});
			const roving = useRovingFocus((0, react.useMemo)(() => [...content.nodes.map((node) => node.id), ...content.edges.map((edge) => edge.id)], [content.edges, content.nodes]));
			const denseEdges = content.edges.length > DENSE_EDGE_COUNT;
			const legendStates = (0, react.useMemo)(() => emphasis.active ? [...new Set([...content.nodes, ...content.edges].map((item) => emphasis.state(item.id)))] : [], [
				content.edges,
				content.nodes,
				emphasis
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FigureViewport, {
						viewportRef,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							ref: roving.containerRef,
							className: graph_module_css_default.graphSvg,
							width: layout.renderWidth,
							height: layout.renderHeight,
							viewBox: `0 0 ${layout.width} ${layout.height}`,
							role: "group",
							"aria-label": summary,
							"data-dense-edges": denseEdges || void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: DEFAULT_TONES.map((tone) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
									id: `${id}-arrow-${tone}`,
									className: graph_module_css_default.arrowMarker,
									"data-tone": tone,
									markerWidth: "7",
									markerHeight: "7",
									refX: "6",
									refY: "3.5",
									orient: "auto",
									markerUnits: "strokeWidth",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0,0 L7,3.5 L0,7 z" })
								}, tone)) }),
								!layout.showHeaders ? null : layout.layers.map((layer, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
									className: graph_module_css_default.layerBand,
									"data-visual-id": layer.id,
									"data-visual-state": emphasis.state(layer.id),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
										x: layer.band.x,
										y: layer.band.y,
										width: layer.band.width,
										height: layer.band.height,
										rx: "12"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: graph_module_css_default.layerLabel,
										x: layer.headerX,
										y: layer.headerY,
										textAnchor: layer.headerAnchor,
										dominantBaseline: "middle",
										children: layer.label ?? labelTemplate(labels.layerLabel, { index: index + 1 })
									})]
								}, layer.id)),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: content.edges.map((edge, edgeIndex) => {
									const route = routes.get(edge.id);
									if (route === void 0) return null;
									const tone = toneAt(edge.tone, edgeIndex);
									const state = emphasis.state(edge.id);
									const label = route.label;
									const connection = labelTemplate(labels.connection, {
										from: nodeById.get(edge.from)?.label ?? edge.from,
										to: nodeById.get(edge.to)?.label ?? edge.to
									});
									const isConnected = hoveredNodeId !== void 0 && (edge.from === hoveredNodeId || edge.to === hoveredNodeId);
									const isDimmed = hoveredNodeId !== void 0 && !isConnected;
									const tooltipText = `${edge.label ?? connection}${edge.detail === void 0 ? "" : ` · ${edge.detail}`}`;
									const tooltipBox = edgeLabelBox(tooltipText);
									const tooltipAnchor = label === void 0 ? {
										x: ((layout.nodes.get(edge.from)?.x ?? 0) + (layout.nodes.get(edge.to)?.x ?? 0)) / 2,
										y: ((layout.nodes.get(edge.from)?.y ?? 0) + (layout.nodes.get(edge.to)?.y ?? 0)) / 2
									} : {
										x: label.x,
										y: label.y
									};
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: graph_module_css_default.edgeGroup,
										"data-tone": tone,
										"data-stroke": edge.stroke ?? "solid",
										"data-visual-state": selected?.id === edge.id ? "selected" : state,
										"data-selected": selected?.id === edge.id || void 0,
										"data-connected": isConnected || void 0,
										"data-dimmed": isDimmed || void 0,
										"data-visual-id": edge.id,
										"data-crowded": label?.crowded === true || void 0,
										role: "button",
										"aria-label": `${edge.label ?? labels.edgeKind}: ${labelTemplate(labels.connection, {
											from: nodeById.get(edge.from)?.label ?? edge.from,
											to: nodeById.get(edge.to)?.label ?? edge.to
										})}${edge.detail === void 0 ? "" : `. ${edge.detail}`}`,
										onClick: () => selectEdge(edge, tone),
										...roving.itemProps(edge.id, () => selectEdge(edge, tone)),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: tooltipText }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: graph_module_css_default.edgeVisible,
												d: route.path,
												markerEnd: edge.directed === true ? `url(#${id}-arrow-${tone})` : void 0
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: graph_module_css_default.edgeHit,
												d: route.path
											}),
											label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: graph_module_css_default.edgeLabel,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: label.x - label.width / 2,
													y: label.y - label.height / 2,
													width: label.width,
													height: label.height,
													rx: edgeLabelRadius(label)
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
													x: label.x,
													textAnchor: "middle",
													dominantBaseline: "middle",
													fontSize: 12,
													children: label.lines.map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
														x: label.x,
														y: label.y - (label.lines.length - 1) * 15 / 2 + lineIndex * 15,
														children: line
													}, line + String(lineIndex)))
												})]
											}),
											!denseEdges ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: graph_module_css_default.edgeTooltip,
												role: "tooltip",
												"aria-hidden": "true",
												transform: `translate(${tooltipAnchor.x} ${tooltipAnchor.y})`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: -tooltipBox.width / 2,
													y: -tooltipBox.height / 2,
													width: tooltipBox.width,
													height: tooltipBox.height,
													rx: edgeLabelRadius(tooltipBox)
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
													textAnchor: "middle",
													dominantBaseline: "middle",
													fontSize: 12,
													children: tooltipBox.lines.map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
														x: "0",
														y: -((tooltipBox.lines.length - 1) * 15) / 2 + lineIndex * 15,
														children: line
													}, line + String(lineIndex)))
												})]
											})
										]
									}, edge.id);
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: content.nodes.map((node, nodeIndex) => {
									const box = layout.nodes.get(node.id);
									if (box === void 0) return null;
									const tone = toneAt(node.tone, nodeIndex);
									const state = emphasis.state(node.id);
									const firstLineOffset = -((box.lines.length - 1) * NODE_LINE_HEIGHT) / 2;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: graph_module_css_default.nodeGroup,
										"data-tone": tone,
										"data-visual-state": selected?.id === node.id ? "selected" : state,
										"data-selected": selected?.id === node.id || void 0,
										"data-visual-id": node.id,
										role: "button",
										"aria-label": `${node.label}${node.detail === void 0 ? "" : `。${node.detail}`}`,
										transform: `translate(${box.x} ${box.y})`,
										onClick: () => selectNode(node, tone),
										...roving.itemProps(node.id, () => selectNode(node, tone)),
										onPointerEnter: () => setHoveredNodeId(node.id),
										onPointerLeave: () => setHoveredNodeId(void 0),
										onFocus: () => setHoveredNodeId(node.id),
										onBlur: () => setHoveredNodeId(void 0),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: graph_module_css_default.nodeRing,
												x: -box.width / 2 - 5,
												y: -box.height / 2 - 5,
												width: box.width + 10,
												height: box.height + 10,
												rx: box.cornerRadius + 5
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: graph_module_css_default.nodeShape,
												x: -box.width / 2,
												y: -box.height / 2,
												width: box.width,
												height: box.height,
												rx: box.cornerRadius
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: graph_module_css_default.nodeLabel,
												textAnchor: "middle",
												dominantBaseline: "middle",
												fontSize: 13,
												children: box.lines.map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
													x: "0",
													y: firstLineOffset + lineIndex * NODE_LINE_HEIGHT,
													children: line
												}, line + String(lineIndex)))
											}),
											!box.truncated ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: node.label })
										]
									}, node.id);
								}) })
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateLegend, { states: legendStates }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shell_module_css_default.srOnly,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: summary }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", { children: [content.nodes.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: node.detail === void 0 ? node.label : `${node.label}: ${node.detail}` }, node.id)), content.edges.map((edge) => {
							const connection = labelTemplate(labels.connection, {
								from: nodeById.get(edge.from)?.label ?? edge.from,
								to: nodeById.get(edge.to)?.label ?? edge.to
							});
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: edge.label === void 0 ? connection : `${connection}, ${edge.label}` }, edge.id);
						})] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
						hint: labels.nodeLinkInteractionHint,
						selected,
						kindLabel: selected?.kind === "edge" ? labels.edgeKind : labels.nodeKind,
						onClose: () => setSelected(void 0)
					})
				]
			});
		}
		//#endregion
		//#region src/client/visuals/layout/scene-labels.ts
		/** Small geometry helpers for labels that sit outside scene_2d shapes. */
		const LABEL_FONT_SIZE = 12;
		const LABEL_LINE_HEIGHT = 17;
		const LABEL_GAP = 12;
		const labelRect = (center, text) => {
			const width = measureText(text, LABEL_FONT_SIZE) + 8;
			const height = LABEL_LINE_HEIGHT;
			return {
				x1: center.x - width / 2,
				y1: center.y - height / 2,
				x2: center.x + width / 2,
				y2: center.y + height / 2
			};
		};
		function overlapArea(a, b) {
			return Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)) * Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
		}
		function outsideArea(rect, bounds) {
			return Math.max(0, bounds.left - rect.x1) + Math.max(0, rect.x2 - bounds.right) + Math.max(0, bounds.top - rect.y1) + Math.max(0, rect.y2 - bounds.bottom);
		}
		/**
		* Pick a polygon label position that has room around nearby geometry.
		*
		* The old fixed `centroid + 18px` rule only worked when the space below every
		* polygon was empty. Candidates are tried above and below the shape first,
		* then at the sides and finally inside it. A small overlap score keeps the
		* helper deterministic while allowing a tight scene to remain labelled.
		*/
		function polygonLabelAnchor(points, text, occupied, bounds) {
			if (points.length === 0) return {
				x: (bounds.left + bounds.right) / 2,
				y: (bounds.top + bounds.bottom) / 2
			};
			const minX = Math.min(...points.map((point) => point.x));
			const maxX = Math.max(...points.map((point) => point.x));
			const minY = Math.min(...points.map((point) => point.y));
			const maxY = Math.max(...points.map((point) => point.y));
			const center = points.reduce((total, point) => ({
				x: total.x + point.x / points.length,
				y: total.y + point.y / points.length
			}), {
				x: 0,
				y: 0
			});
			const halfLabelWidth = (measureText(text, LABEL_FONT_SIZE) + 8) / 2;
			const clampX = (x) => Math.max(bounds.left + halfLabelWidth, Math.min(bounds.right - halfLabelWidth, x));
			const candidates = [
				{
					x: clampX(center.x),
					y: maxY + LABEL_GAP + LABEL_LINE_HEIGHT / 2
				},
				{
					x: clampX(center.x),
					y: minY - LABEL_GAP - LABEL_LINE_HEIGHT / 2
				},
				{
					x: clampX(maxX + LABEL_GAP + halfLabelWidth),
					y: center.y
				},
				{
					x: clampX(minX - LABEL_GAP - halfLabelWidth),
					y: center.y
				},
				{
					x: clampX(center.x),
					y: center.y
				}
			];
			let best = candidates[candidates.length - 1];
			let bestScore = Number.POSITIVE_INFINITY;
			for (const candidate of candidates) {
				const rect = labelRect(candidate, text);
				const score = outsideArea(rect, bounds) * 100 + occupied.reduce((total, other) => total + overlapArea(rect, other), 0);
				if (score < bestScore) {
					best = candidate;
					bestScore = score;
					if (score === 0) break;
				}
			}
			return best;
		}
		//#endregion
		//#region src/client/visuals/renderers/Scene2DRenderer.tsx
		/** `scene_2d`: geometry, vectors, fields and annotated schematics on axes. */
		/**
		* Place a segment or arrow label clear of its own line.
		*
		* A flat vertical offset drops the label onto whatever else crosses the middle
		* of the figure — in a parallelogram construction the resultant's label, the
		* shape's label and a declared text anchor all landed on the same few pixels.
		* Offsetting along the segment's normal separates them by construction.
		*/
		function segmentLabelAnchor(x1, y1, x2, y2) {
			const length = Math.hypot(x2 - x1, y2 - y1) || 1;
			const normalX = -(y2 - y1) / length;
			const normalY = (x2 - x1) / length;
			const direction = normalY > 0 ? -1 : 1;
			return {
				x: (x1 + x2) / 2 + normalX * 13 * direction,
				y: (y1 + y2) / 2 + normalY * 13 * direction
			};
		}
		function midpointTicks(majorTicks, minimum, maximum) {
			return majorTicks.slice(1).map((value, index) => {
				return ((majorTicks[index] ?? value) + value) / 2;
			}).filter((value) => value > minimum && value < maximum);
		}
		function sceneLabelLines(text) {
			return text === void 0 ? [] : wrapLabel(text, {
				fontSize: 12,
				maxWidth: 136,
				maxLines: 2
			}).lines;
		}
		function sceneElementBounds(element, content, geometry) {
			const x = (value) => scaleX(value, content.xAxis, geometry);
			const y = (value) => scaleY(value, content.yAxis, geometry);
			if (element.type === "point") {
				const cx = x(element.x);
				const cy = y(element.y);
				const radius = element.size ?? 6;
				return {
					x1: cx - radius,
					y1: cy - radius,
					x2: cx + radius,
					y2: cy + radius
				};
			}
			if (element.type === "segment" || element.type === "arrow") {
				const x1 = x(element.x1);
				const y1 = y(element.y1);
				const x2 = x(element.x2);
				const y2 = y(element.y2);
				return {
					x1: Math.min(x1, x2) - 4,
					y1: Math.min(y1, y2) - 4,
					x2: Math.max(x1, x2) + 4,
					y2: Math.max(y1, y2) + 4
				};
			}
			if (element.type === "circle") {
				const cx = x(element.cx);
				const cy = y(element.cy);
				const rx = Math.abs(x(element.cx + element.r) - cx);
				const ry = Math.abs(y(element.cy + element.r) - cy);
				return {
					x1: cx - rx,
					y1: cy - ry,
					x2: cx + rx,
					y2: cy + ry
				};
			}
			if (element.type === "rect") {
				const x1 = x(element.x);
				const x2 = x(element.x + element.width);
				const y1 = y(element.y);
				const y2 = y(element.y + element.height);
				return {
					x1: Math.min(x1, x2),
					y1: Math.min(y1, y2),
					x2: Math.max(x1, x2),
					y2: Math.max(y1, y2)
				};
			}
			if (element.type === "polygon") {
				const points = element.points.map((point) => ({
					x: x(point.x),
					y: y(point.y)
				}));
				return {
					x1: Math.min(...points.map((point) => point.x)),
					y1: Math.min(...points.map((point) => point.y)),
					x2: Math.max(...points.map((point) => point.x)),
					y2: Math.max(...points.map((point) => point.y))
				};
			}
			if (element.type !== "label") return {
				x1: 0,
				y1: 0,
				x2: 0,
				y2: 0
			};
			const cx = x(element.x);
			const cy = y(element.y);
			const halfWidth = (measureText(element.text, 12) + 8) / 2;
			return {
				x1: cx - halfWidth,
				y1: cy - 9,
				x2: cx + halfWidth,
				y2: cy + 9
			};
		}
		function Scene2DRenderer({ content, focus }) {
			const labels = useVisualLabels();
			const id = (0, react.useId)();
			const [viewportRef, containerWidth] = useContainerWidth();
			const geometry = (0, react.useMemo)(() => chartGeometry(containerWidth), [containerWidth]);
			const [selected, setSelected] = (0, react.useState)();
			const xTicks = (0, react.useMemo)(() => ticks(content.xAxis.min, content.xAxis.max), [content.xAxis.max, content.xAxis.min]);
			const yTicks = (0, react.useMemo)(() => ticks(content.yAxis.min, content.yAxis.max), [content.yAxis.max, content.yAxis.min]);
			const xMinorTicks = (0, react.useMemo)(() => midpointTicks(xTicks, content.xAxis.min, content.xAxis.max), [
				content.xAxis.max,
				content.xAxis.min,
				xTicks
			]);
			const yMinorTicks = (0, react.useMemo)(() => midpointTicks(yTicks, content.yAxis.min, content.yAxis.max), [
				content.yAxis.max,
				content.yAxis.min,
				yTicks
			]);
			const elementBounds = (0, react.useMemo)(() => new Map(content.elements.map((element) => [element.id, sceneElementBounds(element, content, geometry)])), [content, geometry]);
			const zeroX = content.xAxis.min <= 0 && content.xAxis.max >= 0 ? scaleX(0, content.xAxis, geometry) : void 0;
			const zeroY = content.yAxis.min <= 0 && content.yAxis.max >= 0 ? scaleY(0, content.yAxis, geometry) : void 0;
			const roving = useRovingFocus((0, react.useMemo)(() => content.elements.map((element) => element.id), [content.elements]));
			const selectElement = (element, tone) => setSelected({
				id: element.id,
				label: element.type === "label" ? element.text : element.label ?? labelTemplate(labels.elementFallback, { id: element.id }),
				detail: element.detail,
				kind: "element",
				tone: toneAt(tone)
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FigureViewport, {
					viewportRef,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						ref: roving.containerRef,
						className: plot_module_css_default.sceneSvg,
						width: geometry.width,
						height: geometry.height,
						viewBox: `0 0 ${geometry.width} ${geometry.height}`,
						role: "group",
						"aria-label": labelTemplate(labels.sceneSummary, {
							elements: content.elements.length,
							labels: content.elements.map((element) => element.type === "label" ? element.text : element.label).filter(Boolean).join(", ")
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
								id: `${id}-scene-clip`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: geometry.left,
									y: geometry.top,
									width: geometry.plotWidth,
									height: geometry.plotHeight
								})
							}), DEFAULT_TONES.map((tone) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
								id: `${id}-scene-arrow-${tone}`,
								className: plot_module_css_default.arrowMarker,
								"data-tone": tone,
								markerWidth: "9",
								markerHeight: "9",
								refX: "8",
								refY: "4.5",
								orient: "auto",
								markerUnits: "strokeWidth",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0,0 L9,4.5 L0,9 z" })
							}, tone))] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								className: plot_module_css_default.plotFrame,
								x: geometry.left,
								y: geometry.top,
								width: geometry.plotWidth,
								height: geometry.plotHeight
							}),
							content.grid !== true ? null : yMinorTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								className: plot_module_css_default.minorGridLine,
								x1: geometry.left,
								x2: geometry.left + geometry.plotWidth,
								y1: scaleY(value, content.yAxis, geometry),
								y2: scaleY(value, content.yAxis, geometry)
							}, `my-${String(value)}`)),
							content.grid !== true ? null : xMinorTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								className: plot_module_css_default.minorGridLine,
								x1: scaleX(value, content.xAxis, geometry),
								x2: scaleX(value, content.xAxis, geometry),
								y1: geometry.top,
								y2: geometry.top + geometry.plotHeight
							}, `mx-${String(value)}`)),
							content.grid !== true ? null : yTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								className: plot_module_css_default.gridLine,
								x1: geometry.left,
								x2: geometry.left + geometry.plotWidth,
								y1: scaleY(value, content.yAxis, geometry),
								y2: scaleY(value, content.yAxis, geometry)
							}, `gy-${String(value)}`)),
							content.grid !== true ? null : xTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								className: plot_module_css_default.gridLine,
								x1: scaleX(value, content.xAxis, geometry),
								x2: scaleX(value, content.xAxis, geometry),
								y1: geometry.top,
								y2: geometry.top + geometry.plotHeight
							}, `gx-${String(value)}`)),
							zeroX === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								className: plot_module_css_default.zeroAxis,
								x1: zeroX,
								x2: zeroX,
								y1: geometry.top,
								y2: geometry.top + geometry.plotHeight
							}),
							zeroY === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
								className: plot_module_css_default.zeroAxis,
								x1: geometry.left,
								x2: geometry.left + geometry.plotWidth,
								y1: zeroY,
								y2: zeroY
							}),
							zeroX === void 0 || zeroY === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
								className: plot_module_css_default.originMarker,
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
									cx: zeroX,
									cy: zeroY,
									r: "3.5"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
									x: zeroX + 7,
									y: zeroY - 7,
									children: "O"
								})]
							}),
							yTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: plot_module_css_default.tickLabel,
								x: geometry.left - 9,
								y: scaleY(value, content.yAxis, geometry),
								textAnchor: "end",
								dominantBaseline: "middle",
								children: formatNumber(value)
							}, `yt-${String(value)}`)),
							xTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: plot_module_css_default.tickLabel,
								x: scaleX(value, content.xAxis, geometry),
								y: geometry.top + geometry.plotHeight + 19,
								textAnchor: "middle",
								children: formatNumber(value)
							}, `xt-${String(value)}`)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
								clipPath: `url(#${id}-scene-clip)`,
								children: content.elements.map((element, index) => {
									const tone = toneAt(element.tone, index);
									const common = {
										className: plot_module_css_default.sceneElement,
										"data-tone": tone,
										"data-visual-state": selected?.id === element.id ? "selected" : elementState(element.id, focus),
										"data-selected": selected?.id === element.id || void 0,
										"data-visual-id": element.id,
										"data-element-type": element.type,
										role: "button",
										"aria-label": `${element.type === "label" ? element.text : element.label ?? element.type}${element.detail === void 0 ? "" : `。${element.detail}`}`,
										onClick: () => selectElement(element, tone),
										...roving.itemProps(element.id, () => selectElement(element, tone))
									};
									if (element.type === "point") {
										const x = scaleX(element.x, content.xAxis, geometry);
										const y = scaleY(element.y, content.yAxis, geometry);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											...common,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
												className: plot_module_css_default.scenePoint,
												cx: x,
												cy: y,
												r: element.size ?? 6
											}), element.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: plot_module_css_default.shapeLabel,
												x: x + 10,
												y: y - 10,
												children: sceneLabelLines(element.label).map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
													x: x + 10,
													dy: lineIndex === 0 ? "0" : "1.1em",
													children: line
												}, lineIndex))
											})]
										}, element.id);
									}
									if (element.type === "segment" || element.type === "arrow") {
										const x1 = scaleX(element.x1, content.xAxis, geometry);
										const y1 = scaleY(element.y1, content.yAxis, geometry);
										const x2 = scaleX(element.x2, content.xAxis, geometry);
										const y2 = scaleY(element.y2, content.yAxis, geometry);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											...common,
											"data-stroke": element.stroke ?? "solid",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
													className: plot_module_css_default.sceneLine,
													x1,
													y1,
													x2,
													y2,
													markerEnd: element.type === "arrow" ? `url(#${id}-scene-arrow-${tone})` : void 0
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
													className: plot_module_css_default.sceneHit,
													x1,
													y1,
													x2,
													y2
												}),
												element.label === void 0 ? null : (() => {
													const anchor = segmentLabelAnchor(x1, y1, x2, y2);
													return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
														className: plot_module_css_default.shapeLabel,
														x: anchor.x,
														y: anchor.y,
														textAnchor: "middle",
														dominantBaseline: "middle",
														children: sceneLabelLines(element.label).map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
															x: anchor.x,
															dy: lineIndex === 0 ? sceneLabelLines(element.label).length > 1 ? "-0.55em" : "0.34em" : "1.1em",
															children: line
														}, lineIndex))
													});
												})()
											]
										}, element.id);
									}
									if (element.type === "circle") {
										const cx = scaleX(element.cx, content.xAxis, geometry);
										const cy = scaleY(element.cy, content.yAxis, geometry);
										const rx = Math.abs(scaleX(element.cx + element.r, content.xAxis, geometry) - cx);
										const ry = Math.abs(scaleY(element.cy + element.r, content.yAxis, geometry) - cy);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											...common,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
												className: plot_module_css_default.sceneShape,
												cx,
												cy,
												rx,
												ry
											}), element.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: plot_module_css_default.shapeLabel,
												x: cx,
												y: cy,
												textAnchor: "middle",
												dominantBaseline: "middle",
												children: sceneLabelLines(element.label).map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
													x: cx,
													dy: lineIndex === 0 ? sceneLabelLines(element.label).length > 1 ? "-0.55em" : "0.34em" : "1.1em",
													children: line
												}, lineIndex))
											})]
										}, element.id);
									}
									if (element.type === "rect") {
										const x = scaleX(element.x, content.xAxis, geometry);
										const y = scaleY(element.y + element.height, content.yAxis, geometry);
										const width = Math.abs(scaleX(element.x + element.width, content.xAxis, geometry) - x);
										const height = Math.abs(scaleY(element.y, content.yAxis, geometry) - y);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											...common,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: plot_module_css_default.sceneShape,
												x,
												y,
												width,
												height,
												rx: "3"
											}), element.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: plot_module_css_default.shapeLabel,
												x: x + width / 2,
												y: y + height / 2,
												textAnchor: "middle",
												dominantBaseline: "middle",
												children: sceneLabelLines(element.label).map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
													x: x + width / 2,
													dy: lineIndex === 0 ? sceneLabelLines(element.label).length > 1 ? "-0.55em" : "0.34em" : "1.1em",
													children: line
												}, lineIndex))
											})]
										}, element.id);
									}
									if (element.type === "polygon") {
										const pixelPoints = element.points.map((point) => ({
											x: scaleX(point.x, content.xAxis, geometry),
											y: scaleY(point.y, content.yAxis, geometry)
										}));
										const points = pixelPoints.map((point) => `${point.x},${point.y}`).join(" ");
										const anchor = element.label === void 0 ? void 0 : polygonLabelAnchor(pixelPoints, element.label, content.elements.filter((other) => other.id !== element.id).map((other) => elementBounds.get(other.id)).filter((bounds) => bounds !== void 0), {
											left: geometry.left,
											right: geometry.left + geometry.plotWidth,
											top: geometry.top,
											bottom: geometry.top + geometry.plotHeight
										});
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											...common,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("polygon", {
												className: plot_module_css_default.sceneShape,
												points
											}), anchor === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: plot_module_css_default.shapeLabel,
												x: anchor.x,
												y: anchor.y,
												textAnchor: "middle",
												dominantBaseline: "middle",
												children: sceneLabelLines(element.label).map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
													x: anchor.x,
													dy: lineIndex === 0 ? sceneLabelLines(element.label).length > 1 ? "-0.55em" : "0.34em" : "1.1em",
													children: line
												}, lineIndex))
											})]
										}, element.id);
									}
									if (element.type === "label") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
										...common,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
											className: plot_module_css_default.sceneText,
											x: scaleX(element.x, content.xAxis, geometry),
											y: scaleY(element.y, content.yAxis, geometry),
											textAnchor: "middle",
											dominantBaseline: "middle",
											children: element.text
										})
									}, element.id);
									return null;
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: plot_module_css_default.axisLabel,
								x: geometry.left + geometry.plotWidth / 2,
								y: geometry.height - 6,
								textAnchor: "middle",
								children: content.xAxis.label ?? "x"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: plot_module_css_default.axisLabel,
								x: "14",
								y: geometry.top + geometry.plotHeight / 2,
								textAnchor: "middle",
								transform: `rotate(-90 14 ${geometry.top + geometry.plotHeight / 2})`,
								children: content.yAxis.label ?? "y"
							})
						]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
					hint: labels.sceneInteractionHint,
					selected,
					kindLabel: labels.elementKind,
					onClose: () => setSelected(void 0)
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/relation.module.css.mjs
		const css$9 = ".f7pT7W_tableViewport{padding:var(--lx-space-2xs)}.f7pT7W_relationTable{border-spacing:0;border-collapse:separate;table-layout:fixed;width:100%;min-width:460px;color:var(--lx-label-primary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs)}.f7pT7W_relationTable th,.f7pT7W_relationTable td{border-right:1px solid var(--lx-border-subtle);border-bottom:1px solid var(--lx-border-subtle);padding:var(--lx-space-sm) var(--lx-space-md);text-align:center;overflow-wrap:anywhere}.f7pT7W_relationTable tr>:last-child{border-right:0}.f7pT7W_relationTable tbody tr:last-child>*{border-bottom:0}.f7pT7W_relationTable thead th{background:color-mix(in srgb, var(--lx-accent-soft) 30%, transparent);color:var(--lx-label-primary);font-size:var(--lx-text-sm);font-weight:var(--lx-weight-strong)}.f7pT7W_relationTable thead th:first-child,.f7pT7W_relationTable tbody th{width:24%}.f7pT7W_relationTable tbody th{background:var(--lx-surface-sunken);color:var(--lx-label-primary);text-align:left;font-weight:var(--lx-weight-medium)}.f7pT7W_relationTable td{color:var(--lx-label-secondary)}.f7pT7W_relationTable td[data-tone]{color:var(--visual-tone);font-weight:var(--lx-weight-medium);background:color-mix(in srgb, var(--visual-tone) 7%, transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--visual-tone) 10%, transparent)}.f7pT7W_relationTable th[data-visual-state],.f7pT7W_relationTable tr[data-visual-state]>*{opacity:var(--lx-vs-alpha)}.f7pT7W_relationTable th[data-visual-state=current]{box-shadow:inset 0 -3px 0 var(--lx-accent)}.f7pT7W_relationTable tr[data-visual-state=current]>th{box-shadow:inset 3px 0 0 var(--lx-accent)}.f7pT7W_cellButton{appearance:none;border-radius:var(--lx-radius-xs);max-width:100%;padding:var(--lx-space-3xs) var(--lx-space-xs);color:inherit;font:inherit;line-height:inherit;overflow-wrap:anywhere;cursor:pointer;background:0 0;border:1px solid #0000}.f7pT7W_cellButton:hover{border-color:var(--lx-border-default);background:color-mix(in srgb, var(--lx-accent) 8%, transparent)}.f7pT7W_cellButton:active{background:color-mix(in srgb, var(--lx-accent) 14%, transparent)}.f7pT7W_matrixTable td{padding:var(--lx-space-xs)}.f7pT7W_matrixCell{appearance:none;border:1px solid color-mix(in srgb, var(--visual-tone) 28%, var(--lx-border-subtle));border-radius:var(--lx-radius-sm);width:100%;min-height:38px;padding:var(--lx-space-2xs) var(--lx-space-xs);background:color-mix(in srgb, var(--visual-tone) 10%, transparent);color:var(--visual-tone);font:inherit;font-size:var(--lx-text-2xs);opacity:var(--lx-vs-alpha);cursor:pointer}.f7pT7W_matrixCell:hover{border-color:var(--visual-tone);background:color-mix(in srgb, var(--visual-tone) 18%, transparent)}.f7pT7W_matrixCell[data-visual-state=current]{font-weight:var(--lx-weight-strong);border-width:2px}.f7pT7W_emptyCell{color:var(--lx-label-tertiary);font-size:var(--lx-text-md)}.f7pT7W_setMap{gap:var(--lx-space-lg);display:grid}.f7pT7W_setZones{gap:var(--lx-space-md);grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));display:grid}.f7pT7W_setZone{border:1.5px solid color-mix(in srgb, var(--visual-tone) 50%, transparent);border-radius:var(--lx-radius-lg);min-width:0;padding:var(--lx-space-lg);background:color-mix(in srgb, var(--visual-tone) 7%, transparent);opacity:var(--lx-vs-alpha);position:relative}.f7pT7W_setZone[data-visual-state=current]{border-width:2px}.f7pT7W_setZone h4,.f7pT7W_intersections h4{align-items:center;gap:var(--lx-space-sm);margin:0 0 var(--lx-space-sm);color:var(--lx-label-primary);font-size:var(--lx-text-sm);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-sm);display:flex}.f7pT7W_setZone h4>span{border-radius:var(--lx-radius-circle);background:var(--visual-tone);flex:none;width:8px;height:8px}.f7pT7W_setZone>div{gap:var(--lx-space-xs);flex-wrap:wrap;align-content:flex-start;min-height:34px;display:flex}.f7pT7W_setItem{border-color:color-mix(in srgb, var(--visual-tone) 28%, var(--lx-border-subtle));border-radius:var(--lx-radius-pill);background:color-mix(in srgb, var(--visual-tone) 10%, var(--lx-surface-base));opacity:var(--lx-vs-alpha)}.f7pT7W_emptySet{color:var(--lx-label-tertiary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs);align-self:center}.f7pT7W_intersections{border:1px dashed var(--lx-border-strong);border-radius:var(--lx-radius-lg);padding:var(--lx-space-md)}.f7pT7W_intersections>div{gap:var(--lx-space-sm);grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));display:grid}.f7pT7W_intersectionItem{gap:var(--lx-space-3xs);padding:var(--lx-space-xs) var(--lx-space-sm);text-align:left;opacity:var(--lx-vs-alpha);justify-items:start;display:grid}.f7pT7W_intersectionItem strong{color:var(--lx-label-primary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs)}.f7pT7W_intersectionItem span{color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro)}.f7pT7W_vennContainer{padding:var(--lx-space-sm);border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-md);background:var(--lx-surface-sunken);justify-content:center;align-items:center;display:flex}.f7pT7W_vennSvg{width:100%;max-width:480px;height:auto;overflow:visible}.f7pT7W_vennCircle{fill:color-mix(in srgb, var(--visual-tone) 14%, transparent);stroke:var(--visual-tone);stroke-width:2px;mix-blend-mode:multiply;transition:fill var(--lx-motion-fast) var(--lx-easing), stroke-width var(--lx-motion-fast) var(--lx-easing)}[data-theme=dark] .f7pT7W_vennCircle{mix-blend-mode:screen;fill:color-mix(in srgb, var(--visual-tone) 20%, transparent)}.f7pT7W_vennLabel{fill:var(--visual-tone);font-size:var(--lx-text-xs);font-weight:var(--lx-weight-strong);letter-spacing:.02em}.f7pT7W_vennIntersectionLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-medium)}.f7pT7W_vennItems{pointer-events:none}.f7pT7W_vennItem{fill:var(--lx-label-primary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-medium)}.f7pT7W_vennOverflow{fill:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong)}@container f7pT7W_learning-visual-v4 (width<=560px){.f7pT7W_relationTable{min-width:420px}}";
		const tagId$9 = "@dsh-portable/interactive-learning/relation.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$9) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$9;
			tag.textContent = css$9;
			document.head.appendChild(tag);
		}
		var relation_module_css_default = {
			"cellButton": "f7pT7W_cellButton",
			"emptyCell": "f7pT7W_emptyCell",
			"emptySet": "f7pT7W_emptySet",
			"intersectionItem": "f7pT7W_intersectionItem",
			"intersections": "f7pT7W_intersections",
			"learning-visual-v4": "f7pT7W_learning-visual-v4",
			"matrixCell": "f7pT7W_matrixCell",
			"matrixTable": "f7pT7W_matrixTable",
			"relationTable": "f7pT7W_relationTable",
			"setItem": "f7pT7W_setItem",
			"setMap": "f7pT7W_setMap",
			"setZone": "f7pT7W_setZone",
			"setZones": "f7pT7W_setZones",
			"tableViewport": "f7pT7W_tableViewport",
			"vennCircle": "f7pT7W_vennCircle",
			"vennContainer": "f7pT7W_vennContainer",
			"vennIntersectionLabel": "f7pT7W_vennIntersectionLabel",
			"vennItem": "f7pT7W_vennItem",
			"vennItems": "f7pT7W_vennItems",
			"vennLabel": "f7pT7W_vennLabel",
			"vennOverflow": "f7pT7W_vennOverflow",
			"vennSvg": "f7pT7W_vennSvg"
		};
		//#endregion
		//#region src/client/visuals/renderers/RelationRenderer.tsx
		/** `relation`: comparison tables, pairwise matrices and set membership. */
		function RelationRenderer({ content, focus }) {
			const labels = useVisualLabels();
			const diagramId = (0, react.useId)();
			const [selected, setSelected] = (0, react.useState)();
			const close = () => setSelected(void 0);
			if (content.variant === "comparison") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: `${shell_module_css_default.viewport} ${relation_module_css_default.tableViewport}`,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: relation_module_css_default.relationTable,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("caption", {
								className: shell_module_css_default.srOnly,
								children: labels.comparisonCaption
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								children: labels.comparisonDimension
							}), content.subjects.map((subject) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								"data-tone": toneAt(subject.tone),
								"data-visual-state": elementState(subject.id, focus),
								"data-visual-id": subject.id,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: relation_module_css_default.cellButton,
									onClick: () => setSelected({
										label: subject.label,
										detail: subject.detail,
										kind: labels.comparisonSubject
									}),
									children: subject.label
								})
							}, subject.id))] }) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: content.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", {
								"data-visual-state": elementState(row.id, focus),
								"data-visual-id": row.id,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
									scope: "row",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: relation_module_css_default.cellButton,
										onClick: () => setSelected({
											label: row.label,
											detail: row.detail,
											kind: labels.comparisonDimension
										}),
										children: row.label
									})
								}), content.subjects.map((subject) => {
									const cell = row.cells.find((item) => item.subjectId === subject.id);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
										"data-tone": toneAt(cell?.tone),
										children: cell?.value ?? "—"
									}, subject.id);
								})]
							}, row.id)) })
						]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
					hint: labels.comparisonInteractionHint,
					selected,
					onClose: close
				})]
			});
			if (content.variant === "matrix") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: `${shell_module_css_default.viewport} ${relation_module_css_default.tableViewport}`,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
						className: `${relation_module_css_default.relationTable} ${relation_module_css_default.matrixTable}`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("caption", {
								className: shell_module_css_default.srOnly,
								children: labels.matrixCaption
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								children: labels.matrixAxes
							}), content.columns.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "col",
								"data-visual-state": elementState(column.id, focus),
								"data-visual-id": column.id,
								children: column.label
							}, column.id))] }) }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: content.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
								scope: "row",
								"data-visual-state": elementState(row.id, focus),
								"data-visual-id": row.id,
								children: row.label
							}), content.columns.map((column) => {
								const cell = content.cells.find((item) => item.rowId === row.id && item.columnId === column.id);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: cell === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: relation_module_css_default.emptyCell,
									"aria-label": labels.noRelation,
									children: "·"
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: relation_module_css_default.matrixCell,
									"data-tone": toneAt(cell.tone),
									"data-visual-state": elementState(cell.id, focus),
									"data-visual-id": cell.id,
									onClick: () => setSelected({
										label: cell.label,
										detail: cell.detail,
										kind: `${row.label} × ${column.label}`
									}),
									children: cell.label
								}) }, column.id);
							})] }, row.id)) })
						]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
					hint: labels.matrixInteractionHint,
					selected,
					onClose: close
				})]
			});
			const setById = new Map(content.sets.map((set) => [set.id, set]));
			const exclusiveItems = (setId) => content.items.filter((item) => item.setIds.length === 1 && item.setIds[0] === setId);
			const sharedItems = content.items.filter((item) => item.setIds.length !== 1);
			const isTwoSets = content.sets.length === 2;
			const setA = content.sets[0];
			const setB = content.sets[1];
			const vennItems = (items, x, keyPrefix) => {
				const visible = items.slice(0, 4);
				const lines = visible.flatMap((item) => wrapLabel(item.label, {
					fontSize: 10,
					maxWidth: 82,
					maxLines: 2
				}).lines.map((line, lineIndex) => ({
					item,
					line,
					lineIndex
				})));
				const overflow = items.length - visible.length;
				return [...lines.map(({ item, line, lineIndex }, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
					className: relation_module_css_default.vennItem,
					x,
					y: 68 + index * 17,
					textAnchor: "middle",
					children: line
				}, `${keyPrefix}-${item.id}-${String(lineIndex)}`)), overflow > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
					className: relation_module_css_default.vennOverflow,
					x,
					y: 68 + lines.length * 17,
					textAnchor: "middle",
					children: ["+", overflow]
				}, `${keyPrefix}-overflow`) : null];
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: relation_module_css_default.setMap,
					role: "group",
					"aria-label": labels.setsLabel,
					children: [
						!isTwoSets || !setA || !setB ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: relation_module_css_default.vennContainer,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
								className: relation_module_css_default.vennSvg,
								viewBox: "0 0 520 180",
								role: "img",
								"aria-label": labels.setsLabel,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("filter", {
										id: `${diagramId}-venn-glow`,
										x: "-20%",
										y: "-20%",
										width: "140%",
										height: "140%",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("feDropShadow", {
											dx: "0",
											dy: "2",
											stdDeviation: "4",
											floodOpacity: "0.12"
										})
									}) }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
										className: relation_module_css_default.vennCircle,
										"data-tone": toneAt(setA.tone, 0),
										cx: "195",
										cy: "90",
										r: "78",
										filter: `url(#${diagramId}-venn-glow)`
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
										className: relation_module_css_default.vennCircle,
										"data-tone": toneAt(setB.tone, 1),
										cx: "325",
										cy: "90",
										r: "78",
										filter: `url(#${diagramId}-venn-glow)`
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: relation_module_css_default.vennLabel,
										"data-tone": toneAt(setA.tone, 0),
										x: "195",
										y: "25",
										textAnchor: "middle",
										children: setA.label
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: relation_module_css_default.vennLabel,
										"data-tone": toneAt(setB.tone, 1),
										x: "325",
										y: "25",
										textAnchor: "middle",
										children: setB.label
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
										className: relation_module_css_default.vennIntersectionLabel,
										x: "260",
										y: "25",
										textAnchor: "middle",
										children: "∩"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: relation_module_css_default.vennItems,
										"aria-hidden": "true",
										children: [
											vennItems(exclusiveItems(setA.id), 157, "a"),
											vennItems(exclusiveItems(setB.id), 363, "b"),
											vennItems(sharedItems, 260, "shared")
										]
									})
								]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: relation_module_css_default.setZones,
							children: content.sets.map((set, setIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: relation_module_css_default.setZone,
								"data-tone": toneAt(set.tone, setIndex),
								"data-visual-state": elementState(set.id, focus),
								"data-visual-id": set.id,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("h4", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { "aria-hidden": "true" }), set.label] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [exclusiveItems(set.id).map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${shell_module_css_default.control} ${relation_module_css_default.setItem}`,
									"data-visual-state": elementState(item.id, focus),
									"data-visual-id": item.id,
									onClick: () => setSelected({
										label: item.label,
										detail: item.detail,
										kind: set.label
									}),
									children: item.label
								}, item.id)), exclusiveItems(set.id).length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: relation_module_css_default.emptySet,
									children: labels.noExclusiveItems
								}) : null] })]
							}, set.id))
						}),
						sharedItems.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: relation_module_css_default.intersections,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: labels.intersections }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: sharedItems.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${shell_module_css_default.control} ${relation_module_css_default.intersectionItem}`,
								"data-visual-state": elementState(item.id, focus),
								"data-visual-id": item.id,
								onClick: () => setSelected({
									label: item.label,
									detail: item.detail,
									kind: item.setIds.map((setId) => setById.get(setId)?.label ?? setId).join(" ∩ ") || labels.uncategorized
								}),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: item.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: item.setIds.map((setId) => setById.get(setId)?.label ?? setId).join(" ∩ ") || labels.uncategorized })]
							}, item.id)) })]
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
					hint: labels.setsInteractionHint,
					selected,
					onClose: close
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/timeline.module.css.mjs
		const css$8 = ".zYjJda_timelineCanvas{min-width:0;position:relative}.zYjJda_timelineAxis{border-radius:var(--lx-radius-pill);background:color-mix(in srgb, var(--lx-border-strong) 80%, var(--lx-accent));height:2.5px;position:absolute;left:66px;right:66px}.zYjJda_timelineAxis:after{border-top:5px solid #0000;border-bottom:5px solid #0000;border-left:8px solid var(--lx-border-strong);content:\"\";position:absolute;top:-4px;right:-2px}.zYjJda_timelineEra,.zYjJda_timelineEvent{appearance:none;border:1px solid color-mix(in srgb, var(--visual-tone) 42%, var(--lx-border-subtle));background:color-mix(in srgb, var(--visual-tone) 9%, var(--lx-surface-base));color:var(--lx-label-primary);font:inherit;opacity:var(--lx-vs-alpha);cursor:pointer;transition:border-color var(--lx-motion-fast) var(--lx-easing), background-color var(--lx-motion-fast) var(--lx-easing), transform var(--lx-motion-fast) var(--lx-easing), box-shadow var(--lx-motion-fast) var(--lx-easing)}.zYjJda_timelineEra{z-index:1;border-radius:var(--lx-radius-pill);min-height:26px;padding:var(--lx-space-3xs) var(--lx-space-md);color:var(--visual-tone);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-micro);text-overflow:ellipsis;white-space:nowrap;position:absolute;overflow:hidden;box-shadow:0 1px 3px #0000000d}.zYjJda_timelineEvent{z-index:2;box-sizing:border-box;gap:var(--lx-space-3xs);border-radius:var(--lx-radius-md);width:156px;min-height:64px;padding:var(--lx-space-xs) var(--lx-space-sm);text-align:left;box-shadow:var(--lx-shadow-sm);display:grid;position:absolute;transform:translate(-50%)}.zYjJda_timelineEvent:before{border:2.5px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--visual-tone);width:12px;height:12px;box-shadow:0 0 4px var(--visual-tone);content:\"\";position:absolute;left:calc(50% - 6px)}.zYjJda_timelineEvent:after{background:color-mix(in srgb, var(--visual-tone) 75%, transparent);content:\"\";width:1.5px;height:20px;position:absolute;left:50%}.zYjJda_timelineEvent[data-side=top]:before{bottom:-33px}.zYjJda_timelineEvent[data-side=top]:after{bottom:-21px}.zYjJda_timelineEvent[data-side=bottom]:before{top:-33px}.zYjJda_timelineEvent[data-side=bottom]:after{top:-21px}.zYjJda_timelineEvent>span{color:var(--visual-tone);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums;font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-micro)}.zYjJda_timelineEvent>strong{min-width:0;color:var(--lx-label-primary);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-medium);line-height:var(--lx-leading-2xs);overflow-wrap:anywhere;-webkit-line-clamp:3;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.zYjJda_timelineEra:hover,.zYjJda_timelineEvent:hover{border-color:var(--visual-tone);background:color-mix(in srgb, var(--visual-tone) 16%, var(--lx-surface-base))}.zYjJda_timelineEra[data-visual-state=current],.zYjJda_timelineEvent[data-visual-state=current]{border-color:var(--visual-tone);box-shadow:0 0 0 3px color-mix(in srgb, var(--visual-tone) 18%, transparent);border-width:2px}.zYjJda_timelineEraChips{gap:var(--lx-space-sm);flex-wrap:wrap;display:flex}.zYjJda_eraChip{border-color:color-mix(in srgb, var(--visual-tone) 42%, var(--lx-border-subtle));border-radius:var(--lx-radius-pill);padding:var(--lx-space-2xs) var(--lx-space-md);background:color-mix(in srgb, var(--visual-tone) 9%, var(--lx-surface-base));opacity:var(--lx-vs-alpha);text-align:left;justify-items:start;gap:0;display:inline-grid}.zYjJda_eraChip strong{color:var(--visual-tone);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-2xs)}.zYjJda_eraChip span{color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro)}.zYjJda_timelineVertical{padding:var(--lx-space-2xs) 0 var(--lx-space-2xs) var(--lx-space-md);gap:0;margin:0;list-style:none;display:grid}.zYjJda_timelineVertical li{border-left:2px solid color-mix(in srgb, var(--visual-tone) 46%, var(--lx-border-default));padding:0 0 var(--lx-space-lg) var(--lx-space-2xl);opacity:var(--lx-vs-alpha);position:relative}.zYjJda_timelineVertical li:last-child{padding-bottom:0}.zYjJda_timelineVertical li:before{border:2px solid var(--lx-surface-base);border-radius:var(--lx-radius-circle);background:var(--visual-tone);content:\"\";width:9px;height:9px;position:absolute;top:15px;left:-6px}.zYjJda_verticalEvent{gap:var(--lx-space-3xs) var(--lx-space-lg);border-radius:var(--lx-radius-md);width:min(100%,620px);padding:var(--lx-space-sm) var(--lx-space-md);text-align:left;grid-template-columns:minmax(72px,auto) minmax(0,1fr);display:grid}.zYjJda_verticalEvent>span{color:var(--visual-tone);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong)}.zYjJda_verticalEvent>strong{color:var(--lx-label-primary);font-size:var(--lx-text-xs);overflow-wrap:anywhere}.zYjJda_verticalEvent>small{color:var(--lx-label-secondary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs);grid-column:1/-1}.zYjJda_timelineVertical li[data-visual-state=current]{border-left-color:var(--visual-tone);border-left-width:3px}@media (prefers-reduced-motion:reduce){.zYjJda_timelineEra,.zYjJda_timelineEvent{transition:none}}";
		const tagId$8 = "@dsh-portable/interactive-learning/timeline.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		var timeline_module_css_default = {
			"eraChip": "zYjJda_eraChip",
			"timelineAxis": "zYjJda_timelineAxis",
			"timelineCanvas": "zYjJda_timelineCanvas",
			"timelineEra": "zYjJda_timelineEra",
			"timelineEraChips": "zYjJda_timelineEraChips",
			"timelineEvent": "zYjJda_timelineEvent",
			"timelineVertical": "zYjJda_timelineVertical",
			"verticalEvent": "zYjJda_verticalEvent"
		};
		//#endregion
		//#region src/client/visuals/renderers/TimelineRenderer.tsx
		/** `timeline`: chronologies, phases and eras, horizontal or vertical. */
		/** Vertical distance from the axis to the top of an upper-row event card. */
		const CARD_OFFSET = 86;
		/** Card width (156px) plus a small breathing room between neighbouring cards. */
		const MIN_EVENT_GAP = 172;
		const AXIS_INSET = 66;
		/** One non-overlapping horizontal lane per era (the protocol caps eras at 8). */
		function timelineEraTop(index) {
			return 14 + index * 28;
		}
		function timelinePosition(event, index, count) {
			if (event.position !== void 0) return Math.max(0, Math.min(1, event.position));
			return count <= 1 ? .5 : index / (count - 1);
		}
		/**
		* Resolve explicit positions that are too close to hold two event cards.
		*
		* The protocol's normalized positions are useful for showing long gaps, but
		* they can legitimately put several milestones in the same small interval.
		* Leaving those values untouched makes the fixed-width cards paint on top of
		* each other. We preserve the order and spread only colliding centres; the
		* canvas grows when the spread cannot fit, so the axis and era spans remain
		* honest and the viewport can scroll on a narrow surface.
		*/
		function timelineEventLayout(content, containerWidth) {
			const count = content.events.length;
			const minimumWidth = 132 + Math.max(0, count - 1) * MIN_EVENT_GAP;
			const baseWidth = Math.max(minimumWidth, Math.floor(containerWidth) - 2);
			if (count === 0) return {
				width: baseWidth,
				positions: []
			};
			const ordered = content.events.map((event, index) => AXIS_INSET + timelinePosition(event, index, count) * (baseWidth - 132)).map((position, index) => ({
				position,
				index
			})).sort((a, b) => a.position - b.position || a.index - b.index);
			const resolved = new Array(count);
			let previous = AXIS_INSET;
			for (const [orderIndex, item] of ordered.entries()) {
				const position = orderIndex === 0 ? Math.max(AXIS_INSET, item.position) : Math.max(item.position, previous + MIN_EVENT_GAP);
				resolved[item.index] = position;
				previous = position;
			}
			const width = baseWidth;
			const overflow = Math.max(0, previous - (width - AXIS_INSET));
			if (overflow > 0) for (let index = 0; index < resolved.length; index += 1) resolved[index] = Math.max(AXIS_INSET, (resolved[index] ?? AXIS_INSET) - overflow);
			return {
				width,
				positions: resolved.map((position) => position ?? AXIS_INSET)
			};
		}
		function TimelineRenderer({ content, focus }) {
			const labels = useVisualLabels();
			const [viewportRef, containerWidth] = useContainerWidth();
			const [selected, setSelected] = (0, react.useState)();
			const eras = content.eras ?? [];
			const eventIndex = (0, react.useMemo)(() => new Map(content.events.map((event, index) => [event.id, index])), [content.events]);
			const selectEvent = (event) => setSelected({
				label: `${event.time} · ${event.label}`,
				detail: event.detail,
				kind: labels.timelineEventKind
			});
			const selectEra = (era) => setSelected({
				label: era.label,
				detail: era.detail,
				kind: labels.timelineEraKind
			});
			if ((content.orientation ?? "horizontal") === "vertical" || containerWidth < 420) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				role: "group",
				"aria-label": labels.timelineLabel,
				children: [
					eras.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: timeline_module_css_default.timelineEraChips,
						role: "group",
						"aria-label": labels.timelineEraKind,
						children: eras.map((era, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${shell_module_css_default.control} ${timeline_module_css_default.eraChip}`,
							"data-tone": toneAt(era.tone, index),
							"data-visual-state": elementState(era.id, focus),
							"data-visual-id": era.id,
							onClick: () => selectEra(era),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: era.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
								content.events[eventIndex.get(era.startEventId) ?? 0]?.time,
								" – ",
								content.events[eventIndex.get(era.endEventId) ?? 0]?.time
							] })]
						}, era.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: timeline_module_css_default.timelineVertical,
						children: content.events.map((event, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							"data-tone": toneAt(event.tone, index),
							"data-visual-state": elementState(event.id, focus),
							"data-visual-id": event.id,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${shell_module_css_default.control} ${timeline_module_css_default.verticalEvent}`,
								title: event.label,
								onClick: () => selectEvent(event),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: event.time }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: event.label }),
									event.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: event.detail })
								]
							})
						}, event.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
						hint: labels.timelineInteractionHint,
						selected,
						onClose: () => setSelected(void 0)
					})
				]
			});
			const eventLayout = timelineEventLayout(content, containerWidth);
			const width = eventLayout.width;
			const eraRows = eras.length;
			const eraLaneBottom = eras.length === 0 ? 0 : 14 + (eraRows - 1) * 28 + 26;
			const axisY = Math.max(90, eraLaneBottom + 8 + CARD_OFFSET);
			const height = axisY + 130;
			const eventX = (_event, index) => eventLayout.positions[index] ?? AXIS_INSET;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				role: "group",
				"aria-label": labels.timelineLabel,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: shell_module_css_default.viewport,
					ref: viewportRef,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: timeline_module_css_default.timelineCanvas,
						style: {
							width,
							height
						},
						children: [
							eras.map((era, index) => {
								const startIndex = eventIndex.get(era.startEventId) ?? 0;
								const endIndex = eventIndex.get(era.endEventId) ?? startIndex;
								const start = eventX(content.events[startIndex], startIndex);
								const end = eventX(content.events[endIndex], endIndex);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: timeline_module_css_default.timelineEra,
									"data-tone": toneAt(era.tone, index),
									"data-visual-state": elementState(era.id, focus),
									"data-visual-id": era.id,
									style: {
										left: Math.min(start, end),
										top: timelineEraTop(index),
										width: Math.max(48, Math.abs(end - start))
									},
									onClick: () => selectEra(era),
									children: era.label
								}, era.id);
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: timeline_module_css_default.timelineAxis,
								style: { top: axisY },
								"aria-hidden": "true"
							}),
							content.events.map((event, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: timeline_module_css_default.timelineEvent,
								"data-tone": toneAt(event.tone, index),
								"data-side": index % 2 === 0 ? "top" : "bottom",
								"data-visual-state": elementState(event.id, focus),
								"data-visual-id": event.id,
								title: event.label,
								style: {
									left: eventX(event, index),
									top: index % 2 === 0 ? axisY - CARD_OFFSET : axisY + 24
								},
								onClick: () => selectEvent(event),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: event.time }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: event.label })]
							}, event.id))
						]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
					hint: labels.timelineInteractionHint,
					selected,
					onClose: () => setSelected(void 0)
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/formula.module.css.mjs
		const css$7 = "._8Y0KAW_formulaMeta{justify-content:space-between;align-items:center;gap:var(--lx-space-lg);min-width:0;color:var(--lx-accent);font-size:var(--lx-text-2xs);font-variant-numeric:tabular-nums;font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-2xs);display:flex}._8Y0KAW_formulaMeta code{border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-xs);padding:var(--lx-space-3xs) var(--lx-space-sm);background:var(--lx-surface-sunken);color:var(--lx-label-secondary);font-family:var(--lx-font-mono);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-regular);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._8Y0KAW_formulaSteps{gap:0;margin:0;padding:0;list-style:none;display:grid}._8Y0KAW_formulaSteps>li{min-width:0;opacity:var(--lx-vs-alpha)}._8Y0KAW_formulaStepCard{gap:var(--lx-space-md);border:1px solid color-mix(in srgb, var(--visual-tone) 32%, var(--lx-border-subtle));border-radius:var(--lx-radius-md);min-width:0;padding:var(--lx-space-md);background:color-mix(in srgb, var(--visual-tone) 7%, var(--lx-surface-base));grid-template-columns:30px minmax(0,1fr);align-items:start;display:grid;box-shadow:0 1px 3px #0000000a}._8Y0KAW_formulaSteps>li[data-visual-state=current] ._8Y0KAW_formulaStepCard{border-width:2px;border-color:var(--visual-tone);box-shadow:0 0 10px color-mix(in srgb, var(--visual-tone) 30%, transparent)}._8Y0KAW_formulaStepCard>span{border-radius:var(--lx-radius-circle);background:color-mix(in srgb, var(--visual-tone) 16%, var(--lx-surface-base));width:28px;height:28px;color:var(--visual-tone);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-strong);place-items:center;display:grid}._8Y0KAW_formulaStepCard>div{gap:var(--lx-space-2xs);min-width:0;display:grid}._8Y0KAW_formulaExpression{padding:var(--lx-space-sm) 0;color:var(--lx-label-primary);font-size:var(--lx-text-formula);font-weight:var(--lx-weight-medium);line-height:var(--lx-leading-formula);scrollbar-width:thin;overflow:auto hidden}._8Y0KAW_formulaExpression>div{min-width:max-content}._8Y0KAW_formulaExpression .katex-display{text-align:left;margin:2px 0}._8Y0KAW_formulaStepCard strong{color:var(--visual-tone);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs)}._8Y0KAW_formulaStepCard p{color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);margin:0}._8Y0KAW_formulaRule{gap:var(--lx-space-xs) var(--lx-space-md);border-left:2px solid color-mix(in srgb, var(--visual-tone) 32%, var(--lx-border-subtle));min-height:44px;padding:var(--lx-space-3xs) var(--lx-space-md);color:var(--lx-label-secondary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs);grid-template-columns:30px auto minmax(0,1fr);align-items:center;margin-left:14px;display:grid}._8Y0KAW_formulaRule>span:first-child{color:var(--visual-tone);font-size:var(--lx-text-lg);text-align:center}._8Y0KAW_formulaRule strong{color:var(--visual-tone);font-size:var(--lx-text-micro);letter-spacing:.04em;text-transform:uppercase}._8Y0KAW_formulaUnknown{gap:var(--lx-space-md);padding:var(--lx-space-3xs) var(--lx-space-md);color:var(--lx-label-tertiary);grid-template-columns:30px minmax(0,1fr);align-items:center;display:grid}._8Y0KAW_formulaUnknown>span:first-child{color:var(--visual-tone);font-size:var(--lx-text-lg);text-align:center}._8Y0KAW_formulaUnknown>span:last-child{border:1px dashed var(--lx-border-default);border-radius:var(--lx-radius-md);min-height:38px;padding:var(--lx-space-xs) var(--lx-space-md);color:var(--lx-label-tertiary);font-size:var(--lx-text-2xs);align-items:center;display:flex}._8Y0KAW_formulaConclusion{gap:var(--lx-space-3xs);border:1px solid var(--lx-border-subtle);border-left:3.5px solid var(--lx-success);border-radius:var(--lx-radius-md);padding:var(--lx-space-sm) var(--lx-space-md);background:color-mix(in srgb, var(--lx-success) 10%, var(--lx-surface-base));box-shadow:var(--lx-shadow-sm);display:grid}._8Y0KAW_formulaConclusion span{color:var(--lx-success);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);letter-spacing:var(--lx-tracking-eyebrow);text-transform:uppercase}._8Y0KAW_formulaConclusion strong{color:var(--lx-label-primary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-sm)}@container _8Y0KAW_learning-visual-v4 (width<=360px){._8Y0KAW_formulaStepCard{padding:var(--lx-space-sm);grid-template-columns:24px minmax(0,1fr)}._8Y0KAW_formulaStepCard>span{width:23px;height:23px}._8Y0KAW_formulaRule{grid-template-columns:24px minmax(0,1fr)}._8Y0KAW_formulaRule strong,._8Y0KAW_formulaRule>span:last-child{grid-column:2}}";
		const tagId$7 = "@dsh-portable/interactive-learning/formula.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		var formula_module_css_default = {
			"formulaConclusion": "_8Y0KAW_formulaConclusion",
			"formulaExpression": "_8Y0KAW_formulaExpression",
			"formulaMeta": "_8Y0KAW_formulaMeta",
			"formulaRule": "_8Y0KAW_formulaRule",
			"formulaStepCard": "_8Y0KAW_formulaStepCard",
			"formulaSteps": "_8Y0KAW_formulaSteps",
			"formulaUnknown": "_8Y0KAW_formulaUnknown",
			"learning-visual-v4": "_8Y0KAW_learning-visual-v4"
		};
		//#endregion
		//#region src/client/visuals/renderers/FormulaStepsRenderer.tsx
		/** `formula_steps`: a derivation revealed one justified transformation at a time. */
		function initialRevealedIndex(content, storageKey) {
			const lastIndex = content.steps.length - 1;
			if (storageKey === void 0 || typeof sessionStorage === "undefined") return 0;
			try {
				const stored = JSON.parse(sessionStorage.getItem(`dsh-learning/visual@4:formula:${storageKey}`) ?? "{}");
				return typeof stored.revealedIndex === "number" && Number.isInteger(stored.revealedIndex) ? Math.max(0, Math.min(lastIndex, stored.revealedIndex)) : 0;
			} catch {
				return 0;
			}
		}
		function FormulaStepsRenderer({ content, focus, storageKey }) {
			const labels = useVisualLabels();
			const [revealedIndex, setRevealedIndex] = (0, react.useState)(() => initialRevealedIndex(content, storageKey));
			const lastIndex = content.steps.length - 1;
			(0, react.useEffect)(() => {
				if (storageKey === void 0 || typeof sessionStorage === "undefined") return;
				try {
					sessionStorage.setItem(`dsh-learning/visual@4:formula:${storageKey}`, JSON.stringify({ revealedIndex }));
				} catch {}
			}, [revealedIndex, storageKey]);
			(0, react.useEffect)(() => {
				const focusedIndex = content.steps.findIndex((step) => focus.currentIds.has(step.id));
				if (focusedIndex >= 0) setRevealedIndex((current) => Math.max(current, focusedIndex));
			}, [content.steps, focus.currentIds]);
			const move = (delta) => setRevealedIndex((current) => Math.max(0, Math.min(lastIndex, current + delta)));
			const onKeyDown = (event) => {
				if (event.target !== event.currentTarget) return;
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					move(-1);
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					move(1);
				} else if (event.key === "Home") {
					event.preventDefault();
					setRevealedIndex(0);
				} else if (event.key === "End") {
					event.preventDefault();
					setRevealedIndex(lastIndex);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				role: "group",
				tabIndex: 0,
				onKeyDown,
				"aria-label": labels.formulaLabel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: formula_module_css_default.formulaMeta,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labelTemplate(labels.formulaProgress, {
							current: revealedIndex + 1,
							total: content.steps.length
						}) }), content.notation === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: content.notation })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: formula_module_css_default.formulaSteps,
						"aria-live": "polite",
						children: content.steps.slice(0, revealedIndex + 1).map((step, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							"data-tone": toneAt(step.tone, index),
							"data-visual-state": elementState(step.id, focus),
							"data-visual-id": step.id,
							children: [index === 0 || step.rule === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: formula_module_css_default.formulaRule,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										"aria-hidden": "true",
										children: "↓"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: labels.formulaRule }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: step.rule })
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: formula_module_css_default.formulaStepCard,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: index + 1 }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: formula_module_css_default.formulaExpression,
										"aria-label": step.expression,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: displayMath(step.expression) })
									}),
									step.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: step.label }),
									step.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: step.detail })
								] })]
							})]
						}, step.id))
					}),
					revealedIndex >= lastIndex ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: formula_module_css_default.formulaConclusion,
						"aria-live": "polite",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.formulaConclusion }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: content.conclusion ?? labels.formulaComplete })]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: formula_module_css_default.formulaUnknown,
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "↓" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.revealNextFormulaStep })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shell_module_css_default.controlRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => move(-1),
								disabled: revealedIndex === 0,
								children: labels.previousStep
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${shell_module_css_default.control} ${shell_module_css_default.controlPrimary}`,
								onClick: () => move(1),
								disabled: revealedIndex >= lastIndex,
								children: labels.revealNextFormulaStep
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => setRevealedIndex(0),
								disabled: revealedIndex === 0,
								children: labels.reset
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shell_module_css_default.selectionSlot,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: shell_module_css_default.interactionHint,
							children: labels.formulaInteractionHint
						})
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/study.module.css.mjs
		const css$6 = ".ApA5Lq_studySource{gap:var(--lx-space-3xs) var(--lx-space-md);border:1px solid var(--lx-border-subtle);border-left:3.5px solid var(--lx-accent);border-radius:var(--lx-radius-md);padding:var(--lx-space-sm) var(--lx-space-md);background:color-mix(in srgb, var(--lx-accent-soft) 22%, var(--lx-surface-base));grid-template-columns:auto minmax(0,1fr);align-items:baseline;display:grid}.ApA5Lq_studySource>span{color:var(--lx-accent);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);letter-spacing:var(--lx-tracking-eyebrow);text-transform:uppercase}.ApA5Lq_studySource>strong{color:var(--lx-label-primary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-sm)}.ApA5Lq_studySource>p{margin:var(--lx-space-3xs) 0 0;color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);grid-column:1/-1}.ApA5Lq_studySource>p b{margin-right:var(--lx-space-xs);color:var(--lx-label-primary);font-weight:var(--lx-weight-medium)}.ApA5Lq_studyDependencyMap{gap:var(--lx-space-xs);border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-md);min-width:0;padding:var(--lx-space-sm) var(--lx-space-md);background:var(--lx-surface-sunken);display:grid}.ApA5Lq_studyDependencyHeader{justify-content:space-between;gap:var(--lx-space-md);color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);letter-spacing:var(--lx-tracking-eyebrow);text-transform:uppercase;display:flex}.ApA5Lq_studyDependencyTrack{grid-template-columns:subgrid;gap:var(--lx-space-sm);grid-column:1/-1;min-width:0;display:grid}.ApA5Lq_studyDependencyLevel{gap:var(--lx-space-xs);align-content:start;min-width:0;display:grid;position:relative}.ApA5Lq_studyDependencyLevel:not(:last-child):after{top:50%;right:calc(var(--lx-space-sm) * -1);color:var(--lx-accent);content:\"→\";font-size:var(--lx-text-md);font-weight:var(--lx-weight-strong);position:absolute}.ApA5Lq_studyDependencyNode{border:1px solid color-mix(in srgb, var(--lx-accent) 26%, var(--lx-border-subtle));border-radius:var(--lx-radius-sm);min-width:0;padding:var(--lx-space-2xs) var(--lx-space-xs);background:color-mix(in srgb, var(--lx-accent-soft) 18%, var(--lx-surface-base));color:var(--lx-label-primary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro);overflow-wrap:anywhere}.ApA5Lq_studyDependencyNode[data-role=foundation]{border-color:color-mix(in srgb, var(--lx-success) 36%, var(--lx-border-subtle))}.ApA5Lq_studyDependencyNode[data-role=practice]{border-style:dashed}.ApA5Lq_studyLayout{gap:var(--lx-space-lg);grid-template-columns:minmax(160px,.32fr) minmax(0,1fr);min-width:0;display:grid}.ApA5Lq_studySections{gap:var(--lx-space-xs);flex-direction:column;min-width:0;display:flex}.ApA5Lq_sectionTab{gap:0 var(--lx-space-sm);min-width:0;padding:var(--lx-space-sm);text-align:left;opacity:var(--lx-vs-alpha);transition:background-color var(--lx-motion-fast) var(--lx-easing), border-color var(--lx-motion-fast) var(--lx-easing);grid-template-columns:24px minmax(0,1fr);justify-items:start;display:grid}.ApA5Lq_sectionTab>span{border-radius:var(--lx-radius-circle);background:var(--lx-border-subtle);width:22px;height:22px;color:var(--lx-label-secondary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);grid-row:1/3;place-items:center;display:grid}.ApA5Lq_sectionTab>strong{color:var(--lx-label-primary);font-size:var(--lx-text-2xs);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ApA5Lq_sectionTab>small{color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.ApA5Lq_sectionTab[aria-selected=true]{border-color:var(--lx-accent);background:color-mix(in srgb, var(--lx-accent-soft) 42%, var(--lx-surface-base));box-shadow:var(--lx-shadow-sm)}.ApA5Lq_sectionTab[aria-selected=true]>span{background:var(--lx-accent);color:var(--lx-label-on-accent)}.ApA5Lq_studySectionPanel{gap:var(--lx-space-md);border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-md);min-width:0;padding:var(--lx-space-lg);background:var(--lx-surface-sunken);flex-direction:column;display:flex}.ApA5Lq_studySectionPanel>header{gap:var(--lx-space-xs);display:grid}.ApA5Lq_studySectionPanel>header span{color:var(--lx-accent);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro)}.ApA5Lq_studySectionPanel>header h4{color:var(--lx-label-primary);font-size:var(--lx-text-base);line-height:var(--lx-leading-base);margin:0}.ApA5Lq_studySectionPanel>header p{color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);margin:0}.ApA5Lq_studyConcepts{gap:var(--lx-space-sm);grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));display:grid}.ApA5Lq_conceptCard{gap:var(--lx-space-3xs);border-color:color-mix(in srgb, var(--visual-tone) 32%, var(--lx-border-subtle));border-radius:var(--lx-radius-md);min-width:0;padding:var(--lx-space-sm) var(--lx-space-md);background:color-mix(in srgb, var(--visual-tone) 8%, var(--lx-surface-base));opacity:var(--lx-vs-alpha);text-align:left;transition:border-color var(--lx-motion-fast) var(--lx-easing), box-shadow var(--lx-motion-fast) var(--lx-easing);justify-items:start;display:grid;box-shadow:0 1px 3px #0000000a}.ApA5Lq_conceptCard:hover{border-color:var(--visual-tone);box-shadow:0 0 8px color-mix(in srgb, var(--visual-tone) 24%, transparent)}.ApA5Lq_conceptCard>span{color:var(--visual-tone);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong)}.ApA5Lq_conceptCard>strong{color:var(--lx-label-primary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs)}.ApA5Lq_conceptCard>small{gap:var(--lx-space-3xs);color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro);display:grid}.ApA5Lq_conceptCard>small b{color:var(--lx-label-secondary);font-weight:var(--lx-weight-medium)}.ApA5Lq_conceptCard[data-selected]{border-color:var(--visual-tone);box-shadow:0 0 10px color-mix(in srgb, var(--visual-tone) 32%, transparent);border-width:2px}.ApA5Lq_studyDetail{gap:var(--lx-space-xs) var(--lx-space-md);border:1px solid color-mix(in srgb, var(--lx-accent) 26%, var(--lx-border-subtle));border-left:3.5px solid var(--lx-accent);border-radius:var(--lx-radius-md);padding:var(--lx-space-md);background:color-mix(in srgb, var(--lx-accent-soft) 24%, var(--lx-surface-base));box-shadow:var(--lx-shadow-sm);grid-template-columns:minmax(0,1fr) 28px;display:grid;position:relative}.ApA5Lq_studyDetail>div{gap:var(--lx-space-sm);align-items:baseline;min-width:0;display:flex}.ApA5Lq_studyDetail>div span{color:var(--lx-accent);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);flex:none}.ApA5Lq_studyDetail>div strong{min-width:0;color:var(--lx-label-primary);font-size:var(--lx-text-sm);overflow-wrap:anywhere}.ApA5Lq_studyDetail>p{color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);grid-column:1;margin:0}.ApA5Lq_studyDetail>dl{gap:var(--lx-space-sm);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro);grid-column:1;margin:0;display:flex}.ApA5Lq_studyDetail dt{color:var(--lx-label-tertiary)}.ApA5Lq_studyDetail dd{color:var(--lx-label-secondary);margin:0}.ApA5Lq_studyDetail>button{grid-area:1/2/4;align-self:start}@container ApA5Lq_learning-visual-v4 (width<=560px){.ApA5Lq_studyLayout{grid-template-columns:1fr}.ApA5Lq_studySections{scrollbar-width:thin;flex-direction:row;padding-bottom:3px;overflow-x:auto}.ApA5Lq_sectionTab{min-width:156px}}";
		const tagId$6 = "@dsh-portable/interactive-learning/study.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var study_module_css_default = {
			"conceptCard": "ApA5Lq_conceptCard",
			"learning-visual-v4": "ApA5Lq_learning-visual-v4",
			"sectionTab": "ApA5Lq_sectionTab",
			"studyConcepts": "ApA5Lq_studyConcepts",
			"studyDependencyHeader": "ApA5Lq_studyDependencyHeader",
			"studyDependencyLevel": "ApA5Lq_studyDependencyLevel",
			"studyDependencyMap": "ApA5Lq_studyDependencyMap",
			"studyDependencyNode": "ApA5Lq_studyDependencyNode",
			"studyDependencyTrack": "ApA5Lq_studyDependencyTrack",
			"studyDetail": "ApA5Lq_studyDetail",
			"studyLayout": "ApA5Lq_studyLayout",
			"studySectionPanel": "ApA5Lq_studySectionPanel",
			"studySections": "ApA5Lq_studySections",
			"studySource": "ApA5Lq_studySource"
		};
		//#endregion
		//#region src/client/visuals/renderers/StudyMapRenderer.tsx
		/** `study_map`: a navigable overview of supplied source material. */
		function studyRoleLabel(role, labels) {
			if (role === "foundation") return labels.roleFoundation;
			if (role === "core") return labels.roleCore;
			if (role === "extension") return labels.roleExtension;
			if (role === "practice") return labels.rolePractice;
		}
		function StudyMapRenderer({ content, focus }) {
			const labels = useVisualLabels();
			const id = (0, react.useId)();
			const conceptById = (0, react.useMemo)(() => new Map(content.concepts.map((concept) => [concept.id, concept])), [content.concepts]);
			const dependencyLevels = (0, react.useMemo)(() => {
				const levelCache = /* @__PURE__ */ new Map();
				const levelFor = (conceptId, trail = /* @__PURE__ */ new Set()) => {
					const cached = levelCache.get(conceptId);
					if (cached !== void 0) return cached;
					const concept = conceptById.get(conceptId);
					if (concept === void 0 || trail.has(conceptId)) return 0;
					const nextTrail = new Set(trail);
					nextTrail.add(conceptId);
					const level = Math.max(0, ...(concept.prerequisiteIds ?? []).map((prerequisiteId) => levelFor(prerequisiteId, nextTrail) + 1));
					levelCache.set(conceptId, level);
					return level;
				};
				const levels = [];
				for (const concept of content.concepts) {
					const level = levelFor(concept.id);
					levels[level] ??= [];
					levels[level].push(concept);
				}
				return levels.filter((level) => level !== void 0);
			}, [conceptById, content.concepts]);
			const focusedConcept = content.concepts.find((concept) => focus.currentIds.has(concept.id));
			const focusedSection = content.sections.find((section) => focus.currentIds.has(section.id));
			const [sectionId, setSectionId] = (0, react.useState)(focusedConcept?.sectionId ?? focusedSection?.id ?? content.sections[0]?.id ?? "");
			const [selectedConceptId, setSelectedConceptId] = (0, react.useState)(focusedConcept?.id);
			(0, react.useEffect)(() => {
				const concept = content.concepts.find((item) => focus.currentIds.has(item.id));
				const section = content.sections.find((item) => focus.currentIds.has(item.id));
				if (concept !== void 0) {
					setSectionId(concept.sectionId);
					setSelectedConceptId(concept.id);
				} else if (section !== void 0) setSectionId(section.id);
			}, [
				content.concepts,
				content.sections,
				focus.currentIds
			]);
			const section = content.sections.find((item) => item.id === sectionId) ?? content.sections[0];
			const concepts = content.concepts.filter((concept) => concept.sectionId === section?.id);
			const selectedConcept = selectedConceptId === void 0 ? void 0 : conceptById.get(selectedConceptId);
			const selectSection = (nextId) => {
				setSectionId(nextId);
				setSelectedConceptId(void 0);
			};
			const sectionKeyDown = (event, index) => {
				if (event.key !== "ArrowUp" && event.key !== "ArrowDown" && event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
				event.preventDefault();
				const nextIndex = (index + (event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1) + content.sections.length) % content.sections.length;
				const next = content.sections[nextIndex];
				if (next !== void 0) {
					selectSection(next.id);
					(event.currentTarget.parentElement?.querySelectorAll("[role=\"tab\"]"))?.[nextIndex]?.focus();
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: study_module_css_default.studySource,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.studySource }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: content.sourceLabel }),
							content.goal === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: labels.studyGoal }), content.goal] })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: study_module_css_default.studyDependencyMap,
						role: "img",
						"aria-label": `${labels.prerequisite} ${labels.studyConcepts}`,
						"aria-hidden": "true",
						style: { gridTemplateColumns: `repeat(${Math.max(1, dependencyLevels.length)}, minmax(0, 1fr))` },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: study_module_css_default.studyDependencyHeader,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.prerequisite }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.studyConcepts })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: study_module_css_default.studyDependencyTrack,
							children: dependencyLevels.map((level, levelIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: study_module_css_default.studyDependencyLevel,
								children: level.map((concept) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: study_module_css_default.studyDependencyNode,
									"data-role": concept.role,
									children: concept.label
								}, concept.id))
							}, `level-${String(levelIndex)}`))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: study_module_css_default.studyLayout,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
							className: study_module_css_default.studySections,
							role: "tablist",
							"aria-label": labels.studySections,
							children: content.sections.map((item, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${shell_module_css_default.control} ${study_module_css_default.sectionTab}`,
								role: "tab",
								id: `${id}-tab-${item.id}`,
								"aria-controls": `${id}-panel`,
								tabIndex: item.id === section?.id ? 0 : -1,
								"aria-selected": item.id === section?.id,
								"data-visual-state": elementState(item.id, focus, content.concepts.filter((concept) => concept.sectionId === item.id).map((concept) => concept.id)),
								"data-visual-id": item.id,
								onClick: () => selectSection(item.id),
								onKeyDown: (event) => sectionKeyDown(event, index),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: index + 1 }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: item.label }),
									item.anchor === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: item.anchor })
								]
							}, item.id))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: study_module_css_default.studySectionPanel,
							role: "tabpanel",
							id: `${id}-panel`,
							"aria-labelledby": section === void 0 ? void 0 : `${id}-tab-${section.id}`,
							children: [section === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: section.anchor === void 0 ? labels.studySummary : `${labels.studyAnchor} · ${section.anchor}` }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: section.label })] }), section.summary === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: section.summary })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: study_module_css_default.studyConcepts,
								role: "group",
								"aria-label": labels.studyConcepts,
								children: concepts.map((concept, index) => {
									const role = studyRoleLabel(concept.role, labels);
									const prerequisites = (concept.prerequisiteIds ?? []).map((prerequisiteId) => conceptById.get(prerequisiteId)?.label ?? prerequisiteId);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: `${shell_module_css_default.control} ${study_module_css_default.conceptCard}`,
										"data-tone": toneAt(concept.tone, index),
										"data-role": concept.role,
										"data-visual-state": concept.id === selectedConceptId ? "selected" : elementState(concept.id, focus),
										"data-selected": concept.id === selectedConceptId || void 0,
										"data-visual-id": concept.id,
										onClick: () => setSelectedConceptId(concept.id),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: role ?? labels.studyConcepts }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: concept.label }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: labels.prerequisite }), prerequisites.length === 0 ? labels.noPrerequisite : prerequisites.join(" → ")] })
										]
									}, concept.id);
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shell_module_css_default.selectionSlot,
						children: selectedConcept === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: shell_module_css_default.interactionHint,
							children: labels.studyInteractionHint
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
							className: study_module_css_default.studyDetail,
							"aria-live": "polite",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: studyRoleLabel(selectedConcept.role, labels) ?? labels.studyConcepts }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: selectedConcept.label })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: selectedConcept.detail ?? labels.noDetail }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: labels.prerequisite }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: (selectedConcept.prerequisiteIds ?? []).map((prerequisiteId) => conceptById.get(prerequisiteId)?.label ?? prerequisiteId).join(" → ") || labels.noPrerequisite })] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${shell_module_css_default.control} ${shell_module_css_default.closeButton}`,
									onClick: () => setSelectedConceptId(void 0),
									"aria-label": labels.closeDetail,
									children: "×"
								})
							]
						})
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/recall.module.css.mjs
		const css$5 = "._4HHZCG_recallToolbar{justify-content:space-between;align-items:baseline;gap:var(--lx-space-xs) var(--lx-space-lg);min-width:0;color:var(--lx-accent);font-size:var(--lx-text-2xs);font-variant-numeric:tabular-nums;font-weight:var(--lx-weight-strong);flex-wrap:wrap;display:flex}._4HHZCG_recallToolbar output{color:var(--lx-label-secondary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-regular)}._4HHZCG_recallInstructions{color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs);margin:0}._4HHZCG_recallCard{gap:var(--lx-space-lg);border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-lg);background:var(--lx-surface-base);min-height:200px;box-shadow:var(--lx-shadow-md);opacity:var(--lx-vs-alpha);transition:box-shadow var(--lx-motion-base) var(--lx-easing);align-content:start;padding:clamp(16px,3.2cqi,24px);display:grid}._4HHZCG_recallCardHeader{justify-content:space-between;align-items:center;gap:var(--lx-space-lg);display:flex}._4HHZCG_recallCardHeader>span{color:var(--lx-accent);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);letter-spacing:var(--lx-tracking-eyebrow);text-transform:uppercase}._4HHZCG_recallCardHeader>small{border-radius:var(--lx-radius-pill);padding:var(--lx-space-3xs) var(--lx-space-sm);background:var(--lx-surface-sunken);border:1px solid var(--lx-border-subtle);color:var(--lx-label-secondary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-medium)}._4HHZCG_recallCardHeader>small[data-status=mastered]{border-color:color-mix(in srgb, var(--lx-success) 30%, transparent);background:color-mix(in srgb, var(--lx-success) 12%, transparent);color:var(--lx-success)}._4HHZCG_recallCardHeader>small[data-status=review]{border-color:color-mix(in srgb, var(--lx-warn) 30%, transparent);background:color-mix(in srgb, var(--lx-warn) 12%, transparent);color:var(--lx-warn)}._4HHZCG_recallCard>h4{color:var(--lx-label-primary);font-size:clamp(16px,3.4cqi,20px);font-weight:var(--lx-weight-strong);margin:0;line-height:1.5}._4HHZCG_recallTags{gap:var(--lx-space-xs);flex-wrap:wrap;margin:-3px 0 0;padding:0;list-style:none;display:flex}._4HHZCG_recallTags li{border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-pill);padding:var(--lx-space-3xs) var(--lx-space-sm);background:var(--lx-surface-sunken);color:var(--lx-label-secondary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro)}._4HHZCG_recallRevealSlot{align-content:start;min-height:56px;display:grid}._4HHZCG_recallRevealPlaceholder{min-height:56px;display:block}._4HHZCG_recallReveal{gap:var(--lx-space-2xs);border-left:3.5px solid var(--lx-warn);border-radius:0 var(--lx-radius-sm) var(--lx-radius-sm) 0;padding:var(--lx-space-sm) var(--lx-space-md);background:color-mix(in srgb, var(--lx-warn) 8%, var(--lx-surface-base));display:grid}._4HHZCG_recallReveal[data-kind=answer]{border-left-color:var(--lx-success);background:color-mix(in srgb, var(--lx-success) 8%, var(--lx-surface-base))}._4HHZCG_recallReveal>span{color:var(--lx-warn);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong)}._4HHZCG_recallReveal[data-kind=answer]>span{color:var(--lx-success)}._4HHZCG_recallReveal>p{color:var(--lx-label-primary);font-size:var(--lx-text-sm);line-height:var(--lx-leading-sm);margin:0}._4HHZCG_recallRevealButton{justify-self:start;width:max-content;min-width:128px}._4HHZCG_recallRating{align-self:end}._4HHZCG_ratingButton[aria-pressed=true]{border-color:var(--lx-accent);background:color-mix(in srgb, var(--lx-accent-soft) 50%, transparent);color:var(--lx-accent);font-weight:var(--lx-weight-medium)}._4HHZCG_recallNavigation>:last-child{margin-left:auto}@container _4HHZCG_learning-visual-v4 (width<=560px){._4HHZCG_recallNavigation>*{flex:1}._4HHZCG_recallNavigation>:last-child{flex-basis:100%;margin-left:0}._4HHZCG_recallCard{min-height:190px}}@container _4HHZCG_learning-visual-v4 (width<=360px){._4HHZCG_recallToolbar{align-items:flex-start;gap:var(--lx-space-3xs);flex-direction:column}}";
		const tagId$5 = "@dsh-portable/interactive-learning/recall.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var recall_module_css_default = {
			"learning-visual-v4": "_4HHZCG_learning-visual-v4",
			"ratingButton": "_4HHZCG_ratingButton",
			"recallCard": "_4HHZCG_recallCard",
			"recallCardHeader": "_4HHZCG_recallCardHeader",
			"recallInstructions": "_4HHZCG_recallInstructions",
			"recallNavigation": "_4HHZCG_recallNavigation",
			"recallRating": "_4HHZCG_recallRating",
			"recallReveal": "_4HHZCG_recallReveal",
			"recallRevealButton": "_4HHZCG_recallRevealButton",
			"recallRevealPlaceholder": "_4HHZCG_recallRevealPlaceholder",
			"recallRevealSlot": "_4HHZCG_recallRevealSlot",
			"recallTags": "_4HHZCG_recallTags",
			"recallToolbar": "_4HHZCG_recallToolbar"
		};
		//#endregion
		//#region src/client/visuals/renderers/RecallDeckRenderer.tsx
		/** `recall_deck`: retrieval practice, one card at a time. */
		function initialRecallState(content, storageKey) {
			const initial = {
				index: 0,
				stage: "prompt",
				statuses: {}
			};
			if (storageKey === void 0 || typeof sessionStorage === "undefined") return initial;
			try {
				const stored = JSON.parse(sessionStorage.getItem(`dsh-learning/visual@4:recall:${storageKey}`) ?? "{}");
				if (typeof stored.index === "number" && Number.isInteger(stored.index)) initial.index = Math.max(0, Math.min(content.cards.length - 1, stored.index));
				if (stored.stage === "prompt" || stored.stage === "hint" || stored.stage === "answer") initial.stage = stored.stage;
				if (typeof stored.statuses === "object" && stored.statuses !== null && !Array.isArray(stored.statuses)) for (const card of content.cards) {
					const status = stored.statuses[card.id];
					if (status === "mastered" || status === "review") initial.statuses[card.id] = status;
				}
				if (initial.stage === "hint" && content.cards[initial.index]?.hint === void 0) initial.stage = "answer";
			} catch {}
			return initial;
		}
		function RecallDeckRenderer({ content, focus, storageKey, onRecallStatusChange }) {
			const labels = useVisualLabels();
			const initial = (0, react.useMemo)(() => initialRecallState(content, storageKey), [content, storageKey]);
			const [cardIndex, setCardIndex] = (0, react.useState)(initial.index);
			const [stage, setStage] = (0, react.useState)(initial.stage);
			const [statuses, setStatuses] = (0, react.useState)(initial.statuses);
			const current = content.cards[cardIndex];
			const followedFocus = (0, react.useRef)(-1);
			(0, react.useEffect)(() => {
				const focusedIndex = content.cards.findIndex((card) => focus.currentIds.has(card.id));
				if (focusedIndex < 0 || focusedIndex === followedFocus.current) return;
				followedFocus.current = focusedIndex;
				setCardIndex(focusedIndex);
				setStage("prompt");
			}, [content.cards, focus.currentIds]);
			(0, react.useEffect)(() => {
				if (storageKey === void 0 || typeof sessionStorage === "undefined") return;
				try {
					sessionStorage.setItem(`dsh-learning/visual@4:recall:${storageKey}`, JSON.stringify({
						index: cardIndex,
						stage,
						statuses
					}));
				} catch {}
			}, [
				cardIndex,
				stage,
				statuses,
				storageKey
			]);
			if (current === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyFigure, {});
			const move = (delta) => {
				setCardIndex((index) => Math.max(0, Math.min(content.cards.length - 1, index + delta)));
				setStage("prompt");
			};
			const reset = () => {
				setCardIndex(0);
				setStage("prompt");
				setStatuses({});
			};
			const mark = (status) => {
				setStatuses((value) => ({
					...value,
					[current.id]: status
				}));
				onRecallStatusChange?.(current.id, status);
			};
			const masteredCount = Object.values(statuses).filter((status) => status === "mastered").length;
			const reviewCount = Object.values(statuses).filter((status) => status === "review").length;
			const status = statuses[current.id];
			const revealNext = () => {
				if (stage !== "answer" && (stage === "hint" || current.hint === void 0)) onRecallStatusChange?.(current.id, "revealed");
				setStage((value) => value === "prompt" && current.hint !== void 0 ? "hint" : "answer");
			};
			const onKeyDown = (event) => {
				if (event.target !== event.currentTarget) return;
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					move(-1);
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					move(1);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				role: "group",
				tabIndex: 0,
				onKeyDown,
				"aria-label": labels.recallDeckLabel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: recall_module_css_default.recallToolbar,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labelTemplate(labels.recallProgress, {
							current: cardIndex + 1,
							total: content.cards.length
						}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("output", { children: labelTemplate(labels.recallStatus, {
							mastered: masteredCount,
							review: reviewCount
						}) })]
					}),
					content.instructions === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: recall_module_css_default.recallInstructions,
						children: content.instructions
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
						className: recall_module_css_default.recallCard,
						"data-visual-id": current.id,
						"data-visual-state": elementState(current.id, focus),
						"data-stage": stage,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: recall_module_css_default.recallCardHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.recallPrompt }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", {
									"data-status": status ?? "unrated",
									children: status === "mastered" ? labels.mastered : status === "review" ? labels.reviewAgain : labels.unrated
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: current.prompt }),
							current.tags === void 0 || current.tags.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: recall_module_css_default.recallTags,
								children: current.tags.map((tag) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: tag }, tag))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: recall_module_css_default.recallRevealSlot,
								children: [
									stage === "prompt" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: recall_module_css_default.recallRevealPlaceholder,
										"aria-hidden": "true"
									}) : null,
									stage !== "prompt" && current.hint !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										className: recall_module_css_default.recallReveal,
										"data-kind": "hint",
										"aria-live": "polite",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.recallHint }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: current.hint })]
									}) : null,
									stage !== "answer" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
										className: recall_module_css_default.recallReveal,
										"data-kind": "answer",
										"aria-live": "polite",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: labels.recallAnswer }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: current.answer })]
									})
								]
							}),
							stage === "answer" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: `${shell_module_css_default.controlRow} ${recall_module_css_default.recallRating}`,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${shell_module_css_default.control} ${recall_module_css_default.ratingButton}`,
									"aria-pressed": status === "review",
									onClick: () => mark("review"),
									children: labels.reviewAgain
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${shell_module_css_default.control} ${recall_module_css_default.ratingButton}`,
									"aria-pressed": status === "mastered",
									onClick: () => mark("mastered"),
									children: labels.mastered
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${shell_module_css_default.control} ${shell_module_css_default.controlPrimary} ${recall_module_css_default.recallRevealButton}`,
								onClick: revealNext,
								children: stage === "prompt" && current.hint !== void 0 ? labels.showHint : labels.showAnswer
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `${shell_module_css_default.controlRow} ${recall_module_css_default.recallNavigation}`,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => move(-1),
								disabled: cardIndex === 0,
								children: ["← ", labels.previousCard]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => move(1),
								disabled: cardIndex >= content.cards.length - 1,
								children: [labels.nextCard, " →"]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: reset,
								disabled: cardIndex === 0 && stage === "prompt" && Object.keys(statuses).length === 0,
								children: labels.resetDeck
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: shell_module_css_default.selectionSlot,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: shell_module_css_default.interactionHint,
							children: labels.recallInteractionHint
						})
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/data-table.module.css.mjs
		const css$4 = ".rTBj_a_toolbar{align-items:center;gap:var(--lx-space-sm);flex-wrap:wrap;display:flex}.rTBj_a_search{flex:220px}.rTBj_a_search input{border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-sm);width:100%;min-height:36px;padding:var(--lx-space-xs) var(--lx-space-md);background:var(--lx-surface-base);color:var(--lx-label-primary);font:inherit;font-size:var(--lx-text-xs);transition:border-color var(--lx-motion-fast) var(--lx-easing), box-shadow var(--lx-motion-fast) var(--lx-easing)}.rTBj_a_search input:focus{border-color:var(--lx-accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--lx-accent) 15%, transparent);outline:none}.rTBj_a_toolbar output{color:var(--lx-label-secondary);font-size:var(--lx-text-xs);font-variant-numeric:tabular-nums;font-weight:var(--lx-weight-medium)}.rTBj_a_tableViewport{padding:var(--lx-space-2xs);border-radius:var(--lx-radius-md);box-shadow:var(--lx-shadow-sm)}.rTBj_a_table{border-spacing:0;border-collapse:separate;width:100%;min-width:520px;color:var(--lx-label-primary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-xs)}.rTBj_a_table th,.rTBj_a_table td{border-right:1px solid var(--lx-border-subtle);border-bottom:1px solid var(--lx-border-subtle);padding:var(--lx-space-sm) var(--lx-space-md);text-align:left;white-space:nowrap}.rTBj_a_table tr>:last-child{border-right:0}.rTBj_a_table tbody tr:last-child>*{border-bottom:0}.rTBj_a_table thead th{z-index:1;background:var(--lx-surface-sunken);opacity:var(--lx-vs-alpha);border-bottom:1.5px solid var(--lx-border-subtle);padding:0;position:sticky;top:0}.rTBj_a_table thead button{align-items:center;gap:var(--lx-space-xs);width:100%;min-height:40px;padding:var(--lx-space-sm) var(--lx-space-md);color:inherit;font:inherit;font-weight:var(--lx-weight-strong);cursor:pointer;transition:background-color var(--lx-motion-fast) var(--lx-easing);background:0 0;border:0;display:flex}.rTBj_a_table thead button:hover{background:color-mix(in srgb, var(--lx-accent) 9%, transparent)}.rTBj_a_table thead small{color:var(--lx-label-tertiary);font-weight:var(--lx-weight-regular)}.rTBj_a_table thead i{color:var(--lx-label-tertiary);margin-left:auto;font-style:normal}.rTBj_a_table tbody tr{opacity:var(--lx-vs-alpha);cursor:pointer;transition:background-color var(--lx-motion-fast) var(--lx-easing)}.rTBj_a_table tbody tr:nth-child(2n)>*{background:color-mix(in srgb, var(--lx-surface-sunken) 50%, var(--lx-surface-base))}.rTBj_a_table tbody tr:hover>*{background:color-mix(in srgb, var(--lx-accent) 9%, transparent)!important}.rTBj_a_table tbody tr[data-selected]>*{background:color-mix(in srgb, var(--lx-accent) 15%, transparent)!important}.rTBj_a_table tbody tr[data-outlier]>:first-child{box-shadow:inset 3.5px 0 0 var(--lx-danger,#d94b4b)}.rTBj_a_table tbody th{font-weight:var(--lx-weight-medium)}.rTBj_a_table td{color:var(--lx-label-secondary)}.rTBj_a_table [data-missing]{color:var(--lx-label-tertiary);font-style:italic}.rTBj_a_outlierMark{width:17px;height:17px;margin-right:var(--lx-space-xs);border-radius:var(--lx-radius-circle);background:color-mix(in srgb, var(--lx-danger,#d94b4b) 14%, transparent);color:var(--lx-danger,#d94b4b);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);place-items:center;display:inline-grid}.rTBj_a_empty{padding:var(--lx-space-xl);color:var(--lx-label-tertiary);text-align:center;margin:0}.rTBj_a_chartViewport{border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-md);background:var(--lx-surface-base);width:100%;box-shadow:var(--lx-shadow-sm);overflow-x:auto}.rTBj_a_chart{width:100%;min-width:360px;display:block}.rTBj_a_chartFrame{fill:var(--lx-surface-base);stroke:var(--lx-border-subtle)}.rTBj_a_chartGrid{stroke:color-mix(in srgb, var(--lx-border-subtle) 72%, transparent);stroke-width:1px;stroke-dasharray:2 4;vector-effect:non-scaling-stroke}.rTBj_a_xLabel,.rTBj_a_yLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-medium);text-anchor:middle}.rTBj_a_tick{fill:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums}.rTBj_a_chartLine{fill:none;stroke:var(--visual-tone);stroke-width:2.25px;stroke-linejoin:round;filter:drop-shadow(0 0 3px color-mix(in srgb, var(--visual-tone) 40%, transparent));vector-effect:non-scaling-stroke}.rTBj_a_chartPoint{fill:var(--visual-tone);stroke:var(--lx-surface-base);stroke-width:1.5px;cursor:pointer;filter:drop-shadow(0 0 2px var(--visual-tone));vector-effect:non-scaling-stroke}.rTBj_a_chartBar{fill:color-mix(in srgb, var(--visual-tone) 72%, transparent);stroke:var(--visual-tone);cursor:pointer;vector-effect:non-scaling-stroke}.rTBj_a_chartPoint[data-outlier],.rTBj_a_chartBar[data-outlier]{stroke:var(--lx-danger,#d94b4b);stroke-width:2.5px;filter:drop-shadow(0 0 4px color-mix(in srgb, var(--lx-danger,#d94b4b) 60%, transparent))}.rTBj_a_chartPoint[data-selected],.rTBj_a_chartBar[data-selected]{stroke:var(--lx-label-primary);stroke-width:3px}.rTBj_a_chartTooltip{pointer-events:none}.rTBj_a_chartTooltip rect{fill:var(--lx-surface-base);stroke:var(--lx-border-strong);stroke-width:1px;filter:drop-shadow(0 2px 5px color-mix(in srgb, var(--lx-label-primary) 16%, transparent))}.rTBj_a_chartTooltip text{fill:var(--lx-label-primary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-medium)}@container rTBj_a_learning-visual-v4 (width<=560px){.rTBj_a_table{min-width:460px}}";
		const tagId$4 = "@dsh-portable/interactive-learning/data-table.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var data_table_module_css_default = {
			"chart": "rTBj_a_chart",
			"chartBar": "rTBj_a_chartBar",
			"chartFrame": "rTBj_a_chartFrame",
			"chartGrid": "rTBj_a_chartGrid",
			"chartLine": "rTBj_a_chartLine",
			"chartPoint": "rTBj_a_chartPoint",
			"chartTooltip": "rTBj_a_chartTooltip",
			"chartViewport": "rTBj_a_chartViewport",
			"empty": "rTBj_a_empty",
			"learning-visual-v4": "rTBj_a_learning-visual-v4",
			"outlierMark": "rTBj_a_outlierMark",
			"search": "rTBj_a_search",
			"table": "rTBj_a_table",
			"tableViewport": "rTBj_a_tableViewport",
			"tick": "rTBj_a_tick",
			"toolbar": "rTBj_a_toolbar",
			"xLabel": "rTBj_a_xLabel",
			"yLabel": "rTBj_a_yLabel"
		};
		//#endregion
		//#region src/client/visuals/renderers/DataTableRenderer.tsx
		/** `data_table`: typed records with local filtering, sorting and a linked chart. */
		function valueOf(row, columnId) {
			return row.cells.find((cell) => cell.columnId === columnId)?.value ?? null;
		}
		function formatValue(value, column) {
			if (value === null) return "—";
			if (column.type === "boolean") return value === true ? "✓" : value === false ? "✕" : String(value);
			if (column.type === "number" && typeof value === "number") return `${formatNumber(value)}${column.unit === void 0 ? "" : ` ${column.unit}`}`;
			return String(value);
		}
		function compareValues(left, right, column) {
			if (left === null) return right === null ? 0 : 1;
			if (right === null) return -1;
			if (column.type === "number") return Number(left) - Number(right);
			if (column.type === "boolean") return Number(left) - Number(right);
			if (column.type === "date") {
				const difference = Date.parse(String(left)) - Date.parse(String(right));
				if (Number.isFinite(difference)) return difference;
			}
			return String(left).localeCompare(String(right), void 0, {
				numeric: true,
				sensitivity: "base"
			});
		}
		function matchesFilter(value, filter) {
			const expected = filter.value;
			if (filter.operator === "contains") return String(value ?? "").toLocaleLowerCase().includes(String(expected ?? "").toLocaleLowerCase());
			if (filter.operator === "equals") return value === expected || String(value) === String(expected);
			if (filter.operator === "not_equals") return !(value === expected || String(value) === String(expected));
			const left = typeof value === "number" ? value : Number(value);
			const right = typeof expected === "number" ? expected : Number(expected);
			if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
			if (filter.operator === "gt") return left > right;
			if (filter.operator === "gte") return left >= right;
			if (filter.operator === "lt") return left < right;
			return left <= right;
		}
		function numericValue(value, column, fallback) {
			if (typeof value === "number" && Number.isFinite(value)) return value;
			if (column.type === "boolean" && typeof value === "boolean") return value ? 1 : 0;
			if (column.type === "date" && value !== null) {
				const parsed = Date.parse(String(value));
				if (Number.isFinite(parsed)) return parsed;
			}
			if (column.type === "string" && value !== null) return fallback;
		}
		function extent(values) {
			const min = Math.min(...values);
			const max = Math.max(...values);
			if (min !== max) return {
				min,
				max
			};
			const padding = Math.max(1, Math.abs(min) * .08);
			return {
				min: min - padding,
				max: max + padding
			};
		}
		function LinkedChart({ content, rows, selectedRowId, outlierIds, onSelect }) {
			const chart = content.chart;
			const [hoveredRowId, setHoveredRowId] = (0, react.useState)();
			const [viewportRef, measuredWidth] = useContainerWidth();
			if (chart === void 0) return null;
			const xColumn = content.columns.find((column) => column.id === chart.xColumnId);
			const yColumn = content.columns.find((column) => column.id === chart.yColumnId);
			if (xColumn === void 0 || yColumn === void 0) return null;
			const points = rows.flatMap((row, index) => {
				const x = numericValue(valueOf(row, xColumn.id), xColumn, index);
				const y = numericValue(valueOf(row, yColumn.id), yColumn, index);
				return x === void 0 || y === void 0 ? [] : [{
					row,
					x,
					y,
					series: chart.seriesColumnId === void 0 ? "" : String(valueOf(row, chart.seriesColumnId) ?? "—")
				}];
			});
			if (points.length === 0) return null;
			const width = Math.max(360, Math.round(measuredWidth));
			const height = 250;
			const frame = {
				left: 54,
				right: 18,
				top: 18,
				bottom: 42
			};
			const plotWidth = width - frame.left - frame.right;
			const plotHeight = height - frame.top - frame.bottom;
			const xExtent = extent(points.map((point) => point.x));
			const yExtent = extent(points.map((point) => point.y));
			const xTicks = ticks(xExtent.min, xExtent.max, 5);
			const yTicks = ticks(yExtent.min, yExtent.max, 5);
			const xAt = (value) => frame.left + (value - xExtent.min) / (xExtent.max - xExtent.min) * plotWidth;
			const yAt = (value) => frame.top + (1 - (value - yExtent.min) / (yExtent.max - yExtent.min)) * plotHeight;
			const groups = [...new Set(points.map((point) => point.series))];
			const activePoint = points.find((point) => point.row.id === hoveredRowId) ?? points.find((point) => point.row.id === selectedRowId);
			const tooltipWidth = Math.min(190, Math.max(132, plotWidth - 16));
			const tooltipHeight = 42;
			const tooltipX = activePoint === void 0 ? 0 : Math.max(frame.left + tooltipWidth / 2, Math.min(frame.left + plotWidth - tooltipWidth / 2, xAt(activePoint.x)));
			const tooltipY = activePoint === void 0 ? 0 : Math.max(frame.top + tooltipHeight + 6, yAt(activePoint.y) - 12);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: data_table_module_css_default.chartViewport,
				ref: viewportRef,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
					className: data_table_module_css_default.chart,
					viewBox: `0 0 ${String(width)} ${String(height)}`,
					role: "img",
					"aria-label": `${yColumn.label} / ${xColumn.label}`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
							className: data_table_module_css_default.chartFrame,
							x: frame.left,
							y: frame.top,
							width: plotWidth,
							height: plotHeight
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							className: data_table_module_css_default.yLabel,
							x: 12,
							y: frame.top + plotHeight / 2,
							transform: `rotate(-90 12 ${String(frame.top + plotHeight / 2)})`,
							children: yColumn.label
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							className: data_table_module_css_default.xLabel,
							x: frame.left + plotWidth / 2,
							y: 242,
							children: xColumn.label
						}),
						xTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
							className: data_table_module_css_default.chartGrid,
							x1: xAt(value),
							x2: xAt(value),
							y1: frame.top,
							y2: frame.top + plotHeight
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							className: data_table_module_css_default.tick,
							x: xAt(value),
							y: 226,
							textAnchor: "middle",
							children: formatNumber(value)
						})] }, `x-${String(value)}`)),
						yTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
							className: data_table_module_css_default.chartGrid,
							x1: frame.left,
							x2: frame.left + plotWidth,
							y1: yAt(value),
							y2: yAt(value)
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
							className: data_table_module_css_default.tick,
							x: frame.left - 8,
							y: yAt(value),
							textAnchor: "end",
							dominantBaseline: "middle",
							children: formatNumber(value)
						})] }, `y-${String(value)}`)),
						chart.type === "line" ? groups.map((group, groupIndex) => {
							const path = points.filter((point) => point.series === group).sort((left, right) => left.x - right.x).map((point, index) => `${index === 0 ? "M" : "L"}${xAt(point.x).toFixed(2)},${yAt(point.y).toFixed(2)}`).join(" ");
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								className: data_table_module_css_default.chartLine,
								"data-tone": toneAt(void 0, groupIndex),
								d: path
							}, group);
						}) : null,
						points.map((point, index) => {
							const tone = toneAt(void 0, Math.max(0, groups.indexOf(point.series)));
							const selected = selectedRowId === point.row.id;
							const outlier = outlierIds.has(point.row.id);
							const state = selected ? "selected" : elementState(point.row.id, {
								currentIds: /* @__PURE__ */ new Set(),
								visitedIds: /* @__PURE__ */ new Set(),
								active: false
							});
							if (chart.type === "bar") {
								const baseline = yAt(Math.max(0, yExtent.min));
								const y = yAt(point.y);
								const barWidth = Math.max(5, Math.min(34, plotWidth / Math.max(1, points.length) * .62));
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									className: data_table_module_css_default.chartBar,
									"data-tone": tone,
									"data-selected": selected || void 0,
									"data-outlier": outlier || void 0,
									"data-visual-id": point.row.id,
									"data-visual-state": state,
									x: xAt(point.x) - barWidth / 2,
									y: Math.min(y, baseline),
									width: barWidth,
									height: Math.max(2, Math.abs(baseline - y)),
									role: "button",
									tabIndex: 0,
									onClick: () => onSelect(point.row),
									onPointerEnter: () => setHoveredRowId(point.row.id),
									onPointerLeave: () => setHoveredRowId(void 0),
									onFocus: () => setHoveredRowId(point.row.id),
									onBlur: () => setHoveredRowId(void 0),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${xColumn.label}: ${formatValue(valueOf(point.row, xColumn.id), xColumn)}; ${yColumn.label}: ${formatValue(valueOf(point.row, yColumn.id), yColumn)}` })
								}, point.row.id);
							}
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
								className: data_table_module_css_default.chartPoint,
								"data-tone": tone,
								"data-selected": selected || void 0,
								"data-outlier": outlier || void 0,
								"data-visual-id": point.row.id,
								"data-visual-state": state,
								cx: xAt(point.x),
								cy: yAt(point.y),
								r: outlier || selected ? 7 : 5,
								role: "button",
								tabIndex: 0,
								onClick: () => onSelect(point.row),
								onPointerEnter: () => setHoveredRowId(point.row.id),
								onPointerLeave: () => setHoveredRowId(void 0),
								onFocus: () => setHoveredRowId(point.row.id),
								onBlur: () => setHoveredRowId(void 0),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: `${xColumn.label}: ${formatValue(valueOf(point.row, xColumn.id), xColumn)}; ${yColumn.label}: ${formatValue(valueOf(point.row, yColumn.id), yColumn)}` })
							}, point.row.id);
						}),
						activePoint === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
							className: data_table_module_css_default.chartTooltip,
							transform: `translate(${tooltipX} ${tooltipY})`,
							"aria-hidden": "true",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: -tooltipWidth / 2,
								y: -42,
								width: tooltipWidth,
								height: tooltipHeight,
								rx: "6"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
								x: -tooltipWidth / 2 + 10,
								y: -27,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tspan", {
									x: -tooltipWidth / 2 + 10,
									children: [
										xColumn.label,
										": ",
										formatValue(valueOf(activePoint.row, xColumn.id), xColumn)
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("tspan", {
									x: -tooltipWidth / 2 + 10,
									dy: "15",
									children: [
										yColumn.label,
										": ",
										formatValue(valueOf(activePoint.row, yColumn.id), yColumn),
										outlierIds.has(activePoint.row.id) ? " · 异常值" : ""
									]
								})]
							})]
						})
					]
				})
			});
		}
		function DataTableRenderer({ content, focus }) {
			const [query, setQuery] = (0, react.useState)("");
			const [sort, setSort] = (0, react.useState)(content.initialSort);
			const [filter, setFilter] = (0, react.useState)(content.initialFilter);
			const [selectedRowId, setSelectedRowId] = (0, react.useState)();
			const outlierIds = (0, react.useMemo)(() => new Set(content.outlierIds ?? []), [content.outlierIds]);
			const selectedRow = content.rows.find((row) => row.id === selectedRowId);
			const visibleRows = (0, react.useMemo)(() => {
				const needle = query.trim().toLocaleLowerCase();
				const filtered = content.rows.filter((row) => {
					if (filter !== void 0 && !matchesFilter(valueOf(row, filter.columnId), filter)) return false;
					return needle === "" || content.columns.some((column) => formatValue(valueOf(row, column.id), column).toLocaleLowerCase().includes(needle)) || row.detail?.toLocaleLowerCase().includes(needle) === true;
				});
				if (sort === void 0) return filtered;
				const column = content.columns.find((item) => item.id === sort.columnId);
				if (column === void 0) return filtered;
				return [...filtered].sort((left, right) => {
					const order = compareValues(valueOf(left, column.id), valueOf(right, column.id), column);
					return sort.direction === "asc" ? order : -order;
				});
			}, [
				content.columns,
				content.rows,
				filter,
				query,
				sort
			]);
			const selectRow = (row) => setSelectedRowId((current) => current === row.id ? void 0 : row.id);
			const changeSort = (columnId) => setSort((current) => current?.columnId === columnId ? {
				columnId,
				direction: current.direction === "asc" ? "desc" : "asc"
			} : {
				columnId,
				direction: "asc"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: data_table_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: data_table_module_css_default.search,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shell_module_css_default.srOnly,
									children: "筛选数据"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "search",
									value: query,
									placeholder: "筛选数据…",
									onChange: (event) => setQuery(event.currentTarget.value)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("output", {
								"aria-live": "polite",
								children: [
									visibleRows.length,
									" / ",
									content.rows.length
								]
							}),
							filter === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: shell_module_css_default.control,
								onClick: () => setFilter(void 0),
								children: "清除预设筛选"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LinkedChart, {
						content,
						rows: visibleRows,
						selectedRowId,
						outlierIds,
						onSelect: selectRow
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `${shell_module_css_default.viewport} ${data_table_module_css_default.tableViewport}`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("table", {
							className: data_table_module_css_default.table,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("caption", {
									className: shell_module_css_default.srOnly,
									children: "数据表"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: content.columns.map((column) => {
									const active = sort?.columnId === column.id;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
										scope: "col",
										"data-visual-id": column.id,
										"data-visual-state": elementState(column.id, focus),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => changeSort(column.id),
											"aria-label": `${column.label}，排序`,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: column.label }),
												column.unit === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: column.unit }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
													"aria-hidden": "true",
													children: active ? sort.direction === "asc" ? "↑" : "↓" : "↕"
												})
											]
										})
									}, column.id);
								}) }) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", { children: visibleRows.map((row) => {
									const selected = row.id === selectedRowId;
									const outlier = outlierIds.has(row.id);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", {
										"data-visual-id": row.id,
										"data-visual-state": selected ? "selected" : elementState(row.id, focus),
										"data-selected": selected || void 0,
										"data-outlier": outlier || void 0,
										onClick: () => selectRow(row),
										children: content.columns.map((column, index) => {
											const value = valueOf(row, column.id);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(index === 0 ? "th" : "td", {
												...index === 0 ? { scope: "row" } : {},
												"data-missing": value === null || void 0,
												children: [index === 0 && outlier ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: data_table_module_css_default.outlierMark,
													title: "异常值",
													"aria-label": "异常值",
													children: "!"
												}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatValue(value, column) })]
											}, column.id);
										})
									}, row.id);
								}) })
							]
						}), visibleRows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: data_table_module_css_default.empty,
							children: "没有匹配的记录。"
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
						hint: "选择一行可在表格与图表中联动查看。",
						selected: selectedRow === void 0 ? void 0 : {
							label: content.columns.slice(0, 2).map((column) => formatValue(valueOf(selectedRow, column.id), column)).join(" · "),
							detail: selectedRow.detail ?? (outlierIds.has(selectedRow.id) ? "该记录被标记为异常值。" : void 0),
							kind: outlierIds.has(selectedRow.id) ? "异常记录" : "记录"
						},
						onClose: () => setSelectedRowId(void 0)
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/process.module.css.mjs
		const css$3 = ".yjamoq_processViewport{overscroll-behavior-inline:contain;border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-lg);background:var(--lx-surface-sunken);scrollbar-width:thin;min-width:0;position:relative;overflow-x:auto}.yjamoq_processSvg{touch-action:pan-y;min-width:100%;max-width:none;display:block;overflow:visible}.yjamoq_processSvg text{font-family:inherit}.yjamoq_processArrow path,.yjamoq_diagramArrow path,.yjamoq_causalArrow path{fill:var(--visual-tone);fill-opacity:var(--lx-vs-alpha)}.yjamoq_transitionGroup,.yjamoq_stateGroup,.yjamoq_messageGroup,.yjamoq_participantGroup,.yjamoq_causalLink,.yjamoq_causalVariable,.yjamoq_causalLoop{--visual-tone:var(--lx-accent);cursor:pointer;outline:none}.yjamoq_transitionLine{fill:none;stroke:var(--visual-tone);stroke-width:calc(1.7px + var(--lx-vs-ring) * .8px);stroke-opacity:var(--lx-vs-alpha);stroke-linecap:round;vector-effect:non-scaling-stroke;transition:stroke-opacity var(--lx-motion-fast) var(--lx-easing), stroke-width var(--lx-motion-fast) var(--lx-easing)}.yjamoq_transitionHit{fill:none;stroke:#0000;stroke-width:16px;pointer-events:stroke;vector-effect:non-scaling-stroke}.yjamoq_transitionLabel rect{fill:var(--lx-surface-base);stroke:color-mix(in srgb, var(--visual-tone) 34%, var(--lx-border-subtle));stroke-width:1px;vector-effect:non-scaling-stroke}.yjamoq_transitionLabel text{fill:var(--lx-label-primary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-medium);pointer-events:none}.yjamoq_stateRing{fill:none;stroke:var(--visual-tone);stroke-width:2px;stroke-opacity:calc(var(--lx-vs-ring) * .4);vector-effect:non-scaling-stroke;transition:stroke-opacity var(--lx-motion-fast) var(--lx-easing)}.yjamoq_stateShape{fill:color-mix(in srgb, var(--visual-tone) 10%, var(--lx-surface-base));fill-opacity:var(--lx-vs-alpha);stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:calc(1.6px + var(--lx-vs-ring) * 1.2px);vector-effect:non-scaling-stroke;transition:fill-opacity var(--lx-motion-fast) var(--lx-easing), stroke-width var(--lx-motion-fast) var(--lx-easing)}.yjamoq_stateLabel{fill:var(--lx-label-primary);font-size:var(--lx-text-xs);font-weight:var(--lx-weight-strong);opacity:var(--lx-vs-alpha);pointer-events:none}.yjamoq_stateMarker{fill:var(--visual-tone);font-size:9px;font-weight:var(--lx-weight-strong);letter-spacing:.05em;pointer-events:none}.yjamoq_currentStateMarker{fill:var(--visual-tone);stroke:var(--lx-surface-base);stroke-width:1.5px;vector-effect:non-scaling-stroke}.yjamoq_transitionGroup:hover .yjamoq_transitionLine,.yjamoq_transitionGroup:focus-visible .yjamoq_transitionLine,.yjamoq_transitionGroup[data-visual-state=selected] .yjamoq_transitionLine{stroke-opacity:1;stroke-width:3px}.yjamoq_stateGroup:hover .yjamoq_stateShape,.yjamoq_stateGroup:focus-visible .yjamoq_stateShape,.yjamoq_stateGroup[data-visual-state=selected] .yjamoq_stateShape,.yjamoq_stateGroup[data-visual-state=current] .yjamoq_stateShape{fill:color-mix(in srgb, var(--visual-tone) 20%, var(--lx-surface-base));fill-opacity:1;stroke-opacity:1;stroke-width:2.8px}.yjamoq_stateGroup[data-visual-state=current] .yjamoq_stateRing,.yjamoq_stateGroup[data-visual-state=selected] .yjamoq_stateRing{stroke-opacity:.58}.yjamoq_participantCard{fill:color-mix(in srgb, var(--visual-tone) 11%, var(--lx-surface-base));stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:1.5px;vector-effect:non-scaling-stroke}.yjamoq_participantLabel{fill:var(--lx-label-primary);font-size:var(--lx-text-xs);font-weight:var(--lx-weight-strong);pointer-events:none}.yjamoq_lifeline{fill:none;stroke:var(--visual-tone);stroke-dasharray:4 5;stroke-opacity:.58;stroke-width:1.2px;vector-effect:non-scaling-stroke}.yjamoq_activation{fill:color-mix(in srgb, var(--visual-tone) 16%, var(--lx-surface-base));stroke:var(--visual-tone);stroke-width:1.5px;vector-effect:non-scaling-stroke}.yjamoq_messageLine{fill:none;stroke:var(--visual-tone);stroke-width:1.8px;stroke-opacity:var(--lx-vs-alpha);vector-effect:non-scaling-stroke}.yjamoq_messageGroup[data-message-type=return] .yjamoq_messageLine{stroke-dasharray:7 5;stroke-opacity:.78}.yjamoq_messageGroup[data-message-type=async] .yjamoq_messageLine{stroke-dasharray:2 5}.yjamoq_messageGroup[data-stroke=dashed] .yjamoq_messageLine{stroke-dasharray:7 5}.yjamoq_messageHit{fill:none;stroke:#0000;stroke-width:16px;pointer-events:stroke;vector-effect:non-scaling-stroke}.yjamoq_messageLabel rect{fill:var(--lx-surface-base);stroke:color-mix(in srgb, var(--visual-tone) 30%, var(--lx-border-subtle));stroke-width:1px;vector-effect:non-scaling-stroke}.yjamoq_messageLabel text{fill:var(--lx-label-primary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-medium);pointer-events:none}.yjamoq_messageGroup[data-message-type=return] .yjamoq_messageLabel rect{stroke-dasharray:4 3}.yjamoq_messageGroup[data-message-type=async] .yjamoq_messageLabel rect{stroke-dasharray:1 3}.yjamoq_messageGroup:hover .yjamoq_messageLine,.yjamoq_messageGroup:focus-visible .yjamoq_messageLine,.yjamoq_messageGroup[data-visual-state=selected] .yjamoq_messageLine{stroke-width:3px;stroke-opacity:1}.yjamoq_participantGroup:hover .yjamoq_participantCard,.yjamoq_participantGroup:focus-visible .yjamoq_participantCard,.yjamoq_participantGroup[data-visual-state=selected] .yjamoq_participantCard,.yjamoq_participantGroup[data-visual-state=current] .yjamoq_participantCard{fill:color-mix(in srgb, var(--visual-tone) 22%, var(--lx-surface-base));stroke-width:2.6px;stroke-opacity:1}.yjamoq_participantGroup[data-visual-state=current] .yjamoq_participantCard{filter:drop-shadow(0 0 .2rem color-mix(in srgb, var(--visual-tone) 28%, transparent))}.yjamoq_causalLinkPath{fill:none;stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:calc(1.8px + var(--lx-vs-ring) * .7px);stroke-linecap:round;vector-effect:non-scaling-stroke;transition:stroke-width var(--lx-motion-fast) var(--lx-easing), stroke-opacity var(--lx-motion-fast) var(--lx-easing)}.yjamoq_causalLinkHit{fill:none;stroke:#0000;stroke-width:18px;pointer-events:stroke;vector-effect:non-scaling-stroke}.yjamoq_causalSign rect,.yjamoq_causalDelay rect{fill:var(--lx-surface-base);stroke:color-mix(in srgb, var(--visual-tone) 44%, var(--lx-border-subtle));stroke-width:1.2px;vector-effect:non-scaling-stroke;box-shadow:0 1px 3px #0000000f}.yjamoq_causalSign text,.yjamoq_causalDelay text,.yjamoq_causalLinkLabel{fill:var(--visual-tone);font-size:var(--lx-text-xs);font-weight:var(--lx-weight-strong)}.yjamoq_causalLabelGroup{pointer-events:none}.yjamoq_causalLabelBg{fill:var(--lx-surface-base);fill-opacity:.94;stroke:color-mix(in srgb, var(--visual-tone) 24%, var(--lx-border-subtle));stroke-width:1px}.yjamoq_causalLinkLabel{fill:var(--lx-label-primary);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-medium)}.yjamoq_causalVariableShape{fill:color-mix(in srgb, var(--visual-tone) 10%, var(--lx-surface-base));fill-opacity:var(--lx-vs-alpha);stroke:var(--visual-tone);stroke-opacity:var(--lx-vs-alpha);stroke-width:calc(1.6px + var(--lx-vs-ring) * 1.2px);vector-effect:non-scaling-stroke;transition:fill-opacity var(--lx-motion-fast) var(--lx-easing), stroke-width var(--lx-motion-fast) var(--lx-easing)}.yjamoq_causalVariableLabel{fill:var(--lx-label-primary);font-size:var(--lx-text-xs);font-weight:var(--lx-weight-strong);pointer-events:none}.yjamoq_causalLoopBadge rect{fill:color-mix(in srgb, var(--visual-tone) 14%, var(--lx-surface-base));stroke:var(--visual-tone);stroke-width:1.5px;vector-effect:non-scaling-stroke;filter:drop-shadow(0 2px 6px color-mix(in srgb, var(--visual-tone) 16%, transparent));transition:fill var(--lx-motion-fast) var(--lx-easing), stroke-width var(--lx-motion-fast) var(--lx-easing)}.yjamoq_causalLoopBadge text{fill:var(--visual-tone);font-size:var(--lx-text-micro);font-weight:var(--lx-weight-strong);letter-spacing:.02em;pointer-events:none}.yjamoq_causalLink:hover .yjamoq_causalLinkPath,.yjamoq_causalLink:focus-visible .yjamoq_causalLinkPath,.yjamoq_causalLink[data-visual-state=selected] .yjamoq_causalLinkPath{stroke-width:3px;stroke-opacity:1;filter:drop-shadow(0 0 4px var(--visual-tone))}.yjamoq_causalVariable:hover .yjamoq_causalVariableShape,.yjamoq_causalVariable:focus-visible .yjamoq_causalVariableShape,.yjamoq_causalVariable[data-visual-state=selected] .yjamoq_causalVariableShape,.yjamoq_causalVariable[data-visual-state=current] .yjamoq_causalVariableShape{fill:color-mix(in srgb, var(--visual-tone) 24%, var(--lx-surface-base));fill-opacity:1;stroke-width:2.8px;stroke-opacity:1;filter:drop-shadow(0 0 6px color-mix(in srgb, var(--visual-tone) 30%, transparent))}.yjamoq_causalLoop:hover .yjamoq_causalLoopBadge rect,.yjamoq_causalLoop:focus-visible .yjamoq_causalLoopBadge rect,.yjamoq_causalLoop[data-visual-state=selected] .yjamoq_causalLoopBadge rect{fill:color-mix(in srgb, var(--visual-tone) 26%, var(--lx-surface-base));stroke-width:2.2px;filter:drop-shadow(0 0 8px color-mix(in srgb, var(--visual-tone) 36%, transparent))}.yjamoq_causalLoopBadge[data-loop-kind=balancing] rect{stroke-dasharray:5 3}.yjamoq_processSteps{gap:var(--lx-space-xs);margin:0;padding:0;list-style:none;display:grid}.yjamoq_processSteps li{gap:var(--lx-space-3xs);border-left:3px solid var(--lx-border-default);padding:var(--lx-space-xs) var(--lx-space-md);color:var(--lx-label-secondary);font-size:var(--lx-text-2xs);display:grid}.yjamoq_processSteps li[data-active]{border-left-color:var(--lx-accent);background:color-mix(in srgb, var(--lx-accent) 7%, transparent)}.yjamoq_processSteps strong{color:var(--lx-label-primary);font-weight:var(--lx-weight-strong)}.yjamoq_stepButton{justify-items:start;gap:var(--lx-space-3xs);text-align:left;background:0 0;border-color:#0000;width:100%;display:grid}.yjamoq_stepButton span{color:var(--lx-label-secondary);font-size:var(--lx-text-2xs);line-height:var(--lx-leading-2xs)}@media (width<=560px){.yjamoq_processSvg{min-width:520px}}@media (prefers-reduced-motion:reduce){.yjamoq_transitionLine,.yjamoq_stateShape,.yjamoq_stateRing,.yjamoq_messageLine,.yjamoq_causalLinkPath{transition:none}}@media (forced-colors:active){.yjamoq_stateShape,.yjamoq_participantCard,.yjamoq_causalVariableShape{fill:canvas;stroke:canvastext}.yjamoq_transitionLine,.yjamoq_messageLine,.yjamoq_causalLinkPath{stroke:canvastext}.yjamoq_stateGroup[data-visual-state=current] .yjamoq_stateShape,.yjamoq_participantGroup[data-visual-state=current] .yjamoq_participantCard,.yjamoq_causalVariable[data-visual-state=current] .yjamoq_causalVariableShape{fill:highlight}}";
		const tagId$3 = "@dsh-portable/interactive-learning/process.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var process_module_css_default = {
			"activation": "yjamoq_activation",
			"causalArrow": "yjamoq_causalArrow",
			"causalDelay": "yjamoq_causalDelay",
			"causalLabelBg": "yjamoq_causalLabelBg",
			"causalLabelGroup": "yjamoq_causalLabelGroup",
			"causalLink": "yjamoq_causalLink",
			"causalLinkHit": "yjamoq_causalLinkHit",
			"causalLinkLabel": "yjamoq_causalLinkLabel",
			"causalLinkPath": "yjamoq_causalLinkPath",
			"causalLoop": "yjamoq_causalLoop",
			"causalLoopBadge": "yjamoq_causalLoopBadge",
			"causalSign": "yjamoq_causalSign",
			"causalVariable": "yjamoq_causalVariable",
			"causalVariableLabel": "yjamoq_causalVariableLabel",
			"causalVariableShape": "yjamoq_causalVariableShape",
			"currentStateMarker": "yjamoq_currentStateMarker",
			"diagramArrow": "yjamoq_diagramArrow",
			"lifeline": "yjamoq_lifeline",
			"messageGroup": "yjamoq_messageGroup",
			"messageHit": "yjamoq_messageHit",
			"messageLabel": "yjamoq_messageLabel",
			"messageLine": "yjamoq_messageLine",
			"participantCard": "yjamoq_participantCard",
			"participantGroup": "yjamoq_participantGroup",
			"participantLabel": "yjamoq_participantLabel",
			"processArrow": "yjamoq_processArrow",
			"processSteps": "yjamoq_processSteps",
			"processSvg": "yjamoq_processSvg",
			"processViewport": "yjamoq_processViewport",
			"stateGroup": "yjamoq_stateGroup",
			"stateLabel": "yjamoq_stateLabel",
			"stateMarker": "yjamoq_stateMarker",
			"stateRing": "yjamoq_stateRing",
			"stateShape": "yjamoq_stateShape",
			"stepButton": "yjamoq_stepButton",
			"transitionGroup": "yjamoq_transitionGroup",
			"transitionHit": "yjamoq_transitionHit",
			"transitionLabel": "yjamoq_transitionLabel",
			"transitionLine": "yjamoq_transitionLine"
		};
		//#endregion
		//#region src/client/visuals/renderers/StateTransitionRenderer.tsx
		/**
		* `state_transition`: a state machine whose current state is visible.
		*
		* This is intentionally a small diagram renderer.  States and transitions
		* remain real, keyboard reachable marks, while trigger/guard/action are kept
		* on the transition so the learner can inspect the rule without leaving the
		* figure.  The renderer also understands the common `nodes`/`edges` aliases;
		* that makes hand-written examples easy to migrate from a node-link payload.
		*/
		const STATE_WIDTH = 150;
		const STATE_HEIGHT = 60;
		const STATE_GAP = 112;
		const SIDE_PADDING = 28;
		const ROW_HEIGHT = 122;
		function transitionLabelLayout(label) {
			const lines = wrapLabel(label, {
				fontSize: 11,
				maxWidth: 220,
				maxLines: 2
			}).lines;
			return {
				width: Math.min(244, Math.max(92, Math.max(...lines.map((line) => measureText(line, 11)), 0) + 20)),
				height: lines.length > 1 ? 34 : 26,
				lines
			};
		}
		function edgeFrom(edge) {
			return edge.from;
		}
		function edgeTo(edge) {
			return edge.to;
		}
		function stateDetail(state) {
			return state.detail;
		}
		function edgeDetail(edge) {
			const parts = [
				`Trigger: ${edge.trigger}`,
				edge.guard === void 0 ? void 0 : `Guard: ${edge.guard}`,
				edge.action === void 0 ? void 0 : `Action: ${edge.action}`,
				edge.detail
			].filter((part) => part !== void 0 && part.length > 0);
			return parts.length === 0 ? void 0 : parts.join(" · ");
		}
		function edgeCaption(edge) {
			return [
				edge.trigger,
				edge.guard === void 0 ? void 0 : `[${edge.guard}]`,
				edge.action === void 0 ? void 0 : `/ ${edge.action}`
			].filter((part) => part !== void 0 && part.length > 0).join(" ");
		}
		function orderedStates(content) {
			return [...content.states].sort((left, right) => {
				return (left.initial === true ? 0 : 1) - (right.initial === true ? 0 : 1);
			});
		}
		function layoutStates(states, width) {
			const perRow = Math.max(1, Math.floor((Math.max(width, 360) - 56 + STATE_GAP) / 262));
			const rows = Math.max(1, Math.ceil(states.length / perRow));
			const canvasWidth = Math.max(Math.max(width, 360), 56 + perRow * STATE_WIDTH + (perRow - 1) * STATE_GAP);
			const canvasHeight = 56 + rows * STATE_HEIGHT + (rows - 1) * 62;
			const boxes = /* @__PURE__ */ new Map();
			states.forEach((state, index) => {
				const row = Math.floor(index / perRow);
				const column = index % perRow;
				const rowCount = Math.min(perRow, states.length - row * perRow);
				const rowWidth = rowCount * STATE_WIDTH + Math.max(0, rowCount - 1) * STATE_GAP;
				const start = (canvasWidth - rowWidth) / 2;
				boxes.set(state.id, {
					x: start + column * 262 + STATE_WIDTH / 2,
					y: SIDE_PADDING + row * ROW_HEIGHT + STATE_HEIGHT / 2,
					width: STATE_WIDTH,
					height: STATE_HEIGHT
				});
			});
			return {
				width: canvasWidth,
				height: canvasHeight,
				boxes
			};
		}
		function stateVisualState(id, focus, currentStateId, related = []) {
			if (focus.active) return elementState(id, focus, related);
			return id === currentStateId ? "current" : "overview";
		}
		function StateTransitionRenderer({ content, focus }) {
			const diagramId = (0, react.useId)();
			const [viewportRef, containerWidth] = useContainerWidth();
			const [selected, setSelected] = (0, react.useState)();
			const [activeStepId, setActiveStepId] = (0, react.useState)(content.steps?.[0]?.id);
			const states = (0, react.useMemo)(() => orderedStates(content), [content]);
			const transitions = (0, react.useMemo)(() => [...content.transitions], [content]);
			const layout = (0, react.useMemo)(() => layoutStates(states, containerWidth), [containerWidth, states]);
			const stateById = (0, react.useMemo)(() => new Map(states.map((state) => [state.id, state])), [states]);
			const currentStateId = content.steps?.find((step) => step.id === activeStepId)?.currentStateId;
			const currentTransitionId = content.steps?.find((step) => step.id === activeStepId)?.transitionId;
			const initialStateId = states.find((state) => state.initial === true)?.id;
			const terminalIds = (0, react.useMemo)(() => new Set(states.filter((state) => state.final === true).map((state) => state.id)), [states]);
			const roving = useRovingFocus((0, react.useMemo)(() => [...states.map((state) => state.id), ...transitions.map((edge) => edge.id)], [states, transitions]));
			const selectState = (state) => setSelected({
				label: state.label,
				detail: stateDetail(state),
				kind: state.id === initialStateId || state.initial === true ? "Initial state" : terminalIds.has(state.id) ? "Terminal state" : "State",
				tone: toneAt(state.tone)
			});
			const selectTransition = (edge) => {
				const from = stateById.get(edgeFrom(edge) ?? "")?.label ?? edgeFrom(edge) ?? "State";
				const to = stateById.get(edgeTo(edge) ?? "")?.label ?? edgeTo(edge) ?? "State";
				setSelected({
					label: edgeCaption(edge) || `${from} → ${to}`,
					detail: edgeDetail(edge) ?? `${from} → ${to}`,
					kind: "Transition",
					tone: toneAt(edge.tone)
				});
			};
			const summary = `State transition diagram with ${states.length} states and ${transitions.length} transitions.`;
			const legendStates = (0, react.useMemo)(() => focus.active ? states.map((state) => stateVisualState(state.id, focus, currentStateId)) : [], [
				currentStateId,
				focus,
				states
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: process_module_css_default.processViewport,
						ref: viewportRef,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							ref: roving.containerRef,
							className: process_module_css_default.processSvg,
							width: layout.width,
							height: layout.height,
							viewBox: `0 0 ${layout.width} ${layout.height}`,
							role: "group",
							"aria-label": summary,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: DEFAULT_TONES.map((tone) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
									id: `${diagramId}-${tone}`,
									className: process_module_css_default.processArrow,
									"data-tone": tone,
									markerWidth: "8",
									markerHeight: "8",
									refX: "7",
									refY: "4",
									orient: "auto",
									markerUnits: "strokeWidth",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0,0 L8,4 L0,8 z" })
								}, tone)) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
									className: process_module_css_default.transitionLayer,
									children: transitions.map((edge, index) => {
										const from = layout.boxes.get(edgeFrom(edge) ?? "");
										const to = layout.boxes.get(edgeTo(edge) ?? "");
										if (from === void 0 || to === void 0) return null;
										const sameRow = Math.abs(from.y - to.y) < 1;
										const hasReverse = transitions.some((other) => other.id !== edge.id && edgeFrom(other) === edgeTo(edge) && edgeTo(other) === edgeFrom(edge));
										const isForward = to.x >= from.x;
										let path = "";
										let labelX = (from.x + to.x) / 2;
										let labelY = (from.y + to.y) / 2;
										if (sameRow) {
											if (isForward) {
												const startX = from.x + from.width / 2;
												const endX = to.x - to.width / 2;
												const startY = from.y;
												const endY = to.y;
												if (hasReverse) {
													const curveY = startY - 26;
													path = `M ${startX} ${startY} Q ${(startX + endX) / 2} ${curveY} ${endX} ${endY}`;
													labelX = (startX + endX) / 2;
													labelY = curveY - 10;
												} else {
													path = `M ${startX} ${startY} L ${endX} ${endY}`;
													labelX = (startX + endX) / 2;
													labelY = startY - 14;
												}
											} else {
												const startX = from.x - from.width / 2;
												const endX = to.x + to.width / 2;
												const startY = from.y;
												const endY = to.y;
												const curveY = startY + 36;
												path = `M ${startX} ${startY} Q ${(startX + endX) / 2} ${curveY} ${endX} ${endY}`;
												labelX = (startX + endX) / 2;
												labelY = curveY + 14;
											}
										} else {
											const startX = isForward ? from.x + from.width / 2 : from.x;
											const endX = isForward ? to.x - to.width / 2 : to.x;
											const startY = from.y + from.height / 2;
											const endY = to.y - to.height / 2;
											const direction = isForward ? 1 : -1;
											path = `M ${startX} ${startY} C ${startX + direction * 50} ${startY + 24}, ${endX - direction * 50} ${endY - 24}, ${endX} ${endY}`;
											labelX = (startX + endX) / 2;
											labelY = (startY + endY) / 2;
										}
										const state = focus.active ? elementState(edge.id, focus, [edgeFrom(edge), edgeTo(edge)]) : edge.id === currentTransitionId ? "current" : "overview";
										const tone = toneAt(edge.tone, index);
										const caption = edgeCaption(edge);
										const diagramCaption = caption;
										const labelLayout = transitionLabelLayout(diagramCaption);
										labelY += (index % 3 - 1) * 14;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											className: process_module_css_default.transitionGroup,
											"data-tone": tone,
											"data-visual-id": edge.id,
											"data-visual-state": state,
											role: "button",
											"aria-label": `Transition ${caption || `${edgeFrom(edge)} to ${edgeTo(edge)}`}`,
											onClick: () => selectTransition(edge),
											...roving.itemProps(edge.id, () => selectTransition(edge)),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													className: process_module_css_default.transitionLine,
													d: path,
													markerEnd: `url(#${diagramId}-${tone})`
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
													className: process_module_css_default.transitionHit,
													d: path
												}),
												diagramCaption === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
													className: process_module_css_default.transitionLabel,
													transform: `translate(${labelX} ${labelY})`,
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
														x: -labelLayout.width / 2,
														y: -labelLayout.height / 2,
														width: labelLayout.width,
														height: labelLayout.height,
														rx: "9"
													}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
														textAnchor: "middle",
														dominantBaseline: "middle",
														children: labelLayout.lines.map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
															x: "0",
															dy: lineIndex === 0 ? labelLayout.lines.length > 1 ? "-0.55em" : "0.34em" : "1.1em",
															children: line
														}, lineIndex))
													})]
												})
											]
										}, edge.id);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: states.map((state, index) => {
									const box = layout.boxes.get(state.id);
									if (box === void 0) return null;
									const tone = toneAt(state.tone, index);
									const related = transitions.flatMap((edge) => edgeFrom(edge) === state.id ? [edgeTo(edge)] : edgeTo(edge) === state.id ? [edgeFrom(edge)] : []);
									const isCurrent = state.id === currentStateId;
									const visualState = isCurrent ? "current" : stateVisualState(state.id, focus, currentStateId, related);
									const isInitial = state.id === initialStateId || state.initial === true;
									const isTerminal = terminalIds.has(state.id);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: process_module_css_default.stateGroup,
										transform: `translate(${box.x} ${box.y})`,
										"data-tone": tone,
										"data-visual-id": state.id,
										"data-visual-state": selected?.label === state.label ? "selected" : visualState,
										"data-initial": isInitial || void 0,
										"data-terminal": isTerminal || void 0,
										"aria-current": isCurrent ? "step" : void 0,
										role: "button",
										"aria-label": `${state.label}${state.detail === void 0 ? "" : `。${state.detail}`}`,
										onClick: () => selectState(state),
										...roving.itemProps(state.id, () => selectState(state)),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: process_module_css_default.stateRing,
												x: -box.width / 2 - 4,
												y: -box.height / 2 - 4,
												width: box.width + 8,
												height: box.height + 8,
												rx: "14"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: process_module_css_default.stateShape,
												x: -box.width / 2,
												y: -box.height / 2,
												width: box.width,
												height: box.height,
												rx: "12"
											}),
											isCurrent ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: process_module_css_default.currentStateMarker,
												d: `M 0 ${-box.height / 2 - 16} l -7 8 h 14 z`
											}) : null,
											!isTerminal ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x: -box.width / 2 + 4,
												y: -box.height / 2 + 4,
												width: box.width - 8,
												height: box.height - 8,
												rx: "8",
												fill: "none",
												stroke: "var(--visual-tone)",
												strokeWidth: "1.2",
												opacity: "0.75"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: process_module_css_default.stateLabel,
												textAnchor: "middle",
												dominantBaseline: "middle",
												children: state.label
											}),
											!isInitial ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: process_module_css_default.stateMarker,
												transform: `translate(${-box.width / 2 - 18} 0)`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
													cx: "-6",
													cy: "0",
													r: "4",
													fill: "var(--visual-tone)"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
													x1: "-2",
													y1: "0",
													x2: "10",
													y2: "0",
													stroke: "var(--visual-tone)",
													strokeWidth: "1.8",
													markerEnd: `url(#${diagramId}-${tone})`
												})]
											}),
											state.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: state.detail })
										]
									}, state.id);
								}) })
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateLegend, { states: legendStates }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shell_module_css_default.srOnly,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: summary }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", { children: [states.map((state) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [state.label, state.detail === void 0 ? "" : `: ${state.detail}`] }, state.id)), transitions.map((edge) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [edgeCaption(edge) || edge.id, edgeDetail(edge) === void 0 ? "" : `: ${edgeDetail(edge)}`] }, edge.id))] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
						hint: "Select a state or transition to inspect its rule.",
						selected,
						onClose: () => setSelected(void 0)
					}),
					content.steps === void 0 || content.steps.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
						className: process_module_css_default.processSteps,
						"aria-label": "State transition steps",
						children: content.steps.map((step) => {
							const active = focus.active ? focus.currentIds.has(step.currentStateId) : step.id === activeStepId;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
								"data-active": active || void 0,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `${shell_module_css_default.control} ${process_module_css_default.stepButton}`,
									onClick: () => setActiveStepId(step.id),
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: step.label }), step.description === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: step.description })]
								})
							}, step.id);
						})
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/sequence-buffer.module.css.mjs
		const css$2 = ".blGfpW_viewport{border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-md);width:100%;padding:var(--lx-space-md);background:var(--lx-surface-sunken);overflow-x:auto}.blGfpW_buffer{grid-template-columns:repeat(var(--buffer-columns), minmax(64px, 1fr));gap:var(--lx-space-xs);align-items:end;min-width:max-content;display:grid}.blGfpW_range{justify-content:space-between;align-items:center;gap:var(--lx-space-sm);border:1.5px solid color-mix(in srgb, var(--visual-tone) 58%, var(--lx-border-default));border-radius:var(--lx-radius-pill);min-height:34px;padding:var(--lx-space-3xs) var(--lx-space-sm);background:color-mix(in srgb, var(--visual-tone) 12%, var(--lx-surface-base));color:var(--lx-label-primary);font:inherit;font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-medium);overflow-wrap:anywhere;opacity:var(--lx-vs-alpha);cursor:pointer;transition:transform var(--lx-motion-fast) var(--lx-easing), box-shadow var(--lx-motion-fast) var(--lx-easing);display:flex;box-shadow:0 1px 3px #0000000d}.blGfpW_range span{overflow-wrap:anywhere;min-width:0}.blGfpW_range small{color:var(--lx-label-tertiary);font-variant-numeric:tabular-nums;flex:none}.blGfpW_range[data-visual-state=current],.blGfpW_range[data-visual-state=selected]{box-shadow:0 0 8px color-mix(in srgb, var(--visual-tone) 36%, transparent);border-width:2px}.blGfpW_slotGrid,.blGfpW_pointerGrid{grid-column:1/-1;grid-template-columns:repeat(var(--buffer-columns), minmax(64px, 1fr));gap:var(--lx-space-xs);display:grid}.blGfpW_slot{grid-template-rows:minmax(var(--lx-leading-micro), auto) 1fr var(--lx-leading-micro);gap:var(--lx-space-3xs);border:1.2px solid color-mix(in srgb, var(--visual-tone) 38%, var(--lx-border-subtle));border-radius:var(--lx-radius-md);min-width:64px;min-height:80px;padding:var(--lx-space-xs);background:color-mix(in srgb, var(--visual-tone) 8%, var(--lx-surface-base));color:var(--lx-label-primary);font:inherit;text-align:center;opacity:var(--lx-vs-alpha);cursor:pointer;transition:border-color var(--lx-motion-fast) var(--lx-easing), transform var(--lx-motion-fast) var(--lx-easing), box-shadow var(--lx-motion-fast) var(--lx-easing);align-items:center;display:grid;box-shadow:0 1px 3px #0000000a}.blGfpW_slot:hover,.blGfpW_pointer:hover,.blGfpW_range:hover{border-color:var(--visual-tone);box-shadow:0 0 8px color-mix(in srgb, var(--visual-tone) 24%, transparent)}.blGfpW_slot[data-visual-state=current],.blGfpW_slot[data-visual-state=selected]{border-width:2px;border-color:var(--visual-tone);box-shadow:0 0 10px color-mix(in srgb, var(--visual-tone) 32%, transparent)}.blGfpW_slot small{min-height:var(--lx-leading-micro);color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);line-height:var(--lx-leading-micro);font-weight:var(--lx-weight-medium)}.blGfpW_slot strong{overflow-wrap:anywhere;color:var(--visual-tone);font-size:var(--lx-text-base);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-sm)}.blGfpW_slot>span{border-radius:var(--lx-radius-xs);background:var(--lx-surface-sunken);color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums;padding:1px 4px;display:inline-block}.blGfpW_slot[data-missing] strong{color:var(--lx-label-tertiary);font-weight:var(--lx-weight-regular)}.blGfpW_pointerGrid{align-items:start;row-gap:var(--lx-space-xs);grid-auto-rows:minmax(34px,auto)}.blGfpW_pointer{border-radius:var(--lx-radius-sm);min-width:0;padding:2px var(--lx-space-3xs) var(--lx-space-3xs);color:var(--visual-tone);font:inherit;font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-strong);opacity:var(--lx-vs-alpha);cursor:pointer;transition:transform var(--lx-motion-fast) var(--lx-easing);background:0 0;border:1px solid #0000;justify-items:center;gap:2px;display:grid}.blGfpW_pointer i{font-size:var(--lx-text-base);filter:drop-shadow(0 0 2px var(--visual-tone));font-style:normal;line-height:1}.blGfpW_pointer span{overflow-wrap:anywhere;text-align:center;max-width:100%}.blGfpW_pointer small{color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums}.blGfpW_pointer[data-visual-state=current],.blGfpW_pointer[data-visual-state=selected]{background:color-mix(in srgb, var(--visual-tone) 12%, var(--lx-surface-base));border-color:color-mix(in srgb, var(--visual-tone) 40%, transparent)}";
		const tagId$2 = "@dsh-portable/interactive-learning/sequence-buffer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var sequence_buffer_module_css_default = {
			"buffer": "blGfpW_buffer",
			"pointer": "blGfpW_pointer",
			"pointerGrid": "blGfpW_pointerGrid",
			"range": "blGfpW_range",
			"slot": "blGfpW_slot",
			"slotGrid": "blGfpW_slotGrid",
			"viewport": "blGfpW_viewport"
		};
		//#endregion
		//#region src/client/visuals/renderers/SequenceBufferRenderer.tsx
		/** `sequence_buffer`: discrete slots, pointers and ranges with local step playback. */
		function displayValue(value) {
			if (value === null) return "∅";
			if (typeof value === "boolean") return value ? "true" : "false";
			if (typeof value === "number") return formatNumber(value);
			return value;
		}
		function steppedContent(content, stepIndex) {
			const slotValues = new Map(content.slots.map((slot) => [slot.id, slot.value]));
			const pointerIndexes = new Map((content.pointers ?? []).map((pointer) => [pointer.id, pointer.index]));
			const rangeBounds = new Map((content.ranges ?? []).map((range) => [range.id, {
				start: range.start,
				end: range.end
			}]));
			for (const step of (content.steps ?? []).slice(0, stepIndex + 1)) {
				for (const snapshot of step.slots ?? []) if (snapshot.value !== void 0) slotValues.set(snapshot.slotId, snapshot.value);
				for (const snapshot of step.pointers ?? []) pointerIndexes.set(snapshot.pointerId, snapshot.index);
				for (const snapshot of step.ranges ?? []) rangeBounds.set(snapshot.rangeId, {
					start: snapshot.start,
					end: snapshot.end
				});
			}
			return {
				slotValues,
				pointerIndexes,
				rangeBounds
			};
		}
		function SequenceBufferRenderer({ content, focus }) {
			const [stepIndex, setStepIndex] = (0, react.useState)(0);
			const [selected, setSelected] = (0, react.useState)();
			const slots = (0, react.useMemo)(() => [...content.slots].sort((left, right) => left.index - right.index), [content.slots]);
			const slotOrder = (0, react.useMemo)(() => new Map(slots.map((slot, index) => [slot.index, index + 1])), [slots]);
			const current = steppedContent(content, stepIndex);
			const gridStyle = { "--buffer-columns": String(Math.max(1, slots.length)) };
			const steps = content.steps ?? [];
			const sequence = (0, react.useMemo)(() => ({
				initialFrameId: steps[0]?.id,
				frames: steps.map((step) => ({
					id: step.id,
					label: step.label,
					description: step.description,
					focusIds: []
				}))
			}), [steps]);
			const columnAt = (index) => slotOrder.get(index) ?? Math.max(1, Math.min(slots.length, index + 1));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					steps.length < 2 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SequenceController, {
						sequence,
						frameIndex: stepIndex,
						onFrameChange: setStepIndex
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: sequence_buffer_module_css_default.viewport,
						role: "group",
						"aria-label": "序列缓冲区",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: sequence_buffer_module_css_default.buffer,
							style: gridStyle,
							children: [
								(content.ranges ?? []).map((range, rangeIndex) => {
									const bounds = current.rangeBounds.get(range.id) ?? range;
									const start = columnAt(Math.min(bounds.start, bounds.end));
									const end = columnAt(Math.max(bounds.start, bounds.end));
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: sequence_buffer_module_css_default.range,
										style: {
											gridColumn: `${String(start)} / span ${String(Math.max(1, end - start + 1))}`,
											gridRow: String(rangeIndex + 1)
										},
										"data-tone": toneAt(range.tone, rangeIndex),
										"data-visual-id": range.id,
										"data-visual-state": selected?.id === range.id ? "selected" : elementState(range.id, focus),
										onClick: () => setSelected({
											id: range.id,
											label: range.label,
											detail: `${String(bounds.start)} … ${String(bounds.end)}`,
											kind: "区间"
										}),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: range.label }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [
											bounds.start,
											"…",
											bounds.end
										] })]
									}, range.id);
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: sequence_buffer_module_css_default.slotGrid,
									style: gridStyle,
									children: slots.map((slot, index) => {
										const value = current.slotValues.has(slot.id) ? current.slotValues.get(slot.id) ?? null : slot.value;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: sequence_buffer_module_css_default.slot,
											"data-tone": toneAt(slot.tone, index),
											"data-visual-id": slot.id,
											"data-visual-state": selected?.id === slot.id ? "selected" : elementState(slot.id, focus),
											"data-missing": value === null || void 0,
											onClick: () => setSelected({
												id: slot.id,
												label: slot.label ?? `[${String(slot.index)}]`,
												detail: displayValue(value),
												kind: "槽位"
											}),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: slot.label }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: displayValue(value) }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: slot.index })
											]
										}, slot.id);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: sequence_buffer_module_css_default.pointerGrid,
									style: gridStyle,
									children: (content.pointers ?? []).map((pointer, pointerIndex) => {
										const index = current.pointerIndexes.get(pointer.id) ?? pointer.index;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: sequence_buffer_module_css_default.pointer,
											style: {
												gridColumn: columnAt(index),
												gridRow: String(pointerIndex + 1)
											},
											"data-tone": toneAt(pointer.tone, pointerIndex),
											"data-visual-id": pointer.id,
											"data-visual-state": selected?.id === pointer.id ? "selected" : elementState(pointer.id, focus),
											onClick: () => setSelected({
												id: pointer.id,
												label: pointer.label,
												detail: `index ${String(index)}`,
												kind: "指针"
											}),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
													"aria-hidden": "true",
													children: "↑"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: pointer.label }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: index })
											]
										}, pointer.id);
									})
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
						hint: "选择槽位、指针或区间查看当前步骤中的值。",
						selected,
						onClose: () => setSelected(void 0)
					})
				]
			});
		}
		//#endregion
		//#region src/client/visuals/renderers/SequenceDiagramRenderer.tsx
		/** `sequence_diagram`: participants, lifelines and ordered messages. */
		const CARD_WIDTH = 128;
		const CARD_HEIGHT = 42;
		const MIN_ACTOR_GAP = 174;
		const SIDE_MARGIN = 72;
		const LIFELINE_TOP = 74;
		const MESSAGE_TOP = 108;
		const MESSAGE_GAP = 68;
		function messageLabelWidth(label) {
			return Math.min(250, Math.max(72, label.length * 7 + 24));
		}
		function messageDetail(message, participants) {
			return [
				`${participants.get(message.from)?.label ?? message.from} → ${participants.get(message.to)?.label ?? message.to}`,
				message.type,
				message.detail
			].filter((part) => part !== void 0 && part.length > 0).join(" · ");
		}
		function SequenceDiagramRenderer({ content, focus }) {
			const diagramId = (0, react.useId)();
			const [viewportRef, containerWidth] = useContainerWidth();
			const [selected, setSelected] = (0, react.useState)();
			const participants = content.participants;
			const messages = content.messages;
			const participantById = (0, react.useMemo)(() => new Map(participants.map((participant) => [participant.id, participant])), [participants]);
			const width = Math.max(520, containerWidth, 144 + Math.max(0, participants.length - 1) * MIN_ACTOR_GAP);
			const actorGap = participants.length <= 1 ? 0 : (width - 144) / (participants.length - 1);
			const height = Math.max(150, MESSAGE_TOP + messages.length * MESSAGE_GAP + 36);
			const participantX = (index) => participants.length <= 1 ? width / 2 : SIDE_MARGIN + index * actorGap;
			const participantIndex = (0, react.useMemo)(() => new Map(participants.map((participant, index) => [participant.id, index])), [participants]);
			const roving = useRovingFocus((0, react.useMemo)(() => [...participants.map((participant) => participant.id), ...messages.map((message) => message.id)], [messages, participants]));
			const selectParticipant = (participant) => setSelected({
				label: participant.label,
				detail: participant.detail,
				kind: "Participant",
				tone: toneAt(participant.tone)
			});
			const selectMessage = (message) => setSelected({
				label: message.label,
				detail: messageDetail(message, participantById),
				kind: "Message",
				tone: toneAt(message.tone)
			});
			const summary = `Sequence diagram with ${participants.length} participants and ${messages.length} messages.`;
			const legendStates = (0, react.useMemo)(() => focus.active ? [...participants, ...messages].map((item) => elementState(item.id, focus)) : [], [
				focus,
				messages,
				participants
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: process_module_css_default.processViewport,
						ref: viewportRef,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							ref: roving.containerRef,
							className: process_module_css_default.processSvg,
							width,
							height,
							viewBox: `0 0 ${width} ${height}`,
							role: "group",
							"aria-label": summary,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: DEFAULT_TONES.map((tone) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
									id: `${diagramId}-${tone}`,
									className: process_module_css_default.diagramArrow,
									"data-tone": tone,
									markerWidth: "8",
									markerHeight: "8",
									refX: "7",
									refY: "4",
									orient: "auto",
									markerUnits: "strokeWidth",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0,0 L8,4 L0,8 z" })
								}, tone)) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
									"aria-hidden": "true",
									children: participants.map((participant, index) => {
										const x = participantX(index);
										const tone = toneAt(participant.tone, index);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											className: process_module_css_default.lifeline,
											"data-tone": tone,
											x1: x,
											y1: LIFELINE_TOP,
											x2: x,
											y2: height - 18
										}, participant.id);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
									"aria-hidden": "true",
									children: messages.map((message, index) => {
										const toIndex = participantIndex.get(message.to);
										if (toIndex === void 0) return null;
										const x = participantX(toIndex);
										const y = MESSAGE_TOP + index * MESSAGE_GAP;
										const tone = toneAt(message.tone, index);
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: process_module_css_default.activation,
											"data-tone": tone,
											x: x - 6,
											y: y - 8,
											width: "12",
											height: "36",
											rx: "4"
										}, `act-${message.id}`);
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: messages.map((message, index) => {
									const fromIndex = participantIndex.get(message.from);
									const toIndex = participantIndex.get(message.to);
									if (fromIndex === void 0 || toIndex === void 0) return null;
									const fromX = participantX(fromIndex);
									const toX = participantX(toIndex);
									const y = MESSAGE_TOP + index * MESSAGE_GAP;
									const tone = toneAt(message.tone, index);
									const state = focus.active ? elementState(message.id, focus, [message.from, message.to]) : "overview";
									const self = message.type === "self" || message.from === message.to;
									const startX = self ? fromX : fromX;
									const endX = self ? fromX : toX;
									const selfRadius = Math.min(84, Math.max(36, actorGap * .42));
									const path = self ? `M ${fromX} ${y} C ${fromX + selfRadius} ${y - 24}, ${fromX + selfRadius} ${y + 26}, ${fromX} ${y + 28}` : `M ${startX} ${y} L ${endX} ${y}`;
									const labelX = self ? fromX + selfRadius + 8 : (fromX + toX) / 2;
									const labelY = self ? y - 14 : y - 12;
									const boxWidth = messageLabelWidth(message.label);
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: process_module_css_default.messageGroup,
										"data-tone": tone,
										"data-message-type": message.type,
										"data-visual-id": message.id,
										"data-visual-state": state,
										role: "button",
										"aria-label": `Message ${message.label}: ${messageDetail(message, participantById)}`,
										onClick: () => selectMessage(message),
										...roving.itemProps(message.id, () => selectMessage(message)),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: process_module_css_default.messageLine,
												d: path,
												markerEnd: `url(#${diagramId}-${tone})`
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: process_module_css_default.messageHit,
												d: path
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: process_module_css_default.messageLabel,
												transform: `translate(${labelX} ${labelY})`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: -boxWidth / 2,
													y: "-13",
													width: boxWidth,
													height: "26",
													rx: "9"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
													textAnchor: "middle",
													dominantBaseline: "middle",
													children: message.label
												})]
											}),
											message.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: message.detail })
										]
									}, message.id);
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: participants.map((participant, index) => {
									const x = participantX(index);
									const tone = toneAt(participant.tone, index);
									const state = focus.active ? elementState(participant.id, focus) : "overview";
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: process_module_css_default.participantGroup,
										transform: `translate(${x} 39)`,
										"data-tone": tone,
										"data-visual-id": participant.id,
										"data-visual-state": selected?.label === participant.label ? "selected" : state,
										role: "button",
										"aria-label": `Participant: ${participant.label}`,
										onClick: () => selectParticipant(participant),
										...roving.itemProps(participant.id, () => selectParticipant(participant)),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: process_module_css_default.participantCard,
												x: -64,
												y: -21,
												width: CARD_WIDTH,
												height: CARD_HEIGHT,
												rx: "11"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: process_module_css_default.participantLabel,
												textAnchor: "middle",
												dominantBaseline: "middle",
												children: participant.label
											}),
											participant.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: participant.detail })
										]
									}, participant.id);
								}) })
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateLegend, { states: legendStates }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shell_module_css_default.srOnly,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: summary }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", { children: messages.map((message) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							messageDetail(message, participantById),
							": ",
							message.label
						] }, message.id)) })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
						hint: "Select a participant or message to inspect the interaction.",
						selected,
						onClose: () => setSelected(void 0)
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/code-trace.module.css.mjs
		const css$1 = ".fRUyxG_workspace{gap:var(--lx-space-md);grid-template-columns:minmax(0,1.65fr) minmax(220px,.85fr);align-items:start;display:grid}.fRUyxG_source,.fRUyxG_panel{border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-md);background:var(--lx-surface-base);min-width:0;overflow:hidden}.fRUyxG_source>header{justify-content:space-between;align-items:center;gap:var(--lx-space-md);border-bottom:1px solid var(--lx-border-subtle);padding:var(--lx-space-sm) var(--lx-space-md);background:var(--lx-surface-sunken);display:flex}.fRUyxG_source>header span{border-radius:var(--lx-radius-pill);padding:var(--lx-space-3xs) var(--lx-space-sm);background:color-mix(in srgb, var(--lx-accent) 11%, transparent);color:var(--lx-accent);font-size:var(--lx-text-micro);text-transform:uppercase}.fRUyxG_source>header strong{color:var(--lx-label-secondary);font-size:var(--lx-text-xs);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.fRUyxG_source ol{max-height:430px;padding:var(--lx-space-xs) 0;counter-reset:none;margin:0;list-style:none;overflow:auto}.fRUyxG_codeLine{min-width:max-content;opacity:var(--lx-vs-alpha);transition:background-color var(--lx-motion-fast) var(--lx-easing), border-color var(--lx-motion-fast) var(--lx-easing);border-left:3.5px solid #0000;grid-template-columns:48px minmax(300px,1fr);display:grid}.fRUyxG_lineGutter{justify-content:flex-end;align-items:center;gap:var(--lx-space-2xs);padding:2px var(--lx-space-sm) 2px var(--lx-space-xs);color:var(--lx-label-tertiary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--lx-text-2xs);font-variant-numeric:tabular-nums;user-select:none;display:flex}.fRUyxG_stepArrow{color:var(--lx-accent);filter:drop-shadow(0 0 3px var(--lx-accent));font-size:9px;font-style:normal;line-height:1}.fRUyxG_codeLine code{padding:2px var(--lx-space-md) 2px var(--lx-space-sm);color:var(--lx-label-primary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--lx-text-xs);white-space:pre;line-height:1.65;display:block}.fRUyxG_codeLine[data-current]{border-left-color:var(--lx-accent);background:color-mix(in srgb, var(--lx-accent) 12%, transparent)}.fRUyxG_codeLine[data-current] .fRUyxG_lineGutter{color:var(--lx-accent);font-weight:var(--lx-weight-strong)}.fRUyxG_token_keyword{color:var(--lx-tone-purple);font-weight:var(--lx-weight-medium)}.fRUyxG_token_type{color:var(--lx-tone-blue);font-weight:var(--lx-weight-medium)}.fRUyxG_token_string{color:var(--lx-tone-green)}.fRUyxG_token_number{color:var(--lx-tone-orange);font-variant-numeric:tabular-nums}.fRUyxG_token_comment{color:var(--lx-label-tertiary);font-style:italic}.fRUyxG_token_operator{color:color-mix(in srgb, var(--lx-label-primary) 85%, transparent)}.fRUyxG_inspector{gap:var(--lx-space-md);min-width:0;display:grid}.fRUyxG_panel h4{border-bottom:1px solid var(--lx-border-subtle);padding:var(--lx-space-sm) var(--lx-space-md);background:var(--lx-surface-sunken);color:var(--lx-label-secondary);font-size:var(--lx-text-xs);font-weight:var(--lx-weight-strong);line-height:var(--lx-leading-xs);margin:0}.fRUyxG_variables{margin:0;display:grid}.fRUyxG_variables>div{justify-content:space-between;gap:var(--lx-space-sm);min-width:0;padding:var(--lx-space-xs) var(--lx-space-md);border-bottom:1px solid var(--lx-border-subtle);transition:background-color var(--lx-motion-base) var(--lx-easing);display:flex}.fRUyxG_variables>div:last-child{border-bottom:0}.fRUyxG_variables dt{min-width:0;color:var(--lx-label-secondary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--lx-text-xs)}.fRUyxG_variables dt small{margin-left:var(--lx-space-xs);color:var(--lx-label-tertiary);font-family:inherit;font-size:var(--lx-text-micro)}.fRUyxG_variables dd{overflow-wrap:anywhere;max-width:60%;color:var(--lx-accent);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--lx-text-xs);font-weight:var(--lx-weight-strong);text-align:right;margin:0}.fRUyxG_stack{padding:var(--lx-space-xs);margin:0;list-style:none;display:grid}.fRUyxG_stack li{align-items:baseline;gap:var(--lx-space-xs);border-radius:var(--lx-radius-xs);min-width:0;padding:var(--lx-space-xs) var(--lx-space-sm);color:var(--lx-label-secondary);font-size:var(--lx-text-xs);opacity:var(--lx-vs-alpha);display:flex}.fRUyxG_stack li:first-child{background:color-mix(in srgb, var(--lx-accent) 12%, transparent);color:var(--lx-label-primary);font-weight:var(--lx-weight-medium)}.fRUyxG_stack li>span{color:var(--lx-accent);font-size:var(--lx-text-micro)}.fRUyxG_stack li strong{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.fRUyxG_stack li small{color:var(--lx-label-tertiary);font-variant-numeric:tabular-nums;margin-left:auto}.fRUyxG_output{min-height:46px;max-height:150px;padding:var(--lx-space-sm) var(--lx-space-md);background:var(--lx-surface-sunken);color:var(--lx-label-primary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm);white-space:pre-wrap;margin:0;overflow:auto}.fRUyxG_empty{padding:var(--lx-space-md);color:var(--lx-label-tertiary);font-size:var(--lx-text-xs);margin:0}.fRUyxG_description{color:var(--lx-label-secondary);font-size:var(--lx-text-xs);line-height:var(--lx-leading-sm);margin:0}@container fRUyxG_learning-visual-v4 (width<=650px){.fRUyxG_workspace{grid-template-columns:1fr}.fRUyxG_inspector{grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))}}";
		const tagId$1 = "@dsh-portable/interactive-learning/code-trace.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var code_trace_module_css_default = {
			"codeLine": "fRUyxG_codeLine",
			"description": "fRUyxG_description",
			"empty": "fRUyxG_empty",
			"inspector": "fRUyxG_inspector",
			"learning-visual-v4": "fRUyxG_learning-visual-v4",
			"lineGutter": "fRUyxG_lineGutter",
			"output": "fRUyxG_output",
			"panel": "fRUyxG_panel",
			"source": "fRUyxG_source",
			"stack": "fRUyxG_stack",
			"stepArrow": "fRUyxG_stepArrow",
			"token_comment": "fRUyxG_token_comment",
			"token_keyword": "fRUyxG_token_keyword",
			"token_number": "fRUyxG_token_number",
			"token_operator": "fRUyxG_token_operator",
			"token_string": "fRUyxG_token_string",
			"token_type": "fRUyxG_token_type",
			"variables": "fRUyxG_variables",
			"workspace": "fRUyxG_workspace"
		};
		//#endregion
		//#region src/client/visuals/renderers/CodeTraceRenderer.tsx
		/** `code_trace`: source lines, current execution point, variables, stack and output. */
		function tokenizeLine(lineText, language) {
			if (lineText === "") return [{
				text: " ",
				type: "plain"
			}];
			const tokens = [];
			let cursor = 0;
			const len = lineText.length;
			const KEYWORDS = /* @__PURE__ */ new Set([
				"const",
				"let",
				"var",
				"function",
				"def",
				"return",
				"if",
				"else",
				"for",
				"while",
				"class",
				"import",
				"export",
				"from",
				"in",
				"of",
				"new",
				"async",
				"await",
				"try",
				"catch",
				"yield",
				"type",
				"interface",
				"None",
				"null",
				"true",
				"false",
				"True",
				"False",
				"elif",
				"pass",
				"break",
				"continue",
				"lambda",
				"with",
				"as",
				"is",
				"not",
				"and",
				"or"
			]);
			const TYPES = /* @__PURE__ */ new Set([
				"number",
				"string",
				"boolean",
				"any",
				"void",
				"int",
				"float",
				"str",
				"list",
				"dict",
				"set",
				"tuple",
				"self",
				"this",
				"console",
				"print",
				"len",
				"range",
				"Array"
			]);
			while (cursor < len) {
				const char = lineText[cursor];
				if (char === "/" && lineText[cursor + 1] === "/" || char === "#" && language.toLowerCase().includes("py")) {
					tokens.push({
						text: lineText.slice(cursor),
						type: "comment"
					});
					break;
				}
				if (char === "\"" || char === "'" || char === "`") {
					const quote = char;
					let end = cursor + 1;
					while (end < len && lineText[end] !== quote) {
						if (lineText[end] === "\\") end += 1;
						end += 1;
					}
					end = Math.min(len, end + 1);
					tokens.push({
						text: lineText.slice(cursor, end),
						type: "string"
					});
					cursor = end;
					continue;
				}
				if (/[0-9]/.test(char) && (cursor === 0 || /[\s([\{,+\-*/=><!:]/.test(lineText[cursor - 1]))) {
					let end = cursor;
					while (end < len && /[0-9.eE_]/.test(lineText[end])) end += 1;
					tokens.push({
						text: lineText.slice(cursor, end),
						type: "number"
					});
					cursor = end;
					continue;
				}
				if (/[a-zA-Z_$]/.test(char)) {
					let end = cursor;
					while (end < len && /[a-zA-Z0-9_$]/.test(lineText[end])) end += 1;
					const word = lineText.slice(cursor, end);
					if (KEYWORDS.has(word)) tokens.push({
						text: word,
						type: "keyword"
					});
					else if (TYPES.has(word)) tokens.push({
						text: word,
						type: "type"
					});
					else tokens.push({
						text: word,
						type: "plain"
					});
					cursor = end;
					continue;
				}
				if (/[+\-*/%=><!&|^~?:;.,()[\]{}]/.test(char)) {
					tokens.push({
						text: char,
						type: "operator"
					});
					cursor += 1;
					continue;
				}
				tokens.push({
					text: char,
					type: "plain"
				});
				cursor += 1;
			}
			return tokens;
		}
		function traceValue(value) {
			if (value === null) return "null";
			if (typeof value === "string") return JSON.stringify(value);
			if (typeof value === "number") return formatNumber(value);
			return value ? "true" : "false";
		}
		function CodeTraceRenderer({ content, focus }) {
			const [stepIndex, setStepIndex] = (0, react.useState)(0);
			const step = content.steps[stepIndex] ?? content.steps[0];
			const lines = (0, react.useMemo)(() => [...content.lines].sort((left, right) => left.number - right.number), [content.lines]);
			const tokenizedLines = (0, react.useMemo)(() => new Map(lines.map((line) => [line.number, tokenizeLine(line.text, content.language)])), [content.language, lines]);
			const sequence = (0, react.useMemo)(() => ({
				initialFrameId: content.steps[0]?.id,
				frames: content.steps.map((item) => ({
					id: item.id,
					label: item.label,
					description: item.description,
					focusIds: []
				}))
			}), [content.steps]);
			if (step === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					content.steps.length < 2 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SequenceController, {
						sequence,
						frameIndex: stepIndex,
						onFrameChange: setStepIndex
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: code_trace_module_css_default.workspace,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: code_trace_module_css_default.source,
							"aria-label": `${content.language} 代码`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: content.language }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: step.label })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", { children: lines.map((line) => {
								const current = line.number === step.currentLine;
								const tokens = tokenizedLines.get(line.number) ?? [{
									text: line.text || " ",
									type: "plain"
								}];
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
									className: code_trace_module_css_default.codeLine,
									"data-current": current || void 0,
									"data-visual-id": current ? step.id : void 0,
									"data-visual-state": current ? "current" : elementState(`line-${String(line.number)}`, focus),
									"aria-current": current ? "step" : void 0,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: code_trace_module_css_default.lineGutter,
										"aria-hidden": "true",
										children: [current ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", {
											className: code_trace_module_css_default.stepArrow,
											children: "▶"
										}) : null, line.number]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: tokens.map((token, tokenIdx) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: token.type !== "plain" ? code_trace_module_css_default[`token_${token.type}`] : void 0,
										children: token.text
									}, tokenIdx)) })]
								}, line.number);
							}) })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: code_trace_module_css_default.inspector,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: code_trace_module_css_default.panel,
									"aria-label": "变量",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "变量" }), step.variables.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: code_trace_module_css_default.empty,
										children: "暂无局部变量"
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
										className: code_trace_module_css_default.variables,
										children: step.variables.map((variable) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dt", { children: [variable.name, variable.type === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: variable.type })] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: traceValue(variable.value) })] }, variable.name))
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: code_trace_module_css_default.panel,
									"aria-label": "调用栈",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "调用栈" }), step.stack.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: code_trace_module_css_default.empty,
										children: "调用栈为空"
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
										className: code_trace_module_css_default.stack,
										children: step.stack.map((frame, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
											"data-visual-id": frame.id,
											"data-visual-state": elementState(frame.id, focus),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: index === 0 ? "▶" : String(index + 1) }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: frame.function }),
												frame.line === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("small", { children: [":", frame.line] })
											]
										}, frame.id))
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
									className: code_trace_module_css_default.panel,
									"aria-label": "输出",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h4", { children: "输出" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
										className: code_trace_module_css_default.output,
										children: step.output ?? "—"
									})]
								})
							]
						})]
					}),
					step.description === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: code_trace_module_css_default.description,
						children: step.description
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:src/client/visuals/styles/field-2d.module.css.mjs
		const css = ".FbZwwq_field{touch-action:pan-y;outline:none;max-width:none;display:block}.FbZwwq_field:focus-visible{outline:2px solid var(--lx-accent);outline-offset:-2px}.FbZwwq_frame{fill:var(--lx-surface-sunken);stroke:var(--lx-border-subtle);vector-effect:non-scaling-stroke}.FbZwwq_heatCell{shape-rendering:geometricprecision}.FbZwwq_contour{fill:none;stroke:#ffffffd9;stroke-width:1.35px;stroke-linecap:round;stroke-linejoin:round;stroke-opacity:.88;filter:drop-shadow(0 0 1px #00000080);vector-effect:non-scaling-stroke}.FbZwwq_vector{stroke:var(--lx-label-primary);stroke-width:1.5px;stroke-linecap:round;stroke-opacity:.76;filter:drop-shadow(0 0 1px #0000004d);vector-effect:non-scaling-stroke}.FbZwwq_arrowHead path{fill:var(--lx-label-primary)}.FbZwwq_zeroVector{fill:var(--lx-label-primary);fill-opacity:.7}.FbZwwq_tick{fill:var(--lx-label-secondary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums}.FbZwwq_axisLabel{fill:var(--lx-label-secondary);font-size:var(--lx-text-2xs);font-weight:var(--lx-weight-medium)}.FbZwwq_probe line{stroke:var(--lx-accent);stroke-width:1.2px;stroke-dasharray:4 3;stroke-opacity:.9;filter:drop-shadow(0 0 2px var(--lx-accent));vector-effect:non-scaling-stroke}.FbZwwq_readout{align-items:center;gap:var(--lx-space-sm) var(--lx-space-lg);min-height:36px;padding:var(--lx-space-xs) var(--lx-space-sm);border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-md);background:var(--lx-surface-base);color:var(--lx-label-secondary);font-size:var(--lx-text-xs);flex-wrap:wrap;display:flex}.FbZwwq_readout output{color:var(--lx-label-primary);font-weight:var(--lx-weight-medium);flex:240px}.FbZwwq_legend{align-items:center;gap:var(--lx-space-xs);color:var(--lx-label-tertiary);font-size:var(--lx-text-micro);font-variant-numeric:tabular-nums;grid-template-columns:auto 120px auto;display:grid}.FbZwwq_legend i{border:1px solid var(--lx-border-subtle);border-radius:var(--lx-radius-pill);background:linear-gradient(90deg,#3e4be0,#24db9e,#c3e61a,#ee5f2f);height:10px;box-shadow:0 1px 3px #0000001f}";
		const tagId = "@dsh-portable/interactive-learning/field-2d.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/interactive-learning";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var field_2d_module_css_default = {
			"arrowHead": "FbZwwq_arrowHead",
			"axisLabel": "FbZwwq_axisLabel",
			"contour": "FbZwwq_contour",
			"field": "FbZwwq_field",
			"frame": "FbZwwq_frame",
			"heatCell": "FbZwwq_heatCell",
			"legend": "FbZwwq_legend",
			"probe": "FbZwwq_probe",
			"readout": "FbZwwq_readout",
			"tick": "FbZwwq_tick",
			"vector": "FbZwwq_vector",
			"zeroVector": "FbZwwq_zeroVector"
		};
		//#endregion
		//#region src/client/visuals/renderers/Field2DRenderer.tsx
		/** `field_2d`: scalar heatmaps and contours with optional vector arrows. */
		function sampleCount(value) {
			return Math.max(2, Math.min(32, value ?? 15));
		}
		function scalarGrid(content) {
			const scalar = content.scalar;
			if (scalar?.samples !== void 0) return {
				...scalar.samples,
				values: [...scalar.samples.values]
			};
			if (scalar?.expression === void 0) return void 0;
			const columns = sampleCount(content.xAxis.samples);
			const rows = sampleCount(content.yAxis.samples);
			const evaluate = compileMathExpression(scalar.expression);
			return {
				columns,
				rows,
				values: Array.from({ length: rows }).flatMap((_, row) => Array.from({ length: columns }, (_unused, column) => {
					const x = interpolate(content.xAxis.min, content.xAxis.max, column / Math.max(1, columns - 1));
					const y = interpolate(content.yAxis.min, content.yAxis.max, row / Math.max(1, rows - 1));
					return evaluate({
						x,
						y
					});
				}))
			};
		}
		function vectorGrid(content) {
			const vector = content.vector;
			if (vector?.samples !== void 0) return {
				...vector.samples,
				u: [...vector.samples.u],
				v: [...vector.samples.v]
			};
			if (vector?.expression === void 0) return void 0;
			const columns = sampleCount(content.xAxis.samples);
			const rows = sampleCount(content.yAxis.samples);
			const u = compileMathExpression(vector.expression.u);
			const v = compileMathExpression(vector.expression.v);
			const bindings = Array.from({ length: rows }).flatMap((_, row) => Array.from({ length: columns }, (_unused, column) => ({
				x: interpolate(content.xAxis.min, content.xAxis.max, column / Math.max(1, columns - 1)),
				y: interpolate(content.yAxis.min, content.yAxis.max, row / Math.max(1, rows - 1))
			})));
			return {
				columns,
				rows,
				u: bindings.map(u),
				v: bindings.map(v)
			};
		}
		function scaleBounds(content, grid) {
			if (grid === void 0) return void 0;
			const finite = grid.values.filter(Number.isFinite);
			if (finite.length === 0) return void 0;
			let min = content.scalar?.min ?? Math.min(...finite);
			let max = content.scalar?.max ?? Math.max(...finite);
			if (min === max) {
				const padding = Math.max(1, Math.abs(min) * .08);
				min -= padding;
				max += padding;
			}
			return {
				min,
				max
			};
		}
		function fieldColor(value, min, max) {
			if (!Number.isFinite(value)) return "transparent";
			const ratio = normalizedPosition(value, min, max);
			return `hsl(${String(Math.round(235 - ratio * 220))} 72% ${String(Math.round(52 + Math.abs(ratio - .5) * 8))}%)`;
		}
		function pointFor(grid, column, row, content, geometry) {
			const xValue = interpolate(content.xAxis.min, content.xAxis.max, column / Math.max(1, grid.columns - 1));
			const yValue = interpolate(content.yAxis.min, content.yAxis.max, row / Math.max(1, grid.rows - 1));
			return {
				x: geometry.left + normalizedPosition(xValue, content.xAxis.min, content.xAxis.max) * geometry.plotWidth,
				y: geometry.top + (1 - normalizedPosition(yValue, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight,
				value: grid.values[row * grid.columns + column] ?? NaN
			};
		}
		function crossing(left, right, level) {
			if (!Number.isFinite(left.value) || !Number.isFinite(right.value) || left.value === right.value) return void 0;
			if (left.value < level && right.value < level || left.value > level && right.value > level) return void 0;
			const ratio = (level - left.value) / (right.value - left.value);
			if (ratio < 0 || ratio > 1) return void 0;
			return {
				x: left.x + (right.x - left.x) * ratio,
				y: left.y + (right.y - left.y) * ratio
			};
		}
		function contourPaths(grid, content, geometry, levels) {
			const paths = [];
			for (const level of levels) {
				const commands = [];
				for (let row = 0; row < grid.rows - 1; row += 1) for (let column = 0; column < grid.columns - 1; column += 1) {
					const bottomLeft = pointFor(grid, column, row, content, geometry);
					const bottomRight = pointFor(grid, column + 1, row, content, geometry);
					const topRight = pointFor(grid, column + 1, row + 1, content, geometry);
					const topLeft = pointFor(grid, column, row + 1, content, geometry);
					const intersections = [
						crossing(bottomLeft, bottomRight, level),
						crossing(bottomRight, topRight, level),
						crossing(topRight, topLeft, level),
						crossing(topLeft, bottomLeft, level)
					].filter((point) => point !== void 0);
					if (intersections.length === 2) commands.push(`M${intersections[0].x.toFixed(2)},${intersections[0].y.toFixed(2)}L${intersections[1].x.toFixed(2)},${intersections[1].y.toFixed(2)}`);
					else if (intersections.length === 4) {
						commands.push(`M${intersections[0].x.toFixed(2)},${intersections[0].y.toFixed(2)}L${intersections[1].x.toFixed(2)},${intersections[1].y.toFixed(2)}`);
						commands.push(`M${intersections[2].x.toFixed(2)},${intersections[2].y.toFixed(2)}L${intersections[3].x.toFixed(2)},${intersections[3].y.toFixed(2)}`);
					}
				}
				paths.push(commands.join(""));
			}
			return paths;
		}
		function nearestScalar(grid, content, probe) {
			if (grid === void 0) return void 0;
			const column = Math.round(normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * (grid.columns - 1));
			const row = Math.round(normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max) * (grid.rows - 1));
			const value = grid.values[row * grid.columns + column];
			return value !== void 0 && Number.isFinite(value) ? value : void 0;
		}
		function nearestVector(grid, content, probe) {
			if (grid === void 0) return void 0;
			const column = Math.round(normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * (grid.columns - 1));
			const index = Math.round(normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max) * (grid.rows - 1)) * grid.columns + column;
			const u = grid.u[index];
			const v = grid.v[index];
			return u !== void 0 && v !== void 0 && Number.isFinite(u) && Number.isFinite(v) ? {
				u,
				v
			} : void 0;
		}
		function Field2DRenderer({ content }) {
			const id = (0, react.useId)();
			const [viewportRef, width] = useContainerWidth();
			const geometry = (0, react.useMemo)(() => chartGeometry(width), [width]);
			const scalar = (0, react.useMemo)(() => scalarGrid(content), [content]);
			const vector = (0, react.useMemo)(() => vectorGrid(content), [content]);
			const bounds = (0, react.useMemo)(() => scaleBounds(content, scalar), [content, scalar]);
			const [probe, setProbe] = (0, react.useState)();
			const xTicks = (0, react.useMemo)(() => ticks(content.xAxis.min, content.xAxis.max), [content.xAxis.max, content.xAxis.min]);
			const yTicks = (0, react.useMemo)(() => ticks(content.yAxis.min, content.yAxis.max), [content.yAxis.max, content.yAxis.min]);
			const levels = bounds === void 0 ? [] : Array.from({ length: 5 }, (_, index) => interpolate(bounds.min, bounds.max, (index + 1) / 6));
			const contours = (0, react.useMemo)(() => scalar === void 0 ? [] : contourPaths(scalar, content, geometry, levels), [
				content,
				geometry,
				levels.join("\0"),
				scalar
			]);
			const vectorMagnitude = vector === void 0 ? 0 : Math.max(0, ...vector.u.map((u, index) => Math.hypot(u, vector.v[index] ?? 0)).filter(Number.isFinite));
			const probeScalar = probe === void 0 ? void 0 : nearestScalar(scalar, content, probe);
			const probeVector = probe === void 0 ? void 0 : nearestVector(vector, content, probe);
			const probeText = probe === void 0 ? "在场中移动指针或使用方向键读取坐标。" : [
				`x ${formatNumber(probe.x)}`,
				`y ${formatNumber(probe.y)}`,
				...probeScalar === void 0 ? [] : [`值 ${formatNumber(probeScalar)}`],
				...probeVector === void 0 ? [] : [`向量 (${formatNumber(probeVector.u)}, ${formatNumber(probeVector.v)})`]
			].join("，");
			const moveProbe = (event) => {
				const rect = event.currentTarget.getBoundingClientRect();
				if (rect.width <= 0 || rect.height <= 0) return;
				const px = (event.clientX - rect.left) * (geometry.width / rect.width);
				const py = (event.clientY - rect.top) * (geometry.height / rect.height);
				if (px < geometry.left - 4 || px > geometry.left + geometry.plotWidth + 4 || py < geometry.top - 4 || py > geometry.top + geometry.plotHeight + 4) {
					setProbe(void 0);
					return;
				}
				const xRatio = normalizedPosition(px, geometry.left, geometry.left + geometry.plotWidth);
				const yRatio = 1 - normalizedPosition(py, geometry.top, geometry.top + geometry.plotHeight);
				setProbe({
					x: interpolate(content.xAxis.min, content.xAxis.max, xRatio),
					y: interpolate(content.yAxis.min, content.yAxis.max, yRatio)
				});
			};
			const keyProbe = (event) => {
				if (event.key === "Escape") {
					setProbe(void 0);
					return;
				}
				if (![
					"ArrowLeft",
					"ArrowRight",
					"ArrowUp",
					"ArrowDown",
					"Home"
				].includes(event.key)) return;
				event.preventDefault();
				if (event.key === "Home") {
					setProbe({
						x: (content.xAxis.min + content.xAxis.max) / 2,
						y: (content.yAxis.min + content.yAxis.max) / 2
					});
					return;
				}
				const current = probe ?? {
					x: (content.xAxis.min + content.xAxis.max) / 2,
					y: (content.yAxis.min + content.yAxis.max) / 2
				};
				const columns = Math.max(2, scalar?.columns ?? vector?.columns ?? sampleCount(content.xAxis.samples));
				const rows = Math.max(2, scalar?.rows ?? vector?.rows ?? sampleCount(content.yAxis.samples));
				const dx = (content.xAxis.max - content.xAxis.min) / (columns - 1);
				const dy = (content.yAxis.max - content.yAxis.min) / (rows - 1);
				setProbe({
					x: Math.max(content.xAxis.min, Math.min(content.xAxis.max, current.x + (event.key === "ArrowRight" ? dx : event.key === "ArrowLeft" ? -dx : 0))),
					y: Math.max(content.yAxis.min, Math.min(content.yAxis.max, current.y + (event.key === "ArrowUp" ? dy : event.key === "ArrowDown" ? -dy : 0)))
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FigureViewport, {
					viewportRef,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						className: field_2d_module_css_default.field,
						width: geometry.width,
						height: geometry.height,
						viewBox: `0 0 ${String(geometry.width)} ${String(geometry.height)}`,
						role: "img",
						tabIndex: 0,
						"aria-label": probeText,
						onPointerMove: moveProbe,
						onKeyDown: keyProbe,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
								id: `${id}-field-clip`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
									x: geometry.left,
									y: geometry.top,
									width: geometry.plotWidth,
									height: geometry.plotHeight
								})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
								id: `${id}-field-arrow`,
								className: field_2d_module_css_default.arrowHead,
								markerWidth: "7",
								markerHeight: "7",
								refX: "6",
								refY: "3.5",
								orient: "auto",
								markerUnits: "strokeWidth",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0,0 L7,3.5 L0,7 z" })
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								className: field_2d_module_css_default.frame,
								x: geometry.left,
								y: geometry.top,
								width: geometry.plotWidth,
								height: geometry.plotHeight
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
								clipPath: `url(#${id}-field-clip)`,
								children: [
									scalar === void 0 || bounds === void 0 ? null : scalar.values.map((value, index) => {
										const column = index % scalar.columns;
										const row = Math.floor(index / scalar.columns);
										const cellWidth = geometry.plotWidth / scalar.columns;
										const cellHeight = geometry.plotHeight / scalar.rows;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
											className: field_2d_module_css_default.heatCell,
											x: geometry.left + column * cellWidth,
											y: geometry.top + (scalar.rows - row - 1) * cellHeight,
											width: cellWidth + .5,
											height: cellHeight + .5,
											fill: fieldColor(value, bounds.min, bounds.max)
										}, `heat-${String(index)}`);
									}),
									contours.map((path, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
										className: field_2d_module_css_default.contour,
										d: path
									}, `contour-${String(index)}`)),
									vector === void 0 ? null : vector.u.map((u, index) => {
										const v = vector.v[index] ?? NaN;
										if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
										const column = index % vector.columns;
										const row = Math.floor(index / vector.columns);
										const x = geometry.left + column / Math.max(1, vector.columns - 1) * geometry.plotWidth;
										const y = geometry.top + (1 - row / Math.max(1, vector.rows - 1)) * geometry.plotHeight;
										const magnitude = Math.hypot(u, v);
										if (magnitude === 0 || vectorMagnitude === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
											className: field_2d_module_css_default.zeroVector,
											cx: x,
											cy: y,
											r: "1.8"
										}, `vector-${String(index)}`);
										const cell = Math.min(geometry.plotWidth / Math.max(2, vector.columns), geometry.plotHeight / Math.max(2, vector.rows));
										const length = Math.max(4, magnitude / vectorMagnitude * cell * .56);
										const dx = u / magnitude * length / 2;
										const dy = -(v / magnitude) * length / 2;
										return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											className: field_2d_module_css_default.vector,
											x1: x - dx,
											y1: y - dy,
											x2: x + dx,
											y2: y + dy,
											markerEnd: `url(#${id}-field-arrow)`
										}, `vector-${String(index)}`);
									}),
									probe === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: field_2d_module_css_default.probe,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											x1: geometry.left,
											x2: geometry.left + geometry.plotWidth,
											y1: geometry.top + (1 - normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight,
											y2: geometry.top + (1 - normalizedPosition(probe.y, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("line", {
											y1: geometry.top,
											y2: geometry.top + geometry.plotHeight,
											x1: geometry.left + normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * geometry.plotWidth,
											x2: geometry.left + normalizedPosition(probe.x, content.xAxis.min, content.xAxis.max) * geometry.plotWidth
										})]
									})
								]
							}),
							xTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: field_2d_module_css_default.tick,
								x: geometry.left + normalizedPosition(value, content.xAxis.min, content.xAxis.max) * geometry.plotWidth,
								y: geometry.top + geometry.plotHeight + 19,
								textAnchor: "middle",
								children: formatNumber(value)
							}, `x-${String(value)}`)),
							yTicks.map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: field_2d_module_css_default.tick,
								x: geometry.left - 9,
								y: geometry.top + (1 - normalizedPosition(value, content.yAxis.min, content.yAxis.max)) * geometry.plotHeight,
								textAnchor: "end",
								dominantBaseline: "middle",
								children: formatNumber(value)
							}, `y-${String(value)}`)),
							content.xAxis.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: field_2d_module_css_default.axisLabel,
								x: geometry.left + geometry.plotWidth / 2,
								y: geometry.height - 8,
								textAnchor: "middle",
								children: content.xAxis.label
							}),
							content.yAxis.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
								className: field_2d_module_css_default.axisLabel,
								x: 13,
								y: geometry.top + geometry.plotHeight / 2,
								textAnchor: "middle",
								transform: `rotate(-90 13 ${String(geometry.top + geometry.plotHeight / 2)})`,
								children: content.yAxis.label
							})
						]
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: field_2d_module_css_default.readout,
					children: [
						bounds === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: field_2d_module_css_default.legend,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber(bounds.min) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("i", { "aria-hidden": "true" }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatNumber(bounds.max) })
							]
						}),
						vector === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["最大向量模：", formatNumber(vectorMagnitude)] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("output", {
							role: "status",
							"aria-live": "polite",
							children: probeText
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/visuals/renderers/CausalLoopRenderer.tsx
		/** `causal_loop`: signed, delayed links and named reinforcing/balancing loops. */
		function computeVariableBox(label) {
			const wrapped = wrapLabel(label, {
				fontSize: 13,
				maxWidth: 124,
				maxLines: 2
			});
			const maxLineWidth = Math.max(...wrapped.lines.map((line) => measureText(line, 13)), 0);
			return {
				width: Math.max(104, Math.min(168, maxLineWidth + 28)),
				height: wrapped.lines.length > 1 ? 52 : 40,
				lines: wrapped.lines
			};
		}
		function variablePosition(index, count, width, height) {
			if (count <= 1) return {
				x: width / 2,
				y: height / 2 + 10
			};
			const radiusX = Math.min(width * .38, Math.max(145, count * 32));
			const radiusY = Math.min(height * .31, Math.max(90, count * 24));
			const angle = -Math.PI / 2 + index * (Math.PI * 2 / count);
			return {
				x: width / 2 + Math.cos(angle) * radiusX,
				y: height / 2 + 10 + Math.sin(angle) * radiusY
			};
		}
		function boxBoundary(from, to, box) {
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const scale = 1 / Math.max(Math.abs(dx) / (box.width / 2), Math.abs(dy) / (box.height / 2), 1);
			return {
				x: from.x + dx * scale,
				y: from.y + dy * scale
			};
		}
		function polaritySymbol(polarity) {
			return polarity === "negative" || polarity === "-" ? "−" : "+";
		}
		function loopKind(type) {
			return type === "balancing" || type === "B" ? "balancing" : "reinforcing";
		}
		function linkDetail(link, variables) {
			const from = variables.get(link.from)?.label ?? link.from;
			const to = variables.get(link.to)?.label ?? link.to;
			const delay = link.delay === void 0 ? void 0 : `Delay: ${link.delay}`;
			return [
				from,
				`→ ${to}`,
				link.polarity,
				delay,
				link.detail
			].filter((part) => part !== void 0 && part.length > 0).join(" · ");
		}
		function CausalLoopRenderer({ content, focus }) {
			const diagramId = (0, react.useId)();
			const [viewportRef, containerWidth] = useContainerWidth();
			const [selected, setSelected] = (0, react.useState)();
			const variables = content.variables;
			const links = content.links;
			const loops = content.loops ?? [];
			const variableById = (0, react.useMemo)(() => new Map(variables.map((variable) => [variable.id, variable])), [variables]);
			const boxByVarId = (0, react.useMemo)(() => new Map(variables.map((variable) => [variable.id, computeVariableBox(variable.label)])), [variables]);
			const width = Math.max(560, containerWidth, 36 + loops.length * 168);
			const height = Math.max(340, 170 + Math.min(170, Math.max(100, variables.length * 24)) * 2);
			const positions = (0, react.useMemo)(() => new Map(variables.map((variable, index) => [variable.id, variablePosition(index, variables.length, width, height)])), [
				height,
				variables,
				width
			]);
			const linkById = (0, react.useMemo)(() => new Map(links.map((link) => [link.id, link])), [links]);
			const roving = useRovingFocus((0, react.useMemo)(() => [
				...loops.map((loop) => loop.id),
				...variables.map((variable) => variable.id),
				...links.map((link) => link.id)
			], [
				links,
				loops,
				variables
			]));
			const loopBoxes = (0, react.useMemo)(() => new Map(loops.map((loop, loopIndex) => {
				const loopVars = loop.linkIds.flatMap((linkId) => {
					const link = linkById.get(linkId);
					return link ? [link.from, link.to] : [];
				});
				const pts = [...new Set(loopVars)].map((id) => positions.get(id)).filter(Boolean);
				const cx = pts.length > 0 ? pts.reduce((sum, p) => sum + p.x, 0) / pts.length : width / 2 + (loopIndex - (loops.length - 1) / 2) * 140;
				const cy = pts.length > 0 ? pts.reduce((sum, p) => sum + p.y, 0) / pts.length : height / 2 + 10;
				const labelText = `${loopKind(loop.type) === "reinforcing" ? "↻ R" : "↺ B"} · ${loop.label}`;
				const labelWidth = Math.max(114, measureText(labelText, 12) + 26);
				return [loop.id, {
					cx,
					cy,
					labelText,
					labelWidth
				}];
			})), [
				height,
				linkById,
				loops,
				positions,
				width
			]);
			const selectVariable = (variable) => setSelected({
				id: variable.id,
				label: variable.label,
				detail: variable.detail,
				kind: "Variable",
				tone: toneAt(variable.tone)
			});
			const selectLink = (link) => setSelected({
				id: link.id,
				label: link.label ?? `${polaritySymbol(link.polarity)} ${variableById.get(link.to)?.label ?? link.to}`,
				detail: linkDetail(link, variableById),
				kind: "Causal link",
				tone: toneAt(link.tone)
			});
			const selectLoop = (loop) => {
				const kind = loopKind(loop.type);
				const linksInLoop = loop.linkIds.map((id) => linkById.get(id)?.label ?? id).join(" → ");
				setSelected({
					id: loop.id,
					label: `${kind === "reinforcing" ? "R" : "B"} · ${loop.label}`,
					detail: loop.detail ?? linksInLoop,
					kind: kind === "reinforcing" ? "Reinforcing loop" : "Balancing loop",
					tone: toneAt(loop.tone)
				});
			};
			const summary = `Causal loop diagram with ${variables.length} variables, ${links.length} signed links and ${loops.length} named loops.`;
			const legendStates = (0, react.useMemo)(() => focus.active ? [
				...variables,
				...links,
				...loops
			].map((item) => elementState(item.id, focus)) : [], [
				focus,
				links,
				loops,
				variables
			]);
			const placedCausalLabels = [...[...loopBoxes.values()].map((box) => ({
				x: box.cx,
				y: box.cy,
				width: box.labelWidth,
				height: 32
			})), ...variables.flatMap((variable) => {
				const position = positions.get(variable.id);
				const box = boxByVarId.get(variable.id);
				return position === void 0 || box === void 0 ? [] : [{
					x: position.x,
					y: position.y,
					width: box.width + 10,
					height: box.height + 10
				}];
			})];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: shell_module_css_default.rendererStack,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: process_module_css_default.processViewport,
						ref: viewportRef,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							ref: roving.containerRef,
							className: process_module_css_default.processSvg,
							width,
							height,
							viewBox: `0 0 ${width} ${height}`,
							role: "group",
							"aria-label": summary,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: DEFAULT_TONES.map((tone) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("marker", {
									id: `${diagramId}-${tone}`,
									className: process_module_css_default.causalArrow,
									"data-tone": tone,
									markerWidth: "8",
									markerHeight: "8",
									refX: "7",
									refY: "4",
									orient: "auto",
									markerUnits: "strokeWidth",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M0,0 L8,4 L0,8 z" })
								}, tone)) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: loops.map((loop, index) => {
									const kind = loopKind(loop.type);
									const tone = toneAt(loop.tone, index);
									const box = loopBoxes.get(loop.id) ?? {
										cx: width / 2,
										cy: height / 2 + 10,
										labelText: loop.label,
										labelWidth: 120
									};
									const isSelected = selected?.id === loop.id;
									const state = focus.active ? elementState(loop.id, focus, loop.linkIds) : isSelected ? "selected" : "overview";
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
										className: process_module_css_default.causalLoop,
										"data-tone": tone,
										"data-visual-id": loop.id,
										"data-visual-state": state,
										role: "button",
										"aria-label": `${kind === "reinforcing" ? "Reinforcing" : "Balancing"} loop: ${loop.label}`,
										onClick: () => selectLoop(loop),
										...roving.itemProps(loop.id, () => selectLoop(loop)),
										transform: `translate(${box.cx} ${box.cy})`,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
											className: process_module_css_default.causalLoopBadge,
											"data-loop-kind": kind,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												x: -box.labelWidth / 2,
												y: "-16",
												width: box.labelWidth,
												height: "32",
												rx: "16"
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												x: "0",
												y: "1",
												textAnchor: "middle",
												dominantBaseline: "middle",
												children: box.labelText
											})]
										})
									}, loop.id);
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: links.map((link, index) => {
									const from = positions.get(link.from);
									const to = positions.get(link.to);
									const fromBox = boxByVarId.get(link.from) ?? {
										width: 120,
										height: 42,
										lines: []
									};
									const toBox = boxByVarId.get(link.to) ?? {
										width: 120,
										height: 42,
										lines: []
									};
									if (from === void 0 || to === void 0) return null;
									const start = boxBoundary(from, to, fromBox);
									const end = boxBoundary(to, from, toBox);
									const midX = (start.x + end.x) / 2;
									const midY = (start.y + end.y) / 2;
									const curve = links.some((other) => other.id !== link.id && other.from === link.to && other.to === link.from) ? 38 : (index % 3 - 1) * 16;
									const dx = end.x - start.x;
									const dy = end.y - start.y;
									const length = Math.max(1, Math.hypot(dx, dy));
									const normalX = -dy / length;
									const normalY = dx / length;
									const controlX = midX + normalX * curve;
									const controlY = midY + normalY * curve;
									const path = `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${controlX.toFixed(2)} ${controlY.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
									const tone = toneAt(link.tone, index);
									const isLinkInSelectedLoop = selected?.id !== void 0 && loops.some((l) => l.id === selected.id && l.linkIds.includes(link.id));
									const state = focus.active ? elementState(link.id, focus, [link.from, link.to]) : selected?.id === link.id || isLinkInSelectedLoop ? "selected" : "overview";
									const delay = link.delay === void 0 ? void 0 : link.delay > 0 ? `+${link.delay}` : "delay";
									const tMid = .5;
									const midCurveX = .25 * start.x + 1 * tMid * controlX + tMid * tMid * end.x;
									const midCurveY = .25 * start.y + 1 * tMid * controlY + tMid * tMid * end.y;
									const signX = midCurveX + normalX * 12;
									const signY = midCurveY + normalY * 12;
									const annotationLane = index % 5 - 2;
									const labelLines = link.label === void 0 ? [] : wrapLabel(link.label, {
										fontSize: 11,
										maxWidth: 150,
										maxLines: 2
									}).lines;
									const labelWidth = labelLines.length === 0 ? 0 : Math.max(...labelLines.map((line) => measureText(line, 11))) + 12;
									const labelHeight = labelLines.length > 1 ? 30 : 18;
									const baseLabelX = signX + normalX * 28;
									const baseLabelY = signY + normalY * 28 + annotationLane * 24;
									let labelX = baseLabelX;
									let labelY = baseLabelY;
									if (link.label !== void 0) {
										for (let attempt = 0; attempt < 8; attempt += 1) {
											const candidateY = baseLabelY + (attempt === 0 ? 0 : Math.ceil(attempt / 2) * 30 * (attempt % 2 === 1 ? 1 : -1));
											if (!placedCausalLabels.some((previous) => Math.abs(previous.x - baseLabelX) < (previous.width + labelWidth) / 2 + 8 && Math.abs(previous.y - candidateY) < (previous.height + labelHeight) / 2 + 6)) {
												labelX = baseLabelX;
												labelY = candidateY;
												break;
											}
										}
										placedCausalLabels.push({
											x: labelX,
											y: labelY,
											width: labelWidth,
											height: labelHeight
										});
									}
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: process_module_css_default.causalLink,
										"data-tone": tone,
										"data-visual-id": link.id,
										"data-visual-state": state,
										role: "button",
										"aria-label": `${polaritySymbol(link.polarity)} link: ${linkDetail(link, variableById)}`,
										onClick: () => selectLink(link),
										...roving.itemProps(link.id, () => selectLink(link)),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: process_module_css_default.causalLinkPath,
												d: path,
												markerEnd: `url(#${diagramId}-${tone})`
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
												className: process_module_css_default.causalLinkHit,
												d: path
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: process_module_css_default.causalSign,
												transform: `translate(${signX + normalX * annotationLane * 14} ${signY + normalY * annotationLane * 14})`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: "-12",
													y: "-12",
													width: "24",
													height: "24",
													rx: "12"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
													x: "0",
													y: "1",
													textAnchor: "middle",
													dominantBaseline: "middle",
													children: polaritySymbol(link.polarity)
												})]
											}),
											delay === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: process_module_css_default.causalDelay,
												transform: `translate(${signX + 34 + normalX * annotationLane * 10} ${signY - 25 + normalY * annotationLane * 10})`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: "-18",
													y: "-11",
													width: "36",
													height: "22",
													rx: "8"
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("text", {
													x: "0",
													y: "1",
													textAnchor: "middle",
													dominantBaseline: "middle",
													children: ["⏱ ", delay]
												})]
											}),
											link.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
												className: process_module_css_default.causalLabelGroup,
												transform: `translate(${labelX} ${labelY})`,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
													x: -labelWidth / 2,
													y: -labelHeight / 2,
													width: labelWidth,
													height: labelHeight,
													rx: "4",
													className: process_module_css_default.causalLabelBg
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
													className: process_module_css_default.causalLinkLabel,
													textAnchor: "middle",
													dominantBaseline: "middle",
													children: labelLines.map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
														x: "0",
														dy: lineIndex === 0 ? labelLines.length > 1 ? "-0.55em" : "0.34em" : "1.1em",
														children: line
													}, lineIndex))
												})]
											}),
											link.label === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: link.label })
										]
									}, link.id);
								}) }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", { children: variables.map((variable, index) => {
									const position = positions.get(variable.id);
									if (position === void 0) return null;
									const tone = toneAt(variable.tone, index);
									const box = boxByVarId.get(variable.id) ?? {
										width: 120,
										height: 42,
										lines: [variable.label]
									};
									const isVarInSelectedLoop = selected?.id !== void 0 && loops.some((l) => l.id === selected.id && l.linkIds.some((lid) => {
										const link = linkById.get(lid);
										return link && (link.from === variable.id || link.to === variable.id);
									}));
									const state = focus.active ? elementState(variable.id, focus) : selected?.id === variable.id || isVarInSelectedLoop ? "selected" : "overview";
									return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
										className: process_module_css_default.causalVariable,
										transform: `translate(${position.x} ${position.y})`,
										"data-tone": tone,
										"data-visual-id": variable.id,
										"data-visual-state": state,
										role: "button",
										"aria-label": `Variable: ${variable.label}`,
										onClick: () => selectVariable(variable),
										...roving.itemProps(variable.id, () => selectVariable(variable)),
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
												className: process_module_css_default.causalVariableShape,
												x: -box.width / 2,
												y: -box.height / 2,
												width: box.width,
												height: box.height,
												rx: "12"
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("text", {
												className: process_module_css_default.causalVariableLabel,
												textAnchor: "middle",
												children: box.lines.map((line, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tspan", {
													x: "0",
													dy: lineIndex === 0 ? box.lines.length > 1 ? "-0.28em" : "0.34em" : "1.25em",
													children: line
												}, lineIndex))
											}),
											variable.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("title", { children: variable.detail })
										]
									}, variable.id);
								}) })
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StateLegend, { states: legendStates }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: shell_module_css_default.srOnly,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: summary }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("ul", { children: [
							variables.map((variable) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [variable.label, variable.detail === void 0 ? "" : `: ${variable.detail}`] }, variable.id)),
							links.map((link) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: linkDetail(link, variableById) }, link.id)),
							loops.map((loop) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
								loopKind(loop.type) === "reinforcing" ? "R" : "B",
								" · ",
								loop.label
							] }, loop.id))
						] })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectionSurface, {
						hint: "Select a variable, signed link or loop to inspect the feedback relationship.",
						selected,
						onClose: () => setSelected(void 0)
					})
				]
			});
		}
		//#endregion
		//#region src/client/visuals/index.tsx
		/**
		* The visual@4 shell: one card, one heading, one optional sequence controller,
		* one error boundary, and whichever native renderer the payload names.
		*
		* The shell owns everything that is not renderer-specific, including the
		* emphasis a sequence frame produces. Frames earlier than the current one
		* contribute a `visited` tier, so the controller and the figure agree about
		* what has already been covered without each renderer re-deriving it.
		*/
		const VISUAL_RENDERER_REGISTRY = {
			plot: PlotRenderer,
			node_link: NodeLinkRenderer,
			scene_2d: Scene2DRenderer,
			relation: RelationRenderer,
			timeline: TimelineRenderer,
			formula_steps: FormulaStepsRenderer,
			study_map: StudyMapRenderer,
			recall_deck: RecallDeckRenderer,
			data_table: DataTableRenderer,
			state_transition: StateTransitionRenderer,
			sequence_buffer: SequenceBufferRenderer,
			sequence_diagram: SequenceDiagramRenderer,
			code_trace: CodeTraceRenderer,
			field_2d: Field2DRenderer,
			causal_loop: CausalLoopRenderer
		};
		function RegisteredVisual({ content, focus, storageKey, onRecallStatusChange }) {
			const Renderer = VISUAL_RENDERER_REGISTRY[content.kind];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Renderer, {
				content,
				focus,
				storageKey,
				onRecallStatusChange
			});
		}
		function LearningVisualV4({ visual, storageKey, labels: suppliedLabels, onRecallStatusChange }) {
			const titleId = (0, react.useId)();
			const descriptionId = (0, react.useId)();
			const initialFrameIndex = visual.sequence === void 0 ? 0 : Math.max(0, visual.sequence.frames.findIndex((frame) => frame.id === visual.sequence?.initialFrameId));
			const [frameIndex, setFrameIndex] = (0, react.useState)(initialFrameIndex);
			const labels = (0, react.useMemo)(() => ({
				...DEFAULT_LABELS,
				...suppliedLabels
			}), [suppliedLabels]);
			const focus = (0, react.useMemo)(() => {
				const frames = visual.sequence?.frames;
				if (frames === void 0) return visualFocus([]);
				return visualFocus(frames[frameIndex]?.focusIds ?? [], frames.slice(0, frameIndex).flatMap((frame) => frame.focusIds));
			}, [frameIndex, visual.sequence]);
			(0, react.useEffect)(() => setFrameIndex(initialFrameIndex), [initialFrameIndex, visual.sequence]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VisualLabelsProvider, {
				value: labels,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: shell_module_css_default.visualShell,
					...learningScope,
					"data-learning-visual": visual.content.kind,
					"data-render-state": "ready",
					"aria-labelledby": titleId,
					"aria-describedby": visual.description === void 0 ? void 0 : descriptionId,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: shell_module_css_default.visualHeader,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: shell_module_css_default.visualEyebrow,
									"aria-hidden": "true",
									children: labels.eyebrow
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									id: titleId,
									children: visual.title
								}),
								visual.description === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									id: descriptionId,
									children: visual.description
								})
							]
						}),
						visual.sequence === void 0 || visual.sequence.frames.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SequenceController, {
							sequence: visual.sequence,
							frameIndex,
							onFrameChange: setFrameIndex
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VisualErrorBoundary, {
							fallbackMarkdown: visual.fallbackMarkdown,
							labels,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RegisteredVisual, {
								content: visual.content,
								focus,
								storageKey,
								onRecallStatusChange
							})
						}, `${visual.protocol}:${visual.title}:${visual.content.kind}`)
					]
				})
			});
		}
		//#endregion
		//#region src/client/LearningToolView.tsx
		const MAX_PARSEABLE_ARGS_BYTES = 65536;
		const MAX_FALLBACK_MARKDOWN_LENGTH = 8e3;
		const VISUAL_LABEL_KEYS = {
			eyebrow: "visualEyebrow",
			errorTitle: "visualErrorTitle",
			errorContinue: "visualErrorContinue",
			sequenceLabel: "visualSequenceLabel",
			previousStep: "visualPreviousStep",
			nextStep: "visualNextStep",
			reset: "visualReset",
			chartProbeHint: "visualChartProbeHint",
			metricsLabel: "visualMetricsLabel",
			legendLabel: "visualLegendLabel",
			plotInteractionHint: "visualPlotInteractionHint",
			noValuesInRange: "visualNoValuesInRange",
			seriesOutOfRange: "visualSeriesOutOfRange",
			nodeLinkSummary: "visualNodeLinkSummary",
			connection: "visualConnection",
			layerLabel: "visualLayerLabel",
			edgeLabel: "visualEdgeLabel",
			nodeLinkInteractionHint: "visualNodeLinkInteractionHint",
			nodeKind: "visualNodeKind",
			edgeKind: "visualEdgeKind",
			noDetail: "visualNoDetail",
			closeDetail: "visualCloseDetail",
			elementFallback: "visualElementFallback",
			sceneSummary: "visualSceneSummary",
			sceneInteractionHint: "visualSceneInteractionHint",
			elementKind: "visualElementKind",
			comparisonCaption: "visualComparisonCaption",
			comparisonDimension: "visualComparisonDimension",
			comparisonSubject: "visualComparisonSubject",
			comparisonInteractionHint: "visualComparisonInteractionHint",
			matrixCaption: "visualMatrixCaption",
			matrixAxes: "visualMatrixAxes",
			noRelation: "visualNoRelation",
			matrixInteractionHint: "visualMatrixInteractionHint",
			setsLabel: "visualSetsLabel",
			noExclusiveItems: "visualNoExclusiveItems",
			intersections: "visualIntersections",
			uncategorized: "visualUncategorized",
			setsInteractionHint: "visualSetsInteractionHint",
			timelineLabel: "visualTimelineLabel",
			timelineEventKind: "visualTimelineEventKind",
			timelineEraKind: "visualTimelineEraKind",
			timelineInteractionHint: "visualTimelineInteractionHint",
			formulaLabel: "visualFormulaLabel",
			formulaProgress: "visualFormulaProgress",
			formulaRule: "visualFormulaRule",
			formulaConclusion: "visualFormulaConclusion",
			revealNextFormulaStep: "visualRevealNextFormulaStep",
			formulaComplete: "visualFormulaComplete",
			formulaInteractionHint: "visualFormulaInteractionHint",
			studySource: "visualStudySource",
			studyGoal: "visualStudyGoal",
			studySections: "visualStudySections",
			studyConcepts: "visualStudyConcepts",
			studyAnchor: "visualStudyAnchor",
			studySummary: "visualStudySummary",
			prerequisite: "visualPrerequisite",
			noPrerequisite: "visualNoPrerequisite",
			roleFoundation: "visualRoleFoundation",
			roleCore: "visualRoleCore",
			roleExtension: "visualRoleExtension",
			rolePractice: "visualRolePractice",
			studyInteractionHint: "visualStudyInteractionHint",
			recallDeckLabel: "visualRecallDeckLabel",
			recallProgress: "visualRecallProgress",
			recallPrompt: "visualRecallPrompt",
			recallHint: "visualRecallHint",
			recallAnswer: "visualRecallAnswer",
			showHint: "visualShowHint",
			showAnswer: "visualShowAnswer",
			previousCard: "visualPreviousCard",
			nextCard: "visualNextCard",
			resetDeck: "visualResetDeck",
			mastered: "visualMastered",
			reviewAgain: "visualReviewAgain",
			unrated: "visualUnrated",
			recallStatus: "visualRecallStatus",
			recallInteractionHint: "visualRecallInteractionHint",
			stepOfTotal: "visualStepOfTotal",
			emptyVisual: "visualEmpty",
			graphLegendLabel: "visualGraphLegendLabel",
			stateCurrent: "visualStateCurrent",
			stateRelated: "visualStateRelated",
			stateContext: "visualStateContext",
			stateVisited: "visualStateVisited"
		};
		function visualLabelsOf(t) {
			return Object.fromEntries(Object.entries(VISUAL_LABEL_KEYS).map(([label, key]) => [label, t(key)]));
		}
		/** Read the model-authored arguments, whichever block shape carries them. */
		function argsRawOf(block) {
			return "kind" in block ? block.call?.argsRaw : block.argsRaw;
		}
		/** Concatenate the tool result text, whichever block shape carries it. */
		function resultTextOf(block) {
			if (!("kind" in block)) return "";
			return block.content.filter((item) => item.type === "text").map((item) => item.text).join("");
		}
		function issuesOf(cause) {
			if (cause instanceof LearningProtocolError) return cause.issues;
			return [cause instanceof Error ? cause.message : String(cause)];
		}
		function boundedText(value, limit) {
			if (typeof value !== "string") return void 0;
			const trimmed = value.trim();
			return trimmed === "" || value.length > limit ? void 0 : trimmed;
		}
		/**
		* Salvage the model's own text equivalent from arguments that failed the
		* closed schema, so a rejected payload still teaches instead of vanishing.
		*/
		function textFallbackOf(parsed) {
			const protocol = parsed.protocol;
			if (protocol === "dsh-learning/checkpoint@1") {
				const markdown = parsed.fallbackMarkdown;
				if (typeof markdown !== "string" || markdown.trim() === "" || markdown.length > MAX_FALLBACK_MARKDOWN_LENGTH || !isLearningCheckpointDisplayTextSafe(markdown)) return void 0;
				return {
					markdown,
					protocol: CHECKPOINT_PROTOCOL
				};
			}
			if (protocol !== "dsh-learning/visual@4" && protocol !== "dsh-learning/visual@3") return void 0;
			const title = boundedText(parsed.title, 200);
			const description = boundedText(parsed.description, 1e3);
			const markdown = typeof parsed.fallbackMarkdown === "string" && parsed.fallbackMarkdown.trim() !== "" && parsed.fallbackMarkdown.length <= MAX_FALLBACK_MARKDOWN_LENGTH ? parsed.fallbackMarkdown : void 0;
			if (markdown === void 0 && description === void 0 && title === void 0) return void 0;
			return {
				...markdown === void 0 ? {} : { markdown },
				text: description ?? title ?? "",
				protocol
			};
		}
		/**
		* Parse one complete `argsRaw` string exactly once.
		*
		* While arguments still stream this returns an empty result with no issues,
		* which the surface renders as the neutral running state; a genuinely invalid
		* payload returns the concrete schema violations instead.
		*/
		/**
		* Recover the visual's title from arguments that are still streaming.
		*
		* `title` is the only top-level title in the visual@4 schema and the model
		* emits it early, so the first match names the figure being built. Showing it
		* turns a generic wait into a specific one; the value is rendered as plain
		* text, never as Markdown or HTML.
		*/
		const PARTIAL_TITLE = /"title"\s*:\s*"((?:[^"\\]|\\.){0,240})"/;
		function streamingTitleOf(raw) {
			if (!raw.includes("dsh-learning/visual@4")) return void 0;
			const encoded = PARTIAL_TITLE.exec(raw)?.[1];
			if (encoded === void 0) return void 0;
			try {
				const title = JSON.parse(`"${encoded}"`);
				if (typeof title !== "string") return void 0;
				const trimmed = title.trim();
				return trimmed === "" || trimmed.length > 200 ? void 0 : trimmed;
			} catch {
				return;
			}
		}
		function parseLearningCall(raw) {
			if (raw === void 0 || raw === "") return {};
			if (raw.length > MAX_PARSEABLE_ARGS_BYTES) return { issues: [`arguments exceed ${String(MAX_PARSEABLE_ARGS_BYTES)} bytes`] };
			let parsed;
			try {
				const value = JSON.parse(raw);
				if (typeof value !== "object" || value === null || Array.isArray(value)) return { issues: ["arguments must be a JSON object"] };
				parsed = value;
			} catch {
				const streamingTitle = streamingTitleOf(raw);
				return streamingTitle === void 0 ? {} : { streamingTitle };
			}
			try {
				const protocol = parsed.protocol;
				return { definition: protocol === "dsh-learning/checkpoint@1" ? parseLearningCheckpointV1(parsed) : protocol === "dsh-learning/visual@4" ? parseLearningVisualV4(parsed) : protocol === "dsh-learning/visual@3" ? parseLearningVisualV3(parsed) : protocol === "dsh-learning/activity@2" ? parseLearningActivityV2(parsed) : parseLearningActivity(parsed) };
			} catch (cause) {
				const fallback = textFallbackOf(parsed);
				return {
					issues: issuesOf(cause),
					...fallback === void 0 ? {} : { fallback }
				};
			}
		}
		/** Parse one complete tool result exactly once, in the definition's context. */
		function parseLearningResult(text, definition) {
			if (text === "") return void 0;
			try {
				const parsed = JSON.parse(text);
				if (parsed.protocol === "dsh-learning/checkpoint-result@1") return parseLearningCheckpointResultV1(parsed, definition?.protocol === "dsh-learning/checkpoint@1" ? { checkpoint: definition } : {});
				return parsed.protocol === "dsh-learning/response@2" ? parseLearningResponseV2(parsed) : parseLearningResponse(parsed);
			} catch {
				return;
			}
		}
		/** Parse one complete visual result exactly once. */
		function parseVisualResult(text) {
			if (text === "") return void 0;
			try {
				const parsed = JSON.parse(text);
				return parsed.protocol === "dsh-learning/visual-result@4" ? parseLearningVisualResultV4(parsed) : parseLearningVisualResultV3(parsed);
			} catch {
				return;
			}
		}
		function pendingActivity(interactions, sessionId, activity, callId) {
			if (activity === void 0) return void 0;
			if (activity.protocol === "dsh-learning/visual@3" || activity.protocol === "dsh-learning/visual@4") return void 0;
			if (activity.protocol === "dsh-learning/checkpoint@1") return interactions.find((interaction) => {
				if (interaction.kind !== "question" || String(interaction.sessionId) !== sessionId) return false;
				const envelope = envelopeOf(interaction);
				return envelope !== void 0 && "checkpoint" in envelope && envelope.sessionId === sessionId && envelope.callId === callId;
			});
			if (activity.protocol === "dsh-learning/activity@2") return interactions.find((interaction) => {
				if (interaction.kind !== "question" || String(interaction.sessionId) !== sessionId) return false;
				const envelope = envelopeOf(interaction);
				if (envelope === void 0 || !("phase" in envelope)) return false;
				if (envelope.callId !== void 0 && envelope.callId !== callId) return false;
				return envelope.phase === activity.phase && envelope.seq === activity.seq && envelope.activityId !== "" && envelope.waitId !== "";
			});
			const canonical = JSON.stringify(activity);
			return interactions.find((interaction) => {
				if (interaction.kind !== "question" || String(interaction.sessionId) !== sessionId) return false;
				const envelope = envelopeOf(interaction);
				return envelope !== void 0 && "activity" in envelope && JSON.stringify(envelope.activity) === canonical;
			});
		}
		function explanationOf(response) {
			if (response?.action !== "submit" || typeof response.answer !== "object" || response.answer === null || Array.isArray(response.answer)) return void 0;
			const explanation = response.answer.explanation;
			return typeof explanation === "string" && explanation.trim() !== "" ? explanation.trim() : void 0;
		}
		function compactAnswer(answer) {
			if (answer === void 0 || answer === null) return void 0;
			if (typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") return String(answer);
			if (!Array.isArray(answer)) for (const key of [
				"text",
				"explanation",
				"answer"
			]) {
				const candidate = answer[key];
				if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
			}
			try {
				return JSON.stringify(answer);
			} catch {
				return;
			}
		}
		function answerRecord(response) {
			if (response?.action !== "submit" || typeof response.answer !== "object" || response.answer === null || Array.isArray(response.answer)) return void 0;
			return response.answer;
		}
		function evidenceOf(activity, response, t) {
			const answer = answerRecord(response);
			if (answer === void 0) return void 0;
			if (activity.kind === "parameter_explorer") {
				const parameters = answer.parameters;
				if (typeof parameters !== "object" || parameters === null || Array.isArray(parameters)) return void 0;
				const values = activity.payload.parameters.flatMap((parameter) => {
					const value = parameters[parameter.id];
					return typeof value === "number" ? [t("rangeValue", {
						label: parameter.label,
						value
					})] : [];
				});
				return values.length === 0 ? void 0 : values.join(" · ");
			}
			if (activity.kind === "process_stepper") {
				const checkpoints = answer.checkpoints;
				return Array.isArray(checkpoints) && checkpoints.length > 0 ? t("processEvidence", { count: checkpoints.length }) : void 0;
			}
			const selected = answer.selectedDifferences;
			return Array.isArray(selected) ? t("structureEvidence", { count: selected.length }) : void 0;
		}
		function checkpointAnswerOf(activity, result) {
			if (result.status !== "submitted") return void 0;
			const response = result.response;
			if ("optionId" in response) return activity.options?.find((option) => option.id === response.optionId)?.label ?? response.optionId;
			if ("number" in response) return String(response.number);
			const text = response.text.trim();
			return text.length <= 500 ? text : `${text.slice(0, 499)}…`;
		}
		/** The single running state, shared by every protocol branch. */
		function LearningRunning({ title, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: LearningActivity_module_css_default.inlineStatus,
				...learningScope,
				"data-state": "running",
				role: "status",
				"aria-live": "polite",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LearningActivity_module_css_default.runningDot,
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: title === void 0 ? t("waiting") : t("preparing", { title }) }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LearningActivity_module_css_default.skeletonLine,
						"aria-hidden": "true"
					})
				]
			});
		}
		/**
		* The single failure surface, shared by every protocol branch.
		*
		* It always states what went wrong, and always keeps whatever text equivalent
		* survived, so a rejected payload degrades to reading rather than to nothing.
		*/
		function LearningFallback({ headline, issues, fallback, markdown, text, state, protocol, t }) {
			const body = markdown ?? fallback?.markdown;
			const plain = text ?? fallback?.text;
			const reason = issues === void 0 || issues.length === 0 ? void 0 : t("invalidReason", { reason: issues.join("; ") });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LearningActivity_module_css_default.inlineFallback,
				...learningScope,
				"data-learning-result": state,
				...protocol === void 0 ? {} : { "data-learning-fallback": protocol },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: LearningActivity_module_css_default.inlineResult,
						role: "alert",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LearningActivity_module_css_default.errorMark,
							"aria-hidden": "true",
							children: "!"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: headline })]
					}),
					reason === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.fallbackReason,
						children: reason
					}),
					body === void 0 ? plain === void 0 || plain === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: LearningActivity_module_css_default.visualTextFallback,
						children: plain
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LearningActivity_module_css_default.fallbackText,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: body })
					})
				]
			});
		}
		/** The single completed-receipt line, shared by checkpoint and legacy replay. */
		function LearningReceipt({ status, state, evidence, answer }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: LearningActivity_module_css_default.inlineResult,
				...learningScope,
				"data-learning-result": state,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LearningActivity_module_css_default.resultMark,
						"aria-hidden": "true",
						children: "✓"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: status }),
					evidence === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: LearningActivity_module_css_default.resultEvidence,
						children: evidence
					}),
					answer === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: LearningActivity_module_css_default.resultAnswer,
						children: [
							"“",
							answer,
							"”"
						]
					})
				]
			});
		}
		function LearningToolView({ block, inspect, t, useSession, sessionId }) {
			const done = "kind" in block;
			const raw = argsRawOf(block);
			const resultText = resultTextOf(block);
			const isError = "kind" in block && block.isError === true;
			const callId = block.callId;
			const { definition, issues, fallback, streamingTitle } = (0, react.useMemo)(() => parseLearningCall(raw), [raw]);
			const result = (0, react.useMemo)(() => parseLearningResult(resultText, definition), [resultText, definition]);
			const visualResult = (0, react.useMemo)(() => parseVisualResult(resultText), [resultText]);
			const labels = (0, react.useMemo)(() => visualLabelsOf(t), [t]);
			const matched = pendingActivity(useSession((snapshot) => snapshot.pending), String(sessionId), definition, callId);
			(0, react.useEffect)(() => {
				if (done || raw === void 0 || raw === "") return;
				if (definition === void 0) emitLearningCallLifecycle("learning.call.stream_started", { callId });
				else emitLearningCallLifecycle("learning.call.args_completed", {
					callId,
					phase: definition.protocol === "dsh-learning/activity@2" ? definition.phase : void 0,
					seq: definition.protocol === "dsh-learning/activity@2" ? definition.seq : void 0
				});
			}, [
				definition,
				callId,
				done,
				raw
			]);
			if (definition === void 0) {
				if (!done && issues === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningRunning, {
					title: streamingTitle,
					t
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningFallback, {
					headline: t("invalidActivity"),
					issues,
					fallback,
					state: "invalid",
					protocol: fallback?.protocol,
					t
				});
			}
			if (definition.protocol === "dsh-learning/checkpoint@1") {
				if (!done) return matched === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningRunning, { t }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningInteraction, {
					matched,
					t
				});
				const checkpointResult = result?.protocol === "dsh-learning/checkpoint-result@1" ? result : void 0;
				if (isError || checkpointResult === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningFallback, {
					headline: t("invalidResult"),
					markdown: definition.fallbackMarkdown,
					state: "error",
					protocol: CHECKPOINT_PROTOCOL,
					t
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningReceipt, {
					state: checkpointResult.status,
					status: checkpointResult.status === "submitted" ? t("completed") : checkpointResult.status === "skipped" ? t("skipped") : t("cancelled"),
					answer: checkpointAnswerOf(definition, checkpointResult)
				});
			}
			if (definition.protocol === "dsh-learning/visual@4") {
				if (done && (isError || visualResult?.protocol !== "dsh-learning/visual-result@4")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningFallback, {
					headline: t("visualFailed"),
					markdown: definition.fallbackMarkdown,
					text: definition.description ?? definition.title,
					state: "error",
					protocol: "visual-v4",
					t
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningVisualV4, {
					visual: definition,
					storageKey: `${String(sessionId)}:${callId ?? "visual"}`,
					labels,
					onRecallStatusChange: (cardId, status) => {
						if (callId === void 0) return;
						emitLearningUiLifecycle({
							name: "learning.recall.rated",
							sessionId: String(sessionId),
							callId,
							cardId,
							status
						});
					}
				});
			}
			if (definition.protocol === "dsh-learning/visual@3") {
				if (done && (isError || visualResult?.protocol !== "dsh-learning/visual-result@3")) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningFallback, {
					headline: t("visualFailed"),
					text: definition.description ?? definition.title,
					state: "error",
					protocol: "visual-v3",
					t
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningVisual, {
					visual: definition,
					storageKey: `${String(sessionId)}:${callId ?? "visual"}`
				});
			}
			if (definition.protocol === "dsh-learning/activity@2") {
				if (!done) return matched === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningRunning, { t }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningInteraction, {
					matched,
					t
				});
				const v2Response = result?.protocol === "dsh-learning/response@2" ? result : void 0;
				if (v2Response === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningFallback, {
					headline: t("invalidResult"),
					markdown: definition.fallbackMarkdown,
					state: "error",
					protocol: ACTIVITY_PROTOCOL_V2,
					t
				});
				if (definition.phase === "question") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningReceipt, {
					state: v2Response.action,
					status: v2Response.action === "submit" ? t("completed") : v2Response.action === "skip" ? t("skipped") : t("cancelled"),
					answer: v2Response.phase === "question" ? compactAnswer(v2Response.answer) : void 0
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: LearningActivity_module_css_default.legacyReveal,
					...learningScope,
					"data-learning-result": v2Response.action,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, { text: definition.feedback.explanation }), definition.feedback.answer === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: definition.feedback.answer })]
				});
			}
			if (!done) return matched === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningRunning, { t }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningInteraction, {
				matched,
				t
			});
			if (result === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningFallback, {
				headline: t("invalidResult"),
				markdown: definition.fallbackMarkdown,
				state: "unknown",
				protocol: RESPONSE_PROTOCOL,
				t
			});
			const legacyResponse = result.protocol === "dsh-learning/response@1" ? result : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningReceipt, {
				state: legacyResponse?.action ?? "unknown",
				status: legacyResponse?.action === "submit" ? t("completed") : legacyResponse?.action === "skip" ? t("skipped") : legacyResponse?.action === "cancel" ? t("cancelled") : t("invalidResult"),
				evidence: evidenceOf(definition, legacyResponse, t),
				answer: explanationOf(legacyResponse)
			});
		}
		//#endregion
		//#region src/client/locales.ts
		const zh = {
			scaffold: "提示",
			submit: "提交回答",
			skip: "先跳过",
			cancel: "结束这里",
			submitting: "正在提交…",
			waiting: "准备交互内容…",
			preparing: "正在准备：{title}",
			completed: "已提交你的回答",
			skipped: "已跳过",
			cancelled: "已结束",
			noResponse: "未记录回答",
			invalidResult: "互动已结束，但结果无法恢复",
			processEvidence: "完成了 {count} 个检查点",
			structureEvidence: "选择了 {count} 项差异",
			answer: "你的解释",
			answerPlaceholder: "用一两句话解释你观察到的关系…",
			predict: "先预测",
			reveal: "揭示这一步",
			previous: "上一步",
			next: "下一步",
			restart: "重新开始",
			step: "第 {current} / {total} 步",
			processMap: "流程步骤",
			compareMap: "结构对应关系",
			rangeValue: "{label}：{value}",
			decreaseParameter: "减小{label}",
			increaseParameter: "增大{label}",
			chartLabel: "参数变化曲线",
			chartDescription: "参数：{parameters}。横轴：{xAxis}。纵轴：{yAxis}。曲线：{curves}。",
			invalidActivity: "该互动活动无法安全显示；如有文字说明，已在下方保留。",
			invalidReason: "原因：{reason}",
			visualFailed: "交互图未能完成，已保留文字说明",
			error: "提交失败：{message}",
			submitAnswer: "提交回答",
			awaitingReveal: "回答已提交，正在等待讲解…",
			continue: "继续",
			roundProgress: "第 {current} / {total} 轮",
			checkpointEyebrow: "学习检查点",
			checkpointEvidenceAttempt: "试着作答",
			checkpointEvidencePrediction: "先做预测",
			checkpointEvidenceExplanation: "说明你的理由",
			checkpointEvidenceContrast: "指出两者的差异",
			checkpointEvidenceTransfer: "迁移到新的例子",
			checkpointFreeTextLabel: "你的回答",
			checkpointChoiceLabel: "选择一项",
			checkpointNumericLabel: "填写数值",
			checkpointPredictionLabel: "你的预测",
			checkpointCodeLabel: "补全代码",
			checkpointKeyboardHint: "文本输入可按 Ctrl+Enter（macOS 为 Command+Enter）提交。",
			visualEyebrow: "交互可视化",
			visualErrorTitle: "视觉组件暂时无法显示",
			visualErrorContinue: "你仍可继续阅读上下文。",
			visualSequenceLabel: "视觉讲解步骤",
			visualPreviousStep: "上一步",
			visualNextStep: "下一步",
			visualReset: "重置",
			visualChartProbeHint: "图表，按左右方向键开始探查数值",
			visualMetricsLabel: "当前指标",
			visualLegendLabel: "图例与系列显示",
			visualPlotInteractionHint: "鼠标移入图表可探查数值；键盘聚焦图表后可用 ← → 移动。",
			visualNoValuesInRange: "当前坐标范围内没有可显示的数值。",
			visualSeriesOutOfRange: "不在范围内",
			visualNodeLinkSummary: "{nodes} 个节点，{edges} 条连线。",
			visualConnection: "{from} 到 {to}",
			visualLayerLabel: "第 {index} 层",
			visualEdgeLabel: "连线",
			visualNodeLinkInteractionHint: "选择节点或连线查看解释；键盘按 Tab 进入图形，再用 ← → 移动、Enter 选择。",
			visualNodeKind: "节点",
			visualEdgeKind: "连线",
			visualNoDetail: "暂无补充说明。",
			visualCloseDetail: "关闭详细说明",
			visualElementFallback: "图元 {id}",
			visualSceneSummary: "二维场景，{elements} 个图元。{labels}",
			visualSceneInteractionHint: "选择图中的点、线或形状查看说明；键盘按 Tab 进入图形，再用 ← → 移动、Enter 选择。",
			visualElementKind: "图元",
			visualComparisonCaption: "特征对比表",
			visualComparisonDimension: "对比维度",
			visualComparisonSubject: "对比对象",
			visualComparisonInteractionHint: "按行阅读可对比同一维度；选择表头可查看补充说明。",
			visualMatrixCaption: "关系矩阵",
			visualMatrixAxes: "行 ↓ / 列 →",
			visualNoRelation: "无关系",
			visualMatrixInteractionHint: "从行与列的交点读取关系；选择单元格可查看细节。",
			visualSetsLabel: "集合关系图",
			visualNoExclusiveItems: "无独有项",
			visualIntersections: "交集 / 共有",
			visualUncategorized: "未归类",
			visualSetsInteractionHint: "单一归属项在各集合内，多重归属项在交集区。",
			visualTimelineLabel: "时间线",
			visualTimelineEventKind: "事件",
			visualTimelineEraKind: "时期",
			visualTimelineInteractionHint: "选择事件或时期可查看补充说明。",
			visualFormulaLabel: "公式推导",
			visualFormulaProgress: "第 {current} / {total} 步",
			visualFormulaRule: "规则",
			visualFormulaConclusion: "结论",
			visualRevealNextFormulaStep: "显示下一步",
			visualFormulaComplete: "推导已完成",
			visualFormulaInteractionHint: "先预测下一步，再逐步揭示变形规则。",
			visualStudySource: "学习来源",
			visualStudyGoal: "学习目标",
			visualStudySections: "来源章节",
			visualStudyConcepts: "本节概念",
			visualStudyAnchor: "位置",
			visualStudySummary: "摘要",
			visualPrerequisite: "前置概念",
			visualNoPrerequisite: "无",
			visualRoleFoundation: "基础",
			visualRoleCore: "核心",
			visualRoleExtension: "拓展",
			visualRolePractice: "练习",
			visualStudyInteractionHint: "按来源章节导览，选择概念查看作用、前置关系与详细说明。",
			visualRecallDeckLabel: "回忆卡组",
			visualRecallProgress: "第 {current} / {total} 张",
			visualRecallPrompt: "问题",
			visualRecallHint: "提示",
			visualRecallAnswer: "答案",
			visualShowHint: "查看提示",
			visualShowAnswer: "显示答案",
			visualPreviousCard: "上一张",
			visualNextCard: "下一张",
			visualResetDeck: "重置卡组",
			visualMastered: "已掌握",
			visualReviewAgain: "待复习",
			visualUnrated: "未标记",
			visualRecallStatus: "掌握 {mastered} · 待复习 {review}",
			visualRecallInteractionHint: "先在心中回答，再查看提示和答案，最后标记掌握状态。",
			visualStepOfTotal: "第 {current} / {total} 步",
			visualEmpty: "这张图目前没有可显示的内容。",
			visualGraphLegendLabel: "图形状态说明",
			visualStateCurrent: "当前重点",
			visualStateRelated: "相关路径",
			visualStateContext: "其余结构",
			visualStateVisited: "已讲过"
		};
		const en = {
			scaffold: "Hint",
			submit: "Submit response",
			skip: "Skip for now",
			cancel: "End here",
			submitting: "Submitting…",
			waiting: "Preparing the interaction…",
			preparing: "Preparing: {title}",
			completed: "Response submitted",
			skipped: "Skipped",
			cancelled: "Ended",
			noResponse: "No response recorded",
			invalidResult: "The interaction ended, but its result could not be restored",
			processEvidence: "{count} checkpoints completed",
			structureEvidence: "{count} differences selected",
			answer: "Your explanation",
			answerPlaceholder: "Explain the relationship you noticed in one or two sentences…",
			predict: "Predict first",
			reveal: "Reveal this step",
			previous: "Previous",
			next: "Next",
			restart: "Restart",
			step: "Step {current} / {total}",
			processMap: "Process steps",
			compareMap: "Structural relationships",
			rangeValue: "{label}: {value}",
			decreaseParameter: "Decrease {label}",
			increaseParameter: "Increase {label}",
			chartLabel: "Parameter relationship chart",
			chartDescription: "Parameters: {parameters}. X axis: {xAxis}. Y axis: {yAxis}. Curves: {curves}.",
			invalidActivity: "This activity could not be displayed safely; any available text explanation is preserved below.",
			invalidReason: "Reason: {reason}",
			visualFailed: "The interactive visual could not complete; the text explanation is preserved",
			error: "Submission failed: {message}",
			submitAnswer: "Submit answer",
			awaitingReveal: "Answer submitted. Waiting for the reveal…",
			continue: "Continue",
			roundProgress: "Round {current} / {total}",
			checkpointEyebrow: "Learning checkpoint",
			checkpointEvidenceAttempt: "Make an attempt",
			checkpointEvidencePrediction: "Make a prediction",
			checkpointEvidenceExplanation: "Explain your reasoning",
			checkpointEvidenceContrast: "Draw the contrast",
			checkpointEvidenceTransfer: "Apply it to a new case",
			checkpointFreeTextLabel: "Your response",
			checkpointChoiceLabel: "Choose one option",
			checkpointNumericLabel: "Enter a number",
			checkpointPredictionLabel: "Your prediction",
			checkpointCodeLabel: "Complete the code",
			checkpointKeyboardHint: "For text fields, press Ctrl+Enter (Command+Enter on macOS) to submit.",
			visualEyebrow: "Interactive visual",
			visualErrorTitle: "The visual could not be displayed",
			visualErrorContinue: "You can still continue with the surrounding explanation.",
			visualSequenceLabel: "Visual explanation steps",
			visualPreviousStep: "Previous step",
			visualNextStep: "Next step",
			visualReset: "Reset",
			visualChartProbeHint: "Chart; use the left and right arrow keys to inspect values",
			visualMetricsLabel: "Current metrics",
			visualLegendLabel: "Legend and series visibility",
			visualPlotInteractionHint: "Move over the chart to inspect values, or focus it and use ← →.",
			visualNoValuesInRange: "No values fall inside the current axes.",
			visualSeriesOutOfRange: "outside the range",
			visualNodeLinkSummary: "{nodes} nodes and {edges} connections.",
			visualConnection: "{from} to {to}",
			visualLayerLabel: "Layer {index}",
			visualEdgeLabel: "Connection",
			visualNodeLinkInteractionHint: "Select a node or connection for details; from the keyboard, Tab into the figure, then move with ← → and select with Enter.",
			visualNodeKind: "Node",
			visualEdgeKind: "Connection",
			visualNoDetail: "No additional detail.",
			visualCloseDetail: "Close details",
			visualElementFallback: "Element {id}",
			visualSceneSummary: "Two-dimensional scene with {elements} elements. {labels}",
			visualSceneInteractionHint: "Select a point, line, or shape for its explanation; from the keyboard, Tab into the figure, then move with ← → and select with Enter.",
			visualElementKind: "Element",
			visualComparisonCaption: "Feature comparison",
			visualComparisonDimension: "Dimension",
			visualComparisonSubject: "Subject",
			visualComparisonInteractionHint: "Read across a row to compare one dimension; select a heading for details.",
			visualMatrixCaption: "Relationship matrix",
			visualMatrixAxes: "Rows ↓ / columns →",
			visualNoRelation: "No relationship",
			visualMatrixInteractionHint: "Read a relationship at the row-column intersection; select a cell for details.",
			visualSetsLabel: "Set relationship",
			visualNoExclusiveItems: "No exclusive items",
			visualIntersections: "Intersection / shared",
			visualUncategorized: "Uncategorized",
			visualSetsInteractionHint: "Exclusive items sit inside one set; multi-set items appear in the intersection.",
			visualTimelineLabel: "Timeline",
			visualTimelineEventKind: "Event",
			visualTimelineEraKind: "Era",
			visualTimelineInteractionHint: "Select an event or era for additional detail.",
			visualFormulaLabel: "Formula derivation",
			visualFormulaProgress: "Step {current} / {total}",
			visualFormulaRule: "Rule",
			visualFormulaConclusion: "Conclusion",
			visualRevealNextFormulaStep: "Reveal next step",
			visualFormulaComplete: "Derivation complete",
			visualFormulaInteractionHint: "Predict the next expression, then reveal each transformation rule.",
			visualStudySource: "Learning source",
			visualStudyGoal: "Learning goal",
			visualStudySections: "Source sections",
			visualStudyConcepts: "Concepts in this section",
			visualStudyAnchor: "Location",
			visualStudySummary: "Summary",
			visualPrerequisite: "Prerequisites",
			visualNoPrerequisite: "None",
			visualRoleFoundation: "Foundation",
			visualRoleCore: "Core",
			visualRoleExtension: "Extension",
			visualRolePractice: "Practice",
			visualStudyInteractionHint: "Navigate by source section, then select a concept for its role, prerequisites, and detail.",
			visualRecallDeckLabel: "Recall deck",
			visualRecallProgress: "Card {current} / {total}",
			visualRecallPrompt: "Prompt",
			visualRecallHint: "Hint",
			visualRecallAnswer: "Answer",
			visualShowHint: "Show hint",
			visualShowAnswer: "Show answer",
			visualPreviousCard: "Previous card",
			visualNextCard: "Next card",
			visualResetDeck: "Reset deck",
			visualMastered: "Mastered",
			visualReviewAgain: "Review again",
			visualUnrated: "Not rated",
			visualRecallStatus: "{mastered} mastered · {review} to review",
			visualRecallInteractionHint: "Answer from memory before revealing the hint and answer, then mark your recall.",
			visualStepOfTotal: "Step {current} of {total}",
			visualEmpty: "This figure has nothing to show yet.",
			visualGraphLegendLabel: "What the emphasis means",
			visualStateCurrent: "This step",
			visualStateRelated: "On the path",
			visualStateContext: "Rest of the structure",
			visualStateVisited: "Already covered"
		};
		//#endregion
		//#region src/client/index.ts
		const NS = "interactive-learning";
		const LEARNING_TOOL_VIEW_KEYS = [
			"learning_visual",
			"learning_checkpoint",
			"learning_state_update",
			"learning_activity",
			"learning_question",
			"learning_reveal"
		];
		/** Learner-state writes are internal bookkeeping and never produce a card. */
		function LearningStateUpdateToolView() {
			return null;
		}
		const name = "interactive-learning-client";
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "interactive-learning: dictionaries");
			ctx.inject(["connection"], (connectionCtx) => {
				const connection = connectionCtx.get("connection");
				if (connection === void 0) return;
				connectionCtx.effect(() => subscribeLearningUiLifecycle((event) => {
					if (event.name !== "learning.recall.rated" || event.sessionId === void 0 || event.callId === void 0 || event.cardId === void 0 || event.status === void 0) return;
					connection.rpc.call("/interactive-learning", "recall/feedback", {
						protocol: "dsh-learning/recall-feedback@1",
						sessionId: event.sessionId,
						callId: event.callId,
						cardId: event.cardId,
						status: event.status
					}).then((result) => {
						if (typeof result === "object" && result !== null && result.ok === false) return;
					}).catch(() => {});
				}), "interactive-learning: recall feedback bridge");
			});
			ctx.slots.inject("conversation.composer", () => ctx.slots.register({
				name: "conversation.composer",
				select: selectLearningActivity,
				priority: -100,
				locale: NS
			}, LearningComposer));
			for (const key of LEARNING_TOOL_VIEW_KEYS) {
				if (key === "learning_state_update") {
					ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
						name: "tool.call.toolview",
						key,
						locale: NS
					}, LearningStateUpdateToolView));
					continue;
				}
				ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
					name: "tool.call.toolview",
					key,
					locale: NS
				}, LearningToolView));
			}
		}
		//#endregion
		exports.ActivityRendererRegistry = ActivityRendererRegistry;
		exports.LEARNING_TOOL_VIEW_KEYS = LEARNING_TOOL_VIEW_KEYS;
		exports.LearningStateUpdateToolView = LearningStateUpdateToolView;
		exports.activityRendererRegistry = activityRendererRegistry;
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		exports.subscribeLearningUiLifecycle = subscribeLearningUiLifecycle;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map