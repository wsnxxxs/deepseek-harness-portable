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
import type { ReactNode, RefObject } from 'react'
import {
  IconAgentPresetOutline16, IconChevronDownOutline14, IconCloseFill14,
  IconFolderOpen16, IconFolderOpenOutline16, IconPaperclipOutline16, IconPlusOutline16,
  IconSendOutline16, IconStopFill16,
  RiskConfirmation,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ComposerAttachment, DraftAttachmentId } from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { CommandDescriptor } from '@deepseek-ai/dsh-client-ui-commands/client'
import type { SessionSummary } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime, type BusyEnterBehavior } from '../state/runtime.ts'
import {
  useAsync, useObservable, useProjectionValue, useSessionInput, useSessionList, useSessionSnapshot,
  useWorkspaceGroups,
} from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { Translate } from '../locales.ts'
import { Popover, type MenuRow } from './ui.tsx'
import { ContextMeter } from './ContextMeter.tsx'
import { ModelSelect, type ModelSelectHandle, type ModelSelectionView } from './ModelSelect.tsx'
import { SessionStatsLine } from './SessionStatsLine.tsx'
import type { ModelReadiness } from '../settings/readiness.ts'
import css from './Composer.module.css'

/** Props of the composer. */
export interface ComposerProps {
  readonly sessionId: SessionId | undefined
  readonly blank?: boolean
  readonly cwd?: string
  readonly onOpenWorkspace?: () => void
  readonly readiness?: ModelReadiness
  readonly onSelectModel?: () => void
  readonly onConfigureProvider?: () => void
  /** Opens the model picker from outside the composer (readiness card actions). */
  readonly modelSelectRef?: RefObject<ModelSelectHandle>
  /** Active `@query` at the caret; reserved for the file/symbol reference picker. */
  readonly onReferenceQueryChange?: (query: string | undefined) => void
}

/** The `permissions` projection, read structurally. */
interface PermissionSelectView {
  readonly currentValue: string
  readonly options: readonly { readonly value: string; readonly name: string; readonly description?: string }[]
}

interface ContextReferenceItem {
  readonly id: string
  readonly kind: 'file' | 'skill' | 'command' | 'session'
  readonly label: string
  readonly detail?: string
  readonly value: string
}

interface ContextPill extends ContextReferenceItem {}

/** Permission value that requires an explicit user acknowledgement. */
const FULL_ACCESS_PERMISSION = 'danger-full-access'

