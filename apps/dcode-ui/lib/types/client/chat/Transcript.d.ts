/**
 * The conversation column.
 *
 * Nodes come from the Chat target the official UI assembles — the very same
 * `ConversationNode` stream, projections and streaming partial — so a session
 * opened in one surface and continued in the other shows one history. What
 * differs is the presentation: a turn-level process disclosure, a file-change
 * summary closing each turn, and a reading column instead of a full-width
 * flow.
 * @module @dsh-portable/dcode-ui/client/chat/Transcript
 */
import { type SessionId } from '@deepseek-ai/dsh-session/types';
import type { NavigationStore } from '../state/navigation.ts';
/** Props of the conversation column. */
export interface TranscriptProps {
    readonly navigation: NavigationStore;
    readonly sessionId: SessionId | undefined;
    readonly cwd: string | undefined;
    /**
     * The frame's blank phase. Owned above so the greeting here and the
     * composer's centring below cannot disagree about which phase they are in.
     */
    readonly blank: boolean;
    /** Compact frames suppress the edge rail so it cannot cover the transcript. */
    readonly compact?: boolean;
}
/** The scrolling conversation, its turn summaries and its streaming tail. */
export declare function Transcript({ navigation, sessionId, cwd, blank, compact }: TranscriptProps): import("react").JSX.Element;
//# sourceMappingURL=Transcript.d.ts.map