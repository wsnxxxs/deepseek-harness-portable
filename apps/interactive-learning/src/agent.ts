/** Model-facing entry mounted only by the `learning` preset. */
import { realpath, stat } from 'node:fs/promises'
import { basename, isAbsolute, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { UserMessage } from '@deepseek-ai/dsh-llm'
import {
  defineTool,
  type ToolDefinition,
  type ToolRunContext,
  type ToolRuntime,
} from '@deepseek-ai/dsh-tools'
import type SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import type { PromptAssembly } from '@deepseek-ai/dsh-system-prompt'
import {
  LEARNING_CHECKPOINT_EVIDENCE_KINDS,
  LEARNING_CHECKPOINT_KINDS,
  VISUAL_RESULT_PROTOCOL_V4,
  LearningProtocolError,
  parseLearningCheckpointV1,
  parseLearningVisualV4,
  type LearningStudyMapV4,
  type LearningCheckpointEvidenceKindV1,
  type LearningCheckpointKindV1,
  type LearningCheckpointResultV1,
  type LearningVisualResultV4,
} from './protocol-current.ts'
import {
  LEARNING_CHECKPOINT_RESULT_SCHEMA_V1,
  LEARNING_VISUAL_KINDS_V4,
  LEARNING_VISUAL_RESULT_SCHEMA_V4,
  learningCheckpointParametersOneStepV1,
  learningVisualParametersV4,
  type LearningVisualSchemaKindV4,
} from './protocol-schema.ts'
import type {
  LearningActivityBroker,
  LearningStateUpdateResult,
  ObservableLearnerStateUpdate,
} from './broker.ts'
import type {
  LearnerState,
  LearnerStateCorrection,
  ObservableLearnerEvent,
} from './learner-state.ts'
import { LEARN_INTENT_MODEL_GUIDANCE } from './learn-intent.ts'
import { classifyLearningIntentSemantically } from './intent-router.ts'
import { MATERIAL_TOOL_NAMES, registerMaterialTools } from './material-tools.ts'
import { parseFileMentions, syncMentionedMaterial } from './material-intake.ts'
import {
  CONCEPT_TOOL_NAMES,
  registerConceptTools,
  validateRecallDeckAgainstVault,
} from './concept-tools.ts'
import {
  buildConceptStudyMap,
  readConceptCards,
  readLearnerMemoryWithCards,
} from './concept-cards.ts'
import {
  conceptRecordFromState,
  renderLearnerMemory,
  upsertLearnerConcept,
} from './learner-memory.ts'
import { ensureVaultLayout, readManifest, resolveTopicVault } from './topic-vault.ts'
import {
  formatStudyMapViolations,
  validateStudyMapAgainstVault,
} from './material-validation.ts'
import {
  assertMaterialAnchorsReadable,
  beginMaterialTurn,
} from './material-receipts.ts'
import { buildLearningTeachingPolicy } from './teaching-policy.ts'
import { LEARNING_MATERIAL_POLICY } from './teaching-policy.ts'
import {
  routeLearningTurn,
  type LearningRouteSession,
  type LearningTurnRouteDecision,
} from './teaching-route.ts'

export const name = 'interactive-learning-agent'
export const inject = ['tools', 'systemPrompt', 'learningActivities']

type LearningAgentContext = Context & {
  tools: ToolRuntime
  systemPrompt: SystemPrompt
  learningActivities: LearningActivityBroker
}

function closeParameterRoot<T extends ToolDefinition>(tool: T): T {
  return { ...tool, parameters: { ...tool.parameters, additionalProperties: false } } as T
}

const learnerObservation = { type: 'object', additionalProperties: false, properties: {
  id: {
    type: 'string',
    required: true,
    description: 'Stable id for this one concrete observation within the current session.',
  },
  source: {
    type: 'string',
    enum: ['learner-message', 'learner-action'],
    required: true,
  },
  summary: {
    type: 'string',
    required: true,
    description: 'Concise concrete utterance/action/source fact supporting the update; never a hidden trait.',
  },
  turn: { type: 'integer' },
} } as const

const sourceMaterialObservation = { type: 'object', additionalProperties: false, properties: {
  id: { type: 'string', required: true },
  source: { type: 'string', const: 'source-material', required: true },
  summary: { type: 'string', required: true },
  turn: { type: 'integer' },
} } as const

const userCorrectionObservation = { type: 'object', additionalProperties: false, properties: {
  id: { type: 'string', required: true },
  source: { type: 'string', const: 'user-correction', required: true },
  summary: { type: 'string', required: true },
  turn: { type: 'integer' },
} } as const

const learnerEvidenceCommonFields = {
  summary: { type: 'string', required: true },
  confidence: {
    type: 'string',
    enum: ['low', 'medium', 'high'],
    description: 'Use low for tentative judgments; only medium/high correct independent evidence can support mastery.',
  },
  independence: { type: 'string', enum: ['independent', 'guided', 'unknown'] },
} as const

const unevaluatedEvidenceFields = {
  ...learnerEvidenceCommonFields,
  correctness: { type: 'string', const: 'unknown' },
  justification: {
    type: 'string',
    description: 'Optional only when correctness is unknown; it must not imply that correctness was established.',
  },
} as const

const evaluatedEvidenceFields = {
  ...learnerEvidenceCommonFields,
  correctness: {
    type: 'string',
    enum: ['correct', 'partial', 'incorrect'],
    required: true,
  },
  justification: {
    type: 'string',
    required: true,
    description: 'Cite the observable reasoning or action that supports this correctness evaluation.',
  },
} as const

const failedMove = { type: 'object', additionalProperties: false, properties: {
  move: {
    type: 'string',
    enum: ['none', 'explanation', 'example', 'question', 'guided_discovery', 'worked_example', 'reflective_pause', 'resource', 'repair', 'transfer', 'visual', 'checkpoint'],
    required: true,
  },
  fingerprint: { type: 'string', required: true },
  failureReason: {
    type: 'string',
    enum: ['not-understood', 'repeated-misconception', 'unhelpful-hint', 'wrong-representation', 'no-progress', 'unavailable', 'unknown'],
    required: true,
  },
  representation: { type: 'string' },
  summary: { type: 'string', required: true },
  turn: { type: 'integer' },
} } as const

const learnerEvidenceInput = { oneOf: [
  { type: 'object', additionalProperties: false, properties: {
    kind: {
      type: 'string',
      enum: ['attempt', 'prediction', 'explanation', 'contrast', 'error'],
      required: true,
    },
    ...unevaluatedEvidenceFields,
  } },
  { type: 'object', additionalProperties: false, properties: {
    kind: {
      type: 'string',
      enum: ['attempt', 'prediction', 'explanation', 'contrast', 'error'],
      required: true,
    },
    ...evaluatedEvidenceFields,
  } },
  { type: 'object', additionalProperties: false, properties: {
    kind: { type: 'string', const: 'transfer', required: true },
    transferContext: { type: 'string', enum: ['same', 'fresh', 'unknown'], required: true },
    ...unevaluatedEvidenceFields,
  } },
  { type: 'object', additionalProperties: false, properties: {
    kind: { type: 'string', const: 'transfer', required: true },
    transferContext: { type: 'string', enum: ['same', 'fresh', 'unknown'], required: true },
    ...evaluatedEvidenceFields,
  } },
] } as const

// One closed object replaces the old repeated oneOf branches. The reducer still
// performs the event-specific validation; this compact projection keeps the
// state tool from re-sending the same observation schema eleven times.
const learnerStateEventPayload = { type: 'object', additionalProperties: false, properties: {
  type: {
    type: 'string',
    enum: [
      'goal_observed', 'request_kind_observed', 'prior_knowledge_observed', 'plan_observed',
      'plan_step_evidenced', 'gap_observed', 'readiness_observed', 'progress_observed',
      'urgency_observed', 'assessment_context_observed', 'learner_evidence_observed',
      'failed_move_observed', 'assistant_move_observed', 'source_anchors_observed',
    ],
    required: true,
    description: 'Event → required payload: goal→goal; request_kind→requestKind; prior_knowledge→level/items; plan→objective+steps; plan_step→stepId; gap→gap; readiness→readiness; progress→progressSignal; urgency→urgency; assessment→assessmentContext; learner_evidence→evidence; failed_move→failedMove; assistant_move→move and its exact planned explanation/question metadata; source_anchors→anchors.',
  },
  observation: {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { type: 'string', required: true },
      source: {
        type: 'string',
        enum: ['learner-message', 'learner-action', 'assistant-output', 'source-material'],
        required: true,
        description: 'Use assistant-output only with assistant_move_observed, source-material only with source_anchors_observed, and learner-message/action for all learner observations.',
      },
      summary: { type: 'string', required: true },
      turn: {
        type: 'integer',
        description: 'Required for learner_evidence_observed and Host-checked against a real user turn.',
      },
    },
    required: true,
    description: 'One concrete session-local observation; never a personality or learning-style label.',
  },
  goal: { type: 'string' },
  requestKind: { type: 'string', enum: ['concept', 'procedure', 'topic', 'source-study', 'practice', 'resource', 'direct-task', 'unknown'] },
  level: { type: 'string', enum: ['novice', 'intermediate', 'advanced', 'unknown'] },
  items: { type: 'array', items: { type: 'string' } },
  mode: { type: 'string', enum: ['append', 'replace'] },
  objective: { type: 'string' },
  steps: { type: 'array', items: { type: 'object', additionalProperties: false, properties: {
    id: { type: 'string', required: true }, label: { type: 'string', required: true },
  } } },
  activeStepId: { type: 'string' },
  stepId: { type: 'string' },
  gap: { type: 'string', enum: ['concept', 'procedure', 'notation', 'task-model', 'prerequisite', 'unknown'] },
  misconceptions: { type: 'array', items: { type: 'string' } },
  misconceptionMode: { type: 'string', enum: ['append', 'replace'] },
  readiness: { type: 'string', enum: ['can-reason', 'needs-foothold', 'unknown'] },
  progressSignal: { type: 'string', enum: ['progressing', 'impatient', 'stuck', 'shutdown-risk', 'unknown'] },
  urgency: { type: 'string', enum: ['none', 'initial-blocker', 'later-pressure', 'unknown'] },
  assessmentContext: { type: 'string', enum: ['self-study', 'graded', 'unknown'] },
  evidence: { ...learnerEvidenceInput },
  failedMove: { ...failedMove },
  move: { type: 'string', enum: ['none', 'explanation', 'example', 'question', 'guided_discovery', 'worked_example', 'reflective_pause', 'resource', 'repair', 'transfer', 'visual', 'checkpoint'] },
  phase: {
    type: 'string',
    enum: ['orient', 'teach', 'practice', 'repair', 'transfer', 'complete'],
    description: 'Set complete only when the learner explicitly asks to stop the current questioning or the segment is genuinely complete; this does not claim transfer mastery.',
  },
  explanationSummary: { type: 'string' },
  question: { type: 'string' },
  learnerResponseAssessment: { type: 'string', enum: ['correct', 'partial', 'incorrect', 'no-evidence'] },
  currentMisconception: { type: 'string' },
  nextMove: {
    type: 'string',
    enum: ['calibrate', 'direct', 'explain', 'example', 'guided_discovery', 'worked_example', 'reflective_pause', 'resource', 'question', 'repair', 'transfer', 'complete'],
    description: 'Use complete with phase=complete when the learner asks not to be quizzed further; do not upgrade mastery unless this is an explicit user correction.',
  },
  moveFingerprint: { type: 'string' },
  anchors: { type: 'array', items: { type: 'string' } },
} } as const

