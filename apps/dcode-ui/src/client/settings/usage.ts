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

  for (const id of list.ids) {
    const row = list.byId[id]
    if (row === undefined) continue
    sessions += 1
    const projections = row.projectionValues as {
      tokenUsage?: UsageProjection
      sessionStats?: SessionStatsProjection
    } | undefined
    const stats = projections?.sessionStats
    if (stats !== undefined) {
      hasStats = true
      turns += stats.turns ?? 0
      steps += stats.steps ?? 0
    }
    const usage = projections?.tokenUsage
    if (usage === undefined) continue
    uncachedInputTokens += usage.uncachedInputTokens ?? 0
    outputTokens += usage.outputTokens ?? 0
    cacheReadTokens += usage.cacheReadTokens ?? 0
    cacheWriteTokens += usage.cacheWriteTokens ?? 0
    if ((usage.uncachedInputTokens ?? 0)
      + (usage.outputTokens ?? 0)
      + (usage.cacheReadTokens ?? 0)
      + (usage.cacheWriteTokens ?? 0) > 0) {
      usageSessions += 1
    }
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
