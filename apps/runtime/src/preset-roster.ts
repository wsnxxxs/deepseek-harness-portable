/**
 * The paired guard for a closed upstream preset root.
 *
 * `packaged-bin.ts` overlays `includeShippedRoot: false` onto the roster so the
 * compiled portable modes are the ones the operator can actually select. That
 * is what makes the mode contract real — and it is also what lets the compiler
 * leave the roster empty on a target no variant fits, because upstream's own
 * copies are no longer there to backfill an id the compiler just removed.
 *
 * This module owns what happens next. It is deliberately separate from the boot
 * entry: `packaged-bin.ts` registers persistence discriminators at module load,
 * so it cannot be imported by a test, and this decision is exactly the kind
 * that must be covered by one.
 * @module @dsh-portable/runtime/preset-roster
 */

import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import { canonicalModeId, type RuntimeModeCatalog, type RuntimeModeResolution } from './mode-catalog.js'

/** Best-supported first; a stable pick that never depends on directory read order. */
const MODE_SUPPORT_RANK: Record<string, number> = { native: 0, compatible: 1, alternative: 2 }

/** How the roster was left, for the caller to report and for tests to assert. */
export type PresetRosterOutcome =
  | { readonly kind: 'intact' }
  | { readonly kind: 'default-replaced'; readonly configured: string; readonly selected: RuntimeModeResolution }
  | { readonly kind: 'upstream-restored' }

/** Selectable modes, best-supported first, ties broken by id. */
export function selectableModes(catalog: RuntimeModeCatalog): RuntimeModeResolution[] {
  return Object.values(catalog.modes)
    .filter(mode => mode.selectable)
    .sort((left, right) => (
      (MODE_SUPPORT_RANK[left.supportLevel] ?? Number.MAX_SAFE_INTEGER)
      - (MODE_SUPPORT_RANK[right.supportLevel] ?? Number.MAX_SAFE_INTEGER)
      || left.modeId.localeCompare(right.modeId)
    ))
}

/**
 * Reconcile the agent-preset overlay against the catalog the compiler produced.
 *
 * `composeProfile` runs concurrently with capability measurement, so the
 * overlay it builds cannot know which modes survived compilation. This runs
 * afterwards and edits that one overlay in place — it is not consumed until the
 * Loader mounts the root include — covering the two states a closed shipped
 * root introduces:
 *
 * - the configured default did not compile but other modes did: select the
 *   best-supported survivor, so session creation still works;
 * - nothing compiled: reopen the upstream shipped root for this boot. That
 *   restores a roster whose modes are NOT the ones this distribution measured,
 *   which is worse than correct but far better than an application whose every
 *   new session fails to start, so the caller reports it at `error` severity.
 *
 * Returning the outcome rather than logging keeps the decision testable and
 * lets the boot entry choose between the stdout protocol and stderr.
 *
 * @param overlays - composed overlay list; the `agent-presets` entry is edited in place.
 * @param catalog - the compiled mode catalog.
 * @returns what was done, for diagnostics.
 */
export function reconcilePresetRoster(
  overlays: readonly PatchOptions[],
  catalog: RuntimeModeCatalog,
): PresetRosterOutcome {
  const overlay = overlays.find(entry => (entry as { id?: unknown }).id === 'agent-presets') as
    { id: string; config?: Record<string, unknown> } | undefined
  // No overlay means the deployment never claimed the roster; leave it alone.
  if (overlay?.config === undefined) return { kind: 'intact' }

  const selectable = selectableModes(catalog)
  if (selectable.length === 0) {
    overlay.config.includeShippedRoot = true
    return { kind: 'upstream-restored' }
  }

  const configured = overlay.config.default
  if (typeof configured !== 'string') return { kind: 'intact' }
  if (catalog.modes[canonicalModeId(configured)]?.selectable === true) return { kind: 'intact' }

  const selected = selectable[0] as RuntimeModeResolution
  overlay.config.default = selected.modeId
  return { kind: 'default-replaced', configured, selected }
}

/**
 * Render one outcome as an operator-facing diagnostic.
 * @param outcome - result of {@link reconcilePresetRoster}.
 * @param presetRoot - materialization directory, named so the operator can read each mode-resolution.json.
 * @returns the severity and message, or undefined when there is nothing to report.
 */
export function describePresetRosterOutcome(
  outcome: PresetRosterOutcome,
  presetRoot: string,
): { severity: 'warning' | 'error'; message: string } | undefined {
  if (outcome.kind === 'intact') return undefined
  if (outcome.kind === 'upstream-restored') {
    return {
      severity: 'error',
      message: 'no shipped agent mode satisfies the measured capabilities of this target; '
        + 'falling back to the upstream preset roster for this launch. '
        + 'The modes that roster offers are not the ones this distribution measured. '
        + `Read mode-resolution.json under ${presetRoot} for the missing capability of each mode.`,
    }
  }
  return {
    severity: 'warning',
    message: `the configured default agent mode ${JSON.stringify(outcome.configured)} is not available on this target; `
      + `defaulting to ${JSON.stringify(outcome.selected.modeId)} (${outcome.selected.supportLevel}). `
      + `Read mode-resolution.json under ${presetRoot} for why.`,
  }
}
