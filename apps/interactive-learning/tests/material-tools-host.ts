/**
 * Test host for the material tools, shaped exactly like `src/agent.ts`: a module
 * plugin declaring `inject`, so `ctx.tools` resolves the same way it does in the
 * real preset. The injected context is published back for the spec to drive.
 */
import type { Context } from '@deepseek-ai/cordis'
import { registerMaterialTools } from '../src/material-tools.ts'

export const name = 'material-tools-test-host'
export const inject = ['tools']

/** The context this plugin mounted on; read by the spec after `ctx.plugin()`. */
export let mounted: Context | undefined

export function apply(ctx: Context): void {
  mounted = ctx
  registerMaterialTools(ctx as Parameters<typeof registerMaterialTools>[0])
}
