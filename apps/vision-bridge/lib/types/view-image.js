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
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { selectVisionRoute } from "./model-selection.js";
import { selectHybridRoute } from "./hybrid-routing.js";
/** File extensions the attachment store's version-one image path accepts. */
const SUPPORTED_MEDIA_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};
const PDF_RENDERERS = ['pdftoppm', 'pdftocairo'];
const PDF_RENDER_DPI = 144;
const PDF_RENDER_TIMEOUT_MS = 30_000;
const execFileAsync = promisify(execFile);
const DEFAULT_SYSTEM_PROMPT = 'You are an expert visual analysis assistant. Carefully inspect the provided image and describe its contents with high accuracy. '
    + 'Extract any visible text, user interface elements, error messages, code blocks, diagrams, chart trends, or technical layouts.';
const DEFAULT_INSTRUCTION = 'Please analyze and describe the contents of this image in detail.';
const VISION_TIMEOUT_MS = 60_000;
class PdfRenderError extends Error {
    reason;
    constructor(reason, message, options) {
        super(message, options);
        this.reason = reason;
        this.name = 'PdfRenderError';
    }
}
function isPdfPath(filePath) {
    return extname(filePath).toLowerCase() === '.pdf';
}
function isMissingExecutable(error) {
    return typeof error === 'object'
        && error !== null
        && 'code' in error
        && error.code === 'ENOENT';
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
async function pdfPageCount(filePath, signal) {
    try {
        const result = await execFileAsync('pdfinfo', [filePath], {
            windowsHide: true,
            timeout: PDF_RENDER_TIMEOUT_MS,
            signal,
            maxBuffer: 1024 * 1024,
        });
        const match = /^\s*Pages:\s*(\d+)\s*$/mu.exec(result.stdout);
        if (match === null)
            return undefined;
        const count = Number(match[1]);
        return Number.isSafeInteger(count) && count > 0 ? count : undefined;
    }
    catch (error) {
        if (signal?.aborted)
            throw error;
        return undefined;
    }
}
/**
 * Render one PDF page with a system Poppler executable. Keeping this outside
 * the package avoids pulling a 30-40MB PDF parser/rendering stack into the
 * desktop runtime; the tool reports a direct install hint when Poppler is not
 * available on PATH.
 */
async function renderPdfPage(filePath, page, signal) {
    const pageCount = await pdfPageCount(filePath, signal);
    if (pageCount !== undefined && page > pageCount) {
        throw new PdfRenderError('VISION_PDF_RENDER_FAILED', `PDF page ${String(page)} is out of range; the document has ${String(pageCount)} page${pageCount === 1 ? '' : 's'}.`);
    }
    const directory = await mkdtemp(join(tmpdir(), 'dsh-view-pdf-'));
    const outputBase = join(directory, 'page');
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
            });
        }
        catch (error) {
            if (isMissingExecutable(error))
                continue;
            await rm(directory, { recursive: true, force: true });
            throw new PdfRenderError('VISION_PDF_RENDER_FAILED', `PDF page ${String(page)} could not be rendered: ${errorMessage(error)}`, { cause: error });
        }
        const imagePath = `${outputBase}.png`;
        try {
            const imageStat = await stat(imagePath);
            if (imageStat.isFile())
                return { directory, imagePath, pageCount };
        }
        catch {
            // The renderer exited successfully but did not produce the promised file.
        }
        await rm(directory, { recursive: true, force: true });
        throw new PdfRenderError('VISION_PDF_RENDER_FAILED', `PDF renderer ${renderer} completed without producing page ${String(page)}.`);
    }
    await rm(directory, { recursive: true, force: true });
    throw new PdfRenderError('VISION_PDF_RENDERER_UNAVAILABLE', 'PDF page rendering requires pdftoppm or pdftocairo on PATH. Install Poppler (for example through TeX Live) and retry.');
}
/**
 * Detect the attachment media type for a path from its extension.
 * @param filePath - path to the candidate image.
 * @returns the media type, or undefined when the extension is not supported.
 */
