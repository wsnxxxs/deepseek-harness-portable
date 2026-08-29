import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import UserQuestionService, { type AskUserQuestionAnswer, type AskUserQuestionRequestEvent } from '@deepseek-ai/dsh-user-questions'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { LearningActivityBroker } from '../src/broker.ts'
import * as learningAgent from '../src/agent.ts'
import {
  CHECKPOINT_PROTOCOL,
  CHECKPOINT_RESULT_PROTOCOL,
  VISUAL_PROTOCOL_V4,
  VISUAL_RESULT_PROTOCOL_V4,
  type LearningCheckpointResultV1,
  type LearningCheckpointV1,
} from '../src/protocol.ts'
import { decodeLearningCheckpointDetail } from '../src/transport.ts'
import {
  LEARNER_STATE_EVENT_PROTOCOL,
  LEARNER_STATE_SESSION_EVENT_TYPE,
  LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE,
} from '../src/learner-state.ts'
import { visualV4Catalog } from './fixtures.ts'

export const testToolSignal = new AbortController().signal

/**
 * Register one answerer on the alpha.1 `user-questions/request` waterfall.
 *
 * The specs were written against the retired `userQuestions.registerProvider`;
 * this keeps that call shape so the harness states what it is stubbing rather
 * than repeating the waterfall wiring at every call site.
 */
export function registerProvider(
  ctx: Context,
  provider: { ask: (request: AskUserQuestionRequestEvent) => Promise<AskUserQuestionAnswer> | AskUserQuestionAnswer },
): void {
  ctx.on('user-questions/request', async request => provider.ask(request))
}

export function stubAgent(id: string, events: readonly unknown[] = []): Agent {
  const agentId = id as Agent['id']
  // Host evidence now requires a real user turn. Seed one compact turn for
  // unit-test agents; individual route tests append later turns when they
  // exercise refresh/claim sequencing.
  const log = [
    { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
    {
      type: 'user/message', seq: 1, time: 1,
      data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'test input' }] },
    },
    { type: 'turn/end', seq: 2, time: 2, data: { turn: 1, reason: { kind: 'success' } } },
    ...events,
  ] as Array<{ type: string; seq: number; time: number; data: unknown }>
  const session = {
    id: agentId,
    header: { delegationDepth: 0 },
    get events() { return Object.freeze([...log]) },
    append(type: string, data: unknown) {
      const event = Object.freeze({ type, seq: log.length, time: Date.now(), data: structuredClone(data) })
      log.push(event)
      return event
    },
  }
  return {
    id: agentId,
    session,
  } as unknown as Agent
}

export function checkpoint(overrides: Partial<LearningCheckpointV1> = {}): LearningCheckpointV1 {
  return {
    protocol: CHECKPOINT_PROTOCOL,
    kind: 'prediction',
    prompt: 'Predict which queue item leaves next and explain why.',
    context: 'The queue currently contains A, B, C in that order.',
    expectedEvidence: 'prediction',
    fallbackMarkdown: 'Reply in the ordinary conversation with the next item and your reason.',
    ...overrides,
  }
}

export function checkpointCall(callId: string, step = 1): unknown {
  return {
    type: 'tool/call', seq: step, time: step,
    data: { turn: 1, step, callId, name: 'learning_checkpoint', arguments: '{}' },
  }
}

export function registerRoot(ctx: Context, agent: Agent): void {
  ctx.agents.register(agent)
}

export function appendRealUserTurn(agent: Agent, turn: number): void {
  const session = agent.session as unknown as { append(type: string, data: unknown): unknown }
  session.append('turn/start', { turn })
  session.append('user/message', {
    role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: `turn ${String(turn)}` }],
  })
  session.append('turn/end', { turn, reason: { kind: 'success' } })
}

export async function selectVisual(ctx: Context, kind: string, agent?: Agent, callId = `select-visual-${kind}`): Promise<void> {
  const result = await ctx.tools.execute({
    signal: testToolSignal,
    callId: ToolCallId(callId),
    name: 'learning_visual_select',
    arguments: {
      kind,
      purpose: `Make the ${kind} relationship concrete.`,
      learnerAction: `Inspect the ${kind} relationship and name one change you notice.`,
    },
    ...(agent === undefined ? {} : { agent }),
  })
  expect(result.isError, JSON.stringify(result)).toBe(false)
}

export async function runCheckpoint(
  ctx: Context,
  agent: Agent,
  callId = 'run-checkpoint',
  overrides: Partial<LearningCheckpointV1> = {},
): Promise<void> {
  const result = await ctx.tools.execute({
    signal: testToolSignal,
    callId: ToolCallId(callId),
    name: 'learning_checkpoint',
    arguments: { ...checkpoint(overrides) },
    agent,
  })
  expect(result.isError, JSON.stringify(result)).toBe(false)
}

export function answerFor(
  request: AskUserQuestionRequestEvent,
  status: LearningCheckpointResultV1['status'],
  options: { response?: { text: string }; receiptId?: string; draftRecovered?: boolean } = {},
): { answers: Array<{ id: string; selected: string[]; custom: string }> } {
  const question = request.questions[0]!
  const envelope = decodeLearningCheckpointDetail(question.detail)
  if (envelope === undefined) throw new Error('missing checkpoint envelope')
  const result = status === 'submitted'
    ? {
        protocol: CHECKPOINT_RESULT_PROTOCOL,
        checkpointId: envelope.checkpointId,
        status,
        response: options.response ?? { text: 'B leaves first because the queue is FIFO.' },
        receiptId: options.receiptId ?? 'receipt-checkpoint',
      }
    : {
        protocol: CHECKPOINT_RESULT_PROTOCOL,
        checkpointId: envelope.checkpointId,
        status,
        reason: status === 'skipped' ? 'learner-skipped' : 'learner-cancelled',
        receiptId: options.receiptId ?? `receipt-${status}`,
      }
  const custom = options.draftRecovered === undefined
    ? result
    : { checkpointResult: result, clientMeta: { draftRecovered: options.draftRecovered } }
  return { answers: [{ id: question.id, selected: [], custom: JSON.stringify(custom) }] }
}

export async function setupBroker(richClient: boolean) {
  const ctx = new Context()
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(UserQuestionService)
  if (richClient) {
    ctx.provide('clientModules', {
      graph: () => ({ rev: 'test', entries: [{ id: '@dsh-portable/interactive-learning', url: '/client.js', rev: 'x' }] }),
    } as never)
  }
  await ctx.plugin(LearningActivityBroker)
  return ctx
}
