// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { VaultView } from '../src/client/VaultView.tsx'
import { ConceptsSection, ReviewSection, type Concept } from '../src/client/VaultConcepts.tsx'
import { en } from '../src/client/locales.ts'

const t = ((key: keyof typeof en, params?: Record<string, string | number>) => {
  let value = en[key]
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replace(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<'interactive-learning'>

const Panel = VaultView as unknown as ComponentType<Record<string, unknown>>
const Concepts = ConceptsSection as unknown as ComponentType<Record<string, unknown>>
const Review = ReviewSection as unknown as ComponentType<Record<string, unknown>>

function concept(overrides: Partial<Concept> = {}): Concept {
  return {
    conceptSlug: 'convolution',
    label: '卷积',
    mastery: 'transfer',
    masteryBasis: 'evidence',
    due: '2026-08-27',
    intervalDays: 4,
    lastReviewedAt: '2026-08-23T00:00:00.000Z',
    anchors: ['fourier#第2章-卷积定理 (p. 39)'],
    staleAnchors: [],
    explanation: '滑窗逐点相乘求和就是卷积。',
    misconceptions: ['以为相关性和卷积是一回事'],
    unverifiedTransfer: '',
    relatedConcepts: ['傅里叶变换'],
    path: 'concepts/convolution.md',
    body: '# 卷积\n\n## 我的解释（2026-08-23）\n> 滑窗逐点相乘求和就是卷积。',
    due_now: true,
    ...overrides,
  }
}

function list(concepts: Concept[]) {
  return {
    status: 'ok',
    concepts,
    due: concepts.filter(item => item.due_now).length,
    stale: concepts.filter(item => item.staleAnchors.length > 0).length,
  }
}

/** An `ask` that answers from a table and records every call. */
function host(answers: Record<string, unknown>) {
  const asked: { endpoint: string; payload: Record<string, unknown> }[] = []
  const ask = vi.fn(async (endpoint: string, payload: Record<string, unknown> = {}) => {
    asked.push({ endpoint, payload })
    return answers[endpoint]
  })
  return { asked, ask }
}

afterEach(() => { cleanup() })

describe('concept list', () => {
  it('explains why the shelf is bare instead of just saying "empty"', () => {
    render(<Concepts list={list([])} ask={host({}).ask} onChanged={() => {}} t={t} />)
    expect(screen.getByText(en.vaultConceptsEmptyTitle)).toBeTruthy()
    expect(screen.getByText(/used the idea correctly, on your own/u)).toBeTruthy()
  })

  it('shows mastery, its basis, and the schedule as read-only facts', () => {
    render(<Concepts list={list([concept()])} ask={host({}).ask} onChanged={() => {}} t={t} />)

    expect(screen.getByText(en.vaultMasteryTransfer)).toBeTruthy()
    expect(screen.getByText(en.vaultBasisEvidence)).toBeTruthy()
    expect(screen.getByText(en.vaultDueToday)).toBeTruthy()
    expect(screen.getByText('4-day interval')).toBeTruthy()
    expect(screen.getByText('concepts/convolution.md')).toBeTruthy()
  })

  it('marks a corrected card as corrected rather than as ordinary evidence', () => {
    render(
      <Concepts
        list={list([concept({ masteryBasis: 'user-correction', mastery: 'emerging' })])}
        ask={host({}).ask}
        onChanged={() => {}}
        t={t}
      />,
    )
    expect(screen.getByText(en.vaultBasisCorrected)).toBeTruthy()
    expect(screen.queryByText(en.vaultBasisEvidence)).toBeNull()
  })

  it('separates stale citations from live ones and says what to do', () => {
    render(
      <Concepts
        list={list([concept({ staleAnchors: ['old#第1章'] })])}
        ask={host({}).ask}
        onChanged={() => {}}
        t={t}
      />,
    )
    expect(screen.getByText('old#第1章')).toBeTruthy()
    expect(screen.getByText(en.vaultStaleWarning)).toBeTruthy()
  })
})

describe('card editing', () => {
  it('sends only the body, and warns which fields it cannot touch', async () => {
    const next = concept({ label: '卷积（改过）' })
    const { asked, ask } = host({ 'concepts/save': { status: 'ok', concept: next } })
    render(<Concepts list={list([concept()])} ask={ask} onChanged={() => {}} t={t} />)

    fireEvent.click(screen.getByText(en.vaultEdit))
    expect(screen.getByText(en.vaultSystemFieldsNote)).toBeTruthy()

    const editor = screen.getByLabelText(en.vaultEdit) as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: '# 卷积（改过）' } })
    fireEvent.click(screen.getByText(en.vaultSave))

    await vi.waitFor(() => {
      expect(asked.some(entry => entry.endpoint === 'concepts/save')).toBe(true)
    })
    const save = asked.find(entry => entry.endpoint === 'concepts/save')
    // The payload has no field that could move mastery, due or anchors.
    expect(Object.keys(save?.payload ?? {}).sort()).toEqual(['body', 'conceptSlug'])
  })

  it('discards the draft on cancel', () => {
    render(<Concepts list={list([concept()])} ask={host({}).ask} onChanged={() => {}} t={t} />)
    fireEvent.click(screen.getByText(en.vaultEdit))
    fireEvent.change(screen.getByLabelText(en.vaultEdit), { target: { value: 'throwaway' } })
    fireEvent.click(screen.getByText(en.vaultCancel))

    fireEvent.click(screen.getByText(en.vaultEdit))
    expect((screen.getByLabelText(en.vaultEdit) as HTMLTextAreaElement).value).toContain('我的解释')
  })

  it('shows a save failure and keeps the editor open', async () => {
    const { ask } = host({})
    render(<Concepts list={list([concept()])} ask={ask} onChanged={() => {}} t={t} />)

    fireEvent.click(screen.getByText(en.vaultEdit))
    fireEvent.click(screen.getByText(en.vaultSave))

    await vi.waitFor(() => { expect(screen.getByRole('alert').textContent).toContain(en.vaultFailed) })
    expect(screen.getByLabelText(en.vaultEdit)).toBeTruthy()
  })
})

