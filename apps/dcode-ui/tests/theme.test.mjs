import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createAppearanceStore,
  DEFAULT_FONT_SIZE,
  FONT_SIZE_MIN,
  FONT_SIZE_MAX,
} from '../lib/types/client/theme.js'

test('DEFAULT_FONT_SIZE, FONT_SIZE_MIN, and FONT_SIZE_MAX are defined correctly', () => {
  assert.equal(DEFAULT_FONT_SIZE, 14)
  assert.equal(FONT_SIZE_MIN, 11)
  assert.equal(FONT_SIZE_MAX, 22)
})

test('createAppearanceStore reads font size from theme service', () => {
  let currentFontSize = 16
  const theme = {
    getTheme: () => ({
      active: { id: 'dark', colorScheme: 'dark' },
      preference: 'dark',
      fontSize: currentFontSize,
    }),
    setFontSize: (px) => {
      currentFontSize = px
    },
    setTheme: () => {},
  }

  const store = createAppearanceStore(undefined, theme)
  assert.equal(store.getFontSize(), 16)
  assert.equal(store.canSetFontSize, true)

  store.setFontSize(18)
  assert.equal(currentFontSize, 18)
  assert.equal(store.getFontSize(), 18)
})

test('createAppearanceStore clamps font size to valid range', () => {
  let currentFontSize = 14
  const theme = {
    getTheme: () => ({
      active: { id: 'light', colorScheme: 'light' },
      preference: 'light',
      fontSize: currentFontSize,
    }),
    setFontSize: (px) => {
      currentFontSize = px
    },
  }

  const store = createAppearanceStore(undefined, theme)
  store.setFontSize(5)
  assert.equal(currentFontSize, FONT_SIZE_MIN)

  store.setFontSize(30)
  assert.equal(currentFontSize, FONT_SIZE_MAX)
})

test('createAppearanceStore falls back to DEFAULT_FONT_SIZE when no theme is present', () => {
  const store = createAppearanceStore(undefined, undefined)
  assert.equal(store.getFontSize(), DEFAULT_FONT_SIZE)
})

test('createAppearanceStore notifies subscribers on theme/change event', () => {
  const listeners = []
  const events = {
    on: (event, listener) => {
      if (event === 'theme/change') {
        listeners.push(listener)
      }
      return () => {
        const idx = listeners.indexOf(listener)
        if (idx >= 0) listeners.splice(idx, 1)
      }
    },
  }

  let notified = 0
  const store = createAppearanceStore(events, undefined)
  const unsubscribe = store.subscribe(() => {
    notified += 1
  })

  assert.equal(notified, 0)
  for (const listener of listeners) listener()
  assert.equal(notified, 1)

  unsubscribe()
  for (const listener of listeners) listener()
  assert.equal(notified, 1)
})
