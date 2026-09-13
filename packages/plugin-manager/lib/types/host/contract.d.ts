/**
 * The `/portable-plugins` channel contract. Types and endpoint names only, so
 * the browser half can be typed against it without importing host code.
 * @module @dsh-portable/plugin-manager/host/contract
 */
/** Connection RPC channel this plugin claims. */
export declare const PORTABLE_PLUGINS_CHANNEL = "/portable-plugins";
/** Every endpoint of the channel. */
export declare const PORTABLE_PLUGIN_ENDPOINTS: readonly ["list", "set-enabled"];
/** One endpoint name. */
export type PortablePluginEndpoint = (typeof PORTABLE_PLUGIN_ENDPOINTS)[number];
/** Refusal codes the channel answers with. */
export type PortablePluginErrorCode = 'bad-request' | 'not-builtin' | 'unavailable' | 'write-failed';
/** The answer envelope shared by every endpoint. */
export type PortablePluginResult<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: {
        readonly code: PortablePluginErrorCode;
        readonly message: string;
        readonly details: Record<string, unknown>;
    };
};
/** One built-in feature package, as the settings tab renders it. */
export interface PortablePluginRow {
    /** Loader row id (`session-manager`), the id an operator's patch file addresses. */
    readonly id: string;
    /** Package name (`@dsh-portable/session-manager`). */
    readonly name: string;
    /** Installed version, or null when the package manifest could not be read. */
    readonly version: string | null;
    /** Package description, or null when absent. */
    readonly description: string | null;
    /** Whether the row is live in THIS process. */
    readonly enabled: boolean;
    /**
     * The state the next launch will adopt, present only when a preference has
     * been recorded that this process has not applied. A restart is what closes
     * the gap, and the tab says so rather than pretending the toggle took.
     */
    readonly pending?: boolean;
}
/** `list` answer. */
export interface PortablePluginList {
    readonly plugins: readonly PortablePluginRow[];
}
/** `set-enabled` answer. */
export interface PortablePluginToggle {
    readonly name: string;
    /** The recorded preference. */
    readonly enabled: boolean;
    /** False when the manifest already said this; nothing was written. */
    readonly changed: boolean;
    /** Whether the running process still differs from the recorded preference. */
    readonly requiresRestart: boolean;
}
/**
 * Narrow an endpoint name arriving off the wire.
 * @param value - the endpoint the caller asked for.
 * @returns whether it is one this channel serves.
 */
export declare function isPortablePluginEndpoint(value: string): value is PortablePluginEndpoint;
//# sourceMappingURL=contract.d.ts.map