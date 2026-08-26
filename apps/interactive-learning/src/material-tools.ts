/**
 * The model-facing material tools: `learning_material_map`,
 * `learning_material_read`, `learning_material_search`, and
 * `learning_material_recall`.
 *
 * All four are READ-ONLY and confined to the session's own vault. The preset
 * deliberately does not mount `dsh-tool-fs`, which would also grant `write` and
 * `edit`; the model's whole filesystem reach is these four calls, and every
 * path they accept is contained through {@link containedPath} before any read.
 *
 * Reads address SECTIONS, not line offsets. The extracted markdown is written by
 * this package's own emitter, so a section id is both stable and verifiable —
 * which is what turns a cited anchor from a claim into something the eval can
 * check against `.learning/structure/`.
 * @module @dsh-portable/interactive-learning/src/material-tools
 */

import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { defineTool, type ToolDefinition, type ToolRuntime } from '@deepseek-ai/dsh-tools'
import { describeDegradation } from './ingest/pipeline.ts'
import { formatSectionAnchor } from './material-anchor.ts'
import { describeReanchor } from './material-reanchor.ts'
import {
  RETRIEVAL_INTENTS,
  executeRetrievalPlan,
  planRetrieval,
} from './material-retrieval.ts'
import { syncMentionedMaterial } from './material-intake.ts'
import type { SourceSection, SourceStructure } from './ingest/types.ts'
import type { LearnerState } from './learner-state.ts'
import {
  containedPath,
  readAllStructures,
  readManifest,
  readStructure,
  resolveTopicVault,
  type TopicVault,
} from './topic-vault.ts'

/** The material tools, in catalog order. */
export const MATERIAL_TOOL_NAMES = [
  'learning_material_map',
  'learning_material_read',
  'learning_material_search',
  'learning_material_recall',
] as const

/** Characters one read returns before it degrades to an outline. */
export const MAX_READ_CHARS = 6_000
/** Matches one search returns inline. */
export const MAX_SEARCH_MATCHES = 24
/** Sections one map call lists before it collapses to top levels only. */
export const MAX_MAP_SECTIONS = 60
/** Characters of surrounding text shown per search match. */
const MATCH_PREVIEW_CHARS = 180

/** Told to the model when the session is not running inside a learning vault. */
const NO_VAULT = Object.freeze({
  status: 'no-vault' as const,
  detail: 'This session has no learning vault, so there is no stored material to read. '
    + 'Ask the learner to open a learning folder and add their material, and teach from '
    + 'conversation in the meantime. Do not claim to have read any source.',
})

type NoVault = typeof NO_VAULT

function closeRoot<T extends ToolDefinition>(tool: T): T {
  return { ...tool, parameters: { ...tool.parameters, additionalProperties: false } } as T
}

/** Human-readable anchor for one section, the form that reaches `sourceAnchors`. */
export function sectionAnchor(structure: SourceStructure, section: SourceSection): string {
  return formatSectionAnchor(structure.sourceId, section)
}

/**
 * What the material tools need from their context. `learningActivities` is the
 * broker holding the folded learner state that drives recall.
 */
export type MaterialToolContext = Context & {
  tools: ToolRuntime
  learningActivities: { learnerState(agent: Agent): LearnerState }
}

/** The vault this agent's session runs in, if any. */
async function vaultOf(ctx: Context, agent: Agent | undefined): Promise<TopicVault | undefined> {
  const cwd = agent?.session.header.cwd
  return cwd === undefined ? undefined : await resolveTopicVault(ctx, cwd)
}

/** Extracted markdown lines of one source, contained before reading. */
async function extractedLines(vault: TopicVault, structure: SourceStructure): Promise<readonly string[]> {
  const path = await containedPath(vault, structure.extractedPath)
  return (await readFile(path, 'utf8')).split('\n')
}

/** The section a 1-based extracted-file line falls inside. */
function sectionAtLine(structure: SourceStructure, line: number): SourceSection | undefined {
  let best: SourceSection | undefined
  for (const section of structure.sections) {
    if (section.line <= line && (best === undefined || section.line > best.line)) best = section
  }
  return best
}

