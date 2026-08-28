/**
 * Bounded git reads and one narrow write path for the modern workbench.
 *
 * DSH owns sessions, tools and conversation state but ships no version-control
 * capability, so the Git Changes panel, the diff viewer and the turn-undo
 * action are completed here — a host plugin beside the Runtime rather than a
 * desktop-only shell feature, so the web surface keeps the same panel.
 *
 * Every invocation is a fixed argv against `git` with `--` separating flags
 * from paths, a wall-clock timeout, and a byte cap. No shell is involved, and
 * a caller-supplied path never reaches argv without passing
 * {@link containedRelativePath} first.
 * @module @dsh-portable/dcode-ui/host/git
 */
/** One changed path in the working tree. */
export interface GitFileChange {
    /** Repository-relative path, forward-slashed. */
    readonly path: string;
    /** Porcelain XY code as reported by git (`??` for untracked). */
    readonly code: string;
    /** Coarse presentation status derived from the porcelain code. */
    readonly status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'conflicted';
    /** Whether the change is currently staged. */
    readonly staged: boolean;
    /** Added lines, when numstat could measure them. */
    readonly insertions: number;
    /** Removed lines, when numstat could measure them. */
    readonly deletions: number;
    /** Previous path of a rename. */
    readonly from?: string;
}
/** Working-tree summary for one workspace directory. */
export interface GitStatus {
    /** False when the directory is not inside a git work tree; every other field is then empty. */
    readonly repository: boolean;
    /** Absolute work-tree root, when one was found. */
    readonly root?: string;
    /** Current branch, or a detached-HEAD description. */
    readonly branch?: string;
    /** True while HEAD is detached. */
    readonly detached: boolean;
    /** Configured upstream ref, when the branch tracks one. */
    readonly upstream?: string;
    /** Commits ahead of the upstream. */
    readonly ahead: number;
    /** Commits behind the upstream. */
    readonly behind: number;
    readonly files: readonly GitFileChange[];
    /** True when the row list was capped. */
    readonly truncated: boolean;
    readonly insertions: number;
    readonly deletions: number;
    /** Why the answer is empty, when a probe failed for a reportable reason. */
    readonly reason?: string;
}
/** A unified diff for one path. */
export interface GitDiff {
    readonly path: string;
    /** Unified diff text; empty when the file is binary or unchanged. */
    readonly patch: string;
    /** True when the patch was capped at {@link DIFF_CHAR_LIMIT}. */
    readonly truncated: boolean;
    /** True when git reported the blob as binary. */
    readonly binary: boolean;
    readonly insertions: number;
    readonly deletions: number;
}
/** One local branch row. */
export interface GitBranch {
    readonly name: string;
    readonly current: boolean;
    /** Subject line of the branch tip. */
    readonly subject?: string;
}
/** Result of a commit attempt. */
export interface GitCommitResult {
    readonly committed: boolean;
    /** Short hash of the new commit. */
    readonly commit?: string;
    /** Human-readable reason a commit was refused (nothing staged, hook rejection, …). */
    readonly reason?: string;
}
/** Outcome of restoring one path. */
export interface GitRestoreOutcome {
    readonly path: string;
    /** `restored` for a tracked file returned to HEAD, `quarantined` for an untracked file moved aside. */
    readonly result: 'restored' | 'quarantined' | 'skipped';
    /** Where a quarantined file was moved, relative to the work-tree root. */
    readonly movedTo?: string;
    readonly reason?: string;
}
/** A failed git invocation, carrying the trimmed stderr git produced. */
export declare class GitCommandError extends Error {
    readonly args: readonly string[];
    readonly stderr: string;
    readonly code?: number | undefined;
    readonly name = "GitCommandError";
    /**
     * @param args - argv the invocation used, for the diagnostic message.
     * @param stderr - trimmed git stderr.
     * @param code - process exit code, when one was produced.
     */
    constructor(args: readonly string[], stderr: string, code?: number | undefined);
}
/**
 * Reject a caller-supplied path that escapes its work tree.
 *
 * Paths arrive from the browser (a file row the operator clicked), so they are
 * untrusted input to an argv. Absolute inputs are accepted only when they
 * resolve inside `root`; the answer is always the forward-slashed
 * root-relative form git itself expects.
 * @param root - absolute work-tree root.
 * @param path - candidate path, absolute or root-relative.
 * @returns the contained root-relative path.
 * @throws {Error} when the path escapes the work tree or is empty.
 */
