/**
 * The model-facing material tools: `learning_material_map`,
 * `learning_material_read`, `learning_material_search`, and
 * `learning_material_recall`.
 *
 * All four are READ-ONLY and confined to the session's own vault. The preset
 * deliberately does not mount `dsh-tool-fs`, which would also grant `write` and
 * `edit`; the model's whole filesystem reach is these four calls, and every
 * path they accept is contained through {@link containedPath} before any read.
 *
 * Reads address SECTIONS, not line offsets. The extracted markdown is written by
 * this package's own emitter, so a section id is both stable and verifiable —
 * which is what turns a cited anchor from a claim into something the eval can
 * check against `.learning/structure/`.
 * @module @dsh-portable/interactive-learning/src/material-tools
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type ToolRuntime } from '@deepseek-ai/dsh-tools';
import type { SourceSection, SourceStructure } from './ingest/types.ts';
import type { LearnerState } from './learner-state.ts';
/** The material tools, in catalog order. */
export declare const MATERIAL_TOOL_NAMES: readonly ["learning_material_map", "learning_material_read", "learning_material_search", "learning_material_recall"];
/** Characters one read returns before it degrades to an outline. */
export declare const MAX_READ_CHARS = 6000;
/** Matches one search returns inline. */
export declare const MAX_SEARCH_MATCHES = 24;
/** Sections one map call lists before it collapses to top levels only. */
export declare const MAX_MAP_SECTIONS = 60;
/** Told to the model when the session is not running inside a learning vault. */
declare const NO_VAULT: Readonly<{
    status: "no-vault";
    detail: string;
}>;
type NoVault = typeof NO_VAULT;
/** Human-readable anchor for one section, the form that reaches `sourceAnchors`. */
export declare function sectionAnchor(structure: SourceStructure, section: SourceSection): string;
/**
 * What the material tools need from their context. `learningActivities` is the
 * broker holding the folded learner state that drives recall.
 */
export type MaterialToolContext = Context & {
    tools: ToolRuntime;
    learningActivities: {
        learnerState(agent: Agent): LearnerState;
    };
};
declare const sectionRow: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly properties: {
        readonly id: {
            readonly type: "string";
            readonly required: true;
        };
        readonly label: {
            readonly type: "string";
            readonly required: true;
        };
        readonly level: {
            readonly type: "integer";
            readonly required: true;
        };
        readonly page: {
            readonly type: "integer";
        };
        readonly anchor: {
            readonly type: "string";
            readonly required: true;
        };
        readonly chars: {
            readonly type: "integer";
            readonly required: true;
        };
    };
};
/**
 * Register the material tools on a learning agent context.
 *
 * The tools are registered unconditionally so the tool catalog stays identical
 * across sessions — a catalog that changed with whether a vault happens to exist
 * would invalidate the request cache on every switch. A session with no vault
 * gets a structured `no-vault` answer instead of a missing tool.
 * @param ctx - The learning agent context, carrying `ctx.tools`.
 */
export declare function registerMaterialTools(ctx: MaterialToolContext): void;
export type { NoVault };
export { sectionRow as MATERIAL_SECTION_SCHEMA };
//# sourceMappingURL=material-tools.d.ts.map