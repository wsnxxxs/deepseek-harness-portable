import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_RETRIEVAL_BUDGET_CHARS,
  RETRIEVAL_INTENTS,
  executeRetrievalPlan,
  keyPhrases,
  planRetrieval,
} from '../src/material-retrieval.ts'
import {
  createInitialLearnerState,
  reduceLearnerState,
  type LearnerState,
  type LearnerStateEvent,
  type ObservableLearnerEvent,
} from '../src/learner-state.ts'
import { ingestSource } from '../src/ingest/pipeline.ts'
import { upsertLearnerConcept, type LearnerConceptRecord } from '../src/learner-memory.ts'
import { ensureVaultLayout, type TopicVault } from '../src/topic-vault.ts'
import { slugify } from '../src/ingest/types.ts'

function observation(id: string, summary = `Observed ${id}`): ObservableLearnerEvent {
  return { id, source: 'learner-message', summary, turn: 1 }
}

function apply(state: LearnerState, ...events: LearnerStateEvent[]): LearnerState {
  return events.reduce(reduceLearnerState, state)
}

function withGoal(goal: string, ...events: LearnerStateEvent[]): LearnerState {
  return apply(
    createInitialLearnerState('session-c'),
    { type: 'goal_observed', goal, observation: observation('goal') },
    ...events,
  )
}

describe('key phrases', () => {
  it('keeps CJK runs whole because there is no word boundary to split on', () => {
    expect(keyPhrases('闭包捕获的是变量绑定')).toContain('闭包捕获')
  })

  it('keeps Latin words of substance and drops connectives', () => {
    const phrases = keyPhrases('how the closure captures a binding')
    expect(phrases).toContain('closure')
    expect(phrases).toContain('captures')
    expect(phrases).not.toContain('the')
    expect(phrases).not.toContain('how')
  })

  it('is empty for text with nothing to search on', () => {
    expect(keyPhrases('   ')).toEqual([])
    expect(keyPhrases('the and for')).toEqual([])
  })

  it('falls back to bigrams for a compound too long to appear verbatim', () => {
    // `以为闭包捕获` is six characters; no source says that, but it contains 闭包.
    const phrases = keyPhrases('以为闭包捕获的是值')
    expect(phrases).toContain('闭包')
    expect(phrases.every(phrase => phrase.length <= 4)).toBe(true)
  })

  it('is bounded', () => {
    expect(keyPhrases('alpha beta gamma delta epsilon zeta eta theta').length).toBeLessThanOrEqual(6)
  })
})

describe('planning retrieval from learner state', () => {
  it('plans nothing when the state carries no goal or situation', () => {
    expect(planRetrieval(createInitialLearnerState('s'))).toBeUndefined()
  })

  it('puts a live misconception ahead of everything else', () => {
    const state = apply(
      withGoal('闭包'),
      {
        type: 'assistant_move_observed',
        move: 'question',
        learnerResponseAssessment: 'partial',
        currentMisconception: '以为闭包捕获的是值',
        nextMove: 'repair',
        moveFingerprint: 'closure-value:v1',
        observation: { id: 'm1', source: 'assistant-output', summary: 'Asked for a prediction.', turn: 1 },
      },
    )
    const plan = planRetrieval(state)
    expect(plan?.intent).toBe('counter-evidence')
    expect(plan?.rationale).toContain('currentMisconception')
    // The concept name leads, because terms[0] is what the learner-prior leg
    // searches earlier sessions for.
    expect(plan?.terms[0]).toBe('闭包')
    // The misconception still contributes terms, which is what targets the belief.
    expect(plan?.terms.length).toBeGreaterThan(1)
    expect(plan?.includeLearnerPrior).toBe(true)
  })

  it('asks for a different example once an example-shaped move failed', () => {
    const state = apply(withGoal('closures'), {
      type: 'failed_move_observed',
      failedMove: {
        move: 'worked_example',
        fingerprint: 'closure-counter:v1',
        failureReason: 'not-understood',
        summary: 'The counter example did not land.',
        turn: 1,
      },
      observation: observation('failed-1'),
    })
    const plan = planRetrieval(state)
    expect(plan?.intent).toBe('second-example')
    expect(plan?.rationale).toContain('already failed')
  })

  it('maps a prerequisite gap and a notation gap to their own intents', () => {
    const prerequisite = apply(withGoal('closures'), {
      type: 'gap_observed', gap: 'prerequisite', observation: observation('g1'),
    })
    expect(planRetrieval(prerequisite)?.intent).toBe('prerequisite-backfill')

    const notation = apply(withGoal('closures'), {
      type: 'gap_observed', gap: 'notation', observation: observation('g2'),
    })
    expect(planRetrieval(notation)?.intent).toBe('notation-decode')
  })

  it('falls back to finding where the material states the goal', () => {
    const plan = planRetrieval(withGoal('闭包'))
    expect(plan?.intent).toBe('verbatim-anchor')
    expect(plan?.includeLearnerPrior).toBe(false)
  })

  it('only ever produces an intent from the closed set', () => {
    const plan = planRetrieval(withGoal('closures'))
    expect(RETRIEVAL_INTENTS).toContain(plan?.intent)
  })

  it('carries the anchors already cited this session', () => {
    const state = apply(withGoal('闭包'), {
      type: 'source_anchors_observed',
      anchors: ['guide#第3章 作用域'],
      observation: { id: 'a1', source: 'source-material', summary: 'Cited chapter 3.', turn: 1 },
    })
    expect(planRetrieval(state)?.preferredAnchors).toEqual(['guide#第3章 作用域'])
  })

  it('honors a caller-supplied budget', () => {
    expect(planRetrieval(withGoal('closures'), 1_000)?.budgetChars).toBe(1_000)
    expect(planRetrieval(withGoal('closures'))?.budgetChars).toBe(DEFAULT_RETRIEVAL_BUDGET_CHARS)
  })
})

