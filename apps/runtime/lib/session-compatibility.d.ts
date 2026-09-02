/** Portable runtime session-event compatibility declarations. */
import { agentPresetProjectionDefinition } from '@deepseek-ai/dsh-agent-presets';
import type { Context } from '@deepseek-ai/cordis';
import { type RuntimeModeTrace } from './mode-catalog.js';
/** Exact durable discriminator used by portable mode-resolution diagnostics. */
export declare const PORTABLE_MODE_RESOLUTION_EVENT_TYPE: "portable-runtime/mode-resolution";
declare module '@deepseek-ai/dsh-session' {
    interface SessionEventMap {
        /**
         * Records the portable runtime variant selected for the session.
         * @param modeId - Requested portable mode id.
         * @mode append
         */
        [PORTABLE_MODE_RESOLUTION_EVENT_TYPE]: RuntimeModeTrace;
    }
}
/** Register the exact legacy portable event understood by this distribution. */
export declare function registerPortableSessionCompatibility(): void;
/** Register every required event understood by the packaged runtime before persistence can read. */
export declare function registerPackagedSessionCompatibility(): void;
/** The projection used by the portable roster, including the retired `code` id. */
export declare const portableAgentPresetProjectionDefinition: {
    init: (header: Parameters<typeof agentPresetProjectionDefinition.init>[0]) => string | null;
    apply: (state: Parameters<typeof agentPresetProjectionDefinition.apply>[0], event: Parameters<typeof agentPresetProjectionDefinition.apply>[1]) => string | null;
    key: "agentPreset";
    stateSchema: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNull]>;
    wire: {
        viewSchema: import("zod").ZodUnion<readonly [import("zod").ZodString, import("zod").ZodNull]>;
        view: (state: string | null) => string | null;
    };
    stateVersion: number;
};
/** Register the portable projection before the upstream AgentPresets service. */
export declare function installPortableAgentPresetCompatibility(ctx: Context): void;
/** Minimal append capability required by the portable diagnostic producer. */
export interface PortableModeResolutionWriter {
    append(type: typeof PORTABLE_MODE_RESOLUTION_EVENT_TYPE, data: RuntimeModeTrace): unknown;
}
/**
 * Append an informational mode-resolution trace with forward-safe metadata.
 * @param session - Session receiving the durable diagnostic.
 * @param trace - Resolved portable mode trace.
 */
export declare function appendPortableModeResolution(session: unknown, trace: RuntimeModeTrace): void;
//# sourceMappingURL=session-compatibility.d.ts.map