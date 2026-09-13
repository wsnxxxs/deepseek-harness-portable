type Row = Record<string, any>;
/** Node's synchronous decoder consumes one frame; historical logs concatenate many frames. */
export declare function decodeHistory(bytes: Buffer, compressed: boolean): Row[];
/** Keep sequence mapping inside the upstream migration chain, including compact assistant runs. */
export declare function migrateHistory(rows: Row[]): Buffer | undefined;
/** Publish a new generation without changing any byte of the original log. */
export declare function migrateHistoryFile(source: string): Promise<boolean>;
/** Run before the official profile starts reading sessions; unrelated histories remain untouched. */
export declare function migratePortableHistories(root: string): Promise<{
    migrated: number;
    failures: string[];
}>;
export {};
//# sourceMappingURL=history-migration.d.ts.map