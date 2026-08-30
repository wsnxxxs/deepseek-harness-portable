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
  readonly placeholder?: ReactNode
  readonly disabled?: boolean
}

interface MenuPosition {
  readonly top: number
  readonly left: number
  readonly width: number
  readonly side: 'above' | 'below'
}

const VIEWPORT_GUTTER = 8
const MENU_GAP = 6
const MENU_MAX_HEIGHT = 320

function firstEnabled(options: readonly SelectMenuOption[], from = 0, direction = 1): number {
  for (let index = from; index >= 0 && index < options.length; index += direction) {
    if (options[index]?.disabled !== true) return index
  }
  return -1
}

/** A native-select replacement that stays inside DCode's visual language. */
export function SelectMenu({ value, options, onChange, ariaLabel, placeholder, disabled = false }: SelectMenuProps) {
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
    const estimatedHeight = Math.min(MENU_MAX_HEIGHT, Math.max(56, options.length * 48 + 16))
    const top = above
      ? Math.max(VIEWPORT_GUTTER, rect.top - estimatedHeight - MENU_GAP)
      : Math.min(window.innerHeight - VIEWPORT_GUTTER - estimatedHeight, rect.bottom + MENU_GAP)
    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - VIEWPORT_GUTTER * 2)
    const left = Math.min(
      Math.max(VIEWPORT_GUTTER, rect.left),
      Math.max(VIEWPORT_GUTTER, window.innerWidth - width - VIEWPORT_GUTTER),
    )
    setPosition({ top, left, width, side: above ? 'above' : 'below' })
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
      const handled = event.key === 'Escape' || event.key === 'Tab'
        || event.key === 'ArrowDown' || event.key === 'ArrowUp'
        || event.key === 'Home' || event.key === 'End'
        || event.key === 'Enter' || event.key === ' '
      if (handled) event.stopPropagation()
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
        let next = firstEnabled(options, start, direction)
        if (next < 0) next = firstEnabled(options, direction === 1 ? 0 : options.length - 1, direction)
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
    document.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown, true)
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
        style={{ top: position.top, left: position.left, width: position.width }}
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
              <span className={css.optionLabel}>{option.label}</span>
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
        <span className={`${css.triggerValue} ${selected === undefined ? css.triggerPlaceholder : ''}`}>
          {selected?.label ?? placeholder ?? value}
        </span>
        <span className={`${css.chevron} ${open ? css.chevronOpen : ''}`} aria-hidden>⌄</span>
      </button>
      {list}
    </>
  )
}
