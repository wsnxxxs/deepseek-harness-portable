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
import {
  answerFor,
  appendRealUserTurn,
  checkpoint,
  checkpointCall,
  registerProvider,
  registerRoot,
  runCheckpoint,
  selectVisual,
  setupBroker,
  stubAgent,
  testToolSignal,
} from './broker-setup.ts'

/**
 * Broker behaviour itself: the compatibility boundary it must not cross, the
 * non-blocking v4.1 agent contract, and checkpoint presentation. Learner-state
 * Host wiring lives in learner-state-host-wiring.spec.ts.
 */
describe('LearningActivityBroker compatibility boundary', () => {
  it('registers no global tool or prompt from the Host entry', async () => {
    const ctx = new Context()
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(UserQuestionService)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    const toolsBefore = ctx.tools.schemas().map(tool => tool.name)
    const promptBefore = await ctx.systemPrompt.assemble()
    await ctx.plugin(LearningActivityBroker)
    expect(ctx.tools.schemas().map(tool => tool.name)).toEqual(toolsBefore)
    expect(await ctx.systemPrompt.assemble()).toEqual(promptBefore)
  })
})

describe('non-blocking Learning Agent v4.1', () => {
  it('requires a supplied PDF to be indexed before direct page inspection', async () => {
    const ctx = await setupBroker(false)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)
    const agent = stubAgent('pdf-visual-gate')
    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'pdf-visual-gate-message',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: '教我这份 PDF' }],
      },
      turn: 1,
    } as never)

    const denied = await ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('pdf-visual-gate-call'),
      name: 'view_image',
      arguments: { path: 'C:/tmp/lesson.pdf', page: 1 },
      agent,
    })
    expect(denied.isError).toBe(true)
    expect(JSON.stringify(denied.content)).toContain('index the supplied PDF')
  })

  it('applies the deterministic route to the production prompt surface', async () => {
    const ctx = await setupBroker(true)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)
    const agent = stubAgent('turn-route')
    const disposeAgent = ctx.agents.register(agent)

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'ordinary-route-message',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Translate this paragraph into Chinese.' }],
      },
      turn: 1,
    } as never)
    const ordinary = await ctx.systemPrompt.assemble({ scope: agent, agent })
    // An ordinary turn keeps the standing policy and loses only the tools.
    expect(ordinary.sections.some(section => section.name === 'learning:policy')).toBe(true)
    expect(ordinary.contexts.find(context => context.name === 'learning:turn-route')?.text)
      .toContain('intent=not-learn; route=direct')
    expect(ordinary.tools.some(tool => tool.name.startsWith('learning_'))).toBe(false)
    const denied = await ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('ordinary-route-learning-tool'),
      name: 'learning_visual_select',
      arguments: {
        kind: 'plot',
        purpose: 'This should not run on an ordinary turn.',
        learnerAction: 'This should not run on an ordinary turn.',
      },
      agent,
    })
    expect(denied.isError).toBe(true)
    expect(JSON.stringify(denied.content)).toContain('ordinary turn')

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'learning-route-message',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Walk me through monads.' }],
      },
      turn: 2,
    } as never)
    const learning = await ctx.systemPrompt.assemble({ scope: agent, agent })
    expect(learning.sections.some(section => section.name === 'learning:policy')).toBe(true)
    expect(learning.tools.some(tool => tool.name === 'learning_visual_select')).toBe(false)
    expect(learning.tools.some(tool => tool.name === 'learning_checkpoint')).toBe(false)
    expect(learning.tools.some(tool => tool.name === 'learning_state_update')).toBe(true)
    expect(learning.contexts.find(context => context.name === 'learning:turn-route')?.text)
      .toContain('route=calibrate')
    expect(learning.contexts.find(context => context.name === 'learning:turn-route')?.text)
      .toContain('Give one tiny useful foothold')

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'learning-follow-up-answer',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'A.' }],
      },
      turn: 3,
    } as never)
    const inherited = await ctx.systemPrompt.assemble({ scope: agent, agent })
    expect(inherited.sections.some(section => section.name === 'learning:policy')).toBe(true)
    expect(inherited.contexts.find(context => context.name === 'learning:turn-route')?.text)
      .toMatch(/route=continue; reason=active-segment/)
    expect(inherited.tools.some(tool => tool.name === 'learning_visual_select')).toBe(true)
    expect(inherited.tools.some(tool => tool.name === 'learning_checkpoint')).toBe(true)

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'ordinary-route-switch',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Implement a queue in TypeScript.' }],
      },
      turn: 4,
    } as never)
    const switched = await ctx.systemPrompt.assemble({ scope: agent, agent })
    expect(switched.sections.some(section => section.name === 'learning:policy')).toBe(true)
    expect(switched.tools.some(tool => tool.name.startsWith('learning_'))).toBe(false)
    expect(switched.contexts.find(context => context.name === 'learning:turn-route')?.text)
      .toContain('intent=not-learn; route=direct')
    expect(ctx.learningActivities.learningSegmentActive(agent)).toBe(false)
    expect(agent.session.snapshotEvents().at(-1)).toMatchObject({
      type: 'learning/segment',
      data: { route: 'learn', segment: 'closed', turn: 4 },
    })

    disposeAgent()
  })

  it('restores an active learning route from durable learner state', async () => {
    const ctx = await setupBroker(true)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)
    const agent = stubAgent('restored-turn-route')
    const disposeAgent = ctx.agents.register(agent)

    ctx.learningActivities.updateLearnerState({
      action: 'update',
      agent,
      expectedRevision: 0,
      event: {
        type: 'goal_observed',
        goal: 'Understand FIFO queues',
        observation: {
          id: 'restored-route-goal',
          source: 'learner-message',
          summary: 'The learner asked to understand FIFO queues before the session resumed.',
        },
      },
    })
    ctx.learningActivities.recordLearningSegmentAnchor(agent, 1)
    appendRealUserTurn(agent, 2)

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'restored-route-answer',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Continue explaining FIFO queues.' }],
      },
      turn: 2,
    } as never)
    const resumed = await ctx.systemPrompt.assemble({ scope: agent, agent })
    expect(resumed.sections.some(section => section.name === 'learning:policy')).toBe(true)
    expect(resumed.contexts.find(context => context.name === 'learning:turn-route')?.text)
      .toMatch(/route=continue; reason=active-segment/)

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'restored-route-task-switch',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Calculate 2+2.' }],
      },
      turn: 3,
    } as never)
    const switched = await ctx.systemPrompt.assemble({ scope: agent, agent })
    expect(switched.sections.some(section => section.name === 'learning:policy')).toBe(true)
    expect(switched.tools.some(tool => tool.name.startsWith('learning_'))).toBe(false)
    expect(switched.contexts.find(context => context.name === 'learning:turn-route')?.text)
      .toContain('intent=not-learn; route=direct')

    disposeAgent()
  })

  it('allows only one rich teaching move per user turn and resets the choice on the next learner message', async () => {
    const ctx = await setupBroker(true)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)
    const agent = stubAgent('rich-move-budget', [checkpointCall('checkpoint-on-next-turn', 2)])
    const disposeAgent = ctx.agents.register(agent)

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'rich-move-learning-message',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Help me understand why gradient descent works.' }],
      },
      turn: 1,
    } as never)
    await selectVisual(ctx, 'plot', agent)

    const selected = checkpoint()
    const denied = await ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('checkpoint-after-visual'),
      name: 'learning_checkpoint',
      arguments: { ...selected },
      agent,
    })
    expect(denied.isError).toBe(true)
    expect(JSON.stringify(denied.content)).toContain('not both')

    ctx.emit('agent/inbox/claimed', {
      agent,
      message: {
        id: 'rich-move-next-message',
        role: 'user',
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Now test my prediction.' }],
      },
      turn: 2,
    } as never)
    await runCheckpoint(ctx, agent, 'checkpoint-on-next-turn')

    disposeAgent()
  })

  it('exposes rich tools only when the route and client can use them', async () => {
    const rich = await setupBroker(true)
    await rich.plugin(ToolRuntime)
    await rich.plugin(SystemPrompt)
    await rich.plugin(learningAgent)

    const toolNamesFor = async (id: string, text: string): Promise<string[]> => {
      const agent = stubAgent(id)
      const disposeAgent = rich.agents.register(agent)
      rich.emit('agent/inbox/claimed', {
        agent,
        message: { id: `${id}-message`, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] },
        turn: 1,
      } as never)
      const names = (await rich.systemPrompt.assemble({ scope: agent, agent })).tools.map(tool => tool.name)
      disposeAgent()
      return names
    }

    await expect(toolNamesFor('route-teach', 'What is a queue?')).resolves.toEqual(expect.arrayContaining([
      'learning_visual_select', 'learning_checkpoint', 'learning_state_update',
    ]))
    const overview = await toolNamesFor('route-overview', 'Give me a complete overview of the French Revolution.')
    expect(overview).toContain('learning_visual_select')
    expect(overview).not.toContain('learning_checkpoint')
    const resource = await toolNamesFor('route-resource', 'Make me active-recall flashcards for queues.')
    expect(resource).toContain('learning_visual_select')
    expect(resource).not.toContain('learning_checkpoint')
    const urgent = await toolNamesFor('route-urgent', 'I have 15 minutes. Explain rollback and give me a checklist.')
    expect(urgent).not.toContain('learning_visual_select')
    expect(urgent).not.toContain('learning_checkpoint')

    const plain = await setupBroker(false)
    await plain.plugin(ToolRuntime)
    await plain.plugin(SystemPrompt)
    await plain.plugin(learningAgent)
    const plainAgent = stubAgent('plain-client-route')
    const disposePlain = plain.agents.register(plainAgent)
    plain.emit('agent/inbox/claimed', {
      agent: plainAgent,
      message: {
        id: 'plain-client-message', role: 'user', source: { kind: 'user' },
        content: [{ type: 'text', text: 'What is a queue?' }],
      },
      turn: 1,
    } as never)
    const plainTools = (await plain.systemPrompt.assemble({ scope: plainAgent, agent: plainAgent })).tools.map(tool => tool.name)
    expect(plainTools).toContain('learning_state_update')
    expect(plainTools).not.toContain('learning_visual_select')
    expect(plainTools).not.toContain('learning_checkpoint')
    const uncertainAgent = stubAgent('plain-client-uncertain-route')
    const disposeUncertain = plain.agents.register(uncertainAgent)
    plain.emit('agent/inbox/claimed', {
      agent: uncertainAgent,
      message: {
        id: 'plain-client-uncertain-message', role: 'user', source: { kind: 'user' },
        content: [{ type: 'text', text: 'Could you help with this?' }],
      },
      turn: 1,
    } as never)
    const uncertainAssembly = await plain.systemPrompt.assemble({ scope: uncertainAgent, agent: uncertainAgent })
    expect(uncertainAssembly.contexts.find(item => item.name === 'learning:turn-route')?.text)
      .toContain('Markdown table or compact ASCII structure')
    disposeUncertain()
    disposePlain()
  })

  it('exposes one visual and one optional answer-free checkpoint through closed model schemas', async () => {
    const ctx = await setupBroker(true)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)

    const schemas = ctx.tools.schemas()
    expect(schemas.map(tool => tool.name)).toEqual([
      'learning_material_map',
      'learning_material_read',
      'learning_material_search',
      'learning_material_recall',
      'learning_concept_propose',
      'learning_concept_recall',
      'learning_visual_select',
      'learning_state_update',
      'learning_checkpoint',
    ])
    expect(JSON.stringify(schemas)).not.toContain('learning_question')
    expect(JSON.stringify(schemas)).not.toContain('learning_reveal')
    expect(JSON.stringify(schemas)).not.toContain('"additionalProperties":true')
    const parameters = schemas.find(tool => tool.name === 'learning_visual_select')?.parameters as {
      additionalProperties?: unknown
      properties?: Record<string, unknown>
    }
    expect(parameters.additionalProperties).toBe(false)
    expect(Object.keys(parameters.properties ?? {}).sort()).toEqual([
      'kind', 'learnerAction', 'pairedQuestion', 'purpose',
    ])
    expect(schemas.find(tool => tool.name === 'learning_visual_select')?.description)
      .toContain('only output of the selector step')
    expect(JSON.stringify(parameters.properties?.kind)).toContain('plot=quantitative axes')
    expect(JSON.stringify(parameters.properties?.kind)).toContain('causal_loop=signed feedback')
    expect(JSON.stringify(parameters)).not.toContain('2 to 48 nodes')

    const missingSemanticConstraint = await ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('select-visual-missing-constraint'),
      name: 'learning_visual_select',
      arguments: { kind: 'plot', purpose: 'Show the relationship.' },
    })
    expect(missingSemanticConstraint.isError).toBe(true)
    expect(JSON.stringify(missingSemanticConstraint.content)).toContain('learnerAction or pairedQuestion')

    const competingSemanticConstraints = await ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('select-visual-competing-constraints'),
      name: 'learning_visual_select',
      arguments: {
        kind: 'plot', purpose: 'Show one relationship.',
        learnerAction: 'Move the slider.', pairedQuestion: 'What changes?',
      },
    })
    expect(competingSemanticConstraints.isError).toBe(true)
    expect(JSON.stringify(competingSemanticConstraints.content)).toContain('exactly one')

    await selectVisual(ctx, 'node_link')
    const selectedSchemas = ctx.tools.schemas()
    expect(selectedSchemas.map(tool => tool.name)).toEqual([
      'learning_material_map',
      'learning_material_read',
      'learning_material_search',
      'learning_material_recall',
      'learning_concept_propose',
      'learning_concept_recall',
      'learning_visual_select',
      'learning_state_update',
      'learning_checkpoint',
      'learning_visual',
    ])
    const completeSchema = JSON.stringify(selectedSchemas.find(tool => tool.name === 'learning_visual'))
    expect(completeSchema).toContain('2 to 48 nodes')
    expect(completeSchema).not.toContain('1 to 8 series')
    expect(completeSchema).toContain('Make the node_link relationship concrete.')
    expect(completeSchema).toContain('Inspect the node_link relationship and name one change you notice.')

    // One tool carries the whole payload. The five kind branches together are
    // about a thousand characters, so the extra model round trip a selector
    // step costs bought nothing here — unlike the visual tool above, whose
    // fifteen content schemas are why ITS selector stays.
    const checkpointSchema = schemas.find(tool => tool.name === 'learning_checkpoint')
    const checkpointParameters = checkpointSchema?.parameters as {
      additionalProperties?: unknown
      properties?: Record<string, unknown>
      required?: string[]
    }
    expect(checkpointParameters.additionalProperties).toBe(false)
    expect(Object.keys(checkpointParameters.properties ?? {}).sort())
      .toEqual(['context', 'expectedEvidence', 'fallbackMarkdown', 'kind', 'options', 'prompt', 'protocol'].sort())
    // `options` belongs to single_choice alone, so it is offered but not required.
    expect(checkpointParameters.required).not.toContain('options')
    // The answer-free guarantee is the closed schema, not the retired selector:
    // the key set above is exhaustive, so there is no field a correct answer or
    // rubric could be written into.
    expect(checkpointSchema?.description).toContain('not a per-turn ceremony')
    expect(checkpointSchema?.description).toContain('only tool call in its model step')
    expect(JSON.stringify(checkpointParameters.properties?.kind)).toContain('single_choice=one label')
    expect(JSON.stringify(checkpointParameters.properties?.expectedEvidence)).toContain('fresh transfer')
    expect(checkpointSchema?.output).toBeUndefined()

    const stateSchema = schemas.find(tool => tool.name === 'learning_state_update')
    const stateParameters = stateSchema?.parameters as {
      additionalProperties?: unknown
      properties?: Record<string, unknown>
    }
    expect(stateParameters.additionalProperties).toBe(false)
    expect(Object.keys(stateParameters.properties ?? {}).sort()).toEqual([
      'action', 'correction', 'event', 'observation',
    ])
    expect(stateParameters.properties).not.toHaveProperty('expectedRevision')
    expect(stateSchema?.description).toContain('never call mechanically every turn')
    expect(stateSchema?.description).toContain('assistant_move_observed')
    expect(JSON.stringify(stateParameters)).toContain('assistant_move→move')
    expect(ctx.tools.get('learning_state_update')?.presentCall).toBeUndefined()
  })

  it('accepts every catalog fixture, returns ready immediately, and never creates a user-question wait', async () => {
    const ctx = await setupBroker(true)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)
    expect(ctx.learningActivities.pendingCount).toBe(0)

    const ready = { protocol: VISUAL_RESULT_PROTOCOL_V4, status: 'ready' }
    for (const [name, visual] of Object.entries(visualV4Catalog)) {
      await selectVisual(ctx, visual.content.kind, undefined, `select-${name}`)
      const result = await ctx.tools.execute({
        signal: testToolSignal,
        callId: ToolCallId(`visual-${name}`),
        name: 'learning_visual',
        arguments: visual,
      })
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(ready) }],
        isError: false,
        value: ready,
      })
    }
    expect(ctx.learningActivities.pendingCount).toBe(0)
    expect(visualV4Catalog.derivativePlot.protocol).toBe(VISUAL_PROTOCOL_V4)
  })

  it('reports whether the learner can actually see the visual and only then claims the move', async () => {
    for (const richClient of [true, false]) {
      const ctx = await setupBroker(richClient)
      await ctx.plugin(ToolRuntime)
      await ctx.plugin(SystemPrompt)
      await ctx.plugin(learningAgent)
      const agent = stubAgent(`visual-availability-${String(richClient)}`)
      const disposeAgent = ctx.agents.register(agent)
      await selectVisual(ctx, 'plot', agent, `select-availability-${String(richClient)}`)

      const result = await ctx.tools.execute({
        signal: testToolSignal,
        callId: ToolCallId(`availability-${String(richClient)}`),
        name: 'learning_visual',
        arguments: visualV4Catalog.derivativePlot,
        agent,
      })

      expect(result.isError).toBe(false)
      expect(JSON.parse(result.content.map(item => item.type === 'text' ? item.text : '').join(''))).toEqual({
        protocol: VISUAL_RESULT_PROTOCOL_V4,
        status: richClient ? 'ready' : 'unavailable',
      })
      // An unrendered visual is not a teaching move that happened.
      expect(ctx.learningActivities.learnerState(agent).lastMove).toBe(richClient ? 'visual' : 'none')
      disposeAgent()
    }
  })

  it('rejects distinct checkpoint calls in one logged model step but permits an idempotent call replay', async () => {
    const ctx = await setupBroker(false)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)

    const duplicateAgent = stubAgent('duplicate-step', [
      checkpointCall('checkpoint-a'),
      checkpointCall('checkpoint-b'),
    ])
    registerRoot(ctx, duplicateAgent)
    const rejected = await ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('checkpoint-a'),
      name: 'learning_checkpoint',
      arguments: checkpoint(),
      agent: duplicateAgent,
    })
    expect(rejected.isError).toBe(true)
    expect(JSON.stringify(rejected.content)).toContain('at most one learning_checkpoint call')

    const mixedAgent = stubAgent('mixed-step', [
      checkpointCall('checkpoint-mixed'),
      {
        type: 'tool/call', seq: 2, time: 2,
        data: { turn: 1, step: 1, callId: 'state-same-step', name: 'learning_state_update', arguments: '{}' },
      },
    ])
    registerRoot(ctx, mixedAgent)
    const mixed = await ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('checkpoint-mixed'),
      name: 'learning_checkpoint',
      arguments: checkpoint(),
      agent: mixedAgent,
    })
    expect(mixed.isError).toBe(true)
    expect(JSON.stringify(mixed.content)).toContain('only tool call')

    const replayAgent = stubAgent('replay-step', [checkpointCall('checkpoint-replay')])
    registerRoot(ctx, replayAgent)
    const execute = () => ctx.tools.execute({
      signal: testToolSignal,
      callId: ToolCallId('checkpoint-replay'),
      name: 'learning_checkpoint',
      arguments: checkpoint(),
      agent: replayAgent,
    })
    const first = await execute()
    const replay = await execute()
    expect(first.isError).toBe(false)
    expect(replay.value).toEqual(first.value)
    expect((replay.value as LearningCheckpointResultV1).receiptId)
      .toBe((first.value as LearningCheckpointResultV1).receiptId)
  })
})

