/**
 * DCode's resource-library launcher.
 *
 * The library content and its settings-style dialog belong to the Interactive
 * Learning client package. DCode only supplies its own workspace/session
 * candidates and the small hand-off actions needed when a person has not
 * opened a resource space yet. The official DSH sidebar entry uses the same
 * dialog and the same VaultLibrary underneath it.
 * @module @dsh-portable/dcode-ui/client/library/ResourceLibraryHome
 */
import { type VaultLibraryTopic } from '@dsh-portable/interactive-learning/client';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { NavigationStore } from '../state/navigation.ts';
/** Props of the resource-library launcher. */
export interface ResourceLibraryHomeProps {
    readonly navigation: NavigationStore;
    readonly cwd: string | undefined;
    readonly sessionId: SessionId | undefined;
    /** Open the host workspace chooser when the library has no usable target. */
    readonly onOpenWorkspace?: () => void;
}
/** A resource space as projected by the existing roster endpoint. */
export interface ResourceSpace extends VaultLibraryTopic {
    readonly root: string;
    readonly sources: number;
    readonly concepts: number;
    readonly notes: number;
    readonly blocked: number;
}
/** Candidate folders are supplied by the client so the Host never enumerates unrelated directories. */
export declare function resourceCandidates(cwd: string | undefined, workspacePaths: readonly string[], sessionCwds: readonly (string | undefined)[]): readonly string[];
/** Keep this projection exported for consumers that used the former overview. */
export declare function resourceTotals(spaces: readonly ResourceSpace[]): {
    sources: number;
    notes: number;
    concepts: number;
    due: number;
};
/** The shared home for the official and DCode library content. */
export declare function ResourceLibraryHome({ navigation, cwd, sessionId, onOpenWorkspace }: ResourceLibraryHomeProps): import("react").JSX.Element;
//# sourceMappingURL=ResourceLibraryHome.d.ts.map