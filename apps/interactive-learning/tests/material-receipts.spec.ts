import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  assertMaterialAnchorsReadable,
  beginMaterialTurn,
  materialStructureMapped,
  recordMaterialReceipt,
} from '../src/material-receipts.ts'

function fakeAgent(): Agent {
  return { session: {} } as unknown as Agent
}

describe('current-turn material receipts', () => {
  it('requires content evidence before recording a source anchor', () => {
    const agent = fakeAgent()
    beginMaterialTurn(agent, 3)

    recordMaterialReceipt(agent, { kind: 'structure', sourceId: 'guide' })
    expect(materialStructureMapped(agent, 'guide')).toBe(true)
    expect(() => assertMaterialAnchorsReadable(agent, ['guide#第1节'])).toThrow('material read receipt')

    recordMaterialReceipt(agent, {
      kind: 'content',
      sourceId: 'guide',
      sectionId: 'section-1',
      anchor: 'guide#第1节',
      text: 'actual source words',
    })
    expect(() => assertMaterialAnchorsReadable(agent, ['guide#第1节'])).not.toThrow()
  })

  it('does not treat a search locator as content evidence', () => {
    const agent = fakeAgent()
    beginMaterialTurn(agent, 4)
    recordMaterialReceipt(agent, {
      kind: 'locator',
      sourceId: 'guide',
      sectionId: 'section-1',
      anchor: 'guide#第1节',
    })

    expect(() => assertMaterialAnchorsReadable(agent, ['guide#第1节'])).toThrow('material read receipt')
  })
})
