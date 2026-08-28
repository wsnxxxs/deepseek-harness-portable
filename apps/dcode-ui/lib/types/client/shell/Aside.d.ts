/**
 * The right column: Git changes, Goal and Progress, and the details of
 * whatever the operator last clicked.
 *
 * Goal is the host-computed `goal` projection — the same value the official
 * goal bar renders — and Progress is the session's own todo list, folded from
 * the `todo_write` calls in the transcript. Neither is workbench state: close
 * the window and reopen it in the classic UI and the same facts are there.
 * @module @dsh-portable/dcode-ui/client/shell/Aside
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { type NavigationStore } from '../state/navigation.ts';
/** Props of the right column. */
export interface AsideProps {
    readonly navigation: NavigationStore;
    readonly sessionId: SessionId | undefined;
    readonly cwd: string | undefined;
}
/** The right column with its three tabs. */
export declare function Aside({ navigation, sessionId, cwd }: AsideProps): import("react").JSX.Element;
//# sourceMappingURL=Aside.d.ts.map