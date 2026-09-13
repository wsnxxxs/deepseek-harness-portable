window.__ModuleLoader__.load({
	id: "@dsh-portable/desktop-enhancements",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region src/client/index.ts
		const name = "desktop-enhancements";
		function apply(ctx) {
			const bridge = window.deepSeekDesktopEnhancements;
			if (!bridge) return;
			ctx.effect(() => {
				bridge.setEnabled(true);
				return () => bridge.setEnabled(false);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.name = name;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map