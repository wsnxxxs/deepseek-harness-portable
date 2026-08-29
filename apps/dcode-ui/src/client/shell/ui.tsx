/**
 * Workbench atoms.
 *
 * Deliberately thin: the shared component library (`ui-primitives`) is a
 * platform module and already supplies markdown, code, diff, terminal and
 * icon rendering. What it does not supply is this surface's compact chrome —
 * the card, the popover menu and the two button weights — so only those live
 * here.
 * @module @dsh-portable/dcode-ui/client/shell/ui
 */

import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  IconCheckOutline14, IconCheckOutline16, IconCopyOutline16, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ui.module.css'

/** Class names other modules compose against (they own their own layout). */
export const ui = css

/** A square control that carries an icon and an accessible name. */
export function IconButton(props: {
  label: string
  onClick: () => void
  children: ReactNode
  active?: boolean
  disabled?: boolean
  className?: string
  dataFocusTarget?: string
}) {
  return (
    <button
      type="button"
      className={`${css.iconButton} ${css.tooltipTarget} ${props.active === true ? css.iconButtonActive : ''} ${props.className ?? ''}`}
      aria-label={props.label}
      aria-pressed={props.active}
      data-tooltip={props.label}
      data-dcode-focus-target={props.dataFocusTarget}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

/** A labelled control. */
export function Button(props: {
  children: ReactNode
  onClick: () => void
  primary?: boolean
  disabled?: boolean
  title?: string
  className?: string
  autoFocus?: boolean
  ariaLabel?: string
  ariaExpanded?: boolean
  ariaControls?: string
}) {
  return (
    <button
      type="button"
      className={`${css.button} ${props.primary === true ? css.buttonPrimary : ''} ${props.className ?? ''}`}
      disabled={props.disabled}
      autoFocus={props.autoFocus}
      title={props.title}
      aria-label={props.ariaLabel}
      aria-expanded={props.ariaExpanded}
      aria-controls={props.ariaControls}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

/** A compact status chip. */
export function Pill(props: { children: ReactNode; className?: string; title?: string }) {
  return <span className={`${css.pill} ${props.className ?? ''}`} title={props.title}>{props.children}</span>
}

/** An added/removed line-count pair, hidden when both are zero. */
export function DiffCount(props: { insertions: number; deletions: number }) {
  if (props.insertions === 0 && props.deletions === 0) return null
  return (
    <span className={css.mono}>
      {props.insertions > 0 ? <span className={css.added}>+{props.insertions}</span> : null}
      {props.insertions > 0 && props.deletions > 0 ? ' ' : null}
      {props.deletions > 0 ? <span className={css.removed}>-{props.deletions}</span> : null}
    </span>
  )
}

/** One row of a {@link Popover} menu. */
export interface MenuRow {
  readonly id: string
  readonly label: ReactNode
  readonly detail?: ReactNode
  readonly group?: ReactNode
  readonly icon?: ReactNode
  readonly active?: boolean
  readonly disabled?: boolean
  readonly danger?: boolean
  readonly onSelect?: () => void
}

/**
 * A button that opens an anchored menu.
 *
 * Dismissal is owned here (outside pointer, Escape, and selection) so no
 * caller has to repeat it, and the menu is rendered inside the anchor so it
 * inherits the workbench token scope.
 */
export function Popover(props: {
  label: string
  trigger: ReactNode
  rows?: readonly MenuRow[]
  children?: ReactNode
  placement?: 'up' | 'down'
  align?: 'start' | 'end'
  disabled?: boolean
  triggerClassName?: string
  popoverClassName?: string
  style?: CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const rowRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const [active, setActive] = useState(0)
  const menuId = useId()
  const rows = props.rows ?? []

  const firstEnabled = useCallback((from: number, direction: 1 | -1): number => {
    for (let index = from; index >= 0 && index < rows.length; index += direction) {
      if (rows[index]?.disabled !== true) return index
    }
    return -1
  }, [rows])

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && anchorRef.current?.contains(event.target) === true) return
      close()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.target instanceof Node) || anchorRef.current?.contains(event.target) !== true) return
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close(true)
        return
      }
      if (rows.length === 0) return
      if (event.key === 'Enter' || event.key === ' ') {
        const row = rows[active]
        if (row === undefined || row.disabled === true) return
        event.preventDefault()
        row.onSelect?.()
        close(true)
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp'
        && event.key !== 'Home' && event.key !== 'End') return
      event.preventDefault()
      const next = event.key === 'Home'
        ? firstEnabled(0, 1)
        : event.key === 'End'
          ? firstEnabled(rows.length - 1, -1)
          : firstEnabled(active + (event.key === 'ArrowDown' ? 1 : -1), event.key === 'ArrowDown' ? 1 : -1)
      if (next >= 0) setActive(next)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [active, close, firstEnabled, open, rows])

  useEffect(() => {
    if (!open) return
    setActive(firstEnabled(0, 1))
  }, [firstEnabled, open])

  useEffect(() => {
    if (open && active >= 0) rowRefs.current[active]?.focus()
  }, [active, open])

  const select = useCallback((row: MenuRow) => {
    if (row.disabled === true) return
    row.onSelect?.()
    close(true)
  }, [close])

  let lastGroup: ReactNode

  return (
    <div className={css.popoverAnchor} ref={anchorRef} style={props.style}>
      <button
        ref={triggerRef}
        type="button"
        className={`${css.iconButton} ${open ? css.iconButtonActive : ''} ${props.triggerClassName ?? ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={props.label}
        title={props.label}
        disabled={props.disabled}
        onClick={() => { setOpen(value => !value) }}
      >
        {props.trigger}
      </button>
      {open
        ? (
          <div
            id={menuId}
            role="menu"
            className={`${css.popover} ${props.placement === 'down' ? css.popoverDown : css.popoverUp} ${props.align === 'end' ? css.popoverRight : ''} ${props.popoverClassName ?? ''}`}
          >
            {props.children}
            {rows.map((row, index) => {
              const heading = row.group !== undefined && row.group !== lastGroup
                ? <div className={css.menuLabel}>{row.group}</div>
                : null
              lastGroup = row.group
              return (
                <Fragment key={row.id}>
                  {heading}
                  <button
                    ref={(node) => { rowRefs.current[index] = node }}
                    type="button"
                    role="menuitem"
                    disabled={row.disabled}
                    tabIndex={index === active ? 0 : -1}
                    className={`${css.menuItem} ${row.active === true ? css.menuItemActive : ''} ${row.danger === true ? css.menuItemDanger : ''}`}
                    onClick={() => { select(row) }}
                  >
                    {row.icon === undefined ? null : <span className={css.menuIcon}>{row.icon}</span>}
                    <span className={`${css.grow} ${css.menuContent}`}>
                      {row.label}
                      {row.detail === undefined ? null : <span className={css.menuDetail}>{row.detail}</span>}
                    </span>
                    {row.active === true ? <IconCheckOutline14 /> : null}
                  </button>
                </Fragment>
              )
            })}
          </div>
        )
        : null}
    </div>
  )
}

/** A centred explanatory state for an empty or unavailable panel. */
export function EmptyState(props: { children: ReactNode }) {
  return <div className={css.empty}>{props.children}</div>
}

/** An indeterminate progress mark. */
export function Spinner(props: { size?: 'sm' | 'md' } = {}) {
  return <span className={`${css.spinner} ${props.size === 'sm' ? css.spinnerSmall : ''}`} aria-hidden />
}

/** Shared clipboard action with consistent transient success feedback. */
export function CopyButton(props: {
  text: string
  label: string
  copiedLabel: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback(() => {
    if (copied) return
    void writeClipboard(props.text).then((ok) => {
      if (!ok) return
      setCopied(true)
      window.setTimeout(() => { setCopied(false) }, 1500)
    })
  }, [copied, props.text])
  return (
    <>
      <IconButton
        label={copied ? props.copiedLabel : props.label}
        className={props.className}
        onClick={copy}
      >
        {copied ? <IconCheckOutline16 /> : <IconCopyOutline16 />}
      </IconButton>
      {copied ? <span className={css.visuallyHidden} role="status">{props.copiedLabel}</span> : null}
    </>
  )
}
