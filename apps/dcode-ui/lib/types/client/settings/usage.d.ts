/** Shared token-usage projection helpers for both settings surfaces. */
import type { SessionListState } from '@deepseek-ai/dsh-api-session-controller/client';
export interface UsageProjection {
    readonly uncachedInputTokens?: number;
    readonly outputTokens?: number;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
}
export interface SessionStatsProjection {
    readonly turns?: number;
    readonly steps?: number;
}
export interface UsageTotals {
    readonly sessions: number;
    readonly usageSessions: number;
    readonly turns: number;
    readonly steps: number;
    readonly uncachedInputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
    readonly hasUsage: boolean;
    readonly hasStats: boolean;
}
export interface UsageSummary extends UsageTotals {
    readonly promptTokens: number;
    readonly totalTokens: number;
    readonly cacheHit: number | null;
}
export declare function formatTokenCount(value: number): string;
export declare function formatPercent(value: number): string;
/** Aggregate the durable usage and session-stats projections. */
export declare function aggregateUsage(list: SessionListState): UsageTotals;
export declare function summarizeUsage(totals: UsageTotals): UsageSummary;
/** Selectable window over the session corpus. */
export type UsageRange = 'today' | '7d' | '30d';
export declare const USAGE_RANGES: readonly UsageRange[];
/** The four disjoint provider-reported buckets, all present. */
export interface UsageBuckets {
    readonly uncachedInputTokens: number;
    readonly outputTokens: number;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
}
/** One `(provider, model)` route's share of the corpus. */
export interface ModelUsageRow extends UsageBuckets {
    readonly key: string;
    readonly provider: string;
    readonly model: string;
    readonly calls: number;
    readonly reasoningTokens: number;
    readonly totalTokens: number;
    /**
     * Whether the route came from the durable per-route projection. A row folded
     * from the session scalar and the session's last-used model is an estimate:
     * a session that switched models mid-run credits everything to one route.
     */
    readonly attributed: boolean;
}
/** One session reduced to what every card needs. */
export interface SessionUsageRow {
    readonly id: string;
    readonly updatedAt: number;
    readonly buckets: UsageBuckets;
    readonly models: readonly ModelUsageRow[];
    readonly turns: number;
    readonly steps: number;
    readonly totalTokens: number;
    readonly hasUsage: boolean;
    readonly hasStats: boolean;
}
/** One day of the activity grid. */
export interface ActivityCell {
    readonly date: Date;
    readonly value: number;
    readonly sessions: number;
}
/** One column of the stacked daily chart. */
export interface DailyColumn {
    readonly date: Date;
    readonly total: number;
    /** Per-route totals, keyed by {@link ModelUsageRow.key}. */
    readonly byModel: ReadonlyMap<string, number>;
}
export declare const DAY_MS: number;
/** Days the activity heatmap spans; a whole number of weeks keeps it square. */
export declare const ACTIVITY_WEEKS = 26;
export declare const ACTIVITY_DAYS: number;
/** The billed prompt side: uncached input plus both cache directions. */
export declare function promptTokensOf(buckets: UsageBuckets): number;
export declare function totalTokensOf(buckets: UsageBuckets): number;
export declare function modelKeyOf(provider: string, model: string): string;
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
export declare function collectUsageRows(list: SessionListState): SessionUsageRow[];
/** The inclusive lower bound of the selected range. */
export declare function rangeStart(range: UsageRange, now: number): number;
export declare function filterByRange(rows: readonly SessionUsageRow[], range: UsageRange, now: number): SessionUsageRow[];
/** Merge every session's routes into one corpus-wide table, biggest first. */
export declare function aggregateModels(rows: readonly SessionUsageRow[]): ModelUsageRow[];
export declare function startOfDay(value: Date): Date;
export declare function addDays(value: Date, days: number): Date;
/**
 * Bucket whole sessions onto their `updatedAt` day.
 *
 * The session list carries one timestamp per session, so a run spanning
 * several days lands entirely on its last active day. Every day-shaped card
 * inherits that approximation.
 */
export declare function buildActivity(rows: readonly SessionUsageRow[], days: number, now: number): ActivityCell[];
/** The same day buckets, split by route for a stacked column chart. */
export declare function buildDailySeries(rows: readonly SessionUsageRow[], days: number, now: number): DailyColumn[];
/** Five-step shading for a heatmap cell: 0 for empty, 1–4 by share of peak. */
export declare function activityLevel(value: number, peak: number): 0 | 1 | 2 | 3 | 4;
/** Consecutive active days ending today, and the longest run in the window. */
export declare function activityStreaks(cells: readonly ActivityCell[]): {
    current: number;
    longest: number;
};
export declare function activeDays(cells: readonly ActivityCell[]): number;
/** The local hour that accumulated the most tokens, or `null` with no data. */
export declare function peakHour(rows: readonly SessionUsageRow[]): {
    hour: number;
    tokens: number;
} | null;
export interface UsageComparison {
    readonly id: string;
    readonly factor: number;
}
/**
 * Pick the largest reference the total still exceeds, so the comparison grows
 * with the corpus instead of reporting an ever-larger multiple of the smallest
 * work. Returns `null` below the smallest reference, where a fraction would
 * say less than nothing at all.
 */
export declare function tokenComparison(totalTokens: number): UsageComparison | null;
/** Axis- and chip-sized token counts: `0`, `114.3K`, `14.7M`. */
export declare function formatCompact(value: number): string;
/** {@link UsageComparison.factor} as prose: `2`, `3.5`, `10,393`. */
export declare function formatFactor(value: number): string;
/** `14:00`-style label for {@link peakHour}, in the viewer's own clock. */
export declare function formatHour(hour: number): string;
/** Everything the statistics card renders, derived once per range. */
export interface UsageCardModel {
    readonly sessions: number;
    readonly models: readonly ModelUsageRow[];
    readonly activity: readonly ActivityCell[];
    readonly series: readonly DailyColumn[];
    readonly totalTokens: number;
    readonly messages: number;
    readonly activeDays: number;
    readonly currentStreak: number;
    readonly longestStreak: number;
    readonly peakHour: number | null;
    readonly favorite: ModelUsageRow | null;
    /** True when any route in the table was inferred rather than projected. */
    readonly estimated: boolean;
    readonly comparison: UsageComparison | null;
}
/**
 * Fold the session list into one card model.
 *
 * `activityDays` stays fixed across ranges so the heatmap keeps its shape,
 * while `seriesDays` follows the selected range so the column chart widens
 * and narrows with it.
 */
export declare function buildUsageModel(list: SessionListState, range: UsageRange, now: number, activityDays?: number, seriesDays?: number): UsageCardModel;
//# sourceMappingURL=usage.d.ts.map