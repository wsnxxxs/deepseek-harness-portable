/**
 * The Metis-style conversation rail.
 *
 * Mission summaries remain the source of truth, while the presentation adds
 * the search, new-chat and settings affordances that make the rail feel like a
 * persistent workspace rather than a board index.
 * @module @dsh-portable/crew-ui/client/shell/MissionRail
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Props of the mission rail. */
export interface MissionRailProps {
    readonly collapsed: boolean;
    readonly currentSessionId: SessionId | undefined;
    onSelect(sessionId: SessionId): void;
    onNewMission(): void;
    onOpenWorkspace(): void;
    onCollapse(): void;
    onOpenSettings(): void;
}
/** The left conversation rail. */
export declare function MissionRail({ collapsed, currentSessionId, onSelect, onNewMission, onOpenWorkspace, onCollapse, onOpenSettings, }: MissionRailProps): import("react").JSX.Element;
//# sourceMappingURL=MissionRail.d.ts.map