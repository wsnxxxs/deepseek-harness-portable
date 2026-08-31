/**
 * The pure store owns browser synchronization. Cordis service coverage below
 * pins the page-wide ownership used by surface plugins.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { UiModeService } from '../lib/types/client/service.js'
import { createUiModeStore } from '../lib/types/client/store.js'
import { DEFAULT_UI_MODE, UI_MODES } from '../lib/ui-mode.js'

test('a fresh store adopts the default when no source names a mode', () => {
  const store = createUiModeStore()
  try {
    assert.equal(store.get(), DEFAULT_UI_MODE)
  } finally {
    store.dispose()
  }
})

test('the Cordis context publishes one mode service for every surface', async () => {
  const ctx = new Context()
  const owner = new UiModeService(ctx)
  const workbench = ctx.get('uiMode')
  const missionControl = ctx.get('uiMode')
  try {
    const seen = []
    const stop = missionControl.subscribe(mode => { seen.push(mode) })
    workbench.set('crew')

    assert.equal(owner.get(), 'crew')
    assert.equal(missionControl.get(), 'crew', 'a switch in one surface is visible in the other')
    assert.deepEqual(seen, ['crew'])
    stop()
  } finally {
    await ctx.fiber.dispose()
  }
})

test('selecting the active mode is a no-op, so a menu retick cannot remount', () => {
  const store = createUiModeStore()
  try {
    store.set('crew')
    const seen = []
    const stop = store.subscribe(mode => { seen.push(mode) })
    store.set('crew')
    store.set('crew', 'desktop')
    assert.deepEqual(seen, [])
    stop()
  } finally {
    store.dispose()
  }
})

test('cycle walks the shared store through every surface', () => {
  const store = createUiModeStore()
  try {
    store.set(UI_MODES[0])
    const visited = [store.get()]
    for (let step = 1; step < UI_MODES.length; step += 1) {
      store.cycle()
      visited.push(store.get())
    }
    assert.deepEqual(visited, [...UI_MODES])

    store.cycle()
    assert.equal(store.get(), UI_MODES[0], 'cycling wraps back to the first surface')
  } finally {
    store.dispose()
  }
})
