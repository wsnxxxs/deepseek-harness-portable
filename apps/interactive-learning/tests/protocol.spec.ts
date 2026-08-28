import { describe, expect, it } from 'vitest'
import {
  LEARNING_VISUAL_KINDS_V4,
  MATH_BINARY_OPERATORS,
  MATH_UNARY_OPERATORS,
  MAX_ACTIVITY_BYTES,
  RECALL_FEEDBACK_PROTOCOL_V1,
  TRANSPORT_PROTOCOL_V2,
  VISUAL_PROTOCOL_V4,
  VISUAL_RESULT_PROTOCOL_V4,
  LearningProtocolError,
  parseLearningActivity,
  parseLearningActivityV2,
  parseLearningVisualV3,
  parseLearningVisualV4,
  parseLearningResponse,
  parseLearningResponseV2,
  parseLearningRecallFeedbackV1,
} from '../src/protocol.ts'
import {
  decodeLearningDetail,
  decodeLearningQuestionId,
  decodeLearningWaitDetail,
  decodeLearningWaitQuestionId,
  encodeLearningDetail,
  encodeLearningQuestionId,
  encodeLearningWaitDetail,
  learningWaitQuestionId,
} from '../src/transport.ts'
import {
  visualV4Catalog,
} from './fixtures.ts'
import { evaluateMathExpression } from '../src/math-expression.ts'

