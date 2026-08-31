/**
 * Browser entry for the modern workbench.
 *
 * The whole switch mechanism is here, and it is small on purpose. DSH's shell
 * renders exactly one ctx-level slot, `root`, and `ui-layout` occupies it with
 * the official three-column frame. A second registration at a lower priority
 * shadows that frame, so:
 *
 * - selecting the workbench registers {@link Workbench} into `root`;
 * - selecting any other surface disposes that registration, so either the
 *   official AppFrame renders again untouched or the surface that claimed a
 *   lower priority renders instead.
 *
 * Every direction is a slot mutation inside the live page. The DSH Runtime,
 * the Host connection, the Session list, every open Conversation and all
 * Workspace state are shared by construction — no surface owns a copy — so
 * switching costs a React remount and nothing else.
 *
 * The switch row inside the official settings page is NOT registered here: it
 * lists every surface, so it belongs to `@dsh-portable/ui-mode` rather than to
 * any one of them.
 * @module @dsh-portable/dcode-ui/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type DcodeKey } from './locales.ts';
export { Workbench } from './shell/Workbench.tsx';
export { createNavigationStore, type NavigationState, type NavigationStore } from './state/navigation.ts';
export { createDcodeRuntime, type DcodeRuntime } from './state/runtime.ts';
export { fuzzyMatch } from './shell/CommandPalette.tsx';
export { parsePatch, type DiffLine } from './git/patch.ts';
export { changedPaths, splitTurns, summarizeTool } from './chat/tools.ts';
export { hasAnsi, parseAnsi, stripAnsi, type AnsiSpan } from './chat/ansi.ts';
export { DCODE_NS, type DcodeKey } from './locales.ts';
export { isApplePlatform } from './platform.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The workbench's own copy. */
        dcode: DcodeKey;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "dcode-ui-client";
/**
 * Services the workbench cannot render without.
 *
 * Every generated Remote namespace it reads is declared individually: cordis
 * refuses `ctx.remote.<ns>` from a context that did not inject that namespace,
 * so an omission here is a runtime throw inside whichever panel touches it,
 * not a compile error.
 *
 * `uiWorkspace`, `theme` and `connection` are deliberately absent: each drives
 * one optional surface and is probed at runtime, so a trimmed assembly still
 * boots this plugin with that surface disabled rather than leaving the page
 * frameless.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map