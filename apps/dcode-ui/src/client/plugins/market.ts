/**
 * Browser face of the plugin marketplace Host feed.
 *
 * The marketplace ships as its own Host plugin (`dsh-plugin-marketplace`,
 * seeded into the web profile by the runtime's marketplace bootstrap) and
 * exposes plain HTTP routes under `/api/market`. The workbench talks to those
 * routes directly rather than mirroring the catalogue: there is one sync
 * cache, one install queue and one profile manifest, all of them the Host's.
 *
 * Everything crossing the wire is normalised here. The Host half is a
 * separately versioned package that may be absent, older, or replaced by a
 * page answering HTML for an unregistered route, so no component is handed an
 * `unknown`: a missing route becomes a {@link MarketResult} marked
 * `unavailable`, and a drifting payload degrades field by field instead of
 * throwing inside a card.
 * @module @dsh-portable/dcode-ui/client/plugins/market
 */

/** Root of the Host's marketplace routes. */
export const MARKET_BASE = '/api/market'

/** Page size the catalogue is requested in. */
export const MARKET_PAGE_SIZE = 50

/** GitHub topic the Host syncs the catalogue from. */
export const MARKET_TOPIC_URL = 'https://github.com/topics/dsh-plugin'

/** How far a plugin has travelled from "package on disk" to "loaded". */
export type PluginExposure =
  | 'boot-configured'
  | 'pending-restart'
  | 'stale'
  | 'inactive'
  | 'unknown'

/** Phases the Host reports while an install or update job runs. */
export type JobPhase =
  | 'pending'
  | 'resolving'
  | 'downloading'
  | 'installing'
  | 'done'
  | 'error'
  | 'canceled'

/** One repository in the catalogue. */
export interface MarketItem {
  readonly fullName: string
  readonly url: string
  readonly description: string
  readonly stars: number
  readonly language: string
  readonly homepage: string
  /** Already present in the profile, as reported by the Host. */
  readonly installed: boolean
  /** Installed, but the harness has not restarted onto it yet. */
  readonly needsRestart: boolean
}

/** One page of the catalogue. */
export interface MarketPage {
  readonly items: readonly MarketItem[]
  readonly total: number
  readonly page: number
  readonly hasMore: boolean
  /** When the Host last reached GitHub, or 0 while it never has. */
  readonly fetchedAt: number
  /** A sync failure the Host reports alongside whatever it still had cached. */
  readonly error: string | undefined
}

/** One plugin installed into the web profile. */
export interface InstalledPlugin {
  readonly name: string
  readonly kind: 'installed' | 'builtin'
  readonly enabled: boolean
  /** Whether the entry point and dependencies resolve; unknown on old Hosts. */
  readonly available: boolean | undefined
  readonly activated: boolean
  readonly exposure: PluginExposure
  readonly version: string | undefined
  readonly latestVersion: string | undefined
  readonly updateAvailable: boolean
  readonly description: string | undefined
  readonly homepage: string | undefined
}

/** The marketplace's own package, which it never offers to remove. */
export interface MarketSelf {
  readonly name: string
  readonly version: string | undefined
  readonly latestVersion: string | undefined
  readonly updateAvailable: boolean
}

/** The profile inventory the manage view reads. */
export interface InstalledSnapshot {
  readonly plugins: readonly InstalledPlugin[]
  readonly self: MarketSelf | undefined
  readonly error: string | undefined
}

/** How many packages one job has moved. */
export interface JobPackages {
  readonly resolved: number
  readonly reused: number
  readonly downloaded: number
  readonly added: number
}

/** Live progress of one install or update job. */
export interface InstallJob {
  readonly id: string
  readonly phase: JobPhase
  readonly step: string
  /** 0–100, or undefined while the Host cannot estimate it. */
  readonly percent: number | undefined
  readonly packages: JobPackages
  readonly bytesDown: number
  readonly bytesTotal: number
  readonly speedBps: number
  readonly etaSec: number | undefined
  readonly log: readonly string[]
  readonly done: boolean
  readonly ok: boolean
  readonly error: string | undefined
  readonly requiresRestart: boolean
  readonly output: string
}

/**
 * The envelope every call answers in.
 *
 * `unavailable` separates "this deployment has no marketplace Host" from "the
 * marketplace answered and refused", because only the first is a reason to
 * replace the whole surface with an explanation.
 */
export type MarketResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string; readonly unavailable: boolean }