describe('Learning checkpoint broker', () => {
  it('falls back immediately without a rich Client and replays the stable terminal receipt', async () => {
    const ctx = await setupBroker(false)
    const agent = stubAgent('no-client')
    const request = { checkpoint: checkpoint(), agent, callId: 'no-client-call' }

    const first = await ctx.learningActivities.presentCheckpoint(request)
    const replay = await ctx.learningActivities.presentCheckpoint(request)

    expect(first).toMatchObject({
      protocol: CHECKPOINT_RESULT_PROTOCOL,
      status: 'skipped',
      reason: 'client-unavailable',
    })
    expect(replay).toEqual(first)
    expect(ctx.learningActivities.pendingCount).toBe(0)
  })

  it('maps a terminal single-choice label back to its stable option id', async () => {
    const ctx = await setupBroker(true)
    const agent = stubAgent('terminal-choice-label')
    registerRoot(ctx, agent)
    registerProvider(ctx, {
      ask: async request => ({
        answers: [{
          id: request.questions[0]!.id,
          selected: [],
          // A non-rich provider may return the visible text instead of the
          // JSON result envelope used by the Learning client.
          custom: '  second   answer  ',
        }],
      }),
    })

    const result = await ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint({
        kind: 'single_choice',
        options: [
          { id: 'first', label: 'First answer' },
          { id: 'second', label: 'Second answer' },
        ],
      }),
      agent,
      callId: 'terminal-choice-label-call',
    })

    expect(result).toMatchObject({
      status: 'submitted',
      response: { optionId: 'second' },
    })
  })

  it.each(['submitted', 'skipped', 'cancelled'] as const)(
    'accepts the terminal %s result through exactly one user-result wait',
    async status => {
      const ctx = await setupBroker(true)
      const agent = stubAgent(`terminal-${status}`)
      registerRoot(ctx, agent)
      const ask = vi.fn(async (request: AskUserQuestionRequestEvent) => answerFor(request, status, {
        draftRecovered: status === 'submitted',
      }))
      registerProvider(ctx, { ask })

      const result = await ctx.learningActivities.presentCheckpoint({
        checkpoint: checkpoint(), agent, callId: `call-${status}`,
      })

      expect(result.status).toBe(status)
      expect(result.reason).toBe(status === 'skipped' ? 'learner-skipped' : status === 'cancelled' ? 'learner-cancelled' : undefined)
      expect(ask).toHaveBeenCalledTimes(1)
      expect(ask.mock.calls[0]?.[0].questions).toHaveLength(1)
      expect(ctx.learningActivities.pendingCount).toBe(0)
      const state = ctx.learningActivities.learnerState(agent)
      expect(state.lastMove).toBe('checkpoint')
      expect(state.progressSignal).toBe('unknown')
      expect(ctx.learningActivities.checkpointMetrics(agent)).toMatchObject({
        usageCount: 1,
        kindCounts: { prediction: 1 },
        terminalCounts: { [status]: 1 },
        draftRecovery: { attempts: 1, hits: status === 'submitted' ? 1 : 0 },
      })
      if (status === 'submitted') {
        expect(state.evidence.at(-1)).toMatchObject({
          kind: 'prediction',
          correctness: 'unknown',
          independence: 'unknown',
        })
        expect(state.mastery).toBe('unseen')
        const metricEvents = agent.session.snapshotEvents()
          .filter(event => event.type === LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE)
        expect(metricEvents).toHaveLength(1)
        expect(JSON.stringify(metricEvents)).not.toContain('B leaves first')
        expect(JSON.stringify(metricEvents)).not.toContain('clientMeta')
      } else expect(state.evidence).toEqual([])
    },
  )

  it('records submitted transfer evidence as unevaluated/unknown and never upgrades mastery', async () => {
    const ctx = await setupBroker(true)
    const agent = stubAgent('checkpoint-transfer-unknown')
    registerRoot(ctx, agent)
    registerProvider(ctx, {
      ask: async request => answerFor(request, 'submitted', { receiptId: 'transfer-unknown-receipt' }),
    })

    await ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint({
        kind: 'free_text',
        prompt: 'Apply FIFO to this fresh printer-job case and explain the result.',
        expectedEvidence: 'transfer',
      }),
      agent,
      callId: 'checkpoint-transfer-unknown-call',
    })
    expect(ctx.learningActivities.learnerState(agent)).toMatchObject({
      mastery: 'unseen',
      progressSignal: 'unknown',
      lastMove: 'checkpoint',
      evidence: [{
        kind: 'transfer',
        transferContext: 'unknown',
        correctness: 'unknown',
        independence: 'unknown',
      }],
    })
  })

  it('deduplicates one pending call and rejects altered replay content or a second pending call in the session', async () => {
    const ctx = await setupBroker(true)
    const agent = stubAgent('pending-session')
    registerRoot(ctx, agent)
    let resolveAnswer: ((answer: ReturnType<typeof answerFor>) => void) | undefined
    let seenRequest: AskUserQuestionRequestEvent | undefined
    const ask = vi.fn((request: AskUserQuestionRequestEvent) => {
      seenRequest = request
      return new Promise<ReturnType<typeof answerFor>>(resolve => { resolveAnswer = resolve })
    })
    registerProvider(ctx, { ask })
    const request = { checkpoint: checkpoint(), agent, callId: 'stable-call' }

    const first = ctx.learningActivities.presentCheckpoint(request)
    const replay = ctx.learningActivities.presentCheckpoint(request)
    await expect(ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint({ prompt: 'A changed prompt.' }),
      agent,
      callId: 'stable-call',
    })).rejects.toThrow(/different content/)
    await expect(ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint(),
      agent,
      callId: 'second-call',
    })).rejects.toThrow(/at most one pending learning checkpoint/)

    expect(ask).toHaveBeenCalledTimes(1)
    resolveAnswer?.(answerFor(seenRequest!, 'submitted'))
    const [result, replayed] = await Promise.all([first, replay])
    expect(replayed).toBe(result)
    expect(result.status).toBe('submitted')
  })

  it('allows one pending checkpoint in each of two sessions without crossing terminal results', async () => {
    const ctx = await setupBroker(true)
    const agentA = stubAgent('pending-a')
    const agentB = stubAgent('pending-b')
    registerRoot(ctx, agentA)
    registerRoot(ctx, agentB)
    const pending = new Map<string, {
      request: AskUserQuestionRequestEvent
      resolve(answer: ReturnType<typeof answerFor>): void
    }>()
    const ask = vi.fn((request: AskUserQuestionRequestEvent) => new Promise<ReturnType<typeof answerFor>>(resolve => {
      const envelope = decodeLearningCheckpointDetail(request.questions[0]!.detail)
      if (envelope === undefined) throw new Error('missing checkpoint detail')
      pending.set(envelope.sessionId, { request, resolve })
    }))
    registerProvider(ctx, { ask })

    const resultA = ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint(), agent: agentA, callId: 'pending-a-call',
    })
    const resultB = ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint(), agent: agentB, callId: 'pending-b-call',
    })
    expect(ctx.learningActivities.pendingCount).toBe(2)
    expect(ask).toHaveBeenCalledTimes(2)

    const waitB = pending.get('pending-b')!
    waitB.resolve(answerFor(waitB.request, 'cancelled', { receiptId: 'receipt-pending-b' }))
    const waitA = pending.get('pending-a')!
    waitA.resolve(answerFor(waitA.request, 'submitted', { receiptId: 'receipt-pending-a' }))
    await expect(resultB).resolves.toMatchObject({ status: 'cancelled', receiptId: 'receipt-pending-b' })
    await expect(resultA).resolves.toMatchObject({ status: 'submitted', receiptId: 'receipt-pending-a' })
    expect(ctx.learningActivities.pendingCount).toBe(0)
    expect(ctx.learningActivities.learnerState(agentA).evidence).toHaveLength(1)
    expect(ctx.learningActivities.learnerState(agentB).evidence).toHaveLength(0)
  })

  it('aborts on learner-state reset and rejects a late submission without restoring checkpoint state', async () => {
    const ctx = await setupBroker(true)
    const agent = stubAgent('checkpoint-reset')
    registerRoot(ctx, agent)
    let resolveAnswer: ((answer: ReturnType<typeof answerFor>) => void) | undefined
    let seenRequest: AskUserQuestionRequestEvent | undefined
    registerProvider(ctx, {
      ask(request) {
        seenRequest = request
        return new Promise(resolve => { resolveAnswer = resolve })
      },
    })

    const pending = ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint({ expectedEvidence: 'transfer' }),
      agent,
      callId: 'checkpoint-before-reset',
    })
    expect(ctx.learningActivities.pendingCount).toBe(1)
    const current = ctx.learningActivities.learnerState(agent)
    expect(ctx.learningActivities.updateLearnerState({
      action: 'reset',
      agent,
      expectedRevision: current.revision,
    })).toMatchObject({ status: 'reset' })
    expect(ctx.learningActivities.pendingCount).toBe(0)
    await expect(pending).resolves.toMatchObject({ status: 'cancelled' })

    resolveAnswer?.(answerFor(seenRequest!, 'submitted', { receiptId: 'late-after-reset' }))
    await Promise.resolve()
    expect(ctx.learningActivities.learnerState(agent)).toMatchObject({
      evidence: [],
      lastMove: 'none',
      mastery: 'unseen',
    })
    expect(agent.session.snapshotEvents().filter(event => event.type === 'learning/state')).toHaveLength(1)
    expect(agent.session.snapshotEvents().filter(event => event.type === 'learning/state').at(-1))
      .toMatchObject({ data: { reason: 'reset' } })
  })

  it('fences a disposed checkpoint from a replacement session object reusing the same id', async () => {
    const ctx = await setupBroker(true)
    const original = stubAgent('reused-session-id')
    const disposeOriginal = ctx.agents.register(original)
    let resolveAnswer: ((answer: ReturnType<typeof answerFor>) => void) | undefined
    let seenRequest: AskUserQuestionRequestEvent | undefined
    registerProvider(ctx, {
      ask(request) {
        seenRequest = request
        return new Promise(resolve => { resolveAnswer = resolve })
      },
    })

    const pending = ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint(),
      agent: original,
      callId: 'checkpoint-old-session-object',
    })
    expect(ctx.learningActivities.pendingCount).toBe(1)
    expect(ctx.learningActivities.checkpointCacheSize).toBe(3)
    disposeOriginal()
    expect(ctx.learningActivities.pendingCount).toBe(0)
    expect(ctx.learningActivities.checkpointCacheSize).toBe(0)

    const replacement = stubAgent('reused-session-id')
    const disposeReplacement = ctx.agents.register(replacement)
    await expect(pending).resolves.toMatchObject({ status: 'cancelled' })
    resolveAnswer?.(answerFor(seenRequest!, 'submitted', { receiptId: 'late-old-session-receipt' }))
    await Promise.resolve()

    expect(ctx.learningActivities.learnerState(replacement)).toMatchObject({
      revision: 0,
      evidence: [],
      lastMove: 'none',
    })
    expect(original.session.snapshotEvents().filter(event => event.type === 'learning/state')).toHaveLength(0)
    expect(replacement.session.snapshotEvents().filter(event => event.type === 'learning/state')).toHaveLength(0)

    const replacementPending = ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint(),
      agent: replacement,
      callId: 'checkpoint-old-session-object',
    })
    expect(ctx.learningActivities.pendingCount).toBe(1)
    expect(ctx.learningActivities.checkpointCacheSize).toBe(3)
    ctx.emit('session/disposed', original.session as never)
    expect(ctx.learningActivities.pendingCount).toBe(1)
    expect(ctx.learningActivities.checkpointCacheSize).toBe(3)
    const replacementRequest = seenRequest!
    resolveAnswer?.(answerFor(replacementRequest, 'submitted', { receiptId: 'replacement-session-receipt' }))
    await expect(replacementPending).resolves.toMatchObject({
      status: 'submitted',
      receiptId: 'replacement-session-receipt',
    })
    expect(ctx.learningActivities.learnerState(replacement).evidence).toHaveLength(1)
    expect(ctx.learningActivities.checkpointCacheSize).toBe(2)
    disposeReplacement()
    expect(ctx.learningActivities.checkpointCacheSize).toBe(0)
  })

  it('settles abort and timeout once, then ignores a late submitted response', async () => {
    for (const mode of ['abort', 'timeout'] as const) {
      const ctx = await setupBroker(true)
      const agent = stubAgent(`late-${mode}`)
      registerRoot(ctx, agent)
      let resolveAnswer: ((answer: ReturnType<typeof answerFor>) => void) | undefined
      let seenRequest: AskUserQuestionRequestEvent | undefined
      registerProvider(ctx, {
        ask(request) {
          seenRequest = request
          return new Promise(resolve => { resolveAnswer = resolve })
        },
      })
      const controller = new AbortController()
      const request = {
        checkpoint: checkpoint(),
        agent,
        callId: `late-${mode}`,
        signal: controller.signal,
        timeoutMs: mode === 'timeout' ? 5 : 5_000,
      }
      const pending = ctx.learningActivities.presentCheckpoint(request)
      if (mode === 'abort') controller.abort()
      const terminal = await pending
      expect(terminal).toMatchObject(mode === 'abort'
        ? { status: 'cancelled', reason: 'session-aborted' }
        : { status: 'skipped', reason: 'client-response-timeout' })
      expect(ctx.learningActivities.pendingCount).toBe(0)

      resolveAnswer?.(answerFor(seenRequest!, 'submitted', { receiptId: `late-receipt-${mode}` }))
      await Promise.resolve()
      const replay = await ctx.learningActivities.presentCheckpoint(request)
      expect(replay).toEqual(terminal)
    }
  })

  it('settles plugin disposal once and ignores a late response', async () => {
    const ctx = await setupBroker(true)
    const agent = stubAgent('dispose-pending')
    registerRoot(ctx, agent)
    let resolveAnswer: ((answer: ReturnType<typeof answerFor>) => void) | undefined
    let seenRequest: AskUserQuestionRequestEvent | undefined
    let askCount = 0
    registerProvider(ctx, {
      ask(request) {
        askCount += 1
        if (askCount === 1) {
          return Promise.resolve(answerFor(request, 'submitted', {
            receiptId: 'answer-before-plugin-dispose',
          }))
        }
        seenRequest = request
        return new Promise(resolve => { resolveAnswer = resolve })
      },
    })
    const broker = ctx.learningActivities
    await expect(broker.presentCheckpoint({
      checkpoint: checkpoint(), agent, callId: 'completed-before-dispose',
    })).resolves.toMatchObject({ status: 'submitted' })
    expect(broker.checkpointCacheSize).toBe(2)

    const request = { checkpoint: checkpoint(), agent, callId: 'dispose-call' }
    const pending = broker.presentCheckpoint(request)
    expect(broker.pendingCount).toBe(1)
    expect(broker.checkpointCacheSize).toBe(5)
    const observed = vi.fn()
    broker.observe(observed)

    await ctx.fiber.dispose()
    const terminal = await pending
    expect(terminal).toMatchObject({ status: 'cancelled', reason: 'session-aborted' })
    expect(broker.pendingCount).toBe(0)
    expect(broker.checkpointCacheSize).toBe(0)

    resolveAnswer?.(answerFor(seenRequest!, 'submitted', { receiptId: 'late-after-dispose' }))
    await Promise.resolve()
    expect(terminal.status).toBe('cancelled')
    expect(broker.checkpointCacheSize).toBe(0)
    broker.reportLifecycle({
      name: 'learning.call.stream_started', phase: 'question', activityId: 'after-dispose',
      lessonToken: 'lesson', roundToken: 'round', seq: 1,
    })
    expect(observed).not.toHaveBeenCalled()
  })

  it('degrades an unexpected provider failure to a skipped terminal result', async () => {
    const ctx = await setupBroker(true)
    const agent = stubAgent('provider-failure')
    registerRoot(ctx, agent)
    registerProvider(ctx, { ask: async () => { throw new Error('renderer crashed') } })

    await expect(ctx.learningActivities.presentCheckpoint({
      checkpoint: checkpoint(), agent, callId: 'provider-failure-call',
    })).resolves.toMatchObject({ status: 'skipped', reason: 'provider-failure' })
    expect(ctx.learningActivities.pendingCount).toBe(0)
  })

  it('deduplicates an identical receipt and rejects the same receipt with different content', async () => {
    const ctx = await setupBroker(false)
    const agent = stubAgent('receipt-deduplication')
    const accept = (ctx.learningActivities as unknown as {
      acceptCheckpointReceipt(
        session: Agent['session'], result: LearningCheckpointResultV1,
      ): LearningCheckpointResultV1
    }).acceptCheckpointReceipt.bind(ctx.learningActivities)
    const original: LearningCheckpointResultV1 = {
      protocol: CHECKPOINT_RESULT_PROTOCOL,
      checkpointId: 'checkpoint-id',
      status: 'submitted',
      response: { text: 'observable answer' },
      receiptId: 'stable-receipt',
    }

    expect(accept(agent.session, original)).toBe(original)
    expect(accept(agent.session, { ...original, response: { text: 'observable answer' } })).toBe(original)
    expect(() => accept(agent.session, { ...original, response: { text: 'changed answer' } }))
      .toThrow(/receiptId was reused for different content/)
  })
})