/** Built-in preset labels are translated; user-authored rows use their roster metadata. */
function modeLabel(id: string, fallback: string, t: Translate): string {
  switch (id) {
    case 'standard': return t('composer.mode.standard')
    case 'ptc': return t('composer.mode.ptc')
    case 'minimal': return t('composer.mode.minimal')
    case 'cordis': return t('composer.mode.cordis')
    case 'crew': return t('composer.mode.crew')
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

/** Shield variants make the active access level legible without relying on color. */
function permissionIcon(value: string): ReactNode {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5 13 3.4v3.8c0 3.1-1.9 5.8-5 7.3-3.1-1.5-5-4.2-5-7.3V3.4z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      {value === 'read-only' ? <path d="m5.5 7.8 1.5 1.5 3.4-3.4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {value === 'workspace-write' ? <path d="m5.5 9.9.3-1.7 3.7-3.7 1.2 1.2L7 9.4z" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {value === FULL_ACCESS_PERMISSION ? <path d="M8 5v3.5m0 2v.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /> : null}
    </svg>
  )
}

/** Cmd/Ctrl+Enter flips the configured busy behavior. */
function oppositeBusyEnter(value: BusyEnterBehavior): BusyEnterBehavior {
  return value === 'queue' ? 'steer' : 'queue'
}

/** Draft text per session, so switching tasks does not lose an unsent prompt. */
const drafts = new Map<string, string>()

const OPEN_WORKSPACE_ROW_ID = 'open-workspace'

/** Keep a useful folder label visible while the durable workspace list settles. */
function folderLabel(path: string | undefined): string | undefined {
  if (path === undefined || path.trim() === '') return undefined
  const normalized = path.replace(/[\\/]+$/, '')
  const leaf = normalized.slice(Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/')) + 1)
  return leaf === '' ? path : leaf
}

/** A leading, argument-free slash token is eligible for command completion. */
function slashQuery(value: string): string | undefined {
  const match = /^\/([^\s]*)$/.exec(value)
  return match?.[1]?.toLocaleLowerCase()
}

/** Canonical `@[label](dsh-session:<id>)` mention the host session-reference resolver accepts. */
function sessionMention(label: string, id: string): string {
  const escaped = label.replace(/[\\\]]/g, match => `\\${match}`)
  const payload = JSON.stringify(id)
  const bytes = new TextEncoder().encode(payload)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const base64 = window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `@[${escaped}](dsh-session:${base64})`
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

interface DesktopFilePathInfo {
  readonly path: string
  readonly isDirectory: boolean
}

interface DesktopFileBridge {
  readonly getPathInfoForFile?: (file: File) => DesktopFilePathInfo | undefined
}

/** Resolve a selected or dropped local path through the desktop bridge. */
function filePathInfo(file: File): DesktopFilePathInfo | undefined {
  const desktop = (globalThis as typeof globalThis & { readonly deepSeekDesktop?: DesktopFileBridge }).deepSeekDesktop
  const resolved = desktop?.getPathInfoForFile?.(file)
  if (resolved?.path !== undefined && resolved.path !== '') return resolved
  const relativePath = (file as File & { readonly webkitRelativePath?: string }).webkitRelativePath
  return relativePath === undefined || relativePath === ''
    ? undefined
    : { path: relativePath, isDirectory: false }
}

function fileMention(info: DesktopFilePathInfo): string {
  const path = info.isDirectory && !/[\\/]$/.test(info.path) ? `${info.path}/` : info.path
  return /\s/.test(path) ? `@"${path}"` : `@${path}`
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
export function Composer({ sessionId, blank, cwd, onOpenWorkspace, readiness, onSelectModel, onConfigureProvider, modelSelectRef, onReferenceQueryChange }: ComposerProps) {
  const runtime = useRuntime()
  const t = useT()
  const session = useSessionSnapshot(sessionId)
  const { input, state: inputState } = useSessionInput(sessionId)
  const permissions = useProjectionValue<PermissionSelectView>(sessionId, 'permissions')
  const agentPreset = useProjectionValue<string | null>(sessionId, 'agentPreset')
  const busyEnter = useObservable(runtime.busyEnter, 'queue')
  const [fallbackDraft, setFallbackDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [readinessIssue, setReadinessIssue] = useState<'model' | 'credential' | undefined>()
  const [dragActive, setDragActive] = useState(false)
  const [commandIndex, setCommandIndex] = useState(0)
  const [commandMenuDismissed, setCommandMenuDismissed] = useState(false)
  const [activeReferenceQuery, setActiveReferenceQuery] = useState<string | undefined>(undefined)
  const [referenceIndex, setReferenceIndex] = useState(0)
  const [referenceFiles, setReferenceFiles] = useState<readonly { path: string; kind: 'file' | 'directory' }[]>([])
  const [contextPills, setContextPills] = useState<readonly ContextPill[]>([])
  const [queueEditing, setQueueEditing] = useState(false)
  const [queueDraft, setQueueDraft] = useState('')
  const [queueBusy, setQueueBusy] = useState(false)
  const [confirmingFullAccess, setConfirmingFullAccess] = useState(false)
  const [acknowledgedFullAccess, setAcknowledgedFullAccess] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const conversation = runtime.conversation
  const draft = input === undefined ? fallbackDraft : inputState.draft
  const attachments = useMemo(
    () => conversation?.draftImages(inputState.imageIds) ?? [],
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
    setReadinessIssue(undefined)
    setActiveReferenceQuery(undefined)
    setContextPills([])
    setQueueEditing(false)
    previousSession.current = sessionId
  }, [sessionId])

  useEffect(() => {
    if (readinessIssue === 'model' && readiness?.model === 'ready') setReadinessIssue(undefined)
    if (readinessIssue === 'credential' && readiness?.credential === 'ready') setReadinessIssue(undefined)
  }, [readiness, readinessIssue])

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

  const presets = useAsync(async () => await runtime.remote.agentPresets.list(), [runtime])
  const commandCatalog = useAsync(
    async () => (sessionId === undefined ? undefined : await runtime.remote.commands.list(sessionId)),
    [runtime, sessionId],
  )
  const skillCatalog = useAsync(
    async () => (sessionId === undefined ? undefined : await runtime.remote.skills.list({ sessionId }, new AbortController().signal)),
    [runtime, sessionId],
  )

  const running = session?.running === true
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
    if (sessionId === undefined || activeReferenceQuery === undefined) {
      setReferenceFiles([])
      return undefined
    }
    const controller = new AbortController()
    void runtime.remote.fileReferences.list(sessionId, activeReferenceQuery, controller.signal).then((result) => {
      if (result.ok) setReferenceFiles(result.value)
    }).catch(() => { setReferenceFiles([]) })
    return () => { controller.abort() }
  }, [activeReferenceQuery, runtime, sessionId])

  const sessionList = useSessionList()
  const referenceItems = useMemo<readonly ContextReferenceItem[]>(() => {
    if (activeReferenceQuery === undefined) return []
    const query = activeReferenceQuery.toLocaleLowerCase()
    const sessionItems: ContextReferenceItem[] = sessionList.ids
      .filter(id => id !== sessionId)
      .map(id => sessionList.byId[id])
      .filter((row): row is SessionSummary => row !== undefined)
      .filter(row => row.displayTitle.toLocaleLowerCase().includes(query))
      .slice(0, 6)
      .map(row => ({
        id: `session:${row.id}`,
        kind: 'session' as const,
        label: row.displayTitle,
        detail: t('composer.referenceSession'),
        value: sessionMention(row.displayTitle, row.id),
      }))
    const files: ContextReferenceItem[] = referenceFiles.slice(0, 12).map(file => {
      const path = file.kind === 'directory' ? `${file.path.replace(/\/$/, '')}/` : file.path
      const mention = /\s/.test(path) ? `@"${path}"` : `@${path}`
      return {
        id: `file:${path}`,
        kind: 'file',
        label: path,
        detail: t(file.kind === 'directory' ? 'composer.referenceDirectory' : 'composer.referenceFile'),
        value: mention,
      }
    })
    const skills = skillCatalog.value?.ok === true ? skillCatalog.value.value.skills : []
    const skillItems: ContextReferenceItem[] = skills
      .filter(skill => skill.name.toLocaleLowerCase().includes(query))
      .slice(0, 8)
      .map(skill => ({ id: `skill:${skill.name}`, kind: 'skill', label: skill.name, detail: skill.description, value: `/${skill.name}` }))
    const commandItems: ContextReferenceItem[] = commands
      .filter(command => command.name.toLocaleLowerCase().includes(query))
      .slice(0, 8)
      .map(command => ({ id: `command:${command.name}`, kind: 'command', label: command.name, detail: command.description, value: `/${command.name}` }))
    return [...sessionItems, ...files, ...skillItems, ...commandItems]
  }, [activeReferenceQuery, commands, referenceFiles, sessionId, sessionList, skillCatalog.value, t])
  const referenceMenuOpen = focused && activeReferenceQuery !== undefined && referenceItems.length > 0

  useEffect(() => {
    setCommandIndex(0)
  }, [commandQuery, sessionId])

  useEffect(() => { setReferenceIndex(0) }, [activeReferenceQuery, sessionId])

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

  const chooseReference = useCallback((item: ContextReferenceItem) => {
    const textarea = inputRef.current
    const caret = textarea?.selectionStart ?? draft.length
    const query = referenceQuery(draft, caret)
    if (query === undefined) return
    const start = caret - query.length - 1
    const next = `${draft.slice(0, start)}${item.value} ${draft.slice(caret)}`
    updateDraft(next)
    setContextPills(current => current.some(pill => pill.id === item.id) ? current : [...current, item])
    setActiveReferenceQuery(undefined)
    requestAnimationFrame(() => {
      const target = inputRef.current
      if (target === null) return
      const nextCaret = start + item.value.length + 1
      target.focus()
      target.setSelectionRange(nextCaret, nextCaret)
    })
  }, [draft, updateDraft])

  const removeContextPill = useCallback((pill: ContextPill) => {
    const index = draft.indexOf(pill.value)
    if (index >= 0) {
      const end = index + pill.value.length + (draft[index + pill.value.length] === ' ' ? 1 : 0)
      updateDraft(`${draft.slice(0, index)}${draft.slice(end)}`)
    }
    setContextPills(current => current.filter(candidate => candidate.id !== pill.id))
    requestAnimationFrame(() => { inputRef.current?.focus() })
  }, [draft, updateDraft])

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

  const addRows = useMemo<MenuRow[]>(() => [
    {
      id: 'files-and-folders',
      group: t('composer.add'),
      label: t('composer.filesAndFolders'),
      icon: <IconPaperclipOutline16 />,
      onSelect: () => { attachmentInputRef.current?.click() },
    },
    ...commands.map(command => ({
      id: `command:${command.name}`,
      group: t('composer.commandList'),
      label: (
        <span className={css.addCommandLabel}>
          <span className={css.addCommandName}>{command.name}</span>
          <span className={css.addCommandDescription}>{command.description}</span>
        </span>
      ),
      onSelect: () => { completeCommand(command) },
    })),
  ], [commands, completeCommand, t])

  const addAttachments = useCallback((files: readonly File[]) => {
    if (files.length === 0) return
    if (input === undefined || conversation === undefined) {
      setError(t('composer.attachmentsUnavailable'))
      return
    }
    try {
      const created = conversation.createDraftImages(files)
      const accepted = input.addImages(created.map(attachment => attachment.id))
      if (!accepted) {
        conversation.releaseDraftImages(created)
        setError(t('composer.attachmentsBusy'))
        return
      }
      setError(undefined)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }, [conversation, input, t])

  const addSelectedFiles = useCallback((files: readonly File[]) => {
    if (files.length === 0) return
    const entries = files.map(file => ({ file, info: filePathInfo(file) }))
    const pathEntries = entries.filter((entry): entry is { file: File; info: DesktopFilePathInfo } => entry.info !== undefined)
    const imageFallbacks = entries
      .filter(entry => entry.info === undefined && entry.file.type.startsWith('image/'))
      .map(entry => entry.file)
    const unresolvedFiles = entries.filter(entry => entry.info === undefined && !entry.file.type.startsWith('image/'))

    if (imageFallbacks.length > 0) addAttachments(imageFallbacks)
    if (pathEntries.length === 0) {
      if (unresolvedFiles.length > 0) setError(t('composer.filePathUnavailable'))
      return
    }

    const existing = new Set(contextPills.map(pill => pill.value))
    const selected = pathEntries
      .map(entry => {
        const value = fileMention(entry.info)
        return {
          id: `selected-file:${entry.info.path}`,
          kind: 'file' as const,
          label: entry.info.path,
          detail: t(entry.info.isDirectory ? 'composer.referenceDirectory' : 'composer.referenceFile'),
          value,
        }
      })
      .filter(item => {
        if (existing.has(item.value)) return false
        existing.add(item.value)
        return true
      })
    if (selected.length === 0) {
      if (unresolvedFiles.length > 0) setError(t('composer.filePathUnavailable'))
      return
    }

    const textarea = inputRef.current
    const caret = textarea?.selectionStart ?? draft.length
    const before = draft.slice(0, caret)
    const after = draft.slice(caret)
    const prefix = before.length > 0 && !/\s$/.test(before) ? ' ' : ''
    const inserted = selected.map(item => item.value).join(' ')
    const suffix = after.length === 0 || !/^\s/.test(after) ? ' ' : ''
    updateDraft(`${before}${prefix}${inserted}${suffix}${after}`)
    setContextPills(current => [
      ...current,
      ...selected.filter(item => !current.some(pill => pill.value === item.value)),
    ])
    setActiveReferenceQuery(undefined)
    if (unresolvedFiles.length > 0) setError(t('composer.filePathUnavailable'))
    else setError(undefined)
    requestAnimationFrame(() => {
      const target = inputRef.current
      if (target === null) return
      const nextCaret = caret + prefix.length + inserted.length + suffix.length
      target.focus()
      target.setSelectionRange(nextCaret, nextCaret)
    })
  }, [addAttachments, contextPills, draft, t, updateDraft])

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
    addSelectedFiles(Array.from(event.dataTransfer.files))
  }, [addSelectedFiles])

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
        icon,
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

  const { groups } = useWorkspaceGroups()
  const workspace = useMemo(
    () => groups.find(group => group.path === cwd)
      ?? groups.find(group => group.sessions.some(row => row.id === sessionId)),
    [cwd, groups, sessionId],
  )
  const workspaceTitle = workspace?.title ?? folderLabel(cwd)
  const workspaceRows = useMemo<MenuRow[]>(() => {
    if (groups.length === 0) return []
    return [
      ...groups.map(group => ({
        id: String(group.workspaceId),
        label: group.title,
        detail: group.path,
        icon: <IconFolderOpen16 />,
        active: group.workspaceId === workspace?.workspaceId,
        onSelect: () => { runtime.navigation?.startSession(group.workspaceId) },
      })),
      ...(onOpenWorkspace === undefined
        ? []
        : [{
          id: OPEN_WORKSPACE_ROW_ID,
          label: t('nav.openWorkspace'),
          icon: <IconFolderOpenOutline16 />,
          onSelect: onOpenWorkspace,
        }]),
    ]
  }, [groups, onOpenWorkspace, runtime, t, workspace?.workspaceId])

  const send = useCallback((mode: BusyEnterBehavior) => {
    if (sessionId === undefined) return
    const text = draft.trim()
    if (text === '' && inputState.imageIds.length === 0) return
    if (!text.startsWith('/') && readiness?.model === 'missing') {
      setReadinessIssue('model')
      return
    }
    if (!text.startsWith('/') && readiness?.credential === 'missing') {
      setReadinessIssue('credential')
      return
    }
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

    const handle = face.beginSubmission({ mode, text, images: [] })
    void face.prompt([{ type: 'text', text }], mode, undefined, handle.requestId)
      .then((result) => {
        if (!result.ok) setError(result.error.message)
      })
      .catch((cause: unknown) => {
        handle.abandon()
        setError(cause instanceof Error ? cause.message : String(cause))
      })
  }, [draft, input, inputState.imageIds, readiness, runtime, sessionId])

  const stop = useCallback(() => {
    if (sessionId === undefined) return
    void runtime.binding(sessionId)?.session.cancel()
  }, [runtime, sessionId])

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (referenceMenuOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const direction = event.key === 'ArrowDown' ? 1 : -1
        setReferenceIndex(index => (index + direction + referenceItems.length) % referenceItems.length)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        setActiveReferenceQuery(undefined)
        return
      }
      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        if (event.nativeEvent.isComposing) return
        event.preventDefault()
        const item = referenceItems[referenceIndex]
        if (item !== undefined) chooseReference(item)
        return
      }
    }
    if (event.key === 'Backspace' && contextPills.length > 0 && draft.trim() === contextPills.at(-1)?.value) {
      event.preventDefault()
      const pill = contextPills.at(-1)
      if (pill !== undefined) removeContextPill(pill)
      return
    }
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
  }, [busyEnter, chooseReference, commandIndex, commandMatches, commandMenuOpen, completeCommand, contextPills, draft, referenceIndex, referenceItems, referenceMenuOpen, removeContextPill, running, send])

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
  const queued = useMemo(
    () => (session?.queue ?? []).filter(item => item.placement === 'queued'),
    [session?.queue],
  )
  const firstQueued = queued[0]

  const updateQueued = (action: { readonly kind: 'remove' | 'steer' } | { readonly kind: 'edit'; readonly content: readonly { readonly type: 'text'; readonly text: string }[] }): void => {
    if (sessionId === undefined || firstQueued === undefined || queueBusy) return
    const face = runtime.binding(sessionId)?.session
    if (face === undefined) return
    setQueueBusy(true)
    void face.updateQueue(firstQueued.id, action).then((result) => {
      if (!result.ok) setError(result.error.message)
      else setQueueEditing(false)
    }).catch((cause: unknown) => { setError(cause instanceof Error ? cause.message : String(cause)) })
      .finally(() => { setQueueBusy(false) })
  }

  return (
    <>
      <div className={css.dock}>
      {blank && sessionId !== undefined
        ? (
          <div className={css.headerRow}>
            {workspaceRows.length > 0
              ? (
                <Popover
                  label={t('top.workspaceMenu')}
                  triggerClassName={css.projectChip}
                  trigger={(
                    <span className={css.headerChipContent}>
                      <IconFolderOpenOutline16 />
                      <span>{workspaceTitle ?? t('nav.openWorkspace')}</span>
                      <IconChevronDownOutline14 />
                    </span>
                  )}
                  rows={workspaceRows}
                />
              )
              : (
                <button
                  type="button"
                  className={css.projectChip}
                  onClick={onOpenWorkspace}
                  disabled={onOpenWorkspace === undefined}
                  title={cwd}
                >
                  <IconFolderOpenOutline16 />
                  <span>{workspaceTitle ?? t('nav.openWorkspace')}</span>
                  <IconChevronDownOutline14 />
                </button>
              )}
            <Popover
              label={t('composer.mode')}
              disabled={modeRows.length === 0}
              triggerClassName={css.headerChip}
              trigger={(
                <span className={css.headerChipContent}>
                  <IconAgentPresetOutline16 />
                  <span>{currentPresetLabel}</span>
                  <IconChevronDownOutline14 />
                </span>
              )}
              rows={modeRows}
            />
          </div>
        )
        : null}
      {running && queued.length > 0
        ? (
          <div className={css.queueBanner} role="status">
            <span className={css.queueCount}>{t('chat.queued')}: {queued.length}</span>
            {queueEditing
              ? (
                <input
                  className={css.queueEdit}
                  value={queueDraft}
                  autoFocus
                  aria-label={t('chat.editQueued')}
                  onChange={event => { setQueueDraft(event.target.value) }}
                  onKeyDown={event => {
                    if (event.key === 'Escape') setQueueEditing(false)
                    if (event.key === 'Enter' && queueDraft.trim() !== '') updateQueued({ kind: 'edit', content: [{ type: 'text', text: queueDraft.trim() }] })
                  }}
                />
              )
              : <span className={css.queuePreview}>{firstQueued?.text ?? firstQueued?.preview}</span>}
            <span className={css.queueButtons}>
              {queueEditing
                ? <button type="button" disabled={queueBusy || queueDraft.trim() === ''} onClick={() => { updateQueued({ kind: 'edit', content: [{ type: 'text', text: queueDraft.trim() }] }) }}>{t('chat.saveQueued')}</button>
                : <button type="button" disabled={queueBusy || firstQueued?.text === null} onClick={() => { setQueueDraft(firstQueued?.text ?? firstQueued?.preview ?? ''); setQueueEditing(true) }}>{t('chat.editQueued')}</button>}
              <button type="button" disabled={queueBusy} onClick={() => { updateQueued({ kind: 'remove' }) }}>{t('chat.removeQueued')}</button>
              <button type="button" disabled={queueBusy || firstQueued?.placement !== 'queued'} onClick={() => { updateQueued({ kind: 'steer' }) }}>{t('chat.steerQueued')}</button>
            </span>
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
          {referenceMenuOpen
            ? (
              <div id="composer-reference-list" className={css.referenceMenu} role="listbox" aria-label={t('composer.contextReferences')}>
                {referenceItems.map((item, index) => {
                  const previous = referenceItems[index - 1]
                  return (
                    <div className={css.referenceRow} key={item.id}>
                      {previous?.kind === item.kind
                        ? null
                        : <div className={css.referenceGroup}>{item.kind === 'file' ? t('composer.workspaceFiles') : item.kind === 'session' ? t('composer.referenceSessions') : item.kind === 'skill' ? t('composer.skills') : t('composer.commands')}</div>}
                      <button
                        type="button"
                        id={`composer-reference-${String(index)}`}
                        className={`${css.referenceOption} ${index === referenceIndex ? css.referenceOptionActive : ''}`}
                        role="option"
                        aria-selected={index === referenceIndex}
                        onMouseEnter={() => { setReferenceIndex(index) }}
                        onMouseDown={event => { event.preventDefault() }}
                        onClick={() => { chooseReference(item) }}
                      >
                        <span className={css.referenceKind} aria-hidden>{item.kind === 'file' ? '▧' : item.kind === 'session' ? '◎' : item.kind === 'skill' ? '✦' : '/'}</span>
                        <span className={css.referenceLabel}>{item.label}</span>
                        {item.detail === undefined ? null : <span className={css.referenceDetail}>{item.detail}</span>}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
            : null}
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
          {contextPills.length === 0
            ? null
            : (
              <div className={css.contextPills} aria-label={t('composer.selectedContext')}>
                {contextPills.map(pill => (
                  <span className={css.contextPill} key={pill.id}>
                    <span aria-hidden>{pill.kind === 'file' ? '▧' : pill.kind === 'session' ? '◎' : pill.kind === 'skill' ? '✦' : '/'}</span>
                    <span>{pill.label}</span>
                    <button type="button" aria-label={t('composer.removeContext', { name: pill.label })} onClick={() => { removeContextPill(pill) }}><IconCloseFill14 /></button>
                  </span>
                ))}
              </div>
            )}
          <textarea
            ref={inputRef}
            className={css.input}
            rows={1}
            value={draft}
            disabled={disabled}
            placeholder={disabled
              ? t('composer.needsSession')
              : t('composer.placeholder')}
            onChange={event => {
              updateDraft(event.target.value)
              captureReference(event.target.value, event.target.selectionStart)
            }}
            onSelect={event => { captureReference(event.currentTarget.value, event.currentTarget.selectionStart) }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            aria-label={t('composer.placeholder')}
            aria-autocomplete="list"
            aria-expanded={referenceMenuOpen || commandMenuOpen}
            aria-controls={referenceMenuOpen ? 'composer-reference-list' : commandMenuOpen ? 'composer-command-list' : undefined}
            aria-activedescendant={referenceMenuOpen
              ? `composer-reference-${String(referenceIndex)}`
              : commandMenuOpen ? `composer-command-${commandMatches[commandIndex]?.name ?? ''}` : undefined}
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
            addSelectedFiles(Array.from(event.currentTarget.files ?? []))
            event.currentTarget.value = ''
          }}
        />
        {readinessIssue === undefined
          ? null
          : (
            <div className={css.readinessIssue} role="alert">
              <span>{readinessIssue === 'model' ? t('readiness.inlineModel') : t('readiness.inlineCredential')}</span>
              <button
                type="button"
                onClick={readinessIssue === 'model' ? onSelectModel : onConfigureProvider}
              >{readinessIssue === 'model' ? t('readiness.selectModel') : t('readiness.configureKey')}</button>
            </div>
          )}
        {error === undefined ? null : <div className={css.error} role="alert">{error}</div>}
        <div className={css.controls}>
          <div className={css.leadingControls}>
            <Popover
              label={t('composer.add')}
              disabled={disabled}
              triggerClassName={css.addButton}
              popoverClassName={css.addMenu}
              trigger={<IconPlusOutline16 />}
              rows={addRows}
            />
            <Popover
              label={confirmingFullAccess ? t('composer.permission.confirmTitle') : t('composer.permission')}
              disabled={permissionRows.length === 0 || confirmingFullAccess}
              triggerClassName={`${css.controlTrigger} ${css.securityPermission} ${permissionTriggerClass}`}
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
          </div>
          <div className={css.trailingControls} data-dcode-model-select="">
            <ModelSelect ref={modelSelectRef} sessionId={sessionId} disabled={disabled} />
            <ContextMeter sessionId={sessionId} />
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
      <SessionStatsLine sessionId={sessionId} />
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
