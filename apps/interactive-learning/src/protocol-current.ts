/** Current visual/checkpoint protocol shared by the Host, Agent, and Client. */

import { MathParseError, parseMathExpression } from './math-parser.ts'
import {
  CHECKPOINT_PROTOCOL,
  CHECKPOINT_RESULT_PROTOCOL,
  LEARNING_CHECKPOINT_EVIDENCE_KINDS,
  LEARNING_CHECKPOINT_KINDS,
  LEARNING_VISUAL_KINDS_V4,
  LEARNING_VISUAL_STATUSES,
  MATH_BINARY_OPERATORS,
  MATH_UNARY_OPERATORS,
  MAX_VISUAL_MATH_DEPTH,
  VISUAL_PROTOCOL_V4,
  VISUAL_RESULT_PROTOCOL_V4,
  validateLearningCheckpointResultSchemaV1,
  validateLearningCheckpointSchemaV1,
  validateLearningVisualResultSchemaV4,
  validateLearningVisualSchemaV4,
  type GeneratedLearningCheckpointOptionV1,
  type GeneratedLearningCheckpointResponseV1,
  type GeneratedLearningCheckpointResultV1,
  type GeneratedLearningCheckpointV1,
  type GeneratedLearningVisualResultV4,
  type GeneratedLearningVisualV4,
} from './protocol-schema.ts'
import { LearningProtocolError } from './protocol-errors.ts'

export { LearningProtocolError } from './protocol-errors.ts'

export {
  CHECKPOINT_PROTOCOL,
  CHECKPOINT_RESULT_PROTOCOL,
  LEARNING_CHECKPOINT_EVIDENCE_KINDS,
  LEARNING_CHECKPOINT_KINDS,
  LEARNING_VISUAL_KINDS_V4,
  LEARNING_VISUAL_STATUSES,
  MATH_BINARY_OPERATORS,
  MATH_UNARY_OPERATORS,
  MAX_VISUAL_MATH_DEPTH,
  VISUAL_PROTOCOL_V4,
  VISUAL_RESULT_PROTOCOL_V4,
} from './protocol-schema.ts'

export type {
  GeneratedLearningCheckpointOptionV1,
  GeneratedLearningCheckpointResponseV1,
  GeneratedLearningCheckpointResultV1,
  GeneratedLearningCheckpointV1,
  GeneratedLearningVisualResultV4,
  GeneratedLearningVisualV4,
} from './protocol-schema.ts'

export const RECALL_FEEDBACK_PROTOCOL_V1 = 'dsh-learning/recall-feedback@1' as const
export const CHECKPOINT_TRANSPORT_PROTOCOL = 'dsh-learning/checkpoint-wait@1' as const
export const MAX_ACTIVITY_BYTES = 64 * 1024
export const MAX_RESPONSE_BYTES = 32 * 1024
export const MAX_MATH_NODES = 64

export type LearningAction = 'submit' | 'skip' | 'cancel'
export type LearningJson = null | boolean | number | string | LearningJson[] | { [key: string]: LearningJson }
export type LearningCheckpointKindV1 = typeof LEARNING_CHECKPOINT_KINDS[number]
export type LearningCheckpointEvidenceKindV1 = typeof LEARNING_CHECKPOINT_EVIDENCE_KINDS[number]

export type MathExpressionV1 =
  | { op: 'constant'; value: number }
  | { op: 'variable'; name: string }
  | { op: typeof MATH_BINARY_OPERATORS[number]; left: MathExpressionV1; right: MathExpressionV1 }
  | { op: typeof MATH_UNARY_OPERATORS[number]; value: MathExpressionV1 }

export interface ProcessCheckpointV1 {
  question: string
  options?: string[]
}

export interface ProcessStepV1 {
  id: string
  title: string
  content: string
  checkpoint?: ProcessCheckpointV1
}

export interface StructureItemV1 {
  id: string
  label: string
  detail?: string
}

/** Types are generated from the same schema used by tools and Host validation. */
export type LearningCheckpointOptionV1 = GeneratedLearningCheckpointOptionV1
export type LearningCheckpointV1 = GeneratedLearningCheckpointV1
export type LearningCheckpointResponseV1 = GeneratedLearningCheckpointResponseV1

/**
 * Why a non-submitted checkpoint ended.  The field is optional on v1 result
 * records so older persisted receipts remain readable; new Host/Client
 * receipts should always provide it.
 */
export type LearningCheckpointSkippedReasonV1 = NonNullable<
  Extract<GeneratedLearningCheckpointResultV1, { status: 'skipped' }>['reason']
>

export type LearningCheckpointCancelledReasonV1 = NonNullable<
  Extract<GeneratedLearningCheckpointResultV1, { status: 'cancelled' }>['reason']
>

export type LearningCheckpointOutcomeReasonV1 =
  | LearningCheckpointSkippedReasonV1
  | LearningCheckpointCancelledReasonV1

export type LearningCheckpointSubmittedResultV1 = Extract<
  GeneratedLearningCheckpointResultV1,
  { status: 'submitted' }
>
export type LearningCheckpointSkippedResultV1 = Extract<
  GeneratedLearningCheckpointResultV1,
  { status: 'skipped' }
>
export type LearningCheckpointCancelledResultV1 = Extract<
  GeneratedLearningCheckpointResultV1,
  { status: 'cancelled' }
>
export type LearningCheckpointResultV1 = GeneratedLearningCheckpointResultV1

/** Durable safe projection used only to recover one pending checkpoint wait. */
export interface LearningCheckpointWaitEnvelopeV1 {
  transport: typeof CHECKPOINT_TRANSPORT_PROTOCOL
  sessionId: string
  callId: string
  waitId: string
  checkpointId: string
  checkpoint: LearningCheckpointV1
}

export type LearningCheckpointWaitEnvelopeInputV1 = Omit<LearningCheckpointWaitEnvelopeV1, 'transport'>

export type LearningVisualToneV3 = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray'
export type LearningVisualStrokeV3 = 'solid' | 'dashed' | 'dotted'
export interface LearningVisualAxisV3 {
  label?: string
  min: number
  max: number
  samples?: number
}
export interface LearningVisualCurveV3 {
  type: 'curve'
  id: string
  label: string
  expression: string
  tone?: LearningVisualToneV3
  stroke?: LearningVisualStrokeV3
}
export interface LearningVisualPointV3 {
  x: number
  y: number
  label?: string
}
export interface LearningVisualPointSeriesV3 {
  type: 'points'
  id: string
  label: string
  points: LearningVisualPointV3[]
  tone?: LearningVisualToneV3
}
export type LearningVisualSeriesV3 = LearningVisualCurveV3 | LearningVisualPointSeriesV3
export interface LearningVisualMetricV3 {
  id: string
  label: string
  expression: string
  digits?: number
  suffix?: string
}

export type LearningVisualKindV4 = typeof LEARNING_VISUAL_KINDS_V4[number]
export type LearningVisualToneV4 = LearningVisualToneV3
export type LearningVisualStrokeV4 = LearningVisualStrokeV3

export interface LearningVisualLineSeriesV4 {
  type: 'line'
  id: string
  label: string
  points: LearningVisualPointV3[]
  tone?: LearningVisualToneV4
  stroke?: LearningVisualStrokeV4
}

export interface LearningVisualBarSeriesV4 {
  type: 'bars'
  id: string
  label: string
  points: LearningVisualPointV3[]
  tone?: LearningVisualToneV4
}

export type LearningPlotSeriesV4 =
  | LearningVisualCurveV3
  | LearningVisualPointSeriesV3
  | LearningVisualLineSeriesV4
  | LearningVisualBarSeriesV4

/** One slider a learner can move; its id is what expressions name. */
export interface LearningVisualParameterV4 {
  id: string
  label: string
  min: number
  max: number
  step: number
  initial: number
}

export interface LearningPlotV4 {
  kind: 'plot'
  parameters?: LearningVisualParameterV4[]
  xAxis: LearningVisualAxisV3
  yAxis: LearningVisualAxisV3
  series: LearningPlotSeriesV4[]
  metrics?: LearningVisualMetricV3[]
}

export interface LearningNodeGroupV4 {
  id: string
  label: string
}

export interface LearningNodeV4 {
  id: string
  label: string
  detail?: string
  group?: string
  tone?: LearningVisualToneV4
}

export interface LearningEdgeV4 {
  id: string
  from: string
  to: string
  label?: string
  detail?: string
  tone?: LearningVisualToneV4
  stroke?: LearningVisualStrokeV4
  directed?: boolean
}

export interface LearningNodeLinkV4 {
  kind: 'node_link'
  layout: 'layered' | 'hierarchy' | 'radial'
  groups?: LearningNodeGroupV4[]
  nodes: LearningNodeV4[]
  edges: LearningEdgeV4[]
}

