/**
 * Implementation of the `view_image` tool.
 *
 * Local image bytes travel the kernel's own durable path: the attachment store
 * validates and commits them, and the resulting immutable reference rides an
 * `image` content block through `ctx.llm`. History re-analysis resolves an
 * already committed reference from the current session and follows the same
 * model path without writing a second object. Both paths inherit provider
 * configuration, retry policy, token metering, and telemetry.
 * @module @dsh-portable/vision-bridge/view-image
 */

import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'
import type { AttachmentStore, ImageAttachmentRef, ImageMediaType } from '@deepseek-ai/dsh-attachment'
import type { LlmModelInfo, LlmRuntime, StreamChunk } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { getCachedCatalog, selectVisionRoute, type VisionRoute, type TextRoute } from './model-selection.ts'
import { selectHybridRoute } from './hybrid-routing.ts'
import type { ViewImageArgs, ViewImageResult, VisionConfig } from './types.ts'

/** File extensions the attachment store's version-one image path accepts. */
const SUPPORTED_MEDIA_TYPES: Readonly<Record<string, ImageMediaType>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const PDF_RENDERERS = ['pdftoppm', 'pdftocairo'] as const
const PDF_RENDER_DPI = 144
const PDF_RENDER_TIMEOUT_MS = 30_000
const execFileAsync = promisify(execFile)

const DEFAULT_SYSTEM_PROMPT =
  'You are an expert visual analysis assistant. Carefully inspect the provided image and describe its contents with high accuracy. '
  + 'Extract any visible text, user interface elements, error messages, code blocks, diagrams, chart trends, or technical layouts.'

const DEFAULT_INSTRUCTION = 'Please analyze and describe the contents of this image in detail.'
const VISION_TIMEOUT_MS = 60_000

type PdfFailureReason = 'VISION_PDF_RENDERER_UNAVAILABLE' | 'VISION_PDF_RENDER_FAILED'

class PdfRenderError extends Error {
  constructor(
    readonly reason: PdfFailureReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'PdfRenderError'
  }
}

interface RenderedPdfPage {
  directory: string
  imagePath: string
  pageCount?: number
}

function isPdfPath(filePath: string): boolean {
  return extname(filePath).toLowerCase() === '.pdf'
}

