/** Durable memory adapter for the DCode Agent and workflow settings page. */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { DatabaseSync } from 'node:sqlite'
import { join, resolve } from 'node:path'

export type DcodeMemoryPhase = 'idle' | 'extracting' | 'error' | 'disabled'
export type DcodeMemoryKind = 'preference' | 'fact' | 'procedure' | 'failure'
export type DcodeMemoryCategory =
  | 'project_conventions'
  | 'workflows_and_commands'
  | 'known_failures_and_fixes'
  | 'user_preferences'

export interface DcodeMemoryState {
  readonly enabled: boolean
  readonly phase: DcodeMemoryPhase
  readonly globalCount: number
  readonly projectCount: number
  readonly pendingJobs: number
  readonly lastRunAt?: string
  readonly lastRunProcessed?: number
  readonly lastRunAdded?: number
  readonly lastRunSkipped?: number
  readonly lastExtractionMethod?: 'heuristic' | 'none'
  readonly error?: string
  readonly extractingTotal?: number
  readonly extractingProcessed?: number
  readonly extractingAdded?: number
  readonly extractingSkipped?: number
}

export interface DcodeMemoryRecord {
  readonly id: string
  readonly scope: 'global' | 'project'
  readonly category: DcodeMemoryCategory
  readonly kind: DcodeMemoryKind
  readonly content: string
  readonly sourceSessionIds: readonly string[]
  readonly updatedAt: string
}

export interface DcodeMemorySearchValue {
  readonly items: readonly (DcodeMemoryRecord & { readonly snippet: string })[]
  readonly state: DcodeMemoryState
}

/** Minimal logical-corpus face supplied by DSH's existing session-query service. */
export interface DcodeMemorySessionSource {
  listSessions(signal?: AbortSignal): Promise<readonly DcodeMemorySessionRecord[]>
  readSession(sessionId: string): Promise<DcodeMemorySessionLog>
}

export interface DcodeMemorySessionRecord {
  readonly header: { readonly id: string; readonly cwd?: string }
}

export interface DcodeMemorySessionLog {
  readonly session: { readonly id: string; readonly cwd?: string }
  readonly events: readonly unknown[]
}

export interface DcodeMemoryService {
  getState(cwd?: string): DcodeMemoryState
  setEnabled(enabled: boolean): DcodeMemoryState
  search(query: string, cwd?: string, limit?: number): DcodeMemorySearchValue
  run(cwd?: string, signal?: AbortSignal): Promise<DcodeMemoryState>
  abort(): DcodeMemoryState
  reset(): DcodeMemoryState
  forget(id: string): DcodeMemoryState
  markPending(sessionId: string): void
  dispose(): void
}

const SECRET = /(?:\b(?:sk|rk|pk)_[A-Za-z0-9_-]{16,}\b|\b(?:api[_-]?key|authorization|password|token)\s*[:=]\s*[^\s,;]+)/giu
const MAX_SESSIONS_PER_RUN = 500
const MAX_CANDIDATES_PER_SESSION = 12
const MAX_RECORD_LENGTH = 800

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 20)
}

function now(): string {
  return new Date().toISOString()
}

function redact(value: string): string {
  return value.replace(SECRET, '[redacted]').replace(/\0/g, '').trim()
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function textValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join('\n')
  const record = objectValue(value)
  if (record === undefined) return ''
  if (record.type === 'reasoning') return ''
  if (typeof record.text === 'string') return record.text
  if (record.type === 'text' && typeof record.value === 'string') return record.value
  if (record.content !== undefined) return textValue(record.content)
  if (record.message !== undefined) return textValue(record.message)
  return ''
}

function eventText(event: unknown): { role: 'user' | 'assistant' | 'tool'; text: string } | undefined {
  const record = objectValue(event)
  if (record === undefined || typeof record.type !== 'string') return undefined
  const data = objectValue(record.data)
  if (data === undefined) return undefined
  if (record.type === 'user/message') return { role: 'user', text: textValue(data.content) }
  if (record.type === 'assistant/message') return { role: 'assistant', text: textValue(data.message) }
  if (record.type === 'tool/result') {
    const message = textValue(data.message)
    const error = objectValue(data.error)
    const errorText = error === undefined ? '' : textValue(error.message) || textValue(error.name)
    return { role: 'tool', text: [message, errorText].filter(Boolean).join('\n') }
  }
  return undefined
}

