import { createRequire } from "node:module";
import { registerRpc } from "@dsh-portable/connection-rpc";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readProfileManifest, resolveProfileDir, writeProfileManifest } from "@deepseek-ai/dsh-app-boot";
//#region lib/types/host/contract.js
/**
* The `/portable-plugins` channel contract. Types and endpoint names only, so
* the browser half can be typed against it without importing host code.
* @module @dsh-portable/plugin-manager/host/contract
*/
/** Connection RPC channel this plugin claims. */
const PORTABLE_PLUGINS_CHANNEL = "/portable-plugins";
/** Every endpoint of the channel. */
const PORTABLE_PLUGIN_ENDPOINTS = ["list", "set-enabled"];
/**
* Narrow an endpoint name arriving off the wire.
* @param value - the endpoint the caller asked for.
* @returns whether it is one this channel serves.
*/
function isPortablePluginEndpoint(value) {
	return PORTABLE_PLUGIN_ENDPOINTS.includes(value);
}
//#endregion
//#region lib/types/host/registry.js
/** Built-in feature inventory. Preferences describe pending state; standard
* profile bundles and cordis.patch.yml own actual activation after restart. */
/** Package-name prefix every built-in feature of this distribution carries. */
const PORTABLE_SCOPE = "@dsh-portable/";
/**
* Read the recorded preferences out of a profile manifest.
*
* Anything that is not a plain object of booleans is treated as absent: a
* hand-edited manifest must not be able to make the settings tab throw.
* @param manifest - the parsed web profile manifest.
* @returns the preference map, empty when none is recorded.
*/
function portablePreferences(manifest) {
	const raw = (manifest?.dsh?.profile)?.portablePlugins;
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
	const preferences = {};
	for (const [name, value] of Object.entries(raw)) if (typeof value === "boolean") preferences[name] = value;
	return preferences;
}
/**
* Project the Loader's portable rows into the settings tab's shape.
* @param entries - every Loader entry, in Loader order.
* @param preferences - the recorded preferences.
* @param facts - package manifest lookup; a miss yields nulls, never a throw.
* @returns one row per built-in feature, sorted by package name.
*/
function composeRows(entries, preferences, facts) {
	const rows = [];
	for (const entry of entries) {
		if (!entry.name.startsWith("@dsh-portable/") || entry.name.split("/").length !== 2 || entry.id === "desktop-bridge" || entry.id === "plugin-manager" || entry.name === "@dsh-portable/runtime") continue;
		const enabled = !entry.disabled;
		const preference = preferences[entry.name];
		const fact = facts(entry.name);
		rows.push({
			id: entry.id,
			name: entry.name,
			version: fact?.version ?? null,
			description: fact?.description ?? null,
			enabled,
			...preference !== void 0 && preference !== enabled ? { pending: preference } : {}
		});
	}
	return rows.sort((left, right) => left.name.localeCompare(right.name));
}
/**
* The preference map after one toggle.
*
* The entry is written even when it matches the live state, because "on" and
* "no preference recorded" are different facts: the second one follows whatever
* the shipped default becomes in a later release, and an operator who pressed
* the switch meant to pin it.
* @param preferences - the current map.
* @param name - package name being switched.
* @param enabled - the requested state.
* @returns the map to persist.
*/
function nextPreferences(preferences, name, enabled) {
	return {
		...preferences,
		[name]: enabled
	};
}
/**
* The answer one toggle reports.
* @param row - the row as it stood before the write.
* @param enabled - the requested state.
* @returns the toggle outcome.
*/
function toggleOutcome(row, enabled) {
	return {
		name: row.name,
		enabled,
		changed: (row.pending ?? row.enabled) !== enabled,
		requiresRestart: row.enabled !== enabled
	};
}
//#endregion
//#region lib/types/host/rpc.js
/**
* The `/portable-plugins` endpoint bodies.
*
* Everything that touches the filesystem or the Loader lives here; the pure
* folds it composes are in `./registry.ts`, which is what the tests exercise.
* @module @dsh-portable/plugin-manager/host/rpc
*/
/** Bin name used in the profile reader's diagnostics. */
const BIN_NAME = "plugin-manager";
/** The profile the browser surface runs in; the only one with portable rows. */
const PROFILE_NAME = "web";
const FEATURE_BUNDLES = /* @__PURE__ */ new Set([
	"@dsh-portable/dcode-ui",
	"@dsh-portable/cluster-ui",
	"@dsh-portable/interactive-learning"
]);
const REQUIREMENTS = { "@dsh-portable/dcode-ui": ["@dsh-portable/ui-mode", "@dsh-portable/session-manager"] };
function failure(code, message, details = {}) {
	return {
		ok: false,
		error: {
			code,
			message,
			details
		}
	};
}
/** Read the Loader's rows through the narrow view {@link composeRows} wants. */
function loaderRows(loader) {
	const rows = [];
	for (const entry of loader.entries()) {
		const name = entry.options.name;
		if (typeof name !== "string") continue;
		rows.push({
			id: entry.options.id ?? entry.id,
			name,
			disabled: entry.disabled
		});
	}
	return rows;
}
/**
* Resolve one package's displayed facts through Node's own resolution.
*
* The portable packages are dependencies of the runtime and each exports its
* own `package.json`, so this needs no knowledge of where the installation put
* them. A package that cannot be resolved simply shows without a version.
* @param anchor - a module URL inside the installation to resolve from.
* @returns the lookup.
*/
function packageFactsFrom(anchor) {
	const require = createRequire(anchor);
	return (name) => {
		try {
			return require(`${name}/package.json`);
		} catch {
			return;
		}
	};
}
/** Build the default host dependencies. */
function defaultDeps(loader, anchor) {
	return {
		loader,
		profileDir: resolveProfileDir(PROFILE_NAME),
		facts: packageFactsFrom(anchor)
	};
}
/** `list`: every built-in feature with its live and recorded state. */
function listPortablePlugins(deps) {
	try {
		const manifest = readProfileManifest(BIN_NAME, deps.profileDir);
		return {
			ok: true,
			value: { plugins: composeRows(loaderRows(deps.loader), portablePreferences(manifest), deps.facts) }
		};
	} catch (cause) {
		return failure("unavailable", cause instanceof Error ? cause.message : String(cause));
	}
}
/**
* `set-enabled`: record the preference the next launch will adopt.
* @param deps - host dependencies.
* @param payload - the requested `{ name, enabled }`.
* @returns the toggle outcome, or a refusal.
*/
function setPortablePluginEnabled(deps, payload) {
	const request = payload;
	const name = typeof request?.name === "string" ? request.name : "";
	const enabled = request?.enabled;
	if (name === "" || typeof enabled !== "boolean") return failure("bad-request", "set-enabled needs a package name and a boolean", { name });
	let manifest;
	let rows;
	try {
		manifest = readProfileManifest(BIN_NAME, deps.profileDir);
		rows = composeRows(loaderRows(deps.loader), portablePreferences(manifest), deps.facts);
	} catch (cause) {
		return failure("unavailable", cause instanceof Error ? cause.message : String(cause));
	}
	const row = rows.find((candidate) => candidate.name === name);
	if (row === void 0) return failure("not-builtin", `${name} is not a built-in feature of this build`, { name });
	try {
		let preferences = nextPreferences(portablePreferences(manifest), name, enabled);
		if (enabled) for (const dependency of REQUIREMENTS[name] ?? []) preferences = nextPreferences(preferences, dependency, true);
		else for (const [dependent, dependencies] of Object.entries(REQUIREMENTS)) if (dependencies.includes(name)) preferences = nextPreferences(preferences, dependent, false);
		const bundles = new Set(manifest.dsh?.profile?.bundles ?? []);
		for (const bundle of FEATURE_BUNDLES) {
			if (preferences[bundle] === true) bundles.add(bundle);
			if (preferences[bundle] === false) bundles.delete(bundle);
		}
		const patchPath = join(deps.profileDir, "cordis.patch.yml");
		const start = "# BEGIN portable-plugin-manager";
		const end = "# END portable-plugin-manager";
		let source = existsSync(patchPath) ? readFileSync(patchPath, "utf8") : "";
		const marker = source.indexOf(start);
		if (marker >= 0) {
			const finish = source.indexOf(end, marker);
			if (finish < 0) throw new Error("portable plugin configuration has an unfinished managed block");
			source = source.slice(0, marker) + source.slice(finish + 29);
		}
		if (source.replace(/^\s*#.*$/gm, "").trim() === "[]") source = source.replace(/^\s*\[\]\s*$/m, "");
		const patches = rows.filter((item) => preferences[item.name] !== void 0).map((item) => `- id: ${JSON.stringify(item.id)}\n  disabled: ${!preferences[item.name]}`);
		writeFileSync(patchPath, `${source.trimEnd()}\n${start}\n${patches.join("\n")}\n${end}\n`);
		writeProfileManifest(deps.profileDir, {
			...manifest,
			dsh: {
				...manifest.dsh,
				profile: {
					...manifest.dsh?.profile,
					bundles: [...bundles],
					portablePlugins: preferences
				}
			}
		});
	} catch (cause) {
		return failure("write-failed", cause instanceof Error ? cause.message : String(cause), { name });
	}
	return {
		ok: true,
		value: toggleOutcome(row, enabled)
	};
}
/**
* Route one endpoint of the channel.
* @param endpoint - the endpoint name, already narrowed by the caller.
* @param payload - the caller's payload.
* @param deps - host dependencies.
* @returns the answer envelope.
*/
function handlePortablePluginEndpoint(endpoint, payload, deps) {
	return endpoint === "list" ? listPortablePlugins(deps) : setPortablePluginEnabled(deps, payload);
}
//#endregion
//#region lib/types/index.js
/** Stable Cordis plugin name. */
const name = "plugin-manager";
/**
* Services this plugin cannot work without.
*
* `loader` is the roster itself and `connection` is the carrier the settings
* tab calls over; cordis holds the body until both publish, so the channel is
* never claimed against a half-built context.
*/
const inject = [
	"connection",
	"webServer",
	"loader"
];
/** The minimum RPC face this plugin needs off the Connection service. */
/**
* Claim the `/portable-plugins` channel.
* @param ctx - the injecting cordis context.
*/
function apply(ctx) {
	const loader = ctx.get("loader");
	if (loader === void 0) return;
	const deps = defaultDeps(loader, import.meta.url);
	ctx.effect(() => registerRpc(ctx, "portable-plugins", PORTABLE_PLUGIN_ENDPOINTS, (endpoint, payload) => Promise.resolve(isPortablePluginEndpoint(endpoint) ? handlePortablePluginEndpoint(endpoint, payload, deps) : {
		ok: false,
		error: {
			code: "bad-request",
			message: "unknown /portable-plugins RPC endpoint",
			details: { endpoint }
		}
	})), "plugin-manager: /portable-plugins channel");
}
//#endregion
export { PORTABLE_PLUGINS_CHANNEL, PORTABLE_PLUGIN_ENDPOINTS, PORTABLE_SCOPE, apply, composeRows, defaultDeps, handlePortablePluginEndpoint, inject, isPortablePluginEndpoint, listPortablePlugins, name, nextPreferences, packageFactsFrom, portablePreferences, setPortablePluginEnabled, toggleOutcome };
