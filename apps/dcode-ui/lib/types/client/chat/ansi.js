/**
 * ANSI escape-sequence reader for tool output.
 *
 * Agents run real programs, and real programs write colour. Without a reader
 * their output arrives as `ESC[32m` litter in the middle of the text; with
 * one it arrives as the log the operator would have seen in their own
 * terminal. This is deliberately a *reader*, not a terminal: no cursor
 * addressing, no scroll region, no alternate screen. What it does model is
 * the small part of a terminal that changes what the bytes mean — SGR styling
 * and the carriage return every progress bar is built on.
 *
 * Everything else it recognises, it discards, which is the point: an
 * unrecognised sequence left in the stream is worse than no colour at all.
 *
 * One pass, no backtracking, no per-character allocation: a run of text
 * between two escapes is sliced once and appended to the open span when its
 * style has not changed.
 * @module @dsh-portable/dcode-ui/client/chat/ansi
 */
/** Lines beyond this are not worth a DOM node; the output box scrolls anyway. */
const DEFAULT_MAX_LINES = 4000;
/** 256 KiB of visible text, well past any output a card should render. */
const DEFAULT_MAX_CHARS = 262_144;
/** The six levels of the xterm 6×6×6 colour cube. */
const CUBE_LEVELS = [0, 95, 135, 175, 215, 255];
/**
 * Whether a string carries anything this reader would change.
 *
 * The fast path exists for the common case: most tool output is plain, and
 * plain text should reach the DOM as one text node, not as a span list.
 * @param text - candidate output.
 * @returns true when parsing would do something.
 */
export function hasAnsi(text) {
    return text.includes('\u001b') || text.includes('\r');
}
/**
 * One of the sixteen palette colours, as a themeable CSS value.
 * @param index - SGR colour index 0..15.
 * @returns a `var()` reference into the workbench's terminal palette.
 */
function paletteColor(index) {
    return `var(--zx-ansi-${String(index)})`;
}
/**
 * A 24-bit colour as a hex literal.
 * @param r - red 0..255.
 * @param g - green 0..255.
 * @param b - blue 0..255.
 * @returns `#rrggbb`.
 */