const GUIDE = [
  '# 指南',
  '',
  '## 第3章 作用域',
  '',
  '作用域决定标识符的可见范围。',
  '',
  '### 3.2 闭包',
  '',
  '闭包捕获的是变量绑定，不是值。这就是 var 循环共享同一个绑定的原因。',
  '',
  '### 3.3 另一个闭包例子',
  '',
  '闭包在异步回调里同样捕获绑定。',
  '',
  '## 第4章 异步',
  '',
  '事件循环按宏任务与微任务调度。',
  '',
].join('\n')

describe('executing a plan against a vault', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-retrieval-'))
    vault = await ensureVaultLayout(root, '指南')
    const input = join(root, 'guide.md')
    await writeFile(input, GUIDE, 'utf8')
    await ingestSource(vault, input)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('retrieves the section that actually addresses the misconception', async () => {
    const state = apply(
      withGoal('闭包'),
      {
        type: 'assistant_move_observed',
        move: 'question',
        learnerResponseAssessment: 'partial',
        currentMisconception: '以为闭包捕获的是值',
        nextMove: 'repair',
        moveFingerprint: 'closure-value:v1',
        observation: { id: 'm1', source: 'assistant-output', summary: 'Asked for a prediction.', turn: 1 },
      },
    )
    const plan = planRetrieval(state)!
    const result = await executeRetrievalPlan(vault, plan, state)

    expect(result.passages.length).toBeGreaterThan(0)
    expect(result.passages[0]?.label).toContain('闭包')
    expect(result.passages[0]?.text).toContain('变量绑定')
    expect(result.passages[0]?.anchor).toContain('guide#')
    expect(result.passages[0]?.matchedTerms.length).toBeGreaterThan(0)
  })

  it('prefers a section the session has not already cited when a second example is needed', async () => {
    const state = apply(
      withGoal('闭包'),
      {
        type: 'failed_move_observed',
        failedMove: {
          move: 'worked_example',
          fingerprint: 'closure-var-loop:v1',
          failureReason: 'not-understood',
          summary: 'The var loop example did not land.',
          turn: 1,
        },
        observation: observation('failed-1'),
      },
      {
        type: 'source_anchors_observed',
        anchors: ['guide#指南 › 第3章 作用域 › 3.2 闭包'],
        observation: { id: 'a1', source: 'source-material', summary: 'Taught from 3.2.', turn: 1 },
      },
    )
    const plan = planRetrieval(state)!
    const result = await executeRetrievalPlan(vault, plan, state)

    // 3.2 was already used and must not be the first thing offered again.
    expect(result.passages[0]?.label).not.toBe('3.2 闭包')
    expect(result.passages.some(passage => passage.label.includes('另一个闭包例子'))).toBe(true)
  })

  it('never spends more than the plan budget', async () => {
    const longInput = join(root, 'long.md')
    await writeFile(longInput, [
      '# Long guide',
      '',
      ...Array.from({ length: 4 }, (_unused, index) => [
        '## Example ' + String(index + 1),
        '',
        '闭包捕获的是变量绑定。'.repeat(20),
        '',
      ].join('\n')),
    ].join('\n'), 'utf8')
    await ingestSource(vault, longInput)

    const state = withGoal('闭包')
    const plan = { ...planRetrieval(state)!, budgetChars: 120 }
    const result = await executeRetrievalPlan(vault, plan, state)
    expect(result.usedChars).toBeLessThanOrEqual(120)
    expect(result.passages.every(passage => passage.text.length <= 120)).toBe(true)
  })

  it('returns nothing rather than something irrelevant', async () => {
    const state = withGoal('量子色动力学')
    const plan = planRetrieval(state)!
    const result = await executeRetrievalPlan(vault, plan, state)
    expect(result.passages).toEqual([])
  })

  it('skips the learner-prior leg with no session query composed', async () => {
    const state = withGoal('闭包')
    const plan = planRetrieval(state)!
    expect((await executeRetrievalPlan(vault, plan, state)).learnerPrior).toEqual([])
  })
})

