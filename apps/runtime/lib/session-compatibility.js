/** Portable runtime session-event compatibility declarations. */
import { KNOWN_SESSION_EVENT_TYPES, } from '@deepseek-ai/dsh-session';
import { registerInteractiveLearningSessionCompatibility } from '@dsh-portable/interactive-learning/bootstrap';
/** Exact durable discriminator used by portable mode-resolution diagnostics. */
export const PORTABLE_MODE_RESOLUTION_EVENT_TYPE = 'portable-runtime/mode-resolution';
/** Register the exact legacy portable event understood by this distribution. */
export function registerPortableSessionCompatibility() {
    // rc7 exposes the catalog as ReadonlySet, but the runtime value is the
    // process-wide Set also read by persistence. Extend only this exact event.
    ;
    KNOWN_SESSION_EVENT_TYPES.add(PORTABLE_MODE_RESOLUTION_EVENT_TYPE);
}
/** Register every required event understood by the packaged runtime before persistence can read. */
export function registerPackagedSessionCompatibility() {
    // Learning state is registered for strict validation/folding when the package
    // is present. Writers also mark this log-only projection ignorable so a host
    // can resume a session before a lazily loaded Learning package registers it;
    // the persistence reader retains the event for a later fold.
    registerInteractiveLearningSessionCompatibility();
    registerPortableSessionCompatibility();
}
/**
 * Append an informational mode-resolution trace with forward-safe metadata.
 * @param session - Session receiving the durable diagnostic.
 * @param trace - Resolved portable mode trace.
 */
export function appendPortableModeResolution(session, trace) {
    ;
    session.append(PORTABLE_MODE_RESOLUTION_EVENT_TYPE, trace, { ignorable: true });
}
//# sourceMappingURL=session-compatibility.js.map