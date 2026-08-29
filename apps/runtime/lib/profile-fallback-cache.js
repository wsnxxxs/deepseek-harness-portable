import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write';
const PROFILE_FALLBACK_CACHE_SCHEMA_VERSION = 1;
async function digestFile(path) {
    if (path === undefined)
        return 'missing';
    try {
        return createHash('sha256').update(await readFile(path)).digest('hex');
    }
    catch {
        return 'missing';
    }
}
async function cacheKey(options) {
    const [anchor, runtimeDeps] = await Promise.all([
        digestFile(options.installAnchor),
        digestFile(options.runtimeDepsPath),
    ]);
    return createHash('sha256').update(JSON.stringify({
        schemaVersion: PROFILE_FALLBACK_CACHE_SCHEMA_VERSION,
        profileDir: resolve(options.profileDir),
        installAnchor: resolve(options.installAnchor),
        anchor,
        runtimeDeps,
        bundles: [...options.bundles()],
    })).digest('hex');
}
async function readCache(path) {
    try {
        const value = JSON.parse(await readFile(path, 'utf8'));
        if (value.schemaVersion !== PROFILE_FALLBACK_CACHE_SCHEMA_VERSION
            || typeof value.key !== 'string'
            || !Array.isArray(value.entries)
            || value.entries.some(entry => typeof entry !== 'string'))
            return undefined;
        return {
            schemaVersion: PROFILE_FALLBACK_CACHE_SCHEMA_VERSION,
            key: value.key,
            entries: value.entries,
        };
    }
    catch {
        return undefined;
    }
}
async function fallbackEntriesCurrent(modulesDir, state, key) {
    if (state.key !== key)
        return false;
    try {
        const current = new Set(await readdir(modulesDir));
        return state.entries.every(entry => current.has(entry));
    }
    catch {
        return false;
    }
}
/**
 * Skip the installation fallback BFS when the runtime dependency generation
 * and composed profile bundle list are unchanged. The marker lock and the
 * second read inside it keep concurrent launches from racing a repair.
 */
export function createCachedProfileFallbackHealer(options) {
    const profileRoot = dirname(options.profileDir);
    const modulesDir = join(profileRoot, 'node_modules');
    const markerPath = join(profileRoot, '.dsh-profile-fallback-cache-v1.json');
    return async () => {
        const key = await cacheKey(options);
        await mkdir(profileRoot, { recursive: true });
        const reconcile = async () => {
            const cached = await readCache(markerPath);
            if (cached !== undefined && await fallbackEntriesCurrent(modulesDir, cached, key))
                return;
            await options.heal({ installAnchor: options.installAnchor });
            try {
                const entries = await readdir(modulesDir);
                await writeFileAtomic(markerPath, `${JSON.stringify({
                    schemaVersion: PROFILE_FALLBACK_CACHE_SCHEMA_VERSION,
                    key,
                    entries,
                }, undefined, 2)}\n`, { mode: 0o600, dirMode: 0o700 });
            }
            catch {
                // Healing already completed; a cache write failure must not block boot.
            }
        };
        try {
            await withFileLock(markerPath, reconcile, { waitMs: 5_000 });
        }
        catch (error) {
            if (!(error instanceof Error) || !error.message.includes('timed out waiting for the writer lock'))
                throw error;
            await options.heal({ installAnchor: options.installAnchor });
        }
    };
}
//# sourceMappingURL=profile-fallback-cache.js.map