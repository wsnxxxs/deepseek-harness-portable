import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import { LearningActivityBroker } from '../src/broker.ts'
import * as learningAgent from '../src/agent.ts'
import {
  ANCHOR_PATH_SEPARATOR,
  anchorPage,
  anchorTargetsOf,
  formatSectionAnchor,
  parseAnchorText,
  resolveAnchorTarget,
} from '../src/material-anchor.ts'
import {
  formatStudyMapViolations,
  validateStudyMapAgainstVault,
} from '../src/material-validation.ts'
import { describeReanchor, reanchorVaultMemory } from '../src/material-reanchor.ts'
import { ingestSource } from '../src/ingest/pipeline.ts'
import { readLearnerMemory, upsertLearnerConcept, type LearnerConceptRecord } from '../src/learner-memory.ts'
import { ensureVaultLayout, isVaultRoot, readManifest, readStructure, vaultFromRoot, type TopicVault } from '../src/topic-vault.ts'
import {
  LEARNING_MATERIAL_POLICY,
  buildLearningTeachingPolicy,
} from '../src/teaching-policy.ts'
import { VISUAL_PROTOCOL_V4, type LearningStudyMapV4 } from '../src/protocol-current.ts'

const EDITION_ONE = [
  '# 指南',
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

function concept(overrides: Partial<LearnerConceptRecord> = {}): LearnerConceptRecord {
  return {
    conceptSlug: 'closures',
    label: '闭包',
    mastery: 'emerging',
    masteryBasis: 'evidence',
    phase: 'teach',
    gap: 'concept',
    misconceptions: [],
    anchors: [],
    staleAnchors: [],
    evidenceCount: 1,
    due: null,
    updatedAt: '2026-08-20T00:00:00.000Z',
    sessionIds: ['session-1'],
    ...overrides,
  }
}

function studyMap(sections: LearningStudyMapV4['sections']): LearningStudyMapV4 {
  return {
    kind: 'study_map',
    sourceLabel: 'guide',
    sections,
    concepts: [{ id: 'c1', label: '闭包', sectionId: sections[0]?.id ?? 's1' }],
  }
}

describe('anchor round-trip', () => {
  const section = {
    id: 'guide/第3章/3-2-闭包',
    label: '3.2 闭包',
    level: 3,
    headingPath: ['指南', '第3章 作用域', '3.2 闭包'],
    page: 42,
    charCount: 20,
    quoteHash: 'abc123',
    line: 10,
    endLine: 14,
  }

  it('formats and parses back the same heading path and page', () => {
    const anchor = formatSectionAnchor('guide', section)
    expect(anchor).toBe(`guide#指南${ANCHOR_PATH_SEPARATOR}第3章 作用域${ANCHOR_PATH_SEPARATOR}3.2 闭包 (p.42)`)
    const parsed = parseAnchorText(anchor)
    expect(parsed.sourceId).toBe('guide')
    expect(parsed.headingPath).toEqual(['指南', '第3章 作用域', '3.2 闭包'])
    expect(parsed.page).toBe(42)
    expect(anchorPage(anchor)).toBe(42)
  })

  it('omits the page for a source that has none', () => {
    const { page: _page, ...pageless } = section
    expect(formatSectionAnchor('guide', pageless)).not.toContain('p.')
    expect(anchorPage(formatSectionAnchor('guide', pageless))).toBeUndefined()
  })

  it('tolerates an anchor a person typed by hand', () => {
    expect(parseAnchorText('3.2 闭包').headingPath).toEqual(['3.2 闭包'])
    expect(parseAnchorText('').headingPath).toEqual([])
  })
})

describe('study_map grounding', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-studymap-'))
    vault = await ensureVaultLayout(root, '指南')
    const input = join(root, 'guide.md')
    await writeFile(input, EDITION_ONE, 'utf8')
    await ingestSource(vault, input)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  async function anchorFor(label: string): Promise<string> {
    const structure = (await readStructure(vault, 'guide'))!
    const target = anchorTargetsOf(structure).find(candidate => candidate.label === label)!
    return target.page === undefined
      ? `guide#${target.headingPath.join(ANCHOR_PATH_SEPARATOR)}`
      : `guide#${target.headingPath.join(ANCHOR_PATH_SEPARATOR)} (p.${target.page})`
  }

  it('accepts a map whose sections carry real anchors', async () => {
    const map = studyMap([
      { id: 's1', label: '第3章 作用域', anchor: await anchorFor('第3章 作用域') },
      { id: 's2', label: '第4章 异步', anchor: await anchorFor('第4章 异步') },
    ])
    expect(await validateStudyMapAgainstVault(vault, map)).toEqual([])
  })

  it('refuses an invented chapter and names the real ones', async () => {
    const map = studyMap([
      { id: 's1', label: '第9章 内存管理', anchor: 'guide#第9章 内存管理' },
    ])
    const violations = await validateStudyMapAgainstVault(vault, map)
    expect(violations.some(violation => violation.path === 'visual.content.sections[0].anchor')).toBe(true)
    const message = formatStudyMapViolations(violations)
    expect(message).toContain('第9章 内存管理')
    expect(message).toContain('Real sections include')
    expect(message).toContain('learning_material_map')
  })

  it('refuses a section with no anchor at all', async () => {
    const violations = await validateStudyMapAgainstVault(vault, studyMap([
      { id: 's1', label: '第3章 作用域' },
    ]))
    expect(violations[0]?.detail).toContain('has no anchor')
  })

  it('refuses a map whose sourceLabel names no source in the folder', async () => {
    const map: LearningStudyMapV4 = {
      ...studyMap([{ id: 's1', label: '第3章 作用域', anchor: await anchorFor('第3章 作用域') }]),
      sourceLabel: '另一本完全不同的书',
    }
    const violations = await validateStudyMapAgainstVault(map ? vault : vault, map)
    expect(violations.some(violation => violation.path === 'visual.content.sourceLabel')).toBe(true)
  })

  it('accepts the source title as well as its id', async () => {
    const map: LearningStudyMapV4 = {
      ...studyMap([{ id: 's1', label: '第3章 作用域', anchor: await anchorFor('第3章 作用域') }]),
      sourceLabel: 'guide',
    }
    expect(await validateStudyMapAgainstVault(vault, map)).toEqual([])
  })

  it('refuses any map when the folder holds no parsed material', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'dsh-empty-vault-'))
    try {
      const emptyVault = await ensureVaultLayout(empty, '空')
      const violations = await validateStudyMapAgainstVault(emptyVault, studyMap([
        { id: 's1', label: 'Chapter 1', anchor: 'x#Chapter 1' },
      ]))
      expect(violations).toHaveLength(1)
      expect(violations[0]?.detail).toContain('no parsed material')
    } finally {
      await rm(empty, { recursive: true, force: true })
    }
  })

  it('resolves a nested anchor to the deepest matching section', async () => {
    const structure = (await readStructure(vault, 'guide'))!
    const targets = anchorTargetsOf(structure)
    const resolved = resolveAnchorTarget(await anchorFor('3.2 闭包'), targets)
    expect(resolved?.label).toBe('3.2 闭包')
  })

  it('rejects an anchor whose source or page does not match the target', () => {
    const targets = [{
      sourceId: 'guide',
      sectionId: 'guide/scope',
      label: '第3章 作用域',
      headingPath: ['指南', '第3章 作用域'],
      page: 42,
    }]
    expect(resolveAnchorTarget('other#指南 › 第3章 作用域 (p.42)', targets)).toBeUndefined()
    expect(resolveAnchorTarget('guide#指南 › 第3章 作用域 (p.999)', targets)).toBeUndefined()
  })
})

