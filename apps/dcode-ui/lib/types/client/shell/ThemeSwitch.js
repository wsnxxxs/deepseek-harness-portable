import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The light / dark / system control.
 *
 * One component in two shapes: a segmented control for the settings surface
 * and a menu row list for the top bar's popover. Both write the same
 * preference through the same service, so a switch made in either place is
 * the switch the official interface reads back.
 * @module @dsh-portable/dcode-ui/client/shell/ThemeSwitch
 */
import { useSyncExternalStore } from 'react';
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import { THEME_PREFERENCES } from "../theme.js";
import css from './ThemeSwitch.module.css';
/** Glyph per preference. The system entry shows a display, not a half-disc. */
const GLYPH = {
    light: '☀️',
    dark: '🌙',
    system: '💻',
};
/** Locale key per preference. */
const LABEL = {
    light: 'theme.light',
    dark: 'theme.dark',
    system: 'theme.system',
};
/**
 * Subscribe to the resolved scheme and the stored preference.
 * @returns the current pair, re-read on every theme change.
 */
export function useAppearance() {
    const runtime = useRuntime();
    const appearance = runtime.appearance;
    const scheme = useSyncExternalStore(appearance.subscribe, appearance.getScheme, appearance.getScheme);
    const preference = useSyncExternalStore(appearance.subscribe, appearance.getPreference, appearance.getPreference);
    return { scheme, preference, canSet: appearance.canSet, set: appearance.set };
}
/**
 * The three preferences as popover/palette rows.
 * @param t - workbench translate.
 * @param current - the stored preference, ticked in the list.
 * @param set - preference writer.
 * @returns one row per preference, in display order.
 */
export function themeMenuRows(t, current, set) {
    return THEME_PREFERENCES.map(preference => ({
        id: `theme:${preference}`,
        label: `${GLYPH[preference]}  ${t(LABEL[preference])}`,
        active: preference === current,
        onSelect: () => { set(preference); },
    }));
}
/** The segmented light / dark / system control. */
export function ThemeSwitch() {
    const t = useT();
    const { preference, canSet, set } = useAppearance();
    return (_jsx("div", { className: css.group, role: "radiogroup", "aria-label": t('settings.theme'), children: THEME_PREFERENCES.map(entry => (_jsxs("button", { type: "button", role: "radio", "aria-checked": entry === preference, className: `${css.segment} ${entry === preference ? css.segmentActive : ''}`, disabled: !canSet, onClick: () => { set(entry); }, children: [_jsx("span", { className: css.glyph, "aria-hidden": true, children: GLYPH[entry] }), _jsx("span", { className: css.label, children: t(LABEL[entry]) })] }, entry))) }));
}
//# sourceMappingURL=ThemeSwitch.js.map