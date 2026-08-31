/**
 * Tool-call presentation: the one-line summary a compact card shows, and the
 * file paths a turn touched.
 *
 * The transcript renders a dense card per tool call, so the interesting part
 * of each call has to survive being reduced to one line. The shipped tool
 * vocabulary is recognized by name; anything else — a plugin tool, an MCP
 * tool, a subagent tool — degrades to its name plus the first scalar argument
 * rather than disappearing.
 * @module @dsh-portable/dcode-ui/client/chat/tools
 */
/** Tools that change files on disk. */
const MUTATING = new Set([
    'write', 'edit', 'str_replace_editor', 'write_to_file', 'replace_file_content',
]);
/** Argument fields that name a path, in the order they are consulted. */
const PATH_FIELDS = ['file_path', 'path', 'notebook_path', 'target', 'filename'];
/**
 * Parse a tool call's raw arguments.
 * @param argsRaw - the JSON text recorded on the call event.
 * @returns the parsed object, or an empty object for absent or malformed JSON.
 */
export function parseArgs(argsRaw) {
    if (argsRaw === undefined || argsRaw.trim() === '')
        return {};
    try {
        const parsed = JSON.parse(argsRaw);
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
            ? parsed
            : {};
    }
    catch {
        // A call captured mid-stream can carry a partial JSON prefix; the card
        // still renders with its name and no detail.
        return {};
    }
}
/**
 * Read the newest whole-list todo snapshot from the transcript.
 *
 * The live `todos` projection is preferred by surfaces that have it, but this
 * replay fallback keeps the plan visible while an older connection is still
 * assembling that projection.
 */
export function latestTodos(nodes) {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        if (node?.kind !== 'tool-result')
            continue;
        for (const block of walkCalls(node)) {
            const name = 'isError' in block ? block.call?.name : block.name;
            if (name !== 'todo_write')
                continue;
            const argsRaw = 'isError' in block ? block.call?.argsRaw : block.argsRaw;
            const todos = parseArgs(argsRaw).todos;
            if (!Array.isArray(todos))
                continue;
            return todos.filter((row) => {
                if (typeof row !== 'object' || row === null)
                    return false;
                const value = row;
                return typeof value.content === 'string'
                    && (value.status === 'pending' || value.status === 'in_progress' || value.status === 'completed');
            });
        }
    }
    return [];
}
/** First string field present among the candidates. */
function firstString(args, fields) {
    for (const field of fields) {
        const value = args[field];
        if (typeof value === 'string' && value.trim() !== '')
            return value;
    }
    return undefined;
}
/** Collapse whitespace and cap a detail line so a card head stays one line. */
function oneLine(value, limit = 160) {
    const collapsed = value.replace(/\s+/g, ' ').trim();
    return collapsed.length > limit ? `${collapsed.slice(0, limit - 1)}…` : collapsed;
}
/**
 * Summarize one tool call for the compact card.
 * @param name - tool name from the call event.
 * @param argsRaw - raw JSON arguments from the call event.
 * @returns the card head material.
 */
