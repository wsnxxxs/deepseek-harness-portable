/** Cordis owner of the page-wide UI mode. */
import { Service } from '@deepseek-ai/cordis';
import { createUiModeStore } from "./store.js";
/** Page-wide UI-mode service consumed by independently bundled surfaces. */
export class UiModeService extends Service {
    store = createUiModeStore();
    /** Read the active surface. */
    get = () => this.store.get();
    /** Switch to one surface. */
    set = (mode, origin = 'page') => {
        this.store.set(mode, origin);
    };
    /** Advance through the surface roster. */
    cycle = (direction = 1) => {
        this.store.cycle(direction);
    };
    /** Subscribe to active-surface changes. */
    subscribe = (listener) => this.store.subscribe(listener);
    /**
     * @param ctx - owning client plugin context.
     */
    constructor(ctx) {
        super(ctx, 'uiMode');
        ctx.effect(() => () => { this.store.dispose(); }, 'ui-mode: store');
    }
}
//# sourceMappingURL=service.js.map