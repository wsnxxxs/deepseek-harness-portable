/** Shared presentation helpers for the portable workbench.
 * Official archive and usage pages are provided by dsh-web-all.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { SESSION_MANAGER_NS, en, zh, type SessionManagerKey } from './locales.ts'
export { UsageCards, usageCardStyles, type UsageCardStyles, type UsageCardsProps } from './UsageCards.tsx'
export { SESSION_MANAGER_NS, en, zh, type SessionManagerKey, type SessionManagerTranslate } from './locales.ts'
export * from './usage.ts'
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { sessionManager: SessionManagerKey }
}
export const name = 'session-manager-client'
export const inject = ['locale']
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(SESSION_MANAGER_NS, { zh, en }), 'session-manager: dictionaries')
}
