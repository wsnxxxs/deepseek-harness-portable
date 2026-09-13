import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import { registerInteractiveLearningSessionCompatibility } from './bootstrap.ts'

// Loaded only by the Learning bundle, before its preset provider. Register
// current learning events before an enabled learning session can resume.
registerInteractiveLearningSessionCompatibility()

/** Packaged preset root; portable distributions merge this into their system roster. */
export const interactiveLearningPresetRoot = fileURLToPath(new URL('../preset/', import.meta.url))

/** The independently installable preset directory inside the package. */
export const interactiveLearningPresetSource = fileURLToPath(new URL('../preset/learning/', import.meta.url))

declare module '@deepseek-ai/cordis' {
  interface Context {
    learningPresetSource: { path: string; trust: 'system' }
  }
}

/** The optional bundle injects this source before the official preset provider. */
export const name = 'learning-preset-source'
export function apply(ctx: Context): void {
  ctx.provide('learningPresetSource', { path: interactiveLearningPresetRoot, trust: 'system' })
}
