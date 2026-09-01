/**
 * The pptx parser. A deck's own structure is already the structure a learner
 * navigates — one slide is one section — so this reads the slide order from the
 * presentation part rather than guessing it from file names, and keeps the
 * title placeholder as the section heading.
 *
 * Written here rather than delegated: every general-purpose office extractor
 * flattens a deck to running text, which destroys exactly the slide-as-section
 * boundary the teaching layer anchors to.
 * @module @dsh-portable/interactive-learning/src/ingest/pptx
 */
import { type ParsedSource } from './types.ts';
/**
 * Parse a pptx deck into blocks: one slide is one level-2 section, the title
 * placeholder is its heading, remaining shapes are its body, speaker notes are
 * a caption.
 * @param bytes - The pptx archive.
 * @param options - Source identity and display title.
 * @returns the parsed source, with a degradation entry for every text-free slide.
 */
export declare function parsePptxSource(bytes: Uint8Array, options: {
    sourceId: string;
    title: string;
}): ParsedSource;
//# sourceMappingURL=pptx.d.ts.map