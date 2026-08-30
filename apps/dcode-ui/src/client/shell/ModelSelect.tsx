/**
 * ModelSelect: two-level model and reasoning level selection for the composer.
 *
 * Implements the Figma 496:26454 MenuDropdown architecture:
 * - Root pane: 'Model' and 'Effort' drill-down rows
 * - Model pane: Provider-grouped model list with sticky headers and checkmark
 * - Effort pane: Reasoning effort levels for the current model
 * - Trigger: Model name + reasoning effort in caption tone with flip chevron
 *
 * @module @dsh-portable/dcode-ui/client/shell/ModelSelect
 */

import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
  type FocusEvent, type KeyboardEvent,
} from 'react'
import {
  IconCheckOutline16, IconChevronDownOutline14, IconChevronRightOutline14,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useAsync, useProjectionValue } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import css from './ModelSelect.module.css'

/** Which pane the dropdown shows: the two-row root or one drilled-in list. */
type Pane = 'root' | 'model' | 'effort'

/** The `modelSelection` projection, read structurally. */
export interface ModelSelectionView {
  readonly next: { readonly provider: string; readonly model: string; readonly reasoningEffort?: string } | null
  readonly lastUsed: { readonly provider: string; readonly model: string; readonly reasoningEffort?: string } | null
}

interface EffortChoice {
  readonly key: string
  readonly effort: string | undefined
  readonly label: string
}

export interface ModelSelectProps {
  readonly sessionId: SessionId | undefined
  readonly disabled?: boolean
}

