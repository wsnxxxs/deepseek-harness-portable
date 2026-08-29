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
import { IconCheckOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ui.module.css'

/** Class names other modules compose against (they own their own layout). */
export const ui = css

/** A bordered card with an optional header row. */
export function Card(props: {
  title?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`${css.card} ${props.className ?? ''}`}>
      {props.title === undefined && props.actions === undefined
        ? null
        : (
          <header className={css.cardHeader}>
            <span className={css.grow}>{props.title}</span>
            {props.actions}
          </header>
        )}
      {props.children}
    </section>
  )
}

/** A panel section heading with optional trailing controls. */
export function SectionTitle(props: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className={css.sectionTitle}>
      <span>{props.children}</span>
      {props.actions}
    </div>
  )
}

/** A square control that carries an icon and an accessible name. */
export function IconButton(props: {
  label: string
  onClick: () => void
  children: ReactNode
  active?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={`${css.iconButton} ${css.tooltipTarget} ${props.active === true ? css.iconButtonActive : ''} ${props.className ?? ''}`}
      aria-label={props.label}
      aria-pressed={props.active}
      data-tooltip={props.label}
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
}) {
  return (
    <button
      type="button"
      className={`${css.button} ${props.primary === true ? css.buttonPrimary : ''} ${props.className ?? ''}`}
      disabled={props.disabled}
      title={props.title}
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
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent): void => {
      if (anchorRef.current?.contains(event.target as Node) === true) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  const select = useCallback((row: MenuRow) => {
    if (row.disabled === true) return
    setOpen(false)
    row.onSelect?.()
  }, [])

  let lastGroup: ReactNode

  return (
    <div className={css.popoverAnchor} ref={anchorRef} style={props.style}>
      <button
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
            {props.rows?.map((row) => {
              const heading = row.group !== undefined && row.group !== lastGroup
                ? <div className={css.menuLabel}>{row.group}</div>
                : null
              lastGroup = row.group
              return (
                <Fragment key={row.id}>
                  {heading}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={row.disabled}
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
export function Spinner() {
  return <span className={css.spinner} aria-hidden />
}
