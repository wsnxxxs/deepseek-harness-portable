/**
 * The conversation column.
 *
 * Nodes come from the Chat target the official UI assembles — the very same
 * `ConversationNode` stream, projections and streaming partial — so a session
 * opened in one surface and continued in the other shows one history. What
 * differs is the presentation: a compact tool card per call, a file-change
 * summary closing each turn, and a reading column instead of a full-width
 * flow.
 * @module @dsh-portable/dcode-ui/client/chat/Transcript
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import {
  IconBranchOutline16, IconCheckOutline16, IconCloseFill14, IconCloseOutline16,
  IconDislikeOutline16, IconDownloadOutline16, IconEditOutline16, IconLikeOutline16,
  IconPaperclipOutline16, IconSendOutline14, IconThinkOutline14, IconTrashOutline16,
  IconWarningOutline16, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AssistantBlock, AssistantMessageNode, ConversationNode, ToolCallBlock,
} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {
  PendingSubmission, SessionFace, SessionSnapshot,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { FileAttachmentRef, ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useChatSnapshot, useSessionSnapshot } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import { Button, CopyButton, Spinner } from '../shell/ui.tsx'
import { useModalFocus } from '../shell/use-modal-focus.ts'
import { ToolCard } from './ToolCard.tsx'
import { FileChanges } from './FileChanges.tsx'
import { changedPaths, messageText, splitTurns } from './tools.ts'
import type { DcodeKey } from '../locales.ts'
import css from './Transcript.module.css'

/** Props of the conversation column. */
export interface TranscriptProps {
  readonly navigation: NavigationStore
  readonly sessionId: SessionId | undefined
  readonly cwd: string | undefined
  /**
   * The frame's blank phase. Owned above so the greeting here and the
   * composer's centring below cannot disagree about which phase they are in.
   */
  readonly blank: boolean
}

type FeedbackRating = 'positive' | 'negative'

interface FeedbackItem {
  readonly messageId: string
  readonly rating: FeedbackRating
  readonly version: string
}

interface FeedbackFailure {
  readonly code?: string
  readonly message?: string
}

type FeedbackBusinessResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: FeedbackFailure }

type FeedbackCarrier<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: FeedbackFailure }

interface MessageFeedbackRemote {
  list(request: { sessionId: SessionId }): Promise<FeedbackCarrier<FeedbackBusinessResult<{ items: readonly FeedbackItem[] }>>>
  put(request: {
    sessionId: SessionId
    messageId: string
    rating: FeedbackRating
    ifVersion: string | null
  }): Promise<FeedbackCarrier<FeedbackBusinessResult<FeedbackItem>>>
  delete(request: {
    sessionId: SessionId
    messageId: string
    ifVersion: string
  }): Promise<FeedbackCarrier<FeedbackBusinessResult<{ absent: true }>>>
}

interface MessageFeedbackState {
  readonly enabled: boolean
  readonly items: ReadonlyMap<string, FeedbackItem>
  readonly pending: ReadonlySet<string>
  readonly error: string | undefined
  toggle(messageId: string, rating: FeedbackRating): Promise<string | undefined>
}

function feedbackError(error: FeedbackFailure | undefined): Error {
  return new Error(error?.message ?? error?.code ?? 'feedback request failed')
}