export declare function containedRelativePath(root: string, path: string): string;
/**
 * Run one git invocation and capture its output.
 * @param cwd - directory to run in.
 * @param args - complete argv after the program name.
 * @param options - `tolerateFailure` returns the failed result instead of throwing.
 * @returns stdout, stderr and the exit code.
 * @throws {GitCommandError} on a non-zero exit unless failure is tolerated.
 */
export declare function git(cwd: string, args: readonly string[], options?: {
    tolerateFailure?: boolean;
}): Promise<{
    stdout: string;
    stderr: string;
    code: number;
}>;
/** Parse `git status --porcelain=v1 -z` into rows (NUL-separated; renames carry two records). */
export declare function parsePorcelain(output: string): GitFileChange[];
/** Parse `git diff --numstat -z` into per-path line counts ('-' marks a binary blob). */
export declare function parseNumstat(output: string): Map<string, {
    insertions: number;
    deletions: number;
}>;
/** Parse `git status -b --porcelain=v1 -z`'s leading branch header. */
export declare function parseBranchHeader(header: string): {
    branch?: string;
    upstream?: string;
    ahead: number;
    behind: number;
    detached: boolean;
};
/**
 * Locate the work-tree root containing a directory.
 * @param cwd - directory to probe.
 * @returns the absolute root, or undefined when the directory is not in a repository.
 */
export declare function workTreeRoot(cwd: string): Promise<string | undefined>;
/**
 * Read the working-tree status of one directory.
 * @param cwd - any directory inside the repository.
 * @returns the status; `repository: false` when the directory is not versioned.
 */
export declare function readStatus(cwd: string): Promise<GitStatus>;
/**
 * Read the unified diff of one path.
 * @param cwd - any directory inside the repository.
 * @param path - workspace-relative or absolute path inside the work tree.
 * @param staged - read the index diff instead of the work-tree diff.
 * @returns the patch, capped and flagged when the blob is binary or oversized.
 */
export declare function readDiff(cwd: string, path: string, staged: boolean): Promise<GitDiff>;
/**
 * List local branches with their tip subjects.
 * @param cwd - any directory inside the repository.
 * @returns branches in git's own ordering, current branch flagged.
 */
export declare function readBranches(cwd: string): Promise<readonly GitBranch[]>;
/**
 * Stage the requested paths (or every change) and commit them.
 *
 * The commit is an explicit operator action from the Git panel: nothing is
 * pushed, no branch is created, and an empty index is reported back rather
 * than forced through with `--allow-empty`.
 * @param cwd - any directory inside the repository.
 * @param message - commit message; leading/trailing whitespace is trimmed.
 * @param paths - paths to stage first; omitted stages every tracked and untracked change.
 * @returns whether a commit was created, with the short hash or the refusal reason.
 */
export declare function commit(cwd: string, message: string, paths?: readonly string[]): Promise<GitCommitResult>;
/**
 * Undo the working-tree effect of a set of paths.
 *
 * Tracked paths are restored from HEAD. An untracked path is never deleted:
 * it is moved into `.dsh/dcode-undo/<timestamp>/` inside the work tree, so an
 * accidental undo stays recoverable from the operator's own directory.
 * @param cwd - any directory inside the repository.
 * @param paths - paths to undo.
 * @returns one outcome per requested path, in request order.
 */
export declare function undoPaths(cwd: string, paths: readonly string[]): Promise<readonly GitRestoreOutcome[]>;
//# sourceMappingURL=git.d.ts.map