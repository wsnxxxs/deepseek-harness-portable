import { createHash, randomUUID } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-client-modules'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  UserQuestionService,
  UserQuestionError,
} from '@deepseek-ai/dsh-user-questions'
import {
  CHECKPOINT_RESULT_PROTOCOL,
  RESPONSE_PROTOCOL,
  LearningProtocolError,
  parseLearningCheckpointResultV1,
  parseLearningCheckpointV1,
  parseLearningRecallFeedbackV1,
  type LearningVisualStatusV4,
  type LearningRecallFeedbackV1,
  type LearningCheckpointResultV1,
  type LearningCheckpointSkippedReasonV1,
  type LearningCheckpointCancelledReasonV1,
  type LearningCheckpointV1,
  type LearningActivityV2,
  type LearningActivityV1,
  type LearningQuestionV2,
  type LearningRevealV2,
  type LearningResponseV2,
  type LearningResponseV1,
} from './protocol-current.ts'
import {
  encodeLearningCheckpointDetail,
  learningCheckpointQuestionId,
} from './host-transport.ts'
import type { LegacyLearningGate } from './legacy-gate.ts'
import {
  LEARNER_STATE_SESSION_EVENT_TYPE,
  LEARNING_SEGMENT_EVENT_PROTOCOL,
  LEARNING_SEGMENT_SESSION_EVENT_TYPE,
  LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL,
  LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE,
  LEARNING_CHECKPOINT_METRIC_KINDS,
  LEARNING_CHECKPOINT_METRIC_STATUSES,
  createLearnerStateSnapshotEvent,
  foldLearnerStateSession,
  reduceLearnerState,
  renderLearnerStateTranscript,
  resetLearnerState,
  type LearnerState,
  type LearnerStateCorrection,
  type LearnerStateEvent,
  type LearningSegmentAnchorEvent,
  type ObservableLearnerEvent,
  type LearningCheckpointAggregate,
  type LearningCheckpointMetricKind,
  type LearningCheckpointMetricStatus,
} from './learner-state.ts'
import { registerInteractiveLearningSessionCompatibility } from './bootstrap.ts'
import {
  nextReviewSchedule,
  readConceptCards,
  recallCardIdOf,
  updateConceptCardSchedule,
} from './concept-cards.ts'
import { readLearnerMemory, upsertLearnerConcept } from './learner-memory.ts'
import { resolveTopicVault } from './topic-vault.ts'
import { handleVaultEndpoint, isVaultEndpoint } from './vault-rpc.ts'

// Register eagerly when the package is present. Persisted snapshots are also
// optional log projections, so the compatibility path can retain older/newer
// snapshots even when a Host attaches this package after session loading.
registerInteractiveLearningSessionCompatibility()

export const INTERACTIVE_LEARNING_PACKAGE = '@dsh-portable/interactive-learning'
export const DEFAULT_LEARNING_WAIT_TIMEOUT_MS = 5 * 60_000
export const DEFAULT_LEARNING_CHECKPOINT_TIMEOUT_MS = 5 * 60_000

type LearningAbortReason = 'session-aborted' | 'client-response-timeout' | 'plugin-disposed'

type RecallRpcConnection = {
  rpc: {
    handle(
      channel: string,
      handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<unknown>,
      options: { authority: 'trusted-host' },
    ): () => Promise<void>
  }
}

class LearningWaitAbort extends Error {
  constructor(readonly reason: LearningAbortReason) {
    super(reason)
    this.name = 'LearningWaitAbort'
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    learningActivities: LearningActivityBroker
  }
}

export interface PresentLearningActivityRequest {
  activity: LearningActivityV1
  agent?: Agent
  signal?: AbortSignal
  /** Bounded wait for a compatible Client response. Primarily configurable by tests/embedders. */
  timeoutMs?: number
}

export interface PresentLearningGateRequest {
  activity: LearningActivityV2
  agent?: Agent
  signal?: AbortSignal
  timeoutMs?: number
  callId?: string
}

export interface PresentLearningCheckpointRequest {
  checkpoint: LearningCheckpointV1
  agent?: Agent
  signal?: AbortSignal
  timeoutMs?: number
  callId: string
  /** Client-side answer-free telemetry: whether a stored draft was restored. */
  draftRecovered?: boolean
}

export type ObservableLearnerStateUpdate = Exclude<
  LearnerStateEvent,
  { type: 'state_corrected' }
>

export type LearningStateUpdateRequest =
  | {
      action: 'update'
      agent: Agent
      expectedRevision: number
      event: ObservableLearnerStateUpdate
    }
  | {
      action: 'correct'
      agent: Agent
      expectedRevision: number
      correction: LearnerStateCorrection
      observation: ObservableLearnerEvent & { source: 'user-correction' }
    }
  | {
      action: 'reset'
      agent: Agent
      expectedRevision: number
    }

export interface LearningStateUpdateResult {
  status: 'updated' | 'corrected' | 'reset'
  revision: number
}

export interface LearningRecallFeedbackResult {
  status: 'recorded' | 'ignored'
  observationId?: string
  reason?: 'session-unavailable'
}

interface CheckpointCallRecord {
  fingerprint: string
  session: Agent['session']
  result: Promise<LearningCheckpointResultV1>
}

interface CheckpointReceiptRecord {
  session: Agent['session']
  result: LearningCheckpointResultV1
}

interface CheckpointStateFence {
  session: Agent['session']
  revision: number
}

interface LearnerStateCacheRecord {
  session: Agent['session']
  eventCount: number
  state: LearnerState
}

export type LearningLifecycleEventName =
  | 'learning.call.stream_started'
  | 'learning.call.args_completed'
  | 'learning.protocol.validated'
  | 'learning.wait.registered'
  | 'learning.ui.presented'
  | 'learning.answer.accepted'
  | 'learning.reveal.received'
  | 'learning.animation.started'
  | 'learning.animation.finished'
  | 'learning.continue.accepted'
  | 'learning.wait.resolved'
  | 'learning.model.next_step_started'
