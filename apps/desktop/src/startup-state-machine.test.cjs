const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')

const source = readFileSync(require.resolve('./main.cjs'), 'utf8')

test('renderer navigation waits for a coherent browser boot without a duplicate health probe', () => {
  const restartHarness = source.match(/async function restartHarness\(\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction requestHarnessRestart/)?.[0]
  assert.ok(restartHarness, 'expected the desktop restart state machine')
  assert.doesNotMatch(restartHarness, /await probeHarnessHealth\(/)
  assert.match(restartHarness, /const url = await startHarness\(/)
  assert.match(restartHarness, /await waitForOnboardingReady\(/)
  assert.match(restartHarness, /await window\.webContents\.session\.clearCache\(\)/)
  assert.match(restartHarness, /await window\.loadURL\(/)
  assert.ok(
    restartHarness.indexOf('await waitForOnboardingReady(') < restartHarness.indexOf('await window.loadURL('),
    'browser readiness must settle before renderer navigation',
  )
  assert.ok(
    restartHarness.indexOf('await window.webContents.session.clearCache()') < restartHarness.indexOf('await window.loadURL('),
    'the prior process cache must be cleared before renderer navigation',
  )

  const supervisor = readFileSync(require.resolve('./runtime-supervisor.cjs'), 'utf8')
  assert.doesNotMatch(supervisor, /waitForOnboardingReady|waitUntilReady/)
  assert.match(supervisor, /authenticated protocol event as authoritative/)
})

test('background health authentication has a finite timeout', () => {
  const runHealthProbe = source.match(/function runHarnessHealthProbe\(\) \{[\s\S]*?\r?\n\}\r?\n\r?\n\/\/ Back off/)?.[0]
  assert.ok(runHealthProbe, 'expected the background health monitor')
  assert.match(runHealthProbe, /timeoutMs: HARNESS_HEALTH_TIMEOUT_MS/)
})
