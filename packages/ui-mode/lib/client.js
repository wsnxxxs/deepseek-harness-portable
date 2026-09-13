window.__ModuleLoader__.load({
	id: "@dsh-portable/ui-mode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#endregion
		//#region src/ui-mode.ts
		var import_ui_mode_contract = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
			/**
			* Dependency-free UI-mode contract shared by browser and Electron CJS entry points.
			*
			* `UI_MODES` is PRESENTATION ORDER, not a pair. Every switch surface — the two
			* in-page settings panels, the application menu, the tray menu, and the
			* command palette — renders this list in this order, so a mode never appears
			* in a different position depending on where it is offered. Adding a surface
			* means adding one entry here and its copy; nothing else enumerates modes.
			*
			* The official interface is listed first because it is the one surface that is
			* always present: the extension surfaces shadow it, and any of them failing to
			* load leaves it rendering. `DEFAULT_UI_MODE` is a separate decision.
			*/
			const UI_MODES = Object.freeze(["official", "dcode"]);
			function normalizeUiMode(value) {
				return UI_MODES.includes(value) ? value : void 0;
			}
			function withUiModeParam(url, mode, base) {
				const parsed = base === void 0 ? new URL(url) : new URL(url, base);
				parsed.searchParams.set("view", mode);
				return parsed.toString();
			}
			module.exports = Object.freeze({
				UI_MODES,
				DEFAULT_UI_MODE: "official",
				UI_MODE_QUERY_PARAM: "view",
				UI_MODE_STORAGE_KEY: "dsh.portable.uiMode",
				UI_MODE_CONFIG_FIELD: "uiMode",
				UI_MODE_BRIDGE_GLOBAL: "__DSH_UI_MODE_BRIDGE__",
				UI_MODE_EVENT: "dsh:ui-mode",
				UI_MODE_IPC_CHANNEL: "desktop:ui-mode",
				normalizeUiMode,
				withUiModeParam
			});
		})))(), 1);
		/** Every selectable front end, in presentation order. */
		const UI_MODES = import_ui_mode_contract.default.UI_MODES;
		/**
		* A surface without an explicit preference adopts the official interface.
		*/
		const DEFAULT_UI_MODE = import_ui_mode_contract.default.DEFAULT_UI_MODE;
		/** URL query parameter carrying an explicit mode (`?view=dcode`). */
		const UI_MODE_QUERY_PARAM = import_ui_mode_contract.default.UI_MODE_QUERY_PARAM;
		/** `localStorage` key holding the browser-side preference. */
		const UI_MODE_STORAGE_KEY = import_ui_mode_contract.default.UI_MODE_STORAGE_KEY;
		/** Desktop config field mirroring the preference for the next cold launch. */
		const UI_MODE_CONFIG_FIELD = import_ui_mode_contract.default.UI_MODE_CONFIG_FIELD;
		/** Renderer global the Electron preload installs to bridge desktop switch entries. */
		const UI_MODE_BRIDGE_GLOBAL = import_ui_mode_contract.default.UI_MODE_BRIDGE_GLOBAL;
		/** Window event the bridge dispatches when a desktop entry requests a mode. */
		const UI_MODE_EVENT = import_ui_mode_contract.default.UI_MODE_EVENT;
		/**
		* Narrow an untrusted value to a {@link UiMode}.
		* @param value - candidate from a URL, storage, config file or IPC message.
		* @returns the mode, or undefined when the value names none.
		*/
		function asUiMode(value) {
			return import_ui_mode_contract.default.normalizeUiMode(value);
		}
		/**
		* Resolve a mode from the first candidate that names one.
		* @param candidates - preference sources in descending priority.
		* @returns the winning mode, or {@link DEFAULT_UI_MODE} when none applies.
		*/
		function resolveUiMode(...candidates) {
			for (const candidate of candidates) {
				const mode = asUiMode(candidate);
				if (mode !== void 0) return mode;
			}
			return DEFAULT_UI_MODE;
		}
		/**
		* The next mode in presentation order — what a cycling entry switches to.
		*
		* This replaced a two-mode `otherUiMode`. A keyboard shortcut or a menu
		* accelerator has no list to choose from, so it needs a total order rather
		* than an opposite; wrapping keeps every surface reachable from every other.
		* @param mode - current mode.
		* @param direction - `1` for the next surface, `-1` for the previous.
		* @returns the mode a cycling entry selects.
		*/
		function cycleUiMode(mode, direction = 1) {
			const index = UI_MODES.indexOf(mode);
			if (index < 0) return DEFAULT_UI_MODE;
			return UI_MODES[(index + direction + UI_MODES.length) % UI_MODES.length];
		}
		/**
		* Rewrite a page URL so a cold reload boots the given mode.
		*
		* Used by the desktop shell when it loads the harness URL, and by the browser
		* half when it records the live switch in the address bar. The parameter is
		* always written explicitly (never dropped for the default) so a reload of a
		* copied URL is reproducible.
		* @param url - absolute or relative URL to rewrite.
		* @param mode - mode the reloaded page must adopt.
		* @param base - base for relative inputs; required in non-browser callers.
		* @returns the rewritten URL string, preserving every other query parameter.
		*/
		function withUiModeParam(url, mode, base) {
			return import_ui_mode_contract.default.withUiModeParam(url, mode, base);
		}
		/**
		* Read the mode named by a URL's query string.
		* @param search - `location.search` or an equivalent query string.
		* @returns the requested mode, or undefined when the parameter is absent or unknown.
		*/
		function uiModeFromSearch(search) {
			return asUiMode(new URLSearchParams(search).get(UI_MODE_QUERY_PARAM));
		}
		//#endregion
		//#region src/client/store.ts
		/**
		* The browser-side owner of the active UI mode.
		*
		* One store arbitrates every switch entry point — the URL parameter, the
		* in-page settings panels of every surface, the Electron application menu, the
		* tray menu, and the keyboard shortcut. A switch is a slot re-registration
		* inside the live page: the DSH Runtime, the Host connection, the Session list
		* and every open Conversation stay exactly as they were.
		*
		* Resolution order at boot, highest first:
		* 1. `?view=` on the page URL — the reproducible entry a desktop shell or a
		*    copied link can force.
		* 2. `localStorage` — the last switch made in this browser profile.
		* 3. The desktop bridge's reported config value — what the Electron shell
		*    persisted for the next cold launch.
		* 4. {@link DEFAULT_UI_MODE}.
		*
		* The Cordis client plugin owns one store and publishes it as `ctx.uiMode`.
		* Alternate surfaces consume that service instead of relying on this module's
		* identity: independently bundled plugins can otherwise instantiate separate
		* stores and disagree inside one page.
		* @module @dsh-portable/ui-mode/client/store
		*/
		/** Read the preload-installed bridge, if this page runs inside the desktop shell. */
		function readBridge() {
			const bridge = globalThis[UI_MODE_BRIDGE_GLOBAL];
			return typeof bridge === "object" && bridge !== null ? bridge : void 0;
		}
		/** Read the stored preference, tolerating a storage-denied browser profile. */
		function readStored() {
			try {
				return asUiMode(globalThis.localStorage?.getItem(UI_MODE_STORAGE_KEY));
			} catch {
				return;
			}
		}
		/** Persist the preference, tolerating a storage-denied browser profile. */
		function writeStored(mode) {
			try {
				globalThis.localStorage?.setItem(UI_MODE_STORAGE_KEY, mode);
			} catch {}
		}
		/**
		* Reflect the active mode in the address bar without navigating.
		*
		* This is what makes a reload reproduce the surface the operator was looking
		* at, and what makes `?view=official` a real entry point rather than a
		* boot-only flag.
		*/
		function writeLocation(mode) {
			const history = globalThis.history;
			const location = globalThis.location;
			if (history === void 0 || location === void 0 || typeof history.replaceState !== "function") return;
			try {
				const next = withUiModeParam(location.href, mode);
				if (next !== location.href) history.replaceState(history.state, "", next);
			} catch {}
		}
		/**
		* Create a standalone mode store and wire every external entry point.
		*
		* Plugin code consumes `ctx.uiMode`; this factory exists for the owning service
		* and tests that need an isolated instance.
		* @returns the store; the caller owns {@link UiModeStore.dispose}.
		*/
		function createUiModeStore() {
			const bridge = readBridge();
			let current = resolveUiMode(uiModeFromSearch(globalThis.location?.search ?? ""), readStored(), bridge?.configured);
			const listeners = /* @__PURE__ */ new Set();
			const disposers = [];
			const announced = /* @__PURE__ */ new Map();
			const notify = () => {
				for (const listener of [...listeners]) listener(current);
			};
			const isAvailable = (mode) => mode === "official" || (announced.get(mode) ?? 0) > 0;
			/** Push the available set to the desktop shell, in presentation order. */
			const reportAvailability = () => {
				bridge?.setAvailable?.(UI_MODES.filter(isAvailable));
			};
			writeLocation(current);
			const apply = (next, origin) => {
				if (next === current) return;
				current = next;
				writeStored(next);
				writeLocation(next);
				if (origin === "page") bridge?.setMode?.(next);
				notify();
			};
			if (typeof bridge?.onMode === "function") disposers.push(bridge.onMode((mode) => {
				apply(resolveUiMode(mode), "desktop");
			}));
			const onWindowEvent = (event) => {
				const detail = event.detail;
				const requested = asUiMode(typeof detail === "string" ? detail : detail?.mode);
				if (requested !== void 0) apply(requested, "page");
			};
			globalThis.addEventListener?.(UI_MODE_EVENT, onWindowEvent);
			disposers.push(() => {
				globalThis.removeEventListener?.(UI_MODE_EVENT, onWindowEvent);
			});
			const onStorage = (event) => {
				if (event.key !== UI_MODE_STORAGE_KEY) return;
				const requested = asUiMode(event.newValue);
				if (requested !== void 0) apply(requested, "desktop");
			};
			globalThis.addEventListener?.("storage", onStorage);
			disposers.push(() => {
				globalThis.removeEventListener?.("storage", onStorage);
			});
			return {
				get: () => current,
				available: isAvailable,
				announce: (mode) => {
					const before = announced.get(mode) ?? 0;
					announced.set(mode, before + 1);
					if (before === 0) {
						notify();
						reportAvailability();
					}
					let withdrawn = false;
					return () => {
						if (withdrawn) return;
						withdrawn = true;
						const count = (announced.get(mode) ?? 1) - 1;
						if (count > 0) announced.set(mode, count);
						else {
							announced.delete(mode);
							notify();
							reportAvailability();
						}
					};
				},
				set: (mode, origin = "page") => {
					apply(mode, origin);
				},
				cycle: (direction = 1) => {
					apply(cycleUiMode(current, direction), "page");
				},
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				dispose: () => {
					for (const dispose of disposers.splice(0)) dispose();
					listeners.clear();
				}
			};
		}
		//#endregion
		//#region src/client/service.ts
		/** Cordis owner of the page-wide UI mode. */
		/** Page-wide UI-mode service consumed by independently bundled surfaces. */
		var UiModeService = class extends _deepseek_ai_cordis.Service {
			store = createUiModeStore();
			/** Read the active surface. */
			get = () => this.store.get();
			/** Whether a surface for one mode is present in this build. */
			available = (mode) => this.store.available(mode);
			/**
			* Declare that this page can render one mode.
			* @param mode - the mode the caller renders.
			* @returns a disposer withdrawing the announcement.
			*/
			announce = (mode) => this.store.announce(mode);
			/** Switch to one surface. */
			set = (mode, origin = "page") => {
				this.store.set(mode, origin);
			};
			/** Advance through the surface roster. */
			cycle = (direction = 1) => {
				this.store.cycle(direction);
			};
			/** Subscribe to active-surface changes. */
			subscribe = (listener) => this.store.subscribe(listener);
			/**
			* @param ctx - owning client plugin context.
			*/
			constructor(ctx) {
				super(ctx, "uiMode");
				ctx.effect(() => () => {
					this.store.dispose();
				}, "ui-mode: store");
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/** Namespace this package registers its dictionaries under. */
		const UI_MODE_NS = "uiMode";
		/** Per-mode copy keys, so a switch renders from {@link UI_MODES} alone. */
		const MODE_COPY = {
			official: {
				title: "mode.official",
				body: "mode.official.body"
			},
			dcode: {
				title: "mode.dcode",
				body: "mode.dcode.body"
			}
		};
		const en = {
			"interface": "Interface",
			"interface.body": "Choose which front end this window shows. All of them read the same runtime.",
			"mode.official": "Official",
			"mode.official.body": "The official DeepSeek Harness interface, unchanged.",
			"mode.dcode": "Workbench",
			"mode.dcode.body": "A compact desktop layout with git tools, goal and progress panels.",
			"unavailable": "Not available in this build.",
			"unavailable.selected": "This window is showing the official interface, because the selected one is not part of this build."
		};
		const zh = {
			"interface": "界面设置",
			"interface.body": "选择当前窗口使用哪一套前端。它们读取同一个运行时。",
			"mode.official": "官方版",
			"mode.official.body": "官方 DeepSeek Harness 界面，保持原样。",
			"mode.dcode": "工作台",
			"mode.dcode.body": "紧凑的桌面布局，带 Git 工具、目标与进度面板。",
			"unavailable": "当前构建不包含此界面。",
			"unavailable.selected": "所选界面不属于当前构建，本窗口正在显示官方版界面。"
		};
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\packages\ui-mode\src\client\InterfaceSettingsSection.module.css.mjs
		const css = ".p1jxaq_root{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:16px 0;display:flex}.p1jxaq_title{color:var(--dsw-alias-label-primary);margin:0;font-size:14px;font-weight:400;line-height:22px}.p1jxaq_lead{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;font-weight:400;line-height:18px}.p1jxaq_choice{flex-wrap:wrap;align-items:stretch;gap:8px;display:flex}.p1jxaq_option{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);min-height:84px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border-radius:16px;flex-direction:column;flex:180px;justify-content:center;align-items:center;gap:4px;padding:16px 24px;font-size:14px;line-height:22px;transition:background .12s,border-color .12s;display:flex}.p1jxaq_option:hover:not(.p1jxaq_optionActive){background:var(--dsw-alias-interactive-bg-hover)}.p1jxaq_optionActive{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}.p1jxaq_optionTitle{color:var(--dsw-alias-label-primary);text-align:center;font-size:14px;font-weight:400;line-height:22px}.p1jxaq_optionBody{width:100%;max-width:280px;color:var(--dsw-alias-label-tertiary);text-align:center;font-size:12px;line-height:18px}.p1jxaq_optionDisabled{cursor:default;opacity:.5}.p1jxaq_optionDisabled:hover{background:0 0}.p1jxaq_notice{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}";
		const tagId = "@dsh-portable/ui-mode/InterfaceSettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/ui-mode";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var InterfaceSettingsSection_module_css_default = {
			"choice": "p1jxaq_choice",
			"lead": "p1jxaq_lead",
			"notice": "p1jxaq_notice",
			"option": "p1jxaq_option",
			"optionActive": "p1jxaq_optionActive",
			"optionBody": "p1jxaq_optionBody",
			"optionDisabled": "p1jxaq_optionDisabled",
			"optionTitle": "p1jxaq_optionTitle",
			"root": "p1jxaq_root",
			"title": "p1jxaq_title"
		};
		//#endregion
		//#region src/client/InterfaceSettingsSection.tsx
		/**
		* The front-end switch inside the official General settings page.
		*
		* The requirement is symmetric: every surface must be able to reach every
		* other one. Each extension surface carries its own copy of this control, and
		* this is the counterpart registered into the official General settings page,
		* so an operator who switched to the official UI is never stranded there.
		*
		* It renders inside the official shell, so it takes the slot framework's
		* standard locale prop and the Host's theme aliases rather than any surface's
		* own token scope.
		*
		* There is exactly ONE registration of this row, and it belongs to this
		* package rather than to a surface: two surfaces each registering their own
		* would put two switches in one page, and a surface that failed to load would
		* take the ability to leave it along with it.
		* @module @dsh-portable/ui-mode/client/InterfaceSettingsSection
		*/
		/** The interface switch, one option per registered surface. */
		function InterfaceSettingsSection({ mode, t }) {
			const active = (0, react.useSyncExternalStore)(mode.subscribe, mode.get, mode.get);
			const copy = (key) => t?.(key) ?? en[key];
			const canRender = (id) => mode.available?.(id) ?? true;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: InterfaceSettingsSection_module_css_default.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: InterfaceSettingsSection_module_css_default.title,
						children: copy("interface")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: InterfaceSettingsSection_module_css_default.lead,
						children: copy("interface.body")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: InterfaceSettingsSection_module_css_default.choice,
						role: "radiogroup",
						"aria-label": copy("interface"),
						children: UI_MODES.map((id) => {
							const usable = canRender(id);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								role: "radio",
								className: `${InterfaceSettingsSection_module_css_default.option} ${active === id ? InterfaceSettingsSection_module_css_default.optionActive : ""} ${usable ? "" : InterfaceSettingsSection_module_css_default.optionDisabled}`,
								"aria-checked": active === id,
								disabled: !usable,
								onClick: () => {
									mode.set(id);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.optionTitle,
									children: copy(MODE_COPY[id].title)
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.optionBody,
									children: usable ? copy(MODE_COPY[id].body) : copy("unavailable")
								})]
							}, id);
						})
					}),
					canRender(active) ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: InterfaceSettingsSection_module_css_default.notice,
						role: "status",
						children: copy("unavailable.selected")
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Stable Cordis plugin name. */
		const name = "ui-mode-client";
		/**
		* `slots` and `locale` are the whole dependency set: this plugin contributes
		* one settings row and nothing else. It deliberately does NOT inject any
		* surface package — the vocabulary must load even when every extension surface
		* fails to, so that the official UI still offers a way back.
		*/
		const inject = ["slots", "locale"];
		/**
		* Order of the interface row in the official General settings page.
		*
		* Appearance is 10; the interface a window shows is the same kind of decision
		* one step out, so it sits directly beneath it.
		*/
		const SETTINGS_GENERAL_ITEM_ORDER = 10.5;
		/**
		* Client plugin body.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(UI_MODE_NS, {
				zh,
				en
			}), "ui-mode: dictionaries");
			const mode = new UiModeService(ctx);
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "portable-interface",
				order: SETTINGS_GENERAL_ITEM_ORDER,
				locale: UI_MODE_NS,
				inject: () => ({ mode })
			}, InterfaceSettingsSection));
		}
		//#endregion
		exports.DEFAULT_UI_MODE = DEFAULT_UI_MODE;
		exports.InterfaceSettingsSection = InterfaceSettingsSection;
		exports.MODE_COPY = MODE_COPY;
		exports.UI_MODES = UI_MODES;
		exports.UI_MODE_BRIDGE_GLOBAL = UI_MODE_BRIDGE_GLOBAL;
		exports.UI_MODE_CONFIG_FIELD = UI_MODE_CONFIG_FIELD;
		exports.UI_MODE_EVENT = UI_MODE_EVENT;
		exports.UI_MODE_NS = UI_MODE_NS;
		exports.UI_MODE_QUERY_PARAM = UI_MODE_QUERY_PARAM;
		exports.UI_MODE_STORAGE_KEY = UI_MODE_STORAGE_KEY;
		exports.apply = apply;
		exports.asUiMode = asUiMode;
		exports.createUiModeStore = createUiModeStore;
		exports.cycleUiMode = cycleUiMode;
		exports.en = en;
		exports.inject = inject;
		exports.name = name;
		exports.readBridge = readBridge;
		exports.resolveUiMode = resolveUiMode;
		exports.uiModeFromSearch = uiModeFromSearch;
		exports.withUiModeParam = withUiModeParam;
		exports.zh = zh;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map