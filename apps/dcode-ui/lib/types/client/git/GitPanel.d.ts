/**
 * The Git tools panel: branch, working-tree changes, and a commit entry.
 *
 * This is the capability the Harness itself does not ship, completed over the
 * `/dcode` host channel. It stays deliberately small — status, diff, commit —
 * because anything wider (push, rebase, history rewriting) belongs in a real
 * git client, not in a panel beside a conversation.
 * @module @dsh-portable/dcode-ui/client/git/GitPanel
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { DiffTarget } from '../state/navigation.ts';
/** Props of the git panel. */
export interface GitPanelProps {
    readonly cwd: string | undefined;
    readonly sessionId: SessionId | undefined;
    /** Path currently shown in the diff viewer. */
    readonly selected: DiffTarget | undefined;
    readonly onOpenDiff: (path: string, staged: boolean) => void;
}
/** Branch, changed files and the commit entry. */
export declare function GitPanel({ cwd, sessionId, selected, onOpenDiff }: GitPanelProps): import("react").JSX.Element;
//# sourceMappingURL=GitPanel.d.ts.map