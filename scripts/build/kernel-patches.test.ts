import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const { patchCommandMenuSections, COMMAND_MENU_SECTIONS_SENTINEL } =
  require('../../patches/dsh-client-ui-commands-menu-sections.js') as {
    patchCommandMenuSections(source: string): string
    COMMAND_MENU_SECTIONS_SENTINEL: string
  }

/** The shape `ui-commands` emits today, indentation included. */
const UPSTREAM = `			async candidates(session, req) {
				const list = await this.directory.ensureReady(session.sessionId, req.signal);
				const rows = [];
				const seen = /* @__PURE__ */ new Set();
				for (const c of list) {
					seen.add(c.name);
					rows.push({
						name: c.name,
						description: c.description,
						...c.input !== void 0 ? { hint: c.input.hint } : {}
					});
				}
				for (const contribution of this.live.contributions.values()) {
					if (!contribution.available(session)) continue;
					if (seen.has(contribution.name)) throw new Error(\`ui-commands: contribution /\${contribution.name} collides with a host command\`);
					rows.push({
						name: contribution.name,
						description: contribution.description()
					});
				}
				return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)(rows.filter((c) => req.position === "leading" || c.hint === void 0), req.query);
			}
`

test('the transform carries the placement fields onto the candidate', () => {
  const output = patchCommandMenuSections(UPSTREAM)
  for (const field of ['section', 'restSection', 'icon', 'order']) {
    assert.ok(output.includes(`contribution.${field} !== void 0`), `expected ${field} to be carried through`)
  }
})

test('the transform keeps the guards the manifest names', () => {
  const output = patchCommandMenuSections(UPSTREAM)
  for (const guard of [
    'async candidates(session, req)',
    'for (const contribution of this.live.contributions.values())',
    'return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)(',
  ]) {
    assert.ok(output.includes(guard), `expected the guard ${guard} to survive`)
  }
})

test('applying it twice is a no-op, because the kernel build is incremental', () => {
  const once = patchCommandMenuSections(UPSTREAM)
  assert.ok(once.includes(COMMAND_MENU_SECTIONS_SENTINEL))
  assert.equal(patchCommandMenuSections(once), once)
})

test('a kernel that moved the code it rewrites fails loudly', () => {
  assert.throws(
    () => patchCommandMenuSections(UPSTREAM.replace('rows.push({\n\t\t\t\t\t\tname: contribution.name,', 'rows.push({ name: renamed.name,')),
    /re-review this transform/,
  )
})

test('the sectioned branch labels the command rows and floats the contribution', () => {
  // Run the patched body over a fake roster: a contribution declaring a
  // section must reach the top and hand its restSection to everything else.
  const output = patchCommandMenuSections(UPSTREAM)
  const body = output.slice(output.indexOf('const portableRest'), output.indexOf('return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)'))
  const rows: Array<Record<string, unknown>> = [
    { name: 'compact' },
    { name: 'export' },
    { name: 'files', section: 'Add', restSection: 'Commands', order: -100 },
  ]
  // eslint-disable-next-line no-new-func -- exercising the emitted source is the point
  new Function('rows', body)(rows)
  assert.deepEqual(rows.map(row => row.name), ['files', 'compact', 'export'])
  assert.deepEqual(rows.map(row => row.section), ['Add', 'Commands', 'Commands'])
})

test('an unsectioned roster is left exactly as upstream ordered it', () => {
  const output = patchCommandMenuSections(UPSTREAM)
  const body = output.slice(output.indexOf('const portableRest'), output.indexOf('return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)'))
  const rows: Array<Record<string, unknown>> = [{ name: 'compact' }, { name: 'export' }]
  // eslint-disable-next-line no-new-func -- exercising the emitted source is the point
  new Function('rows', body)(rows)
  assert.deepEqual(rows, [{ name: 'compact' }, { name: 'export' }])
})
