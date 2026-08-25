// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { LearningSessionNotes, projectLearningNotes } from '../src/client/LearningNotes.tsx'
import { en } from '../src/client/locales.ts'

const t = ((key: keyof typeof en, params?: Record<string, string | number>) => {
  let value = en[key]
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replace(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<'interactive-learning'>

const Notes = LearningSessionNotes as unknown as ComponentType<Record<string, unknown>>

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

function sessionWithLearningNotes(): ConversationSnapshot {
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
  } as unknown as ConversationSnapshot
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
    render(
      <Notes
        session={sessionWithLearningNotes()}
        input={{ phase: 'plain' }}
        inputActions={{ setDraft, submit }}
        t={t}
      />,
    )

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
    } as ConversationSnapshot
    render(
      <Notes
        session={session}
        input={{ phase: 'plain' }}
        inputActions={{ setDraft: vi.fn(), submit: vi.fn() }}
        t={t}
      />,
    )
    expect(screen.getByText(en.learningNotesTitle)).toBeTruthy()
    expect(screen.queryByRole('button', { name: en.learningNotesDeepen })).toBeNull()
  })
})
