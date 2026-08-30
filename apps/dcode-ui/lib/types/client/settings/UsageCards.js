import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The Overview / Models statistics card.
 *
 * One markup source drives both settings surfaces. The two surfaces sit in
 * different token domains — the workbench scale (`--zx-*`) and the official
 * settings aliases (`--dsw-alias-*`) — so each supplies its own CSS Module
 * through {@link UsageCardStyles} instead of the markup being copied.
 *
 * {@link UsageCardStyles} names every class a face must define. It documents
 * the contract and types this file's own reads; it cannot enforce the contract
 * at build time, because the package's CSS-Module shim types every stylesheet
 * as `Record<string, string>`. Each face therefore adopts it through
 * {@link usageCardStyles}, and a class a face forgets renders unstyled rather
 * than failing to compile.
 */
import { useId, useMemo, useRef, useState } from 'react';
import { ACTIVITY_DAYS, ACTIVITY_WEEKS, USAGE_RANGES, activityLevel, buildUsageModel, formatCompact, formatFactor, formatHour, formatTokenCount, promptTokensOf, totalTokensOf, } from "./usage.js";
/** Palette for the stacked chart and its legend, longest series first. */
const SERIES_COLORS = [
    'var(--dcode-usage-series-1)',
    'var(--dcode-usage-series-2)',
    'var(--dcode-usage-series-3)',
    'var(--dcode-usage-series-4)',
    'var(--dcode-usage-series-5)',
    'var(--dcode-usage-series-6)',
    'var(--dcode-usage-series-7)',
];
/** Y-axis gridlines, as fractions of the tallest column. */
const AXIS_FRACTIONS = [1, 0.75, 0.5, 0.25, 0];
/** Days the stacked chart shows per range; `all` reuses the heatmap window. */
const RANGE_DAYS = { all: ACTIVITY_DAYS, '30d': 30, '7d': 7 };
/** Roughly six evenly spaced date labels, whatever the column count. */
const AXIS_LABEL_COUNT = 6;
const TABS = ['overview', 'models'];
const TAB_LABELS = {
    overview: 'usageCard.tabOverview',
    models: 'usageCard.tabModels',
};
const RANGE_LABELS = {
    all: 'usageCard.rangeAll',
    '30d': 'usageCard.range30d',
    '7d': 'usageCard.range7d',
};
const COMPARISON_LABELS = {
    mobyDick: 'usageCard.compareMobyDick',
    warAndPeace: 'usageCard.compareWarAndPeace',
    wikipedia: 'usageCard.compareWikipedia',
};
function formatDay(date) {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}
/** The route's display name; a route the projection never named is unknown. */
function modelLabel(row, t) {
    return row.model === '' ? t('usageCard.unknownModel') : row.model;
}
function colorOf(index) {
    return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];
}
/**
 * Adopt one CSS Module as a card face.
 * @param classes - the imported module, typed by the shim as a plain record.
 * @returns the same object under the card's class contract.
 */
