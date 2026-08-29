/**
 * State-driven retrieval: the learner's state decides what to look for, not the
 * learner's question.
 *
 * Every other retrieval interface in this space takes a query string. This one
 * takes none. `LearnerGap`, `currentMisconception`, `failedMoves`, and `phase`
 * are already maintained by the teaching loop, and they say something a question
 * does not: WHY the next passage is needed. "The learner believes closures
 * capture values" calls for counter-evidence; "the worked example already
 * failed" calls for a different example, not the same one again.
 *
 * `planRetrieval` is therefore a pure function over state, which makes retrieval
 * quality a deterministic property that can be unit-tested rather than a matter
 * of prompt luck.
 * @module @dsh-portable/interactive-learning/src/material-retrieval
 */

import { normalizeQuote, type SourceSection, type SourceStructure } from './ingest/types.ts'
import type { LearnerState } from './learner-state.ts'
import { formatSectionAnchor } from './material-anchor.ts'
import { readLearnerMemory } from './learner-memory.ts'
import { slugify } from './ingest/types.ts'
import { ensureLexicalIndex, readSourceChunks, searchLexicalIndex } from './index/lexical.ts'
import { activeSourceIds, readAllStructures, type TopicVault } from './topic-vault.ts'

/**
 * Why the next passage is being retrieved. A closed set: each member names a
 * teaching situation the state can actually distinguish, and each maps to a
 * different thing to look for in the material.
 */
export const RETRIEVAL_INTENTS = [
  'counter-evidence',
  'second-example',
  'prerequisite-backfill',
  'notation-decode',
  'transfer-context',
  'verbatim-anchor',
] as const

export type RetrievalIntent = typeof RETRIEVAL_INTENTS[number]

/** What to retrieve, and why. Derived entirely from learner state. */
export interface RetrievalPlan {
  intent: RetrievalIntent
  /** The state fields that selected this intent, for the tool result and tests. */
  rationale: string
  /** Literal phrases to look for; derived from state, never model-supplied. */
  terms: readonly string[]
  /** Anchors already cited this session, preferred when ranking. */
  preferredAnchors: readonly string[]
  /** Whether what the learner said in earlier sessions changes the next move. */
  includeLearnerPrior: boolean
  /** Characters of material this plan may spend. */
  budgetChars: number
}

/** Default per-turn material budget; matches the eval's budget metric. */
export const DEFAULT_RETRIEVAL_BUDGET_CHARS = 4_000

/** Passages one plan returns before the budget is spent. */
const MAX_PASSAGES = 4
/** Terms one plan carries. */
const MAX_TERMS = 6
/** Learner-prior excerpts returned. */
const MAX_PRIOR = 3
/** Characters kept per learner-prior excerpt. */
const MAX_PRIOR_CHARS = 400

/**
 * Words too common to discriminate between sections. Deliberately short: a
 * general stopword list would need per-language maintenance, while these are the
 * connectives that appear in every heading of every document.
 */
const STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'what', 'why', 'how',
  'are', 'was', 'were', 'has', 'have', 'not', 'but', 'its', 'into', 'about',
  'learn', 'learning', 'teach', 'explain', 'explanation', 'understand',
  '的', '了', '和', '是', '在', '与', '及', '或', '这个', '那个', '什么', '为什么', '怎么',
  '理解', '学习', '学会', '掌握', '解释', '讲解', '教我',
])

