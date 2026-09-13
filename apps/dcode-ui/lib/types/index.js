import { registerRpc } from '@dsh-portable/connection-rpc';
import z from '@deepseek-ai/schemastery';
import { DCODE_ENDPOINTS, handleDcodeEndpoint, isDcodeEndpoint } from "./host/rpc.js";
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
export const inject = ['connection', 'webServer', 'sessionQuery'];
export const Config = z.object({
    git: z.boolean().default(true),
});
/** The minimum RPC face this plugin needs off the Connection service. */
/**
 * Claim the `/dcode` channel on a host context.
 * @param ctx - the injecting cordis context.
 * @param config - entry configuration.
 */
export function apply(ctx, config = {}) {
    const resolved = Config(config);
    if (!resolved.git)
        return;
    ctx.inject(['connection', 'webServer', 'sessionQuery'], (connectionCtx) => {
        const memory = new DcodeMemoryStore({
            root: defaultDcodeMemoryRoot(),
            source: () => connectionCtx.sessionQuery,
        });
        connectionCtx.effect(() => {
            const disposeRpc = registerRpc(connectionCtx, 'dcode', DCODE_ENDPOINTS, async (endpoint, payload) => {
                if (!isDcodeEndpoint(endpoint)) {
                    return {
                        ok: false,
                        error: { code: 'bad-request', message: 'unknown /dcode RPC endpoint', details: { endpoint } },
                    };
                }
                return await handleDcodeEndpoint(endpoint, payload, memory);
            });
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