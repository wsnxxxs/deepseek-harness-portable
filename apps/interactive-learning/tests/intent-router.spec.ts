import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { describe, expect, it } from 'vitest'
import {
  classifyLearningIntentSemantically,
  parseLearningIntentModelOutput,
} from '../src/intent-router.ts'
import { routeLearningRequest, routeLearningTurn } from '../src/teaching-route.ts'

function modelContext(output: string): Context {
  const llm = {
    stream: () => (async function* () {
      yield { type: 'text-delta', index: 0, text: output }
      yield { type: 'finish', reason: { kind: 'stop' } }
    })(),
  }
  return {
    get(name: string) {
      return name === 'llm' ? llm : undefined
    },
  } as unknown as Context
}

function routedAgent(): Agent {
  return {
    options: { provider: 'mock', model: 'mock' },
    session: { id: 'intent-router-test' },
  } as unknown as Agent
}

describe('low-confidence semantic intent routing', () => {
  it('accepts a plain JSON response and a fenced JSON response', () => {
    expect(parseLearningIntentModelOutput(
      '{"intent":"learn","route":"teach-minimum","confidence":"medium"}',
    )).toEqual({ intent: 'learn', route: 'teach-minimum', confidence: 'medium' })
    expect(parseLearningIntentModelOutput(
      '```json\n{"intent":"not-learn","route":"direct","confidence":"high"}\n```',
    )).toEqual({ intent: 'not-learn', route: 'direct', confidence: 'high' })
    expect(parseLearningIntentModelOutput('{"intent":"maybe"}')).toBeUndefined()
  })

  it('turns a semantic result into a Host route override', async () => {
    const override = await classifyLearningIntentSemantically(
      modelContext('{"intent":"learn","route":"teach-minimum","confidence":"high"}'),
      routedAgent(),
      'blue whale',
    )
    expect(override).toMatchObject({
      route: 'teach-minimum',
      intent: {
        intent: 'learn',
        trigger: 'model-classification',
        confidence: 'medium',
      },
    })
    expect(routeLearningRequest('blue whale', override)).toMatchObject({
      route: 'teach-minimum',
      reason: 'model-classification',
      intent: { intent: 'learn' },
    })
  })

  it('falls back when the model explicitly marks the request ambiguous', async () => {
    const override = await classifyLearningIntentSemantically(
      modelContext('{"intent":"ambiguous","confidence":"low"}'),
      routedAgent(),
      'blue whale',
    )
    expect(override).toBeUndefined()
  })

  it('lets a refined bare topic start a new active segment', () => {
    const first = routeLearningTurn('Teach me queues.')
    expect(routeLearningTurn('SVM', { active: true, decision: first }, {
      intent: {
        intent: 'learn',
        trigger: 'model-classification',
        confidence: 'medium',
        reason: 'semantic model identified a learning goal',
      },
      route: 'teach-minimum',
    })).toMatchObject({
      route: 'teach-minimum',
      inherited: false,
      segment: 'active',
    })
  })
})
