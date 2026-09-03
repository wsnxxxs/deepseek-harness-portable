/**
 * Copy owned by the session-manager plugin, in the two locales this
 * distribution ships.
 *
 * The dictionary is registered as an ordinary namespace on the Host's locale
 * runtime, so both the official settings shell and the DCode workbench render
 * these words from one source: the workbench binds this namespace rather than
 * translating the archive and usage vocabulary a second time.
 * @module @dsh-portable/session-manager/client/locales
 */
/** Locale namespace owned by this package. */
export declare const SESSION_MANAGER_NS = "sessionManager";
/** English dictionary; also the fallback for a key a locale is missing. */
export declare const en: {
    readonly 'archive.title': "Archived chats";
    readonly 'archive.body': "Manage archived conversations. Restore one to return it to the sidebar, or delete it permanently.";
    readonly 'archive.empty': "No archived conversations.";
    readonly 'archive.restore': "Restore";
    readonly 'archive.delete': "Delete permanently";
    readonly 'archive.deleteTitle': "Delete archived conversation?";
    readonly 'archive.deleteBody': "This permanently deletes the conversation and cannot be undone.";
    readonly 'archive.cancel': "Cancel";
    readonly 'archive.close': "Close";
    readonly 'archive.working': "Working…";
    readonly 'usage.title': "Model usage";
    readonly 'usage.body': "Usage is aggregated from the same durable task records the workbench reads. This page does not estimate account balance.";
    readonly 'usageCard.title': "Usage statistics";
    readonly 'usageCard.tabOverview': "Overview";
    readonly 'usageCard.tabModels': "Models";
    readonly 'usageCard.rangeLabel': "Time range";
    readonly 'usageCard.rangeToday': "Today";
    readonly 'usageCard.range7d': "7d";
    readonly 'usageCard.range30d': "30d";
    readonly 'usageCard.sessions': "Sessions";
    readonly 'usageCard.messages': "Messages";
    readonly 'usageCard.totalTokens': "Total tokens";
    readonly 'usageCard.activeDays': "Active days";
    readonly 'usageCard.currentStreak': "Current streak";
    readonly 'usageCard.longestStreak': "Longest streak";
    readonly 'usageCard.peakHour': "Peak hour";
    readonly 'usageCard.favoriteModel': "Favorite model";
    readonly 'usageCard.days': "{count}d";
    readonly 'usageCard.unknownModel': "Unattributed";
    readonly 'usageCard.inOut': "{input} in · {output} out";
    readonly 'usageCard.empty': "No token usage has been recorded in this range.";
    readonly 'usageCard.activityAlt': "Activity over the last {weeks} weeks: {days} active days, {tokens} tokens.";
    readonly 'usageCard.chartAlt': "Daily token usage over {days} days, {tokens} in total.";
    readonly 'usageCard.dayBucketNote': "Each task is counted on the day it was last active, so a task spanning several days lands on one of them. Messages count recorded turns and steps.";
    readonly 'usageCard.estimatedNote': "Some tasks predate per-model accounting; their tokens are credited to the model they last used and move to the exact split once the task is reopened.";
    readonly 'usageCard.comparison': "That is about {factor}× the tokens in {reference}.";
    readonly 'usageCard.compareMobyDick': "Moby-Dick";
    readonly 'usageCard.compareWarAndPeace': "War and Peace";
    readonly 'usageCard.compareWikipedia': "the English Wikipedia";
};
/** Every key this package's dictionaries define. */
export type SessionManagerKey = keyof typeof en;
/** Bound translate function as the slot framework and the workbench supply it. */
export type SessionManagerTranslate = (key: SessionManagerKey, params?: Record<string, string | number>) => string;
/** Simplified Chinese dictionary. */
export declare const zh: Record<SessionManagerKey, string>;
//# sourceMappingURL=locales.d.ts.map