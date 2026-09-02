/**
 * The decisions the Cluster panel makes, pinned without a DOM.
 *
 * The modules compile to `lib/types/`, which is the type-stripped ESM the
 * client bundle is built from; importing them there tests the shipped code.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  canOpenMember, csvItems, interpolate, isTeamWorthShowing, memberStatusKey, memberTree, mutationError,
  rootSessionId, taskStatusKey,
} from '../lib/types/client/model.js'

const member = (overrides = {}) => ({
  id: 'session-1',
  name: 'scout',
  role: 'teammate',
  status: 'idle',
  diagnostics: [],
  ...overrides,
})

test('a comma-separated field yields trimmed, distinct, non-empty items', () => {
  assert.deepEqual(csvItems(' src/a , src/b ,, src/a '), ['src/a', 'src/b'])
  assert.deepEqual(csvItems(''), [])
  assert.deepEqual(csvItems('   ,  '), [])
})

test('every roster status and task status has its own copy', () => {
  const statuses = ['running', 'idle', 'inactive', 'provisioning', 'failed']
  const keys = statuses.map(memberStatusKey)
  assert.deepEqual(keys, [
    'status.running', 'status.idle', 'status.inactive', 'status.provisioning', 'status.failed',
  ])
  assert.equal(new Set(keys).size, keys.length, 'no two statuses share a key')

  assert.equal(taskStatusKey('pending'), 'task.pending')
  assert.equal(taskStatusKey('in_progress'), 'task.inProgress')
  assert.equal(taskStatusKey('completed'), 'task.completed')
})

test('a deleted task reads as completed rather than as a missing key', () => {
  // Team views omit tombstones, so this branch exists only so a future view
  // that carried one would still render a word instead of a raw key.
  assert.equal(taskStatusKey('deleted'), 'task.completed')
})

test('only a live teammate row can be opened as its own conversation', () => {
  assert.equal(canOpenMember(member({ status: 'idle' })), true)
  assert.equal(canOpenMember(member({ status: 'running' })), true)
  assert.equal(canOpenMember(member({ status: 'inactive' })), true)
  assert.equal(canOpenMember(member({ role: 'lead' })), false, 'the lead is the conversation on screen')
  assert.equal(canOpenMember(member({ status: 'failed' })), false)
  assert.equal(canOpenMember(member({ status: 'provisioning' })), false, 'no session exists yet')
})

test('the roster indents teammates under the lead', () => {
  const rows = memberTree([member({ role: 'lead', name: 'lead' }), member({ name: 'scout' })])
  assert.deepEqual(rows.map(row => row.depth), [0, 1])
  assert.deepEqual(rows.map(row => row.member.name), ['lead', 'scout'])
})

test('both mutation failure carriers reduce to one message, and success to none', () => {
  assert.equal(mutationError({ ok: false, error: { message: 'gateway closed' } }), 'gateway closed')
  assert.equal(
    mutationError({ ok: true, value: { ok: false, error: { message: 'stale revision' } } }),
    'stale revision',
    'a call that succeeded can still carry a Team rejection',
  )
  assert.equal(mutationError({ ok: true, value: { ok: true, value: { id: 'task-1' } } }), undefined)
})

test('a Team is addressed by the session that owns it', () => {
  const parents = { child: 'middle', middle: 'root' }
  assert.equal(rootSessionId('child', id => parents[id]), 'root')
  assert.equal(rootSessionId('root', id => parents[id]), 'root', 'a root session addresses itself')
})

test('a cyclic lineage stops instead of hanging the browser', () => {
  const cycle = { a: 'b', b: 'a' }
  assert.equal(rootSessionId('a', id => cycle[id]), 'a')
})

test('placeholders are substituted, and an unknown one is left visible', () => {
  assert.equal(interpolate('{count} running', { count: 3 }), '3 running')
  assert.equal(interpolate('{count} running'), '{count} running')
  assert.equal(interpolate('{other} running', { count: 3 }), '{other} running')
})

test('a solo session has a Team view but nothing worth a surface', () => {
  // Every session answers `view`, so success is not the question the header
  // seat asks: a lone lead with an empty board must not put a control on
  // every conversation in the product.
  assert.equal(isTeamWorthShowing({ members: [member({ role: 'lead' })], tasks: [] }), false)
  assert.equal(isTeamWorthShowing({ members: [], tasks: [] }), false)
})

test('a second member or a single shared task makes a Team real', () => {
  assert.equal(
    isTeamWorthShowing({ members: [member({ role: 'lead' }), member()], tasks: [] }),
    true,
  )
  assert.equal(
    isTeamWorthShowing({ members: [member({ role: 'lead' })], tasks: [{ id: 'task-1' }] }),
    true,
    'a board outlives the teammates that worked it',
  )
})
