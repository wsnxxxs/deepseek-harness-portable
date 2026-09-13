'use strict'

/**
 * Let a client command contribution declare where it sits in the `+` menu.
 *
 * The composer's `+` opens the `/` trigger menu, and its whole content comes
 * from one source: `CommandUiRuntime.candidates()`. That method emits the host
 * catalog first, then the client contributions, with no `section`, no `icon`
 * and no order on any row — even though the menu view already knows how to
 * render all three (`MenuView` draws `item.section` as a heading, `item.icon`
 * as a ReferenceIcon glyph, and drops the group title as soon as any row is
 * sectioned).
 *
 * The practical consequence is that a non-command action contributed by a
 * plugin — "add files and folders" — is stranded in the middle of the command
 * list with no way to say it is not a command. Every other add menu in this
 * product puts it first, under its own heading.
 *
 * This transform passes four optional contribution fields through to the
 * candidate: `section` (its own heading), `restSection` (the heading given to
 * everything that declared none), `icon`, and `order`. When a contribution
 * declares a section, rows sort by `order` — a stable sort, so the host
 * catalog keeps its own relative order.
 *
 * It changes no behaviour for a deployment whose contributions declare none of
 * these fields: the roster, the ordering and the absent sections are byte-for-
 * byte what upstream produced.
 */

/** Marks an already-transformed bundle; the kernel build is incremental. */
const SENTINEL = 'PORTABLE:command-menu-sections'

/** The contribution row upstream pushes, matched whitespace-tolerantly. */
const CONTRIBUTION_ROW = /rows\.push\(\{\s*name: contribution\.name,\s*description: contribution\.description\(\)\s*\}\);/

/** The candidate return, matched whitespace-tolerantly. */
const CANDIDATE_RETURN = /return \(0, _deepseek_ai_dsh_client_ui_primitives\.rankByName\)\(rows\.filter\(\(c\) => req\.position === "leading" \|\| c\.hint === void 0\), req\.query\);/

const CONTRIBUTION_ROW_PATCHED = `rows.push({
						name: contribution.name,
						description: contribution.description(),
						...contribution.section !== void 0 ? { section: contribution.section } : {},
						...contribution.restSection !== void 0 ? { restSection: contribution.restSection } : {},
						...contribution.icon !== void 0 ? { icon: contribution.icon } : {},
						...contribution.order !== void 0 ? { order: contribution.order } : {}
					});`

const CANDIDATE_RETURN_PATCHED = `/* ${SENTINEL}: a contribution that declares a section is not a command —
				   it is an action offered alongside them. Label the command rows with
				   the heading it nominated, then float it by order. The sort is stable,
				   so the host catalog keeps the order the directory gave it. */
				const portableRest = rows.find((c) => c.restSection !== void 0)?.restSection;
				if (portableRest !== void 0) {
					for (const row of rows) if (row.section === void 0) row.section = portableRest;
					rows.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
				}
				return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)(rows.filter((c) => req.position === "leading" || c.hint === void 0), req.query);`

/**
 * Apply the transform to one built `ui-commands` browser bundle.
 * @param {string} source - the bundle text.
 * @returns {string} the transformed bundle, or the input when already patched.
 */
function patchCommandMenuSections(source) {
  if (source.includes(SENTINEL)) return source
  if (!CONTRIBUTION_ROW.test(source)) {
    throw new Error('ui-commands: the contribution candidate row moved; re-review this transform')
  }
  if (!CANDIDATE_RETURN.test(source)) {
    throw new Error('ui-commands: the candidate return moved; re-review this transform')
  }
  return source
    .replace(CONTRIBUTION_ROW, CONTRIBUTION_ROW_PATCHED)
    .replace(CANDIDATE_RETURN, CANDIDATE_RETURN_PATCHED)
}

module.exports = { patchCommandMenuSections, COMMAND_MENU_SECTIONS_SENTINEL: SENTINEL }
