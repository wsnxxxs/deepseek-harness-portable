/**
 * The environment summary: what this task is working on, at a glance.
 *
 * A card the top bar summons and dismisses, anchored under its own control at
 * the right of the conversation column — deliberately not the preview
 * sidebar, which is where the same facts are worked rather than read. Every
 * environment row is the digest of one panel and opens it: the change counts
 * open Changes, the goal opens Goal. Recent trace activity follows those rows
 * so it stays available without occupying a second floating card.
 *
 * Nothing here is state of its own. The counts come from the same git read
 * the Changes panel uses, the goal from the host projection the official goal
 * bar renders, and the workspace from the durable registry.
 * @module @dsh-portable/dcode-ui/client/shell/SummaryCard
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { NavigationStore } from '../state/navigation.ts';
/** Props of the summary card. */
export interface SummaryCardProps {
    readonly navigation: NavigationStore;
    readonly sessionId: SessionId | undefined;
    readonly cwd: string | undefined;
    /** Top-bar controlled visibility. */
    readonly open: boolean;
    /** Compact summaries are modal bottom sheets rather than anchored cards. */
    readonly compact: boolean;
}
/** The environment digest, or null while the top bar keeps it closed. */
export declare function SummaryCard({ navigation, sessionId, cwd, open, compact }: SummaryCardProps): import("react").JSX.Element | null;
//# sourceMappingURL=SummaryCard.d.ts.map