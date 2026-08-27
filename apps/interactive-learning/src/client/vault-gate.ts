/**
 * The gate on both in-conversation vault surfaces.
 *
 * Two registrations ride it: the 学习库 tab in `conversation.view`, and the
 * per-message 「留到库里」 action in `conversation.chat.assistant-actions`. Only
 * the first one forces the gate to exist — the action slot is session-scoped
 * and could gate itself — but they answer the same question, and one gate is
 * the only way to guarantee a person never sees the action without the panel
 * it writes into.
 *
 * `conversation.view` is a GLOBAL list slot: `views.list()` walks
 * `slots.entries('conversation.view')` with no session in hand, and the
 * `ViewTab` it builds carries only `{ id, label }`. A registered tab therefore
 * appears above every session, including ordinary code sessions that have
 * nothing to do with learning. The `select` predicate that would gate it is a
 * CHAIN-slot feature; list slots have no equivalent.
 *
 * So the gate lives here instead: register the tab when the active session
 * wants it, dispose the registration when it does not. The tab strip subscribes
 * to the slot ledger's version, so a registration change re-renders it.
 *
 * Two conditions, not one. `isVault(cwd)` alone would lock a learner out of
 * their own on-ramp: the first learning session in a plain folder has no vault
 * yet — the vault is created when material is first attached (`agent.ts`) — so
 * the tab has to be reachable before it exists. The preset condition is what
 * makes the empty state visible at all.
 *
 * Known boundary: the registration is global while the decision is per-session,
 * which is only correct because exactly one session is mounted at a time
 * (`ConversationRoot` takes a single `sessionId`). That is an implementation
 * fact this module leans on, not a contract. The declarative fix belongs
 * upstream — an optional `enabled?: (owner) => boolean` on list-slot options,
 * evaluated inside `viewTabs()` where the session is already in scope.
 * @module @dsh-portable/interactive-learning/src/client/vault-gate
 */

/** Preset id the installer registers the learning experience under. */
export const LEARNING_PRESET_ID = 'learning'

/** The session-row fields the gate reads; a subset of the runtime's SessionSummary. */
export interface GateSessionRow {
  readonly cwd?: string
  readonly agentPreset?: string
  /** Advances when anything happens in the session; re-probes a negative result. */
  readonly updatedAt?: number
}

/** The session-list slice the gate reads. */
export interface GateSessions {
  readonly current: string | undefined
  readonly byId: Readonly<Record<string, GateSessionRow>>
}

/** Everything the gate needs; all injected so the gate is testable without React or a Host. */
export interface VaultGateOptions {
  /** `ctx.sessions.list` — an ObservableSnapshot of the session store. */
  readonly sessions: {
    getSnapshot(): GateSessions
    subscribe(fn: () => void): () => void
  }
  /** Asks the Host whether `cwd` carries `.learning/manifest.json`. */
  probe(cwd: string): Promise<boolean>
  /** Registers both surfaces; the returned function disposes them. */
  mount(): () => void
  /** Test seam: called after each evaluation settles, mounted state included. */
  onSettled?(mounted: boolean): void
}

/**
 * Whether a session wants the vault tab without asking the Host anything.
 *
 * Split out because the preset half of the decision is synchronous: a learning
 * session shows the tab on the very first frame, with no RPC round trip and no
 * flicker. Only the "is this folder already a vault" half can be slow.
 * @param row - The active session's row, or `undefined` when none is selected.
 * @returns true when the preset alone settles it.
 */
export function wantsVaultTabByPreset(row: GateSessionRow | undefined): boolean {
  return row?.agentPreset === LEARNING_PRESET_ID
}

/**
 * Start gating the vault surfaces on the active session.
 *
 * Caching is asymmetric on purpose. A positive probe is cached for the life of
 * the gate: a folder that is a vault stays one, and re-asking on every session
 * switch would spend a round trip to learn nothing. A negative probe is retried
 * whenever that session's `updatedAt` advances, because a vault really is
 * created mid-session — the first time a learner attaches material to a
 * learning turn, `agent.ts` calls `ensureVaultLayout` — and a permanently
 * cached `false` would hide the tab for the rest of the session that just
 * created the folder.
 * @param options - Session source, probe, and the registrations to gate.
 * @returns a disposer that unregisters both surfaces and stops listening.
 */
export function startVaultGate(options: VaultGateOptions): () => void {
  const { sessions, probe, mount, onSettled } = options
  /** `true` is permanent; `false` records the `updatedAt` it was observed at. */
  const known = new Map<string, { vault: boolean; at: number }>()
  let dispose: (() => void) | undefined
  let generation = 0
  let stopped = false

  const apply = (wanted: boolean): void => {
    if (stopped) {
      if (dispose !== undefined) { dispose(); dispose = undefined }
      return
    }
    if (wanted && dispose === undefined) dispose = mount()
    else if (!wanted && dispose !== undefined) { dispose(); dispose = undefined }
    onSettled?.(dispose !== undefined)
  }

  const evaluate = (): void => {
    const current = generation += 1
    const snapshot = sessions.getSnapshot()
    const row = snapshot.current === undefined ? undefined : snapshot.byId[snapshot.current]

    if (wantsVaultTabByPreset(row)) { apply(true); return }

    const cwd = row?.cwd
    if (cwd === undefined || cwd === '') { apply(false); return }

    const cached = known.get(cwd)
    const at = row?.updatedAt ?? 0
    if (cached !== undefined && (cached.vault || cached.at === at)) { apply(cached.vault); return }

    probe(cwd).then((vault) => {
      known.set(cwd, { vault, at })
      // A newer evaluation has already started; its own resolution wins. Without
      // this the answer for a session the learner has since navigated away from
      // could mount a tab over the session they are actually looking at.
      if (current !== generation) return
      apply(vault)
    }).catch(() => {
      // A failed probe is not evidence of a vault. Leave it uncached so the next
      // session update retries, and keep the tab hidden meanwhile.
      if (current !== generation) return
      apply(false)
    })
  }

  const unsubscribe = sessions.subscribe(evaluate)
  evaluate()

  return () => {
    stopped = true
    unsubscribe()
    if (dispose !== undefined) { dispose(); dispose = undefined }
  }
}
