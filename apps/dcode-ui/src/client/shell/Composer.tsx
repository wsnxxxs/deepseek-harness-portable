/**
 * The composer: prompt entry plus the four session controls the operator
 * changes most — agent mode, model, reasoning depth, and permission mode.
 *
 * Every control writes through the Host's own path, never a local mirror:
 * the model and reasoning effort go through `session/selectModel`, the
 * permission mode executes the `/permission` command the official chip
 * executes. The result is that both surfaces read the same projections
 * afterwards.
 * @module @dsh-portable/dcode-ui/client/shell/Composer
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  IconAgentPresetOutline16, IconCheckOutline16, IconChevronDownOutline14, IconCloseFill14,
  IconEditOutline16, IconFolderOpenOutline16,
  IconPaperclipOutline16,
  IconSendOutline16, IconStopFill16, IconThinkOutline16, IconWarningOutline16,
  RiskConfirmation,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComposerAttachment, DraftAttachmentId } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { CommandDescriptor } from '@deepseek-ai/dsh-client-ui-commands/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime, type BusyEnterBehavior } from '../state/runtime.ts'
import {
  useAsync, useObservable, useProjectionValue, useSessionInput, useSessionSnapshot, useWorkspaceGroups,
} from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { Translate } from '../locales.ts'
import { Popover, type MenuRow } from './ui.tsx'
import { ContextMeter } from './ContextMeter.tsx'
import css from './Composer.module.css'

/** Props of the composer. */
export interface ComposerProps {
  readonly sessionId: SessionId | undefined
  readonly blank?: boolean
  readonly cwd?: string
  readonly onOpenWorkspace?: () => void
  /** Active `@query` at the caret; reserved for the file/symbol reference picker. */
  readonly onReferenceQueryChange?: (query: string | undefined) => void
}

/** The `permissions` projection, read structurally. */
interface PermissionSelectView {
  readonly currentValue: string
  readonly options: readonly { readonly value: string; readonly name: string; readonly description?: string }[]
}

/** The `modelSelection` projection, read structurally. */
interface ModelSelectionView {
  readonly next: { readonly provider: string; readonly model: string; readonly reasoningEffort?: string } | null
  readonly lastUsed: { readonly provider: string; readonly model: string; readonly reasoningEffort?: string } | null
}

/** Permission value that requires an explicit user acknowledgement. */
const FULL_ACCESS_PERMISSION = 'danger-full-access'

/** Built-in preset labels are translated; user-authored rows use their roster metadata. */
function modeLabel(id: string, fallback: string, t: Translate): string {
  switch (id) {
    case 'standard': return t('composer.mode.standard')
    case 'ptc': return t('composer.mode.ptc')
    case 'minimal': return t('composer.mode.minimal')
    case 'cordis': return t('composer.mode.cordis')
    default: return fallback
  }
}

/** Known permission values have product copy; unfamiliar host values keep their published name. */
function permissionLabel(value: string, name: string, t: Translate): string {
  switch (value) {
    case 'read-only': return t('composer.permission.readOnly')
    case 'workspace-write': return t('composer.permission.workspaceWrite')
    case FULL_ACCESS_PERMISSION: return t('composer.permission.fullAccess')
    default: return name
  }
}

/** Use the primitive glyphs already shared by the client UI for permission rows. */
function permissionIcon(value: string): ReactNode | undefined {
  switch (value) {
    case 'read-only': return <IconCheckOutline16 />
    case 'workspace-write': return <IconEditOutline16 />
    case FULL_ACCESS_PERMISSION: return <IconWarningOutline16 />
    default: return undefined
  }
}

/** Cmd/Ctrl+Enter flips the configured busy behavior. */
function oppositeBusyEnter(value: BusyEnterBehavior): BusyEnterBehavior {
  return value === 'queue' ? 'steer' : 'queue'
}

/** Draft text per session, so switching tasks does not lose an unsent prompt. */
const drafts = new Map<string, string>()

/** A leading, argument-free slash token is eligible for command completion. */
function slashQuery(value: string): string | undefined {
  const match = /^\/([^\s]*)$/.exec(value)
  return match?.[1]?.toLocaleLowerCase()
}

