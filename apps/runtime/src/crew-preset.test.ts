/**
 * Regression tests for the shipped Crew contract.
 *
 * Crew differs from the other modes in ways that are easy to undo by accident,
 * and each of them is load-bearing:
 *
 * - the Team SERVICE must NOT appear in the preset. It provides `agentTeams`,
 *   which the Gateway resolves from the HOST context for a `direct` Remote
 *   invocation, so a preset realm would hide it from every browser call while
 *   a realm-less preset row is refused outright at mount. Only the model-facing
 *   tools belong here.
 * - `tool-subagent-control` and `tool-subagent-list-agents` must stay out. They
 *   register `send_message`, `interrupt_agent` and `list_agents`, the same three
 *   names the Team tools claim with durable-roster semantics.
 * - both subagent rows must be `one-shot`, keeping lightweight fan-out
 *   separate from durable named teammates.
 * - the mode must be gated on `crew.agent-team`, so an upstream bump that drops
 *   the experimental package degrades this mode out of the roster instead of
 *   failing the Loader on first use.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeModeVariant, parseModeDefinition, validateModeComposition } from './mode-catalog.js'
import { resolveVariant, type CapabilityReport, type CapabilityResult } from './mode-resolver.js'

const directory = fileURLToPath(new URL('../config/agent-presets/crew', import.meta.url))

async function definition() {
  return parseModeDefinition(await readFile(join(directory, 'mode.yml'), 'utf8'), 'crew/mode.yml')
}

/** Row ids of a composed entry list, including rows nested inside groups. */
function rowIds(composed: string): string[] {
  return [...composed.matchAll(/^\s*-\s+id:\s*['"]?([^\s'"]+)/gmu)].map(match => match[1] as string)
}

const available: CapabilityResult = { state: 'available' }
const absent: CapabilityResult = { state: 'unavailable', reason: 'not measured on this target' }

function report(overrides: Record<string, CapabilityResult> = {}): CapabilityReport {
  return {
    target: { platform: 'linux', arch: 'x64' },
    capabilities: {
      'sandbox.workspace-write': available,
      'shell.bash': available,
      'shell.powershell': absent,
      'crew.agent-team': available,
      ...overrides,
    },
    generatedAt: '',
    snapshotHash: '',
  }
}

test('crew declares a native variant per target, each gated on the Team runtime', async () => {
  const mode = await definition()
  assert.equal(mode.id, 'crew')
  assert.deepEqual(mode.variants.map(variant => [variant.id, variant.supportLevel]), [
    ['win32-powershell', 'native'],
    ['posix-bash', 'native'],
  ])
  for (const variant of mode.variants) {
    assert.ok(
      variant.requires.includes('crew.agent-team'),
      `${variant.id} must require the Team runtime, or the mode cannot degrade when it is absent`,
    )
  }
})

test('every crew variant satisfies the contract and mounts the distinguishing rows', async () => {
  const mode = await definition()
  for (const variant of mode.variants) {
    const composed = await composeModeVariant(directory, mode, variant)
    validateModeComposition(mode, variant, composed)
    assert.doesNotMatch(composed, /process\.platform/)

    const ids = rowIds(composed)
    assert.ok(ids.includes('tool-agent-team'), `${variant.id} must mount the Team tools`)
    assert.ok(ids.includes('tool-session-query'), `${variant.id} must mount cross-session recall`)
    assert.equal(
      ids.filter(id => id === (variant.provides?.shell as string)).length, 1,
      `${variant.id} must provide exactly one shell row`,
    )
  }
})

test('the three-name collision with the continuable-child controls stays out', async () => {
  const mode = await definition()
  for (const variant of mode.variants) {
    const ids = rowIds(await composeModeVariant(directory, mode, variant))
    for (const forbidden of ['tool-subagent-control', 'tool-subagent-list-agents']) {
      assert.ok(!ids.includes(forbidden), `${variant.id} must not mount ${forbidden}`)
    }
  }
})

test('the Team service is host-plane, so the preset publishes no service of its own', async () => {
  const mode = await definition()
  const composed = await composeModeVariant(directory, mode, mode.variants[0] as never)

  // The service package would be rejected at mount without a realm and unusable
  // from the browser with one; it belongs to the host overlay in packaged-bin.
  assert.ok(
    !composed.includes("'@deepseek-ai/dsh-experimental-agent-team'"),
    'the agentTeams service must not be a preset row',
  )
  assert.ok(composed.includes("'@deepseek-ai/dsh-experimental-tool-agent-team'"))
})

test('delegation stays one-shot so lightweight fan-out stays separate from Team membership', async () => {
  const mode = await definition()
  const composed = await composeModeVariant(directory, mode, mode.variants[0] as never)
  const backgroundModes = [...composed.matchAll(/^\s+backgroundMode:\s*(\S+)/gmu)].map(match => match[1])

  assert.deepEqual(backgroundModes, ['one-shot', 'one-shot'])
})

test('crew resolves natively on each target and disappears without the Team runtime', async () => {
  const mode = await definition()

  const posix = resolveVariant(mode, report())
  assert.equal(posix.supportLevel, 'native')
  assert.equal(posix.supportLevel === 'native' ? posix.variantId : '', 'posix-bash')

  const windows = resolveVariant(mode, report({
    'shell.bash': absent,
    'shell.powershell': available,
  }))
  assert.equal(windows.supportLevel === 'unavailable' ? '' : windows.variantId, 'win32-powershell')

  // The alpha-dependency safety valve: an upstream bump that drops the
  // experimental package must cost this mode its discovery files and nothing
  // else. `compileModeCatalog` deletes them for exactly this result.
  const withoutTeam = resolveVariant(mode, report({
    'crew.agent-team': { state: 'unavailable', reason: 'the Agent Teams runtime is not present in this build' },
  }))
  assert.equal(withoutTeam.supportLevel, 'unavailable')
  assert.ok(withoutTeam.supportLevel === 'unavailable' && withoutTeam.missingCapabilities.includes('crew.agent-team'))
})

test('a degraded Team runtime never silently satisfies the contract', async () => {
  const mode = await definition()

  // Only `sandbox.workspace-write` is opted into via acceptsDegraded; a
  // half-present Team runtime must not be treated as usable.
  const degraded = resolveVariant(mode, report({
    'crew.agent-team': { state: 'degraded', reason: 'partially resolvable' },
  }))
  assert.equal(degraded.supportLevel, 'unavailable')
})
