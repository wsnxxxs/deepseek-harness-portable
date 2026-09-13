export declare function hasLegacyMarketplace(manifest: Record<string, any>): boolean;
/** The dsh-web inventory reads physical profile dependencies, outside Loader's fallback resolver. */
export declare function linkPluginManagement(profileDir: string, packageDir: string): Promise<void>;
/** Keep explicit feature choices while replacing the retired standalone marketplace. */
export declare function prepareOfficialProfile(manifest: Record<string, any>, managementPath?: string): Record<string, any>;
//# sourceMappingURL=official-profile.d.ts.map