function fileSize(bytes: number): string {
  if (bytes < 1_024) return `${String(bytes)} B`
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`
}

/** The unfinished @ token immediately before the caret, if one exists. */
function referenceQuery(value: string, caret: number): string | undefined {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(value.slice(0, caret))
  return match?.[1]
}

function fileKind(name: string): 'archive' | 'code' | 'document' | 'generic' {
  const extension = name.split('.').pop()?.toLocaleLowerCase()
  if (extension !== undefined && ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return 'archive'
  if (extension !== undefined && ['js', 'jsx', 'ts', 'tsx', 'json', 'css', 'html', 'py', 'rs', 'go'].includes(extension)) return 'code'
  if (extension !== undefined && ['pdf', 'doc', 'docx', 'md', 'txt', 'rtf'].includes(extension)) return 'document'
  return 'generic'
}

/** Small, dependency-free file glyphs keep non-image attachments recognizable. */
function FileGlyph({ name }: { name: string }) {
  const kind = fileKind(name)
  return (
    <span className={`${css.fileGlyph} ${css[`fileGlyph_${kind}`]}`} aria-hidden>
      <svg viewBox="0 0 16 16">
        <path d="M4 1.75h5l3 3V14.25H4z" />
        <path d="M9 1.75v3h3" />
        {kind === 'archive' ? <path d="M7 4h2M7 6h2M7 8h2M7 10h2" /> : null}
        {kind === 'code' ? <path d="m7 7-2 1.5L7 10m2-3 2 1.5L9 10" /> : null}
        {kind === 'document' ? <path d="M6 7h4M6 9h4M6 11h3" /> : null}
        {kind === 'generic' ? <path d="M6 8h4M6 10h4" /> : null}
      </svg>
    </span>
  )
}

/** The DCode attachment strip: compact previews, with the same token rhythm as the composer. */
function AttachmentRail(props: {
  attachments: readonly ComposerAttachment[]
  disabled: boolean
  onRemove: (id: DraftAttachmentId) => void
  t: Translate
}) {
  if (props.attachments.length === 0) return null
  return (
    <div className={css.attachmentRail} aria-label={props.t('composer.attachments')}>
      {props.attachments.map(attachment => (
        <div className={css.attachment} key={attachment.id}>
          {attachment.kind === 'image'
            ? <img className={css.attachmentPreview} src={attachment.previewUrl} alt={attachment.file.name || props.t('composer.attachmentFile')} />
            : (
              <span className={css.attachmentFile} title={attachment.file.name}>
                <FileGlyph name={attachment.file.name} />
                <span>{attachment.file.name || props.t('composer.attachmentFile')}</span>
              </span>
            )}
          <span className={css.attachmentMeta}>{fileSize(attachment.file.size)}</span>
          <button
            type="button"
            className={css.attachmentRemove}
            aria-label={`${props.t('composer.removeAttachment')}: ${attachment.file.name || props.t('composer.attachmentFile')}`}
            disabled={props.disabled}
            onClick={() => { props.onRemove(attachment.id) }}
          >
            <IconCloseFill14 />
          </button>
        </div>
      ))}
    </div>
  )
}

/** Prompt entry and the session controls. */
export function Composer({ sessionId, blank, cwd, onOpenWorkspace, onReferenceQueryChange }: ComposerProps) {
  const runtime = useRuntime()
  const t = useT()
  const session = useSessionSnapshot(sessionId)
  const { input, state: inputState } = useSessionInput(sessionId)
  const permissions = useProjectionValue<PermissionSelectView>(sessionId, 'permissions')
  const selection = useProjectionValue<ModelSelectionView>(sessionId, 'modelSelection')
  const agentPreset = useProjectionValue<string | null>(sessionId, 'agentPreset')
  const busyEnter = useObservable(runtime.busyEnter, 'queue')
  const [fallbackDraft, setFallbackDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [dragActive, setDragActive] = useState(false)
  const [commandIndex, setCommandIndex] = useState(0)
  const [commandMenuDismissed, setCommandMenuDismissed] = useState(false)
  const [activeReferenceQuery, setActiveReferenceQuery] = useState<string | undefined>(undefined)
  const [confirmingFullAccess, setConfirmingFullAccess] = useState(false)
  const [acknowledgedFullAccess, setAcknowledgedFullAccess] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const conversation = runtime.conversation
  const draft = input === undefined ? fallbackDraft : inputState.draft
  const attachments = useMemo(
    () => conversation?.draftAttachmentsFor(inputState.imageIds) ?? [],
    [conversation, inputState.imageIds],
  )

  // Restore this session's draft on a task switch, and persist the outgoing one.
  const previousSession = useRef<SessionId | undefined>(undefined)
  const fallbackDraftRef = useRef(fallbackDraft)
  const inputRefForDraft = useRef(input)
  fallbackDraftRef.current = fallbackDraft
  inputRefForDraft.current = input
  useEffect(() => {
    const outgoing = previousSession.current
    if (outgoing !== undefined && inputRefForDraft.current === undefined) {
      drafts.set(outgoing, fallbackDraftRef.current)
    }
    setFallbackDraft(sessionId === undefined ? '' : drafts.get(sessionId) ?? '')
    setError(undefined)
    setActiveReferenceQuery(undefined)
    previousSession.current = sessionId
  }, [sessionId])

  useEffect(() => {
    onReferenceQueryChange?.(activeReferenceQuery)
  }, [activeReferenceQuery, onReferenceQueryChange])

  useEffect(() => {
    if (sessionId !== undefined && input === undefined) drafts.set(sessionId, fallbackDraft)
  }, [fallbackDraft, input, sessionId])

  // Grow with content up to the stylesheet's cap. The card's width decides how
  // many lines the draft wraps to, so observe the card itself rather than only
  // the viewport — the center column can resize when either side rail changes.
  useEffect(() => {
    const input = inputRef.current
    const shell = shellRef.current
    if (input === null || shell === null) return undefined
    const fit = (): void => {
      input.style.height = 'auto'
      input.style.height = `${String(input.scrollHeight)}px`
    }
    fit()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fit)
      return () => { window.removeEventListener('resize', fit) }
    }
    const observer = new ResizeObserver(fit)
    observer.observe(shell)
    return () => { observer.disconnect() }
  }, [draft])

  const catalog = useAsync(async () => await runtime.remote.session.modelCatalog(), [runtime])
  const presets = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime])
  const commandCatalog = useAsync(
    async () => (sessionId === undefined ? undefined : await runtime.remote.commands.list(sessionId)),
    [runtime, sessionId],
  )

  const running = session?.running === true
  const current = selection?.next ?? selection?.lastUsed ?? undefined
  const roster = presets.value?.ok === true ? presets.value.value.presets : []
  const currentPreset = agentPreset ?? roster.find(preset => preset.isDefault)?.id ?? roster[0]?.id
  const blankSession = (blank ?? session?.blank ?? false) && !running
  const commandQuery = slashQuery(draft)
  const commands = commandCatalog.value?.ok === true ? commandCatalog.value.value : []
  const commandMatches = useMemo<readonly CommandDescriptor[]>(() => {
    if (commandQuery === undefined) return []
    return commands
      .filter(command => command.name.toLocaleLowerCase().includes(commandQuery))
      .sort((left, right) => {
        const leftPrefix = left.name.toLocaleLowerCase().startsWith(commandQuery)
        const rightPrefix = right.name.toLocaleLowerCase().startsWith(commandQuery)
        if (leftPrefix !== rightPrefix) return leftPrefix ? -1 : 1
        return left.name.localeCompare(right.name)
      })
  }, [commandQuery, commands])
  const commandMenuOpen = focused && !commandMenuDismissed && commandMatches.length > 0

  useEffect(() => {
    setCommandIndex(0)
  }, [commandQuery, sessionId])

  const currentModel = useMemo(() => {
    if (catalog.value?.ok !== true) return undefined
    for (const group of catalog.value.value.groups) {
      const model = group.models.find(row =>
        row.id === current?.model && group.id === current.provider)
      if (model !== undefined) return { group, model }
    }
    return undefined
  }, [catalog.value, current])

  const selectModel = useCallback((provider: string, model: string, reasoningEffort?: string) => {
    if (sessionId === undefined) return
    void runtime.remote.session.selectModel({
      sessionId,
      provider,
      model,
      ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
    })
  }, [runtime, sessionId])

  const modelRows = useMemo<MenuRow[]>(() => {
    if (catalog.value?.ok !== true) return []
    return catalog.value.value.groups.flatMap(group => group.models.map(model => ({
      id: `${group.id}/${model.id}`,
      label: model.name,
      detail: group.name,
      group: group.name,
      active: group.id === current?.provider && model.id === current.model,
      onSelect: () => { selectModel(group.id, model.id) },
    })))
  }, [catalog.value, current, selectModel])

  const reasoningRows = useMemo<MenuRow[]>(() => {
    const efforts = currentModel?.model.reasoning?.efforts ?? []
    if (efforts.length === 0 || current === undefined) return []
    return efforts.map(effort => ({
      id: effort.id,
      label: effort.name,
      detail: effort.description,
      active: effort.id === current.reasoningEffort,
      onSelect: () => { selectModel(current.provider, current.model, effort.id) },
    }))
  }, [currentModel, current, selectModel])

  const selectPermission = useCallback((value: string) => {
    if (sessionId === undefined) return
    void runtime.remote.commands.execute(sessionId, `/permission ${value}`, [])
      .then((result) => {
        if (!result.ok) setError(result.error.message)
      })
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
  }, [runtime, sessionId])

  const selectPreset = useCallback((id: string) => {
    if (sessionId === undefined || !blankSession) return
    void runtime.remote.agentPresets.select(sessionId, id)
      .then((result) => {
        if (!result.ok) setError(result.error.message)
      })
      .catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
  }, [blankSession, runtime, sessionId])

  const updateDraft = useCallback((value: string) => {
    setCommandMenuDismissed(false)
    if (input === undefined) setFallbackDraft(value)
    else input.setDraft(value)
  }, [input])

  const captureReference = useCallback((value: string, caret: number | null) => {
    setActiveReferenceQuery(referenceQuery(value, caret ?? value.length))
  }, [])

  const completeCommand = useCallback((command: CommandDescriptor) => {
    updateDraft(`/${command.name}${command.input === undefined ? '' : ' '}`)
    setCommandMenuDismissed(true)
    requestAnimationFrame(() => {
      const textarea = inputRef.current
      if (textarea === null) return
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    })
  }, [updateDraft])

  const addAttachments = useCallback((files: readonly File[]) => {
    if (files.length === 0) return
    if (input === undefined || conversation === undefined) {
      setError(t('composer.attachmentsUnavailable'))
      return
    }
    try {
      const created = conversation.createDraftAttachments(files)
      const accepted = input.addImages(created.map(attachment => attachment.id))
      if (!accepted) {
        conversation.releaseDraftAttachments(created)
        setError(t('composer.attachmentsBusy'))
        return
      }
      setError(undefined)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [conversation, input, t])

  const onPaste = useCallback((event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files: File[] = []
    for (const item of Array.from(event.clipboardData.items)) {
      if (!item.type.startsWith('image/')) continue
      const file = item.getAsFile()
      if (file !== null) files.push(file)
    }
    if (files.length === 0) return
    event.preventDefault()
    addAttachments(files)
  }, [addAttachments])

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    addAttachments(Array.from(event.dataTransfer.files))
  }, [addAttachments])

  const removeAttachment = useCallback((id: DraftAttachmentId) => {
    if (input === undefined || conversation === undefined) return
    input.removeImage(id)
    // A busy input refuses removal so the preview must remain owned by the
    // conversation service. Release only after the state accepted the edit.
    if (!input.state.getSnapshot().imageIds.includes(id)) conversation.releaseDraftImage(id)
  }, [conversation, input])

  const permissionRows = useMemo<MenuRow[]>(() => {
    if (permissions === undefined || sessionId === undefined) return []
    return permissions.options.filter(option => option.value !== 'custom').map(option => {
      const icon = permissionIcon(option.value)
      return {
        id: option.value,
        label: permissionLabel(option.value, option.name, t),
        detail: option.description,
        ...(icon === undefined ? {} : { icon }),
        active: option.value === permissions.currentValue,
        danger: option.value === FULL_ACCESS_PERMISSION,
        onSelect: () => {
          if (option.value === permissions.currentValue) return
          if (option.value === FULL_ACCESS_PERMISSION) {
            setAcknowledgedFullAccess(false)
            setConfirmingFullAccess(true)
            return
          }
          selectPermission(option.value)
        },
      }
    })
  }, [permissions, selectPermission, sessionId, t])

  const modeRows = useMemo<MenuRow[]>(() => roster.map(preset => ({
    id: preset.id,
    label: modeLabel(preset.id, preset.name ?? preset.id, t),
    detail: preset.broken ?? preset.description,
    active: preset.id === currentPreset,
    disabled: preset.broken !== undefined,
    icon: <IconAgentPresetOutline16 />,
    onSelect: () => {
      if (preset.id !== currentPreset) selectPreset(preset.id)
    },
  })), [currentPreset, roster, selectPreset, t])

  const send = useCallback((mode: BusyEnterBehavior) => {
    if (sessionId === undefined) return
    const text = draft.trim()
    if (text === '' && inputState.imageIds.length === 0) return
    if (input !== undefined) {
      setError(undefined)
      setActiveReferenceQuery(undefined)
      input.submit(mode)
      return
    }
    const face = runtime.binding(sessionId)?.session
    if (face === undefined) return
    setFallbackDraft('')
    drafts.delete(sessionId)
    setError(undefined)
    setActiveReferenceQuery(undefined)

    // A leading slash is a command line, not a prompt: routing it through the
    // commands Remote keeps the host's command lifecycle and catalog intact.
    if (text.startsWith('/')) {
      void face.command(text).then((result) => {
        if (!result.ok) setError(result.error.message)
        else if (!result.value.matched) setError(`unknown command: ${text.split(' ')[0] ?? text}`)
      })
      return
    }

    const handle = face.beginSubmission({ text, images: [] })
    void face.prompt([{ type: 'text', text }], mode, undefined, handle.requestId)
      .then((result) => {
        if (!result.ok) setError(result.error.message)
      })
      .catch((cause: unknown) => {
        handle.abandon()
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }, [draft, input, inputState.imageIds, runtime, sessionId])

  const stop = useCallback(() => {
    if (sessionId === undefined) return
    void runtime.binding(sessionId)?.session.cancel()
  }, [runtime, sessionId])

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (commandMenuOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        setCommandIndex(index => (index + direction + commandMatches.length) % commandMatches.length)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setCommandMenuDismissed(true)
        return
      }
      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        if (event.nativeEvent.isComposing) return
        event.preventDefault()
        const command = commandMatches[commandIndex]
        if (command !== undefined) completeCommand(command)
        return
      }
    }
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing) return
    event.preventDefault()
    const accelerated = event.metaKey || event.ctrlKey
    const mode: BusyEnterBehavior = !running
      ? 'queue'
      : accelerated ? oppositeBusyEnter(busyEnter) : busyEnter
    send(mode)
  }, [busyEnter, commandIndex, commandMatches, commandMenuOpen, completeCommand, running, send])

  const { groups } = useWorkspaceGroups()
  const workspaceTitle = useMemo(() => {
    if (cwd !== undefined) {
      const match = groups.find(group => group.path === cwd)
      if (match) return match.title
      return cwd.split(/[\\/]/).filter(Boolean).pop() || cwd
    }
    return undefined
  }, [groups, cwd])

  const disabled = sessionId === undefined
  const compact = draft.trim() === '' && attachments.length === 0 && error === undefined
  const currentPermission = permissions?.options.find(option => option.value === permissions.currentValue)
  const currentPermissionLabel = currentPermission === undefined
    ? t('composer.permission')
    : permissionLabel(currentPermission.value, currentPermission.name, t)
  const currentPresetRow = roster.find(preset => preset.id === currentPreset)
  const currentPresetLabel = currentPreset === undefined
    ? t('composer.mode')
    : modeLabel(currentPreset, currentPresetRow?.name ?? t('composer.mode'), t)
  const permissionTriggerClass = currentPermission?.value === FULL_ACCESS_PERMISSION
    ? css.permissionDanger
    : currentPermission?.value === 'workspace-write'
      ? css.permissionWrite
      : css.permissionRead

  return (
    <>
      <div className={css.dock}>
      {blank && sessionId !== undefined
        ? (
          <div className={css.headerRow}>
            <button
              type="button"
              className={css.projectChip}
              onClick={onOpenWorkspace}
              title={cwd}
            >
              <IconFolderOpenOutline16 />
              <span>{workspaceTitle ?? t('nav.openWorkspace')}</span>
              <IconChevronDownOutline14 />
            </button>
          </div>
        )
        : null}
      <div
        ref={shellRef}
        className={`${css.shell} ${compact ? css.shellCompact : css.shellExpanded} ${focused ? css.shellFocused : ''} ${activeReferenceQuery === undefined ? '' : css.referenceActive} ${dragActive ? css.dropActive : ''}`}
        onDragEnter={event => {
          if (event.dataTransfer.types.includes('Files')) setDragActive(true)
        }}
        onDragOver={event => {
          if (event.dataTransfer.types.includes('Files')) event.preventDefault()
        }}
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false)
        }}
        onDrop={onDrop}
      >
        {dragActive
          ? (
            <div className={css.dropOverlay} role="status">
              <span className={css.dropIcon}><IconPaperclipOutline16 /></span>
              <strong>{t('composer.dropFiles')}</strong>
              <span>{t('composer.dropFilesHint')}</span>
            </div>
          )
          : null}
        <div className={css.inputArea}>
          {commandMenuOpen
            ? (
              <div id="composer-command-list" className={css.commandMenu} role="listbox" aria-label={t('composer.commands')}>
                <div className={css.commandMenuTitle}>{t('composer.commands')}</div>
                {commandMatches.map((command, index) => (
                  <button
                    type="button"
                    id={`composer-command-${command.name}`}
                    key={command.name}
                    className={`${css.commandOption} ${index === commandIndex ? css.commandOptionActive : ''}`}
                    role="option"
                    aria-selected={index === commandIndex}
                    onMouseEnter={() => { setCommandIndex(index) }}
                    onMouseDown={event => { event.preventDefault() }}
                    onClick={() => { completeCommand(command) }}
                  >
                    <span className={css.commandName}>/{command.name}</span>
                    <span className={css.commandDescription}>{command.description}</span>
                    {command.input === undefined ? null : <span className={css.commandHint}>{command.input.hint}</span>}
                  </button>
                ))}
              </div>
            )
            : null}
          <textarea
            ref={inputRef}
            className={css.input}
            rows={1}
            value={draft}
            disabled={disabled}
            placeholder={disabled
              ? t('composer.needsSession')
              : running ? t('composer.placeholderRunning') : t('composer.placeholder')}
            onChange={event => {
              updateDraft(event.target.value)
              captureReference(event.target.value, event.target.selectionStart)
            }}
            onSelect={event => { captureReference(event.currentTarget.value, event.currentTarget.selectionStart) }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            aria-label={t('composer.placeholder')}
            aria-autocomplete="list"
            aria-controls={commandMenuOpen ? 'composer-command-list' : undefined}
            aria-activedescendant={commandMenuOpen ? `composer-command-${commandMatches[commandIndex]?.name ?? ''}` : undefined}
            onFocus={() => { setFocused(true) }}
            onBlur={() => { setFocused(false) }}
          />
          <AttachmentRail
            attachments={attachments}
            disabled={disabled || inputState.phase !== 'plain'}
            onRemove={removeAttachment}
            t={t}
          />
        </div>
        <input
          ref={attachmentInputRef}
          className={css.fileInput}
          type="file"
          multiple
          aria-hidden="true"
          tabIndex={-1}
          onChange={event => {
            addAttachments(Array.from(event.currentTarget.files ?? []))
            event.currentTarget.value = ''
          }}
        />
        {error === undefined ? null : <div className={css.error} role="alert">{error}</div>}
        <div className={css.controls}>
          <div className={css.leadingControls}>
            <button
              type="button"
              className={css.attachButton}
              aria-label={t('composer.addAttachment')}
              title={t('composer.addAttachment')}
              disabled={disabled || input === undefined}
              onClick={() => { attachmentInputRef.current?.click() }}
            >
              <IconPaperclipOutline16 />
            </button>
            <Popover
              label={confirmingFullAccess ? t('composer.permission.confirmTitle') : t('composer.permission')}
              disabled={permissionRows.length === 0 || confirmingFullAccess}
              triggerClassName={`${css.controlTrigger} ${permissionTriggerClass}`}
              popoverClassName={css.permissionMenu}
              trigger={
                <span className={css.control}>
                  {permissionIcon(permissions?.currentValue ?? '')}
                  <span className={css.controlLabel}>{currentPermissionLabel}</span>
                  <IconChevronDownOutline14 className={css.controlChevron} />
                </span>
              }
              rows={permissionRows}
            />
            <Popover
              label={blankSession ? t('composer.mode') : t('composer.modeLocked')}
              disabled={!blankSession || sessionId === undefined || modeRows.length === 0}
              triggerClassName={`${css.controlTrigger} ${css.modeTrigger}`}
              trigger={
                <span className={css.control}>
                  <IconAgentPresetOutline16 />
                  <span className={css.controlLabel}>{currentPresetLabel}</span>
                  <IconChevronDownOutline14 className={css.controlChevron} />
                </span>
              }
              rows={modeRows}
            />
          </div>
          <div className={css.trailingControls}>
            {running
              ? (
                <div className={css.busyHints} aria-label={t('composer.busyHints')}>
                  <span className={`${css.busyHint} ${busyEnter === 'queue' ? css.busyHintActive : ''}`}>
                    <kbd>{busyEnter === 'queue' ? t('composer.keyEnter') : t('composer.keyModifiedEnter')}</kbd>
                    <span>{t('composer.queue')}</span>
                  </span>
                  <span className={`${css.busyHint} ${busyEnter === 'steer' ? css.busyHintActive : ''}`}>
                    <kbd>{busyEnter === 'steer' ? t('composer.keyEnter') : t('composer.keyModifiedEnter')}</kbd>
                    <span>{t('composer.steer')}</span>
                  </span>
                </div>
              )
              : null}
            <Popover
              label={t('composer.model')}
              disabled={modelRows.length === 0}
              align="end"
              triggerClassName={`${css.controlTrigger} ${css.modelTrigger}`}
              popoverClassName={css.modelMenu}
              trigger={
                <span className={css.control}>
                  <span className={css.controlLabel}>
                    {currentModel === undefined
                      ? t('composer.model')
                      : `${currentModel.model.name} · ${currentModel.group.name}`}
                  </span>
                  <IconChevronDownOutline14 className={css.controlChevron} />
                </span>
              }
              rows={modelRows}
            />
            <Popover
              label={t('composer.reasoning')}
              disabled={reasoningRows.length === 0}
              align="end"
              triggerClassName={`${css.controlTrigger} ${css.reasoningTrigger}`}
              trigger={
                <span className={css.control}>
                  <IconThinkOutline16 />
                  <span className={css.controlLabel}>
                    {reasoningRows.find(row => row.active)?.label ?? t('composer.reasoningDefault')}
                  </span>
                  <IconChevronDownOutline14 className={css.controlChevron} />
                </span>
              }
              rows={reasoningRows}
            />
            <span className={css.contextSeat}><ContextMeter sessionId={sessionId} /></span>
            {running
              ? (
                <button type="button" className={`${css.send} ${css.stop}`} onClick={stop} aria-label={t('composer.stop')}>
                  <IconStopFill16 />
                </button>
              )
              : (
                <button
                  type="button"
                  className={css.send}
                  onClick={() => { send('queue') }}
                  disabled={disabled || (draft.trim() === '' && inputState.imageIds.length === 0)}
                  aria-label={t('composer.send')}
                >
                  <IconSendOutline16 />
                </button>
            )}
          </div>
        </div>
      </div>
      </div>
      <RiskConfirmation
        open={confirmingFullAccess}
        title={t('composer.permission.confirmTitle')}
        description={t('composer.permission.confirmBody')}
        acknowledgeLabel={t('composer.permission.confirmAcknowledge')}
        cancelLabel={t('common.cancel')}
        closeLabel={t('common.close')}
        confirmLabel={t('composer.permission.confirm')}
        acknowledged={acknowledgedFullAccess}
        onAcknowledgedChange={setAcknowledgedFullAccess}
        onCancel={() => {
          setAcknowledgedFullAccess(false)
          setConfirmingFullAccess(false)
        }}
        onConfirm={() => {
          if (!acknowledgedFullAccess) return
          setAcknowledgedFullAccess(false)
          setConfirmingFullAccess(false)
          selectPermission(FULL_ACCESS_PERMISSION)
        }}
      />
    </>
  )
}
