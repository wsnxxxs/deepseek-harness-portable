/**
 * Mission Control's single view of the DSH client services.
 *
 * The plugin body resolves every service once and hands this object to the
 * React tree through one context, so no component reaches for a cordis context
 * of its own and every capability this surface depends on is the surface of
 * this file. Mission Control adds no state that duplicates the Host: sessions,
 * workspaces, conversations, presets and the task board are all read through
 * their owning services.
 * @module @dsh-portable/crew-ui/client/state/runtime
 */
import { createContext, useContext } from 'react';
const RuntimeContext = createContext(undefined);
/** Provider for {@link useRuntime}. */
export const CrewRuntimeProvider = RuntimeContext.Provider;
/**
 * Read the Host services.
 * @returns the runtime.
 * @throws {Error} when rendered outside the provider, which is a wiring bug.
 */
export function useRuntime() {
    const runtime = useContext(RuntimeContext);
    if (runtime === undefined)
        throw new Error('crew-ui: useRuntime() outside CrewRuntimeProvider');
    return runtime;
}
//# sourceMappingURL=runtime.js.map