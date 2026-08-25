/** Stable error type shared by current and compatibility protocol parsers. */
export declare class LearningProtocolError extends Error {
    readonly issues: readonly string[];
    readonly code = "INVALID_LEARNING_ACTIVITY";
    constructor(issues: readonly string[]);
}
//# sourceMappingURL=protocol-errors.d.ts.map