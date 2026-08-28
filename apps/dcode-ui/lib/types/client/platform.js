/** Platform presentation helpers shared by shortcut labels. */
/** Prefer User-Agent Client Hints and fall back to the conventional UA text. */
export function isApplePlatform(value = typeof navigator === 'undefined' ? undefined : navigator) {
    const platform = value?.userAgentData?.platform;
    const candidate = platform === undefined || platform === '' ? value?.userAgent ?? '' : platform;
    return /mac|iphone|ipad|ipod/i.test(candidate);
}
/** User-facing command shortcut with the platform's conventional modifier. */
export function commandShortcut(key) {
    return isApplePlatform() ? `⌘${key}` : `Ctrl+${key}`;
}
//# sourceMappingURL=platform.js.map