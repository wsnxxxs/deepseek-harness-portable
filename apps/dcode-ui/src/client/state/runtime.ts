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
 * @module @dsh-portable/dcode-ui/client/state/runtime
 */

import { createContext, useContext, type ComponentType } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {
  AgentContext, ISessions, SessionBinding, SessionListState, SessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatNodeProcessSource, ChatNodeSource, ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionPendingInteractionBase } from '@deepseek-ai/dsh-client-ui-session/client'
import type { MessageFeedbackInjected } from '@deepseek-ai/dsh-client-ui-message-feedback/client'
import type {
  ComposerAttachment, ConversationController, ConversationTimelineSnapshot, DraftAttachmentId, SessionInput,
} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { AskUserQuestionAnswer, AskUserQuestionItem } from '@deepseek-ai/dsh-user-questions'
import type { SessionLogDownloadState } from '@deepseek-ai/dsh-session-log-export/client'
import type {
  SettingsDescribeFace, SettingsSchemaService,
} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { UI_MODE_NS, type UiModeController, type UiModeKey } from '@dsh-portable/ui-mode/client'
import {
  createLearningCall, createDcodeApi, createDcodeMemoryApi,
  type RpcCarrier, type DcodeApi, type DcodeMemoryApi,
} from '../rpc.ts'
import { createAppearanceStore, type AppearanceStore, type ThemeFace } from '../theme.ts'
import type { MessageFeedbackProvider } from '../chat/message-feedback.ts'

export type { SessionListState, SessionSummary, WorkspaceSnapshot }
export type { SessionLogDownloadState }

const EMPTY_LIST: readonly never[] = []
const EMPTY_CHAT_NODE_SOURCE: ChatNodeSource = {
  getSnapshot: () => undefined,
  subscribe: () => () => {},
}
const EMPTY_CHAT_NODE_PROCESS_SOURCE: ChatNodeProcessSource = {
  getSnapshot: () => undefined,
  subscribe: () => () => {},
}

/** Stable empty Chat value used while the Conversation target is starting. */
export const EMPTY_CHAT_SNAPSHOT: ChatSnapshot = {
  order: EMPTY_LIST,
  nodes: {
    get: () => undefined,
    source: () => EMPTY_CHAT_NODE_SOURCE,
    processSource: () => EMPTY_CHAT_NODE_PROCESS_SOURCE,
    values: () => EMPTY_LIST,
  },
  locations: { getTurn: () => EMPTY_LIST, getStep: () => EMPTY_LIST },
  navigation: { items: () => EMPTY_LIST },
  timeline: { turnOrder: EMPTY_LIST, turns: new Map() } satisfies ConversationTimelineSnapshot,
  legacy: {
    nodes: EMPTY_LIST,
    turnTimings: new Map(),
    turnEnds: new Map(),
    partial: null,
    runningCalls: EMPTY_LIST,
  },
}

/** Stable empty value used before the optional Trajectory target is available. */
export const EMPTY_TRAJECTORY_SNAPSHOT: TrajectorySnapshot = {
  eventNodes: [],
  eventLocations: new Map(),
  requests: [],
  callSchemas: new Map(),
  partial: null,
  runningCalls: [],
}

/** The structured answer carried by the Host's ask-user-question protocol. */
export type DcodeQuestionAnswer = AskUserQuestionAnswer

/** One question item exposed by a pending user interaction. */
export type DcodeQuestionItem = AskUserQuestionItem

/** The small domain face the dcode composer needs from a pending question. */
export interface DcodePendingInteraction extends SessionPendingInteractionBase {
  readonly questions: readonly DcodeQuestionItem[]
  answer(answer: DcodeQuestionAnswer): Promise<void>
  cancel(): Promise<void>
}

/** Goal mutation verbs exposed by the generated goals Remote namespace. */
export interface DcodeGoalsRemote {
  edit(sessionId: SessionId, ref: { readonly id: string; readonly revision: number }, payload: { readonly objective: string }): Promise<{ ok: boolean; error?: { message: string } }>
  pause(sessionId: SessionId, ref: { readonly id: string; readonly revision: number }): Promise<{ ok: boolean; error?: { message: string } }>
  resume(sessionId: SessionId, ref: { readonly id: string; readonly revision: number }): Promise<{ ok: boolean; error?: { message: string } }>
  clear(sessionId: SessionId, ref: { readonly id: string; readonly revision: number }): Promise<{ ok: boolean; error?: { message: string } }>
}

