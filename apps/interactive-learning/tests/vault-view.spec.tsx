// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { VaultView } from '../src/client/VaultView.tsx'
import { en } from '../src/client/locales.ts'

const t = ((key: keyof typeof en, params?: Record<string, string | number>) => {
  let value = en[key]
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replace(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<'interactive-learning'>

const Panel = VaultView as unknown as ComponentType<Record<string, unknown>>

const SUMMARY = {
  status: 'ok',
  title: '傅里叶',
  root: '/home/ryan/fourier',
  sources: 1,
  concepts: 2,
  notes: 0,
  due: 3,
  degradedSources: 1,
}

const SOURCE = {
  sourceId: 'fourier',
  title: '04_Fourier_Conv.pdf',
  originalName: '04_Fourier_Conv.pdf',
  parser: 'pdf@1',
  bytes: 2_200_000,
  ingestedAt: '2026-08-26T00:00:00.000Z',
  sourcePath: 'sources/04_Fourier_Conv.pdf',
  totalChars: 23_500,
  sectionCount: 3,
  lastPage: 51,
  degradation: [
    { kind: 'image-only-pages', pages: [12, 13, 14, 15] },
    { kind: 'formula-dropped', count: 6 },
  ],
  sections: [
    { id: 'ch1', label: '1 模板匹配', level: 1, page: 1, charCount: 3_200, degraded: false },
    { id: 'ch1-2', label: '1.2 相关性与卷积', level: 2, page: 6, charCount: 900, degraded: true },
    { id: 'ch2', label: '2 卷积定理', level: 1, page: 20, charCount: 8_800, degraded: false },
  ],
}

/** A `call` that answers from a table and records what was asked. */
function host(answers: Record<string, unknown>) {
  const asked: { endpoint: string; payload: Record<string, unknown> }[] = []
  const call = vi.fn(async (endpoint: string, payload: Record<string, unknown>) => {
    asked.push({ endpoint, payload })
    const value = answers[endpoint]
    return value === undefined ? { ok: false } : { ok: true, value }
  })
  return { asked, call }
}

function readyHost(extra: Record<string, unknown> = {}) {
  return host({
    'vault/summary': SUMMARY,
    'vault/sources': { status: 'ok', sources: [SOURCE] },
    'concepts/list': { status: 'ok', concepts: [{}, {}], due: 3, stale: 0 },
    'concepts/review': { status: 'ok', concepts: [{}, {}, {}], due: 3, stale: 0 },
    'notes/list': { status: 'ok', notes: [], pending: 0, blocked: 0 },
    ...extra,
  })
}

afterEach(() => { cleanup() })

describe('vault panel states', () => {
  it('says how a folder becomes a vault instead of showing an error', async () => {
    const { call } = host({
      'vault/summary': { status: 'no-vault' },
      'vault/sources': { status: 'no-vault', sources: [] },
      'concepts/list': { status: 'no-vault' },
      'concepts/review': { status: 'no-vault' },
      'notes/list': { status: 'no-vault' },
    })
    render(<Panel cwd="/code/project" call={call} t={t} />)

    expect(await screen.findByText(en.vaultNoneTitle)).toBeTruthy()
    expect(screen.getByText('/code/project')).toBeTruthy()
  })

  it('reports a failing host rather than pretending the vault is empty', async () => {
    const call = vi.fn(async () => { throw new Error('connection lost') })
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)

    expect(await screen.findByText(en.vaultFailed)).toBeTruthy()
    expect(screen.getByText('connection lost')).toBeTruthy()
  })

  it('distinguishes an empty vault from a missing one', async () => {
    const { call } = host({
      'vault/summary': { ...SUMMARY, status: 'empty', sources: 0, concepts: 0, due: 0, degradedSources: 0 },
      'vault/sources': { status: 'empty', sources: [] },
      'concepts/list': { status: 'ok', concepts: [], due: 0, stale: 0 },
      'concepts/review': { status: 'ok', concepts: [], due: 0, stale: 0 },
      'notes/list': { status: 'ok', notes: [], pending: 0, blocked: 0 },
    })
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)

    expect(await screen.findByText(en.vaultEmptyTitle)).toBeTruthy()
    expect(screen.queryByText(en.vaultNoneTitle)).toBeNull()
  })

  it.each(['vault/summary', 'vault/sources', 'concepts/list', 'concepts/review', 'notes/list'])
    ('reports a failed %s RPC instead of showing a false empty state', async (endpoint) => {
      const { call } = readyHost({ [endpoint]: undefined })
      render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)

      expect(await screen.findByText(en.vaultFailed)).toBeTruthy()
      expect(screen.queryByText(en.vaultNoneTitle)).toBeNull()
      expect(screen.queryByText(en.vaultEmptyTitle)).toBeNull()
      expect(screen.queryByText(en.vaultLoading)).toBeNull()
    })
})

