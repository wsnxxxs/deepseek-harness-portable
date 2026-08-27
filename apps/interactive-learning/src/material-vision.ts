/**
 * Re-reading image-only PDF pages with a model — the panel's only paid action.
 *
 * Every other endpoint in this app's panel surface reads or writes local files.
 * This one spends tokens, and the whole module is shaped around making that
 * fact checkable BEFORE anyone commits to it: {@link materialRouteInfo} answers
 * "what would happen and who would read it" without generating model output
 * (it may query the provider/model catalog), and
 * {@link reparsePages} is the only function here that reaches a provider.
 *
 * Route selection restates the rule the Vision Bridge uses rather than
 * importing it. A multimodal active model reads the page ITSELF — there is no
 * bridge hop, no second model, and no separate bill. Only a model that has
 * explicitly declared it does not accept images is refused, and it is refused
 * rather than silently rerouted: this pack cannot see or configure another
 * pack's fallback model, so quietly spending money on a model the person did
 * not choose would be worse than saying "switch your model".
 *
 * The duplication is deliberate. `vision-bridge` is a separately installable
 * experience pack; importing it here would make each pack require the other's
 * install to type-check. What is duplicated is small and stable: the
 * three-state modality reading, and the two Poppler binaries.
 *
 * Writes go back through the ORDINARY ingest pipeline. The recovered text is
 * spliced into the parse as blocks, and `emitSource` re-derives the markdown
 * and the structure from scratch — so section ids, quote hashes and line
 * numbers stay exactly what a normal import would have produced, and
 * re-anchoring runs on the result the same way `ingestSource` runs it. Nothing
 * here hand-edits `extracted/`.
 * @module @dsh-portable/interactive-learning/src/material-vision
 */

import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import type { Context } from '@deepseek-ai/cordis'
import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import { emitSource, EXTRACTED_HEADER, PAGE_MARKER } from './ingest/markdown.ts'
import { parseSource } from './ingest/index.ts'
import { parseMarkdownBlocks } from './ingest/text.ts'
import { quoteHashOf, type ParseDegradation, type ParsedBlock, type ParsedSource } from './ingest/types.ts'
import { reanchorConceptCards } from './concept-cards.ts'
import { reanchorVaultMemory } from './material-reanchor.ts'
import {
  readManifest,
  readStructure,
  structurePathOf,
  upsertManifestEntry,
  vaultRelative,
  type TopicVault,
} from './topic-vault.ts'

const execFileAsync = promisify(execFile)

/** Rasterizers this module knows how to drive; the first one present wins. */
export const PDF_RENDERERS = ['pdftoppm', 'pdftocairo'] as const

/** Render resolution. Matches the Vision Bridge so a page reads the same either way. */
const PDF_RENDER_DPI = 144

const PDF_RENDER_TIMEOUT_MS = 30_000

/** One model call per page, so a runaway request cannot be a whole document. */
export const MAX_REPARSE_PAGES = 8

/** Longest recovered text kept per page. */
export const MAX_PAGE_TEXT_CHARS = 12_000

const MODEL_TIMEOUT_MS = 120_000

/** Marker appended to a recovered page's heading, so a citation carries it too. */
export const REPARSE_HEADING_SUFFIX = '（视觉重读）'

/**
 * What would happen if a person asked for a re-read.
 *
 * Five states, not four. The design's table folded "the model says it takes no
 * images" together with "the model says nothing about images", and those lead
 * to different honest answers: the first is a refusal, the second is a warning.
 * Collapsing them would either block every provider that declares no modalities
 * or spend a request that is going to be rejected.
 */
export type ReparseRoute =
  /** The active model declares image input. It reads the page itself. */
  | 'native-image'
  /** The active model declares modalities and image is not among them. */
  | 'text-only-model'
  /** The active model declares no modalities at all; the call may still work. */
  | 'unknown-capability'
  /** No `pdftoppm`/`pdftocairo` on PATH, so no page can be rasterized at all. */
  | 'renderer-missing'
  /** No model route resolved, or the LLM service is absent. */
  | 'no-route'

