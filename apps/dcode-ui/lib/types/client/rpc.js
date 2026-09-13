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
            return envelope(await carrier.rpc.call('/api', `${CHANNEL.slice(1)}/${endpoint}`, payload));
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
        stage: (cwd, paths) => call('git/stage', { cwd, paths }),
        unstage: (cwd, paths) => call('git/unstage', { cwd, paths }),
        commit: (cwd, message) => call('git/commit', { cwd, message }),
        undo: (cwd, paths) => call('git/undo', { cwd, paths }),
        undoHunk: (cwd, path, patch, staged = false) => call('git/undo', { cwd, path, patch, staged }),
        readFile: (cwd, path) => call('file/read', { cwd, path }),
    };
}
/** Build the durable-memory client face over the same trusted channel. */
export function createDcodeMemoryApi(carrier) {
    const call = async (endpoint, payload) => {
        if (carrier === undefined)
            return transportFailure('the /dcode channel is unavailable on this connection');
        try {
            return envelope(await carrier.rpc.call('/api', `${CHANNEL.slice(1)}/${endpoint}`, payload));
        }
        catch (cause) {
            return transportFailure(cause instanceof Error ? cause.message : String(cause));
        }
    };
    return {
        available: carrier !== undefined,
        state: cwd => call('memory/state', cwd === undefined ? {} : { cwd }),
        search: (query, cwd) => call('memory/search', cwd === undefined ? { query } : { query, cwd }),
        run: cwd => call('memory/run', cwd === undefined ? {} : { cwd }),
        abort: () => call('memory/abort', {}),
        setEnabled: enabled => call('memory/set-enabled', { enabled }),
        reset: () => call('memory/reset', {}),
        forget: id => call('memory/forget', { id }),
    };
}
//# sourceMappingURL=rpc.js.map