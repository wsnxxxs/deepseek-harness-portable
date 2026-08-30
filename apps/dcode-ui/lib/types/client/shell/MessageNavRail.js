import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useEffect, useId, useMemo, useState } from 'react';
import { useT } from "../state/i18n.js";
import { changedPaths, messageText, splitTurns, summarizeTool } from "../chat/tools.js";
import css from './MessageNavRail.module.css';
function dotPosition(index, count) {
    return { '--message-nav-position': `${String(count <= 1 ? 0 : index / (count - 1) * 100)}%` };
}
function promptSummary(node) {
    const text = messageText(node.content).replace(/\s+/g, ' ').trim();
    return text.length > 240 ? `${text.slice(0, 240)}…` : text;
}
function promptTurns(nodes) {
    return splitTurns(nodes).flatMap((turn, turnIndex) => {
        const prompt = turn.find((node) => node.kind === 'user');
        const hasError = turn.some(node => node.kind === 'turn-error' || (node.kind === 'tool-result' && node.isError));
        const hasPlan = turn.some(node => node.kind === 'tool-result'
            && summarizeTool(node.call?.name ?? '', node.call?.argsRaw).kind === 'plan');
        const marker = hasError ? 'error' : changedPaths(turn).length > 0 ? 'change' : hasPlan ? 'plan' : 'message';
        return prompt === undefined
            ? []
            : [{
                    turnIndex,
                    seq: prompt.seq,
                    time: prompt.time,
                    summary: promptSummary(prompt),
                    marker,
                    bookmarkId: `${String(prompt.time)}:${String(prompt.seq)}`,
                }];
    });
}
const BOOKMARK_STORAGE = 'dcode.turn-bookmarks';
function savedBookmarks() {
    try {
        const parsed = JSON.parse(globalThis.localStorage?.getItem(BOOKMARK_STORAGE) ?? '[]');
        return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []);
    }
    catch {
        return new Set();
    }
}
function markerGlyph(marker) {
    switch (marker) {
        case 'change': return '±';
        case 'plan': return '✓';
        case 'error': return '!';
        default: return '';
    }
}
function markerDetails(marker, t) {
    switch (marker) {
        case 'change':
            return { label: t('chat.turnNavigation.marker.change') || 'Changes', icon: '±' };
        case 'plan':
            return { label: t('chat.turnNavigation.marker.plan') || 'Plan', icon: '✓' };
        case 'error':
            return { label: t('chat.turnNavigation.marker.error') || 'Error', icon: '!' };
        default:
            return { label: t('chat.turnNavigation.marker.message') || 'Prompt', icon: '💬' };
    }
}
function MessageNavRailView({ nodes, scrollerRef, onNavigate }) {
    const t = useT();
    const tooltipId = useId();
    const turns = useMemo(() => promptTurns(nodes), [nodes]);
    const [activeTurn, setActiveTurn] = useState(turns[0]?.turnIndex ?? 0);
    const [previewTurn, setPreviewTurn] = useState(undefined);
    const [bookmarks, setBookmarks] = useState(savedBookmarks);
    const toggleBookmark = (id) => {
        setBookmarks(current => {
            const next = new Set(current);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            try {
                globalThis.localStorage?.setItem(BOOKMARK_STORAGE, JSON.stringify([...next]));
            }
            catch { /* private mode */ }
            return next;
        });
    };
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller === null || turns.length < 2)
            return undefined;
        const visible = new Map();
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                const index = Number(entry.target.dataset.turnIndex);
                if (entry.isIntersecting)
                    visible.set(index, entry);
                else
                    visible.delete(index);
            }
            const candidates = [...visible.entries()].sort((left, right) => left[0] - right[0]);
            if (candidates.length === 0)
                return;
            const marker = (candidates[0]?.[1].rootBounds?.top ?? scroller.getBoundingClientRect().top) + 72;
            const containing = candidates.find(([, entry]) => entry.boundingClientRect.top <= marker && entry.boundingClientRect.bottom > marker);
            const next = containing ?? candidates.find(([, entry]) => entry.boundingClientRect.top > marker) ?? candidates.at(-1);
            if (next !== undefined)
                setActiveTurn(next[0]);
        }, { root: scroller, threshold: 0 });
        for (const turn of turns) {
            const anchor = scroller.querySelector(`[data-turn-index="${String(turn.turnIndex)}"]`);
            if (anchor !== null)
                observer.observe(anchor);
        }
        return () => { observer.disconnect(); };
    }, [scrollerRef, turns]);
    if (turns.length < 2)
        return null;
    const previewIndex = turns.findIndex(turn => turn.turnIndex === previewTurn);
    const preview = previewIndex < 0 ? undefined : turns[previewIndex];
    const previewMarker = preview !== undefined ? markerDetails(preview.marker, t) : undefined;
    return (_jsx("div", { className: css.slot, children: _jsxs("nav", { className: css.rail, "aria-label": t('chat.turnNavigation.label'), children: [_jsx("div", { className: css.line, "aria-hidden": true }), turns.map((turn, index) => {
                    const active = turn.turnIndex === activeTurn;
                    const previewing = turn.turnIndex === previewTurn;
                    const bookmarked = bookmarks.has(turn.bookmarkId);
                    return (_jsxs("div", { className: css.dotPosition, style: dotPosition(index, turns.length), children: [_jsx("button", { type: "button", className: `${css.dot} ${css[`dot_${turn.marker}`]} ${active ? css.dotActive : ''} ${bookmarked ? css.dotBookmarked : ''}`, "aria-label": t('chat.turnNavigation.turn', { count: index + 1 }), "aria-current": active ? 'true' : undefined, "aria-describedby": previewing ? tooltipId : undefined, onPointerEnter: () => { setPreviewTurn(turn.turnIndex); }, onPointerLeave: () => { setPreviewTurn(undefined); }, onFocus: () => { setPreviewTurn(turn.turnIndex); }, onBlur: () => { setPreviewTurn(undefined); }, onClick: () => {
                                    setActiveTurn(turn.turnIndex);
                                    onNavigate(turn.turnIndex);
                                }, children: _jsx("span", { "aria-hidden": true, children: markerGlyph(turn.marker) }) }), _jsx("button", { type: "button", className: `${css.bookmark} ${bookmarked ? css.bookmarkActive : ''}`, "aria-label": `${bookmarked ? 'Remove bookmark from' : 'Bookmark'} turn ${String(index + 1)}`, "aria-pressed": bookmarked, title: bookmarked ? 'Remove bookmark' : 'Bookmark turn', onClick: () => { toggleBookmark(turn.bookmarkId); }, children: "\u2605" })] }, turn.seq));
                }), preview !== undefined && previewMarker !== undefined && (_jsxs("div", { id: tooltipId, role: "tooltip", className: css.tooltip, style: dotPosition(previewIndex, turns.length), children: [_jsxs("div", { className: css.tooltipHeader, children: [_jsxs("div", { className: css.tooltipBadgeGroup, children: [_jsx("span", { className: css.tooltipTurnBadge, children: t('chat.turnNavigation.turnBadge', { count: previewIndex + 1 }) || `Turn ${previewIndex + 1}` }), _jsxs("span", { className: `${css.tooltipMarkerBadge} ${css[`marker_${preview.marker}`]}`, children: [_jsx("span", { className: css.markerIcon, "aria-hidden": true, children: previewMarker.icon }), _jsx("span", { children: previewMarker.label })] })] }), _jsx("time", { className: css.tooltipTime, dateTime: new Date(preview.time).toISOString(), children: new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(preview.time) })] }), _jsx("div", { className: css.tooltipPrompt, children: preview.summary || '…' }), _jsxs("div", { className: css.tooltipFooter, children: [_jsx("span", { className: css.tooltipHint, children: t('chat.turnNavigation.hint') || 'Click to jump' }), bookmarks.has(preview.bookmarkId) && (_jsxs("span", { className: css.tooltipBookmarkedBadge, children: ["\u2605 ", t('chat.turnNavigation.bookmarked') || 'Bookmarked'] }))] })] }))] }) }));
}
export const MessageNavRail = memo(MessageNavRailView);
//# sourceMappingURL=MessageNavRail.js.map