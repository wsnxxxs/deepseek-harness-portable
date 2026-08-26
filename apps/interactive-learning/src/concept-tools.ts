/** Model-facing gates for saving and reviewing user-approved concept cards. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { defineTool, type ToolDefinition, type ToolRuntime } from '@deepseek-ai/dsh-tools'
import { UserQuestionError, type UserQuestionService } from '@deepseek-ai/dsh-user-questions'
import {
  conceptCardDraftFromState,
  conceptCardPathOf,
  isConceptDue,
  readConceptCard,
  readConceptCards,
  recallCardIdOf,
  renderConceptCard,
  saveConceptCard,
} from './concept-cards.ts'
import { conceptRecordFromState, upsertLearnerConcept } from './learner-memory.ts'
import type { LearnerState } from './learner-state.ts'
import { resolveTopicVault, type TopicVault } from './topic-vault.ts'

export const CONCEPT_TOOL_NAMES = [
  'learning_concept_propose',
  'learning_concept_recall',
] as const

const SAVE_LABEL = '保存概念卡'
const DECLINE_LABEL = '暂不保存'

const proposalOutput = {
  type: 'object', additionalProperties: false, properties: {
    status: {
      type: 'string',
      enum: ['saved', 'updated', 'declined', 'not-ready', 'no-vault', 'unavailable'],
      required: true,
    },
    detail: { type: 'string', required: true },
    conceptSlug: { type: 'string' },
    due: { type: 'string' },
    path: { type: 'string' },
  },
} as const

const recallCard = {
  type: 'object', additionalProperties: false, properties: {
    id: { type: 'string', required: true },
    prompt: { type: 'string', required: true },
    answer: { type: 'string', required: true },
    hint: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    due: { type: 'string', required: true },
    mastery: { type: 'string', required: true },
    stale: { type: 'boolean', required: true },
  },
} as const

const recallOutput = {
  type: 'object', additionalProperties: false, properties: {
    status: { type: 'string', enum: ['ok', 'empty', 'no-due', 'no-vault'], required: true },
    detail: { type: 'string' },
    cards: { type: 'array', items: recallCard },
  },
} as const

export type ConceptToolContext = Context & {
  tools: ToolRuntime
  learningActivities: { learnerState(agent: Agent): LearnerState }
}

function closeRoot<T extends ToolDefinition>(tool: T): T {
  return { ...tool, parameters: { ...tool.parameters, additionalProperties: false } } as T
}

async function vaultOf(ctx: Context, agent: Agent | undefined): Promise<TopicVault | undefined> {
  const cwd = agent?.session.header.cwd
  return cwd === undefined ? undefined : await resolveTopicVault(ctx, cwd)
}

function interactionOf(ctx: Context): UserQuestionService | undefined {
  return ctx.get('userQuestions' as never) as UserQuestionService | undefined
}

function errorCode(cause: unknown): string | undefined {
  return cause instanceof UserQuestionError
    ? (cause as UserQuestionError & { code?: string }).code
    : undefined
}

/** Register the host-mediated concept-card tools. */
export function registerConceptTools(ctx: ConceptToolContext): void {
  ctx.tools.register(closeRoot(defineTool({
    name: 'learning_concept_propose',
    description: [
      'After the learner has independently solved a fresh transfer, propose one durable concept card from this teaching segment. Do not call before that evidence exists.',
      'The Host shows the learner the exact Markdown card and asks for an explicit save decision. This tool never writes when the learner declines, and it never extracts an automatic concept graph.',
      'You may supply the learner explanation, an unverified transfer context, and explicit related concept names; use only what the learner actually said or what was explicitly discussed.',
      '中文模板：只有独立迁移完成后才提议保存；是否写入由学习者决定。',
    ].join(' '),
    parameters: {
      explanation: {
        type: 'string',
        description: 'Optional concise version of the learner\'s explanation, grounded in this segment.',
      },
      unverifiedTransfer: {
        type: 'string',
        description: 'Optional new context the learner has not independently demonstrated yet.',
      },
      relatedConcepts: {
        type: 'array', items: { type: 'string' },
        description: 'Optional explicit concept names to render as Obsidian [[wiki-links]]. Do not infer a graph.',
      },
    },
    output: {
      schema: proposalOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) {
        return { status: 'not-ready' as const, detail: 'A live learning session is required to propose a concept card.' }
      }
      const state = ctx.learningActivities.learnerState(agent)
      const draft = conceptCardDraftFromState(state, {
        explanation: typeof args.explanation === 'string' ? args.explanation : undefined,
        unverifiedTransfer: typeof args.unverifiedTransfer === 'string' ? args.unverifiedTransfer : undefined,
        relatedConcepts: Array.isArray(args.relatedConcepts) ? args.relatedConcepts : undefined,
      })
      if (draft === undefined) {
        return {
          status: 'not-ready' as const,
          detail: 'No correct, independent, fresh transfer is recorded yet; continue teaching instead of saving a card.',
        }
      }
      const vault = await vaultOf(ctx, agent)
      if (vault === undefined) {
        return { status: 'no-vault' as const, detail: 'This session is not inside a learning vault, so no concept card was written.' }
      }
      const interaction = interactionOf(ctx)
      if (interaction === undefined) {
        return { status: 'unavailable' as const, detail: 'No user-confirmation channel is available; no concept card was written.' }
      }

      let answer
      try {
        answer = await interaction.ask({
          questions: [{
            id: 'concept-card-confirm',
            header: '概念卡',
            question: '要把这次已经完成的独立迁移保存为概念卡吗？',
            detail: renderConceptCard(draft),
            options: [
              { label: SAVE_LABEL, description: '写入当前学习库的 concepts/，以后可以复习。' },
              { label: DECLINE_LABEL, description: '本次不写入，学习状态仍保留在会话记忆中。' },
            ],
          }],
          agent,
          signal: exec.signal,
        })
      } catch (cause) {
        const code = errorCode(cause)
        if (code === 'NO_PROVIDER' || code === 'ASK_CANCELLED' || code === 'ASK_ABORTED') {
          return { status: 'unavailable' as const, detail: 'The save decision was unavailable; no concept card was written.' }
        }
        throw cause
      }
      const item = answer.answers.find(candidate => candidate.id === 'concept-card-confirm')
      const accepted = item?.selected.length === 1 && item.selected[0] === SAVE_LABEL && item.custom === undefined
      if (!accepted) {
        return { status: 'declined' as const, detail: 'The learner did not save the concept card; no file was written.' }
      }

      const existing = await readConceptCard(vault, draft.conceptSlug)
      const card = await saveConceptCard(vault, draft)
      const record = conceptRecordFromState(state, String(agent.session.id))
      if (record !== undefined) {
        await upsertLearnerConcept(vault, {
          ...record,
          due: card.due,
          reviewIntervalDays: card.intervalDays,
          lastReviewedAt: card.lastReviewedAt,
          anchors: card.anchors,
          staleAnchors: card.staleAnchors,
        })
      }
      return {
        status: existing === undefined ? 'saved' as const : 'updated' as const,
        detail: existing === undefined
          ? 'The learner approved the concept card and it was saved in the learning vault.'
          : 'The learner approved the updated concept card; the existing note was retained and a new observation was added.',
        conceptSlug: card.conceptSlug,
        ...(card.due === null ? {} : { due: card.due }),
        path: conceptCardPathOf(vault, card.conceptSlug),
      }
    },
  })))

  ctx.tools.register(closeRoot(defineTool({
    name: 'learning_concept_recall',
    description: [
      'Read the learner\'s saved concept cards that are due for review. The cards come from concepts/*.md, not from generated guesses.',
      'Use the returned prompts, answers, and ids to build a recall_deck when a non-blocking review is useful; a self-rating is not mastery evidence.',
      'If there is no due card, continue the current teaching request instead of interrupting it for review.',
      '中文模板：只在适合时主动复习到期卡片，不要打断当前问题。',
    ].join(' '),
    parameters: {},
    output: {
      schema: recallOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => true,
    async execute(_args, exec) {
      const vault = await vaultOf(ctx, exec.agent)
      if (vault === undefined) return { status: 'no-vault' as const, detail: 'This session has no learning vault.' }
      const cards = await readConceptCards(vault)
      if (cards.length === 0) return { status: 'empty' as const, detail: 'No approved concept cards exist in this learning vault yet.' }
      const due = cards
        .filter(card => isConceptDue(card.due))
        .sort((left, right) => (left.due ?? '').localeCompare(right.due ?? ''))
      if (due.length === 0) {
        return { status: 'no-due' as const, detail: 'No saved concept card is due for review yet.' }
      }
      return {
        status: 'ok' as const,
        cards: due.slice(0, 16).map(card => ({
          id: recallCardIdOf(card.conceptSlug),
          prompt: `用自己的话解释“${card.label}”。`,
          answer: card.explanation || `概念卡：${card.label}`,
          ...(card.misconceptions[0] === undefined ? {} : { hint: `注意曾经的误解：${card.misconceptions[0]}` }),
          tags: [card.mastery, ...(card.staleAnchors.length > 0 ? ['stale-anchor'] : [])],
          due: card.due!,
          mastery: card.mastery,
          stale: card.staleAnchors.length > 0,
        })),
      }
    },
  })))
}
