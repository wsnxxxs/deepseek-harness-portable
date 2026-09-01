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
import type { Context } from '@deepseek-ai/cordis';
import { type SourceManifestEntry, type SourceStructure, type VaultManifest } from './ingest/types.ts';
/** Vault-relative directory names. Stable: a person's file manager sees these. */
export declare const VAULT_DIRECTORIES: Readonly<{
    sources: "sources";
    extracted: "extracted";
    concepts: "concepts";
    notes: "notes";
    internal: ".learning";
    structure: string;
    library: ".library";
    libraryIndex: string;
    chunks: string;
    artifacts: "artifacts";
}>;
/** Vault-relative path of the manifest whose presence marks a directory a vault. */
export declare const VAULT_MANIFEST_PATH: string;
/** One learning topic, resolved to absolute paths. */
export interface TopicVault {
    /** Workspace id when the registry is composed and knows this directory. */
    readonly workspaceId?: string;
    readonly title: string;
    readonly root: string;
    readonly sources: string;
    readonly extracted: string;
    readonly concepts: string;
    readonly notes: string;
    readonly internal: string;
    readonly structure: string;
    /** Derived Library cache paths; the legacy paths above remain authoritative. */
    readonly library: string;
    readonly libraryIndex: string;
    readonly chunks: string;
    readonly artifacts: string;
    readonly spaceManifestPath: string;
    readonly manifestPath: string;
}
/** A path that tried to leave the vault it was resolved against. */
export declare class VaultContainmentError extends Error {
    readonly candidate: string;
    readonly root: string;
    constructor(candidate: string, root: string);
}
/**
 * Build the vault view of a directory. Pure path arithmetic — it does not check
 * that the directory exists or is a vault.
 * @param root - Absolute directory path.
 * @param title - Display title; defaults to the directory's own name.
 * @param workspaceId - Workspace id when known.
 */
export declare function vaultFromRoot(root: string, title?: string, workspaceId?: string): TopicVault;
/** Whether a directory already holds a learning vault. */
export declare function isVaultRoot(root: string): Promise<boolean>;
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
export declare function resolveTopicVault(ctx: Context, cwd: string | undefined): Promise<TopicVault | undefined>;
/**
 * Create the vault layout, idempotently. Safe to call on an existing vault: the
 * legacy manifest is only written when absent, and Space metadata is ensured
 * without resetting the source record.
 * @param root - Absolute directory to make into a vault.
 * @param title - Display title for a newly created vault.
 * @returns the resolved vault.
 */
export declare function ensureVaultLayout(root: string, title?: string): Promise<TopicVault>;
/**
 * Read the vault manifest.
 *
 * A damaged manifest resolves to an empty one rather than throwing: the vault is
 * a folder a person can edit, and a stray keystroke in a cache file must never
 * cost them their session. The manifest describes only rebuildable state.
 * @param vault - The vault to read.
 */
export declare function readManifest(vault: TopicVault): Promise<VaultManifest>;
/** Write the vault manifest, stamping `updatedAt`. */
export declare function writeManifest(vault: TopicVault, manifest: VaultManifest): Promise<void>;
/** Replace one source's manifest entry, appending when it is new. */
export declare function upsertManifestEntry(vault: TopicVault, entry: SourceManifestEntry): Promise<VaultManifest>;
/** Absolute path of one source's structure record. */
export declare function structurePathOf(vault: TopicVault, sourceId: string): string;
/** Absolute path of one source's derived chunk stream. */
export declare function chunksPathOf(vault: TopicVault, sourceId: string): string;
/** Effective grounding scope for the sources currently recorded in the vault. */
export declare function activeSourceIds(vault: TopicVault): Promise<readonly string[]>;
/**
 * Read one source's derived structure.
 * @returns the structure, or `undefined` when it is missing or unreadable.
 */
export declare function readStructure(vault: TopicVault, sourceId: string): Promise<SourceStructure | undefined>;
/**
 * Read every source structure the vault holds, in manifest order.
 *
 * Sources present on disk but absent from the manifest are included too: the
 * manifest is a cache, and a hand-copied structure file is still a real source.
 */
export declare function readAllStructures(vault: TopicVault): Promise<readonly SourceStructure[]>;
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
export declare function containedPath(vault: TopicVault, candidate: string): Promise<string>;
/** Vault-relative form of an absolute path, for display and for anchors. */
export declare function vaultRelative(vault: TopicVault, absolute: string): string;
//# sourceMappingURL=topic-vault.d.ts.map