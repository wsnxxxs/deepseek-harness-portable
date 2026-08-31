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
import type { TrajectorySnapshot } from '@deepseek-ai/dsh-client-ui-trajectory/client';
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client';
import type { SessionPendingInteractionBase } from '@deepseek-ai/dsh-client-ui-session/client';
import type { ComposerAttachment, ConversationController, DraftAttachmentId, SessionInput } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import type { AskUserQuestionAnswer, AskUserQuestionItem } from '@deepseek-ai/dsh-user-questions';
import type { SessionLogDownloadState } from '@deepseek-ai/dsh-session-log-export/client';
import type { SettingsDescribeFace, SettingsSchemaService } from '@deepseek-ai/dsh-client-ui-settings/client';
import { type UiModeController, type UiModeKey } from '@dsh-portable/ui-mode/client';
import { type DcodeApi } from '../rpc.ts';
import { type AppearanceStore, type ThemeFace } from '../theme.ts';
import type { MessageFeedbackProvider } from '../chat/message-feedback.ts';
export type { SessionListState, SessionSummary, WorkspaceSnapshot };
export type { SessionLogDownloadState };
/** Stable empty Chat value used while the Conversation target is starting. */
export declare const EMPTY_CHAT_SNAPSHOT: ChatSnapshot;
/** Stable empty value used before the optional Trajectory target is available. */
export declare const EMPTY_TRAJECTORY_SNAPSHOT: TrajectorySnapshot;
/** The structured answer carried by the Host's ask-user-question protocol. */
export type DcodeQuestionAnswer = AskUserQuestionAnswer;
/** One question item exposed by a pending user interaction. */
export type DcodeQuestionItem = AskUserQuestionItem;
/** The small domain face the dcode composer needs from a pending question. */
export interface DcodePendingInteraction extends SessionPendingInteractionBase {
    readonly questions: readonly DcodeQuestionItem[];
    answer(answer: DcodeQuestionAnswer): Promise<void>;
    cancel(): Promise<void>;
}
/** Goal mutation verbs exposed by the generated goals Remote namespace. */
export interface DcodeGoalsRemote {
    edit(sessionId: SessionId, ref: {
        readonly id: string;
        readonly revision: number;
    }, payload: {
        readonly objective: string;
    }): Promise<{
        ok: boolean;
        error?: {
            message: string;
        };
    }>;
    pause(sessionId: SessionId, ref: {
        readonly id: string;
        readonly revision: number;
    }): Promise<{
        ok: boolean;
        error?: {
            message: string;
        };
    }>;
    resume(sessionId: SessionId, ref: {
        readonly id: string;
        readonly revision: number;
    }): Promise<{
        ok: boolean;
        error?: {
            message: string;
        };
    }>;
    clear(sessionId: SessionId, ref: {
        readonly id: string;
        readonly revision: number;
    }): Promise<{
        ok: boolean;
        error?: {
            message: string;
        };
    }>;
}
/** The small domain face the dcode composer needs from a pending approval. */
export interface DcodePendingApproval extends SessionPendingInteractionBase {
    readonly kind: 'approval';
    readonly key: string;
    readonly toolName: string;
    readonly callId?: string;
    readonly reason?: string;
    answer(outcome: 'allowed-once' | 'rejected'): Promise<void>;
}
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
/** Existing DSH Session-log exporter exposed to the workbench chrome. */
export interface SessionLogDownloadFace {
    readonly store: Observable<SessionLogDownloadState>;
    download(sessionId: SessionId): Promise<void>;
}
/** Official settings services shared by DCode and the registered DSH pages. */
export interface DcodeSettingsServices {
    /** Namespace scopes own writes and expose the shared settings snapshot. */
    readonly scope: SettingsScopeBinderFace | undefined;
    /** Schema operations used by official settings controllers and editors. */
    readonly schema: SettingsSchemaService | undefined;
    /** Shared describe mirror; all settings readers refresh through this face. */
    readonly describe: SettingsDescribeFace | undefined;
}
/** Attachment intake and input state exposed to the DCode composer. */
export interface DcodeConversationFace {
    readonly input: ConversationController['input'];
    createDraftAttachments(files: readonly File[]): readonly ComposerAttachment[];
    draftAttachmentsFor(ids: readonly DraftAttachmentId[]): readonly ComposerAttachment[];
    releaseDraftImage(id: DraftAttachmentId): void;
}
/** Session-authorized durable media helpers used by the transcript. */
export interface ConversationMediaFace {
    imageUrl(sessionId: SessionId, attachment: ImageAttachmentRef): Promise<string>;
    peekImageUrl(sessionId: SessionId, attachment: ImageAttachmentRef): string | undefined;
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
    /** Official feedback slot face resolved per Session. */
    readonly messageFeedback: MessageFeedbackProvider | undefined;
    /** Official settings scope/schema/mirror services used by settings sections. */
    readonly settings: DcodeSettingsServices;
    /** Shared Conversation service: draft attachments and the per-session input machine. */
    readonly conversation: ConversationController | undefined;
    /** Resolve the Conversation input machine for one session. */
    input(sessionId: SessionId): SessionInput | undefined;
    /** Session-authorized image/file display helpers from the Conversation assembly. */
    readonly media: ConversationMediaFace | undefined;
    /** Theme service, when `ui-theme` is part of this assembly. */
    readonly theme: ThemeFace | undefined;
    /** Resolved colour scheme, the theme preference, and the window backdrop. */
    readonly appearance: AppearanceStore;
    /** Official `ui-conversation.busyEnter` preference. */
    readonly busyEnter: BusyEnterStore;
    /** Shared DSH locale registry and preference. */
    readonly locale: LocaleStore;
    /** Session-scoped pending interactions, when the UI session adapter is present. */
    readonly pendingInteractions: Observable<ReadonlyMap<SessionId, SessionPendingInteractionBase>> | undefined;
    /** Generated goals Remote namespace (edit/pause/resume/clear), when mounted. */
    readonly goals: DcodeGoalsRemote | undefined;
    /** Session-log export controller, when the export client plugin is present. */
    readonly sessionLogDownload: SessionLogDownloadFace | undefined;
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
    /**
     * The interface switch's own bound translate function, for the same reason
     * as {@link learningT}: the roster of surfaces and their names belong to
     * `@dsh-portable/ui-mode`, so every switch renders one set of words rather
     * than each surface translating the other surfaces' names itself.
     */
    readonly uiModeT: (key: UiModeKey) => string;
    /** The active-mode store shared with every switch entry point. */
    readonly mode: UiModeController;
    /**
     * Resolve the Chat transcript feed of one session.
     * @param sessionId - session to observe.
     * @returns an observable over the assembled Chat snapshot, or undefined when the session has no binding yet.
     */
    chatFeed(sessionId: SessionId): Observable<ChatSnapshot> | undefined;
    /**
     * Resolve the DSH Trajectory feed for one session.
     * @param sessionId - session to observe.
     * @returns an observable over the real trace ledger, or undefined when the
     *          session has no binding yet.
     */
    trajectoryFeed(sessionId: SessionId): Observable<TrajectorySnapshot> | undefined;
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
interface SettingsScopeFace<T> {
    getSnapshot(): {
        readonly value: T | undefined;
        readonly writable: boolean;
    };
    subscribe(listener: () => void): () => void;
    set(field: string, value: unknown): Promise<void>;
}
interface SettingsScopeBinderFace {
    bind<T>(spec: {
        namespace: string;
    }): SettingsScopeFace<T>;
    describe?(): SettingsDescribeFace;
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
export declare function createDcodeRuntime(ctx: ClientContext, mode: UiModeController): DcodeRuntime;
/** Provider for the runtime; mounted once at the workbench root. */
export declare const DcodeRuntimeProvider: import("react").Provider<DcodeRuntime | undefined>;
/**
 * Read the runtime.
 * @returns the runtime supplied by the workbench root.
 * @throws when a component renders outside the workbench tree.
 */
export declare function useRuntime(): DcodeRuntime;
//# sourceMappingURL=runtime.d.ts.map