// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { VaultKeepAction } from '../src/client/VaultKeep.tsx'
import { NotesSection, type Note } from '../src/client/VaultNotes.tsx'
import { en } from '../src/client/locales.ts'

const t = ((key: keyof typeof en, params?: Record<string, string | number>) => {
  let value = en[key]
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replace(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<'interactive-learning'>

const Keep = VaultKeepAction as unknown as ComponentType<Record<string, unknown>>
const Notes = NotesSection as unknown as ComponentType<Record<string, unknown>>

function note(overrides: Partial<Note> = {}): Note {
  return {
    noteSlug: 'blocked-draft',
    kind: 'pending-concept',
    title: '卷积草稿',
    body: '我的解释',
    excerpt: '我的解释',
    path: 'notes/blocked-draft.md',
    conceptSlug: 'convolution',
    gate: 'blocked',
    sourceSessionId: 'session-1',
    sourceMessageId: 'message-1',
    promotedTo: null,
    createdAt: '2026-08-27T00:00:00.000Z',
    updatedAt: '2026-08-27T00:00:00.000Z',
    ...overrides,
  }
}

afterEach(() => { cleanup() })

describe('vault action copy and controls', () => {
  it('keeps only actionable save destinations in the conversation sheet', () => {
    const session = {
      nodes: [{
        kind: 'assistant',
        messageId: 'message-1',
        blocks: [{ kind: 'text', text: '卷积是滑窗逐点相乘求和。' }],
      }],
    }
    const useSession = (select: (value: typeof session) => string): string => select(session)

    render(
      <Keep
        messageId="message-1"
        useSession={useSession}
        sessionId="session-1"
        cwd="/vault"
        call={vi.fn()}
        t={t}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: en.vaultKeep }))

    const sheet = screen.getByRole('dialog', { name: en.vaultKeepTitle })
    expect(screen.getByRole('button', { name: en.vaultKeepAsNote })).toBeTruthy()
    expect(screen.getByRole('button', { name: en.vaultKeepAsPending })).toBeTruthy()
    expect(sheet.parentElement).toBe(document.body)
    expect(screen.getByRole('button', { name: en.vaultKeep }).getAttribute('aria-expanded')).toBe('true')
    expect(screen.queryByRole('button', { name: /concept card/i })).toBeNull()
    expect(screen.getByText(en.vaultKeepAsCardHint)).toBeTruthy()
    expect(screen.queryByText(en.vaultLocalOnly)).toBeNull()
  })
})

describe('pending note controls', () => {
  it('shows the blocked state without a disabled action and keeps ready merge', () => {
    render(
      <Notes
        list={{
          status: 'ok',
          notes: [
            note(),
            note({
              noteSlug: 'ready-draft',
              title: '可并入草稿',
              path: 'notes/ready-draft.md',
              gate: 'ready',
            }),
          ],
          pending: 2,
          blocked: 1,
        }}
        ask={vi.fn(async () => undefined)}
        onChanged={() => {}}
        onRemoved={() => {}}
        onCreated={() => {}}
        onConcept={() => {}}
        t={t}
      />,
    )

    expect(screen.getByText(en.vaultNoteGateBlocked)).toBeTruthy()
    expect(screen.getByText(en.vaultNotesPendingHint)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /not met/i })).toBeNull()
    expect(screen.getByRole('button', { name: en.vaultNotePromote })).toBeTruthy()
    expect(screen.queryByText(en.vaultNotePromoteHint)).toBeNull()
    expect(screen.queryByText(en.vaultLocalOnly)).toBeNull()
  })
})