function isMissingExecutable(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === 'ENOENT'
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function pdfPageCount(filePath: string, signal?: AbortSignal): Promise<number | undefined> {
  try {
    const result = await execFileAsync('pdfinfo', [filePath], {
      windowsHide: true,
      timeout: PDF_RENDER_TIMEOUT_MS,
      signal,
      maxBuffer: 1024 * 1024,
    })
    const match = /^\s*Pages:\s*(\d+)\s*$/mu.exec(result.stdout)
    if (match === null) return undefined
    const count = Number(match[1])
    return Number.isSafeInteger(count) && count > 0 ? count : undefined
  } catch (error: unknown) {
    if (signal?.aborted) throw error
    return undefined
  }
}

/**
 * Render one PDF page with a system Poppler executable. Keeping this outside
 * the package avoids pulling a 30-40MB PDF parser/rendering stack into the
 * desktop runtime; the tool reports a direct install hint when Poppler is not
 * available on PATH.
 */
async function renderPdfPage(filePath: string, page: number, signal?: AbortSignal): Promise<RenderedPdfPage> {
  const pageCount = await pdfPageCount(filePath, signal)
  if (pageCount !== undefined && page > pageCount) {
    throw new PdfRenderError(
      'VISION_PDF_RENDER_FAILED',
      `PDF page ${String(page)} is out of range; the document has ${String(pageCount)} page${pageCount === 1 ? '' : 's'}.`,
    )
  }
  const directory = await mkdtemp(join(tmpdir(), 'dsh-view-pdf-'))
  const outputBase = join(directory, 'page')

  const errors: string[] = []
  let missingCount = 0

  for (const renderer of PDF_RENDERERS) {
    try {
      await execFileAsync(renderer, [
        '-png',
        '-singlefile',
        '-f', String(page),
        '-l', String(page),
        '-r', String(PDF_RENDER_DPI),
        filePath,
        outputBase,
      ], {
        windowsHide: true,
        timeout: PDF_RENDER_TIMEOUT_MS,
        signal,
        maxBuffer: 1024 * 1024,
      })
    } catch (error: unknown) {
      if (signal?.aborted) {
        await rm(directory, { recursive: true, force: true }).catch(() => undefined)
        throw error
      }
      if (isMissingExecutable(error)) {
        missingCount += 1
        continue
      }
      errors.push(`${renderer}: ${errorMessage(error)}`)
      continue
    }

    const imagePath = `${outputBase}.png`
    try {
      const imageStat = await stat(imagePath)
      if (imageStat.isFile()) return { directory, imagePath, pageCount }
      errors.push(`${renderer}: completed without producing page ${String(page)}`)
    } catch {
      // The renderer exited successfully but did not produce the promised file.
      errors.push(`${renderer}: completed without producing page ${String(page)}`)
    }
  }

  await rm(directory, { recursive: true, force: true })
  if (missingCount === PDF_RENDERERS.length) {
    throw new PdfRenderError(
      'VISION_PDF_RENDERER_UNAVAILABLE',
      'PDF page rendering requires pdftoppm or pdftocairo on PATH. Install Poppler (for example through TeX Live) and retry.',
    )
  }
  throw new PdfRenderError(
    'VISION_PDF_RENDER_FAILED',
    `PDF page ${String(page)} could not be rendered: ${errors.join('; ')}`,
  )
}

/**
 * The exact kernel services this tool consumes.
 *
 * Narrowed to the members actually used so a test can supply doubles without
 * standing up the whole service graph.
 */
export interface VisionRuntime {
  readonly attachments: Pick<AttachmentStore, 'imageLimits' | 'saveImages'>
  readonly llm: Pick<LlmRuntime, 'listProviders' | 'listModels' | 'stream'>
  /** Resolve the exact model route currently serving this Agent's conversation. */
  readonly currentRoute?: (agent: object | undefined) => TextRoute | undefined
}

/**
 * Detect the attachment media type for a path from its extension.
 * @param filePath - path to the candidate image.
 * @returns the media type, or undefined when the extension is not supported.
 */
export function mediaTypeForPath(filePath: string): ImageMediaType | undefined {
  return SUPPORTED_MEDIA_TYPES[extname(filePath).toLowerCase()]
}

/**
 * Enumerate every model the configured providers report.
 * @param llm - the kernel LLM service.
 * @returns catalog entries in provider order; a provider that cannot list is skipped.
 */
export async function visionModelCatalog(llm: VisionRuntime['llm']): Promise<LlmModelInfo[]> {
  const catalog = await getCachedCatalog(llm)
  return catalog as LlmModelInfo[]
}

type ViewImageRouteSelection =
  | { ok: true; kind: 'native' | 'fallback'; route: VisionRoute }
  | { ok: false; reason: string; message: string }

/**
 * Prefer the current conversation model when its catalog entry accepts images.
 * The configured Vision Bridge route is only a fallback for text-only or
 * otherwise unresolved conversation routes.
 */
async function selectViewImageRoute(
  cfg: Required<VisionConfig>,
  runtime: VisionRuntime,
  agent: object | undefined,
): Promise<ViewImageRouteSelection> {
  const catalog = await visionModelCatalog(runtime.llm)
  const current = runtime.currentRoute?.(agent)
  if (current !== undefined) {
    const hybrid = selectHybridRoute({
      current,
      catalog,
      vision: { enabled: cfg.enabled, model: cfg.model },
      hasImage: true,
    })
    if (!hybrid.ok) return hybrid
    if (hybrid.kind === 'native-image') return { ok: true, kind: 'native', route: hybrid.route }
    if (hybrid.kind === 'vision-fallback') return { ok: true, kind: 'fallback', route: hybrid.visionRoute }
  }
  const fallback = selectVisionRoute(
    { enabled: cfg.enabled, model: cfg.model },
    catalog,
  )
  return fallback.ok
    ? { ok: true, kind: 'fallback', route: fallback.route }
    : fallback
}

/** Outcome of draining one model call into a single analysis string. */
type AnalysisOutcome =
  | { ok: true; text: string }
  | { ok: false; message: string; reason: string }

/**
 * Drain a model stream into the assembled analysis text.
 * @param chunks - the raw chunk stream from `llm.stream`.
 * @returns the assembled text, or the terminal failure the stream reported.
 */
export async function collectAnalysis(chunks: AsyncIterable<StreamChunk>): Promise<AnalysisOutcome> {
  let text = ''
  let failed: AnalysisOutcome | undefined
  for await (const chunk of chunks) {
    if (chunk.type === 'text-delta') text += chunk.text
    else if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) {
      failed = {
        ok: false,
        message: `Vision analysis failed: ${chunk.reason.failure.message}`,
        reason: chunk.reason.failure.code,
      }
    }
  }
  if (failed !== undefined) return failed
  if (text.trim().length === 0) {
    return { ok: false, message: 'The vision model returned an empty response.', reason: 'VISION_ANALYSIS_EMPTY' }
  }
  return { ok: true, text }
}