const learnerEvidenceStateEvent = {
  ...learnerStateEventPayload,
  properties: {
    ...learnerStateEventPayload.properties,
    type: { type: 'string', const: 'learner_evidence_observed', required: true },
    observation: {
      ...learnerObservation,
      properties: {
        ...learnerObservation.properties,
        turn: {
          type: 'integer',
          required: true,
          description: 'Host-checked against a real user turn in this session.',
        },
      },
      required: true,
      description: 'One concrete learner message/action tied to its real session turn.',
    },
    evidence: { ...learnerEvidenceInput, required: true },
  },
} as const

const learnerStateEvent = { oneOf: [
  learnerEvidenceStateEvent,
  {
    ...learnerStateEventPayload,
    properties: {
      ...learnerStateEventPayload.properties,
      type: {
        type: 'string',
        enum: [
          'goal_observed', 'request_kind_observed', 'prior_knowledge_observed', 'plan_observed',
          'plan_step_evidenced', 'gap_observed', 'readiness_observed', 'progress_observed',
          'urgency_observed', 'assessment_context_observed', 'failed_move_observed',
          'assistant_move_observed', 'source_anchors_observed',
        ],
        required: true,
        description: 'Event → required payload: goal→goal; request_kind→requestKind; prior_knowledge→level/items; plan→objective+steps; plan_step→stepId; gap→gap; readiness→readiness; progress→progressSignal; urgency→urgency; assessment→assessmentContext; failed_move→failedMove; assistant_move→move and its exact planned explanation/question metadata; source_anchors→anchors.',
      },
    },
  },
] } as const

const learnerStateCorrection = { type: 'object', additionalProperties: false, properties: {
  goal: { oneOf: [{ type: 'string' }, { type: 'null' }] },
  requestKind: {
    type: 'string',
    enum: ['concept', 'procedure', 'topic', 'source-study', 'practice', 'resource', 'direct-task', 'unknown'],
  },
  level: { type: 'string', enum: ['novice', 'intermediate', 'advanced', 'unknown'] },
  priorKnowledge: { type: 'array', items: { type: 'string' } },
  gap: { type: 'string', enum: ['concept', 'procedure', 'notation', 'task-model', 'prerequisite', 'unknown'] },
  misconceptions: { type: 'array', items: { type: 'string' } },
  readiness: { type: 'string', enum: ['can-reason', 'needs-foothold', 'unknown'] },
  progressSignal: { type: 'string', enum: ['progressing', 'impatient', 'stuck', 'shutdown-risk', 'unknown'] },
  urgency: { type: 'string', enum: ['none', 'initial-blocker', 'later-pressure', 'unknown'] },
  supportLevel: { type: 'integer', enum: [0, 1, 2, 3, 4, 5] },
  assessmentContext: { type: 'string', enum: ['self-study', 'graded', 'unknown'] },
  mastery: {
    type: 'string',
    enum: ['unseen', 'emerging', 'transfer'],
    description: 'For action=correct only: honor the learner’s explicit correction to this tentative mastery hypothesis.',
  },
  evidence: { type: 'array', items: learnerEvidenceInput },
  failedMoves: { type: 'array', items: failedMove },
  phase: {
    type: 'string',
    enum: ['orient', 'teach', 'practice', 'repair', 'transfer', 'complete'],
    description: 'For an explicit request to stop questioning, set phase=complete without changing mastery to transfer.',
  },
  lastExplanationSummary: { oneOf: [{ type: 'string' }, { type: 'null' }] },
  lastQuestion: { oneOf: [{ type: 'string' }, { type: 'null' }] },
  learnerResponseAssessment: { type: 'string', enum: ['correct', 'partial', 'incorrect', 'no-evidence'] },
  currentMisconception: { oneOf: [{ type: 'string' }, { type: 'null' }] },
  nextMove: {
    type: 'string',
    enum: ['calibrate', 'direct', 'explain', 'example', 'guided_discovery', 'worked_example', 'reflective_pause', 'resource', 'question', 'repair', 'transfer', 'complete'],
    description: 'Pair nextMove=complete with phase=complete when the learner asks not to be quizzed further; mastery changes only when explicitly corrected.',
  },
  moveFingerprint: { oneOf: [{ type: 'string' }, { type: 'null' }] },
  lastMove: {
    type: 'string',
    enum: ['none', 'explanation', 'example', 'question', 'guided_discovery', 'worked_example', 'reflective_pause', 'resource', 'repair', 'transfer', 'visual', 'checkpoint'],
  },
  sourceAnchors: { type: 'array', items: { type: 'string' } },
} } as const

