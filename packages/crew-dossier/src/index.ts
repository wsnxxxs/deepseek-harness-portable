/**
 * Host-side Cordis plugin for the mission dossier.
 *
 * Two halves, and the split is the point:
 *
 * - **Model side.** Three read-only tools, registered per agent, so a crew can
 *   ground its work in what the operator attached and cite the exact passage.
 * - **Operator side.** A `/crew-dossier` RPC channel that the DCode Agent
 *   Inspector drives. Attaching a source is the ONLY write, and it happens
 *   here on a path the Host builds.
 *
 * That asymmetry is deliberate. A space is trustworthy because nothing the
 * model controls decides what goes into it or where; giving the model an attach
 * tool would trade that away for convenience it does not need.
 * @module @dsh-portable/crew-dossier
 */

import { isAbsolute, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionRpcResult } from '@deepseek-ai/dsh-client-connection'
import { ingestSource, registerReanchorHook, type ReanchorOutcome } from '@dsh-portable/space-kernel'
import {
  dossierMap, dossierRead, dossierSearch, openDossier, startDossier,
} from './dossier.ts'
import { registerDossierTools, type DossierToolContext } from './tools.ts'

export {
  DOSSIER_DIRECTORY, MAX_HITS, MAX_HIT_CHARS, MAX_READ_CHARS,
  describeUnread, dossierMap, dossierRead, dossierSearch, openDossier, startDossier,
  type DossierPassage, type DossierSource,
} from './dossier.ts'
export { registerDossierTools, type DossierToolContext } from './tools.ts'

/** Stable Cordis plugin name. */
export const name = 'crew-dossier'

/** RPC channel the Dossier panel calls. */
export const DOSSIER_CHANNEL = '/crew-dossier'

/** Endpoints that channel serves. */
export const DOSSIER_ENDPOINTS = ['summary', 'attach', 'search', 'read'] as const

/** One endpoint name. */
export type DossierEndpoint = typeof DOSSIER_ENDPOINTS[number]

/** Narrow an untrusted endpoint string. */
export function isDossierEndpoint(value: string): value is DossierEndpoint {
  return (DOSSIER_ENDPOINTS as readonly string[]).includes(value)
}

/**
 * Uniform envelope, matching this distribution's other private channels.
 *
 * `details` is NOT optional decoration. A Connection handler's return value is
 * the wire `result` verbatim — `rpc-host.ts` passes it straight to
 * `fullResponse` without wrapping — and the browser parser rejects a failure
 * whose `error.details` is not an object, throwing
 * `connection: invalid server-response failure` instead of resolving `ok:
 * false`. A failure without it does not reach the panel as a failure; it
 * reaches it as an exception. `@dsh-portable/dcode-ui`'s Git channel carries
 * the same field for the same reason.
 */
export type DossierResult<T> =
  | { ok: true, value: T }
  | { ok: false, error: { code: string, message: string, details: Record<string, unknown> } }

/**
 * Compile-time proof that this channel answers what Connection carries.
 *
 * A runtime test cannot reach the browser parser from Node — the published
 * client half is a bundled browser module — so the contract is bound here
 * instead, which is the stronger check anyway: dropping `details`, or renaming
 * a field, fails the build rather than a launch. `never` is assignable to
 * nothing, so the assignment only type-checks while `DossierResult` remains a
 * `ConnectionRpcResult`.
 */
const CONNECTION_CONTRACT: ConnectionRpcResult<unknown> | undefined = undefined as
  | DossierResult<unknown>
  | undefined
void CONNECTION_CONTRACT

function failed(
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): DossierResult<never> {
  return { ok: false, error: { code, message, details } }
}

/**
 * Serve one dossier endpoint.
 *
 * `cwd` comes from the caller because a dossier belongs to a workspace, and the
 * browser knows which mission it is showing. Every path below it is built by the
 * kernel and contained, so a caller cannot address anything outside the space.
 * @param endpoint - endpoint name, already narrowed.
 * @param payload - the request body.
 * @returns the envelope the panel renders.
 */