/** Inputs shared by every failure result. */
interface FailureInput {
  message: string
  reason: string
  path: string
  route?: VisionRoute
  ref?: ImageAttachmentRef
  bytes?: number
  source?: 'local' | 'history'
  attachmentId?: string
  page?: number
  pageCount?: number
}

/** Build the failure result shape shared by every early return. */
function failure(input: FailureInput): ViewImageResult {
  return {
    text: `Error: ${input.message}`,
    provider: input.route?.provider ?? '',
    model: input.route?.model ?? '',
    path: input.path,
    bytes: input.ref?.bytes ?? input.bytes ?? 0,
    ...input.ref === undefined ? {} : { width: input.ref.width, height: input.ref.height },
    ...input.source === undefined ? {} : { source: input.source },
    ...input.attachmentId === undefined ? {} : { attachmentId: input.attachmentId },
    ...input.page === undefined ? {} : { page: input.page },
    ...input.pageCount === undefined ? {} : { pageCount: input.pageCount },
    reason: input.reason,
    isError: true,
  }
}

/** Extract one image reference from an arbitrary model content array. */
function imageBlockIn(
  content: unknown,
  match: (ref: ImageAttachmentRef) => boolean,
): ImageAttachmentRef | undefined {
  if (!Array.isArray(content)) return undefined
  for (const value of content) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue
    const block = value as { type?: unknown; attachment?: unknown; content?: unknown }
    if (block.type === 'image' && typeof block.attachment === 'object' && block.attachment !== null) {
      const ref = block.attachment as ImageAttachmentRef
      if (match(ref)) return ref
    }
    // Tool results can carry an image block nested inside their content array.
    if (block.type === 'tool-result') {
      const nested = imageBlockIn(block.content, match)
      if (nested !== undefined) return nested
    }
  }
  return undefined
}

/** Search all durable content carriers used by the session event vocabulary. */
function imageInEvent(
  event: unknown,
  match: (ref: ImageAttachmentRef) => boolean,
): ImageAttachmentRef | undefined {
  if (typeof event !== 'object' || event === null) return undefined
  const record = event as {
    type?: unknown
    data?: {
      content?: unknown
      message?: { content?: unknown }
      inserted?: Array<{ content?: unknown }>
      chunk?: { type?: unknown; block?: unknown }
    }
  }
  const data = record.data
  if (data === undefined) return undefined
  const direct = imageBlockIn(data.content, match)
  if (direct !== undefined) return direct
  if (data.message !== undefined) {
    const wrapped = imageBlockIn(data.message.content, match)
    if (wrapped !== undefined) return wrapped
  }
  if (Array.isArray(data.inserted)) {
    for (const message of data.inserted) {
      const inserted = imageBlockIn(message.content, match)
      if (inserted !== undefined) return inserted
    }
  }
  // Raw assistant chunks can carry a structured image block before the
  // assembled assistant/message event is appended.
  if (record.type === 'assistant/chunk' && data.chunk?.type === 'block-end') {
    return imageBlockIn([data.chunk.block], match)
  }
  return undefined
}

