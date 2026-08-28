/** Glass-styled, portal-backed select menu used by the DCode settings fallback. */

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import css from './SelectMenu.module.css'

export interface SelectMenuOption {
  readonly id: string
  readonly label: ReactNode
  readonly detail?: ReactNode
  readonly disabled?: boolean
}

export interface SelectMenuProps {
  readonly value: string
  readonly options: readonly SelectMenuOption[]
  readonly onChange: (value: string) => void
  readonly ariaLabel: string
  readonly disabled?: boolean
}

interface MenuPosition {
  readonly top: number
  readonly left: number
  readonly minWidth: number
  readonly side: 'above' | 'below'
}

const VIEWPORT_GUTTER = 8
const MENU_GAP = 6
const MENU_MAX_HEIGHT = 280

function firstEnabled(options: readonly SelectMenuOption[], from = 0, direction = 1): number {
  for (let index = from; index >= 0 && index < options.length; index += direction) {
    if (options[index]?.disabled !== true) return index
  }
  return -1
}

/** A native-select replacement that stays inside DCode's visual language. */
export function SelectMenu({ value, options, onChange, ariaLabel, disabled = false }: SelectMenuProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const optionRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() => {
    const selected = options.findIndex(option => option.id === value)
    return firstEnabled(options, selected >= 0 ? selected : 0)
  })
  const [position, setPosition] = useState<MenuPosition | undefined>()

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (trigger === null) return
    const rect = trigger.getBoundingClientRect()
    const roomBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER
    const above = roomBelow < MENU_MAX_HEIGHT && rect.top > roomBelow
    const estimatedHeight = Math.min(MENU_MAX_HEIGHT, Math.max(44, options.length * 40 + 8))
    const top = above
      ? Math.max(VIEWPORT_GUTTER, rect.top - estimatedHeight - MENU_GAP)
      : Math.min(window.innerHeight - VIEWPORT_GUTTER - estimatedHeight, rect.bottom + MENU_GAP)
    const minWidth = Math.max(rect.width, 180)
    const left = Math.min(
      Math.max(VIEWPORT_GUTTER, rect.left),
      Math.max(VIEWPORT_GUTTER, window.innerWidth - minWidth - VIEWPORT_GUTTER),
    )
    setPosition({ top, left, minWidth, side: above ? 'above' : 'below' })
  }, [options.length])

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    setPosition(undefined)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  const openMenu = useCallback(() => {
    if (disabled || options.length === 0) return
    const selected = options.findIndex(option => option.id === value)
    setActive(firstEnabled(options, selected >= 0 ? selected : 0))
    setOpen(true)
  }, [disabled, options, value])

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
  }, [open, updatePosition])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target
      if (target instanceof Node
        && !triggerRef.current?.contains(target)
        && !menuRef.current?.contains(target)) close(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key === 'Tab') {
        close(false)
        return
      }
      const move = (direction: 1 | -1, start: number): void => {
        const next = firstEnabled(options, start, direction)
        if (next >= 0) setActive(next)
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        move(1, active + 1)
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        move(-1, active - 1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        move(1, 0)
      } else if (event.key === 'End') {
        event.preventDefault()
        move(-1, options.length - 1)
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        const option = options[active]
        if (option?.disabled !== true && option !== undefined) {
          onChange(option.id)
          close()
        }
      }
    }
    const onViewportChange = (): void => { updatePosition() }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [active, close, onChange, open, options, updatePosition])

  useEffect(() => {
    if (!open) return
    optionRefs.current[active]?.focus()
  }, [active, open])

  const selected = options.find(option => option.id === value)
  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) return
      openMenu()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (open) return
      openMenu()
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
    }
  }

  const list = open && position !== undefined && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={menuRef}
        id={menuId}
        role="listbox"
        aria-label={ariaLabel}
        className={css.menu}
        data-side={position.side}
        style={{ top: position.top, left: position.left, minWidth: position.minWidth }}
      >
        {options.map((option, index) => (
          <button
            key={option.id}
            ref={(node) => { optionRefs.current[index] = node }}
            type="button"
            role="option"
            aria-selected={option.id === value}
            aria-disabled={option.disabled === true || undefined}
            tabIndex={index === active ? 0 : -1}
            className={`${css.option} ${option.id === value ? css.optionSelected : ''} ${index === active ? css.optionActive : ''}`}
            disabled={option.disabled}
            onMouseEnter={() => { if (option.disabled !== true) setActive(index) }}
            onClick={() => {
              if (option.disabled === true) return
              onChange(option.id)
              close()
            }}
          >
            <span className={css.optionText}>
              <span>{option.label}</span>
              {option.detail === undefined ? null : <span className={css.detail}>{option.detail}</span>}
            </span>
            {option.id === value ? <span className={css.check} aria-hidden>✓</span> : null}
          </button>
        ))}
      </div>,
      document.body,
    )
    : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled || options.length === 0}
        onClick={() => { if (open) close(false); else openMenu() }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={css.triggerValue}>{selected?.label ?? value}</span>
        <span className={`${css.chevron} ${open ? css.chevronOpen : ''}`} aria-hidden>⌄</span>
      </button>
      {list}
    </>
  )
}
