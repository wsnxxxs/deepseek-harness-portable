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

test('the Cordis context publishes one mode service for both frontends', async () => {
  const ctx = new Context()
  const owner = new UiModeService(ctx)
  const workbench = ctx.get('uiMode')
  const secondSurface = ctx.get('uiMode')
  try {
    const seen = []
    const stop = secondSurface.subscribe(mode => { seen.push(mode) })
    workbench.set('official')

    assert.equal(owner.get(), 'official')
    assert.equal(secondSurface.get(), 'official', 'a switch in one surface is visible in the other')
    assert.deepEqual(seen, ['official'])
    stop()
  } finally {
    await ctx.fiber.dispose()
  }
})

test('selecting the active mode is a no-op, so a menu retick cannot remount', () => {
  const store = createUiModeStore()
  try {
    store.set('official')
    const seen = []
    const stop = store.subscribe(mode => { seen.push(mode) })
    store.set('official')
    store.set('official', 'desktop')
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

/*
 * Availability. A surface announces itself from its own plugin body, so a
 * build that omits one — or whose Host withdrew its row — reports it as
 * unavailable rather than offering a choice that silently lands on the
 * official UI.
 */

test('a mode is unavailable until its surface announces itself', () => {
  const store = createUiModeStore()
  try {
    for (const mode of UI_MODES) {
      // `official` is upstream's own shell and is what renders whenever no
      // extension surface holds `root`, so it needs no announcement.
      assert.equal(store.available(mode), mode === 'official', `${mode} before any announcement`)
    }

    const withdraw = store.announce('dcode')
    assert.equal(store.available('dcode'), true)
    withdraw()
    assert.equal(store.available('dcode'), false)
  } finally {
    store.dispose()
  }
})

test('announcements are counted, so one withdrawal cannot strand a live surface', () => {
  // A renderer epoch change re-registers a surface before the old registration
  // is released. A plain flag would let the stale withdrawal take the mode away
  // from the registration that replaced it.
  const store = createUiModeStore()
  try {
    const first = store.announce('dcode')
    const second = store.announce('dcode')

    first()
    assert.equal(store.available('dcode'), true, 'the second announcement still holds it')
    second()
    assert.equal(store.available('dcode'), false)

    // Disposing twice must not decrement someone else's count.
    first()
    const third = store.announce('dcode')
    first()
    assert.equal(store.available('dcode'), true)
    third()
  } finally {
    store.dispose()
  }
})

test('an availability change notifies subscribers, so a rendered switch repaints', () => {
  const store = createUiModeStore()
  try {
    let notifications = 0
    const stop = store.subscribe(() => { notifications += 1 })

    const withdraw = store.announce('dcode')
    assert.equal(notifications, 1, 'becoming available notifies')
    const second = store.announce('dcode')
    assert.equal(notifications, 1, 'an already-available mode notifies nobody')
    second()
    assert.equal(notifications, 1, 'still available, still quiet')
    withdraw()
    assert.equal(notifications, 2, 'becoming unavailable notifies')

    stop()
  } finally {
    store.dispose()
  }
})

test('the service hands every surface the same availability view', () => {
  const ctx = new Context()
  const owner = new UiModeService(ctx)
  const workbench = ctx.get('uiMode')
  const missionControl = ctx.get('uiMode')

  const withdraw = workbench.announce('dcode')
  assert.equal(missionControl.available('dcode'), true, 'one page, one available set')
  withdraw()
  assert.equal(missionControl.available('dcode'), false)
  void owner
})
