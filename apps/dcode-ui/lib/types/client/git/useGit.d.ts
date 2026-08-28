/**
 * Working-tree status for the panels that show it.
 *
 * Three surfaces read this at once — the top bar's branch chip, the Changes
 * panel, and every turn's file-change card — so the read is shared per
 * workspace rather than issued per component: one `git status` subprocess
 * answers all of them, and they cannot disagree about the branch.
 *
 * It is refreshed on the events that actually change a work tree: the end of
 * an agent turn, an explicit refresh, a commit, an undo, and the window
 * regaining focus. There is no polling loop — a workbench left open on a quiet
 * workspace issues no git processes at all.
 * @module @dsh-portable/dcode-ui/client/git/useGit
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { GitStatus } from '../rpc.ts';
/** What a consumer reads. */
export interface GitSnapshot {
    readonly status: GitStatus | undefined;
    /** True while a read is outstanding, including the first one. */
    readonly loading: boolean;
    /** True until the first answer lands — distinct from "answered: not a repository". */
    readonly pending: boolean;
    readonly error: string | undefined;
}
/** The status read plus its lifecycle. */
export interface GitState extends GitSnapshot {
    /** True when the connection has no `/dcode` channel at all. */
    readonly unavailable: boolean;
    /** Re-read the working tree now, for every consumer of this workspace. */
    readonly refresh: () => void;
}
/**
 * Read one workspace's git status.
 * @param cwd - absolute workspace directory, or undefined with no session selected.
 * @param sessionId - session whose turn boundaries trigger a refresh.
 */
export declare function useGitStatus(cwd: string | undefined, sessionId: SessionId | undefined): GitState;
//# sourceMappingURL=useGit.d.ts.map