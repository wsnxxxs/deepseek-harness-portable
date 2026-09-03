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
export const SESSION_MANAGER_NS = 'sessionManager';
/** English dictionary; also the fallback for a key a locale is missing. */
export const en = {
    'archive.title': 'Archived chats',
    'archive.body': 'Manage archived conversations. Restore one to return it to the sidebar, or delete it permanently.',
    'archive.empty': 'No archived conversations.',
    'archive.restore': 'Restore',
    'archive.delete': 'Delete permanently',
    'archive.deleteTitle': 'Delete archived conversation?',
    'archive.deleteBody': 'This permanently deletes the conversation and cannot be undone.',
    'archive.cancel': 'Cancel',
    'archive.close': 'Close',
    'archive.working': 'Working…',
    'usage.title': 'Model usage',
    'usage.body': 'Usage is aggregated from the same durable task records the workbench reads. This page does not estimate account balance.',
    'usageCard.title': 'Usage statistics',
    'usageCard.tabOverview': 'Overview',
    'usageCard.tabModels': 'Models',
    'usageCard.rangeLabel': 'Time range',
    'usageCard.rangeToday': 'Today',
    'usageCard.range7d': '7d',
    'usageCard.range30d': '30d',
    'usageCard.sessions': 'Sessions',
    'usageCard.messages': 'Messages',
    'usageCard.totalTokens': 'Total tokens',
    'usageCard.activeDays': 'Active days',
    'usageCard.currentStreak': 'Current streak',
    'usageCard.longestStreak': 'Longest streak',
    'usageCard.peakHour': 'Peak hour',
    'usageCard.favoriteModel': 'Favorite model',
    'usageCard.days': '{count}d',
    'usageCard.unknownModel': 'Unattributed',
    'usageCard.inOut': '{input} in · {output} out',
    'usageCard.empty': 'No token usage has been recorded in this range.',
    'usageCard.activityAlt': 'Activity over the last {weeks} weeks: {days} active days, {tokens} tokens.',
    'usageCard.chartAlt': 'Daily token usage over {days} days, {tokens} in total.',
    'usageCard.dayBucketNote': 'Each task is counted on the day it was last active, so a task spanning several days lands on one of them. Messages count recorded turns and steps.',
    'usageCard.estimatedNote': 'Some tasks predate per-model accounting; their tokens are credited to the model they last used and move to the exact split once the task is reopened.',
    'usageCard.comparison': 'That is about {factor}× the tokens in {reference}.',
    'usageCard.compareMobyDick': 'Moby-Dick',
    'usageCard.compareWarAndPeace': 'War and Peace',
    'usageCard.compareWikipedia': 'the English Wikipedia',
};
/** Simplified Chinese dictionary. */
export const zh = {
    'archive.title': '已归档对话',
    'archive.body': '管理已归档的对话。恢复后会重新显示在侧边栏，也可以永久删除。',
    'archive.empty': '暂无已归档对话。',
    'archive.restore': '恢复',
    'archive.delete': '永久删除',
    'archive.deleteTitle': '删除已归档对话？',
    'archive.deleteBody': '此操作会永久删除对话，且无法撤销。',
    'archive.cancel': '取消',
    'archive.close': '关闭',
    'archive.working': '处理中…',
    'usage.title': '模型用量',
    'usage.body': '数据来自与工作台使用统计相同的任务持久化记录。本页面不伪造账户余额。',
    'usageCard.title': '用量统计',
    'usageCard.tabOverview': '总览',
    'usageCard.tabModels': '模型',
    'usageCard.rangeLabel': '时间范围',
    'usageCard.rangeToday': '今日',
    'usageCard.range7d': '7 天',
    'usageCard.range30d': '30 天',
    'usageCard.sessions': '任务数',
    'usageCard.messages': '消息数',
    'usageCard.totalTokens': '累计 Token',
    'usageCard.activeDays': '活跃天数',
    'usageCard.currentStreak': '当前连续',
    'usageCard.longestStreak': '最长连续',
    'usageCard.peakHour': '高峰时段',
    'usageCard.favoriteModel': '常用模型',
    'usageCard.days': '{count} 天',
    'usageCard.unknownModel': '未归类',
    'usageCard.inOut': '输入 {input} · 输出 {output}',
    'usageCard.empty': '该时间范围内没有记录到 Token 用量。',
    'usageCard.activityAlt': '最近 {weeks} 周的活跃情况：{days} 个活跃日，共 {tokens} Token。',
    'usageCard.chartAlt': '{days} 天的每日 Token 用量，合计 {tokens}。',
    'usageCard.dayBucketNote': '每个任务计入其最后活跃的那一天，因此跨多天的任务会整块落在其中一天。消息数统计已记录的回合与步骤。',
    'usageCard.estimatedNote': '部分任务早于按模型计量，其 Token 暂记在最后使用的模型上；重新打开该任务后会更新为精确拆分。',
    'usageCard.comparison': '大约是 {reference} 的 {factor} 倍 Token。',
    'usageCard.compareMobyDick': '《白鲸》',
    'usageCard.compareWarAndPeace': '《战争与和平》',
    'usageCard.compareWikipedia': '英文维基百科',
};
//# sourceMappingURL=locales.js.map