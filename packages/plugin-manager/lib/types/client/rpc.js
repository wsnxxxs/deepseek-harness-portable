/**
 * Typed browser face of the `/portable-plugins` channel.
 *
 * The host answers with the `{ ok, value } | { ok, error }` envelope; this
 * module's job is to keep the tab off `unknown` and to turn a transport
 * rejection into the same envelope a business refusal produces, so a settings
 * page degrades to an explanatory empty state rather than a crash.
 * @module @dsh-portable/plugin-manager/client/rpc
 */
import { PORTABLE_PLUGINS_CHANNEL, } from "../host/contract.js";
function transportFailure(message) {
    return { ok: false, error: { code: 'unavailable', message, details: {} } };
}
/** Narrow an untyped answer so protocol drift surfaces as a refusal. */
function envelope(answer) {
    if (typeof answer !== 'object' || answer === null)
        return transportFailure('malformed /portable-plugins answer');
    const value = answer;
    if (value.ok === true)
        return { ok: true, value: value.value };
    if (value.ok === false && typeof value.error === 'object' && value.error !== null) {
        return { ok: false, error: value.error };
    }
    return transportFailure('malformed /portable-plugins answer');
}
/**
 * Build the browser face over one Connection carrier.
 * @param carrier - the connection service, or undefined when none is present.
 * @returns the typed API.
 */
export function createPortablePluginApi(carrier) {
    const call = async (endpoint, payload) => {
        if (carrier === undefined)
            return transportFailure('the /portable-plugins channel is unavailable on this connection');
        try {
            return envelope(await carrier.rpc.call('/api', `${PORTABLE_PLUGINS_CHANNEL.slice(1)}/${endpoint}`, payload));
        }
        catch (cause) {
            return transportFailure(cause instanceof Error ? cause.message : String(cause));
        }
    };
    return {
        available: carrier !== undefined,
        list: () => call('list', {}),
        setEnabled: (name, enabled) => call('set-enabled', { name, enabled }),
    };
}
//# sourceMappingURL=rpc.js.map