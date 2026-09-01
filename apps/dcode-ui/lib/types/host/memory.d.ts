/** Durable memory adapter for the DCode Agent and workflow settings page. */
export type DcodeMemoryPhase = 'idle' | 'extracting' | 'error' | 'disabled';
export type DcodeMemoryKind = 'preference' | 'fact' | 'procedure' | 'failure';
export type DcodeMemoryCategory = 'project_conventions' | 'workflows_and_commands' | 'known_failures_and_fixes' | 'user_preferences';
export interface DcodeMemoryState {
    readonly enabled: boolean;
    readonly phase: DcodeMemoryPhase;
    readonly globalCount: number;
    readonly projectCount: number;
    readonly pendingJobs: number;
    readonly lastRunAt?: string;
    readonly lastRunProcessed?: number;
    readonly lastRunAdded?: number;
    readonly lastRunSkipped?: number;
    readonly lastExtractionMethod?: 'heuristic' | 'none';
    readonly error?: string;
    readonly extractingTotal?: number;
    readonly extractingProcessed?: number;
    readonly extractingAdded?: number;
    readonly extractingSkipped?: number;
}
export interface DcodeMemoryRecord {
    readonly id: string;
    readonly scope: 'global' | 'project';
    readonly category: DcodeMemoryCategory;
    readonly kind: DcodeMemoryKind;
    readonly content: string;
    readonly sourceSessionIds: readonly string[];
    readonly updatedAt: string;
}
export interface DcodeMemorySearchValue {
    readonly items: readonly (DcodeMemoryRecord & {
        readonly snippet: string;
    })[];
    readonly state: DcodeMemoryState;
}
/** Minimal logical-corpus face supplied by DSH's existing session-query service. */
export interface DcodeMemorySessionSource {
    listSessions(signal?: AbortSignal): Promise<readonly DcodeMemorySessionRecord[]>;
    readSession(sessionId: string): Promise<DcodeMemorySessionLog>;
}
export interface DcodeMemorySessionRecord {
    readonly header: {
        readonly id: string;
        readonly cwd?: string;
    };
}
export interface DcodeMemorySessionLog {
    readonly session: {
        readonly id: string;
        readonly cwd?: string;
    };
    readonly events: readonly unknown[];
}
export interface DcodeMemoryService {
    getState(cwd?: string): DcodeMemoryState;
    setEnabled(enabled: boolean): DcodeMemoryState;
    search(query: string, cwd?: string, limit?: number): DcodeMemorySearchValue;
    run(cwd?: string, signal?: AbortSignal): Promise<DcodeMemoryState>;
    abort(): DcodeMemoryState;
    reset(): DcodeMemoryState;
    forget(id: string): DcodeMemoryState;
    markPending(sessionId: string): void;
    dispose(): void;
}
/**
 * Small durable coordinator built on the same session corpus as the rest of
 * DSH. It keeps memory as advisory data: only explicit durable-looking
 * instructions and verified failures are promoted, and secrets are redacted.
 */
export declare class DcodeMemoryStore implements DcodeMemoryService {
    private readonly db;
    private readonly source;
    private running;
    private runController;
    private timer;
    private extracting?;
    constructor(options: {
        readonly root: string;
        readonly source: () => DcodeMemorySessionSource | undefined;
    });
    getState(cwd?: string): DcodeMemoryState;
    setEnabled(enabled: boolean): DcodeMemoryState;
    search(query: string, cwd?: string, limit?: number): DcodeMemorySearchValue;
    run(cwd?: string, signal?: AbortSignal): Promise<DcodeMemoryState>;
    abort(): DcodeMemoryState;
    reset(): DcodeMemoryState;
    forget(id: string): DcodeMemoryState;
    markPending(sessionId: string): void;
    dispose(): void;
    private readMeta;
    private writeMeta;
    private extractLog;
    private upsert;
    private recordFromRow;
}
/** Resolve the same portable DSH data root used by the packaged runtime. */
export declare function defaultDcodeMemoryRoot(): string;
//# sourceMappingURL=memory.d.ts.map