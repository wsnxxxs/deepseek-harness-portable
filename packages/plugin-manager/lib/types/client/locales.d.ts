/**
 * Copy for the built-in features settings tab.
 * @module @dsh-portable/plugin-manager/client/locales
 */
/** Dictionary namespace owned by this plugin. */
export declare const PLUGIN_MANAGER_NS = "portablePlugins";
/** Every key of this plugin's dictionary. */
export type PluginManagerKey = keyof typeof zh;
/** Namespace-bound translate for this plugin's copy. */
export type PluginManagerTranslate = (key: PluginManagerKey, params?: Record<string, unknown>) => string;
export declare const zh: {
    tab: string;
    lead: string;
    empty: string;
    loading: string;
    refresh: string;
    enable: string;
    disable: string;
    working: string;
    off: string;
    version: string;
    unknownVersion: string;
    pendingOn: string;
    pendingOff: string;
    restart: string;
    unavailable: string;
};
export declare const en: Record<PluginManagerKey, string>;
//# sourceMappingURL=locales.d.ts.map