/**
 * What the panel is given, and how it reads it.
 *
 * The panel is mounted inside React trees this package does not own — the
 * official conversation header today, a third-party workbench tomorrow — so it
 * cannot reach for a cordis context, a host surface's runtime provider, or any
 * other ambient value. Everything it needs arrives through one React context
 * that this package fills in at plugin-apply time and closes over the Team
 * Remote, the Session Controller and the bound translate function.
 *
 * That is the whole reason the panel is portable: a host surface renders
 * `<Panel sessionId=… />` and owes it nothing else.
 * @module @dsh-portable/cluster-ui/client/deps
 */
import type { CreateTeamTaskRequest, TeamMemberView, TeamTaskMutationResult, TeamView, UpdateTeamTaskRequest } from '@deepseek-ai/dsh-experimental-agent-team/client';
import type { RemoteResult } from '@deepseek-ai/dsh-api-remotes/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { type ClusterKey, type Translate } from './locales.ts';
/**
 * The Team surface the panel drives, already addressed by lead session.
 *
 * Each method takes the session the operator is looking at; resolving that to
 * the session that owns the Team is this face's job, not the panel's.
 */
export interface ClusterActions {
    /** Read the roster and shared task board. */
    view(sessionId: SessionId): Promise<RemoteResult<TeamView>>;
    /** Add one task to the shared board. */
    createTask(sessionId: SessionId, request: CreateTeamTaskRequest): Promise<RemoteResult<TeamTaskMutationResult>>;
    /** Apply one compare-and-set task mutation. */
    updateTask(sessionId: SessionId, request: UpdateTeamTaskRequest): Promise<RemoteResult<TeamTaskMutationResult>>;
    /** Open a teammate's own conversation in the host surface. */
    openMember(sessionId: SessionId, member: TeamMemberView): Promise<void>;
}
/** Everything the panel reads from outside itself. */
export interface ClusterDeps {
    readonly actions: ClusterActions;
    readonly t: Translate;
}
/** Provider for the panel's dependencies; mounted by the exported Panel. */
export declare const ClusterDepsProvider: import("react").Provider<ClusterDeps | undefined>;
/**
 * Read the panel's dependencies.
 * @returns the provided dependencies.
 * @throws when a component renders outside {@link ClusterDepsProvider}.
 */
export declare function useDeps(): ClusterDeps;
/** The bound translate function. */
export declare function useT(): Translate;
/**
 * Adapt the host locale runtime's bound translate to this package's signature.
 *
 * The host resolves the key against the registered dictionaries but does not
 * substitute `{name}` placeholders, and a miss returns the key itself. Both
 * are handled here so no component ever renders a raw key or a raw brace.
 * @param translate - `ctx.locale.bind(CLUSTER_NS)`.
 * @returns the translate handed to {@link ClusterDepsProvider}.
 */
export declare function bindTranslate(translate: (key: ClusterKey, params?: Record<string, unknown>) => string): Translate;
/**
 * Run an async read whenever its inputs change, discarding a superseded run.
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
//# sourceMappingURL=deps.d.ts.map