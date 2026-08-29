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
//# sourceMappingURL=usage.d.ts.map