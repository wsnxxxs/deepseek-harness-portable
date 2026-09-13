export const name = 'desktop-enhancements';
export function apply(ctx) {
    const bridge = window.deepSeekDesktopEnhancements;
    if (!bridge)
        return;
    ctx.effect(() => {
        bridge.setEnabled(true);
        return () => bridge.setEnabled(false);
    });
}
//# sourceMappingURL=index.js.map