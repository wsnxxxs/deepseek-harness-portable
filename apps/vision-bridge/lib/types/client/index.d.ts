/**
 * Client-side plugin entry for @dsh-portable/vision-bridge.
 * Mounts VisionCard into the `settings.plugin.item` slot.
 * @module @dsh-portable/vision-bridge/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
export declare const name = "vision-bridge-client";
/**
 * Only services read by this body belong in Cordis injection. The settings
 * card and composer marker target slots owned by other plugins; `slots.inject`
 * below waits for those declarations without making either slot owner a
 * service-level activation barrier.
 */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map