/**
 * A minimal read-only ZIP reader over the central directory, supporting the two
 * methods OOXML actually uses (stored and deflate). Office formats are ZIP
 * containers, and pulling in an archive dependency to read four XML parts would
 * cost a portable desktop build more than these eighty lines.
 * @module @dsh-portable/interactive-learning/src/ingest/zip
 */
import { inflateRawSync } from 'node:zlib';
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
/** EOCD is 22 bytes plus a comment of at most 0xffff. */
const MAX_EOCD_SCAN = 22 + 0xffff;
const ZIP64_SENTINEL = 0xffff;
/** A ZIP archive that could not be read as one. */
export class ZipFormatError extends Error {
    constructor(reason) {
        super(`not a readable zip archive: ${reason}`);
        this.name = 'ZipFormatError';
    }
}
function locateEndOfCentralDirectory(view) {
    const start = Math.max(0, view.length - MAX_EOCD_SCAN);
    for (let offset = view.length - 22; offset >= start; offset -= 1) {
        if (view.readUInt32LE(offset) === EOCD_SIGNATURE)
            return offset;
    }
    throw new ZipFormatError('no end-of-central-directory record');
}
/**
 * List the archive's members from its central directory.
 * @param bytes - The whole archive.
 * @returns every member, in central-directory order.
 */
export function listZipEntries(bytes) {
    const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = locateEndOfCentralDirectory(view);
    const count = view.readUInt16LE(eocd + 10);
    if (count === ZIP64_SENTINEL)
        throw new ZipFormatError('zip64 archives are not supported');
    let cursor = view.readUInt32LE(eocd + 16);
    const entries = [];
    for (let index = 0; index < count; index += 1) {
        if (cursor + 46 > view.length || view.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
            throw new ZipFormatError(`central directory entry ${index} is malformed`);
        }
        const nameLength = view.readUInt16LE(cursor + 28);
        const extraLength = view.readUInt16LE(cursor + 30);
        const commentLength = view.readUInt16LE(cursor + 32);
        entries.push({
            name: view.toString('utf8', cursor + 46, cursor + 46 + nameLength),
            method: view.readUInt16LE(cursor + 10),
            compressedSize: view.readUInt32LE(cursor + 20),
            uncompressedSize: view.readUInt32LE(cursor + 24),
            localHeaderOffset: view.readUInt32LE(cursor + 42),
        });
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}
/**
 * Decompress one member's bytes.
 * @param bytes - The whole archive.
 * @param entry - The member to read, from {@link listZipEntries}.
 * @returns the member's uncompressed content.
 */
export function readZipEntry(bytes, entry) {
    const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const header = entry.localHeaderOffset;
    if (header + 30 > view.length || view.readUInt32LE(header) !== LOCAL_SIGNATURE) {
        throw new ZipFormatError(`local header for '${entry.name}' is malformed`);
    }
    const nameLength = view.readUInt16LE(header + 26);
    const extraLength = view.readUInt16LE(header + 28);
    const start = header + 30 + nameLength + extraLength;
    if (start < 0 || start > view.length || entry.compressedSize > view.length - start) {
        throw new ZipFormatError(`data for '${entry.name}' is truncated`);
    }
    const payload = view.subarray(start, start + entry.compressedSize);
    if (entry.method === 0)
        return Buffer.from(payload);
    if (entry.method === 8) {
        try {
            return inflateRawSync(payload);
        }
        catch (cause) {
            throw new ZipFormatError(`data for '${entry.name}' could not be decompressed: ${cause instanceof Error ? cause.message : 'invalid deflate data'}`);
        }
    }
    throw new ZipFormatError(`unsupported compression method ${entry.method} for '${entry.name}'`);
}
/**
 * Read one member by exact archive path.
 * @param bytes - The whole archive.
 * @param name - Archive-relative path, e.g. `word/document.xml`.
 * @returns the member's UTF-8 text, or `undefined` when absent.
 */
export function readZipText(bytes, name) {
    const entry = listZipEntries(bytes).find(candidate => candidate.name === name);
    return entry === undefined ? undefined : readZipEntry(bytes, entry).toString('utf8');
}
//# sourceMappingURL=zip.js.map