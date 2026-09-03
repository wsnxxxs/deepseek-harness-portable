/**
 * Browser face of the plugin marketplace Host feed.
 *
 * The marketplace ships as its own Host plugin (`dsh-plugin-marketplace`,
 * seeded into the web profile by the runtime's marketplace bootstrap) and
 * exposes plain HTTP routes under `/api/market`. The workbench talks to those
 * routes directly rather than mirroring the catalogue: there is one sync
 * cache, one install queue and one profile manifest, all of them the Host's.
 *
 * Everything crossing the wire is normalised here. The Host half is a
 * separately versioned package that may be absent, older, or replaced by a
 * page answering HTML for an unregistered route, so no component is handed an
 * `unknown`: a missing route becomes a {@link MarketResult} marked
 * `unavailable`, and a drifting payload degrades field by field instead of
 * throwing inside a card.
 * @module @dsh-portable/dcode-ui/client/plugins/market
 */
/** Root of the Host's marketplace routes. */
export declare const MARKET_BASE = "/api/market";
/** Page size the catalogue is requested in. */
export declare const MARKET_PAGE_SIZE = 50;
/** GitHub topic the Host syncs the catalogue from. */
export declare const MARKET_TOPIC_URL = "https://github.com/topics/dsh-plugin";
/** Which catalogue the Host was asked to return. */
export type MarketScope = 'curated' | 'explore';
/** Explicit marketplace metadata. Unknown is preferable to an inferred claim. */
export type PluginCategory = 'interface' | 'vision' | 'design' | 'automation' | 'developer' | 'other' | 'unknown';
export type ReviewStatus = 'reviewed' | 'unreviewed' | 'unknown';
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'unknown';
export type MaintenanceStatus = 'active' | 'stale' | 'unknown';
export type MarketSource = 'portable-curated' | 'github-topic' | 'unknown';
/** How far a plugin has travelled from "package on disk" to "loaded". */
export type PluginExposure = 'boot-configured' | 'pending-restart' | 'stale' | 'inactive' | 'unknown';
/** Phases the Host reports while an install or update job runs. */
export type JobPhase = 'pending' | 'resolving' | 'downloading' | 'installing' | 'done' | 'error' | 'canceled';
/** One repository in the catalogue. */
export interface MarketItem {
    readonly fullName: string;
    readonly url: string;
    readonly description: string;
    readonly stars: number;
    readonly language: string;
    readonly homepage: string;
    readonly updatedAt: string;
    readonly source: MarketSource;
    readonly featured: boolean;
    readonly featuredSource: string | undefined;
    readonly category: PluginCategory;
    readonly reviewStatus: ReviewStatus;
    readonly compatibility: CompatibilityStatus;
    readonly maintenance: MaintenanceStatus;
    /** Already present in the profile, as reported by the Host. */
    readonly installed: boolean;
    /** Installed, but the harness has not restarted onto it yet. */
    readonly needsRestart: boolean;
}
/** One page of the catalogue. */
export interface MarketPage {
    readonly items: readonly MarketItem[];
    readonly total: number;
    readonly page: number;
    readonly hasMore: boolean;
    /** When the Host last reached GitHub, or 0 while it never has. */
    readonly fetchedAt: number;
    /** A sync failure the Host reports alongside whatever it still had cached. */
    readonly error: string | undefined;
    /** Runtime platform reported by the Host; empty on older Hosts. */
    readonly platform: string;
}
/** One plugin installed into the web profile. */
export interface InstalledPlugin {
    readonly name: string;
    readonly kind: 'installed' | 'builtin';
    readonly enabled: boolean;
    /** Whether the entry point and dependencies resolve; unknown on old Hosts. */
    readonly available: boolean | undefined;
    readonly activated: boolean;
    readonly exposure: PluginExposure;
    readonly version: string | undefined;
    readonly latestVersion: string | undefined;
    readonly updateAvailable: boolean;
    readonly description: string | undefined;
    readonly homepage: string | undefined;
}
/** The marketplace's own package, which it never offers to remove. */
export interface MarketSelf {
    readonly name: string;
    readonly version: string | undefined;
    readonly latestVersion: string | undefined;
    readonly updateAvailable: boolean;
}
/** The profile inventory the manage view reads. */
export interface InstalledSnapshot {
    readonly plugins: readonly InstalledPlugin[];
    readonly self: MarketSelf | undefined;
    readonly error: string | undefined;
}
/** How many packages one job has moved. */
export interface JobPackages {
    readonly resolved: number;
    readonly reused: number;
    readonly downloaded: number;
    readonly added: number;
}
/** Live progress of one install or update job. */
export interface InstallJob {
    readonly id: string;
    readonly phase: JobPhase;
    readonly step: string;
    /** 0–100, or undefined while the Host cannot estimate it. */
    readonly percent: number | undefined;
    readonly packages: JobPackages;
    readonly bytesDown: number;
    readonly bytesTotal: number;
    readonly speedBps: number;
    readonly etaSec: number | undefined;
    readonly log: readonly string[];
    readonly done: boolean;
    readonly ok: boolean;
    readonly error: string | undefined;
    readonly requiresRestart: boolean;
    readonly output: string;
}
/**
 * The envelope every call answers in.
 *
 * `unavailable` separates "this deployment has no marketplace Host" from "the
 * marketplace answered and refused", because only the first is a reason to
 * replace the whole surface with an explanation.
 */
