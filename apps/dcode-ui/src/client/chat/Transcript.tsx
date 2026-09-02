/**
 * The conversation column.
 *
 * Nodes come from the Chat target the official UI assembles — the very same
 * `ConversationNode` stream, projections and streaming partial — so a session
 * opened in one surface and continued in the other shows one history. What
 * differs is the presentation: a turn-level process disclosure, a file-change
 * summary closing each turn, and a reading column instead of a full-width
 * flow.
 * @module @dsh-portable/dcode-ui/client/chat/Transcript
 */

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  FishLogo,
  IconBranchOutline16, IconCheckOutline16, IconChevronRightOutline14, IconCloseFill14, IconCloseOutline16,
  IconContextInjectionOutline16,
  IconDislikeOutline16, IconEditOutline16, IconLikeOutline16,
  IconSendOutline14, IconSparkle16, IconThinkOutline14, IconTrashOutline16,
  IconWarningOutline16, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AssistantBlock, AssistantMessageNode, ContextMessageNode, ConversationNode, RunningToolCall, ToolCallBlock,
} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {
  PendingSubmission, SessionFace, SessionSnapshot,
} from '@deepseek-ai/dsh-api-session-controller/client'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types'
import { SessionSeq, type SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useChatSnapshot, useSessionSnapshot } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import { Button, CopyButton, IconButton, shimmerActive, Spinner } from '../shell/ui.tsx'
import { useModalFocus } from '../shell/use-modal-focus.ts'
import { MessageNavRail } from '../shell/MessageNavRail.tsx'
import { ToolCard } from './ToolCard.tsx'
import { FileChanges } from './FileChanges.tsx'
import { extractProposedPlan, PlanPreviewCard } from './PlanPreview.tsx'
import { useMessageFeedback, type MessageFeedbackState } from './message-feedback.ts'
import {
  changedPaths, isSubagentTool, messageText, splitTurns,
} from './tools.ts'
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
  /** Compact frames suppress the edge rail so it cannot cover the transcript. */
  readonly compact?: boolean
}

type FeedbackRating = 'positive' | 'negative'

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

