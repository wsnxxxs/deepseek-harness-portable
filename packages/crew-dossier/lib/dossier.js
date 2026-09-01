/**
 * The mission dossier: where it lives, and what can be read out of it.
 *
 * A dossier is a space at `<workspace>/.dossier`. One per workspace, not one
 * per session, because a crew's teammates work the same directory and a spec
 * attached by the Lead has to be readable by the teammate implementing against
 * it.
 *
 * The model gets three READ-ONLY entry points. Attaching a source is an
 * operator action through the host channel, so the property the learning pack
 * established survives here: every write into a space is made by the Host on a
 * path the Host built, and no model-facing tool can put a file into one.
 * @module @dsh-portable/crew-dossier/dossier
 */
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { activeSourceIds, containedPath, ensureLexicalIndex, ensureVaultLayout, isVaultRoot, readAllStructures, readSourceChunks, readStructure, searchLexicalIndex, } from '@dsh-portable/space-kernel';
/** Directory a mission's dossier occupies inside its workspace. */
export const DOSSIER_DIRECTORY = '.dossier';
/** Longest excerpt one read returns before it is trimmed to its opening. */
export const MAX_READ_CHARS = 8_000;
/** Longest excerpt one search hit carries. */
export const MAX_HIT_CHARS = 320;
/** Most hits one search returns. */
export const MAX_HITS = 12;
/**
 * The dossier of one workspace, if it has been started.
 *
 * Never creates one: a mission that has attached nothing must read as empty
 * rather than as a fresh dossier the operator did not ask for.
 * @param cwd - the mission's working directory.
 * @returns the space, or undefined when nothing has been attached yet.
 */
export async function openDossier(cwd) {
    if (cwd === undefined || cwd === '')
        return undefined;
    const root = join(cwd, DOSSIER_DIRECTORY);
    return (await isVaultRoot(root)) ? await ensureVaultLayout(root) : undefined;
}
/**
 * The dossier of one workspace, creating it if needed.
 *
 * Only the attach path calls this: a dossier exists because the operator put
 * something in it.
 * @param cwd - the mission's working directory.
 * @returns the space.
 * @throws {Error} when the mission has no working directory to hold one.
 */
export async function startDossier(cwd) {
    if (cwd === undefined || cwd === '') {
        throw new Error('this mission has no working directory, so it cannot hold a dossier');
    }
    return await ensureVaultLayout(join(cwd, DOSSIER_DIRECTORY));
}
/**
 * Say what a parser could NOT read, in the operator's words.
 *
 * Stated rather than omitted, and this is the property that makes a dossier
 * answer trustworthy: a surface and a model can both say "pages 12–18 are
 * images" instead of implying the whole document was understood.
 * @param degradation - what the parser reported.
 * @returns one sentence per gap.
 */
export function describeUnread(degradation) {
    return degradation.map((entry) => {
        switch (entry.kind) {
            case 'image-only-pages':
                return `pages ${entry.pages.join(', ')} are images with no extractable text`;
            case 'multi-column-guess':
                return `pages ${entry.pages.join(', ')} are multi-column and their reading order is a guess`;
            case 'formula-dropped':
                return `${String(entry.count)} formula(s) could not be represented as text`;
            case 'truncated':
                return `reading stopped after page ${String(entry.afterPage)}: ${entry.reason}`;
            case 'unsupported-format':
                return `no parser for ${entry.extension} files`;
            case 'parser-unavailable':
                return `the ${entry.extension} parser needs ${entry.module}, which is not installed`;
            case 'empty-source':
                return `nothing could be extracted: ${entry.reason}`;
        }
    });
}
/** Sections are stored flat with a parent link; the outline is the roots. */
function outlineOf(structure) {
    return structure.sections
        .filter(section => section.parentId === undefined)
        .map(section => ({
        sectionId: section.id,
        heading: section.headingPath.join(' › '),
        ...(section.page === undefined ? {} : { page: section.page }),
    }));
}
/**
 * Every source in a dossier, with its outline and its unread parts.
 * @param vault - the dossier.
 * @param sourceId - narrow to one source; omit for all of them.
 * @returns one entry per source, in manifest order.
 */