/** Resolve an opaque history id only against refs present in this session log. */
export function findHistoricalImageRef(
  events: readonly unknown[],
  attachmentId: string,
): ImageAttachmentRef | undefined {
  for (const event of events) {
    const found = imageInEvent(event, ref => String(ref.attachmentId) === attachmentId)
    if (found !== undefined) return found
  }
  return undefined
}

/** Get the live session event log without coupling this package to a session package. */
function sessionEvents(exec: ToolExecution): readonly unknown[] {
  const session = (exec.agent as { session?: { snapshotEvents?: () => readonly unknown[]; events?: readonly unknown[] } } | undefined)?.session
  if (typeof session?.snapshotEvents === 'function') {
    return session.snapshotEvents()
  }
  if (Array.isArray(session?.events)) {
    return session.events
  }
  return []
}

/** Render a stable, non-path display key for a history-backed image. */
function historyDisplayPath(attachmentId: string): string {
  return `<history:${attachmentId}>`
}

/** Either the assembled analysis or the route/stream failure that prevented it. */
export type AttachmentAnalysis =
  | { ok: true; text: string; route: VisionRoute }
  | { ok: false; message: string; reason: string; route?: VisionRoute }

/**
 * Analyze one committed image through the configured vision route.
 * @param ref - durable attachment reference for the image.
 * @param instruction - the caller's question about the image.
 * @param cfg - resolved plugin configuration.
 * @param runtime - kernel services.
 * @param signal - cancellation from the tool execution.
 * @returns the assembled analysis, or the route/stream failure.
 */
export async function analyzeAttachment(
  ref: ImageAttachmentRef,
  instruction: string,
  cfg: Required<VisionConfig>,
  runtime: VisionRuntime,
  signal?: AbortSignal,
  routeOverride?: VisionRoute,
): Promise<AttachmentAnalysis> {
  const selection = routeOverride === undefined
    ? selectVisionRoute(
      { enabled: cfg.enabled, model: cfg.model },
      await visionModelCatalog(runtime.llm),
    )
    : { ok: true as const, route: routeOverride }
  if (!selection.ok) return { ok: false, message: selection.message, reason: selection.reason }

  const timeout = AbortSignal.timeout(VISION_TIMEOUT_MS)
  const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  const message = createUserMessage({
    content: [
      { type: 'text', text: instruction },
      { type: 'image', attachment: ref },
    ],
    source: { kind: 'plugin', plugin: 'vision-bridge' },
  })
  let analysis: AnalysisOutcome
  try {
    analysis = await collectAnalysis(runtime.llm.stream({
      provider: selection.route.provider,
      model: selection.route.model,
      messages: [message],
      system: DEFAULT_SYSTEM_PROMPT,
      temperature: 0.1,
      signal: combined,
    }))
  } catch (error: unknown) {
    return {
      ok: false,
      message: `Vision analysis failed: ${errorMessage(error)}`,
      reason: 'VISION_ANALYSIS_FAILED',
      route: selection.route,
    }
  }
  return analysis.ok
    ? { ok: true, text: analysis.text, route: selection.route }
    : { ok: false, message: analysis.message, reason: analysis.reason, route: selection.route }
}

function instructionFor(args: ViewImageArgs): string {
  return args.prompt !== undefined && args.prompt.trim().length > 0
    ? args.prompt.trim()
    : DEFAULT_INSTRUCTION
}

