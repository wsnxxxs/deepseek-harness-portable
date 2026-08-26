/**
 * Material-grounding metrics: the three checks that turn "do not invent
 * sections, page anchors, or claims" from a standing instruction into something
 * measurable.
 *
 * All three are decided against `.learning/structure/` — the parse's own record
 * — and none needs a model judge. That is the point: a hallucinated chapter is a
 * string that is not in a list, and a citation is either present in the cited
 * section's text or it is not.
 * @module @dsh-portable/interactive-learning/src/eval-material
 */

import { normalizeQuote, type SourceStructure } from './ingest/types.ts'
import {
  anchorTargetsOf,
  mentionSupported,
  resolveAnchorTarget,
  sectionMentions,
  type AnchorTarget,
} from './material-anchor.ts'

export { sectionMentions } from './material-anchor.ts'

/** One section as the grader sees it: identity plus the text actually extracted. */
export interface GradedSection extends AnchorTarget {
  /** The section's own body text, as written to the extracted markdown. */
  text: string
}

/** One assistant turn under material grading. */
export interface MaterialTurnCandidate {
  /** The assistant's visible text for this turn. */
  text: string
  /** Anchors the turn recorded through `source_anchors_observed`. */
  sourceAnchors?: readonly string[]
  /**
   * Claims the turn attributes to the material. Each must be findable in one of
   * the sections the same turn cited.
   */
  citedClaims?: readonly string[]
  /** Characters of material text placed into this turn's request. */
  materialChars?: number
}

/** One trajectory graded against a known vault structure. */
export interface MaterialGroundingCandidate {
  caseId: string
  sections: readonly GradedSection[]
  turns: readonly MaterialTurnCandidate[]
}

/** Verdict shape shared by the material graders. */
export interface MaterialCheck {
  name: string
  passed: boolean
  detail: string
}

/** Result of one material grading pass. */
export interface MaterialVerdict {
  caseId: string
  passed: boolean
  checks: readonly MaterialCheck[]
}

/** Build grader sections from a real structure plus its extracted markdown. */
export function gradedSectionsFrom(
  structure: SourceStructure,
  extractedMarkdown: string,
): readonly GradedSection[] {
  const lines = extractedMarkdown.split('\n')
  return anchorTargetsOf(structure).map((target, index) => {
    const section = structure.sections[index]!
    return { ...target, text: lines.slice(section.line - 1, section.endLine - 1).join('\n') }
  })
}

/**
 * Anchor precision: the share of recorded anchors that resolve to a real
 * section, and of cited claims that appear in a section the same turn cited.
 *
 * A turn that cites nothing is not penalized — plenty of teaching turns make no
 * claim about the material. What is penalized is citing something that is not
 * there.
 * @param candidate - The trajectory and the structure it should be grounded in.
 * @param minimum - Precision required to pass; defaults to 1 (no tolerance).
 */
export function gradeAnchorPrecision(
  candidate: MaterialGroundingCandidate,
  minimum = 1,
): MaterialCheck {
  let anchors = 0
  let resolved = 0
  const unresolved: string[] = []
  const unsupportedClaims: string[] = []

  for (const turn of candidate.turns) {
    const cited: GradedSection[] = []
    for (const anchor of turn.sourceAnchors ?? []) {
      anchors += 1
      const section = resolveAnchorTarget(anchor, candidate.sections)
      if (section === undefined) unresolved.push(anchor)
      else {
        resolved += 1
        cited.push(section)
      }
    }
    for (const claim of turn.citedClaims ?? []) {
      anchors += 1
      const needle = normalizeQuote(claim)
      // A claim attributed to the material must be findable in a section this
      // same turn cited — not merely somewhere in the corpus.
      const scope = cited.length > 0 ? cited : []
      if (needle !== '' && scope.some(section => normalizeQuote(section.text).includes(needle))) resolved += 1
      else unsupportedClaims.push(claim)
    }
  }

  const precision = anchors === 0 ? 1 : resolved / anchors
  const problems = [
    ...unresolved.map(anchor => `unresolved anchor: ${anchor}`),
    ...unsupportedClaims.map(claim => `claim not in a cited section: ${claim}`),
  ]
  return {
    name: 'anchor-precision',
    passed: precision >= minimum,
    detail: anchors === 0
      ? 'no anchors or cited claims in this trajectory'
      : `${resolved}/${anchors} grounded (${precision.toFixed(2)})`
        + (problems.length === 0 ? '' : `; ${problems.slice(0, 5).join('; ')}`),
  }
}

/**
 * Hallucinated-section rate: how many section, chapter, or page references in
 * the assistant's own text do not exist in the parsed structure.
 *
 * The target is zero. This is the check that makes structure-driven maps worth
 * building — a map generated from the parse cannot fail it, while a summary the
 * model wrote from memory can.
 * @param candidate - The trajectory and its structure.
 * @param maximum - Rate allowed to pass; defaults to 0.
 */