/** Why a re-read is not on offer for one source. */
export type ReparseBlocker = 'unknown-source' | 'not-pdf' | 'nothing-to-reparse' | 'source-file-missing'

/** The answer to "what would this cost me and who would read it". */
export interface MaterialRouteInfo {
  status: 'ok' | ReparseBlocker
  route: ReparseRoute
  /** `provider/model` that would do the reading, when one resolved. */
  model: string | null
  /** Pages the parser reported as image-only and that have not been re-read. */
  pages: readonly number[]
  /** Pages already recovered by a previous re-read. */
  reparsed: readonly number[]
  /** Whether pressing the button would call a model. This is not a call made by route-info itself. */
  spendsTokens: boolean
  /** Whichever rasterizer was found, for a person diagnosing a missing one. */
  renderer: string | null
}

/**
 * The two environment-touching operations, injected.
 *
 * Both default to the real thing. They exist as a seam because the interesting
 * behaviour of this module is what it does with a page's recovered text —
 * splice, re-emit, re-anchor — and none of that should require Poppler on PATH
 * and a live provider to exercise.
 */
export interface ReparseDeps {
  /** Locate a rasterizer. */
  findRenderer?: () => Promise<string | undefined>
  /** Rasterize one page; the caller removes `directory`. */
  renderPage?: (
    renderer: string,
    filePath: string,
    page: number,
    signal?: AbortSignal,
  ) => Promise<{ directory: string; imagePath: string }>
  /** Optional session identity supplied by the RPC caller. */
  sessionId?: string
  /** Session cwd used to find the live session when no id is supplied. */
  cwd?: string
}

/** Narrow structural view of the kernel LLM service; kept local so nothing new is imported. */
interface LlmLike {
  listProviders(): readonly { id: string }[]
  listModels(provider: string): Promise<readonly LlmModelInfo[]>
  stream(options: GenerateOptions): AsyncIterable<StreamChunk>
}

