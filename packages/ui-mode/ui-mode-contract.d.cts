type UiMode = 'official' | 'dcode' | 'crew'

declare const contract: {
  readonly UI_MODES: readonly UiMode[]
  readonly DEFAULT_UI_MODE: 'dcode'
  readonly UI_MODE_QUERY_PARAM: 'view'
  readonly UI_MODE_STORAGE_KEY: 'dsh.portable.uiMode'
  readonly UI_MODE_CONFIG_FIELD: 'uiMode'
  readonly UI_MODE_BRIDGE_GLOBAL: '__DSH_UI_MODE_BRIDGE__'
  readonly UI_MODE_EVENT: 'dsh:ui-mode'
  readonly UI_MODE_IPC_CHANNEL: 'desktop:ui-mode'
  readonly normalizeUiMode: (value: unknown) => UiMode | undefined
  readonly withUiModeParam: (url: string, mode: UiMode, base?: string) => string
}

export = contract
