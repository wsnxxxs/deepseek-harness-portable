import type { CredentialInfo } from '@deepseek-ai/dsh-api-remotes/client';
/** Facts available from the provider, settings, and credential Remotes. */
export interface ProviderReadinessFacts {
    readonly active: boolean;
    readonly configured: boolean;
    readonly requiresApiKey: boolean | undefined;
    readonly credential: CredentialInfo | undefined;
    readonly credentialError?: string;
    readonly providerError?: string;
    readonly configurationError?: string;
}
export type ProviderReadinessReason = 'missing-api-key' | 'not-configured' | 'credential-configured' | 'key-not-required' | 'credential-error' | 'provider-error' | 'configuration-error';
/** A keyless route is deliberately neutral rather than a fourth green success state. */
export interface ProviderReadiness {
    readonly kind: 'unconfigured' | 'ready' | 'error' | 'keyless';
    readonly reason: ProviderReadinessReason;
    readonly detail?: string;
}
export interface ProviderDisplayFacts {
    readonly id: string;
    readonly profile: Record<string, unknown> | undefined;
    readonly credential: CredentialInfo | undefined;
}
/**
 * Hide the generic pi-ai DeepSeek placeholder when the dedicated official
 * provider is present. An explicitly configured generic route remains visible.
 */
export declare function visibleProviderRows<Row extends ProviderDisplayFacts>(rows: readonly Row[]): Row[];
/**
 * Derive the one status rendered by provider lists and editors.
 * `active` only means that an adapter route is registered; it never proves a
 * connection. With no connection probe on the Runtime, green therefore means
 * only that a registered, error-free route has its required credential.
 */
export declare function providerReadiness(facts: ProviderReadinessFacts): ProviderReadiness;
//# sourceMappingURL=provider-readiness.d.ts.map