describe('semantic Learning Visual Protocol v4', () => {
  it('accepts the extended math vocabulary used by activation and statistics plots', () => {
    expect(MATH_BINARY_OPERATORS).toEqual(['add', 'sub', 'mul', 'div', 'pow', 'min', 'max'])
    expect(MATH_UNARY_OPERATORS).toContain('relu')
    expect(MATH_UNARY_OPERATORS).toContain('normpdf')
    const visual = structuredClone(visualV4Catalog.derivativePlot)
    if (visual.content.kind !== 'plot') throw new Error('fixture mismatch')
    visual.content.series[0] = {
      ...visual.content.series[0],
      expression: 'max(relu(tan(x)), normpdf(x))',
    }
    expect(() => parseLearningVisualV4(visual)).not.toThrow()
    expect(evaluateMathExpression('leaky_relu(-2)', {})).toBeCloseTo(-0.02)
    expect(evaluateMathExpression('step(0)', {})).toBe(1)
  })

  it('accepts every native content kind and all three relation variants', () => {
    const parsed = Object.values(visualV4Catalog).map(visual => parseLearningVisualV4(visual))
    expect(parsed.map(visual => visual.content.kind)).toEqual([
      'plot',
      'node_link',
      'scene_2d',
      'relation',
      'relation',
      'relation',
      'timeline',
      'formula_steps',
      'study_map',
      'recall_deck',
      'data_table',
      'state_transition',
      'sequence_buffer',
      'sequence_diagram',
      'code_trace',
      'field_2d',
      'causal_loop',
    ])
    expect([...new Set(parsed.map(visual => visual.content.kind))]).toEqual(LEARNING_VISUAL_KINDS_V4)
    expect(parsed.flatMap(visual => visual.content.kind === 'relation'
      ? [visual.content.variant]
      : [])).toEqual(['comparison', 'matrix', 'sets'])

    const network = parseLearningVisualV4(visualV4Catalog.fullyConnectedNetwork)
    expect(network.content.kind).toBe('node_link')
    if (network.content.kind !== 'node_link') throw new Error('fixture mismatch')
    expect(network.content.nodes).toHaveLength(9)
    expect(network.content.edges).toHaveLength(20)
  })

  it('rejects references that do not resolve inside graphs, relations, timelines, and study maps', () => {
    const badEdge = structuredClone(visualV4Catalog.fullyConnectedNetwork)
    if (badEdge.content.kind !== 'node_link') throw new Error('fixture mismatch')
    badEdge.content.edges[0]!.from = 'missing_node'

    const badComparison = structuredClone(visualV4Catalog.comparisonRelation)
    if (badComparison.content.kind !== 'relation' || badComparison.content.variant !== 'comparison') {
      throw new Error('fixture mismatch')
    }
    badComparison.content.rows[0]!.cells[0]!.subjectId = 'missing_subject'

    const badMatrix = structuredClone(visualV4Catalog.matrixRelation)
    if (badMatrix.content.kind !== 'relation' || badMatrix.content.variant !== 'matrix') {
      throw new Error('fixture mismatch')
    }
    badMatrix.content.cells[0]!.rowId = 'missing_row'

    const badSets = structuredClone(visualV4Catalog.setsRelation)
    if (badSets.content.kind !== 'relation' || badSets.content.variant !== 'sets') {
      throw new Error('fixture mismatch')
    }
    badSets.content.items[0]!.setIds = ['missing_set']

    const badTimeline = structuredClone(visualV4Catalog.neuralNetworkTimeline)
    if (badTimeline.content.kind !== 'timeline' || badTimeline.content.eras === undefined) {
      throw new Error('fixture mismatch')
    }
    badTimeline.content.eras[0]!.startEventId = 'missing_event'

    const badStudySection = structuredClone(visualV4Catalog.calculusStudyMap)
    if (badStudySection.content.kind !== 'study_map') throw new Error('fixture mismatch')
    badStudySection.content.concepts[0]!.sectionId = 'missing_section'

    const badPrerequisite = structuredClone(visualV4Catalog.calculusStudyMap)
    if (badPrerequisite.content.kind !== 'study_map') throw new Error('fixture mismatch')
    badPrerequisite.content.concepts[1]!.prerequisiteIds = ['missing_concept']

    for (const invalid of [
      badEdge,
      badComparison,
      badMatrix,
      badSets,
      badTimeline,
      badStudySection,
      badPrerequisite,
    ]) {
      expect(() => parseLearningVisualV4(invalid)).toThrow(/reference|declared/)
    }
  })

  it('rejects prerequisite cycles in study maps', () => {
    const visual = structuredClone(visualV4Catalog.calculusStudyMap)
    if (visual.content.kind !== 'study_map') throw new Error('fixture mismatch')

    const functionChange = visual.content.concepts.find(concept => concept.id === 'function_change')
    if (functionChange === undefined) throw new Error('fixture mismatch')
    functionChange.prerequisiteIds = ['derivative_definition']

    expect(() => parseLearningVisualV4(visual)).toThrow(/prerequisiteIds must not contain a cycle/)
  })

  it('rejects extra fields and arbitrary HTML render payloads', () => {
    const plot = visualV4Catalog.derivativePlot
    for (const invalid of [
      { ...plot, javascript: 'alert(1)' },
      { ...plot, content: { ...plot.content, markup: '<svg onload="alert(1)" />' } },
      {
        protocol: VISUAL_PROTOCOL_V4,
        title: 'Unsafe arbitrary renderer',
        content: { kind: 'html', markup: '<script>alert(1)</script>' },
      },
    ]) {
      expect(() => parseLearningVisualV4(invalid)).toThrow(LearningProtocolError)
    }
  })

  it('rejects bounded collections that exceed their declared maximum', () => {
    const visual = structuredClone(visualV4Catalog.fullyConnectedNetwork)
    if (visual.content.kind !== 'node_link') throw new Error('fixture mismatch')
    const first = visual.content.edges[0]!
    visual.content.edges = Array.from({ length: 161 }, (_, index) => ({
      ...first,
      id: `edge_${String(index)}`,
    }))
    expect(() => parseLearningVisualV4(visual)).toThrow(/1 to 160 edges/)

    const formula = structuredClone(visualV4Catalog.powerRuleDerivation)
    if (formula.content.kind !== 'formula_steps') throw new Error('fixture mismatch')
    formula.content.steps = Array.from({ length: 17 }, (_, index) => ({
      id: `step_${String(index)}`,
      expression: `x + ${String(index)}`,
    }))
    expect(() => parseLearningVisualV4(formula)).toThrow(/2 to 16 formula steps/)

    const deck = structuredClone(visualV4Catalog.derivativeRecallDeck)
    if (deck.content.kind !== 'recall_deck') throw new Error('fixture mismatch')
    deck.content.cards = Array.from({ length: 33 }, (_, index) => ({
      id: `card_${String(index)}`,
      prompt: `Prompt ${String(index)}`,
      answer: `Answer ${String(index)}`,
    }))
    expect(() => parseLearningVisualV4(deck)).toThrow(/2 to 32 cards/)
  })

  it('rejects sequence focus and initial-frame ids outside the declared visual', () => {
    const missingFocus = structuredClone(visualV4Catalog.vectorScene)
    if (missingFocus.sequence === undefined) throw new Error('fixture mismatch')
    missingFocus.sequence.frames[0]!.focusIds = ['not_in_scene']
    expect(() => parseLearningVisualV4(missingFocus)).toThrow(/must reference visual content/)

    const missingInitialFrame = structuredClone(visualV4Catalog.fullyConnectedNetwork)
    if (missingInitialFrame.sequence === undefined) throw new Error('fixture mismatch')
    missingInitialFrame.sequence.initialFrameId = 'not_a_frame'
    expect(() => parseLearningVisualV4(missingInitialFrame)).toThrow(/must reference a declared frame/)
  })

  it('pins the V4 visual and immediate-ready result protocol literals', () => {
    expect(VISUAL_PROTOCOL_V4).toBe('dsh-learning/visual@4')
    expect(VISUAL_RESULT_PROTOCOL_V4).toBe('dsh-learning/visual-result@4')
  })
})

describe('RecallDeck Host feedback protocol', () => {
  it('accepts bounded session/visual/card identity and rejects malformed ratings', () => {
    expect(parseLearningRecallFeedbackV1({
      protocol: RECALL_FEEDBACK_PROTOCOL_V1,
      sessionId: 'session-a',
      callId: 'call-visual-1',
      cardId: 'card_gradient',
      status: 'review',
    })).toMatchObject({ status: 'review', cardId: 'card_gradient' })
    expect(() => parseLearningRecallFeedbackV1({
      protocol: RECALL_FEEDBACK_PROTOCOL_V1,
      sessionId: 'session-a',
      callId: 'call-visual-1',
      cardId: 'card_gradient',
      status: 'incorrect',
    })).toThrow(/status must be one of/)
    expect(() => parseLearningRecallFeedbackV1({
      protocol: RECALL_FEEDBACK_PROTOCOL_V1,
      sessionId: 'other\nagent',
      callId: 'call-visual-1',
      cardId: 'card_gradient',
      status: 'mastered',
    })).toThrow(/bounded identity/)
  })
})
