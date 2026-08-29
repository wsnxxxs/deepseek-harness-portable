/**
 * The install-progress panel, and the two chips that report a settled
 * operation.
 *
 * An install is the one thing in the workbench that reaches the network, the
 * disk and a package manager at once, and it can take minutes. It therefore
 * reports itself the way a package manager does — phase, share, transferred
 * bytes, rate, estimate and the last lines of installer output — rather than
 * as an indefinite spinner an operator cannot tell apart from a hang.
 * @module @dsh-portable/dcode-ui/client/plugins/JobProgress
 */
import type { ReactNode } from 'react';
import type { Operation } from './useJob.ts';
/** Props of the progress panel. */
export interface JobProgressProps {
    readonly operation: Operation;
    readonly onCancel: () => void;
}
/**
 * Live progress of one running operation.
 * @param props - the operation and its cancel verb.
 * @returns the panel, or null once the operation has settled.
 */
export declare function JobProgress({ operation, onCancel }: JobProgressProps): ReactNode;
/**
 * The tail of a failed operation's installer output.
 * @param props - the settled operation.
 * @returns the output block, or null when the Host sent none.
 */
export declare function JobOutput({ operation }: {
    operation: Operation;
}): ReactNode;
//# sourceMappingURL=JobProgress.d.ts.map