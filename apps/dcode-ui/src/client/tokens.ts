/**
 * Design-token scope for every workbench surface.
 *
 * Importing this module loads `tokens.module.css`, which declares the shared
 * scale on the unhashed `[data-dcode-scope]` selector. Spreading
 * {@link dcodeScope} onto a root element opts its whole subtree into that
 * scale, across every CSS Module in the package.
 */
import './tokens.module.css'

/** Attribute marking a subtree as workbench-scoped. */
export const dcodeScope = { 'data-dcode-scope': '' } as const
