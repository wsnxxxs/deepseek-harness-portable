/**
 * Client-side plugin entry for @dsh-portable/vision-bridge.
 * Mounts VisionCard into the `settings.plugin.item` slot.
 * @module @dsh-portable/vision-bridge/client
 */
import { zh, en } from "./locales.js";
import { VisionCard } from "./VisionCard.js";
import { VisionRouteMarker } from "./VisionRouteMarker.js";
import { VisionCardController } from "./vision-card-controller.js";
export const name = 'vision-bridge-client';
/**
 * Only services read by this body belong in Cordis injection. The settings
 * card and composer marker target slots owned by other plugins; `slots.inject`
 * below waits for those declarations without making either slot owner a
 * service-level activation barrier.
 */
export const inject = ['slots', 'locale', 'settingsScope'];
export function apply(ctx) {
    // 1) Register i18n dictionary
    ctx.effect(() => ctx.locale.register('vision-bridge', { zh, en }), 'vision-bridge: dictionaries');
    // 2) Bind settings scope for 'vision' namespace
    const controller = new VisionCardController(ctx.settingsScope.bind({ namespace: 'vision' }));
    ctx.effect(() => () => controller.dispose(), 'vision-bridge: settings controller');
    // 3) Register card into official settings.plugin.item slot
    ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        key: 'vision',
        locale: 'vision-bridge',
        inject: () => controller.inject(),
    }, VisionCard));
    // The native conversation composer already handles image paste/upload,
    // thumbnails, submission, and historical image rendering.  Add only an
    // ambient marker under that composer when the public input snapshot carries
    // image ids; ordinary text drafts render no additional UI.
    ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'vision-route',
        order: 1,
        locale: 'vision-bridge',
        inject: () => controller.inject(),
    }, VisionRouteMarker));
}
//# sourceMappingURL=index.js.map