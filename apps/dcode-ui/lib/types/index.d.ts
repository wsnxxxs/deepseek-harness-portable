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
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export { DCODE_CHANNEL, DCODE_ENDPOINTS, handleDcodeEndpoint, isDcodeEndpoint, type DcodeEndpoint, type DcodeErrorCode, type DcodeResult, } from './host/rpc.ts';
export { defaultDcodeMemoryRoot, DcodeMemoryStore, type DcodeMemoryCategory, type DcodeMemoryKind, type DcodeMemoryPhase, type DcodeMemoryRecord, type DcodeMemorySearchValue, type DcodeMemoryService, type DcodeMemorySessionLog, type DcodeMemorySessionRecord, type DcodeMemorySessionSource, type DcodeMemoryState, } from './host/memory.ts';
export { GitCommandError, containedRelativePath, parseBranchHeader, parseNumstat, parsePorcelain, readBranches, readDiff, readStatus, undoPaths, workTreeRoot, type GitBranch, type GitCommitResult, type GitDiff, type GitFileChange, type GitRestoreOutcome, type GitStatus, } from './host/git.ts';
export { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam, type UiMode, } from '@dsh-portable/ui-mode';
/** Stable Cordis plugin name. */
export declare const name = "dcode-ui";
/**
 * Connection is the only hard requirement: without the RPC carrier there is
 * no channel to claim, and the browser half degrades to a workbench without
 * Git and durable-memory tooling rather than failing to boot.
 */
export declare const inject: string[];
/** Plugin config. */
export interface Config {
    /** Serve the `/dcode` RPC channel; false leaves the workbench without Git tooling. */
    git: boolean;
}
export declare const Config: z<Config>;
/** The minimum RPC face this plugin needs off the Connection service. */
/**
 * Claim the `/dcode` channel on a host context.
 * @param ctx - the injecting cordis context.
 * @param config - entry configuration.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map