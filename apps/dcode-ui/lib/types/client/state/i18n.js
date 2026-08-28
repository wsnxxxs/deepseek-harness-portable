/**
 * Copy access for the workbench tree.
 *
 * The plugin registers this package's dictionaries on the Host locale runtime
 * and passes the bound translate function down one context, re-rendering the
 * tree when the active locale changes. No separate language preference is
 * introduced: switching language in either surface moves both.
 * @module @dsh-portable/dcode-ui/client/state/i18n
 */
import { createContext, useContext } from 'react';
import { en } from "../locales.js";
/** Interpolate `{name}` placeholders in a template. */
function interpolate(template, params) {
    if (params === undefined)
        return template;
    return template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}
/** English-only fallback used when a component renders outside the provider. */
const fallback = (key, params) => interpolate(en[key] ?? key, params);
const I18nContext = createContext(fallback);
/** Provider for the bound translate function. */
export const TranslateProvider = I18nContext.Provider;
/**
 * Read the translate function.
 * @returns the bound translate, or an English fallback outside the provider.
 */
export function useT() {
    return useContext(I18nContext);
}
/**
 * Adapt the Host's bound translate function to the workbench's own signature,
 * interpolating placeholders the Host runtime does not itself substitute.
 *
 * The Host's `bind` narrows its key to this namespace's dictionary, which is
 * exactly {@link DcodeKey}; the parameter is spelled that way rather than as a
 * bare string so a key removed from the dictionary fails to compile here.
 * @param translate - `ctx.locale.bind(DCODE_NS)`.
 * @returns the typed translate handed to {@link TranslateProvider}.
 */
export function bindTranslate(translate) {
    return (key, params) => {
        const value = translate(key, params);
        // A Host miss returns the key itself; fall back to the English dictionary
        // so a partially registered namespace never renders a raw key.
        if (value === key)
            return interpolate(en[key] ?? key, params);
        return interpolate(value, params);
    };
}
//# sourceMappingURL=i18n.js.map