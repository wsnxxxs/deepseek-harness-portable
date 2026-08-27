/**
 * The vault panel's notes section, inbox included.
 *
 * Two groups, one list. Pending drafts lead because they are the only rows in
 * here that are waiting on something; plain notes follow. Both are the same
 * kind of file and get the same editor — one textarea over the whole Markdown,
 * because a note has no derived fields to protect and no schedule to corrupt.
 *
 * The one asymmetry is the promote button, and it is the design's rule made
 * visible: on a blocked draft it renders DISABLED and labelled 「本轮未满足」,
 * with the reason stated beside it rather than hidden behind a tooltip. A
 * disabled control that explains itself teaches the gate; a control that is
 * simply absent leaves a person guessing why their note never became a card.
 * @module @dsh-portable/interactive-learning/src/client/VaultNotes
 */

import { useCallback, useEffect, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { Ask, Concept } from './VaultConcepts.tsx'
import css from './VaultView.module.css'

type Translate = PropsLocale<'interactive-learning'>['t']

/** One note, as `vault-notes.ts` projects it. */
export interface Note {
  noteSlug: string
  kind: 'note' | 'pending-concept'
  title: string
  body: string
  excerpt: string
  path: string
  conceptSlug: string | null
  gate: 'blocked' | 'ready' | null
  sourceSessionId: string | null
  sourceMessageId: string | null
  promotedTo: string | null
  createdAt: string
  updatedAt: string
}

export interface NoteList { status: string; notes: Note[]; pending: number; blocked: number }

/** Rows the panel groups by, in the order a person should meet them. */
const GROUPS = [
  { id: 'blocked', title: 'vaultNotesPendingTitle', hint: 'vaultNotesPendingHint' },
  { id: 'ready', title: 'vaultNotesReadyTitle', hint: 'vaultNotesReadyHint' },
  { id: 'plain', title: 'vaultNotesPlainTitle', hint: '' },
] as const

function groupOf(note: Note): typeof GROUPS[number]['id'] {
  return note.gate === 'blocked' ? 'blocked' : note.gate === 'ready' ? 'ready' : 'plain'
}

/**
 * One note row, expandable into its editor.
 *
 * `busy` gates every write rather than each button gating itself: two writes to
 * one file from one row is never a thing a person meant to do.
 */
function NoteCard({
  note, ask, onChanged, onRemoved, onConcept, t,
}: {
  note: Note
  ask: Ask
  onChanged: (next: Note) => void
  onRemoved: (noteSlug: string) => void
  onConcept: (next: Concept) => void
  t: Translate
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const [target, setTarget] = useState(note.conceptSlug ?? '')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [failure, setFailure] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setDraft(note.body)
    setTarget(note.conceptSlug ?? '')
  }, [note.body, note.conceptSlug])

  const save = useCallback(() => {
    if (note.kind === 'pending-concept' && target.trim() === '') {
      setFailure(t('vaultKeepFailed'))
      return
    }
    setFailure('')
    setNotice('')
    setBusy(true)
    void (async () => {
      try {
        const answer = await ask<{ status: string; note?: Note }>('notes/save', {
          noteSlug: note.noteSlug,
          body: draft,
          ...(note.kind === 'pending-concept' ? { conceptSlug: target } : {}),
        })
        if (answer?.status === 'ok' && answer.note !== undefined) {
          onChanged(answer.note)
          setEditing(false)
        } else {
          setFailure(t('vaultKeepFailed'))
        }
      } catch {
        setFailure(t('vaultKeepFailed'))
      } finally {
        setBusy(false)
      }
    })()
  }, [ask, draft, note.kind, note.noteSlug, onChanged, t, target])

  const promote = useCallback(() => {
    setFailure('')
    setNotice('')
    setBusy(true)
    void (async () => {
      try {
        const answer = await ask<{ status: string; note?: Note; concept?: Concept }>('notes/promote', {
          noteSlug: note.noteSlug,
        })
        if (answer?.status === 'ok' && answer.note !== undefined) {
          onChanged(answer.note)
          if (answer.concept !== undefined) onConcept(answer.concept)
          setNotice(t('vaultNotePromoted', { concept: answer.concept?.label ?? '' }))
          return
        }
        // The host answers `gate-blocked` with the note attached so this line
        // can name the concept that is still missing a card.
        if (answer?.status === 'gate-blocked') {
          setNotice(t('vaultNoteBlocked', { concept: answer.note?.conceptSlug ?? '' }))
          return
        }
        setFailure(t('vaultKeepFailed'))
      } catch {
        setFailure(t('vaultKeepFailed'))
      } finally {
        setBusy(false)
      }
    })()
  }, [ask, note.noteSlug, onChanged, onConcept, t])

  const remove = useCallback(() => {
    setBusy(true)
    void (async () => {
      try {
        const answer = await ask<{ status: string }>('notes/delete', { noteSlug: note.noteSlug })
        if (answer?.status === 'ok') onRemoved(note.noteSlug)
      } finally {
        setBusy(false)
      }
    })()
  }, [ask, note.noteSlug, onRemoved])

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <h3 className={css.cardTitle}>{note.title}</h3>
        <span className={css.metaRight}>
          <code className={css.path}>{note.path}</code>
        </span>
      </header>

      <ul className={css.counts}>
        {note.gate === 'blocked' && <li className={css.countWarn}>{t('vaultNoteGateBlocked')}</li>}
        {note.gate === 'ready' && <li className={css.masteryTransfer}>{t('vaultNoteGateReady')}</li>}
        {note.conceptSlug !== null && (
          <li className={css.chipAnchor}>{t('vaultNoteAimedAt', { concept: note.conceptSlug })}</li>
        )}
        {note.promotedTo !== null && (
          <li className={css.count}>{t('vaultNotePromotedTo', { concept: note.promotedTo })}</li>
        )}
        {note.sourceMessageId !== null && <li className={css.count}>{t('vaultNoteFromMessage')}</li>}
        <li className={css.count}>{t('vaultNoteUpdated', { date: note.updatedAt.slice(0, 10) })}</li>
      </ul>

      {editing
        ? (
          <>
            <textarea
              className={css.editor}
              value={draft}
              rows={Math.min(28, Math.max(8, draft.split('\n').length + 2))}
              aria-label={t('vaultEdit')}
              onChange={(event) => { setDraft(event.target.value) }}
            />
            {note.kind === 'pending-concept' && (
              <input
                type="text"
                className={css.search}
                value={target}
                placeholder={note.conceptSlug ?? ''}
                aria-label={t('vaultNoteAimedAt', { concept: note.conceptSlug ?? '' })}
                onChange={(event) => { setTarget(event.target.value) }}
              />
            )}
            <div className={css.actions}>
              <button type="button" className={css.buttonPrimary} disabled={busy} onClick={save}>
                {busy ? t('vaultSaving') : t('vaultSave')}
              </button>
              <button
                type="button"
                className={css.button}
                onClick={() => {
                  setDraft(note.body)
                  setTarget(note.conceptSlug ?? '')
                  setFailure('')
                  setEditing(false)
                }}
              >
                {t('vaultCancel')}
              </button>
            </div>
          </>
        )
        : (
          <>
            {note.excerpt !== '' && <p className={css.noteExcerpt}>{note.excerpt}</p>}
            <div className={css.actions}>
              <button type="button" className={css.button} onClick={() => { setEditing(true) }}>
                {t('vaultEdit')}
              </button>
              {note.kind === 'pending-concept' && (
                <button
                  type="button"
                  className={note.gate === 'ready' ? css.buttonPrimary : css.button}
                  disabled={busy || note.gate !== 'ready'}
                  title={t('vaultNotePromoteHint')}
                  onClick={promote}
                >
                  {note.gate === 'ready' ? t('vaultNotePromote') : t('vaultNoteGateUnmet')}
                </button>
              )}
              {confirming
                ? (
                  <>
                    <button type="button" className={css.buttonCorrect} disabled={busy} onClick={remove}>
                      {t('vaultNoteDeleteConfirm')}
                    </button>
                    <button
                      type="button"
                      className={css.button}
                      onClick={() => { setConfirming(false) }}
                    >
                      {t('vaultCancel')}
                    </button>
                  </>
                )
                : (
                  <button
                    type="button"
                    className={css.buttonCorrect}
                    disabled={busy}
                    onClick={() => { setConfirming(true) }}
                  >
                    {t('vaultNoteDelete')}
                  </button>
                )}
            </div>
            {note.gate === 'blocked' && <p className={css.hint}>{t('vaultNotePromoteHint')}</p>}
          </>
        )}

      {notice !== '' && <p className={css.notice}>{notice}</p>}
      {failure !== '' && <p className={css.staleNote}>{failure}</p>}
    </section>
  )
}

