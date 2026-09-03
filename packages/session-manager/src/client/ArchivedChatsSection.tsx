/**
 * Archived-conversation management as a page of the official settings panel.
 *
 * The official session row menu archives; until now nothing in that UI could
 * bring one back or remove it, so an archived conversation was reachable only
 * from the workbench. This section closes that: it is registered into
 * `settings.section`, reads the same registry-global archive set the sidebar
 * hides rows by, and routes restore and delete to the official Workspace and
 * Session controllers.
 *
 * It renders inside the official settings shell, so it uses that shell's theme
 * aliases and the harness's own primitives rather than any surface's token
 * scope — the same choice `@dsh-portable/ui-mode` makes for the interface
 * switch. The state fold behind it is shared with the workbench through
 * {@link useArchivedChats}.
 * @module @dsh-portable/session-manager/client/ArchivedChatsSection
 */

import type { ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { ArchiveActions } from './archive.ts'
import { useArchivedChats } from './archive.ts'
import css from './ArchivedChatsSection.module.css'

/** Registration-side operations, bound to the official services by the plugin body. */
export interface ArchivedChatsInjected extends ArchiveActions {
  /** Open a restored session and leave settings for it. */
  readonly open: (id: Parameters<ArchiveActions['restore']>[0]) => void
  /** Drop the current selection after deleting the session it pointed at. */
  readonly clear: () => void
}

export type ArchivedChatsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'sessionManager'>
  & InjectFace<ArchivedChatsInjected>

/** The archive page, one row per archived conversation. */
export function ArchivedChatsSection(props: ArchivedChatsSectionProps): ReactNode {
  const sessions = props.useSessions(state => state)
  const workspaces = props.useWorkspaces(state => state)
  const { t, close } = props

  const model = useArchivedChats(sessions, workspaces, {
    // Restoring is the one flow that leaves settings: the point of restoring a
    // conversation is to continue it, and the sidebar behind the panel is not
    // visible while the panel is open.
    restore: async (id) => {
      await props.restore(id)
      if (sessions.byId[id] !== undefined) {
        props.open(id)
        close()
      }
    },
    remove: async (id) => {
      await props.remove(id)
      if (sessions.current === id) props.clear()
    },
  })

  return (
    <section className={css.root}>
      <h2 className={css.title}>{t('archive.title')}</h2>
      <p className={css.lead}>{t('archive.body')}</p>
      {model.loading
        ? null
        : model.rows.length === 0
          ? <div className={css.empty}>{t('archive.empty')}</div>
          : (
            <ul className={css.list}>
              {model.rows.map(session => (
                <li className={css.row} key={session.id}>
                  <div className={css.rowText}>
                    <span className={css.rowTitle}>{session.displayTitle}</span>
                    {session.cwd === undefined ? null : <span className={css.rowBody}>{session.cwd}</span>}
                  </div>
                  <div className={css.rowActions}>
                    <Button
                      size="sm"
                      disabled={model.busy}
                      onClick={() => { model.restore(session.id) }}
                    >
                      {model.busyId === session.id ? t('archive.working') : t('archive.restore')}
                    </Button>
                    <button
                      type="button"
                      className={css.danger}
                      disabled={model.busy}
                      onClick={() => { model.requestDelete(session) }}
                    >
                      {t('archive.delete')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      {model.error === undefined ? null : <div className={css.error} role="alert">{model.error}</div>}
      <Modal
        open={model.deleteTarget !== undefined}
        onClose={model.cancelDelete}
        title={t('archive.deleteTitle')}
        closeLabel={t('archive.close')}
        description={t('archive.deleteBody')}
        footer={(
          <>
            <Button disabled={model.busy} onClick={model.cancelDelete}>{t('archive.cancel')}</Button>
            <button type="button" className={css.danger} disabled={model.busy} onClick={model.confirmDelete}>
              {model.busy ? t('archive.working') : t('archive.delete')}
            </button>
          </>
        )}
      >
        <div className={css.rowTitle}>{model.deleteTarget?.displayTitle}</div>
      </Modal>
    </section>
  )
}
