import { v as registerLearningSessionEventType } from "./learner-state-CA63fLIw.js";
//#region lib/types/bootstrap.js
/**
* Compatibility hook for the installable Learning package.
*
* The portable runtime statically imports this package's preset entry before
* boot and before persistence can load a session. Keep session-event
* registration here so every Host/preset entry uses the same idempotent seam.
* The package-owned events are only restored when this package is mounted and
* has registered its vocabulary with the alpha.4 persistence catalog.
*/
/** Register the Learning session event for strict validation when the package is attached. */
function registerInteractiveLearningSessionCompatibility() {
	registerLearningSessionEventType();
}
registerInteractiveLearningSessionCompatibility();
//#endregion
export { registerInteractiveLearningSessionCompatibility as t };