/** Read and mutate the durable feedback sidecar shared by assistant rows. */
function useMessageFeedback(sessionId: SessionId | undefined): MessageFeedbackState {
  const runtime = useRuntime()
  const remote = (runtime.remote as unknown as { messageFeedback?: MessageFeedbackRemote }).messageFeedback
  const [items, setItems] = useState<ReadonlyMap<string, FeedbackItem>>(() => new Map())
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set())
  const [error, setError] = useState<string | undefined>(undefined)
  const itemsRef = useRef<ReadonlyMap<string, FeedbackItem>>(new Map())
  const pendingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let live = true
    const empty = new Map<string, FeedbackItem>()
    itemsRef.current = empty
    setItems(empty)
    setError(undefined)
    if (sessionId === undefined || remote === undefined) return () => { live = false }
    void remote.list({ sessionId }).then((carried) => {
      if (!live) return
      if (!carried.ok) throw feedbackError(carried.error)
      const result = carried.value
      if (!result.ok) throw feedbackError(result.error)
      const next = new Map(result.value.items.map(item => [item.messageId, item]))
      itemsRef.current = next
      setItems(next)
    }).catch((cause: unknown) => {
      if (!live) return
      setError(cause instanceof Error ? cause.message : String(cause))
    })
    return () => { live = false }
  }, [remote, sessionId])

  const toggle = useCallback(async (messageId: string, rating: FeedbackRating): Promise<string | undefined> => {
    if (sessionId === undefined || remote === undefined || pendingRef.current.has(messageId)) return undefined
    pendingRef.current.add(messageId)
    setPending(new Set(pendingRef.current))
    setError(undefined)
    const current = itemsRef.current.get(messageId)
    try {
      if (current?.rating === rating) {
        const carried = await remote.delete({ sessionId, messageId, ifVersion: current.version })
        if (!carried.ok) throw feedbackError(carried.error)
        if (!carried.value.ok) throw feedbackError(carried.value.error)
        const next = new Map(itemsRef.current)
        next.delete(messageId)
        itemsRef.current = next
        setItems(next)
      } else {
        const carried = await remote.put({
          sessionId,
          messageId,
          rating,
          ifVersion: current?.version ?? null,
        })
        if (!carried.ok) throw feedbackError(carried.error)
        if (!carried.value.ok) throw feedbackError(carried.value.error)
        const next = new Map(itemsRef.current)
        next.set(messageId, carried.value.value)
        itemsRef.current = next
        setItems(next)
      }
      return undefined
    } catch (cause: unknown) {
      return cause instanceof Error ? cause.message : String(cause)
    } finally {
      pendingRef.current.delete(messageId)
      setPending(new Set(pendingRef.current))
    }
  }, [remote, sessionId])

  return { enabled: remote !== undefined, items, pending, error, toggle }
}

