/**
 * Host half of `@dsh-portable/composer-attach`.
 *
 * The capability is entirely a browser one: it opens the harness's own `@`
 * reference menu from a composer button instead of requiring the operator to
 * know the `@` syntax. There is no host surface to claim — no RPC, no tool, no
 * settings namespace — so this half registers nothing.
 *
 * It exists because the Loader mounts packages, not browser bundles: the row
 * in the composed `web` profile is what makes the client half load at all, and
 * what lets an operator disable the feature from the plugin inventory like any
 * other. See `@dsh-portable/session-manager` for the same shape.
 * @module @dsh-portable/composer-attach
 */
/** Stable Cordis plugin name. */
export const name = 'composer-attach';
/**
 * Plugin body. Deliberately empty; the browser half is loaded through this
 * package's `dsh.client` declaration.
 * @param _ctx - host context, unused.
 */
export function apply(_ctx) { }
//# sourceMappingURL=index.js.map