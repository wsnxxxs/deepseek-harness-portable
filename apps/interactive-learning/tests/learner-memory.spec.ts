import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_RENDERED_CONCEPTS,
  conceptRecordFromState,
  memoryPathOf,
  parseLearnerConceptRecord,
  readLearnerMemory,
  renderLearnerMemory,
  upsertLearnerConcept,
  writeLearnerMemory,
  type LearnerConceptRecord,
} from '../src/learner-memory.ts'
import {
  createInitialLearnerState,
  reduceLearnerState,
  type LearnerState,
  type LearnerStateEvent,
  type ObservableLearnerEvent,
} from '../src/learner-state.ts'
import { ensureVaultLayout, type TopicVault } from '../src/topic-vault.ts'

function observation(id: string, summary = `Observed ${id}`): ObservableLearnerEvent {
  return { id, source: 'learner-message', summary, turn: 1 }
}

function apply(state: LearnerState, ...events: LearnerStateEvent[]): LearnerState {
  return events.reduce(reduceLearnerState, state)
}

/** A state that has a goal and one piece of observed evidence. */
function taughtState(goal: string, sessionId = 'session-1'): LearnerState {
  return apply(
    createInitialLearnerState(sessionId),
    { type: 'goal_observed', goal, observation: observation('goal') },
    {
      type: 'learner_evidence_observed',
      evidence: {
        kind: 'explanation',
        summary: 'Explained closures as captured bindings.',
        confidence: 'medium',
        correctness: 'correct',
        justification: 'Named the binding, not the value, without a hint.',
        independence: 'independent',
      },
      observation: observation('evidence-1'),
    },
  )
}

function record(overrides: Partial<LearnerConceptRecord> = {}): LearnerConceptRecord {
  return {
    conceptSlug: 'closures',
    label: '闭包',
    mastery: 'emerging',
    masteryBasis: 'evidence',
    phase: 'teach',
    gap: 'concept',
    misconceptions: [],
    anchors: [],
    staleAnchors: [],
    evidenceCount: 1,
    due: null,
    updatedAt: '2026-08-20T00:00:00.000Z',
    sessionIds: ['session-1'],
    ...overrides,
  }
}

describe('projecting learner state into a durable concept record', () => {
  it('produces nothing for a state with no goal', () => {
    expect(conceptRecordFromState(createInitialLearnerState('s'), 's')).toBeUndefined()
  })

  it('produces nothing for an unseen concept with no evidence', () => {
    const state = apply(createInitialLearnerState('s'), {
      type: 'goal_observed', goal: '闭包', observation: observation('goal'),
    })
    expect(conceptRecordFromState(state, 's')).toBeUndefined()
  })

  it('carries the observed mastery, its basis, and the session it came from', () => {
    const projected = conceptRecordFromState(taughtState('闭包'), 'session-1')
    expect(projected?.label).toBe('闭包')
    expect(projected?.conceptSlug).toContain('闭包')
    expect(projected?.evidenceCount).toBe(1)
    expect(projected?.masteryBasis).toBe('evidence')
    expect(projected?.sessionIds).toEqual(['session-1'])
    expect(projected?.due).toBeNull()
  })
})

