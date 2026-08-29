#!/usr/bin/env node
import { c as resolveAnchorTarget, h as normalizeQuote, o as mentionSupported, u as sectionMentions } from "./material-anchor-BC14nkcv.js";
import { l as gradeTeachingTrajectorySuite, n as OFFLINE_REFERENCE_CANDIDATES, r as OFFLINE_TRAJECTORY_CANDIDATES, s as gradeTeachingSuite } from "./eval-DiicoVsg.js";
import { readFile } from "node:fs/promises";
//#region lib/types/eval-material.js
/**
* Material-grounding metrics: the three checks that turn "do not invent
* sections, page anchors, or claims" from a standing instruction into something
* measurable.
*
* All three are decided against `.learning/structure/` — the parse's own record
* — and none needs a model judge. That is the point: a hallucinated chapter is a
* string that is not in a list, and a citation is either present in the cited
* section's text or it is not.
* @module @dsh-portable/interactive-learning/src/eval-material
*/
/**
* Anchor precision: the share of recorded anchors that resolve to a real
* section, and of cited claims that appear in a section the same turn cited.
*
* A turn that cites nothing is not penalized — plenty of teaching turns make no
* claim about the material. What is penalized is citing something that is not
* there.
* @param candidate - The trajectory and the structure it should be grounded in.
* @param minimum - Precision required to pass; defaults to 1 (no tolerance).
*/
function gradeAnchorPrecision(candidate, minimum = 1) {
	let anchors = 0;
	let resolved = 0;
	const unresolved = [];
	const unsupportedClaims = [];
	for (const turn of candidate.turns) {
		const cited = [];
		for (const anchor of turn.sourceAnchors ?? []) {
			anchors += 1;
			const section = resolveAnchorTarget(anchor, candidate.sections);
			if (section === void 0) unresolved.push(anchor);
			else {
				resolved += 1;
				cited.push(section);
			}
		}
		for (const claim of turn.citedClaims ?? []) {
			anchors += 1;
			const needle = normalizeQuote(claim);
			const scope = cited.length > 0 ? cited : [];
			if (needle !== "" && scope.some((section) => normalizeQuote(section.text).includes(needle))) resolved += 1;
			else unsupportedClaims.push(claim);
		}
	}
	const precision = anchors === 0 ? 1 : resolved / anchors;
	const problems = [...unresolved.map((anchor) => `unresolved anchor: ${anchor}`), ...unsupportedClaims.map((claim) => `claim not in a cited section: ${claim}`)];
	return {
		name: "anchor-precision",
		passed: precision >= minimum,
		detail: anchors === 0 ? "no anchors or cited claims in this trajectory" : `${resolved}/${anchors} grounded (${precision.toFixed(2)})` + (problems.length === 0 ? "" : `; ${problems.slice(0, 5).join("; ")}`)
	};
}
/**
* Hallucinated-section rate: how many section, chapter, or page references in
* the assistant's own text do not exist in the parsed structure.
*
* The target is zero. This is the check that makes structure-driven maps worth
* building — a map generated from the parse cannot fail it, while a summary the
* model wrote from memory can.
* @param candidate - The trajectory and its structure.
* @param maximum - Rate allowed to pass; defaults to 0.
*/
function gradeSectionHallucination(candidate, maximum = 0) {
	let mentions = 0;
	const invented = [];
	for (const turn of candidate.turns) for (const mention of sectionMentions(turn.text)) {
		mentions += 1;
		if (!mentionSupported(mention, candidate.sections)) invented.push(mention);
	}
	const rate = mentions === 0 ? 0 : invented.length / mentions;
	return {
		name: "section-hallucination",
		passed: rate <= maximum,
		detail: mentions === 0 ? "no section references in this trajectory" : `${invented.length}/${mentions} unsupported (${rate.toFixed(2)})` + (invented.length === 0 ? "" : `; invented: ${invented.slice(0, 5).join(", ")}`)
	};
}
/** Default per-turn material budget: the "do not dump the source" line. */
const DEFAULT_MATERIAL_BUDGET_CHARS = 4e3;
/**
* Summarize how much material actually reached the model per turn.
*
* This is the only honest evidence for the progressive-disclosure claim. A
* design that retrieves narrowly and one that pastes the chapter can look
* identical in a transcript; they do not look identical here.
* @param candidate - The trajectory.
* @param budget - Per-turn character budget.
*/
function summarizeMaterialBudget(candidate, budget = DEFAULT_MATERIAL_BUDGET_CHARS) {
	const counted = candidate.turns.map((turn) => turn.materialChars ?? 0);
	const totalChars = counted.reduce((total, chars) => total + chars, 0);
	return {
		turns: counted.length,
		totalChars,
		maxChars: counted.length === 0 ? 0 : Math.max(...counted),
		meanChars: counted.length === 0 ? 0 : Math.round(totalChars / counted.length),
		overBudgetTurns: counted.filter((chars) => chars > budget).length
	};
}
/** Budget check in the shared verdict shape. */
function gradeMaterialBudget(candidate, budget = DEFAULT_MATERIAL_BUDGET_CHARS) {
	const metrics = summarizeMaterialBudget(candidate, budget);
	return {
		name: "material-budget",
		passed: metrics.overBudgetTurns === 0,
		detail: `max ${metrics.maxChars} chars, mean ${metrics.meanChars}, ${metrics.overBudgetTurns}/${metrics.turns} turns over ${budget}`
	};
}
/** Run all three material checks over one candidate. */
function gradeMaterialGrounding(candidate) {
	const checks = [
		gradeAnchorPrecision(candidate),
		gradeSectionHallucination(candidate),
		gradeMaterialBudget(candidate)
	];
	return {
		caseId: candidate.caseId,
		passed: checks.every((check) => check.passed),
		checks
	};
}
/** Grade a suite of material candidates. */
function gradeMaterialSuite(candidates) {
	return candidates.map(gradeMaterialGrounding);
}
/** Offline candidates the CLI grades with no external input; all must pass. */
const OFFLINE_MATERIAL_CANDIDATES = [{
	caseId: "material-grounded",
	sections: [{
		sourceId: "js-guide",
		sectionId: "javascript-权威指南/第3章-作用域",
		label: "第3章 作用域",
		headingPath: ["JavaScript 权威指南", "第3章 作用域"],
		page: 38,
		text: "作用域决定标识符的可见范围。"
	}, {
		sourceId: "js-guide",
		sectionId: "javascript-权威指南/第3章-作用域/3-2-闭包",
		label: "3.2 闭包",
		headingPath: [
			"JavaScript 权威指南",
			"第3章 作用域",
			"3.2 闭包"
		],
		page: 42,
		text: "闭包捕获的是变量绑定，不是值。"
	}],
	turns: [{
		text: "我们从 3.2 闭包 开始。",
		sourceAnchors: ["js-guide#JavaScript 权威指南 › 第3章 作用域 › 3.2 闭包 (p.42)"],
		citedClaims: ["闭包捕获的是变量绑定，不是值。"],
		materialChars: 320
	}]
}];
//#endregion
//#region lib/types/eval-cli.js
function classify(values) {
	const teaching = [];
	const trajectories = [];
	const material = [];
	for (const value of values) {
		if (typeof value !== "object" || value === null) {
			teaching.push(value);
			continue;
		}
		if (Array.isArray(value.sections)) material.push(value);
		else if (Array.isArray(value.turns)) trajectories.push(value);
		else teaching.push(value);
	}
	return {
		teaching,
		trajectories,
		material
	};
}
async function candidatesFrom(path) {
	if (path === void 0) return {
		teaching: OFFLINE_REFERENCE_CANDIDATES,
		trajectories: OFFLINE_TRAJECTORY_CANDIDATES,
		material: OFFLINE_MATERIAL_CANDIDATES,
		fixture: true
	};
	const text = await readFile(path, "utf8");
	return {
		...classify(text.trimStart().startsWith("[") ? JSON.parse(text) : text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))),
		fixture: false
	};
}
const input = process.argv[2];
const candidates = await candidatesFrom(input);
const verdicts = [
	...candidates.teaching.length === 0 ? [] : gradeTeachingSuite(candidates.teaching),
	...candidates.trajectories.length === 0 ? [] : gradeTeachingTrajectorySuite(candidates.trajectories),
	...candidates.material.length === 0 ? [] : gradeMaterialSuite(candidates.material)
];
for (const verdict of verdicts) {
	process.stdout.write(`${candidates.fixture ? "FIXTURE" : "EXTERNAL_INPUT"} ${verdict.passed ? "PASS" : "FAIL"} ${verdict.caseId}\n`);
	for (const check of verdict.checks.filter((item) => !item.passed)) process.stdout.write(`  - ${check.name}: ${check.detail}\n`);
}
if (verdicts.some((verdict) => !verdict.passed)) process.exitCode = 1;
//#endregion
export {};
