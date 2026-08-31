/** Shared token-usage projection helpers for both settings surfaces. */

import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client'

export interface UsageProjection {
  readonly uncachedInputTokens?: number
  readonly outputTokens?: number
  readonly cacheReadTokens?: number
  readonly cacheWriteTokens?: number
}

export interface SessionStatsProjection {
  readonly turns?: number
  readonly steps?: number
}

export interface UsageTotals {
  readonly sessions: number
  readonly usageSessions: number
  readonly turns: number
  readonly steps: number
  readonly uncachedInputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
  readonly hasUsage: boolean
  readonly hasStats: boolean
}

export interface UsageSummary extends UsageTotals {
  readonly promptTokens: number
  readonly totalTokens: number
  readonly cacheHit: number | null
}

const INTEGER_FORMATTER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

export function formatTokenCount(value: number): string {
  return INTEGER_FORMATTER.format(value)
}

export function formatPercent(value: number): string {
  const percent = Math.round(value * 1_000) / 10
  return `${percent}%`
}

/** Aggregate the durable usage and session-stats projections. */
export function aggregateUsage(list: SessionListState): UsageTotals {
  let sessions = 0
  let usageSessions = 0
  let turns = 0
  let steps = 0
  let uncachedInputTokens = 0
  let outputTokens = 0
  let cacheReadTokens = 0
  let cacheWriteTokens = 0
  let hasStats = false

  for (const row of collectUsageRows(list)) {
    sessions += 1
    if (row.hasStats) {
      hasStats = true
      turns += row.turns
      steps += row.steps
    }
    if (!row.hasUsage) continue
    uncachedInputTokens += row.buckets.uncachedInputTokens
    outputTokens += row.buckets.outputTokens
    cacheReadTokens += row.buckets.cacheReadTokens
    cacheWriteTokens += row.buckets.cacheWriteTokens
    if (row.totalTokens > 0) usageSessions += 1
  }

  return {
    sessions,
    usageSessions,
    turns,
    steps,
    uncachedInputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    hasUsage: uncachedInputTokens + outputTokens + cacheReadTokens + cacheWriteTokens > 0,
    hasStats,
  }
}

export function summarizeUsage(totals: UsageTotals): UsageSummary {
  const promptTokens = totals.uncachedInputTokens
    + totals.cacheReadTokens
    + totals.cacheWriteTokens
  return {
    ...totals,
    promptTokens,
    totalTokens: promptTokens + totals.outputTokens,
    cacheHit: promptTokens === 0 ? null : totals.cacheReadTokens / promptTokens,
  }
}

// --- statistics cards ---------------------------------------------------

/** Selectable window over the session corpus. */
export type UsageRange = 'today' | '7d' | '30d'

export const USAGE_RANGES: readonly UsageRange[] = ['today', '7d', '30d']

/** The four disjoint provider-reported buckets, all present. */
export interface UsageBuckets {
  readonly uncachedInputTokens: number
  readonly outputTokens: number
  readonly cacheReadTokens: number
  readonly cacheWriteTokens: number
}

/** One `(provider, model)` route's share of the corpus. */
export interface ModelUsageRow extends UsageBuckets {
  readonly key: string
  readonly provider: string
  readonly model: string
  readonly calls: number
  readonly reasoningTokens: number
  readonly totalTokens: number
  /**
   * Whether the route came from the durable per-route projection. A row folded
   * from the session scalar and the session's last-used model is an estimate:
   * a session that switched models mid-run credits everything to one route.
   */
  readonly attributed: boolean
}

/** One session reduced to what every card needs. */
export interface SessionUsageRow {
  readonly id: string
  readonly updatedAt: number
  readonly buckets: UsageBuckets
  readonly models: readonly ModelUsageRow[]
  readonly turns: number
  readonly steps: number
  readonly totalTokens: number
  readonly hasUsage: boolean
  readonly hasStats: boolean
}

/** One day of the activity grid. */
export interface ActivityCell {
  readonly date: Date
  readonly value: number
  readonly sessions: number
}

/** One column of the stacked daily chart. */
export interface DailyColumn {
  readonly date: Date
  readonly total: number
  /** Per-route totals, keyed by {@link ModelUsageRow.key}. */
  readonly byModel: ReadonlyMap<string, number>
}

export const DAY_MS = 24 * 60 * 60 * 1_000

/** Days the activity heatmap spans; a whole number of weeks keeps it square. */
export const ACTIVITY_WEEKS = 26
export const ACTIVITY_DAYS = ACTIVITY_WEEKS * 7