describe('re-anchoring across a reimport', () => {
  let root: string
  let vault: TopicVault
  let input: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-reanchor-'))
    vault = await ensureVaultLayout(root, '指南')
    input = join(root, 'guide.md')
    await writeFile(input, EDITION_ONE, 'utf8')
    await ingestSource(vault, input)
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  async function storeCitation(label: string): Promise<string> {
    const structure = (await readStructure(vault, 'guide'))!
    const section = structure.sections.find(candidate => candidate.label === label)!
    const anchor = formatSectionAnchor('guide', section)
    await upsertLearnerConcept(vault, concept({ anchors: [anchor] }))
    return anchor
  }

  it('leaves a citation alone when the section is unchanged', async () => {
    const anchor = await storeCitation('3.2 闭包')
    await writeFile(input, `${EDITION_ONE}\n## 第5章 新增\n\n新内容。\n`, 'utf8')
    const result = await ingestSource(vault, input)

    expect(result.reanchored?.unchanged).toBe(1)
    expect(result.reanchored?.stale).toBe(0)
    expect((await readLearnerMemory(vault)).concepts[0]?.anchors).toEqual([anchor])
  })

  it('recovers a citation whose section was retitled, using the previous quote hash', async () => {
    await storeCitation('3.2 闭包')
    // Same body text, new heading: the heading path no longer matches.
    await writeFile(input, EDITION_ONE.replace('### 3.2 闭包', '### 3.2 闭包与词法环境'), 'utf8')
    const result = await ingestSource(vault, input)

    expect(result.reanchored?.stale).toBe(0)
    expect(result.reanchored?.moved).toBe(1)
    const stored = (await readLearnerMemory(vault)).concepts[0]!
    expect(stored.anchors[0]).toContain('3.2 闭包与词法环境')
    expect(stored.staleAnchors).toEqual([])
  })

  it('marks a vanished section stale instead of keeping a page that moved', async () => {
    const anchor = await storeCitation('第4章 异步')
    await writeFile(input, EDITION_ONE.split('## 第4章 异步')[0] ?? '', 'utf8')
    const result = await ingestSource(vault, input)

    expect(result.reanchored?.stale).toBe(1)
    const stored = (await readLearnerMemory(vault)).concepts[0]!
    expect(stored.anchors).not.toContain(anchor)
    expect(stored.staleAnchors).toContain(anchor)
    expect(describeReanchor(result.reanchored!, '指南')).toContain('marked stale')

    // The live session may still carry the old anchor on its next prompt. It
    // must not overwrite the reimport's stale decision.
    await upsertLearnerConcept(vault, concept({ anchors: [anchor], updatedAt: '2026-08-26T00:00:00.000Z' }))
    const afterProjection = (await readLearnerMemory(vault)).concepts[0]!
    expect(afterProjection.anchors).not.toContain(anchor)
    expect(afterProjection.staleAnchors).toContain(anchor)
  })

  it('un-marks a stale citation when the section returns in a later edition', async () => {
    const anchor = await storeCitation('第4章 异步')
    await writeFile(input, EDITION_ONE.split('## 第4章 异步')[0] ?? '', 'utf8')
    await ingestSource(vault, input)
    expect((await readLearnerMemory(vault)).concepts[0]?.staleAnchors).toContain(anchor)

    await writeFile(input, EDITION_ONE, 'utf8')
    const restored = await ingestSource(vault, input)
    expect(restored.reanchored?.recovered).toBe(1)
    const stored = (await readLearnerMemory(vault)).concepts[0]!
    expect(stored.staleAnchors).toEqual([])
    expect(stored.anchors.some(item => item.includes('第4章 异步'))).toBe(true)
  })

  it('never touches a citation belonging to another source', async () => {
    await upsertLearnerConcept(vault, concept({ anchors: ['other-book#第1章 引言'] }))
    const second = join(root, 'notes.md')
    await writeFile(second, '# 笔记\n\n正文。\n', 'utf8')
    const result = await ingestSource(vault, second)

    expect(result.reanchored?.stale).toBe(0)
    expect((await readLearnerMemory(vault)).concepts[0]?.anchors).toEqual(['other-book#第1章 引言'])
  })

  it('says nothing when a reimport moved nothing', () => {
    expect(describeReanchor({ moved: 0, unchanged: 3, stale: 0, recovered: 0 }, '指南')).toBe('')
  })
})

