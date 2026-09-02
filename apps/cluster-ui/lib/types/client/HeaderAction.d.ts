/**
 * Cluster mode's seat in the official DSH conversation header.
 *
 * This is what makes the plugin stand on its own. The published service lets a
 * workbench place the panel wherever its own layout wants it; this entry needs
 * no such cooperation, so an assembly with nothing but the official UI still
 * gets the roster and the shared task board.
 *
 * The seat owns only the disclosure — whether there is a Team worth offering,
 * the trigger, the anchored sheet, and dismissal. Everything inside it is the
 * same {@link ClusterPanel} the service publishes, so the two placements can
 * never drift apart.
 * @module @dsh-portable/cluster-ui/client/HeaderAction
 */
import { type FunctionComponent } from 'react';
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { SessionId } from '@deepseek-ai/dsh-session/types';
import type { ClusterPanelProps } from '../contract.ts';
import { CLUSTER_NS } from './locales.ts';
/** Business face injected by the plugin body. */
export interface ClusterHeaderInjected {
    /** The same panel the Cluster service publishes. */
    readonly Panel: FunctionComponent<ClusterPanelProps>;
    /**
     * Whether this session's Team has anything an operator would want to see.
     *
     * Every session has a Team view — a solo session answers with a roster of
     * one and an empty board — so a header control offered unconditionally would
     * appear on every conversation in the product, including deployments that
     * never orchestrate anything. This is the question that keeps the seat
     * honest, and it is asked in terms of the Team rather than in terms of any
     * one distribution's preset names.
     */
    hasTeam(sessionId: SessionId): Promise<boolean>;
}
/** Full props of the Cluster conversation-header action. */
export type ClusterHeaderActionProps = PropsRuntime<'conversation.session.header.actions'> & ClusterHeaderInjected & PropsLocale<typeof CLUSTER_NS>;
/** Disclose the Cluster roster and task board from the conversation header. */
export declare function ClusterHeaderAction({ sessionId, Panel, hasTeam, t }: ClusterHeaderActionProps): import("react").JSX.Element | null;
//# sourceMappingURL=HeaderAction.d.ts.map