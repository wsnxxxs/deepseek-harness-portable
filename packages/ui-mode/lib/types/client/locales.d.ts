/**
 * Copy for the interface switch, in its own namespace.
 *
 * The switch is registered by this package rather than by a surface, so its
 * strings live here too: a surface that is not loaded must not take its own
 * name out of the picker with it.
 *
 * `MODE_COPY` is the single table every switch surface renders. Adding a
 * surface means adding one row here and one entry to `UI_MODES` — no switch
 * component enumerates modes.
 * @module @dsh-portable/ui-mode/client/locales
 */
import type { UiMode } from '../ui-mode.ts';
/** Namespace this package registers its dictionaries under. */
export declare const UI_MODE_NS = "uiMode";
/** Per-mode copy keys, so a switch renders from {@link UI_MODES} alone. */
export declare const MODE_COPY: Readonly<Record<UiMode, {
    readonly title: UiModeKey;
    readonly body: UiModeKey;
}>>;
export declare const en: {
    readonly interface: "Interface";
    readonly 'interface.body': "Choose which front end this window shows. All of them read the same runtime.";
    readonly 'mode.official': "Official";
    readonly 'mode.official.body': "The official DeepSeek Harness interface, unchanged.";
    readonly 'mode.dcode': "Workbench";
    readonly 'mode.dcode.body': "A compact desktop layout with git tools, goal and progress panels.";
    readonly unavailable: "Not available in this build.";
    readonly 'unavailable.selected': "This window is showing the official interface, because the selected one is not part of this build.";
};
export declare const zh: Record<UiModeKey, string>;
/** Key union of this package's dictionary. */
export type UiModeKey = keyof typeof en;
//# sourceMappingURL=locales.d.ts.map