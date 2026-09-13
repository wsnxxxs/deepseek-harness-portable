/**
 * Where the next reference goes, per session.
 *
 * Two entry points insert references — the composer button and the `files`
 * entry in the `+` menu — and only one of them is a React component. The
 * component is the only place the live input snapshot is readable at all
 * (`useInput` is a slot standard prop; the composer's own keyboard face is
 * package-internal to `ui-conversation` and never crosses a plugin boundary),
 * so it publishes the insertion point here and the command contribution reads
 * it back when its popup settles.
 *
 * The value stays fresh because the composer entry re-publishes on every input
 * revision, and the popup's own search box never touches the draft — so the
 * revision a popup settles against is the one that was current when it opened.
 * @module @dsh-portable/composer-attach/client/spans
 */
/** Per-session insertion points, keyed by the session whose composer published them. */
export class SpanRegistry {
    points = new Map();
    /**
     * Publish this session's current insertion point.
     * @param id - the session.
     * @param span - the collapsed detect-coordinate span to insert at.
     */
    publish(id, span) {
        this.points.set(id, span);
    }
    /**
     * Forget a session's insertion point when its composer unmounts.
     * @param id - the session.
     */
    withdraw(id) {
        this.points.delete(id);
    }
    /**
     * The insertion point last published for a session.
     * @param id - the session.
     * @returns the span, or undefined when no composer has published one.
     */
    read(id) {
        return this.points.get(id);
    }
}
//# sourceMappingURL=spans.js.map