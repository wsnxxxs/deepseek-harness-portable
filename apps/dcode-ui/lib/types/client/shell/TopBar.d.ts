/**
 * The top bar: what is being worked on, where, and on which branch — plus
 * Session sharing and the inspector toggle.
 *
 * Every value is read live: the title comes from the Session Controller's
 * display title, the workspace from the durable registry, and the branch from
 * the same git read the Changes panel uses.
 * @module @dsh-portable/dcode-ui/client/shell/TopBar
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import { type NavigationStore, type TaskContext } from '../state/navigation.ts';
/** Props of the top bar. */
export interface TopBarProps {
    readonly navigation: NavigationStore;
    readonly sessionId: SessionId | undefined;
    readonly cwd: string | undefined;
    readonly context: TaskContext;
}
/** Task context, the left session rail toggle, sharing, and inspector control. */
export declare function TopBar({ navigation, sessionId, cwd, context }: TopBarProps): import("react").JSX.Element;
//# sourceMappingURL=TopBar.d.ts.map