const learnerStateUpdateOutput = { type: 'object', additionalProperties: false, properties: {
  status: { type: 'string', enum: ['updated', 'corrected', 'reset'], required: true },
  revision: { type: 'integer', required: true },
} } as const

const LEARNING_TOOL_PREFIX = 'learning_'
const GENERIC_USER_WAIT_TOOL = 'ask_user_question'
const learningRoutes = new WeakMap<object, LearningTurnRouteDecision>()
interface PendingSemanticRoute {
  text: string
  turn: number
  session: LearningRouteSession
  base: LearningTurnRouteDecision
}
const pendingSemanticRoutes = new WeakMap<Agent, PendingSemanticRoute>()
/** Mentions from the claimed message, before the loop appends it to the log. */
const pendingMaterialMentions = new WeakMap<Agent, readonly string[]>()
interface LearningTurnPromptState {
  graded: boolean
  language: 'en' | 'zh' | 'mixed'
}
const learningPromptStates = new WeakMap<object, LearningTurnPromptState>()
interface LearnerTranscriptState {
  session: object
  state: LearnerState
}
const learnerTranscriptStates = new WeakMap<object, LearnerTranscriptState>()
type RichTeachingMove = 'visual' | 'checkpoint'
const richTeachingMoves = new WeakMap<object, RichTeachingMove>()

const RICH_VISUAL_ROUTING_GUIDANCE =
  'When a tree, graph, process, causal chain, topology, spatial construction, formula derivation, sequence, or state change is the teaching relationship, use one matching native learning visual; do not substitute a Markdown/ASCII diagram or code block.'

function textFromUserMessage(message: UserMessage): string {
  return message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
    .trim()
}

function lowConfidenceRouteContext(decision: LearningTurnRouteDecision): string[] {
  const suggested = decision.intent.intent === 'learn'
    ? `tentative intent=learn; suggested route=${decision.route}; trigger=${decision.intent.trigger}; reason=${decision.reason}.`
    : 'tentative intent=not-learn; suggested route=direct.'
  return [
    '## Current turn route',
    suggested,
    `The Host classification is low confidence. ${LEARN_INTENT_MODEL_GUIDANCE}`,
    'Do not mention this internal classification.',
  ]
}

function routeContextText(
  decision: LearningTurnRouteDecision,
  richClientAvailable: boolean,
  materialAvailable = false,
): string {
  if (decision.confidence === 'low') {
    return [
      ...lowConfidenceRouteContext(decision),
      ...(richClientAvailable ? [RICH_VISUAL_ROUTING_GUIDANCE] : []),
      ...(!richClientAvailable
        ? ['No rich learning client is available. Use a Markdown table or compact ASCII structure when one relationship needs a scaffold; keep teaching and the focused question in prose. Do not record a visual teaching move unless a native visual actually rendered.']
        : []),
    ].join('\n')
  }
  if (decision.intent.intent === 'not-learn') {
    return [
      '## Current turn route',
      'intent=not-learn; route=direct.',
      'Treat this as an ordinary task. Do not calibrate, teach, update learner state, or use learning visual/checkpoint tools for this turn.',
    ].join('\n')
  }
  return [
    '## Current turn route',
    `intent=learn; trigger=${decision.intent.trigger}; route=${decision.route}; reason=${decision.reason}.`,
    decision.inherited
      ? 'This turn continues the active learning segment; short answers, confusion, pressure, and ordinary evidence inherit the teaching context.'
      : 'This turn opens a learning segment; the learner\'s evidence still determines the next teaching move.',
    ...(decision.intent.trigger === 'current-topic'
      ? ['Use web_search before making substantive current or contested claims, then ground the structured explanation in the returned sources.']
      : []),
    ...(materialAvailable
      ? ['Indexed learning material is available. Retrieve it internally when claims depend on it; do not make the learner orchestrate the retrieval sequence.']
      : []),
    ...(richClientAvailable ? [RICH_VISUAL_ROUTING_GUIDANCE] : []),
    decision.route === 'calibrate'
      ? 'Give one tiny useful foothold, then ask exactly one route-changing question; do not dump an overview.'
      : decision.route === 'teach-minimum'
        ? 'Teach the smallest useful concept now with one concrete scaffold; ask a question only if its answer changes the next move.'
        : decision.route === 'overview'
          ? 'Give the requested structured exposition directly; do not require calibration, a quiz, or a checkpoint first.'
          : decision.route === 'direct'
            ? 'Fulfil the requested resource or immediate help directly; do not add a ritual teaching gate.'
            : 'Use the newest learner evidence, change the move when the prior one failed, and stop if the segment is complete.',
    ...(!richClientAvailable
      ? ['No rich learning client is available. Use a Markdown table or compact ASCII structure when one relationship needs a scaffold; keep teaching and the focused question in prose. Do not record a visual teaching move unless a native visual actually rendered.']
      : []),
  ].join('\n')
}

/**
 * Whether this turn is worth a blocking semantic classification.
 *
 * The semantic pass is awaited inside prompt assembly, so it costs the learner
 * a whole serial model round trip before the real answer starts. That is worth
 * paying only where the deterministic answer is `unknown` — the tail where the
 * Host would otherwise route a genuine learning request to the ordinary task
 * path and lose the mode entirely.
 *
 * A bare concept name is deliberately excluded even though it is also low
 * confidence. It is the single most common way a learning session opens, its
 * deterministic route is already `calibrate`, and `calibrate` — one small
 * foothold plus one route-changing question — costs almost nothing when the
 * guess is wrong. The low-confidence prompt hint still lets the model reclassify
 * from the learner's own words on the very same turn.
 */
function needsSemanticRoute(decision: LearningTurnRouteDecision): boolean {
  return decision.confidence === 'low'
    && !decision.inherited
    && decision.intent.trigger === 'unknown'
}

function isConfidentNotLearn(decision: LearningTurnRouteDecision | undefined): boolean {
  return decision?.intent.intent === 'not-learn' && decision.confidence !== 'low'
}

function languageOf(text: string): LearningTurnPromptState['language'] {
  const hasChinese = /[\p{Script=Han}]/u.test(text)
  const hasLatin = /[A-Za-z]/u.test(text)
  return hasChinese && hasLatin ? 'mixed' : hasChinese ? 'zh' : 'en'
}

