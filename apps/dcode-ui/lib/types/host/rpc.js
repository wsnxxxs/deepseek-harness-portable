/**
 * The `/dcode` RPC surface: the capabilities the modern workbench needs that
 * DSH itself does not own — working-tree status, file diffs, a narrow commit
 * path, per-turn undo, and bounded file reads for the details pane.
 *
 * Endpoint answers use the same `{ ok, value } | { ok, error }` envelope the
 * rest of this distribution's Connection RPC uses, so a client never has to
 * distinguish a business refusal from a transport failure by exception type.
 * @module @dsh-portable/dcode-ui/host/rpc
 */
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { commit, containedRelativePath, readBranches, readDiff, readStatus, stagePaths, undoHunk, undoPaths, unstagePaths, } from "./git.js";
/** Every endpoint this channel answers. */
export const DCODE_ENDPOINTS = [
    'git/status',
    'git/diff',
    'git/branches',
    'git/stage',
    'git/unstage',
    'git/commit',
    'git/undo',
    'file/read',
    'memory/state',
    'memory/search',
    'memory/run',
    'memory/abort',
    'memory/reset',
    'memory/set-enabled',
    'memory/forget',
];
/** RPC channel this plugin answers on. */
export const DCODE_CHANNEL = '/dcode';
/** Byte ceiling on one `file/read` answer; a larger file comes back truncated. */
const FILE_READ_LIMIT = 512 * 1024;
/**
 * Whether a value names an endpoint this channel answers.
 * @param value - endpoint string from the wire.
 */
export function isDcodeEndpoint(value) {
    return typeof value === 'string' && DCODE_ENDPOINTS.includes(value);
}
function failure(code, message, details = {}) {
    return { ok: false, error: { code, message, details } };
}
/** Read a required absolute workspace directory out of an untrusted payload. */
function requireCwd(payload) {
    const cwd = payload.cwd;
    if (typeof cwd !== 'string' || cwd.trim() === '')
        throw new Error('cwd must be a non-empty absolute path');
    if (!isAbsolute(cwd))
        throw new Error('cwd must be absolute');
    return resolve(cwd);
}
/** Read an optional absolute workspace directory out of a wire payload. */
function optionalCwd(payload) {
    if (payload.cwd === undefined)
        return undefined;
    return requireCwd(payload);
}
/** Read a required string field out of an untrusted payload. */
function requireString(payload, field, maxLength) {
    const value = payload[field];
    if (typeof value !== 'string' || value.trim() === '')
        throw new Error(`${field} must be a non-empty string`);
    if (value.length > maxLength)
        throw new Error(`${field} must be at most ${String(maxLength)} characters`);
    return value;
}
/** Read an optional bounded string-array field out of an untrusted payload. */
function optionalPaths(payload, field, limit = 500) {
    const value = payload[field];
    if (value === undefined)
        return undefined;
    if (!Array.isArray(value))
        throw new Error(`${field} must be an array of paths`);
    if (value.length > limit)
        throw new Error(`${field} must contain at most ${String(limit)} paths`);
    return value.map((entry, index) => {
        if (typeof entry !== 'string' || entry.trim() === '')
            throw new Error(`${field}[${String(index)}] must be a non-empty string`);
        return entry;
    });
}
/**
 * Answer one `/dcode` endpoint.
 *
 * Payload shape failures are `bad-request`; a directory outside a repository
 * is `not-a-repository`; anything git itself refused is `git-failed` with
 * git's own trimmed message.
 * @param endpoint - endpoint name, already known to be one of {@link DCODE_ENDPOINTS}.
 * @param payload - untrusted wire payload.
 * @returns the endpoint's envelope.
 */
