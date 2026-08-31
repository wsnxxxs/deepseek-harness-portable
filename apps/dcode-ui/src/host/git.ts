/**
 * Bounded git reads and one narrow write path for the modern workbench.
 *
 * DSH owns sessions, tools and conversation state but ships no version-control
 * capability, so the Git Changes panel, the diff viewer and the turn-undo
 * action are completed here — a host plugin beside the Runtime rather than a
 * desktop-only shell feature, so the web surface keeps the same panel.
 *
 * Every invocation is a fixed argv against `git` with `--` separating flags
 * from paths, a wall-clock timeout, and a byte cap. No shell is involved, and
 * a caller-supplied path never reaches argv without passing
 * {@link containedRelativePath} first.
 * @module @dsh-portable/dcode-ui/host/git
 */

import { execFile } from 'node:child_process'
import { isAbsolute, relative, resolve, sep } from 'node:path'

/** Wall-clock ceiling for one git invocation. */
const GIT_TIMEOUT_MS = 10_000
/** Byte ceiling on one git invocation's stdout (a very large diff is truncated, never streamed). */
const GIT_MAX_BUFFER = 8 * 1024 * 1024
/** Ceiling on the number of changed-file rows one status answer carries. */
const STATUS_ROW_LIMIT = 2000
/** Ceiling on the characters one diff answer carries. */
const DIFF_CHAR_LIMIT = 400_000

/** One changed path in the working tree. */
export interface GitFileChange {
  /** Repository-relative path, forward-slashed. */
  readonly path: string
  /** Porcelain XY code as reported by git (`??` for untracked). */
  readonly code: string
  /** Coarse presentation status derived from the porcelain code. */
  readonly status: 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'
  /** Whether the change is currently staged. */
  readonly staged: boolean
  /** Added lines, when numstat could measure them. */
  readonly insertions: number
  /** Removed lines, when numstat could measure them. */
  readonly deletions: number
  /** Previous path of a rename. */
  readonly from?: string
}

/** Working-tree summary for one workspace directory. */
export interface GitStatus {
  /** False when the directory is not inside a git work tree; every other field is then empty. */
  readonly repository: boolean
  /** Absolute work-tree root, when one was found. */
  readonly root?: string
  /** Current branch, or a detached-HEAD description. */
  readonly branch?: string
  /** True while HEAD is detached. */
  readonly detached: boolean
  /** Configured upstream ref, when the branch tracks one. */
  readonly upstream?: string
  /** Commits ahead of the upstream. */
  readonly ahead: number
  /** Commits behind the upstream. */
  readonly behind: number
  readonly files: readonly GitFileChange[]
  /** True when the row list was capped. */
  readonly truncated: boolean
  readonly insertions: number
  readonly deletions: number
  /** Why the answer is empty, when a probe failed for a reportable reason. */
  readonly reason?: string
}

/** A unified diff for one path. */
export interface GitDiff {
  readonly path: string
  /** Unified diff text; empty when the file is binary or unchanged. */
  readonly patch: string
  /** True when the patch was capped at {@link DIFF_CHAR_LIMIT}. */
  readonly truncated: boolean
  /** True when git reported the blob as binary. */
  readonly binary: boolean
  readonly insertions: number
  readonly deletions: number
}

/** One local branch row. */
export interface GitBranch {
  readonly name: string
  readonly current: boolean
  /** Subject line of the branch tip. */
  readonly subject?: string
}

/** Result of a commit attempt. */
export interface GitCommitResult {
  readonly committed: boolean
  /** Short hash of the new commit. */
  readonly commit?: string
  /** Human-readable reason a commit was refused (nothing staged, hook rejection, …). */
  readonly reason?: string
}

/** Result of staging or unstaging an explicit set of paths. */
export interface GitStageResult {
  readonly updated: readonly string[]
}

/** Outcome of restoring one path. */
export interface GitRestoreOutcome {
  readonly path: string
  /** `restored` for a tracked file returned to HEAD, `quarantined` for an untracked file moved aside. */
  readonly result: 'restored' | 'quarantined' | 'skipped'
  /** Where a quarantined file was moved, relative to the work-tree root. */
  readonly movedTo?: string
  readonly reason?: string
}

/** A failed git invocation, carrying the trimmed stderr git produced. */
export class GitCommandError extends Error {
  override readonly name = 'GitCommandError'

