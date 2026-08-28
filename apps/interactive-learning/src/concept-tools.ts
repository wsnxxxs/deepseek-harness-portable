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
import {
  CONCEPT_SAVE_DIALOG,
  type LearnerLocale,
  recallCardText,
  scriptLocaleOf,
} from './learner-locale.ts'
import { conceptRecordFromState, upsertLearnerConcept } from './learner-memory.ts'
import type { LearnerState } from './learner-state.ts'
import type { LearningRecallDeckV4 } from './protocol-current.ts'
import { resolveTopicVault, type TopicVault } from './topic-vault.ts'

export const CONCEPT_TOOL_NAMES = [
  'learning_concept_propose',
  'learning_concept_recall',
] as const



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
  learningActivities: {
    learnerState(agent: Agent): LearnerState
    turnLocale?(agent: Agent): LearnerLocale | undefined
  }
}

function closeRoot<T extends ToolDefinition>(tool: T): T {
  return { ...tool, parameters: { ...tool.parameters, additionalProperties: false } } as T
}

async function vaultOf(ctx: Context, agent: Agent | undefined): Promise<TopicVault | undefined> {
  const cwd = agent?.session.header.cwd
  return cwd === undefined ? undefined : await resolveTopicVault(ctx, cwd)
}

/** The language of the turn being served, when the broker has recorded one. */
function localeOf(ctx: ConceptToolContext, agent: Agent | undefined): LearnerLocale | undefined {
  return agent === undefined ? undefined : ctx.learningActivities.turnLocale?.(agent)
}

function interactionOf(ctx: Context): UserQuestionService | undefined {
  return ctx.get('userQuestions' as never) as UserQuestionService | undefined
}

function errorCode(cause: unknown): string | undefined {
  return cause instanceof UserQuestionError
    ? (cause as UserQuestionError & { code?: string }).code
    : undefined
}

/** Check that a generated recall deck still represents saved card content. */
export async function validateRecallDeckAgainstVault(
  vault: TopicVault,
  deck: LearningRecallDeckV4,
  turnLocale?: LearnerLocale,
): Promise<readonly string[]> {
  const cards = await readConceptCards(vault)
  const byId = new Map(cards.map(card => [recallCardIdOf(card.conceptSlug), card]))
  const issues: string[] = []
  for (const [index, item] of deck.cards.entries()) {
    const card = byId.get(item.id)
    if (card === undefined) {
      issues.push(`card ${String(index + 1)} has no matching saved concept card`)
      continue
    }
    const expected = recallCardText(card, turnLocale)
    if (item.prompt !== expected.prompt) issues.push(`card ${item.id} changed its saved prompt`)
    if (item.answer !== expected.answer) issues.push(`card ${item.id} changed its saved answer`)
  }
  return issues
}

/** Register the host-mediated concept-card tools. */
export function registerConceptTools(ctx: ConceptToolContext): void {
  ctx.tools.register(closeRoot(defineTool({
    name: 'learning_concept_propose',
    description: [
      'Save one durable concept card from this teaching segment. On your own initiative, call it only after the learner has independently solved a fresh transfer. When the learner asks for a card in their own words, set learnerRequested and save what the session has: their request is the authority the evidence gate was standing in for.',
      'The Host shows the learner the exact Markdown card and asks for an explicit save decision. This tool never writes when the learner declines, and it never extracts an automatic concept graph.',
      'You may supply the learner explanation, an unverified transfer context, and explicit related concept names; copy only learner wording or contexts explicitly discussed in this segment, and omit fields you cannot ground.',
    ].join(' '),
    parameters: {
      learnerRequested: {
        type: 'boolean',
        description: 'Set only when the learner asked for a card in this turn. Skips the evidence requirement and the save confirmation, because they already said to save it.',
      },
      label: {
        type: 'string',
        description: 'Optional card title; defaults to the tracked goal. Supply it when the learner named a different concept.',
      },
      explanation: {
        type: 'string',
        description: 'Optional learner wording from this segment; omit it rather than writing an assistant summary as learner evidence.',
      },
      unverifiedTransfer: {
        type: 'string',
        description: 'Optional context explicitly discussed but not independently demonstrated; do not invent one.',
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
      const learnerRequested = args.learnerRequested === true
      const draft = conceptCardDraftFromState(state, {
        label: typeof args.label === 'string' ? args.label : undefined,
        requireVerifiedTransfer: !learnerRequested,
        explanation: typeof args.explanation === 'string' ? args.explanation : undefined,
        unverifiedTransfer: typeof args.unverifiedTransfer === 'string' ? args.unverifiedTransfer : undefined,
        relatedConcepts: Array.isArray(args.relatedConcepts) ? args.relatedConcepts : undefined,
      })
      if (draft === undefined) {
        return {
          status: 'not-ready' as const,
          detail: learnerRequested
            ? 'The card has no title: pass a label naming the concept the learner asked to save.'
            : 'No correct, independent, fresh transfer is recorded yet; continue teaching instead of saving a card.',
        }
      }
      const vault = await vaultOf(ctx, agent)
      if (vault === undefined) {
        return { status: 'no-vault' as const, detail: 'This session is not inside a learning vault, so no concept card was written.' }
      }
      // A model-initiated proposal still asks. A learner who said "save this"
      // has already answered this exact question, and asking again reads as the
      // assistant not having listened.
      if (!learnerRequested) {
        const dialog = CONCEPT_SAVE_DIALOG[localeOf(ctx, agent) ?? scriptLocaleOf(draft.label)]
        const interaction = interactionOf(ctx)
        if (interaction === undefined) {
          return { status: 'unavailable' as const, detail: 'No user-confirmation channel is available; no concept card was written.' }
        }

        let answer
        try {
          answer = await interaction.ask({
            questions: [{
              id: 'concept-card-confirm',
              header: dialog.header,
              question: dialog.question,
              detail: renderConceptCard(draft),
              options: [
                { label: dialog.save, description: dialog.saveDetail },
                { label: dialog.decline, description: dialog.declineDetail },
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
        const accepted = item?.selected.length === 1 && item.selected[0] === dialog.save && item.custom === undefined
        if (!accepted) {
          return { status: 'declined' as const, detail: 'The learner did not save the concept card; no file was written.' }
        }
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
          ? `The concept card was saved in the learning vault ${learnerRequested ? 'as the learner asked' : 'after the learner approved it'}.`
          : `The updated concept card was saved ${learnerRequested ? 'as the learner asked' : 'after the learner approved it'}; the existing note was retained and a new observation was added.`,
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
      'When a non-blocking review is useful, copy the returned prompt, answer, id, hint, and tags verbatim into one recall_deck; do not rewrite answers or invent cards. A self-rating is not mastery evidence.',
      'If there is no due card, continue the current teaching request instead of interrupting it for review.',
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
          ...recallCardText(card, localeOf(ctx, exec.agent)),
          tags: [card.mastery, ...(card.staleAnchors.length > 0 ? ['stale-anchor'] : [])],
          due: card.due!,
          mastery: card.mastery,
          stale: card.staleAnchors.length > 0,
        })),
      }
    },
  })))
}