function compactLearnerStateDelta(state: LearnerState, previous: LearnerState): string {
  const lines = [
    '## Learner state (incremental projection for this turn)',
    `revision: ${String(previous.revision)} -> ${String(state.revision)}`,
  ]
  const add = (label: string, current: string | number | null, prior: string | number | null): void => {
    if (current !== prior) lines.push(`${label}: ${JSON.stringify(current)}`)
  }
  add('goal', state.goal, previous.goal)
  add('request_kind', state.requestKind, previous.requestKind)
  add('level', state.level, previous.level)
  add('current_gap', state.gap, previous.gap)
  add('readiness', state.readiness, previous.readiness)
  add('progress_signal', state.progressSignal, previous.progressSignal)
  add('urgency', state.urgency, previous.urgency)
  add('support_need', state.supportLevel, previous.supportLevel)
  add('assessment_context', state.assessmentContext, previous.assessmentContext)
  add('mastery', state.mastery, previous.mastery)
  add('phase', state.phase, previous.phase)
  add('next_move', state.nextMove, previous.nextMove)
  add('response_assessment', state.learnerResponseAssessment, previous.learnerResponseAssessment)
  add('current_misconception', state.currentMisconception, previous.currentMisconception)
  add('last_move', state.lastMove, previous.lastMove)
  add('last_explanation', state.lastExplanationSummary, previous.lastExplanationSummary)
  add('last_question', state.lastQuestion, previous.lastQuestion)

  const appendLatest = <T>(
    label: string,
    current: readonly T[],
    prior: readonly T[],
    render: (value: T) => string,
  ): void => {
    if (JSON.stringify(current) === JSON.stringify(prior)) return
    const latest = current.at(-1)
    lines.push(latest === undefined
      ? `${label}: cleared`
      : `${label}: count=${String(current.length)}; latest=${render(latest)}`)
  }
  appendLatest('prior_knowledge', state.priorKnowledge, previous.priorKnowledge, value => JSON.stringify(value))
  appendLatest('misconceptions', state.misconceptions, previous.misconceptions, value => JSON.stringify(value))
  appendLatest('source_anchors', state.sourceAnchors, previous.sourceAnchors, value => JSON.stringify(value))
  appendLatest('evidence', state.evidence, previous.evidence, value => (
    `${value.kind}/${value.correctness}/${value.independence}/${value.confidence}: ${JSON.stringify(value.summary)}`
  ))
  appendLatest('failed_moves', state.failedMoves, previous.failedMoves, value => (
    `${value.move}/${value.failureReason}: ${JSON.stringify(value.summary)}`
  ))
  if (JSON.stringify(state.plan) !== JSON.stringify(previous.plan)) {
    const completed = state.plan?.steps.filter(step => step.status === 'evidenced').length ?? 0
    const active = state.plan?.steps.find(step => step.status === 'active')?.id ?? null
    lines.push(state.plan === null
      ? 'plan: cleared'
      : `plan: ${JSON.stringify(state.plan.objective)}; completed=${String(completed)}/${String(state.plan.steps.length)}; active=${JSON.stringify(active)}`)
  }
  if (lines.length === 2) lines.push('changes: none')
  return lines.join('\n')
}

const GRADED_CONTEXT = /(?:\b(?:graded|for\s+(?:a\s+)?grade|assignment|homework|coursework|exam\s+(?:question|problem)|test\s+(?:question|problem)|submit(?:ted|ting)?\s+(?:for|to))\b|作业|课程考核|考试题|测验题|计分|评分作业|需要提交|要提交)/iu

function richTeachingMoveForTool(name: string): RichTeachingMove | undefined {
  if (name === 'learning_visual_select' || name === 'learning_visual') return 'visual'
  if (name === 'learning_checkpoint') return 'checkpoint'
  return undefined
}

/**
 * Learning tools that render nothing and therefore do not depend on a rich
 * client. The material tools read the learner's own stored sources, which is as
 * useful in a plain terminal as in the browser; gating them on the visual
 * renderer would leave a text-only composition unable to open its own material.
 */
const LEARNING_NON_RICH_TOOLS: ReadonlySet<string> = new Set<string>([
  'learning_state_update',
  ...MATERIAL_TOOL_NAMES,
  ...CONCEPT_TOOL_NAMES,
])

const MATERIAL_TOOL_SET: ReadonlySet<string> = new Set(MATERIAL_TOOL_NAMES)
/** The one material tool whose query comes from the maintained learner state. */
const STATE_DERIVED_MATERIAL_TOOL = 'learning_material_recall'

function learningToolAvailable(
  decision: LearningTurnRouteDecision | undefined,
  toolName: string,
  richClientAvailable: boolean,
  agent?: Agent,
  state?: LearnerState,
): boolean {
  if (decision?.intent.intent === 'learn'
    && decision.confidence !== 'low'
    && toolName === GENERIC_USER_WAIT_TOOL) return false
  if (!toolName.startsWith(LEARNING_TOOL_PREFIX)) return true
  if (decision?.intent.intent === 'learn' && agent !== undefined) {
    if (MATERIAL_TOOL_SET.has(toolName) && vaultHasMaterial.get(agent) !== true) return false
    if (toolName === 'learning_concept_recall' && vaultHasConcepts.get(agent) !== true) return false
    // Availability asks only whether a card could be written at all. Whether
    // one SHOULD be is the tool's own decision, because the learner can ask
    // for a card in words and a tool the model cannot see cannot answer them.
    if (toolName === 'learning_concept_propose' && vaultAvailable.get(agent) !== true) return false
  }
  if (LEARNING_NON_RICH_TOOLS.has(toolName)) return true
  if (decision === undefined) return true
  if (!richClientAvailable) return false
  if (decision.intent.intent !== 'learn') return decision.confidence === 'low'
  const richMove = richTeachingMoveForTool(toolName)
  if (richMove === 'checkpoint') {
    return decision.route === 'teach-minimum' || decision.route === 'continue'
  }
  if (richMove === 'visual') {
    return decision.route === 'teach-minimum'
      || decision.route === 'continue'
      || decision.route === 'overview'
      || (decision.route === 'direct' && decision.reason === 'resource-creation')
  }
  return true
}

/**
 * Rendered prior-learning block per live agent. Held outside the prompt section
 * because that callback is synchronous while reading a vault is not; the
 * assemble waterfall refreshes this before the section is evaluated.
 */
const learnerMemoryBlocks = new WeakMap<Agent, string>()
/** The session whose memory block is already rendered; the block is sent once. */
const learnerMemoryRenderedSessions = new WeakMap<Agent, object>()

/**
 * Whether this agent's session runs in a learning folder that holds parsed
 * material. Drives the conditional material policy layer, which must not be
 * injected for an ordinary session that has no sources to read.
 */
const vaultHasMaterial = new WeakMap<Agent, boolean>()
/** Whether this agent's vault has approved concept cards available to review. */
const vaultHasConcepts = new WeakMap<Agent, boolean>()
/** Whether this agent is inside a learning vault, even when it has no sources yet. */
const vaultAvailable = new WeakMap<Agent, boolean>()
/** Last learner-state revision projected into durable memory for this agent. */
const learnerMemoryProjectionRevisions = new WeakMap<Agent, { session: object; revision: number }>()

/**
 * Probe the vault flags this turn actually depends on.
 *
 * Cheap and unconditional: whether the session is in a vault, whether that
 * vault holds parsed material, and whether it has approved cards all decide
 * which conditional policy layers and tools this turn gets, and all three
 * genuinely change mid-session — the first attachment creates the vault, and a
 * confirmed card arrives without a restart.
 */
async function refreshVaultFlags(services: LearningAgentContext, agent: Agent): Promise<void> {
  try {
    const vault = await resolveTopicVault(services, agent.session.header.cwd)
    if (vault === undefined) {
      learnerMemoryBlocks.delete(agent)
      learnerMemoryRenderedSessions.delete(agent)
      vaultHasMaterial.delete(agent)
      vaultHasConcepts.delete(agent)
      vaultAvailable.delete(agent)
      learnerMemoryProjectionRevisions.delete(agent)
      return
    }
    vaultAvailable.set(agent, true)
    vaultHasMaterial.set(agent, (await readManifest(vault)).sources.length > 0)
    vaultHasConcepts.set(agent, (await readConceptCards(vault)).length > 0)

    // Prior learning is sent once per session, with the first full transcript
    // (see the `learning:learner-state` context). Reading and rendering it on
    // every turn would spend four thousand characters of vault I/O to produce a
    // block every later turn discards.
    if (learnerMemoryRenderedSessions.get(agent) === agent.session) return
    const memory = await readLearnerMemoryWithCards(vault)
    learnerMemoryBlocks.set(agent, renderLearnerMemory(memory, {
      title: vault.title,
      goal: services.learningActivities.learnerState(agent).goal ?? undefined,
      maxChars: 4_000,
    }))
    learnerMemoryRenderedSessions.set(agent, agent.session)
  } catch (cause) {
    // Long-term memory is an enhancement to a turn, never a precondition for
    // one: a damaged or unreadable vault must not block teaching.
    services.logger.warn(`learner memory was not refreshed: ${String(cause)}`)
  }
}

/**
 * Project this session's concept state into the vault at the end of a turn.
 *
 * At turn end rather than during prompt assembly: assembly runs before every
 * model request, so writing there put a disk write on the critical path of each
 * step. A turn that ends without ceremony — a crash, a closed window — has
 * still persisted everything the last completed turn knew, which is what this
 * projection is for.
 */
