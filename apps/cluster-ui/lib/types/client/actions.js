/**
 * The Team Remote, addressed the way an operator thinks about it.
 *
 * Two things happen here and nowhere else. First, every call is re-addressed
 * to the session that owns the Team: a Team is keyed by its lead, so a panel
 * opened while reading a teammate's own conversation must still ask about the
 * ancestor. Second, opening a teammate is expressed as one action rather than
 * as a refresh followed by a navigation, so the panel never has to know how
 * the Session Controller spells either step.
 * @module @dsh-portable/cluster-ui/client/actions
 */
import { canOpenMember, rootSessionId } from "./model.js";
/**
 * Build the panel's Team face from a context that has the namespace mounted.
 *
 * The context must already carry `remote.agentTeams`; the caller obtains that
 * by injecting the namespace, which is what makes every call below total
 * rather than optional.
 * @param ctx - a client context scoped inside the `remote.agentTeams` injection.
 * @returns the actions handed to the panel.
 */
export function createClusterActions(ctx) {
    const sessions = ctx.sessions;
    const agentTeams = ctx.remote.agentTeams;
    /** The session that owns the Team the given session belongs to. */
    const leadOf = (sessionId) => rootSessionId(sessionId, (id) => {
        const address = sessions.binding(id)?.session.getSnapshot().subagent?.address;
        return address?.parentSessionId;
    });
    return {
        view: async (sessionId) => await agentTeams.view(leadOf(sessionId)),
        createTask: async (sessionId, request) => await agentTeams.createTask(leadOf(sessionId), request),
        updateTask: async (sessionId, request) => await agentTeams.updateTask(leadOf(sessionId), request),
        openMember: async (sessionId, member) => {
            // The lead's own row is the conversation already on screen, and a
            // teammate that failed or is still provisioning has no session to open.
            if (!canOpenMember(member))
                return;
            const parentSessionId = leadOf(sessionId);
            // The roster is authoritative about who exists; the Session Controller's
            // subagent list is what the navigation reads, so it is refreshed first
            // or a teammate spawned since the last poll would not resolve.
            await sessions.refreshSubagents(parentSessionId);
            sessions.openSubagent({ parentSessionId, childSessionId: member.id, mode: 'continuable' });
        },
    };
}
//# sourceMappingURL=actions.js.map