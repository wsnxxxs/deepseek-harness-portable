'use strict'

/** Keep the Agent Team tool plugin's eager pass inside its owning preset scope. */
function patchAgentTeamToolScope(source) {
  let output = source
  const scopeImport = 'import { scopeChainOf, scopeOf } from "@deepseek-ai/dsh-scope";'
  if (!output.includes(scopeImport)) {
    const importMarker = 'import { defineTool } from "@deepseek-ai/dsh-tools";'
    if (!output.includes(importMarker)) {
      throw new Error('tool-agent-team scope patch import marker is missing')
    }
    output = output.replace(importMarker, `${importMarker}\n${scopeImport}`)
  }

  const filter = `\tconst ownerScope = scopeOf(ctx);
\tconst ownsToolScope = (agent) => ownerScope === void 0 || scopeChainOf(scopeOf(agent.ctx)).includes(ownerScope);`
  if (!output.includes(filter)) {
    const mapMarker = '\tconst installed = /* @__PURE__ */ new Map();'
    if (!output.includes(mapMarker)) {
      throw new Error('tool-agent-team scope patch installed-map marker is missing')
    }
    output = output.replace(mapMarker, `${mapMarker}\n${filter}`)
  }

  const unscopedGuard = 'if (installed.has(agent) || ctx.agentTeams.tryMembership(agent) === void 0) return;'
  const scopedGuard = 'if (installed.has(agent) || !ownsToolScope(agent) || ctx.agentTeams.tryMembership(agent) === void 0) return;'
  if (output.includes(unscopedGuard)) output = output.replace(unscopedGuard, scopedGuard)
  if (!output.includes(scopedGuard)) {
    throw new Error('tool-agent-team scope patch membership guard no longer matches the reviewed bundle')
  }
  return output
}

module.exports = { patchAgentTeamToolScope }
