/**
 * The roster guard exists because `includeShippedRoot: false` removes the
 * backfill that used to hide an empty compiled catalog. These tests pin the
 * the outcomes that decision creates.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import type { RuntimeModeCatalog, RuntimeModeResolution } from './mode-catalog.js'
import {
  describePresetRosterOutcome,
  reconcileCrewRuntime,
  reconcilePresetRoster,
  selectableModes,
} from './preset-roster.js'

function mode(
  modeId: string,
  supportLevel: RuntimeModeResolution['supportLevel'],
  selectable = true,
): RuntimeModeResolution {
  return { modeId, supportLevel, selectable }
}

function catalog(...modes: RuntimeModeResolution[]): RuntimeModeCatalog {
  return {
    schemaVersion: 1,
    target: { platform: 'linux', arch: 'x64' },
    capabilitySnapshotHash: 'test',
    upstreamCommit: 'test',
    modes: Object.fromEntries(modes.map(item => [item.modeId, item])),
  }
}

function overlays(config: Record<string, unknown>): PatchOptions[] {
  return [
    { id: 'other-row', config: { default: 'ignored' } } as unknown as PatchOptions,
    { id: 'agent-presets', config } as unknown as PatchOptions,
  ]
}

test('a selectable configured default is left exactly as composed', () => {
  const list = overlays({ default: 'standard', roots: [{ path: '/root' }], includeShippedRoot: false })
  const outcome = reconcilePresetRoster(list, catalog(mode('standard', 'native'), mode('crew', 'native')))

  assert.deepEqual(outcome, { kind: 'intact' })
  assert.deepEqual((list[1] as { config: Record<string, unknown> }).config, {
    default: 'standard',
    roots: [{ path: '/root' }],
    includeShippedRoot: false,
  })
  assert.equal(describePresetRosterOutcome(outcome, '/presets'), undefined)
})

test('an unselectable default is replaced by the best-supported survivor', () => {
  const list = overlays({ default: 'standard', includeShippedRoot: false })
  const outcome = reconcilePresetRoster(list, catalog(
    mode('standard', 'unavailable', false),
    // Deliberately out of both alphabetical and declaration order: the pick
    // must come from support level first, so `minimal` must not win on 'm'.
    mode('minimal', 'compatible'),
    mode('crew', 'native'),
  ))

  assert.equal(outcome.kind, 'default-replaced')
  assert.equal((list[1] as { config: Record<string, unknown> }).config.default, 'crew')
  // Falling back must never silently reopen upstream as well.
  assert.equal((list[1] as { config: Record<string, unknown> }).config.includeShippedRoot, false)

  const diagnostic = describePresetRosterOutcome(outcome, '/presets')
  assert.equal(diagnostic?.severity, 'warning')
  assert.match(diagnostic.message, /"standard" is not available/)
  assert.match(diagnostic.message, /defaulting to "crew" \(native\)/)
})

test('the retired code preset id resolves through the ptc remap before being judged', () => {
  const list = overlays({ default: 'code', includeShippedRoot: false })

  assert.deepEqual(reconcilePresetRoster(list, catalog(mode('ptc', 'native'))), { kind: 'intact' })
  assert.equal((list[1] as { config: Record<string, unknown> }).config.default, 'code')
})

test('an empty catalog reopens the upstream roster and reports at error severity', () => {
  const list = overlays({ default: 'standard', includeShippedRoot: false })
  const outcome = reconcilePresetRoster(list, catalog(
    mode('standard', 'unavailable', false),
    mode('minimal', 'unavailable', false),
  ))

  assert.deepEqual(outcome, { kind: 'upstream-restored' })
  assert.equal((list[1] as { config: Record<string, unknown> }).config.includeShippedRoot, true)
  // The default is left alone: no compiled mode could replace it, and upstream
  // ships the id this deployment configured.
  assert.equal((list[1] as { config: Record<string, unknown> }).config.default, 'standard')

  const diagnostic = describePresetRosterOutcome(outcome, '/presets')
  assert.equal(diagnostic?.severity, 'error')
  assert.match(diagnostic.message, /not the ones this distribution measured/)
  assert.match(diagnostic.message, /\/presets/)
})

test('a deployment that never claimed the roster is not given one', () => {
  const list: PatchOptions[] = [{ id: 'telemetry', disabled: true } as unknown as PatchOptions]

  assert.deepEqual(reconcilePresetRoster(list, catalog(mode('crew', 'native'))), { kind: 'intact' })
  assert.deepEqual(list, [{ id: 'telemetry', disabled: true }])
})

test('selectable modes are ordered by support level, then by id', () => {
  const ordered = selectableModes(catalog(
    mode('zulu', 'native'),
    mode('alpha', 'alternative'),
    mode('bravo', 'compatible'),
    mode('alfa', 'native'),
    mode('hidden', 'native', false),
  ))

  assert.deepEqual(ordered.map(item => item.modeId), ['alfa', 'zulu', 'bravo', 'alpha'])
})

test('the Crew host dependency follows Crew preset availability', () => {
  const available: PatchOptions[] = []
  assert.equal(reconcileCrewRuntime(available, catalog(mode('crew', 'native'))), 'enabled')
  assert.deepEqual(available, [])

  const unavailable: PatchOptions[] = []
  const noCrew = catalog(mode('crew', 'unavailable', false), mode('standard', 'native'))
  assert.equal(reconcileCrewRuntime(unavailable, noCrew), 'disabled')
  // Two Crew-specific rows: the Agent Teams host service, and the Cluster
  // plugin that is its only browser reader. The Agent workbench itself is not
  // Crew-specific and stays.
  assert.deepEqual(unavailable, [
    { id: 'agent-team', disabled: true },
    { id: 'cluster-ui', disabled: true },
  ])

  // Idempotent: reconciling twice must not stack duplicate patches.
  assert.equal(reconcileCrewRuntime(unavailable, noCrew), 'disabled')
  assert.deepEqual(unavailable, [
    { id: 'agent-team', disabled: true },
    { id: 'cluster-ui', disabled: true },
  ])
})
