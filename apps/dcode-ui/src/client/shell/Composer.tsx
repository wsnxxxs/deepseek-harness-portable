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
  IconAgentPresetOutline16, IconCheckOutline16, IconChevronDownOutline14,
  IconEditOutline16, IconFolderOpenOutline16,
  IconSendOutline16, IconStopFill16, IconThinkOutline16, IconWarningOutline16,
  RiskConfirmation,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime, type BusyEnterBehavior } from '../state/runtime.ts'
import { useAsync, useObservable, useProjectionValue, useSessionSnapshot, useWorkspaceGroups } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { Translate } from '../locales.ts'
import { Popover, type MenuRow } from './ui.tsx'
import css from './Composer.module.css'

/** Props of the composer. */
export interface ComposerProps {
  readonly sessionId: SessionId | undefined
  readonly blank?: boolean
  readonly cwd?: string
  readonly onOpenWorkspace?: () => void
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

/** Prompt entry and the session controls. */
export function Composer({ sessionId, blank, cwd, onOpenWorkspace }: ComposerProps) {
  const runtime = useRuntime()
  const t = useT()
  const session = useSessionSnapshot(sessionId)
  const permissions = useProjectionValue<PermissionSelectView>(sessionId, 'permissions')
  const selection = useProjectionValue<ModelSelectionView>(sessionId, 'modelSelection')
  const agentPreset = useProjectionValue<string | null>(sessionId, 'agentPreset')
  const busyEnter = useObservable(runtime.busyEnter, 'queue')
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [confirmingFullAccess, setConfirmingFullAccess] = useState(false)
  const [acknowledgedFullAccess, setAcknowledgedFullAccess] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)

  // Restore this session's draft on a task switch, and persist the outgoing one.
  const previousSession = useRef<SessionId | undefined>(undefined)
  useEffect(() => {
    const outgoing = previousSession.current
    if (outgoing !== undefined) drafts.set(outgoing, draft)
    setDraft(sessionId === undefined ? '' : drafts.get(sessionId) ?? '')
    setError(undefined)
    previousSession.current = sessionId
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the draft is captured, not observed
  }, [sessionId])

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

  const running = session?.running === true
  const current = selection?.next ?? selection?.lastUsed ?? undefined
  const roster = presets.value?.ok === true ? presets.value.value.presets : []
  const currentPreset = agentPreset ?? roster.find(preset => preset.isDefault)?.id ?? roster[0]?.id
  const blankSession = (blank ?? session?.blank ?? false) && !running

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
    if (text === '') return
    const face = runtime.binding(sessionId)?.session
    if (face === undefined) return
    setDraft('')
    drafts.delete(sessionId)
    setError(undefined)

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
  }, [runtime, sessionId, draft])

  const stop = useCallback(() => {
    if (sessionId === undefined) return
    void runtime.binding(sessionId)?.session.cancel()
  }, [runtime, sessionId])

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing) return
    event.preventDefault()
    const accelerated = event.metaKey || event.ctrlKey
    const mode: BusyEnterBehavior = !running
      ? 'queue'
      : accelerated ? oppositeBusyEnter(busyEnter) : busyEnter
    send(mode)
  }, [busyEnter, running, send])

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
      {blank
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
      <div ref={shellRef} className={`${css.shell} ${focused ? css.shellFocused : ''}`}>
        <textarea
          ref={inputRef}
          className={css.input}
          rows={1}
          value={draft}
          disabled={disabled}
          placeholder={disabled
            ? t('composer.needsSession')
            : running ? t('composer.placeholderRunning') : t('composer.placeholder')}
          onChange={event => { setDraft(event.target.value) }}
          onKeyDown={onKeyDown}
          onFocus={() => { setFocused(true) }}
          onBlur={() => { setFocused(false) }}
        />
        {error === undefined ? null : <div className={css.error}>{error}</div>}
        <div className={css.controls}>
          <div className={css.leadingControls}>
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
                  disabled={disabled || draft.trim() === ''}
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
