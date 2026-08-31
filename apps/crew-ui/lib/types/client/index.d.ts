/**
 * Browser entry for Mission Control.
 *
 * The switch mechanism is the one every surface in this distribution shares:
 * DSH's shell renders exactly one ctx-level slot, `root`, and a registration at
 * a lower priority shadows the one already there. Mission Control claims
 * `-2000`, below the workbench's `-1000`, and registers only while the shared
 * `ctx.uiMode` service says it is selected.
 *
 * Priority does not decide WHICH surface shows — the mode does, and each
 * surface registers only for its own mode — so the numbers matter solely in the
 * instant one registration replaces another.
 *
 * The Team Remote namespace is mounted here rather than assumed: the service is
 * a host-plane row, so the descriptor has to be contributed by whichever client
 * wants to call it. Mounting fails closed — the plugin does not register the
 * surface — which leaves the official AppFrame rendering rather than a frameless
 * page.
 * @module @dsh-portable/crew-ui/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type CrewKey } from './locales.ts';
export { MissionControl } from './shell/MissionControl.tsx';
export { foldThread } from './state/thread.ts';
export { BOARD_COLUMNS, blockerLabels, failureText, groupTasks, leadSessionId, transportText } from './state/board.ts';
export { CREW_PRESET, stageAction, type StageAction } from './state/mission-preset.ts';
export { CREW_NS, type CrewKey } from './locales.ts';
export type { CrewRuntime } from './state/runtime.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Mission Control's own copy. */
        crew: CrewKey;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "crew-ui-client";
/**
 * Services Mission Control cannot render without.
 *
 * Every generated Remote namespace it reads is declared individually: cordis
 * refuses `ctx.remote.<ns>` from a context that did not inject that namespace,
 * and the failure is a runtime throw inside whichever panel touches it rather
 * than a compile error.
 *
 * `uiMode` is what gates the surface; without it there is no way to know
 * whether this surface is the selected one, so it is a hard requirement rather
 * than a probed optional.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 *
 * Mounting the Team Remote contribution is awaited before the surface is
 * registered, so the board never renders against a namespace that is not there.
 * @param ctx - client root context.
 * @returns a disposer for the Remote mount and the surface registration.
 */
export declare function apply(ctx: ClientContext): Promise<() => Promise<void>>;
//# sourceMappingURL=index.d.ts.map