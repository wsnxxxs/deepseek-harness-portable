/** Current visual/checkpoint protocol shared by the Host, Agent, and Client. */
import { LEARNING_CHECKPOINT_EVIDENCE_KINDS, LEARNING_CHECKPOINT_KINDS, LEARNING_VISUAL_KINDS_V4, LEARNING_VISUAL_STATUSES, MATH_BINARY_OPERATORS, MATH_UNARY_OPERATORS, VISUAL_PROTOCOL_V4, type GeneratedLearningCheckpointOptionV1, type GeneratedLearningCheckpointResponseV1, type GeneratedLearningCheckpointResultV1, type GeneratedLearningCheckpointV1, type GeneratedLearningVisualResultV4 } from './protocol-schema.ts';
export { LearningProtocolError } from './protocol-errors.ts';
export { CHECKPOINT_PROTOCOL, CHECKPOINT_RESULT_PROTOCOL, LEARNING_CHECKPOINT_EVIDENCE_KINDS, LEARNING_CHECKPOINT_KINDS, LEARNING_VISUAL_KINDS_V4, LEARNING_VISUAL_STATUSES, MATH_BINARY_OPERATORS, MATH_UNARY_OPERATORS, MAX_VISUAL_MATH_DEPTH, VISUAL_PROTOCOL_V4, VISUAL_RESULT_PROTOCOL_V4, } from './protocol-schema.ts';
export type { GeneratedLearningCheckpointOptionV1, GeneratedLearningCheckpointResponseV1, GeneratedLearningCheckpointResultV1, GeneratedLearningCheckpointV1, GeneratedLearningVisualResultV4, GeneratedLearningVisualV4, } from './protocol-schema.ts';
export declare const RECALL_FEEDBACK_PROTOCOL_V1: "dsh-learning/recall-feedback@1";
export declare const CHECKPOINT_TRANSPORT_PROTOCOL: "dsh-learning/checkpoint-wait@1";
export declare const MAX_ACTIVITY_BYTES: number;
export declare const MAX_RESPONSE_BYTES: number;
export declare const MAX_MATH_NODES = 64;
export type LearningAction = 'submit' | 'skip' | 'cancel';
export type LearningJson = null | boolean | number | string | LearningJson[] | {
    [key: string]: LearningJson;
};
export type LearningCheckpointKindV1 = typeof LEARNING_CHECKPOINT_KINDS[number];
export type LearningCheckpointEvidenceKindV1 = typeof LEARNING_CHECKPOINT_EVIDENCE_KINDS[number];
export type MathExpressionV1 = {
    op: 'constant';
    value: number;
} | {
    op: 'variable';
    name: string;
} | {
    op: typeof MATH_BINARY_OPERATORS[number];
    left: MathExpressionV1;
    right: MathExpressionV1;
} | {
    op: typeof MATH_UNARY_OPERATORS[number];
    value: MathExpressionV1;
};
export interface ProcessCheckpointV1 {
    question: string;
    options?: string[];
}
export interface ProcessStepV1 {
    id: string;
    title: string;
    content: string;
    checkpoint?: ProcessCheckpointV1;
}
export interface StructureItemV1 {
    id: string;
    label: string;
    detail?: string;
}
/** Types are generated from the same schema used by tools and Host validation. */
export type LearningCheckpointOptionV1 = GeneratedLearningCheckpointOptionV1;
export type LearningCheckpointV1 = GeneratedLearningCheckpointV1;
export type LearningCheckpointResponseV1 = GeneratedLearningCheckpointResponseV1;
/**
 * Why a non-submitted checkpoint ended.  The field is optional on v1 result
 * records so older persisted receipts remain readable; new Host/Client
 * receipts should always provide it.
 */
