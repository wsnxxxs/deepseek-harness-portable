/**
 * Working-tree status for the panels that show it.
 *
 * Three surfaces read this at once — the top bar's branch chip, the Changes
 * panel, and every turn's file-change card — so the read is shared per
 * workspace rather than issued per component: one `git status` subprocess
 * answers all of them, and they cannot disagree about the branch.
 *
 * It is refreshed on the events that actually change a work tree: the end of
 * an agent turn, an explicit refresh, a commit, an undo, and the window
 * regaining focus. There is no polling loop — a workbench left open on a quiet
 * workspace issues no git processes at all.
 * @module @dsh-portable/zcode-ui/client/git/useGit
 */

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime, type ZcodeRuntime } from '../state/runtime.ts'
import { useSessionSnapshot } from '../state/hooks.ts'
import type { GitStatus } from '../rpc.ts'

/** The shared read for one workspace. */
interface StatusRecord {
  status: GitStatus | undefined
  /** True until the first answer for this workspace lands. */
  pending: boolean
  error: string | undefined
  inflight: Promise<void> | undefined
  /** A forced refresh requested while the current read is still settling. */
  wanted: boolean
  cleanupTimer: ReturnType<typeof setTimeout> | undefined
  readonly listeners: Set<() => void>
  /** Replaced on every settle so `useSyncExternalStore` sees a new snapshot. */
  snapshot: GitSnapshot
}

/** What a consumer reads. */
export interface GitSnapshot {
  readonly status: GitStatus | undefined
  /** True while a read is outstanding, including the first one. */
  readonly loading: boolean
  /** True until the first answer lands — distinct from "answered: not a repository". */
  readonly pending: boolean
  readonly error: string | undefined
}

const EMPTY: GitSnapshot = { status: undefined, loading: false, pending: true, error: undefined }

/** One record per workspace directory, shared by every consumer of that directory. */
const records = new Map<string, StatusRecord>()

function recordFor(cwd: string): StatusRecord {
  const existing = records.get(cwd)
  if (existing !== undefined) return existing
  const created: StatusRecord = {
    status: undefined,
    pending: true,
    error: undefined,
    inflight: undefined,
    wanted: false,
    cleanupTimer: undefined,
    listeners: new Set(),
    snapshot: { status: undefined, loading: true, pending: true, error: undefined },
  }
  records.set(cwd, created)
  return created
}

function publish(record: StatusRecord): void {
  record.snapshot = {
    status: record.status,
    loading: record.inflight !== undefined,
    pending: record.pending,
    error: record.error,
  }
  for (const listener of [...record.listeners]) listener()
}

/**
 * Read one workspace's status, collapsing concurrent callers onto one request.
 * @param runtime - the workbench runtime carrying the `/zcode` client.
 * @param cwd - absolute workspace directory.
 * @param force - start a fresh read even when one already answered.
 */
function load(runtime: ZcodeRuntime, cwd: string, force: boolean): void {
  const record = recordFor(cwd)
  if (record.inflight !== undefined) {
    if (force) record.wanted = true
    return
  }
  if (!force && !record.pending) return
  record.inflight = runtime.git.status(cwd).then((result) => {
    if (result.ok) {
      record.status = result.value
      record.error = undefined
    } else {
      record.status = undefined
      record.error = result.error.message
    }
  }).catch((cause: unknown) => {
    record.status = undefined
    record.error = cause instanceof Error ? cause.message : String(cause)
  }).finally(() => {
    const wanted = record.wanted
    record.wanted = false
    record.inflight = undefined
    record.pending = false
    publish(record)
    if (wanted) load(runtime, cwd, true)
  })
  publish(record)
}

/** The status read plus its lifecycle. */
export interface GitState extends GitSnapshot {
  /** True when the connection has no `/zcode` channel at all. */
  readonly unavailable: boolean
  /** Re-read the working tree now, for every consumer of this workspace. */
  readonly refresh: () => void
}

/**
 * Read one workspace's git status.
 * @param cwd - absolute workspace directory, or undefined with no session selected.
 * @param sessionId - session whose turn boundaries trigger a refresh.
 */
export function useGitStatus(cwd: string | undefined, sessionId: SessionId | undefined): GitState {
  const runtime = useRuntime()
  const session = useSessionSnapshot(sessionId)

  const record = useMemo(() => cwd === undefined ? undefined : recordFor(cwd), [cwd])

  const subscribe = useCallback((listener: () => void) => {
    if (cwd === undefined || record === undefined) return () => {}
    if (record.cleanupTimer !== undefined) {
      clearTimeout(record.cleanupTimer)
      record.cleanupTimer = undefined
    }
    record.listeners.add(listener)
    return () => {
      record.listeners.delete(listener)
      if (record.listeners.size > 0) return
      // Keep a recently visited workspace warm. Switching back should not
      // flash pending or immediately issue another git process.
      record.cleanupTimer = setTimeout(() => {
        record.cleanupTimer = undefined
        if (record.listeners.size === 0 && record.inflight === undefined) records.delete(cwd)
      }, 30_000)
    }
  }, [cwd, record])

  const getSnapshot = useCallback(
    () => record?.snapshot ?? EMPTY,
    [record],
  )
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const refresh = useCallback(() => {
    if (cwd !== undefined) load(runtime, cwd, true)
  }, [runtime, cwd])

  // First read for a workspace nobody has looked at yet.
  useEffect(() => {
    if (cwd !== undefined) load(runtime, cwd, false)
  }, [runtime, cwd])

  // A turn that just finished is the moment the work tree most likely changed.
  const running = session?.running ?? false
  const previousRunning = useRef(running)
  useEffect(() => {
    if (previousRunning.current && !running) refresh()
    previousRunning.current = running
  }, [running, refresh])

  // A workspace edited outside the app (an editor, a terminal) shows up when
  // the operator comes back to the window.
  useEffect(() => {
    if (cwd === undefined) return undefined
    const onFocus = (): void => { refresh() }
    globalThis.addEventListener?.('focus', onFocus)
    return () => { globalThis.removeEventListener?.('focus', onFocus) }
  }, [cwd, refresh])

  return useMemo(
    () => ({ ...snapshot, unavailable: !runtime.git.available, refresh }),
    [snapshot, runtime, refresh],
  )
}
