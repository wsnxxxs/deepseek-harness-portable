/**
 * Material intake: turning the files a LEARNER mentioned into ingested sources.
 *
 * The trigger is deliberately the learner's own `@file` mentions, read from the
 * session log — never a path the model supplies. That keeps the write path
 * host-side and learner-authorized while still making "drop a PDF in and teach
 * me chapter 3" work without a separate confirmation step: attaching the file to
 * a learning session IS the authorization for reading it.
 *
 * Intake runs when the material layer is first consulted in a turn rather than
 * on message arrival, because ingesting a large source is slow and the inbox
 * hook cannot await it.
 * @module @dsh-portable/interactive-learning/src/material-intake
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import { type IngestResult } from './ingest/pipeline.ts';
import type { TopicVault } from './topic-vault.ts';
/** Paths mentioned in one block of text, in order, without duplicates. */
export declare function parseFileMentions(text: string): readonly string[];
interface SessionLike {
    readonly events: readonly {
        type: string;
        data: unknown;
    }[];
}
/** Every path the learner mentioned across the recent user messages. */
export declare function mentionedPaths(session: SessionLike): readonly string[];
/**
 * Sync any material the learner mentioned; the ingest pipeline decides whether
 * its bytes are unchanged or need rebuilding.
 *
 * Silently ignores a mention that is not a real path: `@` also appears in
 * ordinary prose, and a learner writing an email address must not produce an
 * error. An unsupported real file IS reported, because the learner meant to
 * supply it and deserves to know it was not read.
 * @param agent - The live agent whose session carries the mentions.
 * @param vault - The destination vault.
 * @returns one result per newly ingested path; empty when nothing was new.
 */
export declare function syncMentionedMaterial(agent: Agent | undefined, vault: TopicVault): Promise<readonly IngestResult[]>;
export {};
//# sourceMappingURL=material-intake.d.ts.map