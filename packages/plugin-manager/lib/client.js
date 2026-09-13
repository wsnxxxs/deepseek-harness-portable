window.__ModuleLoader__.load({
	id: "@dsh-portable/plugin-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\packages\plugin-manager\src\client\PortablePluginsTab.module.css.mjs
		const css = "._7xhgXa_root{flex-direction:column;gap:12px;display:flex}._7xhgXa_head{align-items:baseline;gap:12px;display:flex}._7xhgXa_lead{color:var(--dsw-alias-label-tertiary,#5b6470);flex:auto;margin:0;font-size:13px;line-height:20px}._7xhgXa_empty,._7xhgXa_notice{border:1px solid var(--dsw-alias-border-l2,#e4e7ec);color:var(--dsw-alias-label-tertiary,#5b6470);text-align:center;border-radius:12px;padding:24px 12px;font-size:14px;line-height:22px}._7xhgXa_list{border:1px solid var(--dsw-alias-border-l2,#e4e7ec);border-radius:12px;flex-direction:column;margin:0;padding:0;list-style:none;display:flex;overflow:hidden}._7xhgXa_row{border-bottom:1px solid var(--dsw-alias-border-l2,#e4e7ec);align-items:flex-start;gap:12px;padding:12px;display:flex}._7xhgXa_row:last-child{border-bottom:none}._7xhgXa_text{flex-direction:column;flex:auto;gap:2px;min-width:0;display:flex}._7xhgXa_name{color:var(--dsw-alias-label-primary,#0b0e14);align-items:center;gap:8px;font-size:14px;line-height:22px;display:flex}._7xhgXa_meta,._7xhgXa_description{color:var(--dsw-alias-label-tertiary,#5b6470);font-size:12px;line-height:18px}._7xhgXa_description{-webkit-line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}._7xhgXa_tag{background:var(--dsw-specific-selector,#0000000d);color:var(--dsw-alias-label-secondary,#3d444d);border-radius:6px;flex:none;padding:0 6px;font-size:11px;line-height:18px}._7xhgXa_pending{background:var(--dsw-alias-fill-warning-secondary,#f790091f);color:var(--dsw-alias-label-warning,#b54708)}._7xhgXa_actions{flex:none;align-items:center;gap:8px;display:flex}._7xhgXa_error{color:var(--dsw-alias-label-error,#d92d20);font-size:13px;line-height:20px}._7xhgXa_restart{color:var(--dsw-alias-label-tertiary,#5b6470);font-size:12px;line-height:18px}";
		const tagId = "@dsh-portable/plugin-manager/PortablePluginsTab.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/plugin-manager";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var PortablePluginsTab_module_css_default = {
			"actions": "_7xhgXa_actions",
			"description": "_7xhgXa_description",
			"empty": "_7xhgXa_empty",
			"error": "_7xhgXa_error",
			"head": "_7xhgXa_head",
			"lead": "_7xhgXa_lead",
			"list": "_7xhgXa_list",
			"meta": "_7xhgXa_meta",
			"name": "_7xhgXa_name",
			"notice": "_7xhgXa_notice",
			"pending": "_7xhgXa_pending",
			"restart": "_7xhgXa_restart",
			"root": "_7xhgXa_root",
			"row": "_7xhgXa_row",
			"tag": "_7xhgXa_tag",
			"text": "_7xhgXa_text"
		};
		//#endregion
		//#region src/client/PortablePluginsTab.tsx
		/**
		* The built-in features page of the official Plugins settings section.
		*
		* It answers the question upstream's read-only inventory cannot: which of this
		* distribution's own feature packages are live, and how do I switch one off.
		* The rows come straight off the running Loader, so a build that ships a new
		* feature lists it here without this component learning its name.
		* @module @dsh-portable/plugin-manager/client/PortablePluginsTab
		*/
		/** The built-in features page. */
		function PortablePluginsTab(props) {
			const { api, t } = props;
			const [rows, setRows] = (0, react.useState)([]);
			const [loading, setLoading] = (0, react.useState)(true);
			const [busyName, setBusyName] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const load = (0, react.useCallback)(async () => {
				setLoading(true);
				const answer = await api.list();
				setLoading(false);
				if (answer.ok) {
					setRows(answer.value.plugins);
					setError(void 0);
					return;
				}
				setError(answer.error.message);
			}, [api]);
			(0, react.useEffect)(() => {
				load();
			}, [load]);
			const toggle = async (row) => {
				const target = !(row.pending ?? row.enabled);
				setBusyName(row.name);
				const answer = await api.setEnabled(row.name, target);
				setBusyName(void 0);
				if (!answer.ok) {
					setError(answer.error.message);
					return;
				}
				setError(void 0);
				await load();
			};
			if (!api.available) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PortablePluginsTab_module_css_default.notice,
				children: t("unavailable")
			});
			const pendingCount = rows.filter((row) => row.pending !== void 0).length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: PortablePluginsTab_module_css_default.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PortablePluginsTab_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PortablePluginsTab_module_css_default.lead,
							children: t("lead")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							disabled: loading,
							onClick: () => {
								load();
							},
							children: loading ? t("loading") : t("refresh")
						})]
					}),
					loading && rows.length === 0 ? null : rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PortablePluginsTab_module_css_default.empty,
						children: t("empty")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: PortablePluginsTab_module_css_default.list,
						children: rows.map((row) => {
							const desired = row.pending ?? row.enabled;
							const busy = busyName === row.name;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: PortablePluginsTab_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: PortablePluginsTab_module_css_default.text,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: PortablePluginsTab_module_css_default.name,
											children: [
												row.name,
												row.enabled ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: PortablePluginsTab_module_css_default.tag,
													children: t("off")
												}),
												row.pending === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: `${PortablePluginsTab_module_css_default.tag} ${PortablePluginsTab_module_css_default.pending}`,
													children: row.pending ? t("pendingOn") : t("pendingOff")
												})
											]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PortablePluginsTab_module_css_default.meta,
											children: row.version === null ? t("unknownVersion") : t("version", { version: row.version })
										}),
										row.description === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PortablePluginsTab_module_css_default.description,
											children: row.description
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: PortablePluginsTab_module_css_default.actions,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										disabled: busy,
										onClick: () => {
											toggle(row);
										},
										children: busy ? t("working") : desired ? t("disable") : t("enable")
									})
								})]
							}, row.name);
						})
					}),
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PortablePluginsTab_module_css_default.error,
						role: "alert",
						children: error
					}),
					pendingCount === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PortablePluginsTab_module_css_default.restart,
						children: t("restart")
					})
				]
			});
		}
		//#endregion
		//#region src/host/contract.ts
		/**
		* The `/portable-plugins` channel contract. Types and endpoint names only, so
		* the browser half can be typed against it without importing host code.
		* @module @dsh-portable/plugin-manager/host/contract
		*/
		/** Connection RPC channel this plugin claims. */
		const PORTABLE_PLUGINS_CHANNEL = "/portable-plugins";
		//#endregion
		//#region src/client/rpc.ts
		/**
		* Typed browser face of the `/portable-plugins` channel.
		*
		* The host answers with the `{ ok, value } | { ok, error }` envelope; this
		* module's job is to keep the tab off `unknown` and to turn a transport
		* rejection into the same envelope a business refusal produces, so a settings
		* page degrades to an explanatory empty state rather than a crash.
		* @module @dsh-portable/plugin-manager/client/rpc
		*/
		function transportFailure(message) {
			return {
				ok: false,
				error: {
					code: "unavailable",
					message,
					details: {}
				}
			};
		}
		/** Narrow an untyped answer so protocol drift surfaces as a refusal. */
		function envelope(answer) {
			if (typeof answer !== "object" || answer === null) return transportFailure("malformed /portable-plugins answer");
			const value = answer;
			if (value.ok === true) return {
				ok: true,
				value: value.value
			};
			if (value.ok === false && typeof value.error === "object" && value.error !== null) return {
				ok: false,
				error: value.error
			};
			return transportFailure("malformed /portable-plugins answer");
		}
		/**
		* Build the browser face over one Connection carrier.
		* @param carrier - the connection service, or undefined when none is present.
		* @returns the typed API.
		*/
		function createPortablePluginApi(carrier) {
			const call = async (endpoint, payload) => {
				if (carrier === void 0) return transportFailure("the /portable-plugins channel is unavailable on this connection");
				try {
					return envelope(await carrier.rpc.call("/api", `${PORTABLE_PLUGINS_CHANNEL.slice(1)}/${endpoint}`, payload));
				} catch (cause) {
					return transportFailure(cause instanceof Error ? cause.message : String(cause));
				}
			};
			return {
				available: carrier !== void 0,
				list: () => call("list", {}),
				setEnabled: (name, enabled) => call("set-enabled", {
					name,
					enabled
				})
			};
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Copy for the built-in features settings tab.
		* @module @dsh-portable/plugin-manager/client/locales
		*/
		/** Dictionary namespace owned by this plugin. */
		const PLUGIN_MANAGER_NS = "portablePlugins";
		const zh = {
			tab: "内置功能",
			lead: "随本应用一同发布的功能插件。它们不是安装上来的包，所以只能开启或关闭，不能卸载；关闭后重启即可生效，随时可以再打开。",
			empty: "这个组合里没有内置功能插件。",
			loading: "正在读取…",
			refresh: "刷新",
			enable: "启用",
			disable: "停用",
			working: "处理中…",
			off: "已关闭",
			version: "v{version}",
			unknownVersion: "版本未知",
			pendingOn: "重启后启用",
			pendingOff: "重启后停用",
			restart: "重启 harness 后生效。",
			unavailable: "当前连接无法管理内置功能。"
		};
		const en = {
			tab: "Built-ins",
			lead: "Feature plugins shipped with this application. They are not installed packages, so they switch off rather than uninstall — a restart applies the change, and you can switch one back on at any time.",
			empty: "This assembly mounts no built-in feature plugins.",
			loading: "Loading…",
			refresh: "Refresh",
			enable: "Enable",
			disable: "Disable",
			working: "Working…",
			off: "Off",
			version: "v{version}",
			unknownVersion: "Version unknown",
			pendingOn: "On after restart",
			pendingOff: "Off after restart",
			restart: "Takes effect after restarting the harness.",
			unavailable: "Built-in features cannot be managed over this connection."
		};
		//#endregion
		//#region src/client/index.ts
		/** Stable Cordis plugin name. */
		const name = "plugin-manager-client";
		/**
		* Services this plugin cannot register without.
		*
		* `connection` is the RPC carrier the page calls the host over. It is injected
		* rather than probed so the tab never mounts against a context whose carrier
		* has not published yet; a deployment with no carrier at all still gets the
		* page, which explains itself instead of failing.
		*/
		const inject = [
			"slots",
			"locale",
			"connection"
		];
		/**
		* Order within the official Plugins section.
		*
		* Upstream's configuration page is 0 and the marketplace's own tabs are 5 and
		* 6, so 3 puts the harness's own features between "how the shipped plugins are
		* configured" and "what was installed from outside".
		*/
		const PLUGINS_TAB_ORDER = 3;
		/**
		* Client plugin body.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(PLUGIN_MANAGER_NS, {
				zh,
				en
			}), "plugin-manager: dictionaries");
			const t = ctx.locale.bind(PLUGIN_MANAGER_NS);
			const api = createPortablePluginApi(ctx.get("connection"));
			const injected = () => ({ api });
			ctx.slots.inject("settings.plugins.tab", () => ctx.slots.register({
				name: "settings.plugins.tab",
				id: "portable-builtins",
				order: PLUGINS_TAB_ORDER,
				label: () => t("tab"),
				locale: PLUGIN_MANAGER_NS,
				inject: injected
			}, PortablePluginsTab));
		}
		//#endregion
		exports.PLUGIN_MANAGER_NS = PLUGIN_MANAGER_NS;
		exports.PortablePluginsTab = PortablePluginsTab;
		exports.apply = apply;
		exports.createPortablePluginApi = createPortablePluginApi;
		exports.en = en;
		exports.inject = inject;
		exports.name = name;
		exports.zh = zh;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map