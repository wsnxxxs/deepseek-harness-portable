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
import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
/** The tool registry and agent lookup these tools need from their context. */
export interface DossierToolContext {
    tools: {
        register(tool: ToolDefinition): () => void;
    };
}
/**
 * Register `dossier_map`, `dossier_read` and `dossier_search` on a context.
 * @param ctx - the agent-scoped context carrying the tool registry.
 * @returns a disposer removing all three.
 */
export declare function registerDossierTools(ctx: DossierToolContext): () => void;
//# sourceMappingURL=tools.d.ts.map