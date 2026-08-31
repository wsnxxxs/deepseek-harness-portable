/**
 * Browser entry for Mission Control.
 *
 * The switch mechanism is the one every surface in this distribution shares:
 * DSH's shell renders exactly one ctx-level slot, `root`, and a registration at
 * a lower priority shadows the one already there. Mission Control claims
 * `-2000`, below the workbench's `-1000`, and registers only while the shared
 * `ctx.uiMode` service says it is selected.
 *
 * Priority does not decide WHICH surface shows — the mode does, and each
 * surface registers only for its own mode — so the numbers matter solely in the
 * instant one registration replaces another.
 *
 * The Team Remote namespace is mounted here rather than assumed: the service is
 * a host-plane row, so the descriptor has to be contributed by whichever client
 * wants to call it. Mounting fails closed — the plugin does not register the
 * surface — which leaves the official AppFrame rendering rather than a frameless
 * page.
 * @module @dsh-portable/crew-ui/client
 */

import { createElement } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import agentTeamsRemote from '@deepseek-ai/dsh-experimental-agent-team/remote'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
// Type-only imports pull the declaration merges (ctx.slots, ctx.sessions,
// ctx.remote and the SlotMap keys) into this compilation unit without adding a
// runtime module edge.
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-client-ui-agent-preset/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@dsh-portable/ui-mode/client'
import { CREW_NS, en, zh, type CrewKey } from './locales.ts'
import { CrewRuntimeProvider, type CrewRuntime } from './state/runtime.ts'
import { MissionControl } from './shell/MissionControl.tsx'

export { MissionControl } from './shell/MissionControl.tsx'
export { foldThread } from './state/thread.ts'
export { BOARD_COLUMNS, blockerLabels, failureText, groupTasks, leadSessionId, transportText } from './state/board.ts'
export { CREW_PRESET, stageAction, type StageAction } from './state/mission-preset.ts'
export { CREW_NS, type CrewKey } from './locales.ts'
export type { CrewRuntime } from './state/runtime.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Mission Control's own copy. */
    crew: CrewKey
  }
}

/** Stable Cordis plugin name. */
export const name = 'crew-ui-client'

/**
 * Services Mission Control cannot render without.
 *
 * Every generated Remote namespace it reads is declared individually: cordis
 * refuses `ctx.remote.<ns>` from a context that did not inject that namespace,
 * and the failure is a runtime throw inside whichever panel touches it rather
 * than a compile error.
 *
 * `uiMode` is what gates the surface; without it there is no way to know
 * whether this surface is the selected one, so it is a hard requirement rather
 * than a probed optional.
 */
export const inject = [
  'slots', 'locale', 'uiMode', 'sessions', 'workspaces', 'conversation', 'uiConversation',
  'uiSession', 'connection',
  'remote',
  'remote.agentTeams',
  'remote.agentPresets',
]

/**
 * Shadow priority of Mission Control's `root` registration.
 *
 * Lowest renders. The official AppFrame sits at 0 and the workbench at -1000;
 * the gap below leaves room for a further surface without renumbering either.
 */
const ROOT_PRIORITY = -2000

/**
 * Build the Host-service view the React tree reads.
 * @param ctx - client root context, already injected.
 * @returns the runtime.
 */