/** Click-to-expand image viewer for durable and local message images. */
function ImageLightbox(props: { src: string; alt: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const close = useCallback(() => { setOpen(false) }, [])
  useModalFocus(open, panelRef, { onClose: close })
  return (
    <>
      <button
        type="button"
        className={css.imageButton}
        aria-label={t('chat.image.open')}
        onClick={() => { setOpen(true) }}
      >
        <img className={css.messageImage} src={props.src} alt={props.alt} />
      </button>
      {open
        ? createPortal(
          <div
            className={css.lightboxBackdrop}
            onPointerDown={event => { if (event.target === event.currentTarget) close() }}
          >
            <div
              ref={panelRef}
              className={css.lightbox}
              role="dialog"
              aria-modal="true"
              aria-label={props.alt}
              tabIndex={-1}
            >
              <button type="button" className={css.lightboxClose} aria-label={t('chat.image.close')} onClick={close}>
                <IconCloseFill14 />
              </button>
              <img className={css.lightboxImage} src={props.src} alt={props.alt} />
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  )
}

/** Reasoning text, folded by default. */
function Reasoning({ text }: { text: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return (
    <div className={css.reasoning}>
      <button
        type="button"
        className={css.reasoningHead}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => { setOpen(value => !value) }}
      >
        <IconThinkOutline14 />
        {t('chat.reasoning')}
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div id={panelId} role="region">{text}</div> : null}
    </div>
  )
}

/** Session-authorized image display; the Conversation assembly owns its URL cache. */
function DurableImage(props: { sessionId: SessionId; attachment: ImageAttachmentRef }) {
  const runtime = useRuntime()
  const [src, setSrc] = useState(() => runtime.media?.peekImageUrl(props.sessionId, props.attachment))

  useEffect(() => {
    let live = true
    const media = runtime.media
    const cached = media?.peekImageUrl(props.sessionId, props.attachment)
    if (cached !== undefined) {
      setSrc(cached)
      return () => { live = false }
    }
    if (media === undefined) return () => { live = false }
    void media.imageUrl(props.sessionId, props.attachment).then(
      value => { if (live) setSrc(value) },
      () => undefined,
    )
    return () => { live = false }
  }, [props.attachment, props.sessionId, runtime])

  return src === undefined
    ? <span className={css.attachmentPlaceholder}>{props.attachment.name ?? 'image'}</span>
    : <ImageLightbox src={src} alt={props.attachment.name ?? 'image'} />
}

/** One durable file reference which can be downloaded from the same session. */
function DurableFile(props: { sessionId: SessionId; attachment: FileAttachmentRef }) {
  const runtime = useRuntime()
  const label = props.attachment.name ?? 'attachment'
  return (
    <button
      type="button"
      className={css.fileAttachment}
      title={label}
      onClick={() => { void runtime.media?.downloadFile(props.sessionId, props.attachment) }}
      disabled={runtime.media === undefined}
    >
      <IconPaperclipOutline16 />
      <span>{label}</span>
      <IconDownloadOutline16 />
    </button>
  )
}

type PreviewImage = PendingSubmission['images'][number]

/** Render message attachments without changing the DCode message layout. */
function MessageAttachments(props: {
  sessionId: SessionId
  content?: readonly unknown[]
  images?: readonly ImageAttachmentRef[]
  previews?: readonly PreviewImage[]
}) {
  const images = [...(props.images ?? [])]
  const files: FileAttachmentRef[] = []
  for (const block of props.content ?? []) {
    const candidate = block as { type?: unknown; attachment?: unknown }
    if (candidate.type === 'image' && candidate.attachment !== undefined) {
      images.push(candidate.attachment as ImageAttachmentRef)
    } else if (candidate.type === 'file' && candidate.attachment !== undefined) {
      files.push(candidate.attachment as FileAttachmentRef)
    }
  }
  if (images.length === 0 && files.length === 0 && (props.previews?.length ?? 0) === 0) return null
  return (
    <div className={css.messageAttachments}>
      {props.previews?.map((image, index) => (
        <ImageLightbox
          key={`${image.previewUrl}:${String(index)}`}
          src={image.previewUrl}
          alt={image.name ?? 'image'}
        />
      ))}
      {images.map((attachment, index) => (
        <DurableImage
          key={`${attachment.attachmentId}:${String(index)}`}
          sessionId={props.sessionId}
          attachment={attachment}
        />
      ))}
      {files.map((attachment, index) => (
        <DurableFile
          key={`${attachment.attachmentId}:${String(index)}`}
          sessionId={props.sessionId}
          attachment={attachment}
        />
      ))}
    </div>
  )
}

/** A user bubble can carry text, images, files, or an image-only prompt. */
function UserBubble(props: { sessionId: SessionId; content: readonly ContentBlock[]; className?: string }) {
  const text = messageText(props.content)
  return (
    <div className={`${css.user} ${props.className ?? ''}`}>
      {text === '' ? null : <div>{text}</div>}
      <MessageAttachments sessionId={props.sessionId} content={props.content} />
    </div>
  )
}

/** One assistant message's visible blocks. Tool calls render as their own cards. */
function AssistantBlocks(props: {
  sessionId: SessionId
  blocks: readonly AssistantBlock[]
  streaming: boolean
  labels: MarkdownLabels
}) {
  return (
    <div className={css.blockGap}>
      {props.blocks.map((block, index) => {
        if (block.kind === 'text') {
          return (
            <div className={css.assistant} key={index}>
              <MarkdownText text={block.text} streaming={props.streaming} labels={props.labels} />
            </div>
          )
        }
        if (block.kind === 'reasoning') return <Reasoning key={index} text={block.text} />
        if (block.kind === 'image') {
          return (
            <MessageAttachments
              key={index}
              sessionId={props.sessionId}
              images={[block.attachment]}
            />
          )
        }
        // Tool calls are rendered from the paired result nodes, which carry the
        // output; an unpaired call is covered by `runningCalls` below.
        return null
      })}
    </div>
  )
}

/** Token accounting shown under a finished assistant message. */
function Stats({ node }: { node: AssistantMessageNode }) {
  const t = useT()
  const usage = node.usage as { totalTokens?: number; total_tokens?: number } | undefined
  const total = usage?.totalTokens ?? usage?.total_tokens
  const model = node.provenance?.model
  if (total === undefined && model === undefined) return null
  return (
    <div className={css.stats} role="status" aria-live="polite">
      {model === undefined ? null : <span>{model}</span>}
      {total === undefined ? null : <span>{t('chat.tokens', { count: total })}</span>}
      {node.interrupted === true ? <span>{t('chat.interrupted')}</span> : null}
    </div>
  )
}

function assistantText(blocks: readonly AssistantBlock[]): string {
  return blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('')
}

/** Copy, feedback, and branch actions for one settled assistant answer. */
function AssistantActions(props: {
  sessionId: SessionId
  node: AssistantMessageNode
  feedback: MessageFeedbackState
}) {
  const runtime = useRuntime()
  const t = useT()
  const [branching, setBranching] = useState(false)
  const [branchError, setBranchError] = useState<string | undefined>(undefined)
  const [feedbackError, setFeedbackError] = useState<string | undefined>(undefined)
  const text = assistantText(props.node.blocks)
  const messageId = props.node.messageId === undefined ? undefined : String(props.node.messageId)
  const item = messageId === undefined ? undefined : props.feedback.items.get(messageId)
  const pending = messageId === undefined ? false : props.feedback.pending.has(messageId)

  const branch = useCallback(async () => {
    if (branching) return
    setBranching(true)
    setBranchError(undefined)
    try {
      const child = await runtime.sessions.fork({
        sessionId: props.sessionId,
        atSeq: props.node.seq,
        increaseTitle: true,
      })
      runtime.sessions.open(child)
    } catch (cause: unknown) {
      setBranchError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBranching(false)
    }
  }, [branching, props.node.seq, props.sessionId, runtime])

  const rate = useCallback((rating: FeedbackRating) => {
    if (messageId === undefined) return
    setFeedbackError(undefined)
    void props.feedback.toggle(messageId, rating).then((failure) => {
      if (failure !== undefined) setFeedbackError(failure)
    })
  }, [messageId, props.feedback])

  return (
    <div className={css.messageActions}>
      {text === '' ? null : (
        <CopyButton
          text={text}
          label={t('chat.message.copy')}
          copiedLabel={t('chat.message.copied')}
          className={css.messageAction}
        />
      )}
      {props.feedback.enabled && messageId !== undefined
        ? (
          <>
            <button
              type="button"
              className={`${css.messageAction} ${item?.rating === 'positive' ? css.messageActionActive : ''}`}
              aria-label={t('chat.feedback.positive')}
              aria-pressed={item?.rating === 'positive'}
              disabled={pending}
              onClick={() => { rate('positive') }}
            >
              <IconLikeOutline16 />
            </button>
            <button
              type="button"
              className={`${css.messageAction} ${item?.rating === 'negative' ? css.messageActionActive : ''}`}
              aria-label={t('chat.feedback.negative')}
              aria-pressed={item?.rating === 'negative'}
              disabled={pending}
              onClick={() => { rate('negative') }}
            >
              <IconDislikeOutline16 />
            </button>
          </>
        )
        : null}
      <button
        type="button"
        className={css.messageAction}
        aria-label={t('chat.message.branch')}
        disabled={branching}
        onClick={() => { void branch() }}
      >
        {branching ? <Spinner size="sm" /> : <IconBranchOutline16 />}
      </button>
      {branchError === undefined ? null : <span className={css.actionError} role="alert">{t('chat.message.branchFailed', { error: branchError })}</span>}
      {feedbackError === undefined ? null : <span className={css.actionError} role="alert">{t('chat.feedback.failed', { error: feedbackError })}</span>}
    </div>
  )
}

/** Render one conversation node. */
function Node(props: {
  sessionId: SessionId
  node: ConversationNode
  labels: MarkdownLabels
  onInspect: (callId: string) => void
  feedback: MessageFeedbackState
}) {
  const t = useT()
  const { node } = props
  switch (node.kind) {
    case 'user':
      return <UserBubble sessionId={props.sessionId} content={node.content} />
    case 'steering':
      return <UserBubble sessionId={props.sessionId} content={node.content} className={css.steering} />
    case 'assistant':
      return (
        <div>
          <AssistantBlocks sessionId={props.sessionId} blocks={node.blocks} streaming={false} labels={props.labels} />
          <AssistantActions sessionId={props.sessionId} node={node} feedback={props.feedback} />
          <Stats node={node} />
        </div>
      )
    case 'tool-result':
      return <ToolCard block={node as ToolCallBlock} onInspect={props.onInspect} />
    case 'command':
      return (
        <div className={css.notice}>
          <span>{t('chat.command')}</span>
          <code>/{node.name ?? '…'}{node.args === null || node.args === undefined ? '' : ` ${node.args}`}</code>
        </div>
      )
    case 'context':
      return (
        <div className={css.divider}>
          {t('chat.context')}
        </div>
      )
    case 'compaction':
      return <div className={css.divider}>{t('chat.compaction')}</div>
    case 'model-retry':
      return <div className={`${css.notice} ${css.noticeWarn}`}><IconWarningOutline16 />{t('chat.retry')}</div>
    case 'turn-max-tokens':
      return <div className={`${css.notice} ${css.noticeWarn}`}><IconWarningOutline16 />{t('chat.maxTokens')}</div>
    case 'turn-error':
      return (
        <div className={`${css.notice} ${css.noticeError}`} role="alert">
          <IconWarningOutline16 />
          {node.message === '' ? node.code ?? t('common.error') : node.message}
        </div>
      )
    default:
      return null
  }
}

/** Queue controls mirror the host queue verbs instead of treating queued text as static output. */
function QueuedMessageRow(props: {
  sessionId: SessionId
  item: SessionSnapshot['queue'][number]
  running: boolean
}) {
  const runtime = useRuntime()
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(props.item.text ?? props.item.preview)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const editable = props.item.text !== null

  useEffect(() => {
    if (!editing) setDraft(props.item.text ?? props.item.preview)
    if (!editable) setEditing(false)
  }, [editable, editing, props.item.preview, props.item.text])

  const apply = useCallback(async (action: Parameters<SessionFace['updateQueue']>[1]): Promise<void> => {
    const session = runtime.binding(props.sessionId)?.session
    if (session === undefined || busy) return
    setBusy(true)
    setError(undefined)
    try {
      const result = await session.updateQueue(props.item.id, action)
      if (!result.ok) throw new Error(result.error.message)
      if (action.kind === 'edit') setEditing(false)
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }, [busy, props.item.id, props.sessionId, runtime])

  return (
    <div className={`${css.user} ${css.steering} ${css.queueRow}`}>
      <span className={css.stats}>{t('chat.queued')}</span>
      {editing
        ? (
          <input
            className={css.queueEditor}
            value={draft}
            aria-label={t('chat.editQueued')}
            autoFocus
            onChange={event => { setDraft(event.target.value) }}
            onKeyDown={event => {
              if (event.key === 'Escape') setEditing(false)
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                if (draft.trim() !== '') void apply({ kind: 'edit', content: [{ type: 'text', text: draft.trim() }] })
              }
            }}
          />
        )
        : <span className={css.queuePreview}>{props.item.text ?? props.item.preview}</span>}
      <div className={css.queueActions}>
        {editing
          ? (
            <>
              <button
                type="button"
                className={css.queueAction}
                aria-label={t('chat.saveQueued')}
                disabled={busy || draft.trim() === ''}
                onClick={() => { void apply({ kind: 'edit', content: [{ type: 'text', text: draft.trim() }] }) }}
              ><IconCheckOutline16 /></button>
              <button
                type="button"
                className={css.queueAction}
                aria-label={t('chat.cancelQueuedEdit')}
                disabled={busy}
                onClick={() => { setEditing(false) }}
              ><IconCloseOutline16 /></button>
            </>
          )
          : (
            <>
              <button
                type="button"
                className={css.queueAction}
                aria-label={t('chat.editQueued')}
                title={editable ? undefined : t('chat.editQueuedUnsupported')}
                disabled={busy || !editable}
                onClick={() => { if (editable) setEditing(true) }}
              ><IconEditOutline16 /></button>
              <button
                type="button"
                className={css.queueAction}
                aria-label={t('chat.removeQueued')}
                disabled={busy}
                onClick={() => { void apply({ kind: 'remove' }) }}
              ><IconTrashOutline16 /></button>
              <button
                type="button"
                className={css.queueAction}
                aria-label={t('chat.steerQueued')}
                title={props.running ? undefined : t('chat.steerQueuedUnavailable')}
                disabled={busy || !props.running || props.item.placement !== 'queued'}
                onClick={() => { void apply({ kind: 'steer' }) }}
              ><IconSendOutline14 /></button>
            </>
          )}
      </div>
      {error === undefined ? null : <span className={css.queueError} role="alert">{error}</span>}
    </div>
  )
}

/** Local submission echo shown while attachment admission is still in flight. */
function PendingSubmissionBubble(props: { sessionId: SessionId; submission: PendingSubmission }) {
  return (
    <div className={css.user}>
      {props.submission.text === '' ? null : <div>{props.submission.text}</div>}
      <MessageAttachments sessionId={props.sessionId} previews={props.submission.images} />
    </div>
  )
}

function dynamicGreetingKey(): DcodeKey {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'chat.empty.morning'
  if (hour >= 12 && hour < 18) return 'chat.empty.afternoon'
  return 'chat.empty.evening'
}

/** Compact index for jumping between loaded conversation turns. */
function TurnNavigator(props: {
  turns: readonly (readonly ConversationNode[])[]
  scrollerRef: RefObject<HTMLDivElement | null>
}) {
  const t = useT()
  const [active, setActive] = useState(0)
  if (props.turns.length < 2) return null
  return (
    <nav className={css.turnNavigator} aria-label={t('chat.turnNavigation.label')}>
      {props.turns.map((_turn, index) => (
        <button
          type="button"
          key={index}
          className={css.turnButton}
          aria-label={t('chat.turnNavigation.turn', { count: index + 1 })}
          aria-current={active === index ? 'true' : undefined}
          onClick={() => {
            const target = props.scrollerRef.current?.querySelector<HTMLElement>(`[data-turn-index="${String(index)}"]`)
            target?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
              block: 'start',
            })
            setActive(index)
          }}
        >
          {index + 1}
        </button>
      ))}
    </nav>
  )
}