export type MarketResult<T> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: string;
    readonly unavailable: boolean;
};
/** The `fetch` face this module needs, so a test can supply its own. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
/**
 * Read one page of the catalogue.
 * @param raw - the `/api/market/list` body.
 * @param page - the page that was asked for, used when the Host omits it.
 * @returns a page that is safe to render, empty when the body is unusable.
 */
export declare function normalizeMarketPage(raw: unknown, page: number): MarketPage;
/**
 * Read the profile inventory.
 *
 * Upstream built-ins remain hidden, but the Portable feature packages are
 * user-facing and share the marketplace's enable/disable lifecycle. They are
 * still not removable because they are shipped with the harness.
 * @param raw - the `/api/market/installed` body.
 * @returns the third-party plugins, the marketplace's own package, and any
 *   error the Host reported alongside them.
 */
export declare function normalizeInstalled(raw: unknown): InstalledSnapshot;
/**
 * Read a job snapshot.
 * @param raw - the `job` field of an `/api/market/install/status` body.
 * @returns the job, or undefined when the body carries none.
 */
export declare function normalizeJob(raw: unknown): InstallJob | undefined;
/** Binary size, at the precision each magnitude can justify. */
export declare function formatBytes(value: number): string;
/** Transfer rate, or an empty string while the Host has not measured one. */
export declare function formatSpeed(value: number): string;
/** One step of the four-stage lifecycle a plugin passes through. */
export interface LifecycleStep {
    readonly id: 'installed' | 'available' | 'activated' | 'exposed';
    readonly state: 'done' | 'pending' | 'off' | 'unknown';
}
/**
 * Derive the lifecycle strip.
 *
 * The four stages are facts the Host reports separately, and the distinction
 * that matters to an operator is between "not switched on" and "switched on
 * but the harness has not restarted onto it" — the second is why a freshly
 * enabled plugin still does nothing.
 * @param plugin - one installed plugin.
 * @returns the four steps, in the order they happen.
 */
export declare function lifecycleSteps(plugin: InstalledPlugin): readonly LifecycleStep[];
/**
 * Whether an installed plugin is still waiting for a harness restart.
 * @param plugin - one installed plugin.
 * @returns true while what is loaded differs from what the profile says.
 */
export declare function pendingRestart(plugin: InstalledPlugin): boolean;
/** The marketplace calls the workbench makes. */
export interface MarketClient {
    list(query: string, page: number, signal?: AbortSignal, scope?: MarketScope): Promise<MarketResult<MarketPage>>;
    installed(signal?: AbortSignal): Promise<MarketResult<InstalledSnapshot>>;
    /** Start an install; answers a job id, or `undefined` on a synchronous Host. */
    install(spec: string): Promise<MarketResult<string | undefined>>;
    update(name: string): Promise<MarketResult<string | undefined>>;
    setEnabled(name: string, enabled: boolean): Promise<MarketResult<undefined>>;
    uninstall(name: string): Promise<MarketResult<undefined>>;
    job(jobId: string): Promise<MarketResult<InstallJob>>;
    cancel(jobId: string): Promise<void>;
    translate(text: string): Promise<MarketResult<string>>;
}
/**
 * Build the marketplace client.
 *
 * Every call returns the envelope rather than throwing: the marketplace is an
 * optional Host plugin, and a deployment without it has to render an
 * explanation, not an error boundary.
 * @param fetchImpl - the transport, defaulting to the page's own `fetch`.
 * @returns the client the plugins surface drives.
 */
export declare function createMarketClient(fetchImpl?: FetchLike): MarketClient;
//# sourceMappingURL=market.d.ts.map