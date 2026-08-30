import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The front-end mode switch segmented control.
 *
 * Placed in the Appearance section alongside the theme switch, allowing
 * operators to switch between the official and workbench front-ends.
 * @module @dsh-portable/dcode-ui/client/shell/UiModeSwitch
 */
import { useSyncExternalStore } from 'react';
import { IconSettingsOutline16, IconSparkle16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { useRuntime } from "../state/runtime.js";
import { useT } from "../state/i18n.js";
import css from './ThemeSwitch.module.css';
/** The segmented official / workbench mode control. */
export function UiModeSwitch() {
    const runtime = useRuntime();
    const t = useT();
    const mode = useSyncExternalStore(runtime.mode.subscribe, runtime.mode.get, runtime.mode.get);
    return (_jsxs("div", { className: css.group, role: "radiogroup", "aria-label": t('settings.interface'), children: [_jsxs("button", { type: "button", role: "radio", "aria-checked": mode === 'official', className: `${css.segment} ${mode === 'official' ? css.segmentActive : ''}`, onClick: () => { runtime.mode.set('official'); }, children: [_jsx("span", { className: css.glyph, "aria-hidden": true, children: _jsx(IconSettingsOutline16, {}) }), _jsx("span", { className: css.label, children: t('settings.modeOfficial') })] }), _jsxs("button", { type: "button", role: "radio", "aria-checked": mode === 'dcode', className: `${css.segment} ${mode === 'dcode' ? css.segmentActive : ''}`, onClick: () => { runtime.mode.set('dcode'); }, children: [_jsx("span", { className: css.glyph, "aria-hidden": true, children: _jsx(IconSparkle16, {}) }), _jsx("span", { className: css.label, children: t('settings.modeWorkbench') })] })] }));
}
//# sourceMappingURL=UiModeSwitch.js.map