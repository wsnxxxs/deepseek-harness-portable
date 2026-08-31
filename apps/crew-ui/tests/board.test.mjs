/**
 * The board's pure logic.
 *
 * Grouping and labelling decide what an operator sees before any of the async
 * machinery runs, so they are pinned here where they can be exercised without a
 * Host, a Remote namespace, or a DOM.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BOARD_COLUMNS, blockerLabels, failureText, groupTasks } from '../lib/types/client/state/board.js'
import { foldThread } from '../lib/types/client/state/thread.js'

function task(id, over = {}) {
  return {
    id,
    revision: 1,
    subject: `task ${id}`,
    description: '',
    status: 'pending',
    blockedBy: [],
    writeScopes: [],
    ready: true,
    writeScopeWarnings: [],
    ...over,
  }
}

test('columns are the order work moves through', () => {
  assert.deepEqual([...BOARD_COLUMNS], ['pending', 'in_progress', 'completed'])
})

test('tasks land in their status column and tombstones are dropped', () => {
  const grouped = groupTasks([
    task('a'),
    task('b', { status: 'in_progress' }),
    task('c', { status: 'completed' }),
    // A deleted task stays in history on the host but must not occupy a column.
    task('d', { status: 'deleted' }),
  ])

  assert.deepEqual(grouped.pending.map(item => item.id), ['a'])
  assert.deepEqual(grouped.in_progress.map(item => item.id), ['b'])
  assert.deepEqual(grouped.completed.map(item => item.id), ['c'])
})

test('unblocked work sorts to the top of its column', () => {
  // "What can start now" is the question a board is scanned for, so a blocked
  // task must never sit above a ready one.
  const grouped = groupTasks([
    task('blocked', { ready: false }),
    task('ready', { ready: true }),
    task('alsoBlocked', { ready: false }),
  ])

  assert.deepEqual(grouped.pending.map(item => item.id), ['ready', 'blocked', 'alsoBlocked'])
})

test('an empty board yields every column, not an empty object', () => {
  const grouped = groupTasks([])
  for (const column of BOARD_COLUMNS) assert.deepEqual(grouped[column], [])
})

test('blockers are named by subject, and a dangling one keeps its id', () => {
  const tasks = [task('one', { subject: 'Write the parser' }), task('two')]
  const blocked = task('three', { blockedBy: ['one', 'missing'] })

  // Showing a raw id for a blocker that is gone beats hiding the dependency:
  // a dangling blocker is exactly the state worth noticing.
  assert.deepEqual(blockerLabels(blocked, tasks), ['Write the parser', 'missing'])
})

test('a Remote failure reads as message then code, like every official surface', () => {
  assert.equal(
    failureText({ code: 'team-task-conflict', message: 'task was modified' }),
    'task was modified (team-task-conflict)',
  )
})

test('the thread log keeps what was said and collapses stretches of tool work', () => {
  const entries = foldThread([
    { kind: 'user', id: 'u1', content: [{ kind: 'text', text: 'plan the migration' }] },
    { kind: 'tool-result', id: 't1' },
    { kind: 'tool-result', id: 't2' },
    { kind: 'tool-result', id: 't3' },
    { kind: 'assistant', id: 'a1', blocks: [{ kind: 'reasoning', text: 'hidden' }, { kind: 'text', text: 'done' }] },
  ])

  assert.deepEqual(entries, [
    { kind: 'said', id: 'u1', who: 'user', text: 'plan the migration' },
    // Three calls, one row: the count is the useful part, and one row each
    // would bury the answer that follows.
    { kind: 'work', id: 't1', count: 3 },
    // Reasoning is not what was said; only the text blocks survive.
    { kind: 'said', id: 'a1', who: 'agent', text: 'done' },
  ])
})

test('the thread log drops nodes that carry no narrative', () => {
  const entries = foldThread([
    { kind: 'compaction', id: 'c1' },
    { kind: 'context', id: 'x1' },
    { kind: 'assistant', id: 'a1', blocks: [] },
    { kind: 'user', id: 'u1', content: [{ kind: 'image' }] },
  ])

  // An assistant turn with no text and a message with only an image say
  // nothing in a compact log; dividers belong to the full transcript.
  assert.deepEqual(entries, [])
})
