/** Adapt bundled plugins to dsh-web's existing management controls; no separate UI. */
import type { PortablePluginApi } from './rpc.ts'

interface PluginControl {
  id: string
  name: string
  repository: string
  state: 'enabled' | 'disabled' | 'mixed' | 'unavailable' | 'uninstalled'
}
export interface PluginManagerControls {
  controlsList(): Promise<PluginControl[]>
  controlsSetEnabled(id: string, enabled: boolean): Promise<PluginControl[]>
}

export function connectBundledPlugins(manager: PluginManagerControls, api: PortablePluginApi): () => void {
  const originalList = manager.controlsList
  const originalToggle = manager.controlsSetEnabled
  const list = async (): Promise<PluginControl[]> => {
    const [existing, result] = await Promise.all([originalList.call(manager), api.list()])
    if (!result.ok) throw new Error(result.error.message)
    const bundled = result.value.plugins.map(plugin => ({
      id: plugin.name,
      name: plugin.name,
      repository: 'https://github.com/wsnxxxs/deepseek-harness-portable',
      state: (plugin.pending ?? plugin.enabled) ? 'enabled' as const : 'disabled' as const,
    }))
    return [...existing.filter(row => !bundled.some(plugin => plugin.id === row.id)), ...bundled]
  }
  manager.controlsList = list
  manager.controlsSetEnabled = async (id, enabled) => {
    const roster = await api.list()
    if (!roster.ok) throw new Error(roster.error.message)
    if (roster.value.plugins.some(plugin => plugin.name === id)) {
      const result = await api.setEnabled(id, enabled)
      if (!result.ok) throw new Error(result.error.message)
    } else await originalToggle.call(manager, id, enabled)
    // Dependency changes (e.g. DCode -> ui-mode/session-manager) refresh together.
    return list()
  }
  return () => {
    manager.controlsList = originalList
    manager.controlsSetEnabled = originalToggle
  }
}
