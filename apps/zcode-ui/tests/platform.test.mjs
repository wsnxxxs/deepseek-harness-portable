import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isApplePlatform } from '../lib/types/client/platform.js'

test('platform detection prefers userAgentData and falls back to userAgent', () => {
  assert.equal(isApplePlatform({ userAgentData: { platform: 'macOS' }, userAgent: 'Windows NT' }), true)
  assert.equal(isApplePlatform({ userAgentData: { platform: 'Windows' }, userAgent: 'Macintosh' }), false)
  assert.equal(isApplePlatform({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17)' }), true)
  assert.equal(isApplePlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' }), false)
})
