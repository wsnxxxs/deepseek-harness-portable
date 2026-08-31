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
import type { SessionListState, SessionSnapshot, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client';
import type { WorkspaceId, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client';
import type { InputState, SessionInput } from '@deepseek-ai/dsh-client-ui-conversation/client';
import { type DcodePendingApproval, type DcodePendingInteraction, type Observable } from './runtime.ts';
/**
 * Subscribe to one DSH observable.
 * @param source - the observable, or undefined while none is resolvable.
 * @param fallback - snapshot used while the source is absent.
 * @returns the current snapshot.
 */
export declare function useObservable<T>(source: Observable<T> | undefined, fallback: T): T;
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
export declare function useObservableSelector<T, S>(source: Observable<T> | undefined, fallback: T, select: (snapshot: T) => S): S;
/** The shared Conversation input machine plus its current draft state. */
export declare function useSessionInput(sessionId: SessionId | undefined): {
    input: SessionInput | undefined;
    state: InputState;
};
/** The Session Controller's list and current selection. */
export declare function useSessionList(): SessionListState;
/** The id of the selected session, or undefined in the no-session state. */
export declare function useCurrentSessionId(): SessionId | undefined;
/** The current session's pending ask-user-question or plan-review request. */
export declare function usePendingQuestion(sessionId: SessionId | undefined): DcodePendingInteraction | undefined;
/** The current session's pending host permission request. */
export declare function usePendingApproval(sessionId: SessionId | undefined): DcodePendingApproval | undefined;
/** The durable workspace registry. */
export declare function useWorkspaces(): WorkspaceSnapshot;
/**
 * One session's lifecycle snapshot.
 * @param sessionId - session to observe; undefined yields undefined.
 */
export declare function useSessionSnapshot(sessionId: SessionId | undefined): SessionSnapshot | undefined;
/**
 * One session's assembled Chat transcript.
 * @param sessionId - session to observe; undefined yields undefined.
 */
export declare function useChatSnapshot(sessionId: SessionId | undefined): ChatSnapshot | undefined;
/**
 * One session's assembled DSH Trajectory ledger.
 *
 * This is the same target consumed by the official Trajectory view. DCode only
 * selects a compact subset for its summary and leaves the full records to the
 * existing details and diff surfaces.
 * @param sessionId - session to observe.
 */
export declare function useTrajectorySnapshot(sessionId: SessionId | undefined): TrajectorySnapshot | undefined;
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
export declare function useConversationBlank(sessionId: SessionId | undefined): boolean;
/**
 * One host-computed projection of a session (`goal`, `plan`, `permissions`,
 * `modelSelection`, …). The projection face is identity-stable per key, so a
 * capability the Host does not publish simply reads `undefined` forever
 * rather than throwing.
 * @param sessionId - session to observe.
 * @param key - projection key.
 */
export declare function useProjectionValue<T>(sessionId: SessionId | undefined, key: string): T | undefined;
/** Sessions grouped under the workspace that accounts for them, in registry order. */
export interface WorkspaceGroup {
    readonly workspaceId: WorkspaceId;
    readonly title: string;
    readonly path: string;
    readonly sessions: readonly SessionSummary[];
}
/**
 * Group the session list by workspace for the left rail.
 *
 * Blank sessions are hidden unless they are the current selection — the same
 * rule the official sidebar applies, so switching surfaces does not change
 * which rows exist.
 */
export declare function useWorkspaceGroups(): {
    groups: readonly WorkspaceGroup[];
    ungrouped: readonly SessionSummary[];
};
/**
 * Run an async read whenever its inputs change, with the in-flight answer of a
 * superseded run discarded.
 * @param load - the read; receives an abort signal.
 * @param deps - dependency list, as for `useEffect`.
 * @returns the latest value, a loading flag, a failure message, and a manual reload.
 */
export declare function useAsync<T>(load: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]): {
    value: T | undefined;
    loading: boolean;
    error: string | undefined;
    reload: () => void;
};
//# sourceMappingURL=hooks.d.ts.map