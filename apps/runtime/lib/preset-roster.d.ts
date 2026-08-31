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
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include';
import { type RuntimeModeCatalog, type RuntimeModeResolution } from './mode-catalog.js';
/** How the roster was left, for the caller to report and for tests to assert. */
export type PresetRosterOutcome = {
    readonly kind: 'intact';
} | {
    readonly kind: 'default-replaced';
    readonly configured: string;
    readonly selected: RuntimeModeResolution;
} | {
    readonly kind: 'upstream-restored';
};
/** Selectable modes, best-supported first, ties broken by id. */
export declare function selectableModes(catalog: RuntimeModeCatalog): RuntimeModeResolution[];
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
export declare function reconcilePresetRoster(overlays: readonly PatchOptions[], catalog: RuntimeModeCatalog): PresetRosterOutcome;
/** Disable the Host Team service whenever the compiled Crew preset is unavailable. */
export declare function reconcileCrewRuntime(overlays: PatchOptions[], catalog: RuntimeModeCatalog): 'enabled' | 'disabled';
/**
 * Render one outcome as an operator-facing diagnostic.
 * @param outcome - result of {@link reconcilePresetRoster}.
 * @param presetRoot - materialization directory containing the hidden mode-resolution diagnostics tree.
 * @returns the severity and message, or undefined when there is nothing to report.
 */
export declare function describePresetRosterOutcome(outcome: PresetRosterOutcome, presetRoot: string): {
    severity: 'warning' | 'error';
    message: string;
} | undefined;
//# sourceMappingURL=preset-roster.d.ts.map