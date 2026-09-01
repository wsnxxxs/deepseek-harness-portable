/** Source-provider seam for the directory-backed ingest pipeline. */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseSource } from "./index.js";
/**
 * Adapter around the existing byte parser. The public `ingestSource` function
 * remains the write-and-reanchor entry point; this provider only standardizes
 * acquisition and parsing for future URL/text providers.
 */
export const fileProvider = Object.freeze({
    id: 'file',
    canHandle: (ref) => ref.kind === 'file',
    async acquire(ref, _space) {
        return {
            bytes: await readFile(ref.path),
            fileName: ref.fileName ?? basename(ref.path),
            ...(ref.sourceId === undefined ? {} : { sourceId: ref.sourceId }),
            originPath: ref.path,
        };
    },
    async parse(acquired) {
        return await parseSource(acquired.bytes, acquired.fileName, acquired.sourceId);
    },
});
export const SOURCE_PROVIDERS = Object.freeze([fileProvider]);
//# sourceMappingURL=provider.js.map