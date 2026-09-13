/**
 * Browser entry for composer file and folder attachment.
 *
 * The harness can already reference workspace files and folders: `ui-reference`
 * registers an `@` source with directory drill-down, and the trigger pipeline
 * turns a pick into a chip the submit path serializes for the model. All of it
 * is reachable only by typing `@` — the `+` at the head of the composer tool
 * row is upstream's *command* launcher and seeds the `/` source alone, so the
 * official UI has no click path to file attachment at all.
 *
 * This plugin adds two, and no file machinery of its own:
 *
 * - a "files and folders" entry in the `+` menu, through `commandUi.register`
 *   — upstream's own API for client-owned rows in exactly that menu. Its
 *   picker is the shared popupSelect shell over the workspace listing;
 * - a button beside the mode chips that opens the `@` menu itself, which is
 *   the one path carrying directory drill-down and `@session` references.
 *
 * Both insert the same reference the `@` menu inserts — same mention grammar,
 * same `source: 'reference'`, so serialization stays `ui-reference`'s.
 * @module @dsh-portable/composer-attach/client
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type ComposerAttachKey } from './locales.ts';
export { ComposerAttachButton } from './AttachButton.tsx';
export type { ComposerAttachInjected, ComposerAttachButtonProps } from './AttachButton.tsx';
export { detectLength, documentEndSpan, type AttachSpan, type ChipExtent } from './caret.ts';
export { FILES_COMMAND, filesCommand, type FilesCommandDeps, type PickedReference, } from './files-command.ts';
export { SpanRegistry } from './spans.ts';
export { COMPOSER_ATTACH_NS, en, zh, type ComposerAttachKey, type ComposerAttachTranslate, } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Copy for the composer attach entries. */
        composerAttach: ComposerAttachKey;
    }
}
/** Stable Cordis plugin name. */
export declare const name = "composer-attach-client";
/**
 * Services this plugin cannot register without.
 *
 * `inputTriggers` is the pipeline the button drives, `sessions` resolves the
 * per-session scope its controller and its scoped input events live on,
 * `commandUi` owns the `+` menu's contribution registry, and
 * `remote.fileReferences` is the workspace listing the picker shows. Cordis
 * holds the plugin body until all of them publish.
 *
 * The `@` **source** is not a service and cannot be injected — an assembly
 * that disabled `ui-reference` still mounts these entries, and `toggleSource`
 * dismisses instead of opening a menu with no source behind it.
 */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map