export interface LearningLifecycleEvent {
  name: LearningLifecycleEventName; at: number; phase: 'question' | 'reveal'
  activityId: string; lessonToken: string; roundToken: string; seq: number; callId?: string
}
function fallback(activityId: string, activity: LearningActivityV1, reason: string): LearningResponseV1 {
  return {
    protocol: RESPONSE_PROTOCOL,
    activityId,
    action: 'skip',
    interactionState: { reason, fallbackMarkdown: activity.fallbackMarkdown },
  }
}

function boundedIdentity(value: string, label: string): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512
    || value.trim() !== value || /[\u0000-\u001F\u007F]/.test(value)) {
    throw new LearningProtocolError([`${label} must be a non-empty bounded identity`])
  }
  return value
}

function trimOldest<K, V>(values: Map<K, V>, limit = 1_024): void {
  if (values.size <= limit) return
  const oldest = values.keys().next().value as K | undefined
  if (oldest !== undefined) values.delete(oldest)
}

function pedagogicalStateFingerprint(state: LearnerState): string {
  const {
    revision: _revision,
    appliedEventIds: _appliedEventIds,
    ...pedagogicalState
  } = state
  return JSON.stringify(pedagogicalState)
}

function learnerObservationId(prefix: string, ...parts: string[]): string {
  const digest = createHash('sha256').update(JSON.stringify(parts)).digest('hex')
  return `${prefix}:${digest}`
}

/**
 * A stale state-tool call may still be safe to apply when it is one additive
 * observation. Corrections, resets, and replacement-style route/list writes
 * remain strict CAS operations because replaying them could overwrite newer
 * learner state.
 */
function isSafeStaleLearnerStateUpdate(event: ObservableLearnerStateUpdate): boolean {
  switch (event.type) {
    case 'prior_knowledge_observed':
      return event.level === undefined && event.items !== undefined && event.mode !== 'replace'
    case 'source_anchors_observed':
      return event.mode !== 'replace'
    default:
      return false
  }
}

function snapshotCheckpoint(value: LearningCheckpointV1): LearningCheckpointV1 {
  const parsed = parseLearningCheckpointV1(value)
  return {
    protocol: parsed.protocol,
    kind: parsed.kind,
    prompt: parsed.prompt,
    ...(parsed.context === undefined ? {} : { context: parsed.context }),
    expectedEvidence: parsed.expectedEvidence,
    ...(parsed.options === undefined
      ? {}
      : { options: parsed.options.map(option => ({ id: option.id, label: option.label })) }),
    fallbackMarkdown: parsed.fallbackMarkdown,
  }
}

function normalizeCheckpointResult(result: LearningCheckpointResultV1): LearningCheckpointResultV1 {
  if (result.status === 'skipped') {
    return {
      protocol: result.protocol,
      checkpointId: result.checkpointId,
      status: 'skipped',
      ...(result.reason === undefined ? {} : { reason: result.reason }),
      receiptId: result.receiptId,
    }
  }
  if (result.status === 'cancelled') {
    return {
      protocol: result.protocol,
      checkpointId: result.checkpointId,
      status: 'cancelled',
      ...(result.reason === undefined ? {} : { reason: result.reason }),
      receiptId: result.receiptId,
    }
  }
  const response = 'text' in result.response
    ? { text: result.response.text }
    : 'optionId' in result.response
      ? { optionId: result.response.optionId }
      : { number: result.response.number }
  return {
    protocol: result.protocol,
    checkpointId: result.checkpointId,
    status: 'submitted',
    response,
    receiptId: result.receiptId,
  }
}

type CheckpointFallbackOutcome =
  | { status: 'skipped'; reason: LearningCheckpointSkippedReasonV1 }
  | { status: 'cancelled'; reason: LearningCheckpointCancelledReasonV1 }

function checkpointFallbackResult(
  checkpointId: string,
  outcome: CheckpointFallbackOutcome,
): LearningCheckpointResultV1 {
  return {
    protocol: CHECKPOINT_RESULT_PROTOCOL,
    checkpointId,
    ...outcome,
    receiptId: randomUUID(),
  }
}