const ZERO_BUCKETS: UsageBuckets = {
  uncachedInputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
}

interface ModelUsageProjectionRow {
  readonly provider?: string
  readonly model?: string
  readonly calls?: number
  readonly uncachedInputTokens?: number
  readonly outputTokens?: number
  readonly cacheReadTokens?: number
  readonly cacheWriteTokens?: number
  readonly reasoningTokens?: number
}

interface ProjectionBag {
  readonly tokenUsage?: UsageProjection
  readonly sessionStats?: SessionStatsProjection
  readonly modelTokenUsage?: { readonly models?: readonly ModelUsageProjectionRow[] }
  readonly modelSelection?: { readonly lastUsed?: { readonly provider?: string; readonly model?: string } | null }
}

function counted(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/** The billed prompt side: uncached input plus both cache directions. */
export function promptTokensOf(buckets: UsageBuckets): number {
  return buckets.uncachedInputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens
}

export function totalTokensOf(buckets: UsageBuckets): number {
  return promptTokensOf(buckets) + buckets.outputTokens
}

export function modelKeyOf(provider: string, model: string): string {
  return `${provider}\u0000${model}`
}

function addBuckets(left: UsageBuckets, right: UsageBuckets): UsageBuckets {
  return {
    uncachedInputTokens: left.uncachedInputTokens + right.uncachedInputTokens,
    outputTokens: left.outputTokens + right.outputTokens,
    cacheReadTokens: left.cacheReadTokens + right.cacheReadTokens,
    cacheWriteTokens: left.cacheWriteTokens + right.cacheWriteTokens,
  }
}

function bucketsFrom(usage: UsageProjection): UsageBuckets {
  return {
    uncachedInputTokens: counted(usage.uncachedInputTokens),
    outputTokens: counted(usage.outputTokens),
    cacheReadTokens: counted(usage.cacheReadTokens),
    cacheWriteTokens: counted(usage.cacheWriteTokens),
  }
}

function routeRowsOf(projections: ProjectionBag): ModelUsageRow[] {
  const rows = projections.modelTokenUsage?.models
  if (!Array.isArray(rows)) return []
  const collected: ModelUsageRow[] = []
  for (const raw of rows) {
    const model = typeof raw.model === 'string' ? raw.model : ''
    if (model === '') continue
    const provider = typeof raw.provider === 'string' ? raw.provider : ''
    const buckets = bucketsFrom(raw)
    collected.push({
      key: modelKeyOf(provider, model),
      provider,
      model,
      calls: counted(raw.calls),
      reasoningTokens: counted(raw.reasoningTokens),
      totalTokens: totalTokensOf(buckets),
      attributed: true,
      ...buckets,
    })
  }
  return collected
}

/**
 * Reduce the session list to one row per session.
 *
 * The two token projections cover overlapping but unequal parts of the corpus:
 * a stored `tokenUsage` row folded by an older definition is skipped by the
 * host's version-matched read while its `modelTokenUsage` sibling still
 * serves, and a session recorded before the per-route unit existed has only
 * the scalar. Each side therefore falls back to the other so one absent unit
 * cannot silently drop a session from every card:
 *
 * - buckets come from `tokenUsage`, else from summing the per-route rows;
 * - routes come from `modelTokenUsage`, else from one estimated row credited
 *   to `modelSelection.lastUsed` and flagged `attributed: false`.
 */
export function collectUsageRows(list: SessionListState): SessionUsageRow[] {
  const rows: SessionUsageRow[] = []
  for (const id of list.ids) {
    const summary = list.byId[id]
    if (summary === undefined) continue
    const projections = summary.projectionValues as ProjectionBag | undefined

    const routes = projections === undefined ? [] : routeRowsOf(projections)
    const scalar = projections?.tokenUsage
    const buckets = scalar === undefined
      ? routes.reduce<UsageBuckets>((total, route) => addBuckets(total, route), ZERO_BUCKETS)
      : bucketsFrom(scalar)
    const totalTokens = totalTokensOf(buckets)

    let models = routes
    if (models.length === 0 && totalTokens > 0) {
      const lastUsed = projections?.modelSelection?.lastUsed
      const provider = typeof lastUsed?.provider === 'string' ? lastUsed.provider : ''
      const model = typeof lastUsed?.model === 'string' ? lastUsed.model : ''
      models = [{
        key: modelKeyOf(provider, model),
        provider,
        model,
        calls: 0,
        reasoningTokens: 0,
        totalTokens,
        attributed: false,
        ...buckets,
      }]
    }

    const stats = projections?.sessionStats
    rows.push({
      id,
      updatedAt: Number.isFinite(summary.updatedAt) ? summary.updatedAt : 0,
      buckets,
      models,
      turns: counted(stats?.turns),
      steps: counted(stats?.steps),
      totalTokens,
      hasUsage: scalar !== undefined || routes.length > 0,
      hasStats: stats !== undefined,
    })
  }
  return rows
}

/** The inclusive lower bound of the selected range. */
export function rangeStart(range: UsageRange, now: number): number {
  if (range === 'today') return startOfDay(new Date(now)).getTime()
  return now - (range === '7d' ? 7 : 30) * DAY_MS
}

export function filterByRange(
  rows: readonly SessionUsageRow[],
  range: UsageRange,
  now: number,
): SessionUsageRow[] {
  const cutoff = rangeStart(range, now)
  return rows.filter(row => row.updatedAt >= cutoff)
}

/** Merge every session's routes into one corpus-wide table, biggest first. */
export function aggregateModels(rows: readonly SessionUsageRow[]): ModelUsageRow[] {
  const merged = new Map<string, ModelUsageRow>()
  for (const row of rows) {
    for (const route of row.models) {
      const current = merged.get(route.key)
      if (current === undefined) {
        merged.set(route.key, route)
        continue
      }
      const buckets = addBuckets(current, route)
      merged.set(route.key, {
        key: current.key,
        provider: current.provider,
        model: current.model,
        calls: current.calls + route.calls,
        reasoningTokens: current.reasoningTokens + route.reasoningTokens,
        totalTokens: totalTokensOf(buckets),
        attributed: current.attributed && route.attributed,
        ...buckets,
      })
    }
  }
  return [...merged.values()].sort((left, right) =>
    right.totalTokens - left.totalTokens || left.model.localeCompare(right.model))
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function addDays(value: Date, days: number): Date {
  const shifted = new Date(value.getTime())
  shifted.setDate(shifted.getDate() + days)
  return shifted
}

/** Whole days between two local midnights, tolerant of DST-shifted lengths. */
function dayIndex(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}

/**
 * Bucket whole sessions onto their `updatedAt` day.
 *
 * The session list carries one timestamp per session, so a run spanning
 * several days lands entirely on its last active day. Every day-shaped card
 * inherits that approximation.
 */
export function buildActivity(
  rows: readonly SessionUsageRow[],
  days: number,
  now: number,
): ActivityCell[] {
  const today = startOfDay(new Date(now))
  const first = addDays(today, -(days - 1))
  const cells = Array.from({ length: days }, (_, index) => ({
    date: addDays(first, index),
    value: 0,
    sessions: 0,
  }))
  for (const row of rows) {
    if (row.updatedAt <= 0) continue
    const cell = cells[dayIndex(first, startOfDay(new Date(row.updatedAt)))]
    if (cell === undefined) continue
    cell.value += row.totalTokens
    cell.sessions += 1
  }
  return cells
}

/** The same day buckets, split by route for a stacked column chart. */
export function buildDailySeries(
  rows: readonly SessionUsageRow[],
  days: number,
  now: number,
): DailyColumn[] {
  const today = startOfDay(new Date(now))
  const first = addDays(today, -(days - 1))
  const columns = Array.from({ length: days }, (_, index) => ({
    date: addDays(first, index),
    total: 0,
    byModel: new Map<string, number>(),
  }))
  for (const row of rows) {
    if (row.updatedAt <= 0) continue
    const column = columns[dayIndex(first, startOfDay(new Date(row.updatedAt)))]
    if (column === undefined) continue
    for (const route of row.models) {
      if (route.totalTokens <= 0) continue
      column.total += route.totalTokens
      column.byModel.set(route.key, (column.byModel.get(route.key) ?? 0) + route.totalTokens)
    }
  }
  return columns
}

/** Five-step shading for a heatmap cell: 0 for empty, 1–4 by share of peak. */
export function activityLevel(value: number, peak: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || peak <= 0) return 0
  return Math.max(1, Math.min(4, Math.ceil((value / peak) * 4))) as 1 | 2 | 3 | 4
}

/** Consecutive active days ending today, and the longest run in the window. */
export function activityStreaks(cells: readonly ActivityCell[]): {
  current: number
  longest: number
} {
  let current = 0
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    const cell = cells[index]
    if (cell === undefined || cell.value <= 0) break
    current += 1
  }
  let longest = 0
  let run = 0
  for (const cell of cells) {
    run = cell.value > 0 ? run + 1 : 0
    if (run > longest) longest = run
  }
  return { current, longest }
}

