import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment, useMemo } from 'react';
import { useChatSnapshot, useProjectionValue } from "../state/hooks.js";
import { useT } from "../state/i18n.js";
import css from './SessionStatsLine.module.css';
const EMPTY_NODES = [];
function nonNegative(value) {
    return value === undefined ? 0 : Math.max(0, value);
}
function outputTokensOf(usage) {
    if (typeof usage !== 'object' || usage === null)
        return null;
    const value = usage.outputTokens;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
/** Window fallback for hosts that do not expose the durable sessionStats row. */
function deriveStats(nodes) {
    const turns = new Set();
    let steps = 0;
    let llmMs = 0;
    let toolMs = 0;
    let ttftMs = 0;
    let ttftSteps = 0;
    let decodeMs = 0;
    let decodeTokens = 0;
    for (const node of nodes) {
        if (node.kind === 'tool-result') {
            if (typeof node.callTime === 'number')
                toolMs += Math.max(0, node.time - node.callTime);
            continue;
        }
        if (node.kind !== 'assistant')
            continue;
        turns.add(node.turn);
        steps += 1;
        if (node.timing !== undefined && node.timing.stepStartTime !== null) {
            llmMs += Math.max(0, node.timing.completedTime - node.timing.stepStartTime);
        }
        const ttft = node.timing !== undefined
            && node.timing.stepStartTime !== null
            && node.timing.firstTokenTime !== null
            ? Math.max(0, node.timing.firstTokenTime - node.timing.stepStartTime)
            : null;
        if (ttft !== null) {
            ttftMs += ttft;
            ttftSteps += 1;
        }
        const decode = node.timing !== undefined && node.timing.firstTokenTime !== null
            ? Math.max(0, node.timing.completedTime - node.timing.firstTokenTime)
            : null;
        const outputTokens = outputTokensOf(node.usage);
        if (decode !== null && outputTokens !== null) {
            decodeMs += decode;
            decodeTokens += outputTokens;
        }
    }
    return { turns: turns.size, steps, llmMs, toolMs, ttftMs, ttftSteps, decodeMs, decodeTokens };
}
function formatTokens(value) {
    const scaled = (candidate) => candidate >= 100
        ? String(Math.round(candidate))
        : String(Math.round(candidate * 10) / 10);
    if (value < 1_000)
        return String(Math.round(value));
    if (value < 1_000_000)
        return `${scaled(value / 1_000)}K`;
    return `${scaled(value / 1_000_000)}M`;
}
function formatDuration(ms, t) {
    const seconds = ms / 1_000;
    if (seconds < 60)
        return t('duration.compactSeconds', { seconds: Math.round(seconds * 10) / 10 });
    const whole = Math.round(seconds);
    return t('duration.compactMinutes', {
        minutes: Math.floor(whole / 60),
        seconds: whole % 60,
    });
}
function formatTokensPerSecond(tokensPerSecond) {
    const value = Math.max(0, tokensPerSecond);
    return value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
}
function billedInputTokens(usage) {
    return nonNegative(usage.uncachedInputTokens)
        + nonNegative(usage.cacheReadTokens)
        + nonNegative(usage.cacheWriteTokens);
}
function cacheHitPercent(usage) {
    const input = billedInputTokens(usage);
    if (input === 0)
        return null;
    if (nonNegative(usage.cacheReadTokens) >= input)
        return '100';
    const percent = nonNegative(usage.cacheReadTokens) / input * 100;
    const rounded = Math.round(percent);
    return rounded < 100 ? String(rounded) : String(Math.floor(percent * 10) / 10);
}
function projectedStats(value, fallback) {
    if (value === undefined)
        return fallback;
    return {
        turns: nonNegative(value.turns),
        steps: nonNegative(value.steps),
        llmMs: nonNegative(value.llmMs),
        toolMs: nonNegative(value.toolMs),
        ttftMs: nonNegative(value.ttftMs),
        ttftSteps: nonNegative(value.ttftSteps),
        decodeMs: nonNegative(value.decodeMs),
        decodeTokens: nonNegative(value.decodeTokens),
    };
}
/** Session-level timing and token totals, kept visually quiet beneath the composer. */
export function SessionStatsLine({ sessionId }) {
    const t = useT();
    const chat = useChatSnapshot(sessionId);
    const usage = useProjectionValue(sessionId, 'tokenUsage');
    const projected = useProjectionValue(sessionId, 'sessionStats');
    const nodes = chat?.legacy.nodes ?? EMPTY_NODES;
    const fallback = useMemo(() => deriveStats(nodes), [nodes]);
    const stats = useMemo(() => projectedStats(projected, fallback), [fallback, projected]);
    const groups = [];
    if (stats.steps > 0) {
        groups.push(t('stats.counts', { turns: stats.turns, steps: stats.steps }));
        const durations = [];
        if (stats.llmMs > 0)
            durations.push(t('stats.llm', { duration: formatDuration(stats.llmMs, t) }));
        if (stats.toolMs > 0)
            durations.push(t('stats.toolCall', { duration: formatDuration(stats.toolMs, t) }));
        if (durations.length > 0)
            groups.push(durations.join(' · '));
        const speeds = [];
        if (stats.ttftSteps > 0) {
            speeds.push(t('stats.ttftAverage', { duration: formatDuration(stats.ttftMs / stats.ttftSteps, t) }));
        }
        if (stats.decodeMs > 0) {
            speeds.push(t('stats.tokensPerSecond', {
                throughput: formatTokensPerSecond(stats.decodeTokens / (stats.decodeMs / 1_000)),
            }));
        }
        if (speeds.length > 0)
            groups.push(speeds.join(' · '));
    }
    if (usage !== undefined) {
        const input = billedInputTokens(usage);
        const output = nonNegative(usage.outputTokens);
        if (input > 0 || output > 0) {
            const cacheHit = cacheHitPercent(usage);
            if (cacheHit !== null)
                groups.push(t('stats.cacheHit', { percent: cacheHit }));
            groups.push(t('stats.tokens', { input: formatTokens(input), output: formatTokens(output) }));
        }
    }
    if (groups.length === 0)
        return null;
    const line = groups.join(' | ');
    return (_jsx("div", { className: css.root, title: line, "data-dcode-session-stats": "", children: groups.map((group, index) => (_jsxs(Fragment, { children: [index === 0 ? null : _jsxs(_Fragment, { children: [_jsx("span", { className: css.sep, "aria-hidden": true, children: "|" }), ' '] }), _jsx("span", { children: group })] }, `${String(index)}:${group}`))) }));
}
//# sourceMappingURL=SessionStatsLine.js.map