function createCrewRuntime(ctx: ClientContext): CrewRuntime {
  const t = ctx.locale.bind(CREW_NS) as CrewRuntime['t']
  const uiModeT = ctx.locale.bind('uiMode') as CrewRuntime['uiModeT']
  const uiWorkspace = ctx.get('uiWorkspace') as CrewRuntime['navigation']
  const uiConversation = ctx.uiConversation as {
    binding(binding: unknown): { target(name: string): unknown } | undefined
  } | undefined

  return {
    sessions: ctx.sessions,
    workspaces: ctx.workspaces,
    navigation: uiWorkspace,
    teams: {
      view: lead => ctx.remote.agentTeams.view(lead),
      createTask: (lead, request) => ctx.remote.agentTeams.createTask(lead, request),
      updateTask: (lead, request) => ctx.remote.agentTeams.updateTask(lead, request),
    },
    presets: {
      select: (sessionId, preset) => ctx.remote.agentPresets.select(sessionId, preset) as never,
    },
    mode: ctx.uiMode,
    t,
    uiModeT,
    input: (sessionId: SessionId) => {
      // A session that has no agent scope yet is starting; there is nothing to
      // type into until it does, and the composer renders nothing rather than
      // holding a draft the Host cannot receive.
      const scope = ctx.sessions.scope(sessionId)
      if (scope === undefined) return undefined
      return ctx.conversation?.input.for(scope) as never
    },
    dossier: async (endpoint, payload) => {
      const connection = ctx.get('connection') as {
        rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<unknown> }
      } | undefined
      // A trimmed assembly without the channel leaves the panel showing its
      // own message rather than throwing inside a render.
      if (connection === undefined) {
        return {
          ok: false,
          error: { code: 'no-connection', message: 'the dossier channel is not available', details: {} },
        }
      }
      try {
        return await connection.rpc.call('/crew-dossier', endpoint, payload) as never
      } catch (error) {
        // A Connection call REJECTS on transport failure — a dropped Host
        // connection, a non-2xx response, a malformed envelope — rather than
        // resolving `ok: false`. Absorbing it here means every consumer of
        // this face reads one envelope and no panel has to carry a catch of
        // its own, which is what stops a lost connection from leaving a panel
        // spinning on an unhandled rejection.
        return {
          ok: false,
          error: {
            code: 'transport-failed',
            message: error instanceof Error ? error.message : String(error),
            details: { endpoint },
          },
        }
      }
    },
    chatFeed: (sessionId: SessionId) => {
      const binding = ctx.sessions.binding(sessionId)
      if (binding === undefined || uiConversation === undefined) return undefined
      return uiConversation.binding(binding)?.target('chat') as never
    },
    ctx,
  }
}

/**
 * Register the surface, and re-register it whenever the mode changes.
 * @param ctx - client root context.
 * @returns a disposer removing any active registration and the subscription.
 */
function bindRootRegistration(ctx: ClientContext): () => void {
  const runtime = createCrewRuntime(ctx)

  // One element tree, created once: a mode flip mounts and unmounts it.
  const render = (): ReturnType<typeof createElement> =>
    createElement(CrewRuntimeProvider, { value: runtime }, createElement(MissionControl))

  let active: (() => void) | undefined

  const apply = (): void => {
    const wanted = ctx.uiMode.get() === 'crew'
    if (wanted === (active !== undefined)) return
    if (!wanted) {
      active?.()
      active = undefined
      return
    }
    // `slots.inject` rather than a bare register: the built-in `root`
    // declaration is already committed, so the callback runs synchronously, and
    // a renderer epoch change re-runs it instead of dropping the contribution.
    active = ctx.slots.inject('root', () => ctx.slots.register(
      {
        name: 'root',
        priority: ROOT_PRIORITY,
        locale: CREW_NS,
      },
      render,
    ))
  }

  apply()
  const unsubscribe = ctx.uiMode.subscribe(apply)
  return () => {
    unsubscribe()
    active?.()
    active = undefined
  }
}

/**
 * Client plugin body.
 *
 * Mounting the Team Remote contribution is awaited before the surface is
 * registered, so the board never renders against a namespace that is not there.
 * @param ctx - client root context.
 * @returns a disposer for the Remote mount and the surface registration.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(agentTeamsRemote)
  ctx.effect(() => ctx.locale.register(CREW_NS, { zh, en }), 'crew-ui: dictionaries')
  // Reaching this line is the evidence that this build can render Mission
  // Control: the Team Remote contribution mounted, and the plugin body ran at
  // all. A build whose Host disabled the Team runtime does not mount this
  // client row, so nothing announces `crew` and every switch shows it as
  // unavailable instead of offering a choice that lands on the official UI.
  ctx.effect(() => ctx.uiMode.announce('crew'), 'crew-ui: surface announcement')
  const disposeSurface = bindRootRegistration(ctx)
  return async () => {
    disposeSurface()
    await disposeRemote()
  }
}
