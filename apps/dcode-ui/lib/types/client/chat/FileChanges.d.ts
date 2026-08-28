/**
 * The file-change summary card that closes a turn.
 *
 * It lists exactly the paths that turn's settled write/edit calls touched,
 * annotates each with the line counts from the working-tree status, opens the
 * diff viewer on click, and offers the one destructive action the workbench
 * has: undoing that turn's edits.
 *
 * Undo is deliberately narrow. It restores tracked files from HEAD and moves
 * untracked ones into `.dsh/dcode-undo/<timestamp>/` rather than deleting
 * them, so a mistaken undo is recoverable from the operator's own directory.
 * @module @dsh-portable/dcode-ui/client/chat/FileChanges
 */
import type { GitStatus } from '../rpc.ts';
/** Props of the turn file-change card. */
export interface FileChangesProps {
    /** Paths this turn wrote, in first-touch order. */
    readonly paths: readonly string[];
    /** The workspace directory the paths are relative to. */
    readonly cwd: string | undefined;
    /** Working-tree status, used for the per-file line counts. */
    readonly status: GitStatus | undefined;
    /** Open the diff viewer on one path. */
    readonly onOpenDiff: (path: string) => void;
    /** Re-read the working tree after an undo. */
    readonly onChanged: () => void;
}
/** The turn's changed-file summary with its undo action. */
export declare function FileChanges({ paths, cwd, status, onOpenDiff, onChanged }: FileChangesProps): import("react").JSX.Element | null;
//# sourceMappingURL=FileChanges.d.ts.map