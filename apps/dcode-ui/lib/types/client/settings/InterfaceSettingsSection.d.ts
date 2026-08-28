/**
 * The front-end switch inside the classic General settings page.
 *
 * The requirement is symmetric: both surfaces must be able to reach the
 * other. The modern workbench has its own Interface section; this is its
 * counterpart, registered into the official General settings page so an operator who
 * switched to the classic UI is never stranded there.
 *
 * It renders inside the official shell, so it takes the slot framework's
 * standard locale prop and the Host's theme aliases rather than the
 * workbench's own token scope.
 * @module @dsh-portable/dcode-ui/client/settings/InterfaceSettingsSection
 */
import type { UiModeStore } from '../mode.ts';
import { type DcodeKey } from '../locales.ts';
/** Injected share: the page's single mode store. */
export interface InterfaceSettingsInjected {
    readonly mode: UiModeStore;
}
/**
 * Props of the classic-settings switch row.
 *
 * The slot framework supplies `t` for the registration's locale namespace;
 * the shape is spelled structurally so this component does not depend on the
 * settings package's prop assembly types.
 */
export interface InterfaceSettingsSectionProps extends InterfaceSettingsInjected {
    readonly t?: (key: DcodeKey) => string;
}
/** The two-option front-end switch. */
export declare function InterfaceSettingsSection({ mode, t }: InterfaceSettingsSectionProps): import("react").JSX.Element;
//# sourceMappingURL=InterfaceSettingsSection.d.ts.map