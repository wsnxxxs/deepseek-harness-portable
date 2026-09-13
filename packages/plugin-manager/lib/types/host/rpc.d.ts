/**
 * The `/portable-plugins` endpoint bodies.
 *
 * Everything that touches the filesystem or the Loader lives here; the pure
 * folds it composes are in `./registry.ts`, which is what the tests exercise.
 * @module @dsh-portable/plugin-manager/host/rpc
 */
import { type PortablePluginList, type PortablePluginResult, type PortablePluginToggle } from './contract.ts';
import { type PackageFacts } from './registry.ts';
/** The Loader face this module reads. */
export interface PluginLoaderView {
    entries(): Iterable<{
        readonly id: string;
        readonly disabled: boolean;
        readonly options: {
            readonly id?: string | undefined;
            readonly name?: string | undefined;
        };
    }>;
}
/** The dependencies the endpoints need, injected so tests can supply fakes. */
export interface PortablePluginDeps {
    /** Live Loader rows. */
    readonly loader: PluginLoaderView;
    /** Absolute web profile directory. */
    readonly profileDir: string;
    /** Package manifest lookup for version and description. */
    readonly facts: (name: string) => PackageFacts | undefined;
}
/**
 * Resolve one package's displayed facts through Node's own resolution.
 *
 * The portable packages are dependencies of the runtime and each exports its
 * own `package.json`, so this needs no knowledge of where the installation put
 * them. A package that cannot be resolved simply shows without a version.
 * @param anchor - a module URL inside the installation to resolve from.
 * @returns the lookup.
 */
export declare function packageFactsFrom(anchor: string): (name: string) => PackageFacts | undefined;
/** Build the default host dependencies. */
export declare function defaultDeps(loader: PluginLoaderView, anchor: string): PortablePluginDeps;
/** `list`: every built-in feature with its live and recorded state. */
export declare function listPortablePlugins(deps: PortablePluginDeps): PortablePluginResult<PortablePluginList>;
/**
 * `set-enabled`: record the preference the next launch will adopt.
 * @param deps - host dependencies.
 * @param payload - the requested `{ name, enabled }`.
 * @returns the toggle outcome, or a refusal.
 */
export declare function setPortablePluginEnabled(deps: PortablePluginDeps, payload: unknown): PortablePluginResult<PortablePluginToggle>;
/**
 * Route one endpoint of the channel.
 * @param endpoint - the endpoint name, already narrowed by the caller.
 * @param payload - the caller's payload.
 * @param deps - host dependencies.
 * @returns the answer envelope.
 */
export declare function handlePortablePluginEndpoint(endpoint: 'list' | 'set-enabled', payload: unknown, deps: PortablePluginDeps): PortablePluginResult<PortablePluginList | PortablePluginToggle>;
//# sourceMappingURL=rpc.d.ts.map