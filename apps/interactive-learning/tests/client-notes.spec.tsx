// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { LearningInputBridge, LearningNotesView, projectLearningNotes, type LearningNotesSource } from '../src/client/LearningNotes.tsx'
import { LearningSurface } from '../src/client/LearningSurface.tsx'
import { en } from '../src/client/locales.ts'

const t = ((key: keyof typeof en, params?: Record<string, string | number>) => {
  let value = en[key]
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replace(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<'interactive-learning'>

const View = LearningNotesView as unknown as ComponentType<Record<string, unknown>>
const Bridge = LearningInputBridge as unknown as ComponentType<Record<string, unknown>>

const SESSION_ID = 'notes-session'

function renderNotes(
  source: LearningNotesSource,
  input: { setDraft: () => void; submit: () => void },
): void {
  const chat = { legacy: source }
  render(
    <>
      <Bridge
        sessionId={SESSION_ID}
        useInput={(select: (value: unknown) => unknown) => select({ phase: 'plain' })}
        inputActions={input}
      />
      <View
        useSession={(select: (value: unknown) => unknown) => select({ removed: false, running: false })}
        useChat={(select: (value: typeof chat) => unknown) => select(chat)}
        sessionId={SESSION_ID}
        cwd="/vault"
        call={vi.fn()}
        t={t}
      />
    </>,
  )
}
const Surface = LearningSurface as unknown as ComponentType<Record<string, unknown>>

function resultNode(name: string, args: Record<string, unknown>, result?: unknown) {
  return {
    kind: 'tool-result',
    seq: 1,
    time: 1,
    callId: `${name}-1`,
    call: { name, argsRaw: JSON.stringify(args) },
    content: result === undefined ? [] : [{ type: 'text', text: JSON.stringify(result) }],
  }
}

function sessionWithLearningNotes(): LearningNotesSource {
  return {
    nodes: [
      resultNode('learning_state_update', {
        action: 'update',
        event: { type: 'goal_observed', goal: 'Understand queue ordering.' },
      }),
      resultNode('learning_state_update', {
        action: 'update',
        event: {
          type: 'plan_observed',
          objective: 'Understand queue ordering.',
          steps: [{ id: 'first', label: 'Trace the first item' }, { id: 'second', label: 'Predict the next item' }],
          activeStepId: 'first',
        },
      }),
      resultNode('learning_state_update', {
        action: 'update',
        event: {
          type: 'learner_evidence_observed',
          evidence: { kind: 'explanation', summary: 'The head leaves before the tail.' },
          observation: { summary: 'The learner explained the queue head.' },
        },
      }),
      resultNode('learning_checkpoint', {
        protocol: 'dsh-learning/checkpoint@1',
        prompt: 'Which item leaves first?',
      }, { status: 'submitted', response: { text: 'The head item.' } }),
    ],
    runningCalls: [],
    chat: { nodes: { values: () => [] } },
  } as unknown as LearningNotesSource
}

afterEach(() => cleanup())

describe('session learning notes', () => {
  it('projects only goal, evidence, and route progress from learning nodes', () => {
    const notes = projectLearningNotes(sessionWithLearningNotes())
    expect(notes.visible).toBe(true)
    expect(notes.active).toBe(true)
    expect(notes.goal).toBe('Understand queue ordering.')
    expect(notes.evidence).toContain('The head item.')
    expect(notes.plan?.steps).toHaveLength(2)
  })

  it('uses the composer path for the three explicit segment controls', () => {
    const setDraft = vi.fn()
    const submit = vi.fn()
    renderNotes(sessionWithLearningNotes(), { setDraft, submit })

    expect(screen.getByText(en.learningNotesGoal)).toBeTruthy()
    expect(screen.getByText(en.learningNotesEvidence)).toBeTruthy()
    expect(screen.getByText(en.learningNotesStep.replace('{current}', '1').replace('{total}', '2'))).toBeTruthy()
    expect(screen.queryByText(/mastery|score|掌握|评分/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: en.learningNotesDeepen }))
    expect(setDraft).toHaveBeenCalledWith(en.learningNotesDeepenPrompt)
    expect(submit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: en.learningNotesRephrase }))
    fireEvent.click(screen.getByRole('button', { name: en.learningNotesEnd }))
    expect(setDraft).toHaveBeenNthCalledWith(2, en.learningNotesRephrasePrompt)
    expect(setDraft).toHaveBeenNthCalledWith(3, en.learningNotesEndPrompt)
    expect(submit).toHaveBeenCalledTimes(3)
  })

  it('keeps a closed note read-only and removes segment controls', () => {
    const source = sessionWithLearningNotes()
    const session = {
      ...source,
      nodes: [
        ...source.nodes,
        {
          kind: 'user',
          seq: 9,
          time: 9,
          source: { kind: 'user' },
          content: [{ type: 'text', text: 'Done.' }],
        },
      ],
    } as LearningNotesSource
    renderNotes(session, { setDraft: vi.fn(), submit: vi.fn() })
    expect(screen.getByText(en.learningNotesTitle)).toBeTruthy()
    expect(screen.queryByRole('button', { name: en.learningNotesDeepen })).toBeNull()
  })

  it('keeps the original goal when a checkpoint-shaped goal arrives and shows the result', () => {
    const source = sessionWithLearningNotes()
    const session = {
      ...source,
      nodes: [
        ...source.nodes,
        resultNode('learning_state_update', {
          action: 'update',
          event: { type: 'goal_observed', goal: 'Which item leaves first?' },
        }),
        resultNode('learning_state_update', {
          action: 'update',
          event: {
            type: 'learner_evidence_observed',
            evidence: {
              kind: 'transfer',
              transferContext: 'fresh',
              summary: 'Applied the rule to a fresh queue.',
              confidence: 'high',
              correctness: 'correct',
              independence: 'independent',
            },
          },
        }),
        resultNode('learning_state_update', {
          action: 'update',
          event: { type: 'progress_observed', nextMove: 'complete', phase: 'complete' },
        }),
      ],
    } as LearningNotesSource

    const notes = projectLearningNotes(session)
    expect(notes.goal).toBe('Understand queue ordering.')
    expect(notes.active).toBe(false)
    expect(notes.verifiedTransfer).toBe(true)

    const setDraft = vi.fn()
    const submit = vi.fn()
    renderNotes(session, { setDraft, submit })
    expect(screen.getByText(en.learningResultTitle)).toBeTruthy()
    expect(screen.getByText(en.learningResultTransfer)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: en.learningResultCard }))
    expect(setDraft).toHaveBeenCalledWith(en.learningResultCardPrompt)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('uses the learner request when a legacy session only recorded the checkpoint as its goal', () => {
    const session = {
      nodes: [
        {
          kind: 'user',
          seq: 1,
          time: 1,
          source: { kind: 'user' },
          content: [{ type: 'text', text: '我想理解二叉搜索树为什么查找快。' }],
        },
        resultNode('learning_state_update', {
          action: 'update',
          event: { type: 'goal_observed', goal: '如果插入 8，它会放在哪里？' },
        }),
      ],
      runningCalls: [],
      chat: { nodes: { values: () => [] } },
    } as unknown as LearningNotesSource

    expect(projectLearningNotes(session).goal).toBe('我想理解二叉搜索树为什么查找快。')
  })

  it('shows only generic quick starts for a blank learning session', () => {
    const setDraft = vi.fn()
    const useSessions = (select: (state: { byId: Record<string, { agentPreset?: string }> }) => boolean): boolean =>
      select({ byId: { 'session-learning': { agentPreset: 'learning' } } })
    const session = {
      ...sessionWithLearningNotes(),
      nodes: [],
      blank: true,
      running: false,
      removed: false,
    } as LearningNotesSource

    render(
      <Surface
        session={session}
        input={{ phase: 'plain' }}
        inputActions={{ setDraft, submit: vi.fn() }}
        sessionId="session-learning"
        useSessions={useSessions}
        t={t}
      />,
    )

    expect(screen.getByText(en.learningStartQuickLabel)).toBeTruthy()
    expect(screen.getByRole('button', { name: en.learningStartConcept })).toBeTruthy()
    expect(screen.getByRole('button', { name: en.learningStartQuestion })).toBeTruthy()
    expect(screen.getByRole('button', { name: en.learningStartMaterial })).toBeTruthy()
    expect(screen.queryByText(/binary search tree/i)).toBeNull()
    expect(screen.getAllByRole('button')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: en.learningStartConcept }))
    expect(setDraft).toHaveBeenCalledWith(en.learningStartConceptPrompt)
    expect(document.documentElement.dataset.learningSurface).toBe('true')
  })
})
