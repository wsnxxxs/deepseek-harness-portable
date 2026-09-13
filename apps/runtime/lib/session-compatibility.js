/** Portable runtime session-event compatibility declarations. */
import { KNOWN_SESSION_EVENT_TYPES, } from '@deepseek-ai/dsh-session';
import { agentPresetProjectionDefinition } from '@deepseek-ai/dsh-agent-presets';
import { canonicalModeId } from './mode-catalog.js';
/** Exact durable discriminator used by portable mode-resolution diagnostics. */
export const PORTABLE_MODE_RESOLUTION_EVENT_TYPE = 'portable-runtime/mode-resolution';
/** Register the exact legacy portable event understood by this distribution. */
export function registerPortableSessionCompatibility() {
    // Alpha.4 exposes the catalog as ReadonlySet, but the runtime value is the
    // process-wide Set also read by persistence. Extend only this exact event.
    ;
    KNOWN_SESSION_EVENT_TYPES.add(PORTABLE_MODE_RESOLUTION_EVENT_TYPE);
}
/** Register every required event understood by the packaged runtime before persistence can read. */
export async function registerPackagedSessionCompatibility() {
    // Learning state is registered for strict validation/folding before a
    // packaged Host can restore a session.
    const { registerInteractiveLearningSessionCompatibility } = await import('@dsh-portable/interactive-learning/bootstrap');
    registerInteractiveLearningSessionCompatibility();
    registerPortableSessionCompatibility();
}
/** The projection used by the portable roster, including the retired `code` id. */
export const portableAgentPresetProjectionDefinition = {
    ...agentPresetProjectionDefinition,
    init: (header) => {
        const preset = agentPresetProjectionDefinition.init(header);
        return preset === null ? null : canonicalModeId(preset);
    },
    apply: (state, event) => {
        const preset = agentPresetProjectionDefinition.apply(state, event);
        return preset === null ? null : canonicalModeId(preset);
    },
};
/** Register the portable projection before the upstream AgentPresets service. */
export function installPortableAgentPresetCompatibility(ctx) {
    ctx.inject(['sessionProjections'], (projectionCtx) => {
        projectionCtx.sessionProjections.register(portableAgentPresetProjectionDefinition);
    });
}
/**
 * Append an informational mode-resolution trace with forward-safe metadata.
 * @param session - Session receiving the durable diagnostic.
 * @param trace - Resolved portable mode trace.
 */
export function appendPortableModeResolution(session, trace) {
    ;
    session.append(PORTABLE_MODE_RESOLUTION_EVENT_TYPE, trace);
}
//# sourceMappingURL=session-compatibility.js.map