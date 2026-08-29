/**
 * Recursively syntax-checks every script in the directories given as arguments.
 *
 * `node --check` only validates the first path it is handed, so the historic
 * per-file invocations in package.json could not be collapsed into one command.
 * This walks the tree and checks each file separately, preserving the coverage
 * while letting package.json express the gate as a single script call.
 *
 * Usage: node scripts/check-syntax.mjs <dir> [dir...]
 */
import { readdirSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const CHECKABLE = new Set(['.js', '.cjs', '.mjs'])
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'dist-desktop', 'lib', 'coverage'])

function collect(directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue
      collect(join(directory, entry.name), files)
    } else if (CHECKABLE.has(extname(entry.name))) {
      files.push(join(directory, entry.name))
    }
  }
  return files
}

const roots = process.argv.slice(2)
if (roots.length === 0) {
  console.error('usage: node scripts/check-syntax.mjs <dir> [dir...]')
  process.exit(2)
}

let checked = 0
let failed = 0

for (const root of roots) {
  for (const file of collect(resolve(root), [])) {
    checked += 1
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
    if (result.status !== 0) {
      failed += 1
      console.error(result.stderr?.trim() || file)
    }
  }
}

console.log(`syntax check: ${checked} file(s), ${failed} failure(s)`)
process.exit(failed === 0 ? 0 : 1)
