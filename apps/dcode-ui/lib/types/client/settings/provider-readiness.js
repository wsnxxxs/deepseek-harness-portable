/**
 * Derive the one status rendered by provider lists and editors.
 * `active` only means that an adapter route is registered; it never proves a
 * connection. With no connection probe on the Runtime, green therefore means
 * only that a registered, error-free route has its required credential.
 */
export function providerReadiness(facts) {
    if (facts.configurationError !== undefined) {
        return { kind: 'error', reason: 'configuration-error', detail: facts.configurationError };
    }
    if (facts.providerError !== undefined) {
        return { kind: 'error', reason: 'provider-error', detail: facts.providerError };
    }
    if (facts.requiresApiKey !== false && facts.credentialError !== undefined) {
        return { kind: 'error', reason: 'credential-error', detail: facts.credentialError };
    }
    if (!facts.configured || facts.requiresApiKey === undefined) {
        return { kind: 'unconfigured', reason: 'not-configured' };
    }
    if (facts.requiresApiKey) {
        if (facts.credential === undefined) {
            return { kind: 'error', reason: 'credential-error' };
        }
        if (!facts.credential.configured) {
            return { kind: 'unconfigured', reason: 'missing-api-key' };
        }
        if (!facts.active) {
            return { kind: 'error', reason: 'configuration-error' };
        }
        return { kind: 'ready', reason: 'credential-configured' };
    }
    if (!facts.active) {
        return { kind: 'error', reason: 'configuration-error' };
    }
    return { kind: 'keyless', reason: 'key-not-required' };
}
//# sourceMappingURL=provider-readiness.js.map