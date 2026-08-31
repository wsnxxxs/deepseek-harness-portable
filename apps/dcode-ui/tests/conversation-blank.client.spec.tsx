// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ConversationNode, ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionListState, SessionSnapshot } from '@deepseek-ai/dsh-api-session-controller/client'
import { useConversationBlank } from '../src/client/state/hooks.ts'
import { DcodeRuntimeProvider, EMPTY_CHAT_SNAPSHOT, type DcodeRuntime, type Observable } from '../src/client/state/runtime.ts'

let root: ReturnType<typeof createRoot> | undefined

afterEach(() => {
  act(() => { root?.unmount() })
  root = undefined
})

function createMockRuntime(options: {
  sessionId?: SessionId
  blank?: boolean
  nodes?: readonly ConversationNode[]
  partial?: unknown
  runningCalls?: readonly unknown[]
}): DcodeRuntime {
  const sessionId = options.sessionId ?? ('test-session' as SessionId)
  const isBlank = options.blank ?? true
  const listState: SessionListState = {
    ids: [sessionId],
    byId: {
      [sessionId]: {
        id: sessionId,
        displayTitle: 'Test Session',
        cwd: '/test',
        updatedAt: Date.now(),
        blank: isBlank,
        running: false,
        origin: 'user',
        workspaceId: 'ws-1',
      },
    },
    current: sessionId,
    phase: 'ready',
    state: 'idle',
    error: null,
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }

  const sessionSnapshot: SessionSnapshot = {
    sessionId,
    title: 'Test Session',
    blank: isBlank,
    running: false,
    hasMore: false,
    loadingOlder: false,
    queue: [],
    pendingSubmissions: [],
  }

  const chatSnapshot: ChatSnapshot = {
    ...EMPTY_CHAT_SNAPSHOT,
    legacy: {
      nodes: options.nodes ?? [],
      turnTimings: new Map(),
      turnEnds: new Map(),
      partial: (options.partial as ChatSnapshot['legacy']['partial']) ?? null,
      runningCalls: (options.runningCalls as ChatSnapshot['legacy']['runningCalls']) ?? [],
    },
  }

  const observableList: Observable<SessionListState> = {
    getSnapshot: () => listState,
    subscribe: () => () => {},
  }

  const observableSession: Observable<SessionSnapshot> = {
    getSnapshot: () => sessionSnapshot,
    subscribe: () => () => {},
  }

  const observableChat: Observable<ChatSnapshot> = {
    getSnapshot: () => chatSnapshot,
    subscribe: () => () => {},
  }

  return {
    sessions: {
      list: observableList,
      binding: () => ({
        session: observableSession,
      }),
    },
    chatFeed: () => observableChat,
    binding: () => ({
      session: observableSession,
    }),
  } as unknown as DcodeRuntime
}

function renderHook(runtime: DcodeRuntime, sessionId: SessionId | undefined): { current: boolean } {
  const result = { current: false }
  function TestComponent(): null {
    result.current = useConversationBlank(sessionId)
    return null
  }

  const host = document.createElement('div')
  root = createRoot(host)
  act(() => {
    root!.render(
      <DcodeRuntimeProvider value={runtime}>
        <TestComponent />
      </DcodeRuntimeProvider>,
    )
  })
  return result
}

describe('useConversationBlank', () => {
  it('returns true when sessionId is undefined', () => {
    const runtime = createMockRuntime({})
    const result = renderHook(runtime, undefined)
    expect(result.current).toBe(true)
  })

  it('returns true for a fresh session with no nodes', () => {
    const sessionId = 'new-session' as SessionId
    const runtime = createMockRuntime({ sessionId, blank: true, nodes: [] })
    const result = renderHook(runtime, sessionId)
    expect(result.current).toBe(true)
  })

  it('returns true for a session containing only standalone command nodes', () => {
    const sessionId = 'session-with-commands' as SessionId
    const commandNodes: ConversationNode[] = [
      {
        id: 'cmd-1',
        seq: 1,
        kind: 'command',
        name: 'permission',
        args: 'workspace-write',
      } as unknown as ConversationNode,
      {
        id: 'cmd-2',
        seq: 2,
        kind: 'command',
        name: 'permission',
        args: 'read-only',
      } as unknown as ConversationNode,
    ]
    const runtime = createMockRuntime({ sessionId, blank: true, nodes: commandNodes })
    const result = renderHook(runtime, sessionId)
    expect(result.current).toBe(true)
  })

  it('returns false when a user message node is present', () => {
    const sessionId = 'engaged-session' as SessionId
    const userNodes: ConversationNode[] = [
      {
        id: 'user-1',
        seq: 1,
        kind: 'user',
        content: [{ type: 'text', text: 'Hello' }],
      } as unknown as ConversationNode,
    ]
    const runtime = createMockRuntime({ sessionId, blank: false, nodes: userNodes })
    const result = renderHook(runtime, sessionId)
    expect(result.current).toBe(false)
  })

  it('returns false when summary.blank is false', () => {
    const sessionId = 'past-session' as SessionId
    const runtime = createMockRuntime({ sessionId, blank: false, nodes: [] })
    const result = renderHook(runtime, sessionId)
    expect(result.current).toBe(false)
  })

  it('returns false when partial streaming content is present', () => {
    const sessionId = 'streaming-session' as SessionId
    const runtime = createMockRuntime({
      sessionId,
      blank: true,
      nodes: [],
      partial: { text: 'Thinking...' },
    })
    const result = renderHook(runtime, sessionId)
    expect(result.current).toBe(false)
  })
})