interface LearningSceneElementBaseV4 {
  id: string
  label?: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningScenePointV4 extends LearningSceneElementBaseV4 {
  type: 'point'
  x: number
  y: number
  size?: number
}

export interface LearningSceneSegmentV4 extends LearningSceneElementBaseV4 {
  type: 'segment' | 'arrow'
  x1: number
  y1: number
  x2: number
  y2: number
  stroke?: LearningVisualStrokeV4
}

export interface LearningSceneCircleV4 extends LearningSceneElementBaseV4 {
  type: 'circle'
  cx: number
  cy: number
  r: number
}

export interface LearningSceneRectV4 extends LearningSceneElementBaseV4 {
  type: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export interface LearningScenePolygonV4 extends LearningSceneElementBaseV4 {
  type: 'polygon'
  points: Array<{ x: number; y: number }>
}

export interface LearningSceneLabelV4 extends LearningSceneElementBaseV4 {
  type: 'label'
  x: number
  y: number
  text: string
}

export type LearningSceneElementV4 =
  | LearningScenePointV4
  | LearningSceneSegmentV4
  | LearningSceneCircleV4
  | LearningSceneRectV4
  | LearningScenePolygonV4
  | LearningSceneLabelV4

export interface LearningScene2DV4 {
  kind: 'scene_2d'
  xAxis: LearningVisualAxisV3
  yAxis: LearningVisualAxisV3
  grid?: boolean
  elements: LearningSceneElementV4[]
}

export interface LearningRelationSubjectV4 {
  id: string
  label: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningRelationComparisonRowV4 {
  id: string
  label: string
  cells: Array<{ subjectId: string; value: string; tone?: LearningVisualToneV4 }>
  detail?: string
}

export interface LearningComparisonRelationV4 {
  kind: 'relation'
  variant: 'comparison'
  subjects: LearningRelationSubjectV4[]
  rows: LearningRelationComparisonRowV4[]
}

export interface LearningRelationAxisItemV4 {
  id: string
  label: string
}

export interface LearningRelationMatrixCellV4 {
  id: string
  rowId: string
  columnId: string
  label: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningMatrixRelationV4 {
  kind: 'relation'
  variant: 'matrix'
  rows: LearningRelationAxisItemV4[]
  columns: LearningRelationAxisItemV4[]
  cells: LearningRelationMatrixCellV4[]
}

export interface LearningRelationSetV4 {
  id: string
  label: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningRelationSetItemV4 {
  id: string
  label: string
  setIds: string[]
  detail?: string
}

export interface LearningSetsRelationV4 {
  kind: 'relation'
  variant: 'sets'
  sets: LearningRelationSetV4[]
  items: LearningRelationSetItemV4[]
}

export type LearningRelationV4 =
  | LearningComparisonRelationV4
  | LearningMatrixRelationV4
  | LearningSetsRelationV4

export interface LearningTimelineEventV4 {
  id: string
  time: string
  label: string
  detail?: string
  /** Optional normalized position from 0 to 1; omit for equal spacing. */
  position?: number
  tone?: LearningVisualToneV4
}

export interface LearningTimelineEraV4 {
  id: string
  label: string
  startEventId: string
  endEventId: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningTimelineV4 {
  kind: 'timeline'
  orientation?: 'horizontal' | 'vertical'
  events: LearningTimelineEventV4[]
  eras?: LearningTimelineEraV4[]
}

export interface LearningFormulaStepV4 {
  id: string
  /** A single trusted Markdown-math expression, preferably LaTeX without delimiters. */
  expression: string
  label?: string
  /** The named rule that transforms the preceding expression into this one. */
  rule?: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningFormulaStepsV4 {
  kind: 'formula_steps'
  notation?: string
  steps: LearningFormulaStepV4[]
  conclusion?: string
}

export interface LearningStudySectionV4 {
  id: string
  label: string
  /** Human-readable source location such as “Chapter 2” or “pp. 18–23”. */
  anchor?: string
  summary?: string
}

export interface LearningStudyConceptV4 {
  id: string
  label: string
  sectionId: string
  detail?: string
  /** Stable concept-card identity when this is a saved-concepts view. */
  conceptSlug?: string
  mastery?: 'unseen' | 'emerging' | 'transfer'
  due?: string
  stale?: boolean
  prerequisiteIds?: string[]
  role?: 'foundation' | 'core' | 'extension' | 'practice'
  tone?: LearningVisualToneV4
}

export interface LearningStudyMapV4 {
  kind: 'study_map'
  /** `concepts` asks the Host to materialize the saved card state. */
  view?: 'material' | 'concepts'
  sourceLabel: string
  goal?: string
  sections: LearningStudySectionV4[]
  concepts: LearningStudyConceptV4[]
}

export interface LearningRecallCardV4 {
  id: string
  prompt: string
  answer: string
  hint?: string
  tags?: string[]
}

export interface LearningRecallDeckV4 {
  kind: 'recall_deck'
  instructions?: string
  cards: LearningRecallCardV4[]
}

export type LearningTableValueV4 = string | number | boolean | null

export interface LearningDataTableColumnV4 {
  id: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date'
  unit?: string
}

export interface LearningDataTableCellV4 {
  columnId: string
  value: LearningTableValueV4
}

export interface LearningDataTableRowV4 {
  id: string
  cells: LearningDataTableCellV4[]
  detail?: string
}

export interface LearningDataTableSortV4 {
  columnId: string
  direction: 'asc' | 'desc'
}

export interface LearningDataTableFilterV4 {
  columnId: string
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte'
  value: LearningTableValueV4
}

export interface LearningDataTableChartV4 {
  type: 'line' | 'bar' | 'scatter'
  xColumnId: string
  yColumnId: string
  seriesColumnId?: string
}

export interface LearningDataTableV4 {
  kind: 'data_table'
  columns: LearningDataTableColumnV4[]
  rows: LearningDataTableRowV4[]
  outlierIds?: string[]
  initialSort?: LearningDataTableSortV4
  initialFilter?: LearningDataTableFilterV4
  chart?: LearningDataTableChartV4
}

export interface LearningStateTransitionStateV4 {
  id: string
  label: string
  detail?: string
  tone?: LearningVisualToneV4
  initial?: boolean
  final?: boolean
}

export interface LearningStateTransitionTransitionV4 {
  id: string
  from: string
  to: string
  trigger: string
  guard?: string
  action?: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningStateTransitionStepV4 {
  id: string
  label: string
  currentStateId: string
  transitionId?: string
  description?: string
}

export interface LearningStateTransitionV4 {
  kind: 'state_transition'
  states: LearningStateTransitionStateV4[]
  transitions: LearningStateTransitionTransitionV4[]
  steps?: LearningStateTransitionStepV4[]
}

export interface LearningSequenceBufferSlotV4 {
  id: string
  index: number
  value: LearningTableValueV4
  label?: string
  tone?: LearningVisualToneV4
}

export interface LearningSequenceBufferPointerV4 {
  id: string
  label: string
  index: number
  tone?: LearningVisualToneV4
}

export interface LearningSequenceBufferRangeV4 {
  id: string
  label: string
  start: number
  end: number
  tone?: LearningVisualToneV4
}

export interface LearningSequenceBufferSlotSnapshotV4 {
  slotId: string
  value?: LearningTableValueV4
}

export interface LearningSequenceBufferPointerSnapshotV4 {
  pointerId: string
  index: number
}

export interface LearningSequenceBufferRangeSnapshotV4 {
  rangeId: string
  start: number
  end: number
}

export interface LearningSequenceBufferStepV4 {
  id: string
  label: string
  description?: string
  slots?: LearningSequenceBufferSlotSnapshotV4[]
  pointers?: LearningSequenceBufferPointerSnapshotV4[]
  ranges?: LearningSequenceBufferRangeSnapshotV4[]
}

export interface LearningSequenceBufferV4 {
  kind: 'sequence_buffer'
  slots: LearningSequenceBufferSlotV4[]
  pointers?: LearningSequenceBufferPointerV4[]
  ranges?: LearningSequenceBufferRangeV4[]
  steps?: LearningSequenceBufferStepV4[]
}

export interface LearningSequenceParticipantV4 {
  id: string
  label: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningSequenceMessageV4 {
  id: string
  from: string
  to: string
  label: string
  type: 'sync' | 'async' | 'return' | 'self'
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningSequenceDiagramV4 {
  kind: 'sequence_diagram'
  participants: LearningSequenceParticipantV4[]
  messages: LearningSequenceMessageV4[]
}

export interface LearningCodeTraceLineV4 {
  number: number
  text: string
}

export interface LearningCodeTraceVariableV4 {
  name: string
  value: LearningTableValueV4
  type?: string
}

export interface LearningCodeTraceStackFrameV4 {
  id: string
  function: string
  line?: number
}

export interface LearningCodeTraceStepV4 {
  id: string
  label: string
  currentLine: number
  variables: LearningCodeTraceVariableV4[]
  stack: LearningCodeTraceStackFrameV4[]
  output?: string
  description?: string
}

export interface LearningCodeTraceV4 {
  kind: 'code_trace'
  language: string
  code: string
  lines: LearningCodeTraceLineV4[]
  steps: LearningCodeTraceStepV4[]
}

export interface LearningFieldAxisV4 {
  label?: string
  min: number
  max: number
  samples?: number
}

export interface LearningScalarFieldGridV4 {
  columns: number
  rows: number
  values: number[]
}

export interface LearningVectorFieldGridV4 {
  columns: number
  rows: number
  u: number[]
  v: number[]
}

export interface LearningScalarFieldV4 {
  samples?: LearningScalarFieldGridV4
  expression?: string
  min?: number
  max?: number
}

export interface LearningVectorFieldV4 {
  samples?: LearningVectorFieldGridV4
  expression?: { u: string; v: string }
}

export interface LearningField2DV4 {
  kind: 'field_2d'
  xAxis: LearningFieldAxisV4
  yAxis: LearningFieldAxisV4
  scalar?: LearningScalarFieldV4
  vector?: LearningVectorFieldV4
}

export interface LearningCausalVariableV4 {
  id: string
  label: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningCausalLinkV4 {
  id: string
  from: string
  to: string
  polarity: 'positive' | 'negative'
  delay?: number
  label?: string
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningCausalLoopV4 {
  id: string
  label: string
  type: 'reinforcing' | 'balancing'
  linkIds: string[]
  detail?: string
  tone?: LearningVisualToneV4
}

export interface LearningCausalLoopDiagramV4 {
  kind: 'causal_loop'
  variables: LearningCausalVariableV4[]
  links: LearningCausalLinkV4[]
  loops?: LearningCausalLoopV4[]
}

export type LearningVisualContentV4 =
  | LearningPlotV4
  | LearningNodeLinkV4
  | LearningScene2DV4
  | LearningRelationV4
  | LearningTimelineV4
  | LearningFormulaStepsV4
  | LearningStudyMapV4
  | LearningRecallDeckV4
  | LearningDataTableV4
  | LearningStateTransitionV4
  | LearningSequenceBufferV4
  | LearningSequenceDiagramV4
  | LearningCodeTraceV4
  | LearningField2DV4
  | LearningCausalLoopDiagramV4

export interface LearningVisualFrameV4 {
  id: string
  label: string
  description?: string
  focusIds: string[]
}

export interface LearningVisualSequenceV4 {
  initialFrameId?: string
  frames: LearningVisualFrameV4[]
}

/**
 * Stable renderer-facing view of the generated model schema. The companion
 * GeneratedLearningVisualV4 type is exported for schema consumers, while this
 * named contract keeps the recursive math AST precise for renderers.
 */
export interface LearningVisualV4 {
  protocol: typeof VISUAL_PROTOCOL_V4
  title: string
  description?: string
  content: LearningVisualContentV4
  sequence?: LearningVisualSequenceV4
  fallbackMarkdown?: string
}

/**
 * Terminal outcome of one `learning_visual` call.
 *
 * `unavailable` means the composition has no renderer for this payload, so the
 * learner saw nothing. The model must then carry the explanation in prose
 * instead of referring to a figure that is not on screen.
 */
export type LearningVisualResultV4 = GeneratedLearningVisualResultV4

export type LearningVisualStatusV4 = typeof LEARNING_VISUAL_STATUSES[number]

/** A learner's explicit recall interaction, sent from the visual Client to Host. */
export const LEARNING_RECALL_STATUSES = ['revealed', 'mastered', 'review'] as const
export type LearningRecallStatusV1 = typeof LEARNING_RECALL_STATUSES[number]

export interface LearningRecallFeedbackV1 {
  protocol: typeof RECALL_FEEDBACK_PROTOCOL_V1
  /** Session identity is part of the wire key; Host still checks it is active. */
  sessionId: string
  /** The semantic visual call that owns the card. */
  callId: string
  cardId: string
  status: LearningRecallStatusV1
}

type RecordValue = Record<string, unknown>

function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function onlyKeys(value: RecordValue, allowed: readonly string[], path: string, issues: string[]): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) issues.push(`${path}.${key} is not supported`)
  }
}

function text(value: unknown, path: string, issues: string[], max = 8_000): value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(`${path} must be a non-empty string`)
    return false
  }
  if (value.length > max) issues.push(`${path} exceeds ${String(max)} characters`)
  return true
}

function boundedIdentity(value: unknown, path: string, issues: string[], max = 512): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max
    || value.trim() !== value || /[\u0000-\u001F\u007F]/u.test(value)) {
    issues.push(`${path} must be a non-empty bounded identity`)
    return false
  }
  return true
}

function finite(value: unknown, path: string, issues: string[]): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(`${path} must be a finite number`)
    return false
  }
  return true
}

function id(value: unknown, path: string, issues: string[]): value is string {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(value)) {
    issues.push(`${path} must match ^[a-z][a-z0-9_-]{0,31}$`)
    return false
  }
  return true
}

function uniqueIds(values: readonly RecordValue[], path: string, issues: string[]): void {
  const seen = new Set<string>()
  for (const [index, value] of values.entries()) {
    if (typeof value.id !== 'string') continue
    if (seen.has(value.id)) issues.push(`${path}[${String(index)}].id duplicates ${value.id}`)
    seen.add(value.id)
  }
}

function jsonBytes(value: unknown): number | undefined {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).byteLength
  } catch {
    return undefined
  }
}

function validateJson(value: unknown, path: string, issues: string[]): value is LearningJson {
  const stack: Array<{ value: unknown; path: string; depth: number }> = [{ value, path, depth: 0 }]
  let nodes = 0
  while (stack.length > 0) {
    const current = stack.pop() as { value: unknown; path: string; depth: number }
    nodes += 1
    if (nodes > 512) {
      issues.push(`${path} exceeds 512 JSON nodes`)
      return false
    }
    if (current.depth > 12) {
      issues.push(`${current.path} exceeds JSON depth 12`)
      return false
    }
    const item = current.value
    if (item === null || typeof item === 'string' || typeof item === 'boolean') continue
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) issues.push(`${current.path} must contain finite numbers`)
      continue
    }
    if (Array.isArray(item)) {
      for (let index = item.length - 1; index >= 0; index -= 1) {
        stack.push({ value: item[index], path: `${current.path}[${String(index)}]`, depth: current.depth + 1 })
      }
      continue
    }
    if (record(item)) {
      for (const [key, child] of Object.entries(item)) {
        stack.push({ value: child, path: `${current.path}.${key}`, depth: current.depth + 1 })
      }
      continue
    }
    issues.push(`${current.path} must be lossless JSON`)
  }
  return issues.length === 0
}

function validateMath(
  value: unknown,
  parameterIds: ReadonlySet<string>,
  path: string,
  issues: string[],
  allowX = true,
  maxDepth = MAX_VISUAL_MATH_DEPTH,
): void {
  const binary = new Set<string>(MATH_BINARY_OPERATORS)
  const unary = new Set<string>(MATH_UNARY_OPERATORS)
  // The payload carries infix source. Parsing it here rather than in the
  // renderer means an unresolvable variable name is still caught against the
  // parameters this visual actually declared, which is the check that matters:
  // a curve plotting an undeclared symbol is silently wrong, not visibly wrong.
  if (typeof value !== 'string') {
    issues.push(`${path} must be an expression string`)
    return
  }
  let root: MathExpressionV1
  try {
    root = parseMathExpression(value)
  } catch (cause) {
    issues.push(`${path} is not a valid expression: ${cause instanceof MathParseError ? cause.message : String(cause)}`)
    return
  }
  const stack: Array<{ value: unknown; path: string; depth: number }> = [{ value: root, path, depth: 1 }]
  let nodes = 0
  while (stack.length > 0) {
    const node = stack.pop() as { value: unknown; path: string; depth: number }
    nodes += 1
    if (nodes > MAX_MATH_NODES) {
      issues.push(`${path} exceeds ${String(MAX_MATH_NODES)} AST nodes`)
      return
    }
    if (node.depth > maxDepth) {
      issues.push(`${node.path} exceeds AST depth ${String(maxDepth)}`)
      return
    }
    if (!record(node.value) || typeof node.value.op !== 'string') {
      issues.push(`${node.path} must be a mathematical AST node`)
      continue
    }
    const expression = node.value
    const op = expression.op as string
    if (op === 'constant') {
      onlyKeys(expression, ['op', 'value'], node.path, issues)
      if (finite(expression.value, `${node.path}.value`, issues) && Math.abs(expression.value) > 1e12) {
        issues.push(`${node.path}.value exceeds the numeric limit`)
      }
    } else if (op === 'variable') {
      onlyKeys(expression, ['op', 'name'], node.path, issues)
      if (typeof expression.name !== 'string'
        || (!parameterIds.has(expression.name) && !(allowX && expression.name === 'x'))) {
        issues.push(`${node.path}.name must be ${allowX ? 'x or ' : ''}a declared parameter id`)
      }
    } else if (binary.has(op)) {
      onlyKeys(expression, ['op', 'left', 'right'], node.path, issues)
      stack.push(
        { value: expression.right, path: `${node.path}.right`, depth: node.depth + 1 },
        { value: expression.left, path: `${node.path}.left`, depth: node.depth + 1 },
      )
    } else if (unary.has(op)) {
      onlyKeys(expression, ['op', 'value'], node.path, issues)
      stack.push({ value: expression.value, path: `${node.path}.value`, depth: node.depth + 1 })
    } else {
      issues.push(`${node.path}.op is unknown`)
    }
  }
}

function integer(value: unknown, path: string, issues: string[], min = 0): value is number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    issues.push(`${path} must be an integer >= ${String(min)}`)
    return false
  }
  return true
}

function token(value: unknown, path: string, issues: string[]): value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    issues.push(`${path} must be an opaque token of 1 to 128 URL-safe characters`)
    return false
  }
  return true
}


const CHECKPOINT_RAW_HTML = /<(?:!DOCTYPE\b|!--|\/?[A-Za-z][^<>]*>)/i
const CHECKPOINT_LEAKAGE_COPY = /\b(?:correct\s+answer|model\s+answer|answer\s+key|(?:the\s+)?answer\s*(?:is|was|[:：])|solution\s*[:：]|expected\s+(?:answer|response|result)\s*[:：]|grading\s+rubric|scoring\s+rubric|future\s+(?:step|question)|next\s+question\s*:)|(?:正确|标准|参考|模型)(?:答案|解答)|标准解\s*[:：]?|(?:答案|解答)\s*[:：]|答案(?:是|为)|评分(?:标准|细则)|下一(?:步|题|个问题)|后续步骤|未来步骤/iu

/** Canonical fail-closed predicate shared by protocol parsing and Client fallback extraction. */
export function isLearningCheckpointDisplayTextSafe(value: string): boolean {
  return !CHECKPOINT_RAW_HTML.test(value) && !CHECKPOINT_LEAKAGE_COPY.test(value)
}

function checkpointDisplayText(
  value: unknown,
  path: string,
  issues: string[],
  max: number,
): value is string {
  const valid = text(value, path, issues, max)
  if (valid && !isLearningCheckpointDisplayTextSafe(value)) {
    issues.push(`${path} must not contain raw HTML, an answer key, scoring rubric, or future-step copy`)
    return false
  }
  return valid
}

