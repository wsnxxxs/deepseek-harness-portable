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
 * - all three subagent rows must be `one-shot`, keeping lightweight fan-out
 *   separate from durable named teammates, and each must shadow the persona and
 *   cap depth: a one-shot child joins this preset but holds no Team tools, so
 *   the orchestration text does not describe the agent reading it.
 * - `subagent_scout` must keep its `toolFilter`. The persona tells the Lead to
 *   fan scouts out widely and lets their read scopes overlap; that is only safe
 *   while a scout structurally cannot write, so the filter is what the
 *   orchestration advice rests on rather than a redundant belt.
 * - the persona must stay role-routed and must NOT restate the mechanics that
 *   `tool-agent-team` already registers at TEAM_POLICY. Duplication is paid for
 *   on every request by every member and drifts when upstream edits its copy.
 * - the mode must be gated on `crew.agent-team`, so an upstream bump that drops
 *   the experimental package degrades this mode out of the roster instead of
 *   failing the Loader on first use.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { composeModeVariant, parseModeDefinition, validateModeComposition } from './mode-catalog.js'
import { resolveVariant, type CapabilityReport, type CapabilityResult } from './mode-resolver.js'

const require = createRequire(import.meta.url)
const yaml = require('js-yaml') as { load(source: string): unknown }

const directory = fileURLToPath(new URL('../config/agent-presets/crew', import.meta.url))

async function definition() {
  return parseModeDefinition(await readFile(join(directory, 'mode.yml'), 'utf8'), 'crew/mode.yml')
}

/**
 * The persona's rendered text, not the file that carries it.
 *
 * The prohibitions below are about what reaches the MODEL. This file's own
 * comments name the upstream mechanics on purpose — explaining why they are
 * absent is the point of the comment — so a whole-file match would fail on the
 * explanation instead of on the defect.
 */
