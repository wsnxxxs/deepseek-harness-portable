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
import { createContext, useContext } from 'react';
import { createLearningCall, createDcodeApi } from "../rpc.js";
import { createAppearanceStore } from "../theme.js";
const EMPTY_LIST = [];
/** Stable empty Chat value used while the Conversation target is starting. */
export const EMPTY_CHAT_SNAPSHOT = {
    order: EMPTY_LIST,
    nodes: { get: () => undefined, values: () => EMPTY_LIST },
    locations: { getTurn: () => EMPTY_LIST, getStep: () => EMPTY_LIST },
    navigation: { items: () => EMPTY_LIST },
    timeline: { turnOrder: EMPTY_LIST, turns: new Map() },
    legacy: {
        nodes: EMPTY_LIST,
        turnTimings: new Map(),
        turnEnds: new Map(),
        partial: null,
        runningCalls: EMPTY_LIST,
    },
};
/** Stable empty value used before the optional Trajectory target is available. */
export const EMPTY_TRAJECTORY_SNAPSHOT = {
    eventNodes: [],
    eventLocations: new Map(),
    requests: [],
    callSchemas: new Map(),
    partial: null,
    runningCalls: [],
};
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
export function createDcodeRuntime(ctx, mode) {
    const sessions = ctx.get('sessions');
    const workspaces = ctx.get('workspaces');
    const uiConversation = ctx.get('uiConversation');
    const conversation = ctx.get('conversation');
    const carrier = ctx.get('connection');
    const navigation = ctx.get('uiWorkspace');
    const theme = ctx.get('theme');
    const locale = ctx.get('locale');
    const uiSession = ctx.get('uiSession');
    const settingsScope = ctx.get('settingsScope');
    const settingsSchema = ctx.get('settingsSchema');
    const sessionLogDownload = ctx.get('sessionLogDownload');
    const conversationSettings = settingsScope?.bind({ namespace: 'ui-conversation' });
    const fallbackLocale = { active: 'en', locales: [], revision: 0 };
    // One cache per session id: the Chat target face is identity-stable for a
    // binding, and `useSyncExternalStore` needs a stable subscribe reference.
    const feeds = new Map();
    const trajectoryFeeds = new Map();
    return {
        sessions,
        workspaces,
        navigation,
        remote: ctx.remote,
        settings: {
            scope: settingsScope,
            schema: settingsSchema,
            describe: settingsScope?.describe?.(),
        },
        conversation,
        input: sessionId => {
            const actx = sessions.scope(sessionId);
            if (actx === undefined || conversation === undefined)
                return undefined;
            return conversation.input.for(actx);
        },
        media: uiConversation === undefined
            ? undefined
            : {
                imageUrl: (sessionId, attachment) => uiConversation.imageUrl(sessionId, attachment),
                peekImageUrl: (sessionId, attachment) => uiConversation.peekImageUrl(sessionId, attachment),
                downloadFile: (sessionId, attachment) => uiConversation.downloadFile(sessionId, attachment),
            },
        theme,
        appearance: createAppearanceStore(ctx, theme),
        busyEnter: {
            getSnapshot: () => conversationSettings?.getSnapshot().value?.busyEnter === 'steer' ? 'steer' : 'queue',
            subscribe: listener => conversationSettings?.subscribe(listener) ?? (() => { }),
            get writable() { return conversationSettings?.getSnapshot().writable ?? false; },
            set: value => { void conversationSettings?.set('busyEnter', value); },
        },
        locale: {
            getSnapshot: () => locale?.getSnapshot() ?? fallbackLocale,
            subscribe: listener => locale?.subscribe(listener) ?? (() => { }),
            set: id => { locale?.setLocale(id); },
        },
        pendingInteractions: uiSession?.pendingInteractions,
        sessionLogDownload,
        git: createDcodeApi(carrier),
        learningCall: createLearningCall(carrier),
        // The pack registers this namespace itself; an assembly without it falls
        // back to the raw key, which is still readable and never throws.
        learningT: locale?.bind('interactive-learning') ?? (key => key),
        mode,
        binding: sessionId => sessions.binding(sessionId),
        scope: sessionId => sessions.scope(sessionId),
        chatFeed: (sessionId) => {
            const cached = feeds.get(sessionId);
            if (cached !== undefined)
                return cached;
            if (uiConversation === undefined)
                return undefined;
            const binding = sessions.binding(sessionId);
            if (binding === undefined)
                return undefined;
            const target = uiConversation.binding(binding).target('chat');
            const feed = {
                getSnapshot: () => target.getSnapshot() ?? EMPTY_CHAT_SNAPSHOT,
                subscribe: listener => target.subscribe(listener),
            };
            feeds.set(sessionId, feed);
            return feed;
        },
        trajectoryFeed: (sessionId) => {
            const cached = trajectoryFeeds.get(sessionId);
            if (cached !== undefined)
                return cached;
            if (uiConversation === undefined)
                return undefined;
            const binding = sessions.binding(sessionId);
            if (binding === undefined)
                return undefined;
            const target = uiConversation.binding(binding).target('trajectory');
            const feed = {
                getSnapshot: () => target.getSnapshot() ?? EMPTY_TRAJECTORY_SNAPSHOT,
                subscribe: listener => target.subscribe(listener),
            };
            trajectoryFeeds.set(sessionId, feed);
            return feed;
        },
    };
}
const RuntimeContext = createContext(undefined);
/** Provider for the runtime; mounted once at the workbench root. */
export const DcodeRuntimeProvider = RuntimeContext.Provider;
/**
 * Read the runtime.
 * @returns the runtime supplied by the workbench root.
 * @throws when a component renders outside the workbench tree.
 */
export function useRuntime() {
    const runtime = useContext(RuntimeContext);
    if (runtime === undefined)
        throw new Error('dcode-ui: component rendered outside the workbench runtime provider');
    return runtime;
}
//# sourceMappingURL=runtime.js.map