describe('the two manual outlets', () => {
  it('sends a defer as days only and reports the new date', async () => {
    const { asked, ask } = host({
      'concepts/defer': { status: 'ok', concept: concept({ due: '2026-09-03', due_now: false }) },
    })
    render(<Concepts list={list([concept()])} ask={ask} onChanged={() => {}} t={t} />)

    fireEvent.click(screen.getByText(en.vaultDefer))
    await vi.waitFor(() => { expect(screen.getByText('Next 2026-09-03')).toBeTruthy() })

    const call = asked.find(entry => entry.endpoint === 'concepts/defer')
    expect(call?.payload).toEqual({ conceptSlug: 'convolution', days: 7 })
  })

  it('says the defer does not disturb the interval', () => {
    render(<Concepts list={list([concept()])} ask={host({}).ask} onChanged={() => {}} t={t} />)
    expect(screen.getByText(en.vaultDeferHint)).toBeTruthy()
  })

  it('lowers mastery through the correction and names the new level', async () => {
    const { asked, ask } = host({
      'concepts/correct': {
        status: 'ok',
        concept: concept({ mastery: 'emerging', masteryBasis: 'user-correction' }),
      },
    })
    render(<Concepts list={list([concept()])} ask={ask} onChanged={() => {}} t={t} />)

    fireEvent.click(screen.getByText(en.vaultCorrect))
    await vi.waitFor(() => {
      expect(screen.getByText(`Lowered to ${en.vaultMasteryEmerging} and scheduled for today`)).toBeTruthy()
    })
    expect(asked.find(entry => entry.endpoint === 'concepts/correct')?.payload)
      .toEqual({ conceptSlug: 'convolution' })
  })

  it('offers no way to raise mastery, and stops at the floor', () => {
    render(
      <Concepts
        list={list([concept({ mastery: 'unseen' })])}
        ask={host({}).ask}
        onChanged={() => {}}
        t={t}
      />,
    )
    expect((screen.getByText(en.vaultCorrect) as HTMLButtonElement).disabled).toBe(true)
    // There is no "raise" control anywhere on the card.
    expect(screen.queryByText(/raise|提升/u)).toBeNull()
  })
})

describe('review deck', () => {
  it('hides the answer until the learner asks for it', () => {
    render(<Review list={list([concept()])} ask={host({}).ask} onChanged={() => {}} t={t} />)

    expect(screen.getByText('卷积')).toBeTruthy()
    expect(screen.getByText(en.vaultReviewPrompt)).toBeTruthy()
    expect(screen.queryByText('滑窗逐点相乘求和就是卷积。')).toBeNull()

    fireEvent.click(screen.getByText(en.vaultReviewShow))
    expect(screen.getByText('滑窗逐点相乘求和就是卷积。')).toBeTruthy()
  })

  it('rates locally and shows the next due date', async () => {
    const { asked, ask } = host({
      'concepts/rate': { status: 'ok', concept: concept({ due: '2026-09-04', due_now: false }) },
    })
    render(<Review list={list([concept(), concept({ conceptSlug: 'b', label: '傅里叶' })])} ask={ask} onChanged={() => {}} t={t} />)

    fireEvent.click(screen.getByText(en.vaultReviewShow))
    fireEvent.click(screen.getByText(en.vaultRateMastered))

    await vi.waitFor(() => { expect(screen.getByText('Next 2026-09-04')).toBeTruthy() })
    expect(asked.find(entry => entry.endpoint === 'concepts/rate')?.payload)
      .toEqual({ conceptSlug: 'convolution', rating: 'mastered' })
    // Advanced to the second card, answer hidden again.
    expect(screen.getByText('傅里叶')).toBeTruthy()
    expect(screen.queryByText('滑窗逐点相乘求和就是卷积。')).toBeNull()
  })

  it('keeps the shown card and progress when rating fails', async () => {
    const { ask } = host({})
    render(<Review list={list([concept(), concept({ conceptSlug: 'b', label: '傅里叶' })])} ask={ask} onChanged={() => {}} t={t} />)

    fireEvent.click(screen.getByText(en.vaultReviewShow))
    fireEvent.click(screen.getByText(en.vaultRateMastered))

    await vi.waitFor(() => { expect(screen.getByRole('alert').textContent).toContain(en.vaultFailed) })
    expect(screen.getByText('卷积')).toBeTruthy()
    expect(screen.getByText('滑窗逐点相乘求和就是卷积。')).toBeTruthy()
    expect(screen.queryByText('傅里叶')).toBeNull()
    expect(screen.getByText('Card 1 of 2')).toBeTruthy()
    expect(screen.queryByText(en.vaultReviewDone)).toBeNull()
    expect(screen.queryByText(/Next/u)).toBeNull()
  })

  it('does not re-add a rated card when the parent rebuilds its queue', async () => {
    const second = concept({ conceptSlug: 'b', label: '傅里叶' })
    const next = concept({ due: '2026-09-04', due_now: false })
    const { ask } = host({ 'concepts/rate': { status: 'ok', concept: next } })
    let view: ReturnType<typeof render> | undefined
    const onChanged = (updated: Concept) => {
      view?.rerender(
        <Review
          list={list([updated, second])}
          ask={ask}
          onChanged={onChanged}
          t={t}
        />,
      )
    }
    view = render(<Review list={list([concept(), second])} ask={ask} onChanged={onChanged} t={t} />)

    fireEvent.click(screen.getByText(en.vaultReviewShow))
    fireEvent.click(screen.getByText(en.vaultRateMastered))

    await vi.waitFor(() => { expect(screen.getByText('傅里叶')).toBeTruthy() })
    expect(screen.queryByText('卷积')).toBeNull()
  })

  it('says a card it could not recall is coming back', async () => {
    const { ask } = host({ 'concepts/rate': { status: 'ok', concept: concept() } })
    render(<Review list={list([concept()])} ask={ask} onChanged={() => {}} t={t} />)

    fireEvent.click(screen.getByText(en.vaultReviewShow))
    fireEvent.click(screen.getByText(en.vaultRateRevealed))

    await vi.waitFor(() => { expect(screen.getByText(en.vaultRateRevealedHint)).toBeTruthy() })
    // Still in the deck, not declared finished: the Host wrote no schedule, so
    // the card is still due today.
    expect(screen.getByText(en.vaultReviewPrompt)).toBeTruthy()
    expect(screen.queryByText(en.vaultReviewDone)).toBeNull()
  })

  it('states that reviewing costs nothing', () => {
    render(<Review list={list([concept()])} ask={host({}).ask} onChanged={() => {}} t={t} />)
    expect(screen.getByText(en.vaultLocalOnly)).toBeTruthy()
  })

  it('distinguishes "nothing due" from "you just finished"', async () => {
    const { ask } = host({ 'concepts/rate': { status: 'ok', concept: concept() } })
    const { rerender } = render(<Review list={list([])} ask={ask} onChanged={() => {}} t={t} />)
    expect(screen.getByText(en.vaultReviewEmptyTitle)).toBeTruthy()

    rerender(<Review list={list([concept()])} ask={ask} onChanged={() => {}} t={t} />)
    fireEvent.click(screen.getByText(en.vaultReviewShow))
    fireEvent.click(screen.getByText(en.vaultRateMastered))
    await vi.waitFor(() => { expect(screen.getByText(en.vaultReviewDone)).toBeTruthy() })
  })
})

describe('panel rail', () => {
  function panelHost(concepts: Concept[]) {
    const due = concepts.filter(item => item.due_now)
    return {
      'vault/summary': {
        status: 'ok', title: '傅里叶', root: '/vault',
        sources: 1, concepts: concepts.length, notes: 0,
        due: due.length, degradedSources: 0,
      },
      'vault/sources': { status: 'ok', sources: [] },
      'concepts/list': list(concepts),
      'concepts/review': list(due),
      'notes/list': { status: 'ok', notes: [], pending: 0, blocked: 0 },
    }
  }

  function call(answers: Record<string, unknown>) {
    return vi.fn(async (endpoint: string) => {
      const value = answers[endpoint]
      return value === undefined ? { ok: false } : { ok: true, value }
    })
  }

  it('badges the due count on the rail and switches sections', async () => {
    render(<Panel cwd="/vault" call={call(panelHost([concept()]))} t={t} />)

    expect(await screen.findByText(en.vaultNavConcepts)).toBeTruthy()
    expect(screen.getByText(en.vaultNavReview)).toBeTruthy()

    fireEvent.click(screen.getByText(en.vaultNavConcepts))
    expect(await screen.findByText('卷积')).toBeTruthy()

    fireEvent.click(screen.getByText(en.vaultNavReview))
    expect(await screen.findByText(en.vaultReviewPrompt)).toBeTruthy()
  })

  it('opens on material, not on a section the learner did not ask for', async () => {
    render(<Panel cwd="/vault" call={call(panelHost([concept()]))} t={t} />)
    expect(await screen.findByText(en.vaultEmptyTitle)).toBeTruthy()
  })
})
