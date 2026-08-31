/**
 * The permission-approval card: the composer seat for one pending Host
 * permission request.
 *
 * DSH's own approval plugin publishes each waiting Host request into the
 * shared Session pending-interaction roster; DCode renders that value here
 * because the custom composer replaces the official composer seat that the
 * approval slot chain would otherwise take over. The decision is transient:
 * allow-once or reject, never a persistent permission grant.
 * @module @dsh-portable/dcode-ui/client/shell/ApprovalCard
 */
import type { DcodePendingApproval } from '../state/runtime.ts';
/** Composer takeover for one waiting Host approval request. */
export declare function ApprovalCard({ pending }: {
    pending: DcodePendingApproval;
}): import("react").JSX.Element;
//# sourceMappingURL=ApprovalCard.d.ts.map