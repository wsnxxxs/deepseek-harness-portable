/**
 * The chat-first conversation body.
 *
 * The Host still owns the conversation projection. This component only maps
 * that projection to Metis' visual rhythm: a centred message lane, right-sided
 * user bubbles, assistant turns, and compact work rows between answers.
 * @module @dsh-portable/crew-ui/client/shell/ThreadView
 */
import type { SessionId } from '@deepseek-ai/dsh-session/types';
/** Props of the thread view. */
export interface ThreadViewProps {
    readonly sessionId: SessionId | undefined;
}
/** The conversation log for one session. */
export declare function ThreadView({ sessionId }: ThreadViewProps): import("react").JSX.Element;
//# sourceMappingURL=ThreadView.d.ts.map