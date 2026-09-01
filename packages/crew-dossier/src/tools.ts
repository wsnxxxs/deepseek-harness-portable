/**
 * The model's three read-only entry points into a mission dossier.
 *
 * Read-only is the whole design, not a limitation. The learning pack
 * established that a space is trustworthy because the Host writes every file on
 * a path the Host built; a model-facing tool that could put a document into a
 * dossier would end that guarantee, so attaching stays an operator action on
 * the `/crew-dossier` channel.
 *
 * The tool descriptions carry one instruction the surface cannot enforce:
 * **state what could not be read.** Every result carries the parser's own
 * degradation, and an answer that silently drops it is the failure this whole
 * subsystem exists to prevent.
 * @module @dsh-portable/crew-dossier/tools
 */

import type { Agent } from '@deepseek-ai/dsh-agent'
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { TopicVault } from '@dsh-portable/space-kernel'
import { dossierMap, dossierRead, dossierSearch, openDossier } from './dossier.ts'

/** The tool registry and agent lookup these tools need from their context. */
export interface DossierToolContext {
  tools: { register(tool: ToolDefinition): () => void }
}

/** Refuse extra properties, matching every other tool in this distribution. */
function closed<T extends ToolDefinition>(tool: T): T {
  return { ...tool, parameters: { ...tool.parameters, additionalProperties: false } } as T
}

/**
 * Result shapes, declared so the tool runtime can type and render them.
 *
 * Every arm carries `ok`, and the not-ok arm carries a `reason` the model can
 * repeat verbatim: an empty dossier is an ordinary state, not an error to
 * paper over.
 */
const passageShape = {
  type: 'object', additionalProperties: false, properties: {
    sourceId: { type: 'string' },
    title: { type: 'string' },
    anchor: { type: 'string', description: 'Cite this when the answer depends on the passage.' },
    heading: { type: 'string' },
    page: { type: 'number' },
    text: { type: 'string' },
    truncated: { type: 'boolean', description: 'More of the section exists than is shown here.' },
  },
} as const

const sourceShape = {
  type: 'object', additionalProperties: false, properties: {
    sourceId: { type: 'string' },
    title: { type: 'string' },
    sections: { type: 'number' },
    unread: {
      type: 'array',
      items: { type: 'string' },
      description: 'What the parser could not read. State these when answering from this source.',
    },
    outline: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, properties: {
          sectionId: { type: 'string' },
          heading: { type: 'string' },
          page: { type: 'number' },
        },
      },
    },
  },
} as const

const okFlag = { type: 'boolean' } as const
const reasonText = { type: 'string' } as const

const mapOutput = {
  type: 'object', additionalProperties: false,
  properties: { ok: okFlag, reason: reasonText, sources: { type: 'array', items: sourceShape } },
} as const

const readOutput = {
  type: 'object', additionalProperties: false,
  properties: { ok: okFlag, reason: reasonText, passage: passageShape },
} as const

const searchOutput = {
  type: 'object', additionalProperties: false,
  properties: { ok: okFlag, reason: reasonText, passages: { type: 'array', items: passageShape } },
} as const

/** Tool results reach the model as JSON; the surface renders them properly. */
const renderJson = (_args: unknown, value: unknown) => [{ type: 'text' as const, text: JSON.stringify(value) }]

/** The answer every tool gives when the mission has attached nothing. */
const NO_DOSSIER = {
  ok: false,
  reason: 'this mission has no dossier yet; the operator attaches sources from the Dossier panel',
}

/** Resolve the dossier of the workspace the calling agent is working in. */
async function vaultOf(agent: Agent | undefined): Promise<TopicVault | undefined> {
  return await openDossier(agent?.session.header.cwd)
}

/**
 * Register `dossier_map`, `dossier_read` and `dossier_search` on a context.
 * @param ctx - the agent-scoped context carrying the tool registry.
 * @returns a disposer removing all three.
 */
export function registerDossierTools(ctx: DossierToolContext): () => void {
  const disposers: Array<() => void> = []

  disposers.push(ctx.tools.register(closed(defineTool({
    name: 'dossier_map',
    description: [
      'List the documents the operator attached to this mission, with their real section outline parsed from the files themselves — never a summary you wrote.',
      'Start here when the mission refers to a spec, a design note, an API document or a log the operator supplied.',
      'Each source reports what could NOT be read. Repeat that boundary when you answer from the source; never imply a document was understood in full when it was not.',
      'Never cite a section that is not in this result.',
    ].join(' '),
    parameters: {
      sourceId: { type: 'string', description: 'Optional; omit to list every attached source.' },
    },
    output: {
      schema: mapOutput,
      render: renderJson,
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const vault = await vaultOf(exec.agent)
      if (vault === undefined) return NO_DOSSIER
      const sources = await dossierMap(vault, args.sourceId)
      return { ok: true, sources }
    },
  }))))

  disposers.push(ctx.tools.register(closed(defineTool({
    name: 'dossier_read',
    description: [
      'Read one section of an attached document, addressed by the sourceId and sectionId that dossier_map returned.',
      'This is the only way to see a document\'s actual words. Do not assert what a specification says without reading it.',
      'The result carries an anchor. Quote that anchor when the answer depends on this passage, so a reader can open the exact place it came from.',
      'A long section returns its opening and says so; read a child section rather than assuming the rest agrees.',
    ].join(' '),
    parameters: {
      sourceId: { type: 'string', description: 'Source to read, from dossier_map.' },
      sectionId: { type: 'string', description: 'Section within that source, from dossier_map.' },
    },
    output: {
      schema: readOutput,
      render: renderJson,
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const { sourceId, sectionId } = args
      if (sourceId === undefined || sectionId === undefined) {
        return { ok: false, reason: 'dossier_read needs both sourceId and sectionId, from dossier_map' }
      }
      const vault = await vaultOf(exec.agent)
      if (vault === undefined) return NO_DOSSIER
      const passage = await dossierRead(vault, sourceId, sectionId)
      if (passage === undefined) {
        return {
          ok: false,
          reason: `no section ${JSON.stringify(sectionId)} in ${JSON.stringify(sourceId)}; call dossier_map for the outline`,
        }
      }
      return { ok: true, passage }
    },
  }))))

  disposers.push(ctx.tools.register(closed(defineTool({
    name: 'dossier_search',
    description: [
      'Search every attached document for a phrase and get back the passages that match, each with the anchor to cite.',
      'Use this when you know what you are looking for but not which document holds it. Use dossier_map instead when you need the shape of a source.',
      'Results are ranked passages, not the whole document: read the section with dossier_read before making a claim that turns on its exact wording.',
      'An empty result means the phrase is not in the attached sources. Say so rather than answering from memory.',
    ].join(' '),
    parameters: {
      query: { type: 'string', description: 'Free text to search for.' },
      limit: { type: 'number', description: 'Maximum passages to return.' },
    },
    output: {
      schema: searchOutput,
      render: renderJson,
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      if (args.query === undefined) return { ok: false, reason: 'dossier_search needs a query' }
      const vault = await vaultOf(exec.agent)
      if (vault === undefined) return NO_DOSSIER
      const passages = await dossierSearch(vault, args.query, args.limit)
      return { ok: true, passages }
    },
  }))))

  return () => {
    for (const dispose of disposers.splice(0)) dispose()
  }
}
