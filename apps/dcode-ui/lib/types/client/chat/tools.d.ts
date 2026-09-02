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
import type { ConversationNode, ToolCallBlock, ToolResultNode } from '@deepseek-ai/dsh-client-ui-chat/client';
import type { TodoItem } from '@deepseek-ai/dsh-client-ui-conversation/client';
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
export type ToolKind = 'run' | 'read' | 'write' | 'edit' | 'search' | 'web' | 'agent' | 'memory' | 'plan' | 'skill' | 'other';
/** Whether a tool row represents a delegated subagent. */
export declare function isSubagentTool(name: string): boolean;
/** A collapsed run of lightweight, successful read/search calls. */
export interface ToolActivityGroup {
    readonly kind: 'tool-activity';
    readonly blocks: readonly ToolResultNode[];
    readonly readCount: number;
    readonly searchCount: number;
    readonly memoryCount: number;
    /** Distinct workspace paths touched by the exploration run. */
    readonly fileCount: number;
    /** Sum of call durations when every result retained its call timestamp. */
    readonly durationMs: number | undefined;
}
/** One transcript row after lightweight tool activity has been grouped. */
export type TranscriptItem = ConversationNode | ToolActivityGroup;
/**
 * Parse a tool call's raw arguments.
 * @param argsRaw - the JSON text recorded on the call event.
 * @returns the parsed object, or an empty object for absent or malformed JSON.
 */
export declare function parseArgs(argsRaw: string | undefined): Record<string, unknown>;
/**
 * Read the newest whole-list todo snapshot from the transcript.
 *
 * The live `todos` projection is preferred by surfaces that have it, but this
 * replay fallback keeps the plan visible while an older connection is still
 * assembling that projection.
 */
export declare function latestTodos(nodes: readonly ConversationNode[]): readonly TodoItem[];
/**
 * Summarize one tool call for the compact card.
 * @param name - tool name from the call event.
 * @param argsRaw - raw JSON arguments from the call event.
 * @returns the card head material.
 */
export declare function summarizeTool(name: string, argsRaw: string | undefined): ToolSummary;
/** Milliseconds spent in one settled tool call, when both event times are available. */
export declare function toolDurationMs(block: ToolCallBlock): number | undefined;
/** Compact tool timing shared by individual cards and activity summaries. */
export declare function formatToolDuration(ms: number): string;
/** Displayable line changes for file-writing cards, when the tool retained enough data. */
export declare function toolChangeStats(block: ToolCallBlock): {
    additions: number;
    deletions: number;
} | undefined;
/**
 * Collapse consecutive successful read/search results into transcript groups.
 * A single action stays as an ordinary ToolCard; consecutive exploration is
 * folded by default, and errors always break a run.
 */
export declare function aggregateToolActivity(nodes: readonly ConversationNode[]): readonly TranscriptItem[];
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