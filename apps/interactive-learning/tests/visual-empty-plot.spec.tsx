// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { LearningToolView } from '../src/client/LearningToolView.tsx'
import { en } from '../src/client/locales.ts'
import { VISUAL_RESULT_PROTOCOL_V4, parseLearningVisualV4 } from '../src/protocol.ts'

const t = ((key: keyof typeof en, params?: Record<string, string | number>) => {
  let value: string = en[key]
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replace(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<'interactive-learning'>

const ToolView = LearningToolView as unknown as ComponentType<Record<string, unknown>>

const noPendingInteraction = (
  selector: (snapshot: { get(id: string): unknown }) => unknown,
): unknown => selector({ get: () => undefined })

function completedBlock(visual: unknown, callId: string) {
  return {
    kind: 'tool-result',
    seq: 3,
    time: 3_000,
    callId,
    call: { name: 'learning_visual', argsRaw: JSON.stringify(visual) },
    callTime: 2_000,
    content: [{ type: 'text', text: JSON.stringify({ protocol: VISUAL_RESULT_PROTOCOL_V4, status: 'ready' }) }],
    isError: false,
  }
}

afterEach(cleanup)

/**
 * A curve can satisfy the closed schema and still sample to nothing visible:
 * `log` or `sqrt` over a negative domain produces no finite value, and a curve
 * whose outputs sit outside the declared y range is drawn entirely outside the
 * clip. Both used to leave an empty frame with no explanation, which reads as
 * a broken chart rather than as a chart with nothing in it.
 */
describe('a plot with nothing inside its axes says so', () => {
  const plot = (id: string, expression: string, xAxis: unknown, yAxis: unknown) => ({
    protocol: 'dsh-learning/visual@4',
    title: id,
    content: { kind: 'plot', xAxis, yAxis, series: [{ type: 'curve', id: 'probe', label: 'Probe', expression }] },
  })
  const cases = {
    logOfNegatives: plot('log', 'log(x)', { label: 'x', min: -3, max: -1, samples: 32 }, { label: 'y', min: -2, max: 2 }),
    entirelyOffAxis: plot('off', 'x + 1000', { label: 'x', min: 0, max: 1, samples: 32 }, { label: 'y', min: 0, max: 1 }),
  }

  it.each(Object.entries(cases))('explains the empty result for %s', (name, visual) => {
    expect(() => parseLearningVisualV4(visual)).not.toThrow()
    const { container } = render(<ToolView block={completedBlock(visual, `empty_${name}`)} inspect={() => {}} t={t} sessionId="corpus" useSessionPendingInteraction={noPendingInteraction} />)

    // Still a real chart, not a text fallback.
    expect(container.querySelector('[data-learning-visual="plot"]')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
    // ...but the blank area is named rather than left to look broken.
    expect(container.textContent).toContain(en.visualNoValuesInRange)
    expect(container.querySelector('[data-empty]')).not.toBeNull()
    // The accessible description carries the same fact.
    expect(container.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toContain(en.visualNoValuesInRange)
  })

  it('stays silent when the series does have values in range', () => {
    const healthy = plot('ok', 'x', { label: 'x', min: 0, max: 4, samples: 32 }, { label: 'y', min: 0, max: 4 })
    expect(() => parseLearningVisualV4(healthy)).not.toThrow()
    const { container } = render(<ToolView block={completedBlock(healthy, 'empty_none')} inspect={() => {}} t={t} sessionId="corpus" useSessionPendingInteraction={noPendingInteraction} />)
    // Guard against passing merely because the payload never rendered.
    expect(container.querySelector('[data-learning-visual="plot"]')).not.toBeNull()
    expect(container.textContent).not.toContain(en.visualNoValuesInRange)
    expect(container.querySelector('[data-empty]')).toBeNull()
  })

  it('marks only the empty series when another one is fine', () => {
    const mixed = {
      protocol: 'dsh-learning/visual@4',
      title: 'One good series, one empty',
      content: {
        kind: 'plot',
        xAxis: { label: 'x', min: 0, max: 4, samples: 32 },
        yAxis: { label: 'y', min: 0, max: 4 },
        series: [
          { type: 'curve', id: 'good', label: 'Good', expression: 'x' },
          { type: 'curve', id: 'gone', label: 'Gone', expression: 'x + 500' },
        ],
      },
    }
    expect(() => parseLearningVisualV4(mixed)).not.toThrow()
    const { container } = render(<ToolView block={completedBlock(mixed, 'empty_mixed')} inspect={() => {}} t={t} sessionId="corpus" useSessionPendingInteraction={noPendingInteraction} />)

    // The chart is not blank overall, so no whole-chart notice.
    expect(container.textContent).not.toContain(en.visualNoValuesInRange)
    const flagged = [...container.querySelectorAll('[data-empty]')]
    expect(flagged).toHaveLength(1)
    expect(flagged[0]?.textContent).toContain('Gone')
  })
})
