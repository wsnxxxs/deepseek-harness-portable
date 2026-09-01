/**
 * A minimal read-only ZIP reader over the central directory, supporting the two
 * methods OOXML actually uses (stored and deflate). Office formats are ZIP
 * containers, and pulling in an archive dependency to read four XML parts would
 * cost a portable desktop build more than these eighty lines.
 * @module @dsh-portable/interactive-learning/src/ingest/zip
 */
/** A ZIP archive that could not be read as one. */
export declare class ZipFormatError extends Error {
    constructor(reason: string);
}
/** One archive member, keyed by its archive-relative path. */
export interface ZipEntry {
    name: string;
    method: number;
    compressedSize: number;
    uncompressedSize: number;
    localHeaderOffset: number;
}
/**
 * List the archive's members from its central directory.
 * @param bytes - The whole archive.
 * @returns every member, in central-directory order.
 */
export declare function listZipEntries(bytes: Uint8Array): readonly ZipEntry[];
/**
 * Decompress one member's bytes.
 * @param bytes - The whole archive.
 * @param entry - The member to read, from {@link listZipEntries}.
 * @returns the member's uncompressed content.
 */
export declare function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Buffer;
/**
 * Read one member by exact archive path.
 * @param bytes - The whole archive.
 * @param name - Archive-relative path, e.g. `word/document.xml`.
 * @returns the member's UTF-8 text, or `undefined` when absent.
 */
export declare function readZipText(bytes: Uint8Array, name: string): string | undefined;
//# sourceMappingURL=zip.d.ts.map