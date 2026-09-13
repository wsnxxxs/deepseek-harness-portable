import { t as registerInteractiveLearningSessionCompatibility } from "./bootstrap-D-0vNanD.js";
import { fileURLToPath } from "node:url";
//#region lib/types/preset.js
registerInteractiveLearningSessionCompatibility();
/** Packaged preset root; portable distributions merge this into their system roster. */
const interactiveLearningPresetRoot = fileURLToPath(new URL("../preset/", import.meta.url));
/** The independently installable preset directory inside the package. */
const interactiveLearningPresetSource = fileURLToPath(new URL("../preset/learning/", import.meta.url));
/** The optional bundle injects this source before the official preset provider. */
const name = "learning-preset-source";
function apply(ctx) {
	ctx.provide("learningPresetSource", {
		path: interactiveLearningPresetRoot,
		trust: "system"
	});
}
//#endregion
export { name as i, interactiveLearningPresetRoot as n, interactiveLearningPresetSource as r, apply as t };