/** Narrow structural view of the attachment store's image commit path. */
interface AttachmentsLike {
  saveImages(images: readonly {
    data: Uint8Array
    mediaType: string
    name?: string
  }[]): Promise<readonly unknown[]>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function routeFrom(value: unknown): { provider: string; model: string } | undefined {
  if (!isRecord(value) || typeof value.provider !== 'string' || typeof value.model !== 'string') return undefined
  if (value.provider.trim() === '' || value.model.trim() === '') return undefined
  return { provider: value.provider, model: value.model }
}

interface SessionRouteLike {
  readonly id?: unknown
  readonly header?: { readonly id?: unknown; readonly cwd?: unknown }
  readonly requestHeader?: () => { readonly config?: unknown } | undefined
  readonly requestContext?: () => unknown
  readonly modelSelection?: unknown
  readonly selectedModel?: unknown
}

interface AgentRouteLike {
  readonly id?: unknown
  readonly options?: unknown
  readonly session?: SessionRouteLike
  readonly status?: unknown
}

interface AgentRegistryLike {
  readonly currentInitiator?: () => AgentRouteLike | undefined
  readonly get?: (id: string) => AgentRouteLike | undefined
  readonly list?: () => readonly AgentRouteLike[]
}

interface SessionStoreLike {
  readonly get?: (id: string) => SessionRouteLike | undefined
  readonly list?: () => readonly SessionRouteLike[]
}

interface RouteSelector {
  readonly sessionId?: string
  readonly cwd?: string
}

function contextMember<T>(ctx: Context, name: string): T | undefined {
  try {
    const service = ctx.get(name)
    if (service !== undefined) return service as T
  } catch {
    // Fall through to a scoped accessor below.
  }
  try {
    return (ctx as unknown as Record<string, unknown>)[name] as T | undefined
  } catch {
    return undefined
  }
}

function routeFromSession(session: SessionRouteLike | undefined): { provider: string; model: string } | undefined {
  if (session === undefined) return undefined
  try {
    const headerRoute = routeFrom(session.requestHeader?.()?.config)
    if (headerRoute !== undefined) return headerRoute
  } catch {
    // A stale/cold session can fail to fold its header; its other route hints
    // still remain useful for a panel read.
  }
  try {
    const contextRoute = routeFrom(session.requestContext?.())
    if (contextRoute !== undefined) return contextRoute
  } catch {
    // Treat an unavailable derived context like any other missing hint.
  }
  return routeFrom(session.modelSelection) ?? routeFrom(session.selectedModel)
}

function routeFromAgent(agent: AgentRouteLike | undefined): { provider: string; model: string } | undefined {
  if (agent === undefined) return undefined
  return routeFromSession(agent.session) ?? routeFrom(agent.options)
}

function identityOf(value: AgentRouteLike | SessionRouteLike): string | undefined {
  const id = value.id ?? ('header' in value ? value.header?.id : undefined)
  return typeof id === 'string' && id !== '' ? id : undefined
}

function sameCwd(value: string | undefined, cwd: string | undefined): boolean {
  if (cwd === undefined) return true
  if (value === undefined) return false
  try {
    return resolve(value) === resolve(cwd)
  } catch {
    return value === cwd
  }
}

function sessionCwd(session: SessionRouteLike | undefined): string | undefined {
  const cwd = session?.header?.cwd
  return typeof cwd === 'string' && cwd !== '' ? cwd : undefined
}

/** Find the route belonging to the session behind a panel request. */
function sessionModelRoute(ctx: Context, selector: RouteSelector): {
  route?: { provider: string; model: string }
  matched: boolean
} {
  const requestedId = selector.sessionId?.trim()
  const cwd = selector.cwd
  const agents = contextMember<AgentRegistryLike>(ctx, 'agents')
  const sessions = contextMember<SessionStoreLike>(ctx, 'sessions')

  if (requestedId !== undefined && requestedId !== '') {
    const explicitAgent = agents?.get?.(requestedId)
    if (explicitAgent !== undefined) {
      return { route: routeFromAgent(explicitAgent), matched: true }
    }
    const explicitSession = sessions?.get?.(requestedId)
    if (explicitSession !== undefined) {
      return { route: routeFromSession(explicitSession), matched: true }
    }
  }

  const candidates: AgentRouteLike[] = []
  const contextualAgent = contextMember<AgentRouteLike>(ctx, 'agent')
  if (contextualAgent !== undefined) candidates.push(contextualAgent)
  try {
    const initiator = agents?.currentInitiator?.()
    if (initiator !== undefined && !candidates.includes(initiator)) candidates.push(initiator)
  } catch {
    // Direct RPC calls have no initiator boundary.
  }
  try {
    for (const agent of [...(agents?.list?.() ?? [])].reverse()) {
      if (!candidates.includes(agent)) candidates.push(agent)
    }
  } catch {
    // An unloaded agent registry is equivalent to no live agent candidates.
  }
  for (const [index, agent] of candidates.entries()) {
    const id = identityOf(agent)
    const agentCwd = sessionCwd(agent.session)
    if (requestedId !== undefined && requestedId !== '' && id !== requestedId) continue
    // An agent-scoped context is already the current session even when its
    // synthetic test/runtime shape omits the durable cwd header.
    if (!(index === 0 && contextualAgent === agent) && !sameCwd(agentCwd, cwd)) continue
    return { route: routeFromAgent(agent), matched: true }
  }

  try {
    const sessionCandidates = [...(sessions?.list?.() ?? [])].reverse()
    for (const session of sessionCandidates) {
      const id = identityOf(session)
      if (requestedId !== undefined && requestedId !== '' && id !== requestedId) continue
      if (!sameCwd(sessionCwd(session), cwd)) continue
      return { route: routeFromSession(session), matched: true }
    }
  } catch {
    // A session store is optional in the direct/unit-test context.
  }

  return { matched: false }
}

/**
 * The route the panel would use.
 *
 * Prefer the live session route used by the conversation. The global default is
 * only a compatibility fallback for a direct, agentless call with no session
 * registry; it must not override a session's logged or selected model.
 */
export function panelModelRoute(
  ctx: Context,
  selector: RouteSelector = {},
): { provider: string; model: string } | undefined {
  const session = sessionModelRoute(ctx, selector)
  if (session.matched) return session.route

  const defaultModel = ctx.get('agentDefaultModel') as { currentSelection?: () => unknown } | undefined
  return defaultModel?.currentSelection === undefined
    ? undefined
    : routeFrom(defaultModel.currentSelection())
}

/** Every model the configured providers report; a provider that cannot list is skipped. */
export async function modelCatalog(llm: LlmLike): Promise<LlmModelInfo[]> {
  const catalog: LlmModelInfo[] = []
  for (const provider of llm.listProviders()) {
    try {
      catalog.push(...await llm.listModels(provider.id))
    } catch {
      // One unreachable provider must not hide the models of the ones that answer.
      continue
    }
  }
  return catalog
}

/**
 * Three-state image capability, matching the kernel's own convention.
 *
 * An ABSENT `inputModalities` means unknown; a present list without `image`
 * means the model actively declares it does not accept one. Treating absence as
 * a denial would lock out every provider that has not filled the field in.
 */
export function imageCapability(
  route: { provider: string; model: string },
  catalog: readonly LlmModelInfo[],
): 'supported' | 'unsupported' | 'unknown' {
  const entry = catalog.find(model => model.provider === route.provider && model.id === route.model)
  if (entry?.inputModalities === undefined) return 'unknown'
  return entry.inputModalities.includes('image') ? 'supported' : 'unsupported'
}

/** The first rasterizer on PATH, or `undefined` when neither is installed. */
export async function findPdfRenderer(): Promise<string | undefined> {
  for (const renderer of PDF_RENDERERS) {
    try {
      await execFileAsync(renderer, ['-v'], { windowsHide: true, timeout: 5_000, maxBuffer: 64 * 1024 })
      return renderer
    } catch (cause) {
      // `-v` writes to stderr and some builds exit non-zero doing it, so only a
      // missing executable counts as absence.
      if (isRecord(cause) && cause.code === 'ENOENT') continue
      return renderer
    }
  }
  return undefined
}

/** Rasterize one page to PNG in a fresh temp directory the caller must remove. */
export async function renderPdfPage(
  renderer: string,
  filePath: string,
  page: number,
  signal?: AbortSignal,
): Promise<{ directory: string; imagePath: string }> {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-learning-page-'))
  const outputBase = join(directory, 'page')
  try {
    await execFileAsync(renderer, [
      '-png', '-singlefile',
      '-f', String(page),
      '-l', String(page),
      '-r', String(PDF_RENDER_DPI),
      filePath,
      outputBase,
    ], { windowsHide: true, timeout: PDF_RENDER_TIMEOUT_MS, signal, maxBuffer: 1024 * 1024 })
    const imagePath = `${outputBase}.png`
    const info = await stat(imagePath)
    if (!info.isFile()) throw new Error(`${renderer} produced no image for page ${String(page)}`)
    return { directory, imagePath }
  } catch (cause) {
    await rm(directory, { recursive: true, force: true })
    throw cause
  }
}

/** Pages one degradation set reports as image-only. */
export function imageOnlyPages(degradation: readonly ParseDegradation[]): readonly number[] {
  const pages = new Set<number>()
  for (const item of degradation) {
    if (item.kind === 'image-only-pages') for (const page of item.pages) pages.add(page)
  }
  return [...pages].sort((left, right) => left - right)
}

/**
 * Report the route without generating anything.
 *
 * Every branch here is answered from local state — the manifest, the file
 * system, and a provider catalog lookup. `listModels` may refresh/query that
 * catalog, but this function never calls `stream` and therefore spends no
 * generation tokens. That distinction is what makes it safe for the panel to
 * call before the person confirms a paid re-read.
 */
export async function materialRouteInfo(
  ctx: Context,
  vault: TopicVault,
  sourceId: string,
  deps: ReparseDeps = {},
): Promise<MaterialRouteInfo> {
  const manifest = await readManifest(vault)
  const entry = manifest.sources.find(source => source.sourceId === sourceId)
  const blank: MaterialRouteInfo = {
    status: 'ok',
    route: 'no-route',
    model: null,
    pages: [],
    reparsed: [],
    spendsTokens: false,
    renderer: null,
  }
  if (entry === undefined) return { ...blank, status: 'unknown-source' }

  const already = entry.reparsed?.pages ?? []
  const pending = imageOnlyPages(entry.degradation).filter(page => !already.includes(page))
  const shaped = { ...blank, pages: pending, reparsed: already }

  if (extname(entry.originalName).toLowerCase() !== '.pdf') return { ...shaped, status: 'not-pdf' }
  if (pending.length === 0) return { ...shaped, status: 'nothing-to-reparse' }

  try {
    const info = await stat(join(vault.root, entry.sourcePath))
    if (!info.isFile()) return { ...shaped, status: 'source-file-missing' }
  } catch {
    // The vault keeps the original precisely so a re-read never depends on the
    // learner still having the file they dragged in. A missing copy is a real,
    // reportable state rather than something to work around.
    return { ...shaped, status: 'source-file-missing' }
  }

  const renderer = await (deps.findRenderer ?? findPdfRenderer)()
  if (renderer === undefined) return { ...shaped, route: 'renderer-missing' }

  const llm = ctx.get('llm') as LlmLike | undefined
  const route = panelModelRoute(ctx, { sessionId: deps.sessionId, cwd: deps.cwd ?? vault.root })
  if (llm === undefined || route === undefined) return { ...shaped, renderer, route: 'no-route' }

  const capability = imageCapability(route, await modelCatalog(llm))
  const kind: ReparseRoute = capability === 'supported'
    ? 'native-image'
    : capability === 'unsupported' ? 'text-only-model' : 'unknown-capability'
  return {
    ...shaped,
    renderer,
    route: kind,
    model: `${route.provider}/${route.model}`,
    // A text-only model is refused before any call, so it spends nothing.
    spendsTokens: kind !== 'text-only-model',
  }
}

/** Instruction for the page read. Extraction, not description, and no invention. */
export const PAGE_EXTRACTION_INSTRUCTION = [
  'This image is one page of a document whose text layer could not be extracted.',
  'Transcribe the page as Markdown: headings as headings, paragraphs as paragraphs,',
  'tables as Markdown tables, formulas as LaTeX between $ delimiters.',
  'Transcribe only what is legible. Do not summarize, do not explain,',
  'and do not supply anything the page does not show — write [无法辨认] where text is unreadable.',
].join(' ')

/** One page's outcome, reported per page so a partial success is legible. */
export interface ReparsedPage {
  page: number
  status: 'ok' | 'render-failed' | 'model-failed' | 'empty'
  chars: number
  message?: string
}

/** What a re-read answers with. */
export interface ReparseResult {
  status: 'ok' | ReparseBlocker | 'text-only-model' | 'renderer-missing' | 'no-route'
  route: ReparseRoute
  model: string | null
  pages: readonly ReparsedPage[]
  /** Pages that produced text and were written back. */
  recovered: readonly number[]
  /** Anchors moved by the re-emit; zero unless a section boundary shifted. */
  reanchored?: { moved: number; stale: number; recovered: number }
}

async function readOnePage(
  llm: LlmLike,
  attachments: AttachmentsLike,
  route: { provider: string; model: string },
  imagePath: string,
  signal?: AbortSignal,
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  let attachment: unknown
  try {
    // Through the attachment store, not as inline bytes: admission decodes the
    // raster, so the declared media type and the pixel bounds are verified
    // rather than trusted, and the reference is the only image form the
    // provider adapters accept.
    const [saved] = await attachments.saveImages([{
      data: await readFile(imagePath),
      mediaType: 'image/png',
      name: basename(imagePath),
    }])
    if (saved === undefined) return { ok: false, message: 'the attachment store committed no reference' }
    attachment = saved
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : String(cause) }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, MODEL_TIMEOUT_MS)
  const onAbort = (): void => { controller.abort() }
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const options: GenerateOptions = {
      provider: route.provider,
      model: route.model,
      messages: [createUserMessage({
        content: [
          { type: 'text', text: PAGE_EXTRACTION_INSTRUCTION },
          { type: 'image', attachment } as never,
        ],
        source: { kind: 'plugin', plugin: 'interactive-learning-material-vision' },
      })],
      temperature: 0,
      signal: controller.signal,
    }
    const assembler = new BlockAssembler()
    for await (const chunk of llm.stream(options)) assembler.push(chunk)
    if (assembler.finish.kind !== 'stop') {
      return { ok: false, message: `the model stopped with ${assembler.finish.kind}` }
    }
    const text = assembler.blocks()
      .filter((block): block is Extract<ReturnType<BlockAssembler['blocks']>[number], { type: 'text' }> =>
        block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()
      .slice(0, MAX_PAGE_TEXT_CHARS)
    return { ok: true, text }
  } catch (cause) {
    return { ok: false, message: cause instanceof Error ? cause.message : String(cause) }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Turn one page's recovered Markdown into blocks the emitter understands. */
export function blocksForPage(
  sourceId: string,
  title: string,
  page: number,
  markdown: string,
): ParsedBlock[] {
  const label = `第 ${String(page)} 页${REPARSE_HEADING_SUFFIX}`
  const headingPath = [title, label]
  const blocks: ParsedBlock[] = [{
    kind: 'heading',
    level: 2,
    text: label,
    anchor: { sourceId, headingPath: [...headingPath], page, quoteHash: quoteHashOf(label) },
  }]
  // Split on blank lines only. Finer classification would be guessing at a
  // model's formatting, and every block still carries the same page anchor —
  // the citation a learner sees is the page, not the paragraph.
  for (const chunk of markdown.split(/\n{2,}/u)) {
    const text = chunk.trim()
    if (text === '') continue
    const heading = /^(#{1,6})\s+(.+)$/u.exec(text)
    if (heading !== null) {
      const inner = heading[2]!.trim()
      // The model sometimes repeats the page label it was given. The emitter
      // already supplies the canonical page heading, so retaining that answer
      // would create two indistinguishable placeholder titles.
      if (isPageHeading(inner, page)) continue
      blocks.push({
        kind: 'heading',
        level: Math.min(6, Math.max(3, heading[1]!.length)),
        text: inner,
        anchor: { sourceId, headingPath: [...headingPath, inner], page, quoteHash: quoteHashOf(inner) },
      })
      continue
    }
    blocks.push({
      kind: text.startsWith('|') ? 'table' : 'paragraph',
      text,
      anchor: { sourceId, headingPath: [...headingPath], page, quoteHash: quoteHashOf(text) },
    })
  }
  return blocks
}

/** Whether a heading is the synthetic or canonical title for one page. */
function isPageHeading(text: string, page: number): boolean {
  const normalized = text.trim().replace(/\s+/gu, '')
  return normalized === `第${String(page)}页`
    || normalized === `第${String(page)}页${REPARSE_HEADING_SUFFIX}`
}

/** Read the emitted extraction so a later batch starts with earlier recovery. */
async function currentExtraction(
  vault: TopicVault,
  entry: { sourceId: string; title: string; parser: string; extractedPath: string; degradation: readonly ParseDegradation[]; reparsed?: { pages: readonly number[] } },
): Promise<ParsedSource | undefined> {
  if ((entry.reparsed?.pages.length ?? 0) === 0) return undefined
  const structure = await readStructure(vault, entry.sourceId)
  if (structure === undefined) return undefined
  try {
    const markdown = await readFile(join(vault.root, entry.extractedPath), 'utf8')
    // The emitted file carries its own header and page markers as HTML
    // comments. They are metadata for the emitter, not learning content; strip
    // them before feeding the file back through the Markdown parser.
    const content = markdown.split(/\r?\n/u)
      .filter(line => {
        const trimmed = line.trim()
        return !trimmed.startsWith(`<!-- ${EXTRACTED_HEADER}`) && !PAGE_MARKER.test(trimmed)
      })
      .join('\n')
    const parsed = parseMarkdownBlocks(content, entry.sourceId, entry.title)
    const sections = structure.sections
    const blocks = parsed.map(block => {
      const section = sections.find(candidate =>
        candidate.headingPath.join('\u0000') === block.anchor.headingPath.join('\u0000'))
      if (section?.page === undefined) return block
      return { ...block, anchor: { ...block.anchor, page: section.page } }
    })
    return {
      sourceId: entry.sourceId,
      title: entry.title,
      parser: entry.parser,
      blocks,
      // The emitted markdown has no parser degradation of its own; the
      // manifest remains the source of truth for pages still awaiting vision.
      degradation: entry.degradation,
    }
  } catch {
    return undefined
  }
}

/**
 * Splice recovered pages into a parse, in document order.
 *
 * Each page's blocks land after the last existing block whose page is at or
 * below it, which is where the page's own content would have been had the
 * parser been able to read it. Blocks with no page (formats without them) never
 * match, so this is a no-op for anything but a paged source.
 */
export function spliceRecoveredPages(
  parsed: ParsedSource,
  recovered: ReadonlyMap<number, readonly ParsedBlock[]>,
): ParsedSource {
  if (recovered.size === 0) return parsed
  const recoveredPages = new Set(recovered.keys())
  // PDF parsing creates a `第 N 页` heading when a page has no usable text.
  // Replace that synthetic heading with the marked visual heading instead of
  // leaving two page titles beside one another.
  const blocks: ParsedBlock[] = parsed.blocks.filter(block =>
    block.kind !== 'heading'
    || block.anchor.page === undefined
    || !recoveredPages.has(block.anchor.page)
    || !isPageHeading(block.text, block.anchor.page),
  )
  for (const page of [...recovered.keys()].sort((left, right) => right - left)) {
    const additions = recovered.get(page) ?? []
    let at = blocks.length
    for (let index = blocks.length - 1; index >= 0; index -= 1) {
      const at_page = blocks[index]?.anchor.page
      if (at_page !== undefined && at_page <= page) { at = index + 1; break }
      if (index === 0) at = 0
    }
    blocks.splice(at, 0, ...additions)
  }
  const pages = new Set(recovered.keys())
  const degradation: ParseDegradation[] = []
  for (const item of parsed.degradation) {
    if (item.kind !== 'image-only-pages') { degradation.push(item); continue }
    const remaining = item.pages.filter(page => !pages.has(page))
    // A degradation entry with no pages left is DROPPED, not kept empty: the
    // panel counts entries to decide whether a source is still degraded, and
    // an empty one would keep the warning chip lit forever.
    if (remaining.length > 0) degradation.push({ kind: 'image-only-pages', pages: remaining })
  }
  return { ...parsed, blocks, degradation }
}

/**
 * Re-read image-only pages with the active model and write the result back.
 *
 * The ONLY function in this app's panel surface that calls a provider. It
 * refuses before spending anything when the route says it should: a text-only
 * model, a missing rasterizer, or a source that is not a PDF all return without
 * a single request.
 *
 * A page that fails is reported and skipped, not fatal. Recovering four pages
 * out of six and saying so is strictly better than discarding four pages of
 * paid-for text because the fifth timed out.
 * @param ctx - Host context, for `llm`, `attachments` and the model selection.
 * @param vault - The vault holding the source.
 * @param sourceId - Manifest id of the source to re-read.
 * @param requested - Pages to re-read; defaults to every pending image-only page.
 * @param now - Injected clock.
 * @returns per-page outcomes and the re-anchoring summary.
 */
export async function reparsePages(
  ctx: Context,
  vault: TopicVault,
  sourceId: string,
  requested?: readonly number[],
  now = new Date(),
  signal?: AbortSignal,
  deps: ReparseDeps = {},
): Promise<ReparseResult> {
  const info = await materialRouteInfo(ctx, vault, sourceId, deps)
  const head = { route: info.route, model: info.model, pages: [] as ReparsedPage[], recovered: [] }
  if (info.status !== 'ok') return { ...head, status: info.status }
  if (info.route === 'renderer-missing' || info.route === 'no-route' || info.route === 'text-only-model') {
    return { ...head, status: info.route }
  }

  const manifest = await readManifest(vault)
  const entry = manifest.sources.find(source => source.sourceId === sourceId)!
  const wanted = (requested === undefined || requested.length === 0
    ? info.pages
    : info.pages.filter(page => requested.includes(page))
  ).slice(0, MAX_REPARSE_PAGES)
  if (wanted.length === 0) return { ...head, status: 'nothing-to-reparse' }

  const llm = ctx.get('llm') as LlmLike | undefined
  const attachments = ctx.get('attachments') as AttachmentsLike | undefined
  const route = panelModelRoute(ctx, { sessionId: deps.sessionId, cwd: deps.cwd ?? vault.root })
  if (llm === undefined || attachments === undefined || route === undefined) {
    return { ...head, status: 'no-route', route: 'no-route' }
  }

  const sourceFile = join(vault.root, entry.sourcePath)
  const outcomes: ReparsedPage[] = []
  const recovered = new Map<number, readonly ParsedBlock[]>()

  for (const page of wanted) {
    let rendered: { directory: string; imagePath: string }
    try {
      rendered = await (deps.renderPage ?? renderPdfPage)(info.renderer!, sourceFile, page, signal)
    } catch (cause) {
      outcomes.push({
        page,
        status: 'render-failed',
        chars: 0,
        message: cause instanceof Error ? cause.message : String(cause),
      })
      continue
    }
    try {
      const answer = await readOnePage(llm, attachments, route, rendered.imagePath, signal)
      if (!answer.ok) {
        outcomes.push({ page, status: 'model-failed', chars: 0, message: answer.message })
        continue
      }
      if (answer.text === '') {
        // An empty answer is NOT written as a recovered page. Replacing "we
        // could not read this" with an empty section would turn a known gap
        // into an invisible one.
        outcomes.push({ page, status: 'empty', chars: 0 })
        continue
      }
      recovered.set(page, blocksForPage(sourceId, entry.title, page, answer.text))
      outcomes.push({ page, status: 'ok', chars: answer.text.length })
    } finally {
      await rm(rendered.directory, { recursive: true, force: true })
    }
  }

  if (recovered.size === 0) {
    return { ...head, status: 'ok', pages: outcomes, recovered: [] }
  }

  // Continue from the emitted extraction when an earlier batch already
  // recovered pages. Re-parsing the untouched PDF here would discard that
  // paid-for text on every later batch. The fallback keeps a damaged/missing
  // derived file recoverable from the original source.
  const parsed = await currentExtraction(vault, entry) ?? await (async () => {
    const bytes = await readFile(sourceFile)
    return await parseSource(bytes, entry.originalName, sourceId)
  })()
  // The manifest is the current pending-page record. Keep it when the test or
  // a repaired vault has a newer degradation list than the untouched source's
  // parser output.
  const merged = spliceRecoveredPages({ ...parsed, degradation: entry.degradation }, recovered)
  const extractedAbsolute = join(vault.root, entry.extractedPath)
  const { markdown, structure } = emitSource(merged, entry.extractedPath)
  const superseded = await readStructure(vault, sourceId)

  await writeFile(extractedAbsolute, markdown, 'utf8')
  await writeFile(structurePathOf(vault, sourceId), `${JSON.stringify(structure, undefined, 2)}\n`, 'utf8')

  const pages = [...new Set([...(entry.reparsed?.pages ?? []), ...recovered.keys()])]
    .sort((left, right) => left - right)
  await upsertManifestEntry(vault, {
    ...entry,
    degradation: merged.degradation,
    structurePath: vaultRelative(vault, structurePathOf(vault, sourceId)),
    reparsed: { pages, via: `${route.provider}/${route.model}`, at: now.toISOString() },
  })

  const memory = await reanchorVaultMemory(vault, superseded, structure)
  const cards = await reanchorConceptCards(vault, superseded, structure)
  return {
    ...head,
    status: 'ok',
    pages: outcomes,
    recovered: [...recovered.keys()].sort((left, right) => left - right),
    reanchored: {
      moved: memory.moved + cards.moved,
      stale: memory.stale + cards.stale,
      recovered: memory.recovered + cards.recovered,
    },
  }
}
