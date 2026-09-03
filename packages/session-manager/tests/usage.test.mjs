/**
 * The usage folds behind both statistics surfaces.
 *
 * The two token projections cover overlapping but unequal parts of the corpus
 * — an older stored `tokenUsage` row is skipped by the host's version-matched
 * read while its `modelTokenUsage` sibling still serves, and a session
 * recorded before the per-route unit existed has only the scalar — so the
 * fallbacks between them are pinned here rather than left to the UI.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ACTIVITY_DAYS,
  DAY_MS,
  activityLevel,
  activityStreaks,
  aggregateModels,
  aggregateUsage,
  buildActivity,
  buildDailySeries,
  buildUsageModel,
  collectUsageRows,
  filterByRange,
  formatCompact,
  formatFactor,
  formatHour,
  peakHour,
  summarizeUsage,
  tokenComparison,
} from '../lib/types/client/usage.js'

/** Build a session-list snapshot from `[id, updatedAt, projectionValues]` rows. */
function listOf(...rows) {
  const byId = {}
  const ids = []
  for (const [id, updatedAt, projectionValues] of rows) {
    ids.push(id)
    byId[id] = { id, displayTitle: id, updatedAt, running: false, blank: false, projectionValues }
  }
  return { ids, byId, current: undefined, phase: 'ready' }
}

const scalar = (input, output, cacheRead = 0, cacheWrite = 0) => ({
  uncachedInputTokens: input,
  outputTokens: output,
  cacheReadTokens: cacheRead,
  cacheWriteTokens: cacheWrite,
})

const route = (provider, model, input, output) => ({
  provider,
  model,
  calls: 1,
  uncachedInputTokens: input,
  outputTokens: output,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  reasoningTokens: 0,
})

// --- collectUsageRows ---------------------------------------------------

test('a session with both projections reports the scalar buckets and the exact routes', () => {
  const rows = collectUsageRows(listOf(['a', 1, {
    tokenUsage: scalar(10, 4, 6, 2),
    modelTokenUsage: { models: [route('p', 'flash', 10, 4)] },
    sessionStats: { turns: 3, steps: 9 },
  }]))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].totalTokens, 22)
  assert.equal(rows[0].turns, 3)
  assert.equal(rows[0].steps, 9)
  assert.deepEqual(rows[0].models.map(row => [row.model, row.attributed]), [['flash', true]])
})

test('routes alone reconstruct the buckets when the scalar row is unreadable', () => {
  const rows = collectUsageRows(listOf(['a', 1, {
    modelTokenUsage: { models: [route('p', 'flash', 10, 4), route('p', 'pro', 5, 1)] },
  }]))
  assert.deepEqual(rows[0].buckets, scalar(15, 5))
  assert.equal(rows[0].totalTokens, 20)
  assert.equal(rows[0].hasUsage, true)
})

test('the scalar alone is credited to the last used model and flagged estimated', () => {
  const rows = collectUsageRows(listOf(['a', 1, {
    tokenUsage: scalar(10, 4),
    modelSelection: { lastUsed: { provider: 'p', model: 'pro' } },
  }]))
  assert.deepEqual(rows[0].models.map(row => [row.model, row.attributed]), [['pro', false]])
  assert.equal(rows[0].models[0].totalTokens, 14)
})

test('a scalar with no recorded selection still reports one unnamed route', () => {
  const rows = collectUsageRows(listOf(['a', 1, { tokenUsage: scalar(10, 4) }]))
  assert.deepEqual(rows[0].models.map(row => row.model), [''])
})

test('a session with no usage at all contributes no route', () => {
  const rows = collectUsageRows(listOf(['a', 1, { sessionStats: { turns: 1, steps: 1 } }]))
  assert.equal(rows[0].models.length, 0)
  assert.equal(rows[0].hasUsage, false)
  assert.equal(rows[0].totalTokens, 0)
})

test('a malformed route row is skipped rather than counted as an empty model', () => {
  const rows = collectUsageRows(listOf(['a', 1, {
    modelTokenUsage: { models: [{ provider: 'p' }, route('p', 'flash', 10, 4)] },
  }]))
  assert.deepEqual(rows[0].models.map(row => row.model), ['flash'])
})

