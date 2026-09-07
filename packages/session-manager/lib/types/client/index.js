import { SESSION_MANAGER_NS, en, zh } from "./locales.js";
export { UsageCards, usageCardStyles } from "./UsageCards.js";
export { SESSION_MANAGER_NS, en, zh } from "./locales.js";
export * from "./usage.js";
export const name = 'session-manager-client';
export const inject = ['locale'];
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(SESSION_MANAGER_NS, { zh, en }), 'session-manager: dictionaries');
}
//# sourceMappingURL=index.js.map