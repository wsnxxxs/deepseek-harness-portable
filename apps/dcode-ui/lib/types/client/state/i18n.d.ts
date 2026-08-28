/**
 * Copy access for the workbench tree.
 *
 * The plugin registers this package's dictionaries on the Host locale runtime
 * and passes the bound translate function down one context, re-rendering the
 * tree when the active locale changes. No separate language preference is
 * introduced: switching language in either surface moves both.
 * @module @dsh-portable/dcode-ui/client/state/i18n
 */
import { type Translate, type DcodeKey } from '../locales.ts';
/** Provider for the bound translate function. */
export declare const TranslateProvider: import("react").Provider<Translate>;
/**
 * Read the translate function.
 * @returns the bound translate, or an English fallback outside the provider.
 */
export declare function useT(): Translate;
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
export declare function bindTranslate(translate: (key: DcodeKey, params?: Record<string, unknown>) => string): Translate;
//# sourceMappingURL=i18n.d.ts.map