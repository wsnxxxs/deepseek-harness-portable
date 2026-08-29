/** Persistent chunk storage and a small BM25 inverted index for a Space. */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { chunkSource, type SourceChunk } from './chunker.ts'
import { normalizeQuote, type SourceStructure } from '../ingest/types.ts'
import {
  chunksPathOf,
  containedPath,
  readAllStructures,
  readManifest,
  type TopicVault,
} from '../topic-vault.ts'

export const LEXICAL_INDEX_PROTOCOL = 'dsh-learning-index@1' as const

export interface LexicalDocument {
  sourceId: string
  sectionId: string
  ord: number
  length: number
}

export interface LexicalPosting {
  chunkId: string
  tf: number
}

export interface LexicalIndex {
  protocol: typeof LEXICAL_INDEX_PROTOCOL
  sourceHashes: Readonly<Record<string, string>>
  documents: Readonly<Record<string, LexicalDocument>>
  postings: Readonly<Record<string, readonly LexicalPosting[]>>
  averageDocumentLength: number
}

export interface LexicalSearchHit {
  chunkId: string
  sourceId: string
  sectionId: string
  ord: number
  score: number
  matchedTerms: readonly string[]
}

export interface LexicalSearchOptions {
  sourceIds?: readonly string[]
  limit?: number
}

const K1 = 1.2
const B = 0.75
const LATIN_WORD = /[A-Za-z0-9][A-Za-z0-9'-]*/gu
const CJK_RUN = /[㐀-鿿豈-﫿]+/gu

/** Tokenize Latin words and CJK bigrams without a runtime dictionary. */
export function tokenize(text: string): readonly string[] {
  const normalized = normalizeQuote(text).toLocaleLowerCase()
  const tokens: string[] = []
  for (const match of normalized.matchAll(CJK_RUN)) {
    const run = match[0]
    for (let index = 0; index + 1 < run.length; index += 1) {
      tokens.push(run.slice(index, index + 2))
    }
  }
  for (const match of normalized.matchAll(LATIN_WORD)) {
    if (match[0].length >= 2) tokens.push(match[0])
  }
  return tokens
}

function frequencies(tokens: readonly string[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const token of tokens) result.set(token, (result.get(token) ?? 0) + 1)
  return result
}

function sourceHashesEqual(left: Readonly<Record<string, string>>, right: Readonly<Record<string, string>>): boolean {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) =>
    key === rightKeys[index] && left[key] === right[key])
}

/** Build a BM25 index from chunks. */
export function buildLexicalIndex(
  chunks: readonly SourceChunk[],
  sourceHashes: Readonly<Record<string, string>> = {},
): LexicalIndex {
  const documents: Record<string, LexicalDocument> = {}
  const postings = new Map<string, LexicalPosting[]>()
  let totalLength = 0
  for (const chunk of chunks) {
    const tokenCounts = frequencies(tokenize(chunk.text))
    const length = [...tokenCounts.values()].reduce((sum, value) => sum + value, 0)
    documents[chunk.chunkId] = {
      sourceId: chunk.sourceId,
      sectionId: chunk.sectionId,
      ord: chunk.ord,
      length,
    }
    totalLength += length
    for (const [token, tf] of tokenCounts) {
      const rows = postings.get(token) ?? []
      rows.push({ chunkId: chunk.chunkId, tf })
      postings.set(token, rows)
    }
  }
  const serialized: Record<string, readonly LexicalPosting[]> = {}
  for (const [token, rows] of postings) serialized[token] = rows
  return {
    protocol: LEXICAL_INDEX_PROTOCOL,
    sourceHashes: { ...sourceHashes },
    documents,
    postings: serialized,
    averageDocumentLength: chunks.length === 0 ? 0 : totalLength / chunks.length,
  }
}

/** Search an index with BM25 and return the best chunk locators. */
export function searchLexicalIndex(
  index: LexicalIndex,
  terms: readonly string[],
  options: LexicalSearchOptions = {},
): readonly LexicalSearchHit[] {
  const queryTokens = [...new Set(terms.flatMap(tokenize))]
  if (queryTokens.length === 0 || index.averageDocumentLength <= 0) return []
  const allowed = options.sourceIds === undefined ? undefined : new Set(options.sourceIds)
  const scores = new Map<string, number>()
  const tokenHits = new Map<string, Set<string>>()
  const documentCount = Object.keys(index.documents).length
  for (const token of queryTokens) {
    const rows = index.postings[token] ?? []
    if (rows.length === 0) continue
    const idf = Math.log(1 + (documentCount - rows.length + 0.5) / (rows.length + 0.5))
    const matched = new Set<string>()
    for (const row of rows) {
      const document = index.documents[row.chunkId]
      if (document === undefined || (allowed !== undefined && !allowed.has(document.sourceId))) continue
      const denominator = row.tf + K1 * (1 - B + B * document.length / index.averageDocumentLength)
      const contribution = idf * (row.tf * (K1 + 1)) / denominator
      scores.set(row.chunkId, (scores.get(row.chunkId) ?? 0) + contribution)
      matched.add(row.chunkId)
    }
    tokenHits.set(token, matched)
  }

  const results: LexicalSearchHit[] = []
  for (const [chunkId, score] of scores) {
    const document = index.documents[chunkId]
    if (document === undefined) continue
    const matchedTerms = terms.filter(term => term.trim() !== ''
      && [...tokenize(term)].some(token => tokenHits.get(token)?.has(chunkId)))
    if (matchedTerms.length === 0) continue
    results.push({ chunkId, ...document, score, matchedTerms })
  }
  results.sort((left, right) => right.score - left.score || left.ord - right.ord)
  return results.slice(0, options.limit ?? 60)
}

