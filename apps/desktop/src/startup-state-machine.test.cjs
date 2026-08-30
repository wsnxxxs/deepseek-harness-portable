const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { test } = require('node:test')

const source = readFileSync(require.resolve('./main.cjs'), 'utf8')

test('protocol listening is the only blocking runtime gate before renderer navigation', () => {
  const restartHarness = source.match(/async function restartHarness\(\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction requestHarnessRestart/)?.[0]
  assert.ok(restartHarness, 'expected the desktop restart state machine')
  assert.doesNotMatch(restartHarness, /await probeHarnessHealth\(/)
  assert.match(restartHarness, /const url = await startHarness\(/)
  assert.match(restartHarness, /await window\.loadURL\(/)

  const supervisor = readFileSync(require.resolve('./runtime-supervisor.cjs'), 'utf8')
  assert.doesNotMatch(supervisor, /waitForOnboardingReady|waitUntilReady/)
  assert.match(supervisor, /authenticated protocol event as authoritative/)
})

test('background health authentication has a finite timeout', () => {
  const runHealthProbe = source.match(/function runHarnessHealthProbe\(\) \{[\s\S]*?\r?\n\}\r?\n\r?\n\/\/ Back off/)?.[0]
  assert.ok(runHealthProbe, 'expected the background health monitor')
  assert.match(runHealthProbe, /timeoutMs: HARNESS_HEALTH_TIMEOUT_MS/)
})
