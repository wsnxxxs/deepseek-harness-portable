import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ensureLexicalIndex, readSourceChunks, searchLexicalIndex } from '../src/index/lexical.ts'
import { ingestSource } from '../src/ingest/pipeline.ts'
import { retrieve } from '../src/retrieval/index.ts'
import { ensureVaultLayout, readManifest, type TopicVault } from '../src/topic-vault.ts'
import { spaceScope } from '../src/vault-rpc.ts'

describe('Library Space derived layer', () => {
  let root: string
  let vault: TopicVault

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'dsh-library-space-'))
    vault = await ensureVaultLayout(root, '资料库')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('creates canonical Space metadata while retaining the legacy manifest', async () => {
    const space = JSON.parse(await readFile(vault.spaceManifestPath, 'utf8')) as { protocol: string; sources: unknown[] }
    const legacy = JSON.parse(await readFile(vault.manifestPath, 'utf8')) as { protocol: string }
    expect(space.protocol).toBe('dsh-learning-space@2')
    expect(space.sources).toEqual([])
    expect(legacy.protocol).toBe('dsh-learning-vault@1')
  })

  it('retrieves the tail of a long section through bounded chunks and BM25', async () => {
    const input = join(root, 'long.md')
    const body = Array.from({ length: 80 }, (_unused, index) => `第${String(index)}段：闭包会保留变量绑定。`).join('\n\n')
      + '\n\n尾部信号说明了异步回调仍然使用同一个绑定。'
    await writeFile(input, `# 长文\n\n${body}\n`, 'utf8')
    await ingestSource(vault, input)

    const chunks = await readSourceChunks(vault, 'long')
    const index = await ensureLexicalIndex(vault)
    const hits = searchLexicalIndex(index, ['尾部信号'])
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every(chunk => chunk.text.length <= 1_200)).toBe(true)
    expect(hits.length).toBeGreaterThan(0)
    expect(chunks.find(chunk => chunk.chunkId === hits[0]?.chunkId)?.text).toContain('尾部信号')
  })

  it('persists and applies an explicit grounding scope to generic retrieval', async () => {
    for (const [name, text] of [['one.md', 'alpha-only'], ['two.md', 'beta-only']] as const) {
      const input = join(root, name)
      await writeFile(input, `# ${name}\n\n${text}\n`, 'utf8')
      await ingestSource(vault, input)
    }

    const scope = await spaceScope(vault, ['one'])
    expect(scope.selectedSourceIds).toEqual(['one'])
    expect((await readManifest(vault)).activeSourceIds).toEqual(['one'])
    expect((await retrieve({ space: vault, query: 'beta-only' })).passages).toEqual([])
    expect((await retrieve({ space: vault, query: 'alpha-only' })).passages[0]?.sourceId).toBe('one')
  })
})
