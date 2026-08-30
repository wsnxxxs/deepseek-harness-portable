import assert from 'node:assert/strict'
import { test } from 'node:test'
import { providerReadiness, visibleProviderRows } from '../lib/types/client/settings/provider-readiness.js'

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

test('the unconfigured generic DeepSeek placeholder is hidden beside the official provider', () => {
  const official = { id: 'deepseek-official', profile: {}, credential: { configured: true, writable: true } }
  const placeholder = { id: 'deepseek', profile: undefined, credential: { configured: false, writable: true } }
  assert.deepEqual(visibleProviderRows([official, placeholder]), [official])

  const configuredGeneric = { ...placeholder, profile: { apiKeyEnv: 'DEEPSEEK_API_KEY' } }
  assert.deepEqual(visibleProviderRows([official, configuredGeneric]), [official, configuredGeneric])
  assert.deepEqual(visibleProviderRows([placeholder]), [placeholder])
})
