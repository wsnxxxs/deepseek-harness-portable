window.__ModuleLoader__.load({
	id: "@dsh-portable/plugin-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/client/bridge.ts
		function connectBundledPlugins(manager, api) {
			const originalList = manager.controlsList;
			const originalToggle = manager.controlsSetEnabled;
			const list = async () => {
				const [existing, result] = await Promise.all([originalList.call(manager), api.list()]);
				if (!result.ok) throw new Error(result.error.message);
				const bundled = result.value.plugins.map((plugin) => ({
					id: plugin.name,
					name: plugin.name,
					repository: "https://github.com/wsnxxxs/deepseek-harness-portable",
					state: plugin.pending ?? plugin.enabled ? "enabled" : "disabled"
				}));
				return [...existing.filter((row) => !bundled.some((plugin) => plugin.id === row.id)), ...bundled];
			};
			manager.controlsList = list;
			manager.controlsSetEnabled = async (id, enabled) => {
				const roster = await api.list();
				if (!roster.ok) throw new Error(roster.error.message);
				if (roster.value.plugins.some((plugin) => plugin.name === id)) {
					const result = await api.setEnabled(id, enabled);
					if (!result.ok) throw new Error(result.error.message);
				} else await originalToggle.call(manager, id, enabled);
				return list();
			};
			return () => {
				manager.controlsList = originalList;
				manager.controlsSetEnabled = originalToggle;
			};
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
		//#region src/client/index.ts
		const name = "portable-plugin-management";
		const inject = ["connection"];
		function apply(ctx) {
			const api = createPortablePluginApi(ctx.get("connection"));
			ctx.inject(["pluginManager"], (inner) => {
				const manager = inner.get("pluginManager");
				inner.effect(() => connectBundledPlugins(manager, api), "Portable plugins in dsh-web management");
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map