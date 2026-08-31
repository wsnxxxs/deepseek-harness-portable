/**
 * The mission brief.
 *
 * What the board cannot show at a glance: how far the mission has got, which
 * mode it runs under, and every write-scope conflict on the board collected in
 * one place rather than one warning per card.
 *
 * The mode is a LABEL, never a picker. `AgentPresets.select` refuses once a
 * session has taken a turn, so a running mission keeps the composition it began
 * with; offering a control that would be rejected is worse than stating the
 * rule, which is what the line under it does.
 * @module @dsh-portable/crew-ui/client/shell/BriefView
 */
import type { TeamView } from '@deepseek-ai/dsh-experimental-agent-team/client';
/** Props of the brief. */
export interface BriefViewProps {
    readonly view: TeamView | undefined;
    /** The preset this mission started with, when known. */
    readonly presetId: string | undefined;
    /** Working directory of the mission, when the session carries one. */
    readonly cwd: string | undefined;
}
/** The mission summary tab. */
export declare function BriefView({ view, presetId, cwd }: BriefViewProps): import("react").JSX.Element;
//# sourceMappingURL=BriefView.d.ts.map