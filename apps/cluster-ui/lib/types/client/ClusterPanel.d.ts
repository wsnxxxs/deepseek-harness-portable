/**
 * Cluster mode's durable orchestration inspector: who is on the team, and
 * what the team has agreed to do.
 *
 * The component is deliberately host-agnostic. It reads the Team Remote and
 * the bound dictionary through {@link useDeps} and nothing else — no cordis
 * context, no host surface's runtime provider, no ambient theme object — so
 * the same element renders in the official conversation header and inside a
 * workbench that adopts the published service.
 * @module @dsh-portable/cluster-ui/client/ClusterPanel
 */
import { type FunctionComponent } from 'react';
import type { ClusterPanelProps } from '../contract.ts';
import { type ClusterDeps } from './deps.ts';
/**
 * Close the panel over its dependencies once, at plugin-apply time.
 *
 * A host surface receives the result and mounts it like any other component.
 * Binding the provider here rather than asking each host to wrap the panel is
 * what keeps the contract at one prop: whichever tree the element lands in,
 * the dependencies travel with it.
 * @param deps - the Team face and bound dictionary resolved by the plugin body.
 * @returns the mountable panel published on the Cluster service.
 */
export declare function createClusterPanel(deps: ClusterDeps): FunctionComponent<ClusterPanelProps>;
/** The roster and shared task board of one Team. */
export declare function ClusterPanel({ sessionId }: ClusterPanelProps): import("react").JSX.Element;
//# sourceMappingURL=ClusterPanel.d.ts.map