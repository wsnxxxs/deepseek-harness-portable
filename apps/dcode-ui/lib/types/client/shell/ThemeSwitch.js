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
import { IconDarkOutline16, IconFollowsystemOutline16, IconLightOutline16, } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import css from './ThemeSwitch.module.css';
/** Locale key per preference. */
const LABEL = {
    light: 'theme.light',
    dark: 'theme.dark',
    system: 'theme.system',
};
/** Existing product icon per preference, in display order. */
const THEME_OPTIONS = [
    { id: 'light', Icon: IconLightOutline16 },
    { id: 'dark', Icon: IconDarkOutline16 },
    { id: 'system', Icon: IconFollowsystemOutline16 },
];
/**
 * Subscribe to the resolved scheme, the stored preference, and the content font size.
 * @returns the appearance state, re-read on every theme/style change.
 */
export function useAppearance() {
    const runtime = useRuntime();
    const appearance = runtime.appearance;
    const scheme = useSyncExternalStore(appearance.subscribe, appearance.getScheme, appearance.getScheme);
    const preference = useSyncExternalStore(appearance.subscribe, appearance.getPreference, appearance.getPreference);
    const fontSize = useSyncExternalStore(appearance.subscribe, appearance.getFontSize, appearance.getFontSize);
    return {
        scheme,
        preference,
        fontSize,
        canSet: appearance.canSet,
        canSetFontSize: appearance.canSetFontSize,
        set: appearance.set,
        setFontSize: appearance.setFontSize,
    };
}
/**
 * The three preferences as popover/palette rows.
 * @param t - workbench translate.
 * @param current - the stored preference, ticked in the list.
 * @param set - preference writer.
 * @returns one row per preference, in display order.
 */
export function themeMenuRows(t, current, set) {
    return THEME_OPTIONS.map(({ id, Icon }) => ({
        id: `theme:${id}`,
        label: t(LABEL[id]),
        icon: _jsx(Icon, {}),
        active: id === current,
        onSelect: () => { set(id); },
    }));
}
/** The segmented light / dark / system control. */
export function ThemeSwitch() {
    const t = useT();
    const { preference, canSet, set } = useAppearance();
    return (_jsx("div", { className: css.group, role: "radiogroup", "aria-label": t('settings.theme'), children: THEME_OPTIONS.map(({ id, Icon }) => (_jsxs("button", { type: "button", role: "radio", "aria-checked": id === preference, className: `${css.segment} ${id === preference ? css.segmentActive : ''}`, disabled: !canSet, onClick: () => { set(id); }, children: [_jsx("span", { className: css.glyph, "aria-hidden": true, children: _jsx(Icon, {}) }), _jsx("span", { className: css.label, children: t(LABEL[id]) })] }, id))) }));
}
//# sourceMappingURL=ThemeSwitch.js.map