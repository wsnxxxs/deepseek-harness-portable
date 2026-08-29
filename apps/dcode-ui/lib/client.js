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
		let react_dom = require("react-dom");
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
		//#region src/client/state/layout.ts
		/**
		* Width classes the workbench frame lays itself out against.
		*
		* The frame has three panels competing for one row — the session rail, the
		* conversation column and the floating details card — and which of them fit
		* is a question about the frame's own width, not the viewport's: the surface
		* is mounted into a host slot, and on the desktop shell that slot is the
		* window, but nothing in this package may assume it.
		*
		* So the class is resolved from a measured element, and everything that
		* branches on it — the panel fit below, the drawer treatment in the frame's
		* stylesheet, the top bar's condensed chrome — reads the one class rather
		* than repeating a breakpoint of its own.
		* @module @dsh-portable/dcode-ui/client/state/layout
		*/
		/**
		* Inclusive lower bound of each class, in CSS pixels of the frame's width.
		*
		* `medium` is the width at which the rail can dock without squeezing the
		* conversation below a readable column; `wide` is the width at which the
		* details card also fits beside it, in the gutter the reading measure leaves
		* rather than on top of the text.
		*/
		const LAYOUT_BREAKPOINTS = {
			medium: 900,
			wide: 1400
		};
		/** Fallback class for a frame that has not been measured yet. */
		const UNMEASURED = "medium";
		/**
		* Classify a frame width.
		* @param width - the frame's width in CSS pixels.
		* @returns the class that width falls in; a non-finite or absent measurement
		* falls back to the middle class rather than collapsing the panels.
		*/
		function resolveLayoutSize(width) {
			if (!Number.isFinite(width) || width <= 0) return UNMEASURED;
			if (width >= LAYOUT_BREAKPOINTS.wide) return "wide";
			if (width >= LAYOUT_BREAKPOINTS.medium) return "medium";
			return "compact";
		}
		/**
		* What each class opens on its own.
		*
		* Compact hands the whole frame to the conversation and leaves both panels to
		* be summoned; medium docks the rail; wide adds the details card. These are
		* defaults, not rules — the operator's own toggles win until the class
		* changes underneath them.
		*/
		const LAYOUT_FIT = {
			compact: {
				railOpen: false,
				asideOpen: false
			},
			medium: {
				railOpen: true,
				asideOpen: false
			},
			wide: {
				railOpen: true,
				asideOpen: true
			}
		};
		/**
		* Re-fit the panels when the frame crosses into another width class.
		*
		* Width decides until the operator does: a panel they have not touched at
		* this width follows the class default, and one they have toggled keeps the
		* value they gave it. Compact is the exception — under {@link
		* LAYOUT_BREAKPOINTS}.medium there is no room to hold a panel open over the
		* conversation, so entering it closes both and forgets the pins, which is
		* also what makes widening back out restore the defaults.
		* @param size - the class the frame has just entered.
		* @param current - the panels as they stand.
		* @returns the panels as the new class wants them.
		*/
		function fitPanels(size, current) {
			if (size === "compact") return {
				railOpen: false,
				asideOpen: false,
				railPinned: false,
				asidePinned: false
			};
			const fit = LAYOUT_FIT[size];
			return {
				railOpen: current.railPinned ? current.railOpen : fit.railOpen,
				asideOpen: current.asidePinned ? current.asideOpen : fit.asideOpen,
				railPinned: current.railPinned,
				asidePinned: current.asidePinned
			};
		}
		/**
		* The class to start in before the frame has been measured.
		* @returns the class the window suggests, or the unmeasured fallback off-DOM.
		*/
		function initialLayoutSize() {
			if (typeof window === "undefined") return UNMEASURED;
			return resolveLayoutSize(window.innerWidth);
		}
		/**
		* Width of an element as the observer reported it.
		* @param entry - one resize record.
		* @returns the border-box inline size, falling back to the content rect on an
		* engine that does not report box sizes.
		*/
		function inlineSizeOf(entry) {
			return (Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : void 0)?.inlineSize ?? entry.contentRect.width;
		}
		/**
		* Track the width class of one element.
		*
		* Observing the element rather than listening for window resizes is what
		* makes the surface adapt to a pane that changes width without the window
		* doing so — a devtools split, a host sidebar, a zoom change. The observer
		* delivers an initial record on subscribe, so the first class is measured
		* rather than assumed.
		* @param node - the frame element, or null before it mounts.
		* @returns the current class.
		*/
		function useLayoutSize(node) {
			const [size, setSize] = (0, react.useState)(initialLayoutSize);
			(0, react.useEffect)(() => {
				if (node === null) return void 0;
				if (typeof ResizeObserver === "undefined") {
					const onResize = () => {
						setSize(resolveLayoutSize(node.clientWidth || window.innerWidth));
					};
					onResize();
					window.addEventListener("resize", onResize);
					return () => {
						window.removeEventListener("resize", onResize);
					};
				}
				const observer = new ResizeObserver((entries) => {
					const entry = entries[entries.length - 1];
					if (entry !== void 0) setSize(resolveLayoutSize(inlineSizeOf(entry)));
				});
				observer.observe(node);
				return () => {
					observer.disconnect();
				};
			}, [node]);
			return size;
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
		const INITIAL_LAYOUT = initialLayoutSize();
		const INITIAL = {
			view: "session",
			aside: "changes",
			asideOpen: LAYOUT_FIT[INITIAL_LAYOUT].asideOpen,
			summaryOpen: false,
			railOpen: LAYOUT_FIT[INITIAL_LAYOUT].railOpen,
			paletteOpen: false,
			layout: INITIAL_LAYOUT,
			railPinned: false,
			asidePinned: false,
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
			/**
			* Record that a panel was moved by hand, where that says anything.
			* @param key - the pin to set.
			* @returns the patch fragment, empty while the frame is compact.
			*/
			const pin = (key) => state.layout === "compact" ? {} : { [key]: true };
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
						paletteOpen: false,
						...state.layout === "compact" ? { railOpen: false } : {}
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
						asideOpen: true,
						summaryOpen: false,
						...pin("asidePinned")
					});
				},
				openDiff: (path, staged = false) => {
					patch({
						diff: {
							path,
							staged
						},
						aside: "changes",
						asideOpen: true,
						...pin("asidePinned")
					});
				},
				closeDiff: () => {
					patch({ diff: void 0 });
				},
				inspect: (callId) => {
					patch({
						inspectedCallId: callId,
						aside: "details",
						asideOpen: true,
						...pin("asidePinned")
					});
				},
				togglePalette: (open) => {
					patch({ paletteOpen: open ?? !state.paletteOpen });
				},
				toggleRail: () => {
					patch({
						railOpen: !state.railOpen,
						...pin("railPinned")
					});
				},
				closeRail: () => {
					patch({
						railOpen: false,
						...pin("railPinned")
					});
				},
				toggleAside: () => {
					patch({
						asideOpen: !state.asideOpen,
						...pin("asidePinned")
					});
				},
				toggleSummary: (open) => {
					patch({ summaryOpen: open ?? !state.summaryOpen });
				},
				fit: (size) => {
					if (state.layout === size) return;
					patch({
						layout: size,
						...fitPanels(size, state)
					});
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
		/** Stable empty value used before the optional Trajectory target is available. */
		const EMPTY_TRAJECTORY_SNAPSHOT = {
			eventNodes: [],
			eventLocations: /* @__PURE__ */ new Map(),
			requests: [],
			callSchemas: /* @__PURE__ */ new Map(),
			partial: null,
			runningCalls: []
		};
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
			const conversation = ctx.get("conversation");
			const carrier = ctx.get("connection");
			const navigation = ctx.get("uiWorkspace");
			const theme = ctx.get("theme");
			const locale = ctx.get("locale");
			const uiSession = ctx.get("uiSession");
			const settingsScope = ctx.get("settingsScope");
			const settingsSchema = ctx.get("settingsSchema");
			const sessionLogDownload = ctx.get("sessionLogDownload");
			const conversationSettings = settingsScope?.bind({ namespace: "ui-conversation" });
			const fallbackLocale = {
				active: "en",
				locales: [],
				revision: 0
			};
			const feeds = /* @__PURE__ */ new Map();
			const trajectoryFeeds = /* @__PURE__ */ new Map();
			return {
				sessions,
				workspaces,
				navigation,
				remote: ctx.remote,
				settings: {
					scope: settingsScope,
					schema: settingsSchema,
					describe: settingsScope?.describe?.()
				},
				conversation,
				input: (sessionId) => {
					const actx = sessions.scope(sessionId);
					if (actx === void 0 || conversation === void 0) return void 0;
					return conversation.input.for(actx);
				},
				media: uiConversation === void 0 ? void 0 : {
					imageUrl: (sessionId, attachment) => uiConversation.imageUrl(sessionId, attachment),
					peekImageUrl: (sessionId, attachment) => uiConversation.peekImageUrl(sessionId, attachment),
					downloadFile: (sessionId, attachment) => uiConversation.downloadFile(sessionId, attachment)
				},
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
				pendingInteractions: uiSession?.pendingInteractions,
				sessionLogDownload,
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
				},
				trajectoryFeed: (sessionId) => {
					const cached = trajectoryFeeds.get(sessionId);
					if (cached !== void 0) return cached;
					if (uiConversation === void 0) return void 0;
					const binding = sessions.binding(sessionId);
					if (binding === void 0) return void 0;
					const target = uiConversation.binding(binding).target("trajectory");
					const feed = {
						getSnapshot: () => target.getSnapshot() ?? EMPTY_TRAJECTORY_SNAPSHOT,
						subscribe: (listener) => target.subscribe(listener)
					};
					trajectoryFeeds.set(sessionId, feed);
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
			"workspace.actions": "Project folder actions",
			"workspace.select": "Select workspace",
			"workspace.newTask": "New task in this project folder",
			"workspace.rename": "Rename project folder",
			"workspace.renameTitle": "Rename project folder",
			"workspace.name": "Project folder name",
			"workspace.remove": "Remove project folder",
			"workspace.removeTitle": "Remove this project folder?",
			"workspace.removeBody": "This removes “{name}” from the sidebar. Its files and conversations will be kept and its conversations will appear under Other sessions.",
			"workspace.removePending": "Removing project folder…",
			"nav.collapse": "Collapse sidebar",
			"nav.dismissPanels": "Close the open panel",
			"nav.expand": "Expand sidebar",
			"nav.resize": "Resize sidebar",
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
			"top.workspaceMenu": "Select workspace",
			"top.layout": "Layout",
			"top.share": "Export",
			"top.shareTooltip": "Session log",
			"top.sharePreparing": "Preparing…",
			"top.shareStarted": "Download started",
			"top.shareFailed": "Export failed",
			"top.toggleAside": "Toggle details panel",
			"top.togglePreview": "Show or hide the preview sidebar",
			"top.toggleSummary": "Show or hide the environment summary",
			"top.moreActions": "More actions",
			"top.officialUi": "Switch to the official interface",
			"aside.title": "Preview panel",
			"aside.close": "Close the preview panel",
			"summary.title": "Environment info",
			"summary.close": "Close the summary",
			"summary.local": "Local",
			"summary.openChanges": "Open the changes panel",
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
			"chat.editQueued": "Edit queued message",
			"chat.editQueuedUnsupported": "This queued item cannot be edited.",
			"chat.saveQueued": "Save queued message",
			"chat.cancelQueuedEdit": "Cancel edit",
			"chat.removeQueued": "Remove queued message",
			"chat.steerQueued": "Send queued message now",
			"chat.steerQueuedUnavailable": "Steering is available while the task is running.",
			"chat.tokens": "{count} tokens",
			"chat.wrap": "Wrap",
			"chat.outputTruncated": "… output truncated",
			"chat.transcript": "Conversation transcript",
			"chat.message.copy": "Copy answer",
			"chat.message.copied": "Answer copied",
			"chat.message.branch": "Branch from this answer",
			"chat.message.branching": "Creating branch…",
			"chat.message.branchFailed": "Could not create branch: {error}",
			"chat.feedback.positive": "Helpful answer",
			"chat.feedback.negative": "Unhelpful answer",
			"chat.feedback.failed": "Could not save feedback: {error}",
			"chat.turnNavigation.label": "Conversation turns",
			"chat.turnNavigation.turn": "Go to turn {count}",
			"chat.image.open": "Open image",
			"chat.image.close": "Close image",
			"context.aria": "{percent} of context used",
			"context.used": "Context used",
			"context.system": "System",
			"context.tools": "Tools",
			"context.messages": "Messages",
			"context.tokens": "~{used} / {total}",
			"composer.dropFiles": "Drop files to attach",
			"composer.dropFilesHint": "Release to add files to this message",
			"composer.pasteAttachment": "Attachment added from clipboard",
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
			"plan.title": "Plan",
			"plan.progress": "{done}/{total}",
			"trace.title": "Trace",
			"trace.stats": "{events} events · {requests} requests",
			"trace.runningCount": "{count} running",
			"trace.user": "User message",
			"trace.assistant": "Assistant",
			"trace.tool": "Tool call",
			"trace.command": "Command",
			"trace.context": "Context",
			"trace.retry": "Model retry",
			"trace.error": "Turn error",
			"trace.limit": "Output limit",
			"trace.compaction": "Context compacted",
			"trace.steering": "Steering message",
			"trace.unknown": "Unknown event",
			"trace.done": "done",
			"trace.failed": "failed",
			"trace.active": "running",
			"trace.inspect": "Inspect this trace item",
			"question.title": "Question",
			"question.cancel": "Cancel questions",
			"question.previous": "Previous question",
			"question.next": "Next question",
			"question.recommended": "Recommended",
			"question.custom": "Type your answer",
			"question.skip": "Skip",
			"question.continue": "Continue",
			"question.submit": "Submit",
			"question.submitting": "Sending…",
			"question.errorIncomplete": "Please complete the remaining questions.",
			"question.errorUnanswered": "Choose an option or enter an answer first.",
			"question.planReview": "Plan review",
			"question.discuss": "Chat about it",
			"question.decline": "Refuse",
			"question.approve": "Approve",
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
			"composer.attachments": "Attachments",
			"composer.addAttachment": "Add attachment",
			"composer.removeAttachment": "Remove attachment",
			"composer.attachmentFile": "File",
			"composer.attachmentsBusy": "Attachments cannot be changed while the current send is being prepared.",
			"composer.attachmentsUnavailable": "Attachments are unavailable in this session.",
			"palette.placeholder": "Search actions, tasks or files",
			"palette.all": "All",
			"palette.actions": "Actions",
			"palette.tasks": "Tasks",
			"palette.files": "Files",
			"palette.suggested": "Suggested",
			"palette.panels": "Panels",
			"palette.configuration": "Configuration",
			"palette.empty": "No matches",
			"palette.filter": "Filter results",
			"palette.results": "Command palette results",
			"directory.contents": "Directory contents",
			"directory.empty": "This directory is empty.",
			"directory.open": "Open",
			"learning.title": "Learning",
			"learning.subtitle": "Concepts, materials and notes, backed by the same learning engine the official interface uses.",
			"learning.concept": "Learn a concept",
			"learning.conceptBody": "Start a guided session on one idea, with checkpoints and recall cards.",
			"learning.problem": "Work through a problem",
			"learning.problemBody": "Bring a question and work toward the answer with guidance.",
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
			"learning.loading": "Loading learning content…",
			"learning.error": "Learning content could not be loaded: {error}",
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
			"settings.agentPresetsDefault": "Default preset for new tasks",
			"settings.agentPresetsDefaultBody": "Running tasks keep the preset they started with.",
			"settings.agentPresets.view": "View",
			"settings.agentPresets.copy": "Copy",
			"settings.agentPresets.copyTitle": "Copy agent preset",
			"settings.agentPresets.copyBody": "Create a writable copy, then edit its composition in the preset folder.",
			"settings.agentPresets.id": "Preset ID",
			"settings.agentPresets.idInvalid": "Use lowercase letters, numbers, and hyphens only.",
			"settings.agentPresets.idTaken": "That preset ID is already in use.",
			"settings.agentPresets.name": "Display name",
			"settings.agentPresets.namePlaceholder": "Optional display name",
			"settings.agentPresets.openLocation": "Open folder",
			"settings.agentPresets.showLocation": "Show folder path",
			"settings.agentPresets.delete": "Delete",
			"settings.agentPresets.deleteTitle": "Delete agent preset?",
			"settings.agentPresets.deleteBody": "This removes the user-authored preset folder. Running tasks are not affected.",
			"settings.pluginsBody": "Configure the built-in capabilities and inspect the current Loader inventory.",
			"settings.plugins.mcpBody": "MCP entries are shown from the live Loader inventory.",
			"settings.plugins.tabs": "Plugin views",
			"settings.plugins.configTab": "Configuration",
			"settings.plugins.inventoryTab": "Installed",
			"settings.plugins.emptyConfig": "No configurable plugin settings are available in this deployment.",
			"settings.plugins.emptyInventory": "No matching plugins are installed.",
			"settings.plugins.search": "Search plugins",
			"settings.plugins.inventoryTitle": "Installed plugins",
			"settings.plugins.enabled": "Enabled",
			"settings.plugins.disabled": "Disabled",
			"settings.plugins.unobserved": "Not mounted",
			"settings.plugins.credentialWarning": "Credential status unavailable",
			"settings.plugins.keyConfigured": "A key is configured. Leave blank to keep it.",
			"settings.plugins.keyConfiguredHint": "Stored securely · enter a new key to replace it",
			"settings.plugins.keyPlaceholder": "Enter an API key",
			"settings.plugins.defaultValue": "Use the default",
			"settings.plugins.reset": "Reset",
			"settings.plugins.discard": "Discard",
			"settings.plugins.save": "Save",
			"settings.plugins.saving": "Saving…",
			"settings.plugins.invalidNumber": "Enter a valid number or leave blank to reset it.",
			"settings.plugins.visionTitle": "Vision Bridge",
			"settings.plugins.visionDescription": "Route image turns through native input or a configured vision model.",
			"settings.plugins.visionSharedProvider": "Image turns reuse the attachment and model configuration above; this plugin stores no separate API key or endpoint.",
			"settings.plugins.visionEnabled": "Enable Vision Bridge",
			"settings.plugins.visionEnabledHint": "Text-only turns keep the selected model; image turns use native input or the fallback vision route.",
			"settings.plugins.visionModel": "Pinned vision model (optional)",
			"settings.plugins.visionModelPlaceholder": "Leave empty to choose automatically",
			"settings.plugins.visionModelHint": "Use provider/model when duplicate model IDs need to be disambiguated.",
			"settings.plugins.visionUseAutomatic": "Use automatic model",
			"settings.plugins.visionRouteAutomatic": "Automatic vision model",
			"settings.plugins.visionRouteAutomaticHint": "The first image-capable model in the active catalog will be used.",
			"settings.plugins.visionRoutePinned": "Pinned vision model",
			"settings.plugins.visionRouteDisabled": "Vision Bridge disabled",
			"settings.plugins.shellTitle": "Shell",
			"settings.plugins.shellDescription": "Limits every command the agent runs.",
			"settings.plugins.shellTimeout": "Command timeout (ms)",
			"settings.plugins.shellTimeoutHint": "How long a command may run before it is terminated.",
			"settings.plugins.shellOutput": "Output cap per stream (bytes)",
			"settings.plugins.shellOutputHint": "Output beyond this limit is redirected and retained.",
			"settings.plugins.agentLoopTitle": "Agent loop",
			"settings.plugins.agentLoopDescription": "Controls how tool calls are dispatched.",
			"settings.plugins.agentLoopParallel": "Parallel tool calls",
			"settings.plugins.agentLoopParallelHint": "Maximum number of safe calls in flight during one step.",
			"settings.plugins.webSearchTitle": "Web search",
			"settings.plugins.webSearchDescription": "The DeepSeek search provider used by the agent.",
			"settings.plugins.webSearchApiKey": "API key",
			"settings.plugins.webSearchApiKeyHint": "Stored outside the settings document. Leave blank to keep the current key.",
			"settings.plugins.webSearchBaseUrl": "Endpoint",
			"settings.plugins.webSearchBaseUrlHint": "Leave blank to use the provider default.",
			"settings.plugins.webSearchMaxUses": "Max searches per request",
			"settings.plugins.webSearchMaxUsesHint": "How many searches one request may perform before answering.",
			"settings.plugins.subagentModelSelectionTitle": "Subagent model selection",
			"settings.plugins.subagentModelSelectionDescription": "Control which models agents may choose for subagents.",
			"settings.plugins.subagentModelSelectionToggle": "Allow agents to choose subagent models",
			"settings.plugins.subagentModelSelectionChoose": "Agents can choose from the authorized models below for new subagents when this setting is enabled.",
			"settings.plugins.subagentModelSelectionOff": "Subagents use configured defaults or inherit the parent agent model.",
			"settings.plugins.subagentModelSelectionAllowed": "Authorized models",
			"settings.plugins.subagentModelSelectionEmpty": "No model provider currently advertises a model.",
			"settings.plugins.subagentModelSelectionLoadFailed": "The model catalog is temporarily unavailable.",
			"settings.plugins.subagentModelSelectionRequired": "Select at least one model before enabling this setting.",
			"settings.modelsBody": "Configure credentials and provider endpoints used by new requests.",
			"settings.openOfficialSettings": "Open the full settings surface",
			"settings.openOfficialSettingsBody": "Sections this panel does not cover are available in the official interface.",
			"settings.skillsEmpty": "No skills are available in this session.",
			"settings.loading": "Loading…",
			"settings.count": "{count} entries",
			"settings.namespace": "Namespace",
			"settings.provider": "Provider",
			"settings.models.default": "Default model",
			"settings.models.routable": "Routable providers",
			"settings.models.failures": "Providers that failed to load",
			"settings.models.apiKey": "API key",
			"settings.models.keyConfigured": "API key configured",
			"settings.models.keyMissing": "API key missing",
			"settings.models.notConfigured": "Not configured",
			"settings.models.keyNotRequired": "API key not required",
			"settings.models.keyConfiguredHint": "Stored securely · enter a new key to replace it",
			"settings.models.keyPlaceholder": "Enter an API key",
			"settings.models.baseURL": "Base URL",
			"settings.models.baseURLPlaceholder": "https://api.example.com",
			"settings.models.inactive": "not active",
			"settings.models.credentialWarning": "Credential status unavailable",
			"settings.memoryBody": "Long-term workspace memory is configured through the settings document.",
			"settings.browserBody": "Browser control is provided by skills and plugins in this installation.",
			"settings.computerBody": "Computer control is provided by skills and plugins in this installation.",
			"settings.modelUsage": "Model usage",
			"settings.modelUsageBody": "Usage is aggregated from the same durable task records as the DCode usage view. This page does not estimate account balance.",
			"settings.usageBody": "Token usage is aggregated from each task's durable record, with input, output and cache traffic shown separately.",
			"settings.usageTotal": "Total tokens",
			"settings.usageScope": "Across {sessions} tasks · {usageSessions} with recorded usage",
			"settings.usageInput": "Input tokens",
			"settings.usageOutput": "Output tokens",
			"settings.usageCacheRead": "Cache read",
			"settings.usageCacheWrite": "Cache write",
			"settings.usageCacheHit": "Cache hit rate",
			"settings.usageSessions": "Tracked tasks",
			"settings.usageSteps": "Recorded steps",
			"settings.usageEmpty": "No token usage has been recorded yet.",
			"settings.usageLoading": "Loading token usage…",
			"settings.usageError": "Could not load token usage.",
			"settings.commandsEmpty": "No commands are available.",
			"settings.inventoryEmpty": "No installed plugins are available.",
			"settings.presetsEmpty": "No Agent presets are available.",
			"settings.subagentsEmpty": "No subagent configurations are available.",
			"settings.namespaceEmpty": "This namespace has no configurable fields.",
			"settings.usageTurns": "Recorded turns",
			"settings.usageTokens": "Total tokens",
			"plugins.title": "Plugins",
			"plugins.subtitle": "Browse the community marketplace, manage what this profile has installed, and tune the built-in plugin settings.",
			"plugins.section.market": "Marketplace",
			"plugins.section.installed": "Installed",
			"plugins.section.settings": "Configuration",
			"plugins.group.manage": "Manage",
			"plugins.unavailable": "The plugin marketplace is not running in this profile.",
			"plugins.unavailableBody": "It ships with the portable distribution and is seeded into the web profile on first start. Reinstall or re-enable it, then restart the harness.",
			"plugins.search": "Search names, descriptions and languages",
			"plugins.refresh": "Refresh",
			"plugins.syncing": "Syncing…",
			"plugins.syncedAt": "Synced {time}",
			"plugins.neverSynced": "Never synced",
			"plugins.shownOfTotal": "{shown} of {total}",
			"plugins.source": "Synced live from the GitHub dsh-plugin topic. Every install comes from the repository its card names.",
			"plugins.sourceLink": "Open the topic",
			"plugins.loadMore": "Load more",
			"plugins.loading": "Loading…",
			"plugins.syncFailed": "Sync failed: {error}",
			"plugins.emptyMarket": "The marketplace returned no plugins.",
			"plugins.emptySearch": "No plugin matches “{query}”.",
			"plugins.stars": "{count} stars",
			"plugins.openRepository": "Open repository",
			"plugins.translate": "Translate description",
			"plugins.translating": "Translating…",
			"plugins.translateTitle": "Description · {name}",
			"plugins.translateOriginal": "Original",
			"plugins.translateFailed": "Translation failed: {error}",
			"plugins.translateEmpty": "No translation came back.",
			"plugins.reviewed": "Reviewed by Portable",
			"plugins.unreviewed": "Not verified by Portable",
			"plugins.reviewOpen": "Installation details",
			"plugins.review.contract": "DSH contract",
			"plugins.review.platform": "Platforms",
			"plugins.review.runtime": "External runtime",
			"plugins.review.egress": "Network and data egress",
			"plugins.review.activation": "Activation",
			"plugins.review.issues": "Known issues",
			"plugins.review.verified": "Last verified",
			"plugins.review.unknownContract": "Not reviewed by Portable. Topic membership is not a compatibility claim.",
			"plugins.review.unknownPlatform": "Unverified",
			"plugins.review.unknownRuntime": "Unverified. Read the README, package.json and any install script first.",
			"plugins.review.unknownEgress": "Unverified network and image-upload behaviour.",
			"plugins.review.unknownActivation": "Unverified tool, prompt and daemon activation.",
			"plugins.review.unknownIssues": "Portable holds no review record for this repository.",
			"plugins.review.unknownVerified": "Never verified",
			"plugins.review.warning": "An unverified plugin can change the agent’s tools, prompts, network reach and local processes. Check the repository yourself first.",
			"plugins.review.note": "Only the button below starts an install.",
			"plugins.install": "Install",
			"plugins.confirmInstall": "Confirm install",
			"plugins.confirmRetry": "Confirm retry",
			"plugins.installing": "Installing…",
			"plugins.installed": "Installed",
			"plugins.installedRestart": "Installed. Restart the harness to load it.",
			"plugins.installFailed": "Install failed: {error}",
			"plugins.installFailedHint": "Retry above. A repository with an unusual layout may need the build or script steps its README describes.",
			"plugins.cancelJob": "Cancel",
			"plugins.phase.pending": "Preparing…",
			"plugins.phase.resolving": "Resolving dependencies…",
			"plugins.phase.downloading": "Downloading…",
			"plugins.phase.installing": "Installing…",
			"plugins.phase.done": "Finished",
			"plugins.phase.error": "Failed",
			"plugins.phase.canceled": "Canceled",
			"plugins.progress.downloaded": "{done} downloaded",
			"plugins.progress.total": "about {total}",
			"plugins.progress.eta": "{seconds}s left",
			"plugins.progress.packages": "{resolved} packages · {reused} reused · {downloaded} downloaded",
			"plugins.progress.label": "Plugin installation progress",
			"plugins.progress.indeterminate": "Installation progress is unavailable",
			"plugins.installedTitle": "Installed plugins",
			"plugins.installedBody": "Third-party plugins installed into the web profile. Built-in plugins ship with the harness and are configured under Configuration.",
			"plugins.installedCount": "{count} installed",
			"plugins.updatableCount": "{count} updatable",
			"plugins.emptyInstalled": "No third-party plugin is installed yet.",
			"plugins.browseMarket": "Browse the marketplace",
			"plugins.readFailed": "Could not read the profile: {error}",
			"plugins.update": "Update to v{version}",
			"plugins.updating": "Updating…",
			"plugins.enable": "Enable",
			"plugins.disable": "Disable",
			"plugins.working": "Working…",
			"plugins.uninstall": "Uninstall",
			"plugins.uninstallTitle": "Uninstall {name}?",
			"plugins.uninstallBody": "This removes the package from the web profile. It takes effect after the harness restarts.",
			"plugins.selfTag": "This marketplace",
			"plugins.selfNote": "The marketplace runs this page, so it cannot disable or uninstall itself here.",
			"plugins.disabledTag": "Disabled",
			"plugins.updateTag": "v{version} available",
			"plugins.pendingTag": "Pending restart",
			"plugins.version": "v{version}",
			"plugins.versionUnknown": "Version unknown",
			"plugins.latestVersion": "latest v{version}",
			"plugins.restartNote": "Enabling, disabling, updating and uninstalling all take effect after the harness restarts.",
			"plugins.actionDone": "Done. Restart the harness to apply it.",
			"plugins.actionFailed": "Failed: {error}",
			"plugins.selfUpdate": "A newer marketplace is available: v{current} → v{latest}.",
			"plugins.selfUpdateAction": "Update now",
			"plugins.selfUpdateDone": "Updated. Restart the harness to apply it.",
			"plugins.lifecycle": "Plugin lifecycle",
			"plugins.lifecycle.installed": "Installed",
			"plugins.lifecycle.installedBody": "Package present in the profile",
			"plugins.lifecycle.available": "Available",
			"plugins.lifecycle.availableDone": "Entry point and dependencies resolve",
			"plugins.lifecycle.availableOff": "Entry point or dependencies missing",
			"plugins.lifecycle.activated": "Activated",
			"plugins.lifecycle.activatedDone": "Listed in the profile bundles",
			"plugins.lifecycle.activatedOff": "Not listed in the profile bundles",
			"plugins.lifecycle.exposed": "Exposed",
			"plugins.lifecycle.exposedDone": "Configured at boot",
			"plugins.lifecycle.exposedPending": "Waiting for a restart",
			"plugins.lifecycle.exposedOff": "Not exposed",
			"plugins.lifecycle.unknown": "Unknown",
			"common.cancel": "Cancel",
			"common.close": "Close",
			"common.retry": "Retry",
			"common.copy": "Copy",
			"common.copied": "Copied",
			"common.search": "Search",
			"common.edit": "Edit",
			"common.save": "Save",
			"common.saving": "Saving…",
			"common.readOnly": "Read-only",
			"common.none": "None",
			"common.error": "Something went wrong",
			"changes.undoConfirmTitle": "Undo these file changes?",
			"changes.undoConfirmBody": "This will restore the selected files to their previous contents.",
			"changes.undoConfirmAcknowledge": "I understand the selected changes will be reverted."
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
			"workspace.actions": "项目文件夹操作",
			"workspace.select": "选择工作区",
			"workspace.newTask": "在此项目文件夹中新建任务",
			"workspace.rename": "重命名项目文件夹",
			"workspace.renameTitle": "重命名项目文件夹",
			"workspace.name": "项目文件夹名称",
			"workspace.remove": "移除项目文件夹",
			"workspace.removeTitle": "移除这个项目文件夹？",
			"workspace.removeBody": "这会将“{name}”从侧边栏移除。文件和对话会保留，对话将显示在“其他会话”下。",
			"workspace.removePending": "正在移除项目文件夹…",
			"nav.collapse": "收起侧边栏",
			"nav.dismissPanels": "关闭打开的面板",
			"nav.expand": "展开侧边栏",
			"nav.resize": "调整侧边栏宽度",
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
			"top.workspaceMenu": "选择工作区",
			"top.layout": "布局",
			"top.share": "导出",
			"top.shareTooltip": "导出对话记录",
			"top.sharePreparing": "准备导出…",
			"top.shareStarted": "已开始下载",
			"top.shareFailed": "导出失败",
			"top.toggleAside": "切换详情面板",
			"top.togglePreview": "显示/隐藏预览侧边栏",
			"top.toggleSummary": "显示/隐藏环境信息摘要",
			"top.moreActions": "更多操作",
			"top.officialUi": "切换到官方版界面",
			"aside.title": "预览面板",
			"aside.close": "关闭预览面板",
			"summary.title": "环境信息",
			"summary.close": "关闭摘要",
			"summary.local": "本地",
			"summary.openChanges": "打开变更面板",
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
			"chat.editQueued": "编辑排队消息",
			"chat.editQueuedUnsupported": "这条排队消息不支持编辑。",
			"chat.saveQueued": "保存排队消息",
			"chat.cancelQueuedEdit": "取消编辑",
			"chat.removeQueued": "移除排队消息",
			"chat.steerQueued": "立即发送排队消息",
			"chat.steerQueuedUnavailable": "任务运行时才能插话发送。",
			"chat.tokens": "{count} tokens",
			"chat.wrap": "自动换行",
			"chat.outputTruncated": "… 输出已截断",
			"chat.transcript": "会话内容",
			"chat.message.copy": "复制回答",
			"chat.message.copied": "回答已复制",
			"chat.message.branch": "从此回答创建分支",
			"chat.message.branching": "正在创建分支…",
			"chat.message.branchFailed": "创建分支失败：{error}",
			"chat.feedback.positive": "回答有帮助",
			"chat.feedback.negative": "回答没帮助",
			"chat.feedback.failed": "反馈保存失败：{error}",
			"chat.turnNavigation.label": "会话回合",
			"chat.turnNavigation.turn": "跳转到第 {count} 回合",
			"chat.image.open": "打开图片",
			"chat.image.close": "关闭图片",
			"context.aria": "已使用上下文 {percent}",
			"context.used": "上下文用量",
			"context.system": "系统",
			"context.tools": "工具",
			"context.messages": "消息",
			"context.tokens": "约 {used} / {total}",
			"composer.dropFiles": "拖放文件以添加附件",
			"composer.dropFilesHint": "松开即可将文件加入消息",
			"composer.pasteAttachment": "已从剪贴板添加附件",
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
			"plan.title": "计划",
			"plan.progress": "{done}/{total}",
			"trace.title": "跟踪",
			"trace.stats": "{events} 个事件 · {requests} 个请求",
			"trace.runningCount": "{count} 个运行中",
			"trace.user": "用户消息",
			"trace.assistant": "助手回复",
			"trace.tool": "工具调用",
			"trace.command": "命令",
			"trace.context": "上下文",
			"trace.retry": "模型重试",
			"trace.error": "回合错误",
			"trace.limit": "达到输出上限",
			"trace.compaction": "上下文压缩",
			"trace.steering": "插话消息",
			"trace.unknown": "未知事件",
			"trace.done": "已完成",
			"trace.failed": "失败",
			"trace.active": "运行中",
			"trace.inspect": "查看这条跟踪详情",
			"question.title": "需要你的选择",
			"question.cancel": "取消提问",
			"question.previous": "上一题",
			"question.next": "下一题",
			"question.recommended": "推荐",
			"question.custom": "输入你的答案",
			"question.skip": "跳过",
			"question.continue": "继续",
			"question.submit": "提交",
			"question.submitting": "发送中…",
			"question.errorIncomplete": "请先完成剩余问题。",
			"question.errorUnanswered": "请先选择一个选项或填写答案。",
			"question.planReview": "计划待审",
			"question.discuss": "去聊天里说",
			"question.decline": "拒绝",
			"question.approve": "确认执行",
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
			"composer.attachments": "附件",
			"composer.addAttachment": "添加附件",
			"composer.removeAttachment": "移除附件",
			"composer.attachmentFile": "文件",
			"composer.attachmentsBusy": "当前发送准备中，暂时不能修改附件。",
			"composer.attachmentsUnavailable": "当前会话暂不支持附件。",
			"palette.placeholder": "搜索操作、任务或文件",
			"palette.all": "全部",
			"palette.actions": "操作",
			"palette.tasks": "任务",
			"palette.files": "文件",
			"palette.suggested": "建议",
			"palette.panels": "面板",
			"palette.configuration": "配置",
			"palette.empty": "没有匹配项",
			"palette.filter": "筛选结果",
			"palette.results": "命令面板结果",
			"directory.contents": "目录内容",
			"directory.empty": "此目录为空。",
			"directory.open": "打开",
			"learning.title": "学习模式",
			"learning.subtitle": "概念、材料与笔记，由官方版使用的同一套学习引擎驱动。",
			"learning.concept": "概念学习",
			"learning.conceptBody": "围绕一个概念开始引导式学习，包含检查点与回忆卡片。",
			"learning.problem": "问题学习",
			"learning.problemBody": "带着问题进入，在引导下逐步找到答案。",
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
			"learning.loading": "正在加载学习内容…",
			"learning.error": "学习内容加载失败：{error}",
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
			"settings.agentPresetsDefault": "新任务的默认预设",
			"settings.agentPresetsDefaultBody": "运行中的任务会继续使用创建时的预设。",
			"settings.agentPresets.view": "查看",
			"settings.agentPresets.copy": "复制",
			"settings.agentPresets.copyTitle": "复制 Agent 预设",
			"settings.agentPresets.copyBody": "创建一个可编辑的副本，然后在预设文件夹中修改它的组合配置。",
			"settings.agentPresets.id": "预设 ID",
			"settings.agentPresets.idInvalid": "只能使用小写字母、数字和连字符。",
			"settings.agentPresets.idTaken": "这个预设 ID 已经被使用。",
			"settings.agentPresets.name": "显示名称",
			"settings.agentPresets.namePlaceholder": "可选的显示名称",
			"settings.agentPresets.openLocation": "打开文件夹",
			"settings.agentPresets.showLocation": "显示文件夹路径",
			"settings.agentPresets.delete": "删除",
			"settings.agentPresets.deleteTitle": "删除 Agent 预设？",
			"settings.agentPresets.deleteBody": "这会删除用户创建的预设文件夹，不会影响正在运行的任务。",
			"settings.pluginsBody": "配置内置能力，并查看当前 Loader 中已安装的插件。",
			"settings.plugins.mcpBody": "MCP 条目来自实时 Loader 插件清单。",
			"settings.plugins.tabs": "插件视图",
			"settings.plugins.configTab": "配置",
			"settings.plugins.inventoryTab": "已安装",
			"settings.plugins.emptyConfig": "本部署没有可配置的插件设置。",
			"settings.plugins.emptyInventory": "没有匹配的已安装插件。",
			"settings.plugins.search": "搜索插件",
			"settings.plugins.inventoryTitle": "已安装插件",
			"settings.plugins.enabled": "已启用",
			"settings.plugins.disabled": "已停用",
			"settings.plugins.unobserved": "未挂载",
			"settings.plugins.credentialWarning": "凭据状态暂不可用",
			"settings.plugins.keyConfigured": "已配置密钥。留空表示保持当前密钥。",
			"settings.plugins.keyConfiguredHint": "已安全保存 · 输入新 Key 可替换",
			"settings.plugins.keyPlaceholder": "输入 API Key",
			"settings.plugins.defaultValue": "使用默认值",
			"settings.plugins.reset": "恢复默认",
			"settings.plugins.discard": "放弃修改",
			"settings.plugins.save": "保存",
			"settings.plugins.saving": "保存中…",
			"settings.plugins.invalidNumber": "请输入有效数字，或留空恢复默认值。",
			"settings.plugins.visionTitle": "视觉辅助（Vision Bridge）",
			"settings.plugins.visionDescription": "让图片轮次使用原生输入或配置的视觉模型。",
			"settings.plugins.visionSharedProvider": "图片轮次复用上方的附件与模型配置；此插件不会另存 API Key 或接口地址。",
			"settings.plugins.visionEnabled": "启用 Vision Bridge",
			"settings.plugins.visionEnabledHint": "纯文字轮次继续使用当前模型；图片轮次使用原生能力或后备视觉路由。",
			"settings.plugins.visionModel": "指定视觉模型（可选）",
			"settings.plugins.visionModelPlaceholder": "留空则自动选择",
			"settings.plugins.visionModelHint": "模型 ID 重复时可填写 provider/model 指定服务商。",
			"settings.plugins.visionUseAutomatic": "使用自动模型",
			"settings.plugins.visionRouteAutomatic": "自动选择视觉模型",
			"settings.plugins.visionRouteAutomaticHint": "将使用当前目录中第一个支持图片输入的模型。",
			"settings.plugins.visionRoutePinned": "已指定视觉模型",
			"settings.plugins.visionRouteDisabled": "Vision Bridge 已停用",
			"settings.plugins.shellTitle": "终端",
			"settings.plugins.shellDescription": "限制 Agent 运行的每一条命令。",
			"settings.plugins.shellTimeout": "命令超时（毫秒）",
			"settings.plugins.shellTimeoutHint": "单条命令允许运行多久，超时即终止。",
			"settings.plugins.shellOutput": "单流输出上限（字节）",
			"settings.plugins.shellOutputHint": "超过上限的输出会被转存并保留。",
			"settings.plugins.agentLoopTitle": "Agent 循环",
			"settings.plugins.agentLoopDescription": "控制工具调用的派发方式。",
			"settings.plugins.agentLoopParallel": "并行工具调用数",
			"settings.plugins.agentLoopParallelHint": "同一步内最多同时运行的安全调用数。",
			"settings.plugins.webSearchTitle": "网页搜索",
			"settings.plugins.webSearchDescription": "Agent 使用的 DeepSeek 搜索提供方。",
			"settings.plugins.webSearchApiKey": "API Key",
			"settings.plugins.webSearchApiKeyHint": "保存在设置文档之外。留空表示保持当前密钥。",
			"settings.plugins.webSearchBaseUrl": "接口地址",
			"settings.plugins.webSearchBaseUrlHint": "留空则使用提供方默认地址。",
			"settings.plugins.webSearchMaxUses": "单次请求最多搜索次数",
			"settings.plugins.webSearchMaxUsesHint": "一次请求在作答前最多可以搜索多少次。",
			"settings.plugins.subagentModelSelectionTitle": "Subagent 模型选择",
			"settings.plugins.subagentModelSelectionDescription": "控制 Agent 可为 Subagent 选择哪些模型。",
			"settings.plugins.subagentModelSelectionToggle": "允许 Agent 选择 Subagent 模型",
			"settings.plugins.subagentModelSelectionChoose": "开启后，新建 Subagent 可以从下方授权模型中选择模型。",
			"settings.plugins.subagentModelSelectionOff": "关闭后，Subagent 使用配置的默认模型或继承父 Agent 模型。",
			"settings.plugins.subagentModelSelectionAllowed": "授权模型",
			"settings.plugins.subagentModelSelectionEmpty": "当前没有模型提供方公布模型。",
			"settings.plugins.subagentModelSelectionLoadFailed": "模型目录暂时不可用。",
			"settings.plugins.subagentModelSelectionRequired": "启用前请至少选择一个模型。",
			"settings.modelsBody": "配置新请求使用的凭据与供应商地址。",
			"settings.openOfficialSettings": "打开完整设置界面",
			"settings.openOfficialSettingsBody": "这里没有覆盖的设置项，可在官方版界面中继续配置。",
			"settings.skillsEmpty": "当前会话没有可用技能。",
			"settings.loading": "加载中…",
			"settings.count": "{count} 项",
			"settings.namespace": "命名空间",
			"settings.provider": "供应商",
			"settings.models.default": "默认模型",
			"settings.models.routable": "可用供应商",
			"settings.models.failures": "加载失败的供应商",
			"settings.models.apiKey": "API Key",
			"settings.models.keyConfigured": "API Key 已配置",
			"settings.models.keyMissing": "缺少 API Key",
			"settings.models.notConfigured": "尚未配置",
			"settings.models.keyNotRequired": "无需 API Key",
			"settings.models.keyConfiguredHint": "已安全保存 · 输入新 Key 可替换",
			"settings.models.keyPlaceholder": "输入 API Key",
			"settings.models.baseURL": "Base URL",
			"settings.models.baseURLPlaceholder": "https://api.example.com",
			"settings.models.inactive": "未启用",
			"settings.models.credentialWarning": "凭据状态暂不可用",
			"settings.memoryBody": "长期工作区记忆通过设置文档配置。",
			"settings.browserBody": "浏览器控制由本安装中的技能与插件提供。",
			"settings.computerBody": "电脑控制由本安装中的技能与插件提供。",
			"settings.modelUsage": "模型用量",
			"settings.modelUsageBody": "数据来自与 DCode 使用统计相同的任务持久化记录。本页面不伪造账户余额。",
			"settings.usageBody": "Token 用量来自每个任务的持久化记录，并分别统计输入、输出与缓存。",
			"settings.usageTotal": "累计 Token",
			"settings.usageScope": "共 {sessions} 个任务 · {usageSessions} 个有用量",
			"settings.usageInput": "输入 Token",
			"settings.usageOutput": "输出 Token",
			"settings.usageCacheRead": "缓存读取",
			"settings.usageCacheWrite": "缓存写入",
			"settings.usageCacheHit": "缓存命中率",
			"settings.usageSessions": "已跟踪任务",
			"settings.usageSteps": "已记录步骤",
			"settings.usageEmpty": "还没有记录到 Token 用量。",
			"settings.usageLoading": "正在加载 Token 用量…",
			"settings.usageError": "无法加载 Token 用量。",
			"settings.commandsEmpty": "当前没有可用命令。",
			"settings.inventoryEmpty": "当前没有可用的已安装插件。",
			"settings.presetsEmpty": "当前没有可用的 Agent 预设。",
			"settings.subagentsEmpty": "当前没有可用的子智能体配置。",
			"settings.namespaceEmpty": "此命名空间没有可配置字段。",
			"settings.usageTurns": "已记录回合",
			"settings.usageTokens": "累计 Token",
			"plugins.title": "插件",
			"plugins.subtitle": "浏览社区插件市场、管理当前配置已安装的插件，并调整内置插件的设置。",
			"plugins.section.market": "插件市场",
			"plugins.section.installed": "已安装",
			"plugins.section.settings": "插件配置",
			"plugins.group.manage": "管理",
			"plugins.unavailable": "当前配置未运行插件市场服务。",
			"plugins.unavailableBody": "插件市场随便携版一起分发，首次启动时会写入 web 配置。请重新安装或启用它，然后重启 harness。",
			"plugins.search": "搜索名称、简介与语言",
			"plugins.refresh": "刷新",
			"plugins.syncing": "同步中…",
			"plugins.syncedAt": "同步于 {time}",
			"plugins.neverSynced": "尚未同步",
			"plugins.shownOfTotal": "已显示 {shown} / 共 {total}",
			"plugins.source": "实时同步自 GitHub dsh-plugin 话题；每次安装都以卡片给出的仓库为准。",
			"plugins.sourceLink": "打开话题页",
			"plugins.loadMore": "加载更多",
			"plugins.loading": "加载中…",
			"plugins.syncFailed": "同步失败：{error}",
			"plugins.emptyMarket": "插件市场没有返回任何插件。",
			"plugins.emptySearch": "没有匹配“{query}”的插件。",
			"plugins.stars": "{count} 星标",
			"plugins.openRepository": "打开仓库",
			"plugins.translate": "翻译简介",
			"plugins.translating": "翻译中…",
			"plugins.translateTitle": "简介 · {name}",
			"plugins.translateOriginal": "原文",
			"plugins.translateFailed": "翻译失败：{error}",
			"plugins.translateEmpty": "没有返回翻译内容。",
			"plugins.reviewed": "Portable 已审阅",
			"plugins.unreviewed": "Portable 未验证",
			"plugins.reviewOpen": "查看安装信息",
			"plugins.review.contract": "DSH 契约",
			"plugins.review.platform": "平台",
			"plugins.review.runtime": "外部 runtime",
			"plugins.review.egress": "联网与数据外发",
			"plugins.review.activation": "激活与降级",
			"plugins.review.issues": "已知问题",
			"plugins.review.verified": "最近验证",
			"plugins.review.unknownContract": "Portable 未审阅；不要从 topic 标签推断兼容性。",
			"plugins.review.unknownPlatform": "未验证",
			"plugins.review.unknownRuntime": "未验证；安装前请先查看 README、package.json 与安装脚本。",
			"plugins.review.unknownEgress": "未验证联网或图片外发行为。",
			"plugins.review.unknownActivation": "未验证工具、提示词、daemon 的激活与卸载行为。",
			"plugins.review.unknownIssues": "Portable 尚无该仓库的审阅记录。",
			"plugins.review.unknownVerified": "未验证",
			"plugins.review.warning": "未验证的插件可能改变 Agent 的工具、提示词、网络访问与本机进程。安装前请自行核查仓库。",
			"plugins.review.note": "只有下方按钮会真正开始安装。",
			"plugins.install": "安装",
			"plugins.confirmInstall": "确认安装",
			"plugins.confirmRetry": "确认重试",
			"plugins.installing": "安装中…",
			"plugins.installed": "已安装",
			"plugins.installedRestart": "已安装，重启 harness 后加载。",
			"plugins.installFailed": "安装失败：{error}",
			"plugins.installFailedHint": "可在上方重试。若仓库结构特殊，可能需要按其 README 先构建或执行安装脚本。",
			"plugins.cancelJob": "取消",
			"plugins.phase.pending": "准备中…",
			"plugins.phase.resolving": "正在解析依赖…",
			"plugins.phase.downloading": "正在下载…",
			"plugins.phase.installing": "正在安装…",
			"plugins.phase.done": "已完成",
			"plugins.phase.error": "失败",
			"plugins.phase.canceled": "已取消",
			"plugins.progress.downloaded": "已下载 {done}",
			"plugins.progress.total": "共约 {total}",
			"plugins.progress.eta": "剩余约 {seconds}s",
			"plugins.progress.packages": "依赖 {resolved} 个 · 复用 {reused} · 下载 {downloaded}",
			"plugins.progress.label": "插件安装进度",
			"plugins.progress.indeterminate": "暂时无法获取安装进度",
			"plugins.installedTitle": "已安装插件",
			"plugins.installedBody": "这里是安装到 web 配置的第三方插件。内置插件随 harness 提供，请在「插件配置」中调整。",
			"plugins.installedCount": "已安装 {count} 个",
			"plugins.updatableCount": "{count} 个可更新",
			"plugins.emptyInstalled": "还没有安装第三方插件。",
			"plugins.browseMarket": "去插件市场看看",
			"plugins.readFailed": "读取配置失败：{error}",
			"plugins.update": "更新到 v{version}",
			"plugins.updating": "更新中…",
			"plugins.enable": "启用",
			"plugins.disable": "停用",
			"plugins.working": "处理中…",
			"plugins.uninstall": "卸载",
			"plugins.uninstallTitle": "卸载 {name}？",
			"plugins.uninstallBody": "这会从 web 配置中移除该插件包，重启 harness 后生效。",
			"plugins.selfTag": "当前插件市场",
			"plugins.selfNote": "本页由插件市场提供，因此它不能在这里停用或卸载自己。",
			"plugins.disabledTag": "已停用",
			"plugins.updateTag": "可更新 v{version}",
			"plugins.pendingTag": "待重启",
			"plugins.version": "v{version}",
			"plugins.versionUnknown": "版本未知",
			"plugins.latestVersion": "最新 v{version}",
			"plugins.restartNote": "启用、停用、更新与卸载均需重启 harness 后生效。",
			"plugins.actionDone": "已执行，重启 harness 后生效。",
			"plugins.actionFailed": "操作失败：{error}",
			"plugins.selfUpdate": "插件市场有新版本：v{current} → v{latest}。",
			"plugins.selfUpdateAction": "立即更新",
			"plugins.selfUpdateDone": "已更新，重启 harness 后生效。",
			"plugins.lifecycle": "插件生命周期",
			"plugins.lifecycle.installed": "已安装",
			"plugins.lifecycle.installedBody": "配置中已存在该包",
			"plugins.lifecycle.available": "可用",
			"plugins.lifecycle.availableDone": "入口与依赖可解析",
			"plugins.lifecycle.availableOff": "入口或依赖缺失",
			"plugins.lifecycle.activated": "已激活",
			"plugins.lifecycle.activatedDone": "已加入配置的 bundles",
			"plugins.lifecycle.activatedOff": "未加入配置的 bundles",
			"plugins.lifecycle.exposed": "已生效",
			"plugins.lifecycle.exposedDone": "启动时已配置",
			"plugins.lifecycle.exposedPending": "等待重启",
			"plugins.lifecycle.exposedOff": "未生效",
			"plugins.lifecycle.unknown": "状态未知",
			"common.cancel": "取消",
			"common.close": "关闭",
			"common.retry": "重试",
			"common.copy": "复制",
			"common.copied": "已复制",
			"common.search": "搜索",
			"common.edit": "编辑",
			"common.save": "保存",
			"common.saving": "保存中…",
			"common.readOnly": "只读",
			"common.none": "无",
			"common.error": "出错了",
			"changes.undoConfirmTitle": "撤销这些文件改动？",
			"changes.undoConfirmBody": "这会将选中的文件恢复到之前的内容。",
			"changes.undoConfirmAcknowledge": "我知道选中的改动会被恢复。"
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
		const css$24 = "[data-dcode-scope]{--zx-text-micro:11px;--zx-text-xs:12px;--zx-text-sm:13px;--zx-text-md:14px;--zx-text-lg:16px;--zx-text-xl:20px;--zx-text-2xl:26px;--zx-leading-tight:1.35;--zx-leading-snug:1.4;--zx-leading-body:1.65;--zx-leading-code:1.55;--zx-space-1:4px;--zx-space-2:6px;--zx-space-3:8px;--zx-space-4:12px;--zx-space-5:16px;--zx-space-6:20px;--zx-space-7:28px;--zx-radius-sm:6px;--zx-radius-md:8px;--zx-radius-lg:10px;--zx-radius-xl:14px;--zx-radius-2xl:20px;--zx-radius-pill:999px;--zx-control-xs:26px;--zx-control-sm:28px;--zx-control-md:30px;--zx-control-lg:34px;--zx-control-2xs:20px;--zx-control-xl:44px;--zx-spinner-md:12px;--zx-spinner-sm:10px;--zx-scrollbar-size:8px;--zx-weight-normal:400;--zx-weight-medium:500;--zx-weight-semibold:600;--zx-opacity-disabled:.45;--zx-bg-app:var(--dsw-alias-bg-base,#0d0d0f);--zx-bg-panel:var(--dsw-alias-bg-layer-1,#141416);--zx-bg-card:var(--dsw-alias-bg-layer-2,#191a1d);--zx-bg-overlay:var(--dsw-alias-bg-overlay,#1c1d20);--zx-bg-raised:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 6%, transparent);--zx-bg-hover:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 8%, transparent);--zx-bg-active:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 12%, transparent);--zx-border:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 11%, transparent);--zx-border-soft:color-mix(in srgb, var(--dsw-alias-label-primary,#f2f2f3) 7%, transparent);--zx-border-control:color-mix(in srgb, var(--zx-label) 38%, transparent);--zx-label:var(--dsw-alias-label-primary,#ececee);--zx-label-secondary:var(--dsw-alias-label-secondary,#a9aab0);--zx-label-muted:color-mix(in srgb, var(--dsw-alias-label-secondary,#a9aab0) 78%, transparent);--zx-label-faint:var(--zx-label-decor);--zx-label-tertiary:color-mix(in srgb, var(--dsw-alias-label-secondary,#a9aab0) 68%, transparent);--zx-label-decor:color-mix(in srgb, var(--dsw-alias-label-secondary,#a9aab0) 48%, transparent);--zx-accent:var(--dsw-alias-brand-primary,#4c8dff);--zx-on-accent:var(--dsw-alias-bg-base,#0d0d0f);--zx-accent-soft:color-mix(in srgb, var(--dsw-alias-brand-primary,#4c8dff) 18%, transparent);--zx-on-accent-soft:#8ab4ff;--zx-success:var(--dsw-alias-state-success-primary,#3fb950);--zx-warn:var(--dsw-alias-state-warn-primary,#d29922);--zx-error:var(--dsw-alias-state-error-primary,#f85149);--zx-added:var(--dsw-alias-state-success-primary,#3fb950);--zx-removed:var(--dsw-alias-state-error-primary,#f85149);--zx-ansi-0:#7d8698;--zx-ansi-1:#e06c75;--zx-ansi-2:#98c379;--zx-ansi-3:#e5c07b;--zx-ansi-4:#61afef;--zx-ansi-5:#c678dd;--zx-ansi-6:#56b6c2;--zx-ansi-7:#cbd0d8;--zx-ansi-8:#8b93a1;--zx-ansi-9:#ff7b86;--zx-ansi-10:#b3e08e;--zx-ansi-11:#f2d08a;--zx-ansi-12:#82c4ff;--zx-ansi-13:#d99ae8;--zx-ansi-14:#74d0dc;--zx-ansi-15:#f5f7fa;--zx-ansi-fg:var(--zx-label);--zx-ansi-bg:var(--zx-bg-card);--zx-scrim:#00000075;--zx-focus-ring:0 0 0 2px color-mix(in srgb, var(--zx-accent) 55%, transparent);--zx-shadow-panel:0 12px 32px #00000057, 0 2px 6px #00000038;--zx-shadow-card:0 1px 2px #0000002e;--zx-shadow-popover:0 16px 38px #0000004d, 0 3px 9px #0000002e;--zx-shadow-dialog:0 18px 44px #00000057, 0 4px 12px #0003;--zx-shadow-focus:0 0 0 3px color-mix(in srgb, var(--zx-accent) 16%, transparent);--zx-z-base:0;--zx-z-sticky:10;--zx-z-scrim:20;--zx-z-drawer:30;--zx-z-popover:40;--zx-z-modal:60;--zx-z-dialog:80;--zx-z-menu:90;--zx-z-tooltip:100;--zx-font-ui:-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", system-ui, sans-serif;--zx-font-mono:ui-monospace, SFMono-Regular, \"SF Mono\", Menlo, Consolas, \"Liberation Mono\", monospace;--zx-motion-fast:.12s cubic-bezier(.2, 0, .2, 1);--zx-motion:.18s cubic-bezier(.2, 0, .2, 1);--zx-rail-width:240px;--zx-aside-width:320px;--zx-topbar-height:44px;--zx-reading-width:760px;--dsw-specific-menu:var(--zx-bg-overlay);--dsw-alias-border-inverted:var(--zx-border);--dsw-alias-interactive-bg-hover:var(--zx-bg-hover);--dsw-alias-interactive-bg-hover-solid:var(--zx-bg-hover);--dsw-alias-bg-module-platform:var(--zx-bg-card);--dsw-shadow-lv3:var(--zx-shadow-panel)}[data-dcode-scope][data-dcode-scheme=light]{--zx-bg-app:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 4%, var(--dsw-alias-bg-base,#fff));--zx-bg-panel:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 2%, var(--dsw-alias-bg-base,#fff));--zx-bg-card:var(--dsw-alias-bg-base,#fff);--zx-bg-overlay:var(--dsw-alias-bg-base,#fff);--zx-bg-raised:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 4%, transparent);--zx-bg-hover:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 6%, transparent);--zx-bg-active:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 10%, transparent);--zx-border:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 10%, transparent);--zx-border-soft:color-mix(in srgb, var(--dsw-alias-label-primary,#1c2024) 6%, transparent);--zx-label:var(--dsw-alias-label-primary,#1c2024);--zx-label-secondary:var(--dsw-alias-label-secondary,#59606b);--zx-label-muted:color-mix(in srgb, var(--dsw-alias-label-secondary,#59606b) 90%, transparent);--zx-label-faint:var(--zx-label-decor);--zx-label-tertiary:color-mix(in srgb, var(--dsw-alias-label-secondary,#59606b) 68%, transparent);--zx-label-decor:color-mix(in srgb, var(--dsw-alias-label-secondary,#59606b) 48%, transparent);--zx-accent:var(--dsw-alias-brand-primary,#2563eb);--zx-on-accent:var(--dsw-alias-bg-base,#fff);--zx-accent-soft:color-mix(in srgb, var(--dsw-alias-brand-primary,#2563eb) 12%, transparent);--zx-on-accent-soft:#1a45b0;--zx-focus-ring:0 0 0 2px color-mix(in srgb, var(--zx-accent) 55%, transparent);--zx-success:var(--dsw-alias-state-success-primary,#1a7f37);--zx-warn:var(--dsw-alias-state-warn-primary,#9a6700);--zx-error:var(--dsw-alias-state-error-primary,#cf222e);--zx-added:var(--dsw-alias-state-success-primary,#1a7f37);--zx-removed:var(--dsw-alias-state-error-primary,#cf222e);--zx-shadow-panel:0 12px 32px #0f172a1f, 0 2px 6px #0f172a0f;--zx-shadow-card:0 1px 2px #0f172a0f;--zx-shadow-popover:0 16px 38px #0f172a29, 0 3px 9px #0f172a14;--zx-shadow-dialog:0 18px 44px #0f172a2e, 0 4px 12px #0f172a14;--zx-ansi-0:#24292f;--zx-ansi-1:#cf222e;--zx-ansi-2:#116329;--zx-ansi-3:#7d4e00;--zx-ansi-4:#0550ae;--zx-ansi-5:#8250df;--zx-ansi-6:#0b6b73;--zx-ansi-7:#57606a;--zx-ansi-8:#616a75;--zx-ansi-9:#a40e26;--zx-ansi-10:#0d5620;--zx-ansi-11:#6b4600;--zx-ansi-12:#0a4a9e;--zx-ansi-13:#6f42c1;--zx-ansi-14:#0a5c63;--zx-ansi-15:#5b6470;--zx-ansi-fg:var(--zx-label);--zx-ansi-bg:var(--zx-bg-card);--zx-scrim:#0f172a3d}html[data-dcode-acrylic],body[data-dcode-acrylic]{background:0 0!important}[data-dcode-scope][data-dcode-acrylic]{--zx-bg-app:color-mix(in srgb, var(--dsw-alias-bg-base,#0d0d0f) 62%, transparent);--zx-bg-panel:color-mix(in srgb, var(--dsw-alias-bg-layer-1,#141416) 72%, transparent);--zx-bg-card:color-mix(in srgb, var(--dsw-alias-bg-layer-2,#191a1d) 80%, transparent);--zx-bg-overlay:color-mix(in srgb, var(--dsw-alias-bg-overlay,#1c1d20) 92%, transparent)}[data-dcode-scope][data-dcode-scheme=light][data-dcode-acrylic]{--zx-bg-app:color-mix(in srgb, var(--dsw-alias-bg-base,#f7f8fa) 62%, transparent);--zx-bg-panel:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 74%, transparent);--zx-bg-card:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 82%, transparent);--zx-bg-overlay:color-mix(in srgb, var(--dsw-alias-bg-base,#fff) 94%, transparent)}@media (prefers-reduced-motion:reduce){[data-dcode-scope] *,[data-dcode-scope] :before,[data-dcode-scope] :after{scroll-behavior:auto!important;transition-duration:.001ms!important;animation-duration:.001ms!important;animation-iteration-count:1!important}}";
		const tagId$24 = "@dsh-portable/dcode-ui/tokens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$24) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$24;
			tag.textContent = css$24;
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
			state: "idle",
			error: null,
			subagentsByParent: {},
			jobsBySession: {},
			currentAddress: void 0
		};
		const EMPTY_PENDING_INTERACTIONS = /* @__PURE__ */ new Map();
		const EMPTY_INPUT_STATE = {
			draft: "",
			imageIds: [],
			draftRev: 0,
			phase: "plain",
			occurrences: [],
			queue: []
		};
		/** The shared Conversation input machine plus its current draft state. */
		function useSessionInput(sessionId) {
			const runtime = useRuntime();
			const input = (0, react.useMemo)(() => sessionId === void 0 ? void 0 : runtime.input(sessionId), [runtime, sessionId]);
			return {
				input,
				state: useObservable(input?.state, EMPTY_INPUT_STATE)
			};
		}
		/** Narrow the shared pending-interaction roster to the ask-user-question face. */
		function questionInteraction(value) {
			if (value === void 0 || !("questions" in value) || !Array.isArray(value.questions)) return void 0;
			if (typeof value.answer !== "function") return void 0;
			if (typeof value.cancel !== "function") return void 0;
			return value;
		}
		/** The Session Controller's list and current selection. */
		function useSessionList() {
			return useObservable(useRuntime().sessions.list, EMPTY_SESSION_LIST);
		}
		/** The id of the selected session, or undefined in the no-session state. */
		function useCurrentSessionId() {
			return useObservableSelector(useRuntime().sessions.list, EMPTY_SESSION_LIST, (state) => state.current);
		}
		/** The current session's pending ask-user-question or plan-review request. */
		function usePendingQuestion(sessionId) {
			return useObservableSelector(useRuntime().pendingInteractions, EMPTY_PENDING_INTERACTIONS, (snapshot) => questionInteraction(sessionId === void 0 ? void 0 : snapshot.get(sessionId)));
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
		* One session's assembled DSH Trajectory ledger.
		*
		* This is the same target consumed by the official Trajectory view. DCode only
		* selects a compact subset for its summary and leaves the full records to the
		* existing details and diff surfaces.
		* @param sessionId - session to observe.
		*/
		function useTrajectorySnapshot(sessionId) {
			const runtime = useRuntime();
			const source = (0, react.useMemo)(() => sessionId === void 0 ? void 0 : runtime.trajectoryFeed(sessionId), [runtime, sessionId]);
			const snapshot = useObservable(source, EMPTY_TRAJECTORY_SNAPSHOT);
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
		//#region src/client/state/rail-width.ts
		/** Persisted geometry for the workbench's session sidebar. */
		/** Default and supported sidebar widths, in CSS pixels. */
		const RAIL_WIDTH = {
			default: 240,
			min: 200,
			max: 420
		};
		/** Browser preference used across workbench launches. */
		const RAIL_WIDTH_STORAGE_KEY = "dcode.railWidth";
		/** Keep an arbitrary width inside the supported sidebar range. */
		function clampRailWidth(width) {
			if (!Number.isFinite(width)) return RAIL_WIDTH.default;
			return Math.min(RAIL_WIDTH.max, Math.max(RAIL_WIDTH.min, Math.round(width)));
		}
		/** Read the last sidebar width, falling back when storage is unavailable. */
		function readRailWidth() {
			try {
				const stored = globalThis.localStorage?.getItem(RAIL_WIDTH_STORAGE_KEY);
				return stored === null || stored === void 0 ? RAIL_WIDTH.default : clampRailWidth(Number(stored));
			} catch {
				return RAIL_WIDTH.default;
			}
		}
		/** Save a sidebar width without making storage availability affect resizing. */
		function writeRailWidth(width) {
			try {
				globalThis.localStorage?.setItem(RAIL_WIDTH_STORAGE_KEY, String(clampRailWidth(width)));
			} catch {}
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\ThemeSwitch.module.css.mjs
		const css$23 = ".RDEw3W_group{border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);align-items:stretch;gap:2px;padding:2px;display:inline-flex}.RDEw3W_segment{align-items:center;gap:var(--zx-space-2);min-height:26px;padding:0 var(--zx-space-3);border-radius:var(--zx-radius-sm);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);white-space:nowrap;cursor:pointer;transition:background var(--zx-motion-fast), color var(--zx-motion-fast);background:0 0;border:0;display:inline-flex}.RDEw3W_segment:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.RDEw3W_segment:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.RDEw3W_segment:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.RDEw3W_segmentActive{background:var(--zx-bg-card);color:var(--zx-label);box-shadow:var(--zx-shadow-card)}.RDEw3W_glyph{font-size:var(--zx-text-xs);line-height:1}.RDEw3W_label{font-size:var(--zx-text-xs)}";
		const tagId$23 = "@dsh-portable/dcode-ui/ThemeSwitch.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$23) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$23;
			tag.textContent = css$23;
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
		const css$22 = ".rmlmSW_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);box-shadow:var(--zx-shadow-card);overflow:hidden}.rmlmSW_cardHeader{align-items:center;gap:var(--zx-space-3);min-height:var(--zx-control-lg);padding:var(--zx-space-3) var(--zx-space-4);font-weight:var(--zx-weight-medium);font-size:var(--zx-text-xs);color:var(--zx-label-secondary);display:flex}.rmlmSW_cardBody{padding:var(--zx-space-4)}.rmlmSW_sectionTitle{justify-content:space-between;align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4) var(--zx-space-5) var(--zx-space-2);font-size:var(--zx-text-xs);font-weight:var(--zx-weight-medium);color:var(--zx-label-secondary);letter-spacing:.02em;display:flex}.rmlmSW_iconButton{justify-content:center;align-items:center;gap:var(--zx-space-2);min-width:var(--zx-control-xs);height:var(--zx-control-xs);padding:0 var(--zx-space-2);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;transition:background var(--zx-motion-fast), color var(--zx-motion-fast);background:0 0;border:1px solid #0000;display:inline-flex}.rmlmSW_tooltipTarget{position:relative}.rmlmSW_tooltipTarget:after{z-index:var(--zx-z-tooltip);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-sm);background:var(--zx-bg-overlay);max-width:240px;box-shadow:var(--zx-shadow-panel);color:var(--zx-label);content:attr(data-tooltip);font-size:var(--zx-text-micro);font-weight:var(--zx-weight-normal);line-height:var(--zx-leading-tight);pointer-events:none;opacity:0;transition:opacity var(--zx-motion-fast), transform var(--zx-motion-fast), visibility var(--zx-motion-fast);visibility:hidden;white-space:nowrap;padding:5px 8px;position:absolute;top:calc(100% + 6px);left:50%;transform:translate(-50%,-2px)}.rmlmSW_tooltipTarget:hover:after,.rmlmSW_tooltipTarget:focus-visible:after{opacity:1;visibility:visible;transform:translate(-50%)}.rmlmSW_iconButton:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.rmlmSW_iconButton:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.rmlmSW_iconButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.rmlmSW_iconButtonActive{background:var(--zx-bg-active);color:var(--zx-label)}.rmlmSW_button{justify-content:center;align-items:center;gap:var(--zx-space-2);height:var(--zx-control-sm);padding:0 var(--zx-space-4);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-raised);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;white-space:nowrap;transition:background var(--zx-motion-fast), border-color var(--zx-motion-fast);display:inline-flex}.rmlmSW_button:hover:not(:disabled){background:var(--zx-bg-hover)}.rmlmSW_button:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.rmlmSW_button:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.rmlmSW_buttonPrimary{background:var(--zx-accent);color:var(--zx-on-accent);border-color:#0000}.rmlmSW_buttonPrimary:hover:not(:disabled){background:color-mix(in srgb, var(--zx-accent) 86%, var(--zx-label))}.rmlmSW_pill{align-items:center;gap:var(--zx-space-1);height:var(--zx-control-2xs);padding:0 var(--zx-space-2);border-radius:var(--zx-radius-pill);background:var(--zx-bg-raised);color:var(--zx-label-secondary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;white-space:nowrap;display:inline-flex}.rmlmSW_added{color:var(--zx-added)}.rmlmSW_removed{color:var(--zx-removed)}.rmlmSW_muted{color:var(--zx-label-muted)}.rmlmSW_mono{font-family:var(--zx-font-mono);font-size:var(--zx-text-xs)}.rmlmSW_truncate{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.rmlmSW_empty{justify-content:center;align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-7) var(--zx-space-5);color:var(--zx-label-muted);font-size:var(--zx-text-xs);text-align:center;flex-direction:column;display:flex}.rmlmSW_popoverAnchor{display:inline-flex;position:relative}.rmlmSW_popover{z-index:var(--zx-z-popover);min-width:200px;max-width:340px;max-height:60vh;padding:var(--zx-space-1);border:1px solid color-mix(in srgb, var(--zx-label) 18%, transparent);background:var(--zx-bg-overlay);background:color-mix(in srgb, var(--zx-bg-overlay) 68%, transparent);box-shadow:var(--zx-shadow-popover), inset 0 1px 0 color-mix(in srgb, var(--zx-label) 12%, transparent);backdrop-filter:blur(20px)saturate(130%);border-radius:12px;position:absolute;overflow:hidden auto}.rmlmSW_popoverUp{bottom:calc(100% + var(--zx-space-2));left:0}.rmlmSW_popoverDown{top:calc(100% + var(--zx-space-2));left:0}.rmlmSW_popoverRight{left:auto;right:0}.rmlmSW_menuItem{align-items:center;gap:var(--zx-space-3);width:100%;min-height:36px;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.rmlmSW_menuItem:hover{background:var(--zx-bg-hover)}.rmlmSW_menuItem:disabled{cursor:default;color:var(--zx-label-secondary)}.rmlmSW_menuItem:disabled:hover{background:0 0}.rmlmSW_menuItem:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.rmlmSW_menuItemActive{background:var(--zx-bg-active)}.rmlmSW_menuItemDanger{color:var(--zx-error)}.rmlmSW_menuIcon{width:18px;height:18px;color:var(--zx-label-secondary);flex:none;justify-content:center;align-items:center;display:inline-flex}.rmlmSW_menuIcon svg{width:18px;height:18px}.rmlmSW_menuContent{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.rmlmSW_menuLabel{padding:var(--zx-space-3) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro)}.rmlmSW_menuDetail{color:var(--zx-label-muted);font-size:var(--zx-text-micro);text-overflow:ellipsis;white-space:nowrap;margin-top:2px;line-height:1.4;display:block;overflow:hidden}.rmlmSW_scroll{scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent}.rmlmSW_scroll::-webkit-scrollbar{width:var(--zx-scrollbar-size);height:var(--zx-scrollbar-size)}.rmlmSW_scroll::-webkit-scrollbar-thumb{border-radius:var(--zx-radius-pill);background:var(--zx-border);background-clip:padding-box;border:2px solid #0000}.rmlmSW_grow{flex:1;min-width:0}.rmlmSW_spinner{width:var(--zx-spinner-md);height:var(--zx-spinner-md);border:1.5px solid var(--zx-border);border-top-color:var(--zx-label-secondary);border-radius:50%;animation:.7s linear infinite rmlmSW_zx-spin;display:inline-block}.rmlmSW_spinnerSmall{width:var(--zx-spinner-sm);height:var(--zx-spinner-sm)}.rmlmSW_visuallyHidden{clip:rect(0, 0, 0, 0);white-space:nowrap;border:0;width:1px;height:1px;margin:-1px;padding:0;position:absolute;overflow:hidden}@keyframes rmlmSW_zx-spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.rmlmSW_spinner{animation-duration:2s}}.rmlmSW_mirrored{transform:scaleX(-1)}";
		const tagId$22 = "@dsh-portable/dcode-ui/ui.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$22) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$22;
			tag.textContent = css$22;
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
			"spinnerSmall": "rmlmSW_spinnerSmall",
			"tooltipTarget": "rmlmSW_tooltipTarget",
			"truncate": "rmlmSW_truncate",
			"visuallyHidden": "rmlmSW_visuallyHidden",
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
				className: `${ui_module_css_default.iconButton} ${ui_module_css_default.tooltipTarget} ${props.active === true ? ui_module_css_default.iconButtonActive : ""} ${props.className ?? ""}`,
				"aria-label": props.label,
				"aria-pressed": props.active,
				"data-tooltip": props.label,
				"data-dcode-focus-target": props.dataFocusTarget,
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
				autoFocus: props.autoFocus,
				title: props.title,
				"aria-label": props.ariaLabel,
				"aria-expanded": props.ariaExpanded,
				"aria-controls": props.ariaControls,
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
			const triggerRef = (0, react.useRef)(null);
			const rowRefs = (0, react.useRef)({});
			const [active, setActive] = (0, react.useState)(0);
			const menuId = (0, react.useId)();
			const rows = props.rows ?? [];
			const firstEnabled = (0, react.useCallback)((from, direction) => {
				for (let index = from; index >= 0 && index < rows.length; index += direction) if (rows[index]?.disabled !== true) return index;
				return -1;
			}, [rows]);
			const close = (0, react.useCallback)((restoreFocus = false) => {
				setOpen(false);
				if (restoreFocus) triggerRef.current?.focus();
			}, []);
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onPointerDown = (event) => {
					if (event.target instanceof Node && anchorRef.current?.contains(event.target) === true) return;
					close();
				};
				const onKeyDown = (event) => {
					if (!(event.target instanceof Node) || anchorRef.current?.contains(event.target) !== true) return;
					if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						close(true);
						return;
					}
					if (rows.length === 0) return;
					if (event.key === "Enter" || event.key === " ") {
						const row = rows[active];
						if (row === void 0 || row.disabled === true) return;
						event.preventDefault();
						close(true);
						row.onSelect?.();
						return;
					}
					if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
					event.preventDefault();
					const next = event.key === "Home" ? firstEnabled(0, 1) : event.key === "End" ? firstEnabled(rows.length - 1, -1) : firstEnabled(active + (event.key === "ArrowDown" ? 1 : -1), event.key === "ArrowDown" ? 1 : -1);
					if (next >= 0) setActive(next);
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown, true);
					document.removeEventListener("keydown", onKeyDown, true);
				};
			}, [
				active,
				close,
				firstEnabled,
				open,
				rows
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				setActive(firstEnabled(0, 1));
			}, [firstEnabled, open]);
			(0, react.useEffect)(() => {
				if (open && active >= 0) rowRefs.current[active]?.focus();
			}, [active, open]);
			const select = (0, react.useCallback)((row) => {
				if (row.disabled === true) return;
				close(true);
				row.onSelect?.();
			}, [close]);
			let lastGroup;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ui_module_css_default.popoverAnchor,
				ref: anchorRef,
				style: props.style,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					ref: triggerRef,
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
					children: [props.children, rows.map((row, index) => {
						const heading = row.group !== void 0 && row.group !== lastGroup ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ui_module_css_default.menuLabel,
							children: row.group
						}) : null;
						lastGroup = row.group;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [heading, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							ref: (node) => {
								rowRefs.current[index] = node;
							},
							type: "button",
							role: "menuitem",
							disabled: row.disabled,
							tabIndex: index === active ? 0 : -1,
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
		function Spinner(props = {}) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${ui_module_css_default.spinner} ${props.size === "sm" ? ui_module_css_default.spinnerSmall : ""}`,
				"aria-hidden": true
			});
		}
		/** Shared clipboard action with consistent transient success feedback. */
		function CopyButton(props) {
			const [copied, setCopied] = (0, react.useState)(false);
			const copy = (0, react.useCallback)(() => {
				if (copied) return;
				(0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(props.text).then((ok) => {
					if (!ok) return;
					setCopied(true);
					window.setTimeout(() => {
						setCopied(false);
					}, 1500);
				});
			}, [copied, props.text]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
				label: copied ? props.copiedLabel : props.label,
				className: props.className,
				onClick: copy,
				children: copied ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {})
			}), copied ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: ui_module_css_default.visuallyHidden,
				role: "status",
				children: props.copiedLabel
			}) : null] });
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\TopBar.module.css.mjs
		const css$21 = ".yomJZG_bar{align-items:center;gap:var(--zx-space-2);height:var(--zx-topbar-height);padding:0 var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);background:var(--zx-bg-app);-webkit-app-region:drag;flex:none;display:flex}.yomJZG_bar>*{-webkit-app-region:no-drag}.yomJZG_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:var(--zx-text-sm);font-weight:var(--zx-weight-medium);color:var(--zx-label);flex:1;overflow:hidden}.yomJZG_titleMuted{color:var(--zx-label-muted);font-weight:var(--zx-weight-normal)}.yomJZG_chip{align-items:center;gap:var(--zx-space-2);max-width:220px;height:var(--zx-control-xs);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);cursor:pointer;white-space:nowrap;display:inline-flex}.yomJZG_chip:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.yomJZG_workspaceTrigger{min-width:0;max-width:220px;height:var(--zx-control-xs);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-secondary);white-space:nowrap;justify-content:flex-start}.yomJZG_workspaceTrigger:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.yomJZG_chip:disabled{cursor:default}.yomJZG_chipLabel{text-overflow:ellipsis;min-width:0;overflow:hidden}.yomJZG_divider{width:1px;height:18px;margin:0 var(--zx-space-1);background:var(--zx-border-soft)}.yomJZG_dirty{color:var(--zx-warn)}.yomJZG_actions{align-items:center;gap:var(--zx-space-1);flex:none;display:inline-flex}.yomJZG_shareButton{justify-content:center;align-items:center;gap:var(--zx-space-2);height:var(--zx-control-sm);padding:0 var(--zx-space-2);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;white-space:nowrap;transition:background var(--zx-motion-fast), color var(--zx-motion-fast);background:0 0;border:1px solid #0000;display:inline-flex}.yomJZG_shareButton:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.yomJZG_shareButton:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.yomJZG_shareButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.yomJZG_shareSuccess{color:var(--zx-success)}.yomJZG_shareError{color:var(--zx-error)}.yomJZG_layoutGroup{background:0 0;border:0;justify-content:center;align-items:center;gap:2px;padding:0;display:inline-flex}.yomJZG_layoutGroup>button{width:28px;min-width:28px;height:var(--zx-control-sm);padding:0}.yomJZG_layoutButton{border-radius:var(--zx-radius-pill)}.yomJZG_layoutButton[aria-pressed=true]{color:var(--zx-label-secondary);background:0 0}.yomJZG_layoutButton:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}[data-dcode-layout=compact] .yomJZG_chipLabel,[data-dcode-layout=compact] .yomJZG_shareLabel{display:none}[data-dcode-layout=compact] .yomJZG_chip,[data-dcode-layout=compact] .yomJZG_workspaceTrigger{padding:0 var(--zx-space-2)}";
		const tagId$21 = "@dsh-portable/dcode-ui/TopBar.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$21) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$21;
			tag.textContent = css$21;
			document.head.appendChild(tag);
		}
		var TopBar_module_css_default = {
			"actions": "yomJZG_actions",
			"bar": "yomJZG_bar",
			"chip": "yomJZG_chip",
			"chipLabel": "yomJZG_chipLabel",
			"dirty": "yomJZG_dirty",
			"divider": "yomJZG_divider",
			"layoutButton": "yomJZG_layoutButton",
			"layoutGroup": "yomJZG_layoutGroup",
			"shareButton": "yomJZG_shareButton",
			"shareError": "yomJZG_shareError",
			"shareLabel": "yomJZG_shareLabel",
			"shareSuccess": "yomJZG_shareSuccess",
			"title": "yomJZG_title",
			"titleMuted": "yomJZG_titleMuted",
			"workspaceTrigger": "yomJZG_workspaceTrigger"
		};
		//#endregion
		//#region src/client/shell/TopBarIcons.tsx
		function TopBarDownloadIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				"aria-hidden": "true",
				className,
				fill: "none",
				height: size,
				viewBox: "0 0 16 16",
				width: size,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M8 2.75V9.5M5.45 6.95 8 9.5l2.55-2.55",
					stroke: "currentColor",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					strokeWidth: "1.35"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.35 8.85v2.6c0 .8.65 1.45 1.45 1.45h8.4c.8 0 1.45-.65 1.45-1.45v-2.6",
					stroke: "currentColor",
					strokeLinecap: "round",
					strokeLinejoin: "round",
					strokeWidth: "1.35"
				})]
			});
		}
		function TopBarListIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				"aria-hidden": "true",
				className,
				fill: "none",
				height: size,
				viewBox: "0 0 16 16",
				width: size,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "3.75",
						cy: "4.25",
						r: "1.85",
						stroke: "currentColor",
						strokeWidth: "1.25"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M7.75 4.25h6",
						stroke: "currentColor",
						strokeLinecap: "round",
						strokeWidth: "1.35"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "3.75",
						cy: "11.75",
						r: "1.85",
						stroke: "currentColor",
						strokeWidth: "1.25"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "M7.75 11.75h6",
						stroke: "currentColor",
						strokeLinecap: "round",
						strokeWidth: "1.35"
					})
				]
			});
		}
		//#endregion
		//#region src/client/shell/TopBar.tsx
		/**
		* The top bar: what is being worked on, where, and on which branch — plus
		* Session sharing and the inspector toggle.
		*
		* Every value is read live: the title comes from the Session Controller's
		* display title, the workspace from the durable registry, and the branch from
		* the same git read the Changes panel uses.
		* @module @dsh-portable/dcode-ui/client/shell/TopBar
		*/
		const EMPTY_SESSION_LOG_STATE = { bySession: {} };
		const EMPTY_SUBSCRIBE = (_listener) => () => {};
		const EMPTY_SNAPSHOT = () => EMPTY_SESSION_LOG_STATE;
		/** Task context, the left session rail toggle, sharing, and inspector control. */
		function TopBar({ navigation, sessionId, cwd }) {
			const runtime = useRuntime();
			const t = useT();
			const state = useNavigation(navigation);
			const list = useSessionList();
			const { groups } = useWorkspaceGroups();
			const git = useGitStatus(cwd, sessionId);
			const sessionLogDownload = runtime.sessionLogDownload;
			const sessionLogState = (0, react.useSyncExternalStore)(sessionLogDownload?.store.subscribe ?? EMPTY_SUBSCRIBE, sessionLogDownload?.store.getSnapshot ?? EMPTY_SNAPSHOT, sessionLogDownload?.store.getSnapshot ?? EMPTY_SNAPSHOT);
			const title = sessionId === void 0 ? void 0 : list.byId[sessionId]?.displayTitle;
			const workspace = (0, react.useMemo)(() => groups.find((group) => group.path === cwd) ?? groups.find((group) => group.sessions.some((row) => row.id === sessionId)), [
				groups,
				cwd,
				sessionId
			]);
			const dirty = (git.status?.files.length ?? 0) > 0;
			const branchLabel = git.pending ? void 0 : git.status?.repository === true ? git.status.branch ?? (git.status.detached ? "HEAD" : t("top.branch")) : t("top.noRepository");
			const shareEntry = sessionId === void 0 ? void 0 : sessionLogState.bySession[String(sessionId)];
			const shareStatus = shareEntry?.status;
			const shareBusy = shareStatus === "downloading";
			const shareLabel = shareBusy ? t("top.sharePreparing") : shareStatus === "success" ? t("top.shareStarted") : shareStatus === "error" ? t("top.shareFailed") : t("top.share");
			const shareTooltip = shareEntry?.error ?? (shareBusy ? t("top.sharePreparing") : shareStatus === "success" ? t("top.shareStarted") : shareStatus === "error" ? t("top.shareFailed") : t("top.shareTooltip"));
			const shareClass = shareStatus === "success" ? TopBar_module_css_default.shareSuccess : shareStatus === "error" ? TopBar_module_css_default.shareError : "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
				className: TopBar_module_css_default.bar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: state.railOpen ? t("nav.collapse") : t("nav.expand"),
						active: state.railOpen,
						dataFocusTarget: "rail",
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
					workspace === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
						label: t("top.workspaceMenu"),
						placement: "down",
						triggerClassName: TopBar_module_css_default.workspaceTrigger,
						trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TopBar_module_css_default.chipLabel,
								children: workspace.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						] }),
						rows: groups.map((group) => ({
							id: String(group.workspaceId),
							label: group.title,
							detail: group.path,
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {}),
							active: group.workspaceId === workspace.workspaceId,
							onSelect: () => {
								runtime.navigation?.startSession(group.workspaceId);
							}
						}))
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TopBar_module_css_default.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${TopBar_module_css_default.shareButton} ${shareClass} ${ui.tooltipTarget}`,
							"aria-label": shareTooltip,
							"aria-busy": shareBusy,
							"data-tooltip": shareTooltip,
							disabled: sessionId === void 0 || sessionLogDownload === void 0 || shareBusy,
							onClick: () => {
								if (sessionId !== void 0 && sessionLogDownload !== void 0) sessionLogDownload.download(sessionId);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TopBarDownloadIcon, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: TopBar_module_css_default.shareLabel,
								children: shareLabel
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: TopBar_module_css_default.layoutGroup,
							role: "group",
							"aria-label": t("top.layout"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
								label: t("top.toggleSummary"),
								className: TopBar_module_css_default.layoutButton,
								active: state.summaryOpen,
								dataFocusTarget: "summary",
								onClick: () => {
									navigation.toggleSummary();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TopBarListIcon, { size: 16 })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
								label: t("top.togglePreview"),
								className: TopBar_module_css_default.layoutButton,
								active: state.asideOpen,
								dataFocusTarget: "aside",
								onClick: () => {
									navigation.toggleAside();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {
									className: ui.mirrored,
									size: 14
								})
							})]
						})]
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
		const css$20 = ".Pf74oW_rail{height:100%;min-width:var(--zx-rail-width);flex-direction:column;display:flex;overflow:hidden}.Pf74oW_top{padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-2);padding-top:calc(var(--zx-space-4) + var(--dsh-desktop-titlebar-height,0px));-webkit-app-region:drag;flex-direction:column;gap:2px;display:flex}.Pf74oW_top>*{-webkit-app-region:no-drag}.Pf74oW_action{align-items:center;gap:var(--zx-space-3);width:100%;height:var(--zx-control-md);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.Pf74oW_action:hover{background:var(--zx-bg-hover)}.Pf74oW_action:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.Pf74oW_actionActive{background:var(--zx-bg-active)}.Pf74oW_shortcut{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}.Pf74oW_tree{min-height:0;padding:0 var(--zx-space-3) var(--zx-space-3);flex:1;overflow:hidden auto}.Pf74oW_treeActions{padding-top:var(--zx-space-2);flex-direction:column;gap:2px;display:flex}.Pf74oW_treeDivider{height:1px;margin:var(--zx-space-3) var(--zx-space-3) 0;background:var(--zx-border-soft)}.Pf74oW_group{margin-top:var(--zx-space-3)}.Pf74oW_groupHeaderShell{border-radius:var(--zx-radius-sm);align-items:center;min-width:0;display:flex}.Pf74oW_groupHeader{align-items:center;gap:var(--zx-space-2);width:auto;min-width:0;height:var(--zx-control-xs);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-sm);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;flex:1;display:flex}.Pf74oW_groupHeader:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.Pf74oW_groupHeaderShell:hover,.Pf74oW_groupHeaderShell:focus-within{background:var(--zx-bg-hover)}.Pf74oW_groupActions{margin-right:var(--zx-space-1);flex:none;align-items:center;display:inline-flex}.Pf74oW_groupAction{opacity:0;pointer-events:none;transition:opacity var(--zx-motion-fast)}.Pf74oW_groupHeaderShell:hover .Pf74oW_groupAction,.Pf74oW_groupHeaderShell:focus-within .Pf74oW_groupAction{opacity:1;pointer-events:auto}.Pf74oW_groupName{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.Pf74oW_rowShell{border-radius:var(--zx-radius-md);align-items:center;min-width:0;display:flex}.Pf74oW_rowShell:hover,.Pf74oW_rowShell:focus-within{background:var(--zx-bg-hover)}.Pf74oW_row{align-items:center;gap:var(--zx-space-2);width:auto;min-width:0;min-height:var(--zx-control-sm);padding:var(--zx-space-1) var(--zx-space-3) var(--zx-space-1) var(--zx-space-5);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;flex:1;display:flex}.Pf74oW_row:hover{color:var(--zx-label)}.Pf74oW_row:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.Pf74oW_rowActive{background:var(--zx-bg-active);color:var(--zx-label)}.Pf74oW_rowMenu{opacity:0;pointer-events:none;transition:opacity var(--zx-motion-fast);flex:none}.Pf74oW_rowShell:hover .Pf74oW_rowMenu,.Pf74oW_rowShell:focus-within .Pf74oW_rowMenu{opacity:1;pointer-events:auto}.Pf74oW_rowTitle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.Pf74oW_rowTime{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}.Pf74oW_dot{border-radius:50%;flex:none;width:6px;height:6px}.Pf74oW_dotRunning{background:var(--zx-accent);animation:1.4s ease-in-out infinite Pf74oW_zx-pulse}.Pf74oW_dotDone{background:var(--zx-success)}@keyframes Pf74oW_zx-pulse{0%,to{opacity:1}50%{opacity:.35}}@media (prefers-reduced-motion:reduce){.Pf74oW_dotRunning{animation:none}}.Pf74oW_foot{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-3);border-top:1px solid var(--zx-border-soft);display:flex}.Pf74oW_accountTrigger{width:100%;color:var(--zx-label);justify-content:flex-start;padding:0}.Pf74oW_deleteConfirm{color:var(--zx-error)}.Pf74oW_workspaceInput{width:100%;min-height:var(--zx-control-lg);padding:0 var(--zx-space-3);box-sizing:border-box;border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-raised);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm)}.Pf74oW_workspaceInput:focus{border-color:var(--zx-accent);box-shadow:var(--zx-focus-ring);outline:none}.Pf74oW_workspaceError{margin-top:var(--zx-space-3);color:var(--zx-error);font-size:var(--zx-text-xs)}.Pf74oW_workspaceStatus{color:var(--zx-label-muted);font-size:var(--zx-text-xs)}";
		const tagId$20 = "@dsh-portable/dcode-ui/LeftRail.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$20) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$20;
			tag.textContent = css$20;
			document.head.appendChild(tag);
		}
		var LeftRail_module_css_default = {
			"accountTrigger": "Pf74oW_accountTrigger",
			"action": "Pf74oW_action",
			"actionActive": "Pf74oW_actionActive",
			"deleteConfirm": "Pf74oW_deleteConfirm",
			"dot": "Pf74oW_dot",
			"dotDone": "Pf74oW_dotDone",
			"dotRunning": "Pf74oW_dotRunning",
			"foot": "Pf74oW_foot",
			"group": "Pf74oW_group",
			"groupAction": "Pf74oW_groupAction",
			"groupActions": "Pf74oW_groupActions",
			"groupHeader": "Pf74oW_groupHeader",
			"groupHeaderShell": "Pf74oW_groupHeaderShell",
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
			"treeDivider": "Pf74oW_treeDivider",
			"workspaceError": "Pf74oW_workspaceError",
			"workspaceInput": "Pf74oW_workspaceInput",
			"workspaceStatus": "Pf74oW_workspaceStatus",
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
		/** One project-folder header with collapse, create, rename and remove actions. */
		function WorkspaceRow(props) {
			const { group, collapsed } = props;
			const t = useT();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: LeftRail_module_css_default.groupHeaderShell,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: LeftRail_module_css_default.groupHeader,
					onClick: props.onToggle,
					title: group.path,
					children: [
						collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {}),
						collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: LeftRail_module_css_default.groupName,
							children: group.title
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: LeftRail_module_css_default.groupActions,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
						label: t("workspace.actions"),
						placement: "down",
						align: "end",
						triggerClassName: LeftRail_module_css_default.groupAction,
						trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {}),
						rows: [{
							id: "rename",
							label: t("workspace.rename"),
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {}),
							onSelect: props.onRename
						}, {
							id: "remove",
							label: t("workspace.remove"),
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
							danger: true,
							onSelect: props.onRemove
						}]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: t("workspace.newTask"),
						className: LeftRail_module_css_default.groupAction,
						onClick: props.onNewTask,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, {})
					})]
				})]
			});
		}
		/** The task action, scrollable navigation/tree, and account foot. */
		function LeftRail({ navigation, onNewTask, onOpenWorkspace }) {
			const runtime = useRuntime();
			const t = useT();
			const state = useNavigation(navigation);
			const list = useSessionList();
			const { groups, ungrouped } = useWorkspaceGroups();
			const age = useAge();
			const [collapsed, setCollapsed] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [deleteTarget, setDeleteTarget] = (0, react.useState)();
			const [deleting, setDeleting] = (0, react.useState)(false);
			const [renameTarget, setRenameTarget] = (0, react.useState)();
			const [renameDraft, setRenameDraft] = (0, react.useState)("");
			const [renaming, setRenaming] = (0, react.useState)(false);
			const [renameError, setRenameError] = (0, react.useState)();
			const [removeTarget, setRemoveTarget] = (0, react.useState)();
			const [removing, setRemoving] = (0, react.useState)(false);
			const [removeError, setRemoveError] = (0, react.useState)();
			const toggleGroup = (0, react.useCallback)((id) => {
				setCollapsed((previous) => {
					const next = new Set(previous);
					if (!next.delete(id)) next.add(id);
					return next;
				});
			}, []);
			const hasRows = (0, react.useMemo)(() => groups.length > 0 || ungrouped.length > 0, [groups, ungrouped]);
			const openRename = (0, react.useCallback)((group) => {
				setRenameTarget(group);
				setRenameDraft(group.title);
				setRenameError(void 0);
			}, []);
			const closeRename = (0, react.useCallback)(() => {
				if (renaming) return;
				setRenameTarget(void 0);
				setRenameError(void 0);
			}, [renaming]);
			const confirmRename = (0, react.useCallback)(() => {
				const target = renameTarget;
				const title = renameDraft.trim();
				if (target === void 0 || renaming || title === "" || title === target.title) return;
				setRenaming(true);
				setRenameError(void 0);
				runtime.workspaces.rename(target.workspaceId, title).then(() => {
					setRenameTarget(void 0);
				}).catch((cause) => {
					setRenameError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setRenaming(false);
				});
			}, [
				renameDraft,
				renameTarget,
				renaming,
				runtime
			]);
			const openRemove = (0, react.useCallback)((group) => {
				setRemoveTarget(group);
				setRemoveError(void 0);
			}, []);
			const closeRemove = (0, react.useCallback)(() => {
				if (removing) return;
				setRemoveTarget(void 0);
				setRemoveError(void 0);
			}, [removing]);
			const confirmRemove = (0, react.useCallback)(() => {
				const target = removeTarget;
				if (target === void 0 || removing) return;
				setRemoving(true);
				setRemoveError(void 0);
				runtime.workspaces.delete(target.workspaceId).then(() => {
					setRemoveTarget(void 0);
				}).catch((cause) => {
					setRemoveError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setRemoving(false);
				});
			}, [
				removing,
				removeTarget,
				runtime
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: LeftRail_module_css_default.rail,
				"aria-label": t("app.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LeftRail_module_css_default.top,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: LeftRail_module_css_default.action,
							onClick: () => {
								onNewTask();
							},
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
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LeftRail_module_css_default.treeActions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: LeftRail_module_css_default.action,
										onClick: onOpenWorkspace,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: ui.grow,
												children: t("nav.openWorkspace")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: LeftRail_module_css_default.shortcut,
												children: commandShortcut("O")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: `${LeftRail_module_css_default.action} ${state.view === "plugins" ? LeftRail_module_css_default.actionActive : ""}`,
										onClick: () => {
											navigation.show("plugins");
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: 16 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: ui.grow,
											children: t("nav.plugins")
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: `${LeftRail_module_css_default.action} ${state.view === "learning" ? LeftRail_module_css_default.actionActive : ""}`,
										onClick: () => {
											navigation.show("learning");
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: ui.grow,
											children: t("nav.learning")
										})]
									})
								]
							}),
							hasRows ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: LeftRail_module_css_default.treeDivider,
								"aria-hidden": true
							}) : null,
							hasRows ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: LeftRail_module_css_default.group,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceRow, {
									group,
									collapsed: collapsed.has(group.workspaceId),
									onToggle: () => {
										toggleGroup(group.workspaceId);
									},
									onNewTask: () => {
										onNewTask(group.workspaceId);
									},
									onRename: () => {
										openRename(group);
									},
									onRemove: () => {
										openRemove(group);
									}
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
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("nav.noTasks") })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: LeftRail_module_css_default.foot,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
							label: t("account.menu"),
							placement: "up",
							align: "start",
							style: { flex: 1 },
							triggerClassName: LeftRail_module_css_default.accountTrigger,
							trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.BrandWordmark, { size: 24 }),
							rows: [
								{
									id: "settings",
									label: t("nav.settings"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, { size: 18 }),
									onSelect: () => {
										navigation.openSettings("general");
									}
								},
								{
									id: "usage",
									label: t("account.usage"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDataOutline16, { size: 18 }),
									onSelect: () => {
										navigation.openSettings("usage");
									}
								},
								{
									id: "models",
									label: t("settings.models"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 18 }),
									onSelect: () => {
										navigation.openSettings("models");
									}
								},
								{
									id: "plugins",
									label: t("nav.plugins"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: 18 }),
									onSelect: () => {
										navigation.show("plugins");
									}
								},
								{
									id: "agent-presets",
									label: t("settings.agentPresets"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}),
									onSelect: () => {
										navigation.openSettings("agentPresets");
									}
								},
								{
									id: "official",
									label: t("top.officialUi"),
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline16, { size: 18 }),
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
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: renameTarget !== void 0,
						onClose: closeRename,
						title: t("workspace.renameTitle"),
						closeLabel: t("common.close"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: renaming,
							onClick: closeRename,
							children: t("common.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: renaming || renameDraft.trim() === "" || renameTarget === void 0 || renameDraft.trim() === renameTarget.title,
							onClick: confirmRename,
							children: t("workspace.rename")
						})] }),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: LeftRail_module_css_default.workspaceInput,
							value: renameDraft,
							"aria-label": t("workspace.name"),
							autoFocus: true,
							disabled: renaming,
							onChange: (event) => {
								setRenameDraft(event.target.value);
								setRenameError(void 0);
							},
							onKeyDown: (event) => {
								if (event.key !== "Enter") return;
								event.preventDefault();
								confirmRename();
							}
						}), renameError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LeftRail_module_css_default.workspaceError,
							role: "alert",
							children: renameError
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: removeTarget !== void 0,
						onClose: closeRemove,
						title: t("workspace.removeTitle"),
						closeLabel: t("common.close"),
						description: removeTarget === void 0 ? void 0 : t("workspace.removeBody", { name: removeTarget.title }),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: removing,
							onClick: closeRemove,
							children: t("common.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: LeftRail_module_css_default.deleteConfirm,
							disabled: removing,
							onClick: confirmRemove,
							children: t("workspace.remove")
						})] }),
						children: [removing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LeftRail_module_css_default.workspaceStatus,
							role: "status",
							children: t("workspace.removePending")
						}) : null, removeError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: LeftRail_module_css_default.workspaceError,
							role: "alert",
							children: removeError
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\git\GitPanel.module.css.mjs
		const css$19 = ".gHyypa_panel{gap:var(--zx-space-3);flex-direction:column;display:flex}.gHyypa_head{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);font-weight:var(--zx-weight-medium);display:flex}.gHyypa_summary{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-2) var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);font-size:var(--zx-text-xs);color:var(--zx-label);display:flex}.gHyypa_summaryLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.gHyypa_branchRow{align-items:center;gap:var(--zx-space-2);min-width:0;font-size:var(--zx-text-xs);color:var(--zx-label-secondary);white-space:nowrap;display:flex}.gHyypa_workspaceRow{align-items:center;gap:var(--zx-space-2);min-width:0;max-width:100%;padding:var(--zx-space-1) 0;color:var(--zx-label-secondary);font-size:var(--zx-text-xs);white-space:nowrap;display:flex}.gHyypa_workspaceRow:hover:not(:disabled){color:var(--zx-label)}.gHyypa_workspaceRow>span,.gHyypa_branchRow>span{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.gHyypa_files{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);flex-direction:column;display:flex;overflow:hidden}.gHyypa_file{align-items:center;gap:var(--zx-space-3);width:100%;min-height:28px;padding:var(--zx-space-1) var(--zx-space-3);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.gHyypa_file+.gHyypa_file{border-top:1px solid var(--zx-border-soft)}.gHyypa_file:hover{background:var(--zx-bg-hover)}.gHyypa_file:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.gHyypa_fileActive{background:var(--zx-bg-active)}.gHyypa_code{width:16px;color:var(--zx-label-tertiary);font-family:var(--zx-font-mono);text-align:center;flex:none}.gHyypa_codeAdded{color:var(--zx-added)}.gHyypa_codeRemoved{color:var(--zx-removed)}.gHyypa_codeUntracked{color:var(--zx-warn)}.gHyypa_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);direction:rtl;flex:1;overflow:hidden}.gHyypa_commit{gap:var(--zx-space-2);flex-direction:column;display:flex}.gHyypa_input{width:100%;min-height:30px;padding:var(--zx-space-2) var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);resize:vertical;box-sizing:border-box}.gHyypa_input:focus{border-color:var(--zx-accent);box-shadow:var(--zx-focus-ring);outline:none}.gHyypa_note{color:var(--zx-label-muted);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body);overflow-wrap:anywhere}.gHyypa_noteError{color:var(--zx-error)}.gHyypa_actions{align-items:center;gap:var(--zx-space-2);display:flex}";
		const tagId$19 = "@dsh-portable/dcode-ui/GitPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$19) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$19;
			tag.textContent = css$19;
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
			"summaryLabel": "gHyypa_summaryLabel",
			"workspaceRow": "gHyypa_workspaceRow"
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
			const { groups } = useWorkspaceGroups();
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
					if (live && !result.ok) setNote({
						text: result.error.message,
						error: true
					});
				}).catch((cause) => {
					if (live) setNote({
						text: cause instanceof Error ? cause.message : String(cause),
						error: true
					});
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
				}).catch((cause) => {
					setNote({
						text: cause instanceof Error ? cause.message : String(cause),
						error: true
					});
				}).finally(() => {
					setCommitting(false);
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
			const workspace = groups.find((group) => group.path === cwd);
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
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
						label: t("workspace.select"),
						placement: "down",
						trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: workspace?.title ?? cwd.split(/[\\/\\]/).filter(Boolean).pop() ?? cwd }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						] }),
						rows: groups.map((group) => ({
							id: String(group.workspaceId),
							label: group.title,
							detail: group.path,
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
							active: group.workspaceId === workspace?.workspaceId,
							onSelect: () => {
								runtime.navigation?.startSession(group.workspaceId);
							}
						})),
						triggerClassName: GitPanel_module_css_default.workspaceRow
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
									disabled: true,
									active: branch.current
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
							"aria-label": t("git.commitPlaceholder"),
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
								role: note.error ? "alert" : "status",
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
		const css$18 = ".CAvRJW_viewer{gap:var(--zx-space-2);flex-direction:column;min-height:0;display:flex}.CAvRJW_head{align-items:center;gap:var(--zx-space-2);font-size:var(--zx-text-xs);color:var(--zx-label-secondary);display:flex}.CAvRJW_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);color:var(--zx-label);direction:rtl;flex:1;overflow:hidden}.CAvRJW_body{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);max-height:60vh;font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;line-height:1.6;position:relative;overflow:auto}.CAvRJW_body::-webkit-scrollbar{width:var(--zx-scrollbar-size);height:var(--zx-scrollbar-size)}.CAvRJW_body::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.CAvRJW_line{white-space:pre;align-items:baseline;min-width:max-content;display:flex}.CAvRJW_gutter{z-index:var(--zx-z-base);gap:var(--zx-space-3);padding:0 var(--zx-space-3);background:var(--zx-bg-card);border-right:1px solid var(--zx-border-soft);flex:none;display:flex;position:sticky;left:0}.CAvRJW_lineNo{text-align:right;min-width:3.5ch;color:var(--zx-label-tertiary);font-variant-numeric:tabular-nums;user-select:none}.CAvRJW_sign{width:2ch;padding-left:var(--zx-space-2);color:var(--zx-label-tertiary);user-select:none;flex:none}.CAvRJW_text{min-width:0;padding-right:var(--zx-space-3);flex:1}.CAvRJW_added{background:color-mix(in srgb, var(--zx-added) 12%, transparent);box-shadow:inset 2px 0 0 color-mix(in srgb, var(--zx-added) 70%, transparent)}.CAvRJW_added .CAvRJW_sign,.CAvRJW_added .CAvRJW_text{color:var(--zx-label)}.CAvRJW_added .CAvRJW_sign{color:var(--zx-added)}.CAvRJW_removed{background:color-mix(in srgb, var(--zx-removed) 12%, transparent);box-shadow:inset 2px 0 0 color-mix(in srgb, var(--zx-removed) 70%, transparent)}.CAvRJW_removed .CAvRJW_sign,.CAvRJW_removed .CAvRJW_text{color:var(--zx-label)}.CAvRJW_removed .CAvRJW_sign{color:var(--zx-removed)}.CAvRJW_hunk{z-index:var(--zx-z-sticky);gap:var(--zx-space-3);padding:2px var(--zx-space-3);background:var(--zx-bg-panel);border-top:1px solid var(--zx-border-soft);border-bottom:1px solid var(--zx-border-soft);position:sticky;top:0}.CAvRJW_line.CAvRJW_hunk:first-child{border-top:0}.CAvRJW_range{color:var(--zx-accent);font-variant-numeric:tabular-nums;flex:none}.CAvRJW_section{text-overflow:ellipsis;min-width:0;color:var(--zx-label-muted);overflow:hidden}.CAvRJW_meta{color:var(--zx-label-tertiary);font-style:italic}.CAvRJW_note{color:var(--zx-label-muted);font-size:var(--zx-text-micro)}";
		const tagId$18 = "@dsh-portable/dcode-ui/DiffViewer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$18) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$18;
			tag.textContent = css$18;
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
		/**
		* Read the newest whole-list todo snapshot from the transcript.
		*
		* The live `todos` projection is preferred by surfaces that have it, but this
		* replay fallback keeps the plan visible while an older connection is still
		* assembling that projection.
		*/
		function latestTodos(nodes) {
			for (let index = nodes.length - 1; index >= 0; index -= 1) {
				const node = nodes[index];
				if (node?.kind !== "tool-result") continue;
				for (const block of walkCalls$1(node)) {
					if (("isError" in block ? block.call?.name : block.name) !== "todo_write") continue;
					const todos = parseArgs("isError" in block ? block.call?.argsRaw : block.argsRaw).todos;
					if (!Array.isArray(todos)) continue;
					return todos.filter((row) => {
						if (typeof row !== "object" || row === null) return false;
						const value = row;
						return typeof value.content === "string" && (value.status === "pending" || value.status === "in_progress" || value.status === "completed");
					});
				}
			}
			return [];
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
		const css$17 = ".LDWigW_output{max-height:420px;padding:var(--zx-space-3);border-radius:var(--zx-radius-sm);background:var(--zx-bg-panel);color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);line-height:var(--zx-leading-code);tab-size:4;scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;margin:0;overflow:auto}.LDWigW_output::-webkit-scrollbar{width:var(--zx-scrollbar-size);height:var(--zx-scrollbar-size)}.LDWigW_output::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.LDWigW_wrap{white-space:pre-wrap;overflow-wrap:anywhere}.LDWigW_nowrap{white-space:pre}.LDWigW_truncated{color:var(--zx-label-tertiary);font-style:italic}.LDWigW_toolbar{align-items:center;gap:var(--zx-space-1);margin-left:auto;display:inline-flex}.LDWigW_action{min-height:var(--zx-control-xs);border-radius:var(--zx-radius-sm);padding:2px var(--zx-space-2);color:var(--zx-label-tertiary);font:inherit;font-size:var(--zx-text-micro);text-transform:none;letter-spacing:0;cursor:pointer;background:0 0;border:0}.LDWigW_action:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.LDWigW_action:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.LDWigW_actionOn{background:var(--zx-bg-active);color:var(--zx-label-secondary)}";
		const tagId$17 = "@dsh-portable/dcode-ui/AnsiOutput.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$17) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$17;
			tag.textContent = css$17;
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
			if (span.bold === true) style.fontWeight = "var(--zx-weight-semibold)";
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
				tabIndex: 0,
				role: "region",
				"aria-label": t("details.output"),
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
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CopyButton, {
					text: stripAnsi(text),
					label: t("common.copy"),
					copiedLabel: t("common.copied")
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\Aside.module.css.mjs
		const css$16 = ".eKmfWW_aside{flex-direction:column;min-width:0;height:100%;display:flex;overflow:hidden}.eKmfWW_header{flex:none}.eKmfWW_headerClose{width:26px;height:var(--zx-control-xs);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.eKmfWW_headerClose:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.eKmfWW_headerClose:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.eKmfWW_headerTitle{flex:1;min-width:0}.eKmfWW_tabs{align-items:center;gap:var(--zx-space-4);margin:0 var(--zx-space-3);padding:0 var(--zx-space-1);border-bottom:1px solid var(--zx-border-soft);flex:none;display:flex}.eKmfWW_tab{min-width:0;height:var(--zx-control-sm);padding:0 var(--zx-space-1);border-radius:var(--zx-radius-sm) var(--zx-radius-sm) 0 0;color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;background:0 0;border:0;flex:none}.eKmfWW_tab:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.eKmfWW_tabActive{color:var(--zx-label);box-shadow:inset 0 -1px 0 var(--zx-label-secondary)}.eKmfWW_body{min-height:0;padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-6);gap:var(--zx-space-6);scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;flex-direction:column;flex:0 auto;display:flex;overflow:hidden auto}.eKmfWW_body::-webkit-scrollbar{width:var(--zx-scrollbar-size)}.eKmfWW_body::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.eKmfWW_section{gap:var(--zx-space-2);flex-direction:column;display:flex}.eKmfWW_sectionHead{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);font-weight:var(--zx-weight-medium);display:flex}.eKmfWW_goal{gap:var(--zx-space-3);padding:var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);display:flex}.eKmfWW_goalText{min-width:0;font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);color:var(--zx-label);overflow-wrap:anywhere;flex:1}.eKmfWW_goalMeta{margin-top:var(--zx-space-1);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}.eKmfWW_step{align-items:flex-start;gap:var(--zx-space-3);padding:var(--zx-space-1) 0;font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);color:var(--zx-label-secondary);display:flex}.eKmfWW_stepDone{color:var(--zx-label-tertiary);text-decoration:line-through;text-decoration-color:var(--zx-border)}.eKmfWW_stepActive{color:var(--zx-label)}.eKmfWW_stepMark{color:var(--zx-label-decor);flex:none;margin-top:2px}.eKmfWW_stepMarkDone{color:var(--zx-success)}.eKmfWW_stepProgress,.eKmfWW_stepPending{border-radius:50%;width:12px;height:12px;margin:2px;display:block}.eKmfWW_stepProgress{border:1.5px solid color-mix(in srgb, var(--zx-accent) 28%, transparent);border-top-color:var(--zx-accent);animation:.7s linear infinite eKmfWW_zx-step-spin}.eKmfWW_stepPending{border:1px solid var(--zx-label-tertiary)}@keyframes eKmfWW_zx-step-spin{to{transform:rotate(360deg)}}.eKmfWW_detailBlock{gap:var(--zx-space-2);flex-direction:column;display:flex}.eKmfWW_detailRow{align-items:center;gap:var(--zx-space-2);display:flex}.eKmfWW_detailLabel{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);text-transform:uppercase;letter-spacing:.04em}.eKmfWW_filePath{color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);overflow-wrap:anywhere}.eKmfWW_fileMeta{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;flex-wrap:wrap;display:flex}.eKmfWW_pre{max-height:340px;padding:var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-sm);background:var(--zx-bg-card);color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);line-height:var(--zx-leading-code);white-space:pre-wrap;overflow-wrap:anywhere;margin:0;overflow:auto}@media (prefers-reduced-motion:reduce){.eKmfWW_stepProgress{animation:none}}";
		const tagId$16 = "@dsh-portable/dcode-ui/Aside.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$16) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$16;
			tag.textContent = css$16;
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
			"header": "eKmfWW_header",
			"headerClose": "eKmfWW_headerClose",
			"headerTitle": "eKmfWW_headerTitle",
			"pre": "eKmfWW_pre",
			"section": "eKmfWW_section",
			"sectionHead": "eKmfWW_sectionHead",
			"step": "eKmfWW_step",
			"stepActive": "eKmfWW_stepActive",
			"stepDone": "eKmfWW_stepDone",
			"stepMark": "eKmfWW_stepMark",
			"stepMarkDone": "eKmfWW_stepMarkDone",
			"stepPending": "eKmfWW_stepPending",
			"stepProgress": "eKmfWW_stepProgress",
			"tab": "eKmfWW_tab",
			"tabActive": "eKmfWW_tabActive",
			"tabs": "eKmfWW_tabs",
			"zx-step-spin": "eKmfWW_zx-step-spin"
		};
		//#endregion
		//#region src/client/shell/Aside.tsx
		/**
		* The floating right card: Git changes, Goal and Progress, and the details of
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
		/** Goal and Progress. */
		function GoalPanel({ sessionId }) {
			const t = useT();
			const goal = useProjectionValue(sessionId, "goal");
			const projectedTodos = useProjectionValue(sessionId, "todos");
			const chat = useChatSnapshot(sessionId);
			const fallbackTodos = (0, react.useMemo)(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
			const todos = projectedTodos === void 0 ? fallbackTodos : projectedTodos ?? [];
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
						children: todo.status === "completed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, {}) : todo.status === "in_progress" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Aside_module_css_default.stepProgress,
							"aria-hidden": true
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Aside_module_css_default.stepPending,
							"aria-hidden": true
						})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: todo.content })]
				}, `${String(index)}:${todo.content}`))]
			})] });
		}
		/** Arguments and output of the tool call the operator last opened. */
		function DetailsPanel({ sessionId, callId, cwd, diff }) {
			const runtime = useRuntime();
			const t = useT();
			const chat = useChatSnapshot(sessionId);
			const trajectory = useTrajectorySnapshot(sessionId);
			const [wrap, setWrap] = (0, react.useState)(true);
			const block = (0, react.useMemo)(() => {
				if (callId === void 0) return void 0;
				const nodes = trajectory === void 0 || trajectory.eventNodes.length === 0 ? chat?.legacy.nodes ?? [] : trajectory.eventNodes;
				for (const node of nodes) {
					if (node.kind !== "tool-result") continue;
					for (const candidate of walkCalls(node)) if (candidate.callId === callId) return candidate;
				}
				const runningCalls = trajectory === void 0 || trajectory.runningCalls.length === 0 ? chat?.legacy.runningCalls ?? [] : trajectory.runningCalls;
				for (const running of runningCalls) for (const candidate of walkCalls(running)) if (candidate.callId === callId) return candidate;
			}, [
				chat,
				trajectory,
				callId
			]);
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
							tabIndex: 0,
							role: "region",
							"aria-label": t("details.file"),
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
							tabIndex: 0,
							role: "region",
							"aria-label": t("details.arguments"),
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
							tabIndex: 0,
							role: "region",
							"aria-label": t("details.output"),
							children: "—"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnsiOutput, {
							text: output,
							wrap
						})]
					}) : null
				]
			});
		}
		/** The docked preview sidebar with its three content views. */
		function Aside({ navigation, sessionId, cwd }) {
			const t = useT();
			const state = useNavigation(navigation);
			const tabPrefix = (0, react.useId)();
			const tabRefs = (0, react.useRef)({
				changes: null,
				goal: null,
				details: null
			});
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
			const panelId = `${tabPrefix}-panel`;
			const moveTab = (event, index) => {
				if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
				event.preventDefault();
				const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
				const tab = tabs[next];
				if (tab === void 0) return;
				navigation.openAside(tab.id);
				tabRefs.current[tab.id]?.focus();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: Aside_module_css_default.aside,
				"aria-label": t("details.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: `${Aside_module_css_default.header} ${ui.cardHeader}`,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Aside_module_css_default.headerTitle,
							children: t("aside.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Aside_module_css_default.headerClose,
							"aria-label": t("aside.close"),
							onClick: () => {
								navigation.toggleAside();
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Aside_module_css_default.tabs,
						role: "tablist",
						"aria-label": t("aside.title"),
						children: tabs.map((tab, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							ref: (element) => {
								tabRefs.current[tab.id] = element;
							},
							type: "button",
							role: "tab",
							id: `${tabPrefix}-${tab.id}`,
							"aria-selected": state.aside === tab.id,
							"aria-controls": panelId,
							tabIndex: state.aside === tab.id ? 0 : -1,
							className: `${Aside_module_css_default.tab} ${state.aside === tab.id ? Aside_module_css_default.tabActive : ""}`,
							onClick: () => {
								navigation.openAside(tab.id);
							},
							onKeyDown: (event) => {
								moveTab(event, index);
							},
							children: tab.label
						}, tab.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						id: panelId,
						className: Aside_module_css_default.body,
						role: "tabpanel",
						tabIndex: 0,
						"aria-labelledby": `${tabPrefix}-${state.aside}`,
						"aria-label": tabs.find((tab) => tab.id === state.aside)?.label,
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
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\SummaryCard.module.css.mjs
		const css$15 = ".X_PnOW_card{z-index:var(--zx-z-popover);top:calc(var(--zx-topbar-height) + var(--zx-space-2));right:var(--zx-space-4);width:min(320px, calc(100% - var(--zx-space-4) * 2));max-height:calc(100% - var(--zx-topbar-height) - var(--zx-space-5));border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-xl);background:var(--zx-bg-card);box-shadow:var(--zx-shadow-panel);backdrop-filter:blur(20px)saturate(130%);scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;animation:X_PnOW_cardIn var(--zx-motion-fast) ease-out;flex-direction:column;display:flex;position:absolute;overflow:hidden auto}.X_PnOW_card::-webkit-scrollbar{width:var(--zx-scrollbar-size);height:var(--zx-scrollbar-size)}.X_PnOW_card::-webkit-scrollbar-thumb{border-radius:var(--zx-radius-pill);background:var(--zx-border);background-clip:padding-box;border:2px solid #0000}@keyframes X_PnOW_cardIn{0%{opacity:0;transform:translateY(-6px)}}.X_PnOW_header{flex:none}.X_PnOW_title{flex:1;min-width:0}.X_PnOW_close{width:26px;height:var(--zx-control-xs);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);cursor:pointer;background:0 0;border:0;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.X_PnOW_close:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.X_PnOW_close:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.X_PnOW_rows{padding:0 var(--zx-space-2) var(--zx-space-2);flex-direction:column;display:flex}.X_PnOW_row{align-items:center;gap:var(--zx-space-3);width:100%;min-height:var(--zx-control-lg);padding:0 var(--zx-space-2);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);text-align:left;box-sizing:border-box;background:0 0;border:0;display:flex}.X_PnOW_rowAction{cursor:pointer}.X_PnOW_rowAction:hover{background:var(--zx-bg-hover)}.X_PnOW_rowAction:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.X_PnOW_rowIcon{color:var(--zx-label-muted);flex:none;display:inline-flex}.X_PnOW_rowLabel{color:var(--zx-label);flex:none}.X_PnOW_rowValue{align-items:center;gap:var(--zx-space-2);min-width:0;color:var(--zx-label-secondary);font-size:var(--zx-text-xs);flex:1;justify-content:flex-end;display:flex}.X_PnOW_rowChevron{color:var(--zx-label-tertiary);flex:none;display:inline-flex}.X_PnOW_truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.X_PnOW_counts{gap:var(--zx-space-2);font-variant-numeric:tabular-nums;display:inline-flex}.X_PnOW_added{color:var(--zx-success)}.X_PnOW_removed{color:var(--zx-error)}.X_PnOW_muted{color:var(--zx-label-muted)}.X_PnOW_empty{padding:0 var(--zx-space-4) var(--zx-space-4);color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);margin:0}@media (prefers-reduced-motion:reduce){.X_PnOW_card{animation:none}}";
		const tagId$15 = "@dsh-portable/dcode-ui/SummaryCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$15) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$15;
			tag.textContent = css$15;
			document.head.appendChild(tag);
		}
		var SummaryCard_module_css_default = {
			"added": "X_PnOW_added",
			"card": "X_PnOW_card",
			"cardIn": "X_PnOW_cardIn",
			"close": "X_PnOW_close",
			"counts": "X_PnOW_counts",
			"empty": "X_PnOW_empty",
			"header": "X_PnOW_header",
			"muted": "X_PnOW_muted",
			"removed": "X_PnOW_removed",
			"row": "X_PnOW_row",
			"rowAction": "X_PnOW_rowAction",
			"rowChevron": "X_PnOW_rowChevron",
			"rowIcon": "X_PnOW_rowIcon",
			"rowLabel": "X_PnOW_rowLabel",
			"rowValue": "X_PnOW_rowValue",
			"rows": "X_PnOW_rows",
			"title": "X_PnOW_title",
			"truncate": "X_PnOW_truncate"
		};
		//#endregion
		//#region src/client/shell/SummaryCard.tsx
		/**
		* The environment summary: what this task is working on, at a glance.
		*
		* A card the top bar summons and dismisses, anchored under its own control at
		* the right of the conversation column — deliberately not the preview
		* sidebar, which is where the same facts are worked rather than read. Every
		* row is the digest of one panel and opens it: the change counts open
		* Changes, the goal opens Goal.
		*
		* Nothing here is state of its own. The counts come from the same git read
		* the Changes panel uses, the goal from the host projection the official goal
		* bar renders, and the workspace from the durable registry.
		* @module @dsh-portable/dcode-ui/client/shell/SummaryCard
		*/
		/** One digest line: an icon, what it is, and the value it stands for. */
		function Row$1(props) {
			const body = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SummaryCard_module_css_default.rowIcon,
					"aria-hidden": true,
					children: props.icon
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SummaryCard_module_css_default.rowLabel,
					children: props.label
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SummaryCard_module_css_default.rowValue,
					children: props.value
				}),
				props.onOpen === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SummaryCard_module_css_default.rowChevron,
					"aria-hidden": true,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
				})
			] });
			if (props.onOpen === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SummaryCard_module_css_default.row,
				title: props.title,
				role: props.ariaLabel === void 0 ? void 0 : "note",
				tabIndex: props.ariaLabel === void 0 ? void 0 : 0,
				"aria-label": props.ariaLabel,
				children: body
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: `${SummaryCard_module_css_default.row} ${SummaryCard_module_css_default.rowAction}`,
				title: props.title,
				onClick: props.onOpen,
				children: body
			});
		}
		/** The environment digest, or null while the top bar keeps it closed. */
		function SummaryCard({ navigation, sessionId, cwd, open }) {
			const t = useT();
			const { groups } = useWorkspaceGroups();
			const git = useGitStatus(cwd, sessionId);
			const goal = useProjectionValue(sessionId, "goal");
			const projectedTodos = useProjectionValue(sessionId, "todos");
			const chat = useChatSnapshot(sessionId);
			const fallbackTodos = (0, react.useMemo)(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
			const todos = projectedTodos === void 0 ? fallbackTodos : projectedTodos ?? [];
			const workspace = (0, react.useMemo)(() => groups.find((group) => group.path === cwd) ?? groups.find((group) => group.sessions.some((row) => row.id === sessionId)), [
				groups,
				cwd,
				sessionId
			]);
			if (!open) return null;
			const status = git.status;
			const repository = status?.repository === true;
			const dirty = (status?.files.length ?? 0) > 0;
			const done = todos.filter((todo) => todo.status === "completed").length;
			const objective = goal?.goal.objective;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SummaryCard_module_css_default.card,
				"aria-label": t("summary.title"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: `${SummaryCard_module_css_default.header} ${ui.cardHeader}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SummaryCard_module_css_default.title,
						children: t("summary.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SummaryCard_module_css_default.close,
						"aria-label": t("summary.close"),
						onClick: () => {
							navigation.toggleSummary(false);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
					})]
				}), workspace === void 0 && !repository ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: SummaryCard_module_css_default.empty,
					children: t("chat.empty.noWorkspace")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SummaryCard_module_css_default.rows,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row$1, {
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCodeOutline16, {}),
							label: t("git.changes"),
							title: t("summary.openChanges"),
							value: !repository ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SummaryCard_module_css_default.muted,
								children: t("top.noRepository")
							}) : dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SummaryCard_module_css_default.counts,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SummaryCard_module_css_default.added,
									children: ["+", status?.insertions ?? 0]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SummaryCard_module_css_default.removed,
									children: ["-", status?.deletions ?? 0]
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SummaryCard_module_css_default.muted,
								children: t("git.clean")
							}),
							onOpen: () => {
								navigation.openAside("changes");
							}
						}),
						workspace === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row$1, {
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenOutline16, {}),
							label: t("summary.local"),
							title: workspace.path,
							ariaLabel: workspace.path,
							value: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SummaryCard_module_css_default.truncate,
								children: workspace.title
							})
						}),
						!repository ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row$1, {
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}),
							label: t("top.branch"),
							value: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SummaryCard_module_css_default.truncate,
								children: status?.branch ?? (status?.detached === true ? "HEAD" : t("top.branch"))
							})
						}),
						objective === void 0 || objective === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row$1, {
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconGoalOutline16, {}),
							label: t("goal.title"),
							title: objective,
							value: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SummaryCard_module_css_default.truncate,
								children: objective
							}),
							onOpen: () => {
								navigation.openAside("goal");
							}
						}),
						todos.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row$1, {
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, { size: 16 }),
							label: t("plan.title"),
							value: t("plan.progress", {
								done,
								total: todos.length
							}),
							onOpen: () => {
								navigation.openAside("goal");
							}
						})
					]
				})]
			});
		}
		//#endregion
		//#region src/client/shell/use-modal-focus.ts
		const FOCUSABLE = [
			"a[href]",
			"button:not(:disabled)",
			"input:not(:disabled)",
			"select:not(:disabled)",
			"textarea:not(:disabled)",
			"[tabindex]:not([tabindex=\"-1\"])"
		].join(",");
		/** Focus the first control in a modal, trap Tab, and restore the opener. */
		function useModalFocus(open, panelRef, options = {}) {
			const returnFocus = (0, react.useRef)(null);
			const wasOpen = (0, react.useRef)(false);
			const onCloseRef = (0, react.useRef)(options.onClose);
			const initialFocusRef = (0, react.useRef)(options.initialFocusRef);
			onCloseRef.current = options.onClose;
			initialFocusRef.current = options.initialFocusRef;
			(0, react.useEffect)(() => {
				const restore = () => {
					const target = returnFocus.current;
					returnFocus.current = null;
					if (target !== null && target.isConnected) target.focus();
				};
				if (!open) {
					if (wasOpen.current) {
						wasOpen.current = false;
						restore();
					}
					return;
				}
				wasOpen.current = true;
				returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
				const panel = panelRef.current;
				const initial = initialFocusRef.current?.current;
				const focusables = panel === null ? [] : Array.from(panel.querySelectorAll(FOCUSABLE));
				(initial ?? focusables[0] ?? panel)?.focus();
				const onKeyDown = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						onCloseRef.current?.();
						return;
					}
					if (event.key !== "Tab" || panel === null) return;
					const current = Array.from(panel.querySelectorAll(FOCUSABLE));
					if (current.length === 0) {
						event.preventDefault();
						panel.focus();
						return;
					}
					const first = current[0];
					const last = current[current.length - 1];
					if (event.shiftKey && document.activeElement === first) {
						event.preventDefault();
						last?.focus();
					} else if (!event.shiftKey && document.activeElement === last) {
						event.preventDefault();
						first?.focus();
					}
				};
				document.addEventListener("keydown", onKeyDown, true);
				return () => {
					document.removeEventListener("keydown", onKeyDown, true);
					if (wasOpen.current) restore();
				};
			}, [open, panelRef]);
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\ContextMeter.module.css.mjs
		const css$14 = ".l88znq_root{display:inline-flex;position:relative}.l88znq_trigger{width:var(--zx-control-sm);height:var(--zx-control-sm);border-radius:var(--zx-radius-pill);color:var(--zx-label-secondary);cursor:pointer;background:0 0;border:0;place-items:center;padding:0;display:grid}.l88znq_trigger:hover{background:var(--zx-bg-hover)}.l88znq_trigger:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.l88znq_track,.l88znq_fill{fill:none;stroke-width:2px}.l88znq_track{stroke:var(--zx-border)}.l88znq_fill{stroke:var(--zx-label-secondary);stroke-linecap:round}.l88znq_panel{right:0;bottom:calc(100% + var(--zx-space-2));z-index:var(--zx-z-popover);box-sizing:border-box;width:264px;padding:var(--zx-space-4);border:1px solid var(--zx-border);border-radius:var(--zx-radius-lg);background:var(--zx-bg-overlay);box-shadow:var(--zx-shadow-popover);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);position:absolute}.l88znq_header,.l88znq_row{align-items:center;gap:var(--zx-space-2);display:flex}.l88znq_header b{color:var(--zx-label);font-weight:var(--zx-weight-medium)}.l88znq_figures{color:var(--zx-label);font-variant-numeric:tabular-nums;margin-left:auto}.l88znq_bar{height:4px;margin:var(--zx-space-3) 0;border-radius:var(--zx-radius-pill);background:var(--zx-bg-hover);gap:1px;display:flex;overflow:hidden}.l88znq_segment{background:var(--zx-label-secondary);min-width:2px;height:100%}.l88znq_system,.l88znq_swatch.l88znq_system{background:#8b9bb8}.l88znq_tools,.l88znq_swatch.l88znq_tools{background:#a78bfa}.l88znq_messages,.l88znq_swatch.l88znq_messages{background:#5aa7ff}.l88znq_rows{margin:0}.l88znq_row{justify-content:space-between;padding:2px 0}.l88znq_row dt,.l88znq_row dd{margin:0}.l88znq_swatch{width:8px;height:8px;margin-right:var(--zx-space-2);vertical-align:baseline;border-radius:2px;display:inline-block}.l88znq_row dd{color:var(--zx-label);font-variant-numeric:tabular-nums}";
		const tagId$14 = "@dsh-portable/dcode-ui/ContextMeter.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$14) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$14;
			tag.textContent = css$14;
			document.head.appendChild(tag);
		}
		var ContextMeter_module_css_default = {
			"bar": "l88znq_bar",
			"figures": "l88znq_figures",
			"fill": "l88znq_fill",
			"header": "l88znq_header",
			"messages": "l88znq_messages",
			"panel": "l88znq_panel",
			"root": "l88znq_root",
			"row": "l88znq_row",
			"rows": "l88znq_rows",
			"segment": "l88znq_segment",
			"swatch": "l88znq_swatch",
			"system": "l88znq_system",
			"tools": "l88znq_tools",
			"track": "l88znq_track",
			"trigger": "l88znq_trigger"
		};
		//#endregion
		//#region src/client/shell/ContextMeter.tsx
		function formatTokens(value) {
			if (value < 1e3) return String(Math.round(value));
			if (value < 1e6) return `${String(Math.round(value / 100) / 10)}K`;
			return `${String(Math.round(value / 1e5) / 10)}M`;
		}
		/** Compact context usage affordance beside the composer send control. */
		function ContextMeter({ sessionId }) {
			const t = useT();
			const pressure = useProjectionValue(sessionId, "contextPressure");
			const breakdown = useProjectionValue(sessionId, "contextBreakdown");
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const panelRef = (0, react.useRef)(null);
			const panelId = (0, react.useId)();
			const titleId = (0, react.useId)();
			const used = pressure?.projectedTokens ?? pressure?.pressureTokens;
			const capacity = pressure?.contextWindow;
			const percent = used === void 0 || capacity === void 0 || capacity <= 0 ? void 0 : Math.min(100, Math.round(used / capacity * 100));
			useModalFocus(open, panelRef, { onClose: () => {
				setOpen(false);
			} });
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onPointerDown = (event) => {
					if (event.target instanceof Node && rootRef.current?.contains(event.target) === true) return;
					setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown);
				};
			}, [open]);
			(0, react.useEffect)(() => {
				if (percent === void 0 && open) setOpen(false);
			}, [open, percent]);
			if (percent === void 0 || used === void 0 || capacity === void 0) return null;
			const label = t("context.aria", { percent: `${String(percent)}%` });
			const totalBreakdown = breakdown === void 0 ? 0 : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
			const rows = breakdown === void 0 || totalBreakdown === 0 ? [] : [
				{
					key: "context.system",
					value: breakdown.systemTokens,
					className: ContextMeter_module_css_default.system
				},
				{
					key: "context.tools",
					value: breakdown.toolsTokens,
					className: ContextMeter_module_css_default.tools
				},
				{
					key: "context.messages",
					value: breakdown.messageTokens,
					className: ContextMeter_module_css_default.messages
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				ref: rootRef,
				className: ContextMeter_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: ContextMeter_module_css_default.trigger,
					"aria-label": label,
					"aria-haspopup": "dialog",
					"aria-expanded": open,
					"aria-controls": open ? panelId : void 0,
					onClick: () => {
						setOpen((value) => !value);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
						viewBox: "0 0 14 14",
						width: "14",
						height: "14",
						"aria-hidden": true,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: ContextMeter_module_css_default.track,
							cx: "7",
							cy: "7",
							r: "5.5"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
							className: ContextMeter_module_css_default.fill,
							cx: "7",
							cy: "7",
							r: "5.5",
							strokeDasharray: `${String(2 * Math.PI * 5.5 * percent / 100)} ${String(2 * Math.PI * 5.5)}`,
							transform: "rotate(-90 7 7)"
						})]
					})
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					id: panelId,
					className: ContextMeter_module_css_default.panel,
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": titleId,
					tabIndex: -1,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ContextMeter_module_css_default.header,
							id: titleId,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("context.used") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("b", { children: [percent, "%"] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ContextMeter_module_css_default.figures,
									children: t("context.tokens", {
										used: formatTokens(used),
										total: formatTokens(capacity)
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: ContextMeter_module_css_default.bar,
							"aria-hidden": true,
							children: rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ContextMeter_module_css_default.segment,
								style: { width: `${String(percent)}%` }
							}) : rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${ContextMeter_module_css_default.segment} ${row.className}`,
								style: { width: `${String(percent * row.value / totalBreakdown)}%` }
							}, row.key))
						}),
						rows.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dl", {
							className: ContextMeter_module_css_default.rows,
							children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: ContextMeter_module_css_default.row,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dt", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `${ContextMeter_module_css_default.swatch} ${row.className}`,
									"aria-hidden": true
								}), t(row.key)] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: formatTokens(row.value) })]
							}, row.key))
						})
					]
				}) : null]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\Composer.module.css.mjs
		const css$13 = ".SmCagG_dock{padding:0 var(--zx-space-5) var(--zx-space-5);flex:none}.SmCagG_shell{box-sizing:border-box;width:min(var(--zx-reading-width), 100%);border:1px solid color-mix(in srgb, var(--zx-label) 14%, transparent);border-radius:var(--zx-radius-2xl);background:var(--zx-bg-card);box-shadow:var(--zx-shadow-panel);transition:border-color var(--zx-motion), box-shadow var(--zx-motion);margin:0 auto;position:relative}.SmCagG_shellFocused{border-color:color-mix(in srgb, var(--zx-accent) 55%, var(--zx-border));box-shadow:var(--zx-shadow-panel), 0 0 0 1px color-mix(in srgb, var(--zx-accent) 18%, transparent)}.SmCagG_dropActive{border-color:var(--zx-accent)}.SmCagG_dropOverlay{z-index:var(--zx-z-sticky);justify-content:center;align-items:center;gap:var(--zx-space-1);border-radius:inherit;background:color-mix(in srgb, var(--zx-bg-card) 92%, var(--zx-accent));color:var(--zx-label);pointer-events:none;flex-direction:column;display:flex;position:absolute;inset:0}.SmCagG_dropOverlay span{color:var(--zx-label-secondary);font-size:var(--zx-text-xs)}.SmCagG_inputArea{min-width:0}.SmCagG_input{width:100%;min-height:56px;max-height:40vh;color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);resize:none;box-sizing:border-box;background:0 0;border:0;padding:12px 15px 6px;display:block;overflow-y:auto}.SmCagG_input:focus{outline:none}.SmCagG_input::placeholder{color:var(--zx-label-tertiary)}.SmCagG_fileInput{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}.SmCagG_attachmentRail{gap:var(--zx-space-2);flex-wrap:wrap;padding:0 15px 10px;display:flex}.SmCagG_attachment{align-items:center;gap:var(--zx-space-2);max-width:230px;min-height:var(--zx-control-lg);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:color-mix(in srgb, var(--zx-bg-panel) 78%, var(--zx-bg-card));color:var(--zx-label-secondary);font-size:var(--zx-text-xs);padding:4px 26px 4px 5px;display:flex;position:relative}.SmCagG_attachmentPreview{width:38px;height:var(--zx-control-md);border-radius:var(--zx-radius-sm);object-fit:cover;background:var(--zx-bg-hover);flex:none}.SmCagG_attachmentFile{align-items:center;gap:var(--zx-space-2);min-width:0;display:inline-flex}.SmCagG_attachmentFile>span{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.SmCagG_attachmentMeta{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);white-space:nowrap}.SmCagG_attachmentRemove{width:var(--zx-control-xs);height:var(--zx-control-xs);border-radius:var(--zx-radius-pill);color:var(--zx-label-muted);cursor:pointer;background:0 0;border:0;place-items:center;padding:0;display:grid;position:absolute;top:4px;right:4px}.SmCagG_attachmentRemove:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.SmCagG_attachmentRemove:disabled{cursor:default;opacity:var(--zx-opacity-disabled)}.SmCagG_attachmentRemove:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.SmCagG_controls{justify-content:space-between;align-items:center;gap:var(--zx-space-2);min-width:0;padding:4px 9px 9px;display:flex}.SmCagG_leadingControls,.SmCagG_trailingControls{align-items:center;gap:2px;min-width:0;display:flex}.SmCagG_attachButton{width:28px;height:var(--zx-control-sm);border-radius:var(--zx-radius-pill);color:var(--zx-label-muted);cursor:pointer;background:0 0;border:0;flex:0 0 28px;place-items:center;padding:0;display:grid}.SmCagG_attachButton:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.SmCagG_attachButton:disabled{cursor:default;opacity:var(--zx-opacity-disabled)}.SmCagG_attachButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.SmCagG_leadingControls{flex:auto}.SmCagG_trailingControls{flex:0 auto;justify-content:flex-end;margin-left:auto}.SmCagG_leadingControls>*,.SmCagG_trailingControls>*,.SmCagG_leadingControls>*>button,.SmCagG_trailingControls>*>button{min-width:0}.SmCagG_control{min-width:0;height:var(--zx-control-sm);color:var(--zx-label-secondary);font-size:var(--zx-text-sm);line-height:20px;font-weight:var(--zx-weight-medium);align-items:center;gap:4px;padding:0;display:inline-flex}.SmCagG_controlTrigger{max-width:220px;height:var(--zx-control-sm);border-radius:var(--zx-radius-pill);color:var(--zx-label-secondary);font-size:var(--zx-text-sm);line-height:20px;font-weight:var(--zx-weight-medium);padding:0 5px 0 7px}.SmCagG_controlTrigger:hover:not(:disabled){background:var(--zx-bg-hover)}.SmCagG_controlTrigger:disabled{color:var(--zx-label-tertiary)}.SmCagG_permissionRead{color:var(--zx-label-secondary)}.SmCagG_permissionWrite{color:var(--zx-accent)}.SmCagG_permissionDanger{color:var(--zx-warn)}.SmCagG_control svg{flex:none;width:14px;height:14px}.SmCagG_controlChevron{color:var(--zx-label-muted)}.SmCagG_modelTrigger .SmCagG_controlLabel{color:var(--zx-label)}.SmCagG_reasoningTrigger .SmCagG_controlLabel{color:var(--zx-label-muted)}.SmCagG_controlLabel{text-overflow:ellipsis;white-space:nowrap;flex:auto;min-width:0;display:inline-block;overflow:hidden}.SmCagG_permissionMenu{width:min(320px,100vw - 32px);min-width:min(280px,100vw - 32px)}.SmCagG_permissionMenu>button{border-radius:var(--zx-radius-md);align-items:flex-start;min-height:44px;padding:7px 10px;line-height:18px}.SmCagG_permissionMenu>button>span{white-space:normal}.SmCagG_permissionMenu>button>span>span{white-space:normal;text-overflow:clip;overflow:visible}.SmCagG_permissionMenu>button>svg{flex:none;margin-top:2px}.SmCagG_modelMenu{min-width:min(250px,100vw - 32px);max-height:min(60vh,420px)}.SmCagG_send{width:34px;height:var(--zx-control-lg);border-radius:var(--zx-radius-pill);background:var(--zx-label);color:var(--zx-bg-app);cursor:pointer;box-shadow:var(--zx-shadow-card);transition:background var(--zx-motion-fast), opacity var(--zx-motion-fast), transform var(--zx-motion-fast);border:0;flex:0 0 34px;place-items:center;padding:0;display:grid}.SmCagG_send:hover:not(:disabled){background:color-mix(in srgb, var(--zx-label) 88%, var(--zx-bg-app));transform:translateY(-1px)}.SmCagG_send:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.SmCagG_send:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.SmCagG_stop{background:var(--zx-bg-active);color:var(--zx-label)}.SmCagG_send svg{width:16px;height:16px}.SmCagG_error{padding:0 var(--zx-space-4) var(--zx-space-1);color:var(--zx-error);font-size:var(--zx-text-xs);line-height:var(--zx-leading-tight)}.SmCagG_headerRow{width:min(var(--zx-reading-width), 100%);margin:0 auto var(--zx-space-2);align-items:center;gap:var(--zx-space-2);display:flex}.SmCagG_projectChip{align-items:center;gap:var(--zx-space-2);padding:var(--zx-space-1) var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;transition:background var(--zx-motion-fast), color var(--zx-motion-fast);display:inline-flex}.SmCagG_projectChip:hover{background:var(--zx-bg-hover);color:var(--zx-label)}@container (width<=720px){.SmCagG_dock{padding-right:var(--zx-space-4);padding-left:var(--zx-space-4)}.SmCagG_controls{flex-wrap:wrap;row-gap:2px}.SmCagG_leadingControls,.SmCagG_trailingControls{max-width:100%}}@container (width<=520px){.SmCagG_leadingControls,.SmCagG_trailingControls{flex:100%}.SmCagG_trailingControls{margin-left:0}.SmCagG_leadingControls .SmCagG_controlTrigger,.SmCagG_trailingControls .SmCagG_modelTrigger{max-width:170px}.SmCagG_trailingControls .SmCagG_reasoningTrigger{max-width:112px}}";
		const tagId$13 = "@dsh-portable/dcode-ui/Composer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$13) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$13;
			tag.textContent = css$13;
			document.head.appendChild(tag);
		}
		var Composer_module_css_default = {
			"attachButton": "SmCagG_attachButton",
			"attachment": "SmCagG_attachment",
			"attachmentFile": "SmCagG_attachmentFile",
			"attachmentMeta": "SmCagG_attachmentMeta",
			"attachmentPreview": "SmCagG_attachmentPreview",
			"attachmentRail": "SmCagG_attachmentRail",
			"attachmentRemove": "SmCagG_attachmentRemove",
			"control": "SmCagG_control",
			"controlChevron": "SmCagG_controlChevron",
			"controlLabel": "SmCagG_controlLabel",
			"controlTrigger": "SmCagG_controlTrigger",
			"controls": "SmCagG_controls",
			"dock": "SmCagG_dock",
			"dropActive": "SmCagG_dropActive",
			"dropOverlay": "SmCagG_dropOverlay",
			"error": "SmCagG_error",
			"fileInput": "SmCagG_fileInput",
			"headerRow": "SmCagG_headerRow",
			"input": "SmCagG_input",
			"inputArea": "SmCagG_inputArea",
			"leadingControls": "SmCagG_leadingControls",
			"modelMenu": "SmCagG_modelMenu",
			"modelTrigger": "SmCagG_modelTrigger",
			"permissionDanger": "SmCagG_permissionDanger",
			"permissionMenu": "SmCagG_permissionMenu",
			"permissionRead": "SmCagG_permissionRead",
			"permissionWrite": "SmCagG_permissionWrite",
			"projectChip": "SmCagG_projectChip",
			"reasoningTrigger": "SmCagG_reasoningTrigger",
			"send": "SmCagG_send",
			"shell": "SmCagG_shell",
			"shellFocused": "SmCagG_shellFocused",
			"stop": "SmCagG_stop",
			"trailingControls": "SmCagG_trailingControls"
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
		function fileSize(bytes) {
			if (bytes < 1024) return `${String(bytes)} B`;
			if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
			return `${(bytes / 1048576).toFixed(1)} MB`;
		}
		/** The DCode attachment strip: compact previews, with the same token rhythm as the composer. */
		function AttachmentRail(props) {
			if (props.attachments.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Composer_module_css_default.attachmentRail,
				"aria-label": props.t("composer.attachments"),
				children: props.attachments.map((attachment) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Composer_module_css_default.attachment,
					children: [
						attachment.kind === "image" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
							className: Composer_module_css_default.attachmentPreview,
							src: attachment.previewUrl,
							alt: attachment.file.name || props.t("composer.attachmentFile")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: Composer_module_css_default.attachmentFile,
							title: attachment.file.name,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: attachment.file.name || props.t("composer.attachmentFile") })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Composer_module_css_default.attachmentMeta,
							children: fileSize(attachment.file.size)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Composer_module_css_default.attachmentRemove,
							"aria-label": `${props.t("composer.removeAttachment")}: ${attachment.file.name || props.t("composer.attachmentFile")}`,
							disabled: props.disabled,
							onClick: () => {
								props.onRemove(attachment.id);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
						})
					]
				}, attachment.id))
			});
		}
		/** Prompt entry and the session controls. */
		function Composer({ sessionId, blank, cwd, onOpenWorkspace }) {
			const runtime = useRuntime();
			const t = useT();
			const session = useSessionSnapshot(sessionId);
			const { input, state: inputState } = useSessionInput(sessionId);
			const permissions = useProjectionValue(sessionId, "permissions");
			const selection = useProjectionValue(sessionId, "modelSelection");
			const agentPreset = useProjectionValue(sessionId, "agentPreset");
			const busyEnter = useObservable(runtime.busyEnter, "queue");
			const [fallbackDraft, setFallbackDraft] = (0, react.useState)("");
			const [focused, setFocused] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const [dragActive, setDragActive] = (0, react.useState)(false);
			const [confirmingFullAccess, setConfirmingFullAccess] = (0, react.useState)(false);
			const [acknowledgedFullAccess, setAcknowledgedFullAccess] = (0, react.useState)(false);
			const inputRef = (0, react.useRef)(null);
			const shellRef = (0, react.useRef)(null);
			const attachmentInputRef = (0, react.useRef)(null);
			const conversation = runtime.conversation;
			const draft = input === void 0 ? fallbackDraft : inputState.draft;
			const attachments = (0, react.useMemo)(() => conversation?.draftAttachmentsFor(inputState.imageIds) ?? [], [conversation, inputState.imageIds]);
			const previousSession = (0, react.useRef)(void 0);
			const fallbackDraftRef = (0, react.useRef)(fallbackDraft);
			const inputRefForDraft = (0, react.useRef)(input);
			fallbackDraftRef.current = fallbackDraft;
			inputRefForDraft.current = input;
			(0, react.useEffect)(() => {
				const outgoing = previousSession.current;
				if (outgoing !== void 0 && inputRefForDraft.current === void 0) drafts.set(outgoing, fallbackDraftRef.current);
				setFallbackDraft(sessionId === void 0 ? "" : drafts.get(sessionId) ?? "");
				setError(void 0);
				previousSession.current = sessionId;
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (sessionId !== void 0 && input === void 0) drafts.set(sessionId, fallbackDraft);
			}, [
				fallbackDraft,
				input,
				sessionId
			]);
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
			const updateDraft = (0, react.useCallback)((value) => {
				if (input === void 0) setFallbackDraft(value);
				else input.setDraft(value);
			}, [input]);
			const addAttachments = (0, react.useCallback)((files) => {
				if (files.length === 0) return;
				if (input === void 0 || conversation === void 0) {
					setError(t("composer.attachmentsUnavailable"));
					return;
				}
				try {
					const created = conversation.createDraftAttachments(files);
					if (!input.addImages(created.map((attachment) => attachment.id))) {
						conversation.releaseDraftAttachments(created);
						setError(t("composer.attachmentsBusy"));
						return;
					}
					setError(void 0);
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				}
			}, [
				conversation,
				input,
				t
			]);
			const onPaste = (0, react.useCallback)((event) => {
				const files = [];
				for (const item of Array.from(event.clipboardData.items)) {
					if (!item.type.startsWith("image/")) continue;
					const file = item.getAsFile();
					if (file !== null) files.push(file);
				}
				if (files.length === 0) return;
				event.preventDefault();
				addAttachments(files);
			}, [addAttachments]);
			const onDrop = (0, react.useCallback)((event) => {
				event.preventDefault();
				setDragActive(false);
				addAttachments(Array.from(event.dataTransfer.files));
			}, [addAttachments]);
			const removeAttachment = (0, react.useCallback)((id) => {
				if (input === void 0 || conversation === void 0) return;
				input.removeImage(id);
				if (!input.state.getSnapshot().imageIds.includes(id)) conversation.releaseDraftImage(id);
			}, [conversation, input]);
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
				if (text === "" && inputState.imageIds.length === 0) return;
				if (input !== void 0) {
					setError(void 0);
					input.submit(mode);
					return;
				}
				const face = runtime.binding(sessionId)?.session;
				if (face === void 0) return;
				setFallbackDraft("");
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
				draft,
				input,
				inputState.imageIds,
				runtime,
				sessionId
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
			const permissionTriggerClass = currentPermission?.value === FULL_ACCESS_PERMISSION ? Composer_module_css_default.permissionDanger : currentPermission?.value === "workspace-write" ? Composer_module_css_default.permissionWrite : Composer_module_css_default.permissionRead;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Composer_module_css_default.dock,
				children: [blank && sessionId !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
					className: `${Composer_module_css_default.shell} ${focused ? Composer_module_css_default.shellFocused : ""} ${dragActive ? Composer_module_css_default.dropActive : ""}`,
					onDragEnter: (event) => {
						if (event.dataTransfer.types.includes("Files")) setDragActive(true);
					},
					onDragOver: (event) => {
						if (event.dataTransfer.types.includes("Files")) event.preventDefault();
					},
					onDragLeave: (event) => {
						if (!event.currentTarget.contains(event.relatedTarget)) setDragActive(false);
					},
					onDrop,
					children: [
						dragActive ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Composer_module_css_default.dropOverlay,
							role: "status",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: t("composer.dropFiles") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("composer.dropFilesHint") })]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Composer_module_css_default.inputArea,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								ref: inputRef,
								className: Composer_module_css_default.input,
								rows: 1,
								value: draft,
								disabled,
								placeholder: disabled ? t("composer.needsSession") : running ? t("composer.placeholderRunning") : t("composer.placeholder"),
								onChange: (event) => {
									updateDraft(event.target.value);
								},
								onKeyDown,
								onPaste,
								"aria-label": t("composer.placeholder"),
								onFocus: () => {
									setFocused(true);
								},
								onBlur: () => {
									setFocused(false);
								}
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AttachmentRail, {
								attachments,
								disabled: disabled || inputState.phase !== "plain",
								onRemove: removeAttachment,
								t
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							ref: attachmentInputRef,
							className: Composer_module_css_default.fileInput,
							type: "file",
							multiple: true,
							"aria-hidden": "true",
							tabIndex: -1,
							onChange: (event) => {
								addAttachments(Array.from(event.currentTarget.files ?? []));
								event.currentTarget.value = "";
							}
						}),
						error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Composer_module_css_default.error,
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Composer_module_css_default.controls,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Composer_module_css_default.leadingControls,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: Composer_module_css_default.attachButton,
										"aria-label": t("composer.addAttachment"),
										title: t("composer.addAttachment"),
										disabled: disabled || input === void 0,
										onClick: () => {
											attachmentInputRef.current?.click();
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
										label: confirmingFullAccess ? t("composer.permission.confirmTitle") : t("composer.permission"),
										disabled: permissionRows.length === 0 || confirmingFullAccess,
										triggerClassName: `${Composer_module_css_default.controlTrigger} ${permissionTriggerClass}`,
										popoverClassName: Composer_module_css_default.permissionMenu,
										trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: Composer_module_css_default.control,
											children: [
												permissionIcon(permissions?.currentValue ?? ""),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Composer_module_css_default.controlLabel,
													children: currentPermissionLabel
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: Composer_module_css_default.controlChevron })
											]
										}),
										rows: permissionRows
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
										label: blankSession ? t("composer.mode") : t("composer.modeLocked"),
										disabled: !blankSession || sessionId === void 0 || modeRows.length === 0,
										triggerClassName: `${Composer_module_css_default.controlTrigger} ${Composer_module_css_default.modeTrigger}`,
										trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: Composer_module_css_default.control,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, {}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Composer_module_css_default.controlLabel,
													children: currentPresetLabel
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: Composer_module_css_default.controlChevron })
											]
										}),
										rows: modeRows
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: Composer_module_css_default.trailingControls,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
										label: t("composer.model"),
										disabled: modelRows.length === 0,
										align: "end",
										triggerClassName: `${Composer_module_css_default.controlTrigger} ${Composer_module_css_default.modelTrigger}`,
										popoverClassName: Composer_module_css_default.modelMenu,
										trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: Composer_module_css_default.control,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: Composer_module_css_default.controlLabel,
												children: currentModel === void 0 ? t("composer.model") : `${currentModel.model.name} · ${currentModel.group.name}`
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: Composer_module_css_default.controlChevron })]
										}),
										rows: modelRows
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Popover, {
										label: t("composer.reasoning"),
										disabled: reasoningRows.length === 0,
										align: "end",
										triggerClassName: `${Composer_module_css_default.controlTrigger} ${Composer_module_css_default.reasoningTrigger}`,
										trigger: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: Composer_module_css_default.control,
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconThinkOutline16, {}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: Composer_module_css_default.controlLabel,
													children: reasoningRows.find((row) => row.active)?.label ?? t("composer.reasoningDefault")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: Composer_module_css_default.controlChevron })
											]
										}),
										rows: reasoningRows
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextMeter, { sessionId }),
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
										disabled: disabled || draft.trim() === "" && inputState.imageIds.length === 0,
										"aria-label": t("composer.send"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {})
									})
								]
							})]
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
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\PlanCard.module.css.mjs
		const css$12 = ".i5uJ_a_dock{width:min(var(--zx-reading-width), 100%);padding:0 var(--zx-space-5) var(--zx-space-3);box-sizing:border-box;flex:none;margin:0 auto}.i5uJ_a_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-xl);background:color-mix(in srgb, var(--zx-bg-card) 94%, transparent);width:min(380px,100%);box-shadow:var(--zx-shadow-panel);margin-left:auto;overflow:hidden}.i5uJ_a_header{align-items:center;gap:var(--zx-space-3);width:100%;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.i5uJ_a_header:hover{background:var(--zx-bg-hover)}.i5uJ_a_header:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.i5uJ_a_icon,.i5uJ_a_chevron{color:var(--zx-label-muted);flex:none;place-items:center;display:grid}.i5uJ_a_title{color:var(--zx-label);font-weight:var(--zx-weight-semibold);flex:none}.i5uJ_a_progress{min-width:0;color:var(--zx-label-muted);font-variant-numeric:tabular-nums;text-overflow:ellipsis;white-space:nowrap;flex:1;overflow:hidden}.i5uJ_a_list{max-height:220px;padding:0 var(--zx-space-3) var(--zx-space-3);flex-direction:column;gap:2px;margin:0;list-style:none;display:flex;overflow-y:auto}.i5uJ_a_item{align-items:flex-start;gap:var(--zx-space-3);min-width:0;padding:var(--zx-space-2) var(--zx-space-2);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);display:flex}.i5uJ_a_item[data-status=in_progress]{background:var(--zx-bg-raised);color:var(--zx-label)}.i5uJ_a_item[data-status=completed]{color:var(--zx-label-tertiary);text-decoration:line-through;text-decoration-color:var(--zx-border)}.i5uJ_a_content{overflow-wrap:anywhere;min-width:0}.i5uJ_a_mark{flex:0 0 16px;place-items:center;width:16px;height:18px;margin-top:1px;display:grid}.i5uJ_a_markDone{color:var(--zx-success)}.i5uJ_a_markActive{color:var(--zx-accent)}.i5uJ_a_markPending{border:1px solid var(--zx-label-tertiary);border-radius:50%;width:12px;height:12px;margin:3px 2px 0}.i5uJ_a_trace{margin:0 var(--zx-space-3) var(--zx-space-3);padding-top:var(--zx-space-2);border-top:1px solid var(--zx-border-soft)}.i5uJ_a_traceHeader{align-items:center;gap:var(--zx-space-2);min-width:0;padding:0 var(--zx-space-2) var(--zx-space-1);color:var(--zx-label-muted);font-size:var(--zx-text-micro);display:flex}.i5uJ_a_traceTitle{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-secondary);font-weight:var(--zx-weight-semibold);flex:none;display:inline-flex}.i5uJ_a_traceStats{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.i5uJ_a_traceList{flex-direction:column;gap:1px;max-height:148px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.i5uJ_a_traceItem{min-width:0}.i5uJ_a_traceRow{align-items:center;gap:var(--zx-space-2);width:100%;min-width:0;padding:4px var(--zx-space-2);border-radius:var(--zx-radius-sm);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-micro);text-align:left;background:0 0;border:0;display:flex}button.i5uJ_a_traceRow{cursor:pointer}button.i5uJ_a_traceRow:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.i5uJ_a_traceRow:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.i5uJ_a_traceDot{background:var(--zx-label-tertiary);border-radius:50%;flex:0 0 5px;width:5px;height:5px}.i5uJ_a_traceItem[data-status=running] .i5uJ_a_traceDot{background:var(--zx-accent);box-shadow:0 0 0 3px color-mix(in srgb, var(--zx-accent) 16%, transparent)}.i5uJ_a_traceItem[data-status=done] .i5uJ_a_traceDot{background:var(--zx-success)}.i5uJ_a_traceItem[data-status=failed] .i5uJ_a_traceDot{background:var(--zx-error)}.i5uJ_a_traceLabel{min-width:0;color:inherit;text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.i5uJ_a_traceDetail{max-width:42%;color:var(--zx-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:none;overflow:hidden}@container (width<=640px){.i5uJ_a_dock{padding-right:var(--zx-space-4);padding-left:var(--zx-space-4)}.i5uJ_a_card{width:100%}}";
		const tagId$12 = "@dsh-portable/dcode-ui/PlanCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$12) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$12;
			tag.textContent = css$12;
			document.head.appendChild(tag);
		}
		var PlanCard_module_css_default = {
			"card": "i5uJ_a_card",
			"chevron": "i5uJ_a_chevron",
			"content": "i5uJ_a_content",
			"dock": "i5uJ_a_dock",
			"header": "i5uJ_a_header",
			"icon": "i5uJ_a_icon",
			"item": "i5uJ_a_item",
			"list": "i5uJ_a_list",
			"mark": "i5uJ_a_mark",
			"markActive": "i5uJ_a_markActive",
			"markDone": "i5uJ_a_markDone",
			"markPending": "i5uJ_a_markPending",
			"progress": "i5uJ_a_progress",
			"title": "i5uJ_a_title",
			"trace": "i5uJ_a_trace",
			"traceDetail": "i5uJ_a_traceDetail",
			"traceDot": "i5uJ_a_traceDot",
			"traceHeader": "i5uJ_a_traceHeader",
			"traceItem": "i5uJ_a_traceItem",
			"traceLabel": "i5uJ_a_traceLabel",
			"traceList": "i5uJ_a_traceList",
			"traceRow": "i5uJ_a_traceRow",
			"traceStats": "i5uJ_a_traceStats",
			"traceTitle": "i5uJ_a_traceTitle"
		};
		//#endregion
		//#region src/client/shell/PlanCard.tsx
		/** The compact live plan card shown above the composer. */
		/** Build the small trace ledger from the same snapshot as DSH's full view. */
		function buildTraceRows(snapshot, t) {
			const rows = snapshot.eventNodes.map((node) => {
				switch (node.kind) {
					case "user": return {
						id: `event:${node.seq}`,
						label: t("trace.user")
					};
					case "assistant": {
						const call = node.blocks.find((block) => block.kind === "tool-call");
						return {
							id: `event:${node.seq}`,
							label: call?.kind === "tool-call" ? call.name : t("trace.assistant"),
							callId: call?.kind === "tool-call" ? call.callId : void 0
						};
					}
					case "steering": return {
						id: `event:${node.seq}`,
						label: t("trace.steering")
					};
					case "context": return {
						id: `event:${node.seq}`,
						label: t("trace.context")
					};
					case "model-retry": return {
						id: `event:${node.seq}`,
						label: t("trace.retry"),
						detail: node.retryState
					};
					case "turn-error": return {
						id: `event:${node.seq}`,
						label: t("trace.error"),
						detail: node.message,
						status: "failed"
					};
					case "turn-max-tokens": return {
						id: `event:${node.seq}`,
						label: t("trace.limit")
					};
					case "tool-result": return {
						id: `event:${node.seq}`,
						label: node.call?.name ?? t("trace.tool"),
						detail: node.isError ? t("trace.failed") : t("trace.done"),
						callId: node.callId,
						status: node.isError ? "failed" : "done"
					};
					case "command": return {
						id: `event:${node.seq}`,
						label: node.name ?? t("trace.command"),
						detail: node.outcome?.kind === "error" ? t("trace.failed") : node.outcome === null ? t("trace.active") : t("trace.done"),
						status: node.outcome?.kind === "error" ? "failed" : node.outcome === null ? "running" : "done"
					};
					case "compaction": return {
						id: `event:${node.seq}`,
						label: t("trace.compaction")
					};
					case "unknown": return {
						id: `event:${node.seq}`,
						label: node.type || t("trace.unknown")
					};
				}
			});
			const seenCalls = new Set(rows.flatMap((row) => row.callId === void 0 ? [] : [row.callId]));
			for (const call of snapshot.runningCalls) {
				if (seenCalls.has(call.callId)) continue;
				rows.push({
					id: `running:${call.callId}`,
					label: call.name,
					detail: t("trace.active"),
					callId: call.callId,
					status: "running"
				});
			}
			if (snapshot.partial !== null) rows.push({
				id: "partial",
				label: t("trace.assistant"),
				detail: t("trace.active"),
				status: "running"
			});
			return rows.slice(-8);
		}
		function StatusMark({ status }) {
			if (status === "completed") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${PlanCard_module_css_default.mark} ${PlanCard_module_css_default.markDone}`,
				"aria-hidden": true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, {})
			});
			if (status === "in_progress") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${PlanCard_module_css_default.mark} ${PlanCard_module_css_default.markActive}`,
				"aria-hidden": true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, { size: "sm" })
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: `${PlanCard_module_css_default.mark} ${PlanCard_module_css_default.markPending}`,
				"aria-hidden": true
			});
		}
		/** Render the current `todos` projection with a transcript replay fallback. */
		function PlanCard({ sessionId, open = true, navigation }) {
			const t = useT();
			const projectedTodos = useProjectionValue(sessionId, "todos");
			const chat = useChatSnapshot(sessionId);
			const trajectory = useTrajectorySnapshot(sessionId);
			const fallbackTodos = (0, react.useMemo)(() => latestTodos(chat?.legacy.nodes ?? []), [chat]);
			const todos = projectedTodos === void 0 ? fallbackTodos : projectedTodos ?? [];
			const traceRows = (0, react.useMemo)(() => buildTraceRows(trajectory ?? EMPTY_TRAJECTORY_SNAPSHOT, t), [trajectory, t]);
			const [collapsed, setCollapsed] = (0, react.useState)(false);
			const contentId = (0, react.useId)();
			if (!open || todos.length === 0 && traceRows.length === 0) return null;
			const completed = todos.filter((todo) => todo.status === "completed").length;
			const running = trajectory?.runningCalls.length ?? 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PlanCard_module_css_default.dock,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: PlanCard_module_css_default.card,
					"data-testid": "dcode-plan-card",
					"aria-label": todos.length > 0 ? t("plan.title") : t("trace.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${PlanCard_module_css_default.header} ${ui.cardHeader}`,
						"aria-expanded": !collapsed,
						"aria-controls": contentId,
						onClick: () => {
							setCollapsed((value) => !value);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PlanCard_module_css_default.icon,
								"aria-hidden": true,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, { size: 16 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PlanCard_module_css_default.title,
								children: todos.length > 0 ? t("plan.title") : t("trace.title")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PlanCard_module_css_default.progress,
								children: todos.length > 0 ? t("plan.progress", {
									done: completed,
									total: todos.length
								}) : t("trace.stats", {
									events: trajectory?.eventNodes.length ?? 0,
									requests: trajectory?.requests.length ?? 0
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PlanCard_module_css_default.chevron,
								"aria-hidden": true,
								children: collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
							})
						]
					}), !collapsed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						id: contentId,
						children: [todos.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: PlanCard_module_css_default.list,
							children: todos.map((todo, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: PlanCard_module_css_default.item,
								"data-status": todo.status,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(StatusMark, { status: todo.status }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PlanCard_module_css_default.content,
									children: todo.content
								})]
							}, `${String(index)}:${todo.content}`))
						}) : null, !collapsed && traceRows.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
							className: PlanCard_module_css_default.trace,
							"aria-label": t("trace.title"),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: PlanCard_module_css_default.traceHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: PlanCard_module_css_default.traceTitle,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16, { size: 14 }), t("trace.title")]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: PlanCard_module_css_default.traceStats,
									children: [t("trace.stats", {
										events: trajectory?.eventNodes.length ?? 0,
										requests: trajectory?.requests.length ?? 0
									}), running > 0 ? ` · ${t("trace.runningCount", { count: running })}` : ""]
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
								className: PlanCard_module_css_default.traceList,
								children: traceRows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: PlanCard_module_css_default.traceItem,
									"data-status": row.status,
									children: row.callId === void 0 || navigation === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PlanCard_module_css_default.traceRow,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PlanCard_module_css_default.traceDot,
												"aria-hidden": true
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PlanCard_module_css_default.traceLabel,
												children: row.label
											}),
											row.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PlanCard_module_css_default.traceDetail,
												children: row.detail
											})
										]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: PlanCard_module_css_default.traceRow,
										title: t("trace.inspect"),
										onClick: () => {
											navigation.inspect(row.callId);
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PlanCard_module_css_default.traceDot,
												"aria-hidden": true
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PlanCard_module_css_default.traceLabel,
												children: row.label
											}),
											row.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: PlanCard_module_css_default.traceDetail,
												children: row.detail
											})
										]
									})
								}, row.id))
							})]
						}) : null]
					}) : null]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\QuestionComposer.module.css.mjs
		const css$11 = ".K5JLnq_frame{width:100%;padding:0 var(--zx-space-5) var(--zx-space-3);box-sizing:border-box;flex:none;justify-content:center;display:flex}.K5JLnq_card{width:min(var(--zx-reading-width), 100%);border:1px solid var(--zx-border);border-radius:var(--zx-radius-2xl);background:var(--zx-bg-card);max-height:min(60vh,520px);box-shadow:var(--zx-shadow-panel);flex-direction:column;display:flex;overflow:hidden}.K5JLnq_header,.K5JLnq_reviewHeader{justify-content:space-between;align-items:center;gap:var(--zx-space-4);padding:var(--zx-space-4) var(--zx-space-5) var(--zx-space-2);flex:none;display:flex}.K5JLnq_reviewHeader{padding-bottom:var(--zx-space-3);border-bottom:1px solid var(--zx-border-soft);background:var(--zx-accent-soft)}.K5JLnq_kicker{align-items:center;gap:var(--zx-space-2);min-width:0;color:var(--zx-label-secondary);font-size:var(--zx-text-xs);font-weight:var(--zx-weight-semibold);display:inline-flex}.K5JLnq_headerActions,.K5JLnq_footerActions,.K5JLnq_pager{align-items:center;gap:var(--zx-space-2);flex:none;display:flex}.K5JLnq_counter{color:var(--zx-label-muted);font-size:var(--zx-text-xs);font-variant-numeric:tabular-nums}.K5JLnq_iconButton{width:26px;height:var(--zx-control-xs);color:var(--zx-label-muted);cursor:pointer;background:0 0;border:0;border-radius:50%;place-items:center;padding:0;display:grid}.K5JLnq_iconButton:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.K5JLnq_iconButton:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.K5JLnq_iconButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.K5JLnq_body,.K5JLnq_reviewBody{min-height:0;padding:var(--zx-space-3) var(--zx-space-5) var(--zx-space-2);overflow:hidden auto}.K5JLnq_reviewBody{padding-top:var(--zx-space-4)}.K5JLnq_title{color:var(--zx-label);font-size:var(--zx-text-md);font-weight:var(--zx-weight-semibold);line-height:var(--zx-leading-body);margin:0}.K5JLnq_detail,.K5JLnq_plan{margin-top:var(--zx-space-3);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.K5JLnq_options{margin-top:var(--zx-space-3);flex-direction:column;gap:2px;display:flex}.K5JLnq_optionGroup{display:contents}.K5JLnq_option,.K5JLnq_customRow{align-items:flex-start;gap:var(--zx-space-3);width:100%;min-height:38px;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-lg);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);text-align:left;box-sizing:border-box;background:0 0;border:1px solid #0000;display:flex}.K5JLnq_option{cursor:pointer}.K5JLnq_option:hover:not(:disabled),.K5JLnq_optionSelected,.K5JLnq_customRow:hover,.K5JLnq_customRow:focus-within,.K5JLnq_customRowActive{border-color:var(--zx-border-soft);background:var(--zx-bg-hover);color:var(--zx-label)}.K5JLnq_option:disabled{cursor:default}.K5JLnq_radio,.K5JLnq_checkbox,.K5JLnq_customIcon{width:18px;height:18px;color:var(--zx-label-tertiary);flex:0 0 18px;place-items:center;margin-top:1px;display:grid}.K5JLnq_radio,.K5JLnq_checkbox{border:1px solid var(--zx-border-control)}.K5JLnq_radio{border-radius:50%}.K5JLnq_checkbox{border-radius:var(--zx-radius-sm)}.K5JLnq_radioSelected,.K5JLnq_checkboxSelected{border-color:var(--zx-accent);background:var(--zx-accent);color:var(--zx-on-accent)}.K5JLnq_optionCopy{align-items:baseline;gap:2px var(--zx-space-2);flex-wrap:wrap;min-width:0;display:flex}.K5JLnq_optionLabel{color:inherit;font-weight:var(--zx-weight-medium)}.K5JLnq_description{color:var(--zx-label-muted);font-size:var(--zx-text-xs)}.K5JLnq_badge{padding:1px var(--zx-space-2);border-radius:var(--zx-radius-pill);background:var(--zx-accent-soft);color:var(--zx-on-accent-soft);font-size:var(--zx-text-micro);font-weight:var(--zx-weight-semibold)}.K5JLnq_customRow{cursor:text}.K5JLnq_customInput,.K5JLnq_freeInput{min-width:0;color:var(--zx-label);font:inherit;line-height:var(--zx-leading-body);resize:none;background:0 0;border:0;outline:0;flex:1}.K5JLnq_customInput::placeholder,.K5JLnq_freeInput::placeholder{color:var(--zx-label-tertiary)}.K5JLnq_freeInput{width:100%;min-height:54px;padding:var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-lg);box-sizing:border-box}.K5JLnq_freeInput:focus{border-color:var(--zx-accent)}.K5JLnq_footer,.K5JLnq_reviewFooter{justify-content:space-between;align-items:center;gap:var(--zx-space-4);padding:var(--zx-space-2) var(--zx-space-4) var(--zx-space-4);flex:none;display:flex}.K5JLnq_reviewFooter{padding-top:var(--zx-space-3)}.K5JLnq_feedback{min-width:0;color:var(--zx-error);font-size:var(--zx-text-micro);text-overflow:ellipsis;white-space:nowrap;flex:1;line-height:1.4;overflow:hidden}@container (width<=640px){.K5JLnq_frame{padding-right:var(--zx-space-4);padding-left:var(--zx-space-4)}.K5JLnq_card{border-radius:var(--zx-radius-xl)}.K5JLnq_header,.K5JLnq_reviewHeader,.K5JLnq_body,.K5JLnq_reviewBody{padding-right:var(--zx-space-4);padding-left:var(--zx-space-4)}.K5JLnq_footer,.K5JLnq_reviewFooter{align-items:flex-end}.K5JLnq_footerActions{flex-wrap:wrap;justify-content:flex-end}}";
		const tagId$11 = "@dsh-portable/dcode-ui/QuestionComposer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$11) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$11;
			tag.textContent = css$11;
			document.head.appendChild(tag);
		}
		var QuestionComposer_module_css_default = {
			"badge": "K5JLnq_badge",
			"body": "K5JLnq_body",
			"card": "K5JLnq_card",
			"checkbox": "K5JLnq_checkbox",
			"checkboxSelected": "K5JLnq_checkboxSelected",
			"counter": "K5JLnq_counter",
			"customIcon": "K5JLnq_customIcon",
			"customInput": "K5JLnq_customInput",
			"customRow": "K5JLnq_customRow",
			"customRowActive": "K5JLnq_customRowActive",
			"description": "K5JLnq_description",
			"detail": "K5JLnq_detail",
			"feedback": "K5JLnq_feedback",
			"footer": "K5JLnq_footer",
			"footerActions": "K5JLnq_footerActions",
			"frame": "K5JLnq_frame",
			"freeInput": "K5JLnq_freeInput",
			"header": "K5JLnq_header",
			"headerActions": "K5JLnq_headerActions",
			"iconButton": "K5JLnq_iconButton",
			"kicker": "K5JLnq_kicker",
			"option": "K5JLnq_option",
			"optionCopy": "K5JLnq_optionCopy",
			"optionGroup": "K5JLnq_optionGroup",
			"optionLabel": "K5JLnq_optionLabel",
			"optionSelected": "K5JLnq_optionSelected",
			"options": "K5JLnq_options",
			"pager": "K5JLnq_pager",
			"plan": "K5JLnq_plan",
			"radio": "K5JLnq_radio",
			"radioSelected": "K5JLnq_radioSelected",
			"reviewBody": "K5JLnq_reviewBody",
			"reviewFooter": "K5JLnq_reviewFooter",
			"reviewHeader": "K5JLnq_reviewHeader",
			"title": "K5JLnq_title"
		};
		//#endregion
		//#region src/client/shell/QuestionComposer.tsx
		/** Codex-style composer takeover for ask-user-question and plan review waits. */
		/** Keep the wire label intact while making the recommendation badge readable. */
		function parseRecommendedLabel(label) {
			const suffix = /\s*(?:\((?:recommended|推荐)\)|（(?:recommended|推荐)）)\s*$/i;
			return suffix.test(label) ? {
				label: label.replace(suffix, ""),
				recommended: true
			} : {
				label,
				recommended: false
			};
		}
		/** The plan-review presentation is valid only when two buttons can answer it. */
		function planReviewOf(questions) {
			if (questions.length !== 1) return void 0;
			const question = questions[0];
			if (question === void 0 || question.intent?.kind !== "plan-review" || question.detail === void 0) return;
			if (question.multiSelect === true) return void 0;
			const options = question.options ?? [];
			if (options.length > 2) return void 0;
			const approve = options.find((option) => option.label === question.intent?.approve);
			if (approve === void 0) return void 0;
			const decline = options.find((option) => option.label !== approve.label);
			return {
				id: question.id,
				question: question.question,
				plan: question.detail,
				approve,
				...decline === void 0 ? {} : { decline }
			};
		}
		function answerable(draft) {
			return draft.selected.length > 0 || draft.custom.trim() !== "";
		}
		function completed(draft) {
			return answerable(draft) || draft.skipped;
		}
		function isComposing(event) {
			return event.nativeEvent.isComposing;
		}
		function answerPayload(questions, drafts) {
			return { answers: questions.map((question, index) => {
				const draft = drafts[index] ?? {
					selected: [],
					custom: "",
					skipped: true
				};
				if (draft.skipped) return {
					id: question.id,
					selected: []
				};
				const custom = draft.custom.trim();
				return {
					id: question.id,
					selected: custom === "" || question.multiSelect === true ? [...draft.selected] : [],
					...custom === "" ? {} : { custom }
				};
			}) };
		}
		/** The generic multi-step question card. */
		function QuestionFlow({ pending }) {
			const t = useT();
			const questions = pending.questions;
			const labels = (0, react.useMemo)(() => ({
				code: {
					copyLabel: t("common.copy"),
					copiedLabel: t("common.copied")
				},
				footnotes: t("details.title")
			}), [t]);
			const [index, setIndex] = (0, react.useState)(0);
			const [drafts, setDrafts] = (0, react.useState)(() => questions.map(() => ({
				selected: [],
				custom: "",
				skipped: false
			})));
			const [busy, setBusy] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)();
			const optionRefs = (0, react.useRef)({});
			const question = questions[index];
			const hasOptions = (question?.options?.length ?? 0) > 0;
			(0, react.useEffect)(() => {
				if (hasOptions) optionRefs.current[0]?.focus();
			}, [index, pending.key]);
			const updateDraft = (update) => {
				setDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? update(draft) : draft));
				setError(void 0);
			};
			const submit = (values) => {
				const missing = values.findIndex((draft) => !completed(draft));
				if (missing >= 0) {
					setIndex(missing);
					setError(t("question.errorIncomplete"));
					return;
				}
				setBusy("answer");
				setError(void 0);
				pending.answer(answerPayload(questions, values)).catch((cause) => {
					setBusy(null);
					setError(cause instanceof Error ? cause.message : String(cause));
				});
			};
			const cancel = () => {
				setBusy("cancel");
				setError(void 0);
				pending.cancel().catch((cause) => {
					setBusy(null);
					setError(cause instanceof Error ? cause.message : String(cause));
				});
			};
			if (question === void 0) return null;
			const draft = drafts[index] ?? {
				selected: [],
				custom: "",
				skipped: false
			};
			const choose = (label) => {
				updateDraft((current) => question.multiSelect === true ? {
					...current,
					selected: current.selected.includes(label) ? current.selected.filter((item) => item !== label) : [...current.selected, label],
					skipped: false
				} : {
					selected: [label],
					custom: "",
					skipped: false
				});
				if (question.multiSelect !== true && index < questions.length - 1) setIndex(index + 1);
			};
			const continueFlow = () => {
				if (!answerable(draft)) {
					setError(t("question.errorUnanswered"));
					return;
				}
				if (index < questions.length - 1) {
					setIndex(index + 1);
					setError(void 0);
					return;
				}
				submit(drafts);
			};
			const skip = () => {
				const nextDrafts = drafts.map((value, draftIndex) => draftIndex === index ? {
					selected: [],
					custom: "",
					skipped: true
				} : value);
				setDrafts(nextDrafts);
				setError(void 0);
				if (index < questions.length - 1) {
					setIndex(index + 1);
					return;
				}
				submit(nextDrafts);
			};
			const changeCustom = (event) => {
				const value = event.target.value;
				updateDraft((current) => ({
					...current,
					selected: question.multiSelect === true ? current.selected : [],
					custom: value,
					skipped: false
				}));
			};
			const continueFromCustom = (event) => {
				if (event.key !== "Enter" || event.shiftKey || isComposing(event)) return;
				event.preventDefault();
				continueFlow();
			};
			const moveOption = (event, optionIndex) => {
				if (question.multiSelect === true) return;
				const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
				if (direction === 0) return;
				event.preventDefault();
				const count = question.options?.length ?? 0;
				const next = (optionIndex + direction + count) % count;
				optionRefs.current[next]?.focus();
			};
			const selectedOptionIndex = question.options?.findIndex((option) => draft.selected.includes(option.label)) ?? -1;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: QuestionComposer_module_css_default.frame,
				"data-question-key": pending.key,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: QuestionComposer_module_css_default.card,
					"aria-labelledby": `question-${pending.key}-${String(index)}`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: QuestionComposer_module_css_default.header,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: QuestionComposer_module_css_default.kicker,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQuestionOutline14, {}), question.header ?? t("question.title")]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: QuestionComposer_module_css_default.headerActions,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: QuestionComposer_module_css_default.counter,
									children: [
										index + 1,
										" / ",
										questions.length
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: QuestionComposer_module_css_default.iconButton,
									"aria-label": t("question.cancel"),
									title: t("question.cancel"),
									disabled: busy !== null,
									onClick: cancel,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: QuestionComposer_module_css_default.body,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: QuestionComposer_module_css_default.title,
									id: `question-${pending.key}-${String(index)}`,
									children: question.question
								}),
								question.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: QuestionComposer_module_css_default.detail,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
										text: question.detail,
										labels
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: QuestionComposer_module_css_default.options,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: QuestionComposer_module_css_default.optionGroup,
										role: question.multiSelect === true ? "group" : "radiogroup",
										"aria-label": question.question,
										children: (question.options ?? []).map((option, optionIndex) => {
											const selected = draft.selected.includes(option.label);
											const display = parseRecommendedLabel(option.label);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
												ref: (node) => {
													optionRefs.current[optionIndex] = node;
												},
												type: "button",
												className: `${QuestionComposer_module_css_default.option} ${selected ? QuestionComposer_module_css_default.optionSelected : ""}`,
												role: question.multiSelect === true ? "checkbox" : "radio",
												"aria-checked": selected,
												tabIndex: question.multiSelect === true || (selectedOptionIndex >= 0 ? selected : optionIndex === 0) ? 0 : -1,
												disabled: busy !== null,
												onClick: () => {
													choose(option.label);
												},
												onKeyDown: (event) => {
													moveOption(event, optionIndex);
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: question.multiSelect === true ? `${QuestionComposer_module_css_default.checkbox} ${selected ? QuestionComposer_module_css_default.checkboxSelected : ""}` : `${QuestionComposer_module_css_default.radio} ${selected ? QuestionComposer_module_css_default.radioSelected : ""}`,
													"aria-hidden": true,
													children: selected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, { size: 12 })
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: QuestionComposer_module_css_default.optionCopy,
													children: [
														/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: QuestionComposer_module_css_default.optionLabel,
															children: display.label
														}),
														display.recommended ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: QuestionComposer_module_css_default.badge,
															children: t("question.recommended")
														}) : null,
														option.description === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
															className: QuestionComposer_module_css_default.description,
															children: option.description
														})
													]
												})]
											}, `${option.label}-${String(optionIndex)}`);
										})
									}), hasOptions ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: `${QuestionComposer_module_css_default.customRow} ${draft.custom !== "" ? QuestionComposer_module_css_default.customRowActive : ""}`,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: question.multiSelect === true ? `${QuestionComposer_module_css_default.checkbox} ${draft.custom !== "" ? QuestionComposer_module_css_default.checkboxSelected : ""}` : QuestionComposer_module_css_default.customIcon,
											"aria-hidden": true,
											children: question.multiSelect === true ? draft.custom !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 })
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
											className: QuestionComposer_module_css_default.customInput,
											rows: 1,
											value: draft.custom,
											disabled: busy !== null,
											placeholder: t("question.custom"),
											"aria-label": t("question.custom"),
											onChange: changeCustom,
											onKeyDown: continueFromCustom
										})]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										autoFocus: true,
										className: QuestionComposer_module_css_default.freeInput,
										rows: 2,
										value: draft.custom,
										disabled: busy !== null,
										placeholder: t("question.custom"),
										"aria-label": t("question.custom"),
										onChange: changeCustom,
										onKeyDown: continueFromCustom
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: QuestionComposer_module_css_default.footer,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: QuestionComposer_module_css_default.pager,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: QuestionComposer_module_css_default.iconButton,
										"aria-label": t("question.previous"),
										disabled: index === 0 || busy !== null,
										onClick: () => {
											setIndex((value) => value - 1);
											setError(void 0);
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: QuestionComposer_module_css_default.iconButton,
										"aria-label": t("question.next"),
										disabled: index === questions.length - 1 || busy !== null,
										onClick: () => {
											setIndex((value) => value + 1);
											setError(void 0);
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: QuestionComposer_module_css_default.feedback,
									role: "alert",
									children: error
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: QuestionComposer_module_css_default.footerActions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										disabled: busy !== null,
										onClick: skip,
										children: t("question.skip")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										primary: true,
										disabled: busy !== null || !answerable(draft),
										onClick: continueFlow,
										children: busy === "answer" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, { size: "sm" }), t("question.submitting")] }) : index === questions.length - 1 ? t("question.submit") : t("question.continue")
									})]
								})
							]
						})
					]
				})
			});
		}
		/** The plan-review approval card supplied by the same pending question wire. */
		function PlanReviewCard({ pending, review }) {
			const t = useT();
			const labels = (0, react.useMemo)(() => ({
				code: {
					copyLabel: t("common.copy"),
					copiedLabel: t("common.copied")
				},
				footnotes: t("details.title")
			}), [t]);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const settle = (send) => {
				setBusy(true);
				setError(void 0);
				send().catch((cause) => {
					setBusy(false);
					setError(cause instanceof Error ? cause.message : String(cause));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: QuestionComposer_module_css_default.frame,
				"data-plan-review-key": pending.key,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: `${QuestionComposer_module_css_default.card} ${QuestionComposer_module_css_default.reviewCard}`,
					"aria-label": review.question,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
							className: QuestionComposer_module_css_default.reviewHeader,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: QuestionComposer_module_css_default.kicker,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, {}), t("question.planReview")]
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: QuestionComposer_module_css_default.reviewBody,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								className: QuestionComposer_module_css_default.title,
								children: review.question
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: QuestionComposer_module_css_default.plan,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
									text: review.plan,
									labels
								})
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
							className: QuestionComposer_module_css_default.reviewFooter,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: QuestionComposer_module_css_default.feedback,
								role: "alert",
								children: error
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: QuestionComposer_module_css_default.footerActions,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										disabled: busy,
										onClick: () => {
											settle(() => pending.cancel());
										},
										children: t("question.discuss")
									}),
									review.decline === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										disabled: busy,
										title: review.decline.description,
										onClick: () => {
											settle(() => pending.answer({ answers: [{
												id: review.id,
												selected: [review.decline.label]
											}] }));
										},
										children: t("question.decline")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										primary: true,
										autoFocus: true,
										disabled: busy,
										title: review.approve.description,
										onClick: () => {
											settle(() => pending.answer({ answers: [{
												id: review.id,
												selected: [review.approve.label]
											}] }));
										},
										children: busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, { size: "sm" }), t("question.submitting")] }) : t("question.approve")
									})
								]
							})]
						})
					]
				})
			});
		}
		/** Route the pending request to the plan-review or generic question surface. */
		function QuestionComposer({ pending }) {
			const review = (0, react.useMemo)(() => planReviewOf(pending.questions), [pending]);
			return review === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuestionFlow, { pending }, pending.key) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlanReviewCard, {
				pending,
				review
			}, pending.key);
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\shell\CommandPalette.module.css.mjs
		const css$10 = ".aZZEvq_backdrop{z-index:var(--zx-z-modal);background:var(--zx-scrim);backdrop-filter:blur(2px);justify-content:center;padding-top:12vh;display:flex;position:absolute;inset:0}.aZZEvq_panel{width:min(560px, calc(100% - 2 * var(--zx-space-5)));border:1px solid var(--zx-border);border-radius:var(--zx-radius-xl);background:var(--zx-bg-overlay);max-height:62vh;box-shadow:var(--zx-shadow-panel);flex-direction:column;display:flex;overflow:hidden}.aZZEvq_search{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);color:var(--zx-label-muted);display:flex}.aZZEvq_input{min-width:0;color:var(--zx-label);font:inherit;font-size:var(--zx-text-md);background:0 0;border:0;flex:1}.aZZEvq_input:focus{outline:none}.aZZEvq_input::placeholder{color:var(--zx-label-tertiary)}.aZZEvq_filters{gap:var(--zx-space-2);padding:var(--zx-space-2) var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);display:flex}.aZZEvq_filter{min-height:var(--zx-control-xs);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-pill);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-micro);white-space:nowrap;cursor:pointer;background:0 0;border:1px solid #0000}.aZZEvq_filter:hover{background:var(--zx-bg-hover);color:var(--zx-label-secondary)}.aZZEvq_filterActive{background:var(--zx-bg-active);color:var(--zx-label)}.aZZEvq_list{min-height:0;padding:var(--zx-space-2);flex:1;overflow:hidden auto}.aZZEvq_group{padding:var(--zx-space-3) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro)}.aZZEvq_row{align-items:center;gap:var(--zx-space-3);width:100%;min-height:32px;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.aZZEvq_rowActive{background:var(--zx-bg-active)}.aZZEvq_rowLabel{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.aZZEvq_rowDetail{min-width:0;color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);text-overflow:ellipsis;white-space:nowrap;max-width:45%;overflow:hidden}.aZZEvq_shortcut{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}.aZZEvq_empty{padding:var(--zx-space-6);text-align:center;color:var(--zx-label-muted);font-size:var(--zx-text-xs)}";
		const tagId$10 = "@dsh-portable/dcode-ui/CommandPalette.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$10) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$10;
			tag.textContent = css$10;
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
			const panelRef = (0, react.useRef)(null);
			const listId = (0, react.useId)();
			useModalFocus(true, panelRef, {
				initialFocusRef: inputRef,
				onClose: () => {
					navigation.togglePalette(false);
				}
			});
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
					label: t("top.togglePreview"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {}),
					shortcut: commandShortcut("Alt+B"),
					run: () => {
						navigation.toggleAside();
					}
				},
				{
					id: "toggle-summary",
					kind: "action",
					group: t("palette.panels"),
					label: t("top.toggleSummary"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16, {}),
					run: () => {
						navigation.toggleSummary();
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
					label: t("nav.plugins"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: 16 }),
					run: () => {
						navigation.show("plugins");
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
					id: "agent-presets",
					kind: "action",
					group: t("palette.configuration"),
					label: t("settings.agentPresets"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}),
					run: () => {
						navigation.openSettings("agentPresets");
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
			}, [
				query,
				filter,
				rows.length
			]);
			const choose = (0, react.useCallback)((row) => {
				if (row === void 0) return;
				navigation.togglePalette(false);
				row.run();
			}, [navigation]);
			const onKeyDown = (0, react.useCallback)((event) => {
				if (event.key === "ArrowDown") {
					event.preventDefault();
					setActive((index) => Math.max(0, Math.min(index + 1, rows.length - 1)));
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
					ref: panelRef,
					className: CommandPalette_module_css_default.panel,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("nav.commandPalette"),
					tabIndex: -1,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CommandPalette_module_css_default.search,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								className: CommandPalette_module_css_default.input,
								role: "combobox",
								"aria-autocomplete": "list",
								"aria-label": t("palette.placeholder"),
								"aria-expanded": true,
								"aria-controls": listId,
								"aria-activedescendant": rows[active] === void 0 ? void 0 : `palette-row-${String(active)}`,
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
							role: "group",
							"aria-label": t("palette.filter"),
							children: filters.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `${CommandPalette_module_css_default.filter} ${filter === entry.id ? CommandPalette_module_css_default.filterActive : ""}`,
								"aria-pressed": filter === entry.id,
								onClick: () => {
									setFilter(entry.id);
								},
								children: entry.label
							}, entry.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: CommandPalette_module_css_default.list,
							id: listId,
							role: "listbox",
							"aria-label": t("palette.results"),
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
									id: `palette-row-${String(index)}`,
									type: "button",
									role: "option",
									"aria-selected": index === active,
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
		const css$9 = ".x062Eq_backdrop{z-index:var(--zx-z-modal);padding:var(--zx-space-6);background:var(--zx-scrim);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.x062Eq_panel{border:1px solid var(--zx-border);border-radius:var(--zx-radius-xl);background:var(--zx-bg-overlay);width:min(560px,100%);max-height:min(70vh,560px);box-shadow:var(--zx-shadow-panel);flex-direction:column;display:flex;overflow:hidden}.x062Eq_head{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);font-size:var(--zx-text-sm);color:var(--zx-label);display:flex}.x062Eq_title{flex:1;min-width:0}.x062Eq_crumbs{padding:var(--zx-space-2) var(--zx-space-4);border-bottom:1px solid var(--zx-border-soft);font-size:var(--zx-text-micro);color:var(--zx-label-muted);flex-wrap:wrap;align-items:center;gap:2px;display:flex}.x062Eq_crumb{padding:2px var(--zx-space-2);border-radius:var(--zx-radius-sm);color:inherit;font:inherit;cursor:pointer;text-overflow:ellipsis;white-space:nowrap;background:0 0;border:0;max-width:180px;overflow:hidden}.x062Eq_crumb:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.x062Eq_list{min-height:0;padding:var(--zx-space-2);flex:1;overflow:hidden auto}.x062Eq_row{align-items:center;gap:var(--zx-space-3);width:100%;min-height:30px;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.x062Eq_row:hover{background:var(--zx-bg-hover)}.x062Eq_row:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.x062Eq_rowHidden{color:var(--zx-label-muted)}.x062Eq_name{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.x062Eq_foot{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-4);border-top:1px solid var(--zx-border-soft);display:flex}.x062Eq_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);font-size:var(--zx-text-micro);color:var(--zx-label-muted);direction:rtl;flex:1;overflow:hidden}.x062Eq_error{padding:0 var(--zx-space-4) var(--zx-space-3);color:var(--zx-error);font-size:var(--zx-text-micro)}.x062Eq_empty{padding:var(--zx-space-6);text-align:center;color:var(--zx-label-muted);font-size:var(--zx-text-xs)}";
		const tagId$9 = "@dsh-portable/dcode-ui/DirectoryPicker.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$9) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$9;
			tag.textContent = css$9;
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
			const panelRef = (0, react.useRef)(null);
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
			useModalFocus(true, panelRef, { onClose: onCancel });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: DirectoryPicker_module_css_default.backdrop,
				role: "presentation",
				onPointerDown: (event) => {
					if (event.target === event.currentTarget) onCancel();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					className: DirectoryPicker_module_css_default.panel,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("nav.openWorkspace"),
					tabIndex: -1,
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
							role: "region",
							"aria-label": t("directory.contents"),
							tabIndex: 0,
							children: [
								loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: DirectoryPicker_module_css_default.empty,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {})
								}) : null,
								!loading && listing !== void 0 && listing.entries.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: DirectoryPicker_module_css_default.empty,
									children: t("directory.empty")
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
							role: "alert",
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
									children: t("directory.open")
								})
							]
						})
					]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\chat\ToolCard.module.css.mjs
		const css$8 = "._l8RgW_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);overflow:hidden}._l8RgW_head{align-items:center;gap:var(--zx-space-3);width:100%;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;display:flex}._l8RgW_head:hover{background:var(--zx-bg-hover)}._l8RgW_head:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}._l8RgW_glyph{width:16px;height:16px;color:var(--zx-label-muted);flex:none;place-items:center;display:grid}._l8RgW_verb{color:var(--zx-label-secondary);flex:none}._l8RgW_detail{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);color:var(--zx-label);flex:1;overflow:hidden}._l8RgW_error{color:var(--zx-error)}._l8RgW_chevron{color:var(--zx-label-decor);transition:transform var(--zx-motion-fast);flex:none}._l8RgW_chevronOpen{transform:rotate(90deg)}._l8RgW_body{border-top:1px solid var(--zx-border-soft);padding:var(--zx-space-3);gap:var(--zx-space-3);flex-direction:column;display:flex}._l8RgW_bodyRow{align-items:center;gap:var(--zx-space-2);display:flex}._l8RgW_bodyLabel{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);text-transform:uppercase;letter-spacing:.04em}._l8RgW_output{max-height:420px;padding:var(--zx-space-3);border-radius:var(--zx-radius-sm);background:var(--zx-bg-panel);color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);line-height:var(--zx-leading-code);white-space:pre-wrap;overflow-wrap:anywhere;margin:0;overflow:auto}._l8RgW_children{gap:var(--zx-space-2);padding-left:var(--zx-space-4);border-left:1px solid var(--zx-border-soft);flex-direction:column;display:flex}._l8RgW_group{gap:var(--zx-space-2);flex-direction:column;display:flex}";
		const tagId$8 = "@dsh-portable/dcode-ui/ToolCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
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
			const contentId = (0, react.useId)();
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
						className: `${ToolCard_module_css_default.head} ${ui.cardHeader}`,
						"aria-expanded": open,
						"aria-controls": contentId,
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
						id: contentId,
						children: [argsRaw === void 0 || argsRaw.trim() === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: ToolCard_module_css_default.bodyLabel,
							children: t("details.arguments")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: ToolCard_module_css_default.output,
							tabIndex: 0,
							role: "region",
							"aria-label": t("details.arguments"),
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
							tabIndex: 0,
							role: "region",
							"aria-label": t("details.output"),
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
		const css$7 = ".TDoHoq_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);overflow:hidden}.TDoHoq_head{align-items:center;gap:var(--zx-space-3);display:flex}.TDoHoq_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:var(--zx-weight-medium);flex:1;overflow:hidden}.TDoHoq_undo{align-items:center;gap:var(--zx-space-2);min-height:var(--zx-control-xs);padding:0 var(--zx-space-2);border-radius:var(--zx-radius-sm);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-micro);white-space:nowrap;cursor:pointer;background:0 0;border:0;display:inline-flex}.TDoHoq_undo:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.TDoHoq_undo:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.TDoHoq_row{align-items:center;gap:var(--zx-space-3);width:100%;min-height:30px;padding:var(--zx-space-1) var(--zx-space-4);border:0;border-top:1px solid var(--zx-border-soft);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;display:flex}.TDoHoq_row:hover{background:var(--zx-bg-hover)}.TDoHoq_row:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.TDoHoq_path{text-overflow:ellipsis;white-space:nowrap;text-align:left;min-width:0;font-family:var(--zx-font-mono);direction:rtl;flex:1;overflow:hidden}.TDoHoq_dir{color:var(--zx-label-tertiary)}.TDoHoq_note{padding:var(--zx-space-2) var(--zx-space-4) var(--zx-space-3);color:var(--zx-label-muted);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body);margin:0}.TDoHoq_noteError{color:var(--zx-error)}";
		const tagId$7 = "@dsh-portable/dcode-ui/FileChanges.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		var FileChanges_module_css_default = {
			"card": "TDoHoq_card",
			"dir": "TDoHoq_dir",
			"head": "TDoHoq_head",
			"note": "TDoHoq_note",
			"noteError": "TDoHoq_noteError",
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
			const [confirmingUndo, setConfirmingUndo] = (0, react.useState)(false);
			const [acknowledgedUndo, setAcknowledgedUndo] = (0, react.useState)(false);
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
					if (!result.ok) {
						setNote({
							text: result.error.message,
							kind: "error"
						});
						return;
					}
					const reverted = result.value.outcomes.filter((outcome) => outcome.result !== "skipped");
					const quarantined = result.value.outcomes.filter((outcome) => outcome.result === "quarantined");
					setNote({
						text: quarantined.length === 0 ? t("changes.undone", { count: reverted.length }) : `${t("changes.undone", { count: reverted.length })} · ${quarantined.map((o) => o.movedTo ?? o.path).join(", ")}`,
						kind: "success"
					});
					onChanged();
				}).catch((cause) => {
					setNote({
						text: cause instanceof Error ? cause.message : String(cause),
						kind: "error"
					});
				}).finally(() => {
					setUndoing(false);
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
						className: `${FileChanges_module_css_default.head} ${ui.cardHeader}`,
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
								onClick: () => {
									setAcknowledgedUndo(false);
									setConfirmingUndo(true);
								},
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
						className: `${FileChanges_module_css_default.note} ${note.kind === "error" ? FileChanges_module_css_default.noteError : ""}`,
						role: note.kind === "error" ? "alert" : "status",
						children: note.text
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
						open: confirmingUndo,
						title: t("changes.undoConfirmTitle"),
						description: t("changes.undoConfirmBody"),
						acknowledgeLabel: t("changes.undoConfirmAcknowledge"),
						cancelLabel: t("common.cancel"),
						closeLabel: t("common.close"),
						confirmLabel: t("changes.undo"),
						acknowledged: acknowledgedUndo,
						disabled: undoing,
						onAcknowledgedChange: setAcknowledgedUndo,
						onCancel: () => {
							setAcknowledgedUndo(false);
							setConfirmingUndo(false);
						},
						onConfirm: () => {
							if (!acknowledgedUndo) return;
							setAcknowledgedUndo(false);
							setConfirmingUndo(false);
							undo();
						}
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\chat\Transcript.module.css.mjs
		const css$6 = ".KYRGnq_scroller{scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;flex-direction:column;flex:1 1 0;min-height:0;display:flex;overflow:hidden auto}.KYRGnq_scroller::-webkit-scrollbar{width:var(--zx-scrollbar-size)}.KYRGnq_scroller::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.KYRGnq_loadingState{justify-content:center;align-items:center;gap:var(--zx-space-3);color:var(--zx-label-muted);font-size:var(--zx-text-sm);flex:1;display:flex}.KYRGnq_turnNavigator{top:var(--zx-space-3);z-index:var(--zx-z-sticky);align-self:flex-end;gap:var(--zx-space-1);margin:var(--zx-space-3) var(--zx-space-5) calc(var(--zx-space-3) * -1);padding:var(--zx-space-1);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-pill);background:var(--zx-bg-overlay);box-shadow:var(--zx-shadow-popover);display:inline-flex;position:sticky}.KYRGnq_turnButton{min-width:var(--zx-control-xs);min-height:var(--zx-control-xs);padding:0 var(--zx-space-2);border-radius:var(--zx-radius-pill);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-micro);cursor:pointer;background:0 0;border:0}.KYRGnq_turnButton:hover,.KYRGnq_turnButton[aria-current=true]{background:var(--zx-bg-active);color:var(--zx-label)}.KYRGnq_turnButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.KYRGnq_flow{--zx-flow-gutter:var(--zx-space-5);gap:var(--zx-space-5);width:min(var(--zx-reading-width), calc(100% - var(--zx-flow-gutter) * 2));padding:var(--zx-space-6) var(--zx-flow-gutter) var(--zx-space-6);flex-direction:column;flex:none;margin:0 auto;display:flex}@container (width<=720px){.KYRGnq_flow{--zx-flow-gutter:var(--zx-space-4);padding-top:var(--zx-space-5);padding-bottom:var(--zx-space-5)}}.KYRGnq_turn{gap:var(--zx-space-5);flex-direction:column;display:flex}.KYRGnq_user{max-width:86%;padding:var(--zx-space-3) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);color:var(--zx-label);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);white-space:pre-wrap;overflow-wrap:anywhere;align-self:flex-end}.KYRGnq_messageAttachments{gap:var(--zx-space-2);margin-top:var(--zx-space-2);flex-wrap:wrap;display:flex}.KYRGnq_messageImage{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);object-fit:contain;background:var(--zx-bg-panel);width:auto;max-width:min(360px,100%);max-height:260px;display:block}.KYRGnq_attachmentPlaceholder{max-width:220px;min-height:var(--zx-control-md);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);font-size:var(--zx-text-xs);align-items:center;display:inline-flex}.KYRGnq_fileAttachment{align-items:center;gap:var(--zx-space-2);max-width:260px;min-height:var(--zx-control-md);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;display:inline-flex}.KYRGnq_fileAttachment>span{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.KYRGnq_fileAttachment:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.KYRGnq_fileAttachment:disabled{cursor:default;opacity:var(--zx-opacity-disabled)}.KYRGnq_fileAttachment:focus-visible,.KYRGnq_queueAction:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.KYRGnq_steering{border-color:color-mix(in srgb, var(--zx-warn) 40%, transparent);align-self:flex-end;max-width:86%}.KYRGnq_queueRow{align-items:center;gap:var(--zx-space-2) var(--zx-space-3);flex-wrap:wrap;display:flex}.KYRGnq_queuePreview{text-overflow:ellipsis;white-space:nowrap;flex:160px;min-width:0;overflow:hidden}.KYRGnq_queueEditor{min-width:160px;height:var(--zx-control-sm);padding:0 var(--zx-space-2);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-sm);background:var(--zx-bg-panel);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);outline:none;flex:160px}.KYRGnq_queueEditor:focus{border-color:var(--zx-accent)}.KYRGnq_queueActions{flex:none;align-items:center;gap:2px;display:inline-flex}.KYRGnq_queueAction{width:26px;height:var(--zx-control-xs);border-radius:var(--zx-radius-pill);color:var(--zx-label-muted);cursor:pointer;background:0 0;border:0;place-items:center;padding:0;display:grid}.KYRGnq_queueAction:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.KYRGnq_queueAction:disabled{cursor:default;opacity:var(--zx-opacity-disabled)}.KYRGnq_queueError{color:var(--zx-error);font-size:var(--zx-text-micro);flex:1 0 100%}.KYRGnq_assistant{font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);color:var(--zx-label);overflow-wrap:anywhere}.KYRGnq_messageActions{align-items:center;gap:var(--zx-space-1);min-height:var(--zx-control-lg);margin-top:var(--zx-space-1);display:flex}.KYRGnq_messageAction{width:var(--zx-control-lg);height:var(--zx-control-lg);min-height:var(--zx-control-lg)}.KYRGnq_messageActionActive{background:var(--zx-bg-active);color:var(--zx-accent)}.KYRGnq_actionError{color:var(--zx-error);font-size:var(--zx-text-micro)}.KYRGnq_imageButton{border-radius:var(--zx-radius-md);cursor:zoom-in;background:0 0;border:0;max-width:100%;padding:0;display:inline-flex}.KYRGnq_imageButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.KYRGnq_lightboxBackdrop{z-index:var(--zx-z-dialog);padding:var(--zx-space-6);background:var(--zx-scrim);place-items:center;display:grid;position:fixed;inset:0}.KYRGnq_lightbox{max-width:min(92vw,1200px);max-height:92vh;padding:var(--zx-space-3);border:1px solid var(--zx-border);border-radius:var(--zx-radius-lg);background:var(--zx-bg-overlay);box-shadow:var(--zx-shadow-dialog);place-items:center;display:grid;position:relative}.KYRGnq_lightbox:focus-visible{box-shadow:var(--zx-shadow-dialog), var(--zx-focus-ring);outline:none}.KYRGnq_lightboxImage{max-width:calc(92vw - var(--zx-space-6));max-height:calc(92vh - var(--zx-space-6));object-fit:contain;display:block}.KYRGnq_lightboxClose{top:var(--zx-space-2);right:var(--zx-space-2);z-index:var(--zx-z-menu);width:var(--zx-control-xl);height:var(--zx-control-xl);border-radius:var(--zx-radius-pill);background:var(--zx-bg-hover);color:var(--zx-label);cursor:pointer;border:0;place-items:center;padding:0;display:grid;position:absolute}.KYRGnq_lightboxClose:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.KYRGnq_assistant pre{max-width:100%;overflow-x:auto}.KYRGnq_blockGap{gap:var(--zx-space-4);flex-direction:column;display:flex}.KYRGnq_reasoning{border-left:2px solid var(--zx-border);padding-left:var(--zx-space-4);color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.KYRGnq_reasoningHead{align-items:center;gap:var(--zx-space-2);color:var(--zx-label-muted);font:inherit;cursor:pointer;background:0 0;border:0;padding:0;display:inline-flex}.KYRGnq_reasoningHead:hover{color:var(--zx-label-secondary)}.KYRGnq_notice{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-3) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-secondary);font-size:var(--zx-text-xs);display:flex}.KYRGnq_noticeError{border-color:color-mix(in srgb, var(--zx-error) 45%, transparent);color:var(--zx-error)}.KYRGnq_noticeWarn{border-color:color-mix(in srgb, var(--zx-warn) 45%, transparent);color:var(--zx-warn)}.KYRGnq_divider{align-items:center;gap:var(--zx-space-3);color:var(--zx-label-decor);font-size:var(--zx-text-micro);display:flex}.KYRGnq_divider:before,.KYRGnq_divider:after{content:\"\";background:var(--zx-border-soft);flex:1;height:1px}.KYRGnq_stats{align-items:center;gap:var(--zx-space-3);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;display:flex}.KYRGnq_loadOlder{align-self:center}.KYRGnq_hero{justify-content:center;align-items:center;gap:var(--zx-space-4);padding:var(--zx-space-7);text-align:center;flex-direction:column;flex:1;display:flex;position:relative;overflow:hidden}.KYRGnq_heroBlank{padding-bottom:calc(var(--zx-space-6) + var(--zx-space-4));justify-content:flex-end}.KYRGnq_heroGreeting{font-size:var(--zx-text-2xl);font-weight:var(--zx-weight-medium);color:var(--zx-label);letter-spacing:-.02em;line-height:var(--zx-leading-tight);position:relative}.KYRGnq_heroTitle{font-size:var(--zx-text-xl);font-weight:var(--zx-weight-medium);color:var(--zx-label)}.KYRGnq_heroBody{max-width:480px;color:var(--zx-label-muted);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);margin:0}.KYRGnq_streamingDot{background:var(--zx-accent);border-radius:50%;width:7px;height:7px;margin-left:4px;animation:1s steps(2,start) infinite KYRGnq_zx-blink;display:inline-block}@keyframes KYRGnq_zx-blink{50%{opacity:.2}}@media (prefers-reduced-motion:reduce){.KYRGnq_streamingDot{animation:none}}";
		const tagId$6 = "@dsh-portable/dcode-ui/Transcript.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var Transcript_module_css_default = {
			"actionError": "KYRGnq_actionError",
			"assistant": "KYRGnq_assistant",
			"attachmentPlaceholder": "KYRGnq_attachmentPlaceholder",
			"blockGap": "KYRGnq_blockGap",
			"divider": "KYRGnq_divider",
			"fileAttachment": "KYRGnq_fileAttachment",
			"flow": "KYRGnq_flow",
			"hero": "KYRGnq_hero",
			"heroBlank": "KYRGnq_heroBlank",
			"heroBody": "KYRGnq_heroBody",
			"heroGreeting": "KYRGnq_heroGreeting",
			"heroTitle": "KYRGnq_heroTitle",
			"imageButton": "KYRGnq_imageButton",
			"lightbox": "KYRGnq_lightbox",
			"lightboxBackdrop": "KYRGnq_lightboxBackdrop",
			"lightboxClose": "KYRGnq_lightboxClose",
			"lightboxImage": "KYRGnq_lightboxImage",
			"loadOlder": "KYRGnq_loadOlder",
			"loadingState": "KYRGnq_loadingState",
			"messageAction": "KYRGnq_messageAction",
			"messageActionActive": "KYRGnq_messageActionActive",
			"messageActions": "KYRGnq_messageActions",
			"messageAttachments": "KYRGnq_messageAttachments",
			"messageImage": "KYRGnq_messageImage",
			"notice": "KYRGnq_notice",
			"noticeError": "KYRGnq_noticeError",
			"noticeWarn": "KYRGnq_noticeWarn",
			"queueAction": "KYRGnq_queueAction",
			"queueActions": "KYRGnq_queueActions",
			"queueEditor": "KYRGnq_queueEditor",
			"queueError": "KYRGnq_queueError",
			"queuePreview": "KYRGnq_queuePreview",
			"queueRow": "KYRGnq_queueRow",
			"reasoning": "KYRGnq_reasoning",
			"reasoningHead": "KYRGnq_reasoningHead",
			"scroller": "KYRGnq_scroller",
			"stats": "KYRGnq_stats",
			"steering": "KYRGnq_steering",
			"streamingDot": "KYRGnq_streamingDot",
			"turn": "KYRGnq_turn",
			"turnButton": "KYRGnq_turnButton",
			"turnNavigator": "KYRGnq_turnNavigator",
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
		function feedbackError(error) {
			return new Error(error?.message ?? error?.code ?? "feedback request failed");
		}
		/** Read and mutate the durable feedback sidecar shared by assistant rows. */
		function useMessageFeedback(sessionId) {
			const remote = useRuntime().remote.messageFeedback;
			const [items, setItems] = (0, react.useState)(() => /* @__PURE__ */ new Map());
			const [pending, setPending] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [error, setError] = (0, react.useState)(void 0);
			const itemsRef = (0, react.useRef)(/* @__PURE__ */ new Map());
			const pendingRef = (0, react.useRef)(/* @__PURE__ */ new Set());
			(0, react.useEffect)(() => {
				let live = true;
				const empty = /* @__PURE__ */ new Map();
				itemsRef.current = empty;
				setItems(empty);
				setError(void 0);
				if (sessionId === void 0 || remote === void 0) return () => {
					live = false;
				};
				remote.list({ sessionId }).then((carried) => {
					if (!live) return;
					if (!carried.ok) throw feedbackError(carried.error);
					const result = carried.value;
					if (!result.ok) throw feedbackError(result.error);
					const next = new Map(result.value.items.map((item) => [item.messageId, item]));
					itemsRef.current = next;
					setItems(next);
				}).catch((cause) => {
					if (!live) return;
					setError(cause instanceof Error ? cause.message : String(cause));
				});
				return () => {
					live = false;
				};
			}, [remote, sessionId]);
			const toggle = (0, react.useCallback)(async (messageId, rating) => {
				if (sessionId === void 0 || remote === void 0 || pendingRef.current.has(messageId)) return void 0;
				pendingRef.current.add(messageId);
				setPending(new Set(pendingRef.current));
				setError(void 0);
				const current = itemsRef.current.get(messageId);
				try {
					if (current?.rating === rating) {
						const carried = await remote.delete({
							sessionId,
							messageId,
							ifVersion: current.version
						});
						if (!carried.ok) throw feedbackError(carried.error);
						if (!carried.value.ok) throw feedbackError(carried.value.error);
						const next = new Map(itemsRef.current);
						next.delete(messageId);
						itemsRef.current = next;
						setItems(next);
					} else {
						const carried = await remote.put({
							sessionId,
							messageId,
							rating,
							ifVersion: current?.version ?? null
						});
						if (!carried.ok) throw feedbackError(carried.error);
						if (!carried.value.ok) throw feedbackError(carried.value.error);
						const next = new Map(itemsRef.current);
						next.set(messageId, carried.value.value);
						itemsRef.current = next;
						setItems(next);
					}
					return;
				} catch (cause) {
					return cause instanceof Error ? cause.message : String(cause);
				} finally {
					pendingRef.current.delete(messageId);
					setPending(new Set(pendingRef.current));
				}
			}, [remote, sessionId]);
			return {
				enabled: remote !== void 0,
				items,
				pending,
				error,
				toggle
			};
		}
		/** Click-to-expand image viewer for durable and local message images. */
		function ImageLightbox(props) {
			const t = useT();
			const [open, setOpen] = (0, react.useState)(false);
			const panelRef = (0, react.useRef)(null);
			const close = (0, react.useCallback)(() => {
				setOpen(false);
			}, []);
			useModalFocus(open, panelRef, { onClose: close });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: Transcript_module_css_default.imageButton,
				"aria-label": t("chat.image.open"),
				onClick: () => {
					setOpen(true);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					className: Transcript_module_css_default.messageImage,
					src: props.src,
					alt: props.alt
				})
			}), open ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Transcript_module_css_default.lightboxBackdrop,
				onPointerDown: (event) => {
					if (event.target === event.currentTarget) close();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: panelRef,
					className: Transcript_module_css_default.lightbox,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": props.alt,
					tabIndex: -1,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: Transcript_module_css_default.lightboxClose,
						"aria-label": t("chat.image.close"),
						onClick: close,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						className: Transcript_module_css_default.lightboxImage,
						src: props.src,
						alt: props.alt
					})]
				})
			}), document.body) : null] });
		}
		/** Reasoning text, folded by default. */
		function Reasoning({ text }) {
			const t = useT();
			const [open, setOpen] = (0, react.useState)(false);
			const panelId = (0, react.useId)();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.reasoning,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: Transcript_module_css_default.reasoningHead,
					"aria-expanded": open,
					"aria-controls": panelId,
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
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					id: panelId,
					role: "region",
					children: text
				}) : null]
			});
		}
		/** Session-authorized image display; the Conversation assembly owns its URL cache. */
		function DurableImage(props) {
			const runtime = useRuntime();
			const [src, setSrc] = (0, react.useState)(() => runtime.media?.peekImageUrl(props.sessionId, props.attachment));
			(0, react.useEffect)(() => {
				let live = true;
				const media = runtime.media;
				const cached = media?.peekImageUrl(props.sessionId, props.attachment);
				if (cached !== void 0) {
					setSrc(cached);
					return () => {
						live = false;
					};
				}
				if (media === void 0) return () => {
					live = false;
				};
				media.imageUrl(props.sessionId, props.attachment).then((value) => {
					if (live) setSrc(value);
				}, () => void 0);
				return () => {
					live = false;
				};
			}, [
				props.attachment,
				props.sessionId,
				runtime
			]);
			return src === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Transcript_module_css_default.attachmentPlaceholder,
				children: props.attachment.name ?? "image"
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageLightbox, {
				src,
				alt: props.attachment.name ?? "image"
			});
		}
		/** One durable file reference which can be downloaded from the same session. */
		function DurableFile(props) {
			const runtime = useRuntime();
			const label = props.attachment.name ?? "attachment";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: Transcript_module_css_default.fileAttachment,
				title: label,
				onClick: () => {
					runtime.media?.downloadFile(props.sessionId, props.attachment);
				},
				disabled: runtime.media === void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: label }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, {})
				]
			});
		}
		/** Render message attachments without changing the DCode message layout. */
		function MessageAttachments(props) {
			const images = [...props.images ?? []];
			const files = [];
			for (const block of props.content ?? []) {
				const candidate = block;
				if (candidate.type === "image" && candidate.attachment !== void 0) images.push(candidate.attachment);
				else if (candidate.type === "file" && candidate.attachment !== void 0) files.push(candidate.attachment);
			}
			if (images.length === 0 && files.length === 0 && (props.previews?.length ?? 0) === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.messageAttachments,
				children: [
					props.previews?.map((image, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageLightbox, {
						src: image.previewUrl,
						alt: image.name ?? "image"
					}, `${image.previewUrl}:${String(index)}`)),
					images.map((attachment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DurableImage, {
						sessionId: props.sessionId,
						attachment
					}, `${attachment.attachmentId}:${String(index)}`)),
					files.map((attachment, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DurableFile, {
						sessionId: props.sessionId,
						attachment
					}, `${attachment.attachmentId}:${String(index)}`))
				]
			});
		}
		/** A user bubble can carry text, images, files, or an image-only prompt. */
		function UserBubble(props) {
			const text = messageText(props.content);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${Transcript_module_css_default.user} ${props.className ?? ""}`,
				children: [text === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: text }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageAttachments, {
					sessionId: props.sessionId,
					content: props.content
				})]
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
					if (block.kind === "image") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageAttachments, {
						sessionId: props.sessionId,
						images: [block.attachment]
					}, index);
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
				role: "status",
				"aria-live": "polite",
				children: [
					model === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: model }),
					total === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("chat.tokens", { count: total }) }),
					node.interrupted === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("chat.interrupted") }) : null
				]
			});
		}
		function assistantText(blocks) {
			return blocks.flatMap((block) => block.kind === "text" ? [block.text] : []).join("");
		}
		/** Copy, feedback, and branch actions for one settled assistant answer. */
		function AssistantActions(props) {
			const runtime = useRuntime();
			const t = useT();
			const [branching, setBranching] = (0, react.useState)(false);
			const [branchError, setBranchError] = (0, react.useState)(void 0);
			const [feedbackError, setFeedbackError] = (0, react.useState)(void 0);
			const text = assistantText(props.node.blocks);
			const messageId = props.node.messageId === void 0 ? void 0 : String(props.node.messageId);
			const item = messageId === void 0 ? void 0 : props.feedback.items.get(messageId);
			const pending = messageId === void 0 ? false : props.feedback.pending.has(messageId);
			const branch = (0, react.useCallback)(async () => {
				if (branching) return;
				setBranching(true);
				setBranchError(void 0);
				try {
					const child = await runtime.sessions.fork({
						sessionId: props.sessionId,
						atSeq: props.node.seq,
						increaseTitle: true
					});
					runtime.sessions.open(child);
				} catch (cause) {
					setBranchError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setBranching(false);
				}
			}, [
				branching,
				props.node.seq,
				props.sessionId,
				runtime
			]);
			const rate = (0, react.useCallback)((rating) => {
				if (messageId === void 0) return;
				setFeedbackError(void 0);
				props.feedback.toggle(messageId, rating).then((failure) => {
					if (failure !== void 0) setFeedbackError(failure);
				});
			}, [messageId, props.feedback]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.messageActions,
				children: [
					text === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CopyButton, {
						text,
						label: t("chat.message.copy"),
						copiedLabel: t("chat.message.copied"),
						className: Transcript_module_css_default.messageAction
					}),
					props.feedback.enabled && messageId !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${Transcript_module_css_default.messageAction} ${item?.rating === "positive" ? Transcript_module_css_default.messageActionActive : ""}`,
						"aria-label": t("chat.feedback.positive"),
						"aria-pressed": item?.rating === "positive",
						disabled: pending,
						onClick: () => {
							rate("positive");
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLikeOutline16, {})
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${Transcript_module_css_default.messageAction} ${item?.rating === "negative" ? Transcript_module_css_default.messageActionActive : ""}`,
						"aria-label": t("chat.feedback.negative"),
						"aria-pressed": item?.rating === "negative",
						disabled: pending,
						onClick: () => {
							rate("negative");
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDislikeOutline16, {})
					})] }) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: Transcript_module_css_default.messageAction,
						"aria-label": t("chat.message.branch"),
						disabled: branching,
						onClick: () => {
							branch();
						},
						children: branching ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, { size: "sm" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
					}),
					branchError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Transcript_module_css_default.actionError,
						role: "alert",
						children: t("chat.message.branchFailed", { error: branchError })
					}),
					feedbackError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Transcript_module_css_default.actionError,
						role: "alert",
						children: t("chat.feedback.failed", { error: feedbackError })
					})
				]
			});
		}
		/** Render one conversation node. */
		function Node$1(props) {
			const t = useT();
			const { node } = props;
			switch (node.kind) {
				case "user": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UserBubble, {
					sessionId: props.sessionId,
					content: node.content
				});
				case "steering": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UserBubble, {
					sessionId: props.sessionId,
					content: node.content,
					className: Transcript_module_css_default.steering
				});
				case "assistant": return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssistantBlocks, {
						sessionId: props.sessionId,
						blocks: node.blocks,
						streaming: false,
						labels: props.labels
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AssistantActions, {
						sessionId: props.sessionId,
						node,
						feedback: props.feedback
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Stats, { node })
				] });
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
					role: "alert",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), node.message === "" ? node.code ?? t("common.error") : node.message]
				});
				default: return null;
			}
		}
		/** Queue controls mirror the host queue verbs instead of treating queued text as static output. */
		function QueuedMessageRow(props) {
			const runtime = useRuntime();
			const t = useT();
			const [editing, setEditing] = (0, react.useState)(false);
			const [draft, setDraft] = (0, react.useState)(props.item.text ?? props.item.preview);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const editable = props.item.text !== null;
			(0, react.useEffect)(() => {
				if (!editing) setDraft(props.item.text ?? props.item.preview);
				if (!editable) setEditing(false);
			}, [
				editable,
				editing,
				props.item.preview,
				props.item.text
			]);
			const apply = (0, react.useCallback)(async (action) => {
				const session = runtime.binding(props.sessionId)?.session;
				if (session === void 0 || busy) return;
				setBusy(true);
				setError(void 0);
				try {
					const result = await session.updateQueue(props.item.id, action);
					if (!result.ok) throw new Error(result.error.message);
					if (action.kind === "edit") setEditing(false);
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setBusy(false);
				}
			}, [
				busy,
				props.item.id,
				props.sessionId,
				runtime
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${Transcript_module_css_default.user} ${Transcript_module_css_default.steering} ${Transcript_module_css_default.queueRow}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Transcript_module_css_default.stats,
						children: t("chat.queued")
					}),
					editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: Transcript_module_css_default.queueEditor,
						value: draft,
						"aria-label": t("chat.editQueued"),
						autoFocus: true,
						onChange: (event) => {
							setDraft(event.target.value);
						},
						onKeyDown: (event) => {
							if (event.key === "Escape") setEditing(false);
							if (event.key === "Enter" && !event.nativeEvent.isComposing) {
								event.preventDefault();
								if (draft.trim() !== "") apply({
									kind: "edit",
									content: [{
										type: "text",
										text: draft.trim()
									}]
								});
							}
						}
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Transcript_module_css_default.queuePreview,
						children: props.item.text ?? props.item.preview
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Transcript_module_css_default.queueActions,
						children: editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Transcript_module_css_default.queueAction,
							"aria-label": t("chat.saveQueued"),
							disabled: busy || draft.trim() === "",
							onClick: () => {
								apply({
									kind: "edit",
									content: [{
										type: "text",
										text: draft.trim()
									}]
								});
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Transcript_module_css_default.queueAction,
							"aria-label": t("chat.cancelQueuedEdit"),
							disabled: busy,
							onClick: () => {
								setEditing(false);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Transcript_module_css_default.queueAction,
								"aria-label": t("chat.editQueued"),
								title: editable ? void 0 : t("chat.editQueuedUnsupported"),
								disabled: busy || !editable,
								onClick: () => {
									if (editable) setEditing(true);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Transcript_module_css_default.queueAction,
								"aria-label": t("chat.removeQueued"),
								disabled: busy,
								onClick: () => {
									apply({ kind: "remove" });
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Transcript_module_css_default.queueAction,
								"aria-label": t("chat.steerQueued"),
								title: props.running ? void 0 : t("chat.steerQueuedUnavailable"),
								disabled: busy || !props.running || props.item.placement !== "queued",
								onClick: () => {
									apply({ kind: "steer" });
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline14, {})
							})
						] })
					}),
					error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Transcript_module_css_default.queueError,
						role: "alert",
						children: error
					})
				]
			});
		}
		/** Local submission echo shown while attachment admission is still in flight. */
		function PendingSubmissionBubble(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.user,
				children: [props.submission.text === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: props.submission.text }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageAttachments, {
					sessionId: props.sessionId,
					previews: props.submission.images
				})]
			});
		}
		function dynamicGreetingKey() {
			const hour = (/* @__PURE__ */ new Date()).getHours();
			if (hour >= 5 && hour < 12) return "chat.empty.morning";
			if (hour >= 12 && hour < 18) return "chat.empty.afternoon";
			return "chat.empty.evening";
		}
		/** Compact index for jumping between loaded conversation turns. */
		function TurnNavigator(props) {
			const t = useT();
			const [active, setActive] = (0, react.useState)(0);
			if (props.turns.length < 2) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
				className: Transcript_module_css_default.turnNavigator,
				"aria-label": t("chat.turnNavigation.label"),
				children: props.turns.map((_turn, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Transcript_module_css_default.turnButton,
					"aria-label": t("chat.turnNavigation.turn", { count: index + 1 }),
					"aria-current": active === index ? "true" : void 0,
					onClick: () => {
						(props.scrollerRef.current?.querySelector(`[data-turn-index="${String(index)}"]`))?.scrollIntoView({
							behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
							block: "start"
						});
						setActive(index);
					},
					children: index + 1
				}, index))
			});
		}
		/** The scrolling conversation, its turn summaries and its streaming tail. */
		function Transcript({ navigation, sessionId, cwd, blank }) {
			const runtime = useRuntime();
			const t = useT();
			const chat = useChatSnapshot(sessionId);
			const session = useSessionSnapshot(sessionId);
			const git = useGitStatus(cwd, sessionId);
			const feedback = useMessageFeedback(sessionId);
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
			if (chat === void 0 && !blank) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Transcript_module_css_default.loadingState,
				role: "status",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, { size: "sm" }), t("chat.loading")]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Transcript_module_css_default.scroller,
				ref: scrollerRef,
				tabIndex: 0,
				role: "region",
				"aria-label": t("chat.transcript"),
				children: blank ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${Transcript_module_css_default.hero} ${Transcript_module_css_default.heroBlank}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Transcript_module_css_default.heroGreeting,
						children: t(dynamicGreetingKey())
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: Transcript_module_css_default.heroBody,
						children: cwd === void 0 ? t("chat.empty.noWorkspace") : t("chat.empty.body", { cwd })
					})]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TurnNavigator, {
					turns,
					scrollerRef
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: Transcript_module_css_default.flow,
					children: [
						feedback.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${Transcript_module_css_default.notice} ${Transcript_module_css_default.noticeError}`,
							role: "alert",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), t("chat.feedback.failed", { error: feedback.error })]
						}),
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
								"data-turn-index": turnIndex,
								children: [turn.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Node$1, {
									sessionId,
									node,
									labels,
									onInspect: (callId) => {
										navigation.inspect(callId);
									},
									feedback
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
							sessionId,
							blocks: partial.blocks,
							streaming: true,
							labels
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Transcript_module_css_default.streamingDot,
							role: "status",
							"aria-label": t("chat.thinking")
						})] }),
						session?.running === true && partial === null && runningCalls.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: Transcript_module_css_default.stats,
							role: "status",
							"aria-live": "polite",
							children: [t("chat.thinking"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: Transcript_module_css_default.streamingDot })]
						}) : null,
						session?.pendingSubmissions.map((submission) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PendingSubmissionBubble, {
							sessionId,
							submission
						}, submission.requestId)),
						session?.queue.length === 0 ? null : session?.queue.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QueuedMessageRow, {
							sessionId,
							item,
							running: session.running
						}, item.id)),
						session?.lastAgentError === null || session?.lastAgentError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${Transcript_module_css_default.notice} ${Transcript_module_css_default.noticeError}`,
							role: "alert",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), session.lastAgentError]
						})
					]
				})] })
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\learning\LearningHome.module.css.mjs
		const css$5 = ".F7L6-W_surface{grid-template-columns:220px 1fr;width:100%;min-width:0;display:grid;overflow:hidden}.F7L6-W_rail{border-right:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);padding:var(--zx-space-3);padding-top:calc(var(--zx-space-4) + var(--dsh-desktop-titlebar-height,0px));flex-direction:column;gap:2px;display:flex;overflow:hidden auto}.F7L6-W_back{align-items:center;gap:var(--zx-space-3);height:var(--zx-control-sm);padding:0 var(--zx-space-3);margin-bottom:var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.F7L6-W_back:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.F7L6-W_railItem{align-items:center;gap:var(--zx-space-3);height:var(--zx-control-md);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.F7L6-W_railItem:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.F7L6-W_railItemActive{background:var(--zx-bg-active);color:var(--zx-label)}.F7L6-W_railGroup{padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro)}.F7L6-W_body{min-width:0;padding:var(--zx-space-7) var(--zx-space-7) var(--zx-space-7);padding-top:calc(var(--zx-space-6) + var(--dsh-desktop-titlebar-height,0px));overflow:hidden auto}.F7L6-W_inner{gap:var(--zx-space-6);flex-direction:column;width:min(900px,100%);margin:0 auto;display:flex}.F7L6-W_title{font-size:var(--zx-text-2xl);font-weight:var(--zx-weight-medium);color:var(--zx-label)}.F7L6-W_subtitle{color:var(--zx-label-muted);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);max-width:620px}.F7L6-W_grid{gap:var(--zx-space-4);grid-template-columns:repeat(auto-fit,minmax(240px,1fr));display:grid}.F7L6-W_mode{gap:var(--zx-space-2);padding:var(--zx-space-5);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);color:inherit;font:inherit;text-align:left;cursor:pointer;transition:border-color var(--zx-motion-fast), background var(--zx-motion-fast);flex-direction:column;display:flex}.F7L6-W_mode:hover:not(:disabled){border-color:var(--zx-border);background:var(--zx-bg-hover)}.F7L6-W_mode:disabled{opacity:var(--zx-opacity-disabled);cursor:default}.F7L6-W_modeTitle{align-items:center;gap:var(--zx-space-3);font-size:var(--zx-text-md);color:var(--zx-label);display:flex}.F7L6-W_modeBody{color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.F7L6-W_sessionRow{align-items:center;gap:var(--zx-space-3);width:100%;min-height:var(--zx-control-lg);padding:var(--zx-space-2) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;display:flex}.F7L6-W_sessionRow:hover{background:var(--zx-bg-hover)}.F7L6-W_sessionTitle{text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;overflow:hidden}.F7L6-W_library{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);min-height:420px;overflow:hidden}.F7L6-W_note{color:var(--zx-label-muted);font-size:var(--zx-text-xs)}";
		const tagId$5 = "@dsh-portable/dcode-ui/LearningHome.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
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
		var LearningBoundary = class extends react.Component {
			state = {};
			static getDerivedStateFromError(error) {
				return { error: error instanceof Error ? error.message : String(error) };
			}
			componentDidCatch(_error, _info) {}
			render() {
				return this.state.error === void 0 ? this.props.children : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "alert",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: this.props.t("learning.error", { error: this.state.error }) })
				});
			}
		};
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
						"aria-current": section === entry.id ? "page" : void 0,
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
									role: "alert",
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
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningBoundary, {
									t,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Suspense, {
										fallback: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											role: "status",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("learning.loading") })
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_dsh_portable_interactive_learning_client.VaultLibrary, {
											cwd,
											call: runtime.learningCall,
											t: runtime.learningT,
											embedded: true
										})
									})
								})
							})] }) : null
						]
					})
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\settings\SettingsSurface.module.css.mjs
		const css$4 = ".yP511q_surface{grid-template-columns:240px 1fr;width:100%;min-width:0;display:grid;position:relative;overflow:hidden}.yP511q_rail{padding:var(--zx-space-3);padding-top:calc(var(--zx-space-4) + var(--dsh-desktop-titlebar-height,0px));border-right:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);flex-direction:column;gap:1px;display:flex;overflow:hidden auto}.yP511q_back{align-items:center;gap:var(--zx-space-3);height:var(--zx-control-sm);padding:0 var(--zx-space-3);margin-bottom:var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.yP511q_back:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.yP511q_group{padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro)}.yP511q_item{align-items:center;gap:var(--zx-space-3);height:var(--zx-control-md);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.yP511q_item:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.yP511q_itemActive{background:var(--zx-bg-active);color:var(--zx-label)}.yP511q_body{min-width:0;padding:var(--zx-space-7);padding-top:calc(var(--zx-space-6) + var(--dsh-desktop-titlebar-height,0px));overflow:hidden auto}.yP511q_inner{gap:var(--zx-space-6);flex-direction:column;width:min(820px,100%);margin:0 auto;display:flex}.yP511q_officialSection{min-width:0;color:var(--zx-label)}.yP511q_title{font-size:var(--zx-text-2xl);font-weight:var(--zx-weight-medium);color:var(--zx-label)}.yP511q_section{gap:var(--zx-space-3);flex-direction:column;display:flex}.yP511q_sectionTitle{font-size:var(--zx-text-lg);color:var(--zx-label)}.yP511q_sectionBody{color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.yP511q_usageTotal{gap:var(--zx-space-2);padding:var(--zx-space-5);border:1px solid color-mix(in srgb, var(--zx-accent) 30%, var(--zx-border-soft));border-radius:var(--zx-radius-lg);background:color-mix(in srgb, var(--zx-accent) 8%, var(--zx-bg-card));flex-direction:column;display:flex}.yP511q_usageTotalTitle{color:var(--zx-label-secondary);font-size:var(--zx-text-xs)}.yP511q_usageTotalValue{color:var(--zx-label);font-family:var(--zx-font-mono);font-size:var(--zx-text-2xl);font-weight:var(--zx-weight-semibold);line-height:1.1}.yP511q_usageTotalScope{color:var(--zx-label-muted);font-size:var(--zx-text-micro)}.yP511q_usageGrid{gap:var(--zx-space-3);grid-template-columns:repeat(2,minmax(0,1fr));display:grid}.yP511q_usageMetric{gap:var(--zx-space-2);min-width:0;padding:var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);flex-direction:column;display:flex}.yP511q_usageMetricTitle{color:var(--zx-label-muted);font-size:var(--zx-text-micro)}.yP511q_usageMetricValue{color:var(--zx-label);font-family:var(--zx-font-mono);font-size:var(--zx-text-lg);font-weight:var(--zx-weight-medium);overflow-wrap:anywhere}.yP511q_usageStatus,.yP511q_usageEmpty{padding:var(--zx-space-5);color:var(--zx-label-muted);font-size:var(--zx-text-xs)}.yP511q_usageGrid{grid-template-columns:repeat(4,minmax(0,1fr))}[data-dcode-layout=compact] .yP511q_usageGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.yP511q_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);overflow:hidden}.yP511q_row{align-items:center;gap:var(--zx-space-4);padding:var(--zx-space-4) var(--zx-space-5);display:flex}.yP511q_row+.yP511q_row{border-top:1px solid var(--zx-border-soft)}.yP511q_rowText{flex:1;min-width:0}.yP511q_rowTitle{color:var(--zx-label);font-size:var(--zx-text-sm)}.yP511q_rowBody{color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);margin-top:2px}.yP511q_inlineError{padding:0 var(--zx-space-5) var(--zx-space-4);color:var(--zx-error);font-size:var(--zx-text-xs)}.yP511q_rowMono{font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);color:var(--zx-label-secondary);overflow-wrap:anywhere}.yP511q_choice{gap:var(--zx-space-3);display:flex}.yP511q_option{gap:var(--zx-space-2);padding:var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);color:inherit;font:inherit;text-align:left;cursor:pointer;transition:border-color var(--zx-motion-fast);flex-direction:column;flex:1;display:flex}.yP511q_option:hover{border-color:var(--zx-border)}.yP511q_optionActive{border-color:var(--zx-accent);background:color-mix(in srgb, var(--zx-accent) 8%, var(--zx-bg-card))}.yP511q_optionTitle{align-items:center;gap:var(--zx-space-2);color:var(--zx-label);font-size:var(--zx-text-sm);display:flex}.yP511q_select{height:var(--zx-control-sm);min-width:140px;padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs)}.yP511q_number{width:84px;height:var(--zx-control-sm);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:right}.yP511q_stepper{height:var(--zx-control-md);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);align-items:center;display:inline-flex;overflow:hidden}.yP511q_stepperButton{width:30px;height:100%;color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-md);cursor:pointer;background:0 0;border:0;line-height:1}.yP511q_stepperButton:hover:not(:disabled){background:var(--zx-bg-hover);color:var(--zx-label)}.yP511q_stepperButton:disabled{cursor:default;opacity:var(--zx-opacity-disabled)}.yP511q_stepperButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.yP511q_stepperValue{min-width:34px;color:var(--zx-label);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);text-align:center}.yP511q_search{width:100%;height:var(--zx-control-md);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);box-sizing:border-box}.yP511q_search:focus{border-color:var(--zx-accent);outline:none}.yP511q_badge{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums}.yP511q_providerList{gap:var(--zx-space-3);flex-direction:column;display:flex}.yP511q_providerCard{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);overflow:hidden}.yP511q_providerHead{flex:none;min-width:0}.yP511q_statusDot{background:var(--zx-label-tertiary);border-radius:50%;flex:none;width:8px;height:8px}.yP511q_statusDotGood{background:var(--zx-success,#49b77a);box-shadow:0 0 0 3px color-mix(in srgb, var(--zx-success,#49b77a) 14%, transparent)}.yP511q_statusDotMissing{background:var(--zx-warn);box-shadow:0 0 0 3px color-mix(in srgb, var(--zx-warn) 14%, transparent)}.yP511q_statusDotNeutral{background:var(--zx-label-tertiary)}.yP511q_providerEditor{gap:var(--zx-space-4);padding:var(--zx-space-4) var(--zx-space-5) var(--zx-space-5);border-top:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);flex-direction:column;display:flex}.yP511q_field{gap:var(--zx-space-2);flex-direction:column;display:flex}.yP511q_fieldLabel{color:var(--zx-label-secondary);font-size:var(--zx-text-xs)}.yP511q_fieldInput{width:100%;height:var(--zx-control-md);box-sizing:border-box;padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs)}.yP511q_fieldInput:focus{border-color:var(--zx-accent);box-shadow:var(--zx-focus-ring);outline:none}.yP511q_fieldInput:disabled{opacity:var(--zx-opacity-disabled)}.yP511q_editorActions{justify-content:flex-end;gap:var(--zx-space-2);padding-top:var(--zx-space-1);display:flex}.yP511q_presetActions{justify-content:flex-end;align-items:center;gap:var(--zx-space-2);flex-wrap:wrap;display:flex}.yP511q_dialogBackdrop{z-index:var(--zx-z-dialog);padding:var(--zx-space-6);background:var(--zx-scrim);backdrop-filter:blur(5px);justify-content:center;align-items:center;display:flex;position:absolute;inset:0}.yP511q_dialog{gap:var(--zx-space-4);box-sizing:border-box;width:min(520px,100%);max-height:min(680px,90vh);padding:var(--zx-space-5);border:1px solid var(--zx-border);border-radius:var(--zx-radius-lg);background:var(--zx-bg-overlay);box-shadow:var(--zx-shadow-dialog);flex-direction:column;display:flex;overflow:hidden auto}.yP511q_dialogHeader{justify-content:space-between;align-items:center;gap:var(--zx-space-4);display:flex}.yP511q_dialogTitle{color:var(--zx-label);font-size:var(--zx-text-lg);font-weight:var(--zx-weight-medium)}.yP511q_dialogBody{color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);margin:0}.yP511q_dialogActions{justify-content:flex-end;gap:var(--zx-space-2);padding-top:var(--zx-space-1);display:flex}.yP511q_viewerCode{max-height:52vh;padding:var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);color:var(--zx-label-secondary);font-family:var(--zx-font-mono);font-size:var(--zx-text-xs);white-space:pre-wrap;margin:0;line-height:1.6;overflow:auto}.yP511q_revealedPath{padding:var(--zx-space-3) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);color:var(--zx-label-muted);font-size:var(--zx-text-xs);overflow-wrap:anywhere;margin:0}.yP511q_revealedPath code{color:var(--zx-label-secondary);font-family:var(--zx-font-mono)}.yP511q_pluginTabs{align-self:flex-start;gap:var(--zx-space-1);padding:var(--zx-space-1);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel);display:inline-flex}.yP511q_pluginTab{min-height:var(--zx-control-sm);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-sm,6px);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);cursor:pointer;background:0 0;border:0}.yP511q_pluginTab:hover{color:var(--zx-label);background:var(--zx-bg-hover)}.yP511q_pluginTabActive{color:var(--zx-label);background:var(--zx-bg-active)}.yP511q_pluginTab:focus-visible,.yP511q_inventoryButton:focus-visible,.yP511q_switch:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.yP511q_pluginConfigList{gap:var(--zx-space-3);flex-direction:column;display:flex}.yP511q_pluginCard{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);overflow:hidden}.yP511q_pluginCardHeader{flex:none;min-width:0}.yP511q_pluginCardHeader>.yP511q_badge{flex:none}.yP511q_pluginCardBody{gap:var(--zx-space-4);padding:var(--zx-space-4) var(--zx-space-5) var(--zx-space-5);border-top:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);flex-direction:column;display:flex}.yP511q_fieldMeta{justify-content:space-between;align-items:center;gap:var(--zx-space-3);display:flex}.yP511q_fieldHint{color:var(--zx-label-muted);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body)}.yP511q_resetButton{min-height:var(--zx-control-xs);padding:0 var(--zx-space-2);color:var(--zx-label-muted);font-size:var(--zx-text-micro)}.yP511q_switchRow{justify-content:space-between;align-items:center;gap:var(--zx-space-4);display:flex}.yP511q_switch{width:38px;height:var(--zx-control-xs);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-pill);background:var(--zx-bg-raised);cursor:pointer;transition:background var(--zx-motion-fast), border-color var(--zx-motion-fast);flex:none;padding:2px;position:relative}.yP511q_switchOn{border-color:var(--zx-accent);background:var(--zx-accent)}.yP511q_switch:disabled{cursor:default;opacity:var(--zx-opacity-disabled)}.yP511q_switchThumb{background:var(--zx-label-secondary);width:16px;height:16px;transition:transform var(--zx-motion-fast), background var(--zx-motion-fast);border-radius:50%;display:block}.yP511q_switchOn .yP511q_switchThumb{background:var(--zx-on-accent);transform:translate(16px)}.yP511q_visionRoute{align-items:flex-start;gap:var(--zx-space-3);padding:var(--zx-space-3) var(--zx-space-4);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);display:flex}.yP511q_visionRouteAuto{border-color:color-mix(in srgb, var(--zx-accent) 32%, var(--zx-border-soft))}.yP511q_visionRoutePinned{border-color:color-mix(in srgb, var(--zx-success,#49b77a) 35%, var(--zx-border-soft))}.yP511q_visionRouteDisabled{opacity:.78}.yP511q_modelList{gap:var(--zx-space-2);min-width:0;padding:var(--zx-space-3);border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);flex-direction:column;margin:0;display:flex}.yP511q_modelList legend{padding:0 var(--zx-space-2)}.yP511q_modelOption{align-items:flex-start;gap:var(--zx-space-3);padding:var(--zx-space-2);border-radius:var(--zx-radius-md);cursor:pointer;display:flex}.yP511q_modelOption:hover{background:var(--zx-bg-hover)}.yP511q_modelOption input{accent-color:var(--zx-accent);margin-top:3px}.yP511q_modelRoute{color:var(--zx-label-muted);font-family:var(--zx-font-mono);font-size:var(--zx-text-micro);overflow-wrap:anywhere;margin-top:2px;display:block}.yP511q_pluginInventory{gap:var(--zx-space-3);flex-direction:column;display:flex}.yP511q_inventoryHeading{justify-content:space-between;align-items:center;display:flex}.yP511q_inventoryRow+.yP511q_inventoryRow{border-top:1px solid var(--zx-border-soft)}.yP511q_inventoryButton{align-items:center;gap:var(--zx-space-4);width:100%;padding:var(--zx-space-4) var(--zx-space-5);color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.yP511q_inventoryButton:hover{background:var(--zx-bg-hover)}.yP511q_inventoryDetails{padding:0 var(--zx-space-5) var(--zx-space-4);color:var(--zx-label-muted);font-family:var(--zx-font-mono);font-size:var(--zx-text-micro);overflow-wrap:anywhere;display:block}.yP511q_notice{padding:var(--zx-space-3) var(--zx-space-4);border:1px solid color-mix(in srgb, var(--zx-warn) 35%, var(--zx-border-soft));border-radius:var(--zx-radius-md);background:color-mix(in srgb, var(--zx-warn) 8%, var(--zx-bg-card));color:var(--zx-label-secondary);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}[data-dcode-layout=compact] .yP511q_providerHead{align-items:flex-start}[data-dcode-layout=compact] .yP511q_providerHead>button{flex:none}[data-dcode-layout=compact] .yP511q_presetActions{flex-direction:column;align-items:flex-end}";
		const tagId$4 = "@dsh-portable/dcode-ui/SettingsSurface.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var SettingsSurface_module_css_default = {
			"back": "yP511q_back",
			"badge": "yP511q_badge",
			"body": "yP511q_body",
			"card": "yP511q_card",
			"choice": "yP511q_choice",
			"dialog": "yP511q_dialog",
			"dialogActions": "yP511q_dialogActions",
			"dialogBackdrop": "yP511q_dialogBackdrop",
			"dialogBody": "yP511q_dialogBody",
			"dialogHeader": "yP511q_dialogHeader",
			"dialogTitle": "yP511q_dialogTitle",
			"editorActions": "yP511q_editorActions",
			"field": "yP511q_field",
			"fieldHint": "yP511q_fieldHint",
			"fieldInput": "yP511q_fieldInput",
			"fieldLabel": "yP511q_fieldLabel",
			"fieldMeta": "yP511q_fieldMeta",
			"group": "yP511q_group",
			"inlineError": "yP511q_inlineError",
			"inner": "yP511q_inner",
			"inventoryButton": "yP511q_inventoryButton",
			"inventoryDetails": "yP511q_inventoryDetails",
			"inventoryHeading": "yP511q_inventoryHeading",
			"inventoryRow": "yP511q_inventoryRow",
			"item": "yP511q_item",
			"itemActive": "yP511q_itemActive",
			"modelList": "yP511q_modelList",
			"modelOption": "yP511q_modelOption",
			"modelRoute": "yP511q_modelRoute",
			"notice": "yP511q_notice",
			"number": "yP511q_number",
			"officialSection": "yP511q_officialSection",
			"option": "yP511q_option",
			"optionActive": "yP511q_optionActive",
			"optionTitle": "yP511q_optionTitle",
			"pluginCard": "yP511q_pluginCard",
			"pluginCardBody": "yP511q_pluginCardBody",
			"pluginCardHeader": "yP511q_pluginCardHeader",
			"pluginConfigList": "yP511q_pluginConfigList",
			"pluginInventory": "yP511q_pluginInventory",
			"pluginTab": "yP511q_pluginTab",
			"pluginTabActive": "yP511q_pluginTabActive",
			"pluginTabs": "yP511q_pluginTabs",
			"presetActions": "yP511q_presetActions",
			"providerCard": "yP511q_providerCard",
			"providerEditor": "yP511q_providerEditor",
			"providerHead": "yP511q_providerHead",
			"providerList": "yP511q_providerList",
			"rail": "yP511q_rail",
			"resetButton": "yP511q_resetButton",
			"revealedPath": "yP511q_revealedPath",
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
			"statusDot": "yP511q_statusDot",
			"statusDotGood": "yP511q_statusDotGood",
			"statusDotMissing": "yP511q_statusDotMissing",
			"statusDotNeutral": "yP511q_statusDotNeutral",
			"stepper": "yP511q_stepper",
			"stepperButton": "yP511q_stepperButton",
			"stepperValue": "yP511q_stepperValue",
			"surface": "yP511q_surface",
			"switch": "yP511q_switch",
			"switchOn": "yP511q_switchOn",
			"switchRow": "yP511q_switchRow",
			"switchThumb": "yP511q_switchThumb",
			"title": "yP511q_title",
			"usageEmpty": "yP511q_usageEmpty",
			"usageGrid": "yP511q_usageGrid",
			"usageMetric": "yP511q_usageMetric",
			"usageMetricTitle": "yP511q_usageMetricTitle",
			"usageMetricValue": "yP511q_usageMetricValue",
			"usageStatus": "yP511q_usageStatus",
			"usageTotal": "yP511q_usageTotal",
			"usageTotalScope": "yP511q_usageTotalScope",
			"usageTotalTitle": "yP511q_usageTotalTitle",
			"usageTotalValue": "yP511q_usageTotalValue",
			"viewerCode": "yP511q_viewerCode",
			"visionRoute": "yP511q_visionRoute",
			"visionRouteAuto": "yP511q_visionRouteAuto",
			"visionRouteDisabled": "yP511q_visionRouteDisabled",
			"visionRoutePinned": "yP511q_visionRoutePinned"
		};
		//#endregion
		//#region src/client/settings/PluginSettingsSection.tsx
		/** DCode-owned plugin settings over the existing settings and inventory remotes. */
		function objectValue(source) {
			return typeof source === "object" && source !== null && !Array.isArray(source) ? source : {};
		}
		function hasField(source, key) {
			return Object.hasOwn(objectValue(source), key);
		}
		function fieldValue(source, key) {
			return objectValue(source)[key];
		}
		function fieldText(source, key) {
			const value = fieldValue(source, key);
			return typeof value === "number" || typeof value === "string" ? String(value) : "";
		}
		function modelKey(provider, model) {
			return `${provider}\0${model}`;
		}
		async function loadPluginSettings(runtime, includeSettings) {
			const inventoryPromise = runtime.remote.pluginInventory.list();
			if (!includeSettings) {
				const inventory = await inventoryPromise;
				if (!inventory.ok) throw new Error(inventory.error.message);
				return {
					settings: void 0,
					inventory: inventory.value,
					catalog: void 0,
					credential: void 0
				};
			}
			const [inventory, settings, catalog] = await Promise.all([
				inventoryPromise,
				runtime.remote.settings.describe(),
				runtime.remote.session.modelCatalog()
			]);
			if (!inventory.ok) throw new Error(inventory.error.message);
			if (!settings.ok) throw new Error(settings.error.message);
			const webSearch = settings.value.namespaces.find((namespace) => namespace.ns === "web-search-deepseek");
			const credentialRef = typeof fieldValue(webSearch?.value, "apiKeyEnv") === "string" && String(fieldValue(webSearch?.value, "apiKeyEnv")).length > 0 ? String(fieldValue(webSearch?.value, "apiKeyEnv")) : "DEEPSEEK_API_KEY";
			let credential;
			let credentialError;
			try {
				const described = await runtime.remote.credentials.describe([credentialRef]);
				if (described.ok) credential = described.value[credentialRef];
				else credentialError = described.error.message;
			} catch (cause) {
				credentialError = cause instanceof Error ? cause.message : String(cause);
			}
			return {
				settings: {
					writable: settings.value.writable,
					namespaces: settings.value.namespaces
				},
				inventory: inventory.value,
				catalog: catalog.ok ? catalog.value : void 0,
				credential,
				...credentialError === void 0 ? {} : { credentialError }
			};
		}
		function PluginSettingsCard(props) {
			const runtime = useRuntime();
			const t = useT();
			const user = objectValue(props.namespace.user);
			const [draft, setDraft] = (0, react.useState)(() => Object.fromEntries(props.fields.map((field) => [field.key, fieldText(props.namespace.value, field.key)])));
			const [resetFields, setResetFields] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const [credentialDraft, setCredentialDraft] = (0, react.useState)("");
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const credentialWritable = props.credential?.writable !== false;
			const canSave = props.writable || props.credentialLabel !== void 0 && credentialWritable;
			const dirty = props.fields.some((field) => {
				if (resetFields.has(field.key)) return hasField(user, field.key);
				const text = draft[field.key] ?? "";
				const stored = fieldValue(user, field.key);
				const effective = fieldValue(props.namespace.value, field.key);
				if (text.trim() === "") return hasField(user, field.key);
				const parsed = field.type === "number" ? Number(text) : text.trim();
				return (field.type === "number" ? Number.isFinite(parsed) : true) && JSON.stringify(parsed) !== JSON.stringify(stored) && !(stored === void 0 && JSON.stringify(parsed) === JSON.stringify(effective));
			}) || credentialDraft.trim().length > 0;
			const save = async () => {
				if (!canSave || saving || !dirty) return;
				setSaving(true);
				setError(void 0);
				try {
					const ops = [];
					for (const field of props.fields) {
						const text = draft[field.key]?.trim() ?? "";
						if (resetFields.has(field.key)) {
							if (hasField(user, field.key)) ops.push({
								op: "unset",
								path: [field.key]
							});
							continue;
						}
						if (text === "") {
							if (hasField(user, field.key)) ops.push({
								op: "unset",
								path: [field.key]
							});
							continue;
						}
						const next = field.type === "number" ? Number(text) : text;
						if (field.type === "number" && !Number.isFinite(next)) throw new Error(t("settings.plugins.invalidNumber"));
						const stored = fieldValue(user, field.key);
						const effective = fieldValue(props.namespace.value, field.key);
						if (JSON.stringify(next) === JSON.stringify(stored)) continue;
						if (stored === void 0 && JSON.stringify(next) === JSON.stringify(effective)) continue;
						ops.push({
							op: "set",
							path: [field.key],
							value: next
						});
					}
					if (props.writable && ops.length > 0) {
						const response = await runtime.remote.settings.mutate(props.namespace.ns, ops, props.namespace.revision);
						if (!response.ok) throw new Error(response.error.message);
					}
					if (credentialDraft.trim() !== "") {
						const ref = typeof fieldValue(props.namespace.value, "apiKeyEnv") === "string" && String(fieldValue(props.namespace.value, "apiKeyEnv")).length > 0 ? String(fieldValue(props.namespace.value, "apiKeyEnv")) : "DEEPSEEK_API_KEY";
						const response = await runtime.remote.credentials.set(ref, credentialDraft.trim());
						if (!response.ok) throw new Error(response.error.message);
					}
					props.onReload();
					setCredentialDraft("");
					setResetFields(/* @__PURE__ */ new Set());
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SettingsSurface_module_css_default.pluginCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: `${SettingsSurface_module_css_default.pluginCardHeader} ${ui.cardHeader}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.rowText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.rowTitle,
							children: props.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.rowBody,
							children: props.description
						})]
					}), props.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SettingsSurface_module_css_default.badge,
						children: props.namespace.applies
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SettingsSurface_module_css_default.badge,
						children: t("common.readOnly")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SettingsSurface_module_css_default.pluginCardBody,
					children: [
						props.credentialLabel === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: SettingsSurface_module_css_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.fieldLabel,
									children: props.credentialLabel
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: SettingsSurface_module_css_default.fieldInput,
									type: "password",
									autoComplete: "off",
									value: credentialDraft,
									placeholder: props.credential?.configured === true ? t("settings.plugins.keyConfiguredHint") : t("settings.plugins.keyPlaceholder"),
									disabled: saving || !credentialWritable,
									onChange: (event) => {
										setCredentialDraft(event.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.fieldHint,
									children: props.credential?.configured === true ? t("settings.plugins.keyConfigured") : props.credentialHint
								})
							]
						}),
						props.fields.map((field) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: SettingsSurface_module_css_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SettingsSurface_module_css_default.fieldMeta,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SettingsSurface_module_css_default.fieldLabel,
										children: field.label
									}), hasField(user, field.key) && !resetFields.has(field.key) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										className: SettingsSurface_module_css_default.resetButton,
										onClick: () => {
											setResetFields((previous) => /* @__PURE__ */ new Set([...previous, field.key]));
											setDraft((previous) => ({
												...previous,
												[field.key]: fieldText(props.namespace.base, field.key)
											}));
										},
										disabled: saving || !props.writable,
										children: t("settings.plugins.reset")
									}) : null]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: SettingsSurface_module_css_default.fieldInput,
									type: field.type === "number" ? "number" : "text",
									value: draft[field.key] ?? "",
									placeholder: fieldText(props.namespace.base, field.key) || t("settings.plugins.defaultValue"),
									disabled: saving || !props.writable,
									onChange: (event) => {
										setResetFields((previous) => {
											const next = new Set(previous);
											next.delete(field.key);
											return next;
										});
										setDraft((previous) => ({
											...previous,
											[field.key]: event.target.value
										}));
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.fieldHint,
									children: field.hint
								})
							]
						}, field.key)),
						error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.inlineError,
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.editorActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									setDraft(Object.fromEntries(props.fields.map((field) => [field.key, fieldText(props.namespace.value, field.key)])));
									setResetFields(/* @__PURE__ */ new Set());
									setCredentialDraft("");
									setError(void 0);
								},
								disabled: saving || !dirty,
								children: t("settings.plugins.discard")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								primary: true,
								onClick: () => {
									save();
								},
								disabled: saving || !canSave || !dirty,
								children: saving ? t("settings.plugins.saving") : t("settings.plugins.save")
							})]
						})
					]
				})]
			});
		}
		function VisionBridgeCard(props) {
			const runtime = useRuntime();
			const t = useT();
			const effectiveEnabled = typeof fieldValue(props.namespace.value, "enabled") === "boolean" ? fieldValue(props.namespace.value, "enabled") : true;
			const effectiveModel = fieldText(props.namespace.value, "model").trim();
			const [enabled, setEnabled] = (0, react.useState)(effectiveEnabled);
			const [model, setModel] = (0, react.useState)(effectiveModel);
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const dirty = enabled !== effectiveEnabled || model.trim() !== effectiveModel;
			const routeKind = !enabled ? "disabled" : model.trim() === "" ? "auto" : "pinned";
			const routeClass = routeKind === "disabled" ? SettingsSurface_module_css_default.visionRouteDisabled : routeKind === "auto" ? SettingsSurface_module_css_default.visionRouteAuto : SettingsSurface_module_css_default.visionRoutePinned;
			const routeLabel = routeKind === "disabled" ? t("settings.plugins.visionRouteDisabled") : routeKind === "auto" ? t("settings.plugins.visionRouteAutomatic") : t("settings.plugins.visionRoutePinned");
			const save = () => {
				if (!props.writable || saving || !dirty) return;
				setSaving(true);
				setError(void 0);
				const ops = [];
				if (enabled !== effectiveEnabled) ops.push({
					op: "set",
					path: ["enabled"],
					value: enabled
				});
				if (model.trim() !== effectiveModel) ops.push({
					op: "set",
					path: ["model"],
					value: model.trim()
				});
				runtime.remote.settings.mutate(props.namespace.ns, ops, props.namespace.revision).then((result) => {
					if (!result.ok) throw new Error(result.error.message);
					props.onReload();
				}).catch((cause) => {
					setError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setSaving(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SettingsSurface_module_css_default.pluginCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: `${SettingsSurface_module_css_default.pluginCardHeader} ${ui.cardHeader}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.rowText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.rowTitle,
							children: t("settings.plugins.visionTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.rowBody,
							children: t("settings.plugins.visionDescription")
						})]
					}), props.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SettingsSurface_module_css_default.badge,
						children: props.namespace.applies
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SettingsSurface_module_css_default.badge,
						children: t("common.readOnly")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SettingsSurface_module_css_default.pluginCardBody,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.visionRoute + " " + routeClass,
							role: "status",
							"aria-live": "polite",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.statusDot,
								"aria-hidden": "true"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SettingsSurface_module_css_default.rowText,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SettingsSurface_module_css_default.rowTitle,
									children: routeLabel
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SettingsSurface_module_css_default.rowBody,
									children: model.trim() === "" ? t("settings.plugins.visionRouteAutomaticHint") : model.trim()
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.notice,
							children: t("settings.plugins.visionSharedProvider")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.switchRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SettingsSurface_module_css_default.rowText,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SettingsSurface_module_css_default.rowTitle,
									children: t("settings.plugins.visionEnabled")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SettingsSurface_module_css_default.rowBody,
									children: t("settings.plugins.visionEnabledHint")
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "switch",
								"aria-label": t("settings.plugins.visionEnabled"),
								"aria-checked": enabled,
								className: SettingsSurface_module_css_default.switch + " " + (enabled ? SettingsSurface_module_css_default.switchOn : ""),
								disabled: saving || !props.writable,
								onClick: () => {
									setEnabled((value) => !value);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SettingsSurface_module_css_default.switchThumb })
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: SettingsSurface_module_css_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.fieldLabel,
									children: t("settings.plugins.visionModel")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: SettingsSurface_module_css_default.fieldInput,
									type: "text",
									value: model,
									placeholder: t("settings.plugins.visionModelPlaceholder"),
									disabled: saving || !props.writable,
									onChange: (event) => {
										setModel(event.target.value);
									}
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.fieldHint,
									children: t("settings.plugins.visionModelHint")
								})
							]
						}),
						model.trim() !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							className: SettingsSurface_module_css_default.resetButton,
							onClick: () => {
								setModel("");
							},
							disabled: saving || !props.writable,
							children: t("settings.plugins.visionUseAutomatic")
						}) : null,
						error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.inlineError,
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.editorActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									setEnabled(effectiveEnabled);
									setModel(effectiveModel);
									setError(void 0);
								},
								disabled: saving || !dirty,
								children: t("settings.plugins.discard")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								primary: true,
								onClick: save,
								disabled: saving || !props.writable || !dirty,
								children: saving ? t("settings.plugins.saving") : t("settings.plugins.save")
							})]
						})
					]
				})]
			});
		}
		function SubagentModelCard(props) {
			const runtime = useRuntime();
			const t = useT();
			const initialRoutes = Array.isArray(fieldValue(props.namespace.value, "allowedModels")) ? fieldValue(props.namespace.value, "allowedModels") : [];
			const [enabled, setEnabled] = (0, react.useState)(() => fieldValue(props.namespace.value, "enabled") === true);
			const [selected, setSelected] = (0, react.useState)(() => new Set(initialRoutes.flatMap((route) => typeof route.provider === "string" && typeof route.model === "string" ? [modelKey(route.provider, route.model)] : [])));
			const [saving, setSaving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)();
			const candidates = (0, react.useMemo)(() => {
				const rows = props.catalog?.groups.flatMap((group) => group.models.map((model) => ({
					key: modelKey(group.id, model.id),
					provider: group.id,
					providerName: group.name,
					model: model.id,
					name: model.name
				}))) ?? [];
				const known = new Set(rows.map((row) => row.key));
				return [...rows, ...initialRoutes.flatMap((route) => {
					if (typeof route.provider !== "string" || typeof route.model !== "string") return [];
					const key = modelKey(route.provider, route.model);
					return known.has(key) ? [] : [{
						key,
						provider: route.provider,
						providerName: route.provider,
						model: route.model,
						name: route.model
					}];
				})];
			}, [initialRoutes, props.catalog]);
			const dirty = enabled !== (fieldValue(props.namespace.value, "enabled") === true) || candidates.some((candidate) => selected.has(candidate.key) !== initialRoutes.some((route) => route.provider === candidate.provider && route.model === candidate.model));
			const save = () => {
				if (!props.writable || saving || !dirty) return;
				if (enabled && selected.size === 0) {
					setError(t("settings.plugins.subagentModelSelectionRequired"));
					return;
				}
				setSaving(true);
				setError(void 0);
				const allowedModels = candidates.filter((candidate) => selected.has(candidate.key)).map((candidate) => ({
					provider: candidate.provider,
					model: candidate.model
				}));
				runtime.remote.settings.mutate(props.namespace.ns, [{
					op: "set",
					path: ["enabled"],
					value: enabled
				}, {
					op: "set",
					path: ["allowedModels"],
					value: allowedModels
				}], props.namespace.revision).then((result) => {
					if (!result.ok) throw new Error(result.error.message);
					props.onReload();
				}).catch((cause) => {
					setError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setSaving(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SettingsSurface_module_css_default.pluginCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: `${SettingsSurface_module_css_default.pluginCardHeader} ${ui.cardHeader}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.rowText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.rowTitle,
							children: t("settings.plugins.subagentModelSelectionTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.rowBody,
							children: t("settings.plugins.subagentModelSelectionDescription")
						})]
					}), !props.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SettingsSurface_module_css_default.badge,
						children: t("common.readOnly")
					}) : null]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SettingsSurface_module_css_default.pluginCardBody,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.switchRow,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.fieldLabel,
								children: t("settings.plugins.subagentModelSelectionToggle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								role: "switch",
								"aria-label": t("settings.plugins.subagentModelSelectionToggle"),
								"aria-checked": enabled,
								className: `${SettingsSurface_module_css_default.switch} ${enabled ? SettingsSurface_module_css_default.switchOn : ""}`,
								disabled: saving || !props.writable,
								onClick: () => {
									setEnabled((value) => !value);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SettingsSurface_module_css_default.switchThumb })
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: SettingsSurface_module_css_default.fieldHint,
							children: t(enabled ? "settings.plugins.subagentModelSelectionChoose" : "settings.plugins.subagentModelSelectionOff")
						}),
						enabled ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("fieldset", {
							className: SettingsSurface_module_css_default.modelList,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
								className: SettingsSurface_module_css_default.fieldLabel,
								children: t("settings.plugins.subagentModelSelectionAllowed")
							}), candidates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.fieldHint,
								children: t("settings.plugins.subagentModelSelectionEmpty")
							}) : candidates.map((candidate) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: SettingsSurface_module_css_default.modelOption,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: selected.has(candidate.key),
									disabled: saving || !props.writable,
									onChange: () => {
										setSelected((previous) => {
											const next = new Set(previous);
											if (next.has(candidate.key)) next.delete(candidate.key);
											else next.add(candidate.key);
											return next;
										});
									}
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SettingsSurface_module_css_default.rowText,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SettingsSurface_module_css_default.rowTitle,
										children: candidate.name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SettingsSurface_module_css_default.modelRoute,
										children: `${candidate.providerName} · ${candidate.provider}/${candidate.model}`
									})]
								})]
							}, candidate.key))]
						}) : null,
						props.catalog === void 0 && enabled ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.notice,
							children: t("settings.plugins.subagentModelSelectionLoadFailed")
						}) : null,
						error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.inlineError,
							role: "alert",
							children: error
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.editorActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									setEnabled(fieldValue(props.namespace.value, "enabled") === true);
									setSelected(new Set(initialRoutes.flatMap((route) => typeof route.provider === "string" && typeof route.model === "string" ? [modelKey(route.provider, route.model)] : [])));
									setError(void 0);
								},
								disabled: saving || !dirty,
								children: t("settings.plugins.discard")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								primary: true,
								onClick: save,
								disabled: saving || !props.writable || !dirty,
								children: saving ? t("settings.plugins.saving") : t("settings.plugins.save")
							})]
						})
					]
				})]
			});
		}
		function PluginConfigSection(props) {
			const t = useT();
			const namespaces = props.data.settings?.namespaces ?? [];
			const find = (ns) => namespaces.find((namespace) => namespace.ns === ns);
			const cards = [];
			const vision = find("vision");
			if (vision !== void 0) cards.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VisionBridgeCard, {
				namespace: vision,
				writable: props.data.settings?.writable === true,
				onReload: props.onReload
			}, vision.ns));
			const shell = find("shell");
			if (shell !== void 0) cards.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginSettingsCard, {
				namespace: shell,
				writable: props.data.settings?.writable === true,
				title: t("settings.plugins.shellTitle"),
				description: t("settings.plugins.shellDescription"),
				fields: [{
					key: "timeoutMs",
					label: t("settings.plugins.shellTimeout"),
					hint: t("settings.plugins.shellTimeoutHint"),
					type: "number"
				}, {
					key: "maxOutputBytes",
					label: t("settings.plugins.shellOutput"),
					hint: t("settings.plugins.shellOutputHint"),
					type: "number"
				}],
				onReload: props.onReload
			}, shell.ns));
			const agentLoop = find("agent-loop");
			if (agentLoop !== void 0) cards.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginSettingsCard, {
				namespace: agentLoop,
				writable: props.data.settings?.writable === true,
				title: t("settings.plugins.agentLoopTitle"),
				description: t("settings.plugins.agentLoopDescription"),
				fields: [{
					key: "maxParallelToolCalls",
					label: t("settings.plugins.agentLoopParallel"),
					hint: t("settings.plugins.agentLoopParallelHint"),
					type: "number"
				}],
				onReload: props.onReload
			}, agentLoop.ns));
			const webSearch = find("web-search-deepseek");
			if (webSearch !== void 0) cards.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginSettingsCard, {
				namespace: webSearch,
				writable: props.data.settings?.writable === true,
				title: t("settings.plugins.webSearchTitle"),
				description: t("settings.plugins.webSearchDescription"),
				credential: props.data.credential,
				credentialLabel: t("settings.plugins.webSearchApiKey"),
				credentialHint: t("settings.plugins.webSearchApiKeyHint"),
				fields: [{
					key: "baseURL",
					label: t("settings.plugins.webSearchBaseUrl"),
					hint: t("settings.plugins.webSearchBaseUrlHint"),
					type: "text"
				}, {
					key: "maxUses",
					label: t("settings.plugins.webSearchMaxUses"),
					hint: t("settings.plugins.webSearchMaxUsesHint"),
					type: "number"
				}],
				onReload: props.onReload
			}, webSearch.ns));
			const subagent = find("subagent-model-selection");
			if (subagent !== void 0) cards.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SubagentModelCard, {
				namespace: subagent,
				writable: props.data.settings?.writable === true,
				catalog: props.data.catalog,
				onReload: props.onReload
			}, subagent.ns));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SettingsSurface_module_css_default.pluginConfigList,
				children: [props.data.credentialError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.notice,
					role: "alert",
					children: `${t("settings.plugins.credentialWarning")}: ${props.data.credentialError}`
				}), cards.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.plugins.emptyConfig") }) : cards]
			});
		}
		function PluginInventory(props) {
			const t = useT();
			const [query, setQuery] = (0, react.useState)("");
			const [expanded, setExpanded] = (0, react.useState)();
			const filtered = props.data.inventory.entries.filter((entry) => !props.mcpOnly || /mcp/i.test(entry.moduleName)).filter((entry) => `${entry.moduleName} ${entry.entryId}`.toLowerCase().includes(query.trim().toLowerCase()));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SettingsSurface_module_css_default.pluginInventory,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: SettingsSurface_module_css_default.search,
						type: "search",
						value: query,
						placeholder: t("settings.plugins.search"),
						"aria-label": t("settings.plugins.search"),
						onChange: (event) => {
							setQuery(event.target.value);
						}
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.inventoryHeading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.sectionTitle,
							children: t("settings.plugins.inventoryTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.badge,
							children: filtered.length
						})]
					}),
					filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.plugins.emptyInventory") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.card,
						children: filtered.map((entry) => {
							const open = expanded === entry.entryId;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SettingsSurface_module_css_default.inventoryRow,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: SettingsSurface_module_css_default.inventoryButton,
									"aria-expanded": open,
									"aria-controls": `plugin-entry-${entry.entryId}`,
									onClick: () => {
										setExpanded((current) => current === entry.entryId ? void 0 : entry.entryId);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: SettingsSurface_module_css_default.rowText,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SettingsSurface_module_css_default.rowTitle,
											children: entry.moduleName
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SettingsSurface_module_css_default.rowBody,
											children: entry.enabled ? entry.fiberPhase ?? t("settings.plugins.unobserved") : t("settings.plugins.disabled")
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SettingsSurface_module_css_default.badge,
										children: entry.enabled ? t("settings.plugins.enabled") : t("settings.plugins.disabled")
									})]
								}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
									id: `plugin-entry-${entry.entryId}`,
									className: SettingsSurface_module_css_default.inventoryDetails,
									children: entry.entryId
								}) : null]
							}, entry.entryId);
						})
					})
				]
			});
		}
		/** Plugins page with DCode tabs, local token styling, and writable host settings. */
		function PluginSettingsSection({ mcpOnly = false }) {
			const runtime = useRuntime();
			const t = useT();
			const data = useAsync(async () => await loadPluginSettings(runtime, !mcpOnly), [runtime, mcpOnly]);
			const [tab, setTab] = (0, react.useState)(mcpOnly ? "inventory" : "config");
			const tabPrefix = (0, react.useId)();
			const tabRefs = (0, react.useRef)({
				config: null,
				inventory: null
			});
			const tabs = [{
				id: "config",
				label: t("settings.plugins.configTab")
			}, {
				id: "inventory",
				label: t("settings.plugins.inventoryTab")
			}];
			const moveTab = (event, index) => {
				if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
				event.preventDefault();
				const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
				const nextTab = tabs[next];
				if (nextTab === void 0) return;
				setTab(nextTab.id);
				tabRefs.current[nextTab.id]?.focus();
			};
			if (data.loading && data.value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (data.error !== void 0 && data.value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: data.error });
			if (data.value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("common.error") });
			const value = data.value;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: SettingsSurface_module_css_default.section,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SettingsSurface_module_css_default.sectionTitle,
						children: mcpOnly ? t("settings.mcp") : t("plugins.section.settings")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SettingsSurface_module_css_default.sectionBody,
						children: mcpOnly ? t("settings.plugins.mcpBody") : t("settings.pluginsBody")
					}),
					!mcpOnly ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.pluginTabs,
						role: "tablist",
						"aria-label": t("settings.plugins.tabs"),
						children: tabs.map((entry, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							ref: (element) => {
								tabRefs.current[entry.id] = element;
							},
							id: `${tabPrefix}-${entry.id}`,
							type: "button",
							role: "tab",
							"aria-selected": tab === entry.id,
							"aria-controls": `${tabPrefix}-panel`,
							tabIndex: tab === entry.id ? 0 : -1,
							className: `${SettingsSurface_module_css_default.pluginTab} ${tab === entry.id ? SettingsSurface_module_css_default.pluginTabActive : ""}`,
							onClick: () => {
								setTab(entry.id);
							},
							onKeyDown: (event) => {
								moveTab(event, index);
							},
							children: entry.label
						}, entry.id))
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						id: `${tabPrefix}-panel`,
						role: "tabpanel",
						tabIndex: 0,
						"aria-labelledby": mcpOnly ? void 0 : `${tabPrefix}-${tab}`,
						children: !mcpOnly && tab === "config" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginConfigSection, {
							data: value,
							onReload: data.reload
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginInventory, {
							data: value,
							mcpOnly
						})
					})
				]
			});
		}
		//#endregion
		//#region src/client/plugins/market.ts
		/**
		* Browser face of the plugin marketplace Host feed.
		*
		* The marketplace ships as its own Host plugin (`dsh-plugin-marketplace`,
		* seeded into the web profile by the runtime's marketplace bootstrap) and
		* exposes plain HTTP routes under `/api/market`. The workbench talks to those
		* routes directly rather than mirroring the catalogue: there is one sync
		* cache, one install queue and one profile manifest, all of them the Host's.
		*
		* Everything crossing the wire is normalised here. The Host half is a
		* separately versioned package that may be absent, older, or replaced by a
		* page answering HTML for an unregistered route, so no component is handed an
		* `unknown`: a missing route becomes a {@link MarketResult} marked
		* `unavailable`, and a drifting payload degrades field by field instead of
		* throwing inside a card.
		* @module @dsh-portable/dcode-ui/client/plugins/market
		*/
		/** Root of the Host's marketplace routes. */
		const MARKET_BASE = "/api/market";
		/** GitHub topic the Host syncs the catalogue from. */
		const MARKET_TOPIC_URL = "https://github.com/topics/dsh-plugin";
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function text(source, key) {
			const value = source[key];
			return typeof value === "string" ? value : "";
		}
		function optionalText(source, key) {
			const value = source[key];
			return typeof value === "string" && value !== "" ? value : void 0;
		}
		function count(source, key) {
			const value = source[key];
			return typeof value === "number" && Number.isFinite(value) ? value : 0;
		}
		const EXPOSURES = [
			"boot-configured",
			"pending-restart",
			"stale",
			"inactive",
			"unknown"
		];
		const PHASES = [
			"pending",
			"resolving",
			"downloading",
			"installing",
			"done",
			"error",
			"canceled"
		];
		/**
		* Read one catalogue row.
		* @param raw - one entry of the Host's `items` array.
		* @returns the row, or undefined when it carries no repository name.
		*/
		function normalizeItem(raw) {
			if (!isRecord(raw)) return void 0;
			const fullName = text(raw, "fullName");
			if (fullName === "") return void 0;
			return {
				fullName,
				url: text(raw, "url") || `https://github.com/${fullName}`,
				description: text(raw, "description"),
				stars: count(raw, "stars"),
				language: text(raw, "language"),
				homepage: text(raw, "homepage"),
				installed: raw["installed"] === true,
				needsRestart: raw["needsRestart"] === true
			};
		}
		/**
		* Read one page of the catalogue.
		* @param raw - the `/api/market/list` body.
		* @param page - the page that was asked for, used when the Host omits it.
		* @returns a page that is safe to render, empty when the body is unusable.
		*/
		function normalizeMarketPage(raw, page) {
			const source = isRecord(raw) ? raw : {};
			const items = Array.isArray(source["items"]) ? source["items"].flatMap((entry) => {
				const item = normalizeItem(entry);
				return item === void 0 ? [] : [item];
			}) : [];
			const resolved = count(source, "page") || page;
			const total = count(source, "total");
			return {
				items,
				total,
				page: resolved,
				hasMore: source["hasMore"] === true || source["hasMore"] === void 0 && resolved * 50 < total,
				fetchedAt: count(source, "fetchedAt"),
				error: optionalText(source, "error")
			};
		}
		/**
		* Read one installed plugin.
		* @param raw - one entry of the Host's `plugins` array.
		* @returns the plugin, or undefined when it carries no package name.
		*/
		function normalizeInstalledPlugin(raw) {
			if (!isRecord(raw)) return void 0;
			const name = text(raw, "name");
			if (name === "") return void 0;
			const enabled = raw["enabled"] === true;
			const exposure = raw["exposure"];
			const activated = typeof raw["activated"] === "boolean" ? raw["activated"] : enabled;
			return {
				name,
				kind: raw["kind"] === "builtin" ? "builtin" : "installed",
				enabled,
				available: typeof raw["available"] === "boolean" ? raw["available"] : void 0,
				activated,
				exposure: EXPOSURES.includes(exposure) ? exposure : activated ? "unknown" : "inactive",
				version: optionalText(raw, "version"),
				latestVersion: optionalText(raw, "latestVersion"),
				updateAvailable: raw["updateAvailable"] === true,
				description: optionalText(raw, "description"),
				homepage: optionalText(raw, "homepage")
			};
		}
		/**
		* Read the profile inventory.
		*
		* Built-in plugins are dropped here rather than in the view: they ship with
		* the harness, were not installed from the marketplace and cannot be removed
		* by it, so giving them a row of disabled buttons would only ask the operator
		* to work out why.
		* @param raw - the `/api/market/installed` body.
		* @returns the third-party plugins, the marketplace's own package, and any
		*   error the Host reported alongside them.
		*/
		function normalizeInstalled(raw) {
			const source = isRecord(raw) ? raw : {};
			const plugins = Array.isArray(source["plugins"]) ? source["plugins"].flatMap((entry) => {
				const plugin = normalizeInstalledPlugin(entry);
				return plugin === void 0 || plugin.kind === "builtin" ? [] : [plugin];
			}) : [];
			const rawSelf = source["self"];
			const selfName = isRecord(rawSelf) ? text(rawSelf, "name") : "";
			return {
				plugins,
				self: isRecord(rawSelf) && selfName !== "" ? {
					name: selfName,
					version: optionalText(rawSelf, "version"),
					latestVersion: optionalText(rawSelf, "latestVersion"),
					updateAvailable: rawSelf["updateAvailable"] === true
				} : void 0,
				error: optionalText(source, "error")
			};
		}
		/**
		* Read a job snapshot.
		* @param raw - the `job` field of an `/api/market/install/status` body.
		* @returns the job, or undefined when the body carries none.
		*/
		function normalizeJob(raw) {
			if (!isRecord(raw)) return void 0;
			const phase = raw["phase"];
			const percent = raw["percent"];
			const eta = raw["etaSec"];
			const packages = isRecord(raw["packages"]) ? raw["packages"] : {};
			return {
				id: text(raw, "id"),
				phase: PHASES.includes(phase) ? phase : "pending",
				step: text(raw, "step"),
				percent: typeof percent === "number" && Number.isFinite(percent) && percent >= 0 ? Math.min(100, Math.round(percent)) : void 0,
				packages: {
					resolved: count(packages, "resolved"),
					reused: count(packages, "reused"),
					downloaded: count(packages, "downloaded"),
					added: count(packages, "added")
				},
				bytesDown: count(raw, "bytesDown"),
				bytesTotal: count(raw, "bytesTotal"),
				speedBps: count(raw, "speedBps"),
				etaSec: typeof eta === "number" && Number.isFinite(eta) && eta > 0 ? eta : void 0,
				log: Array.isArray(raw["log"]) ? raw["log"].filter((line) => typeof line === "string") : [],
				done: raw["done"] === true,
				ok: raw["ok"] === true,
				error: optionalText(raw, "error"),
				requiresRestart: raw["requiresRestart"] === true,
				output: text(raw, "output")
			};
		}
		/** Binary size, at the precision each magnitude can justify. */
		function formatBytes(value) {
			const bytes = Number.isFinite(value) && value > 0 ? value : 0;
			if (bytes < 1024) return `${String(Math.round(bytes))} B`;
			if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
			if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
			return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
		}
		/** Transfer rate, or an empty string while the Host has not measured one. */
		function formatSpeed(value) {
			const bps = Number.isFinite(value) && value > 0 ? value : 0;
			if (bps <= 0) return "";
			if (bps < 1024) return `${String(Math.round(bps))} B/s`;
			if (bps < 1024 ** 2) return `${(bps / 1024).toFixed(0)} KB/s`;
			return `${(bps / 1024 ** 2).toFixed(1)} MB/s`;
		}
		/**
		* Derive the lifecycle strip.
		*
		* The four stages are facts the Host reports separately, and the distinction
		* that matters to an operator is between "not switched on" and "switched on
		* but the harness has not restarted onto it" — the second is why a freshly
		* enabled plugin still does nothing.
		* @param plugin - one installed plugin.
		* @returns the four steps, in the order they happen.
		*/
		function lifecycleSteps(plugin) {
			return [
				{
					id: "installed",
					state: "done"
				},
				{
					id: "available",
					state: plugin.available === void 0 ? "unknown" : plugin.available ? "done" : "off"
				},
				{
					id: "activated",
					state: plugin.activated ? "done" : "off"
				},
				{
					id: "exposed",
					state: plugin.exposure === "boot-configured" ? "done" : plugin.exposure === "pending-restart" || plugin.exposure === "stale" ? "pending" : plugin.exposure === "inactive" ? "off" : "unknown"
				}
			];
		}
		/**
		* Whether an installed plugin is still waiting for a harness restart.
		* @param plugin - one installed plugin.
		* @returns true while what is loaded differs from what the profile says.
		*/
		function pendingRestart(plugin) {
			return plugin.exposure === "pending-restart" || plugin.exposure === "stale";
		}
		/** A route the Host never registered, told apart from a refusal it did send. */
		function missing(message) {
			return {
				ok: false,
				error: message,
				unavailable: true
			};
		}
		function refused(message) {
			return {
				ok: false,
				error: message,
				unavailable: false
			};
		}
		/**
		* Build the marketplace client.
		*
		* Every call returns the envelope rather than throwing: the marketplace is an
		* optional Host plugin, and a deployment without it has to render an
		* explanation, not an error boundary.
		* @param fetchImpl - the transport, defaulting to the page's own `fetch`.
		* @returns the client the plugins surface drives.
		*/
		function createMarketClient(fetchImpl) {
			const transport = fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
			/**
			* One call, with every failure mode folded into the envelope.
			* @param path - route under {@link MARKET_BASE}.
			* @param init - request options; a body implies POST.
			* @param signal - abort signal of the caller's effect.
			* @returns the parsed body, or a refusal describing why there is none.
			*/
			const call = async (path, init) => {
				try {
					const response = await transport(`${MARKET_BASE}${path}`, {
						cache: "no-store",
						...init?.signal === void 0 ? {} : { signal: init.signal },
						...init?.body === void 0 ? {} : {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify(init.body)
						}
					});
					if (!(response.headers.get("content-type") ?? "").includes("json")) return missing(`the marketplace route ${path} is not available`);
					const body = await response.json();
					if (!isRecord(body)) return refused(`malformed answer from ${path}`);
					if (response.status === 404) return missing(text(body, "error") || "not found");
					if (!response.ok && body["ok"] !== true) return refused(text(body, "error") || `the marketplace answered ${String(response.status)}`);
					return {
						ok: true,
						value: body
					};
				} catch (cause) {
					if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
					return refused(cause instanceof Error ? cause.message : String(cause));
				}
			};
			/** Read the job id an async Host answers with; absent on a synchronous one. */
			const startedJob = (body) => {
				const jobId = optionalText(body, "jobId");
				if (jobId !== void 0) return {
					ok: true,
					value: jobId
				};
				if (body["ok"] === true) return {
					ok: true,
					value: void 0
				};
				return refused(text(body, "error") || "the marketplace refused the request");
			};
			const acknowledged = (body) => body["ok"] === false ? refused(text(body, "error") || "the marketplace refused the request") : {
				ok: true,
				value: void 0
			};
			return {
				list: async (query, page, signal) => {
					const params = new URLSearchParams({
						page: String(page),
						per_page: String(50)
					});
					if (query !== "") params.set("q", query);
					const answer = await call(`/list?${params.toString()}`, { ...signal === void 0 ? {} : { signal } });
					return answer.ok ? {
						ok: true,
						value: normalizeMarketPage(answer.value, page)
					} : answer;
				},
				installed: async (signal) => {
					const answer = await call("/installed", { ...signal === void 0 ? {} : { signal } });
					return answer.ok ? {
						ok: true,
						value: normalizeInstalled(answer.value)
					} : answer;
				},
				install: async (spec) => {
					const answer = await call("/install", { body: { spec } });
					return answer.ok ? startedJob(answer.value) : answer;
				},
				update: async (name) => {
					const answer = await call("/update", { body: { name } });
					return answer.ok ? startedJob(answer.value) : answer;
				},
				setEnabled: async (name, enabled) => {
					const answer = await call("/set-enabled", { body: {
						name,
						enabled
					} });
					return answer.ok ? acknowledged(answer.value) : answer;
				},
				uninstall: async (name) => {
					const answer = await call("/uninstall", { body: { name } });
					return answer.ok ? acknowledged(answer.value) : answer;
				},
				job: async (jobId) => {
					const answer = await call(`/install/status?job=${encodeURIComponent(jobId)}`);
					if (!answer.ok) return answer;
					const job = normalizeJob(answer.value["job"]);
					return job === void 0 ? refused(optionalText(answer.value, "error") ?? "the install job expired") : {
						ok: true,
						value: job
					};
				},
				cancel: async (jobId) => {
					await call("/install/cancel", { body: { jobId } });
				},
				translate: async (source) => {
					const answer = await call("/translate", { body: { text: source } });
					if (!answer.ok) return answer;
					return answer.value["ok"] === true ? {
						ok: true,
						value: text(answer.value, "text")
					} : refused(text(answer.value, "error") || "translation failed");
				}
			};
		}
		//#endregion
		//#region src/client/plugins/audits.ts
		/** Reviewed repositories, keyed by lowercased `owner/repo`. */
		const REVIEWED = {
			"omdsh-dev/dsh-genui": {
				reviewed: true,
				contract: {
					en: "^0.1.0-rc.6 (no exact-profile compatibility claim for rc7/Portable)",
					zh: "^0.1.0-rc.6（rc7/Portable 未做 exact-profile 兼容声明）"
				},
				platform: {
					en: "CI: Ubuntu, Node 22/24. Windows and macOS unverified",
					zh: "CI: Ubuntu, Node 22/24；Windows 与 macOS 未验证"
				},
				runtime: {
					en: "Node ^22.19.0 || >=24; bundles Mermaid / Three front-end assets",
					zh: "Node ^22.19.0 || >=24；内置 Mermaid / Three 前端资源"
				},
				egress: {
					en: "May open HTTP(S) links; form and action data is written back into the conversation and reaches the model; images are not uploaded by default",
					zh: "可能打开 HTTP(S) 链接；表单/action 数据会回写对话并进入模型；默认不上传图片"
				},
				activation: {
					en: "Installs as a global tool and a standing glossary, not agent-scoped",
					zh: "安装后为全局工具与 standing glossary；不是 Agent-scoped"
				},
				issues: {
					en: "rc7 has no native fence registry; the long-lived DOM observer path is not adopted; actions are not durable; the standing prompt carries a fixed token cost",
					zh: "rc7 无原生 fence registry；长期 DOM observer 兼容路径不采用；action 非 durable；standing prompt 有固定 token 成本风险"
				},
				verified: {
					en: "Report checked 2026-08-17 · v0.8.6 · 2187fa4",
					zh: "报告核查 2026-08-17 · v0.8.6 · 2187fa4"
				}
			},
			"anionex/dsh-vision-toolkit": {
				reviewed: true,
				contract: {
					en: "^0.1.0-rc.6 (no exact-profile compatibility claim for rc7/Portable)",
					zh: "^0.1.0-rc.6（rc7/Portable 未做 exact-profile 兼容声明）"
				},
				platform: {
					en: "CI: Ubuntu, Node 22/24 + Python 3.11. Windows and macOS unverified",
					zh: "CI: Ubuntu, Node 22/24 + Python 3.11；Windows 与 macOS 未验证"
				},
				runtime: {
					en: "Python runtime; pinned upstream snapshot; pip/uv versions locked but wheels and sdists are not fully hashed",
					zh: "Python runtime；固定上游 snapshot；pip/uv 版本锁定但 wheel/sdist 未全哈希"
				},
				egress: {
					en: "Remote tools send the selected image bytes and the prompt; the local crop/trace/diff/palette/foreground paths send nothing",
					zh: "远程工具会发送所选图片字节与 prompt；crop/trace/diff/palette/foreground 等本地路径不外发"
				},
				activation: {
					en: "Registers agent-scoped tools only after a successful bootstrap; Settings stays available for repair when the runtime fails",
					zh: "bootstrap 成功后才注册 Agent-scoped 工具；runtime 失败时保留 Settings 供修复"
				},
				issues: {
					en: "May contend with Vision Bridge for the paste owner; the shared service retention policy is unknown; the Python supply chain needs a separate audit",
					zh: "与 Vision Bridge 可能争用 paste owner；共享服务的保留政策未知；Python 供应链需独立审计"
				},
				verified: {
					en: "Report checked 2026-08-17 · v0.1.28 · 28e9a98",
					zh: "报告核查 2026-08-17 · v0.1.28 · 28e9a98"
				}
			},
			"zseven-w/dsh-openpencil": {
				reviewed: true,
				contract: {
					en: "Several ^0.1.0-rc.6 packages (no exact-profile compatibility claim for rc7/Portable)",
					zh: "多个 ^0.1.0-rc.6 包（rc7/Portable 未做 exact-profile 兼容声明）"
				},
				platform: {
					en: "CI: Ubuntu, Node 24 + Rust 1.94. Windows and macOS unverified",
					zh: "CI: Ubuntu, Node 24 + Rust 1.94；Windows 与 macOS 未验证"
				},
				runtime: {
					en: "OpenPencil binary/daemon; preview may fall back to Jian; Web SDK / CanvasKit",
					zh: "OpenPencil binary/daemon；预览可尝试 Jian fallback；Web SDK / CanvasKit"
				},
				egress: {
					en: "Calls no remote vision service by default; the viewer/editor use a same-origin signed grant; model output still sees file and binary paths",
					zh: "不默认调用远程视觉服务；viewer/editor 使用同源 signed grant；模型结果仍可见文件与 binary 路径"
				},
				activation: {
					en: "The runtime continues without the binary; rendering can degrade to Jian; a diagnostic is offered when the managed editor is unavailable",
					zh: "缺 binary 时 Runtime 应继续；render 可降级 Jian；managed editor 不可用时提供修复诊断"
				},
				issues: {
					en: "Windows 11 managed editor 401 (#2); binary provenance, hashing, upgrade rollback and render containment are not fully governed yet",
					zh: "Windows 11 managed editor 401 (#2)；binary 来源/哈希/升级回滚与 render containment 尚未完整治理"
				},
				verified: {
					en: "Report checked 2026-08-17 · v0.1.0-rc.1 · ff9074d",
					zh: "报告核查 2026-08-17 · v0.1.0-rc.1 · ff9074d"
				}
			}
		};
		/**
		* Look up Portable's review of one repository.
		* @param fullName - the repository's `owner/repo`.
		* @returns the review, or undefined when Portable has never reviewed it.
		*/
		function auditFor(fullName) {
			return REVIEWED[fullName.toLowerCase()];
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\plugins\PluginsHome.module.css.mjs
		const css$3 = ".JzaE-a_surface{grid-template-columns:220px 1fr;width:100%;min-width:0;display:grid;overflow:hidden}.JzaE-a_rail{padding:var(--zx-space-3);padding-top:calc(var(--zx-space-4) + var(--dsh-desktop-titlebar-height,0px));border-right:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);flex-direction:column;gap:2px;display:flex;overflow:hidden auto}.JzaE-a_back{align-items:center;gap:var(--zx-space-3);height:var(--zx-control-sm);margin-bottom:var(--zx-space-3);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-muted);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.JzaE-a_back:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.JzaE-a_railItem{align-items:center;gap:var(--zx-space-3);height:var(--zx-control-md);padding:0 var(--zx-space-3);border-radius:var(--zx-radius-md);color:var(--zx-label-secondary);font:inherit;font-size:var(--zx-text-sm);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.JzaE-a_railItem:hover{background:var(--zx-bg-hover);color:var(--zx-label)}.JzaE-a_railItemActive{background:var(--zx-bg-active);color:var(--zx-label)}.JzaE-a_railItem:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.JzaE-a_railCount{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;flex:none}.JzaE-a_railGroup{padding:var(--zx-space-4) var(--zx-space-3) var(--zx-space-1);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro)}.JzaE-a_body{min-width:0;padding:var(--zx-space-7);padding-top:calc(var(--zx-space-6) + var(--dsh-desktop-titlebar-height,0px));overflow:hidden auto}.JzaE-a_inner{gap:var(--zx-space-5);flex-direction:column;width:min(900px,100%);margin:0 auto;display:flex}.JzaE-a_title{color:var(--zx-label);font-size:var(--zx-text-2xl);font-weight:var(--zx-weight-medium)}.JzaE-a_subtitle{max-width:620px;margin-top:var(--zx-space-2);color:var(--zx-label-muted);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body)}.JzaE-a_toolbar{align-items:center;gap:var(--zx-space-3);flex-wrap:wrap;display:flex}.JzaE-a_searchField{align-items:center;gap:var(--zx-space-2);min-width:0;height:var(--zx-control-md);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:var(--zx-bg-card);color:var(--zx-label-muted);flex:240px;display:flex}.JzaE-a_searchField:focus-within{border-color:var(--zx-accent);color:var(--zx-label-secondary)}.JzaE-a_searchInput{min-width:0;color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);background:0 0;border:0;flex:1}.JzaE-a_searchInput:focus{outline:none}.JzaE-a_searchInput::placeholder{color:var(--zx-label-tertiary)}.JzaE-a_meta{color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;flex:none}.JzaE-a_note{color:var(--zx-label-muted);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body)}.JzaE-a_note a,a.JzaE-a_meta{color:var(--zx-label-secondary)}.JzaE-a_note a:hover,a.JzaE-a_meta:hover{color:var(--zx-accent)}.JzaE-a_error{padding:var(--zx-space-3) var(--zx-space-4);border:1px solid color-mix(in srgb, var(--zx-error) 35%, var(--zx-border-soft));border-radius:var(--zx-radius-md);background:color-mix(in srgb, var(--zx-error) 8%, var(--zx-bg-card));color:var(--zx-label-secondary);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.JzaE-a_loadingState{justify-content:center;align-items:center;gap:var(--zx-space-2);min-height:var(--zx-control-xl);color:var(--zx-label-muted);font-size:var(--zx-text-xs);display:flex}.JzaE-a_banner{align-items:center;gap:var(--zx-space-3);padding:var(--zx-space-3) var(--zx-space-4);border:1px solid color-mix(in srgb, var(--zx-accent) 38%, var(--zx-border-soft));border-radius:var(--zx-radius-md);background:var(--zx-accent-soft);color:var(--zx-label);font-size:var(--zx-text-xs);flex-wrap:wrap;display:flex}.JzaE-a_bannerText{min-width:0;line-height:var(--zx-leading-body);flex:1}.JzaE-a_list{gap:var(--zx-space-3);flex-direction:column;display:flex}.JzaE-a_card{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-lg);background:var(--zx-bg-card);box-shadow:var(--zx-shadow-card);flex-direction:column;display:flex}.JzaE-a_cardHead{align-items:flex-start;min-width:0;display:flex}.JzaE-a_cardBody{gap:var(--zx-space-3);padding:var(--zx-space-4) var(--zx-space-5) var(--zx-space-4);flex-direction:column;display:flex}.JzaE-a_identity{align-items:center;gap:var(--zx-space-2);flex-wrap:wrap;flex:1;min-width:0;display:flex}.JzaE-a_name{color:inherit;overflow-wrap:anywhere;text-decoration:none}a.JzaE-a_name:hover{color:var(--zx-accent);text-decoration:underline}.JzaE-a_linkButton{border-radius:var(--zx-radius-sm);color:var(--zx-label-tertiary);font:inherit;font-size:var(--zx-text-micro);white-space:nowrap;cursor:pointer;background:0 0;border:0;flex:none;padding:0}.JzaE-a_linkButton:hover:not(:disabled){color:var(--zx-accent);text-decoration:underline}.JzaE-a_linkButton:disabled{cursor:default}.JzaE-a_linkButton:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.JzaE-a_actions{align-items:center;gap:var(--zx-space-2);flex-wrap:wrap;flex:none;justify-content:flex-end;display:flex}.JzaE-a_description{min-width:0;color:var(--zx-label-muted);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body);-webkit-line-clamp:3;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}.JzaE-a_facts{align-items:center;gap:var(--zx-space-2);flex-wrap:wrap;display:flex}.JzaE-a_factsAction{margin-left:auto}.JzaE-a_tagAccent{background:var(--zx-accent-soft);color:var(--zx-on-accent-soft)}.JzaE-a_tagSuccess{background:color-mix(in srgb, var(--zx-success) 16%, transparent);color:var(--zx-success)}.JzaE-a_tagWarn{background:color-mix(in srgb, var(--zx-warn) 18%, transparent);color:var(--zx-warn)}.JzaE-a_tagMuted{box-shadow:inset 0 0 0 1px var(--zx-border-control);color:var(--zx-label-muted);background:0 0}.JzaE-a_statusLine{color:var(--zx-label-muted);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body)}.JzaE-a_statusOk{color:var(--zx-success)}.JzaE-a_statusError{color:var(--zx-error)}.JzaE-a_review{border:1px solid var(--zx-border-soft);border-radius:var(--zx-radius-md);background:var(--zx-bg-panel)}.JzaE-a_reviewSummary{align-items:center;gap:var(--zx-space-2);min-height:var(--zx-control-xs);width:100%;padding:0 var(--zx-space-3);font:inherit;text-align:left;color:var(--zx-label-secondary);font-size:var(--zx-text-xs);cursor:pointer;background:0 0;border:0;list-style:none;display:flex}.JzaE-a_reviewSummary:hover{color:var(--zx-label)}.JzaE-a_reviewOpen .JzaE-a_reviewSummary{border-bottom:1px solid var(--zx-border-soft)}.JzaE-a_reviewChevron{color:var(--zx-label-decor);transition:transform var(--zx-motion-fast);flex:none;display:inline-flex}.JzaE-a_reviewOpen .JzaE-a_reviewChevron{transform:rotate(90deg)}.JzaE-a_reviewBody{gap:var(--zx-space-3);padding:var(--zx-space-4);flex-direction:column;display:flex}.JzaE-a_reviewGrid{gap:var(--zx-space-2) var(--zx-space-4);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body);grid-template-columns:minmax(110px,.32fr) minmax(0,1fr);display:grid}.JzaE-a_reviewKey{color:var(--zx-label-tertiary)}.JzaE-a_reviewValue{color:var(--zx-label-secondary);overflow-wrap:anywhere}.JzaE-a_reviewWarning{color:var(--zx-warn);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body)}.JzaE-a_reviewActions{align-items:center;gap:var(--zx-space-3);flex-wrap:wrap;display:flex}.JzaE-a_progress{gap:var(--zx-space-2);flex-direction:column;display:flex}.JzaE-a_progressHead{align-items:center;gap:var(--zx-space-3);font-size:var(--zx-text-xs);flex-wrap:wrap;display:flex}.JzaE-a_progressPhase{color:var(--zx-label);font-weight:var(--zx-weight-medium)}.JzaE-a_progressPercent{color:var(--zx-label-secondary);font-variant-numeric:tabular-nums}.JzaE-a_progressStats{min-width:0;color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);font-variant-numeric:tabular-nums;flex:1}.JzaE-a_progressTrack{border-radius:var(--zx-radius-pill);background:var(--zx-bg-active);height:4px;position:relative;overflow:hidden}.JzaE-a_progressFill{border-radius:var(--zx-radius-pill);background:var(--zx-accent);height:100%;transition:width var(--zx-motion)}.JzaE-a_progressIndeterminate{width:36%;animation:1.2s ease-in-out infinite JzaE-a_zx-market-slide}@keyframes JzaE-a_zx-market-slide{0%{margin-left:-36%}to{margin-left:100%}}@media (prefers-reduced-motion:reduce){.JzaE-a_progressIndeterminate{opacity:.5;width:100%;margin-left:0;animation:none}}.JzaE-a_progressStep{color:var(--zx-label-muted);font-size:var(--zx-text-micro);overflow-wrap:anywhere}.JzaE-a_log{max-height:96px;padding:var(--zx-space-3);border-radius:var(--zx-radius-sm);background:var(--zx-bg-panel);color:var(--zx-label-tertiary);font-family:var(--zx-font-mono);font-size:var(--zx-text-micro);line-height:var(--zx-leading-tight);white-space:pre-wrap;overflow-wrap:anywhere;margin:0;overflow:hidden auto}.JzaE-a_lifecycle{gap:var(--zx-space-2);grid-template-columns:repeat(auto-fit,minmax(120px,1fr));display:grid}.JzaE-a_step{padding:var(--zx-space-2) var(--zx-space-3);border:1px solid var(--zx-border-soft);border-left:2px solid var(--zx-border);border-radius:var(--zx-radius-sm);font-size:var(--zx-text-micro);line-height:var(--zx-leading-tight);flex-direction:column;gap:2px;display:flex}.JzaE-a_stepName{color:var(--zx-label-secondary);font-weight:var(--zx-weight-medium)}.JzaE-a_stepBody{color:var(--zx-label-tertiary)}.JzaE-a_stepDone{border-left-color:var(--zx-success)}.JzaE-a_stepPending{border-left-color:var(--zx-warn)}.JzaE-a_stepOff{opacity:.62}.JzaE-a_translationOriginal{padding-bottom:var(--zx-space-3);margin-bottom:var(--zx-space-3);border-bottom:1px dashed var(--zx-border);color:var(--zx-label-tertiary);font-size:var(--zx-text-xs);line-height:var(--zx-leading-body)}.JzaE-a_translationText{color:var(--zx-label);font-size:var(--zx-text-sm);line-height:var(--zx-leading-body);overflow-wrap:anywhere}.JzaE-a_dangerConfirm{color:var(--zx-error)}.JzaE-a_footer{padding-top:var(--zx-space-2);color:var(--zx-label-tertiary);font-size:var(--zx-text-micro);line-height:var(--zx-leading-body)}[data-dcode-layout=compact] .JzaE-a_surface{grid-template-columns:1fr}[data-dcode-layout=compact] .JzaE-a_rail{border-right:0;border-bottom:1px solid var(--zx-border-soft);flex-flow:wrap;overflow:hidden}[data-dcode-layout=compact] .JzaE-a_back{margin-bottom:0}[data-dcode-layout=compact] .JzaE-a_railGroup{display:none}[data-dcode-layout=compact] .JzaE-a_body{padding:var(--zx-space-5)}";
		const tagId$3 = "@dsh-portable/dcode-ui/PluginsHome.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var PluginsHome_module_css_default = {
			"actions": "JzaE-a_actions",
			"back": "JzaE-a_back",
			"banner": "JzaE-a_banner",
			"bannerText": "JzaE-a_bannerText",
			"body": "JzaE-a_body",
			"card": "JzaE-a_card",
			"cardBody": "JzaE-a_cardBody",
			"cardHead": "JzaE-a_cardHead",
			"dangerConfirm": "JzaE-a_dangerConfirm",
			"description": "JzaE-a_description",
			"error": "JzaE-a_error",
			"facts": "JzaE-a_facts",
			"factsAction": "JzaE-a_factsAction",
			"footer": "JzaE-a_footer",
			"identity": "JzaE-a_identity",
			"inner": "JzaE-a_inner",
			"lifecycle": "JzaE-a_lifecycle",
			"linkButton": "JzaE-a_linkButton",
			"list": "JzaE-a_list",
			"loadingState": "JzaE-a_loadingState",
			"log": "JzaE-a_log",
			"meta": "JzaE-a_meta",
			"name": "JzaE-a_name",
			"note": "JzaE-a_note",
			"progress": "JzaE-a_progress",
			"progressFill": "JzaE-a_progressFill",
			"progressHead": "JzaE-a_progressHead",
			"progressIndeterminate": "JzaE-a_progressIndeterminate",
			"progressPercent": "JzaE-a_progressPercent",
			"progressPhase": "JzaE-a_progressPhase",
			"progressStats": "JzaE-a_progressStats",
			"progressStep": "JzaE-a_progressStep",
			"progressTrack": "JzaE-a_progressTrack",
			"rail": "JzaE-a_rail",
			"railCount": "JzaE-a_railCount",
			"railGroup": "JzaE-a_railGroup",
			"railItem": "JzaE-a_railItem",
			"railItemActive": "JzaE-a_railItemActive",
			"review": "JzaE-a_review",
			"reviewActions": "JzaE-a_reviewActions",
			"reviewBody": "JzaE-a_reviewBody",
			"reviewChevron": "JzaE-a_reviewChevron",
			"reviewGrid": "JzaE-a_reviewGrid",
			"reviewKey": "JzaE-a_reviewKey",
			"reviewOpen": "JzaE-a_reviewOpen",
			"reviewSummary": "JzaE-a_reviewSummary",
			"reviewValue": "JzaE-a_reviewValue",
			"reviewWarning": "JzaE-a_reviewWarning",
			"searchField": "JzaE-a_searchField",
			"searchInput": "JzaE-a_searchInput",
			"statusError": "JzaE-a_statusError",
			"statusLine": "JzaE-a_statusLine",
			"statusOk": "JzaE-a_statusOk",
			"step": "JzaE-a_step",
			"stepBody": "JzaE-a_stepBody",
			"stepDone": "JzaE-a_stepDone",
			"stepName": "JzaE-a_stepName",
			"stepOff": "JzaE-a_stepOff",
			"stepPending": "JzaE-a_stepPending",
			"subtitle": "JzaE-a_subtitle",
			"surface": "JzaE-a_surface",
			"tagAccent": "JzaE-a_tagAccent",
			"tagMuted": "JzaE-a_tagMuted",
			"tagSuccess": "JzaE-a_tagSuccess",
			"tagWarn": "JzaE-a_tagWarn",
			"title": "JzaE-a_title",
			"toolbar": "JzaE-a_toolbar",
			"translationOriginal": "JzaE-a_translationOriginal",
			"translationText": "JzaE-a_translationText",
			"zx-market-slide": "JzaE-a_zx-market-slide"
		};
		//#endregion
		//#region src/client/plugins/JobProgress.tsx
		/** Copy key per job phase, so an unknown phase still renders as language. */
		const PHASE_KEY = {
			pending: "plugins.phase.pending",
			resolving: "plugins.phase.resolving",
			downloading: "plugins.phase.downloading",
			installing: "plugins.phase.installing",
			done: "plugins.phase.done",
			error: "plugins.phase.error",
			canceled: "plugins.phase.canceled"
		};
		/**
		* The one-line statistics strip.
		*
		* The Host's total is an estimate summed from direct dependency sizes, so it
		* is only shown while it still exceeds what has already arrived — past that
		* point it would claim a download is larger than it is.
		* @param job - the live job.
		* @param t - the bound translate.
		* @returns the strip's segments, in reading order.
		*/
		function statistics(job, t) {
			const parts = [];
			if (job.bytesDown > 0) parts.push(t("plugins.progress.downloaded", { done: formatBytes(job.bytesDown) }));
			if (job.bytesTotal > 0 && job.bytesTotal >= job.bytesDown) parts.push(t("plugins.progress.total", { total: formatBytes(job.bytesTotal) }));
			const speed = formatSpeed(job.speedBps);
			if (speed !== "") parts.push(speed);
			if (job.etaSec !== void 0 && job.phase === "downloading") parts.push(t("plugins.progress.eta", { seconds: job.etaSec }));
			if (job.packages.resolved > 0) parts.push(t("plugins.progress.packages", {
				resolved: job.packages.resolved,
				reused: job.packages.reused,
				downloaded: job.packages.downloaded
			}));
			return parts;
		}
		/**
		* Live progress of one running operation.
		* @param props - the operation and its cancel verb.
		* @returns the panel, or null once the operation has settled.
		*/
		function JobProgress({ operation, onCancel }) {
			const t = useT();
			if (operation.status !== "running") return null;
			const job = operation.job;
			const percent = job?.percent;
			const indeterminate = percent === void 0;
			const parts = job === void 0 ? [] : statistics(job, t);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PluginsHome_module_css_default.progress,
				role: "region",
				"aria-live": "off",
				"aria-label": t("plugins.progress.label"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginsHome_module_css_default.progressHead,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PluginsHome_module_css_default.progressPhase,
								role: "status",
								"aria-live": "polite",
								children: t(job === void 0 ? "plugins.phase.pending" : PHASE_KEY[job.phase])
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PluginsHome_module_css_default.progressPercent,
								children: indeterminate ? "…" : `${String(percent)}%`
							}),
							parts.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PluginsHome_module_css_default.progressStats,
								children: parts.join(" · ")
							}),
							operation.jobId === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: onCancel,
								children: t("plugins.cancelJob")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginsHome_module_css_default.progressTrack,
						role: "progressbar",
						"aria-label": t("plugins.progress.label"),
						"aria-valuemin": 0,
						"aria-valuemax": 100,
						"aria-valuetext": indeterminate ? t("plugins.progress.indeterminate") : `${String(percent)}%`,
						...indeterminate ? {} : { "aria-valuenow": percent },
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: `${PluginsHome_module_css_default.progressFill} ${indeterminate ? PluginsHome_module_css_default.progressIndeterminate : ""}`,
							...indeterminate ? {} : { style: { width: `${String(percent)}%` } }
						})
					}),
					job === void 0 || job.step === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginsHome_module_css_default.progressStep,
						children: job.step
					}),
					job === void 0 || job.log.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: PluginsHome_module_css_default.log,
						tabIndex: 0,
						role: "region",
						"aria-label": t("details.output"),
						children: job.log.slice(-3).join("\n")
					})
				]
			});
		}
		/**
		* The tail of a failed operation's installer output.
		* @param props - the settled operation.
		* @returns the output block, or null when the Host sent none.
		*/
		function JobOutput({ operation }) {
			const t = useT();
			if (operation.status !== "failed" || operation.output === "") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: PluginsHome_module_css_default.log,
				tabIndex: 0,
				role: "region",
				"aria-label": t("details.output"),
				children: operation.output.slice(-800)
			});
		}
		//#endregion
		//#region src/client/plugins/useJob.ts
		/**
		* Install, update, enable and uninstall as one tracked operation per plugin.
		*
		* Every mutating marketplace route answers the same two ways: an async Host
		* hands back a job id to poll, an older synchronous one answers the outcome
		* directly. Callers should not care which, so both shapes settle into the
		* same {@link Operation} here, keyed by whatever the caller identifies the row
		* by — a repository name in the catalogue, a package name in the inventory.
		*
		* Polling lives with the operation rather than with the card so a row that
		* scrolls out of view, or a section the operator switches away from, keeps its
		* install running; the intervals are owned by this hook and cleared when the
		* surface unmounts.
		* @module @dsh-portable/dcode-ui/client/plugins/useJob
		*/
		/** How often a running job is polled, matching the Host's own tick budget. */
		const POLL_INTERVAL_MS = 500;
		/**
		* Consecutive failed polls before the operation is reported as lost.
		*
		* A single failure is ordinary network noise and the next tick recovers from
		* it, but a poll that never succeeds again must not leave a row spinning
		* forever — so ten seconds of silence ends it with a reason instead.
		*/
		const POLL_FAILURE_LIMIT = 20;
		/**
		* Track marketplace operations for one surface.
		* @param client - the marketplace client.
		* @returns the operation table and its verbs.
		*/
		function useOperations(client) {
			const [operations, setOperations] = (0, react.useState)({});
			const timers = (0, react.useRef)(/* @__PURE__ */ new Map());
			const live = (0, react.useRef)(true);
			(0, react.useEffect)(() => {
				const pending = timers.current;
				live.current = true;
				return () => {
					live.current = false;
					for (const timer of pending.values()) clearInterval(timer);
					pending.clear();
				};
			}, []);
			const put = (0, react.useCallback)((key, operation) => {
				if (!live.current) return;
				setOperations((previous) => ({
					...previous,
					[key]: operation
				}));
			}, []);
			const stopTimer = (0, react.useCallback)((key) => {
				const timer = timers.current.get(key);
				if (timer === void 0) return;
				clearInterval(timer);
				timers.current.delete(key);
			}, []);
			const poll = (0, react.useCallback)((key, jobId, onSuccess) => {
				stopTimer(key);
				let failures = 0;
				const timer = setInterval(() => {
					client.job(jobId).then((answer) => {
						if (!live.current) return;
						if (!answer.ok) {
							failures += 1;
							if (!answer.unavailable && failures < POLL_FAILURE_LIMIT) return;
							stopTimer(key);
							put(key, {
								status: "failed",
								job: void 0,
								jobId,
								error: answer.error,
								output: ""
							});
							return;
						}
						failures = 0;
						const job = answer.value;
						if (!job.done) {
							put(key, {
								status: "running",
								job,
								jobId,
								error: void 0,
								output: job.output
							});
							return;
						}
						stopTimer(key);
						put(key, {
							status: job.ok ? "done" : "failed",
							job,
							jobId,
							error: job.ok ? void 0 : job.error,
							output: job.output
						});
						if (job.ok) onSuccess?.();
					}).catch((cause) => {
						if (!live.current) return;
						failures += 1;
						if (failures >= POLL_FAILURE_LIMIT) {
							stopTimer(key);
							put(key, {
								status: "failed",
								job: void 0,
								jobId,
								error: cause instanceof Error ? cause.message : String(cause),
								output: ""
							});
						}
					});
				}, POLL_INTERVAL_MS);
				timers.current.set(key, timer);
			}, [
				client,
				put,
				stopTimer
			]);
			return {
				operations,
				start: (0, react.useCallback)((key, call, onSuccess) => {
					put(key, {
						status: "running",
						job: void 0,
						jobId: void 0,
						error: void 0,
						output: ""
					});
					call().then((answer) => {
						if (!live.current) return;
						if (!answer.ok) {
							put(key, {
								status: "failed",
								job: void 0,
								jobId: void 0,
								error: answer.error,
								output: ""
							});
							return;
						}
						const jobId = answer.value;
						if (jobId === void 0) {
							put(key, {
								status: "done",
								job: void 0,
								jobId: void 0,
								error: void 0,
								output: ""
							});
							onSuccess?.();
							return;
						}
						put(key, {
							status: "running",
							job: void 0,
							jobId,
							error: void 0,
							output: ""
						});
						poll(key, jobId, onSuccess);
					}).catch((cause) => {
						if (!live.current) return;
						put(key, {
							status: "failed",
							job: void 0,
							jobId: void 0,
							error: cause instanceof Error ? cause.message : String(cause),
							output: ""
						});
					});
				}, [poll, put]),
				cancel: (0, react.useCallback)((key) => {
					const jobId = operations[key]?.jobId;
					if (jobId === void 0) return;
					client.cancel(jobId);
				}, [client, operations])
			};
		}
		//#endregion
		//#region src/client/plugins/MarketSection.tsx
		/**
		* The catalogue: browse, search and install.
		*
		* The list is the Host's own paginated GitHub sync, so this module owns no
		* copy of it — only the page cursor, the search box and one install operation
		* per repository.
		*
		* Installing is deliberately two steps. A plugin joins the agent's tool
		* surface, its prompts, its network reach and its local processes, and topic
		* membership is not a review, so the primary button opens Portable's review
		* of the repository and only the confirm button inside that panel starts an
		* install.
		* @module @dsh-portable/dcode-ui/client/plugins/MarketSection
		*/
		/** How long the search box waits before it asks the Host again. */
		const SEARCH_DEBOUNCE_MS = 300;
		/**
		* Build the review table for one repository.
		*
		* A repository Portable has never looked at gets the same seven rows, filled
		* with what is actually known — nothing — rather than being quietly omitted:
		* an absent review and a clean review must not look alike.
		* @param fullName - the repository's `owner/repo`.
		* @param locale - which locale's notes to read.
		* @param t - the bound translate, for the unreviewed fallback.
		* @returns the rows, and whether Portable has reviewed the repository.
		*/
		function reviewRows(fullName, locale, t) {
			const audit = auditFor(fullName);
			if (audit === void 0) return {
				reviewed: false,
				rows: [
					{
						label: "plugins.review.contract",
						value: t("plugins.review.unknownContract")
					},
					{
						label: "plugins.review.platform",
						value: t("plugins.review.unknownPlatform")
					},
					{
						label: "plugins.review.runtime",
						value: t("plugins.review.unknownRuntime")
					},
					{
						label: "plugins.review.egress",
						value: t("plugins.review.unknownEgress")
					},
					{
						label: "plugins.review.activation",
						value: t("plugins.review.unknownActivation")
					},
					{
						label: "plugins.review.issues",
						value: t("plugins.review.unknownIssues")
					},
					{
						label: "plugins.review.verified",
						value: t("plugins.review.unknownVerified")
					}
				]
			};
			return {
				reviewed: true,
				rows: [
					{
						label: "plugins.review.contract",
						value: audit.contract[locale]
					},
					{
						label: "plugins.review.platform",
						value: audit.platform[locale]
					},
					{
						label: "plugins.review.runtime",
						value: audit.runtime[locale]
					},
					{
						label: "plugins.review.egress",
						value: audit.egress[locale]
					},
					{
						label: "plugins.review.activation",
						value: audit.activation[locale]
					},
					{
						label: "plugins.review.issues",
						value: audit.issues[locale]
					},
					{
						label: "plugins.review.verified",
						value: audit.verified[locale]
					}
				]
			};
		}
		/** One repository, its review panel, and its install state. */
		function MarketCard(props) {
			const t = useT();
			const { item, operation } = props;
			const { reviewed, rows } = (0, react.useMemo)(() => reviewRows(item.fullName, props.locale, t), [
				item.fullName,
				props.locale,
				t
			]);
			const reviewId = (0, react.useId)();
			const running = operation?.status === "running";
			const failed = operation?.status === "failed";
			const installed = item.installed || operation?.status === "done";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: PluginsHome_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${PluginsHome_module_css_default.cardHead} ${ui_module_css_default.cardHeader}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginsHome_module_css_default.identity,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							className: PluginsHome_module_css_default.name,
							href: item.url,
							target: "_blank",
							rel: "noreferrer",
							children: item.fullName
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, {
							className: reviewed ? PluginsHome_module_css_default.tagSuccess : PluginsHome_module_css_default.tagWarn,
							children: t(reviewed ? "plugins.reviewed" : "plugins.unreviewed")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginsHome_module_css_default.actions,
						children: installed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, {
							className: PluginsHome_module_css_default.tagSuccess,
							children: t("plugins.installed")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							primary: !props.reviewOpen,
							disabled: running,
							onClick: props.onToggleReview,
							children: running ? t("plugins.installing") : t(failed ? "plugins.confirmRetry" : "plugins.install")
						})
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.cardBody,
					children: [
						item.description === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PluginsHome_module_css_default.description,
							children: item.description
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PluginsHome_module_css_default.facts,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: t("plugins.stars", { count: item.stars }) }),
								item.language === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: item.language }),
								installed && item.needsRestart ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, {
									className: PluginsHome_module_css_default.tagWarn,
									children: t("plugins.pendingTag")
								}) : null,
								item.description === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: `${PluginsHome_module_css_default.linkButton} ${PluginsHome_module_css_default.factsAction}`,
									disabled: props.translating,
									onClick: props.onTranslate,
									children: t(props.translating ? "plugins.translating" : "plugins.translate")
								})
							]
						}),
						installed ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${PluginsHome_module_css_default.review} ${props.reviewOpen ? PluginsHome_module_css_default.reviewOpen : ""}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: PluginsHome_module_css_default.reviewSummary,
								"aria-expanded": props.reviewOpen,
								"aria-controls": reviewId,
								onClick: props.onToggleReview,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: PluginsHome_module_css_default.reviewChevron,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
								}), t("plugins.reviewOpen")]
							}), props.reviewOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								id: reviewId,
								className: PluginsHome_module_css_default.reviewBody,
								role: "region",
								"aria-label": t("plugins.reviewOpen"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: PluginsHome_module_css_default.reviewGrid,
										children: rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PluginsHome_module_css_default.reviewKey,
											children: t(row.label)
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PluginsHome_module_css_default.reviewValue,
											children: row.value
										})] }, row.label))
									}),
									reviewed ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										className: PluginsHome_module_css_default.reviewWarning,
										children: t("plugins.review.warning")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: PluginsHome_module_css_default.reviewActions,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
											primary: true,
											disabled: running,
											onClick: props.onInstall,
											children: running ? t("plugins.installing") : t(failed ? "plugins.confirmRetry" : "plugins.confirmInstall")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: PluginsHome_module_css_default.statusLine,
											children: t("plugins.review.note")
										})]
									})
								]
							}) : null]
						}),
						operation === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobProgress, {
								operation,
								onCancel: props.onCancel
							}),
							operation.status === "done" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `${PluginsHome_module_css_default.statusLine} ${PluginsHome_module_css_default.statusOk}`,
								children: t("plugins.installedRestart")
							}) : null,
							failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: `${PluginsHome_module_css_default.statusLine} ${PluginsHome_module_css_default.statusError}`,
									children: t("plugins.installFailed", { error: operation.error ?? "" })
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: PluginsHome_module_css_default.statusLine,
									children: t("plugins.installFailedHint")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobOutput, { operation })
							] }) : null
						] })
					]
				})]
			});
		}
		/** Browse, search and install from the marketplace catalogue. */
		function MarketSection({ client, locale, onInstalled }) {
			const t = useT();
			const [draft, setDraft] = (0, react.useState)("");
			const [query, setQuery] = (0, react.useState)("");
			const [page, setPage] = (0, react.useState)();
			const [loading, setLoading] = (0, react.useState)(true);
			const [failure, setFailure] = (0, react.useState)();
			const [reviewOpen, setReviewOpen] = (0, react.useState)();
			const [translation, setTranslation] = (0, react.useState)();
			const [nonce, setNonce] = (0, react.useState)(0);
			const moreLoading = (0, react.useRef)(false);
			const moreController = (0, react.useRef)(null);
			const { operations, start, cancel } = useOperations(client);
			(0, react.useEffect)(() => {
				const timer = setTimeout(() => {
					setQuery(draft.trim());
				}, SEARCH_DEBOUNCE_MS);
				return () => {
					clearTimeout(timer);
				};
			}, [draft]);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				moreController.current?.abort();
				moreController.current = null;
				moreLoading.current = false;
				setPage(void 0);
				setLoading(true);
				setFailure(void 0);
				client.list(query, 1, controller.signal).then((answer) => {
					if (controller.signal.aborted) return;
					if (answer.ok) setPage(answer.value);
					else setFailure(answer.error);
				}).catch((cause) => {
					if (!controller.signal.aborted) setFailure(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					if (!controller.signal.aborted) setLoading(false);
				});
				return () => {
					controller.abort();
					moreController.current?.abort();
					moreController.current = null;
					moreLoading.current = false;
				};
			}, [
				client,
				query,
				nonce
			]);
			const loadMore = (0, react.useCallback)(() => {
				const current = page;
				if (current === void 0 || loading || moreLoading.current) return;
				const controller = new AbortController();
				moreController.current = controller;
				moreLoading.current = true;
				setLoading(true);
				client.list(query, current.page + 1, controller.signal).then((answer) => {
					if (controller.signal.aborted) return;
					if (!answer.ok) {
						setFailure(answer.error);
						return;
					}
					setFailure(void 0);
					setPage((previous) => previous === void 0 ? answer.value : {
						...answer.value,
						items: [...previous.items, ...answer.value.items]
					});
				}).catch((cause) => {
					if (!controller.signal.aborted) setFailure(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					if (moreController.current !== controller) return;
					moreController.current = null;
					moreLoading.current = false;
					if (!controller.signal.aborted) setLoading(false);
				});
			}, [
				client,
				loading,
				page,
				query
			]);
			const translate = (0, react.useCallback)((item) => {
				setTranslation({
					name: item.fullName,
					original: item.description,
					text: void 0,
					error: void 0,
					loading: true
				});
				client.translate(item.description).then((answer) => {
					setTranslation((previous) => previous?.name !== item.fullName ? previous : {
						...previous,
						loading: false,
						...answer.ok ? { text: answer.value } : { error: answer.error }
					});
				}).catch((cause) => {
					setTranslation((previous) => previous?.name !== item.fullName ? previous : {
						...previous,
						loading: false,
						error: cause instanceof Error ? cause.message : String(cause)
					});
				});
			}, [client]);
			const items = page?.items ?? [];
			const syncedAt = page === void 0 || page.fetchedAt === 0 ? t("plugins.neverSynced") : t("plugins.syncedAt", { time: new Date(page.fetchedAt).toLocaleString() });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginsHome_module_css_default.title,
					children: t("plugins.section.market")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: PluginsHome_module_css_default.subtitle,
					children: t("plugins.source")
				})] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.toolbar,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: PluginsHome_module_css_default.searchField,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: PluginsHome_module_css_default.searchInput,
								type: "search",
								value: draft,
								placeholder: t("plugins.search"),
								"aria-label": t("plugins.search"),
								onChange: (event) => {
									setDraft(event.target.value);
								}
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: PluginsHome_module_css_default.meta,
							children: [
								t("plugins.shownOfTotal", {
									shown: items.length,
									total: page?.total ?? 0
								}),
								" · ",
								syncedAt
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
							label: t("plugins.refresh"),
							disabled: loading,
							onClick: () => {
								setNonce((value) => value + 1);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
							className: PluginsHome_module_css_default.meta,
							href: MARKET_TOPIC_URL,
							target: "_blank",
							rel: "noreferrer",
							children: [
								t("plugins.sourceLink"),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRightUpOutline14, {})
							]
						})
					]
				}),
				failure === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginsHome_module_css_default.error,
					role: "alert",
					children: t("plugins.syncFailed", { error: failure })
				}),
				page?.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginsHome_module_css_default.error,
					role: "alert",
					children: t("plugins.syncFailed", { error: page.error })
				}),
				items.length === 0 ? loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.loadingState,
					role: "status",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, { size: "sm" }), t("plugins.loading")]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: query === "" ? t("plugins.emptyMarket") : t("plugins.emptySearch", { query }) }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.list,
					children: [items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarketCard, {
						item,
						locale,
						operation: operations[item.fullName],
						reviewOpen: reviewOpen === item.fullName,
						translating: translation?.name === item.fullName && translation.loading,
						onToggleReview: () => {
							setReviewOpen((current) => current === item.fullName ? void 0 : item.fullName);
						},
						onInstall: () => {
							start(item.fullName, () => client.install(item.fullName), onInstalled);
						},
						onCancel: () => {
							cancel(item.fullName);
						},
						onTranslate: () => {
							translate(item);
						}
					}, item.fullName)), page?.hasMore === true ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: loadMore,
						disabled: loading,
						children: t(loading ? "plugins.loading" : "plugins.loadMore")
					}) : null]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: translation !== void 0,
					onClose: () => {
						setTranslation(void 0);
					},
					title: translation === void 0 ? t("plugins.translate") : t("plugins.translateTitle", { name: translation.name }),
					closeLabel: t("common.close"),
					footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						onClick: () => {
							setTranslation(void 0);
						},
						children: t("common.close")
					}),
					children: translation === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [translation.original === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginsHome_module_css_default.translationOriginal,
						children: `${t("plugins.translateOriginal")}: ${translation.original}`
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginsHome_module_css_default.translationText,
						children: translation.loading ? t("plugins.translating") : translation.error !== void 0 ? t("plugins.translateFailed", { error: translation.error }) : translation.text === void 0 || translation.text === "" ? t("plugins.translateEmpty") : translation.text
					})] })
				})
			] });
		}
		//#endregion
		//#region src/client/plugins/InstalledSection.tsx
		/**
		* The inventory: update, enable, disable and uninstall what is installed.
		*
		* The rows are the web profile's own manifest as the Host reads it, so this
		* module owns no second list of plugins and no second notion of "enabled".
		* What it does own is the honesty of the report: every one of these verbs
		* edits the profile rather than the running process, so each row carries the
		* lifecycle strip that says whether what is loaded still matches what the
		* profile now says, and the section carries the restart note that explains
		* why a plugin just switched on is still doing nothing.
		* @module @dsh-portable/dcode-ui/client/plugins/InstalledSection
		*/
		/** Name of each lifecycle stage. */
		const STEP_NAME = {
			installed: "plugins.lifecycle.installed",
			available: "plugins.lifecycle.available",
			activated: "plugins.lifecycle.activated",
			exposed: "plugins.lifecycle.exposed"
		};
		/** What each stage says, per state it can be in. */
		const STEP_BODY = {
			installed: { done: "plugins.lifecycle.installedBody" },
			available: {
				done: "plugins.lifecycle.availableDone",
				off: "plugins.lifecycle.availableOff"
			},
			activated: {
				done: "plugins.lifecycle.activatedDone",
				off: "plugins.lifecycle.activatedOff"
			},
			exposed: {
				done: "plugins.lifecycle.exposedDone",
				pending: "plugins.lifecycle.exposedPending",
				off: "plugins.lifecycle.exposedOff"
			}
		};
		/** Modifier class per lifecycle state. */
		const STEP_CLASS = {
			done: PluginsHome_module_css_default.stepDone,
			pending: PluginsHome_module_css_default.stepPending,
			off: PluginsHome_module_css_default.stepOff,
			unknown: PluginsHome_module_css_default.stepOff
		};
		/** The four-stage strip from package on disk to loaded capability. */
		function Lifecycle({ plugin }) {
			const t = useT();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: PluginsHome_module_css_default.lifecycle,
				"aria-label": t("plugins.lifecycle"),
				children: lifecycleSteps(plugin).map((step) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${PluginsHome_module_css_default.step} ${STEP_CLASS[step.state]}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: PluginsHome_module_css_default.stepName,
						children: t(STEP_NAME[step.id])
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: PluginsHome_module_css_default.stepBody,
						children: t(STEP_BODY[step.id][step.state] ?? "plugins.lifecycle.unknown")
					})]
				}, step.id))
			});
		}
		/** One installed plugin, its state, and the verbs that apply to it. */
		function InstalledCard(props) {
			const t = useT();
			const { plugin, operation } = props;
			const busy = operation?.status === "running";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: PluginsHome_module_css_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${PluginsHome_module_css_default.cardHead} ${ui_module_css_default.cardHeader}`,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginsHome_module_css_default.identity,
						children: [
							plugin.homepage === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PluginsHome_module_css_default.name,
								children: plugin.name
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								className: PluginsHome_module_css_default.name,
								href: plugin.homepage,
								target: "_blank",
								rel: "noreferrer",
								children: plugin.name
							}),
							props.self ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, {
								className: PluginsHome_module_css_default.tagAccent,
								children: t("plugins.selfTag")
							}) : null,
							plugin.updateAvailable && plugin.latestVersion !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, {
								className: PluginsHome_module_css_default.tagAccent,
								children: t("plugins.updateTag", { version: plugin.latestVersion })
							}) : null,
							plugin.enabled ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, {
								className: PluginsHome_module_css_default.tagMuted,
								children: t("plugins.disabledTag")
							}),
							pendingRestart(plugin) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, {
								className: PluginsHome_module_css_default.tagWarn,
								children: t("plugins.pendingTag")
							}) : null
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: PluginsHome_module_css_default.actions,
						children: [plugin.updateAvailable && plugin.latestVersion !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							primary: true,
							disabled: busy,
							onClick: props.onUpdate,
							children: busy ? t("plugins.updating") : t("plugins.update", { version: plugin.latestVersion })
						}) : null, props.self ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							disabled: busy,
							onClick: props.onToggle,
							children: busy ? t("plugins.working") : t(plugin.enabled ? "plugins.disable" : "plugins.enable")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							className: PluginsHome_module_css_default.dangerConfirm,
							disabled: busy,
							onClick: props.onUninstall,
							children: t("plugins.uninstall")
						})] })]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.cardBody,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: PluginsHome_module_css_default.facts,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: plugin.version === void 0 ? t("plugins.versionUnknown") : t("plugins.version", { version: plugin.version }) }), plugin.latestVersion === void 0 || plugin.latestVersion === plugin.version ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Pill, { children: t("plugins.latestVersion", { version: plugin.latestVersion }) })]
						}),
						plugin.description === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PluginsHome_module_css_default.description,
							children: plugin.description
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Lifecycle, { plugin }),
						props.self ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: PluginsHome_module_css_default.statusLine,
							children: t("plugins.selfNote")
						}) : null,
						operation === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobProgress, {
								operation,
								onCancel: props.onCancel
							}),
							operation.status === "done" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `${PluginsHome_module_css_default.statusLine} ${PluginsHome_module_css_default.statusOk}`,
								children: t("plugins.actionDone")
							}) : null,
							operation.status === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: `${PluginsHome_module_css_default.statusLine} ${PluginsHome_module_css_default.statusError}`,
								children: t("plugins.actionFailed", { error: operation.error ?? "" })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JobOutput, { operation })] }) : null
						] })
					]
				})]
			});
		}
		/** Manage the plugins this profile has installed. */
		function InstalledSection(props) {
			const t = useT();
			const { operations, start, cancel } = useOperations(props.client);
			const [uninstallTarget, setUninstallTarget] = (0, react.useState)();
			const plugins = props.snapshot?.plugins ?? [];
			const updatable = plugins.filter((plugin) => plugin.updateAvailable).length;
			const selfName = props.snapshot?.self?.name;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginsHome_module_css_default.title,
					children: t("plugins.installedTitle")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: PluginsHome_module_css_default.subtitle,
					children: t("plugins.installedBody")
				})] }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.toolbar,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: PluginsHome_module_css_default.meta,
						children: [t("plugins.installedCount", { count: plugins.length }), updatable === 0 ? "" : ` · ${t("plugins.updatableCount", { count: updatable })}`]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconButton, {
						label: t("plugins.refresh"),
						disabled: props.loading,
						onClick: props.onReload,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline14, {})
					})]
				}),
				props.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginsHome_module_css_default.error,
					role: "alert",
					children: t("plugins.readFailed", { error: props.error })
				}),
				props.snapshot?.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginsHome_module_css_default.error,
					role: "alert",
					children: t("plugins.readFailed", { error: props.snapshot.error })
				}),
				plugins.length === 0 ? props.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.loadingState,
					role: "status",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, { size: "sm" }), t("plugins.loading")]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(EmptyState, { children: [t("plugins.emptyInstalled"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					primary: true,
					onClick: props.onBrowse,
					children: t("plugins.browseMarket")
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: PluginsHome_module_css_default.list,
					children: [plugins.map((plugin) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InstalledCard, {
						plugin,
						self: plugin.name === selfName,
						operation: operations[plugin.name],
						onUpdate: () => {
							start(plugin.name, () => props.client.update(plugin.name), props.onReload);
						},
						onToggle: () => {
							start(plugin.name, () => props.client.setEnabled(plugin.name, !plugin.enabled), props.onReload);
						},
						onUninstall: () => {
							setUninstallTarget(plugin);
						},
						onCancel: () => {
							cancel(plugin.name);
						}
					}, plugin.name)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: PluginsHome_module_css_default.footer,
						children: t("plugins.restartNote")
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: uninstallTarget !== void 0,
					onClose: () => {
						setUninstallTarget(void 0);
					},
					title: uninstallTarget === void 0 ? t("plugins.uninstall") : t("plugins.uninstallTitle", { name: uninstallTarget.name }),
					closeLabel: t("common.close"),
					description: t("plugins.uninstallBody"),
					footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						autoFocus: true,
						onClick: () => {
							setUninstallTarget(void 0);
						},
						children: t("common.cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						className: PluginsHome_module_css_default.dangerConfirm,
						onClick: () => {
							const target = uninstallTarget;
							setUninstallTarget(void 0);
							if (target === void 0) return;
							start(target.name, () => props.client.uninstall(target.name), props.onReload);
						},
						children: t("plugins.uninstall")
					})] })
				})
			] });
		}
		//#endregion
		//#region src/client/plugins/PluginsHome.tsx
		/**
		* Plugins as a first-class surface.
		*
		* The sidebar's plugin entry lands here rather than in a settings tab,
		* because installing and managing plugins is a task with its own catalogue,
		* its own long-running jobs and its own safety gate — not a preference.
		*
		* Three sections, one subject: the marketplace catalogue, the profile's own
		* inventory, and the settings of the plugins that ship with the harness. The
		* first two are the marketplace Host plugin's `/api/market` routes; the third
		* is the settings registry the classic surface writes, rendered by the same
		* component the settings surface uses. Nothing here is a second copy of
		* either.
		*
		* The marketplace Host is optional. When it is not running, the two
		* marketplace sections explain that rather than failing, and the settings
		* section — which does not depend on it — keeps working.
		* @module @dsh-portable/dcode-ui/client/plugins/PluginsHome
		*/
		const INITIAL_INVENTORY = {
			snapshot: void 0,
			loading: true,
			error: void 0,
			unavailable: false
		};
		/**
		* Read the profile inventory, shared by every section that needs it.
		*
		* One read serves the inventory list, the marketplace's self-update banner
		* and the rail's counts, and every mutating verb reloads through the same
		* entry — so the surface never shows two disagreeing answers about what is
		* installed.
		* @param client - the marketplace client.
		* @returns the inventory, and the verb that re-reads it.
		*/
		function useInventory(client) {
			const [state, setState] = (0, react.useState)(INITIAL_INVENTORY);
			const [nonce, setNonce] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				setState((previous) => ({
					...previous,
					loading: true
				}));
				client.installed(controller.signal).then((answer) => {
					if (controller.signal.aborted) return;
					setState(answer.ok ? {
						snapshot: answer.value,
						loading: false,
						error: void 0,
						unavailable: false
					} : {
						snapshot: void 0,
						loading: false,
						error: answer.error,
						unavailable: answer.unavailable
					});
				}).catch((cause) => {
					if (controller.signal.aborted) return;
					setState((previous) => ({
						...previous,
						loading: false,
						error: cause instanceof Error ? cause.message : String(cause)
					}));
				});
				return () => {
					controller.abort();
				};
			}, [client, nonce]);
			const reload = (0, react.useCallback)(() => {
				setNonce((value) => value + 1);
			}, []);
			return {
				...state,
				reload
			};
		}
		/**
		* The marketplace's own update notice.
		*
		* It updates itself through the same job endpoint every other plugin uses, so
		* the banner is the ordinary operation UI narrowed to one row.
		* @param props - the inventory and its reload verb.
		* @returns the banner, or null while the marketplace is current.
		*/
		function SelfUpdateBanner(props) {
			const t = useT();
			const { operations, start } = useOperations(props.client);
			const self = props.inventory.snapshot?.self;
			if (self === void 0 || !self.updateAvailable) return null;
			const operation = operations[self.name];
			const running = operation?.status === "running";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PluginsHome_module_css_default.banner,
				role: "status",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: PluginsHome_module_css_default.bannerText,
						children: t("plugins.selfUpdate", {
							current: self.version ?? "?",
							latest: self.latestVersion ?? "?"
						})
					}),
					operation?.status === "done" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: PluginsHome_module_css_default.statusOk,
						children: t("plugins.selfUpdateDone")
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						primary: true,
						disabled: running,
						onClick: () => {
							start(self.name, () => props.client.update(self.name), props.onReload);
						},
						children: t(running ? "plugins.updating" : "plugins.selfUpdateAction")
					}),
					operation?.status === "failed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: PluginsHome_module_css_default.statusError,
						children: t("plugins.actionFailed", { error: operation.error ?? "" })
					}) : null
				]
			});
		}
		const RAIL$1 = [
			{
				id: "market",
				label: "plugins.section.market",
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, {})
			},
			{
				id: "installed",
				label: "plugins.section.installed",
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCordisPluginOutline14, { size: 16 }),
				group: "plugins.group.manage"
			},
			{
				id: "settings",
				label: "plugins.section.settings",
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {})
			}
		];
		/** The marketplace, the profile inventory, and the built-in plugin settings. */
		function PluginsHome({ navigation }) {
			const runtime = useRuntime();
			const t = useT();
			const [section, setSection] = (0, react.useState)("market");
			const client = (0, react.useMemo)(() => createMarketClient(), []);
			const inventory = useInventory(client);
			const auditLocale = (0, react.useSyncExternalStore)(runtime.locale.subscribe, runtime.locale.getSnapshot, runtime.locale.getSnapshot).active.toLowerCase().startsWith("zh") ? "zh" : "en";
			const installedCount = inventory.snapshot?.plugins.length;
			const marketplaceMissing = inventory.unavailable;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: PluginsHome_module_css_default.surface,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
					className: PluginsHome_module_css_default.rail,
					"aria-label": t("plugins.title"),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: PluginsHome_module_css_default.back,
						onClick: () => {
							navigation.show("session");
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {}), t("nav.backToWorkspace")]
					}), RAIL$1.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [entry.group === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginsHome_module_css_default.railGroup,
						children: t(entry.group)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${PluginsHome_module_css_default.railItem} ${section === entry.id ? PluginsHome_module_css_default.railItemActive : ""}`,
						"aria-current": section === entry.id ? "page" : void 0,
						onClick: () => {
							setSection(entry.id);
						},
						children: [
							entry.icon,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ui.grow,
								children: t(entry.label)
							}),
							entry.id === "installed" && installedCount !== void 0 && installedCount > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PluginsHome_module_css_default.railCount,
								children: installedCount
							}) : null
						]
					})] }, entry.id))]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: PluginsHome_module_css_default.body,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: PluginsHome_module_css_default.inner,
						children: section === "settings" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginSettingsSection, {}) : marketplaceMissing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: PluginsHome_module_css_default.title,
							children: t("plugins.title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: PluginsHome_module_css_default.subtitle,
							children: t("plugins.subtitle")
						})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(EmptyState, { children: [
							t("plugins.unavailable"),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: PluginsHome_module_css_default.note,
								children: t("plugins.unavailableBody")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									setSection("settings");
								},
								children: t("plugins.section.settings")
							})
						] })] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelfUpdateBanner, {
							client,
							inventory,
							onReload: inventory.reload
						}), section === "market" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarketSection, {
							client,
							locale: auditLocale,
							onInstalled: inventory.reload
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InstalledSection, {
							client,
							snapshot: inventory.snapshot,
							loading: inventory.loading,
							error: inventory.error,
							onReload: inventory.reload,
							onBrowse: () => {
								setSection("market");
							}
						})] })
					})
				})]
			});
		}
		//#endregion
		//#region src/client/settings/usage.ts
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
			for (const id of list.ids) {
				const row = list.byId[id];
				if (row === void 0) continue;
				sessions += 1;
				const projections = row.projectionValues;
				const stats = projections?.sessionStats;
				if (stats !== void 0) {
					hasStats = true;
					turns += stats.turns ?? 0;
					steps += stats.steps ?? 0;
				}
				const usage = projections?.tokenUsage;
				if (usage === void 0) continue;
				uncachedInputTokens += usage.uncachedInputTokens ?? 0;
				outputTokens += usage.outputTokens ?? 0;
				cacheReadTokens += usage.cacheReadTokens ?? 0;
				cacheWriteTokens += usage.cacheWriteTokens ?? 0;
				if ((usage.uncachedInputTokens ?? 0) + (usage.outputTokens ?? 0) + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0) > 0) usageSessions += 1;
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
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\dcode-ui\src\client\settings\SelectMenu.module.css.mjs
		const css$2 = ".XNjn3G_trigger{justify-content:space-between;align-items:center;gap:var(--zx-space-3);min-width:180px;height:var(--zx-control-md);padding:0 var(--zx-space-3);border:1px solid var(--zx-border-control);border-radius:var(--zx-radius-md);background:color-mix(in srgb, var(--zx-bg-card) 80%, transparent);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;box-shadow:inset 0 1px 0 color-mix(in srgb, var(--zx-label) 8%, transparent);display:inline-flex}.XNjn3G_trigger:hover:not(:disabled),.XNjn3G_trigger[aria-expanded=true]{border-color:color-mix(in srgb, var(--zx-accent) 48%, transparent);background:color-mix(in srgb, var(--zx-bg-overlay) 76%, transparent)}.XNjn3G_trigger:focus-visible{box-shadow:var(--zx-focus-ring), inset 0 1px 0 color-mix(in srgb, var(--zx-label) 8%, transparent);outline:none}.XNjn3G_trigger:disabled{cursor:default;opacity:var(--zx-opacity-disabled)}.XNjn3G_triggerValue{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.XNjn3G_chevron{color:var(--zx-label-muted);font-size:var(--zx-text-lg);transition:transform var(--zx-motion-fast);flex:none;line-height:12px;transform:translateY(-1px)}.XNjn3G_chevronOpen{transform:rotate(180deg)translateY(1px)}.XNjn3G_menu{z-index:var(--zx-z-menu);max-height:min(280px,100vh - 16px);padding:var(--zx-space-1);border:1px solid color-mix(in srgb, var(--zx-label) 20%, transparent);border-radius:var(--zx-radius-lg);background:color-mix(in srgb, var(--zx-bg-overlay) 82%, transparent);color:var(--zx-label);box-shadow:var(--zx-shadow-dialog), inset 0 1px 0 color-mix(in srgb, var(--zx-label) 12%, transparent);backdrop-filter:blur(20px)saturate(135%);animation:XNjn3G_menuIn var(--zx-motion-fast);flex-direction:column;display:flex;position:fixed;overflow:hidden auto}.XNjn3G_option{align-items:center;gap:var(--zx-space-3);width:100%;min-height:36px;padding:var(--zx-space-2) var(--zx-space-3);border-radius:var(--zx-radius-sm);color:var(--zx-label);font:inherit;font-size:var(--zx-text-xs);text-align:left;cursor:pointer;background:0 0;border:0;display:flex}.XNjn3G_option:hover,.XNjn3G_optionActive{background:var(--zx-bg-hover)}.XNjn3G_optionSelected{background:color-mix(in srgb, var(--zx-accent) 14%, transparent)}.XNjn3G_option:disabled{cursor:default;color:var(--zx-label-muted);opacity:var(--zx-opacity-disabled)}.XNjn3G_option:focus-visible{box-shadow:var(--zx-focus-ring);outline:none}.XNjn3G_optionText{text-overflow:ellipsis;white-space:nowrap;flex-direction:column;flex:1;gap:1px;min-width:0;display:flex;overflow:hidden}.XNjn3G_detail{color:var(--zx-label-muted);font-size:var(--zx-text-micro);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.XNjn3G_check{color:var(--zx-accent);font-size:var(--zx-text-md);font-weight:var(--zx-weight-semibold);flex:none}@keyframes XNjn3G_menuIn{0%{opacity:0;transform:translateY(-3px)scale(.985)}to{opacity:1;transform:translateY(0)scale(1)}}@media (prefers-reduced-motion:reduce){.XNjn3G_chevron,.XNjn3G_menu{transition:none;animation:none}}";
		const tagId$2 = "@dsh-portable/dcode-ui/SelectMenu.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var SelectMenu_module_css_default = {
			"check": "XNjn3G_check",
			"chevron": "XNjn3G_chevron",
			"chevronOpen": "XNjn3G_chevronOpen",
			"detail": "XNjn3G_detail",
			"menu": "XNjn3G_menu",
			"menuIn": "XNjn3G_menuIn",
			"option": "XNjn3G_option",
			"optionActive": "XNjn3G_optionActive",
			"optionSelected": "XNjn3G_optionSelected",
			"optionText": "XNjn3G_optionText",
			"trigger": "XNjn3G_trigger",
			"triggerValue": "XNjn3G_triggerValue"
		};
		//#endregion
		//#region src/client/settings/SelectMenu.tsx
		/** Glass-styled, portal-backed select menu used by the DCode settings fallback. */
		const VIEWPORT_GUTTER = 8;
		const MENU_GAP = 6;
		const MENU_MAX_HEIGHT = 280;
		function firstEnabled(options, from = 0, direction = 1) {
			for (let index = from; index >= 0 && index < options.length; index += direction) if (options[index]?.disabled !== true) return index;
			return -1;
		}
		/** A native-select replacement that stays inside DCode's visual language. */
		function SelectMenu({ value, options, onChange, ariaLabel, disabled = false }) {
			const triggerRef = (0, react.useRef)(null);
			const menuRef = (0, react.useRef)(null);
			const optionRefs = (0, react.useRef)({});
			const menuId = (0, react.useId)();
			const [open, setOpen] = (0, react.useState)(false);
			const [active, setActive] = (0, react.useState)(() => {
				const selected = options.findIndex((option) => option.id === value);
				return firstEnabled(options, selected >= 0 ? selected : 0);
			});
			const [position, setPosition] = (0, react.useState)();
			const updatePosition = (0, react.useCallback)(() => {
				const trigger = triggerRef.current;
				if (trigger === null) return;
				const rect = trigger.getBoundingClientRect();
				const roomBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
				const above = roomBelow < MENU_MAX_HEIGHT && rect.top > roomBelow;
				const estimatedHeight = Math.min(MENU_MAX_HEIGHT, Math.max(44, options.length * 40 + 8));
				const top = above ? Math.max(VIEWPORT_GUTTER, rect.top - estimatedHeight - MENU_GAP) : Math.min(window.innerHeight - VIEWPORT_GUTTER - estimatedHeight, rect.bottom + MENU_GAP);
				const minWidth = Math.max(rect.width, 180);
				const left = Math.min(Math.max(VIEWPORT_GUTTER, rect.left), Math.max(VIEWPORT_GUTTER, window.innerWidth - minWidth - VIEWPORT_GUTTER));
				setPosition({
					top,
					left,
					minWidth,
					side: above ? "above" : "below"
				});
			}, [options.length]);
			const close = (0, react.useCallback)((restoreFocus = true) => {
				setOpen(false);
				setPosition(void 0);
				if (restoreFocus) triggerRef.current?.focus();
			}, []);
			const openMenu = (0, react.useCallback)(() => {
				if (disabled || options.length === 0) return;
				const selected = options.findIndex((option) => option.id === value);
				setActive(firstEnabled(options, selected >= 0 ? selected : 0));
				setOpen(true);
			}, [
				disabled,
				options,
				value
			]);
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				updatePosition();
			}, [open, updatePosition]);
			(0, react.useEffect)(() => {
				if (!open) return void 0;
				const onPointerDown = (event) => {
					const target = event.target;
					if (target instanceof Node && !triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) close(false);
				};
				const onKeyDown = (event) => {
					if (event.key === "Escape" || event.key === "Tab" || event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End" || event.key === "Enter" || event.key === " ") event.stopPropagation();
					if (event.key === "Escape") {
						event.preventDefault();
						close();
						return;
					}
					if (event.key === "Tab") {
						close(false);
						return;
					}
					const move = (direction, start) => {
						const next = firstEnabled(options, start, direction);
						if (next >= 0) setActive(next);
					};
					if (event.key === "ArrowDown") {
						event.preventDefault();
						move(1, active + 1);
					} else if (event.key === "ArrowUp") {
						event.preventDefault();
						move(-1, active - 1);
					} else if (event.key === "Home") {
						event.preventDefault();
						move(1, 0);
					} else if (event.key === "End") {
						event.preventDefault();
						move(-1, options.length - 1);
					} else if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						const option = options[active];
						if (option?.disabled !== true && option !== void 0) {
							onChange(option.id);
							close();
						}
					}
				};
				const onViewportChange = () => {
					updatePosition();
				};
				document.addEventListener("pointerdown", onPointerDown);
				document.addEventListener("keydown", onKeyDown, true);
				window.addEventListener("resize", onViewportChange);
				window.addEventListener("scroll", onViewportChange, true);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown);
					document.removeEventListener("keydown", onKeyDown, true);
					window.removeEventListener("resize", onViewportChange);
					window.removeEventListener("scroll", onViewportChange, true);
				};
			}, [
				active,
				close,
				onChange,
				open,
				options,
				updatePosition
			]);
			(0, react.useEffect)(() => {
				if (!open) return;
				optionRefs.current[active]?.focus();
			}, [active, open]);
			const selected = options.find((option) => option.id === value);
			const onTriggerKeyDown = (event) => {
				if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					if (open) return;
					openMenu();
				} else if (event.key === "ArrowUp") {
					event.preventDefault();
					if (open) return;
					openMenu();
				} else if (event.key === "Escape" && open) {
					event.preventDefault();
					close();
				}
			};
			const list = open && position !== void 0 && typeof document !== "undefined" ? (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: menuRef,
				id: menuId,
				role: "listbox",
				"aria-label": ariaLabel,
				className: SelectMenu_module_css_default.menu,
				"data-side": position.side,
				style: {
					top: position.top,
					left: position.left,
					minWidth: position.minWidth
				},
				children: options.map((option, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: (node) => {
						optionRefs.current[index] = node;
					},
					type: "button",
					role: "option",
					"aria-selected": option.id === value,
					"aria-disabled": option.disabled === true || void 0,
					tabIndex: index === active ? 0 : -1,
					className: `${SelectMenu_module_css_default.option} ${option.id === value ? SelectMenu_module_css_default.optionSelected : ""} ${index === active ? SelectMenu_module_css_default.optionActive : ""}`,
					disabled: option.disabled,
					onMouseEnter: () => {
						if (option.disabled !== true) setActive(index);
					},
					onClick: () => {
						if (option.disabled === true) return;
						onChange(option.id);
						close();
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: SelectMenu_module_css_default.optionText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: option.label }), option.detail === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SelectMenu_module_css_default.detail,
							children: option.detail
						})]
					}), option.id === value ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SelectMenu_module_css_default.check,
						"aria-hidden": true,
						children: "✓"
					}) : null]
				}, option.id))
			}), document.body) : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				ref: triggerRef,
				type: "button",
				className: SelectMenu_module_css_default.trigger,
				"aria-label": ariaLabel,
				"aria-haspopup": "listbox",
				"aria-expanded": open,
				"aria-controls": open ? menuId : void 0,
				disabled: disabled || options.length === 0,
				onClick: () => {
					if (open) close(false);
					else openMenu();
				},
				onKeyDown: onTriggerKeyDown,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SelectMenu_module_css_default.triggerValue,
					children: selected?.label ?? value
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: `${SelectMenu_module_css_default.chevron} ${open ? SelectMenu_module_css_default.chevronOpen : ""}`,
					"aria-hidden": true,
					children: "⌄"
				})]
			}), list] });
		}
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
		const RAIL = [
			{
				group: "settings.group.basics",
				items: [{
					id: "general",
					label: "settings.general"
				}, {
					id: "models",
					label: "settings.models"
				}]
			},
			{
				group: "settings.group.agent",
				items: [
					{
						id: "agentPresets",
						label: "settings.agentPresets"
					},
					{
						id: "skills",
						label: "settings.skills"
					},
					{
						id: "commands",
						label: "settings.commands"
					}
				]
			},
			{
				group: "settings.group.data",
				items: [{
					id: "usage",
					label: "settings.usage"
				}]
			}
		];
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
			const themeKey = (0, react.useCallback)(() => {
				const current = theme?.getTheme();
				return current === void 0 ? "" : [
					current.preference ?? "",
					current.fontSize,
					current.active.id,
					...(current.themes ?? []).map((entry) => entry.id)
				].join(":");
			}, [theme]);
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
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
								value: locale.active,
								ariaLabel: t("settings.language"),
								options: localeOptions.map((option) => ({
									id: option.id,
									label: option.label
								})),
								disabled: localeOptions.length <= 1,
								onChange: (value) => {
									runtime.locale.set(value);
								}
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
								control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
									value: snapshot?.preference ?? snapshot?.active.id ?? "system",
									ariaLabel: t("settings.themeCustom"),
									options: [{
										id: "system",
										label: t("theme.system")
									}, ...(snapshot?.themes ?? []).map((entry) => ({
										id: entry.id,
										label: entry.id
									}))],
									onChange: (value) => {
										theme?.setTheme?.(value);
									}
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.fontSize"),
								control: theme?.setFontSize === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.badge,
									children: snapshot?.fontSize ?? "—"
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SettingsSurface_module_css_default.stepper,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SettingsSurface_module_css_default.stepperButton,
											"aria-label": `${t("settings.fontSize")} −`,
											disabled: (snapshot?.fontSize ?? 14) <= 11,
											onClick: () => {
												theme.setFontSize?.(Math.max(11, (snapshot?.fontSize ?? 14) - 1));
											},
											children: "−"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SettingsSurface_module_css_default.stepperValue,
											children: snapshot?.fontSize ?? 14
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SettingsSurface_module_css_default.stepperButton,
											"aria-label": `${t("settings.fontSize")} +`,
											disabled: (snapshot?.fontSize ?? 14) >= 22,
											onClick: () => {
												theme.setFontSize?.(Math.min(22, (snapshot?.fontSize ?? 14) + 1));
											},
											children: "+"
										})
									]
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
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
								value: busyEnter,
								ariaLabel: t("settings.busyEnter"),
								options: [{
									id: "queue",
									label: t("settings.busyEnter.queue")
								}, {
									id: "steer",
									label: t("settings.busyEnter.steer")
								}],
								disabled: !runtime.busyEnter.writable,
								onChange: (value) => {
									runtime.busyEnter.set(value);
								}
							})
						})
					})
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InterfaceSection, {})
			] });
		}
		function objectAt(source, path) {
			let current = source;
			for (const key of path) {
				if (typeof current !== "object" || current === null || Array.isArray(current)) return void 0;
				current = current[key];
			}
			return typeof current === "object" && current !== null && !Array.isArray(current) ? current : void 0;
		}
		function valueAt(source, path) {
			let current = source;
			for (const key of path) {
				if (typeof current !== "object" || current === null || Array.isArray(current)) return void 0;
				current = current[key];
			}
			return current;
		}
		function stringAt(source, path) {
			const value = valueAt(source, path);
			return typeof value === "string" && value.trim().length > 0 ? value : void 0;
		}
		function modelCredentialRef(provider, profile) {
			return stringAt(profile, ["apiKeyEnv"]) ?? `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
		}
		function modelProviderRows(registered, configurable, namespaces, credentials) {
			const active = new Set(registered.map((provider) => provider.id));
			const declared = new Set(configurable.map((provider) => provider.provider));
			const rows = configurable.map((provider) => {
				const namespace = namespaces.find((view) => view.ns === provider.settingsNs);
				const profile = objectAt(namespace?.value, provider.settingsPath);
				const userProfile = objectAt(namespace?.user, provider.settingsPath);
				const credentialRef = modelCredentialRef(provider.provider, profile);
				return {
					id: provider.provider,
					name: provider.displayName,
					active: active.has(provider.provider),
					settingsNs: provider.settingsNs,
					settingsPath: provider.settingsPath,
					namespace,
					profile,
					userProfile,
					credentialRef,
					credential: credentials[credentialRef],
					...provider.declared === void 0 ? {} : { declared: provider.declared }
				};
			});
			for (const provider of registered) {
				if (declared.has(provider.id)) continue;
				rows.push({
					id: provider.id,
					name: provider.name,
					active: true,
					settingsNs: "",
					settingsPath: [],
					namespace: void 0,
					profile: void 0,
					userProfile: void 0,
					credentialRef: modelCredentialRef(provider.id, void 0),
					credential: credentials[modelCredentialRef(provider.id, void 0)]
				});
			}
			return rows;
		}
		async function loadModelSettings(runtime) {
			const [catalog, registered, configurable, described] = await Promise.all([
				runtime.remote.session.modelCatalog(),
				runtime.remote.llm.listProviders(),
				runtime.remote.llm.listConfigurableProviders(),
				runtime.remote.settings.describe()
			]);
			if (!catalog.ok) throw new Error(catalog.error.message);
			if (!registered.ok) throw new Error(registered.error.message);
			if (!configurable.ok) throw new Error(configurable.error.message);
			if (!described.ok) throw new Error(described.error.message);
			const refs = [.../* @__PURE__ */ new Set([...configurable.value.map((provider) => {
				const namespace = described.value.namespaces.find((view) => view.ns === provider.settingsNs);
				return modelCredentialRef(provider.provider, objectAt(namespace?.value, provider.settingsPath));
			}), ...registered.value.filter((provider) => !configurable.value.some((candidate) => candidate.provider === provider.id)).map((provider) => modelCredentialRef(provider.id, void 0))])];
			let credentials = {};
			let credentialError;
			if (refs.length > 0) try {
				const response = await runtime.remote.credentials.describe(refs);
				if (response.ok) credentials = response.value;
				else credentialError = response.error.message;
			} catch (cause) {
				credentialError = cause instanceof Error ? cause.message : String(cause);
			}
			return {
				catalog: catalog.value,
				providers: modelProviderRows(registered.value, configurable.value, described.value.namespaces, credentials),
				writable: described.value.writable,
				hasDocument: described.value.hasDocument,
				...credentialError === void 0 ? {} : { credentialError }
			};
		}
		function ModelProviderCard(props) {
			const runtime = useRuntime();
			const t = useT();
			const [open, setOpen] = (0, react.useState)(false);
			const [baseURL, setBaseURL] = (0, react.useState)(() => stringAt(props.row.profile, ["baseURL"]) ?? "");
			const [apiKey, setApiKey] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)();
			const profileEditable = props.writable && props.row.namespace !== void 0 && props.row.settingsNs !== "";
			const keyEditable = props.row.credential?.writable !== false;
			const editable = profileEditable || keyEditable;
			(0, react.useEffect)(() => {
				if (open) return;
				setBaseURL(stringAt(props.row.profile, ["baseURL"]) ?? "");
				setApiKey("");
				setFailure(void 0);
			}, [open, props.row.profile]);
			const save = async () => {
				if (busy || !editable) return;
				setBusy(true);
				setFailure(void 0);
				try {
					const namespace = props.row.namespace;
					const ops = [];
					if (profileEditable && namespace !== void 0) {
						const storedBaseURL = stringAt(valueAt(namespace.user, [...props.row.settingsPath, "baseURL"]), []);
						const effectiveBaseURL = stringAt(props.row.profile, ["baseURL"]);
						const nextBaseURL = baseURL.trim();
						if (nextBaseURL.length === 0) {
							if (storedBaseURL !== void 0) ops.push({
								op: "unset",
								path: [...props.row.settingsPath, "baseURL"]
							});
						} else if (nextBaseURL !== storedBaseURL && !(storedBaseURL === void 0 && nextBaseURL === effectiveBaseURL)) ops.push({
							op: "set",
							path: [...props.row.settingsPath, "baseURL"],
							value: nextBaseURL
						});
						if (props.row.settingsNs === "llm-pi-ai" && stringAt(props.row.profile, ["apiKeyEnv"]) === void 0 && apiKey.trim().length > 0) ops.push({
							op: "set",
							path: [...props.row.settingsPath, "apiKeyEnv"],
							value: props.row.credentialRef
						});
						if (ops.length > 0) {
							const response = await runtime.remote.settings.mutate(props.row.settingsNs, ops, namespace.revision);
							if (!response.ok) throw new Error(response.error.message);
						}
					}
					if (apiKey.trim().length > 0) {
						const response = await runtime.remote.credentials.set(props.row.credentialRef, apiKey.trim());
						if (!response.ok) throw new Error(response.error.message);
					}
					if (ops.length === 0 && apiKey.trim().length === 0) {
						setOpen(false);
						return;
					}
					setOpen(false);
					props.onReload();
				} catch (cause) {
					setFailure(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setBusy(false);
				}
			};
			const credentialConfigured = props.row.credential?.configured === true;
			const credentialDeclared = stringAt(props.row.profile, ["apiKeyEnv"]) !== void 0;
			const statusLabel = credentialConfigured ? t("settings.models.keyConfigured") : credentialDeclared ? t("settings.models.keyMissing") : props.row.profile === void 0 ? t("settings.models.notConfigured") : t("settings.models.keyNotRequired");
			const statusClass = credentialConfigured ? SettingsSurface_module_css_default.statusDotGood : credentialDeclared ? SettingsSurface_module_css_default.statusDotMissing : SettingsSurface_module_css_default.statusDotNeutral;
			const editorId = `dcode-provider-editor-${props.row.id.replace(/[^a-z0-9_-]/gi, "-")}`;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SettingsSurface_module_css_default.providerCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: `${SettingsSurface_module_css_default.providerHead} ${ui.cardHeader}`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: `${SettingsSurface_module_css_default.statusDot} ${statusClass}`,
							role: "img",
							"aria-label": statusLabel,
							title: statusLabel
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.rowText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: SettingsSurface_module_css_default.rowTitle,
								children: props.row.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SettingsSurface_module_css_default.rowBody,
								children: [props.row.id, props.row.active ? "" : ` · ${t("settings.models.inactive")}`]
							})]
						}),
						editable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							ariaExpanded: open,
							ariaControls: editorId,
							onClick: () => {
								setOpen((value) => !value);
								setFailure(void 0);
							},
							children: open ? t("common.close") : t("common.edit")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.badge,
							children: t("common.readOnly")
						})
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SettingsSurface_module_css_default.providerEditor,
					id: editorId,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: SettingsSurface_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.fieldLabel,
								children: t("settings.models.apiKey")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: SettingsSurface_module_css_default.fieldInput,
								type: "password",
								autoComplete: "off",
								value: apiKey,
								placeholder: props.row.credential?.configured === true ? t("settings.models.keyConfiguredHint") : t("settings.models.keyPlaceholder"),
								disabled: busy || !keyEditable,
								onChange: (event) => {
									setApiKey(event.target.value);
								}
							})]
						}),
						profileEditable ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: SettingsSurface_module_css_default.field,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.fieldLabel,
								children: t("settings.models.baseURL")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: SettingsSurface_module_css_default.fieldInput,
								type: "url",
								value: baseURL,
								placeholder: t("settings.models.baseURLPlaceholder"),
								disabled: busy,
								onChange: (event) => {
									setBaseURL(event.target.value);
								}
							})]
						}) : null,
						failure === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.inlineError,
							role: "alert",
							children: failure
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SettingsSurface_module_css_default.editorActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								onClick: () => {
									setOpen(false);
								},
								disabled: busy,
								children: t("common.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								primary: true,
								onClick: () => {
									save();
								},
								disabled: busy,
								children: busy ? t("common.saving") : t("common.save")
							})]
						})
					]
				}) : null]
			});
		}
		/** Provider routes, catalog, and the editable credential/profile controls. */
		function ModelsSection() {
			const runtime = useRuntime();
			const t = useT();
			const models = useAsync(async () => await loadModelSettings(runtime), [runtime]);
			if (models.loading && models.value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (models.error !== void 0 && models.value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: models.error });
			if (models.value === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("common.error") });
			const value = models.value;
			const providerName = (providerId) => value.catalog.groups.find((group) => group.id === providerId)?.name ?? value.catalog.failures.find((failure) => failure.id === providerId)?.name ?? providerId;
			const defaultGroup = value.catalog.groups.find((group) => group.id === value.catalog.default.provider && group.models.some((model) => model.id === value.catalog.default.model));
			const defaultModel = defaultGroup?.models.find((model) => model.id === value.catalog.default.model);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("settings.models"),
				body: t("settings.modelsBody"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: t("settings.models.default"),
							body: defaultGroup?.name ?? providerName(value.catalog.default.provider),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: defaultModel?.name ?? t("common.none") })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: t("settings.models.routable"),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.rowMono,
								children: value.catalog.routableProviders.map(providerName).join(", ") || t("common.none")
							})
						})]
					}),
					value.credentialError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.notice,
						children: `${t("settings.models.credentialWarning")}: ${value.credentialError}`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.providerList,
						children: value.providers.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelProviderCard, {
							row,
							writable: value.writable,
							onReload: models.reload
						}, row.id))
					}),
					value.catalog.groups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					value.catalog.failures.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, { title: t("settings.models.failures") }), value.catalog.failures.map((failure) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: failure.name,
							body: failure.message
						}, failure.id))]
					}),
					value.hasDocument ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						onClick: () => {
							runtime.remote.settings.openSettingsDocument();
						},
						children: t("settings.openOfficialSettings")
					}) : null
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
					"aria-label": t("common.search"),
					onChange: (event) => {
						setQuery(event.target.value);
					}
				}), rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.skillsEmpty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
				children: rows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.commandsEmpty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: rows.map((command) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: `/${command.name}`,
						body: command.description
					}, command.name))
				})
			});
		}
		/** Persist the default preset through the same settings namespace as DSH. */
		async function saveDefaultPreset(runtime, id) {
			try {
				const result = await runtime.remote.settings.update("agent-presets", { default: id }, void 0);
				return result.ok ? void 0 : result.error.message;
			} catch (cause) {
				return cause instanceof Error ? cause.message : String(cause);
			}
		}
		/** The Host's current Agent preset roster. */
		function AgentPresetsSection() {
			const runtime = useRuntime();
			const t = useT();
			const roster = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime]);
			const opener = useAsync(async () => await runtime.remote.settings.canOpenAgentPresetDirectory(), [runtime]);
			const [selectedDefault, setSelectedDefault] = (0, react.useState)();
			const [savingDefault, setSavingDefault] = (0, react.useState)(false);
			const [defaultError, setDefaultError] = (0, react.useState)();
			const [dialog, setDialog] = (0, react.useState)();
			const [copyId, setCopyId] = (0, react.useState)("");
			const [copyName, setCopyName] = (0, react.useState)("");
			const [viewContent, setViewContent] = (0, react.useState)();
			const [revealedPaths, setRevealedPaths] = (0, react.useState)({});
			const [dialogBusy, setDialogBusy] = (0, react.useState)(false);
			const [dialogError, setDialogError] = (0, react.useState)();
			const presets = roster.value?.ok === true ? roster.value.value.presets : [];
			const hostDefault = presets.find((preset) => preset.isDefault)?.id;
			const defaultId = selectedDefault ?? hostDefault ?? presets[0]?.id ?? "";
			const authorable = roster.value?.ok === true && roster.value.value.authorable;
			const canOpenDirectory = opener.value?.ok === true && opener.value.value;
			(0, react.useEffect)(() => {
				if (hostDefault !== void 0) {
					setSelectedDefault(hostDefault);
					return;
				}
				if (selectedDefault !== void 0 && !presets.some((preset) => preset.id === selectedDefault)) setSelectedDefault(void 0);
			}, [
				hostDefault,
				presets,
				selectedDefault
			]);
			const saveDefault = (0, react.useCallback)((id) => {
				if (id === defaultId || savingDefault) return;
				const previous = defaultId;
				setSelectedDefault(id);
				setSavingDefault(true);
				setDefaultError(void 0);
				saveDefaultPreset(runtime, id).then((failure) => {
					if (failure === void 0) {
						roster.reload();
						return;
					}
					setSelectedDefault(previous);
					setDefaultError(failure);
				}).catch((cause) => {
					setSelectedDefault(previous);
					setDefaultError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setSavingDefault(false);
				});
			}, [
				defaultId,
				roster,
				runtime.remote.settings,
				savingDefault
			]);
			const closeDialog = (force = false) => {
				if (dialogBusy && !force) return;
				setDialog(void 0);
				setDialogError(void 0);
				setViewContent(void 0);
			};
			const dialogRef = (0, react.useRef)(null);
			useModalFocus(dialog !== void 0, dialogRef, { onClose: () => {
				closeDialog();
			} });
			const beginCopy = (from) => {
				setCopyId("");
				setCopyName("");
				setDialogError(void 0);
				setDialog({
					kind: "copy",
					from
				});
			};
			const viewPreset = (id) => {
				setDialogError(void 0);
				setViewContent(void 0);
				setDialog({
					kind: "view",
					id
				});
				setDialogBusy(true);
				runtime.remote.agentPresets.read(id).then((result) => {
					if (!result.ok) {
						setDialogError(result.error.message);
						return;
					}
					setViewContent(result.value.content);
				}).catch((cause) => {
					setDialogError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setDialogBusy(false);
				});
			};
			const openPresetLocation = (id) => {
				setDialogError(void 0);
				runtime.remote.settings.openAgentPresetDirectory(id).then((result) => {
					if (!result.ok) {
						setDialogError(result.error.message);
						return;
					}
					const value = result.value;
					if (typeof value.path === "string") setRevealedPaths((previous) => ({
						...previous,
						[id]: value.path
					}));
				}).catch((cause) => {
					setDialogError(cause instanceof Error ? cause.message : String(cause));
				});
			};
			const confirmCopy = () => {
				if (dialog?.kind !== "copy" || dialogBusy) return;
				const id = copyId.trim();
				if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
					setDialogError(t("settings.agentPresets.idInvalid"));
					return;
				}
				if (presets.some((preset) => preset.id === id)) {
					setDialogError(t("settings.agentPresets.idTaken"));
					return;
				}
				setDialogBusy(true);
				setDialogError(void 0);
				runtime.remote.agentPresets.copy(dialog.from, id, copyName.trim() === "" ? void 0 : copyName.trim()).then((result) => {
					if (!result.ok) {
						setDialogError(result.error.message);
						return;
					}
					closeDialog(true);
					roster.reload();
					openPresetLocation(id);
				}).catch((cause) => {
					setDialogError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setDialogBusy(false);
				});
			};
			const confirmDelete = () => {
				if (dialog?.kind !== "delete" || dialogBusy) return;
				setDialogBusy(true);
				setDialogError(void 0);
				runtime.remote.agentPresets.deletePreset(dialog.id).then((result) => {
					if (!result.ok) {
						setDialogError(result.error.message);
						return;
					}
					closeDialog(true);
					setSelectedDefault(void 0);
					roster.reload();
				}).catch((cause) => {
					setDialogError(cause instanceof Error ? cause.message : String(cause));
				}).finally(() => {
					setDialogBusy(false);
				});
			};
			if (roster.loading) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) });
			if (roster.error !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: roster.error });
			if (roster.value?.ok === false) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: roster.value.error.message });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("settings.agentPresets"),
				body: t("settings.agentPresetsBody"),
				children: [
					presets.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.presetsEmpty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: t("settings.agentPresetsDefault"),
							body: t("settings.agentPresetsDefaultBody"),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectMenu, {
								value: defaultId,
								ariaLabel: t("settings.agentPresetsDefault"),
								options: presets.map((preset) => ({
									id: preset.id,
									label: preset.name ?? preset.id,
									detail: preset.broken,
									disabled: preset.broken !== void 0
								})),
								disabled: savingDefault || presets.length < 2,
								onChange: saveDefault
							})
						}), defaultError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SettingsSurface_module_css_default.inlineError,
							role: "alert",
							children: defaultError
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.card,
						children: presets.map((preset) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
							title: preset.name ?? preset.id,
							body: [preset.description, preset.broken].filter(Boolean).join(" · "),
							control: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SettingsSurface_module_css_default.presetActions,
								children: [
									preset.id === defaultId ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SettingsSurface_module_css_default.badge,
										children: t("settings.models.default")
									}) : null,
									preset.trust === "system" && preset.broken === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: () => {
											viewPreset(preset.id);
										},
										children: t("settings.agentPresets.view")
									}) : null,
									authorable && preset.broken === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: () => {
											beginCopy(preset.id);
										},
										children: t("settings.agentPresets.copy")
									}) : null,
									preset.trust === "user" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: () => {
											openPresetLocation(preset.id);
										},
										children: canOpenDirectory ? t("settings.agentPresets.openLocation") : t("settings.agentPresets.showLocation")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: () => {
											setDialogError(void 0);
											setDialog({
												kind: "delete",
												id: preset.id
											});
										},
										children: t("settings.agentPresets.delete")
									})] }) : null
								]
							})
						}, preset.id))
					})] }),
					dialog === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.dialogBackdrop,
						role: "presentation",
						onPointerDown: (event) => {
							if (event.target === event.currentTarget) closeDialog();
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							ref: dialogRef,
							className: SettingsSurface_module_css_default.dialog,
							role: "dialog",
							"aria-modal": "true",
							"aria-labelledby": "dcode-settings-dialog-title",
							tabIndex: -1,
							children: dialog.kind === "copy" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: SettingsSurface_module_css_default.dialogHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										id: "dcode-settings-dialog-title",
										className: SettingsSurface_module_css_default.dialogTitle,
										children: t("settings.agentPresets.copyTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: closeDialog,
										disabled: dialogBusy,
										children: t("common.close")
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: SettingsSurface_module_css_default.dialogBody,
									children: t("settings.agentPresets.copyBody")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: SettingsSurface_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SettingsSurface_module_css_default.fieldLabel,
										children: t("settings.agentPresets.id")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: SettingsSurface_module_css_default.fieldInput,
										autoFocus: true,
										value: copyId,
										placeholder: "my-agent",
										disabled: dialogBusy,
										onChange: (event) => {
											setCopyId(event.target.value);
										}
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: SettingsSurface_module_css_default.field,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SettingsSurface_module_css_default.fieldLabel,
										children: t("settings.agentPresets.name")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: SettingsSurface_module_css_default.fieldInput,
										value: copyName,
										placeholder: t("settings.agentPresets.namePlaceholder"),
										disabled: dialogBusy,
										onChange: (event) => {
											setCopyName(event.target.value);
										}
									})]
								}),
								dialogError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SettingsSurface_module_css_default.inlineError,
									role: "alert",
									children: dialogError
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: SettingsSurface_module_css_default.dialogActions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: closeDialog,
										disabled: dialogBusy,
										children: t("common.cancel")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										primary: true,
										onClick: confirmCopy,
										disabled: dialogBusy,
										children: dialogBusy ? t("common.saving") : t("settings.agentPresets.copy")
									})]
								})
							] }) : dialog.kind === "view" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: SettingsSurface_module_css_default.dialogHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									id: "dcode-settings-dialog-title",
									className: SettingsSurface_module_css_default.dialogTitle,
									children: t("settings.agentPresets.view")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									onClick: closeDialog,
									disabled: dialogBusy,
									children: t("common.close")
								})]
							}), dialogBusy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) }) : viewContent === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: SettingsSurface_module_css_default.inlineError,
								role: "alert",
								children: dialogError ?? t("common.error")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								className: SettingsSurface_module_css_default.viewerCode,
								tabIndex: 0,
								role: "region",
								"aria-label": t("settings.agentPresets.view"),
								children: viewContent
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: SettingsSurface_module_css_default.dialogHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										id: "dcode-settings-dialog-title",
										className: SettingsSurface_module_css_default.dialogTitle,
										children: t("settings.agentPresets.deleteTitle")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: closeDialog,
										disabled: dialogBusy,
										children: t("common.close")
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: SettingsSurface_module_css_default.dialogBody,
									children: t("settings.agentPresets.deleteBody")
								}),
								dialogError === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: SettingsSurface_module_css_default.inlineError,
									role: "alert",
									children: dialogError
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: SettingsSurface_module_css_default.dialogActions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: closeDialog,
										disabled: dialogBusy,
										children: t("common.cancel")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										primary: true,
										onClick: confirmDelete,
										disabled: dialogBusy,
										children: dialogBusy ? t("common.saving") : t("settings.agentPresets.delete")
									})]
								})
							] })
						})
					}),
					Object.entries(revealedPaths).map(([id, path]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.revealedPath,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: `${id}: ` }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: path })]
					}, id))
				]
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
				children: members.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.subagentsEmpty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
				children: [described.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Spinner, {}) }) : described.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "alert",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: described.error })
				}) : described.value?.ok === false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					role: "alert",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: described.value.error.message })
				}) : namespaces.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyState, { children: t("settings.namespaceEmpty") }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: namespaces.map((view) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
						title: view.ns,
						body: `${t("settings.namespace")} · ${view.applies}`,
						control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SettingsSurface_module_css_default.rowMono,
							children: JSON.stringify(view.value)
						})
					}, view.ns))
				}), described.value?.ok === true && described.value.value.hasDocument ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					onClick: openDocument,
					children: t("settings.openOfficialSettings")
				}) : null]
			});
		}
		function UsageMetric(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SettingsSurface_module_css_default.usageMetric,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SettingsSurface_module_css_default.usageMetricTitle,
					children: props.title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
					className: SettingsSurface_module_css_default.usageMetricValue,
					children: props.value
				})]
			});
		}
		function UsageSection() {
			const t = useT();
			const list = useSessionList();
			const totals = (0, react.useMemo)(() => summarizeUsage(aggregateUsage(list)), [list]);
			if (list.phase === "pending") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("settings.usage"),
				body: t("settings.usageBody"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.usageStatus,
						role: "status",
						children: t("settings.usageLoading")
					})
				})
			});
			if (list.state === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Section, {
				title: t("settings.usage"),
				body: t("settings.usageBody"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SettingsSurface_module_css_default.card,
					role: "alert",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.usageStatus,
						children: list.error?.message ?? t("settings.usageError")
					})
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Section, {
				title: t("settings.usage"),
				body: t("settings.usageBody"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.usageTotal,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.usageTotalTitle,
								children: t("settings.usageTotal")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
								className: SettingsSurface_module_css_default.usageTotalValue,
								children: formatTokenCount(totals.totalTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SettingsSurface_module_css_default.usageTotalScope,
								children: t("settings.usageScope", {
									sessions: formatTokenCount(totals.sessions),
									usageSessions: formatTokenCount(totals.usageSessions)
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.usageGrid,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageMetric, {
								title: t("settings.usageInput"),
								value: formatTokenCount(totals.promptTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageMetric, {
								title: t("settings.usageOutput"),
								value: formatTokenCount(totals.outputTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageMetric, {
								title: t("settings.usageCacheRead"),
								value: formatTokenCount(totals.cacheReadTokens)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageMetric, {
								title: t("settings.usageCacheWrite"),
								value: formatTokenCount(totals.cacheWriteTokens)
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SettingsSurface_module_css_default.card,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.usageSessions"),
								control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.rowMono,
									children: formatTokenCount(totals.sessions)
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.usageTurns"),
								control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.rowMono,
									children: totals.hasStats ? formatTokenCount(totals.turns) : "—"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.usageSteps"),
								control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.rowMono,
									children: totals.hasStats ? formatTokenCount(totals.steps) : "—"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
								title: t("settings.usageCacheHit"),
								control: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SettingsSurface_module_css_default.rowMono,
									children: totals.cacheHit === null ? "—" : formatPercent(totals.cacheHit)
								})
							})
						]
					}),
					!totals.hasUsage ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SettingsSurface_module_css_default.usageEmpty,
						children: t("settings.usageEmpty")
					}) : null
				]
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
					case "plugins": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginSettingsSection, {});
					case "mcp": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginSettingsSection, { mcpOnly: true });
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
						"aria-current": state.settingsSection === item.id ? "page" : void 0,
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
		const css$1 = ".NX-gGW_root{background:var(--zx-bg-app);color:var(--zx-label);font-family:var(--zx-font-ui);font-size:var(--zx-text-sm);line-height:var(--zx-leading-tight);isolation:isolate;padding-top:var(--dsh-desktop-titlebar-height,0px);box-sizing:border-box;grid-template-rows:1fr;grid-template-columns:auto minmax(0,1fr) auto;display:grid;position:absolute;inset:0;overflow:hidden}.NX-gGW_rail{width:var(--zx-rail-width);min-width:var(--zx-rail-width);border-right:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);transition:width var(--zx-motion), min-width var(--zx-motion), transform var(--zx-motion), visibility var(--zx-motion);flex-direction:column;display:flex;position:relative;overflow:hidden}.NX-gGW_railResizeHandle{z-index:var(--zx-z-sticky);touch-action:none;cursor:col-resize;outline:none;width:7px;position:absolute;top:0;bottom:0;right:0}.NX-gGW_railResizeHandle:after{content:\"\";background:var(--zx-accent);opacity:0;width:2px;transition:opacity var(--zx-motion-fast);position:absolute;top:0;bottom:0;right:0}.NX-gGW_railResizeHandle:hover:after,.NX-gGW_railResizeHandle:focus-visible:after,.NX-gGW_root[data-rail-resizing] .NX-gGW_railResizeHandle:after{opacity:.8}.NX-gGW_root[data-rail-resizing]{cursor:col-resize;user-select:none}.NX-gGW_root[data-rail-resizing] .NX-gGW_rail{transition:none}.NX-gGW_railCollapsed{visibility:hidden;border-right-color:#0000;width:0;min-width:0}.NX-gGW_center{flex-direction:column;min-width:0;display:flex;position:relative;overflow:hidden;container-type:inline-size}.NX-gGW_filler{flex:0 0 0}.NX-gGW_centerBlank .NX-gGW_filler{flex:1 1 0}.NX-gGW_aside{width:var(--zx-aside-width);min-width:var(--zx-aside-width);border-left:1px solid var(--zx-border-soft);background:var(--zx-bg-panel);transition:width var(--zx-motion), min-width var(--zx-motion), transform var(--zx-motion), visibility var(--zx-motion);flex-direction:column;display:flex;overflow:hidden}.NX-gGW_asideCollapsed{visibility:hidden;border-left-color:#0000;width:0;min-width:0}.NX-gGW_surface{grid-column:1/-1;min-width:0;display:flex;overflow:hidden}.NX-gGW_scroll{scrollbar-width:thin;scrollbar-color:var(--zx-border) transparent;overflow:hidden auto}.NX-gGW_scroll::-webkit-scrollbar{width:var(--zx-scrollbar-size);height:var(--zx-scrollbar-size)}.NX-gGW_scroll::-webkit-scrollbar-thumb{background:var(--zx-border);border-radius:var(--zx-radius-pill);background-clip:padding-box;border:3px solid #0000}.NX-gGW_scroll::-webkit-scrollbar-track{background:0 0}.NX-gGW_scrim{z-index:var(--zx-z-scrim);background:var(--zx-scrim);cursor:default;animation:NX-gGW_scrimIn var(--zx-motion) ease-out;border:0;padding:0;position:absolute;inset:0}@keyframes NX-gGW_scrimIn{0%{opacity:0}}.NX-gGW_root[data-dcode-layout=compact]{grid-template-columns:minmax(0,1fr)}.NX-gGW_root[data-dcode-layout=compact] .NX-gGW_rail{z-index:var(--zx-z-drawer);top:var(--dsh-desktop-titlebar-height,0px);width:min(var(--zx-rail-width), 86%);min-width:0;box-shadow:var(--zx-shadow-panel);position:absolute;bottom:0;left:0}.NX-gGW_root[data-dcode-layout=compact] .NX-gGW_railCollapsed{width:min(var(--zx-rail-width), 86%);border-right-color:var(--zx-border-soft);transform:translate(-100%)}.NX-gGW_root[data-dcode-layout=compact] .NX-gGW_aside{z-index:var(--zx-z-drawer);top:var(--dsh-desktop-titlebar-height,0px);width:min(var(--zx-aside-width), 86%);min-width:0;box-shadow:var(--zx-shadow-panel);position:absolute;bottom:0;right:0}.NX-gGW_root[data-dcode-layout=compact] .NX-gGW_asideCollapsed{width:min(var(--zx-aside-width), 86%);border-left-color:var(--zx-border-soft);transform:translate(100%)}.NX-gGW_root[data-dcode-layout=wide]{--zx-reading-width:820px}@media (prefers-reduced-motion:reduce){.NX-gGW_rail,.NX-gGW_aside{transition:none}.NX-gGW_scrim{animation:none}}";
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
			"railResizeHandle": "NX-gGW_railResizeHandle",
			"root": "NX-gGW_root",
			"scrim": "NX-gGW_scrim",
			"scrimIn": "NX-gGW_scrimIn",
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
			const t = useT();
			const state = useNavigation(navigation);
			const sessionId = useCurrentSessionId();
			const pendingQuestion = usePendingQuestion(sessionId);
			const cwd = useCurrentCwd(sessionId);
			const blank = useConversationBlank(sessionId);
			const { scheme } = useAppearance();
			const [browsing, setBrowsing] = (0, react.useState)(false);
			const [railWidth, setRailWidth] = (0, react.useState)(readRailWidth);
			const [railResizing, setRailResizing] = (0, react.useState)(false);
			const railDrag = (0, react.useRef)();
			const [frame, setFrame] = (0, react.useState)(null);
			const size = useLayoutSize(frame);
			(0, react.useEffect)(() => {
				navigation.fit(size);
			}, [navigation, size]);
			const resizeRail = (0, react.useCallback)((width, persist = false) => {
				const next = clampRailWidth(width);
				setRailWidth(next);
				if (persist) writeRailWidth(next);
				return next;
			}, []);
			const startRailResize = (0, react.useCallback)((event) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				railDrag.current = {
					pointerId: event.pointerId,
					startX: event.clientX,
					startWidth: railWidth,
					width: railWidth
				};
				setRailResizing(true);
			}, [railWidth]);
			const moveRailResize = (0, react.useCallback)((event) => {
				const drag = railDrag.current;
				if (drag === void 0 || drag.pointerId !== event.pointerId) return;
				drag.width = resizeRail(drag.startWidth + event.clientX - drag.startX);
			}, [resizeRail]);
			const finishRailResize = (0, react.useCallback)((event) => {
				const drag = railDrag.current;
				if (drag === void 0 || drag.pointerId !== event.pointerId) return;
				writeRailWidth(drag.width);
				railDrag.current = void 0;
				setRailResizing(false);
			}, []);
			const resizeRailWithKeyboard = (0, react.useCallback)((event) => {
				let next;
				const step = event.shiftKey ? 24 : 8;
				if (event.key === "ArrowLeft") next = railWidth - step;
				if (event.key === "ArrowRight") next = railWidth + step;
				if (event.key === "Home") next = RAIL_WIDTH.min;
				if (event.key === "End") next = RAIL_WIDTH.max;
				if (next === void 0) return;
				event.preventDefault();
				resizeRail(next, true);
			}, [railWidth, resizeRail]);
			const restoreOverlayFocus = (0, react.useCallback)((target) => {
				window.requestAnimationFrame(() => {
					frame?.querySelector(`[data-dcode-focus-target="${target}"]`)?.focus();
				});
			}, [frame]);
			const acrylic = runtime.appearance.material !== "none";
			(0, react.useEffect)(() => {
				if (!acrylic || typeof document === "undefined") return void 0;
				const roots = [document.documentElement, document.body];
				for (const node of roots) node.setAttribute(ACRYLIC_ATTRIBUTE, "");
				return () => {
					for (const node of roots) node.removeAttribute(ACRYLIC_ATTRIBUTE);
				};
			}, [acrylic]);
			(0, react.useEffect)(() => {
				if (typeof document === "undefined") return void 0;
				document.body.setAttribute("data-dcode-scope", "");
				document.body.setAttribute("data-dcode-scheme", scheme);
				return () => {
					document.body.removeAttribute("data-dcode-scope");
					document.body.removeAttribute("data-dcode-scheme");
				};
			}, [scheme]);
			const newTask = (0, react.useCallback)((workspaceId) => {
				navigation.show("session");
				runtime.navigation?.startSession(workspaceId);
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
					if (navigation.getSnapshot().paletteOpen) return;
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
					if (meta && event.altKey && event.key.toLowerCase() === "b") {
						event.preventDefault();
						navigation.toggleAside();
						return;
					}
					if (meta && event.key.toLowerCase() === "b") {
						event.preventDefault();
						navigation.toggleRail();
						return;
					}
					if (event.key === "Escape") {
						event.preventDefault();
						const snapshot = navigation.getSnapshot();
						if (snapshot.paletteOpen) navigation.togglePalette(false);
						else if (snapshot.summaryOpen) {
							navigation.toggleSummary(false);
							restoreOverlayFocus("summary");
						} else if (snapshot.diff !== void 0) {
							navigation.closeDiff();
							restoreOverlayFocus("aside");
						} else if (snapshot.layout === "compact" && snapshot.railOpen) {
							navigation.closeRail();
							restoreOverlayFocus("rail");
						} else if (snapshot.layout === "compact" && snapshot.asideOpen) {
							navigation.toggleAside();
							restoreOverlayFocus("aside");
						}
					}
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [
				navigation,
				newTask,
				openWorkspace,
				restoreOverlayFocus
			]);
			const fullSurface = state.view !== "session";
			const drawer = state.layout === "compact" && (state.railOpen || state.asideOpen);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: setFrame,
				className: Workbench_module_css_default.root,
				...dcodeScope,
				"data-dcode-scheme": scheme,
				"data-dcode-layout": state.layout,
				"data-rail-resizing": railResizing ? "" : void 0,
				style: { "--zx-rail-width": `${railWidth}px` },
				...acrylic ? { [ACRYLIC_ATTRIBUTE]: "" } : {},
				children: [
					fullSurface ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Workbench_module_css_default.surface,
						children: state.view === "learning" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LearningHome, {
							navigation,
							cwd,
							sessionId
						}) : state.view === "plugins" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PluginsHome, { navigation }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsSurface, {
							navigation,
							sessionId
						})
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						drawer ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Workbench_module_css_default.scrim,
							role: "presentation",
							onClick: () => {
								if (state.railOpen) navigation.closeRail();
								if (state.asideOpen) navigation.toggleAside();
							}
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${Workbench_module_css_default.rail} ${state.railOpen ? "" : Workbench_module_css_default.railCollapsed}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LeftRail, {
								navigation,
								onNewTask: newTask,
								onOpenWorkspace: openWorkspace
							}), state.railOpen && state.layout !== "compact" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: Workbench_module_css_default.railResizeHandle,
								role: "separator",
								"aria-label": t("nav.resize"),
								"aria-orientation": "vertical",
								"aria-valuemin": RAIL_WIDTH.min,
								"aria-valuemax": RAIL_WIDTH.max,
								"aria-valuenow": railWidth,
								tabIndex: 0,
								onPointerDown: startRailResize,
								onPointerMove: moveRailResize,
								onPointerUp: finishRailResize,
								onPointerCancel: finishRailResize,
								onKeyDown: resizeRailWithKeyboard,
								onDoubleClick: () => {
									resizeRail(RAIL_WIDTH.default, true);
								}
							}) : null]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${Workbench_module_css_default.center} ${blank ? Workbench_module_css_default.centerBlank : ""}`,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TopBar, {
									navigation,
									sessionId,
									cwd
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SummaryCard, {
									navigation,
									sessionId,
									cwd,
									open: state.summaryOpen
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Transcript, {
									navigation,
									sessionId,
									cwd,
									blank
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlanCard, {
									sessionId,
									navigation
								}, sessionId),
								pendingQuestion === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Composer, {
									sessionId,
									blank,
									cwd,
									onOpenWorkspace: openWorkspace
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuestionComposer, { pending: pendingQuestion }),
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
		const css = ".UwQPva_root{border-bottom:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:16px 0;display:flex}.UwQPva_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.UwQPva_lead{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;font-weight:400;line-height:18px}.UwQPva_choice{flex-wrap:wrap;align-items:stretch;gap:8px;display:flex}.UwQPva_option{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);min-height:84px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border-radius:16px;flex-direction:column;flex:180px;justify-content:center;align-items:center;gap:4px;padding:16px 24px;font-size:14px;line-height:22px;transition:background .12s,border-color .12s;display:flex}.UwQPva_option:hover:not(.UwQPva_optionActive){background:var(--dsw-alias-interactive-bg-hover)}.UwQPva_optionActive{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}.UwQPva_optionTitle{color:var(--dsw-alias-label-primary);text-align:center;font-size:14px;font-weight:400;line-height:22px}.UwQPva_optionBody{width:100%;max-width:280px;color:var(--dsw-alias-label-tertiary);text-align:center;font-size:12px;line-height:18px}";
		const tagId = "@dsh-portable/dcode-ui/InterfaceSettingsSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/dcode-ui";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var InterfaceSettingsSection_module_css_default = {
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
							"aria-pressed": active === "official",
							onClick: () => {
								mode.set("official");
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: InterfaceSettingsSection_module_css_default.optionTitle,
								children: copy("settings.modeOfficial")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: InterfaceSettingsSection_module_css_default.optionBody,
								children: copy("settings.modeOfficialBody")
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${InterfaceSettingsSection_module_css_default.option} ${active === "dcode" ? InterfaceSettingsSection_module_css_default.optionActive : ""}`,
							"aria-pressed": active === "dcode",
							onClick: () => {
								mode.set("dcode");
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: InterfaceSettingsSection_module_css_default.optionTitle,
								children: copy("settings.modeWorkbench")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: InterfaceSettingsSection_module_css_default.optionBody,
								children: copy("settings.modeWorkbenchBody")
							})]
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
			"settingsSchema",
			"sessions",
			"workspaces",
			"conversation",
			"uiConversation",
			"uiSession",
			"connection",
			"commandUi",
			"remote",
			"remote.session",
			"remote.commands",
			"remote.skills",
			"remote.settings",
			"remote.credentials",
			"remote.llm",
			"remote.pluginInventory",
			"remote.messageFeedback",
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
		const SETTINGS_GENERAL_ITEM_ORDER = 5;
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