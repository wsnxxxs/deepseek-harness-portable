export interface PatchOverride {
    id: string;
    name?: string;
    disabled: boolean;
}
/** Edit one YAML document, retaining unrelated rows, comments, anchors and literal !!js expressions. */
export declare function updateProfilePatch(text: string, overrides?: readonly PatchOverride[], removeIds?: readonly string[]): string;
/** Unchanged valid profiles keep their exact bytes; only our old appended block is repaired. */
export declare function repairProfilePatch(text: string): string;
//# sourceMappingURL=profile-patch.d.ts.map