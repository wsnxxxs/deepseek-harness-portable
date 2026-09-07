window.__ModuleLoader__.load({
	id: "@dsh-portable/session-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/locales.ts
		/**
		* Copy owned by the session-manager plugin, in the two locales this
		* distribution ships.
		*
		* The dictionary is registered as an ordinary namespace on the Host's locale
		* runtime, so both the official settings shell and the DCode workbench render
		* these words from one source: the workbench binds this namespace rather than
		* translating the archive and usage vocabulary a second time.
		* @module @dsh-portable/session-manager/client/locales
		*/
		/** Locale namespace owned by this package. */
		const SESSION_MANAGER_NS = "sessionManager";
		/** English dictionary; also the fallback for a key a locale is missing. */
		const en = {
			"archive.title": "Archived chats",
			"archive.body": "Manage archived conversations. Restore one to return it to the sidebar, or delete it permanently.",
			"archive.empty": "No archived conversations.",
			"archive.restore": "Restore",
			"archive.delete": "Delete permanently",
			"archive.deleteTitle": "Delete archived conversation?",
			"archive.deleteBody": "This permanently deletes the conversation and cannot be undone.",
			"archive.cancel": "Cancel",
			"archive.close": "Close",
			"archive.working": "Working…",
			"usage.title": "Model usage",
			"usage.body": "Usage is aggregated from the same durable task records the workbench reads. This page does not estimate account balance.",
			"usageCard.title": "Usage statistics",
			"usageCard.tabOverview": "Overview",
			"usageCard.tabModels": "Models",
			"usageCard.rangeLabel": "Time range",
			"usageCard.rangeToday": "Today",
			"usageCard.range7d": "7d",
			"usageCard.range30d": "30d",
			"usageCard.sessions": "Sessions",
			"usageCard.messages": "Messages",
			"usageCard.totalTokens": "Total tokens",
			"usageCard.activeDays": "Active days",
			"usageCard.currentStreak": "Current streak",
			"usageCard.longestStreak": "Longest streak",
			"usageCard.peakHour": "Peak hour",
			"usageCard.favoriteModel": "Favorite model",
			"usageCard.days": "{count}d",
			"usageCard.unknownModel": "Unattributed",
			"usageCard.inOut": "{input} in · {output} out",
			"usageCard.empty": "No token usage has been recorded in this range.",
			"usageCard.activityAlt": "Activity over the last {weeks} weeks: {days} active days, {tokens} tokens.",
			"usageCard.chartAlt": "Daily token usage over {days} days, {tokens} in total.",
			"usageCard.dayBucketNote": "Each task is counted on the day it was last active, so a task spanning several days lands on one of them. Messages count recorded turns and steps.",
			"usageCard.estimatedNote": "Some tasks predate per-model accounting; their tokens are credited to the model they last used and move to the exact split once the task is reopened.",
			"usageCard.comparison": "That is about {factor}× the tokens in {reference}.",
			"usageCard.compareMobyDick": "Moby-Dick",
			"usageCard.compareWarAndPeace": "War and Peace",
			"usageCard.compareWikipedia": "the English Wikipedia"
		};
		/** Simplified Chinese dictionary. */
		const zh = {
			"archive.title": "已归档对话",
			"archive.body": "管理已归档的对话。恢复后会重新显示在侧边栏，也可以永久删除。",
			"archive.empty": "暂无已归档对话。",
			"archive.restore": "恢复",
			"archive.delete": "永久删除",
			"archive.deleteTitle": "删除已归档对话？",
			"archive.deleteBody": "此操作会永久删除对话，且无法撤销。",
			"archive.cancel": "取消",
			"archive.close": "关闭",
			"archive.working": "处理中…",
			"usage.title": "模型用量",
			"usage.body": "数据来自与工作台使用统计相同的任务持久化记录。本页面不伪造账户余额。",
			"usageCard.title": "用量统计",
			"usageCard.tabOverview": "总览",
			"usageCard.tabModels": "模型",
			"usageCard.rangeLabel": "时间范围",
			"usageCard.rangeToday": "今日",
			"usageCard.range7d": "7 天",
			"usageCard.range30d": "30 天",
			"usageCard.sessions": "任务数",
			"usageCard.messages": "消息数",
			"usageCard.totalTokens": "累计 Token",
			"usageCard.activeDays": "活跃天数",
			"usageCard.currentStreak": "当前连续",
			"usageCard.longestStreak": "最长连续",
			"usageCard.peakHour": "高峰时段",
			"usageCard.favoriteModel": "常用模型",
			"usageCard.days": "{count} 天",
			"usageCard.unknownModel": "未归类",
			"usageCard.inOut": "输入 {input} · 输出 {output}",
			"usageCard.empty": "该时间范围内没有记录到 Token 用量。",
			"usageCard.activityAlt": "最近 {weeks} 周的活跃情况：{days} 个活跃日，共 {tokens} Token。",
			"usageCard.chartAlt": "{days} 天的每日 Token 用量，合计 {tokens}。",
			"usageCard.dayBucketNote": "每个任务计入其最后活跃的那一天，因此跨多天的任务会整块落在其中一天。消息数统计已记录的回合与步骤。",
			"usageCard.estimatedNote": "部分任务早于按模型计量，其 Token 暂记在最后使用的模型上；重新打开该任务后会更新为精确拆分。",
			"usageCard.comparison": "大约是 {reference} 的 {factor} 倍 Token。",
			"usageCard.compareMobyDick": "《白鲸》",
			"usageCard.compareWarAndPeace": "《战争与和平》",
			"usageCard.compareWikipedia": "英文维基百科"
		};
		//#endregion
		//#region src/client/usage.ts
		const INTEGER_FORMATTER = new Intl.NumberFormat(void 0, { maximumFractionDigits: 0 });
		function formatTokenCount(value) {
			return INTEGER_FORMATTER.format(value);
		}
		function formatPercent(value) {
			return `${Math.round(value * 1e3) / 10}%`;
		}
		/** Aggregate the durable usage and session-stats projections. */
		function aggregateUsage(list) {
			let sessions = 0;
			let usageSessions = 0;
			let turns = 0;
			let steps = 0;
			let uncachedInputTokens = 0;
			let outputTokens = 0;
			let cacheReadTokens = 0;
			let cacheWriteTokens = 0;
			let hasStats = false;
			for (const row of collectUsageRows(list)) {
				sessions += 1;
				if (row.hasStats) {
					hasStats = true;
					turns += row.turns;
					steps += row.steps;
				}
				if (!row.hasUsage) continue;
				uncachedInputTokens += row.buckets.uncachedInputTokens;
				outputTokens += row.buckets.outputTokens;
				cacheReadTokens += row.buckets.cacheReadTokens;
				cacheWriteTokens += row.buckets.cacheWriteTokens;
				if (row.totalTokens > 0) usageSessions += 1;
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
				hasStats
			};
		}
		function summarizeUsage(totals) {
			const promptTokens = totals.uncachedInputTokens + totals.cacheReadTokens + totals.cacheWriteTokens;
			return {
				...totals,
				promptTokens,
				totalTokens: promptTokens + totals.outputTokens,
				cacheHit: promptTokens === 0 ? null : totals.cacheReadTokens / promptTokens
			};
		}
		const USAGE_RANGES = [
			"today",
			"7d",
			"30d"
		];
		const DAY_MS = 1440 * 60 * 1e3;
		/** Days the activity heatmap spans; a whole number of weeks keeps it square. */
		const ACTIVITY_WEEKS = 26;
		const ACTIVITY_DAYS = 182;
		const ZERO_BUCKETS = {
			uncachedInputTokens: 0,
			outputTokens: 0,
			cacheReadTokens: 0,
			cacheWriteTokens: 0
		};
		function counted(value) {
			return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
		}
		/** The billed prompt side: uncached input plus both cache directions. */
		function promptTokensOf(buckets) {
			return buckets.uncachedInputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens;
		}
		function totalTokensOf(buckets) {
			return promptTokensOf(buckets) + buckets.outputTokens;
		}
		function modelKeyOf(provider, model) {
			return `${provider}\u0000${model}`;
		}
		function addBuckets(left, right) {
			return {
				uncachedInputTokens: left.uncachedInputTokens + right.uncachedInputTokens,
				outputTokens: left.outputTokens + right.outputTokens,
				cacheReadTokens: left.cacheReadTokens + right.cacheReadTokens,
				cacheWriteTokens: left.cacheWriteTokens + right.cacheWriteTokens
			};
		}
		function bucketsFrom(usage) {
			return {
				uncachedInputTokens: counted(usage.uncachedInputTokens),
				outputTokens: counted(usage.outputTokens),
				cacheReadTokens: counted(usage.cacheReadTokens),
				cacheWriteTokens: counted(usage.cacheWriteTokens)
			};
		}
		function routeRowsOf(projections) {
			const rows = projections.modelTokenUsage?.models;
			if (!Array.isArray(rows)) return [];
			const collected = [];
			for (const raw of rows) {
				const model = typeof raw.model === "string" ? raw.model : "";
				if (model === "") continue;
				const provider = typeof raw.provider === "string" ? raw.provider : "";
				const buckets = bucketsFrom(raw);
				collected.push({
					key: modelKeyOf(provider, model),
					provider,
					model,
					calls: counted(raw.calls),
					reasoningTokens: counted(raw.reasoningTokens),
					totalTokens: totalTokensOf(buckets),
					attributed: true,
					...buckets
				});
			}
			return collected;
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
		function collectUsageRows(list) {
			const rows = [];
			for (const id of list.ids) {
				const summary = list.byId[id];
				if (summary === void 0) continue;
				const projections = summary.projectionValues;
				const routes = projections === void 0 ? [] : routeRowsOf(projections);
				const scalar = projections?.tokenUsage;
				const buckets = scalar === void 0 ? routes.reduce((total, route) => addBuckets(total, route), ZERO_BUCKETS) : bucketsFrom(scalar);
				const totalTokens = totalTokensOf(buckets);
				let models = routes;
				if (models.length === 0 && totalTokens > 0) {
					const lastUsed = projections?.modelSelection?.lastUsed;
					const provider = typeof lastUsed?.provider === "string" ? lastUsed.provider : "";
					const model = typeof lastUsed?.model === "string" ? lastUsed.model : "";
					models = [{
						key: modelKeyOf(provider, model),
						provider,
						model,
						calls: 0,
						reasoningTokens: 0,
						totalTokens,
						attributed: false,
						...buckets
					}];
				}
				const stats = projections?.sessionStats;
				rows.push({
					id,
					updatedAt: Number.isFinite(summary.updatedAt) ? summary.updatedAt : 0,
					buckets,
					models,
					turns: counted(stats?.turns),
					steps: counted(stats?.steps),
					totalTokens,
					hasUsage: scalar !== void 0 || routes.length > 0,
					hasStats: stats !== void 0
				});
			}
			return rows;
		}
		/** The inclusive lower bound of the selected range. */
		function rangeStart(range, now) {
			if (range === "today") return startOfDay(new Date(now)).getTime();
			return now - (range === "7d" ? 7 : 30) * DAY_MS;
		}
		function filterByRange(rows, range, now) {
			const cutoff = rangeStart(range, now);
			return rows.filter((row) => row.updatedAt >= cutoff);
		}
		/** Merge every session's routes into one corpus-wide table, biggest first. */
		function aggregateModels(rows) {
			const merged = /* @__PURE__ */ new Map();
			for (const row of rows) for (const route of row.models) {
				const current = merged.get(route.key);
				if (current === void 0) {
					merged.set(route.key, route);
					continue;
				}
				const buckets = addBuckets(current, route);
				merged.set(route.key, {
					key: current.key,
					provider: current.provider,
					model: current.model,
					calls: current.calls + route.calls,
					reasoningTokens: current.reasoningTokens + route.reasoningTokens,
					totalTokens: totalTokensOf(buckets),
					attributed: current.attributed && route.attributed,
					...buckets
				});
			}
			return [...merged.values()].sort((left, right) => right.totalTokens - left.totalTokens || left.model.localeCompare(right.model));
		}
		function startOfDay(value) {
			return new Date(value.getFullYear(), value.getMonth(), value.getDate());
		}
		function addDays(value, days) {
			const shifted = new Date(value.getTime());
			shifted.setDate(shifted.getDate() + days);
			return shifted;
		}
		/** Whole days between two local midnights, tolerant of DST-shifted lengths. */
		function dayIndex(from, to) {
			return Math.round((to.getTime() - from.getTime()) / DAY_MS);
		}
		/**
		* Bucket whole sessions onto their `updatedAt` day.
		*
		* The session list carries one timestamp per session, so a run spanning
		* several days lands entirely on its last active day. Every day-shaped card
		* inherits that approximation.
		*/
		function buildActivity(rows, days, now) {
			const first = addDays(startOfDay(new Date(now)), -(days - 1));
			const cells = Array.from({ length: days }, (_, index) => ({
				date: addDays(first, index),
				value: 0,
				sessions: 0
			}));
			for (const row of rows) {
				if (row.updatedAt <= 0) continue;
				const cell = cells[dayIndex(first, startOfDay(new Date(row.updatedAt)))];
				if (cell === void 0) continue;
				cell.value += row.totalTokens;
				cell.sessions += 1;
			}
			return cells;
		}
		/** The same day buckets, split by route for a stacked column chart. */
		function buildDailySeries(rows, days, now) {
			const first = addDays(startOfDay(new Date(now)), -(days - 1));
			const columns = Array.from({ length: days }, (_, index) => ({
				date: addDays(first, index),
				total: 0,
				byModel: /* @__PURE__ */ new Map()
			}));
			for (const row of rows) {
				if (row.updatedAt <= 0) continue;
				const column = columns[dayIndex(first, startOfDay(new Date(row.updatedAt)))];
				if (column === void 0) continue;
				for (const route of row.models) {
					if (route.totalTokens <= 0) continue;
					column.total += route.totalTokens;
					column.byModel.set(route.key, (column.byModel.get(route.key) ?? 0) + route.totalTokens);
				}
			}
			return columns;
		}
		/** Five-step shading for a heatmap cell: 0 for empty, 1–4 by share of peak. */
		function activityLevel(value, peak) {
			if (value <= 0 || peak <= 0) return 0;
			return Math.max(1, Math.min(4, Math.ceil(value / peak * 4)));
		}
		/** Consecutive active days ending today, and the longest run in the window. */
		function activityStreaks(cells) {
			let current = 0;
			for (let index = cells.length - 1; index >= 0; index -= 1) {
				const cell = cells[index];
				if (cell === void 0 || cell.value <= 0) break;
				current += 1;
			}
			let longest = 0;
			let run = 0;
			for (const cell of cells) {
				run = cell.value > 0 ? run + 1 : 0;
				if (run > longest) longest = run;
			}
			return {
				current,
				longest
			};
		}
		function activeDays(cells) {
			return cells.reduce((count, cell) => cell.value > 0 ? count + 1 : count, 0);
		}
		/** The local hour that accumulated the most tokens, or `null` with no data. */
		function peakHour(rows) {
			const hours = new Array(24).fill(0);
			let seen = false;
			for (const row of rows) {
				if (row.updatedAt <= 0 || row.totalTokens <= 0) continue;
				hours[new Date(row.updatedAt).getHours()] += row.totalTokens;
				seen = true;
			}
			if (!seen) return null;
			let hour = 0;
			for (let index = 1; index < hours.length; index += 1) if (hours[index] > hours[hour]) hour = index;
			return {
				hour,
				tokens: hours[hour]
			};
		}
		/**
		* A prose reference the total can be compared against, in tokens.
		*
		* Word counts of long public-domain works at roughly 4/3 tokens per word. The
		* figures are deliberately round: the line is a sense of scale, not a
		* measurement.
		*/
		const COMPARISONS = [
			{
				id: "mobyDick",
				tokens: 275e3
			},
			{
				id: "warAndPeace",
				tokens: 78e4
			},
			{
				id: "wikipedia",
				tokens: 3e9
			}
		];
		/**
		* Pick the largest reference the total still exceeds, so the comparison grows
		* with the corpus instead of reporting an ever-larger multiple of the smallest
		* work. Returns `null` below the smallest reference, where a fraction would
		* say less than nothing at all.
		*/
		function tokenComparison(totalTokens) {
			if (totalTokens <= 0) return null;
			let chosen = COMPARISONS[0];
			for (const candidate of COMPARISONS) if (totalTokens >= candidate.tokens && candidate.tokens > chosen.tokens) chosen = candidate;
			const factor = totalTokens / chosen.tokens;
			if (factor < 1) return null;
			return {
				id: chosen.id,
				factor: factor >= 10 ? Math.round(factor) : Math.round(factor * 10) / 10
			};
		}
		const COMPACT_FORMATTER = new Intl.NumberFormat(void 0, {
			notation: "compact",
			maximumFractionDigits: 1
		});
		/** Axis- and chip-sized token counts: `0`, `114.3K`, `14.7M`. */
		function formatCompact(value) {
			if (!Number.isFinite(value) || value <= 0) return "0";
			return COMPACT_FORMATTER.format(Math.round(value));
		}
		const FACTOR_FORMATTER = new Intl.NumberFormat(void 0, { maximumFractionDigits: 1 });
		/** {@link UsageComparison.factor} as prose: `2`, `3.5`, `10,393`. */
		function formatFactor(value) {
			return FACTOR_FORMATTER.format(value);
		}
		/** `14:00`-style label for {@link peakHour}, in the viewer's own clock. */
		function formatHour(hour) {
			return `${String(hour).padStart(2, "0")}:00`;
		}
		/**
		* Fold the session list into one card model.
		*
		* `activityDays` stays fixed across ranges so the heatmap keeps its shape,
		* while `seriesDays` follows the selected range so the column chart widens
		* and narrows with it.
		*/
		function buildUsageModel(list, range, now, activityDays = 182, seriesDays = 182) {
			const rows = filterByRange(collectUsageRows(list), range, now);
			const models = aggregateModels(rows);
			const activity = buildActivity(rows, activityDays, now);
			const streaks = activityStreaks(activity);
			const totalTokens = models.reduce((total, row) => total + row.totalTokens, 0);
			const peak = peakHour(rows);
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
				estimated: models.some((row) => !row.attributed),
				comparison: tokenComparison(totalTokens)
			};
		}
		//#endregion
		//#region src/client/UsageCards.tsx
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
		/** Palette for the stacked chart and its legend, longest series first. */
		const SERIES_COLORS = [
			"var(--dcode-usage-series-1)",
			"var(--dcode-usage-series-2)",
			"var(--dcode-usage-series-3)",
			"var(--dcode-usage-series-4)",
			"var(--dcode-usage-series-5)",
			"var(--dcode-usage-series-6)",
			"var(--dcode-usage-series-7)"
		];
		/** Y-axis gridlines, as fractions of the tallest column. */
		const AXIS_FRACTIONS = [
			1,
			.75,
			.5,
			.25,
			0
		];
		/** Days the stacked chart shows per range. */
		const RANGE_DAYS = {
			today: 1,
			"7d": 7,
			"30d": 30
		};
		/** Roughly six evenly spaced date labels, whatever the column count. */
		const AXIS_LABEL_COUNT = 6;
		const TABS = ["overview", "models"];
		const TAB_LABELS = {
			overview: "usageCard.tabOverview",
			models: "usageCard.tabModels"
		};
		const RANGE_LABELS = {
			today: "usageCard.rangeToday",
			"7d": "usageCard.range7d",
			"30d": "usageCard.range30d"
		};
		const COMPARISON_LABELS = {
			mobyDick: "usageCard.compareMobyDick",
			warAndPeace: "usageCard.compareWarAndPeace",
			wikipedia: "usageCard.compareWikipedia"
		};
		function formatDay(date) {
			return new Intl.DateTimeFormat(void 0, {
				month: "short",
				day: "numeric"
			}).format(date);
		}
		/** The route's display name; a route the projection never named is unknown. */
		function modelLabel(row, t) {
			return row.model === "" ? t("usageCard.unknownModel") : row.model;
		}
		function colorOf(index) {
			return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];
		}
		/**
		* Adopt one CSS Module as a card face.
		* @param classes - the imported module, typed by the shim as a plain record.
		* @returns the same object under the card's class contract.
		*/
		function usageCardStyles(classes) {
			return classes;
		}
		/** The two-tab usage card, shared by both settings surfaces. */
		function UsageCards({ list, t, styles }) {
			const [tab, setTab] = (0, react.useState)("overview");
			const [range, setRange] = (0, react.useState)("today");
			const panelId = (0, react.useId)();
			const tabPrefix = (0, react.useId)();
			const [now] = (0, react.useState)(() => Date.now());
			const tabRefs = (0, react.useRef)({});
			const moveTab = (event, index) => {
				const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
				const next = step === 0 ? event.key === "Home" ? TABS[0] : event.key === "End" ? TABS[TABS.length - 1] : void 0 : TABS[(index + step + TABS.length) % TABS.length];
				if (next === void 0) return;
				event.preventDefault();
				setTab(next);
				tabRefs.current[next]?.focus();
			};
			const model = (0, react.useMemo)(() => buildUsageModel(list, range, now, 182, RANGE_DAYS[range]), [
				list,
				now,
				range
			]);
			const colorByKey = new Map(model.models.map((row, index) => [row.key, colorOf(index)]));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: styles.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: styles.head,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: styles.tabs,
						role: "tablist",
						"aria-label": t("usageCard.title"),
						children: TABS.map((entry, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							ref: (element) => {
								tabRefs.current[entry] = element;
							},
							type: "button",
							role: "tab",
							id: `${tabPrefix}-${entry}`,
							"aria-selected": tab === entry,
							"aria-controls": panelId,
							tabIndex: tab === entry ? 0 : -1,
							className: `${styles.tab} ${tab === entry ? styles.tabActive : ""}`,
							onClick: () => {
								setTab(entry);
							},
							onKeyDown: (event) => {
								moveTab(event, index);
							},
							children: t(TAB_LABELS[entry])
						}, entry))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: styles.ranges,
						role: "radiogroup",
						"aria-label": t("usageCard.rangeLabel"),
						children: USAGE_RANGES.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							role: "radio",
							"aria-checked": range === entry,
							className: `${styles.range} ${range === entry ? styles.rangeActive : ""}`,
							onClick: () => {
								setRange(entry);
							},
							children: t(RANGE_LABELS[entry])
						}, entry))
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: styles.panel,
					id: panelId,
					role: "tabpanel",
					"aria-labelledby": `${tabPrefix}-${tab}`,
					tabIndex: 0,
					children: tab === "overview" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OverviewPanel, {
						model,
						t,
						styles
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelsPanel, {
						model,
						colorByKey,
						t,
						styles
					})
				})]
			});
		}
		function Stat({ label, value, styles }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: styles.stat,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: styles.statLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
					className: styles.statValue,
					children: value
				})]
			});
		}
		function OverviewPanel({ model, t, styles }) {
			const favorite = model.favorite;
			const peakCells = model.activity.reduce((peak, cell) => Math.max(peak, cell.value), 0);
			const levelClass = [
				styles.level0,
				styles.level1,
				styles.level2,
				styles.level3,
				styles.level4
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: styles.statGrid,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.sessions"),
							value: formatTokenCount(model.sessions),
							styles
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.messages"),
							value: formatTokenCount(model.messages),
							styles
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.totalTokens"),
							value: formatCompact(model.totalTokens),
							styles
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.activeDays"),
							value: formatTokenCount(model.activeDays),
							styles
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.currentStreak"),
							value: t("usageCard.days", { count: model.currentStreak }),
							styles
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.longestStreak"),
							value: t("usageCard.days", { count: model.longestStreak }),
							styles
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.peakHour"),
							value: model.peakHour === null ? "—" : formatHour(model.peakHour),
							styles
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stat, {
							label: t("usageCard.favoriteModel"),
							value: favorite === null ? "—" : modelLabel(favorite, t),
							styles
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: styles.heatmap,
					role: "img",
					"aria-label": t("usageCard.activityAlt", {
						days: model.activeDays,
						weeks: 26,
						tokens: formatCompact(model.totalTokens)
					}),
					children: Array.from({ length: 7 }, (_, weekday) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: styles.heatRow,
						children: Array.from({ length: 26 }, (_, week) => {
							const cell = model.activity[week * 7 + weekday];
							if (cell === void 0) return null;
							const level = activityLevel(cell.value, peakCells);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${styles.heatCell} ${levelClass[level]}`,
								title: `${formatDay(cell.date)} · ${formatCompact(cell.value)}`
							}, cell.date.getTime());
						})
					}, weekday))
				}),
				model.comparison === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: styles.footnote,
					children: t("usageCard.comparison", {
						factor: formatFactor(model.comparison.factor),
						reference: t(COMPARISON_LABELS[model.comparison.id] ?? "usageCard.compareMobyDick")
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: styles.footnote,
					children: t("usageCard.dayBucketNote")
				})
			] });
		}
		function ModelsPanel({ model, colorByKey, t, styles }) {
			if (model.models.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: styles.empty,
				children: t("usageCard.empty")
			});
			const peakColumn = model.series.reduce((peak, column) => Math.max(peak, column.total), 0);
			const step = Math.max(1, Math.ceil(model.series.length / AXIS_LABEL_COUNT));
			const ticks = model.series.filter((_, index) => index % step === 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: styles.chart,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: styles.axis,
						"aria-hidden": true,
						children: AXIS_FRACTIONS.map((fraction) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: styles.axisTick,
							children: formatCompact(peakColumn * fraction)
						}, fraction))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: styles.plot,
						role: "img",
						"aria-label": t("usageCard.chartAlt", {
							days: model.series.length,
							tokens: formatCompact(model.totalTokens)
						}),
						children: model.series.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: styles.column,
							title: `${formatDay(column.date)} · ${formatCompact(column.total)}`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: styles.stack,
								style: { height: peakColumn === 0 ? "0%" : `${column.total / peakColumn * 100}%` },
								children: model.models.map((row) => {
									const value = column.byModel.get(row.key) ?? 0;
									if (value === 0) return null;
									return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: styles.segment,
										style: {
											flexGrow: value,
											background: colorByKey.get(row.key) ?? colorOf(0)
										}
									}, row.key);
								})
							})
						}, column.date.getTime()))
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: styles.ticks,
					"aria-hidden": true,
					children: ticks.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: styles.tick,
						children: formatDay(column.date)
					}, column.date.getTime()))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
					className: styles.legend,
					children: model.models.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
						className: styles.legendRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: styles.swatch,
								style: { background: colorByKey.get(row.key) ?? colorOf(0) },
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: styles.legendName,
								children: modelLabel(row, t)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: styles.legendTokens,
								children: t("usageCard.inOut", {
									input: formatCompact(promptTokensOf(row)),
									output: formatCompact(row.outputTokens)
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: styles.legendShare,
								children: model.totalTokens === 0 ? "—" : `${(Math.round(totalTokensOf(row) / model.totalTokens * 1e3) / 10).toFixed(1)}%`
							})
						]
					}, row.key))
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: styles.footnote,
					children: model.estimated ? t("usageCard.estimatedNote") : t("usageCard.dayBucketNote")
				})
			] });
		}
		//#endregion
		//#region src/client/index.ts
		const name = "session-manager-client";
		const inject = ["locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(SESSION_MANAGER_NS, {
				zh,
				en
			}), "session-manager: dictionaries");
		}
		//#endregion
		exports.ACTIVITY_DAYS = ACTIVITY_DAYS;
		exports.ACTIVITY_WEEKS = ACTIVITY_WEEKS;
		exports.DAY_MS = DAY_MS;
		exports.SESSION_MANAGER_NS = SESSION_MANAGER_NS;
		exports.USAGE_RANGES = USAGE_RANGES;
		exports.UsageCards = UsageCards;
		exports.activeDays = activeDays;
		exports.activityLevel = activityLevel;
		exports.activityStreaks = activityStreaks;
		exports.addDays = addDays;
		exports.aggregateModels = aggregateModels;
		exports.aggregateUsage = aggregateUsage;
		exports.apply = apply;
		exports.buildActivity = buildActivity;
		exports.buildDailySeries = buildDailySeries;
		exports.buildUsageModel = buildUsageModel;
		exports.collectUsageRows = collectUsageRows;
		exports.en = en;
		exports.filterByRange = filterByRange;
		exports.formatCompact = formatCompact;
		exports.formatFactor = formatFactor;
		exports.formatHour = formatHour;
		exports.formatPercent = formatPercent;
		exports.formatTokenCount = formatTokenCount;
		exports.inject = inject;
		exports.modelKeyOf = modelKeyOf;
		exports.name = name;
		exports.peakHour = peakHour;
		exports.promptTokensOf = promptTokensOf;
		exports.rangeStart = rangeStart;
		exports.startOfDay = startOfDay;
		exports.summarizeUsage = summarizeUsage;
		exports.tokenComparison = tokenComparison;
		exports.totalTokensOf = totalTokensOf;
		exports.usageCardStyles = usageCardStyles;
		exports.zh = zh;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map