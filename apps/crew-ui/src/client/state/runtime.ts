/**
 * Mission Control's single view of the DSH client services.
 *
 * The plugin body resolves every service once and hands this object to the
 * React tree through one context, so no component reaches for a cordis context
 * of its own and every capability this surface depends on is the surface of
 * this file. Mission Control adds no state that duplicates the Host: sessions,
 * workspaces, conversations, presets and the task board are all read through
 * their owning services.
 * @module @dsh-portable/crew-ui/client/state/runtime
 */

import { createContext, useContext } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { IWorkspaces } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type {
  CreateTeamTaskRequest, TeamTaskMutationResult, TeamView, UpdateTeamTaskRequest,
} from '@deepseek-ai/dsh-experimental-agent-team/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { UiModeController } from '@dsh-portable/ui-mode/client'
import type { CrewKey } from '../locales.ts'

/** The three Team endpoints this surface uses, named by what they do here. */
export interface TeamsFace {
  view(lead: SessionId): Promise<RemoteResult<TeamView>>
  createTask(lead: SessionId, request: CreateTeamTaskRequest): Promise<RemoteResult<TeamTaskMutationResult>>
  updateTask(lead: SessionId, request: UpdateTeamTaskRequest): Promise<RemoteResult<TeamTaskMutationResult>>
}

/**
 * Envelope every `/crew-dossier` endpoint answers with.
 *
 * `details` mirrors the Connection failure contract the host channel must
 * satisfy, so the two halves cannot drift into a shape the browser parser
 * rejects. The caller in this surface's plugin body is what guarantees the
 * envelope: a Connection call REJECTS on transport failure rather than
 * resolving `ok: false`, and every consumer here reads the envelope.
 */
export type DossierResult =
  | { readonly ok: true, readonly value: unknown }
  | {
    readonly ok: false
    readonly error: {
      readonly code: string
      readonly message: string
      readonly details?: Readonly<Record<string, unknown>>
    }
  }

/** Workspace navigation entries shared with the official surfaces. */
export interface CrewNavigation {
  startSession(workspaceId?: string): void
  pickDirectory(): Promise<string | null>
}

/** Per-session preset selection, used to land a new mission on Crew. */
export interface AgentPresetsFace {
  /**
   * Compose one session on a preset.
   *
   * Refuses once the session has taken a turn: a running mission keeps the
   * composition it began with, which is the Host invariant this surface's
   * read-only mode label exists to reflect.
   */
  select(sessionId: SessionId, preset: string): Promise<
    | { readonly ok: true, readonly value: string }
    | {
      readonly ok: false
      readonly error: { readonly message: string, readonly details?: Readonly<Record<string, unknown>> }
    }
  >
}

/** Everything Mission Control needs from the Host. */
export interface CrewRuntime {
  /** Session Controller: list, selection, lifecycle, per-session faces. */
  readonly sessions: ISessions
  /** Workspace Controller: the durable workspace registry. */
  readonly workspaces: IWorkspaces
  /** Workspace navigation (New Mission, native directory picker). */
  readonly navigation: CrewNavigation | undefined
  /** The shared task board and roster. */
  readonly teams: TeamsFace
  /**
   * Per-session preset selection, when the namespace is mounted.
   *
   * Optional because a trimmed assembly can omit it: a mission started without
   * it inherits the deployment default rather than failing to start.
   */
  readonly presets: AgentPresetsFace | undefined
  /** The page-wide interface controller, shared with every other surface. */
  readonly mode: UiModeController
  /** This surface's bound translate. */
  readonly t: (key: CrewKey, params?: Record<string, unknown>) => string
  /**
   * The interface switch's own bound translate.
   *
   * Surface names belong to `@dsh-portable/ui-mode`, so Mission Control renders
   * that dictionary rather than carrying its own translation of the other
   * surfaces' names.
   */
  readonly uiModeT: (key: string) => string
  /** Resolve the Conversation input machine of one session, when available. */
  input(sessionId: SessionId): SessionInputFace | undefined
  /**
   * Observe the assembled Chat feed of one session.
   *
   * Returns undefined for a session with no binding yet, which is the state
   * between selecting a mission and its target starting.
   */
  chatFeed(sessionId: SessionId): Observable<ChatSnapshot | undefined> | undefined
  /**
   * Call one endpoint on the mission-dossier channel.
   *
   * A private Connection channel rather than a Remote namespace: attaching a
   * source runs a parser over a file in the operator's own workspace, which is
   * the same trust boundary the workbench's Git channel sits behind.
   */
  dossier(endpoint: string, payload: Record<string, unknown>): Promise<DossierResult>
  /** The raw client context, for the few places a slot must be rendered. */
  readonly ctx: ClientContext
}

/** The minimal observable shape every DSH client store exposes. */
export interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** The minimal composer face Mission Control drives. */
export interface SessionInputFace {
  getSnapshot(): { readonly text: string, readonly busy?: boolean }
  subscribe(listener: () => void): () => void
  setText(text: string): void
  submit(): Promise<void> | void
}

const RuntimeContext = createContext<CrewRuntime | undefined>(undefined)

/** Provider for {@link useRuntime}. */
export const CrewRuntimeProvider = RuntimeContext.Provider

/**
 * Read the Host services.
 * @returns the runtime.
 * @throws {Error} when rendered outside the provider, which is a wiring bug.
 */
export function useRuntime(): CrewRuntime {
  const runtime = useContext(RuntimeContext)
  if (runtime === undefined) throw new Error('crew-ui: useRuntime() outside CrewRuntimeProvider')
  return runtime
}
