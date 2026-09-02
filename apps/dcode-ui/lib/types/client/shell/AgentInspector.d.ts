/**
 * DCode-native Inspector content for the DCode workbench.
 *
 * The component hierarchy follows the DCode Plan / Subagents stack, but each
 * row is backed by an existing DSH source: projections, Session Controller
 * catalogs, and the child conversation feed.
 * @module @dsh-portable/dcode-ui/client/shell/AgentInspector
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { SubagentCatalogSnapshot } from '@deepseek-ai/dsh-api-session-controller/client';
import type { NavigationStore } from '../state/navigation.ts';
type CatalogEntry = SubagentCatalogSnapshot['entries'][number];
export type SubagentChildEntry = Extract<CatalogEntry, {
    kind: 'child';
}>;
/** DCode's Subagents section over Session Controller's live direct-child catalog. */
export declare function SubagentsPanel({ sessionId, selectedId, onSelect, }: {
    readonly sessionId: SessionId | undefined;
    readonly selectedId?: SessionId;
    readonly onSelect: (entry: SubagentChildEntry) => void;
}): import("react").JSX.Element;
/** Centered full-session reader opened over the workbench. */
export declare function SubagentConversationDialog({ parentSessionId, entry, navigation, onClose, }: {
    readonly parentSessionId: SessionId;
    readonly entry: SubagentChildEntry;
    readonly navigation: NavigationStore;
    readonly onClose: () => void;
}): import("react").JSX.Element;
/** Detailed child view, following DCode's back / copy-log / transcript pattern. */
export declare function SubagentDetailPanel({ parentSessionId, entry, navigation, onBack, onOpenFull, }: {
    readonly parentSessionId: SessionId;
    readonly entry: SubagentChildEntry;
    readonly navigation: NavigationStore;
    readonly onBack: () => void;
    readonly onOpenFull: () => void;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=AgentInspector.d.ts.map