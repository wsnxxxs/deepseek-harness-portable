/**
 * Vision bridge configuration and tool vocabulary.
 * @module @dsh-portable/vision-bridge/types
 */
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
/**
 * Host-side configuration schema definition.
 *
 * Credentials and endpoints are deliberately absent: image analysis runs on the
 * providers the deployment has already configured, so the vision route is a
 * selection over the kernel's model catalog rather than a second, parallel set
 * of secrets to keep in sync.
 */
export interface VisionConfig {
    /** Whether hybrid image routing and the explicit `view_image` capability are enabled. */
    enabled?: boolean;
    /** Model id to pin; empty selects the first image-capable model. `provider/model` disambiguates duplicates. */
    model?: string;
}
/** Validated arguments for the view_image tool. */
export interface ViewImageArgs {
    /** Path to a local image or PDF file (absolute, or relative to the session workspace). */
    path?: string;
    /** Opaque id of an image already referenced by the current session history. */
    attachmentId?: string;
    /** Optional custom instruction; defaults to describing the image contents. */
    prompt?: string;
    /** 1-based page to render when `path` points to a PDF. Defaults to 1. */
    page?: number;
}
/** Structured output returned by the view_image tool. */
export interface ViewImageResult {
    /** Textual description, native inspection instruction, or failure explanation. */
    text: string;
    /** Provider route used for native inspection or fallback analysis. */
    provider: string;
    /** Model identifier used for native inspection or fallback analysis. */
    model: string;
    /** Normalized local path, or a stable history display key. */
    path: string;
    /** Whether the analyzed image came from disk or the current session history. */
    source?: 'local' | 'history';
    /** 1-based source PDF page when a local PDF was rendered for analysis. */
    page?: number;
    /** Total PDF page count when the local renderer could determine it. */
    pageCount?: number;
    /** Durable id when `source` is `history`. */
    attachmentId?: string;
    /** Encoded image size in bytes. */
    bytes: number;
    /** Intrinsic image width in pixels, once the attachment store has decoded it. */
    width?: number;
    /** Intrinsic image height in pixels, once the attachment store has decoded it. */
    height?: number;
    /** Durable image reference emitted when the current conversation model can inspect images natively. */
    image?: ImageAttachmentRef;
    /** Stable machine-routing code for a failure; absent on success. */
    reason?: string;
    /** Whether this result reports a failure. */
    isError?: boolean;
}
/** A rectangular image region in the image's native coordinate space. */
export interface VisionBoundingBox {
    /** Left edge, in pixels unless `normalized` is true. */
    x: number;
    /** Top edge, in pixels unless `normalized` is true. */
    y: number;
    /** Region width, in pixels unless `normalized` is true. */
    width: number;
    /** Region height, in pixels unless `normalized` is true. */
    height: number;
    /** True when all four values are fractions of the image dimensions. */
    normalized?: boolean;
}
/** One text span recovered from an image. */
export interface VisionOcrEvidence {
    text: string;
    confidence?: number;
    box?: VisionBoundingBox;
    language?: string;
}
/** One coarse region in the visual layout. */
export interface VisionLayoutEvidence {
    /** Stable category such as `header`, `paragraph`, `table`, or `region`. */
    type: string;
    label?: string;
    text?: string;
    box?: VisionBoundingBox;
    order?: number;
}
/** One detected object or UI target. */
export interface VisionObjectEvidence {
    label: string;
    confidence?: number;
    box?: VisionBoundingBox;
    attributes?: Record<string, string>;
}
/** One named point or coordinate returned by the vision model. */
export interface VisionCoordinateEvidence {
    label: string;
    x: number;
    y: number;
    normalized?: boolean;
}
/** One semantic relation inferred from the image. */
export interface VisionSemanticEvidence {
    subject: string;
    predicate: string;
    object: string;
    confidence?: number;
}
/**
 * Provider-neutral, versioned visual evidence handed back to the text model.
 *
 * The shape intentionally uses only JSON values and fixed top-level keys. A
 * parser can therefore preserve useful evidence even when a vision provider
 * returns a partially structured response, while consumers can switch on the
 * schema version before adopting future fields.
 */
export interface StructuredVisualEvidence {
    schemaVersion: 1;
    summary: string;
    ocr: VisionOcrEvidence[];
    layout: VisionLayoutEvidence[];
    objects: VisionObjectEvidence[];
    coordinates: VisionCoordinateEvidence[];
    semantics: VisionSemanticEvidence[];
}
/** Short alias for callers that prefer the product vocabulary. */
export type VisualEvidence = StructuredVisualEvidence;
/** Alias for object/target detectors used by some provider prompts. */
export type VisionTargetEvidence = VisionObjectEvidence;
//# sourceMappingURL=types.d.ts.map