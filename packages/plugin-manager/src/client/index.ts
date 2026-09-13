/** Extend dsh-web's plugin management page through its shared Cordis service. */
import type { Context } from '@deepseek-ai/cordis'
import { connectBundledPlugins, type PluginManagerControls } from './bridge.ts'
import { createPortablePluginApi, type RpcCarrier } from './rpc.ts'

export const name = 'portable-plugin-management'
export const inject = ['connection']

export function apply(ctx: Context): void {
  const api = createPortablePluginApi(ctx.get('connection') as RpcCarrier)
  // dsh-web mounts its children asynchronously after the official boot audit.
  ctx.inject(['pluginManager'], inner => {
    const manager = inner.get('pluginManager') as PluginManagerControls
    inner.effect(() => connectBundledPlugins(manager, api), 'Portable plugins in dsh-web management')
  })
}
