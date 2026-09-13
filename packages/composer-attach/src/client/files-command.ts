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

import type { FileReferenceCandidate } from '@deepseek-ai/dsh-file-reference/types'
import type { ClientSessionContext } from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import type { SelectOption } from '@deepseek-ai/dsh-client-ui-commands/client'
import type { ComposerAttachTranslate } from './locales.ts'

/** Command name the contribution registers under (also typeable as `/files`). */
export const FILES_COMMAND = 'files'

/** Menu order: negative so the entry sorts above the command rows, which take 0. */
const FILES_MENU_ORDER = -100

/** One reference the picker can insert, in the shape the input machine wants. */
export interface PickedReference {
  readonly ref: string
  readonly label: string
  readonly appearance: 'file' | 'folder'
}

/** What the contribution needs from the plugin body. */
export interface FilesCommandDeps {
  /** Workspace listing for one session (empty query = the workspace root). */
  readonly list: (
    session: ClientSessionContext,
    query: string,
    signal: AbortSignal,
  ) => Promise<readonly FileReferenceCandidate[]>
  /** Build the `@path` mention for one candidate; undefined for an unrepresentable path. */
  readonly mention: (candidate: FileReferenceCandidate) => string | undefined
  /** Insert one reference into a session's composer; false when the editor refused. */
  readonly insert: (session: ClientSessionContext, reference: PickedReference) => boolean
  /** This plugin's copy. */
  readonly t: ComposerAttachTranslate
}

/**
 * Encode a candidate as a popup option id.
 *
 * `onSelect` receives the option alone, so the kind has to survive the round
 * trip; a one-character tag keeps the id readable and avoids a second lookup
 * table living across the popup's lifetime.
 */
function optionId(candidate: FileReferenceCandidate, mention: string): string {
  return `${candidate.kind === 'directory' ? 'd' : 'f'}:${mention}`
}

/**
 * Decode a picked option back into the reference it stands for.
 *
 * The display label comes from the option's own label — the workspace-relative
 * path this module put there — rather than from the mention: mention grammar
 * quotes and escapes for the model, and reading a basename back out of it
 * would be parsing our own serialization. The chip shows the basename, which
 * is what the `@` menu's inserts show.
 * @param id - the option id built by {@link optionId}.
 * @param label - the option's display label (a directory carries its slash).
 * @returns the reference, or undefined for an id this module did not write.
 */
function decode(id: string, label: string): PickedReference | undefined {
  const tag = id.slice(0, 2)
  const ref = id.slice(2)
  if (ref === '' || (tag !== 'd:' && tag !== 'f:')) return undefined
  const directory = tag === 'd:'
  const path = directory ? label.slice(0, -1) : label
  const name = path.slice(path.lastIndexOf('/') + 1)
  return {
    ref,
    label: directory ? `${name}/` : name,
    appearance: directory ? 'folder' : 'file',
  }
}

/**
 * Build the `files` command contribution.
 * @param deps - the plugin body's bindings.
 * @returns the contribution to hand to `commandUi.register`.
 */
export function filesCommand(deps: FilesCommandDeps) {
  return {
    name: FILES_COMMAND,
    description: () => deps.t('command.description'),
    // Menu placement. Attaching a file is not a command, so it gets its own
    // heading above the command list, its own glyph, and an order that floats
    // it there; `restSection` is the heading the commands themselves take once
    // this row has made the menu sectioned. The four fields are inert on an
    // unpatched kernel — the row simply renders where upstream puts it.
    section: deps.t('menu.addSection'),
    restSection: deps.t('menu.commandSection'),
    icon: 'file' as const,
    order: FILES_MENU_ORDER,
    // The entry is offered wherever the composer is: an assembly without the
    // file-reference capability answers an empty listing, and the popup says
    // so, which is a better failure than a row that silently is not there.
    available: () => true,
    ui: {
      kind: 'popupSelect' as const,
      options: async (session: ClientSessionContext, signal: AbortSignal): Promise<readonly SelectOption[]> => {
        const candidates = await deps.list(session, '', signal)
        const options: SelectOption[] = []
        for (const candidate of candidates) {
          const mention = deps.mention(candidate)
          if (mention === undefined) continue
          options.push({
            id: optionId(candidate, mention),
            // The path is the label so the shell's local search filters over
            // paths, and a directory carries the trailing slash the reference
            // grammar gives it.
            label: candidate.kind === 'directory' ? `${candidate.path}/` : candidate.path,
            detail: deps.t(candidate.kind === 'directory' ? 'picker.folder' : 'picker.file'),
          })
        }
        return options
      },
      onSelect: (option: SelectOption, session: ClientSessionContext): void => {
        const reference = decode(option.id, option.label)
        if (reference === undefined) return
        // A refused insert throws so the popup shell keeps itself open with the
        // reason, instead of closing as though the reference had landed.
        if (!deps.insert(session, reference)) throw new Error(deps.t('picker.refused'))
      },
    },
  }
}
