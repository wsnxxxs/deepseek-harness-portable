/**
 * Typed browser face of the `/dcode` channel.
 *
 * The host half answers with the `{ ok, value } | { ok, error }` envelope, so
 * this module's job is to keep every caller off `unknown` and to turn a
 * transport rejection into the same envelope a business refusal produces —
 * a Git panel must degrade to an explanatory empty state, never to a crash.
 * @module @dsh-portable/dcode-ui/client/rpc
 */

import type { DcodeEndpoint, DcodeResult } from '../host/rpc.ts'
import type {
  GitBranch, GitCommitResult, GitDiff, GitRestoreOutcome, GitStageResult, GitStatus,
} from '../host/git.ts'

export type { GitBranch, GitCommitResult, GitDiff, GitFileChange, GitRestoreOutcome, GitStageResult, GitStatus } from '../host/git.ts'

/** The Connection RPC face this module needs. */
export interface RpcCarrier {
  rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<unknown> }
}

/** One bounded file read for the details pane. */
export interface FileRead {
  readonly path: string
  readonly size: number
  readonly truncated: boolean
  readonly binary: boolean
  readonly text: string
}

const CHANNEL = '/dcode'

/** The refusal arm of the envelope, named so its `error` stays reachable after narrowing. */
type DcodeFailure = Extract<DcodeResult<never>, { ok: false }>

function transportFailure(message: string): DcodeFailure {
  return { ok: false, error: { code: 'unavailable', message, details: {} } }
}

/**
 * Narrow an untyped answer to the envelope, so a protocol drift surfaces as a
 * refusal rather than as an undefined field deep inside a component.
 */
function envelope<T>(answer: unknown): DcodeResult<T> {
  if (typeof answer !== 'object' || answer === null) return transportFailure('malformed /dcode answer')
  const value = answer as { ok?: unknown; value?: unknown; error?: unknown }
  if (value.ok === true) return { ok: true, value: value.value as T }
  if (value.ok === false && typeof value.error === 'object' && value.error !== null) {
    return { ok: false, error: value.error as DcodeFailure['error'] }
  }
  return transportFailure('malformed /dcode answer')
}

/** The workbench's Git and file capabilities. */
export interface DcodeApi {
  /** Whether a Connection carrier was available when the client was created. */
  readonly available: boolean
  status(cwd: string): Promise<DcodeResult<GitStatus>>
  diff(cwd: string, path: string, staged?: boolean): Promise<DcodeResult<GitDiff>>
  branches(cwd: string): Promise<DcodeResult<{ branches: readonly GitBranch[] }>>
  stage(cwd: string, paths: readonly string[]): Promise<DcodeResult<GitStageResult>>
  unstage(cwd: string, paths: readonly string[]): Promise<DcodeResult<GitStageResult>>
  commit(cwd: string, message: string): Promise<DcodeResult<GitCommitResult>>
  undo(cwd: string, paths: readonly string[]): Promise<DcodeResult<{ outcomes: readonly GitRestoreOutcome[] }>>
  undoHunk(cwd: string, path: string, patch: string, staged?: boolean): Promise<DcodeResult<{ outcomes: readonly GitRestoreOutcome[] }>>
  readFile(cwd: string, path: string): Promise<DcodeResult<FileRead>>
}

/**
 * Build the channel client.
 * @param carrier - the Connection service, absent on a page without one.
 * @returns a client that refuses every call when no carrier exists.
 */
export function createDcodeApi(carrier: RpcCarrier | undefined): DcodeApi {
  const call = async <T>(endpoint: DcodeEndpoint, payload: Record<string, unknown>): Promise<DcodeResult<T>> => {
    if (carrier === undefined) return transportFailure('the /dcode channel is unavailable on this connection')
    try {
      return envelope<T>(await carrier.rpc.call(CHANNEL, endpoint, payload))
    } catch (cause) {
      return transportFailure(cause instanceof Error ? cause.message : String(cause))
    }
  }
  return {
    available: carrier !== undefined,
    status: cwd => call('git/status', { cwd }),
    diff: (cwd, path, staged = false) => call('git/diff', { cwd, path, staged }),
    branches: cwd => call('git/branches', { cwd }),
    stage: (cwd, paths) => call('git/stage', { cwd, paths }),
    unstage: (cwd, paths) => call('git/unstage', { cwd, paths }),
    commit: (cwd, message) => call('git/commit', { cwd, message }),
    undo: (cwd, paths) => call('git/undo', { cwd, paths }),
    undoHunk: (cwd, path, patch, staged = false) => call('git/undo', { cwd, path, patch, staged }),
    readFile: (cwd, path) => call('file/read', { cwd, path }),
  }
}

/**
 * The learning channel's browser face, reused verbatim from the existing
 * Interactive Learning host broker: the workbench's learning surfaces call
 * the very same endpoints the official UI's learning views call, so there is
 * exactly one learning backend and one vault state.
 * @param carrier - the Connection service.
 * @returns an endpoint caller, or one that rejects when no carrier exists.
 */
export function createLearningCall(
  carrier: RpcCarrier | undefined,
): (endpoint: string, payload: Record<string, unknown>) => Promise<unknown> {
  return async (endpoint, payload) => {
    if (carrier === undefined) throw new Error('the learning channel is unavailable on this connection')
    return await carrier.rpc.call('/interactive-learning', endpoint, payload)
  }
}