/** Coverage sentence for one source, or `''` when it parsed cleanly. */
function coverageOf(structure: SourceStructure): string {
  return describeDegradation({
    status: 'ingested',
    sourceId: structure.sourceId,
    title: structure.title,
    entry: {
      sourceId: structure.sourceId,
      title: structure.title,
      originalName: '',
      sourcePath: '',
      extractedPath: structure.extractedPath,
      structurePath: '',
      contentHash: '',
      parser: structure.parser,
      bytes: 0,
      ingestedAt: '',
      degradation: structure.degradation,
    },
  })
}

/**
 * Every status a material tool can answer with. A closed set so a caller can
 * branch on it, and so "there is no material" can never be confused with "the
 * material says nothing".
 */
const MATERIAL_STATUSES = [
  'ok', 'no-vault', 'empty', 'unknown-source', 'unknown-section', 'invalid',
  'no-plan', 'no-match',
] as const

const status = { type: 'string', enum: MATERIAL_STATUSES, required: true } as const
const detail = { type: 'string' } as const
const known = { type: 'array', items: { type: 'string' } } as const

const outlineRow = {
  type: 'object', additionalProperties: false, properties: {
    id: { type: 'string', required: true },
    label: { type: 'string', required: true },
    level: { type: 'integer', required: true },
    page: { type: 'integer' },
  },
} as const

const sectionRow = {
  type: 'object', additionalProperties: false, properties: {
    id: { type: 'string', required: true },
    label: { type: 'string', required: true },
    level: { type: 'integer', required: true },
    page: { type: 'integer' },
    anchor: { type: 'string', required: true },
    chars: { type: 'integer', required: true },
  },
} as const

const sourceRow = {
  type: 'object', additionalProperties: false, properties: {
    sourceId: { type: 'string', required: true },
    title: { type: 'string', required: true },
    parser: { type: 'string', required: true },
    sectionCount: { type: 'integer', required: true },
    coverage: {
      type: 'string', required: true,
      description: 'What could NOT be read from this source; empty when it parsed cleanly.',
    },
    outline: { type: 'array', required: true, items: outlineRow },
  },
} as const

const mapOutput = {
  type: 'object', additionalProperties: false, properties: {
    status, detail, known,
    vault: { type: 'string' },
    sources: { type: 'array', items: sourceRow },
    sourceId: { type: 'string' },
    title: { type: 'string' },
    parser: { type: 'string' },
    coverage: { type: 'string' },
    complete: { type: 'boolean' },
    added: {
      type: 'array',
      items: { type: 'string' },
      description: 'Sources ingested just now from what the learner attached, each with its coverage boundary.',
    },
    sections: { type: 'array', items: sectionRow },
  },
} as const

const childRow = {
  type: 'object', additionalProperties: false, properties: {
    id: { type: 'string', required: true },
    label: { type: 'string', required: true },
    page: { type: 'integer' },
    chars: { type: 'integer', required: true },
  },
} as const

const readOutput = {
  type: 'object', additionalProperties: false, properties: {
    status, detail, known,
    sourceId: { type: 'string' },
    sectionId: { type: 'string' },
    label: { type: 'string' },
    page: { type: 'integer' },
    anchor: { type: 'string' },
    coverage: { type: 'string' },
    text: { type: 'string' },
    truncated: { type: 'boolean' },
    children: { type: 'array', items: childRow },
  },
} as const

const matchRow = {
  type: 'object', additionalProperties: false, properties: {
    sourceId: { type: 'string', required: true },
    sectionId: { type: 'string', required: true },
    label: { type: 'string', required: true },
    page: { type: 'integer' },
    anchor: { type: 'string', required: true },
    line: { type: 'integer', required: true },
    preview: { type: 'string', required: true },
  },
} as const

const searchOutput = {
  type: 'object', additionalProperties: false, properties: {
    status, detail,
    query: { type: 'string' },
    total: { type: 'integer' },
    shown: { type: 'integer' },
    matches: { type: 'array', items: matchRow },
  },
} as const

const passageRow = {
  type: 'object', additionalProperties: false, properties: {
    sourceId: { type: 'string', required: true },
    sectionId: { type: 'string', required: true },
    label: { type: 'string', required: true },
    anchor: {
      type: 'string', required: true,
      description: 'Cite this verbatim with source_anchors_observed.',
    },
    page: { type: 'integer' },
    text: { type: 'string', required: true },
    matchedTerms: { type: 'array', required: true, items: { type: 'string' } },
  },
} as const

const priorRow = {
  type: 'object', additionalProperties: false, properties: {
    sessionId: { type: 'string', required: true },
    when: { type: 'string', required: true },
    text: { type: 'string', required: true },
  },
} as const