/** Build the native-image result used when the conversation model can inspect the attachment itself. */
function nativeImageResult(
  ref: ImageAttachmentRef,
  instruction: string,
  resultPath: string,
  route: VisionRoute,
  source: 'local' | 'history',
  page?: number,
  pageCount?: number,
  attachmentId?: string,
): ViewImageResult {
  return {
    text: instruction,
    provider: route.provider,
    model: route.model,
    path: resultPath,
    bytes: ref.bytes,
    width: ref.width,
    height: ref.height,
    source,
    image: ref,
    ...page === undefined ? {} : { page },
    ...pageCount === undefined ? {} : { pageCount },
    ...attachmentId === undefined ? {} : { attachmentId },
  }
}

/**
 * Read one raster image from disk, commit it, and either expose it to the
 * current image-capable conversation model or send it through the configured
 * fallback route. `resultPath` lets a rendered PDF page keep the source PDF in
 * the model-facing result while the temporary PNG remains an implementation
 * detail.
 */
async function executeImageFile(
  targetPath: string,
  resultPath: string,
  attachmentName: string,
  mediaType: ImageMediaType,
  args: ViewImageArgs,
  cfg: Required<VisionConfig>,
  runtime: VisionRuntime,
  exec: ToolExecution,
  page?: number,
  pageCount?: number,
): Promise<ViewImageResult> {
  let fileStat
  try {
    fileStat = await stat(targetPath)
  } catch (error: unknown) {
    return failure({
      message: `Image file not found at "${resultPath}": ${errorMessage(error)}`,
      reason: 'VISION_IMAGE_UNREADABLE',
      path: resultPath,
      source: 'local',
      page,
      pageCount,
    })
  }
  if (!fileStat.isFile()) {
    return failure({
      message: `Specified path is a directory, not a file: "${resultPath}"`,
      reason: 'VISION_IMAGE_UNREADABLE',
      path: resultPath,
      source: 'local',
      page,
      pageCount,
    })
  }
  // The attachment store owns this deployment's image policy; checking its
  // bound before reading keeps an oversized file out of memory entirely.
  const maxBytes = runtime.attachments.imageLimits.maxImageBytes
  if (fileStat.size > maxBytes) {
    return failure({
      message: `Image file size (${String(fileStat.size)} bytes) exceeds this deployment limit of ${String(maxBytes)} bytes.`,
      reason: 'VISION_IMAGE_TOO_LARGE',
      path: resultPath,
      bytes: fileStat.size,
      source: 'local',
      page,
      pageCount,
    })
  }

  const instruction = instructionFor(args)
  const selected = await selectViewImageRoute(cfg, runtime, exec.agent)
  if (!selected.ok) {
    return failure({
      message: selected.message,
      reason: selected.reason,
      path: resultPath,
      source: 'local',
      page,
      pageCount,
    })
  }

  let data: Buffer
  try {
    data = await readFile(targetPath)
  } catch (error: unknown) {
    return failure({
      message: `Image file could not be read at "${resultPath}": ${errorMessage(error)}`,
      reason: 'VISION_IMAGE_UNREADABLE',
      path: resultPath,
      bytes: fileStat.size,
      source: 'local',
      page,
      pageCount,
    })
  }
  let ref: ImageAttachmentRef
  try {
    // Admission decodes the raster, so the declared media type, the pixel
    // bound, and the dimension bound are all verified here rather than
    // trusted from the file extension.
    const [saved] = await runtime.attachments.saveImages([{
      data,
      mediaType,
      name: attachmentName,
    }])
    if (saved === undefined) throw new Error('the attachment store committed no reference')
    ref = saved
  } catch (error: unknown) {
    return failure({
      message: `Image was rejected by the attachment store: ${errorMessage(error)}`,
      reason: 'VISION_IMAGE_REJECTED',
      path: resultPath,
      bytes: data.byteLength,
      source: 'local',
      page,
      pageCount,
    })
  }

  if (selected.kind === 'native') {
    return nativeImageResult(ref, instruction, resultPath, selected.route, 'local', page, pageCount)
  }
  const analysis = await analyzeAttachment(ref, instruction, cfg, runtime, exec.signal, selected.route)
  if (!analysis.ok) {
    return failure({
      message: analysis.message,
      reason: analysis.reason,
      path: resultPath,
      ref,
      source: 'local',
      page,
      pageCount,
      ...analysis.route === undefined ? {} : { route: analysis.route },
    })
  }
  return {
    text: analysis.text,
    provider: analysis.route.provider,
    model: analysis.route.model,
    path: resultPath,
    bytes: ref.bytes,
    width: ref.width,
    height: ref.height,
    source: 'local',
    ...page === undefined ? {} : { page },
    ...pageCount === undefined ? {} : { pageCount },
  }
}

