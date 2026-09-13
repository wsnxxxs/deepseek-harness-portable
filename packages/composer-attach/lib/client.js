window.__ModuleLoader__.load({
	id: "@dsh-portable/composer-attach",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region ../../vendor/deepseek-harness/packages/context/file-reference/lib/types/grammar.js
		/**
		* Format a selected path as prompt text. Whitespace uses the quoted
		* `@"path"` grammar; a quoted directory keeps that quote open after its
		* trailing slash so completion can descend another level.
		* @param candidate - selected file or directory.
		* @param preserveQuote - retain an explicitly opened quote even when unnecessary.
		* @returns the insertion value, or `undefined` for a path the editor grammar cannot represent safely.
		*/
		function formatFileMention(candidate, preserveQuote) {
			const path = candidate.kind === "directory" ? `${candidate.path}/` : candidate.path;
			if (/[\u0000-\u001f\u007f-\u009f"]/u.test(path)) return void 0;
			if (!(preserveQuote || /\s/u.test(path))) return `@${path}`;
			if (candidate.kind === "directory") return `@"${path}`;
			return `@"${path}"`;
		}
		//#endregion
		//#region src/client/caret.ts
		/**
		* Length of the composer document in detect coordinates.
		* @param draft - the clipboard-text projection (`InputState.draft`).
		* @param occurrences - the draft's reference chips (`InputState.occurrences`).
		* @returns the detect-projection length.
		*/
		function detectLength(draft, occurrences) {
			let length = draft.length;
			for (const occurrence of occurrences) length -= occurrence.length - 1;
			return length;
		}
		/**
		* The collapsed insertion span a composer entry hands to the trigger pipeline.
		* @param draft - the clipboard-text projection.
		* @param occurrences - the draft's reference chips.
		* @param draftRev - the input machine's revision, stamped for pick-time CAS.
		* @returns a collapsed span at the end of the document.
		*/
		function documentEndSpan(draft, occurrences, draftRev) {
			const end = detectLength(draft, occurrences);
			return {
				start: end,
				end,
				draftRev
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\packages\composer-attach\src\client\AttachButton.module.css.mjs
		const css = ".Gh2U7a_attach{background:var(--dsw-specific-selector,#0000000d);width:28px;height:28px;color:var(--dsw-alias-label-primary,#0b0e14);cursor:pointer;border:none;border-radius:999px;flex:none;place-items:center;display:grid}.Gh2U7a_attach:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid,#00000014)}.Gh2U7a_attach:disabled{opacity:.5;cursor:default}";
		const tagId = "@dsh-portable/composer-attach/AttachButton.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/composer-attach";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var AttachButton_module_css_default = { "attach": "Gh2U7a_attach" };
		//#endregion
		//#region src/client/AttachButton.tsx
		/**
		* The composer's click path to a file or folder reference.
		*
		* The official composer already knows how to reference workspace files: typing
		* `@` opens the harness's own reference menu, with directory drill-down, quoted
		* paths, chips, and model serialization. What it has no *click* path to is that
		* menu. The `+` at the head of the same row is upstream's **command** launcher
		* — it seeds the `/` source alone — so an operator who has not learned the `@`
		* syntax has no way in, and the composer's own placeholder is the only thing
		* that ever mentions it.
		*
		* This button is that way in. It reimplements no file discovery: it opens the
		* very same `@` menu, at the end of the draft, through the trigger pipeline's
		* own `toggleSource`. Candidates, drill-down, insertion, and serialization all
		* stay upstream's.
		* @module @dsh-portable/composer-attach/client/AttachButton
		*/
		/** Keep the composer focused so the menu opens over a live editor. */
		function keepFocus(event) {
			event.preventDefault();
		}
		/** The attach control, rendered in the composer tool row. */
		function ComposerAttachButton(props) {
			const input = props.useInput((state) => state);
			const { t, reportSpan } = props;
			const span = documentEndSpan(input.draft, input.occurrences, input.draftRev);
			(0, react.useEffect)(() => reportSpan(span), [
				reportSpan,
				span.start,
				span.end,
				span.draftRev
			]);
			const ready = input.phase === "plain" || input.phase === "claimed";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t("attach.label"),
				side: "top",
				delayMs: 500,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: AttachButton_module_css_default.attach,
					"aria-label": t("attach.label"),
					"aria-haspopup": "menu",
					disabled: !ready,
					onMouseDown: keepFocus,
					onClick: () => {
						props.openReferences(span, input.draft.trim() === "" ? "leading" : "inline");
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ReferenceIcon, {
						kind: "file",
						size: 16
					})
				})
			});
		}
		//#endregion
		//#region src/client/files-command.ts
		/** Command name the contribution registers under (also typeable as `/files`). */
		const FILES_COMMAND = "files";
		/** Menu order: negative so the entry sorts above the command rows, which take 0. */
		const FILES_MENU_ORDER = -100;
		/**
		* Encode a candidate as a popup option id.
		*
		* `onSelect` receives the option alone, so the kind has to survive the round
		* trip; a one-character tag keeps the id readable and avoids a second lookup
		* table living across the popup's lifetime.
		*/
		function optionId(candidate, mention) {
			return `${candidate.kind === "directory" ? "d" : "f"}:${mention}`;
		}
		/**
		* Decode a picked option back into the reference it stands for.
		*
		* The display label comes from the option's own label — the workspace-relative
		* path this module put there — rather than from the mention: mention grammar
		* quotes and escapes for the model, and reading a basename back out of it
		* would be parsing our own serialization. The chip shows the basename, which
		* is what the `@` menu's inserts show.
		* @param id - the option id built by {@link optionId}.
		* @param label - the option's display label (a directory carries its slash).
		* @returns the reference, or undefined for an id this module did not write.
		*/
		function decode(id, label) {
			const tag = id.slice(0, 2);
			const ref = id.slice(2);
			if (ref === "" || tag !== "d:" && tag !== "f:") return void 0;
			const directory = tag === "d:";
			const path = directory ? label.slice(0, -1) : label;
			const name = path.slice(path.lastIndexOf("/") + 1);
			return {
				ref,
				label: directory ? `${name}/` : name,
				appearance: directory ? "folder" : "file"
			};
		}
		/**
		* Build the `files` command contribution.
		* @param deps - the plugin body's bindings.
		* @returns the contribution to hand to `commandUi.register`.
		*/
		function filesCommand(deps) {
			return {
				name: FILES_COMMAND,
				description: () => deps.t("command.description"),
				section: deps.t("menu.addSection"),
				restSection: deps.t("menu.commandSection"),
				icon: "file",
				order: FILES_MENU_ORDER,
				available: () => true,
				ui: {
					kind: "popupSelect",
					options: async (session, signal) => {
						const candidates = await deps.list(session, "", signal);
						const options = [];
						for (const candidate of candidates) {
							const mention = deps.mention(candidate);
							if (mention === void 0) continue;
							options.push({
								id: optionId(candidate, mention),
								label: candidate.kind === "directory" ? `${candidate.path}/` : candidate.path,
								detail: deps.t(candidate.kind === "directory" ? "picker.folder" : "picker.file")
							});
						}
						return options;
					},
					onSelect: (option, session) => {
						const reference = decode(option.id, option.label);
						if (reference === void 0) return;
						if (!deps.insert(session, reference)) throw new Error(deps.t("picker.refused"));
					}
				}
			};
		}
		//#endregion
		//#region src/client/spans.ts
		/** Per-session insertion points, keyed by the session whose composer published them. */
		var SpanRegistry = class {
			points = /* @__PURE__ */ new Map();
			/**
			* Publish this session's current insertion point.
			* @param id - the session.
			* @param span - the collapsed detect-coordinate span to insert at.
			*/
			publish(id, span) {
				this.points.set(id, span);
			}
			/**
			* Forget a session's insertion point when its composer unmounts.
			* @param id - the session.
			*/
			withdraw(id) {
				this.points.delete(id);
			}
			/**
			* The insertion point last published for a session.
			* @param id - the session.
			* @returns the span, or undefined when no composer has published one.
			*/
			read(id) {
				return this.points.get(id);
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* Copy for the composer attach control.
		* @module @dsh-portable/composer-attach/client/locales
		*/
		/** Dictionary namespace owned by this plugin. */
		const COMPOSER_ATTACH_NS = "composerAttach";
		const zh = {
			"attach.label": "添加文件和文件夹",
			"attach.hint": "从工作区选择文件或文件夹，等同于在输入框里输入 @",
			"command.description": "文件和文件夹",
			"menu.addSection": "添加",
			"menu.commandSection": "指令",
			"picker.file": "文件",
			"picker.folder": "文件夹",
			"picker.refused": "当前输入框状态无法插入引用，请先结束正在进行的发送。"
		};
		const en = {
			"attach.label": "Add files and folders",
			"attach.hint": "Pick a file or folder from the workspace — the same as typing @ in the composer",
			"command.description": "Files and folders",
			"menu.addSection": "Add",
			"menu.commandSection": "Commands",
			"picker.file": "File",
			"picker.folder": "Folder",
			"picker.refused": "The composer cannot take a reference right now — wait for the current send to finish."
		};
		//#endregion
		//#region src/client/index.ts
		/** Stable Cordis plugin name. */
		const name = "composer-attach-client";
		/**
		* Services this plugin cannot register without.
		*
		* `inputTriggers` is the pipeline the button drives, `sessions` resolves the
		* per-session scope its controller and its scoped input events live on,
		* `commandUi` owns the `+` menu's contribution registry, and
		* `remote.fileReferences` is the workspace listing the picker shows. Cordis
		* holds the plugin body until all of them publish.
		*
		* The `@` **source** is not a service and cannot be injected — an assembly
		* that disabled `ui-reference` still mounts these entries, and `toggleSource`
		* dismisses instead of opening a menu with no source behind it.
		*/
		const inject = [
			"slots",
			"locale",
			"sessions",
			"inputTriggers",
			"commandUi",
			"remote",
			"remote.fileReferences"
		];
		/**
		* Name `ui-reference` registers its combined `@file` / `@session` source under.
		*
		* The pipeline addresses sources by name, so this string is the whole coupling
		* to upstream. A rename upstream turns the button into a no-op rather than an
		* error, which is why it is named here instead of being inlined at the call.
		*/
		const REFERENCE_SOURCE = "reference";
		/**
		* Position within `conversation.input.left`.
		*
		* The slot itself renders at the end of the composer tool row, after the `+`
		* and the access/plan chips, so this button sits beside the controls it
		* belongs with without the plugin reaching into upstream's layout.
		*/
		const INPUT_LEFT_ORDER = 0;
		/**
		* Client plugin body.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(COMPOSER_ATTACH_NS, {
				zh,
				en
			}), "composer-attach: dictionaries");
			const t = ctx.locale.bind(COMPOSER_ATTACH_NS);
			const spans = new SpanRegistry();
			/** Apply one reference through the session's own scoped input event. */
			const insert = (session, reference) => {
				const span = spans.read(session.sessionId);
				const actx = ctx.sessions.scope(session.sessionId);
				if (span === void 0 || actx === void 0) return false;
				return actx.bail(actx, "slash/input-insert-reference", {
					reference: {
						source: REFERENCE_SOURCE,
						ref: reference.ref,
						label: reference.label,
						appearance: reference.appearance,
						clipboardText: reference.ref
					},
					span
				}) === true;
			};
			ctx.effect(() => ctx.get("commandUi").register(filesCommand({
				list: async (session, query, signal) => {
					const answer = await ctx.remote.fileReferences.list(session.sessionId, query, signal);
					return answer.ok ? answer.value : [];
				},
				mention: (candidate) => formatFileMention(candidate, false),
				insert,
				t
			})), "composer-attach: /files contribution");
			const attachOperations = (sessionId) => ({
				openReferences: (span, position) => {
					const scope = ctx.sessions.scope(sessionId);
					if (scope === void 0) return;
					ctx.inputTriggers.sessionOf(scope).toggleSource(REFERENCE_SOURCE, {
						trigger: "@",
						query: "",
						quoted: false,
						position,
						span
					});
				},
				reportSpan: (span) => {
					spans.publish(sessionId, span);
					return () => {
						spans.withdraw(sessionId);
					};
				}
			});
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "portable-attach",
				order: INPUT_LEFT_ORDER,
				locale: COMPOSER_ATTACH_NS,
				inject: attachOperations
			}, ComposerAttachButton));
		}
		//#endregion
		exports.COMPOSER_ATTACH_NS = COMPOSER_ATTACH_NS;
		exports.ComposerAttachButton = ComposerAttachButton;
		exports.FILES_COMMAND = FILES_COMMAND;
		exports.SpanRegistry = SpanRegistry;
		exports.apply = apply;
		exports.detectLength = detectLength;
		exports.documentEndSpan = documentEndSpan;
		exports.en = en;
		exports.filesCommand = filesCommand;
		exports.inject = inject;
		exports.name = name;
		exports.zh = zh;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map