export function mediaTypeForPath(filePath) {
    return SUPPORTED_MEDIA_TYPES[extname(filePath).toLowerCase()];
}
/**
 * Enumerate every model the configured providers report.
 * @param llm - the kernel LLM service.
 * @returns catalog entries in provider order; a provider that cannot list is skipped.
 */
export async function visionModelCatalog(llm) {
    const catalog = [];
    for (const provider of llm.listProviders()) {
        try {
            catalog.push(...await llm.listModels(provider.id));
        }
        catch {
            // A provider that cannot list its models must not hide the ones that can.
            continue;
        }
    }
    return catalog;
}
/**
 * Prefer the current conversation model when its catalog entry accepts images.
 * The configured Vision Bridge route is only a fallback for text-only or
 * otherwise unresolved conversation routes.
 */
async function selectViewImageRoute(cfg, runtime, agent) {
    const catalog = await visionModelCatalog(runtime.llm);
    const current = runtime.currentRoute?.(agent);
    if (current !== undefined) {
        const hybrid = selectHybridRoute({
            current,
            catalog,
            vision: { enabled: cfg.enabled, model: cfg.model },
            hasImage: true,
        });
        if (!hybrid.ok)
            return hybrid;
        if (hybrid.kind === 'native-image')
            return { ok: true, kind: 'native', route: hybrid.route };
        if (hybrid.kind === 'vision-fallback')
            return { ok: true, kind: 'fallback', route: hybrid.visionRoute };
    }
    const fallback = selectVisionRoute({ enabled: cfg.enabled, model: cfg.model }, catalog);
    return fallback.ok
        ? { ok: true, kind: 'fallback', route: fallback.route }
        : fallback;
}
/**
 * Drain a model stream into the assembled analysis text.
 * @param chunks - the raw chunk stream from `llm.stream`.
 * @returns the assembled text, or the terminal failure the stream reported.
 */
export async function collectAnalysis(chunks) {
    let text = '';
    let failed;
    for await (const chunk of chunks) {
        if (chunk.type === 'text-delta')
            text += chunk.text;
        else if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) {
            failed = {
                ok: false,
                message: `Vision analysis failed: ${chunk.reason.failure.message}`,
                reason: chunk.reason.failure.code,
            };
        }
    }
    if (failed !== undefined)
        return failed;
    if (text.trim().length === 0) {
        return { ok: false, message: 'The vision model returned an empty response.', reason: 'VISION_ANALYSIS_EMPTY' };
    }
    return { ok: true, text };
}
/** Build the failure result shape shared by every early return. */
function failure(input) {
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
    };
}
/** Extract one image reference from an arbitrary model content array. */
function imageBlockIn(content, match) {
    if (!Array.isArray(content))
        return undefined;
    for (const value of content) {
        if (typeof value !== 'object' || value === null || Array.isArray(value))
            continue;
        const block = value;
        if (block.type === 'image' && typeof block.attachment === 'object' && block.attachment !== null) {
            const ref = block.attachment;
            if (match(ref))
                return ref;
        }
        // Tool results can carry an image block nested inside their content array.
        if (block.type === 'tool-result') {
            const nested = imageBlockIn(block.content, match);
            if (nested !== undefined)
                return nested;
        }
    }
    return undefined;
}
/** Search all durable content carriers used by the session event vocabulary. */
function imageInEvent(event, match) {
    if (typeof event !== 'object' || event === null)
        return undefined;
    const record = event;
    const data = record.data;
    if (data === undefined)
        return undefined;
    const direct = imageBlockIn(data.content, match);
    if (direct !== undefined)
        return direct;
    if (data.message !== undefined) {
        const wrapped = imageBlockIn(data.message.content, match);
        if (wrapped !== undefined)
            return wrapped;
    }
    if (Array.isArray(data.inserted)) {
        for (const message of data.inserted) {
            const inserted = imageBlockIn(message.content, match);
            if (inserted !== undefined)
                return inserted;
        }
    }
    // Raw assistant chunks can carry a structured image block before the
    // assembled assistant/message event is appended.
    if (record.type === 'assistant/chunk' && data.chunk?.type === 'block-end') {
        return imageBlockIn([data.chunk.block], match);
    }
    return undefined;
}
/** Resolve an opaque history id only against refs present in this session log. */
export function findHistoricalImageRef(events, attachmentId) {
    for (const event of events) {
        const found = imageInEvent(event, ref => String(ref.attachmentId) === attachmentId);
        if (found !== undefined)
            return found;
    }
    return undefined;
}
/** Get the live session event log without coupling this package to a session package. */
function sessionEvents(exec) {
    const session = exec.agent?.session;
    return session?.snapshotEvents?.() ?? [];
}
/** Render a stable, non-path display key for a history-backed image. */
function historyDisplayPath(attachmentId) {
    return `<history:${attachmentId}>`;
}
/**
 * Analyze one committed image through the configured vision route.
 * @param ref - durable attachment reference for the image.
 * @param instruction - the caller's question about the image.
 * @param cfg - resolved plugin configuration.
 * @param runtime - kernel services.
 * @param signal - cancellation from the tool execution.
 * @returns the assembled analysis, or the route/stream failure.
 */