describe('vault learner memory', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-memory-'))
    vault = await ensureVaultLayout(root, '主题')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('is empty before anything is stored', async () => {
    expect((await readLearnerMemory(vault)).concepts).toEqual([])
  })

  it('round-trips a concept across a fresh read', async () => {
    await upsertLearnerConcept(vault, record())
    const memory = await readLearnerMemory(vault)
    expect(memory.concepts).toHaveLength(1)
    expect(memory.concepts[0]?.label).toBe('闭包')
  })

  it('does not let a later orientation turn erase observed mastery', async () => {
    await upsertLearnerConcept(vault, record({ mastery: 'transfer', evidenceCount: 4 }))
    await upsertLearnerConcept(vault, record({
      mastery: 'unseen',
      evidenceCount: 0,
      updatedAt: '2026-08-25T00:00:00.000Z',
    }))
    const memory = await readLearnerMemory(vault)
    expect(memory.concepts[0]?.mastery).toBe('transfer')
    expect(memory.concepts[0]?.evidenceCount).toBe(4)
  })

  it('honors an explicit learner correction that lowers mastery', async () => {
    await upsertLearnerConcept(vault, record({ mastery: 'transfer' }))
    await upsertLearnerConcept(vault, record({
      mastery: 'emerging',
      masteryBasis: 'user-correction',
      updatedAt: '2026-08-25T00:00:00.000Z',
    }))
    expect((await readLearnerMemory(vault)).concepts[0]?.mastery).toBe('emerging')
  })

  it('unions anchors and misconceptions across sessions', async () => {
    await upsertLearnerConcept(vault, record({
      anchors: ['js-guide#第3章'], misconceptions: ['以为捕获的是值'],
    }))
    await upsertLearnerConcept(vault, record({
      anchors: ['js-guide#第4章'],
      misconceptions: ['以为闭包会泄漏'],
      sessionIds: ['session-2'],
      updatedAt: '2026-08-25T00:00:00.000Z',
    }))
    const stored = (await readLearnerMemory(vault)).concepts[0]!
    expect(stored.anchors).toEqual(['js-guide#第4章', 'js-guide#第3章'])
    expect(stored.misconceptions).toHaveLength(2)
    expect(stored.sessionIds).toEqual(['session-2', 'session-1'])
  })

  it('keeps two different concepts apart', async () => {
    await upsertLearnerConcept(vault, record())
    await upsertLearnerConcept(vault, record({ conceptSlug: 'event-loop', label: '事件循环' }))
    expect((await readLearnerMemory(vault)).concepts).toHaveLength(2)
  })

  it('survives a hand-edited memory file by dropping only the bad rows', async () => {
    await writeLearnerMemory(vault, {
      protocol: 'dsh-learning-memory@1',
      concepts: [record(), record({ conceptSlug: 'x', label: '' })],
    })
    // The empty-label row is unusable; the good one must still load.
    expect((await readLearnerMemory(vault)).concepts).toHaveLength(1)
  })

  it('treats an unparsable memory file as empty rather than failing', async () => {
    await writeFile(memoryPathOf(vault), '{ not json', 'utf8')
    expect((await readLearnerMemory(vault)).concepts).toEqual([])
  })
})

describe('validating a stored record', () => {
  it('rejects a record with no usable identity', () => {
    expect(parseLearnerConceptRecord({ label: '闭包' })).toBeUndefined()
    expect(parseLearnerConceptRecord({ conceptSlug: 'c', label: 'x', mastery: 'wizard' })).toBeUndefined()
  })

  it('repairs out-of-vocabulary secondary fields instead of dropping the record', () => {
    const parsed = parseLearnerConceptRecord({
      conceptSlug: 'c', label: 'x', mastery: 'emerging', phase: 'nonsense', gap: 'nonsense',
    })
    expect(parsed?.phase).toBe('orient')
    expect(parsed?.gap).toBe('unknown')
  })
})

describe('rendering prior learning into the prompt', () => {
  it('renders nothing when the vault has no memory', () => {
    expect(renderLearnerMemory({ protocol: 'dsh-learning-memory@1', concepts: [] })).toBe('')
  })

  it('frames memory as an earlier-session prior, not as present evidence', () => {
    const text = renderLearnerMemory(
      { protocol: 'dsh-learning-memory@1', concepts: [record()] },
      { title: 'JS 学习' },
    )
    expect(text).toContain('Prior learning in JS 学习')
    expect(text).toContain('EARLIER sessions, not this turn')
    expect(text).toContain('never cite it as evidence the learner produced now')
    expect(text).toContain('闭包 — emerging')
  })

  it('marks a learner-corrected value so it is not re-litigated', () => {
    const text = renderLearnerMemory({
      protocol: 'dsh-learning-memory@1',
      concepts: [record({ masteryBasis: 'user-correction' })],
    })
    expect(text).toContain('(learner-corrected)')
  })

  it('bounds the block and says how much it left out', () => {
    const concepts = Array.from({ length: MAX_RENDERED_CONCEPTS + 5 }, (_unused, index) =>
      record({ conceptSlug: `c-${index}`, label: `概念 ${index}` }))
    const text = renderLearnerMemory({ protocol: 'dsh-learning-memory@1', concepts })
    const rows = text.split('\n').filter(line => line.startsWith('- 概念'))
    expect(rows).toHaveLength(MAX_RENDERED_CONCEPTS)
    expect(text).toContain('and 5 more concepts')
  })

  it('puts a due concept ahead of a merely recent one', () => {
    const text = renderLearnerMemory({
      protocol: 'dsh-learning-memory@1',
      concepts: [
        record({ conceptSlug: 'recent', label: '最近', updatedAt: '2026-08-26T00:00:00.000Z' }),
        record({ conceptSlug: 'due', label: '到期', due: '2026-08-01' }),
      ],
    })
    expect(text.indexOf('到期')).toBeLessThan(text.indexOf('最近'))
  })
})
