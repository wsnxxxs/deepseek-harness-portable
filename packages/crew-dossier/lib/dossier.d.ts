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
import { type ParseDegradation, type TopicVault } from '@dsh-portable/space-kernel';
/** Directory a mission's dossier occupies inside its workspace. */
export declare const DOSSIER_DIRECTORY = ".dossier";
/** Longest excerpt one read returns before it is trimmed to its opening. */
export declare const MAX_READ_CHARS = 8000;
/** Longest excerpt one search hit carries. */
export declare const MAX_HIT_CHARS = 320;
/** Most hits one search returns. */
export declare const MAX_HITS = 12;
/**
 * The dossier of one workspace, if it has been started.
 *
 * Never creates one: a mission that has attached nothing must read as empty
 * rather than as a fresh dossier the operator did not ask for.
 * @param cwd - the mission's working directory.
 * @returns the space, or undefined when nothing has been attached yet.
 */
export declare function openDossier(cwd: string | undefined): Promise<TopicVault | undefined>;
/**
 * The dossier of one workspace, creating it if needed.
 *
 * Only the attach path calls this: a dossier exists because the operator put
 * something in it.
 * @param cwd - the mission's working directory.
 * @returns the space.
 * @throws {Error} when the mission has no working directory to hold one.
 */
export declare function startDossier(cwd: string | undefined): Promise<TopicVault>;
/**
 * Say what a parser could NOT read, in the operator's words.
 *
 * Stated rather than omitted, and this is the property that makes a dossier
 * answer trustworthy: a surface and a model can both say "pages 12–18 are
 * images" instead of implying the whole document was understood.
 * @param degradation - what the parser reported.
 * @returns one sentence per gap.
 */
export declare function describeUnread(degradation: readonly ParseDegradation[]): string[];
/** One attached source as the map reports it. */
export interface DossierSource {
    readonly sourceId: string;
    readonly title: string;
    readonly sections: number;
    /** What could not be read, stated rather than omitted. */
    readonly unread: string[];
    /** Top-level headings, so a reader can choose a section without a full dump. */
    readonly outline: {
        sectionId: string;
        heading: string;
        page?: number;
    }[];
}
/**
 * Every source in a dossier, with its outline and its unread parts.
 * @param vault - the dossier.
 * @param sourceId - narrow to one source; omit for all of them.
 * @returns one entry per source, in manifest order.
 */
export declare function dossierMap(vault: TopicVault, sourceId?: string): Promise<DossierSource[]>;
/** One passage returned by a read or a search, with the citation it came from. */
export interface DossierPassage {
    readonly sourceId: string;
    readonly title: string;
    /** The citation an answer quotes; it survives a re-import of the source. */
    readonly anchor: string;
    readonly heading: string;
    readonly page?: number;
    readonly text: string;
    /** True when the passage was trimmed and more of the section exists. */
    readonly truncated: boolean;
}
/**
 * Read one section of one source.
 * @param vault - the dossier.
 * @param sourceId - source to read.
 * @param sectionId - section within it.
 * @returns the passage, or undefined when either id is unknown.
 */
export declare function dossierRead(vault: TopicVault, sourceId: string, sectionId: string): Promise<DossierPassage | undefined>;
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
export declare function dossierSearch(vault: TopicVault, query: string, limit?: number): Promise<DossierPassage[]>;
//# sourceMappingURL=dossier.d.ts.map