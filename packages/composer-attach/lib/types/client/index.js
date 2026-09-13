/**
 * Browser entry for composer file and folder attachment.
 *
 * The harness can already reference workspace files and folders: `ui-reference`
 * registers an `@` source with directory drill-down, and the trigger pipeline
 * turns a pick into a chip the submit path serializes for the model. All of it
 * is reachable only by typing `@` — the `+` at the head of the composer tool
 * row is upstream's *command* launcher and seeds the `/` source alone, so the
 * official UI has no click path to file attachment at all.
 *
 * This plugin adds two, and no file machinery of its own:
 *
 * - a "files and folders" entry in the `+` menu, through `commandUi.register`
 *   — upstream's own API for client-owned rows in exactly that menu. Its
 *   picker is the shared popupSelect shell over the workspace listing;
 * - a button beside the mode chips that opens the `@` menu itself, which is
 *   the one path carrying directory drill-down and `@session` references.
 *
 * Both insert the same reference the `@` menu inserts — same mention grammar,
 * same `source: 'reference'`, so serialization stays `ui-reference`'s.
 * @module @dsh-portable/composer-attach/client
 */
import { formatFileMention } from '@deepseek-ai/dsh-file-reference/grammar';
import { ComposerAttachButton } from "./AttachButton.js";
import { filesCommand } from "./files-command.js";
import { SpanRegistry } from "./spans.js";
import { COMPOSER_ATTACH_NS, en, zh } from "./locales.js";
export { ComposerAttachButton } from "./AttachButton.js";
export { detectLength, documentEndSpan } from "./caret.js";
export { FILES_COMMAND, filesCommand, } from "./files-command.js";
export { SpanRegistry } from "./spans.js";
export { COMPOSER_ATTACH_NS, en, zh, } from "./locales.js";
/** Stable Cordis plugin name. */
export const name = 'composer-attach-client';
/**
 * Services this plugin cannot register without.
 *
 * `inputTriggers` is the pipeline the button drives, `sessions` resolves the
 * per-session scope its controller and its scoped input events live on,
 * `commandUi` owns the `+` menu's contribution registry, and
 * `remote.fileReferences` is the workspace listing the picker shows. Cordis
 * holds the plugin body until all of them publish.
 *
 * The `@` **source** is not a service and cannot be injected — an assembly
 * that disabled `ui-reference` still mounts these entries, and `toggleSource`
 * dismisses instead of opening a menu with no source behind it.
 */
export const inject = [
    'slots', 'locale', 'sessions', 'inputTriggers', 'commandUi', 'remote', 'remote.fileReferences',
];
/**
 * Name `ui-reference` registers its combined `@file` / `@session` source under.
 *
 * The pipeline addresses sources by name, so this string is the whole coupling
 * to upstream. A rename upstream turns the button into a no-op rather than an
 * error, which is why it is named here instead of being inlined at the call.
 */
const REFERENCE_SOURCE = 'reference';
/**
 * Position within `conversation.input.left`.
 *
 * The slot itself renders at the end of the composer tool row, after the `+`
 * and the access/plan chips, so this button sits beside the controls it
 * belongs with without the plugin reaching into upstream's layout.
 */
const INPUT_LEFT_ORDER = 0;
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(COMPOSER_ATTACH_NS, { zh, en }), 'composer-attach: dictionaries');
    const t = ctx.locale.bind(COMPOSER_ATTACH_NS);
    const spans = new SpanRegistry();
    /** Apply one reference through the session's own scoped input event. */
    const insert = (session, reference) => {
        const span = spans.read(session.sessionId);
        const actx = ctx.sessions.scope(session.sessionId);
        if (span === undefined || actx === undefined)
            return false;
        return actx.bail(actx, 'slash/input-insert-reference', {
            // `source` routes submit-time serialization; these references are
            // `ui-reference`'s, so its codec is the one that must serialize them.
            reference: {
                source: REFERENCE_SOURCE,
                ref: reference.ref,
                label: reference.label,
                appearance: reference.appearance,
                clipboardText: reference.ref,
            },
            span,
        }) === true;
    };
    ctx.effect(() => ctx.get('commandUi').register(filesCommand({
        list: async (session, query, signal) => {
            const answer = await ctx.remote.fileReferences.list(session.sessionId, query, signal);
            return answer.ok ? answer.value : [];
        },
        mention: candidate => formatFileMention(candidate, false),
        insert,
        t,
    })), 'composer-attach: /files contribution');
    // `conversation.input.left` is session-scoped, so the slot frame hands the
    // session id to the inject factory. The controller is resolved per click
    // rather than captured: a session scope can be pruned while its composer is
    // still mounted, and a stale controller would drive a dead editor.
    const attachOperations = (sessionId) => ({
        openReferences: (span, position) => {
            const scope = ctx.sessions.scope(sessionId);
            if (scope === undefined)
                return;
            ctx.inputTriggers.sessionOf(scope).toggleSource(REFERENCE_SOURCE, {
                trigger: '@',
                query: '',
                quoted: false,
                position,
                span,
            });
        },
        reportSpan: (span) => {
            spans.publish(sessionId, span);
            return () => { spans.withdraw(sessionId); };
        },
    });
    // `slots.inject` rather than a bare register: the tool row belongs to
    // `ui-conversation`, which may activate after this plugin, and a renderer
    // epoch change must re-run the contribution instead of dropping it.
    ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
        name: 'conversation.input.left',
        id: 'portable-attach',
        order: INPUT_LEFT_ORDER,
        locale: COMPOSER_ATTACH_NS,
        inject: attachOperations,
    }, ComposerAttachButton));
}
//# sourceMappingURL=index.js.map