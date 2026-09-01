/**
 * The re-anchor hook registry is what lets one ingest pipeline serve surfaces
 * that know nothing about each other: the kernel moves quotes onto a rebuilt
 * structure, and whoever STORED those quotes contributes a pass instead of
 * being imported by the pipeline.
 *
 * The properties below are the ones a consumer relies on, so they are pinned
 * here rather than left to the pipeline's integration tests.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  emptyReanchorOutcome, registerReanchorHook, runReanchorHooks,
} from '../lib/reanchor-hooks.js'

const VAULT = { root: '/space' }
const NEXT = { sourceId: 'guide' }

function outcome(over = {}) {
  return { moved: 0, unchanged: 0, stale: 0, recovered: 0, ...over }
}

test('a space with no consumers still reports a receipt', async () => {
  // An ingest into a space nothing has stored quotes in is not an error, and
  // the caller must not have to distinguish "no hooks" from "nothing moved".
  assert.deepEqual(await runReanchorHooks(VAULT, undefined, NEXT), emptyReanchorOutcome())
})

test('every consumer runs and their outcomes sum into one total', async () => {
  const seen = []
  const stopA = registerReanchorHook(async (vault, previous, next) => {
    seen.push(['a', vault, previous, next])
    return outcome({ moved: 2, stale: 1 })
  })
  const stopB = registerReanchorHook(async () => {
    seen.push(['b'])
    return outcome({ moved: 3, recovered: 4 })
  })

  try {
    const total = await runReanchorHooks(VAULT, undefined, NEXT)

    // One honest total, not one receipt per subsystem.
    assert.deepEqual(total, outcome({ moved: 5, stale: 1, recovered: 4 }))
    // Registration order, not concurrency: hooks write into the same space, so
    // a re-import's receipt has to be reproducible.
    assert.deepEqual(seen.map(entry => entry[0]), ['a', 'b'])
    assert.deepEqual(seen[0].slice(1), [VAULT, undefined, NEXT])
  } finally {
    stopA()
    stopB()
  }
})

test('registering the same consumer twice does not double-count it', async () => {
  const hook = async () => outcome({ moved: 1 })
  const stopFirst = registerReanchorHook(hook)
  const stopSecond = registerReanchorHook(hook)

  try {
    // Module-load registration means a second import of a consumer must not
    // make every re-import report twice the work.
    assert.deepEqual(await runReanchorHooks(VAULT, undefined, NEXT), outcome({ moved: 1 }))
  } finally {
    stopFirst()
    stopSecond()
  }
})

test('a released consumer stops participating', async () => {
  const stop = registerReanchorHook(async () => outcome({ moved: 9 }))
  stop()

  assert.deepEqual(await runReanchorHooks(VAULT, undefined, NEXT), emptyReanchorOutcome())
})

test('emptyReanchorOutcome hands out a fresh object each time', () => {
  // Callers accumulate into it, so a shared frozen constant would let one
  // ingest's totals leak into the next.
  const first = emptyReanchorOutcome()
  first.moved += 1

  assert.deepEqual(emptyReanchorOutcome(), { moved: 0, unchanged: 0, stale: 0, recovered: 0 })
})