/** Strict, answer-free protocol for one optional learner checkpoint. */
export function parseLearningCheckpointV1(value: unknown): LearningCheckpointV1 {
  const issues: string[] = [...validateLearningCheckpointSchemaV1(value)]
  const bytes = jsonBytes(value)
  if (bytes === undefined) issues.push('checkpoint must be serializable JSON')
  else if (bytes > MAX_ACTIVITY_BYTES) issues.push(`checkpoint exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`)
  if (!record(value)) throw new LearningProtocolError([...issues, 'checkpoint must be an object'])

  onlyKeys(
    value,
    ['protocol', 'kind', 'prompt', 'context', 'expectedEvidence', 'options', 'fallbackMarkdown'],
    'checkpoint',
    issues,
  )
  if (value.protocol !== CHECKPOINT_PROTOCOL) {
    issues.push(`checkpoint.protocol must be ${CHECKPOINT_PROTOCOL}`)
  }
  if (!LEARNING_CHECKPOINT_KINDS.includes(value.kind as LearningCheckpointKindV1)) {
    issues.push(`checkpoint.kind must be one of ${LEARNING_CHECKPOINT_KINDS.join(', ')}`)
  }
  checkpointDisplayText(value.prompt, 'checkpoint.prompt', issues, 2_000)
  if (value.context !== undefined) checkpointDisplayText(value.context, 'checkpoint.context', issues, 4_000)
  if (!LEARNING_CHECKPOINT_EVIDENCE_KINDS.includes(value.expectedEvidence as LearningCheckpointEvidenceKindV1)) {
    issues.push(`checkpoint.expectedEvidence must be one of ${LEARNING_CHECKPOINT_EVIDENCE_KINDS.join(', ')}`)
  }
  checkpointDisplayText(value.fallbackMarkdown, 'checkpoint.fallbackMarkdown', issues, 8_000)

  if (value.kind === 'single_choice') {
    if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 8) {
      issues.push('checkpoint.options must contain 2 to 8 options for single_choice')
    } else {
      const options = value.options.filter(record)
      if (options.length !== value.options.length) issues.push('checkpoint.options entries must be objects')
      uniqueIds(options, 'checkpoint.options', issues)
      for (const [index, option] of options.entries()) {
        const path = `checkpoint.options[${String(index)}]`
        onlyKeys(option, ['id', 'label'], path, issues)
        id(option.id, `${path}.id`, issues)
        checkpointDisplayText(option.label, `${path}.label`, issues, 500)
      }
    }
  } else if (value.options !== undefined) {
    issues.push('checkpoint.options is supported only for single_choice')
  }

  if (issues.length > 0) throw new LearningProtocolError(issues)
  return value as unknown as LearningCheckpointV1
}

export interface ExpectedLearningCheckpointResultV1 {
  checkpointId?: string
  checkpoint?: LearningCheckpointV1
}

/** Validate one phase-bound checkpoint receipt before the Host accepts it. */
export function parseLearningCheckpointResultV1(
  value: unknown,
  expected: ExpectedLearningCheckpointResultV1 = {},
): LearningCheckpointResultV1 {
  const issues: string[] = [...validateLearningCheckpointResultSchemaV1(value)]
  const bytes = jsonBytes(value)
  if (bytes === undefined) issues.push('checkpoint result must be serializable JSON')
  else if (bytes > MAX_RESPONSE_BYTES) {
    issues.push(`checkpoint result exceeds ${String(MAX_RESPONSE_BYTES)} bytes`)
  }
  if (!record(value)) throw new LearningProtocolError([...issues, 'checkpoint result must be an object'])

  const submitted = value.status === 'submitted'
  onlyKeys(
    value,
    submitted
      ? ['protocol', 'checkpointId', 'status', 'response', 'receiptId']
      : ['protocol', 'checkpointId', 'status', 'reason', 'receiptId'],
    'checkpointResult',
    issues,
  )
  if (value.protocol !== CHECKPOINT_RESULT_PROTOCOL) {
    issues.push(`checkpointResult.protocol must be ${CHECKPOINT_RESULT_PROTOCOL}`)
  }
  token(value.checkpointId, 'checkpointResult.checkpointId', issues)
  token(value.receiptId, 'checkpointResult.receiptId', issues)
  if (!['submitted', 'skipped', 'cancelled'].includes(value.status as string)) {
    issues.push('checkpointResult.status must be submitted, skipped, or cancelled')
  }
  if (value.reason !== undefined && typeof value.reason !== 'string') {
    issues.push('checkpointResult.reason must be a string')
  } else if (value.status === 'skipped' && value.reason !== undefined
    && ![
      'learner-skipped',
      'client-unavailable',
      'client-response-timeout',
      'host-unavailable',
      'provider-failure',
    ].includes(value.reason as LearningCheckpointSkippedReasonV1)) {
    issues.push('checkpointResult.reason is not valid for skipped status')
  } else if (value.status === 'cancelled' && value.reason !== undefined
    && ![
      'learner-cancelled',
      'session-aborted',
      'plugin-disposed',
    ].includes(value.reason as LearningCheckpointCancelledReasonV1)) {
    issues.push('checkpointResult.reason is not valid for cancelled status')
  } else if (value.status === 'submitted' && value.reason !== undefined) {
    // `onlyKeys` reports this too, but keeping the semantic message makes the
    // contract clear when callers inspect protocol errors programmatically.
    issues.push('checkpointResult.reason is allowed only for skipped or cancelled status')
  }
  if (expected.checkpointId !== undefined && value.checkpointId !== expected.checkpointId) {
    issues.push('checkpointResult.checkpointId does not match the pending checkpoint')
  }

  let checkpoint: LearningCheckpointV1 | undefined
  if (expected.checkpoint !== undefined) {
    try {
      checkpoint = parseLearningCheckpointV1(expected.checkpoint)
    } catch (cause) {
      if (cause instanceof LearningProtocolError) {
        issues.push(...cause.issues.map(issue => `expected ${issue}`))
      } else throw cause
    }
  }

  if (submitted) {
    if (!record(value.response)) {
      issues.push('checkpointResult.response must be an object when submitted')
    } else {
      const response = value.response
      const responsePath = 'checkpointResult.response'
      const expectedKind = checkpoint?.kind
      const shape = expectedKind === 'single_choice'
        ? 'optionId'
        : expectedKind === 'numeric'
          ? 'number'
          : expectedKind === undefined
            ? undefined
            : 'text'

      if (shape === 'optionId' || (shape === undefined && Object.hasOwn(response, 'optionId'))) {
        onlyKeys(response, ['optionId'], responsePath, issues)
        const optionIdOk = id(response.optionId, `${responsePath}.optionId`, issues)
        if (optionIdOk && checkpoint?.options !== undefined
          && !checkpoint.options.some(option => option.id === response.optionId)) {
          issues.push(`${responsePath}.optionId must reference a declared checkpoint option`)
        }
      } else if (shape === 'number' || (shape === undefined && Object.hasOwn(response, 'number'))) {
        onlyKeys(response, ['number'], responsePath, issues)
        finite(response.number, `${responsePath}.number`, issues)
      } else if (shape === 'text' || (shape === undefined && Object.hasOwn(response, 'text'))) {
        onlyKeys(response, ['text'], responsePath, issues)
        text(response.text, `${responsePath}.text`, issues, expectedKind === 'code_slot' ? 16_000 : 8_000)
      } else {
        issues.push(`${responsePath} must contain exactly one of text, optionId, or number`)
        onlyKeys(response, [], responsePath, issues)
      }
    }
  } else if (value.response !== undefined) {
    // `onlyKeys` reports the unsupported field; retain an explicit semantic issue too.
    issues.push('checkpointResult.response is allowed only when status is submitted')
  }

  if (issues.length > 0) throw new LearningProtocolError(issues)
  return value as unknown as LearningCheckpointResultV1
}

const VISUAL_TONES_V3 = new Set<LearningVisualToneV3>(['blue', 'green', 'red', 'orange', 'purple', 'gray'])
const VISUAL_STROKES_V3 = new Set<LearningVisualStrokeV3>(['solid', 'dashed', 'dotted'])

function validateVisualAxisV3(value: unknown, path: string, issues: string[], samplesAllowed: boolean): void {
  if (!record(value)) {
    issues.push(`${path} must be an object`)
    return
  }
  onlyKeys(value, samplesAllowed ? ['label', 'min', 'max', 'samples'] : ['label', 'min', 'max'], path, issues)
  if (value.label !== undefined) text(value.label, `${path}.label`, issues, 120)
  const minOk = finite(value.min, `${path}.min`, issues)
  const maxOk = finite(value.max, `${path}.max`, issues)
  if (minOk && maxOk && (value.min as number) >= (value.max as number)) {
    issues.push(`${path}.min must be less than max`)
  }
  if (samplesAllowed && value.samples !== undefined
    && (!integer(value.samples, `${path}.samples`, issues, 24) || (value.samples as number) > 256)) {
    issues.push(`${path}.samples must be an integer from 24 to 256`)
  }
}

function validateVisualToneV4(value: unknown, path: string, issues: string[]): void {
  if (value !== undefined && !VISUAL_TONES_V3.has(value as LearningVisualToneV3)) {
    issues.push(`${path} is unknown`)
  }
}

function validateVisualStrokeV4(value: unknown, path: string, issues: string[]): void {
  if (value !== undefined && !VISUAL_STROKES_V3.has(value as LearningVisualStrokeV3)) {
    issues.push(`${path} is unknown`)
  }
}

function registerVisualIdV4(
  ids: Set<string>,
  value: unknown,
  path: string,
  issues: string[],
): void {
  if (typeof value !== 'string') return
  if (ids.has(value)) issues.push(`${path} duplicates visual id ${value}`)
  else ids.add(value)
}

function validateVisualParametersV4(value: unknown, issues: string[]): RecordValue[] {
  const path = 'visual.content.parameters'
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 3) {
    issues.push(`${path} must contain at most 3 parameters`)
    return []
  }
  const parameters = value.filter(record)
  if (parameters.length !== value.length) issues.push(`${path} entries must be objects`)
  uniqueIds(parameters, path, issues)
  for (const [index, parameter] of parameters.entries()) {
    const itemPath = `${path}[${String(index)}]`
    onlyKeys(parameter, ['id', 'label', 'min', 'max', 'step', 'initial'], itemPath, issues)
    id(parameter.id, `${itemPath}.id`, issues)
    if (parameter.id === 'x') issues.push(`${itemPath}.id must not use the reserved x-axis variable`)
    text(parameter.label, `${itemPath}.label`, issues, 120)
    const minOk = finite(parameter.min, `${itemPath}.min`, issues)
    const maxOk = finite(parameter.max, `${itemPath}.max`, issues)
    const stepOk = finite(parameter.step, `${itemPath}.step`, issues)
    const initialOk = finite(parameter.initial, `${itemPath}.initial`, issues)
    if (minOk && maxOk && (parameter.min as number) >= (parameter.max as number)) {
      issues.push(`${itemPath}.min must be less than max`)
    }
    if (stepOk && (parameter.step as number) <= 0) issues.push(`${itemPath}.step must be positive`)
    if (minOk && maxOk && stepOk && (parameter.step as number) > (parameter.max as number) - (parameter.min as number)) {
      issues.push(`${itemPath}.step must not exceed the parameter range`)
    }
    if (minOk && maxOk && initialOk
      && ((parameter.initial as number) < (parameter.min as number)
        || (parameter.initial as number) > (parameter.max as number))) {
      issues.push(`${itemPath}.initial must be inside the parameter range`)
    }
  }
  return parameters
}

function validateVisualPointsV4(value: unknown, path: string, issues: string[], maximum = 256): void {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum) {
    issues.push(`${path} must contain 1 to ${String(maximum)} points`)
    return
  }
  for (const [index, point] of value.entries()) {
    const pointPath = `${path}[${String(index)}]`
    if (!record(point)) {
      issues.push(`${pointPath} must be an object`)
      continue
    }
    onlyKeys(point, ['x', 'y', 'label'], pointPath, issues)
    finite(point.x, `${pointPath}.x`, issues)
    finite(point.y, `${pointPath}.y`, issues)
    if (point.label !== undefined) text(point.label, `${pointPath}.label`, issues, 160)
  }
}

function validateVisualMetricsV4(
  value: unknown,
  parameterIds: ReadonlySet<string>,
  issues: string[],
): RecordValue[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.length > 4) {
    issues.push('visual.content.metrics must contain at most 4 metrics')
    return []
  }
  const metrics = value.filter(record)
  if (metrics.length !== value.length) issues.push('visual.content.metrics entries must be objects')
  uniqueIds(metrics, 'visual.content.metrics', issues)
  for (const [index, metric] of metrics.entries()) {
    const path = `visual.content.metrics[${String(index)}]`
    onlyKeys(metric, ['id', 'label', 'expression', 'digits', 'suffix'], path, issues)
    id(metric.id, `${path}.id`, issues)
    text(metric.label, `${path}.label`, issues, 160)
    validateMath(metric.expression, parameterIds, `${path}.expression`, issues, false, MAX_VISUAL_MATH_DEPTH)
    if (metric.digits !== undefined
      && (!integer(metric.digits, `${path}.digits`, issues) || (metric.digits as number) > 6)) {
      issues.push(`${path}.digits must be an integer from 0 to 6`)
    }
    if (metric.suffix !== undefined) text(metric.suffix, `${path}.suffix`, issues, 80)
  }
  return metrics
}

