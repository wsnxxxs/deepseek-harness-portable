import assert from 'node:assert/strict'
import { test } from 'node:test'

/** Helper to compute effective effort matching ModelSelect logic */
function computeEffectiveEffort(selection, reasoning) {
  if (reasoning === undefined) return undefined
  return selection?.reasoningEffort ?? reasoning?.defaultEffort
}

/** Helper to compute effort label matching ModelSelect logic */
function computeEffortLabel(reasoning, effectiveEffort, defaultLabel = 'Default') {
  if (reasoning === undefined) return undefined
  if (effectiveEffort === undefined) return defaultLabel
  return reasoning.efforts.find(level => level.id === effectiveEffort)?.name ?? effectiveEffort
}

/** Helper to compute trigger label matching ModelSelect logic */
function computeTriggerLabel(modelLabel, effortLabel) {
  return effortLabel === undefined ? modelLabel : `${modelLabel} · ${effortLabel}`
}

test('model reasoning effective effort resolution prefers session projection over default', () => {
  const reasoning = {
    defaultEffort: 'high',
    efforts: [
      { id: 'off', name: 'Off' },
      { id: 'low', name: 'Low' },
      { id: 'high', name: 'High' },
      { id: 'max', name: 'Max' },
    ],
  }

  // With explicit selection
  const withSelection = { provider: 'deepseek', model: 'deepseek-chat', reasoningEffort: 'low' }
  assert.equal(computeEffectiveEffort(withSelection, reasoning), 'low')
  assert.equal(computeEffortLabel(reasoning, computeEffectiveEffort(withSelection, reasoning)), 'Low')

  // Without explicit selection, falls back to default
  const noEffortSelection = { provider: 'deepseek', model: 'deepseek-chat' }
  assert.equal(computeEffectiveEffort(noEffortSelection, reasoning), 'high')
  assert.equal(computeEffortLabel(reasoning, computeEffectiveEffort(noEffortSelection, reasoning)), 'High')

  // When model has no reasoning capability
  assert.equal(computeEffectiveEffort(withSelection, undefined), undefined)
  assert.equal(computeEffortLabel(undefined, undefined), undefined)
})

test('trigger title formats model and effort in standard dual-segment string', () => {
  assert.equal(computeTriggerLabel('DeepSeek-V4-Flash', 'High'), 'DeepSeek-V4-Flash · High')
  assert.equal(computeTriggerLabel('DeepSeek-V4-Flash', undefined), 'DeepSeek-V4-Flash')
})

test('escape key navigation backs out of subpane to root before closing', () => {
  let pane = 'effort'
  let open = true

  const handleEscape = () => {
    if (!open) return
    if (pane !== 'root') {
      pane = 'root'
    } else {
      open = false
    }
  }

  // First escape returns to root
  handleEscape()
  assert.equal(pane, 'root')
  assert.equal(open, true)

  // Second escape closes menu
  handleEscape()
  assert.equal(open, false)
})
