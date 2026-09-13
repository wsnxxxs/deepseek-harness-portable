import { deepStrictEqual, strictEqual } from 'node:assert/strict'
import { test } from 'node:test'
import {
  composeRows, nextPreferences, portablePreferences, toggleOutcome,
} from '../lib/types/host/registry.js'

const facts = name => (name === '@dsh-portable/ui-mode' ? { version: '0.1.0', description: 'modes' } : undefined)

test('only the distribution\'s own packages become rows', () => {
  const rows = composeRows([
    { id: 'ui-mode', name: '@dsh-portable/ui-mode', disabled: false },
    { id: 'agent-team', name: '@deepseek-ai/dsh-experimental-agent-team', disabled: false },
  ], {}, facts)
  deepStrictEqual(rows.map(row => row.id), ['ui-mode'])
  strictEqual(rows[0].version, '0.1.0')
})

test('an unresolvable package still lists, without a version', () => {
  const [row] = composeRows([{ id: 'x', name: '@dsh-portable/x', disabled: false }], {}, facts)
  strictEqual(row.version, null)
  strictEqual(row.description, null)
})

test('a preference matching the live state is not pending', () => {
  const [row] = composeRows(
    [{ id: 'ui-mode', name: '@dsh-portable/ui-mode', disabled: false }],
    { '@dsh-portable/ui-mode': true },
    facts,
  )
  strictEqual(row.enabled, true)
  strictEqual(row.pending, undefined)
})

test('a preference the process has not applied reads as pending', () => {
  const [row] = composeRows(
    [{ id: 'ui-mode', name: '@dsh-portable/ui-mode', disabled: false }],
    { '@dsh-portable/ui-mode': false },
    facts,
  )
  deepStrictEqual([row.enabled, row.pending], [true, false])
})

test('malformed preference blocks are ignored rather than thrown on', () => {
  deepStrictEqual(portablePreferences({ dsh: { profile: { portablePlugins: ['nope'] } } }), {})
  deepStrictEqual(portablePreferences({ dsh: { profile: { portablePlugins: { a: true, b: 'yes' } } } }), { a: true })
  deepStrictEqual(portablePreferences(undefined), {})
})

test('switching pins the preference even when it matches the default', () => {
  deepStrictEqual(nextPreferences({}, '@dsh-portable/ui-mode', true), { '@dsh-portable/ui-mode': true })
})

test('the outcome reports both what changed and what needs a restart', () => {
  const live = { id: 'a', name: '@dsh-portable/a', version: null, description: null, enabled: true }
  deepStrictEqual(toggleOutcome(live, false), {
    name: '@dsh-portable/a', enabled: false, changed: true, requiresRestart: true,
  })
  // Switching back to what this process is already doing needs no restart.
  deepStrictEqual(toggleOutcome({ ...live, pending: false }, true), {
    name: '@dsh-portable/a', enabled: true, changed: true, requiresRestart: false,
  })
})
