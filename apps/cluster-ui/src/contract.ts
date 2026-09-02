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
export const CLUSTER_SERVICE = 'cluster'

/** Props of the hostable Cluster panel. */
export interface ClusterPanelProps {
  /**
   * The conversation the operator is looking at. The panel resolves the
   * owning root session itself, so a teammate's own session may be passed
   * unchanged; `undefined` renders the panel's empty state.
   */
  readonly sessionId: string | undefined
}

/**
 * The face published on `ctx.cluster`.
 *
 * A host surface needs exactly two things from it: whether Cluster mode is
 * live at all, and a component to mount. Everything the panel needs beyond
 * its session id — the Team Remote, the Session Controller, the dictionaries
 * — is closed over by this package when the service is constructed, so the
 * component carries no requirement on the surrounding React tree.
 */
export interface ClusterSurface {
  /**
   * Whether the Team Remote namespace answered on this page.
   *
   * Always true for a published service: the service is not constructed until
   * the namespace mounts. It exists so a surface can write one expression
   * (`cluster?.available === true`) whether or not the plugin is installed.
   */
  readonly available: boolean
  /** The Cluster roster and shared task board, mountable in any React tree. */
  readonly Panel: (props: ClusterPanelProps) => unknown
}
