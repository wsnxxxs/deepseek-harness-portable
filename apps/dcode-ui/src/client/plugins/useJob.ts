/**
 * Install, update, enable and uninstall as one tracked operation per plugin.
 *
 * Every mutating marketplace route answers the same two ways: an async Host
 * hands back a job id to poll, an older synchronous one answers the outcome
 * directly. Callers should not care which, so both shapes settle into the
 * same {@link Operation} here, keyed by whatever the caller identifies the row
 * by — a repository name in the catalogue, a package name in the inventory.
 *
 * Polling lives with the operation rather than with the card so a row that
 * scrolls out of view, or a section the operator switches away from, keeps its
 * install running; the intervals are owned by this hook and cleared when the
 * surface unmounts.
 * @module @dsh-portable/dcode-ui/client/plugins/useJob
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InstallJob, MarketClient, MarketResult } from './market.ts'

/** How often a running job is polled, matching the Host's own tick budget. */
const POLL_INTERVAL_MS = 500

/**
 * Consecutive failed polls before the operation is reported as lost.
 *
 * A single failure is ordinary network noise and the next tick recovers from
 * it, but a poll that never succeeds again must not leave a row spinning
 * forever — so ten seconds of silence ends it with a reason instead.
 */
const POLL_FAILURE_LIMIT = 20

/** Where one tracked operation has got to. */
export type OperationStatus = 'running' | 'done' | 'failed'

/** One mutating call in flight, or its outcome. */
export interface Operation {
  readonly status: OperationStatus
  /** Live progress, present only while an async Host is working. */
  readonly job: InstallJob | undefined
  readonly jobId: string | undefined
  readonly error: string | undefined
  /** Installer output, kept after a failure so the reason stays readable. */
  readonly output: string
}

/** The operation table and the two verbs that drive it. */
export interface OperationRunner {
  readonly operations: Readonly<Record<string, Operation>>
  /**
   * Run one mutating call and track it to completion.
   * @param key - the row this operation belongs to.
   * @param call - the marketplace verb, already bound to its arguments.
   * @param onSuccess - run once the operation has succeeded.
   */
  start(
    key: string,
    call: () => Promise<MarketResult<string | undefined>>,
    onSuccess?: () => void,
  ): void
  /** Ask the Host to abort a running job. */
  cancel(key: string): void
}

/**
 * Track marketplace operations for one surface.
 * @param client - the marketplace client.
 * @returns the operation table and its verbs.
 */
export function useOperations(client: MarketClient): OperationRunner {
  const [operations, setOperations] = useState<Readonly<Record<string, Operation>>>({})
  // Intervals outlive individual renders and must be cleared on unmount, so
  // they are held in a ref rather than in state.
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>())
  const live = useRef(true)

  useEffect(() => {
    const pending = timers.current
    live.current = true
    return () => {
      live.current = false
      for (const timer of pending.values()) clearInterval(timer)
      pending.clear()
    }
  }, [])

  const put = useCallback((key: string, operation: Operation) => {
    if (!live.current) return
    setOperations(previous => ({ ...previous, [key]: operation }))
  }, [])

  const stopTimer = useCallback((key: string) => {
    const timer = timers.current.get(key)
    if (timer === undefined) return
    clearInterval(timer)
    timers.current.delete(key)
  }, [])

  const poll = useCallback((key: string, jobId: string, onSuccess?: () => void) => {
    stopTimer(key)
    let failures = 0
    const timer = setInterval(() => {
      void client.job(jobId).then((answer) => {
        if (!live.current) return
        if (!answer.ok) {
          // A job the Host cannot find is gone for good. Anything else is
          // treated as network noise the next tick recovers from, until it
          // has gone on long enough to be a fault rather than a hiccup.
          failures += 1
          if (!answer.unavailable && failures < POLL_FAILURE_LIMIT) return
          stopTimer(key)
          put(key, { status: 'failed', job: undefined, jobId, error: answer.error, output: '' })
          return
        }
        failures = 0
        const job = answer.value
        if (!job.done) {
          put(key, { status: 'running', job, jobId, error: undefined, output: job.output })
          return
        }
        stopTimer(key)
        put(key, {
          status: job.ok ? 'done' : 'failed',
          job,
          jobId,
          error: job.ok ? undefined : job.error,
          output: job.output,
        })
        if (job.ok) onSuccess?.()
      }).catch((cause: unknown) => {
        if (!live.current) return
        failures += 1
        if (failures >= POLL_FAILURE_LIMIT) {
          stopTimer(key)
          put(key, {
            status: 'failed',
            job: undefined,
            jobId,
            error: cause instanceof Error ? cause.message : String(cause),
            output: '',
          })
        }
      })
    }, POLL_INTERVAL_MS)
    timers.current.set(key, timer)
  }, [client, put, stopTimer])

  const start = useCallback((
    key: string,
    call: () => Promise<MarketResult<string | undefined>>,
    onSuccess?: () => void,
  ) => {
    put(key, { status: 'running', job: undefined, jobId: undefined, error: undefined, output: '' })
    void call().then((answer) => {
      if (!live.current) return
      if (!answer.ok) {
        put(key, { status: 'failed', job: undefined, jobId: undefined, error: answer.error, output: '' })
        return
      }
      const jobId = answer.value
      if (jobId === undefined) {
        // A synchronous Host has already finished by the time it answers.
        put(key, { status: 'done', job: undefined, jobId: undefined, error: undefined, output: '' })
        onSuccess?.()
        return
      }
      put(key, { status: 'running', job: undefined, jobId, error: undefined, output: '' })
      poll(key, jobId, onSuccess)
    }).catch((cause: unknown) => {
      if (!live.current) return
      put(key, {
        status: 'failed',
        job: undefined,
        jobId: undefined,
        error: cause instanceof Error ? cause.message : String(cause),
        output: '',
      })
    })
  }, [poll, put])

  const cancel = useCallback((key: string) => {
    const jobId = operations[key]?.jobId
    if (jobId === undefined) return
    void client.cancel(jobId)
  }, [client, operations])

  return { operations, start, cancel }
}