  /**
   * @param args - argv the invocation used, for the diagnostic message.
   * @param stderr - trimmed git stderr.
   * @param code - process exit code, when one was produced.
   */
  constructor(readonly args: readonly string[], readonly stderr: string, readonly code?: number) {
    super(`git ${args.join(' ')} failed${code === undefined ? '' : ` (exit ${String(code)})`}: ${stderr}`)
  }
}

/**
 * Reject a caller-supplied path that escapes its work tree.
 *
 * Paths arrive from the browser (a file row the operator clicked), so they are
 * untrusted input to an argv. Absolute inputs are accepted only when they
 * resolve inside `root`; the answer is always the forward-slashed
 * root-relative form git itself expects.
 * @param root - absolute work-tree root.
 * @param path - candidate path, absolute or root-relative.
 * @returns the contained root-relative path.
 * @throws {Error} when the path escapes the work tree or is empty.
 */
export function containedRelativePath(root: string, path: string): string {
  if (typeof path !== 'string' || path.trim() === '') throw new Error('path must be a non-empty string')
  if (path.includes('\0')) throw new Error('path must not contain NUL')
  const absolute = isAbsolute(path) ? resolve(path) : resolve(root, path)
  const rel = relative(resolve(root), absolute)
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`path escapes the workspace: ${path}`)
  }
  return rel.split(sep).join('/')
}

/**
 * Run one git invocation and capture its output.
 * @param cwd - directory to run in.
 * @param args - complete argv after the program name.
 * @param options - `tolerateFailure` returns the failed result instead of throwing.
 * @returns stdout, stderr and the exit code.
 * @throws {GitCommandError} on a non-zero exit unless failure is tolerated.
 */
export async function git(
  cwd: string,
  args: readonly string[],
  options: { tolerateFailure?: boolean } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    execFile('git', [...args], {
      cwd,
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      windowsHide: true,
      encoding: 'utf8',
      // A repository-local hook or pager must not be able to hold the Runtime's
      // event loop; git's own pager is disabled by the non-tty stdio anyway.
      env: { ...process.env, GIT_PAGER: 'cat', GIT_OPTIONAL_LOCKS: '0', GIT_TERMINAL_PROMPT: '0' },
    }, (error, stdout, stderr) => {
      const code = (error as { code?: unknown } | null)?.code
      const exit = typeof code === 'number' ? code : error === null ? 0 : 1
      if (error !== null && options.tolerateFailure !== true) {
        rejectPromise(new GitCommandError(args, stderr.trim().slice(0, 2000), exit))
        return
      }
      resolvePromise({ stdout, stderr, code: exit })
    })
  })
}

/** Map a porcelain XY pair onto the coarse presentation status. */
function statusOf(code: string): GitFileChange['status'] {
  if (code === '??') return 'untracked'
  if (code.includes('U') || code === 'AA' || code === 'DD') return 'conflicted'
  if (code.startsWith('R')) return 'renamed'
  if (code.includes('A')) return 'added'
  if (code.includes('D')) return 'deleted'
  return 'modified'
}

/** Map one side of an XY status onto the presentation status for that side. */
function statusOfSide(letter: string, fallback: GitFileChange['status']): GitFileChange['status'] {
  if (letter === 'A') return 'added'
  if (letter === 'D') return 'deleted'
  if (letter === 'R' || letter === 'C') return 'renamed'
  if (letter === '?') return 'untracked'
  if (letter === 'M' || letter === 'T') return 'modified'
  return fallback
}

/** Parse `git status --porcelain=v1 -z` into rows (NUL-separated; renames carry two records). */
export function parsePorcelain(output: string): GitFileChange[] {
  const rows: GitFileChange[] = []
  const records = output.split('\0')
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (record === undefined || record.length < 4) continue
    const code = record.slice(0, 2)
    const path = record.slice(3)
    if (path === '') continue
    if (code.includes('R') || code.includes('C')) {
      // Rename/copy records are followed by their source path in the next record.
      const from = records[index + 1]
      index += 1
      const base = {
        path,
        code,
        insertions: 0,
        deletions: 0,
        ...(from === undefined || from === '' ? {} : { from }),
      }
      if ((code[0] ?? ' ') !== ' ') {
        rows.push({ ...base, status: statusOfSide(code[0] ?? ' ', statusOf(code)), staged: true })
      }
      if ((code[1] ?? ' ') !== ' ') {
        rows.push({ ...base, status: statusOfSide(code[1] ?? ' ', statusOf(code)), staged: false })
      }
      continue
    }
    const coarse = statusOf(code)
    const base = { path, code, insertions: 0, deletions: 0 }
    if (coarse === 'conflicted') {
      rows.push({ ...base, status: 'conflicted', staged: false })
      continue
    }
    if (code === '??') {
      rows.push({ ...base, status: 'untracked', staged: false })
      continue
    }
    if ((code[0] ?? ' ') !== ' ') {
      rows.push({ ...base, status: statusOfSide(code[0] ?? ' ', coarse), staged: true })
    }
    if ((code[1] ?? ' ') !== ' ') {
      rows.push({ ...base, status: statusOfSide(code[1] ?? ' ', coarse), staged: false })
    }
  }
  return rows
}