export async function analyzeAttachment(ref, instruction, cfg, runtime, signal, routeOverride) {
    const selection = routeOverride === undefined
        ? selectVisionRoute({ enabled: cfg.enabled, model: cfg.model }, await visionModelCatalog(runtime.llm))
        : { ok: true, route: routeOverride };
    if (!selection.ok)
        return { ok: false, message: selection.message, reason: selection.reason };
    const timeout = AbortSignal.timeout(VISION_TIMEOUT_MS);
    const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
    const message = createUserMessage({
        content: [
            { type: 'text', text: instruction },
            { type: 'image', attachment: ref },
        ],
        source: { kind: 'plugin', plugin: 'vision-bridge' },
    });
    const analysis = await collectAnalysis(runtime.llm.stream({
        provider: selection.route.provider,
        model: selection.route.model,
        messages: [message],
        system: DEFAULT_SYSTEM_PROMPT,
        temperature: 0.1,
        signal: combined,
    }));
    return analysis.ok
        ? { ok: true, text: analysis.text, route: selection.route }
        : { ok: false, message: analysis.message, reason: analysis.reason, route: selection.route };
}
function instructionFor(args) {
    return args.prompt !== undefined && args.prompt.trim().length > 0
        ? args.prompt.trim()
        : DEFAULT_INSTRUCTION;
}
/** Build the native-image result used when the conversation model can inspect the attachment itself. */
function nativeImageResult(ref, instruction, resultPath, route, source, page, pageCount, attachmentId) {
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
    };
}
/**
 * Read one raster image from disk, commit it, and either expose it to the
 * current image-capable conversation model or send it through the configured
 * fallback route. `resultPath` lets a rendered PDF page keep the source PDF in
 * the model-facing result while the temporary PNG remains an implementation
 * detail.
 */
