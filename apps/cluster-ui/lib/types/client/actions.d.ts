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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ClusterActions } from './deps.ts';
/**
 * Build the panel's Team face from a context that has the namespace mounted.
 *
 * The context must already carry `remote.agentTeams`; the caller obtains that
 * by injecting the namespace, which is what makes every call below total
 * rather than optional.
 * @param ctx - a client context scoped inside the `remote.agentTeams` injection.
 * @returns the actions handed to the panel.
 */
export declare function createClusterActions(ctx: ClientContext): ClusterActions;
//# sourceMappingURL=actions.d.ts.map