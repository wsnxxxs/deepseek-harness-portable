/** Public protocol facade: current contracts plus retired replay compatibility. */

export * from './protocol-current.ts'
export {
  parseLearningActivity,
  parseLearningResponse,
  parseLearningActivityV2,
  parseLearningResponseV2,
} from './legacy-protocol.ts'