function validatePlotV4(value: RecordValue, issues: string[]): Set<string> {
  const ids = new Set<string>()
  onlyKeys(value, ['kind', 'parameters', 'xAxis', 'yAxis', 'series', 'metrics'], 'visual.content', issues)
  const parameters = validateVisualParametersV4(value.parameters, issues)
  const parameterIds = new Set(parameters.flatMap(parameter => typeof parameter.id === 'string' ? [parameter.id] : []))
  for (const parameterId of parameterIds) registerVisualIdV4(ids, parameterId, 'visual.content.parameters', issues)
  validateVisualAxisV3(value.xAxis, 'visual.content.xAxis', issues, true)
  validateVisualAxisV3(value.yAxis, 'visual.content.yAxis', issues, false)
  if (!Array.isArray(value.series) || value.series.length < 1 || value.series.length > 8) {
    issues.push('visual.content.series must contain 1 to 8 series')
  } else {
    const series = value.series.filter(record)
    if (series.length !== value.series.length) issues.push('visual.content.series entries must be objects')
    uniqueIds(series, 'visual.content.series', issues)
    for (const [index, item] of series.entries()) {
      const path = `visual.content.series[${String(index)}]`
      if (id(item.id, `${path}.id`, issues)) registerVisualIdV4(ids, item.id, `${path}.id`, issues)
      text(item.label, `${path}.label`, issues, 160)
      validateVisualToneV4(item.tone, `${path}.tone`, issues)
      if (item.type === 'curve') {
        onlyKeys(item, ['type', 'id', 'label', 'expression', 'tone', 'stroke'], path, issues)
        validateVisualStrokeV4(item.stroke, `${path}.stroke`, issues)
        validateMath(item.expression, parameterIds, `${path}.expression`, issues, true, MAX_VISUAL_MATH_DEPTH)
      } else if (item.type === 'points' || item.type === 'bars') {
        onlyKeys(item, ['type', 'id', 'label', 'points', 'tone'], path, issues)
        validateVisualPointsV4(item.points, `${path}.points`, issues, item.type === 'bars' ? 64 : 256)
      } else if (item.type === 'line') {
        onlyKeys(item, ['type', 'id', 'label', 'points', 'tone', 'stroke'], path, issues)
        validateVisualStrokeV4(item.stroke, `${path}.stroke`, issues)
        validateVisualPointsV4(item.points, `${path}.points`, issues)
      } else {
        issues.push(`${path}.type must be curve, points, line, or bars`)
      }
    }
  }
  const metrics = validateVisualMetricsV4(value.metrics, parameterIds, issues)
  for (const [index, metric] of metrics.entries()) {
    if (typeof metric.id === 'string') registerVisualIdV4(ids, metric.id, `visual.content.metrics[${String(index)}].id`, issues)
  }
  return ids
}

function validateNodeLinkV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'layout', 'groups', 'nodes', 'edges'], 'visual.content', issues)
  if (!['layered', 'hierarchy', 'radial'].includes(value.layout as string)) {
    issues.push('visual.content.layout must be layered, hierarchy, or radial')
  }
  let groups: RecordValue[] = []
  if (value.groups !== undefined) {
    if (!Array.isArray(value.groups) || value.groups.length < 1 || value.groups.length > 12) {
      issues.push('visual.content.groups must contain 1 to 12 groups')
    } else {
      groups = value.groups.filter(record)
      if (groups.length !== value.groups.length) issues.push('visual.content.groups entries must be objects')
      uniqueIds(groups, 'visual.content.groups', issues)
      for (const [index, group] of groups.entries()) {
        const path = `visual.content.groups[${String(index)}]`
        onlyKeys(group, ['id', 'label'], path, issues)
        if (id(group.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, group.id, `${path}.id`, issues)
        text(group.label, `${path}.label`, issues, 120)
      }
    }
  }
  const groupIds = new Set(groups.flatMap(group => typeof group.id === 'string' ? [group.id] : []))
  let nodes: RecordValue[] = []
  if (!Array.isArray(value.nodes) || value.nodes.length < 2 || value.nodes.length > 48) {
    issues.push('visual.content.nodes must contain 2 to 48 nodes')
  } else {
    nodes = value.nodes.filter(record)
    if (nodes.length !== value.nodes.length) issues.push('visual.content.nodes entries must be objects')
    uniqueIds(nodes, 'visual.content.nodes', issues)
    for (const [index, node] of nodes.entries()) {
      const path = `visual.content.nodes[${String(index)}]`
      onlyKeys(node, ['id', 'label', 'detail', 'group', 'tone'], path, issues)
      if (id(node.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, node.id, `${path}.id`, issues)
      text(node.label, `${path}.label`, issues, 120)
      if (node.detail !== undefined) text(node.detail, `${path}.detail`, issues, 1_000)
      if (node.group !== undefined && (typeof node.group !== 'string' || !groupIds.has(node.group))) {
        issues.push(`${path}.group must reference a declared group`)
      }
      validateVisualToneV4(node.tone, `${path}.tone`, issues)
    }
  }
  if (value.layout === 'layered' && (groups.length === 0 || nodes.some(node => typeof node.group !== 'string'))) {
    issues.push('visual.content layered layouts require groups and a group on every node')
  }
  const nodeIds = new Set(nodes.flatMap(node => typeof node.id === 'string' ? [node.id] : []))
  if (!Array.isArray(value.edges) || value.edges.length < 1 || value.edges.length > 160) {
    issues.push('visual.content.edges must contain 1 to 160 edges')
  } else {
    const edges = value.edges.filter(record)
    if (edges.length !== value.edges.length) issues.push('visual.content.edges entries must be objects')
    uniqueIds(edges, 'visual.content.edges', issues)
    for (const [index, edge] of edges.entries()) {
      const path = `visual.content.edges[${String(index)}]`
      onlyKeys(edge, ['id', 'from', 'to', 'label', 'detail', 'tone', 'stroke', 'directed'], path, issues)
      if (id(edge.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, edge.id, `${path}.id`, issues)
      if (typeof edge.from !== 'string' || !nodeIds.has(edge.from)) issues.push(`${path}.from must reference a declared node`)
      if (typeof edge.to !== 'string' || !nodeIds.has(edge.to)) issues.push(`${path}.to must reference a declared node`)
      if (edge.label !== undefined) text(edge.label, `${path}.label`, issues, 120)
      if (edge.detail !== undefined) text(edge.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(edge.tone, `${path}.tone`, issues)
      validateVisualStrokeV4(edge.stroke, `${path}.stroke`, issues)
      if (edge.directed !== undefined && typeof edge.directed !== 'boolean') issues.push(`${path}.directed must be a boolean`)
    }
  }
  return focusIds
}

function validateSceneElementBaseV4(
  element: RecordValue,
  path: string,
  allowed: readonly string[],
  issues: string[],
): void {
  onlyKeys(element, ['type', 'id', 'label', 'detail', 'tone', ...allowed], path, issues)
  id(element.id, `${path}.id`, issues)
  if (element.label !== undefined) text(element.label, `${path}.label`, issues, 120)
  if (element.detail !== undefined) text(element.detail, `${path}.detail`, issues, 1_000)
  validateVisualToneV4(element.tone, `${path}.tone`, issues)
}

function validateScene2DV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'xAxis', 'yAxis', 'grid', 'elements'], 'visual.content', issues)
  validateVisualAxisV3(value.xAxis, 'visual.content.xAxis', issues, false)
  validateVisualAxisV3(value.yAxis, 'visual.content.yAxis', issues, false)
  if (value.grid !== undefined && typeof value.grid !== 'boolean') {
    issues.push('visual.content.grid must be a boolean')
  }
  if (!Array.isArray(value.elements) || value.elements.length < 1 || value.elements.length > 64) {
    issues.push('visual.content.elements must contain 1 to 64 elements')
    return focusIds
  }
  const elements = value.elements.filter(record)
  if (elements.length !== value.elements.length) issues.push('visual.content.elements entries must be objects')
  uniqueIds(elements, 'visual.content.elements', issues)
  for (const [index, element] of elements.entries()) {
    const path = `visual.content.elements[${String(index)}]`
    registerVisualIdV4(focusIds, element.id, `${path}.id`, issues)
    if (element.type === 'point') {
      validateSceneElementBaseV4(element, path, ['x', 'y', 'size'], issues)
      finite(element.x, `${path}.x`, issues)
      finite(element.y, `${path}.y`, issues)
      if (element.size !== undefined
        && (finite(element.size, `${path}.size`, issues) && ((element.size as number) <= 0 || (element.size as number) > 64))) {
        issues.push(`${path}.size must be greater than 0 and at most 64`)
      }
    } else if (element.type === 'segment' || element.type === 'arrow') {
      validateSceneElementBaseV4(element, path, ['x1', 'y1', 'x2', 'y2', 'stroke'], issues)
      finite(element.x1, `${path}.x1`, issues)
      finite(element.y1, `${path}.y1`, issues)
      finite(element.x2, `${path}.x2`, issues)
      finite(element.y2, `${path}.y2`, issues)
      validateVisualStrokeV4(element.stroke, `${path}.stroke`, issues)
    } else if (element.type === 'circle') {
      validateSceneElementBaseV4(element, path, ['cx', 'cy', 'r'], issues)
      finite(element.cx, `${path}.cx`, issues)
      finite(element.cy, `${path}.cy`, issues)
      if (finite(element.r, `${path}.r`, issues) && (element.r as number) <= 0) issues.push(`${path}.r must be positive`)
    } else if (element.type === 'rect') {
      validateSceneElementBaseV4(element, path, ['x', 'y', 'width', 'height'], issues)
      finite(element.x, `${path}.x`, issues)
      finite(element.y, `${path}.y`, issues)
      if (finite(element.width, `${path}.width`, issues) && (element.width as number) <= 0) issues.push(`${path}.width must be positive`)
      if (finite(element.height, `${path}.height`, issues) && (element.height as number) <= 0) issues.push(`${path}.height must be positive`)
    } else if (element.type === 'polygon') {
      validateSceneElementBaseV4(element, path, ['points'], issues)
      if (!Array.isArray(element.points) || element.points.length < 3 || element.points.length > 24) {
        issues.push(`${path}.points must contain 3 to 24 points`)
      } else {
        for (const [pointIndex, point] of element.points.entries()) {
          const pointPath = `${path}.points[${String(pointIndex)}]`
          if (!record(point)) {
            issues.push(`${pointPath} must be an object`)
            continue
          }
          onlyKeys(point, ['x', 'y'], pointPath, issues)
          finite(point.x, `${pointPath}.x`, issues)
          finite(point.y, `${pointPath}.y`, issues)
        }
      }
    } else if (element.type === 'label') {
      validateSceneElementBaseV4(element, path, ['x', 'y', 'text'], issues)
      finite(element.x, `${path}.x`, issues)
      finite(element.y, `${path}.y`, issues)
      text(element.text, `${path}.text`, issues, 240)
    } else {
      issues.push(`${path}.type must be point, segment, arrow, circle, rect, polygon, or label`)
    }
  }
  return focusIds
}

function validateRelationSubjectsV4(value: unknown, path: string, issues: string[]): RecordValue[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 4) {
    issues.push(`${path} must contain 2 to 4 subjects`)
    return []
  }
  const subjects = value.filter(record)
  if (subjects.length !== value.length) issues.push(`${path} entries must be objects`)
  uniqueIds(subjects, path, issues)
  for (const [index, subject] of subjects.entries()) {
    const itemPath = `${path}[${String(index)}]`
    onlyKeys(subject, ['id', 'label', 'detail', 'tone'], itemPath, issues)
    id(subject.id, `${itemPath}.id`, issues)
    text(subject.label, `${itemPath}.label`, issues, 120)
    if (subject.detail !== undefined) text(subject.detail, `${itemPath}.detail`, issues, 1_000)
    validateVisualToneV4(subject.tone, `${itemPath}.tone`, issues)
  }
  return subjects
}

function validateRelationAxisV4(value: unknown, path: string, issues: string[]): RecordValue[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) {
    issues.push(`${path} must contain 1 to 10 items`)
    return []
  }
  const items = value.filter(record)
  if (items.length !== value.length) issues.push(`${path} entries must be objects`)
  uniqueIds(items, path, issues)
  for (const [index, item] of items.entries()) {
    const itemPath = `${path}[${String(index)}]`
    onlyKeys(item, ['id', 'label'], itemPath, issues)
    id(item.id, `${itemPath}.id`, issues)
    text(item.label, `${itemPath}.label`, issues, 120)
  }
  return items
}

