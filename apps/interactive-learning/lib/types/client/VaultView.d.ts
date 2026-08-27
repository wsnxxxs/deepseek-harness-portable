/**
 * The vault panel: a window onto the topic folder, not another view of the chat.
 *
 * Four sections behind one rail: material (read-only), saved notes (free
 * Markdown, plus the pending-card inbox), concept cards (prose edits and two
 * narrow schedule outlets) and review (a local deck). The ordinary browse,
 * edit and review actions are Host-side file I/O over the selected vault; the
 * material pane also exposes an explicit visual re-read that calls a model.
 * @module @dsh-portable/interactive-learning/src/client/VaultView
 */
import type { ConvViewProps } from '@deepseek-ai/dsh-client-ui-conversation/client';
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
/** Business face supplied by the slot registration. */
export interface VaultViewInjected {
    /** The selected working directory; the vault is this folder. */
    cwd: string | undefined;
    /** One Connection RPC call on the `/interactive-learning` channel. */
    call: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>;
}
type VaultViewProps = ConvViewProps & InjectFace<VaultViewInjected> & PropsLocale<'interactive-learning'>;
/** Reusable library surface for both the settings-style external panel and legacy view consumers. */
export interface VaultLibraryProps {
    cwd: string | undefined;
    call: VaultViewInjected['call'];
    t: VaultViewProps['t'];
    /** Optional close action supplied by the external library shell. */
    onClose?: () => void;
}
/**
 * The panel.
 *
 * Every fetch keys off the session's `cwd`. A session whose folder is not a
 * vault gets the `no-vault` screen rather than an error: for a learning session
 * that is simply the state before the first attachment, and the screen's job is
 * to say how the folder becomes one.
 *
 * Concepts and the review queue are fetched with the summary rather than lazily
 * per section, because the rail badges the due count — the number has to be
 * right before anyone clicks "review" to find out.
 */
export declare function VaultLibrary({ cwd, call, t, onClose }: VaultLibraryProps): import("react").JSX.Element;
/** Legacy conversation-view adapter; the long-term library now renders outside the session. */
export declare function VaultView({ cwd, call, t }: VaultViewProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=VaultView.d.ts.map