async function personaText(): Promise<string> {
  const rows = yaml.load(await readFile(join(directory, 'agent.cordis.yml'), 'utf8')) as
    { id?: string; config?: { text?: string } }[]
  const text = rows.find(row => row.id === 'persona')?.config?.prefix
  assert.equal(typeof text, 'string', 'the crew composition must carry a persona row with text')
  return text as string
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

test('the Crew persona is role-routed and describes the real flat Team topology', async () => {
  const persona = await personaText()

  assert.doesNotMatch(persona, /You are DSH's Lead coordinator/)
  assert.doesNotMatch(persona, /recursive decomposition/)
  assert.match(persona, /flat, Lead-led Team/)
  assert.match(persona, /never create another durable Team/)

  // One text is read by the Lead, by every teammate, and by any child that
  // joins this preset without a shadowing persona. The routing sentence and the
  // three labelled blocks are what keep a teammate from executing the Lead's
  // half, so they are contract, not formatting.
  for (const block of [/## SHARED —/, /## LEAD —/, /## TEAMMATE —/]) assert.match(persona, block)
  assert.match(persona, /read SHARED, then only the block for your own role/)
  assert.match(persona, /Team policy section further down states your role/)
})

test('the persona decides orchestration and leaves tool mechanics to TEAM_POLICY', async () => {
  const persona = await personaText()

  // Everything a Lead has to decide and no tool description can decide for it.
  // Losing any of these is how this mode degrades back into Standard with extra
  // latency: fan-out with no admission reason, a briefing a fresh teammate
  // cannot act on, a report the Lead cannot check, or an answer given early.
  // The upstream TEAM_POLICY says to create teammates "only when the user
  // explicitly asks to use Agent Teams or teammates". Selecting this mode IS
  // that ask, and nothing else in the prompt says so: without this sentence a
  // Lead can read the upstream line as a standing refusal and never form a Team
  // at all, which costs the mode its entire reason to exist.
  assert.match(persona, /standing request for this mode, and it is the explicit permission the Team policy below asks for/)

  for (const decision of [
    /Form a Team only when at least one of these holds/,
    /Breadth —/,
    /Independence —/,
    /Reach —/,
    /Briefing\. A fresh teammate knows nothing that you know/,
    /Report contract\. Your report is the entire handoff/,
    /Reviewer \(fresh, never a fork, never the implementer\)/,
    /Convergence\. Before you answer/,
    /## Anti-patterns/,
  ]) assert.match(persona, decision)

  // `tool-agent-team` registers these mechanics itself at TEAM_POLICY. Restating
  // one here buys nothing, is charged to every member on every request, and
  // silently contradicts upstream the first time upstream edits its own copy.
  for (const mechanic of [
    /FS_STALE_VERSION/,
    /wait_agent/,
    /followup_task/,
    /send_message/,
    /\bqueued\b/,
  ]) {
    assert.doesNotMatch(persona, mechanic, `the persona must not restate the TEAM_POLICY mechanic ${String(mechanic)}`)
  }
})

test('one-shot children are leaves carrying a persona that matches their capabilities', async () => {
  const mode = await definition()
  const composed = await composeModeVariant(directory, mode, mode.variants[0] as never)

  // `tool-agent-team` installs only where `agentTeams.tryMembership` resolves,
  // and a one-shot child is not a member. Without a shadowing persona it would
  // read the Lead/teammate orchestration text while holding none of the tools
  // that text is about.
  const shadowing = [...composed.matchAll(/You are a (?:bounded helper|scout) agent powered by/gu)]
  assert.equal(shadowing.length, 3, 'every one-shot delegation row must shadow the preset persona')
  assert.equal(
    [...composed.matchAll(/You have no shared task board, no roster entry, no teammates and no durable identity/gu)].length,
    3,
    'each helper persona must deny Team membership in its own text; a child reads only its own',
  )

  // Depth is stamped as parent + 1: Lead 0, teammate or Lead's helper 1, a
  // teammate's helper 2. A cap of 2 refuses the level below that, which is the
  // structural half of "helpers are leaves".
  const depths = [...composed.matchAll(/^\s+maxDepth:\s*(\S+)/gmu)].map(match => match[1])
  assert.deepEqual(depths, ['2', '2', '2'])
})

test('the scout is read-only by construction, not by request', async () => {
  const mode = await definition()
  const composed = await composeModeVariant(directory, mode, mode.variants[0] as never)
  const rows = yaml.load(composed) as { id?: string; config?: { id?: string; config?: Record<string, unknown> }[] }[]
  const scout = rows.find(row => row.id === 'delegation')?.config?.find(row => row.id === 'tool-subagent-scout')

  assert.ok(scout !== undefined, 'the composition must carry a dedicated scout delegation row')
  assert.equal(scout.config?.['toolName'], 'subagent_scout')

  // The persona tells the Lead to split read-only waves finely and lets scout
  // read scopes overlap. That advice is only safe while a scout cannot write, so
  // this filter is load-bearing: `tools.restrict` removes both names from the
  // child's catalog and rejects a call to either.
  assert.deepEqual(scout.config?.['toolFilter'], { deny: ['write', 'edit'] })

  // The shell row is variant-selected (`tool-bash` here, `tool-pwsh` on
  // Windows) and `tools.restrict()` throws on a name the composition does not
  // register, so the filter cannot name it and the persona carries that half.
  const persona = String(scout.config?.['persona'] ?? '')
  assert.match(persona, /`write` and `edit` are not in your catalog/)
  assert.match(persona, /no writing through the shell/)
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

  assert.deepEqual(backgroundModes, ['one-shot', 'one-shot', 'one-shot'])
})

test('the persona prices a scarce roster against plentiful helpers', async () => {
  const persona = await personaText()

  // The mode's whole claim is that many agents beat one. A Lead that treats a
  // one-shot helper as expensive as a roster slot reads the whole repository
  // itself and runs out of context mid-mission — Standard mode with extra
  // latency. These lines are the counterweight, and each states something the
  // tool descriptions cannot: what a delegation costs, and what it buys.
  for (const economics of [
    /Two kinds of delegation, priced differently/,
    /Be stingy with the first and generous with the second/,
    /Helper economics\./,
    /It does not pay for work you finish in a step or two/,
    /Once a helper is running, that scope is its/,
    /Read-only members may overlap/,
    /Reuse before you respawn\./,
  ]) assert.match(persona, economics)

  // A briefing rule that treats every task the same over-specifies the ones
  // that need a question and under-specifies the ones that need a path.
  assert.match(persona, /For a lookup, hand over the exact path, symbol or command/)
  assert.match(persona, /For an investigation, hand over the question and the ground you covered, not a fixed procedure/)
  assert.match(persona, /Do not delegate understanding/)

  // Partitioning before knowing the layout produces teammates that collide, so
  // orientation precedes the admission decision rather than following it.
  assert.match(persona, /Orient first\./)
  assert.match(persona, /dispatch the whole wave in one assistant message/)
  assert.match(persona, /If two instances come out with the same prompt, the split is wrong/)

  // Every helper tool named here must exist as a row, or the persona is
  // advertising a capability the composition does not mount.
  const mode = await definition()
  const ids = rowIds(await composeModeVariant(directory, mode, mode.variants[0] as never))
  for (const [tool, row] of [
    ['subagent', 'tool-subagent'],
    ['subagent_scout', 'tool-subagent-scout'],
    ['subagent_fork', 'tool-subagent-fork'],
  ] as const) {
    assert.match(persona, new RegExp(`\`${tool}\``, 'u'), `the persona must name ${tool}`)
    assert.ok(ids.includes(row), `${tool} is named in the persona but ${row} is not mounted`)
  }
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