function validateRelationV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  if (value.variant === 'comparison') {
    onlyKeys(value, ['kind', 'variant', 'subjects', 'rows'], 'visual.content', issues)
    const subjects = validateRelationSubjectsV4(value.subjects, 'visual.content.subjects', issues)
    const subjectIds = new Set(subjects.flatMap(subject => typeof subject.id === 'string' ? [subject.id] : []))
    for (const subjectId of subjectIds) registerVisualIdV4(focusIds, subjectId, 'visual.content.subjects', issues)
    if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 16) {
      issues.push('visual.content.rows must contain 1 to 16 comparison rows')
      return focusIds
    }
    const rows = value.rows.filter(record)
    if (rows.length !== value.rows.length) issues.push('visual.content.rows entries must be objects')
    uniqueIds(rows, 'visual.content.rows', issues)
    for (const [index, row] of rows.entries()) {
      const path = `visual.content.rows[${String(index)}]`
      onlyKeys(row, ['id', 'label', 'cells', 'detail'], path, issues)
      if (id(row.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, row.id, `${path}.id`, issues)
      text(row.label, `${path}.label`, issues, 120)
      if (row.detail !== undefined) text(row.detail, `${path}.detail`, issues, 1_000)
      if (!Array.isArray(row.cells) || row.cells.length < 1 || row.cells.length > 4) {
        issues.push(`${path}.cells must contain 1 to 4 cells`)
        continue
      }
      const seenSubjects = new Set<string>()
      for (const [cellIndex, cell] of row.cells.entries()) {
        const cellPath = `${path}.cells[${String(cellIndex)}]`
        if (!record(cell)) {
          issues.push(`${cellPath} must be an object`)
          continue
        }
        onlyKeys(cell, ['subjectId', 'value', 'tone'], cellPath, issues)
        if (typeof cell.subjectId !== 'string' || !subjectIds.has(cell.subjectId)) {
          issues.push(`${cellPath}.subjectId must reference a declared subject`)
        } else if (seenSubjects.has(cell.subjectId)) {
          issues.push(`${cellPath}.subjectId duplicates ${cell.subjectId}`)
        } else seenSubjects.add(cell.subjectId)
        text(cell.value, `${cellPath}.value`, issues, 500)
        validateVisualToneV4(cell.tone, `${cellPath}.tone`, issues)
      }
    }
  } else if (value.variant === 'matrix') {
    onlyKeys(value, ['kind', 'variant', 'rows', 'columns', 'cells'], 'visual.content', issues)
    const rows = validateRelationAxisV4(value.rows, 'visual.content.rows', issues)
    const columns = validateRelationAxisV4(value.columns, 'visual.content.columns', issues)
    const rowIds = new Set(rows.flatMap(row => typeof row.id === 'string' ? [row.id] : []))
    const columnIds = new Set(columns.flatMap(column => typeof column.id === 'string' ? [column.id] : []))
    for (const rowId of rowIds) registerVisualIdV4(focusIds, rowId, 'visual.content.rows', issues)
    for (const columnId of columnIds) registerVisualIdV4(focusIds, columnId, 'visual.content.columns', issues)
    if (!Array.isArray(value.cells) || value.cells.length < 1 || value.cells.length > 64) {
      issues.push('visual.content.cells must contain 1 to 64 matrix cells')
      return focusIds
    }
    const cells = value.cells.filter(record)
    if (cells.length !== value.cells.length) issues.push('visual.content.cells entries must be objects')
    uniqueIds(cells, 'visual.content.cells', issues)
    const coordinates = new Set<string>()
    for (const [index, cell] of cells.entries()) {
      const path = `visual.content.cells[${String(index)}]`
      onlyKeys(cell, ['id', 'rowId', 'columnId', 'label', 'detail', 'tone'], path, issues)
      if (id(cell.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, cell.id, `${path}.id`, issues)
      if (typeof cell.rowId !== 'string' || !rowIds.has(cell.rowId)) issues.push(`${path}.rowId must reference a declared row`)
      if (typeof cell.columnId !== 'string' || !columnIds.has(cell.columnId)) issues.push(`${path}.columnId must reference a declared column`)
      if (typeof cell.rowId === 'string' && typeof cell.columnId === 'string') {
        const coordinate = `${cell.rowId}\u0000${cell.columnId}`
        if (coordinates.has(coordinate)) issues.push(`${path} duplicates a matrix coordinate`)
        coordinates.add(coordinate)
      }
      text(cell.label, `${path}.label`, issues, 240)
      if (cell.detail !== undefined) text(cell.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(cell.tone, `${path}.tone`, issues)
    }
  } else if (value.variant === 'sets') {
    onlyKeys(value, ['kind', 'variant', 'sets', 'items'], 'visual.content', issues)
    const sets = validateRelationSubjectsV4(value.sets, 'visual.content.sets', issues)
    if (sets.length > 3) issues.push('visual.content.sets must contain at most 3 sets')
    const setIds = new Set(sets.flatMap(item => typeof item.id === 'string' ? [item.id] : []))
    for (const setId of setIds) registerVisualIdV4(focusIds, setId, 'visual.content.sets', issues)
    if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 24) {
      issues.push('visual.content.items must contain 1 to 24 set items')
      return focusIds
    }
    const items = value.items.filter(record)
    if (items.length !== value.items.length) issues.push('visual.content.items entries must be objects')
    uniqueIds(items, 'visual.content.items', issues)
    for (const [index, item] of items.entries()) {
      const path = `visual.content.items[${String(index)}]`
      onlyKeys(item, ['id', 'label', 'setIds', 'detail'], path, issues)
      if (id(item.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, item.id, `${path}.id`, issues)
      text(item.label, `${path}.label`, issues, 120)
      if (item.detail !== undefined) text(item.detail, `${path}.detail`, issues, 1_000)
      if (!Array.isArray(item.setIds) || item.setIds.length < 1 || item.setIds.length > 3) {
        issues.push(`${path}.setIds must contain 1 to 3 set ids`)
      } else {
        const memberships = new Set<string>()
        for (const setId of item.setIds) {
          if (typeof setId !== 'string' || !setIds.has(setId)) issues.push(`${path}.setIds must reference declared sets`)
          else if (memberships.has(setId)) issues.push(`${path}.setIds duplicates ${setId}`)
          else memberships.add(setId)
        }
      }
    }
  } else {
    issues.push('visual.content.variant must be comparison, matrix, or sets')
  }
  return focusIds
}

function validateTimelineV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'orientation', 'events', 'eras'], 'visual.content', issues)
  if (value.orientation !== undefined && value.orientation !== 'horizontal' && value.orientation !== 'vertical') {
    issues.push('visual.content.orientation must be horizontal or vertical')
  }
  let events: RecordValue[] = []
  if (!Array.isArray(value.events) || value.events.length < 2 || value.events.length > 32) {
    issues.push('visual.content.events must contain 2 to 32 events')
  } else {
    events = value.events.filter(record)
    if (events.length !== value.events.length) issues.push('visual.content.events entries must be objects')
    uniqueIds(events, 'visual.content.events', issues)
    const hasPositions = events.filter(event => event.position !== undefined).length
    if (hasPositions !== 0 && hasPositions !== events.length) {
      issues.push('visual.content.events.position must be provided for every event or omitted for every event')
    }
    let previousPosition = -1
    for (const [index, event] of events.entries()) {
      const path = `visual.content.events[${String(index)}]`
      onlyKeys(event, ['id', 'time', 'label', 'detail', 'position', 'tone'], path, issues)
      if (id(event.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, event.id, `${path}.id`, issues)
      text(event.time, `${path}.time`, issues, 80)
      text(event.label, `${path}.label`, issues, 160)
      if (event.detail !== undefined) text(event.detail, `${path}.detail`, issues, 1_500)
      if (event.position !== undefined && finite(event.position, `${path}.position`, issues)) {
        const position = event.position as number
        if (position < 0 || position > 1) issues.push(`${path}.position must be from 0 to 1`)
        if (position <= previousPosition) issues.push(`${path}.position must be greater than the preceding event position`)
        previousPosition = position
      }
      validateVisualToneV4(event.tone, `${path}.tone`, issues)
    }
  }
  const eventIds = new Set(events.flatMap(event => typeof event.id === 'string' ? [event.id] : []))
  const eventIndexes = new Map(events.flatMap((event, index) => typeof event.id === 'string' ? [[event.id, index] as const] : []))
  if (value.eras !== undefined) {
    if (!Array.isArray(value.eras) || value.eras.length < 1 || value.eras.length > 8) {
      issues.push('visual.content.eras must contain 1 to 8 eras')
    } else {
      const eras = value.eras.filter(record)
      if (eras.length !== value.eras.length) issues.push('visual.content.eras entries must be objects')
      uniqueIds(eras, 'visual.content.eras', issues)
      for (const [index, era] of eras.entries()) {
        const path = `visual.content.eras[${String(index)}]`
        onlyKeys(era, ['id', 'label', 'startEventId', 'endEventId', 'detail', 'tone'], path, issues)
        if (id(era.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, era.id, `${path}.id`, issues)
        text(era.label, `${path}.label`, issues, 120)
        if (typeof era.startEventId !== 'string' || !eventIds.has(era.startEventId)) {
          issues.push(`${path}.startEventId must reference a declared event`)
        }
        if (typeof era.endEventId !== 'string' || !eventIds.has(era.endEventId)) {
          issues.push(`${path}.endEventId must reference a declared event`)
        }
        if (typeof era.startEventId === 'string' && typeof era.endEventId === 'string') {
          const startIndex = eventIndexes.get(era.startEventId)
          const endIndex = eventIndexes.get(era.endEventId)
          if (startIndex !== undefined && endIndex !== undefined && startIndex > endIndex) {
            issues.push(`${path}.startEventId must not occur after endEventId`)
          }
        }
        if (era.detail !== undefined) text(era.detail, `${path}.detail`, issues, 1_000)
        validateVisualToneV4(era.tone, `${path}.tone`, issues)
      }
    }
  }
  return focusIds
}

function validateFormulaStepsV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'notation', 'steps', 'conclusion'], 'visual.content', issues)
  if (value.notation !== undefined) text(value.notation, 'visual.content.notation', issues, 300)
  if (value.conclusion !== undefined) text(value.conclusion, 'visual.content.conclusion', issues, 1_000)
  if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) {
    issues.push('visual.content.steps must contain 2 to 16 formula steps')
    return focusIds
  }
  const steps = value.steps.filter(record)
  if (steps.length !== value.steps.length) issues.push('visual.content.steps entries must be objects')
  uniqueIds(steps, 'visual.content.steps', issues)
  for (const [index, step] of steps.entries()) {
    const path = `visual.content.steps[${String(index)}]`
    onlyKeys(step, ['id', 'expression', 'label', 'rule', 'detail', 'tone'], path, issues)
    if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues)
    text(step.expression, `${path}.expression`, issues, 500)
    if (step.label !== undefined) text(step.label, `${path}.label`, issues, 120)
    if (step.rule !== undefined) text(step.rule, `${path}.rule`, issues, 240)
    if (step.detail !== undefined) text(step.detail, `${path}.detail`, issues, 1_500)
    validateVisualToneV4(step.tone, `${path}.tone`, issues)
  }
  return focusIds
}

function validateStudyMapV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'view', 'sourceLabel', 'goal', 'sections', 'concepts'], 'visual.content', issues)
  if (value.view !== undefined && value.view !== 'material' && value.view !== 'concepts') {
    issues.push('visual.content.view must be material or concepts')
  }
  const conceptView = value.view === 'concepts'
  text(value.sourceLabel, 'visual.content.sourceLabel', issues, 240)
  if (value.goal !== undefined) text(value.goal, 'visual.content.goal', issues, 600)
  let sections: RecordValue[] = []
  if (!Array.isArray(value.sections) || value.sections.length > 16
    || (!conceptView && value.sections.length < 1)) {
    issues.push(conceptView
      ? 'visual.content.sections must contain 0 to 16 sections for concepts view'
      : 'visual.content.sections must contain 1 to 16 sections')
  } else {
    sections = value.sections.filter(record)
    if (sections.length !== value.sections.length) issues.push('visual.content.sections entries must be objects')
    uniqueIds(sections, 'visual.content.sections', issues)
    for (const [index, section] of sections.entries()) {
      const path = `visual.content.sections[${String(index)}]`
      onlyKeys(section, ['id', 'label', 'anchor', 'summary'], path, issues)
      if (id(section.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, section.id, `${path}.id`, issues)
      text(section.label, `${path}.label`, issues, 160)
      if (section.anchor !== undefined) text(section.anchor, `${path}.anchor`, issues, 160)
      if (section.summary !== undefined) text(section.summary, `${path}.summary`, issues, 1_000)
    }
  }
  const sectionIds = new Set(sections.flatMap(section => typeof section.id === 'string' ? [section.id] : []))
  let concepts: RecordValue[] = []
  if (!Array.isArray(value.concepts) || value.concepts.length > 48
    || (!conceptView && value.concepts.length < 1)) {
    issues.push(conceptView
      ? 'visual.content.concepts must contain 0 to 48 concepts for concepts view'
      : 'visual.content.concepts must contain 1 to 48 concepts')
  } else {
    concepts = value.concepts.filter(record)
    if (concepts.length !== value.concepts.length) issues.push('visual.content.concepts entries must be objects')
    uniqueIds(concepts, 'visual.content.concepts', issues)
    for (const [index, concept] of concepts.entries()) {
      const path = `visual.content.concepts[${String(index)}]`
      onlyKeys(concept, ['id', 'label', 'sectionId', 'detail', 'conceptSlug', 'mastery', 'due', 'stale', 'prerequisiteIds', 'role', 'tone'], path, issues)
      if (id(concept.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, concept.id, `${path}.id`, issues)
      text(concept.label, `${path}.label`, issues, 160)
      if (typeof concept.sectionId !== 'string' || !sectionIds.has(concept.sectionId)) {
        issues.push(`${path}.sectionId must reference a declared section`)
      }
      if (concept.detail !== undefined) text(concept.detail, `${path}.detail`, issues, 1_500)
      if (concept.conceptSlug !== undefined) text(concept.conceptSlug, `${path}.conceptSlug`, issues, 64)
      if (concept.mastery !== undefined && !['unseen', 'emerging', 'transfer'].includes(concept.mastery as string)) {
        issues.push(`${path}.mastery must be unseen, emerging, or transfer`)
      }
      if (concept.due !== undefined) text(concept.due, `${path}.due`, issues, 32)
      if (concept.stale !== undefined && typeof concept.stale !== 'boolean') {
        issues.push(`${path}.stale must be a boolean`)
      }
      if (concept.role !== undefined && !['foundation', 'core', 'extension', 'practice'].includes(concept.role as string)) {
        issues.push(`${path}.role must be foundation, core, extension, or practice`)
      }
      validateVisualToneV4(concept.tone, `${path}.tone`, issues)
    }
  }
  const conceptIds = new Set(concepts.flatMap(concept => typeof concept.id === 'string' ? [concept.id] : []))
  const prerequisiteGraph = new Map<string, string[]>()
  for (const [index, concept] of concepts.entries()) {
    if (concept.prerequisiteIds === undefined) continue
    const path = `visual.content.concepts[${String(index)}].prerequisiteIds`
    if (!Array.isArray(concept.prerequisiteIds) || concept.prerequisiteIds.length > 8) {
      issues.push(`${path} must contain at most 8 concept ids`)
      continue
    }
    const seen = new Set<string>()
    for (const prerequisiteId of concept.prerequisiteIds) {
      if (typeof prerequisiteId !== 'string' || !conceptIds.has(prerequisiteId)) {
        issues.push(`${path} must reference declared concepts`)
      } else if (prerequisiteId === concept.id) {
        issues.push(`${path} must not reference its own concept`)
      } else if (seen.has(prerequisiteId)) {
        issues.push(`${path} duplicates ${prerequisiteId}`)
      } else seen.add(prerequisiteId)
    }
    if (typeof concept.id === 'string') prerequisiteGraph.set(concept.id, [...seen])
  }
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const visit = (conceptId: string): boolean => {
    if (visiting.has(conceptId)) return true
    if (visited.has(conceptId)) return false
    visiting.add(conceptId)
    const cyclic = (prerequisiteGraph.get(conceptId) ?? []).some(visit)
    visiting.delete(conceptId)
    visited.add(conceptId)
    return cyclic
  }
  if ([...conceptIds].some(visit)) {
    issues.push('visual.content.concepts prerequisiteIds must not contain a cycle')
  }
  return focusIds
}

function validateRecallDeckV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'instructions', 'cards'], 'visual.content', issues)
  if (value.instructions !== undefined) text(value.instructions, 'visual.content.instructions', issues, 600)
  if (!Array.isArray(value.cards) || value.cards.length < 2 || value.cards.length > 32) {
    issues.push('visual.content.cards must contain 2 to 32 cards')
    return focusIds
  }
  const cards = value.cards.filter(record)
  if (cards.length !== value.cards.length) issues.push('visual.content.cards entries must be objects')
  uniqueIds(cards, 'visual.content.cards', issues)
  for (const [index, card] of cards.entries()) {
    const path = `visual.content.cards[${String(index)}]`
    onlyKeys(card, ['id', 'prompt', 'answer', 'hint', 'tags'], path, issues)
    if (id(card.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, card.id, `${path}.id`, issues)
    text(card.prompt, `${path}.prompt`, issues, 1_000)
    text(card.answer, `${path}.answer`, issues, 2_000)
    if (card.hint !== undefined) text(card.hint, `${path}.hint`, issues, 800)
    if (card.tags !== undefined) {
      if (!Array.isArray(card.tags) || card.tags.length > 6) {
        issues.push(`${path}.tags must contain at most 6 labels`)
      } else {
        const seen = new Set<string>()
        for (const [tagIndex, tag] of card.tags.entries()) {
          const tagPath = `${path}.tags[${String(tagIndex)}]`
          if (text(tag, tagPath, issues, 80) && typeof tag === 'string') {
            if (seen.has(tag)) issues.push(`${path}.tags duplicates ${tag}`)
            else seen.add(tag)
          }
        }
      }
    }
  }
  return focusIds
}

