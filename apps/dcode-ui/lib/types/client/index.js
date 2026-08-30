/**
 * Browser entry for the modern workbench.
 *
 * The whole switch mechanism is here, and it is small on purpose. DSH's shell
 * renders exactly one ctx-level slot, `root`, and `ui-layout` occupies it with
 * the official three-column frame. A second registration at a lower priority
 * shadows that frame, so:
 *
 * - selecting the modern surface registers {@link Workbench} into `root`;
 * - selecting the classic surface disposes that registration and the official
 *   AppFrame renders again, untouched.
 *
 * Both directions are a slot mutation inside the live page. The DSH Runtime,
 * the Host connection, the Session list, every open Conversation and all
 * Workspace state are shared by construction — neither surface owns a copy —
 * so switching costs a React remount and nothing else.
 *
 * The classic surface additionally receives a General settings item
 * registered here, so the switch is reachable from inside the official UI as
 * well.
 * @module @dsh-portable/dcode-ui/client
 */
import { createElement } from 'react';
import { createUiModeStore } from "./mode.js";
import { createNavigationStore } from "./state/navigation.js";
import { createDcodeRuntime, DcodeRuntimeProvider } from "./state/runtime.js";
import { bindTranslate, TranslateProvider } from "./state/i18n.js";
import { DCODE_NS, en, zh } from "./locales.js";
import { Workbench } from "./shell/Workbench.js";
import { InterfaceSettingsSection } from "./settings/InterfaceSettingsSection.js";
import { ModelsUsageCard } from "./settings/ModelsUsageCard.js";
export { Workbench } from "./shell/Workbench.js";
export { createUiModeStore, readBridge } from "./mode.js";
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
    'uiSession', 'connection', 'commandUi',
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
];
/**
 * Shadow priority of the workbench's `root` registration.
 *
 * Lowest renders. The official AppFrame registers at the default 0, so any
 * negative value wins; a wide margin leaves room for a future surface to sit
 * between the two without renumbering this one.
 */
const ROOT_PRIORITY = -1000;
/** Order of the interface item in the classic General settings page (right below Appearance, order 10). */
const SETTINGS_GENERAL_ITEM_ORDER = 10.5;
/** Order of the usage card in the classic Models page footer area. */
const SETTINGS_MODELS_FOOTER_ORDER = 0;
/**
 * Register the workbench root, and re-register it whenever the mode changes.
 * @param ctx - client root context.
 * @param mode - the page's mode store.
 * @returns a disposer that removes any active registration and the subscription.
 */
function bindRootRegistration(ctx, mode) {
    const navigation = createNavigationStore();
    const runtime = createDcodeRuntime(ctx, mode);
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
    const mode = createUiModeStore();
    ctx.effect(() => () => { mode.dispose(); }, 'dcode-ui: mode store');
    ctx.effect(() => bindRootRegistration(ctx, mode), 'dcode-ui: root surface');
    // The switch inside the classic General settings page. Registered through
    // `settings.general.item` so it joins the existing page instead of adding a
    // top-level settings section.
    ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'dcode-interface',
        order: SETTINGS_GENERAL_ITEM_ORDER,
        locale: DCODE_NS,
        inject: () => ({ mode }),
    }, InterfaceSettingsSection));
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