/** Parse `git diff --numstat -z` into per-path line counts ('-' marks a binary blob). */
export function parseNumstat(output: string): Map<string, { insertions: number; deletions: number }> {
  const counts = new Map<string, { insertions: number; deletions: number }>()
  const records = output.split('\0')
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index]
    if (record === undefined || record === '') continue
    const match = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(record)
    if (match === null) continue
    const [, addedRaw, removedRaw, pathField] = match
    let path = pathField ?? ''
    if (path === '') {
      // A rename in -z form leaves the path field empty and appends the old
      // and new paths as the following two records.
      index += 1
      path = records[index + 1] ?? ''
      index += 1
    }
    if (path === '') continue
    counts.set(path, {
      insertions: addedRaw === '-' ? 0 : Number(addedRaw),
      deletions: removedRaw === '-' ? 0 : Number(removedRaw),
    })
  }
  return counts
}

/** Parse `git status -b --porcelain=v1 -z`'s leading branch header. */
export function parseBranchHeader(header: string): {
  branch?: string
  upstream?: string
  ahead: number
  behind: number
  detached: boolean
} {
  const line = header.startsWith('## ') ? header.slice(3) : header
  if (line.startsWith('HEAD (no branch)')) return { ahead: 0, behind: 0, detached: true }
  const [refs, ...trackingParts] = line.split(' ')
  const tracking = trackingParts.join(' ')
  const [branch, upstream] = (refs ?? '').split('...')
  const ahead = /ahead (\d+)/.exec(tracking)
  const behind = /behind (\d+)/.exec(tracking)
  return {
    ...(branch === undefined || branch === '' ? {} : { branch }),
    ...(upstream === undefined || upstream === '' ? {} : { upstream }),
    ahead: ahead === null ? 0 : Number(ahead[1]),
    behind: behind === null ? 0 : Number(behind[1]),
    detached: false,
  }
}

/**
 * Locate the work-tree root containing a directory.
 * @param cwd - directory to probe.
 * @returns the absolute root, or undefined when the directory is not in a repository.
 */
export async function workTreeRoot(cwd: string): Promise<string | undefined> {
  const probe = await git(cwd, ['rev-parse', '--show-toplevel'], { tolerateFailure: true })
  if (probe.code !== 0) return undefined
  const root = probe.stdout.trim()
  return root === '' ? undefined : resolve(root)
}

/**
 * Read the working-tree status of one directory.
 * @param cwd - any directory inside the repository.
 * @returns the status; `repository: false` when the directory is not versioned.
 */
export async function readStatus(cwd: string): Promise<GitStatus> {
  const empty = { repository: false, detached: false, ahead: 0, behind: 0, files: [], truncated: false, insertions: 0, deletions: 0 } as const
  let root: string | undefined
  try {
    root = await workTreeRoot(cwd)
  } catch (error) {
    return { ...empty, reason: error instanceof Error ? error.message : String(error) }
  }
  if (root === undefined) return empty

  const porcelain = await git(root, ['status', '-b', '--porcelain=v1', '-z', '--untracked-files=all'])
  const records = porcelain.stdout.split('\0')
  const header = records[0] ?? ''
  const branchInfo = parseBranchHeader(header)
  const rows = parsePorcelain(records.slice(1).join('\0'))

  // Two numstat passes: staged changes come from the index, unstaged from the
  // work tree. Untracked files have no diff and keep zero counts.
  const [staged, unstaged] = await Promise.all([
    git(root, ['diff', '--numstat', '-z', '--cached'], { tolerateFailure: true }),
    git(root, ['diff', '--numstat', '-z'], { tolerateFailure: true }),
  ])
  const stagedCounts = parseNumstat(staged.stdout)
  const unstagedCounts = parseNumstat(unstaged.stdout)

  let insertions = 0
  let deletions = 0
  const files = rows.slice(0, STATUS_ROW_LIMIT).map((row) => {
    const counts = row.staged ? stagedCounts.get(row.path) : unstagedCounts.get(row.path)
    const measured = counts ?? unstagedCounts.get(row.path) ?? stagedCounts.get(row.path)
    const enriched: GitFileChange = {
      ...row,
      insertions: measured?.insertions ?? 0,
      deletions: measured?.deletions ?? 0,
    }
    insertions += enriched.insertions
    deletions += enriched.deletions
    return enriched
  })

  return {
    repository: true,
    root,
    detached: branchInfo.detached,
    ...(branchInfo.branch === undefined ? {} : { branch: branchInfo.branch }),
    ...(branchInfo.upstream === undefined ? {} : { upstream: branchInfo.upstream }),
    ahead: branchInfo.ahead,
    behind: branchInfo.behind,
    files,
    truncated: rows.length > STATUS_ROW_LIMIT,
    insertions,
    deletions,
  }
}

