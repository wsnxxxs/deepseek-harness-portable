/**
 * Typed browser face of the `/dcode` channel.
 *
 * The host half answers with the `{ ok, value } | { ok, error }` envelope, so
 * this module's job is to keep every caller off `unknown` and to turn a
 * transport rejection into the same envelope a business refusal produces —
 * a Git panel must degrade to an explanatory empty state, never to a crash.
 * @module @dsh-portable/dcode-ui/client/rpc
 */
const CHANNEL = '/dcode';
function transportFailure(message) {
    return { ok: false, error: { code: 'unavailable', message, details: {} } };
}
/**
 * Narrow an untyped answer to the envelope, so a protocol drift surfaces as a
 * refusal rather than as an undefined field deep inside a component.
 */
function envelope(answer) {
    if (typeof answer !== 'object' || answer === null)
        return transportFailure('malformed /dcode answer');
    const value = answer;
    if (value.ok === true)
        return { ok: true, value: value.value };
    if (value.ok === false && typeof value.error === 'object' && value.error !== null) {
        return { ok: false, error: value.error };
    }
    return transportFailure('malformed /dcode answer');
}
/**
 * Build the channel client.
 * @param carrier - the Connection service, absent on a page without one.
 * @returns a client that refuses every call when no carrier exists.
 */
export function createDcodeApi(carrier) {
    const call = async (endpoint, payload) => {
        if (carrier === undefined)
            return transportFailure('the /dcode channel is unavailable on this connection');
        try {
            return envelope(await carrier.rpc.call(CHANNEL, endpoint, payload));
        }
        catch (cause) {
            return transportFailure(cause instanceof Error ? cause.message : String(cause));
        }
    };
    return {
        available: carrier !== undefined,
        status: cwd => call('git/status', { cwd }),
        diff: (cwd, path, staged = false) => call('git/diff', { cwd, path, staged }),
        branches: cwd => call('git/branches', { cwd }),
        commit: (cwd, message, paths) => call('git/commit', { cwd, message, ...(paths === undefined ? {} : { paths }) }),
        undo: (cwd, paths) => call('git/undo', { cwd, paths }),
        readFile: (cwd, path) => call('file/read', { cwd, path }),
    };
}
/**
 * The learning channel's browser face, reused verbatim from the existing
 * Interactive Learning host broker: the workbench's learning surfaces call
 * the very same endpoints the official UI's learning views call, so there is
 * exactly one learning backend and one vault state.
 * @param carrier - the Connection service.
 * @returns an endpoint caller, or one that rejects when no carrier exists.
 */
export function createLearningCall(carrier) {
    return async (endpoint, payload) => {
        if (carrier === undefined)
            throw new Error('the learning channel is unavailable on this connection');
        return await carrier.rpc.call('/interactive-learning', endpoint, payload);
    };
}
//# sourceMappingURL=rpc.js.map