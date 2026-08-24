export type LearningUiLifecycleName = 'learning.call.stream_started' | 'learning.call.args_completed' | 'learning.ui.presented' | 'learning.animation.started' | 'learning.animation.finished' | 'learning.continue.accepted'
/** Explicit retrieval-practice interaction; bridged to Host by client/index. */
 | 'learning.recall.rated';
export type LearningRecallUiStatus = 'revealed' | 'mastered' | 'review';
export interface LearningUiLifecycleEvent {
    name: LearningUiLifecycleName;
    at: number;
    phase?: 'question' | 'reveal';
    seq?: number;
    storageKey?: string;
    callId?: string;
    sessionId?: string;
    cardId?: string;
    status?: LearningRecallUiStatus;
}
type Listener = (event: LearningUiLifecycleEvent) => void;
export declare function subscribeLearningUiLifecycle(listener: Listener): () => void;
export declare function emitLearningUiLifecycle(event: Omit<LearningUiLifecycleEvent, 'at'>): void;
export declare function emitLearningCallLifecycle(name: 'learning.call.stream_started' | 'learning.call.args_completed', projection: Pick<LearningUiLifecycleEvent, 'callId' | 'phase' | 'seq'>): void;
export {};
//# sourceMappingURL=lifecycle.d.ts.map