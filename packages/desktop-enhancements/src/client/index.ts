import type { Context } from '@deepseek-ai/cordis'
export const name = 'desktop-enhancements'
export function apply(ctx: Context): void {
  const bridge = (window as unknown as { deepSeekDesktopEnhancements?: { setEnabled(enabled: boolean): void } }).deepSeekDesktopEnhancements
  if (!bridge) return
  ctx.effect(() => {
    bridge.setEnabled(true)
    return () => bridge.setEnabled(false)
  })
}
