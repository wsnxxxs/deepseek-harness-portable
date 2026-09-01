/** Persistent chunk storage and a small BM25 inverted index for a Space. */
import { type SourceChunk } from './chunker.ts';
import { type TopicVault } from '../topic-vault.ts';
export declare const LEXICAL_INDEX_PROTOCOL: "dsh-learning-index@1";
export interface LexicalDocument {
    sourceId: string;
    sectionId: string;
    ord: number;
    length: number;
}
export interface LexicalPosting {
    chunkId: string;
    tf: number;
}
export interface LexicalIndex {
    protocol: typeof LEXICAL_INDEX_PROTOCOL;
    sourceHashes: Readonly<Record<string, string>>;
    documents: Readonly<Record<string, LexicalDocument>>;
    postings: Readonly<Record<string, readonly LexicalPosting[]>>;
    averageDocumentLength: number;
}
export interface LexicalSearchHit {
    chunkId: string;
    sourceId: string;
    sectionId: string;
    ord: number;
    score: number;
    matchedTerms: readonly string[];
}
export interface LexicalSearchOptions {
    sourceIds?: readonly string[];
    limit?: number;
}
/** Tokenize Latin words and CJK bigrams without a runtime dictionary. */
export declare function tokenize(text: string): readonly string[];
/** Build a BM25 index from chunks. */
export declare function buildLexicalIndex(chunks: readonly SourceChunk[], sourceHashes?: Readonly<Record<string, string>>): LexicalIndex;
/** Search an index with BM25 and return the best chunk locators. */
export declare function searchLexicalIndex(index: LexicalIndex, terms: readonly string[], options?: LexicalSearchOptions): readonly LexicalSearchHit[];
export declare function lexicalIndexPathOf(vault: TopicVault): string;
/** Write one source's derived chunk stream. */
export declare function writeSourceChunks(vault: TopicVault, sourceId: string, chunks: readonly SourceChunk[]): Promise<void>;
/** Read one source's derived chunk stream; malformed cache lines are skipped. */
export declare function readSourceChunks(vault: TopicVault, sourceId: string): Promise<readonly SourceChunk[]>;
/** Load a valid index or rebuild the derived caches when a source changed. */
export declare function ensureLexicalIndex(vault: TopicVault): Promise<LexicalIndex>;
/**
 * Replace one source in an existing index after ingest. If no index exists yet,
 * leave it for the lazy full build so ingest remains as reliable as before.
 */
export declare function updateLexicalIndex(vault: TopicVault, sourceId: string, contentHash: string, chunks: readonly SourceChunk[]): Promise<void>;
//# sourceMappingURL=lexical.d.ts.map