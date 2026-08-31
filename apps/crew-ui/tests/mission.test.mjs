/**
 * The two rules Mission Control must get right without a Host in the room:
 * how a staged preset meets the session it was staged for, and how a dropped
 * connection reads next to a refusal the Host reasoned about.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CREW_PRESET, stageAction } from '../lib/types/client/state/mission-preset.js'
import { transportText } from '../lib/types/client/state/board.js'

const blank = over => ({ id: 'session-1', blank: true, projectionValues: {}, ...over })

test('a staged pick waits for the session it was staged for', () => {
  // Staging happens BEFORE creation, because `startSession()` returns nothing
  // to select against. Until a session is current there is nothing to decide.
  assert.equal(stageAction(undefined), 'wait')
})

test('a blank session on another preset takes the crew composition', () => {
  assert.equal(stageAction(blank()), 'apply')
  assert.equal(stageAction(blank({ projectionValues: { agentPreset: 'standard' } })), 'apply')
})

test('a session already on the crew composition is left alone', () => {
  assert.equal(stageAction(blank({ projectionValues: { agentPreset: CREW_PRESET } })), 'spend')
})

test('a session that has taken a turn is never re-composed', () => {
  // The Host refuses a swap after the first turn — a running mission keeps the
  // composition it began with — so acting here would argue with an answer
  // already given, and would surface a refusal the operator caused nothing of.
  assert.equal(stageAction(blank({ blank: false })), 'spend')
  assert.equal(stageAction({ id: 'session-1' }), 'spend')
})

test('a dropped connection reads like any other failure', () => {
  // A Remote call resolves `ok: false` for a refusal and REJECTS when the
  // connection is gone. Both arms reach the same error line, in the same
  // shape, so an operator never has to tell them apart to know the board is
  // not current.
  assert.equal(
    transportText(new Error('Failed to fetch')),
    'Failed to fetch (transport-failed)',
  )
  assert.equal(transportText('socket hang up'), 'socket hang up (transport-failed)')
})
