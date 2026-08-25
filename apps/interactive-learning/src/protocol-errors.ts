/** Stable error type shared by current and compatibility protocol parsers. */
export class LearningProtocolError extends Error {
  readonly code = 'INVALID_LEARNING_ACTIVITY'

  constructor(readonly issues: readonly string[]) {
    super(`Invalid Learning Activity: ${issues.join('; ')}`)
    this.name = 'LearningProtocolError'
  }
}
