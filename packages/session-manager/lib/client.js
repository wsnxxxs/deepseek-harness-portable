window.__ModuleLoader__.load({
	id: "@dsh-portable/session-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/archive.ts
		/**
		* The archived-conversation fold, without a surface.
		*
		* Both front ends manage the SAME archive set: the Workspace Controller's
		* `archivedSessionIds`, joined against the Session Controller's list. Nothing
		* here owns a copy of either — the rows are derived on read, and restore and
		* delete are the Host calls the caller supplies. What this module owns is the
		* part that is genuinely shared and genuinely easy to get wrong: joining an
		* archived id whose summary has not loaded, ordering by recency, serializing
		* one in-flight mutation at a time, and holding the pending delete target.
		*
		* Markup stays with each surface. The official settings shell and the
		* workbench sit in different token domains and use different primitives, so a
		* shared component would have to abstract over both; a shared hook does not.
		* @module @dsh-portable/session-manager/client/archive
		*/
		/** A summary stand-in for an archived id whose real summary has not arrived. */
		function placeholder(id) {
			return {
				id,
				displayTitle: id,
				running: false,
				blank: false,
				updatedAt: 0
			};
		}
		/** Message text for a rejected mutation. */
		function describe(cause) {
			return cause instanceof Error ? cause.message : String(cause);
		}
		/**
		* Derive the archive page's state from the two official snapshots.
		* @param sessions - Session Controller list snapshot.
		* @param workspaces - Workspace Controller snapshot carrying the archive set.
		* @param actions - Host mutations supplied by the hosting surface.
		* @returns the rows to render and the callbacks the controls bind to.
		*/
		function useArchivedChats(sessions, workspaces, actions) {
			const [busyId, setBusyId] = (0, react.useState)();
			const [deleteTarget, setDeleteTarget] = (0, react.useState)();
			const [error, setError] = (0, react.useState)();
			const rows = (0, react.useMemo)(() => workspaces.archivedSessionIds.map((id) => sessions.byId[id] ?? placeholder(id)).sort((left, right) => right.updatedAt - left.updatedAt), [sessions.byId, workspaces.archivedSessionIds]);
			const restore = (id) => {
				if (busyId !== void 0) return;
				setBusyId(id);
				setError(void 0);
				actions.restore(id).catch((cause) => {
					setError(describe(cause));
				}).finally(() => {
					setBusyId(void 0);
				});
			};
			const requestDelete = (session) => {
				setError(void 0);
				setDeleteTarget(session);
			};
			const cancelDelete = () => {
				if (busyId !== void 0) return;
				setDeleteTarget(void 0);
				setError(void 0);
			};
			const confirmDelete = () => {
				const target = deleteTarget;
				if (target === void 0 || busyId !== void 0) return;
				setBusyId(target.id);
				setError(void 0);
				actions.remove(target.id).then(() => {
					setDeleteTarget(void 0);
				}).catch((cause) => {
					setError(describe(cause));
				}).finally(() => {
					setBusyId(void 0);
				});
			};
			return {
				rows,
				loading: workspaces.phase !== "ready" || sessions.phase !== "ready",
				busyId,
				busy: busyId !== void 0,
				deleteTarget,
				error,
				restore,
				requestDelete,
				cancelDelete,
				confirmDelete
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\packages\session-manager\src\client\ArchivedChatsSection.module.css.mjs
		const css$2 = ".ZGK0vW_root{flex-direction:column;gap:8px;display:flex}.ZGK0vW_title{color:var(--dsw-alias-label-primary,#0b0e14);margin:0;font-size:16px;font-weight:500;line-height:24px}.ZGK0vW_lead{color:var(--dsw-alias-label-tertiary,#5b6470);margin:0 0 8px;font-size:14px;line-height:22px}.ZGK0vW_empty{border:1px solid var(--dsw-alias-border-l2,#e4e7ec);color:var(--dsw-alias-label-tertiary,#5b6470);text-align:center;border-radius:12px;padding:24px 12px;font-size:14px;line-height:22px}.ZGK0vW_list{border:1px solid var(--dsw-alias-border-l2,#e4e7ec);border-radius:12px;flex-direction:column;margin:0;padding:0;list-style:none;display:flex;overflow:hidden}.ZGK0vW_row{border-bottom:1px solid var(--dsw-alias-border-l2,#e4e7ec);align-items:center;gap:12px;padding:12px;display:flex}.ZGK0vW_row:last-child{border-bottom:none}.ZGK0vW_rowText{flex-direction:column;flex:auto;gap:2px;min-width:0;display:flex}.ZGK0vW_rowTitle{color:var(--dsw-alias-label-primary,#0b0e14);text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:22px;overflow:hidden}.ZGK0vW_rowBody{color:var(--dsw-alias-label-tertiary,#5b6470);text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:18px;overflow:hidden}.ZGK0vW_rowActions{flex:none;align-items:center;gap:8px;display:flex}.ZGK0vW_danger{color:var(--dsw-alias-label-error,#d92d20);cursor:pointer;background:0 0;border:1px solid #0000;border-radius:8px;padding:4px 10px;font-size:13px;line-height:20px}.ZGK0vW_danger:hover:not(:disabled){background:var(--dsw-alias-fill-error-secondary,#d92d2014)}.ZGK0vW_danger:disabled{cursor:default;opacity:.5}.ZGK0vW_error{color:var(--dsw-alias-label-error,#d92d20);font-size:13px;line-height:20px}";
		const tagId$1 = "@dsh-portable/session-manager/ArchivedChatsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/session-manager";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var ArchivedChatsSection_module_css_default = {
			"danger": "ZGK0vW_danger",
			"empty": "ZGK0vW_empty",
			"error": "ZGK0vW_error",
			"lead": "ZGK0vW_lead",
			"list": "ZGK0vW_list",
			"root": "ZGK0vW_root",
			"row": "ZGK0vW_row",
			"rowActions": "ZGK0vW_rowActions",
			"rowBody": "ZGK0vW_rowBody",
			"rowText": "ZGK0vW_rowText",
			"rowTitle": "ZGK0vW_rowTitle",
			"title": "ZGK0vW_title"
		};
		//#endregion
		//#region src/client/ArchivedChatsSection.tsx
		/** The archive page, one row per archived conversation. */
		function ArchivedChatsSection(props) {
			const sessions = props.useSessions((state) => state);
			const workspaces = props.useWorkspaces((state) => state);
			const { t, close } = props;
			const model = useArchivedChats(sessions, workspaces, {
				restore: async (id) => {
					await props.restore(id);
					if (sessions.byId[id] !== void 0) {
						props.open(id);
						close();
					}
				},
				remove: async (id) => {
					await props.remove(id);
					if (sessions.current === id) props.clear();
				}
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: ArchivedChatsSection_module_css_default.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: ArchivedChatsSection_module_css_default.title,
						children: t("archive.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ArchivedChatsSection_module_css_default.lead,
						children: t("archive.body")
					}),
					model.loading ? null : model.rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ArchivedChatsSection_module_css_default.empty,
						children: t("archive.empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: ArchivedChatsSection_module_css_default.list,
						children: model.rows.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: ArchivedChatsSection_module_css_default.row,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ArchivedChatsSection_module_css_default.rowText,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ArchivedChatsSection_module_css_default.rowTitle,
									children: session.displayTitle
								}), session.cwd === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ArchivedChatsSection_module_css_default.rowBody,
									children: session.cwd
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ArchivedChatsSection_module_css_default.rowActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									disabled: model.busy,
									onClick: () => {
										model.restore(session.id);
									},
									children: model.busyId === session.id ? t("archive.working") : t("archive.restore")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: ArchivedChatsSection_module_css_default.danger,
									disabled: model.busy,
									onClick: () => {
										model.requestDelete(session);
									},
									children: t("archive.delete")
								})]
							})]
						}, session.id))
					}),
					model.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: ArchivedChatsSection_module_css_default.error,
						role: "alert",
						children: model.error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: model.deleteTarget !== void 0,
						onClose: model.cancelDelete,
						title: t("archive.deleteTitle"),
						closeLabel: t("archive.close"),
						description: t("archive.deleteBody"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							disabled: model.busy,
							onClick: model.cancelDelete,
							children: t("archive.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: ArchivedChatsSection_module_css_default.danger,
							disabled: model.busy,
							onClick: model.confirmDelete,
							children: model.busy ? t("archive.working") : t("archive.delete")
						})] }),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ArchivedChatsSection_module_css_default.rowTitle,
							children: model.deleteTarget?.displayTitle
						})
					})
				]
			});
		}
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
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\packages\session-manager\src\client\ModelsUsageCard.module.css.mjs
		const css$1 = ".hyt9BG_section{flex-direction:column;gap:8px;display:flex}.hyt9BG_title{color:var(--dsw-alias-label-primary,#0b0e14);margin:0;font-size:16px;font-weight:500;line-height:24px}.hyt9BG_intro{color:var(--dsw-alias-label-tertiary,#5b6470);margin:0;font-size:14px;line-height:22px}.hyt9BG_card{background:var(--dsw-alias-bg-module-platform,#f1f3f7);color:var(--dsw-alias-label-primary,#0b0e14);--dcode-usage-series-1:var(--dsw-static-deepseek-450,#5686fe);--dcode-usage-series-2:var(--dsw-static-deepseek-300,#b7c8fe);--dcode-usage-series-3:var(--dsw-alias-state-success-primary,#1a7f37);--dcode-usage-series-4:var(--dsw-alias-state-warn-label,#9a6700);--dcode-usage-series-5:var(--dsw-alias-state-error-primary,#cf222e);--dcode-usage-series-6:var(--dsw-static-deepseek-500,#4176e6);--dcode-usage-series-7:var(--dsw-alias-label-tertiary,#8b93a1);border-radius:12px;flex-direction:column;gap:16px;margin-top:8px;padding:16px;display:flex;container:hyt9BG_dcode-usage/inline-size}.hyt9BG_head{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;display:flex}.hyt9BG_tabs,.hyt9BG_ranges{background:var(--dsw-alias-bg-layer-1,#fff);border-radius:999px;gap:4px;padding:3px;display:flex}.hyt9BG_tab,.hyt9BG_range{min-height:26px;color:var(--dsw-alias-label-tertiary,#5b6470);font:inherit;cursor:pointer;background:0 0;border:0;border-radius:999px;padding:0 12px;font-size:13px;line-height:20px}.hyt9BG_tab:hover,.hyt9BG_range:hover{background:var(--dsw-alias-interactive-bg-hover,#2631480f);color:var(--dsw-alias-label-primary,#0b0e14)}.hyt9BG_tabActive,.hyt9BG_tabActive:hover,.hyt9BG_rangeActive,.hyt9BG_rangeActive:hover{background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#0b0e14);font-weight:500}.hyt9BG_panel{flex-direction:column;gap:16px;display:flex}.hyt9BG_panel:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#0b0e14);outline-offset:4px;border-radius:8px}.hyt9BG_statGrid{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;display:grid}.hyt9BG_stat{background:var(--dsw-alias-bg-layer-1,#fff);border-radius:8px;flex-direction:column;gap:2px;min-width:0;padding:12px;display:flex}.hyt9BG_statLabel{color:var(--dsw-alias-label-tertiary,#5b6470);font-size:12px;line-height:18px}.hyt9BG_statValue{color:var(--dsw-alias-label-primary,#0b0e14);overflow-wrap:anywhere;font-size:18px;font-weight:600;line-height:26px}.hyt9BG_heatmap{flex-direction:column;gap:3px;padding-bottom:4px;display:flex;overflow-x:auto}.hyt9BG_heatRow{gap:3px;display:flex}.hyt9BG_heatCell{border-radius:2px;flex:none;width:11px;height:11px}.hyt9BG_level0{background:var(--dsw-alias-bg-layer-1,#fff)}.hyt9BG_level1{background:color-mix(in srgb, var(--dcode-usage-series-1) 28%, var(--dsw-alias-bg-layer-1,#fff))}.hyt9BG_level2{background:color-mix(in srgb, var(--dcode-usage-series-1) 52%, var(--dsw-alias-bg-layer-1,#fff))}.hyt9BG_level3{background:color-mix(in srgb, var(--dcode-usage-series-1) 76%, var(--dsw-alias-bg-layer-1,#fff))}.hyt9BG_level4{background:var(--dcode-usage-series-1)}.hyt9BG_chart{gap:8px;height:180px;display:flex}.hyt9BG_axis{flex-direction:column;flex:none;justify-content:space-between;align-items:flex-end;min-width:40px;display:flex}.hyt9BG_axisTick{color:var(--dsw-alias-label-tertiary,#5b6470);font-variant-numeric:tabular-nums;font-size:11px;line-height:1}.hyt9BG_plot{border-bottom:1px solid var(--dsw-alias-border-l2,#0000001a);flex:auto;align-items:flex-end;gap:1px;min-width:0;padding-top:8px;display:flex;overflow:hidden}.hyt9BG_column{flex:1 1 0;align-items:flex-end;min-width:0;height:100%;display:flex}.hyt9BG_stack{border-radius:2px 2px 0 0;flex-direction:column-reverse;width:100%;min-height:1px;display:flex;overflow:hidden}.hyt9BG_segment{flex-basis:0;width:100%;display:block}.hyt9BG_ticks{justify-content:space-between;gap:8px;padding-left:48px;display:flex}.hyt9BG_tick{color:var(--dsw-alias-label-tertiary,#5b6470);white-space:nowrap;font-size:11px}.hyt9BG_legend{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.hyt9BG_legendRow{grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:12px;display:grid}.hyt9BG_swatch{border-radius:2px;width:10px;height:10px}.hyt9BG_legendName{color:var(--dsw-alias-label-primary,#0b0e14);text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:20px;overflow:hidden}.hyt9BG_legendTokens{color:var(--dsw-alias-label-tertiary,#5b6470);font-variant-numeric:tabular-nums;white-space:nowrap;font-size:12px;line-height:18px}.hyt9BG_legendShare{min-width:48px;color:var(--dsw-alias-label-primary,#0b0e14);font-variant-numeric:tabular-nums;text-align:right;font-size:13px;line-height:20px}.hyt9BG_footnote,.hyt9BG_empty{color:var(--dsw-alias-label-tertiary,#5b6470);margin:0;font-size:12px;line-height:18px}@container hyt9BG_dcode-usage (width<=560px){.hyt9BG_statGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.hyt9BG_legendRow{grid-template-columns:auto minmax(0,1fr) auto}.hyt9BG_legendTokens{grid-area:2/2/auto/-1}}";
		const tagId = "@dsh-portable/session-manager/ModelsUsageCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/session-manager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var ModelsUsageCard_module_css_default = {
			"axis": "hyt9BG_axis",
			"axisTick": "hyt9BG_axisTick",
			"card": "hyt9BG_card",
			"chart": "hyt9BG_chart",
			"column": "hyt9BG_column",
			"dcode-usage": "hyt9BG_dcode-usage",
			"empty": "hyt9BG_empty",
			"footnote": "hyt9BG_footnote",
			"head": "hyt9BG_head",
			"heatCell": "hyt9BG_heatCell",
			"heatRow": "hyt9BG_heatRow",
			"heatmap": "hyt9BG_heatmap",
			"intro": "hyt9BG_intro",
			"legend": "hyt9BG_legend",
			"legendName": "hyt9BG_legendName",
			"legendRow": "hyt9BG_legendRow",
			"legendShare": "hyt9BG_legendShare",
			"legendTokens": "hyt9BG_legendTokens",
			"level0": "hyt9BG_level0",
			"level1": "hyt9BG_level1",
			"level2": "hyt9BG_level2",
			"level3": "hyt9BG_level3",
			"level4": "hyt9BG_level4",
			"panel": "hyt9BG_panel",
			"plot": "hyt9BG_plot",
			"range": "hyt9BG_range",
			"rangeActive": "hyt9BG_rangeActive",
			"ranges": "hyt9BG_ranges",
			"section": "hyt9BG_section",
			"segment": "hyt9BG_segment",
			"stack": "hyt9BG_stack",
			"stat": "hyt9BG_stat",
			"statGrid": "hyt9BG_statGrid",
			"statLabel": "hyt9BG_statLabel",
			"statValue": "hyt9BG_statValue",
			"swatch": "hyt9BG_swatch",
			"tab": "hyt9BG_tab",
			"tabActive": "hyt9BG_tabActive",
			"tabs": "hyt9BG_tabs",
			"tick": "hyt9BG_tick",
			"ticks": "hyt9BG_ticks",
			"title": "hyt9BG_title"
		};
		//#endregion
		//#region src/client/ModelsUsageCard.tsx
		const css = usageCardStyles(ModelsUsageCard_module_css_default);
		/** Render the shared statistics card in the official settings token domain. */
		function ModelsUsageCard({ useSessions, t }) {
			const list = useSessions((snapshot) => snapshot);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: ModelsUsageCard_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: ModelsUsageCard_module_css_default.title,
						children: t("usage.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: ModelsUsageCard_module_css_default.intro,
						children: t("usage.body")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageCards, {
						list,
						t,
						styles: css
					})
				]
			});
		}
		//#endregion
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
		//#region src/client/index.ts
		/** Stable Cordis plugin name. */
		const name = "session-manager-client";
		/**
		* Services this plugin cannot register without.
		*
		* `sessions` and `workspaces` are the two official controllers the archive
		* page mutates; cordis holds the plugin body until both have published, so
		* the inject faces below never see a half-built context. Reading the same
		* state needs no injection at all — `useSessions` and `useWorkspaces` are
		* global standard props delivered to every slot component.
		*/
		const inject = [
			"slots",
			"locale",
			"sessions",
			"workspaces"
		];
		/**
		* Order of the archive page in the official settings rail.
		*
		* Models is 10 and the plugin pages sit further down; the archive is a page
		* about the conversation corpus rather than about configuration, so it takes a
		* position after the feature pages and before the diagnostics ones.
		*/
		const SETTINGS_ARCHIVE_ORDER = 25;
		/** Order of the usage card inside the Models page footer seat. */
		const SETTINGS_MODELS_FOOTER_ORDER = 0;
		/**
		* Client plugin body.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(SESSION_MANAGER_NS, {
				zh,
				en
			}), "session-manager: dictionaries");
			const t = ctx.locale.bind(SESSION_MANAGER_NS);
			const archiveOperations = () => ({
				restore: (id) => ctx.workspaces.unarchiveSession(id),
				remove: (id) => ctx.sessions.delete(id),
				open: (id) => {
					ctx.sessions.open(id);
				},
				clear: () => {
					ctx.sessions.clear();
				}
			});
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "archived-chats",
				order: SETTINGS_ARCHIVE_ORDER,
				label: () => t("archive.title"),
				locale: SESSION_MANAGER_NS,
				inject: archiveOperations
			}, ArchivedChatsSection));
			ctx.slots.inject("settings.models.footer", () => ctx.slots.register({
				name: "settings.models.footer",
				id: "portable-usage",
				order: SETTINGS_MODELS_FOOTER_ORDER,
				locale: SESSION_MANAGER_NS
			}, ModelsUsageCard));
		}
		//#endregion
		exports.ACTIVITY_DAYS = ACTIVITY_DAYS;
		exports.ACTIVITY_WEEKS = ACTIVITY_WEEKS;
		exports.ArchivedChatsSection = ArchivedChatsSection;
		exports.DAY_MS = DAY_MS;
		exports.ModelsUsageCard = ModelsUsageCard;
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
		exports.useArchivedChats = useArchivedChats;
		exports.zh = zh;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map