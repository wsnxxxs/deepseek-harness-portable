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
export { VAULT_DIRECTORIES, VAULT_MANIFEST_PATH, VaultContainmentError, activeSourceIds, chunksPathOf, containedPath, ensureVaultLayout, isVaultRoot, readAllStructures, readManifest, readStructure, resolveTopicVault, structurePathOf, upsertManifestEntry, vaultFromRoot, vaultRelative, writeManifest, type TopicVault, } from './topic-vault.ts';
export { SPACE_MANIFEST_RELATIVE_PATH, effectiveSourceIds, ensureSpaceManifest, readSpaceManifest, writeSpaceManifest, type Space, type SpaceManifest, } from './space/index.ts';
export { MAX_SOURCE_BYTES, describeDegradation, ingestDirectory, ingestSource, isSupportedSource, type IngestResult, type IngestStatus, } from './ingest/pipeline.ts';
export { SOURCE_STRUCTURE_PROTOCOL, SPACE_MANIFEST_PROTOCOL, VAULT_MANIFEST_PROTOCOL, contentHashOf, formatAnchor, normalizeQuote, quoteHashOf, sectionIdOf, slugify, type ParseDegradation, type ParsedSource, type SourceAnchor, type SourceManifestEntry, type SourceSection, type SourceStructure, type VaultManifest, } from './ingest/types.ts';
export { ANCHOR_PATH_SEPARATOR, anchorPage, anchorTargetsOf, formatAnchorTarget, formatSectionAnchor, mentionSupported, parseAnchorText, resolveAnchorTarget, sameStringList, sectionMentions, type AnchorTarget, type ParsedAnchor, } from './material-anchor.ts';
export { describeReanchor, reanchorAnchorLists, type ReanchorOutcome, } from './material-reanchor.ts';
export { emptyReanchorOutcome, registerReanchorHook, runReanchorHooks, type ReanchorHook, } from './reanchor-hooks.ts';
export { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_TARGET_CHARS, chunkSource, type ChunkOptions, type SourceChunk, } from './search/chunker.ts';
export { LEXICAL_INDEX_PROTOCOL, buildLexicalIndex, ensureLexicalIndex, lexicalIndexPathOf, readSourceChunks, searchLexicalIndex, tokenize, updateLexicalIndex, writeSourceChunks, type LexicalDocument, type LexicalIndex, type LexicalPosting, type LexicalSearchHit, type LexicalSearchOptions, } from './search/lexical.ts';
//# sourceMappingURL=index.d.ts.map