export async function handleDossierEndpoint(
  endpoint: DossierEndpoint,
  payload: unknown,
): Promise<DossierResult<unknown>> {
  const body = (typeof payload === 'object' && payload !== null ? payload : {}) as Record<string, unknown>
  const cwd = typeof body.cwd === 'string' ? body.cwd : undefined

  try {
    switch (endpoint) {
      case 'summary': {
        const vault = await openDossier(cwd)
        // No dossier is an ordinary state, not an error: the panel shows the
        // empty case and its attach control rather than a failure.
        if (vault === undefined) return { ok: true, value: { started: false, sources: [] } }
        return { ok: true, value: { started: true, sources: await dossierMap(vault) } }
      }
      case 'attach': {
        const path = typeof body.path === 'string' ? body.path : undefined
        if (path === undefined) return failed('bad-request', 'attach needs the path of a file to ingest')
        const vault = await startDossier(cwd)
        // `startDossier` has already refused an absent cwd, so the mission's
        // directory is known here. A relative path an operator types into the
        // panel means "relative to the mission I am looking at" — resolving it
        // against the Runtime process's own cwd instead would attach a
        // different file, or none, depending on where the Harness was launched
        // from. An absolute path stays as given: attaching a spec that lives
        // outside the workspace is a legitimate operator action, and the
        // kernel copies what it ingests into the space either way.
        const source = isAbsolute(path) ? path : resolve(cwd as string, path)
        const result = await ingestSource(vault, source)
        return { ok: true, value: result }
      }
      case 'search': {
        const query = typeof body.query === 'string' ? body.query : ''
        const vault = await openDossier(cwd)
        if (vault === undefined) return { ok: true, value: { passages: [] } }
        return { ok: true, value: { passages: await dossierSearch(vault, query) } }
      }
      case 'read': {
        const sourceId = typeof body.sourceId === 'string' ? body.sourceId : undefined
        const sectionId = typeof body.sectionId === 'string' ? body.sectionId : undefined
        if (sourceId === undefined || sectionId === undefined) {
          return failed('bad-request', 'read needs both sourceId and sectionId')
        }
        const vault = await openDossier(cwd)
        if (vault === undefined) return failed('no-dossier', 'this mission has no dossier yet')
        const passage = await dossierRead(vault, sourceId, sectionId)
        return passage === undefined
          ? failed('not-found', `no section ${JSON.stringify(sectionId)} in ${JSON.stringify(sourceId)}`)
          : { ok: true, value: { passage } }
      }
    }
  } catch (error) {
    return failed(
      'dossier-failed',
      error instanceof Error ? error.message : String(error),
      { endpoint },
    )
  }
}

/** The minimum RPC face this plugin needs off the Connection service. */
interface DossierRpcConnection {
  rpc: {
    handle(
      channel: string,
      handler: (endpoint: string, payload: unknown) => Promise<unknown>,
      options: { authority: string },
    ): () => void
  }
}

/**
 * Mount the dossier: the operator channel, the model tools, and the re-anchor
 * pass that keeps existing citations pointing at the right place after a source
 * is re-imported.
 * @param ctx - the injecting cordis context.
 */
export function apply(ctx: Context): void {
  // Citations a surface has pinned move with the text they quote. Registering
  // rather than being called by the pipeline is what lets the kernel serve this
  // package and the teaching pack without importing either.
  ctx.effect(
    () => registerReanchorHook(async (): Promise<ReanchorOutcome> => (
      // Dossier passages are addressed by anchor at read time rather than
      // stored, so nothing of this package's own needs moving yet. The hook is
      // registered anyway so that a pinned-citation feature has a seam already
      // wired, and so an operator's receipt counts this package as reporting.
      { moved: 0, unchanged: 0, stale: 0, recovered: 0 }
    )),
    'crew-dossier: reanchor hook',
  )

  ctx.inject(['connection'], (connectionCtx) => {
    const connection = connectionCtx.get('connection') as DossierRpcConnection | undefined
    if (connection === undefined) return
    connectionCtx.effect(() => connection.rpc.handle(
      DOSSIER_CHANNEL,
      async (endpoint: string, payload: unknown) => {
        if (!isDossierEndpoint(endpoint)) {
          return failed('bad-request', `unknown ${DOSSIER_CHANNEL} endpoint ${JSON.stringify(endpoint)}`)
        }
        return await handleDossierEndpoint(endpoint, payload)
      },
      // The same authority the rest of this distribution's private channels
      // use: this reads and writes inside the operator's own workspace and
      // must not be reachable from an untrusted origin.
      { authority: 'trusted-host' },
    ), 'crew-dossier: rpc channel')
  })

  // The tools are per-agent, so they are registered from the preset row that
  // names this package rather than here; `registerDossierTools` is exported for
  // that mount and takes only the registry it needs.
  ctx.inject(['tools'], (toolCtx) => {
    toolCtx.effect(
      () => registerDossierTools(toolCtx as unknown as DossierToolContext),
      'crew-dossier: model tools',
    )
  })
}
