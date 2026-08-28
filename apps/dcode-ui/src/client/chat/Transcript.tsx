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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  IconThinkOutline14, IconWarningOutline16, MarkdownText,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AssistantBlock, AssistantMessageNode, ConversationNode, ToolCallBlock,
} from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useRuntime } from '../state/runtime.ts'
import { useChatSnapshot, useSessionSnapshot } from '../state/hooks.ts'
import { useT } from '../state/i18n.ts'
import type { NavigationStore } from '../state/navigation.ts'
import { useGitStatus } from '../git/useGit.ts'
import { Button, EmptyState } from '../shell/ui.tsx'
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
  readonly onNewTask: () => void
}

/** Reasoning text, folded by default. */
function Reasoning({ text }: { text: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div className={css.reasoning}>
      <button type="button" className={css.reasoningHead} onClick={() => { setOpen(value => !value) }}>
        <IconThinkOutline14 />
        {t('chat.reasoning')}
        <span aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open ? <div>{text}</div> : null}
    </div>
  )
}

/** One assistant message's visible blocks. Tool calls render as their own cards. */
function AssistantBlocks(props: {
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
    <div className={css.stats}>
      {model === undefined ? null : <span>{model}</span>}
      {total === undefined ? null : <span>{t('chat.tokens', { count: total })}</span>}
      {node.interrupted === true ? <span>{t('chat.interrupted')}</span> : null}
    </div>
  )
}

/** Render one conversation node. */
function Node(props: {
  node: ConversationNode
  labels: MarkdownLabels
  onInspect: (callId: string) => void
}) {
  const t = useT()
  const { node } = props
  switch (node.kind) {
    case 'user':
      return <div className={css.user}>{messageText(node.content)}</div>
    case 'steering':
      return <div className={`${css.user} ${css.steering}`}>{messageText(node.content)}</div>
    case 'assistant':
      return (
        <div>
          <AssistantBlocks blocks={node.blocks} streaming={false} labels={props.labels} />
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
        <div className={`${css.notice} ${css.noticeError}`}>
          <IconWarningOutline16 />
          {node.message === '' ? node.code ?? t('common.error') : node.message}
        </div>
      )
    default:
      return null
  }
}

function dynamicGreetingKey(): DcodeKey {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'chat.empty.morning'
  if (hour >= 12 && hour < 18) return 'chat.empty.afternoon'
  return 'chat.empty.evening'
}

/** The scrolling conversation, its turn summaries and its streaming tail. */
export function Transcript({ navigation, sessionId, cwd, blank, onNewTask }: TranscriptProps) {
  const runtime = useRuntime()
  const t = useT()
  const chat = useChatSnapshot(sessionId)
  const session = useSessionSnapshot(sessionId)
  const git = useGitStatus(cwd, sessionId)
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
    return (
      <div className={`${css.hero} ${css.heroBlank}`}>
        <span className={css.heroGreeting}>{t(dynamicGreetingKey())}</span>
        <p className={css.heroBody}>{t('chat.empty.noWorkspace')}</p>
        <Button primary onClick={onNewTask}>{t('nav.newTask')}</Button>
      </div>
    )
  }

  return (
    <div className={css.scroller} ref={scrollerRef}>
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
          <div className={css.flow}>
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
                <div className={css.turn} key={turn[0]?.seq ?? turnIndex}>
                  {turn.map(node => (
                    <Node
                      key={`${node.kind}:${String(node.seq)}`}
                      node={node}
                      labels={labels}
                      onInspect={callId => { navigation.inspect(callId) }}
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
                  <AssistantBlocks blocks={partial.blocks} streaming labels={labels} />
                  <span className={css.streamingDot} aria-label={t('chat.thinking')} />
                </div>
              )}

            {session?.running === true && partial === null && runningCalls.length === 0
              ? <div className={css.stats}>{t('chat.thinking')}<span className={css.streamingDot} /></div>
              : null}

            {session?.queue.length === 0
              ? null
              : session?.queue.map(item => (
                <div className={`${css.user} ${css.steering}`} key={item.id}>
                  <span className={css.stats}>{t('chat.queued')}</span>
                  {item.text ?? item.preview}
                </div>
              ))}

            {session?.lastAgentError === null || session?.lastAgentError === undefined
              ? null
              : (
                <div className={`${css.notice} ${css.noticeError}`}>
                  <IconWarningOutline16 />
                  {session.lastAgentError}
                </div>
              )}
          </div>
        )}
      {chat === undefined && !blank ? <EmptyState>{t('chat.loading')}</EmptyState> : null}
    </div>
  )
}