function compactTokens(count: number): string {
  if (count < 1000) return String(count)
  if (count < 1_000_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}k`
  return `${(count / 1_000_000).toFixed(1)}m`
}

/** Reasoning details stay behind a one-line row until the operator opens them. */
function Reasoning(props: {
  text: string
  streaming: boolean
  durationMs?: number
  tokenCount?: number
  labels: MarkdownLabels
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const startedAt = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!props.streaming) return undefined
    const update = (): void => { setElapsed(Math.max(0, Date.now() - startedAt.current)) }
    update()
    const timer = window.setInterval(update, 1000)
    return () => { window.clearInterval(timer) }
  }, [props.streaming])

  const seconds = Math.max(0, Math.round((props.streaming ? elapsed : props.durationMs ?? 0) / 1000))
  const title = props.streaming
    ? t('chat.thinkingProgress', { seconds })
    : props.tokenCount === undefined
      ? t('chat.thoughtFor', { seconds })
      : `${t('chat.thoughtFor', { seconds })} · ${t('chat.tokens', { count: compactTokens(props.tokenCount) })}`
  return (
    <div className={`${css.reasoning} ${props.streaming ? css.reasoningStreaming : ''} ${shimmerActive(props.streaming)}`}>
      <button
        type="button"
        className={css.reasoningHead}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => { setOpen(value => !value) }}
      >
        <span className={css.reasoningIcon} aria-hidden><IconThinkOutline14 /></span>
        <span className={css.reasoningTitle}>{title}</span>
        <IconChevronRightOutline14 className={`${css.reasoningChevron} ${open ? css.reasoningChevronOpen : ''}`} />
      </button>
      <div className={`${css.reasoningDisclosure} ${open ? css.reasoningDisclosureOpen : ''}`}>
        <div className={css.reasoningBody} id={panelId} role="region">
          <MarkdownText text={props.text} streaming={props.streaming} labels={props.labels} />
        </div>
      </div>
    </div>
  )
}

/** Lightweight waiting row before the first assistant delta arrives. */
function ThinkingStatus() {
  const t = useT()
  const startedAt = useRef(Date.now())
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)))
    }, 1000)
    return () => { window.clearInterval(timer) }
  }, [])
  return (
    <div className={`${css.reasoning} ${css.reasoningStreaming} ${shimmerActive()}`} role="status" aria-live="polite">
      <div className={css.reasoningHead}>
        <span className={css.reasoningIcon} aria-hidden><IconThinkOutline14 /></span>
        <span className={css.reasoningTitle}>{t('chat.thinkingProgress', { seconds })}</span>
      </div>
    </div>
  )
}

type TurnActivityItem =
  | { readonly kind: 'context'; readonly key: string; readonly node: ContextMessageNode }
  | {
    readonly kind: 'reasoning'
    readonly key: string
    readonly text: string
  }
  | { readonly kind: 'message'; readonly key: string; readonly text: string }
  | { readonly kind: 'tool'; readonly key: string; readonly block: ToolCallBlock }

interface TurnActivityData {
  readonly items: readonly TurnActivityItem[]
  readonly finalAssistant?: AssistantMessageNode
  readonly messageCount: number
  readonly toolCallCount: number
  readonly subagentCount: number
}

function hasAssistantAnswer(node: AssistantMessageNode): boolean {
  if (node.blocks.some(block => block.kind === 'tool-call')) return false
  return node.blocks.some(block => (
    (block.kind === 'text' && block.text.trim() !== '') || block.kind === 'image'
  ))
}

function turnNodeNumber(node: ConversationNode): number | undefined {
  return 'turn' in node && typeof node.turn === 'number' ? node.turn : undefined
}

/** Build one turn's process rows while keeping the final answer separate. */
function buildTurnActivity(
  turn: readonly ConversationNode[],
  runningCalls: readonly RunningToolCall[],
): TurnActivityData {
  const items: TurnActivityItem[] = []
  let finalAssistant: AssistantMessageNode | undefined
  for (let index = turn.length - 1; index >= 0; index -= 1) {
    const node = turn[index]
    if (node?.kind === 'assistant' && hasAssistantAnswer(node)) {
      finalAssistant = node
      break
    }
  }

  let messageCount = 0
  let toolCallCount = 0
  let subagentCount = 0
  for (const node of turn) {
    if (node.kind === 'context') {
      items.push({ kind: 'context', key: `context:${String(node.seq)}`, node })
      continue
    }
    if (node.kind === 'assistant') {
      if (node.seq !== finalAssistant?.seq) {
        const hasMessage = node.blocks.some(block => block.kind === 'text' && block.text.trim() !== '')
        if (hasMessage) messageCount += 1
      }
      for (const [blockIndex, block] of node.blocks.entries()) {
        if (block.kind === 'reasoning' && block.text.trim() !== '') {
          items.push({
            kind: 'reasoning',
            key: `reasoning:${String(node.seq)}:${String(blockIndex)}`,
            text: block.text,
          })
        } else if (node.seq !== finalAssistant?.seq && block.kind === 'text' && block.text.trim() !== '') {
          items.push({ kind: 'message', key: `message:${String(node.seq)}:${String(blockIndex)}`, text: block.text })
        }
      }
      continue
    }
    if (node.kind !== 'tool-result') continue
    const name = node.call?.name ?? 'tool'
    if (isSubagentTool(name)) subagentCount += 1
    else toolCallCount += 1
    items.push({ kind: 'tool', key: `tool:${node.callId}`, block: node })
  }
  for (const call of runningCalls) {
    if (isSubagentTool(call.name)) subagentCount += 1
    else toolCallCount += 1
    items.push({ kind: 'tool', key: `running:${call.callId}`, block: call })
  }

  return { items, finalAssistant, messageCount, toolCallCount, subagentCount }
}

function activityPreview(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim()
  return singleLine.length > 180 ? `${singleLine.slice(0, 179)}…` : singleLine
}

function ActivityTextRow(props: {
  icon: 'thinking' | 'message'
  label: string
  text: string
  labels: MarkdownLabels
  streaming?: boolean
}) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  return (
    <div className={css.activityItem}>
      <button
        type="button"
        className={css.activityRow}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => { setOpen(value => !value) }}
      >
        <span className={css.activityRowIcon} aria-hidden>
          {props.icon === 'thinking' ? <IconThinkOutline14 /> : <IconSparkle16 />}
        </span>
        <span className={css.activityRowLabel}>{props.label}</span>
        <span className={css.activityRowPreview}>{activityPreview(props.text)}</span>
        <IconChevronRightOutline14 className={`${css.activityRowChevron} ${open ? css.activityRowChevronOpen : ''}`} />
      </button>
      <div className={`${css.activityDisclosure} ${open ? css.activityDisclosureOpen : ''}`} aria-hidden={!open}>
        <div className={css.activityDetail} id={contentId} role="region">
          <MarkdownText text={props.text} streaming={props.streaming === true} labels={props.labels} />
        </div>
      </div>
    </div>
  )
}

/** Progress messages are output-like rows, not another disclosure layer. */
function ActivityMessageRow(props: { text: string; labels: MarkdownLabels }) {
  return (
    <div className={css.activityMessage}>
      <MarkdownText text={props.text} streaming={false} labels={props.labels} />
    </div>
  )
}

/** A context source keeps the same compact, one-line rhythm as activity rows. */
function ActivityContextRow(props: { node: ContextMessageNode }) {
  const t = useT()
  const source = props.node.provenance.label
  return (
    <div className={css.activityContextRow}>
      <span className={css.activityRowIcon} aria-hidden><IconContextInjectionOutline16 size={14} /></span>
      <span className={css.activityRowLabel}>
        {t(props.node.provenance.role === 'recall' ? 'chat.activity.contextRecall' : 'chat.activity.contextInjection')}
      </span>
      {source === null ? null : (
        <span className={css.activityRowPreview}>{source}</span>
      )}
    </div>
  )
}

/** One turn's process summary. Completed summaries start closed. */
function TurnActivity(props: {
  data: TurnActivityData
  labels: MarkdownLabels
  running: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const wasRunning = useRef(props.running)
  const contentId = useId()

  useEffect(() => {
    if (!props.running && wasRunning.current) setOpen(false)
    wasRunning.current = props.running
  }, [props.running])

  const summaryParts: string[] = []
  if (props.data.toolCallCount > 0) {
    summaryParts.push(t(
      props.data.toolCallCount === 1 ? 'chat.activity.toolCalls.one' : 'chat.activity.toolCalls.many',
      { count: props.data.toolCallCount },
    ))
  }
  if (props.data.messageCount > 0) {
    summaryParts.push(t(
      props.data.messageCount === 1 ? 'chat.activity.messages.one' : 'chat.activity.messages.many',
      { count: props.data.messageCount },
    ))
  }
  if (props.data.subagentCount > 0) {
    summaryParts.push(t(
      props.data.subagentCount === 1 ? 'chat.activity.subagents.one' : 'chat.activity.subagents.many',
      { count: props.data.subagentCount },
    ))
  }
  const summary = summaryParts.length === 0
    ? t('chat.activity.thoughtForAWhile')
    : summaryParts.join(t('chat.activity.separator'))

  return (
    <div className={css.turnActivity} data-turn-activity data-activity-open={open || undefined}>
      <button
        type="button"
        className={css.turnActivityHead}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => { setOpen(value => !value) }}
      >
        <span className={css.turnActivitySummary}>{summary}</span>
        <IconChevronRightOutline14 className={`${css.turnActivityChevron} ${open ? css.turnActivityChevronOpen : ''}`} />
      </button>
      <div className={`${css.turnActivityDisclosure} ${open ? css.turnActivityDisclosureOpen : ''}`} aria-hidden={!open}>
        <div className={css.turnActivityItems} id={contentId}>
          {props.data.items.map(item => {
            if (item.kind === 'context') return <ActivityContextRow key={item.key} node={item.node} />
            if (item.kind === 'tool') return <ToolCard key={item.key} block={item.block} activity />
            if (item.kind === 'message') return <ActivityMessageRow key={item.key} text={item.text} labels={props.labels} />
            return (
              <ActivityTextRow
                key={item.key}
                icon="thinking"
                label={t('chat.activity.thinking')}
                text={item.text}
                labels={props.labels}
                streaming={false}
              />
            )
          })}
        </div>
      </div>
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

type PreviewImage = PendingSubmission['images'][number]

/** Render official alpha.4 image attachments without changing the DCode layout. */
function MessageAttachments(props: {
  sessionId: SessionId
  content?: readonly unknown[]
  images?: readonly ImageAttachmentRef[]
  previews?: readonly PreviewImage[]
}) {
  const images = [...(props.images ?? [])]
  for (const block of props.content ?? []) {
    const candidate = block as { type?: unknown; attachment?: unknown }
    if (candidate.type === 'image' && candidate.attachment !== undefined) {
      images.push(candidate.attachment as ImageAttachmentRef)
    }
  }
  if (images.length === 0 && (props.previews?.length ?? 0) === 0) return null
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
    </div>
  )
}

/** A user bubble can carry text, images, or an image-only prompt. */
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
  durationMs?: number
  tokenCount?: number
  showReasoning?: boolean
}) {
  return (
    <div className={css.blockGap}>
      {props.blocks.map((block, index) => {
        if (block.kind === 'text') {
          const proposedPlan = extractProposedPlan(block.text, props.streaming)
          if (proposedPlan !== undefined) {
            return (
              <div className={css.proposalBlock} key={index}>
                {proposedPlan.before === ''
                  ? null
                  : <div className={css.assistant}><MarkdownText text={proposedPlan.before} streaming={props.streaming} labels={props.labels} /></div>}
                <PlanPreviewCard
                  sessionId={props.sessionId}
                  markdown={proposedPlan.plan}
                  partial={proposedPlan.partial}
                  labels={props.labels}
                  showStatus
                />
                {proposedPlan.after === ''
                  ? null
                  : <div className={css.assistant}><MarkdownText text={proposedPlan.after} streaming={props.streaming} labels={props.labels} /></div>}
              </div>
            )
          }
          return (
            <div className={css.assistant} key={index}>
              <MarkdownText text={block.text} streaming={props.streaming} labels={props.labels} />
            </div>
          )
        }
        if (block.kind === 'reasoning') {
          if (props.showReasoning === false) return null
          return (
            <Reasoning
              key={index}
              text={block.text}
              streaming={props.streaming}
              durationMs={props.durationMs}
              tokenCount={props.tokenCount}
              labels={props.labels}
            />
          )
        }
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

function assistantTokenCount(node: AssistantMessageNode): number | undefined {
  const usage = node.usage as { totalTokens?: number; total_tokens?: number } | undefined
  return usage?.totalTokens ?? usage?.total_tokens
}

function assistantDurationMs(node: AssistantMessageNode): number | undefined {
  const start = node.timing?.stepStartTime
  return start === null || start === undefined ? undefined : Math.max(0, node.timing!.completedTime - start)
}

function assistantText(blocks: readonly AssistantBlock[]): string {
  return blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('')
}

/** Copy, feedback, and branch actions for one settled assistant answer. */
function AssistantActions(props: {
  sessionId: SessionId
  node: AssistantMessageNode
  feedback: MessageFeedbackState
  onBranched: () => void
}) {
  const runtime = useRuntime()
  const t = useT()
  const [branching, setBranching] = useState(false)
  const [branchError, setBranchError] = useState<string | undefined>(undefined)
  const [feedbackError, setFeedbackError] = useState<string | undefined>(undefined)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteError, setNoteError] = useState<string | undefined>(undefined)
  const text = assistantText(props.node.blocks)
  const messageId = props.node.messageId
  const item = messageId === undefined ? undefined : props.feedback.items.get(messageId)
  const pending = messageId === undefined ? false : props.feedback.pending.has(messageId)

  useEffect(() => {
    if (noteOpen) { setNoteDraft(item?.note ?? ''); setNoteError(undefined) }
  }, [noteOpen, item?.note])

  const saveNote = useCallback(() => {
    if (messageId === undefined || item?.rating === undefined) return
    setNoteBusy(true)
    setNoteError(undefined)
    void props.feedback.saveNote(messageId, item.rating, noteDraft).then((failure) => {
      if (failure !== undefined) setNoteError(failure)
      else { setNoteOpen(false); setNoteDraft('') }
    }).finally(() => { setNoteBusy(false) })
  }, [item?.rating, messageId, noteDraft, props.feedback])

  const clearSavedNote = useCallback(() => {
    if (messageId === undefined) return
    setNoteBusy(true)
    setNoteError(undefined)
    void props.feedback.clearNote(messageId).then((failure) => {
      if (failure !== undefined) setNoteError(failure)
      else { setNoteOpen(false); setNoteDraft('') }
    }).finally(() => { setNoteBusy(false) })
  }, [messageId, props.feedback])

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
      props.onBranched()
      runtime.sessions.open(child)
    } catch (cause: unknown) {
      setBranchError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBranching(false)
    }
  }, [branching, props.node.seq, props.onBranched, props.sessionId, runtime])

  const rate = useCallback((rating: FeedbackRating) => {
    if (messageId === undefined) return
    setFeedbackError(undefined)
    void props.feedback.toggle(messageId, rating).then((failure) => {
      if (failure !== undefined) setFeedbackError(failure)
    })
  }, [messageId, props.feedback])

  return (
    <div className={css.messageActions}>
      <span className={css.messageActionGroup}>
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
            <span style={{ display: 'contents' }} onPointerEnter={props.feedback.ensure} onFocusCapture={props.feedback.ensure}>
              <IconButton
                label={t('chat.feedback.positive')}
                className={css.messageAction}
                active={item?.rating === 'positive'}
                disabled={pending}
                onClick={() => { rate('positive') }}
              >
                <IconLikeOutline16 />
              </IconButton>
              <IconButton
                label={t('chat.feedback.negative')}
                className={css.messageAction}
                active={item?.rating === 'negative'}
                disabled={pending}
                onClick={() => { rate('negative') }}
              >
                <IconDislikeOutline16 />
              </IconButton>
              <IconButton
                label={item?.note === undefined || item.note === '' ? t('chat.feedback.note') : t('chat.feedback.noteEdit')}
                className={css.messageAction}
                active={noteOpen}
                disabled={pending || item?.rating === undefined}
                onClick={() => { setNoteOpen(value => !value) }}
              >
                <IconEditOutline16 />
              </IconButton>
            </span>
          )
          : null}
      </span>
      {noteOpen && messageId !== undefined ? (
        <span className={css.noteEditor}>
          <textarea
            className={css.noteInput}
            rows={2}
            value={noteDraft}
            disabled={noteBusy}
            placeholder={t('chat.feedback.notePlaceholder')}
            aria-label={t('chat.feedback.note')}
            onChange={event => { setNoteDraft(event.target.value); setNoteError(undefined) }}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setNoteOpen(false)
              }
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                saveNote()
              }
            }}
          />
          <span className={css.noteActions}>
            {item?.note === undefined || item.note === '' ? null : (
              <Button disabled={noteBusy} onClick={clearSavedNote}>{t('chat.feedback.noteRemove')}</Button>
            )}
            <Button disabled={noteBusy} onClick={() => { setNoteOpen(false); setNoteError(undefined) }}>{t('chat.feedback.noteCancel')}</Button>
            <Button primary disabled={noteBusy} onClick={saveNote}>{noteBusy ? t('common.saving') : t('chat.feedback.noteSave')}</Button>
          </span>
          {noteError === undefined ? null : <span className={css.actionError} role="alert">{t('chat.feedback.failed', { error: noteError })}</span>}
        </span>
      ) : null}
      <span className={`${css.messageActionGroup} ${css.branchActionGroup}`}>
        <IconButton
          label={branching ? t('chat.message.branching') : t('chat.message.branch')}
          className={css.messageAction}
          disabled={branching}
          onClick={() => { void branch() }}
        >
          {branching ? <Spinner size="sm" /> : <IconBranchOutline16 />}
        </IconButton>
      </span>
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
  feedback: MessageFeedbackState
  highlighted?: boolean
  showReasoning?: boolean
  onBranched: () => void
}) {
  const t = useT()
  const { node } = props
  switch (node.kind) {
    case 'user':
      return <UserBubble sessionId={props.sessionId} content={node.content} className={props.highlighted === true ? css.turnLeadHighlight : undefined} />
    case 'steering':
      return <UserBubble sessionId={props.sessionId} content={node.content} className={`${css.steering} ${props.highlighted === true ? css.turnLeadHighlight : ''}`} />
    case 'assistant':
      return (
        <div>
          <AssistantBlocks
            sessionId={props.sessionId}
            blocks={node.blocks}
            streaming={false}
            labels={props.labels}
            durationMs={assistantDurationMs(node)}
            tokenCount={assistantTokenCount(node)}
            showReasoning={props.showReasoning}
          />
          <AssistantActions sessionId={props.sessionId} node={node} feedback={props.feedback} onBranched={props.onBranched} />
          <Stats node={node} />
        </div>
      )
    case 'tool-result':
      return <ToolCard block={node as ToolCallBlock} />
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

/** Render a turn with one process owner between the prompt and final answer. */
function TurnView(props: {
  sessionId: SessionId
  turn: readonly ConversationNode[]
  runningCalls: readonly RunningToolCall[]
  labels: MarkdownLabels
  feedback: MessageFeedbackState
  highlighted: boolean
  running: boolean
  onBranched: () => void
}) {
  const data = useMemo(
    () => buildTurnActivity(props.turn, props.runningCalls),
    [props.runningCalls, props.turn],
  )
  const firstHumanSeq = props.turn.find(node => node.kind === 'user' || node.kind === 'steering')?.seq
  const finalAssistantSeq = data.finalAssistant?.seq
  const rows: ReactNode[] = []
  let activityInserted = false
  const insertActivity = (): void => {
    if (activityInserted || data.items.length === 0) return
    activityInserted = true
    rows.push(
      <TurnActivity
        key="turn-activity"
        data={data}
        labels={props.labels}
        running={props.running}
      />,
    )
  }

  for (const node of props.turn) {
    const processNode = node.kind === 'context' || node.kind === 'assistant' || node.kind === 'tool-result'
    if (processNode) insertActivity()
    if (node.kind === 'context') continue
    if (node.kind === 'tool-result') continue
    if (node.kind === 'assistant' && node.seq !== finalAssistantSeq) continue
    rows.push(
      <Node
        sessionId={props.sessionId}
        key={`${node.kind}:${String(node.seq)}`}
        node={node}
        labels={props.labels}
        feedback={props.feedback}
        highlighted={props.highlighted && node.seq === firstHumanSeq}
        showReasoning={data.items.length > 0 && node.seq === finalAssistantSeq ? false : undefined}
        onBranched={props.onBranched}
      />,
    )
  }
  insertActivity()
  return <>{rows}</>
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
  const original = props.item.text ?? props.item.preview

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
    <div className={`${css.user} ${props.item.placement === 'steering' ? css.steering : css.queuedPrompt} ${css.queueRow}`}>
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
              if (event.key === 'Escape') {
                event.preventDefault()
                setDraft(original)
                setError(undefined)
                setEditing(false)
              }
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
                onClick={() => {
                  setDraft(original)
                  setError(undefined)
                  setEditing(false)
                }}
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
                onClick={() => {
                  if (!editable) return
                  setDraft(original)
                  setError(undefined)
                  setEditing(true)
                }}
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

/** The scrolling conversation, its turn summaries and its streaming tail. */
export function Transcript({ navigation, sessionId, cwd, blank, compact = false }: TranscriptProps) {
  const runtime = useRuntime()
  const t = useT()
  const chat = useChatSnapshot(sessionId)
  const session = useSessionSnapshot(sessionId)
  const git = useGitStatus(cwd, sessionId)
  const feedback = useMessageFeedback(runtime.messageFeedback, sessionId)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const pinnedRef = useRef(true)
  const highlightTimerRef = useRef<number | undefined>(undefined)
  const historyLoadSessionRef = useRef<SessionId | undefined>(undefined)
  const [highlightedTurn, setHighlightedTurn] = useState<number | undefined>(undefined)
  const [branchCreated, setBranchCreated] = useState(false)
  const [showScrollLatest, setShowScrollLatest] = useState(false)
  const emptyHero = (
    <div className={`${css.hero} ${css.heroBlank}`}>
      <div className={css.heroHeadline}>
        <span className={css.heroFishHitbox}><FishLogo size={34} className={css.heroFish} /></span>
        <span className={css.heroGreeting}>{t(dynamicGreetingKey())}</span>
      </div>
    </div>
  )

  const labels = useMemo<MarkdownLabels>(() => ({
    code: { copyLabel: t('common.copy'), copiedLabel: t('common.copied') },
    footnotes: t('details.title'),
  }), [t])

  const nodes = chat?.legacy.nodes ?? []
  const partial = chat?.legacy.partial ?? null
  const runningCalls = chat?.legacy.runningCalls ?? []
  const turns = useMemo(() => splitTurns(nodes), [nodes])
  const lastTurnHasNumber = turns.length > 0
    && turns[turns.length - 1].some(node => turnNodeNumber(node) !== undefined)
  const nodeLessLastTurnNumber = !lastTurnHasNumber ? runningCalls[0]?.turn : undefined
  const loadedTurnNumbers = useMemo(() => new Set(
    [...turns.flatMap(turn => turn
      .map(turnNodeNumber)
      .filter((number): number is number => number !== undefined)), nodeLessLastTurnNumber]
      .filter((number): number is number => number !== undefined),
  ), [nodeLessLastTurnNumber, turns])
  const queued = useMemo(
    () => (session?.queue ?? []).filter(item => item.placement !== 'context'),
    [session?.queue],
  )

  // DCode always presents a complete record. Drain the session's history
  // window as soon as its first page is open instead of exposing pagination
  // controls in the transcript.
  useEffect(() => {
    if (sessionId === undefined || session?.openState !== 'open') {
      historyLoadSessionRef.current = undefined
      return
    }
    if (session.hasMore !== true) {
      historyLoadSessionRef.current = undefined
      return
    }
    if (historyLoadSessionRef.current === sessionId) return
    const face = runtime.binding(sessionId)?.session
    if (face === undefined) return
    historyLoadSessionRef.current = sessionId
    void face.loadThrough(SessionSeq(0))
  }, [runtime, session?.hasMore, session?.openState, sessionId])

  const navigateToTurn = useCallback((index: number) => {
    // Opt out of bottom pinning before smooth scrolling begins, otherwise a
    // streaming layout update can pull the selected turn back out of view.
    pinnedRef.current = false
    setHighlightedTurn(index)
    window.clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = window.setTimeout(() => { setHighlightedTurn(undefined) }, 1600)
    const target = scrollerRef.current?.querySelector<HTMLElement>(`[data-turn-index="${String(index)}"]`)
    target?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  useEffect(() => () => { window.clearTimeout(highlightTimerRef.current) }, [])

  useEffect(() => {
    if (!branchCreated) return undefined
    const timer = window.setTimeout(() => { setBranchCreated(false) }, 2400)
    return () => { window.clearTimeout(timer) }
  }, [branchCreated])

  // Stick to the bottom while the operator is already there; a deliberate
  // scroll up during a streaming answer is never yanked back down.
  useEffect(() => {
    const scroller = scrollerRef.current
    if (scroller === null) return undefined
    const onScroll = (): void => {
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
      const pinned = distance < 80
      pinnedRef.current = pinned
      setShowScrollLatest(!pinned)
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
  useLayoutEffect(() => {
    pinnedRef.current = true
    setShowScrollLatest(false)
    const scroller = scrollerRef.current
    if (scroller !== null) scroller.scrollTop = scroller.scrollHeight
  }, [sessionId])

  const scrollToLatest = useCallback(() => {
    const scroller = scrollerRef.current
    if (scroller === null) return
    pinnedRef.current = true
    setShowScrollLatest(false)
    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: 'auto',
    })
  }, [])

  if (sessionId === undefined) {
    return emptyHero
  }

  if (chat === undefined && !blank) {
    return <div className={css.loadingState} role="status"><Spinner size="sm" />{t('chat.loading')}</div>
  }

  return (
    <div className={css.scroller} ref={scrollerRef} tabIndex={0} role="region" aria-label={t('chat.transcript')}>
      {blank
        ? emptyHero
        : (
          <>
            {compact ? null : <MessageNavRail
              nodes={nodes}
              scrollerRef={scrollerRef}
              onNavigate={navigateToTurn}
            />}
            <div className={css.flow}>
            {feedback.error === undefined ? null : (
              <div className={`${css.notice} ${css.noticeError}`} role="alert">
                <IconWarningOutline16 />
                {t('chat.feedback.failed', { error: feedback.error })}
              </div>
            )}
            {turns.map((turn, turnIndex) => {
              const paths = changedPaths(turn)
              const last = turnIndex === turns.length - 1
              const turnNumber = turn
                .map(turnNodeNumber)
                .find((number): number is number => number !== undefined)
                ?? (last ? nodeLessLastTurnNumber : undefined)
              const turnRunningCalls = turnNumber === undefined
                ? []
                : runningCalls.filter(call => call.turn === turnNumber)
              return (
                <div className={css.turn} key={turn[0]?.seq ?? turnIndex} data-turn-index={turnIndex}>
                  <TurnView
                    sessionId={sessionId}
                    turn={turn}
                    runningCalls={turnRunningCalls}
                    labels={labels}
                    feedback={feedback}
                    highlighted={highlightedTurn === turnIndex}
                    running={last && session?.running === true}
                    onBranched={() => { setBranchCreated(true) }}
                  />
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

            {runningCalls.filter(call => !loadedTurnNumbers.has(call.turn)).map(call => (
              <ToolCard
                key={call.callId}
                block={call}
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
              ? <ThinkingStatus />
              : null}

            {session?.pendingSubmissions.map(submission => (
              <PendingSubmissionBubble
                key={submission.requestId}
                sessionId={sessionId}
                submission={submission}
              />
            ))}

            {queued.length === 0
              ? null
              : queued.map(item => (
                <QueuedMessageRow
                  key={item.id}
                  sessionId={sessionId}
                  item={item}
                  running={session?.running === true}
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
            {showScrollLatest
              ? (
                <button type="button" className={css.scrollLatest} onClick={scrollToLatest}>
                  <IconChevronRightOutline14 className={css.scrollLatestIcon} />
                  {t('chat.scrollLatest')}
                </button>
              )
              : null}
          </>
        )}
      {branchCreated
        ? <div className={css.branchToast} role="status">{t('chat.message.branchCreated')}</div>
        : null}
    </div>
  )
}
