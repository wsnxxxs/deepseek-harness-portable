// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { LearningVisualV4 } from '../src/client/visuals/index.tsx'
import {
  CONTEXT_STATES,
  MINIMUM_LEGIBLE_STRENGTH,
  VISUAL_STATE_STRENGTH,
  stateStrength,
  visualFocus,
  type VisualState,
} from '../src/client/visuals/state/visual-state.ts'
import { graphEmphasis } from '../src/client/visuals/state/graph-state.ts'
import { colormapAt } from '../src/client/visuals/core/colormap.ts'
import { graphLayout, nodeBox } from '../src/client/visuals/layout/graph-layout.ts'
import { measureText, wrapLabel } from '../src/client/visuals/layout/text-metrics.ts'
import { parseLearningVisualV4, type LearningVisualV4 as VisualDefinition } from '../src/protocol.ts'
import { DECISION_TREE_VISUAL } from './visual-corpus.ts'

import { createElement } from 'react'
import { polygonLabelAnchor } from '../src/client/visuals/layout/scene-labels.ts'
import { timelineEventLayout } from '../src/client/visuals/renderers/TimelineRenderer.tsx'
import { visualV4Catalog } from './fixtures.ts'

afterEach(cleanup)

const DECISION_TREE = DECISION_TREE_VISUAL as unknown as VisualDefinition

describe('the emphasis model keeps every meaning-carrying state legible', () => {
  it('never draws a state that still carries meaning below the legible floor', () => {
    for (const state of CONTEXT_STATES) {
      expect(stateStrength(state), `${state} is drawn too weakly to read`)
        .toBeGreaterThanOrEqual(MINIMUM_LEGIBLE_STRENGTH)
    }
    // Only genuinely non-operable content may drop below it.
    expect(VISUAL_STATE_STRENGTH.disabled).toBeLessThan(MINIMUM_LEGIBLE_STRENGTH)
  })

  it('raises the current element without flattening the rest of the figure', () => {
    expect(VISUAL_STATE_STRENGTH.current).toBe(1)
    expect(VISUAL_STATE_STRENGTH.overview).toBe(1)
    // The gap between "this step" and "the rest" must be visible but not a cliff.
    const gap = VISUAL_STATE_STRENGTH.current - VISUAL_STATE_STRENGTH.context
    expect(gap).toBeGreaterThan(0.2)
    expect(gap).toBeLessThan(0.5)
  })
})

describe('a decision tree stays readable on its first frame', () => {
  const content = DECISION_TREE.content as Extract<VisualDefinition['content'], { kind: 'node_link' }>

  it('keeps the path back to the root visible when a leaf is the subject', () => {
    const emphasis = graphEmphasis(content, visualFocus(['hot', 'swim'], ['weather', 'sunny', 'temperature']))
    expect(emphasis.state('swim')).toBe('current')
    // Ancestors and the edges that reach them: without these the highlighted
    // leaf is a floating word.
    expect(emphasis.state('temperature')).toBe('related')
    expect(emphasis.state('sunny')).toBe('related')
    expect(emphasis.state('weather')).toBe('related')
  })

  it('never emits a de-emphasised state into the DOM below the floor', () => {
    const { container } = render(<LearningVisualV4 visual={parseLearningVisualV4(DECISION_TREE)} />)
    const marks = [...container.querySelectorAll<HTMLElement>('[data-visual-id][data-visual-state]')]
    expect(marks.length).toBeGreaterThanOrEqual(content.nodes.length + content.edges.length)
    for (const mark of marks) {
      const state = mark.getAttribute('data-visual-state') as VisualState
      expect(stateStrength(state), `${mark.getAttribute('data-visual-id') ?? '?'} rendered as ${state}`)
        .toBeGreaterThanOrEqual(MINIMUM_LEGIBLE_STRENGTH)
    }
  })
})

describe('graph geometry follows the content instead of a fixed canvas', () => {
  const content = DECISION_TREE.content as Extract<VisualDefinition['content'], { kind: 'node_link' }>

  it('gives a five-node tree a canvas proportional to what it draws', () => {
    const layout = graphLayout(content, 720)
    const boxes = [...layout.nodes.values()]
    const left = Math.min(...boxes.map(box => box.x - box.width / 2))
    const right = Math.max(...boxes.map(box => box.x + box.width / 2))
    const top = Math.min(...boxes.map(box => box.y - box.height / 2))
    const bottom = Math.max(...boxes.map(box => box.y + box.height / 2))

    // The old fixed 560×390 frame put five small circles in the middle of a
    // large empty rectangle. The drawn content must now reach the edges of the
    // canvas it asks for, in both directions.
    expect((right - left) / layout.width).toBeGreaterThan(0.9)
    expect((bottom - top) / layout.height).toBeGreaterThan(0.6)
    // Three layers of single-line boxes do not need a 390px-tall frame.
    expect(layout.height).toBeLessThanOrEqual(240)
  })

  it('uses the width it is given rather than overflowing or floating in it', () => {
    // A compact tree is centred rather than stretched edge to edge on a very
    // wide surface — stretching it would only lengthen the edges — but it must
    // still occupy the majority of the column instead of sitting in one corner.
    for (const containerWidth of [360, 980]) {
      const layout = graphLayout(content, containerWidth)
      expect(layout.renderWidth, `overflowed at ${String(containerWidth)}px`).toBeLessThanOrEqual(containerWidth + 1)
      expect(layout.renderWidth, `left dead space at ${String(containerWidth)}px`)
        .toBeGreaterThan(containerWidth * 0.5)
      // Fitting must never shrink the labels out of readability.
      expect(layout.scale).toBeGreaterThanOrEqual(0.82)
    }
  })

  it('sizes a node box around its label, including Chinese text', () => {
    for (const node of content.nodes) {
      const box = nodeBox(node)
      expect(box.width, `${node.label} does not fit its box`)
        .toBeGreaterThanOrEqual(measureText(node.label, 13) + 24)
      expect(box.lines.join('')).toBe(node.label)
    }
  })

  it('wraps a long label instead of overflowing or clipping it', () => {
    const wrapped = wrapLabel('周末天气晴朗且温度较高时的推荐活动', { fontSize: 13, maxWidth: 124 })
    expect(wrapped.lines.length).toBeGreaterThan(1)
    for (const line of wrapped.lines) expect(measureText(line, 13)).toBeLessThanOrEqual(124 + 13)
    const box = nodeBox({ id: 'long', label: '周末天气晴朗且温度较高时的推荐活动' } as never)
    expect(box.height).toBeGreaterThan(36)
  })

  it('scrolls a large graph rather than shrinking its text past reading size', () => {
    const columns = 6
    const perColumn = 5
    const wide = {
      kind: 'node_link',
      layout: 'layered',
      groups: Array.from({ length: columns }, (_, index) => ({ id: `g${String(index)}`, label: `阶段 ${String(index + 1)}` })),
      nodes: Array.from({ length: columns * perColumn }, (_, index) => ({
        id: `n${String(index)}`,
        label: `处理节点 ${String(index)}`,
        group: `g${String(Math.floor(index / perColumn))}`,
      })),
      edges: Array.from({ length: (columns - 1) * perColumn }, (_, index) => ({
        id: `e${String(index)}`,
        from: `n${String(index)}`,
        to: `n${String(index + perColumn)}`,
      })),
    } as unknown as typeof content
    const layout = graphLayout(wide, 640)
    // Fit-to-width stops at the readability floor and the viewport scrolls the
    // rest, rather than shrinking 13px labels into illegibility.
    expect(layout.scale).toBe(0.82)
    expect(layout.width).toBeGreaterThan(640)
    expect(layout.showHeaders).toBe(true)
  })
})

function lightness(hex: string): number {
  const channels = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255)
  const [red, green, blue] = channels.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  const luminance = 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0)
  return luminance <= 216 / 24389 ? (luminance * 24389) / 27 : Math.cbrt(luminance) * 116 - 16
}

describe('scalar field contrast', () => {
  it('reads a scalar field through a scale whose lightness only increases', () => {
    // The previous scale swept hue and held lightness flat, so its maximum and
    // a low value came out the same weight.
    const samples = Array.from({ length: 24 }, (_, index) => colormapAt(index / 23))
    const levels = samples.map(colour => {
      const [red, green, blue] = colour.match(/\d+/g)?.map(Number) ?? [0, 0, 0]
      return lightness(`#${[red, green, blue].map(v => (v ?? 0).toString(16).padStart(2, '0')).join('')}`)
    })
    for (let index = 1; index < levels.length; index += 1) {
      expect(levels[index], `the scale reverses at ${String(index)}`).toBeGreaterThan(levels[index - 1] ?? 0)
    }
    expect((levels.at(-1) ?? 0) - (levels[0] ?? 0), 'the scale has too little range to read').toBeGreaterThan(60)
  })
})

describe('dense graph and collision-aware visual layout', () => {
  it('gives every dense edge a hover/focus tooltip while keeping click details', () => {
    const visual = parseLearningVisualV4(visualV4Catalog.fullyConnectedNetwork)
    const { container } = render(createElement(LearningVisualV4, { visual }))
    const edges = visual.content.kind === 'node_link' ? visual.content.edges : []
    expect(edges.length).toBeGreaterThan(12)
    expect(container.querySelector('svg[data-dense-edges]')).toBeTruthy()
    expect(container.querySelectorAll('[role="tooltip"]').length).toBe(edges.length)
    expect(container.querySelectorAll('g[class*="edgeGroup"] title').length).toBe(edges.length)
  })

  it('spreads events with coincident normalized positions without overlap', () => {
    const layout = timelineEventLayout({
      kind: 'timeline',
      events: [
        { id: 'a', time: '1', label: 'A', position: 0.5 },
        { id: 'b', time: '2', label: 'B', position: 0.5 },
        { id: 'c', time: '3', label: 'C', position: 0.5 },
      ],
    }, 680)
    expect(layout.positions[1]! - layout.positions[0]!).toBeGreaterThanOrEqual(140)
    expect(layout.positions[2]! - layout.positions[1]!).toBeGreaterThanOrEqual(140)
    expect(layout.positions[0]).toBeGreaterThanOrEqual(66)
    expect(layout.positions[2]).toBeLessThanOrEqual(layout.width - 66)
  })

  it('moves a polygon label above a shape when the lower space is occupied', () => {
    const anchor = polygonLabelAnchor(
      [{ x: 120, y: 120 }, { x: 180, y: 120 }, { x: 150, y: 160 }],
      'polygon',
      [{ x1: 100, y1: 168, x2: 200, y2: 220 }],
      { left: 20, right: 300, top: 20, bottom: 260 },
    )
    expect(anchor.y).toBeLessThan(120)
  })
})
