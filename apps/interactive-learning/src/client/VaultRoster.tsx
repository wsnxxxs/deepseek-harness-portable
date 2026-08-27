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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { learningScope } from './tokens.ts'
import css from './VaultView.module.css'

/** One vault, as `vault-rpc.ts` projects it for this list. */
export interface RosterVault {
  cwd: string
  title: string
  root: string
  sources: number
  concepts: number
  notes: number
  due: number
  blocked: number
}

export interface Roster { status: string; vaults: RosterVault[]; due: number }

type VaultRosterRefreshListener = () => void
const rosterRefreshListeners = new Set<VaultRosterRefreshListener>()

/** Ask mounted roster entries to reload their due counts after a vault write. */
export function notifyVaultRosterRefresh(): void {
  for (const listener of rosterRefreshListeners) listener()
}

function subscribeVaultRosterRefresh(listener: VaultRosterRefreshListener): () => void {
  rosterRefreshListeners.add(listener)
  return () => { rosterRefreshListeners.delete(listener) }
}

/** Business face supplied by the slot registration. */
export interface VaultRosterInjected {
  /** One Connection RPC call on the `/interactive-learning` channel. */
  call: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>
  /** Select an existing session; the shell's `sessions.open`. */
  openSession: (sessionId: string) => void
}

type VaultRosterProps = PropsRuntime<'sidebar.footer.action'>
  & InjectFace<VaultRosterInjected>
  & PropsLocale<'interactive-learning'>

/** Folders asked about in one call; the Host caps this again on its side. */
const MAX_CANDIDATES = 24

interface SessionRow { cwd?: string; updatedAt?: number }

/**
 * Candidate folders, most recently touched first.
 *
 * One entry per distinct `cwd`, carrying the newest session in that folder —
 * which is the session a click should land on. Ordering by recency means the
 * cap, when it bites, drops the topics a person has not opened in the longest
 * time rather than an arbitrary slice.
 */
export function candidateFolders(
  ids: readonly string[],
  byId: Readonly<Record<string, SessionRow>>,
): { cwd: string; sessionId: string; updatedAt: number }[] {
  const newest = new Map<string, { cwd: string; sessionId: string; updatedAt: number }>()
  for (const id of ids) {
    const row = byId[id]
    const cwd = row?.cwd
    if (cwd === undefined || cwd === '') continue
    const updatedAt = row?.updatedAt ?? 0
    const existing = newest.get(cwd)
    if (existing === undefined || updatedAt > existing.updatedAt) {
      newest.set(cwd, { cwd, sessionId: id, updatedAt })
    }
  }
  return [...newest.values()]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_CANDIDATES)
}

function shaped<T>(value: unknown): T | undefined {
  return typeof value === 'object' && value !== null ? value as T : undefined
}

function unwrap<T>(answer: unknown): T | undefined {
  const record = shaped<{ ok?: unknown; value?: unknown }>(answer)
  if (record?.ok !== true) return undefined
  return shaped<T>(record.value)
}

/**
 * The sidebar entry.
 *
 * Renders nothing at all until the roster comes back with at least one vault.
 * An entry that showed "0 topics" in every ordinary install would be a
 * permanent advertisement for a feature the person is not using.
 */
export function VaultRosterAction({
  wide, useSessions, call, openSession, t,
}: VaultRosterProps) {
  const ids = useSessions(state => state.ids)
  const byId = useSessions(state => state.byId)
  const [roster, setRoster] = useState<Roster | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const live = useRef(true)

  useEffect(() => () => { live.current = false }, [])
  useEffect(() => subscribeVaultRosterRefresh(() => {
    setRefreshVersion(value => value + 1)
  }), [])

  const candidates = useMemo(
    () => candidateFolders(ids as readonly string[], byId as Readonly<Record<string, SessionRow>>),
    [ids, byId],
  )

  const sessionFor = useCallback(
    (cwd: string) => candidates.find(entry => entry.cwd === cwd)?.sessionId,
    [candidates],
  )

  // Keyed on the folder list and explicit vault writes rather than on a timer.
  const key = candidates.map(entry => `${entry.cwd}@${String(entry.updatedAt)}`).join('|')
  useEffect(() => {
    if (candidates.length === 0) { setRoster(undefined); return }
    let cancelled = false
    void (async () => {
      const answer = unwrap<Roster>(await call('vault/roster', {
        cwds: candidates.map(entry => entry.cwd),
      }))
      if (cancelled || !live.current) return
      setRoster(answer)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` summarizes `candidates`.
  }, [call, key, refreshVersion])

  if (roster === undefined || roster.vaults.length === 0) return null

  return (
    <div {...learningScope} className={css.rosterRoot}>
      <button
        type="button"
        className={css.rosterTrigger}
        aria-expanded={open}
        title={t('vaultRosterTitle')}
        onClick={() => { setOpen(value => !value) }}
      >
        <span className={css.rosterMark} aria-hidden="true">◧</span>
        {wide && <span className={css.rosterLabel}>{t('vaultTab')}</span>}
        {roster.due > 0 && (
          <span className={css.railDue}>{String(roster.due)}</span>
        )}
      </button>

      {open && (
        <div className={css.rosterSheet}>
          <p className={css.groupTitle}>
            {t('vaultRosterTitle')}
            <span className={css.groupCount}>{roster.vaults.length}</span>
          </p>
          <ul className={css.rosterList}>
            {roster.vaults.map((vault) => {
              const sessionId = sessionFor(vault.cwd)
              return (
                <li key={vault.cwd}>
                  <button
                    type="button"
                    className={css.rosterRow}
                    disabled={sessionId === undefined}
                    onClick={() => {
                      if (sessionId === undefined) return
                      openSession(sessionId)
                      setOpen(false)
                    }}
                  >
                    <span className={css.rosterName}>{vault.title}</span>
                    <span className={css.rosterCounts}>
                      {vault.due > 0 && <span className={css.railDue}>{String(vault.due)}</span>}
                      <span className={css.railCount}>
                        {t('vaultRosterRow', {
                          concepts: String(vault.concepts),
                          notes: String(vault.notes),
                        })}
                      </span>
                    </span>
                  </button>
                  {vault.blocked > 0 && (
                    <p className={css.rosterNote}>
                      {t('vaultPendingCount', { count: String(vault.blocked) })}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
          <p className={css.local}>{t('vaultRosterLocal')}</p>
        </div>
      )}
    </div>
  )
}