/** The scrolling conversation, its turn summaries and its streaming tail. */
export function Transcript({ navigation, sessionId, cwd, blank }: TranscriptProps) {
  const runtime = useRuntime()
  const t = useT()
  const chat = useChatSnapshot(sessionId)
  const session = useSessionSnapshot(sessionId)
  const git = useGitStatus(cwd, sessionId)
  const feedback = useMessageFeedback(sessionId)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const pinnedRef = useRef(true)

  const labels = useMemo<MarkdownLabels>(() => ({
    code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
    footnotes: t('details.title'),
  }), [t])

  const nodes = chat?.legacy.nodes ?? []
  const partial = chat?.legacy.partial ?? null
  const runningCalls = chat?.legacy.runningCalls ?? []
  const turns = useMemo(() => splitTurns(nodes), [nodes])

  // Stick to the bottom while the operator is already there; a deliberate
  // scroll up during a streaming answer is never yanked back down.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller === null) return undefined
    const onScroll = (): void => {
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      pinnedRef.current = distance < 80
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => { scroller.removeEventListener('scroll', onScroll) }
  }, [])

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (scroller === null || !pinnedRef.current) return
    scroller.scrollTop = scroller.scrollHeight
  }, [nodes, partial, runningCalls.length, sessionId])

  // A session switch starts pinned to the newest message again.
  useEffect(() => { pinnedRef.current = true }, [sessionId])

  if (sessionId === undefined) {
    // Keep the greeting, but remove the extra prompt and shortcut button.
    return (
      <div className={`${css.hero} ${css.heroBlank}`}>
        <span className={css.heroGreeting}>{t(dynamicGreetingKey())}</span>
      </div>
    )
  }

  if (chat === undefined && !blank) {
    return <div className={css.loadingState} role="status"><Spinner size="sm" />{t('chat.loading')}</div>
  }

  return (
    <div className={css.scroller} ref={scrollerRef} tabIndex={0} role="region" aria-label={t('chat.transcript')}>
      {blank
        ? (
          // Bottom-aligned rather than centred: the frame is already holding
          // this column and the composer on one centre line, so the greeting
          // belongs directly above the input, not in the middle of its own half.
          <div className={`${css.hero} ${css.heroBlank}`}>
            <span className={css.heroGreeting}>{t(dynamicGreetingKey())}</span>
            <p className={css.heroBody}>
              {cwd === undefined ? t('chat.empty.noWorkspace') : t('chat.empty.body', { cwd })}
            </p>
          </div>
        )
        : (
          <>
            <TurnNavigator turns={turns} scrollerRef={scrollerRef} />
            <div className={css.flow}>
            {feedback.error === undefined ? null : (
              <div className={`${css.notice} ${css.noticeError}`} role="alert">
                <IconWarningOutline16 />
                {t('chat.feedback.failed', { error: feedback.error })}
              </div>
            )}
            {session?.hasMore === true
              ? (
                <Button
                  className={css.loadOlder}
                  disabled={session.loadingOlder}
                  onClick={() => { void runtime.binding(sessionId)?.session.loadOlder() }}
                >
                  {session.loadingOlder ? t('chat.loading') : t('chat.loadOlder')}
                </Button>
              )
              : null}

            {turns.map((turn, turnIndex) => {
              const paths = changedPaths(turn)
              const last = turnIndex === turns.length - 1
              return (
                <div className={css.turn} key={turn[0]?.seq ?? turnIndex} data-turn-index={turnIndex}>
                  {turn.map(node => (
                    <Node
                      sessionId={sessionId}
                      key={`${node.kind}:${String(node.seq)}`}
                      node={node}
                      labels={labels}
                      onInspect={callId => { navigation.inspect(callId) }}
                      feedback={feedback}
                    />
                  ))}
                  {/* The summary closes a turn only once it has settled; a
                      running turn's edits are still arriving. */}
                  {paths.length > 0 && (!last || session?.running !== true)
                    ? (
                      <FileChanges
                        paths={paths}
                        cwd={cwd}
                        status={git.status}
                        onOpenDiff={path => { navigation.openDiff(path) }}
                        onChanged={git.refresh}
                      />
                    )
                    : null}
                </div>
              )
            })}

            {runningCalls.map(call => (
              <ToolCard
                key={call.callId}
                block={call}
                onInspect={callId => { navigation.inspect(callId) }}
              />
            ))}

            {partial === null
              ? null
              : (
                <div>
                  <AssistantBlocks sessionId={sessionId} blocks={partial.blocks} streaming labels={labels} />
                  <span className={css.streamingDot} role="status" aria-label={t('chat.thinking')} />
                </div>
              )}

            {session?.running === true && partial === null && runningCalls.length === 0
              ? <div className={css.stats} role="status" aria-live="polite">{t('chat.thinking')}<span className={css.streamingDot} /></div>
              : null}

            {session?.pendingSubmissions.map(submission => (
              <PendingSubmissionBubble
                key={submission.requestId}
                sessionId={sessionId}
                submission={submission}
              />
            ))}

            {session?.queue.length === 0
              ? null
              : session?.queue.map(item => (
                <QueuedMessageRow
                  key={item.id}
                  sessionId={sessionId}
                  item={item}
                  running={session.running}
                />
              ))}

            {session?.lastAgentError === null || session?.lastAgentError === undefined
              ? null
              : (
                <div className={`${css.notice} ${css.noticeError}`} role="alert">
                  <IconWarningOutline16 />
                  {session.lastAgentError}
                </div>
              )}
            </div>
          </>
        )}
    </div>
  )
}