describe('the learner-prior retrieval leg', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-prior-'))
    vault = await ensureVaultLayout(root, '指南')
    const input = join(root, 'guide.md')
    await writeFile(input, GUIDE, 'utf8')
    await ingestSource(vault, input)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function concept(overrides: Partial<LearnerConceptRecord> = {}): LearnerConceptRecord {
    return {
      conceptSlug: slugify('闭包', 'concept'),
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
      sessionIds: ['earlier-session'],
      ...overrides,
    }
  }

  /** Minimal stand-in for `ctx.sessionQuery.filterEvents`. */
  function sessionQuery(documents: readonly { seq: number; time: number; text: string }[]) {
    const calls: { sessionId: string; filters: unknown }[] = []
    return {
      calls,
      async filterEvents(sessionId: string, filters: unknown) {
        calls.push({ sessionId, filters })
        return documents
      },
    }
  }

  const misconceptionState = (): LearnerState => apply(
    withGoal('闭包'),
    {
      type: 'assistant_move_observed',
      move: 'question',
      learnerResponseAssessment: 'partial',
      currentMisconception: '以为闭包捕获的是值',
      nextMove: 'repair',
      moveFingerprint: 'closure-value:v1',
      observation: { id: 'm1', source: 'assistant-output', summary: 'Asked for a prediction.', turn: 1 },
    },
  )

  it('returns what the learner said in an earlier session about this concept', async () => {
    await upsertLearnerConcept(vault, concept())
    const state = misconceptionState()
    const plan = planRetrieval(state)!
    const query = sessionQuery([
      { seq: 4, time: Date.parse('2026-08-20T10:00:00Z'), text: '我觉得闭包就是把值复制了一份' },
    ])

    const result = await executeRetrievalPlan(vault, plan, state, query)
    expect(result.learnerPrior).toHaveLength(1)
    expect(result.learnerPrior[0]?.text).toContain('复制了一份')
    expect(result.learnerPrior[0]?.sessionId).toBe('earlier-session')
    expect(query.calls[0]?.sessionId).toBe('earlier-session')
  })

  it('scopes the search to user messages only', async () => {
    await upsertLearnerConcept(vault, concept())
    const state = misconceptionState()
    const query = sessionQuery([{ seq: 1, time: 0, text: '闭包是什么' }])
    await executeRetrievalPlan(vault, planRetrieval(state)!, state, query)

    const filters = query.calls[0]?.filters as readonly { kind: string; values?: string[] }[]
    expect(filters.some(filter => filter.kind === 'type' && filter.values?.includes('user/message'))).toBe(true)
  })

  it('never quotes the current session back to itself', async () => {
    await upsertLearnerConcept(vault, concept({ sessionIds: ['session-c'] }))
    const state = misconceptionState()
    const query = sessionQuery([{ seq: 1, time: 0, text: '刚刚说的话' }])
    const result = await executeRetrievalPlan(vault, planRetrieval(state)!, state, query)

    expect(result.learnerPrior).toEqual([])
    expect(query.calls).toHaveLength(0)
  })

  it('is skipped for an intent where past words do not change the move', async () => {
    await upsertLearnerConcept(vault, concept())
    const state = withGoal('闭包')
    const plan = planRetrieval(state)!
    expect(plan.intent).toBe('verbatim-anchor')
    const query = sessionQuery([{ seq: 1, time: 0, text: 'x' }])
    await executeRetrievalPlan(vault, plan, state, query)
    expect(query.calls).toHaveLength(0)
  })

  it('survives an unreadable earlier session', async () => {
    await upsertLearnerConcept(vault, concept())
    const state = misconceptionState()
    const broken = {
      async filterEvents(): Promise<never> { throw new Error('session log is gone') },
    }
    const result = await executeRetrievalPlan(vault, planRetrieval(state)!, state, broken)
    expect(result.learnerPrior).toEqual([])
    // The material legs still produced their passages.
    expect(result.passages.length).toBeGreaterThan(0)
  })

  it('returns nothing when the concept was never stored', async () => {
    const state = misconceptionState()
    const query = sessionQuery([{ seq: 1, time: 0, text: 'x' }])
    const result = await executeRetrievalPlan(vault, planRetrieval(state)!, state, query)
    expect(result.learnerPrior).toEqual([])
  })
})
