/** User-approved concept cards and their small review schedule. */

import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { reanchorAnchorLists, type ReanchorOutcome } from './material-reanchor.ts'
import {
  readLearnerMemory,
  type LearnerConceptRecord,
  type LearnerMemory,
} from './learner-memory.ts'
import {
  slugify,
  type SourceStructure,
} from './ingest/types.ts'
import type {
  LearnerEvidence,
  LearnerMastery,
  LearnerMasteryBasis,
  LearnerState,
} from './learner-state.ts'
import type { LearningStudyMapV4 } from './protocol-current.ts'
import type { TopicVault } from './topic-vault.ts'

export const MAX_CONCEPT_CARDS = 48
export const INITIAL_REVIEW_INTERVAL_DAYS = 3

export type ConceptCardRating = 'revealed' | 'mastered' | 'review'

export interface ConceptCardDraft {
  conceptSlug: string
  label: string
  mastery: LearnerMastery
  masteryBasis: LearnerMasteryBasis
  due: string
  intervalDays: number
  anchors: readonly string[]
  staleAnchors: readonly string[]
  explanation: string
  misconceptions: readonly string[]
  unverifiedTransfer: string
  relatedConcepts: readonly string[]
}

export type ConceptCard = Omit<ConceptCardDraft, 'due'> & {
  due: string | null
  lastReviewedAt: string | null
  createdAt: string
  updatedAt: string
  /** Markdown after the YAML frontmatter, retained when the card is updated. */
  body: string
  path: string
}

export interface ConceptCardSchedule {
  due: string
  intervalDays: number
  lastReviewedAt: string
}

const MASTERY: ReadonlySet<string> = new Set<LearnerMastery>(['unseen', 'emerging', 'transfer'])
const MASTERY_BASIS: ReadonlySet<string> = new Set<LearnerMasteryBasis>(['evidence', 'user-correction'])
const DATE = /^\d{4}-\d{2}-\d{2}$/u
const MAX_CARD_TEXT = 1_200

function isFreshIndependentTransfer(
  evidence: LearnerEvidence,
): evidence is Extract<LearnerEvidence, { kind: 'transfer' }> {
  return (
    evidence.source === 'learner-message'
      || evidence.source === 'learner-action'
  ) && evidence.kind === 'transfer'
    && evidence.transferContext === 'fresh'
    && evidence.correctness === 'correct'
    && evidence.independence === 'independent'
    && evidence.confidence !== 'low'
}

function text(value: string | null | undefined, limit = MAX_CARD_TEXT): string {
  if (value === null || value === undefined) return ''
  return value.replace(/[\u0000-\u001f\u007f]/gu, ' ').trim().slice(0, limit)
}

function list(values: readonly string[] | undefined, limit = 8): readonly string[] {
  if (values === undefined) return []
  return [...new Set(values.map(value => text(value)).filter(value => value !== ''))].slice(0, limit)
}

function dateOf(value: string | null | undefined): string | null {
  if (value === null || value === undefined || !DATE.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value ? null : value
}

export function dateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function addDays(now: Date, days: number): string {
  const value = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days))
  return value.toISOString().slice(0, 10)
}

export function isConceptDue(due: string | null | undefined, now = new Date()): boolean {
  const normalized = dateOf(due)
  return normalized !== null && normalized <= dateKey(now)
}

