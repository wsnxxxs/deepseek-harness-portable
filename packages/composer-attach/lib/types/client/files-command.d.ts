/**
 * The `文件和文件夹` entry inside the composer's `+` menu.
 *
 * The `+` is upstream's command launcher: it seeds exactly one trigger source,
 * the `/` one, so the only way a plugin can put a row in that menu is
 * `ctx.commandUi.register()` — upstream's own public API for client-owned
 * command contributions. A contribution's pick always opens the shared
 * popupSelect shell, so that shell is this entry's picker: the workspace
 * listing with the harness's own search box over it.
 *
 * The rows it produces are the same references the `@` menu produces — same
 * mention grammar, same `source: 'reference'` so the submit path serializes
 * them through `ui-reference`'s codec, same chip. This module owns the entry,
 * not a second notion of what a file reference is.
 * @module @dsh-portable/composer-attach/client/files-command
 */
import type { FileReferenceCandidate } from '@deepseek-ai/dsh-file-reference/types';
import type { ClientSessionContext } from '@deepseek-ai/dsh-client-ui-input-trigger/client';
import type { SelectOption } from '@deepseek-ai/dsh-client-ui-commands/client';
import type { ComposerAttachTranslate } from './locales.ts';
/** Command name the contribution registers under (also typeable as `/files`). */
export declare const FILES_COMMAND = "files";
/** One reference the picker can insert, in the shape the input machine wants. */
export interface PickedReference {
    readonly ref: string;
    readonly label: string;
    readonly appearance: 'file' | 'folder';
}
/** What the contribution needs from the plugin body. */
export interface FilesCommandDeps {
    /** Workspace listing for one session (empty query = the workspace root). */
    readonly list: (session: ClientSessionContext, query: string, signal: AbortSignal) => Promise<readonly FileReferenceCandidate[]>;
    /** Build the `@path` mention for one candidate; undefined for an unrepresentable path. */
    readonly mention: (candidate: FileReferenceCandidate) => string | undefined;
    /** Insert one reference into a session's composer; false when the editor refused. */
    readonly insert: (session: ClientSessionContext, reference: PickedReference) => boolean;
    /** This plugin's copy. */
    readonly t: ComposerAttachTranslate;
}
/**
 * Build the `files` command contribution.
 * @param deps - the plugin body's bindings.
 * @returns the contribution to hand to `commandUi.register`.
 */
export declare function filesCommand(deps: FilesCommandDeps): {
    name: string;
    description: () => string;
    section: string;
    restSection: string;
    icon: "file";
    order: number;
    available: () => boolean;
    ui: {
        kind: "popupSelect";
        options: (session: ClientSessionContext, signal: AbortSignal) => Promise<readonly SelectOption[]>;
        onSelect: (option: SelectOption, session: ClientSessionContext) => void;
    };
};
//# sourceMappingURL=files-command.d.ts.map