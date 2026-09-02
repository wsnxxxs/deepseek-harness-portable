/**
 * Cluster mode's own dictionaries.
 *
 * The namespace is this package's, not a host surface's: the panel renders
 * the same words in the official conversation header and inside a workbench
 * that adopts it, so the copy cannot live in whichever surface happens to
 * mount it. Keys are unprefixed because the namespace already says `cluster`.
 *
 * The four editing verbs at the end are restated here rather than borrowed
 * from a host's shared vocabulary for the same reason: this plugin must read
 * correctly in an assembly that never registered one.
 * @module @dsh-portable/cluster-ui/client/locales
 */
/** Locale namespace owned by this package. */
export const CLUSTER_NS = 'cluster';
/** English copy; the shape every other dictionary must match. */
export const en = {
    'title': 'Cluster orchestration',
    'refresh': 'Refresh cluster state',
    'loading': 'Loading cluster state…',
    'empty': 'Cluster state is not available for this task.',
    'roster': 'Agent roster',
    'members': 'members',
    'running': '{count} running',
    'tasks': 'Shared task board',
    'taskProgress': 'tasks complete',
    'noTasks': 'No shared tasks yet.',
    'addTask': 'Add task',
    'subject': 'Task subject',
    'description': 'Acceptance criteria and task details',
    'blockers': 'Blocking task IDs, comma-separated',
    'scopes': 'Write scopes, comma-separated',
    'owner': 'Owner',
    'unassigned': 'Unassigned',
    'ready': 'Ready',
    'blocked': 'Blocked',
    'blockedBy': 'Blocked by',
    'claim': 'Claim',
    'release': 'Release',
    'complete': 'Complete',
    'reopen': 'Reopen',
    'delete': 'Delete',
    'roleLead': 'Lead',
    'roleTeammate': 'Teammate',
    'openMember': 'Open agent conversation',
    'status.running': 'Running',
    'status.idle': 'Idle',
    'status.inactive': 'Inactive',
    'status.provisioning': 'Provisioning',
    'status.failed': 'Failed',
    'task.pending': 'Pending',
    'task.inProgress': 'In progress',
    'task.completed': 'Completed',
    'action.edit': 'Edit',
    'action.save': 'Save',
    'action.saving': 'Saving…',
    'action.cancel': 'Cancel',
};
/** Simplified Chinese copy. */
export const zh = {
    'title': '集群编排',
    'refresh': '刷新集群状态',
    'loading': '正在加载集群状态…',
    'empty': '当前任务暂无集群状态。',
    'roster': 'Agent 成员',
    'members': '个成员',
    'running': '{count} 个运行中',
    'tasks': '共享任务板',
    'taskProgress': '任务已完成',
    'noTasks': '还没有共享任务。',
    'addTask': '添加任务',
    'subject': '任务标题',
    'description': '验收标准与任务说明',
    'blockers': '阻塞任务 ID（逗号分隔）',
    'scopes': '写入范围（逗号分隔）',
    'owner': '负责人',
    'unassigned': '未分配',
    'ready': '可开始',
    'blocked': '被阻塞',
    'blockedBy': '依赖',
    'claim': '认领',
    'release': '释放',
    'complete': '完成',
    'reopen': '重新打开',
    'delete': '删除',
    'roleLead': '主 Agent',
    'roleTeammate': '成员 Agent',
    'openMember': '打开 Agent 对话',
    'status.running': '运行中',
    'status.idle': '空闲',
    'status.inactive': '未运行',
    'status.provisioning': '准备中',
    'status.failed': '失败',
    'task.pending': '待处理',
    'task.inProgress': '进行中',
    'task.completed': '已完成',
    'action.edit': '编辑',
    'action.save': '保存',
    'action.saving': '保存中…',
    'action.cancel': '取消',
};
//# sourceMappingURL=locales.js.map