describe('parse coverage', () => {
  it('names the degraded pages instead of summarising them away', async () => {
    const { call } = readyHost()
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)

    expect(await screen.findByText('04_Fourier_Conv.pdf')).toBeTruthy()
    expect(screen.getByText(/pages 12–15 are images/u)).toBeTruthy()
    expect(screen.getByText(/6 math runs were flattened/u)).toBeTruthy()
  })

  it('shows the due count and the partly-read count in the header', async () => {
    const { call } = readyHost()
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)

    expect(await screen.findByText('3 due today')).toBeTruthy()
    expect(screen.getByText('1 partly read')).toBeTruthy()
    expect(screen.getByText('傅里叶')).toBeTruthy()
  })

  it('marks the coverage segment whose page span holds unread pages', async () => {
    const { call } = readyHost()
    const { container } = render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
    await screen.findByText('04_Fourier_Conv.pdf')

    const strip = container.querySelector('[role="img"]')
    expect(strip).toBeTruthy()
    expect(strip?.getAttribute('aria-label')).toContain('3 sections')
    expect(strip?.children).toHaveLength(3)
  })

  it('never claims a page count it was not given', async () => {
    const { call } = readyHost({
      'vault/sources': { status: 'ok', sources: [{ ...SOURCE, lastPage: 0, degradation: [] }] },
    })
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
    await screen.findByText('04_Fourier_Conv.pdf')

    expect(screen.queryByText(/read to p\./u)).toBeNull()
    // Card meta and the footer total both carry it; the point is that the
    // section count is still stated when the page count is unknown.
    expect(screen.getAllByText(/3 sections/u).length).toBeGreaterThan(0)
  })

  it('states the local default and the visual reread exception', async () => {
    const { call } = readyHost()
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
    expect(await screen.findByText(en.vaultLocalOnly)).toBeTruthy()
  })

  it('offers visual re-reading only for image-only pages', async () => {
    const { call } = readyHost({
      'vault/sources': { status: 'ok', sources: [{ ...SOURCE, degradation: [{ kind: 'formula-dropped', count: 6 }] }] },
    })
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)

    await screen.findByText('04_Fourier_Conv.pdf')
    expect(screen.queryByRole('button', { name: en.vaultReparseOffer })).toBeNull()
  })
})

describe('structure drill-down', () => {
  it('reads one section on demand, not the whole source up front', async () => {
    const { asked, call } = readyHost({
      'vault/read': {
        status: 'ok',
        sourceId: 'fourier',
        sectionId: 'ch1-2',
        label: '1.2 相关性与卷积',
        headingPath: ['1 模板匹配', '1.2 相关性与卷积'],
        page: 6,
        body: '相关性不翻转模板，卷积翻转模板。',
        truncated: false,
        children: [],
      },
    })
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
    await screen.findByText('04_Fourier_Conv.pdf')

    expect(asked.some(entry => entry.endpoint === 'vault/read')).toBe(false)

    fireEvent.click(screen.getByText(en.vaultShowSections))
    fireEvent.click(screen.getByText('1.2 相关性与卷积'))

    expect(await screen.findByText('相关性不翻转模板，卷积翻转模板。')).toBeTruthy()
    const read = asked.find(entry => entry.endpoint === 'vault/read')
    expect(read?.payload).toMatchObject({ sourceId: 'fourier', sectionId: 'ch1-2', cwd: '/home/ryan/fourier' })
  })

  it('flags the sections that contain unread pages', async () => {
    const { call } = readyHost()
    render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
    await screen.findByText('04_Fourier_Conv.pdf')
    fireEvent.click(screen.getByText(en.vaultShowSections))

    expect(screen.getAllByText(en.vaultSectionDegraded)).toHaveLength(1)
  })
})

