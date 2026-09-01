/**
 * A material space: the filesystem-backed kernel behind every grounded surface
 * in this distribution.
 *
 * A space is one directory. The directory IS the truth — sources, extracted
 * text, structure and notes are ordinary files an operator can read, move or
 * back up without this code — and three properties make it worth reusing:
 *
 * - **Degradation is data, not a log line.** A parser that could not read pages
 *   12–18 returns that fact, so a surface can state it. Silently answering from
 *   a partial read is the failure mode this design exists to prevent.
 * - **Citations survive re-import.** A quote is anchored by content hash, not by
 *   line number, so re-importing a revised document moves the anchors that still
 *   match, marks the ones that do not, and recovers ones that reappear.
 * - **Writes are Host-mediated.** Every path is built here and contained by
 *   canonicalize-then-contain; no model-facing tool writes into a space.
 *
 * The kernel deliberately knows nothing about what a space is FOR. Teaching
 * material and mission dossiers are both spaces; what differs is the consumer,
 * which registers a {@link ReanchorHook} rather than being imported from here.
 * @module @dsh-portable/space-kernel
 */
// ── the space itself ────────────────────────────────────────────────────────
export { VAULT_DIRECTORIES, VAULT_MANIFEST_PATH, VaultContainmentError, activeSourceIds, chunksPathOf, containedPath, ensureVaultLayout, isVaultRoot, readAllStructures, readManifest, readStructure, resolveTopicVault, structurePathOf, upsertManifestEntry, vaultFromRoot, vaultRelative, writeManifest, } from "./topic-vault.js";
export { SPACE_MANIFEST_RELATIVE_PATH, effectiveSourceIds, ensureSpaceManifest, readSpaceManifest, writeSpaceManifest, } from "./space/index.js";
// ── ingest ──────────────────────────────────────────────────────────────────
export { MAX_SOURCE_BYTES, describeDegradation, ingestDirectory, ingestSource, isSupportedSource, } from "./ingest/pipeline.js";
export { SOURCE_STRUCTURE_PROTOCOL, SPACE_MANIFEST_PROTOCOL, VAULT_MANIFEST_PROTOCOL, contentHashOf, formatAnchor, normalizeQuote, quoteHashOf, sectionIdOf, slugify, } from "./ingest/types.js";
// ── citations ───────────────────────────────────────────────────────────────
export { ANCHOR_PATH_SEPARATOR, anchorPage, anchorTargetsOf, formatAnchorTarget, formatSectionAnchor, mentionSupported, parseAnchorText, resolveAnchorTarget, sameStringList, sectionMentions, } from "./material-anchor.js";
export { describeReanchor, reanchorAnchorLists, } from "./material-reanchor.js";
export { emptyReanchorOutcome, registerReanchorHook, runReanchorHooks, } from "./reanchor-hooks.js";
// ── retrieval ───────────────────────────────────────────────────────────────
export { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_TARGET_CHARS, chunkSource, } from "./search/chunker.js";
export { LEXICAL_INDEX_PROTOCOL, buildLexicalIndex, ensureLexicalIndex, lexicalIndexPathOf, readSourceChunks, searchLexicalIndex, tokenize, updateLexicalIndex, writeSourceChunks, } from "./search/lexical.js";
//# sourceMappingURL=index.js.map