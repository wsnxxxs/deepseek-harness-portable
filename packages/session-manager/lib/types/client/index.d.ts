/** Shared presentation helpers for the portable workbench.
 * Official archive and usage pages are provided by dsh-web-all.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type SessionManagerKey } from './locales.ts';
export { UsageCards, usageCardStyles, type UsageCardStyles, type UsageCardsProps } from './UsageCards.tsx';
export { SESSION_MANAGER_NS, en, zh, type SessionManagerKey, type SessionManagerTranslate } from './locales.ts';
export * from './usage.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        sessionManager: SessionManagerKey;
    }
}
export declare const name = "session-manager-client";
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map