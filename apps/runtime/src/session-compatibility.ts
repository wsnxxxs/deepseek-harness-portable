/** Portable runtime session-event compatibility declarations. */

import {
  KNOWN_SESSION_EVENT_TYPES,
} from '@deepseek-ai/dsh-session'
import { agentPresetProjectionDefinition } from '@deepseek-ai/dsh-agent-presets'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-session-projection'
import { canonicalModeId, type RuntimeModeTrace } from './mode-catalog.js'

/** Exact durable discriminator used by portable mode-resolution diagnostics. */
export const PORTABLE_MODE_RESOLUTION_EVENT_TYPE = 'portable-runtime/mode-resolution' as const

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    /**
     * Records the portable runtime variant selected for the session.
     * @param modeId - Requested portable mode id.
     * @mode append
     */
    [PORTABLE_MODE_RESOLUTION_EVENT_TYPE]: RuntimeModeTrace
  }
}

/** Register the exact legacy portable event understood by this distribution. */
export function registerPortableSessionCompatibility(): void {
  // Alpha.4 exposes the catalog as ReadonlySet, but the runtime value is the
  // process-wide Set also read by persistence. Extend only this exact event.
  ;(KNOWN_SESSION_EVENT_TYPES as Set<string>).add(PORTABLE_MODE_RESOLUTION_EVENT_TYPE)
}

/** Register every required event understood by the packaged runtime before persistence can read. */
export async function registerPackagedSessionCompatibility(): Promise<void> {
  // Learning state is registered for strict validation/folding before a
  // packaged Host can restore a session.
  const { registerInteractiveLearningSessionCompatibility } = await import('@dsh-portable/interactive-learning/bootstrap')
  registerInteractiveLearningSessionCompatibility()
  registerPortableSessionCompatibility()
}

/** The projection used by the portable roster, including the retired `code` id. */
export const portableAgentPresetProjectionDefinition = {
  ...agentPresetProjectionDefinition,
  init: (header: Parameters<typeof agentPresetProjectionDefinition.init>[0]) => {
    const preset = agentPresetProjectionDefinition.init(header)
    return preset === null ? null : canonicalModeId(preset)
  },
  apply: (
    state: Parameters<typeof agentPresetProjectionDefinition.apply>[0],
    event: Parameters<typeof agentPresetProjectionDefinition.apply>[1],
  ) => {
    const preset = agentPresetProjectionDefinition.apply(state, event)
    return preset === null ? null : canonicalModeId(preset)
  },
}

/** Register the portable projection before the upstream AgentPresets service. */
export function installPortableAgentPresetCompatibility(ctx: Context): void {
  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register(portableAgentPresetProjectionDefinition)
  })
}

/** Minimal append capability required by the portable diagnostic producer. */
export interface PortableModeResolutionWriter {
  append(
    type: typeof PORTABLE_MODE_RESOLUTION_EVENT_TYPE,
    data: RuntimeModeTrace,
  ): unknown
}

/**
 * Append an informational mode-resolution trace with forward-safe metadata.
 * @param session - Session receiving the durable diagnostic.
 * @param trace - Resolved portable mode trace.
 */
export function appendPortableModeResolution(session: unknown, trace: RuntimeModeTrace): void {
  ;(session as PortableModeResolutionWriter).append(PORTABLE_MODE_RESOLUTION_EVENT_TYPE, trace)
}
