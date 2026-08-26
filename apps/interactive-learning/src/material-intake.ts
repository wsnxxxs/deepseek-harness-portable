/**
 * Material intake: turning the files a LEARNER mentioned into ingested sources.
 *
 * The trigger is deliberately the learner's own `@file` mentions, read from the
 * session log — never a path the model supplies. That keeps the write path
 * host-side and learner-authorized while still making "drop a PDF in and teach
 * me chapter 3" work without a separate confirmation step: attaching the file to
 * a learning session IS the authorization for reading it.
 *
 * Intake runs when the material layer is first consulted in a turn rather than
 * on message arrival, because ingesting a large source is slow and the inbox
 * hook cannot await it.
 * @module @dsh-portable/interactive-learning/src/material-intake
 */

import { stat } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ingestDirectory, ingestSource, isSupportedSource, type IngestResult } from './ingest/pipeline.ts'
import type { TopicVault } from './topic-vault.ts'

/**
 * The `@file` grammar shared with the composer: a mention opens only at the
 * start of input or after whitespace, and may be quoted to carry spaces.
 */
const FILE_MENTION = /(?:^|\s)@(?:"([^"\n]+)"|([^\s"]+))/g

/** User messages scanned for mentions; older turns are already ingested. */
const MENTION_LOOKBACK = 8

/** Paths mentioned in one block of text, in order, without duplicates. */
export function parseFileMentions(text: string): readonly string[] {
  const paths: string[] = []
  for (const match of text.matchAll(FILE_MENTION)) {
    const raw = (match[1] ?? match[2] ?? '').trim()
    if (raw === '') continue
    // A trailing `/` marks a directory in the mention grammar; strip it so the
    // path resolves the same way for files and folders.
    const path = raw.replace(/[/\\]+$/u, '')
    if (path === '' || paths.includes(path)) continue
    paths.push(path)
  }
  return paths
}

interface SessionLike {
  readonly events: readonly { type: string; data: unknown }[]
}

/** Every path the learner mentioned across the recent user messages. */
export function mentionedPaths(session: SessionLike): readonly string[] {
  const texts: string[] = []
  for (let index = session.events.length - 1; index >= 0 && texts.length < MENTION_LOOKBACK; index -= 1) {
    const event = session.events[index]
    if (event?.type !== 'user/message') continue
    const data = event.data as { source?: { kind?: string }; content?: readonly { type?: string; text?: string }[] }
    if (data.source?.kind !== 'user') continue
    const text = (data.content ?? [])
      .filter(block => block.type === 'text')
      .map(block => block.text ?? '')
      .join('\n')
    if (text !== '') texts.push(text)
  }
  const paths: string[] = []
  for (const text of texts.reverse()) {
    for (const path of parseFileMentions(text)) {
      if (!paths.includes(path)) paths.push(path)
    }
  }
  return paths
}

/** Sync state per session, so a settled turn does not re-stat every mention. */
const synced = new WeakMap<object, {
  count: number
  results: readonly IngestResult[]
  reportedUnsupported: readonly string[]
}>()

/**
 * Sync any material the learner mentioned; the ingest pipeline decides whether
 * its bytes are unchanged or need rebuilding.
 *
 * Silently ignores a mention that is not a real path: `@` also appears in
 * ordinary prose, and a learner writing an email address must not produce an
 * error. An unsupported real file IS reported, because the learner meant to
 * supply it and deserves to know it was not read.
 * @param agent - The live agent whose session carries the mentions.
 * @param vault - The destination vault.
 * @returns one result per newly ingested path; empty when nothing was new.
 */
export async function syncMentionedMaterial(
  agent: Agent | undefined,
  vault: TopicVault,
): Promise<readonly IngestResult[]> {
  if (agent === undefined) return []
  const session = agent.session as unknown as SessionLike
  const cached = synced.get(agent)
  if (cached?.count === session.events.length) return cached.results

  const mentions = mentionedPaths(session)
  const results: IngestResult[] = []
  const reportedUnsupported = new Set(cached?.reportedUnsupported ?? [])
  if (mentions.length > 0) {
    for (const mention of mentions) {
      const path = isAbsolute(mention) ? mention : resolve(vault.root, mention)
      let isDirectory = false
      try {
        const info = await stat(path)
        isDirectory = info.isDirectory()
        if (!isDirectory && !info.isFile()) continue
      } catch {
        // Not a path at all — ordinary prose that happened to contain `@`.
        continue
      }
      if (path.startsWith(vault.internal) || path.startsWith(vault.extracted)) continue
      if (isDirectory) {
        if (path === vault.root || path === vault.sources) continue
        results.push(...await ingestDirectory(vault, path))
        continue
      }
      const name = path.replace(/^.*[\\/]/u, '')
      if (!isSupportedSource(name)) {
        // An unsupported file the learner deliberately attached is still worth
        // reporting once, so the coverage statement can name it.
        if (!reportedUnsupported.has(path)) {
          results.push(await ingestSource(vault, path))
          reportedUnsupported.add(path)
        }
        continue
      }
      results.push(await ingestSource(vault, path))
    }
  }

  const settled = results.filter(result => result.status !== 'unchanged')
  synced.set(agent, {
    count: session.events.length,
    results: settled,
    reportedUnsupported: [...reportedUnsupported],
  })
  return settled
}
