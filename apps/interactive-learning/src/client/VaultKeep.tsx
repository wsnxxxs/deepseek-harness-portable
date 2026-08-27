/**
 * 「留到库里」 — the in-conversation half of the vault.
 *
 * The panel solves three of the four pain points on its own, but the fourth —
 * "notes are lost when the session closes" — needs a capture point where the
 * loss happens, which is the message. This entry sits in
 * `conversation.chat.assistant-actions`, the per-message action strip, so
 * keeping an explanation is one click from where a person read it.
 *
 * The sheet offers exactly two destinations. 「存为笔记」 keeps prose as prose;
 * 「存为待确认概念卡」 keeps it as a draft aimed at a concept. A concept card
 * is created only after the learner has demonstrated that concept in a
 * teaching session, so the sheet explains that boundary without offering a
 * non-actionable control.
 *
 * Only assistant messages reach this slot, so the text kept here is always the
 * model's explanation — never the learner's own words, which have their own
 * road into the vault through the evidence gate.
 * @module @dsh-portable/interactive-learning/src/client/VaultKeep
 */

import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { IconListPenOutline16, Tooltip, useAnchoredPosition } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { learningScope } from './tokens.ts'
import css from './VaultView.module.css'

/** Business face supplied by the slot registration; the same one the panel takes. */
export interface VaultKeepInjected {
  cwd: string | undefined
  call: (endpoint: string, payload: Record<string, unknown>) => Promise<unknown>
}

type VaultKeepProps = PropsRuntime<'conversation.chat.assistant-actions'>
  & InjectFace<VaultKeepInjected>
  & PropsLocale<'interactive-learning'>

/** Longest prefill; a whole long answer is a note nobody will ever reread. */
const MAX_PREFILL_CHARS = 6_000

/** Longest title derived from the message's own first line. */
const MAX_TITLE_CHARS = 60

/** Safe distance kept between the floating sheet and the viewport edges. */
const PANEL_MARGIN = 12

/** Distance between the keep trigger and its floating sheet. */
const PANEL_GAP = 4

/** Hide the first paint while the anchored-position hook measures the sheet. */
const MEASURE_STYLE: CSSProperties = { visibility: 'hidden', left: 0, top: 0 }

interface TextBlock { kind: string; text?: string }
interface MessageNode { kind: string; messageId?: string; blocks?: readonly TextBlock[] }

/**
 * The message's prose, reasoning excluded.
 *
 * Reasoning blocks are deliberately dropped. They are the model's working, not
 * its answer, and a note that opens with a chain of thought the learner never
 * read is worse than no note.
 */
export function messageText(nodes: readonly unknown[], messageId: string): string {
  const node = (nodes as readonly MessageNode[])
    .find(entry => entry.kind === 'assistant' && entry.messageId === messageId)
  if (node?.blocks === undefined) return ''
  return node.blocks
    .filter(block => block.kind === 'text')
    .map(block => block.text ?? '')
    .join('\n\n')
    .trim()
    .slice(0, MAX_PREFILL_CHARS)
}