/**
 * Read the unified diff of one path.
 * @param cwd - any directory inside the repository.
 * @param path - workspace-relative or absolute path inside the work tree.
 * @param staged - read the index diff instead of the work-tree diff.
 * @returns the patch, capped and flagged when the blob is binary or oversized.
 */
export async function readDiff(cwd: string, path: string, staged: boolean): Promise<GitDiff> {
  const root = await workTreeRoot(cwd)
  if (root === undefined) throw new Error('not a git work tree')
  const relativePath = containedRelativePath(root, path)

  const tracked = await git(root, ['ls-files', '--error-unmatch', '--', relativePath], { tolerateFailure: true })
  const args = tracked.code === 0
    ? ['diff', ...(staged ? ['--cached'] : []), '--no-color', '--', relativePath]
    // An untracked file has no committed side; /dev/null against the work-tree
    // copy renders it as a pure addition instead of an empty patch.
    : ['diff', '--no-color', '--no-index', '--', devNull(), relativePath]
  const result = await git(root, args, { tolerateFailure: true })
  const patch = result.stdout
  const binary = /^Binary files /m.test(patch) || patch.includes('GIT binary patch')
  const numstat = await git(root, tracked.code === 0
    ? ['diff', ...(staged ? ['--cached'] : []), '--numstat', '-z', '--', relativePath]
    : ['diff', '--numstat', '-z', '--no-index', '--', devNull(), relativePath], { tolerateFailure: true })
  const counts = parseNumstat(numstat.stdout)
  const measured = counts.get(relativePath) ?? [...counts.values()][0]

  return {
    path: relativePath,
    patch: binary ? '' : patch.slice(0, DIFF_CHAR_LIMIT),
    truncated: !binary && patch.length > DIFF_CHAR_LIMIT,
    binary,
    insertions: measured?.insertions ?? 0,
    deletions: measured?.deletions ?? 0,
  }
}

/** The platform's empty-file path, the left side of an untracked file's synthetic diff. */
function devNull(): string {
  return process.platform === 'win32' ? 'NUL' : '/dev/null'
}

/**
 * List local branches with their tip subjects.
 * @param cwd - any directory inside the repository.
 * @returns branches in git's own ordering, current branch flagged.
 */
export async function readBranches(cwd: string): Promise<readonly GitBranch[]> {
  const root = await workTreeRoot(cwd)
  if (root === undefined) return []
  const result = await git(root, [
    'for-each-ref', '--format=%(HEAD)%09%(refname:short)%09%(contents:subject)', '--count=200', 'refs/heads',
  ], { tolerateFailure: true })
  if (result.code !== 0) return []
  return result.stdout.split('\n')
    .map(line => line.split('\t'))
    .filter((parts): parts is [string, string, string] => parts.length >= 2 && parts[1] !== '')
    .map(([head, name, subject]) => ({
      name,
      current: head === '*',
      ...(subject === undefined || subject === '' ? {} : { subject }),
    }))
}

/** Resolve and de-duplicate browser-supplied paths, refusing unresolved conflicts. */
async function mutablePaths(root: string, paths: readonly string[]): Promise<readonly string[]> {
  if (paths.length === 0) throw new Error('paths must list at least one file')
  const contained = [...new Set(paths.map(path => containedRelativePath(root, path)))]
  const status = await git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
  const conflicted = new Set(parsePorcelain(status.stdout)
    .filter(row => row.status === 'conflicted')
    .map(row => row.path))
  const requestedConflict = contained.find(path => conflicted.has(path))
  if (requestedConflict !== undefined) throw new Error(`conflicted path cannot be staged here: ${requestedConflict}`)
  return contained
}

