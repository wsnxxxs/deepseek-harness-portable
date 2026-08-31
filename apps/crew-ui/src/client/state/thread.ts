/**
 * Folding a conversation into the compact mission log.
 *
 * Pure and component-free on purpose: this is the decision about what the
 * thread tab shows, and it is worth testing without a DOM, a Host, or a
 * stylesheet.
 * @module @dsh-portable/crew-ui/client/state/thread
 */

import type { ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client'

/** One entry in the compact log. */
type Entry =
  | { readonly kind: 'said'; readonly id: string; readonly who: 'user' | 'agent'; readonly text: string }
  | { readonly kind: 'work'; readonly id: string; readonly count: number }
  | { readonly kind: 'note'; readonly id: string; readonly text: string }

/** Concatenate the text blocks of a node, ignoring reasoning and media. */
function textOf(blocks: unknown): string {
  if (!Array.isArray(blocks)) return ''
  return (blocks as readonly { kind?: unknown, text?: unknown }[])
    .flatMap(block => (block.kind === 'text' && typeof block.text === 'string' ? [block.text] : []))
    .join('')
    .trim()
}

/**
 * Fold conversation nodes into the compact log.
 *
 * Consecutive tool results collapse into one "worked" row: the count is the
 * useful part here, and one row per call would bury the answer that follows it.
 * @param nodes - ordered conversation nodes.
 * @returns entries in display order.
 */
export function foldThread(nodes: readonly ConversationNode[]): Entry[] {
  const entries: Entry[] = []
  for (const node of nodes) {
    const id = String((node as { id?: unknown }).id ?? entries.length)
    switch (node.kind) {
      case 'user':
      case 'steering': {
        const text = textOf(node.content)
        if (text !== '') entries.push({ kind: 'said', id, who: 'user', text })
        break
      }
      case 'assistant': {
        const text = textOf(node.blocks)
        if (text !== '') entries.push({ kind: 'said', id, who: 'agent', text })
        break
      }
      case 'tool-result': {
        const last = entries[entries.length - 1]
        if (last?.kind === 'work') entries[entries.length - 1] = { ...last, count: last.count + 1 }
        else entries.push({ kind: 'work', id, count: 1 })
        break
      }
      case 'turn-error':
      case 'model-retry':
      case 'turn-max-tokens': {
        entries.push({ kind: 'note', id, text: node.kind })
        break
      }
      default:
        // Dividers, compaction markers and context notices carry nothing the
        // compact log needs; the full transcript is where those belong.
        break
    }
  }
  return entries
}
