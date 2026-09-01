import z from "@deepseek-ai/schemastery";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_UI_MODE, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, asUiMode, cycleUiMode, resolveUiMode, uiModeFromSearch, withUiModeParam } from "@dsh-portable/ui-mode";
//#region lib/types/host/git.js
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
/** Wall-clock ceiling for one git invocation. */
const GIT_TIMEOUT_MS = 1e4;
/** Byte ceiling on one git invocation's stdout (a very large diff is truncated, never streamed). */
const GIT_MAX_BUFFER = 8 * 1024 * 1024;
/** Ceiling on the number of changed-file rows one status answer carries. */
const STATUS_ROW_LIMIT = 2e3;
/** Ceiling on the characters one diff answer carries. */
const DIFF_CHAR_LIMIT = 4e5;
/** A failed git invocation, carrying the trimmed stderr git produced. */
var GitCommandError = class extends Error {
	args;
	stderr;
	code;
	name = "GitCommandError";
	/**
	* @param args - argv the invocation used, for the diagnostic message.
	* @param stderr - trimmed git stderr.
	* @param code - process exit code, when one was produced.
	*/
	constructor(args, stderr, code) {
		super(`git ${args.join(" ")} failed${code === void 0 ? "" : ` (exit ${String(code)})`}: ${stderr}`);
		this.args = args;
		this.stderr = stderr;
		this.code = code;
	}
};
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
function containedRelativePath(root, path) {
	if (typeof path !== "string" || path.trim() === "") throw new Error("path must be a non-empty string");
	if (path.includes("\0")) throw new Error("path must not contain NUL");
	const absolute = isAbsolute(path) ? resolve(path) : resolve(root, path);
	const rel = relative(resolve(root), absolute);
	if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) throw new Error(`path escapes the workspace: ${path}`);
	return rel.split(sep).join("/");
}
/**
* Run one git invocation and capture its output.
* @param cwd - directory to run in.
* @param args - complete argv after the program name.
* @param options - `tolerateFailure` returns the failed result instead of throwing.
* @returns stdout, stderr and the exit code.
* @throws {GitCommandError} on a non-zero exit unless failure is tolerated.
*/
async function git(cwd, args, options = {}) {
	return await new Promise((resolvePromise, rejectPromise) => {
		execFile("git", [...args], {
			cwd,
			timeout: GIT_TIMEOUT_MS,
			maxBuffer: GIT_MAX_BUFFER,
			windowsHide: true,
			encoding: "utf8",
			env: {
				...process.env,
				GIT_PAGER: "cat",
				GIT_OPTIONAL_LOCKS: "0",
				GIT_TERMINAL_PROMPT: "0"
			}
		}, (error, stdout, stderr) => {
			const code = error?.code;
			const exit = typeof code === "number" ? code : error === null ? 0 : 1;
			if (error !== null && options.tolerateFailure !== true) {
				rejectPromise(new GitCommandError(args, stderr.trim().slice(0, 2e3), exit));
				return;
			}
			resolvePromise({
				stdout,
				stderr,
				code: exit
			});
		});
	});
}
/** Map a porcelain XY pair onto the coarse presentation status. */
function statusOf(code) {
	if (code === "??") return "untracked";
	if (code.includes("U") || code === "AA" || code === "DD") return "conflicted";
	if (code.startsWith("R")) return "renamed";
	if (code.includes("A")) return "added";
	if (code.includes("D")) return "deleted";
	return "modified";
}
/** Map one side of an XY status onto the presentation status for that side. */
function statusOfSide(letter, fallback) {
	if (letter === "A") return "added";
	if (letter === "D") return "deleted";
	if (letter === "R" || letter === "C") return "renamed";
	if (letter === "?") return "untracked";
	if (letter === "M" || letter === "T") return "modified";
	return fallback;
}
/** Parse `git status --porcelain=v1 -z` into rows (NUL-separated; renames carry two records). */
function parsePorcelain(output) {
	const rows = [];
	const records = output.split("\0");
	for (let index = 0; index < records.length; index += 1) {
		const record = records[index];
		if (record === void 0 || record.length < 4) continue;
		const code = record.slice(0, 2);
		const path = record.slice(3);
		if (path === "") continue;
		if (code.includes("R") || code.includes("C")) {
			const from = records[index + 1];
			index += 1;
			const base = {
				path,
				code,
				insertions: 0,
				deletions: 0,
				...from === void 0 || from === "" ? {} : { from }
			};
			if ((code[0] ?? " ") !== " ") rows.push({
				...base,
				status: statusOfSide(code[0] ?? " ", statusOf(code)),
				staged: true
			});
			if ((code[1] ?? " ") !== " ") rows.push({
				...base,
				status: statusOfSide(code[1] ?? " ", statusOf(code)),
				staged: false
			});
			continue;
		}
		const coarse = statusOf(code);
		const base = {
			path,
			code,
			insertions: 0,
			deletions: 0
		};
		if (coarse === "conflicted") {
			rows.push({
				...base,
				status: "conflicted",
				staged: false
			});
			continue;
		}
		if (code === "??") {
			rows.push({
				...base,
				status: "untracked",
				staged: false
			});
			continue;
		}
		if ((code[0] ?? " ") !== " ") rows.push({
			...base,
			status: statusOfSide(code[0] ?? " ", coarse),
			staged: true
		});
		if ((code[1] ?? " ") !== " ") rows.push({
			...base,
			status: statusOfSide(code[1] ?? " ", coarse),
			staged: false
		});
	}
	return rows;
}
/** Parse `git diff --numstat -z` into per-path line counts ('-' marks a binary blob). */
function parseNumstat(output) {
	const counts = /* @__PURE__ */ new Map();
	const records = output.split("\0");
	for (let index = 0; index < records.length; index += 1) {
		const record = records[index];
		if (record === void 0 || record === "") continue;
		const match = /^(\d+|-)\t(\d+|-)\t(.*)$/.exec(record);
		if (match === null) continue;
		const [, addedRaw, removedRaw, pathField] = match;
		let path = pathField ?? "";
		if (path === "") {
			index += 1;
			path = records[index + 1] ?? "";
			index += 1;
		}
		if (path === "") continue;
		counts.set(path, {
			insertions: addedRaw === "-" ? 0 : Number(addedRaw),
			deletions: removedRaw === "-" ? 0 : Number(removedRaw)
		});
	}
	return counts;
}
/** Parse `git status -b --porcelain=v1 -z`'s leading branch header. */
function parseBranchHeader(header) {
	const line = header.startsWith("## ") ? header.slice(3) : header;
	if (line.startsWith("HEAD (no branch)")) return {
		ahead: 0,
		behind: 0,
		detached: true
	};
	const [refs, ...trackingParts] = line.split(" ");
	const tracking = trackingParts.join(" ");
	const [branch, upstream] = (refs ?? "").split("...");
	const ahead = /ahead (\d+)/.exec(tracking);
	const behind = /behind (\d+)/.exec(tracking);
	return {
		...branch === void 0 || branch === "" ? {} : { branch },
		...upstream === void 0 || upstream === "" ? {} : { upstream },
		ahead: ahead === null ? 0 : Number(ahead[1]),
		behind: behind === null ? 0 : Number(behind[1]),
		detached: false
	};
}
/**
* Locate the work-tree root containing a directory.
* @param cwd - directory to probe.
* @returns the absolute root, or undefined when the directory is not in a repository.
*/
async function workTreeRoot(cwd) {
	const probe = await git(cwd, ["rev-parse", "--show-toplevel"], { tolerateFailure: true });
	if (probe.code !== 0) return void 0;
	const root = probe.stdout.trim();
	return root === "" ? void 0 : resolve(root);
}
/**
* Read the working-tree status of one directory.
* @param cwd - any directory inside the repository.
* @returns the status; `repository: false` when the directory is not versioned.
*/
async function readStatus(cwd) {
	const empty = {
		repository: false,
		detached: false,
		ahead: 0,
		behind: 0,
		files: [],
		truncated: false,
		insertions: 0,
		deletions: 0
	};
	let root;
	try {
		root = await workTreeRoot(cwd);
	} catch (error) {
		return {
			...empty,
			reason: error instanceof Error ? error.message : String(error)
		};
	}
	if (root === void 0) return empty;
	const records = (await git(root, [
		"status",
		"-b",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all"
	])).stdout.split("\0");
	const branchInfo = parseBranchHeader(records[0] ?? "");
	const rows = parsePorcelain(records.slice(1).join("\0"));
	const [staged, unstaged] = await Promise.all([git(root, [
		"diff",
		"--numstat",
		"-z",
		"--cached"
	], { tolerateFailure: true }), git(root, [
		"diff",
		"--numstat",
		"-z"
	], { tolerateFailure: true })]);
	const stagedCounts = parseNumstat(staged.stdout);
	const unstagedCounts = parseNumstat(unstaged.stdout);
	let insertions = 0;
	let deletions = 0;
	const files = rows.slice(0, STATUS_ROW_LIMIT).map((row) => {
		const measured = (row.staged ? stagedCounts.get(row.path) : unstagedCounts.get(row.path)) ?? unstagedCounts.get(row.path) ?? stagedCounts.get(row.path);
		const enriched = {
			...row,
			insertions: measured?.insertions ?? 0,
			deletions: measured?.deletions ?? 0
		};
		insertions += enriched.insertions;
		deletions += enriched.deletions;
		return enriched;
	});
	return {
		repository: true,
		root,
		detached: branchInfo.detached,
		...branchInfo.branch === void 0 ? {} : { branch: branchInfo.branch },
		...branchInfo.upstream === void 0 ? {} : { upstream: branchInfo.upstream },
		ahead: branchInfo.ahead,
		behind: branchInfo.behind,
		files,
		truncated: rows.length > STATUS_ROW_LIMIT,
		insertions,
		deletions
	};
}
/**
* Read the unified diff of one path.
* @param cwd - any directory inside the repository.
* @param path - workspace-relative or absolute path inside the work tree.
* @param staged - read the index diff instead of the work-tree diff.
* @returns the patch, capped and flagged when the blob is binary or oversized.
*/
async function readDiff(cwd, path, staged) {
	const root = await workTreeRoot(cwd);
	if (root === void 0) throw new Error("not a git work tree");
	const relativePath = containedRelativePath(root, path);
	const tracked = await git(root, [
		"ls-files",
		"--error-unmatch",
		"--",
		relativePath
	], { tolerateFailure: true });
	const patch = (await git(root, tracked.code === 0 ? [
		"diff",
		...staged ? ["--cached"] : [],
		"--no-color",
		"--",
		relativePath
	] : [
		"diff",
		"--no-color",
		"--no-index",
		"--",
		devNull(),
		relativePath
	], { tolerateFailure: true })).stdout;
	const binary = /^Binary files /m.test(patch) || patch.includes("GIT binary patch");
	const counts = parseNumstat((await git(root, tracked.code === 0 ? [
		"diff",
		...staged ? ["--cached"] : [],
		"--numstat",
		"-z",
		"--",
		relativePath
	] : [
		"diff",
		"--numstat",
		"-z",
		"--no-index",
		"--",
		devNull(),
		relativePath
	], { tolerateFailure: true })).stdout);
	const measured = counts.get(relativePath) ?? [...counts.values()][0];
	return {
		path: relativePath,
		patch: binary ? "" : patch.slice(0, DIFF_CHAR_LIMIT),
		truncated: !binary && patch.length > DIFF_CHAR_LIMIT,
		binary,
		insertions: measured?.insertions ?? 0,
		deletions: measured?.deletions ?? 0
	};
}
/** The platform's empty-file path, the left side of an untracked file's synthetic diff. */
function devNull() {
	return process.platform === "win32" ? "NUL" : "/dev/null";
}
/**
* List local branches with their tip subjects.
* @param cwd - any directory inside the repository.
* @returns branches in git's own ordering, current branch flagged.
*/
async function readBranches(cwd) {
	const root = await workTreeRoot(cwd);
	if (root === void 0) return [];
	const result = await git(root, [
		"for-each-ref",
		"--format=%(HEAD)%09%(refname:short)%09%(contents:subject)",
		"--count=200",
		"refs/heads"
	], { tolerateFailure: true });
	if (result.code !== 0) return [];
	return result.stdout.split("\n").map((line) => line.split("	")).filter((parts) => parts.length >= 2 && parts[1] !== "").map(([head, name, subject]) => ({
		name,
		current: head === "*",
		...subject === void 0 || subject === "" ? {} : { subject }
	}));
}
/** Resolve and de-duplicate browser-supplied paths, refusing unresolved conflicts. */
async function mutablePaths(root, paths) {
	if (paths.length === 0) throw new Error("paths must list at least one file");
	const contained = [...new Set(paths.map((path) => containedRelativePath(root, path)))];
	const status = await git(root, [
		"status",
		"--porcelain=v1",
		"-z",
		"--untracked-files=all"
	]);
	const conflicted = new Set(parsePorcelain(status.stdout).filter((row) => row.status === "conflicted").map((row) => row.path));
	const requestedConflict = contained.find((path) => conflicted.has(path));
	if (requestedConflict !== void 0) throw new Error(`conflicted path cannot be staged here: ${requestedConflict}`);
	return contained;
}
/** Stage an explicit set of non-conflicted paths. */
async function stagePaths(cwd, paths) {
	const root = await workTreeRoot(cwd);
	if (root === void 0) throw new Error("not a git work tree");
	const contained = await mutablePaths(root, paths);
	for (let index = 0; index < contained.length; index += 200) await git(root, [
		"add",
		"--",
		...contained.slice(index, index + 200)
	]);
	return { updated: contained };
}
/** Unstage an explicit set of non-conflicted paths without changing the work tree. */
async function unstagePaths(cwd, paths) {
	const root = await workTreeRoot(cwd);
	if (root === void 0) throw new Error("not a git work tree");
	const contained = await mutablePaths(root, paths);
	const head = await git(root, [
		"rev-parse",
		"--verify",
		"HEAD"
	], { tolerateFailure: true });
	for (let index = 0; index < contained.length; index += 200) {
		const chunk = contained.slice(index, index + 200);
		if (head.code === 0) await git(root, [
			"restore",
			"--staged",
			"--",
			...chunk
		]);
		else await git(root, [
			"rm",
			"--cached",
			"--ignore-unmatch",
			"--",
			...chunk
		]);
	}
	return { updated: contained };
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
async function commit(cwd, message) {
	const root = await workTreeRoot(cwd);
	if (root === void 0) throw new Error("not a git work tree");
	const trimmed = message.trim();
	if (trimmed === "") return {
		committed: false,
		reason: "empty-message"
	};
	if ((await git(root, [
		"diff",
		"--cached",
		"--name-only"
	], { tolerateFailure: true })).stdout.trim() === "") return {
		committed: false,
		reason: "nothing-staged"
	};
	const created = await git(root, [
		"commit",
		"--message",
		trimmed
	], { tolerateFailure: true });
	if (created.code !== 0) return {
		committed: false,
		reason: created.stderr.trim().slice(0, 500) || "commit-rejected"
	};
	const hash = (await git(root, [
		"rev-parse",
		"--short",
		"HEAD"
	], { tolerateFailure: true })).stdout.trim();
	return {
		committed: true,
		...hash === "" ? {} : { commit: hash }
	};
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
async function undoPaths(cwd, paths) {
	const root = await workTreeRoot(cwd);
	if (root === void 0) throw new Error("not a git work tree");
	const { mkdir, rename } = await import("node:fs/promises");
	const { dirname, join } = await import("node:path");
	const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
	const quarantineRoot = join(root, ".dsh", "dcode-undo", stamp);
	const outcomes = [];
	for (const requested of paths) {
		let relativePath;
		try {
			relativePath = containedRelativePath(root, requested);
		} catch (error) {
			outcomes.push({
				path: requested,
				result: "skipped",
				reason: error instanceof Error ? error.message : String(error)
			});
			continue;
		}
		if ((await git(root, [
			"ls-files",
			"--error-unmatch",
			"--",
			relativePath
		], { tolerateFailure: true })).code === 0) {
			if ((await git(root, [
				"cat-file",
				"-e",
				"HEAD:" + relativePath
			], { tolerateFailure: true })).code !== 0) {
				const unstaged = await git(root, [
					"restore",
					"--staged",
					"--",
					relativePath
				], { tolerateFailure: true });
				if (unstaged.code !== 0) {
					outcomes.push({
						path: relativePath,
						result: "skipped",
						reason: unstaged.stderr.trim().slice(0, 300)
					});
					continue;
				}
				try {
					const destination = join(quarantineRoot, relativePath);
					await mkdir(dirname(destination), { recursive: true });
					await rename(join(root, relativePath), destination);
					outcomes.push({
						path: relativePath,
						result: "quarantined",
						movedTo: `.dsh/dcode-undo/${stamp}/${relativePath}`
					});
				} catch (error) {
					const code = error?.code;
					outcomes.push(code === "ENOENT" ? {
						path: relativePath,
						result: "restored"
					} : {
						path: relativePath,
						result: "skipped",
						reason: error instanceof Error ? error.message : String(error)
					});
				}
				continue;
			}
			const restored = await git(root, [
				"restore",
				"--staged",
				"--worktree",
				"--source=HEAD",
				"--",
				relativePath
			], { tolerateFailure: true });
			outcomes.push(restored.code === 0 ? {
				path: relativePath,
				result: "restored"
			} : {
				path: relativePath,
				result: "skipped",
				reason: restored.stderr.trim().slice(0, 300)
			});
			continue;
		}
		if ((await git(root, [
			"cat-file",
			"-e",
			"HEAD:" + relativePath
		], { tolerateFailure: true })).code === 0) {
			const restored = await git(root, [
				"restore",
				"--staged",
				"--worktree",
				"--source=HEAD",
				"--",
				relativePath
			], { tolerateFailure: true });
			outcomes.push(restored.code === 0 ? {
				path: relativePath,
				result: "restored"
			} : {
				path: relativePath,
				result: "skipped",
				reason: restored.stderr.trim().slice(0, 300)
			});
			continue;
		}
		try {
			const destination = join(quarantineRoot, relativePath);
			await mkdir(dirname(destination), { recursive: true });
			await rename(join(root, relativePath), destination);
			outcomes.push({
				path: relativePath,
				result: "quarantined",
				movedTo: `.dsh/dcode-undo/${stamp}/${relativePath}`
			});
		} catch (error) {
			outcomes.push({
				path: relativePath,
				result: "skipped",
				reason: error instanceof Error ? error.message : String(error)
			});
		}
	}
	return outcomes;
}
/**
* Reverse one exact hunk while retaining a recovery bundle beside ordinary
* DCode undo snapshots. The supplied patch is produced by our own diff RPC;
* its path is still cross-checked before git sees it.
*/
async function undoHunk(cwd, path, patch, staged) {
	const root = await workTreeRoot(cwd);
	if (root === void 0) throw new Error("not a git work tree");
	const relativePath = containedRelativePath(root, path);
	if (patch.length === 0 || patch.length > DIFF_CHAR_LIMIT) throw new Error("patch must be a bounded non-empty diff");
	const headerPath = relativePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	if (!new RegExp(`^(?:---|\\+\\+\\+) (?:[ab]/)?${headerPath}$`, "m").test(patch)) throw new Error("patch path does not match path");
	const { copyFile, mkdir, writeFile } = await import("node:fs/promises");
	const { dirname, join } = await import("node:path");
	const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
	const recovery = join(root, ".dsh", "dcode-undo", stamp);
	const patchPath = join(recovery, "hunk.patch");
	await mkdir(dirname(join(recovery, relativePath)), { recursive: true });
	await writeFile(patchPath, patch, "utf8");
	try {
		await copyFile(join(root, relativePath), join(recovery, relativePath));
	} catch (cause) {
		if (cause.code !== "ENOENT") throw cause;
	}
	const applied = await git(root, [
		"apply",
		"--reverse",
		"--whitespace=nowarn",
		...staged ? ["--cached"] : [],
		patchPath
	], { tolerateFailure: true });
	if (applied.code !== 0) throw new Error(applied.stderr.trim() || "git could not reverse this hunk");
	return [{
		path: relativePath,
		result: "restored",
		movedTo: `.dsh/dcode-undo/${stamp}/${relativePath}`
	}];
}
//#endregion
//#region lib/types/host/rpc.js
/**
* The `/dcode` RPC surface: the capabilities the modern workbench needs that
* DSH itself does not own — working-tree status, file diffs, a narrow commit
* path, per-turn undo, and bounded file reads for the details pane.
*
* Endpoint answers use the same `{ ok, value } | { ok, error }` envelope the
* rest of this distribution's Connection RPC uses, so a client never has to
* distinguish a business refusal from a transport failure by exception type.
* @module @dsh-portable/dcode-ui/host/rpc
*/
/** Every endpoint this channel answers. */
const DCODE_ENDPOINTS = [
	"git/status",
	"git/diff",
	"git/branches",
	"git/stage",
	"git/unstage",
	"git/commit",
	"git/undo",
	"file/read",
	"memory/state",
	"memory/search",
	"memory/run",
	"memory/abort",
	"memory/reset",
	"memory/set-enabled",
	"memory/forget"
];
/** RPC channel this plugin answers on. */
const DCODE_CHANNEL = "/dcode";
/** Byte ceiling on one `file/read` answer; a larger file comes back truncated. */
const FILE_READ_LIMIT = 512 * 1024;
/**
* Whether a value names an endpoint this channel answers.
* @param value - endpoint string from the wire.
*/
function isDcodeEndpoint(value) {
	return typeof value === "string" && DCODE_ENDPOINTS.includes(value);
}
function failure(code, message, details = {}) {
	return {
		ok: false,
		error: {
			code,
			message,
			details
		}
	};
}
/** Read a required absolute workspace directory out of an untrusted payload. */
function requireCwd(payload) {
	const cwd = payload.cwd;
	if (typeof cwd !== "string" || cwd.trim() === "") throw new Error("cwd must be a non-empty absolute path");
	if (!isAbsolute(cwd)) throw new Error("cwd must be absolute");
	return resolve(cwd);
}
/** Read an optional absolute workspace directory out of a wire payload. */
function optionalCwd(payload) {
	if (payload.cwd === void 0) return void 0;
	return requireCwd(payload);
}
/** Read a required string field out of an untrusted payload. */
function requireString(payload, field, maxLength) {
	const value = payload[field];
	if (typeof value !== "string" || value.trim() === "") throw new Error(`${field} must be a non-empty string`);
	if (value.length > maxLength) throw new Error(`${field} must be at most ${String(maxLength)} characters`);
	return value;
}
/** Read an optional bounded string-array field out of an untrusted payload. */
function optionalPaths(payload, field, limit = 500) {
	const value = payload[field];
	if (value === void 0) return void 0;
	if (!Array.isArray(value)) throw new Error(`${field} must be an array of paths`);
	if (value.length > limit) throw new Error(`${field} must contain at most ${String(limit)} paths`);
	return value.map((entry, index) => {
		if (typeof entry !== "string" || entry.trim() === "") throw new Error(`${field}[${String(index)}] must be a non-empty string`);
		return entry;
	});
}
/**
* Answer one `/dcode` endpoint.
*
* Payload shape failures are `bad-request`; a directory outside a repository
* is `not-a-repository`; anything git itself refused is `git-failed` with
* git's own trimmed message.
* @param endpoint - endpoint name, already known to be one of {@link DCODE_ENDPOINTS}.
* @param payload - untrusted wire payload.
* @returns the endpoint's envelope.
*/
async function handleDcodeEndpoint(endpoint, payload, memory) {
	if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return failure("bad-request", "payload must be an object");
	const body = payload;
	try {
		switch (endpoint) {
			case "git/status": return {
				ok: true,
				value: await readStatus(requireCwd(body))
			};
			case "git/diff": return {
				ok: true,
				value: await readDiff(requireCwd(body), requireString(body, "path", 4096), body.staged === true)
			};
			case "git/branches": return {
				ok: true,
				value: { branches: await readBranches(requireCwd(body)) }
			};
			case "git/stage":
			case "git/unstage": {
				const cwd = requireCwd(body);
				const paths = optionalPaths(body, "paths", 2e3);
				if (paths === void 0 || paths.length === 0) return failure("bad-request", "paths must list at least one file");
				return {
					ok: true,
					value: endpoint === "git/stage" ? await stagePaths(cwd, paths) : await unstagePaths(cwd, paths)
				};
			}
			case "git/commit": return {
				ok: true,
				value: await commit(requireCwd(body), requireString(body, "message", 8e3))
			};
			case "git/undo": {
				const cwd = requireCwd(body);
				if (body.patch !== void 0) return {
					ok: true,
					value: { outcomes: await undoHunk(cwd, requireString(body, "path", 4096), requireString(body, "patch", 4e5), body.staged === true) }
				};
				const paths = optionalPaths(body, "paths");
				if (paths === void 0 || paths.length === 0) return failure("bad-request", "paths must list at least one file");
				return {
					ok: true,
					value: { outcomes: await undoPaths(cwd, paths) }
				};
			}
			case "file/read": {
				const cwd = requireCwd(body);
				const contained = containedRelativePath(cwd, requireString(body, "path", 4096));
				const absolute = resolve(cwd, contained);
				const info = await stat(absolute);
				if (!info.isFile()) return failure("bad-request", "path is not a regular file", { path: contained });
				const bytes = await readFile(absolute);
				const truncated = bytes.byteLength > FILE_READ_LIMIT;
				const slice = truncated ? bytes.subarray(0, FILE_READ_LIMIT) : bytes;
				const binary = slice.subarray(0, 8e3).includes(0);
				return {
					ok: true,
					value: {
						path: contained,
						size: info.size,
						truncated,
						binary,
						text: binary ? "" : slice.toString("utf8")
					}
				};
			}
			case "memory/state":
				if (memory === void 0) return failure("unavailable", "memory service is unavailable");
				return {
					ok: true,
					value: memory.getState(optionalCwd(body))
				};
			case "memory/search":
				if (memory === void 0) return failure("unavailable", "memory service is unavailable");
				return {
					ok: true,
					value: memory.search(requireString(body, "query", 4e3), optionalCwd(body))
				};
			case "memory/run":
				if (memory === void 0) return failure("unavailable", "memory service is unavailable");
				return {
					ok: true,
					value: await memory.run(optionalCwd(body))
				};
			case "memory/abort":
				if (memory === void 0) return failure("unavailable", "memory service is unavailable");
				return {
					ok: true,
					value: memory.abort()
				};
			case "memory/reset":
				if (memory === void 0) return failure("unavailable", "memory service is unavailable");
				return {
					ok: true,
					value: memory.reset()
				};
			case "memory/set-enabled":
				if (memory === void 0) return failure("unavailable", "memory service is unavailable");
				if (typeof body.enabled !== "boolean") return failure("bad-request", "enabled must be a boolean");
				return {
					ok: true,
					value: memory.setEnabled(body.enabled)
				};
			case "memory/forget":
				if (memory === void 0) return failure("unavailable", "memory service is unavailable");
				return {
					ok: true,
					value: memory.forget(requireString(body, "id", 200))
				};
			default: return failure("bad-request", `unknown /dcode endpoint`, { endpoint });
		}
	} catch (cause) {
		const message = cause instanceof Error ? cause.message : String(cause);
		if (message === "not a git work tree") return failure("not-a-repository", message);
		if (/^(cwd|path|patch|message|paths|query|enabled|id)\b/.test(message) || message.startsWith("payload")) return failure("bad-request", message);
		if (cause?.code === "ENOENT") return failure("bad-request", message);
		return failure(endpoint.startsWith("memory/") ? "memory-failed" : "git-failed", message);
	}
}
//#endregion
//#region lib/types/host/memory.js
/** Durable memory adapter for the DCode Agent and workflow settings page. */
const SECRET = /(?:\b(?:sk|rk|pk)_[A-Za-z0-9_-]{16,}\b|\b(?:api[_-]?key|authorization|password|token)\s*[:=]\s*[^\s,;]+)/giu;
const MAX_SESSIONS_PER_RUN = 500;
const MAX_CANDIDATES_PER_SESSION = 12;
const MAX_RECORD_LENGTH = 800;
function hash(value) {
	return createHash("sha256").update(value).digest("hex").slice(0, 20);
}
function now() {
	return (/* @__PURE__ */ new Date()).toISOString();
}
function redact(value) {
	return value.replace(SECRET, "[redacted]").replace(/\0/g, "").trim();
}
function objectValue(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function textValue(value) {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join("\n");
	const record = objectValue(value);
	if (record === void 0) return "";
	if (record.type === "reasoning") return "";
	if (typeof record.text === "string") return record.text;
	if (record.type === "text" && typeof record.value === "string") return record.value;
	if (record.content !== void 0) return textValue(record.content);
	if (record.message !== void 0) return textValue(record.message);
	return "";
}
function eventText(event) {
	const record = objectValue(event);
	if (record === void 0 || typeof record.type !== "string") return void 0;
	const data = objectValue(record.data);
	if (data === void 0) return void 0;
	if (record.type === "user/message") return {
		role: "user",
		text: textValue(data.content)
	};
	if (record.type === "assistant/message") return {
		role: "assistant",
		text: textValue(data.message)
	};
	if (record.type === "tool/result") {
		const message = textValue(data.message);
		const error = objectValue(data.error);
		return {
			role: "tool",
			text: [message, error === void 0 ? "" : textValue(error.message) || textValue(error.name)].filter(Boolean).join("\n")
		};
	}
}
function durableCandidate(role, source) {
	const content = redact(source).replace(/\s+/gu, " ").trim().slice(0, MAX_RECORD_LENGTH);
	if (content.length < 10) return void 0;
	if (role === "user") {
		if (!/(?:必须|不要|不应|请使用|请保持|偏好|习惯|默认|始终|always|never|prefer|must|should|do not|don't)/iu.test(content)) return;
		const preference = /(?:偏好|习惯|prefer|always|never|don't|不要)/iu.test(content);
		return {
			kind: preference ? "preference" : "procedure",
			category: preference ? "user_preferences" : "project_conventions",
			content
		};
	}
	if (role === "assistant" && /(?:已修复|修复了|解决|回归|fixed|resolved|workaround|error|failed|失败|报错)/iu.test(content)) return {
		kind: "failure",
		category: "known_failures_and_fixes",
		content
	};
	if (role === "tool" && /(?:error|failed|failure|失败|报错)/iu.test(content)) return {
		kind: "failure",
		category: "known_failures_and_fixes",
		content
	};
}
function projectRoot(cwd) {
	if (cwd === void 0 || cwd.trim() === "") return void 0;
	let current = resolve(cwd);
	while (true) {
		if (existsSync(join(current, ".git"))) return current;
		const parent = resolve(current, "..");
		if (parent === current) return current;
		current = parent;
	}
}
function projectKey(cwd) {
	const root = projectRoot(cwd);
	return root === void 0 ? null : hash(`project:${root.toLowerCase()}`);
}
function parseSourceIds(value) {
	if (typeof value !== "string") return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
	} catch {
		return [];
	}
}
function metaNumber(meta, key) {
	const value = Number(meta.get(key));
	return Number.isFinite(value) ? value : void 0;
}
/**
* Small durable coordinator built on the same session corpus as the rest of
* DSH. It keeps memory as advisory data: only explicit durable-looking
* instructions and verified failures are promoted, and secrets are redacted.
*/
var DcodeMemoryStore = class {
	db;
	source;
	running = false;
	runController;
	timer;
	extracting;
	constructor(options) {
		this.source = options.source;
		mkdirSync(options.root, { recursive: true });
		this.db = new DatabaseSync(join(options.root, "state.sqlite"));
		this.db.exec(`
      PRAGMA busy_timeout=5000;
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS memory_records (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        project_key TEXT,
        category TEXT NOT NULL,
        kind TEXT NOT NULL,
        content TEXT NOT NULL,
        source_session_ids TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memory_jobs (
        session_id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS memory_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(id UNINDEXED, content);
    `);
	}
	getState(cwd) {
		const meta = this.readMeta();
		const enabled = meta.get("enabled") !== "false";
		const key = projectKey(cwd);
		const total = this.db.prepare("SELECT count(*) AS count FROM memory_records").get();
		const project = key === null ? { count: 0 } : this.db.prepare("SELECT count(*) AS count FROM memory_records WHERE project_key = ?").get(key);
		const pending = this.db.prepare("SELECT count(*) AS count FROM memory_jobs WHERE status = 'pending'").get();
		return {
			enabled,
			phase: !enabled ? "disabled" : this.running ? "extracting" : meta.get("error") === void 0 ? "idle" : "error",
			globalCount: Number(total.count ?? 0) - Number(project.count ?? 0),
			projectCount: Number(project.count ?? 0),
			pendingJobs: Number(pending.count ?? 0),
			...meta.get("lastRunAt") === void 0 ? {} : { lastRunAt: meta.get("lastRunAt") },
			...metaNumber(meta, "lastRunProcessed") === void 0 ? {} : { lastRunProcessed: metaNumber(meta, "lastRunProcessed") },
			...metaNumber(meta, "lastRunAdded") === void 0 ? {} : { lastRunAdded: metaNumber(meta, "lastRunAdded") },
			...metaNumber(meta, "lastRunSkipped") === void 0 ? {} : { lastRunSkipped: metaNumber(meta, "lastRunSkipped") },
			lastExtractionMethod: meta.get("lastExtractionMethod") === "heuristic" ? "heuristic" : "none",
			...meta.get("error") === void 0 ? {} : { error: meta.get("error") },
			...this.extracting === void 0 ? {} : {
				extractingTotal: this.extracting.total,
				extractingProcessed: this.extracting.processed,
				extractingAdded: this.extracting.added,
				extractingSkipped: this.extracting.skipped
			}
		};
	}
	setEnabled(enabled) {
		this.writeMeta("enabled", String(enabled));
		if (!enabled) this.abort();
		return this.getState();
	}
	search(query, cwd, limit = 50) {
		const state = this.getState(cwd);
		if (!state.enabled) return {
			items: [],
			state
		};
		const needle = query.trim().toLocaleLowerCase();
		if (needle === "") return {
			items: [],
			state
		};
		const key = projectKey(cwd);
		return {
			items: (key === null ? this.db.prepare("SELECT * FROM memory_records ORDER BY updated_at DESC LIMIT 500").all() : this.db.prepare("SELECT * FROM memory_records WHERE project_key = ? OR scope = 'global' ORDER BY updated_at DESC LIMIT 500").all(key)).filter((row) => typeof row.content === "string" && row.content.toLocaleLowerCase().includes(needle)).slice(0, Math.max(1, Math.min(100, limit))).map((row) => this.recordFromRow(row)).map((record) => ({
				...record,
				snippet: record.content.slice(0, 240)
			})),
			state: this.getState(cwd)
		};
	}
	async run(cwd, signal) {
		const state = this.getState(cwd);
		if (!state.enabled || this.running) return state;
		const source = this.source();
		if (source === void 0) throw new Error("memory session source is unavailable");
		const controller = new AbortController();
		const abort = () => {
			controller.abort();
		};
		signal?.addEventListener("abort", abort, { once: true });
		this.running = true;
		this.runController = controller;
		this.extracting = {
			total: 0,
			processed: 0,
			added: 0,
			skipped: 0
		};
		this.writeMeta("error", "");
		try {
			const sessions = (await source.listSessions(controller.signal)).slice(0, MAX_SESSIONS_PER_RUN);
			this.extracting.total = sessions.length;
			for (const session of sessions) {
				controller.signal.throwIfAborted();
				let added = 0;
				try {
					const log = await source.readSession(session.header.id);
					const candidates = this.extractLog(log);
					for (const candidate of candidates) added += this.upsert(candidate, log.session.id, log.session.cwd ?? session.header.cwd);
					this.db.prepare("DELETE FROM memory_jobs WHERE session_id = ?").run(session.header.id);
				} catch (cause) {
					if (controller.signal.aborted) throw cause;
					this.extracting.skipped += 1;
				}
				this.extracting.processed += 1;
				this.extracting.added += added;
			}
			this.writeMeta("lastRunAt", now());
			this.writeMeta("lastRunProcessed", String(this.extracting.processed));
			this.writeMeta("lastRunAdded", String(this.extracting.added));
			this.writeMeta("lastRunSkipped", String(this.extracting.skipped));
			this.writeMeta("lastExtractionMethod", this.extracting.processed === 0 ? "none" : "heuristic");
			this.db.prepare("DELETE FROM memory_meta WHERE key = 'error'").run();
			return this.getState(cwd);
		} catch (cause) {
			if (!controller.signal.aborted) this.writeMeta("error", cause instanceof Error ? cause.message : String(cause));
			throw cause;
		} finally {
			signal?.removeEventListener("abort", abort);
			this.running = false;
			this.runController = void 0;
			this.extracting = void 0;
		}
	}
	abort() {
		this.runController?.abort();
		return this.getState();
	}
	reset() {
		this.abort();
		this.db.exec("DELETE FROM memory_records; DELETE FROM memory_fts; DELETE FROM memory_jobs;");
		this.db.exec("DELETE FROM memory_meta WHERE key <> 'enabled'");
		return this.getState();
	}
	forget(id) {
		this.db.prepare("DELETE FROM memory_records WHERE id = ?").run(id);
		this.db.prepare("DELETE FROM memory_fts WHERE id = ?").run(id);
		return this.getState();
	}
	markPending(sessionId) {
		if (!this.getState().enabled || sessionId.trim() === "") return;
		this.db.prepare("INSERT INTO memory_jobs(session_id, status, updated_at) VALUES (?, 'pending', ?) ON CONFLICT(session_id) DO UPDATE SET status = 'pending', updated_at = excluded.updated_at").run(sessionId, now());
		if (this.timer !== void 0) return;
		this.timer = setTimeout(() => {
			this.timer = void 0;
			this.run().catch(() => {});
		}, 4e3);
	}
	dispose() {
		if (this.timer !== void 0) clearTimeout(this.timer);
		this.timer = void 0;
		this.abort();
		this.db.close();
	}
	readMeta() {
		const rows = this.db.prepare("SELECT key, value FROM memory_meta").all();
		return new Map(rows.map((row) => [row.key, row.value]));
	}
	writeMeta(key, value) {
		this.db.prepare("INSERT OR REPLACE INTO memory_meta(key, value) VALUES (?, ?)").run(key, value);
	}
	extractLog(log) {
		const candidates = [];
		const seen = /* @__PURE__ */ new Set();
		for (const event of log.events) {
			const extracted = eventText(event);
			if (extracted === void 0) continue;
			const candidate = durableCandidate(extracted.role, extracted.text);
			if (candidate === void 0 || seen.has(candidate.content)) continue;
			seen.add(candidate.content);
			candidates.push(candidate);
			if (candidates.length >= MAX_CANDIDATES_PER_SESSION) break;
		}
		return candidates;
	}
	upsert(candidate, sessionId, cwd) {
		const key = projectKey(cwd);
		const existing = this.db.prepare("SELECT id, source_session_ids FROM memory_records WHERE project_key IS ? AND content = ?").get(key, candidate.content);
		const sourceIds = new Set(existing === void 0 ? [] : parseSourceIds(existing.source_session_ids));
		sourceIds.add(sessionId);
		const timestamp = now();
		if (existing?.id !== void 0) {
			this.db.prepare("UPDATE memory_records SET category = ?, kind = ?, source_session_ids = ?, updated_at = ? WHERE id = ?").run(candidate.category, candidate.kind, JSON.stringify([...sourceIds]), timestamp, existing.id);
			return 0;
		}
		const id = hash(`${key ?? "global"}:${candidate.content}`);
		this.db.prepare("INSERT INTO memory_records(id, scope, project_key, category, kind, content, source_session_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, key === null ? "global" : "project", key, candidate.category, candidate.kind, candidate.content, JSON.stringify([...sourceIds]), timestamp, timestamp);
		this.db.prepare("INSERT INTO memory_fts(id, content) VALUES (?, ?)").run(id, candidate.content);
		return 1;
	}
	recordFromRow(row) {
		const scope = row.scope === "global" ? "global" : "project";
		const category = typeof row.category === "string" ? row.category : "project_conventions";
		const kind = typeof row.kind === "string" ? row.kind : "fact";
		return {
			id: typeof row.id === "string" ? row.id : hash(String(row.content ?? "")),
			scope,
			category,
			kind,
			content: typeof row.content === "string" ? row.content : "",
			sourceSessionIds: parseSourceIds(row.source_session_ids),
			updatedAt: typeof row.updated_at === "string" ? row.updated_at : now()
		};
	}
};
/** Resolve the same portable DSH data root used by the packaged runtime. */
function defaultDcodeMemoryRoot() {
	const configured = process.env.DSH_HOME?.trim();
	return join(resolve(configured === void 0 || configured === "" ? join(homedir(), ".dsh") : configured), "dcode-memory");
}
//#endregion
//#region lib/types/index.js
/**
* Host-side Cordis plugin entrypoint for @dsh-portable/dcode-ui.
*
* The package ships two halves. This one is small on purpose: the modern
* workbench reuses DSH's own Session, Workspace, Conversation, Tool, Goal,
* Plan, Settings, Skill, MCP and Plugin services through the existing client
* APIs, so the only host surface it needs is the version-control capability
* DSH does not own. That surface is the `/dcode` Connection RPC channel —
* working-tree status, per-file diffs, a commit path, per-turn undo, and
* bounded file reads.
*
* The browser half lives at `./client` and is loaded by the client module
* system through this package's `dsh.client` declaration.
* @module @dsh-portable/dcode-ui
*/
/** Stable Cordis plugin name. */
const name = "dcode-ui";
/**
* Connection is the only hard requirement: without the RPC carrier there is
* no channel to claim, and the browser half degrades to a workbench without
* Git and durable-memory tooling rather than failing to boot.
*/
const inject = ["connection"];
const Config = z.object({ git: z.boolean().default(true) });
/**
* Claim the `/dcode` channel on a host context.
* @param ctx - the injecting cordis context.
* @param config - entry configuration.
*/
function apply(ctx, config = {}) {
	if (!Config(config).git) return;
	ctx.inject(["connection"], (connectionCtx) => {
		const connection = connectionCtx.get("connection");
		if (connection === void 0) return;
		const memory = new DcodeMemoryStore({
			root: defaultDcodeMemoryRoot(),
			source: () => connectionCtx.get("sessionQuery")
		});
		connectionCtx.effect(() => {
			const disposeRpc = connection.rpc.handle(DCODE_CHANNEL, async (endpoint, payload) => {
				if (!isDcodeEndpoint(endpoint)) return {
					ok: false,
					error: {
						code: "bad-request",
						message: "unknown /dcode RPC endpoint",
						details: { endpoint }
					}
				};
				return await handleDcodeEndpoint(endpoint, payload, memory);
			}, { authority: "trusted-host" });
			const disposeEvents = connectionCtx.on("session/event", (session) => {
				memory.markPending(String(session.id));
			});
			return () => {
				disposeEvents();
				disposeRpc();
				memory.dispose();
			};
		}, "dcode-ui: git and memory rpc channel");
	});
}
//#endregion
export { Config, DCODE_CHANNEL, DCODE_ENDPOINTS, DEFAULT_UI_MODE, DcodeMemoryStore, GitCommandError, UI_MODES, UI_MODE_BRIDGE_GLOBAL, UI_MODE_CONFIG_FIELD, UI_MODE_EVENT, UI_MODE_QUERY_PARAM, UI_MODE_STORAGE_KEY, apply, asUiMode, containedRelativePath, cycleUiMode, defaultDcodeMemoryRoot, handleDcodeEndpoint, inject, isDcodeEndpoint, name, parseBranchHeader, parseNumstat, parsePorcelain, readBranches, readDiff, readStatus, resolveUiMode, uiModeFromSearch, undoPaths, withUiModeParam, workTreeRoot };
