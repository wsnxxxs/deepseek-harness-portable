/**
 * The Metis-style composer for the mission's current thread.
 *
 * Draft and submission still belong to DSH's Conversation input service. The
 * richer shell is presentation only, which keeps a draft intact when the
 * operator moves between Crew and another surface.
 * @module @dsh-portable/crew-ui/client/shell/LeadComposer
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Props of the composer. */
export interface LeadComposerProps {
    readonly sessionId: SessionId;
}
/** Send a message to the session in view. */
export declare function LeadComposer({ sessionId }: LeadComposerProps): import("react").JSX.Element | null;
//# sourceMappingURL=LeadComposer.d.ts.map