async function executeImageFile(targetPath, resultPath, attachmentName, mediaType, args, cfg, runtime, exec, page, pageCount) {
    let fileStat;
    try {
        fileStat = await stat(targetPath);
    }
    catch (error) {
        return failure({
            message: `Image file not found at "${resultPath}": ${errorMessage(error)}`,
            reason: 'VISION_IMAGE_UNREADABLE',
            path: resultPath,
            source: 'local',
            page,
            pageCount,
        });
    }
    if (!fileStat.isFile()) {
        return failure({
            message: `Specified path is a directory, not a file: "${resultPath}"`,
            reason: 'VISION_IMAGE_UNREADABLE',
            path: resultPath,
            source: 'local',
            page,
            pageCount,
        });
    }
    // The attachment store owns this deployment's image policy; checking its
    // bound before reading keeps an oversized file out of memory entirely.
    const maxBytes = runtime.attachments.imageLimits.maxImageBytes;
    if (fileStat.size > maxBytes) {
        return failure({
            message: `Image file size (${String(fileStat.size)} bytes) exceeds this deployment limit of ${String(maxBytes)} bytes.`,
            reason: 'VISION_IMAGE_TOO_LARGE',
            path: resultPath,
            bytes: fileStat.size,
            source: 'local',
            page,
            pageCount,
        });
    }
    const data = await readFile(targetPath);
    let ref;
    try {
        // Admission decodes the raster, so the declared media type, the pixel
        // bound, and the dimension bound are all verified here rather than
        // trusted from the file extension.
        const [saved] = await runtime.attachments.saveImages([{
                data,
                mediaType,
                name: attachmentName,
            }]);
        if (saved === undefined)
            throw new Error('the attachment store committed no reference');
        ref = saved;
    }
    catch (error) {
        return failure({
            message: `Image was rejected by the attachment store: ${errorMessage(error)}`,
            reason: 'VISION_IMAGE_REJECTED',
            path: resultPath,
            bytes: data.byteLength,
            source: 'local',
            page,
            pageCount,
        });
    }
    const instruction = instructionFor(args);
    const selected = await selectViewImageRoute(cfg, runtime, exec.agent);
    if (!selected.ok) {
        return failure({
            message: selected.message,
            reason: selected.reason,
            path: resultPath,
            ref,
            source: 'local',
            page,
            pageCount,
        });
    }
    if (selected.kind === 'native') {
        return nativeImageResult(ref, instruction, resultPath, selected.route, 'local', page, pageCount);
    }
    const analysis = await analyzeAttachment(ref, instruction, cfg, runtime, exec.signal, selected.route);
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
        });
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
    };
}
/**
 * Execute the `view_image` tool.
 * @param args - tool invocation arguments.
 * @param exec - tool execution context supplying the session workspace and cancellation.
 * @param getConfig - accessor for the current resolved configuration.
 * @param runtime - kernel services.
 * @returns a structured result; recoverable problems are reported, not thrown.
 */
