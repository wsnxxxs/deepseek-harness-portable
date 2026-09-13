/** Adapt bundled plugins to dsh-web's existing management controls; no separate UI. */
import type { PortablePluginApi } from './rpc.ts';
interface PluginControl {
    id: string;
    name: string;
    repository: string;
    state: 'enabled' | 'disabled' | 'mixed' | 'unavailable' | 'uninstalled';
}
export interface PluginManagerControls {
    controlsList(): Promise<PluginControl[]>;
    controlsSetEnabled(id: string, enabled: boolean): Promise<PluginControl[]>;
}
export declare function connectBundledPlugins(manager: PluginManagerControls, api: PortablePluginApi): () => void;
export {};
//# sourceMappingURL=bridge.d.ts.map