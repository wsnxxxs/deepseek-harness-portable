/**
 * Material ingest: the single host-side path from a file a person dropped to the
 * extracted markdown and derived structure the teaching layer reads.
 *
 * The model is not involved. It never sees the original bytes, never chooses a
 * parser, and never writes any of these files — which is what lets the preset
 * keep its promise while gaining the ability to read a person's material.
 * @module @dsh-portable/interactive-learning/src/ingest/pipeline
 */
import { type TopicVault } from '../topic-vault.ts';
import { type ReanchorOutcome } from '../material-reanchor.ts';
import { type SourceManifestEntry, type SourceStructure } from './types.ts';
/**
 * Largest source accepted. A parse holds the whole document in memory, and a
 * desktop app that dies on a dropped disk image helps nobody.
 */
export declare const MAX_SOURCE_BYTES: number;
/** What one ingest attempt did. */
export type IngestStatus = 
/** Parsed and written. */
'ingested'
/** Same bytes, same parser version: nothing to redo. */
 | 'unchanged'
/** No parser owns this extension; nothing was written. */
 | 'unsupported'
/** Rejected before parsing (too large, unreadable). */
 | 'rejected';
/** Result of one ingest attempt. */
export interface IngestResult {
    status: IngestStatus;
    sourceId: string;
    title: string;
    /** Present unless the source was rejected. */
    entry?: SourceManifestEntry;
    /** Present when the source was parsed on this call. */
    structure?: SourceStructure;
    /** What happened to stored citations when this source replaced an earlier one. */
    reanchored?: ReanchorOutcome;
    /** Human-readable reason, for `rejected` and `unsupported`. */
    reason?: string;
}
/** Whether the pipeline has a parser for this file name. */
export declare function isSupportedSource(fileName: string): boolean;
/**
 * Ingest one material file into a vault.
 *
 * Idempotent by content: the same bytes parsed by the same parser version resolve
 * to `unchanged` without rewriting, so re-dropping a file is free and a parser
 * upgrade is what forces a rebuild.
 * @param vault - The destination vault; its layout must already exist.
 * @param filePath - Absolute path of the file to ingest.
 * @returns what happened, including the manifest entry when one was written.
 */
export declare function ingestSource(vault: TopicVault, filePath: string): Promise<IngestResult>;
/**
 * Ingest every supported file directly inside a directory.
 *
 * Deliberately shallow: a dropped folder of readings is the case worth serving,
 * while walking a whole tree would pull in whatever else happens to live below
 * it. Unsupported files are reported, not silently skipped, so the coverage the
 * learner is told about matches what was actually read.
 * @param vault - The destination vault.
 * @param directoryPath - Absolute directory to read.
 * @returns one result per entry, in directory order.
 */
export declare function ingestDirectory(vault: TopicVault, directoryPath: string): Promise<readonly IngestResult[]>;
/**
 * A one-line coverage statement for an ingest, in the terms the teaching layer
 * must repeat: what was read, and what was not.
 * @param result - One ingest result.
 * @returns a sentence, or `''` when the source parsed cleanly.
 */
export declare function describeDegradation(result: IngestResult): string;
//# sourceMappingURL=pipeline.d.ts.map