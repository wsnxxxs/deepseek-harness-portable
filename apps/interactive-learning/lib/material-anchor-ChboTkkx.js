//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
//#endregion
//#region lib/types/ingest/types.js
var types_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_ingest_types from "@dsh-portable/space-kernel/ingest/types";
__reExport(types_exports, import__dsh_portable_space_kernel_ingest_types);
//#endregion
//#region lib/types/material-anchor.js
var material_anchor_exports = /* @__PURE__ */ __exportAll({});
import * as import__dsh_portable_space_kernel_material_anchor from "@dsh-portable/space-kernel/material-anchor";
__reExport(material_anchor_exports, import__dsh_portable_space_kernel_material_anchor);
//#endregion
export { __reExport as i, types_exports as n, __exportAll as r, material_anchor_exports as t };