function validateTableValueV4(value: unknown, path: string, issues: string[]): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number' && Number.isFinite(value)) return true
  issues.push(`${path} must be a string, number, boolean, or null`)
  return false
}

function validateDataTableV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'columns', 'rows', 'outlierIds', 'initialSort', 'initialFilter', 'chart'], 'visual.content', issues)
  let columns: RecordValue[] = []
  if (!Array.isArray(value.columns) || value.columns.length < 1 || value.columns.length > 24) {
    issues.push('visual.content.columns must contain 1 to 24 columns')
  } else {
    columns = value.columns.filter(record)
    if (columns.length !== value.columns.length) issues.push('visual.content.columns entries must be objects')
    uniqueIds(columns, 'visual.content.columns', issues)
    for (const [index, column] of columns.entries()) {
      const path = `visual.content.columns[${String(index)}]`
      onlyKeys(column, ['id', 'label', 'type', 'unit'], path, issues)
      if (id(column.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, column.id, `${path}.id`, issues)
      text(column.label, `${path}.label`, issues, 160)
      if (!['string', 'number', 'boolean', 'date'].includes(column.type as string)) {
        issues.push(`${path}.type must be string, number, boolean, or date`)
      }
      if (column.unit !== undefined) text(column.unit, `${path}.unit`, issues, 80)
    }
  }
  const columnIds = new Set(columns.flatMap(column => typeof column.id === 'string' ? [column.id] : []))
  const columnTypes = new Map(columns.flatMap(column => typeof column.id === 'string' && typeof column.type === 'string'
    ? [[column.id, column.type] as const] : []))
  let rows: RecordValue[] = []
  if (!Array.isArray(value.rows) || value.rows.length < 1 || value.rows.length > 128) {
    issues.push('visual.content.rows must contain 1 to 128 rows')
  } else {
    rows = value.rows.filter(record)
    if (rows.length !== value.rows.length) issues.push('visual.content.rows entries must be objects')
    uniqueIds(rows, 'visual.content.rows', issues)
    for (const [index, row] of rows.entries()) {
      const path = `visual.content.rows[${String(index)}]`
      onlyKeys(row, ['id', 'cells', 'detail'], path, issues)
      if (id(row.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, row.id, `${path}.id`, issues)
      if (row.detail !== undefined) text(row.detail, `${path}.detail`, issues, 1_000)
      if (!Array.isArray(row.cells) || row.cells.length < 1 || row.cells.length > 24) {
        issues.push(`${path}.cells must contain 1 to 24 cells`)
        continue
      }
      const seen = new Set<string>()
      for (const [cellIndex, cell] of row.cells.entries()) {
        const cellPath = `${path}.cells[${String(cellIndex)}]`
        if (!record(cell)) {
          issues.push(`${cellPath} must be an object`)
          continue
        }
        onlyKeys(cell, ['columnId', 'value'], cellPath, issues)
        if (typeof cell.columnId !== 'string' || !columnIds.has(cell.columnId)) {
          issues.push(`${cellPath}.columnId must reference a declared column`)
        } else if (seen.has(cell.columnId)) {
          issues.push(`${cellPath}.columnId duplicates ${cell.columnId}`)
        } else seen.add(cell.columnId)
        const valueOk = validateTableValueV4(cell.value, `${cellPath}.value`, issues)
        const expected = typeof cell.columnId === 'string' ? columnTypes.get(cell.columnId) : undefined
        if (valueOk && cell.value !== null && expected !== undefined
          && ((expected === 'number' && typeof cell.value !== 'number')
            || (expected === 'boolean' && typeof cell.value !== 'boolean')
            || ((expected === 'string' || expected === 'date') && typeof cell.value !== 'string'))) {
          issues.push(`${cellPath}.value does not match column type ${expected}`)
        }
      }
    }
  }
  const rowIds = new Set(rows.flatMap(row => typeof row.id === 'string' ? [row.id] : []))
  if (value.outlierIds !== undefined) {
    if (!Array.isArray(value.outlierIds) || value.outlierIds.length > 32) {
      issues.push('visual.content.outlierIds must contain at most 32 row ids')
    } else {
      const seen = new Set<string>()
      for (const [index, rowId] of value.outlierIds.entries()) {
        const path = `visual.content.outlierIds[${String(index)}]`
        if (typeof rowId !== 'string' || !rowIds.has(rowId)) issues.push(`${path} must reference a declared row`)
        else if (seen.has(rowId)) issues.push(`${path} duplicates ${rowId}`)
        else seen.add(rowId)
      }
    }
  }
  const validateColumnRef = (candidate: unknown, path: string): void => {
    if (typeof candidate !== 'string' || !columnIds.has(candidate)) issues.push(`${path} must reference a declared column`)
  }
  if (value.initialSort !== undefined) {
    if (!record(value.initialSort)) issues.push('visual.content.initialSort must be an object')
    else {
      onlyKeys(value.initialSort, ['columnId', 'direction'], 'visual.content.initialSort', issues)
      validateColumnRef(value.initialSort.columnId, 'visual.content.initialSort.columnId')
      if (value.initialSort.direction !== 'asc' && value.initialSort.direction !== 'desc') {
        issues.push('visual.content.initialSort.direction must be asc or desc')
      }
    }
  }
  if (value.initialFilter !== undefined) {
    if (!record(value.initialFilter)) issues.push('visual.content.initialFilter must be an object')
    else {
      onlyKeys(value.initialFilter, ['columnId', 'operator', 'value'], 'visual.content.initialFilter', issues)
      validateColumnRef(value.initialFilter.columnId, 'visual.content.initialFilter.columnId')
      if (!['equals', 'not_equals', 'contains', 'gt', 'gte', 'lt', 'lte'].includes(value.initialFilter.operator as string)) {
        issues.push('visual.content.initialFilter.operator is unknown')
      }
      validateTableValueV4(value.initialFilter.value, 'visual.content.initialFilter.value', issues)
    }
  }
  if (value.chart !== undefined) {
    if (!record(value.chart)) issues.push('visual.content.chart must be an object')
    else {
      onlyKeys(value.chart, ['type', 'xColumnId', 'yColumnId', 'seriesColumnId'], 'visual.content.chart', issues)
      if (!['line', 'bar', 'scatter'].includes(value.chart.type as string)) issues.push('visual.content.chart.type is unknown')
      validateColumnRef(value.chart.xColumnId, 'visual.content.chart.xColumnId')
      validateColumnRef(value.chart.yColumnId, 'visual.content.chart.yColumnId')
      if (value.chart.seriesColumnId !== undefined) validateColumnRef(value.chart.seriesColumnId, 'visual.content.chart.seriesColumnId')
    }
  }
  return focusIds
}

function validateStateTransitionV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'states', 'transitions', 'steps'], 'visual.content', issues)
  let states: RecordValue[] = []
  if (!Array.isArray(value.states) || value.states.length < 2 || value.states.length > 32) {
    issues.push('visual.content.states must contain 2 to 32 states')
  } else {
    states = value.states.filter(record)
    if (states.length !== value.states.length) issues.push('visual.content.states entries must be objects')
    uniqueIds(states, 'visual.content.states', issues)
    for (const [index, state] of states.entries()) {
      const path = `visual.content.states[${String(index)}]`
      onlyKeys(state, ['id', 'label', 'detail', 'tone', 'initial', 'final'], path, issues)
      if (id(state.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, state.id, `${path}.id`, issues)
      text(state.label, `${path}.label`, issues, 160)
      if (state.detail !== undefined) text(state.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(state.tone, `${path}.tone`, issues)
      if (state.initial !== undefined && typeof state.initial !== 'boolean') issues.push(`${path}.initial must be a boolean`)
      if (state.final !== undefined && typeof state.final !== 'boolean') issues.push(`${path}.final must be a boolean`)
    }
  }
  const stateIds = new Set(states.flatMap(state => typeof state.id === 'string' ? [state.id] : []))
  let transitions: RecordValue[] = []
  if (!Array.isArray(value.transitions) || value.transitions.length < 1 || value.transitions.length > 96) {
    issues.push('visual.content.transitions must contain 1 to 96 transitions')
  } else {
    transitions = value.transitions.filter(record)
    if (transitions.length !== value.transitions.length) issues.push('visual.content.transitions entries must be objects')
    uniqueIds(transitions, 'visual.content.transitions', issues)
    for (const [index, transition] of transitions.entries()) {
      const path = `visual.content.transitions[${String(index)}]`
      onlyKeys(transition, ['id', 'from', 'to', 'trigger', 'guard', 'action', 'detail', 'tone'], path, issues)
      if (id(transition.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, transition.id, `${path}.id`, issues)
      if (typeof transition.from !== 'string' || !stateIds.has(transition.from)) issues.push(`${path}.from must reference a declared state`)
      if (typeof transition.to !== 'string' || !stateIds.has(transition.to)) issues.push(`${path}.to must reference a declared state`)
      text(transition.trigger, `${path}.trigger`, issues, 240)
      if (transition.guard !== undefined) text(transition.guard, `${path}.guard`, issues, 500)
      if (transition.action !== undefined) text(transition.action, `${path}.action`, issues, 500)
      if (transition.detail !== undefined) text(transition.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(transition.tone, `${path}.tone`, issues)
    }
  }
  const transitionIds = new Set(transitions.flatMap(transition => typeof transition.id === 'string' ? [transition.id] : []))
  if (value.steps !== undefined) {
    if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) {
      issues.push('visual.content.steps must contain 2 to 16 steps')
    } else {
      const steps = value.steps.filter(record)
      if (steps.length !== value.steps.length) issues.push('visual.content.steps entries must be objects')
      uniqueIds(steps, 'visual.content.steps', issues)
      for (const [index, step] of steps.entries()) {
        const path = `visual.content.steps[${String(index)}]`
        onlyKeys(step, ['id', 'label', 'currentStateId', 'transitionId', 'description'], path, issues)
        if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues)
        text(step.label, `${path}.label`, issues, 160)
        if (typeof step.currentStateId !== 'string' || !stateIds.has(step.currentStateId)) issues.push(`${path}.currentStateId must reference a declared state`)
        if (step.transitionId !== undefined
          && (typeof step.transitionId !== 'string' || !transitionIds.has(step.transitionId))) issues.push(`${path}.transitionId must reference a declared transition`)
        if (step.description !== undefined) text(step.description, `${path}.description`, issues, 1_000)
      }
    }
  }
  return focusIds
}

function validateSequenceBufferV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'slots', 'pointers', 'ranges', 'steps'], 'visual.content', issues)
  let slots: RecordValue[] = []
  if (!Array.isArray(value.slots) || value.slots.length < 1 || value.slots.length > 128) {
    issues.push('visual.content.slots must contain 1 to 128 slots')
  } else {
    slots = value.slots.filter(record)
    if (slots.length !== value.slots.length) issues.push('visual.content.slots entries must be objects')
    uniqueIds(slots, 'visual.content.slots', issues)
    const indexes = new Set<number>()
    for (const [index, slot] of slots.entries()) {
      const path = `visual.content.slots[${String(index)}]`
      onlyKeys(slot, ['id', 'index', 'value', 'label', 'tone'], path, issues)
      if (id(slot.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, slot.id, `${path}.id`, issues)
      if (!integer(slot.index, `${path}.index`, issues)) continue
      if (indexes.has(slot.index as number)) issues.push(`${path}.index duplicates ${String(slot.index)}`)
      indexes.add(slot.index as number)
      validateTableValueV4(slot.value, `${path}.value`, issues)
      if (slot.label !== undefined) text(slot.label, `${path}.label`, issues, 120)
      validateVisualToneV4(slot.tone, `${path}.tone`, issues)
    }
  }
  const slotIds = new Set(slots.flatMap(slot => typeof slot.id === 'string' ? [slot.id] : []))
  const slotIndexes = new Set(slots.flatMap(slot => typeof slot.index === 'number' && Number.isInteger(slot.index) ? [slot.index] : []))
  const maxIndex = slots.reduce((max, slot) => typeof slot.index === 'number' ? Math.max(max, slot.index) : max, -1)
  let pointers: RecordValue[] = []
  if (value.pointers !== undefined) {
    if (!Array.isArray(value.pointers) || value.pointers.length < 1 || value.pointers.length > 8) {
      issues.push('visual.content.pointers must contain 1 to 8 pointers')
    } else {
      pointers = value.pointers.filter(record)
      if (pointers.length !== value.pointers.length) issues.push('visual.content.pointers entries must be objects')
      uniqueIds(pointers, 'visual.content.pointers', issues)
      for (const [index, pointer] of pointers.entries()) {
        const path = `visual.content.pointers[${String(index)}]`
        onlyKeys(pointer, ['id', 'label', 'index', 'tone'], path, issues)
        if (id(pointer.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, pointer.id, `${path}.id`, issues)
        text(pointer.label, `${path}.label`, issues, 120)
        if (integer(pointer.index, `${path}.index`, issues) && (pointer.index as number) > maxIndex + 1) issues.push(`${path}.index must point within the buffer`)
        validateVisualToneV4(pointer.tone, `${path}.tone`, issues)
      }
    }
  }
  const pointerIds = new Set(pointers.flatMap(pointer => typeof pointer.id === 'string' ? [pointer.id] : []))
  let ranges: RecordValue[] = []
  if (value.ranges !== undefined) {
    if (!Array.isArray(value.ranges) || value.ranges.length < 1 || value.ranges.length > 8) {
      issues.push('visual.content.ranges must contain 1 to 8 ranges')
    } else {
      ranges = value.ranges.filter(record)
      if (ranges.length !== value.ranges.length) issues.push('visual.content.ranges entries must be objects')
      uniqueIds(ranges, 'visual.content.ranges', issues)
      for (const [index, range] of ranges.entries()) {
        const path = `visual.content.ranges[${String(index)}]`
        onlyKeys(range, ['id', 'label', 'start', 'end', 'tone'], path, issues)
        if (id(range.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, range.id, `${path}.id`, issues)
        text(range.label, `${path}.label`, issues, 120)
        const startOk = integer(range.start, `${path}.start`, issues)
        const endOk = integer(range.end, `${path}.end`, issues)
        if (startOk && !slotIndexes.has(range.start as number)) issues.push(`${path}.start must reference a declared slot index`)
        if (endOk && !slotIndexes.has(range.end as number)) issues.push(`${path}.end must reference a declared slot index`)
        if (startOk && endOk && (range.start as number) > (range.end as number)) issues.push(`${path}.start must not exceed end`)
        validateVisualToneV4(range.tone, `${path}.tone`, issues)
      }
    }
  }
  const rangeIds = new Set(ranges.flatMap(range => typeof range.id === 'string' ? [range.id] : []))
  if (value.steps !== undefined) {
    if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 16) {
      issues.push('visual.content.steps must contain 2 to 16 snapshots')
    } else {
      const steps = value.steps.filter(record)
      if (steps.length !== value.steps.length) issues.push('visual.content.steps entries must be objects')
      uniqueIds(steps, 'visual.content.steps', issues)
      for (const [index, step] of steps.entries()) {
        const path = `visual.content.steps[${String(index)}]`
        onlyKeys(step, ['id', 'label', 'description', 'slots', 'pointers', 'ranges'], path, issues)
        if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues)
        text(step.label, `${path}.label`, issues, 160)
        if (step.description !== undefined) text(step.description, `${path}.description`, issues, 1_000)
        if (step.slots !== undefined) {
          if (!Array.isArray(step.slots) || step.slots.length > 128) issues.push(`${path}.slots must contain at most 128 snapshots`)
          else for (const [snapshotIndex, snapshot] of step.slots.entries()) {
            const snapshotPath = `${path}.slots[${String(snapshotIndex)}]`
            if (!record(snapshot)) { issues.push(`${snapshotPath} must be an object`); continue }
            onlyKeys(snapshot, ['slotId', 'value'], snapshotPath, issues)
            if (typeof snapshot.slotId !== 'string' || !slotIds.has(snapshot.slotId)) issues.push(`${snapshotPath}.slotId must reference a declared slot`)
            if (snapshot.value !== undefined) validateTableValueV4(snapshot.value, `${snapshotPath}.value`, issues)
          }
        }
        if (step.pointers !== undefined) {
          if (!Array.isArray(step.pointers) || step.pointers.length > 8) issues.push(`${path}.pointers must contain at most 8 snapshots`)
          else for (const [snapshotIndex, snapshot] of step.pointers.entries()) {
            const snapshotPath = `${path}.pointers[${String(snapshotIndex)}]`
            if (!record(snapshot)) { issues.push(`${snapshotPath} must be an object`); continue }
            onlyKeys(snapshot, ['pointerId', 'index'], snapshotPath, issues)
            if (typeof snapshot.pointerId !== 'string' || !pointerIds.has(snapshot.pointerId)) issues.push(`${snapshotPath}.pointerId must reference a declared pointer`)
            if (integer(snapshot.index, `${snapshotPath}.index`, issues) && (snapshot.index as number) > maxIndex + 1) issues.push(`${snapshotPath}.index must point within the buffer`)
          }
        }
        if (step.ranges !== undefined) {
          if (!Array.isArray(step.ranges) || step.ranges.length > 8) issues.push(`${path}.ranges must contain at most 8 snapshots`)
          else for (const [snapshotIndex, snapshot] of step.ranges.entries()) {
            const snapshotPath = `${path}.ranges[${String(snapshotIndex)}]`
            if (!record(snapshot)) { issues.push(`${snapshotPath} must be an object`); continue }
            onlyKeys(snapshot, ['rangeId', 'start', 'end'], snapshotPath, issues)
            if (typeof snapshot.rangeId !== 'string' || !rangeIds.has(snapshot.rangeId)) issues.push(`${snapshotPath}.rangeId must reference a declared range`)
            const startOk = integer(snapshot.start, `${snapshotPath}.start`, issues)
            const endOk = integer(snapshot.end, `${snapshotPath}.end`, issues)
            if (startOk && !slotIndexes.has(snapshot.start as number)) issues.push(`${snapshotPath}.start must reference a declared slot index`)
            if (endOk && !slotIndexes.has(snapshot.end as number)) issues.push(`${snapshotPath}.end must reference a declared slot index`)
            if (startOk && endOk && (snapshot.start as number) > (snapshot.end as number)) issues.push(`${snapshotPath}.start must not exceed end`)
          }
        }
      }
    }
  }
  return focusIds
}