export async function dossierMap(vault, sourceId) {
    const structures = sourceId === undefined
        ? await readAllStructures(vault)
        : [await readStructure(vault, sourceId)].filter((item) => item !== undefined);
    return structures.map(structure => ({
        sourceId: structure.sourceId,
        title: structure.title,
        sections: structure.sections.length,
        unread: describeUnread(structure.degradation),
        outline: outlineOf(structure),
    }));
}
/** Find one section by id. */
function findSection(structure, sectionId) {
    return structure.sections.find(section => section.id === sectionId);
}
/**
 * Read one section of one source.
 * @param vault - the dossier.
 * @param sourceId - source to read.
 * @param sectionId - section within it.
 * @returns the passage, or undefined when either id is unknown.
 */
export async function dossierRead(vault, sourceId, sectionId) {
    const structure = await readStructure(vault, sourceId);
    if (structure === undefined)
        return undefined;
    const section = findSection(structure, sectionId);
    if (section === undefined)
        return undefined;
    const path = await containedPath(vault, structure.extractedPath);
    const lines = (await readFile(path, 'utf8')).split('\n');
    // `[line, endLine)` is this section's OWN body; descendants are read through
    // their own ids, which keeps progressive disclosure the default.
    const body = lines.slice(section.line - 1, section.endLine - 1).join('\n').trim();
    const truncated = body.length > MAX_READ_CHARS;
    return {
        sourceId: structure.sourceId,
        title: structure.title,
        anchor: `${structure.sourceId}#${section.headingPath.join(' › ')}`,
        heading: section.headingPath.join(' › '),
        ...(section.page === undefined ? {} : { page: section.page }),
        text: truncated ? `${body.slice(0, MAX_READ_CHARS)}…` : body,
        truncated,
    };
}
/**
 * Search every attached source.
 *
 * Backed by the kernel's lexical index rather than a substring scan, so a large
 * dossier stays usable and ranking is length-normalized instead of favouring
 * whichever section happens to be longest. Each hit carries the chunk's own
 * anchor, so an answer can cite the passage it actually used.
 * @param vault - the dossier.
 * @param query - free text.
 * @param limit - maximum hits, capped at {@link MAX_HITS}.
 * @returns ranked passages, best first.
 */
export async function dossierSearch(vault, query, limit = MAX_HITS) {
    if (query.trim() === '')
        return [];
    if ((await activeSourceIds(vault)).length === 0)
        return [];
    const index = await ensureLexicalIndex(vault);
    const hits = searchLexicalIndex(index, [query], { limit: Math.min(limit, MAX_HITS) });
    if (hits.length === 0)
        return [];
    // Chunks are stored per source; read each source once rather than per hit.
    const chunksBySource = new Map();
    const titles = new Map();
    for (const sourceId of new Set(hits.map(hit => hit.sourceId))) {
        chunksBySource.set(sourceId, await readSourceChunks(vault, sourceId));
        titles.set(sourceId, (await readStructure(vault, sourceId))?.title ?? sourceId);
    }
    const passages = [];
    for (const hit of hits) {
        const chunk = chunksBySource.get(hit.sourceId)?.find(candidate => candidate.chunkId === hit.chunkId);
        // A hit whose chunk is gone means the index outran the store; skipping it
        // is better than inventing text for a citation.
        if (chunk === undefined)
            continue;
        const text = chunk.text.trim();
        const truncated = text.length > MAX_HIT_CHARS;
        passages.push({
            sourceId: hit.sourceId,
            title: titles.get(hit.sourceId) ?? hit.sourceId,
            anchor: chunk.anchor,
            heading: chunk.anchor.split('#')[1] ?? '',
            ...(chunk.page === undefined ? {} : { page: chunk.page }),
            text: truncated ? `${text.slice(0, MAX_HIT_CHARS)}…` : text,
            truncated,
        });
    }
    return passages;
}
//# sourceMappingURL=dossier.js.map