/**
 * Mission Control's settings panel.
 *
 * It carries the interface switch, and it carries it because a surface an
 * operator cannot leave from the inside is a trap: the application menu is not
 * available in a browser tab, and every other surface offers the switch in its
 * own settings.
 *
 * The switch is not reimplemented here. `@dsh-portable/ui-mode` owns the roster
 * of surfaces and their names, and renders the same control in the official
 * General page, so all three surfaces present one list in one order with one
 * set of words.
 *
 * Deeper configuration — models, credentials, plugins, skills — is deliberately
 * NOT duplicated. `settings.section` has exactly one declarer, so a surface
 * cannot render the official pages and must reimplement each one; a second
 * partial copy of that catalogue would be a maintenance liability and a place
 * for the two to disagree about what is configured. The switch above is one
 * click from a surface that implements them in full.
 * @module @dsh-portable/crew-ui/client/shell/CrewSettings
 */
/** Props of the settings panel. */
export interface CrewSettingsProps {
    onClose(): void;
}
/** The settings overlay. */
export declare function CrewSettings({ onClose }: CrewSettingsProps): import("react").JSX.Element;
//# sourceMappingURL=CrewSettings.d.ts.map