export async function handleDcodeEndpoint(endpoint, payload, memory) {
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return failure('bad-request', 'payload must be an object');
    }
    const body = payload;
    try {
        switch (endpoint) {
            case 'git/status': {
                return { ok: true, value: await readStatus(requireCwd(body)) };
            }
            case 'git/diff': {
                const cwd = requireCwd(body);
                const path = requireString(body, 'path', 4096);
                return { ok: true, value: await readDiff(cwd, path, body.staged === true) };
            }
            case 'git/branches': {
                return { ok: true, value: { branches: await readBranches(requireCwd(body)) } };
            }
            case 'git/stage':
            case 'git/unstage': {
                const cwd = requireCwd(body);
                const paths = optionalPaths(body, 'paths', 2000);
                if (paths === undefined || paths.length === 0)
                    return failure('bad-request', 'paths must list at least one file');
                return { ok: true, value: endpoint === 'git/stage' ? await stagePaths(cwd, paths) : await unstagePaths(cwd, paths) };
            }
            case 'git/commit': {
                const cwd = requireCwd(body);
                const message = requireString(body, 'message', 8000);
                return { ok: true, value: await commit(cwd, message) };
            }
            case 'git/undo': {
                const cwd = requireCwd(body);
                if (body.patch !== undefined) {
                    const path = requireString(body, 'path', 4096);
                    const patch = requireString(body, 'patch', 400_000);
                    return { ok: true, value: { outcomes: await undoHunk(cwd, path, patch, body.staged === true) } };
                }
                const paths = optionalPaths(body, 'paths');
                if (paths === undefined || paths.length === 0)
                    return failure('bad-request', 'paths must list at least one file');
                return { ok: true, value: { outcomes: await undoPaths(cwd, paths) } };
            }
            case 'file/read': {
                const cwd = requireCwd(body);
                const path = requireString(body, 'path', 4096);
                const contained = containedRelativePath(cwd, path);
                const absolute = resolve(cwd, contained);
                const info = await stat(absolute);
                if (!info.isFile())
                    return failure('bad-request', 'path is not a regular file', { path: contained });
                const bytes = await readFile(absolute);
                const truncated = bytes.byteLength > FILE_READ_LIMIT;
                const slice = truncated ? bytes.subarray(0, FILE_READ_LIMIT) : bytes;
                // A NUL in the first block is the conventional binary sniff; binary
                // content is reported rather than decoded into replacement characters.
                const binary = slice.subarray(0, 8000).includes(0);
                return {
                    ok: true,
                    value: {
                        path: contained,
                        size: info.size,
                        truncated,
                        binary,
                        text: binary ? '' : slice.toString('utf8'),
                    },
                };
            }
            case 'memory/state': {
                if (memory === undefined)
                    return failure('unavailable', 'memory service is unavailable');
                return { ok: true, value: memory.getState(optionalCwd(body)) };
            }
            case 'memory/search': {
                if (memory === undefined)
                    return failure('unavailable', 'memory service is unavailable');
                return { ok: true, value: memory.search(requireString(body, 'query', 4000), optionalCwd(body)) };
            }
            case 'memory/run': {
                if (memory === undefined)
                    return failure('unavailable', 'memory service is unavailable');
                return { ok: true, value: await memory.run(optionalCwd(body)) };
            }
            case 'memory/abort': {
                if (memory === undefined)
                    return failure('unavailable', 'memory service is unavailable');
                return { ok: true, value: memory.abort() };
            }
            case 'memory/reset': {
                if (memory === undefined)
                    return failure('unavailable', 'memory service is unavailable');
                return { ok: true, value: memory.reset() };
            }
            case 'memory/set-enabled': {
                if (memory === undefined)
                    return failure('unavailable', 'memory service is unavailable');
                if (typeof body.enabled !== 'boolean')
                    return failure('bad-request', 'enabled must be a boolean');
                return { ok: true, value: memory.setEnabled(body.enabled) };
            }
            case 'memory/forget': {
                if (memory === undefined)
                    return failure('unavailable', 'memory service is unavailable');
                return { ok: true, value: memory.forget(requireString(body, 'id', 200)) };
            }
            default: {
                return failure('bad-request', `unknown /dcode endpoint`, { endpoint });
            }
        }
    }
    catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        if (message === 'not a git work tree')
            return failure('not-a-repository', message);
        if (/^(cwd|path|patch|message|paths|query|enabled|id)\b/.test(message) || message.startsWith('payload')) {
            return failure('bad-request', message);
        }
        if (cause?.code === 'ENOENT') {
            return failure('bad-request', message);
        }
        return failure(endpoint.startsWith('memory/') ? 'memory-failed' : 'git-failed', message);
    }
}
//# sourceMappingURL=rpc.js.map