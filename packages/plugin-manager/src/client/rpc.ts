/**
 * Typed browser face of the `/portable-plugins` channel.
 *
 * The host answers with the `{ ok, value } | { ok, error }` envelope; this
 * module's job is to keep the tab off `unknown` and to turn a transport
 * rejection into the same envelope a business refusal produces, so a settings
 * page degrades to an explanatory empty state rather than a crash.
 * @module @dsh-portable/plugin-manager/client/rpc
 */

import {
  PORTABLE_PLUGINS_CHANNEL,
  type PortablePluginList,
  type PortablePluginResult,
  type PortablePluginToggle,
} from '../host/contract.ts'

/** The Connection RPC face this module needs. */
export interface RpcCarrier {
  rpc: { call(channel: string, endpoint: string, payload: unknown): Promise<unknown> }
}

/** The built-in feature roster, as the settings tab consumes it. */
export interface PortablePluginApi {
  /** Whether a Connection carrier was available when this face was created. */
  readonly available: boolean
  list(): Promise<PortablePluginResult<PortablePluginList>>
  setEnabled(name: string, enabled: boolean): Promise<PortablePluginResult<PortablePluginToggle>>
}

function transportFailure(message: string): PortablePluginResult<never> {
  return { ok: false, error: { code: 'unavailable', message, details: {} } }
}

/** Narrow an untyped answer so protocol drift surfaces as a refusal. */
function envelope<T>(answer: unknown): PortablePluginResult<T> {
  if (typeof answer !== 'object' || answer === null) return transportFailure('malformed /portable-plugins answer')
  const value = answer as { ok?: unknown; value?: unknown; error?: unknown }
  if (value.ok === true) return { ok: true, value: value.value as T }
  if (value.ok === false && typeof value.error === 'object' && value.error !== null) {
    return { ok: false, error: value.error as Extract<PortablePluginResult<never>, { ok: false }>['error'] }
  }
  return transportFailure('malformed /portable-plugins answer')
}

/**
 * Build the browser face over one Connection carrier.
 * @param carrier - the connection service, or undefined when none is present.
 * @returns the typed API.
 */
export function createPortablePluginApi(carrier: RpcCarrier | undefined): PortablePluginApi {
  const call = async <T>(endpoint: string, payload: Record<string, unknown>): Promise<PortablePluginResult<T>> => {
    if (carrier === undefined) return transportFailure('the /portable-plugins channel is unavailable on this connection')
    try {
      return envelope<T>(await carrier.rpc.call('/api', `${PORTABLE_PLUGINS_CHANNEL.slice(1)}/${endpoint}`, payload))
    } catch (cause) {
      return transportFailure(cause instanceof Error ? cause.message : String(cause))
    }
  }
  return {
    available: carrier !== undefined,
    list: () => call<PortablePluginList>('list', {}),
    setEnabled: (name, enabled) => call<PortablePluginToggle>('set-enabled', { name, enabled }),
  }
}
