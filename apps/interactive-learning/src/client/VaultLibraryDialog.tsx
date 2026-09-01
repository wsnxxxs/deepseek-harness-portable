/**
 * Shared external library dialog.
 *
 * The official sidebar entry and DCode's library command both open the same
 * dialog. Keeping the shell and topic switcher here means a layout change is
 * made once for both front ends; VaultLibrary remains the single owner of the
 * material, notes, concept and review panes inside it.
 * @module @dsh-portable/interactive-learning/src/client/VaultLibraryDialog
 */

import { createPortal } from 'react-dom'
import { useEffect, type ReactNode } from 'react'
import { IconBrowseOutline16, IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { learningScope } from './tokens.ts'
import { VaultLibrary, type VaultLibraryProps } from './VaultView.tsx'
import css from './VaultView.module.css'

/** The small amount of topic data needed by the shared dialog rail. */
export interface VaultLibraryTopic {
  readonly cwd: string
  readonly title: string
  readonly due: number
}

/** Props shared by the official sidebar and DCode's library launcher. */
export interface VaultLibraryDialogProps {
  readonly open: boolean
  readonly topics: readonly VaultLibraryTopic[]
  readonly selectedCwd?: string
  readonly call?: VaultLibraryProps['call']
  readonly t: VaultLibraryProps['t']
  /** Header fallback used while the roster is loading or empty. */
  readonly title?: string
  readonly onSelectCwd?: (cwd: string) => void
  readonly onClose: () => void
  /** Optional content for loading, empty and error states. */
  readonly content?: ReactNode
}

function TopicNavigation({
  topics, selectedCwd, onSelectCwd, t,
}: {
  topics: readonly VaultLibraryTopic[]
  selectedCwd: string
  onSelectCwd: (cwd: string) => void
  t: VaultLibraryProps['t']
}): ReactNode {
  if (topics.length < 2) return null
  return (
    <div className={css.libraryTopicGroup}>
      <p className={css.libraryTopicHeading}>{t('vaultRosterTitle')}</p>
      <ul className={css.libraryTopicList}>
        {topics.map(topic => (
          <li key={topic.cwd}>
            <button
              type="button"
              className={topic.cwd === selectedCwd ? css.libraryTopicOn : css.libraryTopic}
              aria-current={topic.cwd === selectedCwd ? 'page' : undefined}
              onClick={() => { onSelectCwd(topic.cwd) }}
            >
              <span className={css.libraryTopicName}>{topic.title}</span>
              {topic.due > 0 && <span className={css.railDue}>{String(topic.due)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Render the common settings-style library card through a document portal. */
export function VaultLibraryDialog({
  open, topics, selectedCwd, call, t, title, onSelectCwd, onClose, content,
}: VaultLibraryDialogProps): ReactNode {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [onClose, open])

  if (!open || typeof document === 'undefined') return null

  const selected = topics.find(topic => topic.cwd === selectedCwd) ?? topics[0]
  const headerTitle = selected?.title ?? title ?? t('vaultRosterTitle')
  const library = content !== undefined
    ? content
    : selected === undefined || call === undefined
      ? null
      : (
        <VaultLibrary
          cwd={selected.cwd}
          call={call}
          t={t}
          embedded
          onClose={onClose}
          topics={onSelectCwd === undefined
            ? undefined
            : (
              <TopicNavigation
                topics={topics}
                selectedCwd={selected.cwd}
                onSelectCwd={onSelectCwd}
                t={t}
              />
            )}
        />
      )

  return createPortal(
    <div {...learningScope} className={css.libraryOverlay} role="presentation">
      <div className={css.libraryMask} aria-hidden="true" onClick={onClose} />
      <div className={css.libraryPanel} role="dialog" aria-modal="true" aria-label={title ?? t('vaultRosterTitle')}>
        <section className={css.libraryMain}>
          <div className={css.libraryHeader}>
            <IconBrowseOutline16 size={16} />
            <span className={css.libraryHeaderTitle}>{headerTitle}</span>
            {topics.length > 0 && (
              <span className={css.libraryNavMeta}>
                {t('vaultLibraryTopics', { count: String(topics.length) })}
              </span>
            )}
            <button
              type="button"
              className={css.libraryClose}
              aria-label={t('vaultKeepClose')}
              onClick={onClose}
            >
              <IconCloseOutline16 size={14} />
            </button>
          </div>
          <div className={css.libraryScroll}>{library}</div>
        </section>
      </div>
    </div>,
    document.body,
  )
}
