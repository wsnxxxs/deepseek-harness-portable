import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { connectBundledPlugins } from '../lib/types/client/bridge.js'

test('dsh-web controls include bundled plugins, refresh dependencies and retain native operations', async () => {
  const native = { id: 'community', name: 'Community', repository: '', state: 'disabled' }
  const manager = {
    controlsList: async () => [native],
    controlsSetEnabled: async (id, enabled) => {
      assert.equal(id, native.id)
      native.state = enabled ? 'enabled' : 'disabled'
      return [native]
    },
  }
  const original = { ...manager }
  const plugins = ['dcode-ui', 'ui-mode', 'session-manager'].map(id => ({
    name: `@dsh-portable/${id}`, enabled: false,
  }))
  const disconnect = connectBundledPlugins(manager, {
    available: true,
    list: async () => ({ ok: true, value: { plugins } }),
    setEnabled: async (name, enabled) => {
      assert.equal(name, plugins[0].name)
      for (const plugin of plugins) plugin.pending = enabled
      return { ok: true, value: { name, enabled, changed: true, requiresRestart: true } }
    },
  })
  assert.deepEqual((await manager.controlsList()).map(row => row.state), Array(4).fill('disabled'))
  assert.deepEqual((await manager.controlsSetEnabled(plugins[0].name, true)).map(row => row.state),
    ['disabled', 'enabled', 'enabled', 'enabled'])
  assert.equal((await manager.controlsSetEnabled('community', true))[0].state, 'enabled')
  disconnect()
  assert.equal(manager.controlsList, original.controlsList)
  assert.equal(manager.controlsSetEnabled, original.controlsSetEnabled)
})
