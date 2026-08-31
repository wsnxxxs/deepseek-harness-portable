window.__ModuleLoader__.load({
	id: "@dsh-portable/crew-ui",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _dsh_portable_ui_mode_client = require("@dsh-portable/ui-mode/client");
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/core.js
		var _a$1;
		function $constructor(name, initializer, params) {
			function init(inst, def) {
				if (!inst._zod) Object.defineProperty(inst, "_zod", {
					value: {
						def,
						constr: _,
						traits: /* @__PURE__ */ new Set()
					},
					enumerable: false
				});
				if (inst._zod.traits.has(name)) return;
				inst._zod.traits.add(name);
				initializer(inst, def);
				const proto = _.prototype;
				const keys = Object.keys(proto);
				for (let i = 0; i < keys.length; i++) {
					const k = keys[i];
					if (!(k in inst)) inst[k] = proto[k].bind(inst);
				}
			}
			const Parent = params?.Parent ?? Object;
			class Definition extends Parent {}
			Object.defineProperty(Definition, "name", { value: name });
			function _(def) {
				var _a;
				const inst = params?.Parent ? new Definition() : this;
				init(inst, def);
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				for (const fn of inst._zod.deferred) fn();
				return inst;
			}
			Object.defineProperty(_, "init", { value: init });
			Object.defineProperty(_, Symbol.hasInstance, { value: (inst) => {
				if (params?.Parent && inst instanceof params.Parent) return true;
				return inst?._zod?.traits?.has(name);
			} });
			Object.defineProperty(_, "name", { value: name });
			return _;
		}
		var $ZodAsyncError = class extends Error {
			constructor() {
				super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
			}
		};
		var $ZodEncodeError = class extends Error {
			constructor(name) {
				super(`Encountered unidirectional transform during encode: ${name}`);
				this.name = "ZodEncodeError";
			}
		};
		(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
		const globalConfig = globalThis.__zod_globalConfig;
		function config(newConfig) {
			if (newConfig) Object.assign(globalConfig, newConfig);
			return globalConfig;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/util.js
		function getEnumValues(entries) {
			const numericValues = Object.values(entries).filter((v) => typeof v === "number");
			return Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
		}
		function jsonStringifyReplacer(_, value) {
			if (typeof value === "bigint") return value.toString();
			return value;
		}
		function cached(getter) {
			return { get value() {
				{
					const value = getter();
					Object.defineProperty(this, "value", { value });
					return value;
				}
			} };
		}
		function nullish(input) {
			return input === null || input === void 0;
		}
		function cleanRegex(source) {
			const start = source.startsWith("^") ? 1 : 0;
			const end = source.endsWith("$") ? source.length - 1 : source.length;
			return source.slice(start, end);
		}
		function floatSafeRemainder(val, step) {
			const ratio = val / step;
			const roundedRatio = Math.round(ratio);
			const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
			if (Math.abs(ratio - roundedRatio) < tolerance) return 0;
			return ratio - roundedRatio;
		}
		const EVALUATING = /* @__PURE__*/ Symbol("evaluating");
		function defineLazy(object, key, getter) {
			let value = void 0;
			Object.defineProperty(object, key, {
				get() {
					if (value === EVALUATING) return;
					if (value === void 0) {
						value = EVALUATING;
						value = getter();
					}
					return value;
				},
				set(v) {
					Object.defineProperty(object, key, { value: v });
				},
				configurable: true
			});
		}
		function assignProp(target, prop, value) {
			Object.defineProperty(target, prop, {
				value,
				writable: true,
				enumerable: true,
				configurable: true
			});
		}
		function mergeDefs(...defs) {
			const mergedDescriptors = {};
			for (const def of defs) {
				const descriptors = Object.getOwnPropertyDescriptors(def);
				Object.assign(mergedDescriptors, descriptors);
			}
			return Object.defineProperties({}, mergedDescriptors);
		}
		function esc(str) {
			return JSON.stringify(str);
		}
		function slugify(input) {
			return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
		}
		const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {};
		function isObject(data) {
			return typeof data === "object" && data !== null && !Array.isArray(data);
		}
		const allowsEval = /* @__PURE__*/ cached(() => {
			if (globalConfig.jitless) return false;
			if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) return false;
			try {
				new Function("");
				return true;
			} catch (_) {
				return false;
			}
		});
		function isPlainObject(o) {
			if (isObject(o) === false) return false;
			const ctor = o.constructor;
			if (ctor === void 0) return true;
			if (typeof ctor !== "function") return true;
			const prot = ctor.prototype;
			if (isObject(prot) === false) return false;
			if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) return false;
			return true;
		}
		function shallowClone(o) {
			if (isPlainObject(o)) return { ...o };
			if (Array.isArray(o)) return [...o];
			if (o instanceof Map) return new Map(o);
			if (o instanceof Set) return new Set(o);
			return o;
		}
		const propertyKeyTypes = /* @__PURE__*/ new Set([
			"string",
			"number",
			"symbol"
		]);
		function escapeRegex(str) {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}
		function clone(inst, def, params) {
			const cl = new inst._zod.constr(def ?? inst._zod.def);
			if (!def || params?.parent) cl._zod.parent = inst;
			return cl;
		}
		function normalizeParams(_params) {
			const params = _params;
			if (!params) return {};
			if (typeof params === "string") return { error: () => params };
			if (params?.message !== void 0) {
				if (params?.error !== void 0) throw new Error("Cannot specify both `message` and `error` params");
				params.error = params.message;
			}
			delete params.message;
			if (typeof params.error === "string") return {
				...params,
				error: () => params.error
			};
			return params;
		}
		function optionalKeys(shape) {
			return Object.keys(shape).filter((k) => {
				return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
			});
		}
		const NUMBER_FORMAT_RANGES = {
			safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
			int32: [-2147483648, 2147483647],
			uint32: [0, 4294967295],
			float32: [-34028234663852886e22, 34028234663852886e22],
			float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
		};
		function pick(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".pick() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = {};
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						newShape[key] = currDef.shape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function omit(schema, mask) {
			const currDef = schema._zod.def;
			const checks = currDef.checks;
			if (checks && checks.length > 0) throw new Error(".omit() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const newShape = { ...schema._zod.def.shape };
					for (const key in mask) {
						if (!(key in currDef.shape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						delete newShape[key];
					}
					assignProp(this, "shape", newShape);
					return newShape;
				},
				checks: []
			}));
		}
		function extend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to extend: expected a plain object");
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) {
				const existingShape = schema._zod.def.shape;
				for (const key in shape) if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
			}
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function safeExtend(schema, shape) {
			if (!isPlainObject(shape)) throw new Error("Invalid input to safeExtend: expected a plain object");
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const _shape = {
					...schema._zod.def.shape,
					...shape
				};
				assignProp(this, "shape", _shape);
				return _shape;
			} }));
		}
		function merge(a, b) {
			if (a._zod.def.checks?.length) throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
			return clone(a, mergeDefs(a._zod.def, {
				get shape() {
					const _shape = {
						...a._zod.def.shape,
						...b._zod.def.shape
					};
					assignProp(this, "shape", _shape);
					return _shape;
				},
				get catchall() {
					return b._zod.def.catchall;
				},
				checks: b._zod.def.checks ?? []
			}));
		}
		function partial(Class, schema, mask) {
			const checks = schema._zod.def.checks;
			if (checks && checks.length > 0) throw new Error(".partial() cannot be used on object schemas containing refinements");
			return clone(schema, mergeDefs(schema._zod.def, {
				get shape() {
					const oldShape = schema._zod.def.shape;
					const shape = { ...oldShape };
					if (mask) for (const key in mask) {
						if (!(key in oldShape)) throw new Error(`Unrecognized key: "${key}"`);
						if (!mask[key]) continue;
						shape[key] = Class ? new Class({
							type: "optional",
							innerType: oldShape[key]
						}) : oldShape[key];
					}
					else for (const key in oldShape) shape[key] = Class ? new Class({
						type: "optional",
						innerType: oldShape[key]
					}) : oldShape[key];
					assignProp(this, "shape", shape);
					return shape;
				},
				checks: []
			}));
		}
		function required(Class, schema, mask) {
			return clone(schema, mergeDefs(schema._zod.def, { get shape() {
				const oldShape = schema._zod.def.shape;
				const shape = { ...oldShape };
				if (mask) for (const key in mask) {
					if (!(key in shape)) throw new Error(`Unrecognized key: "${key}"`);
					if (!mask[key]) continue;
					shape[key] = new Class({
						type: "nonoptional",
						innerType: oldShape[key]
					});
				}
				else for (const key in oldShape) shape[key] = new Class({
					type: "nonoptional",
					innerType: oldShape[key]
				});
				assignProp(this, "shape", shape);
				return shape;
			} }));
		}
		function aborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue !== true) return true;
			return false;
		}
		function explicitlyAborted(x, startIndex = 0) {
			if (x.aborted === true) return true;
			for (let i = startIndex; i < x.issues.length; i++) if (x.issues[i]?.continue === false) return true;
			return false;
		}
		function prefixIssues(path, issues) {
			return issues.map((iss) => {
				var _a;
				(_a = iss).path ?? (_a.path = []);
				iss.path.unshift(path);
				return iss;
			});
		}
		function unwrapMessage(message) {
			return typeof message === "string" ? message : message?.message;
		}
		function finalizeIssue(iss, ctx, config) {
			const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config.customError?.(iss)) ?? unwrapMessage(config.localeError?.(iss)) ?? "Invalid input";
			const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
			rest.path ?? (rest.path = []);
			rest.message = message;
			if (ctx?.reportInput) rest.input = _input;
			return rest;
		}
		function getLengthableOrigin(input) {
			if (Array.isArray(input)) return "array";
			if (typeof input === "string") return "string";
			return "unknown";
		}
		function issue(...args) {
			const [iss, input, inst] = args;
			if (typeof iss === "string") return {
				message: iss,
				code: "custom",
				input,
				inst
			};
			return { ...iss };
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/errors.js
		const initializer$1 = (inst, def) => {
			inst.name = "$ZodError";
			Object.defineProperty(inst, "_zod", {
				value: inst._zod,
				enumerable: false
			});
			Object.defineProperty(inst, "issues", {
				value: def,
				enumerable: false
			});
			inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
			Object.defineProperty(inst, "toString", {
				value: () => inst.message,
				enumerable: false
			});
		};
		const $ZodError = $constructor("$ZodError", initializer$1);
		const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
		function flattenError(error, mapper = (issue) => issue.message) {
			const fieldErrors = {};
			const formErrors = [];
			for (const sub of error.issues) if (sub.path.length > 0) {
				fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
				fieldErrors[sub.path[0]].push(mapper(sub));
			} else formErrors.push(mapper(sub));
			return {
				formErrors,
				fieldErrors
			};
		}
		function formatError(error, mapper = (issue) => issue.message) {
			const fieldErrors = { _errors: [] };
			const processError = (error, path = []) => {
				for (const issue of error.issues) if (issue.code === "invalid_union" && issue.errors.length) issue.errors.map((issues) => processError({ issues }, [...path, ...issue.path]));
				else if (issue.code === "invalid_key") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else if (issue.code === "invalid_element") processError({ issues: issue.issues }, [...path, ...issue.path]);
				else {
					const fullpath = [...path, ...issue.path];
					if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
					else {
						let curr = fieldErrors;
						let i = 0;
						while (i < fullpath.length) {
							const el = fullpath[i];
							if (!(i === fullpath.length - 1)) curr[el] = curr[el] || { _errors: [] };
							else {
								curr[el] = curr[el] || { _errors: [] };
								curr[el]._errors.push(mapper(issue));
							}
							curr = curr[el];
							i++;
						}
					}
				}
			};
			processError(error);
			return fieldErrors;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/parse.js
		const _parse = (_Err) => (schema, value, _ctx, _params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			if (result.issues.length) {
				const e = new ((_params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, _params?.callee);
				throw e;
			}
			return result.value;
		};
		const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			if (result.issues.length) {
				const e = new ((params?.Err) ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
				captureStackTrace(e, params?.callee);
				throw e;
			}
			return result.value;
		};
		const _safeParse = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: false
			} : { async: false };
			const result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) throw new $ZodAsyncError();
			return result.issues.length ? {
				success: false,
				error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParse$1 = /* @__PURE__*/ _safeParse($ZodRealError);
		const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				async: true
			} : { async: true };
			let result = schema._zod.run({
				value,
				issues: []
			}, ctx);
			if (result instanceof Promise) result = await result;
			return result.issues.length ? {
				success: false,
				error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			} : {
				success: true,
				data: result.value
			};
		};
		const safeParseAsync$1 = /* @__PURE__*/ _safeParseAsync($ZodRealError);
		const _encode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parse(_Err)(schema, value, ctx);
		};
		const _decode = (_Err) => (schema, value, _ctx) => {
			return _parse(_Err)(schema, value, _ctx);
		};
		const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _parseAsync(_Err)(schema, value, ctx);
		};
		const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _parseAsync(_Err)(schema, value, _ctx);
		};
		const _safeEncode = (_Err) => (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParse(_Err)(schema, value, ctx);
		};
		const _safeDecode = (_Err) => (schema, value, _ctx) => {
			return _safeParse(_Err)(schema, value, _ctx);
		};
		const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
			const ctx = _ctx ? {
				..._ctx,
				direction: "backward"
			} : { direction: "backward" };
			return _safeParseAsync(_Err)(schema, value, ctx);
		};
		const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
			return _safeParseAsync(_Err)(schema, value, _ctx);
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/regexes.js
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const cuid = /^[cC][0-9a-z]{6,}$/;
		const cuid2 = /^[0-9a-z]+$/;
		const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
		const xid = /^[0-9a-vA-V]{20}$/;
		const ksuid = /^[A-Za-z0-9]{27}$/;
		const nanoid = /^[a-zA-Z0-9_-]{21}$/;
		/** ISO 8601-1 duration regex. Does not support the 8601-2 extensions like negative durations or fractional/negative components. */
		const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
		/** A regex for any UUID-like identifier: 8-4-4-4-12 hex pattern */
		const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
		/** Returns a regex for validating an RFC 9562/4122 UUID.
		*
		* @param version Optionally specify a version 1-8. If no version is specified, all versions are supported. */
		const uuid = (version) => {
			if (!version) return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
			return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
		};
		/** Practical email validation */
		const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
		const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
		function emoji() {
			return new RegExp(_emoji$1, "u");
		}
		const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
		const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
		const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
		const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
		const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
		const base64url = /^[A-Za-z0-9_-]*$/;
		const httpProtocol = /^https?$/;
		const e164 = /^\+[1-9]\d{6,14}$/;
		const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
		const date$1 = /*@__PURE__*/ new RegExp(`^${dateSource}$`);
		function timeSource(args) {
			const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
			return typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
		}
		function time$1(args) {
			return new RegExp(`^${timeSource(args)}$`);
		}
		function datetime$1(args) {
			const time = timeSource({ precision: args.precision });
			const opts = ["Z"];
			if (args.local) opts.push("");
			if (args.offset) opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
			const timeRegex = `${time}(?:${opts.join("|")})`;
			return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
		}
		const string$1 = (params) => {
			const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
			return new RegExp(`^${regex}$`);
		};
		const integer = /^-?\d+$/;
		const number$1 = /^-?\d+(?:\.\d+)?$/;
		const boolean$1 = /^(?:true|false)$/i;
		const lowercase = /^[^A-Z]*$/;
		const uppercase = /^[^a-z]*$/;
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/checks.js
		const $ZodCheck = /*@__PURE__*/ $constructor("$ZodCheck", (inst, def) => {
			var _a;
			inst._zod ?? (inst._zod = {});
			inst._zod.def = def;
			(_a = inst._zod).onattach ?? (_a.onattach = []);
		});
		const numericOriginMap = {
			number: "number",
			bigint: "bigint",
			object: "date"
		};
		const $ZodCheckLessThan = /*@__PURE__*/ $constructor("$ZodCheckLessThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
				if (def.value < curr) {
					if (def.inclusive) bag.maximum = def.value;
					else bag.exclusiveMaximum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value <= def.value : payload.value < def.value) return;
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckGreaterThan = /*@__PURE__*/ $constructor("$ZodCheckGreaterThan", (inst, def) => {
			$ZodCheck.init(inst, def);
			const origin = numericOriginMap[typeof def.value];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
				if (def.value > curr) {
					if (def.inclusive) bag.minimum = def.value;
					else bag.exclusiveMinimum = def.value;
				}
			});
			inst._zod.check = (payload) => {
				if (def.inclusive ? payload.value >= def.value : payload.value > def.value) return;
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
					input: payload.value,
					inclusive: def.inclusive,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMultipleOf = /*@__PURE__*/ $constructor("$ZodCheckMultipleOf", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				var _a;
				(_a = inst._zod.bag).multipleOf ?? (_a.multipleOf = def.value);
			});
			inst._zod.check = (payload) => {
				if (typeof payload.value !== typeof def.value) throw new Error("Cannot mix number and bigint in multiple_of check.");
				if (typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0) return;
				payload.issues.push({
					origin: typeof payload.value,
					code: "not_multiple_of",
					divisor: def.value,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckNumberFormat = /*@__PURE__*/ $constructor("$ZodCheckNumberFormat", (inst, def) => {
			$ZodCheck.init(inst, def);
			def.format = def.format || "float64";
			const isInt = def.format?.includes("int");
			const origin = isInt ? "int" : "number";
			const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				bag.minimum = minimum;
				bag.maximum = maximum;
				if (isInt) bag.pattern = integer;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (isInt) {
					if (!Number.isInteger(input)) {
						payload.issues.push({
							expected: origin,
							format: def.format,
							code: "invalid_type",
							continue: false,
							input,
							inst
						});
						return;
					}
					if (!Number.isSafeInteger(input)) {
						if (input > 0) payload.issues.push({
							input,
							code: "too_big",
							maximum: Number.MAX_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						else payload.issues.push({
							input,
							code: "too_small",
							minimum: Number.MIN_SAFE_INTEGER,
							note: "Integers must be within the safe integer range.",
							inst,
							origin,
							inclusive: true,
							continue: !def.abort
						});
						return;
					}
				}
				if (input < minimum) payload.issues.push({
					origin: "number",
					input,
					code: "too_small",
					minimum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
				if (input > maximum) payload.issues.push({
					origin: "number",
					input,
					code: "too_big",
					maximum,
					inclusive: true,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMaxLength = /*@__PURE__*/ $constructor("$ZodCheckMaxLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
				if (def.maximum < curr) inst._zod.bag.maximum = def.maximum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length <= def.maximum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_big",
					maximum: def.maximum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckMinLength = /*@__PURE__*/ $constructor("$ZodCheckMinLength", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const curr = inst._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
				if (def.minimum > curr) inst._zod.bag.minimum = def.minimum;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				if (input.length >= def.minimum) return;
				const origin = getLengthableOrigin(input);
				payload.issues.push({
					origin,
					code: "too_small",
					minimum: def.minimum,
					inclusive: true,
					input,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLengthEquals = /*@__PURE__*/ $constructor("$ZodCheckLengthEquals", (inst, def) => {
			var _a;
			$ZodCheck.init(inst, def);
			(_a = inst._zod.def).when ?? (_a.when = (payload) => {
				const val = payload.value;
				return !nullish(val) && val.length !== void 0;
			});
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.minimum = def.length;
				bag.maximum = def.length;
				bag.length = def.length;
			});
			inst._zod.check = (payload) => {
				const input = payload.value;
				const length = input.length;
				if (length === def.length) return;
				const origin = getLengthableOrigin(input);
				const tooBig = length > def.length;
				payload.issues.push({
					origin,
					...tooBig ? {
						code: "too_big",
						maximum: def.length
					} : {
						code: "too_small",
						minimum: def.length
					},
					inclusive: true,
					exact: true,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStringFormat = /*@__PURE__*/ $constructor("$ZodCheckStringFormat", (inst, def) => {
			var _a, _b;
			$ZodCheck.init(inst, def);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.format = def.format;
				if (def.pattern) {
					bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
					bag.patterns.add(def.pattern);
				}
			});
			if (def.pattern) (_a = inst._zod).check ?? (_a.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: def.format,
					input: payload.value,
					...def.pattern ? { pattern: def.pattern.toString() } : {},
					inst,
					continue: !def.abort
				});
			});
			else (_b = inst._zod).check ?? (_b.check = () => {});
		});
		const $ZodCheckRegex = /*@__PURE__*/ $constructor("$ZodCheckRegex", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				def.pattern.lastIndex = 0;
				if (def.pattern.test(payload.value)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "regex",
					input: payload.value,
					pattern: def.pattern.toString(),
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckLowerCase = /*@__PURE__*/ $constructor("$ZodCheckLowerCase", (inst, def) => {
			def.pattern ?? (def.pattern = lowercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckUpperCase = /*@__PURE__*/ $constructor("$ZodCheckUpperCase", (inst, def) => {
			def.pattern ?? (def.pattern = uppercase);
			$ZodCheckStringFormat.init(inst, def);
		});
		const $ZodCheckIncludes = /*@__PURE__*/ $constructor("$ZodCheckIncludes", (inst, def) => {
			$ZodCheck.init(inst, def);
			const escapedRegex = escapeRegex(def.includes);
			const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
			def.pattern = pattern;
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.includes(def.includes, def.position)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "includes",
					includes: def.includes,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckStartsWith = /*@__PURE__*/ $constructor("$ZodCheckStartsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.startsWith(def.prefix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "starts_with",
					prefix: def.prefix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckEndsWith = /*@__PURE__*/ $constructor("$ZodCheckEndsWith", (inst, def) => {
			$ZodCheck.init(inst, def);
			const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
			def.pattern ?? (def.pattern = pattern);
			inst._zod.onattach.push((inst) => {
				const bag = inst._zod.bag;
				bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
				bag.patterns.add(pattern);
			});
			inst._zod.check = (payload) => {
				if (payload.value.endsWith(def.suffix)) return;
				payload.issues.push({
					origin: "string",
					code: "invalid_format",
					format: "ends_with",
					suffix: def.suffix,
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodCheckOverwrite = /*@__PURE__*/ $constructor("$ZodCheckOverwrite", (inst, def) => {
			$ZodCheck.init(inst, def);
			inst._zod.check = (payload) => {
				payload.value = def.tx(payload.value);
			};
		});
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/doc.js
		var Doc = class {
			constructor(args = []) {
				this.content = [];
				this.indent = 0;
				if (this) this.args = args;
			}
			indented(fn) {
				this.indent += 1;
				fn(this);
				this.indent -= 1;
			}
			write(arg) {
				if (typeof arg === "function") {
					arg(this, { execution: "sync" });
					arg(this, { execution: "async" });
					return;
				}
				const lines = arg.split("\n").filter((x) => x);
				const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
				const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
				for (const line of dedented) this.content.push(line);
			}
			compile() {
				const F = Function;
				const args = this?.args;
				const lines = [...(this?.content ?? [``]).map((x) => `  ${x}`)];
				return new F(...args, lines.join("\n"));
			}
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/versions.js
		const version = {
			major: 4,
			minor: 4,
			patch: 3
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/schemas.js
		const $ZodType = /*@__PURE__*/ $constructor("$ZodType", (inst, def) => {
			var _a;
			inst ?? (inst = {});
			inst._zod.def = def;
			inst._zod.bag = inst._zod.bag || {};
			inst._zod.version = version;
			const checks = [...inst._zod.def.checks ?? []];
			if (inst._zod.traits.has("$ZodCheck")) checks.unshift(inst);
			for (const ch of checks) for (const fn of ch._zod.onattach) fn(inst);
			if (checks.length === 0) {
				(_a = inst._zod).deferred ?? (_a.deferred = []);
				inst._zod.deferred?.push(() => {
					inst._zod.run = inst._zod.parse;
				});
			} else {
				const runChecks = (payload, checks, ctx) => {
					let isAborted = aborted(payload);
					let asyncResult;
					for (const ch of checks) {
						if (ch._zod.def.when) {
							if (explicitlyAborted(payload)) continue;
							if (!ch._zod.def.when(payload)) continue;
						} else if (isAborted) continue;
						const currLen = payload.issues.length;
						const _ = ch._zod.check(payload);
						if (_ instanceof Promise && ctx?.async === false) throw new $ZodAsyncError();
						if (asyncResult || _ instanceof Promise) asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
							await _;
							if (payload.issues.length === currLen) return;
							if (!isAborted) isAborted = aborted(payload, currLen);
						});
						else {
							if (payload.issues.length === currLen) continue;
							if (!isAborted) isAborted = aborted(payload, currLen);
						}
					}
					if (asyncResult) return asyncResult.then(() => {
						return payload;
					});
					return payload;
				};
				const handleCanaryResult = (canary, payload, ctx) => {
					if (aborted(canary)) {
						canary.aborted = true;
						return canary;
					}
					const checkResult = runChecks(payload, checks, ctx);
					if (checkResult instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return checkResult.then((checkResult) => inst._zod.parse(checkResult, ctx));
					}
					return inst._zod.parse(checkResult, ctx);
				};
				inst._zod.run = (payload, ctx) => {
					if (ctx.skipChecks) return inst._zod.parse(payload, ctx);
					if (ctx.direction === "backward") {
						const canary = inst._zod.parse({
							value: payload.value,
							issues: []
						}, {
							...ctx,
							skipChecks: true
						});
						if (canary instanceof Promise) return canary.then((canary) => {
							return handleCanaryResult(canary, payload, ctx);
						});
						return handleCanaryResult(canary, payload, ctx);
					}
					const result = inst._zod.parse(payload, ctx);
					if (result instanceof Promise) {
						if (ctx.async === false) throw new $ZodAsyncError();
						return result.then((result) => runChecks(result, checks, ctx));
					}
					return runChecks(result, checks, ctx);
				};
			}
			defineLazy(inst, "~standard", () => ({
				validate: (value) => {
					try {
						const r = safeParse$1(inst, value);
						return r.success ? { value: r.data } : { issues: r.error?.issues };
					} catch (_) {
						return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
					}
				},
				vendor: "zod",
				version: 1
			}));
		});
		const $ZodString = /*@__PURE__*/ $constructor("$ZodString", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
			inst._zod.parse = (payload, _) => {
				if (def.coerce) try {
					payload.value = String(payload.value);
				} catch (_) {}
				if (typeof payload.value === "string") return payload;
				payload.issues.push({
					expected: "string",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		const $ZodStringFormat = /*@__PURE__*/ $constructor("$ZodStringFormat", (inst, def) => {
			$ZodCheckStringFormat.init(inst, def);
			$ZodString.init(inst, def);
		});
		const $ZodGUID = /*@__PURE__*/ $constructor("$ZodGUID", (inst, def) => {
			def.pattern ?? (def.pattern = guid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodUUID = /*@__PURE__*/ $constructor("$ZodUUID", (inst, def) => {
			if (def.version) {
				const v = {
					v1: 1,
					v2: 2,
					v3: 3,
					v4: 4,
					v5: 5,
					v6: 6,
					v7: 7,
					v8: 8
				}[def.version];
				if (v === void 0) throw new Error(`Invalid UUID version: "${def.version}"`);
				def.pattern ?? (def.pattern = uuid(v));
			} else def.pattern ?? (def.pattern = uuid());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodEmail = /*@__PURE__*/ $constructor("$ZodEmail", (inst, def) => {
			def.pattern ?? (def.pattern = email);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodURL = /*@__PURE__*/ $constructor("$ZodURL", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				try {
					const trimmed = payload.value.trim();
					if (!def.normalize && def.protocol?.source === httpProtocol.source) {
						if (!/^https?:\/\//i.test(trimmed)) {
							payload.issues.push({
								code: "invalid_format",
								format: "url",
								note: "Invalid URL format",
								input: payload.value,
								inst,
								continue: !def.abort
							});
							return;
						}
					}
					const url = new URL(trimmed);
					if (def.hostname) {
						def.hostname.lastIndex = 0;
						if (!def.hostname.test(url.hostname)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid hostname",
							pattern: def.hostname.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.protocol) {
						def.protocol.lastIndex = 0;
						if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) payload.issues.push({
							code: "invalid_format",
							format: "url",
							note: "Invalid protocol",
							pattern: def.protocol.source,
							input: payload.value,
							inst,
							continue: !def.abort
						});
					}
					if (def.normalize) payload.value = url.href;
					else payload.value = trimmed;
					return;
				} catch (_) {
					payload.issues.push({
						code: "invalid_format",
						format: "url",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodEmoji = /*@__PURE__*/ $constructor("$ZodEmoji", (inst, def) => {
			def.pattern ?? (def.pattern = emoji());
			$ZodStringFormat.init(inst, def);
		});
		const $ZodNanoID = /*@__PURE__*/ $constructor("$ZodNanoID", (inst, def) => {
			def.pattern ?? (def.pattern = nanoid);
			$ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link $ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const $ZodCUID = /*@__PURE__*/ $constructor("$ZodCUID", (inst, def) => {
			def.pattern ?? (def.pattern = cuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCUID2 = /*@__PURE__*/ $constructor("$ZodCUID2", (inst, def) => {
			def.pattern ?? (def.pattern = cuid2);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodULID = /*@__PURE__*/ $constructor("$ZodULID", (inst, def) => {
			def.pattern ?? (def.pattern = ulid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodXID = /*@__PURE__*/ $constructor("$ZodXID", (inst, def) => {
			def.pattern ?? (def.pattern = xid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodKSUID = /*@__PURE__*/ $constructor("$ZodKSUID", (inst, def) => {
			def.pattern ?? (def.pattern = ksuid);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODateTime = /*@__PURE__*/ $constructor("$ZodISODateTime", (inst, def) => {
			def.pattern ?? (def.pattern = datetime$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODate = /*@__PURE__*/ $constructor("$ZodISODate", (inst, def) => {
			def.pattern ?? (def.pattern = date$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISOTime = /*@__PURE__*/ $constructor("$ZodISOTime", (inst, def) => {
			def.pattern ?? (def.pattern = time$1(def));
			$ZodStringFormat.init(inst, def);
		});
		const $ZodISODuration = /*@__PURE__*/ $constructor("$ZodISODuration", (inst, def) => {
			def.pattern ?? (def.pattern = duration$1);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodIPv4 = /*@__PURE__*/ $constructor("$ZodIPv4", (inst, def) => {
			def.pattern ?? (def.pattern = ipv4);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv4`;
		});
		const $ZodIPv6 = /*@__PURE__*/ $constructor("$ZodIPv6", (inst, def) => {
			def.pattern ?? (def.pattern = ipv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.format = `ipv6`;
			inst._zod.check = (payload) => {
				try {
					new URL(`http://[${payload.value}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "ipv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		const $ZodCIDRv4 = /*@__PURE__*/ $constructor("$ZodCIDRv4", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv4);
			$ZodStringFormat.init(inst, def);
		});
		const $ZodCIDRv6 = /*@__PURE__*/ $constructor("$ZodCIDRv6", (inst, def) => {
			def.pattern ?? (def.pattern = cidrv6);
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				const parts = payload.value.split("/");
				try {
					if (parts.length !== 2) throw new Error();
					const [address, prefix] = parts;
					if (!prefix) throw new Error();
					const prefixNum = Number(prefix);
					if (`${prefixNum}` !== prefix) throw new Error();
					if (prefixNum < 0 || prefixNum > 128) throw new Error();
					new URL(`http://[${address}]`);
				} catch {
					payload.issues.push({
						code: "invalid_format",
						format: "cidrv6",
						input: payload.value,
						inst,
						continue: !def.abort
					});
				}
			};
		});
		function isValidBase64(data) {
			if (data === "") return true;
			if (/\s/.test(data)) return false;
			if (data.length % 4 !== 0) return false;
			try {
				atob(data);
				return true;
			} catch {
				return false;
			}
		}
		const $ZodBase64 = /*@__PURE__*/ $constructor("$ZodBase64", (inst, def) => {
			def.pattern ?? (def.pattern = base64);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64";
			inst._zod.check = (payload) => {
				if (isValidBase64(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		function isValidBase64URL(data) {
			if (!base64url.test(data)) return false;
			const base64 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
			return isValidBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
		}
		const $ZodBase64URL = /*@__PURE__*/ $constructor("$ZodBase64URL", (inst, def) => {
			def.pattern ?? (def.pattern = base64url);
			$ZodStringFormat.init(inst, def);
			inst._zod.bag.contentEncoding = "base64url";
			inst._zod.check = (payload) => {
				if (isValidBase64URL(payload.value)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "base64url",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodE164 = /*@__PURE__*/ $constructor("$ZodE164", (inst, def) => {
			def.pattern ?? (def.pattern = e164);
			$ZodStringFormat.init(inst, def);
		});
		function isValidJWT(token, algorithm = null) {
			try {
				const tokensParts = token.split(".");
				if (tokensParts.length !== 3) return false;
				const [header] = tokensParts;
				if (!header) return false;
				const parsedHeader = JSON.parse(atob(header));
				if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT") return false;
				if (!parsedHeader.alg) return false;
				if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm)) return false;
				return true;
			} catch {
				return false;
			}
		}
		const $ZodJWT = /*@__PURE__*/ $constructor("$ZodJWT", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			inst._zod.check = (payload) => {
				if (isValidJWT(payload.value, def.alg)) return;
				payload.issues.push({
					code: "invalid_format",
					format: "jwt",
					input: payload.value,
					inst,
					continue: !def.abort
				});
			};
		});
		const $ZodNumber = /*@__PURE__*/ $constructor("$ZodNumber", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Number(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) return payload;
				const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
				payload.issues.push({
					expected: "number",
					code: "invalid_type",
					input,
					inst,
					...received ? { received } : {}
				});
				return payload;
			};
		});
		const $ZodNumberFormat = /*@__PURE__*/ $constructor("$ZodNumberFormat", (inst, def) => {
			$ZodCheckNumberFormat.init(inst, def);
			$ZodNumber.init(inst, def);
		});
		const $ZodBoolean = /*@__PURE__*/ $constructor("$ZodBoolean", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.pattern = boolean$1;
			inst._zod.parse = (payload, _ctx) => {
				if (def.coerce) try {
					payload.value = Boolean(payload.value);
				} catch (_) {}
				const input = payload.value;
				if (typeof input === "boolean") return payload;
				payload.issues.push({
					expected: "boolean",
					code: "invalid_type",
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodUnknown = /*@__PURE__*/ $constructor("$ZodUnknown", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload) => payload;
		});
		const $ZodNever = /*@__PURE__*/ $constructor("$ZodNever", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _ctx) => {
				payload.issues.push({
					expected: "never",
					code: "invalid_type",
					input: payload.value,
					inst
				});
				return payload;
			};
		});
		function handleArrayResult(result, final, index) {
			if (result.issues.length) final.issues.push(...prefixIssues(index, result.issues));
			final.value[index] = result.value;
		}
		const $ZodArray = /*@__PURE__*/ $constructor("$ZodArray", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				if (!Array.isArray(input)) {
					payload.issues.push({
						expected: "array",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = Array(input.length);
				const proms = [];
				for (let i = 0; i < input.length; i++) {
					const item = input[i];
					const result = def.element._zod.run({
						value: item,
						issues: []
					}, ctx);
					if (result instanceof Promise) proms.push(result.then((result) => handleArrayResult(result, payload, i)));
					else handleArrayResult(result, payload, i);
				}
				if (proms.length) return Promise.all(proms).then(() => payload);
				return payload;
			};
		});
		function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
			const isPresent = key in input;
			if (result.issues.length) {
				if (isOptionalIn && isOptionalOut && !isPresent) return;
				final.issues.push(...prefixIssues(key, result.issues));
			}
			if (!isPresent && !isOptionalIn) {
				if (!result.issues.length) final.issues.push({
					code: "invalid_type",
					expected: "nonoptional",
					input: void 0,
					path: [key]
				});
				return;
			}
			if (result.value === void 0) {
				if (isPresent) final.value[key] = void 0;
			} else final.value[key] = result.value;
		}
		function normalizeDef(def) {
			const keys = Object.keys(def.shape);
			for (const k of keys) if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
			const okeys = optionalKeys(def.shape);
			return {
				...def,
				keys,
				keySet: new Set(keys),
				numKeys: keys.length,
				optionalKeys: new Set(okeys)
			};
		}
		function handleCatchall(proms, input, payload, ctx, def, inst) {
			const unrecognized = [];
			const keySet = def.keySet;
			const _catchall = def.catchall._zod;
			const t = _catchall.def.type;
			const isOptionalIn = _catchall.optin === "optional";
			const isOptionalOut = _catchall.optout === "optional";
			for (const key in input) {
				if (key === "__proto__") continue;
				if (keySet.has(key)) continue;
				if (t === "never") {
					unrecognized.push(key);
					continue;
				}
				const r = _catchall.run({
					value: input[key],
					issues: []
				}, ctx);
				if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
				else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
			}
			if (unrecognized.length) payload.issues.push({
				code: "unrecognized_keys",
				keys: unrecognized,
				input,
				inst
			});
			if (!proms.length) return payload;
			return Promise.all(proms).then(() => {
				return payload;
			});
		}
		const $ZodObject = /*@__PURE__*/ $constructor("$ZodObject", (inst, def) => {
			$ZodType.init(inst, def);
			if (!Object.getOwnPropertyDescriptor(def, "shape")?.get) {
				const sh = def.shape;
				Object.defineProperty(def, "shape", { get: () => {
					const newSh = { ...sh };
					Object.defineProperty(def, "shape", { value: newSh });
					return newSh;
				} });
			}
			const _normalized = cached(() => normalizeDef(def));
			defineLazy(inst._zod, "propValues", () => {
				const shape = def.shape;
				const propValues = {};
				for (const key in shape) {
					const field = shape[key]._zod;
					if (field.values) {
						propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
						for (const v of field.values) propValues[key].add(v);
					}
				}
				return propValues;
			});
			const isObject$1 = isObject;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$1(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				payload.value = {};
				const proms = [];
				const shape = value.shape;
				for (const key of value.keys) {
					const el = shape[key];
					const isOptionalIn = el._zod.optin === "optional";
					const isOptionalOut = el._zod.optout === "optional";
					const r = el._zod.run({
						value: input[key],
						issues: []
					}, ctx);
					if (r instanceof Promise) proms.push(r.then((r) => handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut)));
					else handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
				}
				if (!catchall) return proms.length ? Promise.all(proms).then(() => payload) : payload;
				return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
			};
		});
		const $ZodObjectJIT = /*@__PURE__*/ $constructor("$ZodObjectJIT", (inst, def) => {
			$ZodObject.init(inst, def);
			const superParse = inst._zod.parse;
			const _normalized = cached(() => normalizeDef(def));
			const generateFastpass = (shape) => {
				const doc = new Doc([
					"shape",
					"payload",
					"ctx"
				]);
				const normalized = _normalized.value;
				const parseStr = (key) => {
					const k = esc(key);
					return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
				};
				doc.write(`const input = payload.value;`);
				const ids = Object.create(null);
				let counter = 0;
				for (const key of normalized.keys) ids[key] = `key_${counter++}`;
				doc.write(`const newResult = {};`);
				for (const key of normalized.keys) {
					const id = ids[key];
					const k = esc(key);
					const schema = shape[key];
					const isOptionalIn = schema?._zod?.optin === "optional";
					const isOptionalOut = schema?._zod?.optout === "optional";
					doc.write(`const ${id} = ${parseStr(key)};`);
					if (isOptionalIn && isOptionalOut) doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
					else if (!isOptionalIn) doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
					else doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
				}
				doc.write(`payload.value = newResult;`);
				doc.write(`return payload;`);
				const fn = doc.compile();
				return (payload, ctx) => fn(shape, payload, ctx);
			};
			let fastpass;
			const isObject$2 = isObject;
			const jit = !globalConfig.jitless;
			const fastEnabled = jit && allowsEval.value;
			const catchall = def.catchall;
			let value;
			inst._zod.parse = (payload, ctx) => {
				value ?? (value = _normalized.value);
				const input = payload.value;
				if (!isObject$2(input)) {
					payload.issues.push({
						expected: "object",
						code: "invalid_type",
						input,
						inst
					});
					return payload;
				}
				if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
					if (!fastpass) fastpass = generateFastpass(def.shape);
					payload = fastpass(payload, ctx);
					if (!catchall) return payload;
					return handleCatchall([], input, payload, ctx, value, inst);
				}
				return superParse(payload, ctx);
			};
		});
		function handleUnionResults(results, final, inst, ctx) {
			for (const result of results) if (result.issues.length === 0) {
				final.value = result.value;
				return final;
			}
			const nonaborted = results.filter((r) => !aborted(r));
			if (nonaborted.length === 1) {
				final.value = nonaborted[0].value;
				return nonaborted[0];
			}
			final.issues.push({
				code: "invalid_union",
				input: final.value,
				inst,
				errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
			});
			return final;
		}
		const $ZodUnion = /*@__PURE__*/ $constructor("$ZodUnion", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
			defineLazy(inst._zod, "values", () => {
				if (def.options.every((o) => o._zod.values)) return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
			});
			defineLazy(inst._zod, "pattern", () => {
				if (def.options.every((o) => o._zod.pattern)) {
					const patterns = def.options.map((o) => o._zod.pattern);
					return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
				}
			});
			const first = def.options.length === 1 ? def.options[0]._zod.run : null;
			inst._zod.parse = (payload, ctx) => {
				if (first) return first(payload, ctx);
				let async = false;
				const results = [];
				for (const option of def.options) {
					const result = option._zod.run({
						value: payload.value,
						issues: []
					}, ctx);
					if (result instanceof Promise) {
						results.push(result);
						async = true;
					} else {
						if (result.issues.length === 0) return result;
						results.push(result);
					}
				}
				if (!async) return handleUnionResults(results, payload, inst, ctx);
				return Promise.all(results).then((results) => {
					return handleUnionResults(results, payload, inst, ctx);
				});
			};
		});
		const $ZodIntersection = /*@__PURE__*/ $constructor("$ZodIntersection", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, ctx) => {
				const input = payload.value;
				const left = def.left._zod.run({
					value: input,
					issues: []
				}, ctx);
				const right = def.right._zod.run({
					value: input,
					issues: []
				}, ctx);
				if (left instanceof Promise || right instanceof Promise) return Promise.all([left, right]).then(([left, right]) => {
					return handleIntersectionResults(payload, left, right);
				});
				return handleIntersectionResults(payload, left, right);
			};
		});
		function mergeValues(a, b) {
			if (a === b) return {
				valid: true,
				data: a
			};
			if (a instanceof Date && b instanceof Date && +a === +b) return {
				valid: true,
				data: a
			};
			if (isPlainObject(a) && isPlainObject(b)) {
				const bKeys = Object.keys(b);
				const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
				const newObj = {
					...a,
					...b
				};
				for (const key of sharedKeys) {
					const sharedValue = mergeValues(a[key], b[key]);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
					};
					newObj[key] = sharedValue.data;
				}
				return {
					valid: true,
					data: newObj
				};
			}
			if (Array.isArray(a) && Array.isArray(b)) {
				if (a.length !== b.length) return {
					valid: false,
					mergeErrorPath: []
				};
				const newArray = [];
				for (let index = 0; index < a.length; index++) {
					const itemA = a[index];
					const itemB = b[index];
					const sharedValue = mergeValues(itemA, itemB);
					if (!sharedValue.valid) return {
						valid: false,
						mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
					};
					newArray.push(sharedValue.data);
				}
				return {
					valid: true,
					data: newArray
				};
			}
			return {
				valid: false,
				mergeErrorPath: []
			};
		}
		function handleIntersectionResults(result, left, right) {
			const unrecKeys = /* @__PURE__ */ new Map();
			let unrecIssue;
			for (const iss of left.issues) if (iss.code === "unrecognized_keys") {
				unrecIssue ?? (unrecIssue = iss);
				for (const k of iss.keys) {
					if (!unrecKeys.has(k)) unrecKeys.set(k, {});
					unrecKeys.get(k).l = true;
				}
			} else result.issues.push(iss);
			for (const iss of right.issues) if (iss.code === "unrecognized_keys") for (const k of iss.keys) {
				if (!unrecKeys.has(k)) unrecKeys.set(k, {});
				unrecKeys.get(k).r = true;
			}
			else result.issues.push(iss);
			const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
			if (bothKeys.length && unrecIssue) result.issues.push({
				...unrecIssue,
				keys: bothKeys
			});
			if (aborted(result)) return result;
			const merged = mergeValues(left.value, right.value);
			if (!merged.valid) throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
			result.value = merged.data;
			return result;
		}
		const $ZodEnum = /*@__PURE__*/ $constructor("$ZodEnum", (inst, def) => {
			$ZodType.init(inst, def);
			const values = getEnumValues(def.entries);
			const valuesSet = new Set(values);
			inst._zod.values = valuesSet;
			inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (valuesSet.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodLiteral = /*@__PURE__*/ $constructor("$ZodLiteral", (inst, def) => {
			$ZodType.init(inst, def);
			if (def.values.length === 0) throw new Error("Cannot create literal schema with no valid values");
			const values = new Set(def.values);
			inst._zod.values = values;
			inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
			inst._zod.parse = (payload, _ctx) => {
				const input = payload.value;
				if (values.has(input)) return payload;
				payload.issues.push({
					code: "invalid_value",
					values: def.values,
					input,
					inst
				});
				return payload;
			};
		});
		const $ZodTransform = /*@__PURE__*/ $constructor("$ZodTransform", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				const _out = def.transform(payload.value, payload);
				if (ctx.async) return (_out instanceof Promise ? _out : Promise.resolve(_out)).then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				if (_out instanceof Promise) throw new $ZodAsyncError();
				payload.value = _out;
				payload.fallback = true;
				return payload;
			};
		});
		function handleOptionalResult(result, input) {
			if (input === void 0 && (result.issues.length || result.fallback)) return {
				issues: [],
				value: void 0
			};
			return result;
		}
		const $ZodOptional = /*@__PURE__*/ $constructor("$ZodOptional", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			inst._zod.optout = "optional";
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
			});
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (def.innerType._zod.optin === "optional") {
					const input = payload.value;
					const result = def.innerType._zod.run(payload, ctx);
					if (result instanceof Promise) return result.then((r) => handleOptionalResult(r, input));
					return handleOptionalResult(result, input);
				}
				if (payload.value === void 0) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodExactOptional = /*@__PURE__*/ $constructor("$ZodExactOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
			inst._zod.parse = (payload, ctx) => {
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNullable = /*@__PURE__*/ $constructor("$ZodNullable", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "pattern", () => {
				const pattern = def.innerType._zod.pattern;
				return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
			});
			defineLazy(inst._zod, "values", () => {
				return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				if (payload.value === null) return payload;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodDefault = /*@__PURE__*/ $constructor("$ZodDefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) {
					payload.value = def.defaultValue;
					/**
					* $ZodDefault returns the default value immediately in forward direction.
					* It doesn't pass the default value into the validator ("prefault"). There's no reason to pass the default value through validation. The validity of the default is enforced by TypeScript statically. Otherwise, it's the responsibility of the user to ensure the default is valid. In the case of pipes with divergent in/out types, you can specify the default on the `in` schema of your ZodPipe to set a "prefault" for the pipe.   */
					return payload;
				}
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleDefaultResult(result, def));
				return handleDefaultResult(result, def);
			};
		});
		function handleDefaultResult(payload, def) {
			if (payload.value === void 0) payload.value = def.defaultValue;
			return payload;
		}
		const $ZodPrefault = /*@__PURE__*/ $constructor("$ZodPrefault", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				if (payload.value === void 0) payload.value = def.defaultValue;
				return def.innerType._zod.run(payload, ctx);
			};
		});
		const $ZodNonOptional = /*@__PURE__*/ $constructor("$ZodNonOptional", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => {
				const v = def.innerType._zod.values;
				return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
			});
			inst._zod.parse = (payload, ctx) => {
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => handleNonOptionalResult(result, inst));
				return handleNonOptionalResult(result, inst);
			};
		});
		function handleNonOptionalResult(payload, inst) {
			if (!payload.issues.length && payload.value === void 0) payload.issues.push({
				code: "invalid_type",
				expected: "nonoptional",
				input: payload.value,
				inst
			});
			return payload;
		}
		const $ZodCatch = /*@__PURE__*/ $constructor("$ZodCatch", (inst, def) => {
			$ZodType.init(inst, def);
			inst._zod.optin = "optional";
			defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then((result) => {
					payload.value = result.value;
					if (result.issues.length) {
						payload.value = def.catchValue({
							...payload,
							error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
							input: payload.value
						});
						payload.issues = [];
						payload.fallback = true;
					}
					return payload;
				});
				payload.value = result.value;
				if (result.issues.length) {
					payload.value = def.catchValue({
						...payload,
						error: { issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config())) },
						input: payload.value
					});
					payload.issues = [];
					payload.fallback = true;
				}
				return payload;
			};
		});
		const $ZodPipe = /*@__PURE__*/ $constructor("$ZodPipe", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "values", () => def.in._zod.values);
			defineLazy(inst._zod, "optin", () => def.in._zod.optin);
			defineLazy(inst._zod, "optout", () => def.out._zod.optout);
			defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") {
					const right = def.out._zod.run(payload, ctx);
					if (right instanceof Promise) return right.then((right) => handlePipeResult(right, def.in, ctx));
					return handlePipeResult(right, def.in, ctx);
				}
				const left = def.in._zod.run(payload, ctx);
				if (left instanceof Promise) return left.then((left) => handlePipeResult(left, def.out, ctx));
				return handlePipeResult(left, def.out, ctx);
			};
		});
		function handlePipeResult(left, next, ctx) {
			if (left.issues.length) {
				left.aborted = true;
				return left;
			}
			return next._zod.run({
				value: left.value,
				issues: left.issues,
				fallback: left.fallback
			}, ctx);
		}
		const $ZodReadonly = /*@__PURE__*/ $constructor("$ZodReadonly", (inst, def) => {
			$ZodType.init(inst, def);
			defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
			defineLazy(inst._zod, "values", () => def.innerType._zod.values);
			defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
			defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
			inst._zod.parse = (payload, ctx) => {
				if (ctx.direction === "backward") return def.innerType._zod.run(payload, ctx);
				const result = def.innerType._zod.run(payload, ctx);
				if (result instanceof Promise) return result.then(handleReadonlyResult);
				return handleReadonlyResult(result);
			};
		});
		function handleReadonlyResult(payload) {
			payload.value = Object.freeze(payload.value);
			return payload;
		}
		const $ZodCustom = /*@__PURE__*/ $constructor("$ZodCustom", (inst, def) => {
			$ZodCheck.init(inst, def);
			$ZodType.init(inst, def);
			inst._zod.parse = (payload, _) => {
				return payload;
			};
			inst._zod.check = (payload) => {
				const input = payload.value;
				const r = def.fn(input);
				if (r instanceof Promise) return r.then((r) => handleRefineResult(r, payload, input, inst));
				handleRefineResult(r, payload, input, inst);
			};
		});
		function handleRefineResult(result, payload, input, inst) {
			if (!result) {
				const _iss = {
					code: "custom",
					input,
					inst,
					path: [...inst._zod.def.path ?? []],
					continue: !inst._zod.def.abort
				};
				if (inst._zod.def.params) _iss.params = inst._zod.def.params;
				payload.issues.push(issue(_iss));
			}
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/registries.js
		var _a;
		var $ZodRegistry = class {
			constructor() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
			}
			add(schema, ..._meta) {
				const meta = _meta[0];
				this._map.set(schema, meta);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.set(meta.id, schema);
				return this;
			}
			clear() {
				this._map = /* @__PURE__ */ new WeakMap();
				this._idmap = /* @__PURE__ */ new Map();
				return this;
			}
			remove(schema) {
				const meta = this._map.get(schema);
				if (meta && typeof meta === "object" && "id" in meta) this._idmap.delete(meta.id);
				this._map.delete(schema);
				return this;
			}
			get(schema) {
				const p = schema._zod.parent;
				if (p) {
					const pm = { ...this.get(p) ?? {} };
					delete pm.id;
					const f = {
						...pm,
						...this._map.get(schema)
					};
					return Object.keys(f).length ? f : void 0;
				}
				return this._map.get(schema);
			}
			has(schema) {
				return this._map.has(schema);
			}
		};
		function registry() {
			return new $ZodRegistry();
		}
		(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
		const globalRegistry = globalThis.__zod_globalRegistry;
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/api.js
		// @__NO_SIDE_EFFECTS__
		function _string(Class, params) {
			return new Class({
				type: "string",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _email(Class, params) {
			return new Class({
				type: "string",
				format: "email",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _guid(Class, params) {
			return new Class({
				type: "string",
				format: "guid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuid(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv4(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v4",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv6(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v6",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uuidv7(Class, params) {
			return new Class({
				type: "string",
				format: "uuid",
				check: "string_format",
				abort: false,
				version: "v7",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _url(Class, params) {
			return new Class({
				type: "string",
				format: "url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _emoji(Class, params) {
			return new Class({
				type: "string",
				format: "emoji",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _nanoid(Class, params) {
			return new Class({
				type: "string",
				format: "nanoid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link _cuid2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		// @__NO_SIDE_EFFECTS__
		function _cuid(Class, params) {
			return new Class({
				type: "string",
				format: "cuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cuid2(Class, params) {
			return new Class({
				type: "string",
				format: "cuid2",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ulid(Class, params) {
			return new Class({
				type: "string",
				format: "ulid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _xid(Class, params) {
			return new Class({
				type: "string",
				format: "xid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ksuid(Class, params) {
			return new Class({
				type: "string",
				format: "ksuid",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv4(Class, params) {
			return new Class({
				type: "string",
				format: "ipv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _ipv6(Class, params) {
			return new Class({
				type: "string",
				format: "ipv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv4(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv4",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _cidrv6(Class, params) {
			return new Class({
				type: "string",
				format: "cidrv6",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64(Class, params) {
			return new Class({
				type: "string",
				format: "base64",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _base64url(Class, params) {
			return new Class({
				type: "string",
				format: "base64url",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _e164(Class, params) {
			return new Class({
				type: "string",
				format: "e164",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _jwt(Class, params) {
			return new Class({
				type: "string",
				format: "jwt",
				check: "string_format",
				abort: false,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDateTime(Class, params) {
			return new Class({
				type: "string",
				format: "datetime",
				check: "string_format",
				offset: false,
				local: false,
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDate(Class, params) {
			return new Class({
				type: "string",
				format: "date",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoTime(Class, params) {
			return new Class({
				type: "string",
				format: "time",
				check: "string_format",
				precision: null,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _isoDuration(Class, params) {
			return new Class({
				type: "string",
				format: "duration",
				check: "string_format",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _number(Class, params) {
			return new Class({
				type: "number",
				checks: [],
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _int(Class, params) {
			return new Class({
				type: "number",
				check: "number_format",
				abort: false,
				format: "safeint",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _boolean(Class, params) {
			return new Class({
				type: "boolean",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _unknown(Class) {
			return new Class({ type: "unknown" });
		}
		// @__NO_SIDE_EFFECTS__
		function _never(Class, params) {
			return new Class({
				type: "never",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lt(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lte(value, params) {
			return new $ZodCheckLessThan({
				check: "less_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gt(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: false
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _gte(value, params) {
			return new $ZodCheckGreaterThan({
				check: "greater_than",
				...normalizeParams(params),
				value,
				inclusive: true
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _multipleOf(value, params) {
			return new $ZodCheckMultipleOf({
				check: "multiple_of",
				...normalizeParams(params),
				value
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _maxLength(maximum, params) {
			return new $ZodCheckMaxLength({
				check: "max_length",
				...normalizeParams(params),
				maximum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _minLength(minimum, params) {
			return new $ZodCheckMinLength({
				check: "min_length",
				...normalizeParams(params),
				minimum
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _length(length, params) {
			return new $ZodCheckLengthEquals({
				check: "length_equals",
				...normalizeParams(params),
				length
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _regex(pattern, params) {
			return new $ZodCheckRegex({
				check: "string_format",
				format: "regex",
				...normalizeParams(params),
				pattern
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _lowercase(params) {
			return new $ZodCheckLowerCase({
				check: "string_format",
				format: "lowercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _uppercase(params) {
			return new $ZodCheckUpperCase({
				check: "string_format",
				format: "uppercase",
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _includes(includes, params) {
			return new $ZodCheckIncludes({
				check: "string_format",
				format: "includes",
				...normalizeParams(params),
				includes
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _startsWith(prefix, params) {
			return new $ZodCheckStartsWith({
				check: "string_format",
				format: "starts_with",
				...normalizeParams(params),
				prefix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _endsWith(suffix, params) {
			return new $ZodCheckEndsWith({
				check: "string_format",
				format: "ends_with",
				...normalizeParams(params),
				suffix
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _overwrite(tx) {
			return new $ZodCheckOverwrite({
				check: "overwrite",
				tx
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _normalize(form) {
			return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
		}
		// @__NO_SIDE_EFFECTS__
		function _trim() {
			return /* @__PURE__ */ _overwrite((input) => input.trim());
		}
		// @__NO_SIDE_EFFECTS__
		function _toLowerCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _toUpperCase() {
			return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
		}
		// @__NO_SIDE_EFFECTS__
		function _slugify() {
			return /* @__PURE__ */ _overwrite((input) => slugify(input));
		}
		// @__NO_SIDE_EFFECTS__
		function _array(Class, element, params) {
			return new Class({
				type: "array",
				element,
				...normalizeParams(params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _refine(Class, fn, _params) {
			return new Class({
				type: "custom",
				check: "custom",
				fn,
				...normalizeParams(_params)
			});
		}
		// @__NO_SIDE_EFFECTS__
		function _superRefine(fn, params) {
			const ch = /* @__PURE__ */ _check((payload) => {
				payload.addIssue = (issue$2) => {
					if (typeof issue$2 === "string") payload.issues.push(issue(issue$2, payload.value, ch._zod.def));
					else {
						const _issue = issue$2;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = ch);
						_issue.continue ?? (_issue.continue = !ch._zod.def.abort);
						payload.issues.push(issue(_issue));
					}
				};
				return fn(payload.value, payload);
			}, params);
			return ch;
		}
		// @__NO_SIDE_EFFECTS__
		function _check(fn, params) {
			const ch = new $ZodCheck({
				check: "custom",
				...normalizeParams(params)
			});
			ch._zod.check = fn;
			return ch;
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/to-json-schema.js
		function initializeContext(params) {
			let target = params?.target ?? "draft-2020-12";
			if (target === "draft-4") target = "draft-04";
			if (target === "draft-7") target = "draft-07";
			return {
				processors: params.processors ?? {},
				metadataRegistry: params?.metadata ?? globalRegistry,
				target,
				unrepresentable: params?.unrepresentable ?? "throw",
				override: params?.override ?? (() => {}),
				io: params?.io ?? "output",
				counter: 0,
				seen: /* @__PURE__ */ new Map(),
				cycles: params?.cycles ?? "ref",
				reused: params?.reused ?? "inline",
				external: params?.external ?? void 0
			};
		}
		function process(schema, ctx, _params = {
			path: [],
			schemaPath: []
		}) {
			var _a;
			const def = schema._zod.def;
			const seen = ctx.seen.get(schema);
			if (seen) {
				seen.count++;
				if (_params.schemaPath.includes(schema)) seen.cycle = _params.path;
				return seen.schema;
			}
			const result = {
				schema: {},
				count: 1,
				cycle: void 0,
				path: _params.path
			};
			ctx.seen.set(schema, result);
			const overrideSchema = schema._zod.toJSONSchema?.();
			if (overrideSchema) result.schema = overrideSchema;
			else {
				const params = {
					..._params,
					schemaPath: [..._params.schemaPath, schema],
					path: _params.path
				};
				if (schema._zod.processJSONSchema) schema._zod.processJSONSchema(ctx, result.schema, params);
				else {
					const _json = result.schema;
					const processor = ctx.processors[def.type];
					if (!processor) throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
					processor(schema, ctx, _json, params);
				}
				const parent = schema._zod.parent;
				if (parent) {
					if (!result.ref) result.ref = parent;
					process(parent, ctx, params);
					ctx.seen.get(parent).isParent = true;
				}
			}
			const meta = ctx.metadataRegistry.get(schema);
			if (meta) Object.assign(result.schema, meta);
			if (ctx.io === "input" && isTransforming(schema)) {
				delete result.schema.examples;
				delete result.schema.default;
			}
			if (ctx.io === "input" && "_prefault" in result.schema) (_a = result.schema).default ?? (_a.default = result.schema._prefault);
			delete result.schema._prefault;
			return ctx.seen.get(schema).schema;
		}
		function extractDefs(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const idToSchema = /* @__PURE__ */ new Map();
			for (const entry of ctx.seen.entries()) {
				const id = ctx.metadataRegistry.get(entry[0])?.id;
				if (id) {
					const existing = idToSchema.get(id);
					if (existing && existing !== entry[0]) throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
					idToSchema.set(id, entry[0]);
				}
			}
			const makeURI = (entry) => {
				const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
				if (ctx.external) {
					const externalId = ctx.external.registry.get(entry[0])?.id;
					const uriGenerator = ctx.external.uri ?? ((id) => id);
					if (externalId) return { ref: uriGenerator(externalId) };
					const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
					entry[1].defId = id;
					return {
						defId: id,
						ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}`
					};
				}
				if (entry[1] === root) return { ref: "#" };
				const defUriPrefix = `#/${defsSegment}/`;
				const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
				return {
					defId,
					ref: defUriPrefix + defId
				};
			};
			const extractToDef = (entry) => {
				if (entry[1].schema.$ref) return;
				const seen = entry[1];
				const { ref, defId } = makeURI(entry);
				seen.def = { ...seen.schema };
				if (defId) seen.defId = defId;
				const schema = seen.schema;
				for (const key in schema) delete schema[key];
				schema.$ref = ref;
			};
			if (ctx.cycles === "throw") for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.cycle) throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
			}
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (schema === entry[0]) {
					extractToDef(entry);
					continue;
				}
				if (ctx.external) {
					const ext = ctx.external.registry.get(entry[0])?.id;
					if (schema !== entry[0] && ext) {
						extractToDef(entry);
						continue;
					}
				}
				if (ctx.metadataRegistry.get(entry[0])?.id) {
					extractToDef(entry);
					continue;
				}
				if (seen.cycle) {
					extractToDef(entry);
					continue;
				}
				if (seen.count > 1) {
					if (ctx.reused === "ref") {
						extractToDef(entry);
						continue;
					}
				}
			}
		}
		function finalize(ctx, schema) {
			const root = ctx.seen.get(schema);
			if (!root) throw new Error("Unprocessed schema. This is a bug in Zod.");
			const flattenRef = (zodSchema) => {
				const seen = ctx.seen.get(zodSchema);
				if (seen.ref === null) return;
				const schema = seen.def ?? seen.schema;
				const _cached = { ...schema };
				const ref = seen.ref;
				seen.ref = null;
				if (ref) {
					flattenRef(ref);
					const refSeen = ctx.seen.get(ref);
					const refSchema = refSeen.schema;
					if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
						schema.allOf = schema.allOf ?? [];
						schema.allOf.push(refSchema);
					} else Object.assign(schema, refSchema);
					Object.assign(schema, _cached);
					if (zodSchema._zod.parent === ref) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (!(key in _cached)) delete schema[key];
					}
					if (refSchema.$ref && refSeen.def) for (const key in schema) {
						if (key === "$ref" || key === "allOf") continue;
						if (key in refSeen.def && JSON.stringify(schema[key]) === JSON.stringify(refSeen.def[key])) delete schema[key];
					}
				}
				const parent = zodSchema._zod.parent;
				if (parent && parent !== ref) {
					flattenRef(parent);
					const parentSeen = ctx.seen.get(parent);
					if (parentSeen?.schema.$ref) {
						schema.$ref = parentSeen.schema.$ref;
						if (parentSeen.def) for (const key in schema) {
							if (key === "$ref" || key === "allOf") continue;
							if (key in parentSeen.def && JSON.stringify(schema[key]) === JSON.stringify(parentSeen.def[key])) delete schema[key];
						}
					}
				}
				ctx.override({
					zodSchema,
					jsonSchema: schema,
					path: seen.path ?? []
				});
			};
			for (const entry of [...ctx.seen.entries()].reverse()) flattenRef(entry[0]);
			const result = {};
			if (ctx.target === "draft-2020-12") result.$schema = "https://json-schema.org/draft/2020-12/schema";
			else if (ctx.target === "draft-07") result.$schema = "http://json-schema.org/draft-07/schema#";
			else if (ctx.target === "draft-04") result.$schema = "http://json-schema.org/draft-04/schema#";
			else if (ctx.target === "openapi-3.0") {}
			if (ctx.external?.uri) {
				const id = ctx.external.registry.get(schema)?.id;
				if (!id) throw new Error("Schema is missing an `id` property");
				result.$id = ctx.external.uri(id);
			}
			Object.assign(result, root.def ?? root.schema);
			const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
			if (rootMetaId !== void 0 && result.id === rootMetaId) delete result.id;
			const defs = ctx.external?.defs ?? {};
			for (const entry of ctx.seen.entries()) {
				const seen = entry[1];
				if (seen.def && seen.defId) {
					if (seen.def.id === seen.defId) delete seen.def.id;
					defs[seen.defId] = seen.def;
				}
			}
			if (ctx.external) {} else if (Object.keys(defs).length > 0) {
				if (ctx.target === "draft-2020-12") result.$defs = defs;
				else result.definitions = defs;
			}
			try {
				const finalized = JSON.parse(JSON.stringify(result));
				Object.defineProperty(finalized, "~standard", {
					value: {
						...schema["~standard"],
						jsonSchema: {
							input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
							output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
						}
					},
					enumerable: false,
					writable: false
				});
				return finalized;
			} catch (_err) {
				throw new Error("Error converting schema to JSON.");
			}
		}
		function isTransforming(_schema, _ctx) {
			const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
			if (ctx.seen.has(_schema)) return false;
			ctx.seen.add(_schema);
			const def = _schema._zod.def;
			if (def.type === "transform") return true;
			if (def.type === "array") return isTransforming(def.element, ctx);
			if (def.type === "set") return isTransforming(def.valueType, ctx);
			if (def.type === "lazy") return isTransforming(def.getter(), ctx);
			if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") return isTransforming(def.innerType, ctx);
			if (def.type === "intersection") return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
			if (def.type === "record" || def.type === "map") return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
			if (def.type === "pipe") {
				if (_schema._zod.traits.has("$ZodCodec")) return true;
				return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
			}
			if (def.type === "object") {
				for (const key in def.shape) if (isTransforming(def.shape[key], ctx)) return true;
				return false;
			}
			if (def.type === "union") {
				for (const option of def.options) if (isTransforming(option, ctx)) return true;
				return false;
			}
			if (def.type === "tuple") {
				for (const item of def.items) if (isTransforming(item, ctx)) return true;
				if (def.rest && isTransforming(def.rest, ctx)) return true;
				return false;
			}
			return false;
		}
		/**
		* Creates a toJSONSchema method for a schema instance.
		* This encapsulates the logic of initializing context, processing, extracting defs, and finalizing.
		*/
		const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
			const ctx = initializeContext({
				...params,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
			const { libraryOptions, target } = params ?? {};
			const ctx = initializeContext({
				...libraryOptions ?? {},
				target,
				io,
				processors
			});
			process(schema, ctx);
			extractDefs(ctx, schema);
			return finalize(ctx, schema);
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/core/json-schema-processors.js
		const formatMap = {
			guid: "uuid",
			url: "uri",
			datetime: "date-time",
			json_string: "json-string",
			regex: ""
		};
		const stringProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			json.type = "string";
			const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
			if (typeof minimum === "number") json.minLength = minimum;
			if (typeof maximum === "number") json.maxLength = maximum;
			if (format) {
				json.format = formatMap[format] ?? format;
				if (json.format === "") delete json.format;
				if (format === "time") delete json.format;
			}
			if (contentEncoding) json.contentEncoding = contentEncoding;
			if (patterns && patterns.size > 0) {
				const regexes = [...patterns];
				if (regexes.length === 1) json.pattern = regexes[0].source;
				else if (regexes.length > 1) json.allOf = [...regexes.map((regex) => ({
					...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
					pattern: regex.source
				}))];
			}
		};
		const numberProcessor = (schema, ctx, _json, _params) => {
			const json = _json;
			const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
			if (typeof format === "string" && format.includes("int")) json.type = "integer";
			else json.type = "number";
			const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
			const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
			const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
			if (exMin) {
				if (legacy) {
					json.minimum = exclusiveMinimum;
					json.exclusiveMinimum = true;
				} else json.exclusiveMinimum = exclusiveMinimum;
			} else if (typeof minimum === "number") json.minimum = minimum;
			if (exMax) {
				if (legacy) {
					json.maximum = exclusiveMaximum;
					json.exclusiveMaximum = true;
				} else json.exclusiveMaximum = exclusiveMaximum;
			} else if (typeof maximum === "number") json.maximum = maximum;
			if (typeof multipleOf === "number") json.multipleOf = multipleOf;
		};
		const booleanProcessor = (_schema, _ctx, json, _params) => {
			json.type = "boolean";
		};
		const neverProcessor = (_schema, _ctx, json, _params) => {
			json.not = {};
		};
		const enumProcessor = (schema, _ctx, json, _params) => {
			const def = schema._zod.def;
			const values = getEnumValues(def.entries);
			if (values.every((v) => typeof v === "number")) json.type = "number";
			if (values.every((v) => typeof v === "string")) json.type = "string";
			json.enum = values;
		};
		const literalProcessor = (schema, ctx, json, _params) => {
			const def = schema._zod.def;
			const vals = [];
			for (const val of def.values) if (val === void 0) {
				if (ctx.unrepresentable === "throw") throw new Error("Literal `undefined` cannot be represented in JSON Schema");
			} else if (typeof val === "bigint") {
				if (ctx.unrepresentable === "throw") throw new Error("BigInt literals cannot be represented in JSON Schema");
				else vals.push(Number(val));
			} else vals.push(val);
			if (vals.length === 0) {} else if (vals.length === 1) {
				const val = vals[0];
				json.type = val === null ? "null" : typeof val;
				if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") json.enum = [val];
				else json.const = val;
			} else {
				if (vals.every((v) => typeof v === "number")) json.type = "number";
				if (vals.every((v) => typeof v === "string")) json.type = "string";
				if (vals.every((v) => typeof v === "boolean")) json.type = "boolean";
				if (vals.every((v) => v === null)) json.type = "null";
				json.enum = vals;
			}
		};
		const customProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Custom types cannot be represented in JSON Schema");
		};
		const transformProcessor = (_schema, ctx, _json, _params) => {
			if (ctx.unrepresentable === "throw") throw new Error("Transforms cannot be represented in JSON Schema");
		};
		const arrayProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			const { minimum, maximum } = schema._zod.bag;
			if (typeof minimum === "number") json.minItems = minimum;
			if (typeof maximum === "number") json.maxItems = maximum;
			json.type = "array";
			json.items = process(def.element, ctx, {
				...params,
				path: [...params.path, "items"]
			});
		};
		const objectProcessor = (schema, ctx, _json, params) => {
			const json = _json;
			const def = schema._zod.def;
			json.type = "object";
			json.properties = {};
			const shape = def.shape;
			for (const key in shape) json.properties[key] = process(shape[key], ctx, {
				...params,
				path: [
					...params.path,
					"properties",
					key
				]
			});
			const allKeys = new Set(Object.keys(shape));
			const requiredKeys = new Set([...allKeys].filter((key) => {
				const v = def.shape[key]._zod;
				if (ctx.io === "input") return v.optin === void 0;
				else return v.optout === void 0;
			}));
			if (requiredKeys.size > 0) json.required = Array.from(requiredKeys);
			if (def.catchall?._zod.def.type === "never") json.additionalProperties = false;
			else if (!def.catchall) {
				if (ctx.io === "output") json.additionalProperties = false;
			} else if (def.catchall) json.additionalProperties = process(def.catchall, ctx, {
				...params,
				path: [...params.path, "additionalProperties"]
			});
		};
		const unionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const isExclusive = def.inclusive === false;
			const options = def.options.map((x, i) => process(x, ctx, {
				...params,
				path: [
					...params.path,
					isExclusive ? "oneOf" : "anyOf",
					i
				]
			}));
			if (isExclusive) json.oneOf = options;
			else json.anyOf = options;
		};
		const intersectionProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const a = process(def.left, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					0
				]
			});
			const b = process(def.right, ctx, {
				...params,
				path: [
					...params.path,
					"allOf",
					1
				]
			});
			const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
			json.allOf = [...isSimpleIntersection(a) ? a.allOf : [a], ...isSimpleIntersection(b) ? b.allOf : [b]];
		};
		const nullableProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			const inner = process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			if (ctx.target === "openapi-3.0") {
				seen.ref = def.innerType;
				json.nullable = true;
			} else json.anyOf = [inner, { type: "null" }];
		};
		const nonoptionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		const defaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.default = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const prefaultProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			if (ctx.io === "input") json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
		};
		const catchProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			let catchValue;
			try {
				catchValue = def.catchValue(void 0);
			} catch {
				throw new Error("Dynamic catch values are not supported in JSON Schema");
			}
			json.default = catchValue;
		};
		const pipeProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			const inIsTransform = def.in._zod.traits.has("$ZodTransform");
			const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
			process(innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = innerType;
		};
		const readonlyProcessor = (schema, ctx, json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
			json.readOnly = true;
		};
		const optionalProcessor = (schema, ctx, _json, params) => {
			const def = schema._zod.def;
			process(def.innerType, ctx, params);
			const seen = ctx.seen.get(schema);
			seen.ref = def.innerType;
		};
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/iso.js
		const ZodISODateTime = /*@__PURE__*/ $constructor("ZodISODateTime", (inst, def) => {
			$ZodISODateTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function datetime(params) {
			return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
		}
		const ZodISODate = /*@__PURE__*/ $constructor("ZodISODate", (inst, def) => {
			$ZodISODate.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function date(params) {
			return /* @__PURE__ */ _isoDate(ZodISODate, params);
		}
		const ZodISOTime = /*@__PURE__*/ $constructor("ZodISOTime", (inst, def) => {
			$ZodISOTime.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function time(params) {
			return /* @__PURE__ */ _isoTime(ZodISOTime, params);
		}
		const ZodISODuration = /*@__PURE__*/ $constructor("ZodISODuration", (inst, def) => {
			$ZodISODuration.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		function duration(params) {
			return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
		}
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/errors.js
		const initializer = (inst, issues) => {
			$ZodError.init(inst, issues);
			inst.name = "ZodError";
			Object.defineProperties(inst, {
				format: { value: (mapper) => formatError(inst, mapper) },
				flatten: { value: (mapper) => flattenError(inst, mapper) },
				addIssue: { value: (issue) => {
					inst.issues.push(issue);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				addIssues: { value: (issues) => {
					inst.issues.push(...issues);
					inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
				} },
				isEmpty: { get() {
					return inst.issues.length === 0;
				} }
			});
		};
		const ZodRealError = /*@__PURE__*/ $constructor("ZodError", initializer, { Parent: Error });
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/parse.js
		const parse = /* @__PURE__ */ _parse(ZodRealError);
		const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
		const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
		const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
		const encode = /* @__PURE__ */ _encode(ZodRealError);
		const decode = /* @__PURE__ */ _decode(ZodRealError);
		const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
		const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
		const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
		const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
		const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
		const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
		//#endregion
		//#region ../../node_modules/.pnpm/zod@4.4.3/node_modules/zod/v4/classic/schemas.js
		const _installedGroups = /* @__PURE__ */ new WeakMap();
		function _installLazyMethods(inst, group, methods) {
			const proto = Object.getPrototypeOf(inst);
			let installed = _installedGroups.get(proto);
			if (!installed) {
				installed = /* @__PURE__ */ new Set();
				_installedGroups.set(proto, installed);
			}
			if (installed.has(group)) return;
			installed.add(group);
			for (const key in methods) {
				const fn = methods[key];
				Object.defineProperty(proto, key, {
					configurable: true,
					enumerable: false,
					get() {
						const bound = fn.bind(this);
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: bound
						});
						return bound;
					},
					set(v) {
						Object.defineProperty(this, key, {
							configurable: true,
							writable: true,
							enumerable: true,
							value: v
						});
					}
				});
			}
		}
		const ZodType = /*@__PURE__*/ $constructor("ZodType", (inst, def) => {
			$ZodType.init(inst, def);
			Object.assign(inst["~standard"], { jsonSchema: {
				input: createStandardJSONSchemaMethod(inst, "input"),
				output: createStandardJSONSchemaMethod(inst, "output")
			} });
			inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
			inst.def = def;
			inst.type = def.type;
			Object.defineProperty(inst, "_def", { value: def });
			inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
			inst.safeParse = (data, params) => safeParse(inst, data, params);
			inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
			inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
			inst.spa = inst.safeParseAsync;
			inst.encode = (data, params) => encode(inst, data, params);
			inst.decode = (data, params) => decode(inst, data, params);
			inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
			inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
			inst.safeEncode = (data, params) => safeEncode(inst, data, params);
			inst.safeDecode = (data, params) => safeDecode(inst, data, params);
			inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
			inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
			_installLazyMethods(inst, "ZodType", {
				check(...chks) {
					const def = this.def;
					return this.clone(mergeDefs(def, { checks: [...def.checks ?? [], ...chks.map((ch) => typeof ch === "function" ? { _zod: {
						check: ch,
						def: { check: "custom" },
						onattach: []
					} } : ch)] }), { parent: true });
				},
				with(...chks) {
					return this.check(...chks);
				},
				clone(def, params) {
					return clone(this, def, params);
				},
				brand() {
					return this;
				},
				register(reg, meta) {
					reg.add(this, meta);
					return this;
				},
				refine(check, params) {
					return this.check(refine(check, params));
				},
				superRefine(refinement, params) {
					return this.check(superRefine(refinement, params));
				},
				overwrite(fn) {
					return this.check(/* @__PURE__ */ _overwrite(fn));
				},
				optional() {
					return optional(this);
				},
				exactOptional() {
					return exactOptional(this);
				},
				nullable() {
					return nullable(this);
				},
				nullish() {
					return optional(nullable(this));
				},
				nonoptional(params) {
					return nonoptional(this, params);
				},
				array() {
					return array(this);
				},
				or(arg) {
					return union([this, arg]);
				},
				and(arg) {
					return intersection(this, arg);
				},
				transform(tx) {
					return pipe(this, transform(tx));
				},
				default(d) {
					return _default(this, d);
				},
				prefault(d) {
					return prefault(this, d);
				},
				catch(params) {
					return _catch(this, params);
				},
				pipe(target) {
					return pipe(this, target);
				},
				readonly() {
					return readonly(this);
				},
				describe(description) {
					const cl = this.clone();
					globalRegistry.add(cl, { description });
					return cl;
				},
				meta(...args) {
					if (args.length === 0) return globalRegistry.get(this);
					const cl = this.clone();
					globalRegistry.add(cl, args[0]);
					return cl;
				},
				isOptional() {
					return this.safeParse(void 0).success;
				},
				isNullable() {
					return this.safeParse(null).success;
				},
				apply(fn) {
					return fn(this);
				}
			});
			Object.defineProperty(inst, "description", {
				get() {
					return globalRegistry.get(inst)?.description;
				},
				configurable: true
			});
			return inst;
		});
		/** @internal */
		const _ZodString = /*@__PURE__*/ $constructor("_ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => stringProcessor(inst, ctx, json, params);
			const bag = inst._zod.bag;
			inst.format = bag.format ?? null;
			inst.minLength = bag.minimum ?? null;
			inst.maxLength = bag.maximum ?? null;
			_installLazyMethods(inst, "_ZodString", {
				regex(...args) {
					return this.check(/* @__PURE__ */ _regex(...args));
				},
				includes(...args) {
					return this.check(/* @__PURE__ */ _includes(...args));
				},
				startsWith(...args) {
					return this.check(/* @__PURE__ */ _startsWith(...args));
				},
				endsWith(...args) {
					return this.check(/* @__PURE__ */ _endsWith(...args));
				},
				min(...args) {
					return this.check(/* @__PURE__ */ _minLength(...args));
				},
				max(...args) {
					return this.check(/* @__PURE__ */ _maxLength(...args));
				},
				length(...args) {
					return this.check(/* @__PURE__ */ _length(...args));
				},
				nonempty(...args) {
					return this.check(/* @__PURE__ */ _minLength(1, ...args));
				},
				lowercase(params) {
					return this.check(/* @__PURE__ */ _lowercase(params));
				},
				uppercase(params) {
					return this.check(/* @__PURE__ */ _uppercase(params));
				},
				trim() {
					return this.check(/* @__PURE__ */ _trim());
				},
				normalize(...args) {
					return this.check(/* @__PURE__ */ _normalize(...args));
				},
				toLowerCase() {
					return this.check(/* @__PURE__ */ _toLowerCase());
				},
				toUpperCase() {
					return this.check(/* @__PURE__ */ _toUpperCase());
				},
				slugify() {
					return this.check(/* @__PURE__ */ _slugify());
				}
			});
		});
		const ZodString = /*@__PURE__*/ $constructor("ZodString", (inst, def) => {
			$ZodString.init(inst, def);
			_ZodString.init(inst, def);
			inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
			inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
			inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
			inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
			inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
			inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
			inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
			inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
			inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
			inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
			inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
			inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
			inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
			inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
			inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
			inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
			inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
			inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
			inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
			inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
			inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
			inst.datetime = (params) => inst.check(datetime(params));
			inst.date = (params) => inst.check(date(params));
			inst.time = (params) => inst.check(time(params));
			inst.duration = (params) => inst.check(duration(params));
		});
		function string(params) {
			return /* @__PURE__ */ _string(ZodString, params);
		}
		const ZodStringFormat = /*@__PURE__*/ $constructor("ZodStringFormat", (inst, def) => {
			$ZodStringFormat.init(inst, def);
			_ZodString.init(inst, def);
		});
		const ZodEmail = /*@__PURE__*/ $constructor("ZodEmail", (inst, def) => {
			$ZodEmail.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodGUID = /*@__PURE__*/ $constructor("ZodGUID", (inst, def) => {
			$ZodGUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodUUID = /*@__PURE__*/ $constructor("ZodUUID", (inst, def) => {
			$ZodUUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodURL = /*@__PURE__*/ $constructor("ZodURL", (inst, def) => {
			$ZodURL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodEmoji = /*@__PURE__*/ $constructor("ZodEmoji", (inst, def) => {
			$ZodEmoji.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNanoID = /*@__PURE__*/ $constructor("ZodNanoID", (inst, def) => {
			$ZodNanoID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		/**
		* @deprecated CUID v1 is deprecated by its authors due to information leakage
		* (timestamps embedded in the id). Use {@link ZodCUID2} instead.
		* See https://github.com/paralleldrive/cuid.
		*/
		const ZodCUID = /*@__PURE__*/ $constructor("ZodCUID", (inst, def) => {
			$ZodCUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCUID2 = /*@__PURE__*/ $constructor("ZodCUID2", (inst, def) => {
			$ZodCUID2.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodULID = /*@__PURE__*/ $constructor("ZodULID", (inst, def) => {
			$ZodULID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodXID = /*@__PURE__*/ $constructor("ZodXID", (inst, def) => {
			$ZodXID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodKSUID = /*@__PURE__*/ $constructor("ZodKSUID", (inst, def) => {
			$ZodKSUID.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv4 = /*@__PURE__*/ $constructor("ZodIPv4", (inst, def) => {
			$ZodIPv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodIPv6 = /*@__PURE__*/ $constructor("ZodIPv6", (inst, def) => {
			$ZodIPv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv4 = /*@__PURE__*/ $constructor("ZodCIDRv4", (inst, def) => {
			$ZodCIDRv4.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodCIDRv6 = /*@__PURE__*/ $constructor("ZodCIDRv6", (inst, def) => {
			$ZodCIDRv6.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64 = /*@__PURE__*/ $constructor("ZodBase64", (inst, def) => {
			$ZodBase64.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodBase64URL = /*@__PURE__*/ $constructor("ZodBase64URL", (inst, def) => {
			$ZodBase64URL.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodE164 = /*@__PURE__*/ $constructor("ZodE164", (inst, def) => {
			$ZodE164.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodJWT = /*@__PURE__*/ $constructor("ZodJWT", (inst, def) => {
			$ZodJWT.init(inst, def);
			ZodStringFormat.init(inst, def);
		});
		const ZodNumber = /*@__PURE__*/ $constructor("ZodNumber", (inst, def) => {
			$ZodNumber.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => numberProcessor(inst, ctx, json, params);
			_installLazyMethods(inst, "ZodNumber", {
				gt(value, params) {
					return this.check(/* @__PURE__ */ _gt(value, params));
				},
				gte(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				min(value, params) {
					return this.check(/* @__PURE__ */ _gte(value, params));
				},
				lt(value, params) {
					return this.check(/* @__PURE__ */ _lt(value, params));
				},
				lte(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				max(value, params) {
					return this.check(/* @__PURE__ */ _lte(value, params));
				},
				int(params) {
					return this.check(int(params));
				},
				safe(params) {
					return this.check(int(params));
				},
				positive(params) {
					return this.check(/* @__PURE__ */ _gt(0, params));
				},
				nonnegative(params) {
					return this.check(/* @__PURE__ */ _gte(0, params));
				},
				negative(params) {
					return this.check(/* @__PURE__ */ _lt(0, params));
				},
				nonpositive(params) {
					return this.check(/* @__PURE__ */ _lte(0, params));
				},
				multipleOf(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				step(value, params) {
					return this.check(/* @__PURE__ */ _multipleOf(value, params));
				},
				finite() {
					return this;
				}
			});
			const bag = inst._zod.bag;
			inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
			inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
			inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? .5);
			inst.isFinite = true;
			inst.format = bag.format ?? null;
		});
		function number(params) {
			return /* @__PURE__ */ _number(ZodNumber, params);
		}
		const ZodNumberFormat = /*@__PURE__*/ $constructor("ZodNumberFormat", (inst, def) => {
			$ZodNumberFormat.init(inst, def);
			ZodNumber.init(inst, def);
		});
		function int(params) {
			return /* @__PURE__ */ _int(ZodNumberFormat, params);
		}
		const ZodBoolean = /*@__PURE__*/ $constructor("ZodBoolean", (inst, def) => {
			$ZodBoolean.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => booleanProcessor(inst, ctx, json, params);
		});
		function boolean(params) {
			return /* @__PURE__ */ _boolean(ZodBoolean, params);
		}
		const ZodUnknown = /*@__PURE__*/ $constructor("ZodUnknown", (inst, def) => {
			$ZodUnknown.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => void 0;
		});
		function unknown() {
			return /* @__PURE__ */ _unknown(ZodUnknown);
		}
		const ZodNever = /*@__PURE__*/ $constructor("ZodNever", (inst, def) => {
			$ZodNever.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => neverProcessor(inst, ctx, json, params);
		});
		function never(params) {
			return /* @__PURE__ */ _never(ZodNever, params);
		}
		const ZodArray = /*@__PURE__*/ $constructor("ZodArray", (inst, def) => {
			$ZodArray.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => arrayProcessor(inst, ctx, json, params);
			inst.element = def.element;
			_installLazyMethods(inst, "ZodArray", {
				min(n, params) {
					return this.check(/* @__PURE__ */ _minLength(n, params));
				},
				nonempty(params) {
					return this.check(/* @__PURE__ */ _minLength(1, params));
				},
				max(n, params) {
					return this.check(/* @__PURE__ */ _maxLength(n, params));
				},
				length(n, params) {
					return this.check(/* @__PURE__ */ _length(n, params));
				},
				unwrap() {
					return this.element;
				}
			});
		});
		function array(element, params) {
			return /* @__PURE__ */ _array(ZodArray, element, params);
		}
		const ZodObject = /*@__PURE__*/ $constructor("ZodObject", (inst, def) => {
			$ZodObjectJIT.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => objectProcessor(inst, ctx, json, params);
			defineLazy(inst, "shape", () => {
				return def.shape;
			});
			_installLazyMethods(inst, "ZodObject", {
				keyof() {
					return _enum(Object.keys(this._zod.def.shape));
				},
				catchall(catchall) {
					return this.clone({
						...this._zod.def,
						catchall
					});
				},
				passthrough() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				loose() {
					return this.clone({
						...this._zod.def,
						catchall: unknown()
					});
				},
				strict() {
					return this.clone({
						...this._zod.def,
						catchall: never()
					});
				},
				strip() {
					return this.clone({
						...this._zod.def,
						catchall: void 0
					});
				},
				extend(incoming) {
					return extend(this, incoming);
				},
				safeExtend(incoming) {
					return safeExtend(this, incoming);
				},
				merge(other) {
					return merge(this, other);
				},
				pick(mask) {
					return pick(this, mask);
				},
				omit(mask) {
					return omit(this, mask);
				},
				partial(...args) {
					return partial(ZodOptional, this, args[0]);
				},
				required(...args) {
					return required(ZodNonOptional, this, args[0]);
				}
			});
		});
		function object(shape, params) {
			const def = {
				type: "object",
				shape: shape ?? {},
				...normalizeParams(params)
			};
			return new ZodObject(def);
		}
		const ZodUnion = /*@__PURE__*/ $constructor("ZodUnion", (inst, def) => {
			$ZodUnion.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => unionProcessor(inst, ctx, json, params);
			inst.options = def.options;
		});
		function union(options, params) {
			return new ZodUnion({
				type: "union",
				options,
				...normalizeParams(params)
			});
		}
		const ZodIntersection = /*@__PURE__*/ $constructor("ZodIntersection", (inst, def) => {
			$ZodIntersection.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => intersectionProcessor(inst, ctx, json, params);
		});
		function intersection(left, right) {
			return new ZodIntersection({
				type: "intersection",
				left,
				right
			});
		}
		const ZodEnum = /*@__PURE__*/ $constructor("ZodEnum", (inst, def) => {
			$ZodEnum.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => enumProcessor(inst, ctx, json, params);
			inst.enum = def.entries;
			inst.options = Object.values(def.entries);
			const keys = new Set(Object.keys(def.entries));
			inst.extract = (values, params) => {
				const newEntries = {};
				for (const value of values) if (keys.has(value)) newEntries[value] = def.entries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
			inst.exclude = (values, params) => {
				const newEntries = { ...def.entries };
				for (const value of values) if (keys.has(value)) delete newEntries[value];
				else throw new Error(`Key ${value} not found in enum`);
				return new ZodEnum({
					...def,
					checks: [],
					...normalizeParams(params),
					entries: newEntries
				});
			};
		});
		function _enum(values, params) {
			const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
			return new ZodEnum({
				type: "enum",
				entries,
				...normalizeParams(params)
			});
		}
		const ZodLiteral = /*@__PURE__*/ $constructor("ZodLiteral", (inst, def) => {
			$ZodLiteral.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => literalProcessor(inst, ctx, json, params);
			inst.values = new Set(def.values);
			Object.defineProperty(inst, "value", { get() {
				if (def.values.length > 1) throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
				return def.values[0];
			} });
		});
		function literal(value, params) {
			return new ZodLiteral({
				type: "literal",
				values: Array.isArray(value) ? value : [value],
				...normalizeParams(params)
			});
		}
		const ZodTransform = /*@__PURE__*/ $constructor("ZodTransform", (inst, def) => {
			$ZodTransform.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => transformProcessor(inst, ctx, json, params);
			inst._zod.parse = (payload, _ctx) => {
				if (_ctx.direction === "backward") throw new $ZodEncodeError(inst.constructor.name);
				payload.addIssue = (issue$1) => {
					if (typeof issue$1 === "string") payload.issues.push(issue(issue$1, payload.value, def));
					else {
						const _issue = issue$1;
						if (_issue.fatal) _issue.continue = false;
						_issue.code ?? (_issue.code = "custom");
						_issue.input ?? (_issue.input = payload.value);
						_issue.inst ?? (_issue.inst = inst);
						payload.issues.push(issue(_issue));
					}
				};
				const output = def.transform(payload.value, payload);
				if (output instanceof Promise) return output.then((output) => {
					payload.value = output;
					payload.fallback = true;
					return payload;
				});
				payload.value = output;
				payload.fallback = true;
				return payload;
			};
		});
		function transform(fn) {
			return new ZodTransform({
				type: "transform",
				transform: fn
			});
		}
		const ZodOptional = /*@__PURE__*/ $constructor("ZodOptional", (inst, def) => {
			$ZodOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function optional(innerType) {
			return new ZodOptional({
				type: "optional",
				innerType
			});
		}
		const ZodExactOptional = /*@__PURE__*/ $constructor("ZodExactOptional", (inst, def) => {
			$ZodExactOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => optionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function exactOptional(innerType) {
			return new ZodExactOptional({
				type: "optional",
				innerType
			});
		}
		const ZodNullable = /*@__PURE__*/ $constructor("ZodNullable", (inst, def) => {
			$ZodNullable.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nullableProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nullable(innerType) {
			return new ZodNullable({
				type: "nullable",
				innerType
			});
		}
		const ZodDefault = /*@__PURE__*/ $constructor("ZodDefault", (inst, def) => {
			$ZodDefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => defaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeDefault = inst.unwrap;
		});
		function _default(innerType, defaultValue) {
			return new ZodDefault({
				type: "default",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodPrefault = /*@__PURE__*/ $constructor("ZodPrefault", (inst, def) => {
			$ZodPrefault.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => prefaultProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function prefault(innerType, defaultValue) {
			return new ZodPrefault({
				type: "prefault",
				innerType,
				get defaultValue() {
					return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
				}
			});
		}
		const ZodNonOptional = /*@__PURE__*/ $constructor("ZodNonOptional", (inst, def) => {
			$ZodNonOptional.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => nonoptionalProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function nonoptional(innerType, params) {
			return new ZodNonOptional({
				type: "nonoptional",
				innerType,
				...normalizeParams(params)
			});
		}
		const ZodCatch = /*@__PURE__*/ $constructor("ZodCatch", (inst, def) => {
			$ZodCatch.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => catchProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
			inst.removeCatch = inst.unwrap;
		});
		function _catch(innerType, catchValue) {
			return new ZodCatch({
				type: "catch",
				innerType,
				catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
			});
		}
		const ZodPipe = /*@__PURE__*/ $constructor("ZodPipe", (inst, def) => {
			$ZodPipe.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => pipeProcessor(inst, ctx, json, params);
			inst.in = def.in;
			inst.out = def.out;
		});
		function pipe(in_, out) {
			return new ZodPipe({
				type: "pipe",
				in: in_,
				out
			});
		}
		const ZodReadonly = /*@__PURE__*/ $constructor("ZodReadonly", (inst, def) => {
			$ZodReadonly.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => readonlyProcessor(inst, ctx, json, params);
			inst.unwrap = () => inst._zod.def.innerType;
		});
		function readonly(innerType) {
			return new ZodReadonly({
				type: "readonly",
				innerType
			});
		}
		const ZodCustom = /*@__PURE__*/ $constructor("ZodCustom", (inst, def) => {
			$ZodCustom.init(inst, def);
			ZodType.init(inst, def);
			inst._zod.processJSONSchema = (ctx, json, params) => customProcessor(inst, ctx, json, params);
		});
		function refine(fn, _params = {}) {
			return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
		}
		function superRefine(fn, params) {
			return /* @__PURE__ */ _superRefine(fn, params);
		}
		//#endregion
		//#region ../../vendor/deepseek-harness/packages/experimental/agent-team/lib/typert.remote-client.js
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_createTask_parameter_0$schema = intersection(string(), unknown());
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_createTask_parameter_1$schema = object({
			"subject": string().readonly(),
			"description": string().readonly(),
			"blockedBy": array(intersection(string(), unknown())).readonly().optional(),
			"writeScopes": array(string()).readonly().optional()
		});
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_createTask_result$schema = union([object({
			"ok": literal(true).readonly(),
			"value": object({
				"id": intersection(string(), unknown()).readonly(),
				"revision": number().readonly(),
				"subject": string().readonly(),
				"description": string().readonly(),
				"status": union([
					literal("pending"),
					literal("in_progress"),
					literal("completed"),
					literal("deleted")
				]).readonly(),
				"blockedBy": array(intersection(string(), unknown())).readonly(),
				"writeScopes": array(string()).readonly(),
				"ownerName": string().readonly().optional(),
				"ready": boolean().readonly(),
				"writeScopeWarnings": array(string()).readonly()
			}).readonly()
		}), object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([literal("team-task-conflict"), literal("team-rejected")]).readonly(),
				"message": string().readonly()
			}).readonly()
		})]);
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_updateTask_parameter_0$schema = intersection(string(), unknown());
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_updateTask_parameter_1$schema = object({
			"taskId": intersection(string(), unknown()).readonly(),
			"expectedRevision": number().readonly(),
			"action": union([
				literal("complete"),
				literal("edit"),
				literal("claim"),
				literal("release"),
				literal("set_dependencies"),
				literal("reopen"),
				literal("reassign"),
				literal("delete")
			]).readonly(),
			"subject": string().readonly().optional(),
			"description": string().readonly().optional(),
			"blockedBy": array(intersection(string(), unknown())).readonly().optional(),
			"writeScopes": array(string()).readonly().optional(),
			"owner": string().readonly().optional()
		});
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_updateTask_result$schema = union([object({
			"ok": literal(true).readonly(),
			"value": object({
				"id": intersection(string(), unknown()).readonly(),
				"revision": number().readonly(),
				"subject": string().readonly(),
				"description": string().readonly(),
				"status": union([
					literal("pending"),
					literal("in_progress"),
					literal("completed"),
					literal("deleted")
				]).readonly(),
				"blockedBy": array(intersection(string(), unknown())).readonly(),
				"writeScopes": array(string()).readonly(),
				"ownerName": string().readonly().optional(),
				"ready": boolean().readonly(),
				"writeScopeWarnings": array(string()).readonly()
			}).readonly()
		}), object({
			"ok": literal(false).readonly(),
			"error": object({
				"code": union([literal("team-task-conflict"), literal("team-rejected")]).readonly(),
				"message": string().readonly()
			}).readonly()
		})]);
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_view_parameter_0$schema = intersection(string(), unknown());
		const _deepseek_ai_dsh_experimental_agent_team_agentTeams_view_result$schema = object({
			"members": array(object({
				"id": intersection(string(), unknown()).readonly(),
				"name": string().readonly(),
				"role": union([literal("lead"), literal("teammate")]).readonly(),
				"status": union([
					literal("running"),
					literal("failed"),
					literal("idle"),
					literal("inactive"),
					literal("provisioning")
				]).readonly(),
				"description": string().readonly().optional(),
				"provider": string().readonly().optional(),
				"context": union([literal("fresh"), literal("fork")]).readonly().optional(),
				"model": string().readonly().optional(),
				"diagnostics": array(string()).readonly()
			})).readonly(),
			"tasks": array(object({
				"id": intersection(string(), unknown()).readonly(),
				"revision": number().readonly(),
				"subject": string().readonly(),
				"description": string().readonly(),
				"status": union([
					literal("pending"),
					literal("in_progress"),
					literal("completed"),
					literal("deleted")
				]).readonly(),
				"blockedBy": array(intersection(string(), unknown())).readonly(),
				"writeScopes": array(string()).readonly(),
				"ownerName": string().readonly().optional(),
				"ready": boolean().readonly(),
				"writeScopeWarnings": array(string()).readonly()
			})).readonly()
		});
		const TYPERT_REMOTE = {
			package: "@deepseek-ai/dsh-experimental-agent-team",
			descriptors: [
				{
					id: "@deepseek-ai/dsh-experimental-agent-team#agentTeams/createTask",
					service: "agentTeams",
					namespace: "agentTeams",
					method: "createTask",
					implementation: "remoteCreateTask",
					invocation: { kind: "direct" },
					scope: {
						context: "agent",
						wire: "agentId"
					},
					parameters: [{
						name: "agent",
						wire: "agentId",
						source: "lookup",
						lookup: "agent",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
							schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_createTask_parameter_0$schema
						}
					}, {
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-agent-team/client#CreateTeamTaskRequest",
							schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_createTask_parameter_1$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-agent-team/client#TeamTaskMutationResult",
						schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_createTask_result$schema
					},
					sourceLocation: {
						"file": "packages/experimental/agent-team/src/index.ts",
						"line": 248,
						"column": 3
					}
				},
				{
					id: "@deepseek-ai/dsh-experimental-agent-team#agentTeams/updateTask",
					service: "agentTeams",
					namespace: "agentTeams",
					method: "updateTask",
					implementation: "remoteUpdateTask",
					invocation: { kind: "direct" },
					scope: {
						context: "agent",
						wire: "agentId"
					},
					parameters: [{
						name: "agent",
						wire: "agentId",
						source: "lookup",
						lookup: "agent",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
							schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_updateTask_parameter_0$schema
						}
					}, {
						name: "request",
						wire: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-experimental-agent-team/client#UpdateTeamTaskRequest",
							schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_updateTask_parameter_1$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-agent-team/client#TeamTaskMutationResult",
						schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_updateTask_result$schema
					},
					sourceLocation: {
						"file": "packages/experimental/agent-team/src/index.ts",
						"line": 259,
						"column": 3
					}
				},
				{
					id: "@deepseek-ai/dsh-experimental-agent-team#agentTeams/view",
					service: "agentTeams",
					namespace: "agentTeams",
					method: "view",
					implementation: "remoteView",
					invocation: { kind: "direct" },
					scope: {
						context: "agent",
						wire: "agentId"
					},
					parameters: [{
						name: "agent",
						wire: "agentId",
						source: "lookup",
						lookup: "agent",
						codec: {
							mode: "strict",
							typeSymbol: "@deepseek-ai/dsh-session/types#SessionId",
							schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_view_parameter_0$schema
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@deepseek-ai/dsh-experimental-agent-team/client#TeamView",
						schema: _deepseek_ai_dsh_experimental_agent_team_agentTeams_view_result$schema
					},
					sourceLocation: {
						"file": "packages/experimental/agent-team/src/index.ts",
						"line": 234,
						"column": 3
					}
				}
			]
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* Mission Control's own dictionary.
		*
		* Surface NAMES are not here — those belong to `@dsh-portable/ui-mode`, which
		* owns the roster every switch renders. This namespace covers only the mission
		* vocabulary: the board, the roster, the brief and the thread.
		* @module @dsh-portable/crew-ui/client/locales
		*/
		/** Namespace this surface registers its dictionaries under. */
		const CREW_NS = "crew";
		const en = {
			"app.title": "Mission Control",
			"nav.missions": "Missions",
			"nav.newMission": "New mission",
			"nav.openWorkspace": "Open workspace",
			"nav.noMissions": "No missions yet.",
			"nav.noMissionsBody": "Open a workspace and start a mission to build a board.",
			"nav.untitled": "Untitled mission",
			"nav.missionPresetFailed": "This mission did not start on the crew composition: {reason}",
			"nav.collapse": "Collapse missions",
			"nav.expand": "Expand missions",
			"nav.searchPlaceholder": "Search missions",
			"nav.noSearchResults": "No matching missions.",
			"nav.noSearchResultsBody": "Try a different name or clear the search.",
			"nav.roster": "Roster",
			"nav.hideRoster": "Hide roster",
			"nav.showRoster": "Show roster",
			"tab.crew": "Crew",
			"tab.board": "Board",
			"tab.brief": "Brief",
			"tab.dossier": "Dossier",
			"tab.thread": "Thread",
			"inspector.title": "Inspector",
			"inspector.open": "Open Inspector",
			"inspector.close": "Close Inspector",
			"board.pending": "Ready",
			"board.in_progress": "In progress",
			"board.completed": "Done",
			"board.empty": "Nothing here yet.",
			"board.emptyPending": "Add a task, or ask the Lead to plan the work.",
			"board.addTask": "Add task",
			"board.loading": "Loading the board…",
			"board.noMission": "Select a mission to see its board.",
			"board.count": "{count}",
			"board.blockedBy": "Waits for",
			"board.scopes": "Writes",
			"board.owner": "Owner",
			"board.unowned": "Unassigned",
			"board.blocked": "Blocked",
			"board.ready": "Ready to start",
			"board.conflict": "Overlapping write scope",
			"board.retry": "Retry",
			"board.dismiss": "Dismiss",
			"board.refresh": "Refresh",
			"task.subject": "Title",
			"task.subjectPlaceholder": "What needs doing",
			"task.description": "Details",
			"task.descriptionPlaceholder": "Enough for a teammate to start without asking",
			"task.blockers": "Waits for",
			"task.blockersPlaceholder": "Task ids, comma separated",
			"task.scopes": "Write scopes",
			"task.scopesPlaceholder": "Paths this task will change, comma separated",
			"task.save": "Save",
			"task.cancel": "Cancel",
			"task.edit": "Edit",
			"task.delete": "Delete",
			"task.complete": "Complete",
			"task.reopen": "Reopen",
			"task.release": "Release",
			"task.assign": "Assign to",
			"task.assignNobody": "Nobody",
			"roster.title": "Crew",
			"roster.lead": "Lead",
			"roster.teammate": "Teammate",
			"roster.empty": "No teammates yet.",
			"roster.emptyBody": "The Lead creates teammates when work is genuinely parallel.",
			"roster.open": "Open thread",
			"roster.status.running": "Working",
			"roster.status.idle": "Idle",
			"roster.status.inactive": "Not loaded",
			"roster.status.provisioning": "Starting",
			"roster.status.failed": "Failed",
			"brief.title": "Brief",
			"brief.mode": "Mode",
			"brief.workspace": "Workspace",
			"brief.tasks": "Tasks",
			"brief.tasksValue": "{done} of {total} done",
			"brief.crew": "Crew",
			"brief.crewValue": "{count} member(s)",
			"brief.warnings": "Write-scope conflicts",
			"brief.noWarnings": "None",
			"brief.locked": "A running mission keeps the mode it started with.",
			"thread.empty": "No messages yet.",
			"thread.emptyBody": "Start a mission and ask the Lead to coordinate the work.",
			"thread.lead": "Lead",
			"thread.work": "{count} work step(s)",
			"thread.placeholder": "Message the Lead",
			"thread.send": "Send",
			"thread.addContext": "Add context",
			"thread.attach": "Attach a file",
			"thread.composerHint": "Enter to send · Shift+Enter for a new line",
			"dossier.title": "Dossier",
			"dossier.attach": "Attach",
			"dossier.attachPlaceholder": "Path of a spec, doc or log to attach",
			"dossier.search": "Find",
			"dossier.searchPlaceholder": "Search the attached sources",
			"dossier.loading": "Reading the dossier…",
			"dossier.empty": "Nothing attached yet.",
			"dossier.emptyBody": "Attach a spec or a design note and the crew can quote it, with a link back to the exact passage.",
			"dossier.sections": "{count} section(s)",
			"dossier.retry": "Try again",
			"settings.title": "Settings",
			"settings.back": "Back to mission",
			"error.title": "Something went wrong"
		};
		const zh = {
			"app.title": "任务指挥台",
			"nav.missions": "任务",
			"nav.newMission": "新建任务",
			"nav.openWorkspace": "打开工作区",
			"nav.noMissions": "暂无任务。",
			"nav.noMissionsBody": "打开一个工作区并新建任务，看板会随之建立。",
			"nav.untitled": "未命名任务",
			"nav.missionPresetFailed": "本任务未能以团队模式启动：{reason}",
			"nav.collapse": "收起任务列表",
			"nav.expand": "展开任务列表",
			"nav.searchPlaceholder": "搜索任务",
			"nav.noSearchResults": "没有匹配的任务。",
			"nav.noSearchResultsBody": "试试其他名称，或清空搜索。",
			"nav.roster": "花名册",
			"nav.hideRoster": "隐藏花名册",
			"nav.showRoster": "显示花名册",
			"tab.crew": "团队",
			"tab.board": "看板",
			"tab.brief": "简报",
			"tab.dossier": "资料",
			"tab.thread": "会话",
			"inspector.title": "检查器",
			"inspector.open": "打开检查器",
			"inspector.close": "关闭检查器",
			"board.pending": "待办",
			"board.in_progress": "进行中",
			"board.completed": "已完成",
			"board.empty": "这里还没有内容。",
			"board.emptyPending": "添加一个任务，或让 Lead 先规划工作。",
			"board.addTask": "添加任务",
			"board.loading": "正在加载看板…",
			"board.noMission": "选择一个任务以查看它的看板。",
			"board.count": "{count}",
			"board.blockedBy": "依赖",
			"board.scopes": "写入",
			"board.owner": "负责人",
			"board.unowned": "未指派",
			"board.blocked": "被阻塞",
			"board.ready": "可以开始",
			"board.conflict": "写入范围重叠",
			"board.retry": "重试",
			"board.dismiss": "忽略",
			"board.refresh": "刷新",
			"task.subject": "标题",
			"task.subjectPlaceholder": "需要完成什么",
			"task.description": "详情",
			"task.descriptionPlaceholder": "足以让队友无需再问即可开始",
			"task.blockers": "依赖",
			"task.blockersPlaceholder": "任务 id，用逗号分隔",
			"task.scopes": "写入范围",
			"task.scopesPlaceholder": "本任务会改动的路径，用逗号分隔",
			"task.save": "保存",
			"task.cancel": "取消",
			"task.edit": "编辑",
			"task.delete": "删除",
			"task.complete": "完成",
			"task.reopen": "重新打开",
			"task.release": "释放",
			"task.assign": "指派给",
			"task.assignNobody": "无",
			"roster.title": "团队",
			"roster.lead": "Lead",
			"roster.teammate": "队友",
			"roster.empty": "还没有队友。",
			"roster.emptyBody": "只有当工作确实可以并行时，Lead 才会创建队友。",
			"roster.open": "打开会话",
			"roster.status.running": "工作中",
			"roster.status.idle": "空闲",
			"roster.status.inactive": "未载入",
			"roster.status.provisioning": "启动中",
			"roster.status.failed": "失败",
			"brief.title": "简报",
			"brief.mode": "模式",
			"brief.workspace": "工作区",
			"brief.tasks": "任务",
			"brief.tasksValue": "已完成 {done} / {total}",
			"brief.crew": "团队",
			"brief.crewValue": "{count} 名成员",
			"brief.warnings": "写入范围冲突",
			"brief.noWarnings": "无",
			"brief.locked": "已开始的任务会保持它启动时的模式。",
			"thread.empty": "还没有消息。",
			"thread.emptyBody": "新建一个任务，让 Lead 协调工作。",
			"thread.lead": "Lead",
			"thread.work": "{count} 个工作步骤",
			"thread.placeholder": "向 Lead 发送消息",
			"thread.send": "发送",
			"thread.addContext": "添加上下文",
			"thread.attach": "附加文件",
			"thread.composerHint": "回车发送 · Shift+回车换行",
			"dossier.title": "资料档案",
			"dossier.attach": "附加",
			"dossier.attachPlaceholder": "要附加的规格、文档或日志路径",
			"dossier.search": "查找",
			"dossier.searchPlaceholder": "在已附加的资料中检索",
			"dossier.loading": "正在读取资料档案…",
			"dossier.empty": "尚未附加任何资料。",
			"dossier.emptyBody": "附加一份规格或设计说明，团队即可引用它，并给出可回到原文段落的链接。",
			"dossier.sections": "{count} 个章节",
			"dossier.retry": "重试",
			"settings.title": "设置",
			"settings.back": "返回任务",
			"error.title": "出现了问题"
		};
		//#endregion
		//#region src/client/state/runtime.ts
		/**
		* Mission Control's single view of the DSH client services.
		*
		* The plugin body resolves every service once and hands this object to the
		* React tree through one context, so no component reaches for a cordis context
		* of its own and every capability this surface depends on is the surface of
		* this file. Mission Control adds no state that duplicates the Host: sessions,
		* workspaces, conversations, presets and the task board are all read through
		* their owning services.
		* @module @dsh-portable/crew-ui/client/state/runtime
		*/
		const RuntimeContext = (0, react.createContext)(void 0);
		/** Provider for {@link useRuntime}. */
		const CrewRuntimeProvider = RuntimeContext.Provider;
		/**
		* Read the Host services.
		* @returns the runtime.
		* @throws {Error} when rendered outside the provider, which is a wiring bug.
		*/
		function useRuntime() {
			const runtime = (0, react.useContext)(RuntimeContext);
			if (runtime === void 0) throw new Error("crew-ui: useRuntime() outside CrewRuntimeProvider");
			return runtime;
		}
		//#endregion
		//#region src/client/state/board.ts
		/**
		* The mission board: loading, live refresh, and compare-and-set mutation.
		*
		* The board is a SHARED artifact. The Lead writes tasks through its Team tools
		* and the operator writes them through this surface, against the same durable
		* records, so the two must not be modelled as "what the agent did" plus a
		* read-out. Three properties follow, and each is implemented here rather than
		* in a component:
		*
		* - **Every write is compare-and-set.** A task carries a `revision`; the host
		*   rejects an update derived from a stale copy with `team-task-conflict`.
		*   That is the case where the agent moved the task while the operator was
		*   typing, and it is common rather than exotic, so it is handled by reloading
		*   and telling the operator — never by retrying blind.
		* - **Refresh is push-triggered, not polled.** Team changes are durable session
		*   events, so the session snapshot advances whenever the board does.
		*   Subscribing to it and re-reading the authoritative view gives live updates
		*   without a timer and without a second source of truth.
		* - **A superseded read never lands.** Switching missions mid-flight, or a
		*   refresh overtaken by a mutation's own reload, must not repaint the board
		*   with an older answer; a generation counter drops those.
		* - **Transport failure is a failure like any other.** A Remote call resolves
		*   `ok: false` for a refusal the Host reasoned about, but REJECTS when the
		*   connection itself is gone. Both arms have to reach the same error line:
		*   an uncaught rejection would leave the board spinning on its first load, a
		*   click silently doing nothing, and nothing at all in the panel to say why.
		* @module @dsh-portable/crew-ui/client/state/board
		*/
		/** Render a Remote failure the way every official surface does. */
		function failureText(error) {
			return `${error.message} (${error.code})`;
		}
		/**
		* Render a thrown transport failure in the same shape as a Remote refusal.
		*
		* A dropped Host connection arrives as a rejection rather than an `ok: false`
		* envelope, and an operator reading the board should not have to tell the two
		* apart to understand that the board is not current.
		* @param error - whatever the rejected call threw.
		* @returns the message the error line shows.
		*/
		function transportText(error) {
			return failureText({
				code: "transport-failed",
				message: error instanceof Error ? error.message : String(error)
			});
		}
		/** Board columns, in the order work moves through them. */
		const BOARD_COLUMNS = [
			"pending",
			"in_progress",
			"completed"
		];
		/** Group tasks into board columns, dropping the deleted tombstones. */
		function groupTasks(tasks) {
			const grouped = {
				pending: [],
				in_progress: [],
				completed: []
			};
			for (const task of tasks) {
				if (task.status === "deleted") continue;
				grouped[task.status].push(task);
			}
			for (const column of BOARD_COLUMNS) grouped[column].sort((left, right) => Number(right.ready) - Number(left.ready));
			return grouped;
		}
		/**
		* Subjects of the tasks a task waits on, for a legible dependency chip.
		* @param task - the blocked task.
		* @param tasks - every task on the board.
		* @returns one label per blocker, falling back to the raw id when the blocker
		*   is gone — a dangling dependency is worth showing, not hiding.
		*/
		function blockerLabels(task, tasks) {
			return task.blockedBy.map((id) => {
				const blocker = tasks.find((candidate) => candidate.id === id);
				return blocker === void 0 ? String(id) : blocker.subject;
			});
		}
		/**
		* Resolve the session that OWNS the board.
		*
		* A teammate's session is a member of its Lead's team, and the board belongs to
		* the Lead. Opening a teammate and seeing an empty board would be wrong, so
		* every board call is addressed to the parent when there is one.
		* @param sessions - the session controller.
		* @param sessionId - the session currently in view.
		* @returns the Lead's session id.
		*/
		function leadSessionId(sessions, sessionId) {
			return sessions.subagentAddress(sessionId)?.parentSessionId ?? sessionId;
		}
		/**
		* Drive one mission's board.
		* @param sessionId - the session in view; a teammate resolves to its Lead.
		* @returns the board state and its mutation entry points.
		*/
		function useBoard(sessionId) {
			const runtime = useRuntime();
			const [view, setView] = (0, react.useState)(void 0);
			const [loading, setLoading] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const [pending, setPending] = (0, react.useState)(() => /* @__PURE__ */ new Set());
			const lead = (0, react.useMemo)(() => sessionId === void 0 ? void 0 : leadSessionId(runtime.sessions, sessionId), [runtime, sessionId]);
			const leadRef = (0, react.useRef)(lead);
			leadRef.current = lead;
			const generation = (0, react.useRef)(0);
			const read = (0, react.useCallback)(async (first) => {
				const target = leadRef.current;
				if (target === void 0) return;
				const mine = ++generation.current;
				if (first) setLoading(true);
				let result;
				try {
					result = await runtime.teams.view(target);
				} catch (error) {
					if (leadRef.current !== target || generation.current !== mine) return;
					setLoading(false);
					setError(transportText(error));
					return;
				}
				if (leadRef.current !== target || generation.current !== mine) return;
				setLoading(false);
				if (result.ok) {
					setView(result.value);
					setError(void 0);
					return;
				}
				setError(failureText(result.error));
			}, [runtime]);
			(0, react.useEffect)(() => {
				generation.current += 1;
				setView(void 0);
				setError(void 0);
				setPending(/* @__PURE__ */ new Set());
				if (lead === void 0) {
					setLoading(false);
					return;
				}
				read(true);
			}, [lead, read]);
			(0, react.useEffect)(() => {
				if (lead === void 0) return void 0;
				const binding = runtime.sessions.binding(lead);
				if (binding === void 0) return void 0;
				let queued;
				const stop = binding.session.subscribe(() => {
					if (queued !== void 0) return;
					queued = setTimeout(() => {
						queued = void 0;
						read(false);
					}, 120);
				});
				return () => {
					if (queued !== void 0) clearTimeout(queued);
					stop();
				};
			}, [
				lead,
				read,
				runtime
			]);
			const settle = (0, react.useCallback)(async (key, operation) => {
				const target = leadRef.current;
				if (target === void 0) return void 0;
				generation.current += 1;
				setPending((current) => new Set(current).add(key));
				try {
					let result;
					try {
						result = await operation(target);
					} catch (error) {
						if (leadRef.current !== target) return void 0;
						setError(transportText(error));
						return;
					}
					if (leadRef.current !== target) return void 0;
					if (!result.ok) {
						setError(failureText(result.error));
						return;
					}
					if (!result.value.ok) {
						if (result.value.error.code === "team-task-conflict") await read(false);
						if (leadRef.current !== target) return void 0;
						setError(failureText(result.value.error));
						return;
					}
					setError(void 0);
					await read(false);
					return leadRef.current === target ? result.value.value : void 0;
				} finally {
					if (leadRef.current === target) setPending((current) => {
						const next = new Set(current);
						next.delete(key);
						return next;
					});
				}
			}, [read]);
			const create = (0, react.useCallback)(async (request) => settle("create", (target) => runtime.teams.createTask(target, request)), [runtime, settle]);
			const update = (0, react.useCallback)(async (request) => settle(String(request.taskId), (target) => runtime.teams.updateTask(target, request)), [runtime, settle]);
			return {
				view,
				loading,
				error,
				pending,
				refresh: (0, react.useCallback)(async () => {
					await read(false);
				}, [read]),
				create,
				update,
				dismissError: (0, react.useCallback)(() => {
					setError(void 0);
				}, [])
			};
		}
		//#endregion
		//#region src/client/state/mission-preset.ts
		/**
		* Landing a new mission on the Crew composition.
		*
		* A mission is a crew mission because of the agent preset its session runs
		* under, and "New mission" has to produce one. It cannot simply pass the
		* preset to session creation: `uiWorkspace.startSession()` returns nothing, so
		* there is no id to select against, and `AgentPresets.select` refuses a session
		* that has already taken a turn.
		*
		* The Host's own rule, which this follows rather than reinvents, is to STAGE
		* the pick and apply it when a blank session becomes current — see
		* `ui-agent-preset`'s seat store. That works whichever order the two events
		* arrive in, and it is the same rule the official new-session chip obeys, so a
		* mission started here composes exactly like one started there.
		*
		* Failure is reported, never retried. A refusal means the session took a turn
		* before the stage landed, and re-selecting would be arguing with a Host that
		* has already answered.
		* @module @dsh-portable/crew-ui/client/state/mission-preset
		*/
		/** The agent preset a mission runs under. */
		const CREW_PRESET = "crew";
		/** The preset a session already runs under, when the projection carries one. */
		function presetOf(summary) {
			const value = summary?.projectionValues?.agentPreset;
			return typeof value === "string" ? value : void 0;
		}
		/**
		* Decide what a staged pick does about the current session.
		*
		* Pure and exported so the rule is covered without a renderer: this is the one
		* piece of Mission Control that has to agree with a Host invariant, and it is
		* the piece a refactor would most easily get wrong.
		* @param summary - the session that just became current, when there is one.
		* @returns the action to take.
		*/
		function stageAction(summary) {
			if (summary === void 0) return "wait";
			if (summary.blank !== true) return "spend";
			return presetOf(summary) === "crew" ? "spend" : "apply";
		}
		/**
		* Drive New-mission so the session it starts is a crew mission.
		* @param current - the session currently selected, or undefined.
		* @param summary - that session's summary.
		* @returns the entry point the rail calls, and any refusal to show.
		*/
		function useMissionPreset(current, summary) {
			const runtime = useRuntime();
			const [error, setError] = (0, react.useState)(void 0);
			const staged = (0, react.useRef)(false);
			const start = (0, react.useCallback)((workspaceId) => {
				const navigation = runtime.navigation;
				if (navigation === void 0) return;
				setError(void 0);
				staged.current = true;
				navigation.startSession(workspaceId);
			}, [runtime]);
			(0, react.useEffect)(() => {
				if (!staged.current || current === void 0) return;
				const presets = runtime.presets;
				if (presets === void 0) {
					staged.current = false;
					return;
				}
				const action = stageAction(summary);
				if (action === "wait") return;
				staged.current = false;
				if (action === "spend") return;
				let landed = true;
				presets.select(current, CREW_PRESET).then((result) => {
					if (!landed || result.ok) return;
					const detail = result.error.details?.reason;
					setError(typeof detail === "string" ? detail : result.error.message);
				}).catch((cause) => {
					if (!landed) return;
					setError(cause instanceof Error ? cause.message : String(cause));
				});
				return () => {
					landed = false;
				};
			}, [
				current,
				runtime,
				summary
			]);
			return {
				start,
				error,
				dismiss: (0, react.useCallback)(() => {
					setError(void 0);
				}, [])
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\MissionRail.module.css.mjs
		const css$10 = ".NOJzGG_root{box-sizing:border-box;color:#172033;flex-direction:column;width:100%;height:100%;min-height:0;display:flex}.NOJzGG_head{box-sizing:border-box;border-bottom:1px solid #e2e8f0;flex:none;justify-content:space-between;align-items:center;height:50px;padding:0 12px;display:flex}.NOJzGG_brand{color:#172033;align-items:center;gap:7px;min-width:0;font-size:13px;font-weight:600;line-height:18px;display:inline-flex}.NOJzGG_brand svg{color:#2563eb}.NOJzGG_iconButton,.NOJzGG_sectionAction{color:#64748b;cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;width:30px;height:30px;padding:0;display:inline-flex}.NOJzGG_iconButton:hover,.NOJzGG_sectionAction:hover,.NOJzGG_footerAction:hover{color:#172033;background:#eef0f3}.NOJzGG_search{box-sizing:border-box;color:#94a3b8;background:#eef0f3;border-radius:8px;flex:none;align-items:center;gap:7px;height:34px;margin:12px 12px 8px;padding:0 9px;display:flex}.NOJzGG_search input{color:#172033;width:100%;min-width:0;font:inherit;background:0 0;border:none;outline:none;padding:0;font-size:12px;line-height:18px}.NOJzGG_search input::placeholder{color:#94a3b8}.NOJzGG_sectionHead{color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;flex:none;justify-content:space-between;align-items:center;padding:4px 12px 6px 16px;font-size:11px;font-weight:600;line-height:16px;display:flex}.NOJzGG_sectionAction{width:24px;height:24px}.NOJzGG_list{flex-direction:column;flex:1;gap:2px;min-height:0;margin:0;padding:0 8px;list-style:none;display:flex;overflow-y:auto}.NOJzGG_row{box-sizing:border-box;color:#475569;width:100%;min-height:42px;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:9px;align-items:center;gap:9px;padding:8px 10px;font-size:12px;line-height:18px;display:flex}.NOJzGG_row:hover{color:#172033;background:#eef0f3}.NOJzGG_rowActive{color:#172033;background:#e0e3e8;font-weight:500}.NOJzGG_rowIcon{color:#2563eb;background:#eff6ff;border-radius:6px;flex:none;justify-content:center;align-items:center;width:20px;height:20px;display:inline-flex}.NOJzGG_rowTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.NOJzGG_empty{flex:1;padding:10px 18px}.NOJzGG_emptyTitle,.NOJzGG_emptyBody{color:#64748b;margin:0 0 5px;font-size:12px;line-height:18px}.NOJzGG_emptyTitle{color:#172033;font-weight:500}.NOJzGG_workspaceAction,.NOJzGG_footerAction{box-sizing:border-box;color:#64748b;width:100%;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;font-size:12px;line-height:18px;display:flex}.NOJzGG_workspaceAction{margin-top:10px;padding:7px 8px}.NOJzGG_workspaceAction:hover{color:#172033;background:#eef0f3}.NOJzGG_footer{border-top:1px solid #e2e8f0;flex-direction:column;flex:none;gap:2px;padding:10px 12px 12px;display:flex}.NOJzGG_footerAction{padding:7px 8px}.NOJzGG_collapsed{align-items:center;padding-top:10px}.NOJzGG_compactAction{color:#64748b;cursor:pointer;background:0 0;border:none;border-radius:9px;justify-content:center;align-items:center;width:32px;height:32px;display:inline-flex}.NOJzGG_compactAction:hover{color:#172033;background:#eef0f3}";
		const tagId$10 = "@dsh-portable/crew-ui/MissionRail.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$10) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$10;
			tag.textContent = css$10;
			document.head.appendChild(tag);
		}
		var MissionRail_module_css_default = {
			"brand": "NOJzGG_brand",
			"collapsed": "NOJzGG_collapsed",
			"compactAction": "NOJzGG_compactAction",
			"empty": "NOJzGG_empty",
			"emptyBody": "NOJzGG_emptyBody",
			"emptyTitle": "NOJzGG_emptyTitle",
			"footer": "NOJzGG_footer",
			"footerAction": "NOJzGG_footerAction",
			"head": "NOJzGG_head",
			"iconButton": "NOJzGG_iconButton",
			"list": "NOJzGG_list",
			"root": "NOJzGG_root",
			"row": "NOJzGG_row",
			"rowActive": "NOJzGG_rowActive",
			"rowIcon": "NOJzGG_rowIcon",
			"rowTitle": "NOJzGG_rowTitle",
			"search": "NOJzGG_search",
			"sectionAction": "NOJzGG_sectionAction",
			"sectionHead": "NOJzGG_sectionHead",
			"workspaceAction": "NOJzGG_workspaceAction"
		};
		//#endregion
		//#region src/client/shell/MissionRail.tsx
		/**
		* The Metis-style conversation rail.
		*
		* Mission summaries remain the source of truth, while the presentation adds
		* the search, new-chat and settings affordances that make the rail feel like a
		* persistent workspace rather than a board index.
		* @module @dsh-portable/crew-ui/client/shell/MissionRail
		*/
		/** The left conversation rail. */
		function MissionRail({ collapsed, currentSessionId, onSelect, onNewMission, onOpenWorkspace, onCollapse, onOpenSettings }) {
			const runtime = useRuntime();
			const { t } = runtime;
			const [query, setQuery] = (0, react.useState)("");
			const list = (0, react.useSyncExternalStore)(runtime.sessions.list.subscribe, runtime.sessions.list.getSnapshot, runtime.sessions.list.getSnapshot);
			const missions = (0, react.useMemo)(() => {
				const needle = query.trim().toLocaleLowerCase();
				return list.ids.map((id) => list.byId[id]).filter((summary) => summary !== void 0).filter((summary) => summary.origin !== "subagent" && (!summary.blank || summary.id === currentSessionId)).map((summary) => ({
					id: summary.id,
					title: summary.displayTitle !== "" ? summary.displayTitle : t("nav.untitled")
				})).filter((mission) => needle === "" || mission.title.toLocaleLowerCase().includes(needle));
			}, [
				currentSessionId,
				list,
				query,
				t
			]);
			if (collapsed) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
				className: `${MissionRail_module_css_default.root} ${MissionRail_module_css_default.collapsed}`,
				"aria-label": t("nav.missions"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: MissionRail_module_css_default.compactAction,
					title: t("nav.newMission"),
					"aria-label": t("nav.newMission"),
					onClick: onNewMission,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, {})
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("nav", {
				className: MissionRail_module_css_default.root,
				"aria-label": t("nav.missions"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: MissionRail_module_css_default.head,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: MissionRail_module_css_default.iconButton,
								title: t("nav.collapse"),
								"aria-label": t("nav.collapse"),
								onClick: onCollapse,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: MissionRail_module_css_default.brand,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("app.title") })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: MissionRail_module_css_default.iconButton,
								title: t("nav.newMission"),
								"aria-label": t("nav.newMission"),
								onClick: onNewMission,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutline16, {})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: MissionRail_module_css_default.search,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							value: query,
							placeholder: t("nav.searchPlaceholder"),
							"aria-label": t("nav.searchPlaceholder"),
							onChange: (event) => {
								setQuery(event.target.value);
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MissionRail_module_css_default.sectionHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("nav.missions") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: MissionRail_module_css_default.sectionAction,
							title: t("nav.openWorkspace"),
							"aria-label": t("nav.openWorkspace"),
							onClick: onOpenWorkspace,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: MissionRail_module_css_default.list,
						children: missions.map((mission) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: `${MissionRail_module_css_default.row} ${mission.id === currentSessionId ? MissionRail_module_css_default.rowActive : ""}`,
							"aria-current": mission.id === currentSessionId ? "true" : void 0,
							onClick: () => {
								onSelect(mission.id);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: MissionRail_module_css_default.rowIcon,
								"aria-hidden": true,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: MissionRail_module_css_default.rowTitle,
								children: mission.title
							})]
						}) }, mission.id))
					}),
					missions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: MissionRail_module_css_default.empty,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: MissionRail_module_css_default.emptyTitle,
								children: query.trim() === "" ? t("nav.noMissions") : t("nav.noSearchResults")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: MissionRail_module_css_default.emptyBody,
								children: query.trim() === "" ? t("nav.noMissionsBody") : t("nav.noSearchResultsBody")
							}),
							query.trim() === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: MissionRail_module_css_default.workspaceAction,
								onClick: onOpenWorkspace,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("nav.openWorkspace") })]
							}) : null
						]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("footer", {
						className: MissionRail_module_css_default.footer,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: MissionRail_module_css_default.footerAction,
							onClick: onOpenWorkspace,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("nav.openWorkspace") })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: MissionRail_module_css_default.footerAction,
							onClick: onOpenSettings,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSettingsOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("settings.title") })]
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\RosterPanel.module.css.mjs
		const css$9 = ".IUGZRq_root{color:#172033;flex-direction:column;height:100%;min-height:0;display:flex;overflow:hidden}.IUGZRq_head{flex:none;padding:16px 18px 8px}.IUGZRq_title{color:#64748b;text-transform:uppercase;letter-spacing:.04em;margin:0;font-size:11px;font-weight:600;line-height:16px}.IUGZRq_list{flex-direction:column;gap:3px;min-height:0;margin:0;padding:0 10px 14px;list-style:none;display:flex;overflow-y:auto}.IUGZRq_row{box-sizing:border-box;color:#172033;width:100%;font:inherit;text-align:left;cursor:pointer;background:0 0;border:none;border-radius:9px;align-items:center;gap:9px;padding:8px;font-size:12px;line-height:18px;display:flex}.IUGZRq_row:hover:not(:disabled),.IUGZRq_rowActive{background:#f1f5f9}.IUGZRq_row:disabled{cursor:default}.IUGZRq_avatar{color:#2563eb;background:#eff6ff;border-radius:9px;flex:none;justify-content:center;align-items:center;width:28px;height:28px;display:inline-flex}.IUGZRq_memberCopy{flex-direction:column;flex:1;min-width:0;display:flex}.IUGZRq_name{color:#172033;text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:18px;overflow:hidden}.IUGZRq_role{color:#94a3b8;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:16px;overflow:hidden}.IUGZRq_status{background:#94a3b8;border-radius:999px;flex:none;width:7px;height:7px}.IUGZRq_status[data-status=running]{background:#16a34a}.IUGZRq_status[data-status=failed]{background:#dc2626}.IUGZRq_status[data-status=provisioning]{background:#d97706}.IUGZRq_status[data-status=inactive]{opacity:.4}.IUGZRq_description,.IUGZRq_diagnostic{color:#64748b;margin:0 10px 5px 45px;font-size:11px;line-height:16px}.IUGZRq_diagnostic{color:#c2410c}.IUGZRq_empty{padding:4px 18px 14px}.IUGZRq_emptyTitle,.IUGZRq_emptyBody{color:#64748b;margin:0 0 4px;font-size:12px;line-height:18px}.IUGZRq_emptyTitle{color:#172033;font-weight:500}";
		const tagId$9 = "@dsh-portable/crew-ui/RosterPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$9) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$9;
			tag.textContent = css$9;
			document.head.appendChild(tag);
		}
		var RosterPanel_module_css_default = {
			"avatar": "IUGZRq_avatar",
			"description": "IUGZRq_description",
			"diagnostic": "IUGZRq_diagnostic",
			"empty": "IUGZRq_empty",
			"emptyBody": "IUGZRq_emptyBody",
			"emptyTitle": "IUGZRq_emptyTitle",
			"head": "IUGZRq_head",
			"list": "IUGZRq_list",
			"memberCopy": "IUGZRq_memberCopy",
			"name": "IUGZRq_name",
			"role": "IUGZRq_role",
			"root": "IUGZRq_root",
			"row": "IUGZRq_row",
			"rowActive": "IUGZRq_rowActive",
			"status": "IUGZRq_status",
			"title": "IUGZRq_title"
		};
		//#endregion
		//#region src/client/shell/RosterPanel.tsx
		/** Copy key for one member status. */
		function statusKey(status) {
			switch (status) {
				case "running": return "roster.status.running";
				case "idle": return "roster.status.idle";
				case "inactive": return "roster.status.inactive";
				case "provisioning": return "roster.status.provisioning";
				case "failed": return "roster.status.failed";
			}
		}
		/** The right-hand crew roster. */
		function RosterPanel({ members, currentSessionId, onOpenMember }) {
			const { t } = useRuntime();
			const teammates = members.filter((member) => member.role === "teammate");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
				className: RosterPanel_module_css_default.root,
				"aria-label": t("roster.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
						className: RosterPanel_module_css_default.head,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: RosterPanel_module_css_default.title,
							children: t("roster.title")
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: RosterPanel_module_css_default.list,
						children: members.map((member) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `${RosterPanel_module_css_default.row} ${member.id === currentSessionId ? RosterPanel_module_css_default.rowActive : ""}`,
								disabled: member.role === "lead",
								onClick: () => {
									onOpenMember(member);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: RosterPanel_module_css_default.avatar,
										"aria-hidden": true,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: RosterPanel_module_css_default.memberCopy,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: RosterPanel_module_css_default.name,
											children: member.name
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: RosterPanel_module_css_default.role,
											children: member.role === "lead" ? t("roster.lead") : t(statusKey(member.status))
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: RosterPanel_module_css_default.status,
										"data-status": member.status,
										"aria-hidden": true
									})
								]
							}),
							member.description === void 0 || member.description === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: RosterPanel_module_css_default.description,
								children: member.description
							}),
							member.diagnostics.map((diagnostic) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: RosterPanel_module_css_default.diagnostic,
								children: diagnostic
							}, diagnostic))
						] }, member.id))
					}),
					teammates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: RosterPanel_module_css_default.empty,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: RosterPanel_module_css_default.emptyTitle,
							children: t("roster.empty")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: RosterPanel_module_css_default.emptyBody,
							children: t("roster.emptyBody")
						})]
					}) : null
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\BriefView.module.css.mjs
		const css$8 = ".gdGLwa_root{flex-direction:column;gap:16px;min-height:0;padding:20px;display:flex;overflow-y:auto}.gdGLwa_title{margin:0;font-size:15px;font-weight:500;line-height:22px}.gdGLwa_facts{grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:0;display:grid}.gdGLwa_fact{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;flex-direction:column;gap:2px;padding:10px 12px;display:flex}.gdGLwa_fact dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}.gdGLwa_fact dd{margin:0;font-size:13px;line-height:20px}.gdGLwa_path{font-family:var(--dsw-font-mono,ui-monospace, monospace);word-break:break-all;font-size:11px}.gdGLwa_note,.gdGLwa_empty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.gdGLwa_section{flex-direction:column;gap:8px;display:flex}.gdGLwa_sectionTitle{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.04em;margin:0;font-size:11px;font-weight:500;line-height:18px}.gdGLwa_conflicts{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.gdGLwa_conflict{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;gap:8px;padding:8px 10px;font-size:12px;line-height:18px;display:flex}.gdGLwa_conflictTask{flex:none;font-weight:500}.gdGLwa_conflictBody{color:var(--dsw-alias-label-tertiary)}";
		const tagId$8 = "@dsh-portable/crew-ui/BriefView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		var BriefView_module_css_default = {
			"conflict": "gdGLwa_conflict",
			"conflictBody": "gdGLwa_conflictBody",
			"conflictTask": "gdGLwa_conflictTask",
			"conflicts": "gdGLwa_conflicts",
			"empty": "gdGLwa_empty",
			"fact": "gdGLwa_fact",
			"facts": "gdGLwa_facts",
			"note": "gdGLwa_note",
			"path": "gdGLwa_path",
			"root": "gdGLwa_root",
			"section": "gdGLwa_section",
			"sectionTitle": "gdGLwa_sectionTitle",
			"title": "gdGLwa_title"
		};
		//#endregion
		//#region src/client/shell/BriefView.tsx
		/** The mission summary tab. */
		function BriefView({ view, presetId, cwd }) {
			const { t } = useRuntime();
			const tasks = (view?.tasks ?? []).filter((task) => task.status !== "deleted");
			const done = tasks.filter((task) => task.status === "completed").length;
			const conflicts = tasks.flatMap((task) => task.writeScopeWarnings.map((warning) => ({
				subject: task.subject,
				warning
			})));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: BriefView_module_css_default.root,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: BriefView_module_css_default.title,
						children: t("brief.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("dl", {
						className: BriefView_module_css_default.facts,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: BriefView_module_css_default.fact,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("brief.mode") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: presetId ?? "—" })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: BriefView_module_css_default.fact,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("brief.workspace") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", {
									className: BriefView_module_css_default.path,
									children: cwd ?? "—"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: BriefView_module_css_default.fact,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("brief.tasks") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("brief.tasksValue", {
									done,
									total: tasks.length
								}) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: BriefView_module_css_default.fact,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("dt", { children: t("brief.crew") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("dd", { children: t("brief.crewValue", { count: view?.members.length ?? 0 }) })]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: BriefView_module_css_default.note,
						children: t("brief.locked")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: BriefView_module_css_default.section,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: BriefView_module_css_default.sectionTitle,
							children: t("brief.warnings")
						}), conflicts.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: BriefView_module_css_default.empty,
							children: t("brief.noWarnings")
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: BriefView_module_css_default.conflicts,
							children: conflicts.map((conflict) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								className: BriefView_module_css_default.conflict,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: BriefView_module_css_default.conflictTask,
									children: conflict.subject
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: BriefView_module_css_default.conflictBody,
									children: conflict.warning
								})]
							}, `${conflict.subject}:${conflict.warning}`))
						})]
					})
				]
			});
		}
		//#endregion
		//#region src/client/state/thread.ts
		/** Concatenate the text blocks of a node, ignoring reasoning and media. */
		function textOf(blocks) {
			if (!Array.isArray(blocks)) return "";
			return blocks.flatMap((block) => block.kind === "text" && typeof block.text === "string" ? [block.text] : []).join("").trim();
		}
		/**
		* Fold conversation nodes into the compact log.
		*
		* Consecutive tool results collapse into one "worked" row: the count is the
		* useful part here, and one row per call would bury the answer that follows it.
		* @param nodes - ordered conversation nodes.
		* @returns entries in display order.
		*/
		function foldThread(nodes) {
			const entries = [];
			for (const node of nodes) {
				const id = String(node.id ?? entries.length);
				switch (node.kind) {
					case "user":
					case "steering": {
						const text = textOf(node.content);
						if (text !== "") entries.push({
							kind: "said",
							id,
							who: "user",
							text
						});
						break;
					}
					case "assistant": {
						const text = textOf(node.blocks);
						if (text !== "") entries.push({
							kind: "said",
							id,
							who: "agent",
							text
						});
						break;
					}
					case "tool-result": {
						const last = entries[entries.length - 1];
						if (last?.kind === "work") entries[entries.length - 1] = {
							...last,
							count: last.count + 1
						};
						else entries.push({
							kind: "work",
							id,
							count: 1
						});
						break;
					}
					case "turn-error":
					case "model-retry":
					case "turn-max-tokens": entries.push({
						kind: "note",
						id,
						text: node.kind
					});
				}
			}
			return entries;
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\ThreadView.module.css.mjs
		const css$7 = ".yghzXG_root{background:#fff;flex:1;min-height:0;overflow-y:auto}.yghzXG_lane{box-sizing:border-box;flex-direction:column;gap:28px;width:min(620px,100% - 48px);margin:0 auto;padding:32px 0 38px;list-style:none;display:flex}.yghzXG_entry{margin:0}.yghzXG_userTurn{justify-content:flex-end;display:flex}.yghzXG_userBubble{color:#172033;white-space:pre-wrap;background:#e0e3e8;border-radius:16px 16px 4px;max-width:82%;margin:0;padding:10px 14px;font-size:14px;line-height:22px}.yghzXG_agentTurn{flex-direction:column;gap:8px;display:flex}.yghzXG_agentHeader{color:#64748b;align-items:center;gap:8px;font-size:12px;font-weight:600;line-height:18px;display:flex}.yghzXG_agentAvatar,.yghzXG_emptyMark{color:#2563eb;background:#eff6ff;justify-content:center;align-items:center;display:inline-flex}.yghzXG_agentAvatar{border-radius:7px;width:22px;height:22px}.yghzXG_agentText{color:#172033;white-space:pre-wrap;margin:0 0 0 30px;font-size:14px;line-height:1.68}.yghzXG_work{color:#64748b;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;align-items:center;gap:8px;margin-left:30px;padding:7px 10px;font-size:12px;line-height:18px;display:inline-flex}.yghzXG_workIcon{color:#2563eb;display:inline-flex}.yghzXG_note{color:#c2410c;background:#fff7ed;border-radius:9px;align-items:center;gap:8px;margin-left:30px;padding:8px 10px;font-size:12px;line-height:18px;display:flex}.yghzXG_note svg{flex:none}.yghzXG_empty{text-align:center;flex-direction:column;flex:1;justify-content:center;align-items:center;gap:8px;min-height:0;padding:40px 24px;display:flex}.yghzXG_emptyMark{border-radius:20px;width:64px;height:64px;margin-bottom:4px}.yghzXG_empty h2{color:#172033;margin:0;font-size:22px;font-weight:600;line-height:30px}.yghzXG_empty p{color:#64748b;max-width:360px;margin:0;font-size:14px;line-height:22px}@media (width<=620px){.yghzXG_lane{width:calc(100% - 28px);padding-top:22px}.yghzXG_userBubble{max-width:90%}}";
		const tagId$7 = "@dsh-portable/crew-ui/ThreadView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		var ThreadView_module_css_default = {
			"agentAvatar": "yghzXG_agentAvatar",
			"agentHeader": "yghzXG_agentHeader",
			"agentText": "yghzXG_agentText",
			"agentTurn": "yghzXG_agentTurn",
			"empty": "yghzXG_empty",
			"emptyMark": "yghzXG_emptyMark",
			"entry": "yghzXG_entry",
			"lane": "yghzXG_lane",
			"note": "yghzXG_note",
			"root": "yghzXG_root",
			"userBubble": "yghzXG_userBubble",
			"userTurn": "yghzXG_userTurn",
			"work": "yghzXG_work",
			"workIcon": "yghzXG_workIcon"
		};
		//#endregion
		//#region src/client/shell/ThreadView.tsx
		/**
		* The chat-first conversation body.
		*
		* The Host still owns the conversation projection. This component only maps
		* that projection to Metis' visual rhythm: a centred message lane, right-sided
		* user bubbles, assistant turns, and compact work rows between answers.
		* @module @dsh-portable/crew-ui/client/shell/ThreadView
		*/
		/** The conversation log for one session. */
		function ThreadView({ sessionId }) {
			const runtime = useRuntime();
			const { t } = runtime;
			const source = (0, react.useMemo)(() => {
				if (sessionId === void 0) return void 0;
				return runtime.chatFeed(sessionId);
			}, [runtime, sessionId]);
			const snapshot = (0, react.useSyncExternalStore)(source?.subscribe ?? (() => () => {}), source?.getSnapshot ?? (() => void 0), source?.getSnapshot ?? (() => void 0));
			const entries = (0, react.useMemo)(() => snapshot === void 0 ? [] : foldThread(snapshot.legacy.nodes), [snapshot]);
			if (entries.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: ThreadView_module_css_default.empty,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: ThreadView_module_css_default.emptyMark,
						"aria-hidden": true,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("thread.empty") }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("thread.emptyBody") })
				]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: ThreadView_module_css_default.root,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
					className: ThreadView_module_css_default.lane,
					children: entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
						className: ThreadView_module_css_default.entry,
						children: entry.kind === "said" ? entry.who === "user" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("article", {
							className: ThreadView_module_css_default.userTurn,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ThreadView_module_css_default.userBubble,
								children: entry.text
							})
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: ThreadView_module_css_default.agentTurn,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
								className: ThreadView_module_css_default.agentHeader,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: ThreadView_module_css_default.agentAvatar,
									"aria-hidden": true,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("thread.lead") })]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: ThreadView_module_css_default.agentText,
								children: entry.text
							})]
						}) : entry.kind === "work" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ThreadView_module_css_default.work,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: ThreadView_module_css_default.workIcon,
								"aria-hidden": true,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, {})
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("thread.work", { count: entry.count }) })]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: ThreadView_module_css_default.note,
							role: "status",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: entry.text })]
						})
					}, entry.id))
				})
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\LeadComposer.module.css.mjs
		const css$6 = ".m8FmiG_root{box-sizing:border-box;background:#fff;flex:none;padding:10px 24px 18px}.m8FmiG_card{box-sizing:border-box;background:#fff;border:1px solid #cbd5e1;border-radius:14px;width:min(700px,100%);margin:0 auto;padding:10px 10px 8px;box-shadow:0 4px 14px #1720330f}.m8FmiG_input{box-sizing:border-box;resize:none;color:#172033;width:100%;min-height:54px;font:inherit;background:0 0;border:none;outline:none;padding:2px 3px 8px;font-size:14px;line-height:22px;display:block}.m8FmiG_input::placeholder{color:#94a3b8}.m8FmiG_toolbar{align-items:center;gap:6px;min-height:30px;display:flex}.m8FmiG_toolButton,.m8FmiG_send{width:30px;height:30px;font:inherit;cursor:pointer;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.m8FmiG_toolButton{color:#64748b;background:0 0}.m8FmiG_toolButton:hover{color:#172033;background:#eef0f3}.m8FmiG_presetChip{color:#64748b;text-overflow:ellipsis;white-space:nowrap;background:#f1f5f9;border-radius:7px;align-items:center;gap:5px;max-width:120px;margin-left:3px;padding:5px 8px;font-size:11px;line-height:16px;display:inline-flex;overflow:hidden}.m8FmiG_presetChip svg{color:#2563eb;flex:none}.m8FmiG_hint{color:#94a3b8;text-overflow:ellipsis;white-space:nowrap;min-width:0;margin-left:auto;font-size:11px;line-height:16px;overflow:hidden}.m8FmiG_send{color:#fff;background:#2563eb}.m8FmiG_send:hover:not(:disabled){background:#1d4ed8}.m8FmiG_send:disabled,.m8FmiG_toolButton:disabled{cursor:default;opacity:.45}@media (width<=620px){.m8FmiG_root{padding-left:12px;padding-right:12px}.m8FmiG_hint{display:none}}";
		const tagId$6 = "@dsh-portable/crew-ui/LeadComposer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var LeadComposer_module_css_default = {
			"card": "m8FmiG_card",
			"hint": "m8FmiG_hint",
			"input": "m8FmiG_input",
			"presetChip": "m8FmiG_presetChip",
			"root": "m8FmiG_root",
			"send": "m8FmiG_send",
			"toolButton": "m8FmiG_toolButton",
			"toolbar": "m8FmiG_toolbar"
		};
		//#endregion
		//#region src/client/shell/LeadComposer.tsx
		/**
		* The Metis-style composer for the mission's current thread.
		*
		* Draft and submission still belong to DSH's Conversation input service. The
		* richer shell is presentation only, which keeps a draft intact when the
		* operator moves between Crew and another surface.
		* @module @dsh-portable/crew-ui/client/shell/LeadComposer
		*/
		/** Send a message to the session in view. */
		function LeadComposer({ sessionId }) {
			const runtime = useRuntime();
			const { t } = runtime;
			const input = runtime.input(sessionId);
			const state = (0, react.useSyncExternalStore)(input?.subscribe ?? (() => () => {}), input?.getSnapshot ?? (() => void 0), input?.getSnapshot ?? (() => void 0));
			if (input === void 0) return null;
			const text = state?.text ?? "";
			const busy = state?.busy === true;
			const submit = () => {
				if (busy || text.trim() === "") return;
				input.submit();
			};
			const onKeyDown = (event) => {
				if (event.key !== "Enter" || event.shiftKey) return;
				event.preventDefault();
				submit();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: LeadComposer_module_css_default.root,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: LeadComposer_module_css_default.card,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: LeadComposer_module_css_default.input,
						value: text,
						rows: 3,
						placeholder: t("thread.placeholder"),
						"aria-label": t("thread.placeholder"),
						onChange: (event) => {
							input.setText(event.target.value);
						},
						onKeyDown
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: LeadComposer_module_css_default.toolbar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: LeadComposer_module_css_default.toolButton,
								disabled: true,
								title: t("thread.addContext"),
								"aria-label": t("thread.addContext"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: LeadComposer_module_css_default.toolButton,
								disabled: true,
								title: t("thread.attach"),
								"aria-label": t("thread.attach"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: LeadComposer_module_css_default.presetChip,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconAgentPresetOutline16, {}), t("thread.lead")]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: LeadComposer_module_css_default.hint,
								children: t("thread.composerHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: LeadComposer_module_css_default.send,
								disabled: busy || text.trim() === "",
								"aria-label": t("thread.send"),
								title: t("thread.send"),
								onClick: submit,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline14, {})
							})
						]
					})]
				})
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\CrewSettings.module.css.mjs
		const css$5 = "._AHuza_root{z-index:20;background:var(--dsw-alias-bg-page,var(--dsw-alias-bg-module-platform));flex-direction:column;display:flex;position:absolute;inset:0}._AHuza_head{border-bottom:1px solid var(--dsw-alias-border-l2);flex:none;align-items:center;gap:12px;padding:14px 20px;display:flex}._AHuza_title{flex:1;margin:0;font-size:15px;font-weight:500;line-height:22px}._AHuza_close{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;padding:4px 10px;font-size:12px}._AHuza_body{min-height:0;padding:4px 20px 20px;overflow-y:auto}";
		const tagId$5 = "@dsh-portable/crew-ui/CrewSettings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var CrewSettings_module_css_default = {
			"body": "_AHuza_body",
			"close": "_AHuza_close",
			"head": "_AHuza_head",
			"root": "_AHuza_root",
			"title": "_AHuza_title"
		};
		//#endregion
		//#region src/client/shell/CrewSettings.tsx
		/**
		* Mission Control's settings panel.
		*
		* It carries the interface switch, and it carries it because a surface an
		* operator cannot leave from the inside is a trap: the application menu is not
		* available in a browser tab, and every other surface offers the switch in its
		* own settings.
		*
		* The switch is not reimplemented here. `@dsh-portable/ui-mode` owns the roster
		* of surfaces and their names, and renders the same control in the official
		* General page, so all three surfaces present one list in one order with one
		* set of words.
		*
		* Deeper configuration — models, credentials, plugins, skills — is deliberately
		* NOT duplicated. `settings.section` has exactly one declarer, so a surface
		* cannot render the official pages and must reimplement each one; a second
		* partial copy of that catalogue would be a maintenance liability and a place
		* for the two to disagree about what is configured. The switch above is one
		* click from a surface that implements them in full.
		* @module @dsh-portable/crew-ui/client/shell/CrewSettings
		*/
		/** The settings overlay. */
		function CrewSettings({ onClose }) {
			const runtime = useRuntime();
			const { t, uiModeT } = runtime;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: CrewSettings_module_css_default.root,
				role: "dialog",
				"aria-modal": "true",
				"aria-label": t("settings.title"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: CrewSettings_module_css_default.head,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						className: CrewSettings_module_css_default.title,
						children: t("settings.title")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: CrewSettings_module_css_default.close,
						onClick: onClose,
						children: t("settings.back")
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: CrewSettings_module_css_default.body,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_dsh_portable_ui_mode_client.InterfaceSettingsSection, {
						mode: runtime.mode,
						t: uiModeT
					})
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\DossierPanel.module.css.mjs
		const css$4 = ".hcVqia_root{border-top:1px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;min-height:0;padding:12px;display:flex;overflow-y:auto}.hcVqia_head{flex:none}.hcVqia_title{color:var(--dsw-alias-label-tertiary);text-transform:uppercase;letter-spacing:.04em;margin:0;font-size:11px;font-weight:500;line-height:18px}.hcVqia_attach{gap:6px;display:flex}.hcVqia_input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);min-width:0;color:var(--dsw-alias-label-primary);font:inherit;background:0 0;border-radius:8px;flex:1;padding:4px 8px;font-size:11px;line-height:18px}.hcVqia_attach button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;flex:none;padding:3px 9px;font-size:11px}.hcVqia_attach button:disabled{opacity:.5;cursor:default}.hcVqia_error{color:var(--dsw-static-red-500,var(--dsw-alias-label-primary));align-items:baseline;gap:8px;margin:0;font-size:11px;line-height:16px;display:flex}.hcVqia_error>span{flex:1;min-width:0}.hcVqia_sources,.hcVqia_hits{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.hcVqia_source,.hcVqia_hit{border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:8px 10px}.hcVqia_sourceTitle{margin:0;font-size:12px;line-height:18px}.hcVqia_sourceMeta,.hcVqia_notice,.hcVqia_emptyTitle,.hcVqia_emptyBody{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:16px}.hcVqia_unread{color:var(--dsw-static-orange-500,var(--dsw-alias-label-tertiary));margin:4px 0 0;font-size:11px;line-height:16px}.hcVqia_anchor{color:var(--dsw-alias-label-tertiary);font-family:var(--dsw-font-mono,ui-monospace, monospace);word-break:break-all;margin:0 0 4px;font-size:10px;line-height:15px}.hcVqia_excerpt{white-space:pre-wrap;margin:0;font-size:11px;line-height:17px}.hcVqia_empty{flex-direction:column;gap:4px;display:flex}";
		const tagId$4 = "@dsh-portable/crew-ui/DossierPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var DossierPanel_module_css_default = {
			"anchor": "hcVqia_anchor",
			"attach": "hcVqia_attach",
			"empty": "hcVqia_empty",
			"emptyBody": "hcVqia_emptyBody",
			"emptyTitle": "hcVqia_emptyTitle",
			"error": "hcVqia_error",
			"excerpt": "hcVqia_excerpt",
			"head": "hcVqia_head",
			"hit": "hcVqia_hit",
			"hits": "hcVqia_hits",
			"input": "hcVqia_input",
			"notice": "hcVqia_notice",
			"root": "hcVqia_root",
			"source": "hcVqia_source",
			"sourceMeta": "hcVqia_sourceMeta",
			"sourceTitle": "hcVqia_sourceTitle",
			"sources": "hcVqia_sources",
			"title": "hcVqia_title",
			"unread": "hcVqia_unread"
		};
		//#endregion
		//#region src/client/shell/DossierPanel.tsx
		/**
		* The mission dossier panel.
		*
		* This is where the loop closes. A board task says what to do; the brief says
		* how far the mission has got; the dossier says what the crew is working FROM.
		* Attaching a spec here is what makes `dossier_search` answer, and every answer
		* carries an anchor that opens the passage it came from.
		*
		* Two things are shown that a document list normally hides, and both are the
		* reason to trust the answers:
		*
		* - what the parser could NOT read, per source, in words;
		* - the passage behind a search hit, so a citation can be checked rather than
		*   taken on faith.
		*
		* Attaching is an operator action by design: no model-facing tool can put a
		* file into a space, which is what makes the space's contents knowable.
		* @module @dsh-portable/crew-ui/client/shell/DossierPanel
		*/
		/** The attached-sources panel. */
		function DossierPanel({ cwd }) {
			const runtime = useRuntime();
			const { t } = runtime;
			const [sources, setSources] = (0, react.useState)(void 0);
			const [passages, setPassages] = (0, react.useState)([]);
			const [query, setQuery] = (0, react.useState)("");
			const [path, setPath] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(void 0);
			const cwdRef = (0, react.useRef)(cwd);
			cwdRef.current = cwd;
			const load = (0, react.useCallback)(async () => {
				const target = cwdRef.current;
				const result = await runtime.dossier("summary", { cwd: target });
				if (cwdRef.current !== target) return;
				if (!result.ok) {
					setError(`${result.error.message} (${result.error.code})`);
					return;
				}
				setError(void 0);
				setSources(result.value.sources);
			}, [runtime]);
			(0, react.useEffect)(() => {
				setSources(void 0);
				setPassages([]);
				setError(void 0);
				load();
			}, [cwd, load]);
			const attach = async () => {
				const file = path.trim();
				if (file === "") return;
				setBusy(true);
				try {
					const result = await runtime.dossier("attach", {
						cwd: cwdRef.current,
						path: file
					});
					if (!result.ok) {
						setError(`${result.error.message} (${result.error.code})`);
						return;
					}
					setPath("");
					await load();
				} finally {
					setBusy(false);
				}
			};
			const search = async () => {
				const text = query.trim();
				if (text === "") {
					setPassages([]);
					return;
				}
				setBusy(true);
				try {
					const target = cwdRef.current;
					const result = await runtime.dossier("search", {
						cwd: target,
						query: text
					});
					if (cwdRef.current !== target) return;
					if (!result.ok) {
						setError(`${result.error.message} (${result.error.code})`);
						return;
					}
					setError(void 0);
					setPassages(result.value.passages);
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: DossierPanel_module_css_default.root,
				"aria-label": t("dossier.title"),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("header", {
						className: DossierPanel_module_css_default.head,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
							className: DossierPanel_module_css_default.title,
							children: t("dossier.title")
						})
					}),
					error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: DossierPanel_module_css_default.error,
						role: "alert",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: error }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: () => {
								setError(void 0);
								load();
							},
							children: t("dossier.retry")
						})]
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: DossierPanel_module_css_default.attach,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: DossierPanel_module_css_default.input,
							value: path,
							placeholder: t("dossier.attachPlaceholder"),
							disabled: busy || cwd === void 0,
							onChange: (event) => {
								setPath(event.target.value);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter") attach();
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy || path.trim() === "" || cwd === void 0,
							onClick: () => {
								attach();
							},
							children: t("dossier.attach")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: DossierPanel_module_css_default.attach,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: DossierPanel_module_css_default.input,
							value: query,
							placeholder: t("dossier.searchPlaceholder"),
							disabled: busy,
							onChange: (event) => {
								setQuery(event.target.value);
							},
							onKeyDown: (event) => {
								if (event.key === "Enter") search();
							}
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: () => {
								search();
							},
							children: t("dossier.search")
						})]
					}),
					passages.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: DossierPanel_module_css_default.hits,
						children: passages.map((passage) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: DossierPanel_module_css_default.hit,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: DossierPanel_module_css_default.anchor,
								children: passage.anchor
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: DossierPanel_module_css_default.excerpt,
								children: passage.text
							})]
						}, passage.anchor + passage.text.slice(0, 24)))
					}) : null,
					sources === void 0 ? error === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: DossierPanel_module_css_default.notice,
						children: t("dossier.loading")
					}) : null : sources.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: DossierPanel_module_css_default.empty,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: DossierPanel_module_css_default.emptyTitle,
							children: t("dossier.empty")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: DossierPanel_module_css_default.emptyBody,
							children: t("dossier.emptyBody")
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: DossierPanel_module_css_default.sources,
						children: sources.map((source) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: DossierPanel_module_css_default.source,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: DossierPanel_module_css_default.sourceTitle,
									children: source.title
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: DossierPanel_module_css_default.sourceMeta,
									children: t("dossier.sections", { count: source.sections })
								}),
								source.unread.map((gap) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: DossierPanel_module_css_default.unread,
									children: gap
								}, gap))
							]
						}, source.sourceId))
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\board\TaskCard.module.css.mjs
		const css$3 = ".aJtGXW_root{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-elevated,transparent);border-radius:12px;flex-direction:column;gap:6px;padding:12px;display:flex}.aJtGXW_busy{opacity:.6}.aJtGXW_subject{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:500;line-height:20px}.aJtGXW_description{color:var(--dsw-alias-label-secondary,var(--dsw-alias-label-tertiary));white-space:pre-wrap;margin:0;font-size:12px;line-height:18px}.aJtGXW_meta{align-items:center;gap:8px;font-size:11px;line-height:18px;display:flex}.aJtGXW_ready{color:var(--dsw-alias-label-primary)}.aJtGXW_blocked{color:var(--dsw-alias-label-tertiary)}.aJtGXW_owner{color:var(--dsw-alias-label-tertiary);margin-left:auto}.aJtGXW_chips{flex-wrap:wrap;align-items:center;gap:4px;margin:0;font-size:11px;line-height:18px;display:flex}.aJtGXW_chipLabel{color:var(--dsw-alias-label-tertiary);margin-right:2px}.aJtGXW_chip,.aJtGXW_scope{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:6px;padding:0 6px}.aJtGXW_scope{font-family:var(--dsw-font-mono,ui-monospace, monospace)}.aJtGXW_warning{color:var(--dsw-alias-label-secondary,var(--dsw-alias-label-tertiary));gap:6px;margin:0;font-size:11px;line-height:18px;display:flex}.aJtGXW_warningLabel{color:var(--dsw-static-orange-500,var(--dsw-alias-label-primary));flex:none}.aJtGXW_actions{flex-wrap:wrap;align-items:center;gap:6px;margin-top:2px;display:flex}.aJtGXW_actions button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;padding:2px 8px;font-size:11px;line-height:18px}.aJtGXW_actions button:disabled{opacity:.5;cursor:default}.aJtGXW_destructive{margin-left:auto;color:var(--dsw-static-red-500,var(--dsw-alias-label-tertiary))!important}.aJtGXW_assign{color:var(--dsw-alias-label-tertiary);align-items:center;gap:4px;font-size:11px;display:flex}.aJtGXW_assignLabel{white-space:nowrap}.aJtGXW_assign select{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;background:0 0;border-radius:8px;max-width:120px;padding:2px 4px;font-size:11px}";
		const tagId$3 = "@dsh-portable/crew-ui/TaskCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var TaskCard_module_css_default = {
			"actions": "aJtGXW_actions",
			"assign": "aJtGXW_assign",
			"assignLabel": "aJtGXW_assignLabel",
			"blocked": "aJtGXW_blocked",
			"busy": "aJtGXW_busy",
			"chip": "aJtGXW_chip",
			"chipLabel": "aJtGXW_chipLabel",
			"chips": "aJtGXW_chips",
			"description": "aJtGXW_description",
			"destructive": "aJtGXW_destructive",
			"meta": "aJtGXW_meta",
			"owner": "aJtGXW_owner",
			"ready": "aJtGXW_ready",
			"root": "aJtGXW_root",
			"scope": "aJtGXW_scope",
			"subject": "aJtGXW_subject",
			"warning": "aJtGXW_warning",
			"warningLabel": "aJtGXW_warningLabel"
		};
		//#endregion
		//#region src/client/board/TaskCard.tsx
		/** A single board task with its dependency, scope and ownership state. */
		function TaskCard({ task, tasks, members, busy, onEdit, onAction }) {
			const { t } = useRuntime();
			const blockers = blockerLabels(task, tasks);
			const assignable = members.filter((member) => member.status !== "failed" && member.status !== "provisioning");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
				className: `${TaskCard_module_css_default.root} ${busy ? TaskCard_module_css_default.busy : ""}`,
				"data-status": task.status,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: TaskCard_module_css_default.subject,
						children: task.subject
					}),
					task.description === "" ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: TaskCard_module_css_default.description,
						children: task.description
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TaskCard_module_css_default.meta,
						children: [task.status === "pending" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: task.ready ? TaskCard_module_css_default.ready : TaskCard_module_css_default.blocked,
							children: task.ready ? t("board.ready") : t("board.blocked")
						}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskCard_module_css_default.owner,
							children: task.ownerName === void 0 ? t("board.unowned") : task.ownerName
						})]
					}),
					blockers.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: TaskCard_module_css_default.chips,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskCard_module_css_default.chipLabel,
							children: t("board.blockedBy")
						}), blockers.map((label) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskCard_module_css_default.chip,
							children: label
						}, label))]
					}) : null,
					task.writeScopes.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: TaskCard_module_css_default.chips,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskCard_module_css_default.chipLabel,
							children: t("board.scopes")
						}), task.writeScopes.map((scope) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskCard_module_css_default.scope,
							children: scope
						}, scope))]
					}) : null,
					task.writeScopeWarnings.map((warning) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: TaskCard_module_css_default.warning,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskCard_module_css_default.warningLabel,
							children: t("board.conflict")
						}), warning]
					}, warning)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TaskCard_module_css_default.actions,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: onEdit,
								children: t("task.edit")
							}),
							task.status === "completed" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => {
									onAction("reopen");
								},
								children: t("task.reopen")
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => {
									onAction("complete");
								},
								children: t("task.complete")
							}),
							task.ownerName === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: busy,
								onClick: () => {
									onAction("release");
								},
								children: t("task.release")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: TaskCard_module_css_default.assign,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: TaskCard_module_css_default.assignLabel,
									children: t("task.assign")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
									value: task.ownerName ?? "",
									disabled: busy,
									onChange: (event) => {
										const owner = event.target.value;
										if (owner === "") onAction("release");
										else onAction("reassign", { owner });
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: "",
										children: t("task.assignNobody")
									}), assignable.map((member) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
										value: member.name,
										children: member.name
									}, member.id))]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: TaskCard_module_css_default.destructive,
								disabled: busy,
								onClick: () => {
									onAction("delete");
								},
								children: t("task.delete")
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\board\TaskEditor.module.css.mjs
		const css$2 = "._8ngaFq_root{border:1px solid var(--dsw-static-neutral-bluish-400,var(--dsw-alias-border-l2));background:var(--dsw-alias-bg-elevated,transparent);border-radius:12px;flex-direction:column;gap:8px;padding:12px;display:flex}._8ngaFq_field{flex-direction:column;gap:3px;display:flex}._8ngaFq_label{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:18px}._8ngaFq_input,._8ngaFq_textarea{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);width:100%;color:var(--dsw-alias-label-primary);font:inherit;background:0 0;border-radius:8px;padding:5px 8px;font-size:12px;line-height:18px}._8ngaFq_textarea{resize:vertical;min-height:56px}._8ngaFq_actions{justify-content:flex-end;gap:6px;display:flex}._8ngaFq_actions button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;padding:3px 10px;font-size:12px}._8ngaFq_actions button:disabled{opacity:.5;cursor:default}._8ngaFq_primary{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400,var(--dsw-alias-border-l2))}";
		const tagId$2 = "@dsh-portable/crew-ui/TaskEditor.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var TaskEditor_module_css_default = {
			"actions": "_8ngaFq_actions",
			"field": "_8ngaFq_field",
			"input": "_8ngaFq_input",
			"label": "_8ngaFq_label",
			"primary": "_8ngaFq_primary",
			"root": "_8ngaFq_root",
			"textarea": "_8ngaFq_textarea"
		};
		//#endregion
		//#region src/client/board/TaskEditor.tsx
		/**
		* The create/edit form for one task.
		*
		* The same form serves both, because the fields are the same and an operator
		* who has written one task should not have to learn a second layout to change
		* it. Save stays disabled until the two fields the host requires are non-empty,
		* so an invalid write is never sent for the host to reject.
		* @module @dsh-portable/crew-ui/client/board/TaskEditor
		*/
		const EMPTY = {
			subject: "",
			description: "",
			blockers: "",
			scopes: ""
		};
		/** Create or edit one board task. */
		function TaskEditor({ task, busy, onCancel, onSubmit }) {
			const { t } = useRuntime();
			const [draft, setDraft] = (0, react.useState)(() => task === void 0 ? EMPTY : {
				subject: task.subject,
				description: task.description,
				blockers: task.blockedBy.join(", "),
				scopes: task.writeScopes.join(", ")
			});
			const patch = (part) => {
				setDraft((current) => ({
					...current,
					...part
				}));
			};
			const complete = draft.subject.trim() !== "" && draft.description.trim() !== "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: TaskEditor_module_css_default.root,
				onSubmit: (event) => {
					event.preventDefault();
					if (!complete || busy) return;
					onSubmit(draft);
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: TaskEditor_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskEditor_module_css_default.label,
							children: t("task.subject")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: TaskEditor_module_css_default.input,
							value: draft.subject,
							placeholder: t("task.subjectPlaceholder"),
							disabled: busy,
							autoFocus: true,
							onChange: (event) => {
								patch({ subject: event.target.value });
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: TaskEditor_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskEditor_module_css_default.label,
							children: t("task.description")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: TaskEditor_module_css_default.textarea,
							value: draft.description,
							placeholder: t("task.descriptionPlaceholder"),
							rows: 3,
							disabled: busy,
							onChange: (event) => {
								patch({ description: event.target.value });
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: TaskEditor_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskEditor_module_css_default.label,
							children: t("task.blockers")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: TaskEditor_module_css_default.input,
							value: draft.blockers,
							placeholder: t("task.blockersPlaceholder"),
							disabled: busy,
							onChange: (event) => {
								patch({ blockers: event.target.value });
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
						className: TaskEditor_module_css_default.field,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: TaskEditor_module_css_default.label,
							children: t("task.scopes")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: TaskEditor_module_css_default.input,
							value: draft.scopes,
							placeholder: t("task.scopesPlaceholder"),
							disabled: busy,
							onChange: (event) => {
								patch({ scopes: event.target.value });
							}
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: TaskEditor_module_css_default.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: busy,
							onClick: onCancel,
							children: t("task.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "submit",
							className: TaskEditor_module_css_default.primary,
							disabled: busy || !complete,
							children: t("task.save")
						})]
					})
				]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\board\BoardView.module.css.mjs
		const css$1 = ".BZpI-G_root{box-sizing:border-box;flex-direction:column;gap:12px;height:100%;min-height:0;padding:16px;display:flex}.BZpI-G_notice,.BZpI-G_empty{color:var(--dsw-alias-label-tertiary);margin:0;padding:16px 4px;font-size:13px;line-height:20px}.BZpI-G_error{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-primary);border-radius:10px;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;font-size:13px;line-height:20px;display:flex}.BZpI-G_errorActions{flex:none;gap:8px;display:flex}.BZpI-G_errorActions button{border:1px solid var(--dsw-alias-border-l2);color:inherit;font:inherit;cursor:pointer;background:0 0;border-radius:8px;padding:4px 10px;font-size:12px}.BZpI-G_columns{flex:1;grid-auto-columns:minmax(280px,1fr);grid-auto-flow:column;gap:12px;min-height:0;display:grid;overflow-x:auto}.BZpI-G_column{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:14px;flex-direction:column;min-height:0;display:flex;overflow:hidden}.BZpI-G_columnHead{border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:12px 14px;display:flex}.BZpI-G_columnTitle{color:var(--dsw-alias-label-primary);flex:1;margin:0;font-size:13px;font-weight:500;line-height:20px}.BZpI-G_columnCount{background:var(--dsw-alias-interactive-bg-hover);min-width:20px;color:var(--dsw-alias-label-tertiary);text-align:center;border-radius:999px;padding:1px 6px;font-size:11px;line-height:18px}.BZpI-G_add{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;border-radius:8px;padding:3px 9px;font-size:12px}.BZpI-G_add:disabled{opacity:.5;cursor:default}.BZpI-G_stack{flex-direction:column;gap:10px;min-height:0;padding:12px;display:flex;overflow-y:auto}";
		const tagId$1 = "@dsh-portable/crew-ui/BoardView.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var BoardView_module_css_default = {
			"add": "BZpI-G_add",
			"column": "BZpI-G_column",
			"columnCount": "BZpI-G_columnCount",
			"columnHead": "BZpI-G_columnHead",
			"columnTitle": "BZpI-G_columnTitle",
			"columns": "BZpI-G_columns",
			"empty": "BZpI-G_empty",
			"error": "BZpI-G_error",
			"errorActions": "BZpI-G_errorActions",
			"notice": "BZpI-G_notice",
			"root": "BZpI-G_root",
			"stack": "BZpI-G_stack"
		};
		//#endregion
		//#region src/client/board/BoardView.tsx
		/**
		* The mission board.
		*
		* This is Mission Control's landing surface, and the reason the surface exists:
		* the board is a shared human/agent artifact, so the operator gets the same
		* verbs the Lead has — create, edit, assign, complete, reopen, release, delete
		* — rather than a rendering of what the agent decided.
		*
		* Three columns, in the order work moves through them. Within a column the
		* unblocked tasks come first, because "what can start now" is the question a
		* board is scanned for.
		* @module @dsh-portable/crew-ui/client/board/BoardView
		*/
		/** Split a comma-separated field into distinct, non-empty entries. */
		function items(value) {
			return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
		}
		/** The three-column mission board. */
		function BoardView({ board, members }) {
			const { t } = useRuntime();
			const [creating, setCreating] = (0, react.useState)(false);
			const [editing, setEditing] = (0, react.useState)(void 0);
			const tasks = board.view?.tasks ?? [];
			const columns = groupTasks(tasks);
			const submitCreate = async (draft) => {
				if (await board.create({
					subject: draft.subject.trim(),
					description: draft.description.trim(),
					blockedBy: items(draft.blockers),
					writeScopes: items(draft.scopes)
				}) !== void 0) setCreating(false);
			};
			const submitEdit = async (task, draft) => {
				const edited = await board.update({
					taskId: task.id,
					expectedRevision: task.revision,
					action: "edit",
					subject: draft.subject.trim(),
					description: draft.description.trim(),
					writeScopes: items(draft.scopes)
				});
				if (edited === void 0) return;
				const blockedBy = items(draft.blockers);
				if (blockedBy.length === edited.blockedBy.length && blockedBy.every((id, index) => id === edited.blockedBy[index])) {
					setEditing(void 0);
					return;
				}
				if (await board.update({
					taskId: task.id,
					expectedRevision: edited.revision,
					action: "set_dependencies",
					blockedBy
				}) !== void 0) setEditing(void 0);
			};
			if (board.loading && board.view === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: BoardView_module_css_default.notice,
				children: t("board.loading")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: BoardView_module_css_default.root,
				children: [board.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: BoardView_module_css_default.error,
					role: "alert",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: board.error }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: BoardView_module_css_default.errorActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								board.refresh();
							},
							children: t("board.retry")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: board.dismissError,
							children: t("board.dismiss")
						})]
					})]
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: BoardView_module_css_default.columns,
					children: BOARD_COLUMNS.map((column) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
						className: BoardView_module_css_default.column,
						"aria-label": t(`board.${column}`),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
							className: BoardView_module_css_default.columnHead,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
									className: BoardView_module_css_default.columnTitle,
									children: t(`board.${column}`)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: BoardView_module_css_default.columnCount,
									children: columns[column].length
								}),
								column === "pending" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: BoardView_module_css_default.add,
									onClick: () => {
										setCreating(true);
									},
									disabled: board.view === void 0,
									children: t("board.addTask")
								}) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: BoardView_module_css_default.stack,
							children: [
								column === "pending" && creating ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskEditor, {
									busy: board.pending.has("create"),
									onCancel: () => {
										setCreating(false);
									},
									onSubmit: submitCreate
								}) : null,
								columns[column].map((task) => editing === task.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskEditor, {
									task,
									busy: board.pending.has(task.id),
									onCancel: () => {
										setEditing(void 0);
									},
									onSubmit: (draft) => submitEdit(task, draft)
								}, task.id) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskCard, {
									task,
									tasks,
									members,
									busy: board.pending.has(task.id),
									onEdit: () => {
										setEditing(task.id);
									},
									onAction: (action, extra) => {
										board.update({
											taskId: task.id,
											expectedRevision: task.revision,
											action,
											...extra
										});
									}
								}, task.id)),
								columns[column].length === 0 && !(column === "pending" && creating) ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: BoardView_module_css_default.empty,
									children: column === "pending" ? t("board.emptyPending") : t("board.empty")
								}) : null
							]
						})]
					}, column))
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\Ryan\Desktop\deepseek-harness-portable\apps\crew-ui\src\client\shell\MissionControl.module.css.mjs
		const css = ".LTq3aa_root{color:#172033;background:#fff;width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,SF Pro Text,Segoe UI,Inter,sans-serif;font-size:14px;line-height:1.5;position:relative;overflow:hidden}.LTq3aa_workspace{width:100%;min-width:0;height:100%;min-height:0;display:flex}.LTq3aa_rail{background:#f6f7f9;border-right:1px solid #e2e8f0;flex:none;width:260px;min-width:260px;overflow:hidden}.LTq3aa_center{background:#fff;flex-direction:column;flex:auto;min-width:360px;min-height:0;display:flex}.LTq3aa_chatHeader,.LTq3aa_inspectorHead{box-sizing:border-box;border-bottom:1px solid #e2e8f0;flex:none;justify-content:space-between;align-items:center;height:50px;padding:0 16px;display:flex}.LTq3aa_headerLeft,.LTq3aa_headerUtilities{align-items:center;min-width:0;display:flex}.LTq3aa_headerLeft{gap:10px}.LTq3aa_headerUtilities{gap:8px}.LTq3aa_agentMark,.LTq3aa_homeMark{color:#2563eb;background:#eff6ff;flex:none;justify-content:center;align-items:center;display:inline-flex}.LTq3aa_agentMark{border-radius:9px;width:28px;height:28px}.LTq3aa_headerCopy{flex-direction:column;min-width:0;display:flex}.LTq3aa_title,.LTq3aa_inspectorTitle{color:#172033;text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:13px;font-weight:600;line-height:18px;overflow:hidden}.LTq3aa_subtitle{color:#94a3b8;text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:15px;overflow:hidden}.LTq3aa_iconButton{color:#64748b;cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;width:30px;height:30px;padding:0;display:inline-flex}.LTq3aa_iconButton:hover{color:#172033;background:#eef0f3}.LTq3aa_iconButton:focus-visible,.LTq3aa_primaryAction:focus-visible,.LTq3aa_inspectorTab:focus-visible{outline-offset:2px;outline:2px solid #2563eb4d}.LTq3aa_workspaceChip{color:#64748b;text-overflow:ellipsis;white-space:nowrap;border:1px solid #e2e8f0;border-radius:8px;align-items:center;gap:6px;max-width:180px;padding:5px 9px;font-size:11px;line-height:16px;display:inline-flex;overflow:hidden}.LTq3aa_workspaceChip svg{flex:none}.LTq3aa_missionAlert{box-sizing:border-box;color:#b91c1c;background:#fff7f7;border-bottom:1px solid #fee2e2;flex:none;align-items:center;gap:10px;min-height:34px;padding:7px 18px;font-size:12px;line-height:18px;display:flex}.LTq3aa_missionAlert span{flex:1;min-width:0}.LTq3aa_missionAlert button{color:inherit;font:inherit;cursor:pointer;background:0 0;border:none;flex:none;padding:0;text-decoration:underline}.LTq3aa_centerBody{flex-direction:column;flex:auto;min-height:0;display:flex}.LTq3aa_home{text-align:center;flex-direction:column;flex:1;justify-content:center;align-items:center;gap:10px;padding:40px 24px;display:flex}.LTq3aa_homeMark{border-radius:22px;width:72px;height:72px;margin-bottom:4px}.LTq3aa_home h2{color:#172033;margin:0;font-size:24px;font-weight:600;line-height:32px}.LTq3aa_home p{color:#64748b;max-width:360px;margin:0 0 8px;font-size:14px;line-height:22px}.LTq3aa_primaryAction{color:#fff;font:inherit;cursor:pointer;background:#2563eb;border:none;border-radius:9px;padding:8px 14px;font-size:13px;line-height:20px}.LTq3aa_primaryAction:hover{background:#1d4ed8}.LTq3aa_inspector{background:#fff;border-left:1px solid #e2e8f0;flex-direction:column;flex:none;width:360px;min-width:320px;min-height:0;display:flex}.LTq3aa_inspectorHead{padding-left:18px}.LTq3aa_inspectorTitle{font-size:14px}.LTq3aa_inspectorTabs{border-bottom:1px solid #e2e8f0;flex:none;gap:2px;padding:8px 12px 0;display:flex;overflow-x:auto}.LTq3aa_inspectorTab{color:#94a3b8;font:inherit;cursor:pointer;background:0 0;border:none;flex:none;padding:7px 7px 9px;font-size:11px;line-height:16px;position:relative}.LTq3aa_inspectorTab:hover,.LTq3aa_inspectorTabActive{color:#172033}.LTq3aa_inspectorTabActive:after{content:\"\";background:#2563eb;border-radius:2px 2px 0 0;height:2px;position:absolute;bottom:-1px;left:7px;right:7px}.LTq3aa_inspectorBody{flex:1;min-height:0;overflow:hidden}@media (width<=1100px){.LTq3aa_inspector{width:320px;min-width:280px}}@media (width<=860px){.LTq3aa_inspector{display:none}.LTq3aa_center{min-width:0}}@media (width<=620px){.LTq3aa_rail{width:224px;min-width:224px}.LTq3aa_chatHeader{padding:0 10px}.LTq3aa_workspaceChip{display:none}}";
		const tagId = "@dsh-portable/crew-ui/MissionControl.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-portable/crew-ui";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var MissionControl_module_css_default = {
			"agentMark": "LTq3aa_agentMark",
			"center": "LTq3aa_center",
			"centerBody": "LTq3aa_centerBody",
			"chatHeader": "LTq3aa_chatHeader",
			"headerCopy": "LTq3aa_headerCopy",
			"headerLeft": "LTq3aa_headerLeft",
			"headerUtilities": "LTq3aa_headerUtilities",
			"home": "LTq3aa_home",
			"homeMark": "LTq3aa_homeMark",
			"iconButton": "LTq3aa_iconButton",
			"inspector": "LTq3aa_inspector",
			"inspectorBody": "LTq3aa_inspectorBody",
			"inspectorHead": "LTq3aa_inspectorHead",
			"inspectorTab": "LTq3aa_inspectorTab",
			"inspectorTabActive": "LTq3aa_inspectorTabActive",
			"inspectorTabs": "LTq3aa_inspectorTabs",
			"inspectorTitle": "LTq3aa_inspectorTitle",
			"missionAlert": "LTq3aa_missionAlert",
			"primaryAction": "LTq3aa_primaryAction",
			"rail": "LTq3aa_rail",
			"root": "LTq3aa_root",
			"subtitle": "LTq3aa_subtitle",
			"title": "LTq3aa_title",
			"workspace": "LTq3aa_workspace",
			"workspaceChip": "LTq3aa_workspaceChip"
		};
		//#endregion
		//#region src/client/shell/MissionControl.tsx
		/**
		* The Metis-shaped Crew workspace.
		*
		* Crew keeps its domain-specific board, roster and dossier, but presents them
		* through the same information architecture as Metis: a conversation rail,
		* a chat-first centre and an Inspector that can be opened without leaving the
		* current thread.
		* @module @dsh-portable/crew-ui/client/shell/MissionControl
		*/
		/** The Inspector's durable sections. */
		const INSPECTOR_TABS = [
			"crew",
			"board",
			"brief",
			"dossier"
		];
		/** The whole Crew surface. */
		function MissionControl() {
			const runtime = useRuntime();
			const { t, uiModeT } = runtime;
			const [railOpen, setRailOpen] = (0, react.useState)(true);
			const [inspectorOpen, setInspectorOpen] = (0, react.useState)(true);
			const [inspectorTab, setInspectorTab] = (0, react.useState)("crew");
			const [settingsOpen, setSettingsOpen] = (0, react.useState)(false);
			const list = (0, react.useSyncExternalStore)(runtime.sessions.list.subscribe, runtime.sessions.list.getSnapshot, runtime.sessions.list.getSnapshot);
			const sessionId = list.current;
			const summary = sessionId === void 0 ? void 0 : list.byId[sessionId];
			const board = useBoard(sessionId);
			const members = board.view?.members ?? [];
			(0, react.useEffect)(() => {
				setInspectorTab("crew");
			}, [sessionId]);
			const mission = useMissionPreset(sessionId, summary);
			const newMission = (0, react.useCallback)(() => {
				mission.start();
			}, [mission]);
			const openWorkspace = (0, react.useCallback)(() => {
				const navigation = runtime.navigation;
				if (navigation === void 0) return;
				navigation.pickDirectory().then(async (path) => {
					if (path === null) return;
					const workspace = await runtime.workspaces.create({ path });
					mission.start(workspace.workspaceId);
				}).catch(() => {});
			}, [mission, runtime]);
			const openMember = (0, react.useCallback)(async (member) => {
				if (member.role !== "teammate" || sessionId === void 0) return;
				const parentSessionId = leadSessionId(runtime.sessions, sessionId);
				await runtime.sessions.refreshSubagents(parentSessionId);
				runtime.sessions.openSubagent({
					parentSessionId,
					childSessionId: member.id,
					mode: "continuable"
				});
				setInspectorTab("crew");
			}, [runtime, sessionId]);
			const selectMission = (0, react.useCallback)((id) => {
				runtime.sessions.open(id);
			}, [runtime]);
			const presetId = (0, react.useMemo)(() => summary?.projectionValues?.agentPreset ?? void 0, [summary]);
			const workspaceLabel = summary?.cwd === void 0 || summary.cwd === "" ? void 0 : summary.cwd.split(/[\\/]/).filter(Boolean).at(-1);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: MissionControl_module_css_default.root,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: MissionControl_module_css_default.workspace,
					children: [
						railOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("aside", {
							className: MissionControl_module_css_default.rail,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MissionRail, {
								collapsed: false,
								currentSessionId: sessionId,
								onSelect: selectMission,
								onNewMission: newMission,
								onOpenWorkspace: openWorkspace,
								onCollapse: () => {
									setRailOpen(false);
								},
								onOpenSettings: () => {
									setSettingsOpen(true);
								}
							})
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("main", {
							className: MissionControl_module_css_default.center,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
									className: MissionControl_module_css_default.chatHeader,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: MissionControl_module_css_default.headerLeft,
										children: [
											!railOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: MissionControl_module_css_default.iconButton,
												"aria-label": t("nav.expand"),
												onClick: () => {
													setRailOpen(true);
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPanelLeftOutline16, {})
											}) : null,
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: MissionControl_module_css_default.agentMark,
												"aria-hidden": true,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												className: MissionControl_module_css_default.headerCopy,
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h1", {
													className: MissionControl_module_css_default.title,
													children: summary?.displayTitle ?? t("app.title")
												}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: MissionControl_module_css_default.subtitle,
													children: uiModeT("mode.crew")
												})]
											})
										]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: MissionControl_module_css_default.headerUtilities,
										children: [workspaceLabel === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: MissionControl_module_css_default.workspaceChip,
											title: summary?.cwd,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {}), workspaceLabel]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: MissionControl_module_css_default.iconButton,
											"aria-label": inspectorOpen ? t("inspector.close") : t("inspector.open"),
											"aria-pressed": inspectorOpen,
											onClick: () => {
												setInspectorOpen((open) => !open);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconListPenOutline16, {})
										})]
									})]
								}),
								mission.error === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: MissionControl_module_css_default.missionAlert,
									role: "alert",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("nav.missionPresetFailed", { reason: mission.error }) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: mission.dismiss,
										children: t("board.dismiss")
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: MissionControl_module_css_default.centerBody,
									children: [sessionId === void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: MissionControl_module_css_default.home,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: MissionControl_module_css_default.homeMark,
												"aria-hidden": true,
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, {})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: t("thread.empty") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: t("thread.emptyBody") }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: MissionControl_module_css_default.primaryAction,
												onClick: newMission,
												children: t("nav.newMission")
											})
										]
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadView, { sessionId }), sessionId === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LeadComposer, { sessionId })]
								})
							]
						}),
						inspectorOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("aside", {
							className: MissionControl_module_css_default.inspector,
							"aria-label": t("inspector.title"),
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
									className: MissionControl_module_css_default.inspectorHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
										className: MissionControl_module_css_default.inspectorTitle,
										children: t("inspector.title")
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: MissionControl_module_css_default.iconButton,
										"aria-label": t("inspector.close"),
										onClick: () => {
											setInspectorOpen(false);
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {})
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
									className: MissionControl_module_css_default.inspectorTabs,
									role: "tablist",
									"aria-label": t("inspector.title"),
									children: INSPECTOR_TABS.map((id) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										role: "tab",
										"aria-selected": inspectorTab === id,
										className: `${MissionControl_module_css_default.inspectorTab} ${inspectorTab === id ? MissionControl_module_css_default.inspectorTabActive : ""}`,
										onClick: () => {
											setInspectorTab(id);
										},
										children: t(`tab.${id}`)
									}, id))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: MissionControl_module_css_default.inspectorBody,
									children: inspectorTab === "crew" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RosterPanel, {
										members,
										currentSessionId: sessionId,
										onOpenMember: (member) => {
											openMember(member);
										}
									}) : inspectorTab === "board" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BoardView, {
										board,
										members
									}) : inspectorTab === "brief" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BriefView, {
										view: board.view,
										presetId,
										cwd: summary?.cwd
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DossierPanel, { cwd: summary?.cwd })
								})
							]
						}) : null
					]
				}), settingsOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CrewSettings, { onClose: () => {
					setSettingsOpen(false);
				} }) : null]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* Browser entry for Mission Control.
		*
		* The switch mechanism is the one every surface in this distribution shares:
		* DSH's shell renders exactly one ctx-level slot, `root`, and a registration at
		* a lower priority shadows the one already there. Mission Control claims
		* `-2000`, below the workbench's `-1000`, and registers only while the shared
		* `ctx.uiMode` service says it is selected.
		*
		* Priority does not decide WHICH surface shows — the mode does, and each
		* surface registers only for its own mode — so the numbers matter solely in the
		* instant one registration replaces another.
		*
		* The Team Remote namespace is mounted here rather than assumed: the service is
		* a host-plane row, so the descriptor has to be contributed by whichever client
		* wants to call it. Mounting fails closed — the plugin does not register the
		* surface — which leaves the official AppFrame rendering rather than a frameless
		* page.
		* @module @dsh-portable/crew-ui/client
		*/
		/** Stable Cordis plugin name. */
		const name = "crew-ui-client";
		/**
		* Services Mission Control cannot render without.
		*
		* Every generated Remote namespace it reads is declared individually: cordis
		* refuses `ctx.remote.<ns>` from a context that did not inject that namespace,
		* and the failure is a runtime throw inside whichever panel touches it rather
		* than a compile error.
		*
		* `uiMode` is what gates the surface; without it there is no way to know
		* whether this surface is the selected one, so it is a hard requirement rather
		* than a probed optional.
		*/
		const inject = [
			"slots",
			"locale",
			"uiMode",
			"sessions",
			"workspaces",
			"conversation",
			"uiConversation",
			"uiSession",
			"connection",
			"remote",
			"remote.agentTeams",
			"remote.agentPresets"
		];
		/**
		* Shadow priority of Mission Control's `root` registration.
		*
		* Lowest renders. The official AppFrame sits at 0 and the workbench at -1000;
		* the gap below leaves room for a further surface without renumbering either.
		*/
		const ROOT_PRIORITY = -2e3;
		/**
		* Build the Host-service view the React tree reads.
		* @param ctx - client root context, already injected.
		* @returns the runtime.
		*/
		function createCrewRuntime(ctx) {
			const t = ctx.locale.bind(CREW_NS);
			const uiModeT = ctx.locale.bind("uiMode");
			const uiWorkspace = ctx.get("uiWorkspace");
			const uiConversation = ctx.uiConversation;
			return {
				sessions: ctx.sessions,
				workspaces: ctx.workspaces,
				navigation: uiWorkspace,
				teams: {
					view: (lead) => ctx.remote.agentTeams.view(lead),
					createTask: (lead, request) => ctx.remote.agentTeams.createTask(lead, request),
					updateTask: (lead, request) => ctx.remote.agentTeams.updateTask(lead, request)
				},
				presets: { select: (sessionId, preset) => ctx.remote.agentPresets.select(sessionId, preset) },
				mode: ctx.uiMode,
				t,
				uiModeT,
				input: (sessionId) => {
					const scope = ctx.sessions.scope(sessionId);
					if (scope === void 0) return void 0;
					return ctx.conversation?.input.for(scope);
				},
				dossier: async (endpoint, payload) => {
					const connection = ctx.get("connection");
					if (connection === void 0) return {
						ok: false,
						error: {
							code: "no-connection",
							message: "the dossier channel is not available",
							details: {}
						}
					};
					try {
						return await connection.rpc.call("/crew-dossier", endpoint, payload);
					} catch (error) {
						return {
							ok: false,
							error: {
								code: "transport-failed",
								message: error instanceof Error ? error.message : String(error),
								details: { endpoint }
							}
						};
					}
				},
				chatFeed: (sessionId) => {
					const binding = ctx.sessions.binding(sessionId);
					if (binding === void 0 || uiConversation === void 0) return void 0;
					return uiConversation.binding(binding)?.target("chat");
				},
				ctx
			};
		}
		/**
		* Register the surface, and re-register it whenever the mode changes.
		* @param ctx - client root context.
		* @returns a disposer removing any active registration and the subscription.
		*/
		function bindRootRegistration(ctx) {
			const runtime = createCrewRuntime(ctx);
			const render = () => (0, react.createElement)(CrewRuntimeProvider, { value: runtime }, (0, react.createElement)(MissionControl));
			let active;
			const apply = () => {
				const wanted = ctx.uiMode.get() === "crew";
				if (wanted === (active !== void 0)) return;
				if (!wanted) {
					active?.();
					active = void 0;
					return;
				}
				active = ctx.slots.inject("root", () => ctx.slots.register({
					name: "root",
					priority: ROOT_PRIORITY,
					locale: CREW_NS
				}, render));
			};
			apply();
			const unsubscribe = ctx.uiMode.subscribe(apply);
			return () => {
				unsubscribe();
				active?.();
				active = void 0;
			};
		}
		/**
		* Client plugin body.
		*
		* Mounting the Team Remote contribution is awaited before the surface is
		* registered, so the board never renders against a namespace that is not there.
		* @param ctx - client root context.
		* @returns a disposer for the Remote mount and the surface registration.
		*/
		async function apply(ctx) {
			const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
			ctx.effect(() => ctx.locale.register(CREW_NS, {
				zh,
				en
			}), "crew-ui: dictionaries");
			ctx.effect(() => ctx.uiMode.announce("crew"), "crew-ui: surface announcement");
			const disposeSurface = bindRootRegistration(ctx);
			return async () => {
				disposeSurface();
				await disposeRemote();
			};
		}
		//#endregion
		exports.BOARD_COLUMNS = BOARD_COLUMNS;
		exports.CREW_NS = CREW_NS;
		exports.CREW_PRESET = CREW_PRESET;
		exports.MissionControl = MissionControl;
		exports.apply = apply;
		exports.blockerLabels = blockerLabels;
		exports.failureText = failureText;
		exports.foldThread = foldThread;
		exports.groupTasks = groupTasks;
		exports.inject = inject;
		exports.leadSessionId = leadSessionId;
		exports.name = name;
		exports.stageAction = stageAction;
		exports.transportText = transportText;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map