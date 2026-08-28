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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { AgentContext, ISessions, SessionBinding, SessionListState, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client';
import type { IWorkspaces, WorkspaceSnapshot } from '@deepseek-ai/dsh-api-workspace-controller/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
import type { UiModeStore } from '../mode.ts';
import { type DcodeApi } from '../rpc.ts';
import { type AppearanceStore, type ThemeFace } from '../theme.ts';
export type { SessionListState, SessionSummary, WorkspaceSnapshot };
/** The minimal observable shape every DSH client store exposes. */
export interface Observable<T> {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
}
/** Official Composer behavior for plain Enter while a turn is running. */
export type BusyEnterBehavior = 'queue' | 'steer';
/** Durable conversation preference exposed as one small observable face. */
export interface BusyEnterStore extends Observable<BusyEnterBehavior> {
    readonly writable: boolean;
    set(value: BusyEnterBehavior): void;
}
/** Locale catalog used by the General settings language row. */
export interface LocaleSnapshot {
    readonly active: string;
    readonly locales: readonly {
        readonly id: string;
        readonly label: string;
    }[];
    readonly revision: number;
}
/** Active locale plus the existing runtime write entry. */
export interface LocaleStore extends Observable<LocaleSnapshot> {
    set(id: string): void;
}
/** The navigation face of `ctx.uiWorkspace`, used for New Task and Open Workspace. */
export interface WorkspaceNavigation {
    startSession(workspaceId?: string): void;
    connectWorkspace(workspaceId: string): Promise<SessionId>;
    /** The host's native chooser; rejects on a surface that has none. */
    pickDirectory(): Promise<string | null>;
    /** One browse level, the fallback every surface can serve. */
    listDirectory(path?: string, signal?: AbortSignal): Promise<unknown>;
    createDirectory(path: string, name: string): Promise<string>;
    archiveSession(sessionId: SessionId): Promise<void>;
}
/** Everything the workbench needs from the assembled DSH client. */
export interface DcodeRuntime {
    /** Session Controller: list, selection, lifecycle, per-session faces. */
    readonly sessions: ISessions;
    /** Workspace Controller: the durable workspace registry. */
    readonly workspaces: IWorkspaces;
    /** Workspace navigation (New Session, native directory picker). */
    readonly navigation: WorkspaceNavigation | undefined;
    /** Generated Host Remote namespaces (settings, models, skills, commands, plugins, subagents). */
    readonly remote: ClientRemote;
    /** Theme service, when `ui-theme` is part of this assembly. */
    readonly theme: ThemeFace | undefined;
    /** Resolved colour scheme, the theme preference, and the window backdrop. */
    readonly appearance: AppearanceStore;
    /** Official `ui-conversation.busyEnter` preference. */
    readonly busyEnter: BusyEnterStore;
    /** Shared DSH locale registry and preference. */
    readonly locale: LocaleStore;
    /** Git, diff, undo and file reads over the `/dcode` channel. */
    readonly git: DcodeApi;
    /** The Interactive Learning channel caller, shared with the official UI's learning views. */
    readonly learningCall: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>;
    /**
     * The learning pack's own bound translate function. Its surfaces carry their
     * own dictionary; reusing it keeps one copy of the learning vocabulary
     * instead of a second translation of the same words.
     */
    readonly learningT: (key: string, params?: Record<string, unknown>) => string;
    /** The active-mode store shared with every switch entry point. */
    readonly mode: UiModeStore;
    /**
     * Resolve the Chat transcript feed of one session.
     * @param sessionId - session to observe.
     * @returns an observable over the assembled Chat snapshot, or undefined when the session has no binding yet.
     */
    chatFeed(sessionId: SessionId): Observable<ChatSnapshot> | undefined;
    /**
     * Resolve a session's binding.
     * @param sessionId - session to resolve.
     */
    binding(sessionId: SessionId): SessionBinding | undefined;
    /**
     * Resolve an Agent-scoped context, the address `ctx.conversation` verbs use.
     * @param sessionId - session to scope to.
     */
    scope(sessionId: SessionId): AgentContext | undefined;
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
export declare function createDcodeRuntime(ctx: ClientContext, mode: UiModeStore): DcodeRuntime;
/** Provider for the runtime; mounted once at the workbench root. */
export declare const DcodeRuntimeProvider: import("react").Provider<DcodeRuntime | undefined>;
/**
 * Read the runtime.
 * @returns the runtime supplied by the workbench root.
 * @throws when a component renders outside the workbench tree.
 */
export declare function useRuntime(): DcodeRuntime;
//# sourceMappingURL=runtime.d.ts.map