/** Build the actual saved-card view used by the second `study_map` mode. */
export async function buildConceptStudyMap(
  vault: TopicVault,
  goal?: string,
  now = new Date(),
): Promise<LearningStudyMapV4> {
  const cards = await readConceptCards(vault)
  if (cards.length === 0) throw new TypeError('No approved concept cards exist in this learning vault')
  const groups = [
    { id: 'group-stale', label: '需要更新引用', summary: '这些概念卡有找不到的旧材料锚点。', tone: 'orange' as const, cards: [] as ConceptCard[] },
    { id: 'group-due', label: '到期复习', summary: '这些概念卡现在适合复习。', tone: 'red' as const, cards: [] as ConceptCard[] },
    { id: 'group-learning', label: '学习中', summary: '这些概念卡还在形成中。', tone: 'blue' as const, cards: [] as ConceptCard[] },
    { id: 'group-mastered', label: '已完成迁移', summary: '这些概念卡已有独立迁移记录。', tone: 'green' as const, cards: [] as ConceptCard[] },
  ]
  for (const card of cards) {
    const group = card.staleAnchors.length > 0
      ? groups[0]!
      : isConceptDue(card.due, now)
        ? groups[1]!
        : card.mastery === 'transfer'
          ? groups[3]!
          : groups[2]!
    group.cards.push(card)
  }
  const sections = groups
    .filter(group => group.cards.length > 0)
    .map(group => ({ id: group.id, label: group.label, summary: group.summary }))
  const concepts = groups.flatMap(group => group.cards.map(card => ({
    id: recallCardIdOf(card.conceptSlug),
    label: card.label,
    sectionId: group.id,
    detail: [
      card.explanation,
      card.misconceptions.length === 0 ? '' : `曾有误解：${card.misconceptions[0]}`,
      card.staleAnchors.length === 0 ? '' : `失效锚点：${card.staleAnchors.join('；')}`,
    ].filter(value => value !== '').join('\n'),
    conceptSlug: card.conceptSlug,
    mastery: card.mastery,
    ...(card.due === null ? {} : { due: card.due }),
    stale: card.staleAnchors.length > 0,
    role: 'core' as const,
    tone: group.tone,
  })))
  return {
    kind: 'study_map',
    view: 'concepts',
    sourceLabel: vault.title,
    ...(text(goal, 600) === '' ? {} : { goal: text(goal, 600) }),
    sections,
    concepts,
  }
}

/** The small, deterministic schedule used for the first review after a card is saved. */
export function reviewIntervalDays(
  mastery: LearnerMastery,
  independence: LearnerEvidence['independence'] = 'independent',
): number {
  if (mastery === 'transfer' && independence === 'independent') return INITIAL_REVIEW_INTERVAL_DAYS
  if (mastery === 'transfer') return 2
  if (mastery === 'emerging' && independence === 'independent') return 2
  return 1
}

/** Apply one learner-owned rating without pretending the rating is mastery evidence. */
export function nextReviewSchedule(
  card: Pick<ConceptCard, 'intervalDays' | 'mastery'>,
  rating: ConceptCardRating,
  now = new Date(),
): ConceptCardSchedule | undefined {
  if (rating === 'revealed') return undefined
  const prior = Number.isSafeInteger(card.intervalDays) && card.intervalDays > 0
    ? card.intervalDays
    : reviewIntervalDays(card.mastery)
  const intervalDays = rating === 'mastered'
    ? Math.max(1, prior * 2)
    : Math.max(1, Math.floor(prior / 2))
  return {
    due: addDays(now, intervalDays),
    intervalDays,
    lastReviewedAt: now.toISOString(),
  }
}

/** D1's gate: only a correct, independent, fresh transfer can create a card. */
export function hasFreshIndependentTransfer(state: LearnerState): boolean {
  return state.evidence.some(isFreshIndependentTransfer)
}

function relatedName(value: string): string {
  return text(value, 160).replace(/^\[\[/u, '').replace(/\]\]$/u, '').trim()
}

function bodyFromDraft(draft: ConceptCardDraft, now: Date): string {
  const quote = draft.explanation === '' ? '—' : draft.explanation.split('\n').map(line => `> ${line}`).join('\n')
  const misconception = draft.misconceptions.length === 0
    ? '—'
    : draft.misconceptions.join('\n')
  const unverified = draft.unverifiedTransfer === '' ? '—' : draft.unverifiedTransfer
  const links = draft.relatedConcepts.length === 0
    ? []
    : ['', '## 相关概念', draft.relatedConcepts.map(value => `[[${value}]]`).join('、')]
  return [
    `# ${draft.label}`,
    '',
    `## 我的解释（${dateKey(now)}）`,
    quote,
    '',
    '## 当时的误解',
    misconception,
    '',
    '## 还没验证',
    unverified,
    ...links,
    '',
  ].join('\n')
}

function yamlString(value: string): string {
  return JSON.stringify(value)
}

