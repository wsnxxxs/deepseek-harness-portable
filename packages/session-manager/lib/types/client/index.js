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
import { ArchivedChatsSection } from "./ArchivedChatsSection.js";
import { ModelsUsageCard } from "./ModelsUsageCard.js";
import { SESSION_MANAGER_NS, en, zh } from "./locales.js";
export { useArchivedChats } from "./archive.js";
export { UsageCards, usageCardStyles } from "./UsageCards.js";
export { ArchivedChatsSection } from "./ArchivedChatsSection.js";
export { ModelsUsageCard } from "./ModelsUsageCard.js";
export { SESSION_MANAGER_NS, en, zh, } from "./locales.js";
export * from "./usage.js";
/** Stable Cordis plugin name. */
export const name = 'session-manager-client';
/**
 * Services this plugin cannot register without.
 *
 * `sessions` and `workspaces` are the two official controllers the archive
 * page mutates; cordis holds the plugin body until both have published, so
 * the inject faces below never see a half-built context. Reading the same
 * state needs no injection at all — `useSessions` and `useWorkspaces` are
 * global standard props delivered to every slot component.
 */
export const inject = ['slots', 'locale', 'sessions', 'workspaces'];
/**
 * Order of the archive page in the official settings rail.
 *
 * Models is 10 and the plugin pages sit further down; the archive is a page
 * about the conversation corpus rather than about configuration, so it takes a
 * position after the feature pages and before the diagnostics ones.
 */
const SETTINGS_ARCHIVE_ORDER = 25;
/** Order of the usage card inside the Models page footer seat. */
const SETTINGS_MODELS_FOOTER_ORDER = 0;
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(SESSION_MANAGER_NS, { zh, en }), 'session-manager: dictionaries');
    // Bound once: the nav label thunk and the inject face share one translate,
    // and copy freshness rides the locale revision rather than a rebind.
    const t = ctx.locale.bind(SESSION_MANAGER_NS);
    // Captured here, where the injections are declared, so the section component
    // receives callbacks and never a context.
    const archiveOperations = () => ({
        restore: id => ctx.workspaces.unarchiveSession(id),
        remove: id => ctx.sessions.delete(id),
        open: (id) => { ctx.sessions.open(id); },
        clear: () => { ctx.sessions.clear(); },
    });
    // `slots.inject` rather than a bare register in both cases: the declarations
    // belong to plugins that may activate after this one (the settings shell for
    // `settings.section`, the Models section for its own footer child slot), and
    // a renderer epoch change must re-run the contribution instead of silently
    // dropping it. An assembly without the Models page simply never runs the
    // second callback, and the archive page is unaffected.
    ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'archived-chats',
        order: SETTINGS_ARCHIVE_ORDER,
        label: () => t('archive.title'),
        locale: SESSION_MANAGER_NS,
        inject: archiveOperations,
    }, ArchivedChatsSection));
    ctx.slots.inject('settings.models.footer', () => ctx.slots.register({
        name: 'settings.models.footer',
        id: 'portable-usage',
        order: SETTINGS_MODELS_FOOTER_ORDER,
        locale: SESSION_MANAGER_NS,
    }, ModelsUsageCard));
}
//# sourceMappingURL=index.js.map