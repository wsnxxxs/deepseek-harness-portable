/**
 * Portable's own review notes for marketplace repositories.
 *
 * Membership of the GitHub `dsh-plugin` topic is a label anybody can add to a
 * repository; it is not a compatibility claim and not a safety claim. This
 * table is the only place either claim is made, and it is deliberately short:
 * a repository absent from it is reported as unverified rather than assumed
 * benign, because installing a plugin changes the agent's tools, prompts,
 * network reach and local processes.
 *
 * The notes are facts about a specific audited revision, so they are carried
 * in both shipped locales rather than translated at runtime — a machine
 * translation of a security note is not the note.
 * @module @dsh-portable/dcode-ui/client/plugins/audits
 */
/** The locales the workbench ships copy in. */
export type AuditLocale = 'en' | 'zh';
/** One field of a review note, in both shipped locales. */
type Bilingual = Readonly<Record<AuditLocale, string>>;
/** What Portable checked about one repository, and when. */
export interface PluginAudit {
    /** Whether Portable has a review record at all. */
    readonly reviewed: boolean;
    /** Explicit discovery metadata maintained with the review record. */
    readonly featured: boolean;
    readonly featuredSource: Bilingual;
    readonly category: 'interface' | 'vision' | 'design';
    readonly compatibility: Readonly<Record<'win32' | 'darwin' | 'linux', 'compatible' | 'incompatible' | 'unknown'>>;
    readonly contract: Bilingual;
    readonly platform: Bilingual;
    readonly runtime: Bilingual;
    readonly egress: Bilingual;
    readonly activation: Bilingual;
    readonly issues: Bilingual;
    readonly verified: Bilingual;
}
/**
 * Look up Portable's review of one repository.
 * @param fullName - the repository's `owner/repo`.
 * @returns the review, or undefined when Portable has never reviewed it.
 */
export declare function auditFor(fullName: string): PluginAudit | undefined;
/** Repositories that have a real bundled review record. */
export declare function reviewedRepositories(): readonly string[];
export {};
//# sourceMappingURL=audits.d.ts.map