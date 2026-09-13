/**
 * React bindings over the DSH observables the workbench reads.
 *
 * Every hook here is a thin `useSyncExternalStore` over a store the Host
 * already owns — there is no mirrored copy of the session list, the
 * transcript or a projection anywhere in this package. Selector variants
 * exist so a panel re-renders on the fact it reads rather than on every frame
 * of a streaming turn.
 * @module @dsh-portable/dcode-ui/client/state/hooks
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type {
  SessionListState, SessionSnapshot, SessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ChatSnapshot, ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client'
import type { SessionPendingInteractionBase } from '@deepseek-ai/dsh-client-ui-session/client'
import type { InputState, SessionInput } from '@deepseek-ai/dsh-client-ui-conversation/client'
import {
  EMPTY_TRAJECTORY_SNAPSHOT, useRuntime, type DcodePendingApproval, type DcodePendingInteraction, type Observable,
} from './runtime.ts'

/**
 * Subscribe to one DSH observable.
 * @param source - the observable, or undefined while none is resolvable.
 * @param fallback - snapshot used while the source is absent.
 * @returns the current snapshot.
 */
export function useObservable<T>(source: Observable<T> | undefined, fallback: T): T {
  const subscribe = useCallback(
    (listener: () => void) => (source === undefined ? () => {} : source.subscribe(listener)),
    [source],
  )
  const snapshot = useCallback(() => (source === undefined ? fallback : source.getSnapshot()), [source, fallback])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/**
 * Subscribe to a derived slice of an observable.
 *
 * The selector runs on every notification but the component re-renders only
 * when the selected value changes by `Object.is`, which is what keeps the
 * left rail still while a turn streams into the transcript.
 * @param source - the observable, or undefined while none is resolvable.
 * @param fallback - snapshot used while the source is absent.
 * @param select - pure projection of the snapshot.
 * @returns the selected value.
 */
export function useObservableSelector<T, S>(
  source: Observable<T> | undefined,
  fallback: T,
  select: (snapshot: T) => S,
): S {
  const selectRef = useRef(select)
  selectRef.current = select
  const subscribe = useCallback(
    (listener: () => void) => (source === undefined ? () => {} : source.subscribe(listener)),
    [source],
  )
  const lastRef = useRef<{ input: T; output: S } | undefined>(undefined)
  const snapshot = useCallback(() => {
    const input = source === undefined ? fallback : source.getSnapshot()
    const last = lastRef.current
    if (last !== undefined && Object.is(last.input, input)) return last.output
    const output = selectRef.current(input)
    // Reuse the previous output when the projection is value-identical, so a
    // reference-fresh upstream snapshot does not force a render.
    if (last !== undefined && Object.is(last.output, output)) {
      lastRef.current = { input, output: last.output }
      return last.output
    }
    lastRef.current = { input, output }
    return output
  }, [source, fallback])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

const EMPTY_SESSION_LIST: SessionListState = {
  ids: [], byId: {}, current: undefined, phase: 'pending',
  subagentsByParent: {}, jobsBySession: {}, currentAddress: undefined,
}

const EMPTY_PENDING_INTERACTIONS = new Map<SessionId, SessionPendingInteractionBase>()

const EMPTY_INPUT_STATE: InputState = {
  draft: '',
  attachmentIds: [],
  draftRev: 0,
  phase: 'plain',
  occurrences: [],
  queue: [],
}

/** The shared Conversation input machine plus its current draft state. */
export function useSessionInput(sessionId: SessionId | undefined): {
  input: SessionInput | undefined
  state: InputState
} {
  const runtime = useRuntime()
  const input = useMemo(
    () => (sessionId === undefined ? undefined : runtime.input(sessionId)),
    [runtime, sessionId],
  )
  const state = useObservable(input?.state, EMPTY_INPUT_STATE)
  return { input, state }
}

/** Narrow the shared pending-interaction roster to the ask-user-question face. */
function questionInteraction(
  value: SessionPendingInteractionBase | undefined,
): DcodePendingInteraction | undefined {
  if (value === undefined || !('questions' in value) || !Array.isArray(value.questions)) return undefined
  if (typeof (value as Partial<DcodePendingInteraction>).answer !== 'function') return undefined
  if (typeof (value as Partial<DcodePendingInteraction>).cancel !== 'function') return undefined
  return value as DcodePendingInteraction
}

/** Narrow the shared pending-interaction roster to the approval face. */
function approvalInteraction(
  value: SessionPendingInteractionBase | undefined,
): DcodePendingApproval | undefined {
  if (value === undefined || value.kind !== 'approval') return undefined
  if (typeof (value as Partial<DcodePendingApproval>).answer !== 'function') return undefined
  if (typeof (value as Partial<DcodePendingApproval>).toolName !== 'string') return undefined
  return value as DcodePendingApproval
}

/** The Session Controller's list and current selection. */
export function useSessionList(): SessionListState {
  const runtime = useRuntime()
  return useObservable(runtime.sessions.list as Observable<SessionListState>, EMPTY_SESSION_LIST)
}

/** The id of the selected session, or undefined in the no-session state. */
export function useCurrentSessionId(): SessionId | undefined {
  const runtime = useRuntime()
  return useObservableSelector(
    runtime.sessions.list as Observable<SessionListState>,
    EMPTY_SESSION_LIST,
    state => state.current,
  )
}

/** The current session's pending ask-user-question or plan-review request. */
export function usePendingQuestion(sessionId: SessionId | undefined): DcodePendingInteraction | undefined {
  const runtime = useRuntime()
  return useObservableSelector(
    runtime.pendingInteractions,
    EMPTY_PENDING_INTERACTIONS,
    snapshot => questionInteraction(sessionId === undefined ? undefined : snapshot.get(sessionId)),
  )
}

/** The current session's pending host permission request. */
export function usePendingApproval(sessionId: SessionId | undefined): DcodePendingApproval | undefined {
  const runtime = useRuntime()
  return useObservableSelector(
    runtime.pendingInteractions,
    EMPTY_PENDING_INTERACTIONS,
    snapshot => approvalInteraction(sessionId === undefined ? undefined : snapshot.get(sessionId)),
  )
}

const EMPTY_WORKSPACES: WorkspaceSnapshot = {
  items: [], order: [], archivedSessionIds: [], state: 'idle', phase: 'loading', error: null,
} as unknown as WorkspaceSnapshot

/** The durable workspace registry. */
export function useWorkspaces(): WorkspaceSnapshot {
  const runtime = useRuntime()
  return useObservable(runtime.workspaces.list as unknown as Observable<WorkspaceSnapshot>, EMPTY_WORKSPACES)
}

/**
 * One session's lifecycle snapshot.
 * @param sessionId - session to observe; undefined yields undefined.
 */
export function useSessionSnapshot(sessionId: SessionId | undefined): SessionSnapshot | undefined {
  const runtime = useRuntime()
  const source = useMemo(() => {
    if (sessionId === undefined) return undefined
    const face = runtime.binding(sessionId)?.session
    if (face === undefined) return undefined
    return {
      getSnapshot: () => face.getSnapshot(),
      subscribe: (listener: () => void) => face.subscribe(listener),
    } satisfies Observable<SessionSnapshot>
  }, [runtime, sessionId])
  const snapshot = useObservable(source, undefined as SessionSnapshot | undefined)
  return source === undefined ? undefined : snapshot
}

/**
 * One session's assembled Chat transcript.
 * @param sessionId - session to observe; undefined yields undefined.
 */
export function useChatSnapshot(sessionId: SessionId | undefined): ChatSnapshot | undefined {
  const runtime = useRuntime()
  // The list is the Session Controller's public eligibility signal. Including
  // its snapshot prevents an early unresolved binding from being memoized for
  // the lifetime of an otherwise unchanged session id.
  const sessions = useSessionList()
  const source = useMemo(
    () => (sessionId === undefined ? undefined : runtime.chatFeed(sessionId)),
    [runtime, sessionId, sessions],
  )
  const snapshot = useObservable(source, undefined as ChatSnapshot | undefined)
  return source === undefined ? undefined : snapshot
}

/**
 * One session's assembled DSH Trajectory ledger.
 *
 * This is the same target consumed by the official Trajectory view. DCode only
 * selects a compact subset for its summary and leaves the full records to the
 * existing details and diff surfaces.
 * @param sessionId - session to observe.
 */
export function useTrajectorySnapshot(sessionId: SessionId | undefined): TrajectorySnapshot | undefined {
  const runtime = useRuntime()
  const source = useMemo(
    () => (sessionId === undefined ? undefined : runtime.trajectoryFeed(sessionId)),
    [runtime, sessionId],
  )
  const snapshot = useObservable(source, EMPTY_TRAJECTORY_SNAPSHOT)
  return source === undefined ? undefined : snapshot
}

function isConversationContentNode(node: ConversationNode): boolean {
  return node.kind === 'user'
    || node.kind === 'steering'
    || node.kind === 'assistant'
    || node.kind === 'tool-result'
    || node.kind === 'turn-error'
    || node.kind === 'model-retry'
    || node.kind === 'turn-max-tokens'
}

/**
 * Whether the conversation has nothing in it yet — no settled conversation node,
 * no streaming partial, no call in flight.
 *
 * This is the layout's phase gate: a blank conversation centres the greeting
 * and the composer the way the official surface does, and the first arriving
 * node drops the composer to its dock. A session whose chat has not loaded
 * yet is *not* blank, so an existing conversation never flashes the greeting
 * on its way in.
 * @param sessionId - session to inspect, or undefined for no session at all.
 * @returns true while there is nothing to show.
 */
export function useConversationBlank(sessionId: SessionId | undefined): boolean {
  const session = useSessionSnapshot(sessionId)
  const chat = useChatSnapshot(sessionId)
  const list = useSessionList()
  if (sessionId === undefined) return true
  const summaryBlank = list.byId[sessionId]?.blank
  if (summaryBlank === false) return false
  if (session !== undefined && !session.blank) return false
  if (chat === undefined) return summaryBlank === true || (session?.blank ?? false)
  const hasContentNodes = chat.legacy.nodes.some(isConversationContentNode)
  return !hasContentNodes
    && chat.legacy.partial === null
    && chat.legacy.runningCalls.length === 0
    && (session?.blank ?? summaryBlank ?? true)
}

/**
 * One host-computed projection of a session (`goal`, `plan`, `permissions`,
 * `modelSelection`, …). The projection face is identity-stable per key, so a
 * capability the Host does not publish simply reads `undefined` forever
 * rather than throwing.
 * @param sessionId - session to observe.
 * @param key - projection key.
 */
export function useProjectionValue<T>(sessionId: SessionId | undefined, key: string): T | undefined {
  const runtime = useRuntime()
  const source = useMemo(() => {
    if (sessionId === undefined) return undefined
    const face = runtime.binding(sessionId)?.session.projections.faceOf(key)
    if (face === undefined) return undefined
    return {
      getSnapshot: () => face.getSnapshot() as T | undefined,
      subscribe: (listener: () => void) => face.subscribe(listener),
    } satisfies Observable<T | undefined>
  }, [runtime, sessionId, key])
  return useObservable(source, undefined as T | undefined)
}

/** Sessions grouped under the workspace that accounts for them, in registry order. */
export interface WorkspaceGroup {
  readonly workspaceId: WorkspaceId
  readonly title: string
  readonly path: string
  readonly sessions: readonly SessionSummary[]
}

/**
 * Group the session list by workspace for the left rail.
 *
 * Blank sessions are hidden unless they are the current selection — the same
 * rule the official sidebar applies, so switching surfaces does not change
 * which rows exist.
 */
export function useWorkspaceGroups(): {
  groups: readonly WorkspaceGroup[]
  ungrouped: readonly SessionSummary[]
} {
  const list = useSessionList()
  const workspaces = useWorkspaces()
  return useMemo(() => {
    const archived = new Set(workspaces.archivedSessionIds)
    const visible = (summary: SessionSummary | undefined): summary is SessionSummary =>
      summary !== undefined
      && summary.origin !== 'subagent'
      && !archived.has(summary.id)
      && (!summary.blank || summary.id === list.current)
    const claimed = new Set<string>()
    const groups = workspaces.items.map((workspace) => {
      const sessions = workspace.sessionIds
        .map((id) => {
          claimed.add(id)
          return list.byId[id]
        })
        .filter(visible)
      return {
        workspaceId: workspace.workspaceId,
        title: workspace.title,
        path: workspace.path,
        sessions,
      }
    })
    const ungrouped = list.ids
      .filter(id => !claimed.has(id))
      .map(id => list.byId[id])
      .filter(visible)
    return { groups, ungrouped }
  }, [list, workspaces])
}

/**
 * Run an async read whenever its inputs change, with the in-flight answer of a
 * superseded run discarded.
 * @param load - the read; receives an abort signal.
 * @param deps - dependency list, as for `useEffect`.
 * @returns the latest value, a loading flag, a failure message, and a manual reload.
 */
export function useAsync<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): { value: T | undefined; loading: boolean; error: string | undefined; reload: () => void } {
  const [state, setState] = useState<{ value: T | undefined; loading: boolean; error: string | undefined }>(
    { value: undefined, loading: true, error: undefined },
  )
  const [nonce, setNonce] = useState(0)
  const loadRef = useRef(load)
  loadRef.current = load

  useEffect(() => {
    const controller = new AbortController()
    let live = true
    setState(previous => ({ ...previous, loading: true, error: undefined }))
    loadRef.current(controller.signal).then(
      (value) => { if (live) setState({ value, loading: false, error: undefined }) },
      (cause: unknown) => {
        if (!live) return
        setState({ value: undefined, loading: false, error: cause instanceof Error ? cause.message : String(cause) })
      },
    )
    return () => {
      live = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the caller owns the dependency list
  }, [...deps, nonce])

  const reload = useCallback(() => { setNonce(value => value + 1) }, [])
  return { ...state, reload }
}