function durableCandidate(role: 'user' | 'assistant' | 'tool', source: string): {
  kind: DcodeMemoryKind
  category: DcodeMemoryCategory
  content: string
} | undefined {
  const content = redact(source).replace(/\s+/gu, ' ').trim().slice(0, MAX_RECORD_LENGTH)
  if (content.length < 10) return undefined
  if (role === 'user') {
    if (!/(?:必须|不要|不应|请使用|请保持|偏好|习惯|默认|始终|always|never|prefer|must|should|do not|don't)/iu.test(content)) {
      return undefined
    }
    const preference = /(?:偏好|习惯|prefer|always|never|don't|不要)/iu.test(content)
    return {
      kind: preference ? 'preference' : 'procedure',
      category: preference ? 'user_preferences' : 'project_conventions',
      content,
    }
  }
  if (role === 'assistant' && /(?:已修复|修复了|解决|回归|fixed|resolved|workaround|error|failed|失败|报错)/iu.test(content)) {
    return { kind: 'failure', category: 'known_failures_and_fixes', content }
  }
  if (role === 'tool' && /(?:error|failed|failure|失败|报错)/iu.test(content)) {
    return { kind: 'failure', category: 'known_failures_and_fixes', content }
  }
  return undefined
}

function projectRoot(cwd: string | undefined): string | undefined {
  if (cwd === undefined || cwd.trim() === '') return undefined
  let current = resolve(cwd)
  while (true) {
    if (existsSync(join(current, '.git'))) return current
    const parent = resolve(current, '..')
    if (parent === current) return current
    current = parent
  }
}

function projectKey(cwd: string | undefined): string | null {
  const root = projectRoot(cwd)
  return root === undefined ? null : hash(`project:${root.toLowerCase()}`)
}

function sessionIdOf(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function parseSourceIds(value: unknown): string[] {
  if (typeof value !== 'string') return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function metaNumber(meta: Map<string, string>, key: string): number | undefined {
  const value = Number(meta.get(key))
  return Number.isFinite(value) ? value : undefined
}

/**
 * Small durable coordinator built on the same session corpus as the rest of
 * DSH. It keeps memory as advisory data: only explicit durable-looking
 * instructions and verified failures are promoted, and secrets are redacted.
 */
export class DcodeMemoryStore implements DcodeMemoryService {
  private readonly db: DatabaseSync
  private readonly source: () => DcodeMemorySessionSource | undefined
  private running = false
  private runController: AbortController | undefined
  private timer: ReturnType<typeof setTimeout> | undefined
  private extracting?: { total: number; processed: number; added: number; skipped: number }

  constructor(options: { readonly root: string; readonly source: () => DcodeMemorySessionSource | undefined }) {
    this.source = options.source
    mkdirSync(options.root, { recursive: true })
    this.db = new DatabaseSync(join(options.root, 'state.sqlite'))
    this.db.exec(`
      PRAGMA busy_timeout=5000;
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS memory_records (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        project_key TEXT,
        category TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        source_session_ids TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memory_jobs (
        session_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memory_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(id UNINDEXED, content);
    `)
  }

  getState(cwd?: string): DcodeMemoryState {
    const meta = this.readMeta()
    const enabled = meta.get('enabled') !== 'false'
    const key = projectKey(cwd)
    const total = this.db.prepare('SELECT count(*) AS count FROM memory_records').get() as { count?: number }
    const project = key === null
      ? { count: 0 }
      : this.db.prepare('SELECT count(*) AS count FROM memory_records WHERE project_key = ?').get(key) as { count?: number }
    const pending = this.db.prepare("SELECT count(*) AS count FROM memory_jobs WHERE status = 'pending'").get() as { count?: number }
    const state: DcodeMemoryState = {
      enabled,
      phase: !enabled ? 'disabled' : this.running ? 'extracting' : meta.get('error') === undefined ? 'idle' : 'error',
      globalCount: Number(total.count ?? 0) - Number(project.count ?? 0),
      projectCount: Number(project.count ?? 0),
      pendingJobs: Number(pending.count ?? 0),
      ...(meta.get('lastRunAt') === undefined ? {} : { lastRunAt: meta.get('lastRunAt') }),
      ...(metaNumber(meta, 'lastRunProcessed') === undefined ? {} : { lastRunProcessed: metaNumber(meta, 'lastRunProcessed') }),
      ...(metaNumber(meta, 'lastRunAdded') === undefined ? {} : { lastRunAdded: metaNumber(meta, 'lastRunAdded') }),
      ...(metaNumber(meta, 'lastRunSkipped') === undefined ? {} : { lastRunSkipped: metaNumber(meta, 'lastRunSkipped') }),
      lastExtractionMethod: meta.get('lastExtractionMethod') === 'heuristic' ? 'heuristic' : 'none',
      ...(meta.get('error') === undefined ? {} : { error: meta.get('error') }),
      ...(this.extracting === undefined ? {} : {
        extractingTotal: this.extracting.total,
        extractingProcessed: this.extracting.processed,
        extractingAdded: this.extracting.added,
        extractingSkipped: this.extracting.skipped,
      }),
    }
    return state
  }

  setEnabled(enabled: boolean): DcodeMemoryState {
    this.writeMeta('enabled', String(enabled))
    if (!enabled) this.abort()
    return this.getState()
  }

  search(query: string, cwd?: string, limit = 50): DcodeMemorySearchValue {
    const state = this.getState(cwd)
    if (!state.enabled) return { items: [], state }
    const needle = query.trim().toLocaleLowerCase()
    if (needle === '') return { items: [], state }
    const key = projectKey(cwd)
    const rows = key === null
      ? this.db.prepare('SELECT * FROM memory_records ORDER BY updated_at DESC LIMIT 500').all()
      : this.db.prepare("SELECT * FROM memory_records WHERE project_key = ? OR scope = 'global' ORDER BY updated_at DESC LIMIT 500").all(key)
    const items = (rows as Array<Record<string, unknown>>)
      .filter(row => typeof row.content === 'string' && row.content.toLocaleLowerCase().includes(needle))
      .slice(0, Math.max(1, Math.min(100, limit)))
      .map(row => this.recordFromRow(row))
      .map(record => ({ ...record, snippet: record.content.slice(0, 240) }))
    return { items, state: this.getState(cwd) }
  }

  async run(cwd?: string, signal?: AbortSignal): Promise<DcodeMemoryState> {
    const state = this.getState(cwd)
    if (!state.enabled || this.running) return state
    const source = this.source()
    if (source === undefined) throw new Error('memory session source is unavailable')
    const controller = new AbortController()
    const abort = (): void => { controller.abort() }
    signal?.addEventListener('abort', abort, { once: true })
    this.running = true
    this.runController = controller
    this.extracting = { total: 0, processed: 0, added: 0, skipped: 0 }
    this.writeMeta('error', '')
    try {
      const sessions = (await source.listSessions(controller.signal)).slice(0, MAX_SESSIONS_PER_RUN)
      this.extracting.total = sessions.length
      for (const session of sessions) {
        controller.signal.throwIfAborted()
        let added = 0
        try {
          const log = await source.readSession(session.header.id)
          const candidates = this.extractLog(log)
          for (const candidate of candidates) {
            added += this.upsert(candidate, log.session.id, log.session.cwd ?? session.header.cwd)
          }
          this.db.prepare('DELETE FROM memory_jobs WHERE session_id = ?').run(session.header.id)
        } catch (cause: unknown) {
          if (controller.signal.aborted) throw cause
          this.extracting.skipped += 1
        }
        this.extracting.processed += 1
        this.extracting.added += added
      }
      this.writeMeta('lastRunAt', now())
      this.writeMeta('lastRunProcessed', String(this.extracting.processed))
      this.writeMeta('lastRunAdded', String(this.extracting.added))
      this.writeMeta('lastRunSkipped', String(this.extracting.skipped))
      this.writeMeta('lastExtractionMethod', this.extracting.processed === 0 ? 'none' : 'heuristic')
      this.db.prepare("DELETE FROM memory_meta WHERE key = 'error'").run()
      return this.getState(cwd)
    } catch (cause: unknown) {
      if (!controller.signal.aborted) this.writeMeta('error', cause instanceof Error ? cause.message : String(cause))
      throw cause
    } finally {
      signal?.removeEventListener('abort', abort)
      this.running = false
      this.runController = undefined
      this.extracting = undefined
    }
  }

  abort(): DcodeMemoryState {
    this.runController?.abort()
    return this.getState()
  }

  reset(): DcodeMemoryState {
    this.abort()
    this.db.exec('DELETE FROM memory_records; DELETE FROM memory_fts; DELETE FROM memory_jobs;')
    this.db.exec("DELETE FROM memory_meta WHERE key <> 'enabled'")
    return this.getState()
  }

  forget(id: string): DcodeMemoryState {
    this.db.prepare('DELETE FROM memory_records WHERE id = ?').run(id)
    this.db.prepare('DELETE FROM memory_fts WHERE id = ?').run(id)
    return this.getState()
  }

  markPending(sessionId: string): void {
    const state = this.getState()
    if (!state.enabled || sessionId.trim() === '') return
    this.db.prepare(
      "INSERT INTO memory_jobs(session_id, status, updated_at) VALUES (?, 'pending', ?) ON CONFLICT(session_id) DO UPDATE SET status = 'pending', updated_at = excluded.updated_at",
    ).run(sessionId, now())
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.run().catch(() => { /* surfaced by memory/state */ })
    }, 4000)
  }

  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = undefined
    this.abort()
    this.db.close()
  }

  private readMeta(): Map<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM memory_meta').all() as Array<{ key: string; value: string }>
    return new Map(rows.map(row => [row.key, row.value]))
  }

  private writeMeta(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO memory_meta(key, value) VALUES (?, ?)').run(key, value)
  }

  private extractLog(log: DcodeMemorySessionLog): Array<{ kind: DcodeMemoryKind; category: DcodeMemoryCategory; content: string }> {
    const candidates: Array<{ kind: DcodeMemoryKind; category: DcodeMemoryCategory; content: string }> = []
    const seen = new Set<string>()
    for (const event of log.events) {
      const extracted = eventText(event)
      if (extracted === undefined) continue
      const candidate = durableCandidate(extracted.role, extracted.text)
      if (candidate === undefined || seen.has(candidate.content)) continue
      seen.add(candidate.content)
      candidates.push(candidate)
      if (candidates.length >= MAX_CANDIDATES_PER_SESSION) break
    }
    return candidates
  }

  private upsert(
    candidate: { kind: DcodeMemoryKind; category: DcodeMemoryCategory; content: string },
    sessionId: string,
    cwd: string | undefined,
  ): number {
    const key = projectKey(cwd)
    const existing = this.db.prepare(
      'SELECT id, source_session_ids FROM memory_records WHERE project_key IS ? AND content = ?',
    ).get(key, candidate.content) as { id?: string; source_session_ids?: string } | undefined
    const sourceIds = new Set(existing === undefined ? [] : parseSourceIds(existing.source_session_ids))
    sourceIds.add(sessionId)
    const timestamp = now()
    if (existing?.id !== undefined) {
      this.db.prepare(
        'UPDATE memory_records SET category = ?, kind = ?, source_session_ids = ?, updated_at = ? WHERE id = ?',
      ).run(candidate.category, candidate.kind, JSON.stringify([...sourceIds]), timestamp, existing.id)
      return 0
    }
    const id = hash(`${key ?? 'global'}:${candidate.content}`)
    this.db.prepare(
      'INSERT INTO memory_records(id, scope, project_key, category, kind, content, source_session_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(id, key === null ? 'global' : 'project', key, candidate.category, candidate.kind, candidate.content, JSON.stringify([...sourceIds]), timestamp, timestamp)
    this.db.prepare('INSERT INTO memory_fts(id, content) VALUES (?, ?)').run(id, candidate.content)
    return 1
  }

  private recordFromRow(row: Record<string, unknown>): DcodeMemoryRecord {
    const scope = row.scope === 'global' ? 'global' : 'project'
    const category = (typeof row.category === 'string' ? row.category : 'project_conventions') as DcodeMemoryCategory
    const kind = (typeof row.kind === 'string' ? row.kind : 'fact') as DcodeMemoryKind
    return {
      id: typeof row.id === 'string' ? row.id : hash(String(row.content ?? '')),
      scope,
      category,
      kind,
      content: typeof row.content === 'string' ? row.content : '',
      sourceSessionIds: parseSourceIds(row.source_session_ids),
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : now(),
    }
  }
}

/** Resolve the same portable DSH data root used by the packaged runtime. */
export function defaultDcodeMemoryRoot(): string {
  const configured = process.env.DSH_HOME?.trim()
  return join(resolve(configured === undefined || configured === '' ? join(homedir(), '.dsh') : configured), 'dcode-memory')
}