export function usageCardStyles(classes) {
    return classes;
}
/** The two-tab usage card, shared by both settings surfaces. */
export function UsageCards({ list, t, styles }) {
    const [tab, setTab] = useState('overview');
    const [range, setRange] = useState('all');
    const panelId = useId();
    const tabPrefix = useId();
    // One timestamp per mount rather than per render: every day bucket below is
    // derived from it, so a re-render must not silently shift the window.
    const [now] = useState(() => Date.now());
    // A tablist takes one tab stop, so the tabs carry a roving tabindex and the
    // arrow keys must move between them — without this the second tab has no
    // keyboard route at all.
    const tabRefs = useRef({});
    const moveTab = (event, index) => {
        const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
        const next = step === 0
            ? event.key === 'Home' ? TABS[0] : event.key === 'End' ? TABS[TABS.length - 1] : undefined
            : TABS[(index + step + TABS.length) % TABS.length];
        if (next === undefined)
            return;
        event.preventDefault();
        setTab(next);
        tabRefs.current[next]?.focus();
    };
    const model = useMemo(() => buildUsageModel(list, range, now, ACTIVITY_DAYS, RANGE_DAYS[range]), [list, now, range]);
    const colorByKey = new Map(model.models.map((row, index) => [row.key, colorOf(index)]));
    return (_jsxs("section", { className: styles.card, children: [_jsxs("div", { className: styles.head, children: [_jsx("div", { className: styles.tabs, role: "tablist", "aria-label": t('usageCard.title'), children: TABS.map((entry, index) => (_jsx("button", { ref: element => { tabRefs.current[entry] = element; }, type: "button", role: "tab", id: `${tabPrefix}-${entry}`, "aria-selected": tab === entry, "aria-controls": panelId, tabIndex: tab === entry ? 0 : -1, className: `${styles.tab} ${tab === entry ? styles.tabActive : ''}`, onClick: () => { setTab(entry); }, onKeyDown: event => { moveTab(event, index); }, children: t(TAB_LABELS[entry]) }, entry))) }), _jsx("div", { className: styles.ranges, role: "radiogroup", "aria-label": t('usageCard.rangeLabel'), children: USAGE_RANGES.map(entry => (_jsx("button", { type: "button", role: "radio", "aria-checked": range === entry, className: `${styles.range} ${range === entry ? styles.rangeActive : ''}`, onClick: () => { setRange(entry); }, children: t(RANGE_LABELS[entry]) }, entry))) })] }), _jsx("div", { className: styles.panel, id: panelId, role: "tabpanel", "aria-labelledby": `${tabPrefix}-${tab}`, tabIndex: 0, children: tab === 'overview'
                    ? _jsx(OverviewPanel, { model: model, t: t, styles: styles })
                    : _jsx(ModelsPanel, { model: model, colorByKey: colorByKey, t: t, styles: styles }) })] }));
}
function Stat({ label, value, styles }) {
    return (_jsxs("div", { className: styles.stat, children: [_jsx("span", { className: styles.statLabel, children: label }), _jsx("strong", { className: styles.statValue, children: value })] }));
}
function OverviewPanel({ model, t, styles }) {
    const favorite = model.favorite;
    const peakCells = model.activity.reduce((peak, cell) => Math.max(peak, cell.value), 0);
    const levelClass = [styles.level0, styles.level1, styles.level2, styles.level3, styles.level4];
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.statGrid, children: [_jsx(Stat, { label: t('usageCard.sessions'), value: formatTokenCount(model.sessions), styles: styles }), _jsx(Stat, { label: t('usageCard.messages'), value: formatTokenCount(model.messages), styles: styles }), _jsx(Stat, { label: t('usageCard.totalTokens'), value: formatCompact(model.totalTokens), styles: styles }), _jsx(Stat, { label: t('usageCard.activeDays'), value: formatTokenCount(model.activeDays), styles: styles }), _jsx(Stat, { label: t('usageCard.currentStreak'), value: t('usageCard.days', { count: model.currentStreak }), styles: styles }), _jsx(Stat, { label: t('usageCard.longestStreak'), value: t('usageCard.days', { count: model.longestStreak }), styles: styles }), _jsx(Stat, { label: t('usageCard.peakHour'), value: model.peakHour === null ? '—' : formatHour(model.peakHour), styles: styles }), _jsx(Stat, { label: t('usageCard.favoriteModel'), value: favorite === null ? '—' : modelLabel(favorite, t), styles: styles })] }), _jsx("div", { className: styles.heatmap, role: "img", "aria-label": t('usageCard.activityAlt', {
                    days: model.activeDays,
                    weeks: ACTIVITY_WEEKS,
                    tokens: formatCompact(model.totalTokens),
                }), children: Array.from({ length: 7 }, (_, weekday) => (_jsx("div", { className: styles.heatRow, children: Array.from({ length: ACTIVITY_WEEKS }, (_, week) => {
                        const cell = model.activity[week * 7 + weekday];
                        if (cell === undefined)
                            return null;
                        const level = activityLevel(cell.value, peakCells);
                        return (_jsx("span", { className: `${styles.heatCell} ${levelClass[level]}`, title: `${formatDay(cell.date)} · ${formatCompact(cell.value)}` }, cell.date.getTime()));
                    }) }, weekday))) }), model.comparison === null ? null : (_jsx("p", { className: styles.footnote, children: t('usageCard.comparison', {
                    factor: formatFactor(model.comparison.factor),
                    reference: t(COMPARISON_LABELS[model.comparison.id] ?? 'usageCard.compareMobyDick'),
                }) })), _jsx("p", { className: styles.footnote, children: t('usageCard.dayBucketNote') })] }));
}
function ModelsPanel({ model, colorByKey, t, styles }) {
    if (model.models.length === 0) {
        return _jsx("p", { className: styles.empty, children: t('usageCard.empty') });
    }
    const peakColumn = model.series.reduce((peak, column) => Math.max(peak, column.total), 0);
    const step = Math.max(1, Math.ceil(model.series.length / AXIS_LABEL_COUNT));
    const ticks = model.series.filter((_, index) => index % step === 0);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: styles.chart, children: [_jsx("div", { className: styles.axis, "aria-hidden": true, children: AXIS_FRACTIONS.map(fraction => (_jsx("span", { className: styles.axisTick, children: formatCompact(peakColumn * fraction) }, fraction))) }), _jsx("div", { className: styles.plot, role: "img", "aria-label": t('usageCard.chartAlt', {
                            days: model.series.length,
                            tokens: formatCompact(model.totalTokens),
                        }), children: model.series.map(column => (_jsx("div", { className: styles.column, title: `${formatDay(column.date)} · ${formatCompact(column.total)}`, children: _jsx("div", { className: styles.stack, style: { height: peakColumn === 0 ? '0%' : `${(column.total / peakColumn) * 100}%` }, children: model.models.map((row) => {
                                    const value = column.byModel.get(row.key) ?? 0;
                                    if (value === 0)
                                        return null;
                                    return (_jsx("span", { className: styles.segment, style: {
                                            flexGrow: value,
                                            background: colorByKey.get(row.key) ?? colorOf(0),
                                        } }, row.key));
                                }) }) }, column.date.getTime()))) })] }), _jsx("div", { className: styles.ticks, "aria-hidden": true, children: ticks.map(column => _jsx("span", { className: styles.tick, children: formatDay(column.date) }, column.date.getTime())) }), _jsx("ul", { className: styles.legend, children: model.models.map(row => (_jsxs("li", { className: styles.legendRow, children: [_jsx("span", { className: styles.swatch, style: { background: colorByKey.get(row.key) ?? colorOf(0) }, "aria-hidden": true }), _jsx("span", { className: styles.legendName, children: modelLabel(row, t) }), _jsx("span", { className: styles.legendTokens, children: t('usageCard.inOut', {
                                input: formatCompact(promptTokensOf(row)),
                                output: formatCompact(row.outputTokens),
                            }) }), _jsx("span", { className: styles.legendShare, children: model.totalTokens === 0
                                ? '—'
                                : `${(Math.round((totalTokensOf(row) / model.totalTokens) * 1_000) / 10).toFixed(1)}%` })] }, row.key))) }), _jsx("p", { className: styles.footnote, children: model.estimated ? t('usageCard.estimatedNote') : t('usageCard.dayBucketNote') })] }));
}
//# sourceMappingURL=UsageCards.js.map