/**
 * The Cluster surface an orchestration plugin may publish on `ctx.cluster`.
 *
 * Restated structurally rather than imported: Cluster mode ships as its own
 * plugin (`@dsh-portable/cluster-ui`), and the workbench must render whether
 * or not that plugin is in the assembly. A type import would be a build edge
 * on an optional package; this shape is the whole contract, and a mismatch
 * fails the narrowing in {@link readClusterSurface} rather than the page.
 */
export interface DcodeClusterSurface {
  /** Whether the publisher's own backing capability answered. */
  readonly available: boolean
  /** The roster and shared task board, mountable anywhere in this tree. */
  readonly Panel: ComponentType<{ readonly sessionId: SessionId | undefined }>
}

/** Cordis service name the Cluster plugin publishes its surface under. */
const CLUSTER_SERVICE = 'cluster'

/**
 * Narrow whatever occupies `ctx.cluster` to the surface the aside can mount.
 *
 * An assembly without the plugin reads `undefined`; an assembly whose plugin
 * loaded but whose Team Remote never answered publishes nothing at all. Both
 * land here as "no Cluster surface", which is the state the aside renders as
 * an absent section rather than as an error.
 * @param value - the raw service value, if any.
 */
function readClusterSurface(value: unknown): DcodeClusterSurface | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as { available?: unknown; Panel?: unknown }
  if (candidate.available !== true || typeof candidate.Panel !== 'function') return undefined
  return candidate as unknown as DcodeClusterSurface
}

/** The event-bus slice the Cluster probe subscribes to. */
interface ServiceEventSource {
  on(name: 'internal/service', listener: (name: string) => void): () => void
}

/**
 * Observe `ctx.cluster` across the plugin loads and unloads of a live page.
 *
 * Load order between two independently bundled plugins is not fixed, so a
 * one-time read at workbench construction would miss a Cluster plugin that
 * activates a frame later. Cordis announces every service publication on
 * `internal/service`, so the aside re-renders on the event instead.
 *
 * The resolved value is cached between announcements: `useSyncExternalStore`
 * requires a snapshot that is reference-stable while nothing changed, and
 * reading a cordis service can hand back a fresh contextualized value each
 * time.
 * @param ctx - client root context.
 * @returns the observable read by the aside.
 */
function createClusterProbe(ctx: ClientContext): Observable<DcodeClusterSurface | undefined> {
  const events = ctx as unknown as Partial<ServiceEventSource>
  let cached: DcodeClusterSurface | undefined
  let fresh = false
  return {
    getSnapshot: () => {
      if (!fresh) {
        cached = readClusterSurface(ctx.get(CLUSTER_SERVICE))
        fresh = true
      }
      return cached
    },
    subscribe: (listener) => {
      try {
        return events.on?.('internal/service', (name) => {
          if (name !== CLUSTER_SERVICE) return
          fresh = false
          listener()
        }) ?? (() => {})
      } catch {
        // An assembly whose event bus refuses the internal channel simply
        // never re-renders on a late load; the first read still stands.
        return () => {}
      }
    },
  }
}

/** The small domain face the dcode composer needs from a pending approval. */
export interface DcodePendingApproval extends SessionPendingInteractionBase {
  readonly kind: 'approval'
  readonly key: string
  readonly toolName: string
  readonly callId?: string
  readonly reason?: string
  answer(outcome: 'allowed-once' | 'rejected'): Promise<void>
}

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

/** Existing DSH Session-log exporter exposed to the workbench chrome. */
export interface SessionLogDownloadFace {
  readonly store: Observable<SessionLogDownloadState>
  download(sessionId: SessionId): Promise<void>
}

/** Official settings services shared by DCode and the registered DSH pages. */
export interface DcodeSettingsServices {
  /** Namespace scopes own writes and expose the shared settings snapshot. */
  readonly scope: SettingsScopeBinderFace | undefined
  /** Schema operations used by official settings controllers and editors. */
  readonly schema: SettingsSchemaService | undefined
  /** Shared describe mirror; all settings readers refresh through this face. */
  readonly describe: SettingsDescribeFace | undefined
}

/** Attachment intake and input state exposed to the DCode composer. */
export interface DcodeConversationFace {
  readonly input: ConversationController['input']
  createDraftAttachments(files: readonly File[]): readonly ComposerAttachment[]
  draftAttachmentsFor(ids: readonly DraftAttachmentId[]): readonly ComposerAttachment[]
  releaseDraftImage(id: DraftAttachmentId): void
}

