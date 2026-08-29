import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { aggregateUsage, formatPercent, formatTokenCount, summarizeUsage } from "./usage.js";
import css from './ModelUsageSection.module.css';
function Metric(props) {
    return (_jsxs("div", { className: css.metric, children: [_jsx("span", { className: css.metricTitle, children: props.title }), _jsx("strong", { className: css.metricValue, children: props.value })] }));
}
/** Keep the official UI's model usage page independent from DCode navigation. */
export function ModelUsageSection({ useSessions, t }) {
    const list = useSessions(snapshot => snapshot);
    const totals = summarizeUsage(aggregateUsage(list));
    if (list.phase === 'pending') {
        return (_jsxs("section", { className: css.section, children: [_jsx("h2", { className: css.title, children: t('settings.modelUsage') }), _jsx("p", { className: css.intro, children: t('settings.modelUsageBody') }), _jsx("div", { className: css.status, children: t('settings.usageLoading') })] }));
    }
    return (_jsxs("section", { className: css.section, children: [_jsx("h2", { className: css.title, children: t('settings.modelUsage') }), _jsx("p", { className: css.intro, children: t('settings.modelUsageBody') }), _jsxs("div", { className: css.total, children: [_jsx("span", { className: css.totalTitle, children: t('settings.usageTotal') }), _jsx("strong", { className: css.totalValue, children: formatTokenCount(totals.totalTokens) }), _jsx("span", { className: css.totalScope, children: t('settings.usageScope', {
                            sessions: formatTokenCount(totals.sessions),
                            usageSessions: formatTokenCount(totals.usageSessions),
                        }) })] }), _jsxs("div", { className: css.grid, children: [_jsx(Metric, { title: t('settings.usageInput'), value: formatTokenCount(totals.promptTokens) }), _jsx(Metric, { title: t('settings.usageOutput'), value: formatTokenCount(totals.outputTokens) }), _jsx(Metric, { title: t('settings.usageCacheRead'), value: formatTokenCount(totals.cacheReadTokens) }), _jsx(Metric, { title: t('settings.usageCacheWrite'), value: formatTokenCount(totals.cacheWriteTokens) })] }), _jsxs("dl", { className: css.rows, children: [_jsxs("div", { className: css.row, children: [_jsx("dt", { children: t('settings.usageSessions') }), _jsx("dd", { children: formatTokenCount(totals.sessions) })] }), _jsxs("div", { className: css.row, children: [_jsx("dt", { children: t('settings.usageTurns') }), _jsx("dd", { children: totals.hasStats ? formatTokenCount(totals.turns) : '—' })] }), _jsxs("div", { className: css.row, children: [_jsx("dt", { children: t('settings.usageSteps') }), _jsx("dd", { children: totals.hasStats ? formatTokenCount(totals.steps) : '—' })] }), _jsxs("div", { className: css.row, children: [_jsx("dt", { children: t('settings.usageCacheHit') }), _jsx("dd", { children: totals.cacheHit === null ? '—' : formatPercent(totals.cacheHit) })] })] }), !totals.hasUsage ? _jsx("p", { className: css.empty, children: t('settings.usageEmpty') }) : null] }));
}
//# sourceMappingURL=ModelUsageSection.js.map