function frontmatter(card: Pick<ConceptCard, 'conceptSlug' | 'mastery' | 'masteryBasis' | 'due' | 'intervalDays' | 'lastReviewedAt' | 'anchors' | 'staleAnchors' | 'createdAt' | 'updatedAt'>): string {
  const lines = [
    '---',
    `id: ${yamlString(card.conceptSlug)}`,
    `mastery: ${card.mastery}`,
    `basis: ${card.masteryBasis}`,
    `due: ${card.due === null ? 'null' : card.due}`,
    `interval_days: ${String(card.intervalDays)}`,
    `last_reviewed: ${card.lastReviewedAt === null ? 'null' : yamlString(card.lastReviewedAt)}`,
    `created_at: ${yamlString(card.createdAt)}`,
    `updated_at: ${yamlString(card.updatedAt)}`,
    'anchors:',
    ...card.anchors.map(anchor => `  - ${yamlString(anchor)}`),
    'stale_anchors:',
    ...card.staleAnchors.map(anchor => `  - ${yamlString(anchor)}`),
    '---',
  ]
  return `${lines.join('\n')}\n\n`
}

export function renderConceptCard(value: ConceptCardDraft | ConceptCard, now = new Date()): string {
  const card = 'body' in value
    ? value
    : {
        ...value,
        due: value.due,
        lastReviewedAt: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        body: bodyFromDraft(value, now),
      }
  return `${frontmatter(card)}${card.body.trimEnd()}\n`
}

export function conceptCardPathOf(vault: TopicVault, conceptSlug: string): string {
  return join(vault.concepts, `${slugify(conceptSlug, 'concept')}.md`)
}

function scalar(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === 'null' || trimmed === '') return null
  if (trimmed.startsWith('"')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      return typeof parsed === 'string' ? parsed : null
    } catch {
      return null
    }
  }
  return trimmed
}

interface ParsedMarkdownCard {
  fields: Map<string, string | null>
  lists: Map<string, string[]>
  body: string
}

function parseMarkdownCard(raw: string): ParsedMarkdownCard | undefined {
  const normalized = raw.replace(/\r\n/gu, '\n')
  const lines = normalized.split('\n')
  if (lines[0]?.trim() !== '---') return undefined
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
  if (end < 0) return undefined
  const fields = new Map<string, string | null>()
  const lists = new Map<string, string[]>()
  let activeList: string | undefined
  for (const line of lines.slice(1, end)) {
    const item = /^\s+-\s+(.+)$/u.exec(line)
    if (item !== null && activeList !== undefined) {
      const value = scalar(item[1] ?? '')
      if (value !== null) lists.get(activeList)!.push(value)
      continue
    }
    const field = /^([a-z_]+):\s*(.*)$/u.exec(line)
    if (field === null) continue
    const key = field[1]!
    const value = field[2] ?? ''
    if (value.trim() === '') {
      activeList = key
      lists.set(key, [])
    } else {
      activeList = undefined
      fields.set(key, scalar(value))
    }
  }
  return { fields, lists, body: lines.slice(end + 1).join('\n').trim() }
}