export async function executeViewImage(args, exec, getConfig, runtime) {
    const cfg = getConfig();
    const input = args;
    const providedPath = typeof input.path === 'string' ? input.path : '';
    const rawPath = providedPath.trim();
    const rawAttachmentId = typeof input.attachmentId === 'string' ? input.attachmentId.trim() : '';
    if (rawPath.length === 0 && rawAttachmentId.length === 0) {
        throw new Error('path must be a non-empty string, or attachmentId must be a non-empty string');
    }
    if (rawPath.length > 0 && rawAttachmentId.length > 0) {
        throw new Error('path and attachmentId are mutually exclusive');
    }
    if (input.page !== undefined && (!Number.isSafeInteger(input.page) || input.page < 1)) {
        throw new Error('page must be a positive integer');
    }
    if (rawAttachmentId.length > 0 && input.page !== undefined) {
        throw new Error('page is only valid when path points to a local PDF');
    }
    if (!cfg.enabled) {
        return failure({
            message: 'Vision Bridge is disabled. Enable it in Settings then Plugins before using view_image.',
            reason: 'VISION_BRIDGE_DISABLED',
            path: rawAttachmentId.length > 0 ? historyDisplayPath(rawAttachmentId) : providedPath,
            source: rawAttachmentId.length > 0 ? 'history' : 'local',
            ...rawAttachmentId.length === 0 && input.page !== undefined ? { page: input.page } : {},
            ...rawAttachmentId.length > 0 ? { attachmentId: rawAttachmentId } : {},
        });
    }
    if (rawAttachmentId.length > 0) {
        const ref = findHistoricalImageRef(sessionEvents(exec), rawAttachmentId);
        const path = historyDisplayPath(rawAttachmentId);
        if (ref === undefined) {
            return failure({
                message: `Image attachment "${rawAttachmentId}" is not referenced by this session's history.`,
                reason: 'VISION_ATTACHMENT_NOT_REFERENCED',
                path,
                source: 'history',
                attachmentId: rawAttachmentId,
            });
        }
        const instruction = instructionFor(input);
        const selected = await selectViewImageRoute(cfg, runtime, exec.agent);
        if (!selected.ok) {
            return failure({
                message: selected.message,
                reason: selected.reason,
                path,
                ref,
                source: 'history',
                attachmentId: rawAttachmentId,
            });
        }
        if (selected.kind === 'native') {
            return nativeImageResult(ref, instruction, path, selected.route, 'history', undefined, undefined, rawAttachmentId);
        }
        const analysis = await analyzeAttachment(ref, instruction, cfg, runtime, exec.signal, selected.route);
        if (!analysis.ok) {
            return failure({
                message: analysis.message,
                reason: analysis.reason,
                path,
                ref,
                source: 'history',
                attachmentId: rawAttachmentId,
                ...analysis.route === undefined ? {} : { route: analysis.route },
            });
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
        };
    }
    // The session header's cwd is the durable workspace identity; the host
    // process cwd is the fallback when the session carries none.
    const workspaceRoot = exec.agent?.session.header.cwd ?? process.cwd();
    const targetPath = isAbsolute(rawPath) ? rawPath : resolve(workspaceRoot, rawPath);
    if (input.page !== undefined && !isPdfPath(targetPath)) {
        throw new Error('page is only valid when path points to a local PDF');
    }
    if (isPdfPath(targetPath)) {
        const page = input.page ?? 1;
        let rendered;
        try {
            rendered = await renderPdfPage(targetPath, page, exec.signal);
        }
        catch (error) {
            if (error instanceof PdfRenderError) {
                return failure({
                    message: `Cannot inspect PDF "${targetPath}": ${error.message}`,
                    reason: error.reason,
                    path: targetPath,
                    source: 'local',
                    page,
                });
            }
            return failure({
                message: `Cannot inspect PDF "${targetPath}": ${errorMessage(error)}`,
                reason: 'VISION_PDF_RENDER_FAILED',
                path: targetPath,
                source: 'local',
                page,
            });
        }
        try {
            return await executeImageFile(rendered.imagePath, targetPath, `${basename(targetPath)} (page ${String(page)})`, 'image/png', input, cfg, runtime, exec, page, rendered.pageCount);
        }
        finally {
            await rm(rendered.directory, { recursive: true, force: true });
        }
    }
    const mediaType = mediaTypeForPath(targetPath);
    if (mediaType === undefined) {
        return failure({
            message: `Cannot inspect "${rawPath}": view_image supports PNG, JPEG, WebP, GIF, and PDF files. For PDF, use the optional 1-based page argument.`,
            reason: 'VISION_UNSUPPORTED_MEDIA_TYPE',
            path: targetPath,
            source: 'local',
        });
    }
    return executeImageFile(targetPath, targetPath, basename(targetPath), mediaType, input, cfg, runtime, exec);
}
/**
 * Format the tool result for model context.
 * @param result - the structured tool output.
 */
export function renderViewImageContent(result) {
    if (result.isError === true)
        return [{ type: 'text', text: result.text }];
    if (result.image !== undefined) {
        const formatted = `<image_input path="${result.path}"${result.page === undefined ? '' : ` page="${String(result.page)}"`}${result.pageCount === undefined ? '' : ` page_count="${String(result.pageCount)}"`} model="${result.model}">\n${result.text}\n</image_input>`;
        return [
            { type: 'text', text: formatted },
            { type: 'image', attachment: result.image },
        ];
    }
    const isHistory = 'source' in result && result.source === 'history';
    const formatted = isHistory && 'attachmentId' in result && typeof result.attachmentId === 'string'
        ? `<image_analysis source="history" attachment_id="${result.attachmentId}" model="${result.model}">\n${result.text}\n</image_analysis>`
        : `<image_analysis path="${result.path}"${result.page === undefined ? '' : ` page="${String(result.page)}"`}${result.pageCount === undefined ? '' : ` page_count="${String(result.pageCount)}"`} model="${result.model}">\n${result.text}\n</image_analysis>`;
    return [{ type: 'text', text: formatted }];
}
//# sourceMappingURL=view-image.js.map