/** The `fetch` face this module needs, so a test can supply its own. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === 'string' ? value : ''
}

function optionalText(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function count(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

const EXPOSURES: readonly PluginExposure[] = [
  'boot-configured', 'pending-restart', 'stale', 'inactive', 'unknown',
]

const PHASES: readonly JobPhase[] = [
  'pending', 'resolving', 'downloading', 'installing', 'done', 'error', 'canceled',
]

/**
 * Read one catalogue row.
 * @param raw - one entry of the Host's `items` array.
 * @returns the row, or undefined when it carries no repository name.
 */
function normalizeItem(raw: unknown): MarketItem | undefined {
  if (!isRecord(raw)) return undefined
  const fullName = text(raw, 'fullName')
  if (fullName === '') return undefined
  return {
    fullName,
    url: text(raw, 'url') || `https://github.com/${fullName}`,
    description: text(raw, 'description'),
    stars: count(raw, 'stars'),
    language: text(raw, 'language'),
    homepage: text(raw, 'homepage'),
    installed: raw['installed'] === true,
    needsRestart: raw['needsRestart'] === true,
  }
}

/**
 * Read one page of the catalogue.
 * @param raw - the `/api/market/list` body.
 * @param page - the page that was asked for, used when the Host omits it.
 * @returns a page that is safe to render, empty when the body is unusable.
 */
export function normalizeMarketPage(raw: unknown, page: number): MarketPage {
  const source = isRecord(raw) ? raw : {}
  const items = Array.isArray(source['items'])
    ? source['items'].flatMap((entry) => {
      const item = normalizeItem(entry)
      return item === undefined ? [] : [item]
    })
    : []
  const resolved = count(source, 'page') || page
  const total = count(source, 'total')
  return {
    items,
    total,
    page: resolved,
    // Trust the Host's own verdict, and fall back to the arithmetic it does
    // itself so an older build still paginates.
    hasMore: source['hasMore'] === true
      || (source['hasMore'] === undefined && resolved * MARKET_PAGE_SIZE < total),
    fetchedAt: count(source, 'fetchedAt'),
    error: optionalText(source, 'error'),
  }
}

/**
 * Read one installed plugin.
 * @param raw - one entry of the Host's `plugins` array.
 * @returns the plugin, or undefined when it carries no package name.
 */
function normalizeInstalledPlugin(raw: unknown): InstalledPlugin | undefined {
  if (!isRecord(raw)) return undefined
  const name = text(raw, 'name')
  if (name === '') return undefined
  const enabled = raw['enabled'] === true
  const exposure = raw['exposure']
  const activated = typeof raw['activated'] === 'boolean' ? raw['activated'] : enabled
  return {
    name,
    kind: raw['kind'] === 'builtin' ? 'builtin' : 'installed',
    enabled,
    available: typeof raw['available'] === 'boolean' ? raw['available'] : undefined,
    activated,
    exposure: EXPOSURES.includes(exposure as PluginExposure)
      ? exposure as PluginExposure
      : activated ? 'unknown' : 'inactive',
    version: optionalText(raw, 'version'),
    latestVersion: optionalText(raw, 'latestVersion'),
    updateAvailable: raw['updateAvailable'] === true,
    description: optionalText(raw, 'description'),
    homepage: optionalText(raw, 'homepage'),
  }
}

/**
 * Read the profile inventory.
 *
 * Built-in plugins are dropped here rather than in the view: they ship with
 * the harness, were not installed from the marketplace and cannot be removed
 * by it, so giving them a row of disabled buttons would only ask the operator
 * to work out why.
 * @param raw - the `/api/market/installed` body.
 * @returns the third-party plugins, the marketplace's own package, and any
 *   error the Host reported alongside them.
 */
export function normalizeInstalled(raw: unknown): InstalledSnapshot {
  const source = isRecord(raw) ? raw : {}
  const plugins = Array.isArray(source['plugins'])
    ? source['plugins'].flatMap((entry) => {
      const plugin = normalizeInstalledPlugin(entry)
      return plugin === undefined || plugin.kind === 'builtin' ? [] : [plugin]
    })
    : []
  const rawSelf = source['self']
  const selfName = isRecord(rawSelf) ? text(rawSelf, 'name') : ''
  return {
    plugins,
    self: isRecord(rawSelf) && selfName !== ''
      ? {
        name: selfName,
        version: optionalText(rawSelf, 'version'),
        latestVersion: optionalText(rawSelf, 'latestVersion'),
        updateAvailable: rawSelf['updateAvailable'] === true,
      }
      : undefined,
    error: optionalText(source, 'error'),
  }
}

/**
 * Read a job snapshot.
 * @param raw - the `job` field of an `/api/market/install/status` body.
 * @returns the job, or undefined when the body carries none.
 */