/** A title from the first line of prose, so the sheet opens with something usable. */
export function titleFrom(text: string): string {
  const line = text
    .split('\n')
    .map(value => value.replace(/^#{1,6}\s+/u, '').replace(/[*_`>]/gu, '').trim())
    .find(value => value !== '') ?? ''
  return line.length > MAX_TITLE_CHARS ? `${line.slice(0, MAX_TITLE_CHARS)}…` : line
}

interface SavedNote { noteSlug: string; path: string; kind: string }

/**
 * The action and its sheet.
 *
 * Registered only in learning sessions — the same gate that decides the 学习库
 * tab decides this button, because an action that writes into a topic vault is
 * meaningless in a session that has no vault to write into.
 */
export function VaultKeepAction({ messageId, useSession, sessionId, cwd, call, t }: VaultKeepProps) {
  const text = useSession(snapshot => messageText(snapshot.nodes, messageId as unknown as string))
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<SavedNote | undefined>(undefined)
  const [failure, setFailure] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const suggested = useMemo(() => titleFrom(text), [text])

  const position = useAnchoredPosition({
    open,
    anchorRef: triggerRef,
    panelRef,
    gap: PANEL_GAP,
    margin: PANEL_MARGIN,
  })

  const start = useCallback(() => {
    setTitle(suggested)
    setBody(text)
    setSaved(undefined)
    setFailure('')
    setOpen(true)
  }, [suggested, text])

  const keep = useCallback((kind: 'note' | 'pending-concept') => {
    if (cwd === undefined || cwd === '') { setFailure(t('vaultKeepNoVault')); return }
    if (body.trim() === '') { setFailure(t('vaultKeepFailed')); return }
    setBusy(true)
    void (async () => {
      try {
        const answer = await call('notes/save', {
          cwd,
          title,
          body,
          kind,
          sessionId: String(sessionId),
          messageId: String(messageId),
        })
        const value = typeof answer === 'object' && answer !== null && (answer as { ok?: unknown }).ok === true
          ? (answer as { value?: { status?: string; note?: SavedNote } }).value
          : undefined
        if (value?.status === 'ok' && value.note !== undefined) {
          setSaved(value.note)
          return
        }
        // `no-vault` is the honest, common failure here: the learner has not
        // attached any material yet, so there is no folder to keep anything in.
        setFailure(value?.status === 'no-vault' ? t('vaultKeepNoVault') : t('vaultKeepFailed'))
      } catch (cause) {
        setFailure(cause instanceof Error ? cause.message : t('vaultKeepFailed'))
      } finally {
        setBusy(false)
      }
    })()
  }, [body, call, cwd, messageId, sessionId, t, title])

  if (text === '') return null

  return (
    <>
      <Tooltip label={t('vaultKeepHint')} side="bottom">
        <button
          ref={triggerRef}
          type="button"
          className={css.keepAction}
          onClick={() => { if (open) setOpen(false); else start() }}
          aria-label={t('vaultKeep')}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <IconListPenOutline16 />
        </button>
      </Tooltip>
      {open && createPortal(
        <div
          {...learningScope}
          ref={panelRef}
          className={css.keepSheet}
          role="dialog"
          aria-label={t('vaultKeepTitle')}
          style={position ?? MEASURE_STYLE}
        >
          <header className={css.cardHead}>
            <h3 className={css.cardTitle}>{t('vaultKeepTitle')}</h3>
            <span className={css.metaRight}>
              <button type="button" className={css.button} onClick={() => { setOpen(false) }}>
                {t('vaultKeepClose')}
              </button>
            </span>
          </header>

          {saved === undefined
            ? (
              <>
                <input
                  type="text"
                  className={css.keepTitleInput}
                  value={title}
                  placeholder={t('vaultNoteTitlePlaceholder')}
                  aria-label={t('vaultNoteTitlePlaceholder')}
                  onChange={(event) => { setTitle(event.target.value) }}
                />
                <textarea
                  className={css.keepEditor}
                  value={body}
                  rows={10}
                  aria-label={t('vaultKeepBody')}
                  onChange={(event) => { setBody(event.target.value) }}
                />
                <div className={css.actions}>
                  <button
                    type="button"
                    className={css.buttonPrimary}
                    disabled={busy}
                    onClick={() => { keep('note') }}
                  >
                    {busy ? t('vaultSaving') : t('vaultKeepAsNote')}
                  </button>
                  <button
                    type="button"
                    className={css.button}
                    disabled={busy}
                    onClick={() => { keep('pending-concept') }}
                  >
                    {t('vaultKeepAsPending')}
                  </button>
                </div>
                <p className={css.hint}>{t('vaultKeepAsCardHint')}</p>
              </>
            )
            : (
              <>
                <p className={css.notice}>
                  {saved.kind === 'pending-concept' ? t('vaultKeptAsPending') : t('vaultKeptAsNote')}
                </p>
                <code className={css.path}>{saved.path}</code>
                <p className={css.hint}>{t('vaultKeptWhere')}</p>
              </>
            )}

          {failure !== '' && <p className={css.staleNote}>{failure}</p>}
        </div>,
        document.body,
      )}
    </>
  )
}
