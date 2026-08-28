/** Platform presentation helpers shared by shortcut labels. */

interface NavigatorPlatformView {
  readonly userAgent?: string
  readonly userAgentData?: { readonly platform?: string }
}

/** Prefer User-Agent Client Hints and fall back to the conventional UA text. */
export function isApplePlatform(
  value: NavigatorPlatformView | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): boolean {
  const platform = value?.userAgentData?.platform
  const candidate = platform === undefined || platform === '' ? value?.userAgent ?? '' : platform
  return /mac|iphone|ipad|ipod/i.test(candidate)
}

/** User-facing command shortcut with the platform's conventional modifier. */
export function commandShortcut(key: string): string {
  return isApplePlatform() ? `⌘${key}` : `Ctrl+${key}`
}
