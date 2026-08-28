/**
 * The workbench's directory browser.
 *
 * DSH offers two picking backends behind one Remote: a native chooser (the
 * desktop shell) and a host-listed browse (every surface). The official UI
 * selects between them by which package occupies its directory-flow slot —
 * a slot the workbench's own frame does not declare, so it makes the same
 * choice explicitly: try the native chooser first, and browse when there
 * isn't one. That keeps "Open workspace" working identically in the packaged
 * desktop app and in a plain browser tab.
 * @module @dsh-portable/dcode-ui/client/shell/DirectoryPicker
 */

import { useCallback, useEffect, useState } from 'react'
import {
  IconCloseOutline16, IconFolderClose16, IconFolderOpenOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { useRuntime } from '../state/runtime.ts'
import { useT } from '../state/i18n.ts'
import { Button, IconButton, Spinner } from './ui.tsx'
import css from './DirectoryPicker.module.css'

/** One directory row as the host reports it. */
interface Entry {
  readonly name: string
  readonly path: string
  readonly hidden: boolean
}

/** One browse level. */
interface Listing {
  readonly path: string
  readonly home: string
  readonly crumbs: readonly Entry[]
  readonly entries: readonly Entry[]
  readonly truncated: boolean
}

/** Props of the picker dialog. */
export interface DirectoryPickerProps {
  /** The operator chose a directory; the caller adopts it as a workspace. */
  readonly onPicked: (path: string) => void
  readonly onCancel: () => void
}

/** A modal directory browser over the host's listing Remote. */
export function DirectoryPicker({ onPicked, onCancel }: DirectoryPickerProps) {
  const runtime = useRuntime()
  const t = useT()
  const [listing, setListing] = useState<Listing | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [target, setTarget] = useState<string | undefined>(undefined)

  const browse = useCallback((path?: string) => {
    const navigation = runtime.navigation
    if (navigation === undefined) {
      setError('workspace navigation is unavailable on this connection')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(undefined)
    void navigation.listDirectory(path)
      .then((next) => {
        setListing(next as Listing)
        setTarget((next as Listing).path)
        setLoading(false)
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : String(cause))
        setLoading(false)
      })
  }, [runtime])

  useEffect(() => { browse(undefined) }, [browse])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onCancel()
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => { document.removeEventListener('keydown', onKeyDown, true) }
  }, [onCancel])

  return (
    <div
      className={css.backdrop}
      role="presentation"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onCancel() }}
    >
      <div className={css.panel} role="dialog" aria-modal="true" aria-label={t('nav.openWorkspace')}>
        <header className={css.head}>
          <IconFolderOpenOutline16 />
          <span className={css.title}>{t('nav.openWorkspace')}</span>
          <IconButton label={t('common.close')} onClick={onCancel}>
            <IconCloseOutline16 />
          </IconButton>
        </header>

        {listing === undefined
          ? null
          : (
            <div className={css.crumbs}>
              {listing.crumbs.map(crumb => (
                <button key={crumb.path} type="button" className={css.crumb} onClick={() => { browse(crumb.path) }}>
                  {crumb.name}
                </button>
              ))}
            </div>
          )}

        <div className={css.list}>
          {loading ? <div className={css.empty}><Spinner /></div> : null}
          {!loading && listing !== undefined && listing.entries.length === 0
            ? <div className={css.empty}>{t('settings.empty')}</div>
            : null}
          {listing?.entries.map(entry => (
            <button
              key={entry.path}
              type="button"
              className={`${css.row} ${entry.hidden ? css.rowHidden : ''}`}
              onClick={() => { browse(entry.path) }}
              title={entry.path}
            >
              <IconFolderClose16 />
              <span className={css.name}>{entry.name}</span>
            </button>
          ))}
        </div>

        {error === undefined ? null : <div className={css.error}>{error}</div>}

        <footer className={css.foot}>
          <span className={css.path} title={target}><bdi>{target ?? ''}</bdi></span>
          <Button onClick={onCancel}>{t('common.cancel')}</Button>
          <Button
            primary
            disabled={target === undefined}
            onClick={() => { if (target !== undefined) onPicked(target) }}
          >
            {t('learning.open')}
          </Button>
        </footer>
      </div>
    </div>
  )
}