const LATIN_WORD = /[\p{Letter}\p{Number}][\p{Letter}\p{Number}'-]*/gu
const CJK_RUN = /[㐀-鿿豈-﫿]{2,}/gu
/** Non-global companion for membership tests; see `keyPhrases`. */
const CJK_START = /^[㐀-鿿豈-﫿]/u

/**
 * Grammatical particles that act as de-facto word separators in written
 * Chinese. Splitting on them turns a run like the learner's own sentence into
 * the two or three compounds a reader would actually name.
 */
const CJK_PARTICLES = /[的是了和在与及或不把被就都也很]/u

/** A CJK compound longer than this rarely appears verbatim in the source. */
const MAX_CJK_PHRASE = 4
/** Bigrams emitted from one over-long compound. */
const MAX_BIGRAMS = 4

/**
 * Extract literal phrases worth searching for from a piece of learner-state
 * prose.
 *
 * The two scripts need different handling because a term has to be a SUBSTRING
 * of the source to match anything. Latin text splits on whitespace and each word
 * is already the right size. CJK has no word boundary, and taking a contiguous
 * run whole produces a ten-character phrase that will never appear verbatim — so
 * runs are split on grammatical particles, short compounds are kept as they are,
 * and an over-long compound falls back to character bigrams.
 *
 * The bigrams are deliberately noisy. Most match nothing and therefore score
 * nothing, while the real compounds inside the run do match; since ranking
 * counts DISTINCT matched terms, the noise costs precision in the term list but
 * not in the ranking.
 * @param text - Goal, misconception, or similar state prose.
 * @returns bounded, deduplicated phrases, most specific first.
 */
export function keyPhrases(text: string): readonly string[] {
  const normalized = normalizeQuote(text)
    .replace(/(?:教我|学习|学会|理解|掌握|解释|讲解|了解|教|讲)(?=[㐀-鿿豈-﫿])/gu, '')
  if (normalized === '') return []
  const whole: string[] = []
  const bigrams: string[] = []
  const push = (into: string[], value: string): void => {
    const phrase = value.trim()
    if (phrase.length < 2) return
    if (STOPWORDS.has(phrase.toLowerCase())) return
    if (whole.includes(phrase) || bigrams.includes(phrase)) return
    into.push(phrase)
  }

  for (const match of normalized.matchAll(CJK_RUN)) {
    for (const compound of match[0].split(CJK_PARTICLES)) {
      if (compound.length >= 2 && compound.length <= MAX_CJK_PHRASE) {
        push(whole, compound)
        continue
      }
      for (let index = 0; index + 2 <= compound.length && index < MAX_BIGRAMS; index += 1) {
        push(bigrams, compound.slice(index, index + 2))
      }
    }
  }
  for (const match of normalized.matchAll(LATIN_WORD)) {
    const word = match[0]
    // A separate non-global pattern: `CJK_RUN` carries the `g` flag, and `.test`
    // on a global regex advances `lastIndex`, so reusing it here would make this
    // function's result depend on how often it had been called.
    if (CJK_START.test(word)) continue
    if (word.length >= 3) push(whole, word)
  }
  // Whole compounds first: they are the specific terms, and the term budget is
  // small enough that bigrams should only fill what is left.
  return [...whole, ...bigrams].slice(0, MAX_TERMS)
}

/** Intents for which the learner's own earlier words change the next move. */
const PRIOR_RELEVANT: ReadonlySet<RetrievalIntent> = new Set<RetrievalIntent>([
  'counter-evidence',
  'second-example',
  'transfer-context',
])

const EXAMPLE_MOVES: ReadonlySet<string> = new Set(['worked_example', 'example', 'guided_discovery'])

/**
 * Derive what to retrieve from the current learner state.
 *
 * Precedence is deliberate and ordered by how much the situation constrains the
 * answer: a live misconception needs contradicting evidence before anything
 * else, a failed example needs a different one, and only when nothing more
 * specific applies does this fall back to finding where the material states the
 * goal.
 *
 * `focus` is the exception to that ordering. State is an inference about what
 * the learner needs; a phrase they typed is not. When one is supplied it leads
 * the search and can plan a retrieval on its own, so a learner who names a
 * section gets it even in a session whose state is still empty.
 * @param state - The current learner state.
 * @param budgetChars - Material budget for this turn.
 * @param focus - The learner's own words about what to find, when they said.
 * @returns the plan, or `undefined` when neither state nor focus says anything.
 */
export function planRetrieval(
  state: LearnerState,
  budgetChars = DEFAULT_RETRIEVAL_BUDGET_CHARS,
  focus = '',
): RetrievalPlan | undefined {
  const goalTerms = keyPhrases(state.goal ?? '')
  const focusTerms = keyPhrases(focus)

  const build = (
    intent: RetrievalIntent,
    rationale: string,
    extra: readonly string[] = [],
  ): RetrievalPlan => ({
    intent,
    rationale,
    // Keep the first two goal terms as the stable concept query, then add the
    // situation terms. A long learner misconception must not crowd the concept
    // itself out of the bounded search plan.
    terms: [...new Set([
      ...focusTerms,
      ...goalTerms.slice(0, 2),
      ...extra,
      ...goalTerms.slice(2),
    ])].slice(0, MAX_TERMS),
    preferredAnchors: state.sourceAnchors.slice(0, 4),
    includeLearnerPrior: PRIOR_RELEVANT.has(intent),
    budgetChars,
  })

  if (state.currentMisconception !== null && state.currentMisconception !== '') {
    return build(
      'counter-evidence',
      `currentMisconception is set, so the material that contradicts it decides the next move`,
      keyPhrases(state.currentMisconception),
    )
  }
  if (state.failedMoves.some(failed => EXAMPLE_MOVES.has(failed.move))) {
    return build(
      'second-example',
      'an example-shaped move already failed, so a different example is needed rather than the same one',
    )
  }
  if (state.gap === 'prerequisite') {
    return build('prerequisite-backfill', 'gap is prerequisite, so the missing earlier rule is what to find')
  }
  if (state.gap === 'notation') {
    return build('notation-decode', 'gap is notation, so where the material defines the symbols is what to find')
  }
  if (state.phase === 'transfer') {
    return build('transfer-context', 'phase is transfer, so a different context for the same idea is what to find')
  }
  if (goalTerms.length === 0 && focusTerms.length === 0) return undefined
  return build('verbatim-anchor', focusTerms.length === 0
    ? 'no more specific situation applies, so find where the material states the goal'
    : 'the learner named what to look for, so their own words lead the search')
}

/** One retrieved passage, ready to cite. */
export interface RetrievedPassage {
  chunkId: string
  sourceId: string
  sectionId: string
  label: string
  anchor: string
  page?: number
  text: string
  matchedTerms: readonly string[]
}

/** One thing the learner said about this concept in an earlier session. */
export interface LearnerPriorExcerpt {
  sessionId: string
  when: string
  text: string
}

/** What one retrieval produced. */
export interface RetrievalResult {
  plan: RetrievalPlan
  passages: readonly RetrievedPassage[]
  learnerPrior: readonly LearnerPriorExcerpt[]
  /** Characters of material text in `passages`; the budget metric's input. */
  usedChars: number
}

/** A chunk with its source section and the terms it matched. */
interface ScoredSection {
  chunkId: string
  structure: SourceStructure
  section: SourceSection
  body: string
  matched: readonly string[]
  score: number
}

/** Return the supplied terms that occur in a body, preserving their order. */
export function matchedTerms(
  body: string,
  terms: string | readonly string[],
): readonly string[] {
  const candidates = typeof terms === 'string' ? [terms] : terms
  const haystack = body.toLocaleLowerCase()
  return candidates.filter(term => term.trim() !== '' && haystack.includes(term.toLocaleLowerCase()))
}

/** Excerpt around the first matched term, bounded. */
export function excerptAround(
  body: string,
  matched: string | readonly string[],
  limit: number,
): string {
  const terms = typeof matched === 'string' ? [matched] : matched
  const trimmed = body.trim()
  if (limit <= 0) return ''
  if (trimmed.length <= limit) return trimmed
  const first = terms[0]?.toLowerCase()
  const at = first === undefined ? -1 : trimmed.toLowerCase().indexOf(first)
  const from = at < 0 ? 0 : Math.max(0, at - Math.floor(limit / 3))
  const prefix = from > 0 ? '…' : ''
  const suffix = '…'
  const contentLimit = limit - prefix.length - suffix.length
  if (contentLimit <= 0) return `${prefix}${suffix}`.slice(0, limit)
  const slice = trimmed.slice(from, from + contentLimit).trim()
  return `${prefix}${slice}${suffix}`
}

const excerpt = excerptAround

/** The session-query reads this module uses; opportunistic, never required. */
interface SessionQueryLike {
  filterEvents(
    sessionId: string,
    filters: readonly ({ kind: 'type'; values: readonly string[] } | { kind: 'text'; text: string })[],
  ): Promise<readonly { seq: number; time: number; text: string }[]>
}

/**
 * Retrieve what the learner said about this concept in earlier sessions.
 *
 * This is the leg nothing else in the space has: it needs both a durable record
 * of WHICH sessions taught a concept (learner memory) and a way to scan those
 * sessions' own text. A composition with no `sessionQuery` simply gets none.
 */
async function retrieveLearnerPrior(
  sessionQuery: SessionQueryLike | undefined,
  vault: TopicVault,
  state: LearnerState,
  plan: RetrievalPlan,
): Promise<readonly LearnerPriorExcerpt[]> {
  if (sessionQuery === undefined || !plan.includeLearnerPrior) return []
  const goal = state.goal?.trim() ?? ''
  if (goal === '') return []
  const memory = await readLearnerMemory(vault)
  const concept = memory.concepts.find(candidate => candidate.conceptSlug === slugify(goal, 'concept'))
  if (concept === undefined) return []

  const term = keyPhrases(goal)[0]
  const excerpts: LearnerPriorExcerpt[] = []
  for (const sessionId of concept.sessionIds) {
    if (excerpts.length >= MAX_PRIOR) break
    if (sessionId === state.sessionId) continue
    try {
      const documents = await sessionQuery.filterEvents(sessionId, [
        { kind: 'type', values: ['user/message'] },
        ...(term === undefined ? [] : [{ kind: 'text' as const, text: term }]),
      ])
      for (const document of documents.slice(-MAX_PRIOR)) {
        if (excerpts.length >= MAX_PRIOR) break
        const text = normalizeQuote(document.text)
        if (text === '') continue
        excerpts.push({
          sessionId,
          when: new Date(document.time).toISOString(),
          text: text.slice(0, MAX_PRIOR_CHARS),
        })
      }
    } catch {
      // A session that cannot be read (deleted log, unreadable persistence) is
      // one missing excerpt, never a failed teaching turn.
      continue
    }
  }
  return excerpts
}

/**
 * Execute one plan against a vault.
 * @param vault - The vault to retrieve from.
 * @param plan - The plan from {@link planRetrieval}.
 * @param state - The state the plan came from, for the learner-prior leg.
 * @param sessionQuery - Optional `ctx.sessionQuery`.
 * @returns the passages, bounded by the plan's budget.
 */
export async function executeRetrievalPlan(
  vault: TopicVault,
  plan: RetrievalPlan,
  state: LearnerState,
  sessionQuery?: SessionQueryLike,
  options: { sourceIds?: readonly string[] } = {},
): Promise<RetrievalResult> {
  const structures = await readAllStructures(vault)
  const bySource = new Map(structures.map(structure => [structure.sourceId, structure]))
  const index = await ensureLexicalIndex(vault)
  const sourceIds = options.sourceIds ?? await activeSourceIds(vault)
  const chunksBySource = new Map<string, Awaited<ReturnType<typeof readSourceChunks>>>()
  const scored: ScoredSection[] = []
  const candidates = searchLexicalIndex(index, plan.terms, {
    sourceIds,
    limit: 60,
  })
  for (const hit of candidates) {
    const structure = bySource.get(hit.sourceId)
    if (structure === undefined) continue
    let sourceChunks = chunksBySource.get(hit.sourceId)
    if (sourceChunks === undefined) {
      sourceChunks = await readSourceChunks(vault, hit.sourceId)
      chunksBySource.set(hit.sourceId, sourceChunks)
    }
    const chunk = sourceChunks.find(candidate => candidate.chunkId === hit.chunkId)
    const section = structure.sections.find(candidate => candidate.id === hit.sectionId)
    if (chunk === undefined || section === undefined) continue
    const preferred = plan.preferredAnchors.some(candidate =>
      candidate.includes(section.label) || chunk.anchor === candidate)
    if (plan.intent === 'second-example' && preferred) continue
    scored.push({
      chunkId: hit.chunkId,
      structure,
      section,
      body: chunk.text,
      matched: hit.matchedTerms,
      score: hit.score + (plan.intent === 'second-example' ? 0 : preferred ? 1 : 0),
    })
  }

  scored.sort((left, right) => right.score - left.score || left.section.line - right.section.line)

  const passages: RetrievedPassage[] = []
  let usedChars = 0
  for (const candidate of scored) {
    if (passages.length >= MAX_PASSAGES) break
    const remaining = plan.budgetChars - usedChars
    if (remaining <= 0) break
    // Bounded at plan time rather than truncated afterwards: a passage that
    // would not fit is never assembled, so no budget is spent producing text
    // the turn cannot use.
    const perPassage = Math.min(remaining, Math.ceil(plan.budgetChars / MAX_PASSAGES))
    const text = excerpt(candidate.body, candidate.matched, perPassage)
    if (text === '') continue
    usedChars += text.length
    passages.push({
      chunkId: candidate.chunkId,
      sourceId: candidate.structure.sourceId,
      sectionId: candidate.section.id,
      label: candidate.section.label,
      anchor: formatSectionAnchor(candidate.structure.sourceId, candidate.section),
      ...(candidate.section.page === undefined ? {} : { page: candidate.section.page }),
      text,
      matchedTerms: candidate.matched,
    })
  }

  return {
    plan,
    passages,
    learnerPrior: await retrieveLearnerPrior(sessionQuery, vault, state, plan),
    usedChars,
  }
}
