/**
 * Ephemeral evidence receipts for material-grounded learner state updates.
 *
 * A receipt is deliberately session-local. It proves that the current live
 * agent actually obtained a structural map or content-bearing result before
 * it records a source anchor; it is not persisted as learner evidence itself.
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
export type MaterialReceiptKind = 'structure' | 'locator' | 'content';
export interface MaterialReceiptInput {
    kind: MaterialReceiptKind;
    sourceId: string;
    sectionId?: string;
    anchor?: string;
    text?: string;
}
export interface MaterialReceipt extends Omit<MaterialReceiptInput, 'text'> {
    receiptId: string;
    turn?: number;
}
/** Start the current learner-message evidence window. */
export declare function beginMaterialTurn(agent: Agent, turn: number): void;
/** Whether this agent has a managed current-turn receipt window. */
export declare function materialTurnIsActive(agent: Agent): boolean;
/** Record a tool result and return its stable opaque receipt id. */
export declare function recordMaterialReceipt(agent: Agent, input: MaterialReceiptInput): MaterialReceipt;
/** Look up a receipt by id for host-side diagnostics. */
export declare function materialReceiptById(agent: Agent, receiptId: string): MaterialReceipt | undefined;
/** Whether a source was structurally mapped in the current evidence window. */
export declare function materialStructureMapped(agent: Agent, sourceId: string): boolean;
/** Return the content receipt for an exact anchor, if one exists. */
export declare function materialContentReceiptForAnchor(agent: Agent, anchor: string): MaterialReceipt | undefined;
/**
 * Verify that state evidence cites only content actually read in this turn.
 * Direct unit-level tool calls do not have a managed turn and remain compatible
 * with the lower-level broker tests; live agent turns use the stronger check.
 */
export declare function assertMaterialAnchorsReadable(agent: Agent, anchors: readonly string[]): void;
//# sourceMappingURL=material-receipts.d.ts.map