/** Stage an explicit set of non-conflicted paths. */
export async function stagePaths(cwd: string, paths: readonly string[]): Promise<GitStageResult> {
  const root = await workTreeRoot(cwd)
  if (root === undefined) throw new Error('not a git work tree')
  const contained = await mutablePaths(root, paths)
  for (let index = 0; index < contained.length; index += 200) {
    await git(root, ['add', '--', ...contained.slice(index, index + 200)])
  }
  return { updated: contained }
}

/** Unstage an explicit set of non-conflicted paths without changing the work tree. */
export async function unstagePaths(cwd: string, paths: readonly string[]): Promise<GitStageResult> {
  const root = await workTreeRoot(cwd)
  if (root === undefined) throw new Error('not a git work tree')
  const contained = await mutablePaths(root, paths)
  const head = await git(root, ['rev-parse', '--verify', 'HEAD'], { tolerateFailure: true })
  for (let index = 0; index < contained.length; index += 200) {
    const chunk = contained.slice(index, index + 200)
    if (head.code === 0) {
      await git(root, ['restore', '--staged', '--', ...chunk])
    } else {
      // `restore --staged` needs HEAD. In a new repository every index entry
      // is an addition, so removing it from the index leaves the work tree intact.
      await git(root, ['rm', '--cached', '--ignore-unmatch', '--', ...chunk])
    }
  }
  return { updated: contained }
}

/**
 * Commit exactly what is already staged.
 *
 * The commit is an explicit operator action from the Git panel: it never
 * stages work-tree changes, pushes, changes branches, or permits an empty
 * commit.
 * @param cwd - any directory inside the repository.
 * @param message - commit message; leading/trailing whitespace is trimmed.
 * @returns whether a commit was created, with the short hash or the refusal reason.
 */
export async function commit(cwd: string, message: string): Promise<GitCommitResult> {
  const root = await workTreeRoot(cwd)
  if (root === undefined) throw new Error('not a git work tree')
  const trimmed = message.trim()
  if (trimmed === '') return { committed: false, reason: 'empty-message' }

  const staged = await git(root, ['diff', '--cached', '--name-only'], { tolerateFailure: true })
  if (staged.stdout.trim() === '') return { committed: false, reason: 'nothing-staged' }

  const created = await git(root, ['commit', '--message', trimmed], { tolerateFailure: true })
  if (created.code !== 0) {
    return { committed: false, reason: created.stderr.trim().slice(0, 500) || 'commit-rejected' }
  }
  const head = await git(root, ['rev-parse', '--short', 'HEAD'], { tolerateFailure: true })
  const hash = head.stdout.trim()
  return { committed: true, ...(hash === '' ? {} : { commit: hash }) }
}

/**
 * Undo the working-tree effect of a set of paths.
 *
 * Tracked paths are restored from HEAD. An untracked path is never deleted:
 * it is moved into `.dsh/dcode-undo/<timestamp>/` inside the work tree, so an
 * accidental undo stays recoverable from the operator's own directory.
 * @param cwd - any directory inside the repository.
 * @param paths - paths to undo.
 * @returns one outcome per requested path, in request order.
 */