export function normalizeJob(raw: unknown): InstallJob | undefined {
  if (!isRecord(raw)) return undefined
  const phase = raw['phase']
  const percent = raw['percent']
  const eta = raw['etaSec']
  const packages = isRecord(raw['packages']) ? raw['packages'] : {}
  return {
    id: text(raw, 'id'),
    phase: PHASES.includes(phase as JobPhase) ? phase as JobPhase : 'pending',
    step: text(raw, 'step'),
    percent: typeof percent === 'number' && Number.isFinite(percent) && percent >= 0
      ? Math.min(100, Math.round(percent))
      : undefined,
    packages: {
      resolved: count(packages, 'resolved'),
      reused: count(packages, 'reused'),
      downloaded: count(packages, 'downloaded'),
      added: count(packages, 'added'),
    },
    bytesDown: count(raw, 'bytesDown'),
    bytesTotal: count(raw, 'bytesTotal'),
    speedBps: count(raw, 'speedBps'),
    etaSec: typeof eta === 'number' && Number.isFinite(eta) && eta > 0 ? eta : undefined,
    log: Array.isArray(raw['log'])
      ? raw['log'].filter((line): line is string => typeof line === 'string')
      : [],
    done: raw['done'] === true,
    ok: raw['ok'] === true,
    error: optionalText(raw, 'error'),
    requiresRestart: raw['requiresRestart'] === true,
    output: text(raw, 'output'),
  }
}

