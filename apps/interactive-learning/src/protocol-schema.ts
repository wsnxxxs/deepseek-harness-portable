/** Schema-first source for model-facing Learning visual and checkpoint payloads. */
import type { InferValue, ParameterSchemaSpec, ValueSchemaSpec } from '@deepseek-ai/dsh-tools'

type RuntimeSchema = {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null'
  oneOf?: readonly RuntimeSchema[]
  properties?: Record<string, RuntimeSchema>
  items?: RuntimeSchema
  required?: boolean
  additionalProperties?: boolean
  enum?: readonly unknown[]
  const?: unknown
}

function schemaPath(path: string): string {
  return path === '' ? 'value' : path
}

function propertyPath(path: string, key: string): string {
  return path === '' ? key : `${path}.${key}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validate the local schema DSL without pulling the host-only tool registry
 * into the browser bundle. The same schema object is still passed to dsh-tools
 * when the Host registers the model-facing tool.
 */
function validateSchemaValue(schema: RuntimeSchema, value: unknown, path: string): string[] {
  if (schema.oneOf !== undefined) {
    const matches = schema.oneOf.filter(branch => validateSchemaValue(branch, value, path).length === 0).length
    return matches === 1
      ? []
      : [`"${schemaPath(path)}" must match exactly one oneOf branch (matched ${matches})`]
  }

  if (schema.type === undefined) return []
  if (schema.type === 'object') {
    if (!isRecord(value)) return [`"${schemaPath(path)}" must be an object`]
    const properties = schema.properties ?? {}
    const issues: string[] = []
    for (const [key, child] of Object.entries(properties)) {
      const childPath = propertyPath(path, key)
      if (child.required === true && (!Object.hasOwn(value, key) || value[key] === undefined)) {
        issues.push(`missing required property "${childPath}"`)
        continue
      }
      if (Object.hasOwn(value, key) && value[key] !== undefined) {
        issues.push(...validateSchemaValue(child, value[key], childPath))
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          issues.push(`"${propertyPath(path, key)}" is not a declared property (additionalProperties: false)`)
        }
      }
    }
    return issues
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) return [`"${schemaPath(path)}" must be an array`]
    return schema.items === undefined
      ? []
      : value.flatMap((entry, index) => validateSchemaValue(schema.items!, entry, `${path}[${index}]`))
  }

  const scalarMatches = schema.type === 'null'
    ? value === null
    : schema.type === 'number'
      ? typeof value === 'number' && Number.isFinite(value)
      : schema.type === 'integer'
        ? typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)
        : typeof value === schema.type
  if (!scalarMatches) return [`"${schemaPath(path)}" must be a ${schema.type}`]
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    return [`"${schemaPath(path)}" must be one of ${JSON.stringify(schema.enum)}`]
  }
  if (Object.hasOwn(schema, 'const') && value !== schema.const) {
    return [`"${schemaPath(path)}" must be ${JSON.stringify(schema.const)}`]
  }
  return []
}

export const VISUAL_PROTOCOL_V4 = 'dsh-learning/visual@4' as const
export const VISUAL_RESULT_PROTOCOL_V4 = 'dsh-learning/visual-result@4' as const
export const LEARNING_VISUAL_STATUSES = ['ready', 'unavailable'] as const
export const CHECKPOINT_PROTOCOL = 'dsh-learning/checkpoint@1' as const
export const CHECKPOINT_RESULT_PROTOCOL = 'dsh-learning/checkpoint-result@1' as const

export const LEARNING_CHECKPOINT_KINDS = [
  'free_text',
  'single_choice',
  'numeric',
  'prediction',
  'code_slot',
] as const

export const LEARNING_CHECKPOINT_EVIDENCE_KINDS = [
  'attempt',
  'prediction',
  'explanation',
  'contrast',
  'transfer',
] as const

export const LEARNING_VISUAL_KINDS_V4 = [
  'plot',
  'node_link',
  'scene_2d',
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
] as const

export const MAX_VISUAL_MATH_DEPTH = 4
export const MATH_BINARY_OPERATORS = ['add', 'sub', 'mul', 'div', 'pow', 'min', 'max'] as const
export const MATH_UNARY_OPERATORS = [
  'neg', 'abs', 'sqrt', 'sin', 'cos', 'tan', 'atan', 'exp', 'log', 'sigmoid',
  'relu', 'leaky_relu', 'step', 'normpdf', 'floor', 'ceil',
] as const

const parameter = { type: 'object', additionalProperties: false, properties: {
  id: {
    type: 'string',
    description: 'Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -. The id x is reserved for the chart axis.',
    required: true,
  },
  label: { type: 'string', required: true },
  min: { type: 'number', required: true },
  max: { type: 'number', required: true },
  step: { type: 'number', required: true },
  initial: { type: 'number', required: true },
} } as const

function mathExpressionSchema(depth: number): ValueSchemaSpec {
  const leaves: [ValueSchemaSpec, ValueSchemaSpec] = [
    { type: 'object', additionalProperties: false, properties: {
      op: { type: 'string', const: 'constant', required: true },
      value: { type: 'number', required: true },
    } },
    { type: 'object', additionalProperties: false, properties: {
      op: { type: 'string', const: 'variable', required: true },
      name: {
        type: 'string',
        description: 'Use x or one of this visual\'s parameter ids.',
        required: true,
      },
    } },
  ]
  if (depth <= 1) return { oneOf: leaves }
  const nested = mathExpressionSchema(depth - 1)
  return { oneOf: [
    ...leaves,
    { type: 'object', additionalProperties: false, properties: {
      op: {
        type: 'string',
        enum: MATH_UNARY_OPERATORS,
        required: true,
      },
      value: { ...nested, required: true },
    } },
    { type: 'object', additionalProperties: false, properties: {
      op: { type: 'string', enum: MATH_BINARY_OPERATORS, required: true },
      left: { ...nested, required: true },
      right: { ...nested, required: true },
    } },
  ] }
}

function required<const S extends ValueSchemaSpec>(schema: S): S & { required: true } {
  return { ...schema, required: true }
}

// Shared with the runtime parser: expressive enough for common activation and
// statistics curves while remaining bounded by the visual AST depth.
const expression = mathExpressionSchema(MAX_VISUAL_MATH_DEPTH)
const requiredExpression = required(expression)
const mathExpressionDescription = 'Closed math AST. leaky_relu uses a 0.01 negative slope, step switches from 0 to 1 at zero, and normpdf is the standard normal density; compose normpdf with sub/div and an outer div for other means and standard deviations.'
const identifier = {
  type: 'string',
  description: 'Identifier: 1 to 32 characters, start with a lowercase letter, then use only a-z, 0-9, _ or -.',
} as const
const tone = { type: 'string', enum: ['blue', 'green', 'red', 'orange', 'purple', 'gray'] } as const
const stroke = { type: 'string', enum: ['solid', 'dashed', 'dotted'] } as const
const point = { type: 'object', additionalProperties: false, properties: {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
  label: { type: 'string' },
} } as const
const coordinate = { type: 'object', additionalProperties: false, properties: {
  x: { type: 'number', required: true },
  y: { type: 'number', required: true },
} } as const
const axis = { type: 'object', additionalProperties: false, properties: {
  label: { type: 'string' },
  min: { type: 'number', required: true },
  max: { type: 'number', required: true },
} } as const
const curveSeries = { type: 'object', additionalProperties: false, properties: {
  type: { type: 'string', const: 'curve', required: true },
  id: { ...identifier, required: true },
  label: { type: 'string', required: true },
  expression: { ...requiredExpression, description: mathExpressionDescription },
  tone,
  stroke,
} } as const
const pointSeries = { type: 'object', additionalProperties: false, properties: {
  type: { type: 'string', const: 'points', required: true },
  id: { ...identifier, required: true },
  label: { type: 'string', required: true },
  points: { type: 'array', required: true, items: point, description: '1 to 256 points.' },
  tone,
} } as const
const lineSeries = { type: 'object', additionalProperties: false, properties: {
  type: { type: 'string', const: 'line', required: true },
  id: { ...identifier, required: true },
  label: { type: 'string', required: true },
  points: { type: 'array', required: true, items: point, description: '1 to 256 points.' },
  tone,
  stroke,
} } as const
const barSeries = { type: 'object', additionalProperties: false, properties: {
  type: { type: 'string', const: 'bars', required: true },
  id: { ...identifier, required: true },
  label: { type: 'string', required: true },
  points: { type: 'array', required: true, items: point, description: '1 to 64 bars.' },
  tone,
} } as const

const plotContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'plot', required: true,
    description: 'Functions, quantitative data, probability, distributions, or tangent/secant geometry on Cartesian axes.',
  },
  parameters: {
    type: 'array', items: parameter,
    description: [
      'Optional; omit for a static plot. Use at most three only when changing the value teaches the mechanism.',
      'A slider is a teaching metaphor that puts the learner\'s hand on the parameter: ask them to predict first, then drag it.',
      'Do not silently treat movement as assessed evidence; like recall self-rating it has low confidence and unknown correctness until the learner explains what they observed.',
      '可选；滑块用于“先预测、再拖动”的教学比喻，不得静默采集为已判定正确的学习证据。',
    ].join(' '),
  },
  xAxis: { ...axis, required: true, properties: {
    ...axis.properties,
    samples: { type: 'integer', description: 'Optional curve samples from 24 to 256.' },
  } },
  yAxis: required(axis),
  series: {
    type: 'array', required: true, items: { oneOf: [curveSeries, pointSeries, lineSeries, barSeries] },
    description: '1 to 8 series.',
  },
  metrics: { type: 'array', items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true },
      label: { type: 'string', required: true },
      expression: { ...requiredExpression, description: mathExpressionDescription },
      digits: { type: 'integer' },
      suffix: { type: 'string' },
    },
  }, description: 'Optional; at most 4 metrics.' },
} } as const

const nodeGroup = { type: 'object', additionalProperties: false, properties: {
  id: { ...identifier, required: true },
  label: { type: 'string', required: true },
} } as const
const node = { type: 'object', additionalProperties: false, properties: {
  id: { ...identifier, required: true },
  label: { type: 'string', required: true },
  detail: { type: 'string' },
  group: { type: 'string' },
  tone,
} } as const
const edge = { type: 'object', additionalProperties: false, properties: {
  id: { ...identifier, required: true },
  from: { type: 'string', required: true },
  to: { type: 'string', required: true },
  label: { type: 'string' },
  detail: { type: 'string' },
  tone,
  stroke,
  directed: { type: 'boolean' },
} } as const
const nodeLinkContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'node_link', required: true,
    description: 'Networks, fully connected layers, trees, causality, concept maps, state transitions, and dependency topology.',
  },
  layout: { type: 'string', enum: ['layered', 'hierarchy', 'radial'], required: true },
  groups: {
    type: 'array', items: nodeGroup,
    description: 'Optional 1 to 12 ordered layers for layered layout; every node must reference one group.',
  },
  nodes: { type: 'array', items: node, required: true, description: '2 to 48 nodes.' },
  edges: { type: 'array', items: edge, required: true, description: '1 to 160 edges; include every semantically required connection.' },
} } as const

const sceneBase = {
  id: { ...identifier, required: true },
  label: { type: 'string' },
  detail: { type: 'string' },
  tone,
} as const
const sceneElement = { oneOf: [
  { type: 'object', additionalProperties: false, properties: {
    type: { type: 'string', const: 'point', required: true }, ...sceneBase,
    x: { type: 'number', required: true }, y: { type: 'number', required: true }, size: { type: 'number' },
  } },
  { type: 'object', additionalProperties: false, properties: {
    type: { type: 'string', enum: ['segment', 'arrow'], required: true }, ...sceneBase,
    x1: { type: 'number', required: true }, y1: { type: 'number', required: true },
    x2: { type: 'number', required: true }, y2: { type: 'number', required: true }, stroke,
  } },
  { type: 'object', additionalProperties: false, properties: {
    type: { type: 'string', const: 'circle', required: true }, ...sceneBase,
    cx: { type: 'number', required: true }, cy: { type: 'number', required: true }, r: { type: 'number', required: true },
  } },
  { type: 'object', additionalProperties: false, properties: {
    type: { type: 'string', const: 'rect', required: true }, ...sceneBase,
    x: { type: 'number', required: true }, y: { type: 'number', required: true },
    width: { type: 'number', required: true }, height: { type: 'number', required: true },
  } },
  { type: 'object', additionalProperties: false, properties: {
    type: { type: 'string', const: 'polygon', required: true }, ...sceneBase,
    points: { type: 'array', required: true, items: coordinate, description: '3 to 24 polygon vertices.' },
  } },
  { type: 'object', additionalProperties: false, properties: {
    type: { type: 'string', const: 'label', required: true }, ...sceneBase,
    x: { type: 'number', required: true }, y: { type: 'number', required: true }, text: { type: 'string', required: true },
  } },
] } as const
const sceneContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'scene_2d', required: true,
    description: 'Geometry, vectors, forces, spatial relationships, and annotated scientific schematics.',
  },
  xAxis: required(axis),
  yAxis: required(axis),
  grid: { type: 'boolean' },
  elements: { type: 'array', items: sceneElement, required: true, description: '1 to 64 scene elements.' },
} } as const

const relationSubject = { type: 'object', additionalProperties: false, properties: {
  id: { ...identifier, required: true }, label: { type: 'string', required: true },
  detail: { type: 'string' }, tone,
} } as const
const relationAxisItem = { type: 'object', additionalProperties: false, properties: {
  id: { ...identifier, required: true }, label: { type: 'string', required: true },
} } as const
const comparisonContent = { type: 'object', additionalProperties: false, properties: {
  kind: { type: 'string', const: 'relation', required: true },
  variant: { type: 'string', const: 'comparison', required: true },
  subjects: { type: 'array', items: relationSubject, required: true, description: '2 to 4 subjects.' },
  rows: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true }, detail: { type: 'string' },
      cells: { type: 'array', required: true, items: {
        type: 'object', additionalProperties: false, properties: {
          subjectId: { type: 'string', required: true }, value: { type: 'string', required: true }, tone,
        },
      }, description: '1 to 4 cells; each subjectId must reference a declared subject.' },
    },
  }, description: '1 to 16 comparison rows.' },
} } as const
const matrixContent = { type: 'object', additionalProperties: false, properties: {
  kind: { type: 'string', const: 'relation', required: true },
  variant: { type: 'string', const: 'matrix', required: true },
  rows: { type: 'array', items: relationAxisItem, required: true, description: '1 to 10 matrix rows.' },
  columns: { type: 'array', items: relationAxisItem, required: true, description: '1 to 10 matrix columns.' },
  cells: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, rowId: { type: 'string', required: true },
      columnId: { type: 'string', required: true }, label: { type: 'string', required: true },
      detail: { type: 'string' }, tone,
    },
  }, description: '1 to 64 matrix cells; rowId and columnId must reference declared axes.' },
} } as const
const setsContent = { type: 'object', additionalProperties: false, properties: {
  kind: { type: 'string', const: 'relation', required: true },
  variant: { type: 'string', const: 'sets', required: true },
  sets: { type: 'array', items: relationSubject, required: true, description: '2 to 3 sets.' },
  items: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      setIds: {
        type: 'array', items: { type: 'string' }, required: true,
        description: '1 to 3 unique ids referencing declared sets.',
      }, detail: { type: 'string' },
    },
  }, description: '1 to 24 set items.' },
} } as const
const relationContent = { oneOf: [comparisonContent, matrixContent, setsContent] } as const

const timelineEvent = { type: 'object', additionalProperties: false, properties: {
  id: { ...identifier, required: true },
  time: { type: 'string', required: true },
  label: { type: 'string', required: true },
  detail: { type: 'string' },
  position: { type: 'number', description: 'Optional normalized position from 0 to 1. Provide it for every event or omit it for every event.' },
  tone,
} } as const
const timelineContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'timeline', required: true,
    description: 'Ordered historical events, scientific discoveries, biographies, eras, or other chronology where time order is the structure.',
  },
  orientation: { type: 'string', enum: ['horizontal', 'vertical'] },
  events: { type: 'array', items: timelineEvent, required: true, description: '2 to 32 events in chronological order.' },
  eras: { type: 'array', items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      startEventId: { type: 'string', required: true }, endEventId: { type: 'string', required: true },
      detail: { type: 'string' }, tone,
    },
  }, description: 'Optional 1 to 8 eras; startEventId and endEventId must reference declared events in order.' },
} } as const

const formulaStepsContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'formula_steps', required: true,
    description: 'A derivation, algebraic transformation, proof chain, or symbolic simplification where the rule between steps matters. Not for merely recalling one formula.',
  },
  notation: { type: 'string', description: 'Optional short notation key used across the derivation.' },
  steps: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true },
      expression: {
        type: 'string',
        required: true,
        description: 'One LaTeX display expression without dollar delimiters; use commands such as \\lim_{h \\to 0} and ^{\\prime}.',
      },
      label: { type: 'string' }, rule: { type: 'string' }, detail: { type: 'string' }, tone,
    },
  }, description: '2 to 16 formula steps.' },
  conclusion: { type: 'string' },
} } as const

const studyMapContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'study_map', required: true,
    description: 'A navigable overview of a supplied document, chapter, slide deck, or multi-concept learning source. Preserve source sections and anchors instead of flattening the material.',
  },
  sourceLabel: { type: 'string', required: true },
  goal: { type: 'string' },
  sections: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      anchor: { type: 'string', description: 'Human-readable source location, such as Chapter 2 or pp. 18–23.' },
      summary: { type: 'string' },
    },
  }, description: '1 to 16 source sections.' },
  concepts: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      sectionId: { type: 'string', required: true }, detail: { type: 'string' },
      prerequisiteIds: {
        type: 'array', items: { type: 'string' },
        description: 'Optional; at most 8 unique declared concept ids, excluding this concept, with no cycles.',
      },
      role: { type: 'string', enum: ['foundation', 'core', 'extension', 'practice'] },
      tone,
    },
  }, description: '1 to 48 concepts; every sectionId must reference a declared section.' },
} } as const

const recallDeckContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'recall_deck', required: true,
    description: 'A requested flashcard or active-recall set with hidden answers, hints, and local review state. Use only after the relevant material is known.',
  },
  instructions: { type: 'string' },
  cards: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, prompt: { type: 'string', required: true },
      answer: { type: 'string', required: true }, hint: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Optional; at most 6 unique labels.' },
    },
  }, description: '2 to 32 recall cards.' },
} } as const

const tableValue = { oneOf: [
  { type: 'string' },
  { type: 'number' },
  { type: 'boolean' },
  { type: 'null' },
] } as const
const dataTableContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'data_table', required: true,
    description: 'A typed record table for inspecting real data, filtering rows, sorting values, marking outliers, or linking tabular values to a chart.',
  },
  columns: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      type: { type: 'string', enum: ['string', 'number', 'boolean', 'date'], required: true },
      unit: { type: 'string' },
    },
  }, description: '1 to 24 typed columns.' },
  rows: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, detail: { type: 'string' },
      cells: { type: 'array', required: true, items: {
        type: 'object', additionalProperties: false, properties: {
          columnId: { type: 'string', required: true }, value: { ...tableValue, required: true },
        },
      }, description: 'One cell per declared column; columnId must reference a declared column.' },
    },
  }, description: '1 to 128 records.' },
  outlierIds: { type: 'array', items: { type: 'string' }, description: 'Optional row ids to emphasize as anomalies.' },
  initialSort: { type: 'object', additionalProperties: false, properties: {
    columnId: { type: 'string', required: true }, direction: { type: 'string', enum: ['asc', 'desc'], required: true },
  } },
  initialFilter: { type: 'object', additionalProperties: false, properties: {
    columnId: { type: 'string', required: true },
    operator: { type: 'string', enum: ['equals', 'not_equals', 'contains', 'gt', 'gte', 'lt', 'lte'], required: true },
    value: { ...tableValue, required: true },
  } },
  chart: { type: 'object', additionalProperties: false, properties: {
    type: { type: 'string', enum: ['line', 'bar', 'scatter'], required: true },
    xColumnId: { type: 'string', required: true }, yColumnId: { type: 'string', required: true },
    seriesColumnId: { type: 'string' },
  } },
} } as const

const stateTransitionContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'state_transition', required: true,
    description: 'A state machine where an event triggers a transition from one explicit state to another, optionally with guard and action.',
  },
  states: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      detail: { type: 'string' }, tone, initial: { type: 'boolean' }, final: { type: 'boolean' },
    },
  }, description: '2 to 32 states; mark initial/final states when the lifecycle has them.' },
  transitions: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, from: { type: 'string', required: true }, to: { type: 'string', required: true },
      trigger: { type: 'string', required: true }, guard: { type: 'string' }, action: { type: 'string' },
      detail: { type: 'string' }, tone,
    },
  }, description: '1 to 96 transitions; from and to must reference declared states.' },
  steps: { type: 'array', items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      currentStateId: { type: 'string', required: true }, transitionId: { type: 'string' }, description: { type: 'string' },
    },
  }, description: 'Optional 2 to 16 execution steps; each names the current state and optional transition just taken.' },
} } as const

const sequenceBufferContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'sequence_buffer', required: true,
    description: 'Discrete indexed slots with moving pointers, highlighted intervals, and snapshots for array, window, parsing, or protocol algorithms.',
  },
  slots: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, index: { type: 'integer', required: true },
      value: { ...tableValue, required: true }, label: { type: 'string' }, tone,
    },
  }, description: '1 to 128 ordered slots; index values must be unique.' },
  pointers: { type: 'array', items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      index: { type: 'integer', required: true }, tone,
    },
  }, description: 'Optional 1 to 8 named pointers.' },
  ranges: { type: 'array', items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      start: { type: 'integer', required: true }, end: { type: 'integer', required: true }, tone,
    },
  }, description: 'Optional 1 to 8 inclusive index intervals.' },
  steps: { type: 'array', items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      description: { type: 'string' },
      slots: { type: 'array', items: {
        type: 'object', additionalProperties: false, properties: {
          slotId: { type: 'string', required: true }, value: { ...tableValue },
        },
      } },
      pointers: { type: 'array', items: {
        type: 'object', additionalProperties: false, properties: {
          pointerId: { type: 'string', required: true }, index: { type: 'integer', required: true },
        },
      } },
      ranges: { type: 'array', items: {
        type: 'object', additionalProperties: false, properties: {
          rangeId: { type: 'string', required: true }, start: { type: 'integer', required: true }, end: { type: 'integer', required: true },
        },
      } },
    },
  }, description: 'Optional 2 to 16 snapshots. Include only the collections that change in each snapshot.' },
} } as const

const sequenceDiagramContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'sequence_diagram', required: true,
    description: 'Ordered messages exchanged by API clients, services, protocols, cells, or collaborating roles.',
  },
  participants: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      detail: { type: 'string' }, tone,
    },
  }, description: '2 to 16 lifeline participants.' },
  messages: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, from: { type: 'string', required: true }, to: { type: 'string', required: true },
      label: { type: 'string', required: true }, type: { type: 'string', enum: ['sync', 'async', 'return', 'self'], required: true },
      detail: { type: 'string' }, tone,
    },
  }, description: '1 to 96 messages in top-to-bottom order; from and to must reference participants.' },
} } as const

const codeTraceContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'code_trace', required: true,
    description: 'Source lines paired with execution steps, current line, variable values, call stack, and output.',
  },
  language: { type: 'string', required: true },
  code: { type: 'string', required: true, description: 'Complete source text shown above or beside the trace.' },
  lines: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      number: { type: 'integer', required: true }, text: { type: 'string', required: true },
    },
  }, description: '1 to 256 numbered source lines.' },
  steps: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      currentLine: { type: 'integer', required: true },
      variables: { type: 'array', required: true, items: {
        type: 'object', additionalProperties: false, properties: {
          name: { type: 'string', required: true }, value: { ...tableValue, required: true }, type: { type: 'string' },
        },
      } },
      stack: { type: 'array', required: true, items: {
        type: 'object', additionalProperties: false, properties: {
          id: { ...identifier, required: true }, function: { type: 'string', required: true }, line: { type: 'integer' },
        },
      } },
      output: { type: 'string' }, description: { type: 'string' },
    },
  }, description: '2 to 32 execution snapshots.' },
} } as const

const fieldGrid = { type: 'object', additionalProperties: false, properties: {
  columns: { type: 'integer', required: true }, rows: { type: 'integer', required: true },
} } as const
const scalarFieldSamples = { type: 'object', additionalProperties: false, properties: {
  ...fieldGrid.properties,
  values: { type: 'array', items: { type: 'number' }, required: true, description: 'Flattened row-major values; length must equal rows * columns.' },
} } as const
const vectorFieldSamples = { type: 'object', additionalProperties: false, properties: {
  ...fieldGrid.properties,
  u: { type: 'array', items: { type: 'number' }, required: true, description: 'Flattened horizontal components; length must equal rows * columns.' },
  v: { type: 'array', items: { type: 'number' }, required: true, description: 'Flattened vertical components; length must equal rows * columns.' },
} } as const
const field2DContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'field_2d', required: true,
    description: 'A sampled or mathematically defined scalar heatmap, contour field, vector field, or gradient over two axes.',
  },
  xAxis: { ...axis, required: true, properties: { ...axis.properties, samples: { type: 'integer' } } },
  yAxis: { ...axis, required: true, properties: { ...axis.properties, samples: { type: 'integer' } } },
  scalar: { type: 'object', additionalProperties: false, properties: {
    samples: scalarFieldSamples,
    expression: { ...expression, description: 'Closed math AST using x and y variables.' },
    min: { type: 'number' }, max: { type: 'number' },
  } },
  vector: { type: 'object', additionalProperties: false, properties: {
    samples: vectorFieldSamples,
    expression: { type: 'object', additionalProperties: false, properties: {
      u: { ...requiredExpression, description: 'Horizontal component using x and y variables.' },
      v: { ...requiredExpression, description: 'Vertical component using x and y variables.' },
    } },
  } },
} } as const

const causalLoopContent = { type: 'object', additionalProperties: false, properties: {
  kind: {
    type: 'string', const: 'causal_loop', required: true,
    description: 'A causal feedback diagram with positive or negative polarity, optional delay, and named reinforcing or balancing loops.',
  },
  variables: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      detail: { type: 'string' }, tone,
    },
  }, description: '2 to 32 causal variables.' },
  links: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, from: { type: 'string', required: true }, to: { type: 'string', required: true },
      polarity: { type: 'string', enum: ['positive', 'negative'], required: true }, delay: { type: 'number' },
      label: { type: 'string' }, detail: { type: 'string' }, tone,
    },
  }, description: '1 to 96 directed links; from and to must reference variables.' },
  loops: { type: 'array', items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      type: { type: 'string', enum: ['reinforcing', 'balancing'], required: true },
      linkIds: { type: 'array', items: { type: 'string' }, required: true },
      detail: { type: 'string' }, tone,
    },
  }, description: 'Optional 1 to 12 named feedback loops; linkIds must reference declared links in cycle order.' },
} } as const

export const LEARNING_VISUAL_SEQUENCE_SCHEMA_V4 = { type: 'object', additionalProperties: false, properties: {
  initialFrameId: { type: 'string' },
  frames: { type: 'array', required: true, items: {
    type: 'object', additionalProperties: false, properties: {
      id: { ...identifier, required: true }, label: { type: 'string', required: true },
      description: { type: 'string' },
      focusIds: {
        type: 'array', items: { type: 'string' }, required: true,
        description: 'At most 64 unique ids already declared by content.',
      },
    },
  }, description: '2 to 12 sequence frames.' },
} } as const

export const LEARNING_CHECKPOINT_OPTION_SCHEMA_V1 = { type: 'object', additionalProperties: false, properties: {
  id: { ...identifier, required: true },
  label: { type: 'string', required: true },
} } as const

export const LEARNING_CHECKPOINT_RESPONSE_SCHEMA_V1 = { oneOf: [
  { type: 'object', additionalProperties: false, properties: {
    text: { type: 'string', required: true },
  } },
  { type: 'object', additionalProperties: false, properties: {
    optionId: { ...identifier, required: true },
  } },
  { type: 'object', additionalProperties: false, properties: {
    number: { type: 'number', required: true },
  } },
] } as const

export const LEARNING_CHECKPOINT_RESULT_SCHEMA_V1 = { oneOf: [
  { type: 'object', additionalProperties: false, properties: {
    protocol: { type: 'string', const: CHECKPOINT_RESULT_PROTOCOL, required: true },
    checkpointId: { type: 'string', required: true },
    status: { type: 'string', const: 'submitted', required: true },
    response: { ...LEARNING_CHECKPOINT_RESPONSE_SCHEMA_V1, required: true },
    receiptId: { type: 'string', required: true },
  } },
  { type: 'object', additionalProperties: false, properties: {
    protocol: { type: 'string', const: CHECKPOINT_RESULT_PROTOCOL, required: true },
    checkpointId: { type: 'string', required: true },
    status: { type: 'string', const: 'skipped', required: true },
    reason: {
      type: 'string',
      enum: ['learner-skipped', 'client-unavailable', 'client-response-timeout', 'host-unavailable', 'provider-failure'],
    },
    receiptId: { type: 'string', required: true },
  } },
  { type: 'object', additionalProperties: false, properties: {
    protocol: { type: 'string', const: CHECKPOINT_RESULT_PROTOCOL, required: true },
    checkpointId: { type: 'string', required: true },
    status: { type: 'string', const: 'cancelled', required: true },
    reason: {
      type: 'string',
      enum: ['learner-cancelled', 'session-aborted', 'plugin-disposed'],
    },
    receiptId: { type: 'string', required: true },
  } },
] } as const

export type LearningVisualSchemaKindV4 = typeof LEARNING_VISUAL_KINDS_V4[number]

export const LEARNING_VISUAL_CONTENT_SCHEMAS_V4 = {
  plot: plotContent,
  node_link: nodeLinkContent,
  scene_2d: sceneContent,
  relation: relationContent,
  timeline: timelineContent,
  formula_steps: formulaStepsContent,
  study_map: studyMapContent,
  recall_deck: recallDeckContent,
  data_table: dataTableContent,
  state_transition: stateTransitionContent,
  sequence_buffer: sequenceBufferContent,
  sequence_diagram: sequenceDiagramContent,
  code_trace: codeTraceContent,
  field_2d: field2DContent,
  causal_loop: causalLoopContent,
} as const satisfies Record<LearningVisualSchemaKindV4, ValueSchemaSpec>

const visualContentSchemaV4 = {
  oneOf: [
    plotContent,
    nodeLinkContent,
    sceneContent,
    relationContent,
    timelineContent,
    formulaStepsContent,
    studyMapContent,
    recallDeckContent,
    dataTableContent,
    stateTransitionContent,
    sequenceBufferContent,
    sequenceDiagramContent,
    codeTraceContent,
    field2DContent,
    causalLoopContent,
  ],
} as const satisfies ValueSchemaSpec

export const LEARNING_VISUAL_SCHEMA_V4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    protocol: { type: 'string', const: VISUAL_PROTOCOL_V4, required: true },
    title: { type: 'string', required: true },
    description: { type: 'string' },
    content: { ...visualContentSchemaV4, required: true },
    sequence: LEARNING_VISUAL_SEQUENCE_SCHEMA_V4,
    fallbackMarkdown: { type: 'string' },
  },
} as const satisfies ValueSchemaSpec

export const LEARNING_VISUAL_RESULT_SCHEMA_V4 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    protocol: { type: 'string', const: VISUAL_RESULT_PROTOCOL_V4, required: true },
    status: { type: 'string', enum: LEARNING_VISUAL_STATUSES, required: true },
  },
} as const satisfies ValueSchemaSpec

export const LEARNING_CHECKPOINT_SCHEMA_V1 = {
  type: 'object',
  additionalProperties: false,
  properties: {
    protocol: { type: 'string', const: CHECKPOINT_PROTOCOL, required: true },
    kind: { type: 'string', enum: LEARNING_CHECKPOINT_KINDS, required: true },
    prompt: { type: 'string', required: true },
    context: { type: 'string' },
    expectedEvidence: { type: 'string', enum: LEARNING_CHECKPOINT_EVIDENCE_KINDS, required: true },
    options: { type: 'array', items: LEARNING_CHECKPOINT_OPTION_SCHEMA_V1 },
    fallbackMarkdown: { type: 'string', required: true },
  },
} as const satisfies ValueSchemaSpec

export type GeneratedLearningVisualV4 = InferValue<typeof LEARNING_VISUAL_SCHEMA_V4>
export type GeneratedLearningVisualResultV4 = InferValue<typeof LEARNING_VISUAL_RESULT_SCHEMA_V4>
export type GeneratedLearningCheckpointV1 = InferValue<typeof LEARNING_CHECKPOINT_SCHEMA_V1>
export type GeneratedLearningCheckpointResultV1 = InferValue<typeof LEARNING_CHECKPOINT_RESULT_SCHEMA_V1>
export type GeneratedLearningCheckpointResponseV1 = InferValue<typeof LEARNING_CHECKPOINT_RESPONSE_SCHEMA_V1>
export type GeneratedLearningCheckpointOptionV1 = InferValue<typeof LEARNING_CHECKPOINT_OPTION_SCHEMA_V1>

const visualJsonSchemaV4 = LEARNING_VISUAL_SCHEMA_V4 as unknown as RuntimeSchema
const visualResultJsonSchemaV4 = LEARNING_VISUAL_RESULT_SCHEMA_V4 as unknown as RuntimeSchema
const checkpointJsonSchemaV1 = LEARNING_CHECKPOINT_SCHEMA_V1 as unknown as RuntimeSchema
const checkpointResultJsonSchemaV1 = LEARNING_CHECKPOINT_RESULT_SCHEMA_V1 as unknown as RuntimeSchema

/** Generated structural validator; semantic bounds and cross-references remain in protocol.ts. */
export function validateLearningVisualSchemaV4(value: unknown): string[] {
  return validateSchemaValue(visualJsonSchemaV4, value, 'visual')
}

export function validateLearningVisualResultSchemaV4(value: unknown): string[] {
  return validateSchemaValue(visualResultJsonSchemaV4, value, 'visualResult')
}

/** Generated structural validator; answer-free copy checks remain in protocol.ts. */
export function validateLearningCheckpointSchemaV1(value: unknown): string[] {
  return validateSchemaValue(checkpointJsonSchemaV1, value, 'checkpoint')
}

/** Generated structural validator for the closed checkpoint receipt union. */
export function validateLearningCheckpointResultSchemaV1(value: unknown): string[] {
  return validateSchemaValue(checkpointResultJsonSchemaV1, value, 'checkpointResult')
}

export function learningVisualParametersV4(kind: LearningVisualSchemaKindV4): ParameterSchemaSpec {
  return {
    protocol: { type: 'string', const: VISUAL_PROTOCOL_V4, required: true },
    title: {
      type: 'string',
      description: 'Concise visible and accessible visual title.',
      required: true,
    },
    description: {
      type: 'string',
      description: 'Optional one-sentence exploration hint; do not repeat surrounding prose.',
    },
    content: required(LEARNING_VISUAL_CONTENT_SCHEMAS_V4[kind]),
    sequence: LEARNING_VISUAL_SEQUENCE_SCHEMA_V4,
    fallbackMarkdown: {
      type: 'string',
      description: 'Optional concise text equivalent for accessibility or an unavailable renderer.',
    },
  }
}

export interface LearningCheckpointSchemaSelectionV1 {
  kind: typeof LEARNING_CHECKPOINT_KINDS[number]
  expectedEvidence: typeof LEARNING_CHECKPOINT_EVIDENCE_KINDS[number]
  prompt: string
}

export function learningCheckpointParametersV1(
  selection: LearningCheckpointSchemaSelectionV1,
): ParameterSchemaSpec {
  return {
    protocol: { type: 'string', const: CHECKPOINT_PROTOCOL, required: true },
    kind: { type: 'string', const: selection.kind, required: true },
    prompt: { type: 'string', const: selection.prompt, required: true },
    context: { type: 'string' },
    expectedEvidence: { type: 'string', const: selection.expectedEvidence, required: true },
    ...(selection.kind === 'single_choice'
      ? {
          options: {
            type: 'array',
            required: true,
            items: LEARNING_CHECKPOINT_OPTION_SCHEMA_V1,
            description: 'Two to eight answer-free choices. No correct-answer or rubric field exists.',
          } as const,
        }
      : {}),
    fallbackMarkdown: {
      type: 'string',
      required: true,
      description: 'Self-sufficient ordinary-conversation fallback; never include the answer.',
    },
  }
}
