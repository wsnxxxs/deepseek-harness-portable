import assert from 'node:assert/strict'
import { test } from 'node:test'
import { prepareOfficialProfile } from './official-profile.js'

test('official defaults precede explicit feature bundles and remain idempotent', () => {
  const source = { dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@dsh-portable/dcode-ui'] } } }
  const result = prepareOfficialProfile(source)
  assert.deepEqual(result.dsh.profile.bundles, ['@dsh-portable/desktop-protocol', '@dsh-portable/web-plugins', ...source.dsh.profile.bundles])
  assert.deepEqual(prepareOfficialProfile(result), result)
  assert.equal(source.dsh.profile.bundles.length, 3)
})

test('retire only previously auto-seeded community bundles, preserving explicit later opt-in', () => {
  const result = prepareOfficialProfile({ dsh: { profile: {
    bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@linxin666/dsh-web-all'],
    portableWebAllSeeded: true,
  } } })
  assert.ok(!result.dsh.profile.bundles.includes('@linxin666/dsh-web-all'))
  result.dsh.profile.bundles.push('@linxin666/dsh-web-all')
  assert.ok(prepareOfficialProfile(result).dsh.profile.bundles.includes('@linxin666/dsh-web-all'))
})