// --- aggregateUsage keeps working through the new fold ------------------

test('aggregateUsage counts every session and only the ones carrying tokens as used', () => {
  const totals = summarizeUsage(aggregateUsage(listOf(
    ['a', 1, { tokenUsage: scalar(10, 4, 6, 0), sessionStats: { turns: 2, steps: 5 } }],
    ['b', 2, { modelTokenUsage: { models: [route('p', 'pro', 3, 1)] } }],
    ['c', 3, {}],
  )))
  assert.equal(totals.sessions, 3)
  assert.equal(totals.usageSessions, 2)
  assert.equal(totals.totalTokens, 24)
  assert.equal(totals.promptTokens, 19)
  assert.equal(totals.turns, 2)
  assert.equal(totals.hasStats, true)
})

// --- ranges -------------------------------------------------------------

test('a range keeps only sessions last active inside it', () => {
  const now = new Date(2026, 7, 29, 12).getTime()
  const rows = collectUsageRows(listOf(
    ['today', new Date(2026, 7, 29, 9).getTime(), { tokenUsage: scalar(1, 1) }],
    ['recent', now - 2 * DAY_MS, { tokenUsage: scalar(1, 1) }],
    ['old', now - 40 * DAY_MS, { tokenUsage: scalar(1, 1) }],
  ))
  assert.deepEqual(filterByRange(rows, 'today', now).map(row => row.id), ['today'])
  assert.deepEqual(filterByRange(rows, '7d', now).map(row => row.id), ['today', 'recent'])
  assert.deepEqual(filterByRange(rows, '30d', now).map(row => row.id), ['today', 'recent'])
})

// --- model table --------------------------------------------------------

test('routes merge across sessions and sort by total tokens', () => {
  const rows = collectUsageRows(listOf(
    ['a', 1, { modelTokenUsage: { models: [route('p', 'flash', 10, 0), route('p', 'pro', 1, 0)] } }],
    ['b', 2, { modelTokenUsage: { models: [route('p', 'flash', 5, 0)] } }],
  ))
  const models = aggregateModels(rows)
  assert.deepEqual(models.map(row => [row.model, row.totalTokens, row.calls]), [
    ['flash', 15, 2],
    ['pro', 1, 1],
  ])
})

test('a merged route stays attributed only while every contribution was', () => {
  const rows = collectUsageRows(listOf(
    ['a', 1, { modelTokenUsage: { models: [route('p', 'flash', 10, 0)] } }],
    ['b', 2, { tokenUsage: scalar(5, 0), modelSelection: { lastUsed: { provider: 'p', model: 'flash' } } }],
  ))
  const [merged] = aggregateModels(rows)
  assert.equal(merged.totalTokens, 15)
  assert.equal(merged.attributed, false)
})

// --- day buckets --------------------------------------------------------

test('a session lands on its last active local day', () => {
  const now = new Date(2026, 7, 29, 12).getTime()
  const rows = collectUsageRows(listOf([
    'a',
    new Date(2026, 7, 27, 23, 30).getTime(),
    { tokenUsage: scalar(4, 0) },
  ]))
  const cells = buildActivity(rows, 5, now)
  assert.equal(cells.length, 5)
  assert.deepEqual(cells.map(cell => cell.value), [0, 0, 4, 0, 0])
  assert.equal(cells[2].sessions, 1)
})

test('a session older than the window is dropped from the grid', () => {
  const now = new Date(2026, 7, 29, 12).getTime()
  const rows = collectUsageRows(listOf(['a', new Date(2026, 0, 1).getTime(), { tokenUsage: scalar(4, 0) }]))
  assert.deepEqual(buildActivity(rows, 3, now).map(cell => cell.value), [0, 0, 0])
})

test('daily columns split one day by route', () => {
  const now = new Date(2026, 7, 29, 12).getTime()
  const rows = collectUsageRows(listOf([
    'a',
    new Date(2026, 7, 29, 9).getTime(),
    { modelTokenUsage: { models: [route('p', 'flash', 10, 0), route('p', 'pro', 6, 0)] } },
  ]))
  const columns = buildDailySeries(rows, 2, now)
  assert.equal(columns[1].total, 16)
  assert.deepEqual([...columns[1].byModel.values()], [10, 6])
  assert.equal(columns[0].total, 0)
})