function rgbColor(r, g, b) {
    const channel = (value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
    return `#${channel(r)}${channel(g)}${channel(b)}`;
}
/**
 * One of the 256 xterm colours.
 *
 * The first sixteen stay themeable palette references; the cube and the
 * greyscale ramp carry their own absolute values, exactly as a terminal
 * would render them.
 * @param index - colour index 0..255.
 * @returns a CSS colour value.
 */
export function xtermColor(index) {
    if (index < 16)
        return paletteColor(index);
    if (index < 232) {
        const offset = index - 16;
        return rgbColor(CUBE_LEVELS[Math.floor(offset / 36)] ?? 0, CUBE_LEVELS[Math.floor(offset / 6) % 6] ?? 0, CUBE_LEVELS[offset % 6] ?? 0);
    }
    const level = 8 + (index - 232) * 10;
    return rgbColor(level, level, level);
}
/**
 * Index of the next parameter that carries a value.
 *
 * The ITU form of an extended colour (`38:2::r:g:b`) leaves an empty
 * colour-space slot, so extended-colour reads skip blanks rather than
 * counting positions.
 * @param params - the SGR parameter list.
 * @param from - index to start looking at.
 * @returns the index, or the list length when there is none.
 */
function nextValue(params, from) {
    let index = from;
    while (index < params.length && params[index] === '')
        index += 1;
    return index;
}
/**
 * Apply one SGR parameter list to a style.
 * @param style - the style in force.
 * @param params - parameters between `ESC[` and `m`.
 * @returns the resulting style; the input is not mutated.
 */
export function applySgr(style, params) {
    const next = { ...style };
    for (let index = 0; index < params.length; index += 1) {
        const raw = params[index] ?? '';
        const code = raw === '' ? 0 : Number.parseInt(raw, 10);
        if (!Number.isFinite(code))
            continue;
        if (code === 0) {
            for (const key of Object.keys(next))
                delete next[key];
            continue;
        }
        if (code === 1) {
            next.bold = true;
            continue;
        }
        if (code === 2) {
            next.dim = true;
            continue;
        }
        if (code === 3) {
            next.italic = true;
            continue;
        }
        if (code === 4) {
            next.underline = true;
            continue;
        }
        if (code === 7) {
            next.inverse = true;
            continue;
        }
        if (code === 9) {
            next.strike = true;
            continue;
        }
        // 21 is "double underline" in a few terminals and "bold off" in the rest;
        // treating it as bold off matches what programs actually mean by it.
        if (code === 21 || code === 22) {
            delete next.bold;
            delete next.dim;
            continue;
        }
        if (code === 23) {
            delete next.italic;
            continue;
        }
        if (code === 24) {
            delete next.underline;
            continue;
        }
        if (code === 27) {
            delete next.inverse;
            continue;
        }
        if (code === 29) {
            delete next.strike;
            continue;
        }
        if (code >= 30 && code <= 37) {
            next.fg = paletteColor(code - 30);
            continue;
        }
        if (code === 39) {
            delete next.fg;
            continue;
        }
        if (code >= 40 && code <= 47) {
            next.bg = paletteColor(code - 40);
            continue;
        }
        if (code === 49) {
            delete next.bg;
            continue;
        }
        if (code >= 90 && code <= 97) {
            next.fg = paletteColor(code - 90 + 8);
            continue;
        }
        if (code >= 100 && code <= 107) {
            next.bg = paletteColor(code - 100 + 8);
            continue;
        }
        if (code !== 38 && code !== 48)
            continue;
        // Extended colour. An incomplete run consumes what is there and stops,
        // rather than reading the following parameters as if they were channels.
        const target = code === 38 ? 'fg' : 'bg';
        const modeAt = nextValue(params, index + 1);
        const mode = Number.parseInt(params[modeAt] ?? '', 10);
        if (mode === 5) {
            const valueAt = nextValue(params, modeAt + 1);
            const value = Number.parseInt(params[valueAt] ?? '', 10);
            if (Number.isFinite(value))
                next[target] = xtermColor(Math.max(0, Math.min(255, value)));
            index = valueAt;
            continue;
        }
        if (mode === 2) {
            const channels = [];
            let cursor = modeAt + 1;
            while (channels.length < 3) {
                cursor = nextValue(params, cursor);
                const value = Number.parseInt(params[cursor] ?? '', 10);
                if (!Number.isFinite(value))
                    break;
                channels.push(value);
                cursor += 1;
            }
            if (channels.length === 3) {
                next[target] = rgbColor(channels[0] ?? 0, channels[1] ?? 0, channels[2] ?? 0);
            }
            index = cursor - 1;
            continue;
        }
        index = modeAt;
    }
    return next;
}
/** Whether two styles would produce the same span, so runs can merge. */
function sameStyle(a, b) {
    return a.fg === b.fg && a.bg === b.bg && a.bold === b.bold && a.dim === b.dim
        && a.italic === b.italic && a.underline === b.underline && a.strike === b.strike
        && a.inverse === b.inverse;
}
/**
 * Resolve `inverse` into concrete colours.
 *
 * Swapping at emit time rather than at parse time is what lets an inverted
 * run with no explicit colours still render: it borrows the surface's own
 * foreground and background instead of swapping two undefined values.
 * @param style - the style in force.
 * @returns the style to hand the DOM.
 */
function resolveInverse(style) {
    if (style.inverse !== true)
        return style;
    const { inverse: _inverse, fg, bg, ...rest } = style;
    return { ...rest, fg: bg ?? 'var(--zx-ansi-bg)', bg: fg ?? 'var(--zx-ansi-fg)' };
}
/**
 * Read text with escape sequences into styled lines.
 *
 * A carriage return clears the line written so far, which is how progress
 * bars, spinners and download counters collapse to their final frame instead
 * of stacking one row per redraw.
 * @param text - raw tool output.
 * @param limits - reader bounds; see {@link AnsiLimits}.
 * @returns the styled lines and whether a limit stopped the read.
 */
export function parseAnsi(text, limits = {}) {
    const maxLines = limits.maxLines ?? DEFAULT_MAX_LINES;
    const maxChars = limits.maxChars ?? DEFAULT_MAX_CHARS;
    const lines = [];
    let line = [];
    let style = {};
    let consumed = 0;
    let truncated = false;
    let index = 0;
    const write = (chunk) => {
        if (chunk === '')
            return;
        const resolved = resolveInverse(style);
        const last = line[line.length - 1];
        if (last !== undefined && sameStyle(last, resolved)) {
            line[line.length - 1] = { ...resolved, text: last.text + chunk };
            return;
        }
        line.push({ ...resolved, text: chunk });
    };
    while (index < text.length) {
        if (consumed >= maxChars || lines.length >= maxLines) {
            truncated = true;
            break;
        }
        const char = text[index] ?? '';
        if (char === '\n') {
            lines.push(line);
            line = [];
            index += 1;
            continue;
        }
        if (char === '\r') {
            // Overwrite from column zero. A reader cannot know how long the
            // previous frame was, and keeping its tail is what produces the
            // "100%%%%" artefacts; dropping it matches what the operator saw.
            line = [];
            index += 1;
            continue;
        }
        if (char === '\u001b') {
            index = skipEscape(text, index, (params) => { style = applySgr(style, params); });
            continue;
        }
        if (char < ' ' && char !== '\t') {
            index += 1;
            continue;
        }
        // A run of ordinary text: everything up to the next byte that means
        // something. Sliced once rather than appended character by character.
        let end = index;
        while (end < text.length) {
            const candidate = text[end] ?? '';
            if (candidate === '\n' || candidate === '\r' || candidate === '\u001b')
                break;
            if (candidate < ' ' && candidate !== '\t')
                break;
            end += 1;
        }
        const room = maxChars - consumed;
        const chunk = text.slice(index, Math.min(end, index + room));
        if (chunk.length < end - index)
            truncated = true;
        write(chunk);
        consumed += chunk.length;
        index = end;
    }
    lines.push(line);
    // git and most CLIs end with a newline, which leaves one empty trailing row.
    if (lines.length > 1 && (lines[lines.length - 1]?.length ?? 0) === 0)
        lines.pop();
    return { lines, truncated };
}
/**
 * Consume one escape sequence.
 *
 * CSI sequences are read to their final byte so a cursor move or an erase is
 * discarded whole; OSC and the other string sequences are read to their
 * terminator, since their payload is arbitrary text that must not reach the
 * output as if it were content.
 * @param text - the whole string.
 * @param start - index of the ESC byte.
 * @param onSgr - called with the parameter list of an SGR sequence.
 * @returns the index just past the sequence.
 */
function skipEscape(text, start, onSgr) {
    const kind = text[start + 1];
    if (kind === undefined)
        return start + 1;
    if (kind === '[') {
        let cursor = start + 2;
        const paramsStart = cursor;
        while (cursor < text.length) {
            const char = text[cursor] ?? '';
            if (char >= '0' && char <= '?') {
                cursor += 1;
                continue;
            }
            break;
        }
        const paramsEnd = cursor;
        while (cursor < text.length) {
            const char = text[cursor] ?? '';
            if (char >= ' ' && char <= '/') {
                cursor += 1;
                continue;
            }
            break;
        }
        const final = text[cursor];
        if (final === undefined)
            return text.length;
        if (final === 'm') {
            // Colons are the ITU separator for a single parameter's arguments;
            // flattening them lets one reader accept both spellings.
            onSgr(text.slice(paramsStart, paramsEnd).replace(/:/g, ';').split(';'));
        }
        return cursor + 1;
    }
    // OSC and the other string sequences run until BEL or ST.
    if (kind === ']' || kind === 'P' || kind === 'X' || kind === '^' || kind === '_') {
        let cursor = start + 2;
        while (cursor < text.length) {
            const char = text[cursor] ?? '';
            if (char === '\u0007')
                return cursor + 1;
            if (char === '\u001b' && text[cursor + 1] === '\\')
                return cursor + 2;
            cursor += 1;
        }
        return text.length;
    }
    // Everything else is an escape with optional intermediate bytes and one
    // final byte — `ESC ( B` (select charset) is three, `ESC 7` (save cursor) is
    // two. Assuming two would leave the charset's final byte in the output.
    let cursor = start + 1;
    while (cursor < text.length) {
        const char = text[cursor] ?? '';
        if (char >= ' ' && char <= '/') {
            cursor += 1;
            continue;
        }
        break;
    }
    return cursor + 1;
}
/**
 * The visible text, with every escape sequence resolved away.
 *
 * Used for copy: what lands on the clipboard is what the operator can read,
 * including the collapse of redrawn progress lines.
 * @param text - raw tool output.
 * @returns plain text.
 */
export function stripAnsi(text) {
    if (!hasAnsi(text))
        return text;
    const document = parseAnsi(text, {
        maxLines: Number.POSITIVE_INFINITY,
        maxChars: Number.POSITIVE_INFINITY,
    });
    return document.lines
        .map(spans => spans.map(span => span.text).join(''))
        .join('\n');
}
//# sourceMappingURL=ansi.js.map