describe('search', () => {
  it('groups hits and reports the terms it searched with', async () => {
    vi.useFakeTimers()
    try {
      const { call } = readyHost({
        'vault/search': {
          status: 'ok',
          terms: ['卷积定理'],
          material: [{
            path: 'extracted/fourier.md',
            title: '04_Fourier_Conv.pdf',
            section: '2 卷积定理',
            sourceId: 'fourier',
            sectionId: 'ch2',
            page: 39,
            excerpt: '空间域的卷积等价于频域的逐点相乘。',
            matched: ['卷积定理'],
          }],
          concepts: [],
          notes: [],
        },
      })
      const { container } = render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
      await vi.waitFor(() => { expect(container.querySelector('input')).toBeTruthy() })

      fireEvent.change(container.querySelector('input') as HTMLInputElement, { target: { value: '卷积定理' } })
      await vi.advanceTimersByTimeAsync(400)

      await vi.waitFor(() => {
        expect(screen.getByText('空间域的卷积等价于频域的逐点相乘。')).toBeTruthy()
      })
      expect(screen.getByText(en.vaultGroupMaterial)).toBeTruthy()
      // An empty group is absent, not an empty heading padding the page.
      expect(screen.queryByText(en.vaultGroupNotes)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('explains a zero-hit query with the terms it used', async () => {
    vi.useFakeTimers()
    try {
      const { call } = readyHost({
        'vault/search': { status: 'ok', terms: ['量子'], material: [], concepts: [], notes: [] },
      })
      const { container } = render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
      await vi.waitFor(() => { expect(container.querySelector('input')).toBeTruthy() })

      fireEvent.change(container.querySelector('input') as HTMLInputElement, { target: { value: '量子' } })
      await vi.advanceTimersByTimeAsync(400)

      await vi.waitFor(() => {
        expect(screen.getByText('No matches. Terms searched: 量子')).toBeTruthy()
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('leaves search results and opens the material chapter that was clicked', async () => {
    vi.useFakeTimers()
    try {
      const { call } = readyHost({
        'vault/search': {
          status: 'ok',
          terms: ['卷积定理'],
          material: [{
            path: 'extracted/fourier.md',
            title: '04_Fourier_Conv.pdf',
            section: '2 卷积定理',
            sourceId: 'fourier',
            sectionId: 'ch2',
            page: 39,
            excerpt: '空间域的卷积等价于频域的逐点相乘。',
            matched: ['卷积定理'],
          }],
          concepts: [],
          notes: [],
        },
        'vault/read': {
          status: 'ok',
          sourceId: 'fourier',
          sectionId: 'ch2',
          label: '2 卷积定理',
          headingPath: ['2 卷积定理'],
          page: 39,
          body: '卷积定理的正文。',
          truncated: false,
          children: [],
        },
      })
      const { container } = render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
      await vi.waitFor(() => { expect(container.querySelector('input')).toBeTruthy() })

      fireEvent.change(container.querySelector('input') as HTMLInputElement, { target: { value: '卷积定理' } })
      await vi.advanceTimersByTimeAsync(400)
      await vi.waitFor(() => { expect(screen.getByText('空间域的卷积等价于频域的逐点相乘。')).toBeTruthy() })

      fireEvent.click(screen.getByText('空间域的卷积等价于频域的逐点相乘。'))

      await vi.waitFor(() => { expect(screen.getByText('卷积定理的正文。')).toBeTruthy() })
      expect(screen.queryByRole('heading', { name: en.vaultGroupMaterial })).toBeNull()
      expect(screen.getByText(en.vaultHideSections)).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('debounces so typing does not re-scan the vault per keystroke', async () => {
    vi.useFakeTimers()
    try {
      const { asked, call } = readyHost({
        'vault/search': { status: 'ok', terms: [], material: [], concepts: [], notes: [] },
      })
      const { container } = render(<Panel cwd="/home/ryan/fourier" call={call} t={t} />)
      await vi.waitFor(() => { expect(container.querySelector('input')).toBeTruthy() })
      const input = container.querySelector('input') as HTMLInputElement

      for (const value of ['卷', '卷积', '卷积定', '卷积定理']) {
        fireEvent.change(input, { target: { value } })
        await vi.advanceTimersByTimeAsync(40)
      }
      await vi.advanceTimersByTimeAsync(400)

      expect(asked.filter(entry => entry.endpoint === 'vault/search')).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
