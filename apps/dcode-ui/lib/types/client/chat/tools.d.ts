/**
 * Tool-call presentation: the one-line summary a compact card shows, and the
 * file paths a turn touched.
 *
 * The transcript renders a dense card per tool call, so the interesting part
 * of each call has to survive being reduced to one line. The shipped tool
 * vocabulary is recognized by name; anything else — a plugin tool, an MCP
 * tool, a subagent tool — degrades to its name plus the first scalar argument
 * rather than disappearing.
 * @module @dsh-portable/dcode-ui/client/chat/tools
 */
import type { ContentBlock } from '@deepseek-ai/dsh-llm/types';
import type { ConversationNode } from '@deepseek-ai/dsh-client-ui-chat/client';
/** How a tool call reads in one line. */
export interface ToolSummary {
    /** Short action word for the card head (`Ran`, `Read`, `Updated`, …). */
    readonly kind: ToolKind;
    /** The argument worth showing beside the action, already trimmed. */
    readonly detail: string;
    /** Workspace paths this call addresses, in argument order. */
    readonly files: readonly string[];
    /** Whether the call is expected to have modified the working tree. */
    readonly mutating: boolean;
}
/** The card head vocabulary. */
export type ToolKind = 'run' | 'read' | 'write' | 'edit' | 'search' | 'web' | 'agent' | 'plan' | 'skill' | 'other';
/**
 * Parse a tool call's raw arguments.
 * @param argsRaw - the JSON text recorded on the call event.
 * @returns the parsed object, or an empty object for absent or malformed JSON.
 */
export declare function parseArgs(argsRaw: string | undefined): Record<string, unknown>;
/**
 * Summarize one tool call for the compact card.
 * @param name - tool name from the call event.
 * @param argsRaw - raw JSON arguments from the call event.
 * @returns the card head material.
 */
export declare function summarizeTool(name: string, argsRaw: string | undefined): ToolSummary;
/**
 * Flatten a tool result's content blocks into displayable text.
 * @param content - result content blocks.
 * @returns the concatenated text, or an empty string for a non-textual result.
 */
export declare function resultText(content: readonly ContentBlock[]): string;
/**
 * Flatten a message's content blocks into displayable text.
 * @param content - message content blocks.
 * @returns the concatenated text of every text block.
 */
export declare function messageText(content: readonly ContentBlock[]): string;
/**
 * Collect the paths a set of conversation nodes wrote or edited.
 *
 * This is what the file-change card summarizes and what the turn-undo action
 * restores, so it counts only calls that actually settled without an error:
 * a failed write never touched the tree and must not be offered for undo.
 * @param nodes - conversation nodes to scan, usually one turn's slice.
 * @returns distinct workspace-relative or absolute paths, in first-touch order.
 */
export declare function changedPaths(nodes: readonly ConversationNode[]): readonly string[];
/**
 * Split conversation nodes into the turns they belong to.
 *
 * A turn boundary is a user message: everything after it, until the next one,
 * is the assistant's answer to it. That is the unit the file-change card and
 * the undo action address, and it holds for a transcript whose window was cut
 * mid-conversation because the first slice simply has no user head.
 * @param nodes - the ordered conversation nodes.
 * @returns node slices, oldest first.
 */
export declare function splitTurns(nodes: readonly ConversationNode[]): readonly (readonly ConversationNode[])[];
//# sourceMappingURL=tools.d.ts.map