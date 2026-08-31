// @vitest-environment jsdom

import { StrictMode, act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MessageFeedbackInjected, MessageFeedbackView } from '@deepseek-ai/dsh-client-ui-message-feedback/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useMessageFeedback, type MessageFeedbackProvider } from '../src/client/chat/message-feedback.ts'

const SESSION = 'empty-session' as SessionId
let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => { root?.unmount() })
  root = undefined
})

describe('DCode message feedback', () => {
  it('mounts an empty Session without a render loop and delegates to the official slot face', async () => {
    const view: MessageFeedbackView = { status: 'cold', items: new Map(), error: null }
    const ensure = vi.fn(async () => ({ ok: true as const }))
    const entry = {
      hooks: {
        feedback: {
          getSnapshot: () => view,
          subscribe: () => () => {},
        },
      },
      ensure,
      rate: vi.fn(),
      toggle: vi.fn(),
      clearNote: vi.fn(),
      clear: vi.fn(),
    } as unknown as MessageFeedbackInjected
    const provider: MessageFeedbackProvider = { for: () => entry }
    let renders = 0

    function EmptySession(): null {
      const feedback = useMessageFeedback(provider, SESSION)
      renders += 1
      // Mirrors the first hover/focus. StrictMode deliberately runs this
      // effect twice, which must still collapse onto one controller read.
      useEffect(feedback.ensure, [feedback.ensure])
      return null
    }

    const host = document.createElement('div')
    root = createRoot(host)
    await act(async () => {
      root!.render(<StrictMode><EmptySession /></StrictMode>)
      await Promise.resolve()
    })

    expect(ensure).toHaveBeenCalled()
    expect(renders).toBeLessThan(10)
  })
})