// --- derived overview numbers -------------------------------------------

test('shading spans five steps and reserves level 0 for an empty day', () => {
  assert.equal(activityLevel(0, 100), 0)
  assert.equal(activityLevel(1, 100), 1)
  assert.equal(activityLevel(50, 100), 2)
  assert.equal(activityLevel(100, 100), 4)
  assert.equal(activityLevel(5, 0), 0)
})

test('the current streak counts back from today and the longest scans the window', () => {
  const cell = value => ({ date: new Date(), value, sessions: value > 0 ? 1 : 0 })
  assert.deepEqual(
    activityStreaks([cell(1), cell(1), cell(1), cell(0), cell(2), cell(3)]),
    { current: 2, longest: 3 },
  )
  assert.deepEqual(activityStreaks([cell(1), cell(0)]), { current: 0, longest: 1 })
})

test('the peak hour is the local hour holding the most tokens', () => {
  const rows = collectUsageRows(listOf(
    ['a', new Date(2026, 7, 29, 14, 5).getTime(), { tokenUsage: scalar(100, 0) }],
    ['b', new Date(2026, 7, 28, 9, 5).getTime(), { tokenUsage: scalar(10, 0) }],
  ))
  assert.deepEqual(peakHour(rows), { hour: 14, tokens: 100 })
  assert.equal(peakHour([]), null)
})

test('a corpus with no tokens has no peak hour', () => {
  const rows = collectUsageRows(listOf(['a', 1, { sessionStats: { turns: 1 } }]))
  assert.equal(peakHour(rows), null)
})

// --- presentation helpers -----------------------------------------------

test('the comparison picks the largest reference the total still exceeds', () => {
  assert.equal(tokenComparison(0), null)
  assert.equal(tokenComparison(1_000), null)
  assert.deepEqual(tokenComparison(550_000), { id: 'mobyDick', factor: 2 })
  assert.deepEqual(tokenComparison(2_750_000), { id: 'warAndPeace', factor: 3.5 })
  assert.equal(tokenComparison(6_000_000_000).id, 'wikipedia')
})

test('compact and hour formatting stay stable for the axis and the stat tile', () => {
  assert.equal(formatCompact(0), '0')
  assert.equal(formatCompact(-5), '0')
  assert.equal(formatHour(9), '09:00')
  assert.equal(formatHour(14), '14:00')
})

test('a fractional comparison factor keeps its decimal', () => {
  assert.equal(formatFactor(2), '2')
  assert.equal(formatFactor(3.5), '3.5')
})

// --- the assembled card model -------------------------------------------

test('the card model folds one range into every figure the card shows', () => {
  const now = new Date(2026, 7, 29, 12).getTime()
  const model = buildUsageModel(listOf(
    ['a', new Date(2026, 7, 29, 10).getTime(), {
      tokenUsage: scalar(10, 4),
      modelTokenUsage: { models: [route('p', 'flash', 10, 4)] },
      sessionStats: { turns: 2, steps: 6 },
    }],
    ['b', new Date(2026, 7, 28, 10).getTime(), {
      tokenUsage: scalar(1, 1),
      modelSelection: { lastUsed: { provider: 'p', model: 'pro' } },
    }],
  ), '30d', now, ACTIVITY_DAYS, 7)

  assert.equal(model.sessions, 2)
  assert.equal(model.messages, 8)
  assert.equal(model.totalTokens, 16)
  assert.equal(model.activeDays, 2)
  assert.equal(model.currentStreak, 2)
  assert.equal(model.longestStreak, 2)
  assert.equal(model.peakHour, 10)
  assert.equal(model.favorite.model, 'flash')
  assert.equal(model.estimated, true)
  assert.equal(model.series.length, 7)
  assert.equal(model.activity.length, ACTIVITY_DAYS)
})

test('an empty corpus yields a card model with nothing to show', () => {
  const model = buildUsageModel(listOf(), 'today', Date.now())
  assert.deepEqual(model.models, [])
  assert.equal(model.totalTokens, 0)
  assert.equal(model.favorite, null)
  assert.equal(model.peakHour, null)
  assert.equal(model.comparison, null)
  assert.equal(model.estimated, false)
})
