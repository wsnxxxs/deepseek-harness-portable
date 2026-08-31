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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRuntime } from "./runtime.js";
/** The agent preset a mission runs under. */
export const CREW_PRESET = 'crew';
/** The preset a session already runs under, when the projection carries one. */
function presetOf(summary) {
    const value = summary?.projectionValues?.agentPreset;
    return typeof value === 'string' ? value : undefined;
}
/**
 * Decide what a staged pick does about the current session.
 *
 * Pure and exported so the rule is covered without a renderer: this is the one
 * piece of Mission Control that has to agree with a Host invariant, and it is
 * the piece a refactor would most easily get wrong.
 * @param summary - the session that just became current, when there is one.
 * @returns the action to take.
 */
export function stageAction(summary) {
    if (summary === undefined)
        return 'wait';
    if (summary.blank !== true)
        return 'spend';
    return presetOf(summary) === CREW_PRESET ? 'spend' : 'apply';
}
/**
 * Drive New-mission so the session it starts is a crew mission.
 * @param current - the session currently selected, or undefined.
 * @param summary - that session's summary.
 * @returns the entry point the rail calls, and any refusal to show.
 */
export function useMissionPreset(current, summary) {
    const runtime = useRuntime();
    const [error, setError] = useState(undefined);
    // A ref, not state: the stage must be readable by the applier effect at the
    // moment the session list changes, without waiting for a render.
    const staged = useRef(false);
    const start = useCallback((workspaceId) => {
        const navigation = runtime.navigation;
        if (navigation === undefined)
            return;
        setError(undefined);
        // Staged BEFORE the session exists. The applier below fires whichever way
        // round the two land, which is what makes this safe without a delay.
        staged.current = true;
        navigation.startSession(workspaceId);
    }, [runtime]);
    useEffect(() => {
        if (!staged.current || current === undefined)
            return;
        const presets = runtime.presets;
        if (presets === undefined) {
            staged.current = false;
            return;
        }
        const action = stageAction(summary);
        if (action === 'wait')
            return;
        staged.current = false;
        if (action === 'spend')
            return;
        let landed = true;
        void presets.select(current, CREW_PRESET)
            .then((result) => {
            if (!landed || result.ok)
                return;
            // A refusal names its cause twice: `message` wraps it in the roster's
            // own frame, and a `reason` detail carries it plain. Read the detail
            // where there is one, exactly as the official chip does.
            const detail = result.error.details?.reason;
            setError(typeof detail === 'string' ? detail : result.error.message);
        })
            .catch((cause) => {
            if (!landed)
                return;
            setError(cause instanceof Error ? cause.message : String(cause));
        });
        return () => { landed = false; };
    }, [current, runtime, summary]);
    return {
        start,
        error,
        dismiss: useCallback(() => { setError(undefined); }, []),
    };
}
//# sourceMappingURL=mission-preset.js.map