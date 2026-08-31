/**
 * The front-end switch inside the official General settings page.
 *
 * The requirement is symmetric: every surface must be able to reach every
 * other one. Each extension surface carries its own copy of this control, and
 * this is the counterpart registered into the official General settings page,
 * so an operator who switched to the official UI is never stranded there.
 *
 * It renders inside the official shell, so it takes the slot framework's
 * standard locale prop and the Host's theme aliases rather than any surface's
 * own token scope.
 *
 * There is exactly ONE registration of this row, and it belongs to this
 * package rather than to a surface: two surfaces each registering their own
 * would put two switches in one page, and a surface that failed to load would
 * take the ability to leave it along with it.
 * @module @dsh-portable/ui-mode/client/InterfaceSettingsSection
 */
import type { UiModeController } from './store.ts';
import { type UiModeKey } from './locales.ts';
/** Injected share: the page's single mode store. */
export interface InterfaceSettingsInjected {
    readonly mode: UiModeController;
}
/**
 * Props of the official-settings switch row.
 *
 * The slot framework supplies `t` for the registration's locale namespace; the
 * shape is spelled structurally so this component does not depend on the
 * settings package's prop assembly types.
 */
export interface InterfaceSettingsSectionProps extends InterfaceSettingsInjected {
    readonly t?: (key: UiModeKey) => string;
}
/** The interface switch, one option per registered surface. */
export declare function InterfaceSettingsSection({ mode, t }: InterfaceSettingsSectionProps): import("react").JSX.Element;
//# sourceMappingURL=InterfaceSettingsSection.d.ts.map