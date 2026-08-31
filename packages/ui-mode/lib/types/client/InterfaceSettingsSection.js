import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useSyncExternalStore } from 'react';
import { UI_MODES } from "../ui-mode.js";
import { MODE_COPY, en } from "./locales.js";
import css from './InterfaceSettingsSection.module.css';
/** The interface switch, one option per registered surface. */
export function InterfaceSettingsSection({ mode, t }) {
    const active = useSyncExternalStore(mode.subscribe, mode.get, mode.get);
    const copy = (key) => t?.(key) ?? en[key];
    return (_jsxs("div", { className: css.root, children: [_jsx("h2", { className: css.title, children: copy('interface') }), _jsx("p", { className: css.lead, children: copy('interface.body') }), _jsx("div", { className: css.choice, role: "radiogroup", "aria-label": copy('interface'), children: UI_MODES.map(id => (_jsxs("button", { type: "button", role: "radio", className: `${css.option} ${active === id ? css.optionActive : ''}`, "aria-checked": active === id, onClick: () => { mode.set(id); }, children: [_jsx("span", { className: css.optionTitle, children: copy(MODE_COPY[id].title) }), _jsx("span", { className: css.optionBody, children: copy(MODE_COPY[id].body) })] }, id))) })] }));
}
//# sourceMappingURL=InterfaceSettingsSection.js.map