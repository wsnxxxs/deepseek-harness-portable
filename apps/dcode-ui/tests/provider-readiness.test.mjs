import assert from 'node:assert/strict'
import { test } from 'node:test'
import { providerReadiness } from '../lib/types/client/settings/provider-readiness.js'

const base = {
  active: true,
  configured: true,
  requiresApiKey: true,
  credential: { configured: false, writable: true },
}

test('a registered provider without its required API key stays unconfigured', () => {
  assert.deepEqual(providerReadiness(base), {
    kind: 'unconfigured',
    reason: 'missing-api-key',
  })
})

test('green readiness requires both a registered route and configured credential', () => {
  assert.deepEqual(providerReadiness({
    ...base,
    credential: { configured: true, source: 'file', writable: true },
  }), {
    kind: 'ready',
    reason: 'credential-configured',
  })
  assert.equal(providerReadiness({
    ...base,
    active: false,
    credential: { configured: true, writable: true },
  }).kind, 'error')
})

test('keyless providers are neutral and Remote errors are red', () => {
  assert.deepEqual(providerReadiness({
    ...base,
    requiresApiKey: false,
    credential: undefined,
  }), {
    kind: 'keyless',
    reason: 'key-not-required',
  })
  assert.deepEqual(providerReadiness({ ...base, credentialError: 'vault offline' }), {
    kind: 'error',
    reason: 'credential-error',
    detail: 'vault offline',
  })
})
