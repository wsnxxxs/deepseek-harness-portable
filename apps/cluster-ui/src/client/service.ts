/**
 * Cordis owner of Cluster mode's browser surface.
 *
 * The service is the whole public seam. A host surface reads it with
 * `ctx.get('cluster')` and mounts {@link ClusterService.Panel}; it never
 * injects this package, never imports it, and never learns that the panel is
 * driven by a generated Remote namespace.
 *
 * Construction is the availability proof. The plugin body builds this only
 * from a context inside the `remote.agentTeams` injection, so a published
 * service means the Team namespace answered on this page — which is why
 * {@link ClusterService.available} is a constant rather than a probe, and why
 * disposing the injection withdraws the surface from every host at once.
 * @module @dsh-portable/cluster-ui/client/service
 */

import { Service } from '@deepseek-ai/cordis'
import type { Context } from '@deepseek-ai/cordis'
import type { FunctionComponent } from 'react'
import { CLUSTER_SERVICE, type ClusterPanelProps, type ClusterSurface } from '../contract.ts'
import { createClusterPanel } from './ClusterPanel.tsx'
import type { ClusterActions, ClusterDeps } from './deps.ts'

/** The page-wide Cluster surface consumed by independently bundled hosts. */
export class ClusterService extends Service implements ClusterSurface {
  /** True for the lifetime of a published service; see the module note. */
  readonly available = true

  /** The roster and shared task board, ready to mount in any React tree. */
  readonly Panel: FunctionComponent<ClusterPanelProps>

  /** The Team face the panel drives, exposed for hosts that build their own view. */
  readonly actions: ClusterActions

  /**
   * @param ctx - the context inside the `remote.agentTeams` injection.
   * @param deps - the Team face and bound dictionary for this page.
   */
  constructor(ctx: Context, deps: ClusterDeps) {
    super(ctx, CLUSTER_SERVICE)
    this.actions = deps.actions
    // Built once: the panel closes over `deps`, so a fresh component identity
    // per render would remount the whole board on every host re-render.
    this.Panel = createClusterPanel(deps)
  }
}