function validateSequenceDiagramV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'participants', 'messages'], 'visual.content', issues)
  let participants: RecordValue[] = []
  if (!Array.isArray(value.participants) || value.participants.length < 2 || value.participants.length > 16) {
    issues.push('visual.content.participants must contain 2 to 16 participants')
  } else {
    participants = value.participants.filter(record)
    if (participants.length !== value.participants.length) issues.push('visual.content.participants entries must be objects')
    uniqueIds(participants, 'visual.content.participants', issues)
    for (const [index, participant] of participants.entries()) {
      const path = `visual.content.participants[${String(index)}]`
      onlyKeys(participant, ['id', 'label', 'detail', 'tone'], path, issues)
      if (id(participant.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, participant.id, `${path}.id`, issues)
      text(participant.label, `${path}.label`, issues, 160)
      if (participant.detail !== undefined) text(participant.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(participant.tone, `${path}.tone`, issues)
    }
  }
  const participantIds = new Set(participants.flatMap(participant => typeof participant.id === 'string' ? [participant.id] : []))
  if (!Array.isArray(value.messages) || value.messages.length < 1 || value.messages.length > 96) {
    issues.push('visual.content.messages must contain 1 to 96 messages')
  } else {
    const messages = value.messages.filter(record)
    if (messages.length !== value.messages.length) issues.push('visual.content.messages entries must be objects')
    uniqueIds(messages, 'visual.content.messages', issues)
    for (const [index, message] of messages.entries()) {
      const path = `visual.content.messages[${String(index)}]`
      onlyKeys(message, ['id', 'from', 'to', 'label', 'type', 'detail', 'tone'], path, issues)
      if (id(message.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, message.id, `${path}.id`, issues)
      if (typeof message.from !== 'string' || !participantIds.has(message.from)) issues.push(`${path}.from must reference a declared participant`)
      if (typeof message.to !== 'string' || !participantIds.has(message.to)) issues.push(`${path}.to must reference a declared participant`)
      text(message.label, `${path}.label`, issues, 240)
      if (!['sync', 'async', 'return', 'self'].includes(message.type as string)) issues.push(`${path}.type must be sync, async, return, or self`)
      if (message.type === 'self' && message.from !== message.to) issues.push(`${path}.self messages must have matching from and to participants`)
      if (message.detail !== undefined) text(message.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(message.tone, `${path}.tone`, issues)
    }
  }
  return focusIds
}

function validateCodeTraceV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'language', 'code', 'lines', 'steps'], 'visual.content', issues)
  text(value.language, 'visual.content.language', issues, 40)
  text(value.code, 'visual.content.code', issues, 24_000)
  const lineNumbers = new Set<number>()
  if (!Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 256) {
    issues.push('visual.content.lines must contain 1 to 256 lines')
  } else {
    const lines = value.lines.filter(record)
    if (lines.length !== value.lines.length) issues.push('visual.content.lines entries must be objects')
    let previousLine = -1
    for (const [index, line] of lines.entries()) {
      const path = `visual.content.lines[${String(index)}]`
      onlyKeys(line, ['number', 'text'], path, issues)
      if (integer(line.number, `${path}.number`, issues)) {
        lineNumbers.add(line.number as number)
        if ((line.number as number) <= previousLine) issues.push(`${path}.number must increase in source order`)
        previousLine = line.number as number
      }
      if (typeof line.text !== 'string') issues.push(`${path}.text must be a string`)
      else if (line.text.length > 1_000) issues.push(`${path}.text exceeds 1000 characters`)
    }
  }
  if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 32) {
    issues.push('visual.content.steps must contain 2 to 32 execution steps')
  } else {
    const steps = value.steps.filter(record)
    if (steps.length !== value.steps.length) issues.push('visual.content.steps entries must be objects')
    uniqueIds(steps, 'visual.content.steps', issues)
    for (const [index, step] of steps.entries()) {
      const path = `visual.content.steps[${String(index)}]`
      onlyKeys(step, ['id', 'label', 'currentLine', 'variables', 'stack', 'output', 'description'], path, issues)
      if (id(step.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, step.id, `${path}.id`, issues)
      text(step.label, `${path}.label`, issues, 160)
      if (integer(step.currentLine, `${path}.currentLine`, issues) && !lineNumbers.has(step.currentLine as number)) issues.push(`${path}.currentLine must reference a declared source line`)
      if (!Array.isArray(step.variables) || step.variables.length > 32) issues.push(`${path}.variables must contain at most 32 variables`)
      else {
        const variables = step.variables.filter(record)
        if (variables.length !== step.variables.length) issues.push(`${path}.variables entries must be objects`)
        const names = new Set<string>()
        for (const [variableIndex, variable] of variables.entries()) {
          const variablePath = `${path}.variables[${String(variableIndex)}]`
          onlyKeys(variable, ['name', 'value', 'type'], variablePath, issues)
          if (typeof variable.name !== 'string' || variable.name.trim() === '') issues.push(`${variablePath}.name must be a non-empty string`)
          else if (names.has(variable.name)) issues.push(`${variablePath}.name duplicates ${variable.name}`)
          else names.add(variable.name)
          validateTableValueV4(variable.value, `${variablePath}.value`, issues)
          if (variable.type !== undefined) text(variable.type, `${variablePath}.type`, issues, 80)
        }
      }
      if (!Array.isArray(step.stack) || step.stack.length > 16) issues.push(`${path}.stack must contain at most 16 frames`)
      else {
        const stack = step.stack.filter(record)
        if (stack.length !== step.stack.length) issues.push(`${path}.stack entries must be objects`)
        uniqueIds(stack, `${path}.stack`, issues)
        for (const [frameIndex, frame] of stack.entries()) {
          const framePath = `${path}.stack[${String(frameIndex)}]`
          onlyKeys(frame, ['id', 'function', 'line'], framePath, issues)
          // Stack frame ids are scoped to one execution snapshot and may be
          // reused as the same call remains on the stack across steps.
          id(frame.id, `${framePath}.id`, issues)
          text(frame.function, `${framePath}.function`, issues, 160)
          if (frame.line !== undefined && integer(frame.line, `${framePath}.line`, issues) && !lineNumbers.has(frame.line as number)) issues.push(`${framePath}.line must reference a declared source line`)
        }
      }
      if (step.output !== undefined && typeof step.output !== 'string') issues.push(`${path}.output must be a string`)
      else if (step.output !== undefined && (step.output as string).length > 4_000) issues.push(`${path}.output exceeds 4000 characters`)
      if (step.description !== undefined) text(step.description, `${path}.description`, issues, 1_000)
    }
  }
  return focusIds
}

function validateFieldGridV4(value: unknown, path: string, issues: string[], components: 'scalar' | 'vector'): void {
  if (!record(value)) {
    issues.push(`${path} must be an object`)
    return
  }
  const allowed = components === 'scalar' ? ['columns', 'rows', 'values'] : ['columns', 'rows', 'u', 'v']
  onlyKeys(value, allowed, path, issues)
  const columnsOk = integer(value.columns, `${path}.columns`, issues, 2) && (value.columns as number) <= 64
  const rowsOk = integer(value.rows, `${path}.rows`, issues, 2) && (value.rows as number) <= 64
  const expected = columnsOk && rowsOk ? (value.columns as number) * (value.rows as number) : undefined
  if (components === 'scalar') {
    if (!Array.isArray(value.values) || value.values.length < 1 || value.values.length > 4_096) issues.push(`${path}.values must contain sampled values`)
    else {
      if (expected !== undefined && value.values.length !== expected) issues.push(`${path}.values length must equal rows * columns`)
      for (const [index, sample] of value.values.entries()) finite(sample, `${path}.values[${String(index)}]`, issues)
    }
  } else {
    for (const component of ['u', 'v'] as const) {
      const samples = value[component]
      if (!Array.isArray(samples) || samples.length < 1 || samples.length > 4_096) issues.push(`${path}.${component} must contain sampled values`)
      else {
        if (expected !== undefined && samples.length !== expected) issues.push(`${path}.${component} length must equal rows * columns`)
        for (const [index, sample] of samples.entries()) finite(sample, `${path}.${component}[${String(index)}]`, issues)
      }
    }
  }
}

function validateFieldAxisV4(value: unknown, path: string, issues: string[]): void {
  if (!record(value)) {
    issues.push(`${path} must be an object`)
    return
  }
  onlyKeys(value, ['label', 'min', 'max', 'samples'], path, issues)
  if (value.label !== undefined) text(value.label, `${path}.label`, issues, 120)
  const minOk = finite(value.min, `${path}.min`, issues)
  const maxOk = finite(value.max, `${path}.max`, issues)
  if (minOk && maxOk && (value.min as number) >= (value.max as number)) issues.push(`${path}.min must be less than max`)
  if (value.samples !== undefined
    && (!integer(value.samples, `${path}.samples`, issues, 2) || (value.samples as number) > 64)) {
    issues.push(`${path}.samples must be an integer from 2 to 64`)
  }
}