const recallOutput = {
  type: 'object', additionalProperties: false, properties: {
    status, detail,
    intent: { type: 'string', enum: RETRIEVAL_INTENTS },
    rationale: {
      type: 'string',
      description: 'Which learner-state fields selected this intent. Do not narrate it to the learner.',
    },
    terms: { type: 'array', items: { type: 'string' } },
    usedChars: { type: 'integer' },
    passages: { type: 'array', items: passageRow },
    learnerPrior: {
      type: 'array',
      items: priorRow,
      description: 'What the learner said about this concept in EARLIER sessions; a prior to confirm, not evidence from this turn.',
    },
  },
} as const

/**
 * Register the material tools on a learning agent context.
 *
 * The tools are registered unconditionally so the tool catalog stays identical
 * across sessions — a catalog that changed with whether a vault happens to exist
 * would invalidate the request cache on every switch. A session with no vault
 * gets a structured `no-vault` answer instead of a missing tool.
 * @param ctx - The learning agent context, carrying `ctx.tools`.
 */
export function registerMaterialTools(ctx: MaterialToolContext): void {
  ctx.tools.register(closeRoot(defineTool({
    name: 'learning_material_map',
    description: [
      'Navigate the learner\'s own stored material. Returns the real section structure parsed from their sources — never a summary you wrote.',
      'Call this before describing, outlining, or citing any supplied source. Without a sourceId it lists every source and its top-level sections; with one it returns that source\'s section tree.',
      'The returned coverage line states which parts could NOT be read; repeat that boundary to the learner instead of implying the whole source was understood.',
      'Never mention a section, chapter, or page that is not in this result.',
      '中文模板：先看真实结构，再决定教什么；未读到的部分要如实说明。',
    ].join(' '),
    parameters: {
      sourceId: {
        type: 'string',
        description: 'Optional; omit to list every source in the vault.',
      },
    },
    output: {
      schema: mapOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const vault = await vaultOf(ctx, exec.agent)
      if (vault === undefined) return { ...NO_VAULT }
      // Files the learner attached this turn become readable here, before the
      // first answer about them is composed.
      const intake = await syncMentionedMaterial(exec.agent, vault)
      const added = intake.flatMap(result => [
        describeDegradation(result) || `${result.title}: read in full.`,
        // A reimport that moved the learner's own citations is something they
        // need told, not a silent bookkeeping detail.
        ...(result.reanchored === undefined
          ? []
          : [describeReanchor(result.reanchored, result.title)].filter(line => line !== '')),
      ])
      const sourceId = typeof args.sourceId === 'string' ? args.sourceId.trim() : ''

      if (sourceId === '') {
        const structures = await readAllStructures(vault)
        if (structures.length === 0) {
          return {
            status: 'empty' as const,
            detail: 'The learning folder holds no parsed material yet. Ask the learner to add a source.',
          }
        }
        const sources = structures.map(structure => ({
          sourceId: structure.sourceId,
          title: structure.title,
          parser: structure.parser,
          sectionCount: structure.sections.length,
          coverage: coverageOf(structure),
          outline: structure.sections
            .filter(section => section.level <= 2)
            .slice(0, 12)
            .map(section => ({
              id: section.id,
              label: section.label,
              level: section.level,
              ...(section.page === undefined ? {} : { page: section.page }),
            })),
        }))
        return { status: 'ok' as const, vault: vault.title, sources, added }
      }

      const structure = await readStructure(vault, sourceId)
      if (structure === undefined) {
        const known = (await readManifest(vault)).sources.map(entry => entry.sourceId)
        return {
          status: 'unknown-source' as const,
          detail: `No source '${sourceId}' in this learning folder.`,
          known,
        }
      }
      const complete = structure.sections.length <= MAX_MAP_SECTIONS
      const sections = (complete
        ? structure.sections
        : structure.sections.filter(section => section.level <= 2)
      ).map(section => ({
        id: section.id,
        label: section.label,
        level: section.level,
        ...(section.page === undefined ? {} : { page: section.page }),
        anchor: sectionAnchor(structure, section),
        chars: section.charCount,
      }))
      return {
        status: 'ok' as const,
        sourceId: structure.sourceId,
        title: structure.title,
        parser: structure.parser,
        coverage: coverageOf(structure),
        complete,
        ...(complete ? {} : {
          detail: `This source has ${structure.sections.length} sections; only levels 1-2 are listed. `
            + 'Read a section to see its children.',
        }),
        added,
        sections,
      }
    },
  })))

  ctx.tools.register(closeRoot(defineTool({
    name: 'learning_material_read',
    description: [
      'Read one section of the learner\'s stored material, addressed by the section id that learning_material_map returned.',
      'This is the only way to see a source\'s actual words. Do not assert what a section says without reading it first.',
      'A long section returns its opening plus its child section ids rather than the whole text: read the child you actually need, one at a time.',
      'The returned anchor is the exact citation to record with learning_state_update source_anchors_observed.',
      '中文模板：一次只读你真正要讲的那一节，并引用返回的锚点。',
    ].join(' '),
    parameters: {
      sourceId: { type: 'string', required: true },
      sectionId: {
        type: 'string',
        description: 'Section id from learning_material_map; omit to read the source\'s opening section.',
      },
      page: {
        type: 'integer',
        description: 'Optional page or slide number; resolves to the section covering it. Ignored when sectionId is given.',
      },
    },
    output: {
      schema: readOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const vault = await vaultOf(ctx, exec.agent)
      if (vault === undefined) return { ...NO_VAULT }
      await syncMentionedMaterial(exec.agent, vault)
      const sourceId = String(args.sourceId ?? '').trim()
      const structure = await readStructure(vault, sourceId)
      if (structure === undefined) {
        return {
          status: 'unknown-source' as const,
          detail: `No source '${sourceId}' in this learning folder.`,
          known: (await readManifest(vault)).sources.map(entry => entry.sourceId),
        }
      }
      if (structure.sections.length === 0) {
        return {
          status: 'empty' as const,
          sourceId,
          coverage: coverageOf(structure),
          detail: 'This source parsed to no sections; say so rather than describing its contents.',
        }
      }

      const requested = typeof args.sectionId === 'string' ? args.sectionId.trim() : ''
      const page = typeof args.page === 'number' ? args.page : undefined
      const section = requested !== ''
        ? structure.sections.find(candidate => candidate.id === requested)
        : page !== undefined
          ? [...structure.sections].reverse().find(candidate => (candidate.page ?? 0) <= page)
            ?? structure.sections[0]
          : structure.sections[0]
      if (section === undefined) {
        return {
          status: 'unknown-section' as const,
          sourceId,
          detail: `No section '${requested}' in '${sourceId}'.`,
          known: structure.sections.slice(0, 40).map(candidate => candidate.id),
        }
      }

      const lines = await extractedLines(vault, structure)
      const body = lines.slice(section.line - 1, section.endLine - 1).join('\n').trim()
      const children = structure.sections
        .filter(candidate => candidate.parentId === section.id)
        .map(candidate => ({
          id: candidate.id,
          label: candidate.label,
          ...(candidate.page === undefined ? {} : { page: candidate.page }),
          chars: candidate.charCount,
        }))
      const truncated = body.length > MAX_READ_CHARS
      return {
        status: 'ok' as const,
        sourceId,
        sectionId: section.id,
        label: section.label,
        ...(section.page === undefined ? {} : { page: section.page }),
        anchor: sectionAnchor(structure, section),
        coverage: coverageOf(structure),
        text: truncated ? `${body.slice(0, MAX_READ_CHARS)}\n…` : body,
        truncated,
        children,
      }
    },
  })))

  ctx.tools.register(closeRoot(defineTool({
    name: 'learning_material_search',
    description: [
      'Find a literal phrase inside the learner\'s stored material and get back the sections that contain it.',
      'Use it to locate where the material defines a term, states a rule, or gives another worked example — then read that section.',
      'Matching is literal and case-insensitive, not a regular expression. Results are section-anchored, so a hit is directly citable.',
      '中文模板：先定位材料里真正讲到这个词的地方，再去读那一节。',
    ].join(' '),
    parameters: {
      query: { type: 'string', required: true, description: 'Literal phrase to find.' },
      sourceId: { type: 'string', description: 'Optional; omit to search every source.' },
    },
    output: {
      schema: searchOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const vault = await vaultOf(ctx, exec.agent)
      if (vault === undefined) return { ...NO_VAULT }
      await syncMentionedMaterial(exec.agent, vault)
      const query = String(args.query ?? '').trim()
      if (query === '') {
        return { status: 'invalid' as const, detail: 'query must not be empty' }
      }
      const scope = typeof args.sourceId === 'string' ? args.sourceId.trim() : ''
      const all = await readAllStructures(vault)
      const structures = scope === ''
        ? all
        : all.filter(structure => structure.sourceId === scope)
      if (structures.length === 0) {
        return {
          status: scope === '' ? 'empty' as const : 'unknown-source' as const,
          detail: scope === ''
            ? 'The learning folder holds no parsed material yet.'
            : `No source '${scope}' in this learning folder.`,
        }
      }

      const needle = query.toLowerCase()
      const matches: {
        sourceId: string
        sectionId: string
        label: string
        page?: number
        anchor: string
        line: number
        preview: string
      }[] = []
      let total = 0
      for (const structure of structures) {
        const lines = await extractedLines(vault, structure)
        for (const [index, line] of lines.entries()) {
          if (!line.toLowerCase().includes(needle)) continue
          total += 1
          if (matches.length >= MAX_SEARCH_MATCHES) continue
          const section = sectionAtLine(structure, index + 1)
          if (section === undefined) continue
          const at = line.toLowerCase().indexOf(needle)
          const from = Math.max(0, at - MATCH_PREVIEW_CHARS / 2)
          matches.push({
            sourceId: structure.sourceId,
            sectionId: section.id,
            label: section.label,
            ...(section.page === undefined ? {} : { page: section.page }),
            anchor: sectionAnchor(structure, section),
            line: index + 1,
            preview: line.slice(from, from + MATCH_PREVIEW_CHARS).trim(),
          })
        }
      }
      return {
        status: 'ok' as const,
        query,
        total,
        shown: matches.length,
        ...(total > matches.length
          ? { detail: `${total} matches; showing the first ${matches.length}. Narrow the phrase or pass a sourceId.` }
          : {}),
        matches,
      }
    },
  })))

  ctx.tools.register(closeRoot(defineTool({
    name: 'learning_material_recall',
    description: [
      'Retrieve the passage the CURRENT TEACHING SITUATION calls for. Takes no query: what to look for is derived from the learner state you have been maintaining — an open misconception pulls up contradicting material, an example that already failed pulls up a different one, a prerequisite gap pulls up the missing earlier rule.',
      'Use it when you know what is wrong but not where the material addresses it. Use learning_material_search instead when you already know the exact phrase to find, and learning_material_read when you already know the section.',
      'The result names the retrieval intent and why it was chosen; teach from the passages and cite their anchors. Passages are bounded to a per-turn budget, so ask for one section with learning_material_read when you need more of it.',
      '中文模板：当前卡在哪里，就去材料里找能解开那一处的段落，而不是把整章拉进来。',
    ].join(' '),
    parameters: {},
    output: {
      schema: recallOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const vault = await vaultOf(ctx, exec.agent)
      if (vault === undefined) return { ...NO_VAULT }
      await syncMentionedMaterial(exec.agent, vault)

      const agent = exec.agent
      if (agent === undefined) {
        return { status: 'no-plan' as const, detail: 'recall requires a live agent session' }
      }
      const state = ctx.learningActivities.learnerState(agent)
      const plan = planRetrieval(state)
      if (plan === undefined) {
        return {
          status: 'no-plan' as const,
          detail: 'The learner state carries no goal, gap, or misconception yet, so there is nothing '
            + 'to retrieve for. Teach from conversation, or use learning_material_map to orient first.',
        }
      }

      const result = await executeRetrievalPlan(
        vault,
        plan,
        state,
        ctx.get('sessionQuery' as never) as Parameters<typeof executeRetrievalPlan>[3],
      )
      if (result.passages.length === 0 && result.learnerPrior.length === 0) {
        return {
          status: 'no-match' as const,
          intent: plan.intent,
          rationale: plan.rationale,
          terms: [...plan.terms],
          detail: 'Nothing in this learning folder matches what the current situation calls for. '
            + 'Say so rather than inventing material, and teach from conversation.',
        }
      }
      return {
        status: 'ok' as const,
        intent: plan.intent,
        rationale: plan.rationale,
        terms: [...plan.terms],
        usedChars: result.usedChars,
        passages: result.passages.map(passage => ({ ...passage, matchedTerms: [...passage.matchedTerms] })),
        learnerPrior: [...result.learnerPrior],
      }
    },
  })))
}

export type { NoVault }
export { sectionRow as MATERIAL_SECTION_SCHEMA }
