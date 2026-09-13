const assert = require('node:assert/strict')
const { test } = require('node:test')
const { readFileSync } = require('node:fs')
const vm = require('node:vm')

test('default preload does not mount optional page UI; plugin activation and disposal own it', () => {
  const globals = {}
  const listeners = {}
  let mounts = 0
  let reloads = 0
  const page = { location: { protocol: 'http:', search: '', reload: () => { reloads++ } }, addEventListener: (event, callback) => { listeners[event] = callback } }
  const sandbox = {
    require(name) {
      if (name === 'electron') return { contextBridge: { exposeInMainWorld: (name, value) => { globals[name] = value } }, ipcRenderer: { on() {}, send() {} }, webUtils: {} }
      if (name === './desktop-enhancements.cjs') return () => { mounts++ }
      return require(name)
    },
    window: page,
    document: { readyState: 'loading', addEventListener() {} },
    URLSearchParams,
  }
  vm.runInNewContext(readFileSync(require.resolve('./desktop-preload.cjs'), 'utf8'), sandbox)
  assert.equal(mounts, 0)
  globals.deepSeekDesktopEnhancements.setEnabled(true)
  assert.equal(mounts, 1)
  globals.deepSeekDesktopEnhancements.setEnabled(false)
  assert.equal(reloads, 1)
  listeners.beforeunload()
  globals.deepSeekDesktopEnhancements.setEnabled(true)
  assert.equal(mounts, 1)
})
