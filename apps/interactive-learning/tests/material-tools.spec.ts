import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { MATERIAL_TOOL_NAMES, MAX_READ_CHARS } from '../src/material-tools.ts'
import * as materialToolsHost from './material-tools-host.ts'
import { parseFileMentions } from '../src/material-intake.ts'
import { ingestSource } from '../src/ingest/pipeline.ts'
import { sectionIdOf } from '../src/ingest/types.ts'
import { beginMaterialTurn } from '../src/material-receipts.ts'
import { ensureVaultLayout, type TopicVault } from '../src/topic-vault.ts'

const signal = new AbortController().signal

/** An agent whose session reports `cwd` and carries the given user text. */
function agentIn(cwd: string | undefined, userText = 'test input'): Agent {
  const log = [
    { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
    {
      type: 'user/message', seq: 1, time: 1,
      data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: userText }] },
    },
  ]
  return {
    id: 'material-agent' as Agent['id'],
    session: {
      id: 'material-session',
      header: { delegationDepth: 0, ...(cwd === undefined ? {} : { cwd }) },
      get events() { return Object.freeze([...log]) },
    },
  } as unknown as Agent
}

async function call(
  ctx: Context,
  name: string,
  args: Record<string, unknown>,
  agent: Agent,
): Promise<Record<string, unknown>> {
  const result = await ctx.tools.execute({
    signal,
    callId: ToolCallId(`${name}-${Math.random()}`),
    name,
    arguments: args,
    agent,
  })
  expect(result.isError, JSON.stringify(result.content)).toBe(false)
  const [block] = result.content
  return JSON.parse((block as { text: string }).text) as Record<string, unknown>
}

const GUIDE = [
  '# JavaScript 权威指南',
  '',
  '导言。',
  '',
  '## 第3章 作用域',
  '',
  '作用域决定标识符的可见范围。',
  '',
  '### 3.2 闭包',
  '',
  '闭包捕获的是变量绑定，不是值。',
  '',
  '## 第4章 异步',
  '',
  '事件循环按宏任务与微任务调度。',
  '',
].join('\n')