export function summarizeTool(name, argsRaw) {
    const args = parseArgs(argsRaw);
    const path = firstString(args, PATH_FIELDS);
    const files = path === undefined ? [] : [path];
    const base = { files, mutating: MUTATING.has(name) };
    // Memory is an orchestration primitive in Metis: it is visible as a work
    // phase alongside reads, searches and agent delegation instead of falling
    // into the generic tool bucket. Keep the name check broad so packaged and
    // user-authored memory tools share the same presentation.
    if (name.toLocaleLowerCase().includes('memory')) {
        return {
            ...base,
            kind: 'memory',
            detail: oneLine(firstString(args, ['query', 'pattern', 'text', 'content']) ?? ''),
        };
    }
    switch (name) {
        case 'bash':
        case 'pwsh':
        case 'shell':
        case 'run':
        case 'exec':
        case 'exec_command':
        case 'powershell':
        case 'terminal_send':
        case 'run_command':
            return { ...base, kind: 'run', detail: oneLine(firstString(args, ['command', 'input', 'script']) ?? '') };
        case 'read':
        case 'view_file':
        case 'read_file':
        case 'read_image':
        case 'read_attachment':
            return { ...base, kind: 'read', detail: oneLine(path ?? '') };
        case 'write':
        case 'write_to_file':
            return { ...base, kind: 'write', detail: oneLine(path ?? '') };
        case 'edit':
        case 'str_replace_editor':
        case 'replace_file_content':
            return { ...base, kind: 'edit', detail: oneLine(path ?? '') };
        case 'glob':
        case 'grep':
        case 'grep_search':
        case 'list_dir':
        case 'list_directory':
        case 'session_search':
        case 'fs_search':
            return { ...base, kind: 'search', detail: oneLine(firstString(args, ['pattern', 'query', 'regex']) ?? '') };
        case 'web_search':
        case 'search_web':
        case 'search_query':
        case 'web_fetch':
        case 'fetch_url':
            return { ...base, kind: 'web', detail: oneLine(firstString(args, ['query', 'url']) ?? '') };
        case 'todo_write':
        case 'create_goal':
        case 'update_goal':
        case 'get_goal':
            return { ...base, kind: 'plan', detail: '' };
        case 'skill':
            return { ...base, kind: 'skill', detail: oneLine(firstString(args, ['name', 'skill']) ?? '') };
        case 'task':
        case 'spawn_teammate':
        case 'send_message':
        case 'report':
            return { ...base, kind: 'agent', detail: oneLine(firstString(args, ['description', 'prompt', 'message']) ?? '') };
        default: {
            // An unrecognized tool still shows something useful: its first scalar
            // argument, whatever the plugin named it.
            const fallback = Object.entries(args).find(([, value]) => typeof value === 'string' && value.trim() !== '');
            return { ...base, kind: 'other', detail: oneLine(typeof fallback?.[1] === 'string' ? fallback[1] : '') };
        }
    }
}
/** Milliseconds spent in one settled tool call, when both event times are available. */
export function toolDurationMs(block) {
    if (!('isError' in block) || block.callTime === null)
        return undefined;
    return Math.max(0, block.time - block.callTime);
}
/** Compact tool timing shared by individual cards and activity summaries. */
export function formatToolDuration(ms) {
    return `${(Math.max(0, ms) / 1000).toFixed(1)}s`;
}
/** Displayable line changes for file-writing cards, when the tool retained enough data. */
export function toolChangeStats(block) {
    if (!('isError' in block) || block.isError)
        return undefined;
    const meta = typeof block.meta === 'object' && block.meta !== null
        ? block.meta
        : {};
    const numberField = (names) => {
        for (const name of names) {
            const value = meta[name];
            if (typeof value === 'number' && Number.isFinite(value))
                return Math.max(0, Math.round(value));
        }
        return undefined;
    };
    const additions = numberField(['additions', 'insertions', 'linesAdded', 'added']);
    const deletions = numberField(['deletions', 'removals', 'linesRemoved', 'removed']);
    if (additions !== undefined || deletions !== undefined) {
        return { additions: additions ?? 0, deletions: deletions ?? 0 };
    }
    const output = resultText(block.content);
    const diffLines = output.split('\n');
    const diffAdditions = diffLines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length;
    const diffDeletions = diffLines.filter(line => line.startsWith('-') && !line.startsWith('---')).length;
    if (diffAdditions > 0 || diffDeletions > 0) {
        return { additions: diffAdditions, deletions: diffDeletions };
    }
    const name = block.call?.name ?? '';
    const args = parseArgs(block.call?.argsRaw);
    const countLines = (value) => typeof value === 'string' && value !== '' ? value.split(/\r?\n/).length : 0;
    if (name === 'replace_file_content' || name === 'edit' || name === 'str_replace_editor') {
        const before = firstString(args, ['old_str', 'old_string', 'old_content']);
        const after = firstString(args, ['new_str', 'new_string', 'new_content']);
        if (before !== undefined || after !== undefined) {
            return { additions: countLines(after), deletions: countLines(before) };
        }
    }
    if (name === 'write_to_file' || name === 'write') {
        const content = firstString(args, ['content', 'text']);
        if (content !== undefined)
            return { additions: countLines(content), deletions: 0 };
    }
    return undefined;
}
/** An error anywhere in a ToolCallBlock tree must remain visually explicit. */
function hasToolError(block) {
    if ('isError' in block && block.isError)
        return true;
    return block.subCalls.some(hasToolError);
}
/** Whether a result is safe to hide inside a lightweight activity disclosure. */
function aggregatableActivity(node) {
    if (node.kind !== 'tool-result' || hasToolError(node))
        return false;
    const summary = summarizeTool(node.call?.name ?? '', node.call?.argsRaw);
    return !summary.mutating && (summary.kind === 'read'
        || summary.kind === 'search'
        || summary.kind === 'web'
        || summary.kind === 'memory');
}
/**
 * Collapse consecutive successful read/search results into transcript groups.
 * A single action stays as an ordinary ToolCard; consecutive exploration is
 * folded by default, and errors always break a run.
 */
