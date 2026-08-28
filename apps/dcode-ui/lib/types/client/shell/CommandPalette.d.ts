/**
 * The global command palette.
 *
 * Three sources in one list: the workbench's own actions, the Session
 * Controller's task list, and the Host's file-reference index for the current
 * session. The file rows come from `fileReferences/list`, the same index the
 * official composer's `@` mention trigger uses, so the palette needs no
 * workspace crawl of its own.
 * @module @dsh-portable/dcode-ui/client/shell/CommandPalette
 */
import type { NavigationStore } from '../state/navigation.ts';
/** Props of the palette. */
export interface CommandPaletteProps {
    readonly navigation: NavigationStore;
    readonly onNewTask: () => void;
    readonly onOpenWorkspace: () => void;
}
/** Case-insensitive subsequence match, the conventional palette filter. */
export declare function fuzzyMatch(query: string, candidate: string): boolean;
/** Actions, tasks and files behind one search field. */
export declare function CommandPalette({ navigation, onNewTask, onOpenWorkspace }: CommandPaletteProps): import("react").JSX.Element;
//# sourceMappingURL=CommandPalette.d.ts.map