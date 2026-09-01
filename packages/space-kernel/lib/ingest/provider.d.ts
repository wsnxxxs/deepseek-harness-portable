/** Source-provider seam for the directory-backed ingest pipeline. */
import type { ParsedSource } from './types.ts';
import type { Space } from '../space/index.ts';
/** References accepted by the first provider; more kinds can join without changing ingest. */
export interface FileSourceRef {
    kind: 'file';
    path: string;
    sourceId?: string;
    fileName?: string;
}
export type SourceRef = FileSourceRef;
export interface AcquiredBytes {
    bytes: Uint8Array;
    fileName: string;
    sourceId?: string;
    originPath?: string;
}
export interface SourceProvider {
    readonly id: string;
    canHandle(ref: SourceRef): boolean;
    acquire(ref: SourceRef, space: Space): Promise<AcquiredBytes>;
    parse(acquired: AcquiredBytes): Promise<ParsedSource>;
}
/**
 * Adapter around the existing byte parser. The public `ingestSource` function
 * remains the write-and-reanchor entry point; this provider only standardizes
 * acquisition and parsing for future URL/text providers.
 */
export declare const fileProvider: SourceProvider;
export declare const SOURCE_PROVIDERS: readonly SourceProvider[];
//# sourceMappingURL=provider.d.ts.map