describe('material tools', () => {
  let ctx: Context
  // The context that injected `tools`: a root context does not expose an
  // injected service, so both registration and execution go through this one.
  let host: Context
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-material-'))
    vault = await ensureVaultLayout(root, 'JS 学习')
    const input = join(root, 'js-guide.md')
    await writeFile(input, GUIDE, 'utf8')
    await ingestSource(vault, input)

    ctx = new Context()
    await ctx.plugin(AgentRegistry)
    // ToolRuntime injects `systemPrompt`; without it the tool service never
    // applies and every registration silently waits forever.
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    // Registration goes through an injecting plugin, exactly as the learning
    // agent does: `ctx.tools` resolves only once some plugin has injected it.
    await ctx.plugin(materialToolsHost)
    if (materialToolsHost.mounted === undefined) throw new Error('material tools host did not mount')
    host = materialToolsHost.mounted
  })

  afterEach(async () => {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
  })

  it('registers exactly the four read-only material tools', () => {
    const names = host.tools.schemas().map(tool => tool.name)
    expect(names).toEqual([...MATERIAL_TOOL_NAMES])
    // The preset's promise: no filesystem mutation reaches the model.
    expect(names).not.toContain('write')
    expect(names).not.toContain('edit')
  })

  it('answers no-vault instead of failing when the session is not in a learning folder', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'dsh-outside-'))
    try {
      const value = await call(host, 'learning_material_map', {}, agentIn(outside))
      expect(value.status).toBe('no-vault')
      expect(String(value.detail)).toContain('Do not claim to have read any source')
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })

  it('answers no-vault for a session with no cwd at all', async () => {
    const value = await call(host, 'learning_material_map', {}, agentIn(undefined))
    expect(value.status).toBe('no-vault')
  })

  it('maps the vault to real sources with their top-level sections', async () => {
    const value = await call(host, 'learning_material_map', {}, agentIn(root))
    expect(value.status).toBe('ok')
    expect(value.vault).toBe('JS 学习')
    const sources = value.sources as { sourceId: string; outline: { label: string }[] }[]
    expect(sources).toHaveLength(1)
    expect(sources[0]?.sourceId).toBe('js-guide')
    expect(sources[0]?.outline.map(row => row.label))
      .toEqual(['JavaScript 权威指南', '第3章 作用域', '第4章 异步'])
  })

  it('returns the full section tree for one source', async () => {
    const value = await call(host, 'learning_material_map', { sourceId: 'js-guide' }, agentIn(root))
    const sections = value.sections as { id: string; label: string; anchor: string }[]
    expect(sections.map(row => row.label)).toContain('3.2 闭包')
    expect(value.complete).toBe(true)
    const closure = sections.find(row => row.label === '3.2 闭包')!
    expect(closure.anchor).toContain('js-guide#')
    expect(closure.anchor).toContain('3.2 闭包')
  })

  it('names the known sources when asked for one that does not exist', async () => {
    const value = await call(host, 'learning_material_map', { sourceId: 'nope' }, agentIn(root))
    expect(value.status).toBe('unknown-source')
    expect(value.known).toEqual(['js-guide'])
  })

  it('reads one section, and only that section', async () => {
    const map = await call(host, 'learning_material_map', { sourceId: 'js-guide' }, agentIn(root))
    const sections = map.sections as { id: string; label: string }[]
    const chapter = sections.find(row => row.label === '第3章 作用域')!

    const value = await call(
      ctx,
      'learning_material_read',
      { sourceId: 'js-guide', sectionId: chapter.id },
      agentIn(root),
    )
    expect(value.status).toBe('ok')
    expect(String(value.text)).toContain('作用域决定标识符的可见范围。')
    // The child section is reachable, not inlined: progressive disclosure.
    expect(String(value.text)).not.toContain('闭包捕获的是变量绑定')
    expect((value.children as { label: string }[]).map(child => child.label)).toEqual(['3.2 闭包'])
    expect(value.truncated).toBe(false)
    expect(String(value.anchor)).toContain('第3章 作用域')
  })

  it('reads a known section directly without mapping first', async () => {
    const agent = agentIn(root)
    beginMaterialTurn(agent, 1)
    const value = await call(
      host,
      'learning_material_read',
      {
        sourceId: 'js-guide',
        sectionId: sectionIdOf(['JavaScript 权威指南', '第3章 作用域']),
      },
      agent,
    )
    expect(value.status).toBe('ok')
    expect(String(value.text)).toContain('作用域决定标识符的可见范围。')
    expect(String(value.anchor)).toContain('第3章 作用域')
    expect(String(value.receiptId)).toMatch(/^material-/)
  })

  it('refuses a section id that is not in the structure', async () => {
    const value = await call(
      ctx,
      'learning_material_read',
      { sourceId: 'js-guide', sectionId: 'invented-chapter' },
      agentIn(root),
    )
    expect(value.status).toBe('unknown-section')
    expect(value.known).toBeDefined()
  })

  it('truncates an oversized section rather than flooding the turn', async () => {
    const long = ['# 大文件', '', 'x'.repeat(MAX_READ_CHARS + 500), ''].join('\n')
    const input = join(root, 'long.md')
    await writeFile(input, long, 'utf8')
    await ingestSource(vault, input)

    const value = await call(host, 'learning_material_read', { sourceId: 'long' }, agentIn(root))
    expect(value.truncated).toBe(true)
    expect(String(value.text).length).toBeLessThanOrEqual(MAX_READ_CHARS + 2)
  })

  it('finds a phrase and anchors the hit to its section', async () => {
    const value = await call(host, 'learning_material_search', { query: '变量绑定' }, agentIn(root))
    expect(value.status).toBe('ok')
    const matches = value.matches as { sectionId: string; label: string; anchor: string; preview: string }[]
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0]?.label).toBe('3.2 闭包')
    expect(matches[0]?.preview).toContain('变量绑定')
    expect(matches[0]?.anchor).toContain('js-guide#')
  })

  it('reports an empty query as invalid rather than matching everything', async () => {
    const value = await call(host, 'learning_material_search', { query: '   ' }, agentIn(root))
    expect(value.status).toBe('invalid')
  })

  it('ingests a file the learner attached, and states its coverage', async () => {
    const dropped = join(root, 'extra-notes.md')
    await writeFile(dropped, '# 补充材料\n\n附加内容。\n', 'utf8')

    const value = await call(host, 'learning_material_map', {}, agentIn(root, `请讲讲 @${dropped}`))
    const added = value.added as string[]
    expect(added.some(line => line.includes('extra notes'))).toBe(true)
    const sources = value.sources as { sourceId: string }[]
    expect(sources.map(row => row.sourceId).sort()).toEqual(['extra-notes', 'js-guide'])
  })

  it('ignores an @ mention that is not a real path', async () => {
    const value = await call(host, 'learning_material_map', {}, agentIn(root, 'mail me at @someone please'))
    expect(value.status).toBe('ok')
    expect((value.sources as unknown[]).length).toBe(1)
  })
})

describe('file-mention grammar', () => {
  it('accepts a mention at the start or after whitespace, quoted or bare', () => {
    expect(parseFileMentions('@notes.md and @"my papers/paper one.pdf"'))
      .toEqual(['notes.md', 'my papers/paper one.pdf'])
  })

  it('does not open on an email-like token', () => {
    expect(parseFileMentions('write to someone@example.com')).toEqual([])
  })

  it('strips the directory marker so a folder resolves like a file', () => {
    expect(parseFileMentions('@readings/')).toEqual(['readings'])
  })

  it('deduplicates repeated mentions', () => {
    expect(parseFileMentions('@a.md @a.md')).toEqual(['a.md'])
  })
})
