/**
 * Landing a new mission on the Crew composition.
 *
 * A mission is a crew mission because of the agent preset its session runs
 * under, and "New mission" has to produce one. It cannot simply pass the
 * preset to session creation: `uiWorkspace.startSession()` returns nothing, so
 * there is no id to select against, and `AgentPresets.select` refuses a session
 * that has already taken a turn.
 *
 * The Host's own rule, which this follows rather than reinvents, is to STAGE
 * the pick and apply it when a blank session becomes current — see
 * `ui-agent-preset`'s seat store. That works whichever order the two events
 * arrive in, and it is the same rule the official new-session chip obeys, so a
 * mission started here composes exactly like one started there.
 *
 * Failure is reported, never retried. A refusal means the session took a turn
 * before the stage landed, and re-selecting would be arguing with a Host that
 * has already answered.
 * @module @dsh-portable/crew-ui/client/state/mission-preset
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** The agent preset a mission runs under. */
export declare const CREW_PRESET = "crew";
/** What the rail's New-mission entry drives. */
export interface MissionPresetState {
    /** Start a mission and land it on the Crew composition. */
    start(workspaceId?: string): void;
    /** Last refusal, already formatted, or undefined. */
    readonly error: string | undefined;
    /** Clear the visible refusal. */
    dismiss(): void;
}
/** One session summary, as much of it as this decision reads. */
interface MissionSummary {
    readonly id: SessionId;
    readonly blank?: boolean;
    readonly projectionValues?: {
        readonly agentPreset?: unknown;
    };
}
/** What a staged pick should do about the session that just became current. */
export type StageAction = 
/** Nothing is current yet; keep the stage for the session still to arrive. */
'wait'
/** Compose this session on the crew preset. */
 | 'apply'
/**
 * Drop the stage without acting. Either the session already runs the
 * composition, or it has taken a turn — and the Host refuses a swap after
 * the first turn, so re-selecting would argue with an answer already given.
 */
 | 'spend';
/**
 * Decide what a staged pick does about the current session.
 *
 * Pure and exported so the rule is covered without a renderer: this is the one
 * piece of Mission Control that has to agree with a Host invariant, and it is
 * the piece a refactor would most easily get wrong.
 * @param summary - the session that just became current, when there is one.
 * @returns the action to take.
 */
export declare function stageAction(summary: MissionSummary | undefined): StageAction;
/**
 * Drive New-mission so the session it starts is a crew mission.
 * @param current - the session currently selected, or undefined.
 * @param summary - that session's summary.
 * @returns the entry point the rail calls, and any refusal to show.
 */
export declare function useMissionPreset(current: SessionId | undefined, summary: MissionSummary | undefined): MissionPresetState;
export {};
//# sourceMappingURL=mission-preset.d.ts.map