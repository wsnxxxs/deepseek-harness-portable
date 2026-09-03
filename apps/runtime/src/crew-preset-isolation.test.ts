import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import Include from '@deepseek-ai/cordis-plugin-include'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import AgentRegistry, { type Agent } from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import AgentPresets from '@deepseek-ai/dsh-agent-presets'
import TeamService from '@deepseek-ai/dsh-experimental-agent-team'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SubagentService from '@deepseek-ai/dsh-subagent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'

const require = createRequire(import.meta.url)
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const { patchAgentTeamToolScope } = require('../../../patches/dsh-experimental-tool-agent-team-scope.js') as {
  patchAgentTeamToolScope(source: string): string
}

// Every model-facing tool `tool-agent-team` registers. Upstream retired
// `followup_task`; the list tracks that package's registrations exactly,
// because the point of the test is that NONE of them reach a non-Crew agent.
const TEAM_TOOLS = [
  'interrupt_agent',
  'list_agents',
  'send_message',
  'spawn_teammate',
  'team_task_create',
  'team_task_get',
  'team_task_list',
  'team_task_update',
  'wait_agent',
].sort()

function teamTools(ctx: Context, agent: Agent): string[] {
  return ctx.tools.schemas(agent)
    .map(schema => schema.name)
    .filter(name => TEAM_TOOLS.includes(name))
    .sort()
}

test('mounting Crew after Standard keeps Team tools scoped to Crew', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-crew-preset-isolation-'))
  const appRoot = join(root, 'app')
  const presets = join(root, 'presets')
  const storage = join(root, 'sessions')
  await Promise.all([
    mkdir(join(presets, 'standard'), { recursive: true }),
    mkdir(join(presets, 'crew'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(join(presets, 'standard', 'agent.cordis.yml'), '[]\n'),
    writeFile(join(presets, 'crew', 'agent.cordis.yml'), [
      '- id: tool-agent-team',
      "  name: '@deepseek-ai/dsh-experimental-tool-agent-team'",
      '',
    ].join('\n')),
  ])

  const runtimeNodeModules = resolve(REPO_ROOT, 'apps/runtime/node_modules')
  const sourcePackage = join(runtimeNodeModules, '@deepseek-ai', 'dsh-experimental-tool-agent-team')
  const stagedPackage = join(appRoot, 'node_modules', '@deepseek-ai', 'dsh-experimental-tool-agent-team')
  await mkdir(join(stagedPackage, 'lib'), { recursive: true })
  await Promise.all([
    copyFile(join(sourcePackage, 'package.json'), join(stagedPackage, 'package.json')),
    writeFile(
      join(stagedPackage, 'lib', 'index.js'),
      patchAgentTeamToolScope(await readFile(join(sourcePackage, 'lib', 'index.js'), 'utf8')),
    ),
  ])
  for (const packageName of [
    '@deepseek-ai/schemastery',
    '@deepseek-ai/dsh-experimental-agent-team',
    '@deepseek-ai/dsh-scope',
    '@deepseek-ai/dsh-system-prompt',
    '@deepseek-ai/dsh-tools',
  ]) {
    const target = join(appRoot, 'node_modules', ...packageName.split('/'))
    await mkdir(dirname(target), { recursive: true })
    await symlink(
      resolve(runtimeNodeModules, ...packageName.split('/')),
      target,
      process.platform === 'win32' ? 'junction' : 'dir',
    )
  }

  const ctx = new Context()
  ctx.baseUrl = `${pathToFileURL(appRoot).href}/`
  let standard: Awaited<ReturnType<Context['agents']['create']>> | undefined
  let crew: Awaited<ReturnType<Context['agents']['create']>> | undefined
  try {
    await ctx.plugin(Loader)
    ctx.loader.builtins.include = Include
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(JsonlSessionPersistence, { root: storage, compression: 'none' })
    await ctx.plugin(AgentLoop, { agents: [] })
    await ctx.plugin(SubagentService)
    await ctx.plugin(TeamService)
    await ctx.plugin(AgentPresets, {
      default: 'standard',
      roots: [{ path: presets, trust: 'system' }],
      includeShippedRoot: false,
      includeUserRoot: false,
    })

    standard = await ctx.agents.create({
      sessionId: SessionId('crew-isolation-standard'),
      setup: async agentCtx => void await ctx.agentPresets.mount(agentCtx, 'standard'),
    })
    assert.deepEqual(teamTools(ctx, standard.agent), [])

    crew = await ctx.agents.create({
      sessionId: SessionId('crew-isolation-crew'),
      setup: async agentCtx => void await ctx.agentPresets.mount(agentCtx, 'crew'),
    })
    assert.deepEqual(teamTools(ctx, crew.agent), TEAM_TOOLS)
    assert.deepEqual(teamTools(ctx, standard.agent), [])
  } finally {
    await crew?.dispose()
    await standard?.dispose()
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
  }
})
