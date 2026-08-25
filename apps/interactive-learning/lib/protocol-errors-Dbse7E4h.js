//#region lib/types/protocol-errors.js
/** Stable error type shared by current and compatibility protocol parsers. */
var LearningProtocolError = class extends Error {
	issues;
	code = "INVALID_LEARNING_ACTIVITY";
	constructor(issues) {
		super(`Invalid Learning Activity: ${issues.join("; ")}`);
		this.issues = issues;
		this.name = "LearningProtocolError";
	}
};
//#endregion
export { LearningProtocolError as t };