function cx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function ModelSelect({ sessionId, disabled }: ModelSelectProps) {
  const runtime = useRuntime()
  const t = useT()
  const id = useId()
  const selection = useProjectionValue<ModelSelectionView>(sessionId, 'modelSelection')

  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState<Pane>('root')
  const [selecting, setSelecting] = useState(false)
  const [selectError, setSelectError] = useState<string | null>(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const catalog = useAsync(
    async () => await runtime.remote.session.modelCatalog(),
    [runtime, refreshIndex],
  )

  const reload = useCallback(() => {
    setRefreshIndex(i => i + 1)
  }, [])

  const groups = useMemo(
    () => (catalog.value?.ok === true ? catalog.value.value.groups : []),
    [catalog.value],
  )

  const failures = useMemo(
    () => (catalog.value?.ok === true ? catalog.value.value.failures ?? [] : []),
    [catalog.value],
  )

  const choices = useMemo(() => groups.flatMap(group =>
    group.models.map(model => ({ group, model }))), [groups])

  const current = selection?.next ?? selection?.lastUsed ?? (catalog.value?.ok === true ? catalog.value.value.default : undefined)

  const currentChoice = useMemo(() => {
    if (current === undefined) return undefined
    return choices.find(c => c.group.id === current.provider && c.model.id === current.model)
  }, [choices, current])

  const reasoning = currentChoice?.model.reasoning
  const effectiveEffort = current?.reasoningEffort ?? reasoning?.defaultEffort
  const effortLabel = reasoning === undefined
    ? undefined
    : effectiveEffort === undefined
      ? t('composer.effortDefault')
      : reasoning.efforts.find(level => level.id === effectiveEffort)?.name ?? effectiveEffort

  const effortChoices = useMemo<readonly EffortChoice[]>(() => {
    if (reasoning === undefined) return []
    return [
      ...reasoning.defaultEffort === undefined
        ? [{ key: 'provider-default', effort: undefined, label: t('composer.effortDefault') }]
        : [],
      ...reasoning.efforts.map(effort => ({
        key: `effort:${effort.id}`,
        effort: effort.id,
        label: effort.name,
      })),
    ]
  }, [reasoning, t])

  const show = (): void => {
    setPane('root')
    setOpen(true)
    setSelectError(null)
    reload()
  }

  const close = useCallback((restoreFocus = false): void => {
    setOpen(false)
    setPane('root')
    setSelectError(null)
    if (restoreFocus) {
      queueMicrotask(() => { triggerRef.current?.focus() })
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const closeOutside = (event: MouseEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }
    document.addEventListener('mousedown', closeOutside)
    return () => { document.removeEventListener('mousedown', closeOutside) }
  }, [close, open])

  const moveFocus = (offset: number): void => {
    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null)
    if (items.length === 0) return
    const active = items.findIndex(item => item === document.activeElement)
    const next = (Math.max(active, 0) + offset + items.length) % items.length
    items[next]?.focus()
  }

  const onRootKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      if (pane !== 'root') setPane('root')
      else close(true)
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(event.key === 'ArrowDown' ? 1 : -1)
    }
  }

  const onBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) return
    close()
  }

  const chooseModel = (provider: string, model: string): void => {
    if (sessionId === undefined) return
    if (current?.provider === provider && current?.model === model) {
      close(true)
      return
    }
    setSelecting(true)
    setSelectError(null)
    void runtime.remote.session.selectModel({
      sessionId,
      provider,
      model,
    }).then((result) => {
      setSelecting(false)
      if (!result.ok) {
        setSelectError(result.error.message)
      } else {
        close(true)
      }
    }).catch((err: unknown) => {
      setSelecting(false)
      setSelectError(err instanceof Error ? err.message : String(err))
    })
  }

  const chooseEffort = (effort: string | undefined): void => {
    if (sessionId === undefined || current === undefined) return
    if (effectiveEffort === effort) {
      close(true)
      return
    }
    setSelecting(true)
    setSelectError(null)
    void runtime.remote.session.selectModel({
      sessionId,
      provider: current.provider,
      model: current.model,
      ...(effort === undefined ? {} : { reasoningEffort: effort }),
    }).then((result) => {
      setSelecting(false)
      if (!result.ok) {
        setSelectError(result.error.message)
      } else {
        close(true)
      }
    }).catch((err: unknown) => {
      setSelecting(false)
      setSelectError(err instanceof Error ? err.message : String(err))
    })
  }

  const waiting = current === undefined && catalog.loading
  const modelLabel = waiting
    ? t('composer.modelLoading')
    : currentChoice?.model.name
      ?? (current === undefined ? t('composer.selectModel') : `${current.provider}/${current.model}`)
  const triggerLabel = effortLabel === undefined ? modelLabel : `${modelLabel} · ${effortLabel}`

  itemRefs.current = []
  let itemIndex = 0
  const itemRef = () => {
    const at = itemIndex++
    return (node: HTMLButtonElement | null) => { itemRefs.current[at] = node }
  }

  return (
    <div ref={rootRef} className={css.root} onKeyDown={onRootKeyDown} onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        title={triggerLabel}
        disabled={disabled || sessionId === undefined}
        onClick={() => {
          if (open) {
            close()
          } else {
            show()
          }
        }}
      >
        <span className={css.triggerLabel}>{modelLabel}</span>
        {effortLabel !== undefined && <span className={css.triggerEffort}>{effortLabel}</span>}
        <IconChevronDownOutline14 className={cx(css.chevron, open && css.chevronOpen)} />
      </button>

      {open && (
        <div
          id={`${id}-menu`}
          className={css.menu}
          role="menu"
          aria-label={t('composer.modelAria')}
          aria-busy={catalog.loading || selecting}
        >
          {selectError !== null && (
            <div className={css.error}>
              <span>{t('composer.modelError', { message: selectError })}</span>
            </div>
          )}

          {pane === 'root' && (
            <>
              <button
                ref={itemRef()}
                type="button"
                role="menuitem"
                className={css.cell}
                onClick={() => { setPane('model') }}
              >
                <span className={css.cellLabel}>{t('composer.model')}</span>
                <span className={css.cellValue}>{modelLabel}</span>
                <IconChevronRightOutline14 className={css.cellChevron} />
              </button>
              {reasoning !== undefined && (
                <button
                  ref={itemRef()}
                  type="button"
                  role="menuitem"
                  className={css.cell}
                  onClick={() => { setPane('effort') }}
                >
                  <span className={css.cellLabel}>{t('composer.effort')}</span>
                  <span className={css.cellValue}>{effortLabel}</span>
                  <IconChevronRightOutline14 className={css.cellChevron} />
                </button>
              )}
            </>
          )}

          {pane === 'model' && (
            <>
              {catalog.loading && (
                <div className={css.status}>{t('composer.modelLoading')}</div>
              )}
              {catalog.value?.ok === false && (
                <div className={css.error}>
                  <span>{t('composer.modelError', { message: catalog.value.error.message })}</span>
                  <button type="button" className={css.retry} onClick={reload}>{t('common.retry')}</button>
                </div>
              )}
              {failures.map(failure => (
                <div className={css.warning} key={failure.id}>
                  <span>{t('composer.modelWarning', { name: failure.name, message: failure.message })}</span>
                  <button type="button" className={css.retry} onClick={reload}>{t('common.retry')}</button>
                </div>
              ))}
              <div className={cx(css.groups, 'scrollable')}>
                {groups.map((group) => {
                  const headingId = `${id}-${group.id}`
                  return (
                    <section role="group" aria-labelledby={headingId} className={css.group} key={group.id}>
                      <div className={css.groupTitle} id={headingId}>{group.name}</div>
                      {group.models.map((model) => {
                        const selected = current?.provider === group.id && current?.model === model.id
                        return (
                          <button
                            ref={itemRef()}
                            type="button"
                            role="menuitemradio"
                            aria-checked={selected}
                            className={cx(css.option, selected && css.selected)}
                            key={model.id}
                            title={model.name}
                            disabled={selecting}
                            onClick={() => { chooseModel(group.id, model.id) }}
                          >
                            <span className={css.optionCopy}>
                              <span className={css.modelName}>{model.name}</span>
                            </span>
                            <span className={css.check}>
                              {selected ? <IconCheckOutline16 /> : null}
                            </span>
                          </button>
                        )
                      })}
                    </section>
                  )
                })}
              </div>
              {!catalog.loading && catalog.value?.ok === true && groups.length === 0 && (
                <div className={css.empty}>{t('composer.modelEmpty')}</div>
              )}
            </>
          )}

          {pane === 'effort' && (
            <>
              {effortChoices.length === 0
                ? <div className={css.empty}>{t('composer.effortEmpty')}</div>
                : effortChoices.map(level => {
                  const selected = effectiveEffort === level.effort
                  return (
                    <button
                      ref={itemRef()}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className={cx(css.option, selected && css.selected)}
                      key={level.key}
                      disabled={selecting}
                      onClick={() => { chooseEffort(level.effort) }}
                    >
                      <span className={css.optionCopy}>
                        <span className={css.modelName}>{level.label}</span>
                      </span>
                      <span className={css.check}>
                        {selected ? <IconCheckOutline16 /> : null}
                      </span>
                    </button>
                  )
                })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
