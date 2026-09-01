/**
 * The topic vault: a learning topic IS a real directory, and that directory is a
 * harness Workspace. The legacy identity marker remains `.learning/manifest.json`,
 * while canonical Space metadata is added under `.library/space.json`.
 *
 * That identity is what makes the write fence free. `ctx.sandboxPolicy` resolves
 * `workspaceRoot` from the session's immutable `cwd`, and Workspace membership
 * already requires that cwd to equal the workspace path, so a learning session
 * running in its vault cannot write outside it. This module therefore owns paths
 * and containment, not permissions.
 *
 * Writes here are host-side and deterministic over paths this module built, so
 * they use `node:fs/promises` directly. The `ctx.fs` fence exists for
 * MODEL-controlled paths; the model never reaches this module.
 * @module @dsh-portable/interactive-learning/src/topic-vault
 */
import { mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { SPACE_MANIFEST_PROTOCOL, VAULT_MANIFEST_PROTOCOL, slugify, } from "./ingest/types.js";
import { ensureSpaceManifest, readSpaceManifest, writeSpaceManifest, SPACE_MANIFEST_RELATIVE_PATH, } from "./space/manifest.js";
/** Vault-relative directory names. Stable: a person's file manager sees these. */
export const VAULT_DIRECTORIES = Object.freeze({
    sources: 'sources',
    extracted: 'extracted',
    concepts: 'concepts',
    notes: 'notes',
    internal: '.learning',
    structure: join('.learning', 'structure'),
    library: '.library',
    libraryIndex: join('.library', 'index'),
    chunks: join('.library', 'chunks'),
    artifacts: 'artifacts',
});
/** Vault-relative path of the manifest whose presence marks a directory a vault. */
export const VAULT_MANIFEST_PATH = join(VAULT_DIRECTORIES.internal, 'manifest.json');
/** A path that tried to leave the vault it was resolved against. */
export class VaultContainmentError extends Error {
    candidate;
    root;
    constructor(candidate, root) {
        super(`path '${candidate}' is outside the learning vault '${root}'`);
        this.candidate = candidate;
        this.root = root;
        this.name = 'VaultContainmentError';
    }
}
/**
 * Build the vault view of a directory. Pure path arithmetic — it does not check
 * that the directory exists or is a vault.
 * @param root - Absolute directory path.
 * @param title - Display title; defaults to the directory's own name.
 * @param workspaceId - Workspace id when known.
 */
export function vaultFromRoot(root, title, workspaceId) {
    const absolute = resolve(root);
    return {
        ...(workspaceId === undefined ? {} : { workspaceId }),
        title: title ?? basename(absolute),
        root: absolute,
        sources: join(absolute, VAULT_DIRECTORIES.sources),
        extracted: join(absolute, VAULT_DIRECTORIES.extracted),
        concepts: join(absolute, VAULT_DIRECTORIES.concepts),
        notes: join(absolute, VAULT_DIRECTORIES.notes),
        internal: join(absolute, VAULT_DIRECTORIES.internal),
        structure: join(absolute, VAULT_DIRECTORIES.structure),
        library: join(absolute, VAULT_DIRECTORIES.library),
        libraryIndex: join(absolute, VAULT_DIRECTORIES.libraryIndex),
        chunks: join(absolute, VAULT_DIRECTORIES.chunks),
        artifacts: join(absolute, VAULT_DIRECTORIES.artifacts),
        spaceManifestPath: join(absolute, SPACE_MANIFEST_RELATIVE_PATH),
        manifestPath: join(absolute, VAULT_MANIFEST_PATH),
    };
}
/** Whether a directory already holds a learning vault. */
export async function isVaultRoot(root) {
    try {
        const info = await stat(join(resolve(root), VAULT_MANIFEST_PATH));
        return info.isFile();
    }
    catch {
        return false;
    }
}
/**
 * Resolve the vault a session runs in.
 *
 * The registry is consulted opportunistically for the display title: a vault is
 * defined by its manifest, so learning works in a plain directory even in a
 * composition that mounts no workspace registry.
 * @param ctx - The plugin context.
 * @param cwd - The session's immutable working directory.
 * @returns the vault, or `undefined` when this session is not in one.
 */
export async function resolveTopicVault(ctx, cwd) {
    if (cwd === undefined || cwd === '')
        return undefined;
    let root;
    try {
        root = await realpath(cwd);
    }
    catch {
        return undefined;
    }
    if (!await isVaultRoot(root))
        return undefined;
    const recorded = (await readManifest(vaultFromRoot(root))).title;
    const registry = ctx.get('workspaceRegistry');
    if (registry === undefined)
        return vaultFromRoot(root, recorded);
    try {
        const workspace = await registry.resolveByPath(root);
        return workspace === undefined
            ? vaultFromRoot(root, recorded)
            : vaultFromRoot(root, workspace.title, workspace.id);
    }
    catch {
        return vaultFromRoot(root, recorded);
    }
}
/**
 * Create the vault layout, idempotently. Safe to call on an existing vault: the
 * legacy manifest is only written when absent, and Space metadata is ensured
 * without resetting the source record.
 * @param root - Absolute directory to make into a vault.
 * @param title - Display title for a newly created vault.
 * @returns the resolved vault.
 */
export async function ensureVaultLayout(root, title) {
    const vault = vaultFromRoot(root, title);
    for (const directory of [
        vault.sources,
        vault.extracted,
        vault.concepts,
        vault.notes,
        vault.structure,
        vault.library,
        vault.libraryIndex,
        vault.chunks,
        vault.artifacts,
    ]) {
        await mkdir(directory, { recursive: true });
    }
    if (!await isVaultRoot(vault.root)) {
        const now = new Date().toISOString();
        await writeManifest(vault, {
            protocol: VAULT_MANIFEST_PROTOCOL,
            ...(title === undefined ? {} : { title }),
            createdAt: now,
            updatedAt: now,
            sources: [],
        });
    }
    await ensureSpaceManifest(vault);
    return vault;
}
/**
 * Read the vault manifest.
 *
 * A damaged manifest resolves to an empty one rather than throwing: the vault is
 * a folder a person can edit, and a stray keystroke in a cache file must never
 * cost them their session. The manifest describes only rebuildable state.
 * @param vault - The vault to read.
 */
export async function readManifest(vault) {
    const now = new Date().toISOString();
    const empty = {
        protocol: VAULT_MANIFEST_PROTOCOL,
        createdAt: now,
        updatedAt: now,
        sources: [],
    };
    const space = await readSpaceManifest(vault);
    if (space === undefined)
        return empty;
    return {
        protocol: VAULT_MANIFEST_PROTOCOL,
        ...(space.title === undefined ? {} : { title: space.title }),
        createdAt: space.createdAt,
        updatedAt: space.updatedAt,
        sources: space.sources,
        ...(space.activeSourceIds === undefined ? {} : { activeSourceIds: space.activeSourceIds }),
    };
}
/** Write the vault manifest, stamping `updatedAt`. */
export async function writeManifest(vault, manifest) {
    await mkdir(vault.internal, { recursive: true });
    const stamped = { ...manifest, updatedAt: new Date().toISOString() };
    await writeFile(vault.manifestPath, `${JSON.stringify(stamped, undefined, 2)}\n`, 'utf8');
    const current = await readSpaceManifest(vault);
    const space = {
        protocol: SPACE_MANIFEST_PROTOCOL,
        schema: current?.schema ?? 'learning',
        id: current?.id ?? slugify(vault.root, 'space'),
        ...(stamped.title === undefined ? {} : { title: stamped.title }),
        createdAt: stamped.createdAt,
        updatedAt: stamped.updatedAt,
        sources: stamped.sources,
        ...(stamped.activeSourceIds === undefined
            ? current?.activeSourceIds === undefined ? {} : { activeSourceIds: current.activeSourceIds }
            : { activeSourceIds: stamped.activeSourceIds }),
    };
    await writeSpaceManifest(vault, space);
}
/** Replace one source's manifest entry, appending when it is new. */
export async function upsertManifestEntry(vault, entry) {
    const manifest = await readManifest(vault);
    const sources = manifest.sources.filter(candidate => candidate.sourceId !== entry.sourceId);
    const next = { ...manifest, sources: [...sources, entry] };
    await writeManifest(vault, next);
    return next;
}
/** Absolute path of one source's structure record. */
export function structurePathOf(vault, sourceId) {
    return join(vault.structure, `${sourceId}.json`);
}
/** Absolute path of one source's derived chunk stream. */
export function chunksPathOf(vault, sourceId) {
    return join(vault.chunks, `${sourceId}.jsonl`);
}
/** Effective grounding scope for the sources currently recorded in the vault. */
export async function activeSourceIds(vault) {
    const manifest = await readManifest(vault);
    const ids = manifest.sources.map(entry => entry.sourceId);
    if (manifest.activeSourceIds === undefined || manifest.activeSourceIds === null)
        return ids;
    const allowed = new Set(ids);
    return [...new Set(manifest.activeSourceIds)].filter(sourceId => allowed.has(sourceId));
}
/**
 * Read one source's derived structure.
 * @returns the structure, or `undefined` when it is missing or unreadable.
 */
export async function readStructure(vault, sourceId) {
    try {
        const path = await containedPath(vault, structurePathOf(vault, sourceId));
        const parsed = JSON.parse(await readFile(path, 'utf8'));
        return Array.isArray(parsed?.sections) ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
/**
 * Read every source structure the vault holds, in manifest order.
 *
 * Sources present on disk but absent from the manifest are included too: the
 * manifest is a cache, and a hand-copied structure file is still a real source.
 */
export async function readAllStructures(vault) {
    const manifest = await readManifest(vault);
    const ordered = manifest.sources.map(entry => entry.sourceId);
    let onDisk = [];
    try {
        onDisk = (await readdir(vault.structure))
            .filter(name => name.endsWith('.json'))
            .map(name => name.slice(0, -'.json'.length));
    }
    catch {
        onDisk = [];
    }
    const ids = [...new Set([...ordered, ...onDisk])];
    const structures = [];
    for (const id of ids) {
        const structure = await readStructure(vault, id);
        if (structure !== undefined)
            structures.push(structure);
    }
    return structures;
}
/**
 * Resolve a vault-relative path and prove it stays inside the vault.
 *
 * Canonicalize-then-contain, matching the harness fs fence: the deepest existing
 * ancestor is realpath'd so a symlink planted inside the vault cannot redirect a
 * read outside it.
 * @param vault - The vault to contain against.
 * @param candidate - A vault-relative path; an absolute path is accepted only
 * when it is already inside the vault.
 * @returns the absolute, contained path.
 * @throws VaultContainmentError when the path escapes.
 */
export async function containedPath(vault, candidate) {
    if (candidate.includes('\0'))
        throw new VaultContainmentError(candidate, vault.root);
    const absolute = isAbsolute(candidate) ? resolve(candidate) : resolve(vault.root, candidate);
    const canonicalRoot = await realpath(vault.root);
    let probe = absolute;
    const missing = [];
    for (;;) {
        try {
            probe = await realpath(probe);
            break;
        }
        catch {
            const parent = resolve(probe, '..');
            if (parent === probe)
                return contain(absolute, canonicalRoot, candidate);
            missing.unshift(basename(probe));
            probe = parent;
        }
    }
    return contain(join(probe, ...missing), canonicalRoot, candidate);
}
function contain(absolute, root, candidate) {
    const rel = relative(root, absolute);
    if (rel === '')
        return absolute;
    if (rel.startsWith('..') || isAbsolute(rel) || rel.split(sep).includes('..')) {
        throw new VaultContainmentError(candidate, root);
    }
    return absolute;
}
/** Vault-relative form of an absolute path, for display and for anchors. */
export function vaultRelative(vault, absolute) {
    return relative(vault.root, absolute).split(sep).join('/');
}
//# sourceMappingURL=topic-vault.js.map