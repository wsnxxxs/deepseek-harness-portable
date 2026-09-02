/**
 * The vocabulary a host surface needs to adopt Cluster mode, and nothing else.
 *
 * This module is deliberately free of React, of cordis and of every DSH client
 * package: a surface that wants to host the Cluster inspector can import these
 * types without taking a build edge on this package's browser half, and a
 * surface that would rather stay wholly independent can restate the two
 * interfaces below structurally — they are small on purpose, and this file is
 * the authority on their shape.
 *
 * The seam itself is a cordis service. The browser half publishes
 * {@link CLUSTER_SERVICE} once the Team Remote namespace is mounted, and any
 * surface reads it with `ctx.get('cluster')`. Reading through `get` rather
 * than declaring a cordis injection is the point: a surface must not fail to
 * render because an optional orchestration plugin is absent, and this package
 * must not have to know which surfaces exist.
 * @module @dsh-portable/cluster-ui/contract
 */
/**
 * Name of the cordis service the browser half publishes.
 *
 * Spelled once here so a host surface and this package cannot disagree about
 * it, and so a rename is a compile error in every consumer that imports it.
 */
export const CLUSTER_SERVICE = 'cluster';
//# sourceMappingURL=contract.js.map