describe('learning_visual refuses an ungrounded study map', () => {
  let ctx: Context
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-visual-vault-'))
    const vault = await ensureVaultLayout(root, '指南')
    const input = join(root, 'guide.md')
    await writeFile(input, EDITION_ONE, 'utf8')
    await ingestSource(vault, input)

    ctx = new Context()
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(UserQuestionService)
    ctx.provide('clientModules', {
      graph: () => ({
        rev: 'test',
        entries: [{ id: '@dsh-portable/interactive-learning', url: '/client.js', rev: 'x' }],
      }),
    } as never)
    await ctx.plugin(LearningActivityBroker)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(learningAgent)
  })

  afterEach(async () => {
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
  })

  function agentIn(cwd: string): Agent {
    const log = [
      { type: 'turn/start', seq: 0, time: 0, data: { turn: 1 } },
      {
        type: 'user/message', seq: 1, time: 1,
        data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '讲讲这份材料' }] },
      },
      { type: 'turn/end', seq: 2, time: 2, data: { turn: 1, reason: { kind: 'success' } } },
    ]
    return {
      id: 'visual-agent' as Agent['id'],
      session: {
        id: 'visual-session',
        header: { delegationDepth: 0, cwd },
        snapshotEvents() { return Object.freeze([...log]) },
        append: () => undefined,
      },
    } as unknown as Agent
  }

  async function emitStudyMap(agent: Agent, anchor: string) {
    const selected = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId(`select-${Math.random()}`),
      name: 'learning_visual_select',
      arguments: {
        kind: 'study_map',
        purpose: 'Show the structure of the supplied guide.',
        learnerAction: 'Pick the section you want to start from.',
      },
      agent,
    })
    expect(selected.isError, JSON.stringify(selected.content)).toBe(false)

    return await ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId(`visual-${Math.random()}`),
      name: 'learning_visual',
      arguments: {
        protocol: VISUAL_PROTOCOL_V4,
        title: '指南结构',
        content: {
          kind: 'study_map',
          sourceLabel: 'guide',
          sections: [{ id: 's1', label: '第3章 作用域', anchor }],
          concepts: [{ id: 'c1', label: '作用域', sectionId: 's1' }],
        },
      },
      agent,
    })
  }

  it('rejects a map anchored to a chapter the material does not have', async () => {
    const result = await emitStudyMap(agentIn(root), 'guide#第9章 内存管理')
    expect(result.isError).toBe(true)
    const text = JSON.stringify(result.content)
    expect(text).toContain('not grounded')
    expect(text).toContain('learning_material_map')
  })

  it('accepts the same map once its anchor names a real section', async () => {
    const result = await emitStudyMap(agentIn(root), 'guide#指南 › 第3章 作用域')
    expect(result.isError, JSON.stringify(result.content)).toBe(false)
  })

  it('leaves a study map outside any learning folder untouched', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'dsh-plain-visual-'))
    try {
      // No vault means no parse to check against; the map is a claim about
      // something the learner described, not about a stored source.
      const result = await emitStudyMap(agentIn(plain), 'Chapter 9')
      expect(result.isError, JSON.stringify(result.content)).toBe(false)
    } finally {
      await rm(plain, { recursive: true, force: true })
    }
  })

  it('ingests an attached source before the first learning prompt is assembled', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'dsh-attached-source-'))
    try {
      const attached = join(plain, 'attached.md')
      await writeFile(attached, '# 附件课程\n\n卷积把局部模式汇总成响应。\n', 'utf8')
      const agent = agentIn(plain)
      ctx.emit('agent/inbox/claimed', {
        agent,
        message: {
          id: 'attached-source-message',
          role: 'user',
          source: { kind: 'user' },
          content: [{ type: 'text', text: `教我 @${attached}` }],
        },
        turn: 1,
      } as never)

      const assembly = await ctx.systemPrompt.assemble({ scope: agent, agent })
      const manifest = await readManifest(vaultFromRoot(plain))
      expect(await isVaultRoot(plain)).toBe(true)
      expect(manifest.sources.map(source => source.originalName)).toEqual(['attached.md'])
      expect(assembly.sections.some(section => section.text.includes('Supplied material'))).toBe(true)
    } finally {
      await rm(plain, { recursive: true, force: true })
    }
  })
})

describe('the conditional material policy layer', () => {
  it('is absent for a session with no parsed material', () => {
    expect(buildLearningTeachingPolicy({})).not.toContain('Supplied material')
  })

  it('is injected when the session runs in a vault holding material', () => {
    const policy = buildLearningTeachingPolicy({ material: true })
    expect(policy).toContain(LEARNING_MATERIAL_POLICY)
    expect(policy).toContain('learning_material_map')
    expect(policy).toContain('source_anchors_observed')
  })

  it('requires the coverage boundary to be stated, not implied', () => {
    expect(LEARNING_MATERIAL_POLICY).toContain('coverage line naming what could NOT be read')
    expect(LEARNING_MATERIAL_POLICY).toContain('never present an unread part as covered')
  })

  it('does not restate or weaken the core policy it layers onto', () => {
    // The core already bans inventing source anchors; the layer must not repeat
    // the ban in softer words, which is how a standing policy gets diluted.
    expect(LEARNING_MATERIAL_POLICY).not.toContain('Never invent facts')
    expect(LEARNING_MATERIAL_POLICY.split('\n\n').length).toBeLessThanOrEqual(6)
  })
})