async function projectLearnerMemory(services: LearningAgentContext, agent: Agent): Promise<void> {
  try {
    const vault = await resolveTopicVault(services, agent.session.header.cwd)
    if (vault === undefined) return
    const state = services.learningActivities.learnerState(agent)
    const priorProjection = learnerMemoryProjectionRevisions.get(agent)
    if (priorProjection?.session === agent.session && priorProjection.revision === state.revision) return
    const record = conceptRecordFromState(state, String(agent.session.id))
    if (record !== undefined) await upsertLearnerConcept(vault, record)
    learnerMemoryProjectionRevisions.set(agent, { session: agent.session, revision: state.revision })
  } catch (cause) {
    services.logger.warn(`learner memory was not projected: ${String(cause)}`)
  }
}

function learningSegmentComplete(services: LearningAgentContext, agent: Agent): boolean {
  const state = services.learningActivities.learnerState(agent)
  return state.phase === 'complete' || state.nextMove === 'complete'
}

function durableLearningSegmentActive(services: LearningAgentContext, agent: Agent): boolean {
  return services.learningActivities.learningSegmentActive(agent)
}

function recordLearningRouteAnchor(
  services: LearningAgentContext,
  agent: Agent,
  turn: number,
  session: LearningRouteSession,
  decision: LearningTurnRouteDecision,
): void {
  if (decision.intent.intent === 'learn' && decision.segment === 'active') {
    services.learningActivities.recordLearningSegmentAnchor(agent, turn)
  } else if (session.active) {
    services.learningActivities.recordLearningSegmentAnchor(agent, turn, 'closed')
  }
}

/** Whether a parsed mention points at a real file or directory. */
async function hasRealMaterialMention(root: string, mentions: readonly string[]): Promise<boolean> {
  for (const mention of mentions) {
    const path = isAbsolute(mention) ? mention : resolve(root, mention)
    try {
      const info = await stat(path)
      if (info.isFile() || info.isDirectory()) return true
    } catch {
      // A prose @mention is not a reason to create a learning folder.
    }
  }
  return false
}

/** Make an attached source available before the first model prompt is built. */
async function prepareAttachedMaterial(services: LearningAgentContext, agent: Agent): Promise<void> {
  const mentions = pendingMaterialMentions.get(agent)
  if (mentions === undefined) return
  pendingMaterialMentions.delete(agent)

  // Ordinary turns may mention files for unrelated work. Only the learning
  // route turns an attachment into a source for the teaching loop.
  if (learningRoutes.get(agent)?.intent.intent !== 'learn') return

  const cwd = agent.session.header.cwd
  if (cwd === undefined || cwd === '') return

  try {
    let vault = await resolveTopicVault(services, cwd)
    if (vault === undefined) {
      const root = await realpath(cwd)
      if (!await hasRealMaterialMention(root, mentions)) return
      vault = await ensureVaultLayout(root, basename(root))
    }
    await syncMentionedMaterial(agent, vault, mentions)
  } catch (cause) {
    // Material is an enhancement to the turn. The normal no-vault/empty
    // response remains available if the host cannot prepare the attachment.
    services.logger.warn(`attached learning material was not prepared: ${String(cause)}`)
  }
}

/** Add material guidance after async intake, because prompt sections are built before the waterfall. */
function addPreparedMaterialPolicy(
  assembly: PromptAssembly,
  agent: Agent | undefined,
): PromptAssembly {
  if (agent === undefined || vaultHasMaterial.get(agent) !== true) return assembly
  return {
    ...assembly,
    sections: assembly.sections.map(section => section.name !== 'learning:policy'
      || section.text.includes('Supplied material')
      ? section
      : { ...section, text: `${section.text}\n\n${LEARNING_MATERIAL_POLICY}` }),
  }
}

async function resolvePendingSemanticRoute(
  services: LearningAgentContext,
  agent: Agent,
  signal?: AbortSignal,
): Promise<void> {
  const pending = pendingSemanticRoutes.get(agent)
  if (pending === undefined || pending.base !== learningRoutes.get(agent)) return
  pendingSemanticRoutes.delete(agent)

  const override = await classifyLearningIntentSemantically(services, agent, pending.text, signal)
  // The agent is serial at this boundary, but keep a late result from
  // replacing a newer claimed message if another host invokes assembly while
  // this request is resolving.
  if (learningRoutes.get(agent) !== pending.base) return
  const resolved = override === undefined
    ? pending.base
    : routeLearningTurn(pending.text, pending.session, override)
  learningRoutes.set(agent, resolved)
  recordLearningRouteAnchor(services, agent, pending.turn, pending.session, resolved)
}

const visualSelectorOutput = { type: 'object', additionalProperties: false, properties: {
  status: { type: 'string', const: 'selected', required: true },
  kind: { type: 'string', enum: LEARNING_VISUAL_KINDS_V4, required: true },
} } as const

const visualSelectorParameters = {
  kind: {
    type: 'string',
    enum: LEARNING_VISUAL_KINDS_V4,
    required: true,
    description: [
      'Choose by relationship:',
      'plot=quantitative axes or parameter sensitivity;',
      'node_link=topology; scene_2d=spatial construction; relation=comparison, mapping, or sets;',
      'timeline=chronology; formula_steps=derivation; study_map=source structure or saved concept state; recall_deck=active recall;',
      'data_table=records; state_transition=event-driven states; sequence_buffer=indexed slots;',
      'sequence_diagram=ordered messages; code_trace=execution; field_2d=scalar/vector field; causal_loop=signed feedback.',
    ].join(' '),
  },
  purpose: {
    type: 'string',
    required: true,
    description: 'One sentence naming the learner relationship this visual will make clearer.',
  },
  learnerAction: {
    type: 'string',
    description: 'Use instead of pairedQuestion for the one observation or manipulation the learner should make.',
  },
  pairedQuestion: {
    type: 'string',
    description: 'Use instead of learnerAction for the one focused question asked after the visual returns.',
  },
} as const

interface VisualSelection {
  kind: LearningVisualSchemaKindV4
  purpose: string
  learnerAction?: string
  pairedQuestion?: string
}

const visualDescription = (selection: VisualSelection): string => [
  `Render one trusted, non-blocking semantic ${selection.kind} visual selected for the current teaching move.`,
  'The selection step already chose the representation; now provide exactly that content kind.',
  `Teaching purpose: ${selection.purpose}`,
  ...(selection.learnerAction === undefined ? [] : [`Learner action: ${selection.learnerAction}`]),
  ...(selection.pairedQuestion === undefined ? [] : [`Paired question: ${selection.pairedQuestion}`]),
  selection.pairedQuestion === undefined
    ? 'The call completes immediately. Continue with a self-sufficient ordinary-text interpretation of the selected learner action; do not add another question.'
    : 'The call completes immediately. Continue with a self-sufficient ordinary-text interpretation and ask only the selected paired question.',
  'Keep all teaching explanation and learner prompting outside the visual payload; its title, labels, description, and fallback carry only the picture and its text equivalent.',
  'Do not use a visual for a definition, short fact, or already-clear explanation. Keep labels in the learner\'s language and declare every relationship the learner needs to read.',
  'Hard limits and field-specific payload rules are encoded in this kind-specific schema. Never provide HTML, Markdown diagrams, SVG markup, or JavaScript.',
].join(' ')

type DynamicToolTarget = Pick<ToolRuntime, 'register'>

type EphemeralToolSlot = 'visual'
const ephemeralToolDisposers = new WeakMap<object, Map<EphemeralToolSlot, () => void>>()
const GLOBAL_DYNAMIC_TOOL_KEY = {}

function disposeEphemeralTool(key: object, slot: EphemeralToolSlot): void {
  const slots = ephemeralToolDisposers.get(key)
  slots?.get(slot)?.()
  slots?.delete(slot)
  if (slots?.size === 0) ephemeralToolDisposers.delete(key)
}