export type LearningCheckpointSkippedReasonV1 = NonNullable<Extract<GeneratedLearningCheckpointResultV1, {
    status: 'skipped';
}>['reason']>;
export type LearningCheckpointCancelledReasonV1 = NonNullable<Extract<GeneratedLearningCheckpointResultV1, {
    status: 'cancelled';
}>['reason']>;
export type LearningCheckpointOutcomeReasonV1 = LearningCheckpointSkippedReasonV1 | LearningCheckpointCancelledReasonV1;
export type LearningCheckpointSubmittedResultV1 = Extract<GeneratedLearningCheckpointResultV1, {
    status: 'submitted';
}>;
export type LearningCheckpointSkippedResultV1 = Extract<GeneratedLearningCheckpointResultV1, {
    status: 'skipped';
}>;
export type LearningCheckpointCancelledResultV1 = Extract<GeneratedLearningCheckpointResultV1, {
    status: 'cancelled';
}>;
export type LearningCheckpointResultV1 = GeneratedLearningCheckpointResultV1;
/** Durable safe projection used only to recover one pending checkpoint wait. */
export interface LearningCheckpointWaitEnvelopeV1 {
    transport: typeof CHECKPOINT_TRANSPORT_PROTOCOL;
    sessionId: string;
    callId: string;
    waitId: string;
    checkpointId: string;
    checkpoint: LearningCheckpointV1;
}
export type LearningCheckpointWaitEnvelopeInputV1 = Omit<LearningCheckpointWaitEnvelopeV1, 'transport'>;
export type LearningVisualToneV3 = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
export type LearningVisualStrokeV3 = 'solid' | 'dashed' | 'dotted';
export interface LearningVisualAxisV3 {
    label?: string;
    min: number;
    max: number;
    samples?: number;
}
export interface LearningVisualCurveV3 {
    type: 'curve';
    id: string;
    label: string;
    expression: string;
    tone?: LearningVisualToneV3;
    stroke?: LearningVisualStrokeV3;
}
export interface LearningVisualPointV3 {
    x: number;
    y: number;
    label?: string;
}
export interface LearningVisualPointSeriesV3 {
    type: 'points';
    id: string;
    label: string;
    points: LearningVisualPointV3[];
    tone?: LearningVisualToneV3;
}
export type LearningVisualSeriesV3 = LearningVisualCurveV3 | LearningVisualPointSeriesV3;
export interface LearningVisualMetricV3 {
    id: string;
    label: string;
    expression: string;
    digits?: number;
    suffix?: string;
}
export type LearningVisualKindV4 = typeof LEARNING_VISUAL_KINDS_V4[number];
export type LearningVisualToneV4 = LearningVisualToneV3;
export type LearningVisualStrokeV4 = LearningVisualStrokeV3;
export interface LearningVisualLineSeriesV4 {
    type: 'line';
    id: string;
    label: string;
    points: LearningVisualPointV3[];
    tone?: LearningVisualToneV4;
    stroke?: LearningVisualStrokeV4;
}
export interface LearningVisualBarSeriesV4 {
    type: 'bars';
    id: string;
    label: string;
    points: LearningVisualPointV3[];
    tone?: LearningVisualToneV4;
}
export type LearningPlotSeriesV4 = LearningVisualCurveV3 | LearningVisualPointSeriesV3 | LearningVisualLineSeriesV4 | LearningVisualBarSeriesV4;
/** One slider a learner can move; its id is what expressions name. */
export interface LearningVisualParameterV4 {
    id: string;
    label: string;
    min: number;
    max: number;
    step: number;
    initial: number;
}
export interface LearningPlotV4 {
    kind: 'plot';
    parameters?: LearningVisualParameterV4[];
    xAxis: LearningVisualAxisV3;
    yAxis: LearningVisualAxisV3;
    series: LearningPlotSeriesV4[];
    metrics?: LearningVisualMetricV3[];
}
export interface LearningNodeGroupV4 {
    id: string;
    label: string;
}
export interface LearningNodeV4 {
    id: string;
    label: string;
    detail?: string;
    group?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningEdgeV4 {
    id: string;
    from: string;
    to: string;
    label?: string;
    detail?: string;
    tone?: LearningVisualToneV4;
    stroke?: LearningVisualStrokeV4;
    directed?: boolean;
}
export interface LearningNodeLinkV4 {
    kind: 'node_link';
    layout: 'layered' | 'hierarchy' | 'radial';
    groups?: LearningNodeGroupV4[];
    nodes: LearningNodeV4[];
    edges: LearningEdgeV4[];
}
interface LearningSceneElementBaseV4 {
    id: string;
    label?: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningScenePointV4 extends LearningSceneElementBaseV4 {
    type: 'point';
    x: number;
    y: number;
    size?: number;
}
export interface LearningSceneSegmentV4 extends LearningSceneElementBaseV4 {
    type: 'segment' | 'arrow';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke?: LearningVisualStrokeV4;
}
export interface LearningSceneCircleV4 extends LearningSceneElementBaseV4 {
    type: 'circle';
    cx: number;
    cy: number;
    r: number;
}
export interface LearningSceneRectV4 extends LearningSceneElementBaseV4 {
    type: 'rect';
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface LearningScenePolygonV4 extends LearningSceneElementBaseV4 {
    type: 'polygon';
    points: Array<{
        x: number;
        y: number;
    }>;
}
export interface LearningSceneLabelV4 extends LearningSceneElementBaseV4 {
    type: 'label';
    x: number;
    y: number;
    text: string;
}
export type LearningSceneElementV4 = LearningScenePointV4 | LearningSceneSegmentV4 | LearningSceneCircleV4 | LearningSceneRectV4 | LearningScenePolygonV4 | LearningSceneLabelV4;
export interface LearningScene2DV4 {
    kind: 'scene_2d';
    xAxis: LearningVisualAxisV3;
    yAxis: LearningVisualAxisV3;
    grid?: boolean;
    elements: LearningSceneElementV4[];
}
export interface LearningRelationSubjectV4 {
    id: string;
    label: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningRelationComparisonRowV4 {
    id: string;
    label: string;
    cells: Array<{
        subjectId: string;
        value: string;
        tone?: LearningVisualToneV4;
    }>;
    detail?: string;
}
export interface LearningComparisonRelationV4 {
    kind: 'relation';
    variant: 'comparison';
    subjects: LearningRelationSubjectV4[];
    rows: LearningRelationComparisonRowV4[];
}
export interface LearningRelationAxisItemV4 {
    id: string;
    label: string;
}
export interface LearningRelationMatrixCellV4 {
    id: string;
    rowId: string;
    columnId: string;
    label: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningMatrixRelationV4 {
    kind: 'relation';
    variant: 'matrix';
    rows: LearningRelationAxisItemV4[];
    columns: LearningRelationAxisItemV4[];
    cells: LearningRelationMatrixCellV4[];
}
export interface LearningRelationSetV4 {
    id: string;
    label: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningRelationSetItemV4 {
    id: string;
    label: string;
    setIds: string[];
    detail?: string;
}
export interface LearningSetsRelationV4 {
    kind: 'relation';
    variant: 'sets';
    sets: LearningRelationSetV4[];
    items: LearningRelationSetItemV4[];
}
export type LearningRelationV4 = LearningComparisonRelationV4 | LearningMatrixRelationV4 | LearningSetsRelationV4;
export interface LearningTimelineEventV4 {
    id: string;
    time: string;
    label: string;
    detail?: string;
    /** Optional normalized position from 0 to 1; omit for equal spacing. */
    position?: number;
    tone?: LearningVisualToneV4;
}
export interface LearningTimelineEraV4 {
    id: string;
    label: string;
    startEventId: string;
    endEventId: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningTimelineV4 {
    kind: 'timeline';
    orientation?: 'horizontal' | 'vertical';
    events: LearningTimelineEventV4[];
    eras?: LearningTimelineEraV4[];
}
export interface LearningFormulaStepV4 {
    id: string;
    /** A single trusted Markdown-math expression, preferably LaTeX without delimiters. */
    expression: string;
    label?: string;
    /** The named rule that transforms the preceding expression into this one. */
    rule?: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningFormulaStepsV4 {
    kind: 'formula_steps';
    notation?: string;
    steps: LearningFormulaStepV4[];
    conclusion?: string;
}
export interface LearningStudySectionV4 {
    id: string;
    label: string;
    /** Human-readable source location such as “Chapter 2” or “pp. 18–23”. */
    anchor?: string;
    summary?: string;
}
export interface LearningStudyConceptV4 {
    id: string;
    label: string;
    sectionId: string;
    detail?: string;
    /** Stable concept-card identity when this is a saved-concepts view. */
    conceptSlug?: string;
    mastery?: 'unseen' | 'emerging' | 'transfer';
    due?: string;
    stale?: boolean;
    prerequisiteIds?: string[];
    role?: 'foundation' | 'core' | 'extension' | 'practice';
    tone?: LearningVisualToneV4;
}
export interface LearningStudyMapV4 {
    kind: 'study_map';
    /** `concepts` asks the Host to materialize the saved card state. */
    view?: 'material' | 'concepts';
    sourceLabel: string;
    goal?: string;
    sections: LearningStudySectionV4[];
    concepts: LearningStudyConceptV4[];
}
export interface LearningRecallCardV4 {
    id: string;
    prompt: string;
    answer: string;
    hint?: string;
    tags?: string[];
}
export interface LearningRecallDeckV4 {
    kind: 'recall_deck';
    instructions?: string;
    cards: LearningRecallCardV4[];
}
export type LearningTableValueV4 = string | number | boolean | null;
export interface LearningDataTableColumnV4 {
    id: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'date';
    unit?: string;
}
export interface LearningDataTableCellV4 {
    columnId: string;
    value: LearningTableValueV4;
}
export interface LearningDataTableRowV4 {
    id: string;
    cells: LearningDataTableCellV4[];
    detail?: string;
}
export interface LearningDataTableSortV4 {
    columnId: string;
    direction: 'asc' | 'desc';
}
export interface LearningDataTableFilterV4 {
    columnId: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
    value: LearningTableValueV4;
}
export interface LearningDataTableChartV4 {
    type: 'line' | 'bar' | 'scatter';
    xColumnId: string;
    yColumnId: string;
    seriesColumnId?: string;
}
export interface LearningDataTableV4 {
    kind: 'data_table';
    columns: LearningDataTableColumnV4[];
    rows: LearningDataTableRowV4[];
    outlierIds?: string[];
    initialSort?: LearningDataTableSortV4;
    initialFilter?: LearningDataTableFilterV4;
    chart?: LearningDataTableChartV4;
}
export interface LearningStateTransitionStateV4 {
    id: string;
    label: string;
    detail?: string;
    tone?: LearningVisualToneV4;
    initial?: boolean;
    final?: boolean;
}
export interface LearningStateTransitionTransitionV4 {
    id: string;
    from: string;
    to: string;
    trigger: string;
    guard?: string;
    action?: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningStateTransitionStepV4 {
    id: string;
    label: string;
    currentStateId: string;
    transitionId?: string;
    description?: string;
}
export interface LearningStateTransitionV4 {
    kind: 'state_transition';
    states: LearningStateTransitionStateV4[];
    transitions: LearningStateTransitionTransitionV4[];
    steps?: LearningStateTransitionStepV4[];
}
export interface LearningSequenceBufferSlotV4 {
    id: string;
    index: number;
    value: LearningTableValueV4;
    label?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningSequenceBufferPointerV4 {
    id: string;
    label: string;
    index: number;
    tone?: LearningVisualToneV4;
}
export interface LearningSequenceBufferRangeV4 {
    id: string;
    label: string;
    start: number;
    end: number;
    tone?: LearningVisualToneV4;
}
export interface LearningSequenceBufferSlotSnapshotV4 {
    slotId: string;
    value?: LearningTableValueV4;
}
export interface LearningSequenceBufferPointerSnapshotV4 {
    pointerId: string;
    index: number;
}
export interface LearningSequenceBufferRangeSnapshotV4 {
    rangeId: string;
    start: number;
    end: number;
}
export interface LearningSequenceBufferStepV4 {
    id: string;
    label: string;
    description?: string;
    slots?: LearningSequenceBufferSlotSnapshotV4[];
    pointers?: LearningSequenceBufferPointerSnapshotV4[];
    ranges?: LearningSequenceBufferRangeSnapshotV4[];
}
export interface LearningSequenceBufferV4 {
    kind: 'sequence_buffer';
    slots: LearningSequenceBufferSlotV4[];
    pointers?: LearningSequenceBufferPointerV4[];
    ranges?: LearningSequenceBufferRangeV4[];
    steps?: LearningSequenceBufferStepV4[];
}
export interface LearningSequenceParticipantV4 {
    id: string;
    label: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningSequenceMessageV4 {
    id: string;
    from: string;
    to: string;
    label: string;
    type: 'sync' | 'async' | 'return' | 'self';
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningSequenceDiagramV4 {
    kind: 'sequence_diagram';
    participants: LearningSequenceParticipantV4[];
    messages: LearningSequenceMessageV4[];
}
export interface LearningCodeTraceLineV4 {
    number: number;
    text: string;
}
export interface LearningCodeTraceVariableV4 {
    name: string;
    value: LearningTableValueV4;
    type?: string;
}
export interface LearningCodeTraceStackFrameV4 {
    id: string;
    function: string;
    line?: number;
}
export interface LearningCodeTraceStepV4 {
    id: string;
    label: string;
    currentLine: number;
    variables: LearningCodeTraceVariableV4[];
    stack: LearningCodeTraceStackFrameV4[];
    output?: string;
    description?: string;
}
export interface LearningCodeTraceV4 {
    kind: 'code_trace';
    language: string;
    code: string;
    lines: LearningCodeTraceLineV4[];
    steps: LearningCodeTraceStepV4[];
}
export interface LearningFieldAxisV4 {
    label?: string;
    min: number;
    max: number;
    samples?: number;
}
export interface LearningScalarFieldGridV4 {
    columns: number;
    rows: number;
    values: number[];
}
export interface LearningVectorFieldGridV4 {
    columns: number;
    rows: number;
    u: number[];
    v: number[];
}
export interface LearningScalarFieldV4 {
    samples?: LearningScalarFieldGridV4;
    expression?: string;
    min?: number;
    max?: number;
}
export interface LearningVectorFieldV4 {
    samples?: LearningVectorFieldGridV4;
    expression?: {
        u: string;
        v: string;
    };
}
export interface LearningField2DV4 {
    kind: 'field_2d';
    xAxis: LearningFieldAxisV4;
    yAxis: LearningFieldAxisV4;
    scalar?: LearningScalarFieldV4;
    vector?: LearningVectorFieldV4;
}
export interface LearningCausalVariableV4 {
    id: string;
    label: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningCausalLinkV4 {
    id: string;
    from: string;
    to: string;
    polarity: 'positive' | 'negative';
    delay?: number;
    label?: string;
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningCausalLoopV4 {
    id: string;
    label: string;
    type: 'reinforcing' | 'balancing';
    linkIds: string[];
    detail?: string;
    tone?: LearningVisualToneV4;
}
export interface LearningCausalLoopDiagramV4 {
    kind: 'causal_loop';
    variables: LearningCausalVariableV4[];
    links: LearningCausalLinkV4[];
    loops?: LearningCausalLoopV4[];
}
export type LearningVisualContentV4 = LearningPlotV4 | LearningNodeLinkV4 | LearningScene2DV4 | LearningRelationV4 | LearningTimelineV4 | LearningFormulaStepsV4 | LearningStudyMapV4 | LearningRecallDeckV4 | LearningDataTableV4 | LearningStateTransitionV4 | LearningSequenceBufferV4 | LearningSequenceDiagramV4 | LearningCodeTraceV4 | LearningField2DV4 | LearningCausalLoopDiagramV4;
export interface LearningVisualFrameV4 {
    id: string;
    label: string;
    description?: string;
    focusIds: string[];
}
export interface LearningVisualSequenceV4 {
    initialFrameId?: string;
    frames: LearningVisualFrameV4[];
}
/**
 * Stable renderer-facing view of the generated model schema. The companion
 * GeneratedLearningVisualV4 type is exported for schema consumers, while this
 * named contract keeps the recursive math AST precise for renderers.
 */
export interface LearningVisualV4 {
    protocol: typeof VISUAL_PROTOCOL_V4;
    title: string;
    description?: string;
    content: LearningVisualContentV4;
    sequence?: LearningVisualSequenceV4;
    fallbackMarkdown?: string;
}
/**
 * Terminal outcome of one `learning_visual` call.
 *
 * `unavailable` means the composition has no renderer for this payload, so the
 * learner saw nothing. The model must then carry the explanation in prose
 * instead of referring to a figure that is not on screen.
 */
export type LearningVisualResultV4 = GeneratedLearningVisualResultV4;
export type LearningVisualStatusV4 = typeof LEARNING_VISUAL_STATUSES[number];
/** A learner's explicit recall interaction, sent from the visual Client to Host. */
export declare const LEARNING_RECALL_STATUSES: readonly ["revealed", "mastered", "review"];
export type LearningRecallStatusV1 = typeof LEARNING_RECALL_STATUSES[number];
export interface LearningRecallFeedbackV1 {
    protocol: typeof RECALL_FEEDBACK_PROTOCOL_V1;
    /** Session identity is part of the wire key; Host still checks it is active. */
    sessionId: string;
    /** The semantic visual call that owns the card. */
    callId: string;
    cardId: string;
    status: LearningRecallStatusV1;
}
/** Canonical fail-closed predicate shared by protocol parsing and Client fallback extraction. */
export declare function isLearningCheckpointDisplayTextSafe(value: string): boolean;
/** Strict, answer-free protocol for one optional learner checkpoint. */
export declare function parseLearningCheckpointV1(value: unknown): LearningCheckpointV1;
export interface ExpectedLearningCheckpointResultV1 {
    checkpointId?: string;
    checkpoint?: LearningCheckpointV1;
}
/** Validate one phase-bound checkpoint receipt before the Host accepts it. */
export declare function parseLearningCheckpointResultV1(value: unknown, expected?: ExpectedLearningCheckpointResultV1): LearningCheckpointResultV1;
/** Validate the semantic, model-facing visual protocol while retaining V3 replay separately. */
export declare function parseLearningVisualV4(value: unknown): LearningVisualV4;
export declare function parseLearningVisualResultV4(value: unknown): LearningVisualResultV4;
/** Parse the small Client → Host recall bridge payload. */
export declare function parseLearningRecallFeedbackV1(value: unknown): LearningRecallFeedbackV1;
//# sourceMappingURL=protocol-current.d.ts.map