/** Session-authorized durable media helpers used by the transcript. */
export interface ConversationMediaFace {
  imageUrl(sessionId: SessionId, attachment: ImageAttachmentRef): Promise<string>
  peekImageUrl(sessionId: SessionId, attachment: ImageAttachmentRef): string | undefined
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
export interface DcodeRuntime {
  /** Session Controller: list, selection, lifecycle, per-session faces. */
  readonly sessions: ISessions
  /** Workspace Controller: the durable workspace registry. */
  readonly workspaces: IWorkspaces
  /** Workspace navigation (New Session, native directory picker). */
  readonly navigation: WorkspaceNavigation | undefined
  /** Generated Host Remote namespaces (settings, models, skills, commands, plugins, subagents). */
  readonly remote: ClientRemote
  /** Official feedback slot face resolved per Session. */
  readonly messageFeedback: MessageFeedbackProvider | undefined
  /** Official settings scope/schema/mirror services used by settings sections. */
  readonly settings: DcodeSettingsServices
  /** Shared Conversation service: draft attachments and the per-session input machine. */
  readonly conversation: ConversationController | undefined
  /** Resolve the Conversation input machine for one session. */
  input(sessionId: SessionId): SessionInput | undefined
  /** Session-authorized image/file display helpers from the Conversation assembly. */
  readonly media: ConversationMediaFace | undefined
  /** Theme service, when `ui-theme` is part of this assembly. */
  readonly theme: ThemeFace | undefined
  /** Resolved colour scheme, the theme preference, and the window backdrop. */
  readonly appearance: AppearanceStore
  /** Official `ui-conversation.busyEnter` preference. */
  readonly busyEnter: BusyEnterStore
  /** Shared DSH locale registry and preference. */
  readonly locale: LocaleStore
  /** Session-scoped pending interactions, when the UI session adapter is present. */
  readonly pendingInteractions: Observable<ReadonlyMap<SessionId, SessionPendingInteractionBase>> | undefined
  /** Generated goals Remote namespace (edit/pause/resume/clear), when mounted. */
  readonly goals: DcodeGoalsRemote | undefined
  /** The optional Cluster surface, observed so a late plugin load still shows. */
  readonly cluster: Observable<DcodeClusterSurface | undefined>
  /** Session-log export controller, when the export client plugin is present. */
  readonly sessionLogDownload: SessionLogDownloadFace | undefined
  /** Git, diff, undo and file reads over the `/dcode` channel. */
  readonly git: DcodeApi
  /** Durable memory controls over the `/dcode` channel. */
  readonly memory: DcodeMemoryApi
  /** The Interactive Learning channel caller, shared with the official UI's learning views. */
  readonly learningCall: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>
  /**
   * The learning pack's own bound translate function. Its surfaces carry their
   * own dictionary; reusing it keeps one copy of the learning vocabulary
   * instead of a second translation of the same words.
   */
  readonly learningT: (key: string, params?: Record<string, unknown>) => string
  /**
   * The interface switch's own bound translate function, for the same reason
   * as {@link learningT}: the roster of surfaces and their names belong to
   * `@dsh-portable/ui-mode`, so every switch renders one set of words rather
   * than each surface translating the other surfaces' names itself.
   */
  readonly uiModeT: (key: UiModeKey) => string
  /** The active-mode store shared with every switch entry point. */
  readonly mode: UiModeController
  /**
   * Resolve the Chat transcript feed of one session.
   * @param sessionId - session to observe.
   * @returns an observable over the assembled Chat snapshot, or undefined when the session has no binding yet.
   */
  chatFeed(sessionId: SessionId): Observable<ChatSnapshot> | undefined
  /**
   * Resolve the DSH Trajectory feed for one session.
   * @param sessionId - session to observe.
   * @returns an observable over the real trace ledger, or undefined when the
   *          session has no binding yet.
   */
  trajectoryFeed(sessionId: SessionId): Observable<TrajectorySnapshot> | undefined
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
  describe?(): SettingsDescribeFace
}

/** The Conversation assembly face this module needs off `ctx.uiConversation`. */
interface UiConversationFace {
  binding(binding: SessionBinding): {
    target(name: string): { getSnapshot(): unknown; subscribe(listener: () => void): () => void }
  }
  imageUrl(sessionId: SessionId, attachment: ImageAttachmentRef): Promise<string>
  peekImageUrl(sessionId: SessionId, attachment: ImageAttachmentRef): string | undefined
}

/** The one ui-session face read by the workbench runtime. */
interface UiSessionFace {
  pendingInteractions?: Observable<ReadonlyMap<SessionId, SessionPendingInteractionBase>>
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
export function createDcodeRuntime(
  ctx: ClientContext,
  mode: UiModeController,
): DcodeRuntime {
  const sessions = ctx.get('sessions') as unknown as ISessions
  const workspaces = ctx.get('workspaces') as IWorkspaces
  const uiConversation = ctx.get('uiConversation') as UiConversationFace | undefined
  const conversation = ctx.get('conversation') as ConversationController | undefined
  const carrier = ctx.get('connection') as RpcCarrier | undefined
  const navigation = ctx.get('uiWorkspace') as WorkspaceNavigation | undefined
  const theme = ctx.get('theme') as ThemeFace | undefined
  const locale = ctx.get('locale') as LocaleFace | undefined
  const uiSession = ctx.get('uiSession') as UiSessionFace | undefined
  const settingsScope = ctx.get('settingsScope') as SettingsScopeBinderFace | undefined
  const settingsSchema = ctx.get('settingsSchema') as SettingsSchemaService | undefined
  const sessionLogDownload = ctx.get('sessionLogDownload') as SessionLogDownloadFace | undefined
  const conversationSettings = settingsScope?.bind<{ busyEnter?: BusyEnterBehavior }>({ namespace: 'ui-conversation' })
  const fallbackLocale: LocaleSnapshot = { active: 'en', locales: [], revision: 0 }
  // Cordis contextualizes a nested service with a fresh traceable Proxy on
  // every property read. Capture this namespace once so React sees one
  // identity for the owning Runtime's whole lifetime.
  const messageFeedback: MessageFeedbackProvider = {
    for: sessionId => {
      const entry = ctx.slots.entries('conversation.chat.assistant-actions')
        .find(candidate => candidate.options.id === 'feedback')
      const inject = entry?.inject as ((id: SessionId) => MessageFeedbackInjected) | undefined
      return inject?.(sessionId)
    },
  }
  const goals = (ctx.remote as ClientRemote & {
    readonly goals?: DcodeGoalsRemote
  }).goals

  // One cache per session id: the Chat target face is identity-stable for a
  // binding, and `useSyncExternalStore` needs a stable subscribe reference.
  const feeds = new Map<SessionId, Observable<ChatSnapshot>>()
  const trajectoryFeeds = new Map<SessionId, Observable<TrajectorySnapshot>>()

  return {
    sessions,
    workspaces,
    navigation,
    remote: ctx.remote,
    messageFeedback,
    settings: {
      scope: settingsScope,
      schema: settingsSchema,
      describe: settingsScope?.describe?.() as SettingsDescribeFace | undefined,
    },
    conversation,
    input: sessionId => {
      const actx = sessions.scope(sessionId)
      if (actx === undefined || conversation === undefined) return undefined
      return conversation.input.for(actx)
    },
    media: uiConversation === undefined
      ? undefined
      : {
        imageUrl: (sessionId, attachment) => uiConversation.imageUrl(sessionId, attachment),
        peekImageUrl: (sessionId, attachment) => uiConversation.peekImageUrl(sessionId, attachment),
      },
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
    pendingInteractions: uiSession?.pendingInteractions,
    goals,
    cluster: createClusterProbe(ctx),
    sessionLogDownload,
    git: createDcodeApi(carrier),
    memory: createDcodeMemoryApi(carrier),
    learningCall: createLearningCall(carrier),
    // The pack registers this namespace itself; an assembly without it falls
    // back to the raw key, which is still readable and never throws.
    learningT: locale?.bind('interactive-learning') ?? (key => key),
    uiModeT: locale?.bind(UI_MODE_NS) ?? (key => key),
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
        getSnapshot: () => (target.getSnapshot() as ChatSnapshot | null | undefined) ?? EMPTY_CHAT_SNAPSHOT,
        subscribe: listener => target.subscribe(listener),
      }
      feeds.set(sessionId, feed)
      return feed
    },
    trajectoryFeed: (sessionId) => {
      const cached = trajectoryFeeds.get(sessionId)
      if (cached !== undefined) return cached
      if (uiConversation === undefined) return undefined
      const binding = sessions.binding(sessionId)
      if (binding === undefined) return undefined
      const target = uiConversation.binding(binding).target('trajectory')
      const feed: Observable<TrajectorySnapshot> = {
        getSnapshot: () => (target.getSnapshot() as TrajectorySnapshot | undefined) ?? EMPTY_TRAJECTORY_SNAPSHOT,
        subscribe: listener => target.subscribe(listener),
      }
      trajectoryFeeds.set(sessionId, feed)
      return feed
    },
  }
}

const RuntimeContext = createContext<DcodeRuntime | undefined>(undefined)

/** Provider for the runtime; mounted once at the workbench root. */
export const DcodeRuntimeProvider = RuntimeContext.Provider

/**
 * Read the runtime.
 * @returns the runtime supplied by the workbench root.
 * @throws when a component renders outside the workbench tree.
 */
export function useRuntime(): DcodeRuntime {
  const runtime = useContext(RuntimeContext)
  if (runtime === undefined) throw new Error('dcode-ui: component rendered outside the workbench runtime provider')
  return runtime
}