/** Binary size, at the precision each magnitude can justify. */
export function formatBytes(value: number): string {
  const bytes = Number.isFinite(value) && value > 0 ? value : 0
  if (bytes < 1024) return `${String(Math.round(bytes))} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

/** Transfer rate, or an empty string while the Host has not measured one. */
export function formatSpeed(value: number): string {
  const bps = Number.isFinite(value) && value > 0 ? value : 0
  if (bps <= 0) return ''
  if (bps < 1024) return `${String(Math.round(bps))} B/s`
  if (bps < 1024 ** 2) return `${(bps / 1024).toFixed(0)} KB/s`
  return `${(bps / 1024 ** 2).toFixed(1)} MB/s`
}

/** One step of the four-stage lifecycle a plugin passes through. */
export interface LifecycleStep {
  readonly id: 'installed' | 'available' | 'activated' | 'exposed'
  readonly state: 'done' | 'pending' | 'off' | 'unknown'
}

/**
 * Derive the lifecycle strip.
 *
 * The four stages are facts the Host reports separately, and the distinction
 * that matters to an operator is between "not switched on" and "switched on
 * but the harness has not restarted onto it" — the second is why a freshly
 * enabled plugin still does nothing.
 * @param plugin - one installed plugin.
 * @returns the four steps, in the order they happen.
 */
export function lifecycleSteps(plugin: InstalledPlugin): readonly LifecycleStep[] {
  return [
    { id: 'installed', state: 'done' },
    {
      id: 'available',
      state: plugin.available === undefined ? 'unknown' : plugin.available ? 'done' : 'off',
    },
    { id: 'activated', state: plugin.activated ? 'done' : 'off' },
    {
      id: 'exposed',
      state: plugin.exposure === 'boot-configured'
        ? 'done'
        : plugin.exposure === 'pending-restart' || plugin.exposure === 'stale'
          ? 'pending'
          : plugin.exposure === 'inactive' ? 'off' : 'unknown',
    },
  ]
}

/**
 * Whether an installed plugin is still waiting for a harness restart.
 * @param plugin - one installed plugin.
 * @returns true while what is loaded differs from what the profile says.
 */
export function pendingRestart(plugin: InstalledPlugin): boolean {
  return plugin.exposure === 'pending-restart' || plugin.exposure === 'stale'
}

/** The marketplace calls the workbench makes. */
export interface MarketClient {
  list(query: string, page: number, signal?: AbortSignal): Promise<MarketResult<MarketPage>>
  installed(signal?: AbortSignal): Promise<MarketResult<InstalledSnapshot>>
  /** Start an install; answers a job id, or `undefined` on a synchronous Host. */
  install(spec: string): Promise<MarketResult<string | undefined>>
  update(name: string): Promise<MarketResult<string | undefined>>
  setEnabled(name: string, enabled: boolean): Promise<MarketResult<undefined>>
  uninstall(name: string): Promise<MarketResult<undefined>>
  job(jobId: string): Promise<MarketResult<InstallJob>>
  cancel(jobId: string): Promise<void>
  translate(text: string): Promise<MarketResult<string>>
}

/** A route the Host never registered, told apart from a refusal it did send. */
function missing(message: string): MarketResult<never> {
  return { ok: false, error: message, unavailable: true }
}

function refused(message: string): MarketResult<never> {
  return { ok: false, error: message, unavailable: false }
}

/**
 * Build the marketplace client.
 *
 * Every call returns the envelope rather than throwing: the marketplace is an
 * optional Host plugin, and a deployment without it has to render an
 * explanation, not an error boundary.
 * @param fetchImpl - the transport, defaulting to the page's own `fetch`.
 * @returns the client the plugins surface drives.
 */
export function createMarketClient(fetchImpl?: FetchLike): MarketClient {
  const transport: FetchLike = fetchImpl
    ?? ((input, init) => globalThis.fetch(input, init))

  /**
   * One call, with every failure mode folded into the envelope.
   * @param path - route under {@link MARKET_BASE}.
   * @param init - request options; a body implies POST.
   * @param signal - abort signal of the caller's effect.
   * @returns the parsed body, or a refusal describing why there is none.
   */
  const call = async (
    path: string,
    init?: { body?: unknown; signal?: AbortSignal },
  ): Promise<MarketResult<Record<string, unknown>>> => {
    try {
      const response = await transport(`${MARKET_BASE}${path}`, {
        cache: 'no-store',
        ...(init?.signal === undefined ? {} : { signal: init.signal }),
        ...(init?.body === undefined
          ? {}
          : {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(init.body),
          }),
      })
      // An unregistered route falls through to the SPA shell, which answers
      // 200 with HTML. Both that and a 404 mean the same thing to a caller:
      // this profile has no marketplace Host.
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('json')) {
        return missing(`the marketplace route ${path} is not available`)
      }
      const body: unknown = await response.json()
      if (!isRecord(body)) return refused(`malformed answer from ${path}`)
      if (response.status === 404) return missing(text(body, 'error') || 'not found')
      if (!response.ok && body['ok'] !== true) {
        return refused(text(body, 'error') || `the marketplace answered ${String(response.status)}`)
      }
      return { ok: true, value: body }
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
      return refused(cause instanceof Error ? cause.message : String(cause))
    }
  }

  /** Read the job id an async Host answers with; absent on a synchronous one. */
  const startedJob = (body: Record<string, unknown>): MarketResult<string | undefined> => {
    const jobId = optionalText(body, 'jobId')
    if (jobId !== undefined) return { ok: true, value: jobId }
    if (body['ok'] === true) return { ok: true, value: undefined }
    return refused(text(body, 'error') || 'the marketplace refused the request')
  }

  const acknowledged = (body: Record<string, unknown>): MarketResult<undefined> =>
    body['ok'] === false
      ? refused(text(body, 'error') || 'the marketplace refused the request')
      : { ok: true, value: undefined }

  return {
    list: async (query, page, signal) => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(MARKET_PAGE_SIZE),
      })
      if (query !== '') params.set('q', query)
      const answer = await call(`/list?${params.toString()}`, { ...(signal === undefined ? {} : { signal }) })
      return answer.ok ? { ok: true, value: normalizeMarketPage(answer.value, page) } : answer
    },
    installed: async (signal) => {
      const answer = await call('/installed', { ...(signal === undefined ? {} : { signal }) })
      return answer.ok ? { ok: true, value: normalizeInstalled(answer.value) } : answer
    },
    install: async (spec) => {
      const answer = await call('/install', { body: { spec } })
      return answer.ok ? startedJob(answer.value) : answer
    },
    update: async (name) => {
      const answer = await call('/update', { body: { name } })
      return answer.ok ? startedJob(answer.value) : answer
    },
    setEnabled: async (name, enabled) => {
      const answer = await call('/set-enabled', { body: { name, enabled } })
      return answer.ok ? acknowledged(answer.value) : answer
    },
    uninstall: async (name) => {
      const answer = await call('/uninstall', { body: { name } })
      return answer.ok ? acknowledged(answer.value) : answer
    },
    job: async (jobId) => {
      const answer = await call(`/install/status?job=${encodeURIComponent(jobId)}`)
      if (!answer.ok) return answer
      const job = normalizeJob(answer.value['job'])
      // A job the Host has forgotten is terminal, not transient: report it as
      // a finished failure so the poller stops rather than spinning forever.
      return job === undefined
        ? refused(optionalText(answer.value, 'error') ?? 'the install job expired')
        : { ok: true, value: job }
    },
    cancel: async (jobId) => { await call('/install/cancel', { body: { jobId } }) },
    translate: async (source) => {
      const answer = await call('/translate', { body: { text: source } })
      if (!answer.ok) return answer
      return answer.value['ok'] === true
        ? { ok: true, value: text(answer.value, 'text') }
        : refused(text(answer.value, 'error') || 'translation failed')
    },
  }
}