export function activeDays(cells: readonly ActivityCell[]): number {
  return cells.reduce((count, cell) => cell.value > 0 ? count + 1 : count, 0)
}

/** The local hour that accumulated the most tokens, or `null` with no data. */
export function peakHour(rows: readonly SessionUsageRow[]): { hour: number; tokens: number } | null {
  const hours = new Array<number>(24).fill(0)
  let seen = false
  for (const row of rows) {
    if (row.updatedAt <= 0 || row.totalTokens <= 0) continue
    hours[new Date(row.updatedAt).getHours()] += row.totalTokens
    seen = true
  }
  if (!seen) return null
  let hour = 0
  for (let index = 1; index < hours.length; index += 1) {
    if (hours[index] > hours[hour]) hour = index
  }
  return { hour, tokens: hours[hour] }
}

/**
 * A prose reference the total can be compared against, in tokens.
 *
 * Word counts of long public-domain works at roughly 4/3 tokens per word. The
 * figures are deliberately round: the line is a sense of scale, not a
 * measurement.
 */
const COMPARISONS: readonly { readonly id: string; readonly tokens: number }[] = [
  { id: 'mobyDick', tokens: 275_000 },
  { id: 'warAndPeace', tokens: 780_000 },
  { id: 'wikipedia', tokens: 3_000_000_000 },
]

