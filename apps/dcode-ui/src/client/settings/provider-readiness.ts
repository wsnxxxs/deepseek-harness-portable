import type { CredentialInfo } from '@deepseek-ai/dsh-api-remotes/client'

/** Facts available from the provider, settings, and credential Remotes. */
export interface ProviderReadinessFacts {
  readonly active: boolean
  readonly configured: boolean
  readonly requiresApiKey: boolean | undefined
  readonly credential: CredentialInfo | undefined
  readonly credentialError?: string
  readonly providerError?: string
  readonly configurationError?: string
}

export type ProviderReadinessReason =
  | 'missing-api-key'
  | 'not-configured'
  | 'credential-configured'
  | 'key-not-required'
  | 'credential-error'
  | 'provider-error'
  | 'configuration-error'

/** A keyless route is deliberately neutral rather than a fourth green success state. */
export interface ProviderReadiness {
  readonly kind: 'unconfigured' | 'ready' | 'error' | 'keyless'
  readonly reason: ProviderReadinessReason
  readonly detail?: string
}

export interface ProviderDisplayFacts {
  readonly id: string
  readonly profile: Record<string, unknown> | undefined
  readonly credential: CredentialInfo | undefined
}

/**
 * Hide the generic pi-ai DeepSeek placeholder when the dedicated official
 * provider is present. An explicitly configured generic route remains visible.
 */
export function visibleProviderRows<Row extends ProviderDisplayFacts>(rows: readonly Row[]): Row[] {
  if (!rows.some(row => row.id === 'deepseek-official')) return [...rows]
  return rows.filter(row => row.id !== 'deepseek'
    || row.profile !== undefined
    || row.credential?.configured === true)
}

/**
 * Derive the one status rendered by provider lists and editors.
 * `active` only means that an adapter route is registered; it never proves a
 * connection. With no connection probe on the Runtime, green therefore means
 * only that a registered, error-free route has its required credential.
 */
export function providerReadiness(facts: ProviderReadinessFacts): ProviderReadiness {
  if (facts.configurationError !== undefined) {
    return { kind: 'error', reason: 'configuration-error', detail: facts.configurationError }
  }
  if (facts.providerError !== undefined) {
    return { kind: 'error', reason: 'provider-error', detail: facts.providerError }
  }
  if (facts.requiresApiKey !== false && facts.credentialError !== undefined) {
    return { kind: 'error', reason: 'credential-error', detail: facts.credentialError }
  }
  if (!facts.configured || facts.requiresApiKey === undefined) {
    return { kind: 'unconfigured', reason: 'not-configured' }
  }
  if (facts.requiresApiKey) {
    if (facts.credential === undefined) {
      return { kind: 'error', reason: 'credential-error' }
    }
    if (!facts.credential.configured) {
      return { kind: 'unconfigured', reason: 'missing-api-key' }
    }
    if (!facts.active) {
      return { kind: 'error', reason: 'configuration-error' }
    }
    return { kind: 'ready', reason: 'credential-configured' }
  }
  if (!facts.active) {
    return { kind: 'error', reason: 'configuration-error' }
  }
  return { kind: 'keyless', reason: 'key-not-required' }
}