function validateField2DV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'xAxis', 'yAxis', 'scalar', 'vector'], 'visual.content', issues)
  validateFieldAxisV4(value.xAxis, 'visual.content.xAxis', issues)
  validateFieldAxisV4(value.yAxis, 'visual.content.yAxis', issues)
  if (value.scalar === undefined && value.vector === undefined) issues.push('visual.content must provide scalar or vector data')
  const fieldVariables = new Set(['y'])
  if (value.scalar !== undefined) {
    if (!record(value.scalar)) issues.push('visual.content.scalar must be an object')
    else {
      onlyKeys(value.scalar, ['samples', 'expression', 'min', 'max'], 'visual.content.scalar', issues)
      if (value.scalar.samples === undefined && value.scalar.expression === undefined) issues.push('visual.content.scalar must provide samples or expression')
      if (value.scalar.samples !== undefined) validateFieldGridV4(value.scalar.samples, 'visual.content.scalar.samples', issues, 'scalar')
      if (value.scalar.expression !== undefined) validateMath(value.scalar.expression, fieldVariables, 'visual.content.scalar.expression', issues, true, MAX_VISUAL_MATH_DEPTH)
      const minOk = value.scalar.min === undefined ? false : finite(value.scalar.min, 'visual.content.scalar.min', issues)
      const maxOk = value.scalar.max === undefined ? false : finite(value.scalar.max, 'visual.content.scalar.max', issues)
      if (minOk && maxOk && (value.scalar.min as number) >= (value.scalar.max as number)) issues.push('visual.content.scalar.min must be less than max')
    }
  }
  if (value.vector !== undefined) {
    if (!record(value.vector)) issues.push('visual.content.vector must be an object')
    else {
      onlyKeys(value.vector, ['samples', 'expression'], 'visual.content.vector', issues)
      if (value.vector.samples === undefined && value.vector.expression === undefined) issues.push('visual.content.vector must provide samples or expression')
      if (value.vector.samples !== undefined) validateFieldGridV4(value.vector.samples, 'visual.content.vector.samples', issues, 'vector')
      if (value.vector.expression !== undefined) {
        if (!record(value.vector.expression)) issues.push('visual.content.vector.expression must be an object')
        else {
          onlyKeys(value.vector.expression, ['u', 'v'], 'visual.content.vector.expression', issues)
          validateMath(value.vector.expression.u, fieldVariables, 'visual.content.vector.expression.u', issues, true, MAX_VISUAL_MATH_DEPTH)
          validateMath(value.vector.expression.v, fieldVariables, 'visual.content.vector.expression.v', issues, true, MAX_VISUAL_MATH_DEPTH)
        }
      }
    }
  }
  return focusIds
}

function validateCausalLoopV4(value: RecordValue, issues: string[]): Set<string> {
  const focusIds = new Set<string>()
  onlyKeys(value, ['kind', 'variables', 'links', 'loops'], 'visual.content', issues)
  let variables: RecordValue[] = []
  if (!Array.isArray(value.variables) || value.variables.length < 2 || value.variables.length > 32) {
    issues.push('visual.content.variables must contain 2 to 32 variables')
  } else {
    variables = value.variables.filter(record)
    if (variables.length !== value.variables.length) issues.push('visual.content.variables entries must be objects')
    uniqueIds(variables, 'visual.content.variables', issues)
    for (const [index, variable] of variables.entries()) {
      const path = `visual.content.variables[${String(index)}]`
      onlyKeys(variable, ['id', 'label', 'detail', 'tone'], path, issues)
      if (id(variable.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, variable.id, `${path}.id`, issues)
      text(variable.label, `${path}.label`, issues, 160)
      if (variable.detail !== undefined) text(variable.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(variable.tone, `${path}.tone`, issues)
    }
  }
  const variableIds = new Set(variables.flatMap(variable => typeof variable.id === 'string' ? [variable.id] : []))
  let links: RecordValue[] = []
  if (!Array.isArray(value.links) || value.links.length < 1 || value.links.length > 96) {
    issues.push('visual.content.links must contain 1 to 96 links')
  } else {
    links = value.links.filter(record)
    if (links.length !== value.links.length) issues.push('visual.content.links entries must be objects')
    uniqueIds(links, 'visual.content.links', issues)
    for (const [index, link] of links.entries()) {
      const path = `visual.content.links[${String(index)}]`
      onlyKeys(link, ['id', 'from', 'to', 'polarity', 'delay', 'label', 'detail', 'tone'], path, issues)
      if (id(link.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, link.id, `${path}.id`, issues)
      if (typeof link.from !== 'string' || !variableIds.has(link.from)) issues.push(`${path}.from must reference a declared variable`)
      if (typeof link.to !== 'string' || !variableIds.has(link.to)) issues.push(`${path}.to must reference a declared variable`)
      if (link.polarity !== 'positive' && link.polarity !== 'negative') issues.push(`${path}.polarity must be positive or negative`)
      if (link.delay !== undefined && (typeof link.delay !== 'number' || !Number.isFinite(link.delay) || link.delay < 0)) issues.push(`${path}.delay must be a non-negative finite number`)
      if (link.label !== undefined) text(link.label, `${path}.label`, issues, 160)
      if (link.detail !== undefined) text(link.detail, `${path}.detail`, issues, 1_000)
      validateVisualToneV4(link.tone, `${path}.tone`, issues)
    }
  }
  const linkIds = new Set(links.flatMap(link => typeof link.id === 'string' ? [link.id] : []))
  if (value.loops !== undefined) {
    if (!Array.isArray(value.loops) || value.loops.length < 1 || value.loops.length > 12) {
      issues.push('visual.content.loops must contain 1 to 12 loops')
    } else {
      const loops = value.loops.filter(record)
      if (loops.length !== value.loops.length) issues.push('visual.content.loops entries must be objects')
      uniqueIds(loops, 'visual.content.loops', issues)
      for (const [index, loop] of loops.entries()) {
        const path = `visual.content.loops[${String(index)}]`
        onlyKeys(loop, ['id', 'label', 'type', 'linkIds', 'detail', 'tone'], path, issues)
        if (id(loop.id, `${path}.id`, issues)) registerVisualIdV4(focusIds, loop.id, `${path}.id`, issues)
        text(loop.label, `${path}.label`, issues, 160)
        if (loop.type !== 'reinforcing' && loop.type !== 'balancing') issues.push(`${path}.type must be reinforcing or balancing`)
        if (!Array.isArray(loop.linkIds) || loop.linkIds.length < 1 || loop.linkIds.length > 96) issues.push(`${path}.linkIds must contain 1 to 96 link ids`)
        else {
          const seen = new Set<string>()
          for (const [linkIndex, linkId] of loop.linkIds.entries()) {
            const linkPath = `${path}.linkIds[${String(linkIndex)}]`
            if (typeof linkId !== 'string' || !linkIds.has(linkId)) issues.push(`${linkPath} must reference a declared link`)
            else if (seen.has(linkId)) issues.push(`${linkPath} duplicates ${linkId}`)
            else seen.add(linkId)
          }
        }
        if (loop.detail !== undefined) text(loop.detail, `${path}.detail`, issues, 1_000)
        validateVisualToneV4(loop.tone, `${path}.tone`, issues)
      }
    }
  }
  return focusIds
}

function validateVisualSequenceV4(value: unknown, focusIds: ReadonlySet<string>, issues: string[]): void {
  if (value === undefined) return
  if (!record(value)) {
    issues.push('visual.sequence must be an object')
    return
  }
  onlyKeys(value, ['initialFrameId', 'frames'], 'visual.sequence', issues)
  if (!Array.isArray(value.frames) || value.frames.length < 2 || value.frames.length > 12) {
    issues.push('visual.sequence.frames must contain 2 to 12 frames')
    return
  }
  const frames = value.frames.filter(record)
  if (frames.length !== value.frames.length) issues.push('visual.sequence.frames entries must be objects')
  uniqueIds(frames, 'visual.sequence.frames', issues)
  const frameIds = new Set<string>()
  for (const [index, frame] of frames.entries()) {
    const path = `visual.sequence.frames[${String(index)}]`
    onlyKeys(frame, ['id', 'label', 'description', 'focusIds'], path, issues)
    if (id(frame.id, `${path}.id`, issues)) frameIds.add(frame.id)
    text(frame.label, `${path}.label`, issues, 120)
    if (frame.description !== undefined) text(frame.description, `${path}.description`, issues, 1_000)
    if (!Array.isArray(frame.focusIds) || frame.focusIds.length > 64) {
      issues.push(`${path}.focusIds must contain at most 64 ids`)
      continue
    }
    const seen = new Set<string>()
    for (const [focusIndex, focusId] of frame.focusIds.entries()) {
      if (typeof focusId !== 'string' || !focusIds.has(focusId)) {
        issues.push(`${path}.focusIds[${String(focusIndex)}] must reference visual content`)
      } else if (seen.has(focusId)) {
        issues.push(`${path}.focusIds duplicates ${focusId}`)
      } else seen.add(focusId)
    }
  }
  if (value.initialFrameId !== undefined
    && (typeof value.initialFrameId !== 'string' || !frameIds.has(value.initialFrameId))) {
    issues.push('visual.sequence.initialFrameId must reference a declared frame')
  }
}

/** Validate the semantic, model-facing visual protocol while retaining V3 replay separately. */
export function parseLearningVisualV4(value: unknown): LearningVisualV4 {
  const issues: string[] = [...validateLearningVisualSchemaV4(value)]
  const bytes = jsonBytes(value)
  if (bytes === undefined) issues.push('visual must be serializable JSON')
  else if (bytes > MAX_ACTIVITY_BYTES) issues.push(`visual exceeds ${String(MAX_ACTIVITY_BYTES)} bytes`)
  if (!record(value)) throw new LearningProtocolError([...issues, 'visual must be an object'])
  onlyKeys(value, ['protocol', 'title', 'description', 'content', 'sequence', 'fallbackMarkdown'], 'visual', issues)
  if (value.protocol !== VISUAL_PROTOCOL_V4) issues.push(`visual.protocol must be ${VISUAL_PROTOCOL_V4}`)
  text(value.title, 'visual.title', issues, 200)
  if (value.description !== undefined) text(value.description, 'visual.description', issues, 1_000)
  if (value.fallbackMarkdown !== undefined) text(value.fallbackMarkdown, 'visual.fallbackMarkdown', issues, 8_000)
  let focusIds = new Set<string>()
  if (!record(value.content)) {
    issues.push('visual.content must be an object')
  } else if (value.content.kind === 'plot') {
    focusIds = validatePlotV4(value.content, issues)
  } else if (value.content.kind === 'node_link') {
    focusIds = validateNodeLinkV4(value.content, issues)
  } else if (value.content.kind === 'scene_2d') {
    focusIds = validateScene2DV4(value.content, issues)
  } else if (value.content.kind === 'relation') {
    focusIds = validateRelationV4(value.content, issues)
  } else if (value.content.kind === 'timeline') {
    focusIds = validateTimelineV4(value.content, issues)
  } else if (value.content.kind === 'formula_steps') {
    focusIds = validateFormulaStepsV4(value.content, issues)
  } else if (value.content.kind === 'study_map') {
    focusIds = validateStudyMapV4(value.content, issues)
  } else if (value.content.kind === 'recall_deck') {
    focusIds = validateRecallDeckV4(value.content, issues)
  } else if (value.content.kind === 'data_table') {
    focusIds = validateDataTableV4(value.content, issues)
  } else if (value.content.kind === 'state_transition') {
    focusIds = validateStateTransitionV4(value.content, issues)
  } else if (value.content.kind === 'sequence_buffer') {
    focusIds = validateSequenceBufferV4(value.content, issues)
  } else if (value.content.kind === 'sequence_diagram') {
    focusIds = validateSequenceDiagramV4(value.content, issues)
  } else if (value.content.kind === 'code_trace') {
    focusIds = validateCodeTraceV4(value.content, issues)
  } else if (value.content.kind === 'field_2d') {
    focusIds = validateField2DV4(value.content, issues)
  } else if (value.content.kind === 'causal_loop') {
    focusIds = validateCausalLoopV4(value.content, issues)
  } else {
    issues.push(`visual.content.kind must be one of ${LEARNING_VISUAL_KINDS_V4.join(', ')}`)
  }
  validateVisualSequenceV4(value.sequence, focusIds, issues)
  if (issues.length > 0) throw new LearningProtocolError(issues)
  return value as unknown as LearningVisualV4
}

export function parseLearningVisualResultV4(value: unknown): LearningVisualResultV4 {
  const issues: string[] = [...validateLearningVisualResultSchemaV4(value)]
  if (!record(value)) throw new LearningProtocolError(['visual result must be an object'])
  onlyKeys(value, ['protocol', 'status', 'content'], 'visualResult', issues)
  if (value.protocol !== VISUAL_RESULT_PROTOCOL_V4) {
    issues.push(`visualResult.protocol must be ${VISUAL_RESULT_PROTOCOL_V4}`)
  }
  if (!LEARNING_VISUAL_STATUSES.includes(value.status as LearningVisualStatusV4)) {
    issues.push(`visualResult.status must be one of ${LEARNING_VISUAL_STATUSES.join(', ')}`)
  }
  if (issues.length > 0) throw new LearningProtocolError(issues)
  return value as unknown as LearningVisualResultV4
}

/** Parse the small Client → Host recall bridge payload. */
export function parseLearningRecallFeedbackV1(value: unknown): LearningRecallFeedbackV1 {
  const issues: string[] = []
  if (!record(value)) throw new LearningProtocolError(['recall feedback must be an object'])
  onlyKeys(value, ['protocol', 'sessionId', 'callId', 'cardId', 'status'], 'recallFeedback', issues)
  if (value.protocol !== RECALL_FEEDBACK_PROTOCOL_V1) {
    issues.push(`recallFeedback.protocol must be ${RECALL_FEEDBACK_PROTOCOL_V1}`)
  }
  boundedIdentity(value.sessionId, 'recallFeedback.sessionId', issues)
  boundedIdentity(value.callId, 'recallFeedback.callId', issues)
  boundedIdentity(value.cardId, 'recallFeedback.cardId', issues, 128)
  if (!LEARNING_RECALL_STATUSES.includes(value.status as LearningRecallStatusV1)) {
    issues.push(`recallFeedback.status must be one of ${LEARNING_RECALL_STATUSES.join(', ')}`)
  }
  if (issues.length > 0) throw new LearningProtocolError(issues)
  return value as unknown as LearningRecallFeedbackV1
}