export function aggregateToolActivity(nodes) {
    const items = [];
    let run = [];
    const flush = () => {
        if (run.length < 2) {
            items.push(...run);
            run = [];
            return;
        }
        let readCount = 0;
        let searchCount = 0;
        let memoryCount = 0;
        const files = new Set();
        const durations = run.map(toolDurationMs);
        for (const block of run) {
            const kind = summarizeTool(block.call?.name ?? '', block.call?.argsRaw).kind;
            for (const path of summarizeTool(block.call?.name ?? '', block.call?.argsRaw).files)
                files.add(path);
            if (kind === 'read')
                readCount += 1;
            if (kind === 'search' || kind === 'web')
                searchCount += 1;
            if (kind === 'memory')
                memoryCount += 1;
        }
        items.push({
            kind: 'tool-activity',
            blocks: run,
            readCount,
            searchCount,
            memoryCount,
            fileCount: files.size === 0 ? run.length : files.size,
            durationMs: durations.every((value) => value !== undefined)
                ? durations.reduce((total, value) => total + value, 0)
                : undefined,
        });
        run = [];
    };
    for (const node of nodes) {
        if (aggregatableActivity(node)) {
            run.push(node);
            continue;
        }
        flush();
        items.push(node);
    }
    flush();
    return items;
}
/**
 * Flatten a tool result's content blocks into displayable text.
 * @param content - result content blocks.
 * @returns the concatenated text, or an empty string for a non-textual result.
 */
export function resultText(content) {
    return content
        .map((block) => {
        const typed = block;
        return typed.type === 'text' || typed.type === 'reasoning' ? typed.text ?? '' : '';
    })
        .filter(text => text !== '')
        .join('\n');
}
/**
 * Flatten a message's content blocks into displayable text.
 * @param content - message content blocks.
 * @returns the concatenated text of every text block.
 */
export function messageText(content) {
    return content
        .map((block) => {
        const typed = block;
        return typed.type === 'text' ? typed.text ?? '' : '';
    })
        .filter(text => text !== '')
        .join('\n');
}
/** Walk a tool block and its children depth-first. */
function* walkCalls(block) {
    yield block;
    for (const child of block.subCalls)
        yield* walkCalls(child);
}
/**
 * Collect the paths a set of conversation nodes wrote or edited.
 *
 * This is what the file-change card summarizes and what the turn-undo action
 * restores, so it counts only calls that actually settled without an error:
 * a failed write never touched the tree and must not be offered for undo.
 * @param nodes - conversation nodes to scan, usually one turn's slice.
 * @returns distinct workspace-relative or absolute paths, in first-touch order.
 */
export function changedPaths(nodes) {
    const paths = [];
    const seen = new Set();
    const admit = (result) => {
        if (result.isError)
            return;
        const name = result.call?.name;
        if (name === undefined || !MUTATING.has(name))
            return;
        const summary = summarizeTool(name, result.call?.argsRaw);
        const metaPath = result.meta?.path;
        const candidates = [
            ...summary.files,
            ...(typeof metaPath === 'string' && metaPath !== '' ? [metaPath] : []),
        ];
        for (const path of candidates) {
            if (seen.has(path))
                continue;
            seen.add(path);
            paths.push(path);
        }
    };
    for (const node of nodes) {
        if (node.kind !== 'tool-result')
            continue;
        for (const block of walkCalls(node)) {
            if ('isError' in block)
                admit(block);
        }
    }
    return paths;
}
/**
 * Split conversation nodes into the turns they belong to.
 *
 * A turn boundary is a user message: everything after it, until the next one,
 * is the assistant's answer to it. That is the unit the file-change card and
 * the undo action address, and it holds for a transcript whose window was cut
 * mid-conversation because the first slice simply has no user head.
 * @param nodes - the ordered conversation nodes.
 * @returns node slices, oldest first.
 */
export function splitTurns(nodes) {
    const turns = [];
    let current = [];
    for (const node of nodes) {
        if (node.kind === 'user' && current.length > 0) {
            turns.push(current);
            current = [];
        }
        current.push(node);
    }
    if (current.length > 0)
        turns.push(current);
    return turns;
}
//# sourceMappingURL=tools.js.map