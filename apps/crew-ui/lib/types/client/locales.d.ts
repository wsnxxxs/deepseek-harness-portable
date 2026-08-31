/**
 * Mission Control's own dictionary.
 *
 * Surface NAMES are not here — those belong to `@dsh-portable/ui-mode`, which
 * owns the roster every switch renders. This namespace covers only the mission
 * vocabulary: the board, the roster, the brief and the thread.
 * @module @dsh-portable/crew-ui/client/locales
 */
/** Namespace this surface registers its dictionaries under. */
export declare const CREW_NS = "crew";
export declare const en: {
    readonly 'app.title': "Mission Control";
    readonly 'nav.missions': "Missions";
    readonly 'nav.newMission': "New mission";
    readonly 'nav.openWorkspace': "Open workspace";
    readonly 'nav.noMissions': "No missions yet.";
    readonly 'nav.noMissionsBody': "Open a workspace and start a mission to build a board.";
    readonly 'nav.untitled': "Untitled mission";
    readonly 'nav.missionPresetFailed': "This mission did not start on the crew composition: {reason}";
    readonly 'nav.collapse': "Collapse missions";
    readonly 'nav.expand': "Expand missions";
    readonly 'nav.searchPlaceholder': "Search missions";
    readonly 'nav.noSearchResults': "No matching missions.";
    readonly 'nav.noSearchResultsBody': "Try a different name or clear the search.";
    readonly 'nav.roster': "Roster";
    readonly 'nav.hideRoster': "Hide roster";
    readonly 'nav.showRoster': "Show roster";
    readonly 'tab.crew': "Crew";
    readonly 'tab.board': "Board";
    readonly 'tab.brief': "Brief";
    readonly 'tab.dossier': "Dossier";
    readonly 'tab.thread': "Thread";
    readonly 'inspector.title': "Inspector";
    readonly 'inspector.open': "Open Inspector";
    readonly 'inspector.close': "Close Inspector";
    readonly 'board.pending': "Ready";
    readonly 'board.in_progress': "In progress";
    readonly 'board.completed': "Done";
    readonly 'board.empty': "Nothing here yet.";
    readonly 'board.emptyPending': "Add a task, or ask the Lead to plan the work.";
    readonly 'board.addTask': "Add task";
    readonly 'board.loading': "Loading the board…";
    readonly 'board.noMission': "Select a mission to see its board.";
    readonly 'board.count': "{count}";
    readonly 'board.blockedBy': "Waits for";
    readonly 'board.scopes': "Writes";
    readonly 'board.owner': "Owner";
    readonly 'board.unowned': "Unassigned";
    readonly 'board.blocked': "Blocked";
    readonly 'board.ready': "Ready to start";
    readonly 'board.conflict': "Overlapping write scope";
    readonly 'board.retry': "Retry";
    readonly 'board.dismiss': "Dismiss";
    readonly 'board.refresh': "Refresh";
    readonly 'task.subject': "Title";
    readonly 'task.subjectPlaceholder': "What needs doing";
    readonly 'task.description': "Details";
    readonly 'task.descriptionPlaceholder': "Enough for a teammate to start without asking";
    readonly 'task.blockers': "Waits for";
    readonly 'task.blockersPlaceholder': "Task ids, comma separated";
    readonly 'task.scopes': "Write scopes";
    readonly 'task.scopesPlaceholder': "Paths this task will change, comma separated";
    readonly 'task.save': "Save";
    readonly 'task.cancel': "Cancel";
    readonly 'task.edit': "Edit";
    readonly 'task.delete': "Delete";
    readonly 'task.complete': "Complete";
    readonly 'task.reopen': "Reopen";
    readonly 'task.release': "Release";
    readonly 'task.assign': "Assign to";
    readonly 'task.assignNobody': "Nobody";
    readonly 'roster.title': "Crew";
    readonly 'roster.lead': "Lead";
    readonly 'roster.teammate': "Teammate";
    readonly 'roster.empty': "No teammates yet.";
    readonly 'roster.emptyBody': "The Lead creates teammates when work is genuinely parallel.";
    readonly 'roster.open': "Open thread";
    readonly 'roster.status.running': "Working";
    readonly 'roster.status.idle': "Idle";
    readonly 'roster.status.inactive': "Not loaded";
    readonly 'roster.status.provisioning': "Starting";
    readonly 'roster.status.failed': "Failed";
    readonly 'brief.title': "Brief";
    readonly 'brief.mode': "Mode";
    readonly 'brief.workspace': "Workspace";
    readonly 'brief.tasks': "Tasks";
    readonly 'brief.tasksValue': "{done} of {total} done";
    readonly 'brief.crew': "Crew";
    readonly 'brief.crewValue': "{count} member(s)";
    readonly 'brief.warnings': "Write-scope conflicts";
    readonly 'brief.noWarnings': "None";
    readonly 'brief.locked': "A running mission keeps the mode it started with.";
    readonly 'thread.empty': "No messages yet.";
    readonly 'thread.emptyBody': "Start a mission and ask the Lead to coordinate the work.";
    readonly 'thread.lead': "Lead";
    readonly 'thread.work': "{count} work step(s)";
    readonly 'thread.placeholder': "Message the Lead";
    readonly 'thread.send': "Send";
    readonly 'thread.addContext': "Add context";
    readonly 'thread.attach': "Attach a file";
    readonly 'thread.composerHint': "Enter to send · Shift+Enter for a new line";
    readonly 'dossier.title': "Dossier";
    readonly 'dossier.attach': "Attach";
    readonly 'dossier.attachPlaceholder': "Path of a spec, doc or log to attach";
    readonly 'dossier.search': "Find";
    readonly 'dossier.searchPlaceholder': "Search the attached sources";
    readonly 'dossier.loading': "Reading the dossier…";
    readonly 'dossier.empty': "Nothing attached yet.";
    readonly 'dossier.emptyBody': "Attach a spec or a design note and the crew can quote it, with a link back to the exact passage.";
    readonly 'dossier.sections': "{count} section(s)";
    readonly 'dossier.retry': "Try again";
    readonly 'settings.title': "Settings";
    readonly 'settings.back': "Back to mission";
    readonly 'error.title': "Something went wrong";
};
export declare const zh: Record<CrewKey, string>;
/** Key union of this surface's dictionary. */
export type CrewKey = keyof typeof en;
/** Bound translate signature used throughout the surface. */
export type Translate = (key: CrewKey, params?: Record<string, unknown>) => string;
//# sourceMappingURL=locales.d.ts.map