/**
 * Design-token scope for the Cluster panel.
 *
 * Importing this module loads `tokens.module.css`, which declares the scale on
 * the unhashed `[data-cluster-scope]` selector. Spreading {@link clusterScope}
 * onto the panel root opts its whole subtree into that scale, across every CSS
 * Module in the package — and, because each token defers to the host
 * surface's `--zx-*` value when there is one, without overriding a workbench
 * that already styles its own chrome.
 * @module @dsh-portable/cluster-ui/client/tokens
 */
import './tokens.module.css'

/** Attribute marking a subtree as Cluster-scoped. */
export const clusterScope = { 'data-cluster-scope': '' } as const
