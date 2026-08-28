import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useSyncExternalStore } from 'react';
import { IconCheckOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { en } from "../locales.js";
import css from './InterfaceSettingsSection.module.css';
/** The two-option front-end switch. */
export function InterfaceSettingsSection({ mode, t }) {
    const active = useSyncExternalStore(mode.subscribe, mode.get, mode.get);
    const copy = (key) => t?.(key) ?? en[key];
    return (_jsxs("div", { className: css.root, children: [_jsx("div", { className: css.title, children: copy('settings.interface') }), _jsx("p", { className: css.lead, children: copy('settings.interfaceBody') }), _jsxs("div", { className: css.choice, children: [_jsxs("button", { type: "button", className: `${css.option} ${active === 'official' ? css.optionActive : ''}`, onClick: () => { mode.set('official'); }, children: [_jsx("span", { className: css.optionTitle, children: copy('settings.modeOfficial') }), _jsx("span", { className: css.optionBody, children: copy('settings.modeOfficialBody') }), active === 'official' ? _jsx("span", { className: css.badge, children: _jsx(IconCheckOutline16, {}) }) : null] }), _jsxs("button", { type: "button", className: `${css.option} ${active === 'dcode' ? css.optionActive : ''}`, onClick: () => { mode.set('dcode'); }, children: [_jsx("span", { className: css.optionTitle, children: copy('settings.modeWorkbench') }), _jsx("span", { className: css.optionBody, children: copy('settings.modeWorkbenchBody') }), active === 'dcode' ? _jsx("span", { className: css.badge, children: _jsx(IconCheckOutline16, {}) }) : null] })] })] }));
}
//# sourceMappingURL=InterfaceSettingsSection.js.map