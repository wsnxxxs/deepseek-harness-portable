import { connectBundledPlugins } from "./bridge.js";
import { createPortablePluginApi } from "./rpc.js";
export const name = 'portable-plugin-management';
export const inject = ['connection'];
export function apply(ctx) {
    const api = createPortablePluginApi(ctx.get('connection'));
    // dsh-web mounts its children asynchronously after the official boot audit.
    ctx.inject(['pluginManager'], inner => {
        const manager = inner.get('pluginManager');
        inner.effect(() => connectBundledPlugins(manager, api), 'Portable plugins in dsh-web management');
    });
}
//# sourceMappingURL=index.js.map