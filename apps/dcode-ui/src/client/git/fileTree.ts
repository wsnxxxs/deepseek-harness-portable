import type { GitFileChange } from '../rpc.ts'

export type GitStatusFilter = 'all' | GitFileChange['status']

export interface FileTreeNode {
  readonly name: string
  readonly path: string
  readonly file?: GitFileChange
  readonly children: readonly FileTreeNode[]
  readonly fileCount: number
}

export interface FileTreeRow {
  readonly kind: 'directory' | 'file'
  readonly name: string
  readonly path: string
  readonly depth: number
  readonly file?: GitFileChange
  readonly fileCount?: number
  readonly expanded?: boolean
}

/** Build a stable, directory-first tree from repository-relative paths. */
export function buildFileTree(files: readonly GitFileChange[]): readonly FileTreeNode[] {
  interface MutableNode { name: string; path: string; file?: GitFileChange; children: Map<string, MutableNode> }
  const root = new Map<string, MutableNode>()
  for (const file of files) {
    let level = root
    let path = ''
    const parts = file.path.split('/').filter(Boolean)
    parts.forEach((name, index) => {
      path = path === '' ? name : `${path}/${name}`
      let node = level.get(name)
      if (node === undefined) {
        node = { name, path, children: new Map() }
        level.set(name, node)
      }
      if (index === parts.length - 1) node.file = file
      level = node.children
    })
  }
  const freeze = (nodes: Map<string, MutableNode>): readonly FileTreeNode[] => [...nodes.values()]
    .sort((left, right) => Number(left.file !== undefined) - Number(right.file !== undefined) || left.name.localeCompare(right.name))
    .map((node) => {
      const children = freeze(node.children)
      return {
        ...node,
        children,
        fileCount: node.file === undefined ? children.reduce((count, child) => count + child.fileCount, 0) : 1,
      }
    })
  return freeze(root)
}

/** Apply the path query and exact porcelain status filter without changing group membership. */
export function filterGitFiles(
  files: readonly GitFileChange[],
  query: string,
  status: GitStatusFilter,
): readonly GitFileChange[] {
  const needle = query.trim().toLocaleLowerCase()
  return files.filter(file => (status === 'all' || file.status === status)
    && (needle === '' || file.path.toLocaleLowerCase().includes(needle)))
}

/** Turn expanded tree state into fixed-height rows suitable for windowing. */
export function flattenFileTree(
  nodes: readonly FileTreeNode[],
  isExpanded: (node: FileTreeNode) => boolean,
  depth = 0,
): readonly FileTreeRow[] {
  const rows: FileTreeRow[] = []
  for (const node of nodes) {
    if (node.file !== undefined) {
      rows.push({ kind: 'file', name: node.name, path: node.path, depth, file: node.file })
      continue
    }
    const expanded = isExpanded(node)
    rows.push({
      kind: 'directory', name: node.name, path: node.path, depth,
      fileCount: node.fileCount, expanded,
    })
    if (expanded) rows.push(...flattenFileTree(node.children, isExpanded, depth + 1))
  }
  return rows
}

export interface VirtualRange {
  readonly start: number
  readonly end: number
}

/** Calculate the small row window that should enter the DOM. */
export function virtualRange(
  count: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  overscan = 5,
): VirtualRange {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const visibleEnd = Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan
  return { start, end: Math.min(count, Math.max(start, visibleEnd)) }
}
