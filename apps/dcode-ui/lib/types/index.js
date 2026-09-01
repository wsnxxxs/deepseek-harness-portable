/**
 * Host-side Cordis plugin entrypoint for @dsh-portable/dcode-ui.
 *
 * The package ships two halves. This one is small on purpose: the modern
 * workbench reuses DSH's own Session, Workspace, Conversation, Tool, Goal,
 * Plan, Settings, Skill, MCP and Plugin services through the existing client
 * APIs, so the only host surface it needs is the version-control capability
 * DSH does not own. That surface is the `/dcode` Connection RPC channel —
 * working-tree status, per-file diffs, a commit path, per-turn undo, and
 * bounded file reads.
 *
 * The browser half lives at `./client` and is loaded by the client module
 * system through this package's `dsh.client` declaration.
 * @module @dsh-portable/dcode-ui
 */
import z from '@deepseek-ai/schemastery';
import { DCODE_CHANNEL, handleDcodeEndpoint, isDcodeEndpoint } from "./host/rpc.js";
import { defaultDcodeMemoryRoot, DcodeMemoryStore, } from "./host/memory.js";
export { DCODE_CHANNEL, DCODE_ENDPOINTS, handleDcodeEndpoint, isDcodeEndpoint, } from "./host/rpc.js";
export { defaultDcodeMemoryRoot, DcodeMemoryStore, } from "./host/memory.js";
export { GitCommandError, containedRelativePath, parseBranchHeader, parseNumstat, parsePorcelain, readBranches, readDiff, readStatus, undoPaths, workTreeRoot, } from "./host/git.js";
// Re-exported, not owned: the vocabulary moved to `@dsh-portable/ui-mode` when
// a third surface arrived, because the Electron shell and each surface must
// agree on mode names without any of them depending on one particular front
// end. These aliases keep existing importers of this package working.
export { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam, } from '@dsh-portable/ui-mode';
/** Stable Cordis plugin name. */
export const name = 'dcode-ui';
/**
 * Connection is the only hard requirement: without the RPC carrier there is
 * no channel to claim, and the browser half degrades to a workbench without
 * Git and durable-memory tooling rather than failing to boot.
 */
export const inject = ['connection'];
export const Config = z.object({
    git: z.boolean().default(true),
});
/**
 * Claim the `/dcode` channel on a host context.
 * @param ctx - the injecting cordis context.
 * @param config - entry configuration.
 */
export function apply(ctx, config = {}) {
    const resolved = Config(config);
    if (!resolved.git)
        return;
    ctx.inject(['connection'], (connectionCtx) => {
        const connection = connectionCtx.get('connection');
        if (connection === undefined)
            return;
        const memory = new DcodeMemoryStore({
            root: defaultDcodeMemoryRoot(),
            source: () => connectionCtx.get('sessionQuery'),
        });
        connectionCtx.effect(() => {
            const disposeRpc = connection.rpc.handle(DCODE_CHANNEL, async (endpoint, payload) => {
                if (!isDcodeEndpoint(endpoint)) {
                    return {
                        ok: false,
                        error: { code: 'bad-request', message: 'unknown /dcode RPC endpoint', details: { endpoint } },
                    };
                }
                return await handleDcodeEndpoint(endpoint, payload, memory);
            }, 
            // Same authority the rest of this distribution's private channels use:
            // the surface runs local commands in the operator's own workspace and
            // must not be reachable from an untrusted origin.
            { authority: 'trusted-host' });
            const disposeEvents = connectionCtx.on('session/event', (session) => {
                memory.markPending(String(session.id));
            });
            return () => {
                disposeEvents();
                disposeRpc();
                memory.dispose();
            };
        }, 'dcode-ui: git and memory rpc channel');
    });
}
//# sourceMappingURL=index.js.map