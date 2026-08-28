window.__ModuleLoader__.load({
	id: "@dsh-portable/dcode-ui",
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
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _dsh_portable_interactive_learning_client = require("@dsh-portable/interactive-learning/client");
		//#endregion
		//#region src/ui-mode.ts
		var import_ui_mode_contract = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
			/** Dependency-free UI-mode contract shared by browser and Electron CJS entry points. */
			const UI_MODES = Object.freeze(["dcode", "official"]);
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
				DEFAULT_UI_MODE: "dcode",
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
		import_ui_mode_contract.default.UI_MODES;
		/**
		* The mode a surface without an explicit preference adopts. The modern
		* workbench is the default; the official UI is never removed, only unselected.
		*/
		const DEFAULT_UI_MODE = import_ui_mode_contract.default.DEFAULT_UI_MODE;
		/** URL query parameter carrying an explicit mode (`?view=dcode`, `?view=official`). */
		const UI_MODE_QUERY_PARAM = import_ui_mode_contract.default.UI_MODE_QUERY_PARAM;
		/** `localStorage` key holding the browser-side preference. */
		const UI_MODE_STORAGE_KEY = import_ui_mode_contract.default.UI_MODE_STORAGE_KEY;
		import_ui_mode_contract.default.UI_MODE_CONFIG_FIELD;
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
		//#region src/client/mode.ts
		/**
		* The browser-side owner of the active UI mode.
		*
		* One store arbitrates every switch entry point — the URL parameter, the
		* in-page settings panels of both surfaces, the Electron application menu,
		* the tray menu, and the keyboard shortcut. A switch is a slot
		* re-registration inside the live page: the DSH Runtime, the Host connection,
		* the Session list and every open Conversation stay exactly as they were.
		*
		* Resolution order at boot, highest first:
		* 1. `?view=` on the page URL — the reproducible entry a desktop shell or a
		*    copied link can force.
		* 2. `localStorage` — the last switch made in this browser profile.
		* 3. The desktop bridge's reported config value — what the Electron shell
		*    persisted for the next cold launch.
		* 4. {@link DEFAULT_UI_MODE}.
		* @module @dsh-portable/dcode-ui/client/mode
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
		* Create the page's single mode store and wire every external entry point.
		*
		* @returns the store; the caller owns {@link UiModeStore.dispose}.
		*/
		function createUiModeStore() {
			const bridge = readBridge();
			let current = resolveUiMode(uiModeFromSearch(globalThis.location?.search ?? ""), readStored(), bridge?.configured);
			const listeners = /* @__PURE__ */ new Set();
			const disposers = [];
			writeLocation(current);
			const apply = (next, origin) => {
				if (next === current) return;
				current = next;
				writeStored(next);
				writeLocation(next);
				if (origin === "page") bridge?.setMode?.(next);
				for (const listener of [...listeners]) listener(next);
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
				set: (mode, origin = "page") => {
					apply(mode, origin);
				},
				toggle: () => {
					apply(current === "dcode" ? "official" : "dcode", "page");
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
		//#region src/client/state/navigation.ts
		/**
		* Workbench-local view state.
		*
		* Strictly presentation: which top-level surface is showing, which aside tab
		* is selected, whether the palette is open, which file the diff viewer is
		* looking at. Nothing here duplicates a Host fact — the current session, the
		* workspace registry and the transcript all stay with their owning services.
		*
		* It is an external store rather than component state so the keyboard layer
		* and the command palette can drive navigation without threading callbacks
		* through the tree, and so a surface switch does not lose the operator's
		* place in the panels.
		* @module @dsh-portable/dcode-ui/client/state/navigation
		*/
		const INITIAL = {
			view: "session",
			aside: "changes",
			asideOpen: true,
			railOpen: true,
			paletteOpen: false,
			settingsSection: "general",
			diff: void 0,
			inspectedCallId: void 0
		};
		/**
		* Create the workbench's view-state store.
		* @returns a store shared by the tree, the keyboard layer and the palette.
		*/
		function createNavigationStore() {
			let state = INITIAL;
			const listeners = /* @__PURE__ */ new Set();
			const emit = () => {
				for (const listener of [...listeners]) listener();
			};
			const patch = (next) => {
				const merged = {
					...state,
					...next
				};
				if (Object.keys(next).every((key) => Object.is(state[key], merged[key]))) return;
				state = merged;
				emit();
			};
			return {
				getSnapshot: () => state,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				patch,
				show: (view) => {
					patch({
						view,
						paletteOpen: false
					});
				},
				openSettings: (section) => {
					patch({
						view: "settings",
						settingsSection: section,
						paletteOpen: false
					});
				},
				openAside: (tab) => {
					patch({
						aside: tab,
						asideOpen: true
					});
				},
				openDiff: (path, staged = false) => {
					patch({
						diff: {
							path,
							staged
						},
						aside: "changes",
						asideOpen: true
					});
				},
				closeDiff: () => {
					patch({ diff: void 0 });
				},
				inspect: (callId) => {
					patch({
						inspectedCallId: callId,
						aside: "details",
						asideOpen: true
					});
				},
				togglePalette: (open) => {
					patch({ paletteOpen: open ?? !state.paletteOpen });
				},
				toggleRail: () => {
					patch({ railOpen: !state.railOpen });
				},
				toggleAside: () => {
					patch({ asideOpen: !state.asideOpen });
				}
			};
		}
		/**
		* Read the view state.
		* @param store - the workbench store.
		* @returns the current state.
		*/
		function useNavigation(store) {
			return (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot);
		}
		//#endregion
		//#region src/client/rpc.ts
		const CHANNEL = "/dcode";
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
		/**
		* Narrow an untyped answer to the envelope, so a protocol drift surfaces as a
		* refusal rather than as an undefined field deep inside a component.
		*/
		function envelope(answer) {
			if (typeof answer !== "object" || answer === null) return transportFailure("malformed /dcode answer");
			const value = answer;
			if (value.ok === true) return {
				ok: true,
				value: value.value
			};
			if (value.ok === false && typeof value.error === "object" && value.error !== null) return {
				ok: false,
				error: value.error
			};
			return transportFailure("malformed /dcode answer");
		}
		/**
		* Build the channel client.
		* @param carrier - the Connection service, absent on a page without one.
		* @returns a client that refuses every call when no carrier exists.
		*/
		function createDcodeApi(carrier) {
			const call = async (endpoint, payload) => {
				if (carrier === void 0) return transportFailure("the /dcode channel is unavailable on this connection");
				try {
					return envelope(await carrier.rpc.call(CHANNEL, endpoint, payload));
				} catch (cause) {
					return transportFailure(cause instanceof Error ? cause.message : String(cause));
				}
			};
			return {
				available: carrier !== void 0,
				status: (cwd) => call("git/status", { cwd }),
				diff: (cwd, path, staged = false) => call("git/diff", {
					cwd,
					path,
					staged
				}),
				branches: (cwd) => call("git/branches", { cwd }),
				commit: (cwd, message, paths) => call("git/commit", {
					cwd,
					message,
					...paths === void 0 ? {} : { paths }
				}),
				undo: (cwd, paths) => call("git/undo", {
					cwd,
					paths
				}),
				readFile: (cwd, path) => call("file/read", {
					cwd,
					path
				})
			};
		}
		/**
		* The learning channel's browser face, reused verbatim from the existing
		* Interactive Learning host broker: the workbench's learning surfaces call
		* the very same endpoints the official UI's learning views call, so there is
		* exactly one learning backend and one vault state.
		* @param carrier - the Connection service.
		* @returns an endpoint caller, or one that rejects when no carrier exists.
		*/
		function createLearningCall(carrier) {
			return async (endpoint, payload) => {
				if (carrier === void 0) throw new Error("the learning channel is unavailable on this connection");
				return await carrier.rpc.call("/interactive-learning", endpoint, payload);
			};
		}
		//#endregion
		//#region src/client/theme.ts
		/** The preferences the workbench's switch offers, in display order. */
		const THEME_PREFERENCES = [
			"light",
			"dark",
			"system"
		];
		/** Global the desktop preload publishes the resolved window backdrop on. */
		const SURFACE_BRIDGE_GLOBAL = "__DSH_DESKTOP_SURFACE__";
		/** Body/root attribute marking a document whose ground must stay translucent. */
		const ACRYLIC_ATTRIBUTE = "data-dcode-acrylic";
		/** The `ui-layout` presenter's body attribute; present only for dark palettes. */
		const DARK_BODY_ATTRIBUTE = "data-ds-dark-theme";
		/**
		* Read the backdrop the desktop shell reported for this window.
		* @returns the material, or `none` on any surface without the bridge.
		*/
		function readWindowMaterial() {
			if (typeof globalThis === "undefined") return "none";
			const material = globalThis[SURFACE_BRIDGE_GLOBAL]?.material;
			return material === "acrylic" || material === "mica" ? material : "none";
		}
		/**
		* Narrow an arbitrary value to a theme preference.
		* @param value - candidate, typically off a snapshot.
		* @returns the preference, or undefined when it is not one of the three.
		*/
		function asThemePreference(value) {
			return value === "light" || value === "dark" || value === "system" ? value : void 0;
		}
		/**
		* Build the appearance store for a live client context.
		*
		* Three change sources are watched, because the authoritative one depends on
		* what the assembly contains: the theme service's own event where there is a
		* service, the presenter's body attribute (which also covers a theme applied
		* by anything else), and the OS query for a `system` preference.
		* @param events - the client context, used only as an event bus.
		* @param theme - the theme service, when the assembly has one.
		* @returns the store handed to the React tree.
		*/
		function createAppearanceStore(events, theme) {
			const listeners = /* @__PURE__ */ new Set();
			const notify = () => {
				for (const listener of listeners) listener();
			};
			let sourceDisposers;
			const media = typeof globalThis.matchMedia === "function" ? globalThis.matchMedia("(prefers-color-scheme: dark)") : void 0;
			const getScheme = () => {
				const active = theme?.getTheme().active.colorScheme;
				if (active !== void 0) return active;
				if (typeof document !== "undefined" && document.body.hasAttribute(DARK_BODY_ATTRIBUTE)) return "dark";
				return media?.matches === true ? "dark" : "light";
			};
			return {
				getScheme,
				getPreference: () => asThemePreference(theme?.getTheme().preference) ?? "system",
				canSet: theme?.setTheme !== void 0,
				material: readWindowMaterial(),
				set: (preference) => {
					theme?.setTheme?.(preference);
				},
				subscribe: (listener) => {
					listeners.add(listener);
					if (sourceDisposers === void 0) {
						const disposers = [];
						try {
							disposers.push(events?.on("theme/change", notify) ?? (() => {}));
						} catch {}
						if (typeof MutationObserver === "function" && typeof document !== "undefined") {
							const observer = new MutationObserver(notify);
							observer.observe(document.body, {
								attributes: true,
								attributeFilter: [DARK_BODY_ATTRIBUTE]
							});
							disposers.push(() => {
								observer.disconnect();
							});
						}
						if (media !== void 0) {
							media.addEventListener("change", notify);
							disposers.push(() => {
								media.removeEventListener("change", notify);
							});
						}
						sourceDisposers = disposers;
					}
					return () => {
						listeners.delete(listener);
						if (listeners.size > 0) return;
						for (const dispose of sourceDisposers ?? []) dispose();
						sourceDisposers = void 0;
					};
				}
			};
		}
		//#endregion
		//#region src/client/state/runtime.ts
		/**
		* The workbench's single view of the DSH client services.
		*
		* The plugin body resolves every service once and hands this object to the
		* React tree through one context. Nothing in the tree reaches for a cordis
		* context of its own, so a component can be rendered in isolation with a
		* stub, and the set of DSH capabilities the workbench depends on is exactly
		* the surface of this file.
		*
		* Every field is an existing DSH capability. This module adds no state that
		* duplicates the Host: session lists, conversation transcripts, projections,
		* settings and the workspace registry are all read through their owning
		* services, and the workbench's own state (which panel is open, which nav
		* entry is selected) lives separately in {@link ../state/navigation.ts}.
		* @module @dsh-portable/dcode-ui/client/state/runtime
		*/
		/**
		* Build the runtime from a live client context.
		*
		* Optional services are probed rather than injected so a trimmed assembly
		* (a deployment without `ui-theme`, say) still boots the workbench with the
		* dependent surface disabled instead of failing the whole plugin.
		* @param ctx - client root context, after this plugin's inject set activated.
		* @param mode - the page's mode store.
		* @returns the runtime handed to the React tree.
		*/
		function createDcodeRuntime(ctx, mode) {
			const sessions = ctx.get("sessions");
			const workspaces = ctx.get("workspaces");
			const uiConversation = ctx.get("uiConversation");
			const carrier = ctx.get("connection");
			const navigation = ctx.get("uiWorkspace");
			const theme = ctx.get("theme");
			const locale = ctx.get("locale");
			const conversationSettings = ctx.get("settingsScope")?.bind({ namespace: "ui-conversation" });
			const fallbackLocale = {
				active: "en",
				locales: [],
				revision: 0
			};
			const feeds = /* @__PURE__ */ new Map();
			return {
				sessions,
				workspaces,
				navigation,
				remote: ctx.remote,
				theme,
				appearance: createAppearanceStore(ctx, theme),
				busyEnter: {
					getSnapshot: () => conversationSettings?.getSnapshot().value?.busyEnter === "steer" ? "steer" : "queue",
					subscribe: (listener) => conversationSettings?.subscribe(listener) ?? (() => {}),
					get writable() {
						return conversationSettings?.getSnapshot().writable ?? false;
					},
					set: (value) => {
						conversationSettings?.set("busyEnter", value);
					}
				},
				locale: {
					getSnapshot: () => locale?.getSnapshot() ?? fallbackLocale,
					subscribe: (listener) => locale?.subscribe(listener) ?? (() => {}),
					set: (id) => {
						locale?.setLocale(id);
					}
				},
				git: createDcodeApi(carrier),
				learningCall: createLearningCall(carrier),
				learningT: locale?.bind("interactive-learning") ?? ((key) => key),
				mode,
				binding: (sessionId) => sessions.binding(sessionId),
				scope: (sessionId) => sessions.scope(sessionId),
				chatFeed: (sessionId) => {
					const cached = feeds.get(sessionId);
					if (cached !== void 0) return cached;
					if (uiConversation === void 0) return void 0;
					const binding = sessions.binding(sessionId);
					if (binding === void 0) return void 0;
					const target = uiConversation.binding(binding).target("chat");
					const feed = {
						getSnapshot: () => target.getSnapshot(),
						subscribe: (listener) => target.subscribe(listener)
					};
					feeds.set(sessionId, feed);
					return feed;
				}
			};
		}
		const RuntimeContext = (0, react.createContext)(void 0);
		/** Provider for the runtime; mounted once at the workbench root. */
		const DcodeRuntimeProvider = RuntimeContext.Provider;
		/**
		* Read the runtime.
		* @returns the runtime supplied by the workbench root.
		* @throws when a component renders outside the workbench tree.
		*/
		function useRuntime() {
			const runtime = (0, react.useContext)(RuntimeContext);
			if (runtime === void 0) throw new Error("dcode-ui: component rendered outside the workbench runtime provider");
			return runtime;
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* Workbench copy, in the two locales this distribution ships.
		*
		* Registered as an ordinary namespace on the Host's locale runtime, so the
		* workbench follows the same language selection the official UI follows and a
		* language switch reaches both surfaces without a reload.
		* @module @dsh-portable/dcode-ui/client/locales
		*/
		/** Locale namespace owned by this package. */
		const DCODE_NS = "dcode";
		/** English dictionary; also the fallback for a key a locale is missing. */
		const en = {
			"app.title": "DeepSeek Harness",
			"nav.newTask": "New task",
			"nav.openWorkspace": "Open workspace",
			"nav.skills": "Skills",
			"nav.plugins": "Plugins",
			"nav.learning": "Learning library",
			"nav.settings": "Settings",
			"nav.commandPalette": "Command palette",
			"nav.noTasks": "No tasks yet",
			"nav.ungrouped": "Other sessions",
			"nav.collapse": "Collapse sidebar",
			"nav.expand": "Expand sidebar",
			"nav.backToWorkspace": "Back to workspace",
			"session.archive": "Archive session",
			"session.delete": "Delete session permanently",
			"session.deleteTitle": "Delete this session?",
			"session.deleteBody": "This permanently deletes the conversation and cannot be undone.",
			"account.menu": "Account and app menu",
			"account.usage": "Usage statistics",
			"top.noSession": "No task selected",
			"top.branch": "Branch",
			"top.noRepository": "Not a git repository",
			"top.toggleAside": "Toggle details panel",
			"top.moreActions": "More actions",
			"top.officialUi": "Switch to the official interface",
			"chat.empty.morning": "Good morning, ready to build today?",
			"chat.empty.afternoon": "Good afternoon, what would you like to build?",
			"chat.empty.evening": "Good evening, you worked hard today",
			"chat.empty.body": "Describe what you want done in this workspace. The agent works in {cwd}.",
			"chat.empty.noWorkspace": "Open a workspace to start your first task.",
			"chat.thinking": "Thinking",
			"chat.reasoning": "Reasoning",
			"chat.running": "Running",
			"chat.ran": "Ran",
			"chat.failed": "Failed",
			"chat.interrupted": "Stopped",
			"chat.steering": "Steering",
			"chat.context": "Context",
			"chat.command": "Command",
			"chat.compaction": "Context compacted",
			"chat.loadOlder": "Load earlier messages",
			"chat.loading": "Loading conversation…",
			"chat.retry": "Retrying model request",
			"chat.maxTokens": "Reached the output limit for this turn",
			"chat.queued": "Queued",
			"chat.tokens": "{count} tokens",
			"chat.wrap": "Wrap",
			"chat.outputTruncated": "… output truncated",
			"changes.title": "File changes",
			"changes.count": "{count} files changed",
			"changes.undo": "Undo",
			"changes.undoing": "Undoing…",
			"changes.undone": "Reverted {count} files",
			"changes.viewDiff": "View diff",
			"git.title": "Git tools",
			"git.changes": "Changes",
			"git.commit": "Commit",
			"git.commitPlaceholder": "Commit message",
			"git.committing": "Committing…",
			"git.committed": "Committed {commit}",
			"git.nothingStaged": "Nothing to commit",
			"git.clean": "Working tree clean",
			"git.notRepository": "This workspace is not a git repository.",
			"git.unavailable": "Git tooling is unavailable on this connection.",
			"git.branches": "Branches",
			"git.branchReadOnly": "Branch switching is available in your Git client.",
			"git.currentBranch": "Current branch",
			"git.ahead": "{count} ahead",
			"git.behind": "{count} behind",
			"git.refresh": "Refresh",
			"git.binary": "Binary file",
			"git.truncated": "Diff truncated",
			"git.noDiff": "No changes to show",
			"goal.title": "Goal",
			"goal.none": "No goal set for this task.",
			"goal.complete": "Complete",
			"goal.active": "Active",
			"goal.paused": "Paused",
			"progress.title": "Progress",
			"progress.none": "No plan steps yet.",
			"details.title": "Details",
			"details.none": "Select a tool call or a file to inspect it.",
			"details.arguments": "Arguments",
			"details.output": "Output",
			"details.file": "File",
			"composer.placeholder": "Describe the next change",
			"composer.placeholderRunning": "Send another message",
			"composer.send": "Send",
			"composer.stop": "Stop",
			"composer.model": "Model",
			"composer.reasoning": "Reasoning",
			"composer.reasoningDefault": "Default",
			"composer.permission": "Permissions",
			"composer.skills": "Skills",
			"composer.mode": "Mode",
			"composer.modeLocked": "Mode is fixed after the conversation starts.",
			"composer.noModes": "No agent modes are available.",
			"composer.mode.standard": "Standard mode",
			"composer.mode.ptc": "PTC mode",
			"composer.mode.minimal": "Minimal mode",
			"composer.mode.cordis": "Creator mode",
			"composer.permission.readOnly": "Read Only",
			"composer.permission.workspaceWrite": "Workspace Write",
			"composer.permission.fullAccess": "Full access",
			"composer.permission.confirmTitle": "Enable full access?",
			"composer.permission.confirmBody": "Full access lets the agent read and modify files outside this workspace and run unrestricted commands.",
			"composer.permission.confirmAcknowledge": "I understand this gives the agent unrestricted access.",
			"composer.permission.confirm": "Enable full access",
			"composer.noSkills": "No skills available in this session.",
			"composer.noModels": "No models configured.",
			"composer.needsSession": "Open or create a task before sending.",
			"palette.placeholder": "Search actions, tasks or files",
			"palette.all": "All",
			"palette.actions": "Actions",
			"palette.tasks": "Tasks",
			"palette.files": "Files",
			"palette.suggested": "Suggested",
			"palette.panels": "Panels",
			"palette.configuration": "Configuration",
			"palette.empty": "No matches",
			"learning.title": "Learning",
			"learning.subtitle": "Concepts, materials and notes, backed by the same learning engine the official interface uses.",
			"learning.concept": "Learn a concept",
			"learning.conceptBody": "Start a guided session on one idea, with checkpoints and recall cards.",
			"learning.problem": "Work through a problem",
			"learning.problemBody": "Bring a question and be walked to the answer instead of handed it.",
			"learning.material": "Study material",
			"learning.materialBody": "Ingest a document into the vault and learn from its own sections.",
			"learning.current": "Current learning session",
			"learning.currentNone": "No learning session is open.",
			"learning.notes": "Notes",
			"learning.library": "Material library",
			"learning.cards": "Concept cards",
			"learning.visuals": "Visuals",
			"learning.open": "Open",
			"learning.start": "Start",
			"learning.needsWorkspace": "Open a workspace before starting a learning session.",
			"settings.title": "Settings",
			"settings.group.basics": "Basics",
			"settings.group.agent": "Agent capabilities",
			"settings.group.data": "Data and statistics",
			"settings.general": "General",
			"settings.appearance": "Appearance",
			"settings.models": "Model settings",
			"settings.browser": "Browser control",
			"settings.computer": "Computer control",
			"settings.memory": "Memory",
			"settings.subagents": "Subagents",
			"settings.plugins": "Plugins",
			"settings.mcp": "MCP servers",
			"settings.skills": "Skills",
			"settings.commands": "Commands",
			"settings.usage": "Usage",
			"settings.agentPresets": "Agent presets",
			"settings.interface": "Interface",
			"settings.interfaceBody": "Choose which front end this window shows. Both read the same runtime.",
			"settings.modeOfficial": "Official",
			"settings.modeOfficialBody": "The official DeepSeek Harness interface, unchanged.",
			"settings.modeWorkbench": "Workbench",
			"settings.modeWorkbenchBody": "A compact desktop layout with git tools, goal and progress panels.",
			"settings.theme": "Interface theme",
			"settings.themeCustom": "Installed themes",
			"theme.light": "Light",
			"theme.dark": "Dark",
			"theme.system": "System",
			"theme.toggle": "Toggle theme",
			"settings.fontSize": "Interface font size",
			"settings.language": "Language",
			"settings.busyEnter": "Enter while working",
			"settings.busyEnterBody": "Choose whether plain Enter queues a message or steers the running turn. Ctrl/Cmd+Enter uses the other behavior.",
			"settings.busyEnter.queue": "Queue message",
			"settings.busyEnter.steer": "Steer current turn",
			"settings.agentPresetsBody": "Modes currently available from the DSH agent preset roster.",
			"settings.openOfficialSettings": "Open the full settings surface",
			"settings.openOfficialSettingsBody": "Sections this panel does not cover are available in the official interface.",
			"settings.empty": "Nothing is configured here yet.",
			"settings.loading": "Loading…",
			"settings.count": "{count} entries",
			"settings.namespace": "Namespace",
			"settings.provider": "Provider",
			"settings.models.default": "Default model",
			"settings.models.routable": "Routable providers",
			"settings.models.failures": "Providers that failed to load",
			"settings.memoryBody": "Long-term workspace memory is configured through the settings document.",
			"settings.browserBody": "Browser control is provided by skills and plugins in this installation.",
			"settings.computerBody": "Computer control is provided by skills and plugins in this installation.",
			"settings.usageBody": "Token usage is recorded per turn and shown on each assistant message.",
			"settings.usageTurns": "Recorded turns",
			"settings.usageTokens": "Tokens in this session",
			"common.cancel": "Cancel",
			"common.close": "Close",
			"common.retry": "Retry",
			"common.copy": "Copy",
			"common.copied": "Copied",
			"common.search": "Search",
			"common.none": "None",
			"common.error": "Something went wrong"
		};
		/** Simplified Chinese dictionary. */
		const zh = {
			"app.title": "DeepSeek Harness",
			"nav.newTask": "新建任务",
			"nav.openWorkspace": "打开工作区",
			"nav.skills": "技能",
			"nav.plugins": "插件",
			"nav.learning": "学习库",
			"nav.settings": "设置",
			"nav.commandPalette": "命令面板",
			"nav.noTasks": "还没有任务",
			"nav.ungrouped": "其他会话",
			"nav.collapse": "收起侧边栏",
			"nav.expand": "展开侧边栏",
			"nav.backToWorkspace": "返回工作区",
			"session.archive": "归档会话",
			"session.delete": "永久删除会话",
			"session.deleteTitle": "删除这个会话？",
			"session.deleteBody": "会话将被永久删除，且无法撤销。",
			"account.menu": "账户与应用菜单",
			"account.usage": "使用统计",
			"top.noSession": "未选择任务",
			"top.branch": "分支",
			"top.noRepository": "不是 git 仓库",
			"top.toggleAside": "切换详情面板",
			"top.moreActions": "更多操作",
			"top.officialUi": "切换到官方版界面",
			"chat.empty.morning": "早上好呀，今天也是充满活力的一天",
			"chat.empty.afternoon": "下午好，今天想构建些什么？",
			"chat.empty.evening": "晚上好呀，今天辛苦啦",
			"chat.empty.body": "描述你想在这个工作区完成的事情。Agent 将在 {cwd} 中工作。",
			"chat.empty.noWorkspace": "先打开一个工作区，再开始第一个任务。",
			"chat.thinking": "思考中",
			"chat.reasoning": "推理过程",
			"chat.running": "正在运行",
			"chat.ran": "已运行",
			"chat.failed": "失败",
			"chat.interrupted": "已停止",
			"chat.steering": "插话",
			"chat.context": "上下文",
			"chat.command": "命令",
			"chat.compaction": "上下文已压缩",
			"chat.loadOlder": "加载更早的消息",
			"chat.loading": "正在加载会话…",
			"chat.retry": "正在重试模型请求",
			"chat.maxTokens": "本回合达到输出上限",
			"chat.queued": "排队中",
			"chat.tokens": "{count} tokens",
			"chat.wrap": "自动换行",
			"chat.outputTruncated": "… 输出已截断",
			"changes.title": "文件变更",
			"changes.count": "{count} 个文件已更改",
			"changes.undo": "撤销",
			"changes.undoing": "正在撤销…",
			"changes.undone": "已还原 {count} 个文件",
			"changes.viewDiff": "查看差异",
			"git.title": "Git 工具",
			"git.changes": "变更",
			"git.commit": "提交",
			"git.commitPlaceholder": "提交信息",
			"git.committing": "正在提交…",
			"git.committed": "已提交 {commit}",
			"git.nothingStaged": "没有可提交的内容",
			"git.clean": "工作区干净",
			"git.notRepository": "当前工作区不是 git 仓库。",
			"git.unavailable": "当前连接不支持 Git 工具。",
			"git.branches": "分支",
			"git.branchReadOnly": "请在 Git 客户端中切换分支。",
			"git.currentBranch": "当前分支",
			"git.ahead": "领先 {count}",
			"git.behind": "落后 {count}",
			"git.refresh": "刷新",
			"git.binary": "二进制文件",
			"git.truncated": "差异已截断",
			"git.noDiff": "没有可显示的差异",
			"goal.title": "目标",
			"goal.none": "这个任务还没有设定目标。",
			"goal.complete": "已完成",
			"goal.active": "进行中",
			"goal.paused": "已暂停",
			"progress.title": "进度",
			"progress.none": "还没有计划步骤。",
			"details.title": "详情",
			"details.none": "选择一个工具调用或文件查看详情。",
			"details.arguments": "参数",
			"details.output": "输出",
			"details.file": "文件",
			"composer.placeholder": "向工作台提问，使用 @ 添加上下文，使用 / 选择命令或能力",
			"composer.placeholderRunning": "继续发送消息",
			"composer.send": "发送",
			"composer.stop": "停止",
			"composer.model": "模型",
			"composer.reasoning": "推理深度",
			"composer.reasoningDefault": "默认",
			"composer.permission": "权限模式",
			"composer.skills": "技能",
			"composer.mode": "模式",
			"composer.modeLocked": "对话开始后将无法切换模式。",
			"composer.noModes": "当前没有可用的 Agent 模式。",
			"composer.mode.standard": "标准模式",
			"composer.mode.ptc": "PTC 模式",
			"composer.mode.minimal": "极简模式",
			"composer.mode.cordis": "创造模式",
			"composer.permission.readOnly": "只读",
			"composer.permission.workspaceWrite": "工作区写入",
			"composer.permission.fullAccess": "完全访问",
			"composer.permission.confirmTitle": "启用完全访问？",
			"composer.permission.confirmBody": "完全访问允许 Agent 读写工作区以外的文件，并运行不受限制的命令。",
			"composer.permission.confirmAcknowledge": "我了解这将授予 Agent 不受限制的访问权限。",
			"composer.permission.confirm": "启用完全访问",
			"composer.noSkills": "当前会话没有可用技能。",
			"composer.noModels": "尚未配置模型。",
			"composer.needsSession": "先打开或新建一个任务再发送。",
			"palette.placeholder": "搜索操作、任务或文件",
			"palette.all": "全部",
			"palette.actions": "操作",
			"palette.tasks": "任务",
			"palette.files": "文件",
			"palette.suggested": "建议",
			"palette.panels": "面板",
			"palette.configuration": "配置",
			"palette.empty": "没有匹配项",
			"learning.title": "学习模式",
			"learning.subtitle": "概念、材料与笔记，由官方版使用的同一套学习引擎驱动。",
			"learning.concept": "概念学习",
			"learning.conceptBody": "围绕一个概念开始引导式学习，包含检查点与回忆卡片。",
			"learning.problem": "问题学习",
			"learning.problemBody": "带着问题进入，被一步步引导到答案，而不是直接得到答案。",
			"learning.material": "材料学习",
			"learning.materialBody": "把文档导入学习库，按它自己的章节结构学习。",
			"learning.current": "当前学习会话",
			"learning.currentNone": "当前没有进行中的学习会话。",
			"learning.notes": "学习笔记",
			"learning.library": "基础材料库",
			"learning.cards": "概念卡片",
			"learning.visuals": "可视化内容",
			"learning.open": "打开",
			"learning.start": "开始",
			"learning.needsWorkspace": "先打开工作区，再开始学习会话。",
			"settings.title": "设置",
			"settings.group.basics": "基础设置",
			"settings.group.agent": "Agent 能力",
			"settings.group.data": "数据与统计",
			"settings.general": "常规",
			"settings.appearance": "外观",
			"settings.models": "模型设置",
			"settings.browser": "浏览器控制",
			"settings.computer": "电脑控制",
			"settings.memory": "记忆",
			"settings.subagents": "子智能体",
			"settings.plugins": "插件",
			"settings.mcp": "MCP 服务器",
			"settings.skills": "技能",
			"settings.commands": "命令",
			"settings.usage": "使用统计",
			"settings.agentPresets": "Agent 预设",
			"settings.interface": "界面设置",
			"settings.interfaceBody": "选择当前窗口使用哪一套前端。两者读取同一个运行时。",
			"settings.modeOfficial": "官方版",
			"settings.modeOfficialBody": "官方 DeepSeek Harness 界面，保持原样。",
			"settings.modeWorkbench": "工作台",
			"settings.modeWorkbenchBody": "紧凑的桌面布局，带 Git 工具、目标与进度面板。",
			"settings.theme": "界面主题",
			"settings.themeCustom": "已安装主题",
			"theme.light": "浅色",
			"theme.dark": "深色",
			"theme.system": "跟随系统",
			"theme.toggle": "切换主题",
			"settings.fontSize": "界面字号",
			"settings.language": "语言",
			"settings.busyEnter": "工作中按 Enter",
			"settings.busyEnterBody": "选择直接按 Enter 时排队发送还是插入当前回合；Ctrl/Cmd+Enter 执行相反行为。",
			"settings.busyEnter.queue": "排队发送",
			"settings.busyEnter.steer": "插话发送",
			"settings.agentPresetsBody": "当前 DSH Agent 预设列表中可用的模式。",
			"settings.openOfficialSettings": "打开完整设置界面",
			"settings.openOfficialSettingsBody": "这里没有覆盖的设置项，可在官方版界面中继续配置。",
			"settings.empty": "这里还没有可配置的内容。",
			"settings.loading": "加载中…",
			"settings.count": "{count} 项",
			"settings.namespace": "命名空间",
			"settings.provider": "供应商",
			"settings.models.default": "默认模型",
			"settings.models.routable": "可用供应商",
			"settings.models.failures": "加载失败的供应商",
			"settings.memoryBody": "长期工作区记忆通过设置文档配置。",
			"settings.browserBody": "浏览器控制由本安装中的技能与插件提供。",
			"settings.computerBody": "电脑控制由本安装中的技能与插件提供。",
			"settings.usageBody": "Token 用量按回合记录，并显示在每条助手消息上。",
			"settings.usageTurns": "已记录回合",
			"settings.usageTokens": "本会话 Token",
			"common.cancel": "取消",
			"common.close": "关闭",
			"common.retry": "重试",
			"common.copy": "复制",
			"common.copied": "已复制",
			"common.search": "搜索",
			"common.none": "无",
			"common.error": "出错了"
		};
		//#endregion
		//#region src/client/state/i18n.ts
		/**
		* Copy access for the workbench tree.
		*
		* The plugin registers this package's dictionaries on the Host locale runtime
		* and passes the bound translate function down one context, re-rendering the
		* tree when the active locale changes. No separate language preference is
		* introduced: switching language in either surface moves both.
		* @module @dsh-portable/dcode-ui/client/state/i18n
		*/
		/** Interpolate `{name}` placeholders in a template. */
		function interpolate(template, params) {
			if (params === void 0) return template;
			return template.replace(/\{(\w+)\}/g, (match, name) => name in params ? String(params[name]) : match);
		}
		/** English-only fallback used when a component renders outside the provider. */
		const fallback = (key, params) => interpolate(en[key] ?? key, params);
		const I18nContext = (0, react.createContext)(fallback);
		/** Provider for the bound translate function. */
		const TranslateProvider = I18nContext.Provider;
		/**
		* Read the translate function.
		* @returns the bound translate, or an English fallback outside the provider.
		*/
		function useT() {
			return (0, react.useContext)(I18nContext);
		}
		/**
		* Adapt the Host's bound translate function to the workbench's own signature,
		* interpolating placeholders the Host runtime does not itself substitute.
		*
		* The Host's `bind` narrows its key to this namespace's dictionary, which is
		* exactly {@link DcodeKey}; the parameter is spelled that way rather than as a
		* bare string so a key removed from the dictionary fails to compile here.
		* @param translate - `ctx.locale.bind(DCODE_NS)`.
		* @returns the typed translate handed to {@link TranslateProvider}.
		*/
		function bindTranslate(translate) {
			return (key, params) => {
				const value = translate(key, params);
				if (value === key) return interpolate(en[key] ?? key, params);
				return interpolate(value, params);
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\tokens.module.css.mjs
		const css$18 = "[data-dcode-scope]{--zx-text-micro:11px;--zx-text-xs:12px;--zx-text-sm:13px;--zx-text-md:14px;--zx-text-lg:16px;--zx-text-xl:20px;--zx-text-2xl:26px;--zx-leading-tight:1.35;--zx-leading-body:1.65;--zx-space-1:4px;--zx-space-2:6px;--zx-space-3:8px;--zx-space-4:12px;--zx-space-5:16px;--zx-space-6:20px;--zx-space-7:28px;--zx-radius-sm:6px;--zx-radius-md:8px;--zx-radius-lg:10px;--zx-radius-xl:14px;--zx-radius-pill:999px;--zx-bg-app:var(--dsw-alias-bg-base,#0d0d0f);--zx-bg-panel:var(--dsw-alias-bg-layer-1,#141416);--zx-bg-card:var(--dsw-alias-bg-layer-2,#191a1d);--zx-bg-overlay:var(--dsw-alias-bg-overlay,#1c1d20);--zx-bg-raised:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 6%, transparent);--zx-bg-hover:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 8%, transparent);--zx-bg-active:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 12%, transparent);--zx-border:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 11%, transparent);--zx-border-soft:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 7%, transparent);--zx-label:var(--dsw-alias-label-primary,#ececee);--zx-label-secondary:var(--dsw-alias-label-secondary,#a9aab0);--zx-label-muted:color-mix(in srgb, var(--dsw-alias-label-secondary,#a9aab0) 72%, transparent);--zx-label-faint:color-mix(in srgb, var(--dsw-alias-label-secondary,#a9aab0) 48%, transparent);--zx-accent:var(--dsw-alias-brand-primary,#4c8dff);--zx-on-accent:var(--dsw-alias-bg-base,#0d0d0f);--zx-accent-soft:color-mix(in srgb, var(--dsw-alias-brand-primary,#4c8dff) 18%, transparent);--zx-success:var(--dsw-alias-state-success-primary,#3fb950);--zx-warn:var(--dsw-alias-state-warn-primary,#d29922);--zx-error:var(--dsw-alias-state-error-primary,#f85149);--zx-added:var(--dsw-alias-state-success-primary,#3fb950);--zx-removed:var(--dsw-alias-state-error-primary,#f85149);--zx-ansi-0:#4b5263;--zx-ansi-1:#e06c75;--zx-ansi-2:#98c379;--zx-ansi-3:#e5c07b;--zx-ansi-4:#61afef;--zx-ansi-5:#c678dd;--zx-ansi-6:#56b6c2;--zx-ansi-7:#cbd0d8;--zx-ansi-8:#6b7280;--zx-ansi-9:#ff7b86;--zx-ansi-10:#b3e08e;--zx-ansi-11:#f2d08a;--zx-ansi-12:#82c4ff;--zx-ansi-13:#d99ae8;--zx-ansi-14:#74d0dc;--zx-ansi-15:#f5f7fa;--zx-ansi-fg:var(--zx-label);--zx-ansi-bg:var(--zx-bg-card);--zx-scrim:#00000075;--zx-focus-ring:0 0 0 2px color-mix(in srgb, var(--dsw-alias-brand-primary,#4c8dff) 55%, transparent);--zx-shadow-panel:0 12px 32px #00000057, 0 2px 6px #00000038;--zx-shadow-card:0 1px 2px #0000002e;--zx-font-ui:-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif;--zx-font-mono:ui-monospace, SFMono-Regular, \"SF Mono\", Menlo, Consolas, \"Liberation Mono\", monospace;--zx-motion-fast:.12s cubic-bezier(.2, 0, .2, 1);--zx-motion:.18s cubic-bezier(.2, 0, .2, 1);--zx-rail-width:240px;--zx-aside-width:320px;--zx-topbar-height:44px;--zx-reading-width:760px}[data-dcode-scope][data-dcode-scheme=light]{--zx-bg-app:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 4%, var(--dsw-alias-bg-base,#fff));--zx-bg-panel:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 2%, var(--dsw-alias-bg-base,#fff));--zx-bg-card:var(--dsw-alias-bg-base,#fff);--zx-bg-overlay:var(--dsw-alias-bg-base,#fff);--zx-bg-raised:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 4%, transparent);--zx-bg-hover:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 6%, transparent);--zx-bg-active:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 10%, transparent);--zx-border:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 10%, transparent);--zx-border-soft:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 6%, transparent);--zx-label:var(--dsw-alias-label-primary,#1c2024);--zx-label-secondary:var(--dsw-alias-label-secondary,#59606b);--zx-label-muted:color-mix(in srgb, var(--dsw-alias-label-secondary,#59606b) 82%, transparent);--zx-label-faint:color-mix(in srgb, var(--dsw-alias-label-secondary,#59606b) 60%, transparent);--zx-accent:var(--dsw-alias-brand-primary,#2563eb);--zx-on-accent:var(--dsw-alias-bg-base,#fff);--zx-accent-soft:color-mix(in srgb, var(--dsw-alias-brand-primary,#2563eb) 12%, transparent);--zx-success:var(--dsw-alias-state-success-primary,#1a7f37);--zx-warn:var(--dsw-alias-state-warn-primary,#9a6700);--zx-error:var(--dsw-alias-state-error-primary,#cf222e);--zx-added:var(--dsw-alias-state-success-primary,#1a7f37);--zx-removed:var(--dsw-alias-state-error-primary,#cf222e);--zx-shadow-panel:0 12px 32px #0f172a1f, 0 2px 6px #0f172a0f;--zx-shadow-card:0 1px 2px #0f172a0f;--zx-ansi-0:#24292f;--zx-ansi-1:#cf222e;--zx-ansi-2:#116329;--zx-ansi-3:#7d4e00;--zx-ansi-4:#0550ae;--zx-ansi-5:#8250df;--zx-ansi-6:#0b6b73;--zx-ansi-7:#57606a;--zx-ansi-8:#6e7781;--zx-ansi-9:#a40e26;--zx-ansi-10:#0d5620;--zx-ansi-11:#6b4600;--zx-ansi-12:#0a4a9e;--zx-ansi-13:#6f42c1;--zx-ansi-14:#0a5c63;--zx-ansi-15:#8c959f;--zx-ansi-fg:var(--zx-label);--zx-ansi-bg:var(--zx-bg-card);--zx-scrim:#0f172a3d}html[data-dcode-acrylic],body[data-dcode-acrylic]{background:0 0!important}[data-dcode-scope][data-dcode-acrylic]{--zx-bg-app:color-mix(in srgb, var(--dsw-alias-bg-base,#0d0d0f) 62%, transparent);--zx-bg-panel:color-mix(in srgb, var(--dsw-alias-bg-layer-1,#141416) 72%, transparent);--zx-bg-card:color-mix(in srgb, var(--dsw-alias-bg-layer-2,#191a1d) 80%, transparent);--zx-bg-overlay:color-mix(in srgb, var(--dsw-alias-bg-overlay,#1c1d20) 92%, transparent)}[data-dcode-scope][data-dcode-scheme=light][data-dcode-acrylic]{--zx-bg-app:color-mix(in srgb, var(--dsw-alias-bg-base,#f7f8fa) 62%, transparent);--zx-bg-panel:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 74%, transparent);--zx-bg-card:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 82%, transparent);--zx-bg-overlay:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 94%, transparent)}";
		const tagId$18 = "@dsh-portable/dcode-ui/tokens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$18) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$18;
			tag.textContent = css$18;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/tokens.ts
		/** Attribute marking a subtree as workbench-scoped. */
		const dcodeScope = { "data-dcode-scope": "" };
		//#endregion
		//#region src/client/state/hooks.ts
		/**
		* React bindings over the DSH observables the workbench reads.
		*
		* Every hook here is a thin `useSyncExternalStore` over a store the Host
		* already owns — there is no mirrored copy of the session list, the
		* transcript or a projection anywhere in this package. Selector variants
		* exist so a panel re-renders on the fact it reads rather than on every frame
		* of a streaming turn.
		* @module @dsh-portable/dcode-ui/client/state/hooks
		*/
		/**
		* Subscribe to one DSH observable.
		* @param source - the observable, or undefined while none is resolvable.
		* @param fallback - snapshot used while the source is absent.
		* @returns the current snapshot.
		*/
		function useObservable(source, fallback) {
			const subscribe = (0, react.useCallback)((listener) => source === void 0 ? () => {} : source.subscribe(listener), [source]);
			const snapshot = (0, react.useCallback)(() => source === void 0 ? fallback : source.getSnapshot(), [source, fallback]);
			return (0, react.useSyncExternalStore)(subscribe, snapshot, snapshot);
		}
		/**
		* Subscribe to a derived slice of an observable.
		*
		* The selector runs on every notification but the component re-renders only
		* when the selected value changes by `Object.is`, which is what keeps the
		* left rail still while a turn streams into the transcript.
		* @param source - the observable, or undefined while none is resolvable.
		* @param fallback - snapshot used while the source is absent.
		* @param select - pure projection of the snapshot.
		* @returns the selected value.
		*/
		function useObservableSelector(source, fallback, select) {
			const selectRef = (0, react.useRef)(select);
			selectRef.current = select;
			const subscribe = (0, react.useCallback)((listener) => source === void 0 ? () => {} : source.subscribe(listener), [source]);
			const lastRef = (0, react.useRef)(void 0);
			const snapshot = (0, react.useCallback)(() => {
				const input = source === void 0 ? fallback : source.getSnapshot();
				const last = lastRef.current;
				if (last !== void 0 && Object.is(last.input, input)) return last.output;
				const output = selectRef.current(input);
				if (last !== void 0 && Object.is(last.output, output)) {
					lastRef.current = {
						input,
						output: last.output
					};
					return last.output;
				}
				lastRef.current = {
					input,
					output
				};
				return output;
			}, [source, fallback]);
			return (0, react.useSyncExternalStore)(subscribe, snapshot, snapshot);
		}
		const EMPTY_SESSION_LIST = {
			ids: [],
			byId: {},
			current: void 0,
			phase: "pending",
			subagentsByParent: {},
			jobsBySession: {},
			currentAddress: void 0
		};
		/** The Session Controller's list and current selection. */
		function useSessionList() {
			return useObservable(useRuntime().sessions.list, EMPTY_SESSION_LIST);
		}
		/** The id of the selected session, or undefined in the no-session state. */
		function useCurrentSessionId() {
			return useObservableSelector(useRuntime().sessions.list, EMPTY_SESSION_LIST, (state) => state.current);
		}
		const EMPTY_WORKSPACES = {
			items: [],
			order: [],
			archivedSessionIds: [],
			state: "idle",
			phase: "loading",
			error: null
		};
		/** The durable workspace registry. */
		function useWorkspaces() {
			return useObservable(useRuntime().workspaces.list, EMPTY_WORKSPACES);
		}
		/**
		* One session's lifecycle snapshot.
		* @param sessionId - session to observe; undefined yields undefined.
		*/
		function useSessionSnapshot(sessionId) {
			const runtime = useRuntime();
			const source = (0, react.useMemo)(() => {
				if (sessionId === void 0) return void 0;
				const face = runtime.binding(sessionId)?.session;
				if (face === void 0) return void 0;
				return {
					getSnapshot: () => face.getSnapshot(),
					subscribe: (listener) => face.subscribe(listener)
				};
			}, [runtime, sessionId]);
			const snapshot = useObservable(source, void 0);
			return source === void 0 ? void 0 : snapshot;
		}
		/**
		* One session's assembled Chat transcript.
		* @param sessionId - session to observe; undefined yields undefined.
		*/
		function useChatSnapshot(sessionId) {
			const runtime = useRuntime();
			const source = (0, react.useMemo)(() => sessionId === void 0 ? void 0 : runtime.chatFeed(sessionId), [runtime, sessionId]);
			const snapshot = useObservable(source, void 0);
			return source === void 0 ? void 0 : snapshot;
		}
		/**
		* Whether the conversation has nothing in it yet — no settled node, no
		* streaming partial, no call in flight.
		*
		* This is the layout's phase gate: a blank conversation centres the greeting
		* and the composer the way the official surface does, and the first arriving
		* node drops the composer to its dock. A session whose chat has not loaded
		* yet is *not* blank, so an existing conversation never flashes the greeting
		* on its way in.
		* @param sessionId - session to inspect, or undefined for no session at all.
		* @returns true while there is nothing to show.
		*/
		function useConversationBlank(sessionId) {
			const chat = useChatSnapshot(sessionId);
			if (sessionId === void 0) return true;
			if (chat === void 0) return false;
			return chat.legacy.nodes.length === 0 && chat.legacy.partial === null && chat.legacy.runningCalls.length === 0;
		}
		/**
		* One host-computed projection of a session (`goal`, `plan`, `permissions`,
		* `modelSelection`, …). The projection face is identity-stable per key, so a
		* capability the Host does not publish simply reads `undefined` forever
		* rather than throwing.
		* @param sessionId - session to observe.
		* @param key - projection key.
		*/
		function useProjectionValue(sessionId, key) {
			const runtime = useRuntime();
			return useObservable((0, react.useMemo)(() => {
				if (sessionId === void 0) return void 0;
				const face = runtime.binding(sessionId)?.session.projections.faceOf(key);
				if (face === void 0) return void 0;
				return {
					getSnapshot: () => face.getSnapshot(),
					subscribe: (listener) => face.subscribe(listener)
				};
			}, [
				runtime,
				sessionId,
				key
			]), void 0);
		}
		/**
		* Group the session list by workspace for the left rail.
		*
		* Blank sessions are hidden unless they are the current selection — the same
		* rule the official sidebar applies, so switching surfaces does not change
		* which rows exist.
		*/
		function useWorkspaceGroups() {
			const list = useSessionList();
			const workspaces = useWorkspaces();
			return (0, react.useMemo)(() => {
				const archived = new Set(workspaces.archivedSessionIds);
				const visible = (summary) => summary !== void 0 && summary.origin !== "subagent" && !archived.has(summary.id) && (!summary.blank || summary.id === list.current);
				const claimed = /* @__PURE__ */ new Set();
				return {
					groups: workspaces.items.map((workspace) => {
						const sessions = workspace.sessionIds.map((id) => {
							claimed.add(id);
							return list.byId[id];
						}).filter(visible);
						return {
							workspaceId: workspace.workspaceId,
							title: workspace.title,
							path: workspace.path,
							sessions
						};
					}),
					ungrouped: list.ids.filter((id) => !claimed.has(id)).map((id) => list.byId[id]).filter(visible)
				};
			}, [list, workspaces]);
		}
		/**
		* Run an async read whenever its inputs change, with the in-flight answer of a
		* superseded run discarded.
		* @param load - the read; receives an abort signal.
		* @param deps - dependency list, as for `useEffect`.
		* @returns the latest value, a loading flag, a failure message, and a manual reload.
		*/
		function useAsync(load, deps) {
			const [state, setState] = (0, react.useState)({
				value: void 0,
				loading: true,
				error: void 0
			});
			const [nonce, setNonce] = (0, react.useState)(0);
			const loadRef = (0, react.useRef)(load);
			loadRef.current = load;
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				let live = true;
				setState((previous) => ({
					...previous,
					loading: true,
					error: void 0
				}));
				loadRef.current(controller.signal).then((value) => {
					if (live) setState({
						value,
						loading: false,
						error: void 0
					});
				}, (cause) => {
					if (!live) return;
					setState({
						value: void 0,
						loading: false,
						error: cause instanceof Error ? cause.message : String(cause)
					});
				});
				return () => {
					live = false;
					controller.abort();
				};
			}, [...deps, nonce]);
			const reload = (0, react.useCallback)(() => {
				setNonce((value) => value + 1);
			}, []);
			return {
				...state,
				reload
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\ThemeSwitch.module.css.mjs
		const css$17 = ".RDEw3W_group{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);align-items:stretch;gap:2px;padding:2px;display:inline-flex}.RDEw3W_segment{align-items:center;gap:var(--zx-space-2);min-height:26px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-sm);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);white-space:nowrap;cursor:pointer;transition:background var(--zx-motion-fast), color var(--zx-motion-fast);background:0 0;border:0;display:inline-flex}.RDEw3W_segment:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.RDEw3W_segment:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.RDEw3W_segment:disabled{opacity:.5;cursor:default}.RDEw3W_segmentActive{background:var(--zx-bg-card);color:var(--zx-label);box-shadow:var(--zx-shadow-card)}.RDEw3W_glyph{font-size:var(--zx-text-xs);line-height:1}.RDEw3W_label{font-size:var(--zx-text-xs)}";
		const tagId$17 = "@dsh-portable/dcode-ui/ThemeSwitch.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$17) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$17;
			tag.textContent = css$17;
			document.head.appendChild(tag);
		}
		var ThemeSwitch_module_css_default = {
			"glyph": "RDEw3W_glyph",
			"group": "RDEw3W_group",
			"label": "RDEw3W_label",
			"segment": "RDEw3W_segment",
			"segmentActive": "RDEw3W_segmentActive"
		};
		//#endregion
		//#region src/client/shell/ThemeSwitch.tsx
		/**
		* The light / dark / system control.
		*
		* One component in two shapes: a segmented control for the settings surface
		* and a menu row list for the top bar's popover. Both write the same
		* preference through the same service, so a switch made in either place is
		* the switch the official interface reads back.
		* @module @dsh-portable/dcode-ui/client/shell/ThemeSwitch
		*/
		/** Glyph per preference. The system entry shows a display, not a half-disc. */
		const GLYPH = {
			light: "☀️",
			dark: "🌙",
			system: "💻"
		};
		/** Locale key per preference. */
		const LABEL = {
			light: "theme.light",
			dark: "theme.dark",
			system: "theme.system"
		};
		/**
		* Subscribe to the resolved scheme and the stored preference.
		* @returns the current pair, re-read on every theme change.
		*/
		function useAppearance() {
			const appearance = useRuntime().appearance;
			return {
				scheme: (0, react.useSyncExternalStore)(appearance.subscribe, appearance.getScheme, appearance.getScheme),
				preference: (0, react.useSyncExternalStore)(appearance.subscribe, appearance.getPreference, appearance.getPreference),
				canSet: appearance.canSet,
				set: appearance.set
			};
		}
		/**
		* The three preferences as popover/palette rows.
		* @param t - workbench translate.
		* @param current - the stored preference, ticked in the list.
		* @param set - preference writer.
		* @returns one row per preference, in display order.
		*/
		function themeMenuRows(t, current, set) {
			return THEME_PREFERENCES.map((preference) => ({
				id: `theme:${preference}`,
				label: `${GLYPH[preference]}  ${t(LABEL[preference])}`,
				active: preference === current,
				onSelect: () => {
					set(preference);
				}
			}));
		}
		/** The segmented light / dark / system control. */
		function ThemeSwitch() {
			const t = useT();
			const { preference, canSet, set } = useAppearance();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ThemeSwitch_module_css_default.group,
				role: "radiogroup",
				"aria-label": t("settings.theme"),
				children: THEME_PREFERENCES.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					role: "radio",
					"aria-checked": entry === preference,
					className: `${ThemeSwitch_module_css_default.segment} ${entry === preference ? ThemeSwitch_module_css_default.segmentActive : ""}`,
					disabled: !canSet,
					onClick: () => {
						set(entry);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ThemeSwitch_module_css_default.glyph,
						"aria-hidden": true,
						children: GLYPH[entry]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ThemeSwitch_module_css_default.label,
						children: t(LABEL[entry])
					})]
				}, entry))
			});
		}
		//#endregion
		//#region src/client/git/useGit.ts
		/**
		* Working-tree status for the panels that show it.
		*
		* Three surfaces read this at once — the top bar's branch chip, the Changes
		* panel, and every turn's file-change card — so the read is shared per
		* workspace rather than issued per component: one `git status` subprocess
		* answers all of them, and they cannot disagree about the branch.
		*
		* It is refreshed on the events that actually change a work tree: the end of
		* an agent turn, an explicit refresh, a commit, an undo, and the window
		* regaining focus. There is no polling loop — a workbench left open on a quiet
		* workspace issues no git processes at all.
		* @module @dsh-portable/dcode-ui/client/git/useGit
		*/
		const EMPTY = {
			status: void 0,
			loading: false,
			pending: true,
			error: void 0
		};
		/** One record per workspace directory, shared by every consumer of that directory. */
		const records = /* @__PURE__ */ new Map();
		function recordFor(cwd) {
			const existing = records.get(cwd);
			if (existing !== void 0) return existing;
			const created = {
				status: void 0,
				pending: true,
				error: void 0,
				inflight: void 0,
				wanted: false,
				cleanupTimer: void 0,
				listeners: /* @__PURE__ */ new Set(),
				snapshot: {
					status: void 0,
					loading: true,
					pending: true,
					error: void 0
				}
			};
			records.set(cwd, created);
			return created;
		}
		function publish(record) {
			record.snapshot = {
				status: record.status,
				loading: record.inflight !== void 0,
				pending: record.pending,
				error: record.error
			};
			for (const listener of [...record.listeners]) listener();
		}
		/**
		* Read one workspace's status, collapsing concurrent callers onto one request.
		* @param runtime - the workbench runtime carrying the `/dcode` client.
		* @param cwd - absolute workspace directory.
		* @param force - start a fresh read even when one already answered.
		*/
		function load(runtime, cwd, force) {
			const record = recordFor(cwd);
			if (record.inflight !== void 0) {
				if (force) record.wanted = true;
				return;
			}
			if (!force && !record.pending) return;
			record.inflight = runtime.git.status(cwd).then((result) => {
				if (result.ok) {
					record.status = result.value;
					record.error = void 0;
				} else {
					record.status = void 0;
					record.error = result.error.message;
				}
			}).catch((cause) => {
				record.status = void 0;
				record.error = cause instanceof Error ? cause.message : String(cause);
			}).finally(() => {
				const wanted = record.wanted;
				record.wanted = false;
				record.inflight = void 0;
				record.pending = false;
				publish(record);
				if (wanted) load(runtime, cwd, true);
			});
			publish(record);
		}
		/**
		* Read one workspace's git status.
		* @param cwd - absolute workspace directory, or undefined with no session selected.
		* @param sessionId - session whose turn boundaries trigger a refresh.
		*/
		function useGitStatus(cwd, sessionId) {
			const runtime = useRuntime();
			const session = useSessionSnapshot(sessionId);
			const record = (0, react.useMemo)(() => cwd === void 0 ? void 0 : recordFor(cwd), [cwd]);
			const subscribe = (0, react.useCallback)((listener) => {
				if (cwd === void 0 || record === void 0) return () => {};
				if (record.cleanupTimer !== void 0) {
					clearTimeout(record.cleanupTimer);
					record.cleanupTimer = void 0;
				}
				record.listeners.add(listener);
				return () => {
					record.listeners.delete(listener);
					if (record.listeners.size > 0) return;
					record.cleanupTimer = setTimeout(() => {
						record.cleanupTimer = void 0;
						if (record.listeners.size === 0 && record.inflight === void 0) records.delete(cwd);
					}, 3e4);
				};
			}, [cwd, record]);
			const getSnapshot = (0, react.useCallback)(() => record?.snapshot ?? EMPTY, [record]);
			const snapshot = (0, react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
			const refresh = (0, react.useCallback)(() => {
				if (cwd !== void 0) load(runtime, cwd, true);
			}, [runtime, cwd]);
			(0, react.useEffect)(() => {
				if (cwd !== void 0) load(runtime, cwd, false);
			}, [runtime, cwd]);
			const running = session?.running ?? false;
			const previousRunning = (0, react.useRef)(running);
			(0, react.useEffect)(() => {
				if (previousRunning.current && !running) refresh();
				previousRunning.current = running;
			}, [running, refresh]);
			(0, react.useEffect)(() => {
				if (cwd === void 0) return void 0;
				const onFocus = () => {
					refresh();
				};
				globalThis.addEventListener?.("focus", onFocus);
				return () => {
					globalThis.removeEventListener?.("focus", onFocus);
				};
			}, [cwd, refresh]);
			return (0, react.useMemo)(() => ({
				...snapshot,
				unavailable: !runtime.git.available,
				refresh
			}), [
				snapshot,
				runtime,
				refresh
			]);
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\ui.module.css.mjs
		const css$16 = ".rmlmSW_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);box-shadow:var(--zx-shadow-card);overflow:hidden}.rmlmSW_cardHeader{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-3) var(--zx-space-4);font-size:var(--zx-text-xs);color:var(--zx-label-secondary);display:flex}.rmlmSW_cardBody{padding:var(--zx-space-4)}.rmlmSW_sectionTitle{justify-content:space-between;align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4) var(--zx-space-5) var(--zx-space-2);font-size:var(--zx-text-xs);color:var(--zx-label-secondary);letter-spacing:.02em;font-weight:500;display:flex}.rmlmSW_iconButton{justify-content:center;align-items:center;gap:var(--zx-space-2);min-width:26px;height:26px;padding:0 var(--zx-space-2);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;transition:background var(--zx-motion-fast), color var(--zx-motion-fast);background:0 0;border:1px solid #0000;display:inline-flex}.rmlmSW_iconButton:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.rmlmSW_iconButton:disabled{opacity:.45;cursor:default}.rmlmSW_iconButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.rmlmSW_iconButtonActive{background:var(--zx-bg-active);color:var(--zx-label)}.rmlmSW_button{justify-content:center;align-items:center;gap:var(--zx-space-2);height:28px;padding:0 var(--zx-space-4);border:1px solid var(--zx-border);border-radius:var(--zx-radius-md);background:var(--zx-bg-raised);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;white-space:nowrap;transition:background var(--zx-motion-fast), border-color var(--zx-motion-fast);display:inline-flex}.rmlmSW_button:hover:not(:disabled){background:var(--zx-bg-hover)}.rmlmSW_button:disabled{opacity:.45;cursor:default}.rmlmSW_button:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.rmlmSW_buttonPrimary{background:var(--zx-accent);color:var(--zx-on-accent);border-color:#0000}.rmlmSW_buttonPrimary:hover:not(:disabled){background:color-mix(in srgb, var(--zx-accent) 86%, var(--zx-label))}.rmlmSW_pill{align-items:center;gap:var(--zx-space-1);height:20px;padding:0 var(--zx-space-2);border-radius:var(--zx-radius-pill);background:var(--zx-bg-raised);color:var(--zx-label-secondary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;white-space:nowrap;display:inline-flex}.rmlmSW_added{color:var(--zx-added)}.rmlmSW_removed{color:var(--zx-removed)}.rmlmSW_muted{color:var(--zx-label-muted)}.rmlmSW_mono{font-family:var(--zx-font-mono);font-size:var(--zx-text-xs)}.rmlmSW_truncate{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.rmlmSW_empty{justify-content:center;align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-7) var(--zx-space-5);color:var(--zx-label-muted);font-size:var(--zx-text-xs);text-align:center;flex-direction:column;display:flex}.rmlmSW_popoverAnchor{display:inline-flex;position:relative}.rmlmSW_popover{z-index:40;min-width:200px;max-width:340px;max-height:60vh;padding:var(--zx-space-1);border:1px solid color-mix(in srgb, var(--zx-label) 18%, transparent);border-radius:var(--zx-radius-lg);background:var(--zx-bg-overlay);background:color-mix(in srgb, var(--zx-bg-overlay) 82%, transparent);box-shadow:0 16px 38px #0000004d, 0 3px 9px #0000002e, inset 0 1px 0 color-mix(in srgb, var(--zx-label) 12%, transparent);backdrop-filter:blur(20px)saturate(130%);position:absolute;overflow:hidden auto}.rmlmSW_popoverUp{bottom:calc(100% + var(--zx-space-2));left:0}.rmlmSW_popoverDown{top:calc(100% + var(--zx-space-2));left:0}.rmlmSW_popoverRight{left:auto;right:0}.rmlmSW_menuItem{align-items:center;gap:var(--zx-space-3);width:100%;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-sm);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.rmlmSW_menuItem:hover{background:var(--zx-bg-hover)}.rmlmSW_menuItem:disabled{cursor:default;color:var(--zx-label-secondary)}.rmlmSW_menuItem:disabled:hover{background:0 0}.rmlmSW_menuItem:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.rmlmSW_menuItemActive{background:var(--zx-bg-active)}.rmlmSW_menuItemDanger{color:var(--zx-error)}.rmlmSW_menuIcon{width:18px;height:18px;color:var(--zx-label-secondary);flex:none;justify-content:center;align-items:center;display:inline-flex}.rmlmSW_menuIcon svg{width:18px;height:18px}.rmlmSW_menuContent{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.rmlmSW_menuLabel{padding:var(--zx-space-3) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-faint);font-size:var(--zx-text-micro)}.rmlmSW_menuDetail{color:var(--zx-label-muted);font-size:var(--zx-text-micro);text-overflow:ellipsis;white-space:nowrap;margin-top:2px;line-height:1.4;display:block;overflow:hidden}.rmlmSW_scroll{scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent}.rmlmSW_scroll::-webkit-scrollbar{width:8px;height:8px}.rmlmSW_scroll::-webkit-scrollbar-thumb{border-radius:var(--zx-radius-pill);background:var(--zx-border);background-clip:padding-box;border:2px solid #0000}.rmlmSW_grow{flex:1;min-width:0}.rmlmSW_spinner{border:1.5px solid var(--zx-border);border-top-color:var(--zx-label-secondary);border-radius:50%;width:12px;height:12px;animation:.7s linear infinite rmlmSW_zx-spin;display:inline-block}@keyframes rmlmSW_zx-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.rmlmSW_spinner{animation-duration:2s}}.rmlmSW_mirrored{transform:scaleX(-1)}";
		const tagId$16 = "@dsh-portable/dcode-ui/ui.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$16) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$16;
			tag.textContent = css$16;
			document.head.appendChild(tag);
		}
		var ui_module_css_default = {
			"added": "rmlmSW_added",
			"button": "rmlmSW_button",
			"buttonPrimary": "rmlmSW_buttonPrimary",
			"card": "rmlmSW_card",
			"cardBody": "rmlmSW_cardBody",
			"cardHeader": "rmlmSW_cardHeader",
			"empty": "rmlmSW_empty",
			"grow": "rmlmSW_grow",
			"iconButton": "rmlmSW_iconButton",
			"iconButtonActive": "rmlmSW_iconButtonActive",
			"menuContent": "rmlmSW_menuContent",
			"menuDetail": "rmlmSW_menuDetail",
			"menuIcon": "rmlmSW_menuIcon",
			"menuItem": "rmlmSW_menuItem",
			"menuItemActive": "rmlmSW_menuItemActive",
			"menuItemDanger": "rmlmSW_menuItemDanger",
			"menuLabel": "rmlmSW_menuLabel",
			"mirrored": "rmlmSW_mirrored",
			"mono": "rmlmSW_mono",
			"muted": "rmlmSW_muted",
			"pill": "rmlmSW_pill",
			"popover": "rmlmSW_popover",
			"popoverAnchor": "rmlmSW_popoverAnchor",
			"popoverDown": "rmlmSW_popoverDown",
			"popoverRight": "rmlmSW_popoverRight",
			"popoverUp": "rmlmSW_popoverUp",
			"removed": "rmlmSW_removed",
			"scroll": "rmlmSW_scroll",
			"sectionTitle": "rmlmSW_sectionTitle",
			"spinner": "rmlmSW_spinner",
			"truncate": "rmlmSW_truncate",
			"zx-spin": "rmlmSW_zx-spin"
		};
		//#endregion
		//#region src/client/shell/ui.tsx
		/**
		* Workbench atoms.
		*
		* Deliberately thin: the shared component library (`ui-primitives`) is a
		* platform module and already supplies markdown, code, diff, terminal and
		* icon rendering. What it does not supply is this surface's compact chrome —
		* the card, the popover menu and the two button weights — so only those live
		* here.
		* @module @dsh-portable/dcode-ui/client/shell/ui
		*/
		/** Class names other modules compose against (they own their own layout). */
		const ui = ui_module_css_default;
		/** A square control that carries an icon and an accessible name. */
		function IconButton(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${ui_module_css_default.iconButton} ${props.active === true ? ui_module_css_default.iconButtonActive : ""} ${props.className ?? ""}`,
				title: props.label,
				"aria-label": props.label,
				"aria-pressed": props.active,
				disabled: props.disabled,
				onClick: props.onClick,
				children: props.children
			});
		}
		/** A labelled control. */
		function Button(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${ui_module_css_default.button} ${props.primary === true ? ui_module_css_default.buttonPrimary : ""} ${props.className ?? ""}`,
				disabled: props.disabled,
				title: props.title,
				onClick: props.onClick,
				children: props.children
			});
		}
		/** A compact status chip. */
		function Pill(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${ui_module_css_default.pill} ${props.className ?? ""}`,
				title: props.title,
				children: props.children
			});
		}
		/** An added/removed line-count pair, hidden when both are zero. */
		function DiffCount(props) {
			if (props.insertions === 0 && props.deletions === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: ui_module_css_default.mono,
				children: [
					props.insertions > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ui_module_css_default.added,
						children: ["+", props.insertions]
					}) : null,
					props.insertions > 0 && props.deletions > 0 ? " " : null,
					props.deletions > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: ui_module_css_default.removed,
						children: ["-", props.deletions]
					}) : null
				]
			});
		}
		/**
		* A button that opens an anchored menu.
		*
		* Dismissal is owned here (outside pointer, Escape, and selection) so no
		* caller has to repeat it, and the menu is rendered inside the anchor so it
		* inherits the workbench token scope.
		*/
		function Popover(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const anchorRef = (0, react.useRef)(null);
			const menuId = (0, react.useId)();
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onPointerDown = (event) => {
					if (anchorRef.current?.contains(event.target) === true) return;
					setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [open]);
			const select = (0, react.useCallback)((row) => {
				if (row.disabled === true) return;
				setOpen(false);
				row.onSelect?.();
			}, []);
			let lastGroup;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ui_module_css_default.popoverAnchor,
				ref: anchorRef,
				style: props.style,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: `${ui_module_css_default.iconButton} ${open ? ui_module_css_default.iconButtonActive : ""} ${props.triggerClassName ?? ""}`,
					"aria-haspopup": "menu",
					"aria-expanded": open,
					"aria-controls": open ? menuId : void 0,
					"aria-label": props.label,
					title: props.label,
					disabled: props.disabled,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: props.trigger
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					id: menuId,
					role: "menu",
					className: `${ui_module_css_default.popover} ${props.placement === "down" ? ui_module_css_default.popoverDown : ui_module_css_default.popoverUp} ${props.align === "end" ? ui_module_css_default.popoverRight : ""} ${props.popoverClassName ?? ""}`,
					children: [props.children, props.rows?.map((row) => {
						const heading = row.group !== void 0 && row.group !== lastGroup ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ui_module_css_default.menuLabel,
							children: row.group
						}) : null;
						lastGroup = row.group;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [heading, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							role: "menuitem",
							disabled: row.disabled,
							className: `${ui_module_css_default.menuItem} ${row.active === true ? ui_module_css_default.menuItemActive : ""} ${row.danger === true ? ui_module_css_default.menuItemDanger : ""}`,
							onClick: () => {
								select(row);
							},
							children: [
								row.icon === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ui_module_css_default.menuIcon,
									children: row.icon
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: `${ui_module_css_default.grow} ${ui_module_css_default.menuContent}`,
									children: [row.label, row.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: ui_module_css_default.menuDetail,
										children: row.detail
									})]
								}),
								row.active === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, {}) : null
							]
						})] }, row.id);
					})]
				}) : null]
			});
		}
		/** A centred explanatory state for an empty or unavailable panel. */
		function EmptyState(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ui_module_css_default.empty,
				children: props.children
			});
		}
		/** An indeterminate progress mark. */
		function Spinner() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: ui_module_css_default.spinner,
				"aria-hidden": true
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\TopBar.module.css.mjs
		const css$15 = ".yomJZG_bar{align-items:center;gap:var(--zx-space-2);height:var(--zx-topbar-height);padding:0 var(--zx-space-3) 0 var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);background:var(--zx-bg-app);-webkit-app-region:drag;flex:none;display:flex}.yomJZG_bar>*{-webkit-app-region:no-drag}.yomJZG_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:var(--zx-text-sm);color:var(--zx-label);flex:1;font-weight:500;overflow:hidden}.yomJZG_titleMuted{color:var(--zx-label-muted);font-weight:400}.yomJZG_chip{align-items:center;gap:var(--zx-space-2);max-width:220px;height:26px;padding:0 var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);cursor:pointer;white-space:nowrap;display:inline-flex}.yomJZG_chip:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.yomJZG_chip:disabled{cursor:default}.yomJZG_chipLabel{text-overflow:ellipsis;min-width:0;overflow:hidden}.yomJZG_divider{width:1px;height:18px;margin:0 var(--zx-space-1);background:var(--zx-border-soft)}.yomJZG_dirty{color:var(--zx-warn)}.yomJZG_themeGlyph{justify-content:center;align-items:center;line-height:1;display:inline-flex}";
		const tagId$15 = "@dsh-portable/dcode-ui/TopBar.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$15) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$15;
			tag.textContent = css$15;
			document.head.appendChild(tag);
		}
		var TopBar_module_css_default = {
			"bar": "yomJZG_bar",
			"chip": "yomJZG_chip",
			"chipLabel": "yomJZG_chipLabel",
			"dirty": "yomJZG_dirty",
			"divider": "yomJZG_divider",
			"themeGlyph": "yomJZG_themeGlyph",
			"title": "yomJZG_title",
			"titleMuted": "yomJZG_titleMuted"
		};
		//#endregion
		//#region src/client/shell/TopBar.tsx
		/**
		* The top bar: what is being worked on, where, and on which branch — plus the
		* command entry and the two panel toggles.
		*
		* Every value is read live: the title comes from the Session Controller's
		* display title, the workspace from the durable registry, and the branch from
		* the same git read the Changes panel uses.
		* @module @dsh-portable/dcode-ui/client/shell/TopBar
		*/
		/** Task, workspace, branch and the surface controls. */
		function TopBar({ navigation, sessionId, cwd }) {
			const runtime = useRuntime();
			const t = useT();
			const state = useNavigation(navigation);
			const list = useSessionList();
			const { groups } = useWorkspaceGroups();
			const git = useGitStatus(cwd, sessionId);
			const appearance = useAppearance();
			const title = sessionId === void 0 ? void 0 : list.byId[sessionId]?.displayTitle;
			const workspace = (0, react.useMemo)(() => groups.find((group) => group.path === cwd) ?? groups.find((group) => group.sessions.some((row) => row.id === sessionId)), [
				groups,
				cwd,
				sessionId
			]);
			const dirty = (git.status?.files.length ?? 0) > 0;
			const branchLabel = git.pending ? void 0 : git.status?.repository === true ? git.status.branch ?? (git.status.detached ? "HEAD" : t("top.branch")) : t("top.noRepository");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: TopBar_module_css_default.bar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: state.railOpen ? t("nav.collapse") : t("nav.expand"),
						active: state.railOpen,
						onClick: () => {
							navigation.toggleRail();
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${TopBar_module_css_default.title} ${title === void 0 ? TopBar_module_css_default.titleMuted : ""}`,
						title,
						children: title ?? t("top.noSession")
					}),
					workspace === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: TopBar_module_css_default.chip,
						title: workspace.path,
						onClick: () => {
							runtime.navigation?.startSession(workspace.workspaceId);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TopBar_module_css_default.chipLabel,
							children: workspace.title
						})]
					}),
					cwd === void 0 || branchLabel === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${TopBar_module_css_default.chip} ${dirty ? TopBar_module_css_default.dirty : ""}`,
						title: branchLabel,
						onClick: () => {
							navigation.openAside("changes");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TopBar_module_css_default.chipLabel,
							children: branchLabel
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: TopBar_module_css_default.divider,
						"aria-hidden": true
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: t("nav.commandPalette"),
						onClick: () => {
							navigation.togglePalette(true);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
						label: t("theme.toggle"),
						placement: "down",
						align: "end",
						disabled: !appearance.canSet,
						trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TopBar_module_css_default.themeGlyph,
							"aria-hidden": true,
							children: appearance.scheme === "dark" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDarkOutline16, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLightOutline16, {})
						}),
						rows: themeMenuRows(t, appearance.preference, appearance.set)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: t("nav.settings"),
						onClick: () => {
							navigation.openSettings("general");
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: t("top.toggleAside"),
						active: state.asideOpen,
						onClick: () => {
							navigation.toggleAside();
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, { className: ui.mirrored })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
						label: t("top.moreActions"),
						placement: "down",
						align: "end",
						trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {}),
						rows: [{
							id: "settings",
							label: t("nav.settings"),
							onSelect: () => {
								navigation.openSettings("general");
							}
						}, {
							id: "official",
							label: t("top.officialUi"),
							detail: t("settings.modeOfficialBody"),
							onSelect: () => {
								runtime.mode.set("official");
							}
						}]
					})
				]
			});
		}
		//#endregion
		//#region src/client/platform.ts
		/** Prefer User-Agent Client Hints and fall back to the conventional UA text. */
		function isApplePlatform(value = typeof navigator === "undefined" ? void 0 : navigator) {
			const platform = value?.userAgentData?.platform;
			const candidate = platform === void 0 || platform === "" ? value?.userAgent ?? "" : platform;
			return /mac|iphone|ipad|ipod/i.test(candidate);
		}
		/** User-facing command shortcut with the platform's conventional modifier. */
		function commandShortcut(key) {
			return isApplePlatform() ? `⌘${key}` : `Ctrl+${key}`;
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\LeftRail.module.css.mjs
		const css$14 = ".Pf74oW_rail{height:100%;min-width:var(--zx-rail-width);flex-direction:column;display:flex;overflow:hidden}.Pf74oW_top{padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-2);padding-top:calc(var(--zx-space-4) + var(--dsh-desktop-titlebar-height,0px));-webkit-app-region:drag;flex-direction:column;gap:2px;display:flex}.Pf74oW_top>*{-webkit-app-region:no-drag}.Pf74oW_action{align-items:center;gap:var(--zx-space-3);width:100%;height:30px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.Pf74oW_action:hover{background:var(--zx-bg-hover)}.Pf74oW_action:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.Pf74oW_actionActive{background:var(--zx-bg-active)}.Pf74oW_shortcut{color:var(--zx-label-faint);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}.Pf74oW_tree{min-height:0;padding:0 var(--zx-space-3) var(--zx-space-3);flex:1;overflow:hidden auto}.Pf74oW_treeActions{padding-top:var(--zx-space-2);flex-direction:column;gap:2px;display:flex}.Pf74oW_group{margin-top:var(--zx-space-3)}.Pf74oW_groupHeader{align-items:center;gap:var(--zx-space-2);width:100%;height:26px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-sm);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.Pf74oW_groupHeader:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.Pf74oW_groupName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.Pf74oW_rowShell{border-radius:var(--zx-radius-md);align-items:center;min-width:0;display:flex}.Pf74oW_rowShell:hover,.Pf74oW_rowShell:focus-within{background:var(--zx-bg-hover)}.Pf74oW_row{align-items:center;gap:var(--zx-space-2);width:auto;min-width:0;min-height:28px;padding:var(--zx-space-1) var(--zx-space-3) var(--zx-space-1) var(--zx-space-5);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;flex:1;display:flex}.Pf74oW_row:hover{color:var(--zx-label)}.Pf74oW_row:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.Pf74oW_rowActive{background:var(--zx-bg-active);color:var(--zx-label)}.Pf74oW_rowMenu{opacity:0;pointer-events:none;transition:opacity var(--zx-motion-fast);flex:none}.Pf74oW_rowShell:hover .Pf74oW_rowMenu,.Pf74oW_rowShell:focus-within .Pf74oW_rowMenu{opacity:1;pointer-events:auto}.Pf74oW_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.Pf74oW_rowTime{color:var(--zx-label-faint);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}.Pf74oW_dot{border-radius:50%;flex:none;width:6px;height:6px}.Pf74oW_dotRunning{background:var(--zx-accent);animation:1.4s ease-in-out infinite Pf74oW_zx-pulse}.Pf74oW_dotDone{background:var(--zx-success)}@keyframes Pf74oW_zx-pulse{0%,to{opacity:1}50%{opacity:.35}}@media (prefers-reduced-motion:reduce){.Pf74oW_dotRunning{animation:none}}.Pf74oW_foot{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-3);border-top:1px solid var(--zx-border-soft);display:flex}.Pf74oW_avatar{background:var(--zx-bg-active);width:26px;height:26px;color:var(--zx-label-secondary);border-radius:50%;flex:none;place-items:center;display:grid}.Pf74oW_accountTrigger{width:100%;padding:0 var(--zx-space-2) 0 0;justify-content:flex-start}.Pf74oW_footName{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:var(--zx-text-xs);color:var(--zx-label-secondary);flex:1;overflow:hidden}.Pf74oW_deleteConfirm{color:var(--zx-error)}";
		const tagId$14 = "@dsh-portable/dcode-ui/LeftRail.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$14) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$14;
			tag.textContent = css$14;
			document.head.appendChild(tag);
		}
		var LeftRail_module_css_default = {
			"accountTrigger": "Pf74oW_accountTrigger",
			"action": "Pf74oW_action",
			"actionActive": "Pf74oW_actionActive",
			"avatar": "Pf74oW_avatar",
			"deleteConfirm": "Pf74oW_deleteConfirm",
			"dot": "Pf74oW_dot",
			"dotDone": "Pf74oW_dotDone",
			"dotRunning": "Pf74oW_dotRunning",
			"foot": "Pf74oW_foot",
			"footName": "Pf74oW_footName",
			"group": "Pf74oW_group",
			"groupHeader": "Pf74oW_groupHeader",
			"groupName": "Pf74oW_groupName",
			"rail": "Pf74oW_rail",
			"row": "Pf74oW_row",
			"rowActive": "Pf74oW_rowActive",
			"rowMenu": "Pf74oW_rowMenu",
			"rowShell": "Pf74oW_rowShell",
			"rowTime": "Pf74oW_rowTime",
			"rowTitle": "Pf74oW_rowTitle",
			"shortcut": "Pf74oW_shortcut",
			"top": "Pf74oW_top",
			"tree": "Pf74oW_tree",
			"treeActions": "Pf74oW_treeActions",
			"zx-pulse": "Pf74oW_zx-pulse"
		};
		//#endregion
		//#region src/client/shell/LeftRail.tsx
		/**
		* The left rail: the primary task action, the workspace/task tree, and the
		* account foot.
		*
		* The tree is the Session Controller's list grouped by the durable Workspace
		* registry — the same two stores the official sidebar reads — so a task
		* started in either surface appears in both.
		* @module @dsh-portable/dcode-ui/client/shell/LeftRail
		*/
		/** Suffix per relative-time bucket; `now` shows the bare word. */
		const AGE_SUFFIX = {
			minutes: "m",
			hours: "h",
			days: "d",
			months: "mo",
			years: "y"
		};
		/** The compact outline language used by the account menu. */
		function AccountGlyph({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				"aria-hidden": "true",
				viewBox: "0 0 20 20",
				width: "18",
				height: "18",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.55",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				children
			});
		}
		function AccountUserGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(AccountGlyph, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				cx: "10",
				cy: "7.1",
				r: "2.55"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4.9 16.2c.55-2.35 2.35-3.6 5.1-3.6s4.55 1.25 5.1 3.6" })] });
		}
		function AccountSettingsGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(AccountGlyph, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "10",
					cy: "10",
					r: "2.45"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M10 2.9v1.55M10 15.55v1.55M2.9 10h1.55M15.55 10h1.55M4.98 4.98l1.1 1.1M13.92 13.92l1.1 1.1M15.02 4.98l-1.1 1.1M6.08 13.92l-1.1 1.1" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12.2 3.45l.55 1.55 1.5.65 1.5-.5 1.1 1.1-.5 1.5.65 1.5 1.55.55v1.55l-1.55.55-.65 1.5.5 1.5-1.1 1.1-1.5-.5-1.5.65-.55 1.55H10" })
			] });
		}
		function AccountUsageGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(AccountGlyph, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
					cx: "8.2",
					cy: "4.6",
					rx: "4.55",
					ry: "2"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.65 4.6v4.25c0 1.1 2.05 2 4.55 2s4.55-.9 4.55-2V4.6" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3.65 8.85v4.25c0 1.1 2.05 2 4.55 2s4.55-.9 4.55-2V8.85" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M15.2 11.1v4.2M13.1 13.2h4.2" })
			] });
		}
		function AccountPluginsGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(AccountGlyph, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "10",
					cy: "3.8",
					r: "1",
					fill: "currentColor",
					stroke: "none"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "10",
					cy: "16.2",
					r: "1",
					fill: "currentColor",
					stroke: "none"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "3.8",
					cy: "10",
					r: "1",
					fill: "currentColor",
					stroke: "none"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "16.2",
					cy: "10",
					r: "1",
					fill: "currentColor",
					stroke: "none"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.2 6.2l1.55 1.55M12.25 12.25l1.55 1.55M13.8 6.2l-1.55 1.55M7.75 12.25L6.2 13.8" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "10",
					cy: "10",
					r: "2.1"
				})
			] });
		}
		function AccountExternalGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(AccountGlyph, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5.2 14.8L15.9 4.1M10.1 4.1h5.8v5.8" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14.5 12.6v2.7c0 .55-.45 1-1 1H5.1c-.55 0-1-.45-1-1V6.9c0-.55.45-1 1-1h2.7" })] });
		}
		/** Compact relative age of a session's last update. */
		function useAge() {
			return (0, react.useCallback)((updatedAt) => {
				const { unit, n } = (0, _deepseek_ai_dsh_client_ui_primitives.relativeTime)(updatedAt, Date.now());
				if (unit === "now") return "·";
				return `${String(n)}${AGE_SUFFIX[unit] ?? ""}`;
			}, []);
		}
		/** One session row. */
		function SessionRow(props) {
			const { session, current } = props;
			const t = useT();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LeftRail_module_css_default.rowShell,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `${LeftRail_module_css_default.row} ${current ? LeftRail_module_css_default.rowActive : ""}`,
					onClick: props.onOpen,
					title: session.displayTitle,
					children: [
						session.running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${LeftRail_module_css_default.dot} ${LeftRail_module_css_default.dotRunning}`,
							"aria-hidden": true
						}) : session.completed === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${LeftRail_module_css_default.dot} ${LeftRail_module_css_default.dotDone}`,
							"aria-hidden": true
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LeftRail_module_css_default.dot,
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LeftRail_module_css_default.rowTitle,
							children: session.displayTitle
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LeftRail_module_css_default.rowTime,
							children: props.age
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
					label: t("top.moreActions"),
					placement: "down",
					align: "end",
					triggerClassName: LeftRail_module_css_default.rowMenu,
					trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {}),
					rows: [{
						id: "archive",
						label: t("session.archive"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutline20, { size: 16 }),
						onSelect: props.onArchive
					}, {
						id: "delete",
						label: t("session.delete"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
						danger: true,
						onSelect: props.onDelete
					}]
				})]
			});
		}
		/** The task action, scrollable navigation/tree, and account foot. */
		function LeftRail({ navigation, onNewTask }) {
			const runtime = useRuntime();
			const t = useT();
			const state = useNavigation(navigation);
			const list = useSessionList();
			const { groups, ungrouped } = useWorkspaceGroups();
			const age = useAge();
			const [collapsed, setCollapsed] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [deleteTarget, setDeleteTarget] = (0, react.useState)();
			const [deleting, setDeleting] = (0, react.useState)(false);
			const toggleGroup = (0, react.useCallback)((id) => {
				setCollapsed((previous) => {
					const next = new Set(previous);
					if (!next.delete(id)) next.add(id);
					return next;
				});
			}, []);
			const hasRows = (0, react.useMemo)(() => ungrouped.length > 0 || groups.some((group) => group.sessions.length > 0), [groups, ungrouped]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: LeftRail_module_css_default.rail,
				"aria-label": t("app.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LeftRail_module_css_default.top,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: LeftRail_module_css_default.action,
							onClick: onNewTask,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ui.grow,
									children: t("nav.newTask")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LeftRail_module_css_default.shortcut,
									children: commandShortcut("N")
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `${LeftRail_module_css_default.tree} ${ui.scroll}`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LeftRail_module_css_default.treeActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${LeftRail_module_css_default.action} ${state.view === "settings" && state.settingsSection === "plugins" ? LeftRail_module_css_default.actionActive : ""}`,
								onClick: () => {
									navigation.openSettings("plugins");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: 16 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ui.grow,
									children: t("nav.plugins")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${LeftRail_module_css_default.action} ${state.view === "learning" ? LeftRail_module_css_default.actionActive : ""}`,
								onClick: () => {
									navigation.show("learning");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ui.grow,
									children: t("nav.learning")
								})]
							})]
						}), hasRows ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LeftRail_module_css_default.group,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: LeftRail_module_css_default.groupHeader,
								onClick: () => {
									toggleGroup(group.workspaceId);
								},
								title: group.path,
								children: [collapsed.has(group.workspaceId) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LeftRail_module_css_default.groupName,
									children: group.title
								})]
							}), collapsed.has(group.workspaceId) ? null : group.sessions.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
								session,
								current: session.id === list.current,
								age: age(session.updatedAt),
								onOpen: () => {
									navigation.show("session");
									runtime.sessions.open(session.id);
								},
								onArchive: () => {
									runtime.navigation?.archiveSession(session.id);
								},
								onDelete: () => {
									setDeleteTarget(session);
								}
							}, session.id))]
						}, group.workspaceId)), ungrouped.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: LeftRail_module_css_default.group,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: LeftRail_module_css_default.groupHeader,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: LeftRail_module_css_default.groupName,
									children: t("nav.ungrouped")
								})
							}), ungrouped.map((session) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionRow, {
								session,
								current: session.id === list.current,
								age: age(session.updatedAt),
								onOpen: () => {
									navigation.show("session");
									runtime.sessions.open(session.id);
								},
								onArchive: () => {
									runtime.navigation?.archiveSession(session.id);
								},
								onDelete: () => {
									setDeleteTarget(session);
								}
							}, session.id))]
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("nav.noTasks") })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LeftRail_module_css_default.foot,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
							label: t("account.menu"),
							placement: "up",
							align: "start",
							style: { flex: 1 },
							triggerClassName: LeftRail_module_css_default.accountTrigger,
							trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LeftRail_module_css_default.avatar,
								"aria-hidden": true,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountUserGlyph, {})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LeftRail_module_css_default.footName,
								children: t("app.title")
							})] }),
							rows: [
								{
									id: "settings",
									label: t("nav.settings"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountSettingsGlyph, {}),
									onSelect: () => {
										navigation.openSettings("general");
									}
								},
								{
									id: "usage",
									label: t("account.usage"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountUsageGlyph, {}),
									onSelect: () => {
										navigation.openSettings("usage");
									}
								},
								{
									id: "plugins",
									label: t("nav.plugins"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountPluginsGlyph, {}),
									onSelect: () => {
										navigation.openSettings("plugins");
									}
								},
								{
									id: "official",
									label: t("top.officialUi"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountExternalGlyph, {}),
									onSelect: () => {
										runtime.mode.set("official");
									}
								}
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleteTarget !== void 0,
						onClose: () => {
							if (!deleting) setDeleteTarget(void 0);
						},
						title: t("session.deleteTitle"),
						closeLabel: t("common.close"),
						description: t("session.deleteBody"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							autoFocus: true,
							disabled: deleting,
							onClick: () => {
								if (!deleting) setDeleteTarget(void 0);
							},
							children: t("common.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: LeftRail_module_css_default.deleteConfirm,
							disabled: deleting,
							onClick: () => {
								const target = deleteTarget;
								if (target === void 0 || deleting) return;
								setDeleting(true);
								runtime.sessions.delete(target.id).then(() => {
									setDeleteTarget(void 0);
								}).catch(() => {}).finally(() => {
									setDeleting(false);
								});
							},
							children: t("session.delete")
						})] })
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\git\GitPanel.module.css.mjs
		const css$13 = ".gHyypa_panel{gap:var(--zx-space-3);flex-direction:column;display:flex}.gHyypa_head{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);font-weight:500;display:flex}.gHyypa_summary{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-2) var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);font-size:var(--zx-text-xs);color:var(--zx-label);display:flex}.gHyypa_summaryLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.gHyypa_branchRow{align-items:center;gap:var(--zx-space-2);min-width:0;font-size:var(--zx-text-xs);color:var(--zx-label-secondary);white-space:nowrap;display:flex}.gHyypa_branchRow>span{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.gHyypa_files{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);flex-direction:column;display:flex;overflow:hidden}.gHyypa_file{align-items:center;gap:var(--zx-space-3);width:100%;min-height:28px;padding:var(--zx-space-1) var(--zx-space-3);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.gHyypa_file+.gHyypa_file{border-top:1px solid var(--zx-border-soft)}.gHyypa_file:hover{background:var(--zx-bg-hover)}.gHyypa_file:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.gHyypa_fileActive{background:var(--zx-bg-active)}.gHyypa_code{width:16px;color:var(--zx-label-faint);font-family:var(--zx-font-mono);text-align:center;flex:none}.gHyypa_codeAdded{color:var(--zx-added)}.gHyypa_codeRemoved{color:var(--zx-removed)}.gHyypa_codeUntracked{color:var(--zx-warn)}.gHyypa_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);direction:rtl;flex:1;overflow:hidden}.gHyypa_commit{gap:var(--zx-space-2);flex-direction:column;display:flex}.gHyypa_input{width:100%;min-height:30px;padding:var(--zx-space-2) var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);resize:vertical;box-sizing:border-box}.gHyypa_input:focus{border-color:var(--zx-accent);box-shadow:var(--zx-focus-ring);outline:none}.gHyypa_note{color:var(--zx-label-muted);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body);overflow-wrap:anywhere}.gHyypa_noteError{color:var(--zx-error)}.gHyypa_actions{align-items:center;gap:var(--zx-space-2);display:flex}";
		const tagId$13 = "@dsh-portable/dcode-ui/GitPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$13) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$13;
			tag.textContent = css$13;
			document.head.appendChild(tag);
		}
		var GitPanel_module_css_default = {
			"actions": "gHyypa_actions",
			"branchRow": "gHyypa_branchRow",
			"code": "gHyypa_code",
			"codeAdded": "gHyypa_codeAdded",
			"codeRemoved": "gHyypa_codeRemoved",
			"codeUntracked": "gHyypa_codeUntracked",
			"commit": "gHyypa_commit",
			"file": "gHyypa_file",
			"fileActive": "gHyypa_fileActive",
			"files": "gHyypa_files",
			"head": "gHyypa_head",
			"input": "gHyypa_input",
			"note": "gHyypa_note",
			"noteError": "gHyypa_noteError",
			"panel": "gHyypa_panel",
			"path": "gHyypa_path",
			"summary": "gHyypa_summary",
			"summaryLabel": "gHyypa_summaryLabel"
		};
		//#endregion
		//#region src/client/git/GitPanel.tsx
		/**
		* The Git tools panel: branch, working-tree changes, and a commit entry.
		*
		* This is the capability the Harness itself does not ship, completed over the
		* `/dcode` host channel. It stays deliberately small — status, diff, commit —
		* because anything wider (push, rebase, history rewriting) belongs in a real
		* git client, not in a panel beside a conversation.
		* @module @dsh-portable/dcode-ui/client/git/GitPanel
		*/
		/** Colour class for a porcelain status letter. */
		function codeClass(file) {
			if (file.status === "untracked") return GitPanel_module_css_default.codeUntracked;
			if (file.status === "added") return GitPanel_module_css_default.codeAdded;
			if (file.status === "deleted") return GitPanel_module_css_default.codeRemoved;
			return "";
		}
		/** Single-letter status mark for a changed file. */
		function codeMark(file) {
			switch (file.status) {
				case "untracked": return "U";
				case "added": return "A";
				case "deleted": return "D";
				case "renamed": return "R";
				case "conflicted": return "!";
				default: return "M";
			}
		}
		/** Branch, changed files and the commit entry. */
		function GitPanel({ cwd, sessionId, selected, onOpenDiff }) {
			const runtime = useRuntime();
			const t = useT();
			const git = useGitStatus(cwd, sessionId);
			const [message, setMessage] = (0, react.useState)("");
			const [committing, setCommitting] = (0, react.useState)(false);
			const [note, setNote] = (0, react.useState)(void 0);
			const [branches, setBranches] = (0, react.useState)([]);
			(0, react.useEffect)(() => {
				if (cwd === void 0) {
					setBranches([]);
					return;
				}
				let live = true;
				runtime.git.branches(cwd).then((result) => {
					if (live && result.ok) setBranches(result.value.branches);
				});
				return () => {
					live = false;
				};
			}, [
				runtime,
				cwd,
				git.status
			]);
			const commit = (0, react.useCallback)(() => {
				if (cwd === void 0) return;
				setCommitting(true);
				setNote(void 0);
				runtime.git.commit(cwd, message).then((result) => {
					setCommitting(false);
					if (!result.ok) {
						setNote({
							text: result.error.message,
							error: true
						});
						return;
					}
					if (!result.value.committed) {
						setNote({
							text: result.value.reason === "nothing-staged" ? t("git.nothingStaged") : result.value.reason ?? t("common.error"),
							error: true
						});
						return;
					}
					setMessage("");
					setNote({
						text: t("git.committed", { commit: result.value.commit ?? "" }),
						error: false
					});
					git.refresh();
				});
			}, [
				runtime,
				cwd,
				message,
				git,
				t
			]);
			if (git.unavailable) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("git.unavailable") });
			if (cwd === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("chat.empty.noWorkspace") });
			if (git.pending) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (git.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: git.error });
			if (git.status === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("common.error") });
			if (!git.status.repository) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("git.notRepository") });
			const status = git.status;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: GitPanel_module_css_default.panel,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: GitPanel_module_css_default.head,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ui.grow,
							children: t("git.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
							label: t("git.refresh"),
							onClick: git.refresh,
							children: git.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: GitPanel_module_css_default.summary,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: GitPanel_module_css_default.summaryLabel,
							children: t("git.changes")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffCount, {
							insertions: status.insertions,
							deletions: status.deletions
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: GitPanel_module_css_default.branchRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
								label: t("git.branches"),
								placement: "down",
								trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: status.branch ?? "HEAD" })] }),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: ui.menuLabel,
									children: t("git.branchReadOnly")
								}),
								rows: branches.map((branch) => ({
									id: branch.name,
									label: branch.name,
									detail: branch.current ? t("git.currentBranch") : void 0,
									disabled: true
								})),
								triggerClassName: GitPanel_module_css_default.branchRow
							}),
							status.ahead > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("git.ahead", { count: status.ahead }) }) : null,
							status.behind > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("git.behind", { count: status.behind }) }) : null
						]
					}),
					status.files.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("git.clean") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: GitPanel_module_css_default.files,
						children: status.files.map((file) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${GitPanel_module_css_default.file} ${selected === file.path ? GitPanel_module_css_default.fileActive : ""}`,
							onClick: () => {
								onOpenDiff(file.path, file.staged);
							},
							title: file.path,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${GitPanel_module_css_default.code} ${codeClass(file)}`,
									"aria-hidden": true,
									children: codeMark(file)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: GitPanel_module_css_default.path,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", { children: file.path })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffCount, {
									insertions: file.insertions,
									deletions: file.deletions
								})
							]
						}, `${file.code}:${file.path}`))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: GitPanel_module_css_default.commit,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: GitPanel_module_css_default.input,
							rows: 2,
							value: message,
							placeholder: t("git.commitPlaceholder"),
							onChange: (event) => {
								setMessage(event.target.value);
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: GitPanel_module_css_default.actions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								primary: true,
								disabled: committing || message.trim() === "" || status.files.length === 0,
								onClick: commit,
								children: committing ? t("git.committing") : t("git.commit")
							}), note === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${GitPanel_module_css_default.note} ${note.error ? GitPanel_module_css_default.noteError : ""}`,
								children: note.text
							})]
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/git/patch.ts
		/**
		* Turn a unified patch into numbered lines.
		*
		* File headers before the first hunk are dropped: the panel already names the
		* file, and `diff --git`/`index` lines cost three rows of a narrow column.
		* @param patch - unified diff text from git.
		* @returns the lines to render, in patch order.
		*/
		function parsePatch(patch) {
			const lines = [];
			let oldNo = 0;
			let newNo = 0;
			let started = false;
			for (const raw of patch.split("\n")) {
				const hunk = /^(@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@)(.*)$/.exec(raw);
				if (hunk !== null) {
					started = true;
					oldNo = Number(hunk[2]);
					newNo = Number(hunk[3]);
					lines.push({
						kind: "hunk",
						text: raw,
						range: hunk[1] ?? raw,
						section: (hunk[4] ?? "").trim()
					});
					continue;
				}
				if (raw.startsWith("diff --git ")) {
					started = false;
					continue;
				}
				if (!started) continue;
				if (raw.startsWith("+")) {
					lines.push({
						kind: "add",
						text: raw.slice(1),
						newNo
					});
					newNo += 1;
					continue;
				}
				if (raw.startsWith("-")) {
					lines.push({
						kind: "remove",
						text: raw.slice(1),
						oldNo
					});
					oldNo += 1;
					continue;
				}
				if (raw.startsWith("\\")) {
					lines.push({
						kind: "meta",
						text: raw
					});
					continue;
				}
				lines.push({
					kind: "context",
					text: raw.startsWith(" ") ? raw.slice(1) : raw,
					oldNo,
					newNo
				});
				oldNo += 1;
				newNo += 1;
			}
			while (lines.length > 0 && lines[lines.length - 1]?.text === "" && lines[lines.length - 1]?.kind === "context") lines.pop();
			return lines;
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\git\DiffViewer.module.css.mjs
		const css$12 = ".CAvRJW_viewer{gap:var(--zx-space-2);flex-direction:column;min-height:0;display:flex}.CAvRJW_head{align-items:center;gap:var(--zx-space-2);font-size:var(--zx-text-xs);color:var(--zx-label-secondary);display:flex}.CAvRJW_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);color:var(--zx-label);direction:rtl;flex:1;overflow:hidden}.CAvRJW_body{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);max-height:60vh;font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;line-height:1.6;position:relative;overflow:auto}.CAvRJW_body::-webkit-scrollbar{width:10px;height:10px}.CAvRJW_body::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.CAvRJW_line{white-space:pre;align-items:baseline;min-width:max-content;display:flex}.CAvRJW_gutter{z-index:1;gap:var(--zx-space-3);padding:0 var(--zx-space-3);background:var(--zx-bg-card);border-right:1px solid var(--zx-border-soft);flex:none;display:flex;position:sticky;left:0}.CAvRJW_lineNo{text-align:right;min-width:3.5ch;color:var(--zx-label-faint);font-variant-numeric:tabular-nums;user-select:none}.CAvRJW_sign{width:2ch;padding-left:var(--zx-space-2);color:var(--zx-label-faint);user-select:none;flex:none}.CAvRJW_text{min-width:0;padding-right:var(--zx-space-3);flex:1}.CAvRJW_added{background:color-mix(in srgb, var(--zx-added) 12%, transparent);box-shadow:inset 2px 0 0 color-mix(in srgb, var(--zx-added) 70%, transparent)}.CAvRJW_added .CAvRJW_sign,.CAvRJW_added .CAvRJW_text{color:var(--zx-label)}.CAvRJW_added .CAvRJW_sign{color:var(--zx-added)}.CAvRJW_removed{background:color-mix(in srgb, var(--zx-removed) 12%, transparent);box-shadow:inset 2px 0 0 color-mix(in srgb, var(--zx-removed) 70%, transparent)}.CAvRJW_removed .CAvRJW_sign,.CAvRJW_removed .CAvRJW_text{color:var(--zx-label)}.CAvRJW_removed .CAvRJW_sign{color:var(--zx-removed)}.CAvRJW_hunk{z-index:2;gap:var(--zx-space-3);padding:2px var(--zx-space-3);background:var(--zx-bg-panel);border-top:1px solid var(--zx-border-soft);border-bottom:1px solid var(--zx-border-soft);position:sticky;top:0}.CAvRJW_line.CAvRJW_hunk:first-child{border-top:0}.CAvRJW_range{color:var(--zx-accent);font-variant-numeric:tabular-nums;flex:none}.CAvRJW_section{text-overflow:ellipsis;min-width:0;color:var(--zx-label-muted);overflow:hidden}.CAvRJW_meta{color:var(--zx-label-faint);font-style:italic}.CAvRJW_note{color:var(--zx-label-muted);font-size:var(--zx-text-micro)}";
		const tagId$12 = "@dsh-portable/dcode-ui/DiffViewer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$12) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$12;
			tag.textContent = css$12;
			document.head.appendChild(tag);
		}
		var DiffViewer_module_css_default = {
			"added": "CAvRJW_added",
			"body": "CAvRJW_body",
			"gutter": "CAvRJW_gutter",
			"head": "CAvRJW_head",
			"hunk": "CAvRJW_hunk",
			"line": "CAvRJW_line",
			"lineNo": "CAvRJW_lineNo",
			"meta": "CAvRJW_meta",
			"note": "CAvRJW_note",
			"path": "CAvRJW_path",
			"range": "CAvRJW_range",
			"removed": "CAvRJW_removed",
			"section": "CAvRJW_section",
			"sign": "CAvRJW_sign",
			"text": "CAvRJW_text",
			"viewer": "CAvRJW_viewer"
		};
		//#endregion
		//#region src/client/git/DiffViewer.tsx
		/**
		* Unified-diff viewer for one working-tree file.
		*
		* The patch comes from git itself, so what the panel shows is exactly what a
		* commit would record. Rendering is line-based rather than word-based: at the
		* width of a side panel a word-level diff is noise, and the old/new line
		* numbers are the thing an operator actually cross-references against an
		* editor. The patch reader itself lives in {@link module:.../git/patch}.
		* @module @dsh-portable/dcode-ui/client/git/DiffViewer
		*/
		/** One file's diff, read on demand. */
		function DiffViewer({ cwd, path, staged, onClose }) {
			const runtime = useRuntime();
			const t = useT();
			const { value, loading, error } = useAsync(async () => await runtime.git.diff(cwd, path, staged), [
				runtime,
				cwd,
				path,
				staged
			]);
			const lines = (0, react.useMemo)(() => value?.ok === true ? parsePatch(value.value.patch) : [], [value]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: DiffViewer_module_css_default.viewer,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: DiffViewer_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: DiffViewer_module_css_default.path,
								title: path,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", { children: path })
							}),
							value?.ok === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffCount, {
								insertions: value.value.insertions,
								deletions: value.value.deletions
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
								label: t("common.close"),
								onClick: onClose,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
							})
						]
					}),
					loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) }) : null,
					error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: error }) : null,
					value?.ok === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: value.error.message }) : null,
					value?.ok === true && value.value.binary ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("git.binary") }) : null,
					value?.ok === true && !value.value.binary && lines.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("git.noDiff") }) : null,
					lines.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: DiffViewer_module_css_default.body,
						children: lines.map((line, index) => line.kind === "hunk" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${DiffViewer_module_css_default.line} ${DiffViewer_module_css_default.hunk}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: DiffViewer_module_css_default.range,
								children: line.range
							}), line.section === void 0 || line.section === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: DiffViewer_module_css_default.section,
								children: line.section
							})]
						}, index) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${DiffViewer_module_css_default.line} ${line.kind === "add" ? DiffViewer_module_css_default.added : ""} ${line.kind === "remove" ? DiffViewer_module_css_default.removed : ""} ${line.kind === "meta" ? DiffViewer_module_css_default.meta : ""}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: DiffViewer_module_css_default.gutter,
									"aria-hidden": true,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: DiffViewer_module_css_default.lineNo,
										children: line.oldNo ?? ""
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: DiffViewer_module_css_default.lineNo,
										children: line.newNo ?? ""
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: DiffViewer_module_css_default.sign,
									"aria-hidden": true,
									children: line.kind === "add" ? "+" : line.kind === "remove" ? "-" : " "
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: DiffViewer_module_css_default.text,
									children: line.text
								})
							]
						}, index))
					}),
					value?.ok === true && value.value.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: DiffViewer_module_css_default.note,
						children: t("git.truncated")
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/chat/tools.ts
		/** Tools that change files on disk. */
		const MUTATING = /* @__PURE__ */ new Set([
			"write",
			"edit",
			"str_replace_editor"
		]);
		/** Argument fields that name a path, in the order they are consulted. */
		const PATH_FIELDS = [
			"file_path",
			"path",
			"notebook_path",
			"target",
			"filename"
		];
		/**
		* Parse a tool call's raw arguments.
		* @param argsRaw - the JSON text recorded on the call event.
		* @returns the parsed object, or an empty object for absent or malformed JSON.
		*/
		function parseArgs(argsRaw) {
			if (argsRaw === void 0 || argsRaw.trim() === "") return {};
			try {
				const parsed = JSON.parse(argsRaw);
				return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
			} catch {
				return {};
			}
		}
		/** First string field present among the candidates. */
		function firstString(args, fields) {
			for (const field of fields) {
				const value = args[field];
				if (typeof value === "string" && value.trim() !== "") return value;
			}
		}
		/** Collapse whitespace and cap a detail line so a card head stays one line. */
		function oneLine(value, limit = 160) {
			const collapsed = value.replace(/\s+/g, " ").trim();
			return collapsed.length > limit ? `${collapsed.slice(0, limit - 1)}…` : collapsed;
		}
		/**
		* Summarize one tool call for the compact card.
		* @param name - tool name from the call event.
		* @param argsRaw - raw JSON arguments from the call event.
		* @returns the card head material.
		*/
		function summarizeTool(name, argsRaw) {
			const args = parseArgs(argsRaw);
			const path = firstString(args, PATH_FIELDS);
			const base = {
				files: path === void 0 ? [] : [path],
				mutating: MUTATING.has(name)
			};
			switch (name) {
				case "bash":
				case "pwsh":
				case "terminal_send": return {
					...base,
					kind: "run",
					detail: oneLine(firstString(args, [
						"command",
						"input",
						"script"
					]) ?? "")
				};
				case "read":
				case "read_image":
				case "read_attachment": return {
					...base,
					kind: "read",
					detail: oneLine(path ?? "")
				};
				case "write": return {
					...base,
					kind: "write",
					detail: oneLine(path ?? "")
				};
				case "edit":
				case "str_replace_editor": return {
					...base,
					kind: "edit",
					detail: oneLine(path ?? "")
				};
				case "glob":
				case "grep":
				case "session_search":
				case "fs_search": return {
					...base,
					kind: "search",
					detail: oneLine(firstString(args, [
						"pattern",
						"query",
						"regex"
					]) ?? "")
				};
				case "web_search":
				case "web_fetch": return {
					...base,
					kind: "web",
					detail: oneLine(firstString(args, ["query", "url"]) ?? "")
				};
				case "todo_write":
				case "create_goal":
				case "update_goal":
				case "get_goal": return {
					...base,
					kind: "plan",
					detail: ""
				};
				case "skill": return {
					...base,
					kind: "skill",
					detail: oneLine(firstString(args, ["name", "skill"]) ?? "")
				};
				case "task":
				case "spawn_teammate":
				case "send_message":
				case "report": return {
					...base,
					kind: "agent",
					detail: oneLine(firstString(args, [
						"description",
						"prompt",
						"message"
					]) ?? "")
				};
				default: {
					const fallback = Object.entries(args).find(([, value]) => typeof value === "string" && value.trim() !== "");
					return {
						...base,
						kind: "other",
						detail: oneLine(typeof fallback?.[1] === "string" ? fallback[1] : "")
					};
				}
			}
		}
		/**
		* Flatten a tool result's content blocks into displayable text.
		* @param content - result content blocks.
		* @returns the concatenated text, or an empty string for a non-textual result.
		*/
		function resultText(content) {
			return content.map((block) => {
				const typed = block;
				return typed.type === "text" || typed.type === "reasoning" ? typed.text ?? "" : "";
			}).filter((text) => text !== "").join("\n");
		}
		/**
		* Flatten a message's content blocks into displayable text.
		* @param content - message content blocks.
		* @returns the concatenated text of every text block.
		*/
		function messageText(content) {
			return content.map((block) => {
				const typed = block;
				return typed.type === "text" ? typed.text ?? "" : "";
			}).filter((text) => text !== "").join("\n");
		}
		/** Walk a tool block and its children depth-first. */
		function* walkCalls$1(block) {
			yield block;
			for (const child of block.subCalls) yield* walkCalls$1(child);
		}
		/**
		* Collect the paths a set of conversation nodes wrote or edited.
		*
		* This is what the file-change card summarizes and what the turn-undo action
		* restores, so it counts only calls that actually settled without an error:
		* a failed write never touched the tree and must not be offered for undo.
		* @param nodes - conversation nodes to scan, usually one turn's slice.
		* @returns distinct workspace-relative or absolute paths, in first-touch order.
		*/
		function changedPaths(nodes) {
			const paths = [];
			const seen = /* @__PURE__ */ new Set();
			const admit = (result) => {
				if (result.isError) return;
				const name = result.call?.name;
				if (name === void 0 || !MUTATING.has(name)) return;
				const summary = summarizeTool(name, result.call?.argsRaw);
				const metaPath = result.meta?.path;
				const candidates = [...summary.files, ...typeof metaPath === "string" && metaPath !== "" ? [metaPath] : []];
				for (const path of candidates) {
					if (seen.has(path)) continue;
					seen.add(path);
					paths.push(path);
				}
			};
			for (const node of nodes) {
				if (node.kind !== "tool-result") continue;
				for (const block of walkCalls$1(node)) if ("isError" in block) admit(block);
			}
			return paths;
		}
		/**
		* Split conversation nodes into the turns they belong to.
		*
		* A turn boundary is a user message: everything after it, until the next one,
		* is the assistant's answer to it. That is the unit the file-change card and
		* the undo action address, and it holds for a transcript whose window was cut
		* mid-conversation because the first slice simply has no user head.
		* @param nodes - the ordered conversation nodes.
		* @returns node slices, oldest first.
		*/
		function splitTurns(nodes) {
			const turns = [];
			let current = [];
			for (const node of nodes) {
				if (node.kind === "user" && current.length > 0) {
					turns.push(current);
					current = [];
				}
				current.push(node);
			}
			if (current.length > 0) turns.push(current);
			return turns;
		}
		//#endregion
		//#region src/client/chat/ansi.ts
		/** Lines beyond this are not worth a DOM node; the output box scrolls anyway. */
		const DEFAULT_MAX_LINES = 4e3;
		/** 256 KiB of visible text, well past any output a card should render. */
		const DEFAULT_MAX_CHARS = 262144;
		/** The six levels of the xterm 6×6×6 colour cube. */
		const CUBE_LEVELS = [
			0,
			95,
			135,
			175,
			215,
			255
		];
		/**
		* Whether a string carries anything this reader would change.
		*
		* The fast path exists for the common case: most tool output is plain, and
		* plain text should reach the DOM as one text node, not as a span list.
		* @param text - candidate output.
		* @returns true when parsing would do something.
		*/
		function hasAnsi(text) {
			return text.includes("\x1B") || text.includes("\r");
		}
		/**
		* One of the sixteen palette colours, as a themeable CSS value.
		* @param index - SGR colour index 0..15.
		* @returns a `var()` reference into the workbench's terminal palette.
		*/
		function paletteColor(index) {
			return `var(--zx-ansi-${String(index)})`;
		}
		/**
		* A 24-bit colour as a hex literal.
		* @param r - red 0..255.
		* @param g - green 0..255.
		* @param b - blue 0..255.
		* @returns `#rrggbb`.
		*/
		function rgbColor(r, g, b) {
			const channel = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
			return `#${channel(r)}${channel(g)}${channel(b)}`;
		}
		/**
		* One of the 256 xterm colours.
		*
		* The first sixteen stay themeable palette references; the cube and the
		* greyscale ramp carry their own absolute values, exactly as a terminal
		* would render them.
		* @param index - colour index 0..255.
		* @returns a CSS colour value.
		*/
		function xtermColor(index) {
			if (index < 16) return paletteColor(index);
			if (index < 232) {
				const offset = index - 16;
				return rgbColor(CUBE_LEVELS[Math.floor(offset / 36)] ?? 0, CUBE_LEVELS[Math.floor(offset / 6) % 6] ?? 0, CUBE_LEVELS[offset % 6] ?? 0);
			}
			const level = 8 + (index - 232) * 10;
			return rgbColor(level, level, level);
		}
		/**
		* Index of the next parameter that carries a value.
		*
		* The ITU form of an extended colour (`38:2::r:g:b`) leaves an empty
		* colour-space slot, so extended-colour reads skip blanks rather than
		* counting positions.
		* @param params - the SGR parameter list.
		* @param from - index to start looking at.
		* @returns the index, or the list length when there is none.
		*/
		function nextValue(params, from) {
			let index = from;
			while (index < params.length && params[index] === "") index += 1;
			return index;
		}
		/**
		* Apply one SGR parameter list to a style.
		* @param style - the style in force.
		* @param params - parameters between `ESC[` and `m`.
		* @returns the resulting style; the input is not mutated.
		*/
		function applySgr(style, params) {
			const next = { ...style };
			for (let index = 0; index < params.length; index += 1) {
				const raw = params[index] ?? "";
				const code = raw === "" ? 0 : Number.parseInt(raw, 10);
				if (!Number.isFinite(code)) continue;
				if (code === 0) {
					for (const key of Object.keys(next)) delete next[key];
					continue;
				}
				if (code === 1) {
					next.bold = true;
					continue;
				}
				if (code === 2) {
					next.dim = true;
					continue;
				}
				if (code === 3) {
					next.italic = true;
					continue;
				}
				if (code === 4) {
					next.underline = true;
					continue;
				}
				if (code === 7) {
					next.inverse = true;
					continue;
				}
				if (code === 9) {
					next.strike = true;
					continue;
				}
				if (code === 21 || code === 22) {
					delete next.bold;
					delete next.dim;
					continue;
				}
				if (code === 23) {
					delete next.italic;
					continue;
				}
				if (code === 24) {
					delete next.underline;
					continue;
				}
				if (code === 27) {
					delete next.inverse;
					continue;
				}
				if (code === 29) {
					delete next.strike;
					continue;
				}
				if (code >= 30 && code <= 37) {
					next.fg = paletteColor(code - 30);
					continue;
				}
				if (code === 39) {
					delete next.fg;
					continue;
				}
				if (code >= 40 && code <= 47) {
					next.bg = paletteColor(code - 40);
					continue;
				}
				if (code === 49) {
					delete next.bg;
					continue;
				}
				if (code >= 90 && code <= 97) {
					next.fg = paletteColor(code - 90 + 8);
					continue;
				}
				if (code >= 100 && code <= 107) {
					next.bg = paletteColor(code - 100 + 8);
					continue;
				}
				if (code !== 38 && code !== 48) continue;
				const target = code === 38 ? "fg" : "bg";
				const modeAt = nextValue(params, index + 1);
				const mode = Number.parseInt(params[modeAt] ?? "", 10);
				if (mode === 5) {
					const valueAt = nextValue(params, modeAt + 1);
					const value = Number.parseInt(params[valueAt] ?? "", 10);
					if (Number.isFinite(value)) next[target] = xtermColor(Math.max(0, Math.min(255, value)));
					index = valueAt;
					continue;
				}
				if (mode === 2) {
					const channels = [];
					let cursor = modeAt + 1;
					while (channels.length < 3) {
						cursor = nextValue(params, cursor);
						const value = Number.parseInt(params[cursor] ?? "", 10);
						if (!Number.isFinite(value)) break;
						channels.push(value);
						cursor += 1;
					}
					if (channels.length === 3) next[target] = rgbColor(channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0);
					index = cursor - 1;
					continue;
				}
				index = modeAt;
			}
			return next;
		}
		/** Whether two styles would produce the same span, so runs can merge. */
		function sameStyle(a, b) {
			return a.fg === b.fg && a.bg === b.bg && a.bold === b.bold && a.dim === b.dim && a.italic === b.italic && a.underline === b.underline && a.strike === b.strike && a.inverse === b.inverse;
		}
		/**
		* Resolve `inverse` into concrete colours.
		*
		* Swapping at emit time rather than at parse time is what lets an inverted
		* run with no explicit colours still render: it borrows the surface's own
		* foreground and background instead of swapping two undefined values.
		* @param style - the style in force.
		* @returns the style to hand the DOM.
		*/
		function resolveInverse(style) {
			if (style.inverse !== true) return style;
			const { inverse: _inverse, fg, bg, ...rest } = style;
			return {
				...rest,
				fg: bg ?? "var(--zx-ansi-bg)",
				bg: fg ?? "var(--zx-ansi-fg)"
			};
		}
		/**
		* Read text with escape sequences into styled lines.
		*
		* A carriage return clears the line written so far, which is how progress
		* bars, spinners and download counters collapse to their final frame instead
		* of stacking one row per redraw.
		* @param text - raw tool output.
		* @param limits - reader bounds; see {@link AnsiLimits}.
		* @returns the styled lines and whether a limit stopped the read.
		*/
		function parseAnsi(text, limits = {}) {
			const maxLines = limits.maxLines ?? DEFAULT_MAX_LINES;
			const maxChars = limits.maxChars ?? DEFAULT_MAX_CHARS;
			const lines = [];
			let line = [];
			let style = {};
			let consumed = 0;
			let truncated = false;
			let index = 0;
			const write = (chunk) => {
				if (chunk === "") return;
				const resolved = resolveInverse(style);
				const last = line[line.length - 1];
				if (last !== void 0 && sameStyle(last, resolved)) {
					line[line.length - 1] = {
						...resolved,
						text: last.text + chunk
					};
					return;
				}
				line.push({
					...resolved,
					text: chunk
				});
			};
			while (index < text.length) {
				if (consumed >= maxChars || lines.length >= maxLines) {
					truncated = true;
					break;
				}
				const char = text[index] ?? "";
				if (char === "\n") {
					lines.push(line);
					line = [];
					index += 1;
					continue;
				}
				if (char === "\r") {
					line = [];
					index += 1;
					continue;
				}
				if (char === "\x1B") {
					index = skipEscape(text, index, (params) => {
						style = applySgr(style, params);
					});
					continue;
				}
				if (char < " " && char !== "	") {
					index += 1;
					continue;
				}
				let end = index;
				while (end < text.length) {
					const candidate = text[end] ?? "";
					if (candidate === "\n" || candidate === "\r" || candidate === "\x1B") break;
					if (candidate < " " && candidate !== "	") break;
					end += 1;
				}
				const room = maxChars - consumed;
				const chunk = text.slice(index, Math.min(end, index + room));
				if (chunk.length < end - index) truncated = true;
				write(chunk);
				consumed += chunk.length;
				index = end;
			}
			lines.push(line);
			if (lines.length > 1 && (lines[lines.length - 1]?.length ?? 0) === 0) lines.pop();
			return {
				lines,
				truncated
			};
		}
		/**
		* Consume one escape sequence.
		*
		* CSI sequences are read to their final byte so a cursor move or an erase is
		* discarded whole; OSC and the other string sequences are read to their
		* terminator, since their payload is arbitrary text that must not reach the
		* output as if it were content.
		* @param text - the whole string.
		* @param start - index of the ESC byte.
		* @param onSgr - called with the parameter list of an SGR sequence.
		* @returns the index just past the sequence.
		*/
		function skipEscape(text, start, onSgr) {
			const kind = text[start + 1];
			if (kind === void 0) return start + 1;
			if (kind === "[") {
				let cursor = start + 2;
				const paramsStart = cursor;
				while (cursor < text.length) {
					const char = text[cursor] ?? "";
					if (char >= "0" && char <= "?") {
						cursor += 1;
						continue;
					}
					break;
				}
				const paramsEnd = cursor;
				while (cursor < text.length) {
					const char = text[cursor] ?? "";
					if (char >= " " && char <= "/") {
						cursor += 1;
						continue;
					}
					break;
				}
				const final = text[cursor];
				if (final === void 0) return text.length;
				if (final === "m") onSgr(text.slice(paramsStart, paramsEnd).replace(/:/g, ";").split(";"));
				return cursor + 1;
			}
			if (kind === "]" || kind === "P" || kind === "X" || kind === "^" || kind === "_") {
				let cursor = start + 2;
				while (cursor < text.length) {
					const char = text[cursor] ?? "";
					if (char === "\x07") return cursor + 1;
					if (char === "\x1B" && text[cursor + 1] === "\\") return cursor + 2;
					cursor += 1;
				}
				return text.length;
			}
			let cursor = start + 1;
			while (cursor < text.length) {
				const char = text[cursor] ?? "";
				if (char >= " " && char <= "/") {
					cursor += 1;
					continue;
				}
				break;
			}
			return cursor + 1;
		}
		/**
		* The visible text, with every escape sequence resolved away.
		*
		* Used for copy: what lands on the clipboard is what the operator can read,
		* including the collapse of redrawn progress lines.
		* @param text - raw tool output.
		* @returns plain text.
		*/
		function stripAnsi(text) {
			if (!hasAnsi(text)) return text;
			return parseAnsi(text, {
				maxLines: Number.POSITIVE_INFINITY,
				maxChars: Number.POSITIVE_INFINITY
			}).lines.map((spans) => spans.map((span) => span.text).join("")).join("\n");
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\chat\AnsiOutput.module.css.mjs
		const css$11 = ".LDWigW_output{max-height:420px;padding:var(--zx-space-3);border-radius:var(--zx-radius-sm);background:var(--zx-bg-panel);color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);tab-size:4;scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;margin:0;line-height:1.55;overflow:auto}.LDWigW_output::-webkit-scrollbar{width:10px;height:10px}.LDWigW_output::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.LDWigW_wrap{white-space:pre-wrap;overflow-wrap:anywhere}.LDWigW_nowrap{white-space:pre}.LDWigW_truncated{color:var(--zx-label-faint);font-style:italic}.LDWigW_toolbar{align-items:center;gap:var(--zx-space-1);margin-left:auto;display:inline-flex}.LDWigW_action{border-radius:var(--zx-radius-sm);padding:2px var(--zx-space-2);color:var(--zx-label-faint);font:inherit;font-size:var(--zx-text-micro);text-transform:none;letter-spacing:0;cursor:pointer;background:0 0;border:0}.LDWigW_action:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.LDWigW_action:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.LDWigW_actionOn{background:var(--zx-bg-active);color:var(--zx-label-secondary)}";
		const tagId$11 = "@dsh-portable/dcode-ui/AnsiOutput.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$11) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$11;
			tag.textContent = css$11;
			document.head.appendChild(tag);
		}
		var AnsiOutput_module_css_default = {
			"action": "LDWigW_action",
			"actionOn": "LDWigW_actionOn",
			"nowrap": "LDWigW_nowrap",
			"output": "LDWigW_output",
			"toolbar": "LDWigW_toolbar",
			"truncated": "LDWigW_truncated",
			"wrap": "LDWigW_wrap"
		};
		//#endregion
		//#region src/client/chat/AnsiOutput.tsx
		/**
		* Terminal output, rendered.
		*
		* A tool's stdout arrives as bytes a terminal would have interpreted, so this
		* interprets them: colour, weight and underline become styling, and the
		* carriage returns behind every progress bar collapse to their last frame.
		* Output with no escapes in it takes a fast path to a single text node — the
		* common case must not pay for the uncommon one.
		* @module @dsh-portable/dcode-ui/client/chat/AnsiOutput
		*/
		/** Inline style for one span; colours are data, so they cannot be classes. */
		function spanStyle(span) {
			const style = {};
			if (span.fg !== void 0) style.color = span.fg;
			if (span.bg !== void 0) style.background = span.bg;
			if (span.bold === true) style.fontWeight = 600;
			if (span.dim === true) style.opacity = .65;
			if (span.italic === true) style.fontStyle = "italic";
			if (span.underline === true || span.strike === true) style.textDecorationLine = span.underline === true && span.strike === true ? "underline line-through" : span.underline === true ? "underline" : "line-through";
			return Object.keys(style).length === 0 ? void 0 : style;
		}
		/** Styled terminal output. */
		function AnsiOutput({ text, wrap, className }) {
			const t = useT();
			const styled = hasAnsi(text);
			const document = (0, react.useMemo)(() => styled ? parseAnsi(text) : void 0, [styled, text]);
			const body = document === void 0 ? text : document.lines.map((spans, lineIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [spans.map((span, spanIndex) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: spanStyle(span),
				children: span.text
			}, spanIndex)), lineIndex === document.lines.length - 1 ? null : "\n"] }, lineIndex));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("pre", {
				className: `${AnsiOutput_module_css_default.output} ${wrap ? AnsiOutput_module_css_default.wrap : AnsiOutput_module_css_default.nowrap} ${className ?? ""}`,
				children: [body, document?.truncated === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: AnsiOutput_module_css_default.truncated,
					children: `\n${t("chat.outputTruncated")}`
				}) : null]
			});
		}
		/**
		* Copy and wrap controls for one output block.
		*
		* Copy takes the *stripped* text: what reaches the clipboard is what the
		* operator can read on screen, not the escape sequences behind it.
		*/
		function OutputToolbar({ text, wrap, onWrap }) {
			const t = useT();
			const [copied, setCopied] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!copied) return void 0;
				const timer = setTimeout(() => {
					setCopied(false);
				}, 1400);
				return () => {
					clearTimeout(timer);
				};
			}, [copied]);
			const copy = (0, react.useCallback)(() => {
				navigator.clipboard?.writeText(stripAnsi(text)).then(() => {
					setCopied(true);
				}).catch(() => {
					setCopied(false);
				});
			}, [text]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: AnsiOutput_module_css_default.toolbar,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: `${AnsiOutput_module_css_default.action} ${wrap ? AnsiOutput_module_css_default.actionOn : ""}`,
					"aria-pressed": wrap,
					onClick: () => {
						onWrap(!wrap);
					},
					children: t("chat.wrap")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: AnsiOutput_module_css_default.action,
					onClick: copy,
					children: copied ? t("common.copied") : t("common.copy")
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\Aside.module.css.mjs
		const css$10 = ".eKmfWW_aside{height:100%;min-width:var(--zx-aside-width);flex-direction:column;display:flex;overflow:hidden}.eKmfWW_tabs{align-items:center;gap:var(--zx-space-1);padding:0 var(--zx-space-3);height:var(--zx-topbar-height);border-bottom:1px solid var(--zx-border-soft);-webkit-app-region:drag;display:flex}.eKmfWW_tabs>*{-webkit-app-region:no-drag}.eKmfWW_tab{height:26px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;background:0 0;border:0}.eKmfWW_tab:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.eKmfWW_tabActive{background:var(--zx-bg-active);color:var(--zx-label)}.eKmfWW_body{min-height:0;padding:var(--zx-space-4) var(--zx-space-4) var(--zx-space-6);gap:var(--zx-space-5);scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;flex-direction:column;flex:1;display:flex;overflow:hidden auto}.eKmfWW_body::-webkit-scrollbar{width:10px}.eKmfWW_body::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.eKmfWW_section{gap:var(--zx-space-2);flex-direction:column;display:flex}.eKmfWW_sectionHead{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);font-weight:500;display:flex}.eKmfWW_goal{gap:var(--zx-space-3);padding:var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);display:flex}.eKmfWW_goalText{min-width:0;font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);color:var(--zx-label);overflow-wrap:anywhere;flex:1}.eKmfWW_goalMeta{margin-top:var(--zx-space-1);color:var(--zx-label-faint);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}.eKmfWW_step{align-items:flex-start;gap:var(--zx-space-3);padding:var(--zx-space-1) 0;font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);color:var(--zx-label-secondary);display:flex}.eKmfWW_stepDone{color:var(--zx-label-faint);text-decoration:line-through;text-decoration-color:var(--zx-border)}.eKmfWW_stepActive{color:var(--zx-label)}.eKmfWW_stepMark{color:var(--zx-label-faint);flex:none;margin-top:2px}.eKmfWW_stepMarkDone{color:var(--zx-success)}.eKmfWW_detailBlock{gap:var(--zx-space-2);flex-direction:column;display:flex}.eKmfWW_detailRow{align-items:center;gap:var(--zx-space-2);display:flex}.eKmfWW_detailLabel{color:var(--zx-label-faint);font-size:var(--zx-text-micro);text-transform:uppercase;letter-spacing:.04em}.eKmfWW_filePath{color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);overflow-wrap:anywhere}.eKmfWW_fileMeta{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-faint);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;flex-wrap:wrap;display:flex}.eKmfWW_pre{max-height:340px;padding:var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-sm);background:var(--zx-bg-card);color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);white-space:pre-wrap;overflow-wrap:anywhere;margin:0;line-height:1.55;overflow:auto}";
		const tagId$10 = "@dsh-portable/dcode-ui/Aside.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$10) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$10;
			tag.textContent = css$10;
			document.head.appendChild(tag);
		}
		var Aside_module_css_default = {
			"aside": "eKmfWW_aside",
			"body": "eKmfWW_body",
			"detailBlock": "eKmfWW_detailBlock",
			"detailLabel": "eKmfWW_detailLabel",
			"detailRow": "eKmfWW_detailRow",
			"fileMeta": "eKmfWW_fileMeta",
			"filePath": "eKmfWW_filePath",
			"goal": "eKmfWW_goal",
			"goalMeta": "eKmfWW_goalMeta",
			"goalText": "eKmfWW_goalText",
			"pre": "eKmfWW_pre",
			"section": "eKmfWW_section",
			"sectionHead": "eKmfWW_sectionHead",
			"step": "eKmfWW_step",
			"stepActive": "eKmfWW_stepActive",
			"stepDone": "eKmfWW_stepDone",
			"stepMark": "eKmfWW_stepMark",
			"stepMarkDone": "eKmfWW_stepMarkDone",
			"tab": "eKmfWW_tab",
			"tabActive": "eKmfWW_tabActive",
			"tabs": "eKmfWW_tabs"
		};
		//#endregion
		//#region src/client/shell/Aside.tsx
		/**
		* The right column: Git changes, Goal and Progress, and the details of
		* whatever the operator last clicked.
		*
		* Goal is the host-computed `goal` projection — the same value the official
		* goal bar renders — and Progress is the session's own todo list, folded from
		* the `todo_write` calls in the transcript. Neither is workbench state: close
		* the window and reopen it in the classic UI and the same facts are there.
		* @module @dsh-portable/dcode-ui/client/shell/Aside
		*/
		/** Walk a tool block and its children depth-first. */
		function* walkCalls(block) {
			yield block;
			for (const child of block.subCalls) yield* walkCalls(child);
		}
		/**
		* The session's current plan: the newest `todo_write` argument list.
		*
		* Reading the arguments rather than the result is deliberate — the tool
		* records the whole list on every write, so the last call is the whole plan
		* even when earlier ones fell outside the loaded history window.
		*/
		function latestTodos(nodes) {
			for (let index = nodes.length - 1; index >= 0; index -= 1) {
				const node = nodes[index];
				if (node?.kind !== "tool-result") continue;
				for (const block of walkCalls(node)) {
					if (("isError" in block ? block.call?.name : block.name) !== "todo_write") continue;
					const todos = parseArgs("isError" in block ? block.call?.argsRaw : block.argsRaw).todos;
					if (!Array.isArray(todos)) continue;
					return todos.filter((row) => typeof row === "object" && row !== null && typeof row.content === "string");
				}
			}
			return [];
		}
		/** Goal and Progress. */
		function GoalPanel({ sessionId }) {
			const t = useT();
			const goal = useProjectionValue(sessionId, "goal");
			const chat = useChatSnapshot(sessionId);
			const todos = (0, react.useMemo)(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
			const done = todos.filter((todo) => todo.status === "completed").length;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: Aside_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: Aside_module_css_default.sectionHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGoalOutline16, {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ui.grow,
							children: t("goal.title")
						}),
						goal == null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: goal.goal.phase === "completed" ? t("goal.complete") : goal.goal.phase === "paused" ? t("goal.paused") : t("goal.active") })
					]
				}), goal == null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("goal.none") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Aside_module_css_default.goal,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Aside_module_css_default.goalText,
						children: [goal.goal.objective, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Aside_module_css_default.goalMeta,
							children: [
								done,
								"/",
								todos.length || "—",
								" · ",
								goal.roundsStarted,
								" rounds"
							]
						})]
					})
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: Aside_module_css_default.section,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: Aside_module_css_default.sectionHead,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ui.grow,
							children: t("progress.title")
						}),
						todos.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Pill, { children: [
							done,
							"/",
							todos.length
						] })
					]
				}), todos.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("progress.none") }) : todos.map((todo, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${Aside_module_css_default.step} ${todo.status === "completed" ? Aside_module_css_default.stepDone : ""} ${todo.status === "in_progress" ? Aside_module_css_default.stepActive : ""}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${Aside_module_css_default.stepMark} ${todo.status === "completed" ? Aside_module_css_default.stepMarkDone : ""}`,
						"aria-hidden": true,
						children: todo.status === "completed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, {}) : todo.status === "in_progress" ? "◐" : "○"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: todo.content })]
				}, `${String(index)}:${todo.content}`))]
			})] });
		}
		/** Arguments and output of the tool call the operator last opened. */
		function DetailsPanel({ sessionId, callId, cwd, diff }) {
			const runtime = useRuntime();
			const t = useT();
			const chat = useChatSnapshot(sessionId);
			const [wrap, setWrap] = (0, react.useState)(true);
			const block = (0, react.useMemo)(() => {
				if (callId === void 0) return void 0;
				for (const node of chat?.legacy.nodes ?? []) {
					if (node.kind !== "tool-result") continue;
					for (const candidate of walkCalls(node)) if (candidate.callId === callId) return candidate;
				}
				for (const running of chat?.legacy.runningCalls ?? []) for (const candidate of walkCalls(running)) if (candidate.callId === callId) return candidate;
			}, [chat, callId]);
			const filePath = block === void 0 ? diff?.path : void 0;
			const fileRead = useAsync(async () => {
				if (cwd === void 0 || filePath === void 0) return void 0;
				return {
					cwd,
					path: filePath,
					result: await runtime.git.readFile(cwd, filePath)
				};
			}, [
				runtime,
				cwd,
				filePath
			]);
			const loadedFile = fileRead.value;
			const currentFile = loadedFile !== void 0 && loadedFile.cwd === cwd && loadedFile.path === filePath ? loadedFile.result : void 0;
			if (block === void 0) {
				if (diff === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("details.none") });
				if (fileRead.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
				if (fileRead.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: fileRead.error });
				if (currentFile === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("common.error") });
				if (currentFile.ok === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: currentFile.error.message || t("common.error") });
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: Aside_module_css_default.section,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: Aside_module_css_default.sectionHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ui.grow,
								children: t("details.file")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: Aside_module_css_default.fileMeta,
								children: [currentFile.value.size, " B"]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Aside_module_css_default.filePath,
							title: currentFile.value.path,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", { children: currentFile.value.path })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Aside_module_css_default.fileMeta,
							children: [currentFile.value.binary ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: t("git.binary") }) : null, currentFile.value.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: t("git.truncated") }) : null]
						}),
						currentFile.value.binary ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("git.binary") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: Aside_module_css_default.pre,
							children: currentFile.value.text
						})
					]
				});
			}
			const settled = "isError" in block;
			const name = settled ? block.call?.name ?? "tool" : block.name;
			const argsRaw = settled ? block.call?.argsRaw : block.argsRaw;
			const summary = summarizeTool(name, argsRaw);
			const output = settled ? resultText(block.content) : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: Aside_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: Aside_module_css_default.sectionHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ui.grow,
							children: name
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: summary.kind })]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Aside_module_css_default.detailBlock,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Aside_module_css_default.detailLabel,
							children: t("details.arguments")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: Aside_module_css_default.pre,
							children: argsRaw ?? "—"
						})]
					}),
					settled ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Aside_module_css_default.detailBlock,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: Aside_module_css_default.detailRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Aside_module_css_default.detailLabel,
								children: t("details.output")
							}), output === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutputToolbar, {
								text: output,
								wrap,
								onWrap: setWrap
							})]
						}), output === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: Aside_module_css_default.pre,
							children: "—"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnsiOutput, {
							text: output,
							wrap
						})]
					}) : null
				]
			});
		}
		/** The right column with its three tabs. */
		function Aside({ navigation, sessionId, cwd }) {
			const t = useT();
			const state = useNavigation(navigation);
			const tabs = [
				{
					id: "changes",
					label: t("git.changes")
				},
				{
					id: "goal",
					label: t("goal.title")
				},
				{
					id: "details",
					label: t("details.title")
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: Aside_module_css_default.aside,
				"aria-label": t("details.title"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Aside_module_css_default.tabs,
					children: tabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${Aside_module_css_default.tab} ${state.aside === tab.id ? Aside_module_css_default.tabActive : ""}`,
						onClick: () => {
							navigation.openAside(tab.id);
						},
						children: tab.label
					}, tab.id))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Aside_module_css_default.body,
					children: [
						state.aside === "changes" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(GitPanel, {
							cwd,
							sessionId,
							selected: state.diff?.path,
							onOpenDiff: (path, staged) => {
								navigation.openDiff(path, staged);
							}
						}), state.diff === void 0 || cwd === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffViewer, {
							cwd,
							path: state.diff.path,
							staged: state.diff.staged,
							onClose: () => {
								navigation.closeDiff();
							}
						})] }) : null,
						state.aside === "goal" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GoalPanel, { sessionId }) : null,
						state.aside === "details" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DetailsPanel, {
							sessionId,
							callId: state.inspectedCallId,
							cwd,
							diff: state.diff
						}) : null
					]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\Composer.module.css.mjs
		const css$9 = ".SmCagG_dock{padding:0 var(--zx-space-5) var(--zx-space-5);flex:none}.SmCagG_shell{width:min(var(--zx-reading-width), 100%);border:1px solid var(--zx-border);border-radius:var(--zx-radius-xl);background:var(--zx-bg-card);box-shadow:var(--zx-shadow-card);transition:border-color var(--zx-motion);margin:0 auto}.SmCagG_shellFocused{border-color:color-mix(in srgb, var(--zx-accent) 55%, var(--zx-border))}.SmCagG_input{width:100%;min-height:52px;max-height:40vh;padding:var(--zx-space-4) var(--zx-space-4) var(--zx-space-2);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);resize:none;box-sizing:border-box;background:0 0;border:0;display:block;overflow-y:auto}.SmCagG_input:focus{outline:none}.SmCagG_input::placeholder{color:var(--zx-label-faint)}.SmCagG_controls{align-items:center;gap:var(--zx-space-2);padding:var(--zx-space-2) var(--zx-space-3) var(--zx-space-3);display:flex}.SmCagG_spacer{flex:1}.SmCagG_control{align-items:center;gap:var(--zx-space-2);max-width:180px;height:26px;padding:0 var(--zx-space-2);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);display:inline-flex}.SmCagG_controlLabel{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.SmCagG_modelMenu{max-height:min(60vh,420px)}.SmCagG_send{background:var(--zx-accent);width:28px;height:28px;color:var(--zx-on-accent);cursor:pointer;transition:opacity var(--zx-motion-fast);border:0;border-radius:50%;place-items:center;display:grid}.SmCagG_send:disabled{opacity:.4;cursor:default}.SmCagG_send:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.SmCagG_stop{background:var(--zx-bg-active);color:var(--zx-label)}.SmCagG_error{padding:0 var(--zx-space-4) var(--zx-space-1);color:var(--zx-error);font-size:var(--zx-text-xs);line-height:var(--zx-leading-tight)}.SmCagG_headerRow{width:min(var(--zx-reading-width), 100%);margin:0 auto var(--zx-space-2);align-items:center;gap:var(--zx-space-2);display:flex}.SmCagG_projectChip{align-items:center;gap:var(--zx-space-2);padding:var(--zx-space-1) var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;transition:background var(--zx-motion-fast), color var(--zx-motion-fast);display:inline-flex}.SmCagG_projectChip:hover{background:var(--zx-bg-hover);color:var(--zx-label)}";
		const tagId$9 = "@dsh-portable/dcode-ui/Composer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$9) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$9;
			tag.textContent = css$9;
			document.head.appendChild(tag);
		}
		var Composer_module_css_default = {
			"control": "SmCagG_control",
			"controlLabel": "SmCagG_controlLabel",
			"controls": "SmCagG_controls",
			"dock": "SmCagG_dock",
			"error": "SmCagG_error",
			"headerRow": "SmCagG_headerRow",
			"input": "SmCagG_input",
			"modelMenu": "SmCagG_modelMenu",
			"projectChip": "SmCagG_projectChip",
			"send": "SmCagG_send",
			"shell": "SmCagG_shell",
			"shellFocused": "SmCagG_shellFocused",
			"spacer": "SmCagG_spacer",
			"stop": "SmCagG_stop"
		};
		//#endregion
		//#region src/client/shell/Composer.tsx
		/**
		* The composer: prompt entry plus the four session controls the operator
		* changes most — agent mode, model, reasoning depth, and permission mode.
		*
		* Every control writes through the Host's own path, never a local mirror:
		* the model and reasoning effort go through `session/selectModel`, the
		* permission mode executes the `/permission` command the official chip
		* executes. The result is that both surfaces read the same projections
		* afterwards.
		* @module @dsh-portable/dcode-ui/client/shell/Composer
		*/
		/** Permission value that requires an explicit user acknowledgement. */
		const FULL_ACCESS_PERMISSION = "danger-full-access";
		/** Built-in preset labels are translated; user-authored rows use their roster metadata. */
		function modeLabel(id, fallback, t) {
			switch (id) {
				case "standard": return t("composer.mode.standard");
				case "ptc": return t("composer.mode.ptc");
				case "minimal": return t("composer.mode.minimal");
				case "cordis": return t("composer.mode.cordis");
				default: return fallback;
			}
		}
		/** Known permission values have product copy; unfamiliar host values keep their published name. */
		function permissionLabel(value, name, t) {
			switch (value) {
				case "read-only": return t("composer.permission.readOnly");
				case "workspace-write": return t("composer.permission.workspaceWrite");
				case FULL_ACCESS_PERMISSION: return t("composer.permission.fullAccess");
				default: return name;
			}
		}
		/** Use the primitive glyphs already shared by the client UI for permission rows. */
		function permissionIcon(value) {
			switch (value) {
				case "read-only": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {});
				case "workspace-write": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {});
				case FULL_ACCESS_PERMISSION: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {});
				default: return;
			}
		}
		/** Cmd/Ctrl+Enter flips the configured busy behavior. */
		function oppositeBusyEnter(value) {
			return value === "queue" ? "steer" : "queue";
		}
		/** Draft text per session, so switching tasks does not lose an unsent prompt. */
		const drafts = /* @__PURE__ */ new Map();
		/** Prompt entry and the session controls. */
		function Composer({ sessionId, blank, cwd, onOpenWorkspace }) {
			const runtime = useRuntime();
			const t = useT();
			const session = useSessionSnapshot(sessionId);
			const permissions = useProjectionValue(sessionId, "permissions");
			const selection = useProjectionValue(sessionId, "modelSelection");
			const agentPreset = useProjectionValue(sessionId, "agentPreset");
			const busyEnter = useObservable(runtime.busyEnter, "queue");
			const [draft, setDraft] = (0, react.useState)("");
			const [focused, setFocused] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const [confirmingFullAccess, setConfirmingFullAccess] = (0, react.useState)(false);
			const [acknowledgedFullAccess, setAcknowledgedFullAccess] = (0, react.useState)(false);
			const inputRef = (0, react.useRef)(null);
			const shellRef = (0, react.useRef)(null);
			const previousSession = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => {
				const outgoing = previousSession.current;
				if (outgoing !== void 0) drafts.set(outgoing, draft);
				setDraft(sessionId === void 0 ? "" : drafts.get(sessionId) ?? "");
				setError(void 0);
				previousSession.current = sessionId;
			}, [sessionId]);
			(0, react.useEffect)(() => {
				const input = inputRef.current;
				const shell = shellRef.current;
				if (input === null || shell === null) return void 0;
				const fit = () => {
					input.style.height = "auto";
					input.style.height = `${String(input.scrollHeight)}px`;
				};
				fit();
				if (typeof ResizeObserver === "undefined") {
					window.addEventListener("resize", fit);
					return () => {
						window.removeEventListener("resize", fit);
					};
				}
				const observer = new ResizeObserver(fit);
				observer.observe(shell);
				return () => {
					observer.disconnect();
				};
			}, [draft]);
			const catalog = useAsync(async () => await runtime.remote.session.modelCatalog(), [runtime]);
			const presets = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
			const running = session?.running === true;
			const current = selection?.next ?? selection?.lastUsed ?? void 0;
			const roster = presets.value?.ok === true ? presets.value.value.presets : [];
			const currentPreset = agentPreset ?? roster.find((preset) => preset.isDefault)?.id ?? roster[0]?.id;
			const blankSession = (blank ?? session?.blank ?? false) && !running;
			const currentModel = (0, react.useMemo)(() => {
				if (catalog.value?.ok !== true) return void 0;
				for (const group of catalog.value.value.groups) {
					const model = group.models.find((row) => row.id === current?.model && group.id === current.provider);
					if (model !== void 0) return {
						group,
						model
					};
				}
			}, [catalog.value, current]);
			const selectModel = (0, react.useCallback)((provider, model, reasoningEffort) => {
				if (sessionId === void 0) return;
				runtime.remote.session.selectModel({
					sessionId,
					provider,
					model,
					...reasoningEffort === void 0 ? {} : { reasoningEffort }
				});
			}, [runtime, sessionId]);
			const modelRows = (0, react.useMemo)(() => {
				if (catalog.value?.ok !== true) return [];
				return catalog.value.value.groups.flatMap((group) => group.models.map((model) => ({
					id: `${group.id}/${model.id}`,
					label: model.name,
					detail: group.name,
					group: group.name,
					active: group.id === current?.provider && model.id === current.model,
					onSelect: () => {
						selectModel(group.id, model.id);
					}
				})));
			}, [
				catalog.value,
				current,
				selectModel
			]);
			const reasoningRows = (0, react.useMemo)(() => {
				const efforts = currentModel?.model.reasoning?.efforts ?? [];
				if (efforts.length === 0 || current === void 0) return [];
				return efforts.map((effort) => ({
					id: effort.id,
					label: effort.name,
					detail: effort.description,
					active: effort.id === current.reasoningEffort,
					onSelect: () => {
						selectModel(current.provider, current.model, effort.id);
					}
				}));
			}, [
				currentModel,
				current,
				selectModel
			]);
			const selectPermission = (0, react.useCallback)((value) => {
				if (sessionId === void 0) return;
				runtime.remote.commands.execute(sessionId, `/permission ${value}`, []).then((result) => {
					if (!result.ok) setError(result.error.message);
				}).catch((cause) => {
					setError(cause instanceof Error ? cause.message : String(cause));
				});
			}, [runtime, sessionId]);
			const selectPreset = (0, react.useCallback)((id) => {
				if (sessionId === void 0 || !blankSession) return;
				runtime.remote.agentPresets.select(sessionId, id).then((result) => {
					if (!result.ok) setError(result.error.message);
				}).catch((cause) => {
					setError(cause instanceof Error ? cause.message : String(cause));
				});
			}, [
				blankSession,
				runtime,
				sessionId
			]);
			const permissionRows = (0, react.useMemo)(() => {
				if (permissions === void 0 || sessionId === void 0) return [];
				return permissions.options.filter((option) => option.value !== "custom").map((option) => {
					const icon = permissionIcon(option.value);
					return {
						id: option.value,
						label: permissionLabel(option.value, option.name, t),
						detail: option.description,
						...icon === void 0 ? {} : { icon },
						active: option.value === permissions.currentValue,
						danger: option.value === FULL_ACCESS_PERMISSION,
						onSelect: () => {
							if (option.value === permissions.currentValue) return;
							if (option.value === FULL_ACCESS_PERMISSION) {
								setAcknowledgedFullAccess(false);
								setConfirmingFullAccess(true);
								return;
							}
							selectPermission(option.value);
						}
					};
				});
			}, [
				permissions,
				selectPermission,
				sessionId,
				t
			]);
			const modeRows = (0, react.useMemo)(() => roster.map((preset) => ({
				id: preset.id,
				label: modeLabel(preset.id, preset.name ?? preset.id, t),
				detail: preset.broken ?? preset.description,
				active: preset.id === currentPreset,
				disabled: preset.broken !== void 0,
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, {}),
				onSelect: () => {
					if (preset.id !== currentPreset) selectPreset(preset.id);
				}
			})), [
				currentPreset,
				roster,
				selectPreset,
				t
			]);
			const send = (0, react.useCallback)((mode) => {
				if (sessionId === void 0) return;
				const text = draft.trim();
				if (text === "") return;
				const face = runtime.binding(sessionId)?.session;
				if (face === void 0) return;
				setDraft("");
				drafts.delete(sessionId);
				setError(void 0);
				if (text.startsWith("/")) {
					face.command(text).then((result) => {
						if (!result.ok) setError(result.error.message);
						else if (!result.value.matched) setError(`unknown command: ${text.split(" ")[0] ?? text}`);
					});
					return;
				}
				const handle = face.beginSubmission({
					text,
					images: []
				});
				face.prompt([{
					type: "text",
					text
				}], mode, void 0, handle.requestId).then((result) => {
					if (!result.ok) setError(result.error.message);
				}).catch((cause) => {
					handle.abandon();
					setError(cause instanceof Error ? cause.message : String(cause));
				});
			}, [
				runtime,
				sessionId,
				draft
			]);
			const stop = (0, react.useCallback)(() => {
				if (sessionId === void 0) return;
				runtime.binding(sessionId)?.session.cancel();
			}, [runtime, sessionId]);
			const onKeyDown = (0, react.useCallback)((event) => {
				if (event.key !== "Enter" || event.shiftKey) return;
				if (event.nativeEvent.isComposing) return;
				event.preventDefault();
				const accelerated = event.metaKey || event.ctrlKey;
				const mode = !running ? "queue" : accelerated ? oppositeBusyEnter(busyEnter) : busyEnter;
				send(mode);
			}, [
				busyEnter,
				running,
				send
			]);
			const { groups } = useWorkspaceGroups();
			const workspaceTitle = (0, react.useMemo)(() => {
				if (cwd !== void 0) {
					const match = groups.find((group) => group.path === cwd);
					if (match) return match.title;
					return cwd.split(/[\\/]/).filter(Boolean).pop() || cwd;
				}
			}, [groups, cwd]);
			const disabled = sessionId === void 0;
			const currentPermission = permissions?.options.find((option) => option.value === permissions.currentValue);
			const currentPermissionLabel = currentPermission === void 0 ? t("composer.permission") : permissionLabel(currentPermission.value, currentPermission.name, t);
			const currentPresetRow = roster.find((preset) => preset.id === currentPreset);
			const currentPresetLabel = currentPreset === void 0 ? t("composer.mode") : modeLabel(currentPreset, currentPresetRow?.name ?? t("composer.mode"), t);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Composer_module_css_default.dock,
				children: [blank ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Composer_module_css_default.headerRow,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: Composer_module_css_default.projectChip,
						onClick: onOpenWorkspace,
						title: cwd,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: workspaceTitle ?? t("nav.openWorkspace") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						]
					})
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: shellRef,
					className: `${Composer_module_css_default.shell} ${focused ? Composer_module_css_default.shellFocused : ""}`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: inputRef,
							className: Composer_module_css_default.input,
							rows: 1,
							value: draft,
							disabled,
							placeholder: disabled ? t("composer.needsSession") : running ? t("composer.placeholderRunning") : t("composer.placeholder"),
							onChange: (event) => {
								setDraft(event.target.value);
							},
							onKeyDown,
							onFocus: () => {
								setFocused(true);
							},
							onBlur: () => {
								setFocused(false);
							}
						}),
						error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Composer_module_css_default.error,
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Composer_module_css_default.controls,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
									label: confirmingFullAccess ? t("composer.permission.confirmTitle") : t("composer.permission"),
									disabled: permissionRows.length === 0 || confirmingFullAccess,
									trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Composer_module_css_default.control,
										children: [permissionIcon(permissions?.currentValue ?? ""), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Composer_module_css_default.controlLabel,
											children: currentPermissionLabel
										})]
									}),
									rows: permissionRows
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
									label: blankSession ? t("composer.mode") : t("composer.modeLocked"),
									disabled: !blankSession || sessionId === void 0 || modeRows.length === 0,
									trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Composer_module_css_default.control,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Composer_module_css_default.controlLabel,
											children: currentPresetLabel
										})]
									}),
									rows: modeRows
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Composer_module_css_default.spacer }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
									label: t("composer.model"),
									disabled: modelRows.length === 0,
									align: "end",
									popoverClassName: Composer_module_css_default.modelMenu,
									trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: Composer_module_css_default.control,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Composer_module_css_default.controlLabel,
											children: currentModel === void 0 ? t("composer.model") : `${currentModel.model.name} · ${currentModel.group.name}`
										})
									}),
									rows: modelRows
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
									label: t("composer.reasoning"),
									disabled: reasoningRows.length === 0,
									align: "end",
									trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: Composer_module_css_default.control,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: Composer_module_css_default.controlLabel,
											children: reasoningRows.find((row) => row.active)?.label ?? t("composer.reasoningDefault")
										})]
									}),
									rows: reasoningRows
								}),
								running ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${Composer_module_css_default.send} ${Composer_module_css_default.stop}`,
									onClick: stop,
									"aria-label": t("composer.stop"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconStopFill16, {})
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: Composer_module_css_default.send,
									onClick: () => {
										send("queue");
									},
									disabled: disabled || draft.trim() === "",
									"aria-label": t("composer.send"),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {})
								})
							]
						})
					]
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
				open: confirmingFullAccess,
				title: t("composer.permission.confirmTitle"),
				description: t("composer.permission.confirmBody"),
				acknowledgeLabel: t("composer.permission.confirmAcknowledge"),
				cancelLabel: t("common.cancel"),
				closeLabel: t("common.close"),
				confirmLabel: t("composer.permission.confirm"),
				acknowledged: acknowledgedFullAccess,
				onAcknowledgedChange: setAcknowledgedFullAccess,
				onCancel: () => {
					setAcknowledgedFullAccess(false);
					setConfirmingFullAccess(false);
				},
				onConfirm: () => {
					if (!acknowledgedFullAccess) return;
					setAcknowledgedFullAccess(false);
					setConfirmingFullAccess(false);
					selectPermission(FULL_ACCESS_PERMISSION);
				}
			})] });
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\CommandPalette.module.css.mjs
		const css$8 = ".aZZEvq_backdrop{z-index:60;background:var(--zx-scrim);backdrop-filter:blur(2px);justify-content:center;padding-top:12vh;display:flex;position:absolute;inset:0}.aZZEvq_panel{width:min(560px, calc(100% - 2 * var(--zx-space-5)));border:1px solid var(--zx-border);border-radius:var(--zx-radius-xl);background:var(--zx-bg-overlay);max-height:62vh;box-shadow:var(--zx-shadow-panel);flex-direction:column;display:flex;overflow:hidden}.aZZEvq_search{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);color:var(--zx-label-muted);display:flex}.aZZEvq_input{min-width:0;color:var(--zx-label);font:inherit;font-size:var(--zx-text-md);background:0 0;border:0;flex:1}.aZZEvq_input:focus{outline:none}.aZZEvq_input::placeholder{color:var(--zx-label-faint)}.aZZEvq_filters{gap:var(--zx-space-2);padding:var(--zx-space-2) var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);display:flex}.aZZEvq_filter{height:24px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-pill);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-micro);white-space:nowrap;cursor:pointer;background:0 0;border:1px solid #0000}.aZZEvq_filter:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.aZZEvq_filterActive{background:var(--zx-bg-active);color:var(--zx-label)}.aZZEvq_list{min-height:0;padding:var(--zx-space-2);flex:1;overflow:hidden auto}.aZZEvq_group{padding:var(--zx-space-3) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-faint);font-size:var(--zx-text-micro)}.aZZEvq_row{align-items:center;gap:var(--zx-space-3);width:100%;min-height:32px;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.aZZEvq_rowActive{background:var(--zx-bg-active)}.aZZEvq_rowLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.aZZEvq_rowDetail{min-width:0;color:var(--zx-label-faint);font-size:var(--zx-text-micro);text-overflow:ellipsis;white-space:nowrap;max-width:45%;overflow:hidden}.aZZEvq_shortcut{color:var(--zx-label-faint);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}.aZZEvq_empty{padding:var(--zx-space-6);text-align:center;color:var(--zx-label-muted);font-size:var(--zx-text-xs)}";
		const tagId$8 = "@dsh-portable/dcode-ui/CommandPalette.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		var CommandPalette_module_css_default = {
			"backdrop": "aZZEvq_backdrop",
			"empty": "aZZEvq_empty",
			"filter": "aZZEvq_filter",
			"filterActive": "aZZEvq_filterActive",
			"filters": "aZZEvq_filters",
			"group": "aZZEvq_group",
			"input": "aZZEvq_input",
			"list": "aZZEvq_list",
			"panel": "aZZEvq_panel",
			"row": "aZZEvq_row",
			"rowActive": "aZZEvq_rowActive",
			"rowDetail": "aZZEvq_rowDetail",
			"rowLabel": "aZZEvq_rowLabel",
			"search": "aZZEvq_search",
			"shortcut": "aZZEvq_shortcut"
		};
		//#endregion
		//#region src/client/shell/CommandPalette.tsx
		/**
		* The global command palette.
		*
		* Three sources in one list: the workbench's own actions, the Session
		* Controller's task list, and the Host's file-reference index for the current
		* session. The file rows come from `fileReferences/list`, the same index the
		* official composer's `@` mention trigger uses, so the palette needs no
		* workspace crawl of its own.
		* @module @dsh-portable/dcode-ui/client/shell/CommandPalette
		*/
		/** Locale key per theme preference, for the palette's three theme rows. */
		const THEME_LABEL = {
			light: "theme.light",
			dark: "theme.dark",
			system: "theme.system"
		};
		/** Case-insensitive subsequence match, the conventional palette filter. */
		function fuzzyMatch(query, candidate) {
			if (query === "") return true;
			const haystack = candidate.toLowerCase();
			const needle = query.toLowerCase();
			let index = 0;
			for (const character of needle) {
				if (character === " ") continue;
				index = haystack.indexOf(character, index);
				if (index === -1) return false;
				index += 1;
			}
			return true;
		}
		/** Actions, tasks and files behind one search field. */
		function CommandPalette({ navigation, onNewTask, onOpenWorkspace }) {
			const runtime = useRuntime();
			const t = useT();
			const list = useSessionList();
			const sessionId = useCurrentSessionId();
			const [query, setQuery] = (0, react.useState)("");
			const [filter, setFilter] = (0, react.useState)("all");
			const [active, setActive] = (0, react.useState)(0);
			const [files, setFiles] = (0, react.useState)([]);
			const inputRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				inputRef.current?.focus();
			}, []);
			(0, react.useEffect)(() => {
				if (sessionId === void 0 || query.trim() === "") {
					setFiles([]);
					return;
				}
				const controller = new AbortController();
				let live = true;
				runtime.remote.fileReferences.list(sessionId, query.trim(), controller.signal).then((result) => {
					if (!live || !result.ok) return;
					setFiles(result.value.map((candidate) => ({
						path: candidate.path ?? candidate.value ?? "",
						label: candidate.label
					})).filter((row) => row.path !== ""));
				}).catch(() => {});
				return () => {
					live = false;
					controller.abort();
				};
			}, [
				runtime,
				sessionId,
				query
			]);
			const actions = (0, react.useMemo)(() => [
				{
					id: "new-task",
					kind: "action",
					group: t("palette.suggested"),
					label: t("nav.newTask"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, {}),
					shortcut: commandShortcut("N"),
					run: onNewTask
				},
				{
					id: "open-workspace",
					kind: "action",
					group: t("palette.suggested"),
					label: t("nav.openWorkspace"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
					shortcut: commandShortcut("O"),
					run: onOpenWorkspace
				},
				{
					id: "settings",
					kind: "action",
					group: t("palette.suggested"),
					label: t("nav.settings"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {}),
					run: () => {
						navigation.openSettings("general");
					}
				},
				{
					id: "toggle-rail",
					kind: "action",
					group: t("palette.panels"),
					label: t("nav.collapse"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {}),
					shortcut: commandShortcut("B"),
					run: () => {
						navigation.toggleRail();
					}
				},
				{
					id: "toggle-aside",
					kind: "action",
					group: t("palette.panels"),
					label: t("top.toggleAside"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {}),
					run: () => {
						navigation.toggleAside();
					}
				},
				{
					id: "changes",
					kind: "action",
					group: t("palette.panels"),
					label: t("git.changes"),
					run: () => {
						navigation.openAside("changes");
					}
				},
				{
					id: "goal",
					kind: "action",
					group: t("palette.panels"),
					label: t("goal.title"),
					run: () => {
						navigation.openAside("goal");
					}
				},
				{
					id: "learning",
					kind: "action",
					group: t("palette.configuration"),
					label: t("nav.learning"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}),
					run: () => {
						navigation.show("learning");
					}
				},
				{
					id: "plugins",
					kind: "action",
					group: t("palette.configuration"),
					label: t("settings.plugins"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: 16 }),
					run: () => {
						navigation.openSettings("plugins");
					}
				},
				{
					id: "models",
					kind: "action",
					group: t("palette.configuration"),
					label: t("settings.models"),
					run: () => {
						navigation.openSettings("models");
					}
				},
				{
					id: "usage",
					kind: "action",
					group: t("palette.configuration"),
					label: t("settings.usage"),
					run: () => {
						navigation.openSettings("usage");
					}
				},
				{
					id: "official-ui",
					kind: "action",
					group: t("palette.configuration"),
					label: t("top.officialUi"),
					run: () => {
						runtime.mode.set("official");
					}
				},
				...THEME_PREFERENCES.map((preference) => ({
					id: `theme-${preference}`,
					kind: "action",
					group: t("palette.configuration"),
					label: `${t("theme.toggle")}: ${t(THEME_LABEL[preference])}`,
					run: () => {
						runtime.appearance.set(preference);
					}
				}))
			], [
				t,
				navigation,
				runtime,
				onNewTask,
				onOpenWorkspace
			]);
			const rows = (0, react.useMemo)(() => {
				const tasks = list.ids.map((id) => list.byId[id]).filter((summary) => summary !== void 0 && !summary.blank).slice(0, 60).map((summary) => ({
					id: `task:${summary.id}`,
					kind: "task",
					group: t("palette.tasks"),
					label: summary.displayTitle,
					detail: summary.cwd,
					run: () => {
						navigation.show("session");
						runtime.sessions.open(summary.id);
					}
				}));
				const fileRows = files.slice(0, 40).map((file) => ({
					id: `file:${file.path}`,
					kind: "file",
					group: t("palette.files"),
					label: file.label ?? file.path,
					detail: file.path,
					run: () => {
						navigation.openDiff(file.path);
					}
				}));
				return [
					...actions,
					...tasks,
					...fileRows
				].filter((row) => (filter === "all" || row.kind === filter) && (fuzzyMatch(query, row.label) || row.detail !== void 0 && fuzzyMatch(query, row.detail)));
			}, [
				actions,
				list,
				files,
				filter,
				query,
				t,
				navigation,
				runtime
			]);
			(0, react.useEffect)(() => {
				setActive(0);
			}, [query, filter]);
			const choose = (0, react.useCallback)((row) => {
				if (row === void 0) return;
				navigation.togglePalette(false);
				row.run();
			}, [navigation]);
			const onKeyDown = (0, react.useCallback)((event) => {
				if (event.key === "ArrowDown") {
					event.preventDefault();
					setActive((index) => Math.min(index + 1, rows.length - 1));
					return;
				}
				if (event.key === "ArrowUp") {
					event.preventDefault();
					setActive((index) => Math.max(index - 1, 0));
					return;
				}
				if (event.key === "Enter") {
					event.preventDefault();
					choose(rows[active]);
				}
			}, [
				rows,
				active,
				choose
			]);
			const filters = [
				{
					id: "all",
					label: t("palette.all")
				},
				{
					id: "action",
					label: t("palette.actions")
				},
				{
					id: "task",
					label: t("palette.tasks")
				},
				{
					id: "file",
					label: t("palette.files")
				}
			];
			let lastGroup;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: CommandPalette_module_css_default.backdrop,
				role: "presentation",
				onPointerDown: (event) => {
					if (event.target === event.currentTarget) navigation.togglePalette(false);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: CommandPalette_module_css_default.panel,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("nav.commandPalette"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CommandPalette_module_css_default.search,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								className: CommandPalette_module_css_default.input,
								value: query,
								placeholder: t("palette.placeholder"),
								onChange: (event) => {
									setQuery(event.target.value);
								},
								onKeyDown
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: CommandPalette_module_css_default.filters,
							children: filters.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${CommandPalette_module_css_default.filter} ${filter === entry.id ? CommandPalette_module_css_default.filterActive : ""}`,
								onClick: () => {
									setFilter(entry.id);
								},
								children: entry.label
							}, entry.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CommandPalette_module_css_default.list,
							children: [rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: CommandPalette_module_css_default.empty,
								children: t("palette.empty")
							}) : null, rows.map((row, index) => {
								const heading = row.group === lastGroup ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: CommandPalette_module_css_default.group,
									children: row.group
								}, `g:${row.group}`);
								lastGroup = row.group;
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [heading, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `${CommandPalette_module_css_default.row} ${index === active ? CommandPalette_module_css_default.rowActive : ""}`,
									onPointerEnter: () => {
										setActive(index);
									},
									onClick: () => {
										choose(row);
									},
									children: [
										row.icon,
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: CommandPalette_module_css_default.rowLabel,
											children: row.label
										}),
										row.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: CommandPalette_module_css_default.rowDetail,
											children: row.detail
										}),
										row.shortcut === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: CommandPalette_module_css_default.shortcut,
											children: row.shortcut
										})
									]
								})] }, row.id);
							})]
						})
					]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\DirectoryPicker.module.css.mjs
		const css$7 = ".x062Eq_backdrop{z-index:70;padding:var(--zx-space-6);background:var(--zx-scrim);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.x062Eq_panel{border:1px solid var(--zx-border);border-radius:var(--zx-radius-xl);background:var(--zx-bg-overlay);width:min(560px,100%);max-height:min(70vh,560px);box-shadow:var(--zx-shadow-panel);flex-direction:column;display:flex;overflow:hidden}.x062Eq_head{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);font-size:var(--zx-text-sm);color:var(--zx-label);display:flex}.x062Eq_title{flex:1;min-width:0}.x062Eq_crumbs{padding:var(--zx-space-2) var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);font-size:var(--zx-text-micro);color:var(--zx-label-muted);flex-wrap:wrap;align-items:center;gap:2px;display:flex}.x062Eq_crumb{padding:2px var(--zx-space-2);border-radius:var(--zx-radius-sm);color:inherit;font:inherit;cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;max-width:180px;overflow:hidden}.x062Eq_crumb:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.x062Eq_list{min-height:0;padding:var(--zx-space-2);flex:1;overflow:hidden auto}.x062Eq_row{align-items:center;gap:var(--zx-space-3);width:100%;min-height:30px;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.x062Eq_row:hover{background:var(--zx-bg-hover)}.x062Eq_row:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.x062Eq_rowHidden{color:var(--zx-label-muted)}.x062Eq_name{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.x062Eq_foot{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4);border-top:1px solid var(--zx-border-soft);display:flex}.x062Eq_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);font-size:var(--zx-text-micro);color:var(--zx-label-muted);direction:rtl;flex:1;overflow:hidden}.x062Eq_error{padding:0 var(--zx-space-4) var(--zx-space-3);color:var(--zx-error);font-size:var(--zx-text-micro)}.x062Eq_empty{padding:var(--zx-space-6);text-align:center;color:var(--zx-label-muted);font-size:var(--zx-text-xs)}";
		const tagId$7 = "@dsh-portable/dcode-ui/DirectoryPicker.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		var DirectoryPicker_module_css_default = {
			"backdrop": "x062Eq_backdrop",
			"crumb": "x062Eq_crumb",
			"crumbs": "x062Eq_crumbs",
			"empty": "x062Eq_empty",
			"error": "x062Eq_error",
			"foot": "x062Eq_foot",
			"head": "x062Eq_head",
			"list": "x062Eq_list",
			"name": "x062Eq_name",
			"panel": "x062Eq_panel",
			"path": "x062Eq_path",
			"row": "x062Eq_row",
			"rowHidden": "x062Eq_rowHidden",
			"title": "x062Eq_title"
		};
		//#endregion
		//#region src/client/shell/DirectoryPicker.tsx
		/**
		* The workbench's directory browser.
		*
		* DSH offers two picking backends behind one Remote: a native chooser (the
		* desktop shell) and a host-listed browse (every surface). The official UI
		* selects between them by which package occupies its directory-flow slot —
		* a slot the workbench's own frame does not declare, so it makes the same
		* choice explicitly: try the native chooser first, and browse when there
		* isn't one. That keeps "Open workspace" working identically in the packaged
		* desktop app and in a plain browser tab.
		* @module @dsh-portable/dcode-ui/client/shell/DirectoryPicker
		*/
		/** A modal directory browser over the host's listing Remote. */
		function DirectoryPicker({ onPicked, onCancel }) {
			const runtime = useRuntime();
			const t = useT();
			const [listing, setListing] = (0, react.useState)(void 0);
			const [loading, setLoading] = (0, react.useState)(true);
			const [error, setError] = (0, react.useState)(void 0);
			const [target, setTarget] = (0, react.useState)(void 0);
			const browse = (0, react.useCallback)((path) => {
				const navigation = runtime.navigation;
				if (navigation === void 0) {
					setError("workspace navigation is unavailable on this connection");
					setLoading(false);
					return;
				}
				setLoading(true);
				setError(void 0);
				navigation.listDirectory(path).then((next) => {
					setListing(next);
					setTarget(next.path);
					setLoading(false);
				}).catch((cause) => {
					setError(cause instanceof Error ? cause.message : String(cause));
					setLoading(false);
				});
			}, [runtime]);
			(0, react.useEffect)(() => {
				browse(void 0);
			}, [browse]);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					if (event.key !== "Escape") return;
					event.stopPropagation();
					onCancel();
				};
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [onCancel]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: DirectoryPicker_module_css_default.backdrop,
				role: "presentation",
				onPointerDown: (event) => {
					if (event.target === event.currentTarget) onCancel();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: DirectoryPicker_module_css_default.panel,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("nav.openWorkspace"),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: DirectoryPicker_module_css_default.head,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: DirectoryPicker_module_css_default.title,
									children: t("nav.openWorkspace")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
									label: t("common.close"),
									onClick: onCancel,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
								})
							]
						}),
						listing === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: DirectoryPicker_module_css_default.crumbs,
							children: listing.crumbs.map((crumb) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: DirectoryPicker_module_css_default.crumb,
								onClick: () => {
									browse(crumb.path);
								},
								children: crumb.name
							}, crumb.path))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: DirectoryPicker_module_css_default.list,
							children: [
								loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: DirectoryPicker_module_css_default.empty,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {})
								}) : null,
								!loading && listing !== void 0 && listing.entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: DirectoryPicker_module_css_default.empty,
									children: t("settings.empty")
								}) : null,
								listing?.entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: `${DirectoryPicker_module_css_default.row} ${entry.hidden ? DirectoryPicker_module_css_default.rowHidden : ""}`,
									onClick: () => {
										browse(entry.path);
									},
									title: entry.path,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: DirectoryPicker_module_css_default.name,
										children: entry.name
									})]
								}, entry.path))
							]
						}),
						error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: DirectoryPicker_module_css_default.error,
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: DirectoryPicker_module_css_default.foot,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: DirectoryPicker_module_css_default.path,
									title: target,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("bdi", { children: target ?? "" })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: onCancel,
									children: t("common.cancel")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									primary: true,
									disabled: target === void 0,
									onClick: () => {
										if (target !== void 0) onPicked(target);
									},
									children: t("learning.open")
								})
							]
						})
					]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\chat\ToolCard.module.css.mjs
		const css$6 = "._l8RgW_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);overflow:hidden}._l8RgW_head{align-items:center;gap:var(--zx-space-3);width:100%;min-height:30px;padding:var(--zx-space-2) var(--zx-space-3);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}._l8RgW_head:hover{background:var(--zx-bg-hover)}._l8RgW_head:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}._l8RgW_glyph{width:16px;height:16px;color:var(--zx-label-muted);flex:none;place-items:center;display:grid}._l8RgW_verb{color:var(--zx-label-secondary);flex:none}._l8RgW_detail{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);color:var(--zx-label);flex:1;overflow:hidden}._l8RgW_error{color:var(--zx-error)}._l8RgW_chevron{color:var(--zx-label-faint);transition:transform var(--zx-motion-fast);flex:none}._l8RgW_chevronOpen{transform:rotate(90deg)}._l8RgW_body{border-top:1px solid var(--zx-border-soft);padding:var(--zx-space-3);gap:var(--zx-space-3);flex-direction:column;display:flex}._l8RgW_bodyRow{align-items:center;gap:var(--zx-space-2);display:flex}._l8RgW_bodyLabel{color:var(--zx-label-faint);font-size:var(--zx-text-micro);text-transform:uppercase;letter-spacing:.04em}._l8RgW_output{max-height:420px;padding:var(--zx-space-3);border-radius:var(--zx-radius-sm);background:var(--zx-bg-panel);color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);white-space:pre-wrap;overflow-wrap:anywhere;margin:0;line-height:1.55;overflow:auto}._l8RgW_children{gap:var(--zx-space-2);padding-left:var(--zx-space-4);border-left:1px solid var(--zx-border-soft);flex-direction:column;display:flex}._l8RgW_group{gap:var(--zx-space-2);flex-direction:column;display:flex}";
		const tagId$6 = "@dsh-portable/dcode-ui/ToolCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var ToolCard_module_css_default = {
			"body": "_l8RgW_body",
			"bodyLabel": "_l8RgW_bodyLabel",
			"bodyRow": "_l8RgW_bodyRow",
			"card": "_l8RgW_card",
			"chevron": "_l8RgW_chevron",
			"chevronOpen": "_l8RgW_chevronOpen",
			"children": "_l8RgW_children",
			"detail": "_l8RgW_detail",
			"error": "_l8RgW_error",
			"glyph": "_l8RgW_glyph",
			"group": "_l8RgW_group",
			"head": "_l8RgW_head",
			"output": "_l8RgW_output",
			"verb": "_l8RgW_verb"
		};
		//#endregion
		//#region src/client/chat/ToolCard.tsx
		/**
		* One tool execution, closed to a single line.
		*
		* A card head answers "what did it just do" without scrolling; expanding it
		* reveals the arguments and the full output, and nested Code Dispatch calls
		* render as their own cards inside their parent. The card is the same for a
		* running and a settled call, so a call does not jump position when it
		* completes.
		* @module @dsh-portable/dcode-ui/client/chat/ToolCard
		*/
		/** Glyph per card-head vocabulary word. */
		function Glyph({ kind }) {
			switch (kind) {
				case "run": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, {});
				case "read": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {});
				case "write":
				case "edit": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {});
				case "search": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {});
				case "web": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {});
				case "agent": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, {});
				case "plan": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, { size: 16 });
				case "skill": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutline16, {});
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {});
			}
		}
		/** Whether a block is a settled result rather than a still-running call. */
		function isSettled(block) {
			return "isError" in block;
		}
		/** A compact, expandable tool-execution card. */
		function ToolCard({ block, onInspect }) {
			const t = useT();
			const [open, setOpen] = (0, react.useState)(false);
			const [wrap, setWrap] = (0, react.useState)(true);
			const settled = isSettled(block);
			const name = settled ? block.call?.name ?? "tool" : block.name;
			const argsRaw = settled ? block.call?.argsRaw : block.argsRaw;
			const summary = summarizeTool(name, argsRaw);
			const failed = settled && block.isError;
			const output = settled ? resultText(block.content) : "";
			const verb = failed ? t("chat.failed") : settled ? t("chat.ran") : t("chat.running");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ToolCard_module_css_default.group,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: ToolCard_module_css_default.card,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: ToolCard_module_css_default.head,
						"aria-expanded": open,
						onClick: () => {
							setOpen((value) => !value);
							onInspect?.(block.callId);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${ToolCard_module_css_default.glyph} ${failed ? ToolCard_module_css_default.error : ""}`,
								"aria-hidden": true,
								children: settled ? failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Glyph, { kind: summary.kind }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${ToolCard_module_css_default.verb} ${failed ? ToolCard_module_css_default.error : ""}`,
								children: verb
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ToolCard_module_css_default.detail,
								children: summary.detail === "" ? name : summary.detail
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, { className: `${ToolCard_module_css_default.chevron} ${open ? ToolCard_module_css_default.chevronOpen : ""}` })
						]
					}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: ToolCard_module_css_default.body,
						children: [argsRaw === void 0 || argsRaw.trim() === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ToolCard_module_css_default.bodyLabel,
							children: t("details.arguments")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: ToolCard_module_css_default.output,
							children: argsRaw
						})] }), settled ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: ToolCard_module_css_default.bodyRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ToolCard_module_css_default.bodyLabel,
								children: t("details.output")
							}), output === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OutputToolbar, {
								text: output,
								wrap,
								onWrap: setWrap
							})]
						}), output === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: ToolCard_module_css_default.output,
							children: "—"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnsiOutput, {
							text: output,
							wrap,
							className: failed ? ToolCard_module_css_default.error : void 0
						})] }) : null]
					}) : null]
				}), block.subCalls.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: ToolCard_module_css_default.children,
					children: block.subCalls.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolCard, {
						block: child,
						onInspect
					}, child.callId))
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\chat\FileChanges.module.css.mjs
		const css$5 = ".TDoHoq_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);overflow:hidden}.TDoHoq_head{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-3) var(--zx-space-4);font-size:var(--zx-text-xs);color:var(--zx-label);display:flex}.TDoHoq_title{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-weight:500;overflow:hidden}.TDoHoq_undo{align-items:center;gap:var(--zx-space-2);height:22px;padding:0 var(--zx-space-2);border-radius:var(--zx-radius-sm);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-micro);white-space:nowrap;cursor:pointer;background:0 0;border:0;display:inline-flex}.TDoHoq_undo:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.TDoHoq_undo:disabled{opacity:.5;cursor:default}.TDoHoq_row{align-items:center;gap:var(--zx-space-3);width:100%;min-height:30px;padding:var(--zx-space-1) var(--zx-space-4);border:0;border-top:1px solid var(--zx-border-soft);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;display:flex}.TDoHoq_row:hover{background:var(--zx-bg-hover)}.TDoHoq_row:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.TDoHoq_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);direction:rtl;flex:1;overflow:hidden}.TDoHoq_dir{color:var(--zx-label-faint)}.TDoHoq_note{padding:var(--zx-space-2) var(--zx-space-4) var(--zx-space-3);color:var(--zx-label-muted);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body);margin:0}";
		const tagId$5 = "@dsh-portable/dcode-ui/FileChanges.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var FileChanges_module_css_default = {
			"card": "TDoHoq_card",
			"dir": "TDoHoq_dir",
			"head": "TDoHoq_head",
			"note": "TDoHoq_note",
			"path": "TDoHoq_path",
			"row": "TDoHoq_row",
			"title": "TDoHoq_title",
			"undo": "TDoHoq_undo"
		};
		//#endregion
		//#region src/client/chat/FileChanges.tsx
		/**
		* The file-change summary card that closes a turn.
		*
		* It lists exactly the paths that turn's settled write/edit calls touched,
		* annotates each with the line counts from the working-tree status, opens the
		* diff viewer on click, and offers the one destructive action the workbench
		* has: undoing that turn's edits.
		*
		* Undo is deliberately narrow. It restores tracked files from HEAD and moves
		* untracked ones into `.dsh/dcode-undo/<timestamp>/` rather than deleting
		* them, so a mistaken undo is recoverable from the operator's own directory.
		* @module @dsh-portable/dcode-ui/client/chat/FileChanges
		*/
		/** Split a path into its directory prefix and file name for two-tone display. */
		function splitPath(path) {
			const normalized = path.split("\\").join("/");
			const index = normalized.lastIndexOf("/");
			return index === -1 ? {
				dir: "",
				name: normalized
			} : {
				dir: normalized.slice(0, index + 1),
				name: normalized.slice(index + 1)
			};
		}
		/** Normalize a turn path to the repository-relative form used by git status. */
		function relativePath(path, cwd) {
			const normalized = path.split("\\").join("/").replace(/^\.\//, "");
			if (cwd === void 0) return normalized;
			const root = cwd.split("\\").join("/").replace(/\/$/, "");
			return normalized.startsWith(`${root}/`) ? normalized.slice(root.length + 1) : normalized;
		}
		/** Exact-match a turn path against a repository-relative status row. */
		function countsFor(status, path, cwd) {
			const normalized = relativePath(path, cwd);
			const row = status?.files.find((file) => file.path.split("\\").join("/") === normalized);
			return {
				insertions: row?.insertions ?? 0,
				deletions: row?.deletions ?? 0
			};
		}
		/** The turn's changed-file summary with its undo action. */
		function FileChanges({ paths, cwd, status, onOpenDiff, onChanged }) {
			const runtime = useRuntime();
			const t = useT();
			const [undoing, setUndoing] = (0, react.useState)(false);
			const [note, setNote] = (0, react.useState)(void 0);
			const totals = (0, react.useMemo)(() => paths.reduce((sum, path) => {
				const counts = countsFor(status, path, cwd);
				return {
					insertions: sum.insertions + counts.insertions,
					deletions: sum.deletions + counts.deletions
				};
			}, {
				insertions: 0,
				deletions: 0
			}), [
				paths,
				status,
				cwd
			]);
			const undo = (0, react.useCallback)(() => {
				if (cwd === void 0) return;
				setUndoing(true);
				setNote(void 0);
				runtime.git.undo(cwd, paths).then((result) => {
					setUndoing(false);
					if (!result.ok) {
						setNote(result.error.message);
						return;
					}
					const reverted = result.value.outcomes.filter((outcome) => outcome.result !== "skipped");
					const quarantined = result.value.outcomes.filter((outcome) => outcome.result === "quarantined");
					setNote(quarantined.length === 0 ? t("changes.undone", { count: reverted.length }) : `${t("changes.undone", { count: reverted.length })} · ${quarantined.map((o) => o.movedTo ?? o.path).join(", ")}`);
					onChanged();
				});
			}, [
				runtime,
				cwd,
				paths,
				onChanged,
				t
			]);
			if (paths.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: FileChanges_module_css_default.card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: FileChanges_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: FileChanges_module_css_default.title,
								children: t("changes.count", { count: paths.length })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffCount, {
								insertions: totals.insertions,
								deletions: totals.deletions
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: FileChanges_module_css_default.undo,
								disabled: undoing || cwd === void 0 || !runtime.git.available,
								onClick: undo,
								title: t("changes.undo"),
								children: [undoing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {}), undoing ? t("changes.undoing") : t("changes.undo")]
							})
						]
					}),
					paths.map((path) => {
						const { dir, name } = splitPath(path);
						const counts = countsFor(status, path, cwd);
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: FileChanges_module_css_default.row,
							onClick: () => {
								onOpenDiff(path);
							},
							title: path,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: FileChanges_module_css_default.path,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("bdi", { children: [dir === "" ? "" : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: FileChanges_module_css_default.dir,
										children: dir
									}), name] })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffCount, {
									insertions: counts.insertions,
									deletions: counts.deletions
								})
							]
						}, path);
					}),
					note === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: FileChanges_module_css_default.note,
						children: note
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\chat\Transcript.module.css.mjs
		const css$4 = ".KYRGnq_scroller{scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;flex-direction:column;flex:1 1 0;min-height:0;display:flex;overflow:hidden auto}.KYRGnq_scroller::-webkit-scrollbar{width:10px}.KYRGnq_scroller::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.KYRGnq_flow{gap:var(--zx-space-5);width:min(var(--zx-reading-width), 100%);padding:var(--zx-space-6) var(--zx-space-5) var(--zx-space-6);flex-direction:column;flex:none;margin:0 auto;display:flex}.KYRGnq_turn{gap:var(--zx-space-5);flex-direction:column;display:flex}.KYRGnq_user{max-width:86%;padding:var(--zx-space-3) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);color:var(--zx-label);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);white-space:pre-wrap;overflow-wrap:anywhere;align-self:flex-end}.KYRGnq_steering{border-color:color-mix(in srgb, var(--zx-warn) 40%, transparent);align-self:flex-end;max-width:86%}.KYRGnq_assistant{font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);color:var(--zx-label);overflow-wrap:anywhere}.KYRGnq_assistant pre{max-width:100%;overflow-x:auto}.KYRGnq_blockGap{gap:var(--zx-space-4);flex-direction:column;display:flex}.KYRGnq_reasoning{border-left:2px solid var(--zx-border);padding-left:var(--zx-space-4);color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.KYRGnq_reasoningHead{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-muted);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;display:inline-flex}.KYRGnq_reasoningHead:hover{color:var(--zx-label-secondary)}.KYRGnq_notice{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-3) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);display:flex}.KYRGnq_noticeError{border-color:color-mix(in srgb, var(--zx-error) 45%, transparent);color:var(--zx-error)}.KYRGnq_noticeWarn{border-color:color-mix(in srgb, var(--zx-warn) 45%, transparent);color:var(--zx-warn)}.KYRGnq_divider{align-items:center;gap:var(--zx-space-3);color:var(--zx-label-faint);font-size:var(--zx-text-micro);display:flex}.KYRGnq_divider:before,.KYRGnq_divider:after{content:\"\";background:var(--zx-border-soft);flex:1;height:1px}.KYRGnq_stats{align-items:center;gap:var(--zx-space-3);color:var(--zx-label-faint);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;display:flex}.KYRGnq_loadOlder{align-self:center}.KYRGnq_hero{justify-content:center;align-items:center;gap:var(--zx-space-4);padding:var(--zx-space-7);text-align:center;flex-direction:column;flex:1;display:flex;position:relative;overflow:hidden}.KYRGnq_heroBlank{padding-bottom:var(--zx-space-6);justify-content:flex-end}.KYRGnq_heroGreeting{font-size:var(--zx-text-2xl);color:var(--zx-label);letter-spacing:-.02em;font-weight:500;line-height:var(--zx-leading-tight);position:relative}.KYRGnq_heroTitle{font-size:var(--zx-text-xl);color:var(--zx-label);font-weight:500}.KYRGnq_heroBody{max-width:480px;color:var(--zx-label-muted);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);margin:0}.KYRGnq_streamingDot{background:var(--zx-accent);border-radius:50%;width:7px;height:7px;margin-left:4px;animation:1s steps(2,start) infinite KYRGnq_zx-blink;display:inline-block}@keyframes KYRGnq_zx-blink{50%{opacity:.2}}@media (prefers-reduced-motion:reduce){.KYRGnq_streamingDot{animation:none}}";
		const tagId$4 = "@dsh-portable/dcode-ui/Transcript.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var Transcript_module_css_default = {
			"assistant": "KYRGnq_assistant",
			"blockGap": "KYRGnq_blockGap",
			"divider": "KYRGnq_divider",
			"flow": "KYRGnq_flow",
			"hero": "KYRGnq_hero",
			"heroBlank": "KYRGnq_heroBlank",
			"heroBody": "KYRGnq_heroBody",
			"heroGreeting": "KYRGnq_heroGreeting",
			"heroTitle": "KYRGnq_heroTitle",
			"loadOlder": "KYRGnq_loadOlder",
			"notice": "KYRGnq_notice",
			"noticeError": "KYRGnq_noticeError",
			"noticeWarn": "KYRGnq_noticeWarn",
			"reasoning": "KYRGnq_reasoning",
			"reasoningHead": "KYRGnq_reasoningHead",
			"scroller": "KYRGnq_scroller",
			"stats": "KYRGnq_stats",
			"steering": "KYRGnq_steering",
			"streamingDot": "KYRGnq_streamingDot",
			"turn": "KYRGnq_turn",
			"user": "KYRGnq_user",
			"zx-blink": "KYRGnq_zx-blink"
		};
		//#endregion
		//#region src/client/chat/Transcript.tsx
		/**
		* The conversation column.
		*
		* Nodes come from the Chat target the official UI assembles — the very same
		* `ConversationNode` stream, projections and streaming partial — so a session
		* opened in one surface and continued in the other shows one history. What
		* differs is the presentation: a compact tool card per call, a file-change
		* summary closing each turn, and a reading column instead of a full-width
		* flow.
		* @module @dsh-portable/dcode-ui/client/chat/Transcript
		*/
		/** Reasoning text, folded by default. */
		function Reasoning({ text }) {
			const t = useT();
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.reasoning,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: Transcript_module_css_default.reasoningHead,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutline14, {}),
						t("chat.reasoning"),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							children: open ? "▾" : "▸"
						})
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: text }) : null]
			});
		}
		/** One assistant message's visible blocks. Tool calls render as their own cards. */
		function AssistantBlocks(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Transcript_module_css_default.blockGap,
				children: props.blocks.map((block, index) => {
					if (block.kind === "text") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Transcript_module_css_default.assistant,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
							text: block.text,
							streaming: props.streaming,
							labels: props.labels
						})
					}, index);
					if (block.kind === "reasoning") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Reasoning, { text: block.text }, index);
					return null;
				})
			});
		}
		/** Token accounting shown under a finished assistant message. */
		function Stats({ node }) {
			const t = useT();
			const usage = node.usage;
			const total = usage?.totalTokens ?? usage?.total_tokens;
			const model = node.provenance?.model;
			if (total === void 0 && model === void 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.stats,
				children: [
					model === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: model }),
					total === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("chat.tokens", { count: total }) }),
					node.interrupted === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("chat.interrupted") }) : null
				]
			});
		}
		/** Render one conversation node. */
		function Node(props) {
			const t = useT();
			const { node } = props;
			switch (node.kind) {
				case "user": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Transcript_module_css_default.user,
					children: messageText(node.content)
				});
				case "steering": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: `${Transcript_module_css_default.user} ${Transcript_module_css_default.steering}`,
					children: messageText(node.content)
				});
				case "assistant": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssistantBlocks, {
					blocks: node.blocks,
					streaming: false,
					labels: props.labels
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stats, { node })] });
				case "tool-result": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolCard, {
					block: node,
					onInspect: props.onInspect
				});
				case "command": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Transcript_module_css_default.notice,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("chat.command") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("code", { children: [
						"/",
						node.name ?? "…",
						node.args === null || node.args === void 0 ? "" : ` ${node.args}`
					] })]
				});
				case "context": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Transcript_module_css_default.divider,
					children: t("chat.context")
				});
				case "compaction": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: Transcript_module_css_default.divider,
					children: t("chat.compaction")
				});
				case "model-retry": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${Transcript_module_css_default.notice} ${Transcript_module_css_default.noticeWarn}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), t("chat.retry")]
				});
				case "turn-max-tokens": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${Transcript_module_css_default.notice} ${Transcript_module_css_default.noticeWarn}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), t("chat.maxTokens")]
				});
				case "turn-error": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${Transcript_module_css_default.notice} ${Transcript_module_css_default.noticeError}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), node.message === "" ? node.code ?? t("common.error") : node.message]
				});
				default: return null;
			}
		}
		function dynamicGreetingKey() {
			const hour = (/* @__PURE__ */ new Date()).getHours();
			if (hour >= 5 && hour < 12) return "chat.empty.morning";
			if (hour >= 12 && hour < 18) return "chat.empty.afternoon";
			return "chat.empty.evening";
		}
		/** The scrolling conversation, its turn summaries and its streaming tail. */
		function Transcript({ navigation, sessionId, cwd, blank }) {
			const runtime = useRuntime();
			const t = useT();
			const chat = useChatSnapshot(sessionId);
			const session = useSessionSnapshot(sessionId);
			const git = useGitStatus(cwd, sessionId);
			const scrollerRef = (0, react.useRef)(null);
			const pinnedRef = (0, react.useRef)(true);
			const labels = (0, react.useMemo)(() => ({
				code: {
					copyLabel: t("common.copy"),
					copiedLabel: t("common.copied")
				},
				footnotes: t("details.title")
			}), [t]);
			const nodes = chat?.legacy.nodes ?? [];
			const partial = chat?.legacy.partial ?? null;
			const runningCalls = chat?.legacy.runningCalls ?? [];
			const turns = (0, react.useMemo)(() => splitTurns(nodes), [nodes]);
			(0, react.useEffect)(() => {
				const scroller = scrollerRef.current;
				if (scroller === null) return void 0;
				const onScroll = () => {
					const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
					pinnedRef.current = distance < 80;
				};
				scroller.addEventListener("scroll", onScroll, { passive: true });
				return () => {
					scroller.removeEventListener("scroll", onScroll);
				};
			}, []);
			(0, react.useLayoutEffect)(() => {
				const scroller = scrollerRef.current;
				if (scroller === null || !pinnedRef.current) return;
				scroller.scrollTop = scroller.scrollHeight;
			}, [
				nodes,
				partial,
				runningCalls.length,
				sessionId
			]);
			(0, react.useEffect)(() => {
				pinnedRef.current = true;
			}, [sessionId]);
			if (sessionId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: `${Transcript_module_css_default.hero} ${Transcript_module_css_default.heroBlank}`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Transcript_module_css_default.heroGreeting,
					children: t(dynamicGreetingKey())
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.scroller,
				ref: scrollerRef,
				children: [blank ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${Transcript_module_css_default.hero} ${Transcript_module_css_default.heroBlank}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Transcript_module_css_default.heroGreeting,
						children: t(dynamicGreetingKey())
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Transcript_module_css_default.heroBody,
						children: cwd === void 0 ? t("chat.empty.noWorkspace") : t("chat.empty.body", { cwd })
					})]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Transcript_module_css_default.flow,
					children: [
						session?.hasMore === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							className: Transcript_module_css_default.loadOlder,
							disabled: session.loadingOlder,
							onClick: () => {
								runtime.binding(sessionId)?.session.loadOlder();
							},
							children: session.loadingOlder ? t("chat.loading") : t("chat.loadOlder")
						}) : null,
						turns.map((turn, turnIndex) => {
							const paths = changedPaths(turn);
							const last = turnIndex === turns.length - 1;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Transcript_module_css_default.turn,
								children: [turn.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Node, {
									node,
									labels,
									onInspect: (callId) => {
										navigation.inspect(callId);
									}
								}, `${node.kind}:${String(node.seq)}`)), paths.length > 0 && (!last || session?.running !== true) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileChanges, {
									paths,
									cwd,
									status: git.status,
									onOpenDiff: (path) => {
										navigation.openDiff(path);
									},
									onChanged: git.refresh
								}) : null]
							}, turn[0]?.seq ?? turnIndex);
						}),
						runningCalls.map((call) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolCard, {
							block: call,
							onInspect: (callId) => {
								navigation.inspect(callId);
							}
						}, call.callId)),
						partial === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssistantBlocks, {
							blocks: partial.blocks,
							streaming: true,
							labels
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Transcript_module_css_default.streamingDot,
							"aria-label": t("chat.thinking")
						})] }),
						session?.running === true && partial === null && runningCalls.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Transcript_module_css_default.stats,
							children: [t("chat.thinking"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Transcript_module_css_default.streamingDot })]
						}) : null,
						session?.queue.length === 0 ? null : session?.queue.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${Transcript_module_css_default.user} ${Transcript_module_css_default.steering}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Transcript_module_css_default.stats,
								children: t("chat.queued")
							}), item.text ?? item.preview]
						}, item.id)),
						session?.lastAgentError === null || session?.lastAgentError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${Transcript_module_css_default.notice} ${Transcript_module_css_default.noticeError}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), session.lastAgentError]
						})
					]
				}), chat === void 0 && !blank ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("chat.loading") }) : null]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\learning\LearningHome.module.css.mjs
		const css$3 = ".F7L6-W_surface{grid-template-columns:220px 1fr;width:100%;min-width:0;display:grid;overflow:hidden}.F7L6-W_rail{border-right:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);padding:var(--zx-space-3);padding-top:calc(var(--zx-space-4) + var(--dsh-desktop-titlebar-height,0px));flex-direction:column;gap:2px;display:flex;overflow:hidden auto}.F7L6-W_back{align-items:center;gap:var(--zx-space-3);height:28px;padding:0 var(--zx-space-3);margin-bottom:var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.F7L6-W_back:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.F7L6-W_railItem{align-items:center;gap:var(--zx-space-3);height:30px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.F7L6-W_railItem:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.F7L6-W_railItemActive{background:var(--zx-bg-active);color:var(--zx-label)}.F7L6-W_railGroup{padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-faint);font-size:var(--zx-text-micro)}.F7L6-W_body{min-width:0;padding:var(--zx-space-7) var(--zx-space-7) var(--zx-space-7);padding-top:calc(var(--zx-space-6) + var(--dsh-desktop-titlebar-height,0px));overflow:hidden auto}.F7L6-W_inner{gap:var(--zx-space-6);flex-direction:column;width:min(900px,100%);margin:0 auto;display:flex}.F7L6-W_title{font-size:var(--zx-text-2xl);color:var(--zx-label);font-weight:500}.F7L6-W_subtitle{color:var(--zx-label-muted);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);max-width:620px}.F7L6-W_grid{gap:var(--zx-space-4);grid-template-columns:repeat(auto-fit,minmax(240px,1fr));display:grid}.F7L6-W_mode{gap:var(--zx-space-2);padding:var(--zx-space-5);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);color:inherit;font:inherit;text-align:left;cursor:pointer;transition:border-color var(--zx-motion-fast), background var(--zx-motion-fast);flex-direction:column;display:flex}.F7L6-W_mode:hover:not(:disabled){border-color:var(--zx-border);background:var(--zx-bg-hover)}.F7L6-W_mode:disabled{opacity:.5;cursor:default}.F7L6-W_modeTitle{align-items:center;gap:var(--zx-space-3);font-size:var(--zx-text-md);color:var(--zx-label);display:flex}.F7L6-W_modeBody{color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.F7L6-W_sessionRow{align-items:center;gap:var(--zx-space-3);width:100%;min-height:34px;padding:var(--zx-space-2) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;display:flex}.F7L6-W_sessionRow:hover{background:var(--zx-bg-hover)}.F7L6-W_sessionTitle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.F7L6-W_library{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);min-height:420px;overflow:hidden}.F7L6-W_note{color:var(--zx-label-muted);font-size:var(--zx-text-xs)}";
		const tagId$3 = "@dsh-portable/dcode-ui/LearningHome.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var LearningHome_module_css_default = {
			"back": "F7L6-W_back",
			"body": "F7L6-W_body",
			"grid": "F7L6-W_grid",
			"inner": "F7L6-W_inner",
			"library": "F7L6-W_library",
			"mode": "F7L6-W_mode",
			"modeBody": "F7L6-W_modeBody",
			"modeTitle": "F7L6-W_modeTitle",
			"note": "F7L6-W_note",
			"rail": "F7L6-W_rail",
			"railGroup": "F7L6-W_railGroup",
			"railItem": "F7L6-W_railItem",
			"railItemActive": "F7L6-W_railItemActive",
			"sessionRow": "F7L6-W_sessionRow",
			"sessionTitle": "F7L6-W_sessionTitle",
			"subtitle": "F7L6-W_subtitle",
			"surface": "F7L6-W_surface",
			"title": "F7L6-W_title"
		};
		//#endregion
		//#region src/client/learning/LearningHome.tsx
		/**
		* Learning mode as a first-class surface.
		*
		* Everything here drives the Interactive Learning pack this distribution
		* already ships: starting a session selects its `learning` agent preset and
		* sends the pack's own opening prompt, and the library, concept cards, notes
		* and visuals are the pack's own `VaultLibrary` reading the same
		* `/interactive-learning` channel the classic UI's views read. No learning
		* state or backend is duplicated here — this module is navigation and framing
		* around capabilities that already exist.
		* @module @dsh-portable/dcode-ui/client/learning/LearningHome
		*/
		/** The agent preset the Interactive Learning pack installs. */
		const LEARNING_PRESET = "learning";
		const MODES = [
			{
				id: "concept",
				titleKey: "learning.concept",
				bodyKey: "learning.conceptBody"
			},
			{
				id: "problem",
				titleKey: "learning.problem",
				bodyKey: "learning.problemBody"
			},
			{
				id: "material",
				titleKey: "learning.material",
				bodyKey: "learning.materialBody"
			}
		];
		/** Learning entry points, the current learning session, and the vault. */
		function LearningHome({ navigation, cwd, sessionId }) {
			const runtime = useRuntime();
			const t = useT();
			const list = useSessionList();
			const [section, setSection] = (0, react.useState)("start");
			const [starting, setStarting] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const learningSessions = (0, react.useMemo)(() => list.ids.map((id) => list.byId[id]).filter((summary) => summary !== void 0 && summary.projectionValues?.agentPreset === LEARNING_PRESET), [list]);
			const start = (0, react.useCallback)((mode) => {
				const nav = runtime.navigation;
				if (nav === void 0) return;
				setStarting(true);
				setFailure(void 0);
				(async () => {
					try {
						const workspace = runtime.workspaces.list.getSnapshot().items.find((item) => item.path === cwd);
						const target = workspace === void 0 ? sessionId : await nav.connectWorkspace(workspace.workspaceId);
						if (target === void 0) {
							setFailure(t("learning.needsWorkspace"));
							return;
						}
						const selected = await runtime.remote.agentPresets.select(target, LEARNING_PRESET);
						if (!selected.ok) {
							setFailure(selected.error.message);
							return;
						}
						runtime.sessions.open(target);
						navigation.show("session");
						const opening = mode.id === "concept" ? t("learning.concept") : mode.id === "problem" ? t("learning.problem") : t("learning.material");
						const face = runtime.binding(target)?.session;
						if (face !== void 0) {
							const handle = face.beginSubmission({
								text: opening,
								images: []
							});
							await face.prompt([{
								type: "text",
								text: opening
							}], "queue", void 0, handle.requestId);
						}
					} catch (cause) {
						setFailure(cause instanceof Error ? cause.message : String(cause));
					} finally {
						setStarting(false);
					}
				})();
			}, [
				runtime,
				navigation,
				cwd,
				sessionId,
				t
			]);
			const sections = [
				{
					id: "start",
					label: t("learning.title")
				},
				{
					id: "current",
					label: t("learning.current")
				},
				{
					id: "library",
					label: t("learning.library"),
					group: t("settings.group.data")
				},
				{
					id: "concepts",
					label: t("learning.cards")
				},
				{
					id: "notes",
					label: t("learning.notes")
				},
				{
					id: "visuals",
					label: t("learning.visuals")
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LearningHome_module_css_default.surface,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
					className: LearningHome_module_css_default.rail,
					"aria-label": t("learning.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: LearningHome_module_css_default.back,
						onClick: () => {
							navigation.show("session");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {}), t("nav.backToWorkspace")]
					}), sections.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [entry.group === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LearningHome_module_css_default.railGroup,
						children: entry.group
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${LearningHome_module_css_default.railItem} ${section === entry.id ? LearningHome_module_css_default.railItemActive : ""}`,
						onClick: () => {
							setSection(entry.id);
						},
						children: entry.label
					})] }, entry.id))]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: LearningHome_module_css_default.body,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LearningHome_module_css_default.inner,
						children: [
							section === "start" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: LearningHome_module_css_default.title,
									children: t("learning.title")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: LearningHome_module_css_default.subtitle,
									children: t("learning.subtitle")
								})] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: LearningHome_module_css_default.grid,
									children: MODES.map((mode) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: LearningHome_module_css_default.mode,
										disabled: starting || runtime.navigation === void 0,
										onClick: () => {
											start(mode);
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: LearningHome_module_css_default.modeTitle,
											children: [mode.id === "concept" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}) : mode.id === "problem" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14, { size: 16 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutline16, {}), t(mode.titleKey)]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: LearningHome_module_css_default.modeBody,
											children: t(mode.bodyKey)
										})]
									}, mode.id))
								}),
								failure === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: LearningHome_module_css_default.note,
									children: failure
								}),
								cwd === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: LearningHome_module_css_default.note,
									children: t("learning.needsWorkspace")
								}) : null
							] }) : null,
							section === "current" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: LearningHome_module_css_default.title,
								children: t("learning.current")
							}), learningSessions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("learning.currentNone") }) : learningSessions.map((summary) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: LearningHome_module_css_default.sessionRow,
								onClick: () => {
									runtime.sessions.open(summary.id);
									navigation.show("session");
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGoalOutline16, {}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: LearningHome_module_css_default.sessionTitle,
										children: summary.displayTitle
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: LearningHome_module_css_default.note,
										children: summary.cwd
									})
								]
							}, summary.id))] }) : null,
							section === "library" || section === "concepts" || section === "notes" || section === "visuals" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: LearningHome_module_css_default.title,
								children: section === "library" ? t("learning.library") : section === "concepts" ? t("learning.cards") : section === "notes" ? t("learning.notes") : t("learning.visuals")
							}), cwd === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("learning.needsWorkspace") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: LearningHome_module_css_default.library,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_dsh_portable_interactive_learning_client.VaultLibrary, {
									cwd,
									call: runtime.learningCall,
									t: runtime.learningT,
									embedded: true
								})
							})] }) : null
						]
					})
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\settings\SettingsSurface.module.css.mjs
		const css$2 = ".yP511q_surface{grid-template-columns:240px 1fr;width:100%;min-width:0;display:grid;overflow:hidden}.yP511q_rail{padding:var(--zx-space-3);padding-top:calc(var(--zx-space-4) + var(--dsh-desktop-titlebar-height,0px));border-right:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);flex-direction:column;gap:1px;display:flex;overflow:hidden auto}.yP511q_back{align-items:center;gap:var(--zx-space-3);height:28px;padding:0 var(--zx-space-3);margin-bottom:var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.yP511q_back:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.yP511q_group{padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-faint);font-size:var(--zx-text-micro)}.yP511q_item{align-items:center;gap:var(--zx-space-3);height:30px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.yP511q_item:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.yP511q_itemActive{background:var(--zx-bg-active);color:var(--zx-label)}.yP511q_body{min-width:0;padding:var(--zx-space-7);padding-top:calc(var(--zx-space-6) + var(--dsh-desktop-titlebar-height,0px));overflow:hidden auto}.yP511q_inner{gap:var(--zx-space-6);flex-direction:column;width:min(820px,100%);margin:0 auto;display:flex}.yP511q_title{font-size:var(--zx-text-2xl);color:var(--zx-label);font-weight:500}.yP511q_section{gap:var(--zx-space-3);flex-direction:column;display:flex}.yP511q_sectionTitle{font-size:var(--zx-text-lg);color:var(--zx-label)}.yP511q_sectionBody{color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.yP511q_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);overflow:hidden}.yP511q_row{align-items:center;gap:var(--zx-space-4);padding:var(--zx-space-4) var(--zx-space-5);display:flex}.yP511q_row+.yP511q_row{border-top:1px solid var(--zx-border-soft)}.yP511q_rowText{flex:1;min-width:0}.yP511q_rowTitle{color:var(--zx-label);font-size:var(--zx-text-sm)}.yP511q_rowBody{color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);margin-top:2px}.yP511q_rowMono{font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);color:var(--zx-label-secondary);overflow-wrap:anywhere}.yP511q_choice{gap:var(--zx-space-3);display:flex}.yP511q_option{gap:var(--zx-space-2);padding:var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);color:inherit;font:inherit;text-align:left;cursor:pointer;transition:border-color var(--zx-motion-fast);flex-direction:column;flex:1;display:flex}.yP511q_option:hover{border-color:var(--zx-border)}.yP511q_optionActive{border-color:var(--zx-accent);background:color-mix(in srgb, var(--zx-accent) 8%, var(--zx-bg-card))}.yP511q_optionTitle{align-items:center;gap:var(--zx-space-2);color:var(--zx-label);font-size:var(--zx-text-sm);display:flex}.yP511q_select{min-width:140px;height:28px;padding:0 var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs)}.yP511q_number{width:84px;height:28px;padding:0 var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:right}.yP511q_search{width:100%;height:30px;padding:0 var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);box-sizing:border-box}.yP511q_search:focus{border-color:var(--zx-accent);outline:none}.yP511q_badge{color:var(--zx-label-faint);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}";
		const tagId$2 = "@dsh-portable/dcode-ui/SettingsSurface.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var SettingsSurface_module_css_default = {
			"back": "yP511q_back",
			"badge": "yP511q_badge",
			"body": "yP511q_body",
			"card": "yP511q_card",
			"choice": "yP511q_choice",
			"group": "yP511q_group",
			"inner": "yP511q_inner",
			"item": "yP511q_item",
			"itemActive": "yP511q_itemActive",
			"number": "yP511q_number",
			"option": "yP511q_option",
			"optionActive": "yP511q_optionActive",
			"optionTitle": "yP511q_optionTitle",
			"rail": "yP511q_rail",
			"row": "yP511q_row",
			"rowBody": "yP511q_rowBody",
			"rowMono": "yP511q_rowMono",
			"rowText": "yP511q_rowText",
			"rowTitle": "yP511q_rowTitle",
			"search": "yP511q_search",
			"section": "yP511q_section",
			"sectionBody": "yP511q_sectionBody",
			"sectionTitle": "yP511q_sectionTitle",
			"select": "yP511q_select",
			"surface": "yP511q_surface",
			"title": "yP511q_title"
		};
		//#endregion
		//#region src/client/settings/SettingsSurface.tsx
		/**
		* The settings surface.
		*
		* Sections read the Host's own controllers — the settings registry, the model
		* catalogue, the skill and command lists, the plugin inventory — so nothing
		* here is a second copy of configuration. Where this distribution has no
		* bespoke editor for a namespace, the section shows the registry's live
		* values and points at the classic settings surface, which is never removed.
		*
		* The Interface section is the workbench's own: it is one of the four switch
		* entry points between the modern and classic front ends.
		* @module @dsh-portable/dcode-ui/client/settings/SettingsSurface
		*/
		/** Rail layout: the four DSH settings pages visible in the workbench. */
		const RAIL = [{
			group: "settings.group.basics",
			items: [{
				id: "general",
				label: "settings.general"
			}, {
				id: "models",
				label: "settings.models"
			}]
		}, {
			group: "settings.group.agent",
			items: [{
				id: "plugins",
				label: "settings.plugins"
			}, {
				id: "agentPresets",
				label: "settings.agentPresets"
			}]
		}];
		/** A titled block with an explanatory line. */
		function Section(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SettingsSurface_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SettingsSurface_module_css_default.sectionTitle,
						children: props.title
					}),
					props.body === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SettingsSurface_module_css_default.sectionBody,
						children: props.body
					}),
					props.children
				]
			});
		}
		/** One settings row: label, explanation, and a control. */
		function Row(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SettingsSurface_module_css_default.row,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SettingsSurface_module_css_default.rowText,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.rowTitle,
						children: props.title
					}), props.body === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.rowBody,
						children: props.body
					})]
				}), props.control]
			});
		}
		/** The front-end switch, one of the workbench's four switch entry points. */
		function InterfaceSection() {
			const runtime = useRuntime();
			const t = useT();
			const mode = (0, react.useSyncExternalStore)(runtime.mode.subscribe, runtime.mode.get, runtime.mode.get);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("settings.interface"),
				body: t("settings.interfaceBody"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SettingsSurface_module_css_default.choice,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${SettingsSurface_module_css_default.option} ${mode === "official" ? SettingsSurface_module_css_default.optionActive : ""}`,
						onClick: () => {
							runtime.mode.set("official");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SettingsSurface_module_css_default.optionTitle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {}), t("settings.modeOfficial")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.rowBody,
							children: t("settings.modeOfficialBody")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${SettingsSurface_module_css_default.option} ${mode === "dcode" ? SettingsSurface_module_css_default.optionActive : ""}`,
						onClick: () => {
							runtime.mode.set("dcode");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SettingsSurface_module_css_default.optionTitle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}), t("settings.modeWorkbench")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.rowBody,
							children: t("settings.modeWorkbenchBody")
						})]
					})]
				})
			});
		}
		/** Language, appearance, busy Enter, and the front-end switch. */
		function GeneralSection() {
			const runtime = useRuntime();
			const t = useT();
			const locale = (0, react.useSyncExternalStore)(runtime.locale.subscribe, runtime.locale.getSnapshot, runtime.locale.getSnapshot);
			const busyEnter = (0, react.useSyncExternalStore)(runtime.busyEnter.subscribe, runtime.busyEnter.getSnapshot, runtime.busyEnter.getSnapshot);
			const theme = runtime.theme;
			const themeKey = () => {
				const current = theme?.getTheme();
				return current === void 0 ? "" : [
					current.preference ?? "",
					current.fontSize,
					current.active.id,
					...(current.themes ?? []).map((entry) => entry.id)
				].join(":");
			};
			const themeState = (0, react.useSyncExternalStore)(runtime.appearance.subscribe, themeKey, themeKey);
			const snapshot = (0, react.useMemo)(() => theme?.getTheme(), [theme, themeState]);
			const custom = (snapshot?.themes ?? []).filter((entry) => entry.id !== "light" && entry.id !== "dark");
			const localeOptions = locale.locales.length === 0 ? [{
				id: locale.active,
				label: locale.active
			}] : locale.locales;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
					title: t("settings.language"),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.card,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: t("settings.language"),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: SettingsSurface_module_css_default.select,
								"aria-label": t("settings.language"),
								value: locale.active,
								disabled: localeOptions.length <= 1,
								onChange: (event) => {
									runtime.locale.set(event.target.value);
								},
								children: localeOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: option.id,
									children: option.label
								}, option.id))
							})
						})
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
					title: t("settings.appearance"),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.theme"),
								control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeSwitch, {})
							}),
							custom.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.themeCustom"),
								control: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									className: SettingsSurface_module_css_default.select,
									value: snapshot?.preference ?? snapshot?.active.id ?? "system",
									onChange: (event) => {
										theme?.setTheme?.(event.target.value);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "system",
										children: t("theme.system")
									}), (snapshot?.themes ?? []).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: entry.id,
										children: entry.id
									}, entry.id))]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.fontSize"),
								control: theme?.setFontSize === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.badge,
									children: snapshot?.fontSize ?? "—"
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: SettingsSurface_module_css_default.number,
									type: "number",
									min: 11,
									max: 22,
									value: snapshot?.fontSize ?? 14,
									disabled: theme?.setFontSize === void 0,
									onChange: (event) => {
										theme.setFontSize?.(Number(event.target.value));
									}
								})
							})
						]
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
					title: t("settings.busyEnter"),
					body: t("settings.busyEnterBody"),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.card,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: t("settings.busyEnter"),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: SettingsSurface_module_css_default.select,
								"aria-label": t("settings.busyEnter"),
								value: busyEnter,
								disabled: !runtime.busyEnter.writable,
								onChange: (event) => {
									runtime.busyEnter.set(event.target.value);
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "queue",
									children: t("settings.busyEnter.queue")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "steer",
									children: t("settings.busyEnter.steer")
								})]
							})
						})
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InterfaceSection, {})
			] });
		}
		/** Provider routes and the model catalogue the composer selects from. */
		function ModelsSection() {
			const runtime = useRuntime();
			const t = useT();
			const catalog = useAsync(async () => await runtime.remote.session.modelCatalog(), [runtime]);
			if (catalog.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (catalog.value?.ok !== true) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: catalog.error ?? (catalog.value?.ok === false ? catalog.value.error.message : t("common.error")) });
			const value = catalog.value.value;
			const providerName = (providerId) => value.groups.find((group) => group.id === providerId)?.name ?? value.failures.find((failure) => failure.id === providerId)?.name ?? providerId;
			const defaultGroup = value.groups.find((group) => group.id === value.default.provider && group.models.some((model) => model.id === value.default.model));
			const defaultModel = defaultGroup?.models.find((model) => model.id === value.default.model);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("settings.models"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: t("settings.models.default"),
							body: defaultGroup?.name ?? providerName(value.default.provider),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: defaultModel?.name ?? t("common.none") })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: t("settings.models.routable"),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.rowMono,
								children: value.routableProviders.map(providerName).join(", ") || t("common.none")
							})
						})]
					}),
					value.groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: group.name,
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.badge,
								children: group.models.length
							})
						}), group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: model.name,
							body: model.description
						}, model.id))]
					}, group.id)),
					value.failures.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, { title: t("settings.models.failures") }), value.failures.map((failure) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: failure.name,
							body: failure.message
						}, failure.id))]
					})
				]
			});
		}
		/** Human-invocable skills visible to the current session. */
		function SkillsSection({ sessionId }) {
			const runtime = useRuntime();
			const t = useT();
			const [query, setQuery] = (0, react.useState)("");
			const skills = useAsync(async () => sessionId === void 0 ? void 0 : await runtime.remote.skills.list({ sessionId }), [runtime, sessionId]);
			const rows = (0, react.useMemo)(() => {
				const list = skills.value?.ok === true ? skills.value.value.skills : [];
				const needle = query.trim().toLowerCase();
				return needle === "" ? list : list.filter((skill) => skill.name.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle));
			}, [skills.value, query]);
			if (sessionId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("composer.needsSession") });
			if (skills.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (skills.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: skills.error });
			if (skills.value?.ok === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: skills.value.error.message });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("settings.skills"),
				body: t("settings.count", { count: rows.length }),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: SettingsSurface_module_css_default.search,
					value: query,
					placeholder: t("common.search"),
					onChange: (event) => {
						setQuery(event.target.value);
					}
				}), rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("composer.noSkills") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: rows.map((skill) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: `/${skill.name}`,
						body: skill.whenToUse ?? skill.description,
						control: skill.modelInvocable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.badge,
							children: "model"
						}) : void 0
					}, skill.name))
				})]
			});
		}
		/** Slash commands registered for the current session. */
		function CommandsSection({ sessionId }) {
			const runtime = useRuntime();
			const t = useT();
			const commands = useAsync(async () => sessionId === void 0 ? void 0 : await runtime.remote.commands.list(sessionId), [runtime, sessionId]);
			if (sessionId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("composer.needsSession") });
			if (commands.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (commands.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: commands.error });
			if (commands.value?.ok === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: commands.value.error.message });
			const rows = commands.value?.ok === true ? commands.value.value : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("settings.commands"),
				body: t("settings.count", { count: rows.length }),
				children: rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: rows.map((command) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: `/${command.name}`,
						body: command.description
					}, command.name))
				})
			});
		}
		/**
		* The Loader's live plugin inventory.
		*
		* MCP servers are Loader entries like any other plugin, so the MCP section is
		* the same inventory filtered by module specifier rather than a second source
		* of truth.
		*/
		function PluginsSection({ mcpOnly }) {
			const runtime = useRuntime();
			const t = useT();
			const inventory = useAsync(async () => await runtime.remote.pluginInventory.list(), [runtime]);
			if (inventory.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (inventory.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: inventory.error });
			if (inventory.value?.ok === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: inventory.value.error.message });
			const entries = inventory.value?.ok === true ? inventory.value.value.entries : [];
			const rows = mcpOnly ? entries.filter((entry) => /mcp/i.test(entry.moduleName)) : entries;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: mcpOnly ? t("settings.mcp") : t("settings.plugins"),
				body: t("settings.count", { count: rows.length }),
				children: rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: rows.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: entry.moduleName,
						body: entry.enabled ? entry.fiberPhase ?? "active" : "disabled",
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.badge,
							children: entry.fiberPhase ?? "—"
						})
					}, entry.entryId))
				})
			});
		}
		/** The Host's current Agent preset roster. */
		function AgentPresetsSection() {
			const runtime = useRuntime();
			const t = useT();
			const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
			if (roster.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (roster.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: roster.error });
			if (roster.value?.ok === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: roster.value.error.message });
			const presets = roster.value?.ok === true ? roster.value.value.presets : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("settings.agentPresets"),
				body: t("settings.agentPresetsBody"),
				children: presets.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: preset.name ?? preset.id,
						body: [preset.description, preset.broken].filter(Boolean).join(" · "),
						control: preset.isDefault ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.badge,
							children: t("settings.models.default")
						}) : void 0
					}, preset.id))
				})
			});
		}
		/** Direct subagents of the current session. */
		function SubagentsSection({ sessionId }) {
			const runtime = useRuntime();
			const t = useT();
			const catalog = useAsync(async (signal) => sessionId === void 0 ? void 0 : await runtime.remote.subagents.list(sessionId, signal), [runtime, sessionId]);
			if (sessionId === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("composer.needsSession") });
			if (catalog.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (catalog.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: catalog.error });
			if (catalog.value?.ok === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: catalog.value.error.message });
			const members = catalog.value?.ok === true ? catalog.value.value.members ?? [] : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("settings.subagents"),
				body: t("settings.count", { count: members.length }),
				children: members.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: members.map((member) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: member.name ?? member.childSessionId,
						body: member.status
					}, member.childSessionId))
				})
			});
		}
		/**
		* Registered settings namespaces, filtered to those a section is about.
		*
		* Editing arbitrary namespaces needs the schema-driven form the classic
		* surface owns; this panel is a live read plus the door to that editor, which
		* is honest about what it does rather than pretending to be a second editor.
		*/
		function NamespaceSection({ title, body, match }) {
			const runtime = useRuntime();
			const t = useT();
			const described = useAsync(async () => await runtime.remote.settings.describe(), [runtime]);
			const namespaces = described.value?.ok === true ? described.value.value.namespaces.filter((view) => match.test(view.ns)) : [];
			const openDocument = (0, react.useCallback)(() => {
				runtime.remote.settings.openSettingsDocument();
			}, [runtime]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title,
				body,
				children: [
					described.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) }) : null,
					described.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: described.error }) : null,
					described.value?.ok === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: described.value.error.message }) : null,
					namespaces.length === 0 && !described.loading && described.error === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.empty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.card,
						children: namespaces.map((view) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: view.ns,
							body: `${t("settings.namespace")} · ${view.applies}`,
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.rowMono,
								children: JSON.stringify(view.value)
							})
						}, view.ns))
					}),
					described.value?.ok === true && described.value.value.hasDocument ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: openDocument,
						children: t("settings.openOfficialSettings")
					}) : null
				]
			});
		}
		/** Token accounting aggregated from the Session list's durable projections. */
		function UsageSection() {
			const t = useT();
			const list = useSessionList();
			const totals = (0, react.useMemo)(() => {
				let turns = 0;
				let tokens = 0;
				let hasStats = false;
				let hasUsage = false;
				for (const id of list.ids) {
					const projections = list.byId[id]?.projectionValues;
					const stats = projections?.sessionStats;
					if (stats !== void 0) {
						hasStats = true;
						turns += stats.turns ?? 0;
					}
					const usage = projections?.tokenUsage;
					if (usage !== void 0) {
						hasUsage = true;
						tokens += (usage.uncachedInputTokens ?? 0) + (usage.outputTokens ?? 0) + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0);
					}
				}
				return {
					turns,
					tokens,
					hasStats,
					hasUsage
				};
			}, [list]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("settings.usage"),
				body: t("settings.usageBody"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SettingsSurface_module_css_default.card,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: t("settings.usageTurns"),
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.rowMono,
							children: totals.hasStats ? totals.turns : "—"
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: t("settings.usageTokens"),
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.rowMono,
							children: totals.hasUsage ? totals.tokens : "—"
						})
					})]
				})
			});
		}
		/** The settings rail and the selected section. */
		function SettingsSurface({ navigation, sessionId }) {
			const t = useT();
			const state = useNavigation(navigation);
			const icons = {
				general: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {}),
				models: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 16 }),
				browser: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, {}),
				computer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, {}),
				memory: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, {}),
				subagents: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, {}),
				plugins: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: 16 }),
				mcp: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 16 }),
				agentPresets: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}),
				skills: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSkillOutline16, {}),
				commands: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16, {}),
				usage: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, {})
			};
			const body = () => {
				switch (state.settingsSection) {
					case "general":
					case "appearance": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GeneralSection, {});
					case "models": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelsSection, {});
					case "skills": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillsSection, { sessionId });
					case "commands": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandsSection, { sessionId });
					case "plugins": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginsSection, { mcpOnly: false });
					case "mcp": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginsSection, { mcpOnly: true });
					case "agentPresets": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AgentPresetsSection, {});
					case "subagents": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SubagentsSection, { sessionId });
					case "usage": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageSection, {});
					case "memory": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NamespaceSection, {
						title: t("settings.memory"),
						body: t("settings.memoryBody"),
						match: /memor|context|compaction/i
					});
					case "browser": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NamespaceSection, {
						title: t("settings.browser"),
						body: t("settings.browserBody"),
						match: /browser|web|vision/i
					});
					case "computer": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(NamespaceSection, {
						title: t("settings.computer"),
						body: t("settings.computerBody"),
						match: /shell|terminal|sandbox|permission/i
					});
					default: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GeneralSection, {});
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SettingsSurface_module_css_default.surface,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
					className: SettingsSurface_module_css_default.rail,
					"aria-label": t("settings.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: SettingsSurface_module_css_default.back,
						onClick: () => {
							navigation.show("session");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {}), t("nav.backToWorkspace")]
					}), RAIL.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.group,
						children: t(group.group)
					}), group.items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${SettingsSurface_module_css_default.item} ${state.settingsSection === item.id ? SettingsSurface_module_css_default.itemActive : ""}`,
						onClick: () => {
							navigation.openSettings(item.id);
						},
						children: [icons[item.id] ?? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFollowsystemOutline16, {}), t(item.label)]
					}, item.id))] }, group.group))]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.body,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.inner,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.title,
							children: t("settings.title")
						}), body()]
					})
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\Workbench.module.css.mjs
		const css$1 = ".NX-gGW_root{background:var(--zx-bg-app);color:var(--zx-label);font-family:var(--zx-font-ui);font-size:var(--zx-text-sm);line-height:var(--zx-leading-tight);padding-top:var(--dsh-desktop-titlebar-height,0px);box-sizing:border-box;grid-template-rows:1fr;grid-template-columns:auto 1fr auto;display:grid;position:absolute;inset:0;overflow:hidden}.NX-gGW_rail{width:var(--zx-rail-width);min-width:var(--zx-rail-width);border-right:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);transition:width var(--zx-motion), min-width var(--zx-motion);flex-direction:column;display:flex;overflow:hidden}.NX-gGW_railCollapsed{border-right-color:#0000;width:0;min-width:0}.NX-gGW_center{flex-direction:column;min-width:0;display:flex;overflow:hidden}.NX-gGW_filler{flex:0 0 0}.NX-gGW_centerBlank .NX-gGW_filler{flex:1 1 0}.NX-gGW_aside{width:var(--zx-aside-width);min-width:var(--zx-aside-width);border-left:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);transition:width var(--zx-motion), min-width var(--zx-motion);flex-direction:column;display:flex;overflow:hidden}.NX-gGW_asideCollapsed{border-left-color:#0000;width:0;min-width:0}.NX-gGW_surface{grid-column:1/-1;min-width:0;display:flex;overflow:hidden}.NX-gGW_scroll{scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;overflow:hidden auto}.NX-gGW_scroll::-webkit-scrollbar{width:10px;height:10px}.NX-gGW_scroll::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.NX-gGW_scroll::-webkit-scrollbar-track{background:0 0}";
		const tagId$1 = "@dsh-portable/dcode-ui/Workbench.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var Workbench_module_css_default = {
			"aside": "NX-gGW_aside",
			"asideCollapsed": "NX-gGW_asideCollapsed",
			"center": "NX-gGW_center",
			"centerBlank": "NX-gGW_centerBlank",
			"filler": "NX-gGW_filler",
			"rail": "NX-gGW_rail",
			"railCollapsed": "NX-gGW_railCollapsed",
			"root": "NX-gGW_root",
			"scroll": "NX-gGW_scroll",
			"surface": "NX-gGW_surface"
		};
		//#endregion
		//#region src/client/shell/Workbench.tsx
		/**
		* The workbench frame.
		*
		* Registered into DSH's built-in `root` slot, so while the modern surface is
		* active it owns the whole page and the official three-column frame stands
		* aside. Everything below reads Host state through {@link useRuntime}; the
		* only state this component owns is which panel is showing.
		* @module @dsh-portable/dcode-ui/client/shell/Workbench
		*/
		/**
		* Resolve the working directory of the current session, which every
		* workspace-scoped panel (git, files) is addressed by.
		* @param sessionId - current session.
		* @returns the absolute directory, or undefined for a session without one.
		*/
		function useCurrentCwd(sessionId) {
			const runtime = useRuntime();
			const { groups } = useWorkspaceGroups();
			return (0, react.useMemo)(() => {
				if (sessionId === void 0) return void 0;
				const summary = runtime.sessions.list.getSnapshot().byId[sessionId];
				if (summary?.cwd !== void 0 && summary.cwd !== "") return summary.cwd;
				return groups.find((group) => group.sessions.some((row) => row.id === sessionId))?.path;
			}, [
				runtime,
				sessionId,
				groups
			]);
		}
		/** The whole modern surface. */
		function Workbench({ navigation }) {
			const runtime = useRuntime();
			const state = useNavigation(navigation);
			const sessionId = useCurrentSessionId();
			const cwd = useCurrentCwd(sessionId);
			const blank = useConversationBlank(sessionId);
			const { scheme } = useAppearance();
			const [browsing, setBrowsing] = (0, react.useState)(false);
			const acrylic = runtime.appearance.material !== "none";
			(0, react.useEffect)(() => {
				if (!acrylic || typeof document === "undefined") return void 0;
				const roots = [document.documentElement, document.body];
				for (const node of roots) node.setAttribute(ACRYLIC_ATTRIBUTE, "");
				return () => {
					for (const node of roots) node.removeAttribute(ACRYLIC_ATTRIBUTE);
				};
			}, [acrylic]);
			const newTask = (0, react.useCallback)(() => {
				navigation.show("session");
				runtime.navigation?.startSession();
			}, [navigation, runtime]);
			const adoptWorkspace = (0, react.useCallback)(async (path) => {
				const nav = runtime.navigation;
				if (nav === void 0) return;
				const workspace = await runtime.workspaces.create({ path });
				navigation.show("session");
				nav.startSession(workspace.workspaceId);
			}, [navigation, runtime]);
			const openWorkspace = (0, react.useCallback)(() => {
				const nav = runtime.navigation;
				if (nav === void 0) return;
				nav.pickDirectory().then(async (path) => {
					if (path === null) return;
					await adoptWorkspace(path);
				}).catch(() => {
					setBrowsing(true);
				});
			}, [runtime, adoptWorkspace]);
			(0, react.useEffect)(() => {
				const onKeyDown = (event) => {
					const meta = event.metaKey || event.ctrlKey;
					if (meta && event.key.toLowerCase() === "k") {
						event.preventDefault();
						navigation.togglePalette();
						return;
					}
					if (meta && event.key.toLowerCase() === "n") {
						event.preventDefault();
						newTask();
						return;
					}
					if (meta && event.key.toLowerCase() === "o") {
						event.preventDefault();
						openWorkspace();
						return;
					}
					if (meta && event.key.toLowerCase() === "b") {
						event.preventDefault();
						navigation.toggleRail();
						return;
					}
					if (event.key === "Escape") {
						if (navigation.getSnapshot().paletteOpen) navigation.togglePalette(false);
						else if (navigation.getSnapshot().diff !== void 0) navigation.closeDiff();
					}
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [
				navigation,
				newTask,
				openWorkspace
			]);
			const fullSurface = state.view !== "session";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Workbench_module_css_default.root,
				...dcodeScope,
				"data-dcode-scheme": scheme,
				...acrylic ? { [ACRYLIC_ATTRIBUTE]: "" } : {},
				children: [
					fullSurface ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Workbench_module_css_default.surface,
						children: state.view === "learning" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningHome, {
							navigation,
							cwd,
							sessionId
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsSurface, {
							navigation,
							sessionId
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${Workbench_module_css_default.rail} ${state.railOpen ? "" : Workbench_module_css_default.railCollapsed}`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LeftRail, {
								navigation,
								onNewTask: newTask
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${Workbench_module_css_default.center} ${blank ? Workbench_module_css_default.centerBlank : ""}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TopBar, {
									navigation,
									sessionId,
									cwd
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Transcript, {
									navigation,
									sessionId,
									cwd,
									blank
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Composer, {
									sessionId,
									blank,
									cwd,
									onOpenWorkspace: openWorkspace
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: Workbench_module_css_default.filler,
									"aria-hidden": true
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${Workbench_module_css_default.aside} ${state.asideOpen ? "" : Workbench_module_css_default.asideCollapsed}`,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Aside, {
								navigation,
								sessionId,
								cwd
							})
						})
					] }),
					state.paletteOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandPalette, {
						navigation,
						onNewTask: newTask,
						onOpenWorkspace: openWorkspace
					}) : null,
					browsing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DirectoryPicker, {
						onPicked: (path) => {
							setBrowsing(false);
							adoptWorkspace(path);
						},
						onCancel: () => {
							setBrowsing(false);
						}
					}) : null
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\settings\InterfaceSettingsSection.module.css.mjs
		const css = ".UwQPva_root{flex-direction:column;gap:12px;padding:4px 0;display:flex}.UwQPva_title{color:var(--dsw-alias-label-primary,inherit);font-size:14px}.UwQPva_lead{color:var(--dsw-alias-label-secondary,#7a7f8a);font-size:13px;line-height:1.6}.UwQPva_choice{flex-wrap:wrap;gap:10px;display:flex}.UwQPva_option{border:1px solid var(--dsw-alias-border-l2,#8080803d);background:var(--dsw-alias-bg-layer-1,transparent);color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:10px;flex-direction:column;flex:240px;gap:4px;padding:12px 14px;display:flex}.UwQPva_option:hover{border-color:var(--dsw-alias-border-l1,#80808066)}.UwQPva_optionActive{border-color:var(--dsw-alias-brand-primary,#4c8dff)}.UwQPva_optionTitle{color:var(--dsw-alias-label-primary,inherit);font-size:14px}.UwQPva_optionBody{color:var(--dsw-alias-label-secondary,#7a7f8a);font-size:12px;line-height:1.55}.UwQPva_badge{background:color-mix(in srgb, var(--dsw-alias-brand-primary,#4c8dff) 18%, transparent);color:var(--dsw-alias-brand-primary,#4c8dff);border-radius:999px;align-self:flex-start;padding:1px 7px;font-size:11px}";
		const tagId = "@dsh-portable/dcode-ui/InterfaceSettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var InterfaceSettingsSection_module_css_default = {
			"badge": "UwQPva_badge",
			"choice": "UwQPva_choice",
			"lead": "UwQPva_lead",
			"option": "UwQPva_option",
			"optionActive": "UwQPva_optionActive",
			"optionBody": "UwQPva_optionBody",
			"optionTitle": "UwQPva_optionTitle",
			"root": "UwQPva_root",
			"title": "UwQPva_title"
		};
		//#endregion
		//#region src/client/settings/InterfaceSettingsSection.tsx
		/**
		* The front-end switch inside the classic General settings page.
		*
		* The requirement is symmetric: both surfaces must be able to reach the
		* other. The modern workbench has its own Interface section; this is its
		* counterpart, registered into the official General settings page so an operator who
		* switched to the classic UI is never stranded there.
		*
		* It renders inside the official shell, so it takes the slot framework's
		* standard locale prop and the Host's theme aliases rather than the
		* workbench's own token scope.
		* @module @dsh-portable/dcode-ui/client/settings/InterfaceSettingsSection
		*/
		/** The two-option front-end switch. */
		function InterfaceSettingsSection({ mode, t }) {
			const active = (0, react.useSyncExternalStore)(mode.subscribe, mode.get, mode.get);
			const copy = (key) => t?.(key) ?? en[key];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: InterfaceSettingsSection_module_css_default.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: InterfaceSettingsSection_module_css_default.title,
						children: copy("settings.interface")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: InterfaceSettingsSection_module_css_default.lead,
						children: copy("settings.interfaceBody")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: InterfaceSettingsSection_module_css_default.choice,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${InterfaceSettingsSection_module_css_default.option} ${active === "official" ? InterfaceSettingsSection_module_css_default.optionActive : ""}`,
							onClick: () => {
								mode.set("official");
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.optionTitle,
									children: copy("settings.modeOfficial")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.optionBody,
									children: copy("settings.modeOfficialBody")
								}),
								active === "official" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.badge,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {})
								}) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${InterfaceSettingsSection_module_css_default.option} ${active === "dcode" ? InterfaceSettingsSection_module_css_default.optionActive : ""}`,
							onClick: () => {
								mode.set("dcode");
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.optionTitle,
									children: copy("settings.modeWorkbench")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.optionBody,
									children: copy("settings.modeWorkbenchBody")
								}),
								active === "dcode" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: InterfaceSettingsSection_module_css_default.badge,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {})
								}) : null
							]
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Browser entry for the modern workbench.
		*
		* The whole switch mechanism is here, and it is small on purpose. DSH's shell
		* renders exactly one ctx-level slot, `root`, and `ui-layout` occupies it with
		* the official three-column frame. A second registration at a lower priority
		* shadows that frame, so:
		*
		* - selecting the modern surface registers {@link Workbench} into `root`;
		* - selecting the classic surface disposes that registration and the official
		*   AppFrame renders again, untouched.
		*
		* Both directions are a slot mutation inside the live page. The DSH Runtime,
		* the Host connection, the Session list, every open Conversation and all
		* Workspace state are shared by construction — neither surface owns a copy —
		* so switching costs a React remount and nothing else.
		*
		* The classic surface additionally receives a General settings item
		* registered here, so the switch is reachable from inside the official UI as
		* well.
		* @module @dsh-portable/dcode-ui/client
		*/
		/** Stable Cordis plugin name. */
		const name = "dcode-ui-client";
		/**
		* Services the workbench cannot render without.
		*
		* Every generated Remote namespace it reads is declared individually: cordis
		* refuses `ctx.remote.<ns>` from a context that did not inject that namespace,
		* so an omission here is a runtime throw inside whichever panel touches it,
		* not a compile error.
		*
		* `uiWorkspace`, `theme` and `connection` are deliberately absent: each drives
		* one optional surface and is probed at runtime, so a trimmed assembly still
		* boots this plugin with that surface disabled rather than leaving the page
		* frameless.
		*/
		const inject = [
			"slots",
			"locale",
			"settingsScope",
			"sessions",
			"workspaces",
			"uiConversation",
			"remote",
			"remote.session",
			"remote.commands",
			"remote.skills",
			"remote.settings",
			"remote.pluginInventory",
			"remote.subagents",
			"remote.agentPresets",
			"remote.fileReferences"
		];
		/**
		* Shadow priority of the workbench's `root` registration.
		*
		* Lowest renders. The official AppFrame registers at the default 0, so any
		* negative value wins; a wide margin leaves room for a future surface to sit
		* between the two without renumbering this one.
		*/
		const ROOT_PRIORITY = -1e3;
		/** Order of the interface item in the classic General settings page. */
		const SETTINGS_GENERAL_ITEM_ORDER = 30;
		/**
		* Register the workbench root, and re-register it whenever the mode changes.
		* @param ctx - client root context.
		* @param mode - the page's mode store.
		* @returns a disposer that removes any active registration and the subscription.
		*/
		function bindRootRegistration(ctx, mode) {
			const navigation = createNavigationStore();
			const runtime = createDcodeRuntime(ctx, mode);
			const t = bindTranslate(ctx.locale.bind(DCODE_NS));
			const render = () => (0, react.createElement)(DcodeRuntimeProvider, { value: runtime }, (0, react.createElement)(TranslateProvider, { value: t }, (0, react.createElement)(Workbench, { navigation })));
			let active;
			const apply = () => {
				const wanted = mode.get() === "dcode";
				if (wanted === (active !== void 0)) return;
				if (!wanted) {
					active?.();
					active = void 0;
					return;
				}
				active = ctx.slots.inject("root", () => ctx.slots.register({
					name: "root",
					priority: ROOT_PRIORITY,
					locale: DCODE_NS
				}, render));
			};
			apply();
			const unsubscribe = mode.subscribe(apply);
			return () => {
				unsubscribe();
				active?.();
				active = void 0;
			};
		}
		/**
		* Client plugin body.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(DCODE_NS, {
				zh,
				en
			}), "dcode-ui: dictionaries");
			const mode = createUiModeStore();
			ctx.effect(() => () => {
				mode.dispose();
			}, "dcode-ui: mode store");
			ctx.effect(() => bindRootRegistration(ctx, mode), "dcode-ui: root surface");
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "dcode-interface",
				order: SETTINGS_GENERAL_ITEM_ORDER,
				locale: DCODE_NS,
				inject: () => ({ mode })
			}, InterfaceSettingsSection));
		}
		//#endregion
		exports.DCODE_NS = DCODE_NS;
		exports.Workbench = Workbench;
		exports.apply = apply;
		exports.changedPaths = changedPaths;
		exports.createDcodeRuntime = createDcodeRuntime;
		exports.createNavigationStore = createNavigationStore;
		exports.createUiModeStore = createUiModeStore;
		exports.fuzzyMatch = fuzzyMatch;
		exports.hasAnsi = hasAnsi;
		exports.inject = inject;
		exports.isApplePlatform = isApplePlatform;
		exports.name = name;
		exports.parseAnsi = parseAnsi;
		exports.parsePatch = parsePatch;
		exports.readBridge = readBridge;
		exports.splitTurns = splitTurns;
		exports.stripAnsi = stripAnsi;
		exports.summarizeTool = summarizeTool;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map