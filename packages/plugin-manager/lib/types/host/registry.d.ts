/** Built-in feature inventory. Preferences describe pending state; standard
 * profile bundles and cordis.patch.yml own actual activation after restart. */
import type { PortablePluginRow, PortablePluginToggle } from './contract.ts';
/** Package-name prefix every built-in feature of this distribution carries. */
export declare const PORTABLE_SCOPE = "@dsh-portable/";
/** The part of one Loader entry this module reads. */
export interface LoaderEntryView {
    /** Loader row id. */
    readonly id: string;
    /** Package name mounted by the row. */
    readonly name: string;
    /** Whether the row (or an owning group) is disabled in this process. */
    readonly disabled: boolean;
}
/** The part of a package manifest a row displays. */
export interface PackageFacts {
    readonly version?: string;
    readonly description?: string;
}
/** The `dsh.profile.portablePlugins` map, with unusable shapes normalized away. */
export type PortablePreferences = Readonly<Record<string, boolean>>;
/**
 * Read the recorded preferences out of a profile manifest.
 *
 * Anything that is not a plain object of booleans is treated as absent: a
 * hand-edited manifest must not be able to make the settings tab throw.
 * @param manifest - the parsed web profile manifest.
 * @returns the preference map, empty when none is recorded.
 */
export declare function portablePreferences(manifest: unknown): PortablePreferences;
/**
 * Project the Loader's portable rows into the settings tab's shape.
 * @param entries - every Loader entry, in Loader order.
 * @param preferences - the recorded preferences.
 * @param facts - package manifest lookup; a miss yields nulls, never a throw.
 * @returns one row per built-in feature, sorted by package name.
 */
export declare function composeRows(entries: readonly LoaderEntryView[], preferences: PortablePreferences, facts: (name: string) => PackageFacts | undefined): readonly PortablePluginRow[];
/**
 * The preference map after one toggle.
 *
 * The entry is written even when it matches the live state, because "on" and
 * "no preference recorded" are different facts: the second one follows whatever
 * the shipped default becomes in a later release, and an operator who pressed
 * the switch meant to pin it.
 * @param preferences - the current map.
 * @param name - package name being switched.
 * @param enabled - the requested state.
 * @returns the map to persist.
 */
export declare function nextPreferences(preferences: PortablePreferences, name: string, enabled: boolean): PortablePreferences;
/**
 * The answer one toggle reports.
 * @param row - the row as it stood before the write.
 * @param enabled - the requested state.
 * @returns the toggle outcome.
 */
export declare function toggleOutcome(row: PortablePluginRow, enabled: boolean): PortablePluginToggle;
//# sourceMappingURL=registry.d.ts.map