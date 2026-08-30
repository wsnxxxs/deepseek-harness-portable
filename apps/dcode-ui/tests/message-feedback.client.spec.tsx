// @vitest-environment jsdom

import { StrictMode, act, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MessageFeedbackRemote } from '@deepseek-ai/dsh-client-ui-message-feedback/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { useMessageFeedback } from '../src/client/chat/message-feedback.ts'

const SESSION = 'empty-session' as SessionId
let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => { root?.unmount() })
  root = undefined
})

describe('DCode message feedback', () => {
  it('mounts an empty Session without a render loop and lists at most once', async () => {
    const list = vi.fn(async () => ({
      ok: true as const,
      value: { ok: true as const, value: { items: [] } },
    }))
    const remote = {
      list,
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as MessageFeedbackRemote
    let renders = 0

    function EmptySession(): null {
      const feedback = useMessageFeedback(remote, SESSION)
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

    expect(list).toHaveBeenCalledTimes(1)
    expect(renders).toBeLessThan(10)
  })
})