export async function undoPaths(
  cwd: string,
  paths: readonly string[],
): Promise<readonly GitRestoreOutcome[]> {
  const root = await workTreeRoot(cwd)
  if (root === undefined) throw new Error('not a git work tree')
  const { mkdir, rename } = await import('node:fs/promises')
  const { dirname, join } = await import('node:path')

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const quarantineRoot = join(root, '.dsh', 'dcode-undo', stamp)
  const outcomes: GitRestoreOutcome[] = []

  for (const requested of paths) {
    let relativePath: string
    try {
      relativePath = containedRelativePath(root, requested)
    } catch (error) {
      outcomes.push({ path: requested, result: 'skipped', reason: error instanceof Error ? error.message : String(error) })
      continue
    }
    const tracked = await git(root, ['ls-files', '--error-unmatch', '--', relativePath], { tolerateFailure: true })
    if (tracked.code === 0) {
      // A path in the index but absent from HEAD is a newly added file:
      // `restore --source=HEAD` removes the index entry *and* deletes the
      // work-tree file with exit 0 and no backup copy. Such files are
      // cleared from the index and quarantined like untracked ones instead.
      const inHead = await git(root, ['cat-file', '-e', 'HEAD:' + relativePath], { tolerateFailure: true })
      if (inHead.code !== 0) {
        const unstaged = await git(root, ['restore', '--staged', '--', relativePath], { tolerateFailure: true })
        if (unstaged.code !== 0) {
          outcomes.push({ path: relativePath, result: 'skipped', reason: unstaged.stderr.trim().slice(0, 300) })
          continue
        }
        try {
          const destination = join(quarantineRoot, relativePath)
          await mkdir(dirname(destination), { recursive: true })
          await rename(join(root, relativePath), destination)
          outcomes.push({
            path: relativePath,
            result: 'quarantined',
            movedTo: `.dsh/dcode-undo/${stamp}/${relativePath}`,
          })
        } catch (error) {
          // The index entry is already cleared; a work-tree file that is
          // missing too has nothing to preserve and counts as restored.
          const code = (error as { code?: unknown } | null)?.code
          outcomes.push(code === 'ENOENT'
            ? { path: relativePath, result: 'restored' }
            : { path: relativePath, result: 'skipped', reason: error instanceof Error ? error.message : String(error) })
        }
        continue
      }
      // Reset the index entry as well, so a staged edit does not survive the undo.
      const restored = await git(root, ['restore', '--staged', '--worktree', '--source=HEAD', '--', relativePath], { tolerateFailure: true })
      outcomes.push(restored.code === 0
        ? { path: relativePath, result: 'restored' }
        : { path: relativePath, result: 'skipped', reason: restored.stderr.trim().slice(0, 300) })
      continue
    }
    // Not in the index either: restore a deleted tracked path from HEAD, and
    // quarantine a genuinely untracked file.
    const inHead = await git(root, ['cat-file', '-e', 'HEAD:' + relativePath], { tolerateFailure: true })
    if (inHead.code === 0) {
      const restored = await git(root, ['restore', '--staged', '--worktree', '--source=HEAD', '--', relativePath], { tolerateFailure: true })
      outcomes.push(restored.code === 0
        ? { path: relativePath, result: 'restored' }
        : { path: relativePath, result: 'skipped', reason: restored.stderr.trim().slice(0, 300) })
      continue
    }
    try {
      const destination = join(quarantineRoot, relativePath)
      await mkdir(dirname(destination), { recursive: true })
      await rename(join(root, relativePath), destination)
      outcomes.push({
        path: relativePath,
        result: 'quarantined',
        movedTo: `.dsh/dcode-undo/${stamp}/${relativePath}`,
      })
    } catch (error) {
      outcomes.push({ path: relativePath, result: 'skipped', reason: error instanceof Error ? error.message : String(error) })
    }
  }
  return outcomes
}

/**
 * Reverse one exact hunk while retaining a recovery bundle beside ordinary
 * DCode undo snapshots. The supplied patch is produced by our own diff RPC;
 * its path is still cross-checked before git sees it.
 */
export async function undoHunk(
  cwd: string,
  path: string,
  patch: string,
  staged: boolean,
): Promise<readonly GitRestoreOutcome[]> {
  const root = await workTreeRoot(cwd)
  if (root === undefined) throw new Error('not a git work tree')
  const relativePath = containedRelativePath(root, path)
  if (patch.length === 0 || patch.length > DIFF_CHAR_LIMIT) throw new Error('patch must be a bounded non-empty diff')
  const headerPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (!new RegExp(`^(?:---|\\+\\+\\+) (?:[ab]/)?${headerPath}$`, 'm').test(patch)) {
    throw new Error('patch path does not match path')
  }

  const { copyFile, mkdir, writeFile } = await import('node:fs/promises')
  const { dirname, join } = await import('node:path')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const recovery = join(root, '.dsh', 'dcode-undo', stamp)
  const patchPath = join(recovery, 'hunk.patch')
  await mkdir(dirname(join(recovery, relativePath)), { recursive: true })
  await writeFile(patchPath, patch, 'utf8')
  try {
    await copyFile(join(root, relativePath), join(recovery, relativePath))
  } catch (cause) {
    if ((cause as { code?: unknown }).code !== 'ENOENT') throw cause
  }

  const applied = await git(root, [
    'apply', '--reverse', '--whitespace=nowarn', ...(staged ? ['--cached'] : []), patchPath,
  ], { tolerateFailure: true })
  if (applied.code !== 0) throw new Error(applied.stderr.trim() || 'git could not reverse this hunk')
  return [{
    path: relativePath,
    result: 'restored',
    movedTo: `.dsh/dcode-undo/${stamp}/${relativePath}`,
  }]
}