function registerEphemeralTool<T extends ToolDefinition>(
  target: DynamicToolTarget,
  key: object,
  slot: EphemeralToolSlot,
  definition: T,
): void {
  disposeEphemeralTool(key, slot)
  const disposer = target.register(definition)
  const slots = ephemeralToolDisposers.get(key) ?? new Map<EphemeralToolSlot, () => void>()
  slots.set(slot, disposer)
  ephemeralToolDisposers.set(key, slots)
}

function disposeDynamicTeachingTools(key: object): void {
  disposeEphemeralTool(key, 'visual')
}

function dynamicToolTarget(services: LearningAgentContext, exec: ToolRunContext): DynamicToolTarget {
  const candidate = exec.agent as (ToolRunContext['agent'] & { id?: unknown }) | undefined
  return candidate?.ctx?.tools !== undefined
    ? candidate.ctx.tools
    : services.tools
}

function dynamicToolKey(_services: LearningAgentContext, exec: ToolRunContext): object {
  const candidate = exec.agent as (ToolRunContext['agent'] & { id?: unknown }) | undefined
  return candidate?.ctx?.tools !== undefined
    ? candidate
    : GLOBAL_DYNAMIC_TOOL_KEY
}

function assertSingleCheckpointInModelStep(exec: ToolRunContext): void {
  const agent = exec.agent
  if (agent === undefined) {
    throw new LearningProtocolError(['learning_checkpoint requires a live agent session'])
  }
  const position = modelStepPosition(exec)
  if (position === undefined) {
    throw new LearningProtocolError(['learning_checkpoint callId is absent from the session tool/call log'])
  }
  const names = modelStepToolNames(agent, position)
  if (names.filter(name => name === 'learning_checkpoint').length > 1) {
    throw new LearningProtocolError(['a model step may contain at most one learning_checkpoint call'])
  }
  if (names.some(name => name !== 'learning_checkpoint')) {
    throw new LearningProtocolError(['learning_checkpoint must be the only tool call in its model step'])
  }
}

interface ModelStepPosition {
  turn: number
  step: number
}

type ToolCallContext = Pick<ToolRunContext, 'agent' | 'callId'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Locate the model step that owns one direct tool execution. */
function modelStepPosition(exec: ToolCallContext): ModelStepPosition | undefined {
  const agent = exec.agent
  if (agent === undefined) return undefined
  const callId = String(exec.callId)
  for (const event of [...agent.session.snapshotEvents()].reverse()) {
    if (event.type !== 'tool/call' || String(event.data.callId) !== callId) continue
    return { turn: event.data.turn, step: event.data.step }
  }
  return undefined
}

/** Include calls already logged and calls still waiting in the assistant step. */
function modelStepToolNames(agent: Agent, position: ModelStepPosition): readonly string[] {
  const names: string[] = []
  for (const event of agent.session.snapshotEvents()) {
    if (event.type === 'tool/call'
      && event.data.turn === position.turn
      && event.data.step === position.step) {
      names.push(event.data.name)
    }
  }
  const assistant = [...agent.session.snapshotEvents()].reverse().find(event => (
    event.type === 'assistant/message'
      && event.data.turn === position.turn
      && event.data.step === position.step
  ))
  if (assistant?.type !== 'assistant/message') return names
  const content = isRecord(assistant.data.message) ? assistant.data.message.content : undefined
  if (!Array.isArray(content)) return names
  for (const block of content) {
    if (!isRecord(block) || block.type !== 'tool-call' || typeof block.name !== 'string') continue
    names.push(block.name)
  }
  return [...new Set(names)]
}

function completedToolCallIds(agent: Agent, position: ModelStepPosition): ReadonlySet<string> {
  const ids = new Set<string>()
  for (const event of agent.session.snapshotEvents()) {
    if (event.type !== 'tool/result'
      || event.data.turn !== position.turn
      || event.data.step !== position.step) continue
    const content = event.data.message.content
    for (const block of content) {
      if (block.type === 'tool-result') ids.add(String(block.toolCallId))
    }
  }
  return ids
}

/**
 * Whether a state observation earlier in this step is still unresolved.
 *
 * Only `learning_material_recall` is ordered against it: that tool takes no
 * query and derives what to retrieve from the state being maintained, so a
 * half-applied update would retrieve against a stale picture. `map`, `read`
 * and `search` are addressed by the caller and read nothing from state, so
 * serializing them bought an extra model round trip for no correctness.
 */
function hasPendingStateUpdateInModelStep(exec: ToolCallContext): boolean {
  const agent = exec.agent
  const position = modelStepPosition(exec)
  if (agent === undefined || position === undefined) return false
  const names = modelStepToolNames(agent, position)
  if (!names.includes('learning_state_update')) return false
  const calls = agent.session.snapshotEvents().filter(event => (
    event.type === 'tool/call'
      && event.data.turn === position.turn
      && event.data.step === position.step
      && event.data.name === 'learning_state_update'
  ))
  const completed = completedToolCallIds(agent, position)
  return calls.some(call => !completed.has(String((call.data as { callId?: unknown }).callId)))
    || calls.length < names.filter(name => name === 'learning_state_update').length
}

function assertOnlyToolInModelStep(exec: ToolCallContext, expectedName: string): void {
  const agent = exec.agent
  const position = modelStepPosition(exec)
  if (agent === undefined || position === undefined) return
  const names = modelStepToolNames(agent, position)
  if (names.some(name => name !== expectedName)) {
    throw new LearningProtocolError([`${expectedName} must be the only tool call in its model step`])
  }
  if (names.filter(name => name === expectedName).length > 1) {
    throw new LearningProtocolError([`a model step may contain at most one ${expectedName} call`])
  }
}

function sourceAnchorsFromEvent(value: unknown): readonly string[] {
  if (!isRecord(value) || value.type !== 'source_anchors_observed' || !Array.isArray(value.anchors)) return []
  return value.anchors.filter((anchor): anchor is string => typeof anchor === 'string')
}

function boundedSelectionText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim()
  if (normalized === '') throw new TypeError(`${field} requires non-empty text`)
  if (normalized.length > maxLength) throw new TypeError(`${field} must not exceed ${String(maxLength)} characters`)
  return normalized
}

