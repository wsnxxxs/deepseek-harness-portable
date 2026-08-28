/**
 * The workbench's single view of the DSH client services.
 *
 * The plugin body resolves every service once and hands this object to the
 * React tree through one context. Nothing in the tree reaches for a cordis
 * context of its own, so a component can be rendered in isolation with a
 * stub, and the set of DSH capabilities the workbench depends on is exactly
 * the surface of this file.
 *
 * Every field is an existing DSH capability. This module adds no state that
 * duplicates the Host: session lists, conversation transcripts, projections,
 * settings and the workspace registry are all read through their owning
 * services, and the workbench's own state (which panel is open, which nav
 * entry is selected) lives separately in {@link ../state/navigation.ts}.
 * @module @dsh-portable/zcode-ui/client/state/runtime
 */

import { createContext, useContext } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {
  AgentContext, ISessions, SessionBinding, SessionListState, SessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { UiModeStore } from '../mode.ts'
import { createLearningCall, createZcodeApi, type RpcCarrier, type ZcodeApi } from '../rpc.ts'
import { createAppearanceStore, type AppearanceStore, type ThemeFace } from '../theme.ts'

export type { SessionListState, SessionSummary, WorkspaceSnapshot }

/** The minimal observable shape every DSH client store exposes. */
export interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** Official Composer behavior for plain Enter while a turn is running. */
export type BusyEnterBehavior = 'queue' | 'steer'

/** Durable conversation preference exposed as one small observable face. */
export interface BusyEnterStore extends Observable<BusyEnterBehavior> {
  readonly writable: boolean
  set(value: BusyEnterBehavior): void
}

/** Locale catalog used by the General settings language row. */
export interface LocaleSnapshot {
  readonly active: string
  readonly locales: readonly { readonly id: string; readonly label: string }[]
  readonly revision: number
}

/** Active locale plus the existing runtime write entry. */
export interface LocaleStore extends Observable<LocaleSnapshot> {
  set(id: string): void
}

/** The navigation face of `ctx.uiWorkspace`, used for New Task and Open Workspace. */
export interface WorkspaceNavigation {
  startSession(workspaceId?: string): void
  connectWorkspace(workspaceId: string): Promise<SessionId>
  /** The host's native chooser; rejects on a surface that has none. */
  pickDirectory(): Promise<string | null>
  /** One browse level, the fallback every surface can serve. */
  listDirectory(path?: string, signal?: AbortSignal): Promise<unknown>
  createDirectory(path: string, name: string): Promise<string>
  archiveSession(sessionId: SessionId): Promise<void>
}


/** Everything the workbench needs from the assembled DSH client. */
export interface ZcodeRuntime {
  /** Session Controller: list, selection, lifecycle, per-session faces. */
  readonly sessions: ISessions
  /** Workspace Controller: the durable workspace registry. */
  readonly workspaces: IWorkspaces
  /** Workspace navigation (New Session, native directory picker). */
  readonly navigation: WorkspaceNavigation | undefined
  /** Generated Host Remote namespaces (settings, models, skills, commands, plugins, subagents). */
  readonly remote: ClientRemote
  /** Theme service, when `ui-theme` is part of this assembly. */
  readonly theme: ThemeFace | undefined
  /** Resolved colour scheme, the theme preference, and the window backdrop. */
  readonly appearance: AppearanceStore
  /** Official `ui-conversation.busyEnter` preference. */
  readonly busyEnter: BusyEnterStore
  /** Shared DSH locale registry and preference. */
  readonly locale: LocaleStore
  /** Git, diff, undo and file reads over the `/zcode` channel. */
  readonly git: ZcodeApi
  /** The Interactive Learning channel caller, shared with the official UI's learning views. */
  readonly learningCall: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>
  /**
   * The learning pack's own bound translate function. Its surfaces carry their
   * own dictionary; reusing it keeps one copy of the learning vocabulary
   * instead of a second translation of the same words.
   */
  readonly learningT: (key: string, params?: Record<string, unknown>) => string
  /** The active-mode store shared with every switch entry point. */
  readonly mode: UiModeStore
  /**
   * Resolve the Chat transcript feed of one session.
   * @param sessionId - session to observe.
   * @returns an observable over the assembled Chat snapshot, or undefined when the session has no binding yet.
   */
  chatFeed(sessionId: SessionId): Observable<ChatSnapshot> | undefined
  /**
   * Resolve a session's binding.
   * @param sessionId - session to resolve.
   */
  binding(sessionId: SessionId): SessionBinding | undefined
  /**
   * Resolve an Agent-scoped context, the address `ctx.conversation` verbs use.
   * @param sessionId - session to scope to.
   */
  scope(sessionId: SessionId): AgentContext | undefined
}

/** The locale runtime face this module needs off `ctx.locale`. */
interface LocaleFace {
  bind(namespace: string): (key: string, params?: Record<string, unknown>) => string
  getSnapshot(): LocaleSnapshot
  subscribe(listener: () => void): () => void
  setLocale(id: string): void
}

interface SettingsScopeFace<T> {
  getSnapshot(): { readonly value: T | undefined; readonly writable: boolean }
  subscribe(listener: () => void): () => void
  set(field: string, value: unknown): Promise<void>
}

interface SettingsScopeBinderFace {
  bind<T>(spec: { namespace: string }): SettingsScopeFace<T>
}

/** The Conversation assembly face this module needs off `ctx.uiConversation`. */
interface UiConversationFace {
  binding(binding: SessionBinding): {
    target(name: string): { getSnapshot(): unknown; subscribe(listener: () => void): () => void }
  }
}

/**
 * Build the runtime from a live client context.
 *
 * Optional services are probed rather than injected so a trimmed assembly
 * (a deployment without `ui-theme`, say) still boots the workbench with the
 * dependent surface disabled instead of failing the whole plugin.
 * @param ctx - client root context, after this plugin's inject set activated.
 * @param mode - the page's mode store.
 * @returns the runtime handed to the React tree.
 */
export function createZcodeRuntime(ctx: ClientContext, mode: UiModeStore): ZcodeRuntime {
  const sessions = ctx.get('sessions') as ISessions
  const workspaces = ctx.get('workspaces') as IWorkspaces
  const uiConversation = ctx.get('uiConversation') as UiConversationFace | undefined
  const carrier = ctx.get('connection') as RpcCarrier | undefined
  const navigation = ctx.get('uiWorkspace') as WorkspaceNavigation | undefined
  const theme = ctx.get('theme') as ThemeFace | undefined
  const locale = ctx.get('locale') as LocaleFace | undefined
  const settingsScope = ctx.get('settingsScope') as SettingsScopeBinderFace | undefined
  const conversationSettings = settingsScope?.bind<{ busyEnter?: BusyEnterBehavior }>({ namespace: 'ui-conversation' })
  const fallbackLocale: LocaleSnapshot = { active: 'en', locales: [], revision: 0 }

  // One cache per session id: the Chat target face is identity-stable for a
  // binding, and `useSyncExternalStore` needs a stable subscribe reference.
  const feeds = new Map<SessionId, Observable<ChatSnapshot>>()

  return {
    sessions,
    workspaces,
    navigation,
    remote: ctx.remote,
    theme,
    appearance: createAppearanceStore(ctx as unknown as { on(name: 'theme/change', listener: () => void): () => void }, theme),
    busyEnter: {
      getSnapshot: () => conversationSettings?.getSnapshot().value?.busyEnter === 'steer' ? 'steer' : 'queue',
      subscribe: listener => conversationSettings?.subscribe(listener) ?? (() => {}),
      get writable() { return conversationSettings?.getSnapshot().writable ?? false },
      set: value => { void conversationSettings?.set('busyEnter', value) },
    },
    locale: {
      getSnapshot: () => locale?.getSnapshot() ?? fallbackLocale,
      subscribe: listener => locale?.subscribe(listener) ?? (() => {}),
      set: id => { locale?.setLocale(id) },
    },
    git: createZcodeApi(carrier),
    learningCall: createLearningCall(carrier),
    // The pack registers this namespace itself; an assembly without it falls
    // back to the raw key, which is still readable and never throws.
    learningT: locale?.bind('interactive-learning') ?? (key => key),
    mode,
    binding: sessionId => sessions.binding(sessionId),
    scope: sessionId => sessions.scope(sessionId),
    chatFeed: (sessionId) => {
      const cached = feeds.get(sessionId)
      if (cached !== undefined) return cached
      if (uiConversation === undefined) return undefined
      const binding = sessions.binding(sessionId)
      if (binding === undefined) return undefined
      const target = uiConversation.binding(binding).target('chat')
      const feed: Observable<ChatSnapshot> = {
        getSnapshot: () => target.getSnapshot() as ChatSnapshot,
        subscribe: listener => target.subscribe(listener),
      }
      feeds.set(sessionId, feed)
      return feed
    },
  }
}

const RuntimeContext = createContext<ZcodeRuntime | undefined>(undefined)

/** Provider for the runtime; mounted once at the workbench root. */
export const ZcodeRuntimeProvider = RuntimeContext.Provider

/**
 * Read the runtime.
 * @returns the runtime supplied by the workbench root.
 * @throws when a component renders outside the workbench tree.
 */
export function useRuntime(): ZcodeRuntime {
  const runtime = useContext(RuntimeContext)
  if (runtime === undefined) throw new Error('zcode-ui: component rendered outside the workbench runtime provider')
  return runtime
}