export function gradeSectionHallucination(
  candidate: MaterialGroundingCandidate,
  maximum = 0,
): MaterialCheck {
  let mentions = 0
  const invented: string[] = []
  for (const turn of candidate.turns) {
    for (const mention of sectionMentions(turn.text)) {
      mentions += 1
      if (!mentionSupported(mention, candidate.sections)) invented.push(mention)
    }
  }
  const rate = mentions === 0 ? 0 : invented.length / mentions
  return {
    name: 'section-hallucination',
    passed: rate <= maximum,
    detail: mentions === 0
      ? 'no section references in this trajectory'
      : `${invented.length}/${mentions} unsupported (${rate.toFixed(2)})`
        + (invented.length === 0 ? '' : `; invented: ${invented.slice(0, 5).join(', ')}`),
  }
}

/** Distribution of material text sent per turn. */
export interface MaterialBudgetMetrics {
  turns: number
  totalChars: number
  maxChars: number
  meanChars: number
  overBudgetTurns: number
}

/** Default per-turn material budget: the "do not dump the source" line. */
export const DEFAULT_MATERIAL_BUDGET_CHARS = 4_000

/**
 * Summarize how much material actually reached the model per turn.
 *
 * This is the only honest evidence for the progressive-disclosure claim. A
 * design that retrieves narrowly and one that pastes the chapter can look
 * identical in a transcript; they do not look identical here.
 * @param candidate - The trajectory.
 * @param budget - Per-turn character budget.
 */
export function summarizeMaterialBudget(
  candidate: MaterialGroundingCandidate,
  budget = DEFAULT_MATERIAL_BUDGET_CHARS,
): MaterialBudgetMetrics {
  const counted = candidate.turns.map(turn => turn.materialChars ?? 0)
  const totalChars = counted.reduce((total, chars) => total + chars, 0)
  return {
    turns: counted.length,
    totalChars,
    maxChars: counted.length === 0 ? 0 : Math.max(...counted),
    meanChars: counted.length === 0 ? 0 : Math.round(totalChars / counted.length),
    overBudgetTurns: counted.filter(chars => chars > budget).length,
  }
}

/** Budget check in the shared verdict shape. */
export function gradeMaterialBudget(
  candidate: MaterialGroundingCandidate,
  budget = DEFAULT_MATERIAL_BUDGET_CHARS,
): MaterialCheck {
  const metrics = summarizeMaterialBudget(candidate, budget)
  return {
    name: 'material-budget',
    passed: metrics.overBudgetTurns === 0,
    detail: `max ${metrics.maxChars} chars, mean ${metrics.meanChars},`
      + ` ${metrics.overBudgetTurns}/${metrics.turns} turns over ${budget}`,
  }
}

/** Run all three material checks over one candidate. */
export function gradeMaterialGrounding(candidate: MaterialGroundingCandidate): MaterialVerdict {
  const checks = [
    gradeAnchorPrecision(candidate),
    gradeSectionHallucination(candidate),
    gradeMaterialBudget(candidate),
  ]
  return { caseId: candidate.caseId, passed: checks.every(check => check.passed), checks }
}

/** Grade a suite of material candidates. */
export function gradeMaterialSuite(
  candidates: readonly MaterialGroundingCandidate[],
): readonly MaterialVerdict[] {
  return candidates.map(gradeMaterialGrounding)
}

const REFERENCE_SECTIONS: readonly GradedSection[] = [
  {
    sourceId: 'js-guide',
    sectionId: 'javascript-权威指南/第3章-作用域',
    label: '第3章 作用域',
    headingPath: ['JavaScript 权威指南', '第3章 作用域'],
    page: 38,
    text: '作用域决定标识符的可见范围。',
  },
  {
    sourceId: 'js-guide',
    sectionId: 'javascript-权威指南/第3章-作用域/3-2-闭包',
    label: '3.2 闭包',
    headingPath: ['JavaScript 权威指南', '第3章 作用域', '3.2 闭包'],
    page: 42,
    text: '闭包捕获的是变量绑定，不是值。',
  },
]

/** Offline candidates the CLI grades with no external input; all must pass. */
export const OFFLINE_MATERIAL_CANDIDATES: readonly MaterialGroundingCandidate[] = [
  {
    caseId: 'material-grounded',
    sections: REFERENCE_SECTIONS,
    turns: [
      {
        text: '我们从 3.2 闭包 开始。',
        sourceAnchors: ['js-guide#JavaScript 权威指南 › 第3章 作用域 › 3.2 闭包 (p.42)'],
        citedClaims: ['闭包捕获的是变量绑定，不是值。'],
        materialChars: 320,
      },
    ],
  },
]

/**
 * The negative control: a turn that invents a chapter, invents a page, and
 * attributes a claim to material that never said it, while dumping the source
 * into the request.
 *
 * It exists so the metrics are known to measure something. A change that makes
 * this candidate pass has broken the graders, not improved the model — the specs
 * assert it fails every check.
 */
export const MATERIAL_NEGATIVE_CANDIDATES: readonly MaterialGroundingCandidate[] = [
  {
    caseId: 'material-invented',
    sections: REFERENCE_SECTIONS,
    turns: [
      {
        text: '正如第9章和 p.180 所说，闭包会自动释放内存。',
        sourceAnchors: ['js-guide#第9章 内存管理'],
        citedClaims: ['闭包会自动释放内存。'],
        materialChars: 9_000,
      },
    ],
  },
]