/**
 * Execute the `view_image` tool.
 * @param args - tool invocation arguments.
 * @param exec - tool execution context supplying the session workspace and cancellation.
 * @param getConfig - accessor for the current resolved configuration.
 * @param runtime - kernel services.
 * @returns a structured result; recoverable problems are reported, not thrown.
 */
export async function executeViewImage(
  args: ViewImageArgs,
  exec: ToolExecution,
  getConfig: () => Required<VisionConfig>,
  runtime: VisionRuntime,
): Promise<ViewImageResult> {
  const cfg = getConfig()
  const input = args
  const providedPath = typeof input.path === 'string' ? input.path : ''
  const rawPath = providedPath.trim()
  const rawAttachmentId = typeof input.attachmentId === 'string' ? input.attachmentId.trim() : ''
  if (rawPath.length === 0 && rawAttachmentId.length === 0) {
    throw new Error('path must be a non-empty string, or attachmentId must be a non-empty string')
  }
  if (rawPath.length > 0 && rawAttachmentId.length > 0) {
    throw new Error('path and attachmentId are mutually exclusive')
  }
  if (input.page !== undefined && (!Number.isSafeInteger(input.page) || input.page < 1)) {
    throw new Error('page must be a positive integer')
  }
  if (rawAttachmentId.length > 0 && input.page !== undefined) {
    throw new Error('page is only valid when path points to a local PDF')
  }
  if (!cfg.enabled) {
    return failure({
      message: 'Vision Bridge is disabled. Enable it in Settings then Plugins before using view_image.',
      reason: 'VISION_BRIDGE_DISABLED',
      path: rawAttachmentId.length > 0 ? historyDisplayPath(rawAttachmentId) : providedPath,
      source: rawAttachmentId.length > 0 ? 'history' : 'local',
      ...rawAttachmentId.length === 0 && input.page !== undefined ? { page: input.page } : {},
      ...rawAttachmentId.length > 0 ? { attachmentId: rawAttachmentId } : {},
    })
  }

  if (rawAttachmentId.length > 0) {
    const ref = findHistoricalImageRef(sessionEvents(exec), rawAttachmentId)
    const path = historyDisplayPath(rawAttachmentId)
    if (ref === undefined) {
      return failure({
        message: `Image attachment "${rawAttachmentId}" is not referenced by this session's history.`,
        reason: 'VISION_ATTACHMENT_NOT_REFERENCED',
        path,
        source: 'history',
        attachmentId: rawAttachmentId,
      })
    }
    const instruction = instructionFor(input)
    const selected = await selectViewImageRoute(cfg, runtime, exec.agent)
    if (!selected.ok) {
      return failure({
        message: selected.message,
        reason: selected.reason,
        path,
        ref,
        source: 'history',
        attachmentId: rawAttachmentId,
      })
    }
    if (selected.kind === 'native') {
      return nativeImageResult(ref, instruction, path, selected.route, 'history', undefined, undefined, rawAttachmentId)
    }
    const analysis = await analyzeAttachment(ref, instruction, cfg, runtime, exec.signal, selected.route)
    if (!analysis.ok) {
      return failure({
        message: analysis.message,
        reason: analysis.reason,
        path,
        ref,
        source: 'history',
        attachmentId: rawAttachmentId,
        ...analysis.route === undefined ? {} : { route: analysis.route },
      })
    }
    return {
      text: analysis.text,
      provider: analysis.route.provider,
      model: analysis.route.model,
      path,
      bytes: ref.bytes,
      width: ref.width,
      height: ref.height,
      source: 'history',
      attachmentId: rawAttachmentId,
    }
  }

  // The session header's cwd is the durable workspace identity; the host
  // process cwd is the fallback when the session carries none.
  const workspaceRoot = exec.agent?.session.header.cwd ?? process.cwd()
  const targetPath = isAbsolute(rawPath) ? rawPath : resolve(workspaceRoot, rawPath)
  if (input.page !== undefined && !isPdfPath(targetPath)) {
    throw new Error('page is only valid when path points to a local PDF')
  }

  if (isPdfPath(targetPath)) {
    const page = input.page ?? 1
    let rendered: RenderedPdfPage
    try {
      rendered = await renderPdfPage(targetPath, page, exec.signal)
    } catch (error: unknown) {
      if (error instanceof PdfRenderError) {
        return failure({
          message: `Cannot inspect PDF "${targetPath}": ${error.message}`,
          reason: error.reason,
          path: targetPath,
          source: 'local',
          page,
        })
      }
      return failure({
        message: `Cannot inspect PDF "${targetPath}": ${errorMessage(error)}`,
        reason: 'VISION_PDF_RENDER_FAILED',
        path: targetPath,
        source: 'local',
        page,
      })
    }
    try {
      return await executeImageFile(
        rendered.imagePath,
        targetPath,
        `${basename(targetPath)} (page ${String(page)})`,
        'image/png',
        input,
        cfg,
        runtime,
        exec,
        page,
        rendered.pageCount,
      )
    } finally {
      await rm(rendered.directory, { recursive: true, force: true })
    }
  }

  const mediaType = mediaTypeForPath(targetPath)
  if (mediaType === undefined) {
    return failure({
      message: `Cannot inspect "${rawPath}": view_image supports PNG, JPEG, WebP, GIF, and PDF files. For PDF, use the optional 1-based page argument.`,
      reason: 'VISION_UNSUPPORTED_MEDIA_TYPE',
      path: targetPath,
      source: 'local',
    })
  }
  return executeImageFile(targetPath, targetPath, basename(targetPath), mediaType, input, cfg, runtime, exec)
}

/**
 * Format the tool result for model context.
 * @param result - the structured tool output.
 */
export function renderViewImageContent(result: ViewImageResult) {
  if (result.isError === true) return [{ type: 'text' as const, text: result.text }]
  if (result.image !== undefined) {
    const formatted = `<image_input path="${result.path}"${result.page === undefined ? '' : ` page="${String(result.page)}"`}${result.pageCount === undefined ? '' : ` page_count="${String(result.pageCount)}"`} model="${result.model}">\n${result.text}\n</image_input>`
    return [
      { type: 'text' as const, text: formatted },
      { type: 'image' as const, attachment: result.image },
    ]
  }
  const isHistory = 'source' in result && result.source === 'history'
  const formatted = isHistory && 'attachmentId' in result && typeof result.attachmentId === 'string'
    ? `<image_analysis source="history" attachment_id="${result.attachmentId}" model="${result.model}">\n${result.text}\n</image_analysis>`
    : `<image_analysis path="${result.path}"${result.page === undefined ? '' : ` page="${String(result.page)}"`}${result.pageCount === undefined ? '' : ` page_count="${String(result.pageCount)}"`} model="${result.model}">\n${result.text}\n</image_analysis>`
  return [{ type: 'text' as const, text: formatted }]
}
