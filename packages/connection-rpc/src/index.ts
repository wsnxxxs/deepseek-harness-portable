import type { Context } from '@deepseek-ai/cordis'
import { clientRequestSchema, type HostConnectionHandle } from '@deepseek-ai/dsh-client-connection'

/** Exact plugin routes on the official authenticated API carrier. The shared
 * RPC interceptor belongs to Gateway; extensions register their own routes. */
export function registerRpc(
  ctx: Context, prefix: string, endpoints: readonly string[],
  handler: (endpoint: string, payload: unknown, signal: AbortSignal) => Promise<unknown>,
): () => Promise<void> {
  const connection = ctx.connection as HostConnectionHandle
  const disposers = endpoints.map(endpoint => {
    const method = prefix + '/' + endpoint
    return connection.fetch.register({
      path: '/api/' + method, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        const parsed = clientRequestSchema.safeParse(await request.json())
        if (!parsed.success || parsed.data.method !== method) return new Response('invalid RPC envelope', { status: 400 })
        const result = await handler(endpoint, parsed.data.payload, request.signal)
        return Response.json({ type: 'server-response', rpcId: parsed.data.rpcId, result })
      },
    })
  })
  return async () => { await Promise.all(disposers.map(dispose => dispose())) }
}