function sectionBody(body: string, prefix: string): string {
  const lines = body.split('\n')
  const start = lines.findIndex(line => {
    const title = /^##\s+(.+)$/u.exec(line)?.[1]?.trim() ?? ''
    return title.startsWith(prefix)
  })
  if (start < 0) return ''
  const end = lines.findIndex((line, index) => index > start && /^##\s+/u.test(line))
  return lines
    .slice(start + 1, end < 0 ? lines.length : end)
    .join('\n')
    .replace(/^> ?/gmu, '')
    .trim()
    .replace(/^—$/u, '')
    .trim()
}

function labelFromBody(body: string): string {
  return body.split('\n').find(line => /^#\s+[^#]/u.test(line))?.replace(/^#\s+/u, '').trim() ?? ''
}

function parseCard(raw: string, path: string): ConceptCard | undefined {
  const parsed = parseMarkdownCard(raw)
  if (parsed === undefined) return undefined
  const fileSlug = basename(path, '.md')
  const conceptSlug = slugify(parsed.fields.get('id') ?? fileSlug, fileSlug)
  const label = labelFromBody(parsed.body) || conceptSlug
  const mastery = parsed.fields.get('mastery')
  if (!MASTERY.has(mastery ?? '')) return undefined
  const basis = parsed.fields.get('basis')
  const interval = Number(parsed.fields.get('interval_days') ?? '')
  const now = new Date(0).toISOString()
  return {
    conceptSlug,
    label,
    mastery: mastery as LearnerMastery,
    masteryBasis: MASTERY_BASIS.has(basis ?? '') ? basis as LearnerMasteryBasis : 'evidence',
    due: dateOf(parsed.fields.get('due')),
    intervalDays: Number.isSafeInteger(interval) && interval > 0 ? interval : INITIAL_REVIEW_INTERVAL_DAYS,
    lastReviewedAt: parsed.fields.get('last_reviewed') ?? null,
    anchors: list(parsed.lists.get('anchors')),
    staleAnchors: list(parsed.lists.get('stale_anchors')),
    explanation: sectionBody(parsed.body, '我的解释'),
    misconceptions: list(sectionBody(parsed.body, '当时的误解').split('\n'), 6),
    unverifiedTransfer: sectionBody(parsed.body, '还没验证'),
    relatedConcepts: list([...parsed.body.matchAll(/\[\[([^\]]+)\]\]/gu)].map(match => relatedName(match[1] ?? '')), 8),
    createdAt: parsed.fields.get('created_at') ?? now,
    updatedAt: parsed.fields.get('updated_at') ?? now,
    body: parsed.body,
    path,
  }
}

export async function readConceptCard(vault: TopicVault, conceptSlug: string): Promise<ConceptCard | undefined> {
  const path = conceptCardPathOf(vault, conceptSlug)
  try {
    return parseCard(await readFile(path, 'utf8'), path)
  } catch {
    return undefined
  }
}

export async function readConceptCards(vault: TopicVault): Promise<readonly ConceptCard[]> {
  let names: string[]
  try {
    names = (await readdir(vault.concepts)).filter(name => name.endsWith('.md')).sort()
  } catch {
    return []
  }
  const cards: ConceptCard[] = []
  for (const name of names.slice(0, MAX_CONCEPT_CARDS)) {
    const path = join(vault.concepts, name)
    try {
      const card = parseCard(await readFile(path, 'utf8'), path)
      if (card !== undefined) cards.push(card)
    } catch {
      // A hand-edited card should not make the rest of the vault unavailable.
    }
  }
  return cards
}

function appendObservation(body: string, draft: ConceptCardDraft, now: Date): string {
  const lines = [`## 新近观察（${dateKey(now)}）`]
  if (draft.explanation !== '') lines.push(...draft.explanation.split('\n').map(line => `> ${line}`))
  if (draft.misconceptions.length > 0) lines.push(`误解：${draft.misconceptions.join('；')}`)
  if (draft.unverifiedTransfer !== '') lines.push(`未验证：${draft.unverifiedTransfer}`)
  if (draft.relatedConcepts.length > 0) lines.push(`相关概念：${draft.relatedConcepts.map(value => `[[${value}]]`).join('、')}`)
  return `${body.trimEnd()}\n\n${lines.join('\n')}\n`
}

export async function saveConceptCard(
  vault: TopicVault,
  draft: ConceptCardDraft,
  now = new Date(),
): Promise<ConceptCard> {
  const path = conceptCardPathOf(vault, draft.conceptSlug)
  const existing = await readConceptCard(vault, draft.conceptSlug)
  const activeAnchors = list([...(existing?.anchors ?? []), ...draft.anchors])
  const staleAnchors = list([...(existing?.staleAnchors ?? []), ...draft.staleAnchors])
    .filter(anchor => !activeAnchors.includes(anchor))
  const next: ConceptCard = {
    ...(existing ?? {}),
    ...draft,
    due: existing === undefined ? draft.due : existing.due,
    intervalDays: existing === undefined ? draft.intervalDays : existing.intervalDays,
    lastReviewedAt: existing?.lastReviewedAt ?? null,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    anchors: activeAnchors,
    staleAnchors,
    body: existing === undefined ? bodyFromDraft(draft, now) : appendObservation(existing.body, draft, now),
    path,
  }
  await mkdir(vault.concepts, { recursive: true })
  await writeFile(path, renderConceptCard(next, now), 'utf8')
  return next
}

export async function updateConceptCardSchedule(
  vault: TopicVault,
  conceptSlug: string,
  schedule: ConceptCardSchedule,
): Promise<ConceptCard | undefined> {
  const card = await readConceptCard(vault, conceptSlug)
  if (card === undefined) return undefined
  const next: ConceptCard = {
    ...card,
    due: schedule.due,
    intervalDays: schedule.intervalDays,
    lastReviewedAt: schedule.lastReviewedAt,
    updatedAt: schedule.lastReviewedAt,
  }
  await writeFile(card.path, renderConceptCard(next), 'utf8')
  return next
}

export async function updateConceptCardAnchors(
  vault: TopicVault,
  conceptSlug: string,
  anchors: readonly string[],
  staleAnchors: readonly string[],
): Promise<ConceptCard | undefined> {
  const card = await readConceptCard(vault, conceptSlug)
  if (card === undefined) return undefined
  const next: ConceptCard = {
    ...card,
    anchors: list(anchors),
    staleAnchors: list(staleAnchors).filter(anchor => !anchors.includes(anchor)),
    updatedAt: new Date().toISOString(),
  }
  await writeFile(card.path, renderConceptCard(next), 'utf8')
  return next
}

export function conceptRecordFromCard(card: ConceptCard): LearnerConceptRecord {
  return {
    conceptSlug: card.conceptSlug,
    label: card.label,
    mastery: card.mastery,
    masteryBasis: card.masteryBasis,
    phase: 'complete',
    gap: 'unknown',
    misconceptions: card.misconceptions,
    anchors: card.anchors,
    staleAnchors: card.staleAnchors,
    evidenceCount: 0,
    due: card.due,
    reviewIntervalDays: card.intervalDays,
    lastReviewedAt: card.lastReviewedAt,
    updatedAt: card.updatedAt,
    sessionIds: [],
  }
}

/** Merge user-approved cards into the machine memory only for prompt/UI reads. */
export async function readLearnerMemoryWithCards(vault: TopicVault): Promise<LearnerMemory> {
  const [memory, cards] = await Promise.all([readLearnerMemory(vault), readConceptCards(vault)])
  const concepts = [...memory.concepts]
  for (const card of cards) {
    const index = concepts.findIndex(concept => concept.conceptSlug === card.conceptSlug)
    if (index < 0) {
      concepts.push(conceptRecordFromCard(card))
      continue
    }
    const current = concepts[index]!
    concepts[index] = {
      ...current,
      label: card.label,
      due: card.due,
      reviewIntervalDays: card.intervalDays,
      lastReviewedAt: card.lastReviewedAt,
      anchors: card.anchors,
      staleAnchors: card.staleAnchors,
      updatedAt: current.updatedAt > card.updatedAt ? current.updatedAt : card.updatedAt,
    }
  }
  return { protocol: memory.protocol, concepts }
}

export function conceptCardDraftFromState(
  state: LearnerState,
  options: {
    explanation?: string
    unverifiedTransfer?: string
    relatedConcepts?: readonly string[]
  } = {},
  now = new Date(),
): ConceptCardDraft | undefined {
  const label = text(state.goal, 160)
  if (label === '' || !hasFreshIndependentTransfer(state)) return undefined
  const transfer = [...state.evidence]
    .reverse()
    .find(isFreshIndependentTransfer)
  const explanation = text(options.explanation) || text(transfer?.summary ?? state.lastExplanationSummary ?? '')
  const misconceptions = list([
    ...(state.currentMisconception === null ? [] : [state.currentMisconception]),
    ...state.misconceptions,
  ], 6)
  return {
    conceptSlug: slugify(label, 'concept'),
    label,
    mastery: state.mastery,
    masteryBasis: state.masteryBasis,
    due: addDays(now, INITIAL_REVIEW_INTERVAL_DAYS),
    intervalDays: reviewIntervalDays(state.mastery, transfer?.independence),
    anchors: list(state.sourceAnchors),
    staleAnchors: [],
    explanation,
    misconceptions,
    unverifiedTransfer: text(options.unverifiedTransfer),
    relatedConcepts: list((options.relatedConcepts ?? []).map(relatedName), 6),
  }
}

export function recallCardIdOf(conceptSlug: string): string {
  return `concept-${createHash('sha256').update(conceptSlug, 'utf8').digest('hex').slice(0, 12)}`
}

/** Re-anchor durable cards when an imported source is rebuilt. */
export async function reanchorConceptCards(
  vault: TopicVault,
  previous: SourceStructure | undefined,
  next: SourceStructure,
): Promise<ReanchorOutcome> {
  const total: ReanchorOutcome = { moved: 0, unchanged: 0, stale: 0, recovered: 0 }
  for (const card of await readConceptCards(vault)) {
    const result = reanchorAnchorLists(card.anchors, card.staleAnchors, previous, next)
    total.moved += result.outcome.moved
    total.unchanged += result.outcome.unchanged
    total.stale += result.outcome.stale
    total.recovered += result.outcome.recovered
    if (result.changed) {
      await updateConceptCardAnchors(vault, card.conceptSlug, result.anchors, result.staleAnchors)
    }
  }
  return total
}
