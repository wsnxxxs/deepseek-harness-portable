import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clampAsideWidth, ASIDE_WIDTH } from '../lib/types/client/state/aside-width.js'

test('the preview sidebar width stays inside its usable range', () => {
  assert.equal(clampAsideWidth(180), ASIDE_WIDTH.min)
  assert.equal(clampAsideWidth(450.4), 450)
  assert.equal(clampAsideWidth(1200), ASIDE_WIDTH.max)
  assert.equal(clampAsideWidth(Number.NaN), ASIDE_WIDTH.default)
})