/**
 * The notes section.
 *
 * `onConcept` is threaded through because promoting rewrites a concept card:
 * the panel's concepts list holds that card too, and letting it go stale would
 * mean the same file showing two different bodies in two tabs.
 */
export function NotesSection({
  list, ask, onChanged, onRemoved, onCreated, onConcept, t,
}: {
  list: NoteList | undefined
  ask: Ask
  onChanged: (next: Note) => void
  onRemoved: (noteSlug: string) => void
  onCreated: (next: Note) => void
  onConcept: (next: Concept) => void
  t: Translate
}) {
  const [composing, setComposing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState('')

  const create = useCallback(() => {
    if (title.trim() === '' && body.trim() === '') {
      setFailure(t('vaultKeepFailed'))
      return
    }
    setFailure('')
    setBusy(true)
    void (async () => {
      try {
        const answer = await ask<{ status: string; note?: Note }>('notes/save', { title, body })
        if (answer?.status === 'ok' && answer.note !== undefined) {
          onCreated(answer.note)
          setTitle('')
          setBody('')
          setComposing(false)
        } else {
          setFailure(t('vaultKeepFailed'))
        }
      } catch {
        setFailure(t('vaultKeepFailed'))
      } finally {
        setBusy(false)
      }
    })()
  }, [ask, body, onCreated, t, title])

  if (list === undefined) return <div className={css.state}>{t('vaultLoading')}</div>

  const composer = composing
    ? (
      <section className={css.card}>
        <input
          type="text"
          className={css.search}
          value={title}
          placeholder={t('vaultNoteTitlePlaceholder')}
          aria-label={t('vaultNoteTitlePlaceholder')}
          onChange={(event) => { setTitle(event.target.value) }}
        />
        <textarea
          className={css.editor}
          value={body}
          rows={8}
          placeholder={t('vaultNoteBodyPlaceholder')}
          aria-label={t('vaultNoteBodyPlaceholder')}
          onChange={(event) => { setBody(event.target.value) }}
        />
        <div className={css.actions}>
          <button type="button" className={css.buttonPrimary} disabled={busy} onClick={create}>
            {busy ? t('vaultSaving') : t('vaultSave')}
          </button>
          <button type="button" className={css.button} onClick={() => { setComposing(false) }}>
            {t('vaultCancel')}
          </button>
        </div>
        {failure !== '' && <p className={css.staleNote}>{failure}</p>}
      </section>
    )
    : (
      <div className={css.actions}>
        <button
          type="button"
          className={css.button}
          onClick={() => { setFailure(''); setComposing(true) }}
        >
          {t('vaultNoteNew')}
        </button>
      </div>
    )

  if (list.notes.length === 0) {
    return (
      <div className={css.sources}>
        <div className={css.state}>
          <p className={css.stateTitle}>{t('vaultNotesEmptyTitle')}</p>
          <p className={css.stateBody}>{t('vaultNotesEmptyBody')}</p>
        </div>
        {composer}
      </div>
    )
  }

  return (
    <div className={css.sources}>
      {composer}
      {GROUPS.map((group) => {
        const rows = list.notes.filter(note => groupOf(note) === group.id)
        if (rows.length === 0) return null
        return (
          <div key={group.id} className={css.group}>
            <p className={css.groupTitle}>
              {t(group.title)}
              <span className={css.groupCount}>{rows.length}</span>
            </p>
            {group.hint !== '' && <p className={css.hint}>{t(group.hint)}</p>}
            {rows.map(note => (
              <NoteCard
                key={note.noteSlug}
                note={note}
                ask={ask}
                onChanged={onChanged}
                onRemoved={onRemoved}
                onConcept={onConcept}
                t={t}
              />
            ))}
          </div>
        )
      })}
      <p className={css.local}>{t('vaultLocalOnly')}</p>
    </div>
  )
}