export interface UsageComparison {
  readonly id: string
  readonly factor: number
}

/**
 * Pick the largest reference the total still exceeds, so the comparison grows
 * with the corpus instead of reporting an ever-larger multiple of the smallest
 * work. Returns `null` below the smallest reference, where a fraction would
 * say less than nothing at all.
 */
export function tokenComparison(totalTokens: number): UsageComparison | null {
  if (totalTokens <= 0) return null
  let chosen = COMPARISONS[0]
  for (const candidate of COMPARISONS) {
    if (totalTokens >= candidate.tokens && candidate.tokens > chosen.tokens) chosen = candidate
  }
  const factor = totalTokens / chosen.tokens
  if (factor < 1) return null
  return { id: chosen.id, factor: factor >= 10 ? Math.round(factor) : Math.round(factor * 10) / 10 }
}

const COMPACT_FORMATTER = new Intl.NumberFormat(undefined, {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Axis- and chip-sized token counts: `0`, `114.3K`, `14.7M`. */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0'
  return COMPACT_FORMATTER.format(Math.round(value))
}

const FACTOR_FORMATTER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

/** {@link UsageComparison.factor} as prose: `2`, `3.5`, `10,393`. */
export function formatFactor(value: number): string {
  return FACTOR_FORMATTER.format(value)
}

/** `14:00`-style label for {@link peakHour}, in the viewer's own clock. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

/** Everything the statistics card renders, derived once per range. */
export interface UsageCardModel {
  readonly sessions: number
  readonly models: readonly ModelUsageRow[]
  readonly activity: readonly ActivityCell[]
  readonly series: readonly DailyColumn[]
  readonly totalTokens: number
  readonly messages: number
  readonly activeDays: number
  readonly currentStreak: number
  readonly longestStreak: number
  readonly peakHour: number | null
  readonly favorite: ModelUsageRow | null
  /** True when any route in the table was inferred rather than projected. */
  readonly estimated: boolean
  readonly comparison: UsageComparison | null
}

/**
 * Fold the session list into one card model.
 *
 * `activityDays` stays fixed across ranges so the heatmap keeps its shape,
 * while `seriesDays` follows the selected range so the column chart widens
 * and narrows with it.
 */
export function buildUsageModel(
  list: SessionListState,
  range: UsageRange,
  now: number,
  activityDays: number = ACTIVITY_DAYS,
  seriesDays: number = ACTIVITY_DAYS,
): UsageCardModel {
  const rows = filterByRange(collectUsageRows(list), range, now)
  const models = aggregateModels(rows)
  const activity = buildActivity(rows, activityDays, now)
  const streaks = activityStreaks(activity)
  const totalTokens = models.reduce((total, row) => total + row.totalTokens, 0)
  const peak = peakHour(rows)
  return {
    sessions: rows.length,
    models,
    activity,
    series: buildDailySeries(rows, seriesDays, now),
    totalTokens,
    messages: rows.reduce((total, row) => total + row.turns + row.steps, 0),
    activeDays: activeDays(activity),
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    peakHour: peak === null ? null : peak.hour,
    favorite: models[0] ?? null,
    estimated: models.some(row => !row.attributed),
    comparison: tokenComparison(totalTokens),
  }
}
