/**
 * Metis-inspired Inspector content for the DCode workbench.
 *
 * The component hierarchy follows Metis's Files Changed / Plan / Subagents
 * stack, but each row is backed by an existing DSH source: Git status,
 * projections, Session Controller catalogs, and the child conversation feed.
 * @module @dsh-portable/dcode-ui/client/shell/AgentInspector
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SubagentCatalogSnapshot } from '@deepseek-ai/dsh-api-session-controller/client';
import type { NavigationStore } from '../state/navigation.ts';
type CatalogEntry = SubagentCatalogSnapshot['entries'][number];
export type SubagentChildEntry = Extract<CatalogEntry, {
    kind: 'child';
}>;
/** Metis's compact Files Changed section, using the DCode Git host channel. */
export declare function ChangedFilesOverview({ cwd, sessionId, onOpenDiff, }: {
    readonly cwd: string | undefined;
    readonly sessionId: SessionId | undefined;
    readonly onOpenDiff: (path: string, staged: boolean) => void;
}): import("react").JSX.Element;
/** Metis's Subagents section over Session Controller's live direct-child catalog. */
export declare function SubagentsPanel({ sessionId, selectedId, onSelect, }: {
    readonly sessionId: SessionId | undefined;
    readonly selectedId?: SessionId;
    readonly onSelect: (entry: SubagentChildEntry) => void;
}): import("react").JSX.Element;
/** Detailed child view, following Metis's back / copy-log / transcript pattern. */
export declare function SubagentDetailPanel({ parentSessionId, entry, navigation, onBack, }: {
    readonly parentSessionId: SessionId;
    readonly entry: SubagentChildEntry;
    readonly navigation: NavigationStore;
    readonly onBack: () => void;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=AgentInspector.d.ts.map