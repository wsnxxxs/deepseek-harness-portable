/**
 * Browser entry for archived-chat management and token-usage reporting.
 *
 * Both pages used to be registered by `@dsh-portable/dcode-ui`, which made two
 * capabilities of the OFFICIAL settings panel depend on a front end an
 * operator can switch away from and disable. They are not workbench features:
 * they fold state the official Host already publishes, and the official UI is
 * where an operator without the workbench needs them.
 *
 * So they live here, in one plugin of their own:
 *
 * - the archive page joins `settings.section`, the ledger the official
 *   settings shell reads;
 * - the usage card joins `settings.models.footer`, the extension seat the
 *   official Models page declares.
 *
 * The workbench keeps rendering both in its own token domain by importing the
 * shared fold (`useArchivedChats`) and the shared card (`UsageCards`) from
 * this package, so there is one implementation and two faces rather than two
 * implementations.
 * @module @dsh-portable/session-manager/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type SessionManagerKey } from './locales.ts';
export { useArchivedChats, type ArchiveActions, type ArchiveModel } from './archive.ts';
export { UsageCards, usageCardStyles, type UsageCardStyles, type UsageCardsProps } from './UsageCards.tsx';
export { ArchivedChatsSection, type ArchivedChatsInjected } from './ArchivedChatsSection.tsx';
export { ModelsUsageCard } from './ModelsUsageCard.tsx';
export { SESSION_MANAGER_NS, en, zh, type SessionManagerKey, type SessionManagerTranslate, } from './locales.ts';
export * from './usage.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Archive management and token-usage copy, shared by both surfaces. */
        sessionManager: SessionManagerKey;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "session-manager-client";
/**
 * Services this plugin cannot register without.
 *
 * `sessions` and `workspaces` are the two official controllers the archive
 * page mutates; cordis holds the plugin body until both have published, so
 * the inject faces below never see a half-built context. Reading the same
 * state needs no injection at all — `useSessions` and `useWorkspaces` are
 * global standard props delivered to every slot component.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map