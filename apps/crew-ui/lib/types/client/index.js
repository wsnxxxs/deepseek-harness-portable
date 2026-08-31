/**
 * Browser entry for Mission Control.
 *
 * The switch mechanism is the one every surface in this distribution shares:
 * DSH's shell renders exactly one ctx-level slot, `root`, and a registration at
 * a lower priority shadows the one already there. Mission Control claims
 * `-2000`, below the workbench's `-1000`, and registers only while the shared
 * `ctx.uiMode` service says it is selected.
 *
 * Priority does not decide WHICH surface shows — the mode does, and each
 * surface registers only for its own mode — so the numbers matter solely in the
 * instant one registration replaces another.
 *
 * The Team Remote namespace is mounted here rather than assumed: the service is
 * a host-plane row, so the descriptor has to be contributed by whichever client
 * wants to call it. Mounting fails closed — the plugin does not register the
 * surface — which leaves the official AppFrame rendering rather than a frameless
 * page.
 * @module @dsh-portable/crew-ui/client
 */
import { createElement } from 'react';
import agentTeamsRemote from '@deepseek-ai/dsh-experimental-agent-team/remote';
import { CREW_NS, en, zh } from "./locales.js";
import { CrewRuntimeProvider } from "./state/runtime.js";
import { MissionControl } from "./shell/MissionControl.js";
export { MissionControl } from "./shell/MissionControl.js";
export { foldThread } from "./state/thread.js";
export { BOARD_COLUMNS, blockerLabels, failureText, groupTasks, leadSessionId, transportText } from "./state/board.js";
export { CREW_PRESET, stageAction } from "./state/mission-preset.js";
export { CREW_NS } from "./locales.js";
/** Stable Cordis plugin name. */
export const name = 'crew-ui-client';
/**
 * Services Mission Control cannot render without.
 *
 * Every generated Remote namespace it reads is declared individually: cordis
 * refuses `ctx.remote.<ns>` from a context that did not inject that namespace,
 * and the failure is a runtime throw inside whichever panel touches it rather
 * than a compile error.
 *
 * `uiMode` is what gates the surface; without it there is no way to know
 * whether this surface is the selected one, so it is a hard requirement rather
 * than a probed optional.
 */
export const inject = [
    'slots', 'locale', 'uiMode', 'sessions', 'workspaces', 'conversation', 'uiConversation',
    'uiSession', 'connection',
    'remote',
    'remote.agentTeams',
    'remote.agentPresets',
];
/**
 * Shadow priority of Mission Control's `root` registration.
 *
 * Lowest renders. The official AppFrame sits at 0 and the workbench at -1000;
 * the gap below leaves room for a further surface without renumbering either.
 */
const ROOT_PRIORITY = -2000;
/**
 * Build the Host-service view the React tree reads.
 * @param ctx - client root context, already injected.
 * @returns the runtime.
 */
function createCrewRuntime(ctx) {
    const t = ctx.locale.bind(CREW_NS);
    const uiModeT = ctx.locale.bind('uiMode');
    const uiWorkspace = ctx.get('uiWorkspace');
    const uiConversation = ctx.uiConversation;
    return {
        sessions: ctx.sessions,
        workspaces: ctx.workspaces,
        navigation: uiWorkspace,
        teams: {
            view: lead => ctx.remote.agentTeams.view(lead),
            createTask: (lead, request) => ctx.remote.agentTeams.createTask(lead, request),
            updateTask: (lead, request) => ctx.remote.agentTeams.updateTask(lead, request),
        },
        presets: {
            select: (sessionId, preset) => ctx.remote.agentPresets.select(sessionId, preset),
        },
        mode: ctx.uiMode,
        t,
        uiModeT,
        input: (sessionId) => {
            // A session that has no agent scope yet is starting; there is nothing to
            // type into until it does, and the composer renders nothing rather than
            // holding a draft the Host cannot receive.
            const scope = ctx.sessions.scope(sessionId);
            if (scope === undefined)
                return undefined;
            return ctx.conversation?.input.for(scope);
        },
        dossier: async (endpoint, payload) => {
            const connection = ctx.get('connection');
            // A trimmed assembly without the channel leaves the panel showing its
            // own message rather than throwing inside a render.
            if (connection === undefined) {
                return {
                    ok: false,
                    error: { code: 'no-connection', message: 'the dossier channel is not available', details: {} },
                };
            }
            try {
                return await connection.rpc.call('/crew-dossier', endpoint, payload);
            }
            catch (error) {
                // A Connection call REJECTS on transport failure — a dropped Host
                // connection, a non-2xx response, a malformed envelope — rather than
                // resolving `ok: false`. Absorbing it here means every consumer of
                // this face reads one envelope and no panel has to carry a catch of
                // its own, which is what stops a lost connection from leaving a panel
                // spinning on an unhandled rejection.
                return {
                    ok: false,
                    error: {
                        code: 'transport-failed',
                        message: error instanceof Error ? error.message : String(error),
                        details: { endpoint },
                    },
                };
            }
        },
        chatFeed: (sessionId) => {
            const binding = ctx.sessions.binding(sessionId);
            if (binding === undefined || uiConversation === undefined)
                return undefined;
            return uiConversation.binding(binding)?.target('chat');
        },
        ctx,
    };
}
/**
 * Register the surface, and re-register it whenever the mode changes.
 * @param ctx - client root context.
 * @returns a disposer removing any active registration and the subscription.
 */
function bindRootRegistration(ctx) {
    const runtime = createCrewRuntime(ctx);
    // One element tree, created once: a mode flip mounts and unmounts it.
    const render = () => createElement(CrewRuntimeProvider, { value: runtime }, createElement(MissionControl));
    let active;
    const apply = () => {
        const wanted = ctx.uiMode.get() === 'crew';
        if (wanted === (active !== undefined))
            return;
        if (!wanted) {
            active?.();
            active = undefined;
            return;
        }
        // `slots.inject` rather than a bare register: the built-in `root`
        // declaration is already committed, so the callback runs synchronously, and
        // a renderer epoch change re-runs it instead of dropping the contribution.
        active = ctx.slots.inject('root', () => ctx.slots.register({
            name: 'root',
            priority: ROOT_PRIORITY,
            locale: CREW_NS,
        }, render));
    };
    apply();
    const unsubscribe = ctx.uiMode.subscribe(apply);
    return () => {
        unsubscribe();
        active?.();
        active = undefined;
    };
}
/**
 * Client plugin body.
 *
 * Mounting the Team Remote contribution is awaited before the surface is
 * registered, so the board never renders against a namespace that is not there.
 * @param ctx - client root context.
 * @returns a disposer for the Remote mount and the surface registration.
 */
export async function apply(ctx) {
    const disposeRemote = await ctx.remote.$mount(agentTeamsRemote);
    ctx.effect(() => ctx.locale.register(CREW_NS, { zh, en }), 'crew-ui: dictionaries');
    // Reaching this line is the evidence that this build can render Mission
    // Control: the Team Remote contribution mounted, and the plugin body ran at
    // all. A build whose Host disabled the Team runtime does not mount this
    // client row, so nothing announces `crew` and every switch shows it as
    // unavailable instead of offering a choice that lands on the official UI.
    ctx.effect(() => ctx.uiMode.announce('crew'), 'crew-ui: surface announcement');
    const disposeSurface = bindRootRegistration(ctx);
    return async () => {
        disposeSurface();
        await disposeRemote();
    };
}
//# sourceMappingURL=index.js.map