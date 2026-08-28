import {
  CHECKPOINT_TRANSPORT_PROTOCOL,
  MAX_ACTIVITY_BYTES,
  parseLearningCheckpointV1,
  type LearningCheckpointWaitEnvelopeInputV1,
  type LearningCheckpointWaitEnvelopeV1,
} from './protocol-current.ts'

const MARKER_SUFFIX = '-->'
const CHECKPOINT_WAIT_MARKER_PREFIX = '<!--dsh-learning/checkpoint-wait@1:'
const CHECKPOINT_WAIT_QUESTION_ID_PREFIX = 'dsh-learning/checkpoint-wait@1:'
const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const MAX_CHECKPOINT_ENVELOPE_BASE64_CHARS = Math.ceil((MAX_ACTIVITY_BYTES + 8_192) * 4 / 3)

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let result = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] as number
    const b = bytes[index + 1]
    const c = bytes[index + 2]
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    result += BASE64URL[(triple >> 18) & 63]
    result += BASE64URL[(triple >> 12) & 63]
    if (b !== undefined) result += BASE64URL[(triple >> 6) & 63]
    if (c !== undefined) result += BASE64URL[triple & 63]
  }
  return result
}

function decodeBase64Url(value: string): string | undefined {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return undefined
  const bytes: number[] = []
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64URL.indexOf(value[index] as string)
    const b = BASE64URL.indexOf(value[index + 1] as string)
    const c = value[index + 2] === undefined ? 0 : BASE64URL.indexOf(value[index + 2] as string)
    const d = value[index + 3] === undefined ? 0 : BASE64URL.indexOf(value[index + 3] as string)
    if (a < 0 || b < 0 || c < 0 || d < 0) return undefined
    const triple = (a << 18) | (b << 12) | (c << 6) | d
    bytes.push((triple >> 16) & 255)
    if (value[index + 2] !== undefined) bytes.push((triple >> 8) & 255)
    if (value[index + 3] !== undefined) bytes.push(triple & 255)
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
  } catch {
    return undefined
  }
}

function opaqueToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

function boundedTransportIdentity(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 1
    && value.length <= 512
    && value.trim() === value
    && !/[\u0000-\u001F\u007F]/.test(value)
}

function onlyEnvelopeKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every(key => allowed.includes(key))
}

function assertCheckpointEnvelopeInput(input: LearningCheckpointWaitEnvelopeInputV1): void {
  if (!boundedTransportIdentity(input.sessionId)) {
    throw new Error('sessionId must be a non-empty bounded transport identity')
  }
  if (!boundedTransportIdentity(input.callId)) {
    throw new Error('callId must be a non-empty bounded transport identity')
  }
  if (!opaqueToken(input.waitId)) throw new Error('waitId must be a URL-safe opaque token')
  if (!opaqueToken(input.checkpointId)) throw new Error('checkpointId must be a URL-safe opaque token')
  parseLearningCheckpointV1(input.checkpoint)
}

/** A checkpoint question id contains one opaque lookup token and no teaching payload. */
export function learningCheckpointQuestionId(waitId: string): string {
  if (!opaqueToken(waitId)) throw new Error('waitId must be a URL-safe opaque token')
  return `${CHECKPOINT_WAIT_QUESTION_ID_PREFIX}${waitId}`
}

export function decodeLearningCheckpointQuestionId(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith(CHECKPOINT_WAIT_QUESTION_ID_PREFIX)) return undefined
  const waitId = value.slice(CHECKPOINT_WAIT_QUESTION_ID_PREFIX.length)
  return opaqueToken(waitId) ? waitId : undefined
}

/** Persist one answer-free checkpoint projection so a pending wait survives refresh. */
export function encodeLearningCheckpointDetail(input: LearningCheckpointWaitEnvelopeInputV1): string {
  assertCheckpointEnvelopeInput(input)
  const envelope: LearningCheckpointWaitEnvelopeV1 = {
    transport: CHECKPOINT_TRANSPORT_PROTOCOL,
    ...input,
  }
  return `${CHECKPOINT_WAIT_MARKER_PREFIX}${encodeBase64Url(JSON.stringify(envelope))}${MARKER_SUFFIX}\n${input.checkpoint.fallbackMarkdown}`
}

/** Decode and fully revalidate a package-owned checkpoint wait projection. */
export function decodeLearningCheckpointDetail(detail: unknown): LearningCheckpointWaitEnvelopeV1 | undefined {
  if (typeof detail !== 'string' || !detail.startsWith(CHECKPOINT_WAIT_MARKER_PREFIX)) return undefined
  const end = detail.indexOf(MARKER_SUFFIX, CHECKPOINT_WAIT_MARKER_PREFIX.length)
  if (end < 0) return undefined
  const encoded = detail.slice(CHECKPOINT_WAIT_MARKER_PREFIX.length, end)
  if (encoded.length < 1 || encoded.length > MAX_CHECKPOINT_ENVELOPE_BASE64_CHARS) return undefined
  const json = decodeBase64Url(encoded)
  if (json === undefined) return undefined
  try {
    const parsed = JSON.parse(json) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
    const envelope = parsed as Record<string, unknown>
    if (!onlyEnvelopeKeys(
      envelope,
      ['transport', 'sessionId', 'callId', 'waitId', 'checkpointId', 'checkpoint'],
    )) return undefined
    if (envelope.transport !== CHECKPOINT_TRANSPORT_PROTOCOL
      || !boundedTransportIdentity(envelope.sessionId)
      || !boundedTransportIdentity(envelope.callId)
      || !opaqueToken(envelope.waitId)
      || !opaqueToken(envelope.checkpointId)) return undefined
    const checkpoint = parseLearningCheckpointV1(envelope.checkpoint)
    return {
      transport: CHECKPOINT_TRANSPORT_PROTOCOL,
      sessionId: envelope.sessionId,
      callId: envelope.callId,
      waitId: envelope.waitId,
      checkpointId: envelope.checkpointId,
      checkpoint,
    }
  } catch {
    return undefined
  }
}
