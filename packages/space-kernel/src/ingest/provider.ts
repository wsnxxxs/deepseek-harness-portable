/** Source-provider seam for the directory-backed ingest pipeline. */

import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { parseSource } from './index.ts'
import type { ParsedSource } from './types.ts'
import type { Space } from '../space/index.ts'

/** References accepted by the first provider; more kinds can join without changing ingest. */
export interface FileSourceRef {
  kind: 'file'
  path: string
  sourceId?: string
  fileName?: string
}

export type SourceRef = FileSourceRef

export interface AcquiredBytes {
  bytes: Uint8Array
  fileName: string
  sourceId?: string
  originPath?: string
}

export interface SourceProvider {
  readonly id: string
  canHandle(ref: SourceRef): boolean
  acquire(ref: SourceRef, space: Space): Promise<AcquiredBytes>
  parse(acquired: AcquiredBytes): Promise<ParsedSource>
}

/**
 * Adapter around the existing byte parser. The public `ingestSource` function
 * remains the write-and-reanchor entry point; this provider only standardizes
 * acquisition and parsing for future URL/text providers.
 */
export const fileProvider: SourceProvider = Object.freeze({
  id: 'file',
  canHandle: (ref: SourceRef): boolean => ref.kind === 'file',
  async acquire(ref: SourceRef, _space: Space): Promise<AcquiredBytes> {
    return {
      bytes: await readFile(ref.path),
      fileName: ref.fileName ?? basename(ref.path),
      ...(ref.sourceId === undefined ? {} : { sourceId: ref.sourceId }),
      originPath: ref.path,
    }
  },
  async parse(acquired: AcquiredBytes): Promise<ParsedSource> {
    return await parseSource(acquired.bytes, acquired.fileName, acquired.sourceId)
  },
})

export const SOURCE_PROVIDERS = Object.freeze([fileProvider])
