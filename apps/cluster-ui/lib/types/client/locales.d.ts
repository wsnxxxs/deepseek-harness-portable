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
export declare const CLUSTER_NS = "cluster";
/** English copy; the shape every other dictionary must match. */
export declare const en: {
    readonly title: "Cluster orchestration";
    readonly refresh: "Refresh cluster state";
    readonly loading: "Loading cluster state…";
    readonly empty: "Cluster state is not available for this task.";
    readonly roster: "Agent roster";
    readonly members: "members";
    readonly running: "{count} running";
    readonly tasks: "Shared task board";
    readonly taskProgress: "tasks complete";
    readonly noTasks: "No shared tasks yet.";
    readonly addTask: "Add task";
    readonly subject: "Task subject";
    readonly description: "Acceptance criteria and task details";
    readonly blockers: "Blocking task IDs, comma-separated";
    readonly scopes: "Write scopes, comma-separated";
    readonly owner: "Owner";
    readonly unassigned: "Unassigned";
    readonly ready: "Ready";
    readonly blocked: "Blocked";
    readonly blockedBy: "Blocked by";
    readonly claim: "Claim";
    readonly release: "Release";
    readonly complete: "Complete";
    readonly reopen: "Reopen";
    readonly delete: "Delete";
    readonly roleLead: "Lead";
    readonly roleTeammate: "Teammate";
    readonly openMember: "Open agent conversation";
    readonly 'status.running': "Running";
    readonly 'status.idle': "Idle";
    readonly 'status.inactive': "Inactive";
    readonly 'status.provisioning': "Provisioning";
    readonly 'status.failed': "Failed";
    readonly 'task.pending': "Pending";
    readonly 'task.inProgress': "In progress";
    readonly 'task.completed': "Completed";
    readonly 'action.edit': "Edit";
    readonly 'action.save': "Save";
    readonly 'action.saving': "Saving…";
    readonly 'action.cancel': "Cancel";
};
/** One dictionary key of this namespace. */
export type ClusterKey = keyof typeof en;
/** The translate signature used inside this package's React tree. */
export type Translate = (key: ClusterKey, params?: Record<string, string | number>) => string;
/** Simplified Chinese copy. */
export declare const zh: Record<ClusterKey, string>;
//# sourceMappingURL=locales.d.ts.map