import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clampRailWidth, RAIL_WIDTH } from '../lib/types/client/state/rail-width.js'

test('the session sidebar width stays inside its usable range', () => {
  assert.equal(clampRailWidth(160), RAIL_WIDTH.min)
  assert.equal(clampRailWidth(312.4), 312)
  assert.equal(clampRailWidth(600), RAIL_WIDTH.max)
  assert.equal(clampRailWidth(Number.NaN), RAIL_WIDTH.default)
})
