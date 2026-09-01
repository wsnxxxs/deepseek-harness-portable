/**
 * Canonical Space metadata.
 *
 * The legacy `.learning/manifest.json` remains the compatibility marker for a
 * vault. This module adds `.library/space.json` beside it and never removes or
 * rewrites user material while migrating.
 */
import type { TopicVault } from '../topic-vault.ts';
import { type SpaceManifest, type VaultManifest } from '../ingest/types.ts';
export declare const SPACE_MANIFEST_RELATIVE_PATH: string;
/** Read the canonical manifest, falling back to the legacy manifest. */
export declare function readSpaceManifest(vault: TopicVault): Promise<SpaceManifest | undefined>;
/** Write `.library/space.json`; callers decide whether the legacy file is also written. */
export declare function writeSpaceManifest(vault: TopicVault, manifest: SpaceManifest): Promise<void>;
/**
 * Create or migrate the canonical manifest without touching the legacy file.
 * The operation is idempotent and only adds metadata.
 */
export declare function ensureSpaceManifest(vault: TopicVault): Promise<SpaceManifest>;
/** Effective source scope; omitted/null means all known sources. */
export declare function effectiveSourceIds(manifest: Pick<SpaceManifest, 'activeSourceIds'> | Pick<VaultManifest, 'activeSourceIds'>, sourceIds: readonly string[]): readonly string[];
//# sourceMappingURL=manifest.d.ts.map