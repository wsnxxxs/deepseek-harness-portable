/**
 * Material ingest: the single host-side path from a file a person dropped to the
 * extracted markdown and derived structure the teaching layer reads.
 *
 * The model is not involved. It never sees the original bytes, never chooses a
 * parser, and never writes any of these files — which is what lets the preset
 * keep its promise while gaining the ability to read a person's material.
 * @module @dsh-portable/interactive-learning/src/ingest/pipeline
 */

import { copyFile, mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import {
  readManifest,
  readStructure,
  structurePathOf,
  upsertManifestEntry,
  vaultRelative,
  type TopicVault,
} from '../topic-vault.ts'
import { reanchorVaultMemory, type ReanchorOutcome } from '../material-reanchor.ts'
import { emitSource } from './markdown.ts'
import { extensionOf, parseSource, titleOf, SUPPORTED_EXTENSIONS } from './index.ts'
import {
  contentHashOf,
  slugify,
  type ParsedSource,
  type SourceManifestEntry,
  type SourceStructure,
} from './types.ts'

/**
 * Largest source accepted. A parse holds the whole document in memory, and a
 * desktop app that dies on a dropped disk image helps nobody.
 */
export const MAX_SOURCE_BYTES = 64 * 1024 * 1024

/** What one ingest attempt did. */
export type IngestStatus =
  /** Parsed and written. */
  | 'ingested'
  /** Same bytes, same parser version: nothing to redo. */
  | 'unchanged'
  /** No parser owns this extension; nothing was written. */
  | 'unsupported'
  /** Rejected before parsing (too large, unreadable). */
  | 'rejected'

/** Result of one ingest attempt. */
export interface IngestResult {
  status: IngestStatus
  sourceId: string
  title: string
  /** Present unless the source was rejected. */
  entry?: SourceManifestEntry
  /** Present when the source was parsed on this call. */
  structure?: SourceStructure
  /** What happened to stored citations when this source replaced an earlier one. */
  reanchored?: ReanchorOutcome
  /** Human-readable reason, for `rejected` and `unsupported`. */
  reason?: string
}

/** Whether the pipeline has a parser for this file name. */
export function isSupportedSource(fileName: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(extensionOf(fileName))
}

/**
 * Pick a source id that is stable for this file and unique within the vault.
 *
 * Stability matters more than beauty: the id is embedded in every anchor a
 * concept note stores, so re-ingesting the same file must reuse its id, and two
 * different files must never collide onto one. The original path is retained in
 * the manifest only to distinguish two files with the same basename.
 */
async function resolveSourceId(
  vault: TopicVault,
  filePath: string,
  originPath: string,
  contentHash: string,
): Promise<string> {
  const fileName = basename(filePath)
  const base = slugify(titleOf(fileName))
  const manifest = await readManifest(vault)
  const sameName = manifest.sources.filter(entry => entry.originalName === fileName)
  const owner = sameName.find(entry => entry.originPath !== undefined
    && sameOrigin(entry.originPath, originPath)
    && safeSourceId(entry.sourceId))
  if (owner !== undefined) return owner.sourceId
  const sameBytes = sameName.find(entry => entry.contentHash === contentHash && safeSourceId(entry.sourceId))
  if (sameBytes !== undefined) return sameBytes.sourceId
  // Keep old manifests usable; new entries carry originPath and can distinguish
  // same-named files without relying on this compatibility fallback.
  const legacy = sameName.find(entry => entry.originPath === undefined && safeSourceId(entry.sourceId))
  if (legacy !== undefined) return legacy.sourceId
  const taken = new Set(manifest.sources.map(entry => entry.sourceId).filter(safeSourceId))
  if (!taken.has(base)) return base
  for (let ordinal = 2; ordinal < 1000; ordinal += 1) {
    const candidate = `${base}-${ordinal}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

function safeSourceId(value: string): boolean {
  return value !== '' && value === slugify(value)
}

function sameOrigin(left: string, right: string): boolean {
  const normalize = (value: string): string => {
    const resolved = resolve(value)
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved
  }
  return normalize(left) === normalize(right)
}

async function sourceOriginOf(filePath: string): Promise<string> {
  try {
    return await realpath(filePath)
  } catch {
    return resolve(filePath)
  }
}

/**
 * Ingest one material file into a vault.
 *
 * Idempotent by content: the same bytes parsed by the same parser version resolve
 * to `unchanged` without rewriting, so re-dropping a file is free and a parser
 * upgrade is what forces a rebuild.
 * @param vault - The destination vault; its layout must already exist.
 * @param filePath - Absolute path of the file to ingest.
 * @returns what happened, including the manifest entry when one was written.
 */
export async function ingestSource(vault: TopicVault, filePath: string): Promise<IngestResult> {
  const fileName = basename(filePath)
  const title = titleOf(fileName)
  const fallbackSourceId = slugify(title)

  let bytes: Uint8Array
  try {
    const info = await stat(filePath)
    if (!info.isFile()) {
      return { status: 'rejected', sourceId: fallbackSourceId, title, reason: 'not a file' }
    }
    if (info.size > MAX_SOURCE_BYTES) {
      return {
        status: 'rejected',
        sourceId: fallbackSourceId,
        title,
        reason: `the file is ${Math.round(info.size / 1024 / 1024)} MB, over the ${MAX_SOURCE_BYTES / 1024 / 1024} MB limit`,
      }
    }
    bytes = await readFile(filePath)
  } catch (cause) {
    return {
      status: 'rejected',
      sourceId: fallbackSourceId,
      title,
      reason: cause instanceof Error ? cause.message : 'the file could not be read',
    }
  }

  if (!isSupportedSource(fileName)) {
    return {
      status: 'unsupported',
      sourceId: fallbackSourceId,
      title,
      reason: `no parser reads '${extname(fileName) || fileName}'`,
    }
  }

  const contentHash = contentHashOf(bytes)
  const originPath = await sourceOriginOf(filePath)
  const sourceId = await resolveSourceId(vault, filePath, originPath, contentHash)
  const manifest = await readManifest(vault)
  const previous = manifest.sources.find(entry => entry.sourceId === sourceId)
  const parsed: ParsedSource = await parseSource(bytes, fileName, sourceId)
  if (previous?.contentHash === contentHash && previous.parser === parsed.parser) {
    return { status: 'unchanged', sourceId, title, entry: previous }
  }

  const storedName = previous?.sourcePath === undefined || previous.sourcePath === ''
    ? sourceId === fallbackSourceId ? fileName : `${sourceId}${extname(fileName)}`
    : basename(previous.sourcePath)
  const sourcePath = join(vault.sources, storedName)
  await mkdir(vault.sources, { recursive: true })
  if (resolve(sourcePath) !== resolve(filePath)) await copyFile(filePath, sourcePath)

  const extractedAbsolute = join(vault.extracted, `${sourceId}.md`)
  const extractedPath = vaultRelative(vault, extractedAbsolute)
  const { markdown, structure } = emitSource(parsed, extractedPath)

  // Read the outgoing structure before it is overwritten: its quote hashes are
  // what recover a citation whose section was merely retitled in this edition.
  const superseded = await readStructure(vault, sourceId)

  await mkdir(vault.extracted, { recursive: true })
  await writeFile(extractedAbsolute, markdown, 'utf8')
  await mkdir(vault.structure, { recursive: true })
  const structureAbsolute = structurePathOf(vault, sourceId)
  await writeFile(
    structureAbsolute,
    `${JSON.stringify(structure, undefined, 2)}\n`,
    'utf8',
  )

  const entry: SourceManifestEntry = {
    sourceId,
    title: parsed.title,
    originalName: fileName,
    originPath,
    sourcePath: vaultRelative(vault, sourcePath),
    extractedPath,
    structurePath: vaultRelative(vault, structureAbsolute),
    contentHash,
    parser: parsed.parser,
    bytes: bytes.byteLength,
    ingestedAt: new Date().toISOString(),
    degradation: parsed.degradation,
  }
  await upsertManifestEntry(vault, entry)
  const reanchored = await reanchorVaultMemory(vault, superseded, structure)
  return { status: 'ingested', sourceId, title: parsed.title, entry, structure, reanchored }
}

/**
 * Ingest every supported file directly inside a directory.
 *
 * Deliberately shallow: a dropped folder of readings is the case worth serving,
 * while walking a whole tree would pull in whatever else happens to live below
 * it. Unsupported files are reported, not silently skipped, so the coverage the
 * learner is told about matches what was actually read.
 * @param vault - The destination vault.
 * @param directoryPath - Absolute directory to read.
 * @returns one result per entry, in directory order.
 */
export async function ingestDirectory(
  vault: TopicVault,
  directoryPath: string,
): Promise<readonly IngestResult[]> {
  const names = await readdir(directoryPath, { withFileTypes: true })
  const results: IngestResult[] = []
  for (const name of names) {
    if (!name.isFile() || name.name.startsWith('.')) continue
    results.push(await ingestSource(vault, join(directoryPath, name.name)))
  }
  return results
}

/**
 * A one-line coverage statement for an ingest, in the terms the teaching layer
 * must repeat: what was read, and what was not.
 * @param result - One ingest result.
 * @returns a sentence, or `''` when the source parsed cleanly.
 */
export function describeDegradation(result: IngestResult): string {
  const degradation = result.entry?.degradation ?? []
  if (degradation.length === 0) return ''
  const parts: string[] = []
  for (const item of degradation) {
    switch (item.kind) {
      case 'image-only-pages':
        parts.push(`pages ${formatPages(item.pages)} carry no text layer and were not read`)
        break
      case 'multi-column-guess':
        parts.push(`pages ${formatPages(item.pages)} look multi-column, so their reading order may be wrong`)
        break
      case 'formula-dropped':
        parts.push(`${item.count} math runs were flattened to text and may be garbled`)
        break
      case 'truncated':
        parts.push(`reading stopped after page ${item.afterPage} (${item.reason})`)
        break
      case 'unsupported-format':
        parts.push(`the '${item.extension}' format could not be read`)
        break
      case 'parser-unavailable':
        parts.push(`this build cannot read '${item.extension}' (${item.module} is not installed)`)
        break
      case 'empty-source':
        parts.push(item.reason)
        break
    }
  }
  return `${result.title}: ${parts.join('; ')}.`
}

function formatPages(pages: readonly number[]): string {
  const ranges: string[] = []
  let start: number | undefined
  let previous: number | undefined
  for (const page of [...pages].sort((left, right) => left - right)) {
    if (start === undefined || previous === undefined) {
      start = page
      previous = page
      continue
    }
    if (page === previous + 1) {
      previous = page
      continue
    }
    ranges.push(start === previous ? `${start}` : `${start}–${previous}`)
    start = page
    previous = page
  }
  if (start !== undefined && previous !== undefined) {
    ranges.push(start === previous ? `${start}` : `${start}–${previous}`)
  }
  return ranges.join(', ')
}
