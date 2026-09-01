/** Chunk the parsed section bodies into bounded, citeable retrieval units. */
import type { SourceStructure } from '../ingest/types.ts';
export declare const DEFAULT_CHUNK_TARGET_CHARS = 1000;
export declare const DEFAULT_CHUNK_OVERLAP = 0.15;
export interface SourceChunk {
    chunkId: string;
    sourceId: string;
    sectionId: string;
    ord: number;
    anchor: string;
    quoteHash: string;
    page?: number;
    text: string;
}
export interface ChunkOptions {
    targetChars?: number;
    overlap?: number;
}
/**
 * Build chunks without crossing section boundaries. The input is the extracted
 * markdown split into physical lines, so anchors continue to resolve against
 * the existing structure file.
 */
export declare function chunkSource(structure: SourceStructure, lines: readonly string[], options?: ChunkOptions): readonly SourceChunk[];
//# sourceMappingURL=chunker.d.ts.map