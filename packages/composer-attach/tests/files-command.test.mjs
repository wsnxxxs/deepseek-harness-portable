import { deepStrictEqual, rejects, strictEqual, throws } from 'node:assert/strict'
import { test } from 'node:test'
import { filesCommand } from '../lib/types/client/files-command.js'

const session = { sessionId: 's1' }
const t = key => key

/** Build the contribution over a fake workspace, capturing what it inserts. */
function harness(candidates, { accept = true } = {}) {
  const inserted = []
  const command = filesCommand({
    list: async () => candidates,
    mention: candidate => (candidate.path === 'un readable' ? undefined : `@${candidate.path}`),
    insert: (_session, reference) => {
      inserted.push(reference)
      return accept
    },
    t,
  })
  return { command, inserted }
}

test('the workspace listing becomes searchable options', async () => {
  const { command } = harness([
    { path: 'src', kind: 'directory' },
    { path: 'README.md', kind: 'file' },
  ])
  const options = await command.ui.options(session, AbortSignal.timeout(1000))
  deepStrictEqual(options.map(option => option.label), ['src/', 'README.md'])
  deepStrictEqual(options.map(option => option.detail), ['picker.folder', 'picker.file'])
})

test('the command description resolves the current locale when the menu opens', () => {
  let description = 'Files and folders'
  const command = filesCommand({
    list: async () => [],
    mention: () => undefined,
    insert: () => true,
    t: () => description,
  })
  strictEqual(command.description(), 'Files and folders')
  description = '文件和文件夹'
  strictEqual(command.description(), '文件和文件夹')
})

test('a path with no representable mention is dropped rather than offered', async () => {
  const { command } = harness([{ path: 'un readable', kind: 'file' }, { path: 'ok.ts', kind: 'file' }])
  const options = await command.ui.options(session, AbortSignal.timeout(1000))
  deepStrictEqual(options.map(option => option.label), ['ok.ts'])
})

test('picking a file inserts the basename against the full mention', async () => {
  const { command, inserted } = harness([{ path: 'src/app/main.ts', kind: 'file' }])
  const [option] = await command.ui.options(session, AbortSignal.timeout(1000))
  command.ui.onSelect(option, session)
  deepStrictEqual(inserted, [{ ref: '@src/app/main.ts', label: 'main.ts', appearance: 'file' }])
})

test('picking a folder inserts it as a folder reference', async () => {
  const { command, inserted } = harness([{ path: 'src/app', kind: 'directory' }])
  const [option] = await command.ui.options(session, AbortSignal.timeout(1000))
  command.ui.onSelect(option, session)
  deepStrictEqual(inserted, [{ ref: '@src/app', label: 'app/', appearance: 'folder' }])
})

test('a root-level folder keeps its own name as the chip label', async () => {
  // Regression: deriving the basename from the mention instead of the path
  // read past a directory mention's trailing slash and labelled the chip "/".
  const { command, inserted } = harness([{ path: 'profile_default', kind: 'directory' }])
  const [option] = await command.ui.options(session, AbortSignal.timeout(1000))
  command.ui.onSelect(option, session)
  deepStrictEqual(inserted, [{ ref: '@profile_default', label: 'profile_default/', appearance: 'folder' }])
})

test('a refused insert surfaces in the popup instead of closing it silently', async () => {
  const { command } = harness([{ path: 'a.ts', kind: 'file' }], { accept: false })
  const [option] = await command.ui.options(session, AbortSignal.timeout(1000))
  throws(() => { command.ui.onSelect(option, session) }, /picker.refused/)
})

test('the contribution is a popupSelect named files', () => {
  const { command } = harness([])
  strictEqual(command.name, 'files')
  strictEqual(command.ui.kind, 'popupSelect')
  strictEqual(command.available(), true)
})

test('a listing failure propagates so the popup can report it', async () => {
  const command = filesCommand({
    list: async () => { throw new Error('workspace unavailable') },
    mention: () => '@x',
    insert: () => true,
    t,
  })
  await rejects(() => command.ui.options(session, AbortSignal.timeout(1000)), /workspace unavailable/)
})
