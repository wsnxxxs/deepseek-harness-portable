import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import { LearningActivityBroker } from '../src/broker.ts'
import {
  RECALL_FEEDBACK_PROTOCOL_V1,
  parseLearningRecallFeedbackV1,
} from '../src/protocol.ts'

function stubAgent(id: string): Agent {
  const log: Array<{ type: string; seq: number; time: number; data: unknown }> = [
    { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
    {
      type: 'user/message', seq: 1, time: 1,
      data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Review this recall deck.' }] },
    },
    { type: 'turn/end', seq: 2, time: 2, data: { turn: 1, reason: { kind: 'success' } } },
  ]
  const session = {
    id,
    header: { delegationDepth: 0 },
    snapshotEvents() { return Object.freeze([...log]) },
    append(type: string, data: unknown) {
      const event = Object.freeze({ type, seq: log.length, time: Date.now(), data: structuredClone(data) })
      log.push(event)
      return event
    },
  }
  return { id, session } as unknown as Agent
}

async function setup(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(UserQuestionService)
  ctx.provide('clientModules', {
    graph: () => ({ rev: 'test', entries: [{ id: '@dsh-portable/interactive-learning', url: '/client.js', rev: 'x' }] }),
  } as never)
  await ctx.plugin(LearningActivityBroker)
  return ctx
}

describe('RecallDeck Host feedback', () => {
  it('accepts the real Connection handler shape and returns an observable result', async () => {
    const ctx = new Context()
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(UserQuestionService)
    ctx.provide('clientModules', {
      graph: () => ({ rev: 'test', entries: [{ id: '@dsh-portable/interactive-learning', url: '/client.js', rev: 'x' }] }),
    } as never)
    let handler: ((endpoint: string, payload: unknown, signal: AbortSignal) => Promise<unknown>) | undefined
    ctx.provide('connection', {
      rpc: {
        handle: (_channel: string, next: typeof handler, _options: unknown) => {
          handler = next
          return async () => {}
        },
      },
    } as never)
    await ctx.plugin(LearningActivityBroker)
    expect(handler).toBeDefined()

    const agent = stubAgent('rpc-session')
    ctx.learningActivities.recordVisual(agent, 'visual-call')
    const payload = parseLearningRecallFeedbackV1({
      protocol: RECALL_FEEDBACK_PROTOCOL_V1,
      sessionId: 'rpc-session',
      callId: 'visual-call',
      cardId: 'card_rpc',
      status: 'mastered',
    })
    const result = await handler!('recall/feedback', payload, new AbortController().signal) as {
      ok: boolean
      value?: { status?: string; observationId?: string }
    }
    expect(result).toMatchObject({ ok: true, value: { status: 'recorded' } })
    expect(result.value?.observationId).toContain('recall:')
    expect(ctx.learningActivities.learnerState(agent).evidence.at(-1)?.summary).toContain('card_rpc')

    const probe = await handler!('vault/probe', { cwd: 'C:\\missing-learning-vault' }, new AbortController().signal) as {
      ok: boolean
      value?: { vault?: boolean }
      error?: { message?: string }
    }
    expect(probe).toMatchObject({ ok: true, value: { vault: false } })
    expect(probe.error).toBeUndefined()
  })

  it('records self-ratings as unverified evidence and makes retries idempotent', async () => {
    const ctx = await setup()
    const agent = stubAgent('recall-session')
    expect(ctx.learningActivities.recordVisual(agent, 'visual-call')).toBe('ready')
    const feedback = parseLearningRecallFeedbackV1({
      protocol: RECALL_FEEDBACK_PROTOCOL_V1,
      sessionId: 'recall-session',
      callId: 'visual-call',
      cardId: 'gradient_card',
      status: 'review',
    })

    const first = ctx.learningActivities.recordRecallFeedback(feedback)
    expect(first.status).toBe('recorded')
    const state = ctx.learningActivities.learnerState(agent)
    expect(state.mastery).toBe('unseen')
    expect(state.evidence.at(-1)).toMatchObject({
      kind: 'attempt',
      correctness: 'unknown',
      independence: 'unknown',
      confidence: 'low',
    })
    expect(state.evidence.at(-1)?.summary).toContain('gradient_card')
    expect(ctx.learningActivities.learnerStateTranscript(agent)).toContain('gradient_card')
    const revision = state.revision

    const replay = ctx.learningActivities.recordRecallFeedback(feedback)
    expect(replay.status).toBe('recorded')
    expect(ctx.learningActivities.learnerState(agent).revision).toBe(revision)
  })

  it('does not accept feedback for a different or inactive session', async () => {
    const ctx = await setup()
    const agent = stubAgent('known-session')
    ctx.learningActivities.recordVisual(agent, 'visual-call')
    const feedback = parseLearningRecallFeedbackV1({
      protocol: RECALL_FEEDBACK_PROTOCOL_V1,
      sessionId: 'unknown-session',
      callId: 'visual-call',
      cardId: 'card_a',
      status: 'mastered',
    })
    expect(ctx.learningActivities.recordRecallFeedback(feedback)).toEqual({
      status: 'ignored',
      reason: 'session-unavailable',
    })
    expect(ctx.learningActivities.learnerState(agent).evidence).toHaveLength(0)
  })

  it('ignores an in-flight feedback call after the broker is disposed', async () => {
    const ctx = await setup()
    const broker = ctx.learningActivities
    const agent = stubAgent('disposed-session')
    broker.recordVisual(agent, 'visual-call')
    const feedback = parseLearningRecallFeedbackV1({
      protocol: RECALL_FEEDBACK_PROTOCOL_V1,
      sessionId: 'disposed-session',
      callId: 'visual-call',
      cardId: 'card_a',
      status: 'review',
    })

    await ctx.fiber.dispose()
    expect(broker.recordRecallFeedback(feedback)).toEqual({
      status: 'ignored',
      reason: 'session-unavailable',
    })
  })
})
