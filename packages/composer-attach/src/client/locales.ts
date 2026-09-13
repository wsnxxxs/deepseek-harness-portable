/**
 * Copy for the composer attach control.
 * @module @dsh-portable/composer-attach/client/locales
 */

/** Dictionary namespace owned by this plugin. */
export const COMPOSER_ATTACH_NS = 'composerAttach'

/** Every key of this plugin's dictionary. */
export type ComposerAttachKey = keyof typeof zh

/** Namespace-bound translate for this plugin's copy. */
export type ComposerAttachTranslate = (key: ComposerAttachKey, params?: Record<string, unknown>) => string

export const zh = {
  'attach.label': '添加文件和文件夹',
  'attach.hint': '从工作区选择文件或文件夹，等同于在输入框里输入 @',
  // Registry-held text: the command menu reads it once at registration, so it
  // does not follow a later language switch (the same trade upstream's own
  // contributions make).
  'command.description': '文件和文件夹',
  'menu.addSection': '添加',
  'menu.commandSection': '指令',
  'picker.file': '文件',
  'picker.folder': '文件夹',
  'picker.refused': '当前输入框状态无法插入引用，请先结束正在进行的发送。',
}

export const en: Record<ComposerAttachKey, string> = {
  'attach.label': 'Add files and folders',
  'attach.hint': 'Pick a file or folder from the workspace — the same as typing @ in the composer',
  'command.description': 'Files and folders',
  'menu.addSection': 'Add',
  'menu.commandSection': 'Commands',
  'picker.file': 'File',
  'picker.folder': 'Folder',
  'picker.refused': 'The composer cannot take a reference right now — wait for the current send to finish.',
}
