/**
 * The left rail: the primary task action, the workspace/task tree, and the
 * account foot.
 *
 * The tree is the Session Controller's list grouped by the durable Workspace
 * registry — the same two stores the official sidebar reads — so a task
 * started in either surface appears in both.
 * @module @dsh-portable/dcode-ui/client/shell/LeftRail
 */
import { type NavigationStore } from '../state/navigation.ts';
/** Props of the left rail. */
export interface LeftRailProps {
    readonly navigation: NavigationStore;
    readonly onNewTask: (workspaceId?: string) => void;
}
/** The task action, scrollable navigation/tree, and account foot. */
export declare function LeftRail({ navigation, onNewTask }: LeftRailProps): import("react").JSX.Element;
//# sourceMappingURL=LeftRail.d.ts.map