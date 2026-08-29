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
const MUTATING = new Set(['write', 'edit', 'str_replace_editor']);
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
    switch (name) {
        case 'bash':
        case 'pwsh':
        case 'terminal_send':
            return { ...base, kind: 'run', detail: oneLine(firstString(args, ['command', 'input', 'script']) ?? '') };
        case 'read':
        case 'read_image':
        case 'read_attachment':
            return { ...base, kind: 'read', detail: oneLine(path ?? '') };
        case 'write':
            return { ...base, kind: 'write', detail: oneLine(path ?? '') };
        case 'edit':
        case 'str_replace_editor':
            return { ...base, kind: 'edit', detail: oneLine(path ?? '') };
        case 'glob':
        case 'grep':
        case 'session_search':
        case 'fs_search':
            return { ...base, kind: 'search', detail: oneLine(firstString(args, ['pattern', 'query', 'regex']) ?? '') };
        case 'web_search':
        case 'web_fetch':
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