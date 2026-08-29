import { v as registerLearningSessionEventType } from "./learner-state-BiBCCaLg.js";
//#region lib/types/bootstrap.js
/**
* Compatibility hook for the installable Learning package.
*
* The portable runtime statically imports this package's preset entry before
* boot and before persistence can load a session. Keep session-event
* registration here so every Host/preset entry uses the same idempotent seam.
* Learning snapshots are also written with the envelope's `ignorable` marker,
* so a host that attaches this package lazily can still retain and fold them
* after the import resolves. The Session reader keeps an exact compatibility
* exception for older `learning/state` snapshots written before that marker.
*/
/** Register the Learning session event for strict validation when the package is attached. */
function registerInteractiveLearningSessionCompatibility() {
	registerLearningSessionEventType();
}
registerInteractiveLearningSessionCompatibility();
//#endregion
export { registerInteractiveLearningSessionCompatibility as t };
