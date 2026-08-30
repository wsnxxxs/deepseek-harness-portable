/**
 * The Host's own two-language table.
 *
 * The client ships 385 paired zh/en keys, but Host-side tools write directly
 * into learner-facing surfaces — the concept-card save dialog and the review
 * deck — and those strings were Chinese literals, so an English learner got a
 * Chinese modal and Chinese review cards. This module is the Host equivalent of
 * `client/locales.ts`, kept deliberately small: only strings a learner reads.
 *
 * Recall text lives here for a second reason. It was written out twice — once
 * where the deck is built and once where the deck is validated against the
 * vault — and the validator rejects any deck whose text does not match
 * character for character. Two copies of one template is a silent failure
 * waiting to happen, so both callers now go through `recallCardText`.
 * @module @dsh-portable/interactive-learning/src/learner-locale
 */
/** The two languages the learning surfaces are written in. */
export type LearnerLocale = 'zh' | 'en';
/** The language a piece of learner-visible text is written in. */
export declare function scriptLocaleOf(text: string): LearnerLocale;
/** The concept-card save dialog, shown only when the model proposes a card. */
export declare const CONCEPT_SAVE_DIALOG: {
    readonly zh: {
        readonly header: "概念卡";
        readonly question: "要把这次已经完成的独立迁移保存为概念卡吗？";
        readonly save: "保存概念卡";
        readonly saveDetail: "写入当前资料库的 concepts/，以后可以复习。";
        readonly decline: "暂不保存";
        readonly declineDetail: "本次不写入，学习状态仍保留在会话记忆中。";
    };
    readonly en: {
        readonly header: "Concept card";
        readonly question: "Save this completed independent transfer as a concept card?";
        readonly save: "Save the card";
        readonly saveDetail: "Writes it to concepts/ in this learning vault so it can be reviewed later.";
        readonly decline: "Not now";
        readonly declineDetail: "Nothing is written; the learning state stays in session memory.";
    };
};
/** The card fields the review deck renders. */
export interface RecallCardSource {
    readonly label: string;
    readonly explanation: string;
    readonly misconceptions: readonly string[];
}
/** One deck entry's learner-visible text. */
export interface RecallCardText {
    readonly prompt: string;
    readonly answer: string;
    readonly hint?: string;
}
/**
 * Render one review card's text.
 *
 * The frame addresses the learner, so it follows the turn's language; the label
 * and explanation are the card's own content and are used as written. When the
 * turn language is unknown the card's own script decides, which keeps the
 * builder and the validator on the same answer without sharing any other state.
 * @param card - The saved card being reviewed.
 * @param turnLocale - The language of the current turn, when it is known.
 * @returns the prompt, answer, and optional hint for one deck entry.
 */
export declare function recallCardText(card: RecallCardSource, turnLocale?: LearnerLocale): RecallCardText;
//# sourceMappingURL=learner-locale.d.ts.map