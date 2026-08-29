export interface CachedProfileFallbackHealerOptions {
    readonly profileDir: string;
    readonly installAnchor: string;
    readonly runtimeDepsPath?: string;
    readonly bundles: () => readonly string[];
    readonly heal: (options: {
        installAnchor: string;
    }) => void | Promise<void>;
}
/**
 * Skip the installation fallback BFS when the runtime dependency generation
 * and composed profile bundle list are unchanged. The marker lock and the
 * second read inside it keep concurrent launches from racing a repair.
 */
export declare function createCachedProfileFallbackHealer(options: CachedProfileFallbackHealerOptions): () => Promise<void>;
//# sourceMappingURL=profile-fallback-cache.d.ts.map