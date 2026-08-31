/** Cordis owner of the page-wide UI mode. */
import { Service } from '@deepseek-ai/cordis';
import type { Context } from '@deepseek-ai/cordis';
import type { UiMode } from '../ui-mode.ts';
import { type UiModeController } from './store.ts';
/** Page-wide UI-mode service consumed by independently bundled surfaces. */
export declare class UiModeService extends Service implements UiModeController {
    private readonly store;
    /** Read the active surface. */
    readonly get: () => UiMode;
    /** Switch to one surface. */
    readonly set: (mode: UiMode, origin?: "page" | "desktop") => void;
    /** Advance through the surface roster. */
    readonly cycle: (direction?: 1 | -1) => void;
    /** Subscribe to active-surface changes. */
    readonly subscribe: (listener: (mode: UiMode) => void) => (() => void);
    /**
     * @param ctx - owning client plugin context.
     */
    constructor(ctx: Context);
}
//# sourceMappingURL=service.d.ts.map