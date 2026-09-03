/**
 * Host-side Cordis plugin entrypoint for @dsh-portable/session-manager.
 *
 * The package is browser-side in substance. Both capabilities it owns —
 * managing the archived-conversation set and reporting token usage — are folds
 * over state the official Host already publishes: the Workspace Controller's
 * archive set, the Session Controller's list, and the durable per-session usage
 * projections carried on those summaries. There is no new Host surface, no new
 * store, and no second copy of any number.
 *
 * This half exists because the client module system serves a browser bundle
 * only for a package that is a row in the plugin graph, so the package needs a
 * host entry to be that row.
 * @module @dsh-portable/session-manager
 */

import type { Context } from '@deepseek-ai/cordis'

/** Stable Cordis plugin name. */
export const name = 'session-manager'

/**
 * Claim nothing on the host.
 * @param _ctx - the injecting cordis context, unused.
 */
export function apply(_ctx: Context): void {
  // Intentionally empty: see the module doc.
}