export function lexicalIndexPathOf(vault: TopicVault): string {
  return join(vault.libraryIndex, 'postings.json')
}

/** Write one source's derived chunk stream. */
export async function writeSourceChunks(vault: TopicVault, sourceId: string, chunks: readonly SourceChunk[]): Promise<void> {
  const path = await containedPath(vault, chunksPathOf(vault, sourceId))
  await mkdir(vault.chunks, { recursive: true })
  await writeFile(path, chunks.map(chunk => JSON.stringify(chunk)).join('\n') + (chunks.length === 0 ? '' : '\n'), 'utf8')
}

/** Read one source's derived chunk stream; malformed cache lines are skipped. */
export async function readSourceChunks(vault: TopicVault, sourceId: string): Promise<readonly SourceChunk[]> {
  try {
    const path = await containedPath(vault, chunksPathOf(vault, sourceId))
    const lines = (await readFile(path, 'utf8')).split('\n')
    const chunks: SourceChunk[] = []
    for (const line of lines) {
      if (line.trim() === '') continue
      try {
        const parsed = JSON.parse(line) as Partial<SourceChunk>
        if (typeof parsed.chunkId !== 'string' || typeof parsed.sourceId !== 'string'
          || typeof parsed.sectionId !== 'string' || typeof parsed.text !== 'string'
          || typeof parsed.ord !== 'number' || typeof parsed.anchor !== 'string'
          || typeof parsed.quoteHash !== 'string') continue
        chunks.push(parsed as SourceChunk)
      } catch {
        continue
      }
    }
    return chunks
  } catch {
    return []
  }
}

async function readStoredIndex(vault: TopicVault): Promise<LexicalIndex | undefined> {
  try {
    const parsed = JSON.parse(await readFile(await containedPath(vault, lexicalIndexPathOf(vault)), 'utf8')) as Partial<LexicalIndex>
    if (parsed.protocol !== LEXICAL_INDEX_PROTOCOL || parsed.sourceHashes === undefined
      || parsed.documents === undefined || parsed.postings === undefined
      || typeof parsed.averageDocumentLength !== 'number') return undefined
    return parsed as LexicalIndex
  } catch {
    return undefined
  }
}

async function writeStoredIndex(vault: TopicVault, index: LexicalIndex): Promise<void> {
  await mkdir(vault.libraryIndex, { recursive: true })
  await writeFile(await containedPath(vault, lexicalIndexPathOf(vault)), `${JSON.stringify(index, undefined, 2)}\n`, 'utf8')
}

async function chunksForStructure(vault: TopicVault, structure: SourceStructure): Promise<readonly SourceChunk[]> {
  const stored = await readSourceChunks(vault, structure.sourceId)
  if (stored.length > 0) return stored
  try {
    const extracted = await containedPath(vault, structure.extractedPath)
    const chunks = chunkSource(structure, (await readFile(extracted, 'utf8')).split('\n'))
    await writeSourceChunks(vault, structure.sourceId, chunks)
    return chunks
  } catch {
    return []
  }
}

/** Load a valid index or rebuild the derived caches when a source changed. */
export async function ensureLexicalIndex(vault: TopicVault): Promise<LexicalIndex> {
  const manifest = await readManifest(vault)
  const sourceHashes = Object.fromEntries(manifest.sources.map(entry => [entry.sourceId, entry.contentHash]))
  const stored = await readStoredIndex(vault)
  if (stored !== undefined && sourceHashesEqual(stored.sourceHashes, sourceHashes)) return stored

  const structures = await readAllStructures(vault)
  const chunks: SourceChunk[] = []
  for (const structure of structures) chunks.push(...await chunksForStructure(vault, structure))
  const index = buildLexicalIndex(chunks, sourceHashes)
  await writeStoredIndex(vault, index)
  return index
}

/**
 * Replace one source in an existing index after ingest. If no index exists yet,
 * leave it for the lazy full build so ingest remains as reliable as before.
 */
export async function updateLexicalIndex(
  vault: TopicVault,
  sourceId: string,
  contentHash: string,
  chunks: readonly SourceChunk[],
): Promise<void> {
  const current = await readStoredIndex(vault)
  if (current === undefined) return
  const kept = Object.entries(current.documents)
    .filter(([, document]) => document.sourceId !== sourceId)
  const keptIds = new Set(kept.map(([chunkId]) => chunkId))
  const documents: Record<string, LexicalDocument> = Object.fromEntries(kept)
  const postings: Record<string, LexicalPosting[]> = {}
  for (const [token, rows] of Object.entries(current.postings)) {
    const retained = rows.filter(row => keptIds.has(row.chunkId))
    if (retained.length > 0) postings[token] = retained
  }
  for (const chunk of chunks) {
    const counts = frequencies(tokenize(chunk.text))
    const length = [...counts.values()].reduce((sum, value) => sum + value, 0)
    documents[chunk.chunkId] = { sourceId: chunk.sourceId, sectionId: chunk.sectionId, ord: chunk.ord, length }
    for (const [token, tf] of counts) (postings[token] ??= []).push({ chunkId: chunk.chunkId, tf })
  }
  const totalLength = Object.values(documents).reduce((sum, document) => sum + document.length, 0)
  const next: LexicalIndex = {
    protocol: LEXICAL_INDEX_PROTOCOL,
    sourceHashes: { ...current.sourceHashes, [sourceId]: contentHash },
    documents,
    postings,
    averageDocumentLength: Object.keys(documents).length === 0 ? 0 : totalLength / Object.keys(documents).length,
  }
  await writeStoredIndex(vault, next)
}