export function apply(ctx: Context): void {
  const services = ctx as LearningAgentContext

  // The route is resolved at the exact boundary where the claimed user input
  // is known and just before the loop assembles the next model request. A
  // pre-step listener is too late to change the system prompt, and rejecting
  // a non-learning turn would incorrectly close it as `blocked`.
  ctx.on('agent/inbox/claimed', ({ agent, message, turn }) => {
    if (message.source.kind !== 'user') return
    // A payload schema belongs only to the selector/model loop that exposed it.
    // A new learner message starts a new decision and retires unfinished work.
    disposeDynamicTeachingTools(agent)
    richTeachingMoves.delete(agent)
    beginMaterialTurn(agent, turn)
    const transcript = learnerTranscriptStates.get(agent)
    if (transcript !== undefined && transcript.session !== agent.session) {
      learnerTranscriptStates.delete(agent)
    }
    const text = textFromUserMessage(message)
    const mentions = parseFileMentions(text)
    if (mentions.length === 0) pendingMaterialMentions.delete(agent)
    else pendingMaterialMentions.set(agent, mentions)
    if (text === '') return
    const currentState = services.learningActivities.learnerState(agent)
    const language = languageOf(text)
    learningPromptStates.set(agent, {
      graded: currentState.assessmentContext === 'graded' || GRADED_CONTEXT.test(text),
      language,
    })
    // Host-side tools write text the learner reads — the card save dialog and
    // the review deck — and have no other way to know which language to use.
    // A mixed turn counts as Chinese: the learner wrote some, so they read it.
    services.learningActivities.setTurnLocale(agent, language === 'en' ? 'en' : 'zh')
    const previous = learningRoutes.get(agent)
    const session: LearningRouteSession = previous === undefined
      ? { active: durableLearningSegmentActive(services, agent) }
      : previous.segment === 'closed'
        ? { active: false }
      : learningSegmentComplete(services, agent)
        ? { active: false }
        : { active: true, decision: previous }
    const decision = routeLearningTurn(text, session)
    learningRoutes.set(agent, decision)
    if (needsSemanticRoute(decision)) {
      pendingSemanticRoutes.set(agent, { text, turn, session, base: decision })
    } else {
      pendingSemanticRoutes.delete(agent)
      recordLearningRouteAnchor(services, agent, turn, session, decision)
    }
  })

  // The durable projection runs once a turn has stopped, so the vault write is
  // never on the critical path of a model request.
  ctx.on('agent/turn-stopping', async ({ agent }) => {
    await projectLearnerMemory(services, agent)
  })

  ctx.on('tools/pre-execute', (execution, next) => {
    const agent = execution.agent
    const decision = agent === undefined ? undefined : learningRoutes.get(agent)
    if (decision?.intent.intent === 'learn'
      && decision.confidence !== 'low'
      && execution.name === GENERIC_USER_WAIT_TOOL) {
      return Promise.resolve({
        kind: 'deny' as const,
        reason: 'ask calibration questions in ordinary text; learning_checkpoint is the only deliberate Learning wait',
      })
    }
    if (isConfidentNotLearn(decision) && execution.name.startsWith(LEARNING_TOOL_PREFIX)) {
      return Promise.resolve({ kind: 'deny' as const, reason: 'learning tools are disabled for an ordinary turn' })
    }
    if (decision?.intent.intent === 'learn'
      && agent !== undefined
      && execution.name === STATE_DERIVED_MATERIAL_TOOL
      && hasPendingStateUpdateInModelStep(execution)) {
      return Promise.resolve({
        kind: 'deny' as const,
        reason: 'finish learning_state_update in an earlier tool step before calling learning_material_recall, which retrieves from that state',
      })
    }
    if (!learningToolAvailable(
      decision,
      execution.name,
      services.learningActivities.richClientAvailable,
      agent,
      agent === undefined ? undefined : services.learningActivities.learnerState(agent),
    )) {
      return Promise.resolve({
        kind: 'deny' as const,
        reason: 'this rich learning tool is unavailable for the current route or client; continue in ordinary text',
      })
    }
    const requestedRichMove = richTeachingMoveForTool(execution.name)
    const currentRichMove = agent === undefined ? undefined : richTeachingMoves.get(agent)
    if (requestedRichMove !== undefined && currentRichMove !== undefined && requestedRichMove !== currentRichMove) {
      return Promise.resolve({
        kind: 'deny' as const,
        reason: `a user turn may use either a learning ${currentRichMove} or a learning ${requestedRichMove}, not both`,
      })
    }
    return next()
  })

  // A Learning agent can receive an ordinary task after a teaching turn. Make
  // that individual model request ordinary by removing the learning tool
  // schemas, and keep the standing policy — it already says to answer a
  // concrete blocker directly and briefly. The asymmetry is deliberate: the
  // classifier is far likelier to be wrong about a learner than about a real
  // task, and stripping the policy turned every such misread into a session
  // with no teaching surface at all, with nothing in the reply to signal why.
  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const agent = context.agent
    // Prepare the current attachment before the assembled prompt is returned.
    // The policy section is patched after `next()` because section providers
    // render synchronously while the assembly hook itself is asynchronous.
    if (agent !== undefined) {
      await resolvePendingSemanticRoute(services, agent, context.signal)
      await prepareAttachedMaterial(services, agent)
      await refreshVaultFlags(services, agent)
    }
    const decision = agent === undefined ? undefined : learningRoutes.get(agent)
    const assembly = addPreparedMaterialPolicy(await next(), agent)
    const ordinary = isConfidentNotLearn(decision)
    return {
      ...assembly,
      tools: assembly.tools.filter(tool => ordinary
        ? !tool.name.startsWith(LEARNING_TOOL_PREFIX)
        : learningToolAvailable(
          decision,
          tool.name,
          services.learningActivities.richClientAvailable,
          agent,
          agent === undefined ? undefined : services.learningActivities.learnerState(agent),
        )),
    }
  })

  // Read-only, vault-confined access to the learner's own material. Registered
  // unconditionally so the tool catalog does not change with whether a vault
  // exists; a session outside one gets a structured `no-vault` answer.
  registerMaterialTools(services)
  registerConceptTools(services)


  services.tools.register(closeParameterRoot(defineTool({
    name: 'learning_visual_select',
    description: 'Use only when a visual will materially clarify one relationship. Make this tool call the only output of the selector step; wait until learning_visual returns before writing teaching prose. Select one native kind, state its teaching purpose, and bind it to exactly one learner action or paired question; the selected kind-specific learning_visual schema is exposed on the next model step. Do not select a visual for a definition, short fact, or already-clear explanation.',
    parameters: visualSelectorParameters,
    output: {
      schema: visualSelectorOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      assertOnlyToolInModelStep(exec, 'learning_visual_select')
      const purpose = boundedSelectionText(args.purpose, 'learning_visual_select.purpose', 500)
      const learnerAction = typeof args.learnerAction === 'string' ? args.learnerAction.trim() : ''
      const pairedQuestion = typeof args.pairedQuestion === 'string' ? args.pairedQuestion.trim() : ''
      if ((learnerAction === '') === (pairedQuestion === '')) {
        throw new TypeError('learning_visual_select requires exactly one of learnerAction or pairedQuestion')
      }
      if (learnerAction !== '') boundedSelectionText(learnerAction, 'learning_visual_select.learnerAction', 500)
      if (pairedQuestion !== '') boundedSelectionText(pairedQuestion, 'learning_visual_select.pairedQuestion', 1_000)
      const selection: VisualSelection = {
        kind: args.kind,
        purpose,
        ...(learnerAction === '' ? {} : { learnerAction }),
        ...(pairedQuestion === '' ? {} : { pairedQuestion }),
      }
      const target = dynamicToolTarget(services, exec)
      const targetKey = dynamicToolKey(services, exec)
      const definition = closeParameterRoot(defineTool({
        name: 'learning_visual',
        description: visualDescription(selection),
        parameters: learningVisualParametersV4(selection.kind),
        output: {
          schema: LEARNING_VISUAL_RESULT_SCHEMA_V4,
          render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
        },
        isConcurrencySafe: () => true,
        async execute(payload, payloadExec) {
          const visual = parseLearningVisualV4(payload)
          // Only a saved-concepts study map is materialized by the Host, so the
          // echoed content is that one shape rather than the whole union.
          let materializedStudyMap: LearningStudyMapV4 | undefined
          const vault = await resolveTopicVault(services, payloadExec.agent?.session.header.cwd)
          // A study map is the one visual that asserts something about the
          // learner's own document. Inside a vault that assertion is checkable,
          // so it is checked — before the ephemeral tool is disposed, leaving
          // the model able to rebuild the map from the real structure.
          if (visual.content.kind === 'study_map') {
            if (vault !== undefined) {
              if (visual.content.view === 'concepts') {
                materializedStudyMap = await buildConceptStudyMap(vault, visual.content.goal)
              } else {
                const violations = await validateStudyMapAgainstVault(vault, visual.content)
                if (violations.length > 0) throw new TypeError(formatStudyMapViolations(violations))
              }
            } else if (visual.content.view === 'concepts') {
              throw new TypeError('study_map concepts view requires a learning vault')
            }
          } else if (visual.content.kind === 'recall_deck' && vault !== undefined) {
            const violations = await validateRecallDeckAgainstVault(
              vault,
              visual.content,
              payloadExec.agent === undefined ? undefined : services.learningActivities.turnLocale(payloadExec.agent),
            )
            if (violations.length > 0) {
              throw new TypeError(`recall_deck must copy saved concept cards verbatim: ${violations.join('; ')}`)
            }
          }
          try {
            return {
              protocol: VISUAL_RESULT_PROTOCOL_V4,
              status: services.learningActivities.recordVisual(payloadExec.agent, String(payloadExec.callId)),
              ...(materializedStudyMap === undefined ? {} : { content: materializedStudyMap }),
            } satisfies LearningVisualResultV4
          } finally {
            queueMicrotask(() => {
              const key = dynamicToolKey(services, payloadExec)
              disposeEphemeralTool(key, 'visual')
            })
          }
        },
        presentCall: payload => ({
          card: 'generic',
          title: typeof payload.title === 'string' ? payload.title : 'Interactive visual',
          kind: 'other',
        }),
      }))
      registerEphemeralTool(target, targetKey, 'visual', definition)
      if (exec.agent !== undefined) richTeachingMoves.set(exec.agent, 'visual')
      return { status: 'selected' as const, kind: selection.kind }
    },
  })))

  services.tools.register(closeParameterRoot(defineTool({
    name: 'learning_state_update',
    description: [
      'Internal, immediate, non-rich session-state update from concrete observable evidence in the current learner message/action or supplied source, or from the exact assistant teaching move already prepared for this turn.',
      'Call only when the observation substantively changes the next teaching move; never call mechanically every turn and never infer a hidden trait, personality, emotion, or learning style.',
      'Use assistant_move_observed only to record the explanation, question, representation, and move fingerprint you are about to emit, so a later turn can avoid repeating it; never use it as learner evidence or mastery evidence.',
      'Use update for one new observation, correct only after an explicit user correction, and reset only at a real session-local learning-boundary reset. A goal_observed event establishes a missing goal; never replace an active goal with a checkpoint prompt or plan objective—reset on a real topic switch or use correct for an explicit user correction. Honor an explicit mastery correction. If the learner merely asks not to be quizzed further, correct phase=complete and nextMove=complete without inventing transfer.',
      'plan_observed records the route only when a multi-step goal genuinely needs one; plan_step_evidenced advances a step only from evidence the learner produced. A plan is never a checklist to march through, never announced every turn, and never a reason to continue after demonstrated transfer or a sufficiently confident complete explanation/attempt.',
      'The Host reads the current revision synchronously and applies compare-and-swap protection; do not invent or guess revision metadata. If a retry races with another update, only an exact replay or a safe additive observation may be merged; corrections, resets, and replacement updates remain strict.',
      'Assistant visual and checkpoint moves are recorded automatically; do not duplicate them here. This tool performs no user wait and must not replace ordinary conversation.',
    ].join(' '),
    parameters: {
      action: { type: 'string', enum: ['update', 'correct', 'reset'], required: true },
      event: {
        ...learnerStateEvent,
        description: 'Required only for action=update; exactly one concrete observable state event.',
      },
      correction: {
        ...learnerStateCorrection,
        description: 'Required only for action=correct; fields explicitly corrected by the user.',
      },
      observation: {
        ...userCorrectionObservation,
        description: 'Required only for action=correct; the explicit user correction that justifies it.',
      },
    },
    output: {
      schema: learnerStateUpdateOutput,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const agent = exec.agent
      if (agent === undefined) throw new Error('learning_state_update requires a live agent session')
      const expectedRevision = services.learningActivities.learnerState(agent).revision
      if (args.action === 'update') {
        if (args.event === undefined || args.correction !== undefined || args.observation !== undefined) {
          throw new TypeError('action=update requires only event')
        }
        assertMaterialAnchorsReadable(agent, sourceAnchorsFromEvent(args.event))
        return services.learningActivities.updateLearnerState({
          action: 'update',
          agent,
          expectedRevision,
          event: args.event as unknown as ObservableLearnerStateUpdate,
        }) satisfies LearningStateUpdateResult
      }
      if (args.action === 'correct') {
        if (args.event !== undefined || args.correction === undefined || args.observation === undefined) {
          throw new TypeError('action=correct requires only correction and observation')
        }
        return services.learningActivities.updateLearnerState({
          action: 'correct',
          agent,
          expectedRevision,
          correction: args.correction as unknown as LearnerStateCorrection,
          observation: args.observation as unknown as ObservableLearnerEvent & { source: 'user-correction' },
        }) satisfies LearningStateUpdateResult
      }
      if (args.event !== undefined || args.correction !== undefined || args.observation !== undefined) {
        throw new TypeError('action=reset accepts no event, correction, or observation')
      }
      return services.learningActivities.updateLearnerState({
        action: 'reset',
        agent,
        expectedRevision,
      }) satisfies LearningStateUpdateResult
    },
  })))

  services.tools.register(closeParameterRoot(defineTool({
    name: 'learning_checkpoint',
    description: [
      'Optionally request one high-value reflective pause when the learner response will materially change the next teaching move.',
      'Ordinary conversation remains the default, and this is the sole deliberate user wait — not a per-turn ceremony or Continue ritual.',
      'Give one self-contained, answer-free prompt and the evidence it should produce. Provide options only for kind=single_choice: two to eight answer-free choices.',
      'There is no correct-answer, rubric, solution, future-step, Reveal, or Continue field; never smuggle one into the prompt, the context, or the fallback.',
      'Make this the only tool call in its model step. A skipped, cancelled, unavailable, or failed pause falls back to ordinary conversation without withholding teaching.',
    ].join(' '),
    parameters: learningCheckpointParametersOneStepV1(),
    output: {
      schema: LEARNING_CHECKPOINT_RESULT_SCHEMA_V1,
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    isConcurrencySafe: () => false,
    async execute(payload, exec) {
      const checkpoint = parseLearningCheckpointV1(payload)
      assertSingleCheckpointInModelStep(exec)
      if (exec.agent !== undefined) richTeachingMoves.set(exec.agent, 'checkpoint')
      return await services.learningActivities.presentCheckpoint({
        checkpoint,
        agent: exec.agent,
        signal: exec.signal,
        callId: String(exec.callId),
      }) satisfies LearningCheckpointResultV1
    },
  })))

  services.systemPrompt.section({
    name: 'learning:policy',
    order: 20,
    text: context => {
      const agent = context.agent
      const decision = agent === undefined ? undefined : learningRoutes.get(agent)
      const promptState = agent === undefined ? undefined : learningPromptStates.get(agent)
      return buildLearningTeachingPolicy({
        graded: promptState?.graded ?? false,
        language: promptState?.language ?? 'en',
        route: decision?.route,
        material: agent === undefined ? false : vaultHasMaterial.get(agent) ?? false,
        concepts: agent === undefined ? false : vaultHasConcepts.get(agent) ?? false,
        vault: agent === undefined ? false : vaultAvailable.get(agent) ?? false,
        visual: decision !== undefined && learningToolAvailable(
          decision,
          'learning_visual_select',
          services.learningActivities.richClientAvailable,
          agent,
          agent === undefined ? undefined : services.learningActivities.learnerState(agent),
        ),
      })
    },
  })
  services.systemPrompt.context({
    name: 'learning:turn-route',
    order: 19,
    text: context => {
      const agent = context.agent
      const decision = agent === undefined ? undefined : learningRoutes.get(agent)
      return decision === undefined
        ? ''
        : routeContextText(
            decision,
            services.learningActivities.richClientAvailable,
            agent === undefined ? false : vaultHasMaterial.get(agent) === true,
          )
    },
  })
  services.systemPrompt.context({
    name: 'learning:learner-state',
    order: 20,
    text: context => {
      const agent = context.agent
      if (agent === undefined) return ''
      const state = services.learningActivities.learnerState(agent)
      const previous = learnerTranscriptStates.get(agent)
      const sameSession = previous?.session === agent.session
      learnerTranscriptStates.set(agent, { session: agent.session, state })
      const current = previous === undefined || !sameSession
        ? services.learningActivities.learnerStateTranscript(agent, 300)
        : compactLearnerStateDelta(state, previous.state)
      // Prior learning is sent once per session, with the first full transcript.
      // Repeating it every turn would spend tokens restating a stable prior and
      // invite treating it as something observed this turn.
      const memory = !sameSession ? learnerMemoryBlocks.get(agent) ?? '' : ''
      if (memory === '') return current
      return current === '' ? memory : `${memory}\n\n${current}`
    },
  })
}
