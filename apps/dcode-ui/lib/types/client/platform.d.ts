/** Platform presentation helpers shared by shortcut labels. */
interface NavigatorPlatformView {
    readonly userAgent?: string;
    readonly userAgentData?: {
        readonly platform?: string;
    };
}
/** Prefer User-Agent Client Hints and fall back to the conventional UA text. */
export declare function isApplePlatform(value?: NavigatorPlatformView | undefined): boolean;
/** User-facing command shortcut with the platform's conventional modifier. */
export declare function commandShortcut(key: string): string;
export {};
//# sourceMappingURL=platform.d.ts.map