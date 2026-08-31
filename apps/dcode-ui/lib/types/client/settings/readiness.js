import { useAsync, useProjectionValue } from "../state/hooks.js";
import { useRuntime } from "../state/runtime.js";
import { loadModelSettings } from "./SettingsSurface.js";
import { providerReadiness } from "./provider-readiness.js";
function requiresApiKey(row) {
    if (row.settingsNs === '')
        return false;
    if (row.profile === undefined)
        return undefined;
    return typeof row.profile.apiKeyEnv === 'string' && row.profile.apiKeyEnv.trim() !== '';
}
/** Read the selected route and its stored credential without probing or prompting. */
export function useModelReadiness(sessionId) {
    const runtime = useRuntime();
    const selection = useProjectionValue(sessionId, 'modelSelection');
    const settings = useAsync(async () => await loadModelSettings(runtime), [runtime]);
    if (sessionId === undefined)
        return { model: 'missing', credential: 'pending' };
    if (settings.value === undefined)
        return { model: 'pending', credential: 'pending' };
    const selected = selection?.next ?? selection?.lastUsed ?? settings.value.catalog.default;
    if (selected === undefined || selected.provider === '' || selected.model === '') {
        return { model: 'missing', credential: 'pending' };
    }
    // Unknown provider: the selected route is not configurable, so calling it ready
    // would let the composer send into a route that is guaranteed to fail.
    const row = settings.value.providers.find(candidate => candidate.id === selected.provider);
    if (row === undefined)
        return { model: 'missing', credential: 'pending', provider: selected.provider };
    const status = providerReadiness({
        active: row.active,
        configured: row.profile !== undefined || row.settingsNs === '',
        requiresApiKey: requiresApiKey(row),
        credential: row.credential,
        ...row.credentialError === undefined ? {} : { credentialError: row.credentialError },
        ...row.providerError === undefined ? {} : { providerError: row.providerError },
    });
    return {
        model: 'ready',
        credential: status.kind === 'unconfigured' ? 'missing' : 'ready',
        provider: selected.provider,
    };
}
//# sourceMappingURL=readiness.js.map