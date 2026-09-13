/** The dsh-web inventory reads physical profile dependencies, outside Loader's fallback resolver. */
export declare function linkPluginManagement(profileDir: string, packageDir: string): Promise<void>;
/** Keep explicit plugin choices and add only the desktop bridge to official profiles. */
export declare function prepareOfficialProfile(manifest: Record<string, any>, managementPath?: string): Record<string, any>;
//# sourceMappingURL=official-profile.d.ts.map