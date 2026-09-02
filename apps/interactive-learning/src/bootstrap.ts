/**
 * Compatibility hook for the installable Learning package.
 *
 * The portable runtime statically imports this package's preset entry before
 * boot and before persistence can load a session. Keep session-event
 * registration here so every Host/preset entry uses the same idempotent seam.
 * The package-owned events are only restored when this package is mounted and
 * has registered its vocabulary with the alpha.4 persistence catalog.
 */
import { registerLearningSessionEventType } from './learner-state.ts'

/** Register the Learning session event for strict validation when the package is attached. */
export function registerInteractiveLearningSessionCompatibility(): void {
  registerLearningSessionEventType()
}

// Importing the stable bootstrap subpath is itself sufficient. Explicit calls
// from preset/Host entries remain useful documentation and are idempotent.
registerInteractiveLearningSessionCompatibility()
