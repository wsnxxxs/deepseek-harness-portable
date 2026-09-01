/**
 * Ephemeral evidence receipts for material-grounded learner state updates.
 *
 * A receipt is deliberately session-local. It proves that the current live
 * agent actually obtained a structural map or content-bearing result before
 * it records a source anchor; it is not persisted as learner evidence itself.
 */
import { createHash } from 'node:crypto';
const ledgers = new WeakMap();
/** Start the current learner-message evidence window. */
export function beginMaterialTurn(agent, turn) {
    ledgers.set(agent, {
        session: agent.session,
        turn,
        active: true,
        receipts: new Map(),
    });
}
/** Whether this agent has a managed current-turn receipt window. */
export function materialTurnIsActive(agent) {
    const ledger = ledgers.get(agent);
    return ledger !== undefined && ledger.active && ledger.session === agent.session;
}
/** Record a tool result and return its stable opaque receipt id. */
export function recordMaterialReceipt(agent, input) {
    const existing = ledgers.get(agent);
    const ledger = existing?.session === agent.session
        ? existing
        : {
            session: agent.session,
            turn: undefined,
            active: false,
            receipts: new Map(),
        };
    if (existing === undefined || existing.session !== agent.session)
        ledgers.set(agent, ledger);
    const sourceId = input.sourceId.trim();
    const sectionId = input.sectionId?.trim();
    const anchor = input.anchor?.trim();
    const textDigest = input.text === undefined
        ? ''
        : createHash('sha256').update(input.text).digest('hex').slice(0, 16);
    const fingerprint = [input.kind, sourceId, sectionId ?? '', anchor ?? '', textDigest].join('\u001f');
    const receiptId = `material-${createHash('sha256').update(fingerprint).digest('hex').slice(0, 16)}`;
    const receipt = {
        receiptId,
        kind: input.kind,
        sourceId,
        ...(sectionId === undefined ? {} : { sectionId }),
        ...(anchor === undefined ? {} : { anchor }),
        ...(ledger.turn === undefined ? {} : { turn: ledger.turn }),
    };
    ledger.receipts.set(receiptId, receipt);
    return receipt;
}
/** Look up a receipt by id for host-side diagnostics. */
export function materialReceiptById(agent, receiptId) {
    const ledger = ledgers.get(agent);
    if (ledger === undefined || ledger.session !== agent.session)
        return undefined;
    return ledger.receipts.get(receiptId);
}
/** Whether a source was structurally mapped in the current evidence window. */
export function materialStructureMapped(agent, sourceId) {
    const ledger = ledgers.get(agent);
    if (ledger === undefined || !ledger.active || ledger.session !== agent.session)
        return true;
    return [...ledger.receipts.values()].some(receipt => receipt.kind === 'structure' && receipt.sourceId === sourceId);
}
/** Return the content receipt for an exact anchor, if one exists. */
export function materialContentReceiptForAnchor(agent, anchor) {
    const ledger = ledgers.get(agent);
    if (ledger === undefined || !ledger.active || ledger.session !== agent.session)
        return undefined;
    return [...ledger.receipts.values()].find(receipt => receipt.kind === 'content' && receipt.anchor === anchor);
}
/**
 * Verify that state evidence cites only content actually read in this turn.
 * Direct unit-level tool calls do not have a managed turn and remain compatible
 * with the lower-level broker tests; live agent turns use the stronger check.
 */
export function assertMaterialAnchorsReadable(agent, anchors) {
    if (!materialTurnIsActive(agent) || anchors.length === 0)
        return;
    const missing = anchors.filter(anchor => materialContentReceiptForAnchor(agent, anchor) === undefined);
    if (missing.length > 0) {
        throw new TypeError(`source_anchors_observed requires a material read receipt for: ${missing.join(', ')}. `
            + 'Call learning_material_read or learning_material_recall first.');
    }
}
//# sourceMappingURL=material-receipts.js.map