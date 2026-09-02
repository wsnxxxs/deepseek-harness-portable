/**
 * Host-side Cordis plugin entrypoint for @dsh-portable/cluster-ui.
 *
 * Cluster mode has no host surface of its own. Its whole domain — the durable
 * roster, the peer mailbox and the shared task DAG — belongs to
 * `@deepseek-ai/dsh-experimental-agent-team`, which this distribution already
 * mounts on the Host plane as the `agent-team` row and which answers browser
 * calls through the generated Team Remote namespace.
 *
 * What this package adds is the browser half at `./client`: it mounts that
 * Remote namespace, publishes the roster and task board as one cordis service,
 * and seats the panel in the official conversation header. This node half
 * exists so the plugin can be a roster row like any other — the client module
 * system discovers the browser half through this package's `dsh.client`
 * declaration, and a roster row is what puts the package in the boot graph.
 *
 * Keeping it empty is deliberate rather than incidental: a host-side service
 * here would be a second owner of Team state, and the one owner is upstream's.
 * @module @dsh-portable/cluster-ui
 */

export { CLUSTER_SERVICE, type ClusterPanelProps, type ClusterSurface } from './contract.ts'

/** Stable Cordis plugin name. */
export const name = 'cluster-ui'

/** Host plugin body; every Cluster behavior lives in the browser half. */
export function apply(): void {}
