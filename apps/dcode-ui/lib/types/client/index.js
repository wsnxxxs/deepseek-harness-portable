/**
 * Browser entry for the modern workbench.
 *
 * The whole switch mechanism is here, and it is small on purpose. DSH's shell
 * renders exactly one ctx-level slot, `root`, and `ui-layout` occupies it with
 * the official three-column frame. A second registration at a lower priority
 * shadows that frame, so:
 *
 * - selecting the workbench registers {@link Workbench} into `root`;
 * - selecting any other surface disposes that registration, so either the
 *   official AppFrame renders again untouched or the surface that claimed a
 *   lower priority renders instead.
 *
 * Every direction is a slot mutation inside the live page. The DSH Runtime,
 * the Host connection, the Session list, every open Conversation and all
 * Workspace state are shared by construction — no surface owns a copy — so
 * switching costs a React remount and nothing else.
 *
 * The switch row inside the official settings page is NOT registered here: it
 * lists every surface, so it belongs to `@dsh-portable/ui-mode` rather than to
 * any one of them.
 * @module @dsh-portable/dcode-ui/client
 */
import { createElement } from 'react';
import agentTeamsRemote from '@deepseek-ai/dsh-experimental-agent-team/remote';
import { createNavigationStore } from "./state/navigation.js";
import { createDcodeRuntime, DcodeRuntimeProvider } from "./state/runtime.js";
import { bindTranslate, TranslateProvider } from "./state/i18n.js";
import { DCODE_NS, en, zh } from "./locales.js";
import { Workbench } from "./shell/Workbench.js";
import { ModelsUsageCard } from "./settings/ModelsUsageCard.js";
export { Workbench } from "./shell/Workbench.js";
export { createNavigationStore } from "./state/navigation.js";
export { createDcodeRuntime } from "./state/runtime.js";
export { fuzzyMatch } from "./shell/CommandPalette.js";
export { parsePatch } from "./git/patch.js";
export { changedPaths, splitTurns, summarizeTool } from "./chat/tools.js";
export { hasAnsi, parseAnsi, stripAnsi } from "./chat/ansi.js";
export { DCODE_NS } from "./locales.js";
export { isApplePlatform } from "./platform.js";
/** Stable Cordis plugin name. */
export const name = 'dcode-ui-client';
/**
 * Services the workbench cannot render without.
 *
 * Every generated Remote namespace it reads is declared individually: cordis
 * refuses `ctx.remote.<ns>` from a context that did not inject that namespace,
 * so an omission here is a runtime throw inside whichever panel touches it,
 * not a compile error.
 *
 * `uiWorkspace`, `theme` and `connection` are deliberately absent: each drives
 * one optional surface and is probed at runtime, so a trimmed assembly still
 * boots this plugin with that surface disabled rather than leaving the page
 * frameless.
 */
export const inject = [
    'slots', 'locale', 'settingsScope', 'settingsSchema', 'sessions', 'workspaces', 'conversation', 'uiConversation',
    'uiSession', 'connection', 'commandUi', 'uiMode',
    'remote',
    'remote.session',
    'remote.commands',
    'remote.skills',
    'remote.settings',
    'remote.credentials',
    'remote.llm',
    'remote.pluginInventory',
    'remote.messageFeedback',
    'remote.subagents',
    'remote.agentPresets',
    'remote.fileReferences',
    'remote.goals',
];
/**
 * Shadow priority of the workbench's `root` registration.
 *
 * Lowest renders. The official AppFrame registers at the default 0, so any
 * negative value wins. The gap below -1000 leaves room for another surface
 * without changing the official registration.
 *
 * Priorities do not decide WHICH surface shows — the mode store does, and each
 * surface registers only while it is selected — so the ordering matters only in
 * the moment one registration is being swapped for another.
 */
const ROOT_PRIORITY = -1000;
/** Order of the usage card in the classic Models page footer area. */
const SETTINGS_MODELS_FOOTER_ORDER = 0;
/**
 * Register the workbench root, and re-register it whenever the mode changes.
 * @param ctx - client root context.
 * @param mode - the page's mode store.
 * @returns a disposer that removes any active registration and the subscription.
 */
function bindRootRegistration(ctx, mode, cluster) {
    const navigation = createNavigationStore();
    const runtime = createDcodeRuntime(ctx, mode, cluster);
    const t = bindTranslate(ctx.locale.bind(DCODE_NS));
    // One element tree, created once: a mode flip mounts and unmounts it, and
    // the workbench's own view state survives in `navigation` across the flip.
    const render = () => createElement(DcodeRuntimeProvider, { value: runtime }, createElement(TranslateProvider, { value: t }, createElement(Workbench, { navigation })));
    let active;
    const apply = () => {
        const wanted = mode.get() === 'dcode';
        if (wanted === (active !== undefined))
            return;
        if (!wanted) {
            active?.();
            active = undefined;
            return;
        }
        // `slots.inject` rather than a bare register: the built-in `root`
        // declaration is already committed, so the callback runs synchronously,
        // and a renderer epoch change re-runs it instead of silently dropping the
        // contribution.
        active = ctx.slots.inject('root', () => ctx.slots.register({
            name: 'root',
            priority: ROOT_PRIORITY,
            locale: DCODE_NS,
            // `settings.section` is already owned by the official `sidebar.settings`
            // entry (ui-settings-general declares it), and a slot has exactly one
            // declarer: re-declaring it here throws at register() and fails the
            // whole client plugin tree. The workbench therefore renders its own
            // settings sections instead of the official ones while active.
        }, render));
    };
    apply();
    const unsubscribe = mode.subscribe(apply);
    return () => {
        unsubscribe();
        active?.();
        active = undefined;
    };
}
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(DCODE_NS, { zh, en }), 'dcode-ui: dictionaries');
    // Announced from the plugin body, so this is evidence rather than a claim:
    // an assembly that trimmed this bundle, or a load failure that kept this
    // body from running, leaves the workbench marked unavailable in every switch
    // rather than offering a choice that silently renders the official UI.
    ctx.effect(() => ctx.uiMode.announce('dcode'), 'dcode-ui: surface announcement');
    // The Team Remote is mounted in this plugin's own lifecycle. The official
    // root never reads it; the Cluster inspector receives the namespace only
    // after the mount succeeds, while a missing optional capability still lets
    // DCode boot without changing the official surface.
    ctx.effect(async () => {
        try {
            const disposeRemote = await ctx.remote.$mount(agentTeamsRemote);
            const surface = ctx.inject(['remote.agentTeams'], scope => (bindRootRegistration(scope, scope.uiMode, scope.remote.agentTeams)));
            try {
                await surface;
            }
            catch (error) {
                await surface.dispose();
                await disposeRemote();
                throw error;
            }
            return async () => {
                await surface.dispose();
                await disposeRemote();
            };
        }
        catch {
            return bindRootRegistration(ctx, ctx.uiMode, undefined);
        }
    }, 'dcode-ui: cluster remote and root surface');
    // The usage card on the classic Models page. `settings.models.footer` is the
    // seat that page declares for out-of-tree plugins, so the official section
    // itself stays untouched. Registration is unconditional: while the workbench
    // owns `root` the official page never renders, so the card appears exactly
    // in the classic UI.
    ctx.slots.inject('settings.models.footer', () => ctx.slots.register({
        name: 'settings.models.footer',
        id: 'dcode-model-usage',
        order: SETTINGS_MODELS_FOOTER_ORDER,
        locale: DCODE_NS,
    }, ModelsUsageCard));
}
//# sourceMappingURL=index.js.map