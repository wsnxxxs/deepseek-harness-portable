/**
 * The dossier's two load-bearing promises, pinned where they can be checked
 * without a filesystem:
 *
 * - a parser's gaps are stated in words an operator and a model can repeat;
 * - an empty dossier is an ordinary state, never an error.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { describeUnread } from '../lib/dossier.js'
import { DOSSIER_ENDPOINTS, handleDossierEndpoint, isDossierEndpoint } from '../lib/index.js'

test('every degradation the parsers can report becomes a sentence', () => {
  const sentences = describeUnread([
    { kind: 'image-only-pages', pages: [12, 13] },
    { kind: 'multi-column-guess', pages: [4] },
    { kind: 'formula-dropped', count: 3 },
    { kind: 'truncated', afterPage: 40, reason: 'source exceeded the size cap' },
    { kind: 'unsupported-format', extension: '.key' },
    { kind: 'parser-unavailable', extension: '.docx', module: 'mammoth' },
    { kind: 'empty-source', reason: 'the file held no text' },
  ])

  // Naming the pages is the point: "some pages failed" is not something an
  // answer can honestly repeat to a reader.
  assert.match(sentences[0], /12, 13/)
  assert.match(sentences[1], /reading order is a guess/)
  assert.match(sentences[2], /3 formula/)
  assert.match(sentences[3], /after page 40.*size cap/)
  assert.match(sentences[4], /\.key/)
  assert.match(sentences[5], /mammoth/)
  assert.match(sentences[6], /no text/)
  assert.equal(sentences.length, 7, 'every kind must produce a sentence, never an empty string')
  for (const sentence of sentences) assert.notEqual(sentence.trim(), '')
})

test('a source that parsed cleanly reports nothing unread', () => {
  assert.deepEqual(describeUnread([]), [])
})

test('the channel narrows its endpoints', () => {
  for (const endpoint of DOSSIER_ENDPOINTS) assert.ok(isDossierEndpoint(endpoint))
  for (const value of ['', 'ATTACH', 'delete', 'summary ', '../read']) {
    assert.equal(isDossierEndpoint(value), false)
  }
})

test('a mission with no dossier summarizes as empty rather than failing', async () => {
  // The panel renders the empty case and its attach control; an error envelope
  // here would make "nothing attached yet" look like a broken channel.
  const result = await handleDossierEndpoint('summary', { cwd: undefined })

  assert.deepEqual(result, { ok: true, value: { started: false, sources: [] } })
})

test('searching a mission with no dossier returns no passages, not an error', async () => {
  assert.deepEqual(
    await handleDossierEndpoint('search', { cwd: undefined, query: 'retry policy' }),
    { ok: true, value: { passages: [] } },
  )
})

test('attach refuses a request that names no file', async () => {
  const result = await handleDossierEndpoint('attach', { cwd: undefined })

  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'bad-request')
})

test('attach without a workspace says so instead of inventing a location', async () => {
  // A dossier belongs to a directory. A mission with none cannot hold one, and
  // guessing a path is exactly what the Host-builds-every-path rule forbids.
  const result = await handleDossierEndpoint('attach', { cwd: undefined, path: '/tmp/spec.pdf' })

  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'dossier-failed')
  assert.match(result.error.message, /working directory/)
})

test('read refuses an incomplete address', async () => {
  const result = await handleDossierEndpoint('read', { cwd: undefined, sourceId: 'spec' })

  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'bad-request')
})
