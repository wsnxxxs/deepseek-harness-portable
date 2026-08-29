/** Shared token-usage projection helpers for both settings surfaces. */
const INTEGER_FORMATTER = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
export function formatTokenCount(value) {
    return INTEGER_FORMATTER.format(value);
}
export function formatPercent(value) {
    const percent = Math.round(value * 1_000) / 10;
    return `${percent}%`;
}
/** Aggregate the durable usage and session-stats projections. */
export function aggregateUsage(list) {
    let sessions = 0;
    let usageSessions = 0;
    let turns = 0;
    let steps = 0;
    let uncachedInputTokens = 0;
    let outputTokens = 0;
    let cacheReadTokens = 0;
    let cacheWriteTokens = 0;
    let hasStats = false;
    for (const id of list.ids) {
        const row = list.byId[id];
        if (row === undefined)
            continue;
        sessions += 1;
        const projections = row.projectionValues;
        const stats = projections?.sessionStats;
        if (stats !== undefined) {
            hasStats = true;
            turns += stats.turns ?? 0;
            steps += stats.steps ?? 0;
        }
        const usage = projections?.tokenUsage;
        if (usage === undefined)
            continue;
        uncachedInputTokens += usage.uncachedInputTokens ?? 0;
        outputTokens += usage.outputTokens ?? 0;
        cacheReadTokens += usage.cacheReadTokens ?? 0;
        cacheWriteTokens += usage.cacheWriteTokens ?? 0;
        if ((usage.uncachedInputTokens ?? 0)
            + (usage.outputTokens ?? 0)
            + (usage.cacheReadTokens ?? 0)
            + (usage.cacheWriteTokens ?? 0) > 0) {
            usageSessions += 1;
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
    };
}
export function summarizeUsage(totals) {
    const promptTokens = totals.uncachedInputTokens
        + totals.cacheReadTokens
        + totals.cacheWriteTokens;
    return {
        ...totals,
        promptTokens,
        totalTokens: promptTokens + totals.outputTokens,
        cacheHit: promptTokens === 0 ? null : totals.cacheReadTokens / promptTokens,
    };
}
//# sourceMappingURL=usage.js.map