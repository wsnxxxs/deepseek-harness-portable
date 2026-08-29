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

import { createElement } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only imports pull the declaration merges (ctx.slots, ctx.sessions,
// ctx.remote, the SlotMap keys) into this compilation unit without adding a
// runtime module edge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-trajectory/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-general/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-models/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugin-inventory/client'
import type {} from '@deepseek-ai/dsh-client-ui-agent-preset/client'
import type {} from '@deepseek-ai/dsh-client-ui-permission-presets/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-session-log-export/client'
import { createUiModeStore, type UiModeStore } from './mode.ts'
import { createNavigationStore } from './state/navigation.ts'
import { createDcodeRuntime, DcodeRuntimeProvider } from './state/runtime.ts'
import { bindTranslate, TranslateProvider } from './state/i18n.ts'
import { DCODE_NS, en, zh, type DcodeKey } from './locales.ts'
import { Workbench } from './shell/Workbench.tsx'
import { InterfaceSettingsSection } from './settings/InterfaceSettingsSection.tsx'

export { Workbench } from './shell/Workbench.tsx'
export { createUiModeStore, readBridge, type UiModeBridge, type UiModeStore } from './mode.ts'
export { createNavigationStore, type NavigationState, type NavigationStore } from './state/navigation.ts'
export { createDcodeRuntime, type DcodeRuntime } from './state/runtime.ts'
export { fuzzyMatch } from './shell/CommandPalette.tsx'
export { parsePatch, type DiffLine } from './git/patch.ts'
export { changedPaths, splitTurns, summarizeTool } from './chat/tools.ts'
export { hasAnsi, parseAnsi, stripAnsi, type AnsiSpan } from './chat/ansi.ts'
export { DCODE_NS, type DcodeKey } from './locales.ts'
export { isApplePlatform } from './platform.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The workbench's own copy. */
    dcode: DcodeKey
  }
}

/** Stable Cordis plugin name. */
export const name = 'dcode-ui-client'

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
]

/**
 * Shadow priority of the workbench's `root` registration.
 *
 * Lowest renders. The official AppFrame registers at the default 0, so any
 * negative value wins; a wide margin leaves room for a future surface to sit
 * between the two without renumbering this one.
 */
const ROOT_PRIORITY = -1000

/** Order of the interface item in the classic General settings page. */
const SETTINGS_GENERAL_ITEM_ORDER = 5

/**
 * Register the workbench root, and re-register it whenever the mode changes.
 * @param ctx - client root context.
 * @param mode - the page's mode store.
 * @returns a disposer that removes any active registration and the subscription.
 */
function bindRootRegistration(ctx: ClientContext, mode: UiModeStore): () => void {
  const navigation = createNavigationStore()
  const runtime = createDcodeRuntime(ctx, mode)
  const t = bindTranslate(ctx.locale.bind(DCODE_NS))

  // One element tree, created once: a mode flip mounts and unmounts it, and
  // the workbench's own view state survives in `navigation` across the flip.
  const render = (): ReturnType<typeof createElement> =>
    createElement(
      DcodeRuntimeProvider,
      { value: runtime },
      createElement(TranslateProvider, { value: t }, createElement(Workbench, { navigation })),
    )

  let active: (() => void) | undefined

  const apply = (): void => {
    const wanted = mode.get() === 'dcode'
    if (wanted === (active !== undefined)) return
    if (!wanted) {
      active?.()
      active = undefined
      return
    }
    // `slots.inject` rather than a bare register: the built-in `root`
    // declaration is already committed, so the callback runs synchronously,
    // and a renderer epoch change re-runs it instead of silently dropping the
    // contribution.
    active = ctx.slots.inject('root', () => ctx.slots.register(
      {
        name: 'root',
        priority: ROOT_PRIORITY,
        locale: DCODE_NS,
        // `settings.section` is already owned by the official `sidebar.settings`
        // entry (ui-settings-general declares it), and a slot has exactly one
        // declarer: re-declaring it here throws at register() and fails the
        // whole client plugin tree. The workbench therefore renders its own
        // settings sections instead of the official ones while active.
      },
      render,
    ))
  }

  apply()
  const unsubscribe = mode.subscribe(apply)
  return () => {
    unsubscribe()
    active?.()
    active = undefined
  }
}

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(DCODE_NS, { zh, en }), 'dcode-ui: dictionaries')

  const mode = createUiModeStore()
  ctx.effect(() => () => { mode.dispose() }, 'dcode-ui: mode store')
  ctx.effect(() => bindRootRegistration(ctx, mode), 'dcode-ui: root surface')

  // The switch inside the classic General settings page. Registered through
  // `settings.general.item` so it joins the existing page instead of adding a
  // top-level settings section.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'dcode-interface',
    order: SETTINGS_GENERAL_ITEM_ORDER,
    locale: DCODE_NS,
    inject: () => ({ mode }),
  }, InterfaceSettingsSection))

}
