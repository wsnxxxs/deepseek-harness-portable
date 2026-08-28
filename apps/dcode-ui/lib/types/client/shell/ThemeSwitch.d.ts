/**
 * The light / dark / system control.
 *
 * One component in two shapes: a segmented control for the settings surface
 * and a menu row list for the top bar's popover. Both write the same
 * preference through the same service, so a switch made in either place is
 * the switch the official interface reads back.
 * @module @dsh-portable/dcode-ui/client/shell/ThemeSwitch
 */
import { type ColorScheme, type ThemePreference } from '../theme.ts';
import type { Translate } from '../locales.ts';
import type { MenuRow } from './ui.tsx';
/**
 * Subscribe to the resolved scheme and the stored preference.
 * @returns the current pair, re-read on every theme change.
 */
export declare function useAppearance(): {
    readonly scheme: ColorScheme;
    readonly preference: ThemePreference;
    readonly canSet: boolean;
    readonly set: (preference: ThemePreference) => void;
};
/**
 * The three preferences as popover/palette rows.
 * @param t - workbench translate.
 * @param current - the stored preference, ticked in the list.
 * @param set - preference writer.
 * @returns one row per preference, in display order.
 */
export declare function themeMenuRows(t: Translate, current: ThemePreference, set: (preference: ThemePreference) => void): readonly MenuRow[];
/** The segmented light / dark / system control. */
export declare function ThemeSwitch(): import("react").JSX.Element;
//# sourceMappingURL=ThemeSwitch.d.ts.map