function checkpointFallbackSubmission(
  checkpoint: LearningCheckpointV1,
  checkpointId: string,
  custom: string,
): LearningCheckpointResultV1 | undefined {
  let response: { text: string } | { optionId: string } | { number: number } | undefined
  if (checkpoint.kind === 'single_choice') {
    // Rich clients submit the stable id directly. A plain terminal/provider
    // may only return what the learner typed, though, so accept an exact
    // visible label when it identifies one option. Duplicate labels stay
    // ambiguous and continue to use the ordinary skipped fallback.
    const byId = checkpoint.options?.find(candidate => candidate.id === custom)
    const normalizeLabel = (value: string): string => value.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLowerCase()
    const normalizedCustom = normalizeLabel(custom)
    const byLabel = checkpoint.options?.filter(candidate => normalizeLabel(candidate.label) === normalizedCustom) ?? []
    const option = byId ?? (byLabel.length === 1 ? byLabel[0] : undefined)
    if (option !== undefined) response = { optionId: option.id }
  } else if (checkpoint.kind === 'numeric') {
    const number = Number(custom)
    if (Number.isFinite(number)) response = { number }
  } else response = { text: custom }
  if (response === undefined) return undefined
  return normalizeCheckpointResult(parseLearningCheckpointResultV1({
    protocol: CHECKPOINT_RESULT_PROTOCOL,
    checkpointId,
    status: 'submitted',
    response,
    receiptId: randomUUID(),
  }, { checkpointId, checkpoint }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Session events carry turn boundaries separately from `user/message`. Keep
 * evidence tied to a turn that actually contained a direct human message;
 * injected plugin context and assistant/tool messages never qualify.
 */
function realUserTurns(session: Pick<Agent['session'], 'events'>): Set<number> {
  const turns = new Set<number>()
  let openTurn: number | undefined
  for (const event of session.events as readonly SessionEvent[]) {
    if (event.type === 'turn/start') {
      const turn = event.data.turn
      openTurn = Number.isSafeInteger(turn) && turn >= 0 ? turn : undefined
      continue
    }
    if (event.type === 'user/message') {
      if (openTurn !== undefined && event.data.source.kind === 'user') turns.add(openTurn)
      continue
    }
    if (event.type === 'turn/end' && openTurn === event.data.turn) openTurn = undefined
  }
  return turns
}

function assertRealUserTurn(session: Pick<Agent['session'], 'events'>, turn: number | undefined): number {
  if (!Number.isSafeInteger(turn) || (turn as number) < 0) {
    throw new TypeError('learner evidence requires a non-negative observation.turn')
  }
  if (!realUserTurns(session).has(turn as number)) {
    throw new TypeError(`observation.turn ${String(turn)} is not a real user turn in this session`)
  }
  return turn as number
}

function assertTurnNumber(turn: number | undefined): number {
  if (!Number.isSafeInteger(turn) || (turn as number) < 0) {
    throw new TypeError('learning segment anchor requires a non-negative turn')
  }
  return turn as number
}

function latestRealUserTurn(session: Pick<Agent['session'], 'events'>): number | undefined {
  const turns = realUserTurns(session)
  return turns.size === 0 ? undefined : Math.max(...turns)
}

function emptyCheckpointAggregate(): LearningCheckpointAggregate {
  return {
    usageCount: 0,
    kindCounts: Object.fromEntries(LEARNING_CHECKPOINT_METRIC_KINDS.map(kind => [kind, 0])) as Record<LearningCheckpointMetricKind, number>,
    terminalCounts: Object.fromEntries(LEARNING_CHECKPOINT_METRIC_STATUSES.map(status => [status, 0])) as Record<LearningCheckpointMetricStatus, number>,
    draftRecovery: { attempts: 0, hits: 0 },
  }
}

function cloneCheckpointAggregate(value: LearningCheckpointAggregate): LearningCheckpointAggregate {
  return {
    usageCount: value.usageCount,
    kindCounts: { ...value.kindCounts },
    terminalCounts: { ...value.terminalCounts },
    draftRecovery: { ...value.draftRecovery },
  }
}

function latestCheckpointAggregate(session: Pick<Agent['session'], 'events'>): LearningCheckpointAggregate {
  for (let index = session.events.length - 1; index >= 0; index -= 1) {
    const event = session.events[index]
    if (event?.type !== LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE || !isRecord(event.data)) continue
    const data = event.data as Record<string, unknown>
    if (data.protocol !== LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL || !isRecord(data.aggregate)) continue
    const aggregate = data.aggregate as Partial<LearningCheckpointAggregate>
    if (typeof aggregate.usageCount !== 'number'
      || !isRecord(aggregate.kindCounts)
      || !isRecord(aggregate.terminalCounts)
      || !isRecord(aggregate.draftRecovery)) continue
    return {
      usageCount: aggregate.usageCount,
      kindCounts: { ...emptyCheckpointAggregate().kindCounts, ...aggregate.kindCounts } as Record<LearningCheckpointMetricKind, number>,
      terminalCounts: { ...emptyCheckpointAggregate().terminalCounts, ...aggregate.terminalCounts } as Record<LearningCheckpointMetricStatus, number>,
      draftRecovery: {
        attempts: Number(aggregate.draftRecovery.attempts ?? 0),
        hits: Number(aggregate.draftRecovery.hits ?? 0),
      },
    }
  }
  return emptyCheckpointAggregate()
}

/** Host-side V2 Question/Reveal coordinator; V1 is replay-only. */
export class LearningActivityBroker extends Service {
  static inject = ['userQuestions']

  private readonly pendingActivities = new Map<AbortController, { reason?: LearningAbortReason }>()
  private legacyGate: LegacyLearningGate | undefined
  private legacyGatePromise: Promise<LegacyLearningGate> | undefined
  private readonly checkpointCalls = new Map<string, CheckpointCallRecord>()
  private readonly checkpointReceipts = new Map<string, CheckpointReceiptRecord>()
  private readonly pendingCheckpointSessions = new Map<string, string>()
  private readonly pendingCheckpointWaits = new Map<string, {
    session: Agent['session']
    controller: AbortController
  }>()
  /** Current Host agent for the session-scoped Client recall bridge. */
  private readonly activeAgents = new Map<string, { agent: Agent; session: Agent['session'] }>()
  private readonly learnerStates = new Map<string, LearnerStateCacheRecord>()
  private readonly observers = new Set<(event: LearningLifecycleEvent) => void>()
  private disposed = false

  constructor(ctx: Context) {
    super(ctx, 'learningActivities')
    ctx.effect(() => () => {
      this.disposed = true
      this.legacyGate?.dispose()
      for (const [controller, state] of this.pendingActivities) {
        state.reason = 'plugin-disposed'
        controller.abort(new LearningWaitAbort(state.reason))
      }
      this.pendingActivities.clear()
      this.checkpointCalls.clear()
      this.checkpointReceipts.clear()
      this.pendingCheckpointSessions.clear()
      this.pendingCheckpointWaits.clear()
      this.activeAgents.clear()
      this.learnerStates.clear()
      this.observers.clear()
    }, 'interactive-learning: abort pending activities')
    ctx.on('agent/disposed', ({ agent }) => {
      this.abortPendingCheckpointSession(agent.session)
      this.dropLearnerState(agent.session)
    })
    ctx.on('session/disposed', session => {
      this.abortPendingCheckpointSession(session)
      this.dropLearnerState(session)
    })

    // Generic Connection is already the Host↔Client RPC carrier. Keep the
    // recall endpoint package-private and let the broker enforce session
    // ownership before recording any learner evidence.
    ctx.inject(['connection'], (connectionCtx) => {
      const connection = connectionCtx.get('connection') as RecallRpcConnection | undefined
      if (connection === undefined) return
      connectionCtx.effect(() => connection.rpc.handle(
        '/interactive-learning',
        async (endpoint: string, payload: unknown) => {
          if (isVaultEndpoint(endpoint)) {
            return handleVaultEndpoint(this.ctx, endpoint, payload)
          }
          if (endpoint !== 'recall/feedback') {
            return {
              ok: false,
              error: {
                code: 'bad-request',
                message: 'unknown interactive-learning RPC endpoint',
                details: { issues: [] },
              },
            }
          }
          try {
            const feedback = parseLearningRecallFeedbackV1(payload)
            return { ok: true, value: this.recordRecallFeedback(feedback) }
          } catch (cause) {
            return {
              ok: false,
              error: {
                code: 'bad-request',
                message: cause instanceof Error ? cause.message : String(cause),
                details: { issues: [] },
              },
            }
          }
        },
        { authority: 'trusted-host' },
      ),
        'interactive-learning: recall feedback rpc',
      )
    })
  }

  /** Diagnostics/test seam; no activity payloads or learner answers are exposed. */
  get pendingCount(): number {
    return this.pendingActivities.size + (this.legacyGate?.pendingCount ?? 0)
  }

  /** Diagnostics/test seam; state content remains private to its session. */
  get learnerStateCacheSize(): number {
    return this.learnerStates.size
  }

  /** Diagnostics/test seam; counts only, never checkpoint or learner content. */
  get checkpointCacheSize(): number {
    return this.checkpointCalls.size
      + this.checkpointReceipts.size
      + this.pendingCheckpointSessions.size
      + this.pendingCheckpointWaits.size
  }

  /** Whether this composition can render Learning visuals and checkpoints. */
  get richClientAvailable(): boolean {
    return this.hasRichClient()
  }

  /** Fold the latest durable full snapshot for this exact live session. */
  learnerState(agent: Agent): LearnerState {
    const session = agent.session
    const sessionId = String(session.id)
    const current = this.learnerStates.get(sessionId)
    if (current?.session === session && current.eventCount === session.events.length) {
      return current.state
    }
    const state = foldLearnerStateSession(sessionId, session.events)
    this.learnerStates.set(sessionId, { session, eventCount: session.events.length, state })
    return state
  }

  /** Render only the bounded, model-facing projection of the current state. */
  learnerStateTranscript(agent: Agent, maxTokens = 300): string {
    return renderLearnerStateTranscript(this.learnerState(agent), { maxTokens })
  }

  /** Read the answer-free checkpoint aggregate for one session. */
  checkpointMetrics(agent: Agent): LearningCheckpointAggregate {
    return cloneCheckpointAggregate(latestCheckpointAggregate(agent.session))
  }

  /**
   * Host-side route hook. The caller writes the already-classified active or
   * closed boundary as a session-local, identity-free anchor, so refresh can
   * restore the route without relying on a model-written `goal`.
   */
  recordLearningSegmentAnchor(
    agent: Agent,
    turn?: number,
    segment: LearningSegmentAnchorEvent['segment'] = 'active',
  ): void {
    if (this.disposed) return
    const session = agent.session
    // The inbox claimed hook runs after turn/start but before user/message is
    // appended. An explicit claimed turn is therefore host-owned provenance,
    // while the no-argument convenience path still requires a real message.
    const resolvedTurn = turn === undefined
      ? assertRealUserTurn(session, latestRealUserTurn(session))
      : assertTurnNumber(turn)
    const prior = [...session.events].reverse().find(event => event.type === LEARNING_SEGMENT_SESSION_EVENT_TYPE)
    if (prior?.type === LEARNING_SEGMENT_SESSION_EVENT_TYPE
      && prior.data.protocol === LEARNING_SEGMENT_EVENT_PROTOCOL
      && prior.data.segment === segment
      && prior.data.turn === resolvedTurn) return
    session.append(
      LEARNING_SEGMENT_SESSION_EVENT_TYPE,
      {
        protocol: LEARNING_SEGMENT_EVENT_PROTOCOL,
        route: 'learn',
        segment,
        turn: resolvedTurn,
      },
      { ignorable: true },
    )
    const current = this.learnerStates.get(String(session.id))
    if (current?.session === session) current.eventCount = session.events.length
  }

  /**
   * Whether the latest host route anchor still denotes an active learning
   * segment. An anchor survives a refresh, but it is retired once the learner
   * has moved more than one real user turn past it without another learn
   * anchor. The one-turn allowance covers the user message currently being
   * claimed by the loop; injected context never advances this sequence.
   */
  learningSegmentActive(agent: Agent): boolean {
    const state = this.learnerState(agent)
    if (state.phase === 'complete' || state.nextMove === 'complete') return false

    const anchorEvent = [...agent.session.events]
      .reverse()
      .find(event => event.type === LEARNING_SEGMENT_SESSION_EVENT_TYPE)
    if (anchorEvent === undefined || !isRecord(anchorEvent.data)) return false
    const anchor = anchorEvent.data as Partial<LearningSegmentAnchorEvent>
    if (anchor.protocol !== LEARNING_SEGMENT_EVENT_PROTOCOL
      || anchor.route !== 'learn'
      || anchor.segment !== 'active'
      || !Number.isSafeInteger(anchor.turn)
      || (anchor.turn as number) < 0) return false

    const turns = realUserTurns(agent.session)
    const anchorTurn = anchor.turn as number
    if (!turns.has(anchorTurn)) return false
    return [...turns].filter(turn => turn > anchorTurn).length <= 1
  }

  /** CAS mutation used exclusively by the internal, immediate state tool.
   * Exact replays and a small set of additive observations may rebase once;
   * replacement, correction, and reset operations remain strict CAS writes.
   */
  updateLearnerState(request: LearningStateUpdateRequest): LearningStateUpdateResult {
    let current = this.learnerState(request.agent)
    // Evidence is the one learner-state input that can alter mastery. Verify
    // its provenance against the live session before any CAS/replay branch.
    if (request.action === 'update' && request.event.type === 'learner_evidence_observed') {
      assertRealUserTurn(request.agent.session, request.event.observation.turn)
    }
    if (request.action === 'correct' && request.correction.evidence !== undefined) {
      assertRealUserTurn(request.agent.session, request.observation.turn)
    }
    if (!Number.isSafeInteger(request.expectedRevision) || request.expectedRevision < 0) {
      throw new TypeError('expectedRevision must be a non-negative safe integer')
    }
    if (current.revision !== request.expectedRevision) {
      // A retried tool call can arrive after its own event was already
      // committed. Reducing it against the latest snapshot verifies the
      // fingerprint and turns that exact replay into an acknowledgement.
      // Conflicting reuse of an observation id still throws from the reducer.
      if (request.action === 'update'
        && current.appliedEventIds.some(item => item.id === request.event.observation.id)) {
        const replay = reduceLearnerState(current, request.event)
        if (replay === current) return { status: 'updated', revision: current.revision }
      }
      if (request.action === 'update' && isSafeStaleLearnerStateUpdate(request.event)) {
        // The event was not present in the latest fence. Only list additions
        // without lifecycle side effects enter this path. Evidence and failed
        // moves can change phase/nextMove, so they remain strict CAS writes.
        const rebased = reduceLearnerState(current, request.event)
        if (pedagogicalStateFingerprint(rebased) === pedagogicalStateFingerprint(current)) {
          throw new Error('learning_state_update requires a substantive observable state change')
        }
        this.appendLearnerState(request.agent, rebased, 'update')
        return { status: 'updated', revision: rebased.revision }
      }
      throw new Error(
        `Learner state revision changed: expected ${request.expectedRevision}, current ${current.revision}`,
      )
    }

    if (request.action === 'reset') {
      this.abortPendingCheckpointSession(request.agent.session)
      const state = resetLearnerState(current)
      this.appendLearnerState(request.agent, state, 'reset')
      return { status: 'reset', revision: state.revision }
    }

    const event: LearnerStateEvent = request.action === 'correct'
      ? { type: 'state_corrected', correction: request.correction, observation: request.observation }
      : request.event
    const state = reduceLearnerState(current, event)
    // A durable replay after a broker refresh still reduces to the exact same
    // state via appliedEventIds. Acknowledge it without appending a snapshot.
    if (state === current) {
      return {
        status: request.action === 'correct' ? 'corrected' : 'updated',
        revision: current.revision,
      }
    }
    if (pedagogicalStateFingerprint(state) === pedagogicalStateFingerprint(current)) {
      throw new Error('learning_state_update requires a substantive observable state change')
    }
    this.appendLearnerState(request.agent, state, request.action === 'correct' ? 'correction' : 'update')
    return {
      status: request.action === 'correct' ? 'corrected' : 'updated',
      revision: state.revision,
    }
  }

  /** Subscribe to answer-free lifecycle metadata. */
  observe(listener: (event: LearningLifecycleEvent) => void): () => void {
    this.observers.add(listener)
    return () => this.observers.delete(listener)
  }

  /** Answer-free ingress for stream/UI/kernel instrumentation outside this service. */
  reportLifecycle(event: Omit<LearningLifecycleEvent, 'at'>): void {
    this.emit(event)
  }

  private emit(event: Omit<LearningLifecycleEvent, 'at'>): void {
    const observed = { ...event, at: Date.now() }
    for (const listener of this.observers) {
      try { listener(observed) } catch { /* diagnostics must not break the learning gate */ }
    }
  }

  /** Whether this Web composition advertises the matching Client bundle. */
  private hasRichClient(): boolean {
    return this.ctx.get('clientModules')?.graph().entries
      .some((entry: { id: string }) => entry.id === INTERACTIVE_LEARNING_PACKAGE) === true
  }

  /** Load the retired Question/Reveal coordinator only when its API is used. */
  private async getLegacyGate(): Promise<LegacyLearningGate> {
    if (this.legacyGate !== undefined) return this.legacyGate
    if (this.legacyGatePromise !== undefined) return this.legacyGatePromise
    this.legacyGatePromise = import('./legacy-gate.ts').then(({ LegacyLearningGate }) => {
      const gate = new LegacyLearningGate({
        ctx: this.ctx,
        defaultTimeoutMs: DEFAULT_LEARNING_WAIT_TIMEOUT_MS,
        hasRichClient: () => this.hasRichClient(),
        emit: event => this.emit(event),
      })
      this.legacyGate = gate
      if (this.disposed) gate.dispose()
      return gate
    })
    return this.legacyGatePromise
  }

  private dropLearnerState(session: { id: unknown }): void {
    const sessionId = String(session.id)
    if (this.activeAgents.get(sessionId)?.session === session) this.activeAgents.delete(sessionId)
    if (this.learnerStates.get(sessionId)?.session === session) {
      this.learnerStates.delete(sessionId)
    }
    for (const [key, record] of this.checkpointCalls) {
      if (record.session === session) this.checkpointCalls.delete(key)
    }
    for (const [key, record] of this.checkpointReceipts) {
      if (record.session === session) this.checkpointReceipts.delete(key)
    }
    const pending = this.pendingCheckpointWaits.get(sessionId)
    if (pending?.session === session) {
      this.pendingCheckpointWaits.delete(sessionId)
      this.pendingCheckpointSessions.delete(sessionId)
    }
  }

  private abortPendingCheckpointSession(session: { id: unknown }): void {
    const sessionId = String(session.id)
    const pending = this.pendingCheckpointWaits.get(sessionId)
    if (pending === undefined || pending.session !== session) return
    const { controller } = pending
    const state = this.pendingActivities.get(controller)
    if (state !== undefined) state.reason = 'session-aborted'
    controller.abort(new LearningWaitAbort('session-aborted'))
    this.pendingCheckpointWaits.delete(sessionId)
    this.pendingCheckpointSessions.delete(sessionId)
    this.pendingActivities.delete(controller)
  }

  private appendLearnerState(
    agent: Agent,
    state: LearnerState,
    reason: 'update' | 'correction' | 'reset',
  ): void {
    const session = agent.session
    session.append(
      LEARNER_STATE_SESSION_EVENT_TYPE,
      createLearnerStateSnapshotEvent(state, reason),
      { ignorable: true },
    )
    this.learnerStates.set(String(session.id), {
      session,
      eventCount: session.events.length,
      state,
    })
  }

  private recordCheckpointMetrics(
    agent: Agent,
    kind: string,
    status: string,
    draftRecovered: boolean | undefined,
  ): void {
    if (!LEARNING_CHECKPOINT_METRIC_KINDS.includes(kind as LearningCheckpointMetricKind)
      || !LEARNING_CHECKPOINT_METRIC_STATUSES.includes(status as LearningCheckpointMetricStatus)) return
    const aggregate = latestCheckpointAggregate(agent.session)
    aggregate.usageCount += 1
    aggregate.kindCounts[kind as LearningCheckpointMetricKind] += 1
    aggregate.terminalCounts[status as LearningCheckpointMetricStatus] += 1
    if (draftRecovered !== undefined) {
      aggregate.draftRecovery.attempts += 1
      if (draftRecovered) aggregate.draftRecovery.hits += 1
    }
    agent.session.append(
      LEARNING_CHECKPOINT_METRICS_SESSION_EVENT_TYPE,
      { protocol: LEARNING_CHECKPOINT_METRICS_EVENT_PROTOCOL, aggregate },
      { ignorable: true },
    )
    const current = this.learnerStates.get(String(agent.session.id))
    if (current?.session === agent.session) current.eventCount = agent.session.events.length
  }

  private recordAutomaticEvents(agent: Agent, events: readonly LearnerStateEvent[]): void {
    try {
      let state = this.learnerState(agent)
      for (const event of events) {
        if (event.type === 'learner_evidence_observed') {
          assertRealUserTurn(agent.session, event.observation.turn)
        }
        state = reduceLearnerState(state, event)
      }
      // Replayed observation ids reduce to the exact same state and must not
      // append another full snapshot.
      if (state !== this.learnerState(agent)) this.appendLearnerState(agent, state, 'update')
    } catch (cause) {
      // Internal evidence bookkeeping must never turn an optional visual or
      // checkpoint into a blocking teaching failure.
      this.ctx.logger.warn(`learning state observation was not recorded: ${String(cause)}`)
    }
  }

  /**
   * Record the concrete assistant move without adding another user wait.
   *
   * A composition with no Learning Client renders nothing, so the move never
   * happened: claiming it would both mislead the next teaching step and write
   * a false observation into the session's pedagogical state.
   *
   * @returns whether the learner can actually see this visual.
   */
  recordVisual(agent: Agent | undefined, callId: string): LearningVisualStatusV4 {
    const stableCallId = boundedIdentity(callId, 'callId')
    if (!this.hasRichClient()) return 'unavailable'
    if (agent === undefined) return 'ready'
    this.activeAgents.set(String(agent.session.id), { agent, session: agent.session })
    this.recordAutomaticEvents(agent, [{
      type: 'assistant_move_observed',
      move: 'visual',
      observation: {
        id: learnerObservationId('visual', String(agent.session.id), stableCallId),
        source: 'assistant-output',
        summary: 'The assistant rendered one non-blocking semantic visual.',
      },
      moveFingerprint: `visual:${stableCallId}`,
    }])
    return 'ready'
  }

  /**
   * Record an explicit RecallDeck self-rating as low-confidence, unknown
   * evidence. A self-rating is useful review intent, but it is not proof of
   * correctness, independence, or transfer mastery.
   */
  recordRecallFeedback(feedback: LearningRecallFeedbackV1): LearningRecallFeedbackResult {
    if (this.disposed) return { status: 'ignored', reason: 'session-unavailable' }
    let active = this.activeAgents.get(feedback.sessionId)
    if (active === undefined) {
      // A replayed deck may be opened after the original visual call. Prefer
      // the live registry's exact session identity before treating it as an
      // unknown client report.
      const recovered = this.ctx.get('agents')?.get(feedback.sessionId as Agent['id'])
      if (recovered !== undefined) {
        active = { agent: recovered, session: recovered.session }
        this.activeAgents.set(feedback.sessionId, active)
      }
    }
    if (active === undefined || String(active.session.id) !== feedback.sessionId) {
      return { status: 'ignored', reason: 'session-unavailable' }
    }
    const observationId = learnerObservationId(
      'recall',
      feedback.sessionId,
      feedback.callId,
      feedback.cardId,
      feedback.status,
    )
    const summary = feedback.status === 'revealed'
      ? `Recall card ${feedback.cardId} answer was revealed; no correctness was established.`
      : `Recall card ${feedback.cardId} marked ${feedback.status}; self-rating is unverified.`
    const turn = latestRealUserTurn(active.session)
    this.recordAutomaticEvents(active.agent, [{
      type: 'learner_evidence_observed',
      evidence: {
        kind: 'attempt',
        summary,
        confidence: 'low',
        correctness: 'unknown',
        independence: 'unknown',
      },
      observation: {
        id: observationId,
        source: 'learner-action',
        summary,
        ...(turn === undefined ? {} : { turn }),
      },
    }])
    if (feedback.status !== 'revealed') {
      void this.persistRecallReview(active.agent, feedback).catch(cause => {
        this.ctx.logger.warn(`recall review schedule was not persisted: ${String(cause)}`)
      })
    }
    return { status: 'recorded', observationId }
  }

  private async persistRecallReview(agent: Agent, feedback: LearningRecallFeedbackV1): Promise<void> {
    const vault = await resolveTopicVault(this.ctx, agent.session.header.cwd)
    if (vault === undefined) return
    const card = (await readConceptCards(vault)).find(candidate => recallCardIdOf(candidate.conceptSlug) === feedback.cardId)
    if (card === undefined) return
    const schedule = nextReviewSchedule(card, feedback.status)
    if (schedule === undefined) return
    const updated = await updateConceptCardSchedule(vault, card.conceptSlug, schedule)
    if (updated === undefined) return
    const record = (await readLearnerMemory(vault)).concepts.find(
      candidate => candidate.conceptSlug === card.conceptSlug,
    )
    if (record !== undefined) {
      await upsertLearnerConcept(vault, {
        ...record,
        due: updated.due,
        reviewIntervalDays: updated.intervalDays,
        lastReviewedAt: updated.lastReviewedAt,
      })
    }
  }

  private recordCheckpointOutcome(
    request: PresentLearningCheckpointRequest,
    result: LearningCheckpointResultV1,
    fence: CheckpointStateFence | undefined,
  ): void {
    const agent = request.agent
    if (agent === undefined || fence === undefined || this.disposed) return
    this.recordCheckpointMetrics(agent, request.checkpoint.kind, result.status, request.draftRecovered)
    try {
      const live = this.ctx.get('agents')?.get(agent.id)
      if (live !== agent || agent.session !== fence.session) return
      if (this.learnerState(agent).revision !== fence.revision) return
    } catch (cause) {
      this.ctx.logger.warn(`learning checkpoint state fence could not be verified: ${String(cause)}`)
      return
    }
    const observationBase = learnerObservationId(
      'checkpoint',
      String(agent.session.id),
      request.callId,
      result.status,
    )
    const events: LearnerStateEvent[] = []
    if (result.status === 'submitted') {
      events.push({
        type: 'learner_evidence_observed',
        evidence: request.checkpoint.expectedEvidence === 'transfer'
          ? {
              kind: 'transfer',
              transferContext: 'unknown',
              summary: 'Submitted a transfer response to the optional checkpoint.',
              confidence: 'low',
              correctness: 'unknown',
              independence: 'unknown',
            }
          : {
              kind: request.checkpoint.expectedEvidence,
              summary: `Submitted a ${request.checkpoint.expectedEvidence} response to the optional checkpoint.`,
              confidence: 'low',
              correctness: 'unknown',
              independence: 'unknown',
            },
        observation: {
          id: `${observationBase}:evidence`,
          source: 'learner-action',
          summary: `The learner submitted the requested ${request.checkpoint.expectedEvidence} response.`,
          turn: latestRealUserTurn(agent.session),
        },
      })
    }
    const outcomeReason = result.status === 'submitted' ? undefined : result.reason
    events.push({
      type: 'assistant_move_observed',
      move: 'checkpoint',
      observation: {
        id: `${observationBase}:move`,
        source: 'assistant-output',
        summary: outcomeReason === undefined
          ? `The optional checkpoint ended ${result.status}; continue in ordinary conversation.`
          : `The optional checkpoint ended ${result.status} (${outcomeReason}); continue in ordinary conversation.`,
      },
      moveFingerprint: `checkpoint:${request.callId}:${result.status}:${outcomeReason ?? 'legacy'}`,
    })
    this.recordAutomaticEvents(agent, events)
  }

  /** Optional V4.1 path: one answer-free checkpoint, independent of V2 lessons. */
  async presentCheckpoint(request: PresentLearningCheckpointRequest): Promise<LearningCheckpointResultV1> {
    const checkpoint = snapshotCheckpoint(request.checkpoint)
    const sessionId = request.agent === undefined ? '' : String(request.agent.session.id)
    const callId = boundedIdentity(request.callId, 'callId')
    const callKey = sessionId === '' ? undefined : JSON.stringify([sessionId, callId])
    const fingerprint = JSON.stringify(checkpoint)
    let prior = callKey === undefined ? undefined : this.checkpointCalls.get(callKey)
    if (prior !== undefined && prior.session !== request.agent?.session) {
      this.checkpointCalls.delete(callKey as string)
      prior = undefined
    }
    if (prior !== undefined) {
      if (prior.fingerprint !== fingerprint) {
        throw new LearningProtocolError(['checkpoint callId was replayed with different content'])
      }
      return prior.result
    }

    const normalizedRequest = { ...request, checkpoint, callId }
    const stateFence: CheckpointStateFence | undefined = request.agent === undefined
      ? undefined
      : { session: request.agent.session, revision: this.learnerState(request.agent).revision }
    const result = this.presentCheckpointOnce(normalizedRequest, sessionId, callKey).then(outcome => {
      this.recordCheckpointOutcome(normalizedRequest, outcome, stateFence)
      return outcome
    })
    if (callKey !== undefined) {
      this.checkpointCalls.set(callKey, {
        fingerprint,
        session: request.agent!.session,
        result,
      })
      trimOldest(this.checkpointCalls)
    }
    try {
      return await result
    } catch (cause) {
      if (callKey !== undefined && this.checkpointCalls.get(callKey)?.result === result) {
        this.checkpointCalls.delete(callKey)
      }
      throw cause
    }
  }

  private async presentCheckpointOnce(
    request: PresentLearningCheckpointRequest,
    sessionId: string,
    callKey: string | undefined,
  ): Promise<LearningCheckpointResultV1> {
    const checkpointId = randomUUID()
    const fallback = (outcome: CheckpointFallbackOutcome): LearningCheckpointResultV1 =>
      checkpointFallbackResult(checkpointId, outcome)

    if (!this.hasRichClient()) return fallback({ status: 'skipped', reason: 'client-unavailable' })
    if (request.agent === undefined || sessionId === '' || callKey === undefined) {
      return fallback({ status: 'skipped', reason: 'host-unavailable' })
    }
    const timeoutMs = request.timeoutMs ?? DEFAULT_LEARNING_CHECKPOINT_TIMEOUT_MS
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return fallback({ status: 'skipped', reason: 'host-unavailable' })
    }

    const activeCall = this.pendingCheckpointSessions.get(sessionId)
    if (activeCall !== undefined && activeCall !== callKey) {
      throw new LearningProtocolError(['a session may have at most one pending learning checkpoint'])
    }
    this.pendingCheckpointSessions.set(sessionId, callKey)
    try {
      return await this.waitForCheckpoint({ request, checkpointId, sessionId, timeoutMs })
    } finally {
      if (this.pendingCheckpointSessions.get(sessionId) === callKey) {
        this.pendingCheckpointSessions.delete(sessionId)
      }
    }
  }

  private async waitForCheckpoint(input: {
    request: PresentLearningCheckpointRequest
    checkpointId: string
    sessionId: string
    timeoutMs: number
  }): Promise<LearningCheckpointResultV1> {
    const { request, checkpointId, sessionId, timeoutMs } = input
    const checkpoint = request.checkpoint
    const waitId = randomUUID()
    const controller = new AbortController()
    const state: { reason?: LearningAbortReason } = {}
    this.pendingActivities.set(controller, state)
    this.pendingCheckpointWaits.set(sessionId, {
      session: (request.agent as Agent).session,
      controller,
    })
    const abortFromSession = (): void => {
      state.reason = 'session-aborted'
      controller.abort(new LearningWaitAbort(state.reason))
    }
    if (request.signal?.aborted === true) abortFromSession()
    else request.signal?.addEventListener('abort', abortFromSession, { once: true })
    const timer = setTimeout(() => {
      state.reason = 'client-response-timeout'
      controller.abort(new LearningWaitAbort(state.reason))
    }, timeoutMs)
    timer.unref?.()

    const fallback = (outcome: CheckpointFallbackOutcome): LearningCheckpointResultV1 =>
      checkpointFallbackResult(checkpointId, outcome)

    try {
      const questions = (this.ctx as Context & { userQuestions: UserQuestionService }).userQuestions
      const ask = questions.ask({
        questions: [{
          id: learningCheckpointQuestionId(waitId),
          question: checkpoint.prompt,
          detail: encodeLearningCheckpointDetail({
            sessionId,
            callId: request.callId,
            waitId,
            checkpointId,
            checkpoint,
          }),
          ...(checkpoint.kind === 'single_choice'
            ? { options: checkpoint.options?.map(option => ({ label: option.label })) }
            : {}),
        }],
        agent: request.agent as Agent,
        signal: controller.signal,
      })
      const aborted = new Promise<never>((_resolve, reject) => {
        if (controller.signal.aborted) reject(controller.signal.reason)
        else controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
      })
      const answer = await Promise.race([ask, aborted])
      const item = answer.answers[0]
      const custom = item?.custom?.trim()
      let result: LearningCheckpointResultV1
      if (custom !== undefined && custom !== '') {
        let decoded: unknown
        try { decoded = JSON.parse(custom) as unknown } catch { decoded = undefined }
        const envelope = isRecord(decoded) ? decoded : undefined
        // The rich Client may wrap the model-visible result with answer-free
        // UI metadata. Keep the metadata out of the protocol parser and the
        // durable result; only carry the draft-recovery bit to aggregation.
        const hasCheckpointEnvelope = envelope !== undefined && Object.hasOwn(envelope, 'checkpointResult')
        const wrappedResult = hasCheckpointEnvelope && isRecord(envelope?.checkpointResult)
          ? envelope.checkpointResult
          : decoded
        if (envelope !== undefined && isRecord(envelope.clientMeta)
          && typeof envelope.clientMeta.draftRecovered === 'boolean') {
          request.draftRecovered = envelope.clientMeta.draftRecovered
        }
        if (isRecord(wrappedResult)
          && wrappedResult.protocol === CHECKPOINT_RESULT_PROTOCOL) {
          result = normalizeCheckpointResult(parseLearningCheckpointResultV1(wrappedResult, { checkpointId, checkpoint }))
        } else {
          // Never reinterpret a malformed rich-client envelope as the
          // learner's free-text answer; only legacy naked provider text gets
          // that compatibility fallback.
          result = (hasCheckpointEnvelope ? undefined : checkpointFallbackSubmission(checkpoint, checkpointId, custom))
            ?? fallback({ status: 'skipped', reason: 'provider-failure' })
        }
      } else result = fallback({ status: 'skipped', reason: 'provider-failure' })
      return this.acceptCheckpointReceipt((request.agent as Agent).session, result)
    } catch (cause) {
      if (cause instanceof LearningProtocolError) throw cause
      if (cause instanceof LearningWaitAbort) {
        return cause.reason === 'client-response-timeout'
          ? fallback({ status: 'skipped', reason: 'client-response-timeout' })
          : fallback({ status: 'cancelled', reason: cause.reason })
      }
      const code = cause instanceof UserQuestionError ? (cause as UserQuestionError & { code: string }).code : undefined
      if (code === 'ASK_CANCELLED') return fallback({ status: 'cancelled', reason: 'learner-cancelled' })
      if (code === 'ASK_ABORTED') {
        const reason = state.reason ?? 'session-aborted'
        return reason === 'client-response-timeout'
          ? fallback({ status: 'skipped', reason: 'client-response-timeout' })
          : fallback({ status: 'cancelled', reason })
      }
      if (code === 'NO_PROVIDER' || code === 'DELEGATED_CALLER' || code === 'CALLER_NOT_LIVE') {
        return fallback({ status: 'skipped', reason: 'provider-failure' })
      }
      this.ctx.logger.warn(`learning checkpoint provider failed; continuing ordinary conversation: ${String(cause)}`)
      return fallback({ status: 'skipped', reason: 'provider-failure' })
    } finally {
      clearTimeout(timer)
      request.signal?.removeEventListener('abort', abortFromSession)
      this.pendingActivities.delete(controller)
      if (this.pendingCheckpointWaits.get(sessionId)?.controller === controller) {
        this.pendingCheckpointWaits.delete(sessionId)
      }
    }
  }

  private acceptCheckpointReceipt(
    session: Agent['session'],
    result: LearningCheckpointResultV1,
  ): LearningCheckpointResultV1 {
    const key = JSON.stringify([String(session.id), result.receiptId])
    let prior = this.checkpointReceipts.get(key)
    if (prior !== undefined && prior.session !== session) {
      this.checkpointReceipts.delete(key)
      prior = undefined
    }
    if (prior !== undefined) {
      if (JSON.stringify(prior.result) !== JSON.stringify(result)) {
        throw new LearningProtocolError(['checkpointResult.receiptId was reused for different content'])
      }
      return prior.result
    }
    this.checkpointReceipts.set(key, { session, result })
    trimOldest(this.checkpointReceipts)
    return result
  }

  async presentQuestion(request: Omit<PresentLearningGateRequest, 'activity'> & { activity: LearningQuestionV2 }): Promise<LearningResponseV2> {
    return this.presentGate(request)
  }

  async presentReveal(request: Omit<PresentLearningGateRequest, 'activity'> & { activity: LearningRevealV2 }): Promise<LearningResponseV2> {
    return this.presentGate(request)
  }

  /** V2 live path: one call owns exactly one durable Question or Reveal wait. */
  async presentGate(request: PresentLearningGateRequest): Promise<LearningResponseV2> {
    const gate = await this.getLegacyGate()
    return gate.present(request)
  }




  /** @deprecated V1 is accepted only for static legacy replay/fallback. */
  async present(request: PresentLearningActivityRequest): Promise<LearningResponseV1> {
    const { parseLearningActivity } = await import('./legacy-protocol.ts')
    const activity = parseLearningActivity(request.activity)
    return fallback(randomUUID(), activity, 'legacy-replay-only')
  }
}

export default LearningActivityBroker
