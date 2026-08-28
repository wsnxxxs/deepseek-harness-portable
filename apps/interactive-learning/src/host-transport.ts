/**
 * Host-only transport writers.
 *
 * The renderer still owns the synchronous legacy transport decoders in
 * `transport.ts`. The broker only needs to write current wait projections;
 * keeping those writers here prevents the host entry from eagerly importing
 * the retired V1/V2 activity parsers.
 */

import {
  CHECKPOINT_TRANSPORT_PROTOCOL,
  type LearningCheckpointWaitEnvelopeInputV1,
  type LearningCheckpointWaitEnvelopeV1,
} from './protocol-current.ts'

const MARKER_SUFFIX = '-->'
const WAIT_MARKER_PREFIX = '<!--dsh-learning/wait@2:'
const WAIT_QUESTION_ID_PREFIX = 'dsh-learning/wait@2:'
const CHECKPOINT_WAIT_MARKER_PREFIX = '<!--dsh-learning/checkpoint-wait@1:'
const CHECKPOINT_WAIT_QUESTION_ID_PREFIX = 'dsh-learning/checkpoint-wait@1:'
const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

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

function assertCheckpointEnvelopeInput(input: LearningCheckpointWaitEnvelopeInputV1): void {
  if (!boundedTransportIdentity(input.sessionId)) {
    throw new Error('sessionId must be a non-empty bounded transport identity')
  }
  if (!boundedTransportIdentity(input.callId)) {
    throw new Error('callId must be a non-empty bounded transport identity')
  }
  if (!opaqueToken(input.waitId)) throw new Error('waitId must be a URL-safe opaque token')
  if (!opaqueToken(input.checkpointId)) throw new Error('checkpointId must be a URL-safe opaque token')
}

/** A checkpoint question id contains one opaque lookup token. */
export function learningCheckpointQuestionId(waitId: string): string {
  if (!opaqueToken(waitId)) throw new Error('waitId must be a URL-safe opaque token')
  return `${CHECKPOINT_WAIT_QUESTION_ID_PREFIX}${waitId}`
}

/** Persist one answer-free checkpoint projection for refresh recovery. */
export function encodeLearningCheckpointDetail(input: LearningCheckpointWaitEnvelopeInputV1): string {
  assertCheckpointEnvelopeInput(input)
  const envelope: LearningCheckpointWaitEnvelopeV1 = {
    transport: CHECKPOINT_TRANSPORT_PROTOCOL,
    ...input,
  }
  return `${CHECKPOINT_WAIT_MARKER_PREFIX}${encodeBase64Url(JSON.stringify(envelope))}${MARKER_SUFFIX}\n${input.checkpoint.fallbackMarkdown}`
}
