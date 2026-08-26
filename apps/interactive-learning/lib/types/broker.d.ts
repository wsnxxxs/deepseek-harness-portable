import { Context, Service } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type LearningVisualStatusV4, type LearningRecallFeedbackV1, type LearningCheckpointResultV1, type LearningCheckpointV1, type LearningActivityV2, type LearningActivityV1, type LearningQuestionV2, type LearningRevealV2, type LearningResponseV2, type LearningResponseV1 } from './protocol-current.ts';
import { type LearnerState, type LearnerStateCorrection, type LearnerStateEvent, type LearningSegmentAnchorEvent, type ObservableLearnerEvent, type LearningCheckpointAggregate } from './learner-state.ts';
export declare const INTERACTIVE_LEARNING_PACKAGE = "@dsh-portable/interactive-learning";
export declare const DEFAULT_LEARNING_WAIT_TIMEOUT_MS: number;
export declare const DEFAULT_LEARNING_CHECKPOINT_TIMEOUT_MS: number;
declare module '@deepseek-ai/cordis' {
    interface Context {
        learningActivities: LearningActivityBroker;
    }
}
export interface PresentLearningActivityRequest {
    activity: LearningActivityV1;
    agent?: Agent;
    signal?: AbortSignal;
    /** Bounded wait for a compatible Client response. Primarily configurable by tests/embedders. */
    timeoutMs?: number;
}
export interface PresentLearningGateRequest {
    activity: LearningActivityV2;
    agent?: Agent;
    signal?: AbortSignal;
    timeoutMs?: number;
    callId?: string;
}
export interface PresentLearningCheckpointRequest {
    checkpoint: LearningCheckpointV1;
    agent?: Agent;
    signal?: AbortSignal;
    timeoutMs?: number;
    callId: string;
    /** Client-side answer-free telemetry: whether a stored draft was restored. */
    draftRecovered?: boolean;
}
export type ObservableLearnerStateUpdate = Exclude<LearnerStateEvent, {
    type: 'state_corrected';
}>;
export type LearningStateUpdateRequest = {
    action: 'update';
    agent: Agent;
    expectedRevision: number;
    event: ObservableLearnerStateUpdate;
} | {
    action: 'correct';
    agent: Agent;
    expectedRevision: number;
    correction: LearnerStateCorrection;
    observation: ObservableLearnerEvent & {
        source: 'user-correction';
    };
} | {
    action: 'reset';
    agent: Agent;
    expectedRevision: number;
};
export interface LearningStateUpdateResult {
    status: 'updated' | 'corrected' | 'reset';
    revision: number;
}
export interface LearningRecallFeedbackResult {
    status: 'recorded' | 'ignored';
    observationId?: string;
    reason?: 'session-unavailable';
}
export type LearningLifecycleEventName = 'learning.call.stream_started' | 'learning.call.args_completed' | 'learning.protocol.validated' | 'learning.wait.registered' | 'learning.ui.presented' | 'learning.answer.accepted' | 'learning.reveal.received' | 'learning.animation.started' | 'learning.animation.finished' | 'learning.continue.accepted' | 'learning.wait.resolved' | 'learning.model.next_step_started';
export interface LearningLifecycleEvent {
    name: LearningLifecycleEventName;
    at: number;
    phase: 'question' | 'reveal';
    activityId: string;
    lessonToken: string;
    roundToken: string;
    seq: number;
    callId?: string;
}
/** Host-side V2 Question/Reveal coordinator; V1 is replay-only. */
export declare class LearningActivityBroker extends Service {
    static inject: string[];
    private readonly pendingActivities;
    private legacyGate;
    private legacyGatePromise;
    private readonly checkpointCalls;
    private readonly checkpointReceipts;
    private readonly pendingCheckpointSessions;
    private readonly pendingCheckpointWaits;
    /** Current Host agent for the session-scoped Client recall bridge. */
    private readonly activeAgents;
    private readonly learnerStates;
    private readonly observers;
    private disposed;
    constructor(ctx: Context);
    /** Diagnostics/test seam; no activity payloads or learner answers are exposed. */
    get pendingCount(): number;
    /** Diagnostics/test seam; state content remains private to its session. */
    get learnerStateCacheSize(): number;
    /** Diagnostics/test seam; counts only, never checkpoint or learner content. */
    get checkpointCacheSize(): number;
    /** Whether this composition can render Learning visuals and checkpoints. */
    get richClientAvailable(): boolean;
    /** Fold the latest durable full snapshot for this exact live session. */
    learnerState(agent: Agent): LearnerState;
    /** Render only the bounded, model-facing projection of the current state. */
    learnerStateTranscript(agent: Agent, maxTokens?: number): string;
    /** Read the answer-free checkpoint aggregate for one session. */
    checkpointMetrics(agent: Agent): LearningCheckpointAggregate;
    /**
     * Host-side route hook. The caller writes the already-classified active or
     * closed boundary as a session-local, identity-free anchor, so refresh can
     * restore the route without relying on a model-written `goal`.
     */
    recordLearningSegmentAnchor(agent: Agent, turn?: number, segment?: LearningSegmentAnchorEvent['segment']): void;
    /**
     * Whether the latest host route anchor still denotes an active learning
     * segment. An anchor survives a refresh, but it is retired once the learner
     * has moved more than one real user turn past it without another learn
     * anchor. The one-turn allowance covers the user message currently being
     * claimed by the loop; injected context never advances this sequence.
     */
    learningSegmentActive(agent: Agent): boolean;
    /** CAS mutation used exclusively by the internal, immediate state tool.
     * Exact replays and a small set of additive observations may rebase once;
     * replacement, correction, and reset operations remain strict CAS writes.
     */
    updateLearnerState(request: LearningStateUpdateRequest): LearningStateUpdateResult;
    /** Subscribe to answer-free lifecycle metadata. */
    observe(listener: (event: LearningLifecycleEvent) => void): () => void;
    /** Answer-free ingress for stream/UI/kernel instrumentation outside this service. */
    reportLifecycle(event: Omit<LearningLifecycleEvent, 'at'>): void;
    private emit;
    /** Whether this Web composition advertises the matching Client bundle. */
    private hasRichClient;
    /** Load the retired Question/Reveal coordinator only when its API is used. */
    private getLegacyGate;
    private dropLearnerState;
    private abortPendingCheckpointSession;
    private appendLearnerState;
    private recordCheckpointMetrics;
    private recordAutomaticEvents;
    /**
     * Record the concrete assistant move without adding another user wait.
     *
     * A composition with no Learning Client renders nothing, so the move never
     * happened: claiming it would both mislead the next teaching step and write
     * a false observation into the session's pedagogical state.
     *
     * @returns whether the learner can actually see this visual.
     */
    recordVisual(agent: Agent | undefined, callId: string): LearningVisualStatusV4;
    /**
     * Record an explicit RecallDeck self-rating as low-confidence, unknown
     * evidence. A self-rating is useful review intent, but it is not proof of
     * correctness, independence, or transfer mastery.
     */
    recordRecallFeedback(feedback: LearningRecallFeedbackV1): LearningRecallFeedbackResult;
    private persistRecallReview;
    private recordCheckpointOutcome;
    /** Optional V4.1 path: one answer-free checkpoint, independent of V2 lessons. */
    presentCheckpoint(request: PresentLearningCheckpointRequest): Promise<LearningCheckpointResultV1>;
    private presentCheckpointOnce;
    private waitForCheckpoint;
    private acceptCheckpointReceipt;
    presentQuestion(request: Omit<PresentLearningGateRequest, 'activity'> & {
        activity: LearningQuestionV2;
    }): Promise<LearningResponseV2>;
    presentReveal(request: Omit<PresentLearningGateRequest, 'activity'> & {
        activity: LearningRevealV2;
    }): Promise<LearningResponseV2>;
    /** V2 live path: one call owns exactly one durable Question or Reveal wait. */
    presentGate(request: PresentLearningGateRequest): Promise<LearningResponseV2>;
    /** @deprecated V1 is accepted only for static legacy replay/fallback. */
    present(request: PresentLearningActivityRequest): Promise<LearningResponseV1>;
}
export default LearningActivityBroker;
//# sourceMappingURL=broker.d.ts.map