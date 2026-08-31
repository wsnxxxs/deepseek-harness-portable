/**
 * The mission dossier panel.
 *
 * This is where the loop closes. A board task says what to do; the brief says
 * how far the mission has got; the dossier says what the crew is working FROM.
 * Attaching a spec here is what makes `dossier_search` answer, and every answer
 * carries an anchor that opens the passage it came from.
 *
 * Two things are shown that a document list normally hides, and both are the
 * reason to trust the answers:
 *
 * - what the parser could NOT read, per source, in words;
 * - the passage behind a search hit, so a citation can be checked rather than
 *   taken on faith.
 *
 * Attaching is an operator action by design: no model-facing tool can put a
 * file into a space, which is what makes the space's contents knowable.
 * @module @dsh-portable/crew-ui/client/shell/DossierPanel
 */
/** One attached source, as the host channel reports it. */
export interface DossierSourceView {
    readonly sourceId: string;
    readonly title: string;
    readonly sections: number;
    readonly unread: readonly string[];
    readonly outline: readonly {
        readonly sectionId: string;
        readonly heading: string;
        readonly page?: number;
    }[];
}
/** One passage returned by a search. */
export interface DossierPassageView {
    readonly sourceId: string;
    readonly title: string;
    readonly anchor: string;
    readonly heading: string;
    readonly page?: number;
    readonly text: string;
    readonly truncated: boolean;
}
/** Props of the dossier panel. */
export interface DossierPanelProps {
    /** Working directory of the mission; a dossier belongs to one. */
    readonly cwd: string | undefined;
}
/** The attached-sources panel. */
export declare function DossierPanel({ cwd }: DossierPanelProps): import("react").JSX.Element;
//# sourceMappingURL=DossierPanel.d.ts.map