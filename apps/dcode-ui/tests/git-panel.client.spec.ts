import { describe, expect, it } from 'vitest'
import type { GitFileChange } from '../src/client/rpc.ts'
import {
  buildFileTree, filterGitFiles, flattenFileTree, virtualRange,
} from '../src/client/git/fileTree.ts'

const statuses = ['modified', 'added', 'deleted', 'renamed', 'conflicted', 'untracked'] as const

function gitFixture(count = 300): readonly GitFileChange[] {
  return Array.from({ length: count }, (_, index) => ({
    path: `packages/package-${String(Math.floor(index / 30)).padStart(2, '0')}/src/file-${String(index).padStart(3, '0')}.ts`,
    status: statuses[index % statuses.length],
    code: ' M',
    staged: index % 4 === 0,
    insertions: index % 5,
    deletions: index % 3,
  }))
}

describe('large Git file trees', () => {
  const files = gitFixture()

  it('filters all 300 paths by query and exact localized status value', () => {
    expect(files).toHaveLength(300)
    expect(filterGitFiles(files, 'PACKAGE-03', 'all')).toHaveLength(30)
    expect(filterGitFiles(files, 'package-03', 'added')).toHaveLength(5)
    expect(filterGitFiles(files, 'missing', 'all')).toEqual([])
  })

  it('collapses large directories by default but search expansion reveals matches', () => {
    const tree = buildFileTree(files)
    const collapsed = flattenFileTree(tree, node => node.fileCount < 24)
    expect(collapsed).toHaveLength(1)
    expect(collapsed[0]).toMatchObject({ kind: 'directory', path: 'packages', fileCount: 300, expanded: false })

    const matches = filterGitFiles(files, 'file-179.ts', 'all')
    const searched = flattenFileTree(buildFileTree(matches), () => true)
    expect(searched.at(-1)).toMatchObject({ kind: 'file', path: files[179]?.path })
  })

  it('keeps a directory override and windows scrolling around the selected diff', () => {
    const rows = flattenFileTree(buildFileTree(files), node => node.path === 'packages' || node.path.includes('package-05'))
    const selectedPath = files[179]?.path
    const selectedIndex = rows.findIndex(row => row.path === selectedPath)
    expect(selectedIndex).toBeGreaterThan(0)

    const rowHeight = 40
    const viewportHeight = 280
    const scrollTop = selectedIndex * rowHeight - Math.floor(viewportHeight / 2)
    const range = virtualRange(rows.length, scrollTop, viewportHeight, rowHeight)
    expect(range.start).toBeLessThanOrEqual(selectedIndex)
    expect(range.end).toBeGreaterThan(selectedIndex)
    expect(range.end - range.start).toBeLessThan(25)
  })
})
