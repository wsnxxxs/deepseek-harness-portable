/** Upgrade Portable-owned historical metadata while the official catalog migrates conversation events. */
import { randomUUID } from 'node:crypto';
import { link, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { constants, zstdCompressSync, zstdDecompressSync } from 'node:zlib';
import { sessionFormatCatalog } from '@deepseek-ai/dsh-session-format-catalog';
const OWNED_EVENTS = new Set([
    'portable-runtime/mode-resolution',
    'learning/state',
    'learning/segment',
    'learning/checkpoint-metrics',
]);
/** Fields emitted by the previous Portable release but absent from the frozen official v0 schema. */
function normalizeLegacyRow(row) {
    const result = structuredClone(row);
    if (result.type === 'subagent/descriptor' && result.data.version === 2) {
        result.data.version = 3;
    }
    if (result.type === 'permission/preset')
        delete result.data.origin;
    const visit = (value) => {
        if (!value || typeof value !== 'object')
            return;
        if (value.type === 'file' && value.attachment?.attachmentId && value.attachment.name !== undefined) {
            delete value.attachment.mediaType;
            delete value.attachment.extractionVersion;
            delete value.attachment.textSha256;
            delete value.attachment.textCharacters;
            delete value.attachment.textPreview;
        }
        for (const child of Object.values(value))
            visit(child);
    };
    visit(result.data);
    return result;
}
/** Node's synchronous decoder consumes one frame; historical logs concatenate many frames. */
export function decodeHistory(bytes, compressed) {
    const chunks = [];
    if (!compressed)
        chunks.push(bytes);
    else {
        let offset = 0;
        while (offset < bytes.length) {
            const result = zstdDecompressSync(bytes.subarray(offset), { info: true });
            if (result.engine.bytesWritten <= 0)
                throw new Error('Historical Zstandard frame made no progress');
            chunks.push(result.buffer);
            offset += result.engine.bytesWritten;
        }
    }
    return Buffer.concat(chunks).toString('utf8').trim().split('\n').map(line => JSON.parse(line));
}
/** Keep sequence mapping inside the upstream migration chain, including compact assistant runs. */
export function migrateHistory(rows) {
    const header = rows[0];
    if (!header || header.version >= sessionFormatCatalog.currentVersion)
        return;
    const owned = rows.slice(1).filter(row => OWNED_EVENTS.has(row.type));
    if (owned.length === 0)
        return;
    const token = `portable-history:${randomUUID()}:`;
    const originals = new Map(owned.map(row => [token + row.seq, row]));
    const restore = sessionFormatCatalog.createRestore(header, { recovery: 'strict', validation: 'current' });
    for (const row of rows.slice(1)) {
        // An in-memory metadata carrier lets the frozen official migrations map seqs.
        // It is replaced before encoding: no synthetic feedback reaches disk or the UI.
        restore.decodeRow(OWNED_EVENTS.has(row.type)
            ? { type: 'feedback/record', seq: row.seq, time: row.time, data: { text: token + row.seq } }
            : normalizeLegacyRow(row));
    }
    const artifact = restore.finish();
    let restored = 0;
    const events = artifact.events.map(event => {
        const original = event.type === 'feedback/record' ? originals.get(event.data.text) : undefined;
        if (!original)
            return event;
        restored += 1;
        return { ...event, type: original.type, data: original.data, ignorable: true };
    });
    if (restored !== owned.length)
        throw new Error('Historical extension metadata was not preserved');
    const physical = [
        sessionFormatCatalog.encodeCurrentHeader(artifact.header, artifact.inheritedEventCount),
        ...events.map(event => sessionFormatCatalog.encodeCurrentEvent(event)),
    ];
    const verify = sessionFormatCatalog.createRestore(physical[0], { recovery: 'strict', validation: 'current' });
    for (const row of physical.slice(1))
        verify.decodeRow(row);
    verify.finish();
    const options = { params: { [constants.ZSTD_c_checksumFlag]: 1 } };
    // The official reader expects the first frame to contain only the header.
    return Buffer.concat([
        zstdCompressSync(Buffer.from(JSON.stringify(physical[0]) + '\n'), options),
        zstdCompressSync(Buffer.from(physical.slice(1).map(row => JSON.stringify(row)).join('\n') + '\n'), options),
    ]);
}
/** Publish a new generation without changing any byte of the original log. */
export async function migrateHistoryFile(source) {
    const directory = dirname(source);
    const names = await readdir(directory);
    // A later generation belongs to the official backend; never replace it.
    const version = Number(/session\.v(\d+)\./.exec(source)?.[1] ?? 0);
    if (names.some(name => Number(/^session\.v(\d+)\.jsonl(?:\.zstd)?$/.exec(name)?.[1] ?? 0) > version))
        return false;
    const before = await stat(source);
    const bytes = await readFile(source);
    const migrated = migrateHistory(decodeHistory(bytes, source.endsWith('.zstd')));
    if (!migrated)
        return false;
    const temporary = join(directory, `portable-history-${randomUUID()}.tmp`);
    const compressed = source.endsWith('.zstd');
    const target = join(directory, `session.v${sessionFormatCatalog.currentVersion}.jsonl${compressed ? '.zstd' : ''}`);
    const output = compressed ? migrated : Buffer.from(decodeHistory(migrated, true).map(row => JSON.stringify(row)).join('\n') + '\n');
    try {
        await writeFile(temporary, output, { flag: 'wx', mode: 0o600 });
        const after = await stat(source);
        if (before.size !== after.size || before.mtimeMs !== after.mtimeMs)
            throw new Error('Historical session changed during migration');
        await link(temporary, target);
    }
    finally {
        await unlink(temporary).catch(() => { });
    }
    return true;
}
/** Run before the official profile starts reading sessions; unrelated histories remain untouched. */
export async function migratePortableHistories(root) {
    const result = { migrated: 0, failures: [] };
    async function visit(directory) {
        let entries;
        try {
            entries = await readdir(directory, { withFileTypes: true });
        }
        catch (error) {
            if (error.code === 'ENOENT')
                return;
            throw error;
        }
        const candidates = entries.filter(entry => entry.isFile() && /^session(?:\.v[12])?\.jsonl(?:\.zstd)?$/.test(entry.name));
        // Newest historical generation first; subsequent candidates skip the published v3.
        for (const entry of candidates.sort((a, b) => b.name.localeCompare(a.name))) {
            try {
                if (await migrateHistoryFile(join(directory, entry.name)))
                    result.migrated += 1;
            }
            catch (error) {
                result.failures.push(`${directory}: ${error.message}`);
            }
        }
        for (const entry of entries)
            if (entry.isDirectory())
                await visit(join(directory, entry.name));
    }
    await visit(root);
    return result;
}
//# sourceMappingURL=history-migration.js.map