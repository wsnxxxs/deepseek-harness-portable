// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { LearningVisualV4 } from '../src/client/visuals/index.tsx'
import { parseLearningVisualV4 } from '../src/protocol.ts'
import { polygonLabelAnchor } from '../src/client/visuals/layout/scene-labels.ts'
import {
  timelineEraTop,
  timelineEventLayout,
} from '../src/client/visuals/renderers/TimelineRenderer.tsx'
import { visualV4Catalog } from './fixtures.ts'

afterEach(cleanup)

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

  it('keeps all eight supported eras on distinct lanes', () => {
    const tops = Array.from({ length: 8 }, (_, index) => timelineEraTop(index))
    expect(new Set(tops).size).toBe(8)
    expect(tops.at(-1)! - tops[0]!).toBe(7 * 28)
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
