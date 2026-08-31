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
import type { UiModeController } from '@dsh-portable/ui-mode/client'
import { createNavigationStore } from './state/navigation.ts'
import { createDcodeRuntime, DcodeRuntimeProvider } from './state/runtime.ts'
import { bindTranslate, TranslateProvider } from './state/i18n.ts'
import { DCODE_NS, en, zh, type DcodeKey } from './locales.ts'
import { Workbench } from './shell/Workbench.tsx'
import { ModelsUsageCard } from './settings/ModelsUsageCard.tsx'

export { Workbench } from './shell/Workbench.tsx'
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
]

/**
 * Shadow priority of the workbench's `root` registration.
 *
 * Lowest renders. The official AppFrame registers at the default 0, so any
 * negative value wins. Mission Control claims -2000; the gap between them is
 * deliberate, so a further surface can sit between without renumbering either.
 *
 * Priorities do not decide WHICH surface shows — the mode store does, and each
 * surface registers only while it is selected — so the ordering matters only in
 * the moment one registration is being swapped for another.
 */
const ROOT_PRIORITY = -1000

/** Order of the usage card in the classic Models page footer area. */
const SETTINGS_MODELS_FOOTER_ORDER = 0

/**
 * Register the workbench root, and re-register it whenever the mode changes.
 * @param ctx - client root context.
 * @param mode - the page's mode store.
 * @returns a disposer that removes any active registration and the subscription.
 */
function bindRootRegistration(ctx: ClientContext, mode: UiModeController): () => void {
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

  ctx.effect(() => bindRootRegistration(ctx, ctx.uiMode), 'dcode-ui: root surface')

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
  }, ModelsUsageCard))
}
