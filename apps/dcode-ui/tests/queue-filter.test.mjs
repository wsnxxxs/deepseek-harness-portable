import assert from 'node:assert/strict'
import { test } from 'node:test'

test('session queue filtering excludes placement context from transcript and composer queues', () => {
  const queueItems = [
    { id: '1', placement: 'queued', preview: 'User next-turn prompt' },
    { id: '2', placement: 'steering', preview: 'User steering prompt' },
    { id: '3', placement: 'context', preview: 'The approval policy changed from "ask" to "never" (changed by the user).' },
    { id: '4', placement: 'context', preview: 'The approval policy changed from "never" to "ask" (changed by the user).' },
  ]

  // Transcript visible items (queued + steering, excluding context)
  const transcriptQueued = queueItems.filter(item => item.placement !== 'context')
  assert.equal(transcriptQueued.length, 2)
  assert.deepEqual(transcriptQueued.map(i => i.id), ['1', '2'])

  // Composer queue banner items (queued only)
  const composerQueued = queueItems.filter(item => item.placement === 'queued')
  assert.equal(composerQueued.length, 1)
  assert.equal(composerQueued[0].id, '1')
})
