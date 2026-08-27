/**
 * The out-of-session entry: 学习库 at the sidebar foot.
 *
 * The panel and the keep action both live inside a conversation, which leaves
 * the most ordinary case unserved — a person opens the app, is not in a
 * learning session, and has no way to find out that four cards are due. This
 * entry is that answer, and `sidebar.footer.action` is the only root-scope
 * list slot in the shell, so it is the only seat where it can sit.
 *
 * It is NOT gated on the learning preset. A gate is what keeps the in-session
 * surfaces out of ordinary code sessions; out here there is no session to gate
 * on, and the entry disappears on its own when the roster comes back empty —
 * which is the same outcome, reached from data rather than from a guess.
 *
 * The CLIENT chooses the candidate folders, from the session list it already
 * renders, and the Host answers only for the ones that are vaults. That keeps
 * the Host from enumerating a person's directories, and keeps this entry from
 * listing their unrelated code projects.
 *
 * The `sidebar.workspaces` slot would be the better home for a per-topic badge
 * — "今天到期 4 张" beside the workspace row itself — but that slot is a single
 * root-scope seat occupied wholesale by `WorkspaceBrowser`, with no row-level
 * extension point. Until one exists, the foot is where this fits.
 * @module @dsh-portable/interactive-learning/src/client/VaultRoster
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** One vault, as `vault-rpc.ts` projects it for this list. */
export interface RosterVault {
    cwd: string;
    title: string;
    root: string;
    sources: number;
    concepts: number;
    notes: number;
    due: number;
    blocked: number;
}
export interface Roster {
    status: string;
    vaults: RosterVault[];
    due: number;
}
/** Ask mounted roster entries to reload their due counts after a vault write. */
export declare function notifyVaultRosterRefresh(): void;
/** Business face supplied by the slot registration. */
export interface VaultRosterInjected {
    /** One Connection RPC call on the `/interactive-learning` channel. */
    call: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>;
    /** Select an existing session; the shell's `sessions.open`. */
    openSession: (sessionId: string) => void;
}
type VaultRosterProps = PropsRuntime<'sidebar.footer.action'> & InjectFace<VaultRosterInjected> & PropsLocale<'interactive-learning'>;
interface SessionRow {
    cwd?: string;
    updatedAt?: number;
}
/**
 * Candidate folders, most recently touched first.
 *
 * One entry per distinct `cwd`, carrying the newest session in that folder —
 * which is the session a click should land on. Ordering by recency means the
 * cap, when it bites, drops the topics a person has not opened in the longest
 * time rather than an arbitrary slice.
 */
export declare function candidateFolders(ids: readonly string[], byId: Readonly<Record<string, SessionRow>>): {
    cwd: string;
    sessionId: string;
    updatedAt: number;
}[];
/**
 * The sidebar entry.
 *
 * Renders nothing at all until the roster comes back with at least one vault.
 * An entry that showed "0 topics" in every ordinary install would be a
 * permanent advertisement for a feature the person is not using.
 */
export declare function VaultRosterAction({ wide, useSessions, call, openSession, t, }: VaultRosterProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=VaultRoster.d.ts.map