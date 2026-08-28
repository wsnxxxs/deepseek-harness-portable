import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerConceptTools, type ConceptToolContext } from '../src/concept-tools.ts'
import {
  INITIAL_REVIEW_INTERVAL_DAYS,
  MAX_REVIEW_INTERVAL_DAYS,
  buildConceptStudyMap,
  conceptCardDraftFromState,
  isConceptDue,
  nextReviewSchedule,
  readConceptCard,
  readLearnerMemoryWithCards,
  reanchorConceptCards,
  saveConceptCard,
  updateConceptCardAnchors,
  updateConceptCardSchedule,
} from '../src/concept-cards.ts'
import { createInitialLearnerState, type LearnerEvidence, type LearnerState } from '../src/learner-state.ts'
import { renderLearnerMemory } from '../src/learner-memory.ts'
import { formatSectionAnchor } from '../src/material-anchor.ts'
import { quoteHashOf } from '../src/ingest/types.ts'
import { ensureVaultLayout, type TopicVault } from '../src/topic-vault.ts'
import { SOURCE_STRUCTURE_PROTOCOL, type SourceStructure } from '../src/ingest/types.ts'

function transferState(): LearnerState {
  const evidence: LearnerEvidence = {
    kind: 'transfer',
    transferContext: 'fresh',
    summary: '在新的事件回调例子里说明闭包仍然捕获变量绑定。',
    confidence: 'high',
    correctness: 'correct',
    justification: 'The learner applied the rule to a new callback example.',
    independence: 'independent',
    source: 'learner-message',
    turn: 3,
  }
  return {
    ...createInitialLearnerState('session-1'),
    goal: '闭包',
    mastery: 'transfer',
    phase: 'complete',
    nextMove: 'complete',
    evidence: [evidence],
    sourceAnchors: ['guide#指南 › 第3章 作用域'],
  }
}

function structure(label: string, page: number | undefined, body: string): SourceStructure {
  return {
    protocol: SOURCE_STRUCTURE_PROTOCOL,
    sourceId: 'guide',
    title: '指南',
    parser: 'markdown@1',
    extractedPath: 'extracted/guide.md',
    degradation: [],
    totalChars: body.length,
    sections: [{
      id: `guide/${label}`,
      label,
      level: 2,
      headingPath: ['指南', label],
      ...(page === undefined ? {} : { page }),
      charCount: body.length,
      quoteHash: quoteHashOf(body),
      line: 1,
      endLine: 3,
    }],
  }
}

describe('concept cards', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-concept-card-'))
    vault = await ensureVaultLayout(root, '学习库')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('only drafts a card after an independent fresh transfer and writes explicit links', async () => {
    const state = transferState()
    const draft = conceptCardDraftFromState(state, { relatedConcepts: ['变量提升'] }, new Date('2026-08-26T00:00:00.000Z'))
    expect(draft).toBeDefined()
    expect(conceptCardDraftFromState({ ...state, evidence: [] })).toBeUndefined()
    expect(conceptCardDraftFromState({
      ...state,
      evidence: [{ ...state.evidence[0]!, transferContext: 'same' }],
    })).toBeUndefined()

    const card = await saveConceptCard(vault, draft!, new Date('2026-08-26T00:00:00.000Z'))
    const raw = await readFile(card.path, 'utf8')
    expect(raw).toContain('due: 2026-08-29')
    expect(raw).toContain('[[变量提升]]')
    expect((await readConceptCard(vault, '闭包'))?.label).toBe('闭包')
  })

  it('keeps review scheduling in the card and prompt memory', async () => {
    const draft = conceptCardDraftFromState(transferState(), {}, new Date('2026-08-26T00:00:00.000Z'))!
    const card = await saveConceptCard(vault, draft, new Date('2026-08-26T00:00:00.000Z'))
    expect(isConceptDue(card.due, new Date('2026-08-28T00:00:00.000Z'))).toBe(false)
    expect(isConceptDue(card.due, new Date('2026-08-29T00:00:00.000Z'))).toBe(true)
    expect(nextReviewSchedule(card, 'mastered', new Date('2026-08-29T00:00:00.000Z'))?.intervalDays).toBe(6)
    expect(nextReviewSchedule(card, 'review', new Date('2026-08-29T00:00:00.000Z'))?.intervalDays).toBe(1)
    // A self-rating is a scheduling signal, so it cannot push a card out of the
    // queue without limit, and a failure drops the interval it grew before it.
    const grown = { ...card, intervalDays: 80 }
    expect(nextReviewSchedule(grown, 'mastered', new Date('2026-08-29T00:00:00.000Z'))?.intervalDays)
      .toBe(MAX_REVIEW_INTERVAL_DAYS)
    expect(nextReviewSchedule(grown, 'revealed', new Date('2026-08-29T00:00:00.000Z')))
      .toMatchObject({ intervalDays: INITIAL_REVIEW_INTERVAL_DAYS, due: '2026-08-29' })
    expect(nextReviewSchedule(card, 'revealed', new Date('2026-08-29T00:00:00.000Z'))).toBeUndefined()

    await updateConceptCardSchedule(vault, card.conceptSlug, {
      due: '2026-08-29', intervalDays: 3, lastReviewedAt: '2026-08-26T00:00:00.000Z',
    })
    const memory = await readLearnerMemoryWithCards(vault)
    expect(memory.concepts[0]).toMatchObject({ conceptSlug: '闭包', due: '2026-08-29', reviewIntervalDays: 3 })
    expect(renderLearnerMemory(memory, { title: '学习库' })).toContain('next review: 2026-08-29')
  })

  it('moves concept anchors with a renamed section and marks missing ones stale', async () => {
    const previous = structure('旧标题', 12, '同一段正文')
    const oldAnchor = formatSectionAnchor('guide', previous.sections[0]!)
    const draft = conceptCardDraftFromState({ ...transferState(), sourceAnchors: [oldAnchor] }, {})!
    await saveConceptCard(vault, draft, new Date('2026-08-26T00:00:00.000Z'))
    const renamed = structure('新标题', 42, '同一段正文')
    expect((await reanchorConceptCards(vault, previous, renamed)).moved).toBe(1)
    expect((await readConceptCard(vault, '闭包'))?.anchors[0]).toContain('新标题')

    const missing = structure('别的标题', 43, '别的正文')
    expect((await reanchorConceptCards(vault, renamed, missing)).stale).toBe(1)
    expect((await readConceptCard(vault, '闭包'))?.staleAnchors[0]).toContain('新标题')
  })

  it('builds a concept study map from actual card state', async () => {
    const draft = conceptCardDraftFromState(transferState(), {}, new Date('2026-08-26T00:00:00.000Z'))!
    const card = await saveConceptCard(vault, draft, new Date('2026-08-26T00:00:00.000Z'))
    await updateConceptCardSchedule(vault, card.conceptSlug, {
      due: '2026-08-20', intervalDays: 3, lastReviewedAt: '2026-08-17T00:00:00.000Z',
    })
    await updateConceptCardAnchors(vault, card.conceptSlug, [], ['guide#旧章节'])
    const map = await buildConceptStudyMap(vault, undefined, new Date('2026-08-26T00:00:00.000Z'))
    expect(map.view).toBe('concepts')
    expect(map.concepts[0]).toMatchObject({ label: '闭包', mastery: 'transfer', stale: true, due: '2026-08-20' })
    expect(map.sections[0]?.id).toBe('group-stale')
  })

  it('requires the learner decision before the proposal writes a file', async () => {
    let selected = '暂不保存'
    const questions = {
      ask: async () => ({ answers: [{ id: 'concept-card-confirm', selected: [selected] }] }),
    }
    const registered = new Map<string, { execute(args: unknown, exec: unknown): Promise<unknown> }>()
    const ctx = {
      get: (key: string) => key === 'userQuestions' ? questions : undefined,
      tools: { register: (tool: { name: string; execute(args: unknown, exec: unknown): Promise<unknown> }) => registered.set(tool.name, tool) },
      learningActivities: { learnerState: () => transferState() },
    } as unknown as ConceptToolContext
    registerConceptTools(ctx)
    const propose = registered.get('learning_concept_propose')!
    const agent = { id: 'session-1', session: { id: 'session-1', header: { cwd: root } } }
    const exec = { agent, signal: new AbortController().signal }

    await propose.execute({}, exec)
    expect(await readConceptCard(vault, '闭包')).toBeUndefined()

    selected = '保存概念卡'
    await propose.execute({ relatedConcepts: ['变量提升'] }, exec)
    expect(await readConceptCard(vault, '闭包')